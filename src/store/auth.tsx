import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/services/api";
import type { AdminRole } from "@/services/types";

interface AuthValue {
  isAuthed: boolean;
  ready: boolean;
  email: string | null;
  role: AdminRole | null;
  login: (email: string, token: string, role: AdminRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const KEY = "entec_admin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(KEY);
    const savedRole = window.localStorage.getItem("entec_role") as AdminRole | null;
    setEmail(savedEmail);
    setRole(savedRole);
    const handleLogoutEvent = () => {
      setEmail(null);
      setRole(null);
    };
    window.addEventListener("auth:logout", handleLogoutEvent);
    const token = window.localStorage.getItem("entec_token");
    if (token && savedEmail) {
      api.get("/auth/me")
        .then(({ data }) => {
          window.localStorage.setItem(KEY, data.username);
          window.localStorage.setItem("entec_role", data.role);
          setEmail(data.username);
          setRole(data.role);
        })
        .catch(() => undefined)
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, []);

  const login = useCallback((value: string, token: string, nextRole: AdminRole) => {
    window.localStorage.setItem(KEY, value);
    window.localStorage.setItem("entec_token", token);
    window.localStorage.setItem("entec_role", nextRole);
    setEmail(value);
    setRole(nextRole);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem("entec_token");
    window.localStorage.removeItem("entec_role");
    setEmail(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthed: Boolean(email), ready, email, role, login, logout }),
    [email, ready, role, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
