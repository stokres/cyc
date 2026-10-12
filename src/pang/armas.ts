// The four weapons: harpoon wires (single, double, wide, sticky) and Chuchi's bullets,
// including the triple piercing burst of his special.
import { efectoPop, sumar } from './base';
import { circuloRect } from './fisica';
import { golpearJefe } from './jefes';
import type { Bala, Cable, JugadorVivo, Mundo } from './mundo';
import { reventar } from './reglas';
import { AREA } from './tipos';

const VEL_CABLE = 200;
const VEL_BALA = 300;
const TOPE_FIJO = 2.5;
const ENFRIA_BALA = 0.14;
const ENFRIA_KINKI = 0.08;
const MAX_BALAS = 5;
const MAX_BALAS_KINKI = 48;
const ANGULOS_KINKI = [-12, 0, 12].map((a) => (a * Math.PI) / 180);
const LARGO_MAX = AREA.suelo - AREA.techo;

/** Wires in the air (not stuck) and in all, and bullets, of one player: the limits are per player. */
function cuenta(m: Mundo, dueno: number) {
  let vuelan = 0;
  let cables = 0;
  let balas = 0;
  for (const c of m.cables) {
    if (c.dueno !== dueno) continue;
    cables++;
    if (!c.fijo) vuelan++;
  }
  for (const b of m.balas) if (b.dueno === dueno) balas++;
  return { vuelan, cables, balas };
}

/** Player `j` fires if his weapon allows it now. Returns true if a shot left. */
export function disparar(m: Mundo, j: JugadorVivo): boolean {
  if (j.escalera >= 0) return false;
  const dueno = m.jugadores.indexOf(j);
  const arma = j.estilo.arma;
  const n = cuenta(m, dueno);
  if (j.kinki > 0) {
    if (j.enfriamiento > 0 || n.balas > MAX_BALAS_KINKI - 3) return false;
    for (const a of ANGULOS_KINKI) m.balas.push({ x: j.x, y: j.y - 10, vx: Math.sin(a) * VEL_BALA, vy: -Math.cos(a) * VEL_BALA, atraviesa: true, golpeadas: [], dueno });
    j.enfriamiento = ENFRIA_KINKI;
  } else if (arma === 'rafaga') {
    if (j.enfriamiento > 0 || n.balas >= MAX_BALAS) return false;
    m.balas.push({ x: j.x, y: j.y - 10, vx: 0, vy: -VEL_BALA, atraviesa: false, golpeadas: [], dueno });
    j.enfriamiento = ENFRIA_BALA;
  } else {
    const tope = arma === 'doble' ? 2 : 1;
    if (n.vuelan >= tope || n.cables >= tope + 2) return false;
    m.cables.push({ x: Math.round(j.x), base: j.y, punta: j.y - 2, ancho: arma === 'ancho' ? 7 : 3, fijo: false, t: 0, dueno });
  }
  j.disparoT = 0.15;
  m.sfx.disparo();
  return true;
}

function romperBloque(m: Mundo, j: JugadorVivo, k: number) {
  const b = m.bloques[k];
  m.bloques.splice(k, 1);
  efectoPop(m, b.x + b.w / 2, b.y + b.h / 2, 'cerveza', 3);
  m.sfx.romper();
  sumar(m, j, 100, b.x + b.w / 2, b.y);
}

function quitar<T>(lista: T[], i: number) {
  lista[i] = lista[lista.length - 1];
  lista.pop();
}

/** The bubble hit by the wire is burst; true if there was one. */
function cableContraBurbujas(m: Mundo, j: JugadorVivo, c: Cable): boolean {
  const th = c.ancho / 2;
  for (let k = m.burbujas.length - 1; k >= 0; k--) {
    const b = m.burbujas[k];
    if (!circuloRect(b.x, b.y, b.r, c.x - th, c.punta, c.ancho, c.base - c.punta)) continue;
    quitar(m.burbujas, k);
    reventar(m, j, b);
    return true;
  }
  return false;
}

