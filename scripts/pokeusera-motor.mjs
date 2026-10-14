// Quick check of the PokéUsera battle engine: bundles src/pokeusera/{datos,motor} with esbuild and
// plays ONE battle of 4 bots (random draft, fixed seed), checking invariants as it goes.
// Usage: node scripts/pokeusera-motor.mjs [seed] [seed...]   (default seed 1; keep it to a few runs)
//        node scripts/pokeusera-motor.mjs --sim=200   (balance: N bot battles with different seeds; turns, hits per fall)
//        node scripts/pokeusera-motor.mjs --especies=400   (balance per userito: N bot battles with RANDOM drafts; win rate and average place of each userito)
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
// Data: 24 useritos with valid moves; every userito, move and type has its text.
if (M.ESPECIES.length !== 24) console.error('FALLO: no hay 24 useritos');
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
// Acorralado: no text event any more; the hit carries `acorralado: true` when someone else had already hit that userito
// this turn (a later hit by the same attacker, e.g. a multi-hit move, does not count). The lines about the result on a
// target (critical, effectiveness, «n times»...) carry that target in `j` so an area move can play them all at once.
let acorralados = 0;
function revisarAcorralado(eventos, ctx, sucesos = []) {
  // «Pelea en la barra»: against the player it names nobody is «acorralado».
  const peleaJ = sucesos.find((x) => x.id === 'pelea')?.j;
  let atacante = -1;
  let movimiento = '';
  const golpeadoPor = new Map();
  for (const ev of eventos) {
    if (ev.clave === 'combate.acorralado') falla(`${ctx}: combate.acorralado ya no es un evento de texto`);
    if (ev.k === 'texto' && ['combate.critico', 'combate.muy_eficaz', 'combate.poco_eficaz', 'combate.veces'].includes(ev.clave) && ev.j === undefined) falla(`${ctx}: ${ev.clave} sin j`);
    if (ev.k === 'usa') {
      atacante = ev.j;
      movimiento = ev.mov;
    }
    if (ev.k === 'sale') golpeadoPor.delete(ev.j);
    // A tipsy userito hitting itself: the next hit event is its own (no 'usa' before it), not one from the last attacker.
    if (ev.clave === 'combate.achispado_golpe') {
      atacante = ev.vars ? -2 : atacante;
      continue;
    }
    if (atacante === -2 && ev.k === 'golpe') {
      atacante = -1;
      continue;
    }
    if (ev.k === 'golpe' && !ev.fin && !ev.clave && atacante >= 0 && ev.j !== atacante) {
      const antes = golpeadoPor.get(ev.j) ?? new Set();
      // Devolvérsela returns a fixed amount: it is never halved, but it counts for the hits that come after it.
      const esperado = [...antes].some((a) => a !== atacante) && peleaJ !== ev.j && movimiento !== 'devolver';
      if (!!ev.acorralado !== esperado) falla(`${ctx}: golpe a ${ev.j} de ${atacante} (${movimiento}) con acorralado=${ev.acorralado} (esperado ${esperado}; sucesos ${JSON.stringify(sucesos)})`);
      if (ev.acorralado) acorralados++;
      antes.add(atacante);
      golpeadoPor.set(ev.j, antes);
    } else if (ev.k === 'golpe' && ev.acorralado) falla(`${ctx}: acorralado en un golpe que no es de otro jugador`);
  }
}

// Sucesos del bar (docs/POKEUSERA.md): one at the start of turns 5, 10, 15, 20 and 25 (told in the events of the turn before, flagged `fin`),
// never repeated in a battle, only those of the place, none from turn 30.
function revisarSucesos(eventos, e, vistos) {
  for (const ev of eventos) {
    if (ev.k !== 'suceso') continue;
    if (![5, 10, 15, 20, 25].includes(e.turno)) falla(`suceso ${ev.id} en el turno ${e.turno}`);
    if (!ev.fin) falla(`suceso ${ev.id} sin fin`);
    if (vistos.includes(ev.id)) falla(`suceso repetido: ${ev.id}`);
    vistos.push(ev.id);
    if (!M.sucesosDe(e.escenario).includes(ev.id)) falla(`suceso ${ev.id} fuera de su escenario (${e.escenario})`);
    if (ev.turnos !== M.SUCESOS[ev.id].dura) falla(`suceso ${ev.id}: turnos ${ev.turnos}`);
    if (!textos.has(`suceso.${ev.id}.nombre`) || !textos.has(`suceso.${ev.id}.desc`)) falla(`suceso ${ev.id}: faltan textos`);
  }
  if (e.sucesos.some((x) => x.turnos < 1 || x.turnos > 2)) falla(`sucesos con turnos raros: ${JSON.stringify(e.sucesos)}`);
  if (e.turno >= 27 && e.sucesos.length) falla(`quedan sucesos en el turno ${e.turno}`);
}

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
  acorralados = 0;
  const vistos = [];
  const todos = [];
  const tipos = {};
  let turnos = 0;
  while (e.ganador === null && turnos < 200) {
    const elecciones = e.jugadores.map((_, j) => M.eleccionBot(e, j, rnd));
    const antes = JSON.stringify(e);
    const sucesosPrevios = e.sucesos;
    const r = M.resolverTurno(e, elecciones);
    if (JSON.stringify(e) !== antes) falla(`turno ${e.turno}: resolverTurno muta su entrada`);
    e = r.estado;
    revisarSucesos(r.eventos, e, vistos);
    revisar(e, `turno ${e.turno - 1}`);
    for (const ev of r.eventos) {
      tipos[ev.k] = (tipos[ev.k] ?? 0) + 1;
      if (ev.clave && !textos.has(ev.clave)) falla(`clave sin texto: ${ev.clave}`);
      if (ev.clave && /\{\w+\}/.test(decir(ev) ?? '')) falla(`variable sin rellenar en ${ev.clave}: ${decir(ev)}`);
      if (ev.k === 'golpe' && (ev.ps < 0 || ev.dano < 0)) falla('golpe con valores negativos');
      todos.push({ turno: e.turno - 1, ev });
    }
    revisarAcorralado(r.eventos, `turno ${e.turno - 1}`, sucesosPrevios);
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
  console.log(`Semilla ${semilla}: ${turnos} turnos, ${acorralados} golpes acorralados, ganador ${e.ganador === null ? '-' : nombres[e.ganador]}, puestos ${e.jugadores.map((q, i) => `${nombres[i]}=${q.puesto}`).join(' ')}, eventos ${todos.length} ${JSON.stringify(tipos)}`);
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

// ---- balance per userito: `--especies=N` plays N bot battles whose drafts are RANDOM (each pick is any free userito), so a
// userito's results do not depend on how well the bot drafts it. For every userito: appearances (a team of 3 counts once each),
// win rate (the team won) and average place (1 = winner, 4 = first out). With four players the average win rate is 25 %.
const espArg = process.argv.find((a) => a.startsWith('--especies'));
if (espArg) {
  const N = Number(espArg.split('=')[1]) || 400;
  const res = Object.fromEntries(M.ESPECIES.map((sp) => [sp.id, { n: 0, gana: 0, puesto: 0 }]));
  let sinAcabar = 0;
  for (let s = 1; s <= N; s++) {
    const rnd = M.crearRnd(s * 15485863 + 11);
    let d = M.crearDraft(4, s % 4);
    while (M.turnoDraft(d) !== null) {
      const libres = M.disponibles(d);
      d = M.elegir(d, libres[Math.floor(rnd() * libres.length)]);
    }
    const eq = M.equipos(d, 4);
    let e = M.crearCombate(
      eq.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies })),
      s,
    );
    let turnos = 0;
    while (e.ganador === null && turnos < 200) {
      const r = M.resolverTurno(e, e.jugadores.map((_, j) => M.eleccionBot(e, j, rnd)));
      e = r.estado;
      turnos++;
      if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
    }
    if (e.ganador === null) {
      sinAcabar++;
      continue;
    }
    e.jugadores.forEach((q, j) => {
      for (const id of eq[j]) {
        res[id].n++;
        res[id].puesto += q.puesto;
        if (q.puesto === 1) res[id].gana++;
      }
    });
  }
  const filas = M.ESPECIES.map((sp, i) => ({ Nº: i + 1, id: sp.id, tipos: sp.tipos.join('/'), n: res[sp.id].n, victoria: res[sp.id].gana / res[sp.id].n, puesto: res[sp.id].puesto / res[sp.id].n }));
  const total = filas.reduce((a, f) => a + f.victoria, 0) / filas.length;
  console.log(`Balance por userito: ${N} batallas de 4 bots con drafts al azar (sin acabar: ${sinAcabar}). Victoria media ${(total * 100).toFixed(1)} %`);
  console.log('Nº  userito       tipos               apar.  victoria  x media  puesto medio');
  for (const f of [...filas].sort((a, b) => b.victoria - a.victoria))
    console.log(`${String(f.Nº).padStart(2)}  ${f.id.padEnd(12)}  ${f.tipos.padEnd(18)}  ${String(f.n).padStart(5)}  ${(f.victoria * 100).toFixed(1).padStart(7)} %  ${(f.victoria / total).toFixed(2).padStart(6)}  ${f.puesto.toFixed(2).padStart(10)}`);
  process.exit(0);
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

