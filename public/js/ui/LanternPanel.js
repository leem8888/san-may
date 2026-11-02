import { LANTERN_STYLES, LIMITS } from '../shared/rules.js';
import { ellipse, polygon } from '../rendering/SpriteRenderer.js';
import { $, el, toast, uuid } from './dom.js';

const NAMES = { lotus: 'Hoa sen', round: 'Đèn tròn', boat: 'Thuyền giấy' };
function preview(style) {
  const canvas = el('canvas', { width: 128, height: 96, 'aria-hidden': 'true' }), c = canvas.getContext('2d');
  c.scale(2, 2); ellipse(c, 32, 34, 26, 7, '#2f6563');
  if (style === 'boat') polygon(c, [[14, 28], [50, 28], [42, 36], [22, 36]], '#c9a26a', '#8a6a46');
  else if (style === 'round') { ellipse(c, 32, 33, 13, 4, '#7d5f40'); ellipse(c, 32, 22, 10, 12, '#f1c27a'); }
  else for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.fillStyle = i % 2 ? '#e9a3b4' : '#f3c0cb'; c.beginPath(); c.ellipse(32 + Math.cos(a) * 9, 28 + Math.sin(a) * 4, 10, 4.5, a, 0, Math.PI * 2); c.fill(); }
  ellipse(c, 32, 22, 2.5, 5, '#ffd27a');
  return canvas;
}

export class LanternPanel {
  constructor({ net, game, audio, panels, celebrate }) {
    Object.assign(this, { net, game, audio, panels, celebrate }); this.style = 'lotus'; this.pending = null; this.dock = null;
    $('#lanternStyles').replaceChildren(...LANTERN_STYLES.map(style => el('button', { type: 'button', role: 'radio', 'aria-checked': String(style === this.style), onclick: event => this.pick(style, event.currentTarget) }, preview(style), NAMES[style])));
    $('#lanternForm').addEventListener('submit', event => { event.preventDefault(); this.release(); });
  }
  pick(style, button) { this.style = style; for (const b of $('#lanternStyles').children) b.setAttribute('aria-checked', String(b === button)); }
  open(dock) { this.dock = dock; this.panels.open('lanternPanel'); $('#lanternText').focus(); }
  async release() {
    const text = $('#lanternText').value.trim().slice(0, LIMITS.lantern);
    if (!text || !this.dock) return;
    if (this.pending?.text !== text || this.pending.style !== this.style) this.pending = { text, style: this.style, clientId: uuid() };
    $('#releaseLantern').disabled = true; $('#lanternStatus').textContent = 'Đang thả…';
    try {
      const res = await this.net.request('lantern:release', { objectId: this.dock.id, ...this.pending });
      this.game.scene.addLantern?.(res.lantern, this.net.clock.now());
      this.pending = null; $('#lanternText').value = ''; $('#lanternStatus').textContent = '';
      this.panels.close(); this.game.player.act('pray'); this.audio.tone(392, 1.6, .05, 'sfx'); toast('Hoa đăng đã trôi ra giữa hồ. Mọi người trong phòng đều nhìn thấy.');
    } catch (error) { $('#lanternStatus').textContent = error.message; }
    finally { $('#releaseLantern').disabled = false; }
  }
}
