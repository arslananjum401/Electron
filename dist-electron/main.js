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
const pdf_lib_1 = require("pdf-lib");
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
const printExampleFile = async (filePath, printerName, paperSize, orientation) => {
    try {
        console.log("📁 File path:", filePath);
        console.log("🖨️ Selected printer:", printerName);
        console.log("📄 Paper size:", paperSize);
        console.log("🔄 Orientation:", orientation);
        await (0, pdf_to_printer_1.print)(filePath, {
            printer: printerName,
            paperSize,
            orientation,
        });
        console.log("✅ Print successful");
    }
    catch (error) {
        console.error("❌ Printing error:", error);
    }
};
// 📐 PDF ke pehle page ke dimensions (points mein) return karta hai
const getPdfPageSize = async (filePath) => {
    const bytes = fs_1.default.readFileSync(filePath);
    const pdfDoc = await pdf_lib_1.PDFDocument.load(bytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    return { widthPt: width, heightPt: height };
};
// 📐 PDF ko selected size par resize karta hai (content center ho kar fit hota hai)
const resizePdfToSize = async (filePath, widthPt, heightPt) => {
    const bytes = fs_1.default.readFileSync(filePath);
    const pdfDoc = await pdf_lib_1.PDFDocument.load(bytes);
    for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize();
        const scale = Math.min(widthPt / width, heightPt / height);
        page.scaleContent(scale, scale);
        page.setSize(widthPt, heightPt);
        page.translateContent((widthPt - width * scale) / 2, (heightPt - height * scale) / 2);
    }
    const out = await pdfDoc.save();
    fs_1.default.writeFileSync(filePath, out);
};
// 📄 Current received file ki info (dimensions ke sath) return karta hai
const getCurrentFileInfo = async () => {
    if (!receivedFilePath || !fs_1.default.existsSync(receivedFilePath)) {
        return { received: false };
    }
    const fileName = path_1.default.basename(receivedFilePath);
    try {
        const { widthPt, heightPt } = await getPdfPageSize(receivedFilePath);
        return { received: true, fileName, widthPt, heightPt };
    }
    catch (error) {
        console.error("❌ Not a valid PDF / failed to read size:", error);
        return { received: true, fileName };
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
        // 🔔 Renderer ko file info (dimensions ke sath) bhejo
        const info = await getCurrentFileInfo();
        if (mainWindow && info.received) {
            mainWindow.webContents.send("file-received", info);
        }
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
    electron_1.ipcMain.handle("print-file", async (_, printerName, paperSize, orientation) => {
        if (!receivedFilePath) {
            console.log("❌ No file received from PMA");
            return;
        }
        console.log("📁 File path:", receivedFilePath);
        console.log("🖨️ Printer:", printerName);
        await printExampleFile(receivedFilePath, printerName, paperSize, orientation);
    });
    electron_1.ipcMain.handle("get-file-info", async () => {
        return await getCurrentFileInfo();
    });
    electron_1.ipcMain.handle("resize-pdf", async (_, widthPt, heightPt) => {
        if (!receivedFilePath || !fs_1.default.existsSync(receivedFilePath)) {
            console.log("❌ No file received to resize");
            return { received: false };
        }
        try {
            await resizePdfToSize(receivedFilePath, widthPt, heightPt);
            console.log(`✅ PDF resized to ${widthPt} × ${heightPt} pt`);
        }
        catch (error) {
            console.error("❌ Failed to resize PDF:", error);
        }
        return await getCurrentFileInfo();
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
