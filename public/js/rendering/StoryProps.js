import { box, line, shadow, PROPS } from './props.js';
import { ellipse } from './SpriteRenderer.js';

// Objects of the three NPC stories. Shared world state arrives on `o.world` (see Scene.onWorldState), so a re-hung
// bell or a restored garden looks the same for everyone in the room.
const sway = (env, i, amount) => env.reduced ? 0 : Math.sin(env.time * (1.1 + env.wind) + i) * amount * (.5 + env.wind);

function lotus(c, x, y, open) {
  for (let i = -open; i <= open; i++) ellipse(c, x + i * 3, y - 3 - (open - Math.abs(i)) * 1.5, 2.6, 4.5, '#d9c08a');
}

// The five carved symbols of the bell-tower puzzle, as small line glyphs.
export function drawSymbol(c, id, x, y, color = '#3d4a40', s = 1) {
  c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.6 * s; c.beginPath();
  if (id === 'sen') { for (const a of [-.6, 0, .6]) { c.moveTo(x, y + 6 * s); c.quadraticCurveTo(x + Math.sin(a) * 14 * s, y - 2 * s, x + Math.sin(a) * 4 * s, y - 8 * s); } }
  else if (id === 'trang') { c.arc(x, y, 7 * s, Math.PI * .3, Math.PI * 1.7); c.arc(x + 3 * s, y, 5 * s, Math.PI * 1.6, Math.PI * .4, true); }
  else if (id === 'may') { c.arc(x - 4 * s, y + 1 * s, 4 * s, Math.PI, 0); c.arc(x + 3 * s, y, 5 * s, Math.PI, 0); c.moveTo(x - 9 * s, y + 2 * s); c.lineTo(x + 8 * s, y + 2 * s); }
  else if (id === 'truc') { c.moveTo(x, y + 8 * s); c.lineTo(x, y - 8 * s); for (const k of [-3, 3]) { c.moveTo(x - 2 * s, y + k * s); c.lineTo(x + 2 * s, y + k * s); } c.moveTo(x, y - 3 * s); c.lineTo(x + 7 * s, y - 7 * s); }
  else { c.moveTo(x - 9 * s, y + 2 * s); c.quadraticCurveTo(x - 4 * s, y - 6 * s, x, y + 2 * s); c.quadraticCurveTo(x + 4 * s, y + 8 * s, x + 9 * s, y); }
  c.stroke();
}
const SYMBOL_IDS = ['sen', 'trang', 'may', 'truc', 'song'];
const LEAF_COLORS = ['#c6b278', '#b98d55', '#d7c48e', '#9fae6a', '#a8743f'];
const yardOf = o => o.world?.restoration || {};
// Objects that come and go with world state (also skipped by interactions).
export const HIDDEN = {
  leafPile: o => (yardOf(o).swept || []).includes(o.id),
  lanternPost: o => (yardOf(o).stage || 0) < 3,
  bench: o => o.stateOf === 'oldGarden' && (o.world?.restoration?.stage || 0) < 4,
};
// Hanging lantern string over the courtyard steps (lit room state), also used for its lights.
export function lanternString(o) {
  const [[ax, ay], [bx, by]] = o.string, points = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; points.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t + Math.sin(t * Math.PI) * 26 }); }
  return points;
}

