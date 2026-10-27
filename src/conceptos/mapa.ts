// The pause map of «Una más»: a hand-drawn map on parchment (wobbly ink lines, rooms painted in their zone's colour, a name for each zone, little icons for
// the bars, the friends, the bosses and the sips, and Fran's face where he is). It is drawn ONCE when the map is opened (not per frame): a couple of
// hundred canvas calls, no SVG.
import { texto } from '../juego/textos';
import type { Arte } from './arte';
import { SALAS, TILE, type Amigo, type Sala, type Zona } from './datos';
import type { Cuadro } from './rig';
import type { Mundo } from './mundo';

const TITULO = "'Graduate', 'Alegreya Sans', serif";
const CUERPO = "'Alegreya Sans', sans-serif";
const TINTA = '#3a2616';

/** Paint colour of each zone on the map. */
export const COLOR_ZONA: Record<Zona, string> = { recibidor: '#e8935a', jardin: '#5cb86f', bandeja: '#6fa0d8', teatro: '#c25a8a', grifo: '#e8b83a' };

/** A small deterministic noise (0..1) so that the same room is always wobbly in the same way. */
function ruido(sem: string, i: number): number {
  let h = 2166136261;
  for (let k = 0; k < sem.length; k++) h = Math.imul(h ^ sem.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (i * 374761393), 668265263);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519);
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
}

/** A rounded rectangle with a hand-drawn tremble (it is drawn as a path; fill and stroke are up to the caller). */
function trazarForma(x: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, sem: string, tremor = 2.2, radio = 0.28) {
  const pts: [number, number][] = [];
  const n = 5;
  const r = Math.min(w, h) * radio;
  // Corners and mid-points around the shape, each nudged a little.
  const base: [number, number][] = [];
  for (let i = 0; i < n; i++) base.push([-w / 2 + r + ((w - 2 * r) * i) / (n - 1), -h / 2]);
  base.push([w / 2, -h / 2 + r]);
  for (let i = 0; i < n; i++) base.push([w / 2 - r - ((w - 2 * r) * i) / (n - 1), h / 2]);
  base.push([-w / 2, h / 2 - r]);
  base.forEach(([px, py], i) => pts.push([cx + px + (ruido(sem, i * 2) - 0.5) * tremor * 2, cy + py + (ruido(sem, i * 2 + 1) - 0.5) * tremor * 2]));
  x.beginPath();
  const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(pts[pts.length - 1], pts[0]);
  x.moveTo(m0[0], m0[1]);
  for (let i = 0; i < pts.length; i++) {
    const m = mid(pts[i], pts[(i + 1) % pts.length]);
    x.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  x.closePath();
}

/** An ink line with a gentle wobble between two points. */
function linea(x: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, sem: string, tremor = 3) {
  const mx = (ax + bx) / 2 + (ruido(sem, 0) - 0.5) * tremor * 2;
  const my = (ay + by) / 2 + (ruido(sem, 1) - 0.5) * tremor * 2;
  x.beginPath();
  x.moveTo(ax, ay);
  x.quadraticCurveTo(mx, my, bx, by);
  x.stroke();
}

function pergamino(x: CanvasRenderingContext2D, W: number, H: number) {
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#f3e2b9');
  g.addColorStop(0.7, '#e6cd99');
  g.addColorStop(1, '#c9a468');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // Stains and fibres.
  for (let i = 0; i < 90; i++) {
    const px = ruido('mancha', i * 3) * W;
    const py = ruido('mancha', i * 3 + 1) * H;
    const r = 6 + ruido('mancha', i * 3 + 2) * 34;
    const s = x.createRadialGradient(px, py, 0, px, py, r);
    s.addColorStop(0, 'rgba(150,100,40,0.07)');
    s.addColorStop(1, 'rgba(150,100,40,0)');
    x.fillStyle = s;
    x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  x.strokeStyle = 'rgba(120,80,30,0.09)';
  x.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const px = ruido('fibra', i * 3) * W;
    const py = ruido('fibra', i * 3 + 1) * H;
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + (ruido('fibra', i * 3 + 2) - 0.5) * 60, py + (ruido('fibra', i * 3 + 2) - 0.3) * 18);
    x.stroke();
  }
  // Hand-drawn frame, doubled.
  x.strokeStyle = TINTA;
  x.lineCap = 'round';
  for (const [k, a, w] of [[0, 1, 3], [1, 0.45, 1.5]] as const) {
    x.globalAlpha = a;
    x.lineWidth = w;
    const m = 10 + k * 5;
    trazarForma(x, W / 2, H / 2, W - m * 2, H - m * 2, `marco${k}`, 3, 0.03);
    x.stroke();
  }
  x.globalAlpha = 1;
}

