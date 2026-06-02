import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "@/types";
import { authApi, setAuthToken } from "@/api/auth";
import { getStoredToken, storeToken, clearToken } from "@/api/client";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((t: string) => {
    storeToken(t);
    setToken(t);
    setAuthToken(t);
  }, []);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setAuthToken(stored);
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        clearToken();
        setToken(null);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      applyToken(res.access_token);
      const me = await authApi.me();
      setUser(me);
    },
    [applyToken]
  );

  const setup = useCallback(
    async (email: string, password: string, fullName?: string) => {
      const res = await authApi.setup(email, password, fullName);
      applyToken(res.access_token);
      const me = await authApi.me();
      setUser(me);
    },
    [applyToken]
  );

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
