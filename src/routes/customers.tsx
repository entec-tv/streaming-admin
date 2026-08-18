import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, ShieldBan, ShieldCheck, Search, MonitorSmartphone, Tv, Trash2 } from "lucide-react";
import { z } from "zod";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Customer } from "@/services/types";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "إدارة العملاء — EN TEC Server" },
      {
        name: "description",
        content: "إضافة عملاء وربط أجهزتهم واشتراكاتهم.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CustomersPage />
    </RequireAuth>
  ),
});

const customerSchema = z.object({
  name: z.string().trim().min(2, { message: "الاسم مطلوب" }),
});

const macSchema = z
  .string()
  .trim()
  .regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: "صيغة الماك أدرس غير صحيحة (AA:BB:CC:11:22:33)" });

const NONE = "__none__";

function CustomersPage() {
  const navigate = useNavigate();
  const {
    customers,
    addCustomer,
    updateCustomerStatus,
    deleteCustomer,
  } = useData();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAction, setAlertAction] = useState<"delete" | "block" | "unblock" | "bulk-delete" | "bulk-block" | "bulk-unblock" | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  
  // Subscription addition state

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.subscriptions.some(s => (s.username ?? "").toLowerCase().includes(q)) || c.subscriptions.some(s => (s.macAddress || "").toLowerCase().includes(q))
    );
  }, [customers, query]);

  const openCreate = () => {
    setName("");
    setOpen(true);
  };

  const openEdit = (c: Customer) => {
    navigate({ to: "/customer/$customerId", params: { customerId: c._id } });
  };

  const submit = () => {
    const parsed = customerSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    
    addCustomer({
      name: parsed.data.name,
      subscriptions: [],
    });
    setOpen(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c._id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleConfirmAction = () => {
    if (!alertAction) return;
    
    if (alertAction === "delete" && targetId) {
      deleteCustomer(targetId);
    } else if (alertAction === "block" && targetId) {
      updateCustomerStatus(targetId, "blocked");
    } else if (alertAction === "unblock" && targetId) {
      updateCustomerStatus(targetId, "active");
    } else if (alertAction === "bulk-delete") {
      selectedIds.forEach(id => deleteCustomer(id));
      setSelectedIds([]);
    } else if (alertAction === "bulk-block") {
      selectedIds.forEach(id => updateCustomerStatus(id, "blocked"));
      setSelectedIds([]);
    } else if (alertAction === "bulk-unblock") {
      selectedIds.forEach(id => updateCustomerStatus(id, "active"));
      setSelectedIds([]);
    }
    setAlertOpen(false);
  };
  
  const confirmAction = (action: typeof alertAction, id?: string, name?: string) => {
    setAlertAction(action);
    if (id) setTargetId(id);
    if (name) setTargetName(name);
    setAlertOpen(true);
  };

  return (
    <AppShell
      title="إدارة العملاء"
      description="إدارة العملاء وربط أجهزتهم المتعددة واشتراكاتهم"
      actions={
        <Button className="font-bold" onClick={openCreate}>
          <Plus /> إضافة عميل
        </Button>
      }
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-extrabold">قائمة العملاء ({filtered.length})</h2>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-md">
                <span className="text-sm font-bold text-primary">{selectedIds.length} محدد</span>
                <div className="h-4 w-px bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-7 px-2 text-warning hover:text-warning hover:bg-warning/10" onClick={() => confirmAction("bulk-block")}>
                  <ShieldBan className="size-3.5 ml-1" /> حظر
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-success hover:text-success hover:bg-success/10" onClick={() => confirmAction("bulk-unblock")}>
                  <ShieldCheck className="size-3.5 ml-1" /> إلغاء حظر
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => confirmAction("bulk-delete")}>
                  <Trash2 className="size-3.5 ml-1" /> حذف
                </Button>
              </div>
            )}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو اليوزرنيم أو الماك أدرس"
              className="pr-9"
              maxLength={60}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-5 py-3 w-10">
                  <Checkbox 
                    checked={selectedIds.length === filtered.length && filtered.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                    aria-label="تحديد الكل"
                  />
                </th>
                <th className="px-5 py-3 font-bold">اسم العميل</th>
                <th className="px-5 py-3 font-bold">عدد الاشتراكات</th>
                <th className="px-5 py-3 font-bold">عدد الأجهزة</th>
                <th className="px-5 py-3 font-bold">حالة العميل</th>
                <th className="px-5 py-3 font-bold">آخر ظهور (أحدث جهاز)</th>
                <th className="px-5 py-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <Checkbox 
                      checked={selectedIds.includes(c._id)} 
                      onCheckedChange={() => toggleSelect(c._id)} 
                      aria-label={`تحديد ${c.name}`}
                    />
                  </td>
                  <td className="px-5 py-3 font-bold">{c.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Tv className="size-4 text-muted-foreground" />
                      <span className="font-bold text-primary">{c.subscriptions?.length || 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <MonitorSmartphone className="size-4 text-muted-foreground" />
                      <span className="font-bold">{c.subscriptions.length}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {c.subscriptions.length > 0 
                      ? [...c.subscriptions].sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime())[0].lastActive || "-"
                      : "لا يوجد أجهزة"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="تعديل العميل"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={c.status === "blocked" ? "إلغاء الحظر" : "حظر العميل"}
                        onClick={() => {
                          const next = c.status === "blocked" ? "unblock" : "block";
                          confirmAction(next, c._id, c.name);
                        }}
                      >
                        {c.status === "blocked" ? (
                          <ShieldCheck className="size-4 text-success" />
                        ) : (
                          <ShieldBan className="size-4 text-warning" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="حذف العميل"
                        onClick={() => confirmAction("delete", c._id, c.name)}
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
                    لا يوجد عملاء مطابقين
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
            <DialogDescription>أدخل اسم العميل لإنشاء حساب جديد.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم العميل</Label>
              <Input
                id="name"
                className="text-right"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد عبد الله"
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button onClick={submit} className="w-full">إنشاء العميل</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإجراء</AlertDialogTitle>
            <AlertDialogDescription>
              {alertAction === "delete" && `هل أنت متأكد من رغبتك في حذف العميل "${targetName}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
              {alertAction === "block" && `هل أنت متأكد من رغبتك في حظر العميل "${targetName}"؟`}
              {alertAction === "unblock" && `هل أنت متأكد من رغبتك في إلغاء حظر العميل "${targetName}"؟`}
              {alertAction === "bulk-delete" && `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} عميل؟ هذا الإجراء لا يمكن التراجع عنه.`}
              {alertAction === "bulk-block" && `هل أنت متأكد من رغبتك في حظر ${selectedIds.length} عميل؟`}
              {alertAction === "bulk-unblock" && `هل أنت متأكد من رغبتك في إلغاء حظر ${selectedIds.length} عميل؟`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:space-x-reverse sm:flex-row justify-start gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={alertAction?.includes("delete") ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}