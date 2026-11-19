import { InjectionToken, isDevMode } from '@angular/core';
import { AppEnvironment } from './environment.model';

export type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: !isDevMode(),
  apiBaseUrl: 'http://localhost:5083/api',
  assetBaseUrl: 'http://localhost:5083'
};

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV', {
  providedIn: 'root',
  factory: () => environment
});
