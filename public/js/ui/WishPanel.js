import { LIMITS } from '../shared/rules.js';
import { $, el, timeAgo, toast, uuid } from './dom.js';

const REACTION_LABELS = { lotus: ['✿', 'Sen'], heart: ['♡', 'Thương'], sun: ['☼', 'Nắng ấm'], bow: ['◇', 'Kính chúc'] };

// Wishes are little cards; all user text is set with textContent.
export class WishPanel {
  constructor({ api, net, room, getMe, blocked, onBlock }) {
    Object.assign(this, { api, net, room, getMe, blocked, onBlock });
    this.wishes = new Map(); this.pending = null; this.oldest = null;
    $('#wish').addEventListener('input', () => { $('#wishCount').textContent = `${$('#wish').value.length}/${LIMITS.wish}`; });
    $('#wishForm').addEventListener('submit', event => { event.preventDefault(); this.send(); });
    $('#moreWishes').addEventListener('click', () => this.load(false));
  }
  async load(reset = true) {
    try {
      const before = reset || !this.oldest ? '' : `&before=${this.oldest}`;
      const data = await this.api.get(`/wishes?room=${encodeURIComponent(this.room)}&limit=12${before}`);
      if (reset) this.wishes.clear();
      for (const wish of data.wishes) this.wishes.set(wish.id, wish);
      this.oldest = Math.min(...[...this.wishes.values()].map(w => w.createdAt));
      $('#moreWishes').hidden = !data.more;
      this.render();
    } catch (error) { $('#wishStatus').textContent = error.message; }
  }
  add(wish) { this.wishes.set(wish.id, wish); this.render(); }
  remove(id) { if (this.wishes.delete(id)) this.render(); }
  reactions(id, reactions, mine) { const wish = this.wishes.get(id); if (!wish) return; wish.reactions = reactions; if (mine !== undefined) wish.mine = mine; this.render(); }
  async send() {
    const text = $('#wish').value.trim();
    if (!text) return;
    if (!this.net.sceneId) return toast('Hãy bước vào chùa trước.');
    // Resending the same text reuses its clientId, so a retry after a timeout can never post twice.
    const visibility = $('#wishPrivate').checked ? 'private' : 'public';
    if (this.pending?.text !== text || this.pending.visibility !== visibility) this.pending = { text, visibility, clientId: uuid() };
    $('#sendWish').disabled = true; $('#wishStatus').textContent = 'Đang gửi…';
    try {
      const res = await this.net.request('wish:create', this.pending);
      this.add(res.wish); this.pending = null; $('#wish').value = ''; $('#wishCount').textContent = `0/${LIMITS.wish}`;
      $('#wishStatus').textContent = visibility === 'private' ? 'Đã lưu lời chúc riêng.' : 'Đã gửi tới mọi người trong phòng.';
    } catch (error) { $('#wishStatus').textContent = error.message; }
    finally { $('#sendWish').disabled = false; }
  }
  async react(wish, emoji) {
    try { const res = await this.net.request('wish:react', { wishId: wish.id, emoji: wish.mine === emoji ? null : emoji }); this.reactions(wish.id, res.reactions, res.mine); }
    catch (error) { toast(error.message); }
  }
  async report(wish) {
    try { const res = await this.api.post(`/wishes/${wish.id}/report`, { reason: 'Không phù hợp' }); this.remove(wish.id); toast(res.hidden ? 'Cảm ơn bạn. Lời chúc đã được ẩn với mọi người.' : 'Cảm ơn bạn. Lời chúc đã được ẩn với bạn và ghi nhận báo cáo.'); }
    catch (error) { toast(error.message); }
  }
  card(wish) {
    const me = this.getMe(), own = wish.playerId === me?.id, more = el('div', { class: 'meta', hidden: true });
    if (!own) more.append(el('button', { type: 'button', onclick: () => this.report(wish), text: 'Báo cáo' }), el('button', { type: 'button', onclick: () => this.onBlock(wish.playerId, wish.name), text: `Ẩn ${wish.name}` }));
    const reactions = wish.visibility === 'public' ? Object.entries(REACTION_LABELS).map(([key, [icon, label]]) => {
      const count = wish.reactions?.[key] || 0;
      return el('button', { type: 'button', 'aria-pressed': String(wish.mine === key), title: label, disabled: own && !count, onclick: own ? null : () => this.react(wish, key), text: `${icon} ${count || ''}`.trim() });
    }) : [el('small', { text: 'Riêng tư · chỉ bạn thấy' })];
    const toggle = own ? null : el('button', { type: 'button', class: 'more', 'aria-label': 'Tùy chọn', onclick: () => { more.hidden = !more.hidden; }, text: '⋯' });
    return el('article', { class: `wish-card${wish.visibility === 'private' ? ' private' : ''}` },
      el('strong', { text: wish.name }), el('time', { text: timeAgo(wish.createdAt) }), el('p', { text: wish.text }),
      el('div', { class: 'meta' }, reactions, toggle), more);
  }
  render() {
    const list = [...this.wishes.values()].filter(w => !this.blocked.has(w.playerId)).sort((a, b) => b.createdAt - a.createdAt);
    $('#wishes').replaceChildren(...(list.length ? list.map(w => this.card(w)) : [el('p', { class: 'empty', text: 'Một lời lành cũng làm ấm cả sân chùa.' })]));
  }
}
