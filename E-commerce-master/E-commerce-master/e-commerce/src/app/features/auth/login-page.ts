import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon/icon';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthShell],
  template: `
    <app-auth-shell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Access your orders, saved addresses and wishlist."
      headline="Your edit, always where you left it."
      blurb="Sign in to pick up where you left off — your bag, favourites and order history are waiting."
    >
      @if (error()) {
        <div class="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <app-icon name="alert-circle" [size]="16" class="mt-0.5 shrink-0" />
          <span>{{ error() }}</span>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-4">
        <div>
          <label class="label" for="email">Email address</label>
          <input id="email" type="email" class="input" formControlName="email" autocomplete="email" placeholder="you@example.com" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="mt-1.5 text-[11px] text-danger">Enter a valid email address.</p>
          }
        </div>

        <div>
          <div class="flex items-center justify-between">
            <label class="label" for="password">Password</label>
            <a routerLink="/forgot-password" class="mb-1.5 text-[11px] font-medium text-gold-600 hover:underline">Forgot password?</a>
          </div>
          <div class="relative">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              class="input pr-11"
              formControlName="password"
              autocomplete="current-password"
              placeholder="Your password"
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
            <p class="mt-1.5 text-[11px] text-danger">Password is required.</p>
          }
        </div>

        <button type="submit" class="btn-primary w-full" [disabled]="auth.loading()">
          @if (auth.loading()) {
            <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
            Signing in…
          } @else {
            Sign in <app-icon name="arrow-right" [size]="16" />
          }
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-500">
        New to Safwan?
        <a routerLink="/register" class="font-semibold text-ink-900 underline underline-offset-4 hover:text-gold-600">Create an account</a>
      </p>

      <div class="mt-6 flex items-center gap-2 rounded-xl bg-cream px-4 py-3 text-[11px] text-ink-500">
        <app-icon name="lock" [size]="14" class="shrink-0 text-ink-400" />
        <span>Protected by encrypted authentication and rotating refresh tokens.</span>
      </div>
    </app-auth-shell>
  `
})
export class LoginPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const safeReturn = returnUrl && returnUrl.startsWith('/') ? returnUrl : null;
        this.router.navigateByUrl(safeReturn ?? (this.auth.isAdmin() ? '/admin' : '/'));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'Sign in failed. Check your email and password.');
      }
    });
  }
}
