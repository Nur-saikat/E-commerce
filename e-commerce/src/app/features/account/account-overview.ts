import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { OrderSummary } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { orderStatusClass, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-account-overview',
  standalone: true,
  imports: [DatePipe, RouterLink, Icon, EmptyState, MoneyPipe, AssetUrlPipe],
  template: `
    <div class="space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl border border-ink-100 bg-white p-5">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink-700"><app-icon name="package" [size]="17" /></span>
          <p class="mt-3 text-2xl font-semibold text-ink-900">{{ orderTotal() }}</p>
          <p class="text-xs text-ink-500">Orders placed</p>
        </div>
        <div class="rounded-2xl border border-ink-100 bg-white p-5">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink-700"><app-icon name="heart" [size]="17" /></span>
          <p class="mt-3 text-2xl font-semibold text-ink-900">{{ wishlist.items().length }}</p>
          <p class="text-xs text-ink-500">Saved pieces</p>
        </div>
        <div class="rounded-2xl border border-ink-100 bg-white p-5">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink-700"><app-icon name="map-pin" [size]="17" /></span>
          <p class="mt-3 text-2xl font-semibold text-ink-900">{{ addresses().length }}</p>
          <p class="text-xs text-ink-500">Saved addresses</p>
        </div>
        <div class="rounded-2xl border border-ink-100 bg-white p-5">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-ink-700"><app-icon name="calendar" [size]="17" /></span>
          <p class="mt-3 text-sm font-semibold text-ink-900">{{ memberSince() }}</p>
          <p class="text-xs text-ink-500">Member since</p>
        </div>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-ink-900">Recent orders</h2>
            <a routerLink="/account/orders" class="text-xs font-medium text-gold-600 underline-offset-4 hover:underline">View all</a>
          </div>

          @if (loadingOrders()) {
            <div class="mt-4 space-y-3">
              @for (row of [1, 2, 3]; track row) {
                <div class="skeleton h-16 w-full rounded-xl"></div>
              }
            </div>
          } @else if (!orders().length) {
            <div class="mt-4">
              <app-empty-state
                icon="package"
                title="No orders yet"
                message="When you place an order it will appear here with live status updates."
                actionLabel="Start shopping"
                actionLink="/products"
              />
            </div>
          } @else {
            <ul class="mt-4 divide-y divide-ink-100">
              @for (order of orders(); track order.id) {
                <li class="py-3.5 first:pt-0 last:pb-0">
                  <a [routerLink]="['/account/orders', order.id]" class="group flex items-center gap-4">
                    <div class="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                      @if (order.firstItemImage) {
                        <img [src]="order.firstItemImage | assetUrl" [alt]="order.orderNumber" class="h-full w-full object-cover" />
                      } @else {
                        <span class="flex h-full w-full items-center justify-center text-ink-400"><app-icon name="package" [size]="18" /></span>
                      }
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-semibold text-ink-900 group-hover:text-gold-600">{{ order.orderNumber }}</p>
                        <span [class]="statusClass(order.status)">{{ order.status }}</span>
                      </div>
                      <p class="mt-0.5 text-xs text-ink-500">
                        {{ order.createdAt | date: 'mediumDate' }} · {{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-semibold text-ink-900">{{ order.total | money }}</p>
                      <span [class]="paymentClass(order.paymentStatus)">{{ order.paymentStatus }}</span>
                    </div>
                    <app-icon name="chevron-right" [size]="16" class="text-ink-300" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <div class="space-y-6">
          <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-ink-900">Default address</h2>
              <a routerLink="/account/addresses" class="text-xs font-medium text-gold-600 underline-offset-4 hover:underline">Manage</a>
            </div>
            @if (defaultAddress(); as address) {
              <div class="mt-3 text-sm leading-relaxed text-ink-600">
                <p class="font-medium text-ink-900">{{ address.fullName }}</p>
                <p>{{ address.street }}</p>
                <p>{{ address.city }}, {{ address.state }} {{ address.postalCode }}</p>
                <p>{{ address.country }}</p>
                <p class="mt-1 text-xs text-ink-400">{{ address.phone }}</p>
              </div>
            } @else {
              <p class="mt-3 text-sm text-ink-500">No address saved yet.</p>
              <a routerLink="/account/addresses" class="btn-outline btn-sm mt-3">Add an address</a>
            }
          </section>

          <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
            <h2 class="text-lg font-semibold text-ink-900">Quick links</h2>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <a routerLink="/account/profile" class="flex flex-col gap-2 rounded-xl border border-ink-100 p-3 text-xs font-medium text-ink-700 transition hover:border-ink-900">
                <app-icon name="user" [size]="17" /> Edit profile
              </a>
              <a routerLink="/account/addresses" class="flex flex-col gap-2 rounded-xl border border-ink-100 p-3 text-xs font-medium text-ink-700 transition hover:border-ink-900">
                <app-icon name="map-pin" [size]="17" /> Addresses
              </a>
              <a routerLink="/wishlist" class="flex flex-col gap-2 rounded-xl border border-ink-100 p-3 text-xs font-medium text-ink-700 transition hover:border-ink-900">
                <app-icon name="heart" [size]="17" /> Wishlist
              </a>
              <a routerLink="/account/reviews" class="flex flex-col gap-2 rounded-xl border border-ink-100 p-3 text-xs font-medium text-ink-700 transition hover:border-ink-900">
                <app-icon name="star" [size]="17" /> My reviews
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class AccountOverview implements OnInit {
  readonly auth = inject(AuthService);
  readonly wishlist = inject(WishlistService);
  private readonly ordersService = inject(OrderService);
  private readonly account = inject(AccountService);

  readonly orders = signal<OrderSummary[]>([]);
  readonly orderTotal = signal(0);
  readonly loadingOrders = signal(true);
  readonly addresses = this.account.addresses;

  ngOnInit(): void {
    this.ordersService.myOrders({ page: 1, pageSize: 4 }).subscribe({
      next: (result) => {
        this.orders.set(result.items);
        this.orderTotal.set(result.pagination.totalItems);
        this.loadingOrders.set(false);
      },
      error: () => this.loadingOrders.set(false)
    });
    this.account.getAddresses().subscribe({ error: () => undefined });
    this.wishlist.get().subscribe({ error: () => undefined });
  }

  memberSince(): string {
    const created = this.auth.user()?.createdAt;
    if (!created) return '—';
    return new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  defaultAddress() {
    return this.addresses().find((a) => a.isDefault) ?? this.addresses()[0] ?? null;
  }

  statusClass(status: string): string {
    return orderStatusClass(status);
  }

  paymentClass(status: string): string {
    return paymentStatusClass(status);
  }
}
