import { Pathfinder } from '../systems/Pathfinder.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';

// The temple day for NPCs: one routine every 24 real minutes, in four parts. Positions are a pure function of
// the server clock, so every client (and the server) agrees where each NPC is without sending positions.
export const ROUTINE_MS = 24 * 60000, SLOTS = 4, SLOT_MS = ROUTINE_MS / SLOTS, NPC_SPEED = 95;
export const ROUTINE_NAMES = ['Giờ công phu sáng', 'Giờ chấp tác', 'Giờ học kinh', 'Giờ tịnh tọa'];

// Where each travelling NPC spends each part of the routine. Map objects with `"schedule": true` are these NPCs;
// their appearance, dialogue and label stay in the home map file.
export const ROUTINES = {
  novice: [
    { scene: 'mainHall', x: 780, y: 770, pose: 'idle', gestures: ['pray', 'bow'], activity: 'tụng kinh buổi sáng' },
    { scene: 'courtyard', x: 520, y: 790, pose: 'idle', gestures: ['interact', 'interact', 'wave'], activity: 'quét lá ngoài sân' },
    { scene: 'bellTower', x: 760, y: 880, pose: 'idle', gestures: ['wave', 'pray'], activity: 'ngắm cảnh ở Tháp Chuông' },
    { scene: 'gate', x: 920, y: 720, pose: 'idle', gestures: ['pray', 'wave'], activity: 'đón khách ở cổng' },
  ],
  gardener: [
    { scene: 'zenGarden', x: 1160, y: 390, pose: 'idle', gestures: ['interact'], activity: 'tỉa bonsai' },
    { scene: 'lotusLake', x: 600, y: 1110, pose: 'idle', gestures: ['interact', 'pray'], activity: 'tưới hoa bên hồ' },
    { scene: 'zenGarden', x: 820, y: 880, pose: 'idle', gestures: ['wave', 'interact'], activity: 'chăm vườn' },
    { scene: 'zenGarden', x: 1130, y: 860, pose: 'meditate', gestures: [], activity: 'ngồi thiền trên sàn gỗ' },
  ],
  librarian: [
    { scene: 'library', x: 650, y: 360, pose: 'idle', gestures: ['pray', 'interact'], activity: 'sắp xếp kinh sách' },
    { scene: 'library', x: 650, y: 690, pose: 'idle', gestures: ['interact'], activity: 'đọc sách bên bàn' },
    { scene: 'bambooForest', x: 820, y: 640, pose: 'idle', gestures: ['pray'], activity: 'dạo trong rừng trúc' },
    { scene: 'mainHall', x: 560, y: 790, pose: 'meditate', gestures: [], activity: 'ngồi tịnh tọa ở Chánh Điện' },
  ],
};

const DIRECTION = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');

export class NpcDirector {
  constructor(maps) {
    this.maps = maps; this.finders = new Map(); this.routes = new Map();
    this.definitions = new Map();
    for (const map of maps.values()) for (const o of map.objects || []) if (o.type === 'npc' && o.schedule && ROUTINES[o.id]) this.definitions.set(o.id, o);
  }
  get ids() { return [...this.definitions.keys()]; }
  finder(sceneId) {
    if (!this.finders.has(sceneId)) this.finders.set(sceneId, new Pathfinder(new CollisionSystem(this.maps.get(sceneId))));
    return this.finders.get(sceneId);
  }
  // Shortest chain of scenes between two areas, following portals.
  sceneRoute(from, to) {
    const previous = new Map([[from, null]]), queue = [from];
    while (queue.length) {
      const id = queue.shift();
      if (id === to) break;
      for (const portal of this.maps.get(id)?.portals || []) if (!previous.has(portal.to) && this.maps.has(portal.to)) { previous.set(portal.to, { id, portal }); queue.push(portal.to); }
    }
    const steps = []; let at = to;
    while (previous.get(at)) { const { id, portal } = previous.get(at); steps.unshift({ sceneId: id, portal }); at = id; }
    return steps;
  }
  // Walk from the previous slot's spot to this slot's spot, possibly through several areas. Cached: deterministic.
  route(id, slot) {
    const key = `${id}:${slot}`;
    if (this.routes.has(key)) return this.routes.get(key);
    const plan = ROUTINES[id], from = plan[(slot + SLOTS - 1) % SLOTS], to = plan[slot], legs = [];
    let at = { x: from.x, y: from.y }, t = 0;
    const walk = (sceneId, target, range = 0) => {
      const found = this.finder(sceneId).findPath(at, target, { range }), points = [at, ...(found || [target])];
      let length = 0; for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      legs.push({ sceneId, points, start: t, duration: length / NPC_SPEED, blocked: !found }); t += length / NPC_SPEED;
    };
    for (const { sceneId, portal } of this.sceneRoute(from.scene, to.scene)) {
      walk(sceneId, { x: portal.x + portal.w / 2, y: portal.y + portal.h / 2 }, 12);
      const [sx, sy] = this.maps.get(portal.to).spawns[portal.spawn]; at = { x: sx, y: sy };
    }
    walk(to.scene, { x: to.x, y: to.y });
    const route = { legs, duration: t, to };
    this.routes.set(key, route);
    return route;
  }
  stateAt(id, now) {
    const def = this.definitions.get(id); if (!def) return null;
    const phase = ((now % ROUTINE_MS) + ROUTINE_MS) % ROUTINE_MS, slot = Math.floor(phase / SLOT_MS), elapsed = (phase - slot * SLOT_MS) / 1000;
    const route = this.route(id, slot), spot = route.to;
    if (elapsed >= route.duration) return { id, sceneId: spot.scene, x: spot.x, y: spot.y, direction: spot.direction || 'down', state: spot.pose, gestures: spot.gestures, moving: false, slot, activity: spot.activity };
    const leg = route.legs.findLast(l => elapsed >= l.start) || route.legs[0];
    let remaining = (elapsed - leg.start) * NPC_SPEED;
    for (let i = 1; i < leg.points.length; i++) {
      const a = leg.points[i - 1], b = leg.points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= length || i === leg.points.length - 1) {
        const k = length ? Math.min(1, remaining / length) : 1;
        return { id, sceneId: leg.sceneId, x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, direction: DIRECTION(b.x - a.x, b.y - a.y), state: 'walk', gestures: [], moving: true, slot, activity: `đang đi tới chỗ ${spot.activity}` };
      }
      remaining -= length;
    }
    const last = leg.points.at(-1);
    return { id, sceneId: leg.sceneId, x: last.x, y: last.y, direction: 'down', state: 'walk', gestures: [], moving: true, slot, activity: spot.activity };
  }
}
