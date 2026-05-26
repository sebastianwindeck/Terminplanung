import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { stoerungsApi } from "@/api/stoerungen";
import { DisruptionStatusBadge } from "@/components/stoerungen/DisruptionStatusBadge";
import { EvidenceTrafficLight } from "@/components/stoerungen/EvidenceTrafficLight";
import type { StoerungStatus } from "@/types/stoerung";

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "angezeigt", label: "Angezeigt" },
  { value: "in_beobachtung", label: "In Beobachtung" },
  { value: "behoben", label: "Behoben" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
];

export default function DisruptionListPage() {
  const [searchParams] = useSearchParams();
  const projectId = Number(searchParams.get("project_id"));
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: stoerungen, isLoading, isError } = useQuery({
    queryKey: ["stoerungen", projectId, statusFilter],
    queryFn: () => stoerungsApi.list(projectId, statusFilter || undefined),
    enabled: !!projectId,
  });

  if (!projectId) {
    return <div className="p-8 text-gray-500">Kein Projekt ausgewählt.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Störungen</h1>
        <Link
          to={`/stoerungen/neu?project_id=${projectId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          + Neue Störung
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-gray-500">Lade Störungen…</p>}
      {isError && <p className="text-red-600">Fehler beim Laden der Störungen.</p>}

      {stoerungen && stoerungen.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Keine Störungen vorhanden.</p>
          <p className="text-sm mt-1">Erstellen Sie die erste Störung über „+ Neue Störung".</p>
        </div>
      )}

      {stoerungen && stoerungen.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nr.</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Titel</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Art</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Kritikalität</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Beginn</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nachweis</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Anzeigen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {stoerungen.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">
                    <Link to={`/stoerungen/${s.id}`} className="text-primary-700 hover:underline font-medium">
                      {s.stoerung_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{s.titel}</td>
                  <td className="px-4 py-3 text-gray-600">{s.stoerungsart || "–"}</td>
                  <td className="px-4 py-3">
                    <DisruptionStatusBadge status={s.status as StoerungStatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{s.kritikalitaet || "–"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.stoerungsbeginn ? new Date(s.stoerungsbeginn).toLocaleDateString("de-DE") : "–"}
                  </td>
                  <td className="px-4 py-3">
                    <EvidenceTrafficLight ampel={s.nachweis_ampel} showLabel={false} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-center">{s.anzeigen_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
