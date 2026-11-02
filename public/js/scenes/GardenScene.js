import { Scene } from './Scene.js';
import { PROPS, box, line, shadow } from '../rendering/props.js';
import { ellipse } from '../rendering/SpriteRenderer.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { TREE_STAGES, treeStage } from '../shared/rules.js';

const DECOR = { lantern: 'stoneLantern', flower: 'flowerBed', bonsai: 'bonsai', bench: 'bench', lotusPot: 'lotusPot', windbell: 'windbellPost', wildflower: 'wildFlowers', hallLamp: 'lampMini' };

function drawTree(c, o, env, stage) {
  const { x, y } = o;
  if (stage === 0) { shadow(c, x, y, 16, 5, env); ellipse(c, x, y - 3, 16, 6, '#5a4632'); ellipse(c, x, y - 6, 4, 3, '#c9a86a'); return; }
  if (stage === 1) { ellipse(c, x, y - 3, 14, 5, '#5a4632'); line(c, x, y - 4, x, y - 18, '#6f8a4e', 2); ellipse(c, x - 5, y - 19, 5, 3, '#7fae5c'); ellipse(c, x + 5, y - 21, 5, 3, '#7fae5c'); return; }
  if (stage === 2) { shadow(c, x, y, 22, 6, env); box(c, x - 2, y - 40, 4, 40, '#6b5741'); for (const [dx, dy] of [[-10, -40], [10, -44], [0, -52]]) ellipse(c, x + dx, y + dy, 12, 9, '#4b7058'); return; }
  PROPS.tree(c, { ...o, size: stage === 3 ? .55 : .85 }, env);
}

// The owner's garden: objects come from the server snapshot and live `garden:update` events.
export class GardenScene extends Scene {
  constructor(map) { super(map); this.garden = null; this.objectsData = []; this.selected = null; this.isOwner = false; }
  setGarden(garden, selfId) { this.garden = garden; this.isOwner = garden?.ownerId === selfId; this.setObjects(garden?.objects || []); }
  setObjects(objects) {
    this.objectsData = objects;
    if (this.selected && !objects.some(o => o.id === this.selected.id)) this.selected = null;
    // Owners can water nearby trees with E; everything else is decoration.
    this.interactions = new InteractionSystem(this.isOwner ? objects.filter(o => o.type === 'tree').map(o => ({ ...o, gardenObject: true, action: 'water', label: `Tưới cây · ${TREE_STAGES[treeStage(o.createdAt, o.waterCount)]}`, radius: 110 })) : []);
  }
  objectAt(x, y) { return this.objectsData.find(o => Math.abs(o.x - x) < 34 && y > o.y - 70 && y < o.y + 16) || null; }
  entities(c, env) {
    const list = super.entities(c, env), now = Date.now();
    for (const o of this.objectsData) {
      const draw = o.type === 'tree' ? () => drawTree(c, o, env, treeStage(o.createdAt, o.waterCount, now)) : () => (o.type === 'rock' ? PROPS.rock(c, { ...o, size: .8 }, env) : PROPS[DECOR[o.type]]?.(c, o, env));
      list.push({ y: o.y, x: o.x, vy: o.y, draw });
    }
    return list;
  }
  drawBelow(c) {
    if (!this.isOwner) return;
    const plot = this.map.plot;
    c.setLineDash([6, 8]); c.strokeStyle = 'rgba(242,211,152,.35)'; c.lineWidth = 2; c.strokeRect(plot.x, plot.y, plot.w, plot.h); c.setLineDash([]);
    if (this.selected) { c.strokeStyle = '#f2d398'; c.lineWidth = 2; c.beginPath(); c.ellipse(this.selected.x, this.selected.y + 4, 30, 11, 0, 0, Math.PI * 2); c.stroke(); }
  }
}
