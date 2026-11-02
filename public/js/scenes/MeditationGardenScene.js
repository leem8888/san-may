import { Scene } from './Scene.js';
import { SandSurface } from '../rendering/SandSurface.js';

// Raked sand, bonsai and meditation cushions; the gardener lives here.
export class MeditationGardenScene extends Scene {
  setSand(strokes) {
    this.sandStrokes = strokes || [];
    this.sandCanvas ||= document.createElement('canvas');
    this.sandCanvas.width = 1000; this.sandCanvas.height = 600;
    this.sandSurface ||= new SandSurface(this.sandCanvas);
    this.sandSurface.strokes = this.sandStrokes;
    this.sandSurface.render();
  }
  get gardenStage() { return this.objects.find(o => o.id === 'oldGarden')?.world?.restoration?.stage || 0; }
  // The restored garden comes alive: butterflies once it blooms, its stone lanterns glow once it is complete.
  ambient(game, particles, env) {
    const garden = this.objects.find(o => o.id === 'oldGarden');
    if (!garden || this.gardenStage < 3 || env.reduced || particles.count('butterfly') > 6 || Math.random() > env.dt * 1.5) return;
    particles.spawn({ kind: 'butterfly', x: garden.x + (Math.random() - .5) * 200, y: garden.y - 20 - Math.random() * 40, vx: (Math.random() - .5) * 30, vy: (Math.random() - .5) * 14, vr: 3, life: 6, size: 2.2, seed: Math.random() * 6, color: Math.random() < .5 ? '#f2e3a0' : '#e9b9d6' });
  }
  dynamicLights() {
    const garden = this.objects.find(o => o.id === 'oldGarden');
    return garden && this.gardenStage >= 4 ? [-136, 136].map(dx => ({ x: garden.x + dx, y: garden.y - 50, r: 85, color: '255,200,120', flicker: true, power: .9 })) : [];
  }
  drawBelow(c) {
    const bed = this.map.ground.layers.find(l => l.type === 'sand');
    if (!bed) return;
    if (!this.sandCanvas) this.setSand(this.sandStrokes);
    c.drawImage(this.sandCanvas, bed.x, bed.y, bed.w, bed.h);
  }
}
