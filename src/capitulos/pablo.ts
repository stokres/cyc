// Chapter 1, Pablo's story: backstage at the Joso theatre, 20:30. He is
// writing a new impro format on an old typewriter when the paper runs out, and
// with it the idea. His narrator turns up in person: his own shadow, which
// follows him around, argues with him and contradicts him in the narration.
//
//   0. He types away for a while, narrated as usual, until the narrator starts
//      contradicting him; then it peels off his feet: his shadow.
//   1. No paper «in the whole theatre», says the narrator.
//   2. The props trunk has an old script, printed on one side only; the costume
//      table has scissors. Put together in the bag: loose sheets, blank on the back.
//   3. Sheets in the typewriter. He writes... nothing: blocked, and the lamp is
//      not enough. The lighting board turns on the follow spot.
//   4. His shadow lands on the projection screen, huge: the battle with the narrator, the
//      word-cutting minigame (src/ui/palabras.ts).
//   5. Unblocked: he finishes the format and leaves by the stage door. The
//      shadow is gone from the scene: the narrator is only a voice again, now
//      on Pablo's side.
// Anything that can be picked up can be picked up at any time (docs/JUGABILIDAD.md).
// Every line comes from src/textos/capitulo1.md (keys starting with p.).
import type { Aventura, ZonaLogica } from '../juego/aventura';
import { texto } from '../juego/textos';
import { REPARTO } from '../juego/reparto';
import { jugarPalabras } from '../ui/palabras';
import { silueta } from '../motor/sprites';

const f = (g: Aventura, k: string) => g.flag(k);

/** The shadow walks about as a character from the moment it peels off until the battle is won. */
// (A story begun before this existed has no p.sombra: once begun, it counts as out.)
export const sombraEnEscena = (g: Aventura) => (f(g, 'p.sombra') || f(g, 'empezado.pablo')) && !f(g, 'p.ganado');

/** End of the intro: the narrator, fed up, peels off Pablo's feet. */
export async function aparece(g: Aventura) {
  g.poner('p.sombra');
  g.sacarSombra(true);
  g.sound.pickup();
  await g.hablar('intro.pablo.sombra');
}

/** The shadow is on the projection screen, huge, while the spot is on and the battle is not won. */
const enLaPantalla = (g: Aventura) => f(g, 'p.canon') && !f(g, 'p.ganado');

async function batalla(g: Aventura) {
  if (!f(g, 'p.canon')) {
    g.poner('p.canon');
    if (g.sombra) g.sombra.visible = false;
    g.sound.pickup();
    await g.hablar('p.canon');
  } else await g.hablar('p.batalla.otra');
  // The minigame covers the whole screen: the scene underneath stops drawing.
  g.pausado = true;
  const cuerpo = REPARTO.pablo.arte.body({}, g.estado.ropa.pablo ?? REPARTO.pablo.ropa);
  const r = await jugarPalabras(g.root, cuerpo, g.rapido).finally(() => (g.pausado = false));
  if (r === 'cancelado') return g.hablar('p.batalla.cancelada');
  if (r === 'hecho') g.minijuegoSuperado('palabras');
  g.poner('p.ganado');
  g.poner('p.canon', false);
  g.avanzarReloj(15);
  // The shadow does not come back: the huge one shrinks away (see dibujar) and
  // from now on the narrator is only its voice.
  encogeDesde = g.motor.t;
  g.quitarSombra();
  await g.hablar(r === 'saltado' ? 'p.gana.saltado' : 'p.gana');
}

