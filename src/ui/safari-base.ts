// What every shot of the safari comic shares (src/ui/safari.ts): the shape of a shot, the layers that scroll, and the
// caravan itself (the trailer's, with the comic's ink and a few trimmings). Painted once; a frame only draws images.
import { pintarVehiculo, type Vehiculo } from './vehiculo-pintura';
import { TINTA, alfa, elipse, lienzo, pintarPuff, pintarRueda, rellenar, trama, type X } from './safari-dibujo';

/** Seconds since each named event of the page began (an onomatopoeia that has not come yet is not there). */
export type Evento = Record<string, number>;

export interface Medidas {
  w: number;
  h: number;
  dp: number;
}

export interface Escena {
  /** One frame: `t` seconds since the shot came in. Draws inside (0, 0)-(w, h), already clipped. */
  pintar(x: X, t: number, ev: Evento): void;
  /** Where the speech bubbles' tails aim: the caravan's window, as fractions of the shot. */
  ventana: [number, number];
  liberar(): void;
}

export type Constructor = (m: Medidas) => Escena;

// ---------------------------------------------------------------- layers that scroll

export interface Tile {
  img: HTMLCanvasElement;
  w: number;
  h: number;
}

/** A layer baked at `w`×`h` CSS px that repeats sideways without a seam (paint it so its two ends meet). */
export function hornearTile(w: number, h: number, dp: number, pintar: (x: X) => void): Tile {
  const [img, x] = lienzo(w, h, dp);
  pintar(x);
  return { img, w, h };
}

/** Draws a tile repeating across `W`, scrolled `dx` px to the left, at height `y`. */
export function dibujarTile(x: X, c: Tile, dx: number, y: number, W: number, alto = c.h) {
  const o = -(((dx % c.w) + c.w) % c.w);
  for (let px = o; px < W; px += c.w) x.drawImage(c.img, px, y, c.w + 1, alto);
}

/** Frees a baked bitmap's memory. */
export function soltar(...lienzos: Array<HTMLCanvasElement | Tile | null | undefined>) {
  for (const c of lienzos) {
    if (!c) continue;
    const el = c instanceof HTMLCanvasElement ? c : c.img;
    el.width = el.height = 0;
  }
}

// ---------------------------------------------------------------- the caravan

export interface VehiculoComic {
  img: HTMLCanvasElement;
  /** Whole width and height of the bitmap (CSS px) and the trimmings' headroom above the caravan's roof. */
  vw: number;
  vh: number;
  tope: number;
  /** The wheels (centre x, centre y, radius), from the bitmap's top left, and the two wheel bitmaps. */
  ruedas: Array<[number, number, number]>;
  rueda: [ReturnType<typeof pintarRueda>, ReturnType<typeof pintarRueda>];
  escape: [number, number];
  /** The caravan's window, from the top left, and the pennant's pole top. */
  ventana: [number, number];
  banderin: [number, number];
  puff: ReturnType<typeof pintarPuff>;
  banderola: HTMLCanvasElement;
  /** The bitmap's height of the vehicle without headroom: the wheels stand on its bottom. */
  base: number;
  v: Vehiculo;
}

