import { io } from '/socket.io/socket.io.esm.min.js';
import { AssetLoader } from './core/AssetLoader.js';
import { Game } from './core/Game.js';
import { AudioManager } from './systems/AudioManager.js';
import { TIME_MODES } from './systems/DayNightSystem.js';
import { WEATHER_MODES } from './systems/WeatherSystem.js';
import { Api } from './multiplayer/Api.js';
import { SocketClient } from './multiplayer/SocketClient.js';
import { ROUND, EMOTES, COOLDOWNS, CHAT_SECONDS, bowDirection } from './shared/rules.js';
import { emoteBubble } from './rendering/SpriteRenderer.js';
import { $, el, store, toast } from './ui/dom.js';
import { Panels } from './ui/Panels.js';
import { DialoguePanel, JsonDialogueProvider } from './ui/DialoguePanel.js';
import { WishPanel } from './ui/WishPanel.js';
import { MapPanel } from './ui/MapPanel.js';
import { CharacterCreator } from './ui/CharacterCreator.js';
import { MeditationPanel } from './ui/MeditationPanel.js';
import { CoopPanel } from './ui/CoopPanel.js';
import { HallPanel } from './ui/HallPanel.js';
import { BowSession, BeadRing, ReadingPanel, PrayerBook } from './ui/HallPractice.js';
import { LanternPanel } from './ui/LanternPanel.js';
import { StoriesPanel } from './ui/StoriesPanel.js';
import { MinigameHost } from './ui/minigames/MinigameHost.js';
import { SandGame } from './ui/minigames/SandGame.js';
import { SweepGame } from './ui/minigames/SweepGame.js';
import { TeaGame } from './ui/minigames/TeaGame.js';
import { BUSES } from './systems/AudioManager.js';
import { GardenPanel } from './ui/GardenPanel.js';
import { ProgressPanels } from './ui/ProgressPanels.js';
import { SocialPanel } from './ui/SocialPanel.js';
import { FortunePanel } from './ui/FortunePanel.js';
import { HallChant } from './systems/HallChant.js';
import { WorldStateStore } from './multiplayer/WorldStateStore.js';
import { ROUTINE_NAMES } from './shared/npcSchedule.js';
import { ShopPanel } from './ui/ShopPanel.js';
import { closeScenePopups } from './ui/ScenePopups.js';

const params = new URLSearchParams(location.search);
// ?slot=2 keeps a separate guest identity, so two tabs of one browser can test multiplayer.
const slot = /^[1-4]$/.test(params.get('slot') || '') ? params.get('slot') : '';
let room = (params.get('room') || 'MAY-01').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
if (room.length < 2) room = 'MAY-01';
const url = new URL(location.href); url.searchParams.set('room', room); history.replaceState(null, '', url);
$('#roomLabel').textContent = `PHÒNG ${room}`;

