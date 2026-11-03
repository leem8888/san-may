import { Scene } from './Scene.js';
import { lanternString } from '../rendering/StoryProps.js';

// The main multiplayer square: leaves always drift a little here, even on clear days — fewer once people have
// swept it clean (room state `yard`), and a string of lanterns over the steps once it is decorated and lit.
export class CourtyardScene extends Scene {
  get yard() { return this.objects.find(o => o.id === 'lanternSwitch')?.world?.restoration || {}; }
  ambient(game, particles, env, view) {
    const clean = (this.yard.stage || 0) >= 2;
    this.leafTimer = (this.leafTimer ?? 2.5) - env.dt;
    if (this.leafTimer <= 0) {
      if (!clean || game.weather.levels.leaves > .25) particles.spawn({ kind: 'leaf', x: view.left + Math.random() * view.width, y: view.top - 24 + Math.random() * 90, life: 11 + Math.random() * 7, size: 2.4 + Math.random() * 2.2, seed: Math.random() * 12, color: ['#c6b278', '#b98d55', '#d7c48e', '#9fae6a'][Math.floor(Math.random() * 4)] });
      this.leafTimer = 3.5 + Math.random() * 5;
    }
  }
  dynamicLights() {
    const post = this.objects.find(o => o.id === 'lanternSwitch');
    if (!post || !this.yard.lit) return [];
    return lanternString(post).filter((p, i) => i % 2 === 0).map(p => ({ x: p.x, y: p.y + 10, r: 70, color: '255,170,100', flicker: true, power: .8 }));
  }
}
