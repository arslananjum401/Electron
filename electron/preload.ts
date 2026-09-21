import { contextBridge, ipcRenderer } from "electron";
import type { OptionsState, PdfFileInfo } from "./types";

contextBridge.exposeInMainWorld("electronAPI", {
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  getFileInfo: () => ipcRenderer.invoke("get-file-info"),

  setOptions: (options: Partial<OptionsState>) =>
    ipcRenderer.invoke("set-options", options),

  downloadFile: () => ipcRenderer.invoke("download-pdf"),

  onFileReceived: (callback: (info: PdfFileInfo) => void) =>
    ipcRenderer.on("file-received", (_event, info) => callback(info)),
});
