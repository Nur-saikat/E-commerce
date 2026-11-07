import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewService } from '../../core/services/review.service';
import { PaginationMeta, Review } from '../../core/models/api.models';
import { RatingStars } from '../../shared/components/rating-stars/rating-stars';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Icon } from '../../shared/components/icon/icon';

@Component({
  selector: 'app-account-reviews',
  standalone: true,
  imports: [DatePipe, RouterLink, RatingStars, EmptyState, Pagination, Icon],
  template: `
    <section class="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-ink-900">My reviews</h2>
          <p class="mt-0.5 text-xs text-ink-500">Reviews are published after moderation.</p>
        </div>
        <a routerLink="/products" class="btn-ghost btn-sm">Review a purchase <app-icon name="arrow-right" [size]="14" /></a>
      </div>

      @if (loading()) {
        <div class="mt-5 space-y-3">
          @for (row of [1, 2, 3]; track row) {
            <div class="skeleton h-28 w-full rounded-xl"></div>
          }
        </div>
      } @else if (!reviews().length) {
        <div class="mt-5">
          <app-empty-state
            icon="star"
            title="No reviews yet"
            message="Once you've received an order, share your thoughts on the pieces you bought."
            actionLabel="Browse products"
            actionLink="/products"
          />
        </div>
      } @else {
        <ul class="mt-5 space-y-3">
          @for (review of reviews(); track review.id) {
            <li class="rounded-xl border border-ink-100 p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-ink-900">{{ review.title || 'Review' }}</p>
                  <p class="mt-0.5 text-[11px] text-ink-400">
                    {{ review.createdAt | date: 'mediumDate' }}
                    @if (review.isVerifiedPurchase) {
                      <span class="ml-2 badge-success">Verified purchase</span>
                    }
                  </p>
                </div>
                <span [class]="review.isApproved ? 'badge-success' : 'badge-warning'">
                  {{ review.isApproved ? 'Published' : 'Awaiting approval' }}
                </span>
              </div>
              <app-rating-stars [value]="review.rating" [size]="14" [showValue]="false" />
              <p class="mt-2 text-sm leading-relaxed text-ink-600">{{ review.comment }}</p>
              <a [routerLink]="['/products', review.productId]" class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold-600 hover:underline">
                View product <app-icon name="arrow-right" [size]="12" />
              </a>
            </li>
          }
        </ul>

        @if (pagination(); as meta) {
          <div class="mt-6">
            <app-pagination
              [page]="meta.page"
              [totalPages]="meta.totalPages"
              [totalItems]="meta.totalItems"
              [pageSize]="meta.pageSize"
              (pageChange)="load($event)"
            />
          </div>
        }
      }
    </section>
  `
})
export class AccountReviews implements OnInit {
  private readonly reviewService = inject(ReviewService);

  readonly loading = signal(true);
  readonly reviews = signal<Review[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);

  ngOnInit(): void {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.reviewService.mine({ page, pageSize: 6 }).subscribe({
      next: (result) => {
        this.reviews.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
