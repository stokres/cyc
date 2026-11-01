// The online rooms of the whole web (docs/SALAS.md): several rooms at once (at most MAX_SALAS in the whole web), each of one game and of 1 to 4 players,
// a list of open rooms per game, a 4-letter code to join, and the player names taken from the web account. WebSocket at /sala.
// The server only deals out messages; the host's browser runs the game. No game logic here.
import { randomInt } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { ALFABETO_SALA, CODIGO_SALA_LARGO, JUEGOS_ONLINE, MAX_JUGADORES, MAX_SALAS, limpiarCodigoSala, limpiarPj } from '../src/sala/reglas.mjs';

const RUTA = '/sala';
const MAX_MENSAJE = 64 * 1024;
const PING_MS = 20_000;
/** A socket that sends nothing at all after connecting is dropped after this long. */
const ESPERA_PRIMER_MENSAJE_MS = 10_000;
/** Do not pile up game messages for a client that cannot keep up. */
const MAX_PENDIENTE = 1024 * 1024;
/** A room whose players send nothing for this long is closed. */
const INACTIVA_MS = 30 * 60_000;
const REVISION_MS = 60_000;

/**
 * Attaches the rooms to an existing HTTP server.
 * `autorizar(req)`: whether the upgrade may go on (the cookie of the site's door, scripts/pase.mjs); `puerta`: the door is on (the rooms have no password of their own any more).
 * `cuentaDeToken(token)`: `{ id, nombre }` of the account that owns the token, or null (scripts/api-estadisticas.mjs).
 */