// The ancient lamp of the Main Hall: lotus base, three clouds on the body, an optional flame.
export function drawAncientLamp(c, x, y, env, lit, s = 1) {
  ellipse(c, x, y - 2 * s, 12 * s, 4 * s, '#8a6a32');
  for (let i = -2; i <= 2; i++) ellipse(c, x + i * 4 * s, y - 6 * s - (2 - Math.abs(i)) * s, 3 * s, 4 * s, '#b88a3e');
  box(c, x - 3 * s, y - 26 * s, 6 * s, 18 * s, '#a37a36', 2); box(c, x - 9 * s, y - 34 * s, 18 * s, 10 * s, '#b88a3e', 4);
  for (let i = 0; i < 3; i++) drawSymbol(c, 'may', x - 5 * s + i * 5 * s, y - 29 * s, '#6b4f22', .35 * s);
  if (!lit) return;
  const f = env.reduced ? 1 : 1 + Math.sin(env.time * 9) * .12;
  c.globalAlpha = .35; ellipse(c, x, y - 40 * s, 14 * s, 16 * s, '#ffd27a'); c.globalAlpha = 1;
  ellipse(c, x, y - 40 * s, 3 * s, 6 * s * f, '#ffcf6a'); ellipse(c, x, y - 39 * s, 1.5 * s, 3 * s, '#fff3c4');
}
export const candleSlots = (o, now) => Array.from({ length: 9 }, (_, i) => o.world?.candles?.slots?.[i] || null).map(s => !s ? 'off' : now - s.litAt < 15 * 60_000 ? 'burning' : now - s.litAt < 20 * 60_000 ? 'burnt' : 'off');
const FLOWER_COLORS = { sen: '#e9a3b4', cuc: '#e2b94a', lan: '#f1efe6', hue: '#f4f1e2' };

