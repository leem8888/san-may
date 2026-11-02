import { stateKey } from './worldState.js';
import { ROLE_TASKS } from './coopActivities.js';

// Shared work that changes the world for everyone in the room. Each map object with `action: "restore"` names its
// project (`restore`, default "garden") and, for multi-part projects, an `op`. Every contribution is validated here.

// ── Long-term chain A: the forgotten garden in the north of the Zen Garden (persists). ──
export const GARDEN_STAGES = [
  { name: 'Vườn hoang', verb: 'clear', task: 'Dọn cỏ dại và cành khô', need: 6, cooldown: 4000, done: 'Bạn nhổ một khóm cỏ dại, gom cành khô vào sọt.' },
  { name: 'Vườn đã dọn', verb: 'plant', task: 'Gieo hạt giống', need: 3, cooldown: 4000, requires: 'lam.seed', missing: 'Bác Lâm dặn phải có hạt giống tìm ở Rừng Trúc mới gieo được.', done: 'Bạn vùi một hạt giống xuống lớp đất tơi.' },
  { name: 'Vườn có cây non', verb: 'water', task: 'Tưới cây non', need: 4, cooldown: 8000, done: 'Nước thấm xuống, lá non khẽ rung.' },
  { name: 'Vườn nở hoa', verb: 'decorate', task: 'Đặt đèn đá và ghế nghỉ', need: 2, cooldown: 6000, done: 'Bạn kê ngay ngắn một chiếc đèn đá bên lối đi.' },
  { name: 'Vườn hoàn chỉnh', verb: null, task: null },
];
export const gardenKey = room => stateKey('room', room, 'zenGarden', 'oldGarden', 'restoration');
// Working together (a "Cùng làm vườn" session) doubles each turn while the partner is nearby and busy too.
export const TOGETHER_MS = 30_000;

// ── In-session change: the courtyard (DIRTY → CLEANING → CLEAN → DECORATED). It lasts while people are around:
// two hours after the last change the leaves have fallen again. ──
export const YARD_STAGES = ['Sân đầy lá', 'Đang quét dọn', 'Sân sạch', 'Sân đã trang trí'];
export const YARD = { piles: ['pile1', 'pile2', 'pile3', 'pile4', 'pile5', 'pile6'], spots: ['decorLeft', 'decorRight'], ttlMs: 2 * 3600_000, cooldown: 1500 };
export const yardKey = room => stateKey('room', room, 'courtyard', 'yard', 'restoration');
const AN_QUIPS = { sweep: 'Nhát chổi đều quá!', collect: 'Để mình giữ xe cho!', wipe: 'Bể nước sáng như gương!', decorate: 'Đẹp quá đi!', light: 'Đèn sáng rồi!' };
const emptyYard = () => ({ stage: 0, swept: [], collected: false, wiped: false, decorated: [], lit: false, helpers: [] });
export function yardStage(v) {
  if (v.decorated.length >= YARD.spots.length) return 3;
  if (v.swept.length >= YARD.piles.length && v.collected && v.wiped) return 2;
  return v.swept.length || v.wiped ? 1 : 0;
}

