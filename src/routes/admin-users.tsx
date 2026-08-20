import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import type { AdminUser } from "@/services/types";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/admin-users")({
  head: () => ({
    meta: [
      { title: "مستخدمين اللوحة — EN TEC Server" },
      {
        name: "description",
        content: "إدارة الحسابات التي لها صلاحية الدخول للوحة التحكم.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AdminUsersPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  username: z.string().trim().min(3, { message: "اسم المستخدم يجب أن يكون 3 أحرف على الأقل" }).max(50),
  password: z.string().optional(),
  isCreating: z.boolean().optional(),
}).refine(data => {
  if (data.isCreating && (!data.password || data.password.length < 6)) {
    return false;
  }
  if (!data.isCreating && data.password && data.password.length < 6) {
    return false;
  }
  return true;
}, {
  message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  path: ["password"]
});

const empty = { username: "", password: "", isCreating: true };

function AdminUsersPage() {
  const { admins, addAdmin, updateAdmin, deleteAdmin } = useData();
  const { email } = useAuth(); // email holds the current admin username
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", password: "", isCreating: true });
    setOpen(true);
  };

  const openEdit = (a: AdminUser) => {
    setEditing(a);
    setForm({ username: a.username, password: "", isCreating: false });
    setOpen(true);
  };

  const submit = () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    
    if (editing) {
      const updateData: any = {};
      if (parsed.data.username !== editing.username) updateData.username = parsed.data.username;
      if (parsed.data.password) updateData.password = parsed.data.password;
      
      updateAdmin(editing._id, updateData);
    } else {
      if (!parsed.data.password) {
        toast.error("كلمة المرور مطلوبة");
        return;
      }
      addAdmin({ username: parsed.data.username, password: parsed.data.password });
    }
    setOpen(false);
  };

  const handleDelete = (a: AdminUser) => {
    if (a.username === email) {
      toast.error("لا يمكنك حذف الحساب الذي قمت بتسجيل الدخول به");
      return;
    }
    if (confirm(`هل أنت متأكد من حذف الحساب "${a.username}"؟`)) {
      deleteAdmin(a._id);
    }
  };

  return (
    <AppShell
      title="مستخدمين اللوحة"
      description="إدارة الحسابات التي لها صلاحية الدخول للوحة التحكم"
      actions={
        <Button className="font-bold" onClick={openCreate}>
          <Plus /> إضافة مستخدم
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="border-b border-border/70 px-5 py-4 flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <h2 className="text-base font-extrabold">المدراء ({admins.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">اسم المستخدم</th>
                <th className="px-5 py-3 font-bold">تاريخ الإضافة</th>
                <th className="px-5 py-3 font-bold">تاريخ التحديث</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-semibold flex items-center gap-2">
                    {a.username}
                    {a.username === email && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">أنت</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" title="تعديل" onClick={() => openEdit(a)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف"
                        onClick={() => handleDelete(a)}
                        disabled={a.username === email}
                      >
                        <Trash2 className={`size-4 ${a.username === email ? 'text-muted-foreground' : 'text-destructive'}`} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">
                    لا يوجد مدراء بعد
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
            <DialogTitle>{editing ? "تعديل حساب مدير" : "إضافة حساب مدير"}</DialogTitle>
            <DialogDescription>أدخل بيانات الدخول للحساب.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={form.username}
                maxLength={50}
                dir="ltr"
                className="text-right"
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="admin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور {editing && <span className="text-muted-foreground text-xs font-normal">(اتركه فارغاً إذا لم ترغب بتغييره)</span>}</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                className="text-right"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="******"
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
