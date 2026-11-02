// Server-driven conversations and story progress. Each socket owns at most one conversation, so several players
// can talk to the same NPC at once without seeing or changing each other's dialogue.
//   dialogue:start {npcId} → {ok, view, story};  dialogue:choose {choiceId} / dialogue:next {} → {ok, view, story};
//   dialogue:submit {text} (written answer → private journal note);  dialogue:end {};  story:state {} → {ok, story}.  Server → client: story:update {story, chapters[]} after any progress.
export function attachNarrative(socket, ctx, getSelf) {
  const { narrative, world } = ctx;
  // Story state plus the journey's own (paused, stage introductions already seen).
  const fullState = p => ({ ...narrative.state(p), journey: ctx.journey.state(p.id) });
  let conversation = null;
  // Room-wide changes (a restored garden) can advance other players' stories, so each socket registers a hook.
  ctx.storyHooks ||= new Map();
  ctx.storyHooks.set(socket.data.playerId, event => handle(event));
  socket.on('disconnect', () => { if (ctx.storyHooks.get(socket.data.playerId)?.socket === socket) ctx.storyHooks.delete(socket.data.playerId); });
  ctx.storyHooks.get(socket.data.playerId).socket = socket;

  // Story events from the rest of the game (visits, activities, interactions) go through here too.
  function publish(updates) {
    const chapters = updates.filter(u => u.chapterDone).map(u => ({ storyId: u.storyId, storyTitle: narrative.content.stories.get(u.storyId).title, ...u.chapterDone }));
    const self = getSelf();
    if (self) { ctx.journey.observe(self.id, updates); ctx.journey.touch(self.id); }
    socket.emit('story:update', { story: fullState(self), chapters });
  }
  function handle(event) {
    const p = getSelf();
    if (!p) return [];
    const updates = narrative.handle(p, event);
    if (updates.length) publish(updates);
    return updates;
  }
  function respond(ack, p, view) {
    if (view.updates?.length) publish(view.updates);
    const { updates, ...clean } = view;
    ack({ ok: true, view: clean, story: fullState(p) });
  }
  function on(event, callback) {
    socket.on(event, (data, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      const p = getSelf();
      if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      try { callback(p, data || {}, ack); } catch (error) { ack({ error: error.message }); }
    });
  }

  on('dialogue:start', (p, data, ack) => {
    if (typeof data.npcId !== 'string' || !narrative.hasDialogue(data.npcId)) throw Error('Người này chưa có câu chuyện để kể.');
    // Travelling NPCs are wherever the shared routine puts them right now; residents stay at their map spot.
    const traveller = ctx.npcDirector.stateAt(data.npcId, Date.now()), def = ctx.npcDirector.definitions.get(data.npcId);
    const npc = traveller ? (traveller.sceneId === p.sceneId ? { ...def, x: traveller.x, y: traveller.y } : null) : world.map(p.sceneId)?.objects?.find(o => o.id === data.npcId && (o.type === 'npc' || o.narrative));
    if (!npc) throw Error(traveller ? `Người này đang ${traveller.activity}, không ở khu vực của bạn.` : 'Người này không ở khu vực của bạn.');
    if (Math.hypot(p.x - npc.x, p.y - npc.y) > (npc.radius || 100) + 80) throw Error('Hãy đến gần hơn để trò chuyện.');
    const { session, view } = narrative.begin(p, data.npcId);
    conversation = session;
    respond(ack, p, view);
  });
  on('dialogue:choose', (p, data, ack) => {
    if (!conversation) throw Error('Cuộc trò chuyện đã kết thúc.');
    const view = narrative.choose(p, conversation, String(data.choiceId || ''));
    if (view.end) conversation = null;
    respond(ack, p, view);
  });
  on('dialogue:submit', (p, data, ack) => {
    if (!conversation) throw Error('Cuộc trò chuyện đã kết thúc.');
    const view = narrative.submit(p, conversation, data.text);
    if (view.end) conversation = null;
    respond(ack, p, view);
  });
  on('dialogue:next', (p, data, ack) => {
    if (!conversation) throw Error('Cuộc trò chuyện đã kết thúc.');
    respond(ack, p, narrative.next(p, conversation));
  });
  on('dialogue:end', (p, data, ack) => { conversation = null; ack({ ok: true }); });
  on('story:state', (p, data, ack) => ack({ ok: true, story: fullState(p) }));
  // journey:pause {on} — hides objectives and stops counting active time; journey:seen {storyId, stage}.
  on('journey:pause', (p, data, ack) => { ctx.journey.pause(p.id, data.on === true); ack({ ok: true, story: fullState(p) }); });
  on('journey:seen', (p, data, ack) => {
    const story = narrative.content.stories.get(String(data.storyId || '')), stage = Number(data.stage);
    if (!story?.journey || !Number.isInteger(stage) || stage < 1 || stage > story.chapters.length) throw Error('Dữ liệu không hợp lệ.');
    ctx.journey.seen(p.id, story.id, stage); ack({ ok: true });
  });

  // Shared world work (world:interact {objectId}): validated by worldActions, then every player in the room
  // re-checks stories that wait on the world (e.g. "the garden has seedlings").
  on('world:interact', (p, data, ack) => {
    const object = world.object(p.sceneId, String(data.objectId || ''));
    const hall = object?.action === 'hall', result = hall ? ctx.hall.act(p, object, typeof data.choice === 'string' ? data.choice.slice(0, 12) : null) : ctx.worldActions.restore(p, object);
    Object.assign(p, { state: 'interact', actionAt: Date.now(), moved: false, dirty: true });
    socket.to(`s:${p.room}:${p.sceneId}`).emit('player:action', { id: p.id, action: 'interact', at: Date.now() });
    if (hall) { if (result.story) handle(result.story); } // personal: only this player's journey moves
    else for (const other of ctx.rooms.get(p.room)?.players.values() || []) ctx.storyHooks.get(other.id)?.({ type: 'world' });
    delete result.story;
    ack({ ok: true, result, story: fullState(p) });
  });

  return { handle, state: () => fullState(getSelf()) };
}
