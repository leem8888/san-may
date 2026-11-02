const TAU = Math.PI * 2;
function oval(c, x, y, rx, ry, fill) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
function box(c, x, y, w, h, fill, r = 1) { c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function line(c, x, y, xx, yy, color, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
function gradient(c, x, w, colors) { const g = c.createLinearGradient(x, 0, x + w, 0); colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color)); return g; }
function glow(c, x, y, r, env) {
  const pulse = env.reduced ? 1 : .94 + Math.sin(env.time * 3 + x) * .06;
  const g = c.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, `rgba(255,200,105,${.24 * pulse})`); g.addColorStop(.4, '#f5ba5520'); g.addColorStop(1, '#f5ba5500');
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function paper(c, x, y, red, env) {
  glow(c, x, y, 31, env);
  const fill = gradient(c, x - 13, 26, red ? ['#792d25', red, '#f2a15f', red, '#792d25'] : ['#af793a', '#edbd6f', '#fff0b3', '#e7ad58', '#97642f']);
  oval(c, x, y, 13, 18, fill);
  // Curved bamboo ribs show the volume of the paper shell.
  c.save(); c.beginPath(); c.ellipse(x, y, 13, 18, 0, 0, TAU); c.clip();
  for (const width of [4, 8, 11]) { c.strokeStyle = red ? '#713a3266' : '#9b723c66'; c.lineWidth = .65; c.beginPath(); c.ellipse(x, y, width, 18, 0, 0, TAU); c.stroke(); }
  for (const dy of [-9, 0, 9]) { c.strokeStyle = '#714d3433'; c.beginPath(); c.ellipse(x, y + dy, 14, 2.4, 0, 0, TAU); c.stroke(); }
  c.restore();
  const metal = gradient(c, x - 10, 20, ['#806034', '#e5c88b', '#af8547']);
  box(c, x - 10, y - 19, 20, 4, metal, 1.5); box(c, x - 9, y + 15, 18, 4, metal, 1.5);
  oval(c, x, y - 18, 6, 1, '#f3d89d');
}

export function drawStandingLantern(c, o, env) {
  const { x, y } = o; c.save();
  oval(c, x + 2, y + 2, 13, 4, '#0c25204d');
  const wood = gradient(c, x - 4, 8, ['#493a29', '#9c7c4b', '#5b452f']);
  box(c, x - 7, y - 5, 14, 8, '#665239', 2); box(c, x - 3, y - 70, 6, 67, wood);
  paper(c, x, y - 48, null, env);
  box(c, x - 16, y - 71, 32, 4, gradient(c, x - 16, 32, ['#735731', '#e0bc78', '#8b683c']), 2);
  line(c, x, y - 29, x, y - 21, '#d8b36b', 1.5);
  for (let i = -1; i <= 1; i++) line(c, x + i * 1.5, y - 21, x + i * 2, y - 16, '#c79b55', .8);
  c.restore();
}

export function drawHangingLantern(c, o, env) {
  const { x, y } = o;
  // A bell nearby (env.ring, fading 1 → 0) sets the lanterns swinging a little more.
  const angle = env.reduced ? 0 : Math.sin(env.time * (1.1 + env.wind * .15) + x) * (.025 + env.wind * .012) + Math.sin(env.time * 7 + x) * .09 * (env.ring || 0);
  c.save();
  box(c, x - 4, y - 110, 8, 112, gradient(c, x - 4, 8, ['#3d3025', '#866442', '#503b29']));
  line(c, x, y - 104, x + 27, y - 104, '#775537', 4);
  line(c, x + 2, y - 89, x + 19, y - 104, '#63492f', 2);
  c.translate(x + 24, y - 104); c.rotate(angle);
  line(c, 0, 0, 0, 14, '#ad8951', 1); paper(c, 0, 32, o.color || '#c4503c', env);
  line(c, 0, 51, 0, 56, '#c9a163', 1); oval(c, 0, 56, 2, 2, '#e1bd74');
  for (let i = -2; i <= 2; i++) line(c, i * .7, 58, i * 1.1 + Math.sin(angle * 5) * 2, 66 - Math.abs(i), '#d6ad65', .8);
  c.restore();
}

export function drawStoneLantern(c, o, env) {
  const { x, y } = o; c.save(); c.translate(x, y);
  oval(c, 3, 2, 27, 7, '#0b211f55');
  const stone = gradient(c, -18, 36, ['#737e73', '#b5bbab', '#8f998c', '#626e66']);
  box(c, -20, -7, 40, 8, stone, 2); box(c, -16, -13, 32, 7, stone, 2);
  box(c, -7, -49, 14, 37, stone, 1); box(c, -11, -48, 22, 5, stone);
  box(c, -17, -71, 34, 23, stone, 2);
  glow(c, 0, -60, 24, env);
  box(c, -10, -67, 20, 15, '#484b37', 2);
  box(c, -8, -65, 16, 12, gradient(c, -8, 16, ['#bb7e35', '#ffe5a1', '#f6c26b', '#c68b3e']), 1);
  line(c, 0, -65, 0, -53, '#7a7959', 1.5); line(c, -8, -59, 8, -59, '#7a7959', 1.2);
  const roof = gradient(c, -25, 50, ['#667268', '#aab19f', '#7b8779', '#59675f']);
  c.fillStyle = roof; c.beginPath(); c.moveTo(-26, -70); c.quadraticCurveTo(-14, -72, -5, -86); c.lineTo(5, -86); c.quadraticCurveTo(14, -72, 26, -70); c.lineTo(23, -67); c.lineTo(-23, -67); c.closePath(); c.fill();
  line(c, -24, -70, 24, -70, '#bec3ae', 1);
  oval(c, 0, -87, 6, 3, stone); oval(c, 0, -92, 3.5, 5, stone);
  // Fixed speckles and moss avoid per-frame randomness or flickering texture.
  for (let i = 0; i < 12; i++) oval(c, -14 + (i * 11 % 28), -69 + (i * 7 % 18), .65, .5, '#dee1c638');
  oval(c, -12, -9, 6, 1.5, '#667a5266'); oval(c, 10, -3, 5, 1, '#6f835566');
  c.restore();
}
