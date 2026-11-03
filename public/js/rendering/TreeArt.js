const cache = new Map();
function oval(c, x, y, rx, ry, color) { c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); }
function treeImage(o, pine) {
  const key = `${pine}|${Boolean(o.blossom)}|${Math.floor(o.x * 7 + o.y) % 19}`;
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 270;
  const c = canvas.getContext('2d'); c.translate(150, 245);
  let seed = Math.floor(o.x * 17 + o.y * 31) >>> 0;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const bark = c.createLinearGradient(-15, 0, 15, 0); bark.addColorStop(0, '#3d3025'); bark.addColorStop(.35, '#9b7c55'); bark.addColorStop(.6, '#705338'); bark.addColorStop(1, '#453528');
  c.fillStyle = bark; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(-9, -12, -9, -74); c.lineTo(-5, pine ? -180 : -120); c.lineTo(5, pine ? -180 : -120); c.quadraticCurveTo(6, -39, 13, -8); c.lineTo(24, 1); c.lineTo(9, -1); c.lineTo(0, -7); c.lineTo(-9, 1); c.closePath(); c.fill();
  c.lineCap = 'round';
  for (const [x, y] of pine ? [[-30,-80],[30,-100]] : [[-52,-117],[43,-134],[-20,-149]]) {
    c.strokeStyle = '#705439'; c.lineWidth = 8; c.beginPath(); c.moveTo(0,-49); c.quadraticCurveTo(x * .25,-88,x,y); c.stroke();
  }
  for (let i = 0; i < 6; i++) { c.strokeStyle = i % 2 ? '#372a2266' : '#c09a6355'; c.lineWidth = .9; c.beginPath(); c.moveTo(-7 + i * 3,-5); c.quadraticCurveTo(-5 + i * 2,-42,-4 + i * 1.5,-83); c.stroke(); }
  const palette = o.blossom ? ['#78505d','#a96d7e','#cb8e9d','#e0abb5','#edc0c5'] : ['#244638','#305541','#426b4e','#59815a','#7a9866'];
  const clusters = pine ? Array.from({length:5},(_,i)=>[0,-49-i*33,62-i*10,20]) : [[-61,-116,48,32],[53,-119,50,33],[-34,-151,54,37],[29,-154,55,37],[0,-120,65,38],[0,-178,43,28]];
  for (const [x,y,rx,ry] of clusters) {
    const g = c.createRadialGradient(x-rx*.3,y-ry*.45,2,x,y,rx); g.addColorStop(0,palette[3]); g.addColorStop(.55,palette[2]); g.addColorStop(1,palette[0]); oval(c,x,y,rx,ry,g);
    // Layer a quiet underside shadow and a few broad leaf highlights so the crown reads as layered foliage.
    const shade=c.createLinearGradient(x,y-ry,x,y+ry);shade.addColorStop(0,'#ffffff00');shade.addColorStop(.62,'#142c2540');shade.addColorStop(1,'#10251f70');oval(c,x,y,rx,ry,shade);
    for(let k=0;k<4;k++)oval(c,x-rx*.52+k*rx*.28,y-ry*.35+(k%2)*ry*.16,rx*.13,ry*.09,'#d7d69a20');
    for (let i=0;i<45;i++) {
      const a=random()*Math.PI*2,d=Math.sqrt(random()),lx=x+Math.cos(a)*rx*d,ly=y+Math.sin(a)*ry*d;
      oval(c,lx,ly,2+random()*4,pine?1.3:1.5+random()*2,palette[Math.floor(random()*palette.length)]);
      if(o.blossom&&i%6===0){for(let k=0;k<5;k++)oval(c,lx+Math.cos(k*1.26)*2,ly+Math.sin(k*1.26)*1.6,1.8,1.3,'#f7d7d9');oval(c,lx,ly,.8,.8,'#eac979');}
    }
  }
  if (cache.size >= 48) cache.delete(cache.keys().next().value);
  cache.set(key,canvas); return canvas;
}
export function drawTree(c,o,env,pine=false) {
  const s=o.size || 1, sh=env.shadow;
  c.save(); c.translate(o.x,o.y); c.scale(s,s);
  oval(c,sh.dx * (pine ? 1 : 1.6),4,(pine?60:100)*sh.stretch,pine?18:27,`rgba(8,28,30,${sh.alpha})`);
  const bend=env.reduced ? 0 : Math.sin(env.time*.8+o.x)*(.004+env.wind*.004);
  c.transform(1,0,bend,1,0,0); c.drawImage(treeImage(o,pine),-150,-245); c.restore();
}
