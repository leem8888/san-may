import { $ } from './dom.js';

// One side panel at a time; nav buttons mirror state through aria-expanded; Esc closes.
export class Panels {
  constructor() {
    this.current = null; this.handlers = new Map();
    for (const button of document.querySelectorAll('[data-panel]')) button.addEventListener('click', () => this.toggle(button.dataset.panel));
    for (const close of document.querySelectorAll('.panel [data-close]')) close.addEventListener('click', () => this.close());
    $('#menuToggle').addEventListener('click', () => this.menu(!$('#mainNav').classList.contains('open')));
  }
  on(id, onOpen) { this.handlers.set(id, onOpen); }
  menu(open) { $('#mainNav').classList.toggle('open', open); $('#menuToggle').setAttribute('aria-expanded', String(open)); }
  open(id) {
    if (this.current && this.current !== id) this.close();
    const panel = document.getElementById(id);
    panel.hidden = false; this.current = id; this.menu(false);
    for (const button of document.querySelectorAll(`[data-panel="${id}"]`)) button.setAttribute('aria-expanded', 'true');
    this.handlers.get(id)?.();
    (panel.querySelector('[autofocus]') || panel.querySelector('.close'))?.focus({ preventScroll: true });
  }
  close() {
    if (!this.current) return false;
    document.getElementById(this.current).hidden = true;
    for (const button of document.querySelectorAll(`[data-panel="${this.current}"]`)) button.setAttribute('aria-expanded', 'false');
    this.current = null; return true;
  }
  toggle(id) { if (this.current === id) this.close(); else this.open(id); }
}
