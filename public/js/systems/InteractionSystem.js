export class InteractionSystem {
  constructor(objects) { this.objects = objects.filter(o => o.action); this.extra = []; this.nearest = null; }
  all() { return this.extra.length ? [...this.objects, ...this.extra] : this.objects; }
  update(player) {
    let best = null, distance = Infinity;
    for (const o of this.all()) { if (o.hidden) continue; const d = Math.hypot(o.x - player.x, o.y - player.y); if (d < o.radius && d < distance) { best = o; distance = d; } }
    this.nearest = best;
  }
  // Touch/click selection: the interactive object under a world point, if any.
  at(x, y) { return this.all().find(o => !o.hidden && Math.abs(o.x - x) < (o.hitW || 46) && y > o.y - (o.hitH || 100) && y < o.y + 24) || null; }
}
