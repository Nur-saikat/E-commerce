import { Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

@Component({
  selector: 'app-storefront-layout',
  standalone: true,
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <app-site-header />
    <main class="min-h-[60vh]">
      <router-outlet />
    </main>
    <app-site-footer />
  `
})
export class StorefrontLayout {
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  }
}
