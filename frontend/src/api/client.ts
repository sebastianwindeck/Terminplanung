import axios from "axios";
import type {
  Project,
  ScheduleVersion,
  SchedulePosition,
  ImportResult,
  VersionComparison,
} from "@/types";

const api = axios.create({ baseURL: "/api" });

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => api.get<Project[]>("/projects/").then((r) => r.data),
  get: (id: number) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) => api.post<Project>("/projects/", data).then((r) => r.data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/projects/${id}`),
};

// ── Versions ──────────────────────────────────────────────────────────────────

export const versionsApi = {
  listForProject: (projectId: number) =>
    api.get<ScheduleVersion[]>(`/versions/project/${projectId}`).then((r) => r.data),
  get: (id: number) => api.get<ScheduleVersion>(`/versions/${id}`).then((r) => r.data),
  create: (data: {
    project_id: number;
    name: string;
    description?: string;
    is_baseline?: boolean;
    clone_from_version_id?: number;
  }) => api.post<ScheduleVersion>("/versions/", data).then((r) => r.data),
  update: (id: number, data: Partial<ScheduleVersion>) =>
    api.put<ScheduleVersion>(`/versions/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/versions/${id}`),
  compare: (versionAId: number, versionBId: number) =>
    api.get<VersionComparison>(`/versions/${versionAId}/compare/${versionBId}`).then((r) => r.data),
};

// ── Positions ─────────────────────────────────────────────────────────────────

export const positionsApi = {
  listForVersion: (versionId: number) =>
    api.get<SchedulePosition[]>(`/positions/version/${versionId}`).then((r) => r.data),
  create: (data: Partial<SchedulePosition> & { version_id: number }) =>
    api.post<SchedulePosition>("/positions/", data).then((r) => r.data),
  update: (id: number, data: Partial<SchedulePosition>) =>
    api.put<SchedulePosition>(`/positions/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/positions/${id}`),
  reorder: (versionId: number, order: number[]) =>
    api.post(`/positions/version/${versionId}/reorder`, order),
  import: (versionId: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ImportResult>(`/positions/version/${versionId}/import`, fd).then((r) => r.data);
  },
  exportUrl: (versionId: number) => `/api/positions/version/${versionId}/export`,
};
