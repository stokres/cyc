// Difficulty check of the chapter 2 hunt (src/pokecap/caza/): the computer plays Guille's team (three useritos drafted at random) against the
// wild Ultimosaurio with the machine's usual choices (motor/bot.ts) and throws the jarra the way a person would: when the Ultimosaurio is down to
// about a third of its HP, and every turn after that. The loop is the one of caza/batalla.ts without the screen: the engine's turn, the revival of
// the mythical one (`revivir`) and the jarra's chance (`probCaptura`).
// It prints how many hunts end in a capture before Guille's team falls, how long they last, how many jarras are thrown and how often it stands up.
// The target (docs/CAPITULO2.md): a normal player catches it in one or two battles and with few throws.
//
// Against `npm run dev`:  PUERTO=5193 node scripts/pokeusera-caza-sim.mjs [partidas=300] [escala=ESCALA_ULTIMOSAURIO]
import { chromium } from 'playwright';

const partidas = Number(process.argv[2] ?? 300);
const escalaArg = process.argv[3] !== undefined ? Number(process.argv[3]) : undefined;
const puerto = process.env.PUERTO ?? 5173;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await b.newContext()).newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(String(e)));
// A bare page on the dev server's origin, so the game's modules can be imported without the chapter running.
await page.route(`http://localhost:${puerto}/vacio.html`, (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><body></body>' }));
await page.goto(`http://localhost:${puerto}/vacio.html`);

const r = await page.evaluate(
  async ({ partidas, escalaArg }) => {
    const { ESPECIES, ESPECIE, ULTIMOSAURIO_ID } = await import('/src/pokecap/datos.ts');
    const { crearRnd, sacarAlAzar } = await import('/src/pokecap/motor/azar.ts');
    const { activo, crearCombate, eliminado, enGrada, reemplazar, resolverTurno, revivir, vivos, eleccionAlAzar } = await import('/src/pokecap/motor/combate.ts');
    const { eleccionBot, reemplazoBot } = await import('/src/pokecap/motor/bot.ts');
    const { ESCALA_ULTIMOSAURIO, REVIVE_PS, escalar, probCaptura } = await import('/src/pokecap/caza/modelo.ts');
    const escala = escalaArg ?? ESCALA_ULTIMOSAURIO;
    const ids = ESPECIES.map((s) => s.id);
    const filas = [];
    for (let n = 0; n < partidas; n++) {
      const semilla = 1000 + n * 7919;
      const rnd = crearRnd(semilla ^ 0x2545f491);
      const equipo = sacarAlAzar(ids, 3, crearRnd(semilla));
      let estado = crearCombate(
        [
          { entrenador: 'guille', nombre: 'GUILLE', bot: true, especies: equipo },
          { entrenador: 'vinas', nombre: 'SALVAJE', bot: true, especies: [ULTIMOSAURIO_ID] },
        ],
        semilla,
        'conceptos',
      );
      estado.jugadores[1].equipo.forEach((u) => escalar(u, escala));
      estado.jugadores[1].cana = false;
      let turnos = 0;
      let jarras = 0;
      let levantadas = 0;
      let res = 'perdido';
      while (turnos < 200) {
        turnos++;
        const u = activo(estado, 1);
        const el = [null, null];
        el[0] = eleccionBot(estado, 0, rnd);
        el[1] = eleccionBot(estado, 1, rnd);
        // The jarra: once it is at a third of its HP (or after it stood up), and not when Guille's userito is the last thing standing.
        if (u.ps / u.psMax <= 0.35 && vivos(estado.jugadores[0]).length > 0) {
          jarras++;
          if (rnd() < probCaptura(u)) {
            res = 'cazado';
            break;
          }
          el[0] = { tipo: 'pasar' };
        }
        const t = resolverTurno(estado, el);
        estado = t.estado;
        if (estado.ganador === 0) {
          levantadas++;
          estado = revivir(estado, 1, REVIVE_PS);
          continue;
        }
        if (estado.ganador !== null || eliminado(estado, 0)) break;
        const pend = estado.reemplazos.filter((j) => vivos(estado.jugadores[j]).length > 0);
        if (pend.length) {
          const el2 = {};
          for (const j of pend) el2[j] = reemplazoBot(estado, j);
          estado = reemplazar(estado, el2).estado;
        }
      }
      filas.push({ res, turnos, jarras, levantadas });
    }
    return { filas, escala, nombre: ESPECIE[ULTIMOSAURIO_ID].nombre };
  },
  { partidas, escalaArg },
);

const f = r.filas;
const cazados = f.filter((x) => x.res === 'cazado');
const media = (a, k) => (a.length ? (a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(1) : '-');
console.log(`${r.nombre} · escala ${r.escala} · ${f.length} cacerías: cazado ${((100 * cazados.length) / f.length).toFixed(0)} % (el equipo cae en el ${(100 - (100 * cazados.length) / f.length).toFixed(0)} %)`);
console.log(`  turnos (cazadas): ${media(cazados, 'turnos')} · jarras: ${media(cazados, 'jarras')} · veces que se levanta: ${media(cazados, 'levantadas')}`);
console.log(`  se levanta alguna vez: ${((100 * f.filter((x) => x.levantadas > 0).length) / f.length).toFixed(0)} % · lanzamientos 1:${cazados.filter((x) => x.jarras === 1).length} 2:${cazados.filter((x) => x.jarras === 2).length} 3+:${cazados.filter((x) => x.jarras >= 3).length}`);
if (errores.length) console.log('errores', errores.slice(0, 3));
await b.close();
