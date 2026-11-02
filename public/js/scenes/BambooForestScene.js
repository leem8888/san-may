import { Scene } from './Scene.js';

// Bamboo sways with the shared wind; fireflies appear after dusk.
export class BambooForestScene extends Scene {
  ambient(game, particles, env, view) {
    if (!env.night || env.reduced || particles.count('firefly') > 24 || Math.random() > env.dt * 6) return;
    particles.spawn({ kind: 'firefly', x: view.left + Math.random() * view.width, y: view.top + Math.random() * view.height, vx: (Math.random() - .5) * 18, vy: (Math.random() - .5) * 12, life: 5, size: 1.8, color: '#e8f59a' });
  }
}
