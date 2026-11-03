import crypto from 'node:crypto';
import { SHOP_ITEMS, SHOP_START_POINTS, SHOP_DAILY_POINTS, OFFERING_SECONDS } from '../../public/js/shared/shop.js';

export function createShopRepo(db) {
  const q = {
    init: db.prepare('INSERT OR IGNORE INTO shop_wallets(player_id, points, claimed_day) VALUES (?, ?, ?)'),
    wallet: db.prepare('SELECT points, claimed_day AS claimedDay FROM shop_wallets WHERE player_id = ?'),
    claim: db.prepare('UPDATE shop_wallets SET points = points + ?, claimed_day = ? WHERE player_id = ? AND claimed_day < ?'),
    stock: db.prepare('SELECT sku, quantity FROM shop_inventory WHERE player_id = ?'),
    order: db.prepare('SELECT sku FROM shop_orders WHERE player_id = ? AND request_id = ?'),
    insertOrder: db.prepare('INSERT INTO shop_orders(player_id, request_id, sku) VALUES (?, ?, ?)'),
    debit: db.prepare('UPDATE shop_wallets SET points = points - ? WHERE player_id = ? AND points >= ?'),
    grant: db.prepare('INSERT INTO shop_inventory(player_id, sku, quantity) VALUES (?, ?, 1) ON CONFLICT(player_id, sku) DO UPDATE SET quantity = quantity + 1'),
    consume: db.prepare('UPDATE shop_inventory SET quantity = quantity - 1 WHERE player_id = ? AND sku = ? AND quantity > 0'),
    offer: db.prepare('INSERT INTO temple_offerings(id, room, player_id, name, sku, created_at) VALUES (@id, @room, @playerId, @name, @sku, @at)'),
    offers: db.prepare('SELECT id, name, sku, created_at AS at FROM temple_offerings WHERE room = ? AND created_at > ? ORDER BY created_at DESC LIMIT 6'),
    prune: db.prepare('DELETE FROM temple_offerings WHERE created_at <= ?'),
    released: db.prepare('SELECT created_at AS at FROM fish_releases WHERE player_id = ? AND request_id = ?'),
    recordRelease: db.prepare('INSERT INTO fish_releases(player_id, request_id, scene_id, created_at) VALUES (?, ?, ?, ?)'),
  };
  const init = (id, day) => q.init.run(id, SHOP_START_POINTS, day);
  const state = (id, day) => {
    init(id, day); const wallet = q.wallet.get(id);
    return { points: wallet.points, canClaim: wallet.claimedDay < day, inventory: Object.fromEntries(q.stock.all(id).map(row => [row.sku, row.quantity])) };
  };
  const purchase = db.transaction((id, sku, requestId, day) => {
    init(id, day);
    const old = q.order.get(id, requestId);
    if (old) { if (old.sku !== sku) throw Error('Mã mua hàng đã được dùng cho món khác.'); return state(id, day); }
    const item = Object.hasOwn(SHOP_ITEMS, sku) && SHOP_ITEMS[sku];
    if (!item) throw Error('Không có món lễ này.');
    const quantity = q.stock.all(id).find(row => row.sku === sku)?.quantity || 0;
    if (quantity >= 20) throw Error('Bạn đã mang đủ 20 món loại này. Hãy dâng lễ trước nhé.');
    if (!q.debit.run(item.price, id, item.price).changes) throw Error('Bạn chưa đủ điểm. Có thể nhận thêm 30 điểm mỗi ngày tại quầy.');
    q.grant.run(id, sku); q.insertOrder.run(id, requestId, sku);
    return state(id, day);
  });
  const offer = db.transaction((p, sku, now) => {
    if (!Object.hasOwn(SHOP_ITEMS, sku) || SHOP_ITEMS[sku].feed || SHOP_ITEMS[sku].kind === 'fish') throw Error('Không có món lễ này.');
    if (!q.consume.run(p.id, sku).changes) throw Error('Bạn chưa có món này. Ghé quầy trước cổng để mua nhé.');
    const offering = { id: crypto.randomUUID(), room: p.room, playerId: p.id, name: p.name, sku, at: now };
    q.prune.run(now - OFFERING_SECONDS * 1000); q.offer.run(offering); return offering;
  });
  return {
    state, purchase, offer,
    releaseFish: db.transaction((id, requestId, day, now) => {
      const old = q.released.get(id, requestId);
      if (old) return { repeated: true, at: old.at, shop: state(id, day) };
      if (!q.consume.run(id, 'releaseFish').changes) throw Error('Bạn chưa có cá phóng sinh.');
      q.recordRelease.run(id, requestId, 'lotusLake', now);
      return { repeated: false, at: now, shop: state(id, day) };
    }),
    useFishFood: db.transaction((id, day) => {
      if (!q.consume.run(id, 'fishFood').changes) throw Error('Bạn chưa có thức ăn cá. Ghé quầy ngoài cổng chùa để mua nhé.');
      return state(id, day);
    }),
    claim(id, day) { init(id, day); if (!q.claim.run(SHOP_DAILY_POINTS, day, id, day).changes) throw Error('Hôm nay bạn đã nhận điểm rồi.'); return state(id, day); },
    offerings: (room, now = Date.now()) => q.offers.all(room, now - OFFERING_SECONDS * 1000),
  };
}
