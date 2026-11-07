import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditLog, Paged } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">System</p>
          <h2 class="admin-title">Audit logs</h2>
          <p class="mt-1 text-sm text-ink-500">An immutable trail of sensitive actions across the admin console.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card">
        <div class="relative max-w-md">
          <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input [formControl]="search" type="search" class="input pl-9" placeholder="Search action, entity or user" />
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP address</th>
              </tr>
            </thead>
            <tbody>
              @for (log of items(); track log.id) {
                <tr>
                  <td class="pl-5 whitespace-nowrap text-xs text-ink-500">{{ log.createdAt | date: 'MMM d, y · HH:mm:ss' }}</td>
                  <td class="text-sm text-ink-800">{{ log.userEmail || 'system' }}</td>
                  <td>
                    <span class="badge-muted font-mono text-[10px]">{{ log.action }}</span>
                  </td>
                  <td>
                    <p class="text-sm text-ink-700">{{ log.entity }}</p>
                    @if (log.entityId) {
                      <p class="max-w-[220px] truncate font-mono text-[10px] text-ink-400">{{ log.entityId }}</p>
                    }
                  </td>
                  <td class="font-mono text-xs text-ink-500">{{ log.ipAddress || '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="py-10 text-center text-sm text-ink-400">No audit activity recorded.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <app-pagination
          [page]="page()"
          [totalPages]="pagination().totalPages"
          [totalItems]="pagination().totalItems"
          [pageSize]="pagination().pageSize"
          (pageChange)="goTo($event)"
        />
      }
    </div>
  `
})
export class AdminAudit implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<AuditLog[]>([]);
  readonly pagination = signal<Paged<AuditLog>['pagination']>({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.admin.auditLogs({ page: this.page(), pageSize: 20, search: this.search.value.trim() || undefined }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load audit logs');
      }
    });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }
}
