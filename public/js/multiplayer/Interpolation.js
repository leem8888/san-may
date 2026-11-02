// Remote avatars are drawn slightly in the past and blended between buffered server snapshots,
// which hides network jitter without extrapolating (no rubber-banding when a player stops).
export const RENDER_DELAY = 150;
export const SNAP_DISTANCE = 360;

export function sample(buffer, time) {
  if (!buffer.length) return null;
  if (time <= buffer[0].t) return buffer[0];
  for (let i = buffer.length - 1; i >= 0; i--) {
    const a = buffer[i], b = buffer[i + 1];
    if (a.t > time) continue;
    if (!b) return a;
    const k = (time - a.t) / Math.max(1, b.t - a.t);
    return { t: time, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }
  return buffer[0];
}

// Server clock offset estimated from snapshot timestamps; smoothed so one late packet cannot jolt the view.
export class Clock {
  constructor() { this.offset = null; }
  observe(serverTime, localTime = Date.now()) {
    const sampleOffset = serverTime - localTime;
    this.offset = this.offset === null || Math.abs(sampleOffset - this.offset) > 1000 ? sampleOffset : this.offset * .9 + sampleOffset * .1;
  }
  now(localTime = Date.now()) { return localTime + (this.offset ?? 0); }
}
