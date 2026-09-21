import fs from "fs";
import path from "path";
import type { PdfFileInfo } from "../types";
import { getReceivedFilePath } from "../state";
import { getPdfPageSize } from "./page-size";

export const getCurrentFileInfo = async (): Promise<PdfFileInfo> => {
  const receivedFilePath = getReceivedFilePath();
  if (!receivedFilePath || !fs.existsSync(receivedFilePath)) {
    return { received: false };
  }

  const fileName = path.basename(receivedFilePath);

  try {
    const { widthPt, heightPt } = await getPdfPageSize(receivedFilePath);
    return { received: true, fileName, widthPt, heightPt };
  } catch (error) {
    console.error("Not a valid PDF / failed to read size:", error);
    return { received: true, fileName };
  }
};
