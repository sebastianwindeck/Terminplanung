import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileDown, RefreshCw } from "lucide-react";
import { reportsApi } from "@/api/client";
import type { ScheduleVersion, SequentialComparisonResponse } from "@/types";
import ComparisonStepCard from "./ComparisonStepCard";

interface Props {
  projectId: number;
  versions: ScheduleVersion[];
}

export default function SequentialComparisonView({ projectId, versions }: Props) {
  const sortedVersions = [...versions].sort((a, b) => a.version_number - b.version_number);

  const [selectedVersionIds, setSelectedVersionIds] = useState<number[]>(
    sortedVersions.map((v) => v.id)
  );
  const [result, setResult] = useState<SequentialComparisonResponse | null>(null);

  const compareMutation = useMutation({
    mutationFn: () => reportsApi.getSequentialComparison(projectId, selectedVersionIds),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => toast.error("Fehler beim Laden des Vergleichs"),
  });

  const pdfMutation = useMutation({
    mutationFn: () => reportsApi.generatePdf(projectId, selectedVersionIds),
    onSuccess: (report) => {
      toast.success("PDF wird heruntergeladen…");
      window.open(reportsApi.downloadUrl(report.id), "_blank");
    },
    onError: () => toast.error("Fehler beim Generieren des PDFs"),
  });

  const toggleVersion = (id: number) => {
    setSelectedVersionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setResult(null);
  };

  if (versions.length < 2) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-400 text-sm">Mindestens 2 Versionen erforderlich für den Vergleich.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Version selector */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Versionen auswählen</h3>
        <div className="flex flex-wrap gap-2">
          {sortedVersions.map((v) => (
            <label
              key={v.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                selectedVersionIds.includes(v.id)
                  ? "bg-primary-50 border-primary-300 text-primary-800"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={selectedVersionIds.includes(v.id)}
                onChange={() => toggleVersion(v.id)}
                className="accent-primary-600"
              />
              <span className="font-medium">V{v.version_number}</span>
              <span className="text-gray-500 text-xs">{v.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          className="btn-primary"
          disabled={selectedVersionIds.length < 2 || compareMutation.isPending}
          onClick={() => compareMutation.mutate()}
        >
          {compareMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Lädt…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" /> Vergleich laden
            </>
          )}
        </button>

        {result && (
          <button
            className="btn-secondary"
            disabled={pdfMutation.isPending}
            onClick={() => pdfMutation.mutate()}
          >
            {pdfMutation.isPending ? (
              <>
                <FileDown className="w-4 h-4 animate-spin" /> Generiert…
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" /> PDF generieren
              </>
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-700">{result.project_name}</span>
            <span>—</span>
            <span>{result.steps.length} Vergleichsschritte</span>
          </div>

          {result.steps.map((step, i) => (
            <ComparisonStepCard key={`${step.from_version_id}-${step.to_version_id}`} step={step} stepIndex={i} />
          ))}

          {result.steps.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-gray-400 text-sm">Keine Vergleichsschritte für die ausgewählten Versionen.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
