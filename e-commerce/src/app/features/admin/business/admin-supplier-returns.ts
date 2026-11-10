import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  BusinessProductOption,
  SupplierReturn,
  SupplierReturnRequest
} from '../../../core/models/business.models';
import { Paged } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

const RETURN_REASONS = ['Damaged', 'Defective', 'Expired', 'Wrong item', 'Overstock', 'Other'];

@Component({
  selector: 'app-admin-supplier-returns',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Supplier returns</h2>
          <p class="mt-1 text-sm text-ink-500">Goods sent back to a supplier — the product, quantity and cost leave stock and reduce purchase costs.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="plus" [size]="14" /> Record supplier return
          </button>
        }
      </div>

      <div class="flex flex-wrap gap-1.5">
        <a routerLink="/admin/business/purchases" class="btn-outline btn-sm">
          <app-icon name="cart" [size]="13" /> Purchases
        </a>
        <a routerLink="/admin/business/arrivals" class="btn-outline btn-sm">
          <app-icon name="package" [size]="13" /> Stock arrivals
        </a>
        <span class="btn-primary btn-sm pointer-events-none">
          <app-icon name="rotate-ccw" [size]="13" /> Supplier returns
        </span>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-3">
          <div>
            <label class="label" for="from">From</label>
            <input id="from" type="date" class="input" [value]="from()" (change)="setFrom($event)" />
          </div>
          <div>
            <label class="label" for="to">To</label>
            <input id="to" type="date" class="input" [value]="to()" (change)="setTo($event)" />
          </div>
          <div>
            <label class="label" for="search">Search</label>
            <input id="search" class="input" [value]="search()" (input)="setSearch($event)" placeholder="Product, supplier or reference" />
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Return</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit cost</th>
                <th>Total</th>
                <th>Supplier</th>
                <th>Reason</th>
                <th>Stock</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td class="pl-5 whitespace-nowrap">
                    <p class="text-sm text-ink-800">{{ item.returnDate | date: 'MMM d, y' }}</p>
                    <p class="text-xs text-ink-400">{{ item.reference || '—' }}</p>
                  </td>
                  <td>
                    <p class="text-sm font-semibold text-ink-900">{{ item.productName }}</p>
                    <p class="text-xs text-ink-400">{{ item.variantName || 'Base product' }}</p>
                  </td>
                  <td class="text-sm font-semibold text-ink-900">{{ item.quantity }}</td>
                  <td class="text-sm text-ink-700">{{ item.unitCost | money }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ item.totalCost | money }}</td>
                  <td class="text-xs text-ink-500">{{ item.supplier || '—' }}</td>
                  <td class="text-xs text-ink-500">
                    {{ item.reason || '—' }}
                    @if (item.note) {
                      <p class="text-[11px] text-ink-400">{{ item.note }}</p>
                    }
                  </td>
                  <td>
                    <span [class]="item.stockRemoved ? 'badge-success' : 'badge-muted'">
                      {{ item.stockRemoved ? 'Removed' : 'Not removed' }}
                    </span>
                  </td>
                  <td class="pr-5 text-right">
                    @if (canManage()) {
                      <button type="button" class="btn-outline btn-sm text-danger" (click)="remove(item)">
                        <app-icon name="trash" [size]="13" /> Delete
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="py-10 text-center text-sm text-ink-400">No supplier returns in this period.</td></tr>
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

      @if (editorOpen()) {
        <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 backdrop-blur-sm" (click)="closeEditor()">
          <form [formGroup]="form" class="card my-6 w-full max-w-2xl p-6" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">Record supplier return</h3>
                <p class="mt-1 text-sm text-ink-500">Removes stock immediately and reduces net purchase costs for the period.</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>

            <div class="mt-5 space-y-4">
              <div>
                <label class="label" for="product">Find product</label>
                <div class="relative">
                  <app-icon name="search" [size]="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input id="product" [formControl]="productSearch" class="input pl-9" placeholder="Search by name or SKU" />
                </div>
              </div>
              <div>
                <label class="label" for="productId">Product *</label>
                <select id="productId" formControlName="productId" class="input" (change)="onProductChange()">
                  <option value="">Select a product</option>
                  @for (product of products(); track product.id) {
                    <option [value]="product.id">{{ product.name }} — {{ product.sku }} ({{ product.totalStock }} in stock)</option>
                  }
                </select>
              </div>

              @if (selectedProduct(); as product) {
                <div class="rounded-xl bg-ink-50 px-3 py-2.5 text-xs text-ink-600">
                  Current cost {{ product.costPrice | money }} · base stock {{ product.stock }} · total {{ product.totalStock }}
                </div>
                @if (product.variants.length) {
                  <div>
                    <label class="label" for="variantId">Apply to</label>
                    <select id="variantId" formControlName="variantId" class="input">
                      <option value="">Base product ({{ product.stock }} in stock)</option>
                      @for (variant of product.variants; track variant.id) {
                        <option [value]="variant.id">{{ variant.name }} — {{ variant.sku }} ({{ variant.stock }})</option>
                      }
                    </select>
                  </div>
                }
              }

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="quantity">Quantity *</label>
                  <input id="quantity" type="number" min="1" step="1" formControlName="quantity" class="input" />
                  @if (selectedProduct()) {
                    <p class="mt-1 text-[11px]" [class]="quantityExceedsStock() ? 'text-danger' : 'text-ink-400'">
                      {{ availableStock() }} unit(s) available to return
                    </p>
                  }
                </div>
                <div>
                  <label class="label" for="unitCost">Unit cost *</label>
                  <input id="unitCost" type="number" min="0" step="0.01" formControlName="unitCost" class="input" />
                </div>
                <div>
                  <label class="label" for="returnDate">Return date *</label>
                  <input id="returnDate" type="date" formControlName="returnDate" class="input" />
                </div>
                <div>
                  <label class="label" for="supplier">Supplier</label>
                  <input id="supplier" formControlName="supplier" class="input" placeholder="Supplier or vendor" />
                </div>
                <div>
                  <label class="label" for="reason">Reason</label>
                  <select id="reason" formControlName="reason" class="input">
                    @for (reason of reasons; track reason) {
                      <option [value]="reason">{{ reason }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="reference">Reference</label>
                  <input id="reference" formControlName="reference" class="input" placeholder="Return / credit note number" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label" for="note">Note</label>
                  <input id="note" formControlName="note" class="input" placeholder="Optional" />
                </div>
              </div>
              <div class="flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
                <span class="text-sm text-ink-600">Value returned to supplier</span>
                <span class="text-lg font-semibold text-ink-900">{{ totalCost() | money }}</span>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Record return' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminSupplierReturns implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly reasons = RETURN_REASONS;
  readonly items = signal<SupplierReturn[]>([]);
  readonly pagination = signal<Paged<SupplierReturn>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly from = signal('');
  readonly to = signal('');
  readonly search = signal('');

  readonly editorOpen = signal(false);
  readonly saving = signal(false);
  readonly products = signal<BusinessProductOption[]>([]);
  readonly selectedProduct = signal<BusinessProductOption | null>(null);
  readonly productSearch = new FormControl('', { nonNullable: true });

  readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    variantId: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitCost: [0, [Validators.required, Validators.min(0)]],
    returnDate: [new Date().toISOString().slice(0, 10), Validators.required],
    supplier: [''],
    reason: [RETURN_REASONS[0]],
    reference: [''],
    note: ['']
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.productSearch.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe((term) => {
        if (this.editorOpen()) this.loadProducts(term);
      });
  }

  ngOnInit(): void {
    this.load();
  }

  canManage(): boolean {
    return this.auth.hasPermission('business.manage');
  }

  load(): void {
    this.loading.set(true);
    this.business
      .supplierReturns({
        page: this.page(),
        pageSize: 10,
        from: this.from() || undefined,
        to: this.to() || undefined,
        search: this.search().trim() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load supplier returns');
        }
      });
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.load();
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.load();
  }

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.form.reset({
      productId: '',
      variantId: '',
      quantity: 1,
      unitCost: 0,
      returnDate: new Date().toISOString().slice(0, 10),
      supplier: '',
      reason: RETURN_REASONS[0],
      reference: '',
      note: ''
    });
    this.selectedProduct.set(null);
    this.productSearch.reset();
    this.editorOpen.set(true);
    if (this.products().length === 0) this.loadProducts('');
  }

  closeEditor(): void {
    this.editorOpen.set(false);
  }

  loadProducts(term: string): void {
    this.business.productOptions(term.trim() || undefined).subscribe({
      next: (products) => this.products.set(products),
      error: () => this.toast.error('Unable to load products')
    });
  }

  onProductChange(): void {
    const product = this.products().find((item) => item.id === this.form.controls.productId.value) ?? null;
    this.selectedProduct.set(product);
    this.form.controls.variantId.setValue('');
    if (product && product.costPrice > 0) this.form.controls.unitCost.setValue(product.costPrice);
  }

  availableStock(): number {
    const product = this.selectedProduct();
    if (!product) return 0;
    const variantId = this.form.controls.variantId.value;
    if (!variantId) return product.stock;
    return product.variants.find((variant) => variant.id === variantId)?.stock ?? 0;
  }

  quantityExceedsStock(): boolean {
    return Number(this.form.controls.quantity.value) > this.availableStock();
  }

  totalCost(): number {
    const value = this.form.getRawValue();
    return Math.round(Number(value.quantity) * Number(value.unitCost) * 100) / 100;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.quantityExceedsStock()) {
      this.toast.error(`Only ${this.availableStock()} unit(s) available to return`);
      return;
    }
    const value = this.form.getRawValue();
    const request: SupplierReturnRequest = {
      productId: value.productId,
      variantId: value.variantId || null,
      quantity: Number(value.quantity),
      unitCost: Number(value.unitCost),
      supplier: value.supplier.trim() || null,
      reason: value.reason.trim() || null,
      reference: value.reference.trim() || null,
      note: value.note.trim() || null,
      returnDate: value.returnDate
    };
    this.saving.set(true);
    this.business.createSupplierReturn(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Supplier return recorded');
        this.closeEditor();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to record supplier return');
      }
    });
  }

  async remove(item: SupplierReturn): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete supplier return',
      message: `This restores ${item.quantity} unit(s) of ${item.productName} to stock and cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.business.deleteSupplierReturn(item.id).subscribe({
      next: () => {
        this.toast.success('Supplier return deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete supplier return')
    });
  }
}
