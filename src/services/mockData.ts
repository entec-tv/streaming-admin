import type { Device, Playlist } from "./types";

export const mockPlaylists: Playlist[] = [
  {
    id: "pl-1",
    name: "الباقة العربية الذهبية",
    host: "http://gold.entec-cdn.tv:8080",
    username: "gold_user",
    password: "g0ld-2026",
    createdAt: "2026-01-14",
  },
  {
    id: "pl-2",
    name: "باقة الرياضة العالمية",
    host: "http://sport.entec-cdn.tv:2095",
    username: "sport_admin",
    password: "sp0rt-live",
    createdAt: "2026-02-03",
  },
  {
    id: "pl-3",
    name: "باقة الأفلام والمسلسلات",
    host: "http://vod.entec-cdn.tv:8000",
    username: "vod_master",
    password: "vod-9931",
    createdAt: "2026-03-21",
  },
];

export const mockDevices: Device[] = [
  {
    id: "dv-1",
    mac: "1A:2B:3C:4D:5E:6F",
    name: "جهاز الصالة - أبو محمد",
    status: "active",
    playlistId: "pl-1",
    createdAt: "2026-02-11",
  },
  {
    id: "dv-2",
    mac: "AA:BB:CC:11:22:33",
    name: "مقهى النخيل",
    status: "active",
    playlistId: "pl-2",
    createdAt: "2026-03-02",
  },
  {
    id: "dv-3",
    mac: "0F:1E:2D:3C:4B:5A",
    name: "جهاز تجريبي",
    status: "inactive",
    playlistId: null,
    createdAt: "2026-04-18",
  },
  {
    id: "dv-4",
    mac: "99:88:77:66:55:44",
    name: "فندق الواحة - غرفة 204",
    status: "blocked",
    playlistId: "pl-3",
    createdAt: "2026-05-06",
  },
  {
    id: "dv-5",
    mac: "12:34:56:78:9A:BC",
    name: "جهاز المكتب",
    status: "active",
    playlistId: "pl-3",
    createdAt: "2026-06-27",
  },
];