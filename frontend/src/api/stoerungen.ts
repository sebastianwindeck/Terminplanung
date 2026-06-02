import axios from "axios";
import { getStoredToken } from "@/api/client";
import type {
  Stoerung,
  StoerungListItem,
  Behinderungsanzeige,
  Kausalitaet,
  Stoerungsanlage,
  Bautagesbericht,
  DropdownsResponse,
} from "@/types/stoerung";

const v1 = axios.create({ baseURL: "/api/v1" });
v1.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Störungen ─────────────────────────────────────────────────────────────────

export const stoerungsApi = {
  dropdowns: () => v1.get<DropdownsResponse>("/stoerungen/dropdowns").then((r) => r.data),
  list: (projectId: number, statusFilter?: string) =>
    v1
      .get<StoerungListItem[]>("/stoerungen", { params: { project_id: projectId, status: statusFilter } })
      .then((r) => r.data),
  get: (id: number) => v1.get<Stoerung>(`/stoerungen/${id}`).then((r) => r.data),
  create: (data: Partial<Stoerung> & { project_id: number; titel: string }) =>
    v1.post<Stoerung>("/stoerungen", data).then((r) => r.data),
  update: (id: number, data: Partial<Stoerung>) =>
    v1.patch<Stoerung>(`/stoerungen/${id}`, data).then((r) => r.data),
  transition: (id: number, toStatus: string, comment?: string) =>
    v1.post<Stoerung>(`/stoerungen/${id}/transition`, { to_status: toStatus, comment }).then((r) => r.data),
  delete: (id: number) => v1.delete(`/stoerungen/${id}`),
  pdfUrl: (id: number) => `/api/v1/stoerungen/${id}/pdf`,
};

// ── Behinderungsanzeigen ──────────────────────────────────────────────────────

export const behinderungsanzeigeApi = {
  list: (stoerungId: number) =>
    v1.get<Behinderungsanzeige[]>("/behinderungsanzeigen", { params: { stoerung_id: stoerungId } }).then((r) => r.data),
  get: (id: number) => v1.get<Behinderungsanzeige>(`/behinderungsanzeigen/${id}`).then((r) => r.data),
  create: (data: Partial<Behinderungsanzeige> & { stoerung_id: number }) =>
    v1.post<Behinderungsanzeige>("/behinderungsanzeigen", data).then((r) => r.data),
  update: (id: number, data: Partial<Behinderungsanzeige>) =>
    v1.patch<Behinderungsanzeige>(`/behinderungsanzeigen/${id}`, data).then((r) => r.data),
  versenden: (id: number) =>
    v1.post<Behinderungsanzeige>(`/behinderungsanzeigen/${id}/versenden`).then((r) => r.data),
  delete: (id: number) => v1.delete(`/behinderungsanzeigen/${id}`),
};

// ── Kausalitäten ──────────────────────────────────────────────────────────────

export const kausalitaetApi = {
  list: (stoerungId: number) =>
    v1.get<Kausalitaet[]>("/kausalitaeten", { params: { stoerung_id: stoerungId } }).then((r) => r.data),
  create: (data: Partial<Kausalitaet> & { stoerung_id: number }) =>
    v1.post<Kausalitaet>("/kausalitaeten", data).then((r) => r.data),
  update: (id: number, data: Partial<Kausalitaet>) =>
    v1.patch<Kausalitaet>(`/kausalitaeten/${id}`, data).then((r) => r.data),
  delete: (id: number) => v1.delete(`/kausalitaeten/${id}`),
};

// ── Störungsanlagen ────────────────────────────────────────────────────────────

export const stoerungsanlageApi = {
  upload: (stoerungId: number, file: File, anlageTyp: string, beschreibung?: string) => {
    const fd = new FormData();
    fd.append("stoerung_id", String(stoerungId));
    fd.append("anlage_typ", anlageTyp);
    fd.append("file", file);
    if (beschreibung) fd.append("beschreibung", beschreibung);
    return v1.post<Stoerungsanlage>("/stoerungsanlagen", fd).then((r) => r.data);
  },
  downloadUrl: (id: number) => `/api/v1/stoerungsanlagen/${id}/download`,
  delete: (id: number) => v1.delete(`/stoerungsanlagen/${id}`),
};

// ── Bautagesberichte ───────────────────────────────────────────────────────────

export const bautagesberichtApi = {
  list: (projectId: number) =>
    v1.get<Bautagesbericht[]>("/bautagesberichte", { params: { project_id: projectId } }).then((r) => r.data),
  get: (id: number) => v1.get<Bautagesbericht>(`/bautagesberichte/${id}`).then((r) => r.data),
  create: (data: Partial<Bautagesbericht> & { project_id: number; datum: string }) =>
    v1.post<Bautagesbericht>("/bautagesberichte", data).then((r) => r.data),
  update: (id: number, data: Partial<Bautagesbericht>) =>
    v1.patch<Bautagesbericht>(`/bautagesberichte/${id}`, data).then((r) => r.data),
  freigeben: (id: number) =>
    v1.post<Bautagesbericht>(`/bautagesberichte/${id}/freigeben`).then((r) => r.data),
  delete: (id: number) => v1.delete(`/bautagesberichte/${id}`),
};
