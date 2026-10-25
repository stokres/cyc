// The point-and-click layer: scenes and who is in them, touch input, the
// scripting API chapters use, the character dock and saving.
import { Motor, H, type Calidad } from '../motor/motor';
import { setEscalaSprites } from '../motor/sprites';
import { Actor, Objeto, Perrita, Personaje } from '../motor/actores';
import type { Escena, Zona } from '../motor/escena';
import { Hud, h } from '../ui/hud';
import { Gestures, type PointerInfo } from '../core/input';
import { Sound } from '../core/audio';
import { dialogo, hayDialogo, restaurarUsos, texto, usos, type Linea, type Quien } from './textos';
import { NPCS, PROTAS, REPARTO, esNpc, type NpcId, type PjId } from './reparto';
import type { Estado } from './estado';
import { OBJETOS } from '../arte/objetos.mjs';
import { mostrarTutorial } from '../ui/tutorial';
import { Camara } from './camara';
import type { Ambiente } from '../core/audio';

export interface ZonaLogica {
  /** Shown on labels; defaults to `zona.<id>` in the texts. */
  nombre?(): string;
  activa?(): boolean;
  /** What a tap shows on something that cannot be used. Defaults to the dialogue `mirar.<id>`. */
  mirar?(): Promise<void>;
  /** Tap. Defaults to `usar.<id>`, or to `mirar` if there is no such block. */
  usar?(): Promise<void>;
  /** Tap with an item selected. Return false for the generic "that won't work". */
  usarObjeto?(item: string): Promise<boolean>;
  /** Walk there before acting (default true). */
  acercarse?: boolean;
}

export interface Capitulo {
  escenas: Record<string, () => Escena>;
  estadoInicial(): Estado;
  /** A save from an older version: whose story changed so much it has to start again (see reparar). */
  caducados?(e: Estado): PjId[];
  zonas(g: Aventura, escena: string): Record<string, ZonaLogica>;
  /** Tap on a character, Aceituna or someone who is not played (Vero), maybe with an item. */
  personaje(g: Aventura, quien: PjId | 'aceituna' | 'sombra' | NpcId, item: string | null): Promise<void>;
  /** Characters who are not played and stand in this scene (Vero behind the bar), and where. */
  npcs?(g: Aventura, escena: string): Array<{ id: NpcId; X: number; y: number; face: number }>;
  /** Pablo's shadow (the narrator in person): in which scene, if any, and whether it shows now. */
  sombra?(g: Aventura, escena: string): boolean;
  mirarObjeto(g: Aventura, item: string): Promise<void>;
  /** Two items put together in the bag. Return false for «those don't go together». */
  combinar?(g: Aventura, a: string, b: string): Promise<boolean>;
  objetivo(g: Aventura): string | null;
  pista(g: Aventura): string;
  /** One line per protagonist for the start screen: where their story begins. */
  situacion(quien: PjId): string;
  /** First time a protagonist is played: their story's opening. */
  empezar(g: Aventura, quien: PjId): Promise<void>;
  /** All four are on their way: the four of them arrive at the bar together. */
  final(g: Aventura): Promise<void>;
  /** A chapter that opens with a scene of its own instead of choosing who to play (chapter 2). */
  inicio?(g: Aventura): Promise<void>;
  alEntrar?(g: Aventura, escena: string): Promise<void>;
  /** First look at every tap; return true to swallow it (e.g. waking Fran up). */
  tocar?(g: Aventura): boolean;
  dibujar?(g: Aventura, ctx: CanvasRenderingContext2D, capa: string): void;
  /** Over the front static layer, repainted only with it (Motor.extraFijo). */
  dibujarFijo?(g: Aventura, ctx: CanvasRenderingContext2D): void;
  tick?(g: Aventura, dt: number): void;
  /** Scenes with a door from this one: baked ahead, so going through is instant. */
  vecinas?(escena: string): string[];
  /** The scene's music right now (asked every frame): one or more tracks, each with its volume and pan, or none. */
  musica?(g: Aventura): Ambiente | Ambiente[] | null;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const horaDe = (m: number) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
const MARGEN = 26; // extra tap margin around every zone (rule I4), never into the floor

export class Aventura {
  readonly motor: Motor;
  readonly hud: Hud;
  readonly sound = new Sound();
  /** The wild camera (src/juego/camara.ts): Dutch angles, zooms, whip pans and shakes over the baked scenery. */
  readonly plano: Camara;
  readonly velo: HTMLDivElement;
  escena = '';
  S!: Escena;
  pjs = new Map<PjId, Personaje>();
  perro: Perrita | null = null;
  /** Pablo's shadow, following him around the backstage (the narrator in person). */
  sombra: Personaje | null = null;
  /** Characters who are not played, in this scene (Capitulo.npcs). */
  npcs = new Map<NpcId, Personaje>();
  /** The shadow faces Pablo (they have been talking) instead of mirroring him, until he walks. */
  private sombraMira = false;
  props: Objeto[] = [];
  private zonasLogicas: Record<string, ZonaLogica> = {};
  private ocupado = false;
  /** The script running is a plain conversation (see `cambioLibre`). */
  private conversacion = false;
  /** A switch was asked for in the middle of a conversation: it plays out in a blink (`pedirCambio`). */
  saltando = false;
  private cambioPedido: PjId | null = null;
  /** Paused by the game itself (a menu, the prologue, a minigame). Set by the callers. */
  private pausaPropia = false;
  /** The «turn your phone» notice is up (main.ts): a pause of its own, so leaving it frees nothing else. */
  girando = false;
  get pausado() {
    return this.pausaPropia || this.girando;
  }
  set pausado(v: boolean) {
    this.pausaPropia = v;
    // A minigame is something the player has to play: a request to leave is dropped, not skipped over.
    if (v && this.saltando) this.cinematica();
  }
  /** Camera focus override (e.g. the sofa while Fran sleeps). */
  foco: number | null = null;
  /** Aceituna's behaviour in the flat. */
  perroModo: 'tumbada' | 'quieta' | 'sigue' = 'sigue';
  perroDestino: { X: number; y: number } | null = null;
  /** Tests skip waits and typewriter. */
  rapido = false;
  mostrarFps = false;
  onFin: (() => void) | null = null;
  onMenu: (() => void) | null = null;
  private frames: number[] = [];

