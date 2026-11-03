import { drawOffering } from './OfferingArt.js';

function oval(c, x, y, rx, ry, color) {
  c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

function fish(c, x, y, scale = 1) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  oval(c, 0, 0, 17, 7, '#e3a46e');
  c.fillStyle = '#c9855c'; c.beginPath(); c.moveTo(-13, 0); c.lineTo(-26, -9); c.lineTo(-26, 9); c.closePath(); c.fill();
  oval(c, 9, -2, 1.5, 1.5, '#344841'); oval(c, 2, -4, 5, 1.4, '#f9d6a0');
  c.restore();
}

export function drawShopIcon(canvas, sku) {
  const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
  c.save(); c.scale(canvas.width / 72, canvas.height / 72);
  oval(c, 36, 61, 29, 5, '#142e2b55');
  if (sku === 'releaseFish') {
    oval(c, 36, 52, 28, 13, '#9e774c'); oval(c, 36, 48, 25, 8, '#5a8383');
    fish(c, 36, 47, .8);
  } else if (sku === 'fishFood') {
    c.fillStyle = '#d1b889'; c.beginPath(); c.roundRect(19, 19, 34, 39, 5); c.fill();
    c.fillStyle = '#a27a50'; c.fillRect(19, 19, 34, 7);
    fish(c, 36, 43, .5);
    for (const x of [26, 35, 44]) oval(c, x, 54, 1.6, 1.3, '#77563a');
  } else {
    c.translate(36, 13); c.scale(1.5, 1.5); c.translate(-36, -13);
    drawOffering(c, 36, 52, sku, 0, true);
  }
  c.restore();
}

export function drawShopScene(canvas, mode) {
  const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
  const water = ['fishShop', 'fishFeed', 'fishRelease'].includes(mode);
  c.fillStyle = water ? '#355e60' : '#6a5944'; c.fillRect(0, 60, 300, 45);
  for (let x = 5; x < 300; x += 45) {
    c.strokeStyle = water ? '#a5d1bc77' : '#ddba8055'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(x, 77 + x % 9, 19, 4, 0, 0, Math.PI * 2); c.stroke();
  }
  const items = mode === 'fishShop' ? ['releaseFish', 'fishFood'] : mode === 'fishFeed' ? ['fishFood', 'releaseFish'] : mode === 'fishRelease' ? ['releaseFish'] : ['incense', 'fruit', 'flowers'];
  const spacing = 300 / (items.length + 1);
  for (let i = 0; i < items.length; i++) {
    const icon = document.createElement('canvas'); icon.width = icon.height = 72; drawShopIcon(icon, items[i]);
    c.drawImage(icon, spacing * (i + 1) - 36, 4, 72, 72);
  }
}
