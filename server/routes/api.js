import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_DIR } from '../config/index.js';
import express from 'express';
import { LIMITS, ROUND, normalizeAppearance } from '../../public/js/shared/rules.js';
import { cleanName, cleanText, isObject, number, oneOf, roomCode } from '../validators/index.js';
import { isOffensive } from '../services/moderation.js';
import { roomChannel } from '../services/rooms.js';
import { noStore, rateLimit, requireAuth } from '../middleware/index.js';
import { passages } from '../../public/js/shared/reading.js';
// Reading texts, so positions and bookmarks are validated against real passages.
const READING = new Map(JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'stories.json'), 'utf8')).items.map(i => [i.id, i]));

const HIDE_AFTER_REPORTS = 3;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_SAND = 12;

export function createApiRouter(ctx) {
  const { repos, identity, progression, rooms, config } = ctx;
  const router = express.Router();
  const auth = requireAuth(identity);
  router.use(noStore, rateLimit(240, 4));

  const me = id => {
    const profile = repos.players.profile(id);
    return { id, ...profile, progress: repos.players.progress(id), items: [...repos.players.items(id)], blocks: repos.players.blocks(id), achievements: progression.achievementList(id) };
  };

  router.post('/guest', rateLimit(8, .1, 'Đã tạo quá nhiều phiên khách. Hãy thử lại sau.'), (req, res) => {
    const name = isObject(req.body) && isOffensive(cleanText(req.body.name, LIMITS.name)) ? 'Khách' : cleanName(req.body?.name);
    const { token, id } = identity.issue(name);
    res.status(201).json({ token, player: me(id) });
  });

  router.get('/me', auth, (req, res) => res.json({ player: me(req.playerId) }));

  router.put('/profile', auth, (req, res) => {
    if (!isObject(req.body)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
    const name = cleanName(req.body.name);
    if (isOffensive(name)) return res.status(400).json({ error: 'Tên có từ ngữ không phù hợp.' });
    const current = repos.players.profile(req.playerId);
    const gender = req.body.gender;
    if (gender != null && !['male', 'female'].includes(gender)) return res.status(400).json({ error: 'Giới tính không hợp lệ.' });
    if (gender && current.gender && gender !== current.gender) return res.status(409).json({ error: 'Không thể đổi giới tính sau khi tạo nhân vật.' });
    if (gender && !current.gender) repos.players.setGender(req.playerId, gender);
    const appearance = normalizeAppearance(req.body.appearance, repos.players.items(req.playerId));
    if (current.shaved) appearance.hairStyle = 'shaved';
    else if (appearance.hairStyle === 'shaved') appearance.hairStyle = 'short';
    repos.players.saveProfile(req.playerId, name, appearance);
    appearance.gender = current.gender || gender || null;
    appearance.shaved = current.shaved;
    appearance.footwear = current.footwear;
    const live = rooms.findPlayer(req.playerId);
    if (live) { live.name = name; live.appearance = appearance; ctx.io.to(roomChannel(live.room)).emit('player:update', { id: live.id, name, appearance }); }
    res.json({ player: me(req.playerId) });
  });

  router.post('/progress/restart', auth, (req, res) => {
    const type = oneOf(req.body?.type, ['bow', 'bead']);
    const progress = repos.players.progress(req.playerId);
    if (!type) return res.status(400).json({ error: 'Loại vòng không hợp lệ.' });
    if (progress[`${type}sRound`] < ROUND) return res.status(409).json({ error: 'Vòng hiện tại chưa đủ 108.' });
    repos.players.setRounds(req.playerId, type === 'bow' ? 0 : progress.bowsRound, type === 'bead' ? 0 : progress.beadsRound);
    res.json({ progress: repos.players.progress(req.playerId) });
  });

  // Optional operator-supplied audio (see public/assets/audio/README.md); lets the client avoid probing for 404s.
  router.get('/media', (req, res) => res.json({ hallChant: fs.existsSync(path.join(PUBLIC_DIR, 'assets', 'audio', 'chanh-dien.mp3')) }));

  router.get('/rooms', (req, res) => res.json({ rooms: rooms.publicRooms(), capacity: config.maxPlayersPerRoom }));

  router.post('/rooms', auth, rateLimit(6, .05), (req, res) => {
    // Private codes carry 50 bits of randomness; knowing the code is the invitation.
    const code = `P-${Array.from(crypto.randomBytes(10), byte => CODE_ALPHABET[byte % 32]).join('')}`;
    repos.rooms.create(code, Boolean(req.body?.private), req.playerId);
    res.status(201).json({ code, private: Boolean(req.body?.private) });
  });

  router.get('/rooms/:code', (req, res) => {
    const code = roomCode(req.params.code);
    if (!code) return res.status(400).json({ error: 'Mã phòng không hợp lệ.' });
    const stored = repos.rooms.get(code);
    res.json({ code, private: Boolean(stored?.isPrivate), online: rooms.get(code)?.players.size || 0, capacity: config.maxPlayersPerRoom });
  });

  router.get('/wishes', auth, (req, res) => {
    const room = roomCode(req.query.room);
    if (!room) return res.status(400).json({ error: 'Mã phòng không hợp lệ.' });
    const before = number(Number(req.query.before), 0, Number.MAX_SAFE_INTEGER) || Number.MAX_SAFE_INTEGER;
    const limit = number(Number(req.query.limit), 1, 30) || 15;
    const kind = req.query.kind === 'prayer' ? 'prayer' : 'wish';
    const wishes = repos.content.wishes({ room, viewer: req.playerId, before, limit, kind });
    res.json({ wishes, more: wishes.length === limit });
  });

  function report(type, find, hide, event) {
    return (req, res) => {
      const target = find(req.params.id);
      if (!target || target.hidden) return res.status(404).json({ error: 'Không tìm thấy nội dung.' });
      if (target.player_id === req.playerId) return res.status(400).json({ error: 'Không thể báo cáo nội dung của chính bạn.' });
      const reason = cleanText(req.body?.reason, LIMITS.report) || 'Không phù hợp';
      const count = repos.content.report(req.playerId, type, target.id, reason);
      if (count >= HIDE_AFTER_REPORTS) { hide(target.id); ctx.io.to(roomChannel(target.room)).emit(event, { id: target.id }); }
      res.json({ ok: true, hidden: count >= HIDE_AFTER_REPORTS });
    };
  }
  // Authors can delete their own wishes and prayers (public ones disappear for the room too).
  router.delete('/wishes/:id', auth, (req, res) => {
    const target = repos.content.wish(req.params.id);
    if (!target || target.player_id !== req.playerId || !repos.content.deleteWish(target.id, req.playerId)) return res.status(404).json({ error: 'Không tìm thấy nội dung của bạn.' });
    if (target.visibility === 'public') ctx.io.to(roomChannel(target.room)).emit('wish:hidden', { id: target.id });
    res.json({ ok: true });
  });
  // Reading positions and bookmarks for the texts in /data/stories.json.
  router.get('/reading', auth, (req, res) => res.json({ marks: repos.practice.marks(req.playerId) }));
  router.put('/reading/:itemId', auth, rateLimit(30, 1), (req, res) => {
    const item = READING.get(req.params.itemId), count = passages(item).length;
    if (!item) return res.status(404).json({ error: 'Không tìm thấy bài đọc.' });
    const position = Number.isInteger(req.body?.position) && req.body.position >= 0 && req.body.position < count ? req.body.position : null;
    const bookmarks = Array.isArray(req.body?.bookmarks) ? [...new Set(req.body.bookmarks.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < count))].slice(0, 20) : [];
    if (position === null) return res.status(400).json({ error: 'Vị trí không hợp lệ.' });
    repos.practice.saveMark(req.playerId, item.id, position, bookmarks, Date.now());
    res.json({ ok: true, position, bookmarks });
  });
  router.post('/wishes/:id/report', auth, report('wish', repos.content.wish, repos.content.hideWish, 'wish:hidden'));
  router.post('/lanterns/:id/report', auth, report('lantern', repos.content.lantern, repos.content.hideLantern, 'lantern:hidden'));

  router.get('/blocks', auth, (req, res) => res.json({ blocked: repos.players.blockedProfiles(req.playerId) }));
  router.put('/blocks/:id', auth, (req, res) => {
    if (req.params.id === req.playerId || !repos.players.exists(req.params.id)) return res.status(404).json({ error: 'Không tìm thấy người chơi.' });
    repos.players.block(req.playerId, req.params.id);
    res.json({ blocks: repos.players.blocks(req.playerId) });
  });
  router.delete('/blocks/:id', auth, (req, res) => { repos.players.unblock(req.playerId, req.params.id); res.json({ blocks: repos.players.blocks(req.playerId) }); });

  router.get('/quests', auth, (req, res) => res.json({ quests: progression.questList(req.playerId), periods: progression.keys() }));
  router.post('/quests/:id/claim', auth, (req, res) => {
    const result = progression.claim(req.playerId, req.params.id);
    if (result.error) return res.status(409).json(result);
    res.json({ ...result, quests: progression.questList(req.playerId), items: [...repos.players.items(req.playerId)] });
  });
  router.get('/achievements', auth, (req, res) => res.json({ achievements: progression.achievementList(req.playerId) }));

  // Stories the player has lived through, chapter by chapter, plus how well they know each NPC.
  // Owner-only journey statistics: aggregate numbers, no player names or content. Requires OWNER_TOKEN.
  router.get('/owner/journey', (req, res) => {
    const token = req.get('x-owner-token') || '';
    if (!ctx.config.ownerToken) return res.status(404).json({ error: 'Không tìm thấy.' });
    const a = Buffer.from(token), b = Buffer.from(ctx.config.ownerToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(403).json({ error: 'Không có quyền.' });
    res.json(ctx.journey.stats());
  });
  router.get('/stories', auth, (req, res) => res.json({ ...ctx.narrative.journal({ id: req.playerId }), memories: repos.coop.memories(req.playerId, 30) }));

  router.get('/journal', auth, (req, res) => {
    const before = number(Number(req.query.before), 0, Number.MAX_SAFE_INTEGER) || Number.MAX_SAFE_INTEGER;
    res.json({ entries: repos.progression.entries(req.playerId, before, 30), meditations: repos.progression.meditations(req.playerId, 10), progress: repos.players.progress(req.playerId) });
  });
  router.post('/journal', auth, rateLimit(20, .2), (req, res) => {
    const text = cleanText(req.body?.text, LIMITS.journal);
    if (!text) return res.status(400).json({ error: 'Nhật ký không được để trống.' });
    const id = crypto.randomUUID(), createdAt = Date.now();
    repos.progression.journal(id, req.playerId, 'note', text, createdAt);
    res.status(201).json({ entry: { id, kind: 'note', text, createdAt } });
  });
  router.delete('/journal/:id', auth, (req, res) => repos.progression.deleteNote(req.params.id, req.playerId) ? res.json({ ok: true }) : res.status(404).json({ error: 'Không tìm thấy ghi chép.' }));

  // Personal sand-garden drawings: strokes are polylines in a 1000×600 space, bounded in size.
  router.get('/sand-patterns', auth, (req, res) => res.json({ patterns: repos.content.sandPatterns(req.playerId), max: MAX_SAND }));
  router.post('/sand-patterns', auth, rateLimit(10, .1), (req, res) => {
    const strokes = req.body?.strokes;
    if (!Array.isArray(strokes) || !strokes.length || strokes.length > 80) return res.status(400).json({ error: 'Hình vẽ không hợp lệ.' });
    let points = 0;
    for (const stroke of strokes) {
      if (!Array.isArray(stroke) || stroke.length < 2) return res.status(400).json({ error: 'Nét vẽ không hợp lệ.' });
      for (const point of stroke) if (!Array.isArray(point) || point.length !== 2 || !point.every(v => Number.isInteger(v) && v >= 0 && v <= 1000)) return res.status(400).json({ error: 'Toạ độ nét vẽ không hợp lệ.' });
      points += stroke.length;
    }
    if (points > 1600) return res.status(400).json({ error: 'Hình vẽ quá chi tiết để lưu. Hãy xoá bớt vài nét.' });
    if (repos.content.sandCount(req.playerId) >= MAX_SAND) return res.status(409).json({ error: `Bạn đã lưu đủ ${MAX_SAND} mẫu. Hãy xoá bớt một mẫu cũ.` });
    const name = cleanText(req.body.name, 30) || 'Vườn cát', id = crypto.randomUUID();
    repos.content.insertSand(id, req.playerId, name, strokes);
    res.status(201).json({ patterns: repos.content.sandPatterns(req.playerId), id });
  });
  router.delete('/sand-patterns/:id', auth, (req, res) => repos.content.deleteSand(req.params.id, req.playerId) ? res.json({ patterns: repos.content.sandPatterns(req.playerId) }) : res.status(404).json({ error: 'Không tìm thấy mẫu.' }));

  router.use((req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
  return router;
}
