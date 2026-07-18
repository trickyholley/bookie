import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Format } from "@bookie/shared";
import { useCurrentUser } from "@/context/UserContext";

export interface CartItem {
  bookId: string;
  title: string;
  format: Format;
  unitPrice: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (bookId: string, format: Format, quantity: number) => void;
  removeItem: (bookId: string, format: Format) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(userId: string): string {
  return `bookie:cart:${userId}`;
}

function loadCart(userId: string | null): CartItem[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

// Cart is scoped to the currently selected user (no auth/session to hang it
// off otherwise) — switching users swaps to that user's own persisted cart.
export function CartProvider({ children }: { children: ReactNode }) {
  const { userId } = useCurrentUser();
  const [items, setItems] = useState<CartItem[]>(() => loadCart(userId));

  useEffect(() => {
    setItems(loadCart(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(storageKey(userId), JSON.stringify(items));
  }, [userId, items]);

  const value = useMemo<CartContextValue>(() => {
    const addItem: CartContextValue["addItem"] = (item, quantity) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.bookId === item.bookId && i.format === item.format);
        if (existing) {
          return prev.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + quantity } : i,
          );
        }
        return [...prev, { ...item, quantity }];
      });
    };

    const updateQuantity: CartContextValue["updateQuantity"] = (bookId, format, quantity) => {
      setItems((prev) =>
        quantity <= 0
          ? prev.filter((i) => !(i.bookId === bookId && i.format === format))
          : prev.map((i) => (i.bookId === bookId && i.format === format ? { ...i, quantity } : i)),
      );
    };

    const removeItem: CartContextValue["removeItem"] = (bookId, format) => {
      setItems((prev) => prev.filter((i) => !(i.bookId === bookId && i.format === format)));
    };

    const clear = () => setItems([]);

    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = Math.round(items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;

    return { items, itemCount, total, addItem, updateQuantity, removeItem, clear };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
