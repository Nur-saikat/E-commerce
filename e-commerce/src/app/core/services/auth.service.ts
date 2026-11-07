import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, tap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { CartService } from './cart.service';
import { ADMIN_ROLES, STORAGE_KEYS } from '../constants';
import {
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
  User
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly cart = inject(CartService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly user = signal<User | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly loading = signal(false);

  readonly isAuthenticated = computed(() => !!this.accessToken() && !!this.user());
  readonly isAdmin = computed(() => ADMIN_ROLES.includes(this.user()?.role ?? ''));
  readonly fullName = computed(() => {
    const u = this.user();
    return u ? u.fullName || `${u.firstName} ${u.lastName}`.trim() : '';
  });

  private refresh$: Observable<AuthResponse> | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    if (!this.isBrowser) return;
    try {
      const token = localStorage.getItem(STORAGE_KEYS.accessToken);
      const refresh = localStorage.getItem(STORAGE_KEYS.refreshToken);
      const rawUser = localStorage.getItem(STORAGE_KEYS.user);
      if (token) this.accessToken.set(token);
      if (refresh) this.refreshToken.set(refresh);
      if (rawUser) this.user.set(JSON.parse(rawUser) as User);
    } catch {
      this.clearSession();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    this.loading.set(true);
    return this.api.post<AuthResponse>('auth/login', request).pipe(
      tap((res) => {
        this.persist(res);
        this.cart.mergeGuestCart();
      }),
      finalize(() => this.loading.set(false))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    this.loading.set(true);
    return this.api.post<AuthResponse>('auth/register', request).pipe(
      tap((res) => {
        this.persist(res);
        this.cart.mergeGuestCart();
      }),
      finalize(() => this.loading.set(false))
    );
  }

  refresh(): Observable<AuthResponse> {
    const token = this.refreshToken();
    if (!token) return throwError(() => new Error('No refresh token available'));
    if (!this.refresh$) {
      this.refresh$ = this.api.post<AuthResponse>('auth/refresh-token', { refreshToken: token }, true).pipe(
        tap((res) => this.persist(res)),
        finalize(() => (this.refresh$ = null)),
        shareReplay(1)
      );
    }
    return this.refresh$;
  }

  me(): Observable<User> {
    return this.api.get<User>('auth/me').pipe(tap((user) => this.user.set(user)));
  }

  updateProfile(request: UpdateProfileRequest): Observable<User> {
    return this.api.put<User>('auth/profile', request).pipe(tap((user) => this.user.set(user)));
  }

  changePassword(request: ChangePasswordRequest): Observable<unknown> {
    return this.api.post<unknown>('auth/change-password', request);
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.api.post<ForgotPasswordResponse>('auth/forgot-password', { email });
  }

  resetPassword(request: ResetPasswordRequest): Observable<unknown> {
    return this.api.post<unknown>('auth/reset-password', request);
  }

  verifyEmail(token: string): Observable<unknown> {
    return this.api.get<unknown>('auth/verify-email', { token });
  }

  logout(): void {
    const token = this.refreshToken();
    if (this.isAuthenticated() && token) {
      this.api.post<unknown>('auth/logout', { refreshToken: token }, true).subscribe({ error: () => undefined });
    }
    this.clearSession();
    this.cart.reset();
  }

  hasPermission(permission: string): boolean {
    const u = this.user();
    if (!u) return false;
    return u.role === 'SuperAdmin' || u.permissions?.includes(permission);
  }

  clearSession(): void {
    this.user.set(null);
    this.accessToken.set(null);
    this.refreshToken.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
      localStorage.removeItem(STORAGE_KEYS.cartId);
    }
  }

  private persist(res: AuthResponse): void {
    this.accessToken.set(res.accessToken);
    this.refreshToken.set(res.refreshToken);
    this.user.set(res.user);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.accessToken, res.accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, res.refreshToken);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(res.user));
    }
  }
}
