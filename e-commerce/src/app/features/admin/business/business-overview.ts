import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BusinessOverview } from '../../../core/models/business.models';
import { BusinessService } from '../../../core/services/business.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-business-overview',
  standalone: true,
  imports: [Icon, MoneyPipe, DatePipe, RouterLink],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Command centre</h2>
          <p class="mt-1 text-sm text-ink-500">
            Capital, profitability, staff and stock movements in one place.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a routerLink="/admin/business/profit-loss" class="btn-outline btn-sm">
            <app-icon name="chart" [size]="14" /> Profit &amp; loss
          </a>
          <button type="button" class="btn-primary btn-sm" (click)="load()" [disabled]="loading()">
            <app-icon name="refresh" [size]="14" /> {{ loading() ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>
      </div>

      @if (loading() && !data()) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="admin-card"><div class="skeleton h-24 rounded-lg"></div></div>
          }
        </div>
        <div class="admin-card"><div class="skeleton h-80 rounded-xl"></div></div>
      } @else if (data(); as overview) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="admin-card">
            <div class="flex items-start justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net profit today</p>
              <span class="rounded-lg bg-ink-50 p-1.5 text-ink-500"><app-icon name="calendar" [size]="14" /></span>
            </div>
            <p [class]="profitClass(overview.today.netProfit)">{{ overview.today.netProfit | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ overview.today.orders }} paid order(s) · {{ overview.today.revenue | money }} revenue</p>
          </div>
          <div class="admin-card">
            <div class="flex items-start justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net profit this month</p>
              <span class="rounded-lg bg-ink-50 p-1.5 text-ink-500"><app-icon name="trending" [size]="14" /></span>
            </div>
            <p [class]="profitClass(overview.thisMonth.netProfit)">{{ overview.thisMonth.netProfit | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ overview.thisMonth.orders }} order(s) · margin {{ overview.thisMonth.margin }}%</p>
          </div>
          <div class="admin-card">
            <div class="flex items-start justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Lifetime revenue</p>
              <span class="rounded-lg bg-ink-50 p-1.5 text-ink-500"><app-icon name="wallet" [size]="14" /></span>
            </div>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ overview.lifetime.revenue | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ overview.totalPaidOrders }} paid order(s) all time</p>
          </div>
          <div class="admin-card">
            <div class="flex items-start justify-between">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net capital</p>
              <span class="rounded-lg bg-ink-50 p-1.5 text-ink-500"><app-icon name="receipt" [size]="14" /></span>
            </div>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ overview.netCapital | money }}</p>
            <p class="mt-1 text-xs text-ink-400">{{ overview.capitalInvested | money }} in · {{ overview.capitalWithdrawn | money }} out</p>
          </div>
        </div>

        <div class="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <section class="admin-card">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Lifetime financials</h3>
                <p class="text-xs text-ink-400">Paid orders less cost of goods and operating expenses.</p>
              </div>
              <span class="badge-muted">Margin {{ overview.lifetime.margin }}%</span>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-ink-100 px-3 py-2.5">
                <p class="text-[11px] uppercase tracking-wider text-ink-400">Revenue</p>
                <p class="mt-0.5 text-lg font-semibold text-ink-900">{{ overview.lifetime.revenue | money }}</p>
              </div>
              <div class="rounded-xl border border-ink-100 px-3 py-2.5">
                <p class="text-[11px] uppercase tracking-wider text-ink-400">Cost of goods</p>
                <p class="mt-0.5 text-lg font-semibold text-ink-900">{{ overview.lifetime.costOfGoods | money }}</p>
              </div>
              <div class="rounded-xl border border-ink-100 px-3 py-2.5">
                <p class="text-[11px] uppercase tracking-wider text-ink-400">Operating expenses</p>
                <p class="mt-0.5 text-lg font-semibold text-ink-900">{{ overview.lifetime.expenses | money }}</p>
              </div>
              <div class="rounded-xl border border-ink-100 px-3 py-2.5">
                <p class="text-[11px] uppercase tracking-wider text-ink-400">Net profit</p>
                <p [class]="profitClass(overview.lifetime.netProfit)">{{ overview.lifetime.netProfit | money }}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-600">
              <span>Gross profit {{ overview.lifetime.grossProfit | money }}</span>
              <span>Purchases {{ overview.lifetime.purchases | money }}</span>
            </div>
          </section>

          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Capital &amp; assets</h3>
            <p class="text-xs text-ink-400">Owner capital and stock at cost.</p>
            <div class="mt-4 space-y-2.5">
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Capital invested</span>
                <span class="text-sm font-semibold text-ink-900">{{ overview.capitalInvested | money }}</span>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Capital withdrawn</span>
                <span class="text-sm font-semibold text-ink-900">{{ overview.capitalWithdrawn | money }}</span>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Net purchases</span>
                <span class="text-sm font-semibold text-ink-900">{{ overview.totalPurchases | money }}</span>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Returned to suppliers</span>
                <span class="text-sm font-semibold text-ink-900">{{ overview.totalPurchaseReturns | money }}</span>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Inventory at cost</span>
                <span class="text-sm font-semibold text-ink-900">{{ overview.inventoryValue | money }}</span>
              </div>
            </div>
            <a routerLink="/admin/business/investments" class="mt-4 flex items-center justify-between rounded-xl bg-ink-950 px-3 py-2.5 text-xs font-medium text-cream">
              Manage capital <app-icon name="arrow-right" [size]="14" />
            </a>
          </section>
        </div>

        <section class="admin-card">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Monthly performance</h3>
              <p class="text-xs text-ink-400">Revenue and net profit for the last six months.</p>
            </div>
            <div class="flex items-center gap-4 text-[11px] text-ink-400">
              <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-ink-800"></span> Revenue</span>
              <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-gold-500"></span> Net profit</span>
            </div>
          </div>
          <div class="mt-6 flex h-56 items-end gap-3 overflow-x-auto pb-2">
            @for (point of overview.monthlySeries; track point.period) {
              <div class="flex min-w-[52px] flex-1 flex-col items-center gap-2">
                <div class="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    class="w-1/3 rounded-t bg-ink-800/80"
                    [style.height]="barHeight(point.revenue)"
                    [title]="'Revenue ' + (point.revenue | money)"
                  ></div>
                  <div
                    class="w-1/3 rounded-t"
                    [class.bg-gold-500]="point.netProfit >= 0"
                    [class.bg-danger]="point.netProfit < 0"
                    [style.height]="barHeight(abs(point.netProfit))"
                    [title]="'Net ' + (point.netProfit | money)"
                  ></div>
                </div>
                <span class="text-[10px] font-medium text-ink-500">{{ point.label }}</span>
              </div>
            } @empty {
              <p class="text-sm text-ink-400">No financial history yet.</p>
            }
          </div>
        </section>

        <div class="grid gap-5 xl:grid-cols-2">
          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Recent stock arrivals</h3>
                <p class="text-xs text-ink-400">{{ overview.totalPurchases | money }} net purchases to date</p>
              </div>
              <a routerLink="/admin/business/arrivals" class="text-xs font-medium text-ink-600 hover:text-ink-900">View all</a>
            </div>
            <div class="mt-4 space-y-2">
              @for (arrival of overview.recentArrivals; track arrival.id) {
                <div class="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink-900">{{ arrival.productName }}</p>
                    <p class="text-[11px] text-ink-400">
                      {{ arrival.quantity }} × {{ arrival.unitCost | money }} · {{ arrival.arrivalDate | date: 'MMM d, y' }}
                    </p>
                  </div>
                  <span class="text-sm font-semibold text-ink-900">{{ arrival.totalCost | money }}</span>
                </div>
              } @empty {
                <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
                  No stock arrivals recorded yet.
                </p>
              }
            </div>
          </section>

          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Recent expenses</h3>
                <p class="text-xs text-ink-400">{{ overview.lifetime.expenses | money }} total operating cost</p>
              </div>
              <a routerLink="/admin/business/expenses" class="text-xs font-medium text-ink-600 hover:text-ink-900">View all</a>
            </div>
            <div class="mt-4 space-y-2">
              @for (expense of overview.recentExpenses; track expense.id) {
                <div class="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink-900">{{ expense.title }}</p>
                    <p class="text-[11px] text-ink-400">
                      {{ expense.category }} · {{ expense.expenseDate | date: 'MMM d, y' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-ink-900">{{ expense.amount | money }}</p>
                    <span [class]="expense.isPaid ? 'badge-success' : 'badge-warning'">{{ expense.isPaid ? 'Paid' : 'Due' }}</span>
                  </div>
                </div>
              } @empty {
                <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
                  No expenses recorded yet.
                </p>
              }
            </div>
          </section>
        </div>

        <section class="admin-card">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Recent purchases</h3>
              <p class="text-xs text-ink-400">Supplier invoices with multiple products at once</p>
            </div>
            <a routerLink="/admin/business/purchases" class="text-xs font-medium text-ink-600 hover:text-ink-900">View all</a>
          </div>
          <div class="mt-4 grid gap-2 md:grid-cols-2">
            @for (item of overview.recentPurchases; track item.id) {
              <div class="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-ink-900">{{ item.supplier || 'Supplier invoice' }}</p>
                  <p class="text-[11px] text-ink-400">
                    {{ item.items.length }} line(s) · {{ item.totalQuantity }} unit(s)
                    @if (item.reference) {
                      · {{ item.reference }}
                    }
                    · {{ item.purchaseDate | date: 'MMM d, y' }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-ink-900">{{ item.totalAmount | money }}</span>
              </div>
            } @empty {
              <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400 md:col-span-2">
                No purchases recorded yet.
              </p>
            }
          </div>
        </section>

        <section class="admin-card">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Recent supplier returns</h3>
              <p class="text-xs text-ink-400">{{ overview.totalPurchaseReturns | money }} returned to suppliers</p>
            </div>
            <a routerLink="/admin/business/supplier-returns" class="text-xs font-medium text-ink-600 hover:text-ink-900">View all</a>
          </div>
          <div class="mt-4 grid gap-2 md:grid-cols-2">
            @for (item of overview.recentSupplierReturns; track item.id) {
              <div class="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3 py-2.5">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-ink-900">{{ item.productName }}</p>
                  <p class="text-[11px] text-ink-400">
                    {{ item.quantity }} × {{ item.unitCost | money }}
                    @if (item.supplier) {
                      · {{ item.supplier }}
                    }
                    · {{ item.returnDate | date: 'MMM d, y' }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-ink-900">{{ item.totalCost | money }}</span>
              </div>
            } @empty {
              <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400 md:col-span-2">
                No supplier returns recorded yet.
              </p>
            }
          </div>
        </section>

        <div class="grid gap-5 xl:grid-cols-[1fr_1fr_1.2fr]">
          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Team</h3>
                <p class="text-xs text-ink-400">{{ overview.activeStaff }} active of {{ overview.totalStaff }} people</p>
              </div>
              <a routerLink="/admin/business/staff" class="text-xs font-medium text-ink-600 hover:text-ink-900">Manage</a>
            </div>
            <div class="mt-4 space-y-2">
              @for (department of overview.staffByDepartment; track department.department) {
                <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                  <div>
                    <p class="text-sm text-ink-800">{{ department.department }}</p>
                    <p class="text-[11px] text-ink-400">{{ department.count }} member(s)</p>
                  </div>
                  <span class="text-xs font-medium text-ink-600">{{ department.monthlySalary | money }}/mo</span>
                </div>
              } @empty {
                <p class="text-xs text-ink-400">No staff registered.</p>
              }
            </div>
          </section>

          <section class="admin-card">
            <h3 class="text-sm font-semibold text-ink-900">Owner profile</h3>
            <div class="mt-4 flex items-center gap-3">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 font-display text-lg font-semibold text-cream">
                {{ initials(overview.owner.fullName) }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-ink-900">{{ overview.owner.fullName }}</p>
                <p class="truncate text-xs text-ink-400">{{ overview.owner.designation }} · {{ overview.owner.businessName }}</p>
              </div>
            </div>
            <div class="mt-4 space-y-1.5 text-xs text-ink-500">
              <p class="flex items-center gap-2"><app-icon name="mail" [size]="13" /> {{ overview.owner.email || 'No email set' }}</p>
              <p class="flex items-center gap-2"><app-icon name="phone" [size]="13" /> {{ overview.owner.phone || 'No phone set' }}</p>
              <p class="flex items-center gap-2"><app-icon name="map-pin" [size]="13" /> {{ overview.owner.address || 'No address set' }}</p>
            </div>
            <div class="mt-3 flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
              <span>{{ overview.owner.documents.length }} document(s)</span>
              <span>{{ overview.owner.employmentHistory.length }} role(s) on record</span>
            </div>
            <a routerLink="/admin/business/owner" class="mt-4 flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2.5 text-xs font-medium text-ink-700 hover:border-ink-900 hover:text-ink-900">
              Open business profile <app-icon name="arrow-right" [size]="14" />
            </a>
          </section>

          <section class="admin-card">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Low stock watch</h3>
                <p class="text-xs text-ink-400">{{ overview.lowStockCount }} product(s) need attention</p>
              </div>
              <a routerLink="/admin/inventory" class="text-xs font-medium text-ink-600 hover:text-ink-900">Inventory</a>
            </div>
            <div class="mt-4 space-y-2">
              @for (product of overview.lowStockProducts; track product.productId) {
                <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm text-ink-800">{{ product.name }}</p>
                    <p class="text-[11px] text-ink-400">{{ product.sku }}</p>
                  </div>
                  <span [class]="product.stock === 0 ? 'badge-danger' : 'badge-warning'">{{ product.stock }} left</span>
                </div>
              } @empty {
                <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
                  Every product is above its threshold.
                </p>
              }
            </div>
          </section>
        </div>
      }
    </div>
  `
})
export class BusinessOverviewPage implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly toast = inject(ToastService);

  readonly data = signal<BusinessOverview | null>(null);
  readonly loading = signal(true);
  readonly maxMonthly = computed(() => {
    const series = this.data()?.monthlySeries ?? [];
    return Math.max(1, ...series.map((point) => Math.max(point.revenue, Math.abs(point.netProfit))));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.business.overview().subscribe({
      next: (overview) => {
        this.data.set(overview);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load business overview');
      }
    });
  }

  barHeight(value: number): string {
    const percent = Math.max(4, Math.round((Math.abs(value) / this.maxMonthly()) * 100));
    return `${Math.min(100, percent)}%`;
  }

  abs(value: number): number {
    return Math.abs(value);
  }

  profitClass(value: number): string {
    const base = 'mt-2 font-display text-2xl font-semibold ';
    return base + (value < 0 ? 'text-danger' : 'text-ink-900');
  }

  initials(name: string): string {
    return (name || '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