const api = new Api(store, `sanmay-token${slot ? `-${slot}` : ''}`);
const savedVolumes = (() => { try { return JSON.parse(store.get('sanmay-volumes', '{}')); } catch { return {}; } })();
const audio = new AudioManager(store.get('sanmay-muted') === 'true', savedVolumes);
const panels = new Panels(), creator = new CharacterCreator();
const blocked = new Set();
let coop, hall, bowSession, beadRing, reading, prayerBook, game, assets, me = null, progress = null, entered = false, dialogue, wishes, mapPanel, meditation, lanterns, stories, minigames, gardens, fortunes, editing = false, blockedPortal = null, lastEmote = 0, stepTimer = 0, lastChantLine = null;
// Server-side story state: current objectives, which NPCs have something new to tell, which NPCs talk via the server.
let storyState = { objectives: [], highlights: [], talkers: [] };
// The objective line. A journey shows its stage; it can be paused (objective hidden, no active time counted),
// introduces each stage once, and offers its hint only after a while without progress.
let goalKey = null, goalSince = 0;
const HINT_AFTER_MS = 150_000;
function setStory(next) {
  if (!next) return;
  storyState = next;
  const journey = next.journey || { paused: false, seen: [] };
  const list = journey.paused ? next.objectives.filter(x => !x.journey) : next.objectives;
  const o = list.find(x => x.journey) || list[0];
  $('#journeyPaused').hidden = !(journey.paused && next.objectives.some(x => x.journey));
  $('#storyObjective').hidden = !o;
  if (!o) return;
  $('#storyChapter').textContent = o.journey ? `Hành trình · Giai đoạn ${o.chapter}/${o.chapters}: ${o.chapterTitle}` : `${o.story} · Chương ${o.chapter}/${o.chapters}: ${o.chapterTitle}`;
  $('#storyGoal').textContent = o.text;
  $('#journeyPause').hidden = !o.journey;
  const key = `${o.storyId}|${o.chapter}|${o.step}`;
  if (key !== goalKey) { goalKey = key; goalSince = performance.now(); $('#storyHint').hidden = true; $('#storyHint').textContent = o.hint ? `Gợi ý: ${o.hint}` : ''; }
  if (o.journey && !journey.seen.includes(`${o.storyId}.${o.chapter}`)) showStage(o);
}
setInterval(() => { if (goalKey && $('#storyHint').textContent && performance.now() - goalSince > HINT_AFTER_MS) $('#storyHint').hidden = false; }, 5000);
function showStage(o) {
  const card = $('#journeyCard');
  storyState.journey?.seen.push(`${o.storyId}.${o.chapter}`);
  net.request('journey:seen', { storyId: o.storyId, stage: o.chapter }).catch(() => {});
  $('#journeyStage').textContent = `${o.story.toUpperCase()} · GIAI ĐOẠN ${o.chapter}/${o.chapters}`;
  $('#journeyTitle').textContent = o.chapterTitle; $('#journeySummary').textContent = o.summary || o.text;
  card.classList.remove('out'); card.hidden = false;
  audio.tone(523, 1.4, .03, 'ui'); audio.tone(784, 1.8, .025, 'ui', 'sine', 1, (audio.context?.currentTime || 0) + .3);
  clearTimeout(showStage.timer);
  showStage.timer = setTimeout(() => { card.classList.add('out'); showStage.timer = setTimeout(() => { card.hidden = true; }, 1400); }, 6000);
}
async function pauseJourney(on) { try { setStory((await net.request('journey:pause', { on })).story); toast(on ? 'Đã tạm dừng hành trình. Bạn cứ tự do dạo chùa.' : 'Tiếp tục hành trình.'); } catch (error) { toast(error.message); } }
// The closing moment of a journey: a few warm lines, what you keep, and what may come next.
function showFinale(c) {
  $('#finaleTitle').textContent = c.storyTitle; $('#finaleText').textContent = c.finale;
  $('#finaleGifts').textContent = c.granted.length ? `Bạn nhận: ${c.granted.map(g => g.name).join(' · ')}` : '';
  $('#finaleTeaser').textContent = c.teaser || '';
  if (!$('#journeyFinale').open) $('#journeyFinale').showModal();
  audio.bigBell(); [523, 659, 784].forEach((f, i) => audio.tone(f, 3, .035, 'music', 'sine', 1, (audio.context?.currentTime || 0) + .6 + i * .5));
}
function storyUpdate({ story, chapters }) {
  setStory(story);
  chapters.forEach((c, i) => setTimeout(() => {
    toast(`“${c.storyTitle}” · xong chương ${c.n}: ${c.title}${c.granted.length ? ` · nhận ${c.granted.map(g => g.name).join(', ')}` : ''}`, 5200);
    if (c.finale && c.journey) setTimeout(() => showFinale(c), 1800);
    else if (c.finale) setTimeout(() => toast(c.finale, 7000), 5400);
    audio.tone(660, .8, .05); audio.tone(880, 1.2, .04, 'sfx', 'sine', 1, (audio.context?.currentTime || 0) + .25);
  }, i * 5600));
}
const chant = new HallChant(audio);
let shop;
chant.detectRecording();

const STATE_TEXT = { idle: 'Một khoảng lặng giữa ngày', walk: 'Dạo bước thong thả', bow: 'Đang cúi lạy…', bead: 'Đang lần một hạt…', pray: 'Chắp tay · an lành', sit: 'Đang ngồi nghỉ', bell: 'Tiếng chuông ngân', wave: 'Vẫy chào bạn bè', meditate: 'Đang thiền', interact: 'Đang chạm khẽ' };

function setProgress(next) {
  if (!next) return;
  progress = next; game.player.bows = next.bowsRound; game.player.beads = next.beadsRound;
  for (const [type, value] of [['bow', next.bowsRound], ['bead', next.beadsRound]]) { $(`#${type}Count`).textContent = `${value} / ${ROUND}`; $(`#${type}Progress`).value = value; }
  $('#restart').hidden = next.bowsRound < ROUND && next.beadsRound < ROUND;
  if (panels.current === 'mapPanel') mapPanel.render(game.scene.id, progress.scenesVisited, game.player);
}
function celebrate(events) {
  const messages = [...(events.achievements || []).map(a => `Thành tựu mới · ${a.title}${a.rewardName ? ` · nhận ${a.rewardName}` : ''}`), ...(events.quests || []).map(q => `Hoàn thành nhiệm vụ · ${q.title}`)];
  messages.forEach((text, i) => setTimeout(() => toast(text), i * 2200));
  if (messages.length) audio.tone(660, .6, .05);
}
function showAreaTitle(map) {
  $('#areaName').textContent = map.name; $('#areaSubtitle').textContent = map.subtitle;
  const title = $('#areaTitle'); title.classList.remove('show'); void title.offsetWidth; title.classList.add('show');
}
function syncBells(bells, serverNow) {
  const scene = game.scene;
  for (const [id, at] of Object.entries(bells || {})) scene.bells[id] = game.time - (serverNow - at) / 1000;
}
function applyScene(self, snapshot, announce = true) {
  const changed = game.scene.id !== self.sceneId;
  if (changed || Math.hypot(game.player.x - self.x, game.player.y - self.y) > 2) game.setScene(self.sceneId, self.x, self.y, self.direction);
  net.loadScene(snapshot);
  const now = net.clock.now();
  syncBells(snapshot.bells, now);
  if (game.scene.lanterns) game.scene.blocked = blocked;
  game.scene.setLanterns?.(snapshot.lanterns || [], now);
  game.scene.setIncense?.(snapshot.incense || [], now);
  worldStore.load(snapshot.world, self.sceneId);
  game.scene.setGarden?.(snapshot.garden, net.selfId);
  game.scene.setSand?.(snapshot.sand);
  game.scene.setOfferings?.(snapshot.offerings, now);
  game.scene.setFishFeed?.(snapshot.fishFeed, now);
  gardens?.refresh();
  if (changed || announce) showAreaTitle(game.scene.map);
  if (panels.current === 'mapPanel') mapPanel.render(game.scene.id, progress?.scenesVisited, game.player);
}

