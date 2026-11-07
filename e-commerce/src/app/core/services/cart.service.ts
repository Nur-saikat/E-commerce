import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { ApiService } from './api.service';
import { STORAGE_KEYS } from '../constants';
import { AddToCartRequest, Cart, CartItem, UpdateCartItemRequest } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(ApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly cart = signal<Cart | null>(null);
  readonly loading = signal(false);

  readonly itemCount = computed(() => this.cart()?.summary?.itemCount ?? 0);
  readonly items = computed(() => this.cart()?.items ?? []);
  readonly summary = computed(() => this.cart()?.summary ?? null);
  readonly isEmpty = computed(() => (this.cart()?.items?.length ?? 0) === 0);

  private guestId(): string | null {
    return this.isBrowser ? localStorage.getItem(STORAGE_KEYS.cartId) : null;
  }

  private storeId(cart: Cart): void {
    if (!this.isBrowser) return;
    if (cart.guestId) localStorage.setItem(STORAGE_KEYS.cartId, cart.guestId);
    else if (cart.id) localStorage.removeItem(STORAGE_KEYS.cartId);
  }

  get(): Observable<Cart> {
    this.loading.set(true);
    return this.api.get<Cart>('cart').pipe(
      tap((cart) => {
        this.storeId(cart);
        this.cart.set(cart);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  add(request: AddToCartRequest): Observable<Cart> {
    return this.api.post<Cart>('cart/items', request).pipe(
      tap((cart) => {
        this.storeId(cart);
        this.cart.set(cart);
      })
    );
  }

  update(itemId: string, request: UpdateCartItemRequest): Observable<Cart> {
    return this.api.put<Cart>(`cart/items/${itemId}`, request).pipe(
      tap((cart) => {
        this.storeId(cart);
        this.cart.set(cart);
      })
    );
  }

  remove(itemId: string): Observable<Cart> {
    return this.api.delete<Cart>(`cart/items/${itemId}`).pipe(
      tap((cart) => {
        this.storeId(cart);
        this.cart.set(cart);
      })
    );
  }

  clear(): Observable<Cart> {
    return this.api.delete<Cart>('cart/clear').pipe(tap((cart) => this.cart.set(cart)));
  }

  applyCoupon(code: string): Observable<Cart> {
    return this.api.post<Cart>('cart/apply-coupon', { couponCode: code }).pipe(
      tap((cart) => {
        if (this.isBrowser) localStorage.setItem(STORAGE_KEYS.couponCode, code);
        this.cart.set(cart);
      })
    );
  }

  removeCoupon(): Observable<Cart> {
    return this.api.delete<Cart>('cart/coupon').pipe(
      tap((cart) => {
        if (this.isBrowser) localStorage.removeItem(STORAGE_KEYS.couponCode);
        this.cart.set(cart);
      })
    );
  }

  mergeGuestCart(): void {
    const guestId = this.guestId();
    if (!guestId) {
      this.get().subscribe({ error: () => undefined });
      return;
    }
    this.api.post<Cart>(`cart/merge?guestId=${encodeURIComponent(guestId)}`).subscribe({
      next: (cart) => {
        if (this.isBrowser) localStorage.removeItem(STORAGE_KEYS.cartId);
        this.cart.set(cart);
      },
      error: () => this.get().subscribe({ error: () => undefined })
    });
  }

  reset(): void {
    this.cart.set(null);
  }

  findItem(productId: string, variantId?: string | null): CartItem | undefined {
    return this.items().find((i) => i.productId === productId && (variantId ?? null) === (i.variantId ?? null));
  }
}
