import { OutdoorMusic } from './OutdoorMusic.js';
// Everything is synthesised with Web Audio (no recorded or licensed audio). Buses: music, ambient, sfx, ui → master.
export const BUSES = { master: 'Tổng', music: 'Nhạc', ambient: 'Môi trường', sfx: 'Hiệu ứng', ui: 'Giao diện' };
const AMBIENT_MIX = {
  birds: { wind: .25, birds: 1 }, garden: { wind: .3, birds: .7, water: .15 }, water: { water: 1, birds: .45, wind: .2 }, wind: { wind: .8, birds: .3 },
  forest: { wind: .9, leaves: .7, water: .35 }, hall: { room: 1 }, library: { room: .6 },
};

export class AudioManager {
  constructor(muted = false, volumes = {}) {
    this.outdoorScore = new OutdoorMusic(this);
    this.muted = muted; this.context = null; this.volumes = { master: .8, music: .6, ambient: .55, sfx: .8, ui: .5, ...volumes };
    this.loops = {}; this.target = {}; this.chanting = false; this.meditationMusic = false; this.timer = 0; this.nextBeat = 0; this.nextNote = 0; this.nextChirp = 0; this.beat = 0;
  }
  async unlock() {
    try {
      if (!this.context) { this.context = new (window.AudioContext || window.webkitAudioContext)(); this.build(); }
      if (this.context.state === 'suspended') await this.context.resume();
      this.applyVolumes();
      return this.context.state === 'running';
    } catch { return false; }
  }
  build() {
    const c = this.context;
    this.bus = {}; this.bus.master = c.createGain(); this.bus.master.connect(c.destination);
    for (const name of ['music', 'ambient', 'sfx', 'ui']) { this.bus[name] = c.createGain(); this.bus[name].connect(this.bus.master); }
    // Two seconds of white noise, shared by every noise-based sound.
    const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    const loop = (filterType, frequency, q = .7) => {
      const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
      source.buffer = buffer; source.loop = true; filter.type = filterType; filter.frequency.value = frequency; filter.Q.value = q; gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.bus.ambient); source.start();
      return { gain, filter };
    };
    this.loops = { wind: loop('bandpass', 420, .4), water: loop('lowpass', 520, .9), rain: loop('highpass', 1800, .5), leaves: loop('bandpass', 2600, 1.2), room: loop('lowpass', 180, .5) };
    this.timer = setInterval(() => this.schedule(), 120);
  }
  applyVolumes() {
    if (!this.bus) return;
    const t = this.context.currentTime;
    this.bus.master.gain.setTargetAtTime(this.muted ? 0 : this.volumes.master, t, .05);
    for (const name of ['music', 'ambient', 'sfx', 'ui']) this.bus[name].gain.setTargetAtTime(this.volumes[name], t, .05);
  }
  setVolume(bus, value) { this.volumes[bus] = Math.max(0, Math.min(1, value)); this.applyVolumes(); }
  setMuted(muted) { this.muted = muted; this.applyVolumes(); }
  get running() { return Boolean(this.context && this.context.state === 'running'); }
  // Called every frame with the current place and weather; loops cross-fade towards their targets.
  setScene(ambient, weather, indoor) {
    this.outdoorScore.setWeather(weather?.current || 'clear', !indoor);
    const mix = { ...AMBIENT_MIX[ambient] };
    if ((ambient === 'hall') !== this.hallMusic) { this.hallMusic = ambient === 'hall'; if (this.hallMusic && this.running) this.nextNote = this.context.currentTime + .5; }
    if (weather) { mix.rain = (mix.rain || 0) + weather.levels.rain * (indoor ? .25 : .9); mix.wind = (mix.wind || 0) + weather.wind * (indoor ? .05 : .5); mix.leaves = (mix.leaves || 0) + weather.levels.leaves * .3; }
    this.target = mix;
  }
  schedule() {
    if (!this.running) return;
    const c = this.context, t = c.currentTime;
    for (const [name, node] of Object.entries(this.loops)) node.gain.gain.setTargetAtTime((this.target[name] || 0) * { wind: .16, water: .2, rain: .1, leaves: .05, room: .12 }[name], t, 1.2);
    this.loops.wind.filter.frequency.setTargetAtTime(320 + Math.sin(t * .3) * 140 + Math.sin(t * 1.1) * 60, t, .5);
    if ((this.target.birds || 0) > .05 && t > this.nextChirp) { this.chirp(this.target.birds); this.nextChirp = t + 1.5 + Math.random() * 5; }
    if ((this.target.water || 0) > .3 && Math.random() < .08) this.tone(900 + Math.random() * 600, .08, .015 * this.target.water, 'ambient', 'sine', 1.6);
    if (this.chanting) while (this.nextBeat < t + .3) { this.woodfish(Math.max(this.nextBeat, t)); if (++this.beat % 8 === 0) this.bowl(Math.max(this.nextBeat, t) + .05); this.nextBeat = Math.max(this.nextBeat, t) + .92; }
    // The pad plays while meditating and, a little softer, as background music inside the main hall.
    if (this.meditationMusic || this.hallMusic) while (this.nextNote < t + .3) { this.pad(Math.max(this.nextNote, t), this.meditationMusic ? 1 : .8); this.nextNote = Math.max(this.nextNote, t) + 6; }
    this.outdoorScore.schedule();
    // Now and then a distant temple bell, wherever the player is.
    if (!this.nextTempleBell) this.nextTempleBell = t + 40 + Math.random() * 50;
    else if (t > this.nextTempleBell) { this.templeBell(); this.onTempleBell?.(); this.nextTempleBell = t + 120 + Math.random() * 180; }
  }
  // A soft sung vowel: sawtooth through vowel formant filters with gentle vibrato. Used for the hall chant.
  voice(frequency, when, duration, gain = .14) {
    if (!this.running) return;
    const c = this.context, start = Math.max(c.currentTime, when), end = start + duration;
    const o = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), env = c.createGain(), out = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(frequency, start);
    lfo.frequency.value = 5.2; depth.gain.value = frequency * .012; lfo.connect(depth).connect(o.frequency);
    env.gain.setValueAtTime(.0001, start); env.gain.exponentialRampToValueAtTime(gain, start + .09);
    env.gain.setValueAtTime(gain, Math.max(start + .1, end - .22)); env.gain.exponentialRampToValueAtTime(.0001, end);
    out.gain.value = 2.6; o.connect(env);
    for (const [f, q, g] of [[620, 5, 1], [1080, 7, .55], [2500, 9, .16]]) { const bp = c.createBiquadFilter(), fg = c.createGain(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; fg.gain.value = g; env.connect(bp).connect(fg).connect(out); }
    out.connect(this.bus.music);
    o.start(start); lfo.start(start); o.stop(end + .05); lfo.stop(end + .05);
    o.onended = () => { o.disconnect(); lfo.disconnect(); depth.disconnect(); env.disconnect(); out.disconnect(); };
  }
  templeBell(when = 0) { [98, 196, 294, 392].forEach((f, i) => this.tone(f, 8 - i * 1.4, .07 / (i + 1), 'ambient', 'sine', 1, when)); }
  tone(frequency = 440, duration = .4, gain = .08, bus = 'sfx', type = 'sine', glide = 1, when = 0) {
    if (!this.running) return;
    const c = this.context, start = Math.max(c.currentTime, when), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(frequency, start); if (glide !== 1) o.frequency.exponentialRampToValueAtTime(frequency * glide, start + duration);
    g.gain.setValueAtTime(.0001, start); g.gain.exponentialRampToValueAtTime(gain, start + .02); g.gain.exponentialRampToValueAtTime(.0001, start + duration);
    o.connect(g).connect(this.bus[bus]); o.start(start); o.stop(start + duration + .05); o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  click() { this.tone(880, .07, .03, 'ui', 'triangle'); }
  step() { if (!this.running) return; const c = this.context, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'lowpass'; f.frequency.value = 420; g.gain.setValueAtTime(.05, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .09); s.connect(f).connect(g).connect(this.bus.sfx); s.start(c.currentTime, Math.random()); s.stop(c.currentTime + .1); }
  chirp(level) { const base = 2200 + Math.random() * 1400; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) this.tone(base, .09, .018 * level, 'ambient', 'sine', 1.3 + Math.random() * .3, this.context.currentTime + i * .13); }
  bell() { [174, 348, 522, 705].forEach((f, i) => this.tone(f, 4 - i * .45, .1 / (i + 1))); }
  bigBell() { [73, 110, 146, 220, 293].forEach((f, i) => this.tone(f, 9 - i * 1.2, .14 / (i + 1))); }
  bowl(when) { [528, 1056, 1584].forEach((f, i) => this.tone(f, 5 - i, .11 / (i + 1), 'music', 'sine', 1, when)); }
  woodfish(when) {
    const c = this.context, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
    g.gain.setValueAtTime(.0001, when); g.gain.exponentialRampToValueAtTime(.75, when + .004); g.gain.exponentialRampToValueAtTime(.0001, when + .12);
    s.connect(f).connect(g).connect(this.bus.music); s.start(when, Math.random()); s.stop(when + .15);
    this.tone(196, .14, .13, 'music', 'sine', .8, when);
  }
  // Slow pentatonic drone for meditation and the hall: original, generated on the fly.
  pad(when, level = 1) {
    const roots = [146.8, 164.8, 196, 220], root = roots[Math.floor(Math.random() * roots.length)];
    for (const [ratio, gain] of [[1, .05], [1.5, .032], [2, .022], [3, .009]]) this.tone(root * ratio, 7.5, gain * level, 'music', 'sine', 1, when);
  }
  setChant(on) { this.chanting = on; if (on && this.running) { this.nextBeat = this.context.currentTime + .1; this.beat = 0; } }
  setMeditationMusic(on) { this.meditationMusic = on; if (on && this.running) this.nextNote = this.context.currentTime + .1; }
  destroy() { clearInterval(this.timer); this.context?.close(); }
}
