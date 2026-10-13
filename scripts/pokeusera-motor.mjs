// Quick check of the PokéUsera battle engine: bundles src/pokeusera/{datos,motor} with esbuild and
// plays ONE battle of 4 bots (random draft, fixed seed), checking invariants as it goes.
// Usage: node scripts/pokeusera-motor.mjs [seed] [seed...]   (default seed 1; keep it to a few runs)
//        node scripts/pokeusera-motor.mjs --sim=200   (balance: N bot battles with different seeds; turns, hits per fall)
import { build } from 'esbuild';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'pokeusera-'));
const salida = join(tmp, 'motor.mjs');
await build({
  stdin: {
    contents: `export * from './src/pokeusera/datos'; export * from './src/pokeusera/motor/combate'; export * from './src/pokeusera/motor/draft'; export * from './src/pokeusera/motor/bot'; export { crearRnd, azar, entero } from './src/pokeusera/motor/azar';`,
    resolveDir: raiz,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: salida,
  logLevel: 'error',
});
const M = await import(pathToFileURL(salida).href);

// Texts: «clave = texto» lines of the md.
const textos = new Map();
for (const l of readFileSync(join(raiz, 'src/textos/pokeusera-combate.md'), 'utf8').split(/\r?\n/)) {
  const m = l.trim().match(/^([a-z][A-Za-z0-9_.-]*)\s*=\s*(.*)$/);
  if (m) textos.set(m[1], m[2]);
}
const decir = (ev) => (ev.clave ? textos.get(ev.clave)?.replace(/\{(\w+)\}/g, (_, k) => String(ev.vars?.[k] ?? `{${k}}`)) : null);

const fallos = [];
// Data: 20 useritos with valid moves; every userito, move and type has its text.
if (M.ESPECIES.length !== 20) console.error('FALLO: no hay 20 useritos');
for (const sp of M.ESPECIES) {
  if (!textos.has(`userito.${sp.id}.desc`)) console.error('FALLO: falta userito.' + sp.id + '.desc');
  for (const mv of sp.movs) if (!M.MOVS[mv]) console.error('FALLO: movimiento desconocido', sp.id, mv);
}
for (const id of Object.keys(M.MOVS)) if (!textos.has(`mov.${id}.desc`)) console.error('FALLO: falta mov.' + id + '.desc');
for (const t of Object.keys(M.TIPO_NOMBRE)) if (!textos.has(`tipo.${t}`)) console.error('FALLO: falta tipo.' + t);
const falla = (msg) => {
  fallos.push(msg);
  console.error('FALLO:', msg);
};

function revisar(estado, ctx) {
  for (const q of estado.jugadores)
    for (const u of q.equipo) {
      if (!(u.ps >= 0 && u.ps <= u.psMax)) falla(`${ctx}: PS fuera de rango ${u.especie} ${u.ps}/${u.psMax}`);
      if (!Number.isInteger(u.ps)) falla(`${ctx}: PS no entero ${u.especie} ${u.ps}`);
      for (const [s, n] of Object.entries(u.niveles)) if (n < -6 || n > 6) falla(`${ctx}: nivel ${s} = ${n}`);
      if (u.pp.some((p) => p < 0)) falla(`${ctx}: PP negativo`);
    }
}

// Invariants of the statistics the engine keeps (e.stats).
function revisarStats(e, turnos, todos) {
  const S = e.stats;
  const suma = (campo) => S.u.flat().reduce((n, u) => n + u[campo], 0);
  const matriz = (m) => m.flat().reduce((a, b) => a + b, 0);
  if (suma('dh') !== suma('dr')) falla(`stats: daño hecho ${suma('dh')} != recibido ${suma('dr')}`);
  if (matriz(S.dm) !== suma('dh')) falla(`stats: matriz de daño ${matriz(S.dm)} != ${suma('dh')}`);
  if (suma('gol') !== suma('rg')) falla('stats: golpes dados != recibidos');
  for (const [a, b] of [['cri', 'crr'], ['sup', 'sur'], ['pob', 'por']]) if (suma(a) !== suma(b)) falla(`stats: ${a} != ${b}`);
  if (suma('ko') !== matriz(S.km)) falla('stats: KOs != matriz de KOs');
  if (suma('ko') > suma('cae')) falla('stats: más KOs que caídas');
  if (suma('pp') !== S.u.flat().reduce((n, u) => n + u.mv.slice(0, 4).reduce((x, y) => x + y, 0), 0)) falla('stats: PP gastados != usos de movimientos');
  const caidos = e.jugadores.flatMap((q) => q.equipo).filter((u) => u.ps <= 0).length;
  const eventosCae = todos.filter(({ ev }) => ev.k === 'cae').length;
  if (suma('cae') !== eventosCae) falla(`stats: caídas ${suma('cae')} != eventos 'cae' ${eventosCae}`);
  if (caidos !== suma('cae')) falla(`stats: useritos caídos ${caidos} != ${suma('cae')} (no revive nadie)`);
  const golpesEv = todos.filter(({ ev }) => ev.k === 'golpe').reduce((n, { ev }) => n + ev.dano, 0);
  if (golpesEv !== suma('dr') + suma('dp')) falla(`stats: daño de los eventos ${golpesEv} != dr+dp ${suma('dr') + suma('dp')}`);
  e.jugadores.forEach((q, j) =>
    q.equipo.forEach((u, i) => {
      const s = S.u[j][i];
      if (u.psMax - u.ps !== s.dr + s.dp - s.cu) falla(`stats: PS de ${u.especie} (${u.psMax - u.ps}) != dr+dp-cu (${s.dr + s.dp - s.cu})`);
      if (s.tf > turnos) falla('stats: turnos en campo > turnos');
      if (s.mx > s.dh) falla('stats: golpe máximo > daño total');
      if (s.cae > 1) falla('stats: cae más de una vez');
      if (Object.entries(s).some(([k, v]) => k !== 'mo' && typeof v === 'number' && (v < 0 || !Number.isFinite(v)))) falla('stats: valor negativo o no finito');
    }),
  );
  S.dm.forEach((fila, a) => {
    if (fila[a] !== 0) falla('stats: un jugador se hace daño de ataque a sí mismo');
  });
}

function jugar(semilla, verbose) {
  const rnd = M.crearRnd(semilla * 7919 + 13);
  let d = M.crearDraft(4, semilla % 4);
  while (M.turnoDraft(d) !== null) d = M.elegir(d, M.pickBot(d, rnd));
  const eq = M.equipos(d, 4);
  if (eq.some((l) => l.length !== 3) || new Set(eq.flat()).size !== 12) falla('draft: equipos mal formados');
  const ents = ['fran', 'pablo', 'chuchi', 'guille'];
  const nombres = ['Fran', 'Pablo', 'Chuchi', 'Guille'];
  let e = M.crearCombate(
    eq.map((especies, i) => ({ entrenador: ents[i], nombre: nombres[i], bot: true, especies })),
    semilla,
  );
  const inicial = JSON.stringify(e);
  if (verbose) console.log(`Semilla ${semilla}. Equipos:`, eq.map((l, i) => `${nombres[i]}: ${l.map((id) => M.ESPECIE[id].nombre).join(', ')}`).join(' | '));
  const todos = [];
  const tipos = {};
  let turnos = 0;
  while (e.ganador === null && turnos < 200) {
    const elecciones = e.jugadores.map((_, j) => M.eleccionBot(e, j, rnd));
    const antes = JSON.stringify(e);
    const r = M.resolverTurno(e, elecciones);
    if (JSON.stringify(e) !== antes) falla(`turno ${e.turno}: resolverTurno muta su entrada`);
    e = r.estado;
    revisar(e, `turno ${e.turno - 1}`);
    for (const ev of r.eventos) {
      tipos[ev.k] = (tipos[ev.k] ?? 0) + 1;
      if (ev.clave && !textos.has(ev.clave)) falla(`clave sin texto: ${ev.clave}`);
      if (ev.clave && /\{\w+\}/.test(decir(ev) ?? '')) falla(`variable sin rellenar en ${ev.clave}: ${decir(ev)}`);
      if (ev.k === 'golpe' && (ev.ps < 0 || ev.dano < 0)) falla('golpe con valores negativos');
      todos.push({ turno: e.turno - 1, ev });
    }
    turnos++;
    if (e.ganador === null && e.reemplazos.length) {
      const elegidos = Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]));
      const rr = M.reemplazar(e, elegidos);
      e = rr.estado;
      for (const ev of rr.eventos) {
        tipos[ev.k] = (tipos[ev.k] ?? 0) + 1;
        if (ev.clave && !textos.has(ev.clave)) falla(`clave sin texto: ${ev.clave}`);
        todos.push({ turno: e.turno - 1, ev });
      }
      if (e.reemplazos.length) falla('reemplazar no vació reemplazos');
    }
  }
  if (e.ganador === null) falla(`la batalla no acabó en ${turnos} turnos`);
  revisarStats(e, turnos, todos);
  const puestos = e.jugadores.map((q) => q.puesto).sort();
  if (e.ganador !== null) {
    if (puestos.join() !== '1,2,3,4') falla(`puestos raros: ${puestos}`);
    if (e.jugadores.filter((q) => q.puesto === 1).length !== 1) falla('no hay exactamente un ganador');
    if (e.jugadores[e.ganador].puesto !== 1) falla('el ganador no tiene puesto 1');
  }
  console.log(`Semilla ${semilla}: ${turnos} turnos, ganador ${e.ganador === null ? '-' : nombres[e.ganador]}, puestos ${e.jugadores.map((q, i) => `${nombres[i]}=${q.puesto}`).join(' ')}, eventos ${todos.length} ${JSON.stringify(tipos)}`);
  if (verbose) {
    console.log('--- primeros eventos (texto) ---');
    let n = 0;
    for (const { turno, ev } of todos) {
      const t = decir(ev);
      if (!t) continue;
      console.log(`[T${turno}] ${t}`);
      if (++n >= 45) break;
    }
    const cierre = todos.filter(({ ev }) => ev.clave === 'combate.eliminado' || ev.clave === 'combate.fin' || ev.clave === 'combate.cierre');
    console.log('--- eliminaciones / final ---');
    for (const { turno, ev } of cierre) console.log(`[T${turno}] ${decir(ev)}`);
  }
  // Determinism: the same seed gives the same battle.
  return JSON.stringify(e) + inicial.length;
}

