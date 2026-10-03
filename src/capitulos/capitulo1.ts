// Chapter 1: four stories, one per protagonist, that end at the Bar del Río.
// The player starts with whoever they like and can switch at any time; when a
// story ends, that protagonist fades out on the way and, once the four are on
// their way, they all arrive at the terrace together.
//
// Fran's story: he wakes up from his nap at 20:35. He was meant to be at the
// Bar del Río at nine. The couple he shares with have locked the door from
// outside, Aceituna is lying on his keys, and he is in his boxers.
// Guille's story is in ./guille.ts and Pablo's in ./pablo.ts. Chuchi's is a
// placeholder (a room and a way out) until it is written.
//
// Mechanics, one per step: walk, look (long press), use and pick up, the bag,
// using an item on something, using it on yourself, and a touch minigame.
// Every line comes from src/textos/capitulo1.md.
import { escena as piso } from '../arte/escenas/piso.mjs';
import { escena as calle } from '../arte/escenas/calle.mjs';
import { escena as provisional } from '../arte/escenas/provisional.mjs';
import { escena as granja } from '../arte/escenas/granja.mjs';
import { escena as backstage } from '../arte/escenas/backstage.mjs';
import * as guille from './guille';
import * as pablo from './pablo';
import type { Aventura, Capitulo, ZonaLogica } from '../juego/aventura';
import type { Estado } from '../juego/estado';
import type { PjId } from '../juego/reparto';
import type { Escena } from '../motor/escena';
import { dialogo, texto } from '../juego/textos';
import { abrirMovil } from '../ui/movil';
import { jugarTarro } from '../ui/tarro';
import { FONTS } from '../motor/escena';

const HORA = (h: number, m: number) => h * 60 + m;
const SOFA = { u: 2455, k: 1.42, y: 790 };

/** Olives rolling on the kitchen floor after the jar pops. */
let aceitunas: Array<{ X: number; y: number }> = [];

/** Where each placeholder story happens. */
const CASA: Record<'chuchi', string> = { chuchi: 'casaChuchi' };

function estadoInicial(): Estado {
  return {
    v: 3,
    activo: 'fran',
    jugables: ['fran', 'pablo', 'chuchi', 'guille'],
    llegados: [],
    donde: {
      fran: { escena: 'piso', X: 1830, y: 900, face: 1 },
      pablo: { escena: 'backstage', X: 2240, y: 880, face: 1 },
      chuchi: { escena: CASA.chuchi, X: 760, y: 890, face: 1 },
      guille: { escena: 'granja', X: 1000, y: 890, face: 1 },
    },
    ropa: { fran: 'casa' },
    inv: { fran: [], pablo: [], chuchi: [], guille: [] },
    flags: {},
    minutos: { fran: HORA(20, 35), pablo: HORA(20, 30), chuchi: HORA(20, 20), guille: HORA(20, 10) },
    usos: {},
  };
}

/** Fran's nerves go up with the clock. */
async function nervios(g: Aventura) {
  if (g.estado.minutos.fran >= HORA(20, 45) && !g.flag('nervios1')) {
    g.poner('nervios1');
    await g.hablar('nervios.1');
  } else if (g.estado.minutos.fran >= HORA(20, 55) && !g.flag('nervios2') && !g.flag('vestido')) {
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
        if (g.estado.final || g.llegado('fran')) return g.hablar('mirar.bar');
        await llegaFran(g);
      },
    },
  };
}

/** Fran sees the Río at the end of the street: fade out before he gets there. */
async function llegaFran(g: Aventura) {
  g.poner('bar');
  g.avanzarReloj(5);
  await g.hablar('llegada.fran');
  await g.enCamino('fran');
}

/** A placeholder story: a room, one object that hints at the story, and the way out. */
function zonasProvisional(g: Aventura, quien: 'chuchi'): Record<string, ZonaLogica> {
  return {
    ventana: {
      mirar: () => g.hablar(`prov.${quien}.ventana`),
      usar: () => g.hablar(`prov.${quien}.ventana`),
    },
    cosa: {
      nombre: () => texto(`zona.cosa.${quien}`),
      mirar: () => g.hablar(`prov.${quien}.cosa`),
      async usar() {
        g.poner(`cosa.${quien}`);
        g.avanzarReloj(5);
        await g.hablar(`prov.${quien}.usar`);
      },
    },
    salida: {
      nombre: () => texto('zona.salida'),
      mirar: () => g.hablar(`prov.${quien}.salida.mirar`),
      async usar() {
        if (!g.flag(`cosa.${quien}`)) return g.hablar(`prov.${quien}.salida.antes`);
        g.avanzarReloj(4);
        await g.hablar(`prov.${quien}.salida`);
        await g.enCamino(quien);
      },
    },
  };
}

