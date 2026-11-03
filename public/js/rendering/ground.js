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
  noise(c, l, random, map) {
    const colors = l.colors || ['#385443', '#314e40', '#496044', '#233e36'];
    // Broad low-contrast mottling breaks up flat ground; fine flecks sit above it like soil and leaf litter.
    for (let i = 0; i < 28; i++) {
      const x = random() * map.width, y = random() * map.height, r = 70 + random() * 150;
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, pick(random, colors)); g.addColorStop(1, 'transparent');
      c.globalAlpha = .12; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
    }
    for (let i = 0; i < (l.count || 5000); i++) {
      const x = random() * map.width, y = random() * map.height;
      ellipse(c, x, y, random() * 4 + 1, random() * 2 + 1, pick(random, colors));
      if (i % 23 === 0) { c.strokeStyle = '#d3c99b18'; c.lineWidth = .7; c.beginPath(); c.moveTo(x - 5, y + 1); c.quadraticCurveTo(x, y - 1, x + 7, y); c.stroke(); }
    }
  },
  rect(c, l) {
    const radius = l.r || 0;
    box(c, l.x + 3, l.y + 5, l.w, l.h, '#16251d44', radius + 2);
    box(c, l.x, l.y, l.w, l.h, l.color, radius);
    c.strokeStyle = '#eee4c51c'; c.lineWidth = 1; c.beginPath(); c.moveTo(l.x + radius, l.y + 1); c.lineTo(l.x + l.w - radius, l.y + 1); c.stroke();
    c.strokeStyle = '#18251e33'; c.beginPath(); c.moveTo(l.x + radius, l.y + l.h - 1); c.lineTo(l.x + l.w - radius, l.y + l.h - 1); c.stroke();
  },
  tiles(c, l, random) {
    if (l.border) { box(c, l.x - 22, l.y - 22, l.w + 44, l.h + 44, '#262d27aa', 13); box(c, l.x - 20, l.y - 20, l.w + 40, l.h + 40, l.border, 12); box(c, l.x - 15, l.y - 15, l.w + 30, l.h + 30, '#e1d3ad33', 9); }
    box(c, l.x, l.y, l.w, l.h, l.grout || '#989071', 8);
    c.strokeStyle = '#eee4c544'; c.lineWidth = 1; c.strokeRect(l.x + 1, l.y + 1, l.w - 2, l.h - 2);
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
      const plank = pick(random, l.colors || ['#7a4f36', '#835640', '#73492f', '#8a5d43']);
      const bevel = c.createLinearGradient(0, y, 0, y + hh); bevel.addColorStop(0, '#e9d0a41c'); bevel.addColorStop(.2, plank); bevel.addColorStop(1, '#24170e35');
      box(c, xx, y + 1, ww, hh, bevel, 1);
      c.strokeStyle = '#28190f88'; c.lineWidth = .8; c.beginPath(); c.moveTo(xx + 2, y + hh); c.lineTo(xx + ww - 2, y + hh); c.stroke();
      // Faint grain lines so the floor reads as timber rather than brick.
      for (let k = 0; k < 3; k++) { const gy = y + 6 + k * 8 + random() * 3; c.strokeStyle = k % 2 ? 'rgba(40,22,12,.2)' : 'rgba(231,203,155,.12)'; c.lineWidth = k === 1 ? 1 : .6; c.beginPath(); c.moveTo(xx + 6, gy); c.bezierCurveTo(xx + ww * .3, gy + 2, xx + ww * .6, gy - 2, xx + ww - 6, gy + 1); c.stroke(); }
      if (random() < .12 && ww > 80) { const kx = xx + 24 + random() * (ww - 48); c.strokeStyle = '#21170f44'; c.lineWidth = 1; c.beginPath(); c.ellipse(kx, y + 15, 5 + random() * 3, 1.6, 0, 0, Math.PI * 2); c.stroke(); }
    }
  },
  floorInlay(c, l) {
    // Symmetric, understated brass and honey-oak borders frame the central carpet.
    c.strokeStyle = '#68472f'; c.lineWidth = 8; c.strokeRect(l.x + 5, l.y + 5, l.w - 10, l.h - 10);
    c.strokeStyle = '#d1ad70'; c.lineWidth = 2; c.strokeRect(l.x + 13, l.y + 13, l.w - 26, l.h - 26);
    c.strokeStyle = '#f0d9a255'; c.lineWidth = 1; c.strokeRect(l.x + 19, l.y + 19, l.w - 38, l.h - 38);
    for (const [x, y] of [[l.x + 27,l.y + 27],[l.x + l.w - 27,l.y + 27],[l.x + 27,l.y + l.h - 27],[l.x + l.w - 27,l.y + l.h - 27]]) {
      c.strokeStyle = '#d4b477'; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ellipse(c, x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 1.4, 2.2, '#e5cb91'); }
    }
  },
  carpet(c, l) {
    box(c, l.x - 5, l.y + 5, l.w + 10, l.h + 10, '#18130f66', 8); box(c, l.x, l.y, l.w, l.h, l.border || '#b8904f', 6);
    box(c, l.x + 5, l.y + 5, l.w - 10, l.h - 10, '#4a3026', 4); box(c, l.x + 9, l.y + 9, l.w - 18, l.h - 18, l.color || '#8c2f2a', 3);
    c.strokeStyle = '#d2b577aa'; c.lineWidth = 1.4; c.strokeRect(l.x + 20, l.y + 20, l.w - 40, l.h - 40);
    c.strokeStyle = '#e2c78955'; c.lineWidth = 1; c.strokeRect(l.x + 29, l.y + 29, l.w - 58, l.h - 58);
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) { const t = i / 4, px = l.x + 30 + t * (l.w - 60); ellipse(c, px, l.y + (side < 0 ? 18 : l.h - 18), 2.2, 3.2, '#e0c17c88'); }
  },
  sand(c, l, random) {
    box(c, l.x - 14, l.y - 14, l.w + 28, l.h + 28, '#8a8270', 10); box(c, l.x, l.y, l.w, l.h, '#d8ccad', 6);
    for (let y = l.y + 10; y < l.y + l.h - 4; y += 9) { c.strokeStyle = y % 18 ? '#c5b896' : '#e6dcc0'; c.lineWidth = 2; c.beginPath(); c.moveTo(l.x + 6, y); for (let x = l.x + 6; x < l.x + l.w - 6; x += 30) c.lineTo(x + 30, y + Math.sin(x * .02) * 1.5); c.stroke(); }
    for (const [x, y, r] of l.rocks || []) { for (let k = 1; k < 5; k++) { c.strokeStyle = k % 2 ? '#c2b593' : '#ece3c9'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r + k * 9, (r + k * 9) * .55, 0, 0, Math.PI * 2); c.stroke(); } }
  },
  water(c, l, random) {
    if (l.shape === 'rect') {
      box(c, l.x - 14, l.y - 13, l.w + 28, l.h + 26, '#414d43', 20); box(c, l.x - 7, l.y - 7, l.w + 14, l.h + 14, '#9b987d', 17);
      box(c, l.x, l.y, l.w, l.h, '#1b4445', 14); box(c, l.x + 7, l.y + 6, l.w - 14, l.h - 14, '#346763', 12);
      c.strokeStyle = '#d3cfaa55'; c.lineWidth = 1.5; c.beginPath(); c.roundRect(l.x + 8, l.y + 7, l.w - 16, l.h - 16, 11); c.stroke();
    }
    else {
      if (l.rim !== false) {
        ellipse(c, l.x, l.y + 2, l.rx + 23, l.ry + 18, '#394a3e'); ellipse(c, l.x, l.y, l.rx + 14, l.ry + 10, '#8d9278');
        for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; ellipse(c, l.x + Math.cos(a) * (l.rx + 16), l.y + Math.sin(a) * (l.ry + 12), 13 + random() * 6, 8 + random() * 5, pick(random, ['#899580', '#717e6c', '#a6a58a'])); }
      }
      ellipse(c, l.x, l.y, l.rx, l.ry, '#1b4547');
      c.save(); c.translate(l.x, l.y); c.scale(1, l.ry / l.rx);
      const depth = c.createRadialGradient(-l.rx * .12, -l.rx * .14, l.rx * .12, 0, 0, l.rx);
      depth.addColorStop(0, '#194a4e'); depth.addColorStop(.6, '#2c6663'); depth.addColorStop(.88, '#4b8174'); depth.addColorStop(1, '#718b71');
      ellipse(c, 0, 0, l.rx, l.rx, depth); c.restore();
      // Broken, static sky reflections add surface detail without competing with the animated ripples.
      c.save(); c.beginPath(); c.ellipse(l.x, l.y, l.rx - 8, l.ry - 8, 0, 0, Math.PI * 2); c.clip();
      for (let i = 0; i < 42; i++) { const px = l.x + (random() - .5) * l.rx * 1.55, py = l.y + (random() - .5) * l.ry * 1.45, len = 5 + random() * 24; c.strokeStyle = i % 4 ? '#d5e0c51c' : '#e7e2c339'; c.lineWidth = i % 4 ? .8 : 1.3; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + len * .5, py - 1.5, px + len, py); c.stroke(); }
      c.restore();
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
  dirt(c, l, random) {
    const trace = () => { c.beginPath(); l.points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); };
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#1f2c2455'; c.lineWidth = (l.width || 70) + 14; trace(); c.stroke();
    c.strokeStyle = l.edge || '#7d735a'; c.lineWidth = l.width || 70; trace(); c.stroke();
    c.strokeStyle = l.color || '#6f6650'; c.lineWidth = (l.width || 70) - 18; trace(); c.stroke();
    // A handful of worn pebbles are baked into the path surface, never placed in collision data.
    for (let s = 0; s < l.points.length - 1; s++) {
      const [ax, ay] = l.points[s], [bx, by] = l.points[s + 1], length = Math.hypot(bx - ax, by - ay), count = Math.floor(length / 48);
      for (let i = 0; i < count; i++) { const t = random(), nx = -(by - ay) / length, ny = (bx - ax) / length, offset = (random() - .5) * (l.width || 70) * .45; ellipse(c, ax + (bx - ax) * t + nx * offset, ay + (by - ay) * t + ny * offset, 1 + random() * 2, .7 + random(), '#c8bd9b55'); }
    }
  },
  scatter(c, l, random) {
    for (let i = 0; i < l.count; i++) {
      const x = l.x + random() * l.w, y = l.y + random() * l.h;
      if (l.kind === 'grass') {
        ellipse(c, x, y + 1, 3.5, 1.2, '#172d2050');
        const height = 5 + random() * 6;
        line(c, x, y, x - 2 - random() * 2, y - height, pick(random, l.colors), 1.2);
        line(c, x, y, x + 2 + random() * 2, y - height * .8, pick(random, l.colors), 1.4);
        if (i % 3 === 0) line(c, x, y, x + (random() - .5) * 3, y - height * 1.15, pick(random, l.colors), .9);
      } else ellipse(c, x, y, l.size || 3, l.size || 3, pick(random, l.colors));
    }
  },
  sideWall(c, l) {
    const h = l.h, face = c.createLinearGradient(l.x - 5, 0, l.x + 25, 0); face.addColorStop(0, '#596455'); face.addColorStop(.28, '#858b75'); face.addColorStop(.7, '#a6a58b'); face.addColorStop(1, '#5b6557');
    box(c, l.x - 3, l.y + 5, 26, h, '#15271f55'); box(c, l.x, l.y, 20, h, face);
    box(c, l.x - 8, l.y - 4, 36, 12, '#5b6152', 3); box(c, l.x - 6, l.y - 7, 32, 8, '#c0b99a', 3); line(c, l.x - 5, l.y - 6, l.x + 24, l.y - 6, '#f0e6c966', 1);
    for (let y = l.y + 30, row = 0; y < l.y + h - 20; y += 110, row++) {
      box(c, l.x - 7, y + 3, 34, 37, '#26382f55', 4); box(c, l.x - 8, y, 36, 36, '#596555', 4); box(c, l.x - 4, y + 4, 28, 27, '#414c43', 3); box(c, l.x - 1, y + 7, 22, 21, '#84907a', 2);
      for (let k = 0; k < 3; k++) line(c, l.x + 4 + k * 7, y + 8, l.x + 4 + k * 7, y + 27, '#b6b599', 1.4);
      line(c, l.x - 8, y + 37, l.x + 28, y + 37, '#c4b994', 2); line(c, l.x + 2, y + 48, l.x + 19, y + 48, '#59645466', 1);
      if (row % 2 === 0) line(c, l.x + 3, y + 62, l.x + 16, y + 66, '#d9d1ae33', 1);
    }
  },
  shadowEdge(c, l, random, map) { const g = c.createLinearGradient(0, 0, 0, l.h); g.addColorStop(0, 'rgba(10,25,24,.55)'); g.addColorStop(1, 'rgba(10,25,24,0)'); c.fillStyle = g; c.fillRect(0, 0, map.width, l.h); },
};

export function buildGround(map) {
  const canvas = document.createElement('canvas'); canvas.width = map.width; canvas.height = map.height;
  const c = canvas.getContext('2d'), random = seeded(map.seed || 91);
  c.fillStyle = map.ground?.base || '#29483e'; c.fillRect(0, 0, map.width, map.height);
  for (const layer of map.ground?.layers || []) LAYERS[layer.type]?.(c, layer, random, map);
  return canvas;
}
