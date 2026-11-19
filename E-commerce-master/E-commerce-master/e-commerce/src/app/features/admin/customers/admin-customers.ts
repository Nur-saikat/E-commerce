import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Customer, Paged, UpdateCustomerRequest } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-customers',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Sales</p>
          <h2 class="admin-title">Customers</h2>
          <p class="mt-1 text-sm text-ink-500">Lifetime value, account status and contact details.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_auto]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Search name, email or phone" />
          </div>
          <label class="flex items-center gap-2 rounded-xl border border-ink-200 px-3 text-xs font-medium text-ink-700">
            <input type="checkbox" [checked]="activeOnly()" (change)="toggleActiveOnly($event)" class="accent-ink-900" />
            Active accounts only
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Customer</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Orders</th>
                <th>Lifetime value</th>
                <th>Joined</th>
                <th>Status</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (customer of items(); track customer.id) {
                <tr>
                  <td class="pl-5">
                    <div class="flex items-center gap-3">
                      <span class="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-cream">
                        {{ initials(customer) }}
                      </span>
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-ink-900">{{ customer.fullName }}</p>
                        <p class="truncate text-xs text-ink-400">{{ customer.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="text-xs text-ink-500">{{ customer.phone || '—' }}</td>
                  <td><span class="badge-muted">{{ customer.role }}</span></td>
                  <td class="text-sm text-ink-600">{{ customer.orderCount }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ customer.totalSpent | money }}</td>
                  <td class="text-xs text-ink-500">{{ customer.createdAt | date: 'MMM d, y' }}</td>
                  <td>
                    <div class="flex flex-col items-start gap-1">
                      <span [class]="customer.isActive ? 'badge-success' : 'badge-danger'">
                        {{ customer.isActive ? 'Active' : 'Disabled' }}
                      </span>
                      @if (customer.emailVerified) {
                        <span class="text-[10px] text-ink-400">Email verified</span>
                      }
                    </div>
                  </td>
                  <td class="pr-5 text-right">
                    <button type="button" class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" (click)="openEdit(customer)" title="Edit customer">
                      <app-icon name="edit" [size]="15" />
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="py-10 text-center text-sm text-ink-400">No customers match these filters.</td></tr>
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

      @if (editing(); as customer) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm" (click)="closeEdit()">
          <form [formGroup]="form" class="card w-full max-w-lg p-6" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">Edit customer</h3>
                <p class="mt-1 text-sm text-ink-500">{{ customer.email }}</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEdit()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="firstName">First name *</label>
                <input id="firstName" formControlName="firstName" class="input" />
              </div>
              <div>
                <label class="label" for="lastName">Last name *</label>
                <input id="lastName" formControlName="lastName" class="input" />
              </div>
              <div class="sm:col-span-2">
                <label class="label" for="phone">Phone</label>
                <input id="phone" formControlName="phone" class="input" />
              </div>
              @if (canChangeRoles()) {
                <div class="sm:col-span-2">
                  <label class="label" for="role">Role</label>
                  <select id="role" formControlName="role" class="input">
                    @for (role of roles; track role) {
                      <option [value]="role">{{ role }}</option>
                    }
                  </select>
                  <p class="mt-1 text-xs text-ink-400">Changing a role revokes the customer's active sessions.</p>
                </div>
              }
              <label class="flex items-center gap-2 text-sm text-ink-700 sm:col-span-2">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" />
                Account is active
              </label>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEdit()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save customer' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminCustomers implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly roles = ['Customer', 'Staff', 'Manager', 'Admin', 'SuperAdmin'];
  readonly search = new FormControl('', { nonNullable: true });
  readonly activeOnly = signal(false);
  readonly items = signal<Customer[]>([]);
  readonly pagination = signal<Paged<Customer>['pagination']>({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly editing = signal<Customer | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    role: ['Customer'],
    isActive: [true]
  });

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
    this.admin
      .customers({
        page: this.page(),
        pageSize: 12,
        search: this.search.value.trim() || undefined,
        activeOnly: this.activeOnly() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load customers');
        }
      });
  }

  toggleActiveOnly(event: Event): void {
    this.activeOnly.set((event.target as HTMLInputElement).checked);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openEdit(customer: Customer): void {
    this.editing.set(customer);
    this.form.reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone ?? '',
      role: customer.role,
      isActive: customer.isActive
    });
  }

  closeEdit(): void {
    this.editing.set(null);
  }

  canChangeRoles(): boolean {
    return this.auth.user()?.role === 'SuperAdmin';
  }

  save(): void {
    const customer = this.editing();
    if (!customer) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('First and last name are required');
      return;
    }
    const value = this.form.getRawValue();
    const request: UpdateCustomerRequest = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim() || null,
      isActive: value.isActive,
      role: this.canChangeRoles() && value.role !== customer.role ? value.role : null
    };
    this.saving.set(true);
    this.admin.updateCustomer(customer.id, request).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Customer updated');
        this.closeEdit();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to update customer');
      }
    });
  }

  initials(customer: Customer): string {
    return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();
  }
}
