// PokéUsera · the statistics screens after the podium: RESUMEN (bars comparing the four players),
// USERITOS (the three useritos of a player), DUELOS (who hurt whom) and PREMIOS (funny awards).
// Everything is computed from `estado.stats`, which the engine fills while it resolves the turns
// (so online guests, who get the final state in the 'fin' message, see exactly the same).
// ◀ ▶ / swipe / the tabs change page; a long page scrolls (drag or ▲▼); VOLVER goes back.
import type { EstadoCombate, StatsUserito } from '../tipos';
import { ESPECIE, MOVS, DESESPERADA } from '../datos';
import { anchoMini, anchoTexto, dibujarMini, dibujarTexto } from '../arte/fuente';
import { marco } from '../arte/marcos';
import { CLARO, FONDO, NEGRO, OSCURO, PAPEL, PS_ROJO } from '../arte/paleta';
import { spriteFrente } from '../arte/sprites';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { boton, colorEnt, ficha, flecha, ordinal, rect, t } from './ui';

// ------------------------------------------------------------------ the numbers

/** A player's totals over his three useritos (and the biggest hit of any of them). */
export interface Total {
  dh: number;
  dr: number;
  dp: number;
  cu: number;
  ko: number;
  cae: number;
  gol: number;
  rg: number;
  fal: number;
  esq: number;
  cri: number;
  crr: number;
  sup: number;
  sur: number;
  pob: number;
  por: number;
  est: number;
  nvo: number;
  nvy: number;
  cam: number;
  cana: number;
  pp: number;
  dv: number;
  tf: number;
  /** Most turns on the field of a userito that never fell. */
  superviviente: number;
  mx: number;
  mm: string;
  mo: number;
}

const CAMPOS_SUMA = ['dh', 'dr', 'dp', 'cu', 'ko', 'cae', 'gol', 'rg', 'fal', 'esq', 'cri', 'crr', 'sup', 'sur', 'pob', 'por', 'est', 'nvo', 'nvy', 'cam', 'cana', 'pp', 'dv', 'tf'] as const;

export function totalJugador(estado: EstadoCombate, j: number): Total {
  const r = { mx: 0, mm: '', mo: -1, superviviente: 0 } as Total;
  for (const c of CAMPOS_SUMA) r[c] = 0;
  for (const u of estado.stats.u[j] ?? []) {
    for (const c of CAMPOS_SUMA) r[c] += u[c];
    if (u.mx > r.mx) {
      r.mx = u.mx;
      r.mm = u.mm;
      r.mo = u.mo;
    }
    if (u.cae === 0) r.superviviente = Math.max(r.superviviente, u.tf);
  }
  return r;
}

/** Player indices, best place first. */
export function porPuesto(estado: EstadoCombate): number[] {
  return estado.jugadores.map((_, j) => j).sort((a, b) => (estado.jugadores[a].puesto || 9) - (estado.jugadores[b].puesto || 9));
}

/** The player who did the most damage (null if nobody did any). */
export function mvp(estado: EstadoCombate): { j: number; dano: number } | null {
  let mejor: { j: number; dano: number } | null = null;
  for (const j of porPuesto(estado)) {
    const d = totalJugador(estado, j).dh;
    if (d > 0 && (!mejor || d > mejor.dano)) mejor = { j, dano: d };
  }
  return mejor;
}

export interface Premio {
  id: string;
  j: number;
  valor: number;
}

/** What each award measures; the order is the priority when there are more than eight. */
const PREMIOS: { id: string; valor: (a: Total) => number }[] = [
  { id: 'mvp', valor: (a) => a.dh },
  { id: 'saco', valor: (a) => a.dr },
  { id: 'matagigantes', valor: (a) => a.ko },
  { id: 'cana', valor: (a) => a.cu },
  { id: 'gafe', valor: (a) => a.fal },
  { id: 'francotirador', valor: (a) => a.cri },
  { id: 'cambia', valor: (a) => a.cam },
  { id: 'superviviente', valor: (a) => a.superviviente },
  { id: 'rencoroso', valor: (a) => a.dv },
];

/** The awards that someone earned (value above 0), at most eight. Ties go to the better placed player. */
export function premios(estado: EstadoCombate): Premio[] {
  const orden = porPuesto(estado);
  const tot = estado.jugadores.map((_, j) => totalJugador(estado, j));
  const out: Premio[] = [];
  for (const p of PREMIOS) {
    let mejor = -1;
    let valor = 0;
    for (const j of orden) {
      const v = p.valor(tot[j]);
      if (v > valor) {
        valor = v;
        mejor = j;
      }
    }
    if (mejor >= 0) out.push({ id: p.id, j: mejor, valor });
  }
  return out.slice(0, 8);
}

