import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { authApi } from '../api';
import { clearSession, onSessionChange, setTokens } from '../api/client';
import { ApiError } from '../api/client';
import type { OtpChallenge, User } from '../api/types';
import { STORAGE_KEYS } from '../config';
import { storage } from '../storage';

interface AuthValue {
  user: User | null;
  ready: boolean;
  busy: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<User>;
  requestRegistrationOtp: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<OtpChallenge>;
  verifyRegistration: (email: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const staffRoles = new Set(['SuperAdmin', 'Admin', 'Manager', 'Staff']);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  const persistTokens = useCallback(async (access: string | null, refresh: string | null) => {
    setTokens(access, refresh);
    if (access) await storage.set(STORAGE_KEYS.accessToken, access);
    else await storage.remove(STORAGE_KEYS.accessToken);
    if (refresh) await storage.set(STORAGE_KEYS.refreshToken, refresh);
    else await storage.remove(STORAGE_KEYS.refreshToken);
  }, []);

  const persistUser = useCallback(async (next: User | null) => {
    setUser(next);
    if (next) await storage.setJSON(STORAGE_KEYS.user, next);
    else await storage.remove(STORAGE_KEYS.user);
  }, []);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      const access = await storage.get(STORAGE_KEYS.accessToken);
      const refresh = await storage.get(STORAGE_KEYS.refreshToken);
      const cachedUser = await storage.getJSON<User>(STORAGE_KEYS.user);
      if (access && refresh) {
        setTokens(access, refresh);
        if (cachedUser) setUser(cachedUser);
        try {
          const fresh = await authApi.me();
          if (mounted.current) {
            setUser(fresh);
            await storage.setJSON(STORAGE_KEYS.user, fresh);
          }
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            clearSession();
            setTokens(null, null);
            await storage.remove(STORAGE_KEYS.accessToken);
            await storage.remove(STORAGE_KEYS.refreshToken);
            await storage.remove(STORAGE_KEYS.user);
            if (mounted.current) setUser(null);
          }
        }
      }
      if (mounted.current) setReady(true);
    })();
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionChange(async tokens => {
      if (!tokens) {
        setUser(null);
        await storage.remove(STORAGE_KEYS.user);
        return;
      }
      await storage.set(STORAGE_KEYS.accessToken, tokens.accessToken);
      await storage.set(STORAGE_KEYS.refreshToken, tokens.refreshToken);
      try {
        const fresh = await authApi.me();
        setUser(fresh);
        await storage.setJSON(STORAGE_KEYS.user, fresh);
      } catch {
        // keep the cached profile when the profile refresh fails
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      try {
        const response = await authApi.login(email.trim(), password);
        await persistTokens(response.accessToken, response.refreshToken);
        await persistUser(response.user);
        return response.user;
      } finally {
        setBusy(false);
      }
    },
    [persistTokens, persistUser],
  );

  const requestRegistrationOtp = useCallback(
    async (input: { firstName: string; lastName: string; email: string; password: string; phone?: string }) => {
      setBusy(true);
      try {
        return await authApi.requestRegistrationOtp({ ...input, email: input.email.trim() });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const verifyRegistration = useCallback(
    async (email: string, code: string) => {
      setBusy(true);
      try {
        const response = await authApi.verifyRegistration(email.trim(), code.trim());
        await persistTokens(response.accessToken, response.refreshToken);
        await persistUser(response.user);
        return response.user;
      } finally {
        setBusy(false);
      }
    },
    [persistTokens, persistUser],
  );

  const logout = useCallback(async () => {
    setBusy(true);
    const refresh = await storage.get(STORAGE_KEYS.refreshToken);
    try {
      if (refresh) await authApi.logout(refresh);
    } catch {
      // logging out locally is enough when the API is unreachable
    }
    clearSession();
    await persistTokens(null, null);
    await persistUser(null);
    setBusy(false);
  }, [persistTokens, persistUser]);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await authApi.me();
      await persistUser(fresh);
    } catch {
      // ignore transient errors
    }
  }, [persistUser]);

  const updateUser = useCallback(
    (next: User) => {
      setUser(next);
      storage.setJSON(STORAGE_KEYS.user, next);
    },
    [],
  );

  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshUser();
    });
    return () => subscription.remove();
  }, [refreshUser, user]);

  const hasPermission = useCallback(
    (permission: string) => !!user && user.permissions.includes(permission),
    [user],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      busy,
      isStaff: !!user && staffRoles.has(user.role),
      login,
      requestRegistrationOtp,
      verifyRegistration,
      logout,
      refreshUser,
      updateUser,
      hasPermission,
    }),
    [user, ready, busy, login, requestRegistrationOtp, verifyRegistration, logout, refreshUser, updateUser, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
