import { RESTAURANT_MENU } from '../../public/js/shared/restaurant.js';
import { sceneChannel } from './rooms.js';

const WAIT_PREPARE = 4200, WALK_TO_TABLE = 2400, WALK_HOME = 2200, WIPE_TABLE = 3000;

export function createRestaurant(ctx) {
  const { rooms, world, repos, progression } = ctx, states = new Map(), timers = new Set();
  const map = world.map('gate'), seller = map?.objects?.find(o => o.id === 'bunSeller'), home = { x: seller?.x ?? 1360, y: seller?.y ?? 1155 };
  const tableSpecs = (map?.props || []).filter(o => o.type === 'restaurantTable');
  const seatSpecs = (map?.objects || []).filter(o => o.action === 'restaurantSeat');
  const findTable = (state, id) => state.tables.find(t => t.id === id);
  const seatFor = (state, id) => state.tables.flatMap(t => t.seats).find(s => s.id === id);
  const count = table => table.seats.filter(s => s.playerId).length;

  function ensure(room) {
    if (states.has(room)) return states.get(room);
    const state = {
      room,
      tables: tableSpecs.map(t => ({ id: t.id, x: t.x, y: t.y, dirty: false, cleaning: false, cleanQueued: false, seats: seatSpecs.filter(s => s.tableId === t.id).map(s => ({ id: s.id, x: s.x, y: s.y, playerId: null, name: null, order: null, lastOrderId: null })) })),
      queue: [], active: null, chef: { state: 'idle', tableId: null, from: home, to: home, startedAt: Date.now(), endsAt: Date.now() },
    };
    states.set(room, state); return state;
  }
  function view(state) {
    return { sceneId: 'gate', tables: state.tables.map(t => ({ id: t.id, dirty: t.dirty, cleaning: t.cleaning, cleanQueued: t.cleanQueued, seats: t.seats.map(s => ({ id: s.id, playerId: s.playerId, name: s.name, order: s.order && { ...s.order } })) })), chef: { ...state.chef } };
  }
  function publish(state) { ctx.io?.to(sceneChannel(state.room, 'gate')).emit('restaurant:update', view(state)); }
  function later(fn, ms) {
    const timer = setTimeout(() => { timers.delete(timer); fn(); }, ms); timers.add(timer); timer.unref?.(); return timer;
  }
  const route = (state, status, table, from, to, duration) => {
    const now = Date.now(); state.chef = { state: status, tableId: table?.id || null, from, to, startedAt: now, endsAt: now + duration };
  };

  function enqueueClean(state, table) {
    if (count(table) || !table.dirty || table.cleaning || table.cleanQueued) return;
    table.cleanQueued = true; state.queue.push({ type: 'clean', tableId: table.id });
  }
  function runNext(state) {
    if (state.active) return;
    let job = state.queue.shift();
    while (job?.type === 'order') {
      const table = findTable(state, job.tableId), seat = seatFor(state, job.seatId);
      if (table && seat?.order?.requestId === job.requestId) break;
      job = state.queue.shift();
    }
    if (!job) { state.chef = { state: 'idle', tableId: null, from: home, to: home, startedAt: Date.now(), endsAt: Date.now() }; publish(state); return; }
    const table = findTable(state, job.tableId);
    if (!table) return runNext(state);
    state.active = job;
    if (job.type === 'order') {
      const seat = seatFor(state, job.seatId);
      if (!seat?.order) { state.active = null; return runNext(state); }
      seat.order.status = 'preparing'; state.chef = { state: 'preparing', tableId: table.id, from: home, to: home, startedAt: Date.now(), endsAt: Date.now() + WAIT_PREPARE }; publish(state);
      later(() => {
        if (states.get(state.room) !== state) return;
        const target = { x: table.x, y: table.y + 38 };
        if (seat.order?.requestId === job.requestId) seat.order.status = 'serving';
        route(state, 'serving', table, home, target, WALK_TO_TABLE); publish(state);
        later(() => {
          if (states.get(state.room) !== state) return;
          if (seat.order?.requestId === job.requestId) {
            seat.order.status = 'served';
            table.dirty = true;
          }
          route(state, 'returning', table, target, home, WALK_HOME); publish(state);
          later(() => {
            if (states.get(state.room) !== state) return;
            state.active = null; state.chef = { state: 'idle', tableId: null, from: home, to: home, startedAt: Date.now(), endsAt: Date.now() };
            enqueueClean(state, table); publish(state); runNext(state);
          }, WALK_HOME);
        }, WALK_TO_TABLE);
      }, WAIT_PREPARE);
      return;
    }
    table.cleaning = true;
    const target = { x: table.x, y: table.y + 30 };
    route(state, 'cleaning', table, home, target, WALK_TO_TABLE); publish(state);
    later(() => {
      if (states.get(state.room) !== state) return;
      route(state, 'cleaning', table, target, target, WIPE_TABLE); publish(state);
      later(() => {
        if (states.get(state.room) !== state) return;
        table.dirty = false; table.cleaning = false; table.cleanQueued = false;
        route(state, 'returning', table, target, home, WALK_HOME); publish(state);
        later(() => {
          if (states.get(state.room) !== state) return;
          state.active = null; state.chef = { state: 'idle', tableId: null, from: home, to: home, startedAt: Date.now(), endsAt: Date.now() };
          publish(state); runNext(state);
        }, WALK_HOME);
      }, WIPE_TABLE);
    }, WALK_TO_TABLE);
  }

  function seat(p, { seatId, tableId }) {
    if (p.sceneId !== 'gate') throw Error('QuÃ¡n Äƒn chay á»Ÿ cá»•ng chÃ¹a.');
    const state = ensure(p.room);
    if (p.restaurantSeat) {
      const ownSeat = seatFor(state, p.restaurantSeat);
      const ownTable = state.tables.find(t => t.seats.includes(ownSeat));
      if (!ownSeat || ownSeat.playerId !== p.id || !ownTable) throw Error('Chỗ ngồi của bạn không còn được giữ.');
      if ((seatId && seatId !== ownSeat.id) || (tableId && tableId !== ownTable.id)) throw Error('Hãy đứng dậy khỏi chỗ hiện tại trước nhé.');
      return { seatId: ownSeat.id, tableId: ownTable.id, restaurant: view(state), shop: repos.shop.state(p.id, progression.keys().daily) };
    }
    let chair = seatId ? seatFor(state, seatId) : null;
    const table = seatId ? state.tables.find(t => t.seats.includes(chair)) : findTable(state, tableId);
    if (!table) throw Error('KhÃ´ng tÃ¬m tháº¥y bÃ n nÃ y.');
    if (seatId) {
      const object = world.object(p.sceneId, seatId);
      if (!object || object.action !== 'restaurantSeat' || !chair) throw Error('KhÃ´ng tÃ¬m tháº¥y chỗ ngồi này.');
      if (Math.hypot(p.x - object.x, p.y - object.y) > object.radius + 35) throw Error('HÃ£y Ä‘áº¿n sÃ¡t gháº¿ trá»‘ng.');
    } else {
      const spec = tableSpecs.find(t => t.id === table.id);
      if (!spec || Math.hypot(p.x - spec.x, p.y - spec.y) > 165) throw Error('HÃ£y Ä‘áº¿n sÃ¡t bÃ n Äƒn.');
      const available = table.seats.filter(s => !s.playerId);
      chair = available[Math.floor(Math.random() * available.length)];
    }
    if (p.restaurantSeat && (!chair || p.restaurantSeat !== chair.id)) throw Error('Hãy đứng dậy khỏi chỗ hiện tại trước nhé.');
    if (!chair) throw Error('BÃ n Ä‘Ã£ háº¿t chỗ. Chờ một chút hoặc chọn bàn khác nhé.');
    if (chair.playerId && chair.playerId !== p.id) throw Error(table.seats.every(s => s.playerId) ? 'BÃ n Ä‘Ã£ háº¿t chỗ. Chờ một chút hoặc chọn bàn khác nhé.' : 'Ghế này đã có khách. Hãy chọn ghế còn trống hoặc chạm vào bàn để chọn chỗ ngẫu nhiên.');
    if (table.cleaning || table.cleanQueued) throw Error('Cô Hạnh đang dọn bàn này. Chờ cô một chút nhé.');
    chair.playerId = p.id; chair.name = p.name;
    p.restaurantSeat = chair.id; Object.assign(p, { state: 'sit', direction: 'down', actionAt: Date.now(), moved: false, dirty: true });
    ctx.io?.to(sceneChannel(p.room, p.sceneId)).emit('player:action', { id: p.id, action: 'sit', at: p.actionAt, direction: 'down' });
    publish(state);
    return { seatId: chair.id, tableId: table.id, restaurant: view(state), shop: repos.shop.state(p.id, progression.keys().daily) };
  }

  function order(p, seatId, sku, requestId) {
    if (p.sceneId !== 'gate' || p.restaurantSeat !== seatId) throw Error('Ngá»“i vÃ o gháº¿ trÆ°á»›c khi gá»i mÃ³n nhÃ©.');
    const food = RESTAURANT_MENU[sku];
    if (!food) throw Error('MÃ³n nÃ y khÃ´ng cÃ³ trong thá»±c Ä‘Æ¡n.');
    if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw Error('MÃ£ gá»i mÃ³n khÃ´ng há»£p lá»‡.');
    const state = ensure(p.room), chair = seatFor(state, seatId), table = chair && findTable(state, state.tables.find(t => t.seats.includes(chair))?.id);
    if (!chair || chair.playerId !== p.id || !table) throw Error('Chỗ ngồi của bạn không còn được giữ.');
    if (chair.lastOrderId === requestId) return { restaurant: view(state), shop: repos.shop.state(p.id, progression.keys().daily) };
    if (chair.order) throw Error('Món trước của bạn chưa dùng xong.');
    if (table.cleaning || table.cleanQueued) throw Error('Cô Hạnh đang dọn bàn này.');
    const shop = repos.shop.charge(p.id, food.price, progression.keys().daily);
    chair.lastOrderId = requestId; chair.order = { sku, name: food.name, status: 'queued', requestId };
    state.queue.push({ type: 'order', tableId: table.id, seatId, requestId }); runNext(state); publish(state);
    return { restaurant: view(state), shop };
  }

  function eat(p, seatId) {
    if (p.sceneId !== 'gate' || p.restaurantSeat !== seatId) throw Error('HÃ£y ngá»“i láº¡i bÃ n trÆ°á»›c.');
    const state = ensure(p.room), chair = seatFor(state, seatId);
    if (!chair || chair.playerId !== p.id || chair.order?.status !== 'served') throw Error('MÃ³n Äƒn chÆ°a Ä‘Æ°á»£c mang ra.');
    chair.order = null; publish(state); return { restaurant: view(state) };
  }

  function leave(p) {
    if (!p?.restaurantSeat) return null;
    const seatId = p.restaurantSeat, state = states.get(p.room), chair = state && seatFor(state, seatId);
    if (chair?.playerId === p.id) {
      const table = state.tables.find(t => t.seats.includes(chair)); chair.playerId = null; chair.name = null;
      if (!chair.order || chair.order.status === 'served') chair.order = null;
      enqueueClean(state, table); publish(state); runNext(state);
    }
    p.restaurantSeat = null;
    if (p.state === 'sit') { p.state = 'idle'; p.actionAt = Date.now(); }
    p.dirty = true;
    if (p.room && p.sceneId === 'gate') ctx.io?.to(sceneChannel(p.room, p.sceneId)).emit('player:action', { id: p.id, action: p.state, at: p.actionAt, direction: p.direction });
    return state ? view(state) : null;
  }

  function snapshot(room) { return view(ensure(room)); }
  function roomEmpty(room) {
    if (rooms.get(room)?.players.size) return;
    const state = states.get(room); if (!state) return;
    state.cancelled = true; states.delete(room);
    // Timers check state identity before changing or broadcasting room state.
  }
  function close() { for (const timer of timers) clearTimeout(timer); timers.clear(); states.clear(); }
  return { snapshot, seat, order, eat, leave, roomEmpty, close };
}
