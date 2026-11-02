// Cached with the ground: notched, veined leaves and distinct buds/open blossoms.
export function drawLotus(c,x,y,random){
  const size=.8+random()*.5,r=17*size;
  c.save();c.translate(x,y);
  c.fillStyle='#183c3244';c.beginPath();c.ellipse(2,3,r+2,r*.48,0,0,Math.PI*2);c.fill();
  const green=c.createLinearGradient(-r,-r/2,r,r/2);green.addColorStop(0,'#9aaf69');green.addColorStop(.45,'#698e51');green.addColorStop(1,'#3e6d46');
  c.fillStyle=green;c.beginPath();c.moveTo(0,0);c.ellipse(0,0,r,r*.47,0,.2,Math.PI*2-.2);c.closePath();c.fill();
  c.strokeStyle='#c2ce8a66';c.lineWidth=.7;
  for(let i=0;i<9;i++){const a=.4+i*.68;c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(a)*r*.9,Math.sin(a)*r*.41);c.stroke();}
  const bloom=random();
  if(bloom<.65){
    c.strokeStyle='#5f7b48';c.lineWidth=1.5;c.beginPath();c.moveTo(4,0);c.quadraticCurveTo(8,-10,5,-18);c.stroke();
    if(bloom<.2){
      c.fillStyle='#db9aa8';c.beginPath();c.moveTo(5,-33);c.bezierCurveTo(-3,-25,-1,-17,5,-16);c.bezierCurveTo(12,-19,13,-25,5,-33);c.fill();
      c.strokeStyle='#f4c1cb';c.lineWidth=1;c.beginPath();c.moveTo(5,-30);c.lineTo(5,-18);c.stroke();
    }else{
      c.translate(5,-18);
      for(let ring=0;ring<2;ring++)for(let i=0;i<7;i++){
        c.save();c.rotate((i/7*Math.PI*2)+(ring ? .4 : 0));c.scale(1,.65);
        const g=c.createLinearGradient(0,-15,0,0);g.addColorStop(0,'#fff0e7');g.addColorStop(.4,ring?'#e9a5bc':'#efb7c7');g.addColorStop(1,'#c77496');
        c.fillStyle=g;c.beginPath();c.moveTo(0,-(ring?12:17));c.bezierCurveTo(-7,-10,-7,-1,0,2);c.bezierCurveTo(7,-1,7,-10,0,-(ring?12:17));c.fill();c.restore();
      }
      c.fillStyle='#e8c564';c.beginPath();c.ellipse(0,0,4,2.5,0,0,Math.PI*2);c.fill();
    }
  }
  c.restore();
}
