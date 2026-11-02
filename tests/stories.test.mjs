import test from 'node:test';
import assert from 'node:assert/strict';
import { stateKey } from '../server/services/worldState.js';
import { GARDEN_STAGES } from '../server/services/worldActions.js';
import { ask, connect, guest, startServer } from './helpers.mjs';

// The three shipped stories, played end to end over real sockets with the shipped content and map objects.
// Walking between areas is covered elsewhere; here a player is placed next to whatever they need to reach.
async function stage(t, names) {
  const s = await startServer(); t.after(s.close);
  const ctx = s.game.ctx, pin = { sceneId: 'gate', x: 0, y: 0 };
  // Travelling NPCs stand right beside the player, wherever the routine would have them.
  const realStateAt = ctx.npcDirector.stateAt.bind(ctx.npcDirector);
  ctx.npcDirector.stateAt = (id, now) => ctx.npcDirector.definitions.has(id) ? { id, sceneId: pin.sceneId, x: pin.x, y: pin.y + 30, activity: 'đứng chờ' } : realStateAt(id, now);
  const players = [];
  for (const name of names) {
    const g = guest(s.game, name), socket = await connect(s.base, g.token);
    t.after(() => socket.close());
    await ask(socket, 'room:join', { room: 'STORY' });
    players.push({ ...g, socket });
  }
  const self = p => ctx.rooms.get('STORY').players.get(p.id);
  const place = (p, sceneId, x, y) => { Object.assign(self(p), { sceneId, x, y }); Object.assign(pin, { sceneId, x, y }); };
  const at = (p, sceneId, objectId, dy = 60) => { const o = ctx.world.object(sceneId, objectId); place(p, sceneId, o.x, o.y + dy); };
  // Plays one conversation: each step is a choice id or {text} for a written answer; plain lines are advanced.
  async function say(p, npcId, ...steps) {
    let res = await ask(p.socket, 'dialogue:start', { npcId });
    assert.ok(res.ok, res.error);
    const nodes = [res.view.node];
    for (;;) {
      const v = res.view;
      if (v.end) break;
      if (v.input || v.choices.length) {
        const step = steps.shift();
        if (step === undefined) { await ask(p.socket, 'dialogue:end'); break; }
        res = v.input ? await ask(p.socket, 'dialogue:submit', { text: step.text }) : await ask(p.socket, 'dialogue:choose', { choiceId: step });
      } else res = await ask(p.socket, 'dialogue:next');
      assert.ok(res.ok, res.error); nodes.push(res.view.node);
    }
    return { nodes, story: res.story };
  }
  const objective = (story, id) => story.objectives.find(o => o.storyId === id);
  return { s, ctx, players, place, at, say, objective };
}

test('story “Chiếc chuông bị lãng quên”: clue, lotus puzzle, re-hung bell visible to the room, rewards once', async t => {
  const { ctx, players: [a, b], at, place, say, objective } = await stage(t, ['Mai', 'Bình']);
  place(a, 'gate', 900, 800);
  await say(a, 'novice', 'first', 'fav', 'lake'); // first meeting
  await say(a, 'novice', 'later'); // the journey offer comes first; An's bell story is offered after it
  let { nodes, story } = await say(a, 'novice', 'accept');
  assert.deepEqual(nodes, ['bell-1', 'bell-1-accept']);
  assert.equal(objective(story, 'an-bell').step, 'ask-minh');
  place(a, 'library', 650, 450);
  await say(a, 'librarian', 'read', 'bye');
  ({ nodes } = await say(a, 'librarian'));
  assert.equal(nodes[0], 'bell-ask', 'Thầy Minh answers the question the story asks');
  at(a, 'library', 'oldLedger');
  ({ story } = await say(a, 'oldLedger'));
  assert.equal(objective(story, 'an-bell').chapter, 3);
  at(a, 'bellTower', 'bellChest');
  ({ nodes } = await say(a, 'bellChest', 'full'));
  assert.deepEqual(nodes, ['lid', 'stuck', 'lid'], 'the wrong lotus snaps back');
  ({ nodes, story } = await say(a, 'bellChest', 'bud', 'half', 'full'));
  assert.equal(nodes.at(-1), 'opened');
  assert.equal(objective(story, 'an-bell').step, 'tell-an');
  place(a, 'gate', 900, 800);
  ({ nodes } = await say(a, 'novice'));
  assert.equal(nodes[0], 'bell-3-found');
  assert.equal(ctx.worldState.value(stateKey('room', 'STORY', 'gate', 'bellHook', 'hung')), null, 'not hung yet');
  at(a, 'gate', 'bellHook', 40);
  await say(a, 'bellHook', 'hang');
  place(a, 'gate', 900, 800);
  const updates = [];
  a.socket.on('story:update', u => updates.push(u));
  ({ nodes, story } = await say(a, 'novice'));
  assert.equal(nodes[0], 'bell-4-thanks');
  assert.equal(story.objectives.some(o => o.storyId === 'an-bell'), false, 'story finished');
  assert.equal(ctx.repos.narrative.progress(a.id)['an-bell'].status, 'completed');
  const items = ctx.repos.players.items(a.id);
  assert.ok(items.has('decor:windbell') && items.has('badge:smallBell'));
  assert.equal(ctx.worldState.value(stateKey('room', 'STORY', 'gate', 'bellHook', 'hung')), true, 'the bell hangs for everyone in the room');
  assert.ok(updates.some(u => u.chapters.some(c => c.finale)), 'the finale is announced');
  ({ nodes } = await say(a, 'novice', 'bell-after', 'bye'));
  assert.ok(nodes.includes('bell-after'), 'An remembers the finished story: ' + nodes);
  assert.equal(ctx.repos.players.items(b.id).has('decor:windbell'), false, 'rewards are per player');
  at(b, 'gate', 'bellHook', 40);
  ({ nodes } = await say(b, 'bellHook'));
  assert.equal(nodes[0], 'chime', 'another player sees the bell already hung');
});

