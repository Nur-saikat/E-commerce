import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ContentService, RecentlyViewedService } from '../../core/services/content.service';
import { HomeFeed } from '../../core/models/api.models';
import { ProductCard } from '../../shared/components/product-card/product-card';
import { RatingStars } from '../../shared/components/rating-stars/rating-stars';
import { Icon } from '../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [RouterLink, ProductCard, RatingStars, Icon, AssetUrlPipe, MoneyPipe],
  template: `
    @if (loading()) {
      <div class="container-luxe py-10">
        <div class="skeleton h-[440px] w-full rounded-3xl"></div>
      </div>
    } @else if (feed(); as home) {
      @if (heroBanners().length) {
        <section class="container-luxe pt-5 sm:pt-8" aria-label="Featured collections">
          <div class="relative overflow-hidden rounded-3xl bg-ink-900">
            @for (banner of heroBanners(); track banner.id; let i = $index) {
              <div
                class="relative transition-opacity duration-700"
                [class.hidden]="i !== activeBanner()"
                [style.background]="'#12110e'"
              >
                <img
                  [src]="banner.imageUrl | assetUrl"
                  [alt]="banner.title"
                  class="h-[520px] w-full object-cover opacity-80 sm:h-[580px]"
                />
                <div class="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/35 to-transparent"></div>
                <div class="absolute inset-0 flex items-center">
                  <div class="max-w-xl px-6 sm:px-12 lg:px-16">
                    <p class="eyebrow text-gold-300">The Safwan edit</p>
                    <h1 class="mt-4 font-display text-4xl font-medium leading-[1.05] text-cream sm:text-5xl lg:text-6xl">
                      {{ banner.title }}
                    </h1>
                    @if (banner.subtitle) {
                      <p class="mt-4 max-w-md text-sm leading-relaxed text-cream/75 sm:text-base">{{ banner.subtitle }}</p>
                    }
                    <div class="mt-8 flex flex-wrap items-center gap-3">
                      <a [routerLink]="linkPath(banner.linkUrl)" [queryParams]="linkQuery(banner.linkUrl)" class="btn-gold">
                        {{ banner.buttonText || 'Explore the collection' }}
                        <app-icon name="arrow-right" [size]="16" />
                      </a>
                      <a routerLink="/about" class="btn border border-cream/25 text-cream hover:bg-cream/10">Our story</a>
                    </div>
                  </div>
                </div>
              </div>
            }
            @if (heroBanners().length > 1) {
              <div class="absolute bottom-5 left-6 flex items-center gap-2 sm:left-12 lg:left-16">
                @for (banner of heroBanners(); track banner.id; let i = $index) {
                  <button
                    type="button"
                    class="h-1.5 rounded-full transition-all duration-300"
                    [class]="i === activeBanner() ? 'w-8 bg-gold-500' : 'w-2.5 bg-cream/40 hover:bg-cream/70'"
                    (click)="activeBanner.set(i)"
                    [attr.aria-label]="'Go to slide ' + (i + 1)"
                  ></button>
                }
              </div>
            }
          </div>
        </section>
      }

      <section class="border-b border-ink-100 bg-white/60">
        <div class="container-luxe grid grid-cols-2 gap-6 py-7 lg:grid-cols-4">
          @for (value of values; track value.title) {
            <div class="flex items-start gap-3">
              <span class="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sand text-gold-600">
                <app-icon [name]="value.icon" [size]="18" />
              </span>
              <div>
                <p class="text-sm font-semibold text-ink-900">{{ value.title }}</p>
                <p class="mt-0.5 text-xs leading-relaxed text-ink-500">{{ value.text }}</p>
              </div>
            </div>
          }
        </div>
      </section>

      @if (home.categories.length) {
        <section class="container-luxe py-14 sm:py-20">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="eyebrow">Browse by</p>
              <h2 class="section-title mt-2">Shop the departments</h2>
            </div>
            <a routerLink="/products" class="link-underline text-sm font-medium text-ink-700">View everything</a>
          </div>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            @for (category of home.categories; track category.id) {
              <a
                [routerLink]="['/category', category.slug]"
                class="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-sand"
              >
                @if (category.imageUrl) {
                  <img
                    [src]="category.imageUrl | assetUrl"
                    [alt]="category.name"
                    loading="lazy"
                    class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                } @else {
                  <div class="flex h-full w-full items-center justify-center bg-sand">
                    <app-icon name="grid" [size]="28" class="text-ink-300" />
                  </div>
                }
                <div class="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent"></div>
                <div class="absolute inset-x-4 bottom-4">
                  <p class="text-sm font-semibold text-cream">{{ category.name }}</p>
                  <p class="text-[11px] text-cream/60">{{ category.productCount }} pieces</p>
                </div>
              </a>
            }
          </div>
        </section>
      }

      @if (home.featuredProducts.length) {
        <section class="bg-white py-14 sm:py-20">
          <div class="container-luxe">
            <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="eyebrow">Handpicked</p>
                <h2 class="section-title mt-2">The featured edit</h2>
              </div>
              <a routerLink="/products" [queryParams]="{ featured: true }" class="link-underline text-sm font-medium text-ink-700">
                Shop featured
              </a>
            </div>
            <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              @for (product of home.featuredProducts.slice(0, 8); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
          </div>
        </section>
      }

      @if (promoBanner(); as promo) {
        <section class="container-luxe py-14 sm:py-20">
          <div class="grid overflow-hidden rounded-3xl bg-ink-950 lg:grid-cols-2">
            <div class="relative min-h-[320px]">
              <img
                [src]="promo.imageUrl | assetUrl"
                [alt]="promo.title"
                class="absolute inset-0 h-full w-full object-cover opacity-85"
              />
            </div>
            <div class="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
              <p class="eyebrow text-gold-400">Limited edit</p>
              <h2 class="mt-3 font-display text-3xl font-medium text-cream sm:text-4xl">{{ promo.title }}</h2>
              @if (promo.subtitle) {
                <p class="mt-4 max-w-md text-sm leading-relaxed text-cream/65">{{ promo.subtitle }}</p>
              }
              <div class="mt-8">
                <a [routerLink]="linkPath(promo.linkUrl)" [queryParams]="linkQuery(promo.linkUrl)" class="btn-gold">
                  {{ promo.buttonText || 'Discover the edit' }}
                  <app-icon name="arrow-right" [size]="16" />
                </a>
              </div>
            </div>
          </div>
        </section>
      }

      @if (home.deals.length) {
        <section class="container-luxe py-14 sm:py-20">
          <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p class="eyebrow text-danger">Reduced to clear</p>
              <h2 class="section-title mt-2">The sale room</h2>
            </div>
            <a routerLink="/products" [queryParams]="{ onSale: true }" class="btn-outline btn-sm">Shop all offers</a>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            @for (product of home.deals.slice(0, 4); track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>
      }

      @if (home.newArrivals.length) {
        <section class="bg-sand/60 py-14 sm:py-20">
          <div class="container-luxe">
            <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p class="eyebrow">Just landed</p>
                <h2 class="section-title mt-2">New arrivals</h2>
              </div>
              <a routerLink="/products" [queryParams]="{ sort: 'newest' }" class="link-underline text-sm font-medium text-ink-700">
                See what's new
              </a>
            </div>
            <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              @for (product of home.newArrivals.slice(0, 4); track product.id) {
                <app-product-card [product]="product" />
              }
            </div>
          </div>
        </section>
      }

      <section class="container-luxe grid gap-4 py-14 sm:py-20 lg:grid-cols-2">
        @if (home.bestSellers.length) {
          <div class="rounded-3xl border border-ink-100 bg-white p-5 sm:p-7">
            <div class="mb-5 flex items-center justify-between">
              <div>
                <p class="eyebrow">Loved by many</p>
                <h2 class="mt-1.5 font-display text-2xl font-semibold text-ink-900">Best sellers</h2>
              </div>
              <a routerLink="/products" [queryParams]="{ sort: 'popular' }" class="text-xs font-medium text-ink-500 hover:text-ink-900">All</a>
            </div>
            <div class="space-y-1">
              @for (product of home.bestSellers.slice(0, 4); track product.id; let i = $index) {
                <a [routerLink]="['/products', product.slug]" class="flex items-center gap-3 rounded-xl p-2 transition hover:bg-ink-50">
                  <span class="w-4 text-center font-display text-sm text-gold-600">{{ i + 1 }}</span>
                  <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-ink-900">{{ product.name }}</span>
                    <app-rating-stars [value]="product.ratingAverage" [count]="product.reviewCount || null" [size]="12" />
                  </span>
                  <span class="text-sm font-semibold text-ink-900">{{ product.effectivePrice | money }}</span>
                </a>
              }
            </div>
          </div>
        }
        @if (home.trendingProducts.length) {
          <div class="rounded-3xl border border-ink-100 bg-white p-5 sm:p-7">
            <div class="mb-5 flex items-center justify-between">
              <div>
                <p class="eyebrow">Moving fast</p>
                <h2 class="mt-1.5 font-display text-2xl font-semibold text-ink-900">Trending now</h2>
              </div>
              <a routerLink="/products" [queryParams]="{ sort: 'rating' }" class="text-xs font-medium text-ink-500 hover:text-ink-900">All</a>
            </div>
            <div class="space-y-1">
              @for (product of home.trendingProducts.slice(0, 4); track product.id; let i = $index) {
                <a [routerLink]="['/products', product.slug]" class="flex items-center gap-3 rounded-xl p-2 transition hover:bg-ink-50">
                  <span class="w-4 text-center font-display text-sm text-gold-600">{{ i + 1 }}</span>
                  <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-14 w-14 rounded-lg object-cover" loading="lazy" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-ink-900">{{ product.name }}</span>
                    <app-rating-stars [value]="product.ratingAverage" [count]="product.reviewCount || null" [size]="12" />
                  </span>
                  <span class="text-sm font-semibold text-ink-900">{{ product.effectivePrice | money }}</span>
                </a>
              }
            </div>
          </div>
        }
      </section>

      @if (home.testimonials.length) {
        <section class="bg-ink-950 py-16 text-cream sm:py-20">
          <div class="container-luxe">
            <div class="text-center">
              <p class="eyebrow text-gold-400">In their words</p>
              <h2 class="mt-2 font-display text-3xl font-medium sm:text-4xl">Quietly obsessed</h2>
            </div>
            <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              @for (testimonial of home.testimonials.slice(0, 3); track testimonial.id) {
                <figure class="rounded-2xl border border-cream/10 bg-cream/[0.04] p-6">
                  <app-icon name="quote" [size]="22" class="text-gold-500" />
                  <blockquote class="mt-4 text-sm leading-relaxed text-cream/80">“{{ testimonial.quote }}”</blockquote>
                  <figcaption class="mt-5 flex items-center gap-3 border-t border-cream/10 pt-4">
                    @if (testimonial.avatarUrl) {
                      <img [src]="testimonial.avatarUrl | assetUrl" [alt]="testimonial.name" class="h-9 w-9 rounded-full object-cover" />
                    } @else {
                      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-ink-950">
                        {{ testimonial.name.slice(0, 1) }}
                      </span>
                    }
                    <span>
                      <span class="block text-sm font-medium text-cream">{{ testimonial.name }}</span>
                      <span class="block text-[11px] text-cream/50">{{ testimonial.role || 'Verified customer' }}</span>
                    </span>
                    <app-rating-stars [value]="testimonial.rating" [size]="12" class="ml-auto" />
                  </figcaption>
                </figure>
              }
            </div>
          </div>
        </section>
      }

      @if (home.brands.length) {
        <section class="border-b border-ink-100 bg-white py-10">
          <div class="container-luxe flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            @for (brand of home.brands; track brand.id) {
              <a
                [routerLink]="['/products']"
                [queryParams]="{ brand: brand.slug }"
                class="font-display text-lg font-medium tracking-wide text-ink-400 transition hover:text-ink-900"
              >
                {{ brand.name }}
              </a>
            }
          </div>
        </section>
      }

      @if (recent().length) {
        <section class="container-luxe py-14 sm:py-20">
          <div class="mb-8">
            <p class="eyebrow">Pick up where you left off</p>
            <h2 class="section-title mt-2">Recently viewed</h2>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            @for (product of recent(); track product.id) {
              <app-product-card [product]="product" />
            }
          </div>
        </section>
      }
    }
  `
})
export class HomePage implements OnInit, OnDestroy {
  private readonly content = inject(ContentService);
  private readonly recentlyViewed = inject(RecentlyViewedService);

