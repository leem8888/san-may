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
  drawBelow(c) {
    const bed = this.map.ground.layers.find(l => l.type === 'sand');
    if (!bed) return;
    if (!this.sandCanvas) this.setSand(this.sandStrokes);
    c.drawImage(this.sandCanvas, bed.x, bed.y, bed.w, bed.h);
  }
}
