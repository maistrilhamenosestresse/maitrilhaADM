import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  agendaId: string;
  title: string;
  price: number;
  date: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (agendaId: string) => void;
  updateQuantity: (agendaId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalQuantity: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.agendaId === item.agendaId);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.agendaId === item.agendaId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },
      removeItem: (agendaId) => {
        set((state) => ({
          items: state.items.filter((i) => i.agendaId !== agendaId),
        }));
      },
      updateQuantity: (agendaId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.agendaId === agendaId ? { ...i, quantity } : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotalQuantity: () => get().items.reduce((total, item) => total + item.quantity, 0),
      getTotalPrice: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
    }),
    {
      name: 'carrinho-storage',
    }
  )
);
