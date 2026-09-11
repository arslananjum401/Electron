
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getPrinters: () => ipcRenderer.invoke("get-printers"),

  printFile: (printerName: string) =>
    ipcRenderer.invoke("print-file", printerName),
});
