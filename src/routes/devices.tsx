import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Download, MonitorSmartphone, RotateCcw, Search, ShieldBan, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/notifications";
import { api } from "@/services/api";
import type { Device } from "@/services/types";
import { useData } from "@/store/data-store";
import { useAuth } from "@/store/auth";
import { PaginationControls } from "@/components/PaginationControls";
import { datedCsvFilename, downloadCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/devices")({
  head: () => ({ meta: [{ title: "إدارة الأجهزة — EN TEC Server" }] }),
  component: () => (
    <RequireAuth>
      <DevicesPage />
    </RequireAuth>
  ),
});

type DeviceAction = { device: Device; action: "revoke" | "restore" } | null;

const normalizeMac = (value: string) => value.toUpperCase().replace(/[^A-F0-9]/g, "");

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
};

function DevicesPage() {
  const { devices, customers, fetchDevices, revokeDevice, restoreDevice } = useData();
  const { role } = useAuth();
  const canManage = role === "owner" || role === "admin";
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pendingAction, setPendingAction] = useState<DeviceAction>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const customerNamesByMac = useMemo(() => {
    const names = new Map<string, Set<string>>();
    for (const customer of customers) {
      for (const subscription of customer.subscriptions) {
        const mac = normalizeMac(subscription.macAddress || "");
        if (!mac) continue;
        const attached = names.get(mac) || new Set<string>();
        attached.add(customer.name);
        names.set(mac, attached);
      }
    }
    return names;
  }, [customers]);

  const filteredDevices = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...devices]
      .filter((device) => statusFilter === "all" || device.status === statusFilter)
      .filter((device) => {
        if (!term) return true;
        const owners = [...(customerNamesByMac.get(normalizeMac(device.macAddress)) || [])].join(" ").toLowerCase();
        return device.macAddress.toLowerCase().includes(term) || owners.includes(term);
      })
      .sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
  }, [customerNamesByMac, devices, query, statusFilter]);

  const visibleDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, page, pageSize]);

  useEffect(() => setPage(1), [query, statusFilter]);
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
    setPage((current) => Math.min(current, pages));
  }, [filteredDevices.length, pageSize]);

  const exportFilteredDevices = () => {
    downloadCsv(datedCsvFilename("devices"), [
      "عنوان MAC", "العملاء المرتبطون", "الحالة", "آخر ظهور", "بداية التجربة", "انتهاء التجربة", "عدد قوائم التشغيل", "تاريخ التسجيل",
    ], filteredDevices.map((device) => {
      const owners = [...(customerNamesByMac.get(normalizeMac(device.macAddress)) || [])];
      return [
        device.macAddress,
        owners.join(" | "),
        device.status === "revoked" ? "مسحوبة الصلاحية" : "مفعّل",
        device.lastActive,
        device.trialStartsAt,
        device.trialEndsAt,
        device.playlistCount || 0,
        device.createdAt,
      ];
    }));
  };

  const activeCount = devices.filter((device) => device.status !== "revoked").length;
  const revokedCount = devices.filter((device) => device.status === "revoked").length;

  const confirmAction = async () => {
    if (!pendingAction || saving) return;
    setSaving(true);
    const { device, action } = pendingAction;
    const succeeded = action === "revoke"
      ? await revokeDevice(device.macAddress, device.deviceKey)
      : await restoreDevice(device.macAddress);

    if (succeeded) {
      setPendingAction(null);
      if (action === "restore") {
        toast.success("أُعيد تفعيل سجل الجهاز. أعد ربط اشتراك به إذا لزم الأمر.");
      } else {
        try {
          await api.post(`/client/devices/${encodeURIComponent(device.macAddress)}/refresh`);
        } catch {
          toast.error("تم سحب الصلاحية، لكن تعذر إرسال التحديث الفوري للجهاز");
        }
        toast.success("تم سحب صلاحية الجهاز وإزالة ارتباطاته");
      }
    }
    setSaving(false);
  };

  return (
    <AppShell title="إدارة الأجهزة" description="جرد الأجهزة المسجلة وحالة صلاحيتها وربطها بالعملاء">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="إجمالي الأجهزة" value={devices.length} icon={MonitorSmartphone} />
        <StatCard label="سجلات مفعّلة" value={activeCount} icon={CalendarClock} />
        <StatCard label="صلاحيات مسحوبة" value={revokedCount} icon={ShieldBan} />
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">الأجهزة ({filteredDevices.length})</h2>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <div className="relative min-w-56 flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالـMAC أو العميل" className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">مفعّلة</SelectItem>
                <SelectItem value="revoked">مسحوبة الصلاحية</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportFilteredDevices} disabled={filteredDevices.length === 0}>
              <Download className="ml-2 size-4" /> تصدير النتائج
            </Button>
            <Button variant="outline" onClick={() => void fetchDevices()}>تحديث القائمة</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">عنوان الجهاز</th>
                <th className="px-5 py-3 font-bold">العميل المرتبط</th>
                <th className="px-5 py-3 font-bold">الحالة</th>
                <th className="px-5 py-3 font-bold">آخر ظهور</th>
                <th className="px-5 py-3 font-bold">انتهاء التجربة</th>
                <th className="px-5 py-3 font-bold">قوائم التشغيل</th>
                <th className="px-5 py-3 font-bold">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {visibleDevices.map((device) => {
                const owners = [...(customerNamesByMac.get(normalizeMac(device.macAddress)) || [])];
                const revoked = device.status === "revoked";
                return (
                  <tr key={device._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                    <td className="px-5 py-3 font-mono font-bold" dir="ltr">{device.macAddress}</td>
                    <td className="px-5 py-3">{owners.length ? owners.join("، ") : <span className="text-muted-foreground">غير مرتبط</span>}</td>
                    <td className="px-5 py-3">
                      <span className={revoked ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive" : "rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"}>
                        {revoked ? "مسحوبة الصلاحية" : "مفعّل"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(device.lastActive)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(device.trialEndsAt)}</td>
                    <td className="px-5 py-3">{device.playlistCount || 0}</td>
                    <td className="px-5 py-3">
                      {canManage && <Button
                        size="sm"
                        variant={revoked ? "outline" : "destructive"}
                        onClick={() => setPendingAction({ device, action: revoked ? "restore" : "revoke" })}
                      >
                        {revoked ? <RotateCcw className="ml-1 size-4" /> : <Trash2 className="ml-1 size-4" />}
                        {revoked ? "إعادة التفعيل" : "سحب الصلاحية"}
                      </Button>}
                    </td>
                  </tr>
                );
              })}
          {filteredDevices.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">لا توجد أجهزة مطابقة للبحث.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          total={filteredDevices.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
        />
      </Card>

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && !saving && setPendingAction(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction?.action === "revoke" ? "سحب صلاحية الجهاز؟" : "إعادة تفعيل سجل الجهاز؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "revoke"
                ? <>سيُوقف الجهاز <span className="font-mono" dir="ltr">{pendingAction.device.macAddress}</span>، وستُزال اشتراكاته من العملاء المرتبطين. لن يستطيع بدء تجربة جديدة تلقائيًا.</>
                : <>سيُسمح للجهاز <span className="font-mono" dir="ltr">{pendingAction?.device.macAddress}</span> بالتسجيل مجددًا. لا تعود الاشتراكات المحذوفة تلقائيًا.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void confirmAction(); }}>
              {saving ? "جارٍ التنفيذ..." : pendingAction?.action === "revoke" ? "سحب الصلاحية" : "إعادة التفعيل"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
