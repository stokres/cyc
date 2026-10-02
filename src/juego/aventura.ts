// The point-and-click layer: scenes and who is in them, touch input, the
// scripting API chapters use, the character dock and saving.
import { Motor, H } from '../motor/motor';
import { Actor, Objeto, Perrita, Personaje } from '../motor/actores';
import type { Escena, Zona } from '../motor/escena';
import { Hud, h } from '../ui/hud';
import { Gestures, type PointerInfo } from '../core/input';
import { Sound } from '../core/audio';
import { dialogo, hayDialogo, restaurarUsos, texto, usos, type Linea, type Quien } from './textos';
import { PROTAS, REPARTO, type PjId } from './reparto';
import { guardarEstado, type Estado } from './estado';

export interface ZonaLogica {
  /** Shown on labels; defaults to `zona.<id>` in the texts. */
  nombre?(): string;
  activa?(): boolean;
  /** Long press. Defaults to the dialogue `mirar.<id>`. */
  mirar?(): Promise<void>;
  /** Tap. Defaults to `usar.<id>`, or to looking if there is no such block. */
  usar?(): Promise<void>;
  /** Tap with an item selected. Return false for the generic "that won't work". */
  usarObjeto?(item: string): Promise<boolean>;
  /** Walk there before acting (default true). */
  acercarse?: boolean;
}

export interface Capitulo {
  escenas: Record<string, () => Escena>;
  estadoInicial(): Estado;
  zonas(g: Aventura, escena: string): Record<string, ZonaLogica>;
  /** Tap (or long press, `mirar`) on a character or Aceituna, maybe with an item. */
  personaje(g: Aventura, quien: PjId | 'aceituna', item: string | null, mirar: boolean): Promise<void>;
  mirarObjeto(g: Aventura, item: string): Promise<void>;
  objetivo(g: Aventura): string | null;
  pista(g: Aventura): string;
  /** One line per protagonist for the start screen: where their story begins. */
  situacion(quien: PjId): string;
  /** First time a protagonist is played: their story's opening. */
  empezar(g: Aventura, quien: PjId): Promise<void>;
  /** All four are on their way: the four of them arrive at the bar together. */
  final(g: Aventura): Promise<void>;
  alEntrar?(g: Aventura, escena: string): Promise<void>;
  /** First look at every tap; return true to swallow it (e.g. waking Fran up). */
  tocar?(g: Aventura): boolean;
  dibujar?(g: Aventura, ctx: CanvasRenderingContext2D, capa: string): void;
  tick?(g: Aventura, dt: number): void;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const horaDe = (m: number) => `${Math.floor(m / 60) % 24}:${String(m % 60).padStart(2, '0')}`;
const MARGEN = 26; // extra tap margin around every zone (rule I4)

export class Aventura {
  readonly motor: Motor;
  readonly hud: Hud;
  readonly sound = new Sound();
  readonly velo: HTMLDivElement;
  escena = '';
  S!: Escena;
  pjs = new Map<PjId, Personaje>();
  perro: Perrita | null = null;
  props: Objeto[] = [];
  private zonasLogicas: Record<string, ZonaLogica> = {};
  private ocupado = false;
  pausado = false;
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
    this.motor = new Motor(root);
    restaurarUsos(estado.usos);
    this.hud = new Hud(root, {
      elegir: (id) => void this.elegir(id),
      ojo: () => this.ojo(),
      pista: () => void this.ejecutar(() => this.decir(null, this.cap.pista(this))),
      menu: () => this.onMenu?.(),
      seleccionar: () => this.sound.tap(),
      mirarObjeto: (id) => void this.ejecutar(() => this.cap.mirarObjeto(this, id)),
    });
    this.velo = h('div', { class: 'velo' }, h('span', {}, texto('cargando')));
    root.append(this.velo);
    const gest = new Gestures(root);
    gest.handlers = {
      tap: (p) => this.alTocar(p),
      longPress: (p) => this.alMantener(p),
      pressProgress: (p, t) => this.hud.anillo(p && !this.ocupado && !this.hud.enDialogo ? p.x : null, p?.y ?? 0, t),
    };
    this.motor.cond = (expr) => (expr.startsWith('!') ? !this.flag(expr.slice(1)) : this.flag(expr));
    this.motor.extra = (ctx, capa) => this.cap.dibujar?.(this, ctx, capa);
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
  }

  ayudaUnaVez(clave: string) {
    const k = `ayuda:${clave}`;
    if (this.flag(k)) return;
    this.poner(k);
    this.hud.ayuda(texto(`ayuda.${clave}`));
  }

  refrescar() {
    const e = this.estado;
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
    guardarEstado(this.estado);
  }

  // ------------------------------------------------------------ scenes

  /** Load a scene and put in it whoever is there. */
  async irA(escena: string, conVelo = true) {
    if (conVelo) await this.velar(true);
    const S = this.cap.escenas[escena]();
    const span = this.velo.querySelector('span')!;
    await this.motor.cargar(S, (p) => (span.textContent = `${texto('cargando')} ${Math.round(p * 100)} %`));
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
    if (conVelo) await this.velar(false);
    await entrar;
    this.refrescar();
    // Bake the other scenes in the background, so doors open instantly.
    for (const id of Object.keys(this.cap.escenas)) if (id !== escena) setTimeout(() => void this.motor.precargar(this.cap.escenas[id]()), 600);
  }

  async velar(on: boolean) {
    this.velo.classList.toggle('on', on);
    if (!this.rapido) await espera(450);
  }

