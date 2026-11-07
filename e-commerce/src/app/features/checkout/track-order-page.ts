import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { Order } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { orderStatusClass, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-track-order-page',
  standalone: true,
  imports: [DatePipe, RouterLink, ReactiveFormsModule, Icon, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="container-luxe py-10 lg:py-14">
      <div class="mx-auto max-w-3xl">
        <div class="text-center">
          <p class="eyebrow">Order tracking</p>
          <h1 class="section-title mt-1">Where is my order?</h1>
          <p class="mx-auto mt-3 max-w-md text-sm text-ink-500">
            Enter the order number from your confirmation email along with the email address used at checkout.
          </p>
        </div>

        <form class="card mt-8 p-5 sm:p-6" [formGroup]="form" (ngSubmit)="track()" novalidate>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="orderNumber">Order number</label>
              <input id="orderNumber" type="text" class="input uppercase placeholder:normal-case" placeholder="e.g. LX-2026-000123" formControlName="orderNumber" autocomplete="off" />
              @if (form.controls.orderNumber.touched && form.controls.orderNumber.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Order number is required.</p>
              }
            </div>
            <div>
              <label class="label" for="email">Email address</label>
              <input id="email" type="email" class="input" placeholder="you@example.com" formControlName="email" autocomplete="email" />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">A valid email address is required.</p>
              }
            </div>
          </div>
          <button type="submit" class="btn-primary mt-4" [disabled]="loading()">
            @if (loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
              Searching…
            } @else {
              <app-icon name="search" [size]="16" /> Track order
            }
          </button>
        </form>

        @if (notFound()) {
          <div class="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <app-icon name="alert-circle" [size]="18" class="mt-0.5 shrink-0" />
            <div>
              <p class="font-medium">No matching order found</p>
              <p class="mt-0.5 text-red-700">Check the order number and email address. If you still can't find it, contact our team.</p>
            </div>
          </div>
        }

        @if (order(); as item) {
          <div class="card mt-6 overflow-hidden">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 bg-cream px-5 py-4 sm:px-6">
              <div>
                <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Order</p>
                <p class="font-semibold text-ink-900">{{ item.orderNumber }}</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span [class]="orderStatus(item.status)">{{ item.status }}</span>
                <span [class]="paymentStatus(item.paymentStatus)">{{ item.paymentStatus }}</span>
              </div>
            </div>

            <div class="space-y-6 p-5 sm:p-6">
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-xl border border-ink-100 p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Placed</p>
                  <p class="mt-1 text-sm font-medium text-ink-900">{{ item.createdAt | date: 'mediumDate' }}</p>
                </div>
                <div class="rounded-xl border border-ink-100 p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Customer</p>
                  <p class="mt-1 text-sm font-medium text-ink-900">{{ item.customerName }}</p>
                </div>
                <div class="rounded-xl border border-ink-100 p-4">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Total</p>
                  <p class="mt-1 text-sm font-medium text-ink-900">{{ item.total | money }}</p>
                </div>
              </div>

              @if (item.trackingNumber) {
                <div class="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4">
                  <app-icon name="truck" [size]="20" class="text-sky-700" />
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-sky-700">Tracking number</p>
                    <p class="text-sm font-medium text-sky-900">{{ item.trackingNumber }}</p>
                  </div>
                </div>
              }

              <div>
                <h2 class="text-sm font-semibold text-ink-900">Progress</h2>
                <ol class="mt-3 space-y-3">
                  @for (entry of item.statusHistory; track entry.changedAt + entry.status) {
                    <li class="flex gap-3 text-sm">
                      <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" [class]="$last ? 'bg-gold-500' : 'bg-ink-300'"></span>
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
                        <p class="text-[11px] text-ink-500">{{ line.variantName || line.sku }} · Qty {{ line.quantity }}</p>
                      </div>
                      <span class="text-sm font-semibold text-ink-900">{{ line.lineTotal | money }}</span>
                    </li>
                  }
                </ul>
              </div>

              <div class="text-xs text-ink-500">
                Shipping to {{ item.shippingAddress.fullName }} · {{ item.shippingAddress.street }}, {{ item.shippingAddress.city }}
              </div>

              <div class="flex flex-wrap gap-3 border-t border-ink-100 pt-4">
                @if (item.canCancel) {
                  <a [routerLink]="['/account/orders', item.id]" class="btn-outline btn-sm">Manage order</a>
                }
                <a routerLink="/contact" class="btn-ghost btn-sm">Need help?</a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TrackOrderPage {
  private readonly orders = inject(OrderService);

  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly order = signal<Order | null>(null);

  readonly form = new FormGroup({
    orderNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  orderStatus(status: string): string {
    return orderStatusClass(status);
  }

  paymentStatus(status: string): string {
    return paymentStatusClass(status);
  }

  track(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.notFound.set(false);
    this.order.set(null);
    const { orderNumber, email } = this.form.getRawValue();
    this.orders.track(orderNumber.trim(), email.trim()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
  }
}
