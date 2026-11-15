import { API_BASE_URL } from '../config';
import type { ApiEnvelope, PaginationMeta, PagedResult } from './types';

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(message: string, status = 0, errors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let cartId: string | null = null;
let refreshPromise: Promise<boolean> | null = null;
const sessionListeners = new Set<(tokens: { accessToken: string; refreshToken: string } | null) => void>();

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCartId(id: string | null) {
  cartId = id;
}

export function getCartId(): string | null {
  return cartId;
}

export function onSessionChange(listener: (tokens: { accessToken: string; refreshToken: string } | null) => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function notifySession(tokens: { accessToken: string; refreshToken: string } | null) {
  sessionListeners.forEach(listener => {
    try {
      listener(tokens);
    } catch {
      // listener failures do not affect the request
    }
  });
}

function extractMessage(payload: any, status: number): string {
  if (payload && typeof payload === 'object') {
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload.title === 'string' && payload.title.trim()) return payload.title;
    if (Array.isArray(payload.errors) && payload.errors.length) {
      return payload.errors.map((e: any) => (typeof e === 'string' ? e : e?.description ?? String(e))).join(' ');
    }
    if (payload.errors && typeof payload.errors === 'object') {
      const flat = Object.values(payload.errors).flat().filter(Boolean);
      if (flat.length) return flat.join(' ');
    }
  }
  if (status === 0) return 'Unable to reach the Safwan API. Check that the server is running.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'The requested item was not found.';
  return `Request failed (${status}).`;
}

function extractErrors(payload: any): string[] {
  if (!payload) return [];
  if (Array.isArray(payload.errors)) {
    return payload.errors.map((e: any) => (typeof e === 'string' ? e : e?.description ?? String(e))).filter(Boolean);
  }
  if (payload.errors && typeof payload.errors === 'object') {
    return Object.values(payload.errors).flat().map(String).filter(Boolean);
  }
  return [];
}

async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const payload = (await response.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>;
        if (!payload?.data?.accessToken) return false;
        setTokens(payload.data.accessToken, payload.data.refreshToken);
        notifySession(payload.data);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function clearSession() {
  setTokens(null, null);
  notifySession(null);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, any>;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, any>): string {
  const base = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item !== undefined && item !== null && item !== '') params.append(key, String(item));
      });
    } else {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function rawRequest(path: string, options: RequestOptions = {}, retried = false): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...(options.headers ?? {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (cartId) headers['X-Cart-Id'] = cartId;

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (error) {
    if ((error as any)?.name === 'AbortError') throw error;
    throw new ApiError('Unable to reach the Safwan API. Check that the server is running.', 0);
  }

  if (response.status === 401 && !retried && !path.startsWith('/auth/') && refreshToken) {
    const refreshed = await refreshSession();
    if (refreshed) return rawRequest(path, options, true);
  }

  return response;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawRequest(path, options);
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok || payload?.success === false) {
    throw new ApiError(extractMessage(payload, response.status), response.status, extractErrors(payload));
  }
  return payload?.data as T;
}

export async function requestPaged<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
  const response = await rawRequest(path, options);
  const text = await response.text();
  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok || payload?.success === false) {
    throw new ApiError(extractMessage(payload, response.status), response.status, extractErrors(payload));
  }
  const items: T[] = Array.isArray(payload?.data) ? payload.data : [];
  const pagination = (payload?.pagination ?? {
    page: 1,
    pageSize: items.length || 12,
    totalItems: items.length,
    totalPages: 1,
  }) as PaginationMeta;
  return { items, pagination };
}

export async function requestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await rawRequest(path, options);
  if (!response.ok) {
    const text = await response.text();
    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    throw new ApiError(extractMessage(payload, response.status), response.status, extractErrors(payload));
  }
  return response.blob();
}

export async function uploadFile(path: string, file: File | { uri: string; name: string; type: string }): Promise<any> {
  const form = new FormData();
  if (typeof File !== 'undefined' && file instanceof File) {
    form.append('file', file);
  } else {
    form.append('file', file as any);
  }
  return request(path, { method: 'POST', body: form });
}
