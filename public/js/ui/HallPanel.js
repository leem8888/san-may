import { $, el, toast } from './dom.js';
import { candleSlots } from '../rendering/StoryProps.js';

// Main Hall gestures that leave a trace for the room: flowers (pick at the flower table, carry them, place them in
// the altar vases), candles on the rack (choose a place), and a short reflection read in private. The server
// validates distance, timing and what each gesture changes.
const FLOWERS = [['sen', 'Hoa sen'], ['cuc', 'Hoa cúc vàng'], ['lan', 'Hoa lan trắng'], ['hue', 'Hoa huệ']];
const TITLES = { flower: 'Dâng hoa', candle: 'Thắp nến', reflect: 'Một đoạn suy ngẫm' };
const SLOT_TEXT = { off: 'Còn trống', burning: 'Đang cháy', burnt: 'Đã tàn' };

export class HallPanel {
  constructor({ net, game, panels, audio, onStory }) { Object.assign(this, { net, game, panels, audio, onStory }); }
  open(o) {
    this.object = o;
    if (o.op === 'offer') return this.offer(o);
    $('#hallTitle').textContent = TITLES[o.op] || o.label;
    let body;
    if (o.op === 'flower') body = [el('p', { text: 'Chọn một nhành hoa, rồi mang lên bình hoa trên bàn thờ. Mọi người trong phòng sẽ thấy hoa bạn dâng.' }), el('div', { class: 'choice-row' }, ...FLOWERS.map(([id, name]) => el('button', { type: 'button', text: name, onclick: () => this.pick(id) })))];
    else if (o.op === 'candle') {
      const states = candleSlots(o, this.net.clock.now());
      body = [el('p', { text: 'Chọn một chỗ còn trống trên giá. Mỗi ngọn nến cháy khoảng mười lăm phút và soi sáng góc Chánh Điện cho mọi người.' }),
        el('div', { class: 'choice-row candle-slots', role: 'group', 'aria-label': 'Chỗ đặt nến' }, ...states.map((st, i) => el('button', { type: 'button', disabled: st !== 'off', 'aria-label': `Chỗ ${i + 1}: ${SLOT_TEXT[st]}`, title: SLOT_TEXT[st], text: st === 'burning' ? '🕯' : st === 'burnt' ? '·' : String(i + 1), onclick: () => this.send(`light:${i}`) }))),
        el('button', { type: 'button', class: 'link', text: 'Dập ngọn nến của tôi', onclick: () => this.send('snuff') })];
    } else body = [el('p', { class: 'hint', text: 'Những dòng suy ngẫm ngắn do chùa Sân Mây viết, không trích từ kinh điển.' }), el('blockquote', { id: 'hallReflection', class: 'coop-topic', text: '…' }), el('button', { type: 'button', text: 'Đọc đoạn khác', onclick: () => this.send(null) })];
    $('#hallBody').replaceChildren(...body);
    this.panels.open('hallPanel');
    if (o.op === 'reflect') this.send(null);
  }
  async pick(kind) {
    try {
      const res = await this.request(kind);
      this.game.player.holding = res.result.holding; this.panels.close();
      clearTimeout(this.dropTimer); this.dropTimer = setTimeout(() => { this.game.player.holding = null; }, 170_000);
      // Walk the flower to the altar; arriving there offers it.
      const altar = this.game.scene.objects.find(o => o.id === 'altarVases');
      if (altar) this.game.navigate({ x: altar.x, y: altar.y + 30 }, altar);
      toast(res.result.message);
    } catch (error) { toast(error.message); }
  }
  async offer(o) {
    if (!this.game.player.holding) return toast('Hãy lấy một nhành hoa ở bàn hoa (bên phải) trước.');
    this.object = o;
    try {
      const res = await this.request(null);
      this.game.player.holding = null; this.game.player.act('pray'); this.audio.bell();
      const npc = res.result.npc && this.game.scene.npcs.find(n => n.id === res.result.npc.id);
      if (npc) npc.chat = { text: res.result.npc.text, age: 0 };
      toast(res.result.message, 4500);
    } catch (error) { toast(error.message); }
  }
  async request(choice) {
    this.net.sendMove(this.game.player, performance.now(), true);
    const res = await this.net.request('world:interact', { objectId: this.object.id, choice });
    this.onStory(res.story);
    return res;
  }
  async send(choice) {
    try {
      const res = await this.request(choice);
      if (this.object.op === 'reflect') { $('#hallReflection').textContent = res.result.reflection; return; }
      this.game.player.act('pray'); this.audio.bell();
      toast(res.result.message, 4500); this.panels.close();
    } catch (error) { toast(error.message); }
  }
}
