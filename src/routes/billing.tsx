import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CircleDollarSign, Clock3, Download, Plus, ReceiptText, RotateCcw, Search, type LucideIcon } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/notifications";
import { api, endpoints } from "@/services/api";
import type { CreatePaymentInput, PaymentMethod, PaymentRecord, PaymentStatus, PaymentSummary } from "@/services/types";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data-store";
import { datedCsvFilename, downloadCsv } from "@/lib/csv-export";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "الفوترة والدفعات — EN TEC Server" }] }),
  component: () => (
    <RequireAuth>
      <BillingPage />
    </RequireAuth>
  ),
});

const paymentSchema = z.object({
  customerId: z.string().min(1, "اختر العميل"),
  subscriptionId: z.string().optional(),
  amount: z.coerce.number().finite().positive("أدخل مبلغًا صحيحًا أكبر من صفر").max(1_000_000_000),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "أدخل رمز عملة من 3 أحرف مثل SAR أو USD"),
  status: z.enum(["pending", "paid", "refunded", "cancelled"]),
  method: z.enum(["cash", "bank_transfer", "card", "online", "other"]),
  reference: z.string().trim().max(120),
  notes: z.string().trim().max(500),
});

type PaymentForm = {
  customerId: string;
  subscriptionId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference: string;
  notes: string;
};

const emptyForm: PaymentForm = {
  customerId: "",
  subscriptionId: "",
  amount: "",
  currency: "",
  status: "pending",
  method: "cash",
  reference: "",
  notes: "",
};

const statusLabels: Record<PaymentStatus, string> = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  refunded: "مسترد",
  cancelled: "ملغي",
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: "نقدًا",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  online: "دفع إلكتروني",
  other: "أخرى",
};

