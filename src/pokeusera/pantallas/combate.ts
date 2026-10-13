// PokéUsera · the battle screen. Three rival rows on top (info panel left, front sprite right),
// your row below (back sprite left, panel right with HP numbers), then the text box / menus.
// It draws and plays only what it is told:
//   alInicio(estado)            the teams come out
//   pedirEleccion(j, estado, ms) / pedirReemplazo(j, estado, ms)   the local player decides (promises)
//   alTurno(eventos, estado) / alReemplazo(eventos, estado)       play the events, then adopt `estado`
// so a guest can drive it from network messages exactly like the host does from Partida.
import type { Eleccion, EstadoCombate, Evento, Userito } from '../tipos';
import { ESPECIE, MOVS, DESESPERADA } from '../datos';
import { activo, eliminado, enGrada, movsDisponibles, necesitaObjetivo, puedeCambiar, rivalesEnPie, vivos } from '../motor/combate';
import { anchoMini, anchoTexto, dibujarMini, dibujarTexto, envolver } from '../arte/fuente';
import { barraPS, cursor, marco } from '../arte/marcos';
import { CLARO, COLOR_TIPO, FONDO, NEGRO, OSCURO, PAPEL, PS_ROJO, PS_VERDE, SUELO } from '../arte/paleta';
import { icono, spriteEspalda, spriteFrente } from '../arte/sprites';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { CajaTexto } from './caja';
import { menuPausa } from './ajustes';
import { sobre } from './modal';
import { Animador, cfg, colorEnt, dormir, etiquetaEstado, ficha, flecha, menuIcono, mover, ordinal, parpadea, rect, ritmo, t, velo } from './ui';

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

/** Side of the userito sprites (the art decides; the layout derives from it). */
const LADO = 32;

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

