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
  vegetablePatch, bookStack, fern, libraryWindow,
  fishFeeder: drawFishFeeder,
  offeringStall: drawOfferingStall,
  offeringStand: drawOfferingStand,
  cat: drawCat,
  tree: drawTree,
  pine(c, o, env) { drawTree(c, o, env, true); },
  bamboo: drawBamboo,
  bush(c, o, env) { shadow(c, o.x, o.y, 34, 10, env); for (let i = 0; i < 5; i++) ellipse(c, o.x - 22 + i * 11 + sway(env, i, 1), o.y - 14 - (i % 2) * 8, 18, 14, ['#3b604c', '#476d55', '#527a5b'][i % 3]); if (o.flowers) for (let i = 0; i < 6; i++) ellipse(c, o.x - 20 + i * 8, o.y - 18 - (i % 3) * 6, 2.5, 2.5, o.flowers); },
  rock(c, o, env) { const s = o.size || 1; shadow(c, o.x, o.y, 30 * s, 9 * s, env); polygon(c, [[o.x - 28 * s, o.y], [o.x - 20 * s, o.y - 26 * s], [o.x + 4 * s, o.y - 38 * s], [o.x + 26 * s, o.y - 18 * s], [o.x + 30 * s, o.y]], '#7d8579', '#5c6459'); polygon(c, [[o.x - 14 * s, o.y - 24 * s], [o.x + 3 * s, o.y - 34 * s], [o.x + 8 * s, o.y - 20 * s]], '#9aa294'); ellipse(c, o.x - 10 * s, o.y - 6 * s, 8 * s, 3 * s, '#6f8a5c'); },
  bench(c, o, env) { const { x, y } = o; shadow(c, x, y + 4, 72, 15, env); box(c, x - 48, y - 1, 15, 18, '#667362', 3); box(c, x + 33, y - 1, 15, 18, '#667362', 3); box(c, x - 60, y - 20, 120, 24, '#a9af94', 5); box(c, x - 58, y - 22, 116, 8, '#c0c3a6', 3); },
  board: drawNoticeBoard,
  sign(c, o) { const { x, y } = o; box(c, x - 4, y - 70, 8, 72, '#6b5038'); box(c, x - 50, y - 92, 100, 40, '#7a5a3f', 4); box(c, x - 45, y - 87, 90, 30, '#d8c69a', 3); c.font = '11px Arial'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText(o.text || 'Hướng dẫn', x, y - 68); },
  bell(c, o, env) {
    const { x, y } = o; shadow(c, x, y + 5, 60, 18, env); box(c, x - 48, y - 104, 10, 110, '#715940'); box(c, x + 38, y - 104, 10, 110, '#715940'); box(c, x - 52, y - 110, 104, 12, '#be9a63', 3);
    const age = env.time - (env.bells[o.id] ?? -100), swing = age < 4 ? Math.sin(age * 12) * .15 * Math.exp(-age) : 0;
    c.save(); c.translate(x, y - 100); c.rotate(swing); drawBellBody(c); c.restore();
    line(c, x, y - 22, x, y + 14, '#d5bf8f', 2); ripples(c, x, y - 22, age, 1);
  },
  bigBell(c, o, env) {
    const { x, y } = o, age = env.time - (env.bells[o.id] ?? -100), swing = !env.reduced && age >= 0 && age < 8 ? Math.sin(age * 6) * .095 * Math.exp(-age * .45) : 0;
    shadow(c, x, y + 8, 150, 34, env);
    box(c, x - 150, y - 12, 300, 22, '#8f866b', 4); box(c, x - 140, y - 18, 280, 10, '#a59c80', 3);
    for (const side of [-1, 1]) { box(c, x + side * 118 - 9, y - 230, 18, 222, '#8e4f3c'); box(c, x + side * 118 - 12, y - 22, 24, 14, '#c5a36d', 3); }
    box(c, x - 135, y - 238, 270, 16, '#6e4d3e', 3);
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
    for (let px = 614; px < 1200; px += 46) {
      box(c, px, 258, 30, 5, '#bb9156'); box(c, px + 6, 263, 18, 6, '#8f623d');
    }
    for (const side of [-1, 1]) {
      c.strokeStyle = '#d7b56b'; c.lineWidth = 3; c.beginPath(); c.moveTo(900 + side * 10, 110);
      c.bezierCurveTo(900 + side * 70, 95, 900 + side * 150, 116, 900 + side * 218, 103);
      c.bezierCurveTo(900 + side * 238, 99, 900 + side * 244, 85, 900 + side * 235, 82);
      c.bezierCurveTo(900 + side * 225, 80, 900 + side * 225, 92, 900 + side * 235, 91); c.stroke();
    }
    box(c, 836, 211, 128, 30, '#283d32', 4); c.font = '14px Arial'; c.textAlign = 'center'; c.fillStyle = '#e5ce96'; c.fillText(o.title || 'S Â N   M Â Y', 900, 231);
    for (const x of [570, 1224]) { box(c, x, 416, 20, 58, '#a5a180'); box(c, x - 5, 413, 30, 9, '#d1c59b'); ellipse(c, x + 10, 407, 18, 9, '#778b67'); }
    c.restore();
  },
  gate(c, o, env) { drawTempleGate(c, o, env, roof); },
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
    box(c, x - 24, y - 70, 48, 18, '#d8c69a', 3); c.font = '9px Arial'; c.textAlign = 'center'; c.fillStyle = '#4a3a28'; c.fillText('VƯỜN RIÊNG', x - 2, y - 58);
  },
  rake(c, o, env) { const { x, y } = o; shadow(c, x, y, 16, 5, env); line(c, x - 4, y, x + 10, y - 70, '#8a6a46', 4); box(c, x + 0, y - 82, 26, 8, '#6d5236', 2); for (let i = 0; i < 5; i++) line(c, x + 3 + i * 5, y - 74, x + 3 + i * 5, y - 66, '#6d5236', 2); },
  hallBack(c, o) {
    const { x, y } = o, w = o.w;
    box(c, x, y - 230, w, 230, '#5e3a2c'); box(c, x, y - 230, w, 22, '#3f281e');
    for (let px = x + 40; px < x + w - 40; px += 120) { box(c, px, y - 190, 80, 150, '#6e4535', 4); for (let k = 0; k < 5; k++) line(c, px + 12 + k * 14, y - 182, px + 12 + k * 14, y - 48, '#8a5a44', 2); }
    for (const dx of [x + 260, x + w - 300]) { box(c, dx, y - 210, 40, 170, '#a8763f', 3); box(c, dx + 6, y - 204, 28, 158, '#d8c69a', 2); for (let k = 0; k < 6; k++) box(c, dx + 14, y - 196 + k * 24, 12, 14, '#5a3a28', 1); }
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
