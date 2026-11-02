import { $, el, timeAgo, toast } from './dom.js';

// Rooms (on the intro card), people in the current area (hide/unhide), and reporting lanterns.
export class SocialPanel {
  constructor({ api, net, game, panels, room, blocked, onBlockChange }) {
    Object.assign(this, { api, net, game, panels, room, blocked, onBlockChange });
    $('#introRoom').textContent = room;
    $('#roomChooser').addEventListener('toggle', () => { if ($('#roomChooser').open) this.rooms(); });
    $('#joinRoomForm').addEventListener('submit', event => { event.preventDefault(); this.go($('#roomInput').value); });
    $('#createPrivate').onclick = () => this.createPrivate();
    panels.on('peoplePanel', () => this.people());
    panels.on('lanternPanel', () => this.lanterns());
  }
  // Switching room reloads the page with a new ?room=, which also resets every live listener cleanly.
  go(code) {
    const clean = String(code).toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (clean.length < 2) return toast('Mã phòng gồm 2–24 ký tự A–Z, số hoặc dấu -.');
    const url = new URL(location.href); url.searchParams.set('room', clean); location.assign(url);
  }
  async rooms() {
    try {
      const data = await this.api.get('/rooms');
      const list = data.rooms.filter(r => r.code !== this.room);
      $('#publicRooms').replaceChildren(...(list.length ? list.map(r => el('button', { type: 'button', onclick: () => this.go(r.code), text: `${r.code} · ${r.online}/${data.capacity} người` })) : [el('small', { text: 'Chưa có phòng công cộng nào khác đang mở. Bạn có thể nhập một mã mới để mở phòng.' })]));
    } catch (error) { toast(error.message); }
  }
  async createPrivate() {
    try {
      const { code } = await this.api.post('/rooms', { private: true });
      const url = new URL(location.href); url.searchParams.set('room', code);
      try { await navigator.clipboard.writeText(url.href); toast('Đã tạo phòng riêng và sao chép liên kết. Đang chuyển phòng…'); } catch { toast(`Phòng riêng: ${code}. Đang chuyển phòng…`); }
      setTimeout(() => location.assign(url), 1200);
    } catch (error) { toast(error.message); }
  }
  async people() {
    const remotes = [...this.net.remotes.values()].filter(p => !this.blocked.has(p.id));
    $('#peopleList').replaceChildren(...(remotes.length ? remotes.map(p => el('article', { class: 'entry person' }, el('p', { text: p.name }), el('button', { type: 'button', class: 'link', text: 'Ẩn người này', onclick: () => this.block(p.id, p.name) }))) : [el('p', { class: 'empty', text: 'Chưa có ai khác ở khu này.' })]));
    try {
      const { blocked } = await this.api.get('/blocks');
      $('#blockedList').replaceChildren(...(blocked.length ? blocked.map(p => el('article', { class: 'entry person' }, el('p', { text: p.name }), el('button', { type: 'button', class: 'link', text: 'Bỏ ẩn', onclick: () => this.unblock(p.id, p.name) }))) : [el('small', { text: 'Bạn chưa ẩn ai.' })]));
    } catch (error) { toast(error.message); }
  }
  apply(ids) { this.blocked.clear(); ids.forEach(id => this.blocked.add(id)); this.onBlockChange(); }
  async block(id, name) {
    try { this.apply((await this.api.put(`/blocks/${id}`)).blocks); toast(`Đã ẩn ${name}.`); if (this.panels.current === 'peoplePanel') this.people(); }
    catch (error) { toast(error.message); }
  }
  async unblock(id, name) {
    try { this.apply((await this.api.delete(`/blocks/${id}`)).blocks); toast(`Đã bỏ ẩn ${name}.`); this.people(); }
    catch (error) { toast(error.message); }
  }
  lanterns() {
    const scene = this.game.scene, list = scene.visibleLanterns ? scene.visibleLanterns() : [];
    $('#lanternList').replaceChildren(...(list.length ? list.sort((a, b) => a.age - b.age).map(l => el('article', { class: 'entry' }, el('time', { text: `${l.name} · ${timeAgo(Date.now() - l.age * 1000)}` }), el('p', { text: l.text }),
      l.playerId === this.net.selfId ? null : el('button', { type: 'button', class: 'link', text: 'Báo cáo', onclick: () => this.report(l) }))) : [el('small', { text: 'Mặt hồ đang yên. Hãy là người thả ngọn đèn đầu tiên.' })]));
  }
  async report(lantern) {
    try { const res = await this.api.post(`/lanterns/${lantern.id}/report`, { reason: 'Không phù hợp' }); this.game.scene.removeLantern?.(lantern.id); this.lanterns(); toast(res.hidden ? 'Cảm ơn bạn. Hoa đăng đã được ẩn với mọi người.' : 'Cảm ơn bạn. Đã ẩn với bạn và ghi nhận báo cáo.'); }
    catch (error) { toast(error.message); }
  }
}
