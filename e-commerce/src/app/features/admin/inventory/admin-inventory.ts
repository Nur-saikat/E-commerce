import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  InventoryItem,
  InventoryTransaction,
  Paged,
  PagedQuery,
  StockAdjustmentRequest
} from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';

const TRANSACTION_TYPES = ['Adjustment', 'Restock', 'Sale', 'Return', 'Damage', 'Loss'];

@Component({
  selector: 'app-admin-inventory',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 class="admin-title">Inventory</h2>
          <p class="mt-1 text-sm text-ink-500">Monitor stock levels and record every adjustment.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Search product or SKU" />
          </div>
          <label class="flex items-center gap-2 rounded-xl border border-ink-200 px-3 text-xs font-medium text-ink-700">
            <input type="checkbox" [checked]="lowStockOnly()" (change)="toggleLowStock($event)" class="accent-ink-900" />
            Low stock
          </label>
          <label class="flex items-center gap-2 rounded-xl border border-ink-200 px-3 text-xs font-medium text-ink-700">
            <input type="checkbox" [checked]="outOfStockOnly()" (change)="toggleOutOfStock($event)" class="accent-ink-900" />
            Out of stock
          </label>
          <button type="button" class="btn-primary btn-sm" (click)="toggleTransactions()">
            <app-icon name="list" [size]="14" /> {{ showTransactions() ? 'Hide history' : 'Stock history' }}
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
                <th class="pl-5">Product</th>
                <th>Category</th>
                <th>Base stock</th>
                <th>Total stock</th>
                <th>Threshold</th>
                <th>Status</th>
                <th class="pr-5 text-right">Adjust</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.productId) {
                <tr>
                  <td class="pl-5">
                    <p class="text-sm font-semibold text-ink-900">{{ item.name }}</p>
                    <p class="text-xs text-ink-400">{{ item.sku }}</p>
                    @if (item.variants.length) {
                      <p class="text-[11px] text-ink-400">{{ item.variants.length }} variant(s)</p>
                    }
                  </td>
                  <td class="text-xs text-ink-600">{{ item.categoryName || '—' }}</td>
                  <td class="text-sm text-ink-700">{{ item.stock }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ item.totalStock }}</td>
                  <td class="text-sm text-ink-500">{{ item.lowStockThreshold }}</td>
                  <td><span [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td>
                  <td class="pr-5 text-right">
                    <button type="button" class="btn-outline btn-sm" (click)="openAdjust(item)">
                      <app-icon name="sliders" [size]="13" /> Adjust
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-sm text-ink-400">No products match these filters.</td></tr>
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

      @if (showTransactions()) {
        <section class="admin-card">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Stock history</h3>
              <p class="text-xs text-ink-400">Every manual adjustment and automated sale movement.</p>
            </div>
            <div class="relative">
              <app-icon name="search" [size]="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <input [formControl]="txSearch" type="search" class="input py-2 pl-8 text-xs" placeholder="Search product or reference" />
            </div>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="table-luxe">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Change</th>
                  <th>Stock after</th>
                  <th>Reference</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of transactions(); track tx.id) {
                  <tr>
                    <td class="whitespace-nowrap text-xs text-ink-500">{{ tx.createdAt | date: 'MMM d, y · HH:mm' }}</td>
                    <td class="text-sm text-ink-800">{{ tx.productName }}</td>
                    <td><span class="badge-muted">{{ tx.type }}</span></td>
                    <td>
                      <span [class]="tx.quantityChange >= 0 ? 'badge-success' : 'badge-danger'">
                        {{ tx.quantityChange > 0 ? '+' : '' }}{{ tx.quantityChange }}
                      </span>
                    </td>
                    <td class="text-sm font-semibold text-ink-900">{{ tx.stockAfter }}</td>
                    <td class="text-xs text-ink-500">{{ tx.reference || '—' }}</td>
                    <td class="max-w-[220px] truncate text-xs text-ink-500">{{ tx.note || '—' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="7" class="py-8 text-center text-sm text-ink-400">No stock movements recorded.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination
            [page]="txPage()"
            [totalPages]="txPagination().totalPages"
            [totalItems]="txPagination().totalItems"
            [pageSize]="txPagination().pageSize"
            (pageChange)="goToTransactions($event)"
          />
        </section>
      }

      @if (adjustItem(); as item) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm" (click)="closeAdjust()">
          <form [formGroup]="adjustForm" class="card w-full max-w-md p-6" (click)="$event.stopPropagation()" (ngSubmit)="saveAdjustment()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">Adjust stock</h3>
                <p class="mt-1 text-sm text-ink-500">{{ item.name }}</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeAdjust()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>
            <div class="mt-5 space-y-4">
              <div>
                <label class="label" for="variant">Apply to</label>
                <select id="variant" formControlName="variantId" class="input">
                  <option value="">Base product ({{ item.stock }} in stock)</option>
                  @for (variant of item.variants; track variant.id) {
                    <option [value]="variant.id">{{ variant.name }} — {{ variant.sku }} ({{ variant.stock }})</option>
                  }
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="type">Reason</label>
                  <select id="type" formControlName="type" class="input">
                    @for (type of types; track type) {
                      <option [value]="type">{{ type }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="quantity">Change</label>
                  <input id="quantity" type="number" step="1" formControlName="quantityChange" class="input" placeholder="e.g. 10 or -3" />
                </div>
              </div>
              <p class="text-xs text-ink-400">Use a negative number to remove stock (damage, loss).</p>
              <div>
                <label class="label" for="note">Note</label>
                <input id="note" formControlName="note" class="input" placeholder="Optional reference" />
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeAdjust()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Apply adjustment' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminInventory implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly types = TRANSACTION_TYPES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<InventoryItem[]>([]);
  readonly pagination = signal<Paged<InventoryItem>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly lowStockOnly = signal(false);
  readonly outOfStockOnly = signal(false);

  readonly showTransactions = signal(false);
  readonly txSearch = new FormControl('', { nonNullable: true });
  readonly transactions = signal<InventoryTransaction[]>([]);
  readonly txPagination = signal<Paged<InventoryTransaction>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly txPage = signal(1);

  readonly adjustItem = signal<InventoryItem | null>(null);
  readonly saving = signal(false);

  readonly adjustForm = this.fb.nonNullable.group({
    variantId: [''],
    type: ['Adjustment', Validators.required],
    quantityChange: [1, [Validators.required]],
    note: ['']
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.txSearch.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.txPage.set(1);
        this.loadTransactions();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin
      .inventory({
        page: this.page(),
        pageSize: 10,
        search: this.search.value.trim() || undefined,
        lowStockOnly: this.lowStockOnly() || undefined,
        outOfStockOnly: this.outOfStockOnly() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load inventory');
        }
      });
  }

  toggleLowStock(event: Event): void {
    this.lowStockOnly.set((event.target as HTMLInputElement).checked);
    if (this.lowStockOnly()) this.outOfStockOnly.set(false);
    this.page.set(1);
    this.load();
  }

  toggleOutOfStock(event: Event): void {
    this.outOfStockOnly.set((event.target as HTMLInputElement).checked);
    if (this.outOfStockOnly()) this.lowStockOnly.set(false);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  toggleTransactions(): void {
    const next = !this.showTransactions();
    this.showTransactions.set(next);
    if (next && this.transactions().length === 0) this.loadTransactions();
  }

  loadTransactions(): void {
    const query: PagedQuery = {
      page: this.txPage(),
      pageSize: 10,
      search: this.txSearch.value.trim() || undefined
    };
    this.admin.inventoryTransactions(query).subscribe({
      next: (result) => {
        this.transactions.set(result.items);
        this.txPagination.set(result.pagination);
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to load stock history')
    });
  }

  goToTransactions(page: number): void {
    this.txPage.set(page);
    this.loadTransactions();
  }

  openAdjust(item: InventoryItem): void {
    this.adjustItem.set(item);
    this.adjustForm.reset({ variantId: '', type: 'Adjustment', quantityChange: 1, note: '' });
  }

  closeAdjust(): void {
    this.adjustItem.set(null);
  }

  saveAdjustment(): void {
    const item = this.adjustItem();
    if (!item) return;
    if (this.adjustForm.invalid || !this.adjustForm.controls.quantityChange.value) {
      this.toast.error('Enter a non-zero quantity change');
      return;
    }
    const value = this.adjustForm.getRawValue();
    const request: StockAdjustmentRequest = {
      variantId: value.variantId || null,
      type: value.type,
      quantityChange: Number(value.quantityChange),
      note: value.note.trim() || null
    };
    this.saving.set(true);
    this.admin.adjustStock(item.productId, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Stock adjusted');
        this.closeAdjust();
        this.load();
        if (this.showTransactions()) this.loadTransactions();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to adjust stock');
      }
    });
  }

  statusLabel(status: string): string {
    if (status === 'OutOfStock') return 'Out of stock';
    if (status === 'LowStock') return 'Low stock';
    return 'In stock';
  }

  statusClass(status: string): string {
    if (status === 'OutOfStock') return 'badge-danger';
    if (status === 'LowStock') return 'badge-warning';
    return 'badge-success';
  }
}
