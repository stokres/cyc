// The battered pickup and its caravan, side on and facing right, painted once to a bitmap. It is the very
// caravan of the chapter 2 trailer (src/ui/trailer.ts, the shot of the caravan flat out across the desert) and
// of the safari comic (src/ui/safari.ts), so it looks the same everywhere. With `linea` each shape also gets a dark
// outline (the comic's ink); without it the drawing is exactly the trailer's.
import { elipse, lienzo } from './bar-pintura';

export interface Vehiculo {
  img: HTMLCanvasElement;
  /** The vehicle's size, in CSS px. */
  vw: number;
  vh: number;
  /** Where the wheels are (centre x, centre y and radius, from the top left). */
  ruedas: Array<[number, number, number]>;
  /** The pickup's exhaust pipe. */
  escape: [number, number];
  /** The caravan's width, where the pickup starts and its width (the comic adds its trimmings with these). */
  cw: number;
  ch: number;
  px: number;
  pw: number;
}

export interface LineaVehiculo {
  color: string;
  ancho: number;
}

/**
 * The pickup (rusty red, a cream roof, the bed behind the cab) towing the caravan (cream, a brown stripe, rounded ends,
 * a cracked window and its door). `vh` is the whole height; the width follows from it. `extra`, if given, paints
 * trimmings on top (the comic's roof rack and pennant); it is called last.
 */
export function pintarVehiculo(vh: number, dpr: number, linea?: LineaVehiculo, extra?: (v: CanvasRenderingContext2D, v0: Vehiculo) => void): Vehiculo {
  const cw = vh * 2.0;
  const vw = cw + vh * 0.25 + vh * 1.8;
  const [img, v] = lienzo(vw, vh, dpr);
  const caja = (color: string, bx: number, by: number, w: number, hh: number, rad: number, borde = false) => {
    v.fillStyle = color;
    v.beginPath();
    v.roundRect(bx, by, w, hh, rad);
    v.fill();
    if (linea && borde) {
      v.strokeStyle = linea.color;
      v.lineWidth = linea.ancho;
      v.lineJoin = 'round';
      v.stroke();
    }
  };
  // The caravan: cream, a brown stripe, rounded ends, a window and its door.
  const ch = vh * 0.78;
  caja('#e9dcc0', 0, 0, cw, ch, ch * 0.32, true);
  caja('#d4c4a4', 0, 0, cw, ch * 0.14, ch * 0.08);
  caja('#9a5a3c', 0, ch * 0.58, cw, ch * 0.12, 0);
  caja('#c9b896', 0, ch * 0.86, cw, ch * 0.14, ch * 0.05);
  caja('#3a4a66', cw * 0.12, ch * 0.2, cw * 0.3, ch * 0.28, ch * 0.08, true);
  caja('#d8c8a8', cw * 0.62, ch * 0.16, cw * 0.15, ch * 0.66, ch * 0.05, true);
  caja('#3a4a66', cw * 0.645, ch * 0.22, cw * 0.1, ch * 0.16, ch * 0.04, true);
  caja('#e0a24a', cw * 0.02, ch * 0.62, cw * 0.025, ch * 0.06, 1);
  // A crack in the window, and the sun along its top.
  v.strokeStyle = '#a9b4c8';
  v.lineWidth = 1;
  v.beginPath();
  v.moveTo(cw * 0.16, ch * 0.24);
  v.lineTo(cw * 0.25, ch * 0.34);
  v.lineTo(cw * 0.22, ch * 0.44);
  v.stroke();
  const luz = v.createLinearGradient(0, 0, 0, ch * 0.5);
  luz.addColorStop(0, 'rgba(255,214,150,0.35)');
  luz.addColorStop(1, 'rgba(255,214,150,0)');
  v.fillStyle = luz;
  v.beginPath();
  v.roundRect(0, 0, cw, ch, ch * 0.32);
  v.fill();
  // The tow bar.
  v.fillStyle = '#4a3a36';
  v.fillRect(cw - 2, ch * 0.8, vh * 0.3, vh * 0.05);
  // The pickup: rusty red, a cream roof, the bed behind the cab, a chrome bumper.
  const px = cw + vh * 0.25;
  const pw = vh * 1.8;
  caja('#a8402c', px, vh * 0.5, pw, vh * 0.3, vh * 0.06, true);
  caja('#a8402c', px + pw * 0.42, vh * 0.12, pw * 0.36, vh * 0.42, vh * 0.08, true);
  caja('#efe2c4', px + pw * 0.42, vh * 0.1, pw * 0.36, vh * 0.07, vh * 0.04);
  caja('#7e2e20', px, vh * 0.5, pw * 0.4, vh * 0.05, 0);
  caja('#2e3c5a', px + pw * 0.5, vh * 0.2, pw * 0.24, vh * 0.22, vh * 0.04, true);
  // Two heads in the cab, against the windscreen.
  elipse(v, px + pw * 0.56, vh * 0.33, vh * 0.055, vh * 0.065, '#1c1612');
  elipse(v, px + pw * 0.68, vh * 0.32, vh * 0.055, vh * 0.065, '#1c1612');
  caja('#a8402c', px + pw * 0.78, vh * 0.38, pw * 0.22, vh * 0.42, vh * 0.1, true);
  caja('#7e2e20', px + pw * 0.08, vh * 0.58, pw * 0.85, vh * 0.025, 0);
  caja('#c8ccd2', px + pw * 0.95, vh * 0.66, pw * 0.07, vh * 0.12, vh * 0.03, true);
  caja('#ffe6a0', px + pw * 0.95, vh * 0.44, pw * 0.05, vh * 0.08, vh * 0.03);
  caja('#4a3a36', px - vh * 0.02, vh * 0.7, vh * 0.04, vh * 0.08, 1);
  // The sun along the top of everything.
  v.fillStyle = 'rgba(255,214,150,0.3)';
  v.fillRect(px + pw * 0.42, vh * 0.12, pw * 0.36, vh * 0.03);
  v.fillRect(px, vh * 0.5, pw, vh * 0.025);
  const ruedas: Array<[number, number, number]> = [
    [cw * 0.42, vh * 0.86, vh * 0.14],
    [px + pw * 0.22, vh * 0.84, vh * 0.16],
    [px + pw * 0.8, vh * 0.84, vh * 0.16],
  ];
  const r: Vehiculo = { img, vw, vh, ruedas, escape: [px - vh * 0.02, vh * 0.74], cw, ch, px, pw };
  extra?.(v, r);
  return r;
}