// Mirror of server world state; scenes react to the rows that concern them.
const worldStore = new WorldStateStore();
worldStore.on(record => {
  if (!game || record.sceneId !== game.scene.id) return;
  if (record.objectId === 'censer' && record.type === 'incense') game.scene.setIncense?.(record.value?.sticks || [], net.clock.now());
  game.scene.onWorldState?.(record, worldStore);
});
const net = new SocketClient(io, {
  status(ok, message) { $('#connection').textContent = ok ? 'Đã kết nối' : message; $('#connection').classList.toggle('offline', !ok); $('#statusDot').classList.toggle('off', !ok); },
  online(count) { $('#online').textContent = `${count} người trong phòng`; },
  joined(res) {
    setStory(res.story);
    applyScene(res.self, res.scene, !game.joinedOnce); game.joinedOnce = true;
    setProgress(res.progress); $('#online').textContent = `${res.room.online}/${res.room.capacity} người trong phòng`;
    if (res.meditationResult) toast(`Phiên thiền trước đã được lưu: ${Math.round(res.meditationResult.actualSeconds / 60)} phút.`);
    if (res.meditation && !meditation.session) meditation.begin(res.meditation);
    coop?.update(res.coop);
    bowSession?.show(res.practice);
  },
  'meditation:ended'(result) { meditation.result(result); },
  error(error) { toast(error.message); },
  unauthorized() { api.setToken(''); toast('Phiên khách không còn hợp lệ. Đang tải lại…'); setTimeout(() => location.reload(), 1500); },
  'player:correct'(data) { if (data.sceneId === game.scene.id) game.player.place(data.x, data.y, data.direction); },
  'chat:message'(data) {
    const target = data.id === net.selfId ? game.player : net.remotes.get(data.id);
    if (!target || blocked.has(data.id)) return;
    target.chat = { text: data.text, age: 0 };
    if (data.id !== net.selfId) audio.tone(740, .12, .02, 'ui', 'triangle');
  },
  'player:emote'(data) {
    const target = data.id === net.selfId ? game.player : net.remotes.get(data.id);
    if (target && !blocked.has(data.id)) target.emote = { emote: data.emote, age: 0 };
  },
  'bell:ring'(data) {
    if (data.sceneId !== game.scene.id) return;
    game.scene.bells[data.objectId] = game.time;
    const bellObject = game.scene.objects.find(o => o.id === data.objectId);
    if (bellObject) game.scene.react?.('bell', bellObject);
    data.objectId === 'bigBell' ? audio.bigBell() : audio.bell();
    if (data.by !== net.selfId && !blocked.has(data.by)) toast(`${data.name} vừa thỉnh chuông.`);
  },
  'wish:new'(wish) { if (!blocked.has(wish.playerId)) wishes.add(wish); },
  'wish:reaction'(data) { wishes.reactions(data.wishId, data.reactions); },
  'wish:hidden'(data) { wishes.remove(data.id); },
  'lantern:new'(lantern) { game.scene.addLantern?.(lantern, net.clock.now()); },
  'lantern:hidden'(data) { game.scene.removeLantern?.(data.id); },
  'world:delta'(delta) { worldStore.apply(delta); },
  'story:update'(update) { storyUpdate(update); },
  'sand:update'(data) { if (data.sceneId === game.scene.id) game.scene.setSand?.(data.strokes); },
  'offering:update'(data) { if (data.sceneId === game.scene.id) game.scene.setOfferings?.(data.offerings, net.clock.now()); },
  'fish:fed'(data) { if (data.sceneId === game.scene.id) game.scene.setFishFeed?.(data, net.clock.now()); },
  'garden:update'(data) { if (data.sceneId === game.scene.id) { game.scene.setObjects(data.objects); gardens.refresh(); } },
  'progress:events'(events) { if (events.progress) setProgress(events.progress); celebrate(events); },
  'session:replaced'() { entered = false; net.stop(); game.pauseInput(true); toast('Bạn vừa mở Sân Mây ở tab khác. Tab này đã tạm dừng; tải lại để tiếp tục tại đây.', 8000); $('#connection').textContent = 'Đang mở ở tab khác'; },
});