export function createWorldActions(ctx) {
  const { worldState, repos, progression } = ctx;

  function garden(p, object, now) {
    const current = worldState.value(gardenKey(p.room)) || { stage: 0, work: 0, helpers: [] }, stage = GARDEN_STAGES[current.stage];
    if (!stage.verb) return { stage: current.stage, finished: true, message: 'Góc vườn đã hoàn chỉnh. Hãy ngồi lại ngắm một chút.' };
    const session = ctx.coop?.sessionOf(p.id), together = session?.status === 'active' && session.kind === 'garden' ? session : null;
    const partnerId = together && (together.hostId === p.id ? together.guestId : together.hostId), partner = partnerId && ctx.rooms.findPlayer(partnerId);
    if (stage.requires && !repos.narrative.flags(p.id)[stage.requires] && !(partnerId && repos.narrative.flags(partnerId)[stage.requires])) throw Error(stage.missing);
    if (now - (p.lastRestoreAt || 0) < stage.cooldown) throw Error('Thong thả thôi, làm từng chút một.');
    p.lastRestoreAt = now;
    const partnerBusy = Boolean(partner && partner.sceneId === p.sceneId && Math.hypot(partner.x - object.x, partner.y - object.y) <= object.radius + 80 && now - (together.data.lastWork[partnerId] || 0) <= TOGETHER_MS);
    const amount = partnerBusy ? 2 : 1;
    // Atomic: two people working at the same moment both count, and the stage only advances once.
    const record = worldState.update(gardenKey(p.room), value => {
      const v = value || { stage: 0, work: 0, helpers: [] };
      if (v.stage !== current.stage) return undefined; // someone else finished this stage a moment ago
      const work = v.work + amount, helpers = [...new Set([p.name, ...v.helpers])].slice(0, 8);
      return work >= stage.need ? { stage: v.stage + 1, work: 0, helpers } : { stage: v.stage, work, helpers };
    });
    const advanced = record.value.stage > current.stage, task = together ? ROLE_TASKS[current.stage][p.id === together.hostId ? 0 : 1] : stage.task;
    progression.journal(p.id, advanced ? `Góc vườn cũ đã thành “${GARDEN_STAGES[record.value.stage].name}” — có công của bạn.` : `Góp tay khôi phục góc vườn cũ: ${task.toLowerCase()}.`, now);
    repos.narrative.addActivity(p.id, 'gardener', 'oldGarden', 5); // only counts once the player has met Bác Lâm
    if (together) {
      together.data.lastWork[p.id] = now;
      together.data.contributions[p.id] = (together.data.contributions[p.id] || 0) + 1;
      if (advanced) {
        together.data.advances.push(GARDEN_STAGES[record.value.stage].name);
        for (const id of [p.id, partnerId]) progression.unlock(id, 'coop-garden', now);
      }
      ctx.coop.refresh(together);
    }
    const done = together ? `${task}${partnerBusy ? ' — cùng làm nên được tính gấp đôi' : ''}.` : stage.done;
    return { stage: record.value.stage, work: record.value.work, need: GARDEN_STAGES[record.value.stage].need || 0, advanced, together: Boolean(together), doubled: partnerBusy, message: advanced ? `${done} Góc vườn chuyển sang: ${GARDEN_STAGES[record.value.stage].name}!` : `${done} (${record.value.work}/${stage.need})` };
  }

  // Each courtyard op checks the stage it belongs to; the update is atomic, so two people sweeping the same pile at
  // the same moment count it once.
  function courtyard(p, object, now) {
    if (now - (p.lastYardAt || 0) < YARD.cooldown) throw Error('Thong thả thôi, quét từng nhát một.');
    const op = object.op;
    let message = null, from = 0;
    const record = worldState.update(yardKey(p.room), value => {
      const v = { ...emptyYard(), ...value };
      const before = from = yardStage(v);
      if (op === 'sweep') {
        if (v.swept.includes(object.id)) throw Error('Chỗ này đã sạch lá rồi.');
        v.swept = [...v.swept, object.id]; message = `Bạn quét gọn đống lá. (${v.swept.length}/${YARD.piles.length})`;
      } else if (op === 'collect') {
        if (v.swept.length < YARD.piles.length) throw Error(`Hãy quét hết các đống lá trước (${v.swept.length}/${YARD.piles.length}).`);
        if (v.collected) throw Error('Lá đã được gom vào xe rồi.');
        v.collected = true; message = 'Bạn gom lá vào xe cút kít, đẩy ra góc vườn ủ phân.';
      } else if (op === 'wipe') {
        if (v.wiped) throw Error('Bảng lời chúc đã sạch bóng.');
        v.wiped = true; message = 'Bạn lau sạch bụi trên bảng lời chúc.';
      } else if (op === 'decorate') {
        if (before < 2) throw Error('Sân còn lá. Quét dọn, gom lá và lau bảng xong rồi mới trang trí.');
        if (v.decorated.includes(object.id)) throw Error('Chỗ này đã được trang trí.');
        v.decorated = [...v.decorated, object.id]; message = object.id === 'decorLeft' ? 'Bạn đặt chậu cúc vàng và treo đèn lồng.' : 'Bạn đặt chậu sen đá và treo đèn lồng.';
      } else if (op === 'light') {
        if (before < 3) throw Error('Dây đèn chỉ thắp được khi sân đã trang trí.');
        v.lit = !v.lit; message = v.lit ? 'Dây đèn lồng sáng lên khắp sân.' : 'Bạn tắt dây đèn lồng.';
      } else throw Error('Ở đây không có việc gì để làm.');
      v.helpers = [...new Set([p.name, ...v.helpers])].slice(0, 8);
      v.stage = yardStage(v);
      return v;
    }, { ttlMs: YARD.ttlMs });
    p.lastYardAt = now;
    const stage = record.value.stage;
    if (op !== 'light') progression.journal(p.id, `Dọn dẹp sân chùa: ${message.replace(/ \(\d+\/\d+\)$/, '').toLowerCase()}`, now);
    // An reacts when the work happens near wherever the temple routine has put An right now.
    const an = ctx.npcDirector?.stateAt('novice', now);
    const quip = an?.sceneId === 'courtyard' && Math.hypot(an.x - p.x, an.y - p.y) < 420 ? AN_QUIPS[op] : null;
    return { stage, stageName: YARD_STAGES[stage], advanced: stage > from, npc: quip ? { id: 'novice', text: quip } : null, message: `${stage > from ? `${message} Sân chùa: ${YARD_STAGES[stage]}!` : message}${quip ? ` An reo: “${quip}”` : ''}` };
  }

  return {
    restore(p, object, now = Date.now()) {
      if (!object || object.action !== 'restore') throw Error('Ở đây không có việc gì để làm.');
      if (Math.hypot(p.x - object.x, p.y - object.y) > object.radius + 40) throw Error('Hãy đến gần hơn.');
      return (object.restore === 'courtyard' ? courtyard : garden)(p, object, now);
    },
  };
}
