// Capítulo 1 (demo): "Jueves en Usera".
// PLACEHOLDER SCRIPT: the lines below only exist to test the mechanics.
// The real anecdotes and dialogue will come from the crew's own script.
import { CAST, CrewId } from '../art/cast';
import { wait } from '../core/util';
import { Adventure, Chapter, Hotspot, TABLE } from '../game/adventure';
import { ItemId } from '../game/state';
import { ITEMS } from '../art/items';
import { playRonda } from '../minigames/ronda';

type Lines = string | Partial<Record<CrewId, string>> & { all?: string };

function line(g: Adventure, l: Lines): string {
  if (typeof l === 'string') return l;
  return l[g.active.id] ?? l.all ?? '…';
}

const look = (l: Lines) => async (g: Adventure) => g.say(g.active.id, line(g, l));

async function buyPaper(g: Adventure) {
  const a = g.active;
  await a.act('reach', 0.7);
  await g.say(a.id, 'Un rollo de cocina, por favor.');
  await g.say(null, 'El dependiente te lo cobra sin levantar la vista del móvil.');
  g.take(a.id, 'monedas');
  g.give(a.id, 'rollo');
  g.set('rollo');
}

async function wipeTable(g: Adventure) {
  const a = g.active;
  a.face(TABLE.x);
  g.take(a.id, 'rollo');
  a.hold = 'paper';
  const wipe = a.act('wipe', 1.6);
  for (let i = 0; i < 6; i++) {
    g.particles.burst(TABLE.x - 60 + Math.random() * 120, TABLE.y - 130, 4, 'rgba(200,220,255,0.8)', 160, 120, TABLE.y);
    await wait(220);
  }
  await wipe;
  a.hold = null;
  g.set('mesaSeca');
  g.sound.pickup();
  await g.say(a.id, a.id === 'chuchi' ? 'Seca. Como mi sentido del humor.' : 'Seca. Ni el camarero lo habría hecho mejor.', 'happy');
  // The others come over.
  const others = (['fran', 'pablo', 'chuchi'] as CrewId[]).filter((id) => id !== a.id);
  void g.walk(others[0], TABLE.x + 150, TABLE.y - 40);
  await g.walk(others[1], TABLE.x + 230, TABLE.y + 30);
  g.actors[others[0]].face(TABLE.x);
  g.actors[others[1]].face(TABLE.x);
  await g.say('pablo', '¡Mesa! Ahora falta lo importante: la ronda.', 'happy');
  await g.say('chuchi', 'Cuatro cañas. Por si viene alguien más. O por si no.', 'smug');
}

async function finale(g: Adventure, levels: number[]) {
  const ids: CrewId[] = ['fran', 'pablo', 'chuchi'];
  const spots: Record<CrewId, [number, number]> = { fran: [TABLE.x - 190, TABLE.y - 10], pablo: [TABLE.x + 170, TABLE.y - 40], chuchi: [TABLE.x + 230, TABLE.y + 30] };
  await Promise.all(ids.map((id) => g.walk(id, ...spots[id])));
  for (const id of ids) g.actors[id].face(TABLE.x);
  g.tableBeers = levels;
  const total = levels.reduce((s, v) => s + v, 0);
  await g.say('pablo', total > 3.2 ? '¡Ni una gota fuera! Esto hay que celebrarlo.' : total > 2 ? 'Han llegado. Más o menos. Cuenta.' : 'Esto es más espuma que caña, pero oye, la intención es lo que cuenta.', 'happy');
  for (const id of ids) {
    g.actors[id].hold = 'beer';
    void g.actors[id].act('toast', 3);
  }
  await wait(500);
  g.sound.clink();
  await g.say('chuchi', '¡Por Camiones y Caravanas!', 'happy');
  await g.say('fran', 'Desde 2020 brindando con lo que quede en el vaso.', 'happy');
  for (const id of ids) g.actors[id].hold = null;
  g.set('ronda');
}

