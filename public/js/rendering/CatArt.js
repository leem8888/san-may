// A quiet ginger temple cat; all motion respects the reduced-effects setting.
export function drawCat(c, o, env) {
  const t = env.reduced ? 0 : env.time;
  const age = o.reaction ? env.time - o.reaction.started : Infinity;
  const pet = age >= 0 && age < 4 && o.reaction?.kind === 'pet';
  const play = age >= 0 && age < 4 && o.reaction?.kind === 'play';
  const breath = Math.sin(t * 2) * .55, tail = Math.sin(t * (play ? 4 : 1.4)) * (play ? 9 : 5);
  const oval = (x, y, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const stroke = (color, width, draw) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); draw(); c.stroke(); };
  const ear = (side) => {
    c.fillStyle = '#e8ac4e'; c.beginPath(); c.moveTo(side * 5, -36); c.quadraticCurveTo(side * 17, -53, side * 18, -42); c.lineTo(side * 19, -28); c.closePath(); c.fill();
    c.fillStyle = '#e8a08b'; c.beginPath(); c.moveTo(side * 10, -36); c.lineTo(side * 15, -43); c.lineTo(side * 16, -32); c.closePath(); c.fill();
  };
  c.save(); c.translate(o.x, o.y);
  if (play) {
    const bx = env.reduced ? -30 : -29 - Math.sin(age * 5) * 12;
    oval(bx, 0, 5, 5, '#dd907e'); oval(bx - 1.5, -1.5, 1.5, 1.5, '#ffe1b0');
  }
  // Small woven cushion tucked into the corner.
  oval(0, 3, 35, 12, '#10201966'); oval(0, 0, 31, 10, '#6d6650'); oval(0, -2, 28, 8, '#9a8962');
  stroke('#c58a38', 8, () => { c.moveTo(12, -7); c.bezierCurveTo(39, -2, 42, -20, 31 + tail, -23); });
  stroke('#edb85c', 4, () => { c.moveTo(15, -8); c.bezierCurveTo(37, -4, 38, -19, 31 + tail, -23); });
  const fur = c.createLinearGradient(-20, 0, 20, 0); fur.addColorStop(0, '#f6ce79'); fur.addColorStop(.5, '#eeb85b'); fur.addColorStop(1, '#c98a36');
  oval(0, -15, 18, 22 + breath, fur); oval(0, -13, 10, 16, '#ffe3a6');
  for (const s of [-1, 1]) { oval(s * 11, -4, 7, 5, '#f4cb7c'); stroke('#c78f45', .8, () => { c.moveTo(s * 11, -4); c.lineTo(s * 11, -1); }); }
  if (play) {
    c.save(); c.translate(-13, -10); c.rotate(env.reduced ? -.5 : -.6 + Math.sin(age * 7) * .4);
    oval(-7, 0, 11, 4.5, '#f4cb7c'); c.restore();
  }
  c.translate(pet && !env.reduced ? Math.sin(age * 3) * 2 : 0, breath); ear(-1); ear(1); oval(0, -29, 21, 17, fur);
  // Tabby forehead stripes and soft, rounded cheeks.
  for (const s of [-1, 1]) stroke('#b77b32', 2.3, () => { c.moveTo(s * 7, -42); c.lineTo(s * 5, -37); });
  stroke('#b77b32', 2.3, () => { c.moveTo(0, -44); c.lineTo(0, -38); });
  oval(-9, -24, 6, 4, '#ffe5b2'); oval(9, -24, 6, 4, '#ffe5b2');
  const blink = pet || (!env.reduced && (t % 6.7 < .18 || (t + 1.3) % 11 < .16));
  for (const s of [-1, 1]) {
    if (blink) stroke('#50452c', 1.5, () => { c.moveTo(s * 8 - 3, -30); c.quadraticCurveTo(s * 8, -28, s * 8 + 3, -30); });
    else { oval(s * 8, -30, 3.3, 4, '#748344'); oval(s * 8, -30, 1.4, 3.4, '#29392c'); oval(s * 8 - .8, -31.4, .9, 1, '#fff7dc'); }
    for (const dy of [-2, 2]) stroke('#fff1cd', .8, () => { c.moveTo(s * 13, -23 + dy); c.lineTo(s * 25, -24 + dy * 2); });
  }
  c.fillStyle = '#c87e71'; c.beginPath(); c.moveTo(-3, -24); c.lineTo(3, -24); c.quadraticCurveTo(0, -19, -3, -24); c.fill();
  stroke('#93633d', .9, () => { c.moveTo(-5, -20); c.quadraticCurveTo(-2, -17, 0, -21); c.quadraticCurveTo(2, -17, 5, -20); });
  if (pet) {
    c.save(); c.translate(0, -58 - (env.reduced ? 0 : Math.sin(age * 2) * 3));
    c.fillStyle = '#efad9e'; c.beginPath(); c.moveTo(0, 4); c.bezierCurveTo(-14, -5, -5, -13, 0, -6); c.bezierCurveTo(5, -13, 14, -5, 0, 4); c.fill(); c.restore();
  }
  c.restore();
}
