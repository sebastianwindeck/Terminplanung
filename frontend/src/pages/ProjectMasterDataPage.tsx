import { useState, type FormEvent, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { projectsApi } from "@/api/client";
import type { Project } from "@/types";

interface Props {
  projectId: number;
}

type MasterData = Pick<Project,
  "client_name" | "client_address" | "construction_site_address" |
  "contract_number" | "contract_date" | "trade" |
  "construction_lead" | "site_manager" | "vob_b_agreed"
>;

const EMPTY: MasterData = {
  client_name: null, client_address: null, construction_site_address: null,
  contract_number: null, contract_date: null, trade: "Fassadenbau",
  construction_lead: null, site_manager: null, vob_b_agreed: null,
};

export default function ProjectMasterDataPage({ projectId }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<MasterData>(EMPTY);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  useEffect(() => {
    if (project) {
      setForm({
        client_name: project.client_name ?? null,
        client_address: project.client_address ?? null,
        construction_site_address: project.construction_site_address ?? null,
        contract_number: project.contract_number ?? null,
        contract_date: project.contract_date ?? null,
        trade: project.trade ?? "Fassadenbau",
        construction_lead: project.construction_lead ?? null,
        site_manager: project.site_manager ?? null,
        vob_b_agreed: project.vob_b_agreed ?? null,
      });
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: (data: Partial<MasterData>) => projectsApi.updateMasterData(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Stammdaten gespeichert");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  function set(field: keyof MasterData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary-700" />
        <h3 className="font-semibold text-gray-900">Projektstammdaten</h3>
      </div>

      {/* Auftraggeber */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Auftraggeber</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label-sm">Name Auftraggeber</label>
            <input value={form.client_name ?? ""} onChange={(e) => set("client_name", e.target.value || null)}
              className="input-field" placeholder="Musterbau GmbH" />
          </div>
          <div className="sm:col-span-2">
            <label className="label-sm">Adresse Auftraggeber</label>
            <textarea value={form.client_address ?? ""} onChange={(e) => set("client_address", e.target.value || null)}
              className="input-field resize-none min-h-[70px]" placeholder="Musterstraße 1, 12345 Musterstadt" />
          </div>
        </div>
      </section>

      {/* Baustelle */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Baustelle & Vertrag</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label-sm">Baustellenadresse</label>
            <textarea value={form.construction_site_address ?? ""} onChange={(e) => set("construction_site_address", e.target.value || null)}
              className="input-field resize-none min-h-[70px]" />
          </div>
          <div>
            <label className="label-sm">Vertragsnummer</label>
            <input value={form.contract_number ?? ""} onChange={(e) => set("contract_number", e.target.value || null)}
              className="input-field" placeholder="V-2025-001" />
          </div>
          <div>
            <label className="label-sm">Vertragsdatum</label>
            <input type="date" value={form.contract_date ?? ""} onChange={(e) => set("contract_date", e.target.value || null)}
              className="input-field" />
          </div>
          <div>
            <label className="label-sm">Gewerk</label>
            <input value={form.trade ?? ""} onChange={(e) => set("trade", e.target.value || null)}
              className="input-field" placeholder="Fassadenbau" />
          </div>
          <div className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox"
              id="vob_b"
              checked={form.vob_b_agreed === true}
              onChange={(e) => set("vob_b_agreed", e.target.checked ? true : null)}
              className="rounded" />
            <label htmlFor="vob_b" className="text-sm text-gray-700">VOB/B vereinbart</label>
          </div>
        </div>
      </section>

      {/* Beteiligte */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Beteiligte</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label-sm">Bauleitung AG</label>
            <input value={form.construction_lead ?? ""} onChange={(e) => set("construction_lead", e.target.value || null)}
              className="input-field" placeholder="Max Mustermann" />
          </div>
          <div>
            <label className="label-sm">Eigene Bauleitung / Projektleiter</label>
            <input value={form.site_manager ?? ""} onChange={(e) => set("site_manager", e.target.value || null)}
              className="input-field" placeholder="Hans Müller" />
          </div>
        </div>
      </section>

      <button type="submit" disabled={mutation.isPending}
        className="flex items-center gap-2 bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60 transition-colors">
        <Save className="w-4 h-4" />
        {mutation.isPending ? "Wird gespeichert…" : "Speichern"}
      </button>
    </form>
  );
}
