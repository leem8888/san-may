import { SpriteRenderer, polygon } from './SpriteRenderer.js';
import { drawHeldFlower } from './StoryProps.js';
import { LightingSystem } from './LightingSystem.js';
import { bowDirection } from '../shared/rules.js';
import { drawLitter } from './LitterArt.js';

export const QUALITY = { low: { dpr: 1, particles: 70 }, medium: { dpr: 1.5, particles: 180 }, high: { dpr: 2, particles: 360 } };

// Frame pipeline: ground cache → water → depth-sorted props/NPCs/players → particles → light → labels → weather → fade.
export class SceneRenderer {
  constructor(canvas, camera) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw Error('Trình duyệt không hỗ trợ Canvas 2D');
    this.camera = camera; this.sprites = new SpriteRenderer(); this.lighting = new LightingSystem(); this.quality = 'high';
  }
  resize(w, h) {
    this.width = w; this.height = h; this.dpr = Math.min(globalThis.devicePixelRatio || 1, QUALITY[this.quality].dpr);
    const pixelWidth = Math.round(w * this.dpr), pixelHeight = Math.round(h * this.dpr);
    // Assigning canvas dimensions clears its backing store; avoid reallocating it on duplicate resize events.
    if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth;
    if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight;
    this.camera.resize(w, h);
  }
  portal(c, p, player, time, reduced = false) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, pulse = reduced ? .5 : .5 + Math.sin(time * 2.4) * .2;
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, Math.max(p.w, p.h) * .8);
    g.addColorStop(0, `rgba(242,211,152,${.32 * pulse})`); g.addColorStop(1, 'rgba(242,211,152,0)');
    c.fillStyle = g; c.fillRect(cx - p.w, cy - p.h, p.w * 2, p.h * 2);
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.dir || 'up'];
    for (let i = 0; i < (reduced ? 1 : 3); i++) {
      const o = reduced ? 5 : ((time * .8 + i / 3) % 1) * 22, x = cx + dx * o, y = cy + dy * o;
      c.globalAlpha = .55 * (1 - o / 22);
      polygon(c, [[x + dx * 7, y + dy * 7], [x - dy * 7 - dx * 2, y + dx * 7 - dy * 2], [x + dy * 7 - dx * 2, y - dx * 7 - dy * 2]], '#f2d398');
    }
    c.globalAlpha = 1;
    if (Math.hypot(player.x - cx, player.y - cy) < 190) {
      c.font = '12px Arial'; c.textAlign = 'center';
      const text = p.label, w = c.measureText(text).width + 22; c.fillStyle = '#102625cc'; c.beginPath(); c.roundRect(cx - w / 2, cy - 44, w, 22, 10); c.fill(); c.fillStyle = '#f2d398'; c.fillText(text, cx, cy - 29);
    }
  }
  render(game) {
    const c = this.ctx, scene = game.scene, env = game.env, cam = this.camera, player = game.player;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = scene.map.ground?.void || '#102625'; c.fillRect(0, 0, this.width, this.height);
    c.save(); cam.apply(c);
    if (scene.ground) c.drawImage(scene.ground, 0, 0);
    scene.drawWater(c, env, this.quality);
    scene.drawBelow(c, env);
    const list = scene.entities(c, env).filter(e => e.big || cam.visible(e.x, e.vy ?? e.y, 320));
    for (const item of scene.litter) if (cam.visible(item.x, item.y)) list.push({ y: item.y, draw: () => drawLitter(c, item) });
    const npcs = [...scene.npcs, ...(game.visitors?.inScene(scene.id) || [])];
    for (const npc of npcs) if (cam.visible(npc.x, npc.y)) list.push({ y: npc.y, draw: () => this.sprites.draw(c, npc) });
    const people = game.entered ? [player] : [];
    for (const remote of game.remotes) if (!game.blocked.has(remote.id) && cam.visible(remote.x, remote.y)) people.push(remote);
    // Seated players are shown on the cushion or bench instead of where they stand.
    const views = people.map(p => { const seat = ['sit', 'meditate'].includes(p.state) && scene.seatFor(p); return seat ? { ...p, x: seat.x, y: seat.y, state: seat.pose === 'tea' ? 'teaSit' : p.state, direction: seat.direction || 'down', self: p === player } : Object.assign(Object.create(p), { self: p === player }); });
    for (const v of views) {
      v.direction = bowDirection(scene.id, v.state, v.direction);
      // Carrying a flower to the altar: a small stem held at the chest.
      list.push({ y: v.y, draw: () => { this.sprites.draw(c, v); if (v.holding) drawHeldFlower(c, v); if (v.litterCarried) drawLitter(c, { x: v.x + 15, y: v.y - 28, kind: v.litterCarried }); } });
    }
    list.sort((a, b) => a.y - b.y);
    for (const item of list) item.draw();
    game.particles.draw(c, false, cam);
    scene.drawAbove(c, env);
    const nearest = game.entered && game.interactions.nearest;
    if (nearest) { c.strokeStyle = '#f2d398'; c.lineWidth = 2; c.setLineDash([3, 5]); c.beginPath(); c.ellipse(nearest.x, nearest.y + 8, 34, 13, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    c.restore();

    this.lighting.ambient(c, this.width, this.height, env, scene.indoor);
    c.save(); cam.apply(c);
    this.lighting.lights(c, scene.dynamicLights ? [...scene.lights, ...scene.dynamicLights()] : scene.lights, cam, env, scene.indoor, env.time);
    for (const portal of scene.map.portals || []) this.portal(c, portal, player, env.time, game.reduced);
    if (game.input.target && game.input.path?.length > 1) {
      c.save(); c.strokeStyle = '#ffe4a34d'; c.lineWidth = 1.5; c.setLineDash([3, 6]);
      c.beginPath(); c.moveTo(player.x, player.y);
      for (const point of game.input.path) c.lineTo(point.x, point.y);
      c.stroke(); c.restore();
    }
    const marker = game.tapMarker;
    if (marker) {
      const age = game.time - marker.started, moving = Boolean(game.input.target);
      if (age < .8 || (moving && !marker.blocked)) {
        c.save();
        c.globalAlpha = age < .8 ? 1 - age * .5 : .55;
        c.strokeStyle = marker.blocked ? '#e5a18b' : '#ffe4a3'; c.lineWidth = 2;
        const radius = game.reduced ? 18 : 15 + Math.min(age, .8) * 16;
        c.beginPath(); c.ellipse(marker.x, marker.y, radius, radius * .45, 0, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.ellipse(marker.x, marker.y, 6, 2.7, 0, 0, Math.PI * 2); c.stroke();
        if (marker.blocked) { c.beginPath(); c.moveTo(marker.x - 4, marker.y - 4); c.lineTo(marker.x + 4, marker.y + 4); c.moveTo(marker.x + 4, marker.y - 4); c.lineTo(marker.x - 4, marker.y + 4); c.stroke(); }
        c.restore();
      } else game.tapMarker = null;
    }
    for (const npc of npcs) if (cam.visible(npc.x, npc.y)) this.sprites.label(c, npc);
    for (const v of views) this.sprites.label(c, v, v.self);
    c.restore();

    this.lighting.atmosphere(c, this.width, this.height, env, scene.indoor ? 0 : game.weather.levels.fog, env.time, scene.indoor);
    game.particles.draw(c, true);
    const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.height * .25, this.width / 2, this.height / 2, Math.max(this.width, this.height) * .7);
    vignette.addColorStop(0, '#0b242000'); vignette.addColorStop(1, '#071c258c'); c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height);
    if (game.scenes.fade > 0) { c.fillStyle = `rgba(6,22,24,${game.scenes.fade})`; c.fillRect(0, 0, this.width, this.height); }
  }
}
