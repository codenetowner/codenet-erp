import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isGuest: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setGuest: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isGuest: true,
  setAuth: (token, user) => set({ token, user, isGuest: false }),
  logout: () => set({ token: null, user: null, isGuest: true }),
  setGuest: () => set({ isGuest: true }),
}));
