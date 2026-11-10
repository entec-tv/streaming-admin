import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LoaderCircle, MonitorSmartphone, RotateCcw, Search, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const { customers, searchDevice, revokeDevice, restoreDevice } = useData();
  const { role } = useAuth();
  const canManage = role === "owner" || role === "admin";
  const [query, setQuery] = useState("");
  const [foundDevice, setFoundDevice] = useState<Device | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pendingAction, setPendingAction] = useState<DeviceAction>(null);
  const [saving, setSaving] = useState(false);

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

  const handleSearch = async () => {
    const macAddress = query.trim();
    if (!macAddress) {
      setFoundDevice(null);
      setHasSearched(false);
      setSearchFailed(false);
      return;
    }

    setSearching(true);
    setFoundDevice(null);
    setHasSearched(true);
    setSearchFailed(false);
    try {
      const device = await searchDevice(macAddress);
      setFoundDevice(device);
    } catch {
      setSearchFailed(true);
    } finally {
      setSearching(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || saving) return;
    setSaving(true);
    const { device, action } = pendingAction;
    const succeeded = action === "revoke"
      ? await revokeDevice(device.macAddress, device.deviceKey)
      : await restoreDevice(device.macAddress);

    if (succeeded) {
      setPendingAction(null);
      const revokedAt = new Date().toISOString();
      setFoundDevice({
        ...device,
        status: action === "revoke" ? "revoked" : "active",
        revokedAt: action === "revoke" ? revokedAt : null,
      });
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

  const owners = foundDevice
    ? [...(customerNamesByMac.get(normalizeMac(foundDevice.macAddress)) || [])]
    : [];
  const revoked = foundDevice?.status === "revoked";

  return (
    <AppShell title="إدارة الأجهزة" description="ابحث عن جهاز محدد باستخدام عنوان MAC">
      <Card className="surface-card border-border/70 p-0">
        <form
          className="border-b border-border/70 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <label htmlFor="device-mac-search" className="mb-2 block text-sm font-bold">
            البحث بعنوان MAC
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="device-mac-search"
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                maxLength={512}
                value={query}
                disabled={searching}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setFoundDevice(null);
                  setHasSearched(false);
                  setSearchFailed(false);
                }}
                placeholder="أدخل عنوان MAC كاملًا"
                className="pl-10 font-mono text-left"
              />
            </div>
            <Button type="submit" disabled={searching || !query.trim()}>
              {searching ? <LoaderCircle className="ml-2 size-4 animate-spin" /> : <Search className="ml-2 size-4" />}
              بحث
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">تظهر نتيجة الجهاز المطابق فقط بعد البحث.</p>
        </form>

        {searching ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> جارٍ البحث عن الجهاز...
          </div>
        ) : foundDevice ? (
          <div className="overflow-x-auto">
            <div className="px-5 pt-5 text-sm font-extrabold">نتيجة البحث</div>
            <table className="w-full min-w-[820px] text-right text-sm">
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
                <tr className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-mono font-bold" dir="ltr">{foundDevice.macAddress}</td>
                  <td className="px-5 py-3">{owners.length ? owners.join("، ") : <span className="text-muted-foreground">غير مرتبط</span>}</td>
                  <td className="px-5 py-3">
                    <span className={revoked ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive" : "rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"}>
                      {revoked ? "مسحوبة الصلاحية" : "مفعّل"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(foundDevice.lastActive)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(foundDevice.trialEndsAt)}</td>
                  <td className="px-5 py-3">{foundDevice.playlistCount || 0}</td>
                  <td className="px-5 py-3">
                    {canManage && (
                      <Button
                        size="sm"
                        variant={revoked ? "outline" : "destructive"}
                        onClick={() => setPendingAction({ device: foundDevice, action: revoked ? "restore" : "revoke" })}
                      >
                        {revoked ? <RotateCcw className="ml-1 size-4" /> : <Trash2 className="ml-1 size-4" />}
                        {revoked ? "إعادة التفعيل" : "سحب الصلاحية"}
                      </Button>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : searchFailed ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            تعذر إتمام البحث. حاول مرة أخرى.
          </div>
        ) : hasSearched ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            لم يتم العثور على جهاز بهذا العنوان.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-12 text-center text-sm text-muted-foreground">
            <MonitorSmartphone className="size-8 opacity-60" />
            أدخل عنوان MAC كاملًا لعرض بيانات الجهاز وإدارته.
          </div>
        )}
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
