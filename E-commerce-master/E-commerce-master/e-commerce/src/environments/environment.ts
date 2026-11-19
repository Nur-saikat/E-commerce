import { InjectionToken, isDevMode } from '@angular/core';
import { AppEnvironment } from './environment.model';

export type { AppEnvironment } from './environment.model';

const apiBaseUrl = 'http://118.179.41.2:9876/api';

export const environment: AppEnvironment = {
  production: !isDevMode(),
  apiBaseUrl,
  assetBaseUrl: apiBaseUrl.replace(/\/api\/?$/, '')
};

export const APP_ENV = new InjectionToken<AppEnvironment>('APP_ENV', {
  providedIn: 'root',
  factory: () => environment
});
