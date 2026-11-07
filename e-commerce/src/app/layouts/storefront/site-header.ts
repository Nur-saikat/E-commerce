import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, of, switchMap, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Category, SearchSuggestion } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ReactiveFormsModule, Icon, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="bg-ink-950 px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-cream/80">
      <span class="inline-flex items-center gap-2">
        <app-icon name="truck" [size]="13" />
        Complimentary shipping on orders over {{ settings()?.freeShippingThreshold | money }}
        <span class="hidden text-cream/40 sm:inline">·</span>
        <span class="hidden sm:inline">Easy 30-day returns</span>
      </span>
    </div>

    <header class="sticky top-0 z-50 border-b border-ink-100 bg-cream/95 backdrop-blur-md">
      <div class="container-luxe flex h-[70px] items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-ink-800 transition hover:bg-ink-900/5 lg:hidden"
            (click)="mobileOpen.set(true)"
            aria-label="Open menu"
          >
            <app-icon name="menu" [size]="21" />
          </button>

          <a routerLink="/" class="group flex items-baseline gap-1" aria-label="Safwan home">
            @if (settings()?.logoUrl) {
              <img [src]="settings()!.logoUrl | assetUrl" alt="Safwan" class="h-8 w-auto" />
            } @else {
              <span class="font-display text-[26px] font-semibold leading-none tracking-[0.16em] text-ink-950">SAFWAN</span>
              <span class="h-1.5 w-1.5 rounded-full bg-gold-500 transition-transform group-hover:scale-125"></span>
            }
          </a>
        </div>

        <nav class="hidden items-center gap-7 lg:flex" aria-label="Primary">
          <a routerLink="/products" routerLinkActive="text-ink-950 after:w-full" class="link-underline relative py-1 text-sm font-medium text-ink-700 after:bg-gold-500">
            Shop all
          </a>
          @for (category of categories().slice(0, 5); track category.id) {
            <a
              [routerLink]="['/category', category.slug]"
              routerLinkActive="text-ink-950 after:w-full"
              class="link-underline relative py-1 text-sm font-medium text-ink-700 after:bg-gold-500"
            >
              {{ category.name }}
            </a>
          }
          <a routerLink="/products" [queryParams]="{ onSale: true }" class="link-underline relative py-1 text-sm font-medium text-danger after:bg-danger">
            Sale
          </a>
        </nav>

        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-ink-800 transition hover:bg-ink-900/5 lg:hidden"
            (click)="toggleSearch()"
            aria-label="Search"
          >
            <app-icon name="search" [size]="20" />
          </button>

          <div class="relative hidden lg:block" (focusout)="onSearchBlur($event)">
            <form (submit)="submitSearch($event)" class="relative">
              <app-icon name="search" [size]="16" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                [formControl]="searchControl"
                type="search"
                placeholder="Search the collection"
                class="h-10 w-64 rounded-full border border-ink-200 bg-white/70 pl-10 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                (focus)="searchFocused.set(true)"
              />
            </form>
            @if (searchFocused() && (suggestions()?.products?.length || suggestions()?.categories?.length)) {
              <div class="absolute right-0 top-12 w-[26rem] overflow-hidden rounded-2xl border border-ink-100 bg-white p-2 shadow-[var(--shadow-luxe)]">
                @if (suggestions()!.products.length) {
                  <p class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-ink-400">Products</p>
                  @for (product of suggestions()!.products.slice(0, 4); track product.id) {
                    <a
                      [routerLink]="['/products', product.slug]"
                      (click)="closeSearch()"
                      class="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-ink-50"
                    >
                      <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-11 w-11 rounded-lg object-cover" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-medium text-ink-900">{{ product.name }}</span>
                        <span class="text-xs text-ink-500">{{ product.effectivePrice | money }}</span>
                      </span>
                      <app-icon name="arrow-up-right" [size]="14" class="text-ink-300" />
                    </a>
                  }
                }
                @if (suggestions()!.categories.length) {
                  <p class="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-ink-400">Categories</p>
                  @for (category of suggestions()!.categories.slice(0, 3); track category.id) {
                    <a
                      [routerLink]="['/category', category.slug]"
                      (click)="closeSearch()"
                      class="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink-700 transition hover:bg-ink-50"
                    >
                      {{ category.name }}
                      <app-icon name="chevron-right" [size]="14" class="text-ink-300" />
                    </a>
                  }
                }
              </div>
            }
          </div>

          <a
            routerLink="/wishlist"
            class="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-800 transition hover:bg-ink-900/5"
            aria-label="Wishlist"
          >
            <app-icon name="heart" [size]="20" />
            @if (wishlistCount() > 0) {
              <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-500 px-1 text-[9px] font-bold text-ink-950">
                {{ wishlistCount() }}
              </span>
            }
          </a>

          <div class="relative">
            <button
              type="button"
              class="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-800 transition hover:bg-ink-900/5"
              (click)="accountOpen.set(!accountOpen())"
              aria-label="Account menu"
            >
              <app-icon name="user" [size]="20" />
              @if (auth.isAuthenticated() && unreadCount() > 0) {
                <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-cream bg-danger"></span>
              }
            </button>
            @if (accountOpen()) {
              <div class="absolute right-0 top-12 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white p-2 shadow-[var(--shadow-luxe)]">
                @if (auth.isAuthenticated()) {
                  <div class="border-b border-ink-100 px-3 pb-2.5 pt-1.5">
                    <p class="truncate text-sm font-semibold text-ink-900">{{ auth.fullName() }}</p>
                    <p class="truncate text-xs text-ink-500">{{ auth.user()?.email }}</p>
                  </div>
                  <a routerLink="/account" (click)="accountOpen.set(false)" class="mt-1 block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">My account</a>
                  <a routerLink="/account/orders" (click)="accountOpen.set(false)" class="block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">Orders & tracking</a>
                  <a routerLink="/wishlist" (click)="accountOpen.set(false)" class="block rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50">Wishlist</a>
                  @if (auth.isAdmin()) {
                    <a routerLink="/admin" (click)="accountOpen.set(false)" class="block rounded-lg px-3 py-2 text-sm font-medium text-gold-600 hover:bg-ink-50">Admin dashboard</a>
                  }
                  <button
                    type="button"
                    class="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-ink-100 px-3 py-2 text-left text-sm text-ink-600 hover:bg-ink-50"
                    (click)="logout()"
                  >
                    <app-icon name="log-out" [size]="15" /> Sign out
                  </button>
                } @else {
                  <div class="p-1">
                    <p class="px-2 pb-2 pt-1 text-xs leading-relaxed text-ink-500">Sign in to track orders, save favourites and check out faster.</p>
                    <a routerLink="/login" [queryParams]="{ returnUrl: currentUrl() }" (click)="accountOpen.set(false)" class="btn-primary btn-sm w-full">Sign in</a>
                    <a routerLink="/register" (click)="accountOpen.set(false)" class="btn-outline btn-sm mt-2 w-full">Create account</a>
                  </div>
                }
              </div>
            }
          </div>

          <a
            routerLink="/cart"
            class="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-800 transition hover:bg-ink-900/5"
            aria-label="Shopping bag"
          >
            <app-icon name="bag" [size]="20" />
            @if (cart.itemCount() > 0) {
              <span class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink-900 px-1 text-[9px] font-bold text-cream">
                {{ cart.itemCount() }}
              </span>
            }
          </a>
        </div>
      </div>

      @if (searchOpen()) {
        <div class="border-t border-ink-100 bg-cream p-4 lg:hidden">
          <form (submit)="submitSearch($event)" class="relative">
            <app-icon name="search" [size]="17" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              [formControl]="searchControl"
              type="search"
              placeholder="Search products, categories…"
              class="input !rounded-full pl-11"
              autofocus
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" (click)="toggleSearch()" aria-label="Close search">
              <app-icon name="x" [size]="18" />
            </button>
          </form>
          @if (suggestions()?.products?.length) {
            <div class="mt-3 space-y-1">
              @for (product of suggestions()!.products.slice(0, 4); track product.id) {
                <a [routerLink]="['/products', product.slug]" (click)="closeSearch()" class="flex items-center gap-3 rounded-xl bg-white p-2">
                  <img [src]="product.thumbnailUrl | assetUrl" [alt]="product.name" class="h-10 w-10 rounded-lg object-cover" />
                  <span class="min-w-0 flex-1 text-sm font-medium text-ink-800">{{ product.name }}</span>
                  <span class="text-xs text-ink-500">{{ product.effectivePrice | money }}</span>
                </a>
              }
            </div>
          }
        </div>
      }

      @if (mobileOpen()) {
        <div class="fixed inset-0 z-[80] lg:hidden">
          <div class="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" (click)="mobileOpen.set(false)"></div>
          <aside class="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-cream p-5 shadow-2xl">
            <div class="flex items-center justify-between">
              <span class="font-display text-xl font-semibold tracking-[0.16em] text-ink-950">SAFWAN</span>
              <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink-900/5" (click)="mobileOpen.set(false)" aria-label="Close menu">
                <app-icon name="x" [size]="20" />
              </button>
            </div>
            <nav class="mt-6 space-y-1" aria-label="Mobile">
              <a routerLink="/products" (click)="mobileOpen.set(false)" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-white">Shop all</a>
              @for (category of categories(); track category.id) {
                <a [routerLink]="['/category', category.slug]" (click)="mobileOpen.set(false)" class="block rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-white">
                  {{ category.name }}
                </a>
              }
              <a routerLink="/products" [queryParams]="{ onSale: true }" (click)="mobileOpen.set(false)" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-white">Sale</a>
              <a routerLink="/track-order" (click)="mobileOpen.set(false)" class="block rounded-xl px-3 py-2.5 text-sm text-ink-700 hover:bg-white">Track your order</a>
            </nav>
            <div class="mt-6 border-t border-ink-200 pt-4">
              @if (auth.isAuthenticated()) {
                <div class="flex items-center gap-3 rounded-xl bg-white p-3">
                  <span class="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-cream">
                    {{ auth.fullName().slice(0, 1) }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-ink-900">{{ auth.fullName() }}</p>
                    <p class="truncate text-xs text-ink-500">{{ auth.user()?.email }}</p>
                  </div>
                </div>
                <a routerLink="/account" (click)="mobileOpen.set(false)" class="btn-outline btn-sm mt-3 w-full">My account</a>
                @if (auth.isAdmin()) {
                  <a routerLink="/admin" (click)="mobileOpen.set(false)" class="btn-gold btn-sm mt-2 w-full">Admin dashboard</a>
                }
                <button type="button" class="btn-ghost btn-sm mt-2 w-full" (click)="logout()">Sign out</button>
              } @else {
                <a routerLink="/login" (click)="mobileOpen.set(false)" class="btn-primary w-full">Sign in</a>
                <a routerLink="/register" (click)="mobileOpen.set(false)" class="btn-outline btn-sm mt-2 w-full">Create account</a>
              }
            </div>
          </aside>
        </div>
      }
    </header>
  `
})
export class SiteHeader implements OnInit, OnDestroy {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);
  readonly content = inject(ContentService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly settings = this.content.settings;
  readonly categories = signal<Category[]>([]);
  readonly suggestions = signal<SearchSuggestion | null>(null);
  readonly mobileOpen = signal(false);
  readonly searchOpen = signal(false);
  readonly searchFocused = signal(false);
  readonly accountOpen = signal(false);
  readonly searchControl = new FormControl('', { nonNullable: true });

  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.content.loadSettings().subscribe({ error: () => undefined });
    this.catalog.categories().subscribe({ next: (items) => this.categories.set(items), error: () => undefined });
    this.cart.get().subscribe({ error: () => undefined });

    if (this.auth.isAuthenticated()) {
      this.auth.me().subscribe({ error: () => undefined });
      this.wishlist.get().subscribe({ error: () => undefined });
      this.content.loadNotifications().subscribe({ error: () => undefined });
    }

    this.searchControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) =>
          term.trim().length >= 2 ? this.catalog.suggest(term).pipe(catchError(() => of(null))) : of(null)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((suggestion) => this.suggestions.set(suggestion));

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.mobileOpen.set(false);
        this.accountOpen.set(false);
        this.searchOpen.set(false);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  unreadCount(): number {
    return this.content.unreadCount();
  }

  wishlistCount(): number {
    return this.wishlist.items().length;
  }

  currentUrl(): string {
    return this.router.url;
  }

  toggleSearch(): void {
    this.searchOpen.update((open) => !open);
  }

  submitSearch(event: Event): void {
    event.preventDefault();
    const term = this.searchControl.value.trim();
    if (!term) return;
    this.closeSearch();
    this.router.navigate(['/products'], { queryParams: { search: term } });
  }

  onSearchBlur(event: FocusEvent): void {
    const container = event.currentTarget as HTMLElement;
    if (!container.contains(event.relatedTarget as Node)) {
      this.searchFocused.set(false);
    }
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchFocused.set(false);
    this.searchControl.setValue('');
    this.suggestions.set(null);
  }

  logout(): void {
    this.auth.logout();
    this.wishlist.reset();
    this.accountOpen.set(false);
    this.mobileOpen.set(false);
    this.toast.info('You have been signed out');
    this.router.navigate(['/']);
  }
}
