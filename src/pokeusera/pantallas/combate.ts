// PokéUsera · the battle screen. Three rival rows on top (info panel left, front sprite right),
// your row below (back sprite left, panel right with HP numbers), then the text box / menus.
// It draws and plays only what it is told:
//   alInicio(estado)            the teams come out
//   pedirEleccion(j, estado, ms) / pedirReemplazo(j, estado, ms)   the local player decides (promises)
//   alTurno(eventos, estado) / alReemplazo(eventos, estado)       play the events, then adopt `estado`
// so a guest can drive it from network messages exactly like the host does from Partida.
import { ENTRENADORES, type Eleccion, type EstadoCombate, type Evento, type Userito } from '../tipos';
import { ESPECIE, MOVS, DESESPERADA } from '../datos';
import { activo, eliminado, enGrada, movsDisponibles, necesitaObjetivo, puedeCambiar, rivalesEnPie, vivos } from '../motor/combate';
import { anchoTexto2 } from '../arte2/fuente2';
import { PS_TONOS, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteEspalda2, spriteFrente2 } from '../arte2/sprites2';
import { barraPS2, bandaEntrenador, filaMenu, hornear, panel, panelCacheado, pip, relleno } from '../arte2/ui2';
import { JUGADORES2, SOMBRA_TEXTO } from '../arte2/paleta2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { CajaTexto } from './caja';
import { menuPausa } from './ajustes';
import { dibujarBandeja, dibujarFondoBar, miniatura, pieSprite, plataformaCacheada } from './fondos';
import { sobre } from './modal';
import {
  Animador,
  barraArriba,
  cfg,
  chipTiempo,
  colorEnt,
  conContorno,
  dormir,
  envolver,
  etiquetaEstado,
  ficha,
  flecha,
  insignaTipo,
  menuIcono,
  mover,
  oscurecer,
  parpadea,
  realce,
  recortar,
  rect,
  reposo,
  ritmo,
  t,
  texto2,
  textoGrande,
  velo,
} from './ui';

const PS_ROJO = '#ff6a52';
const PS_VERDE = PS_TONOS.alto[1];
const TAG_GRIS = '#e8dcc0';
const TAG_ORO = '#ffd23a';

type Modo = 'cola' | 'espera' | 'accion' | 'movs' | 'objetivo' | 'equipo' | 'grada' | 'gradaObj';

interface Fx {
  /** HP shown (animated) of the active userito. */
  ps: number;
  oculto: boolean;
  /** Milliseconds of blinking left. */
  parpadeo: number;
  /** Horizontal offset of the lunge (px). */
  salto: number;
  /** 0..1: sliding down into the ground. */
  caida: number;
  /** 0..1: rising out of the cap (1 = fully there). */
  alza: number;
  /** −1 none, else 0..1 of the cap animation. */
  chapa: number;
  /** 0..1 how greyed the row is. */
  velo: number;
}

/** Side of the userito sprites. */
const LADO = 64;

/** The action being played: who acts (−1 = nobody: end-of-turn effects) and who it is aimed at. Everything else is dimmed. */
interface Foco {
  actor: number;
  objetivos: number[];
  /** performance.now() when it began (fade in, pulse). */
  t0: number;
}

/** A number or tag floating over a userito. */
interface Flotante {
  j: number;
  s: string;
  color: string;
  /** 'num': rises from the middle of the sprite; 'tag': a short label near the bottom. */
  tipo: 'num' | 'tag';
  /** Vertical slot so several tags do not overlap. */
  hueco: number;
  t0: number;
  dur: number;
}

/** The order of the actions of a turn, derived from its events. */
interface OrdenTurno {
  lista: { j: number; especie: string }[];
  /** Index of the action being played (−1 = none yet), and how many have finished. */
  actual: number;
}

interface GrupoHistorial {
  turno: number;
  lineas: string[];
}

const nuevoFx = (): Fx => ({ ps: 0, oculto: false, parpadeo: 0, salto: 0, caida: 0, alza: 1, chapa: -1, velo: 0 });

// The bottle cap (20×20), baked once.
let capsula: HTMLCanvasElement | null = null;
function chapaImg(): HTMLCanvasElement {
  if (capsula) return capsula;
  const c = document.createElement('canvas');
  c.width = c.height = 20;
  const x = c.getContext('2d')!;
  for (let j = 0; j < 20; j++) {
    for (let i = 0; i < 20; i++) {
      const dx = i - 9.5;
      const dy = j - 9.5;
      const r = Math.hypot(dx, dy);
      if (r > 9.9) continue;
      const ang = Math.atan2(dy, dx);
      const diente = r > 8.3 && Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 20) % 2 === 0;
      if (diente) continue;
      x.fillStyle = r > 8 ? '#6a4a14' : r > 5.4 ? '#e0a520' : '#f6cf5a';
      if (r <= 5.4 && dx + dy < -3) x.fillStyle = '#fff2b0';
      if (r > 8.8) x.fillStyle = '#3b2a3f';
      x.fillRect(i, j, 1, 1);
    }
  }
  capsula = c;
  return c;
}

/** Text lines that only comment on a hit that the screen already shows (tags, numbers). */
const REACCIONES = new Set(['combate.critico', 'combate.muy_eficaz', 'combate.poco_eficaz', 'combate.veces']);

export class VistaCombate implements Escena {
  /** What is on screen (changes as the events play). */
  disp!: EstadoCombate;
  /** The engine's last full state (for the menus). */
  private real!: EstadoCombate;
  private fx: Fx[] = [];
  private anim = new Animador(() => ritmo().anim);
  private caja = new CajaTexto(206);
  private modo: Modo = 'cola';
  private sel = 0;
  private selMov = 0;
  private plazoFin = 0;
  private ultimoTic = -1;
  private turnoHud = 1;
  private foco: Foco | null = null;
  private flotantes: Flotante[] = [];
  private orden: OrdenTurno | null = null;
  /** performance.now() until which the big «ORDEN DEL TURNO» strip shows (0 = hidden). */
  private ordenHasta = 0;
  /** The battle log by turn (HISTORIAL), with the lines already wrapped for the box. */
  private historial: GrupoHistorial[] = [];
  private versionHistorial = 0;
  /** The replacements phase is playing: a 'sale' event gets the spotlight. */
  private enReemplazo = false;
  /** An action has already been played in this turn (a pause goes between actions). */
  private hubo = false;
  /** The turn's end-of-turn part has begun. */
  private finVisto = false;
  private objetivosPosibles: number[] = [];
  private movElegido = 0;
  private gradaAccion: 'cana' | 'abucheo' = 'cana';
  private reemplazo = false;
  private resolverEleccion: ((e: Eleccion | null) => void) | null = null;
  private resolverReemplazo: ((i: number) => void) | null = null;
  /** Set by the flow: the player chose ABANDONAR in the pause box. */
  alAbandonar: (() => void) | null = null;
  private yo: number;

  /** `miSeat`: this screen's player (null = just watching: seat 0 goes at the bottom). */
  constructor(miSeat: number | null) {
    this.yo = miSeat ?? 0;
  }

  // ------------------------------------------------------------------ feeding (host or network)

  async alInicio(estado: EstadoCombate): Promise<void> {
    this.adoptar(estado);
    this.turnoHud = estado.turno;
    sonido.musica('combate');
    this.fx.forEach((f) => {
      f.oculto = true;
      f.alza = 0;
    });
    sonido.efecto('turno');
    const orden = [...this.rivales(), this.yo];
    const sacadas = orden.map(async (j, i) => {
      await dormir(250 * i);
      await this.entra(j);
    });
    const texto = this.caja.decir(t('batalla.inicio'), 900);
    await Promise.all([texto, ...sacadas]);
  }