  constructor(readonly root: HTMLElement, readonly cap: Capitulo, public estado: Estado) {
    reparar(cap, estado);
    this.motor = new Motor(root);
    this.plano = new Camara(this);
    // Characters become bitmaps at the size they are drawn on this screen (the nearest one, ~k 1.3).
    setEscalaSprites((Math.min(window.devicePixelRatio || 1, 3) * this.motor.cssH * this.motor.escala(1.3)) / H);
    restaurarUsos(estado.usos);
    this.hud = new Hud(root, {
      elegir: (id) => void this.elegir(id),
      ojo: () => this.ojo(),
      pista: () => void this.ejecutar(() => this.decir(null, this.cap.pista(this)), true),
      menu: () => this.onMenu?.(),
      seleccionar: () => this.sound.tap(),
      mirarObjeto: (id) => void this.ejecutar(() => this.cap.mirarObjeto(this, id), true),
      combinar: (a, b) =>
        void this.ejecutar(async () => {
          if (await this.cap.combinar?.(this, a, b)) return;
          this.sound.nope();
          await this.hablar('nocombina');
        }, true),
    });
    this.hud.ropas = estado.ropa;
    this.velo = h('div', { class: 'velo' }, h('span', {}, texto('cargando')));
    root.append(this.velo);
    const gest = new Gestures(root);
    gest.handlers = {
      tap: (p) => this.alTocar(p),
    };
    this.motor.cond = (expr) => (expr.startsWith('!') ? !this.flag(expr.slice(1)) : this.flag(expr));
    this.motor.extra = (ctx, capa) => this.cap.dibujar?.(this, ctx, capa);
    this.motor.extraFijo = (ctx) => this.cap.dibujarFijo?.(this, ctx);
  }

  // ------------------------------------------------------------ state helpers

  get activo(): Personaje {
    return this.pjs.get(this.estado.activo)!;
  }

  flag(k: string) {
    return !!this.estado.flags[k];
  }

  poner(k: string, v: boolean | number = true) {
    this.estado.flags[k] = v;
  }

  /** The clock of the story being played (each protagonist has their own). */
  get hora() {
    return horaDe(this.estado.minutos[this.estado.activo]);
  }

  avanzarReloj(min: number) {
    this.estado.minutos[this.estado.activo] += min;
    this.refrescar();
  }

  llegado(id: PjId) {
    return this.estado.llegados.includes(id);
  }

  tiene(item: string, quien: PjId = this.estado.activo) {
    return this.estado.inv[quien].includes(item);
  }

  dar(item: string, quien: PjId = this.estado.activo) {
    if (this.tiene(item, quien)) return;
    this.estado.inv[quien].push(item);
    this.sound.pickup();
    if (quien === this.estado.activo) this.hud.aviso(texto('cogido', { quien: REPARTO[quien].nombre, objeto: texto(`objeto.${item}`) }), item);
    this.refrescar();
  }

  quitar(item: string, quien: PjId = this.estado.activo) {
    this.estado.inv[quien] = this.estado.inv[quien].filter((i) => i !== item);
    if (this.hud.seleccionado === item) this.hud.seleccionar(null);
    this.refrescar();
  }

  /** Swap an item for another in the same slot (the jar gets warm). */
  cambiarObjeto(de: string, a: string, quien: PjId = this.estado.activo) {
    const inv = this.estado.inv[quien];
    const i = inv.indexOf(de);
    if (i >= 0) inv[i] = a;
    if (this.hud.seleccionado === de) this.hud.seleccionar(null);
    this.refrescar();
  }

  vestir(quien: PjId, ropa: string) {
    this.estado.ropa[quien] = ropa;
    this.pjs.get(quien)?.vestir(ropa);
    this.refrescar();
  }

  ayudaUnaVez(clave: string) {
    const k = `ayuda:${clave}`;
    if (this.flag(k)) return;
    this.poner(k);
    this.hud.ayuda(texto(`ayuda.${clave}`));
  }

  refrescar() {
    const e = this.estado;
    this.hud.ropas = e.ropa;
    this.hud.objetivo(this.cap.objetivo(this), this.hora);
    this.hud.setBolsa(e.inv[e.activo]);
    const nombreLugar = (id: string) => texto('selector.fuera', { lugar: texto(`lugar.${id}`) });
    this.hud.setReparto(
      e.jugables.map((id) => {
        const camino = this.llegado(id) && !e.final;
        return { id, aqui: !camino && e.donde[id]?.escena === this.escena, lugar: camino ? texto('selector.camino') : nombreLugar(e.donde[id]?.escena ?? ''), camino };
      }),
      e.activo,
    );
  }

