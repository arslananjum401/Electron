import dotenv from "dotenv";
import path from "path";
import { app, BrowserWindow } from "electron";
import type { PdfFileInfo } from "./types";
import { connectToPma } from "./websocket";
import { registerIpcHandlers } from "./ipc";

dotenv.config({
  path: app.isPackaged
    ? path.join(app.getPath("userData"), ".env")
    : path.join(process.cwd(), ".env"),
});

let mainWindow: BrowserWindow | null = null;

const getMainWindow = (): BrowserWindow | null => mainWindow;

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


  const isProduction = app.isPackaged || process.env.NODE_ENV === "production";
  if (isProduction) {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173");
  }
};


app.whenReady().then(() => {
  connectToPma((info: PdfFileInfo) => {
    if (mainWindow) {
      mainWindow.webContents.send("file-received", info);
    }
  });

  registerIpcHandlers(getMainWindow);

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









