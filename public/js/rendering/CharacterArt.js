import { drawNovice } from './MonkArt.js';
import { drawAbbot } from './AbbotArt.js';
// Procedural character art: realistic-leaning proportions (head ≈ 1/6.5 of height), shaded clothing,
// elbows, hands, shoes and a simple face. Origin is the point between the feet; up is negative y.
const SKIN = '#e9c39c', SKIN_SHADE = '#d2a37b', SHOE = '#3a3129', INK = '#3a2f28';
const TAU = Math.PI * 2;

export const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
function ellipse(c, x, y, rx, ry, color, rotation = 0) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rotation, 0, TAU); c.fill(); }
function shape(c, points, fill) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); }
function stroke(c, points, color, width) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
// Soft left-to-right shading so garments read as volumes, not flat shapes.
function cloth(c, color, x0, x1) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, shade(color, 1.12)); g.addColorStop(.55, color); g.addColorStop(1, shade(color, .74)); return g; }

function limb(c, from, to, color, width, bend) {
  // Two segments with a slight outward bend at the joint (elbow or knee).
  const mx = (from[0] + to[0]) / 2 + bend, my = (from[1] + to[1]) / 2;
  stroke(c, [from, [mx, my], to], color, width);
}

function shoes(c, feet, side, barefoot = false) { for (const [x, y] of feet) ellipse(c, x + side * 1.5, y - 1.2, side ? 4 : 3.3, 2.2, barefoot ? SKIN : SHOE); }

function backHair(c, look, headY, shoulder, back) {
  if (look.hairStyle !== 'long' || back) return;
  c.fillStyle = shade(look.hairColor, .72); c.beginPath();
  c.moveTo(-7.5, headY - 5); c.quadraticCurveTo(-12, headY + 9, -8, shoulder + 20);
  c.lineTo(8, shoulder + 20); c.quadraticCurveTo(12, headY + 9, 7.5, headY - 5); c.closePath(); c.fill();
  stroke(c, [[-7, headY + 4], [-8, shoulder + 17]], shade(look.hairColor, 1.25), .8);
}

function hair(c, look, headY, side, back, bowing) {
  const color = look.hairColor, hi = shade(color, 1.45), style = look.hairStyle;
  if (style === 'shaved') { ellipse(c, 0, headY - (back ? 2.6 : 4.6), 9, back ? 10 : 5, 'rgba(70,64,62,.24)'); ellipse(c, -3, headY - 6, 2.5, 1.3, 'rgba(255,255,255,.22)'); return; }
  if (back) {
    ellipse(c, 0, headY - 1, 9.5, 10, color);
    if (style === 'long') shape(c, [[-8, headY], [8, headY], [7, headY + 26], [-7, headY + 26]], color);
    if (style === 'bun') { ellipse(c, 0, headY - 8.5, 4.2, 3.6, color); ellipse(c, -1, headY - 9.5, 1.6, 1, hi); }
    return;
  }
  // Cap over the skull, then a fringe that turns with the head.
  ellipse(c, 0, headY - 5.2 + (bowing ? 2 : 0), 9.5, 5.6 + (bowing ? 4 : 0), color);
  if (style === 'short') shape(c, [[-7.6, headY - 2.5], [-4 + side * 2, headY - 3.4], [3 + side * 3, headY - 2.8], [7.6, headY - 2], [5, headY - 7.5], [-6, headY - 7.2]], color);
  if (style === 'short' && look.gender === 'female') shape(c, [[-7.5, headY - 3], [-8.2, headY + 4], [-4.8, headY + 2], [-3, headY - 4]], color);
  if (style === 'long') { shape(c, [[-7.8, headY - 3], [-8.6, headY + 7], [-6, headY + 7], [-5.5, headY - 2]], color); shape(c, [[7.8, headY - 3], [8.6, headY + 7], [6, headY + 7], [5.5, headY - 2]], color); }
  if (style === 'bun') { ellipse(c, side * 2, headY - 9.5, 4, 3.4, color); ellipse(c, side * 2 - 1, headY - 10.3, 1.5, .9, hi); }
  ellipse(c, -2.5 + side * 1.5, headY - 6.2, 2.6, 1, hi);
  stroke(c, [[-5, headY - 7], [0, headY - 8], [4, headY - 7]], shade(color, 1.28), .75);
}

