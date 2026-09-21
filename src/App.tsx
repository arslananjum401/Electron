import { useEffect, useState } from "react";
import type { FileInfo, FitMode, PageSize, Printer, PrintOptions } from "./types";

const FIT_MODES: { id: FitMode; label: string; detail: string }[] = [
  { id: "fit", label: "Fit", detail: "Entire content remains visible; margins may appear." },
  { id: "cover", label: "Cover", detail: "The page is completely filled, some content may be cropped." },
  { id: "stretch", label: "Stretch", detail: "The page is completely filled, the content may be stretched." },
];

const PAGE_SIZES: PageSize[] = [
  { id: "a4", label: "A4", detail: "210 × 297 mm", paperSize: "A4", orientation: "portrait", widthPt: 595.28, heightPt: 841.89 },
  { id: "a5", label: "A5", detail: "148 × 210 mm", paperSize: "A5", orientation: "portrait", widthPt: 419.53, heightPt: 595.28 },
  { id: "a6", label: "A6", detail: "105 × 148 mm", paperSize: "A6", orientation: "portrait", widthPt: 297.64, heightPt: 419.53 },
  { id: "letter", label: "Letter", detail: "8.5 × 11 in", paperSize: "Letter", orientation: "portrait", widthPt: 612, heightPt: 792 },
  { id: "legal", label: "Legal", detail: "8.5 × 14 in", paperSize: "Legal", orientation: "portrait", widthPt: 612, heightPt: 1008 },
  { id: "4x6", label: "4 × 6 in", detail: "Photo (portrait)", paperSize: "4x6in", orientation: "portrait", widthPt: 288, heightPt: 432 },
  { id: "6x4", label: "6 × 4 in", detail: "Photo (landscape)", paperSize: "4x6in", orientation: "landscape", widthPt: 432, heightPt: 288 },
  { id: "5x7", label: "5 × 7 in", detail: "Photo", paperSize: "5x7in", orientation: "portrait", widthPt: 360, heightPt: 504 },
];

const ptToMm = (pt: number) => (pt * 25.4) / 72;
const ptToIn = (pt: number) => pt / 72;

const formatSize = (w: number, h: number) =>
  `${w.toFixed(0)} × ${h.toFixed(0)} pt  (${ptToMm(w).toFixed(1)} × ${ptToMm(
    h
  ).toFixed(1)} mm / ${ptToIn(w).toFixed(2)} × ${ptToIn(h).toFixed(2)} in)`;

