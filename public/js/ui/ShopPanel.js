import { $, el, toast, uuid } from './dom.js';
import { SHOP_ITEMS } from '../shared/shop.js';
import { drawShopIcon, drawShopScene } from '../rendering/ShopArt.js';

const MODE = {
  shop: { kicker: 'CỔNG TAM QUAN', title: 'Hương & mâm lễ', intro: 'Chọn một món lễ nhỏ để mang vào Chánh Điện.', note: 'Dùng điểm trong game. Mỗi ngày bạn có thể nhận thêm điểm tại quầy.' },
  fishShop: { kicker: 'BÊN NGOÀI CỔNG CHÙA', title: 'Cá & cám cá', intro: 'Chậu cá nhỏ đang bơi bên cạnh người bán.', note: 'Mang cá đến bến thả cá ở Hồ Sen; mang cám đến chỗ cho đàn cá ăn.' },
  fishFeed: { kicker: 'HỒ SEN', title: 'Cho đàn cá ăn', intro: 'Rải một túi cám, rồi nhìn đàn cá bơi tới.', note: 'Mua cám cá ở người bán cá bên trái đường vào cổng.' },
  fishRelease: { kicker: 'BẾN THẢ CÁ · HỒ SEN', title: 'Thả cá phóng sinh', intro: 'Nhẹ nhàng thả cá tại bến riêng bên bờ hồ.', note: 'Mua cá ở người bán cá bên ngoài cổng chùa.' },
  offering: { kicker: 'CHÁNH ĐIỆN', title: 'Dâng hương & mâm lễ', intro: 'Chọn món lễ bạn đã mang theo.', note: 'Món lễ sẽ hiện trong Chánh Điện một lúc để mọi người cùng thấy.' },
};

const visible = (mode, item) => mode === 'shop' || mode === 'offering'
  ? !item.feed && item.kind !== 'fish'
  : mode === 'fishShop' ? item.feed || item.kind === 'fish'
  : mode === 'fishFeed' ? item.feed : item.kind === 'fish';

export class ShopPanel {
  constructor({ net, game, panels }) {
    Object.assign(this, { net, game, panels }); this.pending = new Map(); this.busy = false;
    $('#shopClaim').onclick = () => this.perform('shop:claim');
  }
  async open(object) {
    if (this.busy) return;
    this.object = object; this.mode = object.action; this.state = null;
    const mode = MODE[this.mode];
    $('#shopPanel').dataset.mode = this.mode;
    $('#shopKicker').textContent = mode.kicker;
    $('#shopTitle').textContent = mode.title;
    $('#shopIntro').textContent = mode.intro;
    $('#shopMessage').textContent = mode.note;
    $('#shopBalance').textContent = 'Đang xem túi đồ…';
    $('#shopList').replaceChildren(); $('#shopClaim').hidden = true;
    drawShopScene($('#shopScene'), this.mode);
    this.panels.open('shopPanel');
    try { this.state = (await this.net.request('shop:open', { objectId: object.id })).shop; this.render(); }
    catch (error) { $('#shopBalance').textContent = error.message; }
  }
  render() {
    if (!this.state) return;
    $('#shopBalance').textContent = `${this.state.points} điểm trong game`;
    $('#shopClaim').hidden = this.mode !== 'shop';
    $('#shopClaim').disabled = this.busy || !this.state.canClaim;
    $('#shopClaim').textContent = this.state.canClaim ? 'Nhận 30 điểm hôm nay' : 'Hôm nay đã nhận điểm';
    const buying = this.mode === 'shop' || this.mode === 'fishShop';
    const cards = Object.entries(SHOP_ITEMS).filter(([, item]) => visible(this.mode, item)).map(([sku, item]) => {
      const quantity = this.state.inventory[sku] || 0;
      const action = buying ? 'shop:buy' : item.feed ? 'fish:feed' : item.kind === 'fish' ? 'fish:release' : 'shop:offer';
      const label = buying ? `Mua · ${item.price} điểm` : item.feed ? 'Cho cá ăn · 1 túi' : item.kind === 'fish' ? 'Thả cá · 1 con' : 'Dâng lễ · 1 món';
      const icon = el('canvas', { class: 'shop-item-art', width: 72, height: 72, 'aria-hidden': 'true' });
      drawShopIcon(icon, sku);
      return el('article', { class: 'shop-item' },
        icon,
        el('div', { class: 'shop-item-copy' },
          el('div', { class: 'shop-item-head' }, el('strong', { text: item.name }), el('span', { class: 'shop-quantity', text: `Trong túi: ${quantity}` })),
          el('p', { text: item.description }),
          el('button', { type: 'button', class: buying ? 'shop-buy' : 'shop-use', text: label,
            disabled: this.busy || (buying ? this.state.points < item.price || quantity >= 20 : quantity < 1),
            onclick: () => this.perform(action, sku) })));
    });
    $('#shopList').replaceChildren(...cards);
  }
  async perform(event, sku) {
    if (this.busy || !this.object) return;
    const o = this.object;
    if (!this.game.scene.objects.includes(o) || Math.hypot(this.game.player.x - o.x, this.game.player.y - o.y) > o.radius) return toast('Hãy đến gần điểm tương tác.');
    this.busy = true; this.render();
    const requestKey = event === 'fish:feed' ? event : sku;
    if (['shop:buy', 'fish:feed', 'fish:release'].includes(event) && !this.pending.has(requestKey)) this.pending.set(requestKey, uuid());
    try {
      const res = await this.net.request(event, { objectId: o.id, sku, requestId: this.pending.get(requestKey) });
      this.pending.delete(requestKey);
      this.state = res.shop;
      if (event === 'fish:feed') {
        this.game.scene.setFishFeed?.(res.feed, this.net.clock.now()); this.game.player.act('interact'); this.panels.close();
        toast('Đàn cá đã bơi đến chỗ bạn rải cám!');
      } else if (event === 'fish:release') {
        this.game.player.act('interact'); this.panels.close(); toast('Bạn đã thả cá về Hồ Sen.');
      } else if (event === 'shop:offer') {
        this.game.player.act('pray'); toast('Bạn đã nhẹ nhàng dâng món lễ.');
      } else if (event === 'shop:claim') toast('Đã nhận 30 điểm trong game.');
      else toast(`Đã mua ${SHOP_ITEMS[sku].name.toLowerCase()}.`);
    } catch (error) { toast(error.message); $('#shopMessage').textContent = error.message; }
    finally { this.busy = false; this.render(); }
  }
}
