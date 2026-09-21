import path from "path";
import fs from "fs";
import { app } from "electron";
import { WebSocket } from "ws";
import type { PdfFileInfo, PrintMessage } from "./types";
import { getOptions, setReceivedFilePath, setOriginalFilePath } from "./state";
import { getCurrentFileInfo } from "./pdf/info";
import { downloadCurrentFile } from "./pdf/process";

export const connectToPma = (
  onFileReceived: (info: PdfFileInfo) => void
): void => {
  const socket = new WebSocket(process.env.PMA_WEBSOCKET_URL ?? "ws://localhost:5003");

  socket.on("open", () => {
    console.log("Connected to PMA WebSocket server");
    socket.send("Hello from Electron");
  });

  socket.on("message", async (message) => {
    const data = JSON.parse(message.toString()) as PrintMessage;
    if (data.type !== "print") return;

    console.log("File name:", data.fileName);
    console.log("File received:", data.fileData.length);

    const fileBuffer = Buffer.from(data.fileData, "base64");

    const baseDir = app.isPackaged ? app.getPath("userData") : process.cwd();

    const filePath = path.join(baseDir, "received-files", data.fileName);

    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });

    fs.writeFileSync(filePath, fileBuffer);

    const originalFilePath = path.join(
      path.dirname(filePath),
      "original-" + data.fileName
    );
    fs.writeFileSync(originalFilePath, fileBuffer);

    setReceivedFilePath(filePath);
    setOriginalFilePath(originalFilePath);

    console.log("File saved:", filePath);
    console.log("Original backup saved:", originalFilePath);


    let downloaded = false;
    if (getOptions().printer) {
      const saved = await downloadCurrentFile();
      downloaded = saved.saved;
      console.log("Auto-downloaded:", saved.filePath);
    }

    const info = await getCurrentFileInfo();
    if (info.received) {
      onFileReceived({ ...info, downloaded });
    }
  });

  socket.on("close", () => {
    console.log("Disconnected from PMA");
  });

  socket.on("error", (error) => {
    console.error(" WebSocket error:", error);
  });
};
