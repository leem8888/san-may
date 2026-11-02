// Used only while caching the ground, so texture never shimmers between frames.
export function stoneTexture(c,x,y,w,h,random) {
  if(w<5 || h<5) return;
  c.save(); c.beginPath(); c.roundRect(x,y,w,h,2); c.clip();
  const light=c.createLinearGradient(x,y,x+w*.4,y+h);
  light.addColorStop(0,'#f4efcc30'); light.addColorStop(.5,'#ffffff00'); light.addColorStop(1,'#283c3530');
  c.fillStyle=light; c.fillRect(x,y,w,h);
  for(let i=0;i<Math.min(30,w*h/100);i++) { c.fillStyle=i%2?'#f2edcf24':'#26382c20'; c.fillRect(x+random()*w,y+random()*h,.5+random()*2,.5+random()); }
  c.strokeStyle='#ebe4c440'; c.lineWidth=1; c.beginPath(); c.moveTo(x+2,y+h-3); c.lineTo(x+2,y+2); c.lineTo(x+w-2,y+2); c.stroke();
  if(random()<.23) { c.strokeStyle='#44514040'; c.lineWidth=.7; c.beginPath(); c.moveTo(x+w*.6,y); c.lineTo(x+w*.56,y+h*.22); c.lineTo(x+w*.68,y+h*.4); c.stroke(); }
  c.restore();
}
export function steppingStone(c,x,y,rx,ry,random,color) {
  const points=Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,r=.88+random()*.12;return[x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r];});
  const shape=dy=>{c.beginPath();points.forEach(([px,py],i)=>i?c.lineTo(px,py+dy):c.moveTo(px,py+dy));c.closePath();};
  shape(3);c.fillStyle='#20372c88';c.fill();shape(0);c.fillStyle=color;c.fill();
  c.save();shape(0);c.clip();stoneTexture(c,x-rx,y-ry,rx*2,ry*2,random);c.restore();
}
