
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  printFile: (
    printerName: string,
    paperSize?: string,
    orientation?: "portrait" | "landscape"
  ) =>
    ipcRenderer.invoke(
      "print-file",
      printerName,
      paperSize,
      orientation
    ),

  getFileInfo: () => ipcRenderer.invoke("get-file-info"),

  resizePdf: (widthPt: number, heightPt: number) =>
    ipcRenderer.invoke("resize-pdf", widthPt, heightPt),

  onFileReceived: (callback: (info: any) => void) =>
    ipcRenderer.on("file-received", (_event, info) => callback(info)),
});
