import test from 'node:test';
import assert from 'node:assert/strict';
import { stateKey } from '../server/services/worldState.js';
import { LIMITS } from '../server/services/coop.js';
import { ask, connect, delay, guest, nextEvent, startServer } from './helpers.mjs';

// "Ánh sáng trong Chánh điện", played through over real sockets with the shipped content and maps.
// Walking is not simulated: players are placed next to what they need; travelling NPCs stand beside them.
async function setup(t, names) {
  const saved = LIMITS.inviteCooldownMs; LIMITS.inviteCooldownMs = 0; t.after(() => { LIMITS.inviteCooldownMs = saved; });
  const s = await startServer({ ownerToken: 'owner-secret' }); t.after(s.close);
  const ctx = s.game.ctx, pin = { sceneId: 'gate', x: 0, y: 0 };
  const real = ctx.npcDirector.stateAt.bind(ctx.npcDirector);
  ctx.npcDirector.stateAt = (id, now) => ctx.npcDirector.definitions.has(id) ? { id, sceneId: pin.sceneId, x: pin.x, y: pin.y + 30, activity: 'đứng chờ' } : real(id, now);
  const players = [];
  for (const name of names) {
    const g = guest(s.game, name), socket = await connect(s.base, g.token);
    t.after(() => socket.close());
    await ask(socket, 'room:join', { room: 'HALL' });
    players.push({ ...g, socket });
  }
  const live = p => ctx.rooms.findPlayer(p.id);
  const place = (p, sceneId, x, y) => { Object.assign(live(p), { sceneId, x, y }); Object.assign(pin, { sceneId, x, y }); };
  const at = (p, sceneId, id, dy = 40) => { const o = ctx.world.object(sceneId, id); place(p, sceneId, o.x, o.y + dy); };
  async function say(p, npcId, ...steps) {
    let res = await ask(p.socket, 'dialogue:start', { npcId });
    assert.ok(res.ok, res.error);
    const nodes = [res.view.node];
    for (;;) {
      const v = res.view;
      if (v.end) break;
      if (v.choices.length) {
        const step = steps.shift();
        if (step === undefined) { await ask(p.socket, 'dialogue:end'); break; }
        res = await ask(p.socket, 'dialogue:choose', { choiceId: step });
      } else res = await ask(p.socket, 'dialogue:next');
      assert.ok(res.ok, res.error); nodes.push(res.view.node);
    }
    return { nodes, story: res.story };
  }
  const journey = story => story.objectives.find(o => o.storyId === 'light-hall');
  const act = (p, action, payload) => ask(p.socket, 'coop:act', { action, payload });
  return { s, ctx, players, live, place, at, say, journey, act };
}

// Stages 1–3 for one player; returns their story state at stage 4.
async function toStageFour({ ctx, place, at, say, journey }, p) {
  place(p, 'gate', 900, 800);
  await say(p, 'novice', 'first', 'fav', 'lake');
  let { nodes, story } = await say(p, 'novice', 'lamp', 'accept');
  assert.deepEqual(nodes, ['hall-1', 'hall-lamp', 'hall-accept']);
  assert.equal(journey(story).chapter, 2); assert.equal(journey(story).journey, true);
  place(p, 'library', 650, 450);
  await say(p, 'librarian', 'read', 'bye');
  ({ nodes } = await say(p, 'librarian'));
  assert.equal(nodes[0], 'hall-minh');
  at(p, 'library', 'oldBook');
  ({ nodes, story } = await say(p, 'oldBook', 'p31', 'this', 'p27', 'this'));
  assert.deepEqual(nodes, ['toc', 'p31', 'not-this', 'toc', 'p27', 'lamp-page'], 'a lamp with clouds but no lotus base is the wrong page');
  assert.equal(journey(story).chapter, 3);
  at(p, 'mainHall', 'flowerTable');
  assert.match((await ask(p.socket, 'world:interact', { objectId: 'flowerTable', choice: 'rose' })).error, /chọn một loại hoa/);
  await ask(p.socket, 'world:interact', { objectId: 'flowerTable', choice: 'sen' });
  at(p, 'mainHall', 'altarVases');
  const offered = await ask(p.socket, 'world:interact', { objectId: 'altarVases' });
  assert.match(offered.result.message, /đặt hoa sen vào bình/);
  assert.match((await ask(p.socket, 'world:interact', { objectId: 'altarVases' })).error, /lấy hoa/, 'one flower, one offering');
  at(p, 'mainHall', 'candleRack');
  const candle = await ask(p.socket, 'world:interact', { objectId: 'candleRack', choice: 'light' });
  assert.match(candle.result.message, /thắp một ngọn nến/);
  assert.equal(journey(candle.story).step, 'find', 'two of three preparations are enough');
  at(p, 'mainHall', 'nicheA');
  assert.equal((await say(p, 'nicheA')).nodes[0], 'search');
  at(p, 'mainHall', 'nicheC');
  ({ story } = await say(p, 'nicheC'));
  assert.equal(journey(story).chapter, 4);
  return story;
}

