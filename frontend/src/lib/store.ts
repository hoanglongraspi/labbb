import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'PATIENT';
  patientId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ user, accessToken });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, accessToken: null });
      },
      updateUser: (updates) => {
        const currentUser = get().user;
        if (!currentUser) {
          return;
        }

        const updatedUser = { ...currentUser, ...updates };
        set({ user: updatedUser });
      },
      isAuthenticated: () => {
        const token =
          get().accessToken ||
          (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
        return get().user !== null && token !== null;
      },
      isAdmin: () => {
        return get().user?.role === 'ADMIN';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user, not token
    }
  )
);