// ---- balance simulation: `--sim=N` plays N bot battles and prints the length and the hits per fall.
const simArg = process.argv.find((a) => a.startsWith('--sim'));
if (simArg) {
  const N = Number(simArg.split('=')[1]) || 200;
  const largos = [];
  const golpesPorCaida = [];
  let caidasTotal = 0;
  let golpesTotal = 0;
  let grandes = 0;
  const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
  for (let s = 1; s <= N; s++) {
    const rnd = M.crearRnd(s * 104729 + 7);
    let d = M.crearDraft(4, s % 4);
    while (M.turnoDraft(d) !== null) d = M.elegir(d, M.pickBot(d, rnd));
    const eq = M.equipos(d, 4);
    let e = M.crearCombate(
      eq.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies })),
      s,
    );
    const golpes = e.jugadores.map((q) => q.equipo.map(() => 0));
    let turnos = 0;
    const enCampo = e.jugadores.map((q) => q.activo);
    const procesar = (evs) => {
      let atacante = -1;
      for (const ev of evs) {
        if (ev.k === 'usa') atacante = ev.j;
        if (ev.k === 'sale') enCampo[ev.j] = ev.idx;
        // An attack hit has no text of its own; burns, recoil, Hora de cerrar... do.
        if (ev.k === 'golpe' && ev.dano > 0 && !ev.clave && atacante !== ev.j) golpes[ev.j][enCampo[ev.j]]++;
        if (ev.k === 'cae') {
          golpesPorCaida.push(golpes[ev.j][enCampo[ev.j]]);
          caidasTotal++;
        }
      }
    };
    while (e.ganador === null && turnos < 200) {
      const r = M.resolverTurno(e, e.jugadores.map((_, j) => M.eleccionBot(e, j, rnd)));
      procesar(r.eventos);
      if (process.env.TRAZA && s === Number(process.env.TRAZA) && turnos >= 28)
        console.log(`T${turnos + 1}`, r.eventos.filter((ev) => ev.k === 'usa').map((ev) => `${ev.j}:${ev.mov}`).join(' '), '|', r.estado.jugadores.map((q) => (q.puesto ? 'x' : q.equipo.map((u) => `${u.ps}/${u.psMax}${u.estado ? u.estado[0] : ''}`).join(','))).join(' | '));
      e = r.estado;
      turnos++;
      if (e.ganador === null && e.reemplazos.length) {
        const rr = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)])));
        procesar(rr.eventos);
        e = rr.estado;
      }
    }
    largos.push(turnos);
    if (process.env.LARGAS && turnos >= Number(process.env.LARGAS)) console.log(`semilla ${s}: ${turnos} turnos`);
    if (e.ganador === null) grandes++;
  }
  largos.sort((a, b) => a - b);
  golpesPorCaida.sort((a, b) => a - b);
  const media = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  console.log(`Simulación de ${N} batallas de 4 bots (sin acabar: ${grandes})`);
  console.log(`Turnos: media ${media(largos)}, mediana ${pct(largos, 50)}, p10 ${pct(largos, 10)}, p90 ${pct(largos, 90)}, mín ${largos[0]}, máx ${largos[largos.length - 1]}`);
  console.log(`Golpes de ataque que aguanta un userito antes de caer: media ${media(golpesPorCaida)}, mediana ${pct(golpesPorCaida, 50)}, p10 ${pct(golpesPorCaida, 10)}, p90 ${pct(golpesPorCaida, 90)} (${caidasTotal} caídas)`);
  const unGolpe = golpesPorCaida.filter((g) => g <= 1).length;
  const dos = golpesPorCaida.filter((g) => g === 2).length;
  console.log(`Caen de 1 golpe: ${((100 * unGolpe) / caidasTotal).toFixed(1)} %, de 2: ${((100 * dos) / caidasTotal).toFixed(1)} %`);
  process.exit(0);
}

const semillas = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n)).slice(0, 5);
if (!semillas.length) semillas.push(1);
semillas.forEach((s, i) => {
  const a = jugar(s, i === 0);
  if (i === 0 && jugar(s, false) !== a) falla('no es determinista con la misma semilla');
});
console.log(fallos.length ? `${fallos.length} FALLOS` : 'OK: sin fallos');
process.exit(fallos.length ? 1 : 0);
