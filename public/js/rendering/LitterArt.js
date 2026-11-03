// Small readable shapes at the character's feet; each can be tapped to tidy the path.
export function drawLitter(c, item) {
  c.save(); c.translate(item.x, item.y);
  c.fillStyle = 'rgba(7,28,25,.32)'; c.beginPath(); c.ellipse(0, 3, 13, 4, 0, 0, Math.PI * 2); c.fill();
  c.lineWidth = 1.4; c.strokeStyle = '#544b39';
  if (item.kind === 'leaf') {
    c.fillStyle = '#bd8650'; c.beginPath(); c.moveTo(-10, 0); c.quadraticCurveTo(-2, -11, 8, -3); c.quadraticCurveTo(2, 8, -10, 0); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-8, 1); c.lineTo(7, -3); c.stroke();
  } else if (item.kind === 'wrapper') {
    c.fillStyle = '#ddd3a7'; c.beginPath(); c.moveTo(-11, -5); c.lineTo(9, -7); c.lineTo(12, 4); c.lineTo(-8, 5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#aa654f'; c.fillRect(-3, -5, 5, 9);
  } else {
    c.fillStyle = '#e9dfc8'; c.beginPath(); c.moveTo(-9, -4); c.lineTo(-2, -7); c.lineTo(3, -4); c.lineTo(9, -5); c.lineTo(10, 3); c.lineTo(4, 6); c.lineTo(-8, 4); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#a99d85'; c.beginPath(); c.moveTo(-5, -2); c.lineTo(1, 2); c.lineTo(6, -1); c.stroke();
  }
  c.restore();
}
