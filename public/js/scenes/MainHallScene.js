import { Scene } from './Scene.js';
import { candleSlots } from '../rendering/StoryProps.js';
import { INCENSE_SECONDS } from '../shared/rules.js';
import { ellipse } from '../rendering/SpriteRenderer.js';
import { drawOffering } from '../rendering/OfferingArt.js';
import { OFFERING_SECONDS } from '../shared/shop.js';

// Incense lit by players stands in the censer and slowly burns down; smoke rises from the altar burner and
// from every lit stick. Sticks come from room world state (snapshot + `world:delta`).
export class MainHallScene extends Scene {
  constructor(map) { super(map); this.sticks = []; this.censer = this.objects.find(o => o.action === 'incense'); }
  setOfferings(list, serverNow) { this.offerings = (list || []).map(o => ({ ...o, born: this.time - (serverNow - o.at) / 1000 })); }
  setIncense(list, serverNow) { this.sticks = []; for (const s of list) this.addIncense(s, serverNow); }
  addIncense(stick, serverNow = Date.now()) { this.sticks.push({ ...stick, born: this.time - (serverNow - stick.at) / 1000 }); }
  liveSticks() { this.sticks = this.sticks.filter(s => this.time - s.born < INCENSE_SECONDS); return this.sticks.slice(-9); }
  stickTips() {
    const list = this.liveSticks(), n = list.length;
    return list.map((s, i) => { const burnt = (this.time - s.born) / INCENSE_SECONDS; return { x: this.censer.x + (i - (n - 1) / 2) * 4.2, y: this.censer.y - 53 - 26 * (1 - burnt * .75), lean: (i - (n - 1) / 2) * .9 }; });
  }
  entities(c, env) {
    const list = super.entities(c, env);
    const stand = this.objects.find(o => o.action === 'offering');
    if (stand) {
      this.offerings = (this.offerings || []).filter(o => this.time - o.born < OFFERING_SECONDS);
      list.push({ y: stand.y + .2, x: stand.x, vy: stand.y, draw: () => {
        this.offerings.slice(0, 6).forEach((o, i) => {
          c.save(); c.translate(stand.x + (i % 3 - 1) * 32, stand.y - 30 - Math.floor(i / 3) * 13); c.scale(.65, .65);
          drawOffering(c, 0, 0, o.sku, env.time, env.reduced); c.restore();
        });
      } });
    }
    if (this.censer) list.push({ y: this.censer.y + .5, x: this.censer.x, vy: this.censer.y, draw: () => {
      for (const tip of this.stickTips()) {
        c.strokeStyle = '#a3543c'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(this.censer.x + tip.lean * .3, this.censer.y - 50); c.lineTo(tip.x + tip.lean, tip.y); c.stroke();
        ellipse(c, tip.x + tip.lean, tip.y, 1.6, 1.6, `rgba(255,${120 + Math.sin(env.time * 6 + tip.x) * 40},60,.95)`);
      }
    } });
    return list;
  }
  // Incense glow, burning candles, and the ancient lamp once it is lit (personal state): the whole hall warms a little.
  dynamicLights() {
    const lights = [], n = this.liveSticks().length;
    if (n && this.censer) lights.push({ x: this.censer.x, y: this.censer.y - 50, r: 40 + n * 4, color: '255,140,80', flicker: true, power: .5 });
    const rack = this.objects.find(o => o.id === 'candleRack');
    if (rack) { const burning = candleSlots(rack, Date.now()).filter(st => st === 'burning').length; if (burning) lights.push({ x: rack.x, y: rack.y - 56, r: 50 + burning * 9, color: '255,190,110', flicker: true, power: .7 }); }
    const niche = this.objects.find(o => o.id === 'nicheC');
    if (niche?.world?.state?.lit) lights.push({ x: niche.x, y: niche.y - 70, r: 170, color: '255,205,130', flicker: true, power: .95 }, { x: 700, y: 560, r: 520, color: '255,214,150', flicker: false, power: .22 });
    return lights;
  }
  ambient(game, particles, env) {
    if (env.reduced) return;
    // A few slow, faintly lit dust motes drifting in the light in front of the altar.
    if (particles.count('mote') < 10 && Math.random() < env.dt * .9) particles.spawn({ kind: 'mote', x: 520 + Math.random() * 360, y: 300 + Math.random() * 260, vx: (Math.random() - .5) * 5, vy: -2 - Math.random() * 3, life: 7 + Math.random() * 4, size: 1.1, alpha: .45, color: '#f6e6b8' });
    const burner = this.objects.find(o => o.type === 'altar') || this.props.find(o => o.type === 'altar');
    if (burner && Math.random() < env.dt * 5) particles.spawn({ kind: 'smoke', x: burner.x + (Math.random() - .5) * 12, y: burner.y - 100, vy: -16 - Math.random() * 6, life: 5, size: 2, alpha: .22, seed: Math.random() * 6 });
    for (const tip of this.stickTips()) if (Math.random() < env.dt * 1.6) particles.spawn({ kind: 'smoke', x: tip.x + tip.lean, y: tip.y - 2, vy: -14 - Math.random() * 6, life: 4.5, size: 1.4, alpha: .2, seed: Math.random() * 6 });
  }
}
