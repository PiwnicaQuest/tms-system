export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'DRIVER' | 'ADMIN' | 'SUPER_ADMIN' | 'DISPATCHER';
  tenantId: string;
  vehicleNumber?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  loadingDate: string;
  loadingAddress: string;
  loadingCity?: string;
  loadingCountry?: string;
  loadingContact?: string;
  loadingPhone?: string;
  unloadingDate: string;
  unloadingAddress: string;
  unloadingCity?: string;
  unloadingCountry?: string;
  unloadingContact?: string;
  unloadingPhone?: string;
  cargoDescription?: string;
  cargoWeight?: number;
  cargoVolume?: number;
  weight?: number;
  distance?: number;
  notes?: string;
  photos?: OrderPhoto[];
  contractor?: {
    id: string;
    name: string;
    phone?: string;
  };
  vehicle?: {
    id: string;
    plateNumber: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderPhoto {
  id: string;
  url: string;
  type: string;
  createdAt: string;
}

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'UNLOADING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number | null;
  heading?: number;
  accuracy?: number;
}

export interface DeliveryPhoto {
  uri: string;
  type: 'loading' | 'unloading' | 'damage' | 'document' | 'other';
  timestamp: number;
  orderId: string;
}

export interface Signature {
  base64: string;
  signerName: string;
  timestamp: number;
  orderId: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: 'Nowe',
  ACCEPTED: 'Zaakceptowane',
  LOADING: 'Załadunek',
  IN_TRANSIT: 'W trasie',
  UNLOADING: 'Rozładunek',
  DELIVERED: 'Dostarczone',
  COMPLETED: 'Zakończone',
  CANCELLED: 'Anulowane',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  NEW: '#3b82f6',
  ACCEPTED: '#8b5cf6',
  LOADING: '#f59e0b',
  IN_TRANSIT: '#06b6d4',
  UNLOADING: '#ec4899',
  DELIVERED: '#22c55e',
  COMPLETED: '#16a34a',
  CANCELLED: '#ef4444',
};
