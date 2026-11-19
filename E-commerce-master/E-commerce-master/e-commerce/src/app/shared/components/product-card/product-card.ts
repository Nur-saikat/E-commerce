import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductSummary } from '../../../core/models/api.models';
import { AssetUrlPipe } from '../../pipes/asset-url.pipe';
import { MoneyPipe } from '../../pipes/money.pipe';
import { Icon } from '../icon/icon';
import { RatingStars } from '../rating-stars/rating-stars';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [RouterLink, AssetUrlPipe, MoneyPipe, Icon, RatingStars],
  template: `
    <article class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-luxe)]">
      <a [routerLink]="['/products', product().slug]" class="relative block aspect-[4/5] overflow-hidden bg-sand">
        <img
          [src]="product().thumbnailUrl | assetUrl"
          [alt]="product().name"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span class="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span class="flex flex-col items-start gap-1.5">
            @if (product().discountPercent > 0) {
              <span class="badge bg-ink-900 text-cream">−{{ product().discountPercent }}%</span>
            }
            @if (isNew()) {
              <span class="badge bg-gold-300 text-ink-950">New in</span>
            }
            @if (product().totalStock <= 0) {
              <span class="badge bg-white/95 text-ink-700">Sold out</span>
            }
          </span>
          <button
            type="button"
            (click)="toggleWishlist($event)"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-danger"
            [attr.aria-label]="inWishlist() ? 'Remove from wishlist' : 'Save to wishlist'"
          >
            <app-icon name="heart" [size]="16" [filled]="inWishlist()" [class]="inWishlist() ? 'text-danger' : ''" />
          </button>
        </span>
        <span class="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <button
            type="button"
            (click)="quickAdd($event)"
            [disabled]="product().totalStock <= 0"
            class="btn btn-primary w-full !py-2.5 text-xs uppercase tracking-widest"
          >
            <app-icon name="bag" [size]="15" />
            {{ product().totalStock > 0 ? 'Quick add' : 'Sold out' }}
          </button>
        </span>
      </a>

      <div class="flex flex-1 flex-col gap-1.5 p-4">
        <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          {{ product().brandName || product().categoryName || 'Safwan edit' }}
        </span>
        <a [routerLink]="['/products', product().slug]" class="line-clamp-2 text-sm font-medium text-ink-900 hover:text-gold-600">
          {{ product().name }}
        </a>
        <div class="mt-0.5 flex items-center justify-between">
          <app-rating-stars [value]="product().ratingAverage" [count]="product().reviewCount || null" [size]="13" />
        </div>
        <div class="mt-auto flex items-end justify-between pt-2">
          <div class="flex items-baseline gap-2">
            <span class="text-base font-semibold text-ink-900">{{ product().effectivePrice | money }}</span>
            @if (product().discountPrice) {
              <span class="text-xs text-ink-400 line-through">{{ product().price | money }}</span>
            }
          </div>
          @if (product().totalStock > 0 && product().totalStock <= 5) {
            <span class="text-[10px] font-medium text-danger">Only {{ product().totalStock }} left</span>
          }
        </div>
      </div>
    </article>
  `
})
export class ProductCard {
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly product = input.required<ProductSummary>();

  readonly isNew = computed(() => {
    const created = new Date(this.product().createdAt).getTime();
    return Date.now() - created < 1000 * 60 * 60 * 24 * 21;
  });

  readonly inWishlist = computed(() => this.wishlist.has(this.product().id));

  quickAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cart.add({ productId: this.product().id, quantity: 1 }).subscribe({
      next: () => this.toast.success(`${this.product().name} added to bag`)
    });
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.inWishlist()) {
      this.wishlist.remove(this.product().id).subscribe({ next: () => this.toast.info('Removed from wishlist') });
    } else {
      this.wishlist.add(this.product().id).subscribe({ next: () => this.toast.success('Saved to wishlist') });
    }
  }
}
