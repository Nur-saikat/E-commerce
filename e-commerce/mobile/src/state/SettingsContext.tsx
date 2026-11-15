import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { siteApi } from '../api';
import type { Settings } from '../api/types';
import { money as formatMoney } from '../format';

const defaultSettings: Settings = {
  storeName: 'Safwan Shop',
  tagline: 'Thoughtful essentials for little ones',
  logoUrl: null,
  email: null,
  phone: null,
  address: 'Mirpur, Dhaka',
  currency: 'BDT',
  currencySymbol: '৳',
  taxRate: 0,
  flatShippingRate: 0,
  freeShippingThreshold: 0,
  codEnabled: true,
  stripeEnabled: false,
  sslCommerzEnabled: false,
  bkashEnabled: false,
  bkashMerchantNumber: null,
  nagadEnabled: false,
  nagadMerchantNumber: null,
  rocketEnabled: false,
  rocketMerchantNumber: null,
  voucherPointsEnabled: false,
  voucherPointValue: 1,
  voucherEarnPercent: 0,
  voucherMaxRedeemPercent: 100,
  socialLinks: {},
  footerAbout: null,
  copyrightText: null,
  menuItems: [],
};

interface SettingsValue {
  settings: Settings;
  symbol: string;
  fmt: (value: number | null | undefined) => string;
  reload: () => Promise<void>;
  loading: boolean;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await siteApi.settings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch {
      // keep defaults when the API is unreachable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<SettingsValue>(() => {
    const symbol = settings.currencySymbol || '$';
    return {
      settings,
      symbol,
      fmt: (input: number | null | undefined) => formatMoney(input, symbol),
      reload,
      loading,
    };
  }, [settings, reload, loading]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