/** The trailer's pickup and caravan, `vh` tall, with the comic's ink, a roof rack with the luggage and a pennant. */
export function crearVehiculoComic(vh: number, dp: number): VehiculoComic {
  const lw = Math.max(1.4, vh * 0.022);
  const v = pintarVehiculo(vh, dp, { color: TINTA, ancho: lw });
  const tope = vh * 0.3;
  const [img, x] = lienzo(v.vw, vh + tope, dp);
  // The roof rack and the luggage go behind the caravan's roof line, so they are drawn first.
  const rx0 = v.cw * 0.1;
  const rx1 = v.cw * 0.82;
  const ry = tope - vh * 0.02;
  x.lineJoin = 'round';
  x.lineCap = 'round';
  // The big duffel bag, olive with a strap, and a rolled sleeping bag.
  x.beginPath();
  x.roundRect(rx0 + v.cw * 0.04, ry - vh * 0.2, v.cw * 0.28, vh * 0.2, vh * 0.07);
  rellenar(x, '#7f8a4a', lw);
  x.fillStyle = 'rgba(40,50,20,0.28)';
  x.beginPath();
  x.roundRect(rx0 + v.cw * 0.04, ry - vh * 0.09, v.cw * 0.28, vh * 0.09, [0, 0, vh * 0.07, vh * 0.07]);
  x.fill();
  x.strokeStyle = '#5a3a24';
  x.lineWidth = lw * 1.6;
  x.beginPath();
  x.moveTo(rx0 + v.cw * 0.12, ry - vh * 0.2);
  x.lineTo(rx0 + v.cw * 0.12, ry);
  x.moveTo(rx0 + v.cw * 0.24, ry - vh * 0.2);
  x.lineTo(rx0 + v.cw * 0.24, ry);
  x.stroke();
  x.beginPath();
  x.roundRect(rx0 + v.cw * 0.36, ry - vh * 0.13, v.cw * 0.2, vh * 0.13, vh * 0.06);
  rellenar(x, '#c8503a', lw);
  x.strokeStyle = 'rgba(255,230,190,0.55)';
  x.lineWidth = lw * 0.8;
  x.beginPath();
  x.moveTo(rx0 + v.cw * 0.42, ry - vh * 0.125);
  x.lineTo(rx0 + v.cw * 0.42, ry - vh * 0.005);
  x.moveTo(rx0 + v.cw * 0.5, ry - vh * 0.125);
  x.lineTo(rx0 + v.cw * 0.5, ry - vh * 0.005);
  x.stroke();
  // The spare tyre, standing.
  elipse(x, rx0 + v.cw * 0.68, ry - vh * 0.1, vh * 0.1, vh * 0.1, '#2a2226');
  x.strokeStyle = TINTA;
  x.lineWidth = lw;
  x.beginPath();
  x.arc(rx0 + v.cw * 0.68, ry - vh * 0.1, vh * 0.1, 0, Math.PI * 2);
  x.stroke();
  elipse(x, rx0 + v.cw * 0.68, ry - vh * 0.1, vh * 0.05, vh * 0.05, '#8a8c94');
  // The rails.
  x.strokeStyle = TINTA;
  x.lineWidth = lw * 2.4;
  x.beginPath();
  x.moveTo(rx0, ry);
  x.lineTo(rx1, ry);
  x.stroke();
  x.strokeStyle = '#cfc6b0';
  x.lineWidth = lw * 1.1;
  x.beginPath();
  x.moveTo(rx0, ry);
  x.lineTo(rx1, ry);
  x.stroke();
  x.strokeStyle = TINTA;
  x.lineWidth = lw * 1.4;
  x.beginPath();
  for (const u of [0.0, 0.5, 1]) {
    x.moveTo(rx0 + (rx1 - rx0) * u, ry);
    x.lineTo(rx0 + (rx1 - rx0) * u, ry + vh * 0.04);
  }
  x.stroke();
  // The vehicle under it, the sun along its roof and a halftone shade along its belly.
  x.drawImage(v.img, 0, tope, v.vw, vh);
  x.save();
  x.beginPath();
  x.roundRect(0, tope, v.cw, v.ch, v.ch * 0.32);
  x.clip();
  trama(x, 0, tope + v.ch * 0.6, v.cw, tope + v.ch, 'rgba(90,50,30,0.34)', (_px, py) => (py - (tope + v.ch * 0.6)) / (v.ch * 0.4), 4.4, 1.5);
  x.restore();
  x.save();
  x.beginPath();
  x.roundRect(v.px, tope + vh * 0.5, v.pw, vh * 0.3, vh * 0.06);
  x.clip();
  trama(x, v.px, tope + vh * 0.62, v.px + v.pw, tope + vh * 0.8, 'rgba(60,20,12,0.4)', (_px, py) => (py - (tope + vh * 0.62)) / (vh * 0.18), 4.4, 1.5);
  x.restore();

  const ruedas: Array<[number, number, number]> = v.ruedas.map(([a, b, c]) => [a, b + tope, c]);
  const [banderola, b] = lienzo(vh * 0.4, vh * 0.2, dp);
  b.beginPath();
  b.moveTo(1, vh * 0.1);
  b.bezierCurveTo(vh * 0.1, vh * 0.04, vh * 0.2, vh * 0.16, vh * 0.38, vh * 0.1);
  b.bezierCurveTo(vh * 0.26, vh * 0.12, vh * 0.12, vh * 0.2, 1, vh * 0.14);
  b.closePath();
  rellenar(b, '#e8782a', lw * 0.8);
  // The pole of the pennant on the caravan's roof, at the front.
  x.strokeStyle = TINTA;
  x.lineWidth = lw * 1.2;
  x.beginPath();
  x.moveTo(v.cw * 0.9, tope);
  x.lineTo(v.cw * 0.9, tope - vh * 0.22);
  x.stroke();
  return {
    img,
    vw: v.vw,
    vh: vh + tope,
    tope,
    ruedas,
    rueda: [pintarRueda(ruedas[0][2], dp), pintarRueda(ruedas[1][2], dp)],
    escape: [v.escape[0], v.escape[1] + tope],
    ventana: [v.cw * 0.27, tope + v.ch * 0.34],
    banderin: [v.cw * 0.9, tope - vh * 0.22],
    puff: pintarPuff(vh * 0.2, dp, '#f0d8b4', '#d2b08a'),
    banderola,
    base: vh,
    v,
  };
}