export function actualizarArmas(m: Mundo, dt: number) {
  for (const p of m.jugadores) if (p.enfriamiento > 0) p.enfriamiento -= dt;
  for (let i = m.cables.length - 1; i >= 0; i--) {
    const c = m.cables[i];
    const j = m.jugadores[c.dueno];
    const pegajoso = j.estilo.arma === 'fijo';
    const th = c.ancho / 2;
    let fuera = false;
    if (c.fijo) {
      c.t += dt;
      if (c.t >= TOPE_FIJO) fuera = true;
    } else {
      c.punta -= VEL_CABLE * dt;
      for (let k = 0; k < m.bloques.length; k++) {
        const b = m.bloques[k];
        const fondo = b.y + b.h;
        if (fondo > c.base || c.punta > fondo || c.x + th <= b.x || c.x - th >= b.x + b.w) continue;
        c.punta = fondo;
        if (b.rompible) {
          romperBloque(m, j, k);
          fuera = true;
        } else if (pegajoso) c.fijo = true;
        else fuera = true;
        break;
      }
      if (!fuera && !c.fijo && c.punta <= AREA.techo) {
        c.punta = AREA.techo;
        if (pegajoso) c.fijo = true;
        else fuera = true;
      }
    }
    if (!fuera) {
      if (cableContraBurbujas(m, j, c)) fuera = true;
      else if (m.jefe && circuloRect(m.jefe.x, m.jefe.y, m.jefe.r, c.x - th, c.punta, c.ancho, c.base - c.punta)) {
        golpearJefe(m, j, 1);
        fuera = true;
      }
    }
    if (fuera) quitar(m.cables, i);
  }
  for (let i = m.balas.length - 1; i >= 0; i--) {
    const b = m.balas[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (balaTermina(m, b)) quitar(m.balas, i);
  }
}

/** Tests a bullet against the walls, blocks, bubbles and boss. True if it is spent. */
function balaTermina(m: Mundo, b: Bala): boolean {
  if (b.y < AREA.techo || b.x < AREA.izq || b.x > AREA.der) return true;
  for (let k = 0; k < m.bloques.length; k++) {
    const bl = m.bloques[k];
    if (b.x < bl.x || b.x > bl.x + bl.w || b.y < bl.y || b.y > bl.y + bl.h) continue;
    if (bl.rompible) romperBloque(m, m.jugadores[b.dueno], k);
    return true;
  }
  for (let k = m.burbujas.length - 1; k >= 0; k--) {
    const u = m.burbujas[k];
    if (b.atraviesa && b.golpeadas.includes(u.id)) continue;
    if (!circuloRect(u.x, u.y, u.r, b.x - 1, b.y - 3, 2, 6)) continue;
    quitar(m.burbujas, k);
    reventar(m, m.jugadores[b.dueno], u);
    if (!b.atraviesa) return true;
    b.golpeadas.push(u.id);
    for (const h of m.hijos) b.golpeadas.push(h.id);
  }
  const j = m.jefe;
  if (j && !(b.atraviesa && b.golpeadas.includes(-1)) && circuloRect(j.x, j.y, j.r, b.x - 1, b.y - 3, 2, 6)) {
    golpearJefe(m, m.jugadores[b.dueno], 0.34);
    if (!b.atraviesa || j.gorro) return true;
    b.golpeadas.push(-1);
  }
  return false;
}

// --- drawing ---------------------------------------------------------------------------

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

let cuerdas: Record<number, HTMLCanvasElement> | null = null;
let puntas: Record<number, HTMLCanvasElement> | null = null;

/** The rope (a zigzag, painted once, as long as the whole play area) and the arrow tip, per wire width. */
function preparar() {
  cuerdas = {};
  puntas = {};
  for (const ancho of [3, 7]) {
    const grosor = ancho === 3 ? 1 : 3;
    const c = lienzo(grosor + 1, LARGO_MAX);
    const x = c.getContext('2d')!;
    x.fillStyle = '#c9c2b4';
    for (let y = LARGO_MAX; y > 0; y -= 2) x.fillRect((y >> 1) % 2, y - 2, grosor, 2);
    cuerdas[ancho] = c;
    const tw = ancho + 2;
    const p = lienzo(tw, 5);
    const px = p.getContext('2d')!;
    px.fillStyle = '#e8e4d8';
    px.fillRect(0, 3, tw, 2);
    px.fillRect(1, 1, tw - 2, 2);
    px.fillRect(Math.floor(tw / 2), 0, 1, 1);
    puntas[ancho] = p;
  }
}

export function dibujarArmas(g: CanvasRenderingContext2D, m: Mundo) {
  if (!cuerdas || !puntas) preparar();
  for (const c of m.cables) {
    if (c.fijo && c.t > 2 && Math.floor(c.t * 10) % 2 === 0) continue;
    const cuerda = cuerdas![c.ancho];
    const largo = Math.min(LARGO_MAX, Math.round(c.base - c.punta));
    const x = Math.round(c.x);
    g.drawImage(cuerda, 0, LARGO_MAX - largo, cuerda.width, largo, x - Math.floor(cuerda.width / 2), Math.round(c.base) - largo, cuerda.width, largo);
    const punta = puntas![c.ancho];
    g.drawImage(punta, x - Math.floor(punta.width / 2), Math.round(c.base) - largo - 3);
  }
  for (const b of m.balas) {
    g.fillStyle = b.atraviesa ? '#ff9ad0' : '#fff6c8';
    g.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 3, 2, 6);
  }
}
