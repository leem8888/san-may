import { SCENE_IDS } from '../shared/rules.js';

// Loads every area and the dialogue file once, with progress; sprites are generated lazily by SpriteRenderer.
export class AssetLoader {
  constructor() { this.cache = new Map(); }
  get(key) { if (!this.cache.has(key)) throw Error(`Thiếu tài nguyên: ${key}`); return this.cache.get(key); }
  async json(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error(`Không tải được ${url} (${response.status})`);
    return response.json();
  }
  async load(onProgress = () => {}) {
    if (this.cache.has('maps')) return this;
    const content = ['dialogues', 'stories', 'fortunes'];
    const files = [...[...SCENE_IDS, 'garden'].map(id => `/data/maps/${id}.json`), ...content.map(name => `/data/${name}.json`)], total = files.length;
    let done = 0;
    const results = await Promise.all(files.map(url => this.json(url).then(data => { onProgress(++done, total); return data; })));
    const maps = new Map();
    for (const map of results.slice(0, -content.length)) {
      if (!map.id || !map.width || !Array.isArray(map.obstacles) || !map.spawns?.default) throw Error(`Dữ liệu bản đồ không hợp lệ: ${map.id || '?'}`);
      maps.set(map.id, map);
    }
    this.cache.set('maps', maps);
    content.forEach((name, i) => this.cache.set(name, results[results.length - content.length + i]));
    return this;
  }
}
