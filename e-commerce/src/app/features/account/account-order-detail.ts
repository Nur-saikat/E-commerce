import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { OrderService } from '../../core/services/order.service';
import { ContentService } from '../../core/services/content.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { CheckoutConfig, Order, OrderItem, ReturnRequest } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Spinner } from '../../shared/components/spinner/spinner';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { orderStatusClass, paymentMethodLabel, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-account-order-detail',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, Icon, EmptyState, Spinner, AssetUrlPipe, MoneyPipe],
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
              @if (isMobileUnpaid(item)) {
                <a [routerLink]="['/order-confirmation', item.id]" [queryParams]="{ payment: 'mobile' }" class="btn-primary btn-sm">
                  <app-icon name="phone" [size]="14" /> Submit payment details
                </a>
              } @else if (item.paymentMethod !== 'COD' && item.paymentMethod !== 'Voucher' && item.paymentStatus !== 'Paid' && item.status !== 'Cancelled') {
                <button type="button" class="btn-primary btn-sm" [disabled]="paying()" (click)="pay(item)">
                  {{ paying() ? 'Starting…' : 'Complete payment' }}
                </button>
              }
              @if (item.refundedAmount > 0 || item.refundMethod) {
                <span class="badge-muted">
                  {{ item.refundMethod === 'Voucher' ? 'Refunded in points' : 'Refunded ' + (item.refundedAmount | money) }}
                </span>
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
                @if (item.pointsDiscount > 0) {
                  <div class="flex justify-between text-success"><dt>Voucher points ({{ item.pointsRedeemed }})</dt><dd>−{{ item.pointsDiscount | money }}</dd></div>
                }
                <div class="flex justify-between border-t border-ink-200 pt-2 text-base font-semibold"><dt>Total</dt><dd>{{ item.total | money }}</dd></div>
                @if (item.pointsEarned > 0) {
                  <p class="flex items-center gap-1.5 pt-1 text-xs text-gold-700">
                    <app-icon name="gift" [size]="13" /> Earned {{ item.pointsEarned }} voucher points
                  </p>
                }
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

            @if (canReturn(item)) {
              <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold text-ink-900">Returns &amp; refunds</h3>
                    <p class="mt-1 text-xs text-ink-500">
                      Return delivered items for a monetary refund or convert the refund into voucher points.
                    </p>
                  </div>
                  @if (!showReturnForm()) {
                    <button type="button" class="btn-outline btn-sm" (click)="startReturn()">
                      <app-icon name="rotate-ccw" [size]="14" /> Request a return
                    </button>
                  }
                </div>

                @if (returns().length) {
                  <ul class="mt-4 space-y-3">
                    @for (ret of returns(); track ret.id) {
                      <li class="rounded-xl border border-ink-100 p-3.5">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <span class="text-xs font-semibold text-ink-900">Return {{ ret.id.slice(-6).toUpperCase() }}</span>
                          <span class="badge-muted">{{ ret.status }}</span>
                        </div>
                        <p class="mt-1.5 text-xs text-ink-500">
                          {{ returnItemsSummary(ret) }} · {{ ret.createdAt | date: 'mediumDate' }}
                        </p>
                        <p class="mt-1 text-xs text-ink-600">Reason: {{ ret.reason }}</p>
                        <div class="mt-2 flex flex-wrap gap-3 text-xs">
                          @if (ret.refundPoints > 0) {
                            <span class="font-medium text-gold-700">{{ ret.refundPoints }} voucher points</span>
                          }
                          @if (ret.refundAmount > 0) {
                            <span class="font-medium text-ink-800">{{ ret.refundAmount | money }}</span>
                          }
                          <span class="text-ink-400">via {{ refundDestinationLabel(ret.refundMethod || ret.refundPreference) }}</span>
                        </div>
                        @if (ret.adminNote) {
                          <p class="mt-2 rounded-lg bg-cream p-2.5 text-[11px] text-ink-600">Support note: {{ ret.adminNote }}</p>
                        }
                      </li>
                    }
                  </ul>
                }

                @if (showReturnForm()) {
                  <form class="mt-4 space-y-4" [formGroup]="returnForm" (ngSubmit)="submitReturn(item)" novalidate>
                    <div class="space-y-2">
                      <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Items to return</p>
                      @for (line of item.items; track lineKey(line)) {
                        <div class="rounded-xl border border-ink-100 p-3">
                          <label class="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500"
                              [checked]="returnQuantity(lineKey(line)) > 0"
                              [disabled]="remainingFor(line) === 0"
                              (change)="toggleReturnItem(line, $event)"
                            />
                            <span class="min-w-0 flex-1 text-sm">
                              <span class="block font-medium text-ink-900">{{ line.productName }}</span>
                              <span class="block text-[11px] text-ink-500">
                                {{ line.variantName || line.sku }} · Ordered {{ line.quantity }} ·
                                {{ remainingFor(line) }} returnable
                              </span>
                            </span>
                            <span class="text-xs font-semibold text-ink-800">{{ line.unitPrice | money }}</span>
                          </label>
                          @if (returnQuantity(lineKey(line)) > 0) {
                            <div class="mt-2 flex items-center gap-2 pl-7">
                              <label class="text-[11px] text-ink-500" [for]="'qty-' + lineKey(line)">Quantity</label>
                              <input
                                [id]="'qty-' + lineKey(line)"
                                type="number"
                                min="1"
                                [max]="remainingFor(line)"
                                class="input !w-24 !py-1.5 text-xs"
                                [value]="returnQuantity(lineKey(line))"
                                (input)="setReturnQuantity(line, $event)"
                              />
                            </div>
                          }
                        </div>
                      }
                    </div>

                    <div>
                      <label class="label" for="returnReason">Reason</label>
                      <select id="returnReason" class="input" formControlName="reason">
                        <option value="">Select a reason</option>
                        <option value="Changed my mind">Changed my mind</option>
                        <option value="Item does not fit">Item does not fit</option>
                        <option value="Item arrived damaged">Item arrived damaged</option>
                        <option value="Wrong item received">Wrong item received</option>
                        <option value="Item is not as described">Item is not as described</option>
                      </select>
                    </div>

                    <div>
                      <label class="label" for="returnComment">Additional details <span class="font-normal normal-case tracking-normal text-ink-400">(optional)</span></label>
                      <textarea id="returnComment" rows="2" class="input resize-y" formControlName="comment" placeholder="Tell us what happened"></textarea>
                    </div>

                    <div>
                      <label class="label" for="refundPreference">Refund method</label>
                      <select id="refundPreference" class="input" formControlName="refundPreference">
                        <option value="Original">Original payment method ({{ methodLabel(item.paymentMethod) }})</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Rocket">Rocket</option>
                        <option value="BankTransfer">Bank transfer</option>
                        @if (config()?.voucherPointsEnabled) {
                          <option value="Voucher">Voucher points</option>
                        }
                      </select>
                    </div>

                    @if (isMobileDestination()) {
                      <div class="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label class="label" for="refundAccountNumber">Mobile account number</label>
                          <input id="refundAccountNumber" type="tel" class="input" formControlName="accountNumber" placeholder="01XXXXXXXXX" />
                        </div>
                        <div>
                          <label class="label" for="refundAccountName">Account holder <span class="font-normal normal-case tracking-normal text-ink-400">(optional)</span></label>
                          <input id="refundAccountName" type="text" class="input" formControlName="accountName" />
                        </div>
                      </div>
                    }

                    @if (returnForm.controls.refundPreference.value === 'BankTransfer') {
                      <div class="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label class="label" for="refundBankName">Bank name</label>
                          <input id="refundBankName" type="text" class="input" formControlName="bankName" />
                        </div>
                        <div>
                          <label class="label" for="refundBankAccountName">Account name</label>
                          <input id="refundBankAccountName" type="text" class="input" formControlName="accountName" />
                        </div>
                        <div>
                          <label class="label" for="refundBankAccountNumber">Account number</label>
                          <input id="refundBankAccountNumber" type="text" class="input" formControlName="accountNumber" />
                        </div>
                      </div>
                    }

                    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-3.5">
                      <div>
                        <p class="text-[11px] uppercase tracking-wider text-ink-400">Estimated refund</p>
                        <p class="text-sm font-semibold text-ink-900">
                          @if (returnForm.controls.refundPreference.value === 'Voucher') {
                            ≈ {{ estimatedPoints() }} voucher points
                          } @else {
                            {{ returnEstimate() | money }}
                          }
                        </p>
                        <p class="text-[10px] text-ink-400">Final amount is confirmed by our team after inspection.</p>
                      </div>
                      <div class="flex gap-2">
                        <button type="button" class="btn-ghost btn-sm" [disabled]="submittingReturn()" (click)="cancelReturn()">Cancel</button>
                        <button type="submit" class="btn-primary btn-sm" [disabled]="submittingReturn()">
                          {{ submittingReturn() ? 'Submitting…' : 'Submit return' }}
                        </button>
                      </div>
                    </div>
                  </form>
                }
              </section>
            }
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
  private readonly content = inject(ContentService);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly order = signal<Order | null>(null);
  readonly paying = signal(false);
  readonly returns = signal<ReturnRequest[]>([]);
  readonly showReturnForm = signal(false);
  readonly submittingReturn = signal(false);
  readonly quantities = signal<Record<string, number>>({});
  readonly config = signal<CheckoutConfig | null>(null);
  readonly returnForm = new FormGroup({
    reason: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    comment: new FormControl('', { nonNullable: true }),
    refundPreference: new FormControl('Original', { nonNullable: true, validators: [Validators.required] }),
    accountNumber: new FormControl('', { nonNullable: true }),
    accountName: new FormControl('', { nonNullable: true }),
    bankName: new FormControl('', { nonNullable: true })
  });

  readonly returnEstimate = computed(() => {
    const order = this.order();
    if (!order || order.subtotal <= 0) return 0;
    const selected = order.items
      .map((line) => ({ line, quantity: this.quantities()[this.lineKey(line)] ?? 0 }))
      .filter((entry) => entry.quantity > 0);
    if (!selected.length) return 0;

    const itemsTotal = selected.reduce((sum, entry) => sum + entry.line.unitPrice * entry.quantity, 0);
    const discountShare = (order.discount * itemsTotal) / order.subtotal;
    const taxShare = (order.taxAmount * itemsTotal) / order.subtotal;
    const allReturned = order.items.every((line) => this.alreadyReturned(line) + (this.quantities()[this.lineKey(line)] ?? 0) >= line.quantity);
    const amount = itemsTotal - discountShare + taxShare + (allReturned ? order.shippingCost : 0);
    return Math.round(Math.max(amount, 0) * 100) / 100;
  });

  readonly estimatedPoints = computed(() => {
    const value = this.config()?.voucherPointValue ?? 1;
    if (value <= 0) return 0;
    return Math.floor(this.returnEstimate() / value);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.load(id);
    this.content.checkoutConfig().subscribe({
      next: (config) => this.config.set(config),
      error: () => undefined
    });
  }

  isMobileUnpaid(order: Order): boolean {
    return ['bKash', 'Nagad', 'Rocket'].includes(order.paymentMethod) && order.paymentStatus !== 'Paid' && order.status !== 'Cancelled';
  }

  canReturn(order: Order): boolean {
    return order.status === 'Completed' && order.paymentStatus === 'Paid';
  }

  lineKey(line: OrderItem): string {
    return `${line.productId}-${line.variantId ?? ''}`;
  }

  remainingFor(line: OrderItem): number {
    return Math.max(0, line.quantity - this.alreadyReturned(line));
  }

  alreadyReturned(line: OrderItem): number {
    return this.returns()
      .filter((ret) => ret.status !== 'Rejected')
      .flatMap((ret) => ret.items)
      .filter((item) => item.productId === line.productId && (item.variantId ?? '') === (line.variantId ?? ''))
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  returnQuantity(key: string): number {
    return this.quantities()[key] ?? 0;
  }

  toggleReturnItem(line: OrderItem, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const key = this.lineKey(line);
    this.quantities.update((current) => ({
      ...current,
      [key]: checked ? Math.min(1, this.remainingFor(line)) : 0
    }));
  }

  setReturnQuantity(line: OrderItem, event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const quantity = Math.max(1, Math.min(this.remainingFor(line), Number.isFinite(raw) ? Math.floor(raw) : 1));
    this.quantities.update((current) => ({ ...current, [this.lineKey(line)]: quantity }));
    (event.target as HTMLInputElement).value = String(quantity);
  }

  startReturn(): void {
    this.showReturnForm.set(true);
  }

  cancelReturn(): void {
    this.showReturnForm.set(false);
    this.quantities.set({});
    this.returnForm.reset({ reason: '', comment: '', refundPreference: 'Original', accountNumber: '', accountName: '', bankName: '' });
  }

  isMobileDestination(): boolean {
    return ['bKash', 'Nagad', 'Rocket'].includes(this.returnForm.controls.refundPreference.value);
  }

  refundDestinationLabel(destination?: string | null): string {
    switch (destination) {
      case 'Original':
        return 'original payment method';
      case 'BankTransfer':
        return 'bank transfer';
      case 'Voucher':
        return 'voucher points';
      default:
        return destination || 'original payment method';
    }
  }

  returnItemsSummary(ret: ReturnRequest): string {
    const count = ret.items.reduce((sum, item) => sum + item.quantity, 0);
    return `${count} item${count === 1 ? '' : 's'}`;
  }

  async submitReturn(order: Order): Promise<void> {
    if (this.submittingReturn()) return;
    const selected = order.items
      .map((line) => ({ line, quantity: this.quantities()[this.lineKey(line)] ?? 0 }))
      .filter((entry) => entry.quantity > 0);
    if (!selected.length) {
      this.toast.error('Select at least one item to return');
      return;
    }

    const value = this.returnForm.getRawValue();
    if (!value.reason) {
      this.returnForm.controls.reason.markAsTouched();
      this.toast.error('Choose a reason for the return');
      return;
    }
    if (this.isMobileDestination() && !value.accountNumber.trim()) {
      this.toast.error('Enter the mobile banking account number for the refund');
      return;
    }
    if (value.refundPreference === 'BankTransfer' && (!value.accountNumber.trim() || !value.bankName.trim() || !value.accountName.trim())) {
      this.toast.error('Enter the bank name, account name and account number');
      return;
    }

    this.submittingReturn.set(true);
    try {
      const created = await firstValueFrom(
        this.orders.createReturn({
          orderId: order.id,
          items: selected.map((entry) => ({
            productId: entry.line.productId,
            variantId: entry.line.variantId ?? null,
            quantity: entry.quantity
          })),
          reason: value.reason,
          comment: value.comment.trim() || null,
          refundPreference: value.refundPreference,
          accountName: value.accountName.trim() || null,
          accountNumber: value.accountNumber.trim() || null,
          bankName: value.bankName.trim() || null
        })
      );
      this.returns.update((current) => [created, ...current]);
      this.toast.success('Return request submitted');
      this.cancelReturn();
    } catch {
      // Error toast handled centrally.
    } finally {
      this.submittingReturn.set(false);
    }
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
        if (this.canReturn(order)) {
          this.orders.returnsForOrder(order.id).subscribe({
            next: (paged) => this.returns.set(paged.items ?? []),
            error: () => undefined
          });
        }
      },
      error: () => this.loading.set(false)
    });
  }
}
