import { drawGateCourtyardView, drawGateCourtyardBackdrop } from './GateCourtyardView.js';
function box(c,x,y,w,h,color,r=1){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function gradient(c,x,w,colors){const g=c.createLinearGradient(x,0,x+w,0);colors.forEach((v,i)=>g.addColorStop(i/(colors.length-1),v));return g;}
function door(c,side,openness){
  c.save();c.translate(side*72,0);
  const width=66*Math.cos(.65+openness*.65),depth=10+openness*5;
  // Perspective hinge: each panel opens into the thickness of the passage.
  c.transform(-side,0,-side*.025,1,0,0);
  const wood=gradient(c,0,width,['#422b20','#95623d','#734329','#38261e']);
  c.fillStyle=wood;c.beginPath();c.moveTo(0,-145);c.lineTo(width,-145-depth);c.lineTo(width,-depth);c.lineTo(0,0);c.closePath();c.fill();
  c.strokeStyle='#b58c50';c.lineWidth=1.3;c.stroke();
  c.save();c.transform(width/66,-depth/66,0,1,0,0);
  for(let i=1;i<6;i++){c.strokeStyle=i%2?'#261d1940':'#d5a16633';c.lineWidth=.7;c.beginPath();c.moveTo(i*11,-139);c.bezierCurveTo(i*11-2,-100,i*11+2,-53,i*11,-7);c.stroke();}
  for(const y of [-130,-103,-28])box(c,3,y,60,4,'#523924');
  for(const x of [10,32,54])for(const y of [-126,-100,-25]){oval(c,x,y,2.1,2.1,'#c4a365');oval(c,x-.4,y-.6,.6,.6,'#f4d794');}
  oval(c,50,-64,5,6,'#a7874f');c.strokeStyle='#e0bf7b';c.lineWidth=1.5;c.beginPath();c.ellipse(50,-59,4,5,0,0,Math.PI*2);c.stroke();
  box(c,4,-91,58,49,'#35291e44',3);c.strokeStyle='#c2985755';c.lineWidth=1;c.strokeRect(7,-88,52,43);
  c.restore();c.restore();
}
export function drawTempleGate(c,o,env,roof){
  const {x,y}=o,sh=env.shadow;
  c.save();c.translate(x,y);
  drawGateCourtyardBackdrop(c);
  oval(c,sh.dx*4,6,330*sh.stretch,30,`rgba(8,28,30,${sh.alpha})`);
  const masonry=gradient(c,-300,600,['#918873','#d5c9a5','#b4a789','#d6c9a6','#8c826e']);
  for(const side of [-1,1]){
    const sx=side*200;
    box(c,sx-70,-150,140,150,masonry,2);box(c,sx-44,-115,88,116,'#827963',43);box(c,sx-36,-108,72,109,'#292b23',35);
    drawGateCourtyardView(c,sx,-104,64,104,side);
    for(const px of [sx-69,sx+61]){
      box(c,px,-150,8,150,gradient(c,px,8,['#5d3528','#b7704d','#6d3c2a']));box(c,px-4,-13,16,13,'#c2b28c',2);
    }
    box(c,sx-70,-145,140,4,'#d0b174');
    roof(c,sx,-222,170,74,'#2b4541','#cfad6e');
    for(let i=-2;i<=2;i++)box(c,sx+i*25-7,-145,14,6,'#957247');
    for(let k=0;k<5;k++)box(c,sx-65,-129+k*26,15,1,'#776d5855');
  }
  box(c,-120,-210,240,210,masonry,3);
  box(c,-82,-176,164,176,'#95876a',78);box(c,-74,-168,148,168,'#1e2c24',70);
  drawGateCourtyardView(c,0,-162,138,164);
  const visitor=env.visitor;
  const distance=visitor?Math.hypot(visitor.x-x,(visitor.y-y)*.8):600;
  const openness = env.reduced ? .65 : .35 + .65 * Math.max(0, 1 - distance / 430);
  door(c,-1,openness);door(c,1,openness);
  for(const px of [-120,108]){
    box(c,px,-210,12,210,gradient(c,px,12,['#5a2d24','#b56b48','#743e2b']));
    box(c,px-5,-16,22,16,'#c7b78f',2);box(c,px-3,-207,18,8,'#caab69',2);
  }
  box(c,-77,-2,154,5,'#d5c59c',1);box(c,-77,3,154,3,'#6e6953',1);
  roof(c,0,-312,300,82);roof(c,0,-380,200,70);
  for(let px=-96;px<108;px+=24){box(c,px,-227,16,6,'#be9b62');box(c,px+3,-221,10,6,'#775537');}
  box(c,-68,-242,136,34,'#61472c',4);box(c,-64,-239,128,28,'#284037',3);
  c.strokeStyle='#d9b879';c.lineWidth=1;c.strokeRect(-60,-236,120,22);
  c.font='15px Arial';c.textAlign='center';c.fillStyle='#f1d59b';c.fillText(o.title||'TAM QUAN',0,-219);
  oval(c,0,-392,6,14,'#d6b56e');oval(c,-1,-397,2,6,'#f3d99a');
  for(const side of [-1,1]){
    c.strokeStyle='#d2ad69';c.lineWidth=2;c.beginPath();c.moveTo(side*15,-378);c.bezierCurveTo(side*48,-389,side*71,-378,side*95,-386);c.quadraticCurveTo(side*111,-394,side*102,-400);c.stroke();
  }
  c.restore();
}
