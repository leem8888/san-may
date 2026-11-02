import { Scene } from './Scene.js';
import { lanternString } from '../rendering/StoryProps.js';

// The main multiplayer square: leaves always drift a little here, even on clear days — fewer once people have
// swept it clean (room state `yard`), and a string of lanterns over the steps once it is decorated and lit.
export class CourtyardScene extends Scene {
  get yard() { return this.objects.find(o => o.id === 'lanternSwitch')?.world?.restoration || {}; }
  ambient(game, particles, env, view) {
    const clean = (this.yard.stage || 0) >= 2, chance = clean ? .997 : .985;
    if ((!clean && game.weather.levels.leaves > .2) || Math.random() > chance - env.dt) particles.spawn({ kind: 'leaf', x: view.left + Math.random() * view.width, y: view.top - 20, vy: 22 + Math.random() * 14, vr: 1.4, life: 14, size: 2 + Math.random() * 2, seed: Math.random() * 6, color: ['#c6b278', '#b98d55', '#d7c48e'][Math.floor(Math.random() * 3)] });
  }
  dynamicLights() {
    const post = this.objects.find(o => o.id === 'lanternSwitch');
    if (!post || !this.yard.lit) return [];
    return lanternString(post).filter((p, i) => i % 2 === 0).map(p => ({ x: p.x, y: p.y + 10, r: 70, color: '255,170,100', flicker: true, power: .8 }));
  }
}
