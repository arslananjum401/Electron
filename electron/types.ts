// Shared types for the Electron main process.

export type FitMode = "fit" | "cover" | "stretch";

export type Matrix = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Token =
  | { t: "num"; v: number }
  | { t: "op"; v: string }
  | { t: "name"; v: string }
  | { t: "str"; v: string }
  | { t: "arrOpen" | "arrClose" | "dictOpen" | "dictClose" };

export interface PdfFileInfo {
  received: boolean;
  fileName?: string;
  widthPt?: number;
  heightPt?: number;
  downloaded?: boolean;
}

export interface PageSizeResult {
  widthPt: number;
  heightPt: number;
}

export interface SavePdfResult {
  saved: boolean;
  filePath?: string;
}

export interface PrintMessage {
  type: string;
  fileName: string;
  fileData: string;
}


export interface OptionsState {
  printer: string | null;
  widthPt: number | null;
  heightPt: number | null;
  fitMode: FitMode | null;
  trim: boolean;
}
export type OptionsUpdate = Partial<OptionsState>;

export interface ResizeOptions {
  widthPt?: number;
  heightPt?: number;
  fitMode?: FitMode;
  trim?: boolean;
}