  /** The local player decides the turn. */
  pedirEleccion(j: number, estado: EstadoCombate, plazoMs: number): Promise<Eleccion | null> {
    return new Promise((res) => {
      this.real = estado;
      this.turnoHud = estado.turno;
      this.yo = j;
      this.plazoFin = Date.now() + plazoMs;
      this.ultimoTic = -1;
      this.reemplazo = false;
      this.sel = 0;
      this.selMov = 0;
      this.caja.fijar('');
      const afuera = eliminado(estado, j);
      this.modo = afuera ? 'grada' : 'accion';
      this.resolverEleccion = (e) => {
        this.resolverEleccion = null;
        res(e);
      };
    });
  }

  /** The local player picks who comes in after a fall. */
  pedirReemplazo(j: number, estado: EstadoCombate, plazoMs: number): Promise<number> {
    return new Promise((res) => {
      this.real = estado;
      this.yo = j;
      this.plazoFin = Date.now() + plazoMs;
      this.ultimoTic = -1;
      this.reemplazo = true;
      const q = estado.jugadores[j];
      this.sel = Math.max(0, vivos(q)[0] ?? 0);
      this.caja.fijar('');
      this.modo = 'equipo';
      this.resolverReemplazo = (i) => {
        this.resolverReemplazo = null;
        res(i);
      };
    });
  }

  async alTurno(eventos: Evento[], estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.grupoHistorial(estado.turno - 1);
    this.enReemplazo = false;
    await this.reproducir(eventos);
    this.terminarReproduccion();
    this.adoptar(estado);
    this.turnoHud = estado.turno;
  }

  async alReemplazo(eventos: Evento[], estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.grupoHistorial(estado.turno - 1);
    this.enReemplazo = true;
    this.hubo = false;
    await this.reproducir(eventos, false);
    this.enReemplazo = false;
    this.terminarReproduccion();
    this.adoptar(estado);
  }

  /** A line from outside the battle (online: someone left): queued in the text box. */
  aviso(s: string) {
    this.registrar(s);
    void this.caja.decir(s, 1400);
    pantalla().redibujar();
  }

  async alFin(estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    this.adoptar(estado);
    await dormir(700);
  }

  private cerrarMenus() {
    this.modo = 'cola';
    this.plazoFin = 0;
    this.reemplazo = false;
    this.caja.vaciar();
  }

  // ------------------------------------------------------------------ state helpers

  private rivales(): number[] {
    return this.disp.jugadores.map((_, j) => j).filter((j) => j !== this.yo);
  }

  /** Takes `estado` as the truth: sprites, bars, statuses, places. */
  private adoptar(estado: EstadoCombate) {
    this.real = estado;
    this.disp = structuredClone(estado);
    this.disp.jugadores.forEach((q, j) => {
      const f = (this.fx[j] ??= nuevoFx());
      const u = activo(this.disp, j);
      f.ps = u.ps;
      f.oculto = u.ps <= 0;
      f.parpadeo = 0;
      f.salto = 0;
      f.caida = 0;
      f.alza = 1;
      f.chapa = -1;
      f.velo = q.puesto > 1 ? 1 : 0;
    });
    this.musicaSegunJugadores();
  }

  private musicaSegunJugadores() {
    const enPie = this.disp.jugadores.filter((q) => q.puesto === 0).length;
    sonido.musica(enPie <= 2 ? 'final' : 'combate');
  }

  // ------------------------------------------------------------------ playing the events

  private terminarReproduccion() {
    this.foco = null;
    this.orden = null;
    this.ordenHasta = 0;
    this.flotantes = [];
  }

  /** Who acts, in order, taken from the events of a turn: attacks, switches and cañas (not the grada). */
  private derivarOrden(eventos: Evento[]): OrdenTurno {
    const lista: OrdenTurno['lista'] = [];
    for (const ev of eventos) {
      if (ev.fin) break;
      if (ev.k === 'usa' || (ev.k === 'texto' && ev.j !== undefined && (ev.clave === 'combate.retira' || ev.clave === 'combate.cana'))) {
        const j = ev.j as number;
        lista.push({ j, especie: this.userito(j).especie });
      }
    }
    return { lista, actual: -1 };
  }

