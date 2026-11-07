import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon],
  template: `
    <div class="container-luxe py-10 lg:py-14">
      <div class="mx-auto max-w-5xl">
        <div class="text-center">
          <p class="eyebrow">We're here to help</p>
          <h1 class="section-title mt-2">Get in touch</h1>
          <p class="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-500">
            Questions about a product, an order or a return? Send us a message and a member of our team will reply within one business day.
          </p>
        </div>

        <div class="mt-10 grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]">
          <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-7">
            @if (sent()) {
              <div class="py-8 text-center">
                <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-success">
                  <app-icon name="check" [size]="26" />
                </span>
                <h2 class="mt-4 font-display text-2xl font-semibold text-ink-900">Message sent</h2>
                <p class="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
                  Thank you for reaching out. We've received your message and will reply to the email address you provided.
                </p>
                <div class="mt-5 flex justify-center gap-2">
                  <button type="button" class="btn-outline btn-sm" (click)="reset()">Send another message</button>
                  <a routerLink="/products" class="btn-ghost btn-sm">Continue shopping</a>
                </div>
              </div>
            } @else {
              <h2 class="text-lg font-semibold text-ink-900">Send a message</h2>
              <form class="mt-5 space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label class="label" for="name">Your name</label>
                    <input id="name" type="text" class="input" formControlName="name" autocomplete="name" />
                    @if (form.controls.name.touched && form.controls.name.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Name is required.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="email">Email address</label>
                    <input id="email" type="email" class="input" formControlName="email" autocomplete="email" />
                    @if (form.controls.email.touched && form.controls.email.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Enter a valid email address.</p>
                    }
                  </div>
                  <div>
                    <label class="label" for="phone">Phone <span class="font-normal normal-case tracking-normal text-ink-400">(optional)</span></label>
                    <input id="phone" type="tel" class="input" formControlName="phone" autocomplete="tel" />
                  </div>
                  <div>
                    <label class="label" for="subject">Subject</label>
                    <input id="subject" type="text" class="input" formControlName="subject" placeholder="Order, product, return…" />
                    @if (form.controls.subject.touched && form.controls.subject.invalid) {
                      <p class="mt-1.5 text-[11px] text-danger">Subject is required.</p>
                    }
                  </div>
                </div>
                <div>
                  <label class="label" for="message">Message</label>
                  <textarea id="message" rows="6" class="input resize-y" formControlName="message" placeholder="Tell us how we can help"></textarea>
                  @if (form.controls.message.touched && form.controls.message.invalid) {
                    <p class="mt-1.5 text-[11px] text-danger">Please add at least 10 characters.</p>
                  }
                </div>
                <button type="submit" class="btn-primary" [disabled]="sending()">
                  @if (sending()) {
                    <span class="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream"></span>
                    Sending…
                  } @else {
                    Send message <app-icon name="send" [size]="15" />
                  }
                </button>
              </form>
            }
          </section>

          <aside class="space-y-4">
            <div class="rounded-2xl border border-ink-100 bg-white p-5">
              <h2 class="text-sm font-semibold text-ink-900">Contact details</h2>
              <ul class="mt-3 space-y-3 text-sm text-ink-600">
                @if (settings()?.email; as email) {
                  <li class="flex items-start gap-3">
                    <app-icon name="mail" [size]="17" class="mt-0.5 text-gold-600" />
                    <a [href]="'mailto:' + email" class="hover:text-ink-900">{{ email }}</a>
                  </li>
                }
                @if (settings()?.phone; as phone) {
                  <li class="flex items-start gap-3">
                    <app-icon name="phone" [size]="17" class="mt-0.5 text-gold-600" />
                    <a [href]="'tel:' + phone" class="hover:text-ink-900">{{ phone }}</a>
                  </li>
                }
                @if (settings()?.address; as address) {
                  <li class="flex items-start gap-3">
                    <app-icon name="map-pin" [size]="17" class="mt-0.5 text-gold-600" />
                    <span>{{ address }}</span>
                  </li>
                }
                <li class="flex items-start gap-3">
                  <app-icon name="clock" [size]="17" class="mt-0.5 text-gold-600" />
                  <span>Monday–Friday, 9:00–18:00</span>
                </li>
              </ul>

              @if (socialLinks().length) {
                <div class="mt-4 flex gap-2 border-t border-ink-100 pt-4">
                  @for (link of socialLinks(); track link.url) {
                    <a [href]="link.url" target="_blank" rel="noopener noreferrer" class="flex h-9 w-9 items-center justify-center rounded-full bg-ink-50 text-ink-600 transition hover:bg-ink-900 hover:text-cream" [attr.aria-label]="link.name">
                      <app-icon [name]="link.icon" [size]="15" />
                    </a>
                  }
                </div>
              }
            </div>

            <div class="rounded-2xl border border-ink-100 bg-white p-5">
              <h2 class="text-sm font-semibold text-ink-900">Quick answers</h2>
              <ul class="mt-3 space-y-2 text-sm">
                <li><a routerLink="/faq" class="flex items-center justify-between gap-2 text-ink-600 hover:text-ink-900">Frequently asked questions <app-icon name="chevron-right" [size]="14" /></a></li>
                <li><a routerLink="/shipping-returns" class="flex items-center justify-between gap-2 text-ink-600 hover:text-ink-900">Shipping & returns <app-icon name="chevron-right" [size]="14" /></a></li>
                <li><a routerLink="/track-order" class="flex items-center justify-between gap-2 text-ink-600 hover:text-ink-900">Track an order <app-icon name="chevron-right" [size]="14" /></a></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `
})
export class ContactPage {
  readonly auth = inject(AuthService);
  private readonly content = inject(ContentService);
  private readonly toast = inject(ToastService);

  readonly settings = this.content.settings;
  readonly sending = signal(false);
  readonly sent = signal(false);

  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    phone: new FormControl('', { nonNullable: true }),
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(160)] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(5000)] })
  });

  constructor() {
    const user = this.auth.user();
    if (user) {
      this.form.patchValue({ name: user.fullName, email: user.email, phone: user.phone ?? '' });
    }
  }

  socialLinks(): { name: string; url: string; icon: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' }[] {
    const links = this.settings()?.socialLinks ?? {};
    const allowed = ['instagram', 'facebook', 'twitter', 'linkedin', 'youtube'] as const;
    return allowed
      .filter((name) => !!links[name])
      .map((name) => ({ name, url: links[name], icon: name }));
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const value = this.form.getRawValue();
    this.content
      .contact({
        name: value.name.trim(),
        email: value.email.trim(),
        phone: value.phone.trim() || null,
        subject: value.subject.trim(),
        message: value.message.trim()
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
          this.toast.success('Your message has been sent');
        },
        error: () => this.sending.set(false)
      });
  }

  reset(): void {
    this.sent.set(false);
    this.form.reset({ name: '', email: '', phone: '', subject: '', message: '' });
    const user = this.auth.user();
    if (user) {
      this.form.patchValue({ name: user.fullName, email: user.email, phone: user.phone ?? '' });
    }
  }
}
