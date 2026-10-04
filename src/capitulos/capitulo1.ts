// Chapter 1: four stories, one per protagonist, that end at the Bar del Río.
// The player starts with whoever they like and can switch at any time; when a
// story ends, that protagonist fades out on the way and, once the four are on
// their way, they all arrive at the terrace together.
//
// Fran's story: he wakes up from his nap at 20:35. He was meant to be at the
// Bar del Río at nine. The couple he shares with have locked the door from
// outside, Aceituna is lying on his keys, and he is in his boxers. She only gets
// up for ham thrown into her mouth: «la rana de Aceituna» (src/ui/rana.ts).
// Guille's story is in ./guille.ts, Pablo's in ./pablo.ts and Chuchi's in ./chuchi.ts.
//
// Mechanics, one per step: walk, look (long press), use and pick up, the bag,
// using an item on something, using it on yourself, and a touch minigame.
// Every line comes from src/textos/capitulo1.md.
import { escena as piso } from '../arte/escenas/piso.mjs';
import { escena as calle } from '../arte/escenas/calle.mjs';
import { escena as parque } from '../arte/escenas/parque.mjs';
import { escena as granja } from '../arte/escenas/granja.mjs';
import { escena as backstage } from '../arte/escenas/backstage.mjs';
import * as guille from './guille';
import * as pablo from './pablo';
import * as chuchi from './chuchi';
import type { Aventura, Capitulo, ZonaLogica } from '../juego/aventura';
import type { Estado } from '../juego/estado';
import type { PjId } from '../juego/reparto';
import type { Escena } from '../motor/escena';
import { dialogo, texto } from '../juego/textos';
import { abrirMovil } from '../ui/movil';
import { jugarRana } from '../ui/rana';
import { REPARTO } from '../juego/reparto';
import { FONTS } from '../motor/escena';

const HORA = (h: number, m: number) => h * 60 + m;
const SOFA = { u: 2455, k: 1.42, y: 790 };

