import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Server, MonitorSmartphone, ShieldBan, Tv, Settings, Pencil, Trash2, Search, Wifi, Clock3, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useData } from "@/store/data-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Customer } from "@/services/types";
import { useAuth } from "@/store/auth";

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
  const { customers, hosts, devices, deleteCustomer, updateCustomerStatus } = useData();
  const { role } = useAuth();
  const canManage = role === "owner" || role === "admin";
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [bulkAction, setBulkAction] = useState<"delete" | "block" | "unblock" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const active = customers.filter((c) => c.status === "active").length;
  const blocked = customers.filter((c) => c.status === "blocked").length;
  const deviceActivity = useMemo(() => {
    const byMac = new Map<string, { latestExpiry: string | null; hasUnlimitedAccess: boolean; hasActiveAccess: boolean }>();
    for (const customer of customers) {
      if (customer.status === "blocked") continue;
      for (const subscription of customer.subscriptions || []) {
        const mac = (subscription.macAddress || "").toUpperCase().replace(/[^A-F0-9]/g, "");
        if (!mac) continue;
        const current = byMac.get(mac) || { latestExpiry: null, hasUnlimitedAccess: false, hasActiveAccess: false };
        const expiry = subscription.appExpiry ? new Date(subscription.appExpiry) : null;
        const isEnabled = subscription.status !== "blocked" && subscription.appActive !== false;
        if (isEnabled) {
          if (!expiry) {
            current.hasUnlimitedAccess = true;
            current.hasActiveAccess = true;
          } else {
            if (!current.latestExpiry || expiry.getTime() > new Date(current.latestExpiry).getTime()) current.latestExpiry = expiry.toISOString();
            if (expiry.getTime() > now) current.hasActiveAccess = true;
          }
        }
        byMac.set(mac, current);
      }
    }
    const devices = [...byMac.values()];
    const online = new Set(devices.filter((device) => {
      if (device.status === "revoked") return false;
      const lastSeen = new Date(device.lastActive).getTime();
      return Number.isFinite(lastSeen) && lastSeen <= now && now - lastSeen <= 3 * 60_000;
    }).map((device) => device.macAddress.toUpperCase().replace(/[^A-F0-9]/g, ""))).size;
    const expiring = devices.filter((device) => {
      if (!device.hasActiveAccess || device.hasUnlimitedAccess || !device.latestExpiry) return false;
      const expiry = new Date(device.latestExpiry).getTime();
      return expiry > now && expiry <= now + 7 * 24 * 60 * 60_000;
    }).length;
    const expired = devices.filter((device) => {
      if (device.hasActiveAccess || device.hasUnlimitedAccess || !device.latestExpiry) return false;
      return new Date(device.latestExpiry).getTime() <= now;
    }).length;
    return { online, expiring, expired };
  }, [customers, devices, now]);
  const latest = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    return customers.slice(0, 5).filter((customer) => !q || customer.name.toLowerCase().includes(q) || customer.subscriptions.some((subscription) => subscription.username?.toLowerCase().includes(q) || subscription.macAddress?.toLowerCase().includes(q)));
  }, [customers, customerQuery]);

  const toggleCustomer = (customerId: string) => setSelectedCustomerIds((ids) => ids.includes(customerId) ? ids.filter((id) => id !== customerId) : [...ids, customerId]);
  const toggleAllCustomers = () => setSelectedCustomerIds((ids) => ids.length === latest.length && latest.length ? [] : latest.map((customer) => customer._id));
  const confirmBulk = (action: "delete" | "block" | "unblock") => setBulkAction(action);
  const runBulkAction = () => {
    if (bulkAction === "delete") selectedCustomerIds.forEach((id) => deleteCustomer(id));
    if (bulkAction === "block") selectedCustomerIds.forEach((id) => updateCustomerStatus(id, "blocked"));
    if (bulkAction === "unblock") selectedCustomerIds.forEach((id) => updateCustomerStatus(id, "active"));
    setSelectedCustomerIds([]);
    setBulkAction(null);
  };

  return (
    <AppShell title="الصفحة الرئيسية" description="نظرة عامة على حالة المنصة">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="العملاء المسجلين" value={customers.length} icon={MonitorSmartphone} />
        <StatCard label="العملاء النشطين" value={active} icon={Activity} hint="حالة الحساب" />
        <StatCard label="السيرفرات (Hosts)" value={hosts.length} icon={Server} />
        <StatCard label="العملاء المحظورين" value={blocked} icon={ShieldBan} />
        <StatCard label="الأجهزة المتصلة الآن" value={deviceActivity.online} icon={Wifi} hint="نبضة خلال آخر 3 دقائق" />
        <StatCard label="تفعيل ينتهي خلال 7 أيام" value={deviceActivity.expiring} icon={Clock3} />
        <StatCard label="أجهزة منتهية التفعيل" value={deviceActivity.expired} icon={AlertTriangle} />
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-extrabold">أحدث العملاء ({latest.length})</h2>
            {canManage && selectedCustomerIds.length > 0 && <div className="flex flex-wrap items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
              <span className="px-2 text-xs font-bold text-primary">{selectedCustomerIds.length} محدد</span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-warning" onClick={() => confirmBulk("block")}>حظر</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-success" onClick={() => confirmBulk("unblock")}>إلغاء حظر</Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => confirmBulk("delete")}>حذف</Button>
            </div>}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="بحث بالعميل" className="h-9 pr-9" />
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/customers">عرض الكل</Link></Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="w-10 px-5 py-3">{canManage && <Checkbox checked={selectedCustomerIds.length === latest.length && latest.length > 0} onCheckedChange={toggleAllCustomers} aria-label="تحديد الكل" />}</th>
                <th className="px-5 py-3 font-bold">اسم العميل</th>
                <th className="px-5 py-3 font-bold">عدد الاشتراكات</th>
                <th className="px-5 py-3 font-bold">عدد الأجهزة</th>
                <th className="px-5 py-3 font-bold">حالة العميل</th>
                <th className="px-5 py-3 font-bold">آخر ظهور (أحدث جهاز)</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((c) => (
                <tr key={c._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3">{canManage && <Checkbox checked={selectedCustomerIds.includes(c._id)} onCheckedChange={() => toggleCustomer(c._id)} aria-label={`تحديد ${c.name}`} />}</td>
                  <td className="px-5 py-3 font-bold">{c.name}</td>
                  <td className="px-5 py-3"><div className="flex items-center gap-1"><Tv className="size-4 text-muted-foreground" /><span className="font-bold text-primary">{c.subscriptions.length}</span></div></td>
                  <td className="px-5 py-3"><div className="flex items-center gap-1"><MonitorSmartphone className="size-4 text-muted-foreground" /><span className="font-bold">{new Set(c.subscriptions.map((subscription) => subscription.macAddress).filter(Boolean)).size}</span></div></td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.subscriptions.length ? (() => {
                      const lastSeen = [...c.subscriptions].sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime())[0]?.lastActive;
                      return lastSeen ? new Date(lastSeen).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "—";
                    })() : "لا يوجد أجهزة"}
                  </td>
                  <td className="px-5 py-3">
                    {canManage && <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" title="إجراءات العميل" aria-label={`إجراءات العميل ${c.name}`}><Settings className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-44 text-right">
                        <DropdownMenuItem asChild><Link to="/customers" search={{ devices: c._id }}><MonitorSmartphone className="size-4" /> قائمة الأجهزة</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteTarget(c)}><Trash2 className="size-4" /> حذف العميل</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>}
                  </td>
                </tr>
              ))}
              {latest.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">لا توجد نتائج مطابقة</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
      <AlertDialog open={!!deleteTarget || !!bulkAction} onOpenChange={(isOpen) => { if (!isOpen) { setDeleteTarget(null); setBulkAction(null); } }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `هل تريد حذف العميل «${deleteTarget.name}»؟` : bulkAction === "delete" ? `هل تريد حذف ${selectedCustomerIds.length} عميل؟` : bulkAction === "block" ? `هل تريد حظر ${selectedCustomerIds.length} عميل؟` : `هل تريد إلغاء حظر ${selectedCustomerIds.length} عميل؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className={deleteTarget || bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={() => {
              if (deleteTarget) { deleteCustomer(deleteTarget._id); setDeleteTarget(null); }
              else runBulkAction();
            }}>تأكيد</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
