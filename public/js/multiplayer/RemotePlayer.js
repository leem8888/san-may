import { DEFAULT_APPEARANCE } from '../shared/rules.js';
import { sample, SNAP_DISTANCE } from './Interpolation.js';

export class RemotePlayer {
  constructor(data, serverTime) {
    this.id = data.id; this.name = data.name; this.appearance = data.appearance || { ...DEFAULT_APPEARANCE };
    this.x = data.x; this.y = data.y; this.direction = data.direction || 'down'; this.state = data.state || 'idle'; this.elapsed = data.elapsed || 0;
    this.buffer = [{ t: serverTime, x: data.x, y: data.y }]; this.emote = null;
  }
  push(data, serverTime) {
    const last = this.buffer.at(-1);
    if (last && serverTime <= last.t) return;
    // Large jumps (scene spawn, server correction) snap instead of sliding across the map.
    if (last && Math.hypot(data.x - last.x, data.y - last.y) > SNAP_DISTANCE) this.buffer = [];
    this.buffer.push({ t: serverTime, x: data.x, y: data.y });
    while (this.buffer.length > 2 && this.buffer[1].t < serverTime - 1500) this.buffer.shift();
    this.direction = data.direction || this.direction;
    if (data.name) this.name = data.name;
    if (data.state && data.state !== this.state) { this.state = data.state; this.elapsed = data.elapsed || 0; }
  }
  action(action) { this.state = action; this.elapsed = 0; }
  update(dt, renderTime) {
    const point = sample(this.buffer, renderTime);
    if (point) { this.x = point.x; this.y = point.y; }
    this.elapsed += dt;
    if (this.emote && (this.emote.age += dt) > 2.6) this.emote = null;
  }
}
