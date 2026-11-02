// Wax candle on a brass holder. Origin is the foot of the holder.
export function drawCandle(c, x, y, env) {
  const t = env.reduced ? 0 : env.time;
  const phase = x * .73, flutter = env.reduced ? 0 : Math.sin(t * 7 + phase) * .65 + Math.sin(t * 13.7 + phase) * .3;
  const lean = env.reduced ? 0 : Math.sin(t * 3.1 + phase) * 1.2;
  const oval = (px, py, rx, ry, color) => { c.fillStyle = color; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  c.save(); c.translate(x, y);
  const brass = c.createLinearGradient(-9, 0, 9, 0);
  brass.addColorStop(0, '#795126'); brass.addColorStop(.32, '#efd18a'); brass.addColorStop(.6, '#b48c46'); brass.addColorStop(1, '#765024');
  oval(0, 0, 10, 2.6, brass);
  c.fillStyle = brass; c.fillRect(-2.5, -7, 5, 7); oval(0, -7, 8, 2.8, brass);
  const wax = c.createLinearGradient(-4.5, 0, 4.5, 0);
  wax.addColorStop(0, '#c2ac7d'); wax.addColorStop(.3, '#fff1cc'); wax.addColorStop(.65, '#f1dca9'); wax.addColorStop(1, '#b8a176');
  c.fillStyle = wax; c.beginPath(); c.roundRect(-4.5, -30, 9, 23, 2); c.fill();
  // Raised wax drips, a melted rim and a small dark pool around the wick.
  c.strokeStyle = '#fff0c8'; c.lineWidth = 1.7; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2.7, -29); c.bezierCurveTo(-4, -25, -1.4, -21, -2.7, -19); c.stroke();
  c.beginPath(); c.moveTo(2.5, -29); c.quadraticCurveTo(1, -25, 2.2, -23); c.stroke();
  oval(0, -30, 4.5, 1.9, '#fff0c7'); oval(0, -30, 2.8, 1, '#b18b4f');
  const glow = c.createRadialGradient(0, -36, 1, 0, -36, 23);
  glow.addColorStop(0, '#ffd37866'); glow.addColorStop(.4, '#f6ae4020'); glow.addColorStop(1, '#f6ae4000');
  c.fillStyle = glow; c.fillRect(-24, -60, 48, 48);
  c.strokeStyle = '#493424'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(.8, -32, .3, -34); c.stroke();
  // Curved flame silhouette: orange envelope, gold middle, pale hot core.
  const flame = (width, height, color) => {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, -31);
    c.bezierCurveTo(-width, -32, -width, -36, lean, -32 - height);
    c.bezierCurveTo(width + lean, -37, width, -32, 0, -31); c.fill();
  };
  flame(4.4, 13 + flutter, '#ec8e2c');
  flame(3.1, 10 + flutter * .7, '#ffd36b');
  flame(1.7, 6 + flutter * .3, '#fff5cc');
  oval(.2, -32, .8, 1.4, '#a9c8db');
  c.restore();
}