// ---------------------------------------------------------------- icons

function jarra(x: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  x.fillStyle = '#f0a21e';
  x.strokeStyle = TINTA;
  x.lineWidth = Math.max(1.4, s * 0.1);
  x.beginPath();
  x.roundRect(cx - s * 0.34, cy - s * 0.4, s * 0.62, s * 0.8, s * 0.08);
  x.fill();
  x.stroke();
  x.beginPath();
  x.arc(cx + s * 0.3, cy, s * 0.2, -1.2, 1.2);
  x.stroke();
  x.fillStyle = '#fff6dc';
  x.beginPath();
  x.arc(cx - s * 0.2, cy - s * 0.42, s * 0.16, 0, 6.3);
  x.arc(cx + s * 0.02, cy - s * 0.48, s * 0.19, 0, 6.3);
  x.arc(cx + s * 0.2, cy - s * 0.4, s * 0.14, 0, 6.3);
  x.fill();
}

function gota(x: CanvasRenderingContext2D, cx: number, cy: number, s: number, llena: boolean) {
  x.beginPath();
  x.moveTo(cx, cy - s * 0.5);
  x.quadraticCurveTo(cx + s * 0.5, cy + s * 0.05, cx, cy + s * 0.45);
  x.quadraticCurveTo(cx - s * 0.5, cy + s * 0.05, cx, cy - s * 0.5);
  x.closePath();
  if (llena) {
    x.fillStyle = '#ffc93a';
    x.fill();
  }
  x.strokeStyle = llena ? TINTA : 'rgba(58,38,22,0.55)';
  x.lineWidth = Math.max(1.3, s * 0.1);
  if (!llena) x.setLineDash([2, 2]);
  x.stroke();
  x.setLineDash([]);
}

function despertador(x: CanvasRenderingContext2D, cx: number, cy: number, s: number, vencido: boolean) {
  x.strokeStyle = TINTA;
  x.lineWidth = Math.max(1.4, s * 0.1);
  x.fillStyle = vencido ? '#b9a98a' : '#d6385a';
  for (const dx of [-1, 1]) {
    x.beginPath();
    x.arc(cx + dx * s * 0.32, cy - s * 0.4, s * 0.18, 0, 6.3);
    x.fill();
    x.stroke();
  }
  x.beginPath();
  x.arc(cx, cy, s * 0.42, 0, 6.3);
  x.fill();
  x.stroke();
  x.fillStyle = '#fff3d6';
  x.beginPath();
  x.arc(cx, cy, s * 0.3, 0, 6.3);
  x.fill();
  x.beginPath();
  x.moveTo(cx, cy - s * 0.2);
  x.lineTo(cx, cy);
  x.lineTo(cx + s * 0.14, cy + s * 0.06);
  x.stroke();
  if (vencido) {
    x.strokeStyle = '#2f8a4a';
    x.lineWidth = Math.max(2, s * 0.16);
    x.beginPath();
    x.moveTo(cx - s * 0.3, cy + s * 0.05);
    x.lineTo(cx - s * 0.06, cy + s * 0.3);
    x.lineTo(cx + s * 0.42, cy - s * 0.32);
    x.stroke();
  }
}

