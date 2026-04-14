import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bdtCurrency',
  standalone: true
})
export class BdtCurrencyPipe implements PipeTransform {
  transform(value: number | string | null, showCode: boolean = true): string {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '৳ 0';
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;
    const formatted = new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);

    return showCode ? `৳ ${formatted}` : formatted;
  }
}

export function formatBdt(value: number | string | null, showCode: boolean = true): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '৳ 0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;
  const formatted = new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(num);

  return showCode ? `৳ ${formatted}` : formatted;
}