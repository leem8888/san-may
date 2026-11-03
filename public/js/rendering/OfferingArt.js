function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function box(c,x,y,w,h,color,r=1){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,x,y,xx,yy,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
export function drawOffering(c,x,y,sku,time=0,reduced=false){
  c.save();c.translate(x,y);
  oval(c,1,2,18,5,'#26302555');oval(c,0,0,19,5,'#a78142');oval(c,0,-2,17,4,'#ddbd75');
  if(sku==='fruit'){
    for(const [px,py,r,color] of [[-10,-7,5,'#dc9d42'],[0,-7,6,'#b75943'],[9,-6,5,'#7d9c50'],[-4,-12,5,'#e2b24f'],[6,-13,4,'#a8b060']]){
      oval(c,px,py,r,r*.9,color);oval(c,px-1.5,py-2,1.6,1,'#fff1bc55');box(c,px,py-r,1,3,'#64543a');
    }
  }else if(sku==='flowers'){
    for(const px of [-8,6]){box(c,px,-13,1,9,'#718448');for(let i=-2;i<=2;i++){c.save();c.translate(px,-15);c.rotate(i*.4);oval(c,0,-3,3,8,i%2?'#e6a1ad':'#f2bfca');c.restore();}oval(c,px,-13,2,2,'#edd083');}
    oval(c,0,-2,5,2,'#ece5cd');oval(c,0,-3,3.7,1,'#92b8b0');
  }else{
    box(c,-7,-12,14,10,'#865236',2);
    for(let i=-1;i<=1;i++){
      const tip=-35+Math.abs(i)*2;c.strokeStyle='#ad6042';c.lineWidth=1.2;c.beginPath();c.moveTo(i*3,-10);c.lineTo(i*4,tip);c.stroke();
      oval(c,i*4,tip,1,1,'#f3b467');
      if(!reduced){c.strokeStyle='#e2ddd05e';c.lineWidth=1;c.beginPath();c.moveTo(i*4,tip-2);c.bezierCurveTo(i*4+Math.sin(time+i)*3,tip-8,i*4-3,tip-15,i*4+Math.sin(time*.7)*5,tip-23);c.stroke();}
    }
  }
  c.restore();
}
function table(c,x,y,width){
  const g=c.createLinearGradient(x-width/2,0,x+width/2,0);g.addColorStop(0,'#583824');g.addColorStop(.3,'#a3774a');g.addColorStop(1,'#64422c');
  for(const side of [-1,1])box(c,x+side*(width/2-12)-4,y-20,8,24,g);
  box(c,x-width/2,y-32,width,14,g,3);box(c,x-width/2+2,y-31,width-4,2,'#d5ad6e');
  box(c,x-width/2+7,y-18,width-14,7,'#75472e');
}
export function drawOfferingStand(c,o){
  oval(c,o.x,o.y+4,58,9,'#152b2544');table(c,o.x,o.y,112);
  c.font='9px system-ui';c.textAlign='center';c.fillStyle='#efd4a0';c.fillText('DÂNG LỄ',o.x,o.y-7);
}
export function drawOfferingStall(c,o){
  const {x,y}=o;oval(c,x,y+5,95,13,'#10282055');
  for(const dx of [-86,86]){box(c,x+dx-3,y-128,6,130,'#775638');box(c,x+dx-1,y-128,1,130,'#bc9860');}
  // A friendly vendor behind the counter.
  oval(c,x,y-71,10,13,'#dfb38c');oval(c,x,y-81,11,6,'#41352c');
  c.fillStyle='#7c8b65';c.beginPath();c.moveTo(x-15,y-58);c.quadraticCurveTo(x,y-66,x+15,y-58);c.lineTo(x+20,y-25);c.lineTo(x-20,y-25);c.closePath();c.fill();
  for(const dx of [-4,4])oval(c,x+dx,y-71,1,1.3,'#493e2c');
  table(c,x,y,164);box(c,x-78,y-27,156,13,'#9b6548');
  drawOffering(c,x-50,y-34,'incense',0,true);drawOffering(c,x,y-34,'fruit');drawOffering(c,x+50,y-34,'flowers');
  // Deep, tiled roof with visible rafters and a warm carved fascia.
  c.fillStyle='#4b3829';c.beginPath();c.moveTo(x-108,y-116);c.lineTo(x-72,y-151);c.lineTo(x+72,y-151);c.lineTo(x+108,y-116);c.closePath();c.fill();
  c.fillStyle='#3e5c48';c.beginPath();c.moveTo(x-101,y-120);c.lineTo(x-68,y-146);c.lineTo(x+68,y-146);c.lineTo(x+101,y-120);c.closePath();c.fill();
  line(c,x-108,y-116,x+108,y-116,'#d1ad70',3);line(c,x-72,y-151,x+72,y-151,'#d8bb83',2);
  for(let row=0;row<3;row++)for(let col=-4;col<=4;col++){
    const tx=x+col*(14+row*2),ty=y-126-row*8;
    line(c,tx-7,ty,tx+7,ty-1,'#9bad8266',1);
    if((col+row)%2===0)line(c,tx-6,ty-5,tx-1,ty-12,'#b8a27455',1);
  }
  for(let i=-5;i<=5;i++)line(c,x+i*17,y-119,x+i*13,y-143,'#d4b77d44',1);
  box(c,x-63,y-110,126,23,'#5f3928',3);c.strokeStyle='#cfaa69';c.lineWidth=1;c.strokeRect(x-60,y-108,120,19);
  c.textAlign='center';c.font='12px Arial';c.fillStyle='#f1d79c';c.fillText('HƯƠNG & MÂM LỄ',x,y-94);
  // Carved product cubbies and a linen counter valance make the offerings feel stocked.
  for(const dx of [-68,68]){
    box(c,x+dx-11,y-48,22,20,'#65442f',3);box(c,x+dx-9,y-46,18,14,'#d2bd8d',2);
    for(let k=0;k<3;k++)oval(c,x+dx-5+k*5,y-41,2,3,k===1?'#d0a056':'#9b7050');
    box(c,x+dx-12,y-51,24,3,'#b78f58',1);
  }
  box(c,x-78,y-18,156,21,'#b9a477',2);box(c,x-78,y-18,156,3,'#ead5a4');
  for(let dx=-70;dx<=70;dx+=14){c.fillStyle=dx%28?'#9e4937':'#c5a967';c.beginPath();c.moveTo(x+dx-7,y+3);c.quadraticCurveTo(x+dx,y+10,x+dx+7,y+3);c.closePath();c.fill();}
  c.font='9px system-ui';c.fillStyle='#5c4632';c.fillText('HƯƠNG · HOA · LỄ',x,y-5);
  for(const side of [-1,1]){
    c.strokeStyle='#bb975c';c.lineWidth=1;c.beginPath();c.moveTo(x+side*76,y-110);c.lineTo(x+side*76,y-91);c.stroke();
    oval(c,x+side*76,y-82,7,10,'#b84e39');oval(c,x+side*76-2,y-83,2,6,'#e3a66a');
    box(c,x+side*76-5,y-93,10,2,'#d5b372');box(c,x+side*76-4,y-73,8,2,'#cda460');
  }
  // A small hanging bundle of incense and a woven basket beside the counter.
  box(c,x-95,y-66,10,28,'#71472f',2);box(c,x-97,y-69,14,4,'#c39a5b',1);
  for(let i=0;i<4;i++)line(c,x-93+i*2,y-65,x-96+i*2,y-49,'#b76a47',1);
  oval(c,x+97,y-27,10,4,'#815a38');oval(c,x+97,y-31,8,4,'#d6bb82');
}
