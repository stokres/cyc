// PokéUsera · online lobby, in the Game Boy style of the rest of the game: first the list of open rooms (create one, tap one, or type a code: the canvas cannot type,
// so a real <input> is laid over it, styled like a text field), then the room (who is in, pick your trainer, the host starts). Both resolve with what the flow needs;
// the connection stays open for the game (see online.ts). The rooms themselves are the web's common service (docs/SALAS.md).
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { icono2, retrato2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { panelCacheado, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { guardarModo, modoElegido } from '../pantallas/ajustes';
import { Campo } from '../pantallas/campo';
import { dibujarFondoBar } from '../pantallas/fondos';
import { mensaje, sobre } from '../pantallas/modal';
import { VELOCIDADES, barraArriba, boton, cfg, centrado, colorEnt, envolver, fondoPapel, nombreEnt, oscurecer, rect, t, texto2, velo } from '../pantallas/ui';
import { JUEGO, MAX_JUGADORES, MAX_SALAS, SALA_NUEVA, limpiarCodigoSala, type Conexion, type ResultadoSala } from './conexion';

// ---------------------------------------------------------------- the list of rooms

/** The password of the old single room, kept in this phone's storage: gone now (the door of the web protects the rooms). */
const CLAVE_VIEJA = 'pokeusera.clave';
let claveViejaBorrada = false;
const borrarClaveVieja = () => {
  if (claveViejaBorrada) return;
  claveViejaBorrada = true;
  try {
    localStorage.removeItem(CLAVE_VIEJA);
  } catch {
    /* no storage */
  }
};

export type SalidaSalas = 'sala' | 'volver';

interface Zona {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

/**
 * The list of open rooms of PokéUsera: tap one to join, CREAR SALA, or TENGO UN CÓDIGO (four letters). Opens the connection if it is not open yet.
 * `codigo`: from a link (`?sala=K7MZ`): joins that room first, and shows the list only if that fails. `?sala=nueva` (`SALA_NUEVA`) creates a room of 4 instead, like CREAR SALA
 * (if it cannot be done, for example because there are already 4 rooms, the notice of that case and the list).
 * Resolves `'sala'` once the player is in a room (`con.id >= 0`), or `'volver'` when they go back (the caller closes the connection) or there is no connection.
 */
export function pantallaSalas(con: Conexion, codigo?: string): Promise<SalidaSalas> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
    borrarClaveVieja();
    /** The field for the code (only while typing one). */
    let campo: Campo | null = null;
    /** Connecting, or waiting for the answer to «create» / «join». */
    let ocupado = true;
    let hecho = false;
    let teclado = false;
    let selId = 'crear';
    let zonas: Zona[] = [];
    const offs: Array<() => void> = [];
    const recolocar = () => p.redibujar();
    addEventListener('resize', recolocar);
    const fin = (r: SalidaSalas) => {
      if (hecho) return;
      hecho = true;
      campo?.quitar();
      campo = null;
      removeEventListener('resize', recolocar);
      for (const f of offs) f();
      res(r);
    };

    const error = async (motivo: string) => {
      sonido.efecto('atras');
      const clave = `online.error.${motivo}`;
      campo?.mostrar(false);
      await mensaje(p.escena, envolver(t(clave).startsWith('[') ? t('online.error.red') : t(clave), 190));
      if (!hecho) campo?.mostrar(true);
      p.redibujar();
    };
    /** Asks the server for something that ends in a room (create / join): 'sala' on success, the error otherwise. */
    const entrarEn = async (accion: () => Promise<ResultadoSala>) => {
      if (ocupado || hecho) return;
      ocupado = true;
      campo?.el.blur();
      p.redibujar();
      const r = await accion();
      if (hecho) return;
      ocupado = false;
      if (r.ok) return fin('sala');
      await error(r.motivo);
    };
    const volver = () => {
      sonido.efecto('atras');
      fin('volver');
    };
    const crear = () => {
      sonido.efecto('aceptar');
      void entrarEn(() => con.crear(JUEGO, MAX_JUGADORES));
    };
    const unirse = (codigoSala: string) => {
      sonido.efecto('aceptar');
      void entrarEn(() => con.unirse(codigoSala, JUEGO));
    };

    // ---- typing a code
    const abrirCodigo = () => {
      if (ocupado || campo) return;
      sonido.efecto('aceptar');
      const c = new Campo('', { etiqueta: 'online.codigo.pide', max: 4, mayusculas: true });
      campo = c;
      // The keys typed in the field are the code's: the game behind must not hear them.
      c.el.addEventListener('keydown', (ev) => {
        ev.stopPropagation();
        if (ev.key === 'Enter') {
          ev.preventDefault();
          enviarCodigo();
        } else if (ev.key === 'Escape') cerrarCodigo();
      });
      selId = 'entrar';
      // On a phone the keyboard would cover half the screen: only focus where there is a real keyboard.
      if (matchMedia('(pointer: fine)').matches) c.el.focus();
      p.redibujar();
    };
    const cerrarCodigo = () => {
      if (!campo) return;
      sonido.efecto('atras');
      campo.quitar();
      campo = null;
      selId = 'codigo';
      p.redibujar();
    };
    const enviarCodigo = () => {
      if (ocupado || !campo) return;
      const c = limpiarCodigoSala(campo.el.value);
      if (!c) {
        void error('codigo');
        return;
      }
      unirse(c);
    };

    offs.push(con.on('salas', () => p.redibujar()));
    offs.push(
      con.on('perdida', () => {
        if (hecho) return;
        void error('red').then(() => fin('volver'));
      }),
    );

    const e: Escena = {
      get estatica() {
        return !ocupado && !teclado;
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.35);
        const tit = t('online.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 22, tw, 26);
        centrado(ctx, tit, 32);
        zonas = [];
        const bw = ANCHO - 40;
        const conectando = () => {
          const s = t('online.conectando');
          if (Math.floor(ahora / 400) % 3 !== 2) texto2(ctx, s, Math.floor((ANCHO - anchoTexto2(s)) / 2), y1, TINTA_SUAVE);
        };
        let y1 = 0;

        if (campo) {
          // Typing a code.
          const y0 = 64 + Math.round((H - 384) * 0.1);
          y1 = y0 + 68;
          panelCacheado(ctx, 8, y0, ANCHO - 16, 166);
          texto2(ctx, t('online.codigo.pide'), 22, y0 + 15, TINTA2);
          campo.colocar(20, y0 + 30, bw, 30);
          if (ocupado) conectando();
          else centrado(ctx, t('online.codigo.ayuda'), y1, TINTA_SUAVE, { sombra: null });
          zonas.push({ id: 'entrar', x: 20, y: y0 + 88, w: bw, h: 30, fn: enviarCodigo });
          zonas.push({ id: 'atras', x: 20, y: y0 + 128, w: bw, h: 30, fn: cerrarCodigo });
          boton(ctx, 20, y0 + 88, bw, 30, t('online.entrar'), false, !ocupado, 'principal');
          boton(ctx, 20, y0 + 128, bw, 30, t('online.volver'), false);
        } else {
          // The list of rooms (room for four, so nothing below it moves when the list does), the two ways of getting in, and the way back.
          const d = Math.round((H - 384) * 0.2);
          panelCacheado(ctx, 8, 56 + d, ANCHO - 16, 286);
          const max = con.maxSalas || MAX_SALAS;
          centrado(ctx, t('online.abiertas', { n: con.abiertas, max }), 66 + d, TINTA2);
          const llenas = con.abiertas >= max;
          y1 = 98 + d;
          if (!con.salas.length) {
            if (ocupado && !con.abierta) conectando();
            else envolver(t('online.vacio'), 190).forEach((l, i) => centrado(ctx, l, y1 + i * 12, TINTA_SUAVE, { sombra: null }));
          }
          con.salas.slice(0, 4).forEach((s, i) => {
            const y = 82 + d + i * 28;
            const libre = !s.enPartida && s.jugadores < s.max;
            panelCacheado(ctx, 14, y, ANCHO - 28, 26);
            const der = s.enPartida ? t('online.sala.jugando') : t('online.sala.cupo', { n: s.jugadores, max: s.max });
            const dw = anchoTexto2(der);
            texto2(ctx, der, ANCHO - 22 - dw, y + 10, libre ? TINTA_SUAVE : '#a898a8', null);
            const nom = s.anfitrion ? t('online.sala.de', { nombre: s.anfitrion }) : t('sala.codigo', { codigo: s.codigo });
            texto2(ctx, recortar(nom, ANCHO - 44 - dw - 8), 22, y + 10, libre ? TINTA2 : '#a898a8', libre ? undefined : null);
            if (!libre) velo(ctx, 16, y + 2, ANCHO - 32, 22, '#f0e2c0', 0.62);
            else zonas.push({ id: `sala-${s.codigo}`, x: 14, y, w: ANCHO - 28, h: 26, fn: () => unirse(s.codigo) });
          });
          const yCrear = 230 + d;
          if (llenas) {
            envolver(t('online.error.muchas'), 200).forEach((l, i, a) => centrado(ctx, l, yCrear - 4 - (a.length - i) * 12, TINTA_SUAVE, { sombra: null }));
          }
          boton(ctx, 20, yCrear, bw, 30, t('online.crear'), false, !llenas && !ocupado, 'principal');
          if (!llenas) zonas.push({ id: 'crear', x: 20, y: yCrear, w: bw, h: 30, fn: crear });
          boton(ctx, 20, yCrear + 36, bw, 30, t('online.codigo'), false);
          zonas.push({ id: 'codigo', x: 20, y: yCrear + 36, w: bw, h: 30, fn: abrirCodigo });
          boton(ctx, 20, yCrear + 72, bw, 30, t('online.volver'), false);
          zonas.push({ id: 'atras', x: 20, y: yCrear + 72, w: bw, h: 30, fn: volver });
        }

        for (const z of zonas) entrada.zona(z.x, z.y, z.w, z.h, () => !ocupado && z.fn());
        // VOLVER is always allowed (even while connecting).
        const v = zonas.find((z) => z.id === 'atras');
        if (v) entrada.zona(v.x, v.y, v.w, v.h, v.fn);
        const z = zonas.find((q) => q.id === selId) ?? zonas[0];
        if (teclado && z) {
          const col = Math.floor(ahora / 400) % 2 === 0 ? TINTA2 : '#e0a83a';
          rect(ctx, col, z.x - 2, z.y - 2, z.w + 4, 2);
          rect(ctx, col, z.x - 2, z.y + z.h, z.w + 4, 2);
          rect(ctx, col, z.x - 2, z.y, 2, z.h);
          rect(ctx, col, z.x + z.w, z.y, 2, z.h);
        }
      },
      accion(a: Accion) {
        teclado = true;
        if (a === 'atras') {
          if (campo) cerrarCodigo();
          else volver();
          return true;
        }
        if (!zonas.length) return true;
        let k = zonas.findIndex((z) => z.id === selId);
        if (k < 0) k = 0;
        if (a === 'aceptar') {
          if (!ocupado) zonas[k].fn();
        } else if (a === 'der' || a === 'abajo' || a === 'izq' || a === 'arriba') {
          const paso = a === 'der' || a === 'abajo' ? 1 : -1;
          selId = zonas[(k + paso + zonas.length) % zonas.length].id;
          sonido.efecto('cursor');
        }
        p.redibujar();
        return true;
      },
    };
    p.poner(e);

    void (async () => {
      if (!con.abierta) {
        const ok = await con.abrir();
        if (hecho) return;
        if (!ok) {
          await error('red');
          return fin('volver');
        }
      }
      ocupado = false;
      con.mirarLista(JUEGO);
      p.redibujar();
      if (!codigo) return;
      // From a link: `nueva` creates a room; otherwise that room first. If it cannot be done, the list.
      if (codigo.toLowerCase() === SALA_NUEVA) return entrarEn(() => con.crear(JUEGO, MAX_JUGADORES));
      const c = limpiarCodigoSala(codigo);
      if (!c) return error('noexiste');
      await entrarEn(() => con.unirse(c, JUEGO));
    })();
  });
}

