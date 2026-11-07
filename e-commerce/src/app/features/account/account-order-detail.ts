import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Order } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { orderStatusClass, paymentMethodLabel, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-account-order-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, Icon, EmptyState, Spinner, AssetUrlPipe, MoneyPipe],
  template: `
    @if (loading()) {
      <div class="flex justify-center rounded-2xl border border-ink-100 bg-white py-20">
        <app-spinner label="Loading order…" />
      </div>
    } @else if (!order()) {
      <app-empty-state
        icon="package"
        title="Order not found"
        message="This order may no longer be available. Check your order history for details."
        actionLabel="Back to orders"
        actionLink="/account/orders"
      />
    } @else if (order(); as item) {
      <div class="space-y-6">
        <div class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <a routerLink="/account/orders" class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900">
                <app-icon name="arrow-left" [size]="13" /> All orders
              </a>
              <h2 class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ item.orderNumber }}</h2>
              <p class="mt-1 text-xs text-ink-500">Placed {{ item.createdAt | date: 'medium' }}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <span [class]="orderClass(item.status)">{{ item.status }}</span>
                <span [class]="paymentClass(item.paymentStatus)">{{ item.paymentStatus }}</span>
                <span class="badge-muted">{{ methodLabel(item.paymentMethod) }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="invoice(item)">
                <app-icon name="download" [size]="14" /> Invoice
              </button>
              @if (item.paymentMethod !== 'COD' && item.paymentStatus !== 'Paid' && item.status !== 'Cancelled') {
                <button type="button" class="btn-primary btn-sm" [disabled]="paying()" (click)="pay(item)">
                  {{ paying() ? 'Starting…' : 'Complete payment' }}
                </button>
              }
              @if (item.canCancel) {
                <button type="button" class="btn-ghost btn-sm text-danger hover:bg-red-50" (click)="cancel(item)">
                  Cancel order
                </button>
              }
            </div>
          </div>
        </div>

        @if (item.trackingNumber) {
          <div class="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4">
            <app-icon name="truck" [size]="20" class="text-sky-700" />
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Tracking number</p>
              <p class="text-sm font-medium text-sky-900">{{ item.trackingNumber }}</p>
            </div>
          </div>
        }

        <div class="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div class="space-y-6">
            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <h3 class="text-sm font-semibold text-ink-900">Items</h3>
              <ul class="mt-3 divide-y divide-ink-100">
                @for (line of item.items; track line.productId + '-' + line.variantId) {
                  <li class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div class="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                      <img [src]="line.imageUrl | assetUrl" [alt]="line.productName" class="h-full w-full object-cover" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-ink-900">{{ line.productName }}</p>
                      <p class="text-[11px] text-ink-500">{{ line.variantName || line.sku }} · Qty {{ line.quantity }}</p>
                      <p class="text-[11px] text-ink-400">{{ line.unitPrice | money }} each</p>
                    </div>
                    <span class="text-sm font-semibold text-ink-900">{{ line.lineTotal | money }}</span>
                  </li>
                }
              </ul>

              <dl class="mt-4 space-y-2 border-t border-ink-100 pt-4 text-sm">
                <div class="flex justify-between"><dt class="text-ink-500">Subtotal</dt><dd>{{ item.subtotal | money }}</dd></div>
                @if (item.discount > 0) {
                  <div class="flex justify-between text-success"><dt>Discount{{ item.couponCode ? ' · ' + item.couponCode : '' }}</dt><dd>−{{ item.discount | money }}</dd></div>
                }
                <div class="flex justify-between"><dt class="text-ink-500">Shipping</dt><dd>{{ item.shippingCost > 0 ? (item.shippingCost | money) : 'Free' }}</dd></div>
                <div class="flex justify-between"><dt class="text-ink-500">Tax</dt><dd>{{ item.taxAmount | money }}</dd></div>
                <div class="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ item.total | money }}</dd></div>
              </dl>
            </section>

            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <h3 class="text-sm font-semibold text-ink-900">Order history</h3>
              <ol class="mt-3 space-y-3">
                @for (entry of item.statusHistory; track entry.changedAt + entry.status) {
                  <li class="flex gap-3">
                    <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" [class]="$last ? 'bg-gold-500' : 'bg-ink-300'"></span>
                    <div>
                      <p class="text-sm font-medium text-ink-800">{{ entry.status }}</p>
                      @if (entry.note) {
                        <p class="text-xs text-ink-500">{{ entry.note }}</p>
                      }
                      <p class="text-[11px] text-ink-400">{{ entry.changedAt | date: 'medium' }}</p>
                    </div>
                  </li>
                }
              </ol>
            </section>
          </div>

          <div class="space-y-6">
            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <h3 class="text-sm font-semibold text-ink-900">Shipping address</h3>
              <p class="mt-2 text-sm leading-relaxed text-ink-600">
                <span class="font-medium text-ink-900">{{ item.shippingAddress.fullName }}</span><br />
                {{ item.shippingAddress.street }}<br />
                {{ item.shippingAddress.city }}, {{ item.shippingAddress.state }} {{ item.shippingAddress.postalCode }}<br />
                {{ item.shippingAddress.country }}<br />
                {{ item.shippingAddress.phone }}
              </p>
              <p class="mt-4 text-xs text-ink-500">
                <span class="font-medium text-ink-700">Delivery:</span> {{ item.shippingMethodName }}
              </p>
              @if (item.notes) {
                <p class="mt-3 rounded-lg bg-cream p-3 text-xs text-ink-600">“{{ item.notes }}”</p>
              }
            </section>

            <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
              <h3 class="text-sm font-semibold text-ink-900">Need help?</h3>
              <p class="mt-2 text-xs leading-relaxed text-ink-500">
                Questions about this order? Our team responds within one business day.
              </p>
              <a routerLink="/contact" class="btn-outline btn-sm mt-3">Contact support</a>
              <a routerLink="/shipping-returns" class="btn-ghost btn-sm mt-1.5 w-full">Shipping & returns</a>
            </section>
          </div>
        </div>
      </div>
    }
  `
})
export class AccountOrderDetail implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly paying = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  orderClass(status: string): string {
    return orderStatusClass(status);
  }

  paymentClass(status: string): string {
    return paymentStatusClass(status);
  }

  methodLabel(method: string): string {
    return paymentMethodLabel(method);
  }

  invoice(order: Order): void {
    this.orders.openInvoice(order.id, true);
  }

  async cancel(order: Order): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Cancel this order?',
      message: 'The order will be cancelled and reserved stock will be released. This cannot be undone.',
      confirmText: 'Cancel order',
      danger: true
    });
    if (!confirmed) return;
    this.orders.cancel(order.id, 'Cancelled by customer').subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.toast.success('Order cancelled');
      }
    });
  }

  pay(order: Order): void {
    if (this.paying()) return;
    this.paying.set(true);
    const origin = window.location.origin;
    this.orders
      .initiatePayment({
        orderId: order.id,
        provider: order.paymentMethod,
        successUrl: `${origin}/order-confirmation/${order.id}?verify=1&provider=${encodeURIComponent(order.paymentMethod)}`,
        cancelUrl: `${origin}/order-confirmation/${order.id}?cancelled=1&provider=${encodeURIComponent(order.paymentMethod)}`
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

  private load(id: string): void {
    this.orders.get(id).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
