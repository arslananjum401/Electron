import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { WebSocket } from "ws";
import fs from "fs";
import { print } from "pdf-to-printer";
import { PDFDocument } from "pdf-lib";

let mainWindow: BrowserWindow | null = null;
let receivedFilePath: string | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:5173");
};

// ✅ Raw PDF ko seedha printer par bhejta hai (koi re-render nahi)
const printExampleFile = async (
  filePath: string,
  printerName: string,
  paperSize?: string,
  orientation?: "portrait" | "landscape"
) => {
  try {
    console.log("📁 File path:", filePath);
    console.log("🖨️ Selected printer:", printerName);
    console.log("📄 Paper size:", paperSize);
    console.log("🔄 Orientation:", orientation);

    await print(filePath, {
      printer: printerName,
      paperSize,
      orientation,
    });

    console.log("✅ Print successful");
  } catch (error) {
    console.error("❌ Printing error:", error);
  }
};

// 📐 PDF ke pehle page ke dimensions (points mein) return karta hai
const getPdfPageSize = async (filePath: string) => {
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  return { widthPt: width, heightPt: height };
};

// 📐 PDF ko selected size par resize karta hai (content center ho kar fit hota hai)
const resizePdfToSize = async (
  filePath: string,
  widthPt: number,
  heightPt: number
) => {
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes);

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize();
    const scale = Math.min(widthPt / width, heightPt / height);

    page.scaleContent(scale, scale);
    page.setSize(widthPt, heightPt);
    page.translateContent(
      (widthPt - width * scale) / 2,
      (heightPt - height * scale) / 2
    );
  }

  const out = await pdfDoc.save();
  fs.writeFileSync(filePath, out);
};

// 📄 Current received file ki info (dimensions ke sath) return karta hai
const getCurrentFileInfo = async () => {
  if (!receivedFilePath || !fs.existsSync(receivedFilePath)) {
    return { received: false };
  }

  const fileName = path.basename(receivedFilePath);

  try {
    const { widthPt, heightPt } = await getPdfPageSize(receivedFilePath);
    return { received: true, fileName, widthPt, heightPt };
  } catch (error) {
    console.error("❌ Not a valid PDF / failed to read size:", error);
    return { received: true, fileName };
  }
};

const connectToPma = () => {
  const socket = new WebSocket("ws://localhost:5003");

  socket.on("open", () => {
    console.log("🟢 Connected to PMA WebSocket server");
    socket.send("Hello from Electron");
  });

  socket.on("message", async (message) => {
    const data = JSON.parse(message.toString());
    if (data.type !== "print") return;

    console.log("📄 File name:", data.fileName);
    console.log("📦 File received:", data.fileData.length);

    const fileBuffer = Buffer.from(data.fileData, "base64");

    const filePath = path.join(
      process.cwd(),
      "received-files",
      data.fileName
    );

    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });

    fs.writeFileSync(filePath, fileBuffer);

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

app.whenReady().then(() => {
  connectToPma();

  ipcMain.handle("get-printers", async () => {
    if (!mainWindow) {
      console.log("❌ mainWindow is null");
      return [];
    }

    const printers = await mainWindow.webContents.getPrintersAsync();

    console.log("🖨️ Printers found:", printers);

    return printers;
  });

  ipcMain.handle(
    "print-file",
    async (
      _,
      printerName: string,
      paperSize?: string,
      orientation?: "portrait" | "landscape"
    ) => {
      if (!receivedFilePath) {
        console.log("❌ No file received from PMA");
        return;
      }

      console.log("📁 File path:", receivedFilePath);
      console.log("🖨️ Printer:", printerName);

      await printExampleFile(
        receivedFilePath,
        printerName,
        paperSize,
        orientation
      );
    }
  );

  ipcMain.handle("get-file-info", async () => {
    return await getCurrentFileInfo();
  });

  ipcMain.handle(
    "resize-pdf",
    async (_, widthPt: number, heightPt: number) => {
      if (!receivedFilePath || !fs.existsSync(receivedFilePath)) {
        console.log("❌ No file received to resize");
        return { received: false };
      }

      try {
        await resizePdfToSize(receivedFilePath, widthPt, heightPt);
        console.log(`✅ PDF resized to ${widthPt} × ${heightPt} pt`);
      } catch (error) {
        console.error("❌ Failed to resize PDF:", error);
      }

      return await getCurrentFileInfo();
    }
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
