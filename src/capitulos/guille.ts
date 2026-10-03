// Chapter 1, Guille's story: at the farm on the outskirts of Madrid, 20:10.
// Eight pigs still to weigh and he is late, so he will weigh them all at once.
//
//   1. The scale is dead: no batteries.
//   2. The radio playing jotas has two. Without music the pigs get nervous.
//   3. Batteries in the scale, then the minigame: stack the eight pigs on it,
//      the worst one last (src/ui/cerdos.ts).
//   4. He stinks of pig: flies follow him. The shower? There is no shower.
//   5. Alcohol from the first-aid kit + rosemary from the bush, put together in
//      the bag (combining items), and water from the hose: farm cologne.
//      Anything that can be picked up can be picked up (and combined) at any
//      time, before knowing what it is for (docs/JUGABILIDAD.md).
//   6. Cologne on himself, and off in the car to the Río.
// Every line comes from src/textos/capitulo1.md (keys starting with g.).
import type { Aventura, ZonaLogica } from '../juego/aventura';
import { texto } from '../juego/textos';
import { jugarCerdos } from '../ui/cerdos';
import { FONTS } from '../motor/escena';

const f = (g: Aventura, k: string) => g.flag(k);

async function pesar(g: Aventura) {
  await g.hablar('g.bascula.antes');
  // The minigame covers the whole screen: the scene underneath stops drawing.
  g.pausado = true;
  const r = await jugarCerdos(g.root, g.rapido).finally(() => (g.pausado = false));
  if (r === 'cancelado') return g.hablar('g.cerdos.cancelado');
  g.poner('g.pesados');
  g.avanzarReloj(12);
  await g.hablar(r === 'saltado' ? 'g.cerdos.saltado' : 'g.cerdos.hecho');
  g.poner('g.olor');
  await g.hablar('g.olor');
}

export function zonasGranja(g: Aventura): Record<string, ZonaLogica> {
  return {
    corral: {
      mirar: () => g.hablar(f(g, 'g.pesados') ? 'g.mirar.corral.pesados' : f(g, 'g.pilas') ? 'g.mirar.corral.nerviosos' : 'g.mirar.corral'),
      usar: () => g.hablar(f(g, 'g.pesados') ? 'g.mirar.corral.pesados' : 'g.usar.corral'),
    },
    bascula: {
      async mirar() {
        g.poner('g.basculaVista');
        await g.hablar(f(g, 'basculaLista') ? 'g.mirar.bascula.lista' : 'g.mirar.bascula');
      },
      async usar() {
        if (f(g, 'g.pesados')) return g.hablar('g.bascula.hecho');
        if (!f(g, 'basculaLista')) {
          g.poner('g.basculaVista');
          g.sound.nope();
          return g.hablar('g.bascula.apagada');
        }
        await pesar(g);
      },
      async usarObjeto(item) {
        if (item !== 'pilas') return false;
        g.quitar('pilas');
        g.poner('basculaLista');
        g.motor.invalidar();
        g.sound.pickup();
        g.avanzarReloj(2);
        await g.hablar('g.bascula.pilas');
        return true;
      },
    },
    puertaNave: {},
    radio: {
      mirar: () => g.hablar(f(g, 'g.pilas') ? 'g.mirar.radio.apagada' : 'g.mirar.radio'),
      async usar() {
        if (f(g, 'g.pilas')) return g.hablar('g.radio.sinpilas');
        g.poner('g.pilas');
        g.avanzarReloj(2);
        await g.hablar('g.radio.pilas');
        g.dar('pilas');
        await g.hablar('g.radio.silencio');
      },
    },
    botiquin: {
      async usar() {
        if (f(g, 'g.alcohol')) return g.hablar('g.botiquin.vacio');
        g.poner('g.alcohol');
        await g.hablar('g.botiquin');
        g.dar('alcohol');
        if (g.tiene('romero')) g.ayudaUnaVez('combinar');
      },
    },
    romero: {
      async usar() {
        if (f(g, 'g.romero')) return g.hablar('g.romero.ya');
        g.poner('g.romero');
        await g.hablar('g.romero');
        g.dar('romero');
        if (g.tiene('alcohol')) g.ayudaUnaVez('combinar');
      },
    },
    manguera: {
      async usar() {
        if (!f(g, 'g.olor')) return g.hablar('g.manguera.antes');
        await g.hablar(f(g, 'g.limpio') ? 'g.manguera.limpio' : 'g.manguera');
      },
      async usarObjeto(item) {
        if (item === 'alcoholRomero') {
          g.cambiarObjeto('alcoholRomero', 'colonia');
          g.poner('g.colonia');
          g.sound.pickup();
          g.avanzarReloj(3);
          await g.hablar('g.colonia.hecha');
          return true;
        }
        if (item === 'alcohol' || item === 'romero') {
          await g.hablar('g.manguera.falta');
          return true;
        }
        return false;
      },
    },
    coche: {
      async usar() {
        if (!f(g, 'g.pesados')) return g.hablar('g.coche.antes');
        if (!f(g, 'g.limpio')) return g.hablar('g.coche.olor');
        g.avanzarReloj(3);
        await g.hablar('g.salida');
        await g.enCamino('guille');
      },
    },
    madrid: { acercarse: false, mirar: () => g.hablar('g.mirar.madrid'), usar: () => g.hablar('g.mirar.madrid') },
  };
}

