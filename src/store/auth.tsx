import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AuthValue {
  isAuthed: boolean;
  ready: boolean;
  email: string | null;
  login: (email: string) => void;
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
  }, []);

  const login = useCallback((value: string) => {
    window.localStorage.setItem(KEY, value);
    window.localStorage.setItem("entec_token", "mock-token");
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