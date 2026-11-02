import { seeded } from '../../rendering/ground.js';

const BASKET = { x: 880, y: 470, r: 72 }, BROOM = 58;

// Push fallen leaves into the basket with a broom that follows the pointer.
export class SweepGame {
  static title = 'Quét lá trong sân'; static eyebrow = 'SÂN CHÙA'; static hint = 'Giữ và kéo để quét. Lá phản ứng theo hướng chổi; gom hết vào giỏ tre.';
  constructor({ canvas, tools, status, el, done, audio }) {
    Object.assign(this, { status, done, audio }); this.c = canvas.getContext('2d'); this.time = 0; this.broom = { x: 500, y: 300, vx: 0, vy: 0, down: false }; this.finished = false;
    const random = seeded(Date.now() % 100000);
    this.leaves = Array.from({ length: 42 }, () => ({ x: 60 + random() * 680, y: 60 + random() * 480, vx: 0, vy: 0, rot: random() * 6, size: 7 + random() * 5, color: ['#c6b278', '#b98d55', '#d7c48e', '#a7743f'][Math.floor(random() * 4)], in: 0 }));
    this.base = document.createElement('canvas'); this.base.width = 1000; this.base.height = 600;
    const b = this.base.getContext('2d');
    b.fillStyle = '#625b48'; b.fillRect(0, 0, 1000, 600);
    for (let y = 0; y < 600; y += 50) for (let x = (y / 50) % 2 ? -50 : 0; x < 1000; x += 100) { b.fillStyle = ['#8d8469', '#928970', '#9c9277', '#867e64'][Math.floor(random() * 4)]; b.beginPath(); b.roundRect(x + 2, y + 2, 96, 46, 3); b.fill(); }
    tools(el('button', { type: 'button', text: 'Rải lá lại', onclick: () => { for (const l of this.leaves) Object.assign(l, { x: 60 + Math.random() * 680, y: 60 + Math.random() * 480, vx: 0, vy: 0, in: 0 }); this.finished = false; } }));
    this.count();
  }
  count() { const n = this.leaves.filter(l => l.in).length; this.status(`Đã gom ${n}/${this.leaves.length} chiếc lá`); return n; }
  pointer(type, x, y) {
    const b = this.broom;
    if (type === 'pointerdown') { b.down = true; b.x = x; b.y = y; }
    if (type === 'pointermove') { b.vx = (x - b.x) * 60; b.vy = (y - b.y) * 60; b.x = x; b.y = y; }
    if (type === 'pointerup' || type === 'pointercancel') b.down = false;
  }
  update(dt) {
    this.time += dt; const b = this.broom;
    let swept = false;
    for (const l of this.leaves) {
      if (l.in) continue;
      const d = Math.hypot(l.x - b.x, l.y - b.y);
      if (b.down && d < BROOM) { const push = (1 - d / BROOM); l.vx += b.vx * push * dt * 9; l.vy += b.vy * push * dt * 9; swept ||= Math.hypot(b.vx, b.vy) > 200; }
      l.vx *= Math.exp(-4 * dt); l.vy *= Math.exp(-4 * dt);
      l.x = Math.max(10, Math.min(990, l.x + (l.vx + Math.sin(this.time + l.rot) * 3) * dt)); l.y = Math.max(10, Math.min(590, l.y + l.vy * dt)); l.rot += l.vx * dt * .02;
      if (Math.hypot(l.x - BASKET.x, l.y - BASKET.y) < BASKET.r - 10) { l.in = 1; const n = this.count(); this.audio.tone(500 + n * 12, .12, .02, 'sfx', 'triangle'); }
    }
    if (swept && Math.random() < dt * 8) this.audio.step();
    b.vx *= .8; b.vy *= .8;
    if (!this.finished && this.leaves.every(l => l.in)) { this.finished = true; this.done(); this.status('Sân đã sạch lá. Cảm ơn bạn đã giữ gìn chốn chung.'); }
  }
  render() {
    const c = this.c, b = this.broom;
    c.drawImage(this.base, 0, 0);
    c.fillStyle = '#6f5436'; c.beginPath(); c.ellipse(BASKET.x, BASKET.y, BASKET.r, BASKET.r * .7, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#a07f52'; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(BASKET.x, BASKET.y, BASKET.r - i * 10, (BASKET.r - i * 10) * .7, 0, 0, Math.PI * 2); c.stroke(); }
    for (const l of this.leaves) {
      const scale = l.in ? .55 : 1, x = l.in ? BASKET.x + (l.x - BASKET.x) * .5 : l.x, y = l.in ? BASKET.y + (l.y - BASKET.y) * .5 : l.y;
      c.save(); c.translate(x, y); c.rotate(l.rot); c.fillStyle = l.color; c.beginPath(); c.ellipse(0, 0, l.size * scale, l.size * .45 * scale, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(80,60,30,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-l.size * scale, 0); c.lineTo(l.size * scale, 0); c.stroke(); c.restore();
    }
    c.save(); c.translate(b.x, b.y); c.rotate(Math.max(-.6, Math.min(.6, b.vx / 1500)));
    c.strokeStyle = '#8a6a46'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, -10); c.lineTo(30, -120); c.stroke();
    c.fillStyle = b.down ? '#d6bd85' : '#c9b07a'; c.beginPath(); c.moveTo(-34, 18); c.lineTo(34, 18); c.lineTo(14, -14); c.lineTo(-10, -14); c.closePath(); c.fill();
    c.restore();
  }
}
