import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Category, Paged, ProductDetail, ProductRequest, ProductSummary } from '../../../core/models/api.models';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, Pagination, EmptyState, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 class="admin-title">Products</h2>
          <p class="mt-1 text-sm text-ink-500">Manage pricing, stock, visibility and merchandising.</p>
        </div>
        <a routerLink="/admin/products/new" class="btn-primary btn-sm">
          <app-icon name="plus" [size]="14" /> New product
        </a>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Search name, SKU or tag" />
          </div>
          <select class="input" [value]="categoryId()" (change)="onCategoryChange($event)">
            <option value="">All categories</option>
            @for (category of categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
          <select class="input" [value]="sort()" (change)="onSortChange($event)">
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="popularity">Best selling</option>
          </select>
          <label class="flex items-center gap-2 rounded-xl border border-ink-200 px-3 text-xs font-medium text-ink-700">
            <input type="checkbox" [checked]="featuredOnly()" (change)="toggleFeatured($event)" class="accent-ink-900" />
            Featured only
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else if (items().length === 0) {
        <app-empty-state
          icon="box"
          title="No products found"
          message="Adjust the filters or create a new product to get started."
          actionLabel="Create product"
          actionLink="/admin/products/new"
        />
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Sold</th>
                <th>Status</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of items(); track product.id) {
                <tr>
                  <td class="pl-5">
                    <div class="flex items-center gap-3">
                      <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-11 w-11 rounded-lg border border-ink-100 object-cover" />
                      <div class="min-w-0">
                        <a [routerLink]="['/admin/products', product.id]" class="block max-w-[240px] truncate text-sm font-semibold text-ink-900 hover:text-gold-600">
                          {{ product.name }}
                        </a>
                        <p class="text-xs text-ink-400">{{ product.sku }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-xs text-ink-600">{{ product.categoryName || '—' }}</td>
                  <td>
                    <p class="text-sm font-semibold text-ink-900">{{ product.effectivePrice | money }}</p>
                    @if (product.discountPrice) {
                      <p class="text-[11px] text-ink-400 line-through">{{ product.price | money }}</p>
                    }
                  </td>
                  <td>
                    <span [class]="stockClass(product)">{{ product.totalStock }}</span>
                  </td>
                  <td class="text-sm text-ink-600">{{ product.soldCount }}</td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      <span [class]="product.isActive ? 'badge-success' : 'badge-muted'">
                        {{ product.isActive ? 'Active' : 'Hidden' }}
                      </span>
                      @if (product.isFeatured) {
                        <span class="badge-gold">Featured</span>
                      }
                    </div>
                  </td>
                  <td class="pr-5">
                    <div class="flex items-center justify-end gap-1">
                      <a [routerLink]="['/products', product.slug]" target="_blank" class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" title="View in store">
                        <app-icon name="eye" [size]="15" />
                      </a>
                      <button
                        type="button"
                        class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900"
                        [title]="product.isActive ? 'Hide product' : 'Publish product'"
                        [disabled]="busyId() === product.id"
                        (click)="toggleActive(product)"
                      >
                        <app-icon [name]="product.isActive ? 'ban' : 'check-circle'" [size]="15" />
                      </button>
                      <button
                        type="button"
                        class="rounded-lg p-2 transition hover:bg-ink-50"
                        [class]="product.isFeatured ? 'text-gold-600' : 'text-ink-500 hover:text-ink-900'"
                        title="Toggle featured"
                        [disabled]="busyId() === product.id"
                        (click)="toggleFeaturedProduct(product)"
                      >
                        <app-icon name="star" [size]="15" [filled]="product.isFeatured" />
                      </button>
                      <a [routerLink]="['/admin/products', product.id]" class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" title="Edit">
                        <app-icon name="edit" [size]="15" />
                      </a>
                      <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-danger" title="Delete" (click)="remove(product)">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  </td>
                </tr>
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
export class AdminProducts implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly categories = signal<Category[]>([]);
  readonly items = signal<ProductSummary[]>([]);
  readonly pagination = signal<Paged<ProductSummary>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly categoryId = signal('');
  readonly sort = signal('newest');
  readonly featuredOnly = signal(false);
  readonly busyId = signal<string | null>(null);

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
    this.catalog.categories(true).subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const sort = this.sort();
    const query = {
      page: this.page(),
      pageSize: 10,
      search: this.search.value.trim() || undefined,
      categoryId: this.categoryId() || undefined,
      isFeatured: this.featuredOnly() ? true : undefined,
      includeInactive: true,
      sortBy: sort === 'name' ? 'name' : sort === 'price-asc' || sort === 'price-desc' ? 'price' : sort === 'popularity' ? 'popularity' : 'newest',
      descending: sort !== 'name' && sort !== 'price-asc'
    };
    this.catalog.products(query).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load products');
      }
    });
  }

  onCategoryChange(event: Event): void {
    this.categoryId.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  toggleFeatured(event: Event): void {
    this.featuredOnly.set((event.target as HTMLInputElement).checked);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  async remove(product: ProductSummary): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete product',
      message: `“${product.name}” will be removed from the catalog. This can be restored by a database administrator.`,
      confirmText: 'Delete product',
      danger: true
    });
    if (!ok) return;
    this.catalog.deleteProduct(product.id).subscribe({
      next: () => {
        this.toast.success('Product deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete product')
    });
  }

  toggleActive(product: ProductSummary): void {
    this.updateFlag(product, 'isActive');
  }

  toggleFeaturedProduct(product: ProductSummary): void {
    this.updateFlag(product, 'isFeatured');
  }

  stockClass(product: ProductSummary): string {
    if (product.totalStock <= 0) return 'badge-danger';
    if (product.totalStock <= 10) return 'badge-warning';
    return 'badge-success';
  }

  private updateFlag(product: ProductSummary, field: 'isActive' | 'isFeatured'): void {
    if (this.busyId()) return;
    this.busyId.set(product.id);
    this.catalog.product(product.id, true).subscribe({
      next: (detail) => {
        const request = this.toRequest(detail);
        request[field] = !detail[field];
        this.catalog.updateProduct(product.id, request).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success(field === 'isActive' ? 'Visibility updated' : 'Featured status updated');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(err?.error?.message ?? 'Unable to update product');
          }
        });
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(err?.error?.message ?? 'Unable to load product');
      }
    });
  }

  private toRequest(detail: ProductDetail): ProductRequest {
    return {
      name: detail.name,
      sku: detail.sku,
      shortDescription: detail.shortDescription,
      description: detail.description,
      categoryId: detail.categoryId ?? '',
      brandId: detail.brandId,
      price: detail.price,
      discountPrice: detail.discountPrice,
      stock: detail.stock,
      lowStockThreshold: detail.lowStockThreshold,
      images: detail.images,
      thumbnailUrl: detail.thumbnailUrl,
      specifications: detail.specifications,
      variants: detail.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        attributes: variant.attributes,
        imageUrl: variant.imageUrl
      })),
      tags: detail.tags,
      isFeatured: detail.isFeatured,
      isActive: detail.isActive,
      seoTitle: detail.seoTitle,
      seoDescription: detail.seoDescription
    };
  }
}
