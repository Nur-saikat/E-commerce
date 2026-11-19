import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Paged, Review } from '../../../core/models/api.models';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Icon } from '../../../shared/components/icon/icon';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { RatingStars } from '../../../shared/components/rating-stars/rating-stars';

type ReviewTab = 'pending' | 'approved' | 'all';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [ReactiveFormsModule, Icon, Pagination, RatingStars, DatePipe],
  template: `
    <div class="space-y-5 page-enter">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="eyebrow">Experience</p>
          <h2 class="admin-title">Reviews</h2>
          <p class="mt-1 text-sm text-ink-500">Approve verified feedback and moderate the storefront.</p>
        </div>
        <button type="button" class="btn-outline btn-sm" (click)="load()" [disabled]="loading()">
          <app-icon name="refresh" [size]="14" /> Refresh
        </button>
      </div>

      <div class="admin-card flex flex-wrap items-center gap-2">
        @for (tab of tabs; track tab.value) {
          <button
            type="button"
            class="rounded-full px-4 py-2 text-xs font-semibold transition"
            [class]="activeTab() === tab.value ? 'bg-ink-900 text-cream' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'"
            (click)="selectTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        }
        <div class="relative ml-auto w-full max-w-xs">
          <app-icon name="search" [size]="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input [formControl]="search" type="search" class="input py-2 pl-8 text-xs" placeholder="Search product, customer or text" />
        </div>
      </div>

      @if (loading()) {
        <div class="admin-card"><div class="skeleton h-64 rounded-xl"></div></div>
      } @else {
        <div class="space-y-3">
          @for (review of items(); track review.id) {
            <article class="admin-card">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <app-rating-stars [value]="review.rating" [size]="14" />
                    <span [class]="review.isApproved ? 'badge-success' : 'badge-warning'">
                      {{ review.isApproved ? 'Approved' : 'Awaiting review' }}
                    </span>
                    @if (review.isVerifiedPurchase) {
                      <span class="badge-gold">Verified purchase</span>
                    }
                  </div>
                  @if (review.title) {
                    <h3 class="mt-2 text-sm font-semibold text-ink-900">{{ review.title }}</h3>
                  }
                  <p class="mt-1 max-w-3xl text-sm leading-relaxed text-ink-600">{{ review.comment }}</p>
                  <p class="mt-2 text-xs text-ink-400">
                    {{ review.userName }}
                    @if (review.productName) {
                      · {{ review.productName }}
                    }
                    · {{ review.createdAt | date: 'MMM d, y' }}
                  </p>
                </div>
                <div class="flex flex-none gap-1">
                  @if (!review.isApproved) {
                    <button type="button" class="btn-primary btn-sm" [disabled]="busyId() === review.id" (click)="approve(review)">
                      <app-icon name="check" [size]="13" /> Approve
                    </button>
                  } @else {
                    <button type="button" class="btn-outline btn-sm" [disabled]="busyId() === review.id" (click)="reject(review)">
                      <app-icon name="ban" [size]="13" /> Unpublish
                    </button>
                  }
                  <button type="button" class="rounded-lg p-2 text-ink-400 transition hover:bg-red-50 hover:text-danger" (click)="remove(review)" title="Delete review">
                    <app-icon name="trash" [size]="15" />
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="admin-card py-12 text-center text-sm text-ink-400">No reviews in this view.</div>
          }
        </div>

        <app-pagination
          [page]="page()"
          [totalPages]="pagination().totalPages"
          [totalItems]="pagination().totalItems"
          [pageSize]="pagination().pageSize"
          (pageChange)="goTo($event)"
        />
      }
    </div>
  `
})
export class AdminReviews implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly tabs: { value: ReviewTab; label: string }[] = [
    { value: 'pending', label: 'Awaiting approval' },
    { value: 'approved', label: 'Published' },
    { value: 'all', label: 'All reviews' }
  ];

  readonly search = new FormControl('', { nonNullable: true });
  readonly activeTab = signal<ReviewTab>('pending');
  readonly items = signal<Review[]>([]);
  readonly pagination = signal<Paged<Review>['pagination']>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly page = signal(1);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const approved = this.activeTab() === 'all' ? undefined : this.activeTab() === 'approved';
    this.admin
      .reviews({ page: this.page(), pageSize: 10, search: this.search.value.trim() || undefined }, approved)
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.pagination.set(result.pagination);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(err?.error?.message ?? 'Unable to load reviews');
        }
      });
  }

  selectTab(tab: ReviewTab): void {
    this.activeTab.set(tab);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  approve(review: Review): void {
    this.act(review, this.admin.approveReview(review.id), 'Review approved');
  }

  reject(review: Review): void {
    this.act(review, this.admin.rejectReview(review.id), 'Review unpublished');
  }

  async remove(review: Review): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Delete review',
      message: `Permanently delete the review by ${review.userName}?`,
      confirmText: 'Delete review',
      danger: true
    });
    if (!ok) return;
    this.act(review, this.admin.deleteReview(review.id), 'Review deleted');
  }

  private act(review: Review, operation: ReturnType<AdminService['approveReview']>, message: string): void {
    if (this.busyId()) return;
    this.busyId.set(review.id);
    operation.subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(message);
        this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(err?.error?.message ?? 'Unable to update review');
      }
    });
  }
}
