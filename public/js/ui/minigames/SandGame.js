import { SandSurface } from '../../rendering/SandSurface.js';

const MAX_POINTS = 1600;

// Rake lines in sand by dragging; undo, clear, and save personal patterns to the server.
export class SandGame extends SandSurface {
  static title = 'Vẽ vườn cát'; static eyebrow = 'VƯỜN THIỀN'; static hint = 'Kéo để cào cát. Bấm Xong để đưa bản vẽ ra vườn cát chung của phòng. Lưu mẫu để giữ một bản riêng.';
  constructor({ canvas, tools, status, el, api, done, applySand, initialSand }) {
    super(canvas); this.applySand = applySand;
    if (initialSand) this.strokes = initialSand.map(s => s.map(p => [...p]));
    Object.assign(this, { canvas, status, api, done }); this.patterns = [];
    this.select = el('select', { 'aria-label': 'Mẫu đã lưu' });
    this.finishButton = el('button', { type: 'button', class: 'primary', text: 'Xong · áp dụng ra vườn', onclick: () => this.finish() });
    tools(el('button', { type: 'button', text: 'Hoàn tác', onclick: () => { if (!this.applying) { this.strokes.pop(); this.count(); } } }), el('button', { type: 'button', text: 'Xoá hết', onclick: () => { if (!this.applying) { this.strokes = []; this.count(); } } }),
      el('button', { type: 'button', text: 'Lưu mẫu', onclick: () => this.save() }), this.select, el('button', { type: 'button', text: 'Mở mẫu', onclick: () => this.load() }), el('button', { type: 'button', text: 'Xoá mẫu', onclick: () => this.remove() }),
      this.finishButton);
    this.refresh();
  }
  update() {}
  points() { return this.strokes.reduce((sum, s) => sum + s.length, 0) + (this.current?.length || 0); }
  count() { this.status(`${this.strokes.length} đường cào · ${this.points()}/${MAX_POINTS} điểm`); }
  pointer(type, x, y) {
    if (this.applying) return;
    const p = [Math.round(Math.max(0, Math.min(1000, x))), Math.round(Math.max(0, Math.min(600, y)))];
    if (type === 'pointerdown') this.current = [p];
    else if (type === 'pointermove' && this.current) { const last = this.current.at(-1); if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 7 && this.points() < MAX_POINTS) this.current.push(p); }
    else if (this.current) { if (this.current.length > 1 && this.strokes.length < 80) this.strokes.push(this.current); this.current = null; this.count(); }
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
  async finish() {
    if (this.applying) return;
    if (this.current?.length > 1) this.pointer('pointerup', 0, 0);
    this.applying = true;
    this.finishButton.disabled = true;
    this.finishButton.textContent = 'Đang cập nhật vườn cát…';
    this.status('Đang gửi bản vẽ ra vườn cát, chờ một chút nhé…');
    try {
      const strokes = this.strokes.map(stroke => stroke.map(point => [...point]));
      await this.applySand(strokes);
      this.status('Đã đưa bản vẽ ra vườn cát. Mọi người trong phòng đều nhìn thấy.');
      await this.done();
    } catch (error) {
      this.status(error.code === 'SOCKET_TIMEOUT'
        ? 'Server chưa phản hồi chức năng vườn cát mới. Hãy khởi động lại cửa sổ chạy npm start rồi bấm Xong lần nữa. Bản vẽ vẫn đang được giữ tại đây.'
        : `Chưa áp dụng được: ${error.message}. Bản vẽ vẫn được giữ, bạn có thể thử lại.`);
    }
    finally { this.applying = false; this.finishButton.disabled = false; this.finishButton.textContent = 'Xong · áp dụng ra vườn'; }
  }
}