  guardar() {
    for (const [id, a] of this.pjs) {
      const d = this.estado.donde[id];
      if (d && d.escena === this.escena) Object.assign(d, { X: Math.round(a.X), y: Math.round(a.y), face: a.face });
    }
    if (this.perro && this.escena === 'piso') this.estado.perro = { X: Math.round(this.perro.X), y: Math.round(this.perro.y) };
    this.estado.usos = usos();
    this.alGuardar?.(this.estado);
  }

  /** Where the game is saved (main.ts: the Partida, src/juego/partida.ts). */
  alGuardar: ((e: Estado) => void) | null = null;
  /** Something finished for good: a chapter, or a minigame won (for the menus). */
  onProgreso: ((p: { capitulo?: number; minijuego?: string }) => void) | null = null;
  /** Replaying a chapter already finished (a separate game from the main one). */
  rejugando = false;

  minijuegoSuperado(id: string) {
    this.onProgreso?.({ minijuego: id });
  }

  capituloSuperado(n: number) {
    this.onProgreso?.({ capitulo: n });
  }

  // ------------------------------------------------------------ scenes

  /**
   * Load a scene and put in it whoever is there. `levantar` false keeps the black
   * curtain down afterwards (the game's first scene, behind the title and the prologue).
   */
  async irA(escena: string, conVelo = true, levantar = true) {
    this.cinematica();
    const span = this.velo.querySelector('span')!;
    if (conVelo) {
      // The dialogue box shows over the curtain: the last line said before a door goes with it.
      this.hud.cerrarDialogo();
      span.textContent = texto('cargando');
      await this.velar(true);
    }
    const S = this.cap.escenas[escena]();
    await this.motor.cargar(S, (p) => (span.textContent = `${texto('cargando')} ${Math.round(p * 100)} %`));
    // Loaded: the curtain is only black from here on (the end of a story or the chapter fade on it).
    span.textContent = '';
    this.escena = escena;
    this.S = S;
    // Actors in this scene.
    for (const a of this.motor.actores) a.wrap.remove();
    this.motor.actores = [];
    for (const id of PROTAS) {
      const d = this.estado.donde[id];
      if (!d || d.escena !== escena) {
        this.pjs.get(id)?.wrap.remove();
        continue;
      }
      let p = this.pjs.get(id);
      if (!p) {
        p = new Personaje(this.motor.world, this.motor.defs, id, REPARTO[id].arte, this.estado.ropa[id] ?? REPARTO[id].ropa, PROTAS.indexOf(id));
        this.pjs.set(id, p);
      }
      Object.assign(p, { X: d.X, y: d.y, face: d.face, visible: true, speed: S.speed ?? 250 });
      this.motor.world.append(p.wrap);
      this.motor.actores.push(p);
    }
    for (const n of this.npcs.values()) n.wrap.remove();
    this.npcs.clear();
    for (const n of this.cap.npcs?.(this, escena) ?? []) {
      const F = NPCS[n.id];
      const p = new Personaje(this.motor.world, this.motor.defs, n.id, F.arte, F.ropa, 7);
      Object.assign(p, { X: n.X, y: n.y, face: n.face, visible: true, speed: S.speed ?? 250 });
      this.npcs.set(n.id, p);
      this.motor.actores.push(p);
    }
    this.sombra = null;
    if (this.estado.donde.pablo?.escena === escena && this.cap.sombra?.(this, escena)) this.sacarSombra();
    this.perro = null;
    if (escena === 'piso') {
      this.perro = new Perrita(this.motor.world, this.motor.defs);
      const pp = this.estado.perro ?? { X: S.spots.cama.X, y: S.spots.cama.y };
      Object.assign(this.perro, pp);
      this.motor.actores.push(this.perro);
    }
    this.props = (S.props ?? []).map((d) => Object.assign(new Objeto(this.motor.world, this.motor.defs, d.id, d.svg, d.si, d.shadow), { X: d.X, y: d.y, z: d.z ?? 0 }));
    this.motor.actores.push(...this.props);
    this.zonasLogicas = this.cap.zonas(this, escena);
    this.foco = null;
    // The chapter sets the scene up synchronously (poses, dog, camera), then may talk.
    const entrar = this.cap.alEntrar?.(this, escena).catch((e) => console.error(e));
    const a = this.pjs.get(this.estado.activo);
    const aqui = a && this.estado.donde[this.estado.activo]?.escena === escena;
    this.motor.seguir(this.foco ?? (aqui ? a.X : S.start.X), true);
    this.refrescar();
    this.guardar();
    if (conVelo && levantar) await this.velar(false);
    await entrar;
    this.refrescar();
    // Bake the scenes this one has a door to, in the background, so they open instantly. Only
    // those: every scene baked at once ran phones out of GPU memory (docs/ESTILO.md, T5.11).
    for (const id of this.cap.vecinas?.(escena) ?? []) setTimeout(() => void this.motor.precargar(this.cap.escenas[id]()), 600);
  }

  async velar(on: boolean) {
    this.velo.classList.toggle('on', on);
    if (!this.rapido) await espera(450);
  }

