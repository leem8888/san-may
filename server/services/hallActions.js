import { stateKey } from './worldState.js';

// Main Hall rituals that leave a trace everyone in the room can see: flowers on the offering table and candles on
// the rack (both room state, timed by the server clock), plus short reflections read in private.
export const FLOWERS = { sen: 'hoa sen', cuc: 'hoa cúc vàng', lan: 'hoa lan trắng', hue: 'hoa huệ' };
export const CANDLES = { slots: 9, burnMs: 15 * 60_000, clearMs: 20 * 60_000 };
// Short reflections written for this game (not quotations from any scripture).
export const REFLECTIONS = [
  'Hơi thở này không cần đi đâu cả. Nó chỉ cần được biết đến.',
  'Một bông hoa dâng lên không làm tượng Phật đẹp hơn; nó làm lòng người dâng nhẹ hơn.',
  'Khi quét sân, chỉ quét sân. Lá rơi tiếp cũng không sao.',
  'Ánh sáng nhỏ vẫn là ánh sáng. Một ngọn đèn đủ soi một bước chân.',
  'Điều mình mang vào Chánh Điện, mình cũng có thể đặt xuống ở đây.',
  'Chậm lại một chút không làm mình đến muộn hơn với chính mình.',
];
const COOLDOWN = { flower: 2_000, offer: 20_000, candle: 8_000, reflect: 3_000 };
export const HOLD_MS = 3 * 60_000;
const PREPARE = ['hall.flower', 'hall.candle', 'hall.reflect'];
export const flowerKey = room => stateKey('room', room, 'mainHall', 'flowerTable', 'vases');
export const candleKey = room => stateKey('room', room, 'mainHall', 'candleRack', 'candles');
export const candleState = (slot, now) => !slot ? 'off' : now - slot.litAt < CANDLES.burnMs ? 'burning' : now - slot.litAt < CANDLES.clearMs ? 'burnt' : 'off';

export function createHallActions(ctx) {
  const { worldState, repos, progression } = ctx;
  function mark(p, flag, now) {
    repos.narrative.setFlag(p.id, flag, true, now);
    const flags = repos.narrative.flags(p.id);
    // Preparing the hall for the journey: any two of the three gestures.
    if (!flags['hall.prepared'] && PREPARE.filter(f => flags[f]).length >= 2) repos.narrative.setFlag(p.id, 'hall.prepared', true, now);
  }
  return {
    act(p, object, choice, now = Date.now()) {
      if (!object || object.action !== 'hall') throw Error('Ở đây không có việc gì để làm.');
      if (p.sceneId !== 'mainHall' || Math.hypot(p.x - object.x, p.y - object.y) > object.radius + 40) throw Error('Hãy đến gần hơn.');
      const op = object.op;
      p.hallAt ||= {};
      if (op === 'offer' && !(p.holding && now - p.holding.at < HOLD_MS)) throw Error('Hãy lấy hoa ở bàn hoa trước.');
      if (now - (p.hallAt[op] || 0) < COOLDOWN[op]) throw Error('Thong thả một chút nhé.');
      if (op === 'flower') {
        const name = FLOWERS[choice];
        if (!name) throw Error('Hãy chọn một loại hoa.');
        p.hallAt[op] = now; p.holding = { kind: choice, at: now };
        return { holding: choice, message: `Bạn cầm một nhành ${name}. Hãy mang tới bàn thờ.` };
      }
      if (op === 'offer') {
        const held = p.holding && now - p.holding.at < HOLD_MS ? p.holding : null;
        if (!held) throw Error('Hãy lấy hoa ở bàn hoa trước.');
        worldState.update(flowerKey(p.room), value => ({ flowers: [...(value?.flowers || []).filter(f => now - f.at < 6 * 3600_000), { kind: held.kind, at: now }].slice(-8) }));
        p.hallAt[op] = now; p.holding = null; mark(p, 'hall.flower', now);
        progression.journal(p.id, `Dâng ${FLOWERS[held.kind]} trong Chánh Điện.`, now);
        const abbot = ctx.world.object('mainHall', 'abbot'), near = abbot && Math.hypot(abbot.x - p.x, abbot.y - p.y) < 380;
        return { holding: null, npc: near ? { id: 'abbot', text: 'Hoa đẹp lắm con. Lòng thành là đủ.' } : null, message: `Bạn đặt ${FLOWERS[held.kind]} vào bình trên bàn thờ. Hương hoa thoang thoảng.`, story: { type: 'interact', object: 'flowerTable', scene: 'mainHall', verb: 'flower' } };
      }
      if (op === 'candle') {
        let message = null;
        worldState.update(candleKey(p.room), value => {
          const slots = Array.from({ length: CANDLES.slots }, (_, i) => value?.slots?.[i] || null).map(s => candleState(s, now) === 'off' ? null : s);
          if (choice === 'snuff') {
            const mine = slots.map((s, i) => [s, i]).filter(([s]) => s?.by === p.id && candleState(s, now) === 'burning').sort((a, b) => b[0].litAt - a[0].litAt)[0];
            if (!mine) throw Error('Bạn không có ngọn nến nào đang cháy.');
            slots[mine[1]] = null; message = 'Bạn khẽ dập ngọn nến của mình. Một làn khói mảnh bay lên.';
            return { slots };
          }
          // "light:3" lights that slot; plain "light" takes the first free one.
          const asked = /^light:\d$/.test(choice || '') ? Number(choice.slice(6)) : null;
          const free = asked !== null ? (asked < CANDLES.slots && !slots[asked] ? asked : -2) : slots.findIndex(s => !s);
          if (free === -2) throw Error('Chỗ này đang có nến. Hãy chọn một chỗ trống.');
          if (free < 0) throw Error('Giá nến đã kín. Đợi một ngọn cháy hết rồi thắp nhé.');
          slots[free] = { litAt: now, by: p.id }; message = 'Bạn thắp một ngọn nến. Ngọn lửa nhỏ lay lay rồi đứng yên.';
          return { slots };
        });
        p.hallAt[op] = now;
        if (choice !== 'snuff') { mark(p, 'hall.candle', now); progression.journal(p.id, 'Thắp một ngọn nến trong Chánh Điện.', now); }
        return { message, story: { type: 'interact', object: 'candleRack', scene: 'mainHall', verb: choice === 'snuff' ? 'snuff' : 'light' } };
      }
      if (op === 'reflect') {
        p.hallAt[op] = now;
        const text = REFLECTIONS[Math.floor(Math.random() * REFLECTIONS.length)];
        mark(p, 'hall.reflect', now);
        return { message: text, reflection: text, story: { type: 'interact', object: 'reflectStand', scene: 'mainHall', verb: 'reflect' } };
      }
      throw Error('Ở đây không có việc gì để làm.');
    },
  };
}
