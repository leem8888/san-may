import { PLAYER_RADIUS } from '../shared/rules.js';

// A* over a lazily cached walkability grid. Every segment is checked with the
// same collision shapes and character radius used by actual movement.
class MinHeap {
  constructor() { this.items = []; }
  push(value) {
    const a = this.items; a.push(value); let i = a.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= value.f) break; a[i] = a[p]; i = p; } a[i] = value;
  }
  pop() {
    const a = this.items, first = a[0], last = a.pop();
    if (a.length) {
      let i = 0;
      while (i * 2 + 1 < a.length) {
        let j = i * 2 + 1; if (j + 1 < a.length && a[j + 1].f < a[j].f) j++;
        if (a[j].f >= last.f) break; a[i] = a[j]; i = j;
      } a[i] = last;
    }
    return first;
  }
}
const DIST = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Pathfinder {
  constructor(collision, step = 16) {
    this.collision = collision; this.step = step;
    this.cols = Math.floor(collision.world.width / step) + 1;
    this.rows = Math.floor(collision.world.height / step) + 1;
    this.cells = new Int8Array(this.cols * this.rows); this.edges = new Map();
  }
  clear(a, b) {
    const length = DIST(a, b), steps = Math.max(1, Math.ceil(length / 4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (this.collision.blocked(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, PLAYER_RADIUS)) return false;
    }
    return true;
  }
  point(id) { return { x: id % this.cols * this.step, y: Math.floor(id / this.cols) * this.step }; }
  open(id) {
    if (!this.cells[id]) { const p = this.point(id); this.cells[id] = this.collision.blocked(p.x, p.y, PLAYER_RADIUS) ? -1 : 1; }
    return this.cells[id] === 1;
  }
  edge(a, b) {
    const key = Math.min(a, b) * this.cells.length + Math.max(a, b);
    if (!this.edges.has(key)) this.edges.set(key, this.clear(this.point(a), this.point(b)));
    return this.edges.get(key);
  }
  nearby(point) {
    const gx = Math.round(point.x / this.step), gy = Math.round(point.y / this.step), result = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = gx + dx, y = gy + dy;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
      const id = y * this.cols + x;
      if (this.open(id) && this.clear(point, this.point(id))) result.push(id);
    }
    return result;
  }
  nearest(point, from) {
    if (!this.collision.blocked(point.x, point.y, PLAYER_RADIUS)) return point;
    // A click inside a trunk or wall means the nearest safe patch beside it.
    for (let radius = 8; radius <= 80; radius += 8) {
      const choices = [];
      for (let i = 0; i < 24; i++) {
        const angle = i / 24 * Math.PI * 2, p = { x: point.x + Math.cos(angle) * radius, y: point.y + Math.sin(angle) * radius };
        if (!this.collision.blocked(p.x, p.y, PLAYER_RADIUS)) choices.push(p);
      }
      if (choices.length) return choices.sort((a, b) => DIST(a, from) - DIST(b, from))[0];
    }
    return null;
  }
  smooth(from, points) {
    const result = []; let anchor = from, i = 0;
    while (i < points.length) {
      let last = i;
      // Look ahead along the route, keeping only bends that need to be followed.
      while (last + 1 < points.length && this.clear(anchor, points[last + 1])) last++;
      result.push(points[last]); anchor = points[last]; i = last + 1;
    }
    return result;
  }
  findPath(from, requested, { range = 0, nearest = true } = {}) {
    if (![from.x, from.y, requested.x, requested.y].every(Number.isFinite)) return null;
    if (range > 0 && DIST(from, requested) <= range) return [];
    const goal = range > 0 || !nearest ? requested : this.nearest(requested, from);
    if (!goal || this.collision.blocked(from.x, from.y, PLAYER_RADIUS)) return null;
    if (!range && this.clear(from, goal)) return DIST(from, goal) < .1 ? [] : [{ ...goal }];
    const end = range ? null : new Set(this.nearby(goal));
    if (end && !end.size) return this.finer(from, requested, { range, nearest });
    const size = this.cells.length, costs = new Float64Array(size); costs.fill(Infinity);
    const parent = new Int32Array(size); parent.fill(-1); const closed = new Uint8Array(size), heap = new MinHeap();
    const heuristic = p => Math.max(0, DIST(p, goal) - range);
    for (const id of this.nearby(from)) {
      const p = this.point(id), g = DIST(from, p); costs[id] = g; heap.push({ id, g, f: g + heuristic(p) });
    }
    while (heap.items.length) {
      const { id, g } = heap.pop(); if (closed[id] || g > costs[id]) continue;
      closed[id] = 1; const p = this.point(id);
      if (end ? end.has(id) : DIST(p, goal) <= range) {
        const route = []; let node = id;
        while (node !== -1) { route.push(this.point(node)); node = parent[node]; } route.reverse();
        if (!range) route.push({ ...goal });
        return this.smooth(from, route);
      }
      const gx = id % this.cols, gy = Math.floor(id / this.cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || gx + dx < 0 || gy + dy < 0 || gx + dx >= this.cols || gy + dy >= this.rows) continue;
        const next = (gy + dy) * this.cols + gx + dx;
        if (closed[next] || !this.open(next)) continue;
        if (dx && dy && (!this.open(gy * this.cols + gx + dx) || !this.open((gy + dy) * this.cols + gx))) continue;
        if (!this.edge(id, next)) continue;
        const cost = g + this.step * (dx && dy ? Math.SQRT2 : 1);
        if (cost >= costs[next]) continue;
        costs[next] = cost; parent[next] = id;
        heap.push({ id: next, g: cost, f: cost + heuristic(this.point(next)) });
      }
    }
    return this.finer(from, requested, { range, nearest });
  }
  finer(from, goal, options) {
    if (this.step <= 8) return null;
    this.fine ||= new Pathfinder(this.collision, 8);
    return this.fine.findPath(from, goal, options);
  }
}