  /**
   * Whether the dock may switch character now: free walking, or a plain conversation (looking, talking,
   * using: `ejecutar(…, true)`). Not in a cutscene (the story goes on by itself and has to end where it
   * means to), nor in a minigame or with a choice on screen.
   */
  get cambioLibre() {
    return !this.ocupado || (this.conversacion && !this.pausado && !this.hud.enOpciones);
  }

  /**
   * From here the script in progress is a cutscene (a scene change, a minigame, the end of a story, a
   * choice…): the dock is switched off until it ends, and a switch asked for before is dropped, so none
   * of it is skipped. Chapters call it at the top of the steps that lead to one.
   */
  cinematica() {
    this.conversacion = false;
    this.cambioPedido = null;
    this.saltando = false;
    this.hud.cambioLibre = this.cambioLibre;
  }

  /** Pick another protagonist from the dock; if they are elsewhere, the game goes there. */
  async elegir(id: PjId) {
    if (id === this.estado.activo) {
      if (!this.ocupado) this.motor.seguir(this.activo?.X ?? 0);
      return;
    }
    if (this.llegado(id) && !this.estado.final) {
      this.hud.aviso(texto('selector.yaencamino', { quien: REPARTO[id].nombre }));
      return;
    }
    if (this.ocupado) {
      if (this.cambioLibre) this.pedirCambio(id);
      return;
    }
    this.sound.tap();
    await this.ejecutar(() => this.cambiarA(id));
  }

  /**
   * The player asked to switch in the middle of a conversation. It is not cut off: it is played to the
   * end at once (lines skipped, walks and waits done in a blink), so everything it does when it ends
   * (flags, objects, the next step of the puzzle) is done, and then `ejecutar` makes the switch.
   */
  private pedirCambio(id: PjId) {
    this.sound.tap();
    this.cambioPedido = id;
    this.saltando = true;
    this.hud.seleccionar(null);
    for (const p of this.pjs.values()) p.stop();
    this.hud.saltarDialogo();
  }

  /** Switch to a protagonist (inside a script): load their scene, and the first time, their opening. */
  async cambiarA(id: PjId) {
    this.cinematica();
    this.hud.seleccionar(null);
    this.estado.activo = id;
    const d = this.estado.donde[id];
    if (d && (d.escena !== this.escena || !this.S)) await this.irA(d.escena);
    else {
      this.refrescar();
      if (this.velo.classList.contains('on')) await this.velar(false);
    }
    const p = this.pjs.get(id);
    if (p && !this.estado.final) {
      p.mood = 'happy';
      setTimeout(() => (p.mood = REPARTO[id].arte.INFO.defaultMood ?? 'neutral'), 1200);
      this.etiquetaEn(REPARTO[id].nombre, p.X, p.y - 300 * this.motor.escala(this.motor.f(p.y)) / this.motor.escala(1));
    }
    if (!this.flag(`empezado.${id}`)) {
      this.poner(`empezado.${id}`);
      await this.cap.empezar(this, id);
    }
  }

  /** The start screen (and the one between stories): choose who to play. */
  async escogerQuien(titulo: string) {
    const e = this.estado;
    const id = await this.hud.eleccion(
      titulo,
      e.jugables.map((id) => ({ id, situacion: this.cap.situacion(id), camino: this.llegado(id) })),
    );
    this.sound.tap();
    return id;
  }

  /** How to play (src/ui/tutorial.ts): once a game, when its first story starts. */
  async tutorial() {
    if (this.flag('tutorial')) return;
    this.poner('tutorial');
    this.hud.cerrarDialogo();
    await mostrarTutorial(this.root);
  }

  /** A new game: choose who starts. */
  async empezarPartida() {
    if (this.cap.inicio) return this.cap.inicio(this);
    await this.cambiarA(await this.escogerQuien(texto('eleccion.titulo')));
  }

  /**
   * The protagonist's story is over: fade out before they reach the bar, so the
   * four can arrive together at the end. Then choose who goes next, or the final.
   */
  async enCamino(id: PjId = this.estado.activo) {
    this.cinematica();
    const e = this.estado;
    if (!e.llegados.includes(id)) e.llegados.push(id);
    delete e.donde[id];
    const p = this.pjs.get(id);
    if (p) p.visible = false;
    this.hud.seleccionar(null);
    this.hud.cerrarDialogo();
    await this.velar(true);
    this.velo.querySelector('span')!.textContent = '';
    const faltan = e.jugables.filter((p) => !this.llegado(p)).map((p) => REPARTO[p].nombre);
    const lista = faltan.length > 1 ? `${faltan.slice(0, -1).join(', ')} ${texto('lista.y')} ${faltan[faltan.length - 1]}` : faltan[0];
    await this.hud.rotulo(texto(`camino.${id}`), faltan.length ? texto(faltan.length > 1 ? 'camino.faltan' : 'camino.falta', { quien: lista }) : texto('camino.todos'), id);
    if (!faltan.length) {
      e.final = true;
      await this.cap.final(this);
      return;
    }
    await this.cambiarA(await this.escogerQuien(texto('eleccion.siguiente')));
  }

  // ------------------------------------------------------------ scripting API

