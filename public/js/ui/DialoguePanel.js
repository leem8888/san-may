import { $, el, toast } from './dom.js';
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

const MOODS = { happy: 'Mỉm cười rạng rỡ', proud: 'Hãnh diện ưỡn ngực', worried: 'Hơi lo lắng', sleepy: 'Ngáp khẽ một cái', calm: 'Bình thản lắng nghe', shy: 'Ngượng ngùng gãi đầu', warm: 'Ánh mắt hiền hậu', tired: 'Lau mồ hôi trán', smile: 'Khẽ mỉm cười', sad: 'Trầm ngâm một lúc', surprised: 'Tròn mắt ngạc nhiên' };
const TYPE_MS = 22;

// Two kinds of conversation share one dialog: JSON pages (signs, storytellers) and server-driven conversations
// with branching choices, memory and story progress (`openServer`).
export class DialoguePanel {
  constructor(provider, game) {
    this.provider = provider; this.game = game; this.entry = null; this.index = 0; this.opener = null; this.net = null; this.onStory = () => {};
    this.dialog = $('#dialogue'); this.server = null;
    this.portrait = new NpcPortrait($('#dialoguePortrait'), $('#dialogueGesture'));
    $('#dialogueNext').addEventListener('click', () => this.next());
    $('#dialogueText').addEventListener('click', () => this.finishTyping());
    $('#dialogueClose').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('keydown', event => {
      if ((event.key === ' ' || event.key === 'Enter') && this.typing) { event.preventDefault(); this.finishTyping(); }
      const choice = /^[1-9]$/.test(event.key) && $('#dialogueChoices').children[Number(event.key) - 1];
      if (choice && !this.typing) { event.preventDefault(); choice.click(); }
    });
    this.dialog.addEventListener('close', () => {
      this.stopTyping(); this.portrait.stop(); this.game.pauseInput(false); this.opener?.focus?.();
      if (this.server) { this.net?.request('dialogue:end').catch(() => {}); this.server = null; this.game.talkingTo = null; }
    });
    window.addEventListener('pagehide', () => this.portrait.stop());
  }
  get reduced() { return this.game.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  begin(name, title, speaker) {
    this.opener = document.activeElement;
    $('#dialogueName').textContent = name; $('#dialogueTitle').textContent = title;
    this.game.pauseInput(true); if (!this.dialog.open) this.dialog.showModal();
    if (speaker) this.portrait.start(speaker, this.reduced); else this.portrait.stop();
  }
  async open(id) {
    this.entry = await this.provider.get(id); this.index = 0; this.server = null;
    this.begin(this.entry.name, this.entry.title, this.game.scene.npcs.find(npc => npc.dialogue === id));
    $('#dialogueChoices').replaceChildren(); this.show();
  }
  show() {
    const pages = this.entry.pages, last = this.index === pages.length - 1;
    this.type(pages[this.index]);
    $('#dialoguePage').textContent = `${this.index + 1} / ${pages.length}`;
    $('#dialogueNext').hidden = false; $('#dialogueNext').textContent = last ? 'Hẹn gặp lại' : 'Tiếp tục →';
    this.portrait.gesture();
  }
  // ── Server-driven conversation ─────────────────────────────────────────────────────────────────────────
  async openServer(npc) {
    try {
      const res = await this.net.request('dialogue:start', { npcId: npc.id });
      this.server = { npc, view: null, line: 0 }; this.game.talkingTo = npc.id;
      this.begin(res.view.name, res.view.title, res.view.object ? null : npc);
      this.render(res.view); this.onStory(res.story);
    } catch (error) { toast(error.message); }
  }
  render(view) {
    this.server.view = view; this.server.line = 0;
    $('#dialogueTitle').textContent = view.title || $('#dialogueTitle').textContent;
    this.portrait.moodText = MOODS[view.mood] || ''; if (this.portrait.moodText) this.portrait.caption.textContent = this.portrait.moodText;
    this.showLine();
  }
  showLine() {
    const { view, line } = this.server, last = line === view.lines.length - 1;
    $('#dialogueChoices').replaceChildren();
    $('#dialoguePage').textContent = view.lines.length > 1 ? `${line + 1} / ${view.lines.length}` : '';
    this.type(view.lines[line], () => {
      if (!last) { $('#dialogueNext').hidden = false; $('#dialogueNext').textContent = 'Tiếp tục →'; return; }
      if (view.input) {
        // A written answer: stays private (journal note), so the box says so.
        $('#dialogueNext').hidden = true;
        const text = el('textarea', { class: 'dialogue-input', rows: 4, maxlength: view.input.max, placeholder: view.input.placeholder, 'aria-label': 'Lời bạn viết' });
        const send = el('button', { type: 'button', class: 'primary', onclick: () => this.submit(text.value, send) }, 'Viết xong');
        text.addEventListener('keydown', event => event.stopPropagation());
        $('#dialogueChoices').replaceChildren(text, el('small', { text: 'Chỉ mình bạn đọc được — lưu trong nhật ký riêng.' }), send);
        text.focus({ preventScroll: true });
      } else if (view.choices.length) {
        $('#dialogueNext').hidden = true;
        $('#dialogueChoices').replaceChildren(...view.choices.map((c, i) => el('button', { type: 'button', class: 'choice', onclick: () => this.choose(c.id) }, el('span', { text: String(i + 1) }), c.text)));
        $('#dialogueChoices').firstElementChild?.focus({ preventScroll: true });
      } else { $('#dialogueNext').hidden = false; $('#dialogueNext').textContent = view.end ? 'Tạm biệt' : 'Tiếp tục →'; }
    });
  }
  async choose(choiceId) {
    for (const b of $('#dialogueChoices').children) b.disabled = true;
    try {
      const res = await this.net.request('dialogue:choose', { choiceId });
      this.onStory(res.story);
      if (res.view.end && !res.view.lines) return this.dialog.close();
      this.render(res.view);
    } catch (error) { toast(error.message); this.dialog.close(); }
  }
  async submit(text, button) {
    if (!text.trim()) return toast('Hãy viết đôi dòng trước đã.');
    button.disabled = true;
    try { const res = await this.net.request('dialogue:submit', { text }); this.onStory(res.story); if (res.view.end && !res.view.lines) return this.dialog.close(); this.render(res.view); }
    catch (error) { toast(error.message); button.disabled = false; }
  }
  async advanceServer() {
    const { view, line } = this.server;
    if (line < view.lines.length - 1) { this.server.line++; return this.showLine(); }
    if (view.end) return this.dialog.close();
    try { const res = await this.net.request('dialogue:next'); this.onStory(res.story); this.render(res.view); }
    catch (error) { toast(error.message); this.dialog.close(); }
  }
  // ── Typewriter (skippable; instant with reduced motion) ────────────────────────────────────────────────
  type(text, done = () => {}) {
    this.stopTyping(); const target = $('#dialogueText');
    if (this.reduced) { target.textContent = text; return done(); }
    let shown = 0; this.typing = { text, done };
    target.textContent = '';
    this.typing.timer = setInterval(() => { shown += 2; target.textContent = text.slice(0, shown); if (shown >= text.length) this.finishTyping(); }, TYPE_MS);
  }
  finishTyping() { if (!this.typing) return; const { text, done } = this.typing; this.stopTyping(); $('#dialogueText').textContent = text; done(); }
  stopTyping() { if (this.typing) clearInterval(this.typing.timer); this.typing = null; }
  next() {
    if (this.typing) return this.finishTyping();
    if (this.server) return this.advanceServer();
    if (++this.index >= this.entry.pages.length) this.dialog.close(); else this.show();
  }
  get isOpen() { return this.dialog.open; }
}
