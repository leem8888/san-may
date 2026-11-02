import { $ } from './dom.js';
import { NpcPortrait } from './NpcPortrait.js';

// Dialogue content comes from a provider so a future AI-backed NPC can replace the JSON one.
export class JsonDialogueProvider {
  constructor(data, stories = []) { this.data = data; this.stories = stories; this.lastStory = null; }
  async get(id) {
    const entry = this.data[id];
    if (!entry) throw Error('Chưa có lời thoại.');
    if (!entry.randomStory || !this.stories.length) return entry;
    // Storytellers pick a different sourced story each time (never the same one twice in a row).
    const choices = this.stories.filter(s => s.id !== this.lastStory), story = choices[Math.floor(Math.random() * choices.length)];
    this.lastStory = story.id;
    return { ...entry, pages: [...entry.pages, `“${story.title}”\n\n${story.text}`, `${story.reflect}\n\nNguồn: ${story.source}`, entry.closing].filter(Boolean) };
  }
}

export class DialoguePanel {
  constructor(provider, game) {
    this.provider = provider; this.game = game; this.entry = null; this.index = 0; this.opener = null;
    this.dialog = $('#dialogue');
    this.portrait = new NpcPortrait($('#dialoguePortrait'), $('#dialogueGesture'));
    $('#dialogueNext').addEventListener('click', () => this.next());
    $('#dialogueClose').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => { this.portrait.stop(); this.game.pauseInput(false); this.opener?.focus?.(); });
    window.addEventListener('pagehide', () => this.portrait.stop());
  }
  async open(id) {
    this.entry = await this.provider.get(id); this.index = 0; this.opener = document.activeElement;
    $('#dialogueName').textContent = this.entry.name; $('#dialogueTitle').textContent = this.entry.title;
    this.game.pauseInput(true); this.dialog.showModal(); this.show();
    const speaker = this.game.scene.npcs.find(npc => npc.dialogue === id);
    if (speaker) this.portrait.start(speaker, this.game.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    else this.portrait.stop();
  }
  show() {
    const pages = this.entry.pages, last = this.index === pages.length - 1;
    $('#dialogueText').textContent = pages[this.index];
    $('#dialoguePage').textContent = `${this.index + 1} / ${pages.length}`;
    $('#dialogueNext').textContent = last ? 'Hẹn gặp lại' : 'Tiếp tục →';
    this.portrait.gesture();
  }
  next() { if (++this.index >= this.entry.pages.length) this.dialog.close(); else this.show(); }
  get isOpen() { return this.dialog.open; }
}
