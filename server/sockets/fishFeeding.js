import crypto from 'node:crypto';
import { sceneChannel } from '../services/rooms.js';
import { FISH_FEED_SECONDS, FISH_FEED_COOLDOWN, FISH_FEED_ROOM_COOLDOWN } from '../../public/js/shared/fishFeeding.js';

// Short-lived visual activity only. Inventory uses the existing shop tables;
// no story progress, merit points, migrations or WorldStateManager dependency.
export function createFishFeeding(ctx) {
  const { rooms, repos, world, progression, io } = ctx, feeds = new WeakMap();
  function snapshot(p, now = Date.now()) {
    const room = rooms.get(p.room), feed = room && feeds.get(room);
    return p.sceneId === 'lotusLake' && feed && now - feed.at < FISH_FEED_SECONDS * 1000 ? feed : null;
  }
  function attach(socket, getSelf) {
    socket.on('fish:feed', (data, ack) => {
      if (typeof ack !== 'function') return;
      const p = getSelf(); if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      const o = world.object(p.sceneId, data?.objectId), room = rooms.get(p.room);
      if (p.sceneId !== 'lotusLake' || o?.action !== 'fishFeed' || !room) return ack({ error: 'Hãy đến chỗ cho cá ăn ở Hồ Sen.' });
      if (p.meditation) return ack({ error: 'Hãy kết thúc thiền trước.' });
      if (Math.hypot(p.x - o.x, p.y - o.y) > o.radius) return ack({ error: 'Hãy đứng gần bảng Cho cá ăn.' });
      if (typeof data.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(data.requestId)) return ack({ error: 'Yêu cầu cho cá ăn không hợp lệ.' });
      const day = progression.keys().daily;
      if (p.lastFishRequest === data.requestId) return ack({ ok: true, shop: repos.shop.state(p.id, day), feed: snapshot(p) });
      const now = Date.now(), previous = feeds.get(room);
      if (now - (p.lastFishAt || 0) < FISH_FEED_COOLDOWN || previous && now - previous.at < FISH_FEED_ROOM_COOLDOWN) return ack({ error: 'Đàn cá đang ăn rồi, hãy đợi thêm một chút nhé.' });
      try {
        const shop = repos.shop.useFishFood(p.id, day);
        const feed = { id: crypto.randomUUID(), sceneId: p.sceneId, playerId: p.id, name: p.name, at: now, x: o.feedAt[0], y: o.feedAt[1], from: { x: p.x, y: p.y - 25 } };
        p.lastFishAt = now; p.lastFishRequest = data.requestId; feeds.set(room, feed);
        io.to(sceneChannel(p.room, p.sceneId)).emit('fish:fed', feed);
        ack({ ok: true, shop, feed });
      } catch (error) { ack({ error: error.message }); }
    });
  }
  return { snapshot, attach };
}
