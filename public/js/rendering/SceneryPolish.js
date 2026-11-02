function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function box(c,x,y,w,h,color,r=1){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
export function vegetablePatch(c,o){
  const {x,y}=o;c.save();c.translate(x,y);
  box(c,-165,-95,330,190,'#a18b62',7);box(c,-159,-90,318,179,'#5c4833',4);
  for(let row=0;row<4;row++){
    box(c,-150,-79+row*43,300,32,'#756043',5);
    for(let col=0;col<7;col++){
      const px=-128+col*42,py=-65+row*43;
      oval(c,px+2,py+3,12,5,'#293d2855');
      for(let k=0;k<5;k++){const a=k*1.26;c.save();c.translate(px,py);c.rotate(a);oval(c,0,-4,5,9,['#547c45','#87a560','#6e9650'][k%3]);c.restore();}
      oval(c,px,py,4,3,'#adc17a');
    }
  }
  box(c,140,-96,3,36,'#92764f');box(c,112,-108,59,17,'#c5b48a',2);
  c.font='10px Arial';c.textAlign='center';c.fillStyle='#3b5136';c.fillText('VƯỜN RAU',142,-96);c.restore();
}
export function bookStack(c,o){
  for(let i=0;i<4;i++){
    const x=o.x-20+(i%2)*3,y=o.y-i*5;
    box(c,x,y,40,5,['#8e5140','#4e7365','#b18b50','#69678a'][i],1);box(c,x+3,y+1,33,2,'#ded3b2');
  }
  c.strokeStyle='#bfa267';c.lineWidth=1;c.beginPath();c.moveTo(o.x+9,o.y-16);c.lineTo(o.x+10,o.y+6);c.stroke();
}
export function fern(c,o){
  c.save();c.translate(o.x,o.y);oval(c,0,1,22,5,'#123a2a33');
  for(let i=-3;i<=3;i++){
    const dx=i*8,dy=-23+Math.abs(i)*3;
    c.strokeStyle='#78915c';c.lineWidth=1;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(dx*.2,dy,dx,dy);c.stroke();
    for(let k=1;k<5;k++){const t=k/5;oval(c,dx*t-3,dy*t,5,1.8,k%2?'#5d8553':'#74935b');oval(c,dx*t+3,dy*t-1,5,1.8,'#426e47');}
  }c.restore();
}
export function libraryWindow(c,o){
  const{x,y}=o;box(c,x-45,y-100,90,100,'#ae8d55',25);box(c,x-39,y-94,78,88,'#42635a',22);
  const g=c.createLinearGradient(0,y-94,0,y);g.addColorStop(0,'#6e9583');g.addColorStop(1,'#c5cfaa');
  box(c,x-35,y-90,70,80,g,20);
  for(const dx of [-23,0,23])box(c,x+dx-1,y-85,2,79,'#785b3b');box(c,x-35,y-53,70,3,'#8d7149');
  box(c,x-49,y-5,98,8,'#c0a371',3);
}
