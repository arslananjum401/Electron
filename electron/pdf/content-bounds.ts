import zlib from "zlib";
import type { Bounds, Matrix, Token } from "../types";

const mulMatrix = (A: Matrix, B: Matrix): Matrix => ({
  a: A.a * B.a + A.c * B.b,
  b: A.b * B.a + A.d * B.b,
  c: A.a * B.c + A.c * B.d,
  d: A.b * B.c + A.d * B.d,
  e: A.a * B.e + A.c * B.f + A.e,
  f: A.b * B.e + A.d * B.f + A.f,
});

const transformPoint = (m: Matrix, x: number, y: number): [number, number] => [
  m.a * x + m.c * y + m.e,
  m.b * x + m.d * y + m.f,
];

const tokenize = (content: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    const c = content[i];
    if (/[\s]/.test(c)) { i++; continue; }
    if (c === "%") { while (i < n && content[i] !== "\n" && content[i] !== "\r") i++; continue; }
    if (c === "(") {
      let s = ""; i++; let d = 1;
      while (i < n && d > 0) {
        const ch = content[i];
        if (ch === "\\") { s += content[i + 1] || ""; i += 2; continue; }
        if (ch === "(") d++;
        else if (ch === ")") { d--; if (d === 0) break; }
        s += ch; i++;
      }
      i++; tokens.push({ t: "str", v: s }); continue;
    }
    if (c === "<" && content[i + 1] === "<") { tokens.push({ t: "dictOpen" }); i += 2; continue; }
    if (c === ">" && content[i + 1] === ">") { tokens.push({ t: "dictClose" }); i += 2; continue; }
    if (c === "[") { tokens.push({ t: "arrOpen" }); i++; continue; }
    if (c === "]") { tokens.push({ t: "arrClose" }); i++; continue; }
    if (c === "/") { let nm = ""; i++; while (i < n && !/[\s\[\]()<>\/{}%]/.test(content[i])) { nm += content[i]; i++; } tokens.push({ t: "name", v: nm }); continue; }
    if (c === "<") { let hx = ""; i++; while (i < n && content[i] !== ">") { hx += content[i]; i++; } i++; tokens.push({ t: "str", v: "" }); continue; }
    if (c === "{" || c === "}") { i++; continue; }
    if (/[0-9.+-]/.test(c)) { let num = ""; while (i < n && /[0-9.+-]/.test(content[i])) { num += content[i]; i++; } tokens.push({ t: "num", v: parseFloat(num) }); continue; }
    let op = ""; while (i < n && !/[\s\[\]()<>\/{}%]/.test(content[i])) { op += content[i]; i++; } tokens.push({ t: "op", v: op });
  }
  return tokens;
};

// Parses a PDF page's content stream and returns the bounding box of the
// visible content (used for the "trim" feature). Returns null if nothing
// could be measured.
export const getContentBounds = (page: any): Bounds | null => {
  const contents = page.node.Contents();
  const bufs: Buffer[] = [];
  const collect = (o: any) => {
    if (!o) return;
    if (o.getContents) { bufs.push(Buffer.from(o.getContents())); return; }
    if (o.size) { for (let i = 0; i < o.size(); i++) collect(o.lookup(i)); }
  };
  collect(contents);
  let full = "";
  for (const b of bufs) {
    let s: string;
    try { s = zlib.inflateSync(b).toString("latin1"); } catch { s = b.toString("latin1"); }
    full += s + "\n";
  }

  const tokens = tokenize(full);
  let ctm: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const stack: Matrix[] = [];
  let bbox: Bounds | null = null;
  let path: [number, number][] = [];
  let textMatrix: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  let fontSize = 12;

  const addPoint = (x: number, y: number) => {
    const [X, Y] = transformPoint(ctm, x, y);
    if (!bbox) bbox = { minX: X, minY: Y, maxX: X, maxY: Y };
    else {
      if (X < bbox.minX) bbox.minX = X;
      if (X > bbox.maxX) bbox.maxX = X;
      if (Y < bbox.minY) bbox.minY = Y;
      if (Y > bbox.maxY) bbox.maxY = Y;
    }
  };
  const commitPath = () => { for (const p of path) addPoint(p[0], p[1]); path = []; };

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    if (tok.t !== "op") continue;
    const op = tok.v;
    if (op === "q") stack.push({ ...ctm });
    else if (op === "Q") { if (stack.length) ctm = stack.pop()!; }
    else if (op === "cm") {
      const n6 = (i: number) => (tokens[i].t === "num" ? (tokens[i] as any).v : 0);
      ctm = mulMatrix(ctm, {
        a: n6(k - 6), b: n6(k - 5), c: n6(k - 4),
        d: n6(k - 3), e: n6(k - 2), f: n6(k - 1),
      });
    }
    else if (op === "m" || op === "l") {
      path.push([(tokens[k - 2] as any).v, (tokens[k - 1] as any).v]);
    }
    else if (op === "c") {
      path.push(
        [(tokens[k - 4] as any).v, (tokens[k - 3] as any).v],
        [(tokens[k - 2] as any).v, (tokens[k - 1] as any).v]
      );
    }
    else if (op === "v" || op === "y") {
      path.push([(tokens[k - 2] as any).v, (tokens[k - 1] as any).v]);
    }
    else if (op === "re") {
      const x = (tokens[k - 4] as any).v, y = (tokens[k - 3] as any).v,
        w = (tokens[k - 2] as any).v, h = (tokens[k - 1] as any).v;
      path.push([x, y], [x + w, y], [x, y + h], [x + w, y + h]);
    }
    else if (["S", "s", "f", "F", "f*", "B", "B*", "b", "b*"].includes(op)) { commitPath(); }
    else if (op === "n" || op === "W" || op === "W*") { path = []; }
    else if (op === "BT") { textMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
    else if (op === "Tm") {
      const n6 = (i: number) => (tokens[i] as any).v;
      textMatrix = { a: n6(k - 6), b: n6(k - 5), c: n6(k - 4), d: n6(k - 3), e: n6(k - 2), f: n6(k - 1) };
    }
    else if (op === "Td" || op === "TD") {
      const tx = (tokens[k - 2] as any).v, ty = (tokens[k - 1] as any).v;
      textMatrix = mulMatrix(textMatrix, { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
    }
    else if (op === "Tf") { fontSize = (tokens[k - 1] as any).v; }
    else if (op === "Tj" || op === "'") {
      const stok = tokens[k - 1];
      const s = stok.t === "str" ? stok.v : "";
      const combined = mulMatrix(ctm, textMatrix);
      const [ox, oy] = transformPoint(combined, 0, 0);
      const w = s.length * fontSize * 0.5;
      const [ex, ey] = transformPoint(combined, w, fontSize);
      addPoint(ox, oy); addPoint(ex, oy); addPoint(ox, ey); addPoint(ex, ey);
    }
  }
  return bbox;
};
