// PokéUsera · performance check (CLAUDE.md: every scene that is touched must pass it; docs/POKEUSERA.md, «Rendimiento»).
//
// Loads each screen of the game on a phone-sized screen (390×844, dpr 2.6) with the CPU slowed down 4×
// (CDP Emulation.setCPUThrottlingRate, like a mid-range phone) and measures, for a few seconds:
//   - redraws per second (frames where the loop really drew: `paso` returned true, the screen was marked
//     dirty, or the 250 ms blink tick) and the loop's wake-ups per second (capped at 60);
//   - average and worst milliseconds of a drawn frame (`paso` + `dibujar`, from the `?medir` counters of
//     src/pokeusera/pantalla.ts) and the share of the main thread used by the animation-frame callbacks;
//   - drawImage calls per drawn frame, canvases created while measuring (should be 0: nothing may be baked
//     in steady state; the ones the background baking of precalentar.ts makes are not counted) and in total since the page loaded (memory), and the first-frames spike (baking);
//   - long tasks (> 50 ms, the browser's own jank measure: a bake that blocks the thread) while measuring.
// Before measuring, a screen is given time to finish the art the game warms up in the background
// (src/pokeusera/pantallas/precalentar.ts): it waits until no canvas has been created for 1.5 s.
// It FAILS (exit 1) when a screen goes over its budget (see PRESUPUESTOS: today's measurements plus margin).
//
// It starts nothing itself: run `npm run dev` first.
//   node scripts/rendimiento-pokeusera.mjs [pantalla...]     (default: all)  [PUERTO=5173]
//   node scripts/rendimiento-pokeusera.mjs 5174 combate-juega     (a bare number is the port)
//   screens: titulo, menu, ajustes, entrenador, modo, azar, draft, draft-flujo, barra, salida, combate-elige, combate-juega, combate-ritmo (+ the four bars: combate-elige-<bar> and combate-juega-<bar>,
//            with <bar> = rural, terraza, juan, feria; the default combate-* ones are the Bar del Brío), podio, estadisticas, useritopedia, useritopedia-ficha, acumuladas, acumuladas-records, guia, guia-objetos, salida,
//            nombre (la pantalla «¿Cómo te llamas?», sin cuenta), cuenta (AJUSTES → MI CUENTA), acumuladas-yo (ESTADÍSTICAS, página YO, con una copia guardada de 80 batallas),
//            aventura-inicial, aventura-mapa, aventura-zona, aventura-equipo, aventura-salvaje (AVENTURA, src/pokeusera/caza/: ?aventura&demo=nueva&pj=fran and ?aventura&demo)
// Environment: SEG=4 (seconds measured per screen), CPU=4 (throttling rate; 1 = none, budgets then do not apply),
//   VOLCAR=carpeta (also write a PNG of every screen there, to compare looks before/after).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const puertoArg = args.find((a) => /^\d{4,5}$/.test(a));
const PUERTO = Number(puertoArg ?? process.env.PUERTO ?? 5173);
const quiero = args.filter((a) => a !== puertoArg);
const SEG = Number(process.env.SEG ?? 4);
const CPU = Number(process.env.CPU ?? 4);
const BASE = `http://localhost:${PUERTO}/pokeusera.html`;

/**
 * Budgets, set from the measurements of 13 October 2026 (CPU ×4, a laptop-class CPU) with a ~50 % margin:
 *   redibujos: max redraws per second.  ms: max average ms per drawn frame.  pico: max ms of the worst frame.
 *   cb: max % of the main thread spent in animation-frame callbacks.  di: max drawImage per drawn frame.
 *   lienzos: max canvases created while measuring.  largas: max long tasks (> 50 ms) while measuring.
 *   primer: max ms of the worst frame since the page loaded (or since entering the screen, for draft-flujo).
 */
