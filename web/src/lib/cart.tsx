"use client";
// 購物車：localStorage + React Context
// 訂單 = 一組維修項目（可包含多機型多項目，到店取件或寄送）
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartKind = "repair" | "product";

export interface CartItem {
  key: string;
  kind: CartKind;
  // 共通
  title: string;          // 顯示標題
  subtitle?: string;      // 副標（規格/配件）
  imageUrl?: string;
  unitPrice: number;
  qty: number;
  // 維修專用
  modelId?: number;
  modelSlug?: string;
  modelName?: string;
  brandSlug?: string;
  brandName?: string;
  itemId?: number;
  itemName?: string;
  tier?: "STANDARD" | "OEM";
  tierLabel?: string;
  // 商品專用
  productId?: number;
  productSlug?: string;
}

interface CartState {
  items: CartItem[];
  count: number;
  subtotal: number;
}

interface CartActions {
  add: (item: Omit<CartItem, "qty" | "key"> & { key?: string }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<(CartState & CartActions) | null>(null);

const STORAGE_KEY = "istyle-cart-v1";

function buildKey(item: { kind: CartKind; modelId?: number; itemId?: number; tier?: string; productId?: number }) {
  if (item.kind === "product") return `prod-${item.productId}`;
  return `repair-${item.modelId}-${item.itemId}-${item.tier}`;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  // sync to localStorage on change
  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const add: CartActions["add"] = useCallback((item) => {
    setItems(prev => {
      const key = item.key || buildKey(item);
      const existing = prev.find(x => x.key === key);
      if (existing) {
        return prev.map(x => x.key === key ? { ...x, qty: x.qty + 1 } : x);
      }
      return [...prev, { ...item, key, qty: 1 } as CartItem];
    });
  }, []);

  const remove: CartActions["remove"] = useCallback((key) => {
    setItems(prev => prev.filter(x => x.key !== key));
  }, []);

  const setQty: CartActions["setQty"] = useCallback((key, qty) => {
    if (qty < 1) {
      setItems(prev => prev.filter(x => x.key !== key));
    } else {
      setItems(prev => prev.map(x => x.key === key ? { ...x, qty: Math.min(qty, 99) } : x));
    }
  }, []);

  const clear: CartActions["clear"] = useCallback(() => {
    setItems([]);
  }, []);

  const count = items.reduce((s, x) => s + x.qty, 0);
  const subtotal = items.reduce((s, x) => s + x.unitPrice * x.qty, 0);

  return (
    <CartContext.Provider value={{ items, count, subtotal, add, remove, setQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart 必須在 CartProvider 內");
  return ctx;
}
