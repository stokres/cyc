// PokéUsera en el capítulo 2: las pantallas que no son del juego original y que enlaza el hilo de la historia (capitulo.ts):
//  - la silueta: Guille ha ganado, Fran, Pablo y Chuchi se caen de espaldas y algo enorme baja desde arriba (la caja de texto lleva la historia);
//  - una pregunta con botones sobre el mismo fondo (se ha perdido contra el Ultimosaurio: OTRA VEZ, y SALTAR a partir de dos derrotas);
//  - la ficha del Ultimosaurio recién cazado, con SEGUIR.
// Todas viven en el escenario del mundo de los conceptos (el fondo de la batalla, horneado una sola vez) con la bandeja de siempre debajo.
import type { EntrenadorId, Tipo } from '../tipos';
import { ESPECIE, ULTIMOSAURIO_ID } from '../datos';
import { ANCHO_ENT2, ALTO_ENT2, entrenador2 } from '../arte2/entrenadores2';
import { anchoTexto2, envolver2 } from '../arte2/fuente2';
import { TINTA2 } from '../arte2/paleta2';
import { panelCacheado } from '../arte2/ui2';
import { spriteFrente2 } from '../arte2/sprites2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { CajaTexto } from './caja';
import { alturaCampo } from './combate';
import { dibujarBandeja, dibujarFondoEscenario } from './fondos';
import type { BotonPodio } from './podio';
import { Animador, Firma, boton, centrado, chipTipo, reposo, t, texto2, textoGrande } from './ui';

const NEGRO = '#150a24';

/** El Ultimosaurio, de frente, como una mancha oscura (la silueta que baja): se hornea una vez. */
let manchaCv: HTMLCanvasElement | null = null;
function mancha(): HTMLCanvasElement {
  if (manchaCv) return manchaCv;
  const origen = spriteFrente2(ULTIMOSAURIO_ID, 0);
  const c = document.createElement('canvas');
  c.width = origen.width;
  c.height = origen.height;
  const x = c.getContext('2d')!;
  x.drawImage(origen, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = NEGRO;
  x.fillRect(0, 0, c.width, c.height);
  manchaCv = c;
  return c;
}

/** El fondo del mundo de los conceptos hasta `campo` y la bandeja de debajo. */
function fondo(ctx: CanvasRenderingContext2D, H: number, oscuro = 0): number {
  const campo = alturaCampo(H);
  dibujarFondoEscenario(ctx, 'conceptos', campo, oscuro);
  dibujarBandeja(ctx, campo, H);
  return campo;
}

const suave = (p: number): number => p * p * (3 - 2 * p);

/**
 * La escena de la silueta. `lineas` (4): el silencio, la caída de los tres rivales, la bajada de la silueta y la última, que la deja ahí.
 * Resuelve cuando se ha leído la última. Un toque (o Enter) pasa cada línea.
 */
export function escenaSilueta(o: { yo: EntrenadorId; rivales: EntrenadorId[]; lineas: string[] }): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    const caja = new CajaTexto(ANCHO - 8 - 22);
    const anim = new Animador();
    // 0..1: cuánto se han caído los rivales y cuánto ha bajado la silueta.
    let caida = 0;
    let baja = 0;
    let fin = false;
    const firma = new Firma(3);
    const e: Escena = {
      paso(dt) {
        const a = anim.paso(dt);
        const b = caja.paso(dt);
        // La silueta, ya abajo, flota: se redibuja siempre.
        return a || b || baja > 0 || firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        const campo = fondo(ctx, H);
        const suelo = campo - 62;
        const n = o.rivales.length;
        const paso = Math.floor(ANCHO / n);
        // Los rivales: de pie, y al caer se tumban con la cabeza hacia fuera.
        o.rivales.forEach((id, i) => {
          const cx = i * paso + Math.floor(paso / 2);
          const img = entrenador2(id, caida > 0 ? 1 : reposo(ahora, i * 170));
          const lado = i === 0 ? -1 : i === n - 1 ? 1 : i % 2 ? 1 : -1;
          const k = suave(caida);
          ctx.save();
          // Gira alrededor de su centro mientras el centro baja hasta tocar el suelo (tumbado ocupa 56 de alto, no 80).
          const cy = suelo - ALTO_ENT2 / 2 + k * (ALTO_ENT2 / 2 - ANCHO_ENT2 / 2);
          ctx.translate(Math.round(cx), Math.round(cy));
          ctx.rotate(lado * k * (Math.PI / 2));
          ctx.drawImage(img, -ANCHO_ENT2 / 2, -ALTO_ENT2 / 2);
          ctx.restore();
        });
        // Guille, delante y de pie.
        ctx.drawImage(entrenador2(o.yo, reposo(ahora)), Math.floor((ANCHO - ANCHO_ENT2) / 2), campo - 12 - ALTO_ENT2);
        // La silueta: baja despacio desde arriba y se queda flotando.
        if (baja > 0) {
          const m = mancha();
          const k = suave(baja);
          const flota = baja >= 1 ? Math.round(Math.sin(ahora / 520) * 3) : 0;
          const y = Math.round(-132 + k * 150 + flota);
          ctx.globalAlpha = 0.5 + 0.5 * k;
          ctx.drawImage(m, Math.floor((ANCHO - 128) / 2), y, 128, 128);
          ctx.globalAlpha = 1;
        }
        // La caja de texto, en la bandeja.
        const boxH = Math.min(H - campo - 8, 70);
        panelCacheado(ctx, 4, campo + 4, ANCHO - 8, boxH);
        caja.dibujar(ctx, 4, campo + 4, ANCHO - 8, boxH, ahora, false);
        entrada.zona(0, 0, ANCHO, H, () => caja.toque());
      },
      accion(a) {
        if (a === 'aceptar' || a === 'atras') caja.toque();
        return true;
      },
    };
    p.poner(e);
    void (async () => {
      const [uno, dos, tres, cuatro] = o.lineas;
      await caja.decir(uno);
      sonido.efecto('cursor');
      await Promise.all([caja.decir(dos), anim.animar(900, (k) => (caida = k))]);
      sonido.efecto('golpeFlojo');
      await Promise.all([caja.decir(tres), anim.animar(2800, (k) => (baja = k))]);
      baja = 1;
      await caja.decir(cuatro);
      if (!fin) {
        fin = true;
        res();
      }
    })();
  });
}

