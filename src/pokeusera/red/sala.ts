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
import { mensaje } from '../pantallas/modal';
import { VELOCIDADES, barraArriba, boton, cfg, centrado, colorEnt, envolver, fondoPapel, nombreEnt, rect, t, texto2, velo } from '../pantallas/ui';
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
        p.redibujar();
      }),
    );
    offs.push(con.on('juego', () => p.redibujar()));
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
        texto2(ctx, t('sala.titulo'), 8, 6);
        const cuenta = `${con.jugadores.length}/4`;
        texto2(ctx, cuenta, ANCHO - 8 - anchoTexto2(cuenta), 6);

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
          if (j.pj) {
            ctx.drawImage(icono2(j.pj), 12, y + Math.floor((hf - 16) / 2));
            texto2(ctx, nombreEnt(j.pj), 34, ty);
          } else texto2(ctx, t('sala.eligiendo'), 34, ty, '#a898a8', null);
          let xf = ANCHO - 10;
          const py = y + Math.floor((hf - 12) / 2);
          if (j.anfitrion) xf -= pastilla(ctx, t('sala.anfitrion'), xf, py, TINTA2, '#fdf0c0') + 3;
          if (j.id === con.id) pastilla(ctx, t('sala.tu'), xf, py, j.pj ? colorEnt(j.pj) : TINTA_SUAVE, '#ffffff');
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

        // The mode (docs/POKEUSERA.md, «Modo AL AZAR»): everybody sees it, only the host changes it.
        panelCacheado(ctx, 4, y, ANCHO - 8, 24);
        texto2(ctx, t('sala.modo'), 14, y + 9);
        const vm = t(`modo.${con.modo}`);
        texto2(ctx, vm, ANCHO - 14 - anchoTexto2(vm), y + 9, con.modo === 'azar' ? colorEnt('vinas') : TINTA_SUAVE);
        if (con.anfitrion) {
          const k = ctl.length;
          ctl.push({ x: 4, y, w: ANCHO - 8, h: 24, fn: () => ((sel = k), alternarModo()) });
        }
        y += 27;

        // The battle speed: also the host's, the same for everybody.
        panelCacheado(ctx, 4, y, ANCHO - 8, 24);
        texto2(ctx, t('sala.velocidad'), 14, y + 9);
        const vv = t(`velocidad.${con.velocidad}`);
        texto2(ctx, vv, ANCHO - 14 - anchoTexto2(vv), y + 9, TINTA_SUAVE);
        if (con.anfitrion) {
          const k = ctl.length;
          ctl.push({ x: 4, y, w: ANCHO - 8, h: 24, fn: () => ((sel = k), alternarVelocidad()) });
        }
        y += 27;

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
        const yb = H - 36;
        const pista = con.anfitrion ? t(puedeEmpezar() ? 'sala.pista.listo' : mio ? 'sala.pista.faltan' : 'sala.pista.elige') : mio ? t('sala.esperando') : t('sala.pista.elige');
        const lp = envolver(pista, 200);
        const yh = Math.min(yb - 6 - lp.length * 12, y + 4);
        if (yh >= y) lp.forEach((l, i) => centrado(ctx, l, yh + i * 12, TINTA_SUAVE, { sombra: null }));
        if (con.anfitrion) {
          boton(ctx, 10, yb, 108, 28, t('sala.empezar'), false, puedeEmpezar(), 'principal');
          boton(ctx, 122, yb, 108, 28, t('sala.salir'), false, true, 'salir');
          const k = ctl.length;
          ctl.push({ x: 10, y: yb, w: 108, h: 28, fn: () => ((sel = k), empezar()) });
          ctl.push({ x: 122, y: yb, w: 108, h: 28, fn: salir });
        } else {
          boton(ctx, 66, yb, 108, 28, t('sala.salir'), false, true, 'salir');
          ctl.push({ x: 66, y: yb, w: 108, h: 28, fn: salir });
        }
        for (const c of ctl) entrada.zona(c.x, c.y, c.w, c.h, () => !empezando && c.fn());
        if (teclado && ctl[sel]) {
          const c = ctl[sel];
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
        if (a === 'atras') salir();
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

const parpadeo = (ahora: number): boolean => Math.floor(ahora / 400) % 2 === 0;
