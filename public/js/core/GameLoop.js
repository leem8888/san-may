export class GameLoop {
  constructor(update, render) { this.update = update; this.render = render; this.running = false; this.last = null; this.frame = this.frame.bind(this); }
  start() { if (this.running) return; this.running = true; this.last = null; this.id = requestAnimationFrame(this.frame); }
  frame(now) { if (!this.running) return; const dt = this.last === null ? 0 : Math.min((now - this.last) / 1000, .05); this.last = now; this.update(dt); this.render(); this.id = requestAnimationFrame(this.frame); }
  stop() { this.running = false; cancelAnimationFrame(this.id); this.last = null; }
}
