// The online rooms open right now, in the cover's «Salas online» sticker (docs/SALAS.md): one WebSocket to /sala that asks for the rooms of ALL the games
// and repaints the sticker only when the list arrives (nothing per frame). Each room has its ENTRAR link and each game that can open a room from a link
// has its «Crear sala» one (`enlaceSala`). No connection (no network, 401 without the door's pass, a failure): the sticker is hidden and nothing is said;
// it tries again every 15 s while the page is visible. A hidden page closes the socket and reopens it when it is seen again.
// Plain DOM, no game code: it only uses the web's common room client (src/sala/).
import { hayTexto, texto } from '../juego/textos';
import { ConexionSala, SALAS_EN_WEB, enlaceSala, type InfoSala, type MsgSalas } from '../sala/conexion';

const REINTENTO_MS = 15_000;

const nombreJuego = (juego: string): string => (hayTexto(`salas.juego.${juego}`) ? texto(`salas.juego.${juego}`) : juego);

function crear<K extends keyof HTMLElementTagNameMap>(etiqueta: K, clase?: string, contenido?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (contenido !== undefined) el.textContent = contenido;
  return el;
}

/** One room: who hosts it, the game, how many are in and ENTRAR (or JUGANDO / LLENA when nobody can get in). */
function filaSala(s: InfoSala): HTMLLIElement {
  const li = crear('li', 'sala');
  const nombre = s.anfitrion ? texto('salas.de', { nombre: s.anfitrion }) : texto('salas.codigo', { codigo: s.codigo });
  const quien = crear('div', 'quien');
  quien.append(crear('span', 'nombre', nombre), crear('span', 'juego-etq', nombreJuego(s.juego)));
  li.append(quien, crear('span', 'cupo', texto('salas.cupo', { n: s.jugadores, max: s.max })));

  const libre = !s.enPartida && s.jugadores < s.max;
  const enlace = enlaceSala(s.juego, s.codigo);
  if (!libre) {
    li.append(crear('span', 'sellito', texto(s.enPartida ? 'salas.jugando' : 'salas.llena')));
  } else if (enlace) {
    const dale = crear('span', 'dale');
    const a = crear('a', undefined, texto('salas.entrar'));
    a.href = enlace;
    a.setAttribute('aria-label', texto('salas.entrar.aria', { sala: nombre, juego: nombreJuego(s.juego) }));
    dale.append(a);
    li.append(dale);
  }
  return li;
}

function pintar(caja: HTMLElement, m: MsgSalas) {
  const llenas = m.abiertas >= m.max;
  const titulo = crear('h2', undefined, texto('salas.titulo', { n: m.abiertas, max: m.max }));
  titulo.id = 'salas-titulo';
  const ticket = crear('div', 'ticket');
  ticket.append(titulo);

  if (m.salas.length) {
    const lista = crear('ul', 'filas');
    for (const s of m.salas) lista.append(filaSala(s));
    ticket.append(lista);
  }

  const pie = crear('div', m.salas.length ? 'crear' : 'crear solo');
  if (!m.salas.length) pie.append(crear('p', 'vacio', texto('salas.vacio')));
  const botones = crear('div', 'botones');
  for (const juego of Object.keys(SALAS_EN_WEB)) {
    const etiqueta = texto('salas.crear', { juego: nombreJuego(juego) });
    const dale = crear('span', llenas ? 'dale ros apagado' : 'dale ros');
    if (llenas) {
      const b = crear('button', undefined, etiqueta);
      b.type = 'button';
      b.disabled = true;
      dale.append(b);
    } else {
      const a = crear('a', undefined, etiqueta);
      a.href = enlaceSala(juego, 'nueva') ?? '#';
      dale.append(a);
    }
    botones.append(dale);
  }
  pie.append(botones);
  if (llenas) pie.append(crear('p', 'llenas', texto('salas.llenas', { max: m.max })));
  ticket.append(pie);

  caja.replaceChildren(ticket);
  caja.hidden = false;
}

export function iniciarSalas() {
  const caja = document.getElementById('salas');
  if (!caja) return;
  let con: ConexionSala | null = null;
  let reintento = 0;
  /** What is painted now: the same list again does not rebuild the DOM (a tap on ENTRAR must not lose its button under the finger). */
  let firma = '';

  const ocultar = () => {
    caja.hidden = true;
    caja.replaceChildren();
    firma = '';
  };
  const programar = () => {
    clearTimeout(reintento);
    if (!document.hidden) reintento = window.setTimeout(() => void conectar(), REINTENTO_MS);
  };

  async function conectar() {
    clearTimeout(reintento);
    if (con || document.hidden) return;
    // A new object every time: a closed one can still hear the late `close` of its old socket.
    const c = new ConexionSala();
    con = c;
    c.on('salas', (m) => {
      if (con !== c) return;
      const f = JSON.stringify([m.salas, m.abiertas, m.max]);
      if (f === firma) return;
      firma = f;
      pintar(caja!, m);
    });
    c.on('perdida', () => {
      if (con !== c) return;
      con = null;
      ocultar();
      programar();
    });
    const ok = await c.abrir();
    // The page was hidden (and the socket closed on purpose) while it was opening.
    if (con !== c) return;
    if (!ok) {
      con = null;
      ocultar();
      programar();
      return;
    }
    c.mirarTodas();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(reintento);
      const c = con;
      con = null;
      c?.cerrar();
    } else void conectar();
  });
  void conectar();
}
