import { ITEMS, APPEARANCE_KEYS, normalizeAppearance } from '../shared/rules.js';
import { SpriteRenderer } from '../rendering/SpriteRenderer.js';
import { $, el } from './dom.js';

const TITLES = { hairStyle: 'Kiểu tóc', hairColor: 'Màu tóc', outfitStyle: 'Trang phục', outfitColor: 'Màu áo', accessory: 'Phụ kiện' };
const COLOR_KINDS = new Set(['hairColor', 'outfitColor']);

// Character creation on the intro card. Locked items are shown (so players know they exist) but disabled.
export class CharacterCreator {
  constructor() { this.sprites = new SpriteRenderer(40); this.look = null; this.owned = new Set(); this.frame = 0; this.raf = 0; }
  setup(appearance, owned) {
    this.owned = new Set(owned); this.look = normalizeAppearance(appearance, this.owned);
    const rows = APPEARANCE_KEYS.map(kind => {
      const options = Object.entries(ITEMS).filter(([, item]) => item.kind === kind).map(([id, item]) => {
        const locked = !item.default && !this.owned.has(id);
        const button = el('button', { type: 'button', class: `${COLOR_KINDS.has(kind) ? 'swatch' : 'chip'}${locked ? ' locked' : ''}`, 'aria-pressed': String(this.look[kind] === item.value), disabled: locked, title: locked ? `${item.name} · nhận từ nhiệm vụ/thành tựu` : item.name, 'aria-label': item.name, text: COLOR_KINDS.has(kind) ? '' : item.name, onclick: () => this.pick(kind, item.value) });
        if (COLOR_KINDS.has(kind)) button.style.background = item.value;
        return button;
      });
      return el('div', { class: 'look-row', role: 'group', 'aria-label': TITLES[kind] }, el('span', { text: TITLES[kind] }), options);
    });
    $('#lookOptions').replaceChildren(...rows);
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
      const state = states[Math.floor(now / 2600) % states.length];
      c.clearRect(0, 0, canvas.width, canvas.height); c.save(); c.scale(1.6, 1.6);
      this.sprites.draw(c, { x: 40, y: 92, state, direction: 'down', elapsed: (now / 1000) % 1.3, appearance: this.look });
      c.restore(); this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
}