export function adjuntarSalas(servidor, { autorizar = () => true, puerta = false, cuentaDeToken = () => null } = {}) {
  if (!puerta) console.warn('[salas] CYC_CLAVE no está definida: cualquiera puede abrir y entrar en salas.');

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MENSAJE });
  /** code → { codigo, juego, max, creada, actividad, enPartida, dentro: Map<ws, { id, pj, anfitrion, nombre, cuentaId }> } */
  const salas = new Map();

  const enviar = (ws, msg) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  };

  // ---------------------------------------------------------------- what is sent

  const estadoSala = (sala) => ({
    tipo: 'sala',
    codigo: sala.codigo,
    juego: sala.juego,
    max: sala.max,
    jugadores: [...sala.dentro.values()].sort((a, b) => a.id - b.id).map((j) => ({ id: j.id, pj: j.pj, anfitrion: j.anfitrion, nombre: j.nombre })),
    enPartida: sala.enPartida,
  });

  const repartirSala = (sala) => {
    const msg = estadoSala(sala);
    for (const ws of sala.dentro.keys()) enviar(ws, msg);
  };

  const anfitrionWs = (sala) => {
    for (const [ws, j] of sala.dentro) if (j.anfitrion) return ws;
    return null;
  };

  const listaDe = (juego) => ({
    tipo: 'salas',
    salas: [...salas.values()]
      .filter((s) => s.juego === juego)
      .map((s) => ({ codigo: s.codigo, juego: s.juego, anfitrion: [...s.dentro.values()].find((j) => j.anfitrion)?.nombre ?? null, jugadores: s.dentro.size, max: s.max, enPartida: s.enPartida })),
    abiertas: salas.size,
    max: MAX_SALAS,
  });

  /** Tells the sockets that are in the lobby and looking at a list the list again (called whenever any room changes). */
  const repartirLista = () => {
    const cache = new Map();
    for (const ws of wss.clients) {
      if (ws.sala || !ws.mira) continue;
      if (!cache.has(ws.mira)) cache.set(ws.mira, JSON.stringify(listaDe(ws.mira)));
      if (ws.readyState === ws.OPEN) ws.send(cache.get(ws.mira));
    }
  };

  // ---------------------------------------------------------------- rooms

  const codigoNuevo = () => {
    for (;;) {
      let c = '';
      for (let i = 0; i < CODIGO_SALA_LARGO; i++) c += ALFABETO_SALA[randomInt(ALFABETO_SALA.length)];
      if (!salas.has(c)) return c;
    }
  };

  /** Puts a socket in a room as the next free id. Sends `bienvenida` and the room to everybody in it. */
  const meter = (ws, sala, cuenta) => {
    const usados = new Set([...sala.dentro.values()].map((j) => j.id));
    let id = 0;
    while (usados.has(id)) id++;
    const anfitrion = sala.dentro.size === 0;
    sala.dentro.set(ws, { id, pj: null, anfitrion, nombre: cuenta?.nombre ?? null, cuentaId: cuenta?.id ?? null });
    ws.sala = sala;
    sala.actividad = Date.now();
    enviar(ws, { tipo: 'bienvenida', id, anfitrion, codigo: sala.codigo, juego: sala.juego, max: sala.max });
    repartirSala(sala);
  };

  const crearSala = (ws, juego, max, cuenta) => {
    const sala = { codigo: codigoNuevo(), juego, max, creada: Date.now(), actividad: Date.now(), enPartida: false, dentro: new Map() };
    salas.set(sala.codigo, sala);
    console.log(`[salas] abierta ${sala.codigo} ${juego} (${salas.size}/${MAX_SALAS} en la web)`);
    meter(ws, sala, cuenta);
    return sala;
  };

  /** Deletes a room and sends everybody in it (but `excepto`) back to the lobby with `cerrada`. Their sockets stay open. */
  const cerrarSala = (sala, motivo, excepto = null) => {
    if (salas.get(sala.codigo) !== sala) return;
    salas.delete(sala.codigo);
    const todos = [...sala.dentro.keys()];
    sala.dentro.clear();
    for (const ws of todos) {
      ws.sala = null;
      if (ws !== excepto) enviar(ws, { tipo: 'cerrada', motivo });
    }
    console.log(`[salas] cerrada ${sala.codigo} ${sala.juego}, ${motivo} (${salas.size}/${MAX_SALAS} en la web)`);
  };

  /** A socket leaves its room (it asked to, or it is gone). The host leaving closes the room. */
  const salirDeSala = (ws) => {
    const sala = ws.sala;
    if (!sala) return;
    const yo = sala.dentro.get(ws);
    if (!yo || yo.anfitrion) {
      cerrarSala(sala, 'anfitrion', ws);
      ws.sala = null;
    } else {
      sala.dentro.delete(ws);
      ws.sala = null;
      const host = anfitrionWs(sala);
      if (host) enviar(host, { tipo: 'salio', id: yo.id });
      if (sala.dentro.size === 0) cerrarSala(sala, 'anfitrion');
      else repartirSala(sala);
    }
    repartirLista();
  };

  /** The same account in another connection (a page reload, a phone that reconnected): the old socket is taken out first so it leaves no ghost room. */
  const sacarCuentaVieja = (cuentaId, nuevo) => {
    if (!cuentaId) return;
    const viejos = [];
    for (const sala of salas.values()) for (const [w, j] of sala.dentro) if (j.cuentaId === cuentaId && w !== nuevo) viejos.push(w);
    for (const w of viejos) {
      salirDeSala(w);
      w.terminate();
    }
  };

  const cuentaDe = (token) => {
    if (typeof token !== 'string' || !token) return null;
    try {
      return cuentaDeToken(token) ?? null;
    } catch {
      return null;
    }
  };

  const rechazar = (ws, motivo) => enviar(ws, { tipo: 'rechazo', motivo });

  // ---------------------------------------------------------------- messages

  const alCrear = (ws, msg) => {
    if (ws.sala) return;
    const max = msg.max;
    if (!JUEGOS_ONLINE.includes(msg.juego) || !Number.isInteger(max) || max < 1 || max > MAX_JUGADORES) return rechazar(ws, 'invalido');
    const cuenta = cuentaDe(msg.token);
    sacarCuentaVieja(cuenta?.id, ws);
    if (salas.size >= MAX_SALAS) return rechazar(ws, 'muchas');
    crearSala(ws, msg.juego, max, cuenta);
    repartirLista();
  };

  const alUnirse = (ws, msg) => {
    if (ws.sala) return;
    const codigo = limpiarCodigoSala(msg.codigo);
    const cuenta = cuentaDe(msg.token);
    sacarCuentaVieja(cuenta?.id, ws);
    const sala = codigo ? salas.get(codigo) : null;
    if (!sala) return rechazar(ws, 'noexiste');
    if (sala.juego !== msg.juego) return rechazar(ws, 'otrojuego');
    if (sala.enPartida) return rechazar(ws, 'enpartida');
    if (sala.dentro.size >= sala.max) return rechazar(ws, 'llena');
    meter(ws, sala, cuenta);
    repartirLista();
  };

  /** Old PokéUsera clients (installed apps with a cached version) join with `entrar { clave }`: the first room of PokéUsera with a free seat, or a new one. */
  const alEntrarViejo = (ws) => {
    if (ws.sala) return;
    const sala = [...salas.values()].find((s) => s.juego === 'pokeusera' && !s.enPartida && s.dentro.size < s.max);
    if (sala) meter(ws, sala, null);
    else if (salas.size < MAX_SALAS) crearSala(ws, 'pokeusera', MAX_JUGADORES, null);
    else {
      rechazar(ws, 'llena');
      ws.close(1000);
      return;
    }
    repartirLista();
  };

  const alMensaje = (ws, crudo) => {
    let msg;
    try {
      msg = JSON.parse(crudo.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.tipo !== 'string') return;
    clearTimeout(ws.temporizador);
    const sala = ws.sala;
    if (sala) sala.actividad = Date.now();
    switch (msg.tipo) {
      case 'lista':
        if (sala || !JUEGOS_ONLINE.includes(msg.juego)) return;
        ws.mira = msg.juego;
        return enviar(ws, listaDe(ws.mira));
      case 'crear':
        return alCrear(ws, msg);
      case 'unirse':
        return alUnirse(ws, msg);
      case 'entrar':
        return alEntrarViejo(ws);
    }
    if (!sala) return;
    const yo = sala.dentro.get(ws);
    if (!yo) return;
    switch (msg.tipo) {
      case 'salir':
        return salirDeSala(ws);
      case 'elegir': {
        if (sala.enPartida) return;
        const pj = msg.pj === null ? null : limpiarPj(msg.pj);
        if (msg.pj !== null && pj === null) return;
        // Taken by someone else: nothing changes, but the sender gets the real state back.
        if (pj !== null && [...sala.dentro.values()].some((j) => j !== yo && j.pj === pj)) return enviar(ws, estadoSala(sala));
        yo.pj = pj;
        return repartirSala(sala);
      }
      case 'empezar':
        if (!yo.anfitrion || sala.enPartida) return;
        sala.enPartida = true;
        for (const w of sala.dentro.keys()) enviar(w, { tipo: 'empezar' });
        repartirSala(sala);
        return repartirLista();
      case 'volver':
        if (!yo.anfitrion || !sala.enPartida) return;
        sala.enPartida = false;
        for (const w of sala.dentro.keys()) enviar(w, { tipo: 'volver' });
        repartirSala(sala);
        return repartirLista();
      case 'juego': {
        // `a` is 'anfitrion', 'todos' or, from the host only, the id of one player (what only that player may see: their objects).
        const privado = Number.isInteger(msg.a) && yo.anfitrion;
        if (msg.a !== 'anfitrion' && msg.a !== 'todos' && !privado) return;
        const salida = JSON.stringify({ tipo: 'juego', de: yo.id, datos: msg.datos });
        const destinos = privado ? [...sala.dentro].filter(([, j]) => j.id === msg.a).map(([w]) => w) : msg.a === 'anfitrion' ? [anfitrionWs(sala)] : [...sala.dentro.keys()];
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
    ws.sala = null;
    ws.mira = null;
    ws.on('pong', () => {
      ws.vivo = true;
    });
    ws.on('message', (crudo) => alMensaje(ws, crudo));
    ws.on('close', () => {
      clearTimeout(ws.temporizador);
      salirDeSala(ws);
    });
    ws.on('error', () => ws.terminate());
    ws.temporizador = setTimeout(() => ws.terminate(), ESPERA_PRIMER_MENSAJE_MS);
  });

  servidor.on('upgrade', (req, socket, head) => {
    const ruta = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (ruta !== RUTA) return socket.destroy();
    if (!autorizar(req)) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  // Ping so Railway keeps the connection open; a socket that never answers is dropped (which also closes its room if it hosted one).
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

  // A room whose players have said nothing for 30 minutes is closed: no ghost room can hold one of the four places for ever.
  const revision = setInterval(() => {
    const ahora = Date.now();
    let cambio = false;
    for (const sala of [...salas.values()]) {
      if (ahora - sala.actividad < INACTIVA_MS) continue;
      cerrarSala(sala, 'inactiva');
      cambio = true;
    }
    if (cambio) repartirLista();
  }, REVISION_MS);
  revision.unref();

  servidor.on('close', () => {
    clearInterval(ping);
    clearInterval(revision);
  });
}
