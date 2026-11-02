import { $ } from './dom.js';
import { MAP_LAYOUT, MAP_CARD } from './MapLayout.js';
const NS = 'http://www.w3.org/2000/svg';
function element(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}
const DIRECTIONS = { up: '↑ Đi lên', down: '↓ Đi xuống', left: '← Sang trái', right: '→ Sang phải' };
export class MapPanel {
  constructor(maps) { this.maps = maps; }
  thumbnail(map) {
    const svg = element('svg', { x: -50, y: -16, width: 100, height: 46, viewBox: `0 0 ${map.width} ${map.height}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    svg.append(element('rect', { width: map.width, height: map.height, fill: map.ground?.base || '#29483e' }));
    for (const l of map.ground?.layers || []) {
      if (['tiles', 'planks', 'rect', 'carpet', 'sand'].includes(l.type)) {
        svg.append(element('rect', { x: l.x, y: l.y, width: l.w, height: l.h, rx: 6, fill: l.color || ({ tiles: '#a0977b', planks: '#896245', carpet: '#7d2a24', sand: '#d8ccad' })[l.type] || '#66513c' }));
      } else if (l.type === 'water') {
        svg.append(element(l.shape === 'rect' ? 'rect' : 'ellipse', l.shape === 'rect' ? { x: l.x, y: l.y, width: l.w, height: l.h, fill: '#538c85' } : { cx: l.x, cy: l.y, rx: l.rx, ry: l.ry, fill: '#538c85' }));
      } else if (['path', 'dirt', 'stream'].includes(l.type)) {
        svg.append(element('polyline', { points: l.points.map(p => p.join(',')).join(' '), fill: 'none', stroke: l.type === 'stream' ? '#538c85' : '#aa9870', 'stroke-width': l.width || 28, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      }
    }
    for (const o of [...(map.props || []), ...(map.objects || [])]) {
      if (['tree', 'pine', 'bamboo', 'bush'].includes(o.type)) svg.append(element('ellipse', { cx: o.x, cy: o.y - 50, rx: o.type === 'bamboo' ? 38 : 65, ry: 48, fill: '#729361', opacity: .85 }));
      if (o.type === 'temple') svg.append(element('rect', { x: o.x - 310, y: o.y - 230, width: 620, height: 230, fill: '#bb8550', rx: 20 }));
      if (['statue', 'bigBell', 'bookshelf'].includes(o.type)) svg.append(element('rect', { x: o.x - 45, y: o.y - 70, width: 90, height: 70, fill: '#d2b476', rx: 8 }));
    }
    for (const p of map.portals || []) svg.append(element('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: '#ffe3a0' }));
    return svg;
  }
  render(currentId, visited = [], player) {
    const svg = $('#worldMap'), seen = new Set();
    svg.replaceChildren(); svg.setAttribute('viewBox', '0 0 400 452');
    const areas = [...this.maps.values()].filter(map => MAP_LAYOUT[map.id]);
    const defs = element('defs'), arrow = element('marker', { id: 'mapArrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto-start-reverse' });
    arrow.append(element('path', { d: 'M 1 1 L 9 5 L 1 9', fill: 'none', stroke: '#d9b77e', 'stroke-width': 1.6 })); defs.append(arrow); svg.append(defs);
    svg.append(element('text', { x: 14, y: 13, class: 'map-compass' }, '↑ BẮC · Hướng như trong game'));
    for (const map of areas) for (const portal of map.portals) {
      if (!MAP_LAYOUT[portal.to]) continue;
      const key = [map.id, portal.to].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
      const [ax, ay] = MAP_LAYOUT[map.id], [bx, by] = MAP_LAYOUT[portal.to];
      const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
      svg.append(element('line', { x1: ax + dx * (MAP_CARD.width / 2 + 4), y1: ay + dy * (MAP_CARD.height / 2 + 4), x2: bx - dx * (MAP_CARD.width / 2 + 4), y2: by - dy * (MAP_CARD.height / 2 + 4), 'marker-start': 'url(#mapArrow)', 'marker-end': 'url(#mapArrow)' }));
    }
    for (const map of areas) {
      const [x, y] = MAP_LAYOUT[map.id], here = map.id === currentId;
      const g = element('g', { transform: `translate(${x} ${y})`, class: `node${here ? ' here' : visited.includes(map.id) ? ' visited' : ''}` });
      g.append(element('title', {}, `${map.name}${here ? ' · Bạn ở đây' : ''}`));
      g.append(element('rect', { x: -56, y: -39, width: 112, height: 78, rx: 8, class: 'map-card' }));
      g.append(element('text', { x: 0, y: -24, class: 'map-name' }, map.name)); g.append(this.thumbnail(map));
      if (here && player) {
        const px = -50 + Math.max(0, Math.min(1, player.x / map.width)) * 100, py = -16 + Math.max(0, Math.min(1, player.y / map.height)) * 46;
        g.append(element('circle', { cx: px, cy: py, r: 3.5, fill: '#fff9e2', stroke: '#b85f3f', 'stroke-width': 1.5 }));
      }
      if (here) g.append(element('text', { x: 0, y: 50, class: 'map-here' }, '● Bạn ở đây'));
      svg.append(g);
    }
    const here = this.maps.get(currentId.split(':')[0]);
    const exits = (here?.portals || []).map(p => `${DIRECTIONS[p.dir] || 'Đi tới'}: ${this.maps.get(p.to)?.name || p.label}`).join(' · ');
    $('#mapHint').textContent = `Bạn đang ở ${here?.name || 'Vườn riêng'}. Đã ghé ${visited.length}/8 khu vực. ${exits}. Các ô thu nhỏ theo bố cục từng khu; khoảng cách giữa khu được thu gọn.`;
  }
}