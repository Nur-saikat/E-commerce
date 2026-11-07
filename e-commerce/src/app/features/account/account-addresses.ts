import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { Address } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-account-addresses',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, EmptyState],
  template: `
    <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-ink-900">Saved addresses</h2>
          <p class="mt-0.5 text-xs text-ink-500">Addresses are only used to speed up checkout.</p>
        </div>
        @if (!editing()) {
          <button type="button" class="btn-primary btn-sm" (click)="startCreate()">
            <app-icon name="plus" [size]="15" /> Add address
          </button>
        }
      </div>

      @if (editing()) {
        <form class="mt-5 rounded-xl border border-ink-200 bg-cream/60 p-4 sm:p-5" [formGroup]="form" (ngSubmit)="save()" novalidate>
          <h3 class="text-sm font-semibold text-ink-900">{{ editingId() ? 'Edit address' : 'New address' }}</h3>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="fullName">Full name</label>
              <input id="fullName" type="text" class="input" formControlName="fullName" autocomplete="name" />
              @if (form.controls.fullName.touched && form.controls.fullName.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Full name is required.</p>
              }
            </div>
            <div>
              <label class="label" for="phone">Phone</label>
              <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" />
              @if (form.controls.phone.touched && form.controls.phone.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Phone is required.</p>
              }
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="street">Street address</label>
              <input id="street" type="text" class="input" formControlName="street" autocomplete="street-address" />
              @if (form.controls.street.touched && form.controls.street.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Street address is required.</p>
              }
            </div>
            <div>
              <label class="label" for="city">City</label>
              <input id="city" type="text" class="input" formControlName="city" autocomplete="address-level2" />
              @if (form.controls.city.touched && form.controls.city.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">City is required.</p>
              }
            </div>
            <div>
              <label class="label" for="state">State / region</label>
              <input id="state" type="text" class="input" formControlName="state" autocomplete="address-level1" />
              @if (form.controls.state.touched && form.controls.state.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">State is required.</p>
              }
            </div>
            <div>
              <label class="label" for="postalCode">Postal code</label>
              <input id="postalCode" type="text" class="input" formControlName="postalCode" autocomplete="postal-code" />
              @if (form.controls.postalCode.touched && form.controls.postalCode.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Postal code is required.</p>
              }
            </div>
            <div>
              <label class="label" for="country">Country</label>
              <input id="country" type="text" class="input" formControlName="country" autocomplete="country-name" />
              @if (form.controls.country.touched && form.controls.country.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Country is required.</p>
              }
            </div>
            <label class="flex items-center gap-2.5 text-xs text-ink-600 sm:col-span-2">
              <input type="checkbox" class="h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" formControlName="isDefault" />
              Make this my default delivery address
            </label>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              @if (saving()) {
                Saving…
              } @else {
                {{ editingId() ? 'Save changes' : 'Add address' }}
              }
            </button>
            <button type="button" class="btn-ghost btn-sm" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      }

      @if (account.loading() && !account.addresses().length) {
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="skeleton h-40 rounded-xl"></div>
          <div class="skeleton h-40 rounded-xl"></div>
        </div>
      } @else if (!account.addresses().length && !editing()) {
        <div class="mt-5">
          <app-empty-state
            icon="map-pin"
            title="No addresses yet"
            message="Add a delivery address to check out faster next time."
            actionLabel="Add your first address"
            (action)="startCreate()"
          />
        </div>
      } @else {
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          @for (address of account.addresses(); track address.id) {
            <div class="rounded-xl border p-4" [class]="address.isDefault ? 'border-ink-900 bg-ink-50/40' : 'border-ink-100'">
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-semibold text-ink-900">{{ address.fullName }}</p>
                @if (address.isDefault) {
                  <span class="badge bg-ink-900 text-cream">Default</span>
                }
              </div>
              <p class="mt-2 text-xs leading-relaxed text-ink-600">
                {{ address.street }}<br />
                {{ address.city }}, {{ address.state }} {{ address.postalCode }}<br />
                {{ address.country }}<br />
                {{ address.phone }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                <button type="button" class="btn-ghost btn-sm !px-2" (click)="startEdit(address)">
                  <app-icon name="edit" [size]="13" /> Edit
                </button>
                @if (!address.isDefault) {
                  <button type="button" class="btn-ghost btn-sm !px-2" (click)="setDefault(address)">Make default</button>
                }
                <button type="button" class="btn-ghost btn-sm !px-2 text-danger hover:bg-red-50" (click)="remove(address)">
                  <app-icon name="trash" [size]="13" /> Delete
                </button>
              </div>
            </div>
          }
        </div>
      }
    </section>
  `
})
export class AccountAddresses implements OnInit {
  readonly account = inject(AccountService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);

  readonly form = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    street: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    city: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    state: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    postalCode: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    country: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    isDefault: new FormControl(false, { nonNullable: true })
  });

  ngOnInit(): void {
    this.account.getAddresses().subscribe({ error: () => undefined });
  }

  startCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      fullName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      isDefault: this.account.addresses().length === 0
    });
    this.editing.set(true);
  }

  startEdit(address: Address): void {
    this.editingId.set(address.id);
    this.form.reset({
      fullName: address.fullName,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault
    });
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editingId.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.form.getRawValue();
    const request = { ...value };
    const id = this.editingId();
    const operation = id ? this.account.updateAddress(id, request) : this.account.addAddress(request);
    operation.subscribe({
      next: (address) => {
        if (value.isDefault) {
          this.account.addresses.update((items) => items.map((item) => ({ ...item, isDefault: item.id === address.id })));
        }
        if (!id) {
          this.account.addresses.set([...this.account.addresses().filter((a) => a.id !== address.id), address]);
          if (address.isDefault) {
            this.account.addresses.update((items) => items.map((item) => ({ ...item, isDefault: item.id === address.id })));
          }
        }
        this.toast.success(id ? 'Address updated' : 'Address added');
        this.saving.set(false);
        this.cancelEdit();
      },
      error: () => this.saving.set(false)
    });
  }

  async remove(address: Address): Promise<void> {
    const confirmed = await this.confirm.confirm({
      title: 'Delete this address?',
      message: `${address.fullName} — ${address.street}, ${address.city}. This cannot be undone.`,
      confirmText: 'Delete',
      danger: true
    });
    if (!confirmed) return;
    this.account.deleteAddress(address.id).subscribe({
      next: () => {
        this.toast.info('Address deleted');
        this.account.getAddresses().subscribe({ error: () => undefined });
      }
    });
  }

  setDefault(address: Address): void {
    this.account.setDefault(address.id).subscribe({
      next: () => this.toast.success('Default address updated')
    });
  }
}
