export type DeviceStatus = "active" | "inactive" | "blocked";

export interface Playlist {
  id: string;
  name: string;
  host: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Device {
  id: string;
  mac: string;
  name?: string;
  status: DeviceStatus;
  playlistId: string | null;
  createdAt: string;
}

export interface CreatePlaylistInput {
  name: string;
  host: string;
  username: string;
  password: string;
}

export interface CreateDeviceInput {
  mac: string;
  name?: string;
  playlistId?: string | null;
}