export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export function getSafeLimit(limit?: number, fallback: number = DEFAULT_PAGE_LIMIT): number {
  const fallbackLimit = Number.isFinite(fallback) ? Math.trunc(fallback) : DEFAULT_PAGE_LIMIT;
  const resolvedFallback = Math.min(Math.max(fallbackLimit, 1), MAX_PAGE_LIMIT);

  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return resolvedFallback;
  }

  const normalized = Math.trunc(limit);
  if (normalized < 1) {
    return 1;
  }

  return Math.min(normalized, MAX_PAGE_LIMIT);
}
