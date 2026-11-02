// [hour, tint, darkness, lamp intensity]; values between keys are interpolated.
const KEYS = [[0, '#0b1533', .58, 1], [4.6, '#1d2752', .5, 1], [6, '#ffb48a', .2, .45], [8, '#ffe8c8', .06, 0], [11, '#ffffff', 0, 0], [15.5, '#ffd59a', .08, 0], [17.4, '#ff9152', .24, .4], [18.7, '#6a4470', .36, .8], [20, '#27315e', .46, 1], [24, '#0b1533', .58, 1]];
export const PHASES = [['night', 'Đêm khuya', 0, 5], ['morning', 'Sáng', 5, 10], ['noon', 'Trưa', 10, 16], ['sunset', 'Hoàng hôn', 16, 19], ['evening', 'Tối', 19, 22], ['night', 'Đêm khuya', 22, 24]];
export const TIME_MODES = { auto: 'Theo giờ thật', cycle: 'Chu kỳ nhanh (24 phút)', morning: 'Luôn buổi sáng', noon: 'Luôn buổi trưa', sunset: 'Luôn hoàng hôn', evening: 'Luôn buổi tối', night: 'Luôn đêm khuya' };
const FIXED = { morning: 7.5, noon: 12.5, sunset: 17.6, evening: 20.2, night: 23.4 };
const mix = (a, b, k) => a + (b - a) * k;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export class DayNightSystem {
  constructor(mode = 'auto') { this.mode = TIME_MODES[mode] ? mode : 'auto'; }
  hour(now = Date.now()) {
    if (this.mode === 'cycle') return now / 60000 % 24;
    if (FIXED[this.mode] !== undefined) return FIXED[this.mode];
    const d = new Date(now); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  }
  sample(now = Date.now()) {
    const hour = this.hour(now), i = KEYS.findIndex((key, n) => hour >= key[0] && hour < KEYS[n + 1][0]);
    const a = KEYS[i], b = KEYS[i + 1], k = (hour - a[0]) / (b[0] - a[0]);
    const [r, g, bl] = hex(a[1]).map((v, n) => Math.round(mix(v, hex(b[1])[n], k)));
    const darkness = mix(a[2], b[2], k), lamps = mix(a[3], b[3], k);
    const phase = PHASES.find(p => hour >= p[2] && hour < p[3]);
    const sun = Math.max(0, Math.sin((hour - 6) / 12 * Math.PI));
    return { hour, phase: phase[0], label: phase[1], tint: [r, g, bl], darkness, lamps, night: darkness > .38,
      // Shadows stretch and swing with the sun, and fade at night.
      shadow: { alpha: .12 + sun * .22, dx: Math.cos((hour - 6) / 12 * Math.PI) * -16, stretch: 1 + (1 - sun) * .6 } };
  }
}