function App() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [selectedPageSize, setSelectedPageSize] = useState<PageSize | null>(
    null
  );
  const [fitMode, setFitMode] = useState<FitMode | null>(null);
  const [trim, setTrim] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [resizing, setResizing] = useState(false);

  const updateFileInfo = (info: {
    received: boolean;
    fileName?: string;
    widthPt?: number;
    heightPt?: number;
    downloaded?: boolean;
  }) => {
    if (info.received) {
      setFileInfo({
        fileName: info.fileName,
        widthPt: info.widthPt,
        heightPt: info.heightPt,
        downloaded: info.downloaded,
      });
    }
  };

  const syncOptions = async (options: PrintOptions) => {
    setResizing(true);
    try {
      const info = await window.electronAPI.setOptions(options);
      updateFileInfo(info);
    } finally {
      setResizing(false);
    }
  };

  useEffect(() => {
    const loadPrinters = async () => {
      const result = await window.electronAPI.getPrinters();

      console.log("Printers from Electron:", result);

      setPrinters(result);
    };

    loadPrinters();
  }, []);

  useEffect(() => {
    window.electronAPI.onFileReceived((info) => {
      console.log("File received:", info);
      updateFileInfo(info);
    });

    const loadFileInfo = async () => {
      const info = await window.electronAPI.getFileInfo();
      updateFileInfo(info);
    };
    loadFileInfo();
  }, []);

  const handlePrinterSelect = async (name: string) => {
    const next = selectedPrinter === name ? "" : name;
    setSelectedPrinter(next);
    await syncOptions({ printer: next ? next : null });
  };

  const handlePageSizeSelect = async (size: PageSize) => {
    const next = selectedPageSize?.id === size.id ? null : size;
    setSelectedPageSize(next);


    if (next === null) {
      setFitMode(null);
      setTrim(false);
      await syncOptions({
        widthPt: null,
        heightPt: null,
        fitMode: null,
        trim: false,
      });
      return;
    }

    await syncOptions({
      widthPt: next.widthPt,
      heightPt: next.heightPt,
    });
  };

  const handleFitModeSelect = async (mode: FitMode) => {
    const next = fitMode === mode ? null : mode;
    setFitMode(next);
    await syncOptions({ fitMode: next });
  };

  const handleTrimToggle = async () => {
    const next = !trim;
    setTrim(next);
    await syncOptions({ trim: next });
  };

  const handleDownload = async () => {
    setResizing(true);
    try {
      const result = await window.electronAPI.downloadFile();
      console.log("Download result:", result);
      if (result.saved) {
        setFileInfo((prev) => (prev ? { ...prev, downloaded: true } : prev));
      }
    } finally {
      setResizing(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖨️ Print Center</h1>
        <p>
          Select a printer (required). Size / fit / trim are optional — the PDF
          downloads automatically when a file arrives.
        </p>
      </header>

      <section className="section">
        <h2>1. Select Printer</h2>
        <div className="printer-list">
          {printers.length === 0 ? (
            <div className="empty-state">
              <span>🖨️</span>
              <span>No printers found</span>
            </div>
          ) : (
            printers.map((printer) => (
              <div
                className={`printer-card ${selectedPrinter === printer.name ? "selected" : ""
                  }`}
                key={printer.name}
                onClick={() => handlePrinterSelect(printer.name)}
              >
                <span className="printer-icon">🖨️</span>
                <div className="printer-info">
                  <span className="printer-name">
                    {printer.displayName || printer.name}
                  </span>
                  <span className="printer-id">{printer.name}</span>
                </div>
                {selectedPrinter === printer.name && (
                  <span className="check">✓</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="section">
        <h2>2. Select Paper Size</h2>
        <div className="paper-size-list">
          {PAGE_SIZES.map((size) => (
            <div
              className={`paper-size-card ${selectedPageSize?.id === size.id ? "selected" : ""
                }`}
              key={size.id}
              onClick={() => handlePageSizeSelect(size)}
            >
              <span className="paper-size-label">{size.label}</span>
              <span className="paper-size-detail">{size.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>2b. Fit Mode</h2>
        {!selectedPageSize && (
          <p className="section-hint">
            Select a paper size first to enable fit mode.
          </p>
        )}
        <div className="paper-size-list">
          {FIT_MODES.map((mode) => (
            <div
              className={`paper-size-card ${!selectedPageSize ? "disabled" : ""
                } ${fitMode === mode.id ? "selected" : ""}`}
              key={mode.id}
              onClick={() => selectedPageSize && handleFitModeSelect(mode.id)}
            >
              <span className="paper-size-label">{mode.label}</span>
              <span className="paper-size-detail">{mode.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>2c. Trim White Margins</h2>
        {!selectedPageSize && (
          <p className="section-hint">
            Select a paper size first to enable trim.
          </p>
        )}
        <div className="paper-size-list">
          <div
            className={`paper-size-card ${!selectedPageSize ? "disabled" : ""} ${trim ? "selected" : ""
              }`}
            onClick={() => selectedPageSize && handleTrimToggle()}
          >
            <span className="paper-size-label">
              {trim ? "✓ Trim ON" : "Trim OFF"}
            </span>
            <span className="paper-size-detail">
              Removes white/empty margins and crops the page to the content (QR code).
            </span>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>3. PDF Preview / Verify Size</h2>
        <div className="file-info">
          {!fileInfo ? (
            <p className="file-info-empty">
              ⏳ No PDF has been received yet. As soon as the file arrives from PMA, its size will be displayed here.
            </p>
          ) : (
            <>
              <p>
                📄 File:{" "}
                <strong>{fileInfo.fileName || "unknown"}</strong>
              </p>
              <p>
                📐 Current size:{" "}
                <strong>
                  {fileInfo.widthPt && fileInfo.heightPt
                    ? formatSize(fileInfo.widthPt, fileInfo.heightPt)
                    : "Not a PDF / size nai parhi ja saki"}
                </strong>
              </p>
              <p>
                🎯 Size:{" "}
                <strong>
                  {selectedPageSize ? selectedPageSize.label : "Original (from PMA)"}
                </strong>
                {selectedPageSize ? ` (${selectedPageSize.detail})` : ""} · Fit:{" "}
                <strong>{fitMode ?? "None"}</strong> · Trim:{" "}
                <strong>{trim ? "ON" : "OFF"}</strong>
              </p>
              {fileInfo.downloaded && (
                <p className="file-info-note">
                  ✅ Downloaded to Downloads folder
                </p>
              )}
              {resizing && <p className="file-info-note">Resizing PDF…</p>}
            </>
          )}
        </div>
      </section>

      <section className="summary">
        <p>
          Printer: <strong>{selectedPrinter || "—"}</strong>
        </p>
        <p>
          Paper Size:{" "}
          <strong>
            {selectedPageSize ? selectedPageSize.label : "Original (from PMA)"}
          </strong>
        </p>
        <p>
          Fit Mode: <strong>{fitMode ?? "None"}</strong>
        </p>
      </section>

      <button
        className="print-button"
        onClick={handleDownload}
        disabled={!fileInfo || !selectedPrinter}
      >
        ⬇️ Download PDF
      </button>
    </div>
  );
}

export default App;