  /**
   * Run a script: input waits until it ends; the game saves afterwards. `conversacion`: it is a plain
   * conversation (looking, talking, using), so the player may switch character in the middle of it.
   */
  async ejecutar(fn: () => Promise<void>, conversacion = false) {
    if (this.ocupado) return;
    this.ocupado = true;
    this.conversacion = conversacion;
    this.hud.cambioLibre = this.cambioLibre;
    this.hud.cerrarBandeja();
    try {
      await fn();
    } catch (e) {
      console.error(e);
      this.plano.reset(0);
      // Never leave the player behind the loading curtain: back to the scene there was.
      if (this.S && this.velo.classList.contains('on')) void this.velar(false);
    } finally {
      this.ocupado = false;
      this.conversacion = false;
      this.saltando = false;
      this.plano.manga.ocultar();
      this.hud.cerrarDialogo();
      for (const p of [...this.pjs.values(), ...this.npcs.values()]) p.talking = false;
      this.refrescar();
      this.guardar();
      this.hud.cambioLibre = true;
      // The switch asked for in the middle of the conversation, now that it has ended.
      const id = this.cambioPedido;
      this.cambioPedido = null;
      if (id) void this.elegir(id);
    }
  }

  get ocupadoAhora() {
    return this.ocupado;
  }

  async decir(quien: Quien, frase: string, animo?: string, hora?: string) {
    if (this.saltando) return;
    const actor = quien === 'sombra' ? this.sombra : esNpc(quien) ? this.npcs.get(quien) ?? null : quien && quien !== 'aceituna' ? this.pjs.get(quien) : null;
    const arte = esNpc(quien) ? NPCS[quien].arte : quien && quien !== 'aceituna' ? REPARTO[quien === 'sombra' ? 'pablo' : quien].arte : null;
    const base = (arte && arte.INFO.defaultMood) || 'neutral';
    if (actor) {
      actor.mood = animo ?? base;
      actor.talking = true;
      for (const o of [...this.pjs.values(), ...this.npcs.values()]) if (o !== actor && o.visible) o.lookAt(actor.X);
      // Pablo and his shadow look at each other while either of them speaks.
      const s = this.sombra;
      const pablo = this.pjs.get('pablo');
      if (s?.visible && pablo && (actor === s || actor === pablo)) {
        s.lookAt(pablo.X);
        if (actor === s) pablo.lookAt(s.X);
        this.sombraMira = true;
      }
    }
    if (quien === 'aceituna' && this.perro) this.perro.rig.excited = 1;
    const p = this.hud.decir(quien, frase, animo ?? base, hora);
    if (this.rapido) setTimeout(() => this.hud.tocarDialogo(), 0);
    await p;
    if (actor) {
      actor.talking = false;
      actor.mood = base;
    }
  }

  /**
   * Play a dialogue block from the texts. A block `clave.<protagonist>` (for
   * example `nofunciona.pablo`) wins over `clave` when that protagonist is playing.
   */
  async hablar(clave: string, vars: Record<string, string | number> = {}) {
    const propia = `${clave}.${this.estado.activo}`;
    for (const l of dialogo(hayDialogo(propia) ? propia : clave, { hora: this.hora, ...vars })) await this.linea(l);
  }

  async linea(l: Linea) {
    // A camera mark of the texts («@zoom pablo 2.4»), not a line of talk.
    if (l.camara) return this.plano.marca(l.camara);
    await this.decir(l.quien, l.texto, l.animo, l.hora);
    this.plano.manga.lineaDicha();
  }

  hayDialogo(clave: string) {
    return hayDialogo(clave);
  }

  async esperar(ms: number) {
    // Skipping to the end of a conversation: a frame, not the wait (but never none, or a loop that waits for the screen to change would spin).
    if (!this.rapido) await espera(this.saltando ? Math.min(ms, 16) : ms);
  }

  /** Nothing waits for the screen: tests, or a conversation being played to its end. */
  get instantaneo() {
    return this.rapido || this.saltando;
  }

  async andar(X: number, y: number, quien: PjId = this.estado.activo) {
    const a = this.pjs.get(quien);
    if (!a) return;
    const w = this.S.walk;
    const aX = Math.max(w.x0, Math.min(w.x1, X));
    const aY = Math.max(w.y0, Math.min(w.y1, y));
    // Skipping to the end of a conversation: they are simply there.
    if (this.saltando) {
      a.stop();
      Object.assign(a, { X: aX, y: aY });
      return;
    }
    await a.walkTo(aX, aY);
  }

  /** Send Aceituna somewhere; she stays there until perroDestino is cleared. */
  async perroIr(X: number, y: number) {
    if (!this.perro) return;
    this.perroDestino = { X, y };
    this.perro.rig.mode = 'idle';
    await this.perro.walkTo(X, y);
  }

  zona(id: string): Zona {
    return this.S.zonas[id];
  }

  async acercarse(id: string) {
    const z = this.zona(id);
    await this.andar(z.X, z.y);
    const k = z.k;
    // Face the zone's centre (converted to the back plane).
    this.activo.lookAt(this.S.CX + (z.u - this.S.CX) / k);
    await this.esperar(100);
  }

  // ------------------------------------------------------------ input

  private logico(p: PointerInfo) {
    return { x: (p.x / this.motor.cssW) * this.motor.vw, y: (p.y / this.motor.cssH) * H };
  }

  private css(x: number, y: number): [number, number] {
    return [(x / this.motor.vw) * this.motor.cssW, (y / H) * this.motor.cssH];
  }

