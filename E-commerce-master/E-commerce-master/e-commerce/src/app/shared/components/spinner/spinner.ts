import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-3 text-sm text-ink-500" role="status" [attr.aria-label]="label()">
      <span class="h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-gold-500"></span>
      @if (label()) {
        <span>{{ label() }}</span>
      }
    </span>
  `
})
export class Spinner {
  readonly label = input('');
}