export function zonasBackstage(g: Aventura): Record<string, ZonaLogica> {
  return {
    maquina: {
      async usar() {
        if (f(g, 'p.ganado')) return g.hablar('p.maquina.hecho');
        if (!f(g, 'p.papel')) return g.hablar('p.maquina.sinpapel');
        await g.hablar('p.maquina.bloqueo');
      },
      async usarObjeto(item) {
        if (item === 'libreto') {
          await g.hablar('p.maquina.libreto');
          return true;
        }
        if (item !== 'hojas') return false;
        g.quitar('hojas');
        g.poner('p.papel');
        g.poner('p.bloqueado');
        g.avanzarReloj(5);
        await g.hablar('p.maquina.papel');
        return true;
      },
    },
    flexo: {},
    baul: {
      async usar() {
        if (f(g, 'p.libreto')) return g.hablar('p.baul.vacio');
        g.poner('p.libreto');
        g.avanzarReloj(2);
        await g.hablar('p.baul');
        g.dar('libreto');
        if (g.tiene('tijeras')) g.ayudaUnaVez('combinar');
      },
    },
    tijeras: {
      activa: () => !f(g, 'p.tijeras'),
      async usar() {
        g.poner('p.tijeras');
        await g.hablar('p.tijeras');
        g.dar('tijeras');
        if (g.tiene('libreto')) g.ayudaUnaVez('combinar');
      },
    },
    perchero: {},
    maniqui: {},
    maletas: {},
    nubes: {},
    cartel: {},
    canon: {
      usar: () => g.hablar(f(g, 'p.ganado') ? 'p.canon.despues' : enLaPantalla(g) ? 'p.canon.encendido' : 'p.canon.usar'),
    },
    cuadro: {
      async usar() {
        if (f(g, 'p.ganado')) return g.hablar('p.cuadro.despues');
        if (!f(g, 'p.bloqueado')) return g.hablar('p.cuadro.antes');
        await batalla(g);
      },
    },
    pantalla: {
      async usar() {
        if (enLaPantalla(g)) return batalla(g);
        await g.hablar(f(g, 'p.ganado') ? 'p.pantalla.despues' : 'usar.pantalla');
      },
      mirar: () => g.hablar(f(g, 'p.ganado') ? 'p.pantalla.despues' : enLaPantalla(g) ? 'p.mirar.pantalla.sombra' : 'mirar.pantalla'),
    },
    puertaArtistas: {
      async usar() {
        if (!f(g, 'p.ganado')) return g.hablar('p.puerta.antes');
        g.avanzarReloj(3);
        await g.hablar('p.salida');
        await g.enCamino('pablo');
      },
    },
  };
}

export async function combinar(g: Aventura, a: string, b: string) {
  if ([a, b].sort().join('+') !== 'libreto+tijeras') return false;
  g.quitar('libreto');
  g.sound.pickup();
  await g.hablar('p.combinar');
  g.dar('hojas');
  return true;
}

/** Tapping, looking at or giving something to the shadow. */
export async function sombra(g: Aventura, item: string | null, mirar: boolean) {
  // After the battle the shadow is no longer on the scene: there is nobody to tap.
  const etapa = f(g, 'p.bloqueado') ? 'bloqueo' : 'papel';
  if (mirar) return g.hablar(`p.mirar.sombra.${etapa}`);
  if (item) return g.hablar(g.hayDialogo(`p.sombra.${item}`) ? `p.sombra.${item}` : 'p.sombra.objeto');
  await g.hablar(`p.hablar.sombra.${etapa}`);
}

export async function aSiMismo(g: Aventura, item: string | null, mirar: boolean) {
  if (mirar || !item) return g.hablar(f(g, 'p.ganado') ? 'p.mirar.pablo.despues' : 'mirar.pablo');
  return g.hablar('nadacontigo');
}

export function objetivo(g: Aventura) {
  if (f(g, 'p.ganado')) return texto('objetivo.pablo.salir');
  if (f(g, 'p.bloqueado')) return texto('objetivo.pablo.luz');
  if (g.tiene('hojas')) return texto('objetivo.pablo.escribir');
  return texto('objetivo.pablo');
}

