import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const MAPS_DIR = path.join(PUBLIC_DIR, 'data', 'maps');

export function loadConfig(env = process.env, overrides = {}) {
  return {
    port: Number(env.PORT || 43127),
    host: env.HOST || '0.0.0.0',
    dbFile: env.DB_FILE || path.join(ROOT, 'data', 'sanmay.db'),
    // Daily/weekly quests roll over at local midnight; default Asia/Bangkok (UTC+7).
    tzOffsetMinutes: Number(env.TZ_OFFSET_MINUTES ?? 420),
    trustProxy: env.TRUST_PROXY === '1',
    // Owner-only journey statistics (/api/owner/journey). Unset = the endpoint does not exist.
    ownerToken: env.OWNER_TOKEN || null,
    maxPlayersPerRoom: 20,
    tickMs: 100,
    disconnectGraceMs: 15000,
    ...overrides,
  };
}