/** Slot of the move a userito used most (4 = «A la desesperada») and its times; null if it never acted. */
function favorito(u: StatsUserito): { slot: number; n: number } | null {
  let slot = -1;
  let n = 0;
  u.mv.forEach((v, i) => {
    if (v > n) {
      n = v;
      slot = i;
    }
  });
  return slot < 0 ? null : { slot, n };
}

const nombreMov = (especie: string, slot: number): string => (slot >= 4 ? MOVS[DESESPERADA].nombre : MOVS[ESPECIE[especie].movs[slot]].nombre);

// ------------------------------------------------------------------ drawing helpers

/** Heat colour from paper (0) to a hot red (1). */
function calor(f: number): string {
  const a = [0xf8, 0xf0, 0xd8];
  const b = [0xe0, 0x4a, 0x2c];
  const k = Math.max(0, Math.min(1, f));
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
}

/** Normal-font text; the tiny font if it does not fit `max` px. */
function ajustado(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, max: number, color: string) {
  if (anchoTexto(s) <= max) dibujarTexto(ctx, s, x, y + 1, color);
  else dibujarMini(ctx, s, x, y + 2, color);
}

function barra(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  if (w <= 0) {
    rect(ctx, CLARO, x, y, 1, h);
    return;
  }
  rect(ctx, NEGRO, x, y, w + 2, h);
  rect(ctx, color, x + 1, y + 1, w, h - 2);
  rect(ctx, 'rgba(255,255,255,0.4)', x + 1, y + 1, w, 1);
}

type Pagina = 'resumen' | 'userit' | 'duelos' | 'premios';
const PAGINAS: Pagina[] = ['resumen', 'userit', 'duelos', 'premios'];

/** The metrics of RESUMEN, two per row. */
const METRICAS: (keyof Total)[] = ['dh', 'dr', 'cu', 'ko', 'cae', 'gol', 'fal', 'cri', 'sup', 'esq'];

// ------------------------------------------------------------------ the screen

