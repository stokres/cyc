// PokéUsera · the GUÍA: a paged help screen (CÓMO SE JUEGA, ESTADÍSTICAS, TIPOS, ESTADOS, REGLAS DEL BAR)
// that opens over whatever is on screen (main menu, pause box, draft card) and gives it back when closed.
// ◀ ▶ / swipe / the tabs change page; a long page scrolls (drag or ▲▼); VOLVER goes back.
// Everything it says lives in src/textos/pokeusera.md (`guia.*`, plus the older `ayuda.*` keys); the type
// table is read from `eficacia` in datos.ts, so it can never disagree with the engine.
import { ENTRENADORES, type Estado, type Tipo } from '../tipos';
import { TIPOS, eficacia } from '../datos';
import { anchoTexto2 } from '../arte2/fuente2';
import { PAPEL_ALTO, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { hornear, icono2, panelCacheado, relleno } from '../arte2/ui2';
import { COLOR_TIPO, NOMBRE_TIPO } from '../arte/paleta';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { sobre } from './modal';
import { ALTO_INSIGNIA, barraArriba, boton, envolver, etiquetaEstado, ficha, fondoPapel, flecha, insignaTipo, nombreEnt, rect, t, texto2 } from './ui';

export type PaginaGuia = 'como' | 'stats' | 'tipos' | 'estados' | 'reglas';
const PAGINAS: PaginaGuia[] = ['como', 'stats', 'tipos', 'estados', 'reglas'];

/** Accepts the page ids above and a few natural aliases («estadisticas», «juego», «bar»...). */
function indicePagina(p?: string): number {
  if (!p) return 0;
  const s = p
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (s.startsWith('tipo')) return 2;
  if (s === 'estado' || s === 'estados') return 3;
  if (s.startsWith('stat') || s.startsWith('estad') || s.startsWith('dato') || s.startsWith('cifra')) return 1;
  if (s.startsWith('regla') || s === 'bar') return 4;
  return 0;
}

const GRIS = '#a898a8';
const X0 = 4;
const AN = ANCHO - 8;

// ------------------------------------------------------------------ small pieces

/** A 13×13 «?» in a gold disc (the main menu's icon for the guide). */
export function iconoGuia(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const c = hornear('icono|guia', 13, 13, (cx) => {
    const filas = [
      '....kkkkk....',
      '..kkgggggkk..',
      '.kgggkkkgggk.',
      '.kggkgggkggk.',
      'kggggggkgggGk',
      'kgggggkgggggk',
      'kggggkgggggGk',
      'kgggggkgggGGk',
      '.kggggggggGk.',
      '.kgggggkgggk.',
      '..kkgGgkGkk..',
      '....kkkkk....',
      '.............',
    ];
    const col: Record<string, string> = { k: TINTA2, g: '#e8c25a', G: '#b08428' };
    filas.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) if (col[fila[i]]) rect(cx, col[fila[i]], i, j, 1, 1);
    });
  });
  ctx.drawImage(c, x, y);
}

const abrev = (tp: Tipo): string => NOMBRE_TIPO[tp].slice(0, 3).toUpperCase();

