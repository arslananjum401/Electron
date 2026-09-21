import fs from "fs";
import path from "path";
import type { PdfFileInfo, SavePdfResult } from "../types";
import { getReceivedFilePath, getResizeOptions } from "../state";
import { processPdf } from "./resize";
import { downloadPdfFile } from "./save";
import { getCurrentFileInfo } from "./info";

export const processCurrentFile = async (): Promise<PdfFileInfo> => {
  const receivedFilePath = getReceivedFilePath();
  if (!receivedFilePath || !fs.existsSync(receivedFilePath)) {
    return { received: false };
  }

  try {
    await processPdf(receivedFilePath, getResizeOptions());
  } catch (error) {
    console.error("Failed to process PDF:", error);
  }

  return await getCurrentFileInfo();
};


export const downloadCurrentFile = async (): Promise<SavePdfResult> => {
  const receivedFilePath = getReceivedFilePath();
  if (!receivedFilePath || !fs.existsSync(receivedFilePath)) {
    return { saved: false };
  }

  await processPdf(receivedFilePath, getResizeOptions());
  return await downloadPdfFile(receivedFilePath, path.basename(receivedFilePath));
};