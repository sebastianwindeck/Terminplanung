import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { stoerungsApi } from "@/api/stoerungen";
import type { DropdownItem } from "@/types/stoerung";

function SelectField({ label, name, value, onChange, options, required }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  options: DropdownItem[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">– wählen –</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextField({ label, name, value, onChange, required, multiline }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  required?: boolean; multiline?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      )}
    </div>
  );
}

export default function DisruptionEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const projectId = Number(searchParams.get("project_id"));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: dropdowns } = useQuery({
    queryKey: ["stoerung-dropdowns"],
    queryFn: stoerungsApi.dropdowns,
  });

  const { data: existing } = useQuery({
    queryKey: ["stoerung", Number(id)],
    queryFn: () => stoerungsApi.get(Number(id)),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    titel: "",
    stoerungsart: "",
    kritikalitaet: "",
    verantwortungsbereich: "",
    verursacher: "",
    betroffener_bereich: "",
    stoerungsbeginn: "",
    stoerungsende: "",
    beschreibung: "",
    hindernde_wirkung: "",
    sofortmassnahme: "",
    erforderliche_mitwirkung_ag: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        titel: existing.titel ?? "",
        stoerungsart: existing.stoerungsart ?? "",
        kritikalitaet: existing.kritikalitaet ?? "",
        verantwortungsbereich: existing.verantwortungsbereich ?? "",
        verursacher: existing.verursacher ?? "",
        betroffener_bereich: existing.betroffener_bereich ?? "",
        stoerungsbeginn: existing.stoerungsbeginn?.slice(0, 16) ?? "",
        stoerungsende: existing.stoerungsende?.slice(0, 16) ?? "",
        beschreibung: existing.beschreibung ?? "",
        hindernde_wirkung: existing.hindernde_wirkung ?? "",
        sofortmassnahme: existing.sofortmassnahme ?? "",
        erforderliche_mitwirkung_ag: existing.erforderliche_mitwirkung_ag ?? "",
      });
    }
  }, [existing]);

  const set = (field: string) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: () => stoerungsApi.create({ project_id: projectId, ...form }),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ["stoerungen", projectId] });
      navigate(`/stoerungen/${s.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => stoerungsApi.update(Number(id), form),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ["stoerung", s.id] });
      navigate(`/stoerungen/${s.id}`);
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titel.trim()) return;
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        {isEdit ? "Störung bearbeiten" : "Neue Störung erfassen"}
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          Fehler: {String(error)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <TextField label="Titel" name="titel" value={form.titel} onChange={set("titel")} required />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Störungsart" name="stoerungsart" value={form.stoerungsart}
            onChange={set("stoerungsart")} options={dropdowns?.stoerungsarten ?? []} />
          <SelectField label="Kritikalität" name="kritikalitaet" value={form.kritikalitaet}
            onChange={set("kritikalitaet")} options={dropdowns?.kritikalitaet ?? []} />
          <SelectField label="Verantwortungsbereich" name="verantwortungsbereich"
            value={form.verantwortungsbereich} onChange={set("verantwortungsbereich")}
            options={dropdowns?.verantwortungsbereiche ?? []} />
          <TextField label="Verursacher" name="verursacher" value={form.verursacher} onChange={set("verursacher")} />
        </div>

        <TextField label="Betroffener Bereich" name="betroffener_bereich"
          value={form.betroffener_bereich} onChange={set("betroffener_bereich")} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Störungsbeginn</label>
            <input type="datetime-local" value={form.stoerungsbeginn}
              onChange={(e) => set("stoerungsbeginn")(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Störungsende</label>
            <input type="datetime-local" value={form.stoerungsende}
              onChange={(e) => set("stoerungsende")(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <TextField label="Beschreibung" name="beschreibung" value={form.beschreibung}
          onChange={set("beschreibung")} multiline />
        <TextField label="Hindernde Wirkung" name="hindernde_wirkung" value={form.hindernde_wirkung}
          onChange={set("hindernde_wirkung")} multiline />
        <TextField label="Sofortmaßnahme" name="sofortmassnahme" value={form.sofortmassnahme}
          onChange={set("sofortmassnahme")} multiline />
        <TextField label="Erforderliche Mitwirkung Auftraggeber" name="erforderliche_mitwirkung_ag"
          value={form.erforderliche_mitwirkung_ag} onChange={set("erforderliche_mitwirkung_ag")} multiline />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || !form.titel.trim()}
            className="px-5 py-2 bg-primary-700 text-white rounded-md text-sm font-medium hover:bg-primary-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Speichern…" : isEdit ? "Änderungen speichern" : "Störung anlegen"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
