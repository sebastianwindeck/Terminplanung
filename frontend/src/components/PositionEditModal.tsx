import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import Modal from "./Modal";
import { positionsApi } from "@/api/client";
import type { SchedulePosition, PositionStatus } from "@/types";
import { STATUS_LABELS } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  versionId: number;
  position?: SchedulePosition;
}

const STATUSES: PositionStatus[] = ["planned", "in_progress", "completed", "delayed", "cancelled"];

export default function PositionEditModal({ open, onClose, versionId, position }: Props) {
  const isNew = !position;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    pos_number: position?.pos_number || "",
    title: position?.title || "",
    description: position?.description || "",
    start_date: position?.start_date || "",
    end_date: position?.end_date || "",
    duration_days: String(position?.duration_days ?? ""),
    responsible: position?.responsible || "",
    trade: position?.trade || "",
    status: (position?.status || "planned") as PositionStatus,
    progress: String(Math.round((position?.progress || 0) * 100)),
    is_milestone: position?.is_milestone || false,
    color: position?.color || "",
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) =>
      isNew
        ? positionsApi.create({ ...data, version_id: versionId })
        : positionsApi.update(position!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["positions", versionId] });
      toast.success(isNew ? "Position erstellt" : "Position gespeichert");
      onClose();
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      ...form,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      progress: Number(form.progress) / 100,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      pos_number: form.pos_number || null,
      description: form.description || null,
      responsible: form.responsible || null,
      trade: form.trade || null,
      color: form.color || null,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? "Neue Position" : "Position bearbeiten"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Pos.-Nr.</label>
            <input className="input" value={form.pos_number} onChange={(e) => set("pos_number", e.target.value)} placeholder="z.B. 1.1.2" />
          </div>
          <div>
            <label className="label">Gewerk</label>
            <input className="input" value={form.trade} onChange={(e) => set("trade", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Bezeichnung *</label>
          <input className="input" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Beginn</label>
            <input type="date" className="input" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div>
            <label className="label">Ende</label>
            <input type="date" className="input" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </div>
          <div>
            <label className="label">Dauer (Tage)</label>
            <input type="number" min={0} className="input" value={form.duration_days} onChange={(e) => set("duration_days", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Verantwortlich</label>
            <input className="input" value={form.responsible} onChange={(e) => set("responsible", e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fortschritt (%)</label>
            <input type="number" min={0} max={100} className="input" value={form.progress} onChange={(e) => set("progress", e.target.value)} />
          </div>
          <div>
            <label className="label">Farbe (Hex)</label>
            <div className="flex gap-2">
              <input className="input" placeholder="#3b82f6" value={form.color} onChange={(e) => set("color", e.target.value)} />
              {form.color && <div className="w-10 h-10 rounded border flex-shrink-0" style={{ backgroundColor: form.color }} />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="milestone" checked={form.is_milestone} onChange={(e) => set("is_milestone", e.target.checked)} className="w-4 h-4 accent-primary-600" />
          <label htmlFor="milestone" className="text-sm font-medium text-gray-700">Meilenstein</label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Speichert…" : isNew ? "Erstellen" : "Speichern"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
