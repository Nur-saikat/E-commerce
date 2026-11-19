import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { VoucherService } from '../../core/services/voucher.service';
import { Address, CheckoutConfig, Order, ShippingMethod } from '../../core/models/api.models';
import { Icon, IconName } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, EmptyState, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="container-luxe py-8 lg:py-12">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="eyebrow">Secure checkout</p>
          <h1 class="section-title mt-1">Complete your order</h1>
        </div>
        <a routerLink="/cart" class="btn-ghost btn-sm"><app-icon name="arrow-left" [size]="15" /> Back to bag</a>
      </div>

      @if (cart.isEmpty() && !cart.loading()) {
        <div class="mx-auto mt-10 max-w-xl">
          <app-empty-state
            icon="bag"
            title="Nothing to check out"
            message="Your bag is empty. Add a few pieces and return to finish your order."
            actionLabel="Browse the collection"
            actionLink="/products"
          />
        </div>
      } @else {
        <form class="mt-8 grid items-start gap-8 lg:grid-cols-[1.55fr_1fr] xl:gap-12" [formGroup]="form" (ngSubmit)="placeOrder()" novalidate>
          <div class="space-y-6">
            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-cream">1</span>
                <h2 class="text-lg font-semibold text-ink-900">Contact</h2>
                @if (!auth.isAuthenticated()) {
                  <a routerLink="/login" class="ml-auto text-xs font-medium text-gold-600 underline-offset-4 hover:underline">Sign in</a>
                }
              </div>

              @if (!auth.isAuthenticated()) {
                <p class="mt-2 text-xs text-ink-500">
                  Checking out as a guest. <a routerLink="/login" [queryParams]="{ returnUrl: '/checkout' }" class="font-medium text-ink-800 underline underline-offset-4">Sign in</a> to use saved addresses and track orders.
                </p>
              }

              <div class="mt-4">
                <label class="label" for="email">Email address</label>
                <input id="email" type="email" class="input" formControlName="email" autocomplete="email" placeholder="you@example.com" />
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <p class="mt-1.5 text-[11px] text-danger">A valid email address is required.</p>
                }
                <p class="mt-1.5 text-[11px] text-ink-400">Order updates and your receipt will be sent here.</p>
              </div>
            </section>

            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-cream">2</span>
                <h2 class="text-lg font-semibold text-ink-900">Shipping address</h2>
                @if (auth.isAuthenticated()) {
                  <a routerLink="/account/addresses" class="ml-auto text-xs font-medium text-gold-600 underline-offset-4 hover:underline">Manage addresses</a>
                }
              </div>

              @if (addresses().length) {
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  @for (address of addresses(); track address.id) {
                    <button
                      type="button"
                      class="rounded-xl border p-4 text-left text-sm transition"
                      [class]="selectedAddressId() === address.id ? 'border-ink-900 bg-ink-50/60 ring-1 ring-ink-900' : 'border-ink-200 hover:border-ink-400'"
                      (click)="selectAddress(address)"
                    >
                      <span class="flex items-center justify-between gap-2">
                        <span class="font-semibold text-ink-900">{{ address.fullName }}</span>
                        @if (address.isDefault) {
                          <span class="badge-muted">Default</span>
                        }
                      </span>
                      <span class="mt-1 block text-xs leading-relaxed text-ink-500">
                        {{ address.street }}, {{ address.city }}, {{ address.state }} {{ address.postalCode }}, {{ address.country }}
                      </span>
                      <span class="mt-1 block text-xs text-ink-400">{{ address.phone }}</span>
                    </button>
                  }
                  <button
                    type="button"
                    class="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium transition"
                    [class]="selectedAddressId() === 'new' ? 'border-ink-900 text-ink-900' : 'border-ink-300 text-ink-500 hover:border-ink-500'"
                    (click)="useNewAddress()"
                  >
                    <app-icon name="plus" [size]="15" /> Use a different address
                  </button>
                </div>
              }

              @if (selectedAddressId() === 'new' || !addresses().length) {
                <div class="mt-4 grid gap-4 sm:grid-cols-2" formGroupName="shipping">
                  <div class="sm:col-span-2">
                    <label class="label" for="fullName">Full name</label>
                    <input id="fullName" type="text" class="input" formControlName="fullName" autocomplete="name" />
                    @if (form.controls.shipping.controls.fullName.touched && form.controls.shipping.controls.fullName.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Full name is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="phone">Phone</label>
                    <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" />
                    @if (form.controls.shipping.controls.phone.touched && form.controls.shipping.controls.phone.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Phone number is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="country">Country</label>
                    <input id="country" type="text" class="input" formControlName="country" autocomplete="country-name" />
                    @if (form.controls.shipping.controls.country.touched && form.controls.shipping.controls.country.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Country is required.</p>
                    }
                  </div>
                  <div class="sm:col-span-2">
                    <label class="label" for="street">Street address</label>
                    <input id="street" type="text" class="input" formControlName="street" autocomplete="street-address" />
                    @if (form.controls.shipping.controls.street.touched && form.controls.shipping.controls.street.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Street address is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="city">City</label>
                    <input id="city" type="text" class="input" formControlName="city" autocomplete="address-level2" />
                    @if (form.controls.shipping.controls.city.touched && form.controls.shipping.controls.city.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">City is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="state">State / region</label>
                    <input id="state" type="text" class="input" formControlName="state" autocomplete="address-level1" />
                    @if (form.controls.shipping.controls.state.touched && form.controls.shipping.controls.state.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">State is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="postalCode">Postal code</label>
                    <input id="postalCode" type="text" class="input" formControlName="postalCode" autocomplete="postal-code" />
                    @if (form.controls.shipping.controls.postalCode.touched && form.controls.shipping.controls.postalCode.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Postal code is required.</p>
                    }
                  </div>
                  @if (auth.isAuthenticated()) {
                    <label class="flex items-center gap-2.5 text-xs text-ink-600 sm:col-span-2">
                      <input type="checkbox" class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" formControlName="saveAddress" />
                      Save this address to my account
                    </label>
                  }
                </div>
              }
            </section>

            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-cream">3</span>
                <h2 class="text-lg font-semibold text-ink-900">Delivery</h2>
              </div>

              @if (loadingConfig() && !shippingMethods().length) {
                <div class="mt-4 space-y-2">
                  <div class="skeleton h-16 w-full rounded-xl"></div>
                  <div class="skeleton h-16 w-full rounded-xl"></div>
                </div>
              } @else {
                <div class="mt-4 space-y-2.5">
                  @for (method of shippingMethods(); track method.id) {
                    <label
                      class="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
                      [class]="selectedShippingId() === method.id ? 'border-ink-900 bg-ink-50/60 ring-1 ring-ink-900' : 'border-ink-200 hover:border-ink-400'"
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        class="mt-0.5 h-4 w-4 border-ink-300 text-ink-900 focus:ring-gold-500"
                        [value]="method.id"
                        [checked]="selectedShippingId() === method.id"
                        (change)="selectShipping(method)"
                      />
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center justify-between gap-3">
                          <span class="text-sm font-semibold text-ink-900">{{ method.name }}</span>
                          <span class="text-sm font-semibold text-ink-900">{{ method.cost | money }}</span>
                        </span>
                        <span class="mt-0.5 block text-xs text-ink-500">
                          {{ method.description || 'Delivered in ' + method.estimatedDaysMin + '–' + method.estimatedDaysMax + ' business days' }}
                        </span>
                      </span>
                    </label>
                  }
                </div>
              }

              <div class="mt-4">
                <label class="label" for="notes">Order notes <span class="font-normal normal-case tracking-normal text-ink-400">(optional)</span></label>
                <textarea id="notes" rows="3" class="input resize-y" formControlName="notes" placeholder="Delivery instructions, gift message, or anything we should know"></textarea>
              </div>
            </section>

            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-cream">4</span>
                <h2 class="text-lg font-semibold text-ink-900">Payment</h2>
                <span class="ml-auto flex items-center gap-1.5 text-[11px] text-ink-400">
                  <app-icon name="lock" [size]="12" /> Encrypted
                </span>
              </div>

              @if (loadingConfig() && !paymentMethods().length) {
                <div class="mt-4 skeleton h-16 w-full rounded-xl"></div>
              } @else if (!paymentMethods().length) {
                <p class="mt-4 rounded-xl bg-red-50 p-4 text-sm text-danger">No payment methods are currently available. Please contact support.</p>
              } @else {
                <div class="mt-4 space-y-2.5">
                  @for (method of paymentMethods(); track method) {
                    <label
                      class="flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition"
                      [class]="form.controls.paymentMethod.value === method ? 'border-ink-900 bg-ink-50/60 ring-1 ring-ink-900' : 'border-ink-200 hover:border-ink-400'"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        class="h-4 w-4 border-ink-300 text-ink-900 focus:ring-gold-500"
                        [value]="method"
                        formControlName="paymentMethod"
                      />
                      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink-700">
                        <app-icon [name]="paymentIcon(method)" [size]="17" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block text-sm font-semibold text-ink-900">{{ paymentLabel(method) }}</span>
                        <span class="block text-xs text-ink-500">{{ paymentDescription(method) }}</span>
                      </span>
                    </label>
                  }
                </div>
                <p class="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-400">
                  <app-icon name="shield" [size]="13" class="mt-0.5 shrink-0" />
                  Card details are never stored on our servers. Online payments are verified securely on the backend before your order is confirmed.
                </p>
              }
            </section>
          </div>

          <aside class="lg:sticky lg:top-28">
            <div class="rounded-2xl border border-ink-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
              <h2 class="text-lg font-semibold text-ink-900">Order summary</h2>

              <ul class="mt-4 max-h-64 space-y-3 overflow-auto pr-1">
                @for (item of cart.items(); track item.id) {
                  <li class="flex items-center gap-3">
                    <div class="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                      <img [src]="item.imageUrl | assetUrl" [alt]="item.productName" class="h-full w-full object-cover" />
                      <span class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1 text-[10px] font-semibold text-cream">{{ item.quantity }}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="line-clamp-1 text-xs font-medium text-ink-800">{{ item.productName }}</p>
                      @if (item.variantName) {
                        <p class="text-[10px] text-ink-400">{{ item.variantName }}</p>
                      }
                    </div>
                    <span class="text-xs font-semibold text-ink-900">{{ item.lineTotal | money }}</span>
                  </li>
                }
              </ul>

              @if (cart.summary()?.couponCode) {
                <div class="mt-4 flex items-center justify-between rounded-xl border border-dashed border-success/40 bg-emerald-50/60 px-3 py-2">
                  <span class="flex items-center gap-1.5 text-xs font-medium text-emerald-800">
                    <app-icon name="tag" [size]="14" /> {{ cart.summary()?.couponCode }}
                  </span>
                  <button type="button" class="text-[11px] font-semibold text-emerald-800 underline underline-offset-2" (click)="removeCoupon()">Remove</button>
                </div>
              } @else {
                <div class="mt-4 flex gap-2">
                  <input
                    type="text"
                    class="input !py-2.5 text-xs uppercase placeholder:normal-case"
                    placeholder="Promo code"
                    [formControl]="couponControl"
                    (keydown.enter)="$event.preventDefault(); applyCoupon()"
                  />
                  <button type="button" class="btn-outline btn-sm shrink-0" [disabled]="couponControl.invalid || applyingCoupon()" (click)="applyCoupon()">
                    {{ applyingCoupon() ? 'Applying…' : 'Apply' }}
                  </button>
                </div>
              }

              <dl class="mt-5 space-y-2.5 border-t border-ink-100 pt-4 text-sm">
                <div class="flex justify-between">
                  <dt class="text-ink-500">Subtotal</dt>
                  <dd class="font-medium text-ink-900">{{ subtotal() | money }}</dd>
                </div>
                @if (discount() > 0) {
                  <div class="flex justify-between text-success">
                    <dt>Discount</dt>
                    <dd class="font-medium">−{{ discount() | money }}</dd>
                  </div>
                }
                <div class="flex justify-between">
                  <dt class="text-ink-500">Shipping</dt>
                  <dd class="font-medium text-ink-900">{{ shippingCost() > 0 ? (shippingCost() | money) : 'Free' }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-ink-500">Tax</dt>
                  <dd class="font-medium text-ink-900">{{ taxAmount() | money }}</dd>
                </div>
                @if (voucherDiscount() > 0) {
                  <div class="flex justify-between text-success">
                    <dt>Voucher points ({{ pointsToRedeem() }})</dt>
                    <dd class="font-medium">−{{ voucherDiscount() | money }}</dd>
                  </div>
                }
                <div class="flex items-baseline justify-between border-t border-ink-200 pt-3">
                  <dt class="text-base font-semibold text-ink-900">Total</dt>
                  <dd class="text-xl font-semibold text-ink-900">{{ total() | money }}</dd>
                </div>
              </dl>

              @if (voucherEnabled() && auth.isAuthenticated()) {
                <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-gold-200 bg-gold-50/50 p-3.5">
                  <input
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500"
                    [checked]="redeemPoints()"
                    [disabled]="(wallet()?.balance ?? 0) === 0"
                    (change)="togglePoints($event)"
                  />
                  <span class="min-w-0 flex-1 text-xs leading-relaxed text-ink-700">
                    <span class="flex items-center gap-1.5 font-semibold text-ink-900">
                      <app-icon name="gift" [size]="14" /> Redeem voucher points
                    </span>
                    <span class="mt-0.5 block">
                      You have <strong>{{ wallet()?.balance ?? 0 }}</strong> points
                      ({{ (wallet()?.balance ?? 0) | money }} value). Earn {{ config()?.voucherEarnPercent ?? 0 }}% back in points on every completed order.
                    </span>
                    @if (redeemPoints() && pointsToRedeem() === 0) {
                      <span class="mt-1 block text-[11px] text-ink-500">No points can be applied to this order right now.</span>
                    }
                  </span>
                </label>
              }

              <label class="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-ink-600">
                <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" formControlName="terms" />
                <span>
                  I agree to the
                  <a routerLink="/terms" target="_blank" class="font-medium text-ink-900 underline underline-offset-2">terms of service</a>
                  and
                  <a routerLink="/privacy" target="_blank" class="font-medium text-ink-900 underline underline-offset-2">privacy policy</a>.
                </span>
              </label>
              @if (form.controls.terms.touched && form.controls.terms.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Please accept the terms to continue.</p>
              }

              <button type="submit" class="btn-primary mt-4 w-full" [disabled]="placing() || !paymentMethods().length">
                @if (placing()) {
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
                  Placing order…
                } @else {
                  Place order · {{ total() | money }}
                  <app-icon name="arrow-right" [size]="17" />
                }
              </button>

              <div class="mt-4 space-y-2 text-[11px] text-ink-500">
                <p class="flex items-center gap-2"><app-icon name="shield" [size]="13" /> Secure payment & buyer protection</p>
                <p class="flex items-center gap-2"><app-icon name="refresh" [size]="13" /> 30-day returns on unused items</p>
              </div>
            </div>
          </aside>
        </form>
      }
    </div>
  `
})
export class CheckoutPage implements OnInit {
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly account = inject(AccountService);
  private readonly content = inject(ContentService);
  private readonly vouchers = inject(VoucherService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly addresses = this.account.addresses;
  readonly wallet = this.vouchers.wallet;
  readonly selectedAddressId = signal<string>('new');
  readonly shippingMethods = signal<ShippingMethod[]>([]);
  readonly selectedShippingId = signal<string>('');
  readonly paymentMethods = signal<string[]>([]);
  readonly loadingConfig = signal(true);
  readonly placing = signal(false);
  readonly applyingCoupon = signal(false);
  readonly redeemPoints = signal(false);
  readonly config = signal<CheckoutConfig | null>(null);
  readonly couponControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    shipping: new FormGroup({
      fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      state: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      country: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    }),
    saveAddress: new FormControl(true, { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    paymentMethod: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] })
  });

  readonly subtotal = computed(() => this.cart.summary()?.subtotal ?? 0);
  readonly discount = computed(() => this.cart.summary()?.discount ?? 0);

  readonly shippingCost = computed(() => {
    const method = this.shippingMethods().find((m) => m.id === this.selectedShippingId());
    if (!method) return this.cart.summary()?.shipping ?? 0;
    const threshold = this.config()?.freeShippingThreshold ?? 0;
    return threshold > 0 && this.subtotal() - this.discount() >= threshold ? 0 : method.cost;
  });

  readonly taxAmount = computed(() => {
    const rate = this.config()?.taxRate ?? 0;
    return Math.round((this.subtotal() - this.discount()) * rate) / 100;
  });

  readonly totalBeforePoints = computed(() =>
    Math.round((this.subtotal() - this.discount() + this.shippingCost() + this.taxAmount()) * 100) / 100
  );

  readonly voucherEnabled = computed(() => {
    const config = this.config();
    return !!config?.voucherPointsEnabled && (this.wallet()?.balance ?? 0) > 0;
  });

  readonly voucherSpendable = computed(() => {
    if (!this.redeemPoints()) return 0;
    const config = this.config();
    const wallet = this.wallet();
    if (!config || !wallet || !config.voucherPointsEnabled) return 0;
    const base = this.totalBeforePoints();
    const percent = Math.min(100, Math.max(0, config.voucherMaxRedeemPercent ?? 100));
    const maxByPercent = Math.round((base * percent) / 100 * 100) / 100;
    const value = Math.min(maxByPercent, wallet.balance * (config.voucherPointValue || 1), base);
    return Math.max(0, Math.round(value * 100) / 100);
  });

  readonly pointsToRedeem = computed(() => {
    const config = this.config();
    const value = config?.voucherPointValue ?? 1;
    if (!config || value <= 0) return 0;
    const spendable = this.voucherSpendable();
    if (spendable <= 0) return 0;
    const balance = this.wallet()?.balance ?? 0;
    let points = Math.floor(spendable / value);
    if (points < balance && points * value < spendable) points += 1;
    return Math.min(points, balance);
  });

  readonly voucherDiscount = computed(() => {
    const value = this.config()?.voucherPointValue ?? 1;
    const discount = this.pointsToRedeem() * value;
    return Math.max(0, Math.round(Math.min(this.totalBeforePoints(), discount) * 100) / 100);
  });

  readonly total = computed(() =>
    Math.max(0, Math.round((this.totalBeforePoints() - this.voucherDiscount()) * 100) / 100)
  );

  ngOnInit(): void {
    this.cart.get().subscribe({ error: () => undefined });

    const user = this.auth.user();
    if (user) {
      this.form.controls.email.setValue(user.email);
      this.form.controls.email.disable({ emitEvent: false });
      this.form.controls.shipping.patchValue({
        fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
        phone: user.phone ?? '',
        street: user.street ?? ''
      });
      this.account.getAddresses().subscribe({
        next: (items) => {
          const preferred = items.find((a) => a.isDefault) ?? items[0];
          if (preferred) this.selectAddress(preferred);
        },
        error: () => undefined
      });
      this.vouchers.loadWallet().subscribe({ error: () => undefined });
    }

    this.content.checkoutConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        const methods = (config.shippingMethods ?? []).filter((m) => m.isActive);
        this.shippingMethods.set(methods);
        const preferred = methods.find((m) => m.isDefault) ?? methods[0];
        if (preferred) this.selectedShippingId.set(preferred.id);
        this.paymentMethods.set(config.enabledPaymentMethods ?? []);
        if ((config.enabledPaymentMethods ?? []).length) {
          this.form.controls.paymentMethod.setValue(config.enabledPaymentMethods[0]);
        }
        this.loadingConfig.set(false);
      },
      error: () => {
        this.loadingConfig.set(false);
        this.toast.error('Unable to load checkout options. Please refresh the page.');
      }
    });
  }

  selectAddress(address: Address): void {
    this.selectedAddressId.set(address.id);
    this.form.controls.shipping.patchValue({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country
    });
    this.form.controls.saveAddress.setValue(false);
  }

  useNewAddress(): void {
    this.selectedAddressId.set('new');
    this.form.controls.saveAddress.setValue(true);
  }

  selectShipping(method: ShippingMethod): void {
    this.selectedShippingId.set(method.id);
  }

  togglePoints(event: Event): void {
    this.redeemPoints.set((event.target as HTMLInputElement).checked);
  }

  paymentLabel(method: string): string {
    switch (method) {
      case 'COD':
        return 'Cash on delivery';
      case 'Stripe':
        return 'Card payment · Stripe';
      case 'SSLCommerz':
        return 'Cards, mobile banking & wallets · SSLCommerz';
      case 'bKash':
        return 'bKash · Mobile banking';
      case 'Nagad':
        return 'Nagad · Mobile banking';
      case 'Rocket':
        return 'Rocket · Mobile banking';
      case 'Voucher':
        return 'Voucher points';
      default:
        return method;
    }
  }

  paymentDescription(method: string): string {
    switch (method) {
      case 'COD':
        return 'Pay in cash when your parcel arrives.';
      case 'Stripe':
        return 'You will be redirected to Stripe to complete payment securely.';
      case 'SSLCommerz':
        return 'You will be redirected to SSLCommerz to complete payment securely.';
      case 'bKash':
      case 'Nagad':
      case 'Rocket':
        return `Send the amount to our ${method} merchant number, then submit your transaction ID for verification.`;
      case 'Voucher':
        return 'Pay in full with your voucher points balance.';
      default:
        return 'Secure online payment.';
    }
  }

  paymentIcon(method: string): IconName {
    switch (method) {
      case 'COD':
        return 'wallet';
      case 'Stripe':
      case 'SSLCommerz':
        return 'card';
      case 'bKash':
      case 'Nagad':
      case 'Rocket':
        return 'phone';
      case 'Voucher':
        return 'gift';
      default:
        return 'shield';
    }
  }

  applyCoupon(): void {
    if (this.couponControl.invalid) return;
    const code = this.couponControl.value.trim();
    this.applyingCoupon.set(true);
    this.cart.applyCoupon(code).subscribe({
      next: () => {
        this.toast.success(`Promo code ${code.toUpperCase()} applied`);
        this.couponControl.reset('');
      },
      error: () => undefined,
      complete: () => this.applyingCoupon.set(false)
    });
  }

  removeCoupon(): void {
    this.cart.removeCoupon().subscribe({ next: () => this.toast.info('Promo code removed') });
  }

  async placeOrder(): Promise<void> {
    if (this.placing()) return;
    if (this.cart.isEmpty()) {
      this.toast.error('Your bag is empty');
      return;
    }
    if (this.paymentMethods().length === 0) {
      this.toast.error('No payment methods are available');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please complete the highlighted fields');
      return;
    }

    const value = this.form.getRawValue();
    const method = value.paymentMethod;
    const email = this.auth.user()?.email ?? value.email.trim();
    this.placing.set(true);

    try {
      const order = await firstValueFrom(
        this.orders.checkout({
          shippingAddress: { ...value.shipping },
          billingAddress: null,
          shippingMethodId: this.selectedShippingId() || null,
          couponCode: this.cart.summary()?.couponCode ?? null,
          paymentMethod: method,
          notes: value.notes?.trim() || null,
          guestEmail: this.auth.isAuthenticated() ? null : email,
          saveAddress: this.auth.isAuthenticated() && value.saveAddress,
          useVoucherPoints: this.redeemPoints()
        })
      );

      this.cart.reset();
      this.cart.get().subscribe({ error: () => undefined });
      if (this.auth.isAuthenticated()) this.vouchers.loadWallet().subscribe({ error: () => undefined });

      if (!this.auth.isAuthenticated() && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`luxe.order.${order.id}`, JSON.stringify(order));
      }

      if (order.paymentMethod === 'COD' || order.paymentMethod === 'Voucher') {
        this.toast.success(
          order.paymentMethod === 'Voucher' ? 'Order placed and paid with voucher points' : 'Order placed successfully'
        );
        await this.router.navigate(['/order-confirmation', order.id]);
        return;
      }

      if (['bKash', 'Nagad', 'Rocket'].includes(order.paymentMethod)) {
        this.toast.success('Order placed. Complete your mobile payment to confirm it.');
        await this.router.navigate(['/order-confirmation', order.id], { queryParams: { payment: 'mobile' } });
        return;
      }

      await this.redirectToPayment(order, method, email);
    } catch {
      this.placing.set(false);
    }
  }

  private async redirectToPayment(order: Order, provider: string, guestEmail: string): Promise<void> {
    const origin = window.location.origin;
    const successUrl = `${origin}/order-confirmation/${order.id}?verify=1&provider=${encodeURIComponent(provider)}`;
    const cancelUrl = `${origin}/order-confirmation/${order.id}?cancelled=1&provider=${encodeURIComponent(provider)}`;

    try {
      const payment = await firstValueFrom(
        this.orders.initiatePayment({
          orderId: order.id,
          provider,
          successUrl,
          cancelUrl,
          guestEmail: this.auth.isAuthenticated() ? null : guestEmail
        })
      );

      if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
        return;
      }

      this.toast.info('Order created. Complete payment from your order page.');
      await this.router.navigate(['/order-confirmation', order.id], { queryParams: { payment: 'pending' } });
    } catch {
      this.toast.error('Your order was placed, but payment could not be started. Retry from the order page.');
      await this.router.navigate(['/order-confirmation', order.id], { queryParams: { payment: 'failed' } });
    } finally {
      this.placing.set(false);
    }
  }
}
