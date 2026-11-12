/** Replace this store with an atomic distributed backend before multi-instance deployment. */
export interface RateLimitStore {
  take(key: string, now?: number): { allowed: boolean; retryAfter: number };
}
export class TokenBucketStore implements RateLimitStore {
  private buckets = new Map<string, { tokens: number; updated: number }>();
  constructor(
    private readonly capacity = 20,
    private readonly refillPerSecond = 1 / 3,
  ) {}
  take(key: string, now = Date.now()) {
    const previous = this.buckets.get(key) ?? { tokens: this.capacity, updated: now };
    const tokens = Math.min(
      this.capacity,
      previous.tokens + (Math.max(0, now - previous.updated) / 1000) * this.refillPerSecond,
    );
    // Bound memory even if arbitrary forwarded addresses reach the server.
    if (this.buckets.size >= 5000 && !this.buckets.has(key))
      this.buckets.delete(this.buckets.keys().next().value!);
    if (tokens < 1) {
      this.buckets.set(key, { tokens, updated: now });
      return { allowed: false, retryAfter: Math.ceil((1 - tokens) / this.refillPerSecond) };
    }
    this.buckets.set(key, { tokens: tokens - 1, updated: now });
    return { allowed: true, retryAfter: 0 };
  }
  clear() {
    this.buckets.clear();
  }
}
export const routeLimiter = new TokenBucketStore();
