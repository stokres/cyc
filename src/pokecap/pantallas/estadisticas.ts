// PokéUsera · the statistics screens after the podium: RESUMEN (bars comparing the four players),
// USERITOS (the three useritos of a player), DUELOS (who hurt whom) and PREMIOS (funny awards).
// Everything is computed from `estado.stats`, which the engine fills while it resolves the turns
// (so online guests, who get the final state in the 'fin' message, see exactly the same).
// ◀ ▶ / swipe / the tabs change page; a long page scrolls (drag or ▲▼); VOLVER goes back.
import type { EstadoCombate, StatsUserito } from '../tipos';
import { ESPECIE, MOVS, DESESPERADA } from '../datos';
import { retrato2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { spriteFrente2 } from '../arte2/sprites2';
import { panelCacheado, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { barraArriba, boton, colorEnt, fondoPapel, ficha, flecha, ordinal, rect, reposo, t, texto2, recortar } from './ui';

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

const GRIS = '#a898a8';

function barra(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  if (w <= 0) {
    rect(ctx, GRIS, x, y, 1, h);
    return;
  }
  rect(ctx, TINTA2, x, y, w + 2, h);
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
      const y = y0 + 2;
      orden.forEach((j, i) => {
        const q = estado.jugadores[j];
        const x = 4 + (i % 2) * (colW + 4);
        const yy = y + Math.floor(i / 2) * 22;
        ficha(ctx, q.entrenador, x, yy, 18);
        ordinal(ctx, q.puesto || 1, x + 22, yy + 6, TINTA2);
        const nombre = recortar(q.nombre, colW - 50);
        texto2(ctx, nombre, x + 44, yy + 6, TINTA2, null);
        if (j === miSeat) rect(ctx, TINTA2, x + 44, yy + 15, anchoTexto2(nombre), 1);
      });
      const yc = y + Math.ceil(n / 2) * 22 + 4;
      // The metrics: a label and one bar per player.
      const filas = Math.ceil(METRICAS.length / 2);
      const paso = Math.max(54, Math.min(70, Math.floor((alto - (yc - y0)) / filas)));
      const barH = Math.max(8, Math.min(11, Math.floor((paso - 24) / n)));
      METRICAS.forEach((m, i) => {
        const x = 4 + (i % 2) * (colW + 4);
        const yy = yc + Math.floor(i / 2) * paso;
        panelCacheado(ctx, x, yy, colW, paso - 4);
        texto2(ctx, t(`stats.m.${m}`), x + 8, yy + 8, TINTA_SUAVE);
        const max = Math.max(1, ...orden.map((j) => tot[j][m] as number));
        const anchoMax = colW - 16 - 30;
        orden.forEach((j, k) => {
          const v = tot[j][m] as number;
          const by = yy + 21 + k * barH;
          const w = Math.round((anchoMax * v) / max);
          barra(ctx, x + 8, by, w, barH - 1, colorEnt(estado.jugadores[j].entrenador));
          texto2(ctx, String(v), x + 8 + (v > 0 ? w + 2 : 1) + 4, by, v === max && v > 0 ? TINTA2 : TINTA_SUAVE, null);
        });
      });
      return yc - y0 + filas * paso;
    };

    // ---- USERITOS
    const userit = (ctx: CanvasRenderingContext2D, y0: number, _alto: number, ahora: number): number => {
      const q = estado.jugadores[jugSel];
      const hCard = 100;
      const sep = 4;
      q.equipo.forEach((u, i) => {
        const s = estado.stats.u[jugSel][i];
        const x = 4;
        const w = ANCHO - 8;
        const y = y0 + i * (hCard + sep);
        panelCacheado(ctx, x, y, w, hCard, colorEnt(q.entrenador));
        ctx.save();
        if (s.cae > 0) ctx.globalAlpha = 0.7;
        ctx.drawImage(spriteFrente2(u.especie, reposo(ahora, i * 230)), x + 6, y + 5);
        ctx.restore();
        const tx = x + 6 + 66;
        const nombre = ESPECIE[u.especie].nombre;
        texto2(ctx, nombre, tx, y + 8, TINTA2);
        if (s.cae > 0) {
          const k = t('stats.u.caido');
          const kw = anchoTexto2(k) + 8;
          relleno(ctx, TINTA2, x + w - 8 - kw, y + 6, kw, 13);
          relleno(ctx, '#d4382c', x + w - 7 - kw, y + 7, kw - 2, 11);
          texto2(ctx, k, x + w - 4 - kw, y + 9, '#fff6e0', null);
        }
        const lin = (k: number, a: string, b?: string) => {
          texto2(ctx, a, tx, y + 26 + k * 13, TINTA_SUAVE, null);
          if (b) texto2(ctx, b, tx + 76, y + 26 + k * 13, TINTA_SUAVE, null);
        };
        lin(0, `${t('stats.u.hecho')} ${s.dh}`, `${t('stats.u.recibido')} ${s.dr}`);
        lin(1, `${t('stats.u.derribos')} ${s.ko}`, `${t('stats.u.turnos')} ${s.tf}`);
        lin(2, `${t('stats.u.curado')} ${s.cu}`, `${t('stats.u.golpes')} ${s.gol}`);
        const fav = favorito(s);
        // Under the sprite, the whole width: favourite move and biggest hit.
        texto2(ctx, fav ? t('stats.u.fav', { mov: nombreMov(u.especie, fav.slot).toUpperCase(), n: fav.n }) : t('stats.u.sin'), x + 8, y + hCard - 26, TINTA2, null);
        if (s.mx > 0) {
          texto2(ctx, t('stats.u.max', { n: s.mx, mov: (MOVS[s.mm]?.nombre ?? '').toUpperCase() }), x + 8, y + hCard - 13, TINTA2, null);
          if (s.mo >= 0 && s.mo < n) ficha(ctx, estado.jugadores[s.mo].entrenador, x + w - 22, y + hCard - 22, 16);
        }
      });
      return q.equipo.length * (hCard + sep);
    };

    // ---- DUELOS
    const duelos = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const { dm, km } = estado.stats;
      const cab = 22;
      const cw = Math.floor((ANCHO - 8 - cab) / n);
      const ch = Math.max(32, Math.min(46, Math.floor((alto - 14 - 22 - 12 - 14 - n * 22) / n) - 1));
      const x0 = 4 + cab;
      const ayuda = t('stats.duelos.ayuda');
      texto2(ctx, ayuda, Math.floor((ANCHO - anchoTexto2(ayuda)) / 2), y0 + 3, TINTA_SUAVE, null);
      const yh = y0 + 14;
      for (let b = 0; b < n; b++) ficha(ctx, estado.jugadores[b].entrenador, x0 + b * cw + Math.floor((cw - 18) / 2), yh, 18);
      const max = Math.max(1, ...dm.flat());
      for (let a = 0; a < n; a++) {
        const y = yh + 21 + a * (ch + 2);
        ficha(ctx, estado.jugadores[a].entrenador, 3, y + Math.floor((ch - 18) / 2), 18);
        for (let b = 0; b < n; b++) {
          const x = x0 + b * cw;
          rect(ctx, TINTA2, x, y, cw - 1, ch);
          if (a === b) {
            rect(ctx, '#8a7690', x + 1, y + 1, cw - 3, ch - 2);
            continue;
          }
          rect(ctx, calor(dm[a][b] / max), x + 1, y + 1, cw - 3, ch - 2);
          const v = String(dm[a][b]);
          const conKo = km[a][b] > 0;
          texto2(ctx, v, x + Math.floor((cw - 1 - anchoTexto2(v)) / 2), y + Math.floor((ch - 7) / 2) - (conKo ? 6 : 0), TINTA2, null);
          if (conKo) {
            const k = t('stats.duelos.ko', { n: km[a][b] });
            texto2(ctx, k, x + Math.floor((cw - 1 - anchoTexto2(k)) / 2), y + ch - 14, TINTA2, null);
          }
        }
      }
      // Nemesis and favourite victim of each player.
      let y = yh + 21 + n * (ch + 2) + 8;
      const xN = 28;
      const xV = xN + Math.floor((ANCHO - xN - 4) / 2);
      texto2(ctx, t('stats.duelos.nemesis'), xN, y, TINTA_SUAVE, null);
      texto2(ctx, t('stats.duelos.victima'), xV, y, TINTA_SUAVE, null);
      y += 12;
      for (const a of orden) {
        ficha(ctx, estado.jugadores[a].entrenador, 3, y, 18);
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
            texto2(ctx, t('stats.duelos.nadie'), x + 6, y + 6, GRIS, null);
            return;
          }
          ficha(ctx, estado.jugadores[b].entrenador, x, y, 18);
          texto2(ctx, String(v), x + 23, y + 6, TINTA2, null);
        };
        celda(xN, nem, nem >= 0 ? dm[nem][a] : 0);
        celda(xV, vic, vic >= 0 ? dm[a][vic] : 0);
        y += 21;
      }
      return y - y0;
    };

    // ---- PREMIOS
    const lista = premios(estado);
    const premiosPag = (ctx: CanvasRenderingContext2D, y0: number, alto: number): number => {
      const h = Math.max(46, Math.min(52, Math.floor((alto - 2) / Math.max(1, lista.length)) - 3));
      lista.forEach((pr, i) => {
        const y = y0 + i * (h + 3);
        const x = 4;
        const w = ANCHO - 8;
        const q = estado.jugadores[pr.j];
        panelCacheado(ctx, x, y, w, h, colorEnt(q.entrenador));
        ctx.drawImage(retrato2(q.entrenador), x + 5, y + Math.floor((h - 40) / 2));
        const tx = x + 5 + 40 + 7;
        const num = String(pr.valor);
        const nw = anchoTexto2(num);
        texto2(ctx, t(`premio.${pr.id}.n`), tx, y + 8, TINTA2);
        texto2(ctx, num, x + w - 10 - nw, y + 8, TINTA2);
        texto2(ctx, t(`premio.${pr.id}.d`), tx, y + 21, TINTA_SUAVE, null);
        texto2(ctx, q.nombre.toUpperCase(), tx, y + h - 15, colorEnt(q.entrenador), null);
      });
      if (!lista.length) texto2(ctx, t('stats.nada'), 14, y0 + 14, TINTA_SUAVE);
      return lista.length * (h + 3);
    };

    const e: Escena = {
      dibujar(ctx, ahora) {
        const H = p.alto;
        fondoPapel(ctx, H);
        const yTop = 24 + (PAGINAS[pag] === 'userit' ? 24 : 0);
        const yFin = H - 36;
        // Content, clipped and scrolled.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yTop, ANCHO, yFin - yTop);
        ctx.clip();
        const base = yTop - scroll;
        const alto = yFin - yTop;
        const pagina = PAGINAS[pag];
        altoContenido = pagina === 'resumen' ? resumen(ctx, base, alto) : pagina === 'userit' ? userit(ctx, base, alto, ahora) : pagina === 'duelos' ? duelos(ctx, base, alto) : premiosPag(ctx, base, alto);
        ctx.restore();
        const maxScroll = Math.max(0, altoContenido + 4 - alto);
        scroll = Math.max(0, Math.min(maxScroll, scroll));
        if (maxScroll > 0) {
          // A scroll hint: the bar on the right edge.
          const bh = Math.max(12, Math.round((alto * alto) / (altoContenido + 4)));
          const by = yTop + Math.round(((alto - bh) * scroll) / maxScroll);
          rect(ctx, TINTA2, ANCHO - 3, by, 3, bh);
        }
        if (PAGINAS[pag] === 'userit') {
          // The four players to pick from (fixed above the cards).
          rect(ctx, '#d9c9a0', 0, 18, ANCHO, 26);
          const cw = Math.floor((ANCHO - 8) / n);
          orden.forEach((j, i) => {
            const x = 4 + i * cw;
            const q = estado.jugadores[j];
            const dentro = j === jugSel;
            relleno(ctx, TINTA2, x, 21, cw - 3, 22);
            relleno(ctx, dentro ? PAPEL_ALTO : '#8a7690', x + 1, 22, cw - 5, 20);
            ficha(ctx, q.entrenador, x + 3, 23, 18);
            ordinal(ctx, q.puesto || 1, x + 25, 28, dentro ? TINTA2 : '#e8dcc0', 1);
            entrada.zona(x, 19, cw, 25, () => {
              if (jugSel !== j) {
                jugSel = j;
                scroll = 0;
                sonido.efecto('cursor');
              }
            });
          });
        }
        // Top bar: ◀ tabs ▶.
        barraArriba(ctx);
        const tw = Math.floor((ANCHO - 24) / PAGINAS.length);
        flecha(ctx, 3, 5, -1, pag > 0 ? TINTA2 : GRIS);
        flecha(ctx, ANCHO - 8, 5, 1, pag < PAGINAS.length - 1 ? TINTA2 : GRIS);
        entrada.zona(0, 0, 12, 19, () => ir(-1));
        entrada.zona(ANCHO - 12, 0, 12, 19, () => ir(1));
        PAGINAS.forEach((id, i) => {
          const x = 12 + i * tw;
          const s = t(`stats.tab.${id}`);
          if (i === pag) {
            relleno(ctx, TINTA2, x + 1, 2, tw - 2, 14);
            texto2(ctx, s, x + Math.floor((tw - anchoTexto2(s)) / 2), 6, '#fdf0c0', null);
          } else texto2(ctx, s, x + Math.floor((tw - anchoTexto2(s)) / 2), 6, TINTA_SUAVE, null);
          entrada.zona(x, 0, tw, 19, () => irA(i));
        });
        // VOLVER.
        const yb = H - 32;
        const bw = 110;
        boton(ctx, Math.floor((ANCHO - bw) / 2), yb, bw, 26, t('stats.volver'), true);
        entrada.zona(Math.floor((ANCHO - bw) / 2), yb, bw, 26, volver);
      },
      accion(a: Accion) {
        if (a === 'izq') ir(-1);
        else if (a === 'der') ir(1);
        else if (a === 'arriba' || a === 'abajo') {
          if (PAGINAS[pag] === 'userit' && altoContenido <= pantalla().alto - 90) {
            // Nothing to scroll: ▲▼ pick the player.
            const i = orden.indexOf(jugSel);
            const k = Math.max(0, Math.min(n - 1, i + (a === 'abajo' ? 1 : -1)));
            if (orden[k] !== jugSel) {
              jugSel = orden[k];
              sonido.efecto('cursor');
            }
          } else scroll += a === 'abajo' ? 30 : -30;
        } else if (a === 'aceptar' || a === 'atras') volver();
        return true;
      },
      arrastre(_dx, dy, total, fin) {
        if (!fin) {
          if (Math.abs(total.y) > Math.abs(total.x)) scroll -= dy;
        } else if (Math.abs(total.x) > 30 && Math.abs(total.x) > Math.abs(total.y) * 1.5) ir(total.x < 0 ? 1 : -1);
      },
    };
    p.poner(e);
  });
}
