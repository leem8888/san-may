import http from 'node:http';
import express from 'express';
import { Server } from 'socket.io';
import { loadConfig, MAPS_DIR, PUBLIC_DIR, ROOT } from './config/index.js';
import { openDatabase } from './database/db.js';
import { createRepositories } from './repositories/index.js';
import { createIdentity } from './services/identity.js';
import { createProgression } from './services/progression.js';
import { loadWorld } from './services/world.js';
import { RoomManager } from './services/rooms.js';
import { WorldStateManager } from './services/worldState.js';
import { createNarrative, loadNarrativeContent } from './services/narrative.js';
import { NpcDirector } from '../public/js/shared/npcSchedule.js';
import { createWorldActions } from './services/worldActions.js';
import { createHallActions } from './services/hallActions.js';
import { createJourney } from './services/journey.js';
import path from 'node:path';
import { createApiRouter } from './routes/api.js';
import { attachSockets } from './sockets/index.js';
import { errorHandler, securityHeaders } from './middleware/index.js';

// Builds the whole game server (static files, REST, Socket.IO) on one origin. Tests pass `{ dbFile: ':memory:' }`.
export function createGameServer(overrides = {}) {
  const config = loadConfig(process.env, overrides);
  const db = openDatabase(config.dbFile);
  const repos = createRepositories(db);
  const ctx = { config, db, repos, world: loadWorld(MAPS_DIR), rooms: new RoomManager(), identity: createIdentity(repos), progression: createProgression(repos, config), worldState: new WorldStateManager(repos.world), io: null };
  ctx.npcDirector = new NpcDirector(ctx.world.maps);
  ctx.worldActions = createWorldActions(ctx);
  ctx.hall = createHallActions(ctx);
  ctx.narrative = createNarrative({ repos, config, worldState: ctx.worldState, progression: ctx.progression, content: loadNarrativeContent(path.join(ROOT, 'server', 'content')) });
  ctx.journey = createJourney({ db, repos, content: ctx.narrative.content });

  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api', express.json({ limit: '32kb' }), createApiRouter(ctx));
  app.use(express.static(PUBLIC_DIR, { dotfiles: 'ignore', index: 'index.html' }));
  app.use((req, res) => res.status(404).json({ error: 'Không tìm thấy.' }));
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = new Server(server, { serveClient: true, pingInterval: 10000, pingTimeout: 8000, maxHttpBufferSize: 32e3 });
  ctx.io = io;
  const sockets = attachSockets(io, ctx);

  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    await new Promise(resolve => io.close(() => resolve())); // disconnects sockets and closes the HTTP server
    sockets.close();
    db.close();
  }
  return { app, server, io, db, ctx, config, close };
}

export function startServer(overrides = {}) {
  const game = createGameServer(overrides);
  const { port, host } = game.config;
  game.server.on('error', error => { console.error(`Không thể mở cổng ${port}: ${error.code}. Thử đặt biến PORT khác.`); process.exitCode = 1; });
  game.server.listen(port, host, () => console.log(`Sân Mây: http://localhost:${port}/?room=MAY-01 (dữ liệu: ${game.config.dbFile})`));
  const shutdown = () => game.close().finally(() => process.exit());
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  return game;
}