/** Shows the statistics and resolves when the player goes back (VOLVER). `miSeat`: highlighted, and the first player shown in USERITOS. */
export function pantallaEstadisticas(estado: EstadoCombate, miSeat: number | null): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    const anterior = p.escena;
    const orden = porPuesto(estado);
    const n = estado.jugadores.length;
    const tot = estado.jugadores.map((_, j) => totalJugador(estado, j));
    let pag = 0;
    let scroll = 0;
    let altoContenido = 0;
    let jugSel = miSeat !== null && miSeat < n ? miSeat : orden[0];
    const volver = () => {
      sonido.efecto('atras');
      p.poner(anterior);
      res();
    };
    const ir = (d: number) => {
      const nueva = Math.max(0, Math.min(PAGINAS.length - 1, pag + d));
      if (nueva === pag) return;
      pag = nueva;
      scroll = 0;
      sonido.efecto('cursor');
    };
    const irA = (i: number) => {
      if (i === pag) return;
      pag = i;
      scroll = 0;
      sonido.efecto('cursor');
    };

    // ---- RESUMEN
    const resumen = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const colW = Math.floor((ANCHO - 12) / 2);
      // Legend: the four players, best place first, in a 2×2 grid.
      let y = y0;
      orden.forEach((j, i) => {
        const q = estado.jugadores[j];
        const x = 4 + (i % 2) * (colW + 4);
        const yy = y + Math.floor(i / 2) * 15;
        ficha(ctx, q.entrenador, x, yy, 12);
        ordinal(ctx, q.puesto || 1, x + 15, yy + 2, NEGRO);
        const nombre = q.nombre.toUpperCase();
        dibujarMini(ctx, nombre, x + 32, yy + 4, j === miSeat ? NEGRO : OSCURO);
        if (j === miSeat) rect(ctx, NEGRO, x + 32, yy + 10, anchoMini(nombre), 1);
      });
      y += Math.ceil(n / 2) * 15 + 3;
      // The metrics: a label and one bar per player.
      const filas = Math.ceil(METRICAS.length / 2);
      const paso = Math.max(33, Math.min(58, Math.floor((alto - (y - y0)) / filas)));
      const barH = Math.max(4, Math.min(9, Math.floor((paso - 11) / n)));
      METRICAS.forEach((m, i) => {
        const x = 4 + (i % 2) * (colW + 4);
        const yy = y + Math.floor(i / 2) * paso;
        marco(ctx, x, yy, colW, paso - 3);
        dibujarMini(ctx, t(`stats.m.${m}`), x + 5, yy + 5, OSCURO);
        const max = Math.max(1, ...orden.map((j) => tot[j][m] as number));
        const anchoMax = colW - 14 - 22;
        orden.forEach((j, k) => {
          const v = tot[j][m] as number;
          const by = yy + 12 + k * barH;
          barra(ctx, x + 6, by, Math.round((anchoMax * v) / max), barH - 1, colorEnt(estado.jugadores[j].entrenador));
          const w = v > 0 ? Math.round((anchoMax * v) / max) + 2 : 1;
          dibujarMini(ctx, String(v), x + 6 + w + 3, by + Math.max(0, Math.floor((barH - 6) / 2)), v === max && v > 0 ? NEGRO : OSCURO);
        });
      });
      return y - y0 + filas * paso;
    };

    // ---- USERITOS
    const userit = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const q = estado.jugadores[jugSel];
      const hCard = 66;
      const sep = Math.max(3, Math.min(10, Math.floor((alto - q.equipo.length * hCard) / Math.max(1, q.equipo.length))));
      q.equipo.forEach((u, i) => {
        const s = estado.stats.u[jugSel][i];
        const x = 4;
        const w = ANCHO - 8;
        const y = y0 + i * (hCard + sep);
        marco(ctx, x, y, w, hCard);
        rect(ctx, colorEnt(q.entrenador), x + 3, y + 3, 3, hCard - 6);
        ctx.save();
        if (s.cae > 0) ctx.globalAlpha = 0.7;
        ctx.drawImage(spriteFrente(u.especie), x + 9, y + 4);
        ctx.restore();
        const tx = x + 9 + 34;
        const nombre = ESPECIE[u.especie].nombre;
        dibujarTexto(ctx, nombre, tx, y + 5, NEGRO);
        if (s.cae > 0) {
          const k = t('stats.u.caido');
          const kw = anchoMini(k) + 5;
          rect(ctx, PS_ROJO, x + w - 6 - kw, y + 5, kw, 9);
          dibujarMini(ctx, k, x + w - 6 - kw + 2, y + 7, PAPEL);
        }
        const lin = (k: number, a: string, b?: string) => {
          dibujarMini(ctx, a, tx, y + 17 + k * 8, OSCURO);
          if (b) dibujarMini(ctx, b, tx + Math.floor((x + w - 6 - tx) / 2), y + 17 + k * 8, OSCURO);
        };
        lin(0, `${t('stats.u.hecho')} ${s.dh}`, `${t('stats.u.recibido')} ${s.dr}`);
        lin(1, `${t('stats.u.derribos')} ${s.ko}`, `${t('stats.u.turnos')} ${s.tf}`);
        lin(2, `${t('stats.u.curado')} ${s.cu}`, `${t('stats.u.golpes')} ${s.gol}`);
        const fav = favorito(s);
        // Under the sprite, the whole width: favourite move and biggest hit.
        dibujarMini(ctx, fav ? t('stats.u.fav', { mov: nombreMov(u.especie, fav.slot).toUpperCase(), n: fav.n }) : t('stats.u.sin'), x + 9, y + hCard - 23, NEGRO);
        if (s.mx > 0) {
          dibujarMini(ctx, t('stats.u.max', { n: s.mx, mov: (MOVS[s.mm]?.nombre ?? '').toUpperCase() }), x + 9, y + hCard - 13, NEGRO);
          if (s.mo >= 0 && s.mo < n) ficha(ctx, estado.jugadores[s.mo].entrenador, x + w - 16, y + hCard - 16, 10);
        }
      });
      return q.equipo.length * (hCard + sep);
    };

    // ---- DUELOS
    const duelos = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const { dm, km } = estado.stats;
      const cab = 16;
      const cw = Math.floor((ANCHO - 8 - cab) / n);
      const ch = Math.max(24, Math.min(40, Math.floor((alto - 9 - 15 - 6 - 9 - n * 15) / n) - 1));
      const x0 = 4 + cab;
      const ayuda = t('stats.duelos.ayuda');
      dibujarMini(ctx, ayuda, Math.floor((ANCHO - anchoMini(ayuda)) / 2), y0 + 1, OSCURO);
      const yh = y0 + 9;
      for (let b = 0; b < n; b++) ficha(ctx, estado.jugadores[b].entrenador, x0 + b * cw + Math.floor((cw - 12) / 2), yh, 12);
      const max = Math.max(1, ...dm.flat());
      for (let a = 0; a < n; a++) {
        const y = yh + 15 + a * (ch + 1);
        ficha(ctx, estado.jugadores[a].entrenador, 4, y + Math.floor((ch - 12) / 2), 12);
        for (let b = 0; b < n; b++) {
          const x = x0 + b * cw;
          if (a === b) {
            rect(ctx, NEGRO, x, y, cw - 1, ch);
            rect(ctx, CLARO, x + 1, y + 1, cw - 3, ch - 2);
            continue;
          }
          rect(ctx, NEGRO, x, y, cw - 1, ch);
          rect(ctx, calor(dm[a][b] / max), x + 1, y + 1, cw - 3, ch - 2);
          const v = String(dm[a][b]);
          if (anchoTexto(v) <= cw - 2) dibujarTexto(ctx, v, x + Math.floor((cw - 1 - anchoTexto(v)) / 2), y + Math.floor((ch - 8) / 2) - (km[a][b] > 0 ? 3 : 0), NEGRO);
          else dibujarMini(ctx, v, x + Math.floor((cw - 1 - anchoMini(v)) / 2), y + Math.floor((ch - 5) / 2) - (km[a][b] > 0 ? 3 : 0), NEGRO);
          if (km[a][b] > 0) {
            const k = t('stats.duelos.ko', { n: km[a][b] });
            dibujarMini(ctx, k, x + Math.floor((cw - 1 - anchoMini(k)) / 2), y + ch - 9, NEGRO);
          }
        }
      }
      // Nemesis and favourite victim of each player.
      let y = yh + 15 + n * (ch + 1) + 6;
      const xN = 24;
      const xV = xN + Math.floor((ANCHO - xN - 4) / 2);
      dibujarMini(ctx, t('stats.duelos.nemesis'), xN, y, OSCURO);
      dibujarMini(ctx, t('stats.duelos.victima'), xV, y, OSCURO);
      y += 9;
      for (const a of orden) {
        ficha(ctx, estado.jugadores[a].entrenador, 4, y, 12);
        // Who hurt `a` the most, and whom `a` hurt the most.
        let nem = -1;
        let vic = -1;
        for (let b = 0; b < n; b++) {
          if (b === a) continue;
          if (dm[b][a] > 0 && (nem < 0 || dm[b][a] > dm[nem][a])) nem = b;
          if (dm[a][b] > 0 && (vic < 0 || dm[a][b] > dm[a][vic])) vic = b;
        }
        const celda = (x: number, b: number, v: number) => {
          if (b < 0) {
            dibujarMini(ctx, t('stats.duelos.nadie'), x + 4, y + 4, CLARO);
            return;
          }
          ficha(ctx, estado.jugadores[b].entrenador, x, y, 12);
          dibujarTexto(ctx, String(v), x + 16, y + 3, NEGRO);
        };
        celda(xN, nem, nem >= 0 ? dm[nem][a] : 0);
        celda(xV, vic, vic >= 0 ? dm[a][vic] : 0);
        y += 15;
      }
      return y - y0;
    };

    // ---- PREMIOS
    const lista = premios(estado);
    const premiosPag = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const h = Math.max(30, Math.min(40, Math.floor((alto - 2) / Math.max(1, lista.length)) - 2));
      lista.forEach((pr, i) => {
        const y = y0 + i * (h + 2);
        const x = 4;
        const w = ANCHO - 8;
        marco(ctx, x, y, w, h);
        const q = estado.jugadores[pr.j];
        const lado = Math.min(22, h - 8);
        ficha(ctx, q.entrenador, x + 5, y + Math.floor((h - lado) / 2), lado);
        const tx = x + 5 + lado + 5;
        const num = String(pr.valor);
        const nw = anchoTexto(num);
        // Name and the number on the first line, the joke in the tiny font, the winner at the bottom.
        ajustado(ctx, t(`premio.${pr.id}.n`), tx, y + 5, w - (tx - x) - nw - 14, NEGRO);
        dibujarTexto(ctx, num, x + w - 8 - nw, y + 5, NEGRO);
        dibujarMini(ctx, t(`premio.${pr.id}.d`), tx, y + 16, OSCURO);
        dibujarMini(ctx, q.nombre.toUpperCase(), tx, y + h - 10, NEGRO);
      });
      if (!lista.length) dibujarTexto(ctx, t('stats.nada'), 12, y0 + 12, OSCURO);
      return lista.length * (h + 2);
    };

    const e: Escena = {
      dibujar(ctx) {
        const H = p.alto;
        rect(ctx, FONDO, 0, 0, ANCHO, H);
        // Top bar: ◀ tabs ▶.
        rect(ctx, PAPEL, 0, 0, ANCHO, 16);
        rect(ctx, NEGRO, 0, 16, ANCHO, 1);
        const tw = Math.floor((ANCHO - 20) / PAGINAS.length);
        flecha(ctx, 2, 4, -1, pag > 0 ? NEGRO : CLARO);
        flecha(ctx, ANCHO - 7, 4, 1, pag < PAGINAS.length - 1 ? NEGRO : CLARO);
        entrada.zona(0, 0, 10, 17, () => ir(-1));
        entrada.zona(ANCHO - 10, 0, 10, 17, () => ir(1));
        PAGINAS.forEach((id, i) => {
          const x = 10 + i * tw;
          const s = t(`stats.tab.${id}`);
          if (i === pag) {
            rect(ctx, NEGRO, x + 1, 2, tw - 2, 13);
            dibujarMini(ctx, s, x + Math.floor((tw - anchoMini(s)) / 2), 6, PAPEL);
          } else dibujarMini(ctx, s, x + Math.floor((tw - anchoMini(s)) / 2), 6, OSCURO);
          entrada.zona(x, 0, tw, 17, () => irA(i));
        });
        // Content, clipped and scrolled.
        const yTop = 22 + (PAGINAS[pag] === 'userit' ? 18 : 0);
        const yFin = H - 30;
        if (PAGINAS[pag] === 'userit') {
          // The four players to pick from (fixed above the cards).
          const cw = Math.floor((ANCHO - 8) / n);
          orden.forEach((j, i) => {
            const x = 4 + i * cw;
            const q = estado.jugadores[j];
            rect(ctx, j === jugSel ? NEGRO : CLARO, x, 20, cw - 2, 17);
            rect(ctx, j === jugSel ? PAPEL : FONDO, x + 1, 21, cw - 4, 15);
            ficha(ctx, q.entrenador, x + 3, 22, 12);
            ordinal(ctx, q.puesto || 1, x + 18, 25, j === jugSel ? NEGRO : OSCURO);
            entrada.zona(x, 19, cw, 19, () => {
              if (jugSel !== j) {
                jugSel = j;
                scroll = 0;
                sonido.efecto('cursor');
              }
            });
          });
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yTop, ANCHO, yFin - yTop);
        ctx.clip();
        const base = yTop - scroll;
        const alto = yFin - yTop;
        const pagina = PAGINAS[pag];
        altoContenido = pagina === 'resumen' ? resumen(ctx, base, alto) : pagina === 'userit' ? userit(ctx, base, alto) : pagina === 'duelos' ? duelos(ctx, base, alto) : premiosPag(ctx, base, alto);
        ctx.restore();
        const maxScroll = Math.max(0, altoContenido + 4 - alto);
        scroll = Math.max(0, Math.min(maxScroll, scroll));
        if (maxScroll > 0) {
          // A scroll hint: the bar on the right edge.
          const bh = Math.max(10, Math.round((alto * alto) / (altoContenido + 4)));
          const by = yTop + Math.round(((alto - bh) * scroll) / maxScroll);
          rect(ctx, OSCURO, ANCHO - 2, by, 2, bh);
        }
        // VOLVER.
        const yb = H - 26;
        const bw = 70;
        boton(ctx, Math.floor((ANCHO - bw) / 2), yb, bw, 22, t('stats.volver'), true);
        entrada.zona(Math.floor((ANCHO - bw) / 2), yb, bw, 22, volver);
      },
      accion(a: Accion) {
        if (a === 'izq') ir(-1);
        else if (a === 'der') ir(1);
        else if (a === 'arriba' || a === 'abajo') {
          if (PAGINAS[pag] === 'userit' && altoContenido <= pantalla().alto - 70) {
            // Nothing to scroll: ▲▼ pick the player.
            const i = orden.indexOf(jugSel);
            const k = Math.max(0, Math.min(n - 1, i + (a === 'abajo' ? 1 : -1)));
            if (orden[k] !== jugSel) {
              jugSel = orden[k];
              sonido.efecto('cursor');
            }
          } else scroll += a === 'abajo' ? 24 : -24;
        } else if (a === 'aceptar' || a === 'atras') volver();
        return true;
      },
      arrastre(_dx, dy, total, fin) {
        if (!fin) {
          if (Math.abs(total.y) > Math.abs(total.x)) scroll -= dy;
        } else if (Math.abs(total.x) > 22 && Math.abs(total.x) > Math.abs(total.y) * 1.5) ir(total.x < 0 ? 1 : -1);
      },
    };
    p.poner(e);
  });
}