test('journey solo: all five stages with An helping, reward once, telemetry, replay', async t => {
  const env = await setup(t, ['Mai']), { s, ctx, players: [a], at, say, journey, act } = env;
  await toStageFour(env, a);
  assert.match((await ask(a.socket, 'coop:invite', { kind: 'lamp', targetId: null })).session.guide, /bàn gỗ/);
  at(a, 'mainHall', 'nicheC');
  assert.match((await ask(a.socket, 'coop:ready')).error, /bàn gỗ/);
  at(a, 'mainHall', 'lampTable');
  assert.equal((await ask(a.socket, 'coop:ready')).session.status, 'active');
  await act(a, 'clean');
  assert.match((await act(a, 'turn', { mark: 'sen' })).error ?? '', /soi dấu khắc/, 'solo: look at the mark before turning the base');
  at(a, 'mainHall', 'nicheC');
  const look = await act(a, 'look');
  const mark = ctx.coop.sessionOf(a.id).data.mark;
  assert.ok(look.private); assert.match(look.message, /khắc hình/);
  at(a, 'mainHall', 'lampTable');
  const wrong = ['sen', 'trang', 'may', 'song'].find(m => m !== mark);
  assert.equal((await act(a, 'turn', { mark: wrong })).wrong, true);
  await act(a, 'turn', { mark });
  at(a, 'mainHall', 'nicheC');
  await act(a, 'bring');
  const chapters = [];
  a.socket.on('story:update', u => chapters.push(...u.chapters));
  const done = nextEvent(a.socket, 'coop:complete');
  await act(a, 'light');
  assert.match((await done).memory, /chú tiểu An/);
  await delay(50);
  assert.deepEqual(ctx.worldState.value(stateKey('personal', a.id, 'mainHall', 'ancientLamp', 'state')).lit, true);
  let { story } = await ask(a.socket, 'story:state');
  assert.equal(journey(story).chapter, 5);
  env.place(a, 'courtyard', 900, 760);
  const { nodes } = await say(a, 'novice');
  assert.equal(nodes[0], 'hall-thanks');
  await delay(50);
  const finale = chapters.find(c => c.storyId === 'light-hall' && c.finale);
  assert.ok(finale && finale.teaser && finale.journey, 'an ending moment with a hint of what comes next');
  assert.deepEqual(finale.granted.map(g => g.id).sort(), ['badge:hallLight', 'decor:hallLamp']);
  assert.equal(ctx.repos.narrative.progress(a.id)['light-hall'].status, 'completed');
  // Replay: new lines, the hall keeps its light, no second reward.
  const after = await say(a, 'novice', 'other', 'hall-after', 'bye'); // An now offers the bell story; ask about the lamp instead
  assert.ok(after.nodes.includes('hall-after'));
  assert.equal(ctx.repos.players.grant(a.id, 'badge:hallLight', 'again'), false);
  assert.equal((await ask(a.socket, 'coop:invite', { kind: 'lamp', targetId: null })).error.includes('phủ khăn'), true, 'the lamp ritual is not repeated for rewards');
  // Owner statistics: no names, just counts and minutes.
  assert.equal((await s.http('GET', '/api/owner/journey')).status, 403);
  const stats = (await fetch(`${s.base}/api/owner/journey`, { headers: { 'x-owner-token': 'owner-secret' } }).then(r => r.json()));
  assert.equal(stats.started, 1); assert.equal(stats.completed, 1); assert.equal(stats.withFriendRate, 0);
  assert.deepEqual(stats.stages.map(st => st.reached), [1, 1, 1, 1, 1]);
  assert.ok(!JSON.stringify(stats).includes('Mai'), 'no player names in telemetry');
  const rows = s.game.db.prepare('SELECT * FROM journey_events').all();
  assert.ok(rows.every(r => r.player_key.length === 16 && r.player_key !== a.id));
});

