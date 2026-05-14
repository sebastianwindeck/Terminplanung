import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, FileCode, AlertTriangle, CheckCircle } from "lucide-react";
import Modal from "@/components/Modal";
import { mspdiApi } from "@/api/client";
import type { MSPDIImportResult } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
}

export default function MSPDIImportDialog({ open, onClose, projectId }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");
  const [result, setResult] = useState<MSPDIImportResult | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Keine Datei ausgewählt");
      return mspdiApi.import(projectId, file, versionName || undefined);
    },
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["versions", projectId] });
      toast.success(`${data.positions_created} Positionen importiert`);
    },
    onError: () => toast.error("Import fehlgeschlagen"),
  });

  const handleClose = () => {
    setFile(null);
    setVersionName("");
    setResult(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate();
  };

  return (
    <Modal open={open} onClose={handleClose} title="MS Project importieren" size="md">
      <div className="space-y-5">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File drop zone */}
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
                accept=".xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-primary-700">
                  <FileCode className="w-10 h-10" />
                  <span className="font-medium text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <Upload className="w-10 h-10" />
                  <span className="font-medium text-sm">MSPDI-Datei hier ablegen oder klicken</span>
                  <span className="text-xs">.xml (MS Project XML)</span>
                </div>
              )}
            </div>

            {/* Version name */}
            <div>
              <label className="label">Versionsname (optional)</label>
              <input
                className="input"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="MS Project Import"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={handleClose}>
                Abbrechen
              </button>
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
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button className="btn-primary" onClick={handleClose}>
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
