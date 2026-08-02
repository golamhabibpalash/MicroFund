import { Pipe, PipeTransform } from '@angular/core';

/**
 * Renders a timestamp as a relative "time ago" label.
 *
 * Impure so the label keeps ticking over ("Just now" -> "1m ago") instead of
 * freezing at whatever it was on first render.
 */
@Pipe({
  name: 'timeAgo',
  standalone: true,
  pure: false
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, compact: boolean = false): string {
    return timeAgo(value, compact);
  }
}

export function timeAgo(value: string | Date | null | undefined, compact: boolean = false): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const date = parseAsUtc(value);
  if (isNaN(date.getTime())) {
    return '';
  }

  // Clock skew between server and browser can put a timestamp slightly in the
  // future; clamp so it never renders as a negative duration.
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return compact ? 'now' : 'Just now';
  if (mins < 60) return compact ? `${mins}m` : `${mins}m ago`;
  if (hours < 24) return compact ? `${hours}h` : `${hours}h ago`;
  if (days < 7) return compact ? `${days}d` : `${days}d ago`;

  return compact
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : date.toLocaleDateString();
}

/**
 * The API tags every timestamp with an explicit "Z" (see UtcDateTimeConverter).
 * This guards the case where a value slips through without one: JavaScript would
 * otherwise read an offset-less date-time as local and skew the result by the
 * viewer's UTC offset.
 */
function parseAsUtc(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const hasTimezone = /([Zz]|[+-]\d{2}:?\d{2})$/.test(value);
  const hasTime = value.includes('T') || value.includes(' ');

  return new Date(hasTime && !hasTimezone ? `${value}Z` : value);
}
