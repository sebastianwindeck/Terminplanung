import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Copy, Trash2, GitBranch, Star, ChevronRight, Pencil } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { projectsApi, versionsApi } from "@/api/client";
import Modal from "@/components/Modal";
import ChronologyTimeline from "@/components/timeline/ChronologyTimeline";
import EmailEventList from "@/components/emails/EmailEventList";
import SequentialComparisonView from "@/components/comparison/SequentialComparisonView";
import type { ScheduleVersion } from "@/types";
import { SHIFT_REASONS } from "@/types";

type ProjectTab = "versions" | "emails" | "compare";

type FormState = { name: string; description: string; is_baseline: boolean; shift_reason: string; shift_description: string };

function VersionShiftFields({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
  return (
    <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
      <div>
        <label className="label">Grund der Verschiebung</label>
        <select
          className="input"
          value={form.shift_reason}
          onChange={(e) => setForm((f) => ({ ...f, shift_reason: e.target.value }))}
        >
          <option value="">— Kein Grund angegeben —</option>
          {SHIFT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {form.shift_reason && (
        <div>
          <label className="label">Beschreibung zum Grund</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Detaillierte Beschreibung der Verschiebungsursache…"
            value={form.shift_description}
            onChange={(e) => setForm((f) => ({ ...f, shift_description: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProjectTab>("versions");
  const [showCreate, setShowCreate] = useState(false);
  const [editVersion, setEditVersion] = useState<ScheduleVersion | null>(null);
  const [cloneFrom, setCloneFrom] = useState<number | "">("");
  const [form, setForm] = useState({ name: "", description: "", is_baseline: false, shift_reason: "", shift_description: "" });

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id),
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["versions", id],
    queryFn: () => versionsApi.listForProject(id),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => versionsApi.create({ ...data, project_id: id }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["versions", id] });
      toast.success("Version erstellt");
      setShowCreate(false);
      setForm({ name: "", description: "", is_baseline: false, shift_reason: "", shift_description: "" });
      setCloneFrom("");
      navigate(`/projects/${id}/versions/${v.id}`);
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const deleteMutation = useMutation({
    mutationFn: versionsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions", id] });
      toast.success("Version gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ vid, data }: { vid: number; data: Partial<ScheduleVersion> }) =>
      versionsApi.update(vid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["versions", id] });
      toast.success("Version aktualisiert");
      setEditVersion(null);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, clone_from_version_id: cloneFrom || undefined });
  };

  const openEdit = (v: ScheduleVersion) => {
    setEditVersion(v);
    setForm({
      name: v.name,
      description: v.description ?? "",
      is_baseline: v.is_baseline,
      shift_reason: v.shift_reason ?? "",
      shift_description: v.shift_description ?? "",
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVersion) return;
    updateMutation.mutate({
      vid: editVersion.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        is_baseline: form.is_baseline,
        shift_reason: form.shift_reason || undefined,
        shift_description: form.shift_description || undefined,
      },
    });
  };

  if (!project && !isLoading) return <div className="text-center text-gray-400 py-16">Projekt nicht gefunden</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/")} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
          {project?.project_number && <p className="text-sm text-gray-500">{project.project_number}</p>}
        </div>
        <button className="btn-primary ml-auto" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Neue Version
        </button>
      </div>

      {project?.description && (
        <p className="text-sm text-gray-600 bg-white rounded-lg border border-gray-200 px-4 py-3">{project.description}</p>
      )}

      {/* Chronology timeline */}
      <div className="card p-4">
        <ChronologyTimeline projectId={id} versions={versions} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {(["versions", "emails", "compare"] as ProjectTab[]).map((tab) => {
          const labels: Record<ProjectTab, string> = { versions: "Versionen", emails: "E-Mails", compare: "Vergleich" };
          return (
            <button
              key={tab}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "emails" && (
        <EmailEventList projectId={id} versions={versions} />
      )}

      {activeTab === "compare" && (
        <SequentialComparisonView projectId={id} versions={versions} />
      )}

      {activeTab === "versions" && (
        isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Lade Versionen…</div>
      ) : versions.length === 0 ? (
        <div className="card p-16 text-center">
          <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Keine Versionen</h2>
          <p className="text-gray-400 text-sm mb-6">Erstellen Sie die erste Terminplanversion.</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Erste Version erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {versions.map((v: ScheduleVersion) => (
            <div
              key={v.id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer group relative"
              onClick={() => navigate(`/projects/${id}/versions/${v.id}`)}
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                  className="btn-ghost p-1.5 rounded"
                  title="Bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCloneFrom(v.id);
                    setForm({ name: `${v.name} (Kopie)`, description: "", is_baseline: false, shift_reason: "", shift_description: "" });
                    setShowCreate(true);
                  }}
                  className="btn-ghost p-1.5 rounded"
                  title="Klonen"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Version "${v.name}" löschen?`)) deleteMutation.mutate(v.id);
                  }}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-indigo-600 text-sm">V{v.version_number}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 pr-16">
                    <h3 className="font-semibold text-gray-900 truncate">{v.name}</h3>
                    {v.is_baseline && (
                      <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        <Star className="w-2.5 h-2.5" /> Basis
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {v.shift_reason && (
                <span className="inline-block mb-2 text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                  {SHIFT_REASONS.find((r) => r.value === v.shift_reason)?.label ?? v.shift_reason}
                </span>
              )}

              {v.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{v.description}</p>}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                <span>{v.position_count} Position{v.position_count !== 1 ? "en" : ""}</span>
                <div className="flex items-center gap-1">
                  <span>{format(new Date(v.created_at), "dd.MM.yyyy", { locale: de })}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setCloneFrom(""); }} title="Neue Version">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Versionsname *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="z.B. Soll-Planung V1" />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Klonen von Version (optional)</label>
            <select className="input" value={cloneFrom} onChange={(e) => setCloneFrom(Number(e.target.value) || "")}>
              <option value="">— Neue leere Version —</option>
              {versions.map((v: ScheduleVersion) => (
                <option key={v.id} value={v.id}>V{v.version_number} – {v.name}</option>
              ))}
            </select>
          </div>
          <VersionShiftFields form={form} setForm={setForm} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_baseline" checked={form.is_baseline} onChange={(e) => setForm((f) => ({ ...f, is_baseline: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="is_baseline" className="text-sm font-medium text-gray-700">Als Baseline markieren</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowCreate(false); setCloneFrom(""); }}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Erstellt…" : "Erstellen"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={editVersion !== null} onClose={() => setEditVersion(null)} title={`Version bearbeiten: ${editVersion?.name ?? ""}`}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="label">Versionsname *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <VersionShiftFields form={form} setForm={setForm} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit_baseline" checked={form.is_baseline} onChange={(e) => setForm((f) => ({ ...f, is_baseline: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="edit_baseline" className="text-sm font-medium text-gray-700">Als Baseline markieren</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setEditVersion(null)}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
