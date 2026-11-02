import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { guest, startServer, connect, ask, nextEvent, delay } from './helpers.mjs';
import { fishPose } from '../public/js/rendering/FishArt.js';
import { drawGateCourtyardBackdrop, drawGateCourtyardView } from '../public/js/rendering/GateCourtyardView.js';
import { LotusLakeScene } from '../public/js/scenes/LotusLakeScene.js';

test('gate courtyard cannot paint over the front wall and its coping', () => {
  const rectangles=[];
  const c=new Proxy({}, {get:(_,key)=>key==='createLinearGradient'?()=>({addColorStop(){}}):key==='rect'?(...args)=>rectangles.push(args):()=>{}});
  drawGateCourtyardBackdrop(c);
  assert.deepEqual(rectangles[0],[-800,-400,1600,306]);
  drawGateCourtyardView(c,0,-162,138,164);
  assert.deepEqual(rectangles[1],[-800,-400,1600,405], 'the full background is exposed only inside an arch clip');
});

test('fish gather inside the lake and return smoothly; late joiners do not restart feeding', () => {
  const map=JSON.parse(fs.readFileSync(new URL('../public/data/maps/lotusLake.json',import.meta.url),'utf8'));
  const scene=new LotusLakeScene(map),feed={id:'test-feed',x:1100,y:865,at:1000,from:{x:1120,y:970}};
  scene.time=50;scene.setFishFeed(feed,6000);assert.equal(scene.fishFeeding().age,5);
  scene.setFishFeed(feed,9000);assert.equal(scene.fishFeeding().age,5, 'duplicate broadcast does not reset the animation');
  for(const f of scene.fish){
    const base=fishPose(f,20),start=fishPose(f,20,{...feed,age:0});assert.deepEqual(start,base);
    const eating=fishPose(f,20,{...feed,age:10});assert.ok(Math.hypot(eating.x-feed.x,eating.y-feed.y)<45);
    for(let age=0;age<=20;age+=.25){const p=fishPose(f,20,{...feed,age});assert.ok(((p.x-scene.lake.x)/scene.lake.rx)**2+((p.y-scene.lake.y)/scene.lake.ry)**2<1);}
    assert.deepEqual(fishPose(f,20,{...feed,age:20}),base);
  }
  scene.time=66;assert.equal(scene.fishFeeding(),null);
});

test('buy and feed consumes one bag, validates location, synchronizes the room and handles retry safely', async t => {
  const s=await startServer();t.after(s.close);
  const a=guest(s.game),b=guest(s.game),c=guest(s.game),repo=s.game.ctx.repos.players;
  const stall=s.game.ctx.world.object('gate','offeringStall');
  repo.saveLocation(a.id,'gate',stall.x,stall.y+50);repo.saveLocation(b.id,'lotusLake',1120,1000);repo.saveLocation(c.id,'lotusLake',1120,1000);
  let sa=await connect(s.base,a.token);const sb=await connect(s.base,b.token),sc=await connect(s.base,c.token);
  t.after(()=>{sa.close();sb.close();sc.close();});
  await ask(sa,'room:join',{room:'FISH-1'});await ask(sb,'room:join',{room:'FISH-1'});await ask(sc,'room:join',{room:'FISH-2'});
  assert.ok((await ask(sb,'fish:feed',{objectId:'fishFeeder',requestId:'no-food-001'})).error);
  const purchase=await ask(sa,'shop:buy',{objectId:'offeringStall',sku:'fishFood',requestId:'fish-buy-001'});
  assert.equal(purchase.shop.points,95);assert.equal(purchase.shop.inventory.fishFood,1);
  assert.ok((await ask(sa,'fish:feed',{objectId:'fishFeeder',requestId:'wrong-place-001'})).error);
  sa.close();await delay(30);repo.saveLocation(a.id,'lotusLake',1120,1000);sa=await connect(s.base,a.token);
  await ask(sa,'room:join',{room:'FISH-1'});
  const seen=nextEvent(sb,'fish:fed'),fed=await ask(sa,'fish:feed',{objectId:'fishFeeder',requestId:'feeding-001'});
  assert.equal(fed.ok,true);assert.equal(fed.shop.inventory.fishFood,0);assert.equal((await seen).id,fed.feed.id);
  assert.equal((await ask(sa,'fish:feed',{objectId:'fishFeeder',requestId:'feeding-001'})).shop.inventory.fishFood,0);
  assert.ok((await ask(sa,'fish:feed',{objectId:'fishFeeder',requestId:'feeding-002'})).error);
  assert.equal((await ask(sb,'room:join',{room:'FISH-1'})).scene.fishFeed.id,fed.feed.id);
  assert.equal((await ask(sc,'room:join',{room:'FISH-2'})).scene.fishFeed,null);
  assert.equal(s.game.ctx.repos.shop.state(a.id,s.game.ctx.progression.keys().daily).points,95,'feeding does not grant points or merit');
  assert.throws(()=>s.game.ctx.repos.shop.offer(s.game.ctx.rooms.findPlayer(a.id),'fishFood',Date.now()));
});