export const capitulo1: Chapter = {
  hotspots(): Hotspot[] {
    return [
      {
        id: 'bar',
        name: 'Bar La Parada',
        rect: [440, 520, 130, 240],
        stand: [505, 830],
        look: look({
          fran: 'Nuestro bar. Bueno, el bar de todo Usera, a juzgar por la gente.',
          pablo: 'Huele a calamares desde aquí. Es una señal.',
          chuchi: 'Lleno. Como siempre que llegamos tarde. O sea, siempre.',
        }),
        async use(g) {
          if (!g.flag('mesaSeca')) {
            await g.say(g.active.id, 'Está hasta arriba. Primero mesa, luego cañas. Así funciona esto.');
            return;
          }
          if (g.flag('ronda')) {
            await g.say(g.active.id, 'Ya hemos pedido. De momento.');
            return;
          }
          await g.say(g.active.id, 'Voy yo a por la ronda. Cuatro cañas.', 'happy');
          const levels = await playRonda(g, g.active.id);
          await finale(g, levels);
          g.onEnd?.();
        },
      },
      {
        id: 'ventana',
        name: 'Ventana del bar',
        rect: [50, 540, 360, 190],
        stand: [240, 830],
        look: look('Los de siempre en la barra de siempre. Y el camarero, que no nos ha visto. O sí.'),
        use: look('Le hago señas al camarero… Nada. Es un profesional de no mirar.'),
      },
      {
        id: 'pizarra',
        name: 'Pizarra',
        rect: [370, 700, 70, 100],
        stand: [404, 838],
        look: look('Caña, 1,80 €. Hay cosas que no deberían cambiar nunca.'),
        use: look('Caña, 1,80 €. Hay cosas que no deberían cambiar nunca.'),
      },
      {
        id: 'portal',
        name: 'Portal',
        rect: [600, 470, 96, 290],
        stand: [648, 825],
        look: look('Un portal con telefonillo. Tentador.'),
        async use(g) {
          await g.active.act('reach', 0.6);
          await g.say(null, 'Bzzzz.');
          await g.say(g.active.id, 'Nadie. Mejor así.', 'smug');
        },
      },
      {
        id: 'farola',
        name: 'Farola',
        rect: [690, 430, 64, 130],
        stand: [760, 860],
        look: look('Una farola fernandina. Lleva aquí más que nosotros.'),
        use: look('Mejor no me apoyo. La última vez acabó en anécdota.'),
      },
      {
        id: 'neon',
        name: 'Cartel de neón',
        rect: [860, 432, 360, 76],
        stand: [1040, 840],
        look: look({ all: 'El Dragón Dorado. El neón parpadea con más ritmo que nosotros bailando.', pablo: 'Ese cartel tiene más vida nocturna que yo.' }),
        async use(g) {
          await g.active.act('reach', 0.6);
          g.flickerNeon();
          await g.say(g.active.id, 'Ya está. Lo he arreglado. O roto, no sé.', 'surprised');
        },
      },
      {
        id: 'restaurante',
        name: 'Restaurante Dragón Dorado',
        rect: [1030, 540, 120, 220],
        stand: [1090, 830],
        look: look('Huele a pato laqueado. Luego, para cenar.'),
        use: look('Luego, para cenar. Primero, la caña.'),
      },
      {
        id: 'charco',
        name: 'Charco',
        rect: [1060, 905, 240, 50],
        stand: [1180, 930],
        look: look('Un charco con mucho potencial.'),
        async use(g) {
          g.particles.burst(g.active.x, g.active.y, 18, 'rgba(190,210,240,0.85)', 360, 420);
          g.sound.splash();
          await g.say(g.active.id, '¡Plof! Ya puestos…', 'surprised');
        },
      },
      {
        id: 'fruta',
        name: 'Fruta',
        rect: [1415, 745, 270, 50],
        stand: [1520, 842],
        look: look('Naranjas a las once de la noche. Usera nunca duerme.'),
        use: look('Mejor no. El dependiente vigila la fruta como si fuera oro.'),
      },
      {
        id: 'bazar',
        name: 'Bazar 24h',
        rect: [1400, 530, 400, 230],
        stand: [1560, 830],
        look: look('Abierto 24 horas. Aquí venden de todo, incluido lo que no sabías que necesitabas.'),
        async use(g) {
          const a = g.active;
          if (g.flag('rollo')) {
            await g.say(a.id, 'Ya tenemos rollo. No hace falta comprar el bazar entero.');
            return;
          }
          if (g.flag('mesaVista') || g.flag('bazarVisto')) {
            if (g.has(a.id, 'monedas')) return buyPaper(g);
            g.set('bazarIntentado');
            await g.say(
              a.id,
              line(g, {
                fran: 'No llevo suelto y aquí la tarjeta es a partir de cinco euros.',
                chuchi: 'Solo llevo las llaves. Y un abridor, por si acaso.',
                pablo: 'Me he quedado sin suelto.',
              }),
            );
            return;
          }
          g.set('bazarVisto');
          await g.say(a.id, 'No necesito nada. De momento.');
        },
        async useItem(g, item) {
          if (item !== 'monedas') return false;
          if (g.flag('rollo')) {
            await g.say(g.active.id, 'Ya tenemos rollo.');
            return true;
          }
          await buyPaper(g);
          return true;
        },
      },
      {
        id: 'metro',
        name: 'Metro Usera',
        rect: [1730, 490, 80, 300],
        stand: [1740, 842],
        look: look('Usera, línea 6. La circular. Como nuestras conversaciones.'),
        use: look('Todavía es pronto para el último metro. Mucho.'),
      },
      {
        id: 'caravana',
        name: 'Autocaravana',
        rect: [1890, 520, 340, 230],
        stand: [1990, 845],
        look: look({
          fran: 'Una autocaravana aparcada al lado de un camión. Si esto no es una señal…',
          pablo: '¡Camiones y caravanas! El universo nos está mandando un mensaje.',
          chuchi: 'Alguien debería hacer un logo con esto.',
        }),
        use: look('Cerrada. Lástima, tiene pinta de tener nevera.'),
      },
      {
        id: 'camion',
        name: 'Camión',
        rect: [2250, 370, 190, 380],
        stand: [2280, 850],
        look: look('Un camión americano en Usera. Hoy va a pasar algo raro.'),
        use: look('No me pienso subir. Todavía.'),
      },
      {
        id: 'mesa',
        name: 'Mesa de la terraza',
        rect: [TABLE.x - 110, TABLE.y - 170, 220, 170],
        stand: [TABLE.x - 150, TABLE.y + 18],
        look: look({ all: 'La última mesa libre de la terraza.', fran: 'La última mesa libre. Nuestra, aunque ella aún no lo sepa.' }),
        async use(g) {
          if (g.flag('ronda')) {
            await g.say(g.active.id, 'Esto ya es nuestro.', 'happy');
            return;
          }
          if (g.flag('mesaSeca')) {
            await g.say(g.active.id, 'Mesa conseguida. Falta lo importante: las cañas. En el bar.');
            return;
          }
          if (g.has(g.active.id, 'rollo')) return wipeTable(g);
          g.set('mesaVista');
          await g.say(g.active.id, 'Está chorreando. Si me siento ahí, salgo con el pantalón mojado hasta el lunes.');
          await g.say(g.active.id, 'Necesito algo para secarla. A estas horas solo queda abierto el bazar.');
        },
        async useItem(g, item) {
          if (item !== 'rollo' || g.flag('mesaSeca')) return false;
          await wipeTable(g);
          return true;
        },
      },
    ];
  },

  async intro(g) {
    g.actors.pablo.face(g.actors.fran.x);
    g.actors.chuchi.face(g.actors.fran.x);
    await g.say('pablo', '¡Jueves de Camiones y Caravanas! Y ha parado de llover. Bueno, casi.', 'happy');
    await g.say('chuchi', 'Dentro no cabe ni un alfiler. Toca terraza.', 'smug');
    await g.say('fran', 'Queda una mesa libre en la plazoleta, al fondo. Empapada, eso sí.');
    await g.say(null, 'Toca el suelo para andar y las cosas para usarlas. Mantén pulsado para examinar. Arriba a la izquierda cambias de amigo.');
    g.set('intro');
  },

  objective(g) {
    if (!g.flag('intro')) return null;
    if (!g.flag('mesaSeca')) return 'Conseguir mesa en la terraza';
    if (!g.flag('ronda')) return 'Pedir la primera ronda en el bar';
    return 'Brindar (hecho)';
  },

  hint(g) {
    if (!g.flag('mesaSeca')) {
      const anyPaper = (['fran', 'pablo', 'chuchi'] as CrewId[]).find((id) => g.has(id, 'rollo'));
      if (anyPaper && anyPaper !== g.active.id) return `${CAST[anyPaper].name} tiene el rollo. Cambia a ${CAST[anyPaper].name} arriba a la izquierda, o pídeselo.`;
      if (anyPaper) return 'Abre la bolsa (abajo a la derecha), toca el rollo y luego la mesa de la terraza.';
      if (g.flag('bazarIntentado')) return 'En el bazar hace falta efectivo. Pablo lleva monedas: cambia a Pablo, o tócalo para hablar con él.';
      if (g.flag('mesaVista')) return 'La mesa necesita secarse. El bazar 24h está abierto.';
      return 'La mesa libre está al fondo, a la derecha. Ve a verla.';
    }
    if (!g.flag('ronda')) return 'Con la mesa seca, toca la puerta del bar para pedir la ronda.';
    return 'Ya está todo. ¡Salud!';
  },

  async banter(g, other) {
    const o = g.actors[other];
    if (other === 'pablo' && g.flag('bazarIntentado') && g.has('pablo', 'monedas')) {
      await g.say('pablo', '¿Necesitas suelto? Yo llevo monedas, como los abuelos.', 'happy');
      g.take('pablo', 'monedas');
      g.give(g.active.id, 'monedas');
      return;
    }
    const lines: Record<CrewId, string[]> = {
      fran: ['Venga, que se nos enfría la noche.', '¿Has visto el grupo? Catorce mensajes y ninguno útil.'],
      pablo: ['¿Qué pasa, máquina?', 'Hoy lo noto: hoy cae anécdota.'],
      chuchi: ['Te veo con ganas de caña.', 'Si alguien pregunta, yo no he sido.'],
    };
    const n = Number(g.state.flags['banter_' + other] ?? 0);
    g.set('banter_' + other, n + 1);
    await g.say(other, lines[other][n % lines[other].length], o.def.mood);
  },

  async lookFriend(g, other) {
    const text: Record<CrewId, string> = {
      fran: 'Fran. Esa barba tiene su propio código postal.',
      pablo: 'Pablo. Sonriendo incluso cuando llueve.',
      chuchi: 'Chuchi. Gafas redondas y cara de saber algo que tú no sabes.',
    };
    await g.say(g.active.id, text[other]);
  },

  async giveItem(g, other, item: ItemId) {
    const a = g.active;
    g.take(a.id, item);
    g.give(other, item);
    await g.say(a.id, `Toma, ${CAST[other].name}: ${ITEMS[item].name.toLowerCase()}.`);
    await g.say(other, 'Hecho. Te lo guardo.');
  },
};
