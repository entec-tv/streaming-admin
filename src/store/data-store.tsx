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
} from "@/services/types";
import { api, endpoints } from "@/services/api";
import { useAuth } from "./auth";
import { toast } from "sonner";

interface DataContextValue {
  customers: Customer[];
  hosts: Host[];
  addCustomer: (input: CreateCustomerInput) => void;
  updateCustomer: (id: string, input: Partial<CreateCustomerInput>) => void;
  updateCustomerStatus: (id: string, status: CustomerStatus) => void;
  deleteCustomer: (id: string) => void;

  addHost: (input: CreateHostInput) => void;
  updateHost: (id: string, input: CreateHostInput) => void;
  deleteHost: (id: string) => void;
  
  devices: Device[];
  fetchDevices: () => Promise<void>;
  
  hostName: (id: string | null) => string;
  customersCount: (hostId: string) => number;
  
  plans: AppPlan[];
  addPlan: (input: CreateAppPlanInput) => void;
  updatePlan: (id: string, input: Partial<CreateAppPlanInput>) => void;
  deletePlan: (id: string) => void;
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
    username: s.username,
    password: s.password,
    status: s.status,
    host: s.host,
    macAddress: s.macAddress,
    deviceKey: s.deviceKey,
    lastActive: s.lastActive ? s.lastActive.slice(0, 10) : "",
    appActive: s.appActive,
    appExpiry: s.appExpiry,
  })),
  createdAt: c.createdAt ? c.createdAt.slice(0, 10) : "",
  updatedAt: c.updatedAt ? c.updatedAt.slice(0, 10) : "",
});

const mapDevice = (d: any): Device => ({
  _id: d._id,
  macAddress: d.macAddress,
  deviceKey: d.deviceKey,
  customPlaylists: d.customPlaylists || [],
  lastActive: d.lastActive ? new Date(d.lastActive).toLocaleString('ar-EG') : "غير معروف",
  createdAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString('ar-EG') : "",
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [plans, setPlans] = useState<AppPlan[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const { isAuthed } = useAuth();

  useEffect(() => {
    if (!isAuthed) return;

    fetchDevices();

    api.get(endpoints.hosts)
      .then((res) => setHosts(res.data.map(mapHost)))
      .catch((err) => {
        if (err?.response?.status !== 401) {
          toast.error("خطأ في تحميل قائمة السيرفرات من الخادم");
        }
      });

    api.get(endpoints.customers)
      .then((res) => setCustomers(res.data.map(mapCustomer)))
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
  }, [isAuthed]);

  const addCustomer = useCallback((input: CreateCustomerInput) => {
    api.post(endpoints.customers, {
      name: input.name,
      subscriptions: input.subscriptions || [],
    })
      .then((res) => {
        setCustomers((prev) => [mapCustomer(res.data), ...prev]);
        toast.success("تم إضافة العميل بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في إضافة العميل");
      });
  }, []);

  const updateCustomer = useCallback((id: string, input: Partial<CreateCustomerInput>) => {
    api.put(endpoints.customer(id), input)
      .then((res) => {
        setCustomers((prev) => prev.map((c) => (c._id === id ? mapCustomer(res.data) : c)));
        toast.success("تم تحديث بيانات العميل بنجاح");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "خطأ في تحديث العميل");
      });
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
      console.error(err);
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      customers,
      hosts,
      plans,
      devices,
      fetchDevices,
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
      hostName: (id) => hosts.find((p) => p._id === id)?.name ?? "غير مرتبطة",
      customersCount: (hostId) => customers.filter((c) => c.subscriptions.some(s => (typeof s.host === 'string' ? s.host : s.host?._id) === hostId)).length,
    }),
    [
      customers,
      hosts,
      plans,
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
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}