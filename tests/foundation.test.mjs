import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Camera } from '../public/js/core/Camera.js';
import { Player, DURATIONS } from '../public/js/entities/Player.js';
import { CollisionSystem } from '../public/js/systems/CollisionSystem.js';
import { InteractionSystem } from '../public/js/systems/InteractionSystem.js';
import { GameLoop } from '../public/js/core/GameLoop.js';
const world=JSON.parse(fs.readFileSync(new URL('../public/data/maps/courtyard.json',import.meta.url),'utf8'));
const collision=new CollisionSystem(world);
test('spawn is walkable and each obstacle rejects its centre',()=>{
  const p=new Player();assert.equal(collision.blocked(p.x,p.y),false);
  for(const o of collision.obstacles)assert.equal(collision.blocked(o.shape==='ellipse'?o.x:o.x+o.w/2,o.shape==='ellipse'?o.y:o.y+o.h/2),true);
  assert.equal(collision.blocked(0,0),true);
});
test('movement cannot tunnel through the hall or pond',()=>{
  const p={x:900,y:500};collision.move(p,0,-600);assert.ok(p.y>=424);
  const pond={x:1100,y:780};collision.move(pond,600,0);assert.ok(pond.x<=1186);
});
test('diagonal speed equals straight speed at 30/60/120 FPS',()=>{
  function move(fps,vector){const p=new Player();p.x=800;p.y=900;for(let i=0;i<fps;i++)p.update(1/fps,vector,collision);return Math.hypot(p.x-800,p.y-900);}
  for(const fps of [30,60,120]){assert.ok(Math.abs(move(fps,{x:1,y:0})-180)<.001);assert.ok(Math.abs(move(fps,{x:1,y:-1})-180)<.001);}
});
test('bow counts on completion only, rejects spam, cancels on movement',()=>{
  const p=new Player();let completed=0;p.onComplete=()=>completed++;
  assert.equal(p.act('bow'),true);assert.equal(p.act('bow'),false);p.update(1,{x:0,y:0},collision);assert.equal(p.bows,0);
  p.update(.1,{x:1,y:0},collision);p.update(4,{x:0,y:0},collision);assert.equal(p.bows,0);assert.equal(completed,0);
  p.act('bow');p.update(DURATIONS.bow,{x:0,y:0},collision);assert.equal(p.bows,1);assert.equal(completed,1);assert.equal(p.state,'idle');
});
test('108 bows and beads complete without overflow; sitting cancels on movement',()=>{
  const p=new Player();for(let i=0;i<109;i++){p.act('bow');p.update(DURATIONS.bow,{x:0,y:0},collision);p.act('bead');p.update(.65,{x:0,y:0},collision);}assert.equal(p.bows,108);assert.equal(p.beads,108);
  p.act('sit');p.update(60,{x:0,y:0},collision);assert.equal(p.state,'sit');p.update(.1,{x:0,y:1},collision);assert.equal(p.state,'walk');
});
test('camera maintains limits and inverse screen mapping for desktop/mobile',()=>{
  for(const [w,h] of [[1440,900],[390,844],[844,390],[3000,2000]]){const c=new Camera(world);c.resize(w,h);for(let i=0;i<150;i++)c.update({x:0,y:0},.05);const point=c.toWorld(w/2,h/2);assert.equal(point.x,c.x);assert.equal(point.y,c.y);assert.ok(c.x>=Math.min(w/c.zoom/2,world.width/2));assert.ok(c.y>=Math.min(h/c.zoom/2,world.height/2));}
});
test('interaction proximity and tap selection',()=>{
  const i=new InteractionSystem(world.objects);i.update({x:1200,y:590});assert.equal(i.nearest.id,'bell');i.update({x:900,y:1200});assert.equal(i.nearest,null);assert.equal(i.at(1200,500).id,'bell');assert.equal(i.at(900,900),null);
});
test('one RAF loop, capped delta, stop and resume without time jump',()=>{
  let serial=0;const queue=new Map(),times=[];globalThis.requestAnimationFrame=fn=>{queue.set(++serial,fn);return serial;};globalThis.cancelAnimationFrame=id=>queue.delete(id);
  const loop=new GameLoop(dt=>times.push(dt),()=>{});loop.start();loop.start();assert.equal(queue.size,1);
  function tick(t){const [id,fn]=queue.entries().next().value;queue.delete(id);fn(t);}
  tick(0);tick(10000);assert.deepEqual(times,[0,.05]);loop.stop();assert.equal(queue.size,0);loop.start();tick(20000);assert.equal(times.at(-1),0);loop.stop();delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;
});
