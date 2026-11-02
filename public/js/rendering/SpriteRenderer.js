import { DURATIONS, DEFAULT_APPEARANCE, CHAT_SECONDS } from '../shared/rules.js';
export function ellipse(c, x, y, rx, ry, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
export function polygon(c, points, color, stroke) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) { c.strokeStyle = stroke; c.stroke(); } }
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
const SKIN = '#e5bd8c', FRAMES = 8, CELL_W = 64, CELL_H = 96;

function hair(c, look, dir, y, bow) {
  const color = look.hairColor, back = dir === 'up';
  if (look.hairStyle === 'long') { polygon(c, [[-13, y - 4], [13, y - 4], [back ? 15 : 12, y + 20], [back ? -15 : -12, y + 20]], shade(color, .85)); }
  if (look.hairStyle === 'shaved') { ellipse(c, 0, y - 5, 12, 8 - bow * 2, shade(color, 1.9)); return; }
  ellipse(c, -1, y - 5, 12.5, 9 - bow * 2, color);
  if (!back && look.hairStyle === 'short') polygon(c, [[-12, y - 4], [-4, y - 9], [8, y - 6], [12, y - 2], [2, y - 6]], shade(color, 1.2));
  if (look.hairStyle === 'bun') { ellipse(c, 0, y - 15, 6, 5, color); ellipse(c, -2, y - 16, 2, 1.5, shade(color, 1.4)); }
  if (back) ellipse(c, 0, y - 1, 11, 8, color);
}

function hat(c, y) { polygon(c, [[-21, y - 1], [21, y - 1], [0, y - 21]], '#d8c08a', '#8d7348'); c.strokeStyle = '#b39a62'; c.lineWidth = 1; c.beginPath(); c.moveTo(-11, y - 7); c.lineTo(11, y - 7); c.stroke(); }

function accessory(c, look, dir, y, down) {
  if (look.accessory === 'lotus' && dir !== 'up') { ellipse(c, 8, y - 8, 3.5, 2.5, '#e9a3b4'); ellipse(c, 8, y - 9, 1.5, 1.5, '#f6d58d'); }
  if (look.accessory === 'scarf') { polygon(c, [[-10, -37 + down], [10, -37 + down], [8, -31 + down], [-8, -31 + down]], '#c56f5a'); if (dir !== 'up') polygon(c, [[3, -33 + down], [8, -33 + down], [7, -21 + down], [3, -22 + down]], '#b45f4c'); }
  if (look.accessory === 'beads' && dir !== 'up') for (let i = 0; i < 7; i++) { const a = Math.PI * (.15 + i / 6 * .7); ellipse(c, Math.cos(a) * 8, -36 + down + Math.sin(a) * 7, 1.4, 1.4, '#6e3d27'); }
}

