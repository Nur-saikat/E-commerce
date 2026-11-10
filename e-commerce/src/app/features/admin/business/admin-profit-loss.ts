import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ProfitLoss, ProfitLossPoint } from '../../../core/models/business.models';
import { BusinessService } from '../../../core/services/business.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-profit-loss',
  standalone: true,
  imports: [Icon, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Profit &amp; loss</h2>
          <p class="mt-1 text-sm text-ink-500">Revenue from paid orders, cost of goods, operating expenses and net profit.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(7)">7 days</button>
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(30)">30 days</button>
          <button type="button" class="btn-outline btn-sm" (click)="quickRange(90)">90 days</button>
          <button type="button" class="btn-primary btn-sm" (click)="exportCsv()" [disabled]="!report()">
            <app-icon name="download" [size]="14" /> Export CSV
          </button>
        </div>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 sm:grid-cols-[1fr_1fr_160px_auto]">
          <div>
            <label class="label" for="from">From</label>
            <input id="from" type="date" class="input" [value]="from()" (change)="setFrom($event)" />
          </div>
          <div>
            <label class="label" for="to">To</label>
            <input id="to" type="date" class="input" [value]="to()" (change)="setTo($event)" />
          </div>
          <div>
            <label class="label" for="groupBy">Group by</label>
            <select id="groupBy" class="input" [value]="groupBy()" (change)="setGroupBy($event)">
              <option value="day">Day</option>
              <option value="month">Month</option>
            </select>
          </div>
          <div class="flex items-end">
            <button type="button" class="btn-primary" [disabled]="loading()" (click)="load()">
              <app-icon name="chart" [size]="14" /> {{ loading() ? 'Calculating…' : 'Run report' }}
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-96 rounded-xl"></div></div>
      } @else if (report(); as data) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Revenue</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ data.revenue | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ data.orders }} paid order(s)</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Cost of goods</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ data.costOfGoods | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Snapshot from each order line</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Gross profit</p>
            <p [class]="profitClass(data.grossProfit)">{{ data.grossProfit | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Revenue − cost of goods</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Operating expenses</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ data.expenses | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Paid expenses in range</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net profit</p>
            <p [class]="profitClass(data.netProfit)">{{ data.netProfit | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Margin {{ data.margin }}%</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Purchases in range</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ data.purchases | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Stock arrivals — tracked separately</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="admin-card flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Capital in</p>
              <p class="mt-1 font-display text-xl font-semibold text-ink-900">{{ data.capitalIn | money }}</p>
            </div>
            <span class="rounded-lg bg-ink-50 p-2 text-ink-500"><app-icon name="wallet" [size]="16" /></span>
          </div>
          <div class="admin-card flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Capital out</p>
              <p class="mt-1 font-display text-xl font-semibold text-ink-900">{{ data.capitalOut | money }}</p>
            </div>
            <span class="rounded-lg bg-ink-50 p-2 text-ink-500"><app-icon name="receipt" [size]="16" /></span>
          </div>
        </div>

        <section class="admin-card">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Revenue vs net profit</h3>
              <p class="text-xs text-ink-400">{{ data.series.length }} {{ data.groupBy === 'month' ? 'month(s)' : 'day(s)' }} in range</p>
            </div>
            <div class="flex items-center gap-4 text-[11px] text-ink-400">
              <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-ink-800"></span> Revenue</span>
              <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-gold-500"></span> Net</span>
            </div>
          </div>
          <div class="mt-6 flex h-56 items-end gap-1.5 overflow-x-auto pb-2">
            @for (point of data.series; track point.period) {
              <div class="flex min-w-[30px] flex-1 flex-col items-center gap-2">
                <div class="flex h-40 w-full items-end justify-center gap-0.5">
                  <div
                    class="w-1/3 rounded-t bg-ink-800/80"
                    [style.height]="barHeight(point.revenue)"
                    [title]="point.label + ' revenue ' + (point.revenue | money)"
                  ></div>
                  <div
                    class="w-1/3 rounded-t"
                    [class.bg-gold-500]="point.netProfit >= 0"
                    [class.bg-danger]="point.netProfit < 0"
                    [style.height]="barHeight(abs(point.netProfit))"
                    [title]="point.label + ' net ' + (point.netProfit | money)"
                  ></div>
                </div>
                <span class="truncate text-[9px] text-ink-400">{{ point.label }}</span>
              </div>
            } @empty {
              <p class="text-sm text-ink-400">No activity in this period.</p>
            }
          </div>
        </section>

        <section class="admin-card overflow-x-auto p-0">
          <div class="px-5 pb-1 pt-5">
            <h3 class="text-sm font-semibold text-ink-900">Period breakdown</h3>
            <p class="text-xs text-ink-400">{{ data.from | date: 'MMM d, y' }} → {{ data.to | date: 'MMM d, y' }}</p>
          </div>
          <table class="table-luxe mt-2">
            <thead>
              <tr>
                <th class="pl-5">Period</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Cost of goods</th>
                <th>Gross profit</th>
                <th>Expenses</th>
                <th>Net profit</th>
                <th>Purchases</th>
              </tr>
            </thead>
            <tbody>
              @for (point of data.series; track point.period) {
                <tr>
                  <td class="pl-5 text-sm font-medium text-ink-800">{{ point.label }}</td>
                  <td class="text-sm text-ink-600">{{ point.orders }}</td>
                  <td class="text-sm text-ink-700">{{ point.revenue | money }}</td>
                  <td class="text-sm text-ink-700">{{ point.costOfGoods | money }}</td>
                  <td class="text-sm" [class.text-danger]="point.grossProfit < 0">{{ point.grossProfit | money }}</td>
                  <td class="text-sm text-ink-700">{{ point.expenses | money }}</td>
                  <td [class]="cellProfitClass(point)">{{ point.netProfit | money }}</td>
                  <td class="text-xs text-ink-500">{{ point.purchases | money }}</td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="py-10 text-center text-sm text-ink-400">Nothing recorded in this range.</td></tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-ink-100 bg-ink-50/70">
                <td class="pl-5 text-xs font-semibold uppercase tracking-wider text-ink-600">Total</td>
                <td class="text-sm font-semibold text-ink-900">{{ data.orders }}</td>
                <td class="text-sm font-semibold text-ink-900">{{ data.revenue | money }}</td>
                <td class="text-sm font-semibold text-ink-900">{{ data.costOfGoods | money }}</td>
                <td class="text-sm font-semibold text-ink-900">{{ data.grossProfit | money }}</td>
                <td class="text-sm font-semibold text-ink-900">{{ data.expenses | money }}</td>
                <td class="text-sm font-semibold" [class.text-danger]="data.netProfit < 0" [class.text-ink-900]="data.netProfit >= 0">
                  {{ data.netProfit | money }}
                </td>
                <td class="text-sm font-semibold text-ink-900">{{ data.purchases | money }}</td>
              </tr>
            </tfoot>
          </table>
        </section>
      }
    </div>
  `
})
export class AdminProfitLoss implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly toast = inject(ToastService);

  readonly report = signal<ProfitLoss | null>(null);
  readonly loading = signal(true);
  readonly from = signal(this.dayOffset(-29));
  readonly to = signal(this.dayOffset(0));
  readonly groupBy = signal('day');
  readonly maxValue = computed(() => {
    const series = this.report()?.series ?? [];
    return Math.max(1, ...series.map((point) => Math.max(point.revenue, Math.abs(point.netProfit))));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.business
      .profitLoss({ from: this.from(), to: this.to(), groupBy: this.groupBy() })
      .subscribe({
        next: (report) => {
          this.report.set(report);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to calculate profit & loss');
        }
      });
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
  }

  setGroupBy(event: Event): void {
    this.groupBy.set((event.target as HTMLSelectElement).value);
    this.load();
  }

  quickRange(days: number): void {
    this.from.set(this.dayOffset(-(days - 1)));
    this.to.set(this.dayOffset(0));
    if (days > 60) this.groupBy.set('month');
    this.load();
  }

  barHeight(value: number): string {
    const percent = Math.max(3, Math.round((Math.abs(value) / this.maxValue()) * 100));
    return `${Math.min(100, percent)}%`;
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  profitClass(value: number): string {
    const base = 'mt-2 font-display text-2xl font-semibold ';
    return base + (value < 0 ? 'text-danger' : 'text-ink-900');
  }

  cellProfitClass(point: ProfitLossPoint): string {
    return 'text-sm ' + (point.netProfit < 0 ? 'text-danger' : 'text-ink-900');
  }

  exportCsv(): void {
    const data = this.report();
    if (!data) return;
    const rows = [
      ['period', 'orders', 'revenue', 'cost_of_goods', 'gross_profit', 'expenses', 'net_profit', 'purchases'],
      ...data.series.map((point) => [
        point.period,
        point.orders,
        point.revenue,
        point.costOfGoods,
        point.grossProfit,
        point.expenses,
        point.netProfit,
        point.purchases
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `profit-loss-${data.from.slice(0, 10)}-${data.to.slice(0, 10)}.csv`;
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
