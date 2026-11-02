import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../server/database/db.js';
import { createRepositories } from '../server/repositories/index.js';
import { WorldStateManager, stateKey } from '../server/services/worldState.js';
import { createProgression } from '../server/services/progression.js';
import { createNarrative, loadNarrativeContent, validateContent } from '../server/services/narrative.js';
import { loadConfig } from '../server/config/index.js';
import { DEFAULT_APPEARANCE } from '../public/js/shared/rules.js';
import { ask, connect, guest, startServer } from './helpers.mjs';

const CONTENT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'server', 'content');
const fixture = () => validateContent({
  dialogues: [{
    npc: 'guide', name: 'GUIDE', entries: [{ when: { met: false }, node: 'hi' }, { when: { story: { trip: { chapter: 1, step: 'accept' } } }, node: 'offer' }, { node: 'again' }],
    nodes: {
      hi: { lines: ['Hello.'], next: 'offer' },
      offer: { lines: ['Help me?'], choices: [{ id: 'yes', text: 'Yes', next: 'accepted', remember: { key: 'help', value: true } }, { id: 'later', text: 'Later' }, { id: 'secret', text: 'Secret', when: { flags: { never: true } }, next: 'accepted' }] },
      accepted: { lines: ['Thanks! Go to the lake.'] },
      again: { lines: [['Back again.'], ['Hi again.']], choices: [{ id: 'remember', text: 'Remember me?', when: { choices: { help: true } }, next: 'remembered' }, { id: 'bye', text: 'Bye' }] },
      remembered: { lines: ['You said you would help.'] },
    },
  }],
  stories: [{
    id: 'trip', title: 'Trip', npc: 'guide', chapters: [
      { n: 1, title: 'Ask', steps: [{ id: 'accept', objective: 'Agree to help', trigger: { type: 'dialogue', npc: 'guide', node: 'accepted' }, log: 'You agreed.' }, { id: 'lake', objective: 'Visit the lake', trigger: { type: 'visit', scene: 'lotusLake' } }], reward: { items: ['acc:hat'], flags: { tripChapter1: true } } },
      { n: 2, title: 'Sweep', steps: [{ id: 'sweep', objective: 'Sweep leaves', trigger: { type: 'activity', activity: 'sweep' } }], reward: { world: [{ scope: 'room', scene: 'courtyard', object: 'leaves', type: 'clean', value: true }] } },
    ],
  }],
});

function setup(clockStart = Date.UTC(2026, 10, 2, 3)) {
  let now = clockStart;
  const db = openDatabase(':memory:'), repos = createRepositories(db), config = loadConfig({}, { dbFile: ':memory:' });
  const worldState = new WorldStateManager(repos.world, () => now), progression = createProgression(repos, config);
  for (const id of ['p1', 'p2']) repos.players.create({ id, tokenHash: `h-${id}`, name: id, appearance: DEFAULT_APPEARANCE });
  const narrative = createNarrative({ repos, config, worldState, progression, content: fixture(), clock: () => now });
  return { db, repos, worldState, narrative, tick: ms => { now += ms; }, p1: { id: 'p1', room: 'R1' }, p2: { id: 'p2', room: 'R1' } };
}

test('dialogue graph: first meeting, branching, hidden choices, memory and once-a-day familiarity', () => {
  const { narrative, repos, tick, p1, p2, db } = setup();
  let { session, view } = narrative.begin(p1, 'guide');
  assert.equal(view.node, 'hi'); assert.equal(view.end, false);
  assert.throws(() => narrative.choose(p1, session, 'yes'), /không còn phù hợp/, 'cannot answer before reaching the question');
  view = narrative.next(p1, session);
  assert.deepEqual(view.choices.map(c => c.id), ['yes', 'later'], 'choices whose condition fails are hidden');
  assert.throws(() => narrative.choose(p1, session, 'secret'), /không còn phù hợp/, 'and cannot be forced');
  // The second player's conversation is independent.
  const other = narrative.begin(p2, 'guide');
  assert.equal(other.view.node, 'hi');
  view = narrative.choose(p1, session, 'yes');
  assert.equal(view.node, 'accepted'); assert.equal(view.end, true);
  assert.equal(repos.narrative.choices('p1').guide.help, true);
  assert.equal(repos.narrative.choices('p2').guide, undefined, 'choices are private to each player');

  ({ session, view } = narrative.begin(p1, 'guide'));
  assert.equal(view.node, 'again', 'the introduction is not repeated once acquainted');
  assert.deepEqual(view.choices.map(c => c.id), ['remember', 'bye'], 'remembered answers unlock replies');
  assert.equal(repos.narrative.relation('p1', 'guide').familiarity, 0, 'no familiarity on the first day');
  narrative.begin(p1, 'guide');
  assert.equal(repos.narrative.relation('p1', 'guide').familiarity, 0, 'talking again the same day adds nothing');
  tick(24 * 3600 * 1000);
  narrative.begin(p1, 'guide');
  assert.equal(repos.narrative.relation('p1', 'guide').familiarity, 1, 'a new day of conversation adds one');
  db.close();
});

