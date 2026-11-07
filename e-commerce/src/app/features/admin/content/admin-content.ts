import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  Banner,
  BannerRequest,
  ContactMessage,
  NewsletterSubscriber,
  Paged,
  Testimonial,
  TestimonialRequest
} from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { RatingStars } from '../../../shared/components/rating-stars/rating-stars';
import { AssetUrlPipe } from '../../../shared/pipes/asset-url.pipe';

type ContentTab = 'banners' | 'testimonials' | 'messages' | 'subscribers';
type EditorKind = 'banner' | 'testimonial' | null;

const EMPTY_PAGE = { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, RatingStars, AssetUrlPipe, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Experience</p>
          <h2 class="admin-title">Content & messages</h2>
          <p class="mt-1 text-sm text-ink-500">Homepage banners, testimonials, enquiries and the newsletter list.</p>
        </div>
        @if (tab() === 'banners') {
          <button type="button" class="btn-primary btn-sm" (click)="openBanner()">
            <app-icon name="plus" [size]="14" /> New banner
          </button>
        } @else if (tab() === 'testimonials') {
          <button type="button" class="btn-primary btn-sm" (click)="openTestimonial()">
            <app-icon name="plus" [size]="14" /> New testimonial
          </button>
        } @else if (tab() === 'subscribers') {
          <button type="button" class="btn-outline btn-sm" (click)="exportSubscribers()">
            <app-icon name="download" [size]="14" /> Export CSV
          </button>
        }
      </div>

      <div class="admin-card flex flex-wrap gap-2">
        @for (item of tabs; track item.value) {
          <button
            type="button"
            class="rounded-full px-4 py-2 text-xs font-semibold transition"
            [class]="tab() === item.value ? 'bg-ink-900 text-cream' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'"
            (click)="selectTab(item.value)"
          >
            {{ item.label }}
          </button>
        }
        @if (tab() === 'messages' || tab() === 'subscribers') {
          <div class="relative ml-auto w-full max-w-xs">
            <app-icon name="search" [size]="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input [formControl]="search" type="search" class="input py-2 pl-8 text-xs" [placeholder]="tab() === 'messages' ? 'Search messages' : 'Search subscribers'" />
          </div>
        }
      </div>

      @if (editor() === 'banner') {
        <form [formGroup]="bannerForm" class="admin-card space-y-4" (ngSubmit)="saveBanner()">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-ink-900">{{ editingBanner() ? 'Edit banner' : 'New banner' }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
              <app-icon name="x" [size]="16" />
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="label" for="bannerTitle">Title *</label>
              <input id="bannerTitle" formControlName="title" class="input" />
            </div>
            <div>
              <label class="label" for="bannerPosition">Position *</label>
              <select id="bannerPosition" formControlName="position" class="input">
                <option value="Hero">Hero</option>
                <option value="Promo">Promo</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="label" for="bannerSubtitle">Subtitle</label>
              <input id="bannerSubtitle" formControlName="subtitle" class="input" />
            </div>
            <div>
              <label class="label" for="bannerImage">Image</label>
              <div class="flex gap-2">
                <input id="bannerImage" formControlName="imageUrl" class="input" placeholder="/uploads/… or https://…" />
                <label class="btn-outline btn-sm cursor-pointer whitespace-nowrap">
                  <app-icon name="upload" [size]="14" /> Upload
                  <input type="file" accept="image/*" class="hidden" (change)="uploadFor($event, 'banner')" />
                </label>
              </div>
            </div>
            <div>
              <label class="label" for="bannerLink">Link URL</label>
              <input id="bannerLink" formControlName="linkUrl" class="input" placeholder="/products?sort=latest" />
            </div>
            <div>
              <label class="label" for="bannerButton">Button text</label>
              <input id="bannerButton" formControlName="buttonText" class="input" placeholder="Shop the edit" />
            </div>
            <div>
              <label class="label" for="bannerSort">Sort order</label>
              <input id="bannerSort" type="number" formControlName="sortOrder" class="input" />
            </div>
            <div>
              <label class="label" for="bannerStart">Starts</label>
              <input id="bannerStart" type="datetime-local" formControlName="startAt" class="input" />
            </div>
            <div>
              <label class="label" for="bannerEnd">Ends</label>
              <input id="bannerEnd" type="datetime-local" formControlName="endAt" class="input" />
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Active
              </label>
            </div>
          </div>
          @if (bannerForm.controls.imageUrl.value) {
            <img [src]="bannerForm.controls.imageUrl.value | assetUrl" alt="Banner preview" class="h-32 w-full rounded-xl border border-ink-100 object-cover" />
          }
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save banner' }}
            </button>
          </div>
        </form>
      }

      @if (editor() === 'testimonial') {
        <form [formGroup]="testimonialForm" class="admin-card space-y-4" (ngSubmit)="saveTestimonial()">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-ink-900">{{ editingTestimonial() ? 'Edit testimonial' : 'New testimonial' }}</h3>
            <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-900" (click)="closeEditor()" aria-label="Close">
              <app-icon name="x" [size]="16" />
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <div>
              <label class="label" for="testimonialName">Name *</label>
              <input id="testimonialName" formControlName="name" class="input" />
            </div>
            <div>
              <label class="label" for="testimonialRole">Role / context</label>
              <input id="testimonialRole" formControlName="role" class="input" placeholder="Verified buyer" />
            </div>
            <div>
              <label class="label" for="testimonialRating">Rating</label>
              <select id="testimonialRating" formControlName="rating" class="input">
                @for (star of [5, 4, 3, 2, 1]; track star) {
                  <option [value]="star">{{ star }} star{{ star === 1 ? '' : 's' }}</option>
                }
              </select>
            </div>
            <div class="md:col-span-3">
              <label class="label" for="testimonialQuote">Quote *</label>
              <textarea id="testimonialQuote" formControlName="quote" rows="3" class="input resize-y"></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="label" for="testimonialAvatar">Avatar URL</label>
              <div class="flex gap-2">
                <input id="testimonialAvatar" formControlName="avatarUrl" class="input" />
                <label class="btn-outline btn-sm cursor-pointer whitespace-nowrap">
                  <app-icon name="upload" [size]="14" /> Upload
                  <input type="file" accept="image/*" class="hidden" (change)="uploadFor($event, 'testimonial')" />
                </label>
              </div>
            </div>
            <div>
              <label class="label" for="testimonialSort">Sort order</label>
              <input id="testimonialSort" type="number" formControlName="sortOrder" class="input" />
            </div>
            <label class="flex items-center gap-2 text-sm text-ink-700">
              <input type="checkbox" formControlName="isActive" class="accent-ink-900" /> Active
            </label>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline btn-sm" (click)="closeEditor()">Cancel</button>
            <button type="submit" class="btn-primary btn-sm" [disabled]="saving()">
              <app-icon name="save" [size]="14" /> {{ saving() ? 'Saving…' : 'Save testimonial' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        @switch (tab()) {
          @case ('banners') {
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (banner of banners(); track banner.id) {
                <article class="admin-card overflow-hidden p-0">
                  @if (banner.imageUrl) {
                    <img [src]="banner.imageUrl | assetUrl" [alt]="banner.title" class="h-36 w-full object-cover" />
                  } @else {
                    <div class="flex h-36 items-center justify-center bg-ink-50 text-ink-400"><app-icon name="image" [size]="26" /></div>
                  }
                  <div class="p-4">
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-ink-900">{{ banner.title }}</p>
                        <p class="text-xs text-ink-400">{{ banner.position }} · sort {{ banner.sortOrder }}</p>
                      </div>
                      <span [class]="banner.isActive ? 'badge-success' : 'badge-muted'">{{ banner.isActive ? 'Active' : 'Paused' }}</span>
                    </div>
                    <p class="mt-1 line-clamp-2 text-xs text-ink-500">{{ banner.subtitle || 'No subtitle' }}</p>
                    <div class="mt-3 flex items-center justify-between">
                      <span class="text-[11px] text-ink-400">
                        {{ banner.startAt ? (banner.startAt | date: 'MMM d') : 'Always' }} – {{ banner.endAt ? (banner.endAt | date: 'MMM d, y') : 'open' }}
                      </span>
                      <div class="flex gap-1">
                        <button type="button" class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900" (click)="editBanner(banner)" title="Edit">
                          <app-icon name="edit" [size]="15" />
                        </button>
                        <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-danger" (click)="removeBanner(banner)" title="Delete">
                          <app-icon name="trash" [size]="15" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="admin-card md:col-span-2 xl:col-span-3 py-12 text-center text-sm text-ink-400">No banners yet.</div>
              }
            </div>
          }
          @case ('testimonials') {
            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              @for (testimonial of testimonials(); track testimonial.id) {
                <article class="admin-card">
                  <div class="flex items-start gap-3">
                    @if (testimonial.avatarUrl) {
                      <img [src]="testimonial.avatarUrl | assetUrl" [alt]="testimonial.name" class="h-11 w-11 rounded-full object-cover" />
                    } @else {
                      <span class="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ink-900 text-sm font-bold text-cream">
                        {{ testimonial.name.charAt(0) }}
                      </span>
                    }
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold text-ink-900">{{ testimonial.name }}</p>
                      <p class="text-xs text-ink-400">{{ testimonial.role || 'Customer' }}</p>
                      <app-rating-stars [value]="testimonial.rating" [size]="12" />
                    </div>
                    <span [class]="testimonial.isActive ? 'badge-success' : 'badge-muted'">{{ testimonial.isActive ? 'Live' : 'Hidden' }}</span>
                  </div>
                  <p class="mt-3 line-clamp-4 text-sm italic leading-relaxed text-ink-600">“{{ testimonial.quote }}”</p>
                  <div class="mt-3 flex items-center justify-between">
                    <span class="text-[11px] text-ink-400">Sort {{ testimonial.sortOrder }}</span>
                    <div class="flex gap-1">
                      <button type="button" class="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 hover:text-ink-900" (click)="editTestimonial(testimonial)" title="Edit">
                        <app-icon name="edit" [size]="15" />
                      </button>
                      <button type="button" class="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-danger" (click)="removeTestimonial(testimonial)" title="Delete">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="admin-card md:col-span-2 xl:col-span-3 py-12 text-center text-sm text-ink-400">No testimonials yet.</div>
              }
            </div>
          }
          @case ('messages') {
            <div class="space-y-3">
              @for (message of messages(); track message.id) {
                <article class="admin-card" [class.border-gold-300]="!message.isRead">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p class="text-sm font-semibold text-ink-900">{{ message.subject }}</p>
                        <span [class]="message.isRead ? 'badge-muted' : 'badge-warning'">{{ message.isRead ? 'Read' : 'New' }}</span>
                      </div>
                      <p class="mt-0.5 text-xs text-ink-400">{{ message.name }} · {{ message.email }}{{ message.phone ? ' · ' + message.phone : '' }} · {{ message.createdAt | date: 'MMM d, y · HH:mm' }}</p>
                      <p class="mt-2 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-ink-600">{{ message.message }}</p>
                    </div>
                    <div class="flex flex-none gap-1">
                      @if (!message.isRead) {
                        <button type="button" class="btn-outline btn-sm" (click)="markRead(message)">
                          <app-icon name="check" [size]="13" /> Mark read
                        </button>
                      }
                      <a [href]="'mailto:' + message.email" class="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900" title="Reply by email">
                        <app-icon name="mail" [size]="15" />
                      </a>
                      <button type="button" class="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-danger" (click)="removeMessage(message)" title="Delete message">
                        <app-icon name="trash" [size]="15" />
                      </button>
                    </div>
                  </div>
                </article>
              } @empty {
                <div class="admin-card py-12 text-center text-sm text-ink-400">No messages received.</div>
              }
            </div>
            <app-pagination
              [page]="messagesPage()"
              [totalPages]="messagesPagination().totalPages"
              [totalItems]="messagesPagination().totalItems"
              [pageSize]="messagesPagination().pageSize"
              (pageChange)="goToMessages($event)"
            />
          }
          @case ('subscribers') {
            <div class="admin-card overflow-x-auto p-0">
              <table class="table-luxe">
                <thead>
                  <tr>
                    <th class="pl-5">Email</th>
                    <th>Status</th>
                    <th>Subscribed</th>
                    <th class="pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (subscriber of subscribers(); track subscriber.id) {
                    <tr>
                      <td class="pl-5 text-sm text-ink-800">{{ subscriber.email }}</td>
                      <td><span [class]="subscriber.isActive ? 'badge-success' : 'badge-muted'">{{ subscriber.isActive ? 'Subscribed' : 'Unsubscribed' }}</span></td>
                      <td class="text-xs text-ink-500">{{ subscriber.createdAt | date: 'MMM d, y' }}</td>
                      <td class="pr-5 text-right">
                        <button type="button" class="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-danger" (click)="removeSubscriber(subscriber)" title="Remove subscriber">
                          <app-icon name="trash" [size]="15" />
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="py-10 text-center text-sm text-ink-400">No subscribers yet.</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <app-pagination
              [page]="subscribersPage()"
              [totalPages]="subscribersPagination().totalPages"
              [totalItems]="subscribersPagination().totalItems"
              [pageSize]="subscribersPagination().pageSize"
              (pageChange)="goToSubscribers($event)"
            />
          }
        }
      }
    </div>
  `
})
export class AdminContent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);

  readonly tabs: { value: ContentTab; label: string }[] = [
    { value: 'banners', label: 'Banners' },
    { value: 'testimonials', label: 'Testimonials' },
    { value: 'messages', label: 'Contact messages' },
    { value: 'subscribers', label: 'Newsletter' }
  ];

  readonly tab = signal<ContentTab>('banners');
  readonly search = new FormControl('', { nonNullable: true });
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editor = signal<EditorKind>(null);

  readonly banners = signal<Banner[]>([]);
  readonly testimonials = signal<Testimonial[]>([]);
  readonly messages = signal<ContactMessage[]>([]);
  readonly messagesPagination = signal({ ...EMPTY_PAGE });
  readonly messagesPage = signal(1);
  readonly subscribers = signal<NewsletterSubscriber[]>([]);
  readonly subscribersPagination = signal({ ...EMPTY_PAGE });
  readonly subscribersPage = signal(1);

  readonly editingBanner = signal<Banner | null>(null);
  readonly editingTestimonial = signal<Testimonial | null>(null);

  readonly bannerForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    subtitle: [''],
    imageUrl: [''],
    linkUrl: [''],
    buttonText: [''],
    position: ['Hero', Validators.required],
    sortOrder: [0],
    isActive: [true],
    startAt: [''],
    endAt: ['']
  });

  readonly testimonialForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    role: [''],
    avatarUrl: [''],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    quote: ['', Validators.required],
    isActive: [true],
    sortOrder: [0]
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        if (this.tab() === 'messages') {
          this.messagesPage.set(1);
          this.loadMessages();
        } else if (this.tab() === 'subscribers') {
          this.subscribersPage.set(1);
          this.loadSubscribers();
        }
      });
  }

  ngOnInit(): void {
    this.loadBanners();
  }

  selectTab(tab: ContentTab): void {
    this.tab.set(tab);
    this.closeEditor();
    this.search.reset();
    this.loading.set(true);
    if (tab === 'banners') this.loadBanners();
    else if (tab === 'testimonials') this.loadTestimonials();
    else if (tab === 'messages') this.loadMessages();
    else this.loadSubscribers();
  }

  loadBanners(): void {
    this.admin.banners().subscribe({
      next: (banners) => {
        this.banners.set(banners);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load banners');
      }
    });
  }

  loadTestimonials(): void {
    this.admin.testimonials().subscribe({
      next: (testimonials) => {
        this.testimonials.set(testimonials);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to load testimonials');
      }
    });
  }

  loadMessages(): void {
    this.admin
      .contactMessages({ page: this.messagesPage(), pageSize: 10, search: this.search.value.trim() || undefined })
      .subscribe({
        next: (result) => {
          this.messages.set(result.items);
          this.messagesPagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load messages');
        }
      });
  }

  loadSubscribers(): void {
    this.admin
      .subscribers({ page: this.subscribersPage(), pageSize: 10, search: this.search.value.trim() || undefined })
      .subscribe({
        next: (result) => {
          this.subscribers.set(result.items);
          this.subscribersPagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load subscribers');
        }
      });
  }

  goToMessages(page: number): void {
    this.messagesPage.set(page);
    this.loading.set(true);
    this.loadMessages();
  }

  goToSubscribers(page: number): void {
    this.subscribersPage.set(page);
    this.loading.set(true);
    this.loadSubscribers();
  }

  openBanner(): void {
    this.editingBanner.set(null);
    this.bannerForm.reset({
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      buttonText: '',
      position: 'Hero',
      sortOrder: 0,
      isActive: true,
      startAt: '',
      endAt: ''
    });
    this.editor.set('banner');
  }

  editBanner(banner: Banner): void {
    this.editingBanner.set(banner);
    this.bannerForm.reset({
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      imageUrl: banner.imageUrl ?? '',
      linkUrl: banner.linkUrl ?? '',
      buttonText: banner.buttonText ?? '',
      position: banner.position,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startAt: this.toLocalInput(banner.startAt),
      endAt: this.toLocalInput(banner.endAt)
    });
    this.editor.set('banner');
  }

  saveBanner(): void {
    if (this.bannerForm.invalid) {
      this.bannerForm.markAllAsTouched();
      this.toast.error('A banner title is required');
      return;
    }
    const value = this.bannerForm.getRawValue();
    const startAt = value.startAt ? new Date(value.startAt) : null;
    const endAt = value.endAt ? new Date(value.endAt) : null;
    if (startAt && endAt && endAt <= startAt) {
      this.toast.error('The end date must be after the start date');
      return;
    }
    const request: BannerRequest = {
      title: value.title.trim(),
      subtitle: value.subtitle.trim() || null,
      imageUrl: value.imageUrl.trim() || null,
      linkUrl: value.linkUrl.trim() || null,
      buttonText: value.buttonText.trim() || null,
      position: value.position,
      sortOrder: Number(value.sortOrder) || 0,
      isActive: value.isActive,
      startAt: startAt ? startAt.toISOString() : null,
      endAt: endAt ? endAt.toISOString() : null
    };
    this.saving.set(true);
    const current = this.editingBanner();
    const operation = current ? this.admin.updateBanner(current.id, request) : this.admin.createBanner(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Banner updated' : 'Banner created');
        this.closeEditor();
        this.loadBanners();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save banner');
      }
    });
  }

  async removeBanner(banner: Banner): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete banner',
      message: `Delete “${banner.title}” from the homepage?`,
      confirmText: 'Delete banner',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteBanner(banner.id).subscribe({
      next: () => {
        this.toast.success('Banner deleted');
        this.loadBanners();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete banner')
    });
  }

  openTestimonial(): void {
    this.editingTestimonial.set(null);
    this.testimonialForm.reset({
      name: '',
      role: 'Verified buyer',
      avatarUrl: '',
      rating: 5,
      quote: '',
      isActive: true,
      sortOrder: 0
    });
    this.editor.set('testimonial');
  }

  editTestimonial(testimonial: Testimonial): void {
    this.editingTestimonial.set(testimonial);
    this.testimonialForm.reset({
      name: testimonial.name,
      role: testimonial.role ?? '',
      avatarUrl: testimonial.avatarUrl ?? '',
      rating: testimonial.rating,
      quote: testimonial.quote,
      isActive: testimonial.isActive,
      sortOrder: testimonial.sortOrder
    });
    this.editor.set('testimonial');
  }

  saveTestimonial(): void {
    if (this.testimonialForm.invalid) {
      this.testimonialForm.markAllAsTouched();
      this.toast.error('Name and quote are required');
      return;
    }
    const value = this.testimonialForm.getRawValue();
    const request: TestimonialRequest = {
      name: value.name.trim(),
      role: value.role.trim() || null,
      avatarUrl: value.avatarUrl.trim() || null,
      rating: Number(value.rating) || 5,
      quote: value.quote.trim(),
      isActive: value.isActive,
      sortOrder: Number(value.sortOrder) || 0
    };
    this.saving.set(true);
    const current = this.editingTestimonial();
    const operation = current
      ? this.admin.updateTestimonial(current.id, request)
      : this.admin.createTestimonial(request);
    operation.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(current ? 'Testimonial updated' : 'Testimonial created');
        this.closeEditor();
        this.loadTestimonials();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message ?? 'Unable to save testimonial');
      }
    });
  }

  async removeTestimonial(testimonial: Testimonial): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete testimonial',
      message: `Delete the testimonial from ${testimonial.name}?`,
      confirmText: 'Delete testimonial',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteTestimonial(testimonial.id).subscribe({
      next: () => {
        this.toast.success('Testimonial deleted');
        this.loadTestimonials();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete testimonial')
    });
  }

  closeEditor(): void {
    this.editor.set(null);
    this.editingBanner.set(null);
    this.editingTestimonial.set(null);
  }

  uploadFor(event: Event, kind: 'banner' | 'testimonial'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.admin.upload(file).subscribe({
      next: (result) => {
        if (kind === 'banner') this.bannerForm.controls.imageUrl.setValue(result.url);
        else this.testimonialForm.controls.avatarUrl.setValue(result.url);
        this.toast.success('Image uploaded');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to upload image')
    });
  }

  markRead(message: ContactMessage): void {
    this.admin.markContactRead(message.id).subscribe({
      next: () => {
        this.messages.update((items) => items.map((item) => (item.id === message.id ? { ...item, isRead: true } : item)));
        this.toast.success('Message marked as read');
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to update message')
    });
  }

  async removeMessage(message: ContactMessage): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete message',
      message: `Delete the message from ${message.name}?`,
      confirmText: 'Delete message',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteContactMessage(message.id).subscribe({
      next: () => {
        this.toast.success('Message deleted');
        this.loadMessages();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to delete message')
    });
  }

  async removeSubscriber(subscriber: NewsletterSubscriber): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Remove subscriber',
      message: `Remove ${subscriber.email} from the newsletter list?`,
      confirmText: 'Remove subscriber',
      danger: true
    });
    if (!ok) return;
    this.admin.deleteSubscriber(subscriber.id).subscribe({
      next: () => {
        this.toast.success('Subscriber removed');
        this.loadSubscribers();
      },
      error: (err) => this.toast.error(err?.error?.message ?? 'Unable to remove subscriber')
    });
  }

  exportSubscribers(): void {
    if (!this.subscribers().length) {
      this.toast.info('No subscribers to export');
      return;
    }
    const rows = [['email', 'status', 'subscribedAt'], ...this.subscribers().map((subscriber) => [subscriber.email, subscriber.isActive ? 'active' : 'unsubscribed', subscriber.createdAt])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'newsletter-subscribers.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  private toLocalInput(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (input: number) => String(input).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
