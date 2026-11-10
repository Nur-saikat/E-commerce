import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  Brand,
  Category,
  ProductDetail,
  ProductRequest,
  ProductVariantRequest
} from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';

interface SpecRow {
  key: string;
  value: string;
}

interface VariantRow {
  id?: string | null;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributesText: string;
  imageUrl: string;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AssetUrlPipe],
  template: `
    <div class="mx-auto max-w-5xl space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a routerLink="/admin/products" class="text-xs font-semibold text-gold-600 hover:underline">← Back to products</a>
          <h2 class="admin-title mt-1">{{ isEdit() ? 'Edit product' : 'New product' }}</h2>
          <p class="mt-1 text-sm text-ink-500">All fields marked with * are required. Changes go live immediately.</p>
        </div>
        <div class="flex gap-2">
          <a routerLink="/admin/products" class="btn-outline btn-sm">Cancel</a>
          <button type="button" class="btn-primary btn-sm" [disabled]="saving()" (click)="submit()">
            @if (saving()) {
              Saving…
            } @else {
              <app-icon name="save" [size]="14" /> {{ isEdit() ? 'Save changes' : 'Create product' }}
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-96 rounded-xl"></div></div>
      } @else {
        <form [formGroup]="form" class="space-y-5" (ngSubmit)="submit()">
          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Basics</h3>
              <p class="text-xs text-ink-400">Name, taxonomy and description shown across the storefront.</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="label" for="name">Name *</label>
                <input id="name" formControlName="name" class="input" placeholder="Merino wool sweater" />
                @if (invalid('name')) { <p class="mt-1 text-xs text-danger">A product name is required.</p> }
              </div>
              <div>
                <label class="label" for="sku">SKU *</label>
                <input id="sku" formControlName="sku" class="input" placeholder="SAF-MWS-001" />
                @if (invalid('sku')) { <p class="mt-1 text-xs text-danger">A SKU is required.</p> }
              </div>
              <div>
                <label class="label" for="category">Category *</label>
                <select id="category" formControlName="categoryId" class="input">
                  <option value="">Select a category</option>
                  @for (category of categories(); track category.id) {
                    <option [value]="category.id">{{ category.name }}</option>
                  }
                </select>
                @if (invalid('categoryId')) { <p class="mt-1 text-xs text-danger">Choose a category.</p> }
              </div>
              <div>
                <label class="label" for="brand">Brand</label>
                <select id="brand" formControlName="brandId" class="input">
                  <option value="">No brand</option>
                  @for (brand of brands(); track brand.id) {
                    <option [value]="brand.id">{{ brand.name }}</option>
                  }
                </select>
              </div>
            </div>
            <div>
              <label class="label" for="short">Short description</label>
              <input id="short" formControlName="shortDescription" class="input" placeholder="One line summary shown on cards" />
            </div>
            <div>
              <label class="label" for="description">Full description *</label>
              <textarea id="description" formControlName="description" rows="6" class="input resize-y" placeholder="Materials, fit, care instructions…"></textarea>
              @if (invalid('description')) { <p class="mt-1 text-xs text-danger">A description is required.</p> }
            </div>
            <div>
              <label class="label" for="tags">Tags</label>
              <input id="tags" formControlName="tagsText" class="input" placeholder="new, linen, summer (comma separated)" />
            </div>
          </section>

          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Pricing & inventory</h3>
              <p class="text-xs text-ink-400">Prices are in your store currency. Stock is tracked per product and per variant.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label class="label" for="price">Price *</label>
                <input id="price" type="number" min="0" step="0.01" formControlName="price" class="input" />
                @if (invalid('price')) { <p class="mt-1 text-xs text-danger">Enter a price above zero.</p> }
              </div>
              <div>
                <label class="label" for="costPrice">Cost price</label>
                <input id="costPrice" type="number" min="0" step="0.01" formControlName="costPrice" class="input" />
              </div>
              <div>
                <label class="label" for="discount">Discount price</label>
                <input id="discount" type="number" min="0" step="0.01" formControlName="discountPrice" class="input" placeholder="Optional" />
              </div>
              <div>
                <label class="label" for="stock">Stock *</label>
                <input id="stock" type="number" min="0" step="1" formControlName="stock" class="input" />
              </div>
              <div>
                <label class="label" for="threshold">Low stock alert at</label>
                <input id="threshold" type="number" min="0" step="1" formControlName="lowStockThreshold" class="input" />
              </div>
            </div>
            <p class="text-xs text-ink-400">Cost price is used to calculate profit and inventory value. It is never shown to customers.</p>
            <div class="flex flex-wrap gap-5 pt-1">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Published
              </label>
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isFeatured" class="accent-ink-900" /> Featured on homepage
              </label>
            </div>
          </section>

          <section class="admin-card space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Media</h3>
                <p class="text-xs text-ink-400">Upload JPG, PNG or WebP up to 6 MB. The starred image is the thumbnail.</p>
              </div>
              <label class="btn-outline btn-sm cursor-pointer">
                <app-icon name="upload" [size]="14" />
                {{ pendingUploads() ? 'Uploading…' : 'Upload images' }}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple class="hidden" (change)="onFilesSelected($event)" />
              </label>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <input [formControl]="imageUrl" class="input flex-1" placeholder="Or paste an image URL" />
              <button type="button" class="btn-primary btn-sm" (click)="addImageUrl()">
                <app-icon name="plus" [size]="14" /> Add image
              </button>
            </div>
            @if (images().length) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                @for (image of images(); track image; let index = $index) {
                  <div class="group relative overflow-hidden rounded-xl border border-ink-100">
                    <img [src]="image | assetUrl" [alt]="'Product image ' + (index + 1)" class="h-28 w-full object-cover" />
                    <div class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink-950/70 px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                      <button type="button" class="text-cream/90 hover:text-gold-300" [title]="thumbnail() === image ? 'Thumbnail' : 'Set as thumbnail'" (click)="setThumbnail(image)">
                        <app-icon name="star" [size]="15" [filled]="thumbnail() === image" />
                      </button>
                      <button type="button" class="text-cream/90 hover:text-red-300" title="Remove image" (click)="removeImage(image)">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                    @if (thumbnail() === image) {
                      <span class="absolute left-1.5 top-1.5 badge-gold">Thumbnail</span>
                    }
                  </div>
                }
              </div>
            } @else {
              <p class="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-xs text-ink-400">
                No images yet. The first image becomes the thumbnail automatically.
              </p>
            }
          </section>

          <section class="admin-card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Specifications</h3>
                <p class="text-xs text-ink-400">Material, dimensions, care — anything customers need to know.</p>
              </div>
              <button type="button" class="btn-outline btn-sm" (click)="addSpec()">
                <app-icon name="plus" [size]="14" /> Add row
              </button>
            </div>
            @if (specs().length === 0) {
              <p class="text-xs text-ink-400">No specifications added.</p>
            } @else {
              <div class="space-y-2">
                @for (spec of specs(); track $index; let index = $index) {
                  <div class="flex gap-2">
                    <input class="input flex-1" placeholder="Label" [value]="spec.key" (input)="updateSpec(index, 'key', $event)" />
                    <input class="input flex-[2]" placeholder="Value" [value]="spec.value" (input)="updateSpec(index, 'value', $event)" />
                    <button type="button" class="rounded-lg border border-ink-200 px-3 text-ink-500 transition hover:border-danger hover:text-danger" (click)="removeSpec(index)" aria-label="Remove specification">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </div>
                }
              </div>
            }
          </section>

          <section class="admin-card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Variants</h3>
                <p class="text-xs text-ink-400">Optional — sizes, colours or bundles with their own SKU and stock.</p>
              </div>
              <button type="button" class="btn-outline btn-sm" (click)="addVariant()">
                <app-icon name="plus" [size]="14" /> Add variant
              </button>
            </div>
            @if (variants().length === 0) {
              <p class="text-xs text-ink-400">No variants — customers will order the base product.</p>
            } @else {
              <div class="space-y-3">
                @for (variant of variants(); track $index; let index = $index) {
                  <div class="rounded-xl border border-ink-100 p-3">
                    <div class="grid gap-2 md:grid-cols-4">
                      <input class="input" placeholder="Variant name *" [value]="variant.name" (input)="updateVariant(index, 'name', $event)" />
                      <input class="input" placeholder="SKU *" [value]="variant.sku" (input)="updateVariant(index, 'sku', $event)" />
                      <input class="input" type="number" min="0" step="0.01" placeholder="Price" [value]="variant.price" (input)="updateVariantNumber(index, 'price', $event)" />
                      <input class="input" type="number" min="0" step="1" placeholder="Stock" [value]="variant.stock" (input)="updateVariantNumber(index, 'stock', $event)" />
                    </div>
                    <div class="mt-2 grid gap-2 md:grid-cols-[2fr_2fr_auto]">
                      <input class="input" placeholder="Attributes (Color:Black, Size:M)" [value]="variant.attributesText" (input)="updateVariant(index, 'attributesText', $event)" />
                      <input class="input" placeholder="Variant image URL (optional)" [value]="variant.imageUrl" (input)="updateVariant(index, 'imageUrl', $event)" />
                      <button type="button" class="rounded-lg border border-ink-200 px-3 py-2 text-ink-500 transition hover:border-danger hover:text-danger" (click)="removeVariant(index)" aria-label="Remove variant">
                        <app-icon name="trash" [size]="14" />
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </section>

          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Search engine listing</h3>
              <p class="text-xs text-ink-400">Optional overrides for the page title and meta description.</p>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="label" for="seoTitle">SEO title</label>
                <input id="seoTitle" formControlName="seoTitle" class="input" maxlength="200" />
              </div>
              <div>
                <label class="label" for="seoDescription">SEO description</label>
                <input id="seoDescription" formControlName="seoDescription" class="input" maxlength="500" />
              </div>
            </div>
          </section>

          <div class="flex flex-wrap justify-end gap-2 pb-6">
            <a routerLink="/admin/products" class="btn-outline">Cancel</a>
            <button type="submit" class="btn-primary" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : isEdit() ? 'Save changes' : 'Create product' }}
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class ProductForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalog = inject(CatalogService);
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly categories = signal<Category[]>([]);
  readonly brands = signal<Brand[]>([]);
  readonly images = signal<string[]>([]);
  readonly thumbnail = signal<string>('');
  readonly specs = signal<SpecRow[]>([]);
  readonly variants = signal<VariantRow[]>([]);
  readonly imageUrl = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isEdit = signal(false);
  readonly pendingUploads = signal(0);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    sku: ['', [Validators.required, Validators.maxLength(60)]],
    categoryId: ['', Validators.required],
    brandId: [''],
    shortDescription: [''],
    description: ['', [Validators.required, Validators.maxLength(10000)]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    discountPrice: this.fb.control<number | null>(null),
    stock: [0, [Validators.required, Validators.min(0)]],
    lowStockThreshold: [5, [Validators.required, Validators.min(0)]],
    tagsText: [''],
    seoTitle: [''],
    seoDescription: [''],
    isFeatured: [false],
    isActive: [true]
  });

  private productId: string | null = null;

  ngOnInit(): void {
    this.catalog.categories(true).subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => undefined
    });
    this.catalog.brands(true).subscribe({
      next: (brands) => this.brands.set(brands),
      error: () => undefined
    });

    this.productId = this.route.snapshot.paramMap.get('id');
    if (!this.productId) {
      this.isEdit.set(false);
      this.loading.set(false);
      return;
    }
    this.isEdit.set(true);
    this.catalog.product(this.productId, true, true).subscribe({
      next: (detail) => {
        this.patch(detail);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load product');
        this.router.navigate(['/admin/products']);
      }
    });
  }

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && field.touched;
  }

  addImageUrl(): void {
    const url = this.imageUrl.value.trim();
    if (!url) return;
    if (this.images().includes(url)) {
      this.toast.info('That image is already added');
      return;
    }
    this.images.update((list) => [...list, url]);
    if (!this.thumbnail()) this.thumbnail.set(url);
    this.imageUrl.reset();
  }

  removeImage(url: string): void {
    this.images.update((list) => list.filter((item) => item !== url));
    if (this.thumbnail() === url) this.thumbnail.set(this.images()[0] ?? '');
  }

  setThumbnail(url: string): void {
    this.thumbnail.set(url);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    for (const file of files) {
      if (file.size > 6 * 1024 * 1024) {
        this.toast.error(`${file.name} is larger than 6 MB`);
        continue;
      }
      this.pendingUploads.update((count) => count + 1);
      this.admin
        .upload(file)
        .pipe(finalize(() => this.pendingUploads.update((count) => Math.max(0, count - 1))))
        .subscribe({
          next: (result) => {
            this.images.update((list) => [...list, result.url]);
            if (!this.thumbnail()) this.thumbnail.set(result.url);
            this.toast.success(`${file.name} uploaded`);
          },
          error: (err) => this.toast.error(err?.error?.message ?? `Unable to upload ${file.name}`)
        });
    }
  }

  addSpec(): void {
    this.specs.update((rows) => [...rows, { key: '', value: '' }]);
  }

  updateSpec(index: number, field: keyof SpecRow, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.specs.update((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  removeSpec(index: number): void {
    this.specs.update((rows) => rows.filter((_, i) => i !== index));
  }

  addVariant(): void {
    this.variants.update((rows) => [
      ...rows,
      { name: '', sku: '', price: this.form.controls.price.value, stock: 0, attributesText: '', imageUrl: '' }
    ]);
  }

  updateVariant(index: number, field: 'name' | 'sku' | 'attributesText' | 'imageUrl', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.variants.update((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  updateVariantNumber(index: number, field: 'price' | 'stock', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value) || 0;
    this.variants.update((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  removeVariant(index: number): void {
    this.variants.update((rows) => rows.filter((_, i) => i !== index));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please complete the required fields');
      return;
    }
    if (this.pendingUploads() > 0) {
      this.toast.info('Please wait for uploads to finish');
      return;
    }
    const varianceError = this.variants().find((variant) => !variant.name.trim() || !variant.sku.trim());
    if (varianceError) {
      this.toast.error('Every variant needs a name and a SKU');
      return;
    }

    const value = this.form.getRawValue();
    const discount = value.discountPrice && value.discountPrice > 0 ? value.discountPrice : null;
    if (discount !== null && discount >= value.price) {
      this.toast.error('Discount price must be lower than the regular price');
      return;
    }

    const request: ProductRequest = {
      name: value.name.trim(),
      sku: value.sku.trim(),
      shortDescription: value.shortDescription.trim() || null,
      description: value.description.trim(),
      categoryId: value.categoryId,
      brandId: value.brandId || null,
      price: value.price,
      costPrice: value.costPrice,
      discountPrice: discount,
      stock: value.stock,
      lowStockThreshold: value.lowStockThreshold,
      images: this.images(),
      thumbnailUrl: this.thumbnail() || this.images()[0] || null,
      specifications: this.specifications(),
      variants: this.variants().map<ProductVariantRequest>((variant) => ({
        id: variant.id ?? null,
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        price: variant.price,
        stock: variant.stock,
        attributes: this.parseAttributes(variant.attributesText),
        imageUrl: variant.imageUrl.trim() || null
      })),
      tags: value.tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      isFeatured: value.isFeatured,
      isActive: value.isActive,
      seoTitle: value.seoTitle.trim() || null,
      seoDescription: value.seoDescription.trim() || null
    };

    this.saving.set(true);
    const operation = this.productId
      ? this.catalog.updateProduct(this.productId, request)
      : this.catalog.createProduct(request);

    operation.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.toast.success(this.productId ? 'Product updated' : 'Product created');
        this.router.navigate(['/admin/products', product.id]);
      },
      error: (err) => {
        this.saving.set(false);
        const errors = err?.error?.errors;
        this.toast.error(Array.isArray(errors) && errors.length ? errors[0] : err?.error?.message ?? 'Unable to save product');
      }
    });
  }

  private patch(detail: ProductDetail): void {
    this.form.patchValue({
      name: detail.name,
      sku: detail.sku,
      categoryId: detail.categoryId ?? '',
      brandId: detail.brandId ?? '',
      shortDescription: detail.shortDescription ?? '',
      description: detail.description,
      price: detail.price,
      costPrice: detail.costPrice ?? 0,
      discountPrice: detail.discountPrice ?? null,
      stock: detail.stock,
      lowStockThreshold: detail.lowStockThreshold,
      tagsText: detail.tags.join(', '),
      seoTitle: detail.seoTitle ?? '',
      seoDescription: detail.seoDescription ?? '',
      isFeatured: detail.isFeatured,
      isActive: detail.isActive
    });
    this.images.set(detail.images ?? []);
    this.thumbnail.set(detail.thumbnailUrl ?? detail.images?.[0] ?? '');
    this.specs.set(Object.entries(detail.specifications ?? {}).map(([key, value]) => ({ key, value })));
    this.variants.set(
      (detail.variants ?? []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        attributesText: Object.entries(variant.attributes ?? {})
          .map(([key, value]) => `${key}:${value}`)
          .join(', '),
        imageUrl: variant.imageUrl ?? ''
      }))
    );
  }

  private specifications(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const spec of this.specs()) {
      const key = spec.key.trim();
      if (key) result[key] = spec.value.trim();
    }
    return result;
  }

  private parseAttributes(value: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const pair of value.split(',')) {
      const [key, ...rest] = pair.split(':');
      const label = key?.trim();
      const val = rest.join(':').trim();
      if (label && val) result[label] = val;
    }
    return result;
  }
}
