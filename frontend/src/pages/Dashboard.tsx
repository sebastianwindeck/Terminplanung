import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, FolderOpen, Trash2, Pencil, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { projectsApi } from "@/api/client";
import Modal from "@/components/Modal";
import type { Project } from "@/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", project_number: "" });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt erstellt");
      setShowCreate(false);
      setForm({ name: "", description: "", project_number: "" });
    },
    onError: () => toast.error("Fehler beim Erstellen"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => projectsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt aktualisiert");
      setEditProject(null);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    updateMutation.mutate({ id: editProject.id, data: form });
  };

  const openEdit = (p: Project) => {
    setForm({ name: p.name, description: p.description || "", project_number: p.project_number || "" });
    setEditProject(p);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Lade Projekte…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projekte</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} Projekt{projects.length !== 1 ? "e" : ""}</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm({ name: "", description: "", project_number: "" }); setShowCreate(true); }}>
          <Plus className="w-4 h-4" /> Neues Projekt
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Noch keine Projekte</h2>
          <p className="text-gray-400 text-sm mb-6">Erstellen Sie Ihr erstes Terminplanungsprojekt.</p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Erstes Projekt erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer group relative"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                  className="btn-ghost p-1.5 rounded"
                  title="Bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Projekt "${project.name}" löschen?`)) deleteMutation.mutate(project.id);
                  }}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Löschen"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate pr-16">{project.name}</h3>
                  {project.project_number && (
                    <p className="text-xs text-gray-500">{project.project_number}</p>
                  )}
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-3 border-t border-gray-100">
                <span>{project.version_count} Version{project.version_count !== 1 ? "en" : ""}</span>
                <div className="flex items-center gap-1">
                  <span>{format(new Date(project.created_at), "dd.MM.yyyy", { locale: de })}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate || !!editProject} onClose={() => { setShowCreate(false); setEditProject(null); }} title={editProject ? "Projekt bearbeiten" : "Neues Projekt"}>
        <form onSubmit={editProject ? handleUpdate : handleCreate} className="space-y-4">
          <div>
            <label className="label">Projektname *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Mein Bauprojekt" />
          </div>
          <div>
            <label className="label">Projektnummer</label>
            <input className="input" value={form.project_number} onChange={(e) => setForm((f) => ({ ...f, project_number: e.target.value }))} placeholder="2024-001" />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => { setShowCreate(false); setEditProject(null); }}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Speichert…" : editProject ? "Speichern" : "Erstellen"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
