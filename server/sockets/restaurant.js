export function attachRestaurant(socket, ctx, getSelf) {
  for (const [event, run] of [
    ['restaurant:sit', (p, d) => ctx.restaurant.seat(p, d)],
    ['restaurant:order', (p, d) => ctx.restaurant.order(p, d.seatId, d.sku, d.requestId)],
    ['restaurant:eat', (p, d) => ctx.restaurant.eat(p, d.seatId)],
    ['restaurant:leave', p => ({ restaurant: ctx.restaurant.leave(p) })],
  ]) socket.on(event, (data, ack) => {
    if (typeof ack !== 'function') return;
    const p = getSelf(); if (!p) return ack({ error: 'HÃ£y vÃ o phÃ²ng trÆ°á»›c.' });
    try { ack({ ok: true, ...run(p, data || {}) }); } catch (error) { ack({ error: error.message }); }
  });
}
