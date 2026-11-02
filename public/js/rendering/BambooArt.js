// Cache detailed stalks and leaves; animate the whole clump gently from its roots.
const cache = new Map();
function image(o) {
  const h = o.height || 210, n = o.count || 7;
  const key = `${o.x}|${o.y}|${h}|${n}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = Math.ceil(h * 1.2 + 55);
  const c = canvas.getContext('2d'); c.translate(120, canvas.height - 10);
  const rnd = i => (Math.sin(i * 127.1 + o.x * .7 + o.y) * 43758.5453) % 1 + 1;
  const random = i => rnd(i) % 1;
  for (let i = 0; i < n; i++) {
    const x = -34 + random(i) * 68, height = h * (.73 + random(i + 13) * .3), lean = (random(i + 29) - .5) * 27, width = 4.5 + random(i + 31) * 3;
    const stem = c.createLinearGradient(x - width, 0, x + width, 0);
    stem.addColorStop(0, '#304c34'); stem.addColorStop(.25, '#b0bd77'); stem.addColorStop(.5, '#7f9b58'); stem.addColorStop(1, '#3d6140');
    c.lineCap = 'round'; c.strokeStyle = stem; c.lineWidth = width;
    c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + lean * .2, -height * .5, x + lean, -height); c.stroke();
    const segments = Math.round(height / 31);
    for (let k = 1; k < segments; k++) {
      const t = k / segments, jx = x + lean * t * t, jy = -height * t;
      c.strokeStyle = '#354f33'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(jx - width * .55, jy); c.lineTo(jx + width * .55, jy); c.stroke();
      c.strokeStyle = '#c4cc8eaa'; c.lineWidth = .8; c.beginPath(); c.moveTo(jx - width * .5, jy - 1.8); c.lineTo(jx + width * .5, jy - 1.8); c.stroke();
      if (t < .38 || k % 2 !== i % 2) continue;
      const dir = (k + i) % 2 ? 1 : -1, length = 20 + random(i * 17 + k) * 19;
      c.strokeStyle = '#527644'; c.lineWidth = 1.1;
      c.beginPath(); c.moveTo(jx, jy); c.quadraticCurveTo(jx + dir * length * .5, jy - 13, jx + dir * length, jy - 10); c.stroke();
      for (let leaf = 0; leaf < 7; leaf++) {
        const u = .2 + leaf * .115, lx = jx + dir * length * u, ly = jy - Math.sin(u * 1.7) * 12;
        const side = leaf % 2 ? 1 : -1, dx = dir * (9 + random(leaf + i) * 10), dy = side * (7 + random(leaf + k) * 8);
        c.fillStyle = ['#355d3d', '#507b4b', '#769556', '#91a965'][(leaf + i) % 4];
        c.beginPath(); c.moveTo(lx, ly); c.quadraticCurveTo(lx + dx * .25 - 2, ly + dy * .7, lx + dx, ly + dy); c.quadraticCurveTo(lx + dx * .6 + 2, ly + dy * .2, lx, ly); c.fill();
      }
    }
  }
  if (cache.size >= 40) cache.delete(cache.keys().next().value);
  cache.set(key, canvas); return canvas;
}
export function drawBamboo(c, o, env) {
  const art = image(o), sh = env.shadow;
  c.save(); c.translate(o.x, o.y);
  c.fillStyle = `rgba(8,28,30,${sh.alpha})`; c.beginPath(); c.ellipse(sh.dx * .75, 1, 46 * sh.stretch, 14, 0, 0, Math.PI * 2); c.fill();
  const bend = env.reduced ? 0 : Math.sin(env.time * .85 + o.x * .03) * (.009 + env.wind * .008);
  c.transform(1, 0, bend, 1, 0, 0); c.drawImage(art, -120, -art.height + 10); c.restore();
}
