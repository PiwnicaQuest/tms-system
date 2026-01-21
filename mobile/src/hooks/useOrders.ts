import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Order, OrderStatus } from '../types';

// Alias for list of driver orders
export function useOrders() {
  return useQuery({
    queryKey: ['driver-orders'],
    queryFn: () => api.get<Order[]>('/driver/orders'),
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useDriverOrders() {
  return useOrders();
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get<Order>(`/driver/orders/${id}`),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      api.patch<Order>(`/driver/orders/${orderId}`, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      photo,
      type
    }: {
      orderId: string;
      photo: { uri: string; base64?: string };
      type: string;
    }) => {
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `${type}_${Date.now()}.jpg`,
      } as never);
      formData.append('type', type);

      return api.uploadPhotos(orderId, formData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
    },
  });
}

export function useUploadSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      signature,
      signerName
    }: {
      orderId: string;
      signature: string;
      signerName: string;
    }) =>
      api.post(`/driver/orders/${orderId}/signature`, { signature, signerName }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['driver-orders'] });
    },
  });
}
