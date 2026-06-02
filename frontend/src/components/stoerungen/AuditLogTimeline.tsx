import { useQuery } from "@tanstack/react-query";
import { Clock, GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { getStoredToken } from "@/api/client";

interface AuditEntry {
  id: number;
  action: string;
  user_email: string | null;
  timestamp: string;
  field_changes: Record<string, unknown> | null;
}

interface Props {
  stoerungId: number;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  create: { label: "Erstellt", icon: <Plus className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-700" },
  update: { label: "Bearbeitet", icon: <Pencil className="w-3.5 h-3.5" />, color: "bg-blue-100 text-blue-700" },
  delete: { label: "Gelöscht", icon: <Trash2 className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-700" },
  transition: { label: "Status geändert", icon: <GitBranch className="w-3.5 h-3.5" />, color: "bg-purple-100 text-purple-700" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const api = axios.create({ baseURL: "/api/v1" });
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function AuditLogTimeline({ stoerungId }: Props) {
  const { data: logs = [], isLoading } = useQuery<AuditEntry[]>({
    queryKey: ["audit-log", stoerungId],
    queryFn: () => api.get<AuditEntry[]>(`/stoerungen/${stoerungId}/audit-log`).then((r) => r.data),
  });

  if (isLoading) return <div className="text-sm text-gray-400 py-4">Lade Protokoll…</div>;

  if (logs.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
        Noch keine Einträge im Protokoll
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Änderungsprotokoll</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-3">
          {logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, icon: <Clock className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-600" };
            return (
              <div key={log.id} className="flex gap-3 pl-2">
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.color}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                  </div>
                  {log.user_email && (
                    <p className="text-xs text-gray-500 mt-1">{log.user_email}</p>
                  )}
                  {log.field_changes && (
                    <div className="mt-2 space-y-0.5">
                      {Object.entries(log.field_changes).map(([k, v]) => (
                        <div key={k} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-700">{k}: </span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
