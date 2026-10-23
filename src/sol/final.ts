// The end of «Alacant Sun»: what happens after the narrator has fallen (combate.ts ends with the Sombra falling apart
// into pages and the usual victory screens, and then the world calls `empezarFinal`; see `jefeYFinal` in sol.ts).
//
//   1. The stage at night, the pages of the Sombra drifting down, the four friends in a row under the spotlights
//      and the audience clapping; a few lines of talk.
//   2. The quote, big, letter by letter: «La vida es sueño, y los sueños, sueños son.» (Calderón de la Barca).
//   3. The brief credits over the dark stage, with `solFinal` playing from the first scene.
//   4. The screen switches off like an old set (the picture squashes to a line and a dot) and the console shrinks
//      away (`consola.encoger`): the screen «returns to its size» and Pablo's game is over.
//
// Like the fight it is a mode of the world's loop: the loop calls `update(dt)` and `dibujar(g)` while `activo`, and
// the promise `resultado` resolves when the console is gone. Texts: src/textos/sol.md (final.*, creditos.*).
// Everything drawn is cached pictures; per frame only drawImage, a few rects and the bounded particles.
import { texto } from '../juego/textos';
import type { Mandos } from './consola';
import { cono, easeIn, easeOut, haz, limitar, Particulas, persona } from './efectos';
import { textoGrande } from './efectosJefe';
import { dibujarFondo } from './fondo';
import { anchoTexto, escribir } from './fuente';
import { Dialogo } from './interfaz';
import { paginaGrande } from './jefeArte';
import { marco, type Amigo, type Quien } from './personajes';
import { ctx, lienzo, una } from './pixel';
import { PISTA_FINAL, type SonidoSol } from './sonido';

export interface OpcionesFinal {
  sonido: SonidoSol;
  mandos: Mandos;
  /** Shrinks the console away (consola.ts); resolves when it is gone. */
  encoger(seg: number): Promise<void>;
  /** Plays everything four times faster (tests). */
  rapido?: boolean;
}

type Escena = 'escenario' | 'cita' | 'creditos' | 'cierre';

/** The friends in a row, front view, and where their feet are on the stage. */
const FILA: Array<{ q: Amigo; x: number }> = [
  { q: 'pablo', x: 72 },
  { q: 'fran', x: 106 },
  { q: 'guille', x: 140 },
  { q: 'chuchi', x: 174 },
];
const PIES_Y = 104;

/** A friend facing us, twice the size of his walking sprite. */
const amigoGrande = (q: Amigo) =>
  una(`final.amigo.${q}`, () => {
    const src = marco(q, 'S', 0);
    const c = lienzo(src.width * 2, src.height * 2);
    const x = ctx(c);
    x.imageSmoothingEnabled = false;
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  });

const CITA = 'final.cita';
const LINEAS: Array<[Quien | null, string]> = [
  [null, 'final.1'],
  ['pablo', 'final.2'],
  ['fran', 'final.3'],
  ['guille', 'final.4'],
  ['chuchi', 'final.5'],
  ['pablo', 'final.6'],
];
/** The credits: a role (small, gold) over a name, one pair per number. */
const PARES = [1, 3, 5, 7, 9];
const VELOCIDAD_CREDITOS = 26;

export class Final {
  readonly resultado: Promise<void>;
  activo = true;

  private readonly sonido: SonidoSol;
  private readonly mandos: Mandos;
  private readonly VEL: number;
  private readonly dialogo: Dialogo;
  private readonly parts = new Particulas();
  private readonly encoger: (seg: number) => Promise<void>;

  private t = 0;
  private escena: Escena = 'escenario';
  private tEscena = 0;
  /** Black over everything (1 = black). */
  private fundido = 1;
  /** How many letters of the quote are shown. */
  private letrasCita = 0;
  private autorVisible = 0;
  /** Credits scroll position (pixels). */
  private scroll = 0;
  private luzFinal = 0;
  /** The switch-off: 0 = on, 1 = the dot is gone. */
  private crt = 0;
  private snap: HTMLCanvasElement | null = null;
  private pedirSnap = false;
  private timers: Array<{ resta: number; res: () => void }> = [];
  private anims: Array<{ t: number; dur: number; tick: (k: number) => void; res: () => void }> = [];
  private pagAcum = 0;
  /** Pages per second that fall at this moment. */
  private lluviaPaginas = 7;

  constructor(o: OpcionesFinal) {
    this.sonido = o.sonido;
    this.mandos = o.mandos;
    this.VEL = o.rapido ? 4 : 1;
    this.encoger = o.encoger;
    this.dialogo = new Dialogo(o.sonido, (q) => texto(`nombre.${q}`));
    this.resultado = this.correr();
  }

  // ------------------------------------------------------------ time