export async function combinar(g: Aventura, a: string, b: string) {
  const par = [a, b].sort().join('+');
  if (par !== 'alcohol+romero') return false;
  g.quitar('alcohol');
  g.cambiarObjeto('romero', 'alcoholRomero');
  g.sound.pickup();
  await g.hablar('g.combinar');
  return true;
}

/** Guille using something on himself, or looking at himself. */
export async function aSiMismo(g: Aventura, item: string | null, mirar: boolean) {
  if (mirar || !item) return g.hablar(f(g, 'g.limpio') ? 'g.mirar.guille.limpio' : f(g, 'g.olor') ? 'g.mirar.guille.olor' : 'mirar.guille');
  if (item === 'colonia') {
    // Made before he needs it: he keeps it for later.
    if (!f(g, 'g.olor')) return g.hablar('g.colonia.antes');
    g.quitar('colonia');
    g.poner('g.limpio');
    g.avanzarReloj(1);
    await g.hablar('g.colonia.usar');
    return;
  }
  if (item === 'alcoholRomero') return g.hablar('g.colonia.falta');
  return g.hablar('nadacontigo');
}

export function objetivo(g: Aventura) {
  if (!f(g, 'g.pesados')) return texto(!f(g, 'basculaLista') ? (f(g, 'g.basculaVista') ? 'objetivo.guille.pilas' : 'objetivo.guille') : 'objetivo.guille.pesar');
  if (!f(g, 'g.limpio')) return texto('objetivo.guille.olor');
  return texto('objetivo.guille.salir');
}

export function pista(g: Aventura) {
  if (!f(g, 'basculaLista')) {
    if (!f(g, 'g.basculaVista')) return texto('pista.guille.bascula');
    if (!f(g, 'g.pilas')) return texto('pista.guille.radio');
    return texto('pista.guille.pilas');
  }
  if (!f(g, 'g.pesados')) return texto('pista.guille.pesar');
  if (!f(g, 'g.limpio')) {
    if (g.tiene('colonia')) return texto('pista.guille.ponerse');
    if (g.tiene('alcoholRomero')) return texto('pista.guille.agua');
    if (!f(g, 'g.alcohol')) return texto('pista.guille.botiquin');
    if (!f(g, 'g.romero')) return texto('pista.guille.romero');
    return texto('pista.guille.combinar');
  }
  return texto('pista.guille.salir');
}

/** Live bits: notes from the radio while it plays, flies round Guille while he stinks. */
export function dibujar(g: Aventura, ctx: CanvasRenderingContext2D, capa: string) {
  const m = g.motor;
  const px = m.px;
  const t = m.t;
  if (capa === 'granja' && !f(g, 'g.pilas')) {
    const r = g.S.spots.radio;
    ctx.save();
    ctx.setTransform(px, 0, 0, px, m.off(1) * px, 0);
    ctx.font = `400 34px ${FONTS.body}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i / 3) % 1;
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
      ctx.fillStyle = '#ffe8b0';
      ctx.fillText(i % 2 ? '♪' : '♫', r.x + 20 + u * 60 + Math.sin(u * 8 + i) * 14, r.y - 20 - u * 140);
    }
    ctx.restore();
  }
  const G = g.pjs.get('guille');
  if (capa === 'frente' && G && G.visible && f(g, 'g.olor') && !f(g, 'g.limpio') && g.estado.donde.guille?.escena === g.escena) {
    const k = m.f(G.y);
    const s = m.escala(k);
    const x0 = m.screenX(G.X, k);
    const y0 = G.y - 230 * s;
    ctx.save();
    ctx.setTransform(px, 0, 0, px, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = t * (2.4 + i * 0.37) + i * 1.9;
      const x = x0 + Math.cos(a) * (70 + i * 9) * s + Math.sin(t * 7 + i) * 6;
      const y = y0 + Math.sin(a * 1.3) * (60 + i * 6) * s;
      ctx.fillStyle = 'rgba(220,235,255,0.8)';
      const ala = 1 + Math.abs(Math.sin(t * 40 + i)) * 2;
      ctx.beginPath();
      ctx.ellipse(x - 6, y - 7, 8, 2 + ala, -0.6, 0, Math.PI * 2);
      ctx.ellipse(x + 6, y - 7, 8, 2 + ala, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16161a';
      ctx.beginPath();
      ctx.ellipse(x, y, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Green waves of pong.
    ctx.strokeStyle = 'rgba(160,200,90,0.75)';
    ctx.lineWidth = 6;
    // Stink lines rising at both sides, cartoon style.
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.5 + i / 4) % 1;
      const lado = i % 2 ? 1 : -1;
      const xx = x0 + lado * 75 * s;
      const yy = y0 + 120 * s - u * 160 * s;
      ctx.globalAlpha = Math.sin(u * Math.PI);
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.bezierCurveTo(xx - 14 * s, yy - 14 * s, xx + 14 * s, yy - 28 * s, xx, yy - 42 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
}
