import { useEffect, useState } from "react";

interface Printer {
  displayName?: string;
  name: string;
}

interface PageSize {
  id: string;
  label: string;
  detail: string;
  paperSize: string;
  orientation: "portrait" | "landscape";
  widthPt: number;
  heightPt: number;
}

const PAGE_SIZES: PageSize[] = [
  { id: "a4", label: "A4", detail: "210 × 297 mm", paperSize: "A4", orientation: "portrait", widthPt: 595.28, heightPt: 841.89 },
  { id: "a5", label: "A5", detail: "148 × 210 mm", paperSize: "A5", orientation: "portrait", widthPt: 419.53, heightPt: 595.28 },
  { id: "a6", label: "A6", detail: "105 × 148 mm", paperSize: "A6", orientation: "portrait", widthPt: 297.64, heightPt: 419.53 },
  { id: "letter", label: "Letter", detail: "8.5 × 11 in", paperSize: "Letter", orientation: "portrait", widthPt: 612, heightPt: 792 },
  { id: "legal", label: "Legal", detail: "8.5 × 14 in", paperSize: "Legal", orientation: "portrait", widthPt: 612, heightPt: 1008 },
  { id: "4x6", label: "4 × 6 in", detail: "Photo (portrait)", paperSize: "4x6", orientation: "portrait", widthPt: 288, heightPt: 432 },
  { id: "6x4", label: "6 × 4 in", detail: "Photo (landscape)", paperSize: "4x6", orientation: "landscape", widthPt: 432, heightPt: 288 },
  { id: "5x7", label: "5 × 7 in", detail: "Photo", paperSize: "5x7", orientation: "portrait", widthPt: 360, heightPt: 504 },
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
  const [selectedPageSize, setSelectedPageSize] = useState<PageSize>(
    PAGE_SIZES[0]
  );
  const [fileInfo, setFileInfo] = useState<{
    fileName?: string;
    widthPt?: number;
    heightPt?: number;
  } | null>(null);
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    const loadPrinters = async () => {
      const result = await window.electronAPI.getPrinters();

      console.log("Printers from Electron:", result);

      setPrinters(result);
    };

    loadPrinters();
  }, []);

  useEffect(() => {
    // File receive hone par info update karo
    window.electronAPI.onFileReceived((info) => {
      console.log("File received:", info);
      if (info.received) {
        setFileInfo({
          fileName: info.fileName,
          widthPt: info.widthPt,
          heightPt: info.heightPt,
        });
      }
    });

    // Agar file pehle se aayi hai to usay load karo
    const loadFileInfo = async () => {
      const info = await window.electronAPI.getFileInfo();
      if (info.received) {
        setFileInfo({
          fileName: info.fileName,
          widthPt: info.widthPt,
          heightPt: info.heightPt,
        });
      }
    };
    loadFileInfo();
  }, []);

  const handlePageSizeSelect = async (size: PageSize) => {
    setSelectedPageSize(size);

    if (!fileInfo) {
      console.log("⚠️ Abhi koi file received nahi hui — resize nahi hoga");
      return;
    }

    setResizing(true);
    const info = await window.electronAPI.resizePdf(
      size.widthPt,
      size.heightPt
    );

    if (info.received) {
      setFileInfo({
        fileName: info.fileName,
        widthPt: info.widthPt,
        heightPt: info.heightPt,
      });
    }
    setResizing(false);
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      return;
    }

    console.log("Printing on:", selectedPrinter);
    console.log(
      "Paper size:",
      selectedPageSize.label,
      selectedPageSize.orientation
    );

    await window.electronAPI.printFile(
      selectedPrinter,
      selectedPageSize.paperSize,
      selectedPageSize.orientation
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖨️ Print Center</h1>
        <p>Select a printer and paper size, then hit print.</p>
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
                className={`printer-card ${
                  selectedPrinter === printer.name ? "selected" : ""
                }`}
                key={printer.name}
                onClick={() => {
                  setSelectedPrinter(printer.name);
                  console.log("Selected printer:", printer.name);
                }}
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
              className={`paper-size-card ${
                selectedPageSize.id === size.id ? "selected" : ""
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
        <h2>3. PDF Preview / Verify Size</h2>
        <div className="file-info">
          {!fileInfo ? (
            <p className="file-info-empty">
              ⏳ Abhi koi PDF received nahi hui. PMA se file aate hi yahan
              uski size dikhegi.
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
                🎯 Selected: <strong>{selectedPageSize.label}</strong>{" "}
                ({selectedPageSize.detail})
              </p>
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
          Paper Size: <strong>{selectedPageSize.label}</strong>
        </p>
      </section>

      <button
        className="print-button"
        onClick={handlePrint}
        disabled={!selectedPrinter}
      >
        🖨️ Print
      </button>
    </div>
  );
}

export default App;

