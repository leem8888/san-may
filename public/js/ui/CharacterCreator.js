import { ITEMS, APPEARANCE_KEYS, normalizeAppearance } from '../shared/rules.js';
import { drawCharacter } from '../rendering/CharacterArt.js';
import { $, el } from './dom.js';

const TITLES = { hairStyle: 'Kiểu tóc', hairColor: 'Màu tóc', outfitStyle: 'Trang phục', outfitColor: 'Màu áo', accessory: 'Phụ kiện' };
const COLOR_KINDS = new Set(['hairColor', 'outfitColor']);

// Character creation on the intro card. Locked items are shown (so players know they exist) but disabled.
export class CharacterCreator {
  constructor() { this.look = null; this.owned = new Set(); this.frame = 0; this.raf = 0; }
  setup(appearance, owned) {
    this.owned = new Set(owned); this.look = normalizeAppearance(appearance, this.owned);
    this.gender = appearance?.gender || 'male';
    if (appearance?.shaved) this.look.hairStyle = 'shaved';
    this.look.gender = this.gender;
    this.look.shaved = Boolean(appearance?.shaved);
    $('#creatorOptions').open = !window.matchMedia('(max-width: 760px)').matches;
    const genders = el('div', { class: 'look-row', role: 'group', 'aria-label': 'Giới tính' }, el('span', { text: 'Nhân vật' }), ['male', 'female'].map(value => el('button', {
      type: 'button', class: 'chip', text: value === 'male' ? 'Nam' : 'Nữ',
      'aria-pressed': String(this.gender === value), disabled: Boolean(appearance?.gender),
      onclick: () => { this.gender = value; this.look.gender = value; this.pick('hairStyle', value === 'female' ? 'bun' : 'short'); this.pick('outfitColor', value === 'female' ? '#77799e' : '#d9a36c'); for (const button of $('#lookOptions').querySelectorAll('[aria-label="Giới tính"] button')) button.setAttribute('aria-pressed', String(button.textContent === (value === 'male' ? 'Nam' : 'Nữ'))); },
    })));
    const rows = APPEARANCE_KEYS.filter(kind => !(appearance?.shaved && kind === 'hairStyle')).map(kind => {
      const options = Object.entries(ITEMS).filter(([id, item]) => item.kind === kind && item.value !== 'shaved' && (kind !== 'outfitColor' || item.palette || item.value === this.look.outfitColor || (!item.default && this.owned.has(id)))).map(([id, item]) => {
        const locked = !item.default && !this.owned.has(id);
        const button = el('button', { type: 'button', class: `${COLOR_KINDS.has(kind) ? 'swatch' : 'chip'}${locked ? ' locked' : ''}`, 'aria-pressed': String(this.look[kind] === item.value), disabled: locked, title: locked ? `${item.name} · nhận từ nhiệm vụ/thành tựu` : item.name, 'aria-label': item.name, text: COLOR_KINDS.has(kind) ? '' : item.name, onclick: () => this.pick(kind, item.value) });
        if (COLOR_KINDS.has(kind)) button.style.background = item.value;
        return button;
      });
      return el('div', { class: 'look-row', role: 'group', 'aria-label': TITLES[kind] }, el('span', { text: TITLES[kind] }), options);
    });
    $('#lookOptions').replaceChildren(genders, ...rows);
    this.start();
  }
  pick(kind, value) {
    this.look[kind] = value;
    for (const button of $('#lookOptions').querySelectorAll(`[aria-label="${TITLES[kind]}"] button`)) button.setAttribute('aria-pressed', String(button.getAttribute('aria-label') === Object.values(ITEMS).find(i => i.kind === kind && i.value === value).name));
  }
  // A tiny preview loop that only lives while the intro card is visible.
  start() {
    if (this.raf) return;
    const canvas = $('#preview'), c = canvas.getContext('2d'), states = ['idle', 'wave', 'idle', 'pray'];
    const tick = now => {
      if (now - this.frame < 50) { this.raf = requestAnimationFrame(tick); return; }
      this.frame = now;
      const state = states[Math.floor(now / 2600) % states.length];
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const width = Math.round(canvas.clientWidth * pixelRatio), height = Math.round(canvas.clientHeight * pixelRatio);
      if (!width || !height) { this.raf = requestAnimationFrame(tick); return; }
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      c.setTransform(width / 168, 0, 0, height / 208, 0, 0);
      c.clearRect(0, 0, 168, 208);
      c.save();
      c.translate(84, 188); c.scale(2.3, 2.3); c.translate(-32, -80);
      drawCharacter(c, state, Math.floor(now / 150) % 8, 'down', { ...this.look, characterStyle: 'youngPlayer' });
      c.restore(); this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}
