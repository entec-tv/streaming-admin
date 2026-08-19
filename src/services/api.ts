import axios from "axios";

/**
 * إعدادات Axios للاتصال بواجهة NestJS الخلفية.
 * غيّر VITE_API_URL في ملف البيئة عند ربط الـ API الحقيقي.
 */
export const api = axios.create({
  baseURL: "https://entecstreamingnestjs-production.up.railway.app/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("entec_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("entec_token");
      window.localStorage.removeItem("entec_admin");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  },
);

/** نقاط النهاية المتوقعة من NestJS API. */
export const endpoints = {
  login: "/auth/login",
  customers: "/customers",
  customerStats: "/customers/stats",
  customer: (id: string) => `/customers/${id}`,
  customerDevices: (id: string) => `/customers/${id}/devices`,
  customerDevice: (id: string, mac: string) => `/customers/${id}/devices/${mac}`,
  hosts: "/hosts",
  host: (id: string) => `/hosts/${id}`,
  stats: "/stats",
  plans: "/admin/plans",
  plan: (id: string) => `/admin/plans/${id}`,
};