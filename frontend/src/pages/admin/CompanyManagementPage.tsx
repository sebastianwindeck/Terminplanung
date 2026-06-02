import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Users } from "lucide-react";
import toast from "react-hot-toast";
import { companiesApi } from "@/api/auth";
import type { Company } from "@/types";

interface CreateForm {
  name: string;
  primary_color: string;
  admin_email: string;
  admin_password: string;
  admin_full_name: string;
}

const EMPTY_FORM: CreateForm = {
  name: "", primary_color: "#1e40af",
  admin_email: "", admin_password: "", admin_full_name: "",
};

export default function CompanyManagementPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: companiesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setShowForm(false); setForm(EMPTY_FORM); toast.success("Unternehmen erstellt"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof companiesApi.update>[1] }) =>
      companiesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setEditCompany(null); toast.success("Gespeichert"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const deleteMutation = useMutation({
    mutationFn: companiesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast.success("Unternehmen gelöscht"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  function handleCreate() {
    if (!form.name.trim()) { toast.error("Name erforderlich"); return; }
    if (form.admin_password.length < 8) { toast.error("Admin-Passwort min. 8 Zeichen"); return; }
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary-700" />
          <h1 className="text-xl font-bold text-gray-900">Unternehmensverwaltung</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Unternehmen anlegen
        </button>
      </div>

      {/* Neues Unternehmen */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-medium text-gray-900">Neues Unternehmen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Unternehmensname *</label>
              <input placeholder="Musterbau GmbH" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Primärfarbe</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="h-9 w-14 border border-gray-300 rounded cursor-pointer" />
                <input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-3">Administrator-Account</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input placeholder="Name Admin (optional)" value={form.admin_full_name} onChange={(e) => setForm({ ...form, admin_full_name: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input placeholder="E-Mail Admin *" type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input placeholder="Passwort Admin (min. 8 Zeichen) *" type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createMutation.isPending}
              className="bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
              {createMutation.isPending ? "Wird erstellt…" : "Erstellen"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Unternehmenliste */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Lade…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
              {editCompany?.id === c.id ? (
                <div className="space-y-2">
                  <input value={editCompany.name} onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <div className="flex items-center gap-2">
                    <input type="color" value={editCompany.primary_color ?? "#1e40af"}
                      onChange={(e) => setEditCompany({ ...editCompany, primary_color: e.target.value })}
                      className="h-8 w-12 border border-gray-300 rounded cursor-pointer" />
                    <span className="text-xs text-gray-500">Primärfarbe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id={`active-${c.id}`} checked={editCompany.is_active}
                      onChange={(e) => setEditCompany({ ...editCompany, is_active: e.target.checked })} />
                    <label htmlFor={`active-${c.id}`} className="text-sm text-gray-700">Aktiv</label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate({ id: c.id, data: { name: editCompany.name, primary_color: editCompany.primary_color ?? undefined, is_active: editCompany.is_active } })}
                      className="text-xs bg-primary-700 text-white px-3 py-1.5 rounded hover:bg-primary-800">Speichern</button>
                    <button onClick={() => setEditCompany(null)} className="text-xs px-3 py-1.5 rounded hover:bg-gray-100 text-gray-600">Abbruch</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.primary_color ?? "#1e40af" }} />
                      <span className="font-semibold text-gray-900">{c.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {c.is_active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    {c.user_count} {c.user_count === 1 ? "Benutzer" : "Benutzer"}
                  </div>

                  <p className="text-xs text-gray-400 font-mono">{c.slug}</p>

                  <div className="flex gap-1 pt-1">
                    <button onClick={() => setEditCompany(c)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                      <Pencil className="w-3.5 h-3.5" /> Bearbeiten
                    </button>
                    <button
                      onClick={() => { if (confirm(`"${c.name}" und alle Daten wirklich löschen?`)) deleteMutation.mutate(c.id); }}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Löschen
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {companies.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-gray-400">
              Noch keine Unternehmen angelegt
            </div>
          )}
        </div>
      )}
    </div>
  );
}
