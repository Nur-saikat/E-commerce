import { Platform } from 'react-native';

declare const __DEV__: boolean;

function webApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:5080/api';
  const override = (window as any).__SAFWAN_API_URL__;
  if (typeof override === 'string' && override.length > 0) return override;
  const { protocol, hostname, port } = window.location;
  if (port === '4200' || port === '4201' || port === '5173' || port === '') {
    return `${protocol}//${hostname}:5080/api`;
  }
  return '/api';
}

export const API_BASE_URL: string =
  Platform.OS === 'web' ? webApiBase() : 'http://localhost:5080/api';

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const STORAGE_KEYS = {
  accessToken: 'safwan.accessToken',
  refreshToken: 'safwan.refreshToken',
  user: 'safwan.user',
  cartId: 'safwan.cartId',
  recentlyViewed: 'safwan.recentlyViewed',
  couponCode: 'safwan.couponCode',
} as const;

export const PAYMENT_LABELS: Record<string, string> = {
  Cod: 'Cash on delivery',
  Stripe: 'Card (Stripe)',
  SslCommerz: 'SSLCommerz',
  Bkash: 'bKash',
  Nagad: 'Nagad',
  Rocket: 'Rocket',
  Voucher: 'Voucher points',
};

export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Completed',
  'Cancelled',
  'Refunded',
] as const;

export const RETURN_STATUSES = ['Requested', 'Approved', 'Received', 'Refunded', 'Rejected'] as const;
