import { CollisionSystem } from '../systems/CollisionSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { NPC } from '../entities/NPC.js';
import { buildGround, seeded } from '../rendering/ground.js';
import { PROPS, propLights } from '../rendering/props.js';
import { HIDDEN } from '../rendering/StoryProps.js';
import { ellipse, polygon } from '../rendering/SpriteRenderer.js';
import { drawKoi } from '../rendering/FishArt.js';

export const insideRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// A data-driven area. Subclasses in this folder add behaviour unique to one place (lanterns, incense, fireflies…).
export class Scene {
  constructor(map) {
    this.map = map; this.id = map.id; this.indoor = Boolean(map.indoor);
    this.collision = new CollisionSystem(map);
    this.objects = map.objects || [];
    for (const o of this.objects) o.hidden = Boolean(HIDDEN[o.type]?.(o));
    this.interactions = new InteractionSystem(this.objects.filter(o => !o.schedule));
    // Residents stay in this area; travelling NPCs (schedule) are placed here by the game when they visit.
    this.residents = this.objects.filter(o => o.type === 'npc' && !o.schedule).map(o => new NPC(o)); this.visitors = [];
    this.props = map.props || [];
    this.lights = [...(map.lights || []).map(([x, y, r, color = '255,196,120', flicker = false]) => ({ x, y, r, color, flicker })), ...propLights([...this.props, ...this.objects])];
    this.water = (map.ground?.layers || []).filter(l => l.type === 'water' && l.fish);
    this.bells = {}; this.ground = null; this.time = 0;
    const random = seeded(map.seed || 7);
    this.fish = this.water.flatMap(w => Array.from({ length: w.fish }, (_, i) => ({ w, phase: random() * 6.28, speed: .08 + random() * .1, color: ['#ddaa71', '#e7e2d3', '#c77f5a', '#b9bc99'][i % 4], r: .35 + random() * .5, size: .62 + random() * .68 })));
  }
  get npcs() { return this.visitors.length ? [...this.residents, ...this.visitors] : this.residents; }
  enter() { this.ground ||= buildGround(this.map); }
  release() { this.ground = null; this.navigation = null; }
  // Someone sitting next to a bench is drawn on its seat (left or right half, facing out). Their logical,
  // server-checked position stays in front of the bench; every client derives the same seat from it.
  seatFor(p) {
    if (p.state === 'meditate') {
      let cushion = null, best = 80;
      for (const o of this.objects) if (o.type === 'cushion' && o.action === 'meditate') {
        const d = Math.hypot(o.x - p.x, o.y - p.y);
        if (d < best) { cushion = o; best = d; }
      }
      return cushion ? { x: cushion.x, y: cushion.y - 4 } : null;
    }
    // The tea table for two has a cushion on each side.
    const table = this.objects.find(o => o.type === 'teaTableTwo' && Math.hypot(o.x - p.x, o.y - p.y) < 120);
    if (table) return { x: table.x + (p.x < table.x ? -62 : 62), y: table.y + 6, direction: p.x < table.x ? 'right' : 'left' };
    let bench = null, best = 120;
    for (const o of this.objects) if (o.type === 'bench' && o.action === 'sit') { const d = Math.hypot(o.x - p.x, o.y - p.y); if (d < best) { bench = o; best = d; } }
    return bench && { x: bench.x + (p.x < bench.x ? -26 : 26), y: bench.y + 11 };
  }
  // Shared world state (a re-hung bell, a restored garden) is kept on the object it describes; props read `o.world`.
  // Objects can follow another object's state (`stateOf`: every leaf pile reads the courtyard's), and some appear or
  // disappear with it (HIDDEN): a swept pile is gone, the garden bench appears once the garden is complete.
  onWorldState(record) {
    for (const o of this.objects) if (o.id === record.objectId || o.stateOf === record.objectId) {
      o.world = { ...o.world, [record.type]: record.removed ? null : record.value };
      o.hidden = Boolean(HIDDEN[o.type]?.(o));
    }
  }
  // Short-lived reactions to something that happened here (a bell): birds lift off, lanterns sway, NPCs turn.
  react(kind, at) {
    if (kind !== 'bell') return;
    this.ringAt = this.time;
    for (const npc of this.npcs) if (Math.hypot(npc.x - at.x, npc.y - at.y) < 700) npc.look?.(at, 3.5);
    this.birdsFrom = [...this.props, ...this.objects].filter(o => ['tree', 'pine', 'bamboo'].includes(o.type) && Math.hypot(o.x - at.x, o.y - at.y) < 900).slice(0, 6);
  }
  ringLevel(time) { return this.ringAt === undefined ? 0 : Math.max(0, 1 - (time - this.ringAt) / 5); }
  portalAt(x, y) { return (this.map.portals || []).find(p => insideRect(p, x, y)) || null; }
  update(dt, game) {
    this.time += dt; for (const npc of this.residents) npc.update(dt, game.player);
    if (this.birdsFrom) {
      for (const t of this.birdsFrom) for (let i = 0; i < (game.reduced ? 1 : 4); i++) game.particles.spawn({ kind: 'bird', x: t.x + (Math.random() - .5) * 60, y: t.y - 90 - Math.random() * 60, vx: (Math.random() < .5 ? -1 : 1) * (60 + Math.random() * 60), vy: -50 - Math.random() * 40, life: 4, size: 3 + Math.random() * 2, alpha: .9, seed: Math.random() * 6, color: '#2b3330' });
      this.birdsFrom = null;
    }
  }
  // Hook: particles that belong to this place (smoke, motes, fireflies).
  ambient() {}
  drawWater(c, env, quality) {
    for (const w of this.water) {
      const count = quality === 'low' ? 2 : 6;
      for (let i = 0; i < count; i++) {
        const t = (env.reduced ? 0 : env.time) * .3 + i * .37, a = t % 1, angle = i * 2.1 + Math.floor(t) * 1.3;
        const x = w.x + Math.cos(angle) * (w.rx || w.w / 2) * .55, y = w.y + Math.sin(angle) * (w.ry || w.h / 2) * .5;
        c.strokeStyle = `rgba(162,207,185,${(1 - a) * .22})`; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 10 + a * 28, 4 + a * 10, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    const feed = this.fishFeeding?.();
    for (const f of this.fish) drawKoi(c, f, env.time, env.reduced, feed);
  }
  drawBelow() {}
  drawAbove() {}
  // Everything that needs depth sorting with players.
  entities(c, env) {
    const list = [];
    for (const o of this.props) if (PROPS[o.type]) list.push({ y: o.sortY ?? o.y, x: o.x, vy: o.y, big: o.big, draw: () => PROPS[o.type](c, o, env) });
    for (const o of this.objects) if (PROPS[o.type] && !o.hidden) list.push({ y: o.sortY ?? o.y, x: o.x, vy: o.y, big: o.big, draw: () => PROPS[o.type](c, o, env) });
    return list;
  }
}
