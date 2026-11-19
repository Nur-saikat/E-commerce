import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Brand, BrandRequest } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';

@Component({
  selector: 'app-admin-brands',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, AssetUrlPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 class="admin-title">Brands</h2>
          <p class="mt-1 text-sm text-ink-500">Houses and labels featured across the storefront.</p>
        </div>
        <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
          <app-icon name="plus" [size]="14" /> New brand
        </button>
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" class="admin-card space-y-4" (ngSubmit)="save()">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-ink-900">{{ editing() ? 'Edit brand' : 'New brand' }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeForm()" aria-label="Close">
              <app-icon name="x" [size]="16" />
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-[1fr_160px_180px]">
            <div>
              <label class="label" for="brandName">Name *</label>
              <input id="brandName" formControlName="name" class="input" placeholder="Atelier Nord" />
            </div>
            <div>
              <label class="label" for="brandSort">Sort order</label>
              <input id="brandSort" type="number" formControlName="sortOrder" class="input" />
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Visible
              </label>
            </div>
          </div>
          <div>
            <label class="label" for="brandDescription">Description</label>
            <textarea id="brandDescription" formControlName="description" rows="3" class="input resize-y"></textarea>
          </div>
          <div>
            <label class="label" for="brandLogo">Logo</label>
            <div class="flex gap-2">
              <input id="brandLogo" formControlName="logoUrl" class="input" placeholder="/uploads/… or https://…" />
              <label class="btn-outline btn-sm cursor-pointer whitespace-nowrap">
                <app-icon name="upload" [size]="14" /> Upload
                <input type="file" accept="image/*" class="hidden" (change)="uploadImage($event)" />
              </label>
            </div>
            @if (form.controls.logoUrl.value) {
              <img [src]="form.controls.logoUrl.value | assetUrl" alt="Brand logo preview" class="mt-2 h-16 w-16 rounded-lg border border-ink-100 bg-white object-contain p-1" />
            }
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="closeForm()">Cancel</button>
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save brand' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (brand of brands(); track brand.id) {
            <div class="admin-card flex gap-4">
              @if (brand.logoUrl) {
                <img [src]="brand.logoUrl | assetUrl" [alt]="brand.name" class="h-16 w-16 flex-none rounded-xl border border-ink-100 object-contain p-1" />
              } @else {
                <span class="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-ink-50 font-display text-xl font-semibold text-ink-400">
                  {{ brand.name.charAt(0) }}
                </span>
              }
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-ink-900">{{ brand.name }}</p>
                    <p class="text-xs text-ink-400">/{{ brand.slug }}</p>
                  </div>
                  <span [class]="brand.isActive ? 'badge-success' : 'badge-muted'">{{ brand.isActive ? 'Active' : 'Hidden' }}</span>
                </div>
                <p class="mt-1 line-clamp-2 text-xs text-ink-500">{{ brand.description || 'No description yet.' }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xs text-ink-400">{{ brand.productCount }} products · sort {{ brand.sortOrder }}</span>
                  <div class="flex gap-1">
                    <button type="button" class="rounded-lg p-1.5 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" (click)="openEdit(brand)" title="Edit">
                      <app-icon name="edit" [size]="15" />
                    </button>
                    <button type="button" class="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-danger" (click)="remove(brand)" title="Delete">
                      <app-icon name="trash" [size]="15" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          } @empty {
            <div class="admin-card sm:col-span-2 xl:col-span-3 py-10 text-center text-sm text-ink-400">
              No brands yet. Add the labels you carry.
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AdminBrands implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly brands = signal<Brand[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly editing = signal<Brand | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    logoUrl: [''],
    sortOrder: [0],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.catalog.brands(true).subscribe({
      next: (brands) => {
        this.brands.set(brands);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load brands');
      }
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', description: '', logoUrl: '', sortOrder: 0, isActive: true });
    this.formOpen.set(true);
  }

  openEdit(brand: Brand): void {
    this.editing.set(brand);
    this.form.reset({
      name: brand.name,
      description: brand.description ?? '',
      logoUrl: brand.logoUrl ?? '',
      sortOrder: brand.sortOrder,
      isActive: brand.isActive
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.admin.upload(file).subscribe({
      next: (result) => {
        this.form.controls.logoUrl.setValue(result.url);
        this.toast.success('Logo uploaded');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to upload logo')
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('A brand name is required');
      return;
    }
    const value = this.form.getRawValue();
    const request: BrandRequest = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      logoUrl: value.logoUrl.trim() || null,
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current ? this.catalog.updateBrand(current.id, request) : this.catalog.createBrand(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Brand updated' : 'Brand created');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save brand');
      }
    });
  }

  async remove(brand: Brand): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete brand',
      message: brand.productCount
        ? `${brand.name} is linked to ${brand.productCount} product(s). Reassign them before deleting.`
        : `Delete “${brand.name}”? This action can be undone by a database administrator.`,
      confirmText: 'Delete brand',
      danger: true
    });
    if (!ok) return;
    this.catalog.deleteBrand(brand.id).subscribe({
      next: () => {
        this.toast.success('Brand deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete brand')
    });
  }
}