  readonly feed = signal<HomeFeed | null>(null);
  readonly loading = signal(true);
  readonly activeBanner = signal(0);
  readonly recent = this.recentlyViewed.items;

  readonly heroBanners = computed(() => {
    const banners = this.feed()?.banners ?? [];
    const heroes = banners.filter((b) => b.position.toLowerCase() === 'hero');
    return heroes.length ? heroes : banners;
  });

  readonly promoBanner = computed(
    () => (this.feed()?.banners ?? []).find((b) => b.position.toLowerCase() === 'promo') ?? null
  );

  readonly values = [
    { icon: 'truck' as const, title: 'Complimentary delivery', text: 'On all orders above the free shipping threshold.' },
    { icon: 'rotate-ccw' as const, title: '30-day returns', text: 'Changed your mind? Return it, no questions asked.' },
    { icon: 'shield' as const, title: 'Secure payments', text: 'Encrypted checkout with verified payment providers.' },
    { icon: 'headphones' as const, title: 'Human support', text: 'Real people, seven days a week, ready to help.' }
  ];

  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.content
      .loadHome(this.recentlyViewed.ids())
      .pipe(catchError(() => of(null)))
      .subscribe((home) => {
        this.feed.set(home);
        this.loading.set(false);
        this.startCarousel();
      });
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  linkPath(url: string | null | undefined): string {
    if (!url) return '/products';
    const [path, query = ''] = url.split('?');
    const category = new URLSearchParams(query).get('category');
    if (category && path.startsWith('/products')) return `/category/${category}`;
    return path || '/products';
  }

  linkQuery(url: string | null | undefined): Record<string, string> {
    if (!url?.includes('?')) return {};
    const params = new URLSearchParams(url.split('?')[1]);
    params.delete('category');
    const sale = params.get('sale');
    if (sale !== null) {
      params.delete('sale');
      if (sale === 'true') params.set('onSale', 'true');
    }
    const sort = params.get('sort');
    if (sort === 'latest' || sort === 'createdAt') params.set('sort', 'newest');
    return Object.fromEntries(params.entries());
  }

  private startCarousel(): void {
    if (this.heroBanners().length < 2) return;
    this.timer = setInterval(() => {
      this.activeBanner.update((index) => (index + 1) % this.heroBanners().length);
    }, 6500);
  }
}
