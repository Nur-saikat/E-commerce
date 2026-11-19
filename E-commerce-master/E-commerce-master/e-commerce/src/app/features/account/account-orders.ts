import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrderSummary, PaginationMeta } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Pagination } from '../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { orderStatusClass, paymentStatusClass } from '../../shared/utils/status';

@Component({
  selector: 'app-account-orders',
  standalone: true,
  imports: [DatePipe, RouterLink, Icon, EmptyState, Pagination, MoneyPipe, AssetUrlPipe],
  template: `
    <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-ink-900">My orders</h2>
          <p class="mt-0.5 text-xs text-ink-500">{{ pagination()?.totalItems ?? 0 }} orders in total</p>
        </div>
        <a routerLink="/products" class="btn-ghost btn-sm">Shop again <app-icon name="arrow-right" [size]="14" /></a>
      </div>

      <div class="mt-4 flex flex-wrap gap-1.5">
        @for (tab of tabs; track tab.value) {
          <button
            type="button"
            class="rounded-full px-3.5 py-1.5 text-xs font-medium transition"
            [class]="status() === tab.value ? 'bg-ink-900 text-cream' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'"
            (click)="setStatus(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="mt-5 space-y-3">
          @for (row of [1, 2, 3]; track row) {
            <div class="skeleton h-24 w-full rounded-xl"></div>
          }
        </div>
      } @else if (!orders().length) {
        <div class="mt-5">
          <app-empty-state
            icon="package"
            title="No orders found"
            message="There are no orders matching this filter. Try another status or start a new order."
            actionLabel="Browse products"
            actionLink="/products"
          />
        </div>
      } @else {
        <ul class="mt-5 space-y-3">
          @for (order of orders(); track order.id) {
            <li class="rounded-xl border border-ink-100 p-4 transition hover:border-ink-300">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                  <div class="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                    @if (order.firstItemImage) {
                      <img [src]="order.firstItemImage | assetUrl" [alt]="order.orderNumber" class="h-full w-full object-cover" />
                    } @else {
                      <span class="flex h-full w-full items-center justify-center text-ink-400"><app-icon name="package" [size]="18" /></span>
                    }
                  </div>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-sm font-semibold text-ink-900">{{ order.orderNumber }}</p>
                      <span [class]="orderClass(order.status)">{{ order.status }}</span>
                      <span [class]="paymentClass(order.paymentStatus)">{{ order.paymentStatus }}</span>
                    </div>
                    <p class="mt-1 text-xs text-ink-500">
                      Placed {{ order.createdAt | date: 'mediumDate' }} · {{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <p class="text-base font-semibold text-ink-900">{{ order.total | money }}</p>
                    <p class="text-[11px] text-ink-400">{{ order.paymentMethod }}</p>
                  </div>
                  <a [routerLink]="['/account/orders', order.id]" class="btn-outline btn-sm">View</a>
                </div>
              </div>
            </li>
          }
        </ul>

        @if (pagination(); as meta) {
          <div class="mt-6">
            <app-pagination
              [page]="meta.page"
              [totalPages]="meta.totalPages"
              [totalItems]="meta.totalItems"
              [pageSize]="meta.pageSize"
              (pageChange)="load($event)"
            />
          </div>
        }
      }
    </section>
  `
})
export class AccountOrders implements OnInit {
  private readonly orderService = inject(OrderService);

  readonly tabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Shipped', value: 'Shipped' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  readonly status = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(6);
  readonly loading = signal(true);
  readonly orders = signal<OrderSummary[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  setStatus(status: string): void {
    if (this.status() === status) return;
    this.status.set(status);
    this.load(1);
  }

  load(page: number): void {
    this.page.set(page);
    this.loading.set(true);
    this.orderService.myOrders({ page, pageSize: this.pageSize(), status: this.status() || undefined }).subscribe({
      next: (result) => {
        this.orders.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  orderClass(status: string): string {
    return orderStatusClass(status);
  }

  paymentClass(status: string): string {
    return paymentStatusClass(status);
  }
}