// ---------------------------------------------------------------- the room

export type SalidaSala = { r: 'empezar'; relleno: boolean } | { r: 'salir' } | { r: 'cerrada' } | { r: 'perdida' };

/** «RELLENAR CON MÁQUINA» survives going back to the room after a game. */
let ultimoRelleno = true;

interface Control {
  x: number;
  y: number;
  w: number;
  h: number;
  fn: () => void;
  /** What is drawn when the tap zone is bigger than the button (the selection ring goes around this). */
  ver?: { x: number; y: number; w: number; h: number };
}

function pastilla(ctx: CanvasRenderingContext2D, s: string, xFin: number, y: number, fondo: string, texto: string): number {
  const w = anchoTexto2(s) + 8;
  const x = xFin - w;
  relleno(ctx, TINTA2, x, y, w, 12);
  relleno(ctx, fondo, x + 1, y + 1, w - 2, 10);
  rect(ctx, 'rgba(255,255,255,0.3)', x + 2, y + 1, w - 4, 1);
  texto2(ctx, s, x + 4, y + 3, texto, null);
  return w;
}

/**
 * The room: the list of who is in, the trainers to pick from, and (host) EMPEZAR. Resolves when
 * the host starts (everybody gets `empezar` from the server), when the player leaves (back to the list), when the
 * room is closed (also back to the list) or when the connection is lost.
 */
