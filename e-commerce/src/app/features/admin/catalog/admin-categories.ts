import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CategoryRequest } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';

interface CategoryRow {
  category: Category;
  depth: number;
}

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, AssetUrlPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 class="admin-title">Categories</h2>
          <p class="mt-1 text-sm text-ink-500">Organise the catalog into collections and sub-collections.</p>
        </div>
        <button type="button" class="btn-primary btn-sm" (click)="openCreate()">
          <app-icon name="plus" [size]="14" /> New category
        </button>
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" class="admin-card space-y-4" (ngSubmit)="save()">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-ink-900">{{ editing() ? 'Edit category' : 'New category' }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeForm()" aria-label="Close">
              <app-icon name="x" [size]="16" />
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="label" for="categoryName">Name *</label>
              <input id="categoryName" formControlName="name" class="input" placeholder="Outerwear" />
            </div>
            <div>
              <label class="label" for="categoryParent">Parent category</label>
              <select id="categoryParent" formControlName="parentId" class="input">
                <option value="">Top level</option>
                @for (row of parentOptions(); track row.category.id) {
                  <option [value]="row.category.id">{{ row.category.name }}</option>
                }
              </select>
            </div>
            <div>
              <label class="label" for="categorySort">Sort order</label>
              <input id="categorySort" type="number" formControlName="sortOrder" class="input" />
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Visible in storefront
              </label>
            </div>
          </div>
          <div>
            <label class="label" for="categoryDescription">Description</label>
            <textarea id="categoryDescription" formControlName="description" rows="3" class="input resize-y"></textarea>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="label" for="categoryImage">Image</label>
              <div class="flex gap-2">
                <input id="categoryImage" formControlName="imageUrl" class="input" placeholder="/uploads/… or https://…" />
                <label class="btn-outline btn-sm cursor-pointer whitespace-nowrap">
                  <app-icon name="upload" [size]="14" /> Upload
                  <input type="file" accept="image/*" class="hidden" (change)="uploadImage($event)" />
                </label>
              </div>
              @if (form.controls.imageUrl.value) {
                <img [src]="form.controls.imageUrl.value | assetUrl" alt="Category preview" class="mt-2 h-20 w-32 rounded-lg border border-ink-100 object-cover" />
              }
            </div>
            <div class="grid gap-3">
              <div>
                <label class="label" for="seoTitle">SEO title</label>
                <input id="seoTitle" formControlName="seoTitle" class="input" />
              </div>
              <div>
                <label class="label" for="seoDescription">SEO description</label>
                <input id="seoDescription" formControlName="seoDescription" class="input" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="closeForm()">Cancel</button>
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save category' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="admin-card overflow-x-auto p-0">
          <table class="table-luxe">
            <thead>
              <tr>
                <th class="pl-5">Category</th>
                <th>Slug</th>
                <th>Products</th>
                <th>Sort</th>
                <th>Status</th>
                <th class="pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.category.id) {
                <tr>
                  <td class="pl-5">
                    <div class="flex items-center gap-3" [style.padding-left.px]="row.depth * 18">
                      @if (row.category.imageUrl) {
                        <img [src]="row.category.imageUrl | assetUrl" [alt]="row.category.name" class="h-9 w-9 rounded-lg border border-ink-100 object-cover" />
                      } @else {
                        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50 text-ink-400">
                          <app-icon name="grid" [size]="15" />
                        </span>
                      }
                      <div>
                        <p class="text-sm font-semibold text-ink-900">{{ row.category.name }}</p>
                        @if (row.category.description) {
                          <p class="max-w-[260px] truncate text-xs text-ink-400">{{ row.category.description }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="text-xs text-ink-500">/{{ row.category.slug }}</td>
                  <td class="text-sm text-ink-600">{{ row.category.productCount }}</td>
                  <td class="text-sm text-ink-600">{{ row.category.sortOrder }}</td>
                  <td>
                    <span [class]="row.category.isActive ? 'badge-success' : 'badge-muted'">
                      {{ row.category.isActive ? 'Active' : 'Hidden' }}
                    </span>
                  </td>
                  <td class="pr-5">
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" class="rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" (click)="openCreate(row.category.id)" title="Add sub-category">
                        <app-icon name="plus" [size]="14" />
                      </button>
                      <button type="button" class="rounded-lg p-2 text-ink-500 transition hover:bg-ink-50 hover:text-ink-900" (click)="openEdit(row.category)" title="Edit">
                        <app-icon name="edit" [size]="15" />
                      </button>
                      <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-danger" (click)="remove(row.category)" title="Delete">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="py-10 text-center text-sm text-ink-400">No categories yet. Create your first collection.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class AdminCategories implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formOpen = signal(false);
  readonly editing = signal<Category | null>(null);

  readonly rows = computed(() => this.flatten(this.categories()));
  readonly parentOptions = computed(() => {
    const editingId = this.editing()?.id;
    return this.flatten(this.categories()).filter((row) => row.category.id !== editingId);
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    parentId: [''],
    description: [''],
    imageUrl: [''],
    seoTitle: [''],
    seoDescription: [''],
    sortOrder: [0],
    isActive: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.catalog.categories(true).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load categories');
      }
    });
  }

  openCreate(parentId = ''): void {
    this.editing.set(null);
    this.form.reset({
      name: '',
      parentId,
      description: '',
      imageUrl: '',
      seoTitle: '',
      seoDescription: '',
      sortOrder: 0,
      isActive: true
    });
    this.formOpen.set(true);
  }

  openEdit(category: Category): void {
    this.editing.set(category);
    this.form.reset({
      name: category.name,
      parentId: category.parentId ?? '',
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
      seoTitle: category.seoTitle ?? '',
      seoDescription: category.seoDescription ?? '',
      sortOrder: category.sortOrder,
      isActive: category.isActive
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
        this.form.controls.imageUrl.setValue(result.url);
        this.toast.success('Image uploaded');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to upload image')
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('A category name is required');
      return;
    }
    const value = this.form.getRawValue();
    const request: CategoryRequest = {
      name: value.name.trim(),
      parentId: value.parentId || null,
      description: value.description.trim() || null,
      imageUrl: value.imageUrl.trim() || null,
      seoTitle: value.seoTitle.trim() || null,
      seoDescription: value.seoDescription.trim() || null,
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive
    };
    this.saving.set(true);
    const current = this.editing();
    const operation = current
      ? this.catalog.updateCategory(current.id, request)
      : this.catalog.createCategory(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Category updated' : 'Category created');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save category');
      }
    });
  }

  async remove(category: Category): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete category',
      message: category.productCount
        ? `${category.name} contains ${category.productCount} product(s). Move them to another category before deleting.`
        : `Delete “${category.name}”? This action can be undone by a database administrator.`,
      confirmText: 'Delete category',
      danger: true
    });
    if (!ok) return;
    this.catalog.deleteCategory(category.id).subscribe({
      next: () => {
        this.toast.success('Category deleted');
        this.load();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete category')
    });
  }

  private flatten(categories: Category[], depth = 0): CategoryRow[] {
    const result: CategoryRow[] = [];
    for (const category of categories) {
      result.push({ category, depth });
      if (category.children?.length) result.push(...this.flatten(category.children, depth + 1));
    }
    return result;
  }
}