/**
 * Una pregunta con botones sobre el fondo del mundo de los conceptos: `lineas` en un panel, los botones debajo. Resuelve con el `id` del pulsado.
 */
export function pantallaPregunta(lineas: string[], botones: BotonPodio[]): Promise<string> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = 0;
    let hecho = false;
    const fin = (id: string) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto('aceptar');
      res(id);
    };
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        const campo = fondo(ctx, H, 0.35);
        const ls = lineas.flatMap((l) => envolver2(l, ANCHO - 44));
        const h = 22 + ls.length * 14;
        const y = Math.round(campo / 2 - h / 2);
        panelCacheado(ctx, 12, y, ANCHO - 24, h);
        ls.forEach((l, i) => centrado(ctx, l, y + 13 + i * 14));
        const n = botones.length;
        const w = Math.min(104, Math.floor((ANCHO - 16 - 8 * (n - 1)) / n));
        const x0 = Math.floor((ANCHO - n * w - 8 * (n - 1)) / 2);
        const yb = campo + Math.floor((H - campo - 28) / 2);
        botones.forEach((b, i) => {
          const x = x0 + i * (w + 8);
          boton(ctx, x, yb, w, 28, b.texto, sel === i, true, b.principal ? 'principal' : undefined);
          entrada.zona(x, yb, w, 28, () => fin(b.id));
        });
      },
      accion(a) {
        const n = botones.length;
        if (a === 'izq' || a === 'der') {
          sel = (sel + (a === 'der' ? 1 : n - 1)) % n;
          sonido.efecto('cursor');
        } else if (a === 'aceptar') fin(botones[sel].id);
        return true;
      },
    };
    p.poner(e);
  });
}

/** La ficha del Ultimosaurio recién cazado: su dibujo, su nombre, sus tipos y su descripción, con SEGUIR. */
export function pantallaCazado(boton1: BotonPodio): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    const esp = ESPECIE[ULTIMOSAURIO_ID];
    const titulo = t('pokecap.cazado.titulo');
    const firma = new Firma(1);
    let hecho = false;
    const fin = () => {
      if (hecho) return;
      hecho = true;
      sonido.efecto('aceptar');
      res();
    };
    sonido.musica('victoria');
    const e: Escena = {
      paso(_dt, ahora) {
        firma.v[0] = reposo(ahora);
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        const campo = fondo(ctx, H);
        textoGrande(ctx, titulo, Math.floor((ANCHO - anchoTexto2(titulo) * 2) / 2), 14, '#ffd84a', 2, NEGRO);
        // Sombra y dibujo (a doble tamaño, píxel a píxel), con el vaivén de dos fotogramas.
        const cx = Math.floor(ANCHO / 2);
        const pie = campo - 22;
        ctx.fillStyle = 'rgba(21,10,36,0.45)';
        ctx.beginPath();
        ctx.ellipse(cx, pie, 52, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.drawImage(spriteFrente2(ULTIMOSAURIO_ID, reposo(ahora)), cx - 64, pie - 118, 128, 128);
        // La bandeja: nombre y tipos, descripción y el botón.
        const y0 = campo + 4;
        panelCacheado(ctx, 4, y0, ANCHO - 8, H - y0 - 4);
        const nombre = esp.nombre.toUpperCase();
        texto2(ctx, nombre, 12, y0 + 9);
        let x = 12 + anchoTexto2(nombre) + 8;
        for (const tp of esp.tipos as readonly Tipo[]) x += chipTipo(ctx, tp, x, y0 + 8) + 3;
        const desc = envolver2(t('userito.ultimosaurio.desc'), ANCHO - 8 - 22);
        desc.slice(0, 4).forEach((l, i) => texto2(ctx, l, 12, y0 + 25 + i * 13, TINTA2));
        const bw = 120;
        const bx = Math.floor((ANCHO - bw) / 2);
        const by = H - 4 - 8 - 28;
        boton(ctx, bx, by, bw, 28, boton1.texto, true, true, 'principal');
        entrada.zona(bx, by, bw, 28, fin);
      },
      accion(a) {
        if (a === 'aceptar') fin();
        return true;
      },
    };
    p.poner(e);
  });
}
