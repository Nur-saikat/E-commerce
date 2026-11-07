import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ContentService } from '../../core/services/content.service';
import { CartItem, ShippingMethod } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, EmptyState, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="container-luxe py-8 lg:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Your selection</p>
          <h1 class="section-title mt-1">Shopping bag</h1>
        </div>
        @if (!cart.isEmpty()) {
          <a routerLink="/products" class="btn-ghost btn-sm">
            <app-icon name="arrow-left" [size]="15" /> Continue shopping
          </a>
        }
      </div>

      @if (cart.loading() && !cart.cart()) {
        <div class="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div class="space-y-4">
            @for (row of [1, 2, 3]; track row) {
              <div class="flex gap-4 rounded-2xl border border-ink-100 bg-white p-4">
                <div class="skeleton h-28 w-24 rounded-xl"></div>
                <div class="flex-1 space-y-3 py-2">
                  <div class="skeleton h-4 w-1/2 rounded"></div>
                  <div class="skeleton h-3 w-1/4 rounded"></div>
                  <div class="skeleton h-8 w-28 rounded-full"></div>
                </div>
              </div>
            }
          </div>
          <div class="skeleton h-80 rounded-2xl"></div>
        </div>
      } @else if (cart.isEmpty()) {
        <div class="mx-auto mt-10 max-w-xl">
          <app-empty-state
            icon="bag"
            title="Your bag is empty"
            message="Discover considered pieces made to last. Start with our latest arrivals or revisit your saved favourites."
            actionLabel="Explore the collection"
            actionLink="/products"
          />
          <div class="mt-6 flex justify-center gap-3">
            <a routerLink="/wishlist" class="btn-outline btn-sm">
              <app-icon name="heart" [size]="15" /> View wishlist
            </a>
            <a routerLink="/track-order" class="btn-ghost btn-sm">Track an order</a>
          </div>
        </div>
      } @else {
        <div class="mt-8 grid items-start gap-8 lg:grid-cols-[1.6fr_1fr] xl:gap-12">
          <div>
            <div class="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
              @for (item of cart.items(); track item.id) {
                <div class="flex gap-4 p-4 sm:gap-5 sm:p-5">
                  <a [routerLink]="['/products', item.slug]" class="block h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-sand sm:h-32 sm:w-28">
                    <img [src]="item.imageUrl | assetUrl" [alt]="item.productName" class="h-full w-full object-cover" />
                  </a>

                  <div class="flex min-w-0 flex-1 flex-col">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <a [routerLink]="['/products', item.slug]" class="line-clamp-2 text-sm font-medium text-ink-900 hover:text-gold-600 sm:text-base">
                          {{ item.productName }}
                        </a>
                        @if (item.variantName) {
                          <p class="mt-1 text-xs text-ink-500">{{ item.variantName }}</p>
                        }
                        <p class="mt-1 text-[11px] uppercase tracking-wider text-ink-400">SKU {{ item.sku }}</p>
                      </div>
                      <button
                        type="button"
                        class="rounded-full p-2 text-ink-400 transition hover:bg-red-50 hover:text-danger"
                        aria-label="Remove item"
                        (click)="remove(item)"
                      >
                        <app-icon name="trash" [size]="16" />
                      </button>
                    </div>

                    @if (!item.isAvailable) {
                      <p class="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger">
                        <app-icon name="alert-circle" [size]="13" />
                        {{ item.stockAvailable > 0 ? 'Only ' + item.stockAvailable + ' available' : 'Out of stock' }}
                      </p>
                    } @else if (item.stockAvailable <= 5) {
                      <p class="mt-2 text-xs text-warning">Only {{ item.stockAvailable }} left in stock</p>
                    }

                    <div class="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                      <div class="inline-flex items-center rounded-full border border-ink-200 bg-white">
                        <button
                          type="button"
                          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
                          [disabled]="item.quantity <= 1 || isBusy(item.id)"
                          aria-label="Decrease quantity"
                          (click)="setQuantity(item, item.quantity - 1)"
                        >
                          <app-icon name="minus" [size]="14" />
                        </button>
                        <span class="w-8 text-center text-sm font-semibold text-ink-900">{{ item.quantity }}</span>
                        <button
                          type="button"
                          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-600 transition hover:bg-ink-50 disabled:opacity-40"
                          [disabled]="item.quantity >= item.stockAvailable || isBusy(item.id)"
                          aria-label="Increase quantity"
                          (click)="setQuantity(item, item.quantity + 1)"
                        >
                          <app-icon name="plus" [size]="14" />
                        </button>
                      </div>
                      <div class="text-right">
                        <p class="text-base font-semibold text-ink-900">{{ item.lineTotal | money }}</p>
                        @if (item.quantity > 1) {
                          <p class="text-[11px] text-ink-400">{{ item.unitPrice | money }} each</p>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button type="button" class="btn-ghost btn-sm text-danger hover:bg-red-50" (click)="clearCart()">
                <app-icon name="trash" [size]="14" /> Empty bag
              </button>
              <span class="text-xs text-ink-500">{{ cart.itemCount() }} {{ cart.itemCount() === 1 ? 'item' : 'items' }} in your bag</span>
            </div>

            @if (shippingMethods().length) {
              <div class="mt-6 rounded-2xl border border-ink-100 bg-white p-5">
                <h2 class="text-sm font-semibold text-ink-900">Delivery options</h2>
                <ul class="mt-3 space-y-2.5">
                  @for (method of shippingMethods(); track method.id) {
                    <li class="flex items-start justify-between gap-4 text-sm">
                      <div>
                        <p class="font-medium text-ink-800">{{ method.name }}</p>
                        <p class="text-xs text-ink-500">
                          {{ method.description || 'Delivered in ' + method.estimatedDaysMin + '–' + method.estimatedDaysMax + ' business days' }}
                        </p>
                      </div>
                      <span class="shrink-0 font-medium text-ink-900">{{ method.cost | money }}</span>
                    </li>
                  }
                </ul>
                <p class="mt-3 text-[11px] text-ink-400">Final delivery is selected at checkout.</p>
              </div>
            }
          </div>

          <aside class="lg:sticky lg:top-28">
            <div class="rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 class="text-lg font-semibold text-ink-900">Order summary</h2>

              @if (summary(); as totals) {
                <dl class="mt-4 space-y-3 text-sm">
                  <div class="flex items-center justify-between">
                    <dt class="text-ink-500">Subtotal</dt>
                    <dd class="font-medium text-ink-900">{{ totals.subtotal | money }}</dd>
                  </div>
                  @if (totals.discount > 0) {
                    <div class="flex items-center justify-between text-success">
                      <dt class="flex items-center gap-1.5">
                        Discount
                        @if (totals.couponCode) {
                          <span class="badge bg-emerald-50 text-emerald-700">{{ totals.couponCode }}</span>
                        }
                      </dt>
                      <dd class="font-medium">−{{ totals.discount | money }}</dd>
                    </div>
                  }
                  <div class="flex items-center justify-between">
                    <dt class="text-ink-500">Shipping</dt>
                    <dd class="font-medium text-ink-900">{{ totals.shipping > 0 ? (totals.shipping | money) : 'Free' }}</dd>
                  </div>
                  <div class="flex items-center justify-between">
                    <dt class="text-ink-500">Estimated tax</dt>
                    <dd class="font-medium text-ink-900">{{ totals.tax | money }}</dd>
                  </div>
                  <div class="flex items-center justify-between border-t border-ink-200 pt-3 text-base">
                    <dt class="font-semibold text-ink-900">Total</dt>
                    <dd class="text-xl font-semibold text-ink-900">{{ totals.total | money }}</dd>
                  </div>
                </dl>

                <div class="mt-5 rounded-xl bg-cream p-4">
                  @if (totals.amountToFreeShipping > 0) {
                    <div class="flex items-center gap-2 text-xs text-ink-600">
                      <app-icon name="truck" [size]="16" class="text-gold-600" />
                      <span>Add <strong class="text-ink-900">{{ totals.amountToFreeShipping | money }}</strong> for free delivery</span>
                    </div>
                    <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-200">
                      <div class="h-full rounded-full bg-gold-500 transition-all duration-500" [style.width.%]="freeShippingProgress()"></div>
                    </div>
                  } @else {
                    <div class="flex items-center gap-2 text-xs font-medium text-success">
                      <app-icon name="check-circle" [size]="16" />
                      You qualify for free delivery
                    </div>
                  }
                </div>

                @if (totals.couponCode) {
                  <div class="mt-4 flex items-center justify-between rounded-xl border border-dashed border-success/40 bg-emerald-50/60 px-3.5 py-2.5">
                    <div class="flex items-center gap-2 text-xs font-medium text-emerald-800">
                      <app-icon name="tag" [size]="15" />
                      <span>{{ totals.couponCode }} applied</span>
                    </div>
                    <button type="button" class="text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900" (click)="removeCoupon()">
                      Remove
                    </button>
                  </div>
                } @else {
                  <form class="mt-4" [formGroup]="couponForm" (ngSubmit)="applyCoupon()">
                    <label class="label" for="coupon">Promo code</label>
                    <div class="flex gap-2">
                      <input id="coupon" type="text" class="input uppercase placeholder:normal-case" placeholder="Enter code" formControlName="code" autocomplete="off" />
                      <button type="submit" class="btn-outline shrink-0 !px-4" [disabled]="couponForm.invalid || applyingCoupon()">
                        @if (applyingCoupon()) {
                          <span class="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-ink-800"></span>
                        } @else {
                          Apply
                        }
                      </button>
                    </div>
                    @if (couponForm.controls.code.touched && couponForm.controls.code.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Enter a promo code.</p>
                    }
                  </form>
                }

                <a routerLink="/checkout" class="btn-primary mt-5 w-full">
                  Proceed to checkout
                  <app-icon name="arrow-right" [size]="17" />
                </a>

                <div class="mt-4 space-y-2 text-[11px] text-ink-500">
                  <p class="flex items-center gap-2"><app-icon name="lock" [size]="13" /> Secure checkout · card details are never stored</p>
                  <p class="flex items-center gap-2"><app-icon name="refresh" [size]="13" /> 30-day returns on unused items</p>
                </div>
              }
            </div>

            <p class="mt-4 text-center text-xs text-ink-500">
              Need help? <a routerLink="/contact" class="font-medium text-ink-800 underline underline-offset-4">Contact our team</a>
            </p>
          </aside>
        </div>
      }
    </div>
  `
})
export class CartPage implements OnInit {
  readonly cart = inject(CartService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly summary = this.cart.summary;
  readonly busyItems = signal<Set<string>>(new Set());
  readonly applyingCoupon = signal(false);
  readonly shippingMethods = signal<ShippingMethod[]>([]);
  readonly couponForm = new FormGroup({
    code: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  readonly freeShippingProgress = computed(() => {
    const totals = this.summary();
    if (!totals || totals.freeShippingThreshold <= 0) return 100;
    const remaining = Math.max(0, totals.amountToFreeShipping);
    const ratio = 1 - remaining / totals.freeShippingThreshold;
    return Math.min(100, Math.max(0, Math.round(ratio * 100)));
  });

  ngOnInit(): void {
    this.cart.get().subscribe({ error: () => undefined });
    this.content.shippingMethods().subscribe({
      next: (methods) => this.shippingMethods.set(methods.filter((m) => m.isActive)),
      error: () => this.shippingMethods.set([])
    });
  }

  isBusy(id: string): boolean {
    return this.busyItems().has(id);
  }

  setQuantity(item: CartItem, quantity: number): void {
    if (quantity < 1 || quantity > item.stockAvailable || quantity === item.quantity) return;
    this.markBusy(item.id, true);
    this.cart.update(item.id, { quantity }).subscribe({
      error: () => this.markBusy(item.id, false),
      complete: () => this.markBusy(item.id, false)
    });
  }

  remove(item: CartItem): void {
    this.markBusy(item.id, true);
    this.cart.remove(item.id).subscribe({
      next: () => this.toast.info(`${item.productName} removed from your bag`),
      error: () => this.markBusy(item.id, false),
      complete: () => this.markBusy(item.id, false)
    });
  }

  async clearCart(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Empty your bag?',
      message: 'All items will be removed from your bag.',
      confirmText: 'Empty bag',
      danger: true
    });
    if (!confirmed) return;
    this.cart.clear().subscribe({ next: () => this.toast.info('Your bag has been emptied') });
  }

  applyCoupon(): void {
    if (this.couponForm.invalid) {
      this.couponForm.markAllAsTouched();
      return;
    }
    this.applyingCoupon.set(true);
    const code = this.couponForm.controls.code.value.trim();
    this.cart.applyCoupon(code).subscribe({
      next: () => {
        this.toast.success(`Promo code ${code.toUpperCase()} applied`);
        this.couponForm.reset({ code: '' });
      },
      error: () => undefined,
      complete: () => this.applyingCoupon.set(false)
    });
  }

  removeCoupon(): void {
    this.cart.removeCoupon().subscribe({ next: () => this.toast.info('Promo code removed') });
  }

  private markBusy(id: string, busy: boolean): void {
    this.busyItems.update((set) => {
      const next = new Set(set);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
