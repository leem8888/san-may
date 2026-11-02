import { ellipse, polygon } from './SpriteRenderer.js';
// Original, procedurally drawn scenery. Every prop is `draw(c, o, env)` in world space, base point at (o.x, o.y).
export function line(c, x, y, xx, yy, color, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
export function box(c, x, y, w, h, color, r = 0) { c.fillStyle = color; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
export function shadow(c, x, y, rx, ry, env) { const s = env.shadow; ellipse(c, x + s.dx * rx / 60, y, rx * s.stretch, ry, `rgba(8,28,30,${s.alpha.toFixed(3)})`); }
const sway = (env, i, amount = 3) => env.reduced ? 0 : Math.sin(env.time * (.6 + env.wind * .9) + i) * amount * (.6 + env.wind);

function roof(c, cx, y, w, h, color = '#2b4541', trim = '#cfad6e') {
  polygon(c, [[cx - w / 2 - 28, y + h], [cx - w / 2 + 70, y], [cx + w / 2 - 70, y], [cx + w / 2 + 28, y + h], [cx + w / 2 - 10, y + h - 10], [cx - w / 2 + 10, y + h - 10]], color, trim);
  for (let row = 0; row < Math.floor(h / 22); row++) for (let x = cx - w / 2 + 50 - row * 17; x < cx + w / 2 - 40 + row * 17; x += 25) { line(c, x, y + 12 + row * 18, x - 9, y + 29 + row * 18, '#668072', 2); line(c, x, y + 29 + row * 18, x + 16, y + 29 + row * 18, '#809080', 1); }
  line(c, cx - w / 2 + 65, y, cx + w / 2 - 65, y, '#d5b477', 5);
  for (const side of [-1, 1]) polygon(c, [[cx + side * (w / 2 + 28), y + h], [cx + side * (w / 2 + 40), y + h - 22], [cx + side * (w / 2 + 18), y + h - 6]], trim);
}

export const PROPS = {
  tree(c, o, env) {
    const s = o.size || 1; c.save(); c.translate(o.x, o.y); c.scale(s, s);
    shadow(c, 15, 5, 100, 27, env);
    polygon(c, [[-14, 0], [17, 0], [8, -105], [-6, -105]], '#6b5741'); line(c, 0, -58, -48, -112, '#6b5741', 12); line(c, 0, -70, 45, -125, '#6b5741', 10);
    const palette = o.blossom ? ['#7a5560', '#a8707a', '#c48d93', '#dcaab0'] : ['#315446', '#3e6250', '#4b7058', '#587c5c'];
    for (let i = 0; i < 11; i++) { const a = i * 2.399, x = Math.cos(a) * 70 + sway(env, i), y = -113 + Math.sin(a) * 36; ellipse(c, x, y, 48, 32, palette[i % 4]); ellipse(c, x - 12, y - 11, 21, 9, '#8c9c6550'); }
    c.restore();
  },
  pine(c, o, env) {
    const s = o.size || 1; c.save(); c.translate(o.x, o.y); c.scale(s, s); shadow(c, 8, 4, 60, 18, env);
    box(c, -7, -40, 14, 42, '#5d4a37', 3);
    for (let i = 0; i < 4; i++) polygon(c, [[-58 + i * 10 + sway(env, i, 2), -30 - i * 34], [58 - i * 10 + sway(env, i, 2), -30 - i * 34], [sway(env, i, 3), -92 - i * 34]], ['#284a3f', '#2f5546', '#376050', '#41695a'][i], '#1f3d34');
    c.restore();
  },
  bamboo(c, o, env) {
    const n = o.count || 7, h = o.height || 210, rnd = i => Math.sin(i * 91.7 + o.x) * .5 + .5;
    shadow(c, o.x, o.y, 46, 14, env);
    for (let i = 0; i < n; i++) {
      const bx = o.x - 34 + rnd(i) * 68, top = o.y - h * (.75 + rnd(i + 3) * .35), bend = sway(env, i + o.x * .01, 9);
      c.strokeStyle = ['#7f9a5c', '#6e8c52', '#8fa96a'][i % 3]; c.lineWidth = 6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, o.y); c.quadraticCurveTo(bx + bend * .3, (o.y + top) / 2, bx + bend, top); c.stroke();
      for (let k = 1; k < 6; k++) { const t = k / 6, jx = bx + bend * t * t, jy = o.y + (top - o.y) * t; line(c, jx - 4, jy, jx + 4, jy, '#4f6a3c', 2); }
      for (let k = 0; k < 4; k++) { const t = .55 + k * .12, lx = bx + bend * t * t, ly = o.y + (top - o.y) * t, dir = k % 2 ? 1 : -1; c.fillStyle = '#5f8a4e'; c.beginPath(); c.ellipse(lx + dir * 16, ly - 4, 17, 4, dir * .5 + bend * .01, 0, Math.PI * 2); c.fill(); }
    }
  },
  bush(c, o, env) { shadow(c, o.x, o.y, 34, 10, env); for (let i = 0; i < 5; i++) ellipse(c, o.x - 22 + i * 11 + sway(env, i, 1), o.y - 14 - (i % 2) * 8, 18, 14, ['#3b604c', '#476d55', '#527a5b'][i % 3]); if (o.flowers) for (let i = 0; i < 6; i++) ellipse(c, o.x - 20 + i * 8, o.y - 18 - (i % 3) * 6, 2.5, 2.5, o.flowers); },
  rock(c, o, env) { const s = o.size || 1; shadow(c, o.x, o.y, 30 * s, 9 * s, env); polygon(c, [[o.x - 28 * s, o.y], [o.x - 20 * s, o.y - 26 * s], [o.x + 4 * s, o.y - 38 * s], [o.x + 26 * s, o.y - 18 * s], [o.x + 30 * s, o.y]], '#7d8579', '#5c6459'); polygon(c, [[o.x - 14 * s, o.y - 24 * s], [o.x + 3 * s, o.y - 34 * s], [o.x + 8 * s, o.y - 20 * s]], '#9aa294'); ellipse(c, o.x - 10 * s, o.y - 6 * s, 8 * s, 3 * s, '#6f8a5c'); },
  bench(c, o, env) { const { x, y } = o; shadow(c, x, y + 4, 72, 15, env); box(c, x - 48, y - 1, 15, 18, '#667362', 3); box(c, x + 33, y - 1, 15, 18, '#667362', 3); box(c, x - 60, y - 20, 120, 24, '#a9af94', 5); box(c, x - 58, y - 22, 116, 8, '#c0c3a6', 3); },
  board(c, o) { const { x, y } = o; box(c, x - 32, y - 48, 8, 49, '#77543b'); box(c, x + 25, y - 48, 8, 49, '#77543b'); box(c, x - 45, y - 95, 90, 57, '#6d4e38', 4); box(c, x - 38, y - 88, 76, 44, '#bca875', 2); for (let i = 0; i < 5; i++) box(c, x - 29 + i * 12, y - 80 + (i % 2) * 5, 9, 23, '#eadabc', 1); polygon(c, [[x - 54, y - 95], [x, y - 116], [x + 54, y - 95]], '#325349', '#d9b77e'); },
  sign(c, o) { const { x, y } = o; box(c, x - 4, y - 70, 8, 72, '#6b5038'); box(c, x - 50, y - 92, 100, 40, '#7a5a3f', 4); box(c, x - 45, y - 87, 90, 30, '#d8c69a', 3); c.font = '11px Georgia'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText(o.text || 'Hướng dẫn', x, y - 68); },
  bell(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 5, 60, 18, env); box(c, x - 48, y - 104, 10, 110, '#715940'); box(c, x + 38, y - 104, 10, 110, '#715940'); box(c, x - 52, y - 110, 104, 12, '#be9a63', 3);
    const age = env.time - (env.bells[o.id] ?? -100), swing = age < 4 ? Math.sin(age * 12) * .15 * Math.exp(-age) : 0;
    c.save(); c.translate(x, y - 100); c.rotate(swing); polygon(c, [[-18, 12], [18, 12], [25, 63], [32, 72], [-32, 72], [-25, 63]], '#b69b61', '#e1c88d'); for (let i = 0; i < 3; i++) line(c, -22, 28 + i * 13, 22, 28 + i * 13, '#857645', 2); ellipse(c, 0, 74, 32, 8, '#4c513b'); c.restore();
    line(c, x, y - 22, x, y + 14, '#d5bf8f', 2); ripples(c, x, y - 22, age, 1);
  },
  bigBell(c, o, env) {
    const { x, y } = o, age = env.time - (env.bells[o.id] ?? -100), swing = age < 6 ? Math.sin(age * 7) * .07 * Math.exp(-age * .6) : 0;
    shadow(c, x, y + 8, 150, 34, env);
    box(c, x - 150, y - 12, 300, 22, '#8f866b', 4); box(c, x - 140, y - 18, 280, 10, '#a59c80', 3);
    for (const side of [-1, 1]) { box(c, x + side * 118 - 9, y - 230, 18, 222, '#8e4f3c'); box(c, x + side * 118 - 12, y - 22, 24, 14, '#c5a36d', 3); }
    box(c, x - 135, y - 238, 270, 16, '#6e4d3e', 3);
    c.save(); c.translate(x, y - 222); c.rotate(swing);
    line(c, 0, 0, 0, 22, '#3d3528', 6);
    polygon(c, [[-34, 22], [34, 22], [46, 120], [60, 140], [-60, 140], [-46, 120]], '#7f8a63', '#b7b27a');
    for (let i = 0; i < 4; i++) line(c, -42 + i * 2, 50 + i * 22, 42 - i * 2, 50 + i * 22, '#5f6a47', 3);
    for (let i = -1; i <= 1; i++) box(c, i * 22 - 7, 72, 14, 22, '#9aa274', 2);
    ellipse(c, 0, 140, 60, 12, '#3f4632'); c.restore();
    // The striker log hangs on two ropes and swings back after each strike.
    const pull = age < 1.2 ? Math.sin(Math.min(1, age / .6) * Math.PI) * 26 : 0, sx = x - 128 + pull;
    line(c, x - 150, y - 210, sx - 30, y - 152, '#c9b48a', 2); line(c, x - 110, y - 210, sx + 30, y - 152, '#c9b48a', 2);
    box(c, sx - 52, y - 160, 104, 16, '#8a6a46', 8); ellipse(c, sx + 52, y - 152, 6, 8, '#6d5236');
    line(c, sx - 40, y - 144, sx - 46, y - 40, '#d6c49a', 2); ellipse(c, sx - 46, y - 38, 4, 6, '#c75b46');
    roof(c, x, y - 330, 320, 96);
    ripples(c, x, y - 120, age, 2.2);
  },
  lamp(c, o) { const { x, y } = o; box(c, x - 3, y - 63, 6, 68, '#6b6048'); box(c, x - 15, y - 70, 30, 5, '#d1b77e', 2); ellipse(c, x, y - 48, 13, 19, '#e8bd70'); ellipse(c, x - 4, y - 51, 5, 13, '#ffe2a0'); line(c, x, y - 28, x, y - 17, '#d5b076', 2); },
  stoneLantern(c, o, env) { const { x, y } = o; shadow(c, x, y, 26, 8, env); box(c, x - 18, y - 12, 36, 12, '#8e958a', 2); box(c, x - 7, y - 50, 14, 40, '#9da497', 2); box(c, x - 16, y - 70, 32, 22, '#a7ae9f', 3); box(c, x - 9, y - 65, 18, 12, '#ffd889'); polygon(c, [[x - 24, y - 70], [x + 24, y - 70], [x + 6, y - 88], [x - 6, y - 88]], '#7f877b'); ellipse(c, x, y - 90, 5, 5, '#8e958a'); },
  hangingLantern(c, o, env) { const { x, y } = o, s = sway(env, x, 2); box(c, x - 3, y - 110, 6, 112, '#5a4632'); line(c, x, y - 104, x + 26, y - 104, '#5a4632', 4); line(c, x + 24, y - 104, x + 24 + s, y - 88, '#3b2f22', 1); ellipse(c, x + 24 + s, y - 72, 13, 17, o.color || '#c4503c'); box(c, x + 15 + s, y - 90, 18, 4, '#d9b77e', 1); box(c, x + 15 + s, y - 57, 18, 4, '#d9b77e', 1); line(c, x + 24 + s, y - 53, x + 24 + s * 1.3, y - 42, '#e6c27d', 2); },
  pillar(c, o, env) { const { x, y } = o, h = o.height || 190; shadow(c, x, y, 22, 7, env); box(c, x - 16, y - 12, 32, 14, '#b9a27a', 3); box(c, x - 11, y - h, 22, h - 10, o.color || '#9b3f32'); box(c, x - 6, y - h, 4, h - 10, '#b9584833'); for (const ry of [y - h + 18, y - 40]) box(c, x - 13, ry, 26, 6, '#d2ad66', 2); },
  statue(c, o, env) {
    const { x, y } = o, glow = c.createRadialGradient(x, y - 150, 8, x, y - 150, 150);
    glow.addColorStop(0, `rgba(255,214,140,${.38 + Math.sin(env.time) * .03})`); glow.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = glow; c.fillRect(x - 160, y - 300, 320, 300);
    box(c, x - 92, y - 40, 184, 42, '#7a3e30', 6); box(c, x - 80, y - 52, 160, 16, '#b88a4e', 4);
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; polygon(c, [[x + Math.cos(a) * 30, y - 56], [x + Math.cos(a) * 82, y - 56 + Math.sin(a) * 26], [x + Math.cos(a + .2) * 60, y - 70 + Math.sin(a) * 30]], i % 2 ? '#d9a5ad' : '#c88791', '#a8676f'); }
    ellipse(c, x, y - 82, 62, 26, '#cfa45a'); polygon(c, [[x - 40, y - 82], [x + 40, y - 82], [x + 30, y - 158], [x - 30, y - 158]], '#d9b26a', '#b48a46');
    polygon(c, [[x - 8, y - 150], [x + 8, y - 150], [x + 22, y - 96], [x - 22, y - 96]], '#e6c17b');
    ellipse(c, x, y - 104, 16, 8, '#e8c77f'); ellipse(c, x, y - 182, 23, 26, '#e3bd72'); ellipse(c, x, y - 207, 13, 12, '#c79b52');
    for (let i = 0; i < 9; i++) ellipse(c, x - 16 + (i % 3) * 16, y - 202 + Math.floor(i / 3) * 7 - 4, 3, 3, '#b78c48');
    line(c, x - 9, y - 180, x - 3, y - 180, '#9b7436', 2); line(c, x + 3, y - 180, x + 9, y - 180, '#9b7436', 2);
    c.strokeStyle = 'rgba(255,224,160,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y - 182, 46, 0, Math.PI * 2); c.stroke();
  },
  altar(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 120, 14, env);
    box(c, x - 120, y - 46, 240, 46, '#6e2f26', 4); box(c, x - 128, y - 52, 256, 10, '#a8763f', 3); box(c, x - 100, y - 38, 200, 26, '#7f3a2e', 3);
    for (const dx of [-80, 80]) { box(c, x + dx - 4, y - 78, 8, 26, '#efe6cf', 2); const f = env.reduced ? 0 : Math.sin(env.time * 11 + dx) * 1.5; ellipse(c, x + dx + f * .3, y - 84, 3.5, 7 + f, '#ffc86a'); ellipse(c, x + dx, y - 83, 1.5, 3, '#fff4cc'); }
    box(c, x - 18, y - 70, 36, 18, '#a4834e', 3); for (let i = -1; i <= 1; i++) line(c, x + i * 6, y - 70, x + i * 7, y - 100, '#9b4b32', 1.5);
    for (const dx of [-45, 45]) { ellipse(c, x + dx, y - 58, 16, 6, '#c8a46a'); for (let i = 0; i < 4; i++) ellipse(c, x + dx - 7 + i * 5, y - 63 - (i % 2) * 3, 4, 4, ['#e0a14a', '#c2453a', '#e8c65a', '#8fae5a'][i]); }
  },
  cushion(c, o, env) { shadow(c, o.x, o.y + 4, 24, 7, env); ellipse(c, o.x, o.y, 22, 10, o.color || '#a5523e'); ellipse(c, o.x, o.y - 3, 18, 7, '#c06a52'); },
  bookshelf(c, o, env) { const { x, y } = o, w = o.w || 150; shadow(c, x, y, w / 2, 9, env); box(c, x - w / 2, y - 150, w, 150, '#5a3d2a', 4); for (let r = 0; r < 4; r++) { box(c, x - w / 2 + 6, y - 144 + r * 36, w - 12, 30, '#3a2a1e', 2); for (let b = 0, bx = x - w / 2 + 9; bx < x + w / 2 - 14; b++) { const bw = 7 + (b * 37 + r * 11) % 7; box(c, bx, y - 140 + r * 36 + (b % 3), bw, 26 - (b % 3), ['#8f4a3a', '#5e7a5a', '#b38f55', '#46607a', '#7b5b8a', '#c7b48a'][(b + r) % 6], 1); bx += bw + 1; } } box(c, x - w / 2 - 4, y - 154, w + 8, 8, '#7a5438', 3); },
  desk(c, o, env) { const { x, y } = o; shadow(c, x, y, 70, 12, env); box(c, x - 64, y - 34, 10, 34, '#5a3d2a'); box(c, x + 54, y - 34, 10, 34, '#5a3d2a'); box(c, x - 72, y - 46, 144, 16, '#7d5638', 4); box(c, x - 30, y - 52, 60, 8, '#efe3c4', 1); line(c, x, y - 52, x, y - 44, '#b9a67a', 1); ellipse(c, x + 46, y - 50, 7, 4, '#3b3b32'); if (o.lamp) { box(c, x - 56, y - 74, 4, 26, '#6b6048'); ellipse(c, x - 54, y - 78, 9, 11, '#e8bd70'); } },
  teaTable(c, o, env) { const { x, y } = o; shadow(c, x, y, 54, 12, env); box(c, x - 46, y - 22, 92, 22, '#5e3f2b', 6); box(c, x - 52, y - 30, 104, 10, '#7f5638', 5); ellipse(c, x - 14, y - 38, 12, 9, '#6e8a7b'); box(c, x - 4, y - 44, 12, 3, '#6e8a7b'); for (const dx of [16, 30]) ellipse(c, x + dx, y - 33, 5, 4, '#e9e1cf'); },
  scrollRack(c, o, env) { const { x, y } = o; shadow(c, x, y, 50, 8, env); box(c, x - 48, y - 110, 96, 110, '#6a4630', 4); for (let i = 0; i < 12; i++) ellipse(c, x - 36 + (i % 4) * 24, y - 92 + Math.floor(i / 4) * 32, 9, 9, ['#e8dcba', '#d9c79a', '#efe4c8'][i % 3]); },
  bonsai(c, o, env) { const { x, y } = o; shadow(c, x, y, 30, 8, env); box(c, x - 26, y - 18, 52, 18, '#4f6a7a', 4); box(c, x - 30, y - 22, 60, 6, '#5d7c8c', 3); line(c, x, y - 22, x - 8, y - 48, '#6b5741', 5); line(c, x - 8, y - 48, x + 12, y - 62, '#6b5741', 4); for (const [dx, dy, r] of [[-20, -52, 16], [12, -66, 14], [18, -46, 11]]) ellipse(c, x + dx + sway(env, dx, 1), y + dy, r, r * .6, '#3f6b4f'); },
  lotusPot(c, o, env) { const { x, y } = o; shadow(c, x, y, 30, 8, env); ellipse(c, x, y - 14, 30, 16, '#6e5a48'); ellipse(c, x, y - 22, 26, 8, '#2f5a57'); ellipse(c, x - 8, y - 24, 10, 4, '#4f8a5c'); ellipse(c, x + 10, y - 23, 7, 3, '#4f8a5c'); ellipse(c, x + 2, y - 32, 6, 8, '#e8a3b4'); },
  flowerBed(c, o) { const { x, y } = o; ellipse(c, x, y - 4, 40, 12, '#4a3b2c'); for (let i = 0; i < 9; i++) { ellipse(c, x - 30 + i * 7.5, y - 10 - (i % 2) * 5, 4, 6, '#4f7a4e'); ellipse(c, x - 30 + i * 7.5, y - 15 - (i % 2) * 5, 3, 3, o.color || ['#e7b65a', '#e88fa0', '#f2efe1'][i % 3]); } },
  stele(c, o, env) { const { x, y } = o; shadow(c, x, y, 34, 9, env); box(c, x - 32, y - 14, 64, 14, '#6e756a', 3); box(c, x - 22, y - 96, 44, 84, '#8b9286', 10); box(c, x - 16, y - 86, 32, 66, '#9aa194', 6); for (let i = 0; i < 6; i++) line(c, x - 10, y - 78 + i * 10, x + 10, y - 78 + i * 10, '#6c7268', 1); ellipse(c, x - 18, y - 40, 7, 4, '#6f8a5c'); },
  shrine(c, o, env) { const { x, y } = o; shadow(c, x, y, 46, 11, env); box(c, x - 34, y - 16, 68, 16, '#8a8270', 3); box(c, x - 24, y - 62, 48, 46, '#7a3e30', 3); box(c, x - 14, y - 54, 28, 30, '#3a2b22'); ellipse(c, x, y - 36, 5, 7, '#ffd47a'); polygon(c, [[x - 42, y - 60], [x + 42, y - 60], [x + 20, y - 86], [x - 20, y - 86]], '#2b4541', '#cfad6e'); },
  dock(c, o, env) { const { x, y } = o, w = o.w || 120, h = o.h || 150; shadow(c, x, y + 4, w / 2, 10, env); for (let i = 0; i < h / 18; i++) box(c, x - w / 2, y - h + i * 18, w, 16, i % 2 ? '#8a6a48' : '#7d5f40', 2); for (const dx of [-w / 2 + 4, w / 2 - 12]) for (const dy of [-h + 6, -6]) box(c, x + dx, y + dy, 8, 14, '#5a4330', 2); },
  bridge(c, o, env) { const { x, y } = o, w = o.w || 180; shadow(c, x, y + 6, w / 2, 12, env); c.fillStyle = '#9b6a44'; c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x, y - 46, x + w / 2, y); c.lineTo(x + w / 2, y + 16); c.quadraticCurveTo(x, y - 30, x - w / 2, y + 16); c.fill(); for (let i = 0; i <= 8; i++) { const t = i / 8, bx = x - w / 2 + w * t, by = y - 46 * 4 * t * (1 - t) * .5 - 4; line(c, bx, by, bx, by - 22, '#7a4f33', 3); } c.strokeStyle = '#b8845a'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - w / 2, y - 22); c.quadraticCurveTo(x, y - 70, x + w / 2, y - 22); c.stroke(); },
  fence(c, o) { const { x, y } = o, w = o.w || 200; for (let px = x; px <= x + w; px += 24) box(c, px - 3, y - 34, 6, 36, '#7d5f40', 2); line(c, x, y - 26, x + w, y - 26, '#8a6a48', 4); line(c, x, y - 12, x + w, y - 12, '#8a6a48', 4); },
  wall(c, o, env) { const { x, y } = o, w = o.w, h = o.h || 70; shadow(c, x + w / 2, y + 4, w / 2, 8, env); box(c, x, y - h, w, h, '#b9b39a'); box(c, x, y - h, w, 10, '#8e8873'); for (let px = x + 30; px < x + w - 20; px += 90) { box(c, px, y - h + 22, 34, 26, '#6d7a6a', 3); for (let k = 0; k < 3; k++) line(c, px + 9 + k * 8, y - h + 24, px + 9 + k * 8, y - h + 46, '#9fae95', 2); } box(c, x - 8, y - h - 14, w + 16, 16, '#2f4a44', 3); line(c, x - 8, y - h - 14, x + w + 8, y - h - 14, '#cfad6e', 3); },
  kettle(c, o, env) { const { x, y } = o; shadow(c, x, y, 26, 7, env); box(c, x - 20, y - 22, 40, 22, '#4a4a44', 4); ellipse(c, x, y - 32, 16, 12, '#2f3a36'); line(c, x + 14, y - 34, x + 26, y - 42, '#2f3a36', 4); if (!env.reduced) for (let i = 0; i < 3; i++) { const t = (env.time * .6 + i / 3) % 1; ellipse(c, x + 26 + Math.sin(t * 6 + i) * 3, y - 44 - t * 30, 3 + t * 4, 3 + t * 4, `rgba(235,235,225,${.35 * (1 - t)})`); } },
  temple(c, o) {
    c.save(); c.translate(o.x - 900, o.y - 410);
    ellipse(c, 900, 405, 390, 80, '#142c2b55'); box(c, 580, 350, 640, 65, '#5b5748'); for (let i = 0; i < 4; i++) box(c, 570 - i * 8, 409 + i * 10, 660 + i * 16, 9, i % 2 ? '#a49b7c' : '#b5aa87');
    box(c, 603, 230, 594, 168, '#6e4d3e'); box(c, 630, 242, 540, 142, '#322f29');
    for (let x = 630; x < 1180; x += 90) { box(c, x, 235, 15, 160, '#9d6550'); box(c, x - 3, 381, 21, 17, '#b8a27b'); for (let dx = 23; dx < 82; dx += 12) line(c, x + dx, 258, x + dx, 370, '#8b6e4b', 3); }
    box(c, 827, 240, 146, 153, '#b99b62'); box(c, 840, 246, 120, 140, '#514b36');
    const glow = c.createRadialGradient(900, 315, 5, 900, 315, 85); glow.addColorStop(0, '#ffd98b88'); glow.addColorStop(1, '#ffd98b00'); c.fillStyle = glow; c.fillRect(810, 225, 180, 180);
    ellipse(c, 900, 294, 13, 16, '#e6c17b'); polygon(c, [[886, 309], [914, 309], [926, 348], [875, 348]], '#d0ab64'); ellipse(c, 900, 348, 35, 12, '#d9b56e'); box(c, 857, 360, 86, 12, '#c59952');
    roof(c, 900, 165, 720, 92); roof(c, 900, 108, 500, 92); ellipse(c, 900, 96, 5, 13, '#d9b77e');
    box(c, 836, 211, 128, 30, '#283d32', 4); c.font = '14px Georgia'; c.textAlign = 'center'; c.fillStyle = '#e5ce96'; c.fillText(o.title || 'S Â N   M Â Y', 900, 231);
    for (const x of [570, 1224]) { box(c, x, 416, 20, 58, '#a5a180'); box(c, x - 5, 413, 30, 9, '#d1c59b'); ellipse(c, x + 10, 407, 18, 9, '#778b67'); }
    c.restore();
  },
  gate(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 6, 330, 30, env);
    for (const side of [-1, 1]) {
      const sx = x + side * 200;
      box(c, sx - 70, y - 150, 140, 150, '#b7ad90'); box(c, sx - 40, y - 112, 80, 112, '#3a332b', 40); box(c, sx - 34, y - 106, 68, 106, '#2b2620', 34);
      roof(c, sx, y - 222, 170, 74, '#2b4541', '#cfad6e');
      for (const px of [sx - 70, sx + 62]) box(c, px, y - 150, 8, 150, '#8e4f3c');
    }
    box(c, x - 120, y - 210, 240, 210, '#c2b897'); box(c, x - 74, y - 168, 148, 168, '#2a2520', 70);
    for (const px of [x - 120, x + 108]) { box(c, px, y - 210, 12, 210, '#9b3f32'); box(c, px - 3, y - 14, 18, 14, '#c5a36d', 2); }
    box(c, x - 64, y - 236, 128, 30, '#283d32', 4); c.font = '15px Georgia'; c.textAlign = 'center'; c.fillStyle = '#e5ce96'; c.fillText(o.title || 'TAM QUAN', x, y - 215);
    roof(c, x, y - 312, 300, 82); roof(c, x, y - 380, 200, 70); ellipse(c, x, y - 392, 6, 14, '#d9b77e');
  },
  mo(c, o, env) { const { x, y } = o; shadow(c, x, y, 34, 8, env); ellipse(c, x - 12, y - 6, 20, 8, '#7a3e30'); ellipse(c, x - 12, y - 14, 16, 11, '#a0643a'); ellipse(c, x - 16, y - 16, 5, 3, '#5a3020'); line(c, x - 2, y - 26, x + 6, y - 38, '#8a6a46', 3); ellipse(c, x + 16, y - 6, 14, 6, '#5a3020'); ellipse(c, x + 16, y - 12, 12, 8, '#c4a256'); ellipse(c, x + 16, y - 14, 8, 3, '#7d6232'); },
  broom(c, o, env) { const { x, y } = o; shadow(c, x, y, 30, 7, env); for (let i = 0; i < 9; i++) ellipse(c, x - 22 + (i * 13) % 34, y - 4 - (i % 3) * 3, 5, 2.5, ['#c6b278', '#b98d55', '#d7c48e'][i % 3]); line(c, x + 14, y - 2, x + 2, y - 70, '#8a6a46', 3); polygon(c, [[x + 8, y - 4], [x + 24, y - 4], [x + 18, y - 26], [x + 12, y - 26]], '#c9b07a', '#a08650'); },
  // Bronze incense burner on a low stand; the sticks themselves are drawn by MainHallScene from live state.
  censer(c, o, env) {
    const { x, y } = o; shadow(c, x, y, 34, 8, env);
    box(c, x - 26, y - 12, 52, 12, '#5a2a22', 3);
    for (const dx of [-14, 14]) line(c, x + dx, y - 12, x + dx * 1.2, y - 4, '#7a6236', 3);
    ellipse(c, x, y - 22, 22, 10, '#8a6e38'); ellipse(c, x, y - 27, 20, 6, '#b08f4a'); ellipse(c, x, y - 28, 16, 4, '#d8c9a2');
    for (const dx of [-20, 20]) { c.strokeStyle = '#8a6e38'; c.lineWidth = 2; c.beginPath(); c.arc(x + dx, y - 26, 4, Math.PI * .5, Math.PI * 1.5, dx > 0); c.stroke(); }
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
    box(c, x - 24, y - 70, 48, 18, '#d8c69a', 3); c.font = '9px Georgia'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText('VƯỜN RIÊNG', x - 2, y - 58);
  },
  rake(c, o, env) { const { x, y } = o; shadow(c, x, y, 16, 5, env); line(c, x - 4, y, x + 10, y - 70, '#8a6a46', 4); box(c, x + 0, y - 82, 26, 8, '#6d5236', 2); for (let i = 0; i < 5; i++) line(c, x + 3 + i * 5, y - 74, x + 3 + i * 5, y - 66, '#6d5236', 2); },
  hallBack(c, o) {
    const { x, y } = o, w = o.w;
    box(c, x, y - 230, w, 230, '#5e3a2c'); box(c, x, y - 230, w, 22, '#3f281e');
    for (let px = x + 40; px < x + w - 40; px += 120) { box(c, px, y - 190, 80, 150, '#6e4535', 4); for (let k = 0; k < 5; k++) line(c, px + 12 + k * 14, y - 182, px + 12 + k * 14, y - 48, '#8a5a44', 2); }
    for (const dx of [x + 260, x + w - 300]) { box(c, dx, y - 210, 40, 170, '#a8763f', 3); box(c, dx + 6, y - 204, 28, 158, '#d8c69a', 2); for (let k = 0; k < 6; k++) box(c, dx + 14, y - 196 + k * 24, 12, 14, '#5a3a28', 1); }
    box(c, x, y - 8, w, 8, '#2d1d16');
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
