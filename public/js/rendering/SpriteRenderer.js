import { DURATIONS, DEFAULT_APPEARANCE, CHAT_SECONDS } from '../shared/rules.js';
import { drawCharacter } from './CharacterArt.js';
export function ellipse(c, x, y, rx, ry, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
export function polygon(c, points, color, stroke) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = color; c.fill(); if (stroke) { c.strokeStyle = stroke; c.stroke(); } }
export const SPRITE_FRAME = { width: 96, height: 128, paddingX: 16, paddingY: 24, footY: 104 };
// Most states use 8 frames; the full prostration (stand, join hands, kneel, bow, rise) needs more to stay smooth.
const FRAMES = 8, FRAMES_BY_STATE = { bow: 24 }, CELL_W = SPRITE_FRAME.width, CELL_H = SPRITE_FRAME.height, FOOT_Y = SPRITE_FRAME.footY;

const STATES = Object.keys(DURATIONS), DIRS = ['down', 'left', 'right', 'up'];
export const appearanceKey = look => [look.hairStyle, look.hairColor, look.outfitStyle, look.outfitColor, look.accessory, look.characterStyle || 'adult'].join('|');

// Rasterises one (appearance, state, direction) strip of 8 frames on demand and keeps a bounded LRU cache,
// so twenty differently dressed players cost a few MB instead of one full atlas each.
export class SpriteRenderer {
  constructor(limit = 180) { this.cache = new Map(); this.limit = limit; }
  strip(look, state, dir) {
    const key = `${appearanceKey(look)}|${state}|${dir}`;
    let strip = this.cache.get(key);
    if (strip) { this.cache.delete(key); this.cache.set(key, strip); return strip; }
    const frames = FRAMES_BY_STATE[state] || FRAMES;
    strip = document.createElement('canvas'); strip.width = CELL_W * frames; strip.height = CELL_H;
    const c = strip.getContext('2d');
    for (let f = 0; f < frames; f++) {
      c.save(); c.beginPath(); c.rect(f * CELL_W, 0, CELL_W, CELL_H); c.clip();
      c.translate(f * CELL_W + SPRITE_FRAME.paddingX, SPRITE_FRAME.paddingY); drawCharacter(c, state, f, dir, look, frames); c.restore();
    }
    this.cache.set(key, strip);
    if (this.cache.size > this.limit) this.cache.delete(this.cache.keys().next().value);
    return strip;
  }
  frame(p) {
    const state = STATES.includes(p.state) ? p.state : 'idle', duration = DURATIONS[state];
    return { state, index: Math.floor((Number.isFinite(duration) ? Math.min(.999, p.elapsed / duration) : p.elapsed / (state === 'meditate' ? 4 : 1.2) % 1) * (FRAMES_BY_STATE[state] || FRAMES)) };
  }
  draw(c, p) {
    const { state, index } = this.frame(p), look = p.appearance || DEFAULT_APPEARANCE;
    const scale = p.renderScale || 1;
    c.drawImage(this.strip(look, state, DIRS.includes(p.direction) ? p.direction : 'down'), index * CELL_W, 0, CELL_W, CELL_H, p.x - CELL_W * scale / 2, p.y - FOOT_Y * scale, CELL_W * scale, CELL_H * scale);
  }
  // Labels are drawn after the lighting pass so names stay readable at night.
  label(c, p, self = false) {
    if (!p.name) return;
    const top = p.y - (p.appearance?.characterStyle === 'abbot' ? 111 : p.appearance?.accessory === 'hat' ? 99 : 91) * (p.renderScale || 1);
    c.textAlign = 'center'; c.font = '12px system-ui';
    const width = c.measureText(p.name).width + 18;
    c.fillStyle = self ? '#102625dd' : '#102625b8'; c.beginPath(); c.roundRect(p.x - width / 2, top, width, 20, 8); c.fill();
    c.fillStyle = self ? '#ffe2a4' : p.npc ? '#f1d9a8' : '#d1e5ce'; c.fillText(p.name, p.x, top + 14);
    // A gold mark beside the name: this NPC has a new part of a story for the player.
    if (p.highlight) { const bx = p.x + width / 2 + 9, by = top + 10, pulse = 1 + Math.sin(performance.now() / 300) * .08; c.fillStyle = '#e9c47a'; c.beginPath(); c.arc(bx, by, 8 * pulse, 0, Math.PI * 2); c.fill(); c.fillStyle = '#21352b'; c.font = 'bold 12px system-ui'; c.fillText('!', bx, by + 4); }
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