  /** Pick another protagonist from the dock; if they are elsewhere, the game goes there. */
  async elegir(id: PjId) {
    if (this.ocupado || this.hud.enDialogo) return;
    if (id === this.estado.activo) {
      this.motor.seguir(this.activo?.X ?? 0);
      return;
    }
    if (this.llegado(id) && !this.estado.final) {
      this.hud.aviso(texto('selector.yaencamino', { quien: REPARTO[id].nombre }));
      return;
    }
    this.sound.tap();
    await this.ejecutar(() => this.cambiarA(id));
  }

  /** Switch to a protagonist (inside a script): load their scene, and the first time, their opening. */
  async cambiarA(id: PjId) {
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

  /** A new game: choose who starts. */
  async empezarPartida() {
    await this.cambiarA(await this.escogerQuien(texto('eleccion.titulo')));
  }

  /**
   * The protagonist's story is over: fade out before they reach the bar, so the
   * four can arrive together at the end. Then choose who goes next, or the final.
   */
  async enCamino(id: PjId = this.estado.activo) {
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

  /** Run a script: input waits until it ends; the game saves afterwards. */
  async ejecutar(fn: () => Promise<void>) {
    if (this.ocupado) return;
    this.ocupado = true;
    this.hud.cerrarBandeja();
    try {
      await fn();
    } catch (e) {
      console.error(e);
    } finally {
      this.ocupado = false;
      this.hud.cerrarDialogo();
      for (const p of this.pjs.values()) p.talking = false;
      this.refrescar();
      this.guardar();
    }
  }

  get ocupadoAhora() {
    return this.ocupado;
  }

  async decir(quien: Quien, frase: string, animo?: string, hora?: string) {
    const actor = quien && quien !== 'aceituna' ? this.pjs.get(quien) : null;
    const base = actor ? REPARTO[quien as PjId].arte.INFO.defaultMood ?? 'neutral' : 'neutral';
    if (actor) {
      actor.mood = animo ?? base;
      actor.talking = true;
      for (const o of this.pjs.values()) if (o !== actor && o.visible) o.lookAt(actor.X);
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
    await this.decir(l.quien, l.texto, l.animo, l.hora);
  }

  hayDialogo(clave: string) {
    return hayDialogo(clave);
  }

  async esperar(ms: number) {
    if (!this.rapido) await espera(ms);
  }

  async andar(X: number, y: number, quien: PjId = this.estado.activo) {
    const a = this.pjs.get(quien);
    if (!a) return;
    const w = this.S.walk;
    await a.walkTo(Math.max(w.x0, Math.min(w.x1, X)), Math.max(w.y0, Math.min(w.y1, y)));
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
      if (x >= r.x - MARGEN && x <= r.x + r.w + MARGEN && y >= r.y - MARGEN && y <= r.y + r.h + MARGEN && r.w * r.h < area) {
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

  private actorEn(x: number, y: number): PjId | 'aceituna' | null {
    const dentro = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (this.perro && this.perro.visible && dentro(this.rectActor(this.perro, 140, 100))) return 'aceituna';
    for (const [id, p] of this.pjs) {
      if (!p.visible || this.estado.donde[id]?.escena !== this.escena || p.enCapa) continue;
      if (dentro(this.rectActor(p, 110, 290))) return id;
    }
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
    const actor = this.actorEn(x, y);
    const zona = actor ? null : this.zonaEn(x, y);
    this.sound.tap();
    if (actor) {
      if (item) this.hud.seleccionar(null);
      void this.ejecutar(async () => {
        const me = this.activo;
        if (actor !== this.estado.activo) {
          const otro = actor === 'aceituna' ? this.perro! : this.pjs.get(actor)!;
          const lado = me.X < otro.X ? -1 : 1;
          await this.andar(otro.X + lado * 150, otro.y + 6);
          me.lookAt(otro.X);
          if (actor !== 'aceituna') this.pjs.get(actor)!.lookAt(me.X);
        }
        await this.cap.personaje(this, actor, item, false);
      });
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
      });
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

  private alMantener(p: PointerInfo) {
    if (this.ocupado || this.pausado || this.hud.enDialogo || !this.S) return;
    const { x, y } = this.logico(p);
    const actor = this.actorEn(x, y);
    if (actor) {
      void this.ejecutar(() => this.cap.personaje(this, actor, null, true));
      return;
    }
    const zona = this.zonaEn(x, y);
    if (!zona) return;
    const L = this.zonasLogicas[zona];
    this.etiquetaZona(zona);
    void this.ejecutar(async () => {
      const z = this.zona(zona);
      this.activo?.lookAt(this.S.CX + (z.u - this.S.CX) / z.k);
      if (L.mirar) await L.mirar();
      else await this.hablar(`mirar.${zona}`);
    });
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

  start() {
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!this.pausado) this.update(dt);
      this.medir(dt);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private update(dt: number) {
    const m = this.motor;
    m.update(dt);
    this.hud.update(dt);
    const speaking = this.hud.hablando;
    for (const [id, p] of this.pjs) {
      p.step(dt);
      if (speaking === id) p.talking = true;
      p.update(m.t, dt);
    }
    if (this.perro) this.updatePerro(dt);
    for (const o of this.props) o.visible = !o.si || this.motor.cond(o.si);
    this.cap.tick?.(this, dt);
    const a = this.pjs.get(this.estado.activo);
    if (this.foco !== null) m.seguir(this.foco);
    else if (a && this.estado.donde[this.estado.activo]?.escena === this.escena) m.seguir(a.X + a.face * 120);
    m.colocar();
    m.dibujar();
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
      this.hud.fps(`${Math.round(1 / avg)} fps · ${this.motor.calidad} · ${this.motor.back.width}×${this.motor.back.height}`);
    }
  }
}