/** A character's face in a round frame. `gris`: not rescued yet (greyed, with a question mark). */
function cara(x: CanvasRenderingContext2D, f: Cuadro, cx: number, cy: number, d: number, gris: boolean, aro: string) {
  x.save();
  x.beginPath();
  x.arc(cx, cy, d / 2, 0, 6.3);
  x.fillStyle = '#fbf0d0';
  x.fill();
  x.clip();
  const r = Math.max(f.c.width, f.c.height);
  const k = (d * 1.18) / r;
  const w = f.c.width * k;
  const h = f.c.height * k;
  if (gris) x.globalAlpha = 0.55;
  x.drawImage(f.c, cx - w / 2, cy - h / 2 + d * 0.04, w, h);
  x.globalAlpha = 1;
  if (gris) {
    x.fillStyle = 'rgba(70,50,90,0.45)';
    x.fillRect(cx - d, cy - d, d * 2, d * 2);
  }
  x.restore();
  x.strokeStyle = aro;
  x.lineWidth = Math.max(2, d * 0.1);
  x.beginPath();
  x.arc(cx, cy, d / 2, 0, 6.3);
  x.stroke();
  if (gris) {
    x.fillStyle = '#fff3d6';
    x.font = `700 ${Math.round(d * 0.6)}px ${TITULO}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('?', cx, cy + d * 0.04);
  }
}

// ---------------------------------------------------------------- the map

interface Nodo {
  sala: Sala;
  /** Grid cell of the room. */
  gx: number;
  gy: number;
  visto: boolean;
}

/**
 * Paints the whole map onto the canvas (already at its real pixel size). `visitadas` are the rooms Fran has walked into; their neighbours that he has not
 * seen yet appear as a «?» on a dashed path.
 */
export function dibujarMapa(c: HTMLCanvasElement, m: Mundo, arte: Arte, pan: { x: number } = { x: 0 }) {
  const x = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  const u = Math.max(0.8, Math.min(W / 800, H / 360)) * (c.width > 1200 ? 0.9 : 1);
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.clearRect(0, 0, W, H);
  pergamino(x, W, H);

  // The rooms that count: the visited ones, and their unvisited neighbours (as «?»).
  const nodos = new Map<string, Nodo>();
  for (const id of m.visitadas) {
    const s = SALAS[id];
    if (s) nodos.set(id, { sala: s, gx: s.mapa.x, gy: s.mapa.y, visto: true });
  }
  const vecinos = (s: Sala) => [...s.salidas.map((e) => e.sala), ...s.puertas.map((p) => p.sala)].filter((id) => SALAS[id]);
  for (const n of [...nodos.values()]) {
    for (const id of vecinos(n.sala)) if (!nodos.has(id)) nodos.set(id, { sala: SALAS[id], gx: SALAS[id].mapa.x, gy: SALAS[id].mapa.y, visto: false });
  }
  if (!nodos.size) return;
  const lista = [...nodos.values()];
  const gx0 = Math.min(...lista.map((n) => n.gx));
  const gx1 = Math.max(...lista.map((n) => n.gx));
  const gy0 = Math.min(...lista.map((n) => n.gy));
  const gy1 = Math.max(...lista.map((n) => n.gy));
  // The drawing area: leaves room for the title (top) and the key (bottom).
  const top = 58 * u;
  const bajo = 70 * u;
  const lado = 34 * u;
  const aw = W - lado * 2;
  const ah = H - top - bajo;
  let celdaX = Math.min(150 * u, aw / (gx1 - gx0 + 1));
  // A map too wide to read fits no more: the cells keep a readable size, it opens centred on Fran and can be dragged sideways (`pan`).
  const ancha = celdaX < 78 * u;
  if (ancha) celdaX = 78 * u;
  const celdaY = Math.min(110 * u, ah / (gy1 - gy0 + 1.35));
  const k = Math.min(celdaX, celdaY * 1.3);
  const aqui0 = nodos.get(m.sala.id);
  const centro = ancha && aqui0 ? aqui0.gx : (gx0 + gx1) / 2;
  const ox0 = lado + aw / 2 - centro * celdaX;
  if (ancha) pan.x = Math.max(W - lado - celdaX * 0.6 - (ox0 + gx1 * celdaX), Math.min(lado + celdaX * 0.6 - (ox0 + gx0 * celdaX), pan.x));
  else pan.x = 0;
  const ox = ox0 + pan.x;
  const oy = top + ah / 2 - ((gy0 + gy1) / 2) * celdaY + 6 * u;
  const px = (gx: number) => ox + gx * celdaX;
  const py = (gy: number) => oy + gy * celdaY;
  const rw = (s: Sala) => Math.min(celdaX * 0.82, k * (0.55 + 0.38 * Math.min(1, s.cols / 50)));
  const rh = (s: Sala) => Math.min(celdaY * 0.6, k * (0.4 + 0.2 * Math.min(1, s.rows / 15)));

  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.textBaseline = 'alphabetic';

  // ---- zone halos and names
  const zonas = new Map<Zona, Nodo[]>();
  for (const n of lista) if (n.visto) zonas.set(n.sala.zona, [...(zonas.get(n.sala.zona) ?? []), n]);
  for (const [z, ns] of zonas) {
    x.fillStyle = COLOR_ZONA[z];
    x.globalAlpha = 0.2;
    for (const n of ns) {
      trazarForma(x, px(n.gx), py(n.gy), rw(n.sala) + 26 * u, rh(n.sala) + 26 * u, `halo${n.sala.id}`, 5);
      x.fill();
    }
    x.globalAlpha = 1;
  }

  // ---- paths between rooms
  x.strokeStyle = TINTA;
  const hechas = new Set<string>();
  for (const n of lista) {
    const conexiones: { id: string; puerta: boolean }[] = [...n.sala.salidas.map((e) => ({ id: e.sala, puerta: false })), ...n.sala.puertas.map((p) => ({ id: p.sala, puerta: true }))];
    for (const cn of conexiones) {
      const o = nodos.get(cn.id);
      if (!o || (!n.visto && !o.visto)) continue;
      const clave = [n.sala.id, o.sala.id].sort().join('|') + (cn.puerta ? 'p' : '');
      if (hechas.has(clave)) continue;
      hechas.add(clave);
      const ax = px(n.gx);
      const ay = py(n.gy);
      const bx = px(o.gx);
      const by = py(o.gy);
      const d = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / d;
      const uy = (by - ay) / d;
      // Start and end at the edge of each shape.
      const borde = (s: Sala) => {
        const tx = Math.abs(ux) > 1e-3 ? rw(s) / 2 / Math.abs(ux) : 1e9;
        const ty = Math.abs(uy) > 1e-3 ? rh(s) / 2 / Math.abs(uy) : 1e9;
        return Math.min(tx, ty);
      };
      x.lineWidth = Math.max(2, 3 * u);
      x.globalAlpha = n.visto && o.visto ? 1 : 0.6;
      if (cn.puerta) x.setLineDash([7 * u, 6 * u]);
      linea(x, ax + ux * borde(n.sala), ay + uy * borde(n.sala), bx - ux * borde(o.sala), by - uy * borde(o.sala), clave, 4 * u);
      x.setLineDash([]);
      x.globalAlpha = 1;
      if (cn.puerta) {
        // A little door on the path: an arch.
        const e1 = borde(n.sala);
        const e2 = borde(o.sala);
        const mx = (ax + ux * e1 + bx - ux * e2) / 2;
        const my = (ay + uy * e1 + by - uy * e2) / 2;
        const s = 7 * u;
        x.fillStyle = '#f3e2b9';
        x.lineWidth = Math.max(1.6, 2.2 * u);
        x.beginPath();
        x.moveTo(mx - s, my + s);
        x.lineTo(mx - s, my - s * 0.2);
        x.arc(mx, my - s * 0.2, s, Math.PI, 0);
        x.lineTo(mx + s, my + s);
        x.closePath();
        x.fill();
        x.stroke();
      }
    }
  }

  // ---- the rooms
  for (const n of lista) {
    const s = n.sala;
    const cx = px(n.gx);
    const cy = py(n.gy);
    const w = rw(s);
    const h = rh(s);
    if (!n.visto) {
      // Not seen yet: a dashed outline with a question mark.
      x.setLineDash([5 * u, 5 * u]);
      x.strokeStyle = 'rgba(58,38,22,0.6)';
      x.lineWidth = Math.max(1.6, 2.2 * u);
      trazarForma(x, cx, cy, w * 0.7, h * 0.8, `sombra${s.id}`, 2);
      x.stroke();
      x.setLineDash([]);
      x.fillStyle = 'rgba(58,38,22,0.7)';
      x.font = `700 ${Math.round(22 * u)}px ${TITULO}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('?', cx, cy + 2 * u);
      continue;
    }
    const aqui = s.id === m.sala.id;
    // A soft shadow, the paint, and the double ink line.
    trazarForma(x, cx + 2.5 * u, cy + 3 * u, w, h, s.id);
    x.fillStyle = 'rgba(60,35,15,0.25)';
    x.fill();
    trazarForma(x, cx, cy, w, h, s.id);
    const gr = x.createLinearGradient(cx, cy - h / 2, cx, cy + h / 2);
    gr.addColorStop(0, COLOR_ZONA[s.zona]);
    gr.addColorStop(1, COLOR_ZONA[s.zona] + 'bb');
    x.fillStyle = gr;
    x.fill();
    x.strokeStyle = TINTA;
    x.lineWidth = Math.max(2.4, 3.2 * u);
    x.stroke();
    x.globalAlpha = 0.4;
    x.lineWidth = Math.max(1, 1.4 * u);
    trazarForma(x, cx, cy, w - 7 * u, h - 7 * u, s.id + 'b', 2.6);
    x.stroke();
    x.globalAlpha = 1;
    if (aqui) {
      x.strokeStyle = '#fff6d8';
      x.lineWidth = Math.max(2, 2.4 * u);
      trazarForma(x, cx, cy, w + 9 * u, h + 9 * u, s.id + 'a', 3);
      x.stroke();
    }

    // ---- what the room holds
    const iconos: (() => void)[] = [];
    const t = Math.round(Math.min(h * 0.46, 22 * u));
    const hecho = (id: string) => m.prog.hechos.has(id);
    if (s.flor) {
      const q = s.flor.quien as Amigo;
      const fr = arte[q].retrato[0];
      const libre = hecho(q);
      iconos.push(() => cara(x, fr, 0, 0, t * 1.15, !libre, libre ? '#ffd24a' : TINTA));
    }
    if (s.jefe) {
      const vencido = hecho(`${s.id}.gran.0`) || hecho(`${s.id}.jefe`);
      iconos.push(() => despertador(x, 0, 0, t, vencido));
    }
    for (let i = 0; i < s.barras.length; i++) iconos.push(() => jarra(x, 0, 0, t));
    for (const sb of s.sorbos) iconos.push(() => gota(x, 0, 0, t * 0.9, hecho(sb.id)));
    const paso = t * 1.05;
    const ancho = iconos.length * paso;
    iconos.forEach((f, i) => {
      x.save();
      x.translate(cx - ancho / 2 + paso * (i + 0.5), cy + (aqui ? h * 0.1 : 0));
      f();
      x.restore();
    });
  }

  // ---- Fran's face, where he is in his room
  const sa = m.sala;
  const na = nodos.get(sa.id);
  if (na) {
    const cx = px(na.gx);
    const cy = py(na.gy);
    const w = rw(sa);
    const h = rh(sa);
    const fx = Math.max(0.15, Math.min(0.85, m.j.x / (sa.cols * TILE)));
    const fy = Math.max(0.2, Math.min(0.8, m.j.y / (sa.rows * TILE)));
    const bx = cx + (fx - 0.5) * w * 0.8;
    const by = cy - h / 2 - 2 * u + (fy - 0.5) * 0; // above the room, with a pointer into it
    const d = Math.round(36 * u);
    const sx = bx;
    const sy = by - d * 0.62;
    x.fillStyle = '#fff6d8';
    x.strokeStyle = TINTA;
    x.lineWidth = Math.max(2, 2.6 * u);
    x.beginPath();
    x.moveTo(sx - d * 0.2, sy + d * 0.4);
    x.lineTo(sx, by + (cy - by) * 0.55 + (fy - 0.5) * h * 0.4);
    x.lineTo(sx + d * 0.2, sy + d * 0.4);
    x.closePath();
    x.fill();
    x.stroke();
    cara(x, arte.fran.retrato[0], sx, sy, d, false, '#fff6d8');
    x.strokeStyle = TINTA;
    x.lineWidth = Math.max(1.4, 1.8 * u);
    x.beginPath();
    x.arc(sx, sy, d / 2 + 1.5 * u, 0, 6.3);
    x.stroke();
    x.fillStyle = TINTA;
    x.font = `700 ${Math.round(14 * u)}px ${CUERPO}`;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.strokeStyle = 'rgba(243,226,185,0.9)';
    x.lineWidth = 4 * u;
    const rot = texto('mapa.aqui');
    x.strokeText(rot, sx, sy - d / 2 - 5 * u);
    x.fillText(rot, sx, sy - d / 2 - 5 * u);
  }

  // ---- zone names (over the halos, in ink)
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  for (const [z, ns] of zonas) {
    const gxm = ns.reduce((a, n) => a + n.gx, 0) / ns.length;
    const gym = Math.max(...ns.map((n) => n.gy));
    // Under the zone's lowest rooms: it never clashes with the face above the current room.
    const tx = px(gxm);
    const ty = py(gym) + Math.max(...ns.filter((n) => n.gy === gym).map((n) => rh(n.sala))) / 2 + 20 * u;
    x.font = `700 ${Math.round(17 * u)}px ${TITULO}`;
    const nombre = texto(`zona.${z}`);
    x.strokeStyle = 'rgba(243,226,185,0.95)';
    x.lineWidth = 5 * u;
    x.strokeText(nombre, tx, ty);
    x.fillStyle = darken(COLOR_ZONA[z]);
    x.fillText(nombre, tx, ty);
  }

  // ---- title and key
  x.textBaseline = 'alphabetic';
  x.fillStyle = TINTA;
  x.textAlign = 'center';
  x.font = `700 ${Math.round(30 * u)}px ${TITULO}`;
  x.fillText(texto('mapa.titulo'), W / 2, 44 * u);
  x.lineWidth = Math.max(2, 2.5 * u);
  x.strokeStyle = TINTA;
  linea(x, W / 2 - 90 * u, 52 * u, W / 2 + 90 * u, 52 * u, 'subraya', 3 * u);
  const leyenda: [string, (cx: number, cy: number, s: number) => void][] = [
    ['mapa.leyenda.barra', (cx, cy, s) => jarra(x, cx, cy, s)],
    ['mapa.leyenda.sorbo', (cx, cy, s) => gota(x, cx, cy, s * 0.9, true)],
    ['mapa.leyenda.amigo', (cx, cy, s) => cara(x, arte.guille.retrato[0], cx, cy, s * 1.1, false, '#ffd24a')],
    ['mapa.leyenda.jefe', (cx, cy, s) => despertador(x, cx, cy, s, false)],
  ];
  x.font = `600 ${Math.round(15 * u)}px ${CUERPO}`;
  const s = 18 * u;
  const anchos = leyenda.map(([k2]) => x.measureText(texto(k2)).width + s * 1.9);
  const total = anchos.reduce((a, b) => a + b, 0);
  let lx = W / 2 - total / 2;
  const ly = H - 26 * u;
  leyenda.forEach(([k2, f], i) => {
    f(lx + s * 0.6, ly - 4 * u, s);
    x.textAlign = 'left';
    x.fillStyle = TINTA;
    x.font = `600 ${Math.round(15 * u)}px ${CUERPO}`;
    x.fillText(texto(k2), lx + s * 1.5, ly);
    lx += anchos[i];
  });
}

/** A darker version of a `#rrggbb` colour (for the zone names). */
function darken(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.5;
  return `rgb(${Math.round(((n >> 16) & 255) * f)},${Math.round(((n >> 8) & 255) * f)},${Math.round((n & 255) * f)})`;
}
