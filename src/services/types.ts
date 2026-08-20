export type CustomerStatus = "active" | "blocked";
export type DeviceStatus = "active" | "inactive" | "blocked";

export interface AdminUser {
  _id: string;
  username: string;
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
  host: Host | string | null;
  username: string;
  password?: string;
  status: CustomerStatus;
  macAddress: string;
  deviceKey: string;
  lastActive?: string;
  appActive?: boolean;
  appExpiry?: string | null;
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
  username: string;
  password?: string;
  host: string;
  status?: CustomerStatus;
  macAddress: string;
  deviceKey: string;
  appActive?: boolean;
  appExpiry?: string | null;
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
  lastActive: string;
  createdAt: string;
}
