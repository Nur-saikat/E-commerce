import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  BusinessProductOption,
  StockPurchase,
  StockPurchaseRequest
} from '../../../core/models/business.models';
import { Paged } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

interface DraftLine {
  productId: string;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  unitCost: number;
}

@Component({
  selector: 'app-admin-purchases',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Purchases</h2>
          <p class="mt-1 text-sm text-ink-500">Record a supplier invoice with several products at once — every line adds stock and purchase cost.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="cart" [size]="14" /> Record purchase
          </button>
        }
      </div>

      <div class="flex flex-wrap gap-1.5">
        <span class="btn-primary btn-sm pointer-events-none">
          <app-icon name="cart" [size]="13" /> Purchases
        </span>
        <a routerLink="/admin/business/arrivals" class="btn-outline btn-sm">
          <app-icon name="package" [size]="13" /> Stock arrivals
        </a>
        <a routerLink="/admin/business/supplier-returns" class="btn-outline btn-sm">
          <app-icon name="rotate-ccw" [size]="13" /> Supplier returns
        </a>
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
                <th class="pl-5">Invoice</th>
                <th>Supplier</th>
                <th>Products</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Stock</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr class="cursor-pointer" (click)="toggle(item.id)">
                  <td class="pl-5 whitespace-nowrap">
                    <p class="text-sm text-ink-800">{{ item.purchaseDate | date: 'MMM d, y' }}</p>
                    <p class="text-xs text-ink-400">{{ item.reference || '—' }}</p>
                  </td>
                  <td class="text-sm text-ink-700">{{ item.supplier || '—' }}</td>
                  <td>
                    <p class="text-sm text-ink-800">{{ item.items.length }} line(s)</p>
                    <p class="text-xs text-ink-400">{{ item.items[0]?.productName }}{{ item.items.length > 1 ? ' + more' : '' }}</p>
                  </td>
                  <td class="text-sm font-semibold text-ink-900">{{ item.totalQuantity }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ item.totalAmount | money }}</td>
                  <td>
                    <span [class]="item.stockApplied ? 'badge-success' : 'badge-muted'">
                      {{ item.stockApplied ? 'Applied' : 'Not applied' }}
                    </span>
                  </td>
                  <td class="pr-5 text-right">
                    <div class="flex items-center justify-end gap-1.5">
                      <span class="btn-outline btn-sm" aria-hidden="true">
                        <app-icon [name]="expandedId() === item.id ? 'chevron-up' : 'chevron-down'" [size]="13" />
                      </span>
                      @if (canManage()) {
                        <button type="button" class="btn-outline btn-sm text-danger" (click)="remove(item, $event)">
                          <app-icon name="trash" [size]="13" /> Delete
                        </button>
                      }
                    </div>
                  </td>
                </tr>
                @if (expandedId() === item.id) {
                  <tr class="bg-ink-50/50">
                    <td colspan="7" class="px-5 py-3">
                      <div class="overflow-hidden rounded-xl border border-ink-100 bg-white">
                        <table class="w-full text-left text-xs">
                          <thead>
                            <tr class="text-[11px] uppercase tracking-wide text-ink-400">
                              <th class="px-3 py-2">Product</th>
                              <th class="px-3 py-2">Variant</th>
                              <th class="px-3 py-2 text-right">Qty</th>
                              <th class="px-3 py-2 text-right">Unit cost</th>
                              <th class="px-3 py-2 text-right">Line total</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (line of item.items; track $index) {
                              <tr class="border-t border-ink-100">
                                <td class="px-3 py-2 text-ink-800">{{ line.productName }}</td>
                                <td class="px-3 py-2 text-ink-500">{{ line.variantName || 'Base product' }}</td>
                                <td class="px-3 py-2 text-right text-ink-800">{{ line.quantity }}</td>
                                <td class="px-3 py-2 text-right text-ink-700">{{ line.unitCost | money }}</td>
                                <td class="px-3 py-2 text-right font-semibold text-ink-900">{{ line.lineTotal | money }}</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                      </div>
                      @if (item.note) {
                        <p class="mt-2 text-xs text-ink-500">Note: {{ item.note }}</p>
                      }
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-sm text-ink-400">No purchases in this period.</td></tr>
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
          <form [formGroup]="form" class="card my-6 w-full max-w-3xl p-6" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">Record purchase</h3>
                <p class="mt-1 text-sm text-ink-500">One supplier invoice can contain several products. Saving adds stock and purchase cost for every line.</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="purchaseDate">Purchase date *</label>
                <input id="purchaseDate" type="date" formControlName="purchaseDate" class="input" />
              </div>
              <div>
                <label class="label" for="supplier">Supplier</label>
                <input id="supplier" formControlName="supplier" class="input" placeholder="Supplier or vendor" />
              </div>
              <div>
                <label class="label" for="reference">Invoice / reference</label>
                <input id="reference" formControlName="reference" class="input" placeholder="Invoice number" />
              </div>
              <div>
                <label class="label" for="note">Note</label>
                <input id="note" formControlName="note" class="input" placeholder="Optional" />
              </div>
            </div>

            <div class="mt-5 rounded-xl border border-ink-100 p-4">
              <p class="text-sm font-semibold text-ink-900">Add a product line</p>
              <div class="mt-3 space-y-3">
                <div>
                  <label class="label" for="productSearch">Find product</label>
                  <div class="relative">
                    <app-icon name="search" [size]="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                    <input id="productSearch" [formControl]="productSearch" class="input pl-9" placeholder="Search by name or SKU" />
                  </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label class="label" for="lineProductId">Product *</label>
                    <select id="lineProductId" [formControl]="lineForm.controls.productId" class="input" (change)="onProductChange()">
                      <option value="">Select a product</option>
                      @for (product of products(); track product.id) {
                        <option [value]="product.id">{{ product.name }} — {{ product.sku }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="label" for="lineVariantId">Apply to</label>
                    <select id="lineVariantId" [formControl]="lineForm.controls.variantId" class="input" [disabled]="!selectedProduct()?.variants?.length">
                      <option value="">Base product</option>
                      @for (variant of selectedProduct()?.variants ?? []; track variant.id) {
                        <option [value]="variant.id">{{ variant.name }} — {{ variant.sku }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label class="label" for="lineQuantity">Quantity *</label>
                    <input id="lineQuantity" type="number" min="1" step="1" [formControl]="lineForm.controls.quantity" class="input" />
                  </div>
                  <div>
                    <label class="label" for="lineUnitCost">Unit cost *</label>
                    <input id="lineUnitCost" type="number" min="0" step="0.01" [formControl]="lineForm.controls.unitCost" class="input" />
                  </div>
                </div>

                @if (selectedProduct(); as product) {
                  <div class="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600">
                    Current stock {{ product.totalStock }} · current cost {{ product.costPrice | money }}
                  </div>
                }

                <div class="flex items-center justify-between">
                  <span class="text-xs text-ink-500">Line value {{ lineValue() | money }}</span>
                  <button type="button" class="btn-outline btn-sm" (click)="addLine()">
                    <app-icon name="plus" [size]="13" /> Add line
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-4 overflow-hidden rounded-xl border border-ink-100">
              <table class="w-full text-left text-xs">
                <thead class="bg-ink-50">
                  <tr class="text-[11px] uppercase tracking-wide text-ink-400">
                    <th class="px-3 py-2">Product</th>
                    <th class="px-3 py-2">Variant</th>
                    <th class="px-3 py-2 text-right">Qty</th>
                    <th class="px-3 py-2 text-right">Unit cost</th>
                    <th class="px-3 py-2 text-right">Total</th>
                    <th class="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (line of draftLines(); track $index) {
                    <tr class="border-t border-ink-100">
                      <td class="px-3 py-2 text-ink-800">{{ line.productName }}</td>
                      <td class="px-3 py-2 text-ink-500">{{ line.variantName || 'Base product' }}</td>
                      <td class="px-3 py-2 text-right text-ink-800">{{ line.quantity }}</td>
                      <td class="px-3 py-2 text-right text-ink-700">{{ line.unitCost | money }}</td>
                      <td class="px-3 py-2 text-right font-semibold text-ink-900">{{ lineTotal(line) | money }}</td>
                      <td class="px-3 py-2 text-right">
                        <button type="button" class="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-danger" (click)="removeLine($index)" aria-label="Remove line">
                          <app-icon name="x" [size]="13" />
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="px-3 py-6 text-center text-xs text-ink-400">No lines yet — add at least one product.</td></tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="mt-4 flex items-center justify-between rounded-xl border border-ink-100 px-3 py-2.5">
              <span class="text-sm text-ink-600">{{ draftQuantity() }} unit(s) across {{ draftLines().length }} line(s)</span>
              <span class="text-lg font-semibold text-ink-900">{{ draftTotal() | money }}</span>
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving() || draftLines().length === 0">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Save purchase' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminPurchases implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly items = signal<StockPurchase[]>([]);
  readonly pagination = signal<Paged<StockPurchase>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly from = signal('');
  readonly to = signal('');
  readonly search = signal('');
  readonly expandedId = signal<string | null>(null);

  readonly editorOpen = signal(false);
  readonly saving = signal(false);
  readonly products = signal<BusinessProductOption[]>([]);
  readonly selectedProduct = signal<BusinessProductOption | null>(null);
  readonly draftLines = signal<DraftLine[]>([]);
  readonly productSearch = new FormControl('', { nonNullable: true });

  readonly draftQuantity = computed(() => this.draftLines().reduce((sum, line) => sum + line.quantity, 0));
  readonly draftTotal = computed(() =>
    Math.round(this.draftLines().reduce((sum, line) => sum + line.quantity * line.unitCost, 0) * 100) / 100
  );

  readonly form = this.fb.nonNullable.group({
    purchaseDate: [new Date().toISOString().slice(0, 10), Validators.required],
    supplier: [''],
    reference: [''],
    note: ['']
  });

  readonly lineForm = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    variantId: [''],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitCost: [0, [Validators.required, Validators.min(0)]]
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
      .purchases({
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
          this.toast.error(err?.error?.message ?? 'Unable to load purchases');
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

  toggle(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  openCreate(): void {
    this.form.reset({
      purchaseDate: new Date().toISOString().slice(0, 10),
      supplier: '',
      reference: '',
      note: ''
    });
    this.draftLines.set([]);
    this.resetLineEntry();
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
    const product = this.products().find((item) => item.id === this.lineForm.controls.productId.value) ?? null;
    this.selectedProduct.set(product);
    this.lineForm.controls.variantId.setValue('');
    if (product && product.costPrice > 0) this.lineForm.controls.unitCost.setValue(product.costPrice);
  }

  lineValue(): number {
    const value = this.lineForm.getRawValue();
    return Math.round(Number(value.quantity) * Number(value.unitCost) * 100) / 100;
  }

  lineTotal(line: DraftLine): number {
    return Math.round(line.quantity * line.unitCost * 100) / 100;
  }

  addLine(): void {
    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }
    const value = this.lineForm.getRawValue();
    const product = this.products().find((item) => item.id === value.productId);
    if (!product) {
      this.toast.error('Choose a product first');
      return;
    }

    const variantId = value.variantId || null;
    if (this.draftLines().some((line) => line.productId === product.id && line.variantId === variantId)) {
      this.toast.error('This product and variant is already on the invoice');
      return;
    }

    const variantName = variantId ? product.variants.find((variant) => variant.id === variantId)?.name ?? null : null;
    this.draftLines.update((lines) => [
      ...lines,
      {
        productId: product.id,
        productName: product.name,
        variantId,
        variantName,
        quantity: Math.floor(Number(value.quantity)),
        unitCost: Math.round(Number(value.unitCost) * 100) / 100
      }
    ]);
    this.resetLineEntry();
  }

  removeLine(index: number): void {
    this.draftLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.draftLines().length === 0) {
      this.toast.error('Add at least one product line');
      return;
    }

    const value = this.form.getRawValue();
    const request: StockPurchaseRequest = {
      supplier: value.supplier.trim() || null,
      reference: value.reference.trim() || null,
      note: value.note.trim() || null,
      purchaseDate: value.purchaseDate,
      items: this.draftLines().map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitCost: line.unitCost
      }))
    };

    this.saving.set(true);
    this.business.createPurchase(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Purchase recorded');
        this.closeEditor();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to record purchase');
      }
    });
  }

  async remove(item: StockPurchase, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirm.confirm({
      title: 'Delete purchase',
      message: `This reverses stock for ${item.totalQuantity} unit(s) on invoice ${item.reference || item.id} and cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.business.deletePurchase(item.id).subscribe({
      next: () => {
        this.toast.success('Purchase deleted');
        if (this.expandedId() === item.id) this.expandedId.set(null);
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete purchase')
    });
  }

  private resetLineEntry(): void {
    this.lineForm.reset({ productId: '', variantId: '', quantity: 1, unitCost: 0 });
    this.selectedProduct.set(null);
    this.productSearch.reset();
  }
}