  etiquetaEn(t: string, X: number, y: number) {
    const k = this.motor.f(Math.max(this.S.BASE, y));
    this.hud.etiqueta(t, ...this.css(this.motor.screenX(X, k), y));
  }

  private zonaEn(x: number, y: number): string | null {
    let mejor: string | null = null;
    let area = Infinity;
    for (const [id, z] of Object.entries(this.S.zonas)) {
      const L = this.zonasLogicas[id];
      if (!L || (L.activa && !L.activa())) continue;
      const r = this.motor.zonaRect(z);
      // A tap on the floor is a step: the margin stops at the floor line, and a zone already
      // down on the floor (the sofa, the cannon) has none below (8 October 2026: walking
      // often set things off).
      const abajo = Math.max(r.y + r.h, Math.min(r.y + r.h + MARGEN, this.S.BASE));
      if (x >= r.x - MARGEN && x <= r.x + r.w + MARGEN && y >= r.y - MARGEN && y <= abajo && r.w * r.h < area) {
        mejor = id;
        area = r.w * r.h;
      }
    }
    return mejor;
  }

  private rectActor(a: Actor, ancho: number, alto: number) {
    const k = this.motor.f(a.y);
    const s = this.motor.escala(k);
    const x = this.motor.screenX(a.X, k);
    return { x: x - (ancho / 2) * s, y: a.y - alto * s, w: ancho * s, h: alto * s };
  }

  private actorEn(x: number, y: number): PjId | 'aceituna' | 'sombra' | NpcId | null {
    const dentro = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (this.perro && this.perro.visible && dentro(this.rectActor(this.perro, 140, 100))) return 'aceituna';
    for (const [id, p] of this.pjs) {
      if (!p.visible || this.estado.donde[id]?.escena !== this.escena || p.enCapa) continue;
      if (dentro(this.rectActor(p, 110, 290))) return id;
    }
    if (this.sombra && this.sombra.visible && dentro(this.rectActor(this.sombra, 110, 290))) return 'sombra';
    for (const [id, p] of this.npcs) if (p.visible && dentro(this.rectActor(p, 110, 290))) return id;
    return null;
  }

  nombreZona(id: string) {
    return this.zonasLogicas[id]?.nombre?.() ?? texto(`zona.${id}`);
  }

  private etiquetaZona(id: string) {
    const r = this.motor.zonaRect(this.zona(id));
    this.hud.etiqueta(this.nombreZona(id), ...this.css(r.x + r.w / 2, Math.max(70, r.y)));
  }

  private alTocar(p: PointerInfo) {
    if (this.hud.enDialogo) {
      this.hud.tocarDialogo();
      return;
    }
    if (this.ocupado || this.pausado || !this.S) return;
    if (this.cap.tocar?.(this)) return;
    this.hud.cerrarBandeja();
    const { x, y } = this.logico(p);
    const item = this.hud.seleccionado;
    // Tapping your own character with nothing in hand is a step, not a look: taps meant to
    // walk a little kept landing on them.
    const quien = this.actorEn(x, y);
    const actor = quien === this.estado.activo && !item ? null : quien;
    const zona = actor ? null : this.zonaEn(x, y);
    this.sound.tap();
    if (actor) {
      if (item) this.hud.seleccionar(null);
      void this.ejecutar(async () => {
        const me = this.activo;
        if (actor !== this.estado.activo) {
          const otro = actor === 'aceituna' ? this.perro! : actor === 'sombra' ? this.sombra! : esNpc(actor) ? this.npcs.get(actor)! : this.pjs.get(actor)!;
          const lado = me.X < otro.X ? -1 : 1;
          // Someone behind a counter is spoken to from the front of it, not walked round, and from
          // a little to one side: standing right in front would hide them (and take their taps).
          if (esNpc(actor)) await this.andar(otro.X + lado * 170, Math.max(this.S.walk.y0, otro.y + 6));
          else await this.andar(otro.X + lado * 150, otro.y + 6);
          me.lookAt(otro.X);
          if (actor !== 'aceituna') otro.lookAt(me.X);
          if (actor === 'sombra') this.sombraMira = true;
        }
        await this.cap.personaje(this, actor, item);
      }, true);
      return;
    }
    if (zona) {
      const L = this.zonasLogicas[zona];
      this.etiquetaZona(zona);
      if (item) this.hud.seleccionar(null);
      void this.ejecutar(async () => {
        if (L.acercarse !== false) await this.acercarse(zona);
        if (item) {
          const ok = L.usarObjeto ? await L.usarObjeto(item) : false;
          if (!ok) {
            this.sound.nope();
            await this.hablar('nofunciona');
          }
          return;
        }
        if (L.usar) await L.usar();
        else if (this.hayDialogo(`usar.${zona}`)) await this.hablar(`usar.${zona}`);
        else if (L.mirar) await L.mirar();
        else await this.hablar(`mirar.${zona}`);
      }, true);
      return;
    }
    if (item) {
      this.hud.seleccionar(null);
      return;
    }
    // Floor: just walk (not a script, so another tap can redirect it).
    const a = this.activo;
    if (!a || a.enCapa) return;
    const f = this.motor.floorAt(x, y, a.y);
    void this.andar(f.X, f.y).then(() => this.guardar());
  }

