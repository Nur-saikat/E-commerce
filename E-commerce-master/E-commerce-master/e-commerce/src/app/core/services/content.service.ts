import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  Banner,
  CheckoutConfig,
  ContactRequest,
  HomeFeed,
  Notification,
  NewsletterRequest,
  ProductSummary,
  ShippingMethod,
  Testimonial,
  WebsiteSettings
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly settings = signal<WebsiteSettings | null>(null);
  readonly home = signal<HomeFeed | null>(null);
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.isRead).length);

  private settingsRequest$: Observable<WebsiteSettings> | null = null;

  loadSettings(force = false): Observable<WebsiteSettings> {
    const current = this.settings();
    if (current && !force) return of(current);
    if (!this.settingsRequest$ || force) {
      this.settingsRequest$ = this.api.get<WebsiteSettings>('settings').pipe(
        tap((settings) => this.settings.set(settings)),
        catchError(() => of(this.fallbackSettings())),
        shareReplay(1)
      );
    }
    return this.settingsRequest$;
  }

  loadHome(recentlyViewed: string[] = []): Observable<HomeFeed> {
    return this.api
      .get<HomeFeed>('home', { recentlyViewed: recentlyViewed.join(',') })
      .pipe(tap((feed) => this.home.set(feed)));
  }

  banners(position?: string, includeInactive = false): Observable<Banner[]> {
    return this.api.get<Banner[]>('banners', { position, includeInactive });
  }

  testimonials(includeInactive = false): Observable<Testimonial[]> {
    return this.api.get<Testimonial[]>('testimonials', { includeInactive });
  }

  shippingMethods(): Observable<ShippingMethod[]> {
    return this.api.get<ShippingMethod[]>('shipping-methods');
  }

  checkoutConfig(): Observable<CheckoutConfig> {
    return this.api.get<CheckoutConfig>('checkout/config').pipe(
      tap((config) => {
        const current = this.settings();
        if (current) {
          this.settings.set({
            ...current,
            currency: config.currency ?? current.currency,
            currencySymbol: config.currencySymbol ?? current.currencySymbol,
            taxRate: config.taxRate,
            flatShippingRate: config.flatShippingRate,
            freeShippingThreshold: config.freeShippingThreshold
          });
        }
      })
    );
  }

  contact(request: ContactRequest): Observable<unknown> {
    return this.api.post<unknown>('contact', request);
  }

  subscribe(request: NewsletterRequest): Observable<unknown> {
    return this.api.post<unknown>('newsletter', request);
  }

  loadNotifications(): Observable<Notification[]> {
    return this.api
      .get<Notification[]>('notifications')
      .pipe(tap((items) => this.notifications.set(items ?? [])));
  }

  markNotificationRead(id: string): Observable<unknown> {
    return this.api.post<unknown>(`notifications/${id}/read`).pipe(
      tap(() => this.notifications.update((items) => items.map((n) => (n.id === id ? { ...n, isRead: true } : n))))
    );
  }

  markAllNotificationsRead(): Observable<unknown> {
    return this.api
      .post<unknown>('notifications/read-all')
      .pipe(tap(() => this.notifications.update((items) => items.map((n) => ({ ...n, isRead: true })))));
  }

  recentlyViewedIds(): string[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem('luxe.recentlyViewed');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  fallbackSettings(): WebsiteSettings {
    return {
      storeName: 'Safwan',
      tagline: 'Curated essentials for modern living',
      currency: 'USD',
      currencySymbol: '$',
      taxRate: 5,
      flatShippingRate: 10,
      freeShippingThreshold: 150,
      codEnabled: true,
      stripeEnabled: false,
      sslCommerzEnabled: false,
      bkashEnabled: false,
      nagadEnabled: false,
      rocketEnabled: false,
      voucherPointsEnabled: true,
      voucherPointValue: 1,
      voucherEarnPercent: 5,
      voucherMaxRedeemPercent: 100,
      socialLinks: {},
      menuItems: []
    };
  }
}

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly items = signal<ProductSummary[]>([]);

  constructor() {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem('luxe.recentlyViewedItems');
      if (raw) this.items.set(JSON.parse(raw) as ProductSummary[]);
    } catch {
      this.items.set([]);
    }
  }

  add(product: ProductSummary): void {
    const next = [product, ...this.items().filter((p) => p.id !== product.id)].slice(0, 8);
    this.items.set(next);
    this.persist(next);
  }

  ids(): string[] {
    return this.items().map((p) => p.id);
  }

  private persist(items: ProductSummary[]): void {
    if (!this.isBrowser) return;
    localStorage.setItem('luxe.recentlyViewedItems', JSON.stringify(items));
    localStorage.setItem('luxe.recentlyViewed', JSON.stringify(items.map((p) => p.id)));
  }
}

