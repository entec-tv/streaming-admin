import axios from "axios";

/**
 * إعدادات Axios للاتصال بواجهة NestJS الخلفية.
 * غيّر VITE_API_URL في ملف البيئة عند ربط الـ API الحقيقي.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
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
    }
    return Promise.reject(error);
  },
);

/** نقاط النهاية المتوقعة من NestJS API. */
export const endpoints = {
  login: "/auth/login",
  devices: "/devices",
  device: (id: string) => `/devices/${id}`,
  linkPlaylist: (id: string) => `/devices/${id}/playlist`,
  playlists: "/playlists",
  playlist: (id: string) => `/playlists/${id}`,
  stats: "/stats",
};