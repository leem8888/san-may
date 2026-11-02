import { createScene } from '../scenes/index.js';

const FADE_SECONDS = .35, KEEP_GROUNDS = 2;

// Owns scene instances, the fade transition and ground-cache lifetime (only the most recent areas keep
// their rasterised ground, so walking through all eight areas does not grow memory).
export class SceneManager {
  constructor(maps) { this.maps = maps; this.scenes = new Map(); this.current = null; this.recent = []; this.fade = 0; this.fadeTarget = 0; this.busy = false; this.waiters = []; }
  // Garden scenes are 'garden:<code>': one instance per garden, all sharing the garden map template.
  get(id) {
    const base = id.split(':')[0];
    if (!this.maps.has(base)) throw Error(`Khu vực không tồn tại: ${id}`);
    if (!this.scenes.has(id)) { const scene = createScene(this.maps.get(base)); scene.id = id; this.scenes.set(id, scene); }
    return this.scenes.get(id);
  }
  enter(id) {
    const scene = this.get(id);
    scene.enter();
    this.current = scene;
    this.recent = [id, ...this.recent.filter(other => other !== id)];
    for (const old of this.recent.splice(KEEP_GROUNDS)) this.scenes.get(old)?.release();
    return scene;
  }
  update(dt) {
    const step = dt / FADE_SECONDS;
    this.fade = this.fadeTarget > this.fade ? Math.min(this.fadeTarget, this.fade + step) : Math.max(this.fadeTarget, this.fade - step);
    if (this.fade >= 1) { const waiters = this.waiters; this.waiters = []; waiters.forEach(resolve => resolve()); }
  }
  // Fades out, runs `swap` (which talks to the server and changes scene), then fades back in.
  async transition(swap) {
    if (this.busy) return false;
    this.busy = true; this.fadeTarget = 1;
    await Promise.race([new Promise(resolve => this.waiters.push(resolve)), new Promise(resolve => setTimeout(resolve, 1200))]);
    try { return await swap(); }
    finally { this.fadeTarget = 0; this.busy = false; }
  }
}
