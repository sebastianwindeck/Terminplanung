import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Upload, Download, Plus, BarChart2, List, GitCompare } from "lucide-react";
import { ViewMode } from "gantt-task-react";
import { projectsApi, versionsApi, positionsApi, mspdiApi } from "@/api/client";
import GanttChart from "@/components/GanttChart";
import PositionTable from "@/components/PositionTable";
import ImportDialog from "@/components/ImportDialog";
import PositionEditModal from "@/components/PositionEditModal";
import CompareDialog from "@/components/CompareDialog";
import MSPDIImportDialog from "@/components/mspdi/MSPDIImportDialog";

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

export default function ScheduleView() {
  const { projectId, versionId } = useParams<{ projectId: string; versionId: string }>();
  const vid = Number(versionId);
  const pid = Number(projectId);
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("table");
  const [ganttView, setGanttView] = useState<GanttView>("Week");
  const [showImport, setShowImport] = useState(false);
  const [showMspdiImport, setShowMspdiImport] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const { data: project } = useQuery({ queryKey: ["project", pid], queryFn: () => projectsApi.get(pid) });
  const { data: version } = useQuery({ queryKey: ["version", vid], queryFn: () => versionsApi.get(vid) });
  const { data: versions = [] } = useQuery({ queryKey: ["versions", pid], queryFn: () => versionsApi.listForProject(pid) });
  const { data: positions = [], isLoading } = useQuery({
    queryKey: ["positions", vid],
    queryFn: () => positionsApi.listForVersion(vid),
  });

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
            {version?.is_baseline && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Basis</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{positions.length} Positionen</p>
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
          <a
            href={mspdiApi.exportUrl(vid)}
            download
            className="btn-secondary"
          >
            <Download className="w-4 h-4" /> MS Project exportieren
          </a>
          <a
            href={positionsApi.exportUrl(vid)}
            download
            className="btn-secondary"
          >
            <Download className="w-4 h-4" /> Excel exportieren
          </a>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Importieren
          </button>
          <button className="btn-primary" onClick={() => setShowNewPosition(true)}>
            <Plus className="w-4 h-4" /> Position
          </button>
        </div>
      </div>

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
        <PositionTable positions={positions} versionId={vid} />
      ) : (
        <div className="card p-4">
          <GanttChart positions={positions} viewMode={GANTT_MODE_MAP[ganttView]} />
        </div>
      )}

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} versionId={vid} />
      <MSPDIImportDialog open={showMspdiImport} onClose={() => setShowMspdiImport(false)} projectId={pid} />

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
    </div>
  );
}
