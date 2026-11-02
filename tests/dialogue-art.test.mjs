import test from 'node:test';
import assert from 'node:assert/strict';
import { NpcPortrait } from '../public/js/ui/NpcPortrait.js';
import { NPC } from '../public/js/entities/NPC.js';
import { drawTempleGate } from '../public/js/rendering/GateArt.js';

function context(transforms = []) {
  return new Proxy({}, { get: (_, key) => key === 'createRadialGradient' || key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : key === 'transform' ? (...args) => transforms.push(args) : () => {} });
}

test('NPC portrait preserves identity, gestures and child proportions with one cancellable animation loop', () => {
  const oldRaf = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  const frames = new Map(); let id = 0;
  globalThis.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
  globalThis.cancelAnimationFrame = key => frames.delete(key);
  try {
    const canvas = { width: 240, height: 240, getContext: () => context(), setAttribute() {} }, caption = {};
    const portrait = new NpcPortrait(canvas, caption); portrait.sprites.draw = () => {};
    const source = new NPC({ id: 'novice', name: 'An', appearance: { outfitColor: '#c9935a' }, gestures: ['wave', 'pray'] });
    portrait.start(source);
    assert.equal(portrait.person.name, 'An'); assert.equal(portrait.person.appearance.characterStyle, 'child');
    assert.equal(portrait.person.renderScale, .76); assert.equal(portrait.person.appearance.outfitColor, '#c9935a');
    assert.ok(portrait.person.gestures.includes(portrait.person.state)); assert.equal(frames.size, 1);
    portrait.start(source); assert.equal(frames.size, 1, 'reopening cancels the old loop');
    portrait.stop(); assert.equal(frames.size, 0); assert.equal(canvas.hidden, true); assert.equal(caption.hidden, true);
    portrait.start(source, true); assert.equal(frames.size, 0); assert.equal(portrait.person.state, 'idle');
    portrait.stop();
    portrait.start(new NPC({ id: 'abbot', name: 'Trụ trì', gestures: ['pray'] }), true);
    assert.equal(portrait.logicalSize, 112, 'portrait includes extra room for the staff crown');
    assert.equal(portrait.person.appearance.characterStyle, 'abbot'); portrait.stop();
  } finally {
    if (oldRaf === undefined) delete globalThis.requestAnimationFrame; else globalThis.requestAnimationFrame = oldRaf;
    if (oldCancel === undefined) delete globalThis.cancelAnimationFrame; else globalThis.cancelAnimationFrame = oldCancel;
  }
});

test('gate doors open wider on approach and stay still with reduced effects', () => {
  const env = { shadow: { dx: 0, alpha: .2, stretch: 1 }, reduced: false };
  function panelWidth(visitor, reduced = false) {
    const transforms = [];
    drawTempleGate(context(transforms), { x: 800, y: 400 }, { ...env, visitor, reduced }, () => {});
    return transforms[1][0];
  }
  assert.ok(panelWidth({ x: 800, y: 450 }) < panelWidth({ x: 800, y: 1100 }));
  assert.equal(panelWidth({ x: 800, y: 450 }, true), panelWidth({ x: 800, y: 1100 }, true));
});
