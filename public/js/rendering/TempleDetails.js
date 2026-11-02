function box(c,x,y,w,h,color,r=1){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function gradient(c,x,w,colors){const g=c.createLinearGradient(x,0,x+w,0);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}

export function drawBellBody(c,large=false){
  c.save(); if(large)c.scale(1.85,1.8);
  const metal=gradient(c,-33,66,['#434e36','#8c925c','#c1b879','#8d925c','#424d35']);
  // Suspension crown, rounded shoulders and a thick flared lip.
  c.strokeStyle='#9f9b62';c.lineWidth=4;c.beginPath();c.ellipse(0,10,7,6,0,0,Math.PI*2);c.stroke();
  c.fillStyle=metal;c.beginPath();c.moveTo(-17,16);c.bezierCurveTo(-25,20,-21,48,-27,64);c.quadraticCurveTo(-29,69,-33,72);c.lineTo(33,72);c.quadraticCurveTo(29,69,27,64);c.bezierCurveTo(21,48,25,20,17,16);c.quadraticCurveTo(0,9,-17,16);c.fill();
  for(const y of [25,29,57,61]){c.strokeStyle=y%2?'#d2c78899':'#4b573966';c.lineWidth=1;c.beginPath();c.ellipse(0,y,y>50?25:21,2.5,0,0,Math.PI);c.stroke();}
  for(const x of [-14,0,14]){
    box(c,x-4.5,34,9,17,'#46523955',2);
    c.strokeStyle='#c5ba7b99';c.lineWidth=.7;c.strokeRect(x-4,34,8,16);
    for(let i=0;i<3;i++)oval(c,x,37+i*4,1.2,1.2,'#b3ad70');
  }
  oval(c,0,72,33,6,'#343e2d');oval(c,0,71,33,4,'#b5ac6b');oval(c,0,73,28,3,'#303c2c');
  c.strokeStyle='#eee0a14d';c.lineWidth=1;c.beginPath();c.moveTo(-13,20);c.bezierCurveTo(-19,30,-16,45,-21,62);c.stroke();
  c.restore();
}

export function drawNoticeBoard(c,o){
  c.save();c.translate(o.x,o.y);
  oval(c,3,1,49,7,'#10261f55');
  const wood=gradient(c,-45,90,['#493223','#a57b4b','#67472f']);
  for(const x of [-32,25]){box(c,x,-52,8,54,wood);box(c,x-2,-5,12,7,'#777a64');}
  box(c,-45,-95,90,57,wood,3);box(c,-38,-88,76,44,'#5c4931',1);
  for(let i=0;i<5;i++)box(c,-37,-86+i*9,74,1,'#ae8d5730');
  for(let i=0;i<4;i++){
    c.save();c.translate(-28+i*17,-80+(i%2)*3);c.rotate((i%2?1:-1)*.05);
    box(c,1,2,14,27,'#251e1d55');box(c,0,0,14,27,['#f0e3bc','#dfd3af','#f2e5c8','#d7c5a0'][i]);
    for(let k=0;k<4;k++)box(c,3,7+k*4,8-(k%2)*2,.7,'#88755788',0);
    oval(c,7,2,1.5,1.5,'#a95c43');oval(c,6.6,1.6,.5,.5,'#f2c58b');c.restore();
  }
  c.fillStyle='#29443c';c.beginPath();c.moveTo(-55,-96);c.quadraticCurveTo(-22,-107,0,-119);c.quadraticCurveTo(22,-107,55,-96);c.lineTo(51,-91);c.quadraticCurveTo(0,-105,-51,-91);c.closePath();c.fill();
  c.strokeStyle='#ceb37a';c.lineWidth=1.3;c.beginPath();c.moveTo(-55,-96);c.quadraticCurveTo(0,-114,55,-96);c.stroke();
  for(let i=-4;i<=4;i++){c.strokeStyle='#668377';c.lineWidth=.7;c.beginPath();c.moveTo(i*10,-99-Math.max(0,10-Math.abs(i)*2));c.lineTo(i*12,-96);c.stroke();}
  c.restore();
}

export function hallOrnaments(c,o){
  const {x,y,w}=o,cx=x+w/2;
  const lacquer=gradient(c,x,w,['#40251e','#80503a','#603524','#87543a','#3b241c']);
  box(c,x,y-230,w,22,lacquer);box(c,x,y-232,w,3,'#c29c57');box(c,x,y-209,w,3,'#a67f45');
  // Repeated corbels and carved beam panels establish a deep ceremonial interior.
  for(let px=x+40;px<x+w-30;px+=120){
    box(c,px-8,y-205,96,7,'#bc9455');box(c,px+2,y-198,76,6,'#73472c');
    for(const dx of [6,58]){box(c,px+dx,y-192,10,15,'#a47b42');box(c,px+dx-4,y-180,18,4,'#c29d60');}
  }
  box(c,cx-119,y-195,238,55,'#321f19',5);box(c,cx-115,y-191,230,47,'#bd9658',4);box(c,cx-110,y-186,220,37,'#5a2c24',3);
  c.textAlign='center';c.font='20px Arial';c.fillStyle='#f0d49a';c.fillText('CHÁNH ĐIỆN',cx,y-160);
  for(const side of [-1,1]){
    const px=cx+side*225;
    const g=gradient(c,px-13,26,['#532a22','#ae6242','#743c2b']);box(c,px-13,y-204,26,196,g,3);
    box(c,px-18,y-21,36,14,'#aa8752',3);box(c,px-17,y-202,34,9,'#cfad6b',2);
  }
}
