import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParams } from './api.service';
import {
  AuditLog,
  Banner,
  BannerRequest,
  Category,
  ContactMessage,
  Coupon,
  CouponRequest,
  Customer,
  CustomerQuery,
  Dashboard,
  InventoryItem,
  InventoryQuery,
  InventoryTransaction,
  NewsletterSubscriber,
  OrderQuery,
  OrderReport,
  OrderSummary,
  Paged,
  PagedQuery,
  Permission,
  Review,
  Role,
  SalesReport,
  SettingsRequest,
  ShippingMethod,
  ShippingMethodRequest,
  StockAdjustmentRequest,
  Testimonial,
  TestimonialRequest,
  UpdateCustomerRequest,
  WebsiteSettings
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<Dashboard> {
    return this.api.get<Dashboard>('admin/dashboard');
  }

  salesReport(from?: string, to?: string): Observable<SalesReport> {
    return this.api.get<SalesReport>('admin/reports/sales', { from, to });
  }

  orderReport(from?: string, to?: string): Observable<OrderReport> {
    return this.api.get<OrderReport>('admin/reports/orders', { from, to });
  }

  orders(query: OrderQuery = {}): Observable<Paged<OrderSummary>> {
    return this.api.getPaged<OrderSummary>('admin/orders', query as QueryParams);
  }

  customers(query: CustomerQuery = {}): Observable<Paged<Customer>> {
    return this.api.getPaged<Customer>('admin/customers', query as QueryParams);
  }

  updateCustomer(id: string, request: UpdateCustomerRequest): Observable<Customer> {
    return this.api.put<Customer>(`admin/customers/${id}`, request);
  }

  inventory(query: InventoryQuery = {}): Observable<Paged<InventoryItem>> {
    return this.api.getPaged<InventoryItem>('admin/inventory', query as QueryParams);
  }

  adjustStock(productId: string, request: StockAdjustmentRequest): Observable<unknown> {
    return this.api.post<unknown>(`admin/inventory/${productId}/adjust`, request);
  }

  inventoryTransactions(query: PagedQuery = {}): Observable<Paged<InventoryTransaction>> {
    return this.api.getPaged<InventoryTransaction>('admin/inventory/transactions', query as QueryParams);
  }

  auditLogs(query: PagedQuery = {}): Observable<Paged<AuditLog>> {
    return this.api.getPaged<AuditLog>('admin/audit-logs', query as QueryParams);
  }

  roles(): Observable<Role[]> {
    return this.api.get<Role[]>('admin/roles');
  }

  permissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>('admin/permissions');
  }

  updateRolePermissions(roleName: string, permissions: string[]): Observable<Role> {
    return this.api.put<Role>(`admin/roles/${encodeURIComponent(roleName)}/permissions`, { permissions });
  }

  banners(position?: string): Observable<Banner[]> {
    return this.api.get<Banner[]>('admin/banners', { position });
  }

  createBanner(request: BannerRequest): Observable<Banner> {
    return this.api.post<Banner>('admin/banners', request);
  }

  updateBanner(id: string, request: BannerRequest): Observable<Banner> {
    return this.api.put<Banner>(`admin/banners/${id}`, request);
  }

  deleteBanner(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/banners/${id}`);
  }

  testimonials(): Observable<Testimonial[]> {
    return this.api.get<Testimonial[]>('admin/testimonials');
  }

  createTestimonial(request: TestimonialRequest): Observable<Testimonial> {
    return this.api.post<Testimonial>('admin/testimonials', request);
  }

  updateTestimonial(id: string, request: TestimonialRequest): Observable<Testimonial> {
    return this.api.put<Testimonial>(`admin/testimonials/${id}`, request);
  }

  deleteTestimonial(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/testimonials/${id}`);
  }

  contactMessages(query: PagedQuery = {}): Observable<Paged<ContactMessage>> {
    return this.api.getPaged<ContactMessage>('admin/contact-messages', query as QueryParams);
  }

  markContactRead(id: string): Observable<unknown> {
    return this.api.post<unknown>(`admin/contact-messages/${id}/read`);
  }

  deleteContactMessage(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/contact-messages/${id}`);
  }

  subscribers(query: PagedQuery = {}): Observable<Paged<NewsletterSubscriber>> {
    return this.api.getPaged<NewsletterSubscriber>('admin/newsletter-subscribers', query as QueryParams);
  }

  deleteSubscriber(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/newsletter-subscribers/${id}`);
  }

  updateSettings(request: SettingsRequest): Observable<WebsiteSettings> {
    return this.api.put<WebsiteSettings>('admin/settings', request);
  }

  shippingMethods(): Observable<ShippingMethod[]> {
    return this.api.get<ShippingMethod[]>('admin/shipping-methods');
  }

  createShippingMethod(request: ShippingMethodRequest): Observable<ShippingMethod> {
    return this.api.post<ShippingMethod>('admin/shipping-methods', request);
  }

  updateShippingMethod(id: string, request: ShippingMethodRequest): Observable<ShippingMethod> {
    return this.api.put<ShippingMethod>(`admin/shipping-methods/${id}`, request);
  }

  deleteShippingMethod(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`admin/shipping-methods/${id}`);
  }

  coupons(query: PagedQuery = {}): Observable<Paged<Coupon>> {
    return this.api.getPaged<Coupon>('coupons', query as QueryParams);
  }

  createCoupon(request: CouponRequest): Observable<Coupon> {
    return this.api.post<Coupon>('coupons', request);
  }

  updateCoupon(id: string, request: CouponRequest): Observable<Coupon> {
    return this.api.put<Coupon>(`coupons/${id}`, request);
  }

  deleteCoupon(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`coupons/${id}`);
  }

  reviews(query: PagedQuery = {}, approved?: boolean): Observable<Paged<Review>> {
    return this.api.getPaged<Review>('admin/reviews', { ...query, approved } as QueryParams);
  }

  approveReview(id: string): Observable<unknown> {
    return this.api.post<unknown>(`reviews/${id}/approve`);
  }

  rejectReview(id: string): Observable<unknown> {
    return this.api.post<unknown>(`reviews/${id}/reject`);
  }

  deleteReview(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`reviews/${id}`);
  }

  upload(file: File): Observable<{ url: string; fileName: string; size: number }> {
    return this.api.upload(file);
  }

  canManage(permissions: string[], permission: string): boolean {
    return permissions.includes(permission);
  }

  categories(includeInactive = true): Observable<Category[]> {
    return this.api.get<Category[]>('categories', { includeInactive });
  }
}
