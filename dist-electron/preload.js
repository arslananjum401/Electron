"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getPrinters: () => electron_1.ipcRenderer.invoke("get-printers"),
    printFile: (printerName, paperSize, orientation) => electron_1.ipcRenderer.invoke("print-file", printerName, paperSize, orientation),
    getFileInfo: () => electron_1.ipcRenderer.invoke("get-file-info"),
    resizePdf: (widthPt, heightPt) => electron_1.ipcRenderer.invoke("resize-pdf", widthPt, heightPt),
    onFileReceived: (callback) => electron_1.ipcRenderer.on("file-received", (_event, info) => callback(info)),
});
