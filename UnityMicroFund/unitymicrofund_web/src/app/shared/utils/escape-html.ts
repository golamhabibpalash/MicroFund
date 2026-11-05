const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for safe insertion into an HTML string (element content or quoted attribute). */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

/**
 * Returns a shallow copy with every string property HTML-escaped; numbers, booleans and
 * null/undefined are kept as-is, so formatting such as toFixed/toLocaleString still works.
 * Use before interpolating user-controlled records into hand-built HTML documents.
 */
export function escapeStringFields<T extends object>(record: T): T {
  const copy = { ...record } as Record<string, unknown>;
  for (const key of Object.keys(copy)) {
    if (typeof copy[key] === 'string') {
      copy[key] = escapeHtml(copy[key]);
    }
  }
  return copy as T;
}
