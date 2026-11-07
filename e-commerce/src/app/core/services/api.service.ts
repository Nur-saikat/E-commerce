import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { APP_ENV } from '../../../environments/environment';
import { ApiResponse, Paged, PaginationMeta } from '../models/api.models';
import { SILENT_ERROR } from '../constants';

export type QueryParams = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);
  readonly baseUrl = this.env.apiBaseUrl.replace(/\/$/, '');

  private url(path: string): string {
    return path.startsWith('http') ? path : `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private params(query?: QueryParams): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && item !== undefined && item !== '') params = params.append(key, String(item));
        }
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private context(silent?: boolean): HttpContext {
    return new HttpContext().set(SILENT_ERROR, !!silent);
  }

  get<T>(path: string, query?: QueryParams, silent = false): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: this.params(query), context: this.context(silent) })
      .pipe(map((res) => res.data as T));
  }

  getPaged<T>(path: string, query?: QueryParams, silent = false): Observable<Paged<T>> {
    return this.http
      .get<ApiResponse<T[]>>(this.url(path), { params: this.params(query), context: this.context(silent) })
      .pipe(
        map((res) => ({
          items: res.data ?? [],
          pagination: res.pagination ?? this.fallbackPagination(query, res.data?.length ?? 0)
        }))
      );
  }

  post<T>(path: string, body?: unknown, silent = false): Observable<T> {
    return this.http
      .post<ApiResponse<T>>(this.url(path), body ?? {}, { context: this.context(silent) })
      .pipe(map((res) => res.data as T));
  }

  put<T>(path: string, body?: unknown, silent = false): Observable<T> {
    return this.http
      .put<ApiResponse<T>>(this.url(path), body ?? {}, { context: this.context(silent) })
      .pipe(map((res) => res.data as T));
  }

  patch<T>(path: string, body?: unknown, silent = false): Observable<T> {
    return this.http
      .patch<ApiResponse<T>>(this.url(path), body ?? {}, { context: this.context(silent) })
      .pipe(map((res) => res.data as T));
  }

  delete<T>(path: string, silent = false): Observable<T> {
    return this.http
      .delete<ApiResponse<T>>(this.url(path), { context: this.context(silent) })
      .pipe(map((res) => res.data as T));
  }

  upload(file: File, silent = false): Observable<{ url: string; fileName: string; size: number }> {
    const form = new FormData();
    form.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string; fileName: string; size: number }>>(`${this.baseUrl}/uploads`, form, {
        context: this.context(silent)
      })
      .pipe(map((res) => res.data));
  }

  private fallbackPagination(query: QueryParams | undefined, count: number): PaginationMeta {
    const page = Number(query?.['page'] ?? 1) || 1;
    const pageSize = Number(query?.['pageSize'] ?? (count || 12)) || 12;
    return { page, pageSize, totalItems: count, totalPages: count ? 1 : 0 };
  }
}
