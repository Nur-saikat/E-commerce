import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <div class="container-luxe flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p class="font-display text-7xl font-semibold text-ink-200 sm:text-8xl">404</p>
      <h1 class="mt-2 font-display text-3xl font-semibold text-ink-900 sm:text-4xl">This page has moved on</h1>
      <p class="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        The page you're looking for doesn't exist or has been moved. Let's get you back to something beautiful.
      </p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a routerLink="/" class="btn-primary">Back to home <app-icon name="arrow-right" [size]="15" /></a>
        <a routerLink="/products" class="btn-outline">Browse the collection</a>
        <a routerLink="/track-order" class="btn-ghost">Track an order</a>
      </div>
      <p class="mt-10 text-xs text-ink-400">
        Need a hand? <a routerLink="/contact" class="font-medium text-ink-700 underline underline-offset-4">Contact our team</a>
      </p>
    </div>
  `
})
export class NotFoundPage {}
