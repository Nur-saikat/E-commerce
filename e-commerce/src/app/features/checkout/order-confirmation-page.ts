import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { orderStatusClass, paymentMethodLabel, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-order-confirmation-page',
  standalone: true,
  imports: [DatePipe, RouterLink, Icon, EmptyState, Spinner, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="container-luxe py-10 lg:py-14">
      @if (loading()) {
        <div class="mx-auto flex max-w-lg flex-col items-center gap-4 py-20">
          <app-spinner label="Loading your order…" />
        </div>
      } @else if (!order()) {
        <div class="mx-auto max-w-xl">
          <app-empty-state
            icon="receipt"
            title="We couldn't find this order"
            message="Sign in to view your order, or track it with your order number and email."
            actionLabel="Track an order"
            actionLink="/track-order"
          />
        </div>
      } @else if (order(); as item) {
        <div class="mx-auto max-w-3xl">
          <div class="card overflow-hidden">
            <div class="bg-ink-900 px-6 py-10 text-center text-cream sm:px-10">
              @if (item.paymentStatus === 'Paid' || item.paymentMethod === 'COD') {
                <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-gold-300">
                  <app-icon name="check" [size]="28" />
                </span>
                <h1 class="mt-4 font-display text-3xl font-semibold sm:text-4xl">Thank you for your order</h1>
                <p class="mx-auto mt-2 max-w-md text-sm text-cream/70">
                  @if (item.paymentMethod === 'COD') {
                    Your order has been received. Please have the exact amount ready on delivery.
                  } @else {
                    Your payment was received and your order is confirmed.
                  }
                </p>
              } @else if (verifyMessage()) {
                <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                  <app-icon name="alert-circle" [size]="28" />
                </span>
                <h1 class="mt-4 font-display text-3xl font-semibold sm:text-4xl">Payment pending</h1>
                <p class="mx-auto mt-2 max-w-md text-sm text-cream/70">{{ verifyMessage() }}</p>
              } @else {
                <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-cream">
                  <app-icon name="receipt" [size]="28" />
                </span>
                <h1 class="mt-4 font-display text-3xl font-semibold sm:text-4xl">Order received</h1>
                <p class="mx-auto mt-2 max-w-md text-sm text-cream/70">We've received your order and will keep you updated by email.</p>
              }

              <p class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide">
                <app-icon name="package" [size]="14" />
                Order {{ item.orderNumber }}
              </p>
            </div>

            <div class="space-y-6 p-6 sm:p-8">
              @if (item.paymentMethod !== 'COD' && item.paymentStatus !== 'Paid' && item.status !== 'Cancelled') {
                <div class="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-sm text-amber-900">
                    Your payment is not complete yet. Finish payment to confirm this order.
                  </p>
                  <button type="button" class="btn-primary btn-sm shrink-0" [disabled]="paying()" (click)="retryPayment(item)">
                    @if (paying()) {
                      Starting…
                    } @else {
                      Complete payment
                    }
                  </button>
                </div>
              }

              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-xl bg-cream p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Order status</p>
                  <span class="mt-1.5 inline-flex" [class]="orderStatus(item.status)">{{ item.status }}</span>
                </div>
                <div class="rounded-xl bg-cream p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Payment</p>
                  <span class="mt-1.5 inline-flex" [class]="paymentStatus(item.paymentStatus)">{{ item.paymentStatus }}</span>
                  <p class="mt-1 text-[11px] text-ink-500">{{ methodLabel(item.paymentMethod) }}</p>
                </div>
                <div class="rounded-xl bg-cream p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Placed</p>
                  <p class="mt-1 text-sm font-medium text-ink-900">{{ item.createdAt | date: 'mediumDate' }}</p>
                  @if (item.trackingNumber) {
                    <p class="mt-1 text-[11px] text-ink-500">Tracking {{ item.trackingNumber }}</p>
                  }
                </div>
              </div>

              <div>
                <h2 class="text-sm font-semibold text-ink-900">Items</h2>
                <ul class="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100">
                  @for (line of item.items; track line.productId + '-' + line.variantId) {
                    <li class="flex items-center gap-3 p-3.5">
                      <div class="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                        <img [src]="line.imageUrl | assetUrl" [alt]="line.productName" class="h-full w-full object-cover" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="line-clamp-1 text-sm font-medium text-ink-900">{{ line.productName }}</p>
                        <p class="text-[11px] text-ink-500">
                          {{ line.variantName || line.sku }} · Qty {{ line.quantity }}
                        </p>
                      </div>
                      <span class="text-sm font-semibold text-ink-900">{{ line.lineTotal | money }}</span>
                    </li>
                  }
                </ul>
              </div>

              <div class="grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 class="text-sm font-semibold text-ink-900">Shipping to</h2>
                  <p class="mt-2 text-sm leading-relaxed text-ink-600">
                    <span class="font-medium text-ink-800">{{ item.shippingAddress.fullName }}</span><br />
                    {{ item.shippingAddress.street }}<br />
                    {{ item.shippingAddress.city }}, {{ item.shippingAddress.state }} {{ item.shippingAddress.postalCode }}<br />
                    {{ item.shippingAddress.country }}<br />
                    {{ item.shippingAddress.phone }}
                  </p>
                </div>
                <div>
                  <h2 class="text-sm font-semibold text-ink-900">Delivery method</h2>
                  <p class="mt-2 text-sm text-ink-600">{{ item.shippingMethodName }}</p>
                  <p class="mt-4 text-xs text-ink-500">Need help? <a routerLink="/contact" class="font-medium text-ink-800 underline underline-offset-2">Contact support</a></p>
                </div>
              </div>

              <dl class="space-y-2 border-t border-ink-100 pt-4 text-sm">
                <div class="flex justify-between"><dt class="text-ink-500">Subtotal</dt><dd>{{ item.subtotal | money }}</dd></div>
                @if (item.discount > 0) {
                  <div class="flex justify-between text-success"><dt>Discount{{ item.couponCode ? ' · ' + item.couponCode : '' }}</dt><dd>−{{ item.discount | money }}</dd></div>
                }
                <div class="flex justify-between"><dt class="text-ink-500">Shipping</dt><dd>{{ item.shippingCost > 0 ? (item.shippingCost | money) : 'Free' }}</dd></div>
                <div class="flex justify-between"><dt class="text-ink-500">Tax</dt><dd>{{ item.taxAmount | money }}</dd></div>
                <div class="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ item.total | money }}</dd></div>
              </dl>

              @if (item.statusHistory.length) {
                <div>
                  <h2 class="text-sm font-semibold text-ink-900">Order timeline</h2>
                  <ol class="mt-3 space-y-3">
                    @for (entry of item.statusHistory; track entry.changedAt + entry.status) {
                      <li class="flex gap-3 text-sm">
                        <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500"></span>
                        <div>
                          <p class="font-medium text-ink-800">{{ entry.status }}</p>
                          @if (entry.note) {
                            <p class="text-xs text-ink-500">{{ entry.note }}</p>
                          }
                          <p class="text-[11px] text-ink-400">{{ entry.changedAt | date: 'medium' }}</p>
                        </div>
                      </li>
                    }
                  </ol>
                </div>
              }

              <div class="flex flex-wrap gap-3 border-t border-ink-100 pt-5">
                <a routerLink="/products" class="btn-primary btn-sm">Continue shopping</a>
                @if (auth.isAuthenticated()) {
                  <a [routerLink]="['/account/orders', item.id]" class="btn-outline btn-sm">View order</a>
                  <button type="button" class="btn-ghost btn-sm" (click)="downloadInvoice(item)">
                    <app-icon name="download" [size]="14" /> Invoice
                  </button>
                } @else {
                  <a routerLink="/track-order" class="btn-outline btn-sm">Track order</a>
                  <a routerLink="/register" class="btn-ghost btn-sm">Create an account</a>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class OrderConfirmationPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly verifyMessage = signal<string | null>(null);
  readonly paying = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    const stored = this.readStoredOrder(id);
    const verify = this.route.snapshot.queryParamMap.get('verify') === '1';
    const cancelled = this.route.snapshot.queryParamMap.get('cancelled') === '1';
    if (cancelled) this.verifyMessage.set('The payment was cancelled. You can retry below.');

    if (this.auth.isAuthenticated()) {
      this.orders.get(id).subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
          if (verify) this.verifyPayment(order);
        },
        error: () => {
          this.order.set(stored);
          this.loading.set(false);
          if (verify && stored) this.verifyPayment(stored);
        }
      });
      return;
    }

    this.order.set(stored);
    this.loading.set(false);
    if (verify && stored) this.verifyPayment(stored);
  }

  orderStatus(status: string): string {
    return orderStatusClass(status);
  }

  paymentStatus(status: string): string {
    return paymentStatusClass(status);
  }

  methodLabel(method: string): string {
    return paymentMethodLabel(method);
  }

  downloadInvoice(order: Order): void {
    this.orders.openInvoice(order.id, true);
  }

  retryPayment(order: Order): void {
    if (this.paying()) return;
    this.paying.set(true);
    const origin = window.location.origin;
    this.orders
      .initiatePayment({
        orderId: order.id,
        provider: order.paymentMethod,
        successUrl: `${origin}/order-confirmation/${order.id}?verify=1&provider=${encodeURIComponent(order.paymentMethod)}`,
        cancelUrl: `${origin}/order-confirmation/${order.id}?cancelled=1&provider=${encodeURIComponent(order.paymentMethod)}`,
        guestEmail: this.auth.isAuthenticated() ? null : order.customerEmail
      })
      .subscribe({
        next: (payment) => {
          if (payment.redirectUrl) {
            window.location.href = payment.redirectUrl;
            return;
          }
          this.paying.set(false);
          this.toast.info('Payment session created. Please check your email for the payment link.');
        },
        error: () => this.paying.set(false)
      });
  }

  private verifyPayment(order: Order): void {
    if (order.paymentMethod === 'COD' || order.paymentStatus === 'Paid') return;
    const transactionId =
      this.route.snapshot.queryParamMap.get('transactionId') ??
      this.route.snapshot.queryParamMap.get('session_id') ??
      this.route.snapshot.queryParamMap.get('tran_id') ??
      this.route.snapshot.queryParamMap.get('val_id');

    this.orders
      .verifyPayment({
        orderId: order.id,
        transactionId,
        guestEmail: this.auth.isAuthenticated() ? null : order.customerEmail
      })
      .subscribe({
        next: (result) => {
          const paid = result.success || (result.status ?? '').toLowerCase() === 'paid';
          const updated = { ...order, paymentStatus: paid ? 'Paid' : result.status, status: paid && order.status === 'Pending' ? 'Confirmed' : order.status };
          this.order.set(updated);
          this.persistGuestOrder(updated);
          if (paid) {
            this.verifyMessage.set(null);
            this.toast.success('Payment confirmed');
          } else {
            this.verifyMessage.set(result.message ?? 'We could not confirm your payment yet. Retry or contact support.');
          }
        },
        error: () => {
          this.verifyMessage.set('We could not confirm your payment yet. If you were charged, please contact support.');
        }
      });
  }

  private readStoredOrder(id: string): Order | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(`luxe.order.${id}`);
      return raw ? (JSON.parse(raw) as Order) : null;
    } catch {
      return null;
    }
  }

  private persistGuestOrder(order: Order): void {
    if (this.auth.isAuthenticated() || typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(`luxe.order.${order.id}`, JSON.stringify(order));
  }
}
