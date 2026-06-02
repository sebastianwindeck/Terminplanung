import { useEffect, useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { bautagesberichteApi } from "@/api/client";
import { stoerungsApi } from "@/api/stoerungen";
import type { StoerungListItem } from "@/types/stoerung";
import { useAuth } from "@/contexts/AuthContext";
import type { Bautagesbericht } from "@/types";

type FormState = Omit<Bautagesbericht, "id" | "project_id" | "freigabestatus" | "created_at" | "updated_at">;

const WETTER_OPTIONEN = [
  { value: "sonnig", label: "Sonnig ☀️" },
  { value: "bewoelkt", label: "Bewölkt ⛅" },
  { value: "bedeckt", label: "Bedeckt ☁️" },
  { value: "regen", label: "Regen 🌧️" },
  { value: "schnee", label: "Schnee ❄️" },
  { value: "nebel", label: "Nebel 🌫️" },
  { value: "gewitter", label: "Gewitter ⛈️" },
];

const EINHEITEN = ["m²", "m", "Stk.", "t", "m³", "%", "h", "lfm"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyReportEditorPage() {
  const { projectId, berichtId } = useParams<{ projectId: string; berichtId: string }>();
  const pid = Number(projectId);
  const isEdit = berichtId !== "neu" && berichtId !== undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>({
    datum: today(),
    wetter: null, temperatur_min: null, temperatur_max: null,
    wind: null, niederschlag: null,
    personalanzahl: null,
    arbeitszeit_von: "07:00", arbeitszeit_bis: "16:00",
    geplanter_vorgang_id: null, ausgefuehrter_vorgang_id: null,
    soll_menge: null, soll_einheit: null,
    ist_menge: null, ist_einheit: null,
    abweichung_kommentar: null,
    stoerung_vorhanden: false, stoerung_id: null,
    anordnung_vorhanden: false, anordnung_beschreibung: null,
    allgemeine_bemerkungen: null,
    created_by: user?.full_name ?? user?.email ?? null,
  });

  const { data: existing } = useQuery({
    queryKey: ["bautagesbericht", berichtId],
    queryFn: () => bautagesberichteApi.get(Number(berichtId)),
    enabled: isEdit,
  });

  const { data: stoerungen = [] } = useQuery<StoerungListItem[]>({
    queryKey: ["stoerungen-list", pid],
    queryFn: () => stoerungsApi.list(pid),
    enabled: !!pid,
  });

  useEffect(() => {
    if (existing) {
      const { id, project_id, freigabestatus, created_at, updated_at, ...rest } = existing;
      void id; void project_id; void freigabestatus; void created_at; void updated_at;
      setForm(rest as FormState);
    }
  }, [existing]);

  const set = (field: keyof FormState, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: () => bautagesberichteApi.create({ ...form, project_id: pid }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["bautagesberichte", pid] });
      toast.success("Bericht erstellt");
      navigate(`/projects/${pid}/bautagesberichte/${data.id}`);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const updateMutation = useMutation({
    mutationFn: () => bautagesberichteApi.update(Number(berichtId), form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bautagesberichte", pid] });
      qc.invalidateQueries({ queryKey: ["bautagesbericht", berichtId] });
      toast.success("Gespeichert");
      navigate(`/projects/${pid}/bautagesberichte/${berichtId}`);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isEdit) updateMutation.mutate();
    else createMutation.mutate();
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? "Bericht bearbeiten" : "Neuer Bautagesbericht"}
        </h2>
      </div>

      {/* Datum */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm">Datum & Arbeitszeit</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-sm">Datum *</label>
            <input type="date" required value={form.datum} onChange={(e) => set("datum", e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="label-sm">Arbeitsbeginn</label>
            <input type="time" value={form.arbeitszeit_von ?? ""} onChange={(e) => set("arbeitszeit_von", e.target.value || null)}
              className="input-field" />
          </div>
          <div>
            <label className="label-sm">Arbeitsende</label>
            <input type="time" value={form.arbeitszeit_bis ?? ""} onChange={(e) => set("arbeitszeit_bis", e.target.value || null)}
              className="input-field" />
          </div>
        </div>
      </section>

      {/* Wetter */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm">Wetter & Witterung</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="label-sm">Wetterlage</label>
            <select value={form.wetter ?? ""} onChange={(e) => set("wetter", e.target.value || null)} className="input-field">
              <option value="">— keine Angabe —</option>
              {WETTER_OPTIONEN.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Temp. min (°C)</label>
            <input type="number" step="0.5" value={form.temperatur_min ?? ""} onChange={(e) => set("temperatur_min", e.target.value ? Number(e.target.value) : null)}
              className="input-field" placeholder="z.B. 5" />
          </div>
          <div>
            <label className="label-sm">Temp. max (°C)</label>
            <input type="number" step="0.5" value={form.temperatur_max ?? ""} onChange={(e) => set("temperatur_max", e.target.value ? Number(e.target.value) : null)}
              className="input-field" placeholder="z.B. 18" />
          </div>
          <div>
            <label className="label-sm">Wind</label>
            <input type="text" value={form.wind ?? ""} onChange={(e) => set("wind", e.target.value || null)}
              className="input-field" placeholder="z.B. leichter Wind" />
          </div>
          <div>
            <label className="label-sm">Niederschlag</label>
            <input type="text" value={form.niederschlag ?? ""} onChange={(e) => set("niederschlag", e.target.value || null)}
              className="input-field" placeholder="z.B. 2 mm" />
          </div>
        </div>
      </section>

      {/* Personal */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm">Personal & Leistung</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="label-sm">Personalanzahl</label>
            <input type="number" min={0} value={form.personalanzahl ?? ""} onChange={(e) => set("personalanzahl", e.target.value ? Number(e.target.value) : null)}
              className="input-field" placeholder="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="label-sm">Soll-Menge</label>
            <input type="number" step="0.1" value={form.soll_menge ?? ""} onChange={(e) => set("soll_menge", e.target.value ? Number(e.target.value) : null)}
              className="input-field" />
          </div>
          <div>
            <label className="label-sm">Soll-Einheit</label>
            <select value={form.soll_einheit ?? ""} onChange={(e) => set("soll_einheit", e.target.value || null)} className="input-field">
              <option value="">—</option>
              {EINHEITEN.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label-sm">Ist-Menge</label>
            <input type="number" step="0.1" value={form.ist_menge ?? ""} onChange={(e) => set("ist_menge", e.target.value ? Number(e.target.value) : null)}
              className="input-field" />
          </div>
          <div>
            <label className="label-sm">Ist-Einheit</label>
            <select value={form.ist_einheit ?? ""} onChange={(e) => set("ist_einheit", e.target.value || null)} className="input-field">
              <option value="">—</option>
              {EINHEITEN.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="label-sm">Abweichungskommentar</label>
            <textarea value={form.abweichung_kommentar ?? ""} onChange={(e) => set("abweichung_kommentar", e.target.value || null)}
              className="input-field min-h-[60px] resize-y" placeholder="Begründung der Soll-Ist-Abweichung…" />
          </div>
        </div>
      </section>

      {/* Störung */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm">Störung & Anordnung</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.stoerung_vorhanden} onChange={(e) => set("stoerung_vorhanden", e.target.checked)}
            className="rounded" />
          <span className="text-sm text-gray-700">Störung vorhanden</span>
        </label>
        {form.stoerung_vorhanden && (
          <div>
            <label className="label-sm">Verknüpfte Störung</label>
            <select value={form.stoerung_id ?? ""} onChange={(e) => set("stoerung_id", e.target.value ? Number(e.target.value) : null)}
              className="input-field">
              <option value="">— keine Verknüpfung —</option>
              {stoerungen.map((s) => (
                <option key={s.id} value={s.id}>{s.stoerung_number} – {s.titel}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.anordnung_vorhanden} onChange={(e) => set("anordnung_vorhanden", e.target.checked)}
            className="rounded" />
          <span className="text-sm text-gray-700">Anordnung durch AG erhalten</span>
        </label>
        {form.anordnung_vorhanden && (
          <div>
            <label className="label-sm">Anordnung Beschreibung</label>
            <textarea value={form.anordnung_beschreibung ?? ""} onChange={(e) => set("anordnung_beschreibung", e.target.value || null)}
              className="input-field min-h-[60px] resize-y" />
          </div>
        )}
      </section>

      {/* Bemerkungen */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm">Allgemeine Bemerkungen</h3>
        <textarea value={form.allgemeine_bemerkungen ?? ""} onChange={(e) => set("allgemeine_bemerkungen", e.target.value || null)}
          className="input-field min-h-[100px] resize-y w-full" placeholder="Weitere Bemerkungen zum Tagesverlauf…" />
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="flex items-center gap-2 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60 transition-colors">
          <Save className="w-4 h-4" />
          {isPending ? "Wird gespeichert…" : "Speichern"}
        </button>
        <button type="button" onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          Abbrechen
        </button>
      </div>
    </form>
  );
}
