import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { mockDevices, mockPlaylists } from "@/services/mockData";
import type {
  CreateDeviceInput,
  CreatePlaylistInput,
  Device,
  DeviceStatus,
  Playlist,
} from "@/services/types";

interface DataContextValue {
  devices: Device[];
  playlists: Playlist[];
  addDevice: (input: CreateDeviceInput) => void;
  updateDeviceStatus: (id: string, status: DeviceStatus) => void;
  linkPlaylist: (deviceId: string, playlistId: string | null) => void;
  deleteDevice: (id: string) => void;
  addPlaylist: (input: CreatePlaylistInput) => void;
  updatePlaylist: (id: string, input: CreatePlaylistInput) => void;
  deletePlaylist: (id: string) => void;
  playlistName: (id: string | null) => string;
  devicesCount: (playlistId: string) => number;
}

const DataContext = createContext<DataContextValue | null>(null);

const today = () => new Date().toISOString().slice(0, 10);
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8)}`;

export function DataProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<Device[]>(mockDevices);
  const [playlists, setPlaylists] = useState<Playlist[]>(mockPlaylists);

  const addDevice = useCallback((input: CreateDeviceInput) => {
    setDevices((prev) => [
      {
        id: uid("dv"),
        mac: input.mac.toUpperCase(),
        name: input.name?.trim() || undefined,
        status: "inactive",
        playlistId: input.playlistId ?? null,
        createdAt: today(),
      },
      ...prev,
    ]);
  }, []);

  const updateDeviceStatus = useCallback((id: string, status: DeviceStatus) => {
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  }, []);

  const linkPlaylist = useCallback((deviceId: string, playlistId: string | null) => {
    setDevices((prev) => prev.map((d) => (d.id === deviceId ? { ...d, playlistId } : d)));
  }, []);

  const deleteDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addPlaylist = useCallback((input: CreatePlaylistInput) => {
    setPlaylists((prev) => [{ id: uid("pl"), ...input, createdAt: today() }, ...prev]);
  }, []);

  const updatePlaylist = useCallback((id: string, input: CreatePlaylistInput) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, ...input } : p)));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    setDevices((prev) => prev.map((d) => (d.playlistId === id ? { ...d, playlistId: null } : d)));
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({
      devices,
      playlists,
      addDevice,
      updateDeviceStatus,
      linkPlaylist,
      deleteDevice,
      addPlaylist,
      updatePlaylist,
      deletePlaylist,
      playlistName: (id) => playlists.find((p) => p.id === id)?.name ?? "غير مرتبطة",
      devicesCount: (playlistId) => devices.filter((d) => d.playlistId === playlistId).length,
    }),
    [
      devices,
      playlists,
      addDevice,
      updateDeviceStatus,
      linkPlaylist,
      deleteDevice,
      addPlaylist,
      updatePlaylist,
      deletePlaylist,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}