import { create } from 'zustand';
import type { Order } from '../types';

interface OrdersState {
  selectedOrder: Order | null;
  activeOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  setActiveOrder: (order: Order | null) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  selectedOrder: null,
  activeOrder: null,
  setSelectedOrder: (order) => set({ selectedOrder: order }),
  setActiveOrder: (order) => set({ activeOrder: order }),
}));
