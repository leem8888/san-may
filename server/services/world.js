import fs from 'node:fs';
import path from 'node:path';
import { CollisionSystem } from '../../public/js/systems/CollisionSystem.js';
import { PLAYER_RADIUS } from '../../public/js/shared/rules.js';

export const insideRect = (rect, x, y, pad = 0) => x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;

// The server loads the same map JSON as the client, so collision and portals are validated against one source.
export function loadWorld(dir) {
  const scenes = new Map();
  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json'))) {
    const map = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    if (!map.id || !map.width || !map.spawns?.default || !Array.isArray(map.obstacles)) throw Error(`Bản đồ không hợp lệ: ${file}`);
    scenes.set(map.id, { map, collision: new CollisionSystem(map) });
  }
  for (const { map } of scenes.values()) for (const portal of map.portals || []) {
    const target = scenes.get(portal.to);
    if (!target || !target.map.spawns[portal.spawn]) throw Error(`Lối ${map.id}/${portal.id} trỏ tới khu vực không tồn tại`);
  }
  const base = id => scenes.get(String(id).split(':')[0]);
  return {
    ids: [...scenes.keys()],
    has: id => Boolean(base(id)),
    map: id => base(id)?.map,
    spawn(id, name = 'default') { const map = base(id).map, [x, y] = map.spawns[name] || map.spawns.default; return { x, y }; },
    walkable: (id, x, y) => Boolean(base(id)) && Number.isFinite(x) && Number.isFinite(y) && !base(id).collision.blocked(x, y, PLAYER_RADIUS),
    portal: (id, portalId) => base(id)?.map.portals?.find(portal => portal.id === portalId) || null,
    object: (id, objectId) => base(id)?.map.objects?.find(object => object.id === objectId) || null,
  };
}