  private espera(s: number) {
    return new Promise<void>((res) => this.timers.push({ resta: s, res }));
  }
  private anim(dur: number, tick: (k: number) => void) {
    return new Promise<void>((res) => this.anims.push({ t: 0, dur, tick, res }));
  }
  private fundirA(a: number, dur: number) {
    const desde = this.fundido;
    return this.anim(dur, (k) => {
      this.fundido = desde + (a - desde) * k;
    });
  }
  private decir(quien: Quien | null, clave: string) {
    return this.dialogo.decir({ quien, texto: texto(clave) });
  }

  update(dtReal: number) {
    const dt = Math.min(0.05, dtReal) * this.VEL;
    this.t += dt;
    this.tEscena += dt;
    if (this.dialogo.activo) this.dialogo.update(dt, this.mandos);
    for (let i = this.timers.length - 1; i >= 0; i--) {
      this.timers[i].resta -= dt;
      if (this.timers[i].resta <= 0) this.timers.splice(i, 1)[0].res();
    }
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.t += dt;
      a.tick(limitar(a.t / a.dur, 0, 1));
      if (a.t >= a.dur) this.anims.splice(i, 1)[0].res();
    }
    this.parts.update(dt);
    // the credits scroll on their own; A makes them faster
    if (this.escena === 'creditos' && this.fundido < 0.5) this.scroll += VELOCIDAD_CREDITOS * dt * (this.mandos.a ? 4 : 1);
    // the pages of the Sombra, still falling (fewer as the end comes)
    if (this.escena !== 'cierre' && this.lluviaPaginas > 0) {
      this.pagAcum += dt * this.lluviaPaginas;
      while (this.pagAcum >= 1) {
        this.pagAcum--;
        this.parts.nueva({
          x: Math.random() * 240,
          y: -8,
          vx: (Math.random() - 0.5) * 16,
          vy: 18 + Math.random() * 16,
          dura: 6,
          img: paginaGrande(Math.floor(Math.random() * 3)),
          parpadea: false,
        });
      }
    }
  }

  // ------------------------------------------------------------ the script

  private async correr() {
    this.sonido.parar(0.1);
    this.sonido.musica(PISTA_FINAL);
    await this.fundirA(0, 1.4);
    await this.espera(1.4);
    for (const [quien, clave] of LINEAS) {
      await this.decir(quien, clave);
      this.mandos.soltar();
    }
    await this.espera(0.5);
    // the quote
    await this.fundirA(1, 0.7);
    this.escena = 'cita';
    this.tEscena = 0;
    this.lluviaPaginas = 3;
    await this.fundirA(0, 0.7);
    const cita = texto(CITA);
    const total = [...cita].length;
    await this.anim(Math.max(1.2, total * 0.07), (k) => {
      this.letrasCita = Math.floor(k * total);
    });
    this.letrasCita = total;
    await this.anim(0.8, (k) => {
      this.autorVisible = k;
    });
    await this.espera(3.6);
    await this.fundirA(1, 0.9);
    // the credits
    this.escena = 'creditos';
    this.tEscena = 0;
    this.scroll = 0;
    this.lluviaPaginas = 2;
    await this.fundirA(0, 0.7);
    const alto = 40 + PARES.length * 32 + 56;
    while (this.scroll < alto + 120) await this.espera(0.1);
    // the last picture: the stage lit again, the friends in their spotlights, and then it goes out
    this.escena = 'cierre';
    this.tEscena = 0;
    this.lluviaPaginas = 0;
    await this.anim(1.2, (k) => {
      this.luzFinal = k;
    });
    await this.espera(2.2);
    this.pedirSnap = true;
    await this.anim(0.1, () => {});
    await this.anim(1.1, (k) => {
      this.crt = k;
    });
    await this.encoger(1.5);
    this.activo = false;
  }

  // ------------------------------------------------------------ drawing

  dibujar(g: CanvasRenderingContext2D) {
    if (this.crt > 0 && this.snap) {
      this.dibujarApagado(g);
      return;
    }
    if (this.escena === 'creditos') this.dibujarCreditos(g);
    else if (this.escena === 'cita') this.dibujarCita(g);
    else this.dibujarEscenario(g, this.escena === 'cierre' ? this.luzFinal : 1);
    if (this.pedirSnap) {
      this.pedirSnap = false;
      this.snap = lienzo(240, 160);
      ctx(this.snap).drawImage(g.canvas, 0, 0);
    }
    if (this.fundido > 0.001) {
      g.fillStyle = `rgba(0,0,0,${this.fundido})`;
      g.fillRect(0, 0, 240, 160);
    }
  }

  /** The stage with the friends in their spotlights, the pages falling and the audience clapping. */
  private dibujarEscenario(g: CanvasRenderingContext2D, luz: number, oscuro = 0) {
    dibujarFondo(g, 'escenario', 0, this.t);
    // the house lights are low
    g.fillStyle = `rgba(6,4,24,${0.34 + oscuro})`;
    g.fillRect(0, 0, 240, 160);
    // two beams from the sides and a cone over each friend
    g.globalAlpha = 0.7 * luz;
    g.drawImage(haz(), 18, 0);
    g.drawImage(haz(), 172, 0);
    g.globalAlpha = (0.9 + Math.sin(this.t * 2) * 0.08) * luz;
    for (const f of FILA) g.drawImage(cono(), f.x - 22, PIES_Y - 100 + 14);
    g.globalAlpha = 1;
    FILA.forEach((f, i) => {
      const img = amigoGrande(f.q);
      // the pool of light, their shadow, and a little bounce of joy
      g.fillStyle = `rgba(255,236,170,${0.18 * luz})`;
      g.fillRect(f.x - 20, PIES_Y - 2, 40, 5);
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(f.x - 11, PIES_Y - 1, 22, 3);
      const salto = this.escena === 'cierre' ? Math.round(Math.abs(Math.sin(this.t * 3.2 + i * 0.9)) * 3) : 0;
      g.drawImage(img, f.x - img.width / 2, PIES_Y - img.height + 1 - salto);
    });
    this.parts.dibujar(g);
    // the audience, clapping in the dark at the bottom
    for (let i = 0; i < 13; i++) {
      const p = persona(i * 5, Math.floor(this.t * 5 + i) % 2, 1.5, 0.4);
      g.drawImage(p, i * 19 - 4, 158 - p.height + 4 + (i % 2) * 2);
    }
    this.dialogo.dibujar(g);
  }

  /** The quote, big, letter by letter, over the dark stage. */
  private dibujarCita(g: CanvasRenderingContext2D) {
    this.dibujarEscenario(g, 0.4, 0.46);
    const cita = texto(CITA);
    // a strip of paper behind the letters
    g.fillStyle = 'rgba(30,6,20,0.82)';
    g.fillRect(0, 34, 240, 76);
    g.fillStyle = '#ffe27a';
    g.fillRect(0, 34, 240, 1);
    g.fillRect(0, 109, 240, 1);
    textoGrande(g, cita, this.letrasCita, 120, 66, '#fff0a0', '#5a3a06', 2);
    if (this.autorVisible > 0) {
      const a = texto('final.autor');
      g.globalAlpha = easeOut(this.autorVisible);
      escribir(g, a, Math.round(120 - anchoTexto(a) / 2), 96, '#ffffff', '#0a1450');
      g.globalAlpha = 1;
    }
  }

  private dibujarCreditos(g: CanvasRenderingContext2D) {
    this.dibujarEscenario(g, 0.25, 0.5);
    g.fillStyle = 'rgba(4,2,16,0.55)';
    g.fillRect(0, 0, 240, 160);
    const y0 = 166 - this.scroll;
    const titulo = texto('creditos.titulo');
    textoGrande(g, titulo, [...titulo].length, 120, Math.round(y0 + 10), '#ffe27a', '#5a3a06', 2);
    PARES.forEach((n, i) => {
      const y = y0 + 40 + i * 32;
      const rol = texto(`creditos.${n}`);
      const nombre = texto(`creditos.${n + 1}`);
      // a line fades in at the bottom and out at the top
      const a = limitar(Math.min((158 - y) / 18, (y - 4) / 18), 0, 1);
      if (a <= 0) return;
      g.globalAlpha = a;
      escribir(g, rol, Math.round(120 - anchoTexto(rol) / 2), Math.round(y), '#ffe27a', '#0a1450');
      escribir(g, nombre, Math.round(120 - anchoTexto(nombre) / 2), Math.round(y + 12), '#ffffff', '#0a1450');
      g.globalAlpha = 1;
    });
    const fin = texto('creditos.fin');
    const yf = y0 + 40 + PARES.length * 32 + 8;
    g.globalAlpha = limitar((158 - yf) / 18, 0, 1);
    escribir(g, fin, Math.round(120 - anchoTexto(fin) / 2), Math.round(yf), '#fff0a0', '#5a3a06');
    g.globalAlpha = 1;
  }

  /** The old set switching off: the picture squashes to a bright line, and the line shrinks to a dot. */
  private dibujarApagado(g: CanvasRenderingContext2D) {
    const k = this.crt;
    const k1 = limitar(k / 0.6, 0, 1);
    const k2 = limitar((k - 0.6) / 0.4, 0, 1);
    g.fillStyle = '#000';
    g.fillRect(0, 0, 240, 160);
    const h = Math.max(2, Math.round(160 * (1 - easeIn(k1))));
    const w = Math.round(240 * (1 - easeIn(k2)));
    if (w < 3) return;
    const x = Math.round(120 - w / 2);
    const y = Math.round(80 - h / 2);
    g.drawImage(this.snap!, 0, 0, 240, 160, x, y, w, h);
    // it glows white as it collapses
    g.fillStyle = `rgba(255,255,255,${0.15 + 0.8 * k1})`;
    g.fillRect(x, y, w, h);
  }
}

/** Starts the ending. See the header for how the world's loop drives it. */
export function empezarFinal(o: OpcionesFinal): Final {
  return new Final(o);
}
