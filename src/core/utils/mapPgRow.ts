/**
 * Utility to map PostgreSQL snake_case row keys to camelCase.
 * Also auto-converts numeric strings to numbers and Date objects to ISO date strings.
 */
export function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  // Don't recurse into Date, Buffer, or other non-plain objects
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null && !(item instanceof Date)
        ? snakeToCamel(item as Record<string, unknown>)
        : item
    ) as unknown as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (val === null || val === undefined) {
      out[camelKey] = val;
    } else if (val instanceof Date) {
      // Convert Date objects to ISO date strings to avoid `{}` in form state
      out[camelKey] = isNaN(val.getTime()) ? null : val.toISOString().split('T')[0];
    } else if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val)) {
      // Auto-convert string numbers (from PG numeric/decimal)
      const n = Number(val);
      out[camelKey] = isNaN(n) ? val : n;
    } else if (typeof val === 'object') {
      out[camelKey] = snakeToCamel(val as Record<string, unknown>);
    } else {
      out[camelKey] = val;
    }
  }
  return out;
}

export function mapRows<T = unknown>(rows: Record<string, unknown>[] | undefined): T[] {
  return (rows || []).map((r) => snakeToCamel(r) as T);
}
