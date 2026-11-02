import crypto from 'node:crypto';
import { ITEMS } from '../../public/js/shared/rules.js';

// Daily keys follow the configured local day; weekly keys use ISO weeks (Monday start).
export function periodKeys(now, tzOffsetMinutes) {
  const local = new Date(now + tzOffsetMinutes * 60000);
  const day = local.toISOString().slice(0, 10);
  const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // Thursday decides the ISO year
  const week = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return { daily: day, weekly: `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}` };
}

// Achievements derived from durable counters. Event-based ones (first visit, meditation) are unlocked explicitly.
const DERIVED = {
  'bow-108': p => p.bowRounds >= 1,
  'bead-108': p => p.beadRounds >= 1,
  'bell-first': p => p.bellsTotal >= 1,
  'lantern-first': p => p.lanternsTotal >= 1,
  'wish-first': p => p.wishesTotal >= 1,
  'explorer': p => p.scenesVisited.length >= 8,
  'tree-first': p => p.treesPlanted >= 1,
};

export function createProgression(repos, config) {
  const store = repos.progression, players = repos.players;
  const quests = store.quests(), achievements = store.achievements();
  const keys = (now = Date.now()) => periodKeys(now, config.tzOffsetMinutes);
  const journal = (playerId, text, now = Date.now()) => store.journal(crypto.randomUUID(), playerId, 'event', text, now);

  function unlock(playerId, id, now = Date.now()) {
    if (!store.unlock(playerId, id, now)) return null;
    const a = achievements.find(item => item.id === id);
    if (a.reward_item) players.grant(playerId, a.reward_item, `achievement:${id}`, now);
    journal(playerId, `Thành tựu mới: ${a.title}`, now);
    return { id, title: a.title, description: a.description, icon: a.icon, rewardItem: a.reward_item, rewardName: ITEMS[a.reward_item]?.name || null };
  }

  // Applies metric increments to the current daily/weekly quests and evaluates achievements.
  function record(playerId, metrics, now = Date.now()) {
    const period = keys(now), completed = [];
    for (const [metric, amount] of metrics) for (const quest of quests) {
      if (quest.metric !== metric || amount <= 0) continue;
      const key = period[quest.period];
      store.addQuestProgress(playerId, quest.id, key, amount);
      if (store.playerQuest(playerId, quest.id, key).progress >= quest.target && store.completeQuest(playerId, quest.id, key, now)) completed.push({ id: quest.id, title: quest.title });
    }
    const progress = players.progress(playerId);
    const unlocked = Object.entries(DERIVED).filter(([, test]) => test(progress)).map(([id]) => unlock(playerId, id, now)).filter(Boolean);
    return { progress, quests: completed, achievements: unlocked };
  }

  function questList(playerId, now = Date.now()) {
    const period = keys(now), rows = new Map(store.playerQuests(playerId, period.daily, period.weekly).map(row => [`${row.quest_id}|${row.period_key}`, row]));
    const owned = players.items(playerId);
    return quests.map(q => {
      const row = rows.get(`${q.id}|${period[q.period]}`);
      return { id: q.id, period: q.period, title: q.title, target: q.target, progress: Math.min(q.target, row?.progress || 0), completed: Boolean(row?.completed_at), claimed: Boolean(row?.claimed_at), rewardItem: q.reward_item, rewardName: ITEMS[q.reward_item]?.name, rewardOwned: owned.has(q.reward_item) };
    });
  }

  function claim(playerId, questId, now = Date.now()) {
    const quest = quests.find(q => q.id === questId);
    if (!quest) return { error: 'Nhiệm vụ không tồn tại.' };
    const key = keys(now)[quest.period];
    if (!store.claimQuest(playerId, quest.id, key, now)) return { error: 'Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.' };
    const granted = players.grant(playerId, quest.reward_item, `quest:${quest.id}`, now);
    journal(playerId, `Hoàn thành nhiệm vụ: ${quest.title}`, now);
    return { ok: true, granted, item: quest.reward_item, itemName: ITEMS[quest.reward_item]?.name };
  }

  function achievementList(playerId) {
    const unlocked = store.unlocked(playerId);
    return achievements.map(a => ({ id: a.id, title: a.title, description: a.description, icon: a.icon, rewardName: ITEMS[a.reward_item]?.name || null, unlockedAt: unlocked.get(a.id) || null }));
  }

  return { keys, record, unlock, questList, claim, achievementList, journal };
}
