import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { APP_ENV } from '../../../environments/environment';
import { STORAGE_KEYS } from '../constants';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  const injector = inject(Injector);
  if (!req.url.startsWith(env.apiBaseUrl)) return next(req);

  const isAuthEndpoint = req.url.includes('/auth/');
  const auth = injector.get(AuthService);
  const token = auth.accessToken();

  let headers = req.headers;
  if (typeof localStorage !== 'undefined') {
    const cartId = localStorage.getItem(STORAGE_KEYS.cartId);
    if (cartId) headers = headers.set('X-Cart-Id', cartId);
  }
  if (token && !isAuthEndpoint) headers = headers.set('Authorization', `Bearer ${token}`);

  return next(req.clone({ headers })).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        isAuthEndpoint ||
        !token ||
        req.url.includes('/auth/refresh-token')
      ) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((res) => {
          const retryHeaders = req.headers
            .set('Authorization', `Bearer ${res.accessToken}`)
            .set('X-Cart-Id', localStorage.getItem(STORAGE_KEYS.cartId) ?? req.headers.get('X-Cart-Id') ?? '');
          return next(req.clone({ headers: retryHeaders }));
        }),
        catchError(() => {
          auth.clearSession();
          return throwError(() => error);
        })
      );
    })
  );
};
