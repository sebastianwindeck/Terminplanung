import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Trash2, ChevronDown, ChevronRight, Star } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { SchedulePosition, PositionStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";
import { positionsApi } from "@/api/client";
import PositionEditModal from "./PositionEditModal";

interface Props {
  positions: SchedulePosition[];
  versionId: number;
  onRowClick?: (pos: SchedulePosition) => void;
}

function fmtDate(d?: string) {
  if (!d) return "–";
  try { return format(new Date(d), "dd.MM.yyyy", { locale: de }); }
  catch { return d; }
}

export default function PositionTable({ positions, versionId, onRowClick }: Props) {
  const [editId, setEditId] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: positionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions", versionId] });
      toast.success("Position gelöscht");
    },
    onError: () => toast.error("Löschen fehlgeschlagen"),
  });

  const topLevel = positions.filter((p) => !p.parent_id);
  const childrenOf = (id: number) => positions.filter((p) => p.parent_id === id);

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirmDelete = (id: number, title: string) => {
    if (window.confirm(`Position "${title}" löschen?`)) deleteMutation.mutate(id);
  };

  const editPos = editId !== null ? positions.find((p) => p.id === editId) : null;

  const renderRow = (pos: SchedulePosition, depth = 0): JSX.Element[] => {
    const kids = childrenOf(pos.id);
    const isCollapsed = collapsed.has(pos.id);
    return [
      <tr
        key={pos.id}
        className={`group cursor-pointer transition-colors ${
          pos.behinderung_aktiv ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
        }`}
        onClick={() => onRowClick?.(pos)}
      >
        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap w-20">{pos.pos_number || "–"}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1" style={{ paddingLeft: depth * 20 }}>
            {kids.length > 0 ? (
              <button onClick={(e) => { e.stopPropagation(); toggle(pos.id); }} className="text-gray-400 hover:text-gray-600">
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5 h-3.5 inline-block" />
            )}
            {pos.is_milestone && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
            {pos.behinderung_aktiv && <span className="text-red-500 text-xs font-bold" title="Behinderung aktiv">⚠</span>}
            {pos.behinderung_tage_gesamt > 0 && !pos.behinderung_aktiv && (
              <span className="text-orange-400 text-xs" title={`${pos.behinderung_tage_gesamt} Verzugtage angesammelt`}>+{pos.behinderung_tage_gesamt}T</span>
            )}
            <span className={`text-sm ${depth === 0 ? "font-medium" : ""}`}>{pos.title}</span>
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{fmtDate(pos.start_date)}</td>
        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{fmtDate(pos.end_date)}</td>
        <td className="px-3 py-2 text-xs text-gray-600 text-center">{pos.duration_days ?? "–"}</td>
        <td className="px-3 py-2 text-xs text-gray-600">{pos.responsible || "–"}</td>
        <td className="px-3 py-2 text-xs text-gray-600">{pos.trade || "–"}</td>
        <td className="px-3 py-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pos.status as PositionStatus]}`}>
            {STATUS_LABELS[pos.status as PositionStatus] || pos.status}
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-16">
              <div
                className="bg-primary-500 h-1.5 rounded-full"
                style={{ width: `${Math.round(pos.progress * 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8 text-right">{Math.round(pos.progress * 100)}%</span>
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setEditId(pos.id); }} className="btn-ghost p-1 rounded" title="Bearbeiten">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); confirmDelete(pos.id, pos.title); }}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>,
      ...(!isCollapsed ? kids.flatMap((child) => renderRow(child, depth + 1)) : []),
    ];
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Pos.-Nr.", "Bezeichnung", "Beginn", "Ende", "Dauer", "Verantwortlich", "Gewerk", "Status", "Fortschritt", ""].map((h) => (
                <th key={h} className="px-3 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topLevel.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-gray-400">
                  Keine Positionen vorhanden. Importieren Sie eine Datei oder fügen Sie Positionen manuell hinzu.
                </td>
              </tr>
            ) : (
              topLevel.flatMap((p) => renderRow(p))
            )}
          </tbody>
        </table>
      </div>

      {editPos && (
        <PositionEditModal
          open={true}
          position={editPos}
          versionId={versionId}
          onClose={() => setEditId(null)}
        />
      )}
    </>
  );
}
