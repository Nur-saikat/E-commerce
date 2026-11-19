import { Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Icon],
  template: `
    @if (confirm.state(); as state) {
      <div class="fixed inset-0 z-[95] flex items-end justify-center bg-ink-950/50 p-4 backdrop-blur-sm sm:items-center" (click)="cancel()">
        <div
          class="w-full max-w-md rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
          role="alertdialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-11 w-11 flex-none items-center justify-center rounded-full"
              [class]="state.danger ? 'bg-red-50 text-danger' : 'bg-sand text-ink-700'"
            >
              <app-icon [name]="state.danger ? 'alert-triangle' : 'help'" [size]="20" />
            </span>
            <div class="flex-1">
              <h2 class="font-display text-xl font-semibold text-ink-900">{{ state.title }}</h2>
              <p class="mt-1.5 text-sm leading-relaxed text-ink-500">{{ state.message }}</p>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="cancel()">{{ state.cancelText || 'Cancel' }}</button>
            <button type="button" [class]="state.danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'" (click)="confirm.respond(true)">
              {{ state.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ConfirmDialog {
  readonly confirm = inject(ConfirmService);

  cancel(): void {
    this.confirm.respond(false);
  }
}