  private async reproducir(eventos: Evento[], conOrden = true) {
    this.hubo = false;
    this.finVisto = false;
    this.foco = null;
    const orden = this.derivarOrden(eventos);
    // The order of the turn first, for a moment.
    if (conOrden && orden.lista.length >= 2) {
      this.orden = orden;
      const ms = cfg.rapido ? 0 : ritmo().orden;
      if (ms > 0) {
        this.ordenHasta = performance.now() + ms;
        sonido.efecto('turno');
        await dormir(ms);
        this.ordenHasta = 0;
      }
    } else if (conOrden) this.orden = orden.lista.length ? orden : null;
    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i];
      // Pure text lines that follow each other (the same hit: critical, super effective...) share a box when they fit.
      if (ev.k === 'texto' && ev.clave) {
        this.entrarFin(ev);
        const grupo = [ev];
        let linea = t(ev.clave, ev.vars);
        while (i + 1 < eventos.length) {
          const sig = eventos[i + 1];
          if (sig.k !== 'texto' || !sig.clave || !!sig.fin !== !!ev.fin) break;
          const junto = `${linea} ${t(sig.clave, sig.vars)}`;
          if (!this.caja.cabe(junto, this.lineasCaja())) break;
          linea = junto;
          grupo.push(sig);
          i++;
        }
        for (const g of grupo) this.efectoTexto(g);
        // Reactions to a hit (critical, effectiveness, «n times») are also shown as tags over the userito: they wait less.
        const breve = grupo.every((g) => REACCIONES.has(g.clave ?? ''));
        await this.decir(linea, breve && ritmo().espera > 0 ? Math.round(ritmo().espera / 2) : undefined);
        continue;
      }
      await this.evento(ev);
    }
  }

  private userito(j: number): Userito {
    return activo(this.disp, j);
  }

  /** Puts a line in the log and in the text box. */
  private decir(linea: string, esperaMs?: number): Promise<void> {
    this.registrar(linea);
    return this.caja.decir(linea, esperaMs);
  }

  private registrar(linea: string) {
    if (!this.historial.length) this.historial.push({ turno: 0, lineas: [] });
    this.historial[this.historial.length - 1].lineas.push(linea);
    this.versionHistorial++;
  }

  private grupoHistorial(turno: number) {
    const ult = this.historial[this.historial.length - 1];
    if (!ult || ult.turno !== turno) this.historial.push({ turno, lineas: [] });
  }

  // ---- the spotlight

  private ponerFoco(actor: number, objetivos: number[]) {
    this.foco = { actor, objetivos, t0: performance.now() };
    if (this.orden && actor >= 0) {
      // The action being played is the next one in the list that belongs to this player.
      let i = this.orden.actual + 1;
      while (i < this.orden.lista.length && this.orden.lista[i].j !== actor) i++;
      if (i < this.orden.lista.length) this.orden.actual = i;
    }
  }

  /** Something floats over a userito for a moment. */
  private flota(j: number, s: string, color: string, tipo: 'num' | 'tag') {
    const hueco = this.flotantes.filter((f) => f.j === j && f.tipo === tipo && performance.now() - f.t0 < f.dur).length;
    this.flotantes.push({ j, s, color, tipo, hueco, t0: performance.now(), dur: cfg.rapido ? 120 : ritmo().flota });
  }

  /** What a pure text event adds on screen (a tag, the spotlight on a switch or a caña) before its line shows. */
  private efectoTexto(ev: Extract<Evento, { k: 'texto' }>) {
    if (ev.j === undefined) return;
    switch (ev.clave) {
      case 'combate.no_afecta':
        this.flota(ev.j, t('batalla.tag.noafecta'), TAG_GRIS, 'tag');
        break;
      case 'combate.esconde_protege':
        this.flota(ev.j, t('batalla.tag.escondido'), TAG_GRIS, 'tag');
        break;
      case 'combate.retira':
      case 'combate.cana':
        this.hubo = true;
        this.ponerFoco(ev.j, []);
        break;
      case 'combate.grada_cana':
      case 'combate.grada_abucheo':
        this.ponerFoco(-1, [ev.j]);
        break;
    }
  }

  /** The first event after the last action: the spotlight goes out (what follows are the bar's effects). */
  private entrarFin(ev: Evento) {
    if (!ev.fin || this.finVisto) return;
    this.finVisto = true;
    this.foco = null;
    if (this.orden) this.orden.actual = this.orden.lista.length;
  }

  private async evento(ev: Evento) {
    const tareas: Promise<void>[] = [];
    const linea = ev.clave ? t(ev.clave, ev.vars) : null;
    this.entrarFin(ev);
    switch (ev.k) {
      case 'usa': {
        if (this.hubo) await dormir(ritmo().entre);
        this.hubo = true;
        this.ponerFoco(ev.j, ev.obj ?? []);
        const m = MOVS[ev.mov];
        if (m) {
          if (m.pot !== null) sonido.efecto(['normal', 'tierra', 'aire', 'juerga', 'fantasma'].includes(m.tipo) ? 'cursor' : 'cambio');
        }
        tareas.push(this.embestida(ev.j));
        break;
      }
      case 'golpe': {
        const u = this.userito(ev.j);
        u.ps = ev.ps;
        if (ev.fin) this.foco = { actor: -1, objetivos: [ev.j], t0: performance.now() };
        if (ev.dano > 0) {
          sonido.efecto(ev.critico ? 'critico' : ev.ef > 1 ? 'golpeFuerte' : ev.ef < 1 ? 'golpeFlojo' : 'golpe');
          tareas.push(this.parpadea(ev.j));
          this.flota(ev.j, `-${ev.dano}`, PS_ROJO, 'num');
          if (ev.critico) this.flota(ev.j, t('batalla.tag.critico'), TAG_ORO, 'tag');
          if (ev.ef > 1) this.flota(ev.j, t('batalla.tag.muy'), TAG_ORO, 'tag');
          else if (ev.ef < 1 && ev.ef > 0) this.flota(ev.j, t('batalla.tag.poco'), TAG_GRIS, 'tag');
        }
        tareas.push(this.barra(ev.j, ev.ps));
        break;
      }
      case 'falla':
        sonido.efecto('falla');
        this.flota(ev.j, t(ev.clave === 'combate.esquiva' ? 'batalla.tag.esquiva' : 'batalla.tag.falla'), TAG_GRIS, 'tag');
        break;
      case 'cura': {
        const u = this.userito(ev.j);
        const ganado = ev.ps - u.ps;
        u.ps = ev.ps;
        sonido.efecto('cura');
        if (ganado > 0) this.flota(ev.j, `+${ganado}`, PS_VERDE, 'num');
        tareas.push(this.barra(ev.j, ev.ps));
        break;
      }
      case 'estado': {
        const u = this.userito(ev.j);
        if (ev.estado === null) {
          if (ev.de === 'achispado') u.achispado = 0;
          else u.estado = null;
        } else {
          if (ev.estado === 'achispado') u.achispado = Math.max(1, u.achispado);
          else u.estado = ev.estado;
          sonido.efecto('estado');
        }
        break;
      }
      case 'nivel':
        sonido.efecto(ev.cambio > 0 ? 'sube' : 'baja');
        break;
      case 'cae': {
        sonido.efecto('cae');
        this.userito(ev.j).ps = 0;
        tareas.push(this.cae(ev.j));
        break;
      }
      case 'sale': {
        if (this.enReemplazo) this.ponerFoco(ev.j, []);
        this.disp.jugadores[ev.j].activo = ev.idx;
        this.fx[ev.j].ps = this.userito(ev.j).ps;
        this.fx[ev.j].oculto = true;
        tareas.push(this.entra(ev.j, true));
        break;
      }
      case 'eliminado': {
        sonido.efecto('eliminado');
        this.disp.jugadores[ev.j].puesto = ev.puesto;
        tareas.push(this.anim.animar(500, (p) => (this.fx[ev.j].velo = p)));
        this.musicaSegunJugadores();
        break;
      }
      case 'fin':
        this.disp.ganador = ev.ganador;
        this.disp.jugadores[ev.ganador].puesto = 1;
        this.foco = null;
        break;
      case 'texto':
        break;
    }
    if (linea) tareas.push(this.decir(linea));
    await Promise.all(tareas);
  }

  private embestida(j: number): Promise<void> {
    const dir = j === this.yo ? 1 : -1;
    return this.anim.animar(300, (p) => (this.fx[j].salto = dir * Math.round(Math.sin(p * Math.PI) * 9)));
  }

  private parpadea(j: number): Promise<void> {
    return this.anim.animar(480, (p) => (this.fx[j].parpadeo = p >= 1 ? 0 : 480 * (1 - p)));
  }

  /** The HP bar drains (or fills) over the time the speed setting says. */
  private barra(j: number, ps: number): Promise<void> {
    const f = this.fx[j];
    const desde = f.ps;
    return this.anim.animar(ritmo().barra, (p) => (f.ps = desde + (ps - desde) * p), true);
  }

  private async cae(j: number) {
    const f = this.fx[j];
    await this.anim.animar(550, (p) => (f.caida = p));
    f.oculto = true;
    f.caida = 0;
  }

  /** A userito comes out of its bottle cap. */
  private async entra(j: number, conGrito = false) {
    const f = this.fx[j];
    f.oculto = false;
    f.alza = 0;
    f.chapa = 0;
    f.caida = 0;
    await this.anim.animar(650, (p) => {
      f.chapa = p >= 1 ? -1 : p;
      f.alza = Math.min(1, Math.max(0, (p - 0.35) / 0.45));
    });
    f.alza = 1;
    if (conGrito || j === this.yo) sonido.grito(this.userito(j).especie);
  }

  // ------------------------------------------------------------------ choosing

  private enviar(e: Eleccion | null) {
    sonido.efecto('aceptar');
    this.modo = 'espera';
    this.caja.fijar(t('batalla.espera'));
    this.resolverEleccion?.(e);
  }

  private atrasDe(): boolean {
    switch (this.modo) {
      case 'movs':
        this.modo = 'accion';
        break;
      case 'objetivo':
        this.modo = this.movElegido === -1 ? 'accion' : 'movs';
        break;
      case 'equipo':
        if (this.reemplazo) return false;
        this.modo = 'accion';
        break;
      case 'gradaObj':
        this.modo = 'grada';
        break;
      default:
        return false;
    }
    sonido.efecto('atras');
    return true;
  }

  private get puedeVolver(): boolean {
    return this.modo === 'movs' || this.modo === 'objetivo' || this.modo === 'gradaObj' || (this.modo === 'equipo' && !this.reemplazo);
  }

  private get eligiendo(): boolean {
    return this.modo === 'accion' || this.modo === 'movs' || this.modo === 'objetivo' || this.modo === 'equipo' || this.modo === 'grada' || this.modo === 'gradaObj';
  }

  private async pausar() {
    sonido.efecto('aceptar');
    const r = await menuPausa(this);
    if (r === 'abandonar') this.alAbandonar?.();
  }

  private elegirMovimiento(i: number) {
    const u = activo(this.real, this.yo);
    const libres = movsDisponibles(this.real, this.yo);
    const desesperada = !libres.some(Boolean);
    if (!desesperada && !libres[i]) return;
    this.movElegido = desesperada ? 0 : i;
    const id = desesperada ? DESESPERADA : ESPECIE[u.especie].movs[i];
    if (necesitaObjetivo(id, this.real)) {
      const riv = rivalesEnPie(this.real, this.yo);
      if (riv.length === 1) {
        this.enviar({ tipo: 'atacar', mov: this.movElegido, objetivo: riv[0] });
        return;
      }
      this.objetivosPosibles = riv;
      this.sel = 0;
      this.modo = 'objetivo';
      sonido.efecto('aceptar');
    } else this.enviar({ tipo: 'atacar', mov: this.movElegido });
  }

  private elegirObjetivo(j: number) {
    if (!this.objetivosPosibles.includes(j)) return;
    if (this.modo === 'objetivo') this.enviar({ tipo: 'atacar', mov: this.movElegido, objetivo: j });
    else if (this.modo === 'gradaObj') this.enviar({ tipo: 'grada', accion: this.gradaAccion, objetivo: j });
  }

  private abrirObjetivosGrada(accion: 'cana' | 'abucheo') {
    this.gradaAccion = accion;
    this.objetivosPosibles = rivalesEnPie(this.real, this.yo);
    if (this.objetivosPosibles.length === 1) {
      this.enviar({ tipo: 'grada', accion, objetivo: this.objetivosPosibles[0] });
      return;
    }
    this.sel = 0;
    this.modo = 'gradaObj';
    sonido.efecto('aceptar');
  }

  private elegirEquipo(i: number) {
    const q = this.real.jugadores[this.yo];
    const u = q.equipo[i];
    if (!u || u.ps <= 0) return;
    if (this.reemplazo) {
      this.modo = 'espera';
      this.caja.fijar(t('batalla.espera'));
      sonido.efecto('aceptar');
      this.resolverReemplazo?.(i);
    } else {
      if (i === q.activo) return;
      this.enviar({ tipo: 'cambiar', a: i });
    }
  }

  private accionPrincipal(i: number) {
    const q = this.real.jugadores[this.yo];
    if (i === 0) {
      this.modo = 'movs';
      this.selMov = 0;
      sonido.efecto('aceptar');
    } else if (i === 1) {
      if (!puedeCambiar(this.real, this.yo)) return;
      this.modo = 'equipo';
      this.reemplazo = false;
      this.sel = vivos(q).find((k) => k !== q.activo) ?? 0;
      sonido.efecto('aceptar');
    } else if (i === 2) {
      if (!q.cana) return;
      this.enviar({ tipo: 'cana' });
    }
  }

  accion(a: Accion): boolean {
    if (a === 'atras') {
      if (this.atrasDe()) return true;
      void this.pausar();
      return true;
    }
    switch (this.modo) {
      case 'cola':
        if (a === 'aceptar') this.caja.toque();
        return true;
      case 'espera':
        return true;
      case 'accion':
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, 3, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.accionPrincipal(this.sel);
        return true;
      case 'movs': {
        const n = movsDisponibles(this.real, this.yo).some(Boolean) ? 4 : 1;
        if (a === 'arriba' || a === 'abajo') {
          this.selMov = mover(this.selMov, n, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.elegirMovimiento(this.selMov);
        return true;
      }
      case 'equipo': {
        const n = this.real.jugadores[this.yo].equipo.length;
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, n, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.elegirEquipo(this.sel);
        return true;
      }
      case 'objetivo':
      case 'gradaObj': {
        const n = this.objetivosPosibles.length;
        if (n && (a === 'arriba' || a === 'abajo' || a === 'izq' || a === 'der')) {
          this.sel = mover(this.sel, n, a === 'arriba' || a === 'izq' ? 'arriba' : 'abajo');
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.elegirObjetivo(this.objetivosPosibles[this.sel]);
        return true;
      }
      case 'grada':
        if (a === 'arriba' || a === 'abajo') {
          this.sel = mover(this.sel, 3, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') this.accionGrada(this.sel);
        return true;
    }
    return true;
  }

  private accionGrada(i: number) {
    if (i === 2) this.enviar(null);
    else if (enGrada(this.real, this.yo)) this.abrirObjetivosGrada(i === 0 ? 'cana' : 'abucheo');
    else this.enviar(null);
  }

  // ------------------------------------------------------------------ frame

  paso(dt: number): boolean {
    let mueve = this.anim.paso(dt);
    if (this.caja.paso(dt)) mueve = true;
    // The spotlight pulses, numbers float, the order strip counts down.
    if (this.foco || this.flotantes.length || this.ordenHasta > 0) mueve = true;
    for (const f of this.fx) {
      if (f.parpadeo > 0) {
        f.parpadeo = Math.max(0, f.parpadeo - dt);
      }
    }
    if (this.plazoFin > 0) {
      const seg = Math.ceil((this.plazoFin - Date.now()) / 1000);
      if (seg <= 5 && seg > 0 && seg !== this.ultimoTic && this.eligiendo) {
        this.ultimoTic = seg;
        sonido.efecto('tic');
      }
      if (seg <= 0 && this.eligiendo) {
        // Time is up: the host decides for us.
        this.modo = 'espera';
        this.caja.fijar(t('batalla.tiempo'));
      }
      mueve = true;
    }
    return mueve;
  }

  /** Heights of the field, the tray and the rows for this screen height (see docs/POKEUSERA.md). */
  private geom() {
    const H = pantalla().alto;
    const k = Math.max(0, Math.min(1, (H - 384) / 136));
    const hud = 18;
    /** Pitch between the four rows: the sprites may overlap a little on short screens. */
    const P = Math.round(50 + k * 26);
    const y0 = hud + 4;
    const campo = y0 + 3 * P + 78;
    const lineas = H < 430 ? 2 : 3;
    const boxH = lineas === 2 ? 40 : 52;
    const yBox = campo + 4;
    const yMenu = yBox + boxH + 4;
    return { H, hud, P, y0, campo, lineas, boxH, yBox, yMenu, menuH: H - yMenu - 4 };
  }

  /** How many lines the text box holds on this screen. */
  private lineasCaja(): number {
    return pantalla().alto < 430 ? 2 : 3;
  }

  /** Top of player j's row (the row's sprite cell). */
  private yFila(j: number): number {
    const G = this.geom();
    if (j === this.yo) return G.y0 + 3 * G.P;
    return G.y0 + Math.max(0, this.rivales().indexOf(j)) * G.P;
  }

  /** The rectangle of player j's row (what the spotlight dims and frames). */
  private filaDe(j: number) {
    const G = this.geom();
    return { y: this.yFila(j) - 2, h: G.P, mia: j === this.yo };
  }

  /** The sprite image of j's active userito (front for rivals, back for me) with its idle frame. */
  private imagen(j: number, ahora: number): HTMLCanvasElement {
    const u = activo(this.disp, j);
    const fr = reposo(ahora, j * 330);
    return j === this.yo ? spriteEspalda2(u.especie, fr) : spriteFrente2(u.especie, fr);
  }

  /** Top-left corner of player j's sprite (every userito stands on the same line, 62 px under the row's top). */
  private posSprite(j: number) {
    const mia = j === this.yo;
    const u = activo(this.disp, j);
    const base = mia ? spriteEspalda2(u.especie, 0) : spriteFrente2(u.especie, 0);
    const top = this.yFila(j);
    return { x: mia ? 20 : 158, y: top + 62 - pieSprite(base), pies: top + 62 };
  }

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    if (!this.disp) return;
    const G = this.geom();
    dibujarFondoBar(ctx, G.campo);
    // A tap anywhere on the field moves the text on (registered first: the buttons above it win).
    if (this.modo === 'cola' || this.modo === 'espera') entrada.zona(0, G.hud, ANCHO, G.H - G.hud, () => this.caja.toque());
    // Rows.
    const riv = this.rivales();
    riv.forEach((j) => this.fila(ctx, j, ahora));
    this.fila(ctx, this.yo, ahora);
    this.dibujarFoco(ctx, ahora);
    this.dibujarOrdenGrande(ctx, G);
    this.dibujarFlotantes(ctx);
    // Bottom area.
    dibujarBandeja(ctx, G.campo, G.H);
    this.zonaInferior(ctx, G, ahora);
    this.hud(ctx, G, ahora);
  }

  private hud(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    barraArriba(ctx);
    menuIcono(ctx, 7, 5);
    const turno = t('batalla.turno', { n: this.turnoHud });
    texto2(ctx, turno, 28, 6);
    // HISTORIAL: a small button right after the turn.
    const hs = t('batalla.historial');
    const hx = 28 + anchoTexto2(turno) + 8;
    const hw = anchoTexto2(hs) + 10;
    relleno(ctx, TINTA2, hx, 2, hw, 14);
    relleno(ctx, '#f8edd2', hx + 1, 3, hw - 2, 12);
    rect(ctx, '#d6c08a', hx + 2, 13, hw - 4, 1);
    texto2(ctx, hs, hx + 5, 6, TINTA2, null);
    entrada.zona(hx - 2, 0, hw + 4, G.hud, () => void this.abrirHistorial());
    if (this.puedeVolver) {
      const vx = hx + hw + 8;
      flecha(ctx, vx, 5, -1, TINTA2);
      texto2(ctx, t('batalla.volver'), vx + 9, 6);
      entrada.zona(vx - 3, 0, 56, 19, () => this.accion('atras'));
    }
    if (this.plazoFin > 0) {
      const seg = Math.max(0, Math.ceil((this.plazoFin - Date.now()) / 1000));
      const rojo = seg <= 5;
      if (!rojo || parpadea(ahora, 400)) chipTiempo(ctx, String(seg), rojo);
    }
    this.ordenPequeno(ctx, G);
    entrada.zona(0, 0, 26, G.hud + 3, () => void this.pausar());
  }

  /** The turn's order as little player tiles in the top bar: done ones pale, the one acting framed. */
  private ordenPequeno(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const o = this.orden;
    if (!o || this.plazoFin > 0) return;
    const lado = 14;
    const x0 = ANCHO - 6 - o.lista.length * (lado + 3);
    o.lista.forEach((a, i) => {
      const x = x0 + i * (lado + 3);
      const y = Math.floor((G.hud - 1 - lado) / 2);
      const hecho = i < o.actual || o.actual >= o.lista.length;
      ctx.save();
      if (hecho) ctx.globalAlpha = 0.35;
      ficha(ctx, this.disp.jugadores[a.j].entrenador, x, y, lado);
      ctx.restore();
      if (i === o.actual) {
        rect(ctx, '#ffffff', x - 2, y - 2, lado + 4, 1);
        rect(ctx, '#ffffff', x - 2, y + lado + 1, lado + 4, 1);
        rect(ctx, '#ffffff', x - 2, y - 2, 1, lado + 4);
        rect(ctx, '#ffffff', x + lado + 1, y - 2, 1, lado + 4);
      }
    });
  }

  // ------------------------------------------------------------------ HISTORIAL

  /** The log flattened into drawable lines (with their y in the content), wrapped for a box `ancho` px wide. */
  private lineasHistorial(ancho: number): { lineas: { cab: boolean; s: string; y: number; alt: boolean }[]; total: number } {
    const lineas: { cab: boolean; s: string; y: number; alt: boolean }[] = [];
    let y = 0;
    let alt = false;
    for (const g of this.historial) {
      if (!g.lineas.length) continue;
      if (g.turno > 0) {
        lineas.push({ cab: true, s: t('batalla.turno', { n: g.turno }), y, alt: false });
        y += 15;
      }
      for (const l of g.lineas) {
        for (const w of envolver(l, ancho)) {
          lineas.push({ cab: false, s: w, y, alt });
          y += 12;
        }
        y += 3;
        alt = !alt;
      }
    }
    return { lineas, total: y };
  }

  /** A box with the whole battle so far by turns. Drag or arrows to scroll; a tap outside closes. */
  private abrirHistorial(): Promise<void> {
    sonido.efecto('aceptar');
    return sobre<void>(this, (cerrar) => {
      let scroll = Number.POSITIVE_INFINITY; // starts at the bottom: the latest
      let cache: { version: number } & ReturnType<VistaCombate['lineasHistorial']> | null = null;
      const PASO = 12;
      let x = 0;
      let y = 0;
      let w = 0;
      let h = 0;
      const datos = () => {
        if (!cache || cache.version !== this.versionHistorial) cache = { version: this.versionHistorial, ...this.lineasHistorial(w - 28) };
        return cache;
      };
      const visible = () => h - 30 - 8;
      const maxScroll = () => Math.max(0, datos().total - visible());
      const cierra = () => {
        sonido.efecto('atras');
        cerrar();
      };
      return {
        dibujar: (ctx) => {
          const H = pantalla().alto;
          x = 6;
          y = 22;
          w = ANCHO - 12;
          h = H - 22 - 8;
          oscurecer(ctx, H);
          entrada.zona(0, 0, ANCHO, H, cierra);
          entrada.zona(x, y, w, h, () => undefined);
          panelCacheado(ctx, x, y, w, h);
          const titulo = t('batalla.historial');
          texto2(ctx, titulo, x + 14, y + 11, TINTA_SUAVE);
          rect(ctx, '#d6c08a', x + 10, y + 23, w - 20, 1);
          const { lineas: ls, total } = datos();
          scroll = Math.max(0, Math.min(maxScroll(), scroll));
          const y0 = y + 28;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 6, y0, w - 12, visible());
          ctx.clip();
          for (const l of ls) {
            const yy = y0 + l.y - scroll;
            if (yy < y0 - PASO || yy > y0 + visible()) continue;
            if (l.cab) {
              rect(ctx, TINTA2, x + 10, yy - 1, w - 28, 12);
              texto2(ctx, l.s, x + 14, yy + 1, '#fdf0c0', null);
            } else texto2(ctx, l.s, x + 14, yy + 2, l.alt ? TINTA_SUAVE : TINTA2, null);
          }
          ctx.restore();
          // Scroll bar.
          if (total > visible()) {
            const bh = Math.max(10, Math.round((visible() * visible()) / total));
            const by = y0 + Math.round(((visible() - bh) * scroll) / Math.max(1, maxScroll()));
            rect(ctx, '#d6c08a', x + w - 11, y0, 3, visible());
            rect(ctx, TINTA2, x + w - 11, by, 3, bh);
          }
          if (!ls.length) texto2(ctx, '...', x + 14, y0 + 2, '#a898a8');
        },
        accion: (a) => {
          if (a === 'arriba') scroll -= PASO * 3;
          else if (a === 'abajo') scroll += PASO * 3;
          else if (a === 'izq') scroll -= visible();
          else if (a === 'der') scroll += visible();
          else cierra();
          scroll = Math.max(0, Math.min(maxScroll(), scroll));
        },
        arrastre: (_dx, dy) => {
          scroll = Math.max(0, Math.min(maxScroll(), scroll - dy));
        },
      };
    });
  }

  // ------------------------------------------------------------------ the spotlight

  private dibujarFoco(ctx: CanvasRenderingContext2D, ahora: number) {
    const f = this.foco;
    if (!f) return;
    const a = Math.min(1, (performance.now() - f.t0) / 180);
    const obj = f.objetivos.filter((j) => j !== f.actor);
    const colorActor = f.actor >= 0 ? colorEnt(this.disp.jugadores[f.actor].entrenador) : null;
    const filas = this.disp.jugadores.map((_, j) => j);
    // Dim the rows that have nothing to do with it.
    for (const j of filas) {
      if (j === f.actor || f.objetivos.includes(j)) continue;
      const { y, h } = this.filaDe(j);
      velo(ctx, 0, y, ANCHO, h, '#f0e2c0', 0.58 * a);
    }
    const marcoFila = (j: number, color: string, gruesor: number) => {
      const { y, h } = this.filaDe(j);
      rect(ctx, color, 0, y, ANCHO, gruesor);
      rect(ctx, color, 0, y + h - gruesor, ANCHO, gruesor);
      rect(ctx, color, 0, y, gruesor, h);
      rect(ctx, color, ANCHO - gruesor, y, gruesor, h);
    };
    // The actor: his colour, steady. The targets: pulsing.
    if (f.actor >= 0 && colorActor) marcoFila(f.actor, colorActor, 2);
    const pulso = Math.sin(ahora / 110) > 0;
    for (const j of obj) {
      const c = colorActor ?? colorEnt(this.disp.jugadores[j].entrenador);
      marcoFila(j, pulso ? c : TINTA2, 2);
    }
    // The pointer: a line down the right edge from the actor to each target, with arrowheads, and «A ▶ B» on the target.
    if (f.actor >= 0 && colorActor && obj.length) {
      const mitad = (j: number) => {
        const { y, h } = this.filaDe(j);
        return y + Math.floor(h / 2);
      };
      const x = ANCHO - 8;
      const y0 = mitad(f.actor);
      const ys = obj.map(mitad);
      const desde = Math.min(y0, ...ys);
      const hasta = Math.max(y0, ...ys);
      rect(ctx, TINTA2, x - 1, desde - 1, 5, hasta - desde + 2);
      rect(ctx, colorActor, x, desde, 3, hasta - desde);
      // Marching dashes.
      const fase = Math.floor(ahora / 90) % 6;
      for (let yy = desde + fase; yy < hasta; yy += 6) rect(ctx, '#fdf6e4', x + 1, yy, 1, 3);
      for (const yt of ys) {
        const abajo = yt > y0;
        for (let k = 0; k < 5; k++) {
          const w = 11 - k * 2;
          const yy = abajo ? yt - 2 - k : yt + 2 + k - 1;
          rect(ctx, TINTA2, x + 1 - Math.floor(w / 2) - 1, yy, w + 2, 1);
          rect(ctx, colorActor, x + 1 - Math.floor(w / 2), yy, w, 1);
        }
      }
      for (const j of obj) this.insigniaAB(ctx, f.actor, j);
    }
  }

  /** «A ▶ B» in the corner of the target's row: the attacker's face, an arrow, the target's face. */
  private insigniaAB(ctx: CanvasRenderingContext2D, a: number, b: number) {
    const { y, h } = this.filaDe(b);
    const lado = 18;
    const w = lado * 2 + 12;
    const x = 8;
    const yy = y + h - lado - 3;
    relleno(ctx, TINTA2, x - 2, yy - 2, w + 4, lado + 4);
    relleno(ctx, '#fdf6e4', x - 1, yy - 1, w + 2, lado + 2);
    ficha(ctx, this.disp.jugadores[a].entrenador, x, yy, lado);
    flecha(ctx, x + lado + 3, yy + 5, 1, colorEnt(this.disp.jugadores[a].entrenador));
    ficha(ctx, this.disp.jugadores[b].entrenador, x + lado + 12, yy, lado);
  }

  // ---- the big «ORDEN DEL TURNO» strip

  private dibujarOrdenGrande(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const o = this.orden;
    if (!o || this.ordenHasta === 0) return;
    const ahora = performance.now();
    if (ahora > this.ordenHasta) return;
    const n = o.lista.length;
    const x = 4;
    const w = ANCHO - 8;
    const h = 70;
    const y = G.hud + 4;
    panelCacheado(ctx, x, y, w, h);
    const titulo = t('batalla.orden');
    texto2(ctx, titulo, Math.floor((ANCHO - anchoTexto2(titulo)) / 2), y + 9, TINTA_SUAVE);
    const cw = Math.floor((w - 8) / n);
    o.lista.forEach((a, i) => {
      const cx = x + 4 + i * cw;
      const cy = y + 20;
      const jug = this.disp.jugadores[a.j];
      // The userito, the player tile, the place in the order and the name.
      ctx.drawImage(miniatura(a.especie), cx + 1, cy);
      ficha(ctx, jug.entrenador, cx + cw - 20, cy, 18);
      relleno(ctx, TINTA2, cx, cy, 10, 12);
      texto2(ctx, String(i + 1), cx + 3, cy + 2, '#fdf0c0', null);
      texto2(ctx, recortar(ESPECIE[a.especie].nombre, cw - 3), cx + 1, cy + 36, TINTA2, null);
    });
  }

  // ---- floating numbers and tags

  private dibujarFlotantes(ctx: CanvasRenderingContext2D) {
    const ahora = performance.now();
    this.flotantes = this.flotantes.filter((f) => ahora - f.t0 < f.dur);
    for (const f of this.flotantes) {
      const p = (ahora - f.t0) / f.dur;
      const sp = this.posSprite(f.j);
      const alfa = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alfa);
      if (f.tipo === 'num') {
        const w = anchoTexto2(f.s) * 2;
        // A little jump up, then it floats.
        const sube = Math.round(Math.min(1, p * 4) * 14 + p * 6);
        const x = Math.max(2, Math.min(ANCHO - w - 2, sp.x + Math.floor((LADO - w) / 2)));
        const y = sp.y + 22 - sube;
        textoGrande(ctx, f.s, x, y, f.color, 2, TINTA2);
      } else {
        const w = anchoTexto2(f.s);
        const x = Math.max(2, Math.min(ANCHO - w - 2, sp.x + Math.floor((LADO - w) / 2)));
        const y = sp.pies - 18 - f.hueco * 12;
        conContorno(ctx, f.s, x, y, f.color);
      }
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ rows

  /** The panel plate of a row (frame, band with the trainer's initial, trainer name), baked once per seat. */
  private placa(asiento: number, nombre: string, mia: boolean): HTMLCanvasElement {
    const w = mia ? 134 : 128;
    const h = mia ? 52 : 40;
    const ini = (nombre[0] ?? '?').toUpperCase();
    return hornear(`placa|${mia ? 1 : 0}|${asiento}|${nombre}`, w, h + 2, (cx) => {
      panel(cx, 0, 0, w, h);
      bandaEntrenador(cx, 4, 4, h - 8, asiento, ini);
      texto2(cx, nombre.toUpperCase(), 18, 30, JUGADORES2[asiento].oscuro, SOMBRA_TEXTO);
    });
  }

  private fila(ctx: CanvasRenderingContext2D, j: number, ahora: number) {
    const G = this.geom();
    const q = this.disp.jugadores[j];
    const mia = j === this.yo;
    const f = this.fx[j];
    const u = activo(this.disp, j);
    const col = colorEnt(q.entrenador);
    const asiento = Math.max(0, ENTRENADORES.indexOf(q.entrenador));
    const top = this.yFila(j);
    const { x: sx, y: sy, pies } = this.posSprite(j);
    // The beer-mat platform under the sprite.
    const mat = mia ? plataformaCacheada(42, 10) : plataformaCacheada(30, 7);
    const cxm = mia ? 52 : 190;
    ctx.drawImage(mat, cxm - Math.floor(mat.width / 2), pies - 3 - (mia ? 14 : 10));
    if (!f.oculto && (!q.puesto || f.caida > 0)) this.sprite(ctx, j, sx, sy, pies, mia, ahora);
    // Panel.
    const w = mia ? 134 : 128;
    const px = mia ? 102 : 6;
    const py = top + (mia ? 8 : Math.max(4, Math.min(11, G.P - 41)));
    const h = mia ? 52 : 40;
    ctx.drawImage(this.placa(asiento, q.nombre, mia), px, py);
    const sp = ESPECIE[u.especie];
    texto2(ctx, sp.nombre, px + 18, py + 7);
    const nv = t('batalla.nivel');
    const nx = px + w - 8 - anchoTexto2(nv);
    if (px + 18 + anchoTexto2(sp.nombre) < nx - 4) texto2(ctx, nv, nx, py + 7, TINTA_SUAVE);
    barraPS2(ctx, px + 17, py + 18, w - 17 - 9, f.ps / u.psMax);
    // Pips: the jars still standing.
    const vivos = q.equipo.filter((e) => e.ps > 0).length;
    // Status tags: next to the trainer's name.
    const ey = py + (mia ? 29 : 29);
    let ex = px + 18 + anchoTexto2(q.nombre.toUpperCase()) + 6;
    if (mia) {
      const nums = `${Math.ceil(f.ps)}/${u.psMax}`;
      texto2(ctx, nums, px + w - 8 - anchoTexto2(nums), py + 30);
      for (let i = 0; i < 3; i++) pip(ctx, px + 18 + i * 9, py + 40, i < vivos, JUGADORES2[asiento].base);
      ex = px + 18 + 3 * 9 + 6;
      if (u.estado) ex += etiquetaEstado(ctx, u.estado, ex, py + 39) + 2;
      if (u.achispado > 0) etiquetaEstado(ctx, 'achispado', ex, py + 39);
    } else {
      for (let i = 0; i < 3; i++) pip(ctx, px + w - 8 - 3 * 9 + i * 9 + 1, py + 29, i < vivos, JUGADORES2[asiento].base);
      const lim = px + w - 8 - 27 - 3;
      if (u.estado && ex + anchoTexto2(t(`estado.${u.estado}`)) + 6 < lim) ex += etiquetaEstado(ctx, u.estado, ex, ey - 1) + 2;
      if (u.achispado > 0 && ex + anchoTexto2(t('estado.achispado')) + 6 < lim) etiquetaEstado(ctx, 'achispado', ex, ey - 1);
    }
    // Eliminated: greyed with the place.
    const filaR = this.filaDe(j);
    if (f.velo > 0) {
      velo(ctx, 0, filaR.y, ANCHO, filaR.h, '#f0e2c0', 0.62 * f.velo);
      if (q.puesto > 0) {
        ctx.save();
        ctx.globalAlpha = f.velo;
        const s = `${q.puesto}.º`;
        const tw = anchoTexto2(s) * 3;
        textoGrande(ctx, s, mia ? 52 - Math.floor(tw / 2) : 190 - Math.floor(tw / 2), top + 20, '#fff6e0', 3, TINTA2);
        ctx.restore();
      }
    }
    // Target selection: the rival rows light up.
    const objetivo = (this.modo === 'objetivo' || this.modo === 'gradaObj') && this.objetivosPosibles.includes(j);
    if (objetivo) {
      const marcado = this.objetivosPosibles[this.sel] === j;
      const c = parpadea(ahora, marcado ? 260 : 600) || !marcado ? col : TINTA2;
      const { y, h: hr } = filaR;
      rect(ctx, c, 0, y, ANCHO, 3);
      rect(ctx, c, 0, y + hr - 3, ANCHO, 3);
      rect(ctx, c, 0, y, 3, hr);
      rect(ctx, c, ANCHO - 3, y, 3, hr);
      entrada.zona(0, y, ANCHO, hr, () => {
        this.sel = this.objetivosPosibles.indexOf(j);
        this.elegirObjetivo(j);
      });
    }
    void h;
  }

  private sprite(ctx: CanvasRenderingContext2D, j: number, x: number, y: number, pies: number, mia: boolean, ahora: number) {
    const f = this.fx[j];
    const img = this.imagen(j, ahora);
    if (f.parpadeo > 0 && Math.floor(f.parpadeo / 80) % 2 === 0) return;
    const dx = x + f.salto;
    if (f.chapa >= 0 && f.alza < 1) {
      // Rising out of the cap, bottom first.
      const alto = Math.max(1, Math.round(LADO * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, LADO - alto, LADO, alto, dx, y + LADO - alto, LADO, alto);
      const p = f.chapa;
      const cx = dx + 22;
      const cy = Math.round(pies - 20 - Math.max(0, p - 0.4) * 60);
      if (p < 0.8) {
        ctx.drawImage(chapaImg(), cx, cy);
        if (p < 0.4) {
          ctx.save();
          ctx.globalAlpha = 0.8 * (1 - p / 0.4);
          rect(ctx, '#ffffff', dx + 6, y + 14, 52, 46);
          ctx.restore();
        }
      }
      return;
    }
    if (f.alza < 1) {
      const alto = Math.max(1, Math.round(LADO * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, LADO - alto, LADO, alto, dx, y + LADO - alto, LADO, alto);
      return;
    }
    if (f.caida > 0) {
      const d = Math.round(LADO * f.caida);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 14, y - 6, 92, pies + 4 - (y - 6));
      ctx.clip();
      ctx.drawImage(img, dx, y + d);
      ctx.restore();
      return;
    }
    void mia;
    ctx.drawImage(img, dx, y);
  }

  // ------------------------------------------------------------------ bottom area

  private zonaInferior(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    const esMenu = this.modo !== 'cola' && this.modo !== 'espera';
    if (!esMenu) {
      // The text box, and under it the last lines of the battle log.
      this.caja.dibujar(ctx, 4, G.yBox, ANCHO - 8, G.boxH, ahora);
      this.registro(ctx, G);
      return;
    }
    switch (this.modo) {
      case 'accion':
        this.menuAccion(ctx, G);
        break;
      case 'movs':
        this.menuMovs(ctx, G);
        break;
      case 'equipo':
        this.menuEquipo(ctx, G);
        break;
      case 'objetivo':
      case 'gradaObj':
        this.menuVolver(ctx, G);
        break;
      case 'grada':
        this.menuGrada(ctx, G);
        break;
      default:
        break;
    }
  }

  /** What came before: the latest lines of the log (not the one being written) under the text box. */
  private registro(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const h = G.menuH;
    panelCacheado(ctx, 4, G.yMenu, ANCHO - 8, h);
    const todas: string[] = [];
    this.historial.forEach((g, gi) => {
      g.lineas.forEach((l, li) => {
        const esUltima = gi === this.historial.length - 1 && li === g.lineas.length - 1;
        if (esUltima && this.caja.ocupada) return;
        for (const w of envolver(l, 206)) todas.push(w);
      });
    });
    const n = Math.max(0, Math.floor((h - 14) / 12));
    const ult = todas.slice(-n);
    ult.forEach((l, i) => {
      const edad = ult.length - 1 - i;
      texto2(ctx, l, 14, G.yMenu + 9 + (n - ult.length + i) * 12, edad === 0 ? TINTA2 : edad === 1 ? TINTA_SUAVE : '#a898a8', null);
    });
  }

  /** The tray's geometry for a menu of `n` rows: the panel sits at the bottom and the text box takes what is left above it. */
  private bandeja(G: ReturnType<VistaCombate['geom']>, n: number) {
    const rowH = Math.min(31, Math.floor((G.menuH - 8) / n));
    const hP = rowH * n + 8;
    const yP = G.H - 4 - hP;
    return { rowH, yP, hP, boxH: yP - 4 - G.yBox };
  }

  /** A fixed (non-typewriter) text in the box slot. */
  private cajaFija(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, boxH: number, s: string) {
    panelCacheado(ctx, 4, G.yBox, ANCHO - 8, boxH);
    const ls = envolver(s, 206).slice(0, 3);
    const bloque = (ls.length - 1) * 13 + 9;
    const y0 = G.yBox + 3 + Math.floor((boxH - 8 - bloque) / 2) + 1;
    ls.forEach((l, i) => texto2(ctx, l, 15, y0 + i * 13));
  }

  /** The menu panel of `n` rows with its text box above: returns the rows' geometry. */
  private panelMenu(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, n: number, texto: string) {
    const B = this.bandeja(G, n);
    this.cajaFija(ctx, G, B.boxH, texto);
    panelCacheado(ctx, 4, B.yP, ANCHO - 8, B.hP);
    return { rowH: B.rowH, y: B.yP + 4 };
  }

  private menuVolver(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const { rowH, y } = this.panelMenu(ctx, G, 1, `${t('batalla.objetivo')} ${t('batalla.objetivo2')}`);
    filaMenu(ctx, 10, y, ANCHO - 20, rowH, t('batalla.volver'), null, true);
    entrada.zona(8, y, ANCHO - 16, rowH, () => this.accion('atras'));
  }

  private fil(x: number, y: number, w: number, h: number, fn: () => void) {
    entrada.zona(x, y, w, h, fn);
  }

  private menuAccion(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const q = this.real.jugadores[this.yo];
    const u = activo(this.real, this.yo);
    const { rowH, y: y0 } = this.panelMenu(ctx, G, 3, t('batalla.que_hara', { quien: ESPECIE[u.especie].nombre }));
    const ok = [true, puedeCambiar(this.real, this.yo), q.cana];
    const iconos = ['luchar', 'userito', 'cana'] as const;
    ['luchar', 'userito', 'cana'].forEach((k, i) => {
      const y = y0 + i * rowH;
      filaMenu(ctx, 10, y, ANCHO - 20, rowH, t(`batalla.${k}`), iconos[i], this.sel === i, ok[i]);
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.accionPrincipal(i);
      });
    });
  }

  private menuMovs(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const u = activo(this.real, this.yo);
    const sp = ESPECIE[u.especie];
    const libres = movsDisponibles(this.real, this.yo);
    const desesperada = !libres.some(Boolean);
    const ids = desesperada ? [DESESPERADA] : sp.movs;
    if (this.selMov >= ids.length) this.selMov = 0;
    const { rowH, y: y0 } = this.panelMenu(ctx, G, ids.length, t(`mov.${ids[this.selMov]}.desc`));
    ids.forEach((id, i) => {
      const m = MOVS[id];
      const y = y0 + i * rowH;
      const pp = desesperada ? null : u.pp[i];
      const sinPP = pp !== null && pp <= 0;
      const alto = rowH - 6;
      const activa = this.selMov === i;
      if (activa) realce(ctx, 10, y, ANCHO - 20, alto);
      const ty = y + Math.floor((alto - 7) / 2) + 1;
      // The type badge, the name and the PP.
      ctx.save();
      if (sinPP) ctx.globalAlpha = 0.45;
      insignaTipo(ctx, m.tipo, 28, y + Math.floor((alto - 11) / 2), 62);
      ctx.restore();
      texto2(ctx, m.nombre, 98, ty, sinPP ? '#a898a8' : TINTA2, activa ? '#f0c860' : sinPP ? null : SOMBRA_TEXTO);
      if (pp !== null) {
        const s = `${pp}/${m.pp}`;
        texto2(ctx, s, ANCHO - 20 - anchoTexto2(s), ty, sinPP ? '#d4382c' : TINTA_SUAVE, null);
      }
      this.fil(8, y, ANCHO - 16, rowH, () => {
        if (this.selMov === i) this.elegirMovimiento(i);
        else {
          this.selMov = i;
          sonido.efecto('cursor');
        }
      });
    });
  }

  private menuEquipo(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const q = this.real.jugadores[this.yo];
    const { rowH, y: y0 } = this.panelMenu(ctx, G, q.equipo.length, t(this.reemplazo ? 'batalla.quien_sale' : 'batalla.equipo'));
    q.equipo.forEach((u, i) => {
      const y = y0 + i * rowH;
      const alto = rowH - 6;
      const vivo = u.ps > 0;
      const activoAhora = i === q.activo && !this.reemplazo;
      const sp = ESPECIE[u.especie];
      const ocioso = !vivo || activoAhora;
      if (this.sel === i) realce(ctx, 10, y, ANCHO - 20, alto);
      ctx.save();
      if (ocioso) ctx.globalAlpha = 0.45;
      // The thumbnail, cropped to the row when the row is shorter than 32 px.
      const mh = Math.min(32, alto - 2);
      ctx.drawImage(miniatura(u.especie), 0, Math.floor((32 - mh) / 2) - 1 > 0 ? Math.floor((32 - mh) / 2) - 1 : 0, 32, mh, 22, y + Math.floor((alto - mh) / 2), 32, mh);
      ctx.restore();
      const col = ocioso ? '#a898a8' : TINTA2;
      if (alto >= 24) {
        texto2(ctx, sp.nombre, 60, y + 3, col, null);
        barraPS2(ctx, 60, y + alto - 11, 100, u.ps / u.psMax);
        const nums = `${u.ps}/${u.psMax}`;
        texto2(ctx, nums, 168, y + alto - 10, ocioso ? '#a898a8' : TINTA_SUAVE, null);
        if (activoAhora) texto2(ctx, t('batalla.en_combate'), ANCHO - 20 - anchoTexto2(t('batalla.en_combate')), y + 3, TINTA_SUAVE, null);
        else if (u.estado) etiquetaEstado(ctx, u.estado, ANCHO - 20 - 28, y + 1);
      } else {
        texto2(ctx, sp.nombre, 60, y + Math.floor((alto - 7) / 2) + 1, col, null);
        barraPS2(ctx, 128, y + Math.floor((alto - 9) / 2), 56, u.ps / u.psMax);
        if (activoAhora) texto2(ctx, t('batalla.en_combate'), 190, y + Math.floor((alto - 7) / 2) + 1, TINTA_SUAVE, null);
      }
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.elegirEquipo(i);
      });
    });
  }

  private menuGrada(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const { rowH, y: y0 } = this.panelMenu(ctx, G, 3, t('batalla.grada'));
    const hay = enGrada(this.real, this.yo);
    ['grada_cana', 'grada_abucheo', 'grada_nada'].forEach((k, i) => {
      const y = y0 + i * rowH;
      filaMenu(ctx, 10, y, ANCHO - 20, rowH, t(`batalla.${k}`), null, this.sel === i, !(i < 2 && !hay));
      this.fil(8, y, ANCHO - 16, rowH, () => {
        this.sel = i;
        this.accionGrada(i);
      });
    });
  }
}