// One original, procedurally drawn character pose. Any frame can later be replaced by a real sprite sheet.
function pose(c, state, frame, dir, look) {
  const phase = frame / FRAMES, walking = state === 'walk', step = walking ? Math.sin(phase * Math.PI * 2) * 6 : 0;
  const bow = state === 'bow' ? Math.sin(phase * Math.PI) : 0, seated = ['sit', 'meditate'].includes(state);
  const breathe = state === 'meditate' ? Math.sin(phase * Math.PI * 2) * 1.2 : 0;
  const down = bow * 23 + (seated ? 14 : 0) - breathe, bob = walking ? Math.abs(step) * .5 : Math.sin(phase * Math.PI * 2) * .7;
  const outfit = look.outfitColor, dark = shade(outfit, .7), style = look.outfitStyle;
  c.translate(CELL_W / 2, 80); ellipse(c, 0, 0, 18, 6, '#081d2170'); c.translate(0, bob);
  const trousers = style === 'robe' ? '#53483d' : style === 'tunic' ? '#3e3a33' : '#efe6cf';
  if (!seated) { ellipse(c, -7, -3 + step, 5, 7, trousers); ellipse(c, 7, -3 - step, 5, 7, trousers); }
  else if (state === 'meditate') { ellipse(c, 0, -3, 22, 8, dark); ellipse(c, 0, -5, 17, 6, outfit); }
  else ellipse(c, 0, -3, 21, 8, outfit);
  const hem = style === 'robe' ? -6 : style === 'tunic' ? -14 : -4, flare = style === 'longcoat' ? 12 : 17;
  polygon(c, [[-11, -39 + down], [11, -39 + down], [flare, hem - 2], [5, hem + 2], [-flare + 1, hem - 1]], outfit, '#302f2c');
  if (style === 'longcoat') { c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -30 + down); c.lineTo(0, hem); c.stroke(); }
  if (dir !== 'up') polygon(c, style === 'robe' ? [[-10, -35 + down], [4, -27 + down], [8, -7], [-2, -6]] : [[-6, -37 + down], [6, -37 + down], [1, -27 + down]], style === 'robe' ? '#f3d79b' : shade(outfit, 1.25));
  if (style === 'tunic') { c.strokeStyle = dark; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, -22 + down * .4); c.lineTo(12, -22 + down * .4); c.stroke(); }
  const praying = ['pray', 'bead', 'meditate', 'bow'].includes(state);
  c.lineWidth = 7; c.lineCap = 'round'; c.strokeStyle = outfit;
  const arm = state === 'wave' ? Math.sin(phase * Math.PI * 2) * 9 : 0, ringing = state === 'bell' ? Math.sin(phase * Math.PI) * 10 : 0;
  c.beginPath(); c.moveTo(-11, -32 + down); c.lineTo(praying ? -3 : -16, praying ? -24 + down : -17 + down - step);
  c.moveTo(11, -32 + down); c.lineTo(praying ? 3 : state === 'wave' ? 23 : state === 'bell' ? 16 + ringing : 17, praying ? -24 + down : state === 'wave' ? -45 + arm : state === 'bell' ? -40 + ringing * .3 : -17 + down + step); c.stroke();
  if (state === 'interact') { c.beginPath(); c.moveTo(11, -32 + down); c.lineTo(20, -28 + down); c.stroke(); }
  if (praying) ellipse(c, 0, -24 + down, 4, 7, '#e7bf91');
  accessory(c, look, dir, -48 + down, down);
  const headY = -48 + down;
  ellipse(c, 0, headY, 13, 14 - bow * 4, SKIN);
  hair(c, look, dir, headY, bow);
  if (dir !== 'up' && bow < .65) {
    const shift = dir === 'left' ? -5 : dir === 'right' ? 5 : 0, closed = state === 'meditate' || state === 'pray';
    if (closed) { c.strokeStyle = '#3b3b32'; c.lineWidth = 1; for (const ex of [-4, 4]) { c.beginPath(); c.arc(ex + shift, headY + 2, 1.8, Math.PI * .1, Math.PI * .9); c.stroke(); } }
    else { ellipse(c, -4 + shift, headY + 2, 1, 1.4, '#3b3b32'); ellipse(c, 4 + shift, headY + 2, 1, 1.4, '#3b3b32'); }
  }
  if (look.accessory === 'hat') hat(c, headY - 6);
  if (state === 'bead') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + phase; ellipse(c, Math.cos(a) * 7, -21 + Math.sin(a) * 8, 1.7, 1.7, i === frame % 9 ? '#ffdf96' : '#875235'); }
}

const STATES = Object.keys(DURATIONS), DIRS = ['down', 'left', 'right', 'up'];
export const appearanceKey = look => [look.hairStyle, look.hairColor, look.outfitStyle, look.outfitColor, look.accessory].join('|');

// Rasterises one (appearance, state, direction) strip of 8 frames on demand and keeps a bounded LRU cache,
// so twenty differently dressed players cost a few MB instead of one full atlas each.
export class SpriteRenderer {
  constructor(limit = 180) { this.cache = new Map(); this.limit = limit; }
  strip(look, state, dir) {
    const key = `${appearanceKey(look)}|${state}|${dir}`;
    let strip = this.cache.get(key);
    if (strip) { this.cache.delete(key); this.cache.set(key, strip); return strip; }
    strip = document.createElement('canvas'); strip.width = CELL_W * FRAMES; strip.height = CELL_H;
    const c = strip.getContext('2d');
    for (let f = 0; f < FRAMES; f++) { c.save(); c.translate(f * CELL_W, 0); pose(c, state, f, dir, look); c.restore(); }
    this.cache.set(key, strip);
    if (this.cache.size > this.limit) this.cache.delete(this.cache.keys().next().value);
    return strip;
  }
  frame(p) {
    const state = STATES.includes(p.state) ? p.state : 'idle', duration = DURATIONS[state];
    return { state, index: Math.floor((Number.isFinite(duration) ? Math.min(.999, p.elapsed / duration) : p.elapsed / (state === 'meditate' ? 4 : 1.2) % 1) * FRAMES) };
  }
  draw(c, p) {
    const { state, index } = this.frame(p), look = p.appearance || DEFAULT_APPEARANCE;
    c.drawImage(this.strip(look, state, DIRS.includes(p.direction) ? p.direction : 'down'), index * CELL_W, 0, CELL_W, CELL_H, p.x - CELL_W / 2, p.y - 80, CELL_W, CELL_H);
  }
  // Labels are drawn after the lighting pass so names stay readable at night.
  label(c, p, self = false) {
    if (!p.name) return;
    const top = p.y - (p.appearance?.accessory === 'hat' ? 99 : 91);
    c.textAlign = 'center'; c.font = '12px system-ui';
    const width = c.measureText(p.name).width + 18;
    c.fillStyle = self ? '#102625dd' : '#102625b8'; c.beginPath(); c.roundRect(p.x - width / 2, top, width, 20, 8); c.fill();
    c.fillStyle = self ? '#ffe2a4' : p.npc ? '#f1d9a8' : '#d1e5ce'; c.fillText(p.name, p.x, top + 14);
    const above = p.chat ? chatBubble(c, p.x, top - 6, p.chat.text, p.chat.age) : 0;
    if (p.emote) emoteBubble(c, p.x, top - 6 - above, p.emote.emote, p.emote.age);
  }
}

