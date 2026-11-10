import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Paged, ReturnRequest } from '../../../core/models/api.models';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { refundDestinationLabel, returnStatusClass } from '../../../shared/utils/status';

const RETURN_STATUSES = ['Requested', 'Approved', 'Received', 'Refunded', 'Rejected'];

const RETURN_TRANSITIONS: Record<string, string[]> = {
  Requested: ['Approved', 'Rejected'],
  Approved: ['Received', 'Refunded', 'Rejected'],
  Received: ['Refunded'],
  Refunded: [],
  Rejected: []
};

@Component({
  selector: 'app-admin-returns',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Icon, Pagination, MoneyPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Sales</p>
          <h2 class="admin-title">Returns & refunds</h2>
          <p class="mt-1 text-sm text-ink-500">Approve returns, verify received items and refund to money or voucher points.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_200px_auto]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Order number, customer or email" />
          </div>
          <select class="input" [value]="status()" (change)="onStatusChange($event)">
            <option value="">All return statuses</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
          <button type="button" class="btn-ghost btn-sm" (click)="clearFilters()">
            <app-icon name="rotate-ccw" [size]="14" /> Reset
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="grid items-start gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div class="space-y-4">
            <div class="admin-card overflow-hidden p-0">
              <ul class="divide-y divide-ink-100">
                @for (item of items(); track item.id) {
                  <li>
                    <button
                      type="button"
                      class="w-full px-5 py-4 text-left transition hover:bg-cream/60"
                      [class.bg-cream]="selected()?.id === item.id"
                      (click)="select(item)"
                    >
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p class="text-sm font-semibold text-ink-900">{{ item.orderNumber }}</p>
                          <p class="text-xs text-ink-500">{{ item.customerName }} · {{ item.customerEmail }}</p>
                        </div>
                        <span [class]="statusClass(item.status)">{{ item.status }}</span>
                      </div>
                      <p class="mt-2 line-clamp-1 text-xs text-ink-500">{{ item.reason }} · {{ itemsSummary(item) }}</p>
                      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
                        <span>Requested {{ item.createdAt | date: 'MMM d, y · HH:mm' }}</span>
                        <span>Preference: {{ destinationLabel(item.refundPreference) }}</span>
                        @if (item.refundAmount > 0) {
                          <span class="font-semibold text-ink-600">{{ item.refundAmount | money }}</span>
                        }
                        @if (item.refundPoints > 0) {
                          <span class="font-semibold text-gold-600">{{ item.refundPoints }} pts</span>
                        }
                      </div>
                    </button>
                  </li>
                } @empty {
                  <li class="px-5 py-12 text-center text-sm text-ink-400">No return requests match these filters.</li>
                }
              </ul>
            </div>

            <app-pagination
              [page]="page()"
              [totalPages]="pagination().totalPages"
              [totalItems]="pagination().totalItems"
              [pageSize]="pagination().pageSize"
              (pageChange)="goTo($event)"
            />
          </div>

          <div class="xl:sticky xl:top-6 xl:self-start">
            @if (!selected()) {
              <div class="admin-card py-16 text-center text-sm text-ink-400">Select a return request to review it.</div>
            } @else if (selected(); as detail) {
              <section class="admin-card space-y-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 class="text-sm font-semibold text-ink-900">Return review</h3>
                    <a [routerLink]="['/admin/orders', detail.orderId]" class="text-xs font-medium text-gold-600 hover:underline">
                      Order {{ detail.orderNumber }}
                    </a>
                  </div>
                  <span [class]="statusClass(detail.status)">{{ detail.status }}</span>
                </div>

                <div class="rounded-xl bg-cream p-3 text-xs text-ink-600">
                  <p class="font-semibold text-ink-800">{{ detail.customerName }} · {{ detail.customerEmail }}</p>
                  <p class="mt-1"><span class="font-medium text-ink-700">Reason:</span> {{ detail.reason }}</p>
                  @if (detail.comment) {
                    <p class="mt-1">“{{ detail.comment }}”</p>
                  }
                </div>

                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Items</p>
                  <ul class="mt-2 divide-y divide-ink-100 text-xs">
                    @for (line of detail.items; track line.productId + '-' + (line.variantId ?? '')) {
                      <li class="flex items-center justify-between gap-2 py-2">
                        <div>
                          <p class="font-medium text-ink-800">{{ line.productName }}</p>
                          <p class="text-ink-400">{{ line.variantName || line.sku }} · Qty {{ line.quantity }}</p>
                        </div>
                        <span class="font-semibold text-ink-900">{{ line.lineTotal | money }}</span>
                      </li>
                    }
                  </ul>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p class="text-[10px] uppercase tracking-wider text-ink-400">Refund preference</p>
                    <p class="mt-1 font-medium text-ink-800">{{ destinationLabel(detail.refundPreference) }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] uppercase tracking-wider text-ink-400">Estimated refund</p>
                    <p class="mt-1 font-semibold text-ink-900">{{ detail.refundAmount | money }}</p>
                  </div>
                  @if (detail.refundAccountNumber || detail.refundAccountName) {
                    <div class="col-span-2 rounded-lg border border-ink-100 p-2">
                      <p class="text-[10px] uppercase tracking-wider text-ink-400">Customer account</p>
                      <p class="mt-1 text-ink-800">{{ detail.refundAccountName || '—' }}</p>
                      <p class="text-ink-600">
                        {{ detail.refundAccountNumber || '—' }}
                        @if (detail.refundBankName) {
                          · {{ detail.refundBankName }}
                        }
                      </p>
                    </div>
                  }
                  @if (detail.refundMethod) {
                    <div class="col-span-2 rounded-lg bg-emerald-50 p-2 text-emerald-800">
                      Refunded via {{ destinationLabel(detail.refundMethod) }}
                      @if (detail.refundReference) {
                        · {{ detail.refundReference }}
                      }
                      · {{ detail.refundAmount | money }}
                      @if (detail.refundPoints > 0) {
                        · {{ detail.refundPoints }} pts
                      }
                    </div>
                  }
                  @if (detail.adminNote) {
                    <div class="col-span-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                      <span class="font-semibold">Admin note:</span> {{ detail.adminNote }}
                    </div>
                  }
                </div>

                @if (nextStatuses(detail).length) {
                  <form [formGroup]="actionForm" class="space-y-3 border-t border-ink-100 pt-4" (ngSubmit)="submitAction(detail)">
                    <div>
                      <label class="label" for="return-status">Move to</label>
                      <select id="return-status" formControlName="status" class="input">
                        @for (option of nextStatuses(detail); track option) {
                          <option [value]="option">{{ option }}</option>
                        }
                      </select>
                    </div>

                    @if (actionForm.controls.status.value === 'Refunded') {
                      <div>
                        <label class="label" for="return-destination">Refund destination</label>
                        <select id="return-destination" formControlName="destination" class="input">
                          <option value="Original">Original payment method</option>
                          <option value="bKash">bKash</option>
                          <option value="Nagad">Nagad</option>
                          <option value="Rocket">Rocket</option>
                          <option value="BankTransfer">Bank transfer</option>
                          <option value="Voucher">Voucher points</option>
                        </select>
                      </div>
                      @if (actionForm.controls.destination.value !== 'Original' && actionForm.controls.destination.value !== 'Voucher') {
                        <div class="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label class="label" for="return-account-name">Account name</label>
                            <input id="return-account-name" formControlName="accountName" class="input" />
                          </div>
                          <div>
                            <label class="label" for="return-account-number">Account / mobile number *</label>
                            <input id="return-account-number" formControlName="accountNumber" class="input" />
                          </div>
                          @if (actionForm.controls.destination.value === 'BankTransfer') {
                            <div class="sm:col-span-2">
                              <label class="label" for="return-bank">Bank name *</label>
                              <input id="return-bank" formControlName="bankName" class="input" />
                            </div>
                          }
                        </div>
                      }
                      <div>
                        <label class="label" for="return-reference">Transaction reference</label>
                        <input id="return-reference" formControlName="reference" class="input" placeholder="Trx ID / reference" />
                      </div>
                    }

                    <div>
                      <label class="label" for="return-note">Admin note</label>
                      <input id="return-note" formControlName="adminNote" class="input" placeholder="Internal note for this return" />
                    </div>

                    <button type="submit" class="btn-primary w-full" [disabled]="saving()">
                      <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Update return' }}
                    </button>
                  </form>
                } @else {
                  <p class="rounded-xl bg-ink-50 px-3 py-3 text-xs text-ink-500">
                    This return is {{ detail.status.toLowerCase() }}. No further actions are available.
                  </p>
                }
              </section>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdminReturns implements OnInit {
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly statuses = RETURN_STATUSES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly status = signal('');
  readonly items = signal<ReturnRequest[]>([]);
  readonly pagination = signal<Paged<ReturnRequest>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly selected = signal<ReturnRequest | null>(null);
  readonly saving = signal(false);

  readonly actionForm = this.fb.nonNullable.group({
    status: [''],
    destination: ['Original'],
    accountName: [''],
    accountNumber: [''],
    bankName: [''],
    reference: [''],
    adminNote: ['']
  });

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
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
    this.orders
      .adminReturns({
        page: this.page(),
        pageSize: 10,
        search: this.search.value.trim() || undefined,
        status: this.status() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
          const current = this.selected();
          if (current) {
            const fresh = result.items.find((item) => item.id === current.id);
            if (fresh) this.select(fresh);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load returns');
        }
      });
  }

  onStatusChange(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.search.reset();
    this.status.set('');
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  select(item: ReturnRequest): void {
    this.selected.set(item);
    const next = this.nextStatuses(item);
    this.actionForm.reset({
      status: next[0] ?? '',
      destination: item.refundPreference || 'Original',
      accountName: item.refundAccountName ?? '',
      accountNumber: item.refundAccountNumber ?? '',
      bankName: item.refundBankName ?? '',
      reference: '',
      adminNote: item.adminNote ?? ''
    });
  }

  nextStatuses(item: ReturnRequest): string[] {
    return RETURN_TRANSITIONS[item.status] ?? [];
  }

  submitAction(detail: ReturnRequest): void {
    if (this.saving()) return;
    const value = this.actionForm.getRawValue();
    if (!value.status) return;
    if (value.status === 'Refunded') {
      if (value.destination === 'Voucher' && !detail.userId) {
        this.toast.error('Voucher refunds require a registered customer account');
        return;
      }
      if (value.destination !== 'Original' && value.destination !== 'Voucher' && !value.accountNumber.trim()) {
        this.toast.error('Enter the refund account or mobile number');
        return;
      }
      if (value.destination === 'BankTransfer' && !value.bankName.trim()) {
        this.toast.error('Enter the bank name for the transfer');
        return;
      }
    }

    const refunding = value.status === 'Refunded';
    this.saving.set(true);
    this.orders
      .updateReturn(detail.id, {
        status: value.status,
        adminNote: value.adminNote.trim() || null,
        destination: refunding ? value.destination : null,
        accountName: refunding ? value.accountName.trim() || null : null,
        accountNumber: refunding ? value.accountNumber.trim() || null : null,
        bankName: refunding ? value.bankName.trim() || null : null,
        reference: refunding ? value.reference.trim() || null : null
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.items.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          this.select(updated);
          this.toast.success(`Return marked as ${updated.status}`);
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to update return');
        }
      });
  }

  itemsSummary(item: ReturnRequest): string {
    const quantity = item.items.reduce((total, line) => total + line.quantity, 0);
    return `${quantity} item(s)`;
  }

  statusClass(status: string): string {
    return returnStatusClass(status);
  }

  destinationLabel(destination: string): string {
    return refundDestinationLabel(destination);
  }
}