function face(c, headY, side, closed, feminine) {
  const dx = side * 2.3;
  headY += 1;
  if (side) ellipse(c, -side * 6, headY + 1, 1.4, 2.1, SKIN_SHADE);
  stroke(c, [[-4.2 + dx, headY - 2.1], [-1.6 + dx, headY - (feminine ? 2.4 : 2.1)]], shade(INK, 1.2), feminine ? .65 : 1.1);
  stroke(c, [[1.6 + dx, headY - (feminine ? 2.4 : 2.1)], [4.2 + dx, headY - 2.1]], shade(INK, 1.2), feminine ? .65 : 1.1);
  if (closed) for (const ex of [-2.8, 2.8]) { c.strokeStyle = INK; c.lineWidth = .8; c.beginPath(); c.arc(ex + dx, headY, 1.2, .15, Math.PI - .15); c.stroke(); }
  else for (const ex of [-2.8, 2.8]) { ellipse(c, ex + dx, headY + .2, .95, 1.25, INK); ellipse(c, ex + dx + .3, headY - .2, .3, .3, '#fff'); }
  ellipse(c, -3.6 + dx, headY + 2.6, 1.3, .7, 'rgba(214,120,100,.22)'); ellipse(c, 3.6 + dx, headY + 2.6, 1.3, .7, 'rgba(214,120,100,.22)');
  c.strokeStyle = '#9b5b4a'; c.lineWidth = .8; c.beginPath(); c.arc(dx, headY + 3.4, feminine ? 1.6 : 1.25, .25, Math.PI - .25); c.stroke();
}

function hat(c, headY) {
  headY += 4;
  shape(c, [[-17, headY - 3], [17, headY - 3], [0, headY - 17]], '#d8c08a');
  c.strokeStyle = '#a88f5c'; c.lineWidth = .8;
  for (const k of [.35, .65]) { c.beginPath(); c.moveTo(-17 * k, headY - 17 + 14 * k); c.lineTo(17 * k, headY - 17 + 14 * k); c.stroke(); }
  stroke(c, [[-17, headY - 3], [17, headY - 3]], '#8d7348', 1);
  stroke(c, [[-5, headY], [0, headY + 7], [5, headY]], '#7a5a3a', .7);
}