// The bottle cap (12×12), baked once.
let capsula: HTMLCanvasElement | null = null;
function chapaImg(): HTMLCanvasElement {
  if (capsula) return capsula;
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const x = c.getContext('2d')!;
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const dx = i - 5.5;
      const dy = j - 5.5;
      const r = Math.hypot(dx, dy);
      if (r > 5.9) continue;
      const ang = Math.atan2(dy, dx);
      const diente = r > 4.9 && Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 12) % 2 === 0;
      if (diente) continue;
      x.fillStyle = r > 4.7 ? '#6a4a14' : r > 3.2 ? '#e0a520' : '#f6cf5a';
      if (r <= 3.2 && dx + dy < -2) x.fillStyle = '#fff2b0';
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
  private caja = new CajaTexto(Math.floor((ANCHO - 24) / 8));
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
          if (!this.caja.cabe(junto, 3)) break;
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
        this.flota(ev.j, t('batalla.tag.noafecta'), '#c4b48c', 'tag');
        break;
      case 'combate.esconde_protege':
        this.flota(ev.j, t('batalla.tag.escondido'), '#c4b48c', 'tag');
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
          if (ev.critico) this.flota(ev.j, t('batalla.tag.critico'), '#ffd23a', 'tag');
          if (ev.ef > 1) this.flota(ev.j, t('batalla.tag.muy'), '#ffd23a', 'tag');
          else if (ev.ef < 1 && ev.ef > 0) this.flota(ev.j, t('batalla.tag.poco'), '#c4b48c', 'tag');
        }
        tareas.push(this.barra(ev.j, ev.ps));
        break;
      }
      case 'falla':
        sonido.efecto('falla');
        this.flota(ev.j, t(ev.clave === 'combate.esquiva' ? 'batalla.tag.esquiva' : 'batalla.tag.falla'), '#c4b48c', 'tag');
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
    return this.anim.animar(300, (p) => (this.fx[j].salto = dir * Math.round(Math.sin(p * Math.PI) * 5)));
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

  private geom() {
    const H = pantalla().alto;
    const extra = Math.max(0, H - 256);
    const hud = 15;
    // The spare height of a tall phone goes to the rows, so the text box and the menus keep about the same size.
    const rivH = 34 + Math.floor(extra * 0.2);
    const meH = 42 + Math.floor(extra * 0.2);
    const yMe = hud + 3 * rivH;
    const yMenu = yMe + meH;
    return { H, hud, rivH, meH, yMe, yMenu, menuH: H - yMenu };
  }

  /** Where player j's row is. */
  private filaDe(j: number) {
    const G = this.geom();
    if (j === this.yo) return { y: G.yMe, h: G.meH, mia: true };
    const i = this.rivales().indexOf(j);
    return { y: G.hud + Math.max(0, i) * G.rivH, h: G.rivH, mia: false };
  }

  /** Top-left corner of player j's sprite. */
  private posSprite(j: number) {
    const { y, h, mia } = this.filaDe(j);
    return { x: mia ? 3 : ANCHO - LADO - 3, y: y + Math.floor((h - LADO) / 2) + (mia ? 3 : 0) };
  }

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    if (!this.disp) return;
    const G = this.geom();
    rect(ctx, FONDO, 0, 0, ANCHO, G.H);
    // A tap anywhere on the field moves the text on (registered first: the buttons above it win).
    if (this.modo === 'cola' || this.modo === 'espera') entrada.zona(0, G.hud, ANCHO, G.H - G.hud, () => this.caja.toque());
    // Rows.
    const riv = this.rivales();
    riv.forEach((j, i) => this.fila(ctx, j, G.hud + i * G.rivH, G.rivH, false, ahora));
    this.fila(ctx, this.yo, G.yMe, G.meH, true, ahora);
    this.dibujarFoco(ctx, ahora);
    this.dibujarOrdenGrande(ctx, G, ahora);
    this.dibujarFlotantes(ctx, ahora);
    // Bottom area.
    this.zonaInferior(ctx, G, ahora);
    this.hud(ctx, G, ahora);
  }

  private hud(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    rect(ctx, PAPEL, 0, 0, ANCHO, G.hud - 1);
    rect(ctx, NEGRO, 0, G.hud - 1, ANCHO, 1);
    menuIcono(ctx, 4, 3);
    const turno = t('batalla.turno', { n: this.turnoHud });
    dibujarMini(ctx, turno, 20, 4, NEGRO);
    // HISTORIAL: a small button right after the turn.
    const hs = t('batalla.historial');
    const hx = 20 + anchoMini(turno) + 6;
    const hw = anchoMini(hs) + 7;
    marco(ctx, hx, 1, hw, G.hud - 3);
    dibujarMini(ctx, hs, hx + 4, 4, NEGRO);
    entrada.zona(hx - 2, 0, hw + 4, G.hud, () => void this.abrirHistorial());
    if (this.puedeVolver) {
      const vx = hx + hw + 5;
      flecha(ctx, vx, 3, -1, NEGRO);
      dibujarMini(ctx, t('batalla.volver'), vx + 8, 4, NEGRO);
      entrada.zona(vx - 2, 0, 40, 18, () => this.accion('atras'));
    }
    if (this.plazoFin > 0) {
      const seg = Math.max(0, Math.ceil((this.plazoFin - Date.now()) / 1000));
      const s = String(seg);
      const rojo = seg <= 5;
      if (!rojo || parpadea(ahora, 400)) dibujarTexto(ctx, s, ANCHO - 3 - s.length * 8, 3, rojo ? PS_ROJO : NEGRO);
    }
    this.ordenPequeno(ctx, G);
    entrada.zona(0, 0, 18, G.hud + 3, () => void this.pausar());
  }

  /** The turn's order as little player tiles in the top bar: done ones pale, the one acting framed. */
  private ordenPequeno(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>) {
    const o = this.orden;
    if (!o || this.plazoFin > 0) return;
    const lado = 10;
    const x0 = ANCHO - 3 - o.lista.length * (lado + 2);
    o.lista.forEach((a, i) => {
      const x = x0 + i * (lado + 2);
      const y = Math.floor((G.hud - 1 - lado) / 2);
      const hecho = i < o.actual || o.actual >= o.lista.length;
      ctx.save();
      if (hecho) ctx.globalAlpha = 0.35;
      ficha(ctx, this.disp.jugadores[a.j].entrenador, x, y, lado);
      ctx.restore();
      if (i === o.actual) {
        rect(ctx, NEGRO, x - 1, y - 1, lado + 2, 1);
        rect(ctx, NEGRO, x - 1, y + lado, lado + 2, 1);
        rect(ctx, NEGRO, x - 1, y - 1, 1, lado + 2);
        rect(ctx, NEGRO, x + lado, y - 1, 1, lado + 2);
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
        y += 12;
      }
      for (const l of g.lineas) {
        for (const w of envolver(l, ancho)) {
          lineas.push({ cab: false, s: w, y, alt });
          y += 10;
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
      const PASO = 10;
      let x = 0;
      let y = 0;
      let w = 0;
      let h = 0;
      const datos = () => {
        if (!cache || cache.version !== this.versionHistorial) cache = { version: this.versionHistorial, ...this.lineasHistorial(w - 18) };
        return cache;
      };
      const visible = () => h - 22 - 6;
      const maxScroll = () => Math.max(0, datos().total - visible());
      const cierra = () => {
        sonido.efecto('atras');
        cerrar();
      };
      return {
        dibujar: (ctx) => {
          const H = pantalla().alto;
          x = 4;
          y = 18;
          w = ANCHO - 8;
          h = H - 18 - 8;
          ctx.fillStyle = 'rgba(34,26,20,0.55)';
          ctx.fillRect(0, 0, ANCHO, H);
          entrada.zona(0, 0, ANCHO, H, cierra);
          entrada.zona(x, y, w, h, () => undefined);
          marco(ctx, x, y, w, h);
          const titulo = t('batalla.historial');
          dibujarTexto(ctx, titulo, x + 8, y + 7, OSCURO);
          rect(ctx, CLARO, x + 6, y + 18, w - 12, 1);
          const { lineas: ls, total } = datos();
          scroll = Math.max(0, Math.min(maxScroll(), scroll));
          const y0 = y + 22;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + 4, y0, w - 8, visible());
          ctx.clip();
          for (const l of ls) {
            const yy = y0 + l.y - scroll;
            if (yy < y0 - PASO || yy > y0 + visible()) continue;
            if (l.cab) {
              rect(ctx, OSCURO, x + 6, yy, w - 12 - 6, 9);
              dibujarMini(ctx, l.s, x + 9, yy + 2, PAPEL);
            } else dibujarTexto(ctx, l.s, x + 9, yy + 1, l.alt ? OSCURO : NEGRO);
          }
          ctx.restore();
          // Scroll bar.
          if (total > visible()) {
            const bh = Math.max(8, Math.round((visible() * visible()) / total));
            const by = y0 + Math.round(((visible() - bh) * scroll) / Math.max(1, maxScroll()));
            rect(ctx, CLARO, x + w - 8, y0, 2, visible());
            rect(ctx, OSCURO, x + w - 8, by, 2, bh);
          }
          if (!ls.length) dibujarTexto(ctx, '...', x + 9, y0 + 2, CLARO);
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
      velo(ctx, 0, y, ANCHO, h, PAPEL, 0.58 * a);
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
      marcoFila(j, pulso ? c : NEGRO, 2);
    }
    // The pointer: a line down the right edge from the actor to each target, with arrowheads, and «A ▶ B» on the target.
    if (f.actor >= 0 && colorActor && obj.length) {
      const mitad = (j: number) => {
        const { y, h } = this.filaDe(j);
        return y + Math.floor(h / 2);
      };
      const x = ANCHO - 4;
      const y0 = mitad(f.actor);
      const ys = obj.map(mitad);
      const desde = Math.min(y0, ...ys);
      const hasta = Math.max(y0, ...ys);
      rect(ctx, NEGRO, x - 1, desde - 1, 4, hasta - desde + 2);
      rect(ctx, colorActor, x, desde, 2, hasta - desde);
      // Marching dashes.
      const fase = Math.floor(ahora / 90) % 6;
      for (let yy = desde + fase; yy < hasta; yy += 6) rect(ctx, PAPEL, x, yy, 2, 2);
      for (const yt of ys) {
        const abajo = yt > y0;
        for (let k = 0; k < 4; k++) {
          const w = 8 - k * 2;
          const yy = abajo ? yt - 2 - k : yt + 2 + k - 1;
          rect(ctx, NEGRO, x + 1 - Math.floor(w / 2) - 1, yy, w + 2, 1);
          rect(ctx, colorActor, x + 1 - Math.floor(w / 2), yy, w, 1);
        }
      }
      for (const j of obj) this.insigniaAB(ctx, f.actor, j);
    }
  }

  /** «A ▶ B» in the corner of the target's row: the attacker's face, an arrow, the target's face. */
  private insigniaAB(ctx: CanvasRenderingContext2D, a: number, b: number) {
    const { y, h, mia } = this.filaDe(b);
    const lado = 10;
    const w = lado * 2 + 8;
    const pw = mia ? ANCHO - (LADO + 4) - 2 : ANCHO - LADO - 8;
    const px = mia ? LADO + 4 : 1;
    const x = px + pw - 5 - w;
    const yy = y + h - 1 - 3 - lado;
    rect(ctx, PAPEL, x - 1, yy - 1, w + 2, lado + 2);
    ficha(ctx, this.disp.jugadores[a].entrenador, x, yy, lado);
    flecha(ctx, x + lado + 1, yy + 1, 1, colorEnt(this.disp.jugadores[a].entrenador));
    ficha(ctx, this.disp.jugadores[b].entrenador, x + lado + 8, yy, lado);
  }

  // ---- the big «ORDEN DEL TURNO» strip

  private dibujarOrdenGrande(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, _ahora: number) {
    const o = this.orden;
    if (!o || this.ordenHasta === 0) return;
    const ahora = performance.now();
    if (ahora > this.ordenHasta) return;
    const n = o.lista.length;
    const x = 4;
    const w = ANCHO - 8;
    const h = 46;
    const y = G.hud + 4;
    marco(ctx, x, y, w, h);
    const titulo = t('batalla.orden');
    dibujarMini(ctx, titulo, Math.floor((ANCHO - anchoMini(titulo)) / 2), y + 5, OSCURO);
    const cw = Math.floor((w - 8) / n);
    o.lista.forEach((a, i) => {
      const cx = x + 4 + i * cw;
      const cy = y + 13;
      const jug = this.disp.jugadores[a.j];
      // The userito, the player tile with its place in the order, and the name.
      ctx.drawImage(spriteFrente(a.especie), 0, 0, LADO, LADO, cx + 1, cy, 16, 16);
      ficha(ctx, jug.entrenador, cx + 19, cy, 10);
      dibujarMini(ctx, String(i + 1), cx + 31 > cx + cw - 5 ? cx + 19 + 11 : cx + 31, cy + 3, NEGRO);
      const nombre = this.recortarMini(ESPECIE[a.especie].nombre, cw - 3);
      dibujarMini(ctx, nombre, cx + 1, cy + 19, NEGRO);
    });
  }

  /** `s` cut so that it fits `ancho` px in the tiny font. */
  private recortarMini(s: string, ancho: number): string {
    const chars = Array.from(s);
    while (chars.length > 1 && anchoMini(chars.join('')) > ancho) chars.pop();
    return chars.join('');
  }

  // ---- floating numbers and tags

  private dibujarFlotantes(ctx: CanvasRenderingContext2D, _ahora: number) {
    const ahora = performance.now();
    this.flotantes = this.flotantes.filter((f) => ahora - f.t0 < f.dur);
    for (const f of this.flotantes) {
      const p = (ahora - f.t0) / f.dur;
      const sp = this.posSprite(f.j);
      const alfa = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alfa);
      if (f.tipo === 'num') {
        const w = anchoTexto(f.s);
        // A little jump up, then it floats.
        const sube = Math.round(Math.min(1, p * 4) * 10 + p * 4);
        const x = Math.max(2, Math.min(ANCHO - w - 2, sp.x + Math.floor((LADO - w) / 2)));
        const y = sp.y + 10 - sube;
        this.contorno(ctx, f.s, x, y, f.color, false);
      } else {
        const w = anchoMini(f.s);
        const x = Math.max(2, Math.min(ANCHO - w - 2, sp.x + Math.floor((LADO - w) / 2)));
        const y = sp.y + LADO - 9 - f.hueco * 8;
        this.contorno(ctx, f.s, x, y, f.color, true);
      }
      ctx.restore();
    }
  }

  /** Text with a dark outline so it reads over anything. */
  private contorno(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, mini: boolean) {
    const dib = mini ? dibujarMini : dibujarTexto;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) dib(ctx, s, x + dx, y + dy, NEGRO);
    dib(ctx, s, x, y, color);
  }

  // ------------------------------------------------------------------ rows

  private fila(ctx: CanvasRenderingContext2D, j: number, y: number, h: number, mia: boolean, ahora: number) {
    const q = this.disp.jugadores[j];
    const f = this.fx[j];
    const u = activo(this.disp, j);
    const col = colorEnt(q.entrenador);
    const { x: sx, y: sy } = this.posSprite(j);
    // Ground under the sprite.
    rect(ctx, SUELO, sx + 4, sy + 27, 24, 3);
    rect(ctx, SUELO, sx + 1, sy + 28, 30, 2);
    if (!f.oculto && !q.puesto) this.sprite(ctx, j, sx, sy, mia);
    else if (!f.oculto && f.caida > 0) this.sprite(ctx, j, sx, sy, mia);
    // Panel.
    const px = mia ? LADO + 4 : 1;
    const pw = mia ? ANCHO - px - 2 : ANCHO - LADO - 8;
    const py = y + 1;
    const ph = h - 2;
    marco(ctx, px, py, pw, ph);
    const tx = px + 15;
    rect(ctx, col, px + 4, py + 4, 8, ph - 8);
    ctx.drawImage(icono(q.entrenador), px + 4, py + 4);
    // The content is centred in the panel when the row is taller than the base (tall phones).
    const c = py + Math.max(0, Math.floor((ph - (mia ? 40 : 32)) / 2));
    const sp = ESPECIE[u.especie];
    dibujarTexto(ctx, sp.nombre, tx, c + 4, NEGRO);
    const nx = px + pw - 5 - anchoMini(t('batalla.nivel'));
    // Long names (Criaturitah, Tragaperras…) would run into the level: it goes then.
    if (tx + anchoTexto(sp.nombre) < nx - 1) dibujarMini(ctx, t('batalla.nivel'), nx, c + 6, OSCURO);
    barraPS(ctx, tx, c + 14, 56, f.ps / u.psMax);
    // Status tags to the right of the bar.
    let ex = tx + 59;
    if (u.estado) ex += etiquetaEstado(ctx, u.estado, ex, c + 13) + 2;
    if (u.achispado > 0) etiquetaEstado(ctx, 'achispado', ex, c + 13);
    if (mia) {
      const nums = `${Math.ceil(f.ps)}/${u.psMax}`;
      dibujarTexto(ctx, nums, px + pw - 6 - anchoTexto(nums), c + 22, NEGRO);
      dibujarMini(ctx, q.nombre.toUpperCase(), tx, c + 25, OSCURO);
    } else {
      dibujarMini(ctx, q.nombre.toUpperCase(), tx, c + 23, OSCURO);
    }
    // Eliminated: greyed with the place.
    if (f.velo > 0) {
      velo(ctx, 0, y, ANCHO, h, PAPEL, 0.62 * f.velo);
      if (q.puesto > 0) {
        ctx.save();
        ctx.globalAlpha = f.velo;
        ordinal(ctx, q.puesto, mia ? 6 : ANCHO - LADO - 3, y + Math.floor(h / 2) - 7, NEGRO, 2);
        ctx.restore();
      }
    }
    // Target selection: the rival rows light up.
    const objetivo = (this.modo === 'objetivo' || this.modo === 'gradaObj') && this.objetivosPosibles.includes(j);
    if (objetivo) {
      const marcado = this.objetivosPosibles[this.sel] === j;
      const c = parpadea(ahora, marcado ? 260 : 600) || !marcado ? col : OSCURO;
      rect(ctx, c, 0, y, ANCHO, 2);
      rect(ctx, c, 0, y + h - 2, ANCHO, 2);
      rect(ctx, c, 0, y, 2, h);
      rect(ctx, c, ANCHO - 2, y, 2, h);
      entrada.zona(0, y, ANCHO, h, () => {
        this.sel = this.objetivosPosibles.indexOf(j);
        this.elegirObjetivo(j);
      });
    }
  }

  private sprite(ctx: CanvasRenderingContext2D, j: number, x: number, y: number, mia: boolean) {
    const f = this.fx[j];
    const u = activo(this.disp, j);
    const img = mia ? spriteEspalda(u.especie) : spriteFrente(u.especie);
    if (f.parpadeo > 0 && Math.floor(f.parpadeo / 80) % 2 === 0) return;
    const dx = x + f.salto;
    if (f.chapa >= 0 && f.alza < 1) {
      // Rising out of the cap, bottom first.
      const alto = Math.max(1, Math.round(32 * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, 32 - alto, 32, alto, dx, y + 32 - alto, 32, alto);
      const p = f.chapa;
      const cx = dx + 10;
      const cy = Math.round(y + 14 - Math.max(0, p - 0.4) * 40);
      if (p < 0.8) {
        ctx.drawImage(chapaImg(), cx, cy);
        if (p < 0.4) {
          ctx.save();
          ctx.globalAlpha = 0.8 * (1 - p / 0.4);
          rect(ctx, '#ffffff', dx + 2, y + 6, 28, 24);
          ctx.restore();
        }
      }
      return;
    }
    if (f.alza < 1) {
      const alto = Math.max(1, Math.round(32 * f.alza));
      if (f.alza > 0) ctx.drawImage(img, 0, 32 - alto, 32, alto, dx, y + 32 - alto, 32, alto);
      return;
    }
    if (f.caida > 0) {
      const d = Math.round(32 * f.caida);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 8, y, 48, 32 + 2);
      ctx.clip();
      ctx.drawImage(img, dx, y + d);
      ctx.restore();
      return;
    }
    ctx.drawImage(img, dx, y);
  }

  // ------------------------------------------------------------------ bottom area

  private zonaInferior(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    const y0 = G.yMenu;
    const h = G.menuH;
    const esMenu = this.modo !== 'cola' && this.modo !== 'espera';
    if (!esMenu) {
      this.caja.dibujar(ctx, 0, y0, ANCHO, h, ahora);
      return;
    }
    marco(ctx, 0, y0, ANCHO, h);
    switch (this.modo) {
      case 'accion':
        this.menuAccion(ctx, y0, h);
        break;
      case 'movs':
        this.menuMovs(ctx, y0, h);
        break;
      case 'equipo':
        this.menuEquipo(ctx, y0, h);
        break;
      case 'objetivo':
      case 'gradaObj':
        this.rotulo(ctx, y0, h, t('batalla.objetivo'), t('batalla.objetivo2'));
        break;
      case 'grada':
        this.menuGrada(ctx, y0, h);
        break;
      default:
        break;
    }
  }

  private rotulo(ctx: CanvasRenderingContext2D, y0: number, h: number, a: string, b: string) {
    dibujarTexto(ctx, a, 10, y0 + Math.floor(h / 2) - 11, NEGRO);
    dibujarTexto(ctx, b, 10, y0 + Math.floor(h / 2) + 1, OSCURO);
  }

  private fil(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, sel: boolean, fn: () => void) {
    if (sel) cursor(ctx, x + 4, y + Math.floor((h - 7) / 2));
    entrada.zona(x, y, w, h, fn);
  }

  private menuAccion(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    const q = this.real.jugadores[this.yo];
    const u = activo(this.real, this.yo);
    const prompt = envolver(t('batalla.que_hara', { quien: ESPECIE[u.especie].nombre }), ANCHO - 16);
    prompt.slice(0, 2).forEach((l, i) => dibujarTexto(ctx, l, 8, y0 + 7 + i * 10, NEGRO));
    const yo0 = y0 + 7 + Math.min(2, prompt.length) * 10 + 2;
    const rowH = Math.min(22, Math.floor((y0 + h - 5 - yo0) / 3));
    const ok = [true, puedeCambiar(this.real, this.yo), q.cana];
    ['luchar', 'userito', 'cana'].forEach((k, i) => {
      const y = yo0 + i * rowH;
      dibujarTexto(ctx, t(`batalla.${k}`), 24, y + Math.floor((rowH - 8) / 2) + 1, ok[i] ? NEGRO : CLARO);
      this.fil(ctx, 4, y, (ANCHO - 8), rowH, this.sel === i, () => {
        this.sel = i;
        this.accionPrincipal(i);
      });
    });
  }

  private menuMovs(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    const u = activo(this.real, this.yo);
    const sp = ESPECIE[u.especie];
    const libres = movsDisponibles(this.real, this.yo);
    const desesperada = !libres.some(Boolean);
    const ids = desesperada ? [DESESPERADA] : sp.movs;
    if (this.selMov >= ids.length) this.selMov = 0;
    const descId = ids[this.selMov];
    envolver(t(`mov.${descId}.desc`), ANCHO - 16)
      .slice(0, 2)
      .forEach((l, i) => dibujarTexto(ctx, l, 8, y0 + 6 + i * 10, OSCURO));
    const yl = y0 + 28;
    const rowH = Math.min(26, Math.floor((y0 + h - 4 - yl) / ids.length));
    ids.forEach((id, i) => {
      const m = MOVS[id];
      const y = yl + i * rowH;
      const pp = desesperada ? null : u.pp[i];
      const sinPP = pp !== null && pp <= 0;
      const cm = sinPP ? CLARO : NEGRO;
      rect(ctx, sinPP ? CLARO : COLOR_TIPO[m.tipo], 16, y + 2, 4, rowH - 4);
      const largo = Array.from(m.nombre).length > 12;
      if (largo) dibujarMini(ctx, m.nombre, 24, y + Math.floor((rowH - 5) / 2), cm);
      else dibujarTexto(ctx, m.nombre, 24, y + Math.floor((rowH - 8) / 2) + 1, cm);
      if (pp !== null) {
        const s = `${pp}/${m.pp}`;
        dibujarMini(ctx, s, (ANCHO - 8) - anchoMini(s), y + Math.floor((rowH - 5) / 2), sinPP ? PS_ROJO : OSCURO);
      }
      this.fil(ctx, 4, y, (ANCHO - 8), rowH, this.selMov === i, () => {
        if (this.selMov === i) this.elegirMovimiento(i);
        else {
          this.selMov = i;
          sonido.efecto('cursor');
        }
      });
    });
  }

  private menuEquipo(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    const q = this.real.jugadores[this.yo];
    dibujarTexto(ctx, t(this.reemplazo ? 'batalla.quien_sale' : 'batalla.equipo'), 10, y0 + 6, NEGRO);
    const yl = y0 + 17;
    const rowH = Math.min(26, Math.floor((y0 + h - 4 - yl) / q.equipo.length));
    q.equipo.forEach((u, i) => {
      const y = yl + i * rowH;
      const vivo = u.ps > 0;
      const activoAhora = i === q.activo && !this.reemplazo;
      const sp = ESPECIE[u.especie];
      const ocioso = !vivo || activoAhora;
      ctx.save();
      if (ocioso) ctx.globalAlpha = 0.45;
      ctx.drawImage(spriteFrente(u.especie), 0, 0, 32, 32, 22, y + Math.floor((rowH - 16) / 2), 16, 16);
      ctx.restore();
      dibujarTexto(ctx, sp.nombre, 42, y + 2, ocioso ? CLARO : NEGRO);
      barraPS(ctx, 42, y + 13, 48, u.ps / u.psMax);
      const nums = `${u.ps}/${u.psMax}`;
      dibujarMini(ctx, nums, 94, y + 14, ocioso ? CLARO : OSCURO);
      if (activoAhora) dibujarMini(ctx, t('batalla.en_combate'), 126, y + 14, OSCURO);
      else if (u.estado) etiquetaEstado(ctx, u.estado, 126, y + 12);
      this.fil(ctx, 4, y, (ANCHO - 8), rowH, this.sel === i, () => {
        this.sel = i;
        this.elegirEquipo(i);
      });
    });
  }

  private menuGrada(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    const prompt = envolver(t('batalla.grada'), ANCHO - 16);
    prompt.slice(0, 2).forEach((l, i) => dibujarTexto(ctx, l, 8, y0 + 7 + i * 10, NEGRO));
    const yo0 = y0 + 7 + Math.min(2, prompt.length) * 10 + 2;
    const rowH = Math.min(22, Math.floor((y0 + h - 5 - yo0) / 3));
    const hay = enGrada(this.real, this.yo);
    ['grada_cana', 'grada_abucheo', 'grada_nada'].forEach((k, i) => {
      const y = yo0 + i * rowH;
      dibujarTexto(ctx, t(`batalla.${k}`), 24, y + Math.floor((rowH - 8) / 2) + 1, i < 2 && !hay ? CLARO : NEGRO);
      this.fil(ctx, 4, y, (ANCHO - 8), rowH, this.sel === i, () => {
        this.sel = i;
        this.accionGrada(i);
      });
    });
  }
}

