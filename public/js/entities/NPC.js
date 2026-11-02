import { DEFAULT_APPEARANCE, DURATIONS } from '../shared/rules.js';

// NPCs rest in place (standing, or seated with `pose: 'meditate'`) and now and then make a small gesture;
// dialogue comes from a DialogueProvider.
export class NPC {
  constructor(o) {
    this.rest = o.pose || 'idle';
    Object.assign(this, { id: o.id, name: o.name, x: o.x, y: o.y, dialogue: o.dialogue, direction: o.direction || 'down', state: this.rest, elapsed: Math.random() * 2, npc: true });
    this.appearance = { ...DEFAULT_APPEARANCE, ...o.appearance }; this.gestures = o.gestures || ['pray']; this.next = 4 + Math.random() * 6;
  }
  update(dt, player) {
    this.elapsed += dt;
    if (Number.isFinite(DURATIONS[this.state]) && this.elapsed >= DURATIONS[this.state]) { this.state = this.rest; this.elapsed = 0; }
    const resting = this.state === this.rest;
    // Standing NPCs face a nearby visitor; seated ones keep facing the room.
    if (this.rest === 'idle' && player && Math.hypot(player.x - this.x, player.y - this.y) < 160 && resting) this.direction = Math.abs(player.x - this.x) > Math.abs(player.y - this.y) ? (player.x > this.x ? 'right' : 'left') : (player.y > this.y ? 'down' : 'up');
    if ((this.next -= dt) <= 0 && resting && this.gestures.length) { this.state = this.gestures[Math.floor(Math.random() * this.gestures.length)]; this.elapsed = 0; this.next = 7 + Math.random() * 8; }
  }
}
