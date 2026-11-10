import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { APP_ENV } from '../../../environments/environment';
import { ApiResponse, Paged } from '../models/api.models';
import {
  BusinessDocument,
  BusinessOverview,
  BusinessProductOption,
  CapitalEntry,
  CapitalEntryRequest,
  ExpenseEntry,
  ExpenseEntryRequest,
  LedgerQuery,
  OwnerProfile,
  OwnerProfileRequest,
  ProfitLoss,
  ProfitLossQuery,
  StaffMember,
  StaffQuery,
  StaffRequest,
  StockArrival,
  StockArrivalQuery,
  StockArrivalRequest
} from '../models/business.models';
import { ApiService, QueryParams } from './api.service';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  overview(): Observable<BusinessOverview> {
    return this.api.get<BusinessOverview>('admin/business/overview');
  }

  profile(): Observable<OwnerProfile> {
    return this.api.get<OwnerProfile>('admin/business/profile');
  }

  saveProfile(request: OwnerProfileRequest): Observable<OwnerProfile> {
    return this.api.put<OwnerProfile>('admin/business/profile', request);
  }

  staff(query: StaffQuery = {}): Observable<Paged<StaffMember>> {
    return this.api.getPaged<StaffMember>('admin/business/staff', query as QueryParams);
  }

  staffMember(id: string): Observable<StaffMember> {
    return this.api.get<StaffMember>(`admin/business/staff/${id}`);
  }

  createStaff(request: StaffRequest): Observable<StaffMember> {
    return this.api.post<StaffMember>('admin/business/staff', request);
  }

  updateStaff(id: string, request: StaffRequest): Observable<StaffMember> {
    return this.api.put<StaffMember>(`admin/business/staff/${id}`, request);
  }

  deleteStaff(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/business/staff/${id}`);
  }

  capital(query: LedgerQuery = {}): Observable<Paged<CapitalEntry>> {
    return this.api.getPaged<CapitalEntry>('admin/business/capital', query as QueryParams);
  }

  createCapital(request: CapitalEntryRequest): Observable<CapitalEntry> {
    return this.api.post<CapitalEntry>('admin/business/capital', request);
  }

  updateCapital(id: string, request: CapitalEntryRequest): Observable<CapitalEntry> {
    return this.api.put<CapitalEntry>(`admin/business/capital/${id}`, request);
  }

  deleteCapital(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/business/capital/${id}`);
  }

  expenses(query: LedgerQuery = {}): Observable<Paged<ExpenseEntry>> {
    return this.api.getPaged<ExpenseEntry>('admin/business/expenses', query as QueryParams);
  }

  createExpense(request: ExpenseEntryRequest): Observable<ExpenseEntry> {
    return this.api.post<ExpenseEntry>('admin/business/expenses', request);
  }

  updateExpense(id: string, request: ExpenseEntryRequest): Observable<ExpenseEntry> {
    return this.api.put<ExpenseEntry>(`admin/business/expenses/${id}`, request);
  }

  deleteExpense(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/business/expenses/${id}`);
  }

  arrivals(query: StockArrivalQuery = {}): Observable<Paged<StockArrival>> {
    return this.api.getPaged<StockArrival>('admin/business/arrivals', query as QueryParams);
  }

  createArrival(request: StockArrivalRequest): Observable<StockArrival> {
    return this.api.post<StockArrival>('admin/business/arrivals', request);
  }

  deleteArrival(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/business/arrivals/${id}`);
  }

  productOptions(search?: string): Observable<BusinessProductOption[]> {
    return this.api.get<BusinessProductOption[]>('admin/business/products', { search });
  }

  profitLoss(query: ProfitLossQuery = {}): Observable<ProfitLoss> {
    return this.api.get<ProfitLoss>('admin/business/profit-loss', { ...query } as QueryParams);
  }

  uploadDocument(file: File, title?: string, category = 'Other'): Observable<BusinessDocument> {
    const form = new FormData();
    form.append('file', file);
    if (title?.trim()) form.append('title', title.trim());
    form.append('category', category);
    const baseUrl = this.env.apiBaseUrl.replace(/\/$/, '');
    return this.http
      .post<ApiResponse<BusinessDocument>>(`${baseUrl}/admin/business/documents`, form)
      .pipe(map((res) => res.data));
  }
}
