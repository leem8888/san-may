// Cooperative sessions over Socket.IO. Every request is validated, rate limited and acknowledged; results and
// rewards are decided by the session manager, never by the client.
//   coop:invite {targetId?, kind, options?} → {ok, session}      coop:respond {sessionId, accept} → {ok, session?}
//   coop:ready {options?} / coop:unready {} → {ok, session}       coop:act {action, payload?} → {ok, message, session}
//   coop:leave {} → {ok}     coop:state {} → {ok, session}         coop:memories {} → {ok, memories}
//   Server → client: coop:invite, coop:state, coop:complete, coop:sit, coop:photo.
const KINDS = ['tea', 'meditate', 'bell', 'garden', 'puzzle', 'lamp', 'read', 'greet', 'sit', 'photo'];

export function attachCoop(socket, ctx, getSelf, limiter) {
  const text = (value, max) => typeof value === 'string' && value.length <= max ? value : null;
  function on(event, cost, callback) {
    socket.on(event, (data, ack) => {
      if (typeof ack !== 'function') ack = () => {};
      const p = getSelf();
      if (!p) return ack({ error: 'Hãy vào phòng trước.' });
      if (!limiter.take('coop', cost)) return ack({ error: 'Chậm lại một chút nhé.' });
      const input = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      try { ack({ ok: true, ...callback(p, input) }); } catch (error) { if (!error.coop && !error.message) throw error; ack({ error: error.message }); }
    });
  }
  on('coop:invite', 3, (p, d) => {
    const kind = KINDS.includes(d.kind) ? d.kind : null;
    if (!kind) throw Error('Hoạt động không tồn tại.');
    const options = d.options && typeof d.options === 'object' ? { minutes: Number(d.options.minutes) || undefined, item: text(d.options.item, 32) || undefined } : {};
    return { session: ctx.coop.invite(p, d.targetId === undefined || d.targetId === null ? null : text(d.targetId, 64) || '-', kind, options) };
  });
  on('coop:respond', 1, (p, d) => ({ session: ctx.coop.respond(p, text(d.sessionId, 64), d.accept === true) }));
  on('coop:ready', 1, (p, d) => ({ session: ctx.coop.ready(p, { minutes: Number(d.options?.minutes) || undefined }) }));
  on('coop:unready', 1, p => ({ session: ctx.coop.unready(p) }));
  on('coop:act', 1, (p, d) => {
    const action = text(d.action, 24);
    if (!action) throw Error('Hành động không hợp lệ.');
    const payload = d.payload && typeof d.payload === 'object' && !Array.isArray(d.payload) ? { tea: text(d.payload.tea, 12), mark: text(d.payload.mark, 12), index: Number(d.payload.index), dial: text(d.payload.dial, 8), order: Array.isArray(d.payload.order) ? d.payload.order.slice(0, 3).map(v => text(v, 12)) : undefined } : {};
    return ctx.coop.act(p, action, payload);
  });
  on('coop:leave', 1, p => { ctx.coop.leave(p); return {}; });
  on('coop:state', 1, p => { const s = ctx.coop.sessionOf(p.id); return { session: s ? ctx.coop.view(s, p.id) : null }; });
  on('coop:memories', 1, p => ({ memories: ctx.coop.memories(p.id) }));
}
