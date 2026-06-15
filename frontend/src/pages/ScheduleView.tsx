import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, Download, Plus, BarChart2, List, GitCompare, Pencil, Lock, Save, X } from "lucide-react";
import { ViewMode } from "gantt-task-react";
import { projectsApi, versionsApi, positionsApi, mspdiApi, downloadWithAuth } from "@/api/client";
import GanttChart from "@/components/GanttChart";
import PositionTable from "@/components/PositionTable";
import ImportDialog from "@/components/ImportDialog";
import ExcelImportAsVersionDialog from "@/components/ExcelImportAsVersionDialog";
import PositionEditModal from "@/components/PositionEditModal";
import CompareDialog from "@/components/CompareDialog";
import MSPDIImportDialog from "@/components/mspdi/MSPDIImportDialog";
import VorgangDetailModal from "@/components/VorgangDetailModal";
import VersionShiftFields from "@/components/VersionShiftFields";
import Modal from "@/components/Modal";
import { SHIFT_REASONS } from "@/types";
import type { SchedulePosition } from "@/types";

type Tab = "table" | "gantt";
type GanttView = "Day" | "Week" | "Month";

const GANTT_VIEWS: { label: string; value: GanttView }[] = [
  { label: "Tag", value: "Day" },
  { label: "Woche", value: "Week" },
  { label: "Monat", value: "Month" },
];

const GANTT_MODE_MAP: Record<GanttView, ViewMode> = {
  Day: ViewMode.Day,
  Week: ViewMode.Week,
  Month: ViewMode.Month,
};

type DraftChange = { start_date?: string; end_date?: string; duration_days?: number; progress?: number };
type SaveAsForm = { name: string; description: string; is_baseline: boolean; shift_reason: string; shift_description: string };

