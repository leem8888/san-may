import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/js/core/Game.js';
import { closeScenePopups } from '../public/js/ui/ScenePopups.js';
import { DialoguePanel } from '../public/js/ui/DialoguePanel.js';
import { InputManager } from '../public/js/core/InputManager.js';

test('walking to another spot closes the open panel for both tap and manual movement', () => {
  const panels = { current: 'fishShopPanel', close() { this.current = null; } };
  const game = {
    player: { state: 'idle' }, pointHandler: () => false,
    scene: { portalAt: () => null },
    interactions: { at: () => null }, input: { cancelPath() {} },
    navigate() {}, onMove: () => panels.close(),
  };
  Game.prototype.tap.call(game, { x: 100, y: 200 });
  assert.equal(panels.current, null);

  panels.current = 'fishShopPanel';
  const input = { active: true, keys: new Set(['d']), stick: { x: 0, y: 0 }, cancelPath() {}, onManual: () => game.onMove() };
  InputManager.prototype.vector.call(input, { state: 'idle' });
  assert.equal(panels.current, null);
});

test('a seated guest can tap their table again without leaving the chair', () => {
  const opened = [];
  const ownTable = { id: 'vegTable1', action: 'restaurantTable' };
  const otherTable = { id: 'vegTable2', action: 'restaurantTable' };
  const game = {
    player: { state: 'sit', restaurantSeat: 'vegSeat1A' },
    scene: { objects: [{ id: 'vegSeat1A', tableId: 'vegTable1' }] },
    interactions: { at: x => x === 1 ? ownTable : otherTable },
    input: { clear() {} }, onApproach: target => opened.push(target.id),
  };
  Game.prototype.tap.call(game, { x: 1, y: 1 });
  Game.prototype.tap.call(game, { x: 2, y: 2 });
  assert.deepEqual(opened, ['vegTable1']);
  assert.equal(game.player.state, 'sit');
  assert.equal(game.player.restaurantSeat, 'vegSeat1A');
});

test('changing maps closes popups, while a same-map position correction does not', () => {
  let closed=0;
  const game={scene:{id:'gate'},onSceneChange(){closed++;},scenes:{enter:id=>({id,map:{}})},camera:{setWorld(){},snap(){}},player:{place(){}},particles:{clear(){}},input:{clear(){}}};
  Game.prototype.setScene.call(game,'gate',800,800);assert.equal(closed,0);
  Game.prototype.setScene.call(game,'courtyard',900,900);assert.equal(closed,1);
});

test('scene cleanup closes side panels, dialogue and minigame plus menus and mobile chat focus', () => {
  const original=globalThis.document,calls=[];
  const nodes={emotes:{hidden:false},gardenBar:{hidden:false},emoteToggle:{setAttribute:(...args)=>calls.push(args.join(':'))},chatInput:{blur:()=>calls.push('blur')}};
  globalThis.document={getElementById:id=>nodes[id]};
  try{
    const game={fortuneShake:1};
    closeScenePopups({panels:{close:()=>calls.push('panel'),menu:v=>calls.push(`menu:${v}`)},dialogue:{close:()=>calls.push('dialogue')},minigames:{close:()=>calls.push('minigame')},game});
    assert.ok(['panel','dialogue','minigame','menu:false','blur','aria-expanded:false'].every(v=>calls.includes(v)));
    assert.equal(nodes.emotes.hidden,true);assert.equal(nodes.gardenBar.hidden,true);assert.equal(game.fortuneShake,0);
  }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('a pending dialogue cannot open after scene cleanup', async () => {
  let resolve,stopped=0;
  const panel=Object.assign(Object.create(DialoguePanel.prototype),{request:0,game:{scene:{id:'gate'}},provider:{get:()=>new Promise(r=>{resolve=r;})},portrait:{stop:()=>stopped++},dialog:{open:false}});
  const pending=panel.open('novice');panel.close();panel.game.scene={id:'courtyard'};
  resolve({pages:['Hello']});await pending;assert.equal(panel.entry,undefined);assert.equal(stopped,1);
});

test('scene cleanup ends a pending server conversation and ignores its late reply', async () => {
  let resolve; const calls=[];
  const panel=Object.assign(Object.create(DialoguePanel.prototype),{
    request:0,game:{scene:{id:'gate'}},portrait:{stop(){}},dialog:{open:false},
    net:{request(event){calls.push(event);return event==='dialogue:start'?new Promise(r=>{resolve=r;}):Promise.resolve({});}},
    begin(){assert.fail('late conversation reopened');},render(){assert.fail('late conversation rendered');},
  });
  const pending=panel.openServer({id:'novice'});panel.close();panel.game.scene={id:'courtyard'};
  resolve({view:{name:'An'},story:{}});await pending;
  assert.deepEqual(calls,['dialogue:start','dialogue:end']);assert.equal(panel.server,undefined);
});
