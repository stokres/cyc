// Chapter 1, phase 1: Fran wakes up from his nap at 20:35. He was meant to be at
// the Bar del Río at nine. The couple he shares with have locked the door from
// outside, Aceituna is lying on his keys, and he is in his boxers.
//
// Mechanics, one per step: walk, look (long press), use and pick up, the bag,
// using an item on something, using it on yourself, and a touch minigame.
// Every line comes from src/textos/capitulo1.md.
import { escena as piso } from '../arte/escenas/piso.mjs';
import { escena as calle } from '../arte/escenas/calle.mjs';
import type { Aventura, Capitulo, ZonaLogica } from '../juego/aventura';
import type { Estado } from '../juego/estado';
import type { Escena } from '../motor/escena';
import { dialogo, texto } from '../juego/textos';
import { abrirMovil } from '../ui/movil';
import { jugarTarro } from '../ui/tarro';
import { FONTS } from '../motor/escena';

const HORA = (h: number, m: number) => h * 60 + m;
const SOFA = { u: 2455, k: 1.42, y: 790 };

/** Olives rolling on the kitchen floor after the jar pops. */
let aceitunas: Array<{ X: number; y: number }> = [];

function estadoInicial(): Estado {
  return {
    v: 2,
    activo: 'fran',
    jugables: ['fran'],
    donde: { fran: { escena: 'piso', X: 1830, y: 900, face: 1 } },
    ropa: { fran: 'casa' },
    inv: { fran: [], pablo: [], chuchi: [], guille: [] },
    flags: {},
    minutos: HORA(20, 35),
    usos: {},
  };
}

/** Fran's nerves go up with the clock. */
async function nervios(g: Aventura) {
  if (g.estado.minutos >= HORA(20, 45) && !g.flag('nervios1')) {
    g.poner('nervios1');
    await g.hablar('nervios.1');
  } else if (g.estado.minutos >= HORA(20, 55) && !g.flag('nervios2') && !g.flag('vestido')) {
    g.poner('nervios2');
    await g.hablar('nervios.2');
  }
}

async function despertar(g: Aventura) {
  const F = g.activo;
  g.poner('despierto');
  F.eyesClosed = false;
  F.enCapa = null;
  F.rot = 0;
  Object.assign(F, { X: 1830, y: 900, face: 1 });
  // Up from behind the sofa.
  for (let t = 0; t <= 1; t += 0.05) {
    const e = t * t * (3 - 2 * t);
    F.lift = -200 * (1 - e);
    await g.esperar(30);
  }
  F.lift = 0;
  g.foco = null;
  await g.hablar('despertar');
  g.ayudaUnaVez('mirar');
}

/** Fran's phone: the group chat and his (slightly optimistic) reply. */
async function verMovil(g: Aventura) {
  await abrirMovil(g.root, dialogo('movil.chat'), dialogo('movil.respuesta', { hora: g.hora }), g.rapido);
  if (!g.flag('chatLeido')) {
    g.poner('chatLeido');
    g.avanzarReloj(3);
    await g.hablar('movil.despues');
    if (!g.flag('horaVista')) {
      g.poner('horaVista');
      await g.hablar('mirar.reloj');
    }
    g.ayudaUnaVez('bolsa');
  } else await g.hablar('movil.otravez');
}

