// Seated gilt sculpture, drawn in local coordinates with its base at the origin.
export function drawBuddha(c, o) {
  c.save(); c.translate(o.x, o.y);
  const metal = (left, right, light = '#f5d994', mid = '#d5a651', dark = '#896024') => {
    const g = c.createLinearGradient(left, 0, right, 0);
    g.addColorStop(0, dark); g.addColorStop(.3, light); g.addColorStop(.58, mid); g.addColorStop(1, dark); return g;
  };
  const oval = (x, y, rx, ry, fill) => { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); };
  const path = (fill, draw, outline) => { c.beginPath(); draw(); c.fillStyle = fill; c.fill(); if (outline) { c.strokeStyle = outline; c.lineWidth = 1; c.stroke(); } };
  const curve = (points, color, width = 1) => { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(...points[0]); c.bezierCurveTo(...points[1], ...points[2], ...points[3]); c.stroke(); };
  const aura = c.createRadialGradient(0, -174, 28, 0, -174, 114);
  aura.addColorStop(0, '#f5d68a30'); aura.addColorStop(1, '#f5d68a00');
  oval(0, -174, 114, 114, aura);
  c.strokeStyle = '#e4bd6866'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, -180, 47, 51, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#66392d'; c.beginPath(); c.roundRect(-92, -34, 184, 35, 5); c.fill();
  c.fillStyle = metal(-86, 86); c.fillRect(-86, -39, 172, 8); c.fillRect(-83, -8, 166, 5);
  // Layered, curved lotus petals.
  oval(0, -44, 79, 16, '#805029');
  for (let row = 0; row < 2; row++) for (let i = -4; i <= 4; i++) {
    const x = i * 16 + (row ? 7 : 0), y = -45 - row * 10;
    path(metal(x - 11, x + 11, '#f0cd86', '#c7994e', '#8c602e'), () => {
      c.moveTo(x, y + 11); c.bezierCurveTo(x - 18, y + 1, x - 10, y - 12, x, y - 17);
      c.bezierCurveTo(x + 10, y - 12, x + 18, y + 1, x, y + 11);
    }, '#9a7039');
  }
  // Crossed legs and rounded shoulders, rather than a geometric torso.
  const gold = metal(-55, 60);
  path(gold, () => { c.moveTo(-59, -66); c.bezierCurveTo(-79, -83, -45, -105, -25, -102); c.bezierCurveTo(-21, -125, -36, -151, -21, -158); c.quadraticCurveTo(0, -169, 23, -157); c.bezierCurveTo(40, -150, 28, -124, 29, -102); c.bezierCurveTo(66, -99, 80, -77, 57, -66); c.quadraticCurveTo(0, -51, -59, -66); }, '#9d702e');
  path(metal(-38, 42, '#efd28a', '#c89a47', '#89602d'), () => { c.moveTo(-22, -157); c.quadraticCurveTo(-38, -150, -30, -114); c.quadraticCurveTo(-31, -91, -58, -77); c.quadraticCurveTo(-12, -77, 40, -65); c.quadraticCurveTo(18, -90, 22, -123); c.quadraticCurveTo(-9, -135, -22, -157); });
  for (let i = 0; i < 5; i++) curve([[-22 + i * 4, -144], [-21 + i * 4, -121], [-8 + i * 3, -104], [28 + i * 4, -78]], '#89612788', 1.3);
  curve([[-59, -78], [-31, -90], [-7, -68], [34, -70]], '#f6d88c', 2);
  curve([[52, -78], [27, -94], [3, -77], [-28, -69]], '#946a31', 1.5);
  // Arms and hands in the meditation mudra.
  for (const s of [-1, 1]) {
    curve([[s * 26, -147], [s * 42, -121], [s * 43, -99], [s * 9, -92]], '#a57732', 14);
    curve([[s * 25, -147], [s * 37, -121], [s * 38, -101], [s * 7, -94]], '#e3bc6d', 10);
  }
  oval(0, -92, 15, 5, '#b08339'); oval(-2, -95, 13, 4, '#f0d18a');
  for (let i = 0; i < 3; i++) curve([[-8, -95 + i], [-3, -94 + i], [3, -95 + i], [9, -96 + i]], '#a77b37', .55);
  oval(0, -158, 9, 12, metal(-9, 9));
  // Elongated ears, oval face and tightly curled hair.
  for (const s of [-1, 1]) { oval(s * 17, -180, 5, 13, '#bf9349'); oval(s * 18, -179, 2, 8, '#e6c477'); }
  oval(0, -184, 18, 25, metal(-20, 21, '#ffe5a4', '#dfb76a', '#a47732'));
  oval(0, -207, 17, 10, '#77582c'); oval(0, -219, 8, 8, '#8d6934');
  for (let row = 0; row < 4; row++) for (let col = -3; col <= 3; col++) {
    const x = col * 4.6 + (row % 2 ? 2 : 0), y = -213 + row * 4;
    if (Math.abs(x) < 16 - Math.abs(row - 2)) oval(x, y, 2.1, 2, metal(x - 2, x + 2, '#caa15b', '#9b783e', '#624825'));
  }
  curve([[-12, -187], [-9, -190], [-5, -190], [-2, -187]], '#976c31', 1);
  curve([[2, -187], [5, -190], [9, -190], [12, -187]], '#976c31', 1);
  for (const s of [-1, 1]) curve([[s * 3, -184], [s * 6, -182], [s * 9, -182], [s * 12, -184]], '#72522c', 1.1);
  curve([[0, -184], [-1, -180], [-3, -176], [1, -176]], '#b28743', 1);
  curve([[-5, -170], [-2, -168], [2, -168], [5, -170]], '#9c663a', 1);
  curve([[-4, -167], [-1, -166], [1, -166], [4, -167]], '#f9d990', .8);
  oval(0, -194, 1.3, 1.5, '#fff0bf');
  c.restore();
}
