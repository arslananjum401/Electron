import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { WebSocket } from "ws";
import fs from "fs";
import { print } from "pdf-to-printer";

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
  printerName: string
) => {
  try {
    console.log("📁 File path:", filePath);
    console.log("🖨️ Selected printer:", printerName);

    await print(filePath, { printer: printerName });

    console.log("✅ Print successful");
  } catch (error) {
    console.error("❌ Printing error:", error);
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
    async (_, printerName: string) => {
      if (!receivedFilePath) {
        console.log("❌ No file received from PMA");
        return;
      }

      console.log("📁 File path:", receivedFilePath);
      console.log("🖨️ Printer:", printerName);

      await printExampleFile(
        receivedFilePath,
        printerName
      );
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
