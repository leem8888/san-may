import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../public/js/core/Game.js';
import { closeScenePopups } from '../public/js/ui/ScenePopups.js';
import { DialoguePanel } from '../public/js/ui/DialoguePanel.js';

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
