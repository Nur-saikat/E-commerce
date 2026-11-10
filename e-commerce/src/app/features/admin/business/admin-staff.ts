import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  BusinessDocument,
  EMPLOYMENT_TYPES,
  STAFF_STATUSES,
  StaffMember,
  StaffRequest
} from '../../../core/models/business.models';
import { Paged } from '../../../core/models/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { DocumentManager } from './document-manager';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, MoneyPipe, DatePipe, DocumentManager],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Staff &amp; hiring records</h2>
          <p class="mt-1 text-sm text-ink-500">Employment records, salaries and CVs for everyone on the team.</p>
        </div>
        @if (canManage()) {
          <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="plus" [size]="14" /> Add staff
          </button>
        }
      </div>

      <div class="admin-card">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div class="relative">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input pl-9" placeholder="Search name, email, code or designation" />
          </div>
          <select class="input" [value]="status()" (change)="setStatus($event)">
            <option value="">All statuses</option>
            @for (option of statuses; track option) {
              <option [value]="option">{{ option }}</option>
            }
          </select>
          <input [formControl]="department" class="input" placeholder="Filter department" />
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Employee</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Joined</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Docs</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (member of items(); track member.id) {
                <tr>
                  <td class="pl-5">
                    <p class="text-sm font-semibold text-ink-900">{{ member.fullName }}</p>
                    <p class="text-xs text-ink-400">{{ member.employeeCode }} · {{ member.employmentType }}</p>
                  </td>
                  <td>
                    <p class="text-sm text-ink-800">{{ member.designation }}</p>
                    <p class="text-xs text-ink-400">{{ member.department }}</p>
                  </td>
                  <td>
                    <p class="text-xs text-ink-700">{{ member.email }}</p>
                    <p class="text-xs text-ink-400">{{ member.phone }}</p>
                  </td>
                  <td class="whitespace-nowrap text-xs text-ink-500">{{ member.joinedOn | date: 'MMM d, y' }}</td>
                  <td class="text-sm text-ink-700">{{ member.salary | money }}</td>
                  <td><span [class]="statusClass(member.status)">{{ statusLabel(member.status) }}</span></td>
                  <td class="text-xs text-ink-500">{{ member.documents.length }}</td>
                  <td class="pr-5">
                    <div class="flex justify-end gap-1.5">
                      <button type="button" class="btn-outline btn-sm" (click)="openEdit(member)" [disabled]="!canManage()">
                        <app-icon name="edit" [size]="13" />
                      </button>
                      <button type="button" class="btn-outline btn-sm text-danger" (click)="remove(member)" [disabled]="!canManage()">
                        <app-icon name="trash" [size]="13" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="py-10 text-center text-sm text-ink-400">No staff records match these filters.</td></tr>
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
        <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 backdrop-blur-sm" (click)="closeEditor()">
          <form [formGroup]="form" class="card my-6 w-full max-w-3xl p-6" (click)="$event.stopPropagation()" (ngSubmit)="save()">
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-display text-xl font-semibold text-ink-900">{{ editing() ? 'Edit staff member' : 'Add staff member' }}</h3>
                <p class="mt-1 text-sm text-ink-500">Employment details, emergency contact and documents.</p>
              </div>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
                <app-icon name="x" [size]="18" />
              </button>
            </div>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="fullName">Full name *</label>
                <input id="fullName" formControlName="fullName" class="input" />
              </div>
              <div>
                <label class="label" for="employeeCode">Employee code</label>
                <input id="employeeCode" formControlName="employeeCode" class="input" placeholder="Auto-generated when empty" />
              </div>
              <div>
                <label class="label" for="email">Email *</label>
                <input id="email" type="email" formControlName="email" class="input" />
              </div>
              <div>
                <label class="label" for="phone">Phone *</label>
                <input id="phone" formControlName="phone" class="input" />
              </div>
              <div>
                <label class="label" for="designation">Designation *</label>
                <input id="designation" formControlName="designation" class="input" placeholder="Store Manager" />
              </div>
              <div>
                <label class="label" for="department">Department *</label>
                <input id="department" formControlName="department" class="input" placeholder="Operations" />
              </div>
              <div>
                <label class="label" for="employmentType">Employment type</label>
                <select id="employmentType" formControlName="employmentType" class="input">
                  @for (option of employmentTypes; track option) {
                    <option [value]="option">{{ employmentLabel(option) }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label" for="status">Status</label>
                <select id="status" formControlName="status" class="input">
                  @for (option of statuses; track option) {
                    <option [value]="option">{{ statusLabel(option) }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label" for="joinedOn">Joined on *</label>
                <input id="joinedOn" type="date" formControlName="joinedOn" class="input" />
              </div>
              <div>
                <label class="label" for="leftOn">Left on</label>
                <input id="leftOn" type="date" formControlName="leftOn" class="input" />
              </div>
              <div>
                <label class="label" for="salary">Monthly salary *</label>
                <input id="salary" type="number" min="0" step="0.01" formControlName="salary" class="input" />
              </div>
              <div>
                <label class="label" for="address">Address</label>
                <input id="address" formControlName="address" class="input" />
              </div>
              <div>
                <label class="label" for="emergencyName">Emergency contact</label>
                <input id="emergencyName" formControlName="emergencyContactName" class="input" placeholder="Name" />
              </div>
              <div>
                <label class="label" for="emergencyPhone">Emergency phone</label>
                <input id="emergencyPhone" formControlName="emergencyContactPhone" class="input" />
              </div>
              <div class="sm:col-span-2">
                <label class="label" for="notes">Notes</label>
                <textarea id="notes" rows="2" formControlName="notes" class="input resize-y" placeholder="Responsibilities, probation terms…"></textarea>
              </div>
            </div>

            <div class="mt-6 border-t border-ink-100 pt-5">
              <app-document-manager
                heading="CV & personal documents"
                hint="Attach CVs, NID copies, contracts or certificates. Up to 10 MB each."
                category="CV"
                [documents]="documents()"
                [canManage]="canManage()"
                (documentsChange)="documents.set($event)"
              />
            </div>

            <div class="mt-6 flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="check" [size]="14" /> {{ saving() ? 'Saving…' : 'Save staff member' }}
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `
})
export class AdminStaff implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly statuses = STAFF_STATUSES;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly search = new FormControl('', { nonNullable: true });
  readonly department = new FormControl('', { nonNullable: true });
  readonly status = signal('');
  readonly items = signal<StaffMember[]>([]);
  readonly pagination = signal<Paged<StaffMember>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly page = signal(1);
  readonly loading = signal(true);

  readonly editorOpen = signal(false);
  readonly editing = signal<StaffMember | null>(null);
  readonly saving = signal(false);
  readonly documents = signal<BusinessDocument[]>([]);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    employeeCode: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    designation: ['', Validators.required],
    department: ['', Validators.required],
    employmentType: ['FullTime'],
    status: ['Active'],
    joinedOn: [this.today(), Validators.required],
    leftOn: [''],
    salary: [0, [Validators.required, Validators.min(0)]],
    address: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    notes: ['']
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
    this.department.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  canManage(): boolean {
    return this.auth.hasPermission('business.manage');
  }

  load(): void {
    this.loading.set(true);
    this.business
      .staff({
        page: this.page(),
        pageSize: 10,
        search: this.search.value.trim() || undefined,
        status: this.status() || undefined,
        department: this.department.value.trim() || undefined
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load staff records');
        }
      });
  }

  setStatus(event: Event): void {
    this.status.set((event.target as HTMLSelectElement).value);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.documents.set([]);
    this.form.reset({
      fullName: '',
      employeeCode: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      employmentType: 'FullTime',
      status: 'Active',
      joinedOn: this.today(),
      leftOn: '',
      salary: 0,
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      notes: ''
    });
    this.editorOpen.set(true);
  }

  openEdit(member: StaffMember): void {
    this.editing.set(member);
    this.documents.set(member.documents ?? []);
    this.form.reset({
      fullName: member.fullName,
      employeeCode: member.employeeCode,
      email: member.email,
      phone: member.phone,
      designation: member.designation,
      department: member.department,
      employmentType: member.employmentType,
      status: member.status,
      joinedOn: this.dateOnly(member.joinedOn),
      leftOn: member.leftOn ? this.dateOnly(member.leftOn) : '',
      salary: member.salary,
      address: member.address ?? '',
      emergencyContactName: member.emergencyContactName ?? '',
      emergencyContactPhone: member.emergencyContactPhone ?? '',
      notes: member.notes ?? ''
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
    const request: StaffRequest = {
      employeeCode: value.employeeCode.trim() || null,
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      designation: value.designation.trim(),
      department: value.department.trim(),
      employmentType: value.employmentType,
      status: value.status,
      joinedOn: value.joinedOn,
      leftOn: value.leftOn || null,
      salary: Number(value.salary),
      address: value.address.trim() || null,
      emergencyContactName: value.emergencyContactName.trim() || null,
      emergencyContactPhone: value.emergencyContactPhone.trim() || null,
      notes: value.notes.trim() || null,
      documents: this.documents().map((document) => ({
        id: document.id,
        title: document.title,
        category: document.category,
        url: document.url,
        fileName: document.fileName,
        size: document.size,
        contentType: document.contentType ?? null
      }))
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current ? this.business.updateStaff(current.id, request) : this.business.createStaff(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Staff member updated' : 'Staff member added');
        this.closeEditor();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save staff member');
      }
    });
  }

  async remove(member: StaffMember): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete staff record',
      message: `${member.fullName} and their attached documents will be removed. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.business.deleteStaff(member.id).subscribe({
      next: () => {
        this.toast.success('Staff record deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete staff record')
    });
  }

  statusLabel(status: string): string {
    if (status === 'OnLeave') return 'On leave';
    return status;
  }

  statusClass(status: string): string {
    if (status === 'Active') return 'badge-success';
    if (status === 'OnLeave') return 'badge-warning';
    return 'badge-muted';
  }

  employmentLabel(type: string): string {
    if (type === 'FullTime') return 'Full time';
    if (type === 'PartTime') return 'Part time';
    return type;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dateOnly(value: string): string {
    return value.slice(0, 10);
  }
}