export default function ScheduleView() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>();
  const vid = Number(versionId);
  const pid = Number(projectId);
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("table");
  const [ganttView, setGanttView] = useState<GanttView>("Week");
  const [showImport, setShowImport] = useState(false);
  const [showMspdiImport, setShowMspdiImport] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showEditVersion, setShowEditVersion] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [shiftForm, setShiftForm] = useState({ shift_reason: "", shift_description: "" });
  const [selectedPosition, setSelectedPosition] = useState<SchedulePosition | null>(null);
  const [draftChanges, setDraftChanges] = useState<Record<number, DraftChange>>({});
  const [saveAsForm, setSaveAsForm] = useState<SaveAsForm>({
    name: "", description: "", is_baseline: false, shift_reason: "", shift_description: "",
  });

  const qc = useQueryClient();

  const { data: project } = useQuery({ queryKey: ["project", pid], queryFn: () => projectsApi.get(pid) });
  const { data: version } = useQuery({ queryKey: ["version", vid], queryFn: () => versionsApi.get(vid) });
  const { data: versions = [] } = useQuery({ queryKey: ["versions", pid], queryFn: () => versionsApi.listForProject(pid) });
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions", vid],
    queryFn: () => positionsApi.listForVersion(vid),
  });

  const displayPositions = useMemo<SchedulePosition[]>(() => {
    return positions.map((p) => {
      const ch = draftChanges[p.id];
      return ch ? { ...p, ...ch } : p;
    });
  }, [positions, draftChanges]);

  const draftCount = Object.keys(draftChanges).length;
  const hasDraft = draftCount > 0;

  const updateVersionMutation = useMutation({
    mutationFn: (data: { shift_reason?: string; shift_description?: string }) =>
      versionsApi.update(vid, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["version", vid] });
      toast.success("Version aktualisiert");
      setShowEditVersion(false);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const saveAsMutation = useMutation({
    mutationFn: () =>
      versionsApi.saveAs(vid, {
        name: saveAsForm.name,
        description: saveAsForm.description || undefined,
        is_baseline: saveAsForm.is_baseline,
        shift_reason: saveAsForm.shift_reason || undefined,
        shift_description: saveAsForm.shift_description || undefined,
        changes: Object.entries(draftChanges).map(([id, ch]) => ({ id: Number(id), ...ch })),
      }),
    onSuccess: (newVersion) => {
      setDraftChanges({});
      setShowSaveAs(false);
      setSaveAsForm({ name: "", description: "", is_baseline: false, shift_reason: "", shift_description: "" });
      qc.invalidateQueries({ queryKey: ["versions", pid] });
      toast.success("Neue Version erstellt");
      navigate(`/projects/${pid}/versions/${newVersion.id}`);
    },
    onError: () => toast.error("Fehler beim Speichern"),
  });

  const openShiftEdit = () => {
    setShiftForm({ shift_reason: version?.shift_reason ?? "", shift_description: version?.shift_description ?? "" });
    setShowEditVersion(true);
  };

  const handleGanttDateChange = (posId: number, startDate: string, endDate: string) => {
    setDraftChanges((prev) => ({ ...prev, [posId]: { ...prev[posId], start_date: startDate, end_date: endDate } }));
  };

  const handleGanttProgressChange = (posId: number, progress: number) => {
    setDraftChanges((prev) => ({ ...prev, [posId]: { ...prev[posId], progress } }));
  };

  const openSaveAs = () => {
    setSaveAsForm({
      name: `${version?.name ?? ""} – Angepasst`,
      description: "",
      is_baseline: false,
      shift_reason: "",
      shift_description: "",
    });
    setShowSaveAs(true);
  };

  const isBaseVersion = version?.version_number === 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(`/projects/${pid}`)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="truncate">{project?.name}</span>
            <span>/</span>
            <span className="font-medium text-gray-900 truncate">V{version?.version_number} – {version?.name}</span>
            {isBaseVersion && (
              <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <Lock className="w-2.5 h-2.5" /> Basisversion
              </span>
            )}
            {version?.is_baseline && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Basis</span>
            )}
            {version?.shift_reason && (
              <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full flex-shrink-0">
                {SHIFT_REASONS.find((r) => r.value === version.shift_reason)?.label ?? version.shift_reason}
              </span>
            )}
            <button onClick={openShiftEdit} className="btn-ghost p-1 rounded" title="Verschiebungsgrund bearbeiten">
              <Pencil className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{positions.length} Positionen{isBaseVersion ? " · Nur-Lesen" : ""}</p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {versions.length > 1 && (
            <button className="btn-secondary" onClick={() => setShowCompare(true)}>
              <GitCompare className="w-4 h-4" /> Vergleichen
            </button>
          )}
          <button className="btn-secondary" onClick={() => setShowMspdiImport(true)}>
            <Upload className="w-4 h-4" /> MS Project importieren
          </button>
          <button className="btn-secondary" onClick={() => setShowExcelImport(true)}>
            <Upload className="w-4 h-4" /> Excel importieren
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadWithAuth(mspdiApi.exportUrl(vid), `Terminplan_V${version?.version_number}.xml`)}
          >
            <Download className="w-4 h-4" /> MS Project
          </button>
          <button
            className="btn-secondary"
            onClick={() => downloadWithAuth(positionsApi.exportUrl(vid), `Terminplan_V${version?.version_number}.xlsx`)}
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          {!isBaseVersion && (
            <button className="btn-secondary" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" /> In Version importieren
            </button>
          )}
          {!isBaseVersion && (
            <button className="btn-primary" onClick={() => setShowNewPosition(true)}>
              <Plus className="w-4 h-4" /> Position
            </button>
          )}
        </div>
      </div>

      {/* Draft changes banner */}
      {hasDraft && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <span className="text-sm text-amber-800 font-medium">
            {draftCount} Position{draftCount !== 1 ? "en" : ""} geändert – nicht gespeichert
          </span>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-sm text-amber-700 hover:text-amber-900"
              onClick={() => setDraftChanges({})}
            >
              <X className="w-4 h-4" /> Verwerfen
            </button>
            <button className="btn-primary text-sm" onClick={openSaveAs}>
              <Save className="w-4 h-4" /> Als neue Version speichern
            </button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "table" ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("table")}
        >
          <List className="w-4 h-4" /> Tabelle
        </button>
        <button
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "gantt" ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("gantt")}
        >
          <BarChart2 className="w-4 h-4" /> Gantt-Diagramm
        </button>

        {tab === "gantt" && (
          <div className="ml-auto flex items-center gap-1 pb-1">
            {GANTT_VIEWS.map((g) => (
              <button
                key={g.value}
                onClick={() => setGanttView(g.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  ganttView === g.value ? "bg-primary-100 text-primary-700" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Lade Positionen…
        </div>
      ) : tab === "table" ? (
        <PositionTable
          positions={displayPositions}
          versionId={vid}
          onRowClick={(pos) => setSelectedPosition(pos)}
          readOnly={isBaseVersion}
        />
      ) : (
        <div className="card p-4">
          {!isBaseVersion && (
            <p className="text-xs text-gray-400 mb-2">
              Balken ziehen zum Anpassen der Termine · Änderungen über „Als neue Version speichern" sichern
            </p>
          )}
          <GanttChart
            positions={displayPositions}
            viewMode={GANTT_MODE_MAP[ganttView]}
            readOnly={isBaseVersion}
            onDateChange={!isBaseVersion ? handleGanttDateChange : undefined}
            onProgressChange={!isBaseVersion ? handleGanttProgressChange : undefined}
          />
        </div>
      )}

      <VorgangDetailModal
        position={selectedPosition}
        onClose={() => setSelectedPosition(null)}
        onUpdated={(updated) => {
          qc.setQueryData(["positions", vid], (old: SchedulePosition[] | undefined) =>
            old ? old.map((p) => (p.id === updated.id ? updated : p)) : old
          );
          setSelectedPosition(updated);
        }}
      />

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} versionId={vid} />
      <MSPDIImportDialog open={showMspdiImport} onClose={() => setShowMspdiImport(false)} projectId={pid} />
      <ExcelImportAsVersionDialog open={showExcelImport} onClose={() => setShowExcelImport(false)} projectId={pid} />

      {showNewPosition && (
        <PositionEditModal
          open={showNewPosition}
          onClose={() => setShowNewPosition(false)}
          versionId={vid}
        />
      )}

      {showCompare && (
        <CompareDialog
          open={showCompare}
          onClose={() => setShowCompare(false)}
          versions={versions}
          currentVersionId={vid}
        />
      )}

      {/* Shift reason editor */}
      <Modal open={showEditVersion} onClose={() => setShowEditVersion(false)} title="Verschiebungsgrund bearbeiten">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateVersionMutation.mutate({
              shift_reason: shiftForm.shift_reason || undefined,
              shift_description: shiftForm.shift_description || undefined,
            });
          }}
          className="space-y-4"
        >
          <VersionShiftFields
            shiftReason={shiftForm.shift_reason}
            shiftDescription={shiftForm.shift_description}
            onChange={(key, value) => setShiftForm((f) => ({ ...f, [key]: value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowEditVersion(false)}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={updateVersionMutation.isPending}>
              {updateVersionMutation.isPending ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Save as new version */}
      <Modal open={showSaveAs} onClose={() => setShowSaveAs(false)} title="Als neue Version speichern">
        <form
          onSubmit={(e) => { e.preventDefault(); saveAsMutation.mutate(); }}
          className="space-y-4"
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
            {draftCount} Änderung{draftCount !== 1 ? "en" : ""} aus dem Gantt-Diagramm werden in die neue Version übernommen.
          </div>
          <div>
            <label className="label">Versionsname *</label>
            <input
              className="input"
              required
              value={saveAsForm.name}
              onChange={(e) => setSaveAsForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Aktueller Stand KW 24"
            />
          </div>
          <div>
            <label className="label">Beschreibung</label>
            <textarea
              className="input"
              rows={2}
              value={saveAsForm.description}
              onChange={(e) => setSaveAsForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <VersionShiftFields
            shiftReason={saveAsForm.shift_reason}
            shiftDescription={saveAsForm.shift_description}
            onChange={(key, value) => setSaveAsForm((f) => ({ ...f, [key]: value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="save_as_baseline"
              checked={saveAsForm.is_baseline}
              onChange={(e) => setSaveAsForm((f) => ({ ...f, is_baseline: e.target.checked }))}
              className="w-4 h-4 accent-primary-600"
            />
            <label htmlFor="save_as_baseline" className="text-sm font-medium text-gray-700">Als Baseline markieren</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowSaveAs(false)}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={saveAsMutation.isPending}>
              {saveAsMutation.isPending ? "Speichert…" : "Neue Version erstellen"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
