import { Scene } from './Scene.js';
import { TempleGateScene } from './TempleGateScene.js';
import { CourtyardScene } from './CourtyardScene.js';
import { MainHallScene } from './MainHallScene.js';
import { MeditationGardenScene } from './MeditationGardenScene.js';
import { LotusLakeScene } from './LotusLakeScene.js';
import { BellTowerScene } from './BellTowerScene.js';
import { BambooForestScene } from './BambooForestScene.js';
import { LibraryScene } from './LibraryScene.js';
import { GardenScene } from './GardenScene.js';

export const SCENE_CLASSES = { gate: TempleGateScene, courtyard: CourtyardScene, mainHall: MainHallScene, zenGarden: MeditationGardenScene, lotusLake: LotusLakeScene, bellTower: BellTowerScene, bambooForest: BambooForestScene, library: LibraryScene, garden: GardenScene };
export const createScene = map => new (SCENE_CLASSES[map.id] || Scene)(map);
