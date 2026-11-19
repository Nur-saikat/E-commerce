import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import { CreateReviewRequest, Paged, PagedQuery, Review, ReviewList } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);

  forProduct(productId: string, page = 1, pageSize = 8): Observable<ReviewList> {
    return this.api.get<ReviewList>(`products/${productId}/reviews`, { page, pageSize });
  }

  create(productId: string, request: CreateReviewRequest): Observable<Review> {
    return this.api.post<Review>(`products/${productId}/reviews`, request);
  }

  mine(query: PagedQuery = {}): Observable<Paged<Review>> {
    return this.api.getPaged<Review>('reviews/my', query as QueryParams);
  }
}
