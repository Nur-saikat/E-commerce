import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async (silent = false) => {
    const current = ++generation.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      if (generation.current === current) setData(result);
    } catch (err: any) {
      if (generation.current === current) {
        setError(err?.message ?? 'Unable to load this page.');
      }
    } finally {
      if (generation.current === current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload: load, setData };
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = title ? `${title} · Safwan Shop` : 'Safwan Shop';
  }, [title]);
}
