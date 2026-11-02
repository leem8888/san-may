import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AmbientVisitors, VISITOR_NAMES } from '../public/js/entities/AmbientVisitors.js';
import { SceneManager } from '../public/js/core/SceneManager.js';
import { SCENE_IDS } from '../public/js/shared/rules.js';
import { drawTea } from '../public/js/rendering/TeaArt.js';
import { TeaGame } from '../public/js/ui/minigames/TeaGame.js';
import { drawLotus } from '../public/js/rendering/LotusArt.js';
import { seeded } from '../public/js/rendering/ground.js';

test('exactly eight decorative visitors stay walkable and leave real NPC registries unchanged', () => {
  const maps=new Map(SCENE_IDS.map(id=>[id,JSON.parse(fs.readFileSync(new URL(`../public/data/maps/${id}.json`,import.meta.url),'utf8'))]));
  const scenes=new SceneManager(maps),crowd=new AmbientVisitors(scenes);
  const registries=new Map(SCENE_IDS.map(id=>[id,[...scenes.get(id).npcs]]));
  assert.equal(crowd.people.length,8);
  assert.deepEqual(crowd.people.map(p=>p.name),VISITOR_NAMES);
  for(const p of crowd.people){
    assert.ok(SCENE_IDS.includes(p.sceneId));assert.equal(scenes.get(p.sceneId).collision.blocked(p.x,p.y),false);
    assert.equal(scenes.get(p.sceneId).npcs.includes(p),false);
  }
  const id=crowd.people[0].sceneId;
  for(let i=0;i<600;i++){
    crowd.update(1/30,id);
    for(const p of crowd.inScene(id))assert.equal(scenes.get(id).collision.blocked(p.x,p.y),false);
  }
  assert.equal(crowd.people.length,8);
  for(const id of SCENE_IDS){
    assert.deepEqual(scenes.get(id).npcs,registries.get(id));
    assert.equal(scenes.get(id).residents.length,maps.get(id).objects.filter(o=>o.type==='npc'&&!o.schedule).length);
  }
});

test('visitor names persist across maps and random chat/icons expire without consecutive repeated lines', () => {
  const maps=new Map(SCENE_IDS.map(id=>[id,JSON.parse(fs.readFileSync(new URL(`../public/data/maps/${id}.json`,import.meta.url),'utf8'))]));
  const crowd=new AmbientVisitors(new SceneManager(maps)),p=crowd.people[0],name=p.name;
  crowd.place(p);assert.equal(p.name,name);
  const original=Math.random;
  try{
    Math.random=()=>0;crowd.express(p);const first=p.chat.text;
    p.chat=null;crowd.express(p);assert.notEqual(p.chat.text,first);
    p.nextExpression=100;p.wait=100;crowd.update(6.1,p.sceneId);assert.equal(p.chat,null);
    Math.random=()=>.9;crowd.express(p);assert.ok(p.emote.emote);
    p.nextExpression=100;crowd.update(3,p.sceneId);assert.equal(p.emote,null);
  }finally{Math.random=original;}
});

test('new tea and lotus rendering covers all states without changing the tea completion flow', () => {
  const text=[],c=new Proxy({}, {get:(_,k)=>k.startsWith('create')?()=>({addColorStop(){}}):k==='fillText'?(v)=>text.push(v):()=>{}});
  for(const step of ['choose','boil','pour','sip','done'])drawTea(c,{step,tea:'trà sen',fill:80,temp:90,holding:true,steam:[{x:500,y:250,age:1}]},'#c9b06a');
  assert.ok(text.some(t=>t.includes('trà sen')));
  const random=seeded(12);for(let i=0;i<30;i++)drawLotus(c,100,100,random);
  let completed=0;
  const game=Object.assign(Object.create(TeaGame.prototype),{step:'boil',tea:'trà sen',temp:97,holding:true,fill:0,time:0,steam:[],sips:0,audio:{tone(){}},toolsFor(){},status(){},done(){completed++;}});
  game.update(.1);assert.equal(game.step,'pour');game.holding=true;game.update(2.3);game.release();assert.equal(game.step,'sip');
  game.sip();game.sip();game.sip();assert.equal(game.step,'done');assert.equal(completed,1);
});