async function abrirTarro(g: Aventura, caliente: boolean) {
  const r = await jugarTarro(g.root, caliente);
  if (r === 'cancelado') return;
  if (r === 'duro') {
    g.sound.nope();
    g.poner('tarroIntentado');
    g.avanzarReloj(3);
    await g.hablar('tarro.duro');
    await nervios(g);
    return;
  }
  // ¡PLOC! Olives everywhere; Aceituna cannot resist.
  g.sound.splash();
  g.quitar('tarroCaliente');
  g.poner('tarroAbierto');
  const F = g.activo;
  aceitunas = Array.from({ length: 14 }, (_, i) => ({ X: F.X - 260 + ((i * 97) % 520) + Math.sin(i) * 30, y: Math.min(g.S.walk.y1, Math.max(g.S.walk.y0, F.y - 30 + ((i * 41) % 80))) }));
  await g.hablar('tarro.abierto');
  g.perroModo = 'quieta';
  const D = g.perro!;
  await g.esperar(300);
  while (aceitunas.length) {
    // Nearest olive first.
    aceitunas.sort((a, b) => Math.hypot(a.X - D.X, a.y - D.y) - Math.hypot(b.X - D.X, b.y - D.y));
    const o = aceitunas[0];
    await g.perroIr(o.X + 20 * Math.sign(D.X - o.X || 1), o.y);
    aceitunas = aceitunas.filter((a) => Math.hypot(a.X - o.X, a.y - o.y) > 90);
    await g.esperar(220);
  }
  g.perroDestino = null;
  g.poner('aceitunasComidas');
  g.poner('llavesALaVista');
  g.avanzarReloj(4);
  await g.hablar('aceituna.come');
  g.perroModo = 'sigue';
}

async function vestirse(g: Aventura) {
  g.quitar('ropa');
  await g.hablar('vestirse');
  g.vestir('fran', 'calle');
  g.poner('vestido');
  g.sound.pickup();
  g.avanzarReloj(4);
}

/** Try the front door: locked, no keys, no trousers, or finally out. */
async function puerta(g: Aventura) {
  if (!g.flag('puertaProbada')) {
    g.poner('puertaProbada');
    g.sound.nope();
    g.avanzarReloj(2);
    await g.hablar('usar.puerta');
    return;
  }
  if (!g.tiene('llaves')) {
    g.sound.nope();
    await g.hablar('usar.puerta.sinllaves');
    return;
  }
  if (!g.flag('vestido')) {
    await g.hablar('usar.puerta.calzoncillos');
    return;
  }
  g.poner('puertaAbierta');
  g.sound.pickup();
  await g.hablar('usar.puerta.abrir');
  g.estado.donde.fran = { escena: 'calle', X: 420, y: 862, face: 1 };
  g.avanzarReloj(3);
  await g.irA('calle');
  g.poner('enCalle');
  await g.hablar('salir.calle');
  g.ayudaUnaVez('ojo');
}

function zonasPiso(g: Aventura): Record<string, ZonaLogica> {
  const despierto = () => g.flag('despierto');
  const z: Record<string, ZonaLogica> = {
    reloj: {
      async mirar() {
        g.poner('horaVista');
        await g.hablar('mirar.reloj');
        g.ayudaUnaVez('usar');
      },
    },
    ventana: {},
    grifo: {
      async usarObjeto(item) {
        if (item === 'tarro') {
          g.cambiarObjeto('tarro', 'tarroCaliente');
          g.poner('tarroCaliente');
          g.avanzarReloj(3);
          await g.hablar('tarro.calentar');
          await nervios(g);
          return true;
        }
        if (item === 'tarroCaliente') {
          await g.hablar('grifo.calentado');
          return true;
        }
        return false;
      },
    },
    nevera: {
      async usar() {
        if (g.flag('tarro')) return g.hablar('usar.nevera.vacia');
        g.poner('tarro');
        await g.hablar('usar.nevera');
        g.dar('tarro');
        g.avanzarReloj(2);
      },
    },
    movil: {
      activa: () => !g.flag('movil'),
      async usar() {
        await g.hablar('coger.movil');
        g.poner('movil');
        g.dar('movil');
        await verMovil(g);
      },
    },
    huesos: {
      async usar() {
        g.poner('huesosVistos');
        await g.hablar('usar.huesos');
      },
      async mirar() {
        g.poner('huesosVistos');
        await g.hablar('mirar.huesos');
      },
    },
    tocadiscos: {},
    chimenea: {},
    cuadro: {},
    cartel: {},
    sofa: {},
    terraza: {
      async mirar() {
        await g.hablar(g.flag('ropaCogida') ? 'mirar.terraza.vacia' : 'mirar.terraza');
      },
      async usar() {
        if (g.flag('ropaCogida')) return g.hablar('usar.terraza.vacia');
        const F = g.activo;
        F.visible = false;
        g.sound.step();
        await g.esperar(900);
        g.poner('ropaCogida');
        g.avanzarReloj(3);
        F.visible = true;
        await g.hablar('usar.terraza');
        g.dar('ropa');
        await g.hablar('coger.ropa');
        g.ayudaUnaVez('tuyo');
      },
    },
    bano: {},
    perchero: {},
    llavero: {
      async usar() {
        g.poner('llaveroVisto');
        await g.hablar(g.flag('llaves') ? 'mirar.llavero' : 'usar.llavero');
      },
    },
    puerta: {
      usar: () => puerta(g),
      async usarObjeto(item) {
        if (item !== 'llaves') return false;
        await puerta(g);
        return true;
      },
    },
    telefonillo: {},
    llaves: {
      activa: () => g.flag('llavesALaVista') && !g.flag('llaves'),
      async usar() {
        g.poner('llaves');
        g.poner('llavesALaVista', false);
        g.dar('llaves');
        g.avanzarReloj(1);
        await g.hablar('coger.llaves');
      },
    },
  };
  // While Fran sleeps, nothing can be touched: any tap wakes him (see tocar).
  for (const v of Object.values(z)) {
    const prev = v.activa;
    v.activa = () => despierto() && (prev ? prev() : true);
  }
  return z;
}

