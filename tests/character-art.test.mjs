import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCharacter } from '../public/js/rendering/CharacterArt.js';
import { SPRITE_FRAME, appearanceKey } from '../public/js/rendering/SpriteRenderer.js';
import { DEFAULT_APPEARANCE, DURATIONS } from '../public/js/shared/rules.js';
import { NPC } from '../public/js/entities/NPC.js';

// Tracks geometry after Canvas transforms, catching features clipped by the sprite atlas.
function measuringContext() {
  let m = [1,0,0,1,0,0]; const stack = [], points = [], hands = [];
  const point = (x,y) => points.push([m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);
  const c = {
    points, hands, save(){stack.push([...m]);}, restore(){m=stack.pop();},
    translate(x,y){m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y;},
    scale(x,y){m[0]*=x;m[1]*=x;m[2]*=y;m[3]*=y;},
    rotate(a){const [aa,b,cc,d]=m,co=Math.cos(a),si=Math.sin(a);m[0]=aa*co+cc*si;m[1]=b*co+d*si;m[2]=cc*co-aa*si;m[3]=d*co-b*si;},
    beginPath(){},closePath(){},fill(){},stroke(){},
    moveTo:point,lineTo:point,
    bezierCurveTo(...p){for(let i=0;i<p.length;i+=2)point(p[i],p[i+1]);},
    quadraticCurveTo(...p){for(let i=0;i<p.length;i+=2)point(p[i],p[i+1]);},
    arc(x,y,r){this.ellipse(x,y,r,r);},
    ellipse(x,y,rx,ry){
      for(const dx of [-rx,rx])for(const dy of [-ry,ry])point(x+dx,y+dy);
      if((rx===2.4&&ry===2.5&&this.fillStyle==='#e9c39c')||(rx===3.1&&ry===3.3&&this.fillStyle==='#e8c3a5'))hands.push([x,y]);
    },
    fillRect(x,y,w,h){point(x,y);point(x+w,y+h);},
    createLinearGradient(){return{addColorStop(){}};},
  };
  return c;
}

test('every character keeps both hands and all art within its frame in every direction and animation', () => {
  const looks = [DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE, gender:'male' }, { ...DEFAULT_APPEARANCE, gender:'female', hairStyle:'long', outfitColor:'#a7766b' }, { ...DEFAULT_APPEARANCE, accessory:'hat' }, { ...DEFAULT_APPEARANCE, characterStyle:'child' }, { ...DEFAULT_APPEARANCE, characterStyle:'abbot' }];
  for(const look of looks)for(const state of Object.keys(DURATIONS))for(const dir of ['up','down','left','right'])for(let frame=0;frame<8;frame++){
    const c=measuringContext();c.translate(SPRITE_FRAME.paddingX,SPRITE_FRAME.paddingY);drawCharacter(c,state,frame,dir,look);
    const label=`${look.characterStyle||look.accessory||'adult'}/${state}/${dir}/${frame}`;
    assert.equal(c.hands.length,2,`${label}: both hands are drawn`);
    for(const [x,y] of c.points)assert.ok(x>=0&&x<=SPRITE_FRAME.width&&y>=0&&y<=SPRITE_FRAME.height,`${label}: clipped at ${x.toFixed(1)},${y.toFixed(1)}`);
  }
});

test('novice and abbot have distinct styles and never reuse adult cached artwork', () => {
  const an=new NPC({id:'novice'}),abbot=new NPC({id:'abbot'});
  assert.equal(an.appearance.characterStyle,'child');assert.equal(abbot.appearance.characterStyle,'abbot');
  assert.equal(new Set([appearanceKey(DEFAULT_APPEARANCE),appearanceKey(an.appearance),appearanceKey(abbot.appearance)]).size,3);
});
