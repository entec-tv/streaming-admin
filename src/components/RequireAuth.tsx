import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/store/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthed, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !isAuthed) navigate({ to: "/login" });
  }, [ready, isAuthed, navigate]);

  if (!ready || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-10 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}