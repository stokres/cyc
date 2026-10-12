// The game itself: one stage of the Pang, from «¡LISTOS!» to cleared or out of lives.
// A logical canvas (W × H) is drawn without smoothing and copied to the screen at the
// biggest whole multiple that fits. The simulation runs in fixed steps of 1/120 s; drawing
// is capped at 60 fps. The rules live in the modules beside this one (docs/PANG.md).
import type { Sound } from '../core/audio';
import { texto } from '../juego/textos';
import { esVertical } from '../ui/orientacion';
import { fondo } from './arte/fondos';
import { bloque, escalera, escudo, jugador, JUGADOR } from './arte/sprites';
import { actualizarArmas, dibujarArmas, disparar } from './armas';
import { crearBurbuja, sumar, velocidadBurbujas } from './base';
import { Bot } from './bot';
import { crearEntrada, mandosNuevos, type Entrada, type Mandos } from './entrada';
import { dibujarAbajo, dibujarArriba, actualizarEspecial, proximaAceituna, usarPoder } from './especiales';
import { circuloRect, moverCuerpo } from './fisica';
import { centrado, Marcador, ORO, pintarTexto, rotulo } from './hud';
import { actualizarJefe, crearJefe, marcoJefe } from './jefes';
import { BARRA_LLENA, CAJA, GRAVEDAD, PASO, type Mundo } from './mundo';
import { actualizarObjetos, objetoVisible } from './objetos';
import { herir, recoger } from './reglas';
import { Efectos } from './sonido';
import { AREA, ESTILO, H, W, type Fase, type PjId, type ResultadoFase } from './tipos';

export interface OpcionesFase {
  /** Where the game puts its canvas and its touch buttons (removed when it ends). */
  padre: HTMLElement;
  fase: Fase;
  pj: PjId;
  vidas: number;
  puntos: number;
  sonido: Sound;
  /** Opens the pause menu (pantallas.ts); resolves with what the player chose. */
  pausa: () => Promise<'seguir' | 'salir'>;
  /** Title-screen attract mode: a bot plays, no input, no sound, never ends on its own. */
  demo?: boolean;
  /** Aborting it ends the stage at once (cleans up, resolves 'salir'): the title screen stops its demo. */
  senal?: AbortSignal;
}

/**
 * Plays one stage. Losing a life restarts the stage (as in Pang) while lives remain.
 * Resolves with the result, or 'salir' if the player quit from the pause menu.
 */
export function jugarFase(o: OpcionesFase): Promise<ResultadoFase | 'salir'> {
  return new Promise((resolver) => void new Partida(o, resolver).arrancar());
}

type Estado = 'titulo' | 'listo' | 'ya' | 'jugando' | 'herido' | 'victoria' | 'bonus';

/** Seconds each part of the flow lasts. */
const DURA = { titulo: 1.6, listo: 1.0, ya: 0.6, herido: 1.2, victoria: 1.5, bonus: 1.0 } as const;
/** Time bonus: points per second left, and seconds between counting ticks. */
const PUNTOS_SEGUNDO = 20;
const TICK_BONUS = 0.016;
const POP_FRAME = 0.06;
const MAX_PASOS = 12;
const VIDAS_DEMO = 3;

class Partida {
  private readonly fase: Fase;
  private readonly raiz = document.createElement('div');
  private readonly pantalla = document.createElement('canvas');
  private dctx!: CanvasRenderingContext2D;
  private readonly logico = document.createElement('canvas');
  private readonly g: CanvasRenderingContext2D;
  private entrada: Entrada | null = null;
  private readonly mandos: Mandos;
  private readonly bot: Bot | null;
  private readonly m: Mundo;
  private readonly marcador: Marcador;
  private readonly cuerpo: ReturnType<typeof jugador>;
  private readonly espejos = new Map<HTMLCanvasElement, HTMLCanvasElement>();

  private estado: Estado = 'titulo';
  private tEstado = 0;
  private causa: 'bicho' | 'tiempo' = 'bicho';
  private bonusRestante = 0;
  private bonusAcum = 0;
  private bonusGanado = 0;
  private bonusTicks = 0;
  private espLista = false;
  private ultimoPitido = 0;

