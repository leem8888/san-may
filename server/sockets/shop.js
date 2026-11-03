import { SHOP_ITEMS } from '../../public/js/shared/shop.js';
import { sceneChannel } from '../services/rooms.js';

export function attachShop(socket, ctx, getSelf) {
  const { repos, progression, world, io } = ctx;
  const day = () => progression.keys().daily;
  function near(p, action, objectId) {
    const o = world.object(p.sceneId, objectId);
    return o?.action === action && Math.hypot(p.x - o.x, p.y - o.y) <= o.radius;
  }
  function handle(event, callback) {
    socket.on(event, (data, ack) => {
      if (typeof ack !== 'function') return;
      const p = getSelf(); if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      try { ack(callback(p, data || {})); } catch (error) { ack({ error: error.message }); }
    });
  }
  handle('shop:open', (p, data) => {
    if (!near(p, 'shop', data.objectId) && !near(p, 'fishShop', data.objectId) && !near(p, 'offering', data.objectId) && !near(p, 'fishFeed', data.objectId) && !near(p, 'fishRelease', data.objectId)) throw Error('Hãy đến gần nơi tương tác.');
    return { ok: true, shop: repos.shop.state(p.id, day()) };
  });
  handle('shop:buy', (p, data) => {
    if (!near(p, 'shop', data.objectId) && !near(p, 'fishShop', data.objectId)) throw Error('Hãy đến quầy hương hoặc người bán cá trước cổng chùa để mua.');
    if (Boolean(SHOP_ITEMS[data.sku]?.feed || data.sku === 'releaseFish') !== near(p, 'fishShop', data.objectId)) throw Error('Cá và cám cá chỉ bán tại người bán cá.');
    if (typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(data.requestId)) throw Error('Mã mua hàng không hợp lệ.');
    if (!Object.hasOwn(SHOP_ITEMS, data.sku)) throw Error('Không có món lễ này.');
    return { ok: true, shop: repos.shop.purchase(p.id, data.sku, data.requestId, day()) };
  });
  handle('shop:claim', (p, data) => {
    if (!near(p, 'shop', data.objectId)) throw Error('Hãy ghé quầy hương để nhận xu.');
    return { ok: true, shop: repos.shop.claim(p.id, day()) };
  });
  handle('shop:offer', (p, data) => {
    if (!near(p, 'offering', data.objectId)) throw Error('Hãy đến bàn dâng lễ trong Chánh Điện.');
    const now = Date.now();
    if (now - (p.lastOfferingAt || 0) < 3000) throw Error('Hãy thong thả dâng từng món lễ nhé.');
    const offering = repos.shop.offer(p, data.sku, now); p.lastOfferingAt = now;
    Object.assign(p, { state: 'pray', actionAt: now, moved: false, dirty: true });
    const channel = sceneChannel(p.room, p.sceneId);
    io.to(channel).emit('offering:update', { sceneId: p.sceneId, offerings: repos.shop.offerings(p.room, now) });
    socket.to(channel).emit('player:action', { id: p.id, action: 'pray', at: now });
    progression.journal(p.id, `Dâng ${SHOP_ITEMS[data.sku].name.toLowerCase()} tại Chánh Điện.`, now);
    return { ok: true, offering, shop: repos.shop.state(p.id, day()) };
  });
  handle('fish:release', (p, data) => {
    if (p.sceneId !== 'lotusLake' || !near(p, 'fishRelease', data.objectId)) throw Error('Hãy đến điểm thả cá ở Hồ Sen.');
    if (typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(data.requestId)) throw Error('Mã thả cá không hợp lệ.');
    const result = repos.shop.releaseFish(p.id, data.requestId, day(), Date.now());
    if (!result.repeated) {
      progression.journal(p.id, 'Thả một chú cá tại Hồ Sen.', result.at);
      io.to(sceneChannel(p.room, p.sceneId)).emit('fish:released', { sceneId: p.sceneId, x: 1360, y: 790, at: result.at, playerId: p.id });
    }
    return { ok: true, ...result };
  });
}
