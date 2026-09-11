export { };

declare global {
  interface Window {
    electronAPI: {
      getPrinters: () => Promise<any[]>;
      printFile: (
        printerName: string
      ) => Promise<void>;
    };
  }
}