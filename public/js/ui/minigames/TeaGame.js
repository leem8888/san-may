import { drawTea } from '../../rendering/TeaArt.js';
const TEAS = { 'trà sen': '#c9b06a', 'trà lài': '#d6c27a', 'trà ô long': '#b7793e' };
const SIPS = ['Hương trà lan nhẹ nơi đầu lưỡi.', 'Hơi ấm truyền qua lòng bàn tay.', 'Chén vơi dần, lòng cũng nhẹ đi.'];

// Four steps: choose tea → boil water (hold) → pour to the line (hold, release in time) → sip.
export class TeaGame {
  static title = 'Pha trà'; static eyebrow = 'THƯ VIỆN'; static hint = 'Chọn một loại trà để bắt đầu.';
  constructor({ tools, status, el, done, audio, canvas }) {
    Object.assign(this, { tools, status, el, done, audio }); this.c = canvas.getContext('2d');
    this.step = 'choose'; this.tea = null; this.temp = 20; this.fill = 0; this.holding = false; this.sips = 0; this.time = 0; this.steam = [];
    this.keydown = event => { if (event.code === 'Space') { event.preventDefault(); this.holding = true; } };
    this.keyup = event => { if (event.code === 'Space') this.release(); };
    window.addEventListener('keydown', this.keydown); window.addEventListener('keyup', this.keyup);
    this.toolsFor();
  }
  hold(label) {
    const button = this.el('button', { type: 'button', class: 'primary', text: label });
    button.addEventListener('pointerdown', () => { this.holding = true; }); for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, () => this.release());
    return button;
  }
  toolsFor() {
    const el = this.el;
    if (this.step === 'choose') this.tools(...Object.keys(TEAS).map(name => el('button', { type: 'button', text: name[0].toUpperCase() + name.slice(1), onclick: () => { this.tea = name; this.step = 'boil'; this.status('Giữ nút (hoặc phím cách) để đun nước đến khi sôi.'); this.toolsFor(); } })));
    if (this.step === 'boil') this.tools(this.hold('Giữ để đun nước'));
    if (this.step === 'pour') this.tools(this.hold('Giữ để rót trà'));
    if (this.step === 'sip') this.tools(el('button', { type: 'button', class: 'primary', text: 'Nhấp một ngụm', onclick: () => this.sip() }));
    if (this.step === 'done') this.tools(el('button', { type: 'button', text: 'Pha ấm khác', onclick: () => { Object.assign(this, { step: 'choose', temp: 20, fill: 0, sips: 0 }); this.status('Chọn một loại trà để bắt đầu.'); this.toolsFor(); } }));
  }
  release() {
    if (!this.holding) return; this.holding = false;
    if (this.step !== 'pour' || this.fill <= 0) return;
    if (this.fill >= 70 && this.fill <= 92) { this.step = 'sip'; this.status('Vừa đủ. Hãy thưởng trà thật chậm.'); this.toolsFor(); }
    else if (this.fill < 70) this.status('Chưa đầy lắm — giữ để rót thêm một chút.');
  }
  sip() {
    this.status(SIPS[this.sips]); this.fill = Math.max(0, this.fill - 26); this.audio.tone(330, .3, .02, 'sfx');
    if (++this.sips >= SIPS.length) { this.step = 'done'; this.done({ tea: this.tea }); this.status(`Một chén ${this.tea} đã cạn. Cảm ơn bạn đã ngồi lại.`); this.toolsFor(); }
  }
  update(dt) {
    this.time += dt;
    if (this.step === 'boil') {
      this.temp = Math.max(20, Math.min(100, this.temp + (this.holding ? 24 : -5) * dt));
      if (this.temp >= 98) { this.step = 'pour'; this.holding = false; this.audio.tone(1200, .5, .02, 'sfx', 'sine', 1.05); this.status('Nước đã sôi. Giữ để rót, buông tay khi trà tới vạch.'); this.toolsFor(); }
      else if (this.holding) this.status(`Nhiệt độ ${Math.round(this.temp)}°C…`);
    }
    if (this.step === 'pour' && this.holding) {
      this.fill += 34 * dt;
      if (this.fill > 100) { this.fill = 0; this.holding = false; this.status('Tràn mất rồi. Lau bàn, rồi rót lại chậm hơn nhé.'); }
    }
    const hot = this.step === 'boil' ? this.temp > 65 : this.step !== 'choose';
    if (hot && Math.random() < dt * 10) this.steam.push({ x: this.step === 'boil' ? 500 : 690, y: this.step === 'boil' ? 250 : 360, age: 0 });
    this.steam = this.steam.filter(s => (s.age += dt) < 2.4);
  }
  render() { drawTea(this.c, this, TEAS[this.tea] || '#c9b06a'); }
  destroy() { window.removeEventListener('keydown', this.keydown); window.removeEventListener('keyup', this.keyup); }
}
