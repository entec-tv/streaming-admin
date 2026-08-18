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
import type { Host } from "@/services/types";

export const Route = createFileRoute("/hosts")({
  head: () => ({
    meta: [
      { title: "السيرفرات — EN TEC Server" },
      {
        name: "description",
        content: "إضافة وتعديل وحذف سيرفرات IPTV (Host) وربطها بالأجهزة.",
      },
      { property: "og:title", content: "السيرفرات — EN TEC Server" },
      { property: "og:description", content: "إدارة مصادر البث المرتبطة بأجهزة العملاء." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <HostsPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, { message: "اسم السيرفر قصير جداً" }).max(60),
  url: z.string().trim().url({ message: "الرابط (Host) غير صالح" }).max(255),
});

const empty = { name: "", url: "" };

function HostsPage() {
  const { hosts, addHost, updateHost, deleteHost, customers } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Host | null>(null);
  const [form, setForm] = useState(empty);

  const getDevicesCount = (hostId: string) => {
    let count = 0;
    customers.forEach(c => {
      const subsForHost = c.subscriptions?.filter(s => 
        (typeof s.host === 'string' ? s.host : s.host?._id) === hostId
      ) || [];
      count += subsForHost.length;
    });
    return count;
  };

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Host) => {
    setEditing(p);
    setForm({ name: p.name, url: p.url });
    setOpen(true);
  };

  const submit = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (editing) {
      updateHost(editing._id, parsed.data);
      toast.success("تم تعديل السيرفر");
    } else {
      addHost(parsed.data);
      toast.success("تمت إضافة السيرفر");
    }
    setOpen(false);
  };

  return (
    <AppShell
      title="إدارة السيرفرات (Hosts)"
      description="مصادر البث المتاحة للأجهزة"
      actions={
        <Button className="font-bold" onClick={openCreate}>
          <Plus /> إضافة سيرفر
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">السيرفرات ({hosts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">اسم السيرفر</th>
                <th className="px-5 py-3 font-bold">الرابط (Host URL)</th>
                <th className="px-5 py-3 font-bold">الأجهزة المرتبطة</th>
                <th className="px-5 py-3 font-bold">تاريخ الإنشاء</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((p) => (
                <tr key={p._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {p.url}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
                      {getDevicesCount(p._id)} أجهزة
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
                          deleteHost(p._id);
                          toast.success("تم حذف السيرفر");
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {hosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    لا توجد سيرفرات بعد
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
            <DialogTitle>{editing ? "تعديل السيرفر" : "إضافة سيرفر"}</DialogTitle>
            <DialogDescription>أدخل بيانات الاتصال بالسيرفر.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pname">اسم السيرفر</Label>
              <Input
                id="pname"
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: السيرفر الرئيسي"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host">Host URL</Label>
              <Input
                id="host"
                dir="ltr"
                className="text-right font-mono"
                value={form.url}
                maxLength={255}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="http://tv.business-cdn-8k.com"
              />
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