import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NpcDirector, ROUTINES, ROUTINE_MS, SLOT_MS, SLOTS } from '../public/js/shared/npcSchedule.js';
import { CollisionSystem } from '../public/js/systems/CollisionSystem.js';
import { PLAYER_RADIUS } from '../public/js/shared/rules.js';

const maps = new Map(fs.readdirSync(new URL('../public/data/maps/', import.meta.url)).filter(f => f.endsWith('.json')).map(f => { const m = JSON.parse(fs.readFileSync(new URL(`../public/data/maps/${f}`, import.meta.url), 'utf8')); return [m.id, m]; }));

test('NPC routines: every spot is walkable and every walk follows a real path', () => {
  const director = new NpcDirector(maps), collisions = new Map([...maps].map(([id, m]) => [id, new CollisionSystem(m)]));
  assert.deepEqual(director.ids.sort(), ['gardener', 'librarian', 'novice']);
  for (const [id, plan] of Object.entries(ROUTINES)) {
    assert.equal(plan.length, SLOTS, id);
    for (const spot of plan) assert.equal(collisions.get(spot.scene).blocked(spot.x, spot.y, PLAYER_RADIUS), false, `${id} spot in ${spot.scene} is walkable`);
    for (let slot = 0; slot < SLOTS; slot++) {
      const route = director.route(id, slot);
      assert.ok(route.duration < SLOT_MS / 1000 / 2, `${id} slot ${slot}: the walk takes less than half the slot (${Math.round(route.duration)}s)`);
      for (const leg of route.legs) {
        assert.equal(leg.blocked, false, `${id} slot ${slot}: a path exists in ${leg.sceneId}`);
        // Sample the polyline: an NPC never walks through walls, trees or water.
        for (let i = 1; i < leg.points.length; i++) {
          const a = leg.points[i - 1], b = leg.points[i], steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8);
          for (let k = 0; k <= steps; k++) { const x = a.x + (b.x - a.x) * k / steps, y = a.y + (b.y - a.y) * k / steps; assert.equal(collisions.get(leg.sceneId).blocked(x, y, PLAYER_RADIUS - 2), false, `${id} slot ${slot} ${leg.sceneId} (${Math.round(x)},${Math.round(y)})`); }
        }
      }
    }
  }
});

test('NPC positions are deterministic, continuous and change area through portals', () => {
  const a = new NpcDirector(maps), b = new NpcDirector(maps), base = ROUTINE_MS * 1000;
  for (const t of [0, 5000, 30000, SLOT_MS + 1000, SLOT_MS * 2 + 20000, ROUTINE_MS - 1]) assert.deepEqual(a.stateAt('novice', base + t), b.stateAt('novice', base + t), 'every client computes the same position');
  // Walking from one slot to the next: positions move smoothly, never jump inside one area.
  let previous = null, scenes = new Set();
  for (let t = 0; t < 240000; t += 500) {
    const s = a.stateAt('novice', base + SLOT_MS + t); scenes.add(s.sceneId);
    if (previous && previous.sceneId === s.sceneId) assert.ok(Math.hypot(s.x - previous.x, s.y - previous.y) <= 95 * .5 + 1, `smooth at ${t}`);
    previous = s;
  }
  assert.ok(scenes.size >= 2, 'An walks from the main hall through other areas to the courtyard');
  const settled = a.stateAt('novice', base + SLOT_MS * 2 - 1000);
  assert.deepEqual([settled.sceneId, settled.x, settled.y, settled.moving], ['courtyard', 520, 790, false]);
  assert.equal(a.stateAt('ghost', base), null);
});
