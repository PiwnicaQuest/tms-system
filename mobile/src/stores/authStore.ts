import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ user: User; token: string }>(
        '/auth/driver-login',
        { email, password }
      );

      await api.setToken(response.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.user));

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Błąd logowania',
        isLoading: false
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.clearToken();
      await SecureStore.deleteItemAsync('user');
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const userJson = await SecureStore.getItemAsync('user');
      const token = await api.getToken();

      if (userJson && token) {
        const user = JSON.parse(userJson) as User;
        // Verify token is still valid
        try {
          await api.get('/auth/me');
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          // Token invalid, clear auth
          await api.clearToken();
          await SecureStore.deleteItemAsync('user');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
