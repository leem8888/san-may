import { Scene } from './Scene.js';

// The main multiplayer square: leaves always drift a little here, even on clear days.
export class CourtyardScene extends Scene {
  ambient(game, particles, env, view) {
    if (game.weather.levels.leaves > .2 || Math.random() > .985 - env.dt) particles.spawn({ kind: 'leaf', x: view.left + Math.random() * view.width, y: view.top - 20, vy: 22 + Math.random() * 14, vr: 1.4, life: 14, size: 2 + Math.random() * 2, seed: Math.random() * 6, color: ['#c6b278', '#b98d55', '#d7c48e'][Math.floor(Math.random() * 3)] });
  }
}
