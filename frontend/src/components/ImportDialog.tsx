import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import { positionsApi } from "@/api/client";
import type { ImportResult } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  versionId: number;
}

export default function ImportDialog({ open, onClose, versionId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (f: File) => positionsApi.import(versionId, f),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["positions", versionId] });
      if (data.imported > 0) {
        toast.success(`${data.imported} Positionen importiert`);
      }
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.detail || "Import fehlgeschlagen");
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Positionen importieren" size="lg">
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">Unterstützte Formate: Excel (.xlsx, .xls) und CSV</p>
          <p>Erwartete Spalten (flexibel erkannt):</p>
          <ul className="mt-1 list-disc list-inside text-blue-700 space-y-0.5">
            <li>Pos.-Nr. / Nr. / Position</li>
            <li>Bezeichnung / Name / Vorgang / Task</li>
            <li>Beginn / Start / Von</li>
            <li>Ende / End / Bis</li>
            <li>Dauer / Duration (in Tagen)</li>
            <li>Verantwortlich / Responsible</li>
            <li>Gewerk / Trade</li>
            <li>Status (geplant, in_bearbeitung, abgeschlossen, verzögert)</li>
            <li>Fortschritt / Progress (%)</li>
          </ul>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); } }}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2 text-primary-700">
              <FileSpreadsheet className="w-10 h-10" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload className="w-10 h-10" />
              <span className="font-medium">Datei hier ablegen oder klicken</span>
              <span className="text-xs">.xlsx, .xls, .csv</span>
            </div>
          )}
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{result.imported} importiert, {result.skipped} übersprungen</span>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{result.errors.length} Fehler</span>
                </div>
                <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button className="btn-secondary" onClick={handleClose}>
            {result ? "Schließen" : "Abbrechen"}
          </button>
          {!result && (
            <button
              className="btn-primary"
              disabled={!file || isPending}
              onClick={() => file && mutate(file)}
            >
              {isPending ? "Importiert…" : "Importieren"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