test('story engine: dialogue, visit and activity triggers, rewards once, world changes and journal', () => {
  const { narrative, repos, worldState, p1, p2, db } = setup();
  assert.deepEqual(narrative.state(p1).highlights, ['guide'], 'an available story marks its NPC');
  narrative.start(p1, 'trip');
  assert.equal(narrative.start(p1, 'trip'), null, 'a story starts once');
  let { session } = narrative.begin(p1, 'guide');
  narrative.next(p1, session);
  narrative.choose(p1, session, 'yes');
  let state = narrative.state(p1);
  assert.equal(state.objectives[0].step, 'lake'); assert.equal(state.objectives[0].text, 'Visit the lake');
  assert.deepEqual(narrative.handle(p1, { type: 'visit', scene: 'zenGarden' }), [], 'unrelated events do nothing');
  const done = narrative.handle(p1, { type: 'visit', scene: 'lotusLake' });
  assert.equal(done[0].chapterDone.n, 1); assert.deepEqual(done[0].chapterDone.granted.map(g => g.id), ['acc:hat']);
  assert.ok(repos.players.items('p1').has('acc:hat')); assert.equal(repos.narrative.flags('p1').tripChapter1, true);
  assert.deepEqual(narrative.handle(p1, { type: 'visit', scene: 'lotusLake' }), [], 'a finished chapter cannot pay out twice');
  assert.equal(narrative.state(p2).objectives.length, 0, 'progress is per player');
  narrative.handle(p1, { type: 'activity', activity: 'sweep' });
  assert.equal(repos.narrative.progress('p1').trip.status, 'completed');
  assert.equal(worldState.value(stateKey('room', 'R1', 'courtyard', 'leaves', 'clean')), true, 'a chapter can change the world');
  const journal = narrative.journal(p1);
  assert.equal(journal.stories[0].status, 'completed');
  assert.deepEqual(journal.stories[0].chapters.map(c => c.status), ['done', 'done']);
  assert.ok(journal.stories[0].chapters[0].beats.some(b => b.text === 'You agreed.'), 'the journal retells each chapter');
  assert.equal(journal.npcs[0].npc, 'guide');
  db.close();
});

test('content validation rejects broken references; shipped content loads', () => {
  const good = fixture();
  assert.ok(good.dialogues.has('guide'));
  const broken = JSON.parse(JSON.stringify({ dialogues: [...good.dialogues.values()], stories: [...good.stories.values()] }));
  broken.dialogues[0].nodes.offer.choices[0].next = 'missing';
  assert.throws(() => validateContent(broken), /nút thiếu missing/);
  const badStory = JSON.parse(JSON.stringify({ dialogues: [...good.dialogues.values()], stories: [...good.stories.values()] }));
  badStory.stories[0].chapters[0].steps[0].trigger.node = 'nope';
  assert.throws(() => validateContent(badStory), /không tồn tại/);
  const shipped = loadNarrativeContent(CONTENT);
  for (const npc of ['novice', 'gardener', 'librarian']) assert.ok(shipped.dialogues.has(npc), npc);
});

test('conversations over Socket.IO: proximity, private sessions, persistence across reconnects', async t => {
  const s = await startServer(); t.after(s.close);
  // Pin An at the gate: this test is about conversations; routines are covered by npc-schedule.test.mjs.
  const realStateAt = s.game.ctx.npcDirector.stateAt.bind(s.game.ctx.npcDirector);
  s.game.ctx.npcDirector.stateAt = (id, now) => id === 'novice' ? { id, sceneId: 'gate', x: 920, y: 720, activity: 'đón khách ở cổng' } : realStateAt(id, now);
  const a = guest(s.game, 'An'), b = guest(s.game, 'Bình');
  s.game.ctx.repos.players.saveLocation(a.id, 'gate', 900, 760); s.game.ctx.repos.players.saveLocation(b.id, 'gate', 900, 1000);
  let sa = await connect(s.base, a.token); const sb = await connect(s.base, b.token);
  t.after(() => { sa.close(); sb.close(); });
  await ask(sa, 'room:join', { room: 'TALK' }); await ask(sb, 'room:join', { room: 'TALK' });
  assert.match((await ask(sb, 'dialogue:start', { npcId: 'novice' })).error, /đến gần/);
  assert.match((await ask(sa, 'dialogue:start', { npcId: 'gardener' })).error, /không ở khu vực/, 'Bác Lâm never comes to the gate');
  assert.match((await ask(sa, 'dialogue:choose', { choiceId: 'first' })).error, /kết thúc/, 'no choices without a conversation');
  const first = await ask(sa, 'dialogue:start', { npcId: 'novice' });
  assert.equal(first.view.node, 'intro'); assert.equal(first.view.name, 'AN · CHÚ TIỂU');
  let view = (await ask(sa, 'dialogue:choose', { choiceId: 'first' })).view;
  view = (await ask(sa, 'dialogue:choose', { choiceId: 'fav' })).view;
  assert.equal(view.node, 'fav');
  view = (await ask(sa, 'dialogue:choose', { choiceId: 'library' })).view;
  assert.equal(view.end, true);
  sa.close();
  sa = await connect(s.base, a.token);
  await ask(sa, 'room:join', { room: 'TALK' });
  const again = await ask(sa, 'dialogue:start', { npcId: 'novice' });
  assert.notEqual(again.view.node, 'intro', 'An remembers the player after a reconnect');
  assert.equal(again.view.node, 'hall-1', 'the second talk offers the first journey');
  const menu = (await ask(sa, 'dialogue:choose', { choiceId: 'other' })).view;
  assert.ok(menu.choices.some(c => c.id === 'been-library'), 'and the remembered favourite place');
  assert.ok(!menu.choices.some(c => c.id === 'fav'), 'the question is not asked again');
  const journal = (await s.http('GET', '/api/stories', undefined, a.token)).data;
  assert.equal(journal.npcs.find(n => n.npc === 'novice').familiarity, 'Mới gặp');
});
