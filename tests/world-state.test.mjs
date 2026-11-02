import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../server/database/db.js';
import { createRepositories } from '../server/repositories/index.js';
import { WorldStateManager, StateConflictError, stateKey, publicState } from '../server/services/worldState.js';
import { WorldStateStore } from '../public/js/multiplayer/WorldStateStore.js';
import { DEFAULT_APPEARANCE } from '../public/js/shared/rules.js';
import { ask, connect, guest, nextEvent, startServer, delay } from './helpers.mjs';

test('WorldStateManager: scopes, versions, conflicts, expiry and persistence across a restart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanmay-world-')), file = path.join(dir, 'world.db');
  let db;
  try {
    let now = 1000;
    db = openDatabase(file); let repos = createRepositories(db);
    for (const id of ['p1', 'p2']) repos.players.create({ id, tokenHash: `hash-${id}`, name: id, appearance: DEFAULT_APPEARANCE });
    let manager = new WorldStateManager(repos.world, () => now);
    const changes = []; manager.on('change', record => changes.push(record));
    const personal = stateKey('personal', 'p1', 'mainHall', 'lamp', 'clue');
    const room = stateKey('room', 'ROOM-A', 'courtyard', 'leaves', 'clean');
    const shared = stateKey('shared', 'ignored', 'zenGarden', 'oldGarden', 'stage');
    assert.equal(shared.owner, 'world', 'shared rows have a single owner');
    assert.throws(() => stateKey('global', 'x', 'a', 'b', 'c'), /Phạm vi/);
    assert.throws(() => stateKey('room', 'R', 'a b', 'b', 'c'), /Khóa/);

    assert.equal(manager.set(personal, { found: true }).version, 1);
    assert.equal(manager.update(room, value => ({ swept: (value?.swept || 0) + 1 })).value.swept, 1);
    assert.equal(manager.update(room, value => ({ swept: value.swept + 1 })).version, 2);
    assert.equal(manager.update(room, () => undefined).version, 2, 'returning undefined leaves the row alone');
    manager.set(shared, 2);
    assert.throws(() => manager.update(room, () => ({ swept: 9 }), { expectVersion: 1 }), StateConflictError, 'stale writes are rejected');
    assert.throws(() => manager.set(room, 'x'.repeat(5000)), /quá lớn/);

    // Visibility: own personal rows + own room + shared, nothing else.
    const forP1 = manager.visible('p1', 'ROOM-A', 'mainHall').map(r => r.objectId);
    const forP2 = manager.visible('p2', 'ROOM-B', 'mainHall').map(r => r.objectId);
    assert.deepEqual(forP1, ['lamp']); assert.deepEqual(forP2, [], 'personal state never leaks to another player');
    assert.equal(manager.visible('p2', 'ROOM-B', 'courtyard').length, 0, 'room state never leaks to another room');
    assert.equal(manager.visible('p2', 'ROOM-B', 'zenGarden').length, 1, 'shared state is visible to every room');
    assert.ok(!publicState(manager.get(room)).id.includes('ROOM-A'), 'public ids do not carry the owner');

    // Temporary state disappears and is announced as removed.
    manager.set(stateKey('room', 'ROOM-A', 'mainHall', 'candle1', 'lit'), true, { ttlMs: 500 });
    now += 600;
    assert.equal(manager.get(stateKey('room', 'ROOM-A', 'mainHall', 'candle1', 'lit')), null, 'expired rows read as absent');
    assert.equal(manager.purgeExpired(), 1); assert.equal(changes.at(-1).removed, true);

    // Restart: a new process sees the same durable state and versions.
    db.close(); db = openDatabase(file); repos = createRepositories(db); manager = new WorldStateManager(repos.world, () => now);
    assert.deepEqual(manager.get(room).value, { swept: 2 }); assert.equal(manager.get(room).version, 2);
    assert.equal(manager.value(shared), 2);
  } finally { if (db?.open) db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

test('WorldStateStore keeps the newest version and prefers personal over room over shared', () => {
  const store = new WorldStateStore(), seen = [];
  store.on(record => seen.push(record.version));
  const row = (scope, version, value) => ({ id: [scope, 'mainHall', 'lamp', 'stage'].join('|'), scope, sceneId: 'mainHall', objectId: 'lamp', type: 'stage', value, version });
  store.load([row('shared', 1, 'shared')], 'mainHall');
  assert.equal(store.get('mainHall', 'lamp', 'stage'), 'shared');
  assert.equal(store.apply(row('room', 3, 'room-3')), true); assert.equal(store.get('mainHall', 'lamp', 'stage'), 'room-3');
  assert.equal(store.apply(row('room', 2, 'room-2')), false, 'an older packet cannot roll state back');
  assert.equal(store.apply(row('room', 3, 'room-3')), false, 'duplicates are ignored');
  store.apply(row('personal', 1, 'mine')); assert.equal(store.get('mainHall', 'lamp', 'stage'), 'mine');
  store.apply({ ...row('personal', 1, null), removed: true }); assert.equal(store.get('mainHall', 'lamp', 'stage'), 'room-3');
  store.load([], 'mainHall'); assert.equal(store.get('mainHall', 'lamp', 'stage'), null, 'a new snapshot replaces the scene');
});

test('World deltas reach only the right audience over Socket.IO', async t => {
  const s = await startServer(); t.after(s.close);
  const [a, b, c] = ['An', 'Bình', 'Chi'].map(name => guest(s.game, name));
  const repo = s.game.ctx.repos.players;
  repo.saveLocation(a.id, 'courtyard', 900, 790); repo.saveLocation(b.id, 'courtyard', 950, 790); repo.saveLocation(c.id, 'courtyard', 900, 790);
  const sockets = await Promise.all([a, b, c].map(g => connect(s.base, g.token)));
  t.after(() => sockets.forEach(socket => socket.close()));
  const [sa, sb, sc] = sockets;
  await ask(sa, 'room:join', { room: 'WS-A' }); await ask(sb, 'room:join', { room: 'WS-A' }); await ask(sc, 'room:join', { room: 'WS-B' });
  const got = { a: [], b: [], c: [] };
  sa.on('world:delta', d => got.a.push(d.objectId)); sb.on('world:delta', d => got.b.push(d.objectId)); sc.on('world:delta', d => got.c.push(d.objectId));
  const manager = s.game.ctx.worldState;
  const roomDone = nextEvent(sb, 'world:delta', d => d.objectId === 'roomThing');
  manager.set(stateKey('room', 'WS-A', 'courtyard', 'roomThing', 'x'), 1);
  manager.set(stateKey('personal', a.id, 'courtyard', 'mine', 'x'), 1);
  manager.set(stateKey('shared', 'world', 'courtyard', 'everyone', 'x'), 1);
  await roomDone; await delay(100);
  assert.deepEqual(got.a.sort(), ['everyone', 'mine', 'roomThing']);
  assert.deepEqual(got.b.sort(), ['everyone', 'roomThing'], 'personal deltas go only to their owner');
  assert.deepEqual(got.c, ['everyone'], 'room deltas stay in their room');
  const rejoin = await connect(s.base, b.token); t.after(() => rejoin.close());
  const snapshot = (await ask(rejoin, 'room:join', { room: 'WS-A' })).scene.world.map(w => w.objectId).sort();
  assert.deepEqual(snapshot, ['everyone', 'roomThing'], 'late joiners receive the current state');
});
