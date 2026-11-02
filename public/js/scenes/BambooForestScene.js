import { Scene } from './Scene.js';
import { PRACTITIONERS, drawBambooPractice } from '../rendering/BambooPracticeArt.js';

// Bamboo sways with the shared wind; fireflies appear after dusk.
export class BambooForestScene extends Scene {
  entities(c, env) {
    return [...super.entities(c, env), ...PRACTITIONERS.map(person => ({
      x: person.x, y: person.y, vy: person.y,
      draw: () => drawBambooPractice(c, person, this.time, env.reduced),
    }))];
  }
  ambient(game, particles, env, view) {
    if (!env.night && !env.reduced && particles.count('mote') < 14 && Math.random() < env.dt * 2) particles.spawn({kind:'mote',x:view.left+Math.random()*view.width,y:view.top+Math.random()*view.height,vx:4,vy:-3,life:7,size:1,alpha:.3,color:'#d4dfac'});
    if (!env.night || env.reduced || particles.count('firefly') > 24 || Math.random() > env.dt * 6) return;
    particles.spawn({ kind: 'firefly', x: view.left + Math.random() * view.width, y: view.top + Math.random() * view.height, vx: (Math.random() - .5) * 18, vy: (Math.random() - .5) * 12, life: 5, size: 1.8, color: '#e8f59a' });
  }
}
