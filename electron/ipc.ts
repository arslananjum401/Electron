import { BrowserWindow, ipcMain } from "electron";
import fs from "fs";
import type { OptionsState } from "./types";
import { getOptions, getReceivedFilePath, setOptions } from "./state";
import { getCurrentFileInfo } from "./pdf/info";
import { processCurrentFile, downloadCurrentFile } from "./pdf/process";

export const registerIpcHandlers = (
  getMainWindow: () => BrowserWindow | null
): void => {
  ipcMain.handle("get-printers", async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      console.log("mainWindow is null");
      return [];
    }

    const printers = await mainWindow.webContents.getPrintersAsync();

    console.log("Printers found:", printers);

    return printers;
  });

  ipcMain.handle("get-file-info", async () => {
    return await getCurrentFileInfo();
  });


  ipcMain.handle(
    "set-options",
    async (_event, update: Partial<OptionsState>) => {
      const prevPrinter = getOptions().printer;
      setOptions(update);

      const received = getReceivedFilePath();
      if (!received || !fs.existsSync(received)) {
        return { received: false };
      }

      if (!prevPrinter && getOptions().printer) {
        const saved = await downloadCurrentFile();
        const info = await getCurrentFileInfo();
        return { ...info, downloaded: saved.saved };
      }

      return await processCurrentFile();
    }
  );

  ipcMain.handle("download-pdf", async () => {
    return await downloadCurrentFile();
  });
};
