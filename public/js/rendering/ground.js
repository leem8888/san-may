import { ellipse } from './SpriteRenderer.js';
import { box, line } from './props.js';
export function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const pick = (random, list) => list[Math.floor(random() * list.length)];

// Ground layers are declared in map JSON and rasterised once per scene into a cached canvas.
const LAYERS = {
  noise(c, l, random, map) { for (let i = 0; i < (l.count || 5000); i++) ellipse(c, random() * map.width, random() * map.height, random() * 4 + 1, random() * 2 + 1, pick(random, l.colors)); },
  rect(c, l) { box(c, l.x, l.y, l.w, l.h, l.color, l.r || 0); },
  tiles(c, l, random) {
    if (l.border) box(c, l.x - 20, l.y - 20, l.w + 40, l.h + 40, l.border, 12);
    box(c, l.x, l.y, l.w, l.h, l.grout || '#989071', 8);
    const [tw, th] = l.tile || [80, 42];
    for (let y = l.y + 2, row = 0; y < l.y + l.h - 4; y += th, row++) for (let x = l.x + 2 - (row % 2 ? tw / 2 : 0); x < l.x + l.w - 2; x += tw) {
      const xx = Math.max(x, l.x + 2), ww = Math.min(x + tw - 2, l.x + l.w - 2) - xx, hh = Math.min(th - 2, l.y + l.h - 2 - y);
      if (ww > 0 && hh > 0) box(c, xx, y, ww, hh, pick(random, l.colors || ['#8d8469', '#928970', '#9c9277', '#867e64']), 2);
    }
  },
  planks(c, l, random) {
    box(c, l.x, l.y, l.w, l.h, l.gap || '#4a2f20');
    for (let y = l.y, row = 0; y < l.y + l.h; y += 30, row++) for (let x = l.x - (row * 137) % 300; x < l.x + l.w; x += 300) {
      const xx = Math.max(x, l.x), ww = Math.min(x + 298, l.x + l.w) - xx, hh = Math.min(28, l.y + l.h - y - 1);
      if (ww <= 0 || hh <= 0) continue;
      box(c, xx, y + 1, ww, hh, pick(random, l.colors || ['#7a4f36', '#835640', '#73492f', '#8a5d43']), 1);
      // Faint grain lines so the floor reads as timber rather than brick.
      for (let k = 0; k < 2; k++) { const gy = y + 7 + k * 11 + random() * 4; c.strokeStyle = 'rgba(40,22,12,.18)'; c.lineWidth = 1; c.beginPath(); c.moveTo(xx + 6, gy); c.bezierCurveTo(xx + ww * .3, gy + 2, xx + ww * .6, gy - 2, xx + ww - 6, gy + 1); c.stroke(); }
    }
  },
  carpet(c, l) { box(c, l.x, l.y, l.w, l.h, l.border || '#b8904f', 6); box(c, l.x + 8, l.y + 8, l.w - 16, l.h - 16, l.color || '#8c2f2a', 4); c.strokeStyle = '#c99f5a88'; c.lineWidth = 2; c.strokeRect(l.x + 20, l.y + 20, l.w - 40, l.h - 40); },
  sand(c, l, random) {
    box(c, l.x - 14, l.y - 14, l.w + 28, l.h + 28, '#8a8270', 10); box(c, l.x, l.y, l.w, l.h, '#d8ccad', 6);
    for (let y = l.y + 10; y < l.y + l.h - 4; y += 9) { c.strokeStyle = y % 18 ? '#c5b896' : '#e6dcc0'; c.lineWidth = 2; c.beginPath(); c.moveTo(l.x + 6, y); for (let x = l.x + 6; x < l.x + l.w - 6; x += 30) c.lineTo(x + 30, y + Math.sin(x * .02) * 1.5); c.stroke(); }
    for (const [x, y, r] of l.rocks || []) { for (let k = 1; k < 5; k++) { c.strokeStyle = k % 2 ? '#c2b593' : '#ece3c9'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r + k * 9, (r + k * 9) * .55, 0, 0, Math.PI * 2); c.stroke(); } }
  },
  water(c, l, random) {
    if (l.shape === 'rect') { box(c, l.x - 10, l.y - 10, l.w + 20, l.h + 20, '#5f7062', 18); box(c, l.x, l.y, l.w, l.h, '#1f5756', 14); box(c, l.x + 10, l.y + 8, l.w - 20, l.h - 20, '#346763', 12); }
    else {
      if (l.rim !== false) for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; ellipse(c, l.x + Math.cos(a) * (l.rx + 16), l.y + Math.sin(a) * (l.ry + 12), 17, 11, pick(random, ['#899580', '#717e6c', '#a6a58a'])); }
      ellipse(c, l.x, l.y, l.rx, l.ry, '#1f5756'); ellipse(c, l.x, l.y - 8, l.rx - 14, l.ry - 16, '#346763');
    }
    for (let i = 0; i < (l.lotus || 0); i++) {
      const a = random() * Math.PI * 2, d = Math.sqrt(random()) * .8, x = l.shape === 'rect' ? l.x + 20 + random() * (l.w - 40) : l.x + Math.cos(a) * l.rx * d, y = l.shape === 'rect' ? l.y + 20 + random() * (l.h - 40) : l.y + Math.sin(a) * l.ry * d;
      ellipse(c, x, y, 13, 6, '#708b57'); c.fillStyle = '#5a7547'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, 13, -.3, .2); c.fill();
      if (random() < .45) { ellipse(c, x + 3, y - 4, 5, 4, '#e9a9b6'); ellipse(c, x + 3, y - 5, 2, 2, '#f6d58d'); }
    }
  },
  stream(c, l) { for (const [width, color] of [[l.width + 18, '#5f7062'], [l.width, '#25605d'], [l.width - 14, '#3a716b']]) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); l.points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); } },
  path(c, l, random) {
    const pts = l.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / (l.spacing || 30)));
      for (let k = 0; k < steps; k++) { const t = k / steps; ellipse(c, ax + (bx - ax) * t + (random() - .5) * 8, ay + (by - ay) * t + (random() - .5) * 6, (l.size || 24) * (.85 + random() * .3), (l.size || 24) * .5, pick(random, l.colors || ['#8e9980', '#7f8f76', '#9aa38a'])); }
    }
  },
  dirt(c, l) { c.strokeStyle = l.color || '#6f6650'; c.lineWidth = l.width || 70; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); l.points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.strokeStyle = l.edge || '#7d735a'; c.lineWidth = (l.width || 70) - 20; c.stroke(); },
  scatter(c, l, random) { for (let i = 0; i < l.count; i++) { const x = l.x + random() * l.w, y = l.y + random() * l.h; if (l.kind === 'grass') { line(c, x, y, x - 2, y - 7, pick(random, l.colors), 1.5); line(c, x, y, x + 3, y - 6, pick(random, l.colors), 1.5); } else ellipse(c, x, y, l.size || 3, l.size || 3, pick(random, l.colors)); } },
  sideWall(c, l) { const h = l.h; box(c, l.x, l.y, 20, h, '#737d69'); box(c, l.x - 6, l.y, 32, 12, '#b2ac8c'); for (let y = l.y + 30; y < l.y + h - 20; y += 110) { box(c, l.x - 8, y, 36, 36, '#818c73', 3); box(c, l.x - 12, y - 5, 44, 10, '#b4ad8c', 2); } },
  shadowEdge(c, l, random, map) { const g = c.createLinearGradient(0, 0, 0, l.h); g.addColorStop(0, 'rgba(10,25,24,.55)'); g.addColorStop(1, 'rgba(10,25,24,0)'); c.fillStyle = g; c.fillRect(0, 0, map.width, l.h); },
};

export function buildGround(map) {
  const canvas = document.createElement('canvas'); canvas.width = map.width; canvas.height = map.height;
  const c = canvas.getContext('2d'), random = seeded(map.seed || 91);
  c.fillStyle = map.ground?.base || '#29483e'; c.fillRect(0, 0, map.width, map.height);
  for (const layer of map.ground?.layers || []) LAYERS[layer.type]?.(c, layer, random, map);
  return canvas;
}
