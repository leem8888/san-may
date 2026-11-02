// A small, conservative word filter. It is a first line of defence; reports + auto-hide handle the rest.
const SUBSTRINGS = ['địt', 'đụ ', 'lồn', 'cặc', 'buồi', 'đéo', 'đĩ ', 'fuck', 'shit', 'bitch', 'cunt', 'nigger'];
// Only unambiguous abbreviations; plain words like "deo" (đeo) or "dit" would block innocent text without diacritics.
const WORDS = new Set(['dm', 'đm', 'dmm', 'đmm', 'dcm', 'đcm', 'vcl', 'vkl', 'vl', 'clgt', 'cmm', 'cc', 'loz']);

export function isOffensive(text) {
  const lower = ` ${String(text).toLowerCase()} `;
  if (SUBSTRINGS.some(word => lower.includes(word))) return true;
  return lower.split(/[^\p{L}\p{N}]+/u).some(token => WORDS.has(token));
}

// Token bucket per key; used both for sockets and REST.
export class RateLimiter {
  constructor(capacity, perSecond) { this.capacity = capacity; this.perSecond = perSecond; this.buckets = new Map(); }
  take(key, cost = 1, now = Date.now()) {
    let bucket = this.buckets.get(key);
    if (!bucket) { bucket = { tokens: this.capacity, at: now }; this.buckets.set(key, bucket); }
    bucket.tokens = Math.min(this.capacity, bucket.tokens + (now - bucket.at) / 1000 * this.perSecond); bucket.at = now;
    if (bucket.tokens < cost) return false;
    bucket.tokens -= cost; return true;
  }
  prune(now = Date.now()) { for (const [key, bucket] of this.buckets) if (now - bucket.at > 600000) this.buckets.delete(key); }
}
