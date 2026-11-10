import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  CreateCustomerInput,
  CreateHostInput,
  Customer,
  CustomerStatus,
  Host,
  AppPlan,
  CreateAppPlanInput,
  Device,
  AdminUser,
  CreateAdminUserInput,
  RegisteredDeviceStatus,
} from "@/services/types";
import { api, endpoints } from "@/services/api";
import { useAuth } from "./auth";
import { toast } from "@/lib/notifications";

interface DataContextValue {
  customers: Customer[];
  hosts: Host[];
  addCustomer: (input: CreateCustomerInput, options?: { notify?: boolean }) => Promise<boolean>;
  updateCustomer: (id: string, input: Partial<CreateCustomerInput>, options?: { notify?: boolean }) => Promise<boolean>;
  updateCustomerStatus: (id: string, status: CustomerStatus) => void;
  deleteCustomer: (id: string) => void;

  addHost: (input: CreateHostInput) => void;
  updateHost: (id: string, input: CreateHostInput) => void;
  deleteHost: (id: string) => void;
  
  devices: Device[];
  fetchDevices: () => Promise<void>;
  searchDevice: (macAddress: string) => Promise<Device | null>;
  revokeDevice: (macAddress: string, deviceKey?: string) => Promise<boolean>;
  restoreDevice: (macAddress: string) => Promise<boolean>;
  
  hostName: (id: string | null) => string;
  customersCount: (hostId: string) => number;
  
  plans: AppPlan[];
  addPlan: (input: CreateAppPlanInput) => void;
  updatePlan: (id: string, input: Partial<CreateAppPlanInput>) => void;
  deletePlan: (id: string) => void;

