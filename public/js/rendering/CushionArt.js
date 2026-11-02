// A round pleated zafu on a square zabuton, viewed from above at the game's angle.
export function drawMeditationCushion(c, o) {
  const { x, y } = o, color = o.color || '#766c4b';
  const oval = (px, py, rx, ry, fill) => { c.fillStyle = fill; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  c.save(); c.translate(x, y);
  oval(2, 5, 38, 16, '#0a201f44');
  c.scale(1, .58);
  c.fillStyle = '#4a4b3d'; c.beginPath(); c.roundRect(-36, -25, 72, 50, 7); c.fill();
  const mat = c.createLinearGradient(-36, -25, 36, 25);
  mat.addColorStop(0, '#a79971'); mat.addColorStop(.5, '#85795b'); mat.addColorStop(1, '#5c5946');
  c.fillStyle = mat; c.beginPath(); c.roundRect(-35, -28, 70, 49, 7); c.fill();
  c.strokeStyle = '#d2bf8b88'; c.lineWidth = 1.2; c.beginPath(); c.roundRect(-31, -24, 62, 41, 5); c.stroke();
  c.restore(); c.save(); c.translate(x, y);
  // Raised padded sides with regular cloth folds.
  const side = c.createLinearGradient(-25, 0, 25, 0);
  side.addColorStop(0, '#383e36'); side.addColorStop(.3, color); side.addColorStop(1, '#3f4238');
  oval(0, 0, 25, 11, side);
  for (let i = -4; i <= 4; i++) {
    const px = i * 5, py = Math.sqrt(Math.max(0, 1 - (px / 25) ** 2)) * 9;
    c.strokeStyle = '#d9cb9e55'; c.lineWidth = .8; c.beginPath(); c.moveTo(px, py - 6); c.quadraticCurveTo(px + .6, py - 2, px, py + .3); c.stroke();
  }
  const top = c.createRadialGradient(-8, -10, 1, 0, -6, 25);
  top.addColorStop(0, '#b8aa86'); top.addColorStop(.5, color); top.addColorStop(1, '#555448');
  oval(0, -7, 25, 11, top);
  c.strokeStyle = '#d8c79a88'; c.lineWidth = .8; c.beginPath(); c.ellipse(0, -7, 22, 9, 0, 0, Math.PI * 2); c.stroke();
  oval(0, -7, 2.5, 1.2, '#4d4e4055');
  c.restore();
}
