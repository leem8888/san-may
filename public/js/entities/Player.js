import { DURATIONS, ROUND, SPEED, DEFAULT_APPEARANCE } from '../shared/rules.js';
export { DURATIONS };
export class Player {
  constructor() { this.x = 900; this.y = 790; this.name = ''; this.appearance = { ...DEFAULT_APPEARANCE }; this.direction = 'down'; this.state = 'idle'; this.elapsed = 0; this.bows = 0; this.beads = 0; this.onComplete = () => {}; this.onStateChange = () => {}; }
  setState(state) { if (this.state === state) return; const previous = this.state; this.state = state; this.elapsed = 0; this.onStateChange(state, previous); }
  act(state) { if (!(state in DURATIONS) || !['idle', 'walk'].includes(this.state)) return false; this.setState(state); return true; }
  place(x, y, direction = this.direction) { this.x = x; this.y = y; this.direction = direction; }
  update(dt, vector, collision) {
    const length = Math.hypot(vector.x, vector.y);
    if (length > .05) {
      this.setState('walk'); this.direction = Math.abs(vector.x) > Math.abs(vector.y) ? (vector.x > 0 ? 'right' : 'left') : (vector.y > 0 ? 'down' : 'up');
      collision.move(this, vector.x / Math.max(1, length) * SPEED * dt, vector.y / Math.max(1, length) * SPEED * dt);
    } else if (this.state === 'walk') this.setState('idle');
    this.elapsed += dt;
    if (this.elapsed >= DURATIONS[this.state]) {
      const done = this.state; this.setState('idle');
      if (done === 'bow') this.bows = Math.min(ROUND, this.bows + 1);
      if (done === 'bead') this.beads = Math.min(ROUND, this.beads + 1);
      this.onComplete(done);
    }
  }
}
