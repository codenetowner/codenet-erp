import { create } from 'zustand';

export interface CartItem {
  productId: number;
  companyId: number;
  name: string;
  imageUrl?: string;
  unitType: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: number, unitType: string) => void;
  updateQuantity: (productId: number, unitType: string, quantity: number) => void;
  clearCart: () => void;
  clearCompanyItems: (companyId: number) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId && i.unitType === item.unitType
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId && i.unitType === item.unitType
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },

  removeItem: (productId, unitType) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.unitType === unitType)
      ),
    }));
  },

  updateQuantity: (productId, unitType, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId, unitType);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.unitType === unitType
          ? { ...i, quantity }
          : i
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  clearCompanyItems: (companyId) => {
    set((state) => ({
      items: state.items.filter((i) => i.companyId !== companyId),
    }));
  },
}));

// Derived selectors (use these outside the store)
export const selectCompanyItems = (companyId: number) => (state: CartState) =>
  state.items.filter((i) => i.companyId === companyId);

export const selectCompanyTotal = (companyId: number) => (state: CartState) =>
  state.items.filter((i) => i.companyId === companyId).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

export const selectTotalItems = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);