function zonasCalle(g: Aventura): Record<string, ZonaLogica> {
  return {
    ventanaBajo: {},
    portal: {},
    merceria: {},
    fruteria: {},
    panaderia: {},
    contenedores: {},
    parque: {},
    dragon: { acercarse: false },
    farmacia: {},
    senal: {},
    calleLateral: { acercarse: false },
    puertaAzul: {},
    puerta40: {},
    peluqueria: {},
    bar: {
      async usar() {
        if (g.flag('bar')) return g.hablar('mirar.bar');
        g.poner('bar');
        g.avanzarReloj(6);
        await g.hablar('llegada.bar');
        g.onFin?.();
      },
    },
  };
}

export const capitulo1: Capitulo = {
  escenas: {
    piso: () => piso() as unknown as Escena,
    calle: () => calle() as unknown as Escena,
  },

  estadoInicial,

  zonas(g, escena) {
    return escena === 'piso' ? zonasPiso(g) : zonasCalle(g);
  },

  async empezar(g) {
    await g.hablar('intro');
    g.hud.ayuda(texto('objetivo.despierta'), 8);
  },

  async alEntrar(g, escena) {
    if (escena === 'piso') {
      const F = g.pjs.get('fran');
      if (F && !g.flag('despierto')) {
        // Asleep behind the sofa's backrest, feet over the armrest.
        F.enCapa = { ...SOFA };
        F.rot = -90;
        F.eyesClosed = true;
        g.foco = 1880;
      }
      // Aceituna plays dead on the keys until the olives fly.
      g.perroModo = g.flag('aceitunasComidas') ? 'sigue' : 'tumbada';
      if (!g.flag('aceitunasComidas') && g.perro) Object.assign(g.perro, { X: g.S.spots.cama.X + 4, y: g.S.spots.cama.y + 2, face: -1 });
    }

  },

  tocar(g) {
    if (g.escena === 'piso' && !g.flag('despierto')) {
      void g.ejecutar(() => despertar(g));
      return true;
    }
    return false;
  },

  async personaje(g, quien, item, mirar) {
    if (quien === 'aceituna') {
      const libre = g.flag('aceitunasComidas');
      if (item === 'tarro' || item === 'tarroCaliente') return g.hablar('tarro.aceituna');
      if (item) return g.hablar('nofunciona');
      g.poner('aceitunaVista');
      if (mirar) return g.hablar(libre ? 'mirar.aceituna.despierta' : g.flag('aceitunaMirada') ? 'mirar.aceituna.otravez' : (g.poner('aceitunaMirada'), 'mirar.aceituna'));
      return g.hablar(libre ? 'usar.aceituna.despierta' : 'usar.aceituna');
    }
    if (quien !== g.estado.activo) {
      // Test mode: the crew on the terrace, chatting.
      return g.hablar(`charla.${quien}`);
    }
    const ropa = g.estado.ropa[quien] ?? 'calle';
    if (mirar || !item) return g.hablar(`mirar.fran.${ropa === 'casa' ? 'casa' : 'calle'}`);
    if (item === 'ropa') return vestirse(g);
    if (item === 'tarro') return abrirTarro(g, false);
    if (item === 'tarroCaliente') return abrirTarro(g, true);
    if (item === 'movil') return verMovil(g);
    return g.hablar('nadacontigo');
  },

  async mirarObjeto(g, item) {
    await g.decir('fran', texto(`objeto.${item}.texto`));
  },

  objetivo(g) {
    if (g.estado.activo !== 'fran') return null;
    if (g.flag('bar')) return texto('objetivo.fin');
    if (g.escena === 'calle') return texto('objetivo.bar');
    if (!g.flag('despierto')) return null;
    if (!g.flag('horaVista')) return texto('objetivo.hora');
    if (!g.flag('puertaProbada')) return texto('objetivo.salir');
    if (!g.flag('llaves')) return texto('objetivo.llaves');
    if (!g.flag('vestido')) return texto('objetivo.vestirse');
    return texto('objetivo.salir');
  },

  pista(g) {
    const f = (k: string) => g.flag(k);
    if (g.escena === 'calle') return texto('pista.bar');
    if (!f('horaVista')) return texto('pista.hora');
    if (!f('movil')) return texto('pista.movil');
    if (!f('puertaProbada')) return texto('pista.puerta');
    if (!f('llaves')) {
      if (!f('llaveroVisto') && !f('aceitunaVista')) return texto('pista.llavero');
      if (!f('aceitunaVista')) return texto('pista.aceituna');
      if (f('llavesALaVista')) return texto('pista.cogerllaves');
      if (!f('tarro')) return texto(f('huesosVistos') ? 'pista.huesos' : 'pista.soborno');
      if (!f('tarroIntentado') && !f('tarroCaliente')) return texto('pista.tarro');
      if (!f('tarroCaliente')) return texto('pista.caliente');
      return texto('pista.abrir');
    }
    if (!f('ropaCogida')) return texto('pista.ropa');
    if (!f('vestido')) return texto('pista.vestir');
    return texto('pista.abrirpuerta');
  },

  dibujar(g, ctx, capa) {
    const m = g.motor;
    const px = m.px;
    if (capa === 'suelo' && aceitunas.length) {
      ctx.save();
      ctx.setTransform(px, 0, 0, px, 0, 0);
      for (const o of aceitunas) {
        const k = m.f(o.y);
        const x = m.screenX(o.X, k);
        ctx.fillStyle = '#3a4410';
        ctx.beginPath();
        ctx.ellipse(x, o.y, 11 * k, 8 * k, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b7a2e';
        ctx.beginPath();
        ctx.ellipse(x - 1, o.y - 1, 9 * k, 6.5 * k, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(220,235,160,0.7)';
        ctx.beginPath();
        ctx.ellipse(x - 4 * k, o.y - 3 * k, 3 * k, 2 * k, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (capa === 'muebles' && g.escena === 'piso' && !g.flag('despierto')) {
      // Zzz rising from behind the sofa.
      const sp = g.S.spots.sofa;
      const off = m.off(sp.k);
      ctx.save();
      ctx.setTransform(px, 0, 0, px, 0, 0);
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(20,16,30,0.6)';
      ctx.fillStyle = '#f3ead6';
      for (let i = 0; i < 3; i++) {
        const u = (m.t * 0.35 + i / 3) % 1;
        ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9;
        ctx.font = `400 ${Math.round(30 + u * 30)}px ${FONTS.display}`;
        const x = sp.zx + off + u * 70 + Math.sin(u * 6) * 10;
        const y = sp.zy - u * 170;
        ctx.strokeText('z', x, y);
        ctx.fillText('z', x, y);
      }
      ctx.restore();
    }
  },
};
