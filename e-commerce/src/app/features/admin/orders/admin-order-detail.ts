import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Order, Payment } from '../../../core/models/api.models';
import { ConfirmService } from '../../../core/services/confirm.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const NEXT_STATUS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Completed'],
  Completed: ['Refunded'],
  Cancelled: [],
  Refunded: []
};

@Component({
  selector: 'app-admin-order-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, AssetUrlPipe, MoneyPipe, DatePipe],
  template: `
    <div class="mx-auto max-w-6xl space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a routerLink="/admin/orders" class="text-xs font-semibold text-gold-600 hover:underline">← Back to orders</a>
          <h2 class="admin-title mt-1">
            {{ order()?.orderNumber || 'Order' }}
            @if (order(); as data) {
              <span class="ml-2 align-middle" [class]="statusClass(data.status)">{{ data.status }}</span>
            }
          </h2>
          @if (order(); as data) {
            <p class="mt-1 text-sm text-ink-500">Placed {{ data.createdAt | date: 'MMMM d, y · HH:mm' }} · {{ data.items.length }} item(s)</p>
          }
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-outline btn-sm" (click)="printInvoice(false)">
            <app-icon name="receipt" [size]="14" /> Invoice
          </button>
          <button type="button" class="btn-outline btn-sm" (click)="printInvoice(true)">
            <app-icon name="download" [size]="14" /> Download
          </button>
          @if (order(); as data) {
            @if (canRefund(data)) {
              <button type="button" class="btn-danger btn-sm" (click)="refund(data)">
                <app-icon name="rotate-ccw" [size]="14" /> Refund order
              </button>
            }
          }
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-80 rounded-xl"></div></div>
      } @else if (error()) {
        <div class="admin-card text-sm text-danger">{{ error() }}</div>
      } @else if (order(); as data) {
        <div class="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div class="space-y-5">
            <section class="admin-card overflow-x-auto">
              <h3 class="text-sm font-semibold text-ink-900">Items</h3>
              <table class="table-luxe mt-3">
                <thead>
                  <tr>
                    <th class="pl-0">Product</th>
                    <th>SKU</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th class="pr-0 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of data.items; track item.productId + (item.variantId ?? '')) {
                    <tr>
                      <td class="pl-0">
                        <div class="flex items-center gap-3">
                          <img [src]="item.imageUrl | assetUrl" [alt]="item.productName" class="h-10 w-10 rounded-lg border border-ink-100 object-cover" />
                          <div>
                            <p class="text-sm font-medium text-ink-900">{{ item.productName }}</p>
                            @if (item.variantName) {
                              <p class="text-xs text-ink-400">{{ item.variantName }}</p>
                            }
                          </div>
                        </div>
                      </td>
                      <td class="text-xs text-ink-500">{{ item.sku }}</td>
                      <td class="text-sm">{{ item.quantity }}</td>
                      <td class="text-sm">{{ item.unitPrice | money }}</td>
                      <td class="pr-0 text-right text-sm font-semibold">{{ item.lineTotal | money }}</td>
                    </tr>
                  }
                </tbody>
              </table>

              <div class="mt-4 flex justify-end">
                <div class="w-full max-w-xs space-y-1.5 text-sm">
                  <div class="flex justify-between text-ink-500"><span>Subtotal</span><span class="text-ink-900">{{ data.subtotal | money }}</span></div>
                  @if (data.discount > 0) {
                    <div class="flex justify-between text-ink-500">
                      <span>Discount {{ data.couponCode ? '(' + data.couponCode + ')' : '' }}</span>
                      <span class="text-danger">−{{ data.discount | money }}</span>
                    </div>
                  }
                  <div class="flex justify-between text-ink-500"><span>Shipping</span><span class="text-ink-900">{{ data.shippingCost | money }}</span></div>
                  <div class="flex justify-between text-ink-500"><span>Tax</span><span class="text-ink-900">{{ data.taxAmount | money }}</span></div>
                  <div class="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold text-ink-900">
                    <span>Total</span><span>{{ data.total | money }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="admin-card">
              <h3 class="text-sm font-semibold text-ink-900">Status history</h3>
              <ol class="mt-4 space-y-4 border-l border-ink-200 pl-4">
                @for (entry of data.statusHistory; track $index) {
                  <li class="relative">
                    <span class="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-gold-500"></span>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-sm font-semibold text-ink-900">{{ entry.status }}</span>
                      <span class="text-xs text-ink-400">{{ entry.changedAt | date: 'MMM d, y · HH:mm' }}</span>
                    </div>
                    @if (entry.note) {
                      <p class="mt-0.5 text-xs text-ink-500">{{ entry.note }}</p>
                    }
                    @if (entry.changedBy) {
                      <p class="text-[11px] text-ink-400">by {{ entry.changedBy }}</p>
                    }
                  </li>
                } @empty {
                  <li class="text-sm text-ink-400">No status changes recorded.</li>
                }
              </ol>
            </section>

            @if (payments().length) {
              <section class="admin-card overflow-x-auto">
                <h3 class="text-sm font-semibold text-ink-900">Payment attempts</h3>
                <table class="table-luxe mt-3">
                  <thead>
                    <tr>
                      <th class="pl-0">Provider</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Transaction</th>
                      <th class="pr-0">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (payment of payments(); track payment.id) {
                      <tr>
                        <td class="pl-0 text-sm text-ink-800">{{ payment.provider }}</td>
                        <td class="text-sm">{{ payment.amount | money }}</td>
                        <td><span [class]="paymentClass(payment.status)">{{ payment.status }}</span></td>
                        <td class="max-w-[180px] truncate text-xs text-ink-500">{{ payment.transactionId || '—' }}</td>
                        <td class="pr-0 whitespace-nowrap text-xs text-ink-500">{{ payment.createdAt | date: 'MMM d, HH:mm' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }
          </div>

          <div class="space-y-5">
            <section class="admin-card">
              <h3 class="text-sm font-semibold text-ink-900">Fulfilment</h3>
              @if (nextStatuses().length) {
                <form [formGroup]="statusForm" class="mt-4 space-y-3" (ngSubmit)="updateStatus()">
                  <div>
                    <label class="label" for="status">Move to</label>
                    <select id="status" formControlName="status" class="input">
                      @for (status of nextStatuses(); track status) {
                        <option [value]="status">{{ status }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="label" for="note">Note</label>
                    <input id="note" formControlName="note" class="input" placeholder="Internal note (optional)" />
                  </div>
                  @if (statusForm.controls.status.value === 'Shipped') {
                    <div>
                      <label class="label" for="tracking">Tracking number</label>
                      <input id="tracking" formControlName="trackingNumber" class="input" placeholder="Carrier tracking number" />
                    </div>
                  }
                  <button type="submit" class="btn-primary w-full" [disabled]="updating()">
                    <app-icon name="check" [size]="14" /> {{ updating() ? 'Updating…' : 'Update status' }}
                  </button>
                </form>
              } @else {
                <p class="mt-3 rounded-xl bg-ink-50 px-3 py-4 text-sm text-ink-500">
                  This order is {{ data.status.toLowerCase() }}. No further status changes are available.
                </p>
              }
            </section>

            <section class="admin-card space-y-3">
              <h3 class="text-sm font-semibold text-ink-900">Customer</h3>
              <div class="space-y-1 text-sm">
                <p class="font-medium text-ink-900">{{ data.customerName }}</p>
                <p class="flex items-center gap-2 text-ink-500"><app-icon name="mail" [size]="13" /> {{ data.customerEmail }}</p>
                <p class="flex items-center gap-2 text-ink-500"><app-icon name="phone" [size]="13" /> {{ data.customerPhone }}</p>
              </div>
              <div class="rounded-xl border border-ink-100 p-3 text-xs text-ink-600">
                <p class="mb-1 font-semibold uppercase tracking-wider text-ink-400">Ship to</p>
                <p class="font-medium text-ink-800">{{ data.shippingAddress.fullName }}</p>
                <p>{{ data.shippingAddress.street }}</p>
                <p>{{ data.shippingAddress.city }}, {{ data.shippingAddress.state }} {{ data.shippingAddress.postalCode }}</p>
                <p>{{ data.shippingAddress.country }}</p>
                <p>{{ data.shippingAddress.phone }}</p>
              </div>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Shipping method</p>
                  <p class="mt-1 text-ink-800">{{ data.shippingMethodName }}</p>
                </div>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Payment</p>
                  <p class="mt-1 text-ink-800">{{ data.paymentMethod }}</p>
                  <span class="mt-1 inline-flex" [class]="paymentClass(data.paymentStatus)">{{ data.paymentStatus }}</span>
                </div>
              </div>
              @if (data.trackingNumber) {
                <div class="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  Tracking: <span class="font-semibold text-ink-900">{{ data.trackingNumber }}</span>
                </div>
              }
              @if (data.notes) {
                <div class="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span class="font-semibold">Customer note:</span> {{ data.notes }}
                </div>
              }
            </section>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminOrderDetail implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly order = signal<Order | null>(null);
  readonly payments = signal<Payment[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly updating = signal(false);

  readonly statusForm = this.fb.nonNullable.group({
    status: ['', Validators.required],
    note: [''],
    trackingNumber: ['']
  });

  readonly nextStatuses = computed(() => {
    const current = this.order()?.status ?? '';
    return NEXT_STATUS[current] ?? [];
  });

  private orderId = '';

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.orderId) {
      this.router.navigate(['/admin/orders']);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.orderService.get(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
        const next = NEXT_STATUS[order.status] ?? [];
        this.statusForm.reset({
          status: next[0] ?? '',
          note: '',
          trackingNumber: order.trackingNumber ?? ''
        });
        this.loadPayments();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Unable to load this order.');
      }
    });
  }

  private loadPayments(): void {
    this.orderService.payments(this.orderId).subscribe({
      next: (payments) => this.payments.set(payments),
      error: () => this.payments.set([])
    });
  }

  updateStatus(): void {
    const value = this.statusForm.getRawValue();
    if (!value.status) return;
    this.updating.set(true);
    this.orderService.updateStatus(this.orderId, value.status, value.note || undefined, value.trackingNumber || undefined).subscribe({
      next: (order) => {
        this.updating.set(false);
        this.order.set(order);
        this.toast.success(`Order marked as ${order.status}`);
        this.statusForm.reset({
          status: (NEXT_STATUS[order.status] ?? [])[0] ?? '',
          note: '',
          trackingNumber: order.trackingNumber ?? ''
        });
        this.loadPayments();
      },
      error: (err) => {
        this.updating.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to update order status');
      }
    });
  }

  async refund(order: Order): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Refund order',
      message: `Refund ${order.orderNumber}? Stock will be returned to inventory and the payment marked as refunded. Provider-side refunds must be completed in the provider dashboard.`,
      confirmText: 'Refund order',
      danger: true
    });
    if (!ok) return;
    this.orderService.refund(order.id, 'Refunded by admin').subscribe({
      next: (updated) => {
        this.order.set(updated);
        this.toast.success('Order refunded');
        this.loadPayments();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to refund order')
    });
  }

  printInvoice(download: boolean): void {
    this.orderService.openInvoice(this.orderId, download);
  }

  canRefund(order: Order): boolean {
    return order.paymentStatus === 'Paid' || order.status === 'Completed';
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'Cancelled':
      case 'Refunded':
        return 'badge-danger';
      case 'Pending':
        return 'badge-warning';
      case 'Shipped':
        return 'badge-gold';
      default:
        return 'badge-muted';
    }
  }

  paymentClass(status: string): string {
    if (status === 'Paid') return 'badge-success';
    if (status === 'Failed') return 'badge-danger';
    if (status === 'Refunded') return 'badge-muted';
    return 'badge-warning';
  }
}
