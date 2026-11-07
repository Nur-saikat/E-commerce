import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { Icon, IconName } from '../../shared/components/icon/icon';

interface AccountLink {
  label: string;
  path: string;
  icon: IconName;
  exact?: boolean;
}

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: `
    <div class="container-luxe py-8 lg:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">My account</p>
          <h1 class="section-title mt-1">Hello, {{ auth.user()?.firstName || 'there' }}</h1>
          <p class="mt-2 text-sm text-ink-500">{{ auth.user()?.email }}</p>
        </div>
        <a routerLink="/products" class="btn-ghost btn-sm">Continue shopping <app-icon name="arrow-right" [size]="14" /></a>
      </div>

      <div class="mt-8 grid items-start gap-8 lg:grid-cols-[260px_1fr] xl:gap-12">
        <aside class="lg:sticky lg:top-28">
          <div class="rounded-2xl border border-ink-100 bg-white p-5">
            <div class="flex items-center gap-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-base font-semibold text-cream">
                {{ initials() }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-ink-900">{{ auth.fullName() }}</p>
                <p class="text-[11px] uppercase tracking-wider text-ink-400">{{ auth.user()?.role }}</p>
              </div>
            </div>

            <nav class="mt-5 space-y-1 border-t border-ink-100 pt-4" aria-label="Account">
              @for (link of links; track link.path) {
                <a
                  [routerLink]="link.path"
                  routerLinkActive="bg-ink-900 text-cream"
                  [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
                  class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
                >
                  <app-icon [name]="link.icon" [size]="17" />
                  {{ link.label }}
                </a>
              }
            </nav>

            <div class="mt-4 space-y-1 border-t border-ink-100 pt-4">
              <a routerLink="/wishlist" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
                <app-icon name="heart" [size]="17" /> Wishlist
              </a>
              <a routerLink="/track-order" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-900">
                <app-icon name="truck" [size]="17" /> Track an order
              </a>
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-red-50"
                (click)="logout()"
              >
                <app-icon name="log-out" [size]="17" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <div class="min-w-0 page-enter">
          <router-outlet />
        </div>
      </div>
    </div>
  `
})
export class AccountLayout {
  readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly initials = computed(() => {
    const user = this.auth.user();
    if (!user) return 'L';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'L';
  });

  readonly links: AccountLink[] = [
    { label: 'Overview', path: '/account', icon: 'dashboard', exact: true },
    { label: 'Orders', path: '/account/orders', icon: 'package' },
    { label: 'Addresses', path: '/account/addresses', icon: 'map-pin' },
    { label: 'Profile', path: '/account/profile', icon: 'user' },
    { label: 'My reviews', path: '/account/reviews', icon: 'star' }
  ];

  async logout(): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your account.',
      confirmText: 'Sign out'
    });
    if (!confirmed) return;
    this.auth.logout();
    this.wishlist.reset();
    this.cart.reset();
    await this.router.navigate(['/']);
  }
}
