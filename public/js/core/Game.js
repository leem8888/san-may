import { Camera } from './Camera.js';
import { GameLoop } from './GameLoop.js';
import { InputManager } from './InputManager.js';
import { SceneManager } from './SceneManager.js';
import { Player } from '../entities/Player.js';
import { SceneRenderer, QUALITY } from '../rendering/SceneRenderer.js';
import { ParticleSystem } from '../rendering/ParticleSystem.js';
import { DayNightSystem } from '../systems/DayNightSystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';

export class Game {
  constructor(canvas, assets, joystick, onAction, onTick, options = {}) {
    this.player = new Player(); this.scenes = new SceneManager(assets.get('maps'));
    const first = this.scenes.enter(options.scene || 'gate');
    this.camera = new Camera(first.map); this.renderer = new SceneRenderer(canvas, this.camera);
    this.input = new InputManager(canvas, this.camera, joystick, onAction);
    this.input.onPoint = point => this.tap(point);
    this.dayNight = new DayNightSystem(options.time); this.weather = new WeatherSystem(options.room, options.weather);
    this.particles = new ParticleSystem(); this.reduced = false; this.entered = false; this.locked = false;
    this.time = 0; this.remotes = []; this.blocked = new Set(); this.approach = null; this.onApproach = () => {};
    this.env = this.environment(0);
    this.loop = new GameLoop(dt => this.update(dt, onTick), () => this.renderer.render(this));
    this.resize = () => this.renderer.resize(innerWidth, innerHeight); this.resize(); window.addEventListener('resize', this.resize);
    this.visibility = () => { this.input.clear(); if (document.hidden) { this.loop.stop(); if (!['idle', 'sit', 'meditate'].includes(this.player.state)) this.player.setState('idle'); } else if (!this.suspended) this.loop.start(); };
    document.addEventListener('visibilitychange', this.visibility); this.loop.start();
  }
  get scene() { return this.scenes.current; }
  get world() { return this.scene.map; }
  get interactions() { return this.scene.interactions; }
  enter(name) { this.player.name = name; this.entered = true; this.input.active = true; }
  pauseInput(paused) { this.input.active = this.entered && !paused; this.input.clear(); }
  // A full-screen overlay (mini-game) suspends the world loop so only one RAF loop is ever running.
  suspend(suspended) { this.suspended = suspended; this.pauseInput(suspended); if (suspended) this.loop.stop(); else if (!document.hidden) this.loop.start(); }
  setQuality(quality) { if (!QUALITY[quality]) return; this.renderer.quality = quality; this.particles.setCap(QUALITY[quality].particles); this.resize(); }
  setScene(id, x, y, direction = 'down') {
    const scene = this.scenes.enter(id);
    this.camera.setWorld(scene.map); this.player.place(x, y, direction); this.camera.snap(x, y);
    this.particles.clear(); this.input.clear(); this.approach = null;
    return scene;
  }
  // Tapping an interactive object walks to it; the interaction fires on arrival.
  tap(point) {
    if (this.pointHandler?.(point)) return true;
    const o = this.interactions.at(point.x, point.y);
    if (!o) { this.approach = null; return false; }
    this.approach = o; this.input.target = { x: o.x, y: o.y + 34 };
    return true;
  }
  view() { const w = this.camera.width / this.camera.zoom, h = this.camera.height / this.camera.zoom; return { left: this.camera.x - w / 2, top: this.camera.y - h / 2, width: w, height: h }; }
  environment(dt) { return { time: this.time, dt, wind: this.weather.wind, reduced: this.reduced, bells: this.scene.bells, fortuneShake: Math.min(1, this.fortuneShake || 0), ...this.dayNight.sample() }; }
  spawnWeather(dt, view) {
    if (this.scene.indoor || this.reduced) return;
    const q = { low: .3, medium: .6, high: 1 }[this.renderer.quality], { levels, wind } = this.weather;
    for (let n = levels.rain * 150 * q * dt; n > 0; n--) if (Math.random() < n) { const vy = 560 + Math.random() * 220; this.particles.spawn({ kind: 'rain', screen: true, x: Math.random() * (this.camera.width + 120) - 60, y: -12, vx: -wind * 70, vy, size: 10 + Math.random() * 7, life: (this.camera.height + 30) / vy, alpha: .5 }); }
    for (let n = levels.rain * 22 * q * dt; n > 0; n--) if (Math.random() < n) this.particles.spawn({ kind: 'splash', x: view.left + Math.random() * view.width, y: view.top + Math.random() * view.height, life: .45, alpha: .55 });
    for (let n = (levels.leaves + levels.wind * .5) * 5 * q * dt; n > 0; n--) if (Math.random() < n) this.particles.spawn({ kind: 'leaf', x: view.left - 40 + Math.random() * (view.width + 80), y: view.top - 16, vy: 24 + Math.random() * 16, vr: 1.2 + Math.random(), life: 14, size: 2 + Math.random() * 2, seed: Math.random() * 6, color: ['#c6b278', '#b98d55', '#d7c48e', '#9fae6a'][Math.floor(Math.random() * 4)] });
  }
  update(dt, onTick) {
    this.time += dt; this.scenes.update(dt);
    const p = this.player, scene = this.scene, oldX = p.x, oldY = p.y;
    const vector = this.scenes.busy || this.locked ? { x: 0, y: 0 } : this.input.vector(p);
    p.update(dt, vector, scene.collision);
    if (this.input.target && Math.hypot(p.x - oldX, p.y - oldY) < .01 && dt > 0) { this.input.target = null; if (this.approach && Math.hypot(this.approach.x - p.x, this.approach.y - p.y) > this.approach.radius) this.approach = null; }
    if (this.approach && Math.hypot(this.approach.x - p.x, this.approach.y - p.y) < this.approach.radius * .75) { const o = this.approach; this.approach = null; this.input.target = null; this.onApproach(o); }
    this.camera.update(p, dt);
    this.weather.update(dt);
    if (this.fortuneShake > 0) this.fortuneShake -= dt;
    this.env = this.environment(dt);
    scene.update(dt, this);
    const view = this.view();
    this.spawnWeather(dt, view);
    scene.ambient(this, this.particles, this.env, view);
    this.particles.update(dt, this.env.wind);
    this.interactions.update(p);
    onTick(dt, this.time);
  }
  destroy() { this.loop.stop(); this.input.destroy(); window.removeEventListener('resize', this.resize); document.removeEventListener('visibilitychange', this.visibility); }
}
