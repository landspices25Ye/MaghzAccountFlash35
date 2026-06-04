/**
 * Utility to map PostgreSQL snake_case row keys to camelCase.
 * Also auto-converts numeric strings to numbers.
 */
export function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? snakeToCamel(item as Record<string, unknown>) : item
    ) as unknown as Record<string, unknown>;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (val === null || val === undefined) {
      out[camelKey] = val;
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
