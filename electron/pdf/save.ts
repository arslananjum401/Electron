import { app, dialog } from "electron";
import path from "path";
import fs from "fs";
import type { SavePdfResult } from "../types";

export const savePdfFile = async (
  filePath: string,
  fileName: string
): Promise<SavePdfResult> => {
  const result = await dialog.showSaveDialog({
    title: "Save PDF",
    defaultPath: path.join(app.getPath("downloads"), fileName),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (result.canceled || !result.filePath) {
    return { saved: false };
  }
  fs.copyFileSync(filePath, result.filePath);
  return { saved: true, filePath: result.filePath };
};


export const downloadPdfFile = async (
  filePath: string,
  fileName: string
): Promise<SavePdfResult> => {
  const downloadsDir = app.getPath("downloads");
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);

  let targetPath = path.join(downloadsDir, fileName);
  let counter = 1;
  while (fs.existsSync(targetPath)) {
    targetPath = path.join(downloadsDir, `${base} (${counter})${ext}`);
    counter++;
  }

  fs.copyFileSync(filePath, targetPath);
  return { saved: true, filePath: targetPath };
};