function luminoso(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

/** A flat coloured chip with the three-letter type tag (no border: it has to fit a 19 px column). */
function chipCorto(ctx: CanvasRenderingContext2D, tp: Tipo, x: number, y: number, w: number) {
  const c = COLOR_TIPO[tp];
  relleno(ctx, c, x, y, w, ALTO_INSIGNIA);
  rect(ctx, 'rgba(255,255,255,0.35)', x, y, w, 1);
  rect(ctx, 'rgba(0,0,0,0.25)', x, y + ALTO_INSIGNIA - 1, w, 1);
  const s = abrev(tp);
  texto2(ctx, s, x + Math.floor((w - anchoTexto2(s)) / 2), y + 2, luminoso(c) ? TINTA2 : '#fff8e8', null);
}

/**
 * Type badges (full name) in a wrapping row starting at (x, y). `ctx` null only measures. Returns the height used
 * (an empty list writes «Ninguno»). `sufijo` adds a small text after a badge (the draft card's «×4»).
 */
export function hileraTipos(ctx: CanvasRenderingContext2D | null, tipos: readonly Tipo[], x: number, y: number, maxW: number, sufijo?: (tp: Tipo) => string): number {
  if (!tipos.length) {
    if (ctx) texto2(ctx, t('guia.tipos.ninguno'), x + 2, y + 2, TINTA_SUAVE, null);
    return ALTO_INSIGNIA;
  }
  let cx = x;
  let cy = y;
  for (const tp of tipos) {
    const w = anchoTexto2(NOMBRE_TIPO[tp].toUpperCase()) + 7;
    const suf = sufijo?.(tp) ?? '';
    const sw = suf ? anchoTexto2(suf) + 3 : 0;
    if (cx > x && cx + w + sw > x + maxW) {
      cx = x;
      cy += ALTO_INSIGNIA + 2;
    }
    if (ctx) {
      insignaTipo(ctx, tp, cx, cy);
      if (suf) texto2(ctx, suf, cx + w + 2, cy + 2, TINTA2, null);
    }
    cx += w + sw + 3;
  }
  return cy - y + ALTO_INSIGNIA;
}

/** Types that an attack of type `a` hits for exactly `m` (2, 0.5 or 0) as a defender. */
export const defensoresCon = (a: Tipo, m: number): Tipo[] => TIPOS.filter((d) => eficacia(a, [d]) === m);
/** Types whose attacks hit a (one or two types) defender for double or more. */
export const atacantesFuertes = (def: readonly Tipo[]): Tipo[] => TIPOS.filter((a) => eficacia(a, def) >= 2);

interface OpcionesTarjeta {
  titulo?: string;
  cuerpo?: string;
  /** Left margin of the text (room for a badge). */
  sangria?: number;
  marca?: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
  /** Extra content below the text: its height and a drawing function. */
  pieAlto?: number;
  pie?: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number) => void;
  alto?: number;
}

/** A paper card with an optional badge, a title and a paragraph; returns its height. */
function tarjeta(ctx: CanvasRenderingContext2D, y: number, o: OpcionesTarjeta): number {
  const sang = o.sangria ?? 0;
  const tx = X0 + 8 + sang;
  const w = AN - 16 - sang;
  const lineas = o.cuerpo ? envolver(o.cuerpo, w) : [];
  const h = Math.max(o.alto ?? 0, 8 + (o.titulo ? 14 : 0) + lineas.length * 12 + (o.pieAlto ?? 0) + 5);
  panelCacheado(ctx, X0, y, AN, h);
  o.marca?.(ctx, X0 + 8, y + 8);
  let yy = y + 8;
  if (o.titulo) {
    texto2(ctx, o.titulo, tx, yy, TINTA2);
    yy += 14;
  }
  for (const l of lineas) {
    texto2(ctx, l, tx, yy, TINTA2, null);
    yy += 12;
  }
  o.pie?.(ctx, X0 + 8, yy, AN - 16);
  return h;
}

/** The page's heading: a title between two rules. */
function encabezado(ctx: CanvasRenderingContext2D, y: number, s: string): number {
  const w = anchoTexto2(s);
  const cx = Math.floor((ANCHO - w) / 2);
  texto2(ctx, s, cx, y + 3, TINTA2);
  rect(ctx, '#c4a860', X0 + 4, y + 6, cx - X0 - 12, 1);
  rect(ctx, '#c4a860', cx + w + 8, y + 6, ANCHO - X0 - 4 - (cx + w + 8), 1);
  return 18;
}

const insigniaNum = (n: number) => (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  relleno(ctx, TINTA2, x, y - 1, 16, 16);
  relleno(ctx, '#e8c25a', x + 1, y, 14, 14);
  rect(ctx, '#fff3c8', x + 2, y, 12, 1);
  const s = String(n);
  texto2(ctx, s, x + Math.floor((16 - anchoTexto2(s)) / 2), y + 4, TINTA2, null);
};

