import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';

export interface Crumb {
  label: string;
  link?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-ink-500">
      <a routerLink="/" class="transition hover:text-ink-900">Home</a>
      @for (crumb of items(); track crumb.label) {
        <app-icon name="chevron-right" [size]="12" class="text-ink-300" />
        @if (crumb.link) {
          <a [routerLink]="crumb.link" class="transition hover:text-ink-900">{{ crumb.label }}</a>
        } @else {
          <span class="font-medium text-ink-800">{{ crumb.label }}</span>
        }
      }
    </nav>
  `
})
export class Breadcrumb {
  readonly items = input<Crumb[]>([]);
}
