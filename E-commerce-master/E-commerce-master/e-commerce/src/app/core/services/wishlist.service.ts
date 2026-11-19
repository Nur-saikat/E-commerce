import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ProductSummary, Wishlist, WishlistItem } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly api = inject(ApiService);

  readonly items = signal<WishlistItem[]>([]);
  readonly loading = signal(false);

  get(): Observable<Wishlist> {
    this.loading.set(true);
    return this.api.get<Wishlist>('wishlist').pipe(
      tap((res) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
      })
    );
  }

  add(productId: string): Observable<Wishlist> {
    return this.api.post<Wishlist>('wishlist', { productId, quantity: 1 }).pipe(tap((res) => this.items.set(res.items ?? [])));
  }

  remove(productId: string): Observable<Wishlist> {
    return this.api
      .delete<Wishlist>(`wishlist/${productId}`)
      .pipe(tap((res) => this.items.set(res.items ?? [])));
  }

  contains(productId: string): Observable<boolean> {
    return this.api.get<boolean>(`wishlist/contains/${productId}`);
  }

  has(productId: string): boolean {
    return this.items().some((i) => i.productId === productId);
  }

  reset(): void {
    this.items.set([]);
  }

  products(): ProductSummary[] {
    return this.items()
      .map((i) => i.product)
      .filter((p): p is ProductSummary => !!p);
  }
}
