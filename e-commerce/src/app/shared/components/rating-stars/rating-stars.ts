import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [Icon],
  template: `
    <span class="inline-flex items-center gap-1" [attr.aria-label]="value() + ' out of 5 stars'">
      <span class="flex items-center gap-0.5 text-gold-500">
        @for (star of [1, 2, 3, 4, 5]; track star) {
          <app-icon
            name="star"
            [size]="size()"
            [filled]="star <= rounded()"
            [class]="star <= rounded() ? 'text-gold-500' : 'text-ink-300'"
            [strokeWidth]="1.4"
          />
        }
      </span>
      @if (showValue()) {
        <span class="text-xs font-medium text-ink-500">{{ value().toFixed(1) }}</span>
      }
      @if (count() !== null) {
        <span class="text-xs text-ink-400">({{ count() }})</span>
      }
    </span>
  `
})
export class RatingStars {
  readonly value = input(0);
  readonly count = input<number | null>(null);
  readonly size = input(15);
  readonly showValue = input(false);

  rounded(): number {
    return Math.round(this.value());
  }
}
