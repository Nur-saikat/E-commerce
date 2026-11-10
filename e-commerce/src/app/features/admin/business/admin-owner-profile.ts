import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BusinessDocument,
  OwnerProfile,
  OwnerProfileRequest
} from '../../../core/models/business.models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { DocumentManager } from './document-manager';

interface HistoryRow {
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

@Component({
  selector: 'app-admin-owner-profile',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, DocumentManager],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Business</p>
          <h2 class="admin-title">Owner &amp; business profile</h2>
          <p class="mt-1 text-sm text-ink-500">The full record of the owner, the business identity and supporting documents.</p>
        </div>
        <button type="button" class="btn-primary btn-sm" (click)="save()" [disabled]="saving() || !canManage()">
          <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save profile' }}
        </button>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-96 rounded-xl"></div></div>
      } @else {
        <form [formGroup]="form" class="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div class="space-y-5">
            <section class="admin-card space-y-4">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Identity</h3>
                <p class="text-xs text-ink-400">Legal name, business identity and contact details.</p>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="label" for="fullName">Full name *</label>
                  <input id="fullName" formControlName="fullName" class="input" />
                </div>
                <div>
                  <label class="label" for="businessName">Business name *</label>
                  <input id="businessName" formControlName="businessName" class="input" />
                </div>
                <div>
                  <label class="label" for="designation">Designation *</label>
                  <input id="designation" formControlName="designation" class="input" placeholder="Founder & Owner" />
                </div>
                <div>
                  <label class="label" for="dateOfBirth">Date of birth</label>
                  <input id="dateOfBirth" type="date" formControlName="dateOfBirth" class="input" />
                </div>
                <div>
                  <label class="label" for="email">Email *</label>
                  <input id="email" type="email" formControlName="email" class="input" />
                </div>
                <div>
                  <label class="label" for="phone">Phone *</label>
                  <input id="phone" formControlName="phone" class="input" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label" for="address">Address</label>
                  <input id="address" formControlName="address" class="input" placeholder="Mirpur, Dhaka" />
                </div>
                <div>
                  <label class="label" for="nationalId">National ID</label>
                  <input id="nationalId" formControlName="nationalId" class="input" />
                </div>
                <div>
                  <label class="label" for="tinNumber">TIN</label>
                  <input id="tinNumber" formControlName="tinNumber" class="input" />
                </div>
                <div>
                  <label class="label" for="binNumber">BIN</label>
                  <input id="binNumber" formControlName="binNumber" class="input" />
                </div>
              </div>
              <div>
                <label class="label" for="bio">Business bio</label>
                <textarea id="bio" rows="4" formControlName="bio" class="input resize-y" placeholder="What the business does, its history and positioning…"></textarea>
              </div>
            </section>

            <section class="admin-card space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-ink-900">Career history</h3>
                  <p class="text-xs text-ink-400">Previous roles and experience that shaped the business.</p>
                </div>
                <button type="button" class="btn-outline btn-sm" (click)="addHistory()" [disabled]="!canManage()">
                  <app-icon name="plus" [size]="14" /> Add role
                </button>
              </div>

              <div class="space-y-3">
                @for (row of history(); track $index) {
                  <div class="rounded-xl border border-ink-100 p-3">
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label class="label">Company</label>
                        <input class="input" [value]="row.company" (input)="updateHistory($index, 'company', $event)" placeholder="Company name" />
                      </div>
                      <div>
                        <label class="label">Role</label>
                        <input class="input" [value]="row.role" (input)="updateHistory($index, 'role', $event)" placeholder="Job title" />
                      </div>
                      <div>
                        <label class="label">Location</label>
                        <input class="input" [value]="row.location" (input)="updateHistory($index, 'location', $event)" placeholder="City" />
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class="label">Start</label>
                          <input type="date" class="input" [value]="row.startDate" (input)="updateHistory($index, 'startDate', $event)" />
                        </div>
                        <div>
                          <label class="label">End</label>
                          <input type="date" class="input" [value]="row.endDate" (input)="updateHistory($index, 'endDate', $event)" />
                        </div>
                      </div>
                      <div class="sm:col-span-2">
                        <label class="label">Description</label>
                        <input class="input" [value]="row.description" (input)="updateHistory($index, 'description', $event)" placeholder="Key responsibilities" />
                      </div>
                    </div>
                    <div class="mt-2 flex justify-end">
                      <button type="button" class="text-xs font-medium text-danger" (click)="removeHistory($index)" [disabled]="!canManage()">
                        Remove role
                      </button>
                    </div>
                  </div>
                } @empty {
                  <p class="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-xs text-ink-400">
                    No career history added yet.
                  </p>
                }
              </div>
            </section>
          </div>

          <section class="admin-card h-fit">
            <app-document-manager
              heading="Business documents"
              hint="Trade licence, TIN/BIN certificates, NID, contracts and CVs. Up to 10 MB each."
              category="Certificate"
              [documents]="documents()"
              [canManage]="canManage()"
              (documentsChange)="documents.set($event)"
            />
            <div class="mt-5 rounded-xl bg-ink-50 px-3 py-3 text-xs text-ink-500">
              <p class="font-medium text-ink-700">Why this matters</p>
              <p class="mt-1">Every document here is visible to administrators inside the business account. Files are stored under a private documents path and validated by file signature.</p>
            </div>
          </section>
        </form>
      }
    </div>
  `
})
export class AdminOwnerProfile implements OnInit {
  private readonly business = inject(BusinessService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly documents = signal<BusinessDocument[]>([]);
  readonly history = signal<HistoryRow[]>([]);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    businessName: ['', Validators.required],
    designation: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: [''],
    dateOfBirth: [''],
    nationalId: [''],
    tinNumber: [''],
    binNumber: [''],
    bio: ['']
  });

  ngOnInit(): void {
    this.business.profile().subscribe({
      next: (profile) => {
        this.patch(profile);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load business profile');
      }
    });
  }

  canManage(): boolean {
    return this.auth.hasPermission('business.manage');
  }

  addHistory(): void {
    this.history.update((rows) => [
      ...rows,
      { company: '', role: '', location: '', startDate: '', endDate: '', description: '' }
    ]);
  }

  updateHistory(index: number, field: keyof HistoryRow, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.history.update((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  removeHistory(index: number): void {
    this.history.update((rows) => rows.filter((_, i) => i !== index));
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const request: OwnerProfileRequest = {
      fullName: value.fullName.trim(),
      businessName: value.businessName.trim(),
      designation: value.designation.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      address: value.address.trim() || null,
      dateOfBirth: value.dateOfBirth || null,
      nationalId: value.nationalId.trim() || null,
      tinNumber: value.tinNumber.trim() || null,
      binNumber: value.binNumber.trim() || null,
      bio: value.bio.trim() || null,
      employmentHistory: this.history().map((row) => ({
        company: row.company.trim(),
        role: row.role.trim(),
        location: row.location.trim() || null,
        startDate: row.startDate,
        endDate: row.endDate || null,
        description: row.description.trim() || null
      })),
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
    this.business.saveProfile(request).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.patch(profile);
        this.toast.success('Business profile saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save business profile');
      }
    });
  }

  private patch(profile: OwnerProfile): void {
    this.form.reset({
      fullName: profile.fullName ?? '',
      businessName: profile.businessName ?? '',
      designation: profile.designation ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      address: profile.address ?? '',
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
      nationalId: profile.nationalId ?? '',
      tinNumber: profile.tinNumber ?? '',
      binNumber: profile.binNumber ?? '',
      bio: profile.bio ?? ''
    });
    this.documents.set(profile.documents ?? []);
    this.history.set(
      (profile.employmentHistory ?? []).map((entry) => ({
        company: entry.company,
        role: entry.role,
        location: entry.location ?? '',
        startDate: entry.startDate ? entry.startDate.slice(0, 10) : '',
        endDate: entry.endDate ? entry.endDate.slice(0, 10) : '',
        description: entry.description ?? ''
      }))
    );
  }
}
