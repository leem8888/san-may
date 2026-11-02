import { DEFAULT_APPEARANCE, DURATIONS, CHAT_SECONDS } from '../shared/rules.js';
import { NPC_LINES } from './NpcLines.js';

// NPCs rest in place (standing, or seated with `pose: 'meditate'`) and now and then make a small gesture;
// dialogue comes from a DialogueProvider.
export class NPC {
  constructor(o) {
    this.rest = o.pose || 'idle';
    Object.assign(this, { id: o.id, name: o.name, x: o.x, y: o.y, dialogue: o.dialogue, direction: o.direction || 'down', state: this.rest, elapsed: Math.random() * 2, npc: true });
    this.appearance = { ...DEFAULT_APPEARANCE, ...o.appearance }; this.gestures = o.gestures || ['pray']; this.next = 4 + Math.random() * 6;
    this.renderScale = o.id === 'novice' ? .76 : 1;
    if (o.id === 'novice') this.appearance.characterStyle = 'child';
    if (o.id === 'abbot') this.appearance.characterStyle = 'abbot';
    this.lines = o.ambientLines || NPC_LINES[o.id] || [];
    this.nextChat = 8 + Math.random() * 18;
    this.lastLine = -1;
    // Standing greeters occasionally bow as well as making their usual gestures.
    if (this.rest === 'idle' && this.gestures.length) this.gestures = [...new Set([...this.gestures, 'bow'])];
  }
  update(dt, player) {
    this.elapsed += dt;
    if (this.chat && !this.chat.chant && (this.chat.age += dt) >= CHAT_SECONDS) this.chat = null;
    if (Number.isFinite(DURATIONS[this.state]) && this.elapsed >= DURATIONS[this.state]) { this.state = this.rest; this.elapsed = 0; }
    const resting = this.state === this.rest;
    // Standing NPCs face a nearby visitor; seated ones keep facing the room.
    if (this.rest === 'idle' && player && Math.hypot(player.x - this.x, player.y - this.y) < 160 && resting) this.direction = Math.abs(player.x - this.x) > Math.abs(player.y - this.y) ? (player.x > this.x ? 'right' : 'left') : (player.y > this.y ? 'down' : 'up');
    if ((this.next -= dt) <= 0 && resting && this.gestures.length) { this.state = this.gestures[Math.floor(Math.random() * this.gestures.length)]; this.elapsed = 0; this.next = 7 + Math.random() * 8; }
    this.nextChat -= dt;
    if (this.nextChat <= 0 && !this.chat && this.lines.length && player && Math.hypot(player.x - this.x, player.y - this.y) < 340) {
      // Pick from the other lines so consecutive remarks never repeat.
      let index = Math.floor(Math.random() * (this.lines.length - (this.lastLine < 0 ? 0 : 1)));
      if (this.lastLine >= 0 && index >= this.lastLine) index++;
      if (this.lines.length === 1) index = 0;
      this.lastLine = index;
      this.chat = { text: this.lines[index], age: 0 };
      this.nextChat = 24 + Math.random() * 26;
    }
  }
}