  /** The eye button: briefly mark everything that can be touched. */
  ojo() {
    if (!this.S) return;
    this.sound.tap();
    const marcas: Array<[number, number, string]> = [];
    for (const [id, z] of Object.entries(this.S.zonas)) {
      const L = this.zonasLogicas[id];
      if (!L || (L.activa && !L.activa())) continue;
      const r = this.motor.zonaRect(z);
      const cx = r.x + r.w / 2;
      if (cx < 0 || cx > this.motor.vw) continue;
      marcas.push([cx, r.y + r.h / 2, this.nombreZona(id)]);
    }
    if (this.sombra?.visible) marcas.push([this.motor.screenX(this.sombra.X, this.motor.f(this.sombra.y)), this.sombra.y - 200, texto('nombre.sombra')]);
    if (this.perro?.visible) marcas.push([this.motor.screenX(this.perro.X, this.motor.f(this.perro.y)), this.perro.y - 60, texto('zona.aceituna')]);
    for (const [id, p] of this.pjs) {
      if (id === this.estado.activo || !p.visible || this.estado.donde[id]?.escena !== this.escena) continue;
      marcas.push([this.motor.screenX(p.X, this.motor.f(p.y)), p.y - 200, REPARTO[id].nombre]);
    }
    for (const [x, y, t] of marcas) {
      const [cx, cy] = this.css(x, y);
      const el = h('div', { class: 'marca', style: `left:${cx}px;top:${cy}px` }, h('span', {}, t));
      this.hud.root.append(el);
      setTimeout(() => el.remove(), 2600);
    }
  }

  // ------------------------------------------------------------ frame

  /**
   * The frame loop, capped: 60 fps while something moves (the camera, someone
   * walking), 30 fps otherwise. Phones with 120 Hz screens would otherwise draw
   * everything twice as often for nothing, and heat up.
   */
  start() {
    let last = performance.now();
    const frame = (now: number) => {
      requestAnimationFrame(frame);
      const intervalo = 1000 / (this.enMovimiento() ? 60 : this.fpsReposo);
      // A little slack, so 60 fps on a 120 Hz screen is every other refresh, not every third.
      if (now - last < intervalo - 4) return;
      this.vigilar(now - last);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!this.pausado) this.update(dt);
      this.medir(dt);
    };
    requestAnimationFrame(frame);
  }

  /** Frame rate while nothing walks and the camera is still. */
  fpsReposo = 30;

  /**
   * The menu's «auto» quality: when the game cannot keep up while things move (under 48 fps
   * over four seconds of movement), the scenery is drawn a step smaller, and that is
   * remembered for next time (docs/ESTILO.md, T2). A phone that cannot cope fixes itself.
   */
  calidadAuto = false;
  onCalidadAuto?: (q: Calidad) => void;
  private lento = { ms: 0, n: 0 };

  private vigilar(intervalo: number) {
    // Only steady movement counts: not a scene baking, a minigame on top or a hitch.
    if (!this.calidadAuto || this.pausado || this.motor.horneando || intervalo > 250 || !this.enMovimiento()) return;
    this.lento.ms += intervalo;
    this.lento.n++;
    if (this.lento.ms < 4000) return;
    const fps = (1000 * this.lento.n) / this.lento.ms;
    this.lento = { ms: 0, n: 0 };
    const menos = ({ alta: 'media', media: 'baja', baja: null } as const)[this.motor.calidad];
    if (fps >= 48 || !menos) return;
    this.motor.setCalidad(menos);
    this.onCalidadAuto?.(menos);
  }

  /** Anything moving on screen that deserves 60 fps. */
  private enMovimiento() {
    if (this.motor.camaraMoviendose || this.perro?.moving || this.sombra?.moving) return true;
    for (const p of this.pjs.values()) if (p.moving) return true;
    for (const p of this.npcs.values()) if (p.moving) return true;
    return false;
  }

  private update(dt: number) {
    const m = this.motor;
    m.update(dt);
    this.hud.update(dt);
    // A choice came up while a conversation was being played to its end: the player makes it, the switch is dropped.
    if (this.saltando && this.hud.enOpciones) this.cinematica();
    this.hud.cambioLibre = this.cambioLibre;
    const speaking = this.hud.hablando;
    for (const [id, p] of this.pjs) {
      p.step(dt);
      if (speaking === id) p.talking = true;
      p.update(m.t, dt);
    }
    for (const [id, p] of this.npcs) {
      p.step(dt);
      if (speaking === id) p.talking = true;
      p.update(m.t, dt);
    }
    if (this.perro) this.updatePerro(dt);
    if (this.sombra) this.updateSombra(dt, speaking === 'sombra');
    for (const o of this.props) o.visible = !o.si || this.motor.cond(o.si);
    this.cap.tick?.(this, dt);
    this.sound.ambiente(this.S ? this.cap.musica?.(this) ?? null : null);
    const a = this.pjs.get(this.estado.activo);
    if (this.foco !== null) m.seguir(this.foco);
    else if (a && this.estado.donde[this.estado.activo]?.escena === this.escena) m.seguir(a.X + a.face * 120);
    m.colocar();
    m.dibujar();
  }

