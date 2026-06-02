import axios from "axios";
import { getStoredToken } from "@/api/client";
import type { AuthUser, Company, UserRecord } from "@/types";

const api = axios.create({ baseURL: "/api" });
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  full_name: string | null;
  company_id: number | null;
}

export const authApi = {
  checkSetup: () => api.get<{ setup_required: boolean }>("/auth/check-setup").then((r) => r.data),

  setup: (email: string, password: string, full_name?: string) =>
    api.post<TokenResponse>("/auth/setup", { email, password, full_name }).then((r) => r.data),

  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return api
      .post<TokenResponse>("/auth/login", form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data);
  },

  me: () => api.get<AuthUser>("/auth/me").then((r) => r.data),
};

export const companiesApi = {
  list: () => api.get<Company[]>("/companies").then((r) => r.data),
  create: (data: {
    name: string;
    primary_color?: string;
    admin_email: string;
    admin_password: string;
    admin_full_name?: string;
  }) => api.post<Company>("/companies", data).then((r) => r.data),
  update: (id: number, data: { name?: string; primary_color?: string; is_active?: boolean }) =>
    api.patch<Company>(`/companies/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/companies/${id}`),
};

export const usersApi = {
  list: () => api.get<UserRecord[]>("/users").then((r) => r.data),
  create: (data: { email: string; password: string; full_name?: string; role?: string }) =>
    api.post<UserRecord>("/users", data).then((r) => r.data),
  update: (id: number, data: { full_name?: string; is_active?: boolean; role?: string }) =>
    api.patch<UserRecord>(`/users/${id}`, data).then((r) => r.data),
  resetPassword: (id: number, new_password: string) =>
    api.post(`/users/${id}/reset-password`, { new_password }),
  delete: (id: number) => api.delete(`/users/${id}`),
};
