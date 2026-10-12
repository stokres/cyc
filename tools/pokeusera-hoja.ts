// Dev-only contact sheet of the PokéUsera art (not part of the build). Open
// /tools/pokeusera-hoja.html on the Vite dev server. Every canvas is drawn at 1× logical size
// and scaled ×4 with image-rendering: pixelated.
import { ENTRENADORES, type Tipo } from '../src/pokeusera/tipos';
import { COLOR_JUGADOR, FONDO, NEGRO, OSCURO, PAPEL, COLOR_TIPO } from '../src/pokeusera/arte/paleta';
import { anchoMini, anchoTexto, dibujarMini, dibujarTexto, envolver } from '../src/pokeusera/arte/fuente';
import { barraPS, cursor, flechaSigue, insignaTipo, marco } from '../src/pokeusera/arte/marcos';
import { IDS_USERITOS, entrenador, icono, logo, spriteEspalda, spriteFrente } from '../src/pokeusera/arte/sprites';

const ESCALA = 4;

function lienzo(id: string, w: number, h: number, escala = ESCALA): CanvasRenderingContext2D {
  const cv = document.getElementById(id) as HTMLCanvasElement;
  cv.width = w;
  cv.height = h;
  cv.style.width = `${w * escala}px`;
  cv.style.height = `${h * escala}px`;
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, w, h);
  return ctx;
}

function rejilla(id: string, f: (i: number) => HTMLCanvasElement) {
  const COLS = 5;
  const CW = 44;
  const CH = 46;
  const ctx = lienzo(id, COLS * CW, Math.ceil(IDS_USERITOS.length / COLS) * CH);
  IDS_USERITOS.forEach((uid, i) => {
    const x = (i % COLS) * CW;
    const y = Math.floor(i / COLS) * CH;
    ctx.drawImage(f(i), x + 6, y + 2);
    const nombre = uid.toUpperCase();
    dibujarMini(ctx, nombre, x + Math.floor((CW - anchoMini(nombre)) / 2), y + 36, NEGRO);
  });
}

// ?zoom=id1,id2 shows those useritos (front and back) big, for close review.
{
  const z = new URLSearchParams(location.search).get('zoom');
  if (z) {
    const ids = z.split(',');
    const ctx = lienzo('zoom', ids.length * 68, 36, 10);
    ids.forEach((id, i) => {
      ctx.drawImage(spriteFrente(id), i * 68 + 2, 2);
      ctx.drawImage(spriteEspalda(id), i * 68 + 34, 2);
    });
    for (const n of ['zoom', 'hz']) document.getElementById(n)!.hidden = false;
  }
}

rejilla('frentes', (i) => spriteFrente(IDS_USERITOS[i]));
rejilla('espaldas', (i) => spriteEspalda(IDS_USERITOS[i]));

// Trainers, icons and logo.
{
  const ctx = lienzo('gente', 200, 150);
  ENTRENADORES.forEach((e, i) => {
    const x = 6 + i * 48;
    ctx.drawImage(entrenador(e), x, 4);
    ctx.fillStyle = COLOR_JUGADOR[i];
    ctx.fillRect(x - 1, 45, 34, 1);
    ctx.drawImage(icono(e), x + 12, 49);
    dibujarMini(ctx, e.toUpperCase(), x, 60, NEGRO);
  });
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 70, 200, 70);
  ctx.drawImage(logo(), 20, 74);
}

// Text, frames, bars and badges.
{
  const ctx = lienzo('ui', 160, 330);
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, 160, 120);
  const muestra = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnñopqrstuvwxyz', '0123456789 ÁÉÍÓÚÜÑ áéíóúüñ', '¡! ¿? .,:;\'"-+/()%×…«»▶▼★'];
  let y = 2;
  for (const l of muestra) {
    for (const parte of envolver(l, 160)) {
      dibujarTexto(ctx, parte, 0, y, NEGRO);
      y += 10;
    }
  }
  dibujarTexto(ctx, 'Sombra y x2', 2, y, OSCURO, { sombra: '#c4b48c' });
  dibujarTexto(ctx, 'Grande', 2, y + 10, NEGRO, { escala: 2 });
  dibujarMini(ctx, 'MINI 0123456789 %/:-+', 80, y + 2, NEGRO);
  dibujarMini(ctx, 'Alcohol Fantasma', 80, y + 10, OSCURO);
  dibujarTexto(ctx, `ancho ${anchoTexto('Hola')}`, 90, y + 18, NEGRO);

  marco(ctx, 0, 124, 160, 40);
  dibujarTexto(ctx, '¡Espumarro usó', 10, 130, NEGRO);
  dibujarTexto(ctx, 'Garrafón!', 10, 142, NEGRO);
  flechaSigue(ctx, 142, 154);
  marco(ctx, 0, 168, 70, 48);
  ['LUCHAR', 'USERITO', 'CAÑA', 'HUIR'].forEach((t, i) => dibujarTexto(ctx, t, 18, 174 + i * 10, NEGRO));
  cursor(ctx, 8, 175, NEGRO);

  [1, 0.8, 0.5, 0.45, 0.2, 0.05, 0].forEach((f, i) => barraPS(ctx, 78, 172 + i * 9, 76, f));

  const tipos = Object.keys(COLOR_TIPO) as Tipo[];
  tipos.forEach((t, i) => insignaTipo(ctx, t, 4 + (i % 4) * 39, 224 + Math.floor(i / 4) * 12));
  COLOR_JUGADOR.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(4 + i * 14, 262, 12, 8);
  });
}
