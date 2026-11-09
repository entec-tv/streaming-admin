import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/notifications";
import { Pencil, Plus, ShieldBan, ShieldCheck, Search, MonitorSmartphone, Tv, Trash2, Settings, Smartphone, CalendarClock, MoreHorizontal, ListPlus, Power, LockKeyhole } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/store/data-store";
import type { Customer } from "@/services/types";
import { api } from "@/services/api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatMacAddress } from "@/lib/utils";
import { useAuth } from "@/store/auth";

export const Route = createFileRoute("/customers")({
  validateSearch: (search: Record<string, unknown>) => ({
    addDevice: typeof search.addDevice === "string" ? search.addDevice : undefined,
    devices: typeof search.devices === "string" ? search.devices : undefined,
  }),
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
const CUSTOM_OPTION = "__custom__";

function CustomersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const {
    customers,
    hosts,
    addCustomer,
    updateCustomer,
    updateCustomerStatus,
    deleteCustomer,
    revokeDevice,
  } = useData();
  const { role } = useAuth();
  const canManage = role === "owner" || role === "admin";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [name, setName] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAction, setAlertAction] = useState<"delete" | "block" | "unblock" | "bulk-delete" | "bulk-block" | "bulk-unblock" | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  const [devicesCustomer, setDevicesCustomer] = useState<Customer | null>(null);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [deviceStatusFilter, setDeviceStatusFilter] = useState<"all" | "active" | "attention">("all");
  const [addDeviceCustomer, setAddDeviceCustomer] = useState<Customer | null>(null);
  const [addingSubscriptionToDevice, setAddingSubscriptionToDevice] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<{ index: number; subscription: Customer["subscriptions"][number] } | null>(null);
  const [editSubUsername, setEditSubUsername] = useState("");
  const [editSubPlaylistName, setEditSubPlaylistName] = useState("");
  const [editSubPassword, setEditSubPassword] = useState("");
  const [editSubLock, setEditSubLock] = useState(false);
  const [editSubPin, setEditSubPin] = useState("");
  const [editSubHost, setEditSubHost] = useState(NONE);
  const [editSubCustomHost, setEditSubCustomHost] = useState("");
  const [editSubStatus, setEditSubStatus] = useState<"active" | "blocked">("active");
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<number | null>(null);
  const [subUsername, setSubUsername] = useState("");
  const [subPlaylistName, setSubPlaylistName] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [lockNewPlaylist, setLockNewPlaylist] = useState(false);
  const [newPlaylistPin, setNewPlaylistPin] = useState("");
  const [subHostId, setSubHostId] = useState<string>(NONE);
  const [customHostUrl, setCustomHostUrl] = useState("");
  const [newMac, setNewMac] = useState("");
  const [newDeviceKey, setNewDeviceKey] = useState("");
  const [newAppActive, setNewAppActive] = useState<"true" | "false">("true");
  const [newAppExpiryOption, setNewAppExpiryOption] = useState("1_week");
  const [newAppExpiryDate, setNewAppExpiryDate] = useState("");
  const [expiryDevice, setExpiryDevice] = useState<ReturnType<typeof getCustomerDevices>[number] | null>(null);
  const [deviceExpiryOption, setDeviceExpiryOption] = useState("1_week");
  const [deviceExpiryDate, setDeviceExpiryDate] = useState("");
  const [editingDevice, setEditingDevice] = useState<ReturnType<typeof getCustomerDevices>[number] | null>(null);
  const [editDeviceMac, setEditDeviceMac] = useState("");
  const [editDeviceKey, setEditDeviceKey] = useState("");
  const [editDeviceAppActive, setEditDeviceAppActive] = useState("true");
  const [editDeviceExpiryOption, setEditDeviceExpiryOption] = useState("never");
  const [editDeviceExpiryDate, setEditDeviceExpiryDate] = useState("");
  const [deviceToDelete, setDeviceToDelete] = useState<NonNullable<typeof expiryDevice> | null>(null);
  const [deletingDevice, setDeletingDevice] = useState(false);
  const [playlistDevice, setPlaylistDevice] = useState<ReturnType<typeof getCustomerDevices>[number] | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistInspection, setPlaylistInspection] = useState<{ macAddress: string; playlists: { name: string; url: string; isLocked: boolean }[] } | null>(null);
  const [savingDeviceAction, setSavingDeviceAction] = useState(false);
  
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

  const openAddDevice = (customer: Customer) => {
    setAddingSubscriptionToDevice(false);
    setSubUsername("");
    setSubPlaylistName("");
    setSubPassword("");
    setLockNewPlaylist(false);
    setNewPlaylistPin("");
    setSubHostId(NONE);
    setCustomHostUrl("");
    setNewMac("");
    setNewDeviceKey("");
    setNewAppActive("true");
    setNewAppExpiryOption("1_week");
    setNewAppExpiryDate("");
    setAddDeviceCustomer(customer);
  };

  useEffect(() => {
    const targetId = search.addDevice || search.devices;
    if (!targetId) return;
    const customer = customers.find((item) => item._id === targetId);
    if (!customer) return;
    if (search.addDevice) openAddDevice(customer);
    else setDevicesCustomer(customer);
    void navigate({ search: { addDevice: undefined, devices: undefined }, replace: true });
  }, [customers, navigate, search.addDevice, search.devices]);

  const openAddSubscription = (customer: Customer, device: ReturnType<typeof getCustomerDevices>[number]) => {
    openAddDevice(customer);
    setAddingSubscriptionToDevice(true);
    setNewMac(device.macAddress);
    setNewDeviceKey(device.deviceKey);
    setNewAppActive(device.appActive ? "true" : "false");
    setNewAppExpiryOption("never");
  };

  const openEditSubscription = (subscription: Customer["subscriptions"][number]) => {
    if (!activeDevicesCustomer) return;
    const index = activeDevicesCustomer.subscriptions.indexOf(subscription);
    if (index < 0) return;
    setEditingSubscription({ index, subscription });
    setEditSubUsername(subscription.username || "");
    setEditSubPlaylistName(subscription.playlistName || "");
    setEditSubPassword(subscription.password || "");
    setEditSubLock(Boolean(subscription.isLocked));
    setEditSubPin("");
    if (typeof subscription.host === "object" && subscription.host) {
      const linkedHost = subscription.host;
      const hostExists = hosts.some((host) => host._id === linkedHost._id);
      setEditSubHost(hostExists ? linkedHost._id : CUSTOM_OPTION);
      setEditSubCustomHost(hostExists ? "" : linkedHost.url);
    } else {
      setEditSubHost(hosts.some((host) => host._id === subscription.host) ? String(subscription.host) : CUSTOM_OPTION);
      setEditSubCustomHost(hosts.some((host) => host._id === subscription.host) ? "" : String(subscription.host || ""));
    }
    setEditSubStatus(subscription.status);
  };

  const handleAddDevice = async () => {
    if (!addDeviceCustomer) return;
    if (!subUsername.trim() || subHostId === NONE) {
      toast.error("يرجى تعبئة اليوزرنيم واختيار السيرفر");
      return;
    }
    if (!addingSubscriptionToDevice) {
      const parsedMac = macSchema.safeParse(newMac);
      if (!parsedMac.success) {
        toast.error(parsedMac.error.issues[0].message);
        return;
      }
      if (newDeviceKey.trim().length < 6) {
        toast.error("مفتاح Device Key مطلوب (6 أرقام على الأقل)");
        return;
      }
    }
    if (!addingSubscriptionToDevice && newAppExpiryOption === "custom" && !newAppExpiryDate) {
      toast.error("يرجى تحديد تاريخ الانتهاء");
      return;
    }
    if (subHostId === CUSTOM_OPTION && !customHostUrl.trim()) {
      toast.error("يرجى كتابة رابط الدومين أو السيرفر");
      return;
    }
    if (lockNewPlaylist && !/^\d{4,8}$/.test(newPlaylistPin)) {
      toast.error("أدخل رمز PIN من 4 إلى 8 أرقام لقفل القائمة");
      return;
    }

    let appExpiry: Date | null = null;
    if (addingSubscriptionToDevice) {
      const existingDeviceSubscription = addDeviceCustomer.subscriptions.find((subscription) => subscription.macAddress === newMac);
      appExpiry = existingDeviceSubscription?.appExpiry ? new Date(existingDeviceSubscription.appExpiry) : null;
    } else if (newAppExpiryOption === "custom") {
      appExpiry = new Date(newAppExpiryDate);
    } else if (newAppExpiryOption !== "never") {
      appExpiry = new Date();
      if (newAppExpiryOption === "1_day") appExpiry.setDate(appExpiry.getDate() + 1);
      if (newAppExpiryOption === "1_week") appExpiry.setDate(appExpiry.getDate() + 7);
      if (newAppExpiryOption === "2_weeks") appExpiry.setDate(appExpiry.getDate() + 14);
      if (newAppExpiryOption === "1_month") appExpiry.setMonth(appExpiry.getMonth() + 1);
      if (newAppExpiryOption === "1_year") appExpiry.setFullYear(appExpiry.getFullYear() + 1);
      if (newAppExpiryOption === "2_years") appExpiry.setFullYear(appExpiry.getFullYear() + 2);
    }

    const newSubscription = {
      playlistName: subPlaylistName.trim(),
      username: subUsername.trim(),
      password: subPassword.trim(),
      host: subHostId === CUSTOM_OPTION ? customHostUrl.trim() : subHostId,
      status: "active" as const,
      macAddress: newMac.trim(),
      deviceKey: newDeviceKey.trim(),
      appActive: newAppActive === "true",
      appExpiry: appExpiry?.toISOString() ?? null,
      ...(lockNewPlaylist ? { playlistPin: newPlaylistPin } : {}),
    };
    const subscriptions = addDeviceCustomer.subscriptions.map((subscription) => ({
      ...subscription,
      host: typeof subscription.host === "string" ? subscription.host : (subscription.host?._id || ""),
    }));
    const saved = await updateCustomer(addDeviceCustomer._id, { subscriptions: [...subscriptions, newSubscription] }, { notify: false });
    if (!saved) {
      toast.error("تعذر حفظ بيانات الجهاز، يرجى المحاولة مجددًا");
      return;
    }
    setAddDeviceCustomer(null);
    setAddingSubscriptionToDevice(false);
    toast.success(addingSubscriptionToDevice ? "تمت إضافة الاشتراك بنجاح" : "تمت إضافة الجهاز بنجاح");
  };

  const getCustomerDevices = (customer: Customer) => {
    const devices = new Map<string, {
      macAddress: string;
      deviceKey: string;
      appActive: boolean;
      appExpiry: string | null;
      lastActive: string;
      subscriptionCount: number;
      subscriptions: Customer["subscriptions"];
    }>();

    customer.subscriptions.forEach((subscription, index) => {
      const macAddress = subscription.macAddress || "غير محدد";
      const key = subscription.macAddress || `unknown-${index}`;
      const current = devices.get(key);
      if (current) {
        current.subscriptionCount += 1;
        current.subscriptions.push(subscription);
        if (subscription.lastActive && (!current.lastActive || new Date(subscription.lastActive) > new Date(current.lastActive))) {
          current.lastActive = subscription.lastActive;
        }
        return;
      }
      devices.set(key, {
        macAddress,
        deviceKey: subscription.deviceKey,
        appActive: subscription.appActive !== false,
        appExpiry: subscription.appExpiry || null,
        lastActive: subscription.lastActive || "",
        subscriptionCount: 1,
        subscriptions: [subscription],
      });
    });

    return Array.from(devices.values());
  };
  const activeDevicesCustomer = devicesCustomer
    ? customers.find((customer) => customer._id === devicesCustomer._id) ?? devicesCustomer
    : null;
  const selectedDevices = useMemo(
    () => activeDevicesCustomer ? getCustomerDevices(activeDevicesCustomer) : [],
    [activeDevicesCustomer],
  );
  const getDeviceAccessState = (device: (typeof selectedDevices)[number]) => {
    if (!device.appActive) return "disabled" as const;
    if (!device.appExpiry) return "active" as const;
    const remaining = new Date(device.appExpiry).getTime() - Date.now();
    if (remaining < 0) return "expired" as const;
    if (remaining <= 7 * 24 * 60 * 60 * 1000) return "expiring" as const;
    return "active" as const;
  };
  const activeDeviceCount = selectedDevices.filter((device) => ["active", "expiring"].includes(getDeviceAccessState(device))).length;
  const needsAttentionDeviceCount = selectedDevices.filter((device) => getDeviceAccessState(device) !== "active").length;
  const totalSubscriptionCount = selectedDevices.reduce((total, device) => total + device.subscriptions.length, 0);
  const visibleDevices = selectedDevices.filter((device) => {
    const q = deviceSearch.trim().toLowerCase();
    const matchesSearch = !q || device.macAddress.toLowerCase().includes(q) || device.deviceKey.toLowerCase().includes(q);
    const state = getDeviceAccessState(device);
    const matchesFilter = deviceStatusFilter === "all"
      || (deviceStatusFilter === "active" && state === "active")
      || (deviceStatusFilter === "attention" && state !== "active");
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    const aExpiry = a.appExpiry ? new Date(a.appExpiry).getTime() : Number.POSITIVE_INFINITY;
    const bExpiry = b.appExpiry ? new Date(b.appExpiry).getTime() : Number.POSITIVE_INFINITY;
    return aExpiry - bExpiry;
  });

  const saveEditedSubscription = () => {
    if (!activeDevicesCustomer || !editingSubscription) return;
    if (!editSubUsername.trim() || editSubHost === NONE) {
      toast.error("يرجى تعبئة اسم المستخدم واختيار السيرفر");
      return;
    }
    if (editSubHost === CUSTOM_OPTION && !editSubCustomHost.trim()) {
      toast.error("يرجى كتابة رابط السيرفر المخصص");
      return;
    }
    if (editSubLock && !editingSubscription.subscription.isLocked && !/^\d{4,8}$/.test(editSubPin)) {
      toast.error("أدخل رمز PIN من 4 إلى 8 أرقام لقفل القائمة");
      return;
    }
    const subscriptions = activeDevicesCustomer.subscriptions.map((subscription, index) => index === editingSubscription.index
      ? {
          ...subscription,
          username: editSubUsername.trim(),
          playlistName: editSubPlaylistName.trim(),
          password: editSubPassword,
          host: editSubHost === CUSTOM_OPTION ? editSubCustomHost.trim() : editSubHost,
          status: editSubStatus,
          ...(editSubLock
            ? (editSubPin ? { playlistPin: editSubPin } : {})
            : (subscription.isLocked ? { playlistPin: null } : {})),
        }
      : { ...subscription, host: typeof subscription.host === "string" ? subscription.host : (subscription.host?._id || "") });
    updateCustomer(activeDevicesCustomer._id, { subscriptions });
    setEditingSubscription(null);
  };

  const deleteSubscription = () => {
    if (!activeDevicesCustomer || subscriptionToDelete === null || subscriptionToDelete < 0) return;
    const subscriptions = activeDevicesCustomer.subscriptions
      .filter((_, index) => index !== subscriptionToDelete)
      .map((subscription) => ({ ...subscription, host: typeof subscription.host === "string" ? subscription.host : (subscription.host?._id || "") }));
    updateCustomer(activeDevicesCustomer._id, { subscriptions });
    setSubscriptionToDelete(null);
  };

  const deleteDevice = async () => {
    if (!activeDevicesCustomer || !deviceToDelete || deletingDevice) return;

    setDeletingDevice(true);
    try {
      const updated = await revokeDevice(deviceToDelete.macAddress, deviceToDelete.deviceKey);
      if (!updated) {
        return;
      }

      setDeviceToDelete(null);
      toast.success("تم سحب صلاحية الجهاز وإزالة ارتباطاته");
      try {
        await api.post(`/client/devices/${encodeURIComponent(deviceToDelete.macAddress)}/refresh`);
      } catch {
        toast.error("تم حذف الجهاز، لكن تعذر إرسال التحديث الفوري إليه");
      }
    } finally {
      setDeletingDevice(false);
    }
  };

  const saveDeviceSubscriptions = (device: NonNullable<typeof expiryDevice>, values: { appActive?: boolean; appExpiry?: string | null }) => {
    if (!activeDevicesCustomer) return;
    const subscriptions = activeDevicesCustomer.subscriptions.map((subscription) => ({
      ...subscription,
      host: typeof subscription.host === "string" ? subscription.host : (subscription.host?._id || ""),
      ...(subscription.macAddress === device.macAddress ? values : {}),
    }));
    updateCustomer(activeDevicesCustomer._id, { subscriptions });
    setExpiryDevice(null);
  };

  const handleSaveDeviceExpiry = () => {
    if (!expiryDevice) return;
    if (deviceExpiryOption === "custom" && !deviceExpiryDate) {
      toast.error("يرجى تحديد تاريخ الانتهاء");
      return;
    }
    let expiry: Date | null = null;
    if (deviceExpiryOption === "custom") expiry = new Date(deviceExpiryDate);
    else if (deviceExpiryOption !== "never") {
      expiry = new Date();
      if (deviceExpiryOption === "1_day") expiry.setDate(expiry.getDate() + 1);
      if (deviceExpiryOption === "1_week") expiry.setDate(expiry.getDate() + 7);
      if (deviceExpiryOption === "2_weeks") expiry.setDate(expiry.getDate() + 14);
      if (deviceExpiryOption === "1_month") expiry.setMonth(expiry.getMonth() + 1);
      if (deviceExpiryOption === "1_year") expiry.setFullYear(expiry.getFullYear() + 1);
      if (deviceExpiryOption === "2_years") expiry.setFullYear(expiry.getFullYear() + 2);
    }
    saveDeviceSubscriptions(expiryDevice!, { appExpiry: expiry?.toISOString() ?? null });
  };

  const openEditDevice = (device: ReturnType<typeof getCustomerDevices>[number]) => {
    setEditDeviceMac(device.macAddress || "");
    setEditDeviceKey(device.deviceKey || "");
    setEditDeviceAppActive(device.appActive ? "true" : "false");
    setEditDeviceExpiryOption(device.appExpiry ? "custom" : "never");
    setEditDeviceExpiryDate(device.appExpiry?.slice(0, 10) || "");
    setEditingDevice(device);
  };

  const handleSaveEditedDevice = async () => {
    if (!activeDevicesCustomer || !editingDevice) return;
    const parsedMac = macSchema.safeParse(editDeviceMac);
    if (!parsedMac.success) {
      toast.error(parsedMac.error.issues[0].message);
      return;
    }
    if (editDeviceKey.trim().length < 6) {
      toast.error("مفتاح الجهاز مطلوب (6 أحرف على الأقل)");
      return;
    }
    if (editDeviceExpiryOption === "custom" && !editDeviceExpiryDate) {
      toast.error("يرجى تحديد تاريخ الانتهاء");
      return;
    }
    let expiry: Date | null = null;
    if (editDeviceExpiryOption === "custom") expiry = new Date(editDeviceExpiryDate);
    else if (editDeviceExpiryOption !== "never") {
      expiry = new Date();
      if (editDeviceExpiryOption === "1_day") expiry.setDate(expiry.getDate() + 1);
      if (editDeviceExpiryOption === "1_week") expiry.setDate(expiry.getDate() + 7);
      if (editDeviceExpiryOption === "2_weeks") expiry.setDate(expiry.getDate() + 14);
      if (editDeviceExpiryOption === "1_month") expiry.setMonth(expiry.getMonth() + 1);
      if (editDeviceExpiryOption === "1_year") expiry.setFullYear(expiry.getFullYear() + 1);
      if (editDeviceExpiryOption === "2_years") expiry.setFullYear(expiry.getFullYear() + 2);
    }
    try {
      const nextMac = parsedMac.data.toUpperCase();
      if (nextMac !== editingDevice.macAddress || editDeviceKey.trim() !== editingDevice.deviceKey) {
        await api.put(`/devices/${encodeURIComponent(editingDevice.macAddress)}/identity`, { macAddress: nextMac, deviceKey: editDeviceKey.trim() });
      }
      const subscriptions = activeDevicesCustomer.subscriptions.map((subscription) => ({
        ...subscription,
        host: typeof subscription.host === "string" ? subscription.host : (subscription.host?._id || ""),
        ...(subscription.macAddress === editingDevice.macAddress ? {
          macAddress: nextMac,
          deviceKey: editDeviceKey.trim(),
          appActive: editDeviceAppActive === "true",
          appExpiry: expiry?.toISOString() ?? null,
        } : {}),
      }));
      if (await updateCustomer(activeDevicesCustomer._id, { subscriptions }, { notify: false })) {
        setEditingDevice(null);
        toast.success("تم تحديث بيانات الجهاز");
      } else {
        toast.error("تعذر حفظ بيانات الجهاز لدى العميل");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "تعذر تحديث بيانات الجهاز");
    }
  };

  const handleSavePlaylist = async () => {
    if (!playlistDevice || !playlistName.trim() || !playlistUrl.trim()) {
      toast.error("يرجى إدخال اسم قائمة التشغيل ورابطها");
      return;
    }
    setSavingDeviceAction(true);
    try {
      const params = { macAddress: playlistDevice.macAddress, deviceKey: playlistDevice.deviceKey };
      const current = await api.get(`/portal/admin/playlists/${encodeURIComponent(playlistDevice.macAddress)}`);
      const playlists = Array.isArray(current.data) ? current.data : [];
      await api.post("/portal/playlists", {
        ...params,
        playlists: [...playlists, { name: playlistName.trim(), url: playlistUrl.trim() }],
      });
      toast.success("تمت إضافة قائمة التشغيل للجهاز");
      setPlaylistDevice(null);
      setPlaylistName("");
      setPlaylistUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "تعذر إضافة قائمة التشغيل");
    } finally {
      setSavingDeviceAction(false);
    }
  };

  const inspectPlaylists = async (device: ReturnType<typeof getCustomerDevices>[number]) => {
    try {
      const response = await api.get(`/portal/admin/playlists/${encodeURIComponent(device.macAddress)}`);
      setPlaylistInspection({ macAddress: device.macAddress, playlists: response.data || [] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "تعذر تحميل قوائم التشغيل");
    }
  };

  const submit = async () => {
    const parsed = customerSchema.safeParse({ name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmittingCustomer(true);
    const saved = await addCustomer({
      name: parsed.data.name,
      subscriptions: [],
    }, { notify: false });
    setSubmittingCustomer(false);
    if (!saved) {
      toast.error("تعذر إضافة العميل، يرجى المحاولة مجددًا");
      return;
    }
    setOpen(false);
    toast.success("تمت إضافة العميل بنجاح");
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
      actions={canManage ? (
        <Button className="font-bold" onClick={openCreate} size="icon" title="إضافة عميل" aria-label="إضافة عميل">
          <Plus className="size-5" />
          <span className="sr-only">إضافة عميل</span>
        </Button>
      ) : undefined}
    >
      <Card className="surface-card border-border/70 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-extrabold">قائمة العملاء ({filtered.length})</h2>
            {canManage && selectedIds.length > 0 && (
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
                  {canManage && <Checkbox 
                    checked={selectedIds.length === filtered.length && filtered.length > 0} 
                    onCheckedChange={toggleSelectAll} 
                    aria-label="تحديد الكل"
                  />}
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
                    {canManage && <Checkbox 
                      checked={selectedIds.includes(c._id)} 
                      onCheckedChange={() => toggleSelect(c._id)} 
                      aria-label={`تحديد ${c.name}`}
                    />}
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
                      ? (() => {
                          const latest = [...c.subscriptions].sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime())[0]?.lastActive;
                          return latest ? new Date(latest).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : "-";
                        })()
                      : "لا يوجد أجهزة"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="إجراءات العميل" aria-label={`إجراءات العميل ${c.name}`}>
                            <Settings className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44 text-right">
                          <DropdownMenuItem onSelect={() => setDevicesCustomer(c)}>
                            <MonitorSmartphone className="size-4" /> قائمة الأجهزة
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canManage && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => confirmAction("delete", c._id, c.name)}>
                            <Trash2 className="size-4" /> حذف العميل
                          </DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              <Button onClick={submit} className="w-full" disabled={submittingCustomer}>{submittingCustomer ? "جارٍ الإضافة..." : "إنشاء العميل"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addDeviceCustomer} onOpenChange={(isOpen) => !isOpen && setAddDeviceCustomer(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tv className="size-5 text-primary" />
              {addingSubscriptionToDevice ? "إضافة اشتراك للجهاز" : "إضافة جهاز جديد للعميل"} {addDeviceCustomer?.name ?? ""}
            </DialogTitle>
            <DialogDescription>{addingSubscriptionToDevice ? "أدخل بيانات اشتراك السيرفر؛ سيرتبط بالجهاز الحالي تلقائيًا." : "أدخل بيانات الجهاز واشتراك السيرفر."}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>السيرفر (Host)</Label>
              <Select
                value={subHostId}
                onValueChange={(value) => {
                  setSubHostId(value);
                  if (value !== CUSTOM_OPTION) setCustomHostUrl("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر السيرفر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>اختر...</SelectItem>
                  {hosts.map((host) => <SelectItem key={host._id} value={host._id}>{host.name}</SelectItem>)}
                  <SelectItem value={CUSTOM_OPTION}>خيار آخر (كتابة دومين مخصص)...</SelectItem>
                </SelectContent>
              </Select>
              {subHostId === CUSTOM_OPTION && (
                <div className="mt-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">رابط الدومين / السيرفر</Label>
                  <Input dir="ltr" className="text-left font-mono" placeholder="http://domain.com:port" value={customHostUrl} onChange={(event) => setCustomHostUrl(event.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>اليوزرنيم</Label>
              <Input dir="ltr" className="font-mono" value={subUsername} onChange={(event) => setSubUsername(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>اسم القائمة</Label>
              <Input value={subPlaylistName} onChange={(event) => setSubPlaylistName(event.target.value)} placeholder="مثال: الباقة الرياضية" />
            </div>
            <div className="space-y-1">
              <Label>كلمة المرور</Label>
              <Input dir="ltr" className="font-mono" value={subPassword} onChange={(event) => setSubPassword(event.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={lockNewPlaylist} onCheckedChange={(checked) => setLockNewPlaylist(checked === true)} />
                <LockKeyhole className="size-4 text-primary" />
                قفل بيانات القائمة برمز PIN
              </label>
              {lockNewPlaylist && <div className="max-w-sm space-y-1">
                <Label htmlFor="new-playlist-pin">رمز PIN (4 إلى 8 أرقام)</Label>
                <Input id="new-playlist-pin" dir="ltr" inputMode="numeric" maxLength={8} type="password" className="font-mono" value={newPlaylistPin} onChange={(event) => setNewPlaylistPin(event.target.value.replace(/\D/g, ""))} />
              </div>}
            </div>
            {!addingSubscriptionToDevice && <div className="space-y-1">
              <Label>الماك أدرس (MAC)</Label>
              <Input dir="ltr" className="font-mono" placeholder="AA:BB:CC:11:22:33" value={newMac} onChange={(event) => setNewMac(formatMacAddress(event.target.value, newMac))} maxLength={17} />
            </div>}
            {!addingSubscriptionToDevice && <div className="space-y-1">
              <Label>مفتاح الجهاز (Device Key)</Label>
              <Input dir="ltr" className="font-mono" placeholder="123456" value={newDeviceKey} onChange={(event) => setNewDeviceKey(event.target.value)} maxLength={20} />
            </div>}
            {!addingSubscriptionToDevice && <div className="space-y-1">
              <Label>تفعيل التطبيق</Label>
              <Select value={newAppActive} onValueChange={(value: "true" | "false") => setNewAppActive(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">مفعل</SelectItem>
                  <SelectItem value="false">غير مفعل</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            {!addingSubscriptionToDevice && <div className="space-y-1">
              <Label>مدة تفعيل التطبيق</Label>
              <Select value={newAppExpiryOption} onValueChange={setNewAppExpiryOption}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">لا تنتهي</SelectItem>
                  <SelectItem value="1_day">يوم واحد</SelectItem>
                  <SelectItem value="1_week">أسبوع واحد</SelectItem>
                  <SelectItem value="2_weeks">أسبوعين</SelectItem>
                  <SelectItem value="1_month">شهر واحد</SelectItem>
                  <SelectItem value="1_year">سنة واحدة</SelectItem>
                  <SelectItem value="2_years">سنتان</SelectItem>
                  <SelectItem value="custom">تاريخ محدد</SelectItem>
                </SelectContent>
              </Select>
            </div>}
            {!addingSubscriptionToDevice && newAppExpiryOption === "custom" && (
              <div className="space-y-1">
                <Label>تاريخ الانتهاء المحدد</Label>
                <Input type="date" value={newAppExpiryDate} onChange={(event) => setNewAppExpiryDate(event.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleAddDevice}>
              <Plus className="ml-2 size-4" /> {addingSubscriptionToDevice ? "إضافة الاشتراك" : "إضافة الجهاز والاشتراك"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!devicesCustomer} onOpenChange={(isOpen) => !isOpen && setDevicesCustomer(null)}>
        <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col gap-0 overflow-hidden p-0" dir="rtl">
          <DialogHeader className="border-b border-border/70 px-7 pb-5 pt-7 text-right">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MonitorSmartphone className="size-5" /></span>
              <span>أجهزة {devicesCustomer?.name ?? "العميل"}</span>
            </DialogTitle>
            <DialogDescription className="pr-[52px] leading-6">
              إدارة الأجهزة والاشتراكات المرتبطة بها من مكان واحد.
            </DialogDescription>
            {canManage && activeDevicesCustomer && (
              <div className="pr-[52px] pt-2">
                <Button size="sm" variant="outline" onClick={() => openAddDevice(activeDevicesCustomer)}>
                  <Plus className="ml-2 size-4" /> إضافة جهاز
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            {activeDevicesCustomer && selectedDevices.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/70 bg-card p-4">
                    <span className="block text-xs text-muted-foreground">الأجهزة</span>
                    <b className="mt-1 block text-xl text-foreground">{selectedDevices.length}</b>
                  </div>
                  <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                    <span className="block text-xs text-muted-foreground">التطبيق مفعل</span>
                    <b className="mt-1 block text-xl text-success">{activeDeviceCount}</b>
                  </div>
                  <div className="col-span-2 rounded-xl border border-warning/25 bg-warning/5 p-4 sm:col-span-1">
                    <span className="block text-xs text-muted-foreground">تحتاج متابعة</span>
                    <b className="mt-1 block text-xl text-warning">{needsAttentionDeviceCount}</b>
                    <span className="text-[11px] text-muted-foreground">انتهاء قريب أو تفعيل منتهي/معطل</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pr-9" value={deviceSearch} onChange={(event) => setDeviceSearch(event.target.value)} placeholder="ابحث بعنوان الجهاز أو مفتاحه" />
                  </div>
                  <Select value={deviceStatusFilter} onValueChange={(value: "all" | "active" | "attention") => setDeviceStatusFilter(value)}>
                    <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الأجهزة</SelectItem>
                      <SelectItem value="active">التطبيق مفعل</SelectItem>
                      <SelectItem value="attention">تحتاج متابعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {visibleDevices.length} من {selectedDevices.length} جهاز · {totalSubscriptionCount} اشتراك
                </p>
              </>
            )}
            {visibleDevices.map((device, index) => (
              <div key={`${device.macAddress}-${index}`} className="space-y-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-primary"><Smartphone className="size-5" /></span>
                    <div className="min-w-0 space-y-1">
                      <span className="block text-xs text-muted-foreground">جهاز {index + 1} · عنوان الجهاز</span>
                      <span className="block truncate font-mono text-base font-bold tracking-wide text-foreground" dir="ltr">{device.macAddress}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={getDeviceAccessState(device) === "active" ? "rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-bold text-success" : getDeviceAccessState(device) === "disabled" || getDeviceAccessState(device) === "expired" ? "rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive" : "rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-xs font-bold text-warning"}>{getDeviceAccessState(device) === "disabled" ? "التطبيق معطل" : getDeviceAccessState(device) === "expired" ? "انتهى التفعيل" : getDeviceAccessState(device) === "expiring" ? "ينتهي خلال 7 أيام" : "التطبيق مفعل"}</span>
                    {canManage && <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={`إجراءات الجهاز ${device.macAddress}`}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-right">
                        <DropdownMenuItem onSelect={() => saveDeviceSubscriptions(device, { appActive: !device.appActive })}><Power className="size-4" /> {device.appActive ? "تعطيل التطبيق" : "تفعيل التطبيق"}</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setDeviceExpiryOption("1_week"); setDeviceExpiryDate(""); setExpiryDevice(device); }}><CalendarClock className="size-4" /> مدة التفعيل</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => openEditDevice(device)}><Pencil className="size-4" /> تعديل بيانات الجهاز</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setPlaylistName(""); setPlaylistUrl(""); setPlaylistDevice(device); }}><ListPlus className="size-4" /> إضافة قائمة تشغيل</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void inspectPlaylists(device)}><MonitorSmartphone className="size-4" /> عرض بيانات قوائم التشغيل</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeviceToDelete(device)}><Trash2 className="size-4" /> حذف الجهاز</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>}
                  </div>
                </div>
                <div className="grid gap-3 rounded-lg bg-muted/25 p-4 text-sm sm:grid-cols-2">
                  <div className="space-y-1"><span className="block text-xs text-muted-foreground">مفتاح الجهاز</span><b className="font-mono text-foreground" dir="ltr">{device.deviceKey || "—"}</b></div>
                  <div className="space-y-1"><span className="block text-xs text-muted-foreground">عدد الاشتراكات</span><b className="text-foreground">{device.subscriptionCount}</b></div>
                  <div className="space-y-1"><span className="block text-xs text-muted-foreground">آخر ظهور</span><b className="flex items-center gap-1 font-medium text-foreground"><CalendarClock className="size-3.5 text-muted-foreground" />{device.lastActive ? new Date(device.lastActive).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "—"}</b></div>
                  <div className="space-y-1"><span className="block text-xs text-muted-foreground">انتهاء التفعيل</span><b className="font-medium text-foreground">{device.appExpiry ? new Date(device.appExpiry).toLocaleDateString("ar-EG") : "لا ينتهي"}</b></div>
                </div>
                <Accordion type="single" collapsible>
                  <AccordionItem value={`${device.macAddress}-${index}`} className="overflow-hidden rounded-lg border border-border/70">
                    <AccordionTrigger className="bg-muted/20 px-4 py-3.5 text-sm font-bold hover:bg-muted/35 hover:no-underline"><span className="flex items-center gap-2">الاشتراكات المرتبطة بالجهاز <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{device.subscriptions.length}</span></span></AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-3"><div className="space-y-3">
                      {device.subscriptions.map((subscription, subscriptionIndex) => {
                        const hostLabel = typeof subscription.host === "object" && subscription.host ? subscription.host.name : hosts.find((host) => host._id === subscription.host)?.name || String(subscription.host || "—");
                        return <div key={subscription._id || `${subscription.username}-${subscriptionIndex}`} className="rounded-lg border border-border/60 bg-background/60 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3"><div className="min-w-0"><span className="block truncate text-sm font-bold text-foreground">{subscription.playlistName?.trim() || `قائمة تشغيل ${subscriptionIndex + 1}`}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{hostLabel}</span></div><div className="flex shrink-0 items-center gap-1"><span className={subscription.status === "blocked" ? "rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive" : "rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"}>{subscription.status === "blocked" ? "محظور" : "نشط"}</span>{canManage && <><Button variant="ghost" size="icon" className="size-8" aria-label="تعديل الاشتراك" onClick={() => openEditSubscription(subscription)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" aria-label="حذف الاشتراك" onClick={() => setSubscriptionToDelete(activeDevicesCustomer?.subscriptions.indexOf(subscription) ?? -1)}><Trash2 className="size-4" /></Button></>}</div></div>
                          <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2"><div className="space-y-1"><span className="block text-xs text-muted-foreground">اسم المستخدم</span><b className="font-mono text-foreground" dir="ltr">{subscription.username || "—"}</b></div><div className="space-y-1"><span className="block text-xs text-muted-foreground">كلمة المرور</span><b className="font-mono text-foreground" dir="ltr">{subscription.password || "—"}</b></div></div>
                        </div>;
                      })}
                      {canManage && activeDevicesCustomer && <Button size="sm" variant="outline" className="w-full border-dashed" onClick={() => openAddSubscription(activeDevicesCustomer, device)}><Plus className="ml-1 size-4" /> إضافة اشتراك لهذا الجهاز</Button>}
                    </div></AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
            {devicesCustomer && selectedDevices.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                لا توجد أجهزة مرتبطة بهذا العميل.
              </div>
            )}
            {selectedDevices.length > 0 && visibleDevices.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                لا توجد أجهزة تطابق البحث أو التصفية المحددة.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSubscription} onOpenChange={(isOpen) => !isOpen && setEditingSubscription(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الاشتراك</DialogTitle>
            <DialogDescription>عدّل بيانات هذا الاشتراك وحالته.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>السيرفر</Label>
              <Select value={editSubHost} onValueChange={setEditSubHost}>
                <SelectTrigger><SelectValue placeholder="اختر السيرفر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>اختر...</SelectItem>
                  {hosts.map((host) => <SelectItem key={host._id} value={host._id}>{host.name}</SelectItem>)}
                  <SelectItem value={CUSTOM_OPTION}>سيرفر مخصص</SelectItem>
                </SelectContent>
              </Select>
              {editSubHost === CUSTOM_OPTION && <Input dir="ltr" value={editSubCustomHost} onChange={(event) => setEditSubCustomHost(event.target.value)} placeholder="رابط السيرفر" />}
            </div>
            <div className="space-y-1"><Label>اسم المستخدم</Label><Input dir="ltr" value={editSubUsername} onChange={(event) => setEditSubUsername(event.target.value)} /></div>
            <div className="space-y-1"><Label>اسم القائمة</Label><Input value={editSubPlaylistName} onChange={(event) => setEditSubPlaylistName(event.target.value)} placeholder="مثال: الباقة الرياضية" /></div>
            <div className="space-y-1"><Label>كلمة المرور</Label><Input dir="ltr" value={editSubPassword} onChange={(event) => setEditSubPassword(event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={editSubLock} onCheckedChange={(checked) => setEditSubLock(checked === true)} />
                <LockKeyhole className="size-4 text-primary" /> قفل بيانات القائمة برمز PIN
              </label>
              {editSubLock && <div className="max-w-sm space-y-1">
                <Label htmlFor="edit-subscription-pin">رمز PIN (4 إلى 8 أرقام)</Label>
                <Input id="edit-subscription-pin" dir="ltr" inputMode="numeric" maxLength={8} type="password" className="font-mono" value={editSubPin} onChange={(event) => setEditSubPin(event.target.value.replace(/\D/g, ""))} placeholder={editingSubscription?.subscription.isLocked ? "اتركه فارغاً للإبقاء على الرمز الحالي" : "أدخل PIN"} />
                {editingSubscription?.subscription.isLocked && <p className="text-xs text-muted-foreground">أدخل رمزاً جديداً لتغييره، أو أزل علامة القفل لإلغاء الحماية.</p>}
              </div>}
            </div>
            <div className="space-y-1">
              <Label>حالة الاشتراك</Label>
              <Select value={editSubStatus} onValueChange={(value: "active" | "blocked") => setEditSubStatus(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">نشط</SelectItem><SelectItem value="blocked">محظور</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={saveEditedSubscription}>حفظ التغييرات</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={subscriptionToDelete !== null} onOpenChange={(isOpen) => !isOpen && setSubscriptionToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الاشتراك</AlertDialogTitle>
            <AlertDialogDescription>هل تريد حذف هذا الاشتراك من الجهاز؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deleteSubscription}>حذف الاشتراك</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deviceToDelete}
        onOpenChange={(isOpen) => !isOpen && !deletingDevice && setDeviceToDelete(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>سحب صلاحية الجهاز</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إيقاف الجهاز <span className="font-mono" dir="ltr">{deviceToDelete?.macAddress}</span> وإزالة اشتراكاته من العملاء المرتبطين به. لن يتمكن من بدء تجربة جديدة تلقائيًا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDevice}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingDevice}
              onClick={(event) => {
                event.preventDefault();
                void deleteDevice();
              }}
            >
              {deletingDevice ? "جارٍ الإيقاف..." : "سحب الصلاحية"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!expiryDevice} onOpenChange={(isOpen) => !isOpen && setExpiryDevice(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>مدة تفعيل التطبيق</DialogTitle>
            <DialogDescription>سيُطبّق التغيير على كل اشتراكات هذا الجهاز.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={deviceExpiryOption} onValueChange={setDeviceExpiryOption}>
              <SelectTrigger><SelectValue placeholder="اختر مدة التفعيل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="never">لا تنتهي</SelectItem>
                <SelectItem value="1_day">يوم واحد</SelectItem>
                <SelectItem value="1_week">أسبوع واحد</SelectItem>
                <SelectItem value="2_weeks">أسبوعين</SelectItem>
                <SelectItem value="1_month">شهر واحد</SelectItem>
                <SelectItem value="1_year">سنة واحدة</SelectItem>
                <SelectItem value="2_years">سنتان</SelectItem>
                <SelectItem value="custom">تاريخ محدد</SelectItem>
              </SelectContent>
            </Select>
            {deviceExpiryOption === "custom" && <Input type="date" value={deviceExpiryDate} onChange={(event) => setDeviceExpiryDate(event.target.value)} />}
            <div className="flex justify-end"><Button onClick={handleSaveDeviceExpiry}>حفظ مدة التفعيل</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingDevice} onOpenChange={(isOpen) => !isOpen && setEditingDevice(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الجهاز</DialogTitle>
            <DialogDescription>عدّل عنوان MAC ومفتاح الجهاز وحالة التطبيق ومدة التفعيل.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label htmlFor="edit-device-mac">MAC Address</Label><Input id="edit-device-mac" dir="ltr" className="font-mono" value={editDeviceMac} onChange={(event) => setEditDeviceMac(formatMacAddress(event.target.value, editDeviceMac))} maxLength={17} placeholder="AA:BB:CC:11:22:33" /></div>
            <div className="space-y-1"><Label htmlFor="edit-device-key">مفتاح الجهاز</Label><Input id="edit-device-key" dir="ltr" value={editDeviceKey} onChange={(event) => setEditDeviceKey(event.target.value)} maxLength={20} /></div>
            <div className="space-y-1"><Label>تفعيل التطبيق</Label><Select value={editDeviceAppActive} onValueChange={setEditDeviceAppActive}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">مفعل</SelectItem><SelectItem value="false">غير مفعل</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>مدة التفعيل</Label><Select value={editDeviceExpiryOption} onValueChange={setEditDeviceExpiryOption}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="never">لا تنتهي</SelectItem><SelectItem value="1_day">يوم واحد</SelectItem><SelectItem value="1_week">أسبوع واحد</SelectItem><SelectItem value="2_weeks">أسبوعين</SelectItem><SelectItem value="1_month">شهر واحد</SelectItem><SelectItem value="1_year">سنة واحدة</SelectItem><SelectItem value="2_years">سنتان</SelectItem><SelectItem value="custom">تاريخ محدد</SelectItem></SelectContent></Select></div>
            {editDeviceExpiryOption === "custom" && <div className="space-y-1"><Label>تاريخ الانتهاء</Label><Input type="date" value={editDeviceExpiryDate} onChange={(event) => setEditDeviceExpiryDate(event.target.value)} /></div>}
            <div className="flex justify-end"><Button onClick={() => void handleSaveEditedDevice()}>حفظ التعديلات</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!playlistDevice} onOpenChange={(isOpen) => !isOpen && setPlaylistDevice(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة قائمة تشغيل للجهاز</DialogTitle>
            <DialogDescription>ستُضاف القائمة إلى قوائم التشغيل الحالية لهذا الجهاز.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label htmlFor="device-playlist-name">اسم القائمة</Label><Input id="device-playlist-name" value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} /></div>
            <div className="space-y-1"><Label htmlFor="device-playlist-url">رابط القائمة</Label><Input id="device-playlist-url" dir="ltr" placeholder="http://example.com/playlist.m3u" value={playlistUrl} onChange={(event) => setPlaylistUrl(event.target.value)} /></div>
            <div className="flex justify-end"><Button onClick={handleSavePlaylist} disabled={savingDeviceAction}>{savingDeviceAction ? "جارٍ الحفظ..." : "إضافة القائمة"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!playlistInspection} onOpenChange={(isOpen) => !isOpen && setPlaylistInspection(null)}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>قوائم التشغيل — {playlistInspection?.macAddress}</DialogTitle>
            <DialogDescription>هذه البيانات متاحة للإدارة حتى عندما تكون القائمة محمية برمز PIN للمستخدم.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-auto">
            {playlistInspection?.playlists.length ? playlistInspection.playlists.map((playlist, index) => (
              <div key={index} className="space-y-2 rounded-lg border p-4">
                <div className="font-bold">{playlist.name}{playlist.isLocked ? " · مقفلة بـ PIN" : ""}</div>
                <div className="break-all font-mono text-sm text-muted-foreground" dir="ltr">{playlist.url}</div>
              </div>
            )) : <p className="py-5 text-center text-sm text-muted-foreground">لا توجد قوائم تشغيل لهذا الجهاز.</p>}
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
