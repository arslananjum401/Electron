"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getPrinters: () => electron_1.ipcRenderer.invoke("get-printers"),
    printFile: (printerName) => electron_1.ipcRenderer.invoke("print-file", printerName),
});