// Small speech bubble with a drawn icon (no emoji glyphs, so it looks the same everywhere).
export function emoteBubble(c, x, y, emote, age) {
  const rise = Math.min(1, age * 4), alpha = Math.min(1, (2.6 - age) * 2);
  c.save(); c.globalAlpha = Math.max(0, alpha); c.translate(x, y - 18 * rise);
  c.fillStyle = '#f2ebd8'; c.beginPath(); c.roundRect(-17, -30, 34, 28, 10); c.fill(); polygon(c, [[-5, -3], [5, -3], [0, 4]], '#f2ebd8');
  c.translate(0, -16);
  if (emote === 'heart') { c.fillStyle = '#c4505c'; c.beginPath(); c.moveTo(0, 7); c.bezierCurveTo(-12, -2, -6, -11, 0, -4); c.bezierCurveTo(6, -11, 12, -2, 0, 7); c.fill(); }
  else if (emote === 'lotus') for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#e48fa2' : '#f0b3c0'; c.beginPath(); c.ellipse(0, 2, 3.5, 9, (i - 2) * .45, 0, Math.PI * 2); c.fill(); }
  else if (emote === 'smile') { ellipse(c, 0, 0, 9, 9, '#e7bf6a'); ellipse(c, -3, -2, 1.3, 1.6, '#3b3b32'); ellipse(c, 3, -2, 1.3, 1.6, '#3b3b32'); c.strokeStyle = '#3b3b32'; c.lineWidth = 1.4; c.beginPath(); c.arc(0, 1, 4.5, .2, Math.PI - .2); c.stroke(); }
  else if (emote === 'sparkle') { polygon(c, [[0, -10], [3, -3], [10, 0], [3, 3], [0, 10], [-3, 3], [-10, 0], [-3, -3]], '#d9a94e'); }
  else { polygon(c, [[-2, -9], [2, -9], [4, 6], [-4, 6]], '#c49a5a'); ellipse(c, 0, -9, 3, 3, '#e5bd8c'); }
  c.restore();
}

// Wraps text into at most four lines no wider than maxWidth; long words are cut, overflow ends with an ellipsis.
function wrap(c, text, maxWidth) {
  const words = [];
  for (const word of text.split(' ')) {
    let rest = word;
    while (c.measureText(rest).width > maxWidth) {
      let cut = rest.length - 1;
      while (cut > 1 && c.measureText(rest.slice(0, cut)).width > maxWidth) cut--;
      words.push(rest.slice(0, cut)); rest = rest.slice(cut);
    }
    words.push(rest);
  }
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && c.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  if (lines.length > 4) { lines.length = 4; lines[3] = `${lines[3].slice(0, -1)}…`; }
  return lines;
}

// Speech bubble above a name for CHAT_SECONDS, fading in and out. Returns its height so emotes can sit above it.
export function chatBubble(c, x, bottom, text, age) {
  c.save(); c.font = '12px system-ui'; c.textAlign = 'center';
  const lines = wrap(c, text, 190), width = Math.max(...lines.map(l => c.measureText(l).width)) + 20, height = lines.length * 16 + 12;
  c.globalAlpha = Math.max(0, Math.min(1, age / .15, (CHAT_SECONDS - age) / .6));
  const top = bottom - height - 6;
  c.fillStyle = '#f7f1e1'; c.strokeStyle = '#c9b48a'; c.lineWidth = 1;
  c.beginPath(); c.roundRect(x - width / 2, top, width, height, 9); c.fill(); c.stroke();
  polygon(c, [[x - 6, top + height - 1], [x + 6, top + height - 1], [x, bottom]], '#f7f1e1');
  c.fillStyle = '#2f3a2e'; lines.forEach((l, i) => c.fillText(l, x, top + 18 + i * 16));
  c.restore();
  return height + 8;
}
