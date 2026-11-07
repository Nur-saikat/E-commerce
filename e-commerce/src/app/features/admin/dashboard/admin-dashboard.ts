import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dashboard } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { Icon, IconName } from '../../../shared/components/icon/icon';

interface StatCard {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  tone: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, Icon, AssetUrlPipe, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-6 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Store overview</p>
          <h2 class="admin-title">Performance at a glance</h2>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
            <app-icon name="refresh" [size]="14" /> Refresh
          </button>
          <a routerLink="/admin/reports" class="btn-primary btn-sm">
            <app-icon name="chart" [size]="14" /> Full reports
          </a>
        </div>
      </div>

      @if (error()) {
        <div class="admin-card border-danger/30 bg-red-50 text-sm text-danger">
          {{ error() }}
          <button type="button" class="ml-2 font-semibold underline" (click)="load()">Try again</button>
        </div>
      }

      @if (loading() && !dashboard()) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="admin-card"><div class="skeleton h-24 rounded-xl"></div></div>
          }
        </div>
      } @else if (dashboard(); as data) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (card of statCards(data); track card.label) {
            <div class="admin-card flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{{ card.label }}</p>
                <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ card.value }}</p>
                <p class="mt-1 text-xs text-ink-400">{{ card.hint }}</p>
              </div>
              <span class="flex h-10 w-10 flex-none items-center justify-center rounded-xl" [class]="card.tone">
                <app-icon [name]="card.icon" [size]="18" />
              </span>
            </div>
          }
        </div>

        <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <section class="admin-card">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Revenue, last 30 days</h3>
                <p class="text-xs text-ink-400">{{ chartTotal(data) | money }} collected across {{ chartOrders(data) }} orders</p>
              </div>
              <span class="badge-success">
                <app-icon name="trending" [size]="12" /> Live
              </span>
            </div>
            <div class="mt-6 flex h-48 items-end gap-1.5">
              @for (point of data.salesChart; track point.date) {
                <div class="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    class="w-full rounded-t bg-ink-900/85 transition group-hover:bg-gold-500"
                    [style.height]="barHeight(point.revenue, data)"
                    [title]="point.date + ' · ' + (point.revenue | money) + ' · ' + point.orders + ' orders'"
                  ></div>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No sales recorded yet.</p>
              }
            </div>
            <div class="mt-3 flex justify-between text-[10px] text-ink-400">
              <span>{{ data.salesChart[0]?.date?.slice(5) }}</span>
              <span>{{ data.salesChart[data.salesChart.length - 1]?.date?.slice(5) }}</span>
            </div>
          </section>

          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Sales by category</h3>
            <p class="text-xs text-ink-400">Top performing collections</p>
            <div class="mt-5 space-y-4">
              @for (row of data.salesByCategory; track row.categoryName) {
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-ink-800">{{ row.categoryName }}</span>
                    <span class="text-ink-500">{{ row.revenue | money }}</span>
                  </div>
                  <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div class="h-full rounded-full bg-gold-500" [style.width]="categoryWidth(row.revenue, data)"></div>
                  </div>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">Category insights appear after the first sale.</p>
              }
            </div>
          </section>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Best sellers</h3>
                <p class="text-xs text-ink-400">By units sold</p>
              </div>
              <a routerLink="/admin/products" class="text-xs font-semibold text-gold-600 hover:underline">All products</a>
            </div>
            <div class="mt-4 space-y-3">
              @for (product of data.topProducts; track product.productId) {
                <div class="flex items-center gap-3 rounded-xl border border-ink-100 p-2.5">
                  <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-11 w-11 rounded-lg object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink-900">{{ product.name }}</p>
                    <p class="text-xs text-ink-400">{{ product.soldCount }} sold</p>
                  </div>
                  <span class="text-sm font-semibold text-ink-900">{{ product.revenue | money }}</span>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No product sales yet.</p>
              }
            </div>
          </section>

          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Low stock alerts</h3>
                <p class="text-xs text-ink-400">Restock before it hurts conversion</p>
              </div>
              <a routerLink="/admin/inventory" class="text-xs font-semibold text-gold-600 hover:underline">Manage inventory</a>
            </div>
            <div class="mt-4 space-y-2">
              @for (item of data.lowStockProducts; track item.productId) {
                <div class="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink-900">{{ item.name }}</p>
                    <p class="text-xs text-ink-400">{{ item.sku }}</p>
                  </div>
                  <span class="badge-danger">{{ item.stock }} left</span>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">Everything is comfortably stocked.</p>
              }
            </div>
          </section>
        </div>

        <section class="admin-card">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Recent orders</h3>
              <p class="text-xs text-ink-400">Latest activity across the store</p>
            </div>
            <a routerLink="/admin/orders" class="text-xs font-semibold text-gold-600 hover:underline">All orders</a>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="table-luxe">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                @for (order of data.recentOrders; track order.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/admin/orders', order.id]" class="font-semibold text-ink-900 hover:text-gold-600">
                        {{ order.orderNumber }}
                      </a>
                    </td>
                    <td>
                      <p class="text-sm text-ink-800">{{ order.customerName }}</p>
                      <p class="text-xs text-ink-400">{{ order.customerEmail }}</p>
                    </td>
                    <td class="font-semibold">{{ order.total | money }}</td>
                    <td><span [class]="paymentClass(order.paymentStatus)">{{ order.paymentStatus }}</span></td>
                    <td><span [class]="statusClass(order.status)">{{ order.status }}</span></td>
                    <td class="text-xs text-ink-500">{{ order.createdAt | date: 'MMM d, HH:mm' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="py-8 text-center text-sm text-ink-400">No orders yet.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `
})
export class AdminDashboard implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly dashboard = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly chartPeak = computed(() => {
    const points = this.dashboard()?.salesChart ?? [];
    return Math.max(...points.map((p) => p.revenue), 1);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin.dashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Unable to load the dashboard right now.');
        this.loading.set(false);
        this.toast.error('Dashboard failed to load');
      }
    });
  }

  statCards(data: Dashboard): StatCard[] {
    const stats = data.stats;
    return [
      {
        label: 'Total revenue',
        value: this.money(stats.totalRevenue),
        hint: `${this.money(stats.revenueThisMonth)} this month`,
        icon: 'wallet',
        tone: 'bg-ink-900 text-cream'
      },
      {
        label: 'Orders',
        value: String(stats.totalOrders),
        hint: `${stats.pendingOrders} pending · ${stats.ordersToday} today`,
        icon: 'clipboard',
        tone: 'bg-gold-300/40 text-gold-600'
      },
      {
        label: 'Customers',
        value: String(stats.totalCustomers),
        hint: `${stats.completedOrders} completed orders`,
        icon: 'users',
        tone: 'bg-emerald-50 text-emerald-700'
      },
      {
        label: 'Products',
        value: String(stats.totalProducts),
        hint: `${stats.lowStockProducts} low stock`,
        icon: 'box',
        tone: 'bg-amber-50 text-amber-700'
      }
    ];
  }

  barHeight(revenue: number, data: Dashboard): string {
    const peak = Math.max(...data.salesChart.map((p) => p.revenue), this.chartPeak(), 1);
    return `${Math.max(2, Math.round((revenue / peak) * 100))}%`;
  }

  categoryWidth(revenue: number, data: Dashboard): string {
    const peak = Math.max(...data.salesByCategory.map((row) => row.revenue), 1);
    return `${Math.max(4, Math.round((revenue / peak) * 100))}%`;
  }

  chartTotal(data: Dashboard): number {
    return data.salesChart.reduce((sum, point) => sum + point.revenue, 0);
  }

  chartOrders(data: Dashboard): number {
    return data.salesChart.reduce((sum, point) => sum + point.orders, 0);
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

  private money(value: number): string {
    const symbol = '$';
    return `${symbol}${Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}
