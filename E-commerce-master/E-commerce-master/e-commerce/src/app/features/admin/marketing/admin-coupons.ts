import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Coupon, CouponRequest, Paged } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Sales</p>
          <h2 class="admin-title">Coupons</h2>
          <p class="mt-1 text-sm text-ink-500">Percentage or fixed discounts with usage controls.</p>
        </div>
        <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
          <app-icon name="plus" [size]="14" /> New coupon
        </button>
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" class="admin-card space-y-4" (ngSubmit)="save()">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-ink-900">{{ editing() ? 'Edit coupon' : 'New coupon' }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeForm()" aria-label="Close">
              <app-icon name="x" [size]="16" />
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label class="label" for="code">Code *</label>
              <input id="code" formControlName="code" class="input uppercase" placeholder="WELCOME10" />
            </div>
            <div>
              <label class="label" for="type">Type *</label>
              <select id="type" formControlName="type" class="input">
                <option value="Percentage">Percentage</option>
                <option value="Fixed">Fixed amount</option>
              </select>
            </div>
            <div>
              <label class="label" for="value">Value *</label>
              <input id="value" type="number" min="0.01" step="0.01" formControlName="value" class="input" />
            </div>
            <div>
              <label class="label" for="minimum">Minimum spend</label>
              <input id="minimum" type="number" min="0" step="0.01" formControlName="minimumPurchase" class="input" />
            </div>
            <div>
              <label class="label" for="maximum">Max discount</label>
              <input id="maximum" type="number" min="0" step="0.01" formControlName="maximumDiscount" class="input" placeholder="Optional" />
            </div>
            <div>
              <label class="label" for="usageLimit">Total uses</label>
              <input id="usageLimit" type="number" min="1" step="1" formControlName="usageLimit" class="input" placeholder="Unlimited" />
            </div>
            <div>
              <label class="label" for="perUser">Per customer</label>
              <input id="perUser" type="number" min="1" step="1" formControlName="perUserLimit" class="input" />
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Active
              </label>
            </div>
            <div>
              <label class="label" for="startsAt">Starts</label>
              <input id="startsAt" type="datetime-local" formControlName="startsAt" class="input" />
            </div>
            <div>
              <label class="label" for="expiresAt">Expires</label>
              <input id="expiresAt" type="datetime-local" formControlName="expiresAt" class="input" />
            </div>
            <div class="md:col-span-2 lg:col-span-2">
              <label class="label" for="description">Description</label>
              <input id="description" formControlName="description" class="input" placeholder="Shown at checkout" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="closeForm()">Cancel</button>
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save coupon' }}
            </button>
          </div>
        </form>
      }

      <div class="admin-card">
        <div class="relative max-w-md">
          <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input [formControl]="search" type="search" class="input pl-9" placeholder="Search coupon code" />
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Code</th>
                <th>Discount</th>
                <th>Minimum</th>
                <th>Usage</th>
                <th>Validity</th>
                <th>Status</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (coupon of items(); track coupon.id) {
                <tr>
                  <td class="pl-5">
                    <p class="font-mono text-sm font-semibold text-ink-900">{{ coupon.code }}</p>
                    <p class="max-w-[220px] truncate text-xs text-ink-400">{{ coupon.description || '—' }}</p>
                  </td>
                  <td class="text-sm text-ink-800">
                    @if (coupon.type === 'Percentage') {
                      {{ coupon.value }}%
                    } @else {
                      {{ coupon.value | money }} off
                    }
                    @if (coupon.maximumDiscount) {
                      <p class="text-[11px] text-ink-400">max {{ coupon.maximumDiscount | money }}</p>
                    }
                  </td>
                  <td class="text-sm text-ink-600">{{ coupon.minimumPurchase | money }}</td>
                  <td class="text-sm text-ink-600">
                    {{ coupon.usedCount }}{{ coupon.usageLimit ? ' / ' + coupon.usageLimit : '' }}
                    <p class="text-[11px] text-ink-400">{{ coupon.perUserLimit }} per customer</p>
                  </td>
                  <td class="text-xs text-ink-500">
                    @if (coupon.startsAt || coupon.expiresAt) {
                      <p>{{ coupon.startsAt ? (coupon.startsAt | date: 'MMM d, y') : 'Now' }}</p>
                      <p>→ {{ coupon.expiresAt ? (coupon.expiresAt | date: 'MMM d, y') : 'No expiry' }}</p>
                    } @else {
                      Always available
                    }
                  </td>
                  <td>
                    <span [class]="coupon.isValid ? 'badge-success' : coupon.isActive ? 'badge-warning' : 'badge-muted'">
                      {{ coupon.isValid ? 'Live' : coupon.isActive ? 'Scheduled / expired' : 'Paused' }}
                    </span>
                  </td>
                  <td class="pr-5">
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" (click)="openEdit(coupon)" title="Edit">
                        <app-icon name="edit" [size]="15" />
                      </button>
                      <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-danger" (click)="remove(coupon)" title="Delete">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-sm text-ink-400">No coupons yet. Launch a promotion to get started.</td></tr>
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
export class AdminCoupons implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly search = new FormControl('', { nonNullable: true });
  readonly items = signal<Coupon[]>([]);
  readonly pagination = signal<Paged<Coupon>['pagination']>({ page: 1, pageSize: 12, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly formOpen = signal(false);
  readonly editing = signal<Coupon | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/), Validators.maxLength(40)]],
    description: [''],
    type: ['Percentage', Validators.required],
    value: [10, [Validators.required, Validators.min(0.01)]],
    minimumPurchase: [0, [Validators.min(0)]],
    maximumDiscount: this.fb.control<number | null>(null),
    startsAt: [''],
    expiresAt: [''],
    usageLimit: this.fb.control<number | null>(null),
    perUserLimit: [1, [Validators.required, Validators.min(1)]],
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
    this.admin.coupons({ page: this.page(), pageSize: 12, search: this.search.value.trim() || undefined }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load coupons');
      }
    });
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      code: '',
      description: '',
      type: 'Percentage',
      value: 10,
      minimumPurchase: 0,
      maximumDiscount: null,
      startsAt: '',
      expiresAt: '',
      usageLimit: null,
      perUserLimit: 1,
      isActive: true
    });
    this.formOpen.set(true);
  }

  openEdit(coupon: Coupon): void {
    this.editing.set(coupon);
    this.form.reset({
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minimumPurchase: coupon.minimumPurchase,
      maximumDiscount: coupon.maximumDiscount ?? null,
      startsAt: this.toLocalInput(coupon.startsAt),
      expiresAt: this.toLocalInput(coupon.expiresAt),
      usageLimit: coupon.usageLimit ?? null,
      perUserLimit: coupon.perUserLimit,
      isActive: coupon.isActive
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Complete the required coupon fields');
      return;
    }
    const value = this.form.getRawValue();
    if (value.type === 'Percentage' && value.value > 100) {
      this.toast.error('Percentage discounts cannot exceed 100');
      return;
    }
    const startsAt = value.startsAt ? new Date(value.startsAt) : null;
    const expiresAt = value.expiresAt ? new Date(value.expiresAt) : null;
    if (startsAt && expiresAt && expiresAt <= startsAt) {
      this.toast.error('Expiry must be after the start date');
      return;
    }
    const request: CouponRequest = {
      code: value.code.trim().toUpperCase(),
      description: value.description.trim(),
      type: value.type,
      value: Number(value.value),
      minimumPurchase: Number(value.minimumPurchase) || 0,
      maximumDiscount: value.maximumDiscount && value.maximumDiscount > 0 ? value.maximumDiscount : null,
      startsAt: startsAt ? startsAt.toISOString() : null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      usageLimit: value.usageLimit && value.usageLimit > 0 ? value.usageLimit : null,
      perUserLimit: Number(value.perUserLimit) || 1,
      userIds: this.editing()?.userIds ?? [],
      isActive: value.isActive
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current ? this.admin.updateCoupon(current.id, request) : this.admin.createCoupon(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Coupon updated' : 'Coupon created');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save coupon');
      }
    });
  }

  async remove(coupon: Coupon): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete coupon',
      message: `Delete the coupon “${coupon.code}”? Existing orders keep their discount.`,
      confirmText: 'Delete coupon',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteCoupon(coupon.id).subscribe({
      next: () => {
        this.toast.success('Coupon deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete coupon')
    });
  }

  private toLocalInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
