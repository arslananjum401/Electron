
export interface Printer {
  displayName?: string;
  name: string;
}

export interface PageSize {
  id: string;
  label: string;
  detail: string;
  paperSize: string;
  orientation: "portrait" | "landscape";
  widthPt: number;
  heightPt: number;
}

export type FitMode = "fit" | "cover" | "stretch";

export interface FileInfo {
  fileName?: string;
  widthPt?: number;
  heightPt?: number;
  downloaded?: boolean;
}

export interface PrintOptions {
  printer?: string | null;
  widthPt?: number | null;
  heightPt?: number | null;
  fitMode?: FitMode | null;
  trim?: boolean;
}
