import { publicState } from '../services/worldState.js';
import { roomChannel, sceneChannel } from '../services/rooms.js';

// Turns WorldStateManager changes into `world:delta` events for exactly the right audience:
// personal → only the owner's socket; room → that room (one scene, or the whole room for '*'); shared → everyone.
export function attachWorldSync(io, ctx) {
  const { worldState, rooms } = ctx;
  const onChange = record => {
    const delta = publicState(record);
    if (record.scope === 'personal') { const p = rooms.findPlayer(record.owner); if (p) io.to(p.socketId).emit('world:delta', delta); }
    else if (record.scope === 'room') io.to(record.sceneId === '*' ? roomChannel(record.owner) : sceneChannel(record.owner, record.sceneId)).emit('world:delta', delta);
    else io.emit('world:delta', delta);
  };
  worldState.on('change', onChange);
  const timer = setInterval(() => worldState.purgeExpired(), 30000); timer.unref();
  return {
    snapshot: p => worldState.visible(p.id, p.room, p.sceneId).map(publicState),
    close() { clearInterval(timer); worldState.off('change', onChange); },
  };
}
