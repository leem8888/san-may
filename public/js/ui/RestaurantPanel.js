import { $, el, toast, uuid } from './dom.js';
import { RESTAURANT_MENU } from '../shared/restaurant.js';

export class RestaurantPanel {
  constructor({ net, game }) {
    Object.assign(this, { net, game });
    this.dialog = $('#restaurantDialog'); this.seatId = null; this.state = null; this.points = 0; this.busy = false; this.opening = false; this.pendingId = null;
    $('#restaurantClose').onclick = () => this.dialog.close();
    $('#restaurantStandHud').onclick = () => this.stand();
  }
  async open(target) {
    if (this.opening) return;
    const seated = this.game.player.restaurantSeat;
    const ownSeat = seated && this.game.scene.objects.find(o => o.id === seated);
    if (seated && (!ownSeat || (target.id !== ownSeat.tableId && target.tableId !== ownSeat.tableId))) return toast('Hãy đứng dậy trước khi sang bàn khác nhé.');
    const isTable = target.action === 'restaurantTable' && !seated;
    this.seatId = seated || (isTable ? null : target.id);
    this.tableId = ownSeat?.tableId || (isTable ? target.id : target.tableId);
    this.opening = true;
    this.state = this.game.scene.restaurant; this.error = ''; this.pendingId = null;
    try {
      const result = await this.net.request('restaurant:sit', this.seatId ? { seatId: this.seatId } : { tableId: target.id });
      if (this.game.scene.id !== 'gate') return;
      this.seatId = result.seatId; this.tableId = result.tableId;
      this.state = result.restaurant; this.points = result.shop.points; this.error = '';
      this.game.player.restaurantSeat = result.seatId; this.game.player.setState('sit');
      this.syncHud();
      if (!this.dialog.open) this.dialog.showModal();
      this.render();
    } catch (error) {
      this.error = error.message; this.state = this.game.scene.restaurant;
      if (!this.dialog.open) this.dialog.showModal();
      this.render();
    }
    finally { this.opening = false; }
  }
  update(state) { if (this.opening) return; this.state = state; if (this.dialog.open) this.render(); }
  tableAndSeat() {
    const table = this.state?.tables?.find(t => t.id === this.tableId || t.seats.some(s => s.id === this.seatId));
    return { table, seat: table?.seats.find(s => s.id === this.seatId) };
  }
  render(loading = '') {
    const { table, seat } = this.tableAndSeat(), ownSeat = seat?.playerId === this.net.selfId;
    $('#restaurantSeatCount').textContent = table ? `${table.seats.filter(s => s.playerId).length}/${table.seats.length} chỗ đang có khách` : 'Bàn nhỏ · 2 chỗ';
    $('#restaurantBalance').replaceChildren(String(this.points), el('span', { class: 'coin-icon', 'aria-hidden': 'true' }));
    $('#restaurantStatus').textContent = loading || this.error || (table?.cleaning ? 'Cô Hạnh đang lau bàn, chờ một chút nhé.' : !ownSeat ? (seat?.playerId ? 'Ghế này đã có khách.' : 'Chọn một ghế trống để ngồi.') : seat.order ? ({ queued: 'Cô Hạnh đã nhận món.', preparing: 'Cô Hạnh đang chuẩn bị món…', serving: 'Cô Hạnh đang mang món tới bàn…', served: 'Món nóng đã được mang ra bàn.' }[seat.order.status] || '') : 'Mời bạn chọn món. Cô Hạnh sẽ mang ra bàn.');
    const list = $('#restaurantMenu'); list.replaceChildren();
    if (ownSeat && !seat.order && !table.cleaning) {
      for (const [sku, item] of Object.entries(RESTAURANT_MENU)) {
        list.append(el('article', { class: 'restaurant-dish' },
          el('span', { class: 'restaurant-dish-icon', text: item.icon, 'aria-hidden': 'true' }),
          el('div', {}, el('strong', { text: item.name }), el('p', { text: item.description }),
            el('button', { type: 'button', class: 'primary', disabled: this.busy || this.points < item.price, onclick: () => this.order(sku) }, 'Gọi món · ', String(item.price), ' ', el('span', { class: 'coin-icon', 'aria-hidden': 'true' })) )));
      }
    } else if (ownSeat && seat.order?.status === 'served') {
      list.append(el('button', { type: 'button', class: 'primary restaurant-eat', disabled: this.busy, text: 'Dùng món xong', onclick: () => this.eat() }));
    }
    this.syncHud();
  }
  syncHud() { const button = $('#restaurantStandHud'); button.hidden = !this.game.player.restaurantSeat; button.disabled = this.busy; }
  async order(sku) {
    if (this.busy || !this.seatId) return;
    this.busy = true; this.pendingId ||= uuid(); this.render();
    try {
      const result = await this.net.request('restaurant:order', { seatId: this.seatId, sku, requestId: this.pendingId });
      this.state = result.restaurant; this.points = result.shop.points; this.pendingId = null; this.error = '';
      toast('Cô Hạnh đã nhận món và bắt đầu chuẩn bị.');
    } catch (error) { this.error = error.message; }
    finally { this.busy = false; this.render(); }
  }
  async eat() {
    if (this.busy) return;
    this.busy = true; this.render();
    try { this.state = (await this.net.request('restaurant:eat', { seatId: this.seatId })).restaurant; this.error = ''; }
    catch (error) { this.error = error.message; }
    finally { this.busy = false; this.render(); }
  }
  async stand() {
    if (this.busy) return;
    this.busy = true; this.syncHud();
    try {
      const result = await this.net.request('restaurant:leave'); this.state = result.restaurant;
      this.game.player.restaurantSeat = null; this.game.player.setState('idle'); this.dialog.close(); this.syncHud();
    } catch (error) { this.error = error.message; this.render(); }
    finally { this.busy = false; this.syncHud(); }
  }
  onMove() { if (this.dialog.open && !this.opening) this.dialog.close(); }
  closeForScene() { if (this.dialog.open) this.dialog.close(); this.seatId = null; this.syncHud(); }
}
