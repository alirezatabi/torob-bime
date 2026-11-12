/** TTL and single-flight cache. No user text or credentials are part of keys or values. */
const entries = new Map<string, { expires: number; promise: Promise<unknown> }>();
export async function cachedExplanation<T>(
  key: string,
  compute: () => Promise<T>,
  ttl = 300_000,
): Promise<T> {
  const now = Date.now();
  const existing = entries.get(key);
  if (existing && existing.expires > now) return existing.promise as Promise<T>;
  if (entries.size >= 256) entries.delete(entries.keys().next().value!);
  const promise = compute();
  entries.set(key, { expires: now + ttl, promise });
  try {
    return await promise;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}
export function clearExplanationCache() {
  entries.clear();
}
