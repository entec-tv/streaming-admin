import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ListVideo, MonitorSmartphone, ShieldBan } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/store/data-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "الرئيسية — EN TEC Server" },
      {
        name: "description",
        content: "إحصائيات سريعة لأجهزة IPTV المسجلة والنشطة وقوائم التشغيل في EN TEC Server.",
      },
      { property: "og:title", content: "الرئيسية — EN TEC Server" },
      { property: "og:description", content: "نظرة عامة على الأجهزة وقوائم التشغيل." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const { devices, playlists, playlistName } = useData();
  const active = devices.filter((d) => d.status === "active").length;
  const blocked = devices.filter((d) => d.status === "blocked").length;
  const latest = devices.slice(0, 5);

  return (
    <AppShell title="الصفحة الرئيسية" description="نظرة عامة على حالة المنصة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="الأجهزة المسجلة" value={devices.length} icon={MonitorSmartphone} />
        <StatCard label="الأجهزة النشطة" value={active} icon={Activity} hint="متصلة حالياً" />
        <StatCard label="قوائم التشغيل" value={playlists.length} icon={ListVideo} />
        <StatCard label="الأجهزة المحظورة" value={blocked} icon={ShieldBan} />
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">أحدث الأجهزة</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/devices">عرض الكل</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">MAC Address</th>
                <th className="px-5 py-3 font-bold">الحالة</th>
                <th className="px-5 py-3 font-bold">قائمة التشغيل</th>
                <th className="px-5 py-3 font-bold">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {d.mac}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3">{playlistName(d.playlistId)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{d.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
