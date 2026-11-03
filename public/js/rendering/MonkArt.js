// Dedicated NPC silhouettes: a round-faced novice and an elderly abbot in ceremonial robes.
const TAU = Math.PI * 2;
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
function path(c,pts,color){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
function line(c,pts,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function shaded(c,x,w,colors){const g=c.createLinearGradient(x,0,x+w,0);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
function arm(c,shoulder,hand,color,wide=6,bend=0){
  const elbow=[(shoulder[0]+hand[0])/2+bend,(shoulder[1]+hand[1])/2+2];
  line(c,[shoulder,elbow,hand],'#30332d',wide+1.5);line(c,[shoulder,elbow,hand],color,wide);
  oval(c,hand[0],hand[1],3.1,3.3,'#e8c3a5');oval(c,hand[0]-.6,hand[1]-.8,1.5,1.5,'#f6d6b7');
}
function broom(c,standing){
  c.save(); if(standing)c.translate(26,0);else{c.translate(24,2);c.rotate(-.69);}
  line(c,[[0,-67],[0,-8]],'#403e32',3);line(c,[[-.4,-66],[-.4,-8]],'#b6a67a',1.7);
  path(c,[[-3,-12],[3,-12],[8,1],[-9,1]],'#93876a');
  for(let i=-4;i<=4;i++)line(c,[[i*.6,-11],[i*2,1+(i%2)]],i%2?'#5c5e49':'#c3ae77',.8);
  line(c,[[-4,-9],[4,-9]],'#514a35',1.6);c.restore();
}
export function drawNovice(c,state,frame,dir){
  const t=frame/8,side=dir==='left'?-1:dir==='right'?1:0,back=dir==='up';
  const joined=['pray','bow','bead'].includes(state),bow=state==='bow'?Math.sin(t*Math.PI):0;
  const teaSit=state==='teaSit',seated=['sit','teaSit','meditate'].includes(state),swing=state==='walk'?Math.sin(t*TAU):0;
  c.translate(32,80);oval(c,0,1,18,4,'#11292255');
  c.scale(side ? .9 : 1,1);c.translate(0,-Math.abs(swing)*1.1);
  const shoulder=(seated?-25:-36)+bow*5,head=shoulder-16+bow*4;
  if(!back&&!teaSit)broom(c,joined||state==='wave'||seated);
  if(teaSit){oval(c,0,-9,19,6,'#45483f');oval(c,-10,-8,10,4,'#64695d');oval(c,10,-8,10,4,'#555b50');}
  else if(seated){oval(c,0,-3,17,6,'#4d5048');oval(c,-11,-2,6,3,'#353a34');oval(c,11,-2,6,3,'#353a34');}
  else for(const s of [-1,1]){
    const y=-Math.max(0,s*swing)*3;
    line(c,[[s*7,-17],[s*8,y-4]],'#66695d',7);line(c,[[s*8,-9],[s*8,y-3]],'#c3bba3',4.5);
    oval(c,s*8+side,y-1,6,3,'#333b34');oval(c,s*8-1,y-2,3,1,'#6e7462');
  }
  path(c,[[-14,shoulder],[14,shoulder],[17,-13],[-17,-13]],shaded(c,-17,34,['#a1a397','#83877b','#62685e']));
  path(c,[[-14,shoulder],[-7,shoulder-1],[-3,-14],[-15,-13]],'#343d37');
  path(c,[[7,shoulder-1],[14,shoulder],[15,-13],[5,-14]],'#3d453d');
  line(c,[[-5,shoulder],[0,shoulder+6],[5,shoulder]],'#d7d1ba',1.6);
  line(c,[[-14,-15],[15,-15]],'#545d4c',1.5);
  let left=[-8,-38],right=[8,-20];
  if(joined){left=[-2,shoulder+12];right=[2,shoulder+12];}
  else if(state==='wave'){left=[-13,shoulder+14];right=[22+Math.sin(t*TAU)*2,shoulder-8];}
  else if(teaSit){left=[side*16,shoulder+8];right=[side*8,-13];}
  else if(seated){left=[-5,-8];right=[5,-8];}
  else if(state==='walk'){left=[-15,shoulder+16+swing*3];right=[15,shoulder+16-swing*3];}
  // Hands stay visible against the dark vest even when viewed from behind.
  arm(c,[-13,shoulder+3],left,'#96998b',7,-3);arm(c,[13,shoulder+3],right,'#96998b',7,3);
  if(!back)for(let i=0;i<7;i++){const a=Math.PI*(.12+i*.12);oval(c,Math.cos(a)*7,shoulder+2+Math.sin(a)*7,1.4,1.4,'#67513a');}
  oval(c,0,shoulder-1,4,4,'#cfa887');
  const skin=shaded(c,-18,36,['#e0b998','#f5d9bd','#eac8a8','#cfaa8c']);
  oval(c,-17,head+2,3,5,'#dfb99a');oval(c,17,head+2,3,5,'#dfb99a');
  oval(c,side,head,18,18,skin);
  c.strokeStyle='#736d5c88';c.lineWidth=1;c.beginPath();c.ellipse(side,head,18,18,0,Math.PI,TAU);c.stroke();
  oval(c,-6+side,head-11,6,2,'#fff0d04d');
  if(back){oval(c,0,head-4,15,12,'#847f7125');return;}
  const dx=side*4,closed=joined&&state!=='bead';
  for(const s of [-1,1]){
    const x=s*7+dx;
    line(c,[[x-3,head-6],[x,head-7.4],[x+2.4,head-5.6]],'#4b483d',1.2);
    if(closed){c.strokeStyle='#4a4238';c.lineWidth=1.4;c.beginPath();c.arc(x,head-1,2.6,.15,Math.PI-.15);c.stroke();}
    else{oval(c,x,head-1,2.5,3.8,'#3f3d33');oval(c,x-.5,head-2.4,.85,1.2,'#fff7e4');}
    oval(c,s*10+dx*.6,head+6,4,2.3,'#df9c8b66');
  }
  oval(c,dx,head+4,1.3,1,'#ca9a7d');
  c.strokeStyle='#965f4f';c.lineWidth=1;c.beginPath();c.arc(dx,head+7,2.8,.12,Math.PI-.12);c.stroke();
}
