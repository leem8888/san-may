import { FISH_FEED_SECONDS } from '../shared/fishFeeding.js';
const TAU = Math.PI * 2;
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
export function drawFishFeeder(c,o){
  c.save();c.translate(o.x,o.y);oval(c,2,2,22,6,'#12332b55');
  c.fillStyle='#755334';c.fillRect(-3,-42,6,44);
  c.fillStyle='#bd9457';c.beginPath();c.roundRect(-24,-55,48,30,5);c.fill();
  c.fillStyle='#345c4c';c.beginPath();c.roundRect(-21,-52,42,24,3);c.fill();
  oval(c,-2,-40,10,4.5,'#e3c785');c.fillStyle='#e3c785';c.beginPath();c.moveTo(6,-40);c.lineTo(14,-46);c.lineTo(14,-34);c.closePath();c.fill();
  oval(c,-7,-41,1,1,'#2d493d');
  for(const x of [-7,0,7])oval(c,x,-5,2,1.5,'#c99f61');c.restore();
}
export function drawFishFeeding(c,feed,age,lake,reduced,quality){
  if(!feed||age<0||age>=FISH_FEED_SECONDS)return;
  const count=quality==='low'?10:20,seed=[...feed.id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  c.save();
  for(let i=0;i<count;i++){
    const angle=i*2.399+seed,distance=6+(i*17%32),x=feed.x+Math.cos(angle)*distance,y=feed.y+Math.sin(angle)*distance*.5;
    const delay=(i%5)*.09,t=Math.max(0,Math.min(1,(age-delay)/1.15));
    if(age<delay)continue;
    c.globalAlpha=Math.min(1,(FISH_FEED_SECONDS-age)/4)*(age>7?Math.max(0,1-(age-7)/(10+i*.1)):1);
    const px=reduced?x:feed.from.x+(x-feed.from.x)*t;
    const py=reduced?y:feed.from.y+(y-feed.from.y)*t-Math.sin(t*Math.PI)*65;
    oval(c,px+1,py+2,2.3,1.4,'#173e3033');oval(c,px,py,1.8,1.4,i%2?'#e3c182':'#b89051');
  }
  c.globalAlpha=1;c.beginPath();c.ellipse(lake.x,lake.y,lake.rx-3,lake.ry-3,0,0,TAU);c.clip();
  const fade=Math.min(1,age/1.2,(FISH_FEED_SECONDS-age)/4);
  for(let i=0;i<(reduced?2:4);i++){
    const phase=reduced?(i+1)/4:(age*.35+i*.27)%1;
    c.strokeStyle=`rgba(219,233,191,${fade*(1-phase)*.4})`;c.lineWidth=1;
    c.beginPath();c.ellipse(feed.x,feed.y,14+phase*62,6+phase*26,0,0,TAU);c.stroke();
  }
  if(!reduced)for(let i=0;i<6;i++){
    const t=(age*.7+i*.16)%1,a=i*2.399;
    c.strokeStyle=`rgba(245,234,182,${fade*(1-t)*.5})`;c.lineWidth=.8;
    c.beginPath();c.ellipse(feed.x+Math.cos(a)*33,feed.y+Math.sin(a)*14-t*4,1.4+t*2,.8+t,0,0,TAU);c.stroke();
  }
  c.restore();
}
