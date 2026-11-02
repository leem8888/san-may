import { NPC } from '../entities/NPC.js';
import { SpriteRenderer } from '../rendering/SpriteRenderer.js';

const GESTURES = { idle: 'Đang lắng nghe bạn', pray: 'Chắp tay chào bạn', bow: 'Cúi chào nhẹ nhàng', wave: 'Vẫy tay chào bạn', interact: 'Chậm rãi kể chuyện', meditate: 'Ngồi an nhiên' };

// Owns exactly one small animation loop while a dialogue is visible.
export class NpcPortrait {
  constructor(canvas, caption) {
    this.canvas = canvas; this.caption = caption; this.sprites = new SpriteRenderer(32); this.raf = 0;
  }
  start(source, reduced = false) {
    this.stop(); this.reduced = reduced;
    this.person = new NPC({ id: source.id, name: source.name, appearance: source.appearance, gestures: [...source.gestures], pose: source.rest, x: 48, y: 82, direction: 'down' });
    this.logicalSize = this.person.appearance.characterStyle === 'abbot' ? 112 : 96;
    if (this.logicalSize === 112) { this.person.x = 56; this.person.y = 104; }
    this.canvas.hidden = false; this.caption.hidden = false;
    this.canvas.setAttribute('aria-label', `Nhân vật ${source.name}`);
    this.gesture(); this.draw(); this.last = performance.now();
    if (reduced) return;
    const tick = now => {
      if (!this.person) return;
      this.person.update(Math.min(.05, Math.max(0, (now - this.last) / 1000)), null);
      this.last = now; this.draw(); this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  gesture() {
    if (!this.person || this.reduced || !this.person.gestures.length) return;
    const choices = this.person.gestures.filter(s => s !== this.person.state);
    if (!choices.length) return;
    this.person.state = choices[Math.floor(Math.random() * choices.length)]; this.person.elapsed = 0;
    this.person.next = 5 + Math.random() * 5;
  }
  draw() {
    const c = this.canvas.getContext('2d');
    c.clearRect(0, 0, this.canvas.width, this.canvas.height); c.save();
    const glow = c.createRadialGradient(112, 110, 10, 120, 120, 130);
    glow.addColorStop(0, '#d2b57833'); glow.addColorStop(1, '#18333000'); c.fillStyle = glow; c.fillRect(0, 0, 240, 240);
    c.scale(this.canvas.width / this.logicalSize, this.canvas.height / this.logicalSize); this.sprites.draw(c, this.person); c.restore();
    // A mood set by the conversation (server dialogue) wins over the idle gesture caption.
    this.caption.textContent = this.moodText || GESTURES[this.person.state] || 'Đang trò chuyện cùng bạn';
  }
  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0; this.person = null; this.moodText = ''; this.canvas.hidden = true; this.caption.hidden = true;
  }
}
