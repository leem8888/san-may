import crypto from 'node:crypto';
import { DEFAULT_APPEARANCE } from '../../public/js/shared/rules.js';

export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// Guests are identified by a random server-issued bearer token; only its hash is stored.
// The token doubles as the recovery code a player can copy to another device.
export function createIdentity(repos) {
  return {
    issue(name) {
      const token = crypto.randomBytes(32).toString('base64url'), id = crypto.randomUUID();
      repos.players.create({ id, tokenHash: hashToken(token), name, appearance: DEFAULT_APPEARANCE });
      return { token, id };
    },
    authenticate(token) {
      if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null;
      const player = repos.players.byTokenHash(hashToken(token));
      if (player) repos.players.touch(player.id);
      return player || null;
    },
  };
}
