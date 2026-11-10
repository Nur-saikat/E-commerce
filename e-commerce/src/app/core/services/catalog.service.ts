import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Brand,
  BrandRequest,
  Category,
  CategoryRequest,
  FilterOptions,
  Paged,
  ProductDetail,
  ProductQuery,
  ProductRequest,
  ProductSummary,
  SearchSuggestion
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(ApiService);

  products(query: ProductQuery = {}): Observable<Paged<ProductSummary>> {
    return this.api.getPaged<ProductSummary>('products', query as Record<string, unknown>);
  }

  search(query: ProductQuery): Observable<Paged<ProductSummary>> {
    return this.api.getPaged<ProductSummary>('products/search', query as Record<string, unknown>);
  }

  suggest(term: string): Observable<SearchSuggestion> {
    return this.api.get<SearchSuggestion>('products/suggest', { term });
  }

  filters(categoryId?: string, categorySlug?: string): Observable<FilterOptions> {
    return this.api.get<FilterOptions>('products/filters', { categoryId, categorySlug });
  }

  byIds(ids: string[]): Observable<ProductSummary[]> {
    return this.api.get<ProductSummary[]>('products/by-ids', { ids: ids.join(',') });
  }

  product(idOrSlug: string, includeInactive = false, includeCost = false): Observable<ProductDetail> {
    return this.api.get<ProductDetail>(`products/${encodeURIComponent(idOrSlug)}`, { includeInactive, includeCost });
  }

  collection(kind: 'featured' | 'latest' | 'bestsellers' | 'trending' | 'deals', limit = 8): Observable<ProductSummary[]> {
    return this.api.get<ProductSummary[]>(`products/${kind}`, { limit });
  }

  createProduct(request: ProductRequest): Observable<ProductDetail> {
    return this.api.post<ProductDetail>('products', request);
  }

  updateProduct(id: string, request: ProductRequest): Observable<ProductDetail> {
    return this.api.put<ProductDetail>(`products/${id}`, request);
  }

  deleteProduct(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`products/${id}`);
  }

  categories(includeInactive = false): Observable<Category[]> {
    return this.api.get<Category[]>('categories', { includeInactive });
  }

  category(idOrSlug: string): Observable<Category> {
    return this.api.get<Category>(`categories/${encodeURIComponent(idOrSlug)}`);
  }

  createCategory(request: CategoryRequest): Observable<Category> {
    return this.api.post<Category>('categories', request);
  }

  updateCategory(id: string, request: CategoryRequest): Observable<Category> {
    return this.api.put<Category>(`categories/${id}`, request);
  }

  deleteCategory(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`categories/${id}`);
  }

  brands(includeInactive = false): Observable<Brand[]> {
    return this.api.get<Brand[]>('brands', { includeInactive });
  }

  brand(idOrSlug: string): Observable<Brand> {
    return this.api.get<Brand>(`brands/${encodeURIComponent(idOrSlug)}`);
  }

  createBrand(request: BrandRequest): Observable<Brand> {
    return this.api.post<Brand>('brands', request);
  }

  updateBrand(id: string, request: BrandRequest): Observable<Brand> {
    return this.api.put<Brand>(`brands/${id}`, request);
  }

  deleteBrand(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`brands/${id}`);
  }
}