function estadoInicial(): Estado {
  return {
    v: 3,
    activo: 'fran',
    jugables: ['fran', 'pablo', 'chuchi', 'guille'],
    llegados: [],
    donde: {
      fran: { escena: 'piso', X: 1830, y: 900, face: 1 },
      pablo: { escena: 'backstage', X: 2240, y: 880, face: 1 },
      chuchi: { escena: 'parque', X: 2380, y: 880, face: 1 },
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

/** Aceituna is up (and off the keys). Older saves still say it with olives. */
const levantada = (g: Aventura) => g.flag('jamonComido') || g.flag('aceitunasComidas');

/** Ham for Aceituna: handed over, she sulks; tossed into her mouth, she cannot resist. */
async function tirarJamon(g: Aventura) {
  if (!g.flag('jamonOfrecido')) {
    g.poner('jamonOfrecido');
    await g.hablar('jamon.aceituna');
  }
  // The minigame covers the whole screen: the scene underneath stops drawing.
  g.pausado = true;
  const F = REPARTO.fran;
  const r = await jugarRana(g.root, {
    cuerpoFran: (animo) => F.arte.body({ mood: animo }, g.estado.ropa.fran ?? F.ropa),
    joints: (F.arte as unknown as { JOINTS: Record<string, number[]> }).JOINTS,
    rapido: g.rapido,
  }).finally(() => (g.pausado = false));
  if (r === 'cancelado') return g.hablar('rana.cancelada');
  if (r === 'hecho') g.minijuegoSuperado('rana');
  g.quitar('jamon');
  g.poner('jamonComido');
  g.poner('llavesALaVista');
  g.avanzarReloj(5);
  // Off the bed and over to Fran, wagging.
  g.perroModo = 'quieta';
  const D = g.perro;
  const Fr = g.activo;
  if (D) await g.perroIr(Fr.X + 110 * (Fr.face || 1), Fr.y + 6);
  g.perroDestino = null;
  await g.hablar(r === 'saltado' ? 'rana.saltado' : 'rana.despues');
  g.perroModo = 'sigue';
  await nervios(g);
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
    grifo: {},
    nevera: {
      async usar() {
        if (g.flag('jamon')) return g.hablar('usar.nevera.vacia');
        g.poner('jamon');
        await g.hablar('usar.nevera');
        g.dar('jamon');
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

/** The Bar del Río's door, on the street (calle.mjs), where they go in. */
const PUERTA_BAR = { X: 6712, y: 838 };

/**
 * The end of the chapter: the four of them reach the terrace of the Río at the
 * same time, talk about Vero on the way to the door and go in, one by one. Fade
 * to black, the narrator, «Continuará…», and the end card.
 */
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
  await g.hablar('final.entrar');
  g.hud.cerrarDialogo();
  // In through the door, one after another: Guille first, Fran holding the door.
  const orden: PjId[] = ['guille', 'chuchi', 'pablo', 'fran'];
  await Promise.all(
    orden.map(async (id, i) => {
      await g.esperar(i * 450);
      await g.andar(PUERTA_BAR.X + (i - 1.5) * 10, PUERTA_BAR.y, id);
      const p = g.pjs.get(id);
      if (p) p.visible = false;
    }),
  );
  await g.esperar(400);
  await g.velar(true);
  await g.hablar('final.dentro');
  g.hud.cerrarDialogo();
  await g.hud.rotulo(texto('fin.continuara'), texto('fin.capitulo'), undefined, 'continuara');
  // Back on the terrace, for whoever wants to stay a while after the end card.
  for (const id of e.jugables) {
    const p = g.pjs.get(id);
    if (p) Object.assign(p, { X: desde[id][2], y: desde[id][3], visible: true });
    p?.lookAt(6820);
  }
  g.foco = null;
  g.capituloSuperado(1);
  await g.velar(false);
  g.onFin?.();
}

export const capitulo1: Capitulo = {
  escenas: {
    piso: () => piso() as unknown as Escena,
    calle: () => calle() as unknown as Escena,
    parque: () => parque() as unknown as Escena,
    granja: () => granja() as unknown as Escena,
    backstage: () => backstage() as unknown as Escena,
  },

  estadoInicial,

  // Chuchi's real story (Bolilandia) came after his placeholder: an old save where
  // he already got to the bar without it plays it now (unless the chapter is over).
  caducados: (e) => (!e.final && e.llegados.includes('chuchi') && !e.flags['c.vencido'] ? ['chuchi'] : []),

  zonas(g, escena) {
    if (escena === 'piso') return zonasPiso(g);
    if (escena === 'calle') return zonasCalle(g);
    if (escena === 'granja') return guille.zonasGranja(g);
    if (escena === 'backstage') return pablo.zonasBackstage(g);
    if (escena === 'parque') return chuchi.zonasParque(g);
    return {};
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
      // Aceituna plays dead on the keys until the ham flies.
      g.perroModo = levantada(g) ? 'sigue' : 'tumbada';
      if (!levantada(g) && g.perro) Object.assign(g.perro, { X: g.S.spots.cama.X + 4, y: g.S.spots.cama.y + 2, face: -1 });
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
      const libre = levantada(g);
      if (item === 'jamon' && !libre) return tirarJamon(g);
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
    if (quien === 'chuchi') return chuchi.aSiMismo(g, item, mirar);
    if (quien !== 'fran') return g.hablar(mirar || !item ? `mirar.${quien}` : 'nadacontigo');
    const ropa = g.estado.ropa[quien] ?? 'calle';
    if (mirar || !item) return g.hablar(`mirar.fran.${ropa === 'casa' ? 'casa' : 'calle'}`);
    if (item === 'ropa') return vestirse(g);
    if (item === 'jamon') return g.hablar('jamon.fran');
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
    if (quien === 'chuchi') return chuchi.objetivo(g);
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
    if (quien === 'chuchi') return chuchi.pista(g);
    if (g.escena === 'calle') return texto('pista.bar');
    if (!f('horaVista')) return texto('pista.hora');
    if (!f('movil')) return texto('pista.movil');
    if (!f('puertaProbada')) return texto('pista.puerta');
    if (!f('llaves')) {
      if (!f('llaveroVisto') && !f('aceitunaVista')) return texto('pista.llavero');
      if (!f('aceitunaVista')) return texto('pista.aceituna');
      if (f('llavesALaVista')) return texto('pista.cogerllaves');
      if (!f('jamon')) return texto(f('huesosVistos') ? 'pista.huesos' : 'pista.soborno');
      if (!f('jamonOfrecido')) return texto('pista.jamon');
      return texto('pista.rana');
    }
    if (!f('ropaCogida')) return texto('pista.ropa');
    if (!f('vestido')) return texto('pista.vestir');
    return texto('pista.abrirpuerta');
  },

  async combinar(g, a, b) {
    return (await guille.combinar(g, a, b)) || (await pablo.combinar(g, a, b)) || chuchi.combinar(g, a, b);
  },

  // Pablo's shadow walks with him backstage (until the chapter's final).
  sombra: (g, escena) => escena === 'backstage' && !g.estado.final && pablo.sombraEnEscena(g),

  dibujarFijo(g, ctx) {
    if (g.escena === 'parque') chuchi.dibujarFijo(g, ctx);
  },

  dibujar(g, ctx, capa) {
    if (g.escena === 'granja') return guille.dibujar(g, ctx, capa);
    if (g.escena === 'backstage') return pablo.dibujar(g, ctx, capa);
    if (g.escena === 'parque') return chuchi.dibujar(g, ctx, capa);
    const m = g.motor;
    const px = m.px;
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
