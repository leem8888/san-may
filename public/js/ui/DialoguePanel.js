import { $ } from './dom.js';

// Dialogue content comes from a provider so a future AI-backed NPC can replace the JSON one.
export class JsonDialogueProvider {
  constructor(data) { this.data = data; }
  async get(id) { const entry = this.data[id]; if (!entry) throw Error('Chưa có lời thoại.'); return entry; }
}

export class DialoguePanel {
  constructor(provider, game) {
    this.provider = provider; this.game = game; this.entry = null; this.index = 0; this.opener = null;
    this.dialog = $('#dialogue');
    $('#dialogueNext').addEventListener('click', () => this.next());
    $('#dialogueClose').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => { this.game.pauseInput(false); this.opener?.focus?.(); });
  }
  async open(id) {
    this.entry = await this.provider.get(id); this.index = 0; this.opener = document.activeElement;
    $('#dialogueName').textContent = this.entry.name; $('#dialogueTitle').textContent = this.entry.title;
    this.game.pauseInput(true); this.dialog.showModal(); this.show();
  }
  show() {
    const pages = this.entry.pages, last = this.index === pages.length - 1;
    $('#dialogueText').textContent = pages[this.index];
    $('#dialoguePage').textContent = `${this.index + 1} / ${pages.length}`;
    $('#dialogueNext').textContent = last ? 'Hẹn gặp lại' : 'Tiếp tục →';
  }
  next() { if (++this.index >= this.entry.pages.length) this.dialog.close(); else this.show(); }
  get isOpen() { return this.dialog.open; }
}
