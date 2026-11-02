// Quests, achievements, journal and meditation history.
export function createProgressionRepo(db) {
  const s = {
    quests: db.prepare('SELECT * FROM quests ORDER BY sort'),
    playerQuest: db.prepare('SELECT * FROM player_quests WHERE player_id = ? AND quest_id = ? AND period_key = ?'),
    playerQuests: db.prepare('SELECT * FROM player_quests WHERE player_id = ? AND period_key IN (?, ?)'),
    addQuest: db.prepare(`INSERT INTO player_quests (player_id, quest_id, period_key, progress) VALUES (?, ?, ?, ?)
      ON CONFLICT(player_id, quest_id, period_key) DO UPDATE SET progress = progress + excluded.progress`),
    completeQuest: db.prepare('UPDATE player_quests SET completed_at = ? WHERE player_id = ? AND quest_id = ? AND period_key = ? AND completed_at IS NULL'),
    claimQuest: db.prepare('UPDATE player_quests SET claimed_at = ? WHERE player_id = ? AND quest_id = ? AND period_key = ? AND completed_at IS NOT NULL AND claimed_at IS NULL'),
    achievements: db.prepare('SELECT * FROM achievements ORDER BY sort'),
    unlocked: db.prepare('SELECT achievement_id, unlocked_at FROM player_achievements WHERE player_id = ?'),
    unlock: db.prepare('INSERT OR IGNORE INTO player_achievements (player_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'),
    journal: db.prepare('INSERT INTO journal_entries (id, player_id, kind, text, created_at) VALUES (?, ?, ?, ?, ?)'),
    entries: db.prepare('SELECT id, kind, text, created_at AS createdAt FROM journal_entries WHERE player_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?'),
    deleteNote: db.prepare("DELETE FROM journal_entries WHERE id = ? AND player_id = ? AND kind = 'note'"),
    startMeditation: db.prepare('INSERT INTO meditation_sessions (id, player_id, room, planned_seconds, started_at) VALUES (?, ?, ?, ?, ?)'),
    activeMeditation: db.prepare('SELECT * FROM meditation_sessions WHERE player_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1'),
    finishMeditation: db.prepare('UPDATE meditation_sessions SET ended_at = ?, actual_seconds = ?, shared = ? WHERE id = ? AND ended_at IS NULL'),
    meditations: db.prepare('SELECT id, planned_seconds AS plannedSeconds, actual_seconds AS actualSeconds, started_at AS startedAt, shared FROM meditation_sessions WHERE player_id = ? AND ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ?'),
  };
  return {
    quests: () => s.quests.all(),
    playerQuest: (id, questId, key) => s.playerQuest.get(id, questId, key),
    playerQuests: (id, daily, weekly) => s.playerQuests.all(id, daily, weekly),
    addQuestProgress: (id, questId, key, amount) => s.addQuest.run(id, questId, key, amount),
    completeQuest: (id, questId, key, now = Date.now()) => s.completeQuest.run(now, id, questId, key).changes > 0,
    claimQuest: (id, questId, key, now = Date.now()) => s.claimQuest.run(now, id, questId, key).changes > 0,
    achievements: () => s.achievements.all(),
    unlocked: id => new Map(s.unlocked.all(id).map(row => [row.achievement_id, row.unlocked_at])),
    unlock: (id, achievementId, now = Date.now()) => s.unlock.run(id, achievementId, now).changes > 0,
    journal: (entryId, playerId, kind, text, now = Date.now()) => s.journal.run(entryId, playerId, kind, text, now),
    entries: (id, before = Number.MAX_SAFE_INTEGER, limit = 30) => s.entries.all(id, before, limit),
    deleteNote: (entryId, playerId) => s.deleteNote.run(entryId, playerId).changes > 0,
    startMeditation: (sessionId, playerId, room, planned, now = Date.now()) => s.startMeditation.run(sessionId, playerId, room, planned, now),
    activeMeditation: id => s.activeMeditation.get(id),
    finishMeditation: (sessionId, actual, shared, now = Date.now()) => s.finishMeditation.run(now, actual, shared ? 1 : 0, sessionId).changes > 0,
    meditations: (id, limit = 10) => s.meditations.all(id, limit),
  };
}