/** The four of them reach the terrace of the Río at the same time. */
async function final(g: Aventura) {
  const e = g.estado;
  const hora = Math.max(...Object.values(e.minutos));
  for (const id of e.jugables) e.minutos[id] = hora;
  // Each one comes from a different side; they walk in together.
  const desde: Record<PjId, [number, number, number, number]> = {
    fran: [5450, 900, 6640, 905],
    pablo: [5300, 860, 6330, 872],
    chuchi: [8300, 872, 6980, 875],
    guille: [8450, 930, 7160, 930],
  };
  for (const id of e.jugables) {
    const [X, y] = desde[id];
    e.donde[id] = { escena: 'calle', X, y, face: X < 6800 ? 1 : -1 };
  }
  g.vestir('fran', 'calle');
  e.activo = 'fran';
  g.poner('bar');
  await g.irA('calle');
  g.foco = 6820;
  await g.hablar('final.antes');
  await Promise.all(e.jugables.map((id) => g.andar(desde[id][2], desde[id][3], id)));
  for (const id of e.jugables) g.pjs.get(id)?.lookAt(6820);
  await g.esperar(300);
  await g.hablar('final');
  g.foco = null;
  g.onFin?.();
}

export const capitulo1: Capitulo = {
  escenas: {
    piso: () => piso() as unknown as Escena,
    calle: () => calle() as unknown as Escena,
    // Placeholders until the real stories arrive (src/arte/escenas/provisional.mjs).
    casaChuchi: () => provisional({ id: 'casaChuchi', name: 'Casa de Chuchi', pared: '#cfd8c8', techo: '#b8c2b0', rodapie: '#f0ebe0', suelo: ['#c9a87c', '#d2b286', '#bf9e72'], ambient: '#4e5878', objeto: 'juguetes', luz: '#ffe0b0', semilla: 5 }) as unknown as Escena,
    granja: () => granja() as unknown as Escena,
    backstage: () => backstage() as unknown as Escena,
  },

  estadoInicial,

  zonas(g, escena) {
    if (escena === 'piso') return zonasPiso(g);
    if (escena === 'calle') return zonasCalle(g);
    if (escena === 'granja') return guille.zonasGranja(g);
    if (escena === 'backstage') return pablo.zonasBackstage(g);
    const quien = (Object.keys(CASA) as Array<keyof typeof CASA>).find((id) => CASA[id] === escena)!;
    return zonasProvisional(g, quien);
  },

  situacion: (quien) => texto(`situacion.${quien}`),

  async empezar(g, quien) {
    if (quien === 'fran') {
      await g.hablar('intro');
      g.hud.ayuda(texto('objetivo.despierta'), 8);
      return;
    }
    await g.hablar(`intro.${quien}`);
    if (quien === 'pablo') await pablo.aparece(g);
    g.ayudaUnaVez('cambiar');
  },

  final,

  async alEntrar(g, escena) {
    if (escena === 'backstage' && g.sombra && g.flag('p.canon') && !g.flag('p.ganado')) g.sombra.visible = false;
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

  tick(g) {
    // Fran walking past the crossing sees the Río: his story ends there.
    const F = g.pjs.get('fran');
    if (g.escena === 'calle' && g.estado.activo === 'fran' && !g.llegado('fran') && !g.estado.final && !g.ocupadoAhora && !g.hud.enDialogo && F && F.X > 6150) {
      void g.ejecutar(() => llegaFran(g));
    }
  },

  tocar(g) {
    if (g.escena === 'piso' && g.estado.activo === 'fran' && !g.flag('despierto')) {
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
    if (quien === 'sombra') return pablo.sombra(g, item, mirar);
    if (quien !== g.estado.activo) {
      // After the final: the crew on the terrace, chatting.
      return g.hablar(`charla.${quien}`);
    }
    if (quien === 'guille') return guille.aSiMismo(g, item, mirar);
    if (quien === 'pablo') return pablo.aSiMismo(g, item, mirar);
    if (quien !== 'fran') return g.hablar(mirar || !item ? `mirar.${quien}` : 'nadacontigo');
    const ropa = g.estado.ropa[quien] ?? 'calle';
    if (mirar || !item) return g.hablar(`mirar.fran.${ropa === 'casa' ? 'casa' : 'calle'}`);
    if (item === 'ropa') return vestirse(g);
    if (item === 'tarro') return abrirTarro(g, false);
    if (item === 'tarroCaliente') return abrirTarro(g, true);
    if (item === 'movil') return verMovil(g);
    return g.hablar('nadacontigo');
  },

  async mirarObjeto(g, item) {
    await g.decir(g.estado.activo, texto(`objeto.${item}.texto`));
  },

  objetivo(g) {
    if (g.estado.final) return texto('objetivo.fin');
    const quien = g.estado.activo;
    if (quien === 'guille') return guille.objetivo(g);
    if (quien === 'pablo') return pablo.objetivo(g);
    if (quien !== 'fran') return texto(g.flag(`cosa.${quien}`) ? 'objetivo.bar' : `objetivo.${quien}`);
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
    const quien = g.estado.activo;
    if (quien === 'guille') return guille.pista(g);
    if (quien === 'pablo') return pablo.pista(g);
    if (quien !== 'fran') return texto(f(`cosa.${quien}`) ? `pista.${quien}.salir` : `pista.${quien}`);
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

  async combinar(g, a, b) {
    return (await guille.combinar(g, a, b)) || pablo.combinar(g, a, b);
  },

  // Pablo's shadow walks with him backstage (until the chapter's final).
  sombra: (g, escena) => escena === 'backstage' && !g.estado.final && pablo.sombraEnEscena(g),

  dibujar(g, ctx, capa) {
    if (g.escena === 'granja') return guille.dibujar(g, ctx, capa);
    if (g.escena === 'backstage') return pablo.dibujar(g, ctx, capa);
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