export const STORY_PROPS = {
  // ── Main Hall (P2-7/P2-8) ──
  flowerTable(c, o, env) {
    const { x, y } = o;
    shadow(c, x, y, 44, 9, env); box(c, x - 40, y - 26, 80, 26, '#6e2f26', 4); box(c, x - 46, y - 32, 92, 8, '#a8763f', 3);
    Object.values(FLOWER_COLORS).forEach((color, i) => {
      const bx = x - 30 + i * 20;
      box(c, bx - 7, y - 48, 14, 16, '#5d6a52', 3);
      for (let k = 0; k < 4; k++) { line(c, bx - 3 + k * 2, y - 48, bx - 5 + k * 3, y - 60 - (k % 2) * 4, '#4e7a40', 1); ellipse(c, bx - 5 + k * 3, y - 62 - (k % 2) * 4, 3, 3, color); }
    });
  },
  // Two vases on the altar holding the flowers offered in this room (room state, six hours).
  altarVases(c, o, env) {
    const { x, y } = o, flowers = o.world?.vases?.flowers || [];
    for (const [dx, list] of [[-30, flowers.filter((f, i) => i % 2 === 0)], [30, flowers.filter((f, i) => i % 2 === 1)]]) {
      const vx = x + dx, vy = y - 58;
      list.slice(-4).forEach((f, k) => { const a = (k - 1.5) * .35; line(c, vx, vy, vx + Math.sin(a) * 12, vy - 16 - Math.cos(a) * 6, '#4e7a40', 1.2); ellipse(c, vx + Math.sin(a) * 12, vy - 18 - Math.cos(a) * 6, 4, 4, FLOWER_COLORS[f.kind] || '#e9a3b4'); });
      box(c, vx - 6, vy, 12, 16, '#3f6f8a', 4); ellipse(c, vx, vy, 6, 2, '#2f5568');
    }
  },
  readingDesk(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 44, 9, env);
    box(c, x - 40, y - 20, 80, 20, '#5d3f2a', 4); box(c, x - 44, y - 26, 88, 8, '#86603f', 3);
    box(c, x - 26, y - 34, 24, 8, '#efe3c5', 1); box(c, x + 2, y - 34, 24, 8, '#e8dab8', 1); line(c, x, y - 34, x, y - 26, '#9a8a6a', 1);
    for (const dx of [-60, 60]) { ellipse(c, x + dx, y + 6, 18, 7, '#6b3e2e'); ellipse(c, x + dx, y + 4, 14, 5, '#8a5340'); }
  },
  prayerBook(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 24, 6, env);
    box(c, x - 20, y - 24, 40, 24, '#5a3d2a', 3); box(c, x - 22, y - 30, 44, 8, '#7a5236', 2);
    box(c, x - 16, y - 38, 15, 9, '#f2ead6', 1); box(c, x + 1, y - 38, 15, 9, '#ece2c8', 1); line(c, x + 8, y - 38, x + 10, y - 26, '#a33c32', 1.5);
    c.globalAlpha = .5; ellipse(c, x + 18, y - 34, 2, 4, '#ffcf6a'); c.globalAlpha = 1;
  },
  candleRack(c, o, env) {
    const { x, y } = o, states = candleSlots(o, Date.now());
    shadow(c, x, y, 48, 9, env); box(c, x - 44, y - 30, 88, 30, '#4c3324', 4); box(c, x - 48, y - 36, 96, 8, '#6e4a32', 3);
    states.forEach((st, i) => {
      const cx = x - 36 + i * 9, top = st === 'burnt' ? y - 40 : y - 52;
      box(c, cx - 3, top, 6, y - 36 - top, st === 'burnt' ? '#d8cfb8' : '#efe6cf', 1);
      if (st === 'burning') { const f = env.reduced ? 1 : 1 + Math.sin(env.time * 11 + i) * .15; ellipse(c, cx, top - 5, 2, 4.5 * f, '#ffc35a'); ellipse(c, cx, top - 4, 1, 2, '#fff3c4'); }
      if (st === 'burnt') ellipse(c, cx, top - 1, 2, 1, '#4a3a2a');
    });
  },
  reflectionStand(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 20, 6, env);
    box(c, x - 4, y - 40, 8, 40, '#5a3d2a'); c.save(); c.translate(x, y - 46); c.rotate(-.15);
    box(c, -18, -12, 36, 22, '#e8dab8', 2); for (let i = 0; i < 4; i++) line(c, -13, -7 + i * 4.5, 13, -7 + i * 4.5, '#9a8a6a', 1);
    c.restore();
  },
  // A wall niche left of the statue; the third holds the ancient lamp once it is back (personal state).
  niche(c, o, env) {
    const { x, y } = o, lamp = o.id === 'nicheC' && o.world?.state;
    box(c, x - 30, y - 96, 60, 70, '#3a241b', 14); box(c, x - 24, y - 90, 48, 62, '#24160f', 12); box(c, x - 30, y - 30, 60, 6, '#6e4535', 2);
    if (lamp?.lit) { c.globalAlpha = .25 + (env.reduced ? 0 : Math.sin(env.time * 2) * .05); ellipse(c, x, y - 60, 34, 40, '#ffcf7a'); c.globalAlpha = 1; }
    if (lamp?.placed) drawAncientLamp(c, x, y - 30, env, lamp.lit, .9);
  },
  lampTable(c, o, env) {
    const { x, y } = o, w = o.world || {}, placed = w.state?.placed, stage = w.stage;
    shadow(c, x, y, 40, 9, env); box(c, x - 36, y - 22, 72, 22, '#5d3f2a', 4); box(c, x - 40, y - 28, 80, 8, '#86603f', 3);
    if (placed) return;
    if (stage === 'preparing') {
      drawAncientLamp(c, x + 4, y - 28, env, false, .85);
      c.fillStyle = '#c9b48a'; c.beginPath(); c.moveTo(x - 30, y - 28); c.quadraticCurveTo(x - 26, y - 38, x - 14, y - 36); c.lineTo(x - 12, y - 28); c.closePath(); c.fill();
      return;
    }
    c.fillStyle = '#c9b48a'; c.beginPath(); c.moveTo(x - 16, y - 28); c.quadraticCurveTo(x - 14, y - 62, x, y - 64); c.quadraticCurveTo(x + 14, y - 62, x + 16, y - 28); c.closePath(); c.fill();
    line(c, x - 10, y - 40, x + 10, y - 44, '#a8936a', 1);
    if (stage === 'clue') { c.globalAlpha = .6 + (env.reduced ? 0 : Math.sin(env.time * 2.4) * .3); ellipse(c, x + 10, y - 30, 3, 2, '#e9c46a'); c.globalAlpha = 1; }
  },
  bookStand(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 22, 6, env);
    box(c, x - 4, y - 36, 8, 36, '#5a3d2a'); box(c, x - 22, y - 46, 44, 12, '#6e4a32', 2); box(c, x - 20, y - 52, 19, 8, '#e8dab8', 1); box(c, x + 1, y - 52, 19, 8, '#efe3c5', 1);
  },
  lampMini(c, o, env) { shadow(c, o.x, o.y, 16, 5, env); drawAncientLamp(c, o.x, o.y, env, true, .9); },
  // ── Courtyard restoration (room state on `yard`) ──
  leafPile(c, o, env) {
    const { x, y } = o;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.39, r = 8 + (i * 7) % 46, s = env.reduced ? 0 : Math.sin(env.time * 1.3 + i) * .3 * (env.wind + .2);
      c.save(); c.translate(x + Math.cos(a) * r * 1.4, y - 6 + Math.sin(a) * r * .45); c.rotate(a + s);
      ellipse(c, 0, 0, 5, 2, LEAF_COLORS[i % LEAF_COLORS.length]); c.restore();
    }
    for (let i = 0; i < 12; i++) ellipse(c, x - 14 + (i * 5) % 28, y - 10 - (i % 4) * 3, 6, 2.5, LEAF_COLORS[(i + 2) % LEAF_COLORS.length]);
  },
  leafCart(c, o, env) {
    const { x, y } = o, full = yardOf(o).collected;
    shadow(c, x, y, 38, 8, env);
    c.strokeStyle = '#3b2c20'; c.lineWidth = 3; c.beginPath(); c.arc(x + 20, y - 8, 8, 0, Math.PI * 2); c.stroke();
    box(c, x - 30, y - 34, 50, 22, '#6e5a44', 4); line(c, x - 30, y - 22, x - 52, y - 14, '#5a4632', 3); line(c, x - 22, y - 14, x - 26, y, '#5a4632', 3);
    if (full) for (let i = 0; i < 14; i++) ellipse(c, x - 26 + (i * 7) % 44, y - 36 - (i % 3) * 3, 5, 2.4, LEAF_COLORS[i % LEAF_COLORS.length]);
  },
  stoneBasin(c, o, env) {
    const { x, y } = o, clean = yardOf(o).wiped;
    shadow(c, x, y, 36, 9, env);
    ellipse(c, x, y - 8, 34, 12, '#7d8478'); ellipse(c, x, y - 12, 28, 9, clean ? '#6fa6a6' : '#5d6a52');
    if (clean) { c.globalAlpha = .55 + (env.reduced ? 0 : Math.sin(env.time * 2) * .2); ellipse(c, x - 8, y - 14, 6, 2, '#e7f4f0'); c.globalAlpha = 1; }
    else for (let i = 0; i < 5; i++) ellipse(c, x - 20 + i * 10, y - 6 + (i % 2) * 3, 4, 2, '#6f8a5c');
  },
  // Empty stone base until decorated: then a flower pot and a small lantern.
  decorSpot(c, o, env) {
    const { x, y } = o, done = (yardOf(o).decorated || []).includes(o.id);
    ellipse(c, x, y - 2, 22, 7, '#7d7466');
    if (!done) return;
    shadow(c, x, y, 26, 7, env);
    box(c, x - 14, y - 22, 28, 20, '#8a4f36', 4); for (let i = 0; i < 7; i++) ellipse(c, x - 12 + i * 4, y - 26 - (i % 2) * 4, 4.5, 4, o.id === 'decorLeft' ? '#e2b94a' : '#d98a9a');
    box(c, x + 18, y - 44, 4, 44, '#5a3d2a'); ellipse(c, x + 20, y - 52, 8, 10, '#c4473a'); box(c, x + 15, y - 62, 10, 3, '#3d2a1d');
  },
  lanternPost(c, o, env) {
    const { x, y } = o, lit = yardOf(o).lit;
    shadow(c, x, y, 14, 5, env); box(c, x - 4, y - 70, 8, 70, '#5a3d2a', 2); ellipse(c, x, y - 76, 9, 11, lit ? '#f2b85a' : '#9a4a3c');
    const points = lanternString(o);
    c.strokeStyle = '#3d2a1d'; c.lineWidth = 1.5; c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke();
    points.forEach((p, i) => { if (i % 2) return; const swing = env.reduced ? 0 : Math.sin(env.time * 1.4 + i) * 1.5; ellipse(c, p.x + swing, p.y + 10, 6, 8, lit ? (i % 4 ? '#f6c46a' : '#f29a6a') : '#a4473a'); });
  },
  // Low tea table for two, with a cushion on each side. A live session (o.world.coop) shows the kettle steaming,
  // the tea being poured and the cups being filled — the same picture for everyone in the area.
  teaTableTwo(c, o, env) {
    const { x, y } = o, coop = o.world?.coop, now = Date.now();
    for (const dx of [-62, 62]) { ellipse(c, x + dx, y + 8, 22, 9, '#6b3e2e'); ellipse(c, x + dx, y + 5, 18, 7, '#8a5340'); }
    shadow(c, x, y, 46, 10, env);
    box(c, x - 38, y - 22, 76, 22, '#5d3f2a', 4); box(c, x - 44, y - 30, 88, 10, '#86603f', 4);
    box(c, x - 10, y - 46, 20, 16, '#4c5a52', 6); box(c, x + 6, y - 42, 8, 4, '#4c5a52', 2); box(c, x - 4, y - 50, 8, 5, '#3c4842', 2);
    const filled = coop && ['talk', 'sip'].includes(coop.step), cups = coop && ['pour', 'sip', 'talk'].includes(coop.step);
    if (cups) for (const dx of [-26, 26]) { box(c, x + dx - 6, y - 38, 12, 8, '#cfe0d6', 3); if (filled) ellipse(c, x + dx, y - 37, 4.5, 1.5, coop.tea === 'xanh' ? '#a7b86a' : '#c79a4a'); }
    if (coop?.tea && !env.reduced) for (let i = 0; i < 3; i++) { const t = (env.time * .6 + i / 3) % 1; c.globalAlpha = (1 - t) * .5; ellipse(c, x + 2 + Math.sin(t * 6 + i) * 4, y - 54 - t * 30, 3 + t * 4, 2 + t * 3, '#eef2ee'); c.globalAlpha = 1; }
    if (coop?.pourAt && now - coop.pourAt < 2500) { c.strokeStyle = '#c79a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 12, y - 44); c.quadraticCurveTo(x + 22, y - 48, x + 26, y - 38); c.stroke(); }
  },
  scrollStand(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 22, 6, env);
    box(c, x - 16, y - 34, 4, 34, '#5a3d2a'); box(c, x + 12, y - 34, 4, 34, '#5a3d2a'); box(c, x - 18, y - 36, 36, 5, '#6e4a32', 2);
    box(c, x - 14, y - 52, 28, 16, '#e8dab8', 2); box(c, x - 16, y - 54, 32, 4, '#a33c32', 2); box(c, x - 16, y - 36, 32, 3, '#a33c32', 1);
    for (let i = 0; i < 3; i++) line(c, x - 9, y - 47 + i * 4, x + 9, y - 47 + i * 4, '#9a8a6a', 1);
  },
  // The stone with five carved symbols; once the puzzle is solved (room state) a niche opens and glows.
  symbolStone(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 34, 9, env);
    box(c, x - 30, y - 92, 60, 92, '#7d8478', 12); box(c, x - 24, y - 86, 48, 80, '#8f968a', 9);
    SYMBOL_IDS.forEach((id, i) => drawSymbol(c, id, x + (i % 2 ? 10 : -10), y - 74 + i * 14, '#4a5248', .8));
    if (o.world?.niche?.open) { box(c, x - 12, y - 30, 24, 20, '#2a2620', 4); c.globalAlpha = .5 + (env.reduced ? 0 : Math.sin(env.time * 2) * .2); ellipse(c, x, y - 20, 14, 10, '#f2c879'); c.globalAlpha = 1; }
  },
  // Stone post with a small lantern ring; turned to set the order of the three symbols.
  symbolDial(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 18, 6, env);
    box(c, x - 10, y - 58, 20, 58, '#7d8478', 4); ellipse(c, x, y - 64, 16, 7, '#8f968a'); box(c, x - 8, y - 82, 16, 18, '#5d6158', 3);
    ellipse(c, x, y - 73, 5, 6, o.world?.lit ? '#f2c879' : '#3a3f38');
    for (let i = 0; i < 3; i++) box(c, x - 7, y - 50 + i * 14, 14, 9, '#6b7166', 2);
  },
  // Lectern with the temple's open ledger (Library, west).
  ledger(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 30, 8, env);
    box(c, x - 4, y - 46, 8, 46, '#5a3d2a', 2); box(c, x - 20, y - 6, 40, 6, '#5a3d2a', 2);
    c.save(); c.translate(x, y - 52); c.rotate(-.12);
    box(c, -30, -10, 60, 16, '#6e4a32', 3); box(c, -27, -14, 26, 16, '#efe3c5', 2); box(c, 1, -14, 26, 16, '#e8dab8', 2);
    for (let i = 0; i < 4; i++) { line(c, -23, -10 + i * 3.5, -6, -10 + i * 3.5, '#9a8a6a', 1); line(c, 5, -10 + i * 3.5, 22, -10 + i * 3.5, '#9a8a6a', 1); }
    line(c, 14, -14, 16, 6, '#a33c32', 2);
    c.restore();
  },
  // Small wooden box of unsent letters on a low stand (Library, east).
  letterBox(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 34, 8, env);
    box(c, x - 30, y - 24, 60, 24, '#6b4a33', 3); box(c, x - 34, y - 30, 68, 8, '#8a6446', 3);
    box(c, x - 18, y - 46, 36, 16, '#7a5236', 2); box(c, x - 20, y - 50, 40, 6, '#94694a', 2); box(c, x - 3, y - 44, 6, 5, '#c9a463', 1);
    for (let i = 0; i < 3; i++) box(c, x - 14 + i * 9, y - 55 - i, 8, 6, i % 2 ? '#efe6cf' : '#e6d6b0', 1);
  },
  // Old chest at the foot of the bell tower, three lotuses carved on its lid: bud, half-open, open.
  bellChest(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 40, 9, env);
    box(c, x - 36, y - 34, 72, 34, '#5d4130', 3); box(c, x - 40, y - 42, 80, 12, '#7a5638', 4);
    for (const dx of [-30, 26]) box(c, x + dx, y - 34, 4, 34, '#3f2c20');
    for (let i = 0; i < 3; i++) lotus(c, x - 20 + i * 20, y - 34, i);
    box(c, x - 4, y - 24, 8, 8, '#8f7a4a', 1);
  },
  // Iron hook under the gate eave. Once the story's bell is re-hung (room state) a small bronze bell sways there.
  bellHook(c, o, env) {
    const { x, y } = o, top = y - 92;
    line(c, x, top - 8, x, top + 8, '#3a3532', 2);
    c.strokeStyle = '#3a3532'; c.lineWidth = 2; c.beginPath(); c.arc(x + 4, top + 10, 4, Math.PI, Math.PI * 2.6); c.stroke();
    if (!o.world?.hung) return;
    const a = sway(env, x, .18);
    c.save(); c.translate(x, top + 12); c.rotate(a);
    line(c, 0, 0, 0, 10, '#6b5a3a', 1);
    c.fillStyle = '#b88a3e'; c.beginPath(); c.moveTo(-7, 24); c.quadraticCurveTo(-7, 9, 0, 9); c.quadraticCurveTo(7, 9, 7, 24); c.closePath(); c.fill();
    box(c, -8, 23, 16, 3, '#8f6a2c', 1); line(c, 0, 26, 0, 34, '#6b5a3a', 1); box(c, -3, 34, 6, 9, '#e7d7ae', 1);
    c.restore();
  },
  // Story reward for a private garden: a wooden post with the twin of An's bell.
  windbellPost(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 18, 6, env);
    box(c, x - 3, y - 84, 6, 84, '#6b4e35', 2); box(c, x - 3, y - 86, 26, 5, '#6b4e35', 2);
    STORY_PROPS.bellHook(c, { x: x + 18, y: y + 8, world: { hung: true } }, env);
  },
  // Wild purple flowers under the bamboo, their seeds once blew in from the old garden.
  wildFlowers(c, o, env) {
    const { x, y } = o;
    for (let i = 0; i < 9; i++) {
      const fx = x - 30 + (i * 23) % 62, fy = y - 4 - (i * 7) % 14, s = sway(env, i, 2);
      line(c, fx, fy, fx + s, fy - 18 - (i % 3) * 5, '#4e7a40', 1.5); ellipse(c, fx + s, fy - 20 - (i % 3) * 5, 4, 3.5, i % 3 ? '#9a7ac4' : '#b79ad8');
    }
  },
  // Flat stone by the lake where "the lotus planter" used to sit.
  flatStone(c, o, env) { const { x, y } = o; shadow(c, x, y, 40, 9, env); ellipse(c, x, y - 8, 40, 13, '#7d8478'); ellipse(c, x - 4, y - 11, 32, 8, '#959c8e'); ellipse(c, x + 18, y - 4, 8, 3, '#6f8a5c'); },
  // The forgotten garden, drawn from its shared restoration stage (0 wild … 4 complete).
  oldGarden(c, o, env) {
    const { x, y } = o, stage = o.world?.restoration?.stage || 0, w = 220, h = 90;
    box(c, x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12, '#6f6252', 10); box(c, x - w / 2, y - h / 2, w, h, stage ? '#5b4532' : '#56603d', 8);
    for (let i = 0; i < 18; i++) {
      const px = x - w / 2 + 14 + (i * 37) % (w - 28), py = y - h / 2 + 14 + (i * 23) % (h - 22);
      if (stage === 0) { const s = sway(env, i, 3); for (let k = -1; k <= 1; k++) line(c, px, py + 8, px + k * 6 + s, py - 14, '#7d8a4a', 2); }
      else if (stage === 1) line(c, px - 8, py, px + 8, py, '#4a3727', 2);
      else if (stage === 2) { line(c, px, py + 2, px, py - 6, '#6a9a4c', 2); ellipse(c, px + 3, py - 7, 3, 2, '#7fb05a'); }
      else { const s = sway(env, i, 1.5); line(c, px, py + 2, px + s, py - 12, '#4e7a40', 1.5); ellipse(c, px + s, py - 14, 4.5, 4, i % 3 ? '#9a7ac4' : '#b79ad8'); }
    }
    if (stage === 0) for (const [dx, dy] of [[-70, -10], [40, 22], [80, -24]]) { line(c, x + dx - 14, y + dy, x + dx + 14, y + dy - 6, '#6b5238', 3); line(c, x + dx - 4, y + dy - 2, x + dx + 6, y + dy - 12, '#6b5238', 2); }
    if (stage >= 4) {
      PROPS.stoneLantern(c, { x: x - w / 2 - 26, y: y + 10 }, env); PROPS.stoneLantern(c, { x: x + w / 2 + 26, y: y + 10 }, env);
    }
  },
};

// A flower stem held at the chest while it is carried to the altar.
export function drawHeldFlower(c, p) {
  const x = p.x + (p.direction === 'left' ? -6 : p.direction === 'right' ? 6 : 0), y = p.y - 46;
  if (p.direction === 'up') return; // hidden behind the body
  line(c, x, y + 10, x, y - 6, '#4e7a40', 1.6);
  ellipse(c, x, y - 9, 4.5, 4, FLOWER_COLORS[p.holding] || '#e9a3b4'); ellipse(c, x, y - 9, 1.6, 1.6, '#f6e2a0');
}
