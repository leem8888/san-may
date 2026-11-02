import { $ } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
// Schematic positions of the areas (north is up), matching the portals in the map files.
const LAYOUT = { library: [60, 30], bellTower: [260, 30], bambooForest: [60, 108], mainHall: [160, 108], lotusLake: [260, 108], zenGarden: [60, 188], courtyard: [160, 188], gate: [160, 266] };

export class MapPanel {
  constructor(maps) { this.maps = maps; }
  render(currentId, visited = []) {
    const svg = $('#worldMap'), seen = new Set();
    svg.replaceChildren();
    const areas = [...this.maps.values()].filter(map => LAYOUT[map.id]);
    for (const map of areas) for (const portal of map.portals) {
      if (!LAYOUT[portal.to]) continue;
      const key = [map.id, portal.to].sort().join('|');
      if (seen.has(key)) continue; seen.add(key);
      const [x1, y1] = LAYOUT[map.id], [x2, y2] = LAYOUT[portal.to], line = document.createElementNS(NS, 'line');
      Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => line.setAttribute(k, v)); svg.append(line);
    }
    for (const map of areas) {
      const [x, y] = LAYOUT[map.id], g = document.createElementNS(NS, 'g'), rect = document.createElementNS(NS, 'rect'), text = document.createElementNS(NS, 'text');
      g.setAttribute('class', `node${map.id === currentId ? ' here' : visited.includes(map.id) ? ' visited' : ''}`);
      Object.entries({ x: x - 46, y: y - 15, width: 92, height: 30, rx: 10 }).forEach(([k, v]) => rect.setAttribute(k, v));
      Object.entries({ x, y: y + 4 }).forEach(([k, v]) => text.setAttribute(k, v)); text.textContent = map.name;
      g.append(rect, text); svg.append(g);
    }
    const here = this.maps.get(currentId.split(":")[0]);
    $('#mapHint').textContent = `Bạn đang ở ${here.name} — ${here.subtitle}. Đã ghé ${visited.length}/8 khu vực. Đi tới các vòng sáng ở mép cảnh để sang khu khác.`;
  }
}
