import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ForgotPasswordResponse } from '../../core/models/api.models';
import { Icon } from '../../shared/components/icon/icon';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthShell],
  template: `
    <app-auth-shell
      eyebrow="Account recovery"
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure link to choose a new password."
      headline="Locked out? We'll get you back in."
      blurb="Password resets are single-use and expire quickly, keeping your account safe."
    >
      @if (sent()) {
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div class="flex items-start gap-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <app-icon name="mail" [size]="18" />
            </span>
            <div>
              <p class="text-sm font-semibold text-emerald-900">Check your inbox</p>
              <p class="mt-1 text-sm leading-relaxed text-emerald-800">{{ result()?.message || 'If an account exists for that email, a reset link is on its way.' }}</p>

              @if (resetLink()) {
                <div class="mt-4 rounded-lg border border-emerald-200 bg-white p-3">
                  <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Development delivery</p>
                  <p class="mt-1 text-xs text-ink-600">Email delivery is logged by the API. Use the link below to continue:</p>
                  <a [routerLink]="resetLink()" class="mt-2 inline-flex break-all text-xs font-medium text-gold-600 underline underline-offset-2">
                    Reset your password
                  </a>
                </div>
              }
            </div>
          </div>
        </div>

        <a routerLink="/login" class="btn-outline mt-5 w-full"><app-icon name="arrow-left" [size]="15" /> Back to sign in</a>
      } @else {
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

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            @if (loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
              Sending link…
            } @else {
              Send reset link <app-icon name="send" [size]="15" />
            }
          </button>
        </form>
      }

      <p class="mt-6 text-center text-sm text-ink-500">
        Remembered it?
        <a routerLink="/login" class="font-semibold text-ink-900 underline underline-offset-4 hover:text-gold-600">Sign in</a>
      </p>
    </app-auth-shell>
  `
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<ForgotPasswordResponse | null>(null);
  readonly resetLink = signal<string | null>(null);

  readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.forgotPassword(this.form.controls.email.value.trim()).subscribe({
      next: (res) => {
        this.result.set(res);
        if (res.resetToken) {
          this.resetLink.set(`/reset-password?token=${encodeURIComponent(res.resetToken)}`);
        } else if (res.resetUrl) {
          this.resetLink.set(res.resetUrl);
        }
        this.sent.set(true);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.error?.message ?? 'We could not send the reset link. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
