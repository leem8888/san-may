// World-space tea setting; interaction bounds and tea-game rules stay unchanged.
export function drawLibraryTeaTable(c, o, env) {
  const oval = (x,y,rx,ry,color) => { c.beginPath(); c.ellipse(x,y,rx,ry,0,0,Math.PI*2); c.fillStyle=color; c.fill(); };
  const rect = (x,y,w,h,color,r=0) => { c.beginPath(); c.roundRect(x,y,w,h,r); c.fillStyle=color; c.fill(); };
  const stroke = (points,color,width=1) => { c.beginPath(); points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y)); c.strokeStyle=color; c.lineWidth=width; c.lineCap='round'; c.stroke(); };
  c.save(); c.translate(o.x,o.y);
  oval(0,2,55,12,'rgba(16,12,9,.32)');
  // Four carved feet, apron and a beveled walnut top.
  for(const x of [-43,36]) { rect(x,-23,7,25,'#493024',2); rect(x+1,-6,5,7,'#674733',1); }
  rect(-46,-25,92,15,'#563725',3);
  rect(-39,-21,78,5,'#82573a',2);
  rect(-53,-34,106,12,'#493025',4);
  const wood=c.createLinearGradient(0,-49,0,-25);
  wood.addColorStop(0,'#ad8051'); wood.addColorStop(.5,'#8c5f3b'); wood.addColorStop(1,'#bb8a54');
  rect(-53,-49,106,23,wood,5);
  for(let i=0;i<5;i++) stroke([[-47,-45+i*4],[-15,-46+i*4],[17,-44+i*4],[46,-45+i*4]],'rgba(65,36,22,.18)',.7);
  stroke([[-48,-28],[48,-28]],'#dbb37b',1);
  // Woven runner and raised bamboo tea tray.
  rect(-34,-49,66,22,'#b6aa84',1);
  for(let x=-31;x<32;x+=4) stroke([[x,-48],[x,-28]],'rgba(87,83,55,.23)',.6);
  rect(-32,-45,65,17,'#4c3829',3); rect(-30,-45,61,13,'#b28753',3);
  for(let y=-42;y<-32;y+=3) stroke([[-27,y],[28,y]],'#88603e',.8);
  // Celadon pot: loop handle, tapered spout, glazed belly and fitted lid.
  c.beginPath(); c.ellipse(-23,-51,6,7,0,0,Math.PI*2); c.strokeStyle='#49685d'; c.lineWidth=3; c.stroke();
  c.beginPath(); c.moveTo(-4,-52); c.lineTo(6,-59); c.lineTo(8,-57); c.lineTo(1,-46); c.closePath(); c.fillStyle='#749787'; c.fill();
  oval(-12,-48,12,9,'#46665b');
  const glaze=c.createLinearGradient(-24,-55,0,-43);
  glaze.addColorStop(0,'#b4c7a4'); glaze.addColorStop(.45,'#83a38d'); glaze.addColorStop(1,'#486b5d');
  oval(-12,-50,12,9,glaze); oval(-12,-57,9,3,'#b3c3a0'); oval(-12,-60,2.5,2,'#557b68');
  stroke([[-19,-53],[-20,-49]],'rgba(240,244,213,.55)',1.5);
  for(const [x,y] of [[13,-40],[26,-46],[0,-35]]) {
    oval(x,y+2,6,2.5,'#67513c'); oval(x,y+1,4.5,3,'#9baa8b');
    oval(x,y-1,5,2.8,'#d7dfbf'); oval(x,y-1,3.5,1.7,'#9a753d');
    stroke([[x-3,y+1],[x-2,y+3]],'#e6e7ce',.8);
  }
  // Folded linen beside the tray and a slender wooden tea scoop.
  rect(36,-43,11,11,'#d4c9ab',1); stroke([[38,-42],[38,-33]],'#a59c80',.8);
  stroke([[-44,-43],[-36,-35]],'#d2b278',2);
  if(!env.reduced) for(let i=0;i<3;i++) {
    const t=(env.time*.22+i/3)%1;
    c.beginPath(); c.moveTo(-12,-62-t*17);
    c.bezierCurveTo(-18+Math.sin(t*6+i)*3,-68-t*17,-6,-71-t*17,-12+Math.sin(t*7)*4,-76-t*17);
    c.strokeStyle=`rgba(236,233,208,${.22*(1-t)})`; c.lineWidth=1.4; c.stroke();
  }
  c.restore();
}