// A full prostration over t ∈ [0, 1]: join hands (0–.1), kneel (.1–.28), bow to the floor (.3–.46), hold, rise back to
// kneeling (.6–.76) and stand up (.8–.96). Smoothstep easing keeps each phase gentle.
const ease = x => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
export function bowPhases(t) {
  const span = (a, b) => ease((t - a) / (b - a));
  return { kneel: span(.1, .28) * (1 - span(.8, .96)), lean: span(.3, .46) * (1 - span(.6, .76)) };
}
export function drawCharacter(c, state, frame, dir, look, frames = 8) {
  if (look.characterStyle === 'child') return drawNovice(c, state, Math.floor(frame * 8 / frames), dir);
  if (look.characterStyle === 'abbot') return drawAbbot(c, state, Math.floor(frame * 8 / frames), dir);
  const t = frame / frames, walk = state === 'walk', swing = walk ? Math.sin(t * TAU) : 0;
  const side = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, back = dir === 'up', feminine = look.gender === 'female', w = (side ? .8 : 1) * (feminine ? .94 : 1.06);
  const { kneel, lean } = state === 'bow' ? bowPhases(t) : { kneel: 0, lean: 0 }, bow = lean, breathe = Math.sin(t * TAU) * (state === 'meditate' ? .9 : .35);
  const style = look.outfitStyle, outfit = look.outfitColor, dark = shade(outfit, .7);
  const trousers = style === 'robe' ? '#4e453b' : style === 'tunic' ? '#3a3730' : '#ece3cc';
  const sit = state === 'sit', meditate = state === 'meditate';

  c.translate(32, 80);
  ellipse(c, 0, 0, sit ? 18 : meditate ? 19 : 14, 4.2, 'rgba(8,29,33,.38)');
  c.translate(0, walk ? -Math.abs(swing) * 1.3 : 0);

  const hip = sit ? -25 : meditate ? -8 : -34 + kneel * 20;
  const shoulder = (sit ? -46 : meditate ? -29 : -55) - breathe * .6 + kneel * 20 + bow * (back ? -2 : 17);
  const headY = shoulder - 11 + bow * (back ? -3 : 9);

  backHair(c, look, headY, shoulder, back);

  // Legs and feet.
  if (meditate) {
    ellipse(c, 0, -5, 17, 6, dark); ellipse(c, 0, -6.5, 15, 4.6, cloth(c, outfit, -15, 15));
    ellipse(c, -12, -5.5, 4.5, 3, shade(outfit, .85)); ellipse(c, 12, -5.5, 4.5, 3, shade(outfit, .85));
  } else if (kneel > .05) {
    // Kneeling: knees on the floor in front, feet tucked behind.
    for (const s of [-1, 1]) { ellipse(c, s * 5, hip + 3, 4.6, 4.6, style === 'robe' ? dark : trousers); limb(c, [s * 5.5, hip + 5], [s * 6, -3], trousers, 4.8, 0); }
    ellipse(c, -6, -1, 3.4, 2, '#3a2a1e'); ellipse(c, 6, -1, 3.4, 2, '#3a2a1e');
  } else if (sit) {
    for (const s of [-1, 1]) { ellipse(c, s * 5, hip + 4, 4.6, 5, style === 'robe' ? dark : trousers); limb(c, [s * 5.5, hip + 7], [s * 6, -3], trousers, 4.8, 0); }
    shoes(c, [[-6, 0], [6, 0]], 0, look.footwear === 'stored');
  } else {
    const feet = side ? [[side * swing * 7 - 1.5, swing > 0 ? -1.5 : 0], [-side * swing * 7 + 1.5, swing < 0 ? -1.5 : 0]] : [[-4.3, -Math.max(0, swing) * 2.5], [4.3, -Math.max(0, -swing) * 2.5]];
    feet.forEach(([x, y], i) => limb(c, [(i ? 4 : -4) * w, hip], [x, y - 3], trousers, 5.2, (i ? 1.2 : -1.2) * (side ? 0 : 1)));
    shoes(c, feet, side, look.footwear === 'stored');
  }

  // Garment.
  const sx = 10.5 * w, wx = (feminine ? 7 : 8.5) * w, hx = 9.5 * w, fill = cloth(c, outfit, -14, 14);
  if (style === 'robe') {
    const hem = sit ? hip + 9 : meditate ? -6 : -5, flare = sit ? 11 : meditate ? 15 : (feminine ? 16 : 13) * w;
    c.fillStyle = fill; c.beginPath(); c.moveTo(-sx, shoulder+2);
    c.quadraticCurveTo(0,shoulder-3,sx,shoulder+2);c.quadraticCurveTo(wx,hip-6,flare,hem);
    c.quadraticCurveTo(0,hem+3,-flare,hem);c.quadraticCurveTo(-wx,hip-6,-sx,shoulder+2);c.fill();
    stroke(c, [[-wx * .5, hip - 2], [-flare * .55, hem - 1]], 'rgba(0,0,0,.12)', 1); stroke(c, [[wx * .6, hip - 3], [flare * .6, hem - 1]], 'rgba(0,0,0,.12)', 1);
    stroke(c, [[-flare + 2, hem - 2], [0, hem], [flare - 2, hem - 2]], shade(outfit, .62), 1);
  } else if (style === 'tunic') {
    shape(c, [[-sx, shoulder], [sx, shoulder], [wx, hip - 6], [hx + 1, hip + 4], [-hx - 1, hip + 4], [-wx, hip - 6]], fill);
    stroke(c, [[-wx - .5, hip - 4], [wx + .5, hip - 4]], dark, 2);
  } else {
    shape(c, [[-sx, shoulder], [sx, shoulder], [wx * .9, hip - 6], [hx * .8, hip], [-hx * .8, hip], [-wx * .9, hip - 6]], fill);
    if (!sit && !meditate) { shape(c, [[-5.5 * w, hip - 1], [5.5 * w, hip - 1], [5 * w, -7], [-5 * w, -7]], cloth(c, outfit, -6, 6)); stroke(c, [[0, shoulder + 3], [0, -7]], 'rgba(0,0,0,.15)', .8); }
    else shape(c, [[-6, hip], [6, hip], [7, hip + 8], [-7, hip + 8]], fill);
  }
  // Collar / neckline.
  if (!back) {
    if (style === 'robe') { stroke(c, [[-4, shoulder - .5], [2.5, shoulder + 9]], '#f1e2bf', 1.6); stroke(c, [[4, shoulder - .5], [-1, shoulder + 6]], '#f1e2bf', 1.6); stroke(c, [[-6, hip - 8], [6, hip - 8]], shade(outfit, .62), 1.8); ellipse(c, feminine ? -3 : 3, hip - 8, 1.5, 1.5, '#f1d8a4'); }
    else if (style === 'tunic') stroke(c, [[-3.5, shoulder], [0, shoulder + 3], [3.5, shoulder]], shade(outfit, .6), 1.2);
    else { c.fillStyle = shade(outfit, 1.2); c.fillRect(-3.4, shoulder - 2.5, 6.8, 3); }
  }

  // Arms: hand targets depend on the action.
  const sl = [-sx + .5, shoulder + 2], sr = [sx - .5, shoulder + 2];
  const joined = ['pray', 'bead', 'bow'].includes(state);
  let hl = [-12 * w, hip + 1 - swing * 2.4], hr = [12 * w, hip + 1 + swing * 2.4];
  if (side && walk) { hl = [side * swing * 6 - 2, hip + 1]; hr = [-side * swing * 6 + 2, hip + 1]; }
  if (joined) { hl = [-1.2, shoulder + 9]; hr = [1.2, shoulder + 9]; }
  // Bowing to the floor: joined hands open and rest on the ground in front.
  if (lean > 0 && !back) { hl = [hl[0] + (-7 - hl[0]) * lean, hl[1] + (-2 - hl[1]) * lean]; hr = [hr[0] + (7 - hr[0]) * lean, hr[1] + (-2 - hr[1]) * lean]; }
  if (meditate) { hl = [-2.5, hip + 1]; hr = [2.5, hip + 1]; }
  if (sit) { hl = [-6, hip + 3]; hr = [6, hip + 3]; }
  if (state === 'wave') hr = [15 + Math.sin(t * TAU * 2) * 3, shoulder - 13];
  if (state === 'bell') { const pull = Math.sin(t * Math.PI); hl = [-4, shoulder - 6 + pull * 8]; hr = [4, shoulder - 6 + pull * 8]; }
  if (state === 'interact') hr = [14, shoulder + 5];
  if (state === 'sweep') { hr = [8 + Math.sin(t * TAU) * 3, shoulder + 10]; hl = [4 + Math.sin(t * TAU) * 3, shoulder + 15]; }
  const sleeve = cloth(c, outfit, -16, 16);
  // Outline sleeves before filling them so arms do not merge into the torso.
  limb(c, sl, hl, dark, 6.7, joined || meditate ? -3 : -2); limb(c, sr, hr, dark, 6.7, joined || meditate ? 3 : 2);
  limb(c, sl, hl, sleeve, 4.8, joined || meditate ? -3 : -2); limb(c, sr, hr, sleeve, 4.8, joined || meditate ? 3 : 2);
  for (const hand of [hl, hr]) {
    ellipse(c, ...hand, 3, 3, SKIN_SHADE); ellipse(c, hand[0] - .4, hand[1] - .5, 2.4, 2.5, SKIN);
  }
  if (state === 'sweep') {
    const shift = Math.sin(t * TAU) * 7;
    stroke(c, [[hr[0], hr[1]], [16 + shift, -2]], '#8a6a46', 3.2);
    shape(c, [[8 + shift, -3], [24 + shift, -3], [27 + shift, 3], [5 + shift, 3]], '#c8ad78');
  }
  if (joined && !back) ellipse(c, 0, shoulder + 7, 2.2, 4, SKIN);
  if (state === 'bead' && !back) for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + t * TAU; ellipse(c, Math.cos(a) * 5, shoulder + 12 + Math.sin(a) * 4, 1.2, 1.2, i === frame % 9 ? '#ffdf96' : '#875235'); }

  // Accessories worn on the body.
  if (look.accessory === 'scarf') { shape(c, [[-7, shoulder - 2], [7, shoulder - 2], [6, shoulder + 2], [-6, shoulder + 2]], '#c56f5a'); if (!back) shape(c, [[2, shoulder + 1], [5.5, shoulder + 1], [4.8, shoulder + 13], [2, shoulder + 12]], '#b45f4c'); }
  if (look.accessory === 'beads' && !back) for (let i = 0; i < 9; i++) { const a = Math.PI * (.1 + i / 8 * .8); ellipse(c, Math.cos(a) * 6.5, shoulder + 1 + Math.sin(a) * 8, 1.05, 1.05, '#6e3d27'); }

  // Neck and head.
  const child = look.characterStyle === 'child';
  c.save();
  if (child) { c.translate(0, headY); c.scale(1.3, 1.16); c.translate(0, -headY); }
  ellipse(c, 0, shoulder - 2.5, 2.6, 3, SKIN_SHADE);
  const skinLight=c.createLinearGradient(-7,headY,7,headY);skinLight.addColorStop(0,'#cfa47d');skinLight.addColorStop(.35,'#f0d1ad');skinLight.addColorStop(1,'#d8af87');
  ellipse(c, side * .8, headY, (feminine ? 8.5 : 9.2) * (side ? .94 : 1), feminine ? 10 : 10.4, skinLight);
  ellipse(c, side * .8 + 2.5, headY + 2, 4, 5.5, 'rgba(160,100,70,.08)');
  if (!back && bow < .55) face(c, headY, side, ['pray', 'meditate', 'bow'].includes(state), feminine);
  hair(c, look, headY, side, back, bow > .55);
  if (look.accessory === 'lotus' && !back) { ellipse(c, 6.5, headY - 5, 2.6, 1.8, '#e9a3b4'); ellipse(c, 6.5, headY - 5.5, 1, 1, '#f6d58d'); }
  if (look.accessory === 'hat') hat(c, headY - 5);
  if (child && !back && bow < .55) {
    ellipse(c, -4 + side * 2, headY + 3, 1.7, 1, 'rgba(225,123,109,.35)');
    ellipse(c, 4 + side * 2, headY + 3, 1.7, 1, 'rgba(225,123,109,.35)');
  }
  c.restore();
}
