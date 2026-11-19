import { Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [Icon],
  template: `
    @if (totalPages() > 1) {
      <nav class="flex flex-col items-center justify-between gap-4 border-t border-ink-100 pt-6 sm:flex-row" aria-label="Pagination">
        <p class="text-xs text-ink-500">
          Showing
          <span class="font-semibold text-ink-800">{{ from() }}–{{ to() }}</span>
          of <span class="font-semibold text-ink-800">{{ totalItems() }}</span> results
        </p>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-ink-900 hover:text-ink-900 disabled:opacity-40"
            [disabled]="page() <= 1"
            (click)="go(page() - 1)"
            aria-label="Previous page"
          >
            <app-icon name="chevron-left" [size]="16" />
          </button>
          @for (item of pages(); track $index) {
            @if (item === '…') {
              <span class="px-1.5 text-sm text-ink-400">…</span>
            } @else {
              <button
                type="button"
                class="h-9 min-w-9 rounded-full px-2 text-sm font-medium transition"
                [class]="item === page() ? 'bg-ink-900 text-cream' : 'text-ink-600 hover:bg-ink-900/5 hover:text-ink-900'"
                (click)="go(+item)"
              >
                {{ item }}
              </button>
            }
          }
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-ink-900 hover:text-ink-900 disabled:opacity-40"
            [disabled]="page() >= totalPages()"
            (click)="go(page() + 1)"
            aria-label="Next page"
          >
            <app-icon name="chevron-right" [size]="16" />
          </button>
        </div>
      </nav>
    }
  `
})
export class Pagination {
  readonly page = input(1);
  readonly totalPages = input(1);
  readonly totalItems = input(0);
  readonly pageSize = input(12);
  readonly pageChange = output<number>();

  readonly from = computed(() => (this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1));
  readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));

  readonly pages = computed<(number | '…')[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const result: (number | '…')[] = [1];
    if (current > 3) result.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) result.push(i);
    if (current < total - 2) result.push('…');
    result.push(total);
    return result;
  });

  go(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
