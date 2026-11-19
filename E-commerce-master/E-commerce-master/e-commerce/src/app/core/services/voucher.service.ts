import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { VoucherWallet } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly api = inject(ApiService);

  readonly wallet = signal<VoucherWallet | null>(null);
  readonly loading = signal(false);

  loadWallet(): Observable<VoucherWallet> {
    this.loading.set(true);
    return this.api.get<VoucherWallet>('vouchers/wallet').pipe(
      tap({
        next: (wallet) => {
          this.wallet.set(wallet);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      })
    );
  }

  clear(): void {
    this.wallet.set(null);
  }
}
