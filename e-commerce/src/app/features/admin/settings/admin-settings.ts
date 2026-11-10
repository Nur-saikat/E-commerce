import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MenuItem,
  Permission,
  Role,
  SettingsRequest,
  ShippingMethod,
  ShippingMethodRequest,
  WebsiteSettings
} from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ContentService } from '../../../core/services/content.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

type SettingsTab = 'store' | 'shipping' | 'roles';

interface KeyValueRow {
  key: string;
  value: string;
}

interface PermissionGroup {
  group: string;
  items: Permission[];
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, AssetUrlPipe, MoneyPipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">System</p>
          <h2 class="admin-title">Settings</h2>
          <p class="mt-1 text-sm text-ink-500">Store profile, shipping rates and role-based access.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          @for (item of tabs; track item.value) {
            <button
              type="button"
              class="rounded-full px-4 py-2 text-xs font-semibold transition"
              [class]="tab() === item.value ? 'bg-ink-900 text-cream' : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'"
              (click)="selectTab(item.value)"
            >
              {{ item.label }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-96 rounded-xl"></div></div>
      } @else if (tab() === 'store') {
        <form [formGroup]="storeForm" class="space-y-5" (ngSubmit)="saveSettings()">
          <section class="admin-card space-y-4">
            <div class="flex items-center gap-4">
              @if (storeForm.controls.logoUrl.value) {
                <img [src]="storeForm.controls.logoUrl.value | assetUrl" alt="Store logo" class="h-14 w-14 rounded-xl border border-ink-100 object-contain p-1" />
              } @else {
                <span class="flex h-14 w-14 items-center justify-center rounded-xl bg-ink-900 font-display text-lg font-semibold text-cream">
                  {{ storeForm.controls.storeName.value.charAt(0) || 'L' }}
                </span>
              }
              <div class="flex-1">
                <h3 class="text-sm font-semibold text-ink-900">Store identity</h3>
                <p class="text-xs text-ink-400">Shown in the header, invoices and transactional emails.</p>
              </div>
              <label class="btn-outline btn-sm cursor-pointer">
                <app-icon name="upload" [size]="14" /> Logo
                <input type="file" accept="image/*" class="hidden" (change)="uploadLogo($event)" />
              </label>
            </div>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="label" for="storeName">Store name *</label>
                <input id="storeName" formControlName="storeName" class="input" />
              </div>
              <div>
                <label class="label" for="tagline">Tagline</label>
                <input id="tagline" formControlName="tagline" class="input" />
              </div>
              <div>
                <label class="label" for="storeEmail">Support email</label>
                <input id="storeEmail" type="email" formControlName="email" class="input" />
              </div>
              <div>
                <label class="label" for="storePhone">Phone</label>
                <input id="storePhone" formControlName="phone" class="input" />
              </div>
              <div class="md:col-span-2">
                <label class="label" for="storeAddress">Address</label>
                <input id="storeAddress" formControlName="address" class="input" />
              </div>
            </div>
          </section>

          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Currency & charges</h3>
              <p class="text-xs text-ink-400">Tax and shipping figures are used at checkout.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label class="label" for="currency">Currency</label>
                <input id="currency" formControlName="currency" class="input" />
              </div>
              <div>
                <label class="label" for="symbol">Symbol</label>
                <input id="symbol" formControlName="currencySymbol" class="input" />
              </div>
              <div>
                <label class="label" for="taxRate">Tax rate %</label>
                <input id="taxRate" type="number" min="0" max="100" step="0.01" formControlName="taxRate" class="input" />
              </div>
              <div>
                <label class="label" for="flatShipping">Flat shipping</label>
                <input id="flatShipping" type="number" min="0" step="0.01" formControlName="flatShippingRate" class="input" />
              </div>
              <div>
                <label class="label" for="threshold">Free shipping over</label>
                <input id="threshold" type="number" min="0" step="0.01" formControlName="freeShippingThreshold" class="input" />
              </div>
            </div>
            <div class="flex flex-wrap gap-5">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="codEnabled" class="accent-ink-900" /> Cash on delivery
              </label>
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="stripeEnabled" class="accent-ink-900" /> Stripe
              </label>
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="sslCommerzEnabled" class="accent-ink-900" /> SSLCommerz
              </label>
            </div>
            <p class="text-xs text-ink-400">Provider secret keys are configured on the API through environment variables and are never exposed to the storefront.</p>
          </section>

          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Mobile banking & voucher points</h3>
              <p class="text-xs text-ink-400">
                Customers submit their transaction details for mobile banking payments and an admin verifies them before the order is confirmed.
              </p>
            </div>
            <div class="grid gap-4 md:grid-cols-3">
              <div class="space-y-2 rounded-xl border border-ink-100 p-3">
                <label class="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input type="checkbox" formControlName="bkashEnabled" class="accent-ink-900" /> bKash
                </label>
                <input formControlName="bkashMerchantNumber" class="input" placeholder="Merchant number 01XXXXXXXXX" />
              </div>
              <div class="space-y-2 rounded-xl border border-ink-100 p-3">
                <label class="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input type="checkbox" formControlName="nagadEnabled" class="accent-ink-900" /> Nagad
                </label>
                <input formControlName="nagadMerchantNumber" class="input" placeholder="Merchant number 01XXXXXXXXX" />
              </div>
              <div class="space-y-2 rounded-xl border border-ink-100 p-3">
                <label class="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input type="checkbox" formControlName="rocketEnabled" class="accent-ink-900" /> Rocket
                </label>
                <input formControlName="rocketMerchantNumber" class="input" placeholder="Merchant number 01XXXXXXXXX" />
              </div>
            </div>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label class="flex items-center gap-2 text-sm text-ink-700 lg:mt-6">
                <input type="checkbox" formControlName="voucherPointsEnabled" class="accent-ink-900" /> Voucher points
              </label>
              <div>
                <label class="label" for="pointValue">Point value ({{ storeForm.controls.currencySymbol.value }})</label>
                <input id="pointValue" type="number" min="0.01" step="0.01" formControlName="voucherPointValue" class="input" />
              </div>
              <div>
                <label class="label" for="earnPercent">Points earned (% of spend)</label>
                <input id="earnPercent" type="number" min="0" max="100" step="0.5" formControlName="voucherEarnPercent" class="input" />
              </div>
              <div>
                <label class="label" for="maxRedeem">Max redeem (% of order)</label>
                <input id="maxRedeem" type="number" min="0" max="100" step="1" formControlName="voucherMaxRedeemPercent" class="input" />
              </div>
            </div>
          </section>

          <section class="admin-card space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-ink-900">Social links</h3>
              <p class="text-xs text-ink-400">Displayed in the footer when provided.</p>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              @for (row of socials(); track row.key) {
                <div class="flex items-center gap-2">
                  <span class="w-24 text-xs font-medium capitalize text-ink-500">{{ row.key }}</span>
                  <input class="input" [value]="row.value" placeholder="https://…" (input)="updateSocial(row.key, $event)" />
                </div>
              }
            </div>
          </section>

          <section class="admin-card space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Footer menu</h3>
                <p class="text-xs text-ink-400">Quick links rendered in the storefront footer.</p>
              </div>
              <button type="button" class="btn-outline btn-sm" (click)="addMenu()">
                <app-icon name="plus" [size]="14" /> Add link
              </button>
            </div>
            @for (item of menuItems(); track $index; let index = $index) {
              <div class="grid gap-2 sm:grid-cols-[1fr_1.4fr_90px_auto]">
                <input class="input" placeholder="Label" [value]="item.label" (input)="updateMenu(index, 'label', $event)" />
                <input class="input" placeholder="/about" [value]="item.url" (input)="updateMenu(index, 'url', $event)" />
                <input class="input" type="number" placeholder="Order" [value]="item.sortOrder" (input)="updateMenuNumber(index, $event)" />
                <button type="button" class="rounded-lg border border-ink-200 px-3 text-ink-500 hover:border-danger hover:text-danger" (click)="removeMenu(index)" aria-label="Remove link">
                  <app-icon name="trash" [size]="14" />
                </button>
              </div>
            } @empty {
              <p class="text-xs text-ink-400">No custom footer links.</p>
            }
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="label" for="footerAbout">Footer about</label>
                <textarea id="footerAbout" formControlName="footerAbout" rows="3" class="input resize-y"></textarea>
              </div>
              <div>
                <label class="label" for="copyright">Copyright</label>
                <textarea id="copyright" formControlName="copyrightText" rows="3" class="input resize-y"></textarea>
              </div>
            </div>
          </section>

          <div class="flex justify-end">
            <button type="submit" class="btn-primary" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save settings' }}
            </button>
          </div>
        </form>
      } @else if (tab() === 'shipping') {
        <div class="flex justify-end">
          <button type="button" class="btn-primary btn-sm" (click)="openShipping()">
            <app-icon name="plus" [size]="14" /> New shipping method
          </button>
        </div>

        @if (shippingOpen()) {
          <form [formGroup]="shippingForm" class="admin-card space-y-4" (ngSubmit)="saveShipping()">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-ink-900">{{ editingShipping() ? 'Edit shipping method' : 'New shipping method' }}</h3>
              <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeShipping()" aria-label="Close">
                <app-icon name="x" [size]="16" />
              </button>
            </div>
            <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label class="label" for="shipName">Name *</label>
                <input id="shipName" formControlName="name" class="input" placeholder="Express delivery" />
              </div>
              <div>
                <label class="label" for="shipCost">Cost</label>
                <input id="shipCost" type="number" min="0" step="0.01" formControlName="cost" class="input" />
              </div>
              <div>
                <label class="label" for="shipMin">Min days</label>
                <input id="shipMin" type="number" min="0" formControlName="estimatedDaysMin" class="input" />
              </div>
              <div>
                <label class="label" for="shipMax">Max days</label>
                <input id="shipMax" type="number" min="0" formControlName="estimatedDaysMax" class="input" />
              </div>
              <div class="md:col-span-2">
                <label class="label" for="shipDescription">Description</label>
                <input id="shipDescription" formControlName="description" class="input" />
              </div>
            </div>
            <div class="flex flex-wrap gap-5">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Available at checkout
              </label>
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isDefault" class="accent-ink-900" /> Default method
              </label>
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="btn-outline btn-sm" (click)="closeShipping()">Cancel</button>
              <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
                <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save method' }}
              </button>
            </div>
          </form>
        }

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (method of shippingMethods(); track method.id) {
            <article class="admin-card">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold text-ink-900">{{ method.name }}</p>
                  <p class="text-xs text-ink-400">{{ method.estimatedDaysMin }}–{{ method.estimatedDaysMax }} days</p>
                </div>
                <span [class]="method.isActive ? 'badge-success' : 'badge-muted'">{{ method.isActive ? 'Active' : 'Paused' }}</span>
              </div>
              <p class="mt-2 text-sm text-ink-600">{{ method.description || 'No description.' }}</p>
              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-display text-xl font-semibold text-ink-900">{{ method.cost === 0 ? 'Free' : (method.cost | money) }}</span>
                  @if (method.isDefault) {
                    <span class="badge-gold">Default</span>
                  }
                </div>
                <div class="flex gap-1">
                  <button type="button" class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900" (click)="editShipping(method)" title="Edit">
                    <app-icon name="edit" [size]="15" />
                  </button>
                  <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-danger" (click)="removeShipping(method)" title="Delete">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="admin-card md:col-span-2 xl:col-span-3 py-10 text-center text-sm text-ink-400">No shipping methods configured.</div>
          }
        </div>
      } @else {
        <div class="grid gap-5 xl:grid-cols-[280px_1fr]">
          <div class="admin-card p-2">
            @for (role of roles(); track role.id) {
              <button
                type="button"
                class="flex w-full items-start justify-between gap-2 rounded-xl px-3 py-3 text-left transition"
                [class]="selectedRole()?.id === role.id ? 'bg-ink-900 text-cream' : 'hover:bg-ink-50'"
                (click)="selectRole(role)"
              >
                <div>
                  <p class="text-sm font-semibold">{{ role.name }}</p>
                  <p class="text-[11px]" [class]="selectedRole()?.id === role.id ? 'text-cream/60' : 'text-ink-400'">{{ role.description }}</p>
                </div>
                <span class="text-[10px] font-semibold" [class]="selectedRole()?.id === role.id ? 'text-cream/60' : 'text-ink-400'">
                  {{ role.permissions.length }}
                </span>
              </button>
            }
          </div>

          <div class="admin-card">
            @if (selectedRole(); as role) {
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-ink-900">{{ role.name }} permissions</h3>
                  <p class="text-xs text-ink-400">
                    @if (isSuperAdmin(role)) {
                      Super admin always has full access and cannot be edited.
                    } @else if (isCustomerRole(role)) {
                      Customer permissions are fixed at the default set and cannot be edited.
                    } @else {
                      {{ selectedPermissions().length }} permission(s) selected
                    }
                  </p>
                </div>
                @if (!isReadOnlyRole(role)) {
                  <button type="button" class="btn-primary btn-sm" [disabled]="saving()" (click)="savePermissions()">
                    <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save permissions' }}
                  </button>
                }
              </div>

              <div class="mt-5 space-y-5">
                @if (!isSuperAdminUser()) {
                  <p class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
                    You can only view and grant permissions you hold yourself. Permissions outside your own set are hidden here and preserved for other administrators.
                  </p>
                }
                @for (group of permissionGroups(); track group.group) {
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{{ group.group }}</p>
                    <div class="mt-2 grid gap-2 sm:grid-cols-2">
                      @for (permission of group.items; track permission.key) {
                        <label
                          class="flex cursor-pointer items-start gap-2 rounded-xl border border-ink-100 px-3 py-2.5 transition hover:border-gold-300"
                          [class.opacity-50]="isReadOnlyRole(role)"
                        >
                          <input
                            type="checkbox"
                            class="mt-0.5 accent-ink-900"
                            [checked]="isSuperAdmin(role) || selectedPermissions().includes(permission.key)"
                            [disabled]="isReadOnlyRole(role)"
                            (change)="togglePermission(permission.key, $event)"
                          />
                          <span>
                            <span class="block text-sm font-medium text-ink-800">{{ permission.name }}</span>
                            <span class="block text-[11px] text-ink-400">{{ permission.description }}</span>
                          </span>
                        </label>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-sm text-ink-400">Select a role to manage its permissions.</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdminSettings implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly tabs: { value: SettingsTab; label: string }[] = [
    { value: 'store', label: 'Store' },
    { value: 'shipping', label: 'Shipping' },
    { value: 'roles', label: 'Roles & permissions' }
  ];

  readonly tab = signal<SettingsTab>('store');
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly socials = signal<KeyValueRow[]>([
    { key: 'facebook', value: '' },
    { key: 'instagram', value: '' },
    { key: 'twitter', value: '' },
    { key: 'linkedin', value: '' },
    { key: 'youtube', value: '' }
  ]);
  readonly menuItems = signal<MenuItem[]>([]);

  readonly shippingMethods = signal<ShippingMethod[]>([]);
  readonly shippingOpen = signal(false);
  readonly editingShipping = signal<ShippingMethod | null>(null);

  readonly roles = signal<Role[]>([]);
  readonly permissions = signal<Permission[]>([]);
  readonly selectedRole = signal<Role | null>(null);
  readonly selectedPermissions = signal<string[]>([]);
  readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of this.permissions()) {
      const list = groups.get(permission.group) ?? [];
      list.push(permission);
      groups.set(permission.group, list);
    }
    return Array.from(groups.entries()).map(([group, items]) => ({ group, items }));
  });

  readonly storeForm = this.fb.nonNullable.group({
    storeName: ['', Validators.required],
    tagline: [''],
    logoUrl: [''],
    email: [''],
    phone: [''],
    address: [''],
    currency: ['USD', Validators.required],
    currencySymbol: ['$', Validators.required],
    taxRate: [0],
    flatShippingRate: [0],
    freeShippingThreshold: [0],
    codEnabled: [true],
    stripeEnabled: [false],
    sslCommerzEnabled: [false],
    bkashEnabled: [false],
    bkashMerchantNumber: [''],
    nagadEnabled: [false],
    nagadMerchantNumber: [''],
    rocketEnabled: [false],
    rocketMerchantNumber: [''],
    voucherPointsEnabled: [true],
    voucherPointValue: [1],
    voucherEarnPercent: [5],
    voucherMaxRedeemPercent: [100],
    footerAbout: [''],
    copyrightText: ['']
  });

  readonly shippingForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: [''],
    cost: [0, [Validators.required, Validators.min(0)]],
    estimatedDaysMin: [1, [Validators.required, Validators.min(0)]],
    estimatedDaysMax: [3, [Validators.required, Validators.min(0)]],
    isActive: [true],
    isDefault: [false]
  });

  ngOnInit(): void {
    this.loadSettings();
    this.loadShipping();
    this.loadRoles();
  }

  selectTab(tab: SettingsTab): void {
    this.tab.set(tab);
  }

  loadSettings(): void {
    this.loading.set(true);
    this.content.loadSettings(true).subscribe({
      next: (settings) => {
        this.patchSettings(settings);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load settings');
      }
    });
  }

  loadShipping(): void {
    this.admin.shippingMethods().subscribe({
      next: (methods) => this.shippingMethods.set(methods),
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to load shipping methods')
    });
  }

  loadRoles(): void {
    this.admin.roles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        const first = roles.find((role) => role.name !== 'SuperAdmin') ?? roles[0];
        if (first) this.selectRole(first);
      },
      error: () => undefined
    });
    this.admin.permissions().subscribe({
      next: (permissions) => this.permissions.set(permissions),
      error: () => undefined
    });
  }

  uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.admin.upload(file).subscribe({
      next: (result) => {
        this.storeForm.controls.logoUrl.setValue(result.url);
        this.toast.success('Logo uploaded');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to upload logo')
    });
  }

  updateSocial(key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.socials.update((rows) => rows.map((row) => (row.key === key ? { ...row, value } : row)));
  }

  addMenu(): void {
    this.menuItems.update((items) => [...items, { label: '', url: '', sortOrder: items.length + 1 }]);
  }

  updateMenu(index: number, field: 'label' | 'url', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.menuItems.update((items) => items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  updateMenuNumber(index: number, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value) || 0;
    this.menuItems.update((items) => items.map((item, i) => (i === index ? { ...item, sortOrder: value } : item)));
  }

  removeMenu(index: number): void {
    this.menuItems.update((items) => items.filter((_, i) => i !== index));
  }

  saveSettings(): void {
    if (this.storeForm.invalid) {
      this.storeForm.markAllAsTouched();
      this.toast.error('Store name, currency and symbol are required');
      return;
    }
    const value = this.storeForm.getRawValue();
    const socialLinks: Record<string, string> = {};
    for (const row of this.socials()) {
      const val = row.value.trim();
      if (val) socialLinks[row.key] = val;
    }
    const request: SettingsRequest = {
      storeName: value.storeName.trim(),
      tagline: value.tagline.trim() || null,
      logoUrl: value.logoUrl.trim() || null,
      email: value.email.trim() || null,
      phone: value.phone.trim() || null,
      address: value.address.trim() || null,
      currency: value.currency.trim(),
      currencySymbol: value.currencySymbol.trim(),
      taxRate: Number(value.taxRate) || 0,
      flatShippingRate: Number(value.flatShippingRate) || 0,
      freeShippingThreshold: Number(value.freeShippingThreshold) || 0,
      codEnabled: value.codEnabled,
      stripeEnabled: value.stripeEnabled,
      sslCommerzEnabled: value.sslCommerzEnabled,
      bkashEnabled: value.bkashEnabled,
      bkashMerchantNumber: value.bkashMerchantNumber.trim() || null,
      nagadEnabled: value.nagadEnabled,
      nagadMerchantNumber: value.nagadMerchantNumber.trim() || null,
      rocketEnabled: value.rocketEnabled,
      rocketMerchantNumber: value.rocketMerchantNumber.trim() || null,
      voucherPointsEnabled: value.voucherPointsEnabled,
      voucherPointValue: Number(value.voucherPointValue) || 1,
      voucherEarnPercent: Number(value.voucherEarnPercent) || 0,
      voucherMaxRedeemPercent: Number(value.voucherMaxRedeemPercent) || 0,
      socialLinks,
      footerAbout: value.footerAbout.trim() || null,
      copyrightText: value.copyrightText.trim() || null,
      menuItems: this.menuItems().filter((item) => item.label.trim() && item.url.trim())
    };
    this.saving.set(true);
    this.admin.updateSettings(request).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.patchSettings(settings);
        this.content.loadSettings(true).subscribe({ error: () => undefined });
        this.toast.success('Settings saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save settings');
      }
    });
  }

  openShipping(): void {
    this.editingShipping.set(null);
    this.shippingForm.reset({
      name: '',
      description: '',
      cost: 0,
      estimatedDaysMin: 1,
      estimatedDaysMax: 3,
      isActive: true,
      isDefault: false
    });
    this.shippingOpen.set(true);
  }

  editShipping(method: ShippingMethod): void {
    this.editingShipping.set(method);
    this.shippingForm.reset({
      name: method.name,
      description: method.description ?? '',
      cost: method.cost,
      estimatedDaysMin: method.estimatedDaysMin,
      estimatedDaysMax: method.estimatedDaysMax,
      isActive: method.isActive,
      isDefault: method.isDefault
    });
    this.shippingOpen.set(true);
  }

  closeShipping(): void {
    this.shippingOpen.set(false);
    this.editingShipping.set(null);
  }

  saveShipping(): void {
    if (this.shippingForm.invalid) {
      this.shippingForm.markAllAsTouched();
      this.toast.error('Complete the required shipping fields');
      return;
    }
    const value = this.shippingForm.getRawValue();
    if (Number(value.estimatedDaysMax) < Number(value.estimatedDaysMin)) {
      this.toast.error('Maximum delivery time must be at least the minimum');
      return;
    }
    const request: ShippingMethodRequest = {
      name: value.name.trim(),
      description: value.description.trim() || null,
      cost: Number(value.cost) || 0,
      estimatedDaysMin: Number(value.estimatedDaysMin) || 0,
      estimatedDaysMax: Number(value.estimatedDaysMax) || 0,
      isActive: value.isActive,
      isDefault: value.isDefault
    };
    this.saving.set(true);
    const current = this.editingShipping();
    const operation = current
      ? this.admin.updateShippingMethod(current.id, request)
      : this.admin.createShippingMethod(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Shipping method updated' : 'Shipping method created');
        this.closeShipping();
        this.loadShipping();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save shipping method');
      }
    });
  }

  async removeShipping(method: ShippingMethod): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete shipping method',
      message: `Delete “${method.name}”? Existing orders are unaffected.`,
      confirmText: 'Delete method',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteShippingMethod(method.id).subscribe({
      next: () => {
        this.toast.success('Shipping method deleted');
        this.loadShipping();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete shipping method')
    });
  }

  selectRole(role: Role): void {
    this.selectedRole.set(role);
    this.selectedPermissions.set([...role.permissions]);
  }

  isSuperAdmin(role: Role): boolean {
    return role.name === 'SuperAdmin';
  }

  isCustomerRole(role: Role): boolean {
    return role.name === 'Customer';
  }

  isReadOnlyRole(role: Role): boolean {
    return this.isSuperAdmin(role) || this.isCustomerRole(role);
  }

  isSuperAdminUser(): boolean {
    return this.auth.user()?.role === 'SuperAdmin';
  }

  togglePermission(key: string, event: Event): void {
    const role = this.selectedRole();
    if (role && this.isReadOnlyRole(role)) return;
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedPermissions.update((list) =>
      checked ? (list.includes(key) ? list : [...list, key]) : list.filter((item) => item !== key)
    );
  }

  savePermissions(): void {
    const role = this.selectedRole();
    if (!role || this.isReadOnlyRole(role)) return;
    this.saving.set(true);
    this.admin.updateRolePermissions(role.name, this.selectedPermissions()).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.roles.update((roles) => roles.map((item) => (item.id === updated.id ? updated : item)));
        this.selectedRole.set(updated);
        this.selectedPermissions.set([...updated.permissions]);
        this.toast.success('Role permissions updated');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to update permissions');
      }
    });
  }

  private patchSettings(settings: WebsiteSettings): void {
    this.storeForm.reset({
      storeName: settings.storeName,
      tagline: settings.tagline ?? '',
      logoUrl: settings.logoUrl ?? '',
      email: settings.email ?? '',
      phone: settings.phone ?? '',
      address: settings.address ?? '',
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      taxRate: settings.taxRate,
      flatShippingRate: settings.flatShippingRate,
      freeShippingThreshold: settings.freeShippingThreshold,
      codEnabled: settings.codEnabled,
      stripeEnabled: settings.stripeEnabled,
      sslCommerzEnabled: settings.sslCommerzEnabled,
      bkashEnabled: settings.bkashEnabled,
      bkashMerchantNumber: settings.bkashMerchantNumber ?? '',
      nagadEnabled: settings.nagadEnabled,
      nagadMerchantNumber: settings.nagadMerchantNumber ?? '',
      rocketEnabled: settings.rocketEnabled,
      rocketMerchantNumber: settings.rocketMerchantNumber ?? '',
      voucherPointsEnabled: settings.voucherPointsEnabled,
      voucherPointValue: settings.voucherPointValue,
      voucherEarnPercent: settings.voucherEarnPercent,
      voucherMaxRedeemPercent: settings.voucherMaxRedeemPercent,
      footerAbout: settings.footerAbout ?? '',
      copyrightText: settings.copyrightText ?? ''
    });
    this.socials.update((rows) =>
      rows.map((row) => ({ key: row.key, value: settings.socialLinks?.[row.key] ?? '' }))
    );
    this.menuItems.set((settings.menuItems ?? []).map((item) => ({ ...item })));
  }
}