export function pista(g: Aventura) {
  if (f(g, 'p.ganado')) return texto('pista.pablo.salir');
  if (f(g, 'p.bloqueado')) return texto(enLaPantalla(g) ? 'pista.pablo.batalla' : 'pista.pablo.luz');
  if (g.tiene('hojas')) return texto('pista.pablo.maquina');
  if (!f(g, 'p.libreto')) return texto('pista.pablo.baul');
  if (!f(g, 'p.tijeras')) return texto('pista.pablo.tijeras');
  return texto('pista.pablo.combinar');
}

// ---------------------------------------------------------------- live drawing

/** Bitmaps for the spot's light and Pablo's huge shadow: made once (docs/ESTILO.md, T5). */
let luz: HTMLCanvasElement | null = null;
let sombraGrande: HTMLCanvasElement | null = null;
let haciendoSilueta = false;
/** When the battle was won: the huge shadow and the spot fade out from then on. */
let encogeDesde = -Infinity;
const ENCOGE = 2.2;

function bitmapLuz(r: number) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(r * 2);
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,240,205,0.85)');
  gr.addColorStop(0.75, 'rgba(255,228,180,0.6)');
  gr.addColorStop(0.92, 'rgba(255,220,170,0.25)');
  gr.addColorStop(1, 'rgba(255,220,170,0)');
  x.fillStyle = gr;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** The follow spot's beam and disk on the projection screen, and the narrator in it, huge. */
export function dibujar(g: Aventura, ctx: CanvasRenderingContext2D, capa: string) {
  const m = g.motor;
  // 0 while the battle is on, up to 1 as the shadow shrinks away after the win.
  const fuera = enLaPantalla(g) ? 0 : (m.t - encogeDesde) / ENCOGE;
  if (capa !== 'fondo' || fuera >= 1 || fuera < 0) return;
  const queda = 1 - fuera * fuera;
  const px = m.px;
  const off = m.off(1);
  const c = g.S.spots.ciclo;
  const lente = g.S.spots.canon;
  const ALTO = 640;
  if (!luz) luz = bitmapLuz(c.r * px);
  if (!sombraGrande && !haciendoSilueta) {
    haciendoSilueta = true;
    void silueta(REPARTO.pablo.arte.body({}, g.estado.ropa.pablo ?? REPARTO.pablo.ropa), ALTO * px).then((b) => (sombraGrande = b)).finally(() => (haciendoSilueta = false));
  }
  ctx.save();
  ctx.setTransform(px, 0, 0, px, off * px, 0);
  // The beam: a soft cone from the lens to the disk.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = queda;
  const haz = ctx.createLinearGradient(lente.x, 0, c.x, 0);
  haz.addColorStop(0, 'rgba(255,236,200,0.35)');
  haz.addColorStop(1, 'rgba(255,236,200,0.06)');
  ctx.fillStyle = haz;
  ctx.beginPath();
  ctx.moveTo(lente.x, lente.y - 26);
  ctx.lineTo(c.x - c.r * 0.2, c.y - c.r * 0.95);
  ctx.lineTo(c.x - c.r * 0.2, c.y + c.r * 0.95);
  ctx.lineTo(lente.x, lente.y + 26);
  ctx.fill();
  ctx.drawImage(luz, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);
  // The shadow, breathing, standing on the floor line of the projection screen.
  ctx.globalCompositeOperation = 'source-over';
  if (sombraGrande) {
    // Shrinking down into its feet once beaten.
    const k = (1 + 0.012 * Math.sin(m.t * 1.4)) * (1 - 0.85 * fuera);
    const w = (sombraGrande.width / px) * k;
    const hh = (sombraGrande.height / px) * k;
    ctx.globalAlpha = 0.9 * queda;
    // Projected on the cloth: the cushion clouds in front hide its feet.
    ctx.beginPath();
    ctx.rect(c.x - c.r * 2, 0, c.r * 4, c.suelo - 130);
    ctx.clip();
    ctx.drawImage(sombraGrande, c.x - w / 2 + 30, c.suelo - hh + 4, w, hh);
  }
  ctx.restore();
}