const PRESUPUESTOS = {
  //                  redibujos/s  ms/fotog.  pico  hilo cb %  drawImage  lienzos en reposo  tareas largas  1.º pico (arranque)
  titulo: { redibujos: 62, ms: 1.5, pico: 20, cb: 10, di: 25, lienzos: 0, largas: 0, primer: 1000 },
  // The menu shares the title's street (bulbs, stars, neon, the useritos' breathing in two groups: ~9 redraws a second, no hop) plus the option panel: 26 blits a frame.
  menu: { redibujos: 12, ms: 1.6, pico: 20, cb: 3, di: 40, lienzos: 0, largas: 0, primer: 1000 },
  entrenador: { redibujos: 15, ms: 2.5, pico: 20, cb: 5, di: 45, lienzos: 0, largas: 0, primer: 1000 },
  // The draft with the sheet inside it (the sheet and the grid are baked, 15 blits a frame; before: 61 blits, 2.2 ms).
  draft: { redibujos: 10, ms: 2.5, pico: 20, cb: 3, di: 30, lienzos: 0, largas: 0, primer: 1600 },
  'draft-flujo': { redibujos: 10, ms: 2.5, pico: 20, cb: 3, di: 30, lienzos: 40, largas: 1, primer: 300 },
  'combate-elige': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  // ?auto plays ten times faster than a person sees (the animations last a tenth): nearly always something moves. It also sets off the move effects (≈ 10 drawImage while one flies).
  // «Lienzos» here are the screen's own (the text lines, damage numbers, badges); the background baking of precalentar.ts is not counted.
  'combate-juega': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  // The same battle in each of the other four bars (backdrop, music and the bar's own sucesos): same budget as the Brío.
  'combate-elige-rural': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  'combate-elige-terraza': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  'combate-elige-juan': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  'combate-juega-rural': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  'combate-elige-feria': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
  'combate-juega-feria': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  'combate-juega-terraza': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  'combate-juega-juan': { redibujos: 60, ms: 6, pico: 50, cb: 30, di: 120, lienzos: 200, largas: 6, primer: 600 },
  'combate-ritmo': { redibujos: 40, ms: 5, pico: 50, cb: 16, di: 100, lienzos: 60, largas: 4, primer: 600 },
  podio: { redibujos: 30, ms: 3, pico: 20, cb: 8, di: 55, lienzos: 0, largas: 0, primer: 1500 },
  estadisticas: { redibujos: 8, ms: 6, pico: 25, cb: 4, di: 150, lienzos: 0, largas: 0, primer: 1500 },
  useritopedia: { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  'useritopedia-ficha': { redibujos: 6, ms: 3, pico: 10, cb: 4, di: 25, lienzos: 0, largas: 0, primer: 1500 },
  // ESTADÍSTICAS del menú (lo acumulado de todas las partidas; 80 batallas inventadas en el móvil): como la Useritopedia, solo redibuja al tocar o al hornear filas de fondo.
  acumuladas: { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  'acumuladas-records': { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  // La página YO de ESTADÍSTICAS (cuentas, docs/POKEUSERA.md): como los récords (tarjetas horneadas al verse); datos de la copia guardada, sin servidor.
  'acumuladas-yo': { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  // Las pantallas de la cuenta (pantallas/cuenta.ts): estáticas, con un campo de texto real encima del lienzo. Mismo presupuesto que la Useritopedia.
  nombre: { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  cuenta: { redibujos: 2, ms: 3, pico: 10, cb: 3, di: 45, lienzos: 0, largas: 0, primer: 1500 },
  guia: { redibujos: 8, ms: 3, pico: 20, cb: 4, di: 70, lienzos: 0, largas: 0, primer: 1000 },
  'guia-objetos': { redibujos: 8, ms: 3.5, pico: 20, cb: 4, di: 95, lienzos: 0, largas: 0, primer: 1000 },
  ajustes: { redibujos: 2, ms: 1, pico: 10, cb: 2, di: 15, lienzos: 0, largas: 0, primer: 1000 },
  // «La barra» (after the draft): three offers, three useritos, a chosen pair highlighted.
  barra: { redibujos: 8, ms: 2.5, pico: 12, cb: 3, di: 30, lienzos: 0, largas: 0, primer: 800 },
  // «¿Quién sale primero?» (after La barra): three baked cards, three breathing sprites and the marked one's frame.
  salida: { redibujos: 10, ms: 2.5, pico: 12, cb: 3, di: 30, lienzos: 0, largas: 0, primer: 800 },
  // «TU EQUIPO AL AZAR» (mode AL AZAR, replaces the draft and La barra): everything baked, no clock in solo play: it must not redraw at rest.
  azar: { redibujos: 2, ms: 2.5, pico: 12, cb: 3, di: 30, lienzos: 0, largas: 0, primer: 800 },
  // «¿CÓMO JUGAMOS?» (NORMAL / AL AZAR, solo play, after the trainer): two baked cards over the bar's backdrop; static.
  modo: { redibujos: 2, ms: 2, pico: 12, cb: 3, di: 20, lienzos: 0, largas: 0, primer: 1000 },
  // AVENTURA (src/pokeusera/caza/): the starter pick has three breathing sprites out of step (about 6 redraws a second); the map, the bar and the team are static (they redraw on input only).
  'aventura-inicial': { redibujos: 8, ms: 2, pico: 20, cb: 3, di: 25, lienzos: 0, largas: 0, primer: 1000 },
  'aventura-mapa': { redibujos: 2, ms: 1.5, pico: 20, cb: 2, di: 30, lienzos: 0, largas: 0, primer: 1000 },
  'aventura-zona': { redibujos: 2, ms: 1.5, pico: 20, cb: 2, di: 30, lienzos: 0, largas: 0, primer: 1000 },
  'aventura-equipo': { redibujos: 2, ms: 2.5, pico: 20, cb: 2, di: 45, lienzos: 0, largas: 0, primer: 1000 },
  // A wild battle (bar 1, BUSCAR USERITOS) at the choosing moment: the same budget as combate-elige.
  'aventura-salvaje': { redibujos: 8, ms: 4, pico: 25, cb: 5, di: 85, lienzos: 0, largas: 0, primer: 600 },
};

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** Each screen: how to reach it (`ir`), what it needs to be steady (`listo`). Keys: Enter accepts, arrows move. */
const PANTALLAS = {
  titulo: { url: '', ir: async () => {} },
  menu: { url: '', ir: async (p) => { await tecla(p, 'Enter'); } },
  entrenador: { url: '', ir: async (p) => { await tecla(p, 'Enter'); await tecla(p, 'Enter'); } },
  draft: { url: '?draft', ir: async () => {} },
  // The draft as a player reaches it: title, menu, trainer pick, mode (NORMAL by default), one and a half seconds on each (the background baking
  // gets only that long). «1.º pico» is then the worst frame from the moment ELEGIR is pressed: how much the draft stalls.
  'draft-flujo': { url: '', ir: async (p, marca) => { await tecla(p, 'Enter'); await dormir(1500); await tecla(p, 'Enter'); await dormir(1500); await tecla(p, 'Enter'); await dormir(1500); await marca(); await tecla(p, 'Enter'); }, quieto: false },
  'combate-elige': { url: '?combate&semilla=7&escenario=brio', ir: async () => {}, esperar: 2500 },
  // The battle plays by itself (and writes new lines of text all the time): there is no quiet moment to wait for.
  'combate-juega': { url: '?combate&auto&semilla=7&escenario=brio', ir: async () => {}, esperar: 1500, quieto: false },
  // The same battle at the pace a player sees (the speed setting NORMAL, no ?auto shortcut speed-up): `cfg` is changed in the page (dev server only).
  'combate-ritmo': { url: '?combate&auto&semilla=7&escenario=brio', ir: async (p) => { await p.evaluate(async () => { const ui = await import('/src/pokeusera/pantallas/ui.ts'); ui.cfg.rapido = false; ui.cfg.velocidad = 'normal'; }); }, esperar: 3000, quieto: false },
  // «La barra»: ?combate&barra goes straight to it (no draft). Its 20 s clock is stretched so it does not end while measuring; an object and a userito are chosen.
  barra: { url: '?combate&barra&semilla=7', ir: async (p) => { await entraBarra(p); await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter', false); }, esperar: 1500 },
  // «TU EQUIPO AL AZAR»: ?azar goes straight to a game in mode AL AZAR (no title or menu): the dealt team, no time limit in solo play.
  azar: { url: '?azar&semilla=7', ir: async (p) => { await p.waitForFunction(() => !!window.__pokeusera?.va?.resolver, null, { timeout: 30000, polling: 200 }); }, esperar: 1500 },
  // «¿CÓMO JUGAMOS?»: title, menu, trainer pick, then the mode screen.
  modo: { url: '', ir: async (p) => { await tecla(p, 'Enter'); await tecla(p, 'Enter'); await tecla(p, 'Enter'); } },
  // «¿Quién sale primero?»: the step after La barra (?combate&barra goes through both). Its 15 s clock is stretched as well; a userito is marked.
  salida: { url: '?combate&barra&semilla=7', ir: async (p) => { await entraBarra(p); await tecla(p, 'Enter', false); await tecla(p, 'Enter'); await entraSalida(p); await tecla(p, 'ArrowDown', false); }, esperar: 1500 },
  // Reached by playing a whole quick game by itself (?auto): the podium, then ESTADÍSTICAS with Enter.
  podio: { url: '?auto&semilla=7', ir: async (p) => { await hastaPodio(p); } },
  estadisticas: { url: '?auto&semilla=7', ir: async (p) => { await hastaPodio(p); await tecla(p, 'Enter'); } },
  // The Useritopedia: menu → USERITOPEDIA (third entry, after JUGAR SOLO and JUGAR ONLINE; AVENTURA is hidden): the list, and a card (Enter on the first userito).
  useritopedia: { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 2; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  'useritopedia-ficha': { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 2; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); await tecla(p, 'Enter', false); }, esperar: 1500 },
  // ESTADÍSTICAS: menu → ESTADÍSTICAS (fourth entry); the phone's own aggregates are made up first (80 battles), and the view set to «EN ESTE MÓVIL» (no server in the way).
  acumuladas: { url: '', ir: async (p) => { await sembrarEstadisticas(p); await tecla(p, 'Enter'); for (let i = 0; i < 3; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); await dormir(800); } },
  // The same on its last page (RÉCORDS: ▶ six times).
  'acumuladas-records': { url: '', ir: async (p) => { await sembrarEstadisticas(p); await tecla(p, 'Enter'); for (let i = 0; i < 3; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); await dormir(800); for (let i = 0; i < 6; i++) await tecla(p, 'ArrowRight', false); }, esperar: 1000 },
  // The YO page (the eighth, after RÉCORDS: ▶ seven times). The phone's copy of «my numbers» is made up first (the dev server has no such account: the request is answered from the page).
  'acumuladas-yo': { url: '', ir: async (p) => { await sembrarYo(p); await tecla(p, 'Enter'); for (let i = 0; i < 3; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); await dormir(800); for (let i = 0; i < 7; i++) await tecla(p, 'ArrowRight', false); }, esperar: 1500 },
  // «¿Cómo te llamas?»: the title, then a tap: with no account on the phone the name screen comes before the menu (the other screens start with an account made up).
  nombre: { url: '', sinCuenta: true, ir: async (p) => { await tecla(p, 'Enter'); } },
  // AJUSTES → MI CUENTA (the settings' fifth row: ▼ four times).
  cuenta: { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 5; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); for (let i = 0; i < 4; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  // The guide: menu → GUÍA (fifth entry).
  guia: { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 4; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  // The guide on its OBJETOS tab (the last one: ▶ five times).
  'guia-objetos': { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 4; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); for (let i = 0; i < 5; i++) await tecla(p, 'ArrowRight', false); }, esperar: 1000 },
  // The settings: menu → AJUSTES (sixth entry), with the ESCENARIO row.
  ajustes: { url: '', ir: async (p) => { await tecla(p, 'Enter'); for (let i = 0; i < 5; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  // AVENTURA. The shortcuts skip the title and the menu (`?aventura`); `&demo` is a test adventure in memory (a starter and seven caught, bar 2 open, never saved).
  'aventura-inicial': { url: '?aventura&demo=nueva&pj=fran', ir: async () => {} },
  'aventura-mapa': { url: '?aventura&demo', ir: async () => {} },
  // The map marks bar 2 (the first one whose boss is standing): ↑ goes to bar 1, Enter opens it.
  'aventura-zona': { url: '?aventura&demo', ir: async (p) => { await tecla(p, 'ArrowUp', false); await tecla(p, 'Enter'); } },
  // From bar 2, four rows down (bar 3, bar 4, FINAL, EQUIPO) and Enter: the team screen.
  'aventura-equipo': { url: '?aventura&demo', ir: async (p) => { for (let i = 0; i < 4; i++) await tecla(p, 'ArrowDown', false); await tecla(p, 'Enter'); } },
  // Bar 1 → BUSCAR USERITOS → the battle screen asking for the first action of the player.
  'aventura-salvaje': { url: '?aventura&demo', ir: async (p) => { await tecla(p, 'ArrowUp', false); await tecla(p, 'Enter'); await tecla(p, 'Enter'); }, esperar: 2500 },
};
// The battle screens in each other bar (the Bar del Brío is the default one above).
for (const esc of ['rural', 'terraza', 'juan', 'feria']) {
  PANTALLAS[`combate-elige-${esc}`] = { ...PANTALLAS['combate-elige'], url: `?combate&semilla=7&escenario=${esc}` };
  PANTALLAS[`combate-juega-${esc}`] = { ...PANTALLAS['combate-juega'], url: `?combate&auto&semilla=7&escenario=${esc}` };
}
for (const n of quiero) if (!PANTALLAS[n]) { console.error(`Pantalla desconocida: ${n}. Hay: ${Object.keys(PANTALLAS).join(', ')}`); process.exit(2); }

/** Presses a key. With `cambia` (the default) the screen is expected to change: the key is pressed again once if nothing happened (a slow, busy machine can lose one). */
async function tecla(p, k, cambia = true) {
  for (let intento = 0; intento < (cambia ? 2 : 1); intento++) {
    const antes = await p.evaluate(() => window.__medir.cambios);
    await p.keyboard.press(k);
    const ok = await p.waitForFunction((n) => window.__medir.cambios > n, antes, { timeout: 2500 }).then(() => true, () => false);
    if (ok) break;
  }
  await dormir(250);
}

/** Makes up 80 battles of the phone's own statistics (the aggregates, as the game would have saved them) and sets the view to «EN ESTE MÓVIL». Dev server only. */
async function sembrarEstadisticas(p) {
  await p.evaluate(async () => {
    const { ESPECIES, ESPECIE, SUCESOS } = await import('/src/pokeusera/datos.ts');
    const { agregadoVacio, sumarResumen } = await import('/src/pokeusera/estadisticas/agregado.mjs');
    let semilla = 7;
    const rnd = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
    const ents = ['fran', 'pablo', 'chuchi', 'guille'];
    const objs = ['mechero', 'chicle', 'bocata', 'posavasos', 'tapon', 'palillo', 'gafas', 'zapatillas', 'panuelo', 'llavero'];
    const ag = agregadoVacio();
    for (let b = 0; b < 80; b++) {
      const ids = ESPECIES.map((s) => s.id).sort(() => rnd() - 0.5);
      const puestos = [1, 2, 3, 4].sort(() => rnd() - 0.5);
      const ju = ents.map((en, j) => ({
        en, pe: j === 0 ? 1 : 0, pu: puestos[j], ve: ['cana', 'labia', 'tarde', 'manico'][j], cu: null,
        us: [0, 1, 2].map((o) => {
          const e = ids[j * 3 + o];
          const movs = ESPECIE[e].movs;
          const mv = {};
          for (const m of movs) if (rnd() < 0.7) mv[m] = [1 + Math.floor(rnd() * 6), Math.floor(rnd() * 400)];
          const ob = rnd() < 0.8 ? objs[Math.floor(rnd() * objs.length)] : null;
          return { e, o, ob, oa: ob && rnd() < 0.7 ? 1 : 0, ini: o === 0 ? 1 : 0, dh: Math.floor(rnd() * 500), dr: Math.floor(rnd() * 500), dp: Math.floor(rnd() * 40), cu: Math.floor(rnd() * 100), ko: Math.floor(rnd() * 3), ca: rnd() < 0.8 ? 1 : 0, tf: 1 + Math.floor(rnd() * 20), cr: Math.floor(rnd() * 4), ha: Math.floor(rnd() * 3), mx: 40 + Math.floor(rnd() * 200), mm: Object.keys(mv)[0] ?? movs[0], mv };
        }),
      }));
      sumarResumen(ag, { v: 1, id: 'x' + b, ver: 'dev', f: 1792000000000 + b * 60000, mo: 'maquina', es: ['brio', 'terraza', 'rural', 'juan', 'feria'][b % 5], tu: 10 + Math.floor(rnd() * 30), su: Object.keys(SUCESOS).sort(() => rnd() - 0.5).slice(0, 1 + (b % 4)), ju });
    }
    localStorage.setItem('pokeusera.est.local', JSON.stringify(ag));
    localStorage.setItem('pokeusera.est.vista', JSON.stringify({ fuente: 'movil', filtro: 'todas' }));
  });
}

/** Makes up the phone's copy of «my numbers» (page YO) from 80 made-up battles (as the aggregates of the account would be). */
async function sembrarYo(p) {
  await sembrarEstadisticas(p);
  await p.evaluate(() => {
    const ag = JSON.parse(localStorage.getItem('pokeusera.est.local'));
    localStorage.setItem('pokeusera.est.yo', JSON.stringify({ v: 1, id: 'uperf000000', n: ag.personas.n, nombre: 'Pablito', racha: { a: 3, m: 9 }, ag }));
  });
  // The dev server has no such account: the page's request for it is answered with that same copy (as the server would).
  const cuerpo = await p.evaluate(() => localStorage.getItem('pokeusera.est.yo'));
  await p.route('**/api/estadisticas?cuenta=*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: cuerpo }));
}

/** Waits until the background baking is over: no canvas created for 1.5 s (at most `max` ms). */
async function esperarQuieto(p, max = 45000) {
  const t0 = Date.now();
  let ultimo = -1;
  let quietas = 0;
  while (Date.now() - t0 < max && quietas < 3) {
    const n = await p.evaluate(() => window.__lienzos + window.__lienzosFondo);
    quietas = n === ultimo ? quietas + 1 : 0;
    ultimo = n;
    await dormir(500);
  }
}

/** Waits for «La barra» to ask the local player and gives it a long clock (the 20 s would run out while measuring). */
async function entraBarra(p) {
  await p.waitForFunction(() => !!window.__pokeusera?.vb?.resolver, null, { timeout: 30000, polling: 200 });
  await p.evaluate(() => { window.__pokeusera.vb.fin = Date.now() + 600000; });
}

/** Waits for «¿Quién sale primero?» to ask the local player and gives it a long clock. */
async function entraSalida(p) {
  await p.waitForFunction(() => !!window.__pokeusera?.vs?.resolver, null, { timeout: 30000, polling: 200 });
  await p.evaluate(() => { window.__pokeusera.vs.fin = Date.now() + 600000; });
}

async function hastaPodio(p) {
  // The game ends when the state has a winner; the podium takes a moment after the last turn plays.
  await p.waitForFunction(() => window.__pokeusera?.partida?.estado?.ganador != null, null, { timeout: 240000, polling: 500 });
  const n = await p.evaluate(() => window.__medir.cambios);
  await p.waitForFunction((n0) => window.__medir.cambios > n0, n, { timeout: 60000, polling: 250 });
  await dormir(1200);
}

const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const filas = [];
const fallos = [];

for (const nombre of Object.keys(PANTALLAS)) {
  if (quiero.length && !quiero.includes(nombre)) continue;
  const def = PANTALLAS[nombre];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.addInitScript((sinCuenta) => {
    try { localStorage.clear(); } catch {}
    // Every screen but «nombre» starts with an account on the phone (otherwise the name screen would come between the title and the menu).
    try { if (!sinCuenta) localStorage.setItem('pokeusera.cuenta', JSON.stringify({ token: '0'.repeat(40), codigo: 'K7MZ4Q', nombre: 'Pablito', id: 'uperf000000' })); } catch {}
    const w = window;
    w.__lienzos = 0;
    w.__di = 0;
    w.__raf = { n: 0, ms: 0, max: 0 };
    w.__largas = { n: 0, max: 0 };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) { w.__largas.n++; if (e.duration > w.__largas.max) w.__largas.max = e.duration; } }).observe({ entryTypes: ['longtask'] });
    } catch {}
    // Canvases created (baked): each one is memory and a texture upload.
    const ce = document.createElement.bind(document);
    // (Those made inside a task of the background baking, precalentar.ts, are not the screen's: they are counted apart.)
    w.__lienzosFondo = 0;
    document.createElement = (tag, o) => { if (String(tag).toLowerCase() === 'canvas') { if (w.__precalentando) w.__lienzosFondo++; else w.__lienzos++; } return ce(tag, o); };
    // drawImage calls: the cost of a frame on a phone is mostly the number of blits.
    const di = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...a) { w.__di++; return di.apply(this, a); };
    // Time spent inside animation-frame callbacks (every wake-up of the loop, drawn or not).
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); const d = performance.now() - t0; w.__raf.n++; w.__raf.ms += d; if (d > w.__raf.max) w.__raf.max = d; });
  }, def.sinCuenta === true);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.goto(BASE + (def.url ? def.url + '&medir' : '?medir'));
  await page.waitForFunction(() => window.__medir && window.__medir.dibujos > 0, null, { timeout: 60000 });
  // `marca()`: from there on the «first spike» counts only what happens after it (entering a screen from the previous one).
  const marca = () => page.evaluate(() => { window.__medir.reiniciar(); });
  await def.ir(page, marca);
  await dormir(def.esperar ?? 1200);
  if (def.quieto !== false) await esperarQuieto(page);
  // The spike of the first frames (baking sprites, panels...) is what the reset throws away; keep it apart.
  const primer = await page.evaluate(() => window.__medir.max);
  await page.evaluate(() => {
    window.__medir.reiniciar();
    window.__di = 0;
    window.__raf.n = window.__raf.ms = window.__raf.max = 0;
    window.__largas.n = window.__largas.max = 0;
    window.__lienzos0 = window.__lienzos;
    window.__t0 = performance.now();
  });
  await dormir(SEG * 1000);
  const m = await page.evaluate(() => {
    const seg = (performance.now() - window.__t0) / 1000;
    const x = window.__medir;
    return { seg, rafs: x.rafs, dibujos: x.dibujos, ms: x.ms, max: x.max, di: window.__di, cb: window.__raf.ms, lienzos: window.__lienzos - window.__lienzos0, lienzosTotal: window.__lienzos + window.__lienzosFondo, largas: window.__largas.n, largaMax: window.__largas.max };
  });
  if (process.env.VOLCAR) {
    mkdirSync(process.env.VOLCAR, { recursive: true });
    await page.screenshot({ path: `${process.env.VOLCAR}/${nombre}.png` });
  }
  const fila = {
    nombre,
    redibujos: m.dibujos / m.seg,
    despertares: m.rafs / m.seg,
    ms: m.dibujos ? m.ms / m.dibujos : 0,
    pico: m.max,
    cb: (m.cb / (m.seg * 1000)) * 100,
    di: m.dibujos ? m.di / m.dibujos : 0,
    lienzos: m.lienzos,
    lienzosTotal: m.lienzosTotal,
    largas: m.largas,
    largaMax: m.largaMax,
    primer,
  };
  filas.push(fila);
  const pres = PRESUPUESTOS[nombre];
  if (CPU === 4 && pres) {
    const malo = [];
    if (fila.redibujos > pres.redibujos) malo.push(`redibujos ${fila.redibujos.toFixed(1)}/s > ${pres.redibujos}`);
    if (fila.ms > pres.ms) malo.push(`ms/fotograma ${fila.ms.toFixed(2)} > ${pres.ms}`);
    if (fila.pico > pres.pico) malo.push(`pico ${fila.pico.toFixed(1)} ms > ${pres.pico}`);
    if (fila.cb > pres.cb) malo.push(`hilo en callbacks ${fila.cb.toFixed(1)} % > ${pres.cb}`);
    if (fila.di > pres.di) malo.push(`drawImage/fotograma ${fila.di.toFixed(0)} > ${pres.di}`);
    if (fila.lienzos > pres.lienzos) malo.push(`lienzos creados en reposo ${fila.lienzos} > ${pres.lienzos}`);
    if (fila.largas > pres.largas) malo.push(`tareas largas (>50 ms) ${fila.largas} > ${pres.largas} (la peor ${fila.largaMax.toFixed(0)} ms)`);
    if (fila.primer > pres.primer) malo.push(`primer pico (arranque) ${fila.primer.toFixed(0)} ms > ${pres.primer}`);
    if (malo.length) fallos.push(`${nombre}: ${malo.join('; ')}`);
  }
  if (errores.length) fallos.push(`${nombre}: errores de la página: ${errores.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await b.close();

const f = (v, d = 1) => v.toFixed(d);
console.log(`\nPokéUsera · rendimiento (CPU ×${CPU}, 390×844 @2.6, ${SEG} s por pantalla)`);
console.log('pantalla         redibujos/s  despert./s  ms/fotog.  pico ms  hilo cb %  drawImage/fot.  lienzos(+reposo)  tareas largas  1.º pico ms');
for (const x of filas) {
  console.log(
    `${x.nombre.padEnd(16)} ${f(x.redibujos).padStart(10)}  ${f(x.despertares).padStart(10)}  ${f(x.ms, 2).padStart(9)}  ${f(x.pico).padStart(7)}  ${f(x.cb).padStart(9)}  ${f(x.di, 0).padStart(14)}  ${String(x.lienzosTotal).padStart(8)} (+${x.lienzos})  ${String(x.largas).padStart(6)} (${f(x.largaMax, 0)} ms)  ${f(x.primer, 0).padStart(10)}`,
  );
}
if (fallos.length) {
  console.log('\nFALLA:');
  for (const x of fallos) console.log('  - ' + x);
  process.exit(1);
}
console.log('\nBien: todas las pantallas dentro de presupuesto.');
