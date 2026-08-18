import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Server, MonitorSmartphone, ShieldBan } from "lucide-react";
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
      { name: "description", content: "نظرة عامة على العملاء والسيرفرات." },
      { property: "og:description", content: "نظرة عامة على العملاء والسيرفرات." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const { customers, hosts, hostName } = useData();
  const active = customers.filter((c) => c.status === "active").length;
  const blocked = customers.filter((c) => c.status === "blocked").length;
  const latest = customers.slice(0, 5);

  return (
    <AppShell title="الصفحة الرئيسية" description="نظرة عامة على حالة المنصة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="العملاء المسجلين" value={customers.length} icon={MonitorSmartphone} />
        <StatCard label="العملاء النشطين" value={active} icon={Activity} hint="متصلة حالياً" />
        <StatCard label="السيرفرات (Hosts)" value={hosts.length} icon={Server} />
        <StatCard label="العملاء المحظورين" value={blocked} icon={ShieldBan} />
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">أحدث العملاء</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/customers">عرض الكل</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">اسم العميل</th>
                <th className="px-5 py-3 font-bold">الحالة</th>
                <th className="px-5 py-3 font-bold">الاشتراكات</th>
                <th className="px-5 py-3 font-bold">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((c) => (
                <tr key={c._id} className="border-b border-border/50 last:border-0">
                  <td className="px-5 py-3 font-bold" dir="rtl">
                    {c.name}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.subscriptions && c.subscriptions.length > 0 
                      ? `${c.subscriptions.length} اشتراك`
                      : 'لا يوجد'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
