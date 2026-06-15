import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download } from "lucide-react";
import Modal from "@/components/Modal";
import { positionsApi, downloadWithAuth } from "@/api/client";
import type { MSPDIImportResult } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onSuccess?: (result: MSPDIImportResult) => void;
}

export default function ExcelImportAsVersionDialog({ open, onClose, projectId, onSuccess }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [result, setResult] = useState<MSPDIImportResult | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Keine Datei ausgewählt");
      return positionsApi.importAsVersion(projectId, file, versionName || undefined);
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["versions", projectId] });
      toast.success(`${data.positions_created} Positionen importiert`);
      onSuccess?.(data);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Import fehlgeschlagen"),
  });

  const handleClose = () => {
    setFile(null);
    setVersionName("");
    setResult(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Excel importieren (neue Version)" size="md">
      <div className="space-y-5">
        {!result ? (
          <form onSubmit={(e) => { e.preventDefault(); mutate(); }} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-medium mb-1">Excel-Vorlage verwenden</p>
                <p className="text-xs text-blue-700">Laden Sie die Vorlage herunter, befüllen Sie diese und importieren Sie sie hier.</p>
              </div>
              <button
                type="button"
                className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 flex-shrink-0"
                onClick={() => downloadWithAuth("/api/positions/template", "Terminplan-Vorlage.xlsx")}
              >
                <Download className="w-3 h-3" /> Vorlage
              </button>
            </div>

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) setFile(f);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-primary-700">
                  <FileSpreadsheet className="w-10 h-10" />
                  <span className="font-medium text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-10 h-10" />
                  <span className="font-medium text-sm">Datei hier ablegen oder klicken</span>
                  <span className="text-xs">.xlsx, .xls, .csv</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Versionsname (optional)</label>
              <input
                className="input"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Basisplanung"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={handleClose}>Abbrechen</button>
              <button type="submit" className="btn-primary" disabled={!file || isPending}>
                {isPending ? "Importiert…" : "Importieren"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Import erfolgreich</p>
                <p>{result.positions_created} Positionen erstellt, {result.skipped} übersprungen</p>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{result.warnings.length} Hinweise</span>
                </div>
                <ul className="text-xs text-amber-600 space-y-0.5 max-h-40 overflow-y-auto">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleClose}>Schließen</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