/** A coloured badge with the rule's key figure inside (1/2, ×2, turn 30...). */
const insigniaColor = (c: string, s: string) => (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  relleno(ctx, TINTA2, x, y - 1, 16, 16);
  relleno(ctx, c, x + 1, y, 14, 14);
  rect(ctx, 'rgba(255,255,255,0.4)', x + 2, y, 12, 1);
  rect(ctx, 'rgba(0,0,0,0.2)', x + 1, y + 13, 14, 1);
  texto2(ctx, s, x + Math.floor((16 - anchoTexto2(s)) / 2), y + 4, luminoso(c) ? TINTA2 : '#fff8e8', null);
};

// ------------------------------------------------------------------ the screen

/**
 * Opens the guide over `base` (whatever screen is showing; it keeps running underneath) and resolves when the
 * player closes it. `pagina`: 'como' | 'stats' | 'tipos' | 'estados' | 'reglas' (default: the first).
 */
export function abrirGuia(base: Escena | null, pagina?: string): Promise<void> {
  return sobre<void>(base, (cerrar) => {
    let pag = indicePagina(pagina);
    let scroll = 0;
    let altoContenido = 0;
    let selTipo: Tipo | null = null;
    let selCol: Tipo | null = null;
    const volver = () => {
      sonido.efecto('atras');
      cerrar();
    };
    const irA = (i: number) => {
      const n = Math.max(0, Math.min(PAGINAS.length - 1, i));
      if (n === pag) return;
      pag = n;
      scroll = 0;
      sonido.efecto('cursor');
    };

    // ---- CÓMO SE JUEGA
    const como = (ctx: CanvasRenderingContext2D, y0: number): number => {
      let y = y0 + encabezado(ctx, y0, t('guia.h.como'));
      for (let i = 1; i <= 5; i++) y += tarjeta(ctx, y, { titulo: t(`guia.como.${i}.t`), cuerpo: t(`guia.como.${i}.d`), sangria: 22, marca: insigniaNum(i) }) + 3;
      return y - y0;
    };

    // ---- ESTADÍSTICAS
    const stats = (ctx: CanvasRenderingContext2D, y0: number): number => {
      let y = y0 + encabezado(ctx, y0, t('guia.h.stats'));
      for (const k of ['ps', 'ata', 'def', 'esp', 'vel']) {
        const txt = t(`ayuda.stat.${k}`);
        const i = txt.indexOf(': ');
        const cuerpo = txt.slice(i + 2);
        y += tarjeta(ctx, y, { titulo: txt.slice(0, i), cuerpo: cuerpo.charAt(0).toUpperCase() + cuerpo.slice(1) }) + 3;
      }
      // The levels: a scale from -6 to +6 with what each end does to the stat (the engine's (2+n)/2 and 2/(2-n)).
      const ESC = 16;
      y += tarjeta(ctx, y, {
        titulo: t('guia.stats.niveles.t'),
        cuerpo: t('guia.stats.niveles.d'),
        pieAlto: ESC + 16,
        pie: (c, x, yy) => {
          const x1 = x + Math.floor((AN - 16 - 13 * ESC) / 2) + 4;
          for (let n = -6; n <= 6; n++) {
            const cx = x1 + (n + 6) * ESC;
            const f = Math.abs(n) / 6;
            const col = n === 0 ? '#e8dcc0' : n < 0 ? `rgb(${Math.round(232 - 20 * f)},${Math.round(150 - 70 * f)},${Math.round(120 - 50 * f)})` : `rgb(${Math.round(190 - 100 * f)},${Math.round(215 - 20 * f)},${Math.round(110 - 30 * f)})`;
            relleno(c, TINTA2, cx, yy + 2, ESC - 1, ESC - 2);
            relleno(c, col, cx + 1, yy + 3, ESC - 3, ESC - 4);
            if (n === -6 || n === 0 || n === 6 || n === -2 || n === 2) {
              const s = n > 0 ? `+${n}` : String(n);
              texto2(c, s, cx + Math.floor((ESC - 1 - anchoTexto2(s)) / 2), yy + 6, TINTA2, null);
            }
          }
          const lab = (s: string, n: number) => texto2(c, s, x1 + (n + 6) * ESC + Math.floor((ESC - 1 - anchoTexto2(s)) / 2), yy + ESC + 4, TINTA_SUAVE, null);
          lab('×1/4', -6);
          lab('×1/2', -2);
          lab('×1', 0);
          lab('×2', 2);
          lab('×4', 6);
        },
      }) + 3;
      y += tarjeta(ctx, y, { cuerpo: t('guia.stats.reparto') }) + 3;
      return y - y0;
    };

    // ---- TIPOS
    const PASO = 19;
    const CAB = 22;
    const ALTO_FILA = 16;
    const tipos = (ctx: CanvasRenderingContext2D, y0: number, yTop: number, yFin: number): number => {
      let y = y0 + encabezado(ctx, y0, t('guia.h.tipos'));
      const ejes = t('guia.tipos.ejes');
      texto2(ctx, ejes, Math.floor((ANCHO - anchoTexto2(ejes)) / 2), y, TINTA_SUAVE, null);
      y += 12;
      const xt = X0 + CAB - 3;
      const yt = y;
      const visible = (a: number, h: number) => a + h > yTop && a < yFin;
      // Column headers (who defends).
      TIPOS.forEach((d, c) => {
        const x = xt + c * PASO;
        chipCorto(ctx, d, x, yt, PASO - 1);
        if (visible(yt, 12)) entrada.zona(x, Math.max(yt, yTop), PASO, 12, () => elegirTipo(d, null));
      });
      // Rows (who attacks).
      TIPOS.forEach((a, r) => {
        const yr = yt + 13 + r * ALTO_FILA;
        chipCorto(ctx, a, X0, yr, CAB - 2);
        const hit = visible(yr, ALTO_FILA);
        if (hit) entrada.zona(X0, Math.max(yr, yTop), CAB, ALTO_FILA, () => elegirTipo(a, null));
        TIPOS.forEach((d, c) => {
          const x = xt + c * PASO;
          const m = eficacia(a, [d]);
          relleno(ctx, '#d6c08a', x, yr, PASO - 1, ALTO_FILA - 1);
          const col = m === 2 ? '#6cc05c' : m === 0.5 ? '#f0a43c' : m === 0 ? '#5a4660' : '#f8edd2';
          relleno(ctx, col, x + 1, yr + 1, PASO - 3, ALTO_FILA - 3);
          if (m !== 1) {
            rect(ctx, m === 2 ? '#8ad87c' : m === 0.5 ? '#f8c068' : '#6e5a70', x + 1, yr + 1, PASO - 3, 1);
            const s = m === 2 ? '2' : m === 0.5 ? '1/2' : '0';
            texto2(ctx, s, x + Math.floor((PASO - 1 - anchoTexto2(s)) / 2), yr + 4, m === 0 ? '#f0e4c8' : TINTA2, null);
          }
          if (hit) entrada.zona(x, Math.max(yr, yTop), PASO, ALTO_FILA, () => elegirTipo(a, d));
        });
      });
      const yFinTabla = yt + 13 + TIPOS.length * ALTO_FILA;
      // The selected type: its row and column framed (the tapped box in red).
      if (selTipo) {
        const r = TIPOS.indexOf(selTipo);
        const yr = yt + 13 + r * ALTO_FILA;
        const marco = (x: number, yy: number, w: number, h: number, col: string) => {
          rect(ctx, col, x, yy, w, 2);
          rect(ctx, col, x, yy + h - 2, w, 2);
          rect(ctx, col, x, yy, 2, h);
          rect(ctx, col, x + w - 2, yy, 2, h);
        };
        marco(X0 - 1, yr - 1, CAB + 11 * PASO + 1, ALTO_FILA + 1, TINTA2);
        const c = TIPOS.indexOf(selCol ?? selTipo);
        marco(xt + c * PASO - 1, yt - 1, PASO + 1, 13 + 11 * ALTO_FILA + 1, TINTA2);
        if (selCol) marco(xt + c * PASO - 1, yr - 1, PASO + 1, ALTO_FILA + 1, '#d4382c');
      }
      y = yFinTabla + 5;
      // Legend.
      const leyenda: [string, string, string][] = [
        ['#6cc05c', '2', t('guia.tipos.l.x2')],
        ['#f0a43c', '1/2', t('guia.tipos.l.x05')],
        ['#5a4660', '0', t('guia.tipos.l.x0')],
      ];
      const lw = Math.floor(AN / 3);
      leyenda.forEach(([col, n, s], i) => {
        const x = X0 + 2 + i * lw;
        relleno(ctx, '#d6c08a', x, y, 19, 11);
        relleno(ctx, col, x + 1, y + 1, 17, 9);
        texto2(ctx, n, x + Math.floor((19 - anchoTexto2(n)) / 2), y + 2, n === '0' ? '#f0e4c8' : TINTA2, null);
        texto2(ctx, s, x + 23, y + 2, TINTA2, null);
      });
      y += 16;
      // What the tapped type does.
      if (!selTipo) y += tarjeta(ctx, y, { cuerpo: t('guia.tipos.toca') }) + 3;
      else {
        const sel = selTipo;
        const grupos: [string, Tipo[]][] = [
          [t('guia.tipos.fuerte'), defensoresCon(sel, 2)],
          [t('guia.tipos.flojo'), defensoresCon(sel, 0.5)],
          [t('guia.tipos.nada'), defensoresCon(sel, 0)],
          [t('guia.tipos.recibe'), atacantesFuertes([sel])],
        ];
        const w = AN - 16;
        let alto = 0;
        for (const [, l] of grupos) alto += 12 + hileraTipos(null, l, 0, 0, w) + 3;
        let par = '';
        if (selCol) {
          const m = eficacia(sel, [selCol]);
          par = t('guia.tipos.par', { a: NOMBRE_TIPO[sel].toUpperCase(), d: NOMBRE_TIPO[selCol].toUpperCase(), r: t(`guia.tipos.r.${m === 0.5 ? '05' : m}`) });
        }
        y +=
          tarjeta(ctx, y, {
            cuerpo: par,
            pieAlto: alto + (par ? 3 : 0),
            pie: (c, x, yy) => {
              let q = yy + (par ? 3 : 0);
              for (const [lab, l] of grupos) {
                texto2(c, lab, x, q, TINTA_SUAVE, null);
                q += 12;
                q += hileraTipos(c, l, x, q, w) + 3;
              }
            },
          }) + 3;
      }
      y += tarjeta(ctx, y, { titulo: t('guia.tipos.t'), cuerpo: t('ayuda.tipos') }) + 3;
      return y - y0;
    };
    const elegirTipo = (a: Tipo, d: Tipo | null) => {
      selTipo = a;
      selCol = d;
      sonido.efecto('cursor');
    };

    // ---- ESTADOS
    const ESTADOS: (Estado | 'achispado')[] = ['dormido', 'paralizado', 'quemado', 'empachado', 'achispado'];
    const estados = (ctx: CanvasRenderingContext2D, y0: number): number => {
      let y = y0 + encabezado(ctx, y0, t('guia.h.estados'));
      for (const e of ESTADOS) y += tarjeta(ctx, y, { cuerpo: t(`ayuda.estado.${e}`), sangria: 34, alto: 30, marca: (c, x, yy) => etiquetaEstado(c, e, x, yy - 1) }) + 3;
      y += tarjeta(ctx, y, { cuerpo: t('guia.estados.nota') }) + 3;
      return y - y0;
    };

    // ---- REGLAS DEL BAR
    // [id, badge colour, the figure on the badge]
    const REGLAS: [string, string, string][] = [
      ['acorralado', '#d4382c', '1/2'],
      ['venganza', '#a85cc4', '×2'],
      ['cierre', '#5a6aa8', '30'],
      ['grada', '#3a9a44', '3'],
      ['cana', '', ''],
    ];
    const reglas = (ctx: CanvasRenderingContext2D, y0: number): number => {
      let y = y0 + encabezado(ctx, y0, t('guia.h.reglas'));
      for (const [id, col, cifra] of REGLAS)
        y +=
          tarjeta(ctx, y, {
            titulo: t(`guia.reglas.${id}.t`),
            cuerpo: t(`guia.reglas.${id}.d`),
            sangria: 22,
            marca: col
              ? insigniaColor(col, cifra)
              : (c, x, yy) => {
                  relleno(c, TINTA2, x, yy - 1, 16, 16);
                  relleno(c, PAPEL_ALTO, x + 1, yy, 14, 14);
                  icono2(c, 'cana', x + 1, yy);
                },
          }) + 3;
      // One small perk per trainer (the engine applies them: motor/combate.ts).
      y += 4 + encabezado(ctx, y + 4, t('guia.h.perks'));
      y += tarjeta(ctx, y, { cuerpo: t('guia.perks.nota') }) + 3;
      for (const id of ENTRENADORES)
        y +=
          tarjeta(ctx, y, {
            titulo: `${nombreEnt(id)}: ${t(`entrenador.${id}.perk`)}`,
            cuerpo: t(`entrenador.${id}.perk_d`),
            sangria: 22,
            alto: 30,
            marca: (c, x, yy) => ficha(c, id, x, yy - 1, 18),
          }) + 3;
      return y - y0;
    };

    const e: Escena = {
      dibujar(ctx) {
        const H = pantalla().alto;
        fondoPapel(ctx, H);
        const yTop = 22;
        const yFin = H - 36;
        const alto = yFin - yTop;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, yTop, ANCHO, alto);
        ctx.clip();
        const base = yTop + 2 - scroll;
        const id = PAGINAS[pag];
        altoContenido = id === 'como' ? como(ctx, base) : id === 'stats' ? stats(ctx, base) : id === 'tipos' ? tipos(ctx, base, yTop, yFin) : id === 'estados' ? estados(ctx, base) : reglas(ctx, base);
        ctx.restore();
        const maxScroll = Math.max(0, altoContenido + 6 - alto);
        scroll = Math.max(0, Math.min(maxScroll, scroll));
        if (maxScroll > 0) {
          const bh = Math.max(12, Math.round((alto * alto) / (altoContenido + 6)));
          const by = yTop + Math.round(((alto - bh) * scroll) / maxScroll);
          rect(ctx, TINTA2, ANCHO - 3, by, 3, bh);
        }
        // Top bar: ◀ tabs ▶.
        barraArriba(ctx);
        // Tabs as wide as their label, the spare width shared out evenly.
        const nombres = PAGINAS.map((p) => t(`guia.tab.${p}`));
        const extra = Math.floor((ANCHO - 24 - nombres.reduce((a, n) => a + anchoTexto2(n), 0)) / PAGINAS.length);
        flecha(ctx, 3, 5, -1, pag > 0 ? TINTA2 : GRIS);
        flecha(ctx, ANCHO - 8, 5, 1, pag < PAGINAS.length - 1 ? TINTA2 : GRIS);
        entrada.zona(0, 0, 12, 19, () => irA(pag - 1));
        entrada.zona(ANCHO - 12, 0, 12, 19, () => irA(pag + 1));
        let x = 12;
        PAGINAS.forEach((_p, i) => {
          const s = nombres[i];
          const tw = anchoTexto2(s) + extra;
          if (i === pag) {
            relleno(ctx, TINTA2, x + 1, 2, tw - 2, 14);
            texto2(ctx, s, x + Math.floor((tw - anchoTexto2(s)) / 2), 6, '#fdf0c0', null);
          } else texto2(ctx, s, x + Math.floor((tw - anchoTexto2(s)) / 2), 6, TINTA_SUAVE, null);
          entrada.zona(x, 0, tw, 19, () => irA(i));
          x += tw;
        });
        // VOLVER.
        const bw = 110;
        boton(ctx, Math.floor((ANCHO - bw) / 2), H - 32, bw, 26, t('guia.volver'), true);
        entrada.zona(Math.floor((ANCHO - bw) / 2), H - 32, bw, 26, volver);
      },
      accion(a: Accion) {
        if (a === 'izq') irA(pag - 1);
        else if (a === 'der') irA(pag + 1);
        else if (a === 'arriba' || a === 'abajo') scroll += a === 'abajo' ? 30 : -30;
        else if (a === 'aceptar' || a === 'atras') volver();
        return true;
      },
      arrastre(_dx, dy, total, fin) {
        if (!fin) {
          if (Math.abs(total.y) > Math.abs(total.x)) scroll -= dy;
        } else if (Math.abs(total.x) > 30 && Math.abs(total.x) > Math.abs(total.y) * 1.5) irA(pag + (total.x < 0 ? 1 : -1));
      },
    };
    return e;
  });
}
