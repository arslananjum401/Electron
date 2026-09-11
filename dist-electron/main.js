"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ws_1 = require("ws");
const fs_1 = __importDefault(require("fs"));
const pdf_to_printer_1 = require("pdf-to-printer");
let mainWindow = null;
let receivedFilePath = null;
const createWindow = () => {
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    mainWindow.loadURL("http://localhost:5173");
};
// ✅ Raw PDF ko seedha printer par bhejta hai (koi re-render nahi)
const printExampleFile = async (filePath, printerName) => {
    try {
        console.log("📁 File path:", filePath);
        console.log("🖨️ Selected printer:", printerName);
        await (0, pdf_to_printer_1.print)(filePath, { printer: printerName });
        console.log("✅ Print successful");
    }
    catch (error) {
        console.error("❌ Printing error:", error);
    }
};
const connectToPma = () => {
    const socket = new ws_1.WebSocket("ws://localhost:5003");
    socket.on("open", () => {
        console.log("🟢 Connected to PMA WebSocket server");
        socket.send("Hello from Electron");
    });
    socket.on("message", async (message) => {
        const data = JSON.parse(message.toString());
        if (data.type !== "print")
            return;
        console.log("📄 File name:", data.fileName);
        console.log("📦 File received:", data.fileData.length);
        const fileBuffer = Buffer.from(data.fileData, "base64");
        const filePath = path_1.default.join(process.cwd(), "received-files", data.fileName);
        fs_1.default.mkdirSync(path_1.default.dirname(filePath), {
            recursive: true,
        });
        fs_1.default.writeFileSync(filePath, fileBuffer);
        receivedFilePath = filePath;
        console.log("💾 File saved:", filePath);
    });
    socket.on("close", () => {
        console.log("🔴 Disconnected from PMA");
    });
    socket.on("error", (error) => {
        console.error("❌ WebSocket error:", error);
    });
};
electron_1.app.whenReady().then(() => {
    connectToPma();
    electron_1.ipcMain.handle("get-printers", async () => {
        if (!mainWindow) {
            console.log("❌ mainWindow is null");
            return [];
        }
        const printers = await mainWindow.webContents.getPrintersAsync();
        console.log("🖨️ Printers found:", printers);
        return printers;
    });
    electron_1.ipcMain.handle("print-file", async (_, printerName) => {
        if (!receivedFilePath) {
            console.log("❌ No file received from PMA");
            return;
        }
        console.log("📁 File path:", receivedFilePath);
        console.log("🖨️ Printer:", printerName);
        await printExampleFile(receivedFilePath, printerName);
    });
    createWindow();
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
