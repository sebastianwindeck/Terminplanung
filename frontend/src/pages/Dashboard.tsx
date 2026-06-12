import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus, FolderOpen, Trash2, Pencil, Calendar, ChevronRight,
  AlertTriangle, Clock, LayoutDashboard, Settings2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { projectsApi, dashboardApi } from "@/api/client";
import Modal from "@/components/Modal";
import type { Project } from "@/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/types";

const DAY_OPTIONS = [
  { value: 7,  label: "1 Woche" },
  { value: 14, label: "2 Wochen" },
  { value: 28, label: "4 Wochen" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({ name: "", description: "", project_number: "" });
  const [days, setDays] = useState<number>(() => {
    return Number(localStorage.getItem("dashboard_days") ?? 14);
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard", days],
    queryFn: () => dashboardApi.get(days),
    refetchInterval: 60_000,
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

  const handleChangeDays = (d: number) => {
    setDays(d);
    localStorage.setItem("dashboard_days", String(d));
  };

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

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Lade Dashboard…
        </div>
      </div>
    );
  }

  const stats = dashData?.stats;
  const upcoming = dashData?.upcoming_positions ?? [];
  const stoerungen = dashData?.open_stoerungen ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {DAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChangeDays(opt.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  days === opt.value
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            className="btn-primary"
            onClick={() => { setForm({ name: "", description: "", project_number: "" }); setShowCreate(true); }}
          >
            <Plus className="w-4 h-4" /> Neues Projekt
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Projekte" value={stats.project_count} icon="📁" color="blue" />
          <StatCard label={`Vorgänge (${DAY_OPTIONS.find(o => o.value === days)?.label})`} value={stats.upcoming_count} icon="📅" color="green" />
          <StatCard label="Offene Störungen" value={stats.open_stoerungen_count} icon="⚠️" color="orange" />
          <StatCard label="Aktive Behinderungen" value={stats.active_behinderungen} icon="🚧" color="red" />
        </div>
      )}

      {/* Two-column: upcoming + disruptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming positions */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" />
              <h2 className="font-semibold text-gray-800 text-sm">
                Anstehende Vorgänge
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  ({DAY_OPTIONS.find(o => o.value === days)?.label})
                </span>
              </h2>
            </div>
            <span className="text-xs text-gray-400">{upcoming.length} Einträge</span>
          </div>
          {dashLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Lädt…</div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Keine anstehenden Vorgänge in diesem Zeitraum.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {upcoming.map((pos) => (
                <div
                  key={`${pos.project_id}-${pos.position_id}`}
                  className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    pos.behinderung_aktiv ? "bg-red-50 hover:bg-red-100" : ""
                  }`}
                  onClick={() => navigate(`/projects/${pos.project_id}/versions/${pos.version_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {pos.behinderung_aktiv && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Behindert
                        </span>
                      )}
                      {pos.behinderung_tage_gesamt > 0 && !pos.behinderung_aktiv && (
                        <span className="text-xs text-orange-500">
                          +{pos.behinderung_tage_gesamt}T verzögert
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pos.pos_number && <span className="text-gray-400 mr-1">{pos.pos_number}</span>}
                      {pos.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{pos.project_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {pos.start_date
                        ? format(parseISO(pos.start_date), "dd.MM.", { locale: de })
                        : "–"}
                      {pos.end_date && (
                        <> – {format(parseISO(pos.end_date), "dd.MM.", { locale: de })}</>
                      )}
                    </div>
                    <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[pos.status as keyof typeof STATUS_COLORS] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[pos.status as keyof typeof STATUS_LABELS] ?? pos.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open disruptions */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Offene Störungen</h2>
            </div>
            <span className="text-xs text-gray-400">{stoerungen.length} offen</span>
          </div>
          {dashLoading ? (
            <div className="p-6 text-center text-sm text-gray-400">Lädt…</div>
          ) : stoerungen.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              Keine offenen Störungen.
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {stoerungen.map((s) => (
                <div
                  key={s.id}
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-red-50 transition-colors bg-red-25"
                  onClick={() => navigate(`/stoerungen/${s.id}`)}
                >
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.titel}</p>
                    <p className="text-xs text-gray-500">{s.project_name} · {s.stoerung_number}</p>
                    {s.stoerungsart && (
                      <p className="text-xs text-gray-400">{s.stoerungsart}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <StatusBadgeStoerung status={s.status} />
                    {s.kritikalitaet && (
                      <p className={`text-xs mt-1 font-semibold ${
                        s.kritikalitaet === "kritisch" ? "text-red-600" :
                        s.kritikalitaet === "hoch" ? "text-orange-500" : "text-gray-500"
                      }`}>{s.kritikalitaet}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700">
            Alle Projekte
            <span className="ml-1.5 text-sm font-normal text-gray-400">{projects.length}</span>
          </h2>
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

                {/* Disruptions indicator for this project */}
                {stoerungen.filter((s) => s.project_id === project.id).length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{stoerungen.filter((s) => s.project_id === project.id).length} offene Störung(en)</span>
                  </div>
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
      </div>

      <Modal
        open={showCreate || !!editProject}
        onClose={() => { setShowCreate(false); setEditProject(null); }}
        title={editProject ? "Projekt bearbeiten" : "Neues Projekt"}
      >
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

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color] ?? "bg-gray-50 text-gray-700"}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-0.5 opacity-75">{label}</div>
    </div>
  );
}

const STOERUNG_STATUS_COLORS: Record<string, string> = {
  entwurf:      "bg-gray-100 text-gray-600",
  erstanzeige:  "bg-blue-100 text-blue-700",
  in_pruefung:  "bg-yellow-100 text-yellow-700",
  anerkannt:    "bg-orange-100 text-orange-700",
  abgeschlossen: "bg-green-100 text-green-700",
};

function StatusBadgeStoerung({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded ${STOERUNG_STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}
