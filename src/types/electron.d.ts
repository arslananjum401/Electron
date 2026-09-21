export { };

type FitMode = "fit" | "cover" | "stretch";

interface Printer {
  name: string;
  displayName?: string;
}

interface PdfFileInfo {
  received: boolean;
  fileName?: string;
  widthPt?: number;
  heightPt?: number;
  downloaded?: boolean;
}

interface PrintOptions {
  printer?: string | null;
  widthPt?: number | null;
  heightPt?: number | null;
  fitMode?: FitMode | null;
  trim?: boolean;
}

interface SaveResult {
  saved: boolean;
  filePath?: string;
}

declare global {
  interface Window {
    electronAPI: {
      getPrinters: () => Promise<Printer[]>;
      getFileInfo: () => Promise<PdfFileInfo>;
      setOptions: (options: PrintOptions) => Promise<PdfFileInfo>;
      downloadFile: () => Promise<SaveResult>;
      onFileReceived: (
        callback: (info: PdfFileInfo) => void
      ) => void;
    };
  }
}