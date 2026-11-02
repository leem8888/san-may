const MARGIN = { left: 50, top: 70, right: 50, bottom: 50 };
const R = (x, y, w, h) => ({ x, y, w, h }), E = (x, y, rx, ry) => ({ shape: 'ellipse', x, y, rx, ry });
// Footprints of solid props, shared by client and server so both agree on what blocks movement.
export const PROP_COLLIDERS = {
  offeringStall: o => R(o.x - 88, o.y - 35, 176, 40),
  offeringStand: o => R(o.x - 56, o.y - 28, 112, 30),
  tree: (o, s) => E(o.x + 1, o.y - 4, 24 * s, 12 * s), pine: (o, s) => E(o.x, o.y - 2, 14 * s, 8 * s), bamboo: o => E(o.x, o.y - 4, 36, 12),
  bush: o => E(o.x, o.y - 8, 30, 10), rock: (o, s) => E(o.x, o.y - 6, 26 * s, 10 * s), bench: o => R(o.x - 60, o.y - 14, 120, 22),
  board: o => R(o.x - 40, o.y - 25, 80, 25), sign: o => R(o.x - 10, o.y - 12, 20, 14), bell: o => R(o.x - 45, o.y - 60, 90, 65),
  lamp: o => R(o.x - 6, o.y - 6, 12, 10), stoneLantern: o => R(o.x - 18, o.y - 12, 36, 14), hangingLantern: o => R(o.x - 6, o.y - 6, 12, 10),
  pillar: o => R(o.x - 16, o.y - 12, 32, 14), bonsai: o => R(o.x - 28, o.y - 20, 56, 20), lotusPot: o => E(o.x, o.y - 12, 30, 14),
  stele: o => R(o.x - 32, o.y - 14, 64, 14), shrine: o => R(o.x - 34, o.y - 16, 68, 16), kettle: o => R(o.x - 20, o.y - 20, 40, 20),
  teaTable: o => R(o.x - 52, o.y - 26, 104, 26), desk: o => R(o.x - 72, o.y - 40, 144, 40), bookshelf: o => R(o.x - (o.w || 150) / 2, o.y - 20, o.w || 150, 20),
  scrollRack: o => R(o.x - 48, o.y - 16, 96, 16), flowerBed: o => E(o.x, o.y - 4, 40, 12), altar: o => R(o.x - 128, o.y - 50, 256, 50),
  statue: o => R(o.x - 92, o.y - 60, 184, 62), fence: o => R(o.x, o.y - 14, o.w || 200, 12), wall: o => R(o.x, o.y - 40, o.w, 40),
  bigBell: o => R(o.x - 155, o.y - 40, 310, 60), npc: o => E(o.x, o.y - 2, 13, 7), mo: o => R(o.x - 30, o.y - 16, 60, 18), rake: o => R(o.x - 8, o.y - 8, 16, 10), broom: o => R(o.x - 6, o.y - 8, 24, 10), fortune: o => R(o.x - 46, o.y - 28, 92, 28), censer: o => R(o.x - 22, o.y - 14, 44, 16), gardenGate: o => [R(o.x - 42, o.y - 8, 14, 10), R(o.x + 26, o.y - 8, 14, 10)],
  flowerTable: o => R(o.x - 40, o.y - 18, 80, 18), readingDesk: o => R(o.x - 40, o.y - 18, 80, 18), prayerBook: o => R(o.x - 22, o.y - 12, 44, 12), candleRack: o => R(o.x - 44, o.y - 16, 88, 16), reflectionStand: o => R(o.x - 16, o.y - 10, 32, 10), lampTable: o => R(o.x - 38, o.y - 18, 76, 18), bookStand: o => R(o.x - 18, o.y - 10, 36, 10),
  leafCart: o => R(o.x - 34, o.y - 18, 68, 18), stoneBasin: o => E(o.x, o.y - 8, 34, 12),
  teaTableTwo: o => R(o.x - 40, o.y - 22, 80, 22), scrollStand: o => R(o.x - 18, o.y - 10, 36, 10), symbolStone: o => R(o.x - 30, o.y - 14, 60, 14), symbolDial: o => R(o.x - 14, o.y - 10, 28, 10),
  ledger: o => R(o.x - 20, o.y - 10, 40, 10), letterBox: o => R(o.x - 34, o.y - 22, 68, 22), bellChest: o => R(o.x - 40, o.y - 30, 80, 30), flatStone: o => E(o.x, o.y - 8, 38, 11),
  temple: o => [R(o.x - 310, o.y - 230, 620, 230), R(o.x - 340, o.y + 40, 28, 28), R(o.x + 310, o.y + 40, 28, 28)],
};
export function collidersFor(map) {
  const list = [...(map.obstacles || [])];
  for (const o of [...(map.props || []), ...(map.objects || [])]) { const make = o.solid !== false && !o.schedule && PROP_COLLIDERS[o.type]; if (make) list.push(...[].concat(make(o, o.size || 1))); }
  return list;
}
export function overlaps(x, y, radius, o) {
  if (o.shape === 'ellipse') { const dx = (x - o.x) / (o.rx + radius), dy = (y - o.y) / (o.ry + radius); return dx * dx + dy * dy < 1; }
  const nearX = Math.max(o.x, Math.min(x, o.x + o.w));
  const nearY = Math.max(o.y, Math.min(y, o.y + o.h));
  return (x - nearX) ** 2 + (y - nearY) ** 2 < radius ** 2;
}
export class CollisionSystem {
  constructor(world) { this.world = world; this.margin = { ...MARGIN, ...world.margin }; this.obstacles = collidersFor(world); }
  blocked(x, y, radius = 14) {
    const m = this.margin, w = this.world;
    return x < radius + m.left || y < radius + m.top || x > w.width - radius - m.right || y > w.height - radius - m.bottom || this.obstacles.some(o => overlaps(x, y, radius, o));
  }
  move(p, dx, dy) {
    // Substeps prevent tunnelling even when a frame arrives late.
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 7));
    for (let i = 0; i < steps; i++) { if (!this.blocked(p.x + dx / steps, p.y)) p.x += dx / steps; if (!this.blocked(p.x, p.y + dy / steps)) p.y += dy / steps; }
  }
}
