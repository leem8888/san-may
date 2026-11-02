export class InputManager {
  constructor(canvas, camera, joystick, onAction) {
    this.keys = new Set(); this.target = null; this.stick = { x: 0, y: 0 }; this.active = false; this.controller = new AbortController(); this.joystick = joystick;
    const opts = { signal: this.controller.signal };
    window.addEventListener('keydown', e => {
      if (!this.active || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const key = e.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) e.preventDefault();
      // Enter on a focused button keeps its normal click; elsewhere it opens chat, so its default must not
      // follow the focus into the chat box (it would submit the still-empty form straight away).
      if (key === 'enter') { if (e.target.tagName === 'BUTTON') return; e.preventDefault(); }
      this.keys.add(key); if (!e.repeat) onAction(key);
    }, opts);
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()), opts);
    window.addEventListener('blur', () => this.clear(), opts);
    // A tap on an interactive object is handed to onPoint (walk there, then interact); anywhere else is a move target.
    canvas.addEventListener('pointerdown', e => { if (!this.active) return; const point = camera.toWorld(e.clientX, e.clientY); if (!this.onPoint?.(point)) this.target = point; }, opts);
    const update = e => { const r = joystick.getBoundingClientRect(); const dx = (e.clientX - r.left - r.width / 2) / 32, dy = (e.clientY - r.top - r.height / 2) / 32; const len = Math.max(1, Math.hypot(dx, dy)); this.stick = { x: dx / len, y: dy / len }; joystick.firstElementChild.style.transform = `translate(${this.stick.x * 25}px,${this.stick.y * 25}px)`; this.target = null; };
    joystick.addEventListener('pointerdown', e => { if (!this.active) return; joystick.setPointerCapture(e.pointerId); update(e); }, opts);
    joystick.addEventListener('pointermove', e => { if (joystick.hasPointerCapture(e.pointerId)) update(e); }, opts);
    for (const name of ['pointerup','pointercancel','lostpointercapture']) joystick.addEventListener(name, () => { this.stick = { x: 0, y: 0 }; joystick.firstElementChild.style.transform = ''; }, opts);
  }
  clear() { this.keys.clear(); this.target = null; this.stick = { x: 0, y: 0 }; this.joystick.firstElementChild.style.transform = ''; }
  vector(player) {
    if (!this.active) return { x: 0, y: 0 };
    const k = this.keys; let x = Number(k.has('d') || k.has('arrowright')) - Number(k.has('a') || k.has('arrowleft')) + this.stick.x;
    let y = Number(k.has('s') || k.has('arrowdown')) - Number(k.has('w') || k.has('arrowup')) + this.stick.y;
    if (x || y) this.target = null;
    else if (this.target) { x = this.target.x - player.x; y = this.target.y - player.y; const len = Math.hypot(x, y); if (len < 5) { this.target = null; return { x: 0, y: 0 }; } x /= len; y /= len; }
    return { x, y };
  }
  destroy() { this.controller.abort(); }
}
