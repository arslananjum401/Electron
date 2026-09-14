export { };

interface PdfFileInfo {
  received: boolean;
  fileName?: string;
  widthPt?: number;
  heightPt?: number;
}

declare global {
  interface Window {
    electronAPI: {
      getPrinters: () => Promise<any[]>;
      printFile: (
        printerName: string,
        paperSize?: string,
        orientation?: "portrait" | "landscape"
      ) => Promise<void>;
      getFileInfo: () => Promise<PdfFileInfo>;
      resizePdf: (
        widthPt: number,
        heightPt: number
      ) => Promise<PdfFileInfo>;
      onFileReceived: (
        callback: (info: PdfFileInfo) => void
      ) => void;
    };
  }
}