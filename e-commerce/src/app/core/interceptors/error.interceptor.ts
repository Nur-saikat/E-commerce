import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SILENT_ERROR } from '../constants';
import { ToastService } from '../services/toast.service';

const STATUS_MESSAGES: Record<number, string> = {
  0: 'Cannot reach the store server. Please check your connection.',
  400: 'The request could not be processed.',
  401: 'Please sign in to continue.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  422: 'Please review the form and correct the highlighted fields.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again shortly.'
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      if (error.status === 401) return throwError(() => error);
      if (req.context.get(SILENT_ERROR)) return throwError(() => error);

      const body = error.error as { message?: string; errors?: string[] } | null;
      const detail = body?.errors?.length ? body.errors.join(' ') : body?.message;
      toast.error(detail || STATUS_MESSAGES[error.status] || 'An unexpected error occurred. Please try again.');
      return throwError(() => error);
    })
  );
};
