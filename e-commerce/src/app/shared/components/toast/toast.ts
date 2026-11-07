import { Component, inject } from '@angular/core';
import { ToastKind, ToastService } from '../../../core/services/toast.service';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
      @for (toast of toasts.messages(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-[0_18px_40px_-20px_rgba(28,26,22,0.5)]"
          [class]="borderClass(toast.kind)"
          role="status"
        >
          <span class="mt-0.5" [class]="iconClass(toast.kind)">
            <app-icon [name]="iconName(toast.kind)" [size]="18" />
          </span>
          <p class="flex-1 text-sm leading-relaxed text-ink-800">{{ toast.message }}</p>
          <button type="button" class="text-ink-400 transition hover:text-ink-900" (click)="toasts.dismiss(toast.id)" aria-label="Dismiss">
            <app-icon name="x" [size]="15" />
          </button>
        </div>
      }
    </div>
  `
})
export class Toast {
  readonly toasts = inject(ToastService);

  iconName(kind: ToastKind): IconName {
    switch (kind) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert-triangle';
      default:
        return 'info';
    }
  }

  iconClass(kind: ToastKind): string {
    switch (kind) {
      case 'success':
        return 'text-emerald-600';
      case 'error':
        return 'text-danger';
      case 'warning':
        return 'text-warning';
      default:
        return 'text-ink-500';
    }
  }

  borderClass(kind: ToastKind): string {
    switch (kind) {
      case 'success':
        return 'border-emerald-100';
      case 'error':
        return 'border-red-100';
      case 'warning':
        return 'border-amber-100';
      default:
        return 'border-ink-100';
    }
  }
}