  admins: AdminUser[];
  fetchAdmins: () => Promise<void>;
  addAdmin: (input: CreateAdminUserInput) => void;
  updateAdmin: (id: string, input: Partial<CreateAdminUserInput>) => void;
  deleteAdmin: (id: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

const mapHost = (p: any): Host => ({
  _id: p._id,
  name: p.name,
  url: p.url,
  createdAt: p.createdAt ? p.createdAt.slice(0, 10) : "",
  updatedAt: p.updatedAt ? p.updatedAt.slice(0, 10) : "",
});

const mapCustomer = (c: any): Customer => ({
  _id: c._id,
  name: c.name,
  status: c.status,
  subscriptions: (c.subscriptions || []).map((s: any) => ({
    _id: s._id,
    playlistName: s.playlistName,
    username: s.username,
    password: s.password,
    status: s.status,
    host: s.host,
    macAddress: s.macAddress,
    deviceKey: s.deviceKey,
    lastActive: s.lastActive || "",
    appActive: s.appActive,
    appExpiry: s.appExpiry,
    isLocked: s.isLocked,
  })),
  createdAt: c.createdAt ? c.createdAt.slice(0, 10) : "",
  updatedAt: c.updatedAt ? c.updatedAt.slice(0, 10) : "",
});

const mapDevice = (d: any): Device => ({
  _id: d._id,
  macAddress: d.macAddress,
  deviceKey: d.deviceKey || "",
  customPlaylists: d.customPlaylists || [],
  playlistCount: Number(d.playlistCount ?? d.customPlaylists?.length ?? 0),
  status: (d.status || "active") as RegisteredDeviceStatus,
  revokedAt: d.revokedAt || null,
  revokeReason: d.revokeReason || null,
  lastActive: d.lastActive || "",
  trialStartsAt: d.trialStartsAt || "",
  trialEndsAt: d.trialEndsAt || "",
  createdAt: d.createdAt || "",
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [plans, setPlans] = useState<AppPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const { isAuthed, ready, role } = useAuth();

  useEffect(() => {
    if (!isAuthed || !ready || !role) return;

    if (role === "owner") fetchAdmins();
    else setAdmins([]);

    api.get(endpoints.hosts)
      .then((res) => setHosts(res.data.map(mapHost)))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          toast.error("خطأ في تحميل قائمة السيرفرات من الخادم");
        }
      });

    api.get(endpoints.customers)
      .then((res) => {
        // Exclude external CRM contacts that have phone numbers and belong to CRM sales/orders
        const streamingOnly = (res.data || []).filter((c: any) => !c.phone);
        setCustomers(streamingOnly.map(mapCustomer));
      })
      .catch((err) => {
        if (err?.response?.status !== 401) {
          toast.error("خطأ في تحميل العملاء من الخادم");
        }
      });
      
    api.get(endpoints.plans)
      .then((res) => setPlans(res.data.plans))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          toast.error("خطأ في تحميل الباقات من الخادم");
        }
      });
  }, [isAuthed, ready, role]);

  const addCustomer = useCallback(async (input: CreateCustomerInput, options: { notify?: boolean } = {}) => {
    try {
      const res = await api.post(endpoints.customers, {
        name: input.name,
        subscriptions: input.subscriptions || [],
      });
      setCustomers((prev) => [mapCustomer(res.data), ...prev]);
      if (options.notify !== false) toast.success("تم إضافة العميل بنجاح");
      return true;
    } catch (err: any) {
      if (options.notify !== false) toast.error(err.response?.data?.message || "خطأ في إضافة العميل");
      return false;
    }
  }, []);

  const updateCustomer = useCallback(async (id: string, input: Partial<CreateCustomerInput>, options: { notify?: boolean } = {}) => {
    try {
      const res = await api.put(endpoints.customer(id), input);
      setCustomers((prev) => prev.map((c) => (c._id === id ? mapCustomer(res.data) : c)));
      if (options.notify !== false) toast.success("تم تحديث بيانات العميل بنجاح");
      return true;
    } catch (err: any) {
      if (options.notify !== false) toast.error(err.response?.data?.message || "خطأ في تحديث العميل");
      return false;
    }
  }, []);

  const updateCustomerStatus = useCallback((id: string, status: CustomerStatus) => {
    const endpoint = status === "blocked" ? `/customers/${id}/block` : `/customers/${id}/unblock`;
    api.put(endpoint)
      .then((res) => {
        setCustomers((prev) => prev.map((c) => (c._id === id ? mapCustomer(res.data) : c)));
        toast.success("تم تحديث حالة العميل بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في تحديث حالة العميل");
      });
  }, []);


  const deleteCustomer = useCallback((id: string) => {
    api.delete(endpoints.customer(id))
      .then(() => {
        setCustomers((prev) => prev.filter((c) => c._id !== id));
        toast.success("تم حذف العميل بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في حذف العميل");
      });
  }, []);

  const addHost = useCallback((input: CreateHostInput) => {
    api.post(endpoints.hosts, input)
      .then((res) => {
        setHosts((prev) => [mapHost(res.data), ...prev]);
        toast.success("تم إضافة السيرفر بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في إضافة السيرفر");
      });
  }, []);

  const updateHost = useCallback((id: string, input: CreateHostInput) => {
    api.put(endpoints.host(id), input)
      .then((res) => {
        setHosts((prev) => prev.map((p) => (p._id === id ? mapHost(res.data) : p)));
        toast.success("تم تحديث السيرفر بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في تحديث السيرفر");
      });
  }, []);

  const deleteHost = useCallback((id: string) => {
    api.delete(endpoints.host(id))
      .then(() => {
        setHosts((prev) => prev.filter((p) => p._id !== id));
        setCustomers((prev) => prev.map((c) => ({
          ...c,
          subscriptions: c.subscriptions.map(s => (typeof s.host === 'string' ? s.host : s.host?._id) === id ? { ...s, host: null } : s)
        })));
        toast.success("تم حذف السيرفر بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في حذف السيرفر");
      });
  }, []);

  const addPlan = useCallback((input: CreateAppPlanInput) => {
    api.post(endpoints.plans, input)
      .then((res) => {
        setPlans((prev) => [res.data.plan, ...prev]);
        toast.success("تم إضافة الباقة بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في إضافة الباقة");
      });
  }, []);

  const updatePlan = useCallback((id: string, input: Partial<CreateAppPlanInput>) => {
    api.put(endpoints.plan(id), input)
      .then((res) => {
        setPlans((prev) => prev.map((p) => (p._id === id ? res.data.plan : p)));
        toast.success("تم تحديث الباقة بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في تحديث الباقة");
      });
  }, []);

  const deletePlan = useCallback((id: string) => {
    api.delete(endpoints.plan(id))
      .then(() => {
        setPlans((prev) => prev.filter((p) => p._id !== id));
        toast.success("تم حذف الباقة بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في حذف الباقة");
      });
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.map(mapDevice));
    } catch (err) {
      if ((err as any)?.response?.status !== 401) {
        toast.error((err as any)?.response?.data?.message || "تعذر تحميل الأجهزة المسجلة");
      }
    }
  }, []);

  const searchDevice = useCallback(async (macAddress: string): Promise<Device | null> => {
    try {
      const res = await api.get('/devices/search', { params: { macAddress } });
      return res.data ? mapDevice(res.data) : null;
    } catch (err) {
      if ((err as any)?.response?.status !== 401) {
        toast.error((err as any)?.response?.data?.message || "تعذر البحث عن الجهاز");
      }
      throw err;
    }
  }, []);

  const revokeDevice = useCallback(async (macAddress: string, deviceKey?: string) => {
    try {
      await api.delete(`/devices/${encodeURIComponent(macAddress)}`, { data: { deviceKey } });
      const normalizedMac = macAddress.toUpperCase().replace(/[^A-F0-9]/g, "");
      setCustomers((prev) => prev.map((customer) => ({
        ...customer,
        subscriptions: customer.subscriptions.filter(
          (subscription) => subscription.macAddress.toUpperCase().replace(/[^A-F0-9]/g, "") !== normalizedMac,
        ),
      })));
      setDevices((prev) => prev.map((device) =>
        device.macAddress.toUpperCase().replace(/[^A-F0-9]/g, "") === normalizedMac
          ? { ...device, status: "revoked", revokedAt: new Date().toISOString() }
          : device,
      ));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر إيقاف الجهاز");
      return false;
    }
  }, []);

  const restoreDevice = useCallback(async (macAddress: string) => {
    try {
      const res = await api.put(`/devices/${encodeURIComponent(macAddress)}/restore`);
      const normalizedMac = macAddress.toUpperCase().replace(/[^A-F0-9]/g, "");
      setDevices((prev) => prev.map((device) =>
        device.macAddress.toUpperCase().replace(/[^A-F0-9]/g, "") === normalizedMac
          ? mapDevice(res.data.device)
          : device,
      ));
      return true;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر إعادة تفعيل الجهاز");
      return false;
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    if (role !== "owner") return;
    try {
      const res = await api.get(endpoints.admins);
      setAdmins(res.data);
    } catch (err) {
      if ((err as any)?.response?.status !== 401) {
        toast.error("خطأ في تحميل مدراء النظام");
      }
    }
  }, [role]);

  const addAdmin = useCallback((input: CreateAdminUserInput) => {
    api.post(endpoints.admins, input)
      .then((res) => {
        setAdmins((prev) => [res.data, ...prev]);
        toast.success("تم إضافة المدير بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في إضافة المدير");
      });
  }, []);

  const updateAdmin = useCallback((id: string, input: Partial<CreateAdminUserInput>) => {
    api.put(endpoints.admin(id), input)
      .then((res) => {
        setAdmins((prev) => prev.map((a) => (a._id === id ? { ...a, ...res.data } : a)));
        toast.success("تم تحديث بيانات المدير بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في تحديث بيانات المدير");
      });
  }, []);

  const deleteAdmin = useCallback((id: string) => {
    api.delete(endpoints.admin(id))
      .then(() => {
        setAdmins((prev) => prev.filter((a) => a._id !== id));
        toast.success("تم حذف المدير بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في حذف المدير");
      });
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      customers,
      hosts,
      plans,
      devices,
      admins,
      fetchDevices,
      searchDevice,
      revokeDevice,
      restoreDevice,
      fetchAdmins,
      addCustomer,
      updateCustomer,
      updateCustomerStatus,
      deleteCustomer,
      addHost,
      updateHost,
      deleteHost,
      addPlan,
      updatePlan,
      deletePlan,
      addAdmin,
      updateAdmin,
      deleteAdmin,
      customersCount: (hostId: string) =>
        customers.filter((c) =>
          c.subscriptions.some(
            (s) => (typeof s.host === "string" ? s.host : s.host?._id) === hostId
          )
        ).length,
      hostName: (id) => {
        if (!id) return "غير مرتبطة";
        if (typeof id === 'object') {
          return (id as any).name || (id as any).url || "سيرفر";
        }
        const found = hosts.find((p) => p._id === id || p.url === id || (typeof id === 'string' && p.url && p.url.replace(/\/+$/, '') === id.replace(/\/+$/, '')));
        if (found) return found.name;
        if (typeof id === 'string' && id !== "__none__" && id.trim()) {
          const display = id.replace(/^https?:\/\//, '').replace(/\/+$/, '');
          return `آخر (${display})`;
        }
        return "غير مرتبطة";
      },
    }),
    [
      customers,
      hosts,
      plans,
      devices,
      admins,
      fetchDevices,
      searchDevice,
      revokeDevice,
      restoreDevice,
      fetchAdmins,
      addCustomer,
      updateCustomer,
      updateCustomerStatus,
      deleteCustomer,
      addHost,
      updateHost,
      deleteHost,
      addPlan,
      updatePlan,
      deletePlan,
      addAdmin,
      updateAdmin,
      deleteAdmin,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
