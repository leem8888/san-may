// Fixed-size pool: particles are recycled, never allocated per frame, and the cap follows the quality setting.
export class ParticleSystem {
  constructor(size = 360) { this.pool = Array.from({ length: size }, () => ({ active: false })); this.cap = size; }
  setCap(cap) { this.cap = Math.min(cap, this.pool.length); let alive = 0; for (const p of this.pool) if (p.active && ++alive > this.cap) p.active = false; }
  count(kind) { let n = 0; for (const p of this.pool) if (p.active && (!kind || p.kind === kind)) n++; return n; }
  spawn(props) {
    if (this.count() >= this.cap) return null;
    const p = this.pool.find(item => !item.active);
    if (!p) return null;
    return Object.assign(p, { active: true, vx: 0, vy: 0, rot: 0, vr: 0, age: 0, life: 3, size: 2, alpha: 1, screen: false }, props);
  }
  clear(kind) { for (const p of this.pool) if (!kind || p.kind === kind) p.active = false; }
  update(dt, wind = 0) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.life) { p.active = false; continue; }
      p.x += (p.vx + (p.kind === 'leaf' ? wind * 40 : p.kind === 'rain' ? wind * 60 : 0)) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (p.kind === 'leaf') p.vx = Math.sin(p.age * 2 + p.seed) * 14;
      if (p.kind === 'smoke') { p.vx = Math.sin(p.age * 1.4 + p.seed) * 6; p.size += dt * 2.2; }
      if (p.kind === 'butterfly') { p.vx = Math.sin(p.age * 1.7 + p.seed) * 24; p.vy = Math.cos(p.age * 1.3 + p.seed) * 14; }
    }
  }
  draw(c, screen, camera) {
    for (const p of this.pool) {
      if (!p.active || p.screen !== screen || (!screen && camera && !camera.visible(p.x, p.y, 40))) continue;
      const fade = Math.min(1, p.age / .4, (p.life - p.age) / .6) * p.alpha;
      c.globalAlpha = Math.max(0, fade);
      if (p.kind === 'rain') { c.strokeStyle = '#c9dde6'; c.lineWidth = 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .02 - 2, p.y - p.size); c.stroke(); }
      else if (p.kind === 'splash') { c.strokeStyle = '#d4e6ee'; c.lineWidth = 1; c.beginPath(); c.ellipse(p.x, p.y, 2 + p.age * 14, 1 + p.age * 5, 0, 0, Math.PI * 2); c.stroke(); }
      else if (p.kind === 'smoke') { c.fillStyle = '#e8e2d4'; c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill(); }
      else if (p.kind === 'butterfly') { const open = Math.abs(Math.sin(p.age * 14 + p.seed)); c.fillStyle = p.color; for (const side of [-1, 1]) { c.beginPath(); c.ellipse(p.x + side * p.size * open, p.y, p.size * 1.3 * open + .4, p.size, side * .5, 0, Math.PI * 2); c.fill(); } }
      else if (p.kind === 'bird') { const flap = Math.sin(p.age * 18 + p.seed) * p.size; c.strokeStyle = p.color; c.lineWidth = 1.6; c.beginPath(); c.moveTo(p.x - p.size * 2, p.y - flap); c.lineTo(p.x, p.y); c.lineTo(p.x + p.size * 2, p.y - flap); c.stroke(); }
      else if (p.kind === 'mote' || p.kind === 'firefly') { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size, 0, Math.PI * 2); c.fill(); }
      else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.color; c.beginPath(); c.ellipse(0, 0, p.size * 2, p.size * .7, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
    }
    c.globalAlpha = 1;
  }
}
