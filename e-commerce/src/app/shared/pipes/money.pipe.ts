import { Pipe, PipeTransform, inject } from '@angular/core';
import { ContentService } from '../../core/services/content.service';

@Pipe({ name: 'money', standalone: true, pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly content = inject(ContentService);

  transform(value: number | null | undefined, symbol?: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    const sign = symbol ?? this.content.settings()?.currencySymbol ?? '$';
    return `${sign}${Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}
