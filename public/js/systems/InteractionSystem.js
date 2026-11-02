export class InteractionSystem {
  constructor(objects) { this.objects = objects.filter(o => o.action); this.nearest = null; }
  update(player) {
    let best = null, distance = Infinity;
    for (const o of this.objects) { const d = Math.hypot(o.x - player.x, o.y - player.y); if (d < o.radius && d < distance) { best = o; distance = d; } }
    this.nearest = best;
  }
  // Touch/click selection: the interactive object under a world point, if any.
  at(x, y) { return this.objects.find(o => Math.abs(o.x - x) < (o.hitW || 46) && y > o.y - (o.hitH || 100) && y < o.y + 24) || null; }
}
