import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PHASES } from '../../public/js/systems/DayNightSystem.js';
import { WeatherSystem } from '../../public/js/systems/WeatherSystem.js';
import { ITEMS } from '../../public/js/shared/rules.js';
import { stateKey } from './worldState.js';

export const FAMILIARITY_MAX = 5;
export const FAMILIARITY_LABELS = ['Mới gặp', 'Quen mặt', 'Quen biết', 'Thân quen', 'Gắn bó', 'Tri kỷ'];

// ── Content loading and validation ─────────────────────────────────────────────────────────────────────────
export function loadNarrativeContent(dir) {
  const read = sub => { const folder = path.join(dir, sub); return fs.existsSync(folder) ? fs.readdirSync(folder).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'))) : []; };
  return validateContent({ dialogues: read('dialogues'), stories: read('stories') });
}

// Fails fast on broken references so a typo in content never strands a player mid-story.
export function validateContent({ dialogues, stories }) {
  const graphs = new Map(dialogues.map(d => [d.npc, d])), storyMap = new Map(stories.map(s => [s.id, s]));
  for (const graph of dialogues) {
    if (!graph.npc || !graph.name || !Array.isArray(graph.entries) || !graph.nodes) throw Error(`Hội thoại không hợp lệ: ${graph.npc}`);
    const has = id => Boolean(graph.nodes[id]);
    for (const entry of graph.entries) if (!has(entry.node)) throw Error(`${graph.npc}: mục vào trỏ tới nút thiếu ${entry.node}`);
    if (graph.entries.at(-1).when) throw Error(`${graph.npc}: mục vào cuối cùng phải không điều kiện`);
    for (const [id, node] of Object.entries(graph.nodes)) {
      if (!Array.isArray(node.lines) || !node.lines.length) throw Error(`${graph.npc}/${id}: thiếu lời`);
      if (node.next && !has(node.next)) throw Error(`${graph.npc}/${id}: next trỏ tới nút thiếu ${node.next}`);
      for (const choice of node.choices || []) {
        if (!choice.id || !choice.text) throw Error(`${graph.npc}/${id}: lựa chọn thiếu id/text`);
        if (choice.next && !has(choice.next)) throw Error(`${graph.npc}/${id}/${choice.id}: next trỏ tới nút thiếu ${choice.next}`);
      }
    }
  }
  for (const story of stories) {
    if (!story.id || !story.title || !Array.isArray(story.chapters) || !story.chapters.length) throw Error(`Câu chuyện không hợp lệ: ${story.id}`);
    story.chapters.forEach((chapter, i) => {
      if (chapter.n !== i + 1 || !chapter.title || !chapter.steps?.length) throw Error(`${story.id}: chương ${i + 1} không hợp lệ`);
      for (const step of chapter.steps) {
        if (!step.id || !step.objective || !step.trigger?.type) throw Error(`${story.id}/${chapter.n}: bước thiếu id/objective/trigger`);
        const t = step.trigger;
        if (t.type === 'dialogue' && !graphs.get(t.npc)?.nodes[t.node]) throw Error(`${story.id}/${step.id}: nút hội thoại ${t.npc}/${t.node} không tồn tại`);
      }
      for (const item of chapter.reward?.items || []) if (!ITEMS[item]) throw Error(`${story.id}: vật phẩm thưởng ${item} không tồn tại`);
    });
    if (story.requires && !storyMap.has(story.requires.story)) throw Error(`${story.id}: yêu cầu câu chuyện thiếu ${story.requires.story}`);
  }
  return { dialogues: graphs, stories: storyMap };
}

// ── Engine ────────────────────────────────────────────────────────────────────────────────────────────────
export function createNarrative({ repos, config, worldState, progression, content, clock = () => Date.now() }) {
  const { narrative } = repos;
  const day = () => progression.keys(clock()).daily;
  const phaseAt = now => { const hour = ((now / 3600000) + config.tzOffsetMinutes / 60) % 24; return PHASES.find(p => hour >= p[2] && hour < p[3])[0]; };

  // Everything a condition may look at, built once per dialogue step from server-side data only.
  function context(player, npcId) {
    const now = clock();
    return {
      now, npcId, flags: narrative.flags(player.id), progress: narrative.progress(player.id), choices: narrative.choices(player.id)[npcId] || {},
      relation: narrative.relation(player.id, npcId), phase: phaseAt(now), weather: new WeatherSystem(player.room).target(now),
      world: (scope, sceneId, objectId, type) => worldState.value(stateKey(scope, scope === 'personal' ? player.id : player.room, sceneId, objectId, type)),
    };
  }

  function storyStatus(ctx, storyId) { const p = ctx.progress[storyId]; return p ? p.status : 'none'; }
  function check(when, ctx) {
    if (!when) return true;
    if (when.met !== undefined && Boolean(ctx.relation) !== when.met) return false;
    if (when.familiarity !== undefined && (ctx.relation?.familiarity || 0) < when.familiarity) return false;
    if (when.phase && !when.phase.includes(ctx.phase)) return false;
    if (when.weather && !when.weather.includes(ctx.weather)) return false;
    for (const [flag, value] of Object.entries(when.flags || {})) if ((ctx.flags[flag] ?? null) !== value) return false;
    for (const flag of when.notFlags || []) if (ctx.flags[flag]) return false;
    for (const [key, value] of Object.entries(when.choices || {})) if (ctx.choices[key] !== value) return false;
    for (const key of when.notChoices || []) if (ctx.choices[key] !== undefined) return false;
    for (const [storyId, rule] of Object.entries(when.story || {})) {
      if (typeof rule === 'string') { if (storyStatus(ctx, storyId) !== rule) return false; continue; }
      // A chapter/step rule means "the player is at this point now", so a finished story never matches it.
      const p = ctx.progress[storyId], status = rule.status || (rule.chapter !== undefined || rule.step ? 'active' : null);
      if (!p || (status && p.status !== status) || (rule.chapter !== undefined && p.chapter !== rule.chapter) || (rule.step && p.step !== rule.step) || (rule.chapterAtLeast && p.chapter < rule.chapterAtLeast)) return false;
    }
    for (const w of when.world || []) { const raw = ctx.world(w.scope, w.scene, w.object, w.type), v = w.field ? raw?.[w.field] : raw; if (w.equals !== undefined && v !== w.equals) return false; if (w.gte !== undefined && !(Number(v) >= w.gte)) return false; }
    return true;
  }

  // ── Stories ────────────────────────────────────────────────────────────────────────────────────────────
  const chapterOf = (story, n) => story.chapters[n - 1];
  function currentStep(story, p) { return p && p.status === 'active' ? chapterOf(story, p.chapter).steps.find(s => s.id === p.step) : null; }
  function objective(story, p) {
    const step = currentStep(story, p); if (!step) return null;
    const chapter = chapterOf(story, p.chapter);
    return { storyId: story.id, story: story.title, journey: Boolean(story.journey), summary: chapter.summary || null, chapter: p.chapter, chapterTitle: chapter.title, chapters: story.chapters.length, step: step.id, text: step.objective, hint: step.hint || null, npc: step.trigger.type === 'dialogue' ? step.trigger.npc : step.npc || null, scene: step.scene || null };
  }
  function available(player, story, ctx) { return !ctx.progress[story.id] && (!story.requires || storyStatus(ctx, story.requires.story) === 'completed') && check(story.when, ctx); }

  function start(player, storyId) {
    const story = content.stories.get(storyId);
    if (!story || narrative.progress(player.id)[storyId]) return null;
    const first = story.chapters[0];
    narrative.saveProgress(player.id, storyId, 1, first.steps[0].id, 'active', clock());
    narrative.log(player.id, storyId, 1, `Bắt đầu “${story.title}” — ${first.title}.`, clock());
    return { started: storyId };
  }

  // Applies one validated event to every active story whose current step it satisfies; may cascade chapters.
  function handle(player, event) {
    const updates = [], now = clock();
    for (const story of content.stories.values()) {
      for (let guard = 0; guard < 8; guard++) {
        const p = narrative.progress(player.id)[story.id], step = currentStep(story, p);
        if (!step || !triggerMatches(step.trigger, event, player)) break;
        narrative.transaction(() => updates.push(advance(player, story, p, step, now)));
        event = { type: 'cascade' };
      }
    }
    return updates;
  }
  function triggerMatches(t, e, player) {
    if (t.type === 'cascade') return false;
    if (t.type === 'flag') return Boolean(narrative.flags(player.id)[t.flag]) === (t.value ?? true);
    if (t.type === 'world') { const scope = t.scope || 'room', v = worldState.value(stateKey(scope, scope === 'personal' ? player.id : player.room, t.scene, t.object, t.stateType))?.stage ?? null; return v !== null && v >= t.gte; }
    if (t.type !== e.type) return false;
    if (t.type === 'dialogue') return t.npc === e.npc && t.node === e.node;
    if (t.type === 'interact') return t.object === e.object && (!t.scene || t.scene === e.scene) && (!t.verb || t.verb === e.verb);
    if (t.type === 'visit') return t.scene === e.scene;
    if (t.type === 'activity') return t.activity === e.activity;
    if (t.type === 'practice') return t.practice === e.practice;
    if (t.type === 'coop') return t.kind === e.kind;
    return false;
  }
  function advance(player, story, p, step, now) {
    for (const [flag, value] of Object.entries(step.setFlags || {})) narrative.setFlag(player.id, flag, value, now);
    if (step.log) narrative.log(player.id, story.id, p.chapter, step.log, now);
    const chapter = chapterOf(story, p.chapter), index = chapter.steps.indexOf(step);
    if (index < chapter.steps.length - 1) { narrative.saveProgress(player.id, story.id, p.chapter, chapter.steps[index + 1].id, 'active', now); return { storyId: story.id, step: step.id }; }
    // Chapter complete: rewards are granted here, server-side, exactly once (progress moves past this step).
    const reward = chapter.reward || {}, granted = [];
    for (const item of reward.items || []) if (repos.players.grant(player.id, item, `story:${story.id}:${chapter.n}`, now)) granted.push({ id: item, name: ITEMS[item].name });
    for (const [flag, value] of Object.entries(reward.flags || {})) narrative.setFlag(player.id, flag, value, now);
    for (const w of reward.world || []) worldState.set(stateKey(w.scope, w.scope === 'personal' ? player.id : w.scope === 'room' ? player.room : 'world', w.scene, w.object, w.type), w.value);
    if (story.npc) { narrative.meet(player.id, story.npc, now); narrative.addActivity(player.id, story.npc, `${story.id}:${chapter.n}`, FAMILIARITY_MAX); }
    narrative.log(player.id, story.id, chapter.n, chapter.summary || `Hoàn thành chương ${chapter.n}: ${chapter.title}.`, now);
    progression.journal(player.id, `Câu chuyện “${story.title}”: hoàn thành chương ${chapter.n} — ${chapter.title}.`, now);
    const last = p.chapter === story.chapters.length;
    if (last) narrative.saveProgress(player.id, story.id, p.chapter, step.id, 'completed', now);
    else narrative.saveProgress(player.id, story.id, p.chapter + 1, chapterOf(story, p.chapter + 1).steps[0].id, 'active', now);
    return { storyId: story.id, step: step.id, chapterDone: { n: chapter.n, title: chapter.title, granted, finale: last ? story.finale || null : null, teaser: last ? story.teaser || null : null, journey: Boolean(story.journey) } };
  }

  function state(player) {
    const progress = narrative.progress(player.id), objectives = [], offers = new Set(), ctxCache = new Map();
    for (const story of content.stories.values()) {
      const o = objective(story, progress[story.id]);
      if (o) { objectives.push(o); if (o.npc) offers.add(o.npc); continue; }
      const ctx = ctxCache.get(story.npc) || context(player, story.npc); ctxCache.set(story.npc, ctx);
      if (story.npc && available(player, story, ctx)) offers.add(story.npc);
    }
    return { objectives, highlights: [...offers], talkers: [...content.dialogues.keys()] };
  }

  // ── Dialogue ───────────────────────────────────────────────────────────────────────────────────────────
  function view(graph, nodeId, ctx) {
    const node = graph.nodes[nodeId];
    const lines = Array.isArray(node.lines[0]) ? node.lines[Math.floor(Math.random() * node.lines.length)] : node.lines;
    const choices = (node.choices || []).filter(c => check(c.when, ctx)).map(c => ({ id: c.id, text: c.text }));
    const input = node.input ? { placeholder: node.input.placeholder || '', max: node.input.max || 300 } : null;
    return { npc: graph.npc, name: graph.name, title: node.title || graph.title || '', node: nodeId, mood: node.mood || 'calm', lines, choices, input, object: graph.kind === 'object', end: !choices.length && !node.next && !input };
  }
  function enter(player, session, graph, nodeId) {
    session.node = nodeId;
    const node = graph.nodes[nodeId], now = clock();
    for (const [flag, value] of Object.entries(node.setFlags || {})) narrative.setFlag(player.id, flag, value, now);
    if (node.startStory) start(player, node.startStory);
    if (node.log) for (const story of content.stories.values()) if (story.npc === graph.npc && narrative.progress(player.id)[story.id]?.status === 'active') narrative.log(player.id, story.id, narrative.progress(player.id)[story.id].chapter, node.log, now);
    const updates = handle(player, { type: 'dialogue', npc: graph.npc, node: nodeId });
    return { ...view(graph, nodeId, context(player, graph.npc)), updates };
  }

  return {
    content, check, context, start, handle, state, phaseAt,
    hasDialogue: npcId => content.dialogues.has(npcId),
    // Opens a private conversation; the first entry whose condition passes picks the starting node.
    begin(player, npcId) {
      const graph = content.dialogues.get(npcId); if (!graph) throw Error('Người này chưa có câu chuyện để kể.');
      const now = clock(), person = graph.kind !== 'object', firstMeeting = person && narrative.meet(player.id, npcId, now);
      const relation = person && narrative.relation(player.id, npcId);
      // Familiarity grows at most once per day of conversation and only unlocks content.
      if (person && (firstMeeting || relation.lastTalkDay !== day())) narrative.talk(player.id, npcId, day(), firstMeeting ? 0 : 1, FAMILIARITY_MAX);
      const ctx = context(player, npcId); ctx.relation = firstMeeting ? null : ctx.relation;
      const entry = graph.entries.find(e => check(e.when, ctx));
      const session = { npc: npcId, node: null, startedAt: now };
      return { session, view: enter(player, session, graph, entry.node) };
    },
    choose(player, session, choiceId) {
      const graph = content.dialogues.get(session?.npc), node = graph?.nodes[session.node];
      if (!node) throw Error('Cuộc trò chuyện đã kết thúc.');
      const ctx = context(player, session.npc), choice = (node.choices || []).find(c => c.id === choiceId && check(c.when, ctx));
      if (!choice) throw Error('Lựa chọn này không còn phù hợp.');
      const now = clock();
      if (choice.remember) narrative.choose(player.id, session.npc, choice.remember.key, choice.remember.value ?? choice.id, now);
      for (const [flag, value] of Object.entries(choice.setFlags || {})) narrative.setFlag(player.id, flag, value, now);
      if (!choice.next) { session.node = null; return { npc: graph.npc, end: true, updates: [] }; }
      return enter(player, session, graph, choice.next);
    },
    // Submitting a written answer (node.input): saved as a private journal note, never shown to anyone else.
    submit(player, session, text) {
      const graph = content.dialogues.get(session?.npc), node = graph?.nodes[session.node];
      if (!node?.input) throw Error('Ở đây không cần viết gì.');
      const clean = String(text ?? '').normalize('NFC').replace(/[ --]/g, ' ').trim().slice(0, node.input.max || 300);
      if (!clean) throw Error('Hãy viết vài dòng trước đã.');
      const now = clock();
      repos.progression.journal(crypto.randomUUID(), player.id, 'note', `${node.input.journal || ''}${clean}`, now);
      if (node.input.remember) narrative.choose(player.id, session.npc, node.input.remember, true, now);
      for (const [flag, value] of Object.entries(node.input.setFlags || {})) narrative.setFlag(player.id, flag, value, now);
      if (!node.next) { session.node = null; return { npc: graph.npc, end: true, updates: [] }; }
      return enter(player, session, graph, node.next);
    },
    next(player, session) {
      const graph = content.dialogues.get(session?.npc), node = graph?.nodes[session.node];
      if (!node?.next || node.choices?.length) throw Error('Cuộc trò chuyện đã kết thúc.');
      return enter(player, session, graph, node.next);
    },
    // Journal view: every story the player has begun, with chapter status and the beats they lived through.
    journal(player) {
      const progress = narrative.progress(player.id), logs = narrative.logs(player.id), relations = narrative.relations(player.id);
      const stories = [...content.stories.values()].filter(s => progress[s.id]).map(s => {
        const p = progress[s.id];
        return { id: s.id, title: s.title, npc: s.npc, status: p.status, chapter: p.chapter,
          chapters: s.chapters.map(c => ({ n: c.n, title: c.title, status: p.status === 'completed' || c.n < p.chapter ? 'done' : c.n === p.chapter ? 'active' : 'locked', beats: logs.filter(l => l.storyId === s.id && l.chapter === c.n).map(l => ({ text: l.text, at: l.createdAt })) })),
          objective: objective(s, p) };
      });
      const npcs = Object.values(relations).filter(r => content.dialogues.get(r.npcId)?.kind !== 'object').map(r => ({ npc: r.npcId, name: content.dialogues.get(r.npcId)?.title || r.npcId, familiarity: FAMILIARITY_LABELS[Math.min(FAMILIARITY_MAX, r.familiarity)], talks: r.talks, metAt: r.metAt }));
      return { stories, npcs };
    },
  };
}
