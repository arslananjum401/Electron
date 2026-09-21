import fs from "fs";
import { PDFDocument } from "pdf-lib";
import type { PageSizeResult } from "../types";

export const getPdfPageSize = async (
  filePath: string
): Promise<PageSizeResult> => {
  const bytes = fs.readFileSync(filePath);
  const pdfDoc = await PDFDocument.load(bytes);
  const page = pdfDoc.getPages()[0];
  const { width, height } = page.getSize();
  return { widthPt: width, heightPt: height };
};
