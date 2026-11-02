import { stateKey } from './worldState.js';
import { near } from './coop.js';
import fs from 'node:fs';
import path from 'node:path';
import { PUBLIC_DIR } from '../config/index.js';
import { passages } from '../../public/js/shared/reading.js';

const READING = new Map(JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'data', 'stories.json'), 'utf8')).items.map(i => [i.id, i]));

// The cooperative activities. Each one owns its steps and checks who may do what, where and when; the session
// manager (coop.js) owns invitations, readiness, disconnects and persistence.
export const TEAS = [{ id: 'sen', name: 'trà sen' }, { id: 'nhai', name: 'trà nhài' }, { id: 'olong', name: 'trà ô long' }, { id: 'xanh', name: 'trà xanh' }];
export const TOPICS = [
  'Điều nhỏ nào hôm nay làm bạn mỉm cười?', 'Nơi nào bạn thấy bình yên nhất?', 'Mùi hương nào làm bạn nhớ nhà?',
  'Nếu được trồng một cây ở đây, bạn sẽ trồng cây gì?', 'Khi mệt, bạn thường làm gì để nghỉ ngơi?', 'Có ai bạn muốn nói lời cảm ơn không?',
  'Âm thanh nào bạn thích nghe nhất lúc chiều về?', 'Một thói quen nhỏ bạn muốn giữ lâu dài?',
];
export const COOP_MINUTES = [3, 5, 10, 15];
// Shared bell: three slow breaths, then strike together inside a generous window. Missing it just waits for the
// next cycle; there is no score and nothing to mash.
export const BELL = { breath: 4000, breaths: 3, gap: 3000, window: 1500, lead: 1500 };
export const bellCycle = () => BELL.breath * BELL.breaths + BELL.gap;
export const bellStrikeAt = (firstStart, k) => firstStart + k * bellCycle() + BELL.breath * BELL.breaths;
export const ROLE_TASKS = [['Nhổ cỏ dại', 'Gom cành khô'], ['Xới đất', 'Gieo hạt'], ['Xách nước', 'Tưới gốc'], ['Đặt đèn đá', 'Kê ghế nghỉ']];
// Symbol puzzle: the library scroll describes the order by qualities, the bell-tower stone shows which symbols are
// carved. Either half alone is ambiguous; together they give exactly one answer.
export const SYMBOLS = {
  sen: { name: 'Hoa sen', props: ['hoa', 'nuoc'] }, trang: { name: 'Vầng trăng', props: ['dem', 'troi'] }, may: { name: 'Áng mây', props: ['troi', 'troiNuoc'] },
  truc: { name: 'Cây trúc', props: ['cay', 'gio'] }, song: { name: 'Con sóng', props: ['nuoc', 'troiNuoc', 'gio'] },
};
export const LAMP_MARKS = ['sen', 'trang', 'may', 'song'];
const PHRASES = { hoa: 'thứ nở lên từ bùn', nuoc: 'thứ thuộc về nước', dem: 'thứ chỉ sáng rõ lúc đêm', troi: 'thứ ở trên trời cao', troiNuoc: 'thứ cứ trôi mãi không dừng', cay: 'thứ mọc thẳng lên', gio: 'thứ reo lên khi gió qua' };
const ORDINAL = ['thứ nhất', 'thứ hai', 'thứ ba'];
const DIAL_WINDOW = { pair: 12_000, solo: 40_000 };
const shuffle = (list, random) => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function makeSecret(random = Math.random) {
  const ids = Object.keys(SYMBOLS);
  for (;;) {
    const order = shuffle(ids, random).slice(0, 3), hints = [];
    for (const id of order) {
      const own = SYMBOLS[id].props.filter(prop => order.every(other => other === id || !SYMBOLS[other].props.includes(prop)));
      if (!own.length) break;
      // Prefer a quality that also fits a symbol outside the three, so the scroll alone is not enough.
      const shared = own.filter(prop => ids.some(other => !order.includes(other) && SYMBOLS[other].props.includes(prop)));
      hints.push((shared.length ? shared : own)[Math.floor(random() * (shared.length ? shared : own).length)]);
    }
    if (hints.length === 3 && hints.some(prop => ids.filter(id => SYMBOLS[id].props.includes(prop)).length > 1)) return { order, hints, carved: shuffle(order, random) };
  }
}

const nearOrFail = (s, p, world, fail, objectId = s.objectId, sceneId = s.sceneId, message) => { if (!near(p, world, sceneId, objectId)) fail(message || 'Hãy đến đúng chỗ trước đã.'); };
const sameArea = (p, target, { fail }) => { if (!target) return; if (p.sceneId !== target.sceneId || Math.hypot(p.x - target.x, p.y - target.y) > 260) fail(`Hãy đứng gần ${target.name} hơn.`); };