// ---- trainer perks (Fran caña 60 %, Pablo +10 accuracy on status moves, Chuchi first hit −20 %, Guille survives a KO from full HP).
// A few deterministic cases; the perks consume no random numbers, so the same seed with another trainer gives the same rolls.
function revisarPerks() {
  const eq = (ents, esp = [['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']]) =>
    ents.map((entrenador, i) => ({ entrenador, nombre: entrenador, bot: false, especies: esp[i] ?? esp[1] }));
  const cana = { tipo: 'cana' };
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const perksEn = (r) => r.eventos.filter((ev) => ev.clave?.startsWith('combate.perk.'));
  const invariante = (e, ctx) =>
    e.jugadores.forEach((q, j) => q.equipo.forEach((u, i) => {
      const s = e.stats.u[j][i];
      if (u.psMax - u.ps !== s.dr + s.dp - s.cu) falla(`perk ${ctx}: PS de ${u.especie} != dr+dp-cu`);
    }));

  // Fran: caña heals floor(60 %); the others floor(50 %).
  for (const [ent, pct] of [['fran', 60], ['pablo', 50], ['chuchi', 50], ['guille', 50]]) {
    const e = M.crearCombate(eq([ent, 'pablo' === ent ? 'fran' : 'pablo']), 3);
    e.jugadores[0].equipo[0].ps = 1;
    const r = M.resolverTurno(e, [cana, cana]);
    const cura = r.eventos.find((ev) => ev.k === 'cura' && ev.j === 0);
    const esperado = 1 + Math.floor((e.jugadores[0].equipo[0].psMax * pct) / 100);
    if (cura?.ps !== esperado) falla(`perk caña de ${ent}: PS ${cura?.ps}, esperaba ${esperado}`);
  }

  // Pablo: Esporas (75) hits more with Labia (85); never fewer, and a damaging move (Garrafón 85) is untouched.
  const resultado = (ent, esp, mov, semilla) => {
    const e = M.crearCombate(eq([ent, 'guille'], [esp, ['turito', 'tocinon', 'cierzon']]), semilla);
    const r = M.resolverTurno(e, [ataca(mov), cana]);
    return r.eventos.some((ev) => (ev.k === 'estado' || ev.k === 'golpe') && ev.j === 1 && !ev.fin) ? 1 : 0;
  };
  let ganaPablo = 0;
  let peorPablo = 0;
  let difDano = 0;
  for (let semilla = 1; semilla <= 300; semilla++) {
    const a = resultado('pablo', ['criaturitah', 'turito', 'cierzon'], 0, semilla);
    const b = resultado('fran', ['criaturitah', 'turito', 'cierzon'], 0, semilla);
    if (a > b) ganaPablo++;
    if (a < b) peorPablo++;
    if (resultado('pablo', ['chupitochu', 'turito', 'cierzon'], 2, semilla) !== resultado('fran', ['chupitochu', 'turito', 'cierzon'], 2, semilla)) difDano++;
  }
  if (!ganaPablo) falla('perk Pablo: nunca acierta más que otro entrenador con Esporas');
  if (peorPablo) falla(`perk Pablo: acierta menos que otro entrenador en ${peorPablo} semillas`);
  if (difDano) falla(`perk Pablo: Garrafón (con daño) cambia en ${difDano} semillas`);

  // Chuchi: the first hit his userito receives does floor(80 %) (min 1) of what another trainer's would; later hits, the same.
  const golpe = (ent, turnos = 2) => {
    let e = M.crearCombate(eq(['pablo', ent]), 11);
    const danos = [];
    const log = [];
    for (let k = 0; k < turnos; k++) {
      const r = M.resolverTurno(e, [ataca(0), cana]);
      e = r.estado;
      danos.push(r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === 1 && !ev.clave).reduce((n, ev) => n + ev.dano, 0));
      log.push(...perksEn(r));
    }
    return { danos, log, e };
  };
  const ch = golpe('chuchi');
  const ot = golpe('guille');
  const ref = golpe('fran');
  if (ch.danos[0] !== Math.max(1, Math.floor((ref.danos[0] * 80) / 100))) falla(`perk Chuchi: primer golpe ${ch.danos[0]} != 80 % de ${ref.danos[0]}`);
  if (ch.danos[1] !== ref.danos[1]) falla(`perk Chuchi: el segundo golpe cambia (${ch.danos[1]} vs ${ref.danos[1]})`);
  if (ch.log.length !== 1 || ch.log[0].clave !== 'combate.perk.chuchi' || ch.log[0].j !== 1 || !ch.log[0].vars?.quien) falla('perk Chuchi: debía avisar una sola vez');
  if (ref.log.length !== 0) falla('perk Chuchi: lo ha activado otro entrenador');
  if (ot.log.some((ev) => ev.clave === 'combate.perk.chuchi')) falla('perk Chuchi: lo ha activado Guille');
  invariante(ch.e, 'Chuchi');
  // It belongs to the userito, not to the slot: it survives switching out, and the one that comes in has its own.
  {
    let e = M.crearCombate(eq(['pablo', 'chuchi']), 11);
    e = M.resolverTurno(e, [ataca(0), cana]).estado;
    const r2 = M.resolverTurno(e, [ataca(0), { tipo: 'cambiar', a: 1 }]);
    const [u0, u1] = r2.estado.jugadores[1].equipo;
    if (!u0.perk?.tarde) falla('perk Chuchi: el userito que sale pierde la marca');
    if (!u1.perk?.tarde || perksEn(r2).length !== 1) falla('perk Chuchi: el que entra no tiene su primer golpe reducido');
  }

  // Guille: from full HP a lethal hit leaves 1 HP, once per userito; not from less than full HP.
  const mañico = (ent, ps, psMax, eleccion = cana) => {
    let e = M.crearCombate(eq(['pablo', ent]), 5);
    const u = e.jugadores[1].equipo[0];
    u.psMax = psMax;
    u.ps = ps;
    const r1 = M.resolverTurno(e, [ataca(0), eleccion]);
    const ps1 = r1.estado.jugadores[1].equipo[0].ps;
    const r2 = M.resolverTurno(r1.estado, [ataca(0), eleccion]);
    return { r1, r2, ps1, ps2: r2.estado.jugadores[1].equipo[0].ps };
  };
  {
    const g = mañico('guille', 5, 5);
    if (g.ps1 !== 1) falla(`perk Guille: aguanta con ${g.ps1} PS, esperaba 1`);
    const av = perksEn(g.r1);
    if (av.length !== 1 || av[0].clave !== 'combate.perk.guille' || av[0].j !== 1) falla('perk Guille: aviso mal');
    if (g.r1.eventos.some((ev) => ev.k === 'cae' && ev.j === 1)) falla('perk Guille: cae aunque aguanta');
    if (g.ps2 !== 0 || perksEn(g.r2).length) falla('perk Guille: se usa dos veces');
    invariante(g.r1.estado, 'Guille 1');
    invariante(g.r2.estado, 'Guille 2');
    const no = mañico('guille', 4, 5, ataca(0, 0)); // not at full HP (it attacks instead of drinking the caña)
    if (no.ps1 !== 0 || perksEn(no.r1).length) falla(`perk Guille: aguanta sin estar a tope (${no.ps1}, ${no.r1.eventos.map((ev) => ev.k + ':' + (ev.dano ?? ev.clave ?? '')).join(' ')})`);
    const otro = mañico('fran', 5, 5);
    if (otro.ps1 !== 0 || perksEn(otro.r1).length) falla('perk Guille: lo tiene otro entrenador');
  }
}
revisarPerks();

