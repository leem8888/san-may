import { Scene } from './Scene.js';

// Incense smoke rises from the altar burner; warm candlelight comes from the altar prop itself.
export class MainHallScene extends Scene {
  ambient(game, particles, env) {
    const burner = this.objects.find(o => o.type === 'altar') || this.props.find(o => o.type === 'altar');
    if (!burner || env.reduced || Math.random() > env.dt * 5) return;
    particles.spawn({ kind: 'smoke', x: burner.x + (Math.random() - .5) * 12, y: burner.y - 100, vy: -16 - Math.random() * 6, life: 5, size: 2, alpha: .22, seed: Math.random() * 6 });
  }
}
