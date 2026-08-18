import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Pencil, Plus, ShieldBan, ShieldCheck, Trash2, MonitorSmartphone, Tv, ArrowRight, Save, User, Settings, RefreshCw } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useData } from "@/store/data-store";
import { useAuth } from "@/store/auth";
import { api } from "@/services/api";

export const Route = createFileRoute("/customer/$customerId")({
  head: () => ({
    meta: [
      { title: "تفاصيل العميل — EN TEC Server" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CustomerDetailsPage />
    </RequireAuth>
  ),
});

const macSchema = z.string().trim().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, { message: "تنسيق الماك أدرس غير صحيح (AA:BB:CC:11:22:33)" });
const customerSchema = z.object({ name: z.string().trim().min(2, "الاسم قصير جداً") });
const NONE = "__none__";

function CustomerDetailsPage() {
  const { customerId } = Route.useParams();
  const navigate = Route.useNavigate();
  const {
    customers,
    hosts,
    updateCustomer,
    hostName
  } = useData();
  const { isAuthed } = useAuth();

  const handleRefreshApp = async (macAddress: string) => {
    try {
      const res = await api.post(`/client/devices/${macAddress}/refresh`);
      if (res.status === 200 || res.status === 201) {
        toast.success("تم إرسال أمر التحديث لتطبيق العميل بنجاح");
      } else {
        toast.error("فشل في إرسال أمر التحديث");
      }
    } catch (err) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };

  const customer = useMemo(() => customers.find((c) => c._id === customerId), [customers, customerId]);

  const [name, setName] = useState("");
  
  useEffect(() => {
    if (customer) {
      setName(customer.name);
    }
  }, [customer]);

  // Shared form states
  const [subUsername, setSubUsername] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [subHostId, setSubHostId] = useState<string>(NONE);
  const [newMac, setNewMac] = useState("");
  const [newDeviceKey, setNewDeviceKey] = useState("");
  const [newAppActive, setNewAppActive] = useState<"true"|"false">("true");
  const [newAppExpiryOption, setNewAppExpiryOption] = useState<string>("never");
  const [newAppExpiryDate, setNewAppExpiryDate] = useState<string>("");

  // Modals state
  const [isFullAddOpen, setIsFullAddOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [editingMac, setEditingMac] = useState<string | null>(null);
  const [targetMac, setTargetMac] = useState<string | null>(null);
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);

  const groupedDevices = useMemo(() => {
    if (!customer?.subscriptions) return [];
    const groups: Record<string, { macAddress: string, deviceKey: string, appActive: boolean, appExpiry: string | null, lastActive: string, subs: (any & { originalIndex: number })[] }> = {};
    
    customer.subscriptions.forEach((s, idx) => {
      const mac = s.macAddress || 'unknown';
      if (!groups[mac]) {
        groups[mac] = {
          macAddress: mac,
          deviceKey: s.deviceKey,
          appActive: s.appActive !== false,
          appExpiry: s.appExpiry || null,
          lastActive: s.lastActive || "",
          subs: []
        };
      }
      groups[mac].subs.push({ ...s, originalIndex: idx });
    });
    
    return Object.values(groups);
  }, [customer]);

  if (!customer) {
    return (
      <AppShell title="تفاصيل العميل" description="إدارة العميل">
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <p className="text-muted-foreground">العميل الذي تبحث عنه غير موجود.</p>
          <Button asChild><Link to="/customers">العودة لقائمة العملاء</Link></Button>
        </div>
      </AppShell>
    );
  }

  const handleUpdateName = () => {
    const parsed = customerSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    updateCustomer(customer._id, { name: parsed.data.name });
    toast.success("تم تحديث اسم العميل");
  };

  const getParsedExpiry = () => {
    let appExpiry = null;
    if (newAppExpiryOption !== "never") {
      if (newAppExpiryOption === "custom") {
        if (!newAppExpiryDate) {
          toast.error("يرجى تحديد تاريخ الانتهاء");
          return undefined; // signals error
        }
        appExpiry = new Date(newAppExpiryDate);
      } else {
        const d = new Date();
        if (newAppExpiryOption === "1_day") d.setDate(d.getDate() + 1);
        if (newAppExpiryOption === "1_week") d.setDate(d.getDate() + 7);
        if (newAppExpiryOption === "2_weeks") d.setDate(d.getDate() + 14);
        if (newAppExpiryOption === "1_month") d.setMonth(d.getMonth() + 1);
        if (newAppExpiryOption === "1_year") d.setFullYear(d.getFullYear() + 1);
        appExpiry = d;
      }
    }
    return appExpiry;
  };

  const handleSaveFullAdd = () => {
    if (!subUsername.trim() || subHostId === NONE) {
      toast.error("يرجى تعبئة اليوزرنيم، واختيار السيرفر");
      return;
    }
    const pMac = macSchema.safeParse(newMac);
    if (!pMac.success) {
      toast.error(pMac.error.issues[0].message);
      return;
    }
    if (!newDeviceKey || newDeviceKey.length < 6) {
      toast.error("مفتاح Device Key مطلوب (6 أرقام على الأقل)");
      return;
    }

    const appExpiry = getParsedExpiry();
    if (appExpiry === undefined) return; // Error occurred

    const newSub = {
      username: subUsername.trim(),
      password: subPassword.trim(),
      host: subHostId,
      status: "active" as const,
      macAddress: newMac,
      deviceKey: newDeviceKey,
      appActive: newAppActive === "true",
      appExpiry: appExpiry ? appExpiry.toISOString() : null,
    };

    const updatedSubs = [...customer.subscriptions].map(s => ({
      ...s,
      host: typeof s.host === 'string' ? s.host : (s.host?._id || '')
    }));
    updatedSubs.push(newSub);

    updateCustomer(customer._id, { subscriptions: updatedSubs });
    setIsFullAddOpen(false);
  };

  const handleSaveDeviceEdit = () => {
    const pMac = macSchema.safeParse(newMac);
    if (!pMac.success) {
      toast.error(pMac.error.issues[0].message);
      return;
    }
    if (!newDeviceKey || newDeviceKey.length < 6) {
      toast.error("مفتاح Device Key مطلوب (6 أرقام على الأقل)");
      return;
    }

    const appExpiry = getParsedExpiry();
    if (appExpiry === undefined) return; // Error occurred

    const updatedSubs = [...customer.subscriptions].map(s => {
      let mappedHost = typeof s.host === 'string' ? s.host : (s.host?._id || '');
      if (s.macAddress === editingMac) {
        return {
          ...s,
          host: mappedHost,
          macAddress: newMac,
          deviceKey: newDeviceKey,
          appActive: newAppActive === "true",
          appExpiry: appExpiry ? appExpiry.toISOString() : null,
        };
      }
      return { ...s, host: mappedHost };
    });

    updateCustomer(customer._id, { subscriptions: updatedSubs });
    setIsEditDeviceOpen(false);
  };

  const handleSaveSubOnly = () => {
    if (!subUsername.trim() || subHostId === NONE) {
      toast.error("يرجى تعبئة اليوزرنيم، واختيار السيرفر");
      return;
    }

    const updatedSubs = [...customer.subscriptions].map(s => ({
      ...s,
      host: typeof s.host === 'string' ? s.host : (s.host?._id || '')
    }));

    if (editingSubIdx !== null) {
      // Edit existing sub
      updatedSubs[editingSubIdx] = {
        ...updatedSubs[editingSubIdx],
        username: subUsername.trim(),
        password: subPassword.trim(),
        host: subHostId,
      };
    } else {
      // Add new sub to targetMac
      const dev = groupedDevices.find(d => d.macAddress === targetMac);
      if (!dev) return;

      const newSub = {
        username: subUsername.trim(),
        password: subPassword.trim(),
        host: subHostId,
        status: "active" as const,
        macAddress: dev.macAddress,
        deviceKey: dev.deviceKey,
        appActive: dev.appActive,
        appExpiry: dev.appExpiry,
      };
      updatedSubs.push(newSub);
    }

    updateCustomer(customer._id, { subscriptions: updatedSubs });
    setIsSubModalOpen(false);
  };

  const handleOpenFullAdd = () => {
    setSubUsername(""); setSubPassword(""); setSubHostId(NONE);
    setNewMac(""); setNewDeviceKey("");
    setNewAppActive("true"); setNewAppExpiryOption("never"); setNewAppExpiryDate("");
    setIsFullAddOpen(true);
  };

  const handleOpenEditDevice = (mac: string) => {
    const dev = groupedDevices.find(d => d.macAddress === mac);
    if (!dev) return;
    setEditingMac(mac);
    setNewMac(dev.macAddress);
    setNewDeviceKey(dev.deviceKey);
    setNewAppActive(dev.appActive ? "true" : "false");
    if (!dev.appExpiry) {
      setNewAppExpiryOption("never");
      setNewAppExpiryDate("");
    } else {
      setNewAppExpiryOption("custom");
      setNewAppExpiryDate(new Date(dev.appExpiry).toISOString().split('T')[0]);
    }
    setIsEditDeviceOpen(true);
  };

  const handleOpenAddSub = (mac: string) => {
    setTargetMac(mac);
    setEditingSubIdx(null);
    setSubUsername(""); setSubPassword(""); setSubHostId(NONE);
    setIsSubModalOpen(true);
  };

  const handleOpenEditSub = (idx: number) => {
    const s = customer.subscriptions[idx];
    setEditingSubIdx(idx);
    setSubUsername(s.username);
    setSubPassword(s.password || "");
    setSubHostId(typeof s.host === 'string' ? s.host : (s.host?._id || NONE));
    setIsSubModalOpen(true);
  };

  const handleRemoveSubscription = (subIdx: number) => {
    const updatedSubs = customer.subscriptions.filter((_, idx) => idx !== subIdx).map(s => ({
        ...s,
        host: typeof s.host === 'string' ? s.host : (s.host?._id || '')
    }));
    updateCustomer(customer._id, { subscriptions: updatedSubs });
  };
  
  const handleToggleSubStatus = (subIdx: number) => {
    const updatedSubs = [...customer.subscriptions].map(s => ({
        ...s,
        host: typeof s.host === 'string' ? s.host : (s.host?._id || '')
    }));
    updatedSubs[subIdx].status = updatedSubs[subIdx].status === 'active' ? 'blocked' : 'active';
    updateCustomer(customer._id, { subscriptions: updatedSubs });
  };

  const formatMacForDisplay = (mac: string) => {
    if (mac.length === 12 && !mac.includes(':')) {
      return mac.match(/.{1,2}/g)?.join(':') || mac;
    }
    return mac;
  };

  return (
    <AppShell
      title="تفاصيل العميل"
      description={`إدارة اشتراكات وأجهزة العميل: ${customer.name}`}
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenFullAdd} className="bg-primary hover:bg-primary/90 text-black font-bold">
            <Plus className="mr-2" /> إضافة جهاز جديد
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: '/customers' })}>
            <ArrowRight className="mr-2" /> العودة
          </Button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="surface-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <User className="text-primary size-5" />
            <h3 className="font-bold">البيانات الأساسية</h3>
          </div>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>اسم العميل</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <Button onClick={handleUpdateName}>
              <Save className="mr-2 size-4" /> حفظ التغييرات
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="text-primary size-5" />
            <h2 className="text-xl font-bold">الأجهزة والاشتراكات ({groupedDevices.length})</h2>
          </div>

          {groupedDevices.map((dev) => (
            <Card key={dev.macAddress} className="surface-card overflow-hidden border border-white/5">
              {/* Device Header */}
              <div className="bg-muted/30 border-b border-border/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                    <Tv className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-lg" dir="ltr">{formatMacForDisplay(dev.macAddress)}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold border border-primary/20">
                        Key: {dev.deviceKey}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">التطبيق:</span>
                        <span className={dev.appActive ? "text-success font-bold" : "text-destructive font-bold"}>
                          {dev.appActive ? "مفعل" : "غير مفعل"}
                        </span>
                        {dev.appActive && dev.appExpiry && (
                          <span className="text-xs text-muted-foreground bg-black/20 px-1.5 py-0.5 rounded">
                            حتى {new Date(dev.appExpiry).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs border-r border-border/50 pr-4">
                        آخر ظهور: <span dir="ltr">{dev.lastActive ? new Date(dev.lastActive).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRefreshApp(dev.macAddress)}>
                    <RefreshCw className="size-4 mr-2" /> تحديث التطبيق
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDevice(dev.macAddress)}>
                    <Settings className="size-4 mr-2" /> إعدادات الجهاز
                  </Button>
                  <Button size="sm" onClick={() => handleOpenAddSub(dev.macAddress)}>
                    <Plus className="size-4 mr-2" /> إضافة اشتراك
                  </Button>
                </div>
              </div>

              {/* Subscriptions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-black/20 text-xs text-muted-foreground border-b border-border/30">
                    <tr>
                      <th className="px-4 py-3 font-bold w-[25%]">السيرفر</th>
                      <th className="px-4 py-3 font-bold w-[35%]">اليوزرنيم</th>
                      <th className="px-4 py-3 font-bold w-[15%]">الحالة</th>
                      <th className="px-4 py-3 font-bold text-center w-[25%]">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dev.subs.map((s) => (
                      <tr key={s.originalIndex} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/15 px-2 py-1 font-bold text-primary inline-block text-xs">
                            {hostName(s.host ? (typeof s.host === 'string' ? s.host : s.host._id) : null)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" dir="ltr">{s.username}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEditSub(s.originalIndex)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={s.status === 'blocked' ? "تفعيل" : "حظر"} onClick={() => handleToggleSubStatus(s.originalIndex)}>
                              {s.status === "blocked" ? <ShieldCheck className="size-4 text-success" /> : <ShieldBan className="size-4 text-warning" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSubscription(s.originalIndex)}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dev.subs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                          لا يوجد اشتراكات قنوات (سيرفرات) مضافة لهذا الجهاز.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {groupedDevices.length === 0 && (
            <div className="text-center py-12 bg-muted/10 rounded-xl border border-dashed border-border/50 text-muted-foreground">
              لا يوجد أي أجهزة أو اشتراكات لهذا العميل بعد. أضف جهازاً جديداً لتبدأ.
            </div>
          )}
        </div>

        {/* MODAL: Full Add (New Device) */}
        <Dialog open={isFullAddOpen} onOpenChange={setIsFullAddOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tv className="text-primary size-5" />
                <span>إضافة جهاز جديد مع اشتراك سيرفر</span>
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2 mt-4">
              <div className="space-y-1">
                <Label>السيرفر (Host)</Label>
                <Select value={subHostId} onValueChange={setSubHostId}>
                  <SelectTrigger><SelectValue placeholder="اختر السيرفر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>اختر...</SelectItem>
                    {hosts.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>اليوزرنيم</Label>
                <Input dir="ltr" className="font-mono text-right" value={subUsername} onChange={e => setSubUsername(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>كلمة المرور</Label>
                <Input dir="ltr" className="font-mono text-right" value={subPassword} onChange={e => setSubPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>الماك أدرس (MAC)</Label>
                <Input dir="ltr" className="font-mono text-right" placeholder="AA:BB:CC:11:22:33" value={newMac} onChange={e => setNewMac(e.target.value)} maxLength={17} />
              </div>
              <div className="space-y-1">
                <Label>مفتاح الجهاز (Device Key)</Label>
                <Input dir="ltr" className="font-mono text-right text-primary font-bold" placeholder="123456" value={newDeviceKey} onChange={e => setNewDeviceKey(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-1">
                <Label>تفعيل التطبيق</Label>
                <Select value={newAppActive} onValueChange={(val: any) => setNewAppActive(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفعل</SelectItem>
                    <SelectItem value="false">غير مفعل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>مدة تفعيل التطبيق</Label>
                <Select value={newAppExpiryOption} onValueChange={(val: any) => setNewAppExpiryOption(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">لا تنتهي</SelectItem>
                    <SelectItem value="1_day">يوم واحد</SelectItem>
                    <SelectItem value="1_week">أسبوع واحد</SelectItem>
                    <SelectItem value="2_weeks">أسبوعين</SelectItem>
                    <SelectItem value="1_month">شهر واحد</SelectItem>
                    <SelectItem value="1_year">سنة واحدة</SelectItem>
                    <SelectItem value="custom">تاريخ محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newAppExpiryOption === "custom" && (
                <div className="space-y-1 sm:col-span-2">
                  <Label>تاريخ الانتهاء المحدد</Label>
                  <Input type="date" value={newAppExpiryDate} onChange={e => setNewAppExpiryDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveFullAdd} variant="secondary">
                <Plus className="mr-2 size-4" /> إضافة الجهاز والاشتراك
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: Edit Device */}
        <Dialog open={isEditDeviceOpen} onOpenChange={setIsEditDeviceOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="text-primary size-5" />
                <span>إعدادات الجهاز والتفعيل</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>الماك أدرس (MAC)</Label>
                <Input dir="ltr" className="font-mono text-right" placeholder="AA:BB:CC:11:22:33" value={newMac} onChange={e => setNewMac(e.target.value)} maxLength={17} />
              </div>
              <div className="space-y-1">
                <Label>مفتاح الجهاز (Device Key)</Label>
                <Input dir="ltr" className="font-mono text-right text-primary font-bold" placeholder="123456" value={newDeviceKey} onChange={e => setNewDeviceKey(e.target.value)} maxLength={20} />
              </div>
              <div className="space-y-1">
                <Label>تفعيل التطبيق</Label>
                <Select value={newAppActive} onValueChange={(val: any) => setNewAppActive(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">مفعل</SelectItem>
                    <SelectItem value="false">غير مفعل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>مدة تفعيل التطبيق</Label>
                <Select value={newAppExpiryOption} onValueChange={(val: any) => setNewAppExpiryOption(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">لا تنتهي</SelectItem>
                    <SelectItem value="1_day">يوم واحد</SelectItem>
                    <SelectItem value="1_week">أسبوع واحد</SelectItem>
                    <SelectItem value="2_weeks">أسبوعين</SelectItem>
                    <SelectItem value="1_month">شهر واحد</SelectItem>
                    <SelectItem value="1_year">سنة واحدة</SelectItem>
                    <SelectItem value="custom">تاريخ محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newAppExpiryOption === "custom" && (
                <div className="space-y-1">
                  <Label>تاريخ الانتهاء المحدد</Label>
                  <Input type="date" value={newAppExpiryDate} onChange={e => setNewAppExpiryDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveDeviceEdit} variant="secondary">
                <Save className="mr-2 size-4" /> حفظ التعديلات
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: Add/Edit Sub Only */}
        <Dialog open={isSubModalOpen} onOpenChange={setIsSubModalOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tv className="text-primary size-5" />
                <span>{editingSubIdx !== null ? "تعديل اشتراك السيرفر" : "إضافة اشتراك سيرفر"}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1">
                <Label>السيرفر (Host)</Label>
                <Select value={subHostId} onValueChange={setSubHostId}>
                  <SelectTrigger><SelectValue placeholder="اختر السيرفر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>اختر...</SelectItem>
                    {hosts.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>اليوزرنيم</Label>
                <Input dir="ltr" className="font-mono text-right" value={subUsername} onChange={e => setSubUsername(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>كلمة المرور</Label>
                <Input dir="ltr" className="font-mono text-right" value={subPassword} onChange={e => setSubPassword(e.target.value)} />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSaveSubOnly} variant="secondary">
                <Save className="mr-2 size-4" /> حفظ
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </AppShell>
  );
}
