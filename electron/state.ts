import type { OptionsState, ResizeOptions } from "./types";

let receivedFilePath: string | null = null;
let originalFilePath: string | null = null;

export const getReceivedFilePath = (): string | null => receivedFilePath;

export const setReceivedFilePath = (value: string | null): void => {
  receivedFilePath = value;
};

export const getOriginalFilePath = (): string | null => originalFilePath;

export const setOriginalFilePath = (value: string | null): void => {
  originalFilePath = value;
};

let options: OptionsState = {
  printer: null,
  widthPt: null,
  heightPt: null,
  fitMode: null,
  trim: false,
};

export const getOptions = (): OptionsState => options;

export const setOptions = (update: Partial<OptionsState>): void => {
  options = { ...options, ...update };
};


export const getResizeOptions = (): ResizeOptions => {
  const { widthPt, heightPt, fitMode, trim } = options;

  if (widthPt === null || heightPt === null) {
    return {};
  }

  const result: ResizeOptions = {
    widthPt,
    heightPt,
    trim,
  };
  if (fitMode !== null) {
    result.fitMode = fitMode;
  }
  return result;
};
