// Elderly monk: restrained ceremonial colours, curved drapery and a slender khakkhara.
const TAU=Math.PI*2;
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function ink(c,color,width,draw){c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();draw();c.stroke();}
function fill(c,color,draw){c.fillStyle=color;c.beginPath();draw();c.closePath();c.fill();}
function silk(c,x,w,colors){const g=c.createLinearGradient(x,0,x+w,0);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
function sleeve(c,x,y,hx,hy,color,side){
  const ex=(x+hx)/2+side*3,ey=(y+hy)/2;
  fill(c,color,()=>{c.moveTo(x-3.5,y);c.quadraticCurveTo(ex-4,ey+4,hx-3,hy+1);c.quadraticCurveTo(hx,hy+3,hx+3,hy);c.quadraticCurveTo(ex+4,ey-1,x+3.5,y-1);c.quadraticCurveTo(x,y-4,x-3.5,y);});
  ink(c,'#704c3333',.6,()=>{c.moveTo(x+side*2,y+2);c.quadraticCurveTo(ex+side*2,ey+2,hx+side*2,hy);});
  oval(c,hx,hy,3.1,3.3,'#e8c3a5');oval(c,hx-.6,hy-.8,1.7,2,'#f2d6b7');
  ink(c,'#b38f70',.45,()=>{c.moveTo(hx-.8,hy+.3);c.lineTo(hx+.9,hy+1);});
}
function staff(c,x){
  ink(c,'#665039',2.2,()=>{c.moveTo(x,-2);c.lineTo(x,-80);});
  ink(c,'#c2a26a',.8,()=>{c.moveTo(x-.5,-4);c.lineTo(x-.5,-80);});
  oval(c,x,-80,2.5,1.8,'#c1a36a');
  ink(c,'#cbb17a',1,()=>{c.ellipse(x,-87,4.2,7,0,0,TAU);});
  for(const side of [-1,1])for(let i=0;i<2;i++)ink(c,'#b99b61',.75,()=>{c.ellipse(x+side*(3.6+i*1.1),-84+i*2,1.8,2.6,0,0,TAU);});
  oval(c,x,-95,1.5,2.2,'#e2c78d');
}
export function drawAbbot(c,state,frame,dir){
  const t=frame/8,side=dir==='left'?-1:dir==='right'?1:0,back=dir==='up';
  const seated=['sit','meditate'].includes(state),joined=['pray','bow','bead'].includes(state),bow=state==='bow'?Math.sin(t*Math.PI):0;
  c.translate(32,80);oval(c,1,1,17,3.4,'#10291f45');
  if(side)c.scale(.86,1);
  const shoulder=(seated?-32:-56)+bow*7,head=shoulder-13+bow*4,hem=seated?-2:-3;
  const inner=silk(c,-16,32,['#a57841','#ddbd82','#c79b5d','#986f3c']);
  if(!seated){oval(c,-6,-1,4.5,2,'#473e32');oval(c,6,-1,4.5,2,'#473e32');}
  fill(c,inner,()=>{
    c.moveTo(-4,shoulder-2);c.quadraticCurveTo(-10,shoulder-3,-12,shoulder+3);
    c.bezierCurveTo(-14,shoulder+17,-12,hem-14,-17,hem);
    c.quadraticCurveTo(0,hem+4,17,hem);c.bezierCurveTo(12,hem-15,14,shoulder+16,12,shoulder+3);
    c.quadraticCurveTo(9,shoulder-3,4,shoulder-2);
  });
  if(seated)oval(c,0,-3,19,6,inner);
  // Draped outer robe: a curved shoulder wrap rather than a rectangular grid.
  const outer=silk(c,-15,31,['#684030','#a36b48','#855039','#633d2e']);
  fill(c,outer,()=>{
    c.moveTo(-11,shoulder-1);c.quadraticCurveTo(-6,shoulder-3,-3,shoulder);
    c.bezierCurveTo(1,shoulder+8,7,shoulder+12,12,shoulder+16);
    c.quadraticCurveTo(9,shoulder+35,15,hem);c.quadraticCurveTo(-1,hem+3,-15,hem-1);
    c.quadraticCurveTo(-10,shoulder+22,-11,shoulder-1);
  });
  ink(c,'#cfad72',1,()=>{c.moveTo(-7,shoulder);c.bezierCurveTo(-4,shoulder+10,4,shoulder+16,11,shoulder+18);c.quadraticCurveTo(10,hem-12,14,hem-1);});
  for(let i=0;i<3;i++)ink(c,'#deb67c35',.7,()=>{c.moveTo(-7+i*5,shoulder+20+i*3);c.quadraticCurveTo(-10+i*7,shoulder+35,-8+i*9,hem-3);});
  for(let y=shoulder+28;y<hem-5;y+=13)ink(c,'#c09a6338',.5,()=>{c.moveTo(-10,y);c.quadraticCurveTo(0,y+3,11,y+2);});
  let left=[-9,shoulder+25],right=[23,shoulder+23];
  if(joined){left=[-1.6,shoulder+12];right=[1.6,shoulder+12];}
  if(seated){left=[-4,-10];right=[4,-10];}
  if(state==='wave')right=[19,shoulder-7];
  staff(c,joined||seated?27:23);
  sleeve(c,-11,shoulder+4,...left,outer,-1);sleeve(c,11,shoulder+4,...right,inner,1);
  if(!back)for(let i=0;i<9;i++){const a=Math.PI*(.12+i*.095);oval(c,Math.cos(a)*6.7,shoulder+2+Math.sin(a)*9,1.05,1.05,'#514032');}
  oval(c,0,shoulder-2,3,4,'#c6a282');
  for(const s of side?[-side]:[-1,1]){oval(c,s*7.7,head+2.8,1.9,4.3,'#d7b697');oval(c,s*7.9,head+3, .7,2.3,'#b79577');}
  const skin=silk(c,-9,18,['#c5a488','#eed2b0','#e5c4a1','#bc987b']);
  fill(c,skin,()=>{
    c.moveTo(0,head-11);c.bezierCurveTo(-9,head-11,-9.3,head-3,-7,head+3);
    c.quadraticCurveTo(-5.8,head+9,0,head+10);c.quadraticCurveTo(5.8,head+9,7,head+3);
    c.bezierCurveTo(9.3,head-3,9,head-11,0,head-11);
  });
  oval(c,-2.8,head-7,3.2,1.4,'#fff0d93b');
  if(back)return;
  const dx=side*2.2;
  if(side)fill(c,skin,()=>{c.moveTo(side*6.3,head-1);c.quadraticCurveTo(side*8,head,side*9.3,head+2);c.quadraticCurveTo(side*8.4,head+3.3,side*6.6,head+3);});
  // Gentle eyes, fine silver brows and sparse wrinkles retain a calm expression.
  for(const s of side?[side]:[-1,1]){
    const x=s*3.3+dx;
    ink(c,'#e6e1cc',1.1,()=>{c.moveTo(x-2.1,head-3.7);c.quadraticCurveTo(x,head-5,x+2.1,head-3.9);});
    ink(c,'#5c5142',.7,()=>{c.moveTo(x-1.6,head-.6);c.quadraticCurveTo(x,head-1.5,x+1.6,head-.7);});
    if(!joined&&!seated)oval(c,x,head-.7,.65,.7,'#4a463b');
    ink(c,'#a3866b66',.5,()=>{c.moveTo(x-1.7,head+1);c.quadraticCurveTo(x,head+2,x+1.7,head+1);});
    ink(c,'#b28f7166',.5,()=>{c.moveTo(s*5.6+dx*.5,head+4);c.quadraticCurveTo(s*5.8,head+5.6,s*4.7,head+7);});
  }
  ink(c,'#b995754d',.5,()=>{c.moveTo(-3,head-7);c.quadraticCurveTo(0,head-7.5,3,head-7);});
  ink(c,'#b69474',.6,()=>{c.moveTo(dx,head-.2);c.quadraticCurveTo(dx-1.5,head+2.7,dx+.8,head+3);});
  ink(c,'#936f58',.65,()=>{c.moveTo(dx-2.1,head+5.7);c.quadraticCurveTo(dx,head+7,dx+2.1,head+5.7);});
  oval(c,dx,head+8,2.5,.6,'#f8ddba44');
}