  private raf = 0;
  private ultimo = 0;
  private ultimoDibujo = 0;
  private acum = 0;
  private fotogramas = 0;
  private enPausa = false;
  private fin = false;
  private readonly alAjustar = () => this.ajustar();
  private readonly alAbortar = () => this.terminar('salir');

  constructor(
    private readonly o: OpcionesFase,
    private readonly resolver: (r: ResultadoFase | 'salir') => void,
  ) {
    this.fase = o.fase;
    this.cuerpo = jugador(o.pj);
    this.raiz.style.cssText = 'position:fixed;inset:0;z-index:0;background:#000;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;display:flex;align-items:center;justify-content:center';
    this.pantalla.style.cssText = 'display:block;image-rendering:pixelated;touch-action:none';
    this.raiz.appendChild(this.pantalla);
    o.padre.appendChild(this.raiz);
    this.logico.width = W;
    this.logico.height = H;
    this.g = this.logico.getContext('2d', { alpha: false })!;
    this.g.imageSmoothingEnabled = false;
    this.ajustar();
    window.addEventListener('resize', this.alAjustar);

    this.m = this.crearMundo();
    this.marcador = new Marcador(this.m);
    if (o.demo) {
      this.mandos = mandosNuevos();
      this.bot = new Bot();
    } else {
      this.entrada = crearEntrada(this.raiz, { escaleras: this.fase.escaleras.length > 0 });
      this.mandos = this.entrada.mandos;
      this.bot = null;
    }
    this.cargarFase();
    (window as unknown as { __pang: () => unknown }).__pang = () => ({ fotogramas: this.fotogramas, estado: this.estado, mundo: this.m, mandos: this.mandos });
  }

  async arrancar() {
    const { senal } = this.o;
    if (senal?.aborted) return this.terminar('salir');
    senal?.addEventListener('abort', this.alAbortar, { once: true });
    // The pixel font must be there before the first text is painted; do not hang if it never comes.
    await Promise.race([document.fonts.load('8px "Press Start 2P"').catch(() => undefined), new Promise((r) => setTimeout(r, 1500))]);
    if (this.fin) return;
    if (!this.o.demo) this.o.sonido.musica(this.fase.musica);
    this.ultimo = performance.now();
    this.raf = requestAnimationFrame(this.cuadro);
  }

  // --- screen ----------------------------------------------------------------------------

