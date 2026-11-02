import { $, el, store, timeAgo, toast } from './dom.js';
import { ROUND } from '../shared/rules.js';
import { passages } from '../shared/reading.js';

// Main Hall practice (P2-8). Nothing here is a race: no scores, no leaderboards, and every count is decided by the
// server after a full, unhurried animation.

// ── Bowing sessions: 9 / 27 / 54 / 108, bowing at a natural rhythm until paused, ended or complete. ──
export class BowSession {
  constructor({ net, game, panels, audio }) {
    Object.assign(this, { net, game, panels, audio }); this.session = null; this.timer = 0;
    $('#bowTargets').replaceChildren(...[9, 27, 54, 108].map(n => el('button', { type: 'button', text: `${n} lạy`, onclick: () => this.start(n) })));
    $('#practicePause').onclick = () => this.set(this.session?.status === 'paused' ? 'resume' : 'pause');
    $('#practiceEnd').onclick = () => this.set('end');
    $('#practiceFocus').onclick = () => this.focus(!document.body.classList.contains('focus'));
  }
  open() { this.panels.open('bowPanel'); $('#bowCurrent').textContent = this.session ? `Đang có phiên ${this.session.target} lạy (${this.session.done}/${this.session.target}).` : ''; }
  async start(target) {
    try { const res = await this.net.request('practice:session', { action: 'start', type: 'bow', target }); this.panels.close(); this.show(res.session); toast('Đứng yên, chắp tay. Phiên lạy bắt đầu.'); }
    catch (error) { toast(error.message); }
  }
  async set(action) {
    try {
      const res = await this.net.request('practice:session', { action, type: 'bow' });
      this.show(action === 'end' ? null : res.session);
      if (action === 'end') toast(res.session.done ? `Đã lạy ${res.session.done} lần. Dừng lại khi thấy đủ cũng là trọn vẹn.` : 'Đã kết thúc phiên lạy.');
    } catch (error) { toast(error.message); }
  }
  show(session) {
    this.session = session && ['active', 'paused'].includes(session.status) ? session : null;
    const card = $('#practiceCard');
    card.hidden = !this.session;
    if (!this.session) { this.focus(false); clearTimeout(this.timer); return; }
    $('#practiceTitle').textContent = `Phiên ${this.session.target} lạy`;
    $('#practiceCount').textContent = `${this.session.done} / ${this.session.target}`;
    $('#practiceBar').style.width = `${Math.round(this.session.done / this.session.target * 100)}%`;
    $('#practicePause').textContent = this.session.status === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
    this.schedule(1200);
  }
  // The next bow follows after a short pause, only while active, idle and not moving.
  schedule(delay) {
    clearTimeout(this.timer);
    if (this.session?.status !== 'active') return;
    this.timer = setTimeout(() => {
      if (this.session?.status !== 'active') return;
      if (this.game.player.state === 'idle') this.game.player.act('bow');
      else if (this.game.player.state !== 'bow') this.schedule(1500);
    }, delay);
  }
  // Called after the server has counted (or refused) a bow.
  counted(session) {
    if (!session) return this.schedule(1500);
    if (session.status === 'completed') {
      this.show(null); this.audio.bigBell();
      return toast(`Trọn phiên ${session.target} lạy. Đứng dậy chậm rãi, thở một hơi dài.`, 6000);
    }
    this.show(session);
  }
  focus(on) {
    document.body.classList.toggle('focus', on);
    $('#practiceFocus').textContent = on ? 'Hiện giao diện' : 'Chế độ tập trung';
  }
}

// ── 108 beads: a ring you move one bead at a time (Space / Enter / click / tap). ──
export class BeadRing {
  constructor({ game, panels, audio, getProgress }) {
    Object.assign(this, { game, panels, audio, getProgress });
    this.canvas = $('#beadCanvas'); this.shown = 0; this.anim = 0;
    const advance = () => this.advance();
    this.canvas.addEventListener('click', advance);
    $('#beadNext').onclick = advance;
    $('#beadPanel').addEventListener('keydown', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); advance(); } });
    panels.on?.('beadPanel', () => this.draw());
  }
  open() { this.panels.open('beadPanel'); this.shown = this.count(); this.draw(); $('#beadNext').focus({ preventScroll: true }); }
  count() { return this.getProgress()?.beadsRound ?? 0; }
  advance() {
    if (this.count() >= ROUND) return toast('Đã tròn 108 hạt. Chọn “Vòng mới” để lần tiếp.');
    // One bead per gesture: the next one waits until this bead's motion has finished.
    if (this.game.player.state === 'bead') return;
    if (!this.game.player.act('bead')) return toast('Hãy đứng yên rồi lần hạt.');
    this.audio.tone(820 + (this.count() % 9) * 6, .12, .018, 'ui', 'sine');
    this.from = this.count(); this.anim = performance.now(); this.loop();
  }
  // After the server confirmed a bead.
  update(progress) {
    if (this.panels.current !== 'beadPanel') return;
    if (progress.beadsRound === ROUND) { this.audio.bell(); $('#beadStatus').textContent = 'Tròn một chuỗi 108 hạt. Thở chậm một hơi.'; }
    this.draw();
  }
  loop() { this.draw(); if (performance.now() - this.anim < 400) requestAnimationFrame(() => this.loop()); }
  draw() {
    const c = this.canvas.getContext('2d'), size = this.canvas.width, r = size * .4, cx = size / 2, cy = size / 2 - 6, n = this.count();
    const k = Math.min(1, (performance.now() - this.anim) / 400), moving = k < 1 && this.from !== undefined;
    c.clearRect(0, 0, size, size);
    c.strokeStyle = '#8a6a46'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < ROUND; i++) {
      // The current bead sits at the top; the ring turns by one bead per count (eased).
      const offset = moving ? this.from + k : n, a = -Math.PI / 2 + (i - offset) / ROUND * Math.PI * 2;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, current = i === n % ROUND, done = i < n;
      c.fillStyle = current ? '#f2c879' : done ? '#a37a46' : '#6b4c33';
      c.beginPath(); c.arc(x, y, current ? 6.5 : 3.6, 0, Math.PI * 2); c.fill();
      if (current) { c.strokeStyle = '#ffe9b0'; c.lineWidth = 1.5; c.stroke(); }
    }
    // Guru bead and tassel at the bottom of the ring.
    c.fillStyle = '#b5523e'; c.beginPath(); c.arc(cx, cy + r + 12, 8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#b5523e'; c.lineWidth = 2; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(cx, cy + r + 18); c.lineTo(cx + i * 3, cy + r + 34); c.stroke(); }
    c.fillStyle = '#efe3c5'; c.font = '600 22px system-ui'; c.textAlign = 'center'; c.fillText(`${n}`, cx, cy + 4);
    c.font = '11px system-ui'; c.fillStyle = '#cfc3a3'; c.fillText('trên 108 hạt', cx, cy + 22);
    $('#beadStatus').textContent ||= 'Mỗi lần chạm, phím cách hoặc Enter: một hạt.';
  }
}

// ── Reading: a list of sourced texts, a calm reader, saved position, bookmarks and a small glossary. ──
export class ReadingPanel {
  constructor({ api, panels, audio, glossary, items, note, onShared }) {
    Object.assign(this, { api, panels, audio, glossary, items, note, onShared }); this.marks = {}; this.item = null; this.index = 0; this.scroll = 0;
    this.size = Number(store.get('sanmay-reading-size', '17')); this.speed = Number(store.get('sanmay-reading-speed', '0'));
    $('#readingBack').onclick = () => this.list();
    $('#readingPrev').onclick = () => this.go(this.index - 1);
    $('#readingNext').onclick = () => this.go(this.index + 1);
    $('#readingMark').onclick = () => this.toggleMark();
    $('#readingSize').oninput = event => { this.size = Number(event.target.value); store.set('sanmay-reading-size', this.size); this.render(); };
    $('#readingSpeed').onchange = event => { this.speed = Number(event.target.value); store.set('sanmay-reading-speed', this.speed); this.auto(); };
    $('#readingMode').onchange = () => this.render();
    $('#readingSize').value = this.size; $('#readingSpeed').value = this.speed;
    $('#readingPanel').addEventListener('keydown', event => { if (!this.item) return; if (event.key === 'ArrowRight') this.go(this.index + 1); if (event.key === 'ArrowLeft') this.go(this.index - 1); });
    panels.on?.('readingPanel', () => {});
  }
  async open() {
    this.panels.open('readingPanel');
    try { const { marks } = await this.api.get('/reading'); this.marks = Object.fromEntries(marks.map(m => [m.itemId, m])); } catch { /* offline: start from the top */ }
    this.list();
  }
  list() {
    clearInterval(this.autoTimer); this.item = null;
    $('#readingList').hidden = false; $('#readingView').hidden = true;
    $('#readingNote').textContent = this.note;
    $('#readingItems').replaceChildren(...this.items.map(item => {
      const mark = this.marks[item.id], total = passages(item).length;
      return el('div', { class: 'reading-item' },
        el('button', { type: 'button', class: 'link-card', onclick: () => this.read(item) }, el('span', { class: 'eyebrow', text: item.kind }), el('strong', { text: item.title }),
          el('small', { text: mark ? `Đang đọc tới đoạn ${mark.position + 1}/${total}${mark.bookmarks.length ? ` · ${mark.bookmarks.length} dấu trang` : ''}` : `${total} đoạn` })),
        this.onShared ? el('button', { type: 'button', class: 'link', text: 'Mời bạn cùng đọc', onclick: () => this.onShared(item) }) : null);
    }));
  }
  read(item) {
    this.item = item; this.index = this.marks[item.id]?.position || 0;
    $('#readingList').hidden = true; $('#readingView').hidden = false;
    $('#readingTitle').textContent = item.title; $('#readingSource').textContent = `Nguồn: ${item.source}`;
    this.render(); this.auto();
  }
  render() {
    if (!this.item) return;
    const parts = passages(this.item), mark = this.marks[this.item.id], single = $('#readingMode').checked;
    $('#readingText').style.fontSize = `${this.size}px`;
    $('#readingText').replaceChildren(...parts.map((text, i) => el('p', { class: `${i === this.index ? 'current' : ''}${mark?.bookmarks.includes(i) ? ' marked' : ''}`, hidden: single && i !== this.index, text, onclick: () => this.go(i) })));
    $('#readingPos').textContent = `Đoạn ${this.index + 1}/${parts.length}`;
    $('#readingMark').textContent = mark?.bookmarks.includes(this.index) ? 'Bỏ dấu trang' : 'Đánh dấu đoạn này';
    $('#readingPrev').disabled = this.index === 0; $('#readingNext').disabled = this.index === parts.length - 1;
    const words = Object.keys(this.glossary).filter(term => parts.join(' ').toLowerCase().includes(term.toLowerCase()) || this.item.source.toLowerCase().includes(term.toLowerCase()));
    $('#readingGlossary').replaceChildren(...words.map(term => el('div', {}, el('dt', { text: term }), el('dd', { text: this.glossary[term] }))));
    $('#readingGlossaryBox').hidden = !words.length;
    // Keep the current passage in view by scrolling only the text box, never the whole panel.
    const box = $('#readingText'), current = box.querySelector('.current');
    if (current) box.scrollTo({ top: current.offsetTop - box.offsetTop - box.clientHeight / 2 + current.clientHeight / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  go(i) {
    const total = passages(this.item).length;
    if (i < 0 || i >= total) return;
    this.index = i; this.render(); this.save();
  }
  // Optional slow auto-advance (seconds per passage); 0 = off.
  auto() { clearInterval(this.autoTimer); if (this.item && this.speed > 0) this.autoTimer = setInterval(() => { if (this.panels.current !== 'readingPanel') return clearInterval(this.autoTimer); if (this.index < passages(this.item).length - 1) this.go(this.index + 1); else clearInterval(this.autoTimer); }, this.speed * 1000); }
  toggleMark() {
    const mark = this.marks[this.item.id] ||= { itemId: this.item.id, position: this.index, bookmarks: [] };
    mark.bookmarks = mark.bookmarks.includes(this.index) ? mark.bookmarks.filter(b => b !== this.index) : [...mark.bookmarks, this.index].sort((a, b) => a - b);
    this.render(); this.save(true);
  }
  async save(now = false) {
    const mark = this.marks[this.item.id] ||= { itemId: this.item.id, position: 0, bookmarks: [] };
    mark.position = this.index;
    clearTimeout(this.saveTimer);
    const put = () => this.api.put(`/reading/${this.item.id}`, { position: mark.position, bookmarks: mark.bookmarks }).catch(error => toast(error.message));
    if (now) put(); else this.saveTimer = setTimeout(put, 800);
  }
}

// ── Prayer book: private by default; public only when chosen. Reuses wishes (moderation, reports, privacy). ──
export class PrayerBook {
  constructor({ api, net, panels, room, blocked }) {
    Object.assign(this, { api, net, panels, room, blocked });
    $('#prayerForm').addEventListener('submit', event => { event.preventDefault(); this.write(); });
    $('#prayerText').addEventListener('input', () => { $('#prayerCount').textContent = `${$('#prayerText').value.length}/300`; });
  }
  async open() { this.panels.open('prayerPanel'); await this.load(); }
  async load() {
    try {
      const { wishes } = await this.api.get(`/wishes?room=${encodeURIComponent(this.room)}&kind=prayer&limit=30`);
      const mine = wishes.filter(w => w.playerId === this.net.selfId), others = wishes.filter(w => w.playerId !== this.net.selfId && w.visibility === 'public' && !this.blocked.has(w.playerId));
      const row = (w, own) => el('article', { class: 'entry' }, el('time', { text: `${own ? (w.visibility === 'private' ? 'Riêng tư' : 'Công khai') : w.name} · ${timeAgo(w.createdAt)}` }), el('p', { text: w.text }),
        own ? el('button', { type: 'button', class: 'link', text: 'Xóa', onclick: () => this.remove(w) }) : el('button', { type: 'button', class: 'link', text: 'Báo cáo', onclick: () => this.report(w) }));
      $('#prayerMine').replaceChildren(...(mine.length ? mine.map(w => row(w, true)) : [el('small', { text: 'Bạn chưa viết lời nguyện nào.' })]));
      $('#prayerPublic').replaceChildren(...(others.length ? others.map(w => row(w, false)) : [el('small', { text: 'Chưa có lời nguyện công khai nào trong phòng.' })]));
    } catch (error) { toast(error.message); }
  }
  async write() {
    const text = $('#prayerText').value.trim();
    if (!text) return toast('Hãy viết đôi dòng trước đã.');
    $('#prayerSend').disabled = true;
    try {
      await this.net.request('wish:create', { kind: 'prayer', text, visibility: $('#prayerPublicCheck').checked ? 'public' : 'private' });
      $('#prayerText').value = ''; $('#prayerCount').textContent = '0/300'; $('#prayerPublicCheck').checked = false;
      toast('Lời nguyện đã được ghi vào sổ.'); this.load();
    } catch (error) { toast(error.message); }
    finally { $('#prayerSend').disabled = false; }
  }
  async remove(w) { try { await this.api.delete(`/wishes/${w.id}`); toast('Đã xóa lời nguyện.'); this.load(); } catch (error) { toast(error.message); } }
  async report(w) { try { await this.api.post(`/wishes/${w.id}/report`, { reason: 'Không phù hợp' }); toast('Cảm ơn bạn đã báo cáo.'); this.load(); } catch (error) { toast(error.message); } }
}
