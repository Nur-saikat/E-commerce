import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_ENV } from '../../../environments/environment';

// IIS rejects PUT/DELETE/PATCH with 405 before the request reaches the API,
// so tunnel them through POST; the API restores the verb from this header.
export const methodOverrideInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(APP_ENV);
  if (!req.url.startsWith(env.apiBaseUrl)) return next(req);
  if (req.method !== 'PUT' && req.method !== 'DELETE' && req.method !== 'PATCH') return next(req);

  return next(
    req.clone({
      method: 'POST',
      headers: req.headers.set('X-HTTP-Method-Override', req.method)
    })
  );
};
