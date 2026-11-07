import { Pipe, PipeTransform, inject } from '@angular/core';
import { APP_ENV } from '../../../environments/environment';

@Pipe({ name: 'assetUrl', standalone: true })
export class AssetUrlPipe implements PipeTransform {
  private readonly env = inject(APP_ENV);

  transform(value: string | null | undefined): string {
    if (!value) return 'assets/placeholder.svg';
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('assets/')) return value;
    return `${this.env.assetBaseUrl}${value.startsWith('/') ? '' : '/'}${value}`;
  }
}
