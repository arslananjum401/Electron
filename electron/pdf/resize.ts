import fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { ResizeOptions } from "../types";
import { getContentBounds } from "./content-bounds";
import { getOriginalFilePath } from "../state";


export const processPdf = async (
  filePath: string,
  options: ResizeOptions = {}
): Promise<void> => {
  const { widthPt, heightPt, fitMode = "fit", trim = false } = options;

  const original = getOriginalFilePath();
  const sourcePath = original && fs.existsSync(original) ? original : filePath;

  const hasSize = widthPt !== undefined && heightPt !== undefined;

  
  if (!hasSize && !trim) {
    if (sourcePath !== filePath) {
      fs.copyFileSync(sourcePath, filePath);
    }
    return;
  }

  const bytes = fs.readFileSync(sourcePath);
  const pdfDoc = await PDFDocument.load(bytes);

  for (const page of pdfDoc.getPages()) {
    const { width: pageW, height: pageH } = page.getSize();

    
    let cMinX = 0, cMinY = 0, cMaxX = pageW, cMaxY = pageH;
    if (trim) {
      const b = getContentBounds(page);
      if (b) {
        cMinX = b.minX; cMinY = b.minY; cMaxX = b.maxX; cMaxY = b.maxY;
      }
    }
    const cw = cMaxX - cMinX;
    const ch = cMaxY - cMinY;
    const cx = (cMinX + cMaxX) / 2;
    const cy = (cMinY + cMaxY) / 2;

    if (widthPt !== undefined && heightPt !== undefined) {
      let scaleX: number;
      let scaleY: number;
      if (fitMode === "stretch") {
        scaleX = widthPt / cw;
        scaleY = heightPt / ch;
      } else {
        const scale =
          fitMode === "cover"
            ? Math.max(widthPt / cw, heightPt / ch)
            : Math.min(widthPt / cw, heightPt / ch);
        scaleX = scale;
        scaleY = scale;
      }

     
      page.translateContent(-cx, -cy);
      page.scaleContent(scaleX, scaleY);
      page.translateContent(widthPt / 2, heightPt / 2);
      page.setSize(widthPt, heightPt);
      page.setCropBox(0, 0, widthPt, heightPt);
      page.setMediaBox(0, 0, widthPt, heightPt);
    } else {
      
      page.translateContent(-cMinX, -cMinY);
      page.setSize(cw, ch);
      page.setCropBox(0, 0, cw, ch);
      page.setMediaBox(0, 0, cw, ch);
    }
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(filePath, out);
};
