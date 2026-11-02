import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CollisionSystem } from '../public/js/systems/CollisionSystem.js';
import { SCENE_IDS } from '../public/js/shared/rules.js';
import { DayNightSystem } from '../public/js/systems/DayNightSystem.js';
import { WeatherSystem } from '../public/js/systems/WeatherSystem.js';
import { ParticleSystem } from '../public/js/rendering/ParticleSystem.js';
import { lanternPosition } from '../public/js/scenes/LotusLakeScene.js';
import { loadWorld } from '../server/services/world.js';
import { fileURLToPath } from 'node:url';
import { MAP_LAYOUT } from '../public/js/ui/MapLayout.js';
import { Scene } from '../public/js/scenes/Scene.js';

test('server rejects old altar positions and uses the full player radius', () => {
  const world = loadWorld(fileURLToPath(new URL('../public/data/maps/', import.meta.url)));
  assert.equal(world.walkable('mainHall', 570, 350), false);
  assert.equal(world.walkable('mainHall', 540, 350), false);
  assert.equal(world.walkable('mainHall', NaN, 350), false);
  const safe = world.spawn('mainHall');
  assert.equal(world.walkable('mainHall', safe.x, safe.y), true);
});

const load = id => JSON.parse(fs.readFileSync(new URL(`../public/data/maps/${id}.json`, import.meta.url), 'utf8'));
const maps = Object.fromEntries(SCENE_IDS.map(id => [id, load(id)]));
const garden = load('garden');
const dialogues = JSON.parse(fs.readFileSync(new URL('../public/data/dialogues.json', import.meta.url), 'utf8'));
test('zen garden bench is interactive and meditation uses the nearest cushion', () => {
  const scene = new Scene(maps.zenGarden);
  const bench = scene.objects.find(o => o.id === 'zenBench');
  assert.equal(bench.action, 'sit');
  assert.equal(scene.interactions.at(bench.x, bench.y - 10), bench);
  const visitor = { x: bench.x, y: bench.y + 35, state: 'sit' };
  scene.interactions.update(visitor);
  assert.equal(scene.interactions.nearest, bench);
  assert.deepEqual(scene.seatFor(visitor), { x: bench.x + 26, y: bench.y + 11 });
  const cushion = scene.objects.find(o => o.id === 'zen1');
  assert.deepEqual(scene.seatFor({ x: cushion.x, y: cushion.y + 34, state: 'meditate' }), { x: cushion.x, y: cushion.y - 4 });
  assert.equal(scene.seatFor({ ...visitor, state: 'meditate' }), null, 'meditation never snaps onto a bench');
});
test('overview map connections match every actual portal direction', () => {
  const directions = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const map of Object.values(maps)) for (const portal of map.portals) {
    const a = MAP_LAYOUT[map.id], b = MAP_LAYOUT[portal.to];
    assert.ok(a && b, `${map.id} and ${portal.to} appear on the overview`);
    assert.deepEqual([Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])], directions[portal.dir], `${map.id}/${portal.id} points ${portal.dir}`);
  }
});
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Flood fill on a 10px grid with the real player radius: what a player can actually walk to.
function reachable(map, start) {
  const collision = new CollisionSystem(map), step = 10, seen = new Set(), queue = [[Math.round(start[0] / step), Math.round(start[1] / step)]], cells = [];
  while (queue.length) {
    const [gx, gy] = queue.pop(), key = `${gx},${gy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (collision.blocked(gx * step, gy * step)) continue;
    cells.push([gx * step, gy * step]);
    queue.push([gx + 1, gy], [gx - 1, gy], [gx, gy + 1], [gx, gy - 1]);
  }
  return cells;
}

test('all eight areas exist, link both ways and every portal, spawn and interaction is reachable', () => {
  assert.equal(Object.keys(maps).length, 8);
  const graph = new Set();
  for (const map of Object.values(maps)) {
    const collision = new CollisionSystem(map);
    for (const [name, [x, y]] of Object.entries(map.spawns)) {
      assert.equal(collision.blocked(x, y), false, `${map.id} spawn ${name} is walkable`);
      for (const portal of map.portals) assert.equal(inside(portal, x, y), false, `${map.id} spawn ${name} is not inside ${portal.id}`);
    }
    const walkable = reachable(map, map.spawns.default);
    for (const portal of map.portals) {
      assert.ok(maps[portal.to], `${map.id}/${portal.id} target exists`);
      assert.ok(maps[portal.to].spawns[portal.spawn], `${map.id}/${portal.id} spawn ${portal.spawn} exists`);
      assert.ok(walkable.some(([x, y]) => inside(portal, x, y)), `${map.id}/${portal.id} is reachable on foot`);
      graph.add(`${map.id}>${portal.to}`);
    }
    for (const o of map.objects.filter(item => item.action)) {
      assert.ok(walkable.some(([x, y]) => Math.hypot(o.x - x, o.y - y) < o.radius * .75), `${map.id}/${o.id} can be reached within its radius`);
      if (o.action === 'dialogue') assert.ok(dialogues[o.dialogue]?.pages?.length, `${map.id}/${o.id} has dialogue ${o.dialogue}`);
    }
  }
  for (const edge of graph) { const [a, b] = edge.split('>'); assert.ok(graph.has(`${b}>${a}`), `${edge} has a way back`); }
  const all = new Set(['gate']); let grew = true;
  while (grew) { grew = false; for (const edge of graph) { const [a, b] = edge.split('>'); if (all.has(a) && !all.has(b)) { all.add(b); grew = true; } } }
  assert.equal(all.size, 8, 'every area can be reached from the gate');
  const gardenWalk = reachable(garden, garden.spawns.default), exit = garden.portals[0];
  assert.ok(gardenWalk.some(([x, y]) => inside(exit, x, y)), 'garden exit is reachable');
  assert.ok(maps[exit.to].spawns[exit.spawn], 'garden exit lands in the zen garden');
  const plot = garden.plot; assert.ok(gardenWalk.some(([x, y]) => x > plot.x && x < plot.x + plot.w && y > plot.y && y < plot.y + plot.h), 'garden plot is walkable');
});

test('day/night phases, weather determinism and pooled particles', () => {
  const day = new DayNightSystem('auto');
  const at = h => { day.mode = 'auto'; const d = new Date(2026, 10, 2, Math.floor(h), Math.round(h % 1 * 60)); return day.sample(d.getTime()); };
  assert.equal(at(7).phase, 'morning'); assert.equal(at(12).phase, 'noon'); assert.equal(at(17.5).phase, 'sunset'); assert.equal(at(20).phase, 'evening'); assert.equal(at(2).phase, 'night');
  assert.ok(at(12).darkness < .03 && at(23).darkness > .5 && at(23).lamps > .9, 'night is dark with lamps lit');
  day.mode = 'sunset'; assert.equal(day.sample().phase, 'sunset');
  const a = new WeatherSystem('ROOM-A'), b = new WeatherSystem('ROOM-A'), now = Date.UTC(2026, 10, 2, 8);
  assert.equal(a.target(now), b.target(now), 'same room, same weather');
  const kinds = new Set(Array.from({ length: 80 }, (_, i) => a.target(now + i * 9 * 60000)));
  assert.ok(kinds.size >= 4, 'auto weather varies over time');
  const fixed = new WeatherSystem('X', 'rain'); for (let i = 0; i < 100; i++) fixed.update(.1, now);
  assert.equal(fixed.levels.rain, 1); assert.equal(fixed.levels.clear, 0);
  const particles = new ParticleSystem(50); particles.setCap(20);
  for (let i = 0; i < 100; i++) particles.spawn({ kind: 'leaf', x: 0, y: 0, life: 1 });
  assert.equal(particles.count(), 20, 'cap respected');
  particles.update(1.1); assert.equal(particles.count(), 0, 'expired particles return to the pool');
  assert.equal(particles.pool.length, 50, 'no allocation after construction');
});

test('lantern drift is deterministic and stays on the lake', () => {
  const lake = { x: 900, y: 640, rx: 560, ry: 320 }, dock = { x: 900, y: 975 };
  for (const id of ['a1', 'b2', 'c3', 'd4', 'e5']) for (const age of [5, 60, 120, 400, 590]) {
    const p = lanternPosition({ id }, age, lake, dock), q = lanternPosition({ id }, age, lake, dock);
    assert.deepEqual(p, q);
    if (age >= 60) assert.ok(((p.x - lake.x) / lake.rx) ** 2 + ((p.y - lake.y) / lake.ry) ** 2 < 1, `${id}@${age} on water`);
  }
});
