import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link2, Plus, ShieldBan, ShieldCheck, Search, Trash2 } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/store/data-store";
import type { Device } from "@/services/types";

export const Route = createFileRoute("/devices")({
  head: () => ({
    meta: [
      { title: "إدارة الأجهزة — EN TEC Server" },
      {
        name: "description",
        content: "إضافة أجهزة IPTV عبر عنوان MAC وربطها بقوائم التشغيل وحظرها أو حذفها.",
      },
      { property: "og:title", content: "إدارة الأجهزة — EN TEC Server" },
      { property: "og:description", content: "تحكم كامل بأجهزة العملاء من مكان واحد." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DevicesPage />
    </RequireAuth>
  ),
});

const macSchema = z
  .string()
  .trim()
  .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: "صيغة الماك أدرس غير صحيحة (AA:BB:CC:11:22:33)" });

const NONE = "__none__";

function DevicesPage() {
  const {
    devices,
    playlists,
    addDevice,
    linkPlaylist,
    updateDeviceStatus,
    deleteDevice,
    playlistName,
  } = useData();

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [mac, setMac] = useState("");
  const [name, setName] = useState("");
  const [newPlaylist, setNewPlaylist] = useState<string>(NONE);
  const [linkTarget, setLinkTarget] = useState<Device | null>(null);
  const [linkValue, setLinkValue] = useState<string>(NONE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) => d.mac.toLowerCase().includes(q) || (d.name ?? "").toLowerCase().includes(q),
    );
  }, [devices, query]);

  const submitAdd = () => {
    const parsed = macSchema.safeParse(mac);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (devices.some((d) => d.mac.toUpperCase() === parsed.data.toUpperCase())) {
      toast.error("هذا الجهاز مسجل مسبقاً");
      return;
    }
    addDevice({
      mac: parsed.data,
      name: name.slice(0, 60),
      playlistId: newPlaylist === NONE ? null : newPlaylist,
    });
    setMac("");
    setName("");
    setNewPlaylist(NONE);
    setAddOpen(false);
    toast.success("تمت إضافة الجهاز بنجاح");
  };

  const submitLink = () => {
    if (!linkTarget) return;
    linkPlaylist(linkTarget.id, linkValue === NONE ? null : linkValue);
    toast.success("تم تحديث قائمة التشغيل للجهاز");
    setLinkTarget(null);
  };

  return (
    <AppShell
      title="إدارة الأجهزة"
      description="الأجهزة المسجلة وربطها بقوائم التشغيل"
      actions={
        <Button className="font-bold" onClick={() => setAddOpen(true)}>
          <Plus /> إضافة جهاز
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">قائمة الأجهزة ({filtered.length})</h2>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالماك أدرس أو الاسم"
              className="pr-9"
              maxLength={60}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">الجهاز</th>
                <th className="px-5 py-3 font-bold">MAC Address</th>
                <th className="px-5 py-3 font-bold">الحالة</th>
                <th className="px-5 py-3 font-bold">قائمة التشغيل</th>
                <th className="px-5 py-3 font-bold">تاريخ التسجيل</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-semibold">{d.name ?? "بدون اسم"}</td>
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {d.mac}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3">{playlistName(d.playlistId)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{d.createdAt}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="ربط قائمة تشغيل"
                        onClick={() => {
                          setLinkTarget(d);
                          setLinkValue(d.playlistId ?? NONE);
                        }}
                      >
                        <Link2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={d.status === "blocked" ? "إلغاء الحظر" : "حظر الجهاز"}
                        onClick={() => {
                          const next = d.status === "blocked" ? "active" : "blocked";
                          updateDeviceStatus(d.id, next);
                          toast.success(next === "blocked" ? "تم حظر الجهاز" : "تم إلغاء حظر الجهاز");
                        }}
                      >
                        {d.status === "blocked" ? (
                          <ShieldCheck className="size-4 text-success" />
                        ) : (
                          <ShieldBan className="size-4 text-warning" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف الجهاز"
                        onClick={() => {
                          deleteDevice(d.id);
                          toast.success("تم حذف الجهاز");
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    لا توجد أجهزة مطابقة
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة جهاز جديد</DialogTitle>
            <DialogDescription>أدخل عنوان الماك أدرس الخاص بالجهاز.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mac">MAC Address</Label>
              <Input
                id="mac"
                dir="ltr"
                className="text-right font-mono"
                value={mac}
                maxLength={17}
                onChange={(e) => setMac(e.target.value)}
                placeholder="AA:BB:CC:11:22:33"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dname">اسم الجهاز (اختياري)</Label>
              <Input
                id="dname"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: جهاز الصالة"
              />
            </div>
            <div className="space-y-2">
              <Label>قائمة التشغيل</Label>
              <Select value={newPlaylist} onValueChange={setNewPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر قائمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>بدون قائمة</SelectItem>
                  {playlists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submitAdd}>حفظ الجهاز</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(linkTarget)} onOpenChange={(o) => !o && setLinkTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ربط قائمة تشغيل</DialogTitle>
            <DialogDescription>{linkTarget?.mac}</DialogDescription>
          </DialogHeader>
          <Select value={linkValue} onValueChange={setLinkValue}>
            <SelectTrigger>
              <SelectValue placeholder="اختر قائمة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>بدون قائمة</SelectItem>
              {playlists.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkTarget(null)}>
              إلغاء
            </Button>
            <Button onClick={submitLink}>تأكيد الربط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}