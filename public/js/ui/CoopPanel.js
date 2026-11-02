import { $, el, toast } from './dom.js';

// Doing things together: incoming invitations, choosing a partner, and the card that guides each step of a
// shared activity. It never covers the canvas centre (a slim card at the side) and the server decides every step.
export const COOP_KINDS = {
  tea: { label: 'Thưởng trà hai người', hint: 'Bàn trà đôi ở Vườn Thiền' },
  meditate: { label: 'Thiền chung', hint: 'Hai bồ đoàn ở Vườn Thiền' },
  bell: { label: 'Cùng thỉnh chuông', hint: 'Đại hồng chung ở Tháp Chuông' },
  garden: { label: 'Cùng làm vườn', hint: 'Góc vườn cũ ở Vườn Thiền' },
  puzzle: { label: 'Câu đố ký hiệu', hint: 'Thư Viện và Tháp Chuông', solo: true },
  read: { label: 'Cùng đọc', hint: 'Góc đọc trong Chánh Điện', reading: true },
  lamp: { label: 'Cùng thắp chiếc đèn cổ', hint: 'Chánh Điện · hành trình', solo: true, journey: true },
  greet: { label: 'Chắp tay chào nhau', hint: 'Đứng gần nhau', quick: true },
  sit: { label: 'Mời ngồi cạnh', hint: 'Ghế gần đây', quick: true },
  photo: { label: 'Chụp ảnh chung', hint: 'Đứng gần nhau', quick: true },
};
const MINUTES = [3, 5, 10, 15];

export class CoopPanel {
  constructor({ net, game, audio, celebrate, blocked, panels, meditation }) {
    Object.assign(this, { net, game, audio, celebrate, blocked, panels, meditation });
    this.session = null; this.invite = null; this.picking = null; this.order = []; this.timer = 0; this.minutes = 5;
    this.box = $('#coop');
    for (const [event, handler] of Object.entries({
      'coop:invite': v => this.incoming(v), 'coop:state': v => this.update(v), 'coop:complete': v => this.complete(v),
      'coop:sit': v => this.sitTogether(v), 'coop:photo': v => this.photo(v), 'meditation:begin': v => { if (!this.meditation.session) this.meditation.begin(v.meditation); },
    })) net.on(event, handler);
  }
  // ── Entry points ──────────────────────────────────────────────────────────────────────────────────────
  // From the people panel (a person) or an activity place (a kind): ask for whatever is still missing.
  pick({ person = null, kind = null, options = null, title = null } = {}) {
    if (this.session) return toast('Bạn đang trong một phiên cùng chơi.');
    this.picking = { person, kind, options, title }; this.render();
  }
  people() { return [...this.net.remotes.values()].filter(p => !this.blocked.has(p.id)); }
  async send(kind, person) {
    try {
      const res = await this.net.request('coop:invite', { kind, targetId: person?.id ?? null, options: kind === 'meditate' ? { minutes: this.minutes } : this.picking?.options || undefined });
      this.picking = null; this.update(res.session);
      if (person) toast(`Đã gửi lời mời tới ${person.name}.`);
    } catch (error) { toast(error.message); }
  }
  // Activity objects: the tea table, the puzzle scroll / stone / dials.
  object(o) {
    if (this.session?.kind === o.coop && this.session.status === 'gathering') return this.ready();
    if (this.session && this.session.kind !== o.coop) return toast('Bạn đang trong một phiên khác.');
    if (!this.session) return this.pick({ kind: o.coop });
  }
  async puzzle(o) {
    const s = this.session;
    if (s?.kind !== 'puzzle') {
      if (o.op === 'read') return toast('Một cuộn giấy cũ, chữ mờ. Rủ một người bạn cùng giải “Câu đố ký hiệu” để đọc cho kỹ.');
      if (o.op === 'observe') return toast('Phiến đá khắc năm ký hiệu: sen, trăng, mây, trúc, sóng.');
      return this.pick({ kind: 'puzzle' });
    }
    if (o.op === 'set') { this.dial = o.dial; this.order = []; return this.render(); }
    this.act(o.op);
  }
  // ── Server messages ───────────────────────────────────────────────────────────────────────────────────
  incoming(invite) {
    if (this.blocked.has(invite.from.id)) return this.answer(invite, false, true);
    this.invite = invite; this.audio.tone(660, .2, .04, 'ui'); this.render();
  }
  async answer(invite, accept, silent = false) {
    this.invite = null; this.render();
    try { const res = await this.net.request('coop:respond', { sessionId: invite.id, accept }); if (res.session) this.update(res.session); }
    catch (error) { if (!silent) toast(error.message); }
  }
  update(view) {
    if (!view) { this.session = null; return this.render(); }
    const ended = ['completed', 'cancelled', 'declined', 'expired'].includes(view.status);
    if (ended) {
      if (this.session?.id === view.id || !this.session) { this.session = null; this.dial = null; }
      if (view.status !== 'completed' && view.reason && view.id === this.lastId) toast(view.reason, 4500);
      return this.render();
    }
    // The invitee keeps the invitation card (accept / decline) until they answer.
    if (view.status === 'invited' && !view.host) { this.invite ||= { id: view.id, kind: view.kind, title: view.title, from: view.partner, role: view.role, expiresAt: view.expiresAt }; return this.render(); }
    if (this.invite?.id === view.id) this.invite = null;
    this.session = view; this.lastId = view.id; this.render();
  }
  complete(r) {
    this.session = null; this.dial = null; this.notes = []; this.render();
    this.moment(r.moment);
    toast(r.memory ? `Kỷ niệm mới: ${r.memory}` : `${r.title} — xong.`, 6000);
    if (r.kind === 'greet') this.game.player.act('pray');
    if (r.achievement) this.celebrate({ achievements: [r.achievement] });
  }
  // A short shared moment in the world (both partners see their own copy, from their own view).
  moment(kind) {
    if (!kind) return;
    const p = this.game.player, reduced = this.game.reduced, n = reduced ? 8 : 40;
    if (kind === 'bell') this.audio.bigBell();
    if (kind === 'lamp') { this.audio.bowl?.(this.audio.context?.currentTime || 0); }
    const looks = { motes: ['mote', ['#f3e2b0']], lamp: ['mote', ['#ffd27a', '#ffe9b0']], fireflies: ['firefly', ['#e8f59a', '#f3e6a0']], lanterns: ['firefly', ['#f2c879', '#ffd9a0']], steam: ['smoke', ['#eee']], petals: ['petal', ['#e6a0ad', '#f2c4cf', '#b79ad8']], bell: ['mote', ['#f2dca0']] }[kind];
    if (!looks) return;
    for (let i = 0; i < n; i++) this.game.particles.spawn({ kind: looks[0], x: p.x + (Math.random() - .5) * 260, y: p.y - 20 - Math.random() * 120, vx: (Math.random() - .5) * 20, vy: -10 - Math.random() * 20, vr: 1, life: 3 + Math.random() * 3, size: looks[0] === 'smoke' ? 5 : 2, alpha: .9, seed: Math.random() * 6, color: looks[1][i % looks[1].length] });
    if (kind !== 'bell') this.audio.bell();
  }
  sitTogether({ sceneId, objectId, side }) {
    const bench = this.game.scene.id === sceneId && this.game.scene.objects.find(o => o.id === objectId);
    if (!bench) return;
    // Your own character walks there on your own client; nobody moves anyone else.
    this.game.navigate({ x: bench.x + side * 30, y: bench.y + 40 }, { ...bench, x: bench.x + side * 30, y: bench.y + 30, radius: 60 });
    toast('Cùng đi tới ghế ngồi.');
  }
  photo({ names }) {
    const source = this.game.renderer.canvas, out = document.createElement('canvas');
    out.width = source.width; out.height = source.height + 70;
    const c = out.getContext('2d');
    c.drawImage(source, 0, 0);
    c.fillStyle = '#16302b'; c.fillRect(0, source.height, out.width, 70);
    c.fillStyle = '#e9d9b2'; c.font = '600 26px "Palatino Linotype", "Book Antiqua", Georgia, serif'; c.textAlign = 'center';
    c.fillText(`${names.join(' & ')} · ${this.game.scene.map.name} · ${new Date().toLocaleDateString('vi-VN')}`, out.width / 2, source.height + 44);
    out.toBlob(blob => {
      if (!blob) return toast('Không chụp được ảnh.');
      const a = el('a', { href: URL.createObjectURL(blob), download: `san-may-${Date.now()}.png` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Đã lưu ảnh chung vào máy của bạn.');
    }, 'image/png');
  }
  // ── Requests ──────────────────────────────────────────────────────────────────────────────────────────
  async ready() {
    const s = this.session;
    try {
      this.net.sendMove(this.game.player, performance.now(), true);
      const res = await this.net.request('coop:ready', s.kind === 'meditate' ? { options: { minutes: this.minutes } } : {});
      if (res.session.notice) toast(res.session.notice, 5000);
      if (s.kind === 'tea' && this.game.player.state !== 'sit') this.game.player.setState('sit');
      this.update(res.session);
    } catch (error) { toast(error.message); }
  }
  async act(action, payload) {
    try {
      this.net.sendMove(this.game.player, performance.now(), true);
      const res = await this.net.request('coop:act', { action, payload });
      if (res.message) toast(res.message, res.private ? 9000 : 3600);
      if (res.private) this.notes = [res.message, ...(this.notes || [])].slice(0, 3);
      if (action === 'set' && !res.wrong) this.dial = null;
      if (res.session) this.update(res.session);
      if (action === 'strike' && !res.early) this.game.player.act('bell');
      this.render();
    } catch (error) { toast(error.message); }
  }
  async leave() { try { await this.net.request('coop:leave'); this.session = null; this.dial = null; this.render(); } catch (error) { toast(error.message); } }
  // ── Rendering ─────────────────────────────────────────────────────────────────────────────────────────
  button(text, onclick, primary = false) { return el('button', { type: 'button', class: primary ? 'primary' : '', onclick, text }); }
  render() {
    clearInterval(this.timer);
    const parts = [];
    if (this.invite) {
      const v = this.invite;
      parts.push(el('section', { class: 'coop-invite', role: 'alert' },
        el('span', { class: 'eyebrow', text: 'LỜI MỜI' }), el('p', { text: `${v.from.name} mời bạn: ${v.title}${v.note ? ` (${v.note})` : ''}.` }),
        v.role ? el('small', { text: `Vai của bạn: ${v.role}${v.place ? ` · ${v.place}` : ''}` }) : null,
        el('div', { class: 'coop-row' }, this.button('Đồng ý', () => this.answer(v, true), true), this.button('Từ chối', () => this.answer(v, false)))));
    }
    if (this.picking && !this.session) parts.push(this.picker());
    if (this.session) parts.push(this.card(this.session));
    this.box.replaceChildren(...parts);
    this.box.hidden = !parts.length;
    if (this.session?.kind === 'bell' && this.session.data.firstStart) this.timer = setInterval(() => this.breath(), 100);
  }
  picker() {
    const { person, kind } = this.picking, close = this.button('Thôi', () => { this.picking = null; this.render(); });
    if (!kind) {
      return el('section', { class: 'coop-card' }, el('span', { class: 'eyebrow', text: `CÙNG ${person.name.toUpperCase()}` }), el('h3', { text: 'Làm gì cùng nhau?' }),
        el('div', { class: 'coop-list' }, ...Object.entries(COOP_KINDS).filter(([, k]) => !k.journey && !k.reading).map(([id, k]) => el('button', { type: 'button', onclick: () => id === 'meditate' ? (this.picking.kind = id, this.render()) : this.send(id, person) }, el('strong', { text: k.label }), el('small', { text: k.hint })))), close);
    }
    const others = this.people(), info = COOP_KINDS[kind];
    const minutes = kind === 'meditate' ? el('div', { class: 'choice-row', role: 'group', 'aria-label': 'Thời lượng đề nghị' }, ...MINUTES.map(m => el('button', { type: 'button', 'aria-pressed': String(m === this.minutes), text: `${m} phút`, onclick: () => { this.minutes = m; this.render(); } }))) : null;
    const targets = person ? [this.button(`Gửi lời mời tới ${person.name}`, () => this.send(kind, person), true)]
      : others.length ? others.map(p => this.button(`Mời ${p.name}`, () => this.send(kind, p))) : [el('small', { text: 'Chưa có ai ở khu này để mời. Gửi “Mời bạn ↗” để rủ bạn vào phòng.' })];
    return el('section', { class: 'coop-card' }, el('span', { class: 'eyebrow', text: 'CÙNG CHƠI' }), el('h3', { text: this.picking.title ? `${info.label}: “${this.picking.title}”` : info.label }), el('small', { text: info.hint }), minutes,
      el('div', { class: 'coop-list' }, ...targets, info.solo ? this.button(kind === 'lamp' ? 'Làm cùng chú tiểu An' : 'Chơi một mình (An gợi ý)', () => this.send(kind, null)) : null), close);
  }
  card(s) {
    const head = el('div', {}, el('span', { class: 'eyebrow', text: { invited: 'ĐANG CHỜ TRẢ LỜI', gathering: 'ĐANG CHUẨN BỊ' }[s.status] || 'CÙNG CHƠI' }), el('h3', { text: s.title }),
      el('small', { text: [s.role && `Vai của bạn: ${s.role}`, s.partner && `${s.partner.name}${s.partner.away ? ' (đang kết nối lại…)' : ''}`].filter(Boolean).join(' · ') }));
    const body = [el('p', { class: 'coop-guide', text: s.status === 'invited' ? `Đã mời ${s.partner?.name}. Đang chờ trả lời…` : s.guide || '' })];
    if (s.status === 'gathering' && s.solo === false && s.ready) body.push(el('small', { text: `Bạn: ${s.ready.me ? 'đã sẵn sàng' : 'chưa sẵn sàng'} · ${s.partner?.name}: ${s.ready.partner ? 'đã sẵn sàng' : 'chưa sẵn sàng'}` }));
    if (s.status === 'gathering' && s.kind === 'meditate') {
      const o = s.options || {};
      body.push(el('div', { class: 'choice-row', role: 'group', 'aria-label': 'Thời lượng chung' }, ...MINUTES.map(m => el('button', { type: 'button', 'aria-pressed': String(m === this.minutes), text: `${m} phút${o.partner === m ? ' ✓' : ''}`, onclick: () => { this.minutes = m; this.render(); } }))));
      if (o.partner) body.push(el('small', { text: `${s.partner.name} chọn ${o.partner} phút.` }));
    }
    if (s.status === 'gathering' && s.needsReady) body.push(s.ready?.me ? this.button('Chưa sẵn sàng', async () => this.update((await this.net.request('coop:unready')).session)) : this.button('Sẵn sàng', () => this.ready(), true));
    if (s.kind === 'bell' && s.data.firstStart) body.push(el('div', { class: 'coop-breath', id: 'coopBreath' }, el('span', { class: 'ring' }), el('strong', { id: 'coopBreathText', text: '' })));
    if (s.kind === 'puzzle') body.push(...this.puzzleView(s));
    else if (this.notes?.length) body.push(el('div', { class: 'coop-notes' }, ...this.notes.map(n => el('small', { text: n }))));
    if (s.kind === 'read' && s.data.text) body.push(el('div', { class: 'coop-reading' }, el('strong', { text: `${s.data.title} · đoạn ${s.data.index + 1}/${s.data.total}` }), el('p', { text: s.data.text }), el('small', { text: `Nguồn: ${s.data.source}` })));
    if (s.kind === 'tea' && s.data.topic) body.push(el('blockquote', { class: 'coop-topic', text: s.data.topic }));
    if (s.kind === 'garden' && s.data.contributions) body.push(el('small', { text: `Đã góp: bạn ${s.data.contributions[this.net.selfId] || 0} lượt · ${s.partner?.name}: ${s.data.contributions[s.partner?.id] || 0} lượt` }));
    const actions = (s.actions || []).filter(a => !(s.kind === 'puzzle' && a.id === 'set'));
    if (actions.length) body.push(el('div', { class: 'coop-list' }, ...actions.map(a => this.button(a.label, () => this.act(a.id, a.payload), a.id !== 'hint' && a.id !== 'topic'))));
    body.push(this.button(s.status === 'active' ? 'Rời phiên' : 'Hủy', () => this.leave()));
    return el('section', { class: 'coop-card' }, head, ...body);
  }
  puzzleView(s) {
    const out = [];
    if (this.notes?.length) out.push(el('div', { class: 'coop-notes' }, ...this.notes.map(n => el('small', { text: n }))));
    out.push(el('small', { text: `Bạn: ${s.data.read ? 'đã đọc cuộn giấy' : 'chưa đọc cuộn giấy'}, ${s.data.observed ? 'đã xem phiến đá' : 'chưa xem phiến đá'}.${s.partner ? ` ${s.partner.name}: ${s.data.partnerRead ? 'đã đọc' : 'chưa đọc'}, ${s.data.partnerObserved ? 'đã xem' : 'chưa xem'}.` : ''}` }));
    if (this.dial) {
      out.push(el('p', { text: `Trụ đèn ${this.dial === 'left' ? 'trái' : 'phải'}: chọn ba ký hiệu theo thứ tự (${this.order.length}/3).` }));
      out.push(el('div', { class: 'choice-row' }, ...s.data.symbols.map(sym => el('button', { type: 'button', 'aria-pressed': String(this.order.includes(sym.id)), text: `${this.order.includes(sym.id) ? `${this.order.indexOf(sym.id) + 1}. ` : ''}${sym.name}`, onclick: () => { this.order = this.order.includes(sym.id) ? this.order.filter(x => x !== sym.id) : [...this.order, sym.id].slice(0, 3); this.render(); } }))));
      out.push(el('div', { class: 'coop-row' }, this.button('Đặt trụ đèn', () => this.act('set', { dial: this.dial, order: this.order }), true), this.button('Thôi', () => { this.dial = null; this.render(); })));
    }
    return out;
  }
  // Shared bell: the same breathing ring for both, from the server's start time.
  breath() {
    const s = this.session, ring = $('#coopBreath');
    if (!s || !ring) return clearInterval(this.timer);
    const d = s.data, t = this.net.clock.now() - d.firstStart;
    const text = $('#coopBreathText');
    if (t < 0) { text.textContent = 'Chuẩn bị…'; ring.className = 'coop-breath'; return; }
    const inCycle = t % d.cycle, breathing = d.breath * d.breaths, strikeIn = breathing - inCycle;
    const strike = Math.abs(strikeIn) <= d.window || d.cycle - inCycle <= d.window;
    const breathNo = Math.min(d.breaths, Math.floor(inCycle / d.breath) + 1), inhale = (inCycle % d.breath) < d.breath / 2;
    ring.className = `coop-breath ${strike ? 'strike' : inCycle < breathing ? (inhale ? 'in' : 'out') : ''}`;
    text.textContent = strike ? 'Thỉnh!' : inCycle < breathing ? `Hơi thở ${breathNo}/${d.breaths} · ${inhale ? 'hít vào' : 'thở ra'}` : 'Lắng nghe…';
  }
}