test('journey together: a friend helps at stage 4 without their own progress changing; reload and pause', async t => {
  const env = await setup(t, ['Mai', 'Bình']), { s, ctx, players: [a, b], at, journey, act } = env;
  await toStageFour(env, a);
  // Reload in the middle of the journey: the checkpoint is kept.
  a.socket.close();
  const again = await connect(s.base, a.token); t.after(() => again.close());
  const joined = await ask(again, 'room:join', { room: 'HALL' });
  assert.equal(journey(joined.story).chapter, 4);
  a.socket = again;
  // Pausing hides nothing on the server but is remembered (the client hides the objective).
  assert.equal((await ask(a.socket, 'journey:pause', { on: true })).story.journey.paused, true);
  assert.equal((await ask(a.socket, 'journey:pause', { on: false })).story.journey.paused, false);
  await ask(a.socket, 'journey:seen', { storyId: 'light-hall', stage: 4 });
  assert.ok((await ask(a.socket, 'story:state')).story.journey.seen.includes('light-hall.4'));
  assert.match((await ask(b.socket, 'coop:invite', { kind: 'lamp', targetId: a.id })).error, /phủ khăn/, 'only someone at that stage can start it');
  const invited = nextEvent(b.socket, 'coop:invite');
  await ask(a.socket, 'coop:invite', { kind: 'lamp', targetId: b.id });
  await ask(b.socket, 'coop:respond', { sessionId: (await invited).id, accept: true });
  at(a, 'mainHall', 'lampTable'); at(b, 'mainHall', 'nicheC');
  await ask(a.socket, 'coop:ready'); await ask(b.socket, 'coop:ready');
  assert.match((await act(a, 'open')).error, /không phải của bạn/);
  await act(a, 'clean'); await act(b, 'open');
  assert.match((await act(a, 'look')).error, /Người tìm chỗ đặt/, 'the preparer must ask the finder');
  const seen = await act(b, 'look');
  const mark = ctx.coop.sessionOf(a.id).data.mark;
  assert.match(seen.message, new RegExp({ sen: 'hoa sen', trang: 'vầng trăng', may: 'áng mây', song: 'con sóng' }[mark]));
  await act(a, 'turn', { mark });
  at(a, 'mainHall', 'nicheC', 70);
  await act(a, 'bring');
  assert.match((await act(a, 'light')).message, /Đợi Bình/);
  const done = nextEvent(b.socket, 'coop:complete');
  await act(b, 'light');
  assert.match((await done).memory, /Cùng Mai/);
  await delay(50);
  assert.equal(journey((await ask(a.socket, 'story:state')).story).chapter, 5);
  assert.equal(ctx.repos.narrative.progress(b.id)['light-hall'], undefined, 'the helper keeps their own progress');
  assert.equal(ctx.worldState.value(stateKey('personal', b.id, 'mainHall', 'ancientLamp', 'state')).lit, true, 'both see the lamp they lit');
  const coopRows = s.game.db.prepare("SELECT event, solo FROM journey_events WHERE event LIKE 'coop_%'").all();
  assert.ok(coopRows.some(r => r.event === 'coop_completed:lamp' && r.solo === 0));
});