// ---- batch 4 moves: Tubo perfecto (+1 Vel to the user after a hit), P de Pesao (−1 Vel to the target, always), Bajarse los pantalones.
{
  const cana = { tipo: 'cana' };
  const nivel = (esp, mov, j) => {
    const e = M.crearCombate([{ entrenador: 'fran', nombre: 'A', bot: false, especies: [esp, 'turito', 'cierzon'] }, { entrenador: 'pablo', nombre: 'B', bot: false, especies: ['tocinon', 'turito', 'cierzon'] }], 9);
    const r = M.resolverTurno(e, [{ tipo: 'atacar', mov, objetivo: 1 }, cana]);
    return r.eventos.filter((ev) => ev.k === 'nivel' && ev.j === j).map((ev) => `${ev.stat}${ev.cambio > 0 ? '+' : ''}${ev.cambio}`).join(',');
  };
  if (nivel('jesuspelo', 0, 0) !== 'vel+1') falla(`Tubo perfecto: niveles del usuario ${nivel('jesuspelo', 0, 0)}`);
  if (nivel('p', 0, 1) !== 'vel-1') falla(`P de Pesao: niveles del rival ${nivel('p', 0, 1)}`);
  if (nivel('pantaloneto', 0, 0) !== 'ata+2,vel+2,def-2') falla(`Bajarse los pantalones: ${nivel('pantaloneto', 0, 0)}`);
}

