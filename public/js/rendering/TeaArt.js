// Presentation only: TeaGame keeps its original timing, pouring and completion rules.
const TAU=Math.PI*2;
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function box(c,x,y,w,h,color,r=4){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function gradient(c,x,w,colors){const g=c.createLinearGradient(x,0,x+w,0);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
export function drawTea(c,g,color){
  const background=c.createLinearGradient(0,0,0,600);background.addColorStop(0,'#1e3c35');background.addColorStop(.6,'#35483a');background.addColorStop(1,'#171f1b');c.fillStyle=background;c.fillRect(0,0,1000,600);
  box(c,630,55,290,215,'#9a8058',12);box(c,638,63,274,199,gradient(c,638,274,['#6f9783','#b2bfa0','#789b86']),8);
  for(let i=0;i<5;i++){c.strokeStyle='#436951';c.lineWidth=3;c.beginPath();c.moveTo(660+i*57,263);c.quadraticCurveTo(690+i*45,130,655+i*60,65);c.stroke();}
  for(let i=1;i<4;i++)box(c,635+i*70,60,5,206,'#826b48');box(c,637,156,277,5,'#826b48');
  const steps=['Chọn trà','Đun nước','Rót trà','Thưởng trà'],active=['choose','boil','pour','sip'].indexOf(g.step);
  for(let i=0;i<4;i++){box(c,65+i*135,32,124,35,i===active?'#d7bc83':'#18342de0',16);c.fillStyle=i===active?'#243d32':'#d3d4b8';c.font='15px Arial';c.textAlign='center';c.fillText(`${i+1} · ${steps[i]}`,127+i*135,55);}
  // Warm timber grain and a bamboo tray ground the tea service.
  box(c,50,372,900,190,'#483326',24);box(c,42,350,916,51,gradient(c,42,916,['#715038','#bc9060','#8c6543']),18);
  for(let i=0;i<13;i++){c.strokeStyle=i%2?'#d5b38030':'#3e2b1b33';c.lineWidth=1;c.beginPath();c.moveTo(65,357+i*13);c.bezierCurveTo(300,350+i*13,650,370+i*13,935,358+i*13);c.stroke();}
  oval(c,470,395,315,34,'#1d251f44');box(c,175,347,620,71,'#5f4d32',15);box(c,184,341,602,63,'#a38c58',12);
  for(let i=0;i<25;i++)box(c,199+i*23,352,2,40,'#655a3544',0);
  // Brazier, kettle handle and spout.
  box(c,435,307,130,57,gradient(c,435,130,['#343e36','#657064','#3a4338']),9);
  oval(c,500,314,48,10,g.holding&&g.step==='boil'?'#eead63':'#b07945');
  c.strokeStyle='#b5ac82';c.lineWidth=8;c.beginPath();c.arc(500,262,49,Math.PI,TAU);c.stroke();
  oval(c,500,273,58,43,gradient(c,442,116,['#243e36','#789283','#3d5d4c']));
  c.strokeStyle='#749081';c.lineWidth=13;c.beginPath();c.moveTo(551,266);c.quadraticCurveTo(579,254,594,235);c.stroke();
  oval(c,500,238,30,7,'#839985');oval(c,500,230,7,7,'#b0b392');
  // Glazed teapot and matching cup.
  const tilt=g.step==='pour'&&g.holding?-.55:0;
  c.save();c.translate(300,330);c.rotate(tilt);
  c.strokeStyle='#b3bda0';c.lineWidth=9;c.beginPath();c.ellipse(-65,-3,25,30,0,0,TAU);c.stroke();
  oval(c,0,0,65,43,gradient(c,-65,130,['#587769','#c0cbb1','#789981','#3f6554']));
  c.strokeStyle='#91ac94';c.lineWidth=13;c.beginPath();c.moveTo(53,-8);c.quadraticCurveTo(84,-11,104,-36);c.stroke();
  oval(c,0,-39,32,8,'#abbfa3');oval(c,0,-49,8,7,'#c7cfaf');
  c.strokeStyle='#d8c492';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-1,52,31,0,.2,Math.PI-.2);c.stroke();c.restore();
  oval(c,690,378,70,15,'#30463c55');oval(c,690,369,66,13,'#b8bba0');oval(c,690,366,58,10,'#e2dfc6');
  c.fillStyle=gradient(c,635,110,['#b8c2ac','#f2edda','#9cafa0']);c.beginPath();c.moveTo(635,307);c.lineTo(649,361);c.quadraticCurveTo(690,382,731,361);c.lineTo(745,307);c.closePath();c.fill();
  oval(c,690,307,55,13,'#eee9d2');oval(c,690,308,47,9,'#a49b75');
  if(g.fill>0){oval(c,690,308,46,8.5,color);oval(c,681,305,27,2,'#fff0bf44');}
  if(g.step==='pour'&&g.holding){c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.moveTo(300+104*Math.cos(tilt)+36*Math.sin(tilt),330+104*Math.sin(tilt)-36*Math.cos(tilt));c.quadraticCurveTo(570,245,690,307);c.stroke();}
  // Fill gauge is separate from the ceramic cup, so the target is legible on phones.
  box(c,826,294,22,106,'#182e28',10);box(c,830,396-Math.min(100,g.fill),14,Math.max(1,Math.min(100,g.fill)),color,6);
  for(const f of [70,92]){c.strokeStyle='#edd5a2';c.lineWidth=2;c.beginPath();c.moveTo(821,396-f);c.lineTo(853,396-f);c.stroke();}
  c.font='14px Arial';c.textAlign='center';c.fillStyle='#e4d5ac';c.fillText(`${Math.round(g.fill)}%`,838,424);
  for(const s of g.steam){c.strokeStyle=`rgba(235,235,216,${.38*(1-s.age/2.4)})`;c.lineWidth=2;c.beginPath();c.moveTo(s.x,s.y-s.age*55);c.bezierCurveTo(s.x-14,s.y-15-s.age*55,s.x+12,s.y-28-s.age*55,s.x,s.y-40-s.age*55);c.stroke();}
  c.textAlign='left';c.fillStyle='#f2e3bf';c.font='24px Arial';c.fillText(g.tea?`Ấm ${g.tea}`:'Một chén trà, một khoảng lặng',74,114);
  c.font='15px Arial';c.fillStyle='#c5d0b6';c.fillText('Chậm rãi từng bước · giữ để đun và rót, thả tay khi vừa đủ',74,143);
  if(g.step==='boil'){box(c,75,170,320,9,'#142f29',4);box(c,75,170,g.temp/100*320,9,'#ddb575',4);c.fillText(`${Math.round(g.temp)} °C`,75,203);}
}
