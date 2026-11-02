import { CHANT_CYCLE_SECONDS } from '../shared/rules.js';

// The chanting monk in the main hall. Every CHANT_CYCLE_SECONDS (aligned to the shared server clock, so all
// players in the hall hear it together) he chants the traditional invocation three times. The text is
// traditional liturgy; the melody is an original pentatonic line, sung by a synthesised voice.
// If an audio file the operator has the rights to is placed at RECORDING_URL, it is played instead.
export const CHANT_LINE = 'Nam mô Bổn Sư Thích Ca Mâu Ni Phật';
export const RECORDING_URL = '/assets/audio/chanh-dien.mp3';
const MELODY = [[293.7, .8], [293.7, .8], [329.6, .8], [293.7, .8], [261.6, .8], [293.7, .8], [329.6, .8], [392, .9], [329.6, 2]];
const LINE_START = 2.5, LINE_GAP = 1.4, REPEAT = 3;

function buildEvents() {
  const events = [{ t: 0, type: 'bell' }], lines = [];
  let t = LINE_START;
  for (let k = 0; k < REPEAT; k++) {
    const start = t;
    events.push({ t, type: 'bowl' });
    for (const [f, d] of MELODY) { events.push({ t, type: 'voice', f, d }, { t, type: 'fish' }); t += d; }
    lines.push([start, t]); t += LINE_GAP;
  }
  events.push({ t, type: 'bell' });
  return { events, lines, length: t + 4 };
}
export const CHANT = buildEvents();

export class HallChant {
  constructor(audio) { this.audio = audio; this.cycle = -1; this.index = 0; this.recording = null; }
  // Optional licensed recording; absent by default, in which case the synthesised chant is used.
  async detectRecording() {
    try { const media = await (await fetch('/api/media')).json(); if (media.hallChant) { this.recording = new Audio(RECORDING_URL); this.recording.preload = 'auto'; } }
    catch { /* no recording: keep the synthesised chant */ }
  }
  connectRecording() {
    if (!this.recording || this.routed || !this.audio.running) return;
    this.audio.context.createMediaElementSource(this.recording).connect(this.audio.bus.music); this.routed = true;
  }
  phase(serverNowMs) { const total = serverNowMs / 1000, cycle = Math.floor(total / CHANT_CYCLE_SECONDS); return { cycle, phase: total - cycle * CHANT_CYCLE_SECONDS }; }
  // Called every frame; schedules notes slightly ahead on the audio clock. Returns the line being sung, or null.
  update(serverNowMs, inHall) {
    const { cycle, phase } = this.phase(serverNowMs);
    if (cycle !== this.cycle) { this.cycle = cycle; this.index = 0; }
    const singing = phase < CHANT.length;
    if (!inHall || !singing) { if (this.recording && !this.recording.paused) this.recording.pause(); this.index = CHANT.events.findIndex(e => e.t > phase); if (this.index < 0) this.index = CHANT.events.length; return null; }
    if (this.recording) {
      this.connectRecording();
      if (this.recording.paused && this.audio.running && !this.audio.muted) { this.recording.currentTime = Math.min(phase, (this.recording.duration || Infinity) - .1); this.recording.play().catch(() => {}); }
      return '♪ …';
    }
    if (this.audio.running) {
      const now = this.audio.context.currentTime;
      while (this.index < CHANT.events.length && CHANT.events[this.index].t < phase + .4) {
        const e = CHANT.events[this.index++];
        if (e.t < phase - .3) continue;
        const when = now + Math.max(0, e.t - phase);
        if (e.type === 'voice') this.audio.voice(e.f, when, e.d * .95);
        else if (e.type === 'fish') this.audio.woodfish(when);
        else if (e.type === 'bowl') this.audio.bowl(when);
        else this.audio.templeBell(when);
      }
    }
    const line = CHANT.lines.findIndex(([a, b]) => phase >= a && phase < b + .6);
    return line >= 0 ? CHANT_LINE : null;
  }
}
