import { seeded } from '../../rendering/ground.js';

const ROCKS = [[250, 260, 46], [640, 380, 64], [800, 170, 30]], TINES = [-15, -5, 5, 15], MAX_POINTS = 1600;

// Rake lines in sand by dragging; undo, clear, and save personal patterns to the server.
export class SandGame {
  static title = 'Vẽ vườn cát'; static eyebrow = 'VƯỜN THIỀN'; static hint = 'Kéo chuột hoặc ngón tay để cào cát. Mỗi đường cào là một hơi thở.';
  constructor({ canvas, tools, status, el, api, done }) {
    Object.assign(this, { canvas, status, api, done }); this.c = canvas.getContext('2d'); this.strokes = []; this.current = null; this.patterns = [];
    this.base = document.createElement('canvas'); this.base.width = 1000; this.base.height = 600;
    const b = this.base.getContext('2d'), random = seeded(17);
    b.fillStyle = '#d8ccad'; b.fillRect(0, 0, 1000, 600);
    for (let i = 0; i < 9000; i++) { b.fillStyle = random() < .5 ? 'rgba(255,250,235,.35)' : 'rgba(150,130,95,.18)'; b.fillRect(random() * 1000, random() * 600, 2, 2); }
    this.select = el('select', { 'aria-label': 'Mẫu đã lưu' });
    tools(el('button', { type: 'button', text: 'Hoàn tác', onclick: () => { this.strokes.pop(); this.count(); } }), el('button', { type: 'button', text: 'Xoá hết', onclick: () => { this.strokes = []; this.count(); } }),
      el('button', { type: 'button', text: 'Lưu mẫu', onclick: () => this.save() }), this.select, el('button', { type: 'button', text: 'Mở mẫu', onclick: () => this.load() }), el('button', { type: 'button', text: 'Xoá mẫu', onclick: () => this.remove() }),
      el('button', { type: 'button', class: 'primary', text: 'Xong', onclick: () => this.finish() }));
    this.refresh();
  }
  points() { return this.strokes.reduce((sum, s) => sum + s.length, 0) + (this.current?.length || 0); }
  count() { this.status(`${this.strokes.length} đường cào · ${this.points()}/${MAX_POINTS} điểm`); }
  pointer(type, x, y) {
    const p = [Math.round(Math.max(0, Math.min(1000, x))), Math.round(Math.max(0, Math.min(600, y)))];
    if (type === 'pointerdown') this.current = [p];
    else if (type === 'pointermove' && this.current) { const last = this.current.at(-1); if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 7 && this.points() < MAX_POINTS) this.current.push(p); }
    else if (this.current) { if (this.current.length > 1 && this.strokes.length < 80) this.strokes.push(this.current); this.current = null; this.count(); }
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
  update() {}
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
  async refresh() {
    try { this.patterns = (await this.api.get('/sand-patterns')).patterns; } catch (error) { this.status(error.message); }
    this.select.replaceChildren(...(this.patterns.length ? this.patterns.map(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.name; return o; }) : [Object.assign(document.createElement('option'), { textContent: 'Chưa có mẫu đã lưu', value: '' })]));
  }
  async save() {
    if (!this.strokes.length) return this.status('Hãy cào vài đường trước khi lưu.');
    try { const name = `Vườn ${new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`; const res = await this.api.post('/sand-patterns', { name, strokes: this.strokes }); this.patterns = res.patterns; await this.refresh(); this.select.value = res.id; this.status(`Đã lưu “${name}”.`); }
    catch (error) { this.status(error.message); }
  }
  load() { const p = this.patterns.find(item => item.id === this.select.value); if (!p) return this.status('Chưa chọn mẫu.'); this.strokes = p.strokes.map(s => s.map(pt => [...pt])); this.count(); }
  async remove() {
    if (!this.select.value) return;
    try { this.patterns = (await this.api.delete(`/sand-patterns/${this.select.value}`)).patterns; await this.refresh(); this.status('Đã xoá mẫu.'); } catch (error) { this.status(error.message); }
  }
  finish() { if (this.strokes.length < 3) return this.status('Cào thêm vài đường nữa nhé, không cần vội.'); this.done(); this.status('Một khu vườn cát vừa hoàn thành. Bạn có thể xoá đi và cào lại.'); }
}
