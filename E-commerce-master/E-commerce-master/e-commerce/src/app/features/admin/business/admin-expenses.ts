import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EXPENSE_CATEGORIES, ExpenseEntry, ExpenseEntryRequest } from '../../../core/models/business.models';
import { Paged } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-admin-expenses',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Expenses</h2>
          <p class="mt-1 text-sm text-ink-500">Operating costs that feed directly into the profit &amp; loss statement.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="plus" [size]="14" /> Add expense
          </button>
        }
      </div>

      @if (overview(); as summary) {
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Lifetime expenses</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.lifetimeExpenses | money }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">This month</p>
            <p class="mt-2 font-display text-2xl font-semibold text-ink-900">{{ summary.monthExpenses | money }}</p>
          </div>
          <div class="admin-card">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Net profit this month</p>
            <p class="mt-2 font-display text-2xl font-semibold" [class.text-danger]="summary.monthNet < 0" [class.text-ink-900]="summary.monthNet >= 0">
              {{ summary.monthNet | money }}
            </p>
          </div>
        </div>
      }

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_1fr_1fr]">
          <select class="input" [value]="category()" (change)="setCategory($event)">
            <option value="">All categories</option>
            @for (option of categories; track option) {
              <option [value]="option">{{ option }}</option>
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
                <th>Expense</th>
                <th>Category</th>
                <th>Paid with</th>
                <th>Amount</th>
                <th>State</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (expense of items(); track expense.id) {
                <tr>
                  <td class="pl-5 whitespace-nowrap text-sm text-ink-700">{{ expense.expenseDate | date: 'MMM d, y' }}</td>
                  <td>
                    <p class="text-sm font-semibold text-ink-900">{{ expense.title }}</p>
                    <p class="text-xs text-ink-400">{{ expense.vendor || expense.reference || '—' }}</p>
                  </td>
                  <td><span class="badge-muted">{{ expense.category }}</span></td>
                  <td class="text-xs text-ink-500">{{ expense.paymentMethod }}</td>
                  <td class="text-sm font-semibold text-ink-900">{{ expense.amount | money }}</td>
                  <td><span [class]="expense.isPaid ? 'badge-success' : 'badge-warning'">{{ expense.isPaid ? 'Paid' : 'Due' }}</span></td>
                  <td class="pr-5 text-right">
                    @if (canManage()) {
                      <div class="flex justify-end gap-1.5">
                        <button type="button" class="btn-outline btn-sm" (click)="openEdit(expense)">
                          <app-icon name="edit" [size]="13" />
                        </button>
                        <button type="button" class="btn-outline btn-sm text-danger" (click)="remove(expense)">
                          <app-icon name="trash" [size]="13" />
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="py-10 text-center text-sm text-ink-400">No expenses in this period.</td></tr>
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
                <h3 class="font-display text-xl font-semibold text-ink-900">{{ editing() ? 'Edit expense' : 'Add expense' }}</h3>
                <p class="mt-1 text-sm text-ink-500">Only expenses marked paid reduce net profit.</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>
            <div class="mt-5 space-y-4">
              <div>
                <label class="label" for="title">Expense title *</label>
                <input id="title" formControlName="title" class="input" placeholder="Shop rent — November" />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="category">Category</label>
                  <select id="category" formControlName="category" class="input">
                    @for (option of categories; track option) {
                      <option [value]="option">{{ option }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="amount">Amount *</label>
                  <input id="amount" type="number" min="0.01" step="0.01" formControlName="amount" class="input" />
                </div>
                <div>
                  <label class="label" for="vendor">Vendor</label>
                  <input id="vendor" formControlName="vendor" class="input" placeholder="Landlord, platform…" />
                </div>
                <div>
                  <label class="label" for="paymentMethod">Paid with</label>
                  <input id="paymentMethod" formControlName="paymentMethod" class="input" placeholder="Cash, bKash, bank…" />
                </div>
                <div>
                  <label class="label" for="expenseDate">Date *</label>
                  <input id="expenseDate" type="date" formControlName="expenseDate" class="input" />
                </div>
                <div>
                  <label class="label" for="reference">Reference</label>
                  <input id="reference" formControlName="reference" class="input" placeholder="Receipt or invoice" />
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isPaid" class="accent-ink-900" /> Already paid
              </label>
              <div>
                <label class="label" for="note">Note</label>
                <textarea id="note" rows="2" formControlName="note" class="input resize-y"></textarea>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Save expense' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminExpenses implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly categories = EXPENSE_CATEGORIES;
  readonly items = signal<ExpenseEntry[]>([]);
  readonly pagination = signal<Paged<ExpenseEntry>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly page = signal(1);
  readonly loading = signal(true);
  readonly category = signal('');
  readonly from = signal('');
  readonly to = signal('');
  readonly overview = signal<{ lifetimeExpenses: number; monthExpenses: number; monthNet: number } | null>(null);

  readonly editorOpen = signal(false);
  readonly editing = signal<ExpenseEntry | null>(null);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    category: ['General'],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    vendor: [''],
    paymentMethod: ['Cash'],
    expenseDate: [new Date().toISOString().slice(0, 10), Validators.required],
    reference: [''],
    isPaid: [true],
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
          lifetimeExpenses: overview.lifetime.expenses,
          monthExpenses: overview.thisMonth.expenses,
          monthNet: overview.thisMonth.netProfit
        }),
      error: () => undefined
    });
  }

  load(): void {
    this.loading.set(true);
    this.business
      .expenses({
        page: this.page(),
        pageSize: 10,
        category: this.category() || undefined,
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
          this.toast.error(err?.error?.message ?? 'Unable to load expenses');
        }
      });
  }

  setCategory(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
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
      title: '',
      category: 'General',
      amount: 0,
      vendor: '',
      paymentMethod: 'Cash',
      expenseDate: new Date().toISOString().slice(0, 10),
      reference: '',
      isPaid: true,
      note: ''
    });
    this.editorOpen.set(true);
  }

  openEdit(expense: ExpenseEntry): void {
    this.editing.set(expense);
    this.form.reset({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      vendor: expense.vendor ?? '',
      paymentMethod: expense.paymentMethod,
      expenseDate: expense.expenseDate.slice(0, 10),
      reference: expense.reference ?? '',
      isPaid: expense.isPaid,
      note: expense.note ?? ''
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
    const request: ExpenseEntryRequest = {
      title: value.title.trim(),
      category: value.category,
      amount: Number(value.amount),
      vendor: value.vendor.trim() || null,
      paymentMethod: value.paymentMethod.trim(),
      expenseDate: value.expenseDate,
      reference: value.reference.trim() || null,
      isPaid: value.isPaid,
      note: value.note.trim() || null
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current ? this.business.updateExpense(current.id, request) : this.business.createExpense(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Expense updated' : 'Expense added');
        this.closeEditor();
        this.load();
        this.loadSummary();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save expense');
      }
    });
  }

  async remove(expense: ExpenseEntry): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete expense',
      message: `${expense.title} (${expense.amount}) will be removed from the ledger.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.business.deleteExpense(expense.id).subscribe({
      next: () => {
        this.toast.success('Expense deleted');
        this.load();
        this.loadSummary();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete expense')
    });
  }
}
