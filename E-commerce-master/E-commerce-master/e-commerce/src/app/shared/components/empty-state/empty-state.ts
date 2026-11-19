import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink, Icon],
  template: `
    <div class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-ink-500">
        <app-icon [name]="icon()" [size]="24" />
      </span>
      <div class="space-y-1.5">
        <h3 class="font-display text-xl font-semibold text-ink-900">{{ title() }}</h3>
        <p class="mx-auto max-w-sm text-sm leading-relaxed text-ink-500">{{ message() }}</p>
      </div>
      @if (actionLabel()) {
        @if (actionLink()) {
          <a [routerLink]="actionLink()" class="btn-primary mt-1">{{ actionLabel() }}</a>
        } @else {
          <button type="button" class="btn-primary mt-1" (click)="action.emit()">{{ actionLabel() }}</button>
        }
      }
    </div>
  `
})
export class EmptyState {
  readonly icon = input<IconName>('package');
  readonly title = input('Nothing here yet');
  readonly message = input('');
  readonly actionLabel = input<string | null>(null);
  readonly actionLink = input<string | null>(null);
  readonly action = output<void>();
}
