// Rules shared by browser and server so validation never drifts from gameplay.
export const SPEED = 180;
export const PLAYER_RADIUS = 14;
export const bowDirection = (sceneId, state, direction) => sceneId === 'mainHall' && state === 'bow' ? 'up' : direction;
export const DURATIONS = { idle: Infinity, walk: Infinity, bow: 2.4, bead: .65, pray: 2, meditate: Infinity, bell: 1.2, interact: .8, sit: Infinity, wave: 1.3 };
export const ACTIONS = Object.keys(DURATIONS);
export const ROUND = 108;
export const LIMITS = { name: 18, wish: 120, lantern: 80, journal: 400, report: 120, chat: 100 };
export const CHAT_SECONDS = 6;
export const INCENSE_SECONDS = 600;
export const CHANT_CYCLE_SECONDS = 180;
export const COOLDOWNS = { wish: 5000, lantern: 8000, emote: 900, chat: 1200, incense: 60000, bell: 5000, bigBell: 8000 };
export const MEDITATION_MINUTES = [3, 5, 10, 15, 30];
export const LANTERN_STYLES = ['lotus', 'round', 'boat'];
export const EMOTES = ['bow', 'lotus', 'heart', 'smile', 'sparkle'];
export const REACTIONS = ['lotus', 'heart', 'sun', 'bow'];
export const SCENE_IDS = ['gate', 'courtyard', 'mainHall', 'zenGarden', 'lotusLake', 'bellTower', 'bambooForest', 'library'];

// Cosmetic catalogue: `default` items are free, the rest are earned through quests/achievements.
export const ITEMS = {
  'hair:shaved': { kind: 'hairStyle', value: 'shaved', name: 'Cạo gọn', default: true },
  'hair:short': { kind: 'hairStyle', value: 'short', name: 'Tóc ngắn', default: true },
  'hair:bun': { kind: 'hairStyle', value: 'bun', name: 'Búi tóc', default: true },
  'hair:long': { kind: 'hairStyle', value: 'long', name: 'Tóc dài', default: true },
  'hairColor:ink': { kind: 'hairColor', value: '#2b2823', name: 'Mực', default: true },
  'hairColor:chestnut': { kind: 'hairColor', value: '#5a3c2a', name: 'Hạt dẻ', default: true },
  'hairColor:ash': { kind: 'hairColor', value: '#77706a', name: 'Tro bạc', default: true },
  'outfit:robe': { kind: 'outfitStyle', value: 'robe', name: 'Áo tràng', default: true },
  'outfit:tunic': { kind: 'outfitStyle', value: 'tunic', name: 'Áo vạt hò', default: true },
  'outfit:longcoat': { kind: 'outfitStyle', value: 'longcoat', name: 'Áo dài', default: true },
  'color:sand': { kind: 'outfitColor', value: '#b79a65', name: 'Cát', default: true },
  'color:sage': { kind: 'outfitColor', value: '#8ba59b', name: 'Lá xô thơm', default: true },
  'color:dusk': { kind: 'outfitColor', value: '#7d8fb0', name: 'Hoàng hôn lam', default: true },
  'color:clay': { kind: 'outfitColor', value: '#a7766b', name: 'Đất nung', default: true },
  'color:moss': { kind: 'outfitColor', value: '#6f8a5e', name: 'Rêu', default: false },
  'color:lotus': { kind: 'outfitColor', value: '#c98f9a', name: 'Sen hồng', default: false },
  'color:saffron': { kind: 'outfitColor', value: '#d39a4a', name: 'Nghệ', default: false },
  'acc:none': { kind: 'accessory', value: 'none', name: 'Không', default: true },
  'acc:beads': { kind: 'accessory', value: 'beads', name: 'Chuỗi hạt', default: true },
  'acc:hat': { kind: 'accessory', value: 'hat', name: 'Nón lá', default: false },
  'acc:scarf': { kind: 'accessory', value: 'scarf', name: 'Khăn choàng', default: false },
  'acc:lotus': { kind: 'accessory', value: 'lotus', name: 'Cài hoa sen', default: false },
  'decor:tree': { kind: 'decor', value: 'tree', name: 'Cây non', default: true },
  'decor:rock': { kind: 'decor', value: 'rock', name: 'Đá cảnh', default: true },
  'decor:lantern': { kind: 'decor', value: 'lantern', name: 'Đèn đá', default: true },
  'decor:flower': { kind: 'decor', value: 'flower', name: 'Khóm hoa', default: true },
  'decor:bonsai': { kind: 'decor', value: 'bonsai', name: 'Chậu bonsai', default: false },
  'decor:bench': { kind: 'decor', value: 'bench', name: 'Ghế đá', default: false },
  'decor:lotusPot': { kind: 'decor', value: 'lotusPot', name: 'Chậu sen', default: false },
  'badge:bell': { kind: 'badge', value: 'bell', name: 'Huy hiệu Tiếng chuông', default: false },
  'badge:lotus': { kind: 'badge', value: 'lotus', name: 'Huy hiệu Hoa sen', default: false },
  'badge:path': { kind: 'badge', value: 'path', name: 'Huy hiệu Lữ khách', default: false },
};
export const DEFAULT_APPEARANCE = { hairStyle: 'short', hairColor: '#2b2823', outfitStyle: 'robe', outfitColor: '#b79a65', accessory: 'none' };
export const APPEARANCE_KEYS = Object.keys(DEFAULT_APPEARANCE);

// Personal garden. Trees grow with time and care but never wither, so nobody has to log in daily.
export const GARDEN = { maxObjects: 40, spacing: 36, waterCooldown: 3 * 3600 * 1000, growHours: 8 };
export const TREE_STAGES = ['Hạt mới gieo', 'Mầm non', 'Cây con', 'Cây đang lớn', 'Cây trưởng thành'];
const STAGE_POINTS = [0, 2, 5, 9, 14];
export function treeStage(plantedAt, waterCount, now = Date.now()) {
  const points = Math.max(0, now - plantedAt) / (GARDEN.growHours * 3600 * 1000) + waterCount;
  let stage = 0;
  while (stage < STAGE_POINTS.length - 1 && points >= STAGE_POINTS[stage + 1]) stage++;
  return stage;
}

export function itemFor(kind, value) { return Object.entries(ITEMS).find(([, item]) => item.kind === kind && item.value === value)?.[0] || null; }
export function normalizeAppearance(input, owned = new Set()) {
  const result = { ...DEFAULT_APPEARANCE };
  for (const kind of APPEARANCE_KEYS) {
    const id = itemFor(kind, input?.[kind]);
    if (id && (ITEMS[id].default || owned.has(id))) result[kind] = ITEMS[id].value;
  }
  return result;
}
