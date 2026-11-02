import { MEDITATION_MINUTES } from '../shared/rules.js';
import { $, el, store, toast } from './dom.js';

export const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const spoken = seconds => seconds >= 60 ? `${Math.round(seconds / 60)} phút` : `${seconds} giây`;

// The timer is derived from the server's start time, so it stays right while the tab sleeps in the background.
export class MeditationPanel {
  constructor({ net, game, audio, panels, celebrate }) {
    Object.assign(this, { net, game, audio, panels, celebrate });
    this.minutes = Number(store.get('sanmay-meditation', '5')); this.session = null; this.timer = 0; this.music = store.get('sanmay-meditation-music', 'true') === 'true';
    $('#meditationMinutes').replaceChildren(...MEDITATION_MINUTES.map(m => el('button', { type: 'button', 'aria-pressed': String(m === this.minutes), text: `${m} phút`, onclick: event => this.pick(m, event.currentTarget) })));
    $('#meditationMusic').checked = this.music;
    $('#meditationMusic').onchange = () => { this.music = $('#meditationMusic').checked; store.set('sanmay-meditation-music', this.music); };
    $('#startMeditation').onclick = () => this.start();
    $('#endMeditation').onclick = () => this.finish();
    $('#meditationSound').onclick = () => { this.music = !this.music; this.audio.setMeditationMusic(this.music); this.soundLabel(); };
  }
  pick(minutes, button) { this.minutes = minutes; store.set('sanmay-meditation', minutes); for (const b of $('#meditationMinutes').children) b.setAttribute('aria-pressed', String(b === button)); }
  soundLabel() { $('#meditationSound').textContent = this.music ? 'Nhạc: bật' : 'Nhạc: tắt'; }
  async start() {
    if (!['idle', 'walk', 'sit'].includes(this.game.player.state)) return toast('Hãy hoàn tất hành động hiện tại trước.');
    $('#startMeditation').disabled = true;
    try { const res = await this.net.request('meditation:start', { minutes: this.minutes }); this.panels.close(); this.begin(res.meditation); }
    catch (error) { toast(error.message); }
    finally { $('#startMeditation').disabled = false; }
  }
  begin(session) {
    this.session = session;
    this.game.input.clear(); this.game.player.setState('meditate'); this.game.camera.setFocus(1.16);
    document.body.classList.add('meditating'); $('#meditation').hidden = false; this.soundLabel();
    this.audio.setMeditationMusic(this.music);
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 250); this.tick();
  }
  tick() {
    if (!this.session) return;
    const now = this.net.clock.now(), elapsed = (now - this.session.startedAt) / 1000, remaining = Math.max(0, this.session.plannedSeconds - elapsed);
    $('#meditationClock').textContent = clock(Math.ceil(remaining));
    const inhale = Math.floor(elapsed / 4) % 2 === 0;
    $('#breathText').textContent = inhale ? 'Hít vào… thân tâm lắng dịu' : 'Thở ra… mỉm cười buông nhẹ';
    $('#breathRing').classList.toggle('in', inhale);
    if (remaining <= 0) this.finish();
  }
  // Ends the UI immediately; the server measures the real duration.
  async finish() {
    if (!this.session) return;
    this.close();
    try { this.result(await this.net.request('meditation:finish')); }
    catch (error) { if (!/Không có phiên/.test(error.message)) toast(error.message); }
  }
  close() {
    clearInterval(this.timer); this.session = null;
    document.body.classList.remove('meditating'); $('#meditation').hidden = true;
    this.game.camera.setFocus(1); this.audio.setMeditationMusic(false);
    if (this.game.player.state === 'meditate') this.game.player.setState('idle');
  }
  result(r) {
    this.close();
    this.audio.bell();
    toast(`Đã thiền ${spoken(r.actualSeconds)}${r.completed ? ' — trọn vẹn' : ''}${r.shared ? ', cùng bạn đồng tu' : ''}. Thời gian đã được lưu.`, 5000);
    if (r.progress) this.celebrate({ achievements: r.achievements, quests: r.quests, progress: r.progress });
  }
  // Walking away cancels the session; the server also notices the movement.
  playerState(state, previous) { if (previous === 'meditate' && state !== 'meditate' && this.session) this.finish(); }
}
