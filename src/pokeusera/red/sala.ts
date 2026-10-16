// PokéUsera · online lobby, in the Game Boy style of the rest of the game: first the password
// screen (the canvas cannot type, so a real <input> is laid over it, styled like a text field),
// then the room (who is in, pick your trainer, the host starts). Both resolve with what the flow
// needs; the connection stays open for the game (see online.ts).
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
import { Conexion } from './conexion';

const CLAVE_GUARDADA = 'pokeusera.clave';

const leerClave = (): string => {
  try {
    return localStorage.getItem(CLAVE_GUARDADA) ?? '';
  } catch {
    return '';
  }
};
const guardarClave = (v: string) => {
  try {
    localStorage.setItem(CLAVE_GUARDADA, v);
  } catch {
    /* no storage */
  }
};

// ---------------------------------------------------------------- password screen

/** The password screen. Resolves with an open connection, or null if the player goes back. */
export function pantallaClave(): Promise<Conexion | null> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
    const campo = new Campo(leerClave(), 'online.clave');
    let ocupado = false;
    let hecho = false;
    const cerrar = (c: Conexion | null) => {
      if (hecho) return;
      hecho = true;
      campo.quitar();
      removeEventListener('resize', recolocar);
      res(c);
    };
    const recolocar = () => p.redibujar();
    addEventListener('resize', recolocar);

    const volver = () => {
      sonido.efecto('atras');
      cerrar(null);
    };
    const entrar = async () => {
      if (ocupado || hecho) return;
      ocupado = true;
      sonido.efecto('aceptar');
      campo.el.blur();
      p.redibujar();
      const con = new Conexion();
      const clave = campo.el.value.trim();
      const r = await con.entrar(clave);
      if (hecho) {
        con.cerrar();
        return;
      }
      if (!r.ok) {
        ocupado = false;
        sonido.efecto('atras');
        campo.mostrar(false);
        await mensaje(p.escena, envolver(t(`online.error.${r.motivo === 'en-partida' ? 'enpartida' : r.motivo}`), 190));
        if (!hecho) campo.mostrar(true);
        return;
      }
      guardarClave(clave);
      cerrar(con);
    };

    // The keys typed in the field are the password's: the game behind must not hear them.
    campo.el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        void entrar();
      } else if (e.key === 'Escape') volver();
    });

    const e: Escena = {
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.35);
        const tit = t('online.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 22, tw, 26);
        centrado(ctx, tit, 32);
        const y0 = 64 + Math.round((H - 384) * 0.1);
        panelCacheado(ctx, 8, y0, ANCHO - 16, 176);
        texto2(ctx, t('online.clave'), 22, y0 + 15, TINTA2);
        campo.colocar(20, y0 + 30, ANCHO - 40, 30);
        if (ocupado) {
          const s = t('online.conectando');
          if (Math.floor(ahora / 400) % 3 !== 2) texto2(ctx, s, Math.floor((ANCHO - anchoTexto2(s)) / 2), y0 + 70, TINTA_SUAVE);
        }
        boton(ctx, 20, y0 + 88, ANCHO - 40, 30, t('online.entrar'), false, !ocupado, 'principal');
        entrada.zona(20, y0 + 88, ANCHO - 40, 30, () => void entrar());
        boton(ctx, 20, y0 + 128, ANCHO - 40, 30, t('online.volver'), false);
        entrada.zona(20, y0 + 128, ANCHO - 40, 30, volver);
      },
      paso: () => ocupado,
      accion(a: Accion) {
        if (a === 'aceptar') void entrar();
        else if (a === 'atras') volver();
        return true;
      },
    };
    p.poner(e);
    // On a phone the keyboard would cover half the screen: only focus where there is a real keyboard.
    if (matchMedia('(pointer: fine)').matches) campo.el.focus();
  });
}

// ---------------------------------------------------------------- the room

export type SalidaSala = { r: 'empezar'; relleno: boolean } | { r: 'salir' } | { r: 'cerrada' };

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
 * the host starts (everybody gets `empezar` from the server), when the player leaves, or when the
 * room is closed or the connection is lost.
 */
export function pantallaSala(con: Conexion): Promise<SalidaSala> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
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
    offs.push(con.on('perdida', () => fin({ r: 'cerrada' })));

    const miPj = (): EntrenadorId | null => con.jugadores.find((j) => j.id === con.id)?.pj ?? null;
    const conPj = () => con.jugadores.filter((j) => j.pj !== null).length;
    /** The host can start with a trainer of his own and at least two seats (counting the machine's). */
    const puedeEmpezar = () => con.anfitrion && miPj() !== null && (relleno_ || conPj() >= 2);

    const salir = () => {
      sonido.efecto('atras');
      con.cerrar();
      fin({ r: 'salir' });
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
        const tit = t('sala.titulo');
        texto2(ctx, tit, 8, 6);
        texto2(ctx, `${con.jugadores.length}/4`, 8 + anchoTexto2(tit) + 8, 6, TINTA_SUAVE);
        // SALIR DE LA SALA: small in the corner, with a tap zone as tall as the bar plus 10 px (≥ 28 logical px, ≥ 44 CSS px on a phone).
        const ts = t('sala.salir');
        const sw = anchoTexto2(ts) + 14;
        const sx = ANCHO - 4 - sw;
        boton(ctx, sx, 2, sw, 14, ts, false, true, 'salir');

        // Who is in.
        const hf = 26 + Math.min(4, Math.floor(extra / 30));
        const lista = [...con.jugadores].sort((a, b) => a.id - b.id);
        for (let i = 0; i < 4; i++) {
          const y = 23 + i * (hf + 2);
          const j = lista[i];
          relleno(ctx, j ? TINTA2 : '#8a7690', 4, y, ANCHO - 8, hf);
          relleno(ctx, j ? PAPEL_ALTO : '#c9bb98', 5, y + 1, ANCHO - 10, hf - 2);
          const ty = y + Math.floor((hf - 7) / 2) + 1;
          if (!j) {
            texto2(ctx, t('sala.libre'), 30, ty, '#a898a8', null);
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
          panelCacheado(ctx, 4, y, ANCHO - 8, 24);
          texto2(ctx, t('sala.modo'), 14, y + 9);
          const vm = t(`modo.${con.modo}`);
          texto2(ctx, vm, ANCHO - 14 - anchoTexto2(vm), y + 9, con.modo === 'azar' ? colorEnt('vinas') : TINTA_SUAVE);
          const km = ctl.length;
          ctl.push({ x: 4, y, w: ANCHO - 8, h: 24, fn: () => ((sel = km), alternarModo()) });
          y += 27;

          panelCacheado(ctx, 4, y, ANCHO - 8, 24);
          texto2(ctx, t('sala.velocidad'), 14, y + 9);
          const vv = t(`velocidad.${con.velocidad}`);
          texto2(ctx, vv, ANCHO - 14 - anchoTexto2(vv), y + 9, TINTA_SUAVE);
          const kv = ctl.length;
          ctl.push({ x: 4, y, w: ANCHO - 8, h: 24, fn: () => ((sel = kv), alternarVelocidad()) });
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
