import { seeded } from './ground.js';
const ROCKS = [[250, 260, 46], [640, 380, 64], [800, 170, 30]], TINES = [-15, -5, 5, 15];
export class SandSurface {
  constructor(canvas) {
    this.c = canvas.getContext('2d'); this.strokes = []; this.current = null;
    this.base = document.createElement('canvas'); this.base.width = 1000; this.base.height = 600;
    const b = this.base.getContext('2d'), random = seeded(17);
    b.fillStyle = '#d8ccad'; b.fillRect(0, 0, 1000, 600);
    for (let i = 0; i < 9000; i++) { b.fillStyle = random() < .5 ? 'rgba(255,250,235,.35)' : 'rgba(150,130,95,.18)'; b.fillRect(random() * 1000, random() * 600, 2, 2); }
  }
  rake(stroke) {
    const c = this.c;
    for (const offset of TINES) for (const [color, width, shift] of [['rgba(118,98,66,.55)', 3.2, 0], ['rgba(255,249,232,.7)', 1.4, 2]]) {
      c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
      stroke.forEach(([x, y], i) => {
        const a = stroke[Math.max(0, i - 1)], b = stroke[Math.min(stroke.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        const px = x - dy / len * offset + shift * .3, py = y + dx / len * offset + shift;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      });
      c.stroke();
    }
  }
  render() {
    const c = this.c;
    c.drawImage(this.base, 0, 0);
    for (const stroke of this.strokes) this.rake(stroke);
    if (this.current?.length > 1) this.rake(this.current);
    for (const [x, y, r] of ROCKS) {
      c.fillStyle = 'rgba(60,50,35,.25)'; c.beginPath(); c.ellipse(x + 8, y + r * .5, r * 1.1, r * .45, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7d8579'; c.beginPath(); c.ellipse(x, y, r, r * .72, -.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#9aa294'; c.beginPath(); c.ellipse(x - r * .25, y - r * .25, r * .45, r * .3, -.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#6f8a5c'; c.beginPath(); c.ellipse(x + r * .3, y + r * .35, r * .35, r * .14, 0, 0, Math.PI * 2); c.fill();
    }
  }
}
