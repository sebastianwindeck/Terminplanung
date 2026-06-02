import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, RotateCcw, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { usersApi } from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRecord, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  main_admin: "Hauptadmin",
  company_admin: "Firmenadmin",
  company_user: "Benutzer",
};

const ROLE_COLORS: Record<UserRole, string> = {
  main_admin: "bg-purple-100 text-purple-800",
  company_admin: "bg-blue-100 text-blue-800",
  company_user: "bg-gray-100 text-gray-700",
};

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

const EMPTY_FORM: UserFormData = { email: "", password: "", full_name: "", role: "company_user" };

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [resetUser, setResetUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
  const [newPassword, setNewPassword] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: usersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setShowForm(false); setForm(EMPTY_FORM); toast.success("Benutzer erstellt"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setEditUser(null); toast.success("Gespeichert"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("Benutzer gelöscht"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, pw }: { id: number; pw: string }) => usersApi.resetPassword(id, pw),
    onSuccess: () => { setResetUser(null); setNewPassword(""); toast.success("Passwort zurückgesetzt"); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Fehler"),
  });

  function handleCreate() {
    if (form.password.length < 8) { toast.error("Passwort min. 8 Zeichen"); return; }
    createMutation.mutate(form);
  }

  const availableRoles: UserRole[] = currentUser?.role === "main_admin"
    ? ["company_admin", "company_user"]
    : ["company_user"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-primary-700" />
          <h1 className="text-xl font-bold text-gray-900">Benutzerverwaltung</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 bg-primary-700 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Benutzer anlegen
        </button>
      </div>

      {/* Neuer Benutzer */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 shadow-sm">
          <h2 className="font-medium text-gray-900">Neuer Benutzer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Name (optional)" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input placeholder="E-Mail *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input placeholder="Passwort (min. 8 Zeichen) *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              {availableRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
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

      {/* Benutzerliste */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Lade…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name / E-Mail</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editUser?.id === u.id ? (
                      <input
                        value={editUser.full_name ?? ""}
                        onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
                      />
                    ) : (
                      <div>
                        <div className="font-medium text-gray-900">{u.full_name || "—"}</div>
                        <div className="text-gray-500 text-xs">{u.email}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      {u.is_active ? "Aktiv" : "Deaktiviert"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editUser?.id === u.id ? (
                        <>
                          <button onClick={() => updateMutation.mutate({ id: u.id, data: { full_name: editUser.full_name ?? undefined, is_active: editUser.is_active } })}
                            className="text-xs bg-primary-700 text-white px-2 py-1 rounded hover:bg-primary-800">Speichern</button>
                          <button onClick={() => setEditUser(null)} className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600">Abbruch</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditUser(u)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Bearbeiten">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setResetUser(u); setNewPassword(""); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Passwort zurücksetzen">
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUser?.id && (
                            <button onClick={() => { if (confirm(`${u.email} wirklich löschen?`)) deleteMutation.mutate(u.id); }}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Löschen">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Passwort-Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Passwort zurücksetzen</h2>
            <p className="text-sm text-gray-500">{resetUser.email}</p>
            <input type="password" placeholder="Neues Passwort (min. 8 Zeichen)" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <div className="flex gap-2">
              <button onClick={() => resetMutation.mutate({ id: resetUser.id, pw: newPassword })}
                disabled={newPassword.length < 8 || resetMutation.isPending}
                className="flex-1 bg-primary-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-800 disabled:opacity-60">
                {resetMutation.isPending ? "Wird gesetzt…" : "Zurücksetzen"}
              </button>
              <button onClick={() => setResetUser(null)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Abbruch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