const allowedStatusOptions: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["pending", "paid", "cancelled"],
  paid: ["paid", "refunded"],
  refunded: ["refunded"],
  cancelled: ["cancelled"],
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency}`;
  }
}

function CurrencyTotalsCard({ title, values, icon: Icon }: { title: string; values: string[]; icon: LucideIcon }) {
  return (
    <Card className="surface-card border-border/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <span className="brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground"><Icon className="size-5" /></span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length ? values.map((value) => <span key={value} className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-sm font-bold">{value}</span>) : <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </Card>
  );
}

function BillingPage() {
  const { role } = useAuth();
  const { customers } = useData();
  const canAccess = role === "owner" || role === "admin";
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>({ ...emptyForm });

  useEffect(() => {
    if (!canAccess) return;
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([
      api.get(endpoints.billing, { params: { page, limit: 50, search, status: statusFilter === "all" ? undefined : statusFilter } }),
      api.get(endpoints.billingSummary),
    ])
      .then(([list, summaryResponse]) => {
        if (!active) return;
        setPayments(list.data.payments || []);
        setTotal(list.data.total || 0);
        setPages(list.data.pages || 0);
        setSummary(summaryResponse.data || []);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [canAccess, page, search, statusFilter, reloadKey]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const exportCurrentPaymentsPage = () => {
    downloadCsv(datedCsvFilename(`payments-page-${page}`), [
      "رقم السجل", "العميل", "الاشتراك", "المبلغ", "العملة", "طريقة الدفع", "الحالة", "المرجع", "سجلها", "تاريخ التسجيل", "تاريخ الدفع",
    ], payments.map((payment) => [
      payment._id,
      payment.customerName,
      payment.subscriptionLabel,
      payment.amount,
      payment.currency,
      methodLabels[payment.method] || payment.method,
      statusLabels[payment.status] || payment.status,
      payment.reference,
      payment.createdByUsername,
      payment.createdAt,
      payment.paidAt,
    ]));
  };

  const createPayment = async () => {
    const parsed = paymentSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "راجع بيانات الدفعة");
      return;
    }

    const input: CreatePaymentInput = {
      ...parsed.data,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      subscriptionId: parsed.data.subscriptionId || undefined,
      reference: parsed.data.reference || undefined,
      notes: parsed.data.notes || undefined,
    };
    setSaving(true);
    try {
      await api.post(endpoints.billing, input);
      toast.success("تم تسجيل الدفعة");
      setOpen(false);
      setForm({ ...emptyForm });
      if (page !== 1) setPage(1);
      else setReloadKey((value) => value + 1);
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.message || "تعذر تسجيل الدفعة");
    } finally {
      setSaving(false);
    }
  };

  const updatePaymentStatus = async (payment: PaymentRecord, nextStatus: PaymentStatus) => {
    if (payment.status === nextStatus) return;
    if ((nextStatus === "refunded" || nextStatus === "cancelled") && !window.confirm(`تأكيد تغيير حالة الدفعة إلى «${statusLabels[nextStatus]}»؟`)) return;
    setSavingId(payment._id);
    try {
      await api.patch(endpoints.billingStatus(payment._id), { status: nextStatus });
      toast.success("تم تحديث حالة الدفعة");
      setReloadKey((value) => value + 1);
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.message || "تعذر تحديث حالة الدفعة");
    } finally {
      setSavingId(null);
    }
  };

  if (!canAccess) {
    return (
      <AppShell title="الفوترة والدفعات" description="هذه الصفحة متاحة للمالك والمدير">
        <Card className="surface-card border-border/70 p-8 text-center text-muted-foreground">لا تملك صلاحية الاطلاع على سجلات الدفعات.</Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="الفوترة والدفعات" description="تسجيل الدفعات ومتابعة حالتها حسب العميل والعملة" actions={<Button className="font-bold" onClick={() => { setForm({ ...emptyForm }); setOpen(true); }}><Plus className="ml-2 size-4" /> تسجيل دفعة</Button>}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CurrencyTotalsCard title="المبالغ المحصلة" values={summary.filter((item) => item.paid > 0).map((item) => formatMoney(item.paid, item.currency))} icon={CircleDollarSign} />
        <CurrencyTotalsCard title="قيد الانتظار" values={summary.filter((item) => item.pending > 0).map((item) => formatMoney(item.pending, item.currency))} icon={Clock3} />
        <CurrencyTotalsCard title="المبالغ المستردة" values={summary.filter((item) => item.refunded > 0).map((item) => formatMoney(item.refunded, item.currency))} icon={RotateCcw} />
        <Card className="surface-card border-border/70 p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-muted-foreground">عدد سجلات الدفعات</p><p className="mt-2 text-3xl font-extrabold tracking-tight">{total}</p></div><span className="brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground"><ReceiptText className="size-5" /></span></div></Card>
      </div>

      <Card className="surface-card mt-6 border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-extrabold">سجل الدفعات ({total})</h2>
          <div className="flex flex-wrap gap-2">
            <form onSubmit={submitSearch} className="flex gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث بالعميل أو المرجع" className="w-56 pr-9" />
              </div>
              <Button type="submit" variant="outline" aria-label="بحث"><Search className="size-4" /></Button>
            </form>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCurrentPaymentsPage} disabled={payments.length === 0 || loading}>
              <Download className="ml-2 size-4" /> تصدير الصفحة الحالية
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-right text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="px-4 py-3 font-bold">العميل / الاشتراك</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">طريقة الدفع</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold">المرجع</th>
                <th className="px-4 py-3 font-bold">سجلها</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id} className="border-b border-border/50 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{payment.customerName}</span>
                    {payment.subscriptionLabel && <span className="block text-xs text-muted-foreground">{payment.subscriptionLabel}</span>}
                  </td>
                  <td className="px-4 py-3 font-bold" dir="ltr">{formatMoney(payment.amount, payment.currency)}</td>
                  <td className="px-4 py-3">{methodLabels[payment.method] || payment.method}</td>
                  <td className="px-4 py-3">
                    <Select value={payment.status} onValueChange={(value) => void updatePaymentStatus(payment, value as PaymentStatus)} disabled={savingId === payment._id || allowedStatusOptions[payment.status].length === 1}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {allowedStatusOptions[payment.status].map((status) => <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{payment.reference || "—"}</td>
                  <td className="px-4 py-3">{payment.createdByUsername}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(payment.createdAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">{loading ? "جارٍ تحميل الدفعات..." : error ? "تعذر تحميل سجل الدفعات" : "لا توجد دفعات مسجلة"}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border/70 px-5 py-3 text-sm text-muted-foreground">
          <span>صفحة {page} من {pages || 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>السابق</Button>
            <Button variant="outline" size="sm" disabled={page >= pages || pages === 0 || loading} onClick={() => setPage((value) => value + 1)}>التالي</Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة</DialogTitle>
            <DialogDescription>يُحفظ المبلغ كسجل يدوي، ولا يفعّل الاشتراك أو يمدد صلاحيته تلقائيًا.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>العميل</Label>
              <Select value={form.customerId} onValueChange={(value) => setForm((current) => ({ ...current, customerId: value, subscriptionId: "" }))}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>{customers.map((customer) => <SelectItem key={customer._id} value={customer._id}>{customer.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.customerId && (
              <div className="space-y-2">
                <Label>الاشتراك (اختياري)</Label>
                <Select value={form.subscriptionId || "none"} onValueChange={(value) => setForm({ ...form, subscriptionId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="بدون ربط باشتراك محدد" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون ربط باشتراك محدد</SelectItem>
                    {customers.find((customer) => customer._id === form.customerId)?.subscriptions.filter((subscription) => Boolean(subscription._id)).map((subscription) => (
                      <SelectItem key={subscription._id} value={subscription._id!}>
                        {subscription.playlistName || `اشتراك ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="payment-amount">المبلغ</Label><Input id="payment-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="payment-currency">رمز العملة</Label><Input id="payment-currency" maxLength={3} dir="ltr" placeholder="SAR" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>الحالة</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as PaymentStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">قيد الانتظار</SelectItem><SelectItem value="paid">مدفوع</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>طريقة الدفع</Label><Select value={form.method} onValueChange={(value) => setForm({ ...form, method: value as PaymentMethod })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">نقدًا</SelectItem><SelectItem value="bank_transfer">تحويل بنكي</SelectItem><SelectItem value="card">بطاقة</SelectItem><SelectItem value="online">دفع إلكتروني</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="payment-reference">رقم المرجع (اختياري)</Label><Input id="payment-reference" maxLength={120} value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="payment-notes">ملاحظات (اختياري)</Label><Input id="payment-notes" maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={() => void createPayment()} disabled={saving}>{saving ? "جارٍ التسجيل..." : "تسجيل الدفعة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
