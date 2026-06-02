import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { kausalitaetApi } from "@/api/stoerungen";
import type { Kausalitaet } from "@/types/stoerung";

interface Props {
  stoerungId: number;
  kausalitaeten: Kausalitaet[];
  readonly?: boolean;
}

const VERANTWORTUNG_LABELS: Record<string, string> = {
  auftraggeber: "Auftraggeber",
  objektplanung_architekt: "Objektplanung / Architekt",
  fachplanung: "Fachplanung",
  bauleitung_ag: "Bauleitung AG",
  vorunternehmer_ag: "Vorunternehmer AG",
  behoerde: "Behörde",
  versorger: "Versorger",
  witterung: "Witterung",
  nachunternehmer_an: "Nachunternehmer AN",
  eigenes_unternehmen: "Eigenes Unternehmen",
  lieferant: "Lieferant",
  unklar: "Unklar / in Prüfung",
};

const EMPTY_FORM = {
  ereignis: "",
  verantwortungsbereich: "auftraggeber",
  behinderte_leistung_id: null as number | null,
  geplante_leistung: "",
  tatsaechliche_leistung: "",
  unmittelbare_auswirkung_json: "",
  mittelbare_auswirkung: "",
  bewertung: "",
};

export default function CausalityMatrix({ stoerungId, kausalitaeten, readonly }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: () =>
      kausalitaetApi.create({
        stoerung_id: stoerungId,
        ...form,
        geplante_leistung: form.geplante_leistung || null,
        tatsaechliche_leistung: form.tatsaechliche_leistung || null,
        unmittelbare_auswirkung_json: form.unmittelbare_auswirkung_json || null,
        mittelbare_auswirkung: form.mittelbare_auswirkung || null,
        bewertung: form.bewertung || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kausalitaeten", stoerungId] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("Kausalität hinzugefügt");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => kausalitaetApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kausalitaeten", stoerungId] });
      toast.success("Eintrag gelöscht");
    },
  });

  const set = (field: keyof typeof EMPTY_FORM, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Kausalitätsmatrix</h3>
        {!readonly && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 text-xs bg-primary-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-primary-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Eintrag hinzufügen
          </button>
        )}
      </div>

      {showForm && (
        <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-primary-800">Neuer Kausalitätseintrag</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label-sm">Ereignis / Ursache *</label>
              <input
                value={form.ereignis}
                onChange={(e) => set("ereignis", e.target.value)}
                className="input-field"
                placeholder="z.B. fehlende Planfreigabe Achse 3–7"
              />
            </div>
            <div>
              <label className="label-sm">Verantwortungsbereich</label>
              <select value={form.verantwortungsbereich} onChange={(e) => set("verantwortungsbereich", e.target.value)} className="input-field">
                {Object.entries(VERANTWORTUNG_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-sm">Bewertung</label>
              <input value={form.bewertung} onChange={(e) => set("bewertung", e.target.value)}
                className="input-field" placeholder="z.B. hoch / mittel / gering" />
            </div>
            <div>
              <label className="label-sm">Geplante Leistung</label>
              <input value={form.geplante_leistung} onChange={(e) => set("geplante_leistung", e.target.value)}
                className="input-field" placeholder="Was war geplant?" />
            </div>
            <div>
              <label className="label-sm">Tatsächliche Leistung</label>
              <input value={form.tatsaechliche_leistung} onChange={(e) => set("tatsaechliche_leistung", e.target.value)}
                className="input-field" placeholder="Was wurde erbracht?" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-sm">Unmittelbare Auswirkung</label>
              <textarea value={form.unmittelbare_auswirkung_json} onChange={(e) => set("unmittelbare_auswirkung_json", e.target.value)}
                className="input-field min-h-[60px] resize-none"
                placeholder="Direkte Folge der Störung (Stillstand, Wartezeit, Mehrarbeit…)" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-sm">Mittelbare Auswirkung</label>
              <textarea value={form.mittelbare_auswirkung} onChange={(e) => set("mittelbare_auswirkung", e.target.value)}
                className="input-field min-h-[60px] resize-none"
                placeholder="Folgeauswirkungen (Terminverzug, Mehrkosten…)" />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { if (form.ereignis.trim()) createMutation.mutate(); else toast.error("Ereignis erforderlich"); }}
              disabled={createMutation.isPending}
              className="bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-800 disabled:opacity-60"
            >
              {createMutation.isPending ? "Wird gespeichert…" : "Speichern"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {kausalitaeten.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Noch keine Kausalitätserfassung</p>
      ) : (
        <div className="space-y-2">
          {kausalitaeten.map((k, i) => (
            <div key={k.id} className="border border-gray-200 rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-700 text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{k.ereignis}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {k.verantwortungsbereich && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {VERANTWORTUNG_LABELS[k.verantwortungsbereich] ?? k.verantwortungsbereich}
                    </span>
                  )}
                  {!readonly && (
                    <button
                      onClick={() => { if (confirm("Eintrag löschen?")) deleteMutation.mutate(k.id); }}
                      className="p-1 rounded hover:bg-red-50 text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {(k.geplante_leistung || k.tatsaechliche_leistung) && (
                <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="truncate">{k.geplante_leistung ?? "—"}</span>
                  <ChevronRight className="w-3 h-3 shrink-0 text-gray-400" />
                  <span className="truncate text-red-600">{k.tatsaechliche_leistung ?? "—"}</span>
                </div>
              )}

              {k.unmittelbare_auswirkung_json && (
                <p className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Unmittelbar: </span>
                  {k.unmittelbare_auswirkung_json}
                </p>
              )}
              {k.mittelbare_auswirkung && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Mittelbar: </span>
                  {k.mittelbare_auswirkung}
                </p>
              )}
              {k.bewertung && (
                <p className="text-xs text-gray-400 italic">{k.bewertung}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