function act(state) {
  if (!entered || game.player.state === 'meditate') return;
  game.player.direction = bowDirection(game.scene.id, state, game.player.direction);
  game.input.cancelPath(); game.approach = null;
  if ((state === 'bow' && game.player.bows >= ROUND) || (state === 'bead' && game.player.beads >= ROUND)) return toast('Bạn đã hoàn thành vòng này. Chọn “Vòng mới” để bắt đầu lại.');
  if (!game.player.act(state)) toast('Hãy hoàn tất hành động hoặc di chuyển để hủy.');
}
async function ringBell(o) {
  if (!['idle', 'walk'].includes(game.player.state)) return toast('Di chuyển để kết thúc hành động hiện tại.');
  const cooldown = (COOLDOWNS[o.cooldown] || COOLDOWNS.bell) / 1000;
  if (game.time - (game.scene.bells[o.id] ?? -100) < cooldown) return toast('Hãy đợi tiếng chuông ngân hết.');
  try { net.sendMove(game.player, performance.now(), true); await net.request('bell:ring', { objectId: o.id }); game.player.act('bell'); toast(o.id === 'bigBell' ? 'Đại hồng chung ngân vang khắp núi.' : 'Một tiếng chuông, một hơi thở.'); }
  catch (error) { toast(error.message); }
}
function interact(o = game.interactions.nearest) {
  if (!entered) return;
  if (game.player.state === 'meditate') return;
  if (!o) return toast('Hãy đến gần một người, một vật hoặc chạm vào nó để tương tác.');
  game.input.clear();
  switch (o.action) {
    case 'shop': case 'offering': case 'fishFeed': return shop.open(o);
    case 'cat': selectedCat = o; return panels.open('catPanel');
    case 'dialogue': {
      const npc = game.scene.npcs.find(n => n.id === o.id);
      if (npc && net.connected && storyState.talkers.includes(o.id)) return dialogue.openServer(npc);
      return dialogue.open(o.dialogue).catch(error => toast(error.message));
    }
    case 'wishes': return panels.open('wishPanel');
    case 'bell': return ringBell(o);
    case 'sit': game.player.setState(game.player.state === 'sit' ? 'idle' : 'sit'); return toast(game.player.state === 'sit' ? 'Ngồi nghỉ. Di chuyển để đứng dậy.' : 'Đã đứng dậy.');
    case 'bow': case 'bead': case 'pray': return act(o.action);
    case 'meditate': return panels.open('meditationPanel');
    case 'lantern': return lanterns.open(o);
    case 'stories': return stories.open(o);
    case 'sand': return minigames.start(SandGame, o);
    case 'sweep': return minigames.start(SweepGame, o);
    case 'tea': return minigames.start(TeaGame, o);
    case 'chant': return toggleChant(o);
    case 'garden': return gardens.openGate();
    case 'fortune': return fortunes.open(o);
    case 'incense': return lightIncense(o);
    case 'water': return gardens.water(o);
    case 'story': return net.connected ? dialogue.openServer(o) : toast('Cần kết nối máy chủ để xem vật này.');
    case 'restore': return restoreWork(o);
    case 'coop': return coop.object(o);
    case 'hall': return hall.open(o);
    case 'bowSession': return bowSession.open();
    case 'beads': return beadRing.open();
    case 'read': return reading.open();
    case 'prayer': return prayerBook.open();
    case 'puzzle': return coop.puzzle(o);
    default: return toast('Không có gì để làm ở đây.');
  }
}
// Shared work on the forgotten garden: the server validates every contribution and broadcasts the new stage.
async function restoreWork(o) {
  if (!['idle', 'walk'].includes(game.player.state)) return toast('Di chuyển để kết thúc hành động hiện tại.');
  try {
    net.sendMove(game.player, performance.now(), true);
    const res = await net.request('world:interact', { objectId: o.id });
    game.player.act('interact'); setStory(res.story); toast(res.result.message);
    // NPCs nearby answer in a speech bubble too.
    const npc = res.result.npc && game.scene.npcs.find(n => n.id === res.result.npc.id);
    if (npc) npc.chat = { text: res.result.npc.text, age: 0 };
  } catch (error) { toast(error.message); }
}
let selectedCat = null;
function greetCat(kind) {
  const cat = selectedCat;
  if (!cat || !game.scene.objects.includes(cat) || Math.hypot(game.player.x - cat.x, game.player.y - cat.y) >= cat.radius) {
    panels.close(); return toast('Hãy đến gần mèo vàng một chút nhé.');
  }
  if (cat.reaction && game.time - cat.reaction.started < 4) return toast('Mèo đang vui chơi, chờ một chút nhé.');
  cat.reaction = { kind, started: game.time };
  game.player.act('interact');
  panels.close();
  toast(kind === 'pet' ? 'Mèo nhắm mắt, dụi đầu vào tay bạn. Grừ… grừ…' : 'Bạn lăn quả bóng nhỏ. Mèo thích thú đưa chân khều bóng!');
}
$('#petCat').onclick = () => greetCat('pet');
$('#playCat').onclick = () => greetCat('play');
async function lightIncense(o) {
  if (!['idle', 'walk'].includes(game.player.state)) return toast('Hãy hoàn tất hành động hiện tại trước.');
  try {
    net.sendMove(game.player, performance.now(), true);
    await net.request('incense:light', { objectId: o.id });
    game.player.act('pray'); audio.tone(523, 1.4, .03, 'sfx');
    toast('Bạn thắp một nén hương. Khói hương nhẹ bay lên ban thờ.');
  } catch (error) { toast(error.message); }
}
function toggleChant(o) {
  const on = !audio.chanting;
  audio.setChant(on);
  if (!on) return toast('Tiếng mõ đã lặng.');
  if (!audio.running) toast('Hãy bật âm thanh trong Cài đặt để nghe tụng kinh.');
  else toast('Tiếng mõ và chuông gõ đều đặn. Đến lần nữa để dừng.');
  net.request('activity:complete', { objectId: o.id }).catch(() => {});
}
async function usePortal(portal) {
  if (!net.connected) { blockedPortal = portal.id; return toast('Đang mất kết nối nên chưa thể sang khu khác.'); }
  await game.scenes.transition(async () => {
    net.sendMove(game.player, performance.now(), true);
    try { const res = await net.request('player:portal', { portalId: portal.id }); applyScene(res.self, res.scene); audio.tone(440, .5, .04); }
    catch (error) { blockedPortal = portal.id; toast(error.message); }
  });
}
function emote(name) {
  if (!entered) return;
  if (performance.now() - lastEmote < COOLDOWNS.emote) return;
  lastEmote = performance.now(); net.emote(name); $('#emotes').hidden = true; $('#emoteToggle').setAttribute('aria-expanded', 'false');
  if (!net.connected) game.player.emote = { emote: name, age: 0 };
}
function keyAction(key) {
  if (game.player.state === 'meditate') return;
  if (minigames?.open) return;
  if (key === 'escape') { if (!panels.close()) { $('#emotes').hidden = true; } game.pauseInput(false); }
  if (key === 'e') interact();
  if (key === 'enter') { game.input.clear(); $('#chatInput').focus(); }
  if (key === 'm') panels.toggle('mapPanel');
  if (key === 'j') panels.toggle('journalPanel');
  if (key === 'q') panels.toggle('questPanel');
  const actions = { 1: 'bow', 2: 'bead', 3: 'pray', 4: 'wave' };
  if (actions[key]) act(actions[key]);
}
// Where the travelling NPCs are right now (the temple routine), so players can find them.
function showWhereabouts() {
  const maps = assets.get('maps'), slot = game.npcDirector.stateAt('novice', net.clock.now())?.slot ?? 0;
  $('#whereabouts').replaceChildren(el('strong', { text: `${ROUTINE_NAMES[slot]} · mọi người đang ở đâu` }), el('ul', {}, [...game.travelers.values()].map(npc => el('li', { text: `${npc.name.split(' · ')[0]}: ${maps.get(npc.sceneId)?.name || '…'} — ${npc.activity}` }))));
}
function tick(dt) {
  for (const npc of game.scene.npcs) npc.highlight = storyState.highlights.includes(npc.id);
  net.update(dt); game.remotes = [...net.remotes.values()];
  if (game.player.emote && (game.player.emote.age += dt) > 2.6) game.player.emote = null;
  if (game.player.chat && (game.player.chat.age += dt) > CHAT_SECONDS) game.player.chat = null;
  if (entered && !game.scenes.busy && game.player.state !== 'meditate') {
    net.sendMove(game.player);
    const portal = game.scene.portalAt(game.player.x, game.player.y);
    if (!portal) blockedPortal = null; else if (portal.id !== blockedPortal) usePortal(portal);
  }
  audio.setScene(game.scene.map.ambient, game.weather, game.scene.indoor);
  // Every three minutes the monk in the main hall chants; only players in the hall hear and see it.
  const chantLine = chant.update(net.clock.now(), entered && game.scene.id === 'mainHall'), monk = game.scene.npcs.find(npc => npc.id === 'chanter');
  if (monk && chantLine) monk.chat = { text: chantLine, age: 1, chant: true };
  else if (monk?.chat?.chant) monk.chat = null;
  if (chantLine && !lastChantLine) toast('Sư Tâm Hòa bắt đầu tụng kinh…', 3000);
  lastChantLine = chantLine;
  if (audio.chanting && game.scene.id !== 'mainHall') audio.setChant(false);
  if (game.player.state === 'walk' && (stepTimer -= dt) <= 0) { audio.step(game.scene.indoor ? 'wood' : 'stone'); stepTimer = .38; }
  const nearest = game.interactions.nearest, p = game.player, env = game.env;
  $('#interact').textContent = nearest ? `E · ${nearest.label}` : 'E · Tương tác'; $('#interact').disabled = !entered || !nearest;
  $('#actionState').textContent = STATE_TEXT[p.state] || '';
  const line = `${game.scene.map.name} · ${env.label}`;
  if ($('#areaLine').textContent !== line) $('#areaLine').textContent = line;
  const sky = game.scene.indoor ? 'Trong nhà' : game.weather.label;
  if ($('#skyLabel').textContent !== sky) $('#skyLabel').textContent = sky;
}

