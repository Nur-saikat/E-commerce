import { HttpContextToken } from '@angular/common/http';

export const SILENT_ERROR = new HttpContextToken<boolean>(() => false);

export const STORAGE_KEYS = {
  accessToken: 'luxe.accessToken',
  refreshToken: 'luxe.refreshToken',
  user: 'luxe.user',
  cartId: 'luxe.cartId',
  recentlyViewed: 'luxe.recentlyViewed',
  couponCode: 'luxe.couponCode'
} as const;

export const ADMIN_ROLES = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];
