import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Address, AddressInput } from '../models/api.models';

export type AddressPayload = AddressInput & { isDefault: boolean };

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = inject(ApiService);

  readonly addresses = signal<Address[]>([]);
  readonly loading = signal(false);

  getAddresses(): Observable<Address[]> {
    this.loading.set(true);
    return this.api.get<Address[]>('account/addresses').pipe(
      tap((items) => {
        this.addresses.set(items ?? []);
        this.loading.set(false);
      })
    );
  }

  addAddress(request: AddressPayload): Observable<Address> {
    return this.api
      .post<Address>('account/addresses', request)
      .pipe(tap((address) => this.addresses.update((items) => [...items, address])));
  }

  updateAddress(id: string, request: AddressPayload): Observable<Address> {
    return this.api.put<Address>(`account/addresses/${id}`, request).pipe(
      tap((address) =>
        this.addresses.update((items) => items.map((item) => (item.id === id ? address : { ...item, isDefault: address.isDefault ? false : item.isDefault })))
      )
    );
  }

  deleteAddress(id: string): Observable<unknown> {
    return this.api.delete<unknown>(`account/addresses/${id}`).pipe(
      tap(() => this.addresses.update((items) => items.filter((item) => item.id !== id)))
    );
  }

  setDefault(id: string): Observable<Address> {
    return this.api.post<Address>(`account/addresses/${id}/default`).pipe(
      tap((address) =>
        this.addresses.update((items) => items.map((item) => (item.id === id ? address : { ...item, isDefault: false })))
      )
    );
  }
}
