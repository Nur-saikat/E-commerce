import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { APP_ENV } from '../../../environments/environment';
import { SILENT_ERROR } from '../constants';
import {
  CheckoutRequest,
  CreateReturnRequest,
  MobilePaymentSubmitRequest,
  MobilePaymentVerifyRequest,
  Order,
  OrderQuery,
  OrderSummary,
  Paged,
  Payment,
  PaymentInitiateRequest,
  PaymentInitiateResponse,
  PaymentVerifyRequest,
  PaymentVerifyResult,
  RefundRequest,
  ReturnQuery,
  ReturnRequest,
  UpdateReturnStatusRequest
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENV);

  checkout(request: CheckoutRequest): Observable<Order> {
    return this.api.post<Order>('orders', request);
  }

  myOrders(query: OrderQuery = {}): Observable<Paged<OrderSummary>> {
    return this.api.getPaged<OrderSummary>('orders/my-orders', query as Record<string, unknown>);
  }

  get(id: string): Observable<Order> {
    return this.api.get<Order>(`orders/${id}`);
  }

  track(orderNumber: string, email: string): Observable<Order> {
    return this.api.get<Order>('orders/track', { orderNumber, email }, true);
  }

  cancel(id: string, reason?: string, restoreStock = true): Observable<Order> {
    return this.api.post<Order>(`orders/${id}/cancel`, { reason, restoreStock });
  }

  updateStatus(id: string, status: string, note?: string, trackingNumber?: string): Observable<Order> {
    return this.api.put<Order>(`orders/${id}/status`, { status, note, trackingNumber });
  }

  refund(id: string, request: RefundRequest = {}): Observable<Order> {
    return this.api.post<Order>(`orders/${id}/refund`, request);
  }

  submitMobilePayment(request: MobilePaymentSubmitRequest): Observable<Payment> {
    return this.api.post<Payment>('payments/mobile/submit', request);
  }

  verifyMobilePayment(orderId: string, request: MobilePaymentVerifyRequest): Observable<Payment> {
    return this.api.post<Payment>(`payments/mobile/${orderId}/verify`, request);
  }

  createReturn(request: CreateReturnRequest): Observable<ReturnRequest> {
    return this.api.post<ReturnRequest>('returns', request);
  }

  myReturns(query: ReturnQuery = {}): Observable<Paged<ReturnRequest>> {
    return this.api.getPaged<ReturnRequest>('returns/my', query as Record<string, unknown>);
  }

  returnsForOrder(orderId: string): Observable<Paged<ReturnRequest>> {
    return this.api.getPaged<ReturnRequest>('returns/my', { orderId, page: 1, pageSize: 50 });
  }

  adminReturns(query: ReturnQuery = {}): Observable<Paged<ReturnRequest>> {
    return this.api.getPaged<ReturnRequest>('admin/returns', query as Record<string, unknown>);
  }

  adminReturn(id: string): Observable<ReturnRequest> {
    return this.api.get<ReturnRequest>(`admin/returns/${id}`);
  }

  updateReturn(id: string, request: UpdateReturnStatusRequest): Observable<ReturnRequest> {
    return this.api.put<ReturnRequest>(`admin/returns/${id}/status`, request);
  }

  payments(orderId: string): Observable<Payment[]> {
    return this.api.get<Payment[]>(`orders/${orderId}/payments`);
  }

  invoiceBlob(id: string, download = false): Observable<Blob> {
    return this.http.get(`${this.env.apiBaseUrl}/orders/${id}/invoice`, {
      params: { download },
      responseType: 'blob',
      context: new HttpContext().set(SILENT_ERROR, true)
    });
  }

  openInvoice(id: string, download = false): void {
    this.invoiceBlob(id, download).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        if (download) {
          anchor.download = `invoice-${id}.html`;
          anchor.click();
        } else {
          window.open(url, '_blank', 'noopener');
        }
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
    });
  }

  providers(): Observable<string[]> {
    return this.api.get<string[]>('payments/providers');
  }

  initiatePayment(request: PaymentInitiateRequest): Observable<PaymentInitiateResponse> {
    return this.api.post<PaymentInitiateResponse>('payments/initiate', request);
  }

  verifyPayment(request: PaymentVerifyRequest): Observable<PaymentVerifyResult> {
    return this.api.post<PaymentVerifyResult>('payments/verify', request);
  }
}