// ---- tanda 6: prioridad y protección (¡Me cuelo!, Rebufo, Colleja, ¡Que pague otro!, Aguantar el tipo, Devolvérsela) y sucesos del bar.
// Deterministic cases (fixed teams, seeds and choices); the statistical ones (50 % fail, accuracy, achispar) use a few hundred seeds.
function revisarTanda6() {
  const ENTS = ['fran', 'pablo', 'chuchi', 'guille'];
  // Teams of the given first userito (+ two fillers), trainers without a perk that bends hits (Fran, Pablo) unless `ents` says otherwise.
  const equipo = (primeros, ents = ['fran', 'pablo', 'fran', 'pablo']) => primeros.map((p, i) => ({ entrenador: ents[i], nombre: ents[i] + i, bot: false, especies: [p, 'turito', 'tocinon'] }));
  const ataca = (mov, objetivo) => ({ tipo: 'atacar', mov, objetivo });
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const usas = (r) => r.eventos.filter((ev) => ev.k === 'usa');
  const orden = (r) => usas(r).map((ev) => ev.j);
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave);
  const dano = (r, j) => golpes(r, j).reduce((n, ev) => n + ev.dano, 0);
  const activos = (e) => e.jugadores.map((q) => q.equipo[q.activo]);

  // --- Data: the six moves exist with their priority and the nine owners.
  const prio = { mecuelo: 1, rebufo: 1, colleja: 1, susto: 1, quepague: 2, aguantar: 2, esconderse: 2, devolver: -1 };
  for (const [id, p] of Object.entries(prio)) if ((M.MOVS[id]?.prioridad ?? 0) !== p) falla(`prioridad de ${id}: ${M.MOVS[id]?.prioridad}, esperaba ${p}`);
  for (const [esp, mov] of [['aceituna', 'mecuelo'], ['pantaloneto', 'mecuelo'], ['cierzon', 'rebufo'], ['criaturitah', 'colleja'], ['p', 'quepague'], ['ego-ego', 'quepague'], ['cajonazo', 'aguantar'], ['resacon', 'aguantar'], ['evoscar', 'devolver']])
    if (!M.ESPECIE[esp].movs.includes(mov)) falla(`${esp} no lleva ${mov}`);
  for (const mv of ['mecuelo', 'rebufo', 'colleja']) if (M.MOVS[mv].pot !== 40 || M.MOVS[mv].prec !== 100 || M.MOVS[mv].pp !== 10) falla(`${mv}: 40/100/10`);
  for (const mv of ['quepague', 'aguantar', 'devolver']) if (M.MOVS[mv].pp !== 5) falla(`${mv}: 5 PP`);

  // --- Order: priority first, speed inside a bracket; −1 goes after everybody.
  {
    const dos = (a, b) => M.crearCombate(equipo([a, b]), 5);
    const o = (a, ma, b, mb) => orden(M.resolverTurno(dos(a, b), [ataca(idx(a, ma), 1), ataca(idx(b, mb), 0)]));
    if (o('aceituna', 'mecuelo', 'cierzon', 'planeo').join() !== '0,1') falla('¡Me cuelo! no va el primero contra uno más rápido');
    if (o('aceituna', 'lametazo', 'cierzon', 'planeo').join() !== '1,0') falla('sin prioridad debería ir primero el más rápido');
    if (o('cierzon', 'rebufo', 'cubatillo', 'burbujeo').join() !== '0,1') falla('Rebufo no va el primero');
    if (o('criaturitah', 'colleja', 'cierzon', 'planeo').join() !== '0,1') falla('Colleja no va la primera');
    if (o('lentejasur', 'susto', 'aceituna', 'mecuelo').join() !== '0,1') falla('Susto y ¡Me cuelo! (+1) se ordenan por velocidad');
    if (o('aceituna', 'mecuelo', 'lentejasur', 'susto').join() !== '1,0') falla('Susto (más rápido) debe ir antes que ¡Me cuelo! (+1 los dos)');
    if (o('aceituna', 'mecuelo', 'cajonazo', 'aguantar').join() !== '1,0') falla('una protección (+2) va antes que un rápido (+1)');
    if (o('evoscar', 'coz', 'camioner', 'trompazo').join() !== '0,1') falla('Evoscar con Coz doble debería ir antes que Camioner');
    if (o('evoscar', 'devolver', 'camioner', 'trompazo').join() !== '1,0') falla('Devolvérsela (−1) debe ir la última, incluso detrás del más lento');
  }

  // --- ¡Que pague otro!: single-target blows aimed at the user go to a third userito (not the user, not the attacker); «todos» still hit; with two players it fails.
  {
    for (let semilla = 1; semilla <= 40; semilla++) {
      const e = M.crearCombate(equipo(['p', 'tocinon', 'cajonazo']), semilla);
      const r = M.resolverTurno(e, [ataca(2), ataca(0, 0), ataca(3)]);
      const u1 = usas(r).find((ev) => ev.j === 1);
      if (u1?.obj?.join() !== '2') falla(`¡Que pague otro! (3 jugadores, semilla ${semilla}): el golpe va a ${u1?.obj}`);
      if (r.estado.jugadores[0].equipo[0].ps !== e.jugadores[0].equipo[0].ps) falla('¡Que pague otro!: aun así le dieron');
      if (r.estado.agresores[0].length) falla('¡Que pague otro!: cuenta golpes que no le dieron (Acorralado/Venganza)');
      if (!r.eventos.some((ev) => ev.clave === 'combate.quepague_desvia')) falla('¡Que pague otro!: falta el aviso del desvío');
    }
    const destinos = new Set();
    for (let semilla = 1; semilla <= 60; semilla++) {
      const e = M.crearCombate(equipo(['ego-ego', 'tocinon', 'tocinon', 'cajonazo']), semilla);
      const r = M.resolverTurno(e, [ataca(3), ataca(0, 0), ataca(0, 0), ataca(3)]);
      for (const ev of usas(r)) {
        if (ev.j !== 1 && ev.j !== 2) continue;
        if (ev.obj.length !== 1 || ev.obj[0] === 0 || ev.obj[0] === ev.j) falla(`¡Que pague otro! (4 jugadores): ${ev.j} pega a ${ev.obj}`);
        destinos.add(`${ev.j}>${ev.obj[0]}`);
      }
    }
    if (destinos.size < 3) falla(`¡Que pague otro!: el desvío no es al azar (${[...destinos]})`);
    const e = M.crearCombate(equipo(['p', 'tocinon', 'cajonazo']), 3);
    const todos = M.resolverTurno(e, [ataca(2), ataca(2), ataca(3)]); // Temblor (todos) del Tocinón: sí le da
    if (!dano(todos, 0)) falla('¡Que pague otro! no debe parar los ataques a todos');
    const dos = M.resolverTurno(M.crearCombate(equipo(['p', 'tocinon']), 3), [ataca(2), ataca(0, 0)]);
    if (!dos.eventos.some((ev) => ev.k === 'falla' && ev.j === 0) || !dano(dos, 0)) falla('¡Que pague otro! con dos jugadores debe fallar y dejar pasar el golpe');
    if (usas(dos).find((ev) => ev.j === 0)?.obj.length) falla('¡Que pague otro! fallido con objetivos');
  }

  // --- Aguantar el tipo: no hit leaves the userito under 1 HP this turn (and it is a normal userito the turn after).
  {
    for (let semilla = 1; semilla <= 30; semilla++) {
      const e = M.crearCombate(equipo(['cajonazo', 'tocinon']), semilla);
      e.jugadores[0].equipo[0].ps = 6;
      const r = M.resolverTurno(e, [ataca(2), ataca(0, 0)]);
      if (activos(r.estado)[0].ps !== 1 || r.eventos.some((ev) => ev.k === 'cae' && ev.j === 0)) falla(`Aguantar el tipo (semilla ${semilla}): PS ${activos(r.estado)[0].ps}`);
      if (!r.eventos.some((ev) => ev.clave === 'combate.aguanta' && ev.j === 0)) falla('Aguantar el tipo: falta el aviso');
      if (r.estado.jugadores[0].equipo[0].vol.aguanta) falla('Aguantar el tipo sigue activo el turno siguiente');
      const sig = M.resolverTurno(r.estado, [ataca(0), ataca(0, 0)]);
      if (activos(sig.estado)[0].ps !== 0) falla('Aguantar el tipo protege más de un turno');
    }
    // Several blows in the same turn (3 players), and a userito that is already on 1 HP.
    const e = M.crearCombate(equipo(['cajonazo', 'tocinon', 'camioner']), 4);
    e.jugadores[0].equipo[0].ps = 1;
    const r = M.resolverTurno(e, [ataca(2), ataca(0, 0), ataca(0, 0)]);
    if (activos(r.estado)[0].ps !== 1) falla('Aguantar el tipo con 1 PS y dos golpes');
    // Without it, the same blows do take it down.
    const sin = M.resolverTurno(e, [ataca(3), ataca(0, 0), ataca(0, 0)]);
    if (activos(sin.estado)[0].ps !== 0) falla('control: sin Aguantar el tipo debería caer');
  }

  // --- Devolvérsela: 1.5 × the damage taken this turn to whoever hit last; fails if nobody did.
  {
    const e = M.crearCombate(equipo(['evoscar', 'tocinon']), 8);
    const r = M.resolverTurno(e, [ataca(1), ataca(0, 0)]);
    const recibido = dano(r, 0);
    const devuelto = dano(r, 1);
    if (!recibido || devuelto !== Math.floor(recibido * 1.5)) falla(`Devolvérsela: recibió ${recibido}, devolvió ${devuelto}`);
    if (usas(r).find((ev) => ev.j === 0)?.obj?.join() !== '1') falla('Devolvérsela: el objetivo no es quien le pegó');
    if (orden(r).join() !== '1,0') falla('Devolvérsela no va la última');
    revisarStatsSimple(r.estado, 'Devolvérsela'); // no PS edited by hand in this one
    // Nobody hits it: fails.
    const nadie = M.resolverTurno(M.crearCombate(equipo(['evoscar', 'cajonazo']), 8), [ataca(1), ataca(3)]);
    if (!nadie.eventos.some((ev) => ev.k === 'falla' && ev.j === 0) || dano(nadie, 1)) falla('Devolvérsela sin que nadie le pegue debe fallar');
    // Two attackers: the one that hit last gets 1.5 × the total.
    const e3 = M.crearCombate(equipo(['evoscar', 'tocinon', 'camioner']), 8);
    const r3 = M.resolverTurno(e3, [ataca(1), ataca(0, 0), ataca(0, 0)]);
    const ultimo = [...r3.eventos].reverse().find((ev) => ev.k === 'usa' && ev.j !== 0 && r3.eventos.indexOf(ev) < r3.eventos.findIndex((x) => x.k === 'usa' && x.j === 0)).j;
    if (dano(r3, ultimo) < Math.floor(dano(r3, 0) * 1.5)) falla(`Devolvérsela con dos atacantes: ${dano(r3, ultimo)} < 1,5 × ${dano(r3, 0)}`);
    if (usas(r3).find((ev) => ev.j === 0)?.obj?.join() !== String(ultimo)) falla('Devolvérsela: no va a por el último que le pegó');
    // The one that hit it fell in the meantime (Trompazo's recoil): nothing to return.
    const fuerte = M.crearCombate(equipo(['evoscar', 'camioner']), 8);
    fuerte.jugadores[1].equipo[0].ps = 1;
    const mata = M.resolverTurno(fuerte, [ataca(1), ataca(0, 0)]);
    if (!mata.eventos.some((ev) => ev.k === 'cae' && ev.j === 1) || !mata.eventos.some((ev) => ev.k === 'falla' && ev.j === 0)) falla('Devolvérsela: el que le pegó ya no está en pie y no falla');
  }

  // --- Protections chain: a protection that worked last turn fails half of the times; a failure breaks the chain.
  {
    let uno = 0;
    let dosFalla = 0;
    let tras = 0;
    let trasFalla = 0;
    const N = 300;
    for (let semilla = 1; semilla <= N; semilla++) {
      let e = M.crearCombate(equipo(['cajonazo', 'cajonazo']), semilla);
      const sigue = [];
      for (let turno = 0; turno < 3; turno++) {
        const r = M.resolverTurno(e, [ataca(2), ataca(3)]);
        sigue.push(r.eventos.some((ev) => ev.clave === 'combate.proteccion_falla'));
        e = r.estado;
      }
      if (sigue[0]) uno++;
      if (sigue[1]) dosFalla++;
      if (sigue[1]) {
        tras++;
        if (sigue[2]) trasFalla++;
      }
    }
    if (uno) falla('la primera protección falla');
    if (dosFalla < N * 0.38 || dosFalla > N * 0.62) falla(`la segunda protección seguida falla ${dosFalla}/${N} (esperaba ~50 %)`);
    if (trasFalla) falla('tras un fallo la siguiente protección debería salir siempre');
    // Esconderse keeps its own line.
    let hay = false;
    for (let semilla = 1; semilla <= 40 && !hay; semilla++) {
      let e = M.crearCombate(equipo(['draguserin', 'cajonazo']), semilla);
      for (let turno = 0; turno < 2; turno++) {
        const r = M.resolverTurno(e, [ataca(3), ataca(3)]);
        if (r.eventos.some((ev) => ev.clave === 'combate.esconde_falla')) hay = true;
        e = r.estado;
      }
    }
    if (!hay) falla('Esconderse seguido no llega a fallar nunca con su aviso');
  }

  // --- Escenario: given or drawn from the seed; it travels in the state (JSON, like the online 'inicio' message).
  {
    const vistos = new Set();
    for (let semilla = 1; semilla <= 80; semilla++) {
      const a = M.crearCombate(equipo(['p', 'turito']), semilla);
      const b = M.crearCombate(equipo(['p', 'turito']), semilla);
      if (a.escenario !== b.escenario) falla('el escenario sorteado no es determinista');
      if (!['brio', 'terraza', 'rural', 'juan'].includes(a.escenario)) falla(`escenario raro: ${a.escenario}`);
      vistos.add(a.escenario);
      if (JSON.parse(JSON.stringify(a)).escenario !== a.escenario) falla('el escenario no sobrevive a JSON');
    }
    if (vistos.size !== 4) falla(`el sorteo del escenario no sale en los cuatro (${[...vistos]})`);
    if (M.crearCombate(equipo(['p', 'turito']), 1, 'juan').escenario !== 'juan') falla('crearCombate ignora el escenario pedido');
    // The draw does not touch the battle's own random stream.
    if (M.crearCombate(equipo(['p', 'turito']), 7).semilla !== M.crearCombate(equipo(['p', 'turito']), 7, 'rural').semilla) falla('el escenario consume la semilla');
  }

  // --- Sucesos: every one, forced by hunting a seed whose draw gives it (turn 4 → 5).
  const PASIVO = { cajonazo: 3, kbronero: 3, draguserin: 3, pantaloneto: 0, p: 2 };
  const pasivas = (e) => e.jugadores.map((q, j) => (PASIVO[q.equipo[q.activo].especie] !== undefined ? ataca(PASIVO[q.equipo[q.activo].especie]) : { tipo: 'cana' }));
  const forzar = (id, escenario, primeros, prep) => {
    for (let semilla = 1; semilla <= 4000; semilla++) {
      const e0 = M.crearCombate(equipo(primeros), semilla, escenario);
      prep?.(e0);
      e0.turno = 4;
      const r = M.resolverTurno(e0, pasivas(e0));
      if (r.eventos.some((ev) => ev.k === 'suceso' && ev.id === id)) return { e0, r, semilla };
    }
    falla(`suceso ${id}: ninguna semilla lo saca`);
    return null;
  };
  // A target that no blow can knock out, so that damages can be compared.
  const blindar = (e, j) => {
    const u = e.jugadores[j].equipo[e.jugadores[j].activo];
    u.ps = u.psMax = 5000;
  };
  const mitad = (e) => e.jugadores.forEach((q) => q.equipo.forEach((u) => (u.ps = Math.floor(u.psMax / 2))));
  const octavo = (u) => Math.max(1, Math.floor(u.psMax / 8));
  const sinEstadoPrevio = (f) => (f ? f.r.estado : null);

  {
    const f = forzar('ronda', 'brio', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo'], mitad);
    if (f) {
      activos(f.r.estado).forEach((u, j) => {
        const ini = activos(f.e0)[j];
        if (u.ps !== ini.ps + octavo(ini)) falla(`ronda gratis: ${u.ps} != ${ini.ps} + 1/8`);
      });
      const ev = f.r.eventos.find((x) => x.k === 'suceso');
      if (!ev.fin || ev.turnos !== 0 || f.r.estado.sucesos.length) falla('ronda gratis: es instantánea y de fin de turno');
      if (f.r.estado.sucesosVistos.join() !== 'ronda') falla('ronda gratis: no se apunta como vista');
    }
  }
  {
    const f = forzar('cumple', 'brio', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo'], (e) => {
      e.jugadores[2].equipo[0].ps = Math.floor(e.jugadores[2].equipo[0].psMax * 0.3);
    });
    if (f) {
      const antes = activos(f.e0)[2];
      const u = activos(f.r.estado)[2];
      if (u.ps !== antes.ps + Math.floor(antes.psMax / 4) || u.niveles.ata !== 1) falla(`cumple: PS ${u.ps} (antes ${antes.ps}), ata ${u.niveles.ata}`);
      if (f.r.eventos.find((x) => x.k === 'suceso').vars.quien !== M.ESPECIE.draguserin.nombre) falla('cumple: la frase no nombra al cumpleañero');
      activos(f.r.estado).forEach((v, j) => j !== 2 && v.ps !== activos(f.e0)[j].ps && falla('cumple: cura a otro'));
    }
  }
  {
    const f = forzar('barre', 'brio', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo']);
    if (f) {
      if (activos(f.r.estado).some((u) => Object.values(u.niveles).some((n) => n !== 0))) falla('Vero barre: quedan subidas o bajadas');
      if (!activos(f.e0).some((u) => u.niveles.ata === 0)) falla('control de Vero barre');
    }
  }
  {
    const f = forzar('premio', 'brio', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo'], (e) => {
      e.jugadores[1].cana = false;
    });
    if (f) {
      if (!f.r.estado.jugadores[1].cana || !f.r.eventos.some((x) => x.clave === 'suceso.premio.cana' && x.j === 1)) falla('la tragaperras no devuelve la caña gastada');
      if (f.r.estado.jugadores.some((q, j) => j !== 1 && q.cana !== f.e0.jugadores[j].cana)) falla('la tragaperras toca la caña de otro');
    }
    const g = forzar('premio', 'brio', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo'], mitad);
    if (g) {
      if (!g.r.eventos.some((x) => x.clave === 'suceso.premio.cura')) falla('la tragaperras sin cañas gastadas debe curar');
      activos(g.r.estado).forEach((u, j) => {
        // Players that used the caña this turn (pasivas() gives the caña to the species with no passive move) are not in this team.
        if (u.ps !== activos(g.e0)[j].ps + octavo(u)) falla('la tragaperras no cura 1/8 a todos');
      });
    }
  }
  {
    // Cierzo de golpe: −1 Vel to everybody and Ventolera ×1.5 for two turns.
    const f = forzar('cierzo', 'terraza', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo']);
    if (f) {
      if (activos(f.r.estado).some((u) => u.niveles.vel !== -1)) falla('Cierzo de golpe: no baja 1 la Velocidad a todos');
      if (f.r.estado.sucesos.length !== 1 || f.r.estado.sucesos[0].turnos !== 2) falla('Cierzo de golpe dura 2 turnos');
      const comp = (limpio) => {
        const e = structuredClone(f.r.estado);
        if (limpio) e.sucesos = [];
        e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: 'cierzon', pp: [9, 9, 9, 9], niveles: { ata: 0, def: 0, vel: 0, esp: 0, prec: 0 } };
        blindar(e, 1);
        return M.resolverTurno(e, [ataca(1, 1), ...pasivas(e).slice(1)]);
      };
      const a = dano(comp(false), 1);
      const b = dano(comp(true), 1);
      if (!b || Math.abs(a - b * 1.5) > 2) falla(`Cierzo de golpe: Ventolera ${a} vs ${b} sin suceso (×1,5)`);
      // Two turns: 2 → 1 → gone.
      const t1 = M.resolverTurno(f.r.estado, pasivas(f.r.estado));
      if (t1.estado.sucesos[0]?.turnos !== 1) falla('Cierzo de golpe: no le queda 1 turno');
      const t2 = M.resolverTurno(t1.estado, pasivas(t1.estado));
      if (t2.estado.sucesos.length) falla('Cierzo de golpe: no se acaba a los 2 turnos');
    }
    const g = forzar('rosas', 'terraza', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo']);
    if (g) {
      const esp = activos(g.r.estado).map((u) => u.niveles.esp);
      if (esp.filter((n) => n === 1).length !== 1 || esp.some((n) => n < 0 || n > 1)) falla(`rosas: niveles de Especial ${esp}`);
      if (g.r.estado.sucesos.length) falla('rosas es instantáneo');
    }
  }
  {
    const f = forzar('desfile', 'rural', ['cajonazo', 'tocinon', 'draguserin', 'kbronero']);
    if (f) {
      const comp = (limpio, atacante, mov) => {
        const e = structuredClone(f.r.estado);
        if (limpio) e.sucesos = [];
        blindar(e, 1);
        return dano(M.resolverTurno(e, [ataca(idx('cajonazo', 'taconeo'), 1), ...pasivas(e).slice(1)]), 1);
      };
      const a = comp(false);
      const b = comp(true);
      if (!b || Math.abs(a - b * 1.5) > 2) falla(`Desfile Drag: Juerga ${a} vs ${b} sin suceso`);
      // A move of another type is the same.
      const e1 = structuredClone(f.r.estado);
      const e2 = structuredClone(f.r.estado);
      e2.sucesos = [];
      const eleg = [{ tipo: 'cana' }, ataca(idx('tocinon', 'barrigazo'), 0), ...pasivas(e1).slice(2)];
      if (dano(M.resolverTurno(e1, eleg), 0) !== dano(M.resolverTurno(e2, eleg), 0)) falla('Desfile Drag cambia un ataque Mindundi');
    }
    const g = forzar('peluca', 'rural', ['cajonazo', 'draguserin', 'kbronero', 'pantaloneto']);
    if (g) {
      const juerga = (u) => M.ESPECIE[u.especie].tipos.includes('juerga');
      activos(g.r.estado).forEach((u) => {
        if (u.niveles.prec !== (juerga(u) ? 0 : -1)) falla(`peluca descolocada: ${u.especie} precisión ${u.niveles.prec}`);
      });
    }
  }
  {
    const f = forzar('comanda', 'juan', ['cajonazo', 'draguserin', 'p', 'kbronero'], mitad);
    if (f) {
      activos(f.r.estado).forEach((u, j) => {
        const ini = activos(f.e0)[j];
        const tipos = M.ESPECIE[u.especie].tipos;
        const cura = tipos.includes('juerga') || tipos.includes('chanza') ? octavo(ini) : 0;
        if (u.ps !== ini.ps + cura) falla(`¡Comanda!: ${u.especie} ${u.ps} != ${ini.ps} + ${cura}`);
      });
    }
    // Chin chin: the two players with the least HP in total heal 1/8 at the end of each of two turns.
    const g = forzar('chinchin', 'juan', ['cajonazo', 'kbronero', 'draguserin', 'cajonazo'], (e) => {
      mitad(e);
      e.jugadores[1].equipo.forEach((u) => (u.ps = 20));
      e.jugadores[3].equipo.forEach((u) => (u.ps = 30));
    });
    if (g) {
      if (g.r.estado.sucesos[0]?.id !== 'chinchin' || g.r.estado.sucesos[0].turnos !== 2) falla('Chin chin: debe durar 2 turnos');
      const curas = (r) => r.eventos.filter((ev) => ev.clave === 'suceso.chinchin.cura').map((ev) => ev.j).sort().join();
      const t1 = M.resolverTurno(g.r.estado, pasivas(g.r.estado));
      const t2 = M.resolverTurno(t1.estado, pasivas(t1.estado));
      const t3 = M.resolverTurno(t2.estado, pasivas(t2.estado));
      if (curas(t1) !== '1,3' || curas(t2) !== '1,3' || curas(t3) !== '') falla(`Chin chin: curas ${curas(t1)} / ${curas(t2)} / ${curas(t3)}`);
      if (activos(t1.estado)[1].ps !== activos(g.r.estado)[1].ps + octavo(activos(g.r.estado)[1])) falla('Chin chin: no cura 1/8');
    }
  }
  {
    // Se va la luz: −20 accuracy (100 → 80 %), except for Fantasma attackers.
    const f = forzar('luz', 'brio', ['tocinon', 'cajonazo', 'ego-ego', 'cajonazo']);
    if (f) {
      const falla_ = (esp, mov, limpio) => {
        let n = 0;
        for (let s = 1; s <= 300; s++) {
          const e = structuredClone(f.r.estado);
          if (limpio) e.sucesos = [];
          e.semilla = s;
          e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: esp, pp: [9, 9, 9, 9] };
          const r = M.resolverTurno(e, [ataca(idx(esp, mov), 1), ...pasivas(e).slice(1)]);
          if (r.eventos.some((ev) => ev.clave === 'combate.esquiva')) n++;
        }
        return n;
      };
      const con = falla_('tocinon', 'barrigazo', false);
      if (con < 300 * 0.1 || con > 300 * 0.32) falla(`Se va la luz: falla ${con}/300 (esperaba ~20 %)`);
      if (falla_('tocinon', 'barrigazo', true) !== 0) falla('control de la luz: barrigazo sin suceso falla');
      if (falla_('ego-ego', 'eco', false) !== 0) falla('Se va la luz afecta a un Fantasma');
    }
    // Happy hour: Alcohol ×1.5 and twice the chance to make tipsy.
    const g = forzar('happy', 'brio', ['chupitochu', 'cajonazo', 'draguserin', 'kbronero']);
    if (g) {
      const probar = (limpio) => {
        let ach = 0;
        let d = 0;
        for (let s = 1; s <= 400; s++) {
          const e = structuredClone(g.r.estado);
          if (limpio) e.sucesos = [];
          e.semilla = s;
          e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: 'chupitochu', pp: [9, 9, 9, 9] };
          blindar(e, 1);
          const r = M.resolverTurno(e, [ataca(0, 1), ...pasivas(e).slice(1)]);
          if (r.eventos.some((ev) => ev.k === 'estado' && ev.estado === 'achispado' && ev.j === 1)) ach++;
          if (s === 1) d = dano(r, 1);
        }
        return { ach, d };
      };
      const con = probar(false);
      const sin = probar(true);
      if (Math.abs(con.d - sin.d * 1.5) > 2) falla(`Happy hour: daño ${con.d} vs ${sin.d} (×1,5)`);
      if (sin.ach < 400 * 0.12 || sin.ach > 400 * 0.28) falla(`control del achispar: ${sin.ach}/400 (~20 %)`);
      if (con.ach < sin.ach * 1.6 || con.ach > sin.ach * 2.4) falla(`Happy hour: achispa ${con.ach}/400 contra ${sin.ach}/400 sin suceso (×2)`);
    }
    // Pelea en la barra: against the leader nobody is «acorralado»; Dale al karaoke: «todos» at 100 %.
    const h = forzar('pelea', 'brio', ['tocinon', 'tocinon', 'tocinon', 'cajonazo']);
    if (h) {
      const lider = h.r.estado.sucesos[0].j;
      const maximo = Math.max(...h.r.estado.jugadores.map((q) => q.equipo.reduce((s, u) => s + u.ps, 0)));
      if (h.r.estado.jugadores[lider].equipo.reduce((s, u) => s + u.ps, 0) !== maximo) falla('Pelea en la barra: no es el de más vida');
      const otros = [0, 1, 2, 3].filter((j) => j !== lider);
      const elegir = (e) => e.jugadores.map((_q, j) => (j === otros[0] || j === otros[1] ? ataca(0, lider) : { tipo: 'cana' }));
      const flags = (limpio) => {
        const e = structuredClone(h.r.estado);
        if (limpio) e.sucesos = [];
        e.jugadores.forEach((q) => (q.equipo[q.activo] = { ...q.equipo[q.activo], especie: 'tocinon', pp: [9, 9, 9, 9] }));
        return golpes(M.resolverTurno(e, elegir(e)), lider).map((ev) => !!ev.acorralado);
      };
      if (flags(false).some(Boolean)) falla('Pelea en la barra: hay un golpe acorralado contra el líder');
      if (!flags(true).some(Boolean)) falla('control de la pelea: sin suceso el segundo golpe debe ir acorralado');
    }
    const k = forzar('karaoke', 'brio', ['draguserin', 'cajonazo', 'cajonazo', 'cajonazo']);
    if (k) {
      const comp = (limpio) => {
        const e = structuredClone(k.r.estado);
        if (limpio) e.sucesos = [];
        blindar(e, 1);
        const r = M.resolverTurno(e, [ataca(0), ...pasivas(e).slice(1)]);
        return dano(r, 1);
      };
      const a = comp(false);
      const b = comp(true);
      if (!b || Math.abs(a - (b * 4) / 3) > 2) falla(`Dale al karaoke: Traca ${a} vs ${b} sin suceso (×4/3)`);
    }
  }

  // --- A whole battle on each stage: the sucesos stay in their place and the invariants hold (the general `jugar` does the rest).
  for (const esc of ['brio', 'terraza', 'rural', 'juan']) {
    const lista = new Set();
    for (let semilla = 1; semilla <= 12; semilla++) {
      const rnd = M.crearRnd(semilla * 31 + 5);
      let d = M.crearDraft(4, semilla % 4);
      while (M.turnoDraft(d) !== null) d = M.elegir(d, M.pickBot(d, rnd));
      let e = M.crearCombate(M.equipos(d, 4).map((especies, i) => ({ entrenador: ENTS[i], nombre: ENTS[i], bot: true, especies })), semilla, esc);
      const vistos = [];
      let turnos = 0;
      while (e.ganador === null && turnos < 200) {
        const r = M.resolverTurno(e, e.jugadores.map((_q, j) => M.eleccionBot(e, j, rnd)));
        e = r.estado;
        revisarSucesos(r.eventos, e, vistos);
        revisar(e, `${esc} ${semilla}`);
        turnos++;
        if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
      }
      vistos.forEach((id) => lista.add(id));
      if (turnos >= 25 && vistos.length !== 5) falla(`${esc} ${semilla}: ${vistos.length} sucesos en ${turnos} turnos (esperaba 5)`);
      revisarStatsSimple(e, `${esc} ${semilla}`);
    }
    const propios = M.sucesosDe(esc);
    if (![...lista].every((id) => propios.includes(id))) falla(`${esc}: salió un suceso de otro escenario`);
  }
}
// Conservation of HP in the statistics (psMax − ps = dr + dp − cu), the part of `revisarStats` that the heals of the sucesos touch.
function revisarStatsSimple(e, ctx) {
  e.jugadores.forEach((q, j) =>
    q.equipo.forEach((u, i) => {
      const s = e.stats.u[j][i];
      if (u.psMax - u.ps !== s.dr + s.dp - s.cu) falla(`${ctx}: PS de ${u.especie} (${u.psMax - u.ps}) != dr+dp-cu (${s.dr + s.dp - s.cu})`);
    }),
  );
}
revisarTanda6();

const semillas = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n)).slice(0, 5);
if (!semillas.length) semillas.push(1);
semillas.forEach((s, i) => {
  const a = jugar(s, i === 0);
  if (i === 0 && jugar(s, false) !== a) falla('no es determinista con la misma semilla');
});
console.log(fallos.length ? `${fallos.length} FALLOS` : 'OK: sin fallos');
process.exit(fallos.length ? 1 : 0);
