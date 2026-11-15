import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type RouteParams = Record<string, string>;
export interface RouteState {
  name: string;
  params: RouteParams;
}

interface RouteDef {
  name: string;
  pattern: string;
}

const routeDefs: RouteDef[] = [
  { name: 'home', pattern: '/' },
  { name: 'shop', pattern: '/shop' },
  { name: 'category', pattern: '/category/:slug' },
  { name: 'product', pattern: '/product/:slug' },
  { name: 'cart', pattern: '/cart' },
  { name: 'checkout', pattern: '/checkout' },
  { name: 'confirmation', pattern: '/order-confirmation/:orderId' },
  { name: 'wishlist', pattern: '/wishlist' },
  { name: 'login', pattern: '/login' },
  { name: 'register', pattern: '/register' },
  { name: 'forgot-password', pattern: '/forgot-password' },
  { name: 'reset-password', pattern: '/reset-password' },
  { name: 'account', pattern: '/account' },
  { name: 'orders', pattern: '/account/orders' },
  { name: 'order', pattern: '/account/orders/:id' },
  { name: 'returns', pattern: '/account/returns' },
  { name: 'addresses', pattern: '/account/addresses' },
  { name: 'profile', pattern: '/account/profile' },
  { name: 'rewards', pattern: '/account/rewards' },
  { name: 'my-reviews', pattern: '/account/reviews' },
  { name: 'track-order', pattern: '/track-order' },
  { name: 'contact', pattern: '/contact' },
  { name: 'about', pattern: '/about' },
  { name: 'admin', pattern: '/admin' },
  { name: 'admin-products', pattern: '/admin/products' },
  { name: 'admin-categories', pattern: '/admin/categories' },
  { name: 'admin-brands', pattern: '/admin/brands' },
  { name: 'admin-orders', pattern: '/admin/orders' },
  { name: 'admin-order', pattern: '/admin/orders/:id' },
  { name: 'admin-customers', pattern: '/admin/customers' },
  { name: 'admin-inventory', pattern: '/admin/inventory' },
  { name: 'admin-coupons', pattern: '/admin/coupons' },
  { name: 'admin-reviews', pattern: '/admin/reviews' },
  { name: 'admin-content', pattern: '/admin/content' },
  { name: 'admin-settings', pattern: '/admin/settings' },
  { name: 'admin-roles', pattern: '/admin/roles' },
  { name: 'admin-returns', pattern: '/admin/returns' },
  { name: 'admin-reports', pattern: '/admin/reports' },
  { name: 'admin-business', pattern: '/admin/business' },
  { name: 'admin-profit-loss', pattern: '/admin/business/profit-loss' },
  { name: 'admin-purchases', pattern: '/admin/business/purchases' },
  { name: 'admin-arrivals', pattern: '/admin/business/arrivals' },
  { name: 'admin-supplier-returns', pattern: '/admin/business/supplier-returns' },
  { name: 'admin-staff', pattern: '/admin/business/staff' },
  { name: 'admin-capital', pattern: '/admin/business/capital' },
  { name: 'admin-expenses', pattern: '/admin/business/expenses' },
  { name: 'admin-profile', pattern: '/admin/business/profile' },
];

function matchPath(path: string): RouteState | null {
  const [pathname, search = ''] = path.split('?');
  const clean = pathname.replace(/\/+$/, '') || '/';
  const query: RouteParams = {};
  new URLSearchParams(search).forEach((value, key) => {
    query[key] = value;
  });
  for (const def of routeDefs) {
    const patternParts = def.pattern.split('/').filter(Boolean);
    const pathParts = clean.split('/').filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;
    const params: RouteParams = { ...query };
    let matched = true;
    for (let i = 0; i < patternParts.length; i += 1) {
      const p = patternParts[i];
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (p !== pathParts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { name: def.name, params };
  }
  return null;
}

function buildPath(state: RouteState): string {
  const def = routeDefs.find(r => r.name === state.name);
  if (!def) return '/';
  const used = new Set<string>();
  const path = def.pattern
    .split('/')
    .map(part => {
      if (!part.startsWith(':')) return part;
      const key = part.slice(1);
      used.add(key);
      return encodeURIComponent(state.params[key] ?? '');
    })
    .join('/');
  const query = Object.entries(state.params)
    .filter(([key, value]) => !used.has(key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  const normalized = path || '/';
  return query ? `${normalized}?${query}` : normalized;
}

function initialRoute(): RouteState {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash || window.location.pathname || '/';
    const match = matchPath(path);
    if (match) return match;
    if (path !== '/' && path !== '') return { name: 'not-found', params: {} };
  }
  return { name: 'home', params: {} };
}

function currentHashPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hash.replace(/^#/, '') || '/';
}

interface RouterValue {
  route: RouteState;
  stack: RouteState[];
  navigate: (name: string, params?: RouteParams) => void;
  replace: (name: string, params?: RouteParams) => void;
  reset: (name: string, params?: RouteParams) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<RouteState[]>(() => [initialRoute()]);
  const route = stack[stack.length - 1];

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#${buildPath(route)}`);
    }
    const onPop = () => {
      const path = currentHashPath();
      const match = matchPath(path) ?? { name: 'home', params: {} };
      setStack(prev => {
        const target = buildPath(match);
        const previous = prev[prev.length - 2];
        if (previous && buildPath(previous) === target) return prev.slice(0, -1);
        const current = prev[prev.length - 1];
        if (current && buildPath(current) === target) return prev;
        return [match];
      });
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const scrollTop = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const navigate = useCallback(
    (name: string, params: RouteParams = {}) => {
      const next = { name, params };
      setStack(prev => [...prev, next]);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.pushState(null, '', `#${buildPath(next)}`);
      }
      scrollTop();
    },
    [scrollTop],
  );

  const replace = useCallback(
    (name: string, params: RouteParams = {}) => {
      const next = { name, params };
      setStack(prev => [...prev.slice(0, -1), next]);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(null, '', `#${buildPath(next)}`);
      }
      scrollTop();
    },
    [scrollTop],
  );

  const reset = useCallback(
    (name: string, params: RouteParams = {}) => {
      const next = { name, params };
      setStack([next]);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.pushState(null, '', `#${buildPath(next)}`);
      }
      scrollTop();
    },
    [scrollTop],
  );

  const goBack = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && stack.length > 1) {
      window.history.back();
      return;
    }
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, [stack.length]);

  const value = useMemo<RouterValue>(
    () => ({ route, stack, navigate, replace, reset, goBack, canGoBack: stack.length > 1 }),
    [route, stack, navigate, replace, reset, goBack],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

export function useParams<T extends RouteParams = RouteParams>(): T {
  return useRouter().route.params as T;
}

export function hrefFor(name: string, params: RouteParams = {}): string {
  return `#${buildPath({ name, params })}`;
}
