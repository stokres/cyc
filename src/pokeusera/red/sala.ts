// PokéUsera · online lobby, in the Game Boy style of the rest of the game: first the password
// screen (the canvas cannot type, so a real <input> is laid over it, styled like a text field),
// then the room (who is in, pick your trainer, the host starts). Both resolve with what the flow
// needs; the connection stays open for the game (see online.ts).
import { ENTRENADORES, type EntrenadorId } from '../tipos';
import { anchoMini, dibujarMini, dibujarTexto, envolver } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { CLARO, FONDO, NEGRO, OSCURO, PAPEL } from '../arte/paleta';
import { icono } from '../arte/sprites';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { mensaje } from '../pantallas/modal';
import { fondoCampo } from '../pantallas/titulo';
import { boton, centrado, colorEnt, nombreEnt, rect, t, velo } from '../pantallas/ui';
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

/** A real text field laid over the canvas, styled like a Game Boy one. */
class Campo {
  readonly el: HTMLInputElement;
  private ultimo = '';

  constructor(valor: string) {
    const el = document.createElement('input');
    el.type = 'text';
    el.value = valor;
    el.maxLength = 64;
    el.autocomplete = 'off';
    el.setAttribute('autocapitalize', 'none');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('enterkeyhint', 'go');
    el.setAttribute('aria-label', t('online.clave'));
    el.style.cssText = `position:fixed;z-index:20;box-sizing:border-box;margin:0;padding:0 6px;border:2px solid ${NEGRO};border-radius:0;background:${PAPEL};color:${NEGRO};font-family:ui-monospace,Menlo,Consolas,"Courier New",monospace;font-weight:700;letter-spacing:1px;outline:none;box-shadow:inset 0 0 0 2px ${OSCURO};user-select:text;-webkit-user-select:text;touch-action:manipulation;caret-color:${NEGRO};`;
    document.body.appendChild(el);
    this.el = el;
  }

  /** Puts the field over the logical rectangle (x, y, w, h) of the canvas. */
  colocar(x: number, y: number, w: number, h: number) {
    const r = pantalla().canvas.getBoundingClientRect();
    const s = r.width / ANCHO;
    const clave = [r.left, r.top, r.width, x, y, w, h].join(',');
    if (clave === this.ultimo) return;
    this.ultimo = clave;
    const st = this.el.style;
    st.left = `${r.left + x * s}px`;
    st.top = `${r.top + y * s}px`;
    st.width = `${w * s}px`;
    st.height = `${h * s}px`;
    // 16 px or more, so phones do not zoom in when the field gets the focus.
    st.fontSize = `${Math.max(16, Math.round(7 * s))}px`;
  }

  mostrar(v: boolean) {
    this.el.style.visibility = v ? 'visible' : 'hidden';
  }

  quitar() {
    this.el.remove();
  }
}

