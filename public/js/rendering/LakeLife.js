const CRABS=[[.18,.80],[.34,.90],[.69,.89],[.84,.79]];
const SHRIMP=[[.12,.57],[.21,.67],[.31,.74],[.73,.68],[.82,.55],[.62,.78]];

export function drawLakeLife(c,lake,time,reduced,quality='high'){
  const sway=(phase,amount)=>reduced?0:Math.sin(time*1.8+phase)*amount;
  const count=quality==='low'?.55:1;
  for(let i=0;i<CRABS.length;i++){
    const [u,v]=CRABS[i],x=lake.x+(u-.5)*lake.rx*1.72,y=lake.y+(v-.5)*lake.ry*1.72,step=sway(i*1.7,2.2);
    c.save();c.translate(x,y);c.globalAlpha=.82;
    c.fillStyle='#b96e52';c.beginPath();c.ellipse(0,0,8,5,0,0,Math.PI*2);c.fill();
    c.fillStyle='#d08a67';c.beginPath();c.ellipse(0,-1,6,4,0,Math.PI,Math.PI*2);c.fill();
    for(const side of [-1,1]){
      for(let leg=0;leg<3;leg++){const sy=1+leg*1.2,dx=side*(8+leg);c.strokeStyle='#a95746';c.lineWidth=1.3;c.beginPath();c.moveTo(side*4,sy);c.lineTo(dx,sy+2+step);c.lineTo(dx+side*2,sy+5-step);c.stroke();}
      c.strokeStyle='#b96750';c.lineWidth=1.7;c.beginPath();c.moveTo(side*5,-1);c.lineTo(side*10,-5);c.stroke();
      c.beginPath();c.arc(side*11,-6,2.2,side<0?Math.PI:0,side<0?Math.PI*2:Math.PI);c.stroke();
      c.fillStyle='#f1d6a6';c.beginPath();c.arc(side*4,-2,.8,0,Math.PI*2);c.fill();
    }
    c.restore();
  }
  for(let i=0;i<Math.ceil(SHRIMP.length*count);i++){
    const [u,v]=SHRIMP[i],x=lake.x+(u-.5)*lake.rx*1.45,y=lake.y+(v-.5)*lake.ry*1.45,wiggle=sway(i,1.5);
    c.save();c.translate(x,y);c.rotate((i%2?1:-1)*.18);
    c.strokeStyle='#edaa82';c.lineWidth=1;c.beginPath();c.moveTo(-7,-2);c.quadraticCurveTo(-1,-6+wiggle,5,-2);c.lineTo(8,0);c.stroke();
    for(let k=0;k<3;k++){c.fillStyle=['#e5a080','#c97967','#efbd91'][k];c.beginPath();c.ellipse(-4+k*3.6,-2,2.6,2.2,0,0,Math.PI*2);c.fill();}
    c.strokeStyle='#f1c6a1';c.lineWidth=.7;c.beginPath();c.moveTo(6,-2);c.quadraticCurveTo(10,-6,12,-5);c.moveTo(6,-1);c.quadraticCurveTo(11,1,13,0);c.stroke();
    c.restore();
  }
  for(let i=0;i<3;i++){
    const phase=i*2.1,x=lake.x+Math.sin(time*.18+phase)*lake.rx*.42,y=lake.y-lake.ry*.23+Math.cos(time*.28+phase)*lake.ry*.38;
    const flutter=reduced?0:Math.abs(Math.sin(time*12+phase))*3.4;
    c.save();c.translate(x,y);c.globalAlpha=.8;
    for(const side of [-1,1]){c.fillStyle=side<0?'#e9cc7d99':'#a7d8c399';c.beginPath();c.ellipse(side*3,-flutter*.3,3.5,1.8,side*.5,0,Math.PI*2);c.fill();}
    c.strokeStyle='#34473c';c.lineWidth=.8;c.beginPath();c.moveTo(-4,0);c.lineTo(4,0);c.stroke();
    c.fillStyle='#293a32';c.beginPath();c.arc(0,0,.8,0,Math.PI*2);c.fill();c.restore();
  }
}
