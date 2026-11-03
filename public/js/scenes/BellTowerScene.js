import { Scene } from './Scene.js';
import { polygon } from '../rendering/SpriteRenderer.js';

// Distant ridges add depth behind the bell plaza and its varied plants.
export class BellTowerScene extends Scene {
  drawBelow(c,env) {
    const shade=env.night?'#142e31':'#354d42';
    const far=c.createLinearGradient(0,40,0,430);far.addColorStop(0,env.night?'#182e3a':'#80917a');far.addColorStop(1,'#435e4b');
    polygon(c,[[0,350],[0,245],[120,208],[235,95],[345,208],[470,172],[610,48],[760,198],[910,115],[1060,222],[1215,75],[1370,225],[1500,160],[1600,215],[1600,390]],far);
    polygon(c,[[0,400],[0,320],[165,275],[280,315],[420,235],[575,330],[735,252],[900,320],[1080,225],[1240,312],[1410,255],[1600,330],[1600,450]],shade);
    c.globalAlpha=env.night ? .18 : .22;
    polygon(c,[[0,343],[120,208],[235,95],[345,208],[470,172],[610,48],[760,198],[910,115],[1060,222],[1215,75],[1370,225],[1500,160],[1600,215],[1600,231],[1500,176],[1370,241],[1215,91],[1060,238],[910,131],[760,214],[610,64],[470,188],[345,224],[235,110],[120,223],[0,360]],'#e4d7b2');
    c.globalAlpha=1;
  }
}