  /**
   * Pablo's shadow as a character of its own. `despegar`: it peels off his feet
   * and steps back to its place, instead of already being there.
   */
  sacarSombra(despegar = false) {
    const pablo = this.pjs.get('pablo');
    if (!pablo || this.sombra) return;
    const S = this.S;
    const s = new Personaje(this.motor.world, this.motor.defs, 'sombra', REPARTO.pablo.arte, this.estado.ropa.pablo ?? REPARTO.pablo.ropa, 9);
    s.tintFijo = [0.09, 0.07, 0.13];
    s.shadowOn = false;
    const y = Math.max(S.walk.y0, pablo.y - 14);
    Object.assign(s, { X: despegar ? pablo.X - pablo.face * 20 : pablo.X - pablo.face * 150, y, face: pablo.face, speed: (S.speed ?? 250) * 0.85 });
    this.sombra = s;
    this.sombraMira = false;
    this.motor.actores.push(s);
    if (despegar) void s.walkTo(pablo.X - pablo.face * 150, y).then(() => (s.face = pablo.face));
  }

  /** The shadow leaves the scene for good: from now on it is only a voice in the dialogues. */
  quitarSombra() {
    const s = this.sombra;
    if (!s) return;
    s.wrap.remove();
    this.motor.actores = this.motor.actores.filter((a) => a !== s);
    this.sombra = null;
  }

  /**
   * Pablo's shadow keeps a step behind him and mirrors him. It walks a little
   * slower than he does, so it never has to brake: it falls back while he walks
   * and catches up once he stops, on whichever side of him it already is.
   */
  private updateSombra(dt: number, hablando: boolean) {
    const s = this.sombra!;
    const P = this.pjs.get('pablo');
    if (P && s.visible) {
      const lado = P.moving ? -P.face : Math.sign(s.X - P.X) || -P.face;
      const goal = { X: P.X + lado * 150, y: Math.max(this.S.walk.y0, Math.min(this.S.walk.y1, P.y - 14)) };
      // Once walking it keeps chasing the moving goal until it gets there. While
      // Pablo walks it never stops; when he is still, it lets him shift about.
      if (s.moving || Math.hypot(goal.X - s.X, goal.y - s.y) > (P.moving ? 30 : 110)) void s.walkTo(goal.X, goal.y);
    }
    s.step(dt);
    if (P?.moving) this.sombraMira = false;
    if (P && !s.moving) {
      if (this.sombraMira) s.lookAt(P.X);
      else s.face = P.face;
    }
    s.talking = hablando;
    s.update(this.motor.t, dt);
  }

  private updatePerro(dt: number) {
    const D = this.perro!;
    const R = D.rig;
    if (this.perroModo === 'tumbada') {
      R.mode = 'lie';
      D.update(this.motor.t, dt);
      return;
    }
    if (R.mode === 'lie') R.mode = 'idle';
    const F = this.pjs.get('fran');
    if (!this.perroDestino && this.perroModo === 'sigue' && F && F.visible && !F.enCapa) {
      // Follow Fran, a little behind him and slightly nearer the camera.
      const goal = { X: F.X - F.face * 150, y: Math.max(this.S.walk.y0, Math.min(this.S.walk.y1, F.y + 30)) };
      const far = Math.hypot(goal.X - D.X, goal.y - D.y) > (D.moving ? 20 : 90);
      if (far) void D.walkTo(goal.X, goal.y);
      else if (D.moving) D.stop();
    }
    D.step(dt);
    if (!D.moving && F) D.lookAt(F.X);
    const near = F ? Math.abs(F.X - D.X) < 260 && !F.moving : false;
    R.excited += ((near ? 1 : 0.15) - R.excited) * Math.min(1, dt * 2);
    R.look = near ? -0.3 : 0;
    D.update(this.motor.t, dt);
  }

  private medir(dt: number) {
    this.frames.push(dt);
    if (this.frames.length > 60) this.frames.shift();
    if (this.mostrarFps) {
      const avg = this.frames.reduce((s, v) => s + v, 0) / this.frames.length;
      this.hud.fps(`${Math.round(1 / avg)} fps · ${texto(this.enMovimiento() ? 'rendimiento.movimiento' : 'rendimiento.reposo')} · ${this.motor.calidad}${this.calidadAuto ? ' (auto)' : ''} · ${this.motor.back.width}×${this.motor.back.height}`);
    }
  }
}

/**
 * Saves from older versions, made playable: a protagonist in a scene that no
 * longer exists (Chuchi's placeholder before Bolilandia), or whose story the
 * chapter says has changed under them, starts their story again; items that no
 * longer exist leave the bag. Everyone else keeps their progress.
 */
export function reparar(cap: Capitulo, e: Estado) {
  const inicial = cap.estadoInicial();
  const caducados = new Set(cap.caducados?.(e) ?? []);
  for (const id of PROTAS) {
    const d = e.donde[id];
    if (d && !cap.escenas[d.escena]) caducados.add(id);
  }
  for (const id of caducados) {
    e.donde[id] = inicial.donde[id];
    e.inv[id] = [...(inicial.inv[id] ?? [])];
    e.minutos[id] = inicial.minutos[id];
    e.llegados = e.llegados.filter((x) => x !== id);
    delete e.flags[`empezado.${id}`];
    console.warn(`Partida antigua: la historia de ${id} empieza otra vez`);
  }
  for (const id of PROTAS) if (e.inv[id]) e.inv[id] = e.inv[id].filter((i) => i in OBJETOS);
  if (!e.donde[e.activo] || !cap.escenas[e.donde[e.activo]!.escena]) e.activo = e.jugables[0];
}