  /** Whole-number zoom: the biggest that fits, in device pixels; the CSS size undoes the pixel ratio. */
  private ajustar() {
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.floor(Math.min((window.innerWidth * dpr) / W, (window.innerHeight * dpr) / H)));
    this.pantalla.width = W * k;
    this.pantalla.height = H * k;
    this.pantalla.style.width = `${(W * k) / dpr}px`;
    this.pantalla.style.height = `${(H * k) / dpr}px`;
    this.dctx = this.pantalla.getContext('2d', { alpha: false })!;
    this.dctx.imageSmoothingEnabled = false;
  }

  // --- the world -------------------------------------------------------------------------

  private crearMundo(): Mundo {
    const { fase, pj, puntos, vidas, sonido, demo } = this.o;
    return {
      fase,
      pj,
      estilo: ESTILO[pj],
      sfx: new Efectos(sonido, !demo),
      t: 0,
      tiempo: fase.tiempo,
      puntos,
      vidas,
      barra: 0,
      siguienteVida: (Math.floor(puntos / 20000) + 1) * 20000,
      canaDada: false,
      sigId: 1,
      burbujas: [],
      bloques: [],
      cables: [],
      balas: [],
      objetos: [],
      efectos: [],
      popups: [],
      jefe: null,
      finJefe: -1,
      jugador: { x: fase.inicio, y: AREA.suelo, vy: 0, dir: 1, escalera: -1, escalado: 0, disparoT: 0, inv: 0, escudo: 0, animT: 0, anda: false },
      congelado: 0,
      kinki: 0,
      enfriamiento: 0,
      aviso: null,
      hijos: [],
      viento: 0,
      aceituna: { prox: proximaAceituna(), activa: false, x: 0, dir: 1, soltarX: 0, soltada: false, t: 0 },
      oscuro: { t: 0 },
      cierzo: { t: 0, dir: 1, soplando: false, rafaga: 0 },
      hudSucio: true,
    };
  }

  /** The stage as it starts (also after losing a life). Score, lives and the special bar stay. */
  private cargarFase() {
    const m = this.m;
    const f = this.fase;
    const v = velocidadBurbujas(m);
    m.t = 0;
    m.tiempo = f.tiempo;
    m.burbujas = f.burbujas.map((b) => {
      const posavasos = b.variante === 'posavasos';
      return crearBurbuja(m, b.x, b.y, b.talla, b.variante ?? 'cerveza', b.color ?? 'roja', b.dir * v, posavasos ? v : 0);
    });
    m.bloques = f.bloques.map((b) => ({ ...b }));
    m.cables = [];
    m.balas = [];
    m.objetos = [];
    m.efectos = [];
    m.popups = [];
    m.jefe = f.jefe ? crearJefe(f.jefe) : null;
    m.finJefe = -1;
    Object.assign(m.jugador, { x: f.inicio, y: AREA.suelo, vy: 0, dir: 1, escalera: -1, escalado: 0, disparoT: 0, inv: 0, escudo: 0, animT: 0, anda: false });
    m.congelado = 0;
    m.kinki = 0;
    m.enfriamiento = 0;
    m.aviso = null;
    m.viento = 0;
    m.aceituna = { prox: proximaAceituna(), activa: false, x: 0, dir: 1, soltarX: 0, soltada: false, t: 0 };
    m.oscuro = { t: 0 };
    m.cierzo = { t: 0, dir: Math.random() < 0.5 ? -1 : 1, soplando: false, rafaga: 0 };
    m.hudSucio = true;
  }

  // --- loop ------------------------------------------------------------------------------

  private cuadro = (t: number) => {
    if (this.fin || this.enPausa) return;
    this.raf = requestAnimationFrame(this.cuadro);
    let dt = (t - this.ultimo) / 1000;
    this.ultimo = t;
    // Nothing runs behind the page being hidden or the phone upright.
    if (document.hidden || esVertical()) return;
    if (this.mandos.pausa) {
      this.mandos.pausa = false;
      if (!this.o.demo) void this.pausar();
      return;
    }
    if (dt > 0.1) dt = 0.1;
    this.acum += dt;
    let pasos = 0;
    while (this.acum >= PASO && pasos < MAX_PASOS) {
      this.simular(PASO);
      this.acum -= PASO;
      pasos++;
      if (this.fin) return;
    }
    if (pasos >= MAX_PASOS) this.acum = 0;
    // 120 Hz screens: draw every other frame.
    if (t - this.ultimoDibujo >= 15) {
      this.ultimoDibujo = t;
      this.dibujar();
      this.fotogramas++;
    }
  };

  private async pausar() {
    this.enPausa = true;
    cancelAnimationFrame(this.raf);
    this.entrada?.soltarTodo();
    this.entrada?.mostrar(false);
    this.raiz.style.zIndex = '-1';
    const r = await this.o.pausa();
    if (this.fin) return;
    if (r === 'salir') return this.terminar('salir');
    this.raiz.style.zIndex = '0';
    this.entrada?.mostrar(true);
    this.enPausa = false;
    this.ultimo = performance.now();
    this.raf = requestAnimationFrame(this.cuadro);
  }

  private terminar(r: ResultadoFase | 'salir') {
    if (this.fin) return;
    this.fin = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.alAjustar);
    this.o.senal?.removeEventListener('abort', this.alAbortar);
    this.entrada?.destruir();
    this.raiz.remove();
    if (!this.o.demo) this.o.sonido.pararMusica();
    this.resolver(r);
  }

  // --- flow ------------------------------------------------------------------------------

  private ir(e: Estado) {
    this.estado = e;
    this.tEstado = 0;
    if (e === 'listo') this.m.sfx.listo();
    else if (e === 'ya') this.m.sfx.ya();
  }

  private simular(dt: number) {
    this.tEstado += dt;
    const m = this.m;
    switch (this.estado) {
      case 'titulo':
        if (this.tEstado >= DURA.titulo) this.ir('listo');
        break;
      case 'listo':
        if (this.tEstado >= DURA.listo) this.ir('ya');
        break;
      case 'ya':
        if (this.tEstado >= DURA.ya) this.ir('jugando');
        break;
      case 'jugando':
        this.jugando(dt);
        break;
      case 'herido':
        this.animaciones(dt);
        m.jugador.animT += dt;
        if (this.tEstado >= DURA.herido) this.despuesDeHerido();
        break;
      case 'victoria':
        this.animaciones(dt);
        m.jugador.animT += dt;
        if (this.tEstado >= DURA.victoria) {
          this.bonusRestante = Math.max(0, Math.floor(m.tiempo));
          this.bonusAcum = 0;
          this.bonusGanado = 0;
          this.bonusTicks = 0;
          this.ir('bonus');
        }
        break;
      case 'bonus':
        this.contarBonus(dt);
        break;
    }
  }

  /** The player has been touched (or time ran out): a life is lost. */
  private herido(causa: 'bicho' | 'tiempo') {
    const m = this.m;
    this.causa = causa;
    m.vidas--;
    m.hudSucio = true;
    m.sfx.herido();
    m.jugador.animT = 0;
    m.jugador.escalera = -1;
    this.ir('herido');
  }

  private despuesDeHerido() {
    const m = this.m;
    if (m.vidas <= 0) {
      if (!this.o.demo) return this.terminar({ superada: false, puntos: Math.floor(m.puntos), vidas: 0 });
      m.vidas = VIDAS_DEMO;
    }
    this.cargarFase();
    this.ir('listo');
  }

  private superar() {
    const m = this.m;
    m.sfx.fanfarria();
    if (!this.o.demo) this.o.sonido.pararMusica();
    m.jugador.animT = 0;
    m.jugador.escalera = -1;
    m.jugador.anda = false;
    m.aviso = null;
    this.ir('victoria');
  }

  /** Counts the seconds left into points, 20 each, quickly. */
  private contarBonus(dt: number) {
    const m = this.m;
    m.jugador.animT += dt;
    this.animaciones(dt);
    this.bonusAcum += dt;
    while (this.bonusAcum >= TICK_BONUS && this.bonusRestante > 0) {
      this.bonusAcum -= TICK_BONUS;
      this.bonusRestante--;
      this.bonusGanado += PUNTOS_SEGUNDO;
      m.tiempo = this.bonusRestante;
      sumar(m, PUNTOS_SEGUNDO);
      if (++this.bonusTicks % 3 === 0) m.sfx.cuenta();
    }
    if (this.bonusRestante > 0) this.tEstado = 0;
    else if (this.tEstado >= DURA.bonus) {
      if (!this.o.demo) return this.terminar({ superada: true, puntos: Math.floor(m.puntos), vidas: m.vidas });
      this.cargarFase();
      this.ir('listo');
    }
  }

  // --- one step of play ------------------------------------------------------------------

  private jugando(dt: number) {
    const m = this.m;
    const j = m.jugador;
    const mand = this.mandos;
    m.t += dt;
    const antes = Math.ceil(m.tiempo);
    m.tiempo -= dt;
    if (m.tiempo <= 15 && m.tiempo > 0 && Math.ceil(m.tiempo) !== antes && antes !== this.ultimoPitido) {
      this.ultimoPitido = antes;
      m.sfx.pitido();
    }
    if (m.tiempo <= 0) {
      m.tiempo = 0;
      return this.herido('tiempo');
    }
    this.bot?.pensar(m, mand, dt);

    if (mand.especial) {
      mand.especial = false;
      usarPoder(m);
    }
    const auto = m.estilo.arma === 'rafaga' || m.kinki > 0;
    if (mand.disparo || (auto && mand.fuego)) disparar(m);
    mand.disparo = false;

    this.moverJugador(dt);
    if (j.inv > 0) j.inv -= dt;
    if (j.disparoT > 0) j.disparoT -= dt;
    if (m.kinki > 0) m.kinki -= dt;

    if (m.congelado > 0) {
      m.congelado -= dt;
      if (m.jefe && m.jefe.golpeT > 0) m.jefe.golpeT -= dt;
    } else {
      const viento = m.viento * 28;
      for (let i = 0; i < m.burbujas.length; i++) moverCuerpo(m.burbujas[i], dt, m.bloques, viento);
      actualizarJefe(m, dt);
    }
    actualizarArmas(m, dt);
    actualizarObjetos(m, dt);
    this.recogerObjetos();
    actualizarEspecial(m, dt);
    this.animaciones(dt);

    if (m.congelado <= 0) this.chocar();
    if (this.estado !== 'jugando') return;

    const lista = m.barra >= BARRA_LLENA;
    if (this.entrada && lista !== this.espLista) {
      this.espLista = lista;
      this.entrada.especialLista(lista);
    }
    if (m.finJefe >= 0) m.finJefe += dt;
    if (!m.jefe && m.burbujas.length === 0 && (m.finJefe < 0 || m.finJefe >= 0.9)) this.superar();
  }

  private moverJugador(dt: number) {
    const m = this.m;
    const j = m.jugador;
    const mand = this.mandos;
    const dir = (mand.der ? 1 : 0) - (mand.izq ? 1 : 0);
    const vert = (mand.abajo ? 1 : 0) - (mand.arriba ? 1 : 0);
    const escaleras = this.fase.escaleras;
    j.animT += dt;
    j.anda = false;
    if (j.escalera < 0 && vert !== 0) {
      for (let i = 0; i < escaleras.length; i++) {
        const e = escaleras[i];
        if (Math.abs(j.x - (e.x + 8)) > 8) continue;
        if ((vert < 0 && j.y > e.arriba + 0.5 && j.y <= e.abajo + 0.5) || (vert > 0 && j.y < e.abajo - 0.5 && j.y >= e.arriba - 0.5)) {
          j.escalera = i;
          j.vy = 0;
          break;
        }
      }
    }
    if (j.escalera >= 0) {
      const e = escaleras[j.escalera];
      const paso = 120 * dt;
      j.x += Math.max(-paso, Math.min(paso, e.x + 8 - j.x));
      j.y += vert * 50 * dt;
      j.escalado += Math.abs(vert) * 50 * dt;
      if (j.y <= e.arriba) {
        j.y = e.arriba;
        j.escalera = -1;
      } else if (j.y >= e.abajo) {
        j.y = e.abajo;
        j.escalera = -1;
      }
      return;
    }
    if (dir !== 0) {
      j.dir = dir > 0 ? 1 : -1;
      j.x += dir * m.estilo.paso * dt;
      j.anda = true;
    }
    j.x += m.viento * 22 * dt;
    j.x = Math.max(AREA.izq + CAJA.semi, Math.min(AREA.der - CAJA.semi, j.x));
    // Standing on the floor or a platform; walking off an edge falls.
    const suelo = this.apoyo(j.x, j.y);
    if (j.y < suelo - 0.01) {
      j.vy += GRAVEDAD * dt;
      j.y = Math.min(suelo, j.y + j.vy * dt);
      if (j.y >= suelo) j.vy = 0;
    } else {
      j.y = suelo;
      j.vy = 0;
    }
  }

  /** The highest surface at or below the feet at `x`: the floor or a block's top. */
  private apoyo(x: number, y: number): number {
    let s: number = AREA.suelo;
    for (const b of this.m.bloques) if (x >= b.x - 2 && x <= b.x + b.w + 2 && b.y >= y - 1 && b.y < s) s = b.y;
    return s;
  }

  private recogerObjetos() {
    const m = this.m;
    const j = m.jugador;
    for (let i = m.objetos.length - 1; i >= 0; i--) {
      const o = m.objetos[i];
      if (Math.abs(o.x - j.x) > CAJA.semi + 6 || o.y + 6 < j.y - CAJA.alto || o.y - 6 > j.y) continue;
      m.objetos[i] = m.objetos[m.objetos.length - 1];
      m.objetos.pop();
      recoger(m, o);
    }
  }

  /** Bubbles and the boss against the player. */
  private chocar() {
    const m = this.m;
    const j = m.jugador;
    if (j.inv > 0) return;
    const x0 = j.x - CAJA.semi;
    const y0 = j.y - CAJA.alto;
    let toca = false;
    for (let i = 0; i < m.burbujas.length && !toca; i++) {
      const b = m.burbujas[i];
      toca = circuloRect(b.x, b.y, b.r, x0, y0, CAJA.semi * 2, CAJA.alto);
    }
    if (!toca && m.jefe) toca = circuloRect(m.jefe.x, m.jefe.y, m.jefe.r, x0, y0, CAJA.semi * 2, CAJA.alto);
    if (toca && herir(m)) this.herido('bicho');
  }

  /** Pops, floating numbers and the banner age. */
  private animaciones(dt: number) {
    const m = this.m;
    for (let i = m.efectos.length - 1; i >= 0; i--) {
      const e = m.efectos[i];
      e.t += dt;
      if (e.t >= POP_FRAME * e.frames.length) {
        m.efectos[i] = m.efectos[m.efectos.length - 1];
        m.efectos.pop();
      }
    }
    for (let i = m.popups.length - 1; i >= 0; i--) {
      m.popups[i].t += dt;
      if (m.popups[i].t > 0.9) {
        m.popups[i] = m.popups[m.popups.length - 1];
        m.popups.pop();
      }
    }
    if (m.aviso) {
      m.aviso.t += dt;
      if (m.aviso.t > 1.5) m.aviso = null;
    }
  }

  // --- drawing ---------------------------------------------------------------------------

  private espejo(c: HTMLCanvasElement): HTMLCanvasElement {
    let e = this.espejos.get(c);
    if (!e) {
      e = document.createElement('canvas');
      e.width = c.width;
      e.height = c.height;
      const x = e.getContext('2d')!;
      x.translate(c.width, 0);
      x.scale(-1, 1);
      x.drawImage(c, 0, 0);
      this.espejos.set(c, e);
    }
    return e;
  }

  private dibujar() {
    const g = this.g;
    const m = this.m;
    g.drawImage(fondo(this.fase.fondo), 0, 0);
    for (const e of this.fase.escaleras) g.drawImage(escalera(e.abajo - e.arriba), e.x, e.arriba);
    for (const b of m.bloques) g.drawImage(bloque(b), b.x, b.y);
    dibujarAbajo(g, m, (c) => this.espejo(c));
    for (const o of m.objetos) if (objetoVisible(o.t)) g.drawImage(o.img, Math.round(o.x - 6), Math.round(o.y - 6));
    dibujarArmas(g, m);
    // Frozen things blink when the freeze is about to end.
    const visible = m.congelado <= 0 || m.congelado > 1.2 || Math.floor(m.congelado * 8) % 2 === 0;
    if (visible) {
      const j = m.jefe;
      if (j) g.drawImage(marcoJefe(j), Math.round(j.x - j.hoja.w / 2), Math.round(j.y - j.hoja.h / 2));
      for (const b of m.burbujas) g.drawImage(b.img, Math.round(b.x - b.r - 1), Math.round(b.y - b.r - 1));
    }
    this.dibujarJugador(g);
    for (const e of m.efectos) {
      if (e.t < 0) continue;
      const f = e.frames[Math.min(e.frames.length - 1, Math.floor(e.t / POP_FRAME))];
      g.drawImage(f, Math.round(e.x - f.width / 2), Math.round(e.y - f.height / 2));
    }
    for (const p of m.popups) g.drawImage(p.img, Math.round(p.x - p.img.width / 2), Math.round(p.y - 8 - p.t * 14));
    dibujarArriba(g, m);
    this.dibujarJefeBarra(g);
    this.dibujarRotulos(g);
    this.marcador.actualizar(this.estado === 'jugando');
    this.marcador.dibujar(g);
    this.dctx.drawImage(this.logico, 0, 0, this.pantalla.width, this.pantalla.height);
  }

  private dibujarJugador(g: CanvasRenderingContext2D) {
    const m = this.m;
    const j = m.jugador;
    if (j.inv > 0 && Math.floor(j.inv * 12) % 2 === 0) return;
    let anim: keyof typeof this.cuerpo;
    let i = 0;
    let gira = true;
    if (this.estado === 'herido') {
      anim = 'herido';
      i = Math.floor(j.animT / 0.15) % 2;
    } else if (this.estado === 'victoria' || this.estado === 'bonus') {
      anim = 'victoria';
      i = Math.floor(j.animT / 0.2) % 2;
      gira = false;
    } else if (j.escalera >= 0) {
      anim = 'escalar';
      i = Math.floor(j.escalado / 6) % 2;
      gira = false;
    } else if (j.disparoT > 0) {
      anim = 'disparar';
      gira = false;
    } else if (j.anda) {
      anim = 'andar';
      i = Math.floor(j.animT * 10) % 4;
    } else {
      anim = 'quieto';
      i = Math.floor(j.animT * 2) % 2;
    }
    const frames = this.cuerpo[anim];
    let img = frames[i % frames.length];
    if (gira && j.dir < 0) img = this.espejo(img);
    g.drawImage(img, Math.round(j.x - JUGADOR.w / 2), Math.round(j.y - JUGADOR.h));
    if (j.escudo) {
      const s = escudo();
      g.drawImage(s[Math.floor(m.t * 6) % s.length], Math.round(j.x - 16), Math.round(j.y - 36));
    }
  }

  private dibujarJefeBarra(g: CanvasRenderingContext2D) {
    const j = this.m.jefe;
    if (!j) return;
    centrado(g, rotulo(texto(`hud.jefe.${j.tipo}`), ORO), W / 2, 10);
    const ancho = 120;
    const x = W / 2 - ancho / 2;
    g.fillStyle = '#000';
    g.fillRect(x - 1, 21, ancho + 2, 7);
    g.fillStyle = '#5a1a1a';
    g.fillRect(x, 22, ancho, 5);
    g.fillStyle = j.golpeT > 0 ? '#ffffff' : '#e03a3a';
    g.fillRect(x, 22, Math.max(0, Math.round((ancho * j.hp) / j.hpMax)), 5);
  }

  /** Title card, «¡LISTOS!», banners and the time bonus. */
  private dibujarRotulos(g: CanvasRenderingContext2D) {
    const m = this.m;
    const cx = W / 2;
    switch (this.estado) {
      case 'titulo': {
        g.fillStyle = 'rgba(0,0,0,0.72)';
        g.fillRect(AREA.izq, 56, AREA.der - AREA.izq, 80);
        centrado(g, rotulo(texto('hud.fase', { n: this.fase.n }), ORO, 16), cx, 66);
        centrado(g, rotulo(texto(`fase.${this.fase.n}.nombre`), '#ffffff', 16), cx, 88);
        centrado(g, rotulo(texto(`fase.${this.fase.n}.lugar`), '#c8c0aa', 8), cx, 114);
        return;
      }
      case 'listo':
        centrado(g, rotulo(texto('hud.listo'), ORO, 16), cx, 84);
        return;
      case 'ya':
        centrado(g, rotulo(texto('hud.ya'), '#ffffff', 16), cx, 84);
        return;
      case 'herido':
        centrado(g, rotulo(texto(this.causa === 'tiempo' ? 'hud.sinTiempo' : 'hud.tocado'), '#ff6a5a', 16), cx, 70);
        return;
      case 'victoria':
        centrado(g, rotulo(texto('hud.superada'), ORO, 16), cx, 70);
        return;
      case 'bonus':
        centrado(g, rotulo(texto('hud.superada'), ORO, 16), cx, 60);
        centrado(g, rotulo(texto('hud.bonus'), '#ffffff', 8), cx, 90);
        pintarTexto(g, String(this.bonusGanado), cx, 104, ORO);
        return;
    }
    if (m.aviso) centrado(g, m.aviso.img, cx, 56);
  }
}