test('story “Khu vườn bị lãng quên”: shared restoration with a helper, seed gate, bloom and reward', async t => {
  const saved = GARDEN_STAGES.map(s => s.cooldown);
  for (const s of GARDEN_STAGES) s.cooldown = 0;
  t.after(() => GARDEN_STAGES.forEach((s, i) => { s.cooldown = saved[i]; }));
  const { ctx, players: [a, b], at, place, say, objective } = await stage(t, ['Lan', 'Huy']);
  const work = async (p, times) => { let last; for (let i = 0; i < times; i++) { at(p, 'zenGarden', 'oldGarden', 70); last = await ask(p.socket, 'world:interact', { objectId: 'oldGarden' }); assert.ok(last.ok, last.error); } return last; };
  place(a, 'zenGarden', 820, 940);
  await say(a, 'gardener', 'slow', 'thanks');
  let { story } = await say(a, 'gardener', 'accept');
  assert.equal(objective(story, 'lam-garden').step, 'clear');
  at(a, 'zenGarden', 'oldGarden', 400);
  assert.match((await ask(a.socket, 'world:interact', { objectId: 'oldGarden' })).error, /gần/);
  await work(a, 3); await work(b, 3); // Huy has no story, but helping still counts for the room
  assert.equal(ctx.worldState.value(stateKey('room', 'STORY', 'zenGarden', 'oldGarden', 'restoration')).stage, 1);
  ({ story } = await ask(a.socket, 'story:state'));
  assert.equal(objective(story, 'lam-garden').step, 'ask-seed', 'the shared world advanced Lan’s story');
  at(a, 'zenGarden', 'oldGarden', 70);
  assert.match((await ask(a.socket, 'world:interact', { objectId: 'oldGarden' })).error, /hạt giống/, 'no planting without seeds');
  place(a, 'zenGarden', 820, 940);
  await say(a, 'gardener');
  at(a, 'bambooForest', 'wildSeed', 40);
  ({ story } = await say(a, 'wildSeed', 'gather'));
  assert.equal(objective(story, 'lam-garden').step, 'plant');
  await work(a, 3);
  await work(a, 2); await work(b, 2);
  ({ story } = await ask(a.socket, 'story:state'));
  assert.equal(objective(story, 'lam-garden').step, 'tell');
  place(a, 'zenGarden', 820, 940);
  const { nodes } = await say(a, 'gardener');
  assert.equal(nodes[0], 'garden-3-bloom');
  assert.equal(ctx.repos.narrative.progress(a.id)['lam-garden'].status, 'completed');
  assert.ok(ctx.repos.players.items(a.id).has('decor:wildflower'));
  const done = await work(b, 2);
  assert.equal(done.result.stage, 4, 'anyone can finish decorating');
  const helpers = ctx.worldState.value(stateKey('room', 'STORY', 'zenGarden', 'oldGarden', 'restoration')).helpers;
  assert.deepEqual(new Set(helpers), new Set(['Lan', 'Huy']), 'the garden remembers who helped');
  assert.equal((await work(a, 1)).result.finished, true);
});

test('story “Những bức thư chưa gửi”: letters, private written letter, chosen ending', async t => {
  const { ctx, players: [a], at, place, say, objective } = await stage(t, ['Thu']);
  place(a, 'library', 650, 450);
  await say(a, 'librarian', 'read', 'bye');
  let { story, nodes } = await say(a, 'librarian', 'accept');
  assert.deepEqual(nodes, ['letters-1', 'letters-1-accept']);
  at(a, 'library', 'letterBox');
  ({ story } = await say(a, 'letterBox', 'self'));
  assert.equal(objective(story, 'minh-letters').step, 'clue');
  place(a, 'library', 650, 450);
  await say(a, 'librarian');
  at(a, 'lotusLake', 'lakeStone');
  ({ story } = await say(a, 'lakeStone', 'still'));
  assert.equal(objective(story, 'minh-letters').step, 'invite');
  place(a, 'library', 650, 450);
  ({ nodes, story } = await say(a, 'librarian', { text: 'Gửi mẹ: con xin lỗi vì hôm ấy đã nói to.' }, 'wind'));
  assert.deepEqual(nodes, ['letters-3-write', 'letters-3-choose', 'ending-wind']);
  assert.equal(ctx.repos.narrative.flags(a.id)['minh.letterEnding'], 'wind');
  assert.equal(ctx.repos.narrative.progress(a.id)['minh-letters'].status, 'completed');
  assert.ok(ctx.repos.players.items(a.id).has('badge:letter'));
  const journal = ctx.db.prepare("SELECT text FROM journal_entries WHERE player_id = ?").all(a.id).map(r => r.text);
  assert.ok(journal.some(t => t.startsWith('Lá thư chưa gửi: Gửi mẹ')), 'the letter is kept as a private journal note');
});