function block(playerId, name) {
  api.put(`/blocks/${playerId}`).then(res => { blocked.clear(); res.blocks.forEach(id => blocked.add(id)); wishes.render(); toast(`Đã ẩn ${name}. Bạn sẽ không thấy nhân vật và lời chúc của người này.`); }).catch(error => toast(error.message));
}

function setupSettings() {
  const fill = (select, options, value) => { select.replaceChildren(...Object.entries(options).map(([key, label]) => el('option', { value: key, text: label }))); select.value = value; };
  fill($('#timeMode'), TIME_MODES, game.dayNight.mode); fill($('#weatherMode'), WEATHER_MODES, game.weather.mode);
  $('#quality').value = game.renderer.quality; $('#reduced').checked = game.reduced;
  const audioLabel = () => { $('#sound').textContent = audio.muted ? 'Âm thanh: tắt' : 'Âm thanh: bật'; }; audioLabel();
  $('#sound').onclick = async () => { audio.setMuted(!audio.muted); store.set('sanmay-muted', audio.muted); audioLabel(); if (!audio.muted) { if (!await audio.unlock()) toast('Không bật được âm thanh trên trình duyệt này.'); audio.click(); } };
  $('#volumes').replaceChildren(...Object.entries(BUSES).map(([bus, label]) => {
    const input = el('input', { type: 'range', min: 0, max: 100, value: Math.round(audio.volumes[bus] * 100), 'aria-label': `Âm lượng ${label}` });
    input.oninput = () => { audio.setVolume(bus, input.value / 100); store.set('sanmay-volumes', JSON.stringify(audio.volumes)); };
    return el('label', { class: 'volume' }, el('span', { text: label }), input);
  }));
  $('#quality').onchange = () => { game.setQuality($('#quality').value); store.set('sanmay-quality', $('#quality').value); };
  $('#timeMode').onchange = () => { game.dayNight.mode = $('#timeMode').value; store.set('sanmay-time', $('#timeMode').value); };
  $('#weatherMode').onchange = () => { game.weather.mode = $('#weatherMode').value; store.set('sanmay-weather', $('#weatherMode').value); };
  $('#reduced').onchange = () => { game.reduced = $('#reduced').checked; store.set('sanmay-reduced', game.reduced); };
  $('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { toast('Trình duyệt này không hỗ trợ toàn màn hình.'); } };
  panels.on('settingsPanel', () => { $('#recoveryCode').value = api.token; });
  $('#copyRecovery').onclick = async () => { try { await navigator.clipboard.writeText(api.token); toast('Đã sao chép mã khôi phục. Hãy cất giữ cẩn thận.'); } catch { $('#recoveryCode').select(); toast('Hãy tự sao chép mã đang được chọn.'); } };
  $('#recover').onclick = async () => { try { const player = await api.recover($('#recoverInput').value); toast(`Đã khôi phục danh tính của ${player.name}. Đang tải lại…`); setTimeout(() => location.reload(), 1200); } catch (error) { toast(error.message); } };
}
function setupEmotes() {
  $('#emotes').replaceChildren(...EMOTES.map(name => {
    const canvas = el('canvas', { width: 64, height: 64, 'aria-hidden': 'true' }), c = canvas.getContext('2d');
    c.scale(2, 2); emoteBubble(c, 16, 32, name, 0);
    return el('button', { type: 'button', role: 'menuitem', 'aria-label': { bow: 'Cúi chào', lotus: 'Hoa sen', heart: 'Thương mến', smile: 'Mỉm cười', sparkle: 'Lấp lánh' }[name], onclick: () => emote(name) }, canvas);
  }));
  $('#emoteToggle').onclick = () => { const open = $('#emotes').hidden; $('#emotes').hidden = !open; $('#emoteToggle').setAttribute('aria-expanded', String(open)); };
}

async function boot() {
  $('#enter').disabled = true; $('#loading').textContent = 'Đang tải…'; $('#retry').hidden = true;
  try {
    [assets, me] = await Promise.all([new AssetLoader().load((done, total) => { $('#loading').textContent = `Chuẩn bị tài nguyên · ${done}/${total}`; $('#loadProgress').value = done / total; }), api.ensureGuest(store.get('sanmay-name'))]);
    me.blocks.forEach(id => blocked.add(id));
    if (!$('#name').value) $('#name').value = me.name === 'Khách' ? '' : me.name;
    const start = assets.get('maps').has(me.progress.lastScene) ? me.progress.lastScene : 'gate';
    game?.destroy();
    game = new Game($('#scene'), assets, $('#joystick'), keyAction, tick, { scene: start, room, time: store.get('sanmay-time', 'auto'), weather: store.get('sanmay-weather', 'auto') });
    game.onSceneChange = () => {
      closeScenePopups({ panels, dialogue, minigames, game });
      selectedCat = null;
      if (editing) { editing = false; creator.stop(); $('#intro').hidden = true; game.pauseInput(false); }
    };
    game.blocked = blocked; game.onApproach = interact;
    game.clockNow = () => net.clock.now();
    game.reduced = store.get('sanmay-reduced', String(matchMedia('(prefers-reduced-motion: reduce)').matches)) === 'true';
    game.setQuality(store.get('sanmay-quality', matchMedia('(pointer: coarse)').matches ? 'medium' : 'high'));
    const spawn = game.scene.map.spawns.default; game.setScene(start, me.progress.lastX ?? spawn[0], me.progress.lastY ?? spawn[1]);
    setProgress(me.progress);
    game.player.onStateChange = (state, previous) => { if (!['walk', 'idle', 'bell', 'meditate'].includes(state) || (state === 'idle' && previous === 'sit')) net.action(state); meditation?.playerState(state, previous); };
    game.player.onComplete = state => {
      if (state !== 'bow' && state !== 'bead') return;
      audio.tone(state === 'bow' ? 350 : 580, .45);
      net.request('practice:complete', { type: state }).then(res => {
        setProgress(res.progress);
        if (state === 'bow') bowSession.counted(res.session); else beadRing.update(res.progress);
        if (res.progress[`${state}sRound`] === ROUND && !res.session) toast('Đã tròn 108. Chúc bạn bình an.');
      }).catch(error => { setProgress(error.data?.progress || progress); if (state === 'bow') bowSession.counted(null); toast(net.connected ? error.message : 'Mất kết nối nên lần này chưa được lưu.'); });
    };
    dialogue = new DialoguePanel(new JsonDialogueProvider(assets.get('dialogues'), assets.get('stories').items), game);
    dialogue.net = net; dialogue.onStory = setStory;
    // A distant temple bell every few minutes; at the bell tower the great bell visibly swings with it.
    audio.onTempleBell = () => { if (game.scene.id === 'bellTower') game.scene.bells.bigBell = game.time; if (entered && !audio.muted) toast('Có tiếng chuông chùa vọng lại…', 2600); };
    wishes = new WishPanel({ api, net, room, getMe: () => me, blocked, onBlock: block });
    mapPanel = new MapPanel(assets.get('maps'));
    const shared = { net, game, api, audio, panels, celebrate };
    shop = new ShopPanel(shared);
    gardens = new GardenPanel({ ...shared, getMe: () => me, applyScene });
    new SocialPanel({ api, net, game, panels, room, blocked, onBlockChange: () => wishes.render(), onCoop: person => { panels.close(); coop.pick({ person }); } });
    new ProgressPanels({ api, panels, getMe: () => me, setMe: player => { me = player; }, onItems: items => { me.items = items; gardens.refresh(); }, editLook });
    fortunes = new FortunePanel({ ...shared, fortunes: assets.get('fortunes') });
    meditation = new MeditationPanel(shared); lanterns = new LanternPanel(shared); stories = new StoriesPanel(shared); minigames = new MinigameHost(shared);
    coop = new CoopPanel({ ...shared, blocked, meditation });
    hall = new HallPanel({ ...shared, onStory: setStory });
    bowSession = new BowSession(shared);
    beadRing = new BeadRing({ ...shared, getProgress: () => progress });
    reading = new ReadingPanel({ ...shared, items: assets.get('stories').items, note: assets.get('stories').note, glossary: {}, onShared: item => { panels.close(); coop.pick({ kind: 'read', options: { item: item.id }, title: item.title }); } });
    fetch('/data/glossary.json').then(r => r.ok ? r.json() : {}).then(g => { reading.glossary = g; }).catch(() => {});
    prayerBook = new PrayerBook({ api, net, panels, room, blocked });
    $('#journeyPause').onclick = () => pauseJourney(true); $('#journeyResume').onclick = () => pauseJourney(false);
    $('#journeyCard').onclick = () => { $('#journeyCard').hidden = true; };
    $('#finaleClose').onclick = () => $('#journeyFinale').close();
    panels.on('mapPanel', () => { mapPanel.render(game.scene.id, progress?.scenesVisited, game.player); showWhereabouts(); });
    panels.on('wishPanel', () => wishes.load());
    setupSettings(); setupEmotes();
    creator.setup(me.appearance, me.items);
    // QA only: ?debug=1 exposes the game for screenshots; nothing here bypasses the server.
    if (params.get('debug') === '1') window.sanmay = { game, net, panels, meditation, minigames, dialogue, coop, hall, bowSession, beadRing, reading, prayerBook };
    $('#loading').textContent = 'Mọi thứ đã sẵn sàng'; $('#enter').disabled = false;
  } catch (error) { $('#loading').textContent = `Không thể mở Sân Mây: ${error.message}`; $('#retry').hidden = false; }
}

$('#retry').onclick = boot;
// Re-opens the character card to change name and outfit; the server re-validates owned items.
function editLook() {
  editing = true; game.pauseInput(true); creator.setup(me.appearance, me.items);
  $('#name').value = me.name; $('#enter').textContent = 'Lưu thay đổi →'; $('#enter').disabled = false; $('#cancelEdit').hidden = false; $('#intro').hidden = false;
}
function closeEdit() { editing = false; creator.stop(); $('#intro').hidden = true; $('#cancelEdit').hidden = true; game.pauseInput(false); }
$('#cancelEdit').onclick = closeEdit;
$('#enter').onclick = async () => {
  if (editing) {
    try { me = (await api.put('/profile', { name: $('#name').value.trim() || 'Khách', appearance: creator.look })).player; store.set('sanmay-name', me.name); game.player.name = me.name; game.player.appearance = me.appearance; closeEdit(); toast('Đã lưu. Mọi người trong phòng sẽ thấy dáng mới của bạn.'); }
    catch (error) { toast(error.message); }
    return;
  }
  if (entered || !game) return;
  $('#enter').disabled = true;
  try { me = (await api.put('/profile', { name: $('#name').value.trim() || 'Khách', appearance: creator.look })).player; }
  catch (error) { $('#enter').disabled = false; return toast(error.message); }
  store.set('sanmay-name', me.name); entered = true; creator.stop();
  game.player.appearance = me.appearance; game.enter(me.name); $('#intro').hidden = true;
  for (const id of ['#bow', '#bead', '#pray', '#wave', '#emoteToggle']) $(id).disabled = false;
  $('#chatForm').hidden = false;
  net.room = room; net.start(api.token);
  if (!await audio.unlock()) toast('Không bật được âm thanh; bạn vẫn có thể chơi.');
  audio.tone(520, .8);
};
// Chat: Enter focuses the box, Enter sends (an empty Enter or Esc returns to the game).
$('#chatForm').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#chatInput'), text = input.value.trim();
  if (!text) return input.blur();
  try { await net.request('chat:send', { text }); input.value = ''; input.blur(); }
  catch (error) { toast(error.message); }
});
$('#chatInput').addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); event.target.blur(); } });
// Mobile keyboards can leave the document panned after dismissing an input.
// Follow the keyboard animation, then restore the game's unscrolled viewport.
let chatViewportTimer;
function restoreChatViewport() {
  if (document.activeElement?.matches('input, textarea, select')) return;
  window.scrollTo(0, 0);
}
$('#chatInput').addEventListener('focus', () => {
  clearTimeout(chatViewportTimer);
  game?.input.clear();
});
$('#chatInput').addEventListener('blur', () => {
  restoreChatViewport();
  clearTimeout(chatViewportTimer);
  chatViewportTimer = setTimeout(restoreChatViewport, 350);
});
window.visualViewport?.addEventListener('resize', restoreChatViewport);
$('#name').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#enter').disabled) $('#enter').click(); });
$('#bow').onclick = () => act('bow'); $('#bead').onclick = () => act('bead'); $('#pray').onclick = () => act('pray'); $('#wave').onclick = () => act('wave'); $('#interact').onclick = () => interact();
$('#restart').onclick = async () => { try { for (const type of ['bow', 'bead']) if (progress?.[`${type}sRound`] >= ROUND) setProgress((await api.post('/progress/restart', { type })).progress); toast('Đã bắt đầu vòng mới.'); } catch (error) { toast(error.message); } };
$('#copy').onclick = async () => { const invite = new URL(location.href); invite.searchParams.delete('slot'); try { await navigator.clipboard.writeText(invite.href); toast('Đã sao chép liên kết mời vào phòng này.'); } catch { toast('Không truy cập được clipboard. Hãy sao chép địa chỉ trên thanh trình duyệt.'); } };
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !dialogue?.isOpen && !entered) panels.close(); });
window.addEventListener('pagehide', () => { net.stop(); game?.destroy(); });
boot();
