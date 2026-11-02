import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Pathfinder } from '../public/js/systems/Pathfinder.js';
import { CollisionSystem } from '../public/js/systems/CollisionSystem.js';
import { Player } from '../public/js/entities/Player.js';
import { InputManager } from '../public/js/core/InputManager.js';
import { SCENE_IDS } from '../public/js/shared/rules.js';
import { Game } from '../public/js/core/Game.js';

const map = (obstacles = [], props = []) => ({ width: 600, height: 500, margin: { left: 0, top: 0, right: 0, bottom: 0 }, obstacles, props });
const load = id => JSON.parse(fs.readFileSync(new URL(`../public/data/maps/${id}.json`, import.meta.url), 'utf8'));
function input() {
  return Object.assign(Object.create(InputManager.prototype), { active: true, keys: new Set(), stick: { x: 0, y: 0 }, path: [], target: null, joystick: { firstElementChild: { style: {} } } });
}
function follow(collision, from, route, dt = 1 / 60) {
  assert.notEqual(route, null, 'a route must exist');
  const player = new Player(); player.place(from.x, from.y); const controls = input(); controls.setPath(route);
  let stuck = 0;
  for (let i = 0; i < 12000 && controls.target; i++) {
    const x = player.x, y = player.y;
    player.update(dt, controls.vector(player), collision);
    assert.equal(collision.blocked(player.x, player.y), false, 'route never enters an obstacle');
    stuck = controls.target && Math.hypot(player.x - x, player.y - y) < .001 ? stuck + 1 : 0;
    assert.ok(stuck < 20, `route became stuck at ${player.x},${player.y}`);
  }
  assert.equal(controls.target, null, 'route reaches its destination'); return player;
}

test('clicking behind a tree walks around its trunk at desktop and mobile frame rates', () => {
  const collision = new CollisionSystem(map([], [{ type: 'tree', x: 300, y: 250 }])), finder = new Pathfinder(collision);
  const from = { x: 300, y: 320 }, to = { x: 300, y: 180 };
  assert.equal(finder.clear(from, to), false);
  const route = finder.findPath(from, to); assert.ok(route.length > 1);
  for (const dt of [1 / 30, 1 / 60, .05]) {
    const p = follow(collision, from, route, dt); assert.ok(Math.hypot(p.x - to.x, p.y - to.y) < .2);
  }
});

test('routes avoid walls, find narrow doorways and never cut diagonal corners', () => {
  const collision = new CollisionSystem(map([{ x: 280, y: 0, w: 30, h: 210 }, { x: 280, y: 248, w: 30, h: 252 }]));
  const finder = new Pathfinder(collision), from = { x: 100, y: 100 }, to = { x: 480, y: 100 };
  const route = finder.findPath(from, to); const p = follow(collision, from, route);
  assert.ok(Math.hypot(p.x - to.x, p.y - to.y) < .2);
  let a = from; for (const b of route) { assert.equal(finder.clear(a, b), true); a = b; }
});

test('blocked clicks resolve to a nearby safe point; disconnected areas fail cleanly', () => {
  const collision = new CollisionSystem(map([], [{ type: 'tree', x: 300, y: 250 }])), finder = new Pathfinder(collision);
  const from = { x: 100, y: 320 }, route = finder.findPath(from, { x: 300, y: 246 });
  const p = follow(collision, from, route); assert.equal(collision.blocked(p.x, p.y), false);
  assert.ok(Math.hypot(p.x - 300, p.y - 246) <= 80);
  const wall = new Pathfinder(new CollisionSystem(map([{ x: 280, y: 0, w: 40, h: 500 }])));
  assert.equal(wall.findPath({ x: 100, y: 250 }, { x: 500, y: 250 }), null);
  assert.equal(wall.findPath(from, { x: NaN, y: 2 }), null);
});

test('manual input replaces auto-walking and clearing never leaves queued waypoints', () => {
  const controls = input(); controls.setPath([{ x: 30, y: 40 }, { x: 90, y: 40 }]);
  let manual = 0; controls.onManual = () => manual++;
  controls.keys.add('d'); assert.equal(controls.vector({ x: 0, y: 0 }).x, 1);
  assert.equal(controls.target, null); assert.deepEqual(controls.path, []); assert.equal(manual, 1);
  controls.setPath([{ x: 100, y: 100 }]); controls.clear(); assert.deepEqual(controls.path, []);
});

test('game clicks replace the old route and approaching an object targets a reachable interaction point', () => {
  const collision = new CollisionSystem(map([], [{ type: 'tree', x: 300, y: 250 }]));
  const player = new Player(); player.place(300, 320);
  const controls = input(), scene = { collision }, object = { x: 300, y: 180, radius: 60 };
  const game = { player, input: controls, scene, time: 0, interactions: { at: () => null }, navigate: Game.prototype.navigate };
  assert.equal(Game.prototype.tap.call(game, { x: 300, y: 180 }), true);
  assert.ok(controls.path.length > 1); assert.equal(game.tapMarker.blocked, false);
  Game.prototype.tap.call(game, { x: 100, y: 320 }); assert.deepEqual(controls.target, { x: 100, y: 320 });
  game.interactions.at = () => object;
  Game.prototype.tap.call(game, { x: 300, y: 150 });
  assert.equal(game.approach, object);
  const p = follow(collision, player, controls.path);
  assert.ok(Math.hypot(p.x - object.x, p.y - object.y) < object.radius * .75);
});

test('all scene exits and interactive objects can be approached with real player movement', () => {
  for (const id of [...SCENE_IDS, 'garden']) {
    const world = load(id), collision = new CollisionSystem(world), finder = new Pathfinder(collision);
    const [x, y] = world.spawns.default, from = { x, y };
    for (const portal of world.portals) {
      const goal = { x: portal.x + portal.w / 2, y: portal.y + portal.h / 2 };
      const route = finder.findPath(from, goal);
      assert.notEqual(route, null, `${id}/${portal.id}`); follow(collision, from, route, 1 / 30);
    }
    for (const o of world.objects.filter(o => o.action)) {
      const route = finder.findPath(from, o, { range: o.radius * .68 });
      assert.notEqual(route, null, `${id}/${o.id}`);
      const p = follow(collision, from, route, 1 / 30);
      assert.ok(Math.hypot(p.x - o.x, p.y - o.y) < o.radius * .75, `${id}/${o.id}: interaction is in range`);
    }
  }
});
