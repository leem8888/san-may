export const WEATHER_MODES = { auto: 'Tự nhiên (đổi theo thời gian)', clear: 'Trời quang', leaves: 'Lá rơi', wind: 'Gió', rain: 'Mưa nhẹ', fog: 'Sương mù' };
const KINDS = ['clear', 'leaves', 'wind', 'rain', 'fog'];
const WEIGHTS = [['clear', 34], ['leaves', 26], ['wind', 16], ['rain', 12], ['fog', 12]];
const BASE_WIND = { clear: .15, leaves: .4, wind: 1, rain: .45, fog: .05 };
const SLOT = 9 * 60000;

function hash(text) { let h = 2166136261; for (const ch of text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

// Runs independently of any scene. In "auto" mode the weather is a pure function of room code and time slot,
// so every player in a room sees the same sky without sending weather over the network.
export class WeatherSystem {
  constructor(seed = 'MAY-01', mode = 'auto') {
    this.seed = seed; this.mode = WEATHER_MODES[mode] ? mode : 'auto'; this.time = 0;
    this.levels = Object.fromEntries(KINDS.map(kind => [kind, 0])); this.current = this.target(); this.levels[this.current] = 1; this.wind = BASE_WIND[this.current];
  }
  target(now = Date.now()) {
    if (this.mode !== 'auto') return this.mode;
    let roll = hash(`${this.seed}:${Math.floor(now / SLOT)}`) % 100;
    for (const [kind, weight] of WEIGHTS) { if (roll < weight) return kind; roll -= weight; }
    return 'clear';
  }
  update(dt, now = Date.now()) {
    this.time += dt; this.current = this.target(now);
    // Cross-fade over ~6 s so rain or fog never pops in.
    for (const kind of KINDS) { const goal = kind === this.current ? 1 : 0; this.levels[kind] += Math.sign(goal - this.levels[kind]) * Math.min(Math.abs(goal - this.levels[kind]), dt / 6); }
    const base = KINDS.reduce((sum, kind) => sum + BASE_WIND[kind] * this.levels[kind], 0);
    this.wind = base * (.75 + Math.sin(this.time * .7) * .15 + Math.sin(this.time * 2.3) * .1);
  }
  get label() { return WEATHER_MODES[this.current]; }
}
