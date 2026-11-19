import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CapitalEntry, CapitalEntryRequest, CAPITAL_TYPES } from '../../../core/models/business.models';
import { Paged } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-investments',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Investments &amp; capital</h2>
          <p class="mt-1 text-sm text-ink-500">Owner capital, withdrawals and loans that fund the business.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="plus" [size]="14" /> Add entry
          </button>
        }
      </div>

      @if (overview(); as summary) {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Capital invested</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.capitalInvested | money }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Withdrawn</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.capitalWithdrawn | money }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net capital</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.netCapital | money }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Stock purchases</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.totalPurchases | money }}</p>
            <p class="mt-1 text-xs text-ink-400">Tracked through product arrivals</p>
          </div>
        </div>
      }

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_1fr_1fr]">
          <select class="input" [value]="type()" (change)="setType($event)">
            <option value="">All types</option>
            @for (option of types; track option) {
              <option [value]="option">{{ typeLabel(option) }}</option>
            }
          </select>
          <div></div>
          <div>
            <label class="label" for="from">From</label>
            <input id="from" type="date" class="input" [value]="from()" (change)="setFrom($event)" />
          </div>
          <div>
            <label class="label" for="to">To</label>
            <input id="to" type="date" class="input" [value]="to()" (change)="setTo($event)" />
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Date</th>
                <th>Type</th>
                <th>Source</th>
                <th>Payment method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of items(); track entry.id) {
                <tr>
                  <td class="pl-5 whitespace-nowrap text-sm text-ink-700">{{ entry.entryDate | date: 'MMM d, y' }}</td>
                  <td><span [class]="typeClass(entry.type)">{{ typeLabel(entry.type) }}</span></td>
                  <td class="text-sm text-ink-700">{{ entry.source }}</td>
                  <td class="text-xs text-ink-500">{{ entry.paymentMethod }}</td>
                  <td class="text-xs text-ink-500">{{ entry.reference || '—' }}</td>
                  <td [class]="amountClass(entry.type)">
                    {{ entry.type === 'Withdrawal' || entry.type === 'LoanRepayment' ? '−' : '+' }}{{ entry.amount | money }}
                  </td>
                  <td class="pr-5 text-right">
                    @if (canManage()) {
                      <div class="flex justify-end gap-1.5">
                        <button type="button" class="btn-outline btn-sm" (click)="openEdit(entry)">
                          <app-icon name="edit" [size]="13" />
                        </button>
                        <button type="button" class="btn-outline btn-sm text-danger" (click)="remove(entry)">
                          <app-icon name="trash" [size]="13" />
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-sm text-ink-400">No capital entries in this period.</td></tr>
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

      @if (editorOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm" (click)="closeEditor()">
          <form [formGroup]="form" class="card w-full max-w-lg p-6" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">{{ editing() ? 'Edit capital entry' : 'Add capital entry' }}</h3>
                <p class="mt-1 text-sm text-ink-500">Amounts in {{ 'store currency' }}.</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>
            <div class="mt-5 space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="type">Type</label>
                  <select id="type" formControlName="type" class="input">
                    @for (option of types; track option) {
                      <option [value]="option">{{ typeLabel(option) }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="amount">Amount *</label>
                  <input id="amount" type="number" min="0.01" step="0.01" formControlName="amount" class="input" />
                </div>
                <div>
                  <label class="label" for="source">Source *</label>
                  <input id="source" formControlName="source" class="input" placeholder="Owner, bank, investor…" />
                </div>
                <div>
                  <label class="label" for="paymentMethod">Payment method</label>
                  <input id="paymentMethod" formControlName="paymentMethod" class="input" placeholder="Bank transfer" />
                </div>
                <div>
                  <label class="label" for="entryDate">Date *</label>
                  <input id="entryDate" type="date" formControlName="entryDate" class="input" />
                </div>
                <div>
                  <label class="label" for="reference">Reference</label>
                  <input id="reference" formControlName="reference" class="input" placeholder="Transaction ID" />
                </div>
              </div>
              <div>
                <label class="label" for="note">Note</label>
                <textarea id="note" rows="2" formControlName="note" class="input resize-y"></textarea>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Save entry' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminInvestments implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly types = CAPITAL_TYPES;
  readonly items = signal<CapitalEntry[]>([]);
  readonly pagination = signal<Paged<CapitalEntry>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly type = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly overview = signal<{
    capitalInvested: number;
    capitalWithdrawn: number;
    netCapital: number;
    totalPurchases: number;
  } | null>(null);

  readonly editorOpen = signal(false);
  readonly editing = signal<CapitalEntry | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    type: ['Investment', Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    source: ['Owner', Validators.required],
    paymentMethod: ['Bank Transfer'],
    entryDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reference: [''],
    note: ['']
  });

  ngOnInit(): void {
    this.load();
    this.loadSummary();
  }

  canManage(): boolean {
    return this.auth.hasPermission('business.manage');
  }

  loadSummary(): void {
    this.business.overview().subscribe({
      next: (overview) =>
        this.overview.set({
          capitalInvested: overview.capitalInvested,
          capitalWithdrawn: overview.capitalWithdrawn,
          netCapital: overview.netCapital,
          totalPurchases: overview.totalPurchases
        }),
      error: () => undefined
    });
  }

  load(): void {
    this.loading.set(true);
    this.business
      .capital({
        page: this.page(),
        pageSize: 10,
        type: this.type() || undefined,
        from: this.from() || undefined,
        to: this.to() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load capital entries');
        }
      });
  }

  setType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  setFrom(event: Event): void {
    this.from.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.load();
  }

  setTo(event: Event): void {
    this.to.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({
      type: 'Investment',
      amount: 0,
      source: 'Owner',
      paymentMethod: 'Bank Transfer',
      entryDate: new Date().toISOString().slice(0, 10),
      reference: '',
      note: ''
    });
    this.editorOpen.set(true);
  }

  openEdit(entry: CapitalEntry): void {
    this.editing.set(entry);
    this.form.reset({
      type: entry.type,
      amount: entry.amount,
      source: entry.source,
      paymentMethod: entry.paymentMethod,
      entryDate: entry.entryDate.slice(0, 10),
      reference: entry.reference ?? '',
      note: entry.note ?? ''
    });
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: CapitalEntryRequest = {
      type: value.type,
      amount: Number(value.amount),
      source: value.source.trim(),
      paymentMethod: value.paymentMethod.trim(),
      reference: value.reference.trim() || null,
      note: value.note.trim() || null,
      entryDate: value.entryDate
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current ? this.business.updateCapital(current.id, request) : this.business.createCapital(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Capital entry updated' : 'Capital entry added');
        this.closeEditor();
        this.load();
        this.loadSummary();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save capital entry');
      }
    });
  }

  async remove(entry: CapitalEntry): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete capital entry',
      message: `${this.typeLabel(entry.type)} of ${entry.amount} will be removed from the ledger.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.business.deleteCapital(entry.id).subscribe({
      next: () => {
        this.toast.success('Capital entry deleted');
        this.load();
        this.loadSummary();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete capital entry')
    });
  }

  typeLabel(type: string): string {
    if (type === 'LoanRepayment') return 'Loan repayment';
    return type;
  }

  typeClass(type: string): string {
    if (type === 'Investment') return 'badge-success';
    if (type === 'Withdrawal') return 'badge-warning';
    if (type === 'Loan') return 'badge-gold';
    return 'badge-muted';
  }

  amountClass(type: string): string {
    const base = 'text-sm font-semibold ';
    return base + (type === 'Withdrawal' || type === 'LoanRepayment' ? 'text-danger' : 'text-ink-900');
  }
}
