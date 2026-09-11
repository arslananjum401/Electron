import { useEffect, useState } from "react";

function App() {
  interface printer {
    displayName: string;
    name: string;
  }

  const [printers, setPrinters] = useState<printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  useEffect(() => {
    const loadPrinters = async () => {
      const result = await window.electronAPI.getPrinters();

      console.log("Printers from Electron:", result);

      setPrinters(result);
    };

    loadPrinters();
  }, []);

  const handlePrint = async () => {
    if (!selectedPrinter) {
      return;
    }

    console.log("Printing example.png");
    console.log("Printing on:", selectedPrinter);

    await window.electronAPI.printFile(selectedPrinter);
  };

  return (
    <div className="app">
      <h1>Electron Printer App</h1>

      <p>Available Printers</p>

      <div className="printer-list">
        {printers.length === 0 ? (
          <div className="printer-card">
            <span>🖨️</span>
            <span>No printers found</span>
          </div>
        ) : (
          printers.map((printer) => (
            <div
              className="printer-card"
              key={printer.name}
              onClick={() => {
                setSelectedPrinter(printer.name);

                console.log(
                  "Selected printer:",
                  printer.name
                );
              }}
            >
              <span>🖨️</span>

              <span>
                {printer.displayName || printer.name}
              </span>
            </div>
          ))
        )}
      </div>

      {selectedPrinter && (
        <p>
          Selected Printer:{" "}
          <strong>{selectedPrinter}</strong>
        </p>
      )}

      <button
        onClick={handlePrint}
        disabled={!selectedPrinter}
      >
        Print
      </button>
    </div>
  );
}

export default App;

