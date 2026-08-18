import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
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
import type { AppPlan } from "@/services/types";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "باقات التطبيق — EN TEC Server" },
      {
        name: "description",
        content: "إدارة الباقات والأسعار لتنشيط التطبيق.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <PlansPage />
    </RequireAuth>
  ),
});

const schema = z.object({
  name: z.string().trim().min(2, { message: "اسم الباقة قصير جداً" }),
  price: z.string().trim().min(1, { message: "يجب إدخال السعر" }),
  duration: z.string().trim().min(1, { message: "يجب إدخال المدة" }),
  features: z.array(z.string().trim().min(1)),
  isPopular: z.boolean(),
  isActive: z.boolean(),
});

const empty = { name: "", price: "", duration: "", features: [""], isPopular: false, isActive: true };

function PlansPage() {
  const { plans, addPlan, updatePlan, deletePlan } = useData();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AppPlan | null>(null);
  const [form, setForm] = useState(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: AppPlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: p.price,
      duration: p.duration,
      features: p.features.length ? p.features : [""],
      isPopular: p.isPopular,
      isActive: p.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    // filter out empty features
    const cleanedFeatures = form.features.filter(f => f.trim().length > 0);
    const parsed = schema.safeParse({ ...form, features: cleanedFeatures });
    
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (editing) {
      updatePlan(editing._id, parsed.data);
      toast.success("تم تعديل الباقة");
    } else {
      addPlan(parsed.data);
      toast.success("تمت إضافة الباقة");
    }
    setOpen(false);
  };

  const addFeatureRow = () => {
    setForm({ ...form, features: [...form.features, ""] });
  };

  const updateFeature = (index: number, val: string) => {
    const newFeatures = [...form.features];
    newFeatures[index] = val;
    setForm({ ...form, features: newFeatures });
  };

  const removeFeature = (index: number) => {
    const newFeatures = form.features.filter((_, i) => i !== index);
    setForm({ ...form, features: newFeatures });
  };

  return (
    <AppShell
      title="باقات التطبيق"
      description="إدارة باقات تنشيط التطبيق وأسعارها المعروضة للعملاء"
      actions={
        <Button className="font-bold" onClick={openCreate}>
          <Plus /> إضافة باقة
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">الباقات المتاحة ({plans.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 font-bold">اسم الباقة</th>
                <th className="px-5 py-3 font-bold">السعر</th>
                <th className="px-5 py-3 font-bold">المدة</th>
                <th className="px-5 py-3 font-bold">الحالة</th>
                <th className="px-5 py-3 font-bold">الأكثر طلباً</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3 font-semibold">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" dir="ltr">
                    {p.price}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.duration}</td>
                  <td className="px-5 py-3">
                    {p.isActive ? (
                      <span className="rounded-full bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-500">مفعلة</span>
                    ) : (
                      <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-500">معطلة</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {p.isPopular ? <Check className="text-primary size-5" /> : null}
                  </td>
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
                          deletePlan(p._id);
                          toast.success("تم حذف الباقة");
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    لا توجد باقات مضافة
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
            <DialogDescription>أدخل تفاصيل الباقة التي ستظهر للعملاء.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="pname">اسم الباقة</Label>
              <Input
                id="pname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: الباقة الذهبية"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">السعر</Label>
                <Input
                  id="price"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="مثال: 100 دولار"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">المدة</Label>
                <Input
                  id="duration"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="مثال: 12 شهر"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Label>مميزات الباقة</Label>
              {form.features.map((feat, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    value={feat}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    placeholder={`الميزة رقم ${idx + 1}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeFeature(idx)}>
                    <X className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addFeatureRow}>
                <Plus className="size-4 ml-2" /> إضافة ميزة أخرى
              </Button>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isPop" 
                  checked={form.isPopular} 
                  onChange={(e) => setForm({...form, isPopular: e.target.checked})} 
                  className="size-4"
                />
                <Label htmlFor="isPop" className="cursor-pointer">تحديد كـ "الأكثر طلباً"</Label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isAct" 
                  checked={form.isActive} 
                  onChange={(e) => setForm({...form, isActive: e.target.checked})} 
                  className="size-4"
                />
                <Label htmlFor="isAct" className="cursor-pointer">تفعيل الباقة وظهورها للعملاء</Label>
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
