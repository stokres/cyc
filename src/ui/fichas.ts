// A friend's front portrait as a bitmap in a round frame of their colour, made once: for the chapter 2
// minigames that show the four faces (src/ui/canas.ts, src/ui/canto.ts). The portrait is SVG
// (src/juego/reparto.ts); it is turned into an image once and each frame only draws that
// (docs/ESTILO.md, T5.7).
import { REPARTO, retrato, type PjId } from '../juego/reparto';
import { svgABitmap } from '../motor/sprites';
import { lienzo } from './bar-pintura';

export interface CaraFicha {
  mood?: string;
  /** For a mouth that sings: 'a', 'o'... (the portrait's mouth shapes). */
  mouthKind?: string;
}

/** The face of `id` in a frame of radius `R` CSS px, at density `dp`: a canvas of 2R × 2R. */
export async function crearFicha(id: PjId, cara: CaraFicha, R: number, dp: number): Promise<HTMLCanvasElement> {
  const d = Math.ceil(2 * R * dp);
  const alto = Math.ceil((d * 150) / 124);
  const svg = retrato(id, cara).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${alto}" `);
  const bitmap = await svgABitmap(svg, d, alto);
  const [f, x] = lienzo(2 * R, 2 * R, dp);
  x.fillStyle = '#1c1424';
  x.beginPath();
  x.arc(R, R, R, 0, Math.PI * 2);
  x.fill();
  x.save();
  x.beginPath();
  x.arc(R, R, R * 0.93, 0, Math.PI * 2);
  x.clip();
  // The head fills the frame: the portrait's viewBox is 124×150 and the face sits a bit above its middle.
  const k = (2 * R * 1.06) / 124;
  x.drawImage(bitmap, R - 62 * k, R - 70 * k, 124 * k, 150 * k);
  x.restore();
  x.strokeStyle = REPARTO[id].color;
  x.lineWidth = Math.max(3, R * 0.09);
  x.beginPath();
  x.arc(R, R, R - x.lineWidth / 2, 0, Math.PI * 2);
  x.stroke();
  return f;
}
