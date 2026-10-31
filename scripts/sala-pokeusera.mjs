// PokéUsera's online room (docs/POKEUSERA.md; the same room as the Pang's): one room, up to four players, WebSocket at /sala.
// The server only deals out messages; the host's browser runs the game. No game logic here.
import { WebSocketServer } from 'ws';

const RUTA = '/sala';
const MAX_JUGADORES = 4;
const MAX_MENSAJE = 64 * 1024;
const PING_MS = 20_000;
/** A socket that never says `entrar` is dropped after this long. */
const ESPERA_ENTRAR_MS = 10_000;
/** Do not pile up game messages for a client that cannot keep up. */
const MAX_PENDIENTE = 1024 * 1024;
const PJS = ['fran', 'pablo', 'chuchi', 'guille', 'vinas', 'ari', 'fer'];

/** Attaches the room to an existing HTTP server. */
export function adjuntarSala(servidor) {
  const clave = (process.env.POKEUSERA_CLAVE ?? '').trim();
  if (!clave) console.warn('[sala] POKEUSERA_CLAVE no está definida: la sala admite a cualquiera.');

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MENSAJE });
  /** ws → { id, pj, anfitrion } for the sockets that are in the room. */
  const dentro = new Map();
  let enPartida = false;

  const enviar = (ws, msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  const anfitrionWs = () => {
    for (const [ws, j] of dentro) if (j.anfitrion) return ws;
    return null;
  };

  const estadoSala = () => ({ tipo: 'sala', jugadores: [...dentro.values()].sort((a, b) => a.id - b.id).map((j) => ({ id: j.id, pj: j.pj, anfitrion: j.anfitrion })), enPartida });

  const repartirSala = () => {
    const msg = estadoSala();
    for (const ws of dentro.keys()) enviar(ws, msg);
  };

  const rechazar = (ws, motivo) => {
    enviar(ws, { tipo: 'rechazo', motivo });
    ws.close(1000);
  };

  const alEntrar = (ws, msg) => {
    if (dentro.has(ws)) return;
    if (clave && String(msg.clave ?? '').trim() !== clave) return rechazar(ws, 'clave');
    if (enPartida) return rechazar(ws, 'en-partida');
    if (dentro.size >= MAX_JUGADORES) return rechazar(ws, 'llena');
    clearTimeout(ws.temporizadorEntrar);
    const usados = new Set([...dentro.values()].map((j) => j.id));
    let id = 0;
    while (usados.has(id)) id++;
    const anfitrion = dentro.size === 0;
    dentro.set(ws, { id, pj: null, anfitrion });
    enviar(ws, { tipo: 'bienvenida', id, anfitrion });
    repartirSala();
  };

  /** The host left: everybody is told, dropped, and the room is empty again. */
  const cerrarSala = () => {
    const todos = [...dentro.keys()];
    dentro.clear();
    enPartida = false;
    for (const ws of todos) {
      enviar(ws, { tipo: 'cerrada' });
      ws.close(1000);
    }
  };

  const alSalir = (ws) => {
    clearTimeout(ws.temporizadorEntrar);
    const j = dentro.get(ws);
    if (!j) return;
    if (j.anfitrion) return cerrarSala();
    dentro.delete(ws);
    const host = anfitrionWs();
    if (host) enviar(host, { tipo: 'salio', id: j.id });
    repartirSala();
  };

  const alMensaje = (ws, crudo) => {
    let msg;
    try {
      msg = JSON.parse(crudo.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.tipo !== 'string') return;
    if (msg.tipo === 'entrar') return alEntrar(ws, msg);
    const yo = dentro.get(ws);
    if (!yo) return;
    switch (msg.tipo) {
      case 'elegir': {
        if (enPartida) return;
        const pj = msg.pj;
        if (pj !== null && !PJS.includes(pj)) return;
        // Taken by someone else: nothing changes, but the sender gets the real state back.
        if (pj !== null && [...dentro.values()].some((j) => j !== yo && j.pj === pj)) return enviar(ws, estadoSala());
        yo.pj = pj;
        return repartirSala();
      }
      case 'empezar':
        if (!yo.anfitrion || enPartida) return;
        enPartida = true;
        for (const w of dentro.keys()) enviar(w, { tipo: 'empezar' });
        return repartirSala();
      case 'volver':
        if (!yo.anfitrion || !enPartida) return;
        enPartida = false;
        for (const w of dentro.keys()) enviar(w, { tipo: 'volver' });
        return repartirSala();
      case 'juego': {
        // `a` is 'anfitrion', 'todos' or, from the host only, the id of one player (what only that player may see: their objects).
        const privado = Number.isInteger(msg.a) && yo.anfitrion;
        if (msg.a !== 'anfitrion' && msg.a !== 'todos' && !privado) return;
        const salida = JSON.stringify({ tipo: 'juego', de: yo.id, datos: msg.datos });
        const destinos = privado ? [...dentro].filter(([, j]) => j.id === msg.a).map(([w]) => w) : msg.a === 'anfitrion' ? [anfitrionWs()] : [...dentro.keys()];
        for (const w of destinos) {
          if (!w || w === ws || w.readyState !== w.OPEN || w.bufferedAmount > MAX_PENDIENTE) continue;
          w.send(salida);
        }
        return;
      }
    }
  };

  wss.on('connection', (ws) => {
    ws.vivo = true;
    ws.on('pong', () => {
      ws.vivo = true;
    });
    ws.on('message', (crudo) => alMensaje(ws, crudo));
    ws.on('close', () => alSalir(ws));
    ws.on('error', () => ws.terminate());
    ws.temporizadorEntrar = setTimeout(() => {
      if (!dentro.has(ws)) ws.terminate();
    }, ESPERA_ENTRAR_MS);
  });

  servidor.on('upgrade', (req, socket, head) => {
    const ruta = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (ruta !== RUTA) return socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  // Ping so Railway keeps the connection open; a socket that never answers is dropped.
  const ping = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.vivo) {
        ws.terminate();
        continue;
      }
      ws.vivo = false;
      ws.ping();
    }
  }, PING_MS);
  ping.unref();
  servidor.on('close', () => clearInterval(ping));
}
