import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wishlistApi } from '../api';
import type { Wishlist, WishlistItem } from '../api/types';
import { useAuth } from './AuthContext';

interface WishlistValue {
  ids: Set<string>;
  items: WishlistItem[];
  loading: boolean;
  toggle: (productId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist>({ items: [] });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setWishlist({ items: [] });
      return;
    }
    setLoading(true);
    try {
      const data = await wishlistApi.get();
      setWishlist(data ?? { items: [] });
    } catch {
      // ignore transient wishlist errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, user?.id, refresh]);

  const toggle = useCallback(
    async (productId: string) => {
      if (!user) throw new Error('Sign in to save products to your wishlist.');
      const has = wishlist.items.some(item => item.productId === productId);
      const data = has ? await wishlistApi.remove(productId) : await wishlistApi.add(productId);
      setWishlist(data ?? { items: [] });
      return !has;
    },
    [user, wishlist.items],
  );

  const ids = useMemo(() => new Set(wishlist.items.map(item => item.productId)), [wishlist.items]);

  const value = useMemo<WishlistValue>(
    () => ({ ids, items: wishlist.items, loading, toggle, refresh }),
    [ids, wishlist.items, loading, toggle, refresh],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
