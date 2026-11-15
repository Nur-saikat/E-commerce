import { useRouter } from './Router';

export function openUrl(router: ReturnType<typeof useRouter>, url?: string | null) {
  if (!url) return;
  const clean = url.trim();
  if (clean.startsWith('#/')) {
    const path = clean.slice(1);
    const [pathname, search = ''] = path.split('?');
    const parts = pathname.split('/').filter(Boolean);
    const params: Record<string, string> = {};
    new URLSearchParams(search).forEach((value, key) => {
      params[key] = value;
    });
    if (parts[0] === 'product' && parts[1]) router.navigate('product', { slug: parts[1] });
    else if (parts[0] === 'category' && parts[1]) router.navigate('category', { slug: parts[1], ...params });
    else if (parts[0] === 'shop') router.navigate('shop', params);
    else router.navigate('home');
    return;
  }
  if (clean.startsWith('/product/')) {
    router.navigate('product', { slug: clean.split('/')[2] });
    return;
  }
  if (clean.startsWith('/category/')) {
    const [pathname, search = ''] = clean.split('?');
    const params: Record<string, string> = {};
    new URLSearchParams(search).forEach((value, key) => {
      params[key] = value;
    });
    router.navigate('category', { slug: pathname.split('/')[2], ...params });
    return;
  }
  if (clean.startsWith('/shop') || clean === '/') {
    const [pathname, search = ''] = clean.split('?');
    const params: Record<string, string> = {};
    new URLSearchParams(search).forEach((value, key) => {
      params[key] = value;
    });
    router.navigate(pathname === '/' ? 'home' : 'shop', params);
    return;
  }
  if (clean.startsWith('/account/orders/')) {
    router.navigate('order', { id: clean.split('/')[3] });
    return;
  }
  if (clean.startsWith('http')) {
    if (typeof window !== 'undefined') window.location.href = clean;
  }
}