/** The password screen. Resolves with an open connection, or null if the player goes back. */
export function pantallaClave(): Promise<Conexion | null> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
    const campo = new Campo(leerClave());
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
        await mensaje(p.escena, envolver(t(`online.error.${r.motivo === 'en-partida' ? 'enpartida' : r.motivo}`), 128));
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
        fondoCampo(ctx, H, Math.round(H * 0.3));
        centrado(ctx, t('online.titulo'), 10, NEGRO, { sombra: CLARO });
        const y0 = 28;
        marco(ctx, 8, y0, 144, 118);
        dibujarTexto(ctx, t('online.clave'), 18, y0 + 10, NEGRO);
        campo.colocar(16, y0 + 22, 128, 22);
        if (ocupado) {
          const s = t('online.conectando');
          if (Math.floor(ahora / 400) % 3 !== 2) dibujarTexto(ctx, s, 80 - Math.floor((s.length * 8) / 2), y0 + 52, OSCURO);
        }
        boton(ctx, 16, y0 + 62, 128, 22, t('online.entrar'), false, !ocupado);
        entrada.zona(16, y0 + 62, 128, 22, () => void entrar());
        boton(ctx, 16, y0 + 88, 128, 22, t('online.volver'), false);
        entrada.zona(16, y0 + 88, 128, 22, volver);
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
  const w = anchoMini(s) + 5;
  const x = xFin - w;
  rect(ctx, NEGRO, x + 1, y, w - 2, 9);
  rect(ctx, NEGRO, x, y + 1, w, 7);
  rect(ctx, fondo, x + 1, y + 1, w - 2, 7);
  dibujarMini(ctx, s, x + 3, y + 2, texto);
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
    let relleno = ultimoRelleno;
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
    offs.push(con.on('sala', () => p.redibujar()));
    offs.push(
      con.on('empezar', () => {
        ultimoRelleno = relleno;
        fin({ r: 'empezar', relleno });
      }),
    );
    offs.push(con.on('cerrada', () => fin({ r: 'cerrada' })));
    offs.push(con.on('perdida', () => fin({ r: 'cerrada' })));

    const miPj = (): EntrenadorId | null => con.jugadores.find((j) => j.id === con.id)?.pj ?? null;
    const conPj = () => con.jugadores.filter((j) => j.pj !== null).length;
    /** The host can start with a trainer of his own and at least two seats (counting the machine's). */
    const puedeEmpezar = () => con.anfitrion && miPj() !== null && (relleno || conPj() >= 2);

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
      relleno = !relleno;
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
        const extra = Math.max(0, H - 256);
        rect(ctx, FONDO, 0, 0, ANCHO, H);
        ctl = [];
        // Header.
        rect(ctx, PAPEL, 0, 0, ANCHO, 16);
        rect(ctx, NEGRO, 0, 16, ANCHO, 1);
        dibujarTexto(ctx, t('sala.titulo'), 6, 4, NEGRO);
        const cuenta = `${con.jugadores.length}/4`;
        dibujarTexto(ctx, cuenta, 154 - cuenta.length * 8, 4, NEGRO);

        // Who is in.
        const hf = 17 + Math.min(4, Math.floor(extra / 20));
        const lista = [...con.jugadores].sort((a, b) => a.id - b.id);
        for (let i = 0; i < 4; i++) {
          const y = 20 + i * hf;
          const j = lista[i];
          rect(ctx, j ? NEGRO : CLARO, 4, y, 152, hf - 2);
          rect(ctx, j ? PAPEL : FONDO, 5, y + 1, 150, hf - 4);
          const ty = y + Math.floor((hf - 2 - 7) / 2);
          if (!j) {
            dibujarTexto(ctx, t('sala.libre'), 22, ty, CLARO);
            continue;
          }
          const col = j.pj ? colorEnt(j.pj) : CLARO;
          rect(ctx, col, 5, y + 1, 3, hf - 4);
          if (j.pj) {
            ctx.drawImage(icono(j.pj), 11, y + Math.floor((hf - 2 - 8) / 2));
            dibujarTexto(ctx, nombreEnt(j.pj), 22, ty, NEGRO);
          } else dibujarTexto(ctx, t('sala.eligiendo'), 22, ty, CLARO);
          let xf = 152;
          const py = y + Math.floor((hf - 2 - 9) / 2);
          if (j.anfitrion) xf -= pastilla(ctx, t('sala.anfitrion'), xf, py, NEGRO, PAPEL) + 2;
          if (j.id === con.id) pastilla(ctx, t('sala.tu'), xf, py, j.pj ? colorEnt(j.pj) : OSCURO, PAPEL);
        }

        // Pick your trainer: 2×2.
        let y = 20 + 4 * hf + 3;
        dibujarMini(ctx, t('sala.elige'), 80 - Math.floor(anchoMini(t('sala.elige')) / 2), y, OSCURO);
        y += 9;
        const mio = miPj();
        const ch = 30 + Math.min(6, Math.floor(extra / 12));
        ENTRENADORES.forEach((id, i) => {
          const x = 3 + (i % 2) * 78;
          const yy = y + Math.floor(i / 2) * (ch + 3);
          const dueno = con.jugadores.find((j) => j.pj === id);
          const mia = mio === id;
          const ajena = !!dueno && !mia;
          const col = colorEnt(id);
          marco(ctx, x, yy, 76, ch);
          rect(ctx, col, x + 3, yy + 4, 1, ch - 8);
          ctx.drawImage(icono(id), 0, 0, 8, 8, x + 5, yy + Math.floor((ch - 16) / 2), 16, 16);
          dibujarTexto(ctx, nombreEnt(id), x + 23, yy + Math.floor(ch / 2) - 8, NEGRO);
          const estado = mia ? t('sala.tuyo') : ajena ? t('sala.ocupado') : t('sala.libre');
          dibujarMini(ctx, estado, x + 23, yy + Math.floor(ch / 2) + 3, mia ? col : OSCURO);
          if (ajena) velo(ctx, x + 1, yy + 1, 74, ch - 2, PAPEL, 0.6);
          if (mia) {
            rect(ctx, col, x - 2, yy - 2, 80, 2);
            rect(ctx, col, x - 2, yy + ch, 80, 2);
            rect(ctx, col, x - 2, yy, 2, ch);
            rect(ctx, col, x + 76, yy, 2, ch);
          }
          const k = ctl.length;
          ctl.push({ x, y: yy, w: 76, h: ch, fn: () => ((sel = k), elegir(id)) });
        });
        y += 2 * (ch + 3);

        // Host: fill with machines?
        if (con.anfitrion) {
          marco(ctx, 4, y, 152, 22);
          dibujarMini(ctx, t('sala.rellenar'), 12, y + 8, NEGRO);
          const v = t(relleno ? 'sala.si' : 'sala.no');
          dibujarTexto(ctx, v, 148 - v.length * 8, y + 7, relleno ? colorEnt('chuchi') : OSCURO);
          const k = ctl.length;
          ctl.push({ x: 4, y, w: 152, h: 22, fn: () => ((sel = k), alternar()) });
          y += 25;
        }

        // Hint and buttons.
        const yb = H - 28;
        const pista = con.anfitrion ? t(puedeEmpezar() ? 'sala.pista.listo' : mio ? 'sala.pista.faltan' : 'sala.pista.elige') : mio ? t('sala.esperando') : t('sala.pista.elige');
        const lp = envolver(pista, 148);
        lp.forEach((l, i) => centrado(ctx, l, Math.min(yb - 4 - lp.length * 10, y + 4) + i * 10, OSCURO));
        if (con.anfitrion) {
          boton(ctx, 10, yb, 66, 22, t('sala.empezar'), false, puedeEmpezar());
          boton(ctx, 84, yb, 66, 22, t('sala.salir'), false);
          const k = ctl.length;
          ctl.push({ x: 10, y: yb, w: 66, h: 22, fn: () => ((sel = k), empezar()) });
          ctl.push({ x: 84, y: yb, w: 66, h: 22, fn: salir });
        } else {
          boton(ctx, 47, yb, 66, 22, t('sala.salir'), false);
          ctl.push({ x: 47, y: yb, w: 66, h: 22, fn: salir });
        }
        for (const c of ctl) entrada.zona(c.x, c.y, c.w, c.h, () => !empezando && c.fn());
        if (teclado && ctl[sel]) {
          const c = ctl[sel];
          const col = parpadeo(ahora) ? NEGRO : OSCURO;
          rect(ctx, col, c.x - 1, c.y - 1, c.w + 2, 1);
          rect(ctx, col, c.x - 1, c.y + c.h, c.w + 2, 1);
          rect(ctx, col, c.x - 1, c.y, 1, c.h);
          rect(ctx, col, c.x + c.w, c.y, 1, c.h);
        }
      },
      paso: () => teclado,
      accion(a: Accion) {
        teclado = true;
        const n = ctl.length;
        if (!n || empezando) return true;
        sel = Math.min(sel, n - 1);
        if (a === 'atras') salir();
        else if (a === 'aceptar') ctl[sel].fn();
        else if (a === 'der') sel = (sel + 1) % n;
        else if (a === 'izq') sel = (sel + n - 1) % n;
        else if (a === 'abajo') sel = sel < 2 ? sel + 2 : sel === 2 || sel === 3 ? 4 % n : (sel + 1) % n;
        else if (a === 'arriba') sel = sel >= 2 && sel < 4 ? sel - 2 : sel === 4 % n ? 2 : (sel + n - 1) % n;
        if (a !== 'aceptar' && a !== 'atras') sonido.efecto('cursor');
        return true;
      },
    };
    p.poner(e);
  });
}

const parpadeo = (ahora: number): boolean => Math.floor(ahora / 400) % 2 === 0;
