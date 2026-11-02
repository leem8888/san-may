import { ellipse } from './SpriteRenderer.js';
import { box, line } from './props.js';
import { stoneTexture, steppingStone } from './StoneArt.js';
import { drawLotus } from './LotusArt.js';
export function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const pick = (random, list) => list[Math.floor(random() * list.length)];

// Ground layers are declared in map JSON and rasterised once per scene into a cached canvas.
const LAYERS = {
  forestFloor(c, l, random, map) {
    // Dry bamboo leaves, fine twigs and patches of canopy light, cached once.
    for (let i = 0; i < 22; i++) {
      const x = random() * map.width, y = random() * map.height, radius = 45 + random() * 95;
      const g = c.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, i % 2 ? '#b6c78216' : '#0a211e35'); g.addColorStop(1, '#243c2c00');
      c.fillStyle = g; c.fillRect(x-radius, y-radius, radius*2, radius*2);
    }
    for (let i = 0; i < (l.count || 900); i++) {
      c.save(); c.translate(random()*map.width, random()*map.height); c.rotate(random()*Math.PI*2);
      c.fillStyle = ['#9f946346','#c2ae7150','#586b424d','#716a454d'][i%4];
      const length = 5 + random()*9;
      c.beginPath(); c.moveTo(-length/2,0); c.quadraticCurveTo(0,-2.6,length/2,0); c.quadraticCurveTo(0,1.3,-length/2,0); c.fill();
      if(i%9===0) {c.strokeStyle='#a38e5740';c.lineWidth=.7;c.beginPath();c.moveTo(-8,2);c.lineTo(10,-1);c.stroke();}
      c.restore();
    }
  },
  noise(c, l, random, map) { for (let i = 0; i < (l.count || 5000); i++) ellipse(c, random() * map.width, random() * map.height, random() * 4 + 1, random() * 2 + 1, pick(random, l.colors)); },
  rect(c, l) { box(c, l.x, l.y, l.w, l.h, l.color, l.r || 0); },
  tiles(c, l, random) {
    if (l.border) box(c, l.x - 20, l.y - 20, l.w + 40, l.h + 40, l.border, 12);
    box(c, l.x, l.y, l.w, l.h, l.grout || '#989071', 8);
    const [tw, th] = l.tile || [80, 42];
    for (let y = l.y + 2, row = 0; y < l.y + l.h - 4; y += th, row++) for (let x = l.x + 2 - (row % 2 ? tw / 2 : 0); x < l.x + l.w - 2; x += tw) {
      const xx = Math.max(x, l.x + 2), ww = Math.min(x + tw - 2, l.x + l.w - 2) - xx, hh = Math.min(th - 2, l.y + l.h - 2 - y);
      if (ww > 0 && hh > 0) {
        box(c, xx, y, ww, hh, pick(random, l.colors || ['#8d8469', '#928970', '#9c9277', '#867e64']), 2);
        stoneTexture(c, xx, y, ww, hh, random);
      }
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
      ellipse(c, l.x, l.y, l.rx, l.ry, '#1f5756');
      c.save(); c.translate(l.x, l.y); c.scale(1, l.ry / l.rx);
      const depth = c.createRadialGradient(-l.rx * .12, -l.rx * .14, l.rx * .12, 0, 0, l.rx);
      depth.addColorStop(0, '#194a4e'); depth.addColorStop(.6, '#2c6663'); depth.addColorStop(.88, '#4b8174'); depth.addColorStop(1, '#718b71');
      ellipse(c, 0, 0, l.rx, l.rx, depth); c.restore();
      // Submerged pebbles remain faint beneath the shallow water at the rim.
      for (let i = 0; i < 65; i++) {
        const a = random() * Math.PI * 2, d = .86 + random() * .09;
        ellipse(c, l.x + Math.cos(a) * l.rx * d, l.y + Math.sin(a) * l.ry * d, 3 + random() * 5, 2 + random() * 2, '#bac59a24');
      }
    }
    for (let i = 0; i < (l.lotus || 0); i++) {
      const a = random() * Math.PI * 2, d = Math.sqrt(random()) * .8, x = l.shape === 'rect' ? l.x + 20 + random() * (l.w - 40) : l.x + Math.cos(a) * l.rx * d, y = l.shape === 'rect' ? l.y + 20 + random() * (l.h - 40) : l.y + Math.sin(a) * l.ry * d;
      drawLotus(c,x,y,random);
    }
  },
  stream(c, l, random) {
    for (const [width, color] of [[l.width + 18, '#5f7062'], [l.width + 7, '#68806a'], [l.width, '#396e65'], [l.width - 14, '#285552'], [l.width - 32, '#214a4a']]) {
      c.strokeStyle = color; c.lineWidth = Math.max(2, width); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); l.points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    }
    for(let i=0;i<l.points.length-1;i++) {
      const [ax,ay]=l.points[i],[bx,by]=l.points[i+1],length=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/length,ny=(bx-ax)/length;
      for(let j=0;j<length/16;j++) {
        const t=random(), side=j%2?1:-1, offset=side*(l.width*.5+3+random()*4);
        ellipse(c,ax+(bx-ax)*t+nx*offset,ay+(by-ay)*t+ny*offset,3+random()*5,2+random()*2,pick(random,['#81907c','#536d5b','#9b9e7e']));
        const u=random(),d=(random()-.5)*l.width*.6;
        line(c,ax+(bx-ax)*u+nx*d,ay+(by-ay)*u+ny*d,ax+(bx-ax)*u+nx*d+8,ay+(by-ay)*u+ny*d-1,'#b1d0b72a',.8);
      }
    }
  },
  path(c, l, random) {
    const pts = l.points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / (l.spacing || 30)));
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        steppingStone(c, ax + (bx - ax) * t + (random() - .5) * 8, ay + (by - ay) * t + (random() - .5) * 6, (l.size || 24) * (.85 + random() * .3), (l.size || 24) * .5, random, pick(random, l.colors || ['#8e9980', '#7f8f76', '#9aa38a']));
      }
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
