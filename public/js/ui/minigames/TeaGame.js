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
  render() {
    const c = this.c, color = TEAS[this.tea] || '#c9b06a';
    c.fillStyle = '#3a2a1e'; c.fillRect(0, 0, 1000, 600);
    c.fillStyle = '#6b4a33'; c.beginPath(); c.roundRect(80, 380, 840, 160, 30); c.fill(); c.fillStyle = '#7f5638'; c.beginPath(); c.roundRect(60, 360, 880, 40, 20); c.fill();
    // Brazier and kettle.
    c.fillStyle = '#4a4a44'; c.beginPath(); c.roundRect(430, 300, 140, 64, 10); c.fill();
    c.fillStyle = `rgba(255,${120 + this.temp},60,${this.step === 'boil' && this.holding ? .9 : .35})`; c.beginPath(); c.ellipse(500, 318, 46, 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#2f3a36'; c.beginPath(); c.ellipse(500, 270, 60, 42, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2f3a36'; c.lineWidth = 10; c.beginPath(); c.moveTo(552, 262); c.lineTo(600, 228); c.stroke();
    // Teapot tilts while pouring.
    const tilt = this.step === 'pour' && this.holding ? -.55 : 0;
    c.save(); c.translate(300, 330); c.rotate(tilt); c.fillStyle = '#6e8a7b'; c.beginPath(); c.ellipse(0, 0, 66, 46, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(-14, -58, 28, 14); c.strokeStyle = '#6e8a7b'; c.lineWidth = 12; c.beginPath(); c.moveTo(56, -8); c.lineTo(104, -36); c.stroke(); c.lineWidth = 8; c.beginPath(); c.arc(-70, 0, 26, Math.PI * .5, Math.PI * 1.5); c.stroke(); c.restore();
    if (this.step === 'pour' && this.holding) { c.strokeStyle = color; c.lineWidth = 6; c.beginPath(); c.moveTo(392, 262); c.quadraticCurveTo(560, 250, 690, 350); c.stroke(); }
    // Cup with fill line.
    c.fillStyle = '#e9e1cf'; c.beginPath(); c.moveTo(630, 300); c.lineTo(750, 300); c.lineTo(730, 372); c.quadraticCurveTo(690, 390, 650, 372); c.closePath(); c.fill();
    const level = 372 - Math.min(100, this.fill) / 100 * 68;
    c.save(); c.beginPath(); c.moveTo(630, 300); c.lineTo(750, 300); c.lineTo(730, 372); c.quadraticCurveTo(690, 390, 650, 372); c.closePath(); c.clip(); c.fillStyle = color; c.fillRect(620, level, 140, 120); c.restore();
    c.setLineDash([5, 5]); c.strokeStyle = '#b8604c'; c.lineWidth = 2; for (const f of [70, 92]) { const y = 372 - f / 100 * 68; c.beginPath(); c.moveTo(620, y); c.lineTo(760, y); c.stroke(); } c.setLineDash([]);
    for (const s of this.steam) { c.fillStyle = `rgba(240,240,232,${.35 * (1 - s.age / 2.4)})`; c.beginPath(); c.arc(s.x + Math.sin(s.age * 3 + s.x) * 10, s.y - s.age * 60, 6 + s.age * 8, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#f2ebd8'; c.font = '20px "Palatino Linotype", Georgia, serif'; c.textAlign = 'left';
    c.fillText(this.tea ? `Ấm ${this.tea}` : 'Chọn trà', 90, 70);
    if (this.step === 'boil') { c.fillStyle = '#ffffff22'; c.fillRect(90, 90, 300, 10); c.fillStyle = '#e7a35a'; c.fillRect(90, 90, this.temp / 100 * 300, 10); }
  }
  destroy() { window.removeEventListener('keydown', this.keydown); window.removeEventListener('keyup', this.keyup); }
}
