import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AuthValue {
  isAuthed: boolean;
  ready: boolean;
  email: string | null;
  login: (email: string, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const KEY = "entec_admin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setEmail(window.localStorage.getItem(KEY));
    setReady(true);

    const handleLogoutEvent = () => setEmail(null);
    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => window.removeEventListener("auth:logout", handleLogoutEvent);
  }, []);

  const login = useCallback((value: string, token: string) => {
    window.localStorage.setItem(KEY, value);
    window.localStorage.setItem("entec_token", token);
    setEmail(value);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem("entec_token");
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ isAuthed: Boolean(email), ready, email, login, logout }),
    [email, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}