import axios from "axios";

const TOKEN_KEY = "tp_auth_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function downloadWithAuth(url: string, filename: string): Promise<void> {
  const token = getStoredToken();
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status})`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

import type {
  Project,
  ScheduleVersion,
  SchedulePosition,
  ImportResult,
  VersionComparison,
  EmailEvent,
  TimelineResponse,
  CompanySettings,
  SequentialComparisonResponse,
  GeneratedReport,
  MSPDIImportResult,
  Bautagesbericht,
} from "@/types";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Projects ──────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => api.get<Project[]>("/projects/").then((r) => r.data),
  get: (id: number) => api.get<Project>(`/projects/${id}`).then((r) => r.data),
  create: (data: Partial<Project>) => api.post<Project>("/projects/", data).then((r) => r.data),
  update: (id: number, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data).then((r) => r.data),
  updateMasterData: (id: number, data: Partial<Project>) =>
    api.patch<Project>(`/projects/${id}/master-data`, data).then((r) => r.data),
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

// ── Emails ────────────────────────────────────────────────────────────────────

export const emailsApi = {
  listForProject: (projectId: number) =>
    api.get<EmailEvent[]>(`/projects/${projectId}/emails`).then((r) => r.data),
  get: (id: number) => api.get<EmailEvent>(`/emails/${id}`).then((r) => r.data),
  create: (data: Partial<EmailEvent> & { project_id: number }, file?: File) => {
    const fd = new FormData();
    fd.append("data", JSON.stringify(data));
    if (file) fd.append("file", file);
    return api.post<EmailEvent>("/emails", fd).then((r) => r.data);
  },
  update: (id: number, data: Partial<EmailEvent>, file?: File) => {
    const fd = new FormData();
    fd.append("data", JSON.stringify(data));
    if (file) fd.append("file", file);
    return api.put<EmailEvent>(`/emails/${id}`, fd).then((r) => r.data);
  },
  delete: (id: number) => api.delete(`/emails/${id}`),
  attachmentUrl: (id: number) => `/api/emails/${id}/attachment`,
};

// ── Timeline ──────────────────────────────────────────────────────────────────

export const timelineApi = {
  getForProject: (projectId: number) =>
    api.get<TimelineResponse>(`/projects/${projectId}/timeline`).then((r) => r.data),
};

// ── MSPDI ─────────────────────────────────────────────────────────────────────

export const mspdiApi = {
  import: (projectId: number, file: File, versionName?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("project_id", String(projectId));
    if (versionName) fd.append("version_name", versionName);
    return api.post<MSPDIImportResult>("/mspdi/import", fd).then((r) => r.data);
  },
  exportUrl: (versionId: number) => `/api/mspdi/export/${versionId}`,
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  getSequentialComparison: (projectId: number, versionIds: number[]) =>
    api
      .post<SequentialComparisonResponse>(`/projects/${projectId}/sequential-comparison`, { version_ids: versionIds })
      .then((r) => r.data),
  generatePdf: (projectId: number, versionIds: number[]) =>
    api
      .post<GeneratedReport>(`/projects/${projectId}/reports/sequential-comparison`, { version_ids: versionIds })
      .then((r) => r.data),
  listForProject: (projectId: number) =>
    api.get<GeneratedReport[]>(`/projects/${projectId}/reports`).then((r) => r.data),
  downloadUrl: (reportId: number) => `/api/reports/${reportId}/download`,
  delete: (reportId: number) => api.delete(`/reports/${reportId}`),
};

// ── Bautagesberichte ──────────────────────────────────────────────────────────

export const bautagesberichteApi = {
  listForProject: (projectId: number) =>
    api.get<Bautagesbericht[]>("/bautagesberichte", { params: { project_id: projectId } }).then((r) => r.data),
  get: (id: number) => api.get<Bautagesbericht>(`/bautagesberichte/${id}`).then((r) => r.data),
  create: (data: Partial<Bautagesbericht> & { project_id: number; datum: string }) =>
    api.post<Bautagesbericht>("/bautagesberichte", data).then((r) => r.data),
  update: (id: number, data: Partial<Bautagesbericht>) =>
    api.patch<Bautagesbericht>(`/bautagesberichte/${id}`, data).then((r) => r.data),
  freigeben: (id: number) =>
    api.post<Bautagesbericht>(`/bautagesberichte/${id}/freigeben`).then((r) => r.data),
  delete: (id: number) => api.delete(`/bautagesberichte/${id}`),
};

// ── Company Settings ──────────────────────────────────────────────────────────

export const companySettingsApi = {
  get: () => api.get<CompanySettings>("/company-settings").then((r) => r.data),
  update: (data: Partial<CompanySettings>) =>
    api.put<CompanySettings>("/company-settings", data).then((r) => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<CompanySettings>("/company-settings/logo", fd).then((r) => r.data);
  },
  deleteLogo: () => api.delete("/company-settings/logo").then((r) => r.data),
  logoUrl: () => "/api/company-settings/logo",
};
