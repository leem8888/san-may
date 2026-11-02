import { createPlayerRepo } from './players.js';
import { createContentRepo } from './content.js';
import { createProgressionRepo } from './progression.js';
import { createRoomRepo } from './rooms.js';
import { createGardenRepo } from './gardens.js';
import { createShopRepo } from './shop.js';

export function createRepositories(db) {
  return { players: createPlayerRepo(db), content: createContentRepo(db), progression: createProgressionRepo(db), rooms: createRoomRepo(db), gardens: createGardenRepo(db), shop: createShopRepo(db) };
}
