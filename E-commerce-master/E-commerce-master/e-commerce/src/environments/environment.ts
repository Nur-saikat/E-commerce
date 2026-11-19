import { InjectionToken, isDevMode } from '@angular/core';
import { AppEnvironment } from './environment.model';

export type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: !isDevMode(),
  apiBaseUrl: 'http://118.179.41.2:9876/api',
  assetBaseUrl: 'http://localhost:5083'
};

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV', {
  providedIn: 'root',
  factory: () => environment
});
