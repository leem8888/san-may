import test from 'node:test';
import assert from 'node:assert/strict';
import { guest, startServer, connect, ask } from './helpers.mjs';
import { LOVE_FORTUNES } from '../server/content/loveFortunes.js';

test('fish seller has a tub and fish release has its own lakeside station', async t => {
  const s = await startServer(); t.after(s.close);
  const gate = s.game.ctx.world.map('gate'), lake = s.game.ctx.world.map('lotusLake');
  const seller = gate.objects.find(o => o.id === 'fishSeller');
  assert.ok(gate.props.some(o => o.type === 'fishTub' && Math.hypot(o.x - seller.x, o.y - seller.y) < 100));
  const lantern = lake.objects.find(o => o.id === 'lanternDock');
  const release = lake.objects.find(o => o.id === 'fishRelease');
  assert.ok(Math.hypot(release.x - lantern.x, release.y - lantern.y) > release.radius + lantern.radius);
  assert.ok(s.game.ctx.world.walkable('lotusLake', release.x, release.y));
});

test('fish seller is separate; purchase and release are atomic and idempotent', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'gate', 510, 900);
  const socket = await connect(s.base, a.token); t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'TEMPLE' });
  assert.ok((await ask(socket, 'shop:buy', { objectId: 'offeringStall', sku: 'releaseFish', requestId: 'wrong-stall' })).error);
  const bought = await ask(socket, 'shop:buy', { objectId: 'fishSeller', sku: 'releaseFish', requestId: 'fish-buy-1' });
  assert.equal(bought.shop.inventory.releaseFish, 1);
  assert.equal((await ask(socket, 'shop:buy', { objectId: 'fishSeller', sku: 'releaseFish', requestId: 'fish-buy-1' })).shop.inventory.releaseFish, 1);
  const p = s.game.ctx.rooms.findPlayer(a.id); p.sceneId = 'lotusLake'; p.x = 1400; p.y = 900;
  const released = await ask(socket, 'fish:release', { objectId: 'fishRelease', requestId: 'fish-drop-1' });
  assert.equal(released.shop.inventory.releaseFish, 0);
  assert.equal((await ask(socket, 'fish:release', { objectId: 'fishRelease', requestId: 'fish-drop-1' })).repeated, true);
  assert.ok((await ask(socket, 'fish:release', { objectId: 'fishRelease', requestId: 'fish-drop-2' })).error);
});

test('gender is fixed; shaving title and automatic hall footwear changes persist', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), repo = s.game.ctx.repos.players;
  const set = await s.http('PUT', '/api/profile', { name: 'An', appearance: {}, gender: 'female' }, a.token);
  assert.equal(set.data.player.gender, 'female');
  assert.equal((await s.http('PUT', '/api/profile', { name: 'An', appearance: {}, gender: 'male' }, a.token)).status, 409);
  repo.saveLocation(a.id, 'courtyard', 1310, 1090);
  const socket = await connect(s.base, a.token); t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'TEMPLE' });
  assert.equal((await ask(socket, 'character:shave', { objectId: 'shavingMonk' })).appearance.shaved, true);
  assert.equal((await ask(socket, 'character:shave', { objectId: 'shavingMonk' })).appearance.hairStyle, 'shaved');
  const p = s.game.ctx.rooms.findPlayer(a.id); p.x = 900; p.y = 430;
  const entered = await ask(socket, 'player:portal', { portalId: 'toHall' });
  assert.equal(entered.self.appearance.footwear, 'stored');
  assert.equal(entered.footwearChanged, 'stored');
  assert.equal(repo.profile(a.id).footwear, 'stored');
  p.x = 700; p.y = 930;
  const left = await ask(socket, 'player:portal', { portalId: 'toCourtyard' });
  assert.equal(left.self.appearance.footwear, 'wearing');
  assert.equal(left.footwearChanged, 'wearing');
  assert.equal(repo.profile(a.id).footwear, 'wearing');
  p.x = 760; p.y = 475;
  assert.equal((await ask(socket, 'footwear:toggle', { objectId: 'shoeRack' })).footwear, 'stored');
  p.x = 900; p.y = 430;
  assert.equal((await ask(socket, 'player:portal', { portalId: 'toHall' })).footwearChanged, null);
});

test('emergency return reaches the gate without a portal and clears stuck actions', async t => {
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'mainHall', 700, 800);
  repo.setFootwear(a.id, 'stored');
  const socket = await connect(s.base, a.token); t.after(() => socket.close());
  await ask(socket, 'room:join', { room: 'TEMPLE' });
  const p = s.game.ctx.rooms.findPlayer(a.id);
  p.state = 'sweep'; p.sweeping = true;
  const res = await ask(socket, 'player:recover');
  assert.equal(res.self.sceneId, 'gate');
  assert.deepEqual([res.self.x, res.self.y], [800, 1000]);
  assert.equal(res.self.state, 'idle');
  assert.equal(res.self.appearance.footwear, 'wearing');
  assert.equal(repo.profile(a.id).footwear, 'wearing');
  assert.equal(repo.progress(a.id).lastScene, 'gate');
  assert.equal(p.sweeping, false);
});

test('love cards are private and sweep state ends cleanly', async t => {
  assert.equal(LOVE_FORTUNES.length, 12);
  const s = await startServer(); t.after(s.close);
  const a = guest(s.game), b = guest(s.game), repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'courtyard', 320, 480); repo.saveLocation(b.id, 'courtyard', 900, 790);
  const sa = await connect(s.base, a.token), sb = await connect(s.base, b.token); t.after(() => { sa.close(); sb.close(); });
  await ask(sa, 'room:join', { room: 'TEMPLE' }); await ask(sb, 'room:join', { room: 'TEMPLE' });
  const otherEntries = s.game.ctx.repos.progression.entries(b.id).length;
  const card = (await ask(sa, 'love:draw', { objectId: 'loveTable' })).card;
  assert.ok(card.id >= 1 && card.id <= 12);
  assert.equal((await ask(sa, 'love:save', { id: card.id })).ok, true);
  assert.ok((await ask(sa, 'love:save', { id: card.id })).error);
  assert.equal(s.game.ctx.repos.progression.entries(b.id).length, otherEntries);
  const p = s.game.ctx.rooms.findPlayer(a.id); p.x = 470; p.y = 800;
  assert.equal((await ask(sa, 'sweep:state', { objectId: 'sweep', active: true })).ok, true);
  assert.equal(p.state, 'sweep');
  assert.equal((await ask(sa, 'sweep:state', { objectId: 'sweep', active: false })).ok, true);
  assert.equal(p.state, 'idle');
});
