import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, combineLatest, of, takeUntil } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { ToastService } from '../../core/services/toast.service';
import {
  Brand,
  Category,
  FilterOptions,
  PaginationMeta,
  ProductQuery,
  ProductSummary
} from '../../core/models/api.models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { Breadcrumb, Crumb } from '../../shared/components/breadcrumb/breadcrumb';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Icon } from '../../shared/components/icon/icon';
import { RatingStars } from '../../shared/components/rating-stars/rating-stars';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { CartService } from '../../core/services/cart.service';

interface ListState {
  page: number;
  pageSize: number;
  search: string;
  categorySlug: string | null;
  brandSlug: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  colors: string[];
  sizes: string[];
  minRating: number | null;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  sort: string;
}

interface SectionState {
  category: boolean;
  brand: boolean;
  price: boolean;
  color: boolean;
  size: boolean;
  rating: boolean;
}

const SORTS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'popular', label: 'Best selling' },
  { value: 'name', label: 'Alphabetical' }
];

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ProductCard,
    Breadcrumb,
    EmptyState,
    Pagination,
    Icon,
    RatingStars,
    AssetUrlPipe,
    MoneyPipe
  ],
  template: `
    <div class="border-b border-ink-100 bg-white">
      <div class="container-luxe py-8 sm:py-10">
        <app-breadcrumb [items]="crumbs()" />
        <div class="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 class="font-display text-3xl font-semibold text-ink-900 sm:text-4xl">{{ heading() }}</h1>
            <p class="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">{{ subheading() }}</p>
          </div>
          <p class="text-xs font-medium uppercase tracking-widest text-ink-400">
            {{ pagination().totalItems }} {{ pagination().totalItems === 1 ? 'piece' : 'pieces' }}
          </p>
        </div>
      </div>
    </div>

    <div class="container-luxe py-8">
      <div class="flex gap-8">
        <aside class="hidden w-64 flex-none lg:block">
          <div class="sticky top-24 space-y-7">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink-900">Refine</h2>
              @if (hasActiveFilters()) {
                <button type="button" class="text-xs font-medium text-gold-600 hover:text-gold-500" (click)="clearFilters()">Clear all</button>
              }
            </div>

            <div>
              <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('category')">
                Category <app-icon [name]="sections().category ? 'minus' : 'plus'" [size]="14" />
              </button>
              @if (sections().category) {
                <div class="mt-3 space-y-1">
                  <button
                    type="button"
                    class="block w-full rounded-lg px-2 py-1.5 text-left text-sm transition"
                    [class]="!state().categorySlug ? 'bg-ink-900 text-cream' : 'text-ink-600 hover:bg-ink-50'"
                    (click)="selectCategory(null)"
                  >
                    All categories
                  </button>
                  @for (category of categories(); track category.id) {
                    <button
                      type="button"
                      class="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition"
                      [class]="state().categorySlug === category.slug ? 'bg-ink-900 text-cream' : 'text-ink-600 hover:bg-ink-50'"
                      (click)="selectCategory(category.slug)"
                    >
                      <span>{{ category.name }}</span>
                      <span class="text-[11px]" [class]="state().categorySlug === category.slug ? 'text-cream/60' : 'text-ink-400'">{{ category.productCount }}</span>
                    </button>
                  }
                </div>
              }
            </div>

            <div>
              <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('brand')">
                Brand <app-icon [name]="sections().brand ? 'minus' : 'plus'" [size]="14" />
              </button>
              @if (sections().brand) {
                <div class="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  @for (brand of brands(); track brand.id) {
                    <label class="flex cursor-pointer items-center gap-2 text-sm text-ink-600">
                      <input type="checkbox" class="h-3.5 w-3.5 rounded border-ink-300 text-ink-900 focus:ring-gold-500" [checked]="state().brandSlug === brand.slug" (change)="toggleBrand(brand.slug)" />
                      <span class="flex-1">{{ brand.name }}</span>
                      <span class="text-[11px] text-ink-400">{{ brand.productCount }}</span>
                    </label>
                  }
                </div>
              }
            </div>

            <div>
              <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('price')">
                Price <app-icon [name]="sections().price ? 'minus' : 'plus'" [size]="14" />
              </button>
              @if (sections().price) {
                <div class="mt-3">
                  <div class="flex items-center gap-2">
                    <input [formControl]="minPrice" type="number" min="0" placeholder="{{ options()?.minPrice ?? 0 }}" class="input !py-2 text-xs" aria-label="Minimum price" />
                    <span class="text-ink-300">–</span>
                    <input [formControl]="maxPrice" type="number" min="0" placeholder="{{ options()?.maxPrice ?? 0 }}" class="input !py-2 text-xs" aria-label="Maximum price" />
                  </div>
                  <button type="button" class="btn-outline btn-sm mt-2 w-full" (click)="applyPrice()">Apply range</button>
                </div>
              }
            </div>

            @if (options()?.colors?.length) {
              <div>
                <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('color')">
                  Colour <app-icon [name]="sections().color ? 'minus' : 'plus'" [size]="14" />
                </button>
                @if (sections().color) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (color of options()!.colors; track color) {
                      <button
                        type="button"
                        class="rounded-full border px-3 py-1.5 text-xs transition"
                        [class]="state().colors.includes(color) ? 'border-ink-900 bg-ink-900 text-cream' : 'border-ink-200 text-ink-600 hover:border-ink-400'"
                        (click)="toggleColor(color)"
                      >
                        {{ color }}
                      </button>
                    }
                  </div>
                }
              </div>
            }

            @if (options()?.sizes?.length) {
              <div>
                <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('size')">
                  Size <app-icon [name]="sections().size ? 'minus' : 'plus'" [size]="14" />
                </button>
                @if (sections().size) {
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (size of options()!.sizes; track size) {
                      <button
                        type="button"
                        class="min-w-10 rounded-lg border px-2.5 py-1.5 text-xs transition"
                        [class]="state().sizes.includes(size) ? 'border-ink-900 bg-ink-900 text-cream' : 'border-ink-200 text-ink-600 hover:border-ink-400'"
                        (click)="toggleSize(size)"
                      >
                        {{ size }}
                      </button>
                    }
                  </div>
                }
              </div>
            }

            <div>
              <button type="button" class="flex w-full items-center justify-between py-1 text-xs font-semibold uppercase tracking-wider text-ink-700" (click)="toggleSection('rating')">
                Rating <app-icon [name]="sections().rating ? 'minus' : 'plus'" [size]="14" />
              </button>
              @if (sections().rating) {
                <div class="mt-3 space-y-1">
                  @for (rating of [4, 3, 2, 1]; track rating) {
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition"
                      [class]="state().minRating === rating ? 'bg-ink-900 text-cream' : 'text-ink-600 hover:bg-ink-50'"
                      (click)="setRating(rating)"
                    >
                      <app-rating-stars [value]="rating" [size]="12" [showValue]="false" />
                      <span class="text-xs">& up</span>
                    </button>
                  }
                </div>
              }
            </div>

            <div class="space-y-2 border-t border-ink-100 pt-4">
              <label class="flex cursor-pointer items-center justify-between text-sm text-ink-600">
                In stock only
                <input type="checkbox" class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" [checked]="state().inStock" (change)="toggleFlag('inStock')" />
              </label>
              <label class="flex cursor-pointer items-center justify-between text-sm text-ink-600">
                On sale
                <input type="checkbox" class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" [checked]="state().onSale" (change)="toggleFlag('onSale')" />
              </label>
              <label class="flex cursor-pointer items-center justify-between text-sm text-ink-600">
                Featured only
                <input type="checkbox" class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" [checked]="state().featured" (change)="toggleFlag('featured')" />
              </label>
            </div>
          </div>
        </aside>

        <div class="min-w-0 flex-1">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button type="button" class="btn-outline btn-sm lg:hidden" (click)="mobileFilters.set(true)">
                <app-icon name="sliders" [size]="15" /> Filters
                @if (activeFilterCount() > 0) {
                  <span class="flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-900 px-1 text-[10px] text-cream">{{ activeFilterCount() }}</span>
                }
              </button>
              <div class="relative">
                <select
                  class="h-9 appearance-none rounded-full border border-ink-200 bg-white pl-4 pr-9 text-xs font-medium text-ink-700 focus:border-gold-500 focus:outline-none"
                  [value]="state().sort"
                  (change)="setSort($any($event.target).value)"
                  aria-label="Sort products"
                >
                  @for (sort of sorts; track sort.value) {
                    <option [value]="sort.value">{{ sort.label }}</option>
                  }
                </select>
                <app-icon name="chevron-down" [size]="14" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
              </div>
              <div class="hidden items-center rounded-full border border-ink-200 bg-white p-0.5 sm:flex">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full"
                  [class]="viewMode() === 'grid' ? 'bg-ink-900 text-cream' : 'text-ink-500'"
                  (click)="viewMode.set('grid')"
                  aria-label="Grid view"
                >
                  <app-icon name="grid" [size]="15" />
                </button>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-full"
                  [class]="viewMode() === 'list' ? 'bg-ink-900 text-cream' : 'text-ink-500'"
                  (click)="viewMode.set('list')"
                  aria-label="List view"
                >
                  <app-icon name="list" [size]="15" />
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="relative">
                <app-icon name="search" [size]="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  [formControl]="searchControl"
                  (keyup.enter)="applySearch()"
                  type="search"
                  placeholder="Search within results"
                  class="h-9 w-44 rounded-full border border-ink-200 bg-white pl-8 pr-3 text-xs focus:border-gold-500 focus:outline-none sm:w-56"
                  aria-label="Search products"
                />
              </div>
              <select
                class="hidden h-9 appearance-none rounded-full border border-ink-200 bg-white pl-4 pr-8 text-xs font-medium text-ink-700 focus:border-gold-500 focus:outline-none sm:block"
                [value]="state().pageSize"
                (change)="setPageSize(+$any($event.target).value)"
                aria-label="Products per page"
              >
                <option value="12">12 / page</option>
                <option value="24">24 / page</option>
                <option value="36">36 / page</option>
              </select>
            </div>
          </div>

          @if (chips().length) {
            <div class="mb-5 flex flex-wrap items-center gap-2">
              @for (chip of chips(); track chip.key) {
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium text-ink-700 transition hover:bg-ink-100"
                  (click)="removeChip(chip)"
                >
                  {{ chip.label }}
                  <app-icon name="x" [size]="12" />
                </button>
              }
              <button type="button" class="text-xs font-medium text-gold-600 hover:text-gold-500" (click)="clearFilters()">Clear all</button>
            </div>
          }

          @if (loading()) {
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (item of [1, 2, 3, 4, 5, 6]; track item) {
                <div class="space-y-3">
                  <div class="skeleton aspect-[4/5] rounded-2xl"></div>
                  <div class="skeleton h-3 w-2/3 rounded"></div>
                  <div class="skeleton h-3 w-1/3 rounded"></div>
                </div>
              }
            </div>
          } @else if (products().length === 0) {
            <app-empty-state
              icon="search"
              title="No pieces match those filters"
              message="Try widening your price range, removing a filter, or browsing the full collection."
              actionLabel="Clear filters"
              (action)="clearFilters()"
            />
          } @else if (viewMode() === 'grid') {
            <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              @for (product of products(); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
          } @else {
            <div class="space-y-3">
              @for (product of products(); track product.id) {
                <article class="group flex gap-4 rounded-2xl border border-ink-100 bg-white p-3 transition hover:shadow-[var(--shadow-card)] sm:gap-6 sm:p-4">
                  <a [routerLink]="['/products', product.slug]" class="relative aspect-square w-28 flex-none overflow-hidden rounded-xl bg-sand sm:w-40">
                    <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  </a>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{{ product.brandName || product.categoryName }}</p>
                        <a [routerLink]="['/products', product.slug]" class="mt-1 block truncate font-display text-lg font-semibold text-ink-900 hover:text-gold-600">{{ product.name }}</a>
                        <p class="mt-1 text-xs text-ink-400">SKU {{ product.sku }}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-base font-semibold text-ink-900">{{ product.effectivePrice | money }}</p>
                        @if (product.discountPrice) {
                          <p class="text-xs text-ink-400 line-through">{{ product.price | money }}</p>
                        }
                      </div>
                    </div>
                    <div class="mt-2 flex items-center gap-3">
                      <app-rating-stars [value]="product.ratingAverage" [count]="product.reviewCount || null" [size]="13" />
                      @if (product.totalStock > 0) {
                        <span class="badge-success">In stock</span>
                      } @else {
                        <span class="badge-danger">Sold out</span>
                      }
                    </div>
                    <div class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <p class="text-xs text-ink-500">{{ product.soldCount }} sold · {{ product.totalStock }} available</p>
                      <button type="button" class="btn-primary btn-sm" [disabled]="product.totalStock <= 0" (click)="addToList(product)">
                        <app-icon name="bag" [size]="14" /> Add to bag
                      </button>
                    </div>
                  </div>
                </article>
              }
            </div>
          }

          <div class="mt-8">
            <app-pagination
              [page]="pagination().page"
              [totalPages]="pagination().totalPages"
              [totalItems]="pagination().totalItems"
              [pageSize]="pagination().pageSize"
              (pageChange)="goToPage($event)"
            />
          </div>
        </div>
      </div>
    </div>

    @if (mobileFilters()) {
      <div class="fixed inset-0 z-[70] lg:hidden">
        <div class="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" (click)="mobileFilters.set(false)"></div>
        <div class="absolute inset-y-0 right-0 flex w-[90%] max-w-sm flex-col bg-cream shadow-2xl">
          <div class="flex items-center justify-between border-b border-ink-200 p-5">
            <h2 class="font-display text-xl font-semibold text-ink-900">Filters</h2>
            <button type="button" (click)="mobileFilters.set(false)" aria-label="Close filters">
              <app-icon name="x" [size]="20" />
            </button>
          </div>
          <div class="flex-1 space-y-6 overflow-y-auto p-5">
            <div>
              <p class="label">Category</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="rounded-full border px-3 py-1.5 text-xs" [class]="!state().categorySlug ? 'bg-ink-900 text-cream border-ink-900' : 'border-ink-200 text-ink-600'" (click)="selectCategory(null)">All</button>
                @for (category of categories(); track category.id) {
                  <button type="button" class="rounded-full border px-3 py-1.5 text-xs" [class]="state().categorySlug === category.slug ? 'bg-ink-900 text-cream border-ink-900' : 'border-ink-200 text-ink-600'" (click)="selectCategory(category.slug)">
                    {{ category.name }}
                  </button>
                }
              </div>
            </div>
            <div>
              <p class="label">Brand</p>
              <div class="flex flex-wrap gap-2">
                @for (brand of brands(); track brand.id) {
                  <button type="button" class="rounded-full border px-3 py-1.5 text-xs" [class]="state().brandSlug === brand.slug ? 'bg-ink-900 text-cream border-ink-900' : 'border-ink-200 text-ink-600'" (click)="toggleBrand(brand.slug)">
                    {{ brand.name }}
                  </button>
                }
              </div>
            </div>
            <div>
              <p class="label">Price</p>
              <div class="flex items-center gap-2">
                <input [formControl]="minPrice" type="number" min="0" placeholder="Min" class="input !py-2 text-xs" aria-label="Minimum price" />
                <span class="text-ink-300">–</span>
                <input [formControl]="maxPrice" type="number" min="0" placeholder="Max" class="input !py-2 text-xs" aria-label="Maximum price" />
              </div>
            </div>
            @if (options()?.colors?.length) {
              <div>
                <p class="label">Colour</p>
                <div class="flex flex-wrap gap-2">
                  @for (color of options()!.colors; track color) {
                    <button type="button" class="rounded-full border px-3 py-1.5 text-xs" [class]="state().colors.includes(color) ? 'bg-ink-900 text-cream border-ink-900' : 'border-ink-200 text-ink-600'" (click)="toggleColor(color)">{{ color }}</button>
                  }
                </div>
              </div>
            }
            @if (options()?.sizes?.length) {
              <div>
                <p class="label">Size</p>
                <div class="flex flex-wrap gap-2">
                  @for (size of options()!.sizes; track size) {
                    <button type="button" class="min-w-10 rounded-lg border px-2.5 py-1.5 text-xs" [class]="state().sizes.includes(size) ? 'bg-ink-900 text-cream border-ink-900' : 'border-ink-200 text-ink-600'" (click)="toggleSize(size)">{{ size }}</button>
                  }
                </div>
              </div>
            }
            <div class="space-y-2">
              <label class="flex items-center justify-between text-sm text-ink-600">In stock only
                <input type="checkbox" class="h-4 w-4 rounded border-ink-300" [checked]="state().inStock" (change)="toggleFlag('inStock')" />
              </label>
              <label class="flex items-center justify-between text-sm text-ink-600">On sale
                <input type="checkbox" class="h-4 w-4 rounded border-ink-300" [checked]="state().onSale" (change)="toggleFlag('onSale')" />
              </label>
            </div>
          </div>
          <div class="flex gap-2 border-t border-ink-200 p-4">
            <button type="button" class="btn-outline flex-1" (click)="clearFilters(); mobileFilters.set(false)">Clear</button>
            <button type="button" class="btn-primary flex-1" (click)="applyPrice(); mobileFilters.set(false)">Show results</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ProductListPage implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly toast = inject(ToastService);

  readonly products = signal<ProductSummary[]>([]);
  readonly options = signal<FilterOptions | null>(null);
  readonly loading = signal(true);
  readonly viewMode = signal<'grid' | 'list'>('grid');
  readonly mobileFilters = signal(false);
  readonly sections = signal<SectionState>({ category: true, brand: true, price: true, color: true, size: true, rating: true });
  readonly sorts = SORTS;
  readonly minPrice = new FormControl<number | null>(null);
  readonly maxPrice = new FormControl<number | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly pagination = signal<PaginationMeta>({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  readonly state = signal<ListState>({
    page: 1,
    pageSize: 12,
    search: '',
    categorySlug: null,
    brandSlug: null,
    minPrice: null,
    maxPrice: null,
    colors: [],
    sizes: [],
    minRating: null,
    inStock: false,
    onSale: false,
    featured: false,
    sort: 'newest'
  });

  private readonly destroy$ = new Subject<void>();

  readonly categories = computed(() => this.flatten(this.options()?.categories ?? []));
  readonly brands = computed(() => this.options()?.brands ?? []);

  readonly heading = computed(() => {
    const category = this.categories().find((c) => c.slug === this.state().categorySlug);
    if (category) return category.name;
    if (this.state().search) return `“${this.state().search}”`;
    if (this.state().onSale) return 'The sale room';
    return 'The full collection';
  });

  readonly subheading = computed(() => {
    const category = this.categories().find((c) => c.slug === this.state().categorySlug);
    return (
      category?.description ||
      'Considered pieces for the everyday — designed to be worn, used and kept. Filter the edit to find your next favourite.'
    );
  });

  readonly crumbs = computed<Crumb[]>(() => {
    const category = this.categories().find((c) => c.slug === this.state().categorySlug);
    return category ? [{ label: 'Shop', link: '/products' }, { label: category.name }] : [{ label: 'Shop all' }];
  });

  readonly hasActiveFilters = computed(() => {
    const s = this.state();
    return !!(
      s.categorySlug ||
      s.brandSlug ||
      s.search ||
      s.minPrice !== null ||
      s.maxPrice !== null ||
      s.colors.length ||
      s.sizes.length ||
      s.minRating ||
      s.inStock ||
      s.onSale ||
      s.featured
    );
  });

  readonly activeFilterCount = computed(() => this.chips().length);

  readonly chips = computed(() => {
    const s = this.state();
    const chips: { key: string; label: string; value?: string }[] = [];
    if (s.search) chips.push({ key: 'search', label: `Search: ${s.search}` });
    const category = this.categories().find((c) => c.slug === s.categorySlug);
    if (category) chips.push({ key: 'category', label: category.name });
    const brand = this.brands().find((b) => b.slug === s.brandSlug);
    if (brand) chips.push({ key: 'brand', label: brand.name });
    if (s.minPrice !== null || s.maxPrice !== null) {
      chips.push({ key: 'price', label: `Price: ${s.minPrice ?? 0} – ${s.maxPrice ?? 'any'}` });
    }
    for (const color of s.colors) chips.push({ key: 'color', value: color, label: color });
    for (const size of s.sizes) chips.push({ key: 'size', value: size, label: `Size ${size}` });
    if (s.minRating) chips.push({ key: 'rating', label: `${s.minRating}★ & up` });
    if (s.inStock) chips.push({ key: 'inStock', label: 'In stock' });
    if (s.onSale) chips.push({ key: 'onSale', label: 'On sale' });
    if (s.featured) chips.push({ key: 'featured', label: 'Featured' });
    return chips;
  });

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([params, query]) => {
        const categorySlug = params.get('slug');
        const state: ListState = {
          page: Number(query.get('page') ?? 1) || 1,
          pageSize: Number(query.get('pageSize') ?? 12) || 12,
          search: query.get('search') ?? '',
          categorySlug,
          brandSlug: query.get('brand'),
          minPrice: this.numberOrNull(query.get('minPrice')),
          maxPrice: this.numberOrNull(query.get('maxPrice')),
          colors: query.getAll('color'),
          sizes: query.getAll('size'),
          minRating: this.numberOrNull(query.get('minRating')),
          inStock: query.get('inStock') === 'true',
          onSale: query.get('onSale') === 'true',
          featured: query.get('featured') === 'true',
          sort: query.get('sort') ?? 'newest'
        };
        this.state.set(state);
        this.searchControl.setValue(state.search, { emitEvent: false });
        this.minPrice.setValue(state.minPrice, { emitEvent: false });
        this.maxPrice.setValue(state.maxPrice, { emitEvent: false });
        this.loadFilters(categorySlug);
        this.loadProducts(state);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFilters(categorySlug: string | null): void {
    this.catalog.filters(undefined, categorySlug ?? undefined).subscribe({
      next: (options) => this.options.set(options),
      error: () => undefined
    });
  }

  private loadProducts(state: ListState): void {
    this.loading.set(true);
    const query: ProductQuery = {
      page: state.page,
      pageSize: state.pageSize,
      search: state.search || undefined,
      categorySlug: state.categorySlug ?? undefined,
      brandSlug: state.brandSlug ?? undefined,
      minPrice: state.minPrice ?? undefined,
      maxPrice: state.maxPrice ?? undefined,
      colors: state.colors.length ? state.colors : undefined,
      sizes: state.sizes.length ? state.sizes : undefined,
      minRating: state.minRating ?? undefined,
      inStock: state.inStock || undefined,
      onSale: state.onSale || undefined,
      isFeatured: state.featured || undefined,
      ...this.sortParams(state.sort)
    };

    const request = state.search ? this.catalog.search(query) : this.catalog.products(query);
    request.pipe(catchError(() => of(null))).subscribe((result) => {
      this.loading.set(false);
      if (!result) return;
      this.products.set(result.items);
      this.pagination.set(result.pagination);
    });
  }

  private sortParams(sort: string): { sortBy?: string; descending?: boolean } {
    switch (sort) {
      case 'price-asc':
        return { sortBy: 'price', descending: false };
      case 'price-desc':
        return { sortBy: 'price', descending: true };
      case 'rating':
        return { sortBy: 'rating', descending: true };
      case 'popular':
        return { sortBy: 'popularity', descending: true };
      case 'name':
        return { sortBy: 'name', descending: false };
      default:
        return { sortBy: 'latest', descending: true };
    }
  }

  private flatten(categories: Category[]): Category[] {
    return categories.flatMap((category) => [category, ...this.flatten(category.children ?? [])]);
  }

  private numberOrNull(value: string | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private patch(patch: Record<string, string | number | boolean | string[] | null | undefined>): void {
    const current = { ...this.route.snapshot.queryParams } as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current, ...patch };
    if (!('page' in patch)) next['page'] = 1;
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === undefined || value === '' || value === false) continue;
      if (Array.isArray(value) && value.length === 0) continue;
      cleaned[key] = value;
    }
    this.router.navigate([], { relativeTo: this.route, queryParams: cleaned });
  }

  applySearch(): void {
    this.patch({ search: this.searchControl.value.trim() || null });
  }

  applyPrice(): void {
    this.patch({
      minPrice: this.minPrice.value ?? null,
      maxPrice: this.maxPrice.value ?? null
    });
  }

  selectCategory(slug: string | null): void {
    if (slug) {
      this.router.navigate(['/category', slug], { queryParams: this.cleanQuery(['page']) });
    } else {
      this.router.navigate(['/products'], { queryParams: this.cleanQuery(['page']) });
    }
  }

  toggleBrand(slug: string): void {
    this.patch({ brand: this.state().brandSlug === slug ? null : slug });
  }

  toggleColor(color: string): void {
    this.patch({ color: this.toggle(this.state().colors, color) });
  }

  toggleSize(size: string): void {
    this.patch({ size: this.toggle(this.state().sizes, size) });
  }

  setRating(rating: number): void {
    this.patch({ minRating: this.state().minRating === rating ? null : rating });
  }

  toggleFlag(flag: 'inStock' | 'onSale' | 'featured'): void {
    this.patch({ [flag]: !this.state()[flag] });
  }

  setSort(sort: string): void {
    this.patch({ sort });
  }

  setPageSize(pageSize: number): void {
    this.patch({ pageSize, page: 1 });
  }

  goToPage(page: number): void {
    this.patch({ page });
  }

  removeChip(chip: { key: string; value?: string }): void {
    switch (chip.key) {
      case 'search':
        this.patch({ search: null });
        break;
      case 'category':
        this.selectCategory(null);
        break;
      case 'brand':
        this.patch({ brand: null });
        break;
      case 'price':
        this.patch({ minPrice: null, maxPrice: null });
        break;
      case 'color':
        this.patch({ color: this.state().colors.filter((c) => c !== chip.value) });
        break;
      case 'size':
        this.patch({ size: this.state().sizes.filter((s) => s !== chip.value) });
        break;
      case 'rating':
        this.patch({ minRating: null });
        break;
      case 'inStock':
        this.patch({ inStock: null });
        break;
      case 'onSale':
        this.patch({ onSale: null });
        break;
      case 'featured':
        this.patch({ featured: null });
        break;
    }
  }

  clearFilters(): void {
    this.minPrice.setValue(null);
    this.maxPrice.setValue(null);
    if (this.state().categorySlug) {
      this.router.navigate(['/category', this.state().categorySlug]);
    } else {
      this.router.navigate(['/products']);
    }
  }

  toggleSection(section: keyof SectionState): void {
    this.sections.update((sections) => ({ ...sections, [section]: !sections[section] }));
  }

  addToList(product: ProductSummary): void {
    this.cart.add({ productId: product.id, quantity: 1 }).subscribe({
      next: () => this.toast.success(`${product.name} added to bag`)
    });
  }

  private toggle(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  }

  private cleanQuery(remove: string[]): Record<string, unknown> {
    const query: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.route.snapshot.queryParams)) {
      if (!remove.includes(key)) query[key] = value;
    }
    return query;
  }
}
