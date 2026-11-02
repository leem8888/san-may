import { $, el, toast } from '../dom.js';

// Full-screen overlay for mini-games. The world loop is suspended while one is open, so only one RAF loop runs.
export class MinigameHost {
  constructor({ game, net, api, audio }) {
    Object.assign(this, { game, net, api, audio }); this.active = null; this.raf = 0; this.last = 0; this.object = null;
    this.canvas = $('#minigameCanvas');
    $('#minigameClose').onclick = () => this.close();
    window.addEventListener('keydown', event => { if (event.key === 'Escape' && this.active) this.close(); });
    // Pointer coordinates are mapped into the canvas' fixed logical size (1000×600).
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) this.canvas.addEventListener(type, event => {
      if (!this.active) return;
      const r = this.canvas.getBoundingClientRect(), x = (event.clientX - r.left) / r.width * this.canvas.width, y = (event.clientY - r.top) / r.height * this.canvas.height;
      if (type === 'pointerdown') this.canvas.setPointerCapture(event.pointerId);
      this.active.pointer?.(type, x, y, event);
    });
  }
  get open() { return Boolean(this.active); }
  start(GameClass, object) {
    if (this.active) return;
    this.object = object; this.game.suspend(true);
    $('#minigameTitle').textContent = GameClass.title; $('#minigameEyebrow').textContent = GameClass.eyebrow; $('#minigameStatus').textContent = GameClass.hint || '';
    $('#minigameTools').replaceChildren(); $('#minigame').hidden = false;
    this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);
    const tools = (...nodes) => $('#minigameTools').replaceChildren(...nodes);
    const status = text => { $('#minigameStatus').textContent = text; };
    this.active = new GameClass({ canvas: this.canvas, tools, status, el, api: this.api, audio: this.audio, done: data => this.complete(data) });
    this.last = performance.now();
    const frame = now => { if (!this.active) return; const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; this.active.update(dt); this.active.render(); this.raf = requestAnimationFrame(frame); };
    this.raf = requestAnimationFrame(frame);
  }
  async complete(data = {}) {
    try { const res = await this.net.request('activity:complete', { objectId: this.object.id, ...data }); this.audio.tone(660, .8, .05, 'sfx'); if (!res.repeated) toast('Đã ghi lại vào nhật ký của bạn.'); }
    catch (error) { toast(error.message); }
  }
  close() {
    if (!this.active) return;
    cancelAnimationFrame(this.raf); this.active.destroy?.(); this.active = null;
    $('#minigame').hidden = true; this.game.suspend(false);
  }
}
