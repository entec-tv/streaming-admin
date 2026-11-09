export type CustomerStatus = "active" | "blocked";
export type DeviceStatus = "active" | "inactive" | "blocked";
export type RegisteredDeviceStatus = "active" | "revoked";
export type AdminRole = "owner" | "admin" | "viewer";
export type PaymentStatus = "pending" | "paid" | "refunded" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "online" | "other";

export interface PaymentRecord {
  _id: string;
  customerId: string;
  customerName: string;
  subscriptionId?: string;
  subscriptionLabel?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  createdByUsername: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface CreatePaymentInput {
  customerId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface PaymentSummary {
  currency: string;
  count: number;
  paid: number;
  pending: number;
  refunded: number;
}

export interface AdminUser {
  _id: string;
  username: string;
  role: AdminRole;
  createdAt: string;
  updatedAt: string;
}

export type CreateAdminUserInput = Omit<AdminUser, "_id" | "createdAt" | "updatedAt"> & { password?: string };

export interface Host {
  _id: string;
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}


export interface CustomerSubscription {
  _id?: string;
  playlistName?: string;
  host: Host | string | null;
  username: string;
  password?: string;
  status: CustomerStatus;
  macAddress: string;
  deviceKey: string;
  lastActive?: string;
  appActive?: boolean;
  appExpiry?: string | null;
  isLocked?: boolean;
}

export interface Customer {
  _id: string;
  name: string;
  status: CustomerStatus;
  subscriptions: CustomerSubscription[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateHostInput {
  name: string;
  url: string;
}

export interface CustomerSubscriptionInput {
  playlistName?: string;
  username: string;
  password?: string;
  host: string;
  status?: CustomerStatus;
  macAddress: string;
  deviceKey: string;
  appActive?: boolean;
  appExpiry?: string | null;
  playlistPin?: string | null;
}

export interface CreateCustomerInput {
  name: string;
  subscriptions?: CustomerSubscriptionInput[];
}

export interface AppPlan {
  _id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

export type AppUpdatePlatform = "windows" | "android" | "ios" | "web";

export interface AppUpdate {
  platform: AppUpdatePlatform;
  version: string;
  downloadUrl: string;
  sha256: string;
  updatedAt?: string;
}

export interface AppUpdateHistoryEntry {
  _id: string;
  version: string;
  downloadUrl: string;
  sha256: string;
  action: "published" | "restored" | "baseline";
  actorUsername: string;
  actorRole: "owner" | "admin" | "system";
  restoredFromId?: string;
  changedAt: string;
}

export interface AppUpdateHistoryResponse {
  entries: AppUpdateHistoryEntry[];
  total: number;
  page: number;
  pages: number;
}

export type CreateAppPlanInput = Omit<AppPlan, "_id">;

export interface CustomPlaylist {
  name: string;
  url: string;
}

export interface Device {
  _id: string;
  macAddress: string;
  deviceKey: string;
  customPlaylists: CustomPlaylist[];
  playlistCount: number;
  status: RegisteredDeviceStatus;
  revokedAt?: string | null;
  revokeReason?: string | null;
  lastActive: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  createdAt: string;
}
