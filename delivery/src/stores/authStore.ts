import { create } from 'zustand';

interface Driver {
  id: number;
  name: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  vehicleType: string;
  vehiclePlate?: string;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  isOnline: boolean;
}

interface CompanyProfile {
  id: number;
  name: string;
  phone: string;
  email?: string;
}

type Role = 'driver' | 'company';

interface AuthState {
  token: string | null;
  driver: Driver | null;
  company: CompanyProfile | null;
  role: Role | null;
  status: string | null;
  setAuth: (token: string, driver: Driver, status: string) => void;
  setCompanyAuth: (token: string, company: CompanyProfile) => void;
  setDriver: (driver: Partial<Driver>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  driver: null,
  company: null,
  role: null,
  status: null,
  setAuth: (token, driver, status) => set({ token, driver, status, role: 'driver', company: null }),
  setCompanyAuth: (token, company) => set({ token, company, role: 'company', driver: null, status: 'approved' }),
  setDriver: (updates) =>
    set((state) => ({
      driver: state.driver ? { ...state.driver, ...updates } : null,
    })),
  logout: () => set({ token: null, driver: null, company: null, role: null, status: null }),
}));
