import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/components/icon/icon';
import { AuthShell } from './auth-shell';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthShell],
  template: `
    <app-auth-shell
      eyebrow="Account recovery"
      title="Choose a new password"
      subtitle="Pick something strong and unique to keep your account secure."
      headline="A fresh start, securely."
      blurb="Your reset link can only be used once and expires shortly after it is issued."
    >
      @if (done()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <span class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <app-icon name="check" [size]="22" />
          </span>
          <p class="mt-3 text-sm font-semibold text-emerald-900">Password updated</p>
          <p class="mt-1 text-sm text-emerald-800">You can now sign in with your new password.</p>
        </div>
        <a routerLink="/login" class="btn-primary mt-5 w-full">Sign in</a>
      } @else if (!token()) {
        <div class="rounded-xl border border-red-200 bg-red-50 p-5">
          <div class="flex items-start gap-3">
            <app-icon name="alert-circle" [size]="18" class="mt-0.5 shrink-0 text-red-700" />
            <div>
              <p class="text-sm font-semibold text-red-900">Invalid reset link</p>
              <p class="mt-1 text-sm text-red-800">This link is missing its token. Request a new password reset email.</p>
            </div>
          </div>
        </div>
        <a routerLink="/forgot-password" class="btn-primary mt-5 w-full">Request a new link</a>
      } @else {
        @if (error()) {
          <div class="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <app-icon name="alert-circle" [size]="16" class="mt-0.5 shrink-0" />
            <span>{{ error() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
          <div>
            <label class="label" for="password">New password</label>
            <div class="relative">
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="input pr-11"
                formControlName="password"
                autocomplete="new-password"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                (click)="showPassword.set(!showPassword())"
              >
                <app-icon name="eye" [size]="16" />
              </button>
            </div>
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <p class="mt-1.5 text-[11px] text-danger">
                Use 8+ characters with an uppercase letter, a lowercase letter and a number.
              </p>
            }
          </div>

          <div>
            <label class="label" for="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" />
            @if (form.errors?.['mismatch'] && form.controls.confirmPassword.touched) {
              <p class="mt-1.5 text-[11px] text-danger">Passwords do not match.</p>
            }
          </div>

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            @if (loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
              Updating password…
            } @else {
              Update password <app-icon name="arrow-right" [size]="16" />
            }
          </button>
        </form>
      }
    </app-auth-shell>
  `
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  readonly token = signal<string | null>(null);
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
        ]
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    },
    { validators: passwordsMatch }
  );

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  submit(): void {
    const token = this.token();
    if (!token) return;
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword({ token, password: this.form.controls.password.value }).subscribe({
      next: () => {
        this.loading.set(false);
        this.done.set(true);
        this.toast.success('Password updated');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const messages = err.error?.errors as string[] | undefined;
        this.error.set(messages?.length ? messages.join(' ') : err.error?.message ?? 'This reset link is invalid or has expired.');
      }
    });
  }
}
