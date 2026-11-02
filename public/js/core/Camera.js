export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export class Camera {
  constructor(world) { this.world = world; this.x = 900; this.y = 760; this.width = 1; this.height = 1; this.base = .9; this.focus = 1; this.focusTarget = 1; this.zoom = .9; }
  // Maps may scale the default zoom (indoor rooms zoom out a little so the altar or shelves stay in view);
  // `focus` is a gentle extra zoom used while meditating.
  fit() { this.zoom = this.base * (this.world.zoom || 1) * this.focus; this.constrain(); }
  resize(width, height) { this.width = width; this.height = height; this.base = width < 600 ? .75 : .9; this.fit(); }
  constrain() {
    const hw = this.width / this.zoom / 2, hh = this.height / this.zoom / 2;
    this.x = hw >= this.world.width / 2 ? this.world.width / 2 : clamp(this.x, hw, this.world.width - hw);
    this.y = hh >= this.world.height / 2 ? this.world.height / 2 : clamp(this.y, hh, this.world.height - hh);
  }
  setWorld(world) { this.world = world; this.fit(); }
  setFocus(focus) { this.focusTarget = focus; }
  snap(x, y) { this.x = x; this.y = y; this.constrain(); }
  update(target, dt) {
    const a = 1 - Math.exp(-5 * dt);
    if (Math.abs(this.focusTarget - this.focus) > .0005) { this.focus += (this.focusTarget - this.focus) * (1 - Math.exp(-1.5 * dt)); this.fit(); }
    this.x += (target.x - this.x) * a; this.y += (target.y - this.y) * a; this.constrain();
  }
  toWorld(x, y) { return { x: (x - this.width / 2) / this.zoom + this.x, y: (y - this.height / 2) / this.zoom + this.y }; }
  apply(ctx) { ctx.translate(this.width / 2, this.height / 2); ctx.scale(this.zoom, this.zoom); ctx.translate(-this.x, -this.y); }
  visible(x, y, margin = 180) { return Math.abs(x - this.x) < this.width / this.zoom / 2 + margin && Math.abs(y - this.y) < this.height / this.zoom / 2 + margin; }
}
