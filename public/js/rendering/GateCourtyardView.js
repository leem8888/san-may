// Static decorative courtyard behind Tam Quan; independent of gameplay/world state.
function box(c,x,y,w,h,color,r=0){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function roof(c,x,y,w,h){
  c.fillStyle='#395448';c.beginPath();c.moveTo(x-w/2,y+h);c.quadraticCurveTo(x-w*.28,y+h*.65,x-w*.2,y);c.lineTo(x+w*.2,y);c.quadraticCurveTo(x+w*.28,y+h*.65,x+w/2,y+h);c.closePath();c.fill();
  c.strokeStyle='#b69f6d';c.lineWidth=2;c.beginPath();c.moveTo(x-w/2,y+h);c.quadraticCurveTo(x,y+h*.8,x+w/2,y+h);c.stroke();
  for(let i=-5;i<=5;i++){c.strokeStyle='#6b806755';c.lineWidth=1;c.beginPath();c.moveTo(x+i*w*.035,y+7);c.lineTo(x+i*w*.085,y+h-3);c.stroke();}
}
export function drawGateCourtyardBackdrop(c,clipBottom=-94){
  // Stop above the wall's raised coping as the gate is drawn after the wall.
  c.save();c.beginPath();c.rect(-800,-400,1600,400+clipBottom);c.clip();
  const ground=c.createLinearGradient(0,-400,0,5);
  ground.addColorStop(0,'#777d66');ground.addColorStop(.4,'#9c9679');ground.addColorStop(1,'#b1a383');
  c.fillStyle=ground;c.fillRect(-800,-400,1600,405);
  // A continuous paved court, with tile joints converging into the distance.
  c.strokeStyle='#59604d88';c.lineWidth=1;
  for(const y of [-375,-348,-314,-274,-226,-170,-105,-30,5]){
    c.beginPath();c.moveTo(-800,y);c.lineTo(800,y);c.stroke();
    c.strokeStyle='#d6c8a044';c.beginPath();c.moveTo(-800,y+2);c.lineTo(800,y+2);c.stroke();c.strokeStyle='#59604d88';
  }
  for(let i=-12;i<=12;i++){
    c.beginPath();c.moveTo(i*13,-480);c.lineTo(i*110,10);c.stroke();
  }
  // A central approach and low garden strips make the court feel like the next area.
  for(const side of [-1,1]){
    box(c,side<0?-790:650,-325,140,300,'#425e42',4);
    box(c,side<0?-795:645,-327,150,8,'#b4a583',2);
    box(c,side<0?-795:645,-35,150,8,'#887f63',2);
    for(let i=0;i<6;i++){
      const x=side*716+(i%2?18:-12),y=-300+i*44;
      oval(c,x,y,44,14,['#59744a','#647d50','#48683f'][i%3]);
      oval(c,x-10,y-4,17,5,'#8a9b6044');
    }
    // Covered side galleries, behind the open paved area.
    const wing=side*515;
    box(c,wing-190,-353,380,55,'#766c50');box(c,wing-182,-342,364,36,'#3e503e');
    for(let i=-3;i<=3;i++){
      box(c,wing+i*48-3,-344,6,51,'#ad8c5c');box(c,wing+i*48-5,-301,10,6,'#c2b087');
    }
    roof(c,wing,-396,420,48);
    // Distant shade trees and stone lanterns sit at the edge, never on the path.
    const tx=side*610;
    box(c,tx-4,-278,8,70,'#68583e');
    for(let i=0;i<5;i++)oval(c,tx+Math.cos(i*2.4)*28,-285+Math.sin(i*2.4)*15,35,20,['#344f3b','#436346','#57734d'][i%3]);
    const lx=side*450;
    oval(c,lx+7,-124,21,5,'#35453544');box(c,lx-8,-139,16,6,'#95947a',2);box(c,lx-3,-164,6,25,'#aaa88c');
    box(c,lx-9,-182,18,19,'#929780',2);box(c,lx-4,-177,8,8,'#d5be82',1);
    c.fillStyle='#5a6d57';c.beginPath();c.moveTo(lx-15,-182);c.lineTo(lx,-196);c.lineTo(lx+15,-182);c.closePath();c.fill();
  }
  // Main hall silhouette at the far end of the same courtyard.
  box(c,-250,-351,500,87,'#897656',3);box(c,-230,-344,460,69,'#45503c');
  for(let x=-210;x<=210;x+=60){box(c,x-4,-345,8,74,'#b28b57');box(c,x-7,-277,14,7,'#c7b28a',2);}
  box(c,-29,-335,58,65,'#b4a06c');box(c,-22,-329,44,59,'#4e5c43');
  roof(c,0,-400,570,60);roof(c,0,-431,380,54);
  for(let i=0;i<3;i++)box(c,-270-i*7,-267+i*5,540+i*14,5,['#b5a98a','#978d70','#c4b696'][i]);
  const distance=c.createLinearGradient(0,-400,0,-160);
  distance.addColorStop(0,'#78917e24');distance.addColorStop(1,'#78917e00');c.fillStyle=distance;c.fillRect(-800,-400,1600,240);
  // Shadow cast by the front wall ties the paving to the gate threshold.
  const shade=c.createLinearGradient(0,-108,0,-65);
  shade.addColorStop(0,'#24392b00');shade.addColorStop(1,'#24392b40');c.fillStyle=shade;c.fillRect(-800,-108,1600,43);
  c.restore();
}
export function drawGateCourtyardView(c,cx,top,width,height){
  const left=cx-width/2,right=cx+width/2,bottom=top+height,radius=width*.47;
  c.save();c.beginPath();c.moveTo(left,bottom);c.lineTo(left,top+radius);
  c.quadraticCurveTo(left,top,cx,top);c.quadraticCurveTo(right,top,right,top+radius);
  c.lineTo(right,bottom);c.closePath();c.clip();
  // Reuse the same coordinates so tiles and distant scenery line up through every arch.
  drawGateCourtyardBackdrop(c,5);c.restore();
}
