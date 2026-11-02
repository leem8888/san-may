import { Scene } from './Scene.js';

// Dust motes drift slowly through lamplight between the shelves.
export class LibraryScene extends Scene {
  ambient(game, particles, env, view) {
    if (env.reduced || particles.count('mote') > 26 || Math.random() > env.dt * 4) return;
    particles.spawn({ kind: 'mote', x: view.left + Math.random() * view.width, y: view.top + Math.random() * view.height, vx: (Math.random() - .5) * 6, vy: -3 - Math.random() * 4, life: 7, size: 1.3, alpha: .5, color: '#f3dca8' });
  }
}
