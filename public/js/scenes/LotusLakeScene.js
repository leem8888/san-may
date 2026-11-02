import { Scene } from './Scene.js';
import { ellipse, polygon } from '../rendering/SpriteRenderer.js';

export const LANTERN_LIFETIME = 600;
function hash(text) { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

// Lantern position is a pure function of its id and age, so every client sees it in the same place.
export function lanternPosition(lantern, age, lake, dock) {
  const seed = hash(lantern.id), angle = -Math.PI * (.15 + seed * .7), reach = .35 + hash(`${lantern.id}r`) * .45;
  const tx = lake.x + Math.cos(angle) * lake.rx * reach, ty = lake.y + Math.sin(angle) * lake.ry * reach;
  const k = Math.min(1, age / 90), ease = 1 - (1 - k) ** 2;
  const orbit = Math.max(0, age - 90) * .01 + seed * 6;
  return { x: dock.x + (tx - dock.x) * ease + Math.sin(age * .35 + seed * 9) * 6 + (k === 1 ? Math.cos(orbit) * 30 : 0), y: dock.y - 40 + (ty - dock.y + 40) * ease + Math.cos(age * .3 + seed * 5) * 4 + (k === 1 ? Math.sin(orbit) * 16 : 0) };
}

export class LotusLakeScene extends Scene {
  constructor(map) {
    super(map);
    this.lanterns = new Map(); this.blocked = new Set();
    const water = map.ground.layers.find(l => l.type === 'water');
    this.lake = { x: water.x, y: water.y, rx: water.rx, ry: water.ry };
    this.dock = this.objects.find(o => o.action === 'lantern');
  }
  setLanterns(list, serverNow) { this.lanterns.clear(); for (const l of list) this.addLantern(l, serverNow); }
  addLantern(l, serverNow = Date.now()) { this.lanterns.set(l.id, { ...l, born: this.time - (serverNow - l.createdAt) / 1000 }); }
  removeLantern(id) { this.lanterns.delete(id); }
  visibleLanterns() {
    const list = [];
    for (const l of this.lanterns.values()) {
      const age = this.time - l.born;
      if (age > LANTERN_LIFETIME) { this.lanterns.delete(l.id); continue; }
      if (!this.blocked.has(l.playerId)) list.push({ ...l, age, ...lanternPosition(l, age, this.lake, this.dock) });
    }
    return list;
  }
  dynamicLights() { return this.visibleLanterns().map(l => ({ x: l.x, y: l.y - 8, r: 60, color: '255,190,120', flicker: true, power: Math.min(1, (LANTERN_LIFETIME - l.age) / 30) })); }
  drawWater(c, env, quality) {
    super.drawWater(c, env, quality);
    for (const l of this.visibleLanterns()) {
      const fade = Math.min(1, (LANTERN_LIFETIME - l.age) / 30, l.age / 1.5), bob = Math.sin(env.time * 2 + l.x) * 1.5;
      c.globalAlpha = fade; ellipse(c, l.x, l.y + 6, 18, 5, 'rgba(255,214,150,.25)');
      // The flame's reflection: a broken, shimmering streak on the water below the lantern.
      for (let k = 0; k < 4; k++) { const w = 7 - k * 1.3, shift = env.reduced ? 0 : Math.sin(env.time * 3 + k * 1.7 + l.x) * 2.5; c.fillStyle = `rgba(255,205,130,${(.32 - k * .07) * fade})`; c.fillRect(l.x - w + shift, l.y + 12 + k * 6, w * 2, 2); }
      if (l.style === 'boat') { polygon(c, [[l.x - 16, l.y + bob], [l.x + 16, l.y + bob], [l.x + 10, l.y + 7 + bob], [l.x - 10, l.y + 7 + bob]], '#c9a26a', '#8a6a46'); }
      else if (l.style === 'round') { ellipse(c, l.x, l.y + 4 + bob, 13, 4, '#7d5f40'); ellipse(c, l.x, l.y - 6 + bob, 10, 12, '#f1c27a'); ellipse(c, l.x - 3, l.y - 8 + bob, 3, 7, '#fff0c4'); }
      else for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = i % 2 ? '#e9a3b4' : '#f3c0cb'; c.beginPath(); c.ellipse(l.x + Math.cos(a) * 8, l.y + Math.sin(a) * 3 + bob, 9, 4, a, 0, Math.PI * 2); c.fill(); }
      ellipse(c, l.x, l.y - 4 + bob, 2.5, 5 + Math.sin(env.time * 12 + l.x), '#ffd27a');
      if (l.age < 25) { c.font = '11px system-ui'; c.textAlign = 'center'; c.fillStyle = 'rgba(16,38,37,.75)'; const text = `${l.name}: ${l.text}`.slice(0, 48), w = c.measureText(text).width + 12; c.fillRect(l.x - w / 2, l.y - 34, w, 16); c.fillStyle = '#f2e3bd'; c.fillText(text, l.x, l.y - 22); }
      c.globalAlpha = 1;
    }
  }
  ambient(game, particles, env, view) {
    if (!env.night || env.reduced || particles.count('firefly') > 18 || Math.random() > env.dt * 4) return;
    particles.spawn({ kind: 'firefly', x: view.left + Math.random() * view.width, y: view.top + Math.random() * view.height, vx: (Math.random() - .5) * 16, vy: (Math.random() - .5) * 10, life: 5, size: 1.8, color: '#f0f7a8' });
  }
}
