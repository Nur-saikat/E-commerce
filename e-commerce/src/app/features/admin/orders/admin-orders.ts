import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrderSummary, Paged } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Completed', 'Cancelled', 'Refunded'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Sales</p>
          <h2 class="admin-title">Orders</h2>
          <p class="mt-1 text-sm text-ink-500">Fulfil, refund and track every order.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Order number, customer or email" />
          </div>
          <select class="input" [value]="status()" (change)="onStatusChange($event)">
            <option value="">All order statuses</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
          <select class="input" [value]="paymentStatus()" (change)="onPaymentChange($event)">
            <option value="">All payments</option>
            @for (option of paymentStatuses; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
          <button type="button" class="btn-ghost btn-sm" (click)="clearFilters()">
            <app-icon name="rotate-ccw" [size]="14" /> Reset
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed</th>
                <th class="pr-5 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              @for (order of items(); track order.id) {
                <tr>
                  <td class="pl-5">
                    <a [routerLink]="['/admin/orders', order.id]" class="text-sm font-semibold text-ink-900 hover:text-gold-600">
                      {{ order.orderNumber }}
                    </a>
                  </td>
                  <td>
                    <p class="text-sm text-ink-800">{{ order.customerName }}</p>
                    <p class="text-xs text-ink-400">{{ order.customerEmail }}</p>
                  </td>
                  <td class="text-sm text-ink-600">{{ order.itemCount }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ order.total | money }}</td>
                  <td>
                    <div class="flex flex-col gap-1">
                      <span class="text-[11px] text-ink-400">{{ order.paymentMethod }}</span>
                      <span [class]="paymentClass(order.paymentStatus)">{{ order.paymentStatus }}</span>
                    </div>
                  </td>
                  <td><span [class]="statusClass(order.status)">{{ order.status }}</span></td>
                  <td class="whitespace-nowrap text-xs text-ink-500">{{ order.createdAt | date: 'MMM d, y · HH:mm' }}</td>
                  <td class="pr-5 text-right">
                    <a [routerLink]="['/admin/orders', order.id]" class="inline-flex rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" title="Open order">
                      <app-icon name="chevron-right" [size]="16" />
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="py-10 text-center text-sm text-ink-400">No orders match these filters.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [page]="page()"
          [totalPages]="pagination().totalPages"
          [totalItems]="pagination().totalItems"
          [pageSize]="pagination().pageSize"
          (pageChange)="goTo($event)"
        />
      }
    </div>
  `
})
export class AdminOrders implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly statuses = ORDER_STATUSES;
  readonly paymentStatuses = PAYMENT_STATUSES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = signal('');
  readonly paymentStatus = signal('');
  readonly items = signal<OrderSummary[]>([]);
  readonly pagination = signal<Paged<OrderSummary>['pagination']>({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin
      .orders({
        page: this.page(),
        pageSize: 12,
        search: this.search.value.trim() || undefined,
        status: this.status() || undefined,
        paymentStatus: this.paymentStatus() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load orders');
        }
      });
  }

  onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  onPaymentChange(event: Event): void {
    this.paymentStatus.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search.reset();
    this.status.set('');
    this.paymentStatus.set('');
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
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
