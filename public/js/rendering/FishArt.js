import { FISH_FEED_SECONDS } from '../shared/fishFeeding.js';
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function fishPose(fish, time, feed) {
  if (fish.releasePose) return fish.releasePose;
  const a = time * fish.speed + fish.phase;
  const rx = fish.w.rx || fish.w.w / 2, ry = fish.w.ry || fish.w.h / 2;
  const cx = fish.w.shape === 'rect' ? fish.w.x + rx : fish.w.x;
  const cy = fish.w.shape === 'rect' ? fish.w.y + ry : fish.w.y;
  let x = cx + Math.sin(a) * rx * fish.r * .85, y = cy + Math.cos(a * 1.3) * ry * fish.r * .8;
  let angle = Math.atan2(-Math.sin(a * 1.3) * 1.3 * ry * .8, Math.cos(a) * rx * .85);
  if (feed && feed.age >= 0 && feed.age < FISH_FEED_SECONDS) {
    const weight = Math.min(smooth(feed.age / 5), smooth((FISH_FEED_SECONDS - feed.age) / 5));
    const orbit = fish.phase * 3 + feed.age * .18;
    const tx = feed.x + Math.cos(orbit) * (20 + fish.r * 18), ty = feed.y + Math.sin(orbit) * (10 + fish.r * 8);
    x += (tx - x) * weight; y += (ty - y) * weight;
    if (weight > .05) angle = Math.atan2(feed.y - y, feed.x - x);
  }
  return { x, y, angle };
}
// Top-down koi, with translucent fins and a flexible tail.
export function drawKoi(c, fish, time, reduced, feed) {
  const { x, y, angle } = fishPose(fish, time, feed);
  const flick = reduced ? 0 : Math.sin(time * 5 + fish.phase) * 3;
  const oval = (px, py, sx, sy, fill) => { c.fillStyle = fill; c.beginPath(); c.ellipse(px, py, sx, sy, 0, 0, Math.PI * 2); c.fill(); };
  c.save(); c.translate(x, y); c.rotate(angle); c.scale(fish.size || 1, fish.size || 1);
  oval(3, 6, 16, 5, '#082f3035');
  c.globalAlpha = .85;
  // Pectoral fins fan gently away from the body.
  for (const s of [-1, 1]) {
    c.fillStyle = '#e9d1a080'; c.beginPath(); c.moveTo(3, s * 3);
    c.quadraticCurveTo(-2, s * (10 + flick * .3), -8, s * 8); c.quadraticCurveTo(-6, s * 4, 3, s * 3); c.fill();
  }
  c.fillStyle = '#e2c591bb'; c.beginPath(); c.moveTo(-9, 0);
  c.quadraticCurveTo(-16, flick, -24, -6 + flick); c.quadraticCurveTo(-20, flick, -24, 6 + flick); c.quadraticCurveTo(-16, flick, -9, 0); c.fill();
  const body = c.createLinearGradient(0, -6, 0, 6);
  body.addColorStop(0, '#789182'); body.addColorStop(.28, fish.color); body.addColorStop(.65, fish.color); body.addColorStop(1, '#526d5b');
  c.fillStyle = body; c.beginPath(); c.moveTo(15, 0);
  c.bezierCurveTo(12, -8, -2, -7, -13, 0); c.bezierCurveTo(-2, 7, 12, 8, 15, 0); c.fill();
  // Distinct markings follow the body rather than an identical solid silhouette.
  oval(4, -.5, 4, 3.2, fish.color === '#c77f5a' ? '#f5dfbd' : '#bf6749');
  oval(-4, 1, 3.3, 2.5, fish.color === '#e7e2d3' ? '#52584b' : '#f0d3a0');
  c.strokeStyle = '#f5e6bd66'; c.lineWidth = .7; c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(0, -2, 10, -1); c.stroke();
  for (const s of [-1, 1]) { oval(10, s * 2.5, .9, .9, '#273e35'); }
  c.globalAlpha = .18; c.strokeStyle = '#c3e4d5'; c.lineWidth = .8;
  c.beginPath(); c.ellipse(16, 0, 5, 8, 0, -.8, .8); c.stroke();
  c.restore();
}
