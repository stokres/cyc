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
import { CLARO, COLOR_TIPO, FONDO, NEGRO, OSCURO, PAPEL, PS_ROJO, SUELO } from '../arte/paleta';
import { icono, spriteEspalda, spriteFrente } from '../arte/sprites';
import { entrada, type Accion } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { CajaTexto } from './caja';
import { menuPausa } from './ajustes';
import { Animador, colorEnt, dormir, etiquetaEstado, flecha, menuIcono, mover, ordinal, parpadea, rect, t, velo } from './ui';

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

export class VistaCombate implements Escena {
  /** What is on screen (changes as the events play). */
  disp!: EstadoCombate;
  /** The engine's last full state (for the menus). */
  private real!: EstadoCombate;
  private fx: Fx[] = [];
  private anim = new Animador();
  private caja = new CajaTexto(17);
  private modo: Modo = 'cola';
  private sel = 0;
  private selMov = 0;
  private plazoFin = 0;
  private ultimoTic = -1;
  private turnoHud = 1;
  private registro: string[] = [];
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
    await this.reproducir(eventos);
    this.adoptar(estado);
    this.turnoHud = estado.turno;
  }

  async alReemplazo(eventos: Evento[], estado: EstadoCombate): Promise<void> {
    this.cerrarMenus();
    await this.reproducir(eventos);
    this.adoptar(estado);
  }

  /** A line from outside the battle (online: someone left): queued in the text box. */
  aviso(s: string) {
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

  private async reproducir(eventos: Evento[]) {
    for (const ev of eventos) await this.evento(ev);
  }

  private userito(j: number): Userito {
    return activo(this.disp, j);
  }

  private async evento(ev: Evento) {
    const tareas: Promise<void>[] = [];
    const linea = ev.clave ? t(ev.clave, ev.vars) : null;
    switch (ev.k) {
      case 'usa': {
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
        if (ev.dano > 0) {
          sonido.efecto(ev.critico ? 'critico' : ev.ef > 1 ? 'golpeFuerte' : ev.ef < 1 ? 'golpeFlojo' : 'golpe');
          tareas.push(this.parpadea(ev.j));
        }
        tareas.push(this.barra(ev.j, ev.ps));
        break;
      }
      case 'falla':
        sonido.efecto('falla');
        break;
      case 'cura': {
        this.userito(ev.j).ps = ev.ps;
        sonido.efecto('cura');
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
        break;
      case 'texto':
        break;
    }
    if (linea) {
      tareas.push(
        this.caja.decir(linea).then(() => {
          this.registro.push(linea);
          if (this.registro.length > 8) this.registro.shift();
        }),
      );
    }
    await Promise.all(tareas);
  }

  private embestida(j: number): Promise<void> {
    const dir = j === this.yo ? 1 : -1;
    return this.anim.animar(300, (p) => (this.fx[j].salto = dir * Math.round(Math.sin(p * Math.PI) * 5)));
  }

  private parpadea(j: number): Promise<void> {
    return this.anim.animar(480, (p) => (this.fx[j].parpadeo = p >= 1 ? 0 : 480 * (1 - p)));
  }

  private barra(j: number, ps: number): Promise<void> {
    const f = this.fx[j];
    const desde = f.ps;
    return this.anim.animar(500, (p) => (f.ps = desde + (ps - desde) * p));
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
    const rivH = 34 + Math.floor(extra * 0.1);
    const meH = 42 + Math.floor(extra * 0.1);
    const yMe = hud + 3 * rivH;
    const yMenu = yMe + meH;
    return { H, hud, rivH, meH, yMe, yMenu, menuH: H - yMenu };
  }

  dibujar(ctx: CanvasRenderingContext2D, ahora: number) {
    if (!this.disp) return;
    const G = this.geom();
    rect(ctx, FONDO, 0, 0, 160, G.H);
    // Rows.
    const riv = this.rivales();
    riv.forEach((j, i) => this.fila(ctx, j, G.hud + i * G.rivH, G.rivH, false, ahora));
    this.fila(ctx, this.yo, G.yMe, G.meH, true, ahora);
    // Bottom area.
    this.zonaInferior(ctx, G, ahora);
    this.hud(ctx, G, ahora);
    // A tap on the box moves the text on.
    if (this.modo === 'cola' || this.modo === 'espera') {
      entrada.zona(0, G.yMenu, 160, G.menuH, () => this.caja.toque());
    }
  }

  private hud(ctx: CanvasRenderingContext2D, G: ReturnType<VistaCombate['geom']>, ahora: number) {
    rect(ctx, PAPEL, 0, 0, 160, G.hud - 1);
    rect(ctx, NEGRO, 0, G.hud - 1, 160, 1);
    menuIcono(ctx, 4, 3);
    dibujarMini(ctx, t('batalla.turno', { n: this.turnoHud }), 20, 4, NEGRO);
    if (this.puedeVolver) {
      flecha(ctx, 100, 3, -1, NEGRO);
      dibujarMini(ctx, t('batalla.volver'), 108, 4, NEGRO);
      entrada.zona(94, 0, 40, 18, () => this.accion('atras'));
    }
    if (this.plazoFin > 0) {
      const seg = Math.max(0, Math.ceil((this.plazoFin - Date.now()) / 1000));
      const s = String(seg);
      const rojo = seg <= 5;
      if (!rojo || parpadea(ahora, 400)) dibujarTexto(ctx, s, 157 - s.length * 8, 3, rojo ? PS_ROJO : NEGRO);
    }
    entrada.zona(0, 0, 30, 18, () => void this.pausar());
  }

  // ------------------------------------------------------------------ rows

  private fila(ctx: CanvasRenderingContext2D, j: number, y: number, h: number, mia: boolean, ahora: number) {
    const q = this.disp.jugadores[j];
    const f = this.fx[j];
    const u = activo(this.disp, j);
    const col = colorEnt(q.entrenador);
    const sx = mia ? 3 : 125;
    const sy = y + Math.floor((h - 32) / 2) + (mia ? 3 : 0);
    // Ground under the sprite.
    rect(ctx, SUELO, sx + 4, sy + 27, 24, 3);
    rect(ctx, SUELO, sx + 1, sy + 28, 30, 2);
    if (!f.oculto && !q.puesto) this.sprite(ctx, j, sx, sy, mia);
    else if (!f.oculto && f.caida > 0) this.sprite(ctx, j, sx, sy, mia);
    // Panel.
    const px = mia ? 36 : 1;
    const pw = mia ? 122 : 120;
    const py = y + 1;
    const ph = h - 2;
    marco(ctx, px, py, pw, ph);
    const tx = px + 15;
    rect(ctx, col, px + 4, py + 4, 8, ph - 8);
    ctx.drawImage(icono(q.entrenador), px + 4, py + 4);
    const sp = ESPECIE[u.especie];
    dibujarTexto(ctx, sp.nombre, tx, py + 4, NEGRO);
    const nx = px + pw - 5 - anchoMini(t('batalla.nivel'));
    // Long names (Criaturitah, Tragaperras…) would run into the level: it goes then.
    if (tx + anchoTexto(sp.nombre) < nx - 1) dibujarMini(ctx, t('batalla.nivel'), nx, py + 6, OSCURO);
    barraPS(ctx, tx, py + 14, 56, f.ps / u.psMax);
    // Status tags to the right of the bar.
    let ex = tx + 59;
    if (u.estado) ex += etiquetaEstado(ctx, u.estado, ex, py + 13) + 2;
    if (u.achispado > 0) etiquetaEstado(ctx, 'achispado', ex, py + 13);
    if (mia) {
      const nums = `${Math.ceil(f.ps)}/${u.psMax}`;
      dibujarTexto(ctx, nums, px + pw - 6 - anchoTexto(nums), py + 22, NEGRO);
      dibujarMini(ctx, q.nombre.toUpperCase(), tx, py + 25, OSCURO);
    } else {
      dibujarMini(ctx, q.nombre.toUpperCase(), tx, py + 23, OSCURO);
    }
    // Eliminated: greyed with the place.
    if (f.velo > 0) {
      velo(ctx, 0, y, 160, h, PAPEL, 0.62 * f.velo);
      if (q.puesto > 0) {
        ctx.save();
        ctx.globalAlpha = f.velo;
        ordinal(ctx, q.puesto, mia ? 6 : 128, y + Math.floor(h / 2) - 7, NEGRO, 2);
        ctx.restore();
      }
    }
    // Target selection: the rival rows light up.
    const objetivo = (this.modo === 'objetivo' || this.modo === 'gradaObj') && this.objetivosPosibles.includes(j);
    if (objetivo) {
      const marcado = this.objetivosPosibles[this.sel] === j;
      const c = parpadea(ahora, marcado ? 260 : 600) || !marcado ? col : OSCURO;
      rect(ctx, c, 0, y, 160, 2);
      rect(ctx, c, 0, y + h - 2, 160, 2);
      rect(ctx, c, 0, y, 2, h);
      rect(ctx, c, 158, y, 2, h);
      entrada.zona(0, y, 160, h, () => {
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
      const cajaH = Math.min(h, 46);
      this.dibujarRegistro(ctx, y0, h - cajaH);
      this.caja.dibujar(ctx, 0, G.H - cajaH, 160, cajaH, ahora);
      return;
    }
    marco(ctx, 0, y0, 160, h);
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

  private dibujarRegistro(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    if (h < 22 || !this.registro.length) return;
    const n = Math.min(3, Math.floor((h - 2) / 10));
    const lineas = this.registro.flatMap((s) => envolver(s, 152)).slice(-n);
    let y = y0 + h - 2 - lineas.length * 10;
    lineas.forEach((l, i) => {
      dibujarTexto(ctx, l, 4, y, i === lineas.length - 1 ? OSCURO : CLARO);
      y += 10;
    });
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
    const prompt = envolver(t('batalla.que_hara', { quien: ESPECIE[u.especie].nombre }), 144);
    prompt.slice(0, 2).forEach((l, i) => dibujarTexto(ctx, l, 8, y0 + 7 + i * 10, NEGRO));
    const yo0 = y0 + 7 + Math.min(2, prompt.length) * 10 + 2;
    const rowH = Math.min(22, Math.floor((y0 + h - 5 - yo0) / 3));
    const ok = [true, puedeCambiar(this.real, this.yo), q.cana];
    ['luchar', 'userito', 'cana'].forEach((k, i) => {
      const y = yo0 + i * rowH;
      dibujarTexto(ctx, t(`batalla.${k}`), 24, y + Math.floor((rowH - 8) / 2) + 1, ok[i] ? NEGRO : CLARO);
      this.fil(ctx, 4, y, 152, rowH, this.sel === i, () => {
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
    envolver(t(`mov.${descId}.desc`), 144)
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
        dibujarMini(ctx, s, 152 - anchoMini(s), y + Math.floor((rowH - 5) / 2), sinPP ? PS_ROJO : OSCURO);
      }
      this.fil(ctx, 4, y, 152, rowH, this.selMov === i, () => {
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
      this.fil(ctx, 4, y, 152, rowH, this.sel === i, () => {
        this.sel = i;
        this.elegirEquipo(i);
      });
    });
  }

  private menuGrada(ctx: CanvasRenderingContext2D, y0: number, h: number) {
    const prompt = envolver(t('batalla.grada'), 144);
    prompt.slice(0, 2).forEach((l, i) => dibujarTexto(ctx, l, 8, y0 + 7 + i * 10, NEGRO));
    const yo0 = y0 + 7 + Math.min(2, prompt.length) * 10 + 2;
    const rowH = Math.min(22, Math.floor((y0 + h - 5 - yo0) / 3));
    const hay = enGrada(this.real, this.yo);
    ['grada_cana', 'grada_abucheo', 'grada_nada'].forEach((k, i) => {
      const y = yo0 + i * rowH;
      dibujarTexto(ctx, t(`batalla.${k}`), 24, y + Math.floor((rowH - 8) / 2) + 1, i < 2 && !hay ? CLARO : NEGRO);
      this.fil(ctx, 4, y, 152, rowH, this.sel === i, () => {
        this.sel = i;
        this.accionGrada(i);
      });
    });
  }
}

