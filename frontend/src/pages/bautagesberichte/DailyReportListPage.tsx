import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle, FileText, CloudSun } from "lucide-react";
import toast from "react-hot-toast";
import { bautagesberichteApi } from "@/api/client";
import type { Bautagesbericht } from "@/types";

const STATUS_STYLES = {
  erstellt: "bg-gray-100 text-gray-700",
  geprueft: "bg-yellow-100 text-yellow-800",
  freigegeben: "bg-green-100 text-green-800",
} as const;

const STATUS_LABELS = {
  erstellt: "Erstellt",
  geprueft: "Geprüft",
  freigegeben: "Freigegeben",
} as const;

const WETTER_ICONS: Record<string, string> = {
  sonnig: "☀️", bewoelkt: "⛅", bedeckt: "☁️", regen: "🌧️",
  schnee: "❄️", nebel: "🌫️", gewitter: "⛈️",
};

function wetter(b: Bautagesbericht) {
  if (!b.wetter) return null;
  const icon = WETTER_ICONS[b.wetter] ?? "🌡️";
  const temp = b.temperatur_max != null ? ` ${b.temperatur_max}°C` : "";
  return `${icon}${temp}`;
}

export default function DailyReportListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = Number(projectId);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: berichte = [], isLoading } = useQuery({
    queryKey: ["bautagesberichte", pid],
    queryFn: () => bautagesberichteApi.listForProject(pid),
    enabled: !!pid,
  });

  const freigabenMutation = useMutation({
    mutationFn: (id: number) => bautagesberichteApi.freigeben(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bautagesberichte", pid] }); toast.success("Bericht freigegeben"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bautagesberichteApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bautagesberichte", pid] }); toast.success("Bericht gelöscht"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary-700" />
          <h2 className="text-xl font-bold text-gray-900">Bautagesberichte</h2>
        </div>
        <button
          onClick={() => navigate(`/projects/${pid}/bautagesberichte/neu`)}
          className="flex items-center gap-1.5 bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Neuer Bericht
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Lade…</div>
      ) : berichte.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Noch keine Bautagesberichte vorhanden</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Wetter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Personal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Störung</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {berichte.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/projects/${pid}/bautagesberichte/${b.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {new Date(b.datum).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {wetter(b) ?? (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {b.personalanzahl != null ? `${b.personalanzahl} Pers.` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {b.stoerung_vorhanden ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Ja</span>
                    ) : (
                      <span className="text-xs text-gray-300">Nein</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[b.freigabestatus]}`}>
                      {STATUS_LABELS[b.freigabestatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      {b.freigabestatus !== "freigegeben" && (
                        <button
                          onClick={() => freigabenMutation.mutate(b.id)}
                          className="p-1.5 rounded hover:bg-green-50 text-green-600" title="Freigeben"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {b.freigabestatus !== "freigegeben" && (
                        <button
                          onClick={() => { if (confirm("Bericht löschen?")) deleteMutation.mutate(b.id); }}
                          className="p-1.5 rounded hover:bg-red-50 text-red-400" title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
