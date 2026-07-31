import { Link } from "@tanstack/react-router";
import { LayoutDashboard, MonitorSmartphone, ListVideo, LogOut, Satellite } from "lucide-react";
import { useAuth } from "@/store/auth";

const nav = [
  { to: "/", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/devices", label: "إدارة الأجهزة", icon: MonitorSmartphone, exact: false },
  { to: "/playlists", label: "قوائم التشغيل", icon: ListVideo, exact: false },
] as const;

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { logout, email } = useAuth();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <span className="brand-gradient flex size-10 items-center justify-center rounded-xl text-sidebar-primary-foreground">
          <Satellite className="size-5" />
        </span>
        <div>
          <p className="text-base font-extrabold tracking-tight">EN TEC Server</p>
          <p className="text-xs text-sidebar-foreground/60">لوحة تحكم IPTV</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            activeOptions={{ exact }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary"
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 pb-2 text-xs text-sidebar-foreground/60">{email ?? "مدير النظام"}</p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground/75 transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <LogOut className="size-[18px]" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}