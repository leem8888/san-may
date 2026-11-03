import { drawTempleGate } from './GateArt.js';
import { drawLibraryTeaTable } from './LibraryTeaArt.js';
import { drawFishFeeder } from './FishFeedingArt.js';
import { vegetablePatch, bookStack, fern, libraryWindow } from './SceneryPolish.js';
import { drawBellBody, drawNoticeBoard, hallOrnaments } from './TempleDetails.js';
import { drawMeditationCushion } from './CushionArt.js';
import { drawOfferingStall, drawOfferingStand } from './OfferingArt.js';
import { drawBamboo } from './BambooArt.js';
import { drawTree } from './TreeArt.js';
import { drawStandingLantern, drawStoneLantern, drawHangingLantern } from './LanternArt.js';
import { drawBuddha } from './BuddhaArt.js';
import { drawCat } from './CatArt.js';
import { drawCandle } from './CandleArt.js';
import { ellipse, polygon } from './SpriteRenderer.js';
import { STORY_PROPS } from './StoryProps.js';
// Original, procedurally drawn scenery. Every prop is `draw(c, o, env)` in world space, base point at (o.x, o.y).
export function line(c, x, y, xx, yy, color, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
export function box(c, x, y, w, h, color, r = 0) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
export function shadow(c, x, y, rx, ry, env) { const s = env.shadow; ellipse(c, x + s.dx * rx / 60, y, rx * s.stretch, ry, `rgba(8,28,30,${s.alpha.toFixed(3)})`); }
function gradient(c, x, w, colors) { const g = c.createLinearGradient(x, 0, x + w, 0); colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color)); return g; }
function beam(c, x1, y1, x2, y2, width, color) { const length = Math.hypot(x2 - x1, y2 - y1); c.save(); c.translate((x1 + x2) / 2, (y1 + y2) / 2); c.rotate(Math.atan2(y2 - y1, x2 - x1)); box(c, -length / 2, -width / 2, length, width, color, 2); c.restore(); }
const sway = (env, i, amount = 3) => env.reduced ? 0 : Math.sin(env.time * (.6 + env.wind * .9) + i) * amount * (.6 + env.wind);

function roof(c, cx, y, w, h, color = '#2b4541', trim = '#cfad6e') {
  polygon(c, [[cx - w / 2 - 28, y + h], [cx - w / 2 + 70, y], [cx + w / 2 - 70, y], [cx + w / 2 + 28, y + h], [cx + w / 2 - 10, y + h - 10], [cx - w / 2 + 10, y + h - 10]], color, trim);
  for (let row = 0; row < Math.floor(h / 22); row++) for (let x = cx - w / 2 + 50 - row * 17; x < cx + w / 2 - 40 + row * 17; x += 25) { line(c, x, y + 12 + row * 18, x - 9, y + 29 + row * 18, '#668072', 2); line(c, x, y + 29 + row * 18, x + 16, y + 29 + row * 18, '#809080', 1); }
  line(c, cx - w / 2 + 65, y, cx + w / 2 - 65, y, '#d5b477', 5);
  for (const side of [-1, 1]) polygon(c, [[cx + side * (w / 2 + 28), y + h], [cx + side * (w / 2 + 40), y + h - 22], [cx + side * (w / 2 + 18), y + h - 6]], trim);
}

export const PROPS = {
  vegetablePatch, bookStack, fern, libraryWindow,
  fishFeeder: drawFishFeeder,
  fishTub(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 3, 56, 13, env);
    // The fish bowl and feed sack make the vendor readable from across the gate.
    box(c, x - 42, y - 28, 84, 25, '#785439', 9);
    ellipse(c, x, y - 27, 42, 12, '#b78a58');
    ellipse(c, x, y - 29, 36, 8, '#517f80');
    for (const [dx, dy, phase] of [[-17, -31, 0], [13, -27, 2], [1, -34, 4]]) {
      const fx = x + dx + (env.reduced ? 0 : Math.sin(env.time * 1.5 + phase) * 3);
      ellipse(c, fx, y + dy, 7, 2.5, '#e4ad68');
      polygon(c, [[fx - 6, y + dy], [fx - 11, y + dy - 3], [fx - 11, y + dy + 3]], '#d58f58');
      ellipse(c, fx + 3, y + dy - 1, 1, 1, '#304c44');
    }
    box(c, x + 46, y - 23, 24, 21, '#c9ae79', 4);
    box(c, x + 46, y - 26, 24, 6, '#a98052', 3);
    c.textAlign = 'center'; c.font = 'bold 8px system-ui'; c.fillStyle = '#62472d'; c.fillText('CÁM', x + 58, y - 9);
  },
  bunCart(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 3, 48, 10, env);
    box(c, x - 35, y - 23, 70, 17, '#7c4e32', 3); box(c, x - 39, y - 29, 78, 8, '#b68750', 3);
    box(c, x - 30, y - 50, 60, 21, '#8b603b', 4); box(c, x - 26, y - 46, 52, 15, '#49372a', 3);
    for (const dx of [-13, 0, 13]) { ellipse(c, x + dx, y - 47, 7, 4, '#d9bd8a'); ellipse(c, x + dx, y - 48, 4, 2.5, '#f0dfb7'); }
    box(c, x - 24, y - 67, 48, 13, '#e3cf9e', 2); box(c, x - 20, y - 64, 40, 7, '#723b2a', 1);
    c.fillStyle = '#fff0c6'; c.font = 'bold 5px Arial'; c.textAlign = 'center'; c.fillText('BÁNH BAO CHAY', x, y - 58);
    for (const dx of [-28, 28]) { ellipse(c, x + dx, y - 3, 8, 8, '#49372a'); ellipse(c, x + dx, y - 3, 4, 4, '#b58b55'); }
    if (!env.reduced) for (let i = 0; i < 3; i++) {
      const phase = (env.time * .28 + i / 3) % 1, sx = x - 11 + i * 11 + Math.sin(env.time * 1.1 + i) * 2;
      ellipse(c, sx, y - 73 - phase * 15, 1.5 + phase, 3 + phase * 2, `rgba(245,231,196,${.24 * (1 - phase)})`);
    }
  },
  vegFoodCart(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 2, 65, 12, env);
    // A compact street kitchen: pushcart, canopy, lit stove and a lidded steamer.
    for (const dx of [-43, 43]) { ellipse(c, x + dx, y - 2, 9, 9, '#3e3429'); ellipse(c, x + dx, y - 2, 4, 4, '#b28a56'); }
    box(c, x - 50, y - 42, 100, 28, '#714a30', 4); box(c, x - 48, y - 40, 96, 4, '#c1935d', 2);
    box(c, x - 44, y - 14, 5, 16, '#5b402b', 1); box(c, x + 39, y - 14, 5, 16, '#5b402b', 1);
    for (const dx of [-48, 48]) { box(c, x + dx - 2, y - 108, 4, 68, '#704c30', 1); box(c, x + dx - 4, y - 110, 8, 4, '#c1945c', 1); }
    polygon(c, [[x-62,y-108],[x-46,y-130],[x+46,y-130],[x+62,y-108]], '#a04f39');
    box(c, x - 62, y - 110, 124, 7, '#dfbd7d', 2);
    for(let i=-4;i<=4;i++) line(c,x+i*13,y-109,x+i*10,y-126,'#f0d7a477',1);
    // Stove and fire glow.
    box(c, x - 28, y - 69, 39, 28, '#524139', 4); box(c, x - 25, y - 72, 33, 6, '#9b7652', 3);
    ellipse(c, x - 9, y - 65, 12, 4, '#d28443'); ellipse(c, x - 9, y - 64, 7, 2, '#ffd27d');
    // Bamboo steamer stack with a cloth liner and lid.
    box(c, x + 14, y - 77, 30, 23, '#b98b51', 5); box(c, x + 12, y - 80, 34, 5, '#e1c38a', 3);
    box(c, x + 15, y - 68, 28, 2, '#815a38', 1); box(c, x + 15, y - 60, 28, 2, '#815a38', 1);
    ellipse(c, x + 29, y - 81, 18, 5, '#8f653f'); ellipse(c, x + 29, y - 84, 14, 3, '#d5ae70');
    // Ingredient bowls and herbs on the left end.
    ellipse(c, x - 40, y - 49, 11, 4, '#d5bd8f'); ellipse(c, x - 40, y - 51, 8, 2, '#88a16a');
    ellipse(c, x + 1, y - 48, 9, 4, '#cbb07c'); ellipse(c, x + 1, y - 50, 6, 2, '#c76d4e');
    box(c, x - 13, y - 37, 27, 8, '#d7bd87', 2); c.fillStyle='#f3e6c9';c.font='bold 6px system-ui';c.textAlign='center';c.fillText('MÓN CHAY',x,y-31);
    if (!env.reduced) for(let i=0;i<2;i++){const s=(env.time*.24+i*.5)%1;ellipse(c,x+29+Math.sin(env.time+i)*2,y-91-s*13,2+s,3+s*2,`rgba(246,238,220,${.22*(1-s)})`);}
  },
  restaurantSeat(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 16, 4, env);
    for (const dx of [-12, 10]) {
      box(c, x + dx, y - 14, 3, 16, '#60452f', 1);
      box(c, x + dx, y - 38, 3, 28, '#795438', 1);
      box(c, x + dx - 2, y - 40, 7, 4, '#bd9460', 1);
    }
    box(c, x - 14, y - 17, 28, 6, '#9b7048', 2);
    box(c, x - 12, y - 36, 24, 4, '#a17a4f', 2);
    box(c, x - 11, y - 28, 22, 3, '#755238', 1);
    line(c, x - 9, y - 15, x - 8, y - 1, '#533b2b', 1.5); line(c, x + 9, y - 15, x + 8, y - 1, '#533b2b', 1.5);
  },
  restaurantTable(c, o, env) {
    const { x, y } = o, w = o.w || 140, table = o.restaurant;
    shadow(c, x, y, w * .42, 9, env);
    for (const dx of [-w * .28, w * .28]) box(c, x + dx - 4, y - 34, 8, 34, '#63462f', 2);
    box(c, x - w * .42, y - 38, w * .84, 9, '#714b30', 3);
    ellipse(c, x, y - 42, w * .5, 16, '#825a38'); ellipse(c, x, y - 47, w * .5, 15, '#b18352');
    ellipse(c, x, y - 49, w * .43, 11, '#c29a64');
    c.strokeStyle = '#e0c08a99'; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 47, w * .43 - 4, 11, 0, Math.PI, Math.PI * 2); c.stroke();
    for (let i = -2; i <= 2; i++) line(c, x + i * 18, y - 56, x + i * 16, y - 43, '#8b6846aa', .8);
    if (table?.cleaning) {
      const sway = env.reduced ? 0 : Math.sin(env.time * 7) * 5;
      c.save(); c.translate(x + sway, y - 53); c.rotate(-.18);
      box(c, -15, -5, 30, 10, '#e0d3b1', 3); line(c, -10, -2, 10, -2, '#b9a47b', 1); c.restore();
    } else if (table?.seats?.some(s => s.order?.status === 'served')) {
      table.seats.forEach((seat, i) => {
        if (seat.order?.status !== 'served') return;
        const dx = i < table.seats.length / 2 ? -25 : 25, by = y - 58;
        ellipse(c, x + dx, by + 6, 13, 5, '#725a3c'); ellipse(c, x + dx, by + 4, 11, 4, '#eee0c0');
        ellipse(c, x + dx - 3, by + 2, 4, 2.5, seat.order.sku === 'mushroomPho' ? '#7d9a62' : '#d2a867');
        ellipse(c, x + dx + 3, by + 2, 4, 2.5, seat.order.sku === 'veggieDumplings' ? '#d5bd92' : '#729253');
        for (let k = 0; k < 2; k++) line(c, x + dx + k * 3, by - 1, x + dx + k * 3 + Math.sin(env.time + k) * 1.5, by - 8, '#fff1d566', 1);
      });
    }
    // Keep a chopstick holder on every table, even before anyone orders.
    box(c, x - 5, y - 62, 13, 7, '#8a5c35', 1);
    box(c, x - 4, y - 61, 11, 2, '#c19159', 1);
    for (let i = 0; i < 3; i++) line(c, x - 3 + i * 3, y - 62, x - 5 + i * 3, y - 72, '#d8bd8b', 1);
    // A little carved apron and brass corner studs finish the roadside tables.
    box(c, x - 22, y - 37, 44, 4, '#c29a64', 1);
    for (const dx of [-w * .4, w * .4]) ellipse(c, x + dx, y - 43, 1.7, 1.7, '#e4c47f');
  },
  fishReleasePier(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 2, 39, 9, env);
    for (const dx of [-32, 28]) box(c, x + dx, y - 24, 5, 29, '#79563a', 2);
    box(c, x - 39, y - 24, 79, 11, '#b08b57', 3);
    for (const dx of [-23, -7, 9, 25]) line(c, x + dx, y - 22, x + dx, y - 14, '#79563a', 1);
    box(c, x - 29, y - 63, 58, 30, '#cfbd91', 5);
    c.textAlign = 'center'; c.fillStyle = '#3a5548'; c.font = 'bold 10px system-ui';
    c.fillText('THẢ CÁ', x, y - 44);
    const bob=env.reduced?0:Math.sin(env.time*2.4)*1.5;
    ellipse(c, x - 3, y - 28+bob, 8, 3, '#d59b63');
    polygon(c, [[x - 10, y - 28+bob], [x - 16, y - 32+bob], [x - 16, y - 24+bob]], '#c37e4e');
  },
  ...STORY_PROPS,
  offeringStall: drawOfferingStall,
  offeringStand: drawOfferingStand,
  shoeRack(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 43, 9, env);
    // Compact lacquered shoe cabinet: four joined posts, two shelves and visible pairs of sandals.
    for (const dx of [-35, 31]) {
      box(c, x + dx, y - 48, 5, 50, '#553b2b', 1);
      box(c, x + dx + 1, y - 47, 1.5, 45, '#b28a59', .5);
      box(c, x + dx - 2, y - 49, 9, 4, '#b98f5b', 1);
    }
    for (const dy of [-34, -12]) {
      box(c, x - 41, y + dy, 82, 7, '#533a29', 2);
      box(c, x - 39, y + dy, 78, 4, '#b18450', 1);
      line(c, x - 30, y + dy + 1, x + 29, y + dy + 1, '#e0bb7c66', .8);
    }
    const sandals = (cx, cy, color, flip = false) => {
      for (const side of [-1, 1]) {
        const sx = cx + side * 7, sy = cy + (flip ? side * 1.5 : 0);
        c.save(); c.translate(sx, sy); c.rotate(flip ? -.08 : .05);
        c.fillStyle = '#36271f88'; c.beginPath(); c.ellipse(1, 2, 5, 10, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = color; c.beginPath(); c.ellipse(0, 0, 4.6, 9.5, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#d5bd8c'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-2.7, -4); c.quadraticCurveTo(0, 1, 2.7, -4); c.stroke();
        c.fillStyle = '#ead8ad'; c.beginPath(); c.arc(0, 1, .9, 0, Math.PI * 2); c.fill(); c.restore();
      }
    };
    sandals(x - 18, y - 37, '#574334'); sandals(x + 14, y - 37, '#74503a', true);
    sandals(x - 2, y - 15, '#3e493d', true); sandals(x + 24, y - 15, '#6a4936');
    box(c, x - 12, y - 54, 24, 5, '#463326', 2); box(c, x - 9, y - 55, 18, 1, '#dfc38a', .5);
  },
  loveTable(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 46, 9, env);
    // A small, cared-for altar table with joined legs, a carved apron and a covered fortune-stick cup.
    for (const dx of [-29, 23]) {
      box(c, x + dx, y - 31, 7, 32, '#4e3527', 2);
      box(c, x + dx + 1, y - 29, 2, 27, '#9a7048', 1);
      box(c, x + dx - 1, y - 2, 10, 3, '#61432d', 1);
    }
    box(c, x - 29, y - 12, 58, 4, '#67452f', 1);
    box(c, x - 40, y - 37, 80, 11, '#503728', 3);
    box(c, x - 38, y - 38, 76, 7, '#a4774d', 2);
    line(c, x - 33, y - 34, x + 33, y - 34, '#dfbb7b', 1);
    box(c, x - 22, y - 29, 44, 15, '#794637', 2);
    c.strokeStyle = '#c99a60'; c.lineWidth = 1; c.strokeRect(x - 18, y - 27, 36, 11);
    // Lotus medallion on the front panel.
    ellipse(c, x, y - 22, 2, 2, '#e2bf7e');
    for (let i = -2; i <= 2; i++) { c.save(); c.translate(x + i * 2.3, y - 23); c.rotate(i * .22); ellipse(c, 0, -2.2, 1.2, 3, '#cf9b68'); c.restore(); }
    // Red lacquer fortune cup and a small pair of folded wish slips on the tabletop.
    shadow(c, x, y - 40, 12, 3, env);
    box(c, x - 9, y - 53, 18, 14, '#743c31', 4); box(c, x - 11, y - 55, 22, 4, '#c79d61', 2);
    ellipse(c, x, y - 54, 9, 2.3, '#3c2d25');
    for (const [dx, h] of [[-5, 18], [0, 23], [5, 15]]) {
      line(c, x + dx, y - 56, x + dx + (dx ? .8 : 0), y - 56 - h, '#d9bf83', 1.7);
      ellipse(c, x + dx + (dx ? .8 : 0), y - 56 - h, 1, 1.4, '#f0d697');
    }
    box(c, x + 16, y - 44, 9, 5, '#e4d6b6', 1); line(c, x + 18, y - 42, x + 23, y - 42, '#b87d64', .7);
    box(c, x - 26, y - 43, 8, 5, '#d6c49e', 1); line(c, x - 24, y - 41, x - 20, y - 41, '#b87d64', .7);
  },
  cat: drawCat,
  tree: drawTree,
  pine(c, o, env) { drawTree(c, o, env, true); },
  bamboo: drawBamboo,
  bush(c, o, env) {
    const { x, y } = o, seed = Math.abs(Math.floor(x * 17 + y * 31)); shadow(c, x, y, 48, 12, env);
    ellipse(c, x, y - 4, 43, 12, '#26392d99');
    const clusters = [
      [-30,-12,18],[-15,-21,20],[4,-18,22],[25,-12,17],[-2,-31,17],[34,-23,14],[-39,-22,13]
    ];
    // A deep, uneven silhouette with overlapping leaf masses and shaded undersides.
    for (let i = 0; i < clusters.length; i++) {
      const [dx,dy,r] = clusters[i], px = x + dx + sway(env, i + seed, 1.1), py = y + dy;
      const g = c.createRadialGradient(px - r * .35, py - r * .5, 1, px, py, r * 1.35);
      g.addColorStop(0, ['#77915b','#698653','#82965b','#587b4d'][i % 4]); g.addColorStop(.55, ['#4d7148','#456a43','#52734a','#3f6541'][i % 4]); g.addColorStop(1, '#263d2e');
      ellipse(c, px, py, r, r * .72, '#263b2e'); ellipse(c, px, py - 1, r - 1, r * .68, g);
      for (let k = 0; k < 8; k++) {
        const a = (k * 2.399 + i * 1.3) % (Math.PI * 2), d = Math.sqrt((k + 1) / 9) * r * .7;
        const lx = px + Math.cos(a) * d, ly = py + Math.sin(a) * d * .58;
        c.save(); c.translate(lx, ly); c.rotate(a * .35); ellipse(c, 0, 0, 4 + (k % 3), 1.5, k % 3 ? '#bfd08a55' : '#d3d79555'); c.restore();
      }
    }
    if (o.flowers) {
      const count = 5 + seed % 3;
      for (let i = 0; i < count; i++) {
        const dx = -31 + ((i * 19 + seed % 11) % 63), fy = y - 17 - ((i * 13 + seed) % 18), fx = x + dx;
        line(c, fx, fy + 4, fx + (i % 2 ? 2 : -1), y - 7, '#66804a', 1);
        if (i % 2 === 0) { ellipse(c, fx - 3, fy + 1, 4, 1.8, '#82995a'); ellipse(c, fx + 3, fy + 3, 3.5, 1.5, '#91a363'); }
        const petals = i % 3 === 0 ? 5 : 4, radius = 2.5 + i % 2;
        for (let p = 0; p < petals; p++) { const a = p * Math.PI * 2 / petals; ellipse(c, fx + Math.cos(a) * radius * .7, fy + Math.sin(a) * radius * .55, 1.8, 2.4, o.flowers); }
        ellipse(c, fx, fy, 1.2, 1.2, '#f0d17c');
      }
    }
  },
  rock(c, o, env) {
    const s = o.size || 1, { x, y } = o; shadow(c, x, y, 32 * s, 10 * s, env);
    polygon(c, [[x - 30 * s, y], [x - 24 * s, y - 20 * s], [x - 8 * s, y - 34 * s], [x + 8 * s, y - 35 * s], [x + 27 * s, y - 18 * s], [x + 31 * s, y]], '#59645c', '#434c45');
    polygon(c, [[x - 24 * s, y - 19 * s], [x - 8 * s, y - 34 * s], [x + 8 * s, y - 35 * s], [x + 2 * s, y - 16 * s], [x - 9 * s, y - 9 * s]], '#a0a698');
    polygon(c, [[x + 8 * s, y - 35 * s], [x + 27 * s, y - 18 * s], [x + 31 * s, y], [x + 2 * s, y], [x + 2 * s, y - 16 * s]], '#737d72');
    line(c, x - 20 * s, y - 17 * s, x - 10 * s, y - 25 * s, '#d0d3c366', 1.2); line(c, x + 8 * s, y - 31 * s, x + 4 * s, y - 19 * s, '#4a574d88', 1);
    ellipse(c, x - 12 * s, y - 5 * s, 9 * s, 3 * s, '#60794f'); ellipse(c, x - 7 * s, y - 7 * s, 5 * s, 2 * s, '#809263');
  },
  bench(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 4, 72, 15, env);
    const stone = gradient(c, x - 60, 120, ['#747c70', '#c0c3ad', '#969e8d', '#70796e']);
    for (const dx of [-48, 34]) { box(c, x + dx, y - 5, 14, 22, '#596456', 3); box(c, x + dx + 2, y - 3, 3, 16, '#b5b9a3', 1); }
    box(c, x - 58, y - 22, 116, 9, '#62695d', 4); box(c, x - 60, y - 26, 120, 8, stone, 4);
    line(c, x - 52, y - 24, x + 50, y - 24, '#edf0d388', 1.2); line(c, x - 40, y - 17, x - 34, y - 15, '#5d685b88', .8);
    for (const dx of [-54, 50]) ellipse(c, x + dx, y - 22, 1.2, 1.2, '#d7d4bd');
  },
  board: drawNoticeBoard,
  sign(c, o) { const { x, y } = o; box(c, x - 4, y - 70, 8, 72, '#6b5038'); box(c, x - 50, y - 92, 100, 40, '#7a5a3f', 4); box(c, x - 45, y - 87, 90, 30, '#d8c69a', 3); c.font = '11px Arial'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText(o.text || 'Hướng dẫn', x, y - 68); },
  bell(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 5, 60, 18, env);
    for(const side of [-1,1]){const px=x+side*43;box(c,px-7,y-106,14,108,'#493728',2);box(c,px-4,y-105,4,104,'#a17c50',1);box(c,px-11,y-3,22,6,'#7b674b',2);}
    beam(c,x-54,y-108,x+54,y-108,15,'#4c3828');beam(c,x-51,y-111,x+51,y-111,6,'#bd9862');
    beam(c,x-42,y-97,x-20,y-108,7,'#886747');beam(c,x+42,y-97,x+20,y-108,7,'#886747');
    for(const side of [-1,1]){box(c,x+side*43-9,y-110,18,7,'#d0ad70',2);box(c,x+side*43-3,y-101,6,8,'#c39d61',1);}
    const age = env.time - (env.bells[o.id] ?? -100), swing = age < 4 ? Math.sin(age * 12) * .15 * Math.exp(-age) : 0;
    c.save(); c.translate(x, y - 100); c.rotate(swing); drawBellBody(c); c.restore();
    line(c, x, y - 22, x, y + 14, '#4b392b', 4);line(c,x-1,y-22,x-1,y+11,'#d1bb8c',1);ripples(c, x, y - 22, age, 1);
  },
  bigBell(c, o, env) {
    const { x, y } = o, age = env.time - (env.bells[o.id] ?? -100), swing = !env.reduced && age >= 0 && age < 8 ? Math.sin(age * 6) * .095 * Math.exp(-age * .45) : 0;
    shadow(c, x, y + 8, 150, 34, env);
    box(c, x - 150, y - 12, 300, 22, '#655848', 4);box(c,x-145,y-9,290,4,'#c8b58a',2); box(c, x - 140, y - 18, 280, 10, '#a59c80', 3);
    const timber=gradient(c,x-130,260,['#56372c','#a56747','#704534','#ae7650','#4f332a']);
    for (const side of [-1, 1]) {
      const px=x+side*118;box(c,px-12,y-230,24,222,'#4b342b',3);box(c,px-9,y-228,18,216,timber,2);line(c,px-5,y-218,px-5,y-34,'#dfaa7255',1);
      box(c,px-16,y-24,32,17,'#6f5943',3);box(c,px-19,y-20,38,7,'#c2a16b',2);
      box(c,px-14,y-235,28,11,'#bd9661',2);ellipse(c,px,y-229,2,2,'#ead39a');
    }
    beam(c,x-118,y-199,x-57,y-235,15,'#684234');beam(c,x+118,y-199,x+57,y-235,15,'#684234');
    line(c,x-112,y-202,x-62,y-232,'#c28c5f66',1.4);line(c,x+112,y-202,x+62,y-232,'#c28c5f66',1.4);
    box(c, x - 135, y - 238, 270, 16, '#4c342a', 3);box(c,x-130,y-237,260,7,timber,2);box(c,x-140,y-225,280,7,'#c39a62',2);
    c.save(); c.translate(x, y - 222); c.rotate(swing);
    line(c, 0, 0, 0, 22, '#3d3528', 6);
    drawBellBody(c, true); c.restore();
    // The striker log hangs on two ropes and swings back after each strike.
    const pull = !env.reduced && age >= 0 && age < 1.1 ? Math.sin(age / 1.1 * Math.PI) * 39 : 0, sx = x - 128 + pull;
    line(c, x - 150, y - 210, sx - 30, y - 152, '#c9b48a', 2); line(c, x - 110, y - 210, sx + 30, y - 152, '#c9b48a', 2);
    box(c, sx - 52, y - 160, 104, 16, '#8a6a46', 8); ellipse(c, sx + 52, y - 152, 6, 8, '#6d5236');
    line(c, sx - 40, y - 144, sx - 46, y - 40, '#d6c49a', 2); ellipse(c, sx - 46, y - 38, 4, 6, '#c75b46');
    roof(c, x, y - 330, 320, 96);
    for(const side of [-1,1]){
      const px=x+side*104,dy=env.reduced?0:Math.sin(env.time*1.4+side)*2;
      line(c,px,y-232,px+dy,y-212,'#d5b57b',1);
      ellipse(c,px+dy,y-202,7,11,'#b7583e');box(c,px+dy-5,y-215,10,3,'#d7b575',1);
      for(let i=-1;i<=1;i++)line(c,px+dy+i,y-191,px+dy*1.5+i*2,y-181,'#d8ae67',.8);
    }
    if(age>=0&&age<5){c.save();c.globalAlpha=(1-age/5)*.35;c.strokeStyle='#f5d693';c.lineWidth=1.5;for(let i=0;i<3;i++){c.beginPath();c.ellipse(x,y-112,40+age*40+i*20,16+age*13+i*7,0,0,Math.PI*2);c.stroke();}c.restore();}
    ripples(c, x, y - 120, age, 2.2);
  },
  lamp: drawStandingLantern,
  stoneLantern: drawStoneLantern,
  hangingLantern: drawHangingLantern,
  pillar(c, o, env) { const { x, y } = o, h = o.height || 190; shadow(c, x, y, 22, 7, env); box(c, x - 16, y - 12, 32, 14, '#b9a27a', 3); box(c, x - 11, y - h, 22, h - 10, o.color || '#9b3f32'); box(c, x - 6, y - h, 4, h - 10, '#b9584833'); for (const ry of [y - h + 18, y - 40]) box(c, x - 13, ry, 26, 6, '#d2ad66', 2); },
  hallPillar(c, o, env) {
    const { x, y } = o, h = o.height || 210, shaftTop = y - h + 32, shaftBottom = y - 22;
    const lacquer = gradient(c, x - 18, 36, ['#642d25', '#b45d43', '#8f3e30', '#c27450', '#713127']);
    shadow(c, x, y, 34, 9, env);
    // Broad carved stone foot and gilded transition rings anchor the timber column.
    box(c, x - 30, y - 17, 60, 17, '#756d58', 4); box(c, x - 26, y - 21, 52, 7, '#b8a47b', 3);
    box(c, x - 22, y - 27, 44, 7, '#d2b475', 2); box(c, x - 19, shaftBottom - 4, 38, 8, '#8d5337', 2);
    // Slightly tapered, polished shaft with fine carved flutes.
    polygon(c, [[x - 15, shaftBottom], [x + 15, shaftBottom], [x + 12, shaftTop], [x - 12, shaftTop]], lacquer, '#6b392b');
    line(c, x - 8, shaftTop + 5, x - 9, shaftBottom - 5, '#f0bd7955', 1.5);
    line(c, x - 3, shaftTop + 4, x - 3, shaftBottom - 5, '#5a251f66', 1);
    line(c, x + 5, shaftTop + 4, x + 5, shaftBottom - 5, '#f3c18455', 1.2);
    line(c, x + 10, shaftTop + 5, x + 9, shaftBottom - 5, '#5a251f55', 1);
    box(c, x - 21, shaftTop - 5, 42, 7, '#d1ae6a', 2); box(c, x - 25, shaftTop - 12, 50, 8, '#70402d', 3);
    // Layered capital and bracket arms visually carry the hall's overhead beams.
    box(c, x - 34, shaftTop - 23, 68, 10, '#7a4430', 3); box(c, x - 30, shaftTop - 28, 60, 7, '#bd8c50', 2);
    box(c, x - 25, shaftTop - 36, 50, 9, '#8b4b34', 3); box(c, x - 20, shaftTop - 40, 40, 5, '#d2b16e', 2);
    for (const side of [-1, 1]) {
      polygon(c, [[x + side * 17, shaftTop - 14], [x + side * 34, shaftTop - 24], [x + side * 28, shaftTop - 12], [x + side * 17, shaftTop - 8]], '#a45b3d', '#6d3d2d');
      ellipse(c, x + side * 23, shaftTop - 19, 2.2, 2.2, '#e4c27b');
    }
    box(c, x - 39, shaftTop - 44, 78, 8, '#60402d', 3); box(c, x - 35, shaftTop - 46, 70, 3, '#d2b16e', 1);
  },
  statue(c, o, env) { drawBuddha(c, o); },
  altarDais(c, o) {
    const { x, y } = o;
    box(c, x - 150, 262, 300, y - 262, '#654737', 5);
    box(c, x - 145, 266, 290, y - 274, '#826044', 4);
    for (let i = 0; i < 3; i++) {
      box(c, x - 150 + i * 5, y - 18 + i * 6, 300 - i * 10, 6, ['#bb9560', '#987348', '#d0af77'][i], 1);
    }
    for (const dx of [-143, 143]) { box(c, x + dx - 3, 277, 6, y - 300, '#c6a267', 1); }
  },
  altar(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 120, 14, env);
    box(c, x - 120, y - 46, 240, 46, '#6e2f26', 4); box(c, x - 128, y - 52, 256, 10, '#a8763f', 3); box(c, x - 100, y - 38, 200, 26, '#7f3a2e', 3);
    box(c, x - 114, y - 43, 228, 3, '#e0bb77', 1);
    box(c, x - 107, y - 9, 214, 3, '#c99d58', 1);
    for (const dx of [-72, 0, 72]) {
      c.strokeStyle = '#d4ac68'; c.lineWidth = 1.2;
      c.beginPath(); c.roundRect(x + dx - 27, y - 34, 54, 21, 4); c.stroke();
      for (let petal = -2; petal <= 2; petal++) {
        c.beginPath(); c.ellipse(x + dx + petal * 3, y - 22, 2.5, 6, petal * .35, 0, Math.PI * 2); c.stroke();
      }
    }
    for (const dx of [-80, 80]) drawCandle(c, x + dx, y - 52, env);
    box(c, x - 18, y - 70, 36, 18, '#a4834e', 3); for (let i = -1; i <= 1; i++) line(c, x + i * 6, y - 70, x + i * 7, y - 100, '#9b4b32', 1.5);
    for (const dx of [-45, 45]) { ellipse(c, x + dx, y - 58, 16, 6, '#c8a46a'); for (let i = 0; i < 4; i++) ellipse(c, x + dx - 7 + i * 5, y - 63 - (i % 2) * 3, 4, 4, ['#e0a14a', '#c2453a', '#e8c65a', '#8fae5a'][i]); }
  },
  cushion(c, o, env) {
    if (o.action === 'meditate') return drawMeditationCushion(c, o);
    shadow(c, o.x, o.y + 4, 24, 7, env); ellipse(c, o.x, o.y, 22, 10, o.color || '#a5523e'); ellipse(c, o.x, o.y - 3, 18, 7, '#c06a52');
  },
  bookshelf(c, o, env) { const { x, y } = o, w = o.w || 150; shadow(c, x, y, w / 2, 9, env); box(c, x - w / 2, y - 150, w, 150, '#5a3d2a', 4); for (let r = 0; r < 4; r++) { box(c, x - w / 2 + 6, y - 144 + r * 36, w - 12, 30, '#3a2a1e', 2); for (let b = 0, bx = x - w / 2 + 9; bx < x + w / 2 - 14; b++) { const bw = 7 + (b * 37 + r * 11) % 7; box(c, bx, y - 140 + r * 36 + (b % 3), bw, 26 - (b % 3), ['#8f4a3a', '#5e7a5a', '#b38f55', '#46607a', '#7b5b8a', '#c7b48a'][(b + r) % 6], 1); bx += bw + 1; } } box(c, x - w / 2 - 4, y - 154, w + 8, 8, '#7a5438', 3); },
  desk(c, o, env) { const { x, y } = o; shadow(c, x, y, 70, 12, env); box(c, x - 64, y - 34, 10, 34, '#5a3d2a'); box(c, x + 54, y - 34, 10, 34, '#5a3d2a'); box(c, x - 72, y - 46, 144, 16, '#7d5638', 4); box(c, x - 30, y - 52, 60, 8, '#efe3c4', 1); line(c, x, y - 52, x, y - 44, '#b9a67a', 1); ellipse(c, x + 46, y - 50, 7, 4, '#3b3b32'); if (o.lamp) { box(c, x - 56, y - 74, 4, 26, '#6b6048'); ellipse(c, x - 54, y - 78, 9, 11, '#e8bd70'); } },
  teaTable: drawLibraryTeaTable,
  scrollRack(c, o, env) { const { x, y } = o; shadow(c, x, y, 50, 8, env); box(c, x - 48, y - 110, 96, 110, '#6a4630', 4); for (let i = 0; i < 12; i++) ellipse(c, x - 36 + (i % 4) * 24, y - 92 + Math.floor(i / 4) * 32, 9, 9, ['#e8dcba', '#d9c79a', '#efe4c8'][i % 3]); },
  bonsai(c, o, env) { const { x, y } = o; shadow(c, x, y, 30, 8, env); box(c, x - 26, y - 18, 52, 18, '#4f6a7a', 4); box(c, x - 30, y - 22, 60, 6, '#5d7c8c', 3); line(c, x, y - 22, x - 8, y - 48, '#6b5741', 5); line(c, x - 8, y - 48, x + 12, y - 62, '#6b5741', 4); for (const [dx, dy, r] of [[-20, -52, 16], [12, -66, 14], [18, -46, 11]]) ellipse(c, x + dx + sway(env, dx, 1), y + dy, r, r * .6, '#3f6b4f'); },
  lotusPot(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 34, 9, env);
    // Hand-thrown glazed basin with a rolled rim, foot ring, and visible shallow water.
    box(c, x - 21, y - 8, 42, 7, '#5c4032', 3); ellipse(c, x, y - 5, 24, 5, '#775441');
    const glaze = c.createLinearGradient(x - 28, 0, x + 28, 0);
    glaze.addColorStop(0, '#4b3430'); glaze.addColorStop(.2, '#a76e55'); glaze.addColorStop(.5, '#cb9671'); glaze.addColorStop(.78, '#98604b'); glaze.addColorStop(1, '#49332e');
    c.fillStyle = glaze; c.beginPath(); c.moveTo(x - 28, y - 28); c.quadraticCurveTo(x - 24, y - 9, x - 14, y - 5); c.lineTo(x + 14, y - 5); c.quadraticCurveTo(x + 24, y - 9, x + 28, y - 28); c.closePath(); c.fill();
    c.strokeStyle = '#d0a574'; c.lineWidth = 1; c.stroke();
    ellipse(c, x, y - 27, 30, 7, '#6a4938'); ellipse(c, x, y - 29, 28, 6, '#c08b65');
    ellipse(c, x, y - 29, 23, 4, '#335956'); ellipse(c, x + 1, y - 30, 17, 2.5, '#86a28a55');
    box(c, x - 22, y - 10, 44, 3, '#d3a570', 2);
    // A restrained repeating lotus band gives the pot a crafted ceramic finish.
    for (let i = -3; i <= 3; i++) {
      const px = x + i * 6;
      c.strokeStyle = '#e0b27b'; c.lineWidth = .8; c.beginPath(); c.moveTo(px - 2, y - 18); c.quadraticCurveTo(px, y - 22, px + 2, y - 18); c.stroke();
      ellipse(c, px, y - 16, 1, 1.2, '#e7c295');
    }
    // Floating leaves sit at different depths; a bud and open lotus add a clear focal point.
    const pad = (px, py, rx, ry, notch = 0) => {
      c.fillStyle = '#5b854f'; c.beginPath(); c.moveTo(px, py); c.ellipse(px, py, rx, ry, -.12, notch, Math.PI * 2 + notch); c.lineTo(px, py); c.fill();
      c.strokeStyle = '#bbce87aa'; c.lineWidth = .7; c.beginPath(); c.moveTo(px, py); c.lineTo(px + rx * .8, py - ry * .35); c.moveTo(px, py); c.lineTo(px - rx * .45, py + ry * .75); c.stroke();
    };
    pad(x - 10, y - 30, 9, 3.5, -.6); pad(x + 10, y - 30, 7, 3, -.2);
    c.save(); c.translate(x + 1, y - 35);
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 6; i++) {
      c.save(); c.rotate(i * Math.PI / 3 + ring * .28); c.scale(1, .62);
      const petal = c.createLinearGradient(0, -13, 0, 1); petal.addColorStop(0, '#fff0e5'); petal.addColorStop(.55, '#e6a4b5'); petal.addColorStop(1, '#c96f8c');
      c.fillStyle = petal; c.beginPath(); c.moveTo(0, -14 + ring * 3); c.quadraticCurveTo(-6, -8, 0, 2); c.quadraticCurveTo(6, -8, 0, -14 + ring * 3); c.fill(); c.restore();
    }
    ellipse(c, 0, -1, 3, 2, '#e8c66f'); c.restore();
  },
  flowerBed(c, o) {
    const { x, y } = o;
    shadow(c, x, y, 48, 10, { shadow: { alpha: .3, dx: 0, stretch: 1 } });
    // A softly irregular stone rim and dark soil replace the straight row of identical flowers.
    ellipse(c, x, y - 5, 48, 16, '#716e5e'); ellipse(c, x, y - 8, 44, 13, '#9c967c');
    ellipse(c, x, y - 11, 38, 10, '#453b2d');
    for (let i = 0; i < 13; i++) {
      const dx = -32 + ((i * 23 + Math.floor(x)) % 65), h = 9 + (i * 7 % 14), fx = x + dx, fy = y - 12 - h;
      line(c, fx, y - 11, fx + (i % 2 ? 3 : -3), fy + 2, ['#466847','#5e7c48','#748749'][i % 3], 1.6);
      c.save(); c.translate(fx + (i % 2 ? 3 : -3), fy + 5); c.rotate((i % 2 ? 1 : -1) * .36);
      ellipse(c, -4, 0, 5, 2.2, '#5c7e4c'); ellipse(c, 4, -2, 5.5, 2.4, '#799153'); c.restore();
      if (i % 2 === 0) {
        const color = o.color || ['#e7b65a','#e88fa0','#f2efe1'][i % 3], petals = 5;
        for (let p = 0; p < petals; p++) { const a = p * Math.PI * 2 / petals; ellipse(c, fx + Math.cos(a) * 3, fy + Math.sin(a) * 2.5, 2.2, 3, color); }
        ellipse(c, fx, fy, 1.7, 1.7, '#e7c56e');
      } else if (i % 3 === 1) {
        ellipse(c, fx, fy + 2, 3.2, 5, '#b9a15d'); ellipse(c, fx, fy + 2, 1.4, 3, '#e5cd83');
      }
    }
    for (const dx of [-36,-19,1,22,38]) ellipse(c, x + dx, y - 5, 3 + (dx % 2), 2, '#bbb398');
  },
  courtyardPlanter(c, o, env) {
    const { x, y } = o, scale = o.scale || 1;
    c.save(); c.translate(x, y); c.scale(scale, scale); shadow(c, 0, 0, 68, 12, env);
    // Low weathered stone basin with a bright, planted top that reads clearly at game scale.
    ellipse(c, 0, -4, 64, 21, '#777665'); ellipse(c, 0, -8, 59, 17, '#a19b7f');
    ellipse(c, 0, -11, 51, 12, '#4c4939'); ellipse(c, 0, -14, 47, 9, '#655a43');
    for (let i = 0; i < 9; i++) {
      const px = -38 + i * 9.5, h = 13 + (i * 7 % 9), lean = i % 2 ? 5 : -5;
      line(c, px, -14, px + lean, -14 - h, ['#567449','#71834c','#486644'][i % 3], 2.5);
      ellipse(c, px + lean, -16 - h, 6 + (i % 3), 3.4, ['#789052','#6c874b','#8a9657'][i % 3]);
      if (i % 2 === 0) {
        const fx = px + lean, fy = -19 - h;
        for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5; ellipse(c, fx + Math.cos(a) * 3.4, fy + Math.sin(a) * 3, 2.8, 3.4, i % 4 ? '#e8c37c' : '#d98e91'); }
        ellipse(c, fx, fy, 2, 2, '#e7d59a');
      }
    }
    for (const dx of [-45, -23, 0, 23, 45]) { ellipse(c, dx, -4, 2, 1.5, '#d4c7a6'); }
    c.restore();
  },
  stele(c, o, env) { const { x, y } = o; shadow(c, x, y, 34, 9, env); box(c, x - 32, y - 14, 64, 14, '#6e756a', 3); box(c, x - 22, y - 96, 44, 84, '#8b9286', 10); box(c, x - 16, y - 86, 32, 66, '#9aa194', 6); for (let i = 0; i < 6; i++) line(c, x - 10, y - 78 + i * 10, x + 10, y - 78 + i * 10, '#6c7268', 1); ellipse(c, x - 18, y - 40, 7, 4, '#6f8a5c'); },
  shrine(c, o, env) { const { x, y } = o; shadow(c, x, y, 46, 11, env); box(c, x - 34, y - 16, 68, 16, '#8a8270', 3); box(c, x - 24, y - 62, 48, 46, '#7a3e30', 3); box(c, x - 14, y - 54, 28, 30, '#3a2b22'); ellipse(c, x, y - 36, 5, 7, '#ffd47a'); polygon(c, [[x - 42, y - 60], [x + 42, y - 60], [x + 20, y - 86], [x - 20, y - 86]], '#2b4541', '#cfad6e'); },
  dock(c, o, env) { const { x, y } = o, w = o.w || 120, h = o.h || 150; shadow(c, x, y + 4, w / 2, 10, env); for (let i = 0; i < h / 18; i++) box(c, x - w / 2, y - h + i * 18, w, 16, i % 2 ? '#8a6a48' : '#7d5f40', 2); for (const dx of [-w / 2 + 4, w / 2 - 12]) for (const dy of [-h + 6, -6]) box(c, x + dx, y + dy, 8, 14, '#5a4330', 2); },
  bridge(c, o, env) { const { x, y } = o, w = o.w || 180; shadow(c, x, y + 6, w / 2, 12, env); c.fillStyle = '#9b6a44'; c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x, y - 46, x + w / 2, y); c.lineTo(x + w / 2, y + 16); c.quadraticCurveTo(x, y - 30, x - w / 2, y + 16); c.fill(); for (let i = 0; i <= 8; i++) { const t = i / 8, bx = x - w / 2 + w * t, by = y - 46 * 4 * t * (1 - t) * .5 - 4; line(c, bx, by, bx, by - 22, '#7a4f33', 3); } c.strokeStyle = '#b8845a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - w / 2, y - 22); c.quadraticCurveTo(x, y - 70, x + w / 2, y - 22); c.stroke(); },
  fence(c, o) { const { x, y } = o, w = o.w || 200; for (let px = x; px <= x + w; px += 24) box(c, px - 3, y - 34, 6, 36, '#7d5f40', 2); line(c, x, y - 26, x + w, y - 26, '#8a6a48', 4); line(c, x, y - 12, x + w, y - 12, '#8a6a48', 4); },
  wall(c, o, env) { const { x, y } = o, w = o.w, h = o.h || 70; shadow(c, x + w / 2, y + 4, w / 2, 8, env); box(c, x, y - h, w, h, '#b9b39a'); box(c, x, y - h, w, 10, '#8e8873'); for (let px = x + 30; px < x + w - 20; px += 90) { box(c, px, y - h + 22, 34, 26, '#6d7a6a', 3); for (let k = 0; k < 3; k++) line(c, px + 9 + k * 8, y - h + 24, px + 9 + k * 8, y - h + 46, '#9fae95', 2); } box(c, x - 8, y - h - 14, w + 16, 16, '#2f4a44', 3); line(c, x - 8, y - h - 14, x + w + 8, y - h - 14, '#cfad6e', 3); },
  kettle(c, o, env) { const { x, y } = o; shadow(c, x, y, 26, 7, env); box(c, x - 20, y - 22, 40, 22, '#4a4a44', 4); ellipse(c, x, y - 32, 16, 12, '#2f3a36'); line(c, x + 14, y - 34, x + 26, y - 42, '#2f3a36', 4); if (!env.reduced) for (let i = 0; i < 3; i++) { const t = (env.time * .6 + i / 3) % 1; ellipse(c, x + 26 + Math.sin(t * 6 + i) * 3, y - 44 - t * 30, 3 + t * 4, 3 + t * 4, `rgba(235,235,225,${.35 * (1 - t)})`); } },
  temple(c, o) {
    c.save(); c.translate(o.x - 900, o.y - 410);
    ellipse(c, 900, 405, 420, 92, '#142c2b66');
    // Broad stone terrace with layered nosings and a centered ceremonial stair.
    box(c, 568, 350, 664, 66, '#514b3d', 6); box(c, 580, 350, 640, 12, '#c0b28e', 3); box(c, 588, 361, 624, 6, '#81775f', 2);
    for (let i = 0; i < 4; i++) { const inset = i * 8, sy = 409 + i * 10; box(c, 570 - inset, sy, 660 + inset * 2, 10, i % 2 ? '#a49b7c' : '#b5aa87', 2); line(c, 576 - inset, sy + 1, 1224 + inset, sy + 1, '#e6d8b1aa', 1); }
    for (let i = 0; i < 3; i++) { const sw = 202 + i * 18, sy = 399 + i * 12; box(c, 900 - sw / 2, sy, sw, 14, i % 2 ? '#b4aa89' : '#c7bb96', 3); line(c, 900 - sw / 2 + 5, sy + 2, 900 + sw / 2 - 5, sy + 2, '#f0e3c288', 1); }
    // Painted gable and carved beam band give the front a formal, layered silhouette.
    polygon(c, [[588, 239], [900, 132], [1212, 239]], '#6d392e', '#d0ad6e');
    polygon(c, [[620, 230], [900, 151], [1180, 230]], '#8b503b', '#bb8b55');
    ellipse(c, 900, 192, 23, 19, '#4a3329'); ellipse(c, 900, 192, 17, 13, '#c09b5d'); ellipse(c, 900, 192, 11, 8, '#405447');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ellipse(c, 900 + Math.cos(a) * 8, 192 + Math.sin(a) * 6, 2, 3, '#e2c47f'); }
    box(c, 603, 230, 594, 168, '#6e4d3e'); box(c, 612, 237, 576, 9, '#bf965d'); box(c, 630, 249, 540, 135, '#322f29');
    // Deep red pillars, carved capitals and lattice bays.
    for (let x = 630; x < 1180; x += 90) {
      box(c, x - 4, 231, 23, 9, '#d0ad6e', 2); box(c, x - 2, 238, 19, 8, '#794431', 2);
      box(c, x, 246, 15, 143, gradient(c, x, 15, ['#6f392e', '#bd7950', '#874533']), 3);
      line(c, x + 4, 253, x + 4, 379, '#e0ad7166', 1.2); line(c, x + 11, 253, x + 11, 379, '#512e28aa', 1);
      box(c, x - 5, 381, 25, 15, '#a68c61', 2); box(c, x - 8, 393, 31, 5, '#d0b77c', 2);
      for (let dx = 23; dx < 82; dx += 12) line(c, x + dx, 263, x + dx, 365, '#98794f', 2);
      for (const yy of [282, 324, 365]) line(c, x + 22, yy, x + 82, yy, '#98794f', 2);
      for (const dx of [27, 75]) { box(c, x + dx, 271, 4, 4, '#d2b477', 2); box(c, x + dx, 355, 4, 4, '#d2b477', 2); }
    }
    // Recessed open doorway with carved red leaves and gold rails around the Buddha alcove.
    box(c, 827, 240, 146, 153, '#b99b62', 4); box(c, 834, 245, 132, 145, '#392b24', 3); box(c, 844, 251, 112, 135, '#514b36', 2);
    for (const side of [-1, 1]) {
      const dx = side < 0 ? 840 : 940;
      box(c, dx, 252, 16, 132, '#74392e', 2); box(c, dx + 3, 256, 10, 124, '#96553b', 1);
      line(c, dx + 7, 260, dx + 7, 376, '#d5ad69', 1); box(c, dx + 3, 289, 10, 3, '#d6b878', 1); box(c, dx + 3, 342, 10, 3, '#d6b878', 1);
      ellipse(c, dx + 8, 312, 1.8, 1.8, '#e7cc8c'); ellipse(c, dx + 8, 322, 1.8, 1.8, '#e7cc8c');
    }
    box(c, 833, 385, 134, 8, '#d0ad6e', 2); box(c, 840, 393, 120, 5, '#755139', 1);
    const glow = c.createRadialGradient(900, 315, 5, 900, 315, 85); glow.addColorStop(0, '#ffd98b88'); glow.addColorStop(1, '#ffd98b00'); c.fillStyle = glow; c.fillRect(810, 225, 180, 180);
    ellipse(c, 900, 294, 13, 16, '#e6c17b'); polygon(c, [[886, 309], [914, 309], [926, 348], [875, 348]], '#d0ab64'); ellipse(c, 900, 348, 35, 12, '#d9b56e'); box(c, 857, 360, 86, 12, '#c59952');
    roof(c, 900, 165, 720, 92); roof(c, 900, 108, 500, 92);
    // Ridge ornaments, corner finials and the gilded ridge cap.
    line(c, 682, 103, 1118, 103, '#d9b77e', 4); ellipse(c, 900, 96, 7, 14, '#d9b77e'); ellipse(c, 900, 91, 3, 5, '#f0d99e');
    for (const side of [-1, 1]) { const fx = 900 + side * 250; ellipse(c, fx, 153, 8, 6, '#d1ad6e'); polygon(c, [[fx - 8, 153], [fx + 8, 153], [fx + side * 17, 143], [fx + side * 21, 148], [fx + side * 8, 161]], '#d1ad6e'); }
    for (let px = 614; px < 1200; px += 46) {
      box(c, px, 258, 30, 5, '#bb9156'); box(c, px + 6, 263, 18, 6, '#8f623d');
    }
    for (const side of [-1, 1]) {
      c.strokeStyle = '#d7b56b'; c.lineWidth = 3; c.beginPath(); c.moveTo(900 + side * 10, 110);
      c.bezierCurveTo(900 + side * 70, 95, 900 + side * 150, 116, 900 + side * 218, 103);
      c.bezierCurveTo(900 + side * 238, 99, 900 + side * 244, 85, 900 + side * 235, 82);
      c.bezierCurveTo(900 + side * 225, 80, 900 + side * 225, 92, 900 + side * 235, 91); c.stroke();
    }
    box(c, 828, 207, 144, 38, '#4c3429', 5); box(c, 833, 211, 134, 30, '#c2a064', 3); box(c, 838, 215, 124, 22, '#283d32', 2);
    c.font = '14px Arial'; c.textAlign = 'center'; c.fillStyle = '#f0d9a1'; c.fillText(o.title || 'S Â N   M Â Y', 900, 231);
    for (const side of [-1, 1]) {
      const x = 900 + side * 300;
      box(c, x - 14, 315, 28, 68, '#55392b', 3); box(c, x - 10, 320, 20, 53, '#87603e', 2); box(c, x - 18, 378, 36, 9, '#c2a36a', 2);
      box(c, x - 22, 307, 44, 9, '#493329', 3); box(c, x - 17, 291, 34, 18, '#874d39', 4); box(c, x - 20, 288, 40, 5, '#d1ac6c', 2);
      ellipse(c, x, 297, 11, 4, '#f4d48a'); ellipse(c, x, 297, 5, 2, '#fff0bd');
      for (const dx of [-5, 0, 5]) line(c, x + dx, 303, x + dx, 311, '#d9bd82', 1);
    }
    for (const x of [570, 1224]) { box(c, x, 416, 20, 58, '#a5a180'); box(c, x - 5, 413, 30, 9, '#d1c59b'); ellipse(c, x + 10, 407, 18, 9, '#778b67'); }
    c.restore();
  },
  gate(c, o, env) { drawTempleGate(c, o, env, roof); },
  mo(c, o, env) { const { x, y } = o; shadow(c, x, y, 34, 8, env); ellipse(c, x - 12, y - 6, 20, 8, '#7a3e30'); ellipse(c, x - 12, y - 14, 16, 11, '#a0643a'); ellipse(c, x - 16, y - 16, 5, 3, '#5a3020'); line(c, x - 2, y - 26, x + 6, y - 38, '#8a6a46', 3); ellipse(c, x + 16, y - 6, 14, 6, '#5a3020'); ellipse(c, x + 16, y - 12, 12, 8, '#c4a256'); ellipse(c, x + 16, y - 14, 8, 3, '#7d6232'); },
  broom(c, o, env) { const { x, y } = o; shadow(c, x, y, 30, 7, env); for (let i = 0; i < 9; i++) ellipse(c, x - 22 + (i * 13) % 34, y - 4 - (i % 3) * 3, 5, 2.5, ['#c6b278', '#b98d55', '#d7c48e'][i % 3]); line(c, x + 14, y - 2, x + 2, y - 70, '#8a6a46', 3); polygon(c, [[x + 8, y - 4], [x + 24, y - 4], [x + 18, y - 26], [x + 12, y - 26]], '#c9b07a', '#a08650'); },
  // Bronze incense burner on a low stand; the sticks themselves are drawn by MainHallScene from live state.
  censer(c, o, env) {
    const { x, y } = o, bronze = gradient(c, x - 34, 68, ['#503a22', '#d0a653', '#8a632e', '#e1bd69', '#594023']);
    shadow(c, x, y, 48, 10, env);
    // A substantial carved pedestal lifts the burner above the floor.
    box(c, x - 34, y - 12, 68, 12, '#633329', 3); box(c, x - 39, y - 17, 78, 7, '#ad7d3e', 3);
    box(c, x - 28, y - 24, 56, 8, bronze, 3); box(c, x - 21, y - 33, 42, 11, '#79502d', 3);
    for (const dx of [-15, 15]) { polygon(c, [[x + dx - 5, y - 32], [x + dx + 5, y - 32], [x + dx + 8, y - 5], [x + dx - 8, y - 5]], '#88612f', '#d3ad5d'); }
    // Rounded bronze bowl, flared lip and visible pale incense ash.
    c.fillStyle = bronze; c.beginPath(); c.moveTo(x - 32, y - 49); c.quadraticCurveTo(x - 28, y - 20, x, y - 19); c.quadraticCurveTo(x + 28, y - 20, x + 32, y - 49); c.closePath(); c.fill();
    c.strokeStyle = '#e2bd69'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 27, y - 31); c.quadraticCurveTo(x, y - 15, x + 27, y - 31); c.stroke();
    ellipse(c, x, y - 48, 37, 9, '#72502c'); ellipse(c, x, y - 51, 36, 8, bronze); ellipse(c, x, y - 52, 29, 5, '#d9c697');
    // Cast dragon-like handles and repeated lotus medallions catch the warm altar light.
    for (const side of [-1, 1]) {
      c.strokeStyle = '#c59b4f'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + side * 27, y - 43); c.quadraticCurveTo(x + side * 53, y - 58, x + side * 48, y - 35); c.quadraticCurveTo(x + side * 44, y - 25, x + side * 31, y - 29); c.stroke();
      ellipse(c, x + side * 46, y - 35, 4, 4, '#d9b45f');
    }
    for (const dx of [-18, 0, 18]) {
      c.strokeStyle = '#e0bd70'; c.lineWidth = 1.1; c.beginPath(); c.ellipse(x + dx, y - 34, 5, 7, 0, 0, Math.PI * 2); c.stroke();
      ellipse(c, x + dx, y - 34, 1.7, 2.5, '#edcf83');
    }
    box(c, x - 34, y - 20, 68, 4, '#dfbd6e', 2);
  },
  // Small table with a bamboo fortune tube; it rattles while someone draws a stick (env.shake > 0).
  fortune(c, o, env) {
    const { x, y } = o, shake = env.fortuneShake > 0 && !env.reduced ? Math.sin(env.time * 40) * .12 * env.fortuneShake : 0;
    shadow(c, x, y, 44, 9, env); box(c, x - 40, y - 26, 80, 26, '#6e2f26', 4); box(c, x - 46, y - 32, 92, 9, '#a8763f', 3);
    c.save(); c.translate(x - 10, y - 32); c.rotate(shake);
    for (let i = 0; i < 7; i++) line(c, -8 + i * 2.6, -34, -9 + i * 3, -62 - (i % 3) * 5, '#d9c48f', 2);
    box(c, -12, -40, 24, 40, '#9c7a3e', 4); box(c, -12, -32, 24, 4, '#6b5228'); box(c, -12, -14, 24, 4, '#6b5228');
    c.restore();
    box(c, x + 10, y - 44, 22, 13, '#e9dcbc', 2); line(c, x + 13, y - 39, x + 28, y - 39, '#b8604c', 1);
  },
  gardenGate(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 50, 9, env);
    for (const dx of [-38, 30]) box(c, x + dx, y - 92, 8, 94, '#7d5f40', 2);
    c.strokeStyle = '#8a6a48'; c.lineWidth = 8; c.beginPath(); c.moveTo(x - 46, y - 88); c.quadraticCurveTo(x - 4, y - 122, x + 42, y - 88); c.stroke();
    for (let i = 0; i < 7; i++) ellipse(c, x - 40 + i * 13, y - 98 - Math.sin(i / 6 * Math.PI) * 14, 6, 4, i % 2 ? '#e6a0ad' : '#5f8a4e');
    box(c, x - 24, y - 70, 48, 18, '#d8c69a', 3); c.font = '9px Arial'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText('VƯỜN RIÊNG', x - 2, y - 58);
  },
  rake(c, o, env) { const { x, y } = o; shadow(c, x, y, 16, 5, env); line(c, x - 4, y, x + 10, y - 70, '#8a6a46', 4); box(c, x + 0, y - 82, 26, 8, '#6d5236', 2); for (let i = 0; i < 5; i++) line(c, x + 3 + i * 5, y - 74, x + 3 + i * 5, y - 66, '#6d5236', 2); },
  hallBack(c, o) {
    const { x, y } = o, w = o.w;
    const cx = x + w / 2;
    const wall = gradient(c, x, w, ['#4b2c22', '#79503a', '#5c382b', '#80543b', '#4a2b21']);
    box(c, x, y - 230, w, 230, wall);
    box(c, x, y - 230, w, 18, '#3d251d'); box(c, x, y - 212, w, 5, '#b58a50');
    box(c, x, y - 24, w, 16, '#43291f'); box(c, x, y - 29, w, 4, '#c19a5d');
    // Broad lacquer panels and horizontal rails replace the repeated narrow slats.
    for (let i = 0; i < 8; i++) {
      const px = x + 18 + i * (w - 36) / 8, pw = (w - 48) / 8;
      box(c, px, y - 202, pw, 164, i % 2 ? '#704632' : '#68412f', 3);
      line(c, px + 8, y - 197, px + pw - 8, y - 197, '#b58953aa', 1);
      line(c, px + 8, y - 43, px + pw - 8, y - 43, '#38231c99', 1);
    }
    // Three hand-finished altar screens: a broad central sanctuary and two distinct side panels.
    const screen = (sx, top, sw, sh, kind) => {
      box(c, sx + 4, top + 7, sw, sh, '#24171199', 7);
      box(c, sx, top, sw, sh, '#aa8049', 7); box(c, sx + 5, top + 5, sw - 10, sh - 10, '#3d261d', 5);
      box(c, sx + 10, top + 10, sw - 20, sh - 20, kind === 'center' ? '#672e25' : '#513126', 3);
      c.strokeStyle = '#d5b477'; c.lineWidth = 1.4; c.strokeRect(sx + 13, top + 13, sw - 26, sh - 26);
      c.strokeStyle = '#9b7040'; c.lineWidth = 1; c.strokeRect(sx + 19, top + 19, sw - 38, sh - 38);
      // Silk-like vertical folds and a soft inner glow make each panel read as a screen, not a cabinet.
      const glow = c.createRadialGradient(sx + sw / 2, top + sh * .48, 4, sx + sw / 2, top + sh * .48, sw * .48);
      glow.addColorStop(0, kind === 'center' ? '#f2c87538' : '#e3be7740'); glow.addColorStop(1, '#2b171000');
      box(c, sx + 21, top + 21, sw - 42, sh - 42, glow, 2);
      for (let i = 0; i < 5; i++) {
        const fx = sx + 25 + i * (sw - 50) / 4;
        line(c, fx, top + 23, fx + (i - 2) * 2, top + sh - 24, i % 2 ? '#e3c58825' : '#21130e38', i === 2 ? 2 : 1);
      }
      for (const yy of [top + 16, top + sh - 16]) {
        box(c, sx + 16, yy - 2, sw - 32, 4, '#c49c5b', 2);
        for (const xx of [sx + 18, sx + sw - 18]) ellipse(c, xx, yy, 2.5, 2.5, '#f0d18a');
      }
      if (kind === 'center') {
        // A gilded mandala halo sits behind the Buddha, partially veiled by the statue itself.
        for (let r = 1; r <= 3; r++) { c.strokeStyle = r === 1 ? '#e5c17a88' : '#c69b5866'; c.lineWidth = r === 1 ? 2 : 1; c.beginPath(); c.arc(sx + sw / 2, top + sh * .55, 20 + r * 12, 0, Math.PI * 2); c.stroke(); }
        for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, px = sx + sw / 2 + Math.cos(a) * 54, py = top + sh * .55 + Math.sin(a) * 43; ellipse(c, px, py, 2, 4, '#e4c27d'); }
      } else {
        // Each side screen carries a different understated lotus and hanging silk motif.
        const mx = sx + sw / 2, my = top + sh * .55;
        line(c, mx, top + 24, mx, my - 16, '#d6b879aa', 1);
        for (let p = -2; p <= 2; p++) { c.beginPath(); c.ellipse(mx + p * 3, my, 3, 8, p * .28, 0, Math.PI * 2); c.strokeStyle = '#e3bd78'; c.lineWidth = 1; c.stroke(); }
        ellipse(c, mx, my + 7, 11, 3, '#c6a064');
      }
    };
    screen(x + 178, y - 183, 156, 142, 'left');
    screen(cx - 123, y - 142, 246, 118, 'center');
    screen(x + w - 334, y - 176, 156, 135, 'right');
    // Tied-back brocade curtains frame the central shrine with a natural, uneven drape.
    for (const side of [-1, 1]) {
      const edge = cx + side * 130, hem = y - 31;
      c.fillStyle = side < 0 ? '#843b2d' : '#793528'; c.beginPath(); c.moveTo(edge, y - 151); c.quadraticCurveTo(edge + side * 18, y - 113, edge + side * 9, y - 80); c.quadraticCurveTo(edge + side * 22, y - 51, edge + side * 13, hem); c.lineTo(edge - side * 5, hem); c.quadraticCurveTo(edge - side * 12, y - 62, edge - side * 5, y - 87); c.quadraticCurveTo(edge - side * 16, y - 119, edge, y - 151); c.fill();
      for (let k = 0; k < 3; k++) line(c, edge + side * (k * 4 - 3), y - 139, edge + side * (k * 2 - 3), hem - 3, '#e1b96c55', 1);
      box(c, edge + side * 8 - 4, y - 87, 8, 7, '#d5ad65', 2);
    }
    box(c, x, y - 8, w, 8, '#2d1d16');
    hallOrnaments(c, o);
  },
  shelfWall(c, o) { const { x, y } = o, w = o.w; box(c, x, y - 200, w, 200, '#4c3324'); box(c, x, y - 200, w, 18, '#33231a'); for (let px = x + 20; px < x + w - 140; px += 160) PROPS.bookshelf(c, { x: px + 70, y: y - 6, w: 140 }, { shadow: { alpha: 0, dx: 0, stretch: 1 } }); },
};

function ripples(c, x, y, age, scale) {
  if (age >= 3 * scale) return;
  c.strokeStyle = `rgba(238,211,145,${(1 - age / (3 * scale)) * .7})`; c.lineWidth = 2;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(x, y, (30 + age * 40 + i * 18) * scale, (12 + age * 18 + i * 7) * scale, 0, 0, Math.PI * 2); c.stroke(); }
}

// Light emitted by props, merged with the map's explicit `lights`.
const LIGHT = { lamp: [0, -48, 95, '255,190,110', true], stoneLantern: [0, -60, 85, '255,200,120', true], hangingLantern: [24, -72, 80, '255,150,100', true], altar: [0, -84, 150, '255,200,120', true], statue: [0, -150, 220, '255,210,140', false], desk: [-54, -78, 70, '255,200,130', true], shrine: [0, -36, 60, '255,200,120', true] };
export function propLights(props) {
  const lights = [];
  for (const o of props) { const l = LIGHT[o.type]; if (l && (o.type !== 'desk' || o.lamp)) lights.push({ x: o.x + l[0], y: o.y + l[1], r: l[2], color: l[3], flicker: l[4] }); }
  return lights;
}
