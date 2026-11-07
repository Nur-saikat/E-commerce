import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { OrderReport, SalesReport } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [Icon, MoneyPipe, AssetUrlPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Overview</p>
          <h2 class="admin-title">Reports</h2>
          <p class="mt-1 text-sm text-ink-500">Revenue, orders and category performance for a chosen period.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(7)">7 days</button>
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(30)">30 days</button>
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(90)">90 days</button>
          <button type="button" class="btn-primary btn-sm" (click)="exportCsv()" [disabled]="!sales()">
            <app-icon name="download" [size]="14" /> Export CSV
          </button>
        </div>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label class="label" for="from">From</label>
            <input id="from" type="date" class="input" [value]="from()" (change)="setFrom($event)" />
          </div>
          <div>
            <label class="label" for="to">To</label>
            <input id="to" type="date" class="input" [value]="to()" (change)="setTo($event)" />
          </div>
          <div class="flex items-end">
            <button type="button" class="btn-primary" [disabled]="loading()" (click)="load()">
              <app-icon name="chart" [size]="14" /> {{ loading() ? 'Loading…' : 'Run report' }}
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-96 rounded-xl"></div></div>
      } @else if (sales(); as report) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Revenue</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ report.revenue | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ report.from }} → {{ report.to }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Orders</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ report.orders }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ orders()?.totalOrders ?? 0 }} including cancelled</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Average order value</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ report.averageOrderValue | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Per completed transaction</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Total value</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ orders()?.totalValue | money }}</p>
            <p class="mt-1 text-xs text-ink-400">All orders in range</p>
          </div>
        </div>

        <div class="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Daily revenue</h3>
                <p class="text-xs text-ink-400">{{ report.points.length }} day(s) with activity</p>
              </div>
            </div>
            <div class="mt-6 flex h-52 items-end gap-1">
              @for (point of report.points; track point.date) {
                <div class="group relative flex h-full flex-1 flex-col justify-end">
                  <div
                    class="w-full rounded-t bg-ink-900/85 transition group-hover:bg-gold-500"
                    [style.height]="barHeight(point.revenue)"
                    [title]="point.date + ' · ' + (point.revenue | money) + ' · ' + point.orders + ' orders'"
                  ></div>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No revenue in this period.</p>
              }
            </div>
            @if (report.points.length) {
              <div class="mt-3 flex justify-between text-[10px] text-ink-400">
                <span>{{ report.points[0]?.date?.slice(5) }}</span>
                <span>{{ report.points[report.points.length - 1]?.date?.slice(5) }}</span>
              </div>
            }
          </section>

          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Orders by status</h3>
            <p class="text-xs text-ink-400">Current state of every order in range</p>
            <div class="mt-4 space-y-3">
              @for (entry of statusEntries(); track entry.status) {
                <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                  <span class="text-sm text-ink-700">{{ entry.status }}</span>
                  <span [class]="statusClass(entry.status)">{{ entry.count }}</span>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No orders in this period.</p>
              }
            </div>
          </section>
        </div>

        <div class="grid gap-5 xl:grid-cols-2">
          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Top products</h3>
            <div class="mt-4 space-y-2">
              @for (product of report.topProducts; track product.productId) {
                <div class="flex items-center gap-3 rounded-xl border border-ink-100 p-2.5">
                  <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-10 w-10 rounded-lg object-cover" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink-900">{{ product.name }}</p>
                    <p class="text-xs text-ink-400">{{ product.soldCount }} sold</p>
                  </div>
                  <span class="text-sm font-semibold text-ink-900">{{ product.revenue | money }}</span>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No product sales in this period.</p>
              }
            </div>
          </section>

          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Revenue by category</h3>
            <div class="mt-4 space-y-4">
              @for (row of report.byCategory; track row.categoryName) {
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-ink-800">{{ row.categoryName }}</span>
                    <span class="text-ink-500">{{ row.revenue | money }} · {{ row.orders }} orders</span>
                  </div>
                  <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div class="h-full rounded-full bg-gold-500" [style.width]="categoryWidth(row.revenue)"></div>
                  </div>
                </div>
              } @empty {
                <p class="text-sm text-ink-400">No category data for this period.</p>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `
})
export class AdminReports implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly sales = signal<SalesReport | null>(null);
  readonly orders = signal<OrderReport | null>(null);
  readonly loading = signal(true);
  readonly from = signal(this.dayOffset(-29));
  readonly to = signal(this.dayOffset(0));

  readonly statusEntries = computed(() => {
    const byStatus = this.orders()?.byStatus ?? {};
    return Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      sales: this.admin.salesReport(this.from(), this.to()),
      orders: this.admin.orderReport(this.from(), this.to())
    }).subscribe({
      next: ({ sales, orders }) => {
        this.sales.set(sales);
        this.orders.set(orders);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load reports');
      }
    });
  }

  quickRange(days: number): void {
    this.from.set(this.dayOffset(-(days - 1)));
    this.to.set(this.dayOffset(0));
    this.load();
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  barHeight(revenue: number): string {
    const peak = Math.max(...(this.sales()?.points.map((point) => point.revenue) ?? [1]), 1);
    return `${Math.max(2, Math.round((revenue / peak) * 100))}%`;
  }

  categoryWidth(revenue: number): string {
    const peak = Math.max(...(this.sales()?.byCategory.map((row) => row.revenue) ?? [1]), 1);
    return `${Math.max(4, Math.round((revenue / peak) * 100))}%`;
  }

  statusClass(status: string): string {
    if (status === 'Completed') return 'badge-success';
    if (status === 'Cancelled' || status === 'Refunded') return 'badge-danger';
    if (status === 'Pending') return 'badge-warning';
    if (status === 'Shipped') return 'badge-gold';
    return 'badge-muted';
  }

  exportCsv(): void {
    const report = this.sales();
    if (!report) return;
    const rows = [['date', 'revenue', 'orders'], ...report.points.map((point) => [point.date, point.revenue, point.orders])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sales-report-${report.from}-${report.to}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  private dayOffset(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
