import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "./Modal";
import { versionsApi } from "@/api/client";
import type { ScheduleVersion } from "@/types";
import { ArrowRight, Plus, Minus, Edit2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  versions: ScheduleVersion[];
  currentVersionId: number;
}

const CHANGE_ICONS = {
  added: <Plus className="w-3.5 h-3.5 text-green-600" />,
  removed: <Minus className="w-3.5 h-3.5 text-red-500" />,
  modified: <Edit2 className="w-3.5 h-3.5 text-yellow-600" />,
};

const CHANGE_ROW_COLORS = {
  added: "bg-green-50 border-l-2 border-green-400",
  removed: "bg-red-50 border-l-2 border-red-400",
  modified: "bg-yellow-50 border-l-2 border-yellow-400",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Bezeichnung", start_date: "Beginn", end_date: "Ende", duration_days: "Dauer",
  responsible: "Verantwortlich", trade: "Gewerk", status: "Status", progress: "Fortschritt", "*": "Position",
};

export default function CompareDialog({ open, onClose, versions, currentVersionId }: Props) {
  const [compareId, setCompareId] = useState<number | "">("");

  const { data, isFetching } = useQuery({
    queryKey: ["compare", currentVersionId, compareId],
    queryFn: () => versionsApi.compare(currentVersionId, Number(compareId)),
    enabled: !!compareId,
  });

  const others = versions.filter((v) => v.id !== currentVersionId);

  return (
    <Modal open={open} onClose={onClose} title="Versionen vergleichen" size="xl">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Aktuelle Version</label>
            <div className="input bg-gray-50 text-gray-700">
              {versions.find((v) => v.id === currentVersionId)?.name}
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400 mt-6 flex-shrink-0" />
          <div className="flex-1">
            <label className="label">Vergleichen mit</label>
            <select className="input" value={compareId} onChange={(e) => setCompareId(Number(e.target.value) || "")}>
              <option value="">— Version auswählen —</option>
              {others.map((v) => (
                <option key={v.id} value={v.id}>V{v.version_number} – {v.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isFetching && <div className="text-center py-8 text-gray-400 text-sm">Vergleiche…</div>}

        {data && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                <Plus className="w-3.5 h-3.5" /> {data.added_count} neu
              </span>
              <span className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full">
                <Minus className="w-3.5 h-3.5" /> {data.removed_count} entfernt
              </span>
              <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full">
                <Edit2 className="w-3.5 h-3.5" /> {data.modified_count} geändert
              </span>
            </div>

            {data.diffs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Keine Unterschiede gefunden</div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-8"></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Pos.-Nr.</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Bezeichnung</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Feld</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Alt</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Neu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.diffs.map((d, i) => (
                      <tr key={i} className={`${CHANGE_ROW_COLORS[d.change_type]}`}>
                        <td className="px-3 py-2">{CHANGE_ICONS[d.change_type]}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-500">{d.pos_number || "–"}</td>
                        <td className="px-3 py-1.5 text-xs font-medium text-gray-800 max-w-[200px] truncate">{d.title}</td>
                        <td className="px-3 py-1.5 text-xs text-gray-600">{FIELD_LABELS[d.field] || d.field}</td>
                        <td className="px-3 py-1.5 text-xs text-red-700 line-through">{d.old_value || "–"}</td>
                        <td className="px-3 py-1.5 text-xs text-green-700">{d.new_value || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button className="btn-secondary" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </Modal>
  );
}
