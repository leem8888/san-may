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
  const seated=['sit','meditate'].includes(state),swing=state==='walk'?Math.sin(t*TAU):0;
  c.translate(32,80);oval(c,0,1,18,4,'#11292255');
  c.scale(side ? .9 : 1,1);c.translate(0,-Math.abs(swing)*1.1);
  const shoulder=(seated?-25:-36)+bow*5,head=shoulder-16+bow*4;
  if(!back)broom(c,joined||state==='wave'||seated);
  if(seated){oval(c,0,-3,17,6,'#4d5048');oval(c,-11,-2,6,3,'#353a34');oval(c,11,-2,6,3,'#353a34');}
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

function staff(c,x,y,time){
  const metal=shaded(c,x-3,6,['#72522c','#e7c982','#a78043']);
  line(c,[[x,y],[x,y-76]],'#4b3926',3.8);line(c,[[x-.5,y],[x-.5,y-76]],metal,2.4);
  oval(c,x,y-78,4,3,'#d6b568');
  c.strokeStyle='#ddbe78';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y-85,5,8,0,0,TAU);c.stroke();
  for(const s of [-1,1])for(let i=0;i<2;i++){
    const sway=Math.sin(time*TAU+i)*.5;
    c.beginPath();c.ellipse(x+s*(4+i*1.5),y-81+i*2+sway,2.4,3.4,0,0,TAU);c.stroke();
  }
  oval(c,x,y-94,2,3,'#f0d392');
}
export function drawAbbot(c,state,frame,dir){
  const t=frame/8,side=dir==='left'?-1:dir==='right'?1:0,back=dir==='up',bow=state==='bow'?Math.sin(t*Math.PI):0;
  const seated=['sit','meditate'].includes(state),joined=['pray','bow','bead'].includes(state);
  c.translate(32,80);oval(c,0,1,21,4.5,'#11292255');
  const shoulder=(seated?-32:-54)+bow*7,head=shoulder-13+bow*4,hem=seated?-2:-3;
  const robe=shaded(c,-20,40,['#ba7940','#efd18a','#c5954c','#956331']);
  if(!seated){oval(c,-7,-1,5,2.5,'#483b2c');oval(c,7,-1,5,2.5,'#483b2c');}
  path(c,[[-13,shoulder],[13,shoulder],[20,hem],[-20,hem]],robe);
  if(seated)oval(c,0,-3,21,7,robe);
  for(const s of [-1,1])line(c,[[s*6,shoulder+12],[s*12,hem-3]],'#94653466',1);
  // Burgundy kashaya drapes diagonally over a saffron inner robe.
  path(c,[[-14,shoulder-1],[-3,shoulder+1],[14,shoulder+19],[18,hem-1],[-15,hem-1]],shaded(c,-16,34,['#6a2e28','#a35339','#7b3429']));
  line(c,[[-10,shoulder],[-2,shoulder+12],[15,shoulder+24],[18,hem-1]],'#e0b866',1.7);
  for(let y=shoulder+19;y<hem-4;y+=10)line(c,[[-12,y],[13+(y>shoulder+30?2:0),y+3]],'#c4965255',.8);
  for(const x of [-6,5])line(c,[[x,shoulder+18],[x+2,hem-4]],'#d8ae6455',.8);
  let left=[-10,shoulder+24],right=[22,shoulder+20];
  if(joined){left=[-2,shoulder+11];right=[2,shoulder+11];}
  if(seated){left=[-4,-10];right=[4,-10];}
  if(state==='wave')right=[20,shoulder-8];
  // The staff rests at his side while he joins both palms.
  staff(c,joined||seated?28:22,-2,t);
  arm(c,[-12,shoulder+3],left,'#b48046',8,-4);arm(c,[12,shoulder+3],right,'#d4aa62',8,3);
  if(!back)for(let i=0;i<11;i++){const a=Math.PI*(.08+i*.084);oval(c,Math.cos(a)*9,shoulder+1+Math.sin(a)*12,1.5,1.5,'#48332b');}
  oval(c,0,shoulder-2,3.2,4,'#c3a07d');
  for(const s of [-1,1]){oval(c,s*9,head+3,2.5,6,'#cfac87');oval(c,s*9,head+4,1,3.5,'#b58a6d');}
  oval(c,side*.8,head,9,11,shaded(c,-9,18,['#c8a582','#efcea7','#c6a07c']));
  oval(c,-2,head-7,4,1.5,'#fff1d14d');
  if(back){oval(c,0,head-3,7,6,'#bdb3a32b');return;}
  const dx=side*2;
  // White eyebrows, crow's feet and fine cheek creases convey age without caricature.
  for(const s of [-1,1]){
    const x=s*4+dx;line(c,[[x-2.5,head-3.7],[x,head-4.7],[x+2.5,head-3.8]],'#ede9d7',1.5);
    line(c,[[x-1.7,head-.8],[x+.8,head-.3],[x+1.8,head-1]],'#534739',.8);
    line(c,[[x-2,head+1.5],[x+1.5,head+1.8]],'#a7816188',.6);
    line(c,[[s*6+dx,head+4],[s*6.3+dx,head+7]],'#ac846388',.65);
  }
  for(const y of [-8,-6.5])line(c,[[-3,head+y],[0,head+y-.4],[3,head+y]],'#b28d6b66',.5);
  line(c,[[dx,head],[dx-1,head+3],[dx+1,head+3]],'#b18561',.65);
  c.strokeStyle='#976b51';c.lineWidth=.7;c.beginPath();c.arc(dx,head+5,2.2,.2,Math.PI-.2);c.stroke();
}
