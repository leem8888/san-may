// Scenery only: slow, unarmed forms, independent of story NPCs and player animation states.
export const PRACTITIONERS = [
  { x: 560, y: 585, phase: 0, color: '#a99b7d' },
  { x: 690, y: 570, phase: 1.7, color: '#82948a' },
  { x: 610, y: 705, phase: 3.4, color: '#8993a2' },
];

export function drawBambooPractice(c, person, time, reduced) {
  const t = reduced ? person.phase : time * .65 + person.phase;
  const sway = Math.sin(t), lift = (Math.sin(t * .5) + 1) / 2;
  const limb = (points, color, width) => {
    c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y));
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  };
  const oval = (x,y,rx,ry,color) => { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle=color; c.fill(); };
  c.save(); c.translate(person.x, person.y);
  oval(0,1,23,6,'rgba(8,25,20,.25)');
  // Wide grounded stance, soft knees and cloth shoes.
  limb([[-5,-30],[-12-sway*2,-15],[-20,0]],'#454c45',8);
  limb([[5,-30],[14+sway*2,-15],[20,-1]],'#454c45',8);
  oval(-21,0,6,2.8,'#302f2b'); oval(21,-1,6,2.8,'#302f2b');
  c.save(); c.translate(sway*2,-lift*2);
  c.beginPath(); c.moveTo(-9,-53); c.quadraticCurveTo(0,-58,9,-53);
  c.lineTo(12,-29); c.quadraticCurveTo(0,-25,-12,-29); c.closePath(); c.fillStyle=person.color; c.fill();
  limb([[-9,-50],[-20,-44-lift*13],[-29-sway*5,-39-lift*22]],person.color,6);
  limb([[9,-50],[21,-47+lift*6],[29+sway*5,-55+lift*19]],person.color,6);
  oval(-29-sway*5,-39-lift*22,3,3.5,'#dfbc98');
  oval(29+sway*5,-55+lift*19,3,3.5,'#dfbc98');
  limb([[-10,-32],[10,-32]],'#5a5144',3);
  limb([[0,-52],[-3,-40],[3,-35]],'#d8cead',1);
  oval(0,-63,7,8.5,'#dfbc98'); oval(0,-68,7,4,'#48443c');
  limb([[-4,-62],[-2,-62]],'#514334',.8); limb([[2,-62],[4,-62]],'#514334',.8);
  limb([[-1,-58],[2,-58]],'#9a6c54',.8);
  c.restore(); c.restore();
}
