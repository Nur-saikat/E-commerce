import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <div class="grid min-h-screen bg-cream lg:grid-cols-[1.05fr_1fr]">
      <aside class="relative hidden overflow-hidden bg-ink-950 text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div class="absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-gold-500/15 blur-3xl"></div>
        <div class="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-gold-300/10 blur-3xl"></div>

        <a routerLink="/" class="relative z-10 inline-flex items-center gap-2">
          <span class="flex h-9 w-9 items-center justify-center rounded-full border border-gold-500/40 text-gold-300">
            <app-icon name="sparkles" [size]="16" />
          </span>
          <span class="font-display text-2xl font-semibold tracking-[0.22em]">SAFWAN</span>
        </a>

        <div class="relative z-10 max-w-md">
          <p class="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">{{ eyebrow() }}</p>
          <h2 class="mt-4 font-display text-4xl font-semibold leading-tight">{{ headline() }}</h2>
          <p class="mt-4 text-sm leading-relaxed text-cream/60">{{ blurb() }}</p>

          <ul class="mt-8 space-y-3 text-sm text-cream/70">
            <li class="flex items-center gap-3"><app-icon name="check" [size]="15" class="text-gold-400" /> Track every order in one place</li>
            <li class="flex items-center gap-3"><app-icon name="check" [size]="15" class="text-gold-400" /> Save addresses for faster checkout</li>
            <li class="flex items-center gap-3"><app-icon name="check" [size]="15" class="text-gold-400" /> Members-only offers and early access</li>
          </ul>
        </div>

        <p class="relative z-10 text-[11px] uppercase tracking-[0.2em] text-cream/40">Curated essentials for modern living</p>
      </aside>

      <main class="flex min-h-screen flex-col">
        <div class="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <a routerLink="/" class="inline-flex items-center gap-2 lg:hidden">
            <span class="font-display text-xl font-semibold tracking-[0.22em] text-ink-900">SAFWAN</span>
          </a>
          <a routerLink="/" class="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition hover:text-ink-900">
            Back to store <app-icon name="arrow-right" [size]="13" />
          </a>
        </div>

        <div class="flex flex-1 items-center justify-center px-5 pb-14 sm:px-8">
          <div class="w-full max-w-md">
            <h1 class="font-display text-3xl font-semibold text-ink-900">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="mt-2 text-sm leading-relaxed text-ink-500">{{ subtitle() }}</p>
            }
            <div class="mt-7">
              <ng-content />
            </div>
          </div>
        </div>

        <p class="px-5 pb-6 text-center text-[11px] text-ink-400 sm:px-8">
          © {{ year }} Safwan. Secure authentication · your data stays private.
        </p>
      </main>
    </div>
  `
})
export class AuthShell {
  readonly eyebrow = input('Members');
  readonly headline = input('Considered pieces, kept close.');
  readonly blurb = input('Create an account to save your favourites, follow your orders and check out faster.');
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly year = new Date().getFullYear();
}
