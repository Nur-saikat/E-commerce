import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ProductSummary } from '../../core/models/api.models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-wishlist-page',
  standalone: true,
  imports: [RouterLink, ProductCard, EmptyState, Icon],
  template: `
    <div class="container-luxe py-8 lg:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Saved for later</p>
          <h1 class="section-title mt-1">Your wishlist</h1>
          <p class="mt-2 text-sm text-ink-500">
            {{ products().length }} {{ products().length === 1 ? 'piece' : 'pieces' }} saved
          </p>
        </div>
        @if (products().length) {
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn-outline btn-sm" [disabled]="addingAll()" (click)="addAll()">
              @if (addingAll()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-ink-800"></span>
                Adding…
              } @else {
                <app-icon name="bag" [size]="15" /> Add all to bag
              }
            </button>
            <a routerLink="/products" class="btn-ghost btn-sm">Keep browsing</a>
          </div>
        }
      </div>

      @if (wishlist.loading() && !items().length) {
        <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="overflow-hidden rounded-2xl border border-ink-100 bg-white">
              <div class="skeleton aspect-[4/5]"></div>
              <div class="space-y-2 p-4">
                <div class="skeleton h-3 w-1/3 rounded"></div>
                <div class="skeleton h-4 w-3/4 rounded"></div>
                <div class="skeleton h-5 w-1/2 rounded"></div>
              </div>
            </div>
          }
        </div>
      } @else if (!products().length) {
        <div class="mx-auto mt-10 max-w-xl">
          <app-empty-state
            icon="heart"
            title="Your wishlist is empty"
            message="Tap the heart on any product to save it here for later. Your favourites stay in sync across devices."
            actionLabel="Discover products"
            actionLink="/products"
          />
        </div>
      } @else {
        <div class="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          @for (product of products(); track product.id) {
            <div class="relative">
              <app-product-card [product]="product" />
              <button
                type="button"
                class="absolute right-3 top-14 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-danger shadow-sm backdrop-blur transition hover:bg-white"
                aria-label="Remove from wishlist"
                (click)="remove(product)"
              >
                <app-icon name="trash" [size]="15" />
              </button>
            </div>
          }
        </div>

        <div class="mt-10 rounded-2xl border border-dashed border-ink-200 bg-white/60 p-6 text-center">
          <p class="text-sm text-ink-600">
            Prices and availability are live. Items in your wishlist are not reserved.
          </p>
          <a routerLink="/cart" class="btn-ghost btn-sm mt-2">View your bag <app-icon name="arrow-right" [size]="14" /></a>
        </div>
      }
    </div>
  `
})
export class WishlistPage implements OnInit {
  readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly items = this.wishlist.items;
  readonly products = computed(() => this.productsOrEmpty());
  readonly addingAll = signal(false);

  ngOnInit(): void {
    this.wishlist.get().subscribe({ error: () => undefined });
  }

  remove(product: ProductSummary): void {
    this.wishlist.remove(product.id).subscribe({ next: () => this.toast.info(`${product.name} removed from wishlist`) });
  }

  async addAll(): Promise<void> {
    const available = this.products().filter((p) => p.totalStock > 0);
    if (!available.length) {
      this.toast.error('None of your saved items are currently in stock');
      return;
    }
    const confirmed = await this.confirm.confirm({
      title: 'Add all to bag?',
      message: `${available.length} available ${available.length === 1 ? 'item will be' : 'items will be'} added to your bag.`,
      confirmText: 'Add all'
    });
    if (!confirmed) return;

    this.addingAll.set(true);
    for (const product of available) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.cart.add({ productId: product.id, quantity: 1 }).subscribe({ next: () => resolve(), error: reject });
        });
      } catch {
        // Individual failures are surfaced by the error interceptor; keep adding the rest.
      }
    }
    this.addingAll.set(false);
    this.toast.success(`${available.length} ${available.length === 1 ? 'item' : 'items'} added to your bag`);
  }

  private productsOrEmpty(): ProductSummary[] {
    return this.items()
      .map((item) => item.product)
      .filter((product): product is ProductSummary => !!product);
  }
}
