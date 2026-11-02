import { Player } from './Player.js';
import { Pathfinder } from '../systems/Pathfinder.js';
import { SCENE_IDS, DEFAULT_APPEARANCE, bowDirection, CHAT_SECONDS, EMOTES } from '../shared/rules.js';

export const VISITOR_NAMES = ['Thanh Mai','Gia Huy','Ngọc Linh','Tuệ Nhi','Hoài Nam','Khánh Vy','Đức Sơn','Bảo Ngân'];
const LINES = {
  gate: ['Hôm nay trời thật dễ chịu.','Mình vào chùa dạo một lát nhé.','Cổng chùa đẹp quá!'],
  courtyard: ['Đi chậm một chút cũng thấy vui hơn.','Chúc mọi người một ngày an lành.','Ở đây yên bình thật.'],
  mainHall: ['Mình ngồi yên một chút nhé.','Tiếng chuông nghe nhẹ lòng quá.','Chúc bạn và gia đình bình an.'],
  zenGarden: ['Vườn rau xanh tốt quá.','Mình thích ngắm những đường cát này.','Nghe lá xào xạc dễ chịu thật.'],
  lotusLake: ['Nhìn đàn cá bơi kìa!','Sen hôm nay nở đẹp quá.','Mình ghé cho cá ăn một chút.'],
  bellTower: ['Tiếng chuông ngân xa thật.','Ngồi nghe gió ở đây thích quá.','Mình đợi tiếng chuông lắng xuống.'],
  bambooForest: ['Gió qua rừng trúc nghe hay thật.','Dừng lại ngắm lá một chút nhé.','Có đom đóm nữa kìa!'],
  library: ['Mình đang tìm một câu chuyện hay.','Đọc vài trang rồi thưởng trà nhé.','Mùi trà thơm dễ chịu quá.'],
};

// Local decorative visitors: never enter Socket.IO, player lists, saves or story NPCs.
export class AmbientVisitors {
  constructor(scenes, count = 8) {
    this.scenes = scenes;
    this.people = Array.from({ length: count }, (_,i) => this.place(Object.assign(new Player(),{name:VISITOR_NAMES[i%VISITOR_NAMES.length]})));
  }
  point(scene) {
    for (let n = 0; n < 100; n++) {
      const p = { x: 90 + Math.random() * (scene.map.width - 180), y: 100 + Math.random() * (scene.map.height - 200) };
      if (!scene.collision.blocked(p.x, p.y)) return p;
    }
    const [x, y] = scene.map.spawns.default; return { x, y };
  }
  place(p) {
    p.sceneId = SCENE_IDS[Math.floor(Math.random() * SCENE_IDS.length)];
    const point = this.point(this.scenes.get(p.sceneId)); p.place(point.x, point.y); p.setState('idle');
    p.npc = true; p.path = []; p.wait = 1 + Math.random() * 7; p.stay = 60 + Math.random() * 180;
    p.chat = null; p.emote = null; p.nextExpression = 5 + Math.random() * 15;
    p.appearance = { ...DEFAULT_APPEARANCE, outfitColor: ['#9aa58a','#b19a72','#829e9a','#ad8c85','#8b91a1'][Math.floor(Math.random()*5)], hairStyle: ['short','bun','shaved'][Math.floor(Math.random()*3)] };
    return p;
  }
  inScene(id) { return this.people.filter(p => p.sceneId === id); }
  express(p) {
    if (Math.random() < .65) {
      const choices=LINES[p.sceneId].filter(text=>text!==p.lastLine);
      p.lastLine=choices[Math.floor(Math.random()*choices.length)]; p.chat={text:p.lastLine,age:0};
    } else p.emote={emote:EMOTES[Math.floor(Math.random()*EMOTES.length)],age:0};
    p.nextExpression=20+Math.random()*30;
  }
  update(dt, id) {
    for (const p of this.people) {
      if(p.chat&&(p.chat.age+=dt)>=CHAT_SECONDS)p.chat=null;
      if(p.emote&&(p.emote.age+=dt)>=2.6)p.emote=null;
      if ((p.stay -= dt) < 0 && p.sceneId !== id) this.place(p);
      if (p.sceneId !== id) continue;
      if((p.nextExpression-=dt)<=0&&!p.chat&&!p.emote)this.express(p);
      const scene = this.scenes.get(id); let vector = { x: 0, y: 0 };
      if (!p.path.length && (p.wait -= dt) <= 0) {
        p.setState('idle'); p.wait = 3 + Math.random() * 9;
        if (Math.random() < .65) { scene.navigation ||= new Pathfinder(scene.collision); p.path = scene.navigation.findPath(p, this.point(scene)) || []; }
        else { p.direction = ['up','down','left','right'][Math.floor(Math.random()*4)]; p.act(['wave','pray','bow','sit'][Math.floor(Math.random()*4)]); }
      }
      if (p.path.length) {
        const target = p.path[0], dx = target.x-p.x, dy = target.y-p.y, length = Math.hypot(dx,dy);
        if (length < .2) p.path.shift(); else vector = { x: dx/length, y: dy/length, maxDistance: length };
      }
      p.update(dt, vector, scene.collision); p.direction = bowDirection(id, p.state, p.direction);
    }
  }
}