export interface OpcionesVehiculo {
  /** Speed, in px/s, to turn the wheels; 0 for parked. */
  vel?: number;
  /** Bounce on the road (px of the biggest hop). */
  bote?: number;
  /** Lean, in radians, about the rear wheel. */
  inclina?: number;
  /** Extra vertical shift (a float, a jump). */
  dy?: number;
  /** Does the pennant flutter? */
  banderin?: boolean;
  /** Clips what is under this y (a waterline): the caravan is cut at the surface. */
  agua?: number;
}

/** The caravan standing on `suelo` (the y of the wheels' bottom), centred on `cx`, as it is at time `t`. Returns where it is (top left). */
export function dibujarVehiculoComic(x: X, c: VehiculoComic, cx: number, suelo: number, t: number, o: OpcionesVehiculo = {}) {
  const vel = o.vel ?? 0;
  const bote = o.bote ?? 0;
  const salto = bote ? -(Math.max(0, Math.sin(t * 9.3)) * bote * 0.7 + Math.max(0, Math.sin(t * 17.1 + 1)) * bote * 0.3) : 0;
  const inclina = (o.inclina ?? 0) + (bote ? Math.sin(t * 5.2) * 0.006 : 0);
  const x0 = cx - c.vw / 2;
  const y0 = suelo - c.base - c.tope + (o.dy ?? 0) + salto;
  x.save();
  x.translate(cx, suelo + (o.dy ?? 0));
  x.rotate(inclina);
  x.translate(-cx, -suelo - (o.dy ?? 0));
  x.drawImage(c.img, x0, y0, c.vw, c.vh);
  // The wheels turn: the distance they cover, over their radius.
  c.ruedas.forEach(([rx, ry, rr], i) => {
    const w = c.rueda[i === 0 ? 0 : 1];
    x.save();
    x.translate(x0 + rx, y0 + ry);
    x.rotate((t * vel) / rr);
    x.drawImage(w.img, -w.r, -w.r, w.r * 2, w.r * 2);
    x.restore();
  });
  // The pennant, fluttering in the wind.
  if (o.banderin !== false) {
    x.save();
    x.translate(x0 + c.banderin[0], y0 + c.banderin[1]);
    x.rotate(Math.sin(t * (6 + vel * 0.01)) * 0.18 - 0.05);
    x.drawImage(c.banderola, 0, -c.base * 0.1, c.base * 0.4, c.base * 0.2);
    x.restore();
  }
  x.restore();
  return [x0, y0] as const;
}

/** The point of the caravan's window as a fraction of a shot of `w`×`h` px, with the caravan centred on `cx` and its wheels on `suelo`. */
export function ventanaDe(c: VehiculoComic, cx: number, suelo: number, w: number, h: number): [number, number] {
  return [(cx - c.vw / 2 + c.ventana[0]) / w, (suelo - c.base - c.tope + c.ventana[1]) / h];
}

/** Dust puffs behind the rear wheel: `n` of them going round, each one growing, rising and fading. */
export function polvo(x: X, c: VehiculoComic, cx: number, suelo: number, t: number, vel: number, o: { n?: number; largo?: number; alto?: number; alfa?: number; dy?: number } = {}) {
  const n = o.n ?? 9;
  const largo = o.largo ?? c.vw * 1.0;
  const alto = o.alto ?? c.vh * 0.5;
  const base = cx - c.vw / 2 + c.ruedas[0][0] - c.vw * 0.12;
  for (let k = 0; k < n; k++) {
    const u = (t * 0.55 * Math.min(1, 0.3 + vel / 220) + k / n) % 1;
    const r = 0.45 + u * 1.15;
    const w = c.puff.w * r;
    const hh = c.puff.h * r;
    x.globalAlpha = (o.alfa ?? 0.85) * (1 - u) * Math.min(1, u * 8) * Math.min(1, vel / 40 + 0.1);
    x.drawImage(c.puff.img, base - u * largo - w / 2, suelo + (o.dy ?? 0) - u * alto - hh * 0.65, w, hh);
  }
  x.globalAlpha = 1;
}

/** A warm or cool wash over the whole shot, baked as a gradient bitmap. */
export function hornearTinte(m: Medidas, colorArriba: string, colorAbajo: string, a: number) {
  const [img, x] = lienzo(m.w, m.h, Math.min(m.dp, 1));
  const g = x.createLinearGradient(0, 0, 0, m.h);
  g.addColorStop(0, alfa(colorArriba, a));
  g.addColorStop(1, alfa(colorAbajo, a));
  x.fillStyle = g;
  x.fillRect(0, 0, m.w, m.h);
  return img;
}