export const ACTIVITIES = {
  tea: {
    title: 'Thưởng trà hai người', place: 'bàn trà đôi ở Vườn Thiền', scene: 'zenGarden', object: 'teaForTwo', stay: true, achievement: 'coop-tea', moment: 'steam',
    roles: { host: 'Người pha trà', guest: 'Người bày chén' },
    gatherGuide: () => 'Đến bàn trà đôi ở Vườn Thiền, ngồi vào một bên rồi bấm “Sẵn sàng”.',
    checkReady(s, p, o, { world, fail }) { nearOrFail(s, p, world, fail, undefined, undefined, 'Hãy ngồi vào bàn trà đôi ở Vườn Thiền trước.'); },
    start(s, ctx) { s.step = 'choose'; Object.assign(s.data, { tea: null, sipped: {}, topics: shuffle(TOPICS, Math.random).slice(0, 3), topic: null, pourAt: null }); },
    guide(s, id) {
      const host = id === s.hostId, partner = s.names[host ? s.guestId : s.hostId];
      return {
        choose: host ? 'Chọn loại trà để pha.' : `${partner} đang chọn trà. Hít một hơi, nhìn hơi nước bốc lên.`,
        cups: host ? `${partner} đang bày chén.` : 'Bày hai chén ra bàn, tráng qua nước nóng.',
        pour: host ? 'Chén đã sẵn. Rót trà cho cả hai.' : `${partner} đang rót trà. Mùi ${s.data.tea?.name || 'trà'} lan ra.`,
        sip: s.data.sipped[id] ? `Đợi ${partner} cùng nâng chén.` : 'Nâng chén, nhấp một ngụm thật chậm.',
        talk: s.data.topic ? `Chủ đề: “${s.data.topic}” — trò chuyện bằng khung chat, xong thì bấm “Đặt chén xuống”.` : 'Chọn một chủ đề để trò chuyện, hoặc cứ ngồi yên rồi đặt chén xuống.',
      }[s.step];
    },
    actions(s, id) {
      const host = id === s.hostId;
      if (s.step === 'choose') return host ? TEAS.map(t => ({ id: 'choose', label: t.name[0].toUpperCase() + t.name.slice(1), payload: { tea: t.id } })) : [];
      if (s.step === 'cups') return host ? [] : [{ id: 'cups', label: 'Bày chén' }];
      if (s.step === 'pour') return host ? [{ id: 'pour', label: 'Rót trà' }] : [];
      if (s.step === 'sip') return s.data.sipped[id] ? [] : [{ id: 'sip', label: 'Nâng chén' }];
      return [...(s.data.topic ? [] : s.data.topics.map((t, i) => ({ id: 'topic', label: t, payload: { index: i } }))), { id: 'finish', label: 'Đặt chén xuống' }];
    },
    act(s, p, action, payload, ctx) {
      const host = p.id === s.hostId, { fail } = ctx;
      nearOrFail(s, p, ctx.world, fail, undefined, undefined, 'Hãy ngồi lại bàn trà.');
      const expect = { choose: ['choose', true], cups: ['cups', false], pour: ['pour', true] }[s.step];
      if (expect) {
        if (action !== expect[0]) fail('Chưa tới bước này.');
        if (expect[1] !== host) fail(`Bước này là của ${s.names[expect[1] ? s.hostId : s.guestId]}.`);
      }
      if (s.step === 'choose') { const tea = TEAS.find(t => t.id === payload.tea); if (!tea) fail('Hãy chọn một loại trà.'); s.data.tea = tea; s.step = 'cups'; return { message: `Bạn chọn ${tea.name}. Nước reo trong ấm.` }; }
      if (s.step === 'cups') { s.step = 'pour'; return { message: 'Hai chén men xanh đã được bày ra.' }; }
      if (s.step === 'pour') { s.data.pourAt = ctx.now; s.step = 'sip'; ctx.hooks.setAction?.(p, 'interact'); return { message: 'Dòng trà rót xuống, hơi nước bốc lên.' }; }
      if (s.step === 'sip') {
        if (action !== 'sip') fail('Chưa tới bước này.');
        if (s.data.sipped[p.id]) fail('Bạn đã nâng chén rồi.');
        s.data.sipped[p.id] = true; ctx.hooks.setAction?.(p, 'interact');
        if (Object.keys(s.data.sipped).length === 2) s.step = 'talk';
        return { message: 'Vị trà ấm lan dần.' };
      }
      if (action === 'topic') { const topic = s.data.topics[Number(payload.index)]; if (!topic || s.data.topic) fail('Không chọn được chủ đề này.'); s.data.topic = topic; return { message: 'Chủ đề đã hiện cho cả hai.' }; }
      if (action === 'finish') { ctx.complete({ tea: s.data.tea.id, topic: s.data.topic }); return { message: 'Hai chén trà được đặt xuống.' }; }
      fail('Chưa tới bước này.');
    },
    view: s => ({ tea: s.data.tea?.name || null, topic: s.data.topic, sipped: Object.keys(s.data.sipped || {}).length }),
    publicView: s => ({ kind: 'tea', step: s.status === 'active' ? s.step : 'gathering', tea: s.data.tea?.id || null, pourAt: s.data.pourAt || null, names: Object.values(s.names) }),
    memory: (s, id) => `Thưởng ${s.data.tea?.name || 'trà'} cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]} bên bàn trà đôi ở Vườn Thiền.${s.data.topic ? ` Chuyện trò: “${s.data.topic}”` : ''}`,
  },

  meditate: {
    title: 'Thiền chung', place: 'bồ đoàn ở Vườn Thiền hoặc Chánh Điện', scene: null, object: null, stay: true, achievement: 'coop-meditation', moment: 'fireflies',
    roles: { host: 'Người mời', guest: 'Bạn đồng tu' },
    inviteNote: s => `Đề nghị ${s.data.options.minutes} phút`,
    cleanOptions: o => ({ minutes: COOP_MINUTES.includes(o.minutes) ? o.minutes : 5 }),
    gatherGuide: () => 'Ngồi lên một bồ đoàn ở Vườn Thiền hoặc Chánh Điện, chọn thời lượng chung rồi bấm “Sẵn sàng”. Hai người cần chọn cùng một thời lượng và ở cùng một khu.',
    agreePlace: true,
    options: (s, id) => ({ minutes: COOP_MINUTES, proposed: s.data.options.minutes, mine: s.ready[id]?.minutes || null, partner: s.ready[id === s.hostId ? s.guestId : s.hostId]?.minutes || null }),
    checkReady(s, p, o, { world, fail }) {
      const cushions = (world.map(p.sceneId)?.objects || []).filter(o => o.action === 'meditate' && ['zenGarden', 'mainHall'].includes(p.sceneId));
      if (!cushions.some(o => near(p, world, p.sceneId, o.id, 40))) fail('Hãy ngồi lên một bồ đoàn ở Vườn Thiền hoặc Chánh Điện trước.');
      if (!COOP_MINUTES.includes(o.minutes)) fail('Hãy chọn thời lượng 3, 5, 10 hoặc 15 phút.');
      if (p.meditation) fail('Bạn đang thiền một mình. Hãy kết thúc phiên đó trước.');
    },
    readyValue: o => ({ minutes: o.minutes }),
    agree(s) { const [a, b] = [s.ready[s.hostId].minutes, s.ready[s.guestId].minutes]; if (a !== b) { delete s.ready[s.guestId]; delete s.ready[s.hostId]; return `Hai bạn chọn ${a} và ${b} phút. Hãy cùng chọn một thời lượng.`; } return null; },
    start(s, ctx) {
      const minutes = s.ready[s.hostId]?.minutes || Object.values(s.ready)[0]?.minutes || s.data.options.minutes;
      s.step = 'sitting'; Object.assign(s.data, { minutes, place: s.sceneId, startedAt: ctx.now, endsAt: ctx.now + minutes * 60_000 });
      for (const id of ctx.participants) ctx.hooks.startMeditation?.(ctx.live(id), minutes, ctx.now);
    },
    guide: s => `Cùng ngồi yên ${s.data.minutes} phút. Hơi thở của hai người hiện thành vòng sáng nhẹ. Có thể rời bất cứ lúc nào.`,
    actions: () => [],
    act(s, p, action, payload, { fail }) { fail('Chỉ cần ngồi yên thôi.'); },
    tick(s, ctx, now) {
      if (now < s.data.endsAt) return;
      s.data.ending = true;
      for (const id of ctx.participants) ctx.hooks.endMeditation?.(id, s.data.endsAt);
      ctx.complete({ minutes: s.data.minutes });
    },
    onLeave(s, id, ctx) { ctx.hooks.endMeditation?.(id); },
    view: s => ({ minutes: s.data.minutes || s.data.options.minutes, startedAt: s.data.startedAt || null, endsAt: s.data.endsAt || null }),
    publicView: s => ({ kind: 'meditate', step: s.status === 'active' ? 'sitting' : 'gathering', startedAt: s.data.startedAt || null, names: Object.values(s.names) }),
    memory: (s, id) => `Thiền chung ${s.data.minutes} phút cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]}${s.data.place === 'mainHall' ? ' trong Chánh Điện' : ' ở Vườn Thiền'}. Đom đóm bay lên khi hai người mở mắt.`,
  },

  bell: {
    title: 'Cùng thỉnh chuông', place: 'đại hồng chung ở Tháp Chuông', scene: 'bellTower', object: 'bigBell', stay: true, achievement: 'coop-bell', moment: 'bell',
    roles: { host: 'Người chuẩn bị', guest: 'Người xác nhận' },
    gatherGuide: () => 'Đến gần đại hồng chung ở Tháp Chuông rồi bấm “Sẵn sàng”.',
    checkReady(s, p, o, { world, fail }) { nearOrFail(s, p, world, fail, undefined, undefined, 'Hãy đến gần đại hồng chung trước.'); },
    start(s) { s.step = 'prepare'; Object.assign(s.data, { firstStart: null, struck: {} }); },
    guide(s, id) {
      const host = id === s.hostId, partner = s.names[host ? s.guestId : s.hostId];
      if (s.step === 'prepare') return host ? 'Kéo chày lùi lại, chuẩn bị.' : `${partner} đang kéo chày lùi lại.`;
      if (s.step === 'confirm') return host ? `Đợi ${partner} xác nhận.` : 'Chày đã sẵn. Gật đầu xác nhận khi bạn sẵn sàng.';
      return 'Thở cùng nhau theo vòng sáng: ba hơi chậm. Khi vòng sáng chuyển vàng, cùng bấm “Thỉnh”. Lỡ nhịp thì đợi vòng sau, không sao cả.';
    },
    actions(s, id) {
      if (s.step === 'prepare') return id === s.hostId ? [{ id: 'prepare', label: 'Kéo chày' }] : [];
      if (s.step === 'confirm') return id === s.guestId ? [{ id: 'confirm', label: 'Xác nhận' }] : [];
      return [{ id: 'strike', label: 'Thỉnh' }];
    },
    act(s, p, action, payload, ctx) {
      const { fail, now } = ctx;
      nearOrFail(s, p, ctx.world, fail, undefined, undefined, 'Hãy đứng gần chuông.');
      if (s.step === 'prepare') { if (action !== 'prepare' || p.id !== s.hostId) fail(`Bước này là của ${s.names[s.hostId]}.`); s.step = 'confirm'; return { message: 'Chày gỗ được kéo lùi lại.' }; }
      if (s.step === 'confirm') { if (action !== 'confirm' || p.id !== s.guestId) fail(`Bước này là của ${s.names[s.guestId]}.`); s.step = 'breathe'; s.data.firstStart = now + BELL.lead; return { message: 'Cùng thở nào.' }; }
      if (action !== 'strike') fail('Chưa tới bước này.');
      const k = Math.max(0, Math.round((now - bellStrikeAt(s.data.firstStart, 0)) / bellCycle())), at = bellStrikeAt(s.data.firstStart, k);
      if (Math.abs(now - at) > BELL.window) return { message: 'Chưa tới nhịp. Thở cùng nhau, chuông sẽ chờ.', early: true };
      const struck = (s.data.struck[k] ||= []);
      if (!struck.includes(p.id)) struck.push(p.id);
      if (struck.length < 2) return { message: `Đợi ${s.names[ctx.partnerOf(p.id)]} cùng thỉnh trong nhịp này.` };
      ctx.hooks.ringBell?.(s, ctx.participants.map(ctx.live).filter(Boolean));
      ctx.complete({ cycle: k });
      return { message: 'Chuông ngân. Hai nhịp thành một tiếng.' };
    },
    view: s => ({ firstStart: s.data.firstStart || null, cycle: bellCycle(), lead: BELL.lead, breath: BELL.breath, breaths: BELL.breaths, window: BELL.window }),
    publicView: s => ({ kind: 'bell', step: s.status === 'active' ? s.step : 'gathering', firstStart: s.data.firstStart || null, names: Object.values(s.names) }),
    memory: (s, id) => `Cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]} thỉnh đại hồng chung theo ba hơi thở.`,
  },

  garden: {
    title: 'Cùng làm vườn', place: 'góc vườn cũ ở Vườn Thiền', scene: 'zenGarden', object: 'oldGarden', stay: true, achievement: null, moment: 'petals',
    roles: { host: 'Người làm đất', guest: 'Người chăm cây' },
    gatherGuide: () => 'Đến góc vườn cũ phía bắc Vườn Thiền rồi bấm “Sẵn sàng”. Làm cùng nhau thì mỗi lượt được tính gấp đôi.',
    checkReady(s, p, o, { world, fail }) { nearOrFail(s, p, world, fail, undefined, undefined, 'Hãy đến góc vườn cũ trước.'); },
    start(s) { s.step = 'work'; Object.assign(s.data, { contributions: {}, lastWork: {}, advances: [] }); },
    task: (s, id, stage) => ROLE_TASKS[stage]?.[id === s.hostId ? 0 : 1] || null,
    guide(s, id) { return 'Bấm E ở góc vườn để làm phần việc của bạn. Cả hai cùng làm trong nửa phút thì mỗi lượt tính gấp đôi. Xong thì bấm “Nghỉ tay”.'; },
    actions: () => [{ id: 'finish', label: 'Nghỉ tay' }],
    act(s, p, action, payload, ctx) {
      if (action !== 'finish') ctx.fail('Hãy bấm E ở góc vườn để làm việc.');
      if (!Object.keys(s.data.contributions).length) { ctx.complete({ contributions: {} }); return { message: 'Hẹn hôm khác làm tiếp.' }; }
      ctx.complete({ contributions: s.data.contributions, advances: s.data.advances });
      return { message: 'Hai người nghỉ tay, ngắm lại góc vườn.' };
    },
    view: (s, id) => ({ contributions: s.data.contributions || {}, advances: s.data.advances || [] }),
    publicView: s => ({ kind: 'garden', step: s.status === 'active' ? 'work' : 'gathering', names: Object.values(s.names) }),
    memory(s, id) {
      const mine = s.data.contributions?.[id] || 0, partner = s.names[id === s.hostId ? s.guestId : s.hostId];
      if (!mine && !s.data.contributions?.[id === s.hostId ? s.guestId : s.hostId]) return null;
      return `Cùng ${partner} chăm góc vườn cũ: bạn góp ${mine} lượt${s.data.advances?.length ? `, vườn thành “${s.data.advances.at(-1)}”` : ''}.`;
    },
  },

  puzzle: {
    title: 'Câu đố ký hiệu', place: 'Thư Viện và Tháp Chuông', scene: null, object: null, solo: true, autoStart: true, achievement: 'coop-puzzle', moment: 'lanterns',
    roles: { host: 'Người tìm manh mối ở Thư Viện', guest: 'Người quan sát ở Tháp Chuông' },
    start(s, ctx) { s.step = 'search'; Object.assign(s.data, { secret: makeSecret(), read: {}, observed: {}, dials: {}, attempts: 0, startedAt: ctx.now, hintLevel: 0 }); },
    guide(s, id) {
      const solo = !s.guestId, d = s.data;
      if (solo) return 'Một mình thì đi cả hai nơi: đọc cuộn giấy trong Thư Viện, nhìn phiến đá ký hiệu ở Tháp Chuông, rồi xoay hai trụ đèn ký hiệu (trái và phải) ở Tháp Chuông cho đúng thứ tự trong vòng 40 giây.';
      const parts = [];
      parts.push(d.read[id] ? 'Bạn đã đọc cuộn giấy.' : d.observed[id] ? 'Bạn đã xem phiến đá.' : id === s.hostId ? 'Đến Thư Viện, đọc cuộn giấy trên giá.' : 'Đến Tháp Chuông, nhìn phiến đá ký hiệu.');
      parts.push('Kể cho nhau điều mình thấy (qua chat), rồi mỗi người đứng ở một trụ đèn ký hiệu ở Tháp Chuông, đặt cùng một thứ tự trong vòng 12 giây.');
      return parts.join(' ');
    },
    actions: (s, id) => [{ id: 'hint', label: 'Xin gợi ý' }],
    act(s, p, action, payload, ctx) {
      const d = s.data, { fail, world, now } = ctx, solo = !s.guestId;
      if (action === 'read') {
        nearOrFail(s, p, world, fail, 'clueScroll', 'library', 'Cuộn giấy ở trên giá trong Thư Viện.');
        d.read[p.id] = true;
        return { message: `Cuộn giấy ghi: “Thắp ba ký hiệu theo thứ tự: ${d.secret.hints.map((h, i) => `${ORDINAL[i]} là ${PHRASES[h]}`).join('; ')}.”`, private: true };
      }
      if (action === 'observe') {
        nearOrFail(s, p, world, fail, 'symbolStone', 'bellTower', 'Phiến đá ký hiệu ở Tháp Chuông.');
        d.observed[p.id] = true;
        return { message: `Nắng chiếu lên phiến đá, ba ký hiệu sáng lên: ${d.secret.carved.map(id => SYMBOLS[id].name).join(', ')}.`, private: true };
      }
      if (action === 'hint') {
        const elapsed = now - d.startedAt, level = Math.min(2, Math.max(d.hintLevel, d.attempts >= 2 ? 1 : 0, d.attempts >= 4 ? 2 : 0, elapsed > 5 * 60_000 ? 1 : 0));
        d.hintLevel = level;
        const sees = solo ? 'Hãy đọc cuộn giấy và xem phiến đá, mỗi thứ chỉ cho một nửa lời giải.' : 'Người ở Thư Viện biết thứ tự theo tính chất; người ở Tháp Chuông biết ba ký hiệu. Ghép hai nửa lại nhé.';
        const msg = level === 0 ? `An thì thầm: “${sees}”` : `An thì thầm: “Mình nhớ ký hiệu ${ORDINAL[0]} là ${SYMBOLS[d.secret.order[0]].name}${level === 2 ? `, ${ORDINAL[1]} là ${SYMBOLS[d.secret.order[1]].name}` : ''}.”`;
        return { message: msg, private: true };
      }
      if (action === 'set') {
        const dial = payload.dial === 'left' ? 'dialLeft' : payload.dial === 'right' ? 'dialRight' : null, order = Array.isArray(payload.order) ? payload.order.map(String) : [];
        if (!dial) fail('Chọn trụ đèn trái hoặc phải.');
        nearOrFail(s, p, world, fail, dial, 'bellTower', 'Hãy đứng cạnh trụ đèn ký hiệu ở Tháp Chuông.');
        if (order.length !== 3 || new Set(order).size !== 3 || order.some(id => !SYMBOLS[id])) fail('Hãy chọn đủ ba ký hiệu khác nhau.');
        d.dials[dial] = { by: p.id, order, at: now };
        const other = d.dials[dial === 'dialLeft' ? 'dialRight' : 'dialLeft'];
        if (!other || now - other.at > (solo ? DIAL_WINDOW.solo : DIAL_WINDOW.pair)) return { message: solo ? 'Trụ đèn sáng lên. Giờ đặt trụ bên kia.' : 'Trụ đèn sáng lên, đang chờ trụ bên kia.' };
        if (!solo && other.by === p.id) return { message: 'Trụ bên kia cần một người khác đặt.' };
        const right = order.join() === d.secret.order.join() && other.order.join() === d.secret.order.join();
        if (!right) {
          d.attempts++; d.dials = {};
          return { message: order.join() !== other.order.join() ? 'Hai trụ đèn chớp tắt: hai bên đặt không giống nhau.' : 'Hai trụ đèn chớp tắt: thứ tự chưa đúng.', wrong: true };
        }
        s.step = 'solved';
        ctx.worldState.set(stateKey('room', s.room, 'bellTower', 'symbolStone', 'niche'), { open: true, by: Object.values(s.names), at: now });
        ctx.complete({ attempts: d.attempts, solo });
        return { message: 'Hai trụ đèn cùng sáng. Phiến đá trượt sang, lộ ra một hốc nhỏ.' };
      }
      fail('Chưa tới bước này.');
    },
    view: (s, id) => ({ read: Boolean(s.data.read?.[id]), observed: Boolean(s.data.observed?.[id]), partnerRead: Boolean(s.data.read?.[s.hostId === id ? s.guestId : s.hostId]), partnerObserved: Boolean(s.data.observed?.[s.hostId === id ? s.guestId : s.hostId]), attempts: s.data.attempts || 0, symbols: Object.entries(SYMBOLS).map(([key, v]) => ({ id: key, name: v.name })) }),
    memory: (s, id) => s.guestId ? `Cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]} giải câu đố ký hiệu ở Tháp Chuông.` : 'Một mình giải câu đố ký hiệu ở Tháp Chuông, với lời thì thầm của An.',
  },

  // Journey stage 4: put the ancient lamp back and light it. The preparer cleans the lamp and turns its base to the
  // mark the finder reads inside the niche; then the lamp is carried over and lit together. Solo: An is the finder.
  lamp: {
    title: 'Cùng thắp chiếc đèn cổ', place: 'Chánh Điện', scene: 'mainHall', object: 'lampTable', solo: true, stay: true, achievement: null, moment: 'lamp',
    roles: { host: 'Người chuẩn bị đèn', guest: 'Người tìm chỗ đặt' },
    canInvite(p, target, { repos, fail }) {
      const story = repos.narrative.progress(p.id)['light-hall'];
      if (!story || story.status !== 'active' || story.chapter !== 4) fail('Chiếc đèn còn phủ khăn. Hãy theo hành trình “Ánh sáng trong Chánh điện” tới bước này đã.');
    },
    gatherGuide: (s, id) => id === s.hostId ? 'Đứng cạnh bàn gỗ phủ khăn (bên trái Chánh Điện) rồi bấm “Sẵn sàng”.' : 'Đứng cạnh hốc tường thứ ba (bên phải tượng Phật) rồi bấm “Sẵn sàng”.',
    checkReady(s, p, o, { world, fail }) {
      const spot = p.id === s.hostId ? 'lampTable' : 'nicheC';
      if (!near(p, world, 'mainHall', spot, 40)) fail(p.id === s.hostId ? 'Hãy đứng cạnh bàn gỗ phủ khăn trước.' : 'Hãy đứng cạnh hốc tường thứ ba trước.');
    },
    start(s) {
      s.step = 'prepare';
      Object.assign(s.data, { mark: LAMP_MARKS[Math.floor(Math.random() * LAMP_MARKS.length)], cleaned: false, opened: !s.guestId, looked: {}, turned: false, lit: {} });
    },
    guide(s, id) {
      const host = id === s.hostId, solo = !s.guestId, d = s.data, partner = s.names[host ? s.guestId : s.hostId];
      if (s.step === 'prepare') {
        if (solo) return 'Gỡ khăn, lau sạch chiếc đèn trên bàn gỗ. An đã chạy đi mở nắp hốc tường thứ ba.';
        if (host) return d.cleaned ? `Đèn đã sạch. Đợi ${partner} mở nắp hốc.` : 'Gỡ khăn, lau sạch chiếc đèn trên bàn gỗ.';
        return d.opened ? `Nắp đã mở. Đợi ${partner} lau đèn.` : 'Mở nắp gỗ che hốc tường thứ ba.';
      }
      if (s.step === 'match') {
        if (solo) return d.looked[id] ? 'Quay lại bàn gỗ, xoay đế đèn cho khớp dấu khắc bạn vừa thấy.' : 'Đến hốc tường thứ ba (An đang giữ nắp) và soi dấu khắc trên vách.';
        if (host) return 'Chân đèn có bốn dấu khắc. Hỏi bạn xem dấu trong hốc là gì, rồi xoay đế cho khớp.';
        return d.looked[id] ? `Kể cho ${partner} dấu khắc bạn thấy (qua chat).` : 'Soi dấu khắc trên vách hốc.';
      }
      if (s.step === 'carry') return host ? 'Đế đã khớp. Mang đèn tới hốc tường thứ ba.' : `${partner} đang mang đèn tới.`;
      if (d.lit[id]) return `Đợi ${partner} cùng làm.`;
      return solo ? 'An khum tay che gió. Châm lửa vào bấc.' : host ? 'Châm lửa vào bấc.' : 'Khum tay che gió cho ngọn lửa.';
    },
    actions(s, id) {
      const host = id === s.hostId, solo = !s.guestId, d = s.data;
      if (s.step === 'prepare') return host && !d.cleaned ? [{ id: 'clean', label: 'Lau đèn' }] : !host && !d.opened ? [{ id: 'open', label: 'Mở nắp hốc' }] : [];
      if (s.step === 'match') {
        const out = [];
        if ((solo || !host) && !d.looked[id]) out.push({ id: 'look', label: 'Soi dấu khắc' });
        if (host && (!solo || d.looked[id])) out.push(...LAMP_MARKS.map(m => ({ id: 'turn', label: `Xoay đế: ${SYMBOLS[m].name}`, payload: { mark: m } })));
        return out;
      }
      if (s.step === 'carry') return host ? [{ id: 'bring', label: 'Đặt đèn vào hốc' }] : [];
      return d.lit[id] ? [] : [{ id: 'light', label: host ? 'Châm lửa' : 'Che gió' }];
    },
    act(s, p, action, payload, ctx) {
      const { fail, world, now } = ctx, d = s.data, host = p.id === s.hostId, solo = !s.guestId;
      const at = (spot, message) => { if (!near(p, world, 'mainHall', spot, 40)) fail(message); };
      if (s.step === 'prepare') {
        if (action === 'clean' && host && !d.cleaned) { at('lampTable', 'Hãy đứng cạnh bàn gỗ.'); d.cleaned = true; }
        else if (action === 'open' && !host && !d.opened) { at('nicheC', 'Hãy đứng cạnh hốc tường thứ ba.'); d.opened = true; }
        else fail('Bước này không phải của bạn.');
        if (d.cleaned && d.opened) s.step = 'match';
        return { message: action === 'clean' ? 'Lớp khăn rơi xuống. Thân đèn đồng hiện ra ba áng mây.' : 'Nắp gỗ mở ra, mùi gỗ cũ bay lên.' };
      }
      if (s.step === 'match') {
        if (action === 'look') {
          if (host && !solo) fail('Người tìm chỗ đặt mới soi được hốc.');
          at('nicheC', 'Hãy đứng cạnh hốc tường thứ ba.'); d.looked[p.id] = true;
          return { message: `Trên vách hốc khắc hình ${SYMBOLS[d.mark].name.toLowerCase()}.`, private: true };
        }
        if (action !== 'turn' || !host) fail('Bước này không phải của bạn.');
        if (solo && !d.looked[p.id]) fail('Hãy đến hốc tường thứ ba soi dấu khắc trước đã.');
        at('lampTable', 'Hãy đứng cạnh bàn gỗ.');
        if (!SYMBOLS[payload.mark]) fail('Chọn một dấu khắc.');
        if (payload.mark !== d.mark) return { message: 'Đế đèn không khớp khấc gỗ. Hỏi lại dấu khắc trong hốc nhé.', wrong: true };
        d.turned = true; s.step = 'carry';
        return { message: 'Cạch — đế đèn xoay khớp. Giờ có thể mang đèn tới hốc.' };
      }
      if (s.step === 'carry') {
        if (action !== 'bring' || !host) fail('Bước này không phải của bạn.');
        at('nicheC', 'Mang đèn tới hốc tường thứ ba.');
        s.step = 'light';
        return { message: 'Chân đèn hình hoa sen nằm gọn trong khấc gỗ.' };
      }
      if (action !== 'light') fail('Chưa tới bước này.');
      at('nicheC', 'Hãy đứng cạnh hốc tường thứ ba.');
      // Together: both within ten seconds of each other; a late one simply tries again.
      for (const [id, t] of Object.entries(d.lit)) if (now - t > 10_000) delete d.lit[id];
      d.lit[p.id] = now;
      if (!solo && Object.keys(d.lit).length < 2) return { message: `Đợi ${s.names[ctx.partnerOf(p.id)]} cùng làm.` };
      for (const id of ctx.participants) ctx.worldState.set(stateKey('personal', id, 'mainHall', 'ancientLamp', 'state'), { placed: true, lit: true, at: now });
      ctx.complete({ solo, mark: d.mark });
      return { message: 'Bấc bén lửa. Chiếc đèn cổ sáng lên.' };
    },
    view: (s, id) => ({ mark: s.data.looked?.[id] ? s.data.mark : null, cleaned: s.data.cleaned, opened: s.data.opened }),
    publicView: s => ({ kind: 'lamp', step: s.status === 'active' ? s.step : 'gathering', names: Object.values(s.names) }),
    memory: (s, id) => s.guestId ? `Cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]} đặt và thắp chiếc đèn cổ trong Chánh Điện.` : 'Cùng chú tiểu An đặt và thắp chiếc đèn cổ trong Chánh Điện.',
  },

  // Reading together: one text, the same passage on both screens; either reader turns the page.
  read: {
    title: 'Cùng đọc', place: 'góc đọc trong Chánh Điện', scene: 'mainHall', object: 'readingDesk', stay: true, achievement: null, moment: 'motes',
    roles: { host: 'Người chọn bài', guest: 'Người cùng đọc' },
    cleanOptions: o => ({ item: READING.has(o.item) ? o.item : READING.keys().next().value }),
    inviteNote: s => `“${READING.get(s.data.options.item).title}”`,
    gatherGuide: () => 'Đến góc đọc trong Chánh Điện (bên trái, gần cửa) rồi bấm “Sẵn sàng”.',
    checkReady(s, p, o, { world, fail }) { nearOrFail(s, p, world, fail, undefined, undefined, 'Hãy đến góc đọc trong Chánh Điện trước.'); },
    start(s) { const item = READING.get(s.data.options.item); s.step = 'reading'; Object.assign(s.data, { item: item.id, index: 0, total: passages(item).length }); },
    guide: s => s.data.index < s.data.total - 1 ? 'Đọc chậm cùng nhau. Ai cũng có thể lật sang đoạn tiếp.' : 'Đây là đoạn cuối. Đọc xong thì cùng gấp sách.',
    actions: s => [...(s.data.index > 0 ? [{ id: 'prev', label: 'Đoạn trước' }] : []), s.data.index < s.data.total - 1 ? { id: 'next', label: 'Đoạn tiếp' } : { id: 'finish', label: 'Gấp sách' }],
    act(s, p, action, payload, ctx) {
      nearOrFail(s, p, ctx.world, ctx.fail, undefined, undefined, 'Hãy ngồi lại góc đọc.');
      if (action === 'next' && s.data.index < s.data.total - 1) { s.data.index++; return {}; }
      if (action === 'prev' && s.data.index > 0) { s.data.index--; return {}; }
      if (action === 'finish' && s.data.index === s.data.total - 1) { ctx.complete({ item: s.data.item }); return { message: 'Hai người cùng gấp sách lại.' }; }
      ctx.fail('Chưa tới bước này.');
    },
    view(s) { const item = READING.get(s.data.item || s.data.options.item); return { item: item.id, title: item.title, source: item.source, index: s.data.index || 0, total: passages(item).length, text: passages(item)[s.data.index || 0] }; },
    publicView: s => ({ kind: 'read', step: s.status === 'active' ? 'reading' : 'gathering', names: Object.values(s.names) }),
    memory: (s, id) => `Cùng ${s.names[id === s.hostId ? s.guestId : s.hostId]} đọc “${READING.get(s.data.item).title}” ở Chánh Điện.`,
  },

  // Small gestures: accepted once, done at once. Each client moves only its own character.
  greet: {
    title: 'Chắp tay chào nhau', instant: true, roles: null,
    canInvite: sameArea,
    start(s, ctx) { for (const id of ctx.participants) ctx.hooks.setAction?.(ctx.live(id), 'pray'); },
  },
  sit: {
    title: 'Ngồi cạnh nhau', instant: true, roles: null,
    canInvite(p, target, { world, fail }) {
      sameArea(p, target, { fail });
      if (!(world.map(p.sceneId)?.objects || []).some(o => o.action === 'sit' && Math.hypot(o.x - p.x, o.y - p.y) < 400)) fail('Gần đây không có ghế để ngồi cùng.');
    },
    start(s, ctx) {
      const host = ctx.live(s.hostId), bench = (ctx.world.map(host.sceneId)?.objects || []).filter(o => o.action === 'sit').sort((a, b) => Math.hypot(a.x - host.x, a.y - host.y) - Math.hypot(b.x - host.x, b.y - host.y))[0];
      ctx.participants.forEach((id, i) => ctx.send(id, 'coop:sit', { sceneId: host.sceneId, objectId: bench.id, side: i ? 1 : -1 }));
    },
  },
  photo: {
    title: 'Chụp ảnh chung', instant: true, roles: null,
    canInvite: sameArea,
    start(s, ctx) { for (const id of ctx.participants) ctx.send(id, 'coop:photo', { ids: ctx.participants, names: ctx.participants.map(i => s.names[i]), at: ctx.now }); },
  },
};
