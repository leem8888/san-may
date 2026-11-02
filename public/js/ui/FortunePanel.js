import { $, toast } from './dom.js';

const SHAKE_SECONDS = 1.6, WAIT_MS = 30000;

// Draw one of the written fortunes at the hall's fortune tube. The draw is a local random pick
// (nothing is won or lost); the server only records it in the journal, next to the tube.
export class FortunePanel {
  constructor({ net, game, audio, panels, fortunes }) {
    Object.assign(this, { net, game, audio, panels }); this.items = fortunes.items; this.last = null; this.nextAt = 0; this.tube = null;
    $('#fortuneNote').textContent = fortunes.note;
    $('#drawFortune').onclick = () => this.draw();
  }
  open(tube) { this.tube = tube; $('#fortuneResult').hidden = true; this.panels.open('fortunePanel'); }
  draw() {
    if (performance.now() < this.nextAt) return toast('Hãy ngồi yên với quẻ vừa rút một lúc rồi hẵng xin quẻ khác.');
    if (!['idle', 'walk'].includes(this.game.player.state)) return toast('Hãy hoàn tất hành động hiện tại trước.');
    this.nextAt = performance.now() + WAIT_MS;
    $('#drawFortune').disabled = true; $('#fortuneResult').hidden = true;
    this.game.player.act('pray'); this.game.fortuneShake = SHAKE_SECONDS;
    for (let i = 0; i < 10; i++) this.audio.tone(1300 + Math.random() * 500, .05, .03, 'sfx', 'triangle', 1, (this.audio.context?.currentTime || 0) + i * .14);
    setTimeout(() => this.reveal(), SHAKE_SECONDS * 1000);
  }
  reveal() {
    const choices = this.items.filter(f => f.id !== this.last), fortune = choices[Math.floor(Math.random() * choices.length)];
    this.last = fortune.id;
    $('#fortuneRank').textContent = `Quẻ số ${fortune.id} · ${fortune.rank}`; $('#fortuneTitle').textContent = fortune.title;
    $('#fortuneVerse').textContent = fortune.verse; $('#fortuneMeaning').textContent = fortune.meaning;
    $('#fortuneResult').hidden = false; $('#drawFortune').disabled = false;
    this.audio.tone(660, .9, .04, 'sfx');
    if (this.tube) this.net.request('activity:complete', { objectId: this.tube.id, title: `Quẻ số ${fortune.id} · ${fortune.title}` }).catch(() => {});
  }
}
