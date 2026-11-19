import { InjectionToken } from '@angular/core';
import { AppEnvironment } from './environment.model';

const apiBaseUrl = '/api';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl,
  assetBaseUrl: apiBaseUrl.replace(/\/api\/?$/, '')
};

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV', {
  providedIn: 'root',
  factory: () => environment
});
