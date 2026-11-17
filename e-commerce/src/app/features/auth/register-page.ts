import { Component, OnDestroy, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon/icon';
import { AuthShell } from './auth-shell';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthShell],
  template: `
    <app-auth-shell
      eyebrow="Join Safwan"
      [title]="step() === 'details' ? 'Create your account' : 'Verify your email'"
      [subtitle]="
        step() === 'details'
          ? 'A few details, then a quick email check.'
          : 'Enter the 6-digit code we emailed to ' + emailAddress() + '. Your account is created once it is confirmed.'
      "
      headline="A considered wardrobe starts here."
      blurb="Create an account to save favourites, store addresses and follow every order from dispatch to doorstep."
    >
      @if (error()) {
        <div class="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <app-icon name="alert-circle" [size]="16" class="mt-0.5 shrink-0" />
          <span>{{ error() }}</span>
        </div>
      }

      @if (step() === 'details') {
        <form [formGroup]="form" (ngSubmit)="sendCode()" novalidate class="space-y-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="firstName">First name</label>
              <input id="firstName" type="text" class="input" formControlName="firstName" autocomplete="given-name" />
              @if (form.controls.firstName.touched && form.controls.firstName.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">First name is required.</p>
              }
            </div>
            <div>
              <label class="label" for="lastName">Last name</label>
              <input id="lastName" type="text" class="input" formControlName="lastName" autocomplete="family-name" />
              @if (form.controls.lastName.touched && form.controls.lastName.invalid) {
                <p class="mt-1.5 text-[11px] text-danger">Last name is required.</p>
              }
            </div>
          </div>

          <div>
            <label class="label" for="email">Email address</label>
            <input id="email" type="email" class="input" formControlName="email" autocomplete="email" placeholder="you@example.com" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <p class="mt-1.5 text-[11px] text-danger">Enter a valid email address.</p>
            }
          </div>

          <div>
            <label class="label" for="phone">Phone <span class="font-normal normal-case tracking-normal text-ink-400">(optional)</span></label>
            <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" placeholder="01700000000" />
          </div>

          <div>
            <label class="label" for="password">Password</label>
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
            <label class="label" for="confirmPassword">Confirm password</label>
            <input id="confirmPassword" type="password" class="input" formControlName="confirmPassword" autocomplete="new-password" />
            @if (form.errors?.['mismatch'] && form.controls.confirmPassword.touched) {
              <p class="mt-1.5 text-[11px] text-danger">Passwords do not match.</p>
            }
          </div>

          <label class="flex items-start gap-2.5 text-xs leading-relaxed text-ink-600">
            <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-ink-300 text-ink-900 focus:ring-gold-500" formControlName="terms" />
            <span>
              I agree to the
              <a routerLink="/terms" target="_blank" class="font-medium text-ink-900 underline underline-offset-2">terms of service</a>
              and
              <a routerLink="/privacy" target="_blank" class="font-medium text-ink-900 underline underline-offset-2">privacy policy</a>.
            </span>
          </label>
          @if (form.controls.terms.touched && form.controls.terms.invalid) {
            <p class="-mt-2 text-[11px] text-danger">Please accept the terms to continue.</p>
          }

          <button type="submit" class="btn-primary w-full" [disabled]="auth.loading()">
            @if (auth.loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
              Sending code…
            } @else {
              Send verification code <app-icon name="arrow-right" [size]="16" />
            }
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-ink-500">
          Already have an account?
          <a routerLink="/login" class="font-semibold text-ink-900 underline underline-offset-4 hover:text-gold-600">Sign in</a>
        </p>
      } @else {
        @if (devCode()) {
          <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Development code: <span class="font-semibold tracking-[0.3em]">{{ devCode() }}</span>
          </div>
        }

        <form (ngSubmit)="verify()" novalidate class="space-y-4">
          <div>
            <label class="label" for="otp">Verification code</label>
            <input
              id="otp"
              type="text"
              class="input text-center text-lg tracking-[0.5em]"
              [formControl]="code"
              inputmode="numeric"
              maxlength="6"
              autocomplete="one-time-code"
              placeholder="123456"
            />
            @if (code.touched && code.invalid) {
              <p class="mt-1.5 text-[11px] text-danger">Enter the 6-digit code from your email.</p>
            }
          </div>

          <button type="submit" class="btn-primary w-full" [disabled]="auth.loading()">
            @if (auth.loading()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
              Verifying…
            } @else {
              Verify &amp; create account
            }
          </button>

          <button
            type="button"
            class="btn-outline w-full"
            [disabled]="auth.loading() || resendIn() > 0"
            (click)="sendCode()"
          >
            {{ resendIn() > 0 ? 'Resend code in ' + resendIn() + 's' : 'Resend code' }}
          </button>

          <button type="button" class="btn-ghost w-full" (click)="editDetails()">Edit your details</button>
        </form>
      }
    </app-auth-shell>
  `
})
export class RegisterPage implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly showPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly step = signal<'details' | 'verify'>('details');
  readonly devCode = signal<string | null>(null);
  readonly resendIn = signal(0);

  private cooldown: ReturnType<typeof setInterval> | null = null;

  readonly form = new FormGroup(
    {
      firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
      lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(60)] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      phone: new FormControl('', { nonNullable: true }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
        ]
      }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      terms: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] })
    },
    { validators: passwordsMatch }
  );

  readonly code = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)]
  });

  emailAddress(): string {
    return this.form.controls.email.value.trim();
  }

  sendCode(): void {
    this.error.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.updateValueAndValidity();
      return;
    }

    const value = this.form.getRawValue();
    this.auth
      .requestRegistrationOtp({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        email: value.email.trim(),
        password: value.password,
        phone: value.phone.trim() || null
      })
      .subscribe({
        next: (challenge) => {
          this.step.set('verify');
          this.devCode.set(challenge.otp ?? null);
          this.code.reset('');
          this.startCooldown(challenge.resendAfterSeconds);
        },
        error: (err: HttpErrorResponse) => this.showError(err, 'Could not send the verification code.')
      });
  }

  verify(): void {
    this.error.set(null);
    if (this.code.invalid) {
      this.code.markAsTouched();
      return;
    }

    this.auth.verifyRegistration(this.emailAddress(), this.code.value).subscribe({
      next: () => {
        this.stopCooldown();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const safeReturn = returnUrl && returnUrl.startsWith('/') ? returnUrl : null;
        this.router.navigateByUrl(safeReturn ?? '/');
      },
      error: (err: HttpErrorResponse) => this.showError(err, 'Could not verify that code.')
    });
  }

  editDetails(): void {
    this.step.set('details');
    this.devCode.set(null);
    this.code.reset('');
    this.error.set(null);
    this.resendIn.set(0);
    this.stopCooldown();
  }

  ngOnDestroy(): void {
    this.stopCooldown();
  }

  private startCooldown(seconds: number): void {
    this.stopCooldown();
    this.resendIn.set(Math.max(0, seconds));
    if (this.resendIn() === 0) return;
    this.cooldown = setInterval(() => {
      const next = this.resendIn() - 1;
      this.resendIn.set(Math.max(0, next));
      if (next <= 0) this.stopCooldown();
    }, 1000);
  }

  private stopCooldown(): void {
    if (this.cooldown) clearInterval(this.cooldown);
    this.cooldown = null;
  }

  private showError(err: HttpErrorResponse, fallback: string): void {
    const messages = err.error?.errors as string[] | undefined;
    this.error.set(messages?.length ? messages.join(' ') : err.error?.message ?? fallback);
  }
}
