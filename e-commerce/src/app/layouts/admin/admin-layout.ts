import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon, IconName } from '../../shared/components/icon/icon';

interface NavItem {
  label: string;
  link: string;
  icon: IconName;
  permission: string;
  exact?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="min-h-screen bg-ink-50/70">
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-ink-950 text-cream transition-transform duration-300 lg:translate-x-0"
        [class.-translate-x-full]="!sidebarOpen()"
        [class.translate-x-0]="sidebarOpen()"
      >
        <div class="flex h-16 items-center justify-between border-b border-cream/10 px-5">
          <a routerLink="/admin" class="flex items-baseline gap-1">
            <span class="font-display text-xl font-semibold tracking-[0.16em]">SAFWAN</span>
            <span class="h-1.5 w-1.5 rounded-full bg-gold-500"></span>
            <span class="ml-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-cream/40">Admin</span>
          </a>
          <button type="button" class="text-cream/60 lg:hidden" (click)="sidebarOpen.set(false)" aria-label="Close sidebar">
            <app-icon name="x" [size]="18" />
          </button>
        </div>

        <nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5 no-scrollbar" aria-label="Admin">
          @for (group of visibleGroups(); track group.label) {
            <div>
              <p class="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-cream/35">{{ group.label }}</p>
              <div class="space-y-0.5">
                @for (item of group.items; track item.link) {
                  <a
                    [routerLink]="item.link"
                    routerLinkActive="bg-cream/10 text-cream"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    (click)="sidebarOpen.set(false)"
                    class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-cream/60 transition hover:bg-cream/5 hover:text-cream"
                  >
                    <app-icon [name]="item.icon" [size]="17" />
                    {{ item.label }}
                  </a>
                }
              </div>
            </div>
          }
        </nav>

        <div class="border-t border-cream/10 p-4">
          <div class="flex items-center gap-3 rounded-xl bg-cream/5 p-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-ink-950">
              {{ initials() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-cream">{{ auth.fullName() }}</p>
              <p class="truncate text-[11px] text-cream/45">{{ auth.user()?.role }}</p>
            </div>
          </div>
          <a routerLink="/" class="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-cream/55 transition hover:bg-cream/5 hover:text-cream">
            <app-icon name="external-link" [size]="14" /> View storefront
          </a>
          <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-cream/55 transition hover:bg-cream/5 hover:text-cream" (click)="logout()">
            <app-icon name="log-out" [size]="14" /> Sign out
          </button>
        </div>
      </aside>

      @if (sidebarOpen()) {
        <div class="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-sm lg:hidden" (click)="sidebarOpen.set(false)"></div>
      }

      <div class="lg:pl-64">
        <header class="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <div class="flex items-center gap-3">
            <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-700 lg:hidden" (click)="sidebarOpen.set(true)" aria-label="Open sidebar">
              <app-icon name="menu" [size]="18" />
            </button>
            <div>
              <h1 class="text-lg font-semibold tracking-tight text-ink-900">{{ title() }}</h1>
              <p class="text-[11px] text-ink-400">{{ today }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <a routerLink="/" class="hidden items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-600 transition hover:border-ink-900 hover:text-ink-900 sm:flex">
              <app-icon name="external-link" [size]="14" /> Storefront
            </a>
            <div class="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2">
              <span class="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-cream">{{ initials() }}</span>
              <span class="hidden text-xs font-medium text-ink-700 sm:inline">{{ auth.user()?.role }}</span>
            </div>
          </div>
        </header>

        <main class="p-4 sm:p-6 lg:p-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class AdminLayout implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly sidebarOpen = signal(false);
  readonly title = signal('Dashboard');
  readonly today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  private readonly groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', link: '/admin', icon: 'dashboard', permission: 'dashboard.view', exact: true },
        { label: 'Reports', link: '/admin/reports', icon: 'chart', permission: 'reports.view' }
      ]
    },
    {
      label: 'Business',
      items: [
        { label: 'Overview', link: '/admin/business', icon: 'trending', permission: 'business.view', exact: true },
        { label: 'Profit & loss', link: '/admin/business/profit-loss', icon: 'chart', permission: 'business.view' },
        { label: 'Investments', link: '/admin/business/investments', icon: 'wallet', permission: 'business.view' },
        { label: 'Expenses', link: '/admin/business/expenses', icon: 'receipt', permission: 'business.view' },
        { label: 'Arrivals', link: '/admin/business/arrivals', icon: 'package', permission: 'business.view' },
        { label: 'Staff & CVs', link: '/admin/business/staff', icon: 'users', permission: 'business.view' },
        { label: 'Owner profile', link: '/admin/business/owner', icon: 'user', permission: 'business.view' }
      ]
    },
    {
      label: 'Catalog',
      items: [
        { label: 'Products', link: '/admin/products', icon: 'box', permission: 'products.view' },
        { label: 'Categories', link: '/admin/categories', icon: 'grid', permission: 'categories.manage' },
        { label: 'Brands', link: '/admin/brands', icon: 'tag', permission: 'brands.manage' },
        { label: 'Inventory', link: '/admin/inventory', icon: 'package', permission: 'inventory.manage' }
      ]
    },
    {
      label: 'Sales',
      items: [
        { label: 'Orders', link: '/admin/orders', icon: 'clipboard', permission: 'orders.view' },
        { label: 'Returns', link: '/admin/returns', icon: 'rotate-ccw', permission: 'orders.view' },
        { label: 'Customers', link: '/admin/customers', icon: 'users', permission: 'customers.view' },
        { label: 'Coupons', link: '/admin/coupons', icon: 'percent', permission: 'coupons.manage' }
      ]
    },
    {
      label: 'Experience',
      items: [
        { label: 'Reviews', link: '/admin/reviews', icon: 'star', permission: 'reviews.manage' },
        { label: 'Content', link: '/admin/content', icon: 'image', permission: 'content.manage' },
        { label: 'Settings', link: '/admin/settings', icon: 'settings', permission: 'settings.manage' }
      ]
    },
    {
      label: 'System',
      items: [{ label: 'Audit logs', link: '/admin/audit', icon: 'shield', permission: 'settings.manage' }]
    }
  ];

  private subscription?: Subscription;

  ngOnInit(): void {
    this.content.loadSettings().subscribe({ error: () => undefined });
    this.subscription = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.title.set(this.resolveTitle());
    });
    this.title.set(this.resolveTitle());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  visibleGroups(): NavGroup[] {
    return this.groups
      .map((group) => ({ ...group, items: group.items.filter((item) => this.auth.hasPermission(item.permission)) }))
      .filter((group) => group.items.length > 0);
  }

  initials(): string {
    return (this.auth.fullName() || 'A')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  logout(): void {
    this.auth.logout();
    this.toast.info('Signed out of the admin console');
    this.router.navigate(['/login']);
  }

  private resolveTitle(): string {
    const segments = this.router.url.split('?')[0].split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? 'admin';
    if (last === 'admin') return 'Dashboard';
    if (last === 'new') return 'New product';
    if (last === 'profit-loss') return 'Profit & loss';
    if (last === 'staff') return 'Staff & CVs';
    if (last === 'owner') return 'Owner profile';
    if (last === 'business') return 'Business overview';
    if (/^[a-f0-9]{24}$/i.test(last)) {
      const parent = segments[segments.length - 2] ?? '';
      return parent === 'orders' ? 'Order details' : parent === 'products' ? 'Edit product' : 'Details';
    }
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  }
}
