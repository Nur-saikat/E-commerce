import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, of, takeUntil } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ReviewService } from '../../core/services/review.service';
import { ContentService, RecentlyViewedService } from '../../core/services/content.service';
import { ProductDetail, ProductVariant, ReviewList } from '../../core/models/api.models';
import { Breadcrumb, Crumb } from '../../shared/components/breadcrumb/breadcrumb';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { RatingStars } from '../../shared/components/rating-stars/rating-stars';
import { Icon } from '../../shared/components/icon/icon';
import { Spinner } from '../../shared/components/spinner/spinner';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

type Tab = 'description' | 'specifications' | 'reviews';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    Breadcrumb,
    ProductCard,
    RatingStars,
    Icon,
    Spinner,
    EmptyState,
    AssetUrlPipe,
    MoneyPipe
  ],
  template: `
    <div class="container-luxe py-6">
      @if (loading()) {
        <div class="grid gap-8 lg:grid-cols-2">
          <div class="skeleton aspect-square rounded-3xl"></div>
          <div class="space-y-4 py-6">
            <div class="skeleton h-4 w-24 rounded"></div>
            <div class="skeleton h-10 w-3/4 rounded"></div>
            <div class="skeleton h-6 w-32 rounded"></div>
            <div class="skeleton h-24 w-full rounded"></div>
          </div>
        </div>
      } @else if (product(); as item) {
        <app-breadcrumb [items]="crumbs()" />

        <div class="mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <div
              class="relative aspect-square overflow-hidden rounded-3xl bg-sand"
              (mouseenter)="zoomed.set(true)"
              (mouseleave)="zoomed.set(false)"
              (mousemove)="onZoom($event)"
            >
              <img
                [src]="activeImage() | assetUrl"
                [alt]="item.name"
                class="h-full w-full object-cover transition-transform duration-300"
                [style.transform-origin]="origin()"
                [class.scale-150]="zoomed()"
              />
              @if (item.discountPercent > 0) {
                <span class="absolute left-4 top-4 badge bg-ink-900 text-cream">−{{ item.discountPercent }}%</span>
              }
              <span class="absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-ink-500 backdrop-blur sm:flex">
                <app-icon name="zoom-in" [size]="13" /> Hover to zoom
              </span>
            </div>
            @if (gallery().length > 1) {
              <div class="mt-3 grid grid-cols-5 gap-3">
                @for (image of gallery(); track image; let i = $index) {
                  <button
                    type="button"
                    class="aspect-square overflow-hidden rounded-xl border-2 bg-sand transition"
                    [class]="activeImage() === image ? 'border-ink-900' : 'border-transparent hover:border-ink-300'"
                    (click)="activeImage.set(image)"
                    [attr.aria-label]="'View image ' + (i + 1)"
                  >
                    <img [src]="image | assetUrl" [alt]="item.name + ' view ' + (i + 1)" class="h-full w-full object-cover" />
                  </button>
                }
              </div>
            }
          </div>

          <div class="lg:py-2">
            <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">
              @if (item.brandName) {
                <span>{{ item.brandName }}</span>
                <span class="text-ink-300">·</span>
              }
              <a routerLink="/products" class="hover:text-ink-700">{{ item.categoryName }}</a>
            </div>
            <h1 class="mt-2 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">{{ item.name }}</h1>

            <div class="mt-3 flex flex-wrap items-center gap-4">
              <app-rating-stars [value]="item.ratingAverage" [count]="item.reviewCount || null" [size]="16" [showValue]="true" />
              <button type="button" class="text-xs font-medium text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline" (click)="openReviews()">
                Read {{ item.reviewCount }} {{ item.reviewCount === 1 ? 'review' : 'reviews' }}
              </button>
              <span class="text-xs text-ink-400">SKU {{ item.sku }}</span>
            </div>

            <div class="mt-5 flex flex-wrap items-end gap-3">
              <span class="text-3xl font-semibold text-ink-900">{{ effectivePrice() | money }}</span>
              @if (item.discountPrice) {
                <span class="text-base text-ink-400 line-through">{{ item.price | money }}</span>
                <span class="badge-gold">Save {{ (item.price - item.effectivePrice) | money }}</span>
              }
            </div>

            <p class="mt-4 text-sm leading-relaxed text-ink-600">{{ item.shortDescription || item.description }}</p>

            <div class="mt-5 flex items-center gap-2 text-sm">
              @if (availableStock() > 0) {
                <span class="flex items-center gap-2 font-medium text-emerald-700">
                  <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                  In stock
                  @if (availableStock() <= 5) {
                    <span class="text-danger">— only {{ availableStock() }} left</span>
                  }
                </span>
              } @else {
                <span class="flex items-center gap-2 font-medium text-danger">
                  <span class="h-2 w-2 rounded-full bg-danger"></span> Currently sold out
                </span>
              }
              <span class="text-ink-300">·</span>
              <span class="text-ink-500">{{ item.soldCount }} sold</span>
            </div>

            @if (item.variants.length) {
              <div class="mt-6">
                <div class="flex items-center justify-between">
                  <p class="label !mb-0">Choose an option</p>
                  @if (selectedVariant()) {
                    <span class="text-xs text-ink-500">{{ selectedVariant()!.sku }}</span>
                  }
                </div>
                <div class="mt-2.5 flex flex-wrap gap-2">
                  @for (variant of item.variants; track variant.id) {
                    <button
                      type="button"
                      class="rounded-xl border px-4 py-2.5 text-left text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
                      [class]="selectedVariant()?.id === variant.id ? 'border-ink-900 bg-ink-900 text-cream' : 'border-ink-200 bg-white text-ink-700 hover:border-ink-500'"
                      [disabled]="variant.stock <= 0"
                      (click)="selectVariant(variant)"
                    >
                      <span class="block font-medium">{{ variant.name }}</span>
                      <span class="mt-0.5 block text-[11px] opacity-70">
                        {{ variant.price | money }}{{ variant.stock <= 0 ? ' · sold out' : '' }}
                      </span>
                    </button>
                  }
                </div>
              </div>
            }

            <div class="mt-7 flex flex-wrap items-stretch gap-3">
              <div class="flex h-12 items-center rounded-full border border-ink-200 bg-white">
                <button type="button" class="flex h-full w-11 items-center justify-center text-ink-600 transition hover:text-ink-900 disabled:opacity-30" [disabled]="quantity() <= 1" (click)="decrement()" aria-label="Decrease quantity">
                  <app-icon name="minus" [size]="15" />
                </button>
                <span class="w-8 text-center text-sm font-semibold text-ink-900">{{ quantity() }}</span>
                <button type="button" class="flex h-full w-11 items-center justify-center text-ink-600 transition hover:text-ink-900 disabled:opacity-30" [disabled]="quantity() >= availableStock()" (click)="increment()" aria-label="Increase quantity">
                  <app-icon name="plus" [size]="15" />
                </button>
              </div>
              <button type="button" class="btn-primary h-12 min-w-44 flex-1 sm:flex-none" [disabled]="availableStock() <= 0 || adding()" (click)="addToCart()">
                @if (adding()) {
                  <app-spinner />
                } @else {
                  <app-icon name="bag" [size]="17" />
                  {{ availableStock() > 0 ? 'Add to bag' : 'Sold out' }}
                }
              </button>
              <button
                type="button"
                class="flex h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:border-ink-900 hover:text-danger"
                (click)="toggleWishlist()"
                [attr.aria-label]="inWishlist() ? 'Remove from wishlist' : 'Add to wishlist'"
              >
                <app-icon name="heart" [size]="18" [filled]="inWishlist()" />
              </button>
              <button type="button" class="flex h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:border-ink-900 hover:text-ink-900" (click)="share()" aria-label="Share product">
                <app-icon name="share" [size]="17" />
              </button>
            </div>

            @if (added()) {
              <a routerLink="/cart" class="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <span class="flex items-center gap-2"><app-icon name="check-circle" [size]="16" /> Added to your bag</span>
                <span class="flex items-center gap-1 font-semibold">View bag <app-icon name="arrow-right" [size]="14" /></span>
              </a>
            }

            <div class="mt-7 grid grid-cols-2 gap-3 border-t border-ink-100 pt-6 text-xs text-ink-600">
              <div class="flex items-start gap-2.5">
                <app-icon name="truck" [size]="17" class="mt-0.5 text-gold-600" />
                <div><p class="font-semibold text-ink-800">Free delivery</p><p class="mt-0.5 text-ink-500">On orders over {{ (content.settings()?.freeShippingThreshold ?? 150) | money }}</p></div>
              </div>
              <div class="flex items-start gap-2.5">
                <app-icon name="rotate-ccw" [size]="17" class="mt-0.5 text-gold-600" />
                <div><p class="font-semibold text-ink-800">30-day returns</p><p class="mt-0.5 text-ink-500">Unworn, with tags</p></div>
              </div>
              <div class="flex items-start gap-2.5">
                <app-icon name="shield" [size]="17" class="mt-0.5 text-gold-600" />
                <div><p class="font-semibold text-ink-800">Secure checkout</p><p class="mt-0.5 text-ink-500">Encrypted payments</p></div>
              </div>
              <div class="flex items-start gap-2.5">
                <app-icon name="headphones" [size]="17" class="mt-0.5 text-gold-600" />
                <div><p class="font-semibold text-ink-800">Need a hand?</p><p class="mt-0.5 text-ink-500">Talk to a real person</p></div>
              </div>
            </div>
          </div>
        </div>

        <section class="mt-14 border-t border-ink-100 pt-8">
          <div class="flex flex-wrap gap-1 border-b border-ink-100">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                class="relative px-4 py-3 text-sm font-medium transition"
                [class]="activeTab() === tab.key ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'"
                (click)="activeTab.set(tab.key)"
              >
                {{ tab.label }}
                @if (activeTab() === tab.key) {
                  <span class="absolute inset-x-3 -bottom-px h-0.5 bg-gold-500"></span>
                }
              </button>
            }
          </div>

          <div class="py-7">
            @switch (activeTab()) {
              @case ('description') {
                <div class="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
                  <div class="prose prose-sm max-w-none text-sm leading-7 text-ink-600">
                    <p class="whitespace-pre-line">{{ item.description }}</p>
                    @if (item.tags.length) {
                      <div class="mt-5 flex flex-wrap gap-2">
                        @for (tag of item.tags; track tag) {
                          <span class="rounded-full bg-sand px-3 py-1 text-xs text-ink-600">{{ tag }}</span>
                        }
                      </div>
                    }
                  </div>
                  <div class="rounded-2xl bg-sand/60 p-5">
                    <h3 class="font-display text-lg font-semibold text-ink-900">Details</h3>
                    <dl class="mt-3 space-y-2.5 text-sm">
                      <div class="flex justify-between gap-4"><dt class="text-ink-500">SKU</dt><dd class="font-medium text-ink-800">{{ item.sku }}</dd></div>
                      <div class="flex justify-between gap-4"><dt class="text-ink-500">Category</dt><dd class="font-medium text-ink-800">{{ item.categoryName || '—' }}</dd></div>
                      <div class="flex justify-between gap-4"><dt class="text-ink-500">Brand</dt><dd class="font-medium text-ink-800">{{ item.brandName || 'Safwan' }}</dd></div>
                      <div class="flex justify-between gap-4"><dt class="text-ink-500">Availability</dt><dd class="font-medium text-ink-800">{{ availableStock() }} in stock</dd></div>
                    </dl>
                  </div>
                </div>
              }
              @case ('specifications') {
                @if (specs().length) {
                  <div class="max-w-3xl overflow-hidden rounded-2xl border border-ink-100">
                    <table class="table-luxe">
                      <tbody>
                        @for (spec of specs(); track spec.key) {
                          <tr>
                            <th class="w-1/3 bg-ink-50/50 !text-left !text-xs !font-semibold !normal-case !tracking-normal !text-ink-600">{{ spec.key }}</th>
                            <td>{{ spec.value }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-ink-500">Detailed specifications are not available for this piece.</p>
                }
              }
              @case ('reviews') {
                <div class="grid gap-10 lg:grid-cols-[320px_1fr]">
                  <div>
                    <div class="rounded-2xl border border-ink-100 bg-white p-6">
                      <div class="flex items-center gap-4">
                        <span class="font-display text-5xl font-semibold text-ink-900">{{ (reviews()?.summary?.average ?? 0).toFixed(1) }}</span>
                        <div>
                          <app-rating-stars [value]="reviews()?.summary?.average ?? 0" [size]="16" />
                          <p class="mt-1 text-xs text-ink-500">{{ reviews()?.summary?.total ?? 0 }} verified reviews</p>
                        </div>
                      </div>
                      <div class="mt-5 space-y-2">
                        @for (star of [5, 4, 3, 2, 1]; track star) {
                          <div class="flex items-center gap-2 text-xs">
                            <span class="w-3 text-ink-500">{{ star }}</span>
                            <app-icon name="star" [size]="11" [filled]="true" class="text-gold-500" />
                            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                              <div class="h-full rounded-full bg-gold-500" [style.width.%]="starPercent(star)"></div>
                            </div>
                            <span class="w-6 text-right text-ink-400">{{ reviews()?.summary?.distribution?.[star] ?? 0 }}</span>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="mt-4 rounded-2xl border border-ink-100 bg-white p-6">
                      <h3 class="font-display text-lg font-semibold text-ink-900">Share your thoughts</h3>
                      @if (auth.isAuthenticated()) {
                        <form [formGroup]="reviewForm" (ngSubmit)="submitReview()" class="mt-3 space-y-3">
                          <div class="flex items-center gap-1">
                            @for (star of [1, 2, 3, 4, 5]; track star) {
                              <button type="button" (click)="setRating(star)" [attr.aria-label]="star + ' stars'">
                                <app-icon name="star" [size]="22" [filled]="star <= rating()" [class]="star <= rating() ? 'text-gold-500' : 'text-ink-300'" />
                              </button>
                            }
                          </div>
                          <input formControlName="title" type="text" placeholder="Headline (optional)" class="input !py-2.5 text-sm" />
                          <textarea formControlName="comment" rows="3" placeholder="What did you love? What should others know?" class="input text-sm"></textarea>
                          @if (reviewForm.controls.comment.touched && reviewForm.controls.comment.invalid) {
                            <p class="text-xs text-danger">Please write at least 10 characters.</p>
                          }
                          <button type="submit" class="btn-primary btn-sm w-full" [disabled]="submittingReview()">
                            {{ submittingReview() ? 'Submitting…' : 'Submit review' }}
                          </button>
                          <p class="text-[11px] leading-relaxed text-ink-400">Reviews are moderated before publishing. Verified purchases are marked automatically.</p>
                        </form>
                      } @else {
                        <p class="mt-2 text-sm leading-relaxed text-ink-500">Sign in to leave a review and help other shoppers choose well.</p>
                        <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="btn-outline btn-sm mt-3 w-full">Sign in to review</a>
                      }
                    </div>
                  </div>

                  <div>
                    @if (reviewsLoading()) {
                      <div class="flex items-center justify-center py-16"><app-spinner label="Loading reviews" /></div>
                    } @else if (!reviews()?.reviews?.length) {
                      <app-empty-state icon="message" title="No reviews yet" message="Be the first to share your experience with this piece." />
                    } @else {
                      <div class="space-y-5">
                        @for (review of reviews()!.reviews; track review.id) {
                          <article class="rounded-2xl border border-ink-100 bg-white p-5">
                            <div class="flex items-start justify-between gap-3">
                              <div class="flex items-center gap-3">
                                <span class="flex h-9 w-9 items-center justify-center rounded-full bg-sand text-xs font-bold text-ink-700">{{ review.userName.slice(0, 1) }}</span>
                                <div>
                                  <p class="text-sm font-medium text-ink-900">{{ review.userName }}</p>
                                  <p class="text-[11px] text-ink-400">{{ review.createdAt | date: 'mediumDate' }}</p>
                                </div>
                              </div>
                              @if (review.isVerifiedPurchase) {
                                <span class="badge-success"><app-icon name="badge-check" [size]="12" /> Verified</span>
                              }
                            </div>
                            <div class="mt-3 flex items-center gap-2">
                              <app-rating-stars [value]="review.rating" [size]="13" />
                              @if (review.title) {
                                <p class="text-sm font-semibold text-ink-900">{{ review.title }}</p>
                              }
                            </div>
                            <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ review.comment }}</p>
                          </article>
                        }
                      </div>
                      @if ((reviews()?.pagination?.page ?? 1) < (reviews()?.pagination?.totalPages ?? 1)) {
                        <button type="button" class="btn-outline btn-sm mt-5 w-full" (click)="loadMoreReviews()" [disabled]="reviewsLoading()">
                          Load more reviews
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            }
          </div>
        </section>

        @if (item.relatedProducts.length) {
          <section class="mt-12">
            <div class="mb-6 flex items-end justify-between">
              <div>
                <p class="eyebrow">Complete the look</p>
                <h2 class="section-title mt-2">You may also like</h2>
              </div>
              <a routerLink="/products" class="link-underline text-sm font-medium text-ink-700">Shop all</a>
            </div>
            <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              @for (related of item.relatedProducts.slice(0, 4); track related.id) {
                <app-product-card [product]="related" />
              }
            </div>
          </section>
        }
      }
    </div>
  `
})
export class ProductDetailPage implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly reviewsService = inject(ReviewService);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly recentlyViewed = inject(RecentlyViewedService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly content = inject(ContentService);

  readonly product = signal<ProductDetail | null>(null);
  readonly loading = signal(true);
  readonly activeImage = signal('');
  readonly selectedVariant = signal<ProductVariant | null>(null);
  readonly quantity = signal(1);
  readonly adding = signal(false);
  readonly added = signal(false);
  readonly zoomed = signal(false);
  readonly origin = signal('50% 50%');
  readonly activeTab = signal<Tab>('description');
  readonly reviews = signal<ReviewList | null>(null);
  readonly reviewsLoading = signal(false);
  readonly submittingReview = signal(false);
  readonly rating = signal(5);
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'description', label: 'Description' },
    { key: 'specifications', label: 'Specifications' },
    { key: 'reviews', label: 'Reviews' }
  ];

  readonly reviewForm = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10)] })
  });

  private readonly destroy$ = new Subject<void>();

  readonly gallery = computed(() => {
    const item = this.product();
    if (!item) return [];
    const images = [...item.images];
    if (!images.length && item.thumbnailUrl) images.push(item.thumbnailUrl);
    return images;
  });

  readonly effectivePrice = computed(() => {
    const variant = this.selectedVariant();
    const item = this.product();
    return variant?.price ?? item?.effectivePrice ?? 0;
  });

  readonly availableStock = computed(() => {
    const variant = this.selectedVariant();
    const item = this.product();
    return variant?.stock ?? item?.stock ?? 0;
  });

  readonly inWishlist = computed(() => {
    const item = this.product();
    return item ? this.wishlist.has(item.id) : false;
  });

  readonly specs = computed(() => Object.entries(this.product()?.specifications ?? {}).map(([key, value]) => ({ key, value })));

  readonly crumbs = computed<Crumb[]>(() => {
    const item = this.product();
    const crumbs: Crumb[] = [{ label: 'Shop', link: '/products' }];
    if (item?.categoryName) crumbs.push({ label: item.categoryName, link: item.categoryId ? '/products' : undefined });
    crumbs.push({ label: item?.name ?? 'Product' });
    return crumbs;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.load(slug);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private load(slug: string): void {
    this.loading.set(true);
    this.product.set(null);
    this.reviews.set(null);
    this.added.set(false);
    this.activeTab.set('description');
    this.catalog
      .product(slug)
      .pipe(catchError(() => of(null)))
      .subscribe((item) => {
        this.loading.set(false);
        if (!item) return;
        this.product.set(item);
        this.activeImage.set(item.images[0] ?? item.thumbnailUrl ?? '');
        this.selectedVariant.set(item.variants.find((v) => v.stock > 0) ?? item.variants[0] ?? null);
        this.quantity.set(1);
        this.recentlyViewed.add(item);
        if (this.auth.isAuthenticated()) this.wishlist.get().subscribe({ error: () => undefined });
        this.loadReviews(item.id, 1, false);
      });
  }

  loadReviews(productId: string, page: number, append: boolean): void {
    this.reviewsLoading.set(true);
    this.reviewsService.forProduct(productId, page, 6).subscribe({
      next: (result) => {
        this.reviewsLoading.set(false);
        if (!append) {
          this.reviews.set(result);
        } else {
          const current = this.reviews();
          this.reviews.set({
            summary: result.summary,
            pagination: result.pagination,
            reviews: [...(current?.reviews ?? []), ...result.reviews]
          });
        }
      },
      error: () => this.reviewsLoading.set(false)
    });
  }

  loadMoreReviews(): void {
    const item = this.product();
    const nextPage = (this.reviews()?.pagination?.page ?? 1) + 1;
    if (item) this.loadReviews(item.id, nextPage, true);
  }

  openReviews(): void {
    this.activeTab.set('reviews');
    if (!this.reviews()) {
      const item = this.product();
      if (item) this.loadReviews(item.id, 1, false);
    }
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
    this.quantity.set(1);
    if (variant.imageUrl) this.activeImage.set(variant.imageUrl);
  }

  increment(): void {
    this.quantity.update((q) => Math.min(q + 1, Math.max(1, this.availableStock())));
  }

  decrement(): void {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  addToCart(): void {
    const item = this.product();
    if (!item) return;
    this.adding.set(true);
    this.cart
      .add({ productId: item.id, variantId: this.selectedVariant()?.id ?? null, quantity: this.quantity() })
      .subscribe({
        next: () => {
          this.adding.set(false);
          this.added.set(true);
          this.toast.success(`${item.name} added to bag`);
        },
        error: () => this.adding.set(false)
      });
  }

  toggleWishlist(): void {
    const item = this.product();
    if (!item) return;
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.inWishlist()) {
      this.wishlist.remove(item.id).subscribe({ next: () => this.toast.info('Removed from wishlist') });
    } else {
      this.wishlist.add(item.id).subscribe({ next: () => this.toast.success('Saved to wishlist') });
    }
  }

  share(): void {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => this.toast.success('Product link copied'));
    } else {
      this.toast.info(url);
    }
  }

  onZoom(event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.origin.set(`${x}% ${y}%`);
  }

  starPercent(star: number): number {
    const summary = this.reviews()?.summary;
    if (!summary || !summary.total) return 0;
    return ((summary.distribution?.[star] ?? 0) / summary.total) * 100;
  }

  setRating(star: number): void {
    this.rating.set(star);
  }

  submitReview(): void {
    const item = this.product();
    if (!item) return;
    this.reviewForm.markAllAsTouched();
    if (this.reviewForm.invalid) return;
    this.submittingReview.set(true);
    this.reviewsService
      .create(item.id, {
        rating: this.rating(),
        title: this.reviewForm.controls.title.value || null,
        comment: this.reviewForm.controls.comment.value
      })
      .subscribe({
        next: () => {
          this.submittingReview.set(false);
          this.toast.success('Thank you — your review is awaiting moderation.');
          this.reviewForm.reset();
          this.rating.set(5);
        },
        error: () => this.submittingReview.set(false)
      });
  }
}