export function pantallaSala(con: Conexion): Promise<SalidaSala> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
    /** The code is kept here: when the room closes the connection forgets it, and the notice that follows is drawn over this screen. */
    const codigoSala = con.codigo;
    let relleno_ = ultimoRelleno;
    let sel = 0;
    let teclado = false;
    let hecho = false;
    /** EMPEZAR was sent and the server has not answered yet: taps and keys that follow are ignored (they could hit SALIR). */
    let empezando = false;
    let ctl: Control[] = [];
    const offs: Array<() => void> = [];
    const fin = (r: SalidaSala) => {
      if (hecho) return;
      hecho = true;
      for (const f of offs) f();
      res(r);
    };
    // The mode (AL AZAR / NORMAL) is the host's: it starts as the one used last, and the room is told again whenever somebody joins (a guest asks nothing).
    let jugadoresAnunciados = con.jugadores.length;
    if (con.anfitrion) {
      con.modo = modoElegido();
      con.velocidad = cfg.velocidad;
      con.anunciarModo();
    }
    offs.push(
      con.on('sala', () => {
        if (con.anfitrion && con.jugadores.length !== jugadoresAnunciados) con.anunciarModo();
        jugadoresAnunciados = con.jugadores.length;
        nombresAnunciados = firmaNombres();
        p.redibujar();
      }),
    );
    // The host's lobby learns a guest's account name a moment after he joins: the room is told the names again when they change.
    const firmaNombres = () => con.jugadores.map((j) => con.nombreDe(j.id) ?? '').join('|');
    let nombresAnunciados = firmaNombres();
    offs.push(
      con.on('juego', () => {
        if (con.anfitrion && firmaNombres() !== nombresAnunciados) {
          nombresAnunciados = firmaNombres();
          con.anunciarModo();
        }
        p.redibujar();
      }),
    );
    offs.push(
      con.on('empezar', () => {
        ultimoRelleno = relleno_;
        fin({ r: 'empezar', relleno: relleno_ });
      }),
    );
    offs.push(con.on('cerrada', () => fin({ r: 'cerrada' })));
    offs.push(con.on('perdida', () => fin({ r: 'perdida' })));

    const miPj = (): EntrenadorId | null => con.jugadores.find((j) => j.id === con.id)?.pj ?? null;
    const conPj = () => con.jugadores.filter((j) => j.pj !== null).length;
    /** The host can start with a trainer of his own and at least two seats (counting the machine's). */
    const puedeEmpezar = () => con.anfitrion && miPj() !== null && (relleno_ || conPj() >= 2);

    const salir = () => {
      sonido.efecto('atras');
      con.salir();
      fin({ r: 'salir' });
    };
    /** COMPARTIR: the phone's share sheet with the link to this room; without one, the link is copied. */
    const compartir = async () => {
      const url = `${location.origin}/pokeusera?sala=${codigoSala}`;
      sonido.efecto('aceptar');
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ text: t('online.compartir', { codigo: codigoSala }), url });
          return;
        } catch (err) {
          if ((err as { name?: string } | null)?.name === 'AbortError') return;
        }
      }
      let copiado = true;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        copiado = false;
      }
      if (!hecho) await mensaje(e, copiado ? [t('online.copiado')] : envolver(t('online.error.copiar', { codigo: codigoSala }), 190));
    };
    /** The «are you sure?» box of the host (leaving closes the room for everybody); QUEDARME is the default. Resolves true to leave. */
    let confirmando = false;
    const confirmarCierre = (): Promise<boolean> =>
      sobre<boolean>(e, (cerrar) => {
        let sel = 1;
        const lineas = envolver(t('sala.cerrar.aviso'), 176);
        const quedarme = () => {
          sonido.efecto('atras');
          cerrar(false);
        };
        return {
          dibujar(ctx) {
            const x = 6;
            const w = ANCHO - 12;
            const h = 64 + lineas.length * 12;
            const y = Math.round((p.alto - h) / 2);
            oscurecer(ctx, p.alto);
            panelCacheado(ctx, x, y, w, h);
            lineas.forEach((l, i) => centrado(ctx, l, y + 14 + i * 12));
            const bw = Math.floor((w - 28 - 8) / 2);
            const by = y + h - 14 - 30;
            boton(ctx, x + 14, by, bw, 30, t('sala.cerrar.salir'), sel === 0, true, 'salir');
            boton(ctx, x + w - 14 - bw, by, bw, 30, t('sala.cerrar.quedar'), sel === 1);
            entrada.zona(x + 14, by, bw, 30, () => cerrar(true));
            entrada.zona(x + w - 14 - bw, by, bw, 30, quedarme);
          },
          accion(a) {
            if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') {
              sel = 1 - sel;
              sonido.efecto('cursor');
            } else if (a === 'atras') quedarme();
            else if (a === 'aceptar') {
              if (sel === 0) cerrar(true);
              else quedarme();
            }
          },
        };
      });
    /** SALIR DE LA SALA: a guest goes at once; the host is asked first. */
    const pedirSalida = async () => {
      if (hecho || confirmando) return;
      if (!con.anfitrion) return salir();
      confirmando = true;
      const ok = await confirmarCierre();
      confirmando = false;
      if (ok && !hecho) salir();
    };
    const elegir = (id: EntrenadorId) => {
      const dueno = con.jugadores.find((j) => j.pj === id);
      if (dueno && dueno.id !== con.id) {
        sonido.efecto('atras');
        return;
      }
      sonido.efecto('elegido');
      con.enviar({ tipo: 'elegir', pj: miPj() === id ? null : id });
    };
    const alternar = () => {
      relleno_ = !relleno_;
      sonido.efecto('cursor');
    };
    const alternarModo = () => {
      con.modo = con.modo === 'azar' ? 'normal' : 'azar';
      guardarModo(con.modo);
      con.anunciarModo();
      sonido.efecto('cursor');
    };
    /** The battle speed is the room's (the host's choice, the same on every phone): it does not touch each one's own setting. */
    const alternarVelocidad = () => {
      con.velocidad = VELOCIDADES[(VELOCIDADES.indexOf(con.velocidad) + 1) % VELOCIDADES.length];
      con.anunciarModo();
      sonido.efecto('cursor');
    };
    const empezar = () => {
      if (!puedeEmpezar()) {
        sonido.efecto('atras');
        return;
      }
      sonido.efecto('aceptar');
      empezando = true;
      setTimeout(() => (empezando = false), 3000);
      con.enviar({ tipo: 'empezar' });
    };

    const e: Escena = {
      dibujar(ctx, ahora) {
        const H = p.alto;
        const extra = Math.max(0, H - 384);
        fondoPapel(ctx, H);
        ctl = [];
        // Header.
        barraArriba(ctx);
        const tit = t('sala.codigo', { codigo: codigoSala });
        texto2(ctx, tit, 8, 6);
        // COMPARTIR: small, right of the code (it has the room the «2/4» counter had: the rows below already say who is in and how many seats there are).
        const tc = t('online.compartir.boton');
        const cw = anchoTexto2(tc) + 10;
        const cx = 8 + anchoTexto2(tit) + 6;
        boton(ctx, cx, 2, cw, 14, tc, false, true, 'secundario');
        // SALIR DE LA SALA: small in the corner, with a tap zone as tall as the bar plus 10 px (≥ 28 logical px, ≥ 44 CSS px on a phone).
        const ts = t('sala.salir');
        const sw = anchoTexto2(ts) + 14;
        const sx = ANCHO - 4 - sw;
        boton(ctx, sx, 2, sw, 14, ts, false, true, 'salir');

        // Who is in.
        const hf = 26 + Math.min(4, Math.floor(extra / 30));
        const lista = [...con.jugadores].sort((a, b) => a.id - b.id);
        const cupo = con.max || 4;
        for (let i = 0; i < 4; i++) {
          const y = 23 + i * (hf + 2);
          const j = lista[i];
          relleno(ctx, j ? TINTA2 : '#8a7690', 4, y, ANCHO - 8, hf);
          relleno(ctx, j ? PAPEL_ALTO : '#c9bb98', 5, y + 1, ANCHO - 10, hf - 2);
          const ty = y + Math.floor((hf - 7) / 2) + 1;
          if (!j) {
            // The seats past the room's size (a room of two has two) are not free: nobody can sit there.
            texto2(ctx, t(i < cupo ? 'sala.libre' : 'sala.cerrado'), 30, ty, '#a898a8', null);
            continue;
          }
          const col = j.pj ? colorEnt(j.pj) : '#a898a8';
          rect(ctx, col, 5, y + 1, 4, hf - 2);
          if (j.pj) ctx.drawImage(icono2(j.pj), 12, y + Math.floor((hf - 16) / 2));
          let xf = ANCHO - 10;
          const py = y + Math.floor((hf - 12) / 2);
          if (j.anfitrion) xf -= pastilla(ctx, t('sala.anfitrion'), xf, py, TINTA2, '#fdf0c0') + 3;
          if (j.id === con.id) xf -= pastilla(ctx, t('sala.tu'), xf, py, j.pj ? colorEnt(j.pj) : TINTA_SUAVE, '#ffffff') + 3;
          // The account name always; under it the trainer (or «eligiendo»). Without a name the trainer's, or ELIGIENDO, as before.
          const nom = con.nombreDe(j.id);
          if (nom) {
            const l1 = recortar(nom, xf - 34 - 2);
            texto2(ctx, l1, 34, y + Math.floor((hf - 17) / 2) + 1);
            texto2(ctx, j.pj ? nombreEnt(j.pj) : t('sala.eligiendo.nombre'), 34, y + Math.floor((hf - 17) / 2) + 10, TINTA_SUAVE, null);
          } else if (j.pj) texto2(ctx, nombreEnt(j.pj), 34, ty);
          else texto2(ctx, t('sala.eligiendo'), 34, ty, '#a898a8', null);
        }

        // Pick your trainer: seven in two columns (a face icon and two lines on a short phone, the 40×40 portrait when there is room).
        let y = 23 + 4 * (hf + 2) + 3;
        texto2(ctx, t('sala.elige'), Math.floor((ANCHO - anchoTexto2(t('sala.elige'))) / 2), y + 2, TINTA2, '#f0e6c8');
        y += 15;
        const mio = miPj();
        const ch = 30 + Math.min(18, Math.floor(extra / 8));
        const comp = ch < 44;
        ENTRENADORES.forEach((id, i) => {
          const x = 4 + (i % 2) * 118;
          const yy = y + Math.floor(i / 2) * (ch + 4);
          const dueno = con.jugadores.find((j) => j.pj === id);
          const mia = mio === id;
          const ajena = !!dueno && !mia;
          const col = colorEnt(id);
          if (mia) {
            rect(ctx, col, x - 2, yy - 2, 116 + 4, ch + 4);
          }
          panelCacheado(ctx, x, yy, 116, ch, col);
          const estado = mia ? t('sala.tuyo') : ajena ? t('sala.ocupado') : t('sala.libre');
          if (comp) {
            ctx.drawImage(icono2(id), x + 6, yy + Math.floor((ch - 16) / 2));
            texto2(ctx, nombreEnt(id), x + 28, yy + Math.floor(ch / 2) - 8, TINTA2);
            texto2(ctx, estado, x + 28, yy + Math.floor(ch / 2) + 3, mia ? col : TINTA_SUAVE, null);
          } else {
            ctx.drawImage(retrato2(id), x + 6, yy + Math.floor((ch - 40) / 2));
            texto2(ctx, nombreEnt(id), x + 52, yy + Math.floor(ch / 2) - 10, TINTA2);
            texto2(ctx, estado, x + 52, yy + Math.floor(ch / 2) + 4, mia ? col : TINTA_SUAVE, null);
          }
          if (ajena) velo(ctx, x + 2, yy + 2, 112, ch - 4, '#f0e2c0', 0.62);
          const k = ctl.length;
          ctl.push({ x, y: yy, w: 116, h: ch, fn: () => ((sel = k), elegir(id)) });
        });
        y += Math.ceil(ENTRENADORES.length / 2) * (ch + 4);

        // The mode (docs/POKEUSERA.md, «Modo AL AZAR») and the battle speed: the host's, the same for everybody.
        // The host taps them (two rows); a guest cannot, so for him they are plain text, not a button-looking panel.
        if (con.anfitrion) {
          // On a short phone the three rows of the host (mode, speed, fill) would run into EMPEZAR: mode and speed share one row, in two halves.
          const juntas = y + 3 * 27 > H - 34;
          const wm = juntas ? Math.floor((ANCHO - 12) / 2) : ANCHO - 8;
          panelCacheado(ctx, 4, y, wm, 24);
          texto2(ctx, t('sala.modo'), 14, y + 9);
          const vm = t(`modo.${con.modo}`);
          texto2(ctx, vm, 4 + wm - 10 - anchoTexto2(vm), y + 9, con.modo === 'azar' ? colorEnt('vinas') : TINTA_SUAVE);
          const km = ctl.length;
          const ym = y;
          ctl.push({ x: 4, y: ym, w: wm, h: 24, fn: () => ((sel = km), alternarModo()) });
          const xv = juntas ? 8 + wm : 4;
          if (!juntas) y += 27;

          panelCacheado(ctx, xv, y, wm, 24);
          texto2(ctx, t('sala.velocidad'), xv + 10, y + 9);
          const vv = t(`velocidad.${con.velocidad}`);
          texto2(ctx, vv, xv + wm - 10 - anchoTexto2(vv), y + 9, TINTA_SUAVE);
          const kv = ctl.length;
          const yv = y;
          ctl.push({ x: xv, y: yv, w: wm, h: 24, fn: () => ((sel = kv), alternarVelocidad()) });
          y += 27;
        } else {
          y += 2;
          centrado(ctx, t('sala.config', { modo: t(`modo.${con.modo}`), velocidad: t(`velocidad.${con.velocidad}`) }), y, TINTA2, { sombra: null });
          centrado(ctx, t('sala.loElige'), y + 11, TINTA_SUAVE, { sombra: null });
          y += 32;
        }

        // Host: fill with machines?
        if (con.anfitrion) {
          panelCacheado(ctx, 4, y, ANCHO - 8, 24);
          texto2(ctx, t('sala.rellenar'), 14, y + 9);
          const v = t(relleno_ ? 'sala.si' : 'sala.no');
          texto2(ctx, v, ANCHO - 14 - anchoTexto2(v), y + 9, relleno_ ? colorEnt('chuchi') : TINTA_SUAVE);
          const k = ctl.length;
          ctl.push({ x: 4, y, w: ANCHO - 8, h: 24, fn: () => ((sel = k), alternar()) });
          y += 27;
        }

        // Hint and buttons (on a short phone the host's two rows leave no room for the hint: it is left out).
        const yb = H - 32;
        const pista = con.anfitrion ? t(puedeEmpezar() ? 'sala.pista.listo' : mio ? 'sala.pista.faltan' : 'sala.pista.elige') : mio ? t('sala.esperando') : t('sala.pista.elige');
        const lp = envolver(pista, 200);
        const yh = con.anfitrion ? Math.min(yb - 6 - lp.length * 12, y + 4) : y + 4;
        if (yh >= y) lp.forEach((l, i) => centrado(ctx, l, yh + i * 12, TINTA_SUAVE, { sombra: null }));
        // Host: one wide EMPEZAR (grey until it can start). A guest has no button down here, only the hint. SALIR DE LA SALA is last in `ctl`.
        if (con.anfitrion) {
          boton(ctx, 20, yb, ANCHO - 40, 28, t('sala.empezar'), false, puedeEmpezar(), 'principal');
          const k = ctl.length;
          ctl.push({ x: 20, y: yb, w: ANCHO - 40, h: 28, fn: () => ((sel = k), empezar()) });
        }
        ctl.push({ x: cx - 3, y: 0, w: cw + 6, h: 28, fn: () => void compartir(), ver: { x: cx, y: 2, w: cw, h: 14 } });
        ctl.push({ x: sx - 6, y: 0, w: sw + 10, h: 28, fn: () => void pedirSalida(), ver: { x: sx, y: 2, w: sw, h: 14 } });
        for (const c of ctl) entrada.zona(c.x, c.y, c.w, c.h, () => !empezando && c.fn());
        if (teclado && ctl[sel]) {
          const c = ctl[sel].ver ?? ctl[sel];
          const col = parpadeo(ahora) ? TINTA2 : '#e0a83a';
          rect(ctx, col, c.x - 2, c.y - 2, c.w + 4, 2);
          rect(ctx, col, c.x - 2, c.y + c.h, c.w + 4, 2);
          rect(ctx, col, c.x - 2, c.y, 2, c.h);
          rect(ctx, col, c.x + c.w, c.y, 2, c.h);
        }
      },
      paso: () => teclado,
      accion(a: Accion) {
        teclado = true;
        const n = ctl.length;
        const NT = ENTRENADORES.length;
        if (!n || empezando) return true;
        sel = Math.min(sel, n - 1);
        if (a === 'atras') void pedirSalida();
        else if (a === 'aceptar') ctl[sel].fn();
        else if (a === 'der') sel = (sel + 1) % n;
        else if (a === 'izq') sel = (sel + n - 1) % n;
        else if (a === 'abajo') sel = sel + 2 < NT ? sel + 2 : sel < NT ? NT % n : (sel + 1) % n;
        else if (a === 'arriba') sel = sel >= 2 && sel < NT ? sel - 2 : sel === NT % n ? NT - 1 : (sel + n - 1) % n;
        if (a !== 'aceptar' && a !== 'atras') sonido.efecto('cursor');
        return true;
      },
    };
    p.poner(e);
  });
}

/** The text cut with «…»-less truncation so it fits `ancho` px (names are short, but never let one run under the badges). */
function recortar(s: string, ancho: number): string {
  let r = s;
  while (r.length > 1 && anchoTexto2(r) > ancho) r = r.slice(0, -1);
  return r;
}

const parpadeo = (ahora: number): boolean => Math.floor(ahora / 400) % 2 === 0;
