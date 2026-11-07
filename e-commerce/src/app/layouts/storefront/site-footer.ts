import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../core/services/catalog.service';
import { ContentService } from '../../core/services/content.service';
import { ToastService } from '../../core/services/toast.service';
import { Category } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../shared/pipes/asset-url.pipe';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, AssetUrlPipe],
  template: `
    <footer class="bg-ink-950 text-cream">
      <div class="container-luxe grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <a routerLink="/" class="inline-flex items-baseline gap-1">
            @if (settings()?.logoUrl) {
              <img [src]="settings()!.logoUrl | assetUrl" alt="Safwan" class="h-9 w-auto" />
            } @else {
              <span class="font-display text-2xl font-semibold tracking-[0.16em] text-cream">SAFWAN</span>
              <span class="h-1.5 w-1.5 rounded-full bg-gold-500"></span>
            }
          </a>
          <p class="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
            {{ settings()?.footerAbout || 'Considered design, honest materials and everyday objects made to last. Curated in small batches for people who notice the details.' }}
          </p>
          <div class="mt-6 flex items-center gap-2">
            @for (social of socialLinks(); track social.name) {
              <a
                [href]="social.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex h-9 w-9 items-center justify-center rounded-full border border-cream/15 text-cream/70 transition hover:border-gold-500 hover:text-gold-400"
                [attr.aria-label]="social.name"
              >
                <app-icon [name]="social.icon" [size]="16" />
              </a>
            }
          </div>
        </div>

        <div>
          <h3 class="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">Shop</h3>
          <ul class="mt-5 space-y-3 text-sm text-cream/70">
            <li><a routerLink="/products" class="transition hover:text-cream">All products</a></li>
            @for (category of categories(); track category.id) {
              <li><a [routerLink]="['/category', category.slug]" class="transition hover:text-cream">{{ category.name }}</a></li>
            }
            <li><a routerLink="/products" [queryParams]="{ onSale: true }" class="transition hover:text-cream">Sale edit</a></li>
          </ul>
        </div>

        <div>
          <h3 class="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">Help</h3>
          <ul class="mt-5 space-y-3 text-sm text-cream/70">
            <li><a routerLink="/track-order" class="transition hover:text-cream">Track an order</a></li>
            <li><a routerLink="/shipping-returns" class="transition hover:text-cream">Shipping & returns</a></li>
            <li><a routerLink="/faq" class="transition hover:text-cream">FAQ</a></li>
            <li><a routerLink="/contact" class="transition hover:text-cream">Contact us</a></li>
            <li><a routerLink="/privacy" class="transition hover:text-cream">Privacy policy</a></li>
            <li><a routerLink="/terms" class="transition hover:text-cream">Terms of service</a></li>
          </ul>
        </div>

        <div>
          <h3 class="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-400">The list</h3>
          <p class="mt-5 text-sm leading-relaxed text-cream/60">
            New arrivals, private sales and studio notes. No noise — just the good stuff.
          </p>
          <form class="mt-4" (submit)="subscribe($event)">
            <div class="flex overflow-hidden rounded-full border border-cream/20 bg-cream/5 focus-within:border-gold-500">
              <input
                [formControl]="email"
                type="email"
                placeholder="Email address"
                class="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-cream placeholder:text-cream/40 focus:outline-none"
                aria-label="Email address"
              />
              <button type="submit" class="flex items-center justify-center bg-gold-500 px-4 text-ink-950 transition hover:bg-gold-400" aria-label="Subscribe">
                <app-icon name="arrow-right" [size]="17" />
              </button>
            </div>
            @if (email.invalid && email.touched) {
              <p class="mt-2 text-xs text-gold-300">Enter a valid email address.</p>
            }
          </form>
          <div class="mt-6 space-y-2 text-sm text-cream/60">
            @if (settings()?.phone) {
              <p class="flex items-center gap-2"><app-icon name="phone" [size]="14" class="text-gold-500" /> {{ settings()!.phone }}</p>
            }
            @if (settings()?.email) {
              <p class="flex items-center gap-2"><app-icon name="mail" [size]="14" class="text-gold-500" /> {{ settings()!.email }}</p>
            }
            @if (settings()?.address) {
              <p class="flex items-start gap-2"><app-icon name="map-pin" [size]="14" class="mt-0.5 text-gold-500" /> {{ settings()!.address }}</p>
            }
          </div>
        </div>
      </div>

      <div class="border-t border-cream/10">
        <div class="container-luxe flex flex-col items-center justify-between gap-4 py-5 text-xs text-cream/45 sm:flex-row">
          <p>{{ settings()?.copyrightText || '© ' + year + ' Safwan. All rights reserved.' }}</p>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <span class="rounded border border-cream/15 px-2 py-1">Visa</span>
            <span class="rounded border border-cream/15 px-2 py-1">Mastercard</span>
            <span class="rounded border border-cream/15 px-2 py-1">Stripe</span>
            <span class="rounded border border-cream/15 px-2 py-1">SSLCommerz</span>
            <span class="rounded border border-cream/15 px-2 py-1">Cash on delivery</span>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class SiteFooter implements OnInit {
  private readonly catalog = inject(CatalogService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);

  readonly settings = this.content.settings;
  readonly categories = signal<Category[]>([]);
  readonly email = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] });
  readonly year = new Date().getFullYear();

  ngOnInit(): void {
    this.content.loadSettings().subscribe({ error: () => undefined });
    this.catalog.categories().subscribe({ next: (items) => this.categories.set(items), error: () => undefined });
  }

  socialLinks(): { name: string; url: string; icon: 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'linkedin' }[] {
    const links = this.settings()?.socialLinks ?? {};
    const icons = {
      instagram: 'instagram',
      facebook: 'facebook',
      twitter: 'twitter',
      youtube: 'youtube',
      linkedin: 'linkedin'
    } as const;
    return Object.entries(links)
      .filter(([, url]) => !!url)
      .map(([name, url]) => ({ name, url, icon: icons[name as keyof typeof icons] ?? 'instagram' }));
  }

  subscribe(event: Event): void {
    event.preventDefault();
    this.email.markAsTouched();
    if (this.email.invalid) return;
    this.content.subscribe({ email: this.email.value }).subscribe({
      next: () => {
        this.toast.success('You are on the list — welcome to Safwan.');
        this.email.setValue('');
        this.email.markAsUntouched();
      }
    });
  }
}
