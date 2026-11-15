import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { cartApi } from '../api';
import { getCartId, setCartId } from '../api/client';
import type { Cart, CartSummary } from '../api/types';
import { STORAGE_KEYS } from '../config';
import { storage } from '../storage';
import { useAuth } from './AuthContext';

const emptySummary: CartSummary = {
  subtotal: 0,
  discount: 0,
  couponCode: null,
  shipping: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  freeShippingThreshold: 0,
  amountToFreeShipping: 0,
};

interface CartValue {
  cart: Cart;
  items: Cart['items'];
  summary: CartSummary;
  count: number;
  loading: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, quantity?: number, variantId?: string | null) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

const CartContext = createContext<CartValue | null>(null);

function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [cart, setCart] = useState<Cart>({ items: [], summary: emptySummary });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const initialized = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const ensureGuestId = useCallback(async (): Promise<string> => {
    const memory = getCartId();
    if (memory) return memory;
    const stored = await storage.get(STORAGE_KEYS.cartId);
    const id = stored ?? generateGuestId();
    setCartId(id);
    if (!stored) await storage.set(STORAGE_KEYS.cartId, id);
    return id;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await cartApi.get();
      setCart(data);
    } catch {
      // an empty local cart is fine when the API cannot be reached
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      const guestId = await ensureGuestId();
      if (!initialized.current) {
        initialized.current = true;
        lastUserId.current = user?.id ?? null;
      } else if (!lastUserId.current && user) {
        try {
          await cartApi.merge(guestId);
          await storage.set(STORAGE_KEYS.cartId, guestId);
        } catch {
          // merge is best-effort
        }
        lastUserId.current = user.id;
      } else {
        lastUserId.current = user?.id ?? null;
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id, ensureGuestId, refresh]);

  const run = useCallback(
    async (operation: () => Promise<Cart>) => {
      setBusy(true);
      try {
        const data = await operation();
        setCart(data);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const add = useCallback(
    async (productId: string, quantity = 1, variantId?: string | null) => {
      await ensureGuestId();
      await run(() => cartApi.add(productId, quantity, variantId));
    },
    [ensureGuestId, run],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return;
      await run(() => cartApi.update(itemId, quantity));
    },
    [run],
  );

  const remove = useCallback(async (itemId: string) => run(() => cartApi.remove(itemId)), [run]);
  const clear = useCallback(async () => run(() => cartApi.clear()), [run]);
  const applyCoupon = useCallback(async (code: string) => run(() => cartApi.applyCoupon(code.trim())), [run]);
  const removeCoupon = useCallback(async () => run(() => cartApi.removeCoupon()), [run]);

  const value = useMemo<CartValue>(
    () => ({
      cart,
      items: cart.items ?? [],
      summary: { ...emptySummary, ...(cart.summary ?? {}) },
      count: cart.summary?.itemCount ?? 0,
      loading,
      busy,
      refresh,
      add,
      updateQuantity,
      remove,
      clear,
      applyCoupon,
      removeCoupon,
    }),
    [cart, loading, busy, refresh, add, updateQuantity, remove, clear, applyCoupon, removeCoupon],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export const isWeb = Platform.OS === 'web';
