import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-account-profile',
  standalone: true,
  imports: [ReactiveFormsModule, Icon],
  template: `
    <div class="space-y-6">
      <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
        <h2 class="text-lg font-semibold text-ink-900">Profile details</h2>
        <p class="mt-0.5 text-xs text-ink-500">Update the contact information linked to your account.</p>

        <div class="mt-4 flex items-center gap-4 rounded-xl bg-cream p-4">
          <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-900 font-display text-lg font-semibold text-cream">
            {{ initials() }}
          </span>
          <div>
            <p class="text-sm font-semibold text-ink-900">{{ auth.fullName() }}</p>
            <p class="text-xs text-ink-500">{{ auth.user()?.email }}</p>
            <p class="mt-1 text-[10px] uppercase tracking-wider text-gold-600">{{ auth.user()?.role }} member</p>
          </div>
        </div>

        <form class="mt-5 space-y-4" [formGroup]="profileForm" (ngSubmit)="saveProfile()" novalidate>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="firstName">First name</label>
              <input id="firstName" type="text" class="input" formControlName="firstName" autocomplete="given-name" />
              @if (profileForm.controls.firstName.touched && profileForm.controls.firstName.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">First name is required.</p>
              }
            </div>
            <div>
              <label class="label" for="lastName">Last name</label>
              <input id="lastName" type="text" class="input" formControlName="lastName" autocomplete="family-name" />
              @if (profileForm.controls.lastName.touched && profileForm.controls.lastName.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Last name is required.</p>
              }
            </div>
            <div>
              <label class="label" for="email">Email</label>
              <input id="email" type="email" class="input bg-ink-50" [value]="auth.user()?.email" disabled />
              <p class="mt-1.5 text-[11px] text-ink-400">Contact support to change your email address.</p>
            </div>
            <div>
              <label class="label" for="phone">Phone</label>
              <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" placeholder="01700000000" />
            </div>
          </div>

          <button type="submit" class="btn-primary" [disabled]="savingProfile()">
            @if (savingProfile()) {
              Saving…
            } @else {
              Save changes
            }
          </button>
        </form>
      </section>

      <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
        <h2 class="text-lg font-semibold text-ink-900">Change password</h2>
        <p class="mt-0.5 text-xs text-ink-500">Choose a strong password you don't use anywhere else.</p>

        @if (passwordError()) {
          <div class="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <app-icon name="alert-circle" [size]="16" class="mt-0.5 shrink-0" />
            <span>{{ passwordError() }}</span>
          </div>
        }

        <form class="mt-4 space-y-4" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
          <div>
            <label class="label" for="currentPassword">Current password</label>
            <input id="currentPassword" type="password" class="input" formControlName="currentPassword" autocomplete="current-password" />
            @if (passwordForm.controls.currentPassword.touched && passwordForm.controls.currentPassword.invalid) {
              <p class="mt-1.5 text-[11px] text-danger">Current password is required.</p>
            }
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="newPassword">New password</label>
              <input id="newPassword" type="password" class="input" formControlName="newPassword" autocomplete="new-password" />
              @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Use 8+ characters with upper, lower and a number.</p>
              }
            </div>
            <div>
              <label class="label" for="confirmPassword">Confirm new password</label>
              <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" />
              @if (passwordForm.errors?.['mismatch'] && passwordForm.controls.confirmPassword.touched) {
                <p class="mt-1.5 text-[11px] text-danger">Passwords do not match.</p>
              }
            </div>
          </div>

          <button type="submit" class="btn-outline" [disabled]="savingPassword()">
            @if (savingPassword()) {
              Updating…
            } @else {
              Update password
            }
          </button>
        </form>
      </section>
    </div>
  `
})
export class AccountProfile implements OnInit {
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly profileForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    phone: new FormControl('', { nonNullable: true })
  });

  readonly passwordForm = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
        ]
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    },
    {
      validators: (group) => {
        const next = group.get('newPassword')?.value;
        const confirm = group.get('confirmPassword')?.value;
        return next && confirm && next !== confirm ? { mismatch: true } : null;
      }
    }
  );

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? ''
      });
    }
  }

  initials(): string {
    const user = this.auth.user();
    if (!user) return 'L';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'L';
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    const value = this.profileForm.getRawValue();
    this.auth
      .updateProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phone: value.phone.trim() || null,
        avatarUrl: this.auth.user()?.avatarUrl ?? null
      })
      .subscribe({
        next: () => {
          this.toast.success('Profile updated');
          this.savingProfile.set(false);
        },
        error: () => this.savingProfile.set(false)
      });
  }

  changePassword(): void {
    this.passwordError.set(null);
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    const value = this.passwordForm.getRawValue();
    this.auth
      .changePassword({ currentPassword: value.currentPassword, newPassword: value.newPassword })
      .subscribe({
        next: () => {
          this.toast.success('Password updated');
          this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.savingPassword.set(false);
        },
        error: (err: HttpErrorResponse) => {
          const messages = err.error?.errors as string[] | undefined;
          this.passwordError.set(messages?.length ? messages.join(' ') : err.error?.message ?? 'Could not update your password.');
          this.savingPassword.set(false);
        }
      });
  }
}
