import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
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
import { useData } from "@/store/data-store";
import type { Playlist } from "@/services/types";

export const Route = createFileRoute("/playlists")({
  head: () => ({
    meta: [
      { title: "قوائم التشغيل — EN TEC Server" },
      {
        name: "description",
        content: "إضافة وتعديل وحذف قوائم تشغيل IPTV (Host, Username, Password) وربطها بالأجهزة.",
      },
      { property: "og:title", content: "قوائم التشغيل — EN TEC Server" },
      { property: "og:description", content: "إدارة مصادر البث المرتبطة بأجهزة العملاء." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PlaylistsPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, { message: "اسم القائمة قصير جداً" }).max(60),
  host: z.string().trim().url({ message: "الرابط (Host) غير صالح" }).max(255),
  username: z.string().trim().min(2, { message: "اسم المستخدم مطلوب" }).max(80),
  password: z.string().trim().min(2, { message: "كلمة المرور مطلوبة" }).max(80),
});

const empty = { name: "", host: "", username: "", password: "" };

function PlaylistsPage() {
  const { playlists, addPlaylist, updatePlaylist, deletePlaylist, devicesCount } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Playlist | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Playlist) => {
    setEditing(p);
    setForm({ name: p.name, host: p.host, username: p.username, password: p.password });
    setOpen(true);
  };

  const submit = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (editing) {
      updatePlaylist(editing.id, parsed.data);
      toast.success("تم تعديل قائمة التشغيل");
    } else {
      addPlaylist(parsed.data);
      toast.success("تمت إضافة قائمة التشغيل");
    }
    setOpen(false);
  };

  return (
    <AppShell
      title="إدارة قوائم التشغيل"
      description="مصادر البث المتاحة للأجهزة"
      actions={
        <Button className="font-bold" onClick={openCreate}>
          <Plus /> إضافة قائمة
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">القوائم ({playlists.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">اسم القائمة</th>
                <th className="px-5 py-3 font-bold">الرابط (Host)</th>
                <th className="px-5 py-3 font-bold">اسم المستخدم</th>
                <th className="px-5 py-3 font-bold">الأجهزة المرتبطة</th>
                <th className="px-5 py-3 font-bold">تاريخ الإنشاء</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {playlists.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {p.host}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {p.username}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                      {devicesCount(p.id)} جهاز
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.createdAt}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف"
                        onClick={() => {
                          deletePlaylist(p.id);
                          toast.success("تم حذف قائمة التشغيل");
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {playlists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    لا توجد قوائم تشغيل بعد
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل قائمة التشغيل" : "إضافة قائمة تشغيل"}</DialogTitle>
            <DialogDescription>أدخل بيانات الاتصال بالسيرفر.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pname">اسم القائمة</Label>
              <Input
                id="pname"
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: الباقة الذهبية"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host">Host</Label>
              <Input
                id="host"
                dir="ltr"
                className="text-right font-mono"
                value={form.host}
                maxLength={255}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                placeholder="http://server.tv:8080"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user">Username</Label>
                <Input
                  id="user"
                  dir="ltr"
                  className="text-right font-mono"
                  value={form.username}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Password</Label>
                <Input
                  id="pass"
                  dir="ltr"
                  className="text-right font-mono"
                  value={form.password}
                  maxLength={80}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={submit}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}