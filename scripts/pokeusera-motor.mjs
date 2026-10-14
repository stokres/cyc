// Quick check of the PokéUsera battle engine: bundles src/pokeusera/{datos,motor} with esbuild and
// plays ONE battle of 4 bots (random draft, fixed seed), checking invariants as it goes.
// Usage: node scripts/pokeusera-motor.mjs [seed] [seed...]   (default seed 1; keep it to a few runs)
//        node scripts/pokeusera-motor.mjs --sim=200   (balance: N bot battles with different seeds; turns, hits per fall)
//        node scripts/pokeusera-motor.mjs --especies=400   (balance per userito: N bot battles with RANDOM drafts, objects given out like the machines do and random bars; win rate and average place of each userito)
//        node scripts/pokeusera-motor.mjs --informe=2000   (the same N battles, as a report: win rate by TYPE and by OBJECT carried, mean turns per bar, how often each suceso comes out; 8000 take under two minutes)
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
    contents: `export * from './src/pokeusera/datos'; export * from './src/pokeusera/motor/combate'; export * from './src/pokeusera/motor/draft'; export * from './src/pokeusera/motor/bot'; export * from './src/pokeusera/motor/objetos'; export { OBJETOS, OBJ_TAPON_USOS, OBJ_BOCATA_CURA } from './src/pokeusera/tipos'; export { crearRnd, azar, entero } from './src/pokeusera/motor/azar';`,
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
  // «La barra»: every seat takes the object the machine would take from its three offers.
  const objetos = eq.map((especies, j) => {
    const el = M.objetoBot(especies, M.ofertasObjetos(semilla, j), rnd);
    return [0, 1, 2].map((i) => (i === el.idx ? el.objeto : null));
  });
  let e = M.crearCombate(
    eq.map((especies, i) => ({ entrenador: ents[i], nombre: nombres[i], bot: true, especies, objetos: objetos[i] })),
    semilla,
  );
  const inicial = JSON.stringify(e);
  const usos = new Map();
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
      if (ev.k === 'objeto') {
        const u = e.jugadores[ev.j].equipo.find((x) => x.objeto?.id === ev.objeto);
        if (!u || !u.objeto.visto) falla(`turno ${e.turno - 1}: objeto ${ev.objeto} de ${ev.j} sin dueño o sin visto`);
        const clave = `${ev.j}|${ev.objeto}`;
        usos.set(clave, (usos.get(clave) ?? 0) + 1);
        if (!M.OBJETO_PERMANENTE[ev.objeto] && usos.get(clave) > (ev.objeto === 'tapon' ? M.OBJ_TAPON_USOS : 1)) falla(`objeto de un uso repetido: ${clave}`);
        if (u && u.objeto.gastado === !!M.OBJETO_PERMANENTE[ev.objeto]) falla(`objeto ${ev.objeto}: gastado = ${u.objeto.gastado}`);
      }
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

// ---- random-draft battles shared by `--especies` and `--informe`: every pick is any free userito, each seat takes the object the machine
// would take from its three offers (`objetoBot`, as `Partida` does for the machines), and the bar is the seed's (a random one).
function batallaAlAzar(s) {
  const rnd = M.crearRnd(s * 15485863 + 11);
  let d = M.crearDraft(4, s % 4);
  while (M.turnoDraft(d) !== null) {
    const libres = M.disponibles(d);
    d = M.elegir(d, libres[Math.floor(rnd() * libres.length)]);
  }
  const eq = M.equipos(d, 4);
  const semillaCombate = Math.floor(M.crearRnd(s ^ 0x1b873593)() * 2 ** 31);
  const objetos = eq.map((especies, j) => {
    const el = M.objetoBot(especies, M.ofertasObjetos(semillaCombate, j), rnd);
    return { ...el, lista: [0, 1, 2].map((i) => (i === el.idx ? el.objeto : null)) };
  });
  let e = M.crearCombate(
    eq.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies, objetos: objetos[i].lista })),
    semillaCombate,
  );
  const escenario = e.escenario;
  const sucesos = [];
  const activados = new Set();
  let turnos = 0;
  while (e.ganador === null && turnos < 200) {
    const r = M.resolverTurno(e, e.jugadores.map((_, j) => M.eleccionBot(e, j, rnd)));
    e = r.estado;
    turnos++;
    let evs = r.eventos;
    if (e.ganador === null && e.reemplazos.length) {
      const rr = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)])));
      e = rr.estado;
      evs = [...evs, ...rr.eventos];
    }
    for (const ev of evs) {
      if (ev.k === 'suceso') sucesos.push(ev.id);
      if (ev.k === 'objeto') activados.add(ev.j);
    }
  }
  return { e, eq, objetos, escenario, sucesos, activados, turnos, acabo: e.ganador !== null };
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
    const b = batallaAlAzar(s);
    if (!b.acabo) {
      sinAcabar++;
      continue;
    }
    b.e.jugadores.forEach((q, j) => {
      for (const id of b.eq[j]) {
        res[id].n++;
        res[id].puesto += q.puesto;
        if (q.puesto === 1) res[id].gana++;
      }
    });
  }
  const filas = M.ESPECIES.map((sp, i) => ({ Nº: i + 1, id: sp.id, tipos: sp.tipos.join('/'), n: res[sp.id].n, victoria: res[sp.id].gana / res[sp.id].n, puesto: res[sp.id].puesto / res[sp.id].n }));
  const total = filas.reduce((a, f) => a + f.victoria, 0) / filas.length;
  console.log(`Balance por userito: ${N} batallas de 4 bots con drafts al azar, objetos como los reparte la máquina y escenarios al azar (sin acabar: ${sinAcabar}). Victoria media ${(total * 100).toFixed(1)} %`);
  console.log('Nº  userito       tipos               apar.  victoria  x media  puesto medio');
  for (const f of [...filas].sort((a, b) => b.victoria - a.victoria))
    console.log(`${String(f.Nº).padStart(2)}  ${f.id.padEnd(12)}  ${f.tipos.padEnd(18)}  ${String(f.n).padStart(5)}  ${(f.victoria * 100).toFixed(1).padStart(7)} %  ${(f.victoria / total).toFixed(2).padStart(6)}  ${f.puesto.toFixed(2).padStart(10)}`);
  process.exit(0);
}

// ---- report: `--informe=N` plays the same N battles (random drafts, objects given out like the machines, random bars) and prints
// four tables: win rate by TYPE (a userito counts once for each of its types, so a team of three adds up to up to six entries), win
// rate by OBJECT carried (each seat carries exactly one: 25 % is par) with how often it worked, mean turns per BAR, and how many
// times each SUCESO came out. Nothing here is a rule: it is what to look at when tuning.
const infArg = process.argv.find((a) => a.startsWith('--informe'));
if (infArg) {
  const N = Number(infArg.split('=')[1]) || 2000;
  const t0 = Date.now();
  const porTipo = Object.fromEntries(M.TIPOS.map((tp) => [tp, { n: 0, gana: 0 }]));
  const porObjeto = Object.fromEntries(M.OBJETOS.map((o) => [o, { n: 0, gana: 0, usado: 0 }]));
  const porEscenario = {};
  const porSuceso = {};
  let sinAcabar = 0;
  let hecho = 0;
  for (let s = 1; s <= N; s++) {
    const b = batallaAlAzar(s);
    if (!b.acabo) {
      sinAcabar++;
      continue;
    }
    hecho++;
    const esc = (porEscenario[b.escenario] ??= { n: 0, turnos: 0, max: 0 });
    esc.n++;
    esc.turnos += b.turnos;
    esc.max = Math.max(esc.max, b.turnos);
    for (const id of b.sucesos) (porSuceso[id] ??= { n: 0, escenario: M.SUCESOS[id].escenario ?? 'todos' }).n++;
    b.e.jugadores.forEach((q, j) => {
      const gana = q.puesto === 1;
      const o = porObjeto[b.objetos[j].objeto];
      o.n++;
      if (gana) o.gana++;
      if (b.activados.has(j)) o.usado++;
      for (const id of b.eq[j]) for (const tp of M.ESPECIE[id].tipos) {
        porTipo[tp].n++;
        if (gana) porTipo[tp].gana++;
      }
    });
  }
  const pc = (x, d) => (d ? ((100 * x) / d).toFixed(1).padStart(5) + ' %' : '    - ');
  const media = Object.values(porTipo).reduce((a, x) => a + x.gana / Math.max(1, x.n), 0) / M.TIPOS.length;
  console.log(`Informe: ${hecho} batallas de 4 bots con drafts al azar (sin acabar: ${sinAcabar}), ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
  console.log('\nVICTORIA POR TIPO (cada userito cuenta una vez por cada uno de sus tipos; la media va a rondar el 25 %)');
  console.log('tipo          apar.  victoria  x media');
  for (const [tp, x] of Object.entries(porTipo).sort((a, b) => b[1].gana / Math.max(1, b[1].n) - a[1].gana / Math.max(1, a[1].n)))
    console.log(`${tp.padEnd(12)}  ${String(x.n).padStart(5)}  ${pc(x.gana, x.n)}  ${(x.gana / Math.max(1, x.n) / media).toFixed(2).padStart(6)}`);
  console.log('\nVICTORIA POR OBJETO LLEVADO (25 % es lo justo; «funciona» = en cuántas de esas batallas llegó a activarse)');
  console.log('objeto        veces  victoria  funciona');
  for (const [o, x] of Object.entries(porObjeto).sort((a, b) => b[1].gana / Math.max(1, b[1].n) - a[1].gana / Math.max(1, a[1].n)))
    console.log(`${o.padEnd(12)}  ${String(x.n).padStart(5)}  ${pc(x.gana, x.n)}  ${pc(x.usado, x.n)}`);
  console.log('\nTURNOS POR ESCENARIO');
  console.log('escenario     batallas  turnos medios  máximo');
  for (const [esc, x] of Object.entries(porEscenario)) console.log(`${esc.padEnd(12)}  ${String(x.n).padStart(8)}  ${(x.turnos / x.n).toFixed(1).padStart(13)}  ${String(x.max).padStart(6)}`);
  console.log('\nSUCESOS (veces que salió en total y por batalla de su escenario)');
  console.log('suceso        escenario   veces  por batalla');
  for (const [id, x] of Object.entries(porSuceso).sort((a, b) => b[1].n - a[1].n)) {
    const batallas = x.escenario === 'todos' ? hecho : (porEscenario[x.escenario]?.n ?? 0);
    console.log(`${id.padEnd(12)}  ${x.escenario.padEnd(9)}  ${String(x.n).padStart(6)}  ${(x.n / Math.max(1, batallas)).toFixed(2).padStart(10)}`);
  }
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
  if (nivel('pantaloneto', 0, 0) !== 'ata+2,vel+1') falla(`Bajarse los pantalones: ${nivel('pantaloneto', 0, 0)}`);
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
      const r = M.resolverTurno(e, [ataca(2), ataca(0, 0), ataca(2)]); // Cajonazo hace de comparsa con Aguantar el tipo
      const u1 = usas(r).find((ev) => ev.j === 1);
      if (u1?.obj?.join() !== '2') falla(`¡Que pague otro! (3 jugadores, semilla ${semilla}): el golpe va a ${u1?.obj}`);
      if (r.estado.jugadores[0].equipo[0].ps !== e.jugadores[0].equipo[0].ps) falla('¡Que pague otro!: aun así le dieron');
      if (r.estado.agresores[0].length) falla('¡Que pague otro!: cuenta golpes que no le dieron (Acorralado/Venganza)');
      if (!r.eventos.some((ev) => ev.clave === 'combate.quepague_desvia')) falla('¡Que pague otro!: falta el aviso del desvío');
    }
    const destinos = new Set();
    for (let semilla = 1; semilla <= 60; semilla++) {
      const e = M.crearCombate(equipo(['ego-ego', 'tocinon', 'tocinon', 'cajonazo']), semilla);
      const r = M.resolverTurno(e, [ataca(3), ataca(0, 0), ataca(0, 0), ataca(2)]);
      for (const ev of usas(r)) {
        if (ev.j !== 1 && ev.j !== 2) continue;
        if (ev.obj.length !== 1 || ev.obj[0] === 0 || ev.obj[0] === ev.j) falla(`¡Que pague otro! (4 jugadores): ${ev.j} pega a ${ev.obj}`);
        destinos.add(`${ev.j}>${ev.obj[0]}`);
      }
    }
    if (destinos.size < 3) falla(`¡Que pague otro!: el desvío no es al azar (${[...destinos]})`);
    const e = M.crearCombate(equipo(['p', 'tocinon', 'cajonazo']), 3);
    const todos = M.resolverTurno(e, [ataca(2), ataca(2), ataca(2)]); // Temblor (todos) del Tocinón: sí le da
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
    const nadie = M.resolverTurno(M.crearCombate(equipo(['evoscar', 'cajonazo']), 8), [ataca(1), ataca(2)]); // Cajonazo no ataca: se protege
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
  const PASIVO = { cajonazo: 2, kbronero: 3, draguserin: 3, pantaloneto: 0, p: 2 };
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

// ---- Objetos de la barra (docs/POKEUSERA.md, «La barra»): one deterministic case per object, the offers, the hiding, and that a battle without
// objects is the same as before. Two players of Fran and Pablo (no perk bends hits); `objetos` per seat: [slot of the 3 useritos].
function revisarObjetos() {
  const mk = (a, b, oa = [], ob = [], semilla = 1, esc) =>
    M.crearCombate(
      [
        { entrenador: 'fran', nombre: 'A', bot: false, especies: a, objetos: oa },
        { entrenador: 'pablo', nombre: 'B', bot: false, especies: b, objetos: ob },
      ],
      semilla,
      esc,
    );
  const ataca = (mov, objetivo = 0) => ({ tipo: 'atacar', mov, objetivo });
  const movIdx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const objs = (r, clave) => r.eventos.filter((ev) => ev.k === 'objeto' && (!clave || ev.clave === clave));
  const danoA = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave).reduce((n, ev) => n + ev.dano, 0);
  const rellena = (obj) => [obj, null, null];
  const lleno = (e, j = 0) => (e.jugadores[j].equipo[0].ps = e.jugadores[j].equipo[0].psMax);

  // --- Data and texts.
  if (M.OBJETOS.length !== 10 || new Set(M.OBJETOS).size !== 10) falla('objetos: tienen que ser 10 distintos');
  for (const id of M.OBJETOS) {
    for (const k of id === 'tapon' ? ['nombre', 'desc', 'activa', 'activa2'] : ['nombre', 'desc', 'activa']) if (!textos.has(`objeto.${id}.${k}`)) falla(`falta el texto objeto.${id}.${k}`);
    if (typeof M.OBJETO_PERMANENTE[id] !== 'boolean') falla(`${id}: sin OBJETO_PERMANENTE`);
  }
  for (const k of ['mechero.falla']) if (!textos.has(`objeto.${k}`)) falla(`falta el texto objeto.${k}`);
  for (const k of ['unico', 'perm', 'gastado']) if (!textos.has(`objeto.${k}`)) falla(`falta el texto objeto.${k}`);
  if (M.OBJETOS.filter((o) => M.OBJETO_PERMANENTE[o]).sort().join() !== 'gafas,palillo,panuelo,zapatillas') falla('permanentes: palillo, gafas, zapatillas, pañuelo');

  // --- The offers: three different ones, the same for the same seed and seat, another for another seat/seed.
  {
    let distintasSeat = 0;
    let distintasSemilla = 0;
    for (let sem = 1; sem <= 200; sem++) {
      for (let seat = 0; seat < 4; seat++) {
        const of = M.ofertasObjetos(sem, seat);
        if (of.length !== 3 || new Set(of).size !== 3 || of.some((o) => !M.OBJETOS.includes(o))) falla(`ofertas ${sem}/${seat}: ${of}`);
        if (M.ofertasObjetos(sem, seat).join() !== of.join()) falla('ofertas: no son deterministas');
      }
      if (M.ofertasObjetos(sem, 0).join() !== M.ofertasObjetos(sem, 1).join()) distintasSeat++;
      if (M.ofertasObjetos(sem, 0).join() !== M.ofertasObjetos(sem + 1, 0).join()) distintasSemilla++;
    }
    if (distintasSeat < 150 || distintasSemilla < 150) falla(`ofertas: poca variedad (${distintasSeat}, ${distintasSemilla} de 200)`);
    const vistos = new Set();
    for (let sem = 1; sem <= 300; sem++) M.ofertasObjetos(sem, 0).forEach((o) => vistos.add(o));
    if (vistos.size !== 10) falla('ofertas: no salen los 10 objetos');
    const of = M.ofertasObjetos(7, 0);
    if (!M.eleccionObjetoValida({ objeto: of[1], idx: 2 }, of) || M.eleccionObjetoValida({ objeto: of[1], idx: 3 }, of) || M.eleccionObjetoValida({ objeto: M.OBJETOS.find((o) => !of.includes(o)), idx: 0 }, of) || M.eleccionObjetoValida(null, of))
      falla('eleccionObjetoValida');
    // The machine's choice is one of the offers, with a valid userito, whatever the team.
    for (let sem = 1; sem <= 100; sem++) {
      const rnd = M.crearRnd(sem);
      const esp = [0, 1, 2].map(() => M.ESPECIES[Math.floor(rnd() * 24)].id);
      const of2 = M.ofertasObjetos(sem, sem % 4);
      if (!M.eleccionObjetoValida(M.objetoBot(esp, of2, rnd), of2)) falla('objetoBot devuelve algo fuera de las ofertas');
    }
  }

  // --- A battle without objects is the same as before (no random number is drawn for them).
  {
    const a = mk(['aceituna', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon'], [], [], 11);
    const b = mk(['aceituna', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon'], [null, null, null], [null, null, null], 11);
    if (JSON.stringify(a) !== JSON.stringify(b)) falla('objetos nulos cambian el estado inicial');
    const ra = M.resolverTurno(a, [ataca(0), ataca(0)]);
    const rb = M.resolverTurno(b, [ataca(0), ataca(0)]);
    if (JSON.stringify(ra) !== JSON.stringify(rb)) falla('sin objetos la batalla cambia');
    if (ra.eventos.some((ev) => ev.k === 'objeto')) falla('evento de objeto sin objetos');
  }

  // --- Mechero: the first rival that hits the holder gets burnt half of the time; once.
  {
    let quemados = 0;
    let intentos = 0;
    for (let sem = 1; sem <= 80; sem++) {
      const e = mk(['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'cierzon'], rellena('mechero'), [], sem);
      const r = M.resolverTurno(e, [{ tipo: 'cana' }, ataca(movIdx('aceituna', 'mecuelo'))]);
      const ev = objs(r);
      const golpe = r.eventos.some((x) => x.k === 'golpe' && x.j === 0 && !x.fin);
      if (!golpe) {
        if (ev.length) falla('mechero: se activa sin golpe');
        continue;
      }
      intentos++;
      if (ev.length !== 1 || !['objeto.mechero.activa', 'objeto.mechero.falla'].includes(ev[0].clave) || ev[0].j !== 0) falla(`mechero: eventos ${JSON.stringify(ev)}`);
      const o = r.estado.jugadores[0].equipo[0].objeto;
      if (!o?.gastado || !o.visto) falla('mechero: no queda gastado y visto');
      const quema = ev[0].clave === 'objeto.mechero.activa';
      if (quema !== (r.estado.jugadores[1].equipo[0].estado === 'quemado')) falla('mechero: el evento y el estado no coinciden');
      if (quema) quemados++;
      if (ev[0].vars.otro !== 'Aceituna') falla('mechero: falta {otro}');
      const r2 = M.resolverTurno(r.estado, [{ tipo: 'cana' }, ataca(movIdx('aceituna', 'mecuelo'))]);
      if (objs(r2).length) falla('mechero: se usa dos veces');
    }
    if (quemados < intentos * 0.3 || quemados > intentos * 0.7) falla(`mechero: quema ${quemados} de ${intentos} (esperaba la mitad)`);
  }

  // --- Chicle de menta: the first status goes away at once; the second one stays.
  {
    let vistas = 0;
    let segunda = 0;
    for (let sem = 1; sem <= 80; sem++) {
      const e = mk(['tocinon', 'turito', 'cierzon'], ['criaturitah', 'turito', 'cierzon'], rellena('chicle'), [], sem);
      const sin = mk(['tocinon', 'turito', 'cierzon'], ['criaturitah', 'turito', 'cierzon'], [], [], sem);
      const esporas = movIdx('criaturitah', 'esporas');
      const r = M.resolverTurno(e, [{ tipo: 'cana' }, ataca(esporas)]);
      const rs = M.resolverTurno(sin, [{ tipo: 'cana' }, ataca(esporas)]);
      const dormido = rs.estado.jugadores[0].equipo[0].estado === 'dormido';
      if (dormido !== (objs(r).length === 1)) falla(`chicle (semilla ${sem}): el chicle ${objs(r).length ? 'salta' : 'no salta'} y sin él ${dormido ? 'se duerme' : 'no'}`);
      if (!dormido) continue;
      vistas++;
      const evs = r.eventos;
      const iEst = evs.findIndex((x) => x.k === 'estado' && x.j === 0 && x.estado === 'dormido');
      const iObj = evs.findIndex((x) => x.k === 'objeto');
      const iFin = evs.findIndex((x) => x.k === 'estado' && x.j === 0 && x.estado === null && x.de === 'dormido');
      if (!(iEst >= 0 && iEst < iObj && iObj < iFin)) falla('chicle: orden estado → objeto → estado quitado');
      const u = r.estado.jugadores[0].equipo[0];
      if (u.estado !== null || u.sueno !== 0 || !u.objeto.gastado) falla('chicle: sigue dormido o sin gastar');
      // The second time it falls asleep for real (the gum is gone: no more messages).
      let e2 = r.estado;
      for (let k = 0; k < 8 && !e2.jugadores[0].equipo[0].estado; k++) {
        const r2 = M.resolverTurno(e2, [{ tipo: 'cana' }, ataca(esporas)]);
        if (objs(r2).length) falla('chicle: salta una segunda vez');
        e2 = r2.estado;
      }
      if (e2.jugadores[0].equipo[0].estado === 'dormido') segunda++;
    }
    if (vistas < 10) falla(`chicle: solo ${vistas} casos con sueño`);
    if (segunda < vistas * 0.7) falla(`chicle: el segundo sueño solo llega en ${segunda} de ${vistas}`);
    // Also an achispado is cleaned (Dolor de cabeza, 100 %).
    let achis = 0;
    for (let sem = 1; sem <= 60 && !achis; sem++) {
      const e = mk(['tocinon', 'turito', 'cierzon'], ['resacon', 'turito', 'cierzon'], rellena('chicle'), [], sem);
      const r = M.resolverTurno(e, [{ tipo: 'cana' }, ataca(movIdx('resacon', 'dolor'))]);
      if (objs(r).length) {
        achis++;
        if (r.estado.jugadores[0].equipo[0].achispado !== 0) falla('chicle: sigue achispado');
      }
    }
    if (!achis) falla('chicle: Dolor de cabeza nunca llegó a achispar');
  }

  // --- Bocata de calamares: under half of its HP it eats and heals 1/5 of the maximum; once.
  {
    let casos = 0;
    for (let sem = 1; sem <= 60; sem++) {
      const e = mk(['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'cierzon'], rellena('bocata'), [], sem);
      const u0 = e.jugadores[0].equipo[0];
      u0.ps = Math.floor(u0.psMax / 2) + 3;
      const r = M.resolverTurno(e, [ataca(movIdx('tocinon', 'barrigazo') >= 0 ? movIdx('tocinon', 'barrigazo') : 0, 1), ataca(movIdx('aceituna', 'mecuelo'))]);
      const u = r.estado.jugadores[0].equipo[0];
      const golpes = r.eventos.filter((x) => x.k === 'golpe' && x.j === 0 && !x.fin);
      const ev = objs(r, 'objeto.bocata.activa');
      if (ev.length > 1) falla('bocata: se come dos');
      const ultimo = golpes[golpes.length - 1];
      if (ev.length === 0) {
        // No meal: it never went under half (or it fell).
        if (golpes.some((g) => g.ps > 0 && g.ps * 2 < u.psMax)) falla('bocata: bajó de la mitad y no se lo comió');
        continue;
      }
      casos++;
      if (!u.objeto.gastado || !u.objeto.visto) falla('bocata: no queda gastado y visto');
      const i = r.eventos.indexOf(ev[0]);
      const antes = r.eventos.slice(0, i).reverse().find((x) => x.k === 'golpe' && x.j === 0 && !x.fin);
      const c = r.eventos.slice(i).find((x) => x.k === 'cura' && x.j === 0);
      if (!antes || !c) falla('bocata: sin golpe antes o sin cura después');
      else {
        if (antes.ps * 2 >= u.psMax) falla('bocata: se come con más de la mitad');
        if (c.ps - antes.ps !== Math.floor(u.psMax / 5)) falla(`bocata: cura ${c.ps - antes.ps} y esperaba ${Math.floor(u.psMax / 5)}`);
      }
      void ultimo;
      // The second time it goes under half there is nothing left to eat.
      const e2 = structuredClone(r.estado);
      e2.jugadores[0].equipo[0].ps = Math.floor(e2.jugadores[0].equipo[0].psMax / 2) + 3;
      if (objs(M.resolverTurno(e2, [ataca(0, 1), ataca(movIdx('aceituna', 'mecuelo'))])).length) falla('bocata: se come dos veces');
    }
    if (casos < 20) falla(`bocata: solo ${casos} casos`);
  }

  // --- Posavasos: the first super-effective blow does half (exactly, same seed); the second one does not.
  {
    // Any attacker/defender pair with a certain (100 %) blow that is ×2 or more and does not knock out.
    let par = null;
    for (const a of M.ESPECIES) for (const d of M.ESPECIES) {
      if (par) break;
      const mi = a.movs.findIndex((m) => M.MOVS[m].pot !== null && M.MOVS[m].prec === 100 && M.MOVS[m].objetivo === 'uno' && M.eficacia(M.MOVS[m].tipo, d.tipos) === 2 && !M.MOVS[m].prioridad);
      if (mi >= 0 && d.id !== a.id && d.base.ps + d.base.def >= 190) par = { a: a.id, d: d.id, mi };
    }
    if (!par) falla('posavasos: no encuentro un golpe ×2 cierto');
    else {
      let medidos = 0;
      for (let sem = 1; sem <= 40; sem++) {
        const con = mk([par.d, 'turito', 'cierzon'], [par.a, 'turito', 'cierzon'], rellena('posavasos'), [], sem);
        const sin = mk([par.d, 'turito', 'cierzon'], [par.a, 'turito', 'cierzon'], [], [], sem);
        const rc = M.resolverTurno(con, [{ tipo: 'cana' }, ataca(par.mi)]);
        const rs = M.resolverTurno(sin, [{ tipo: 'cana' }, ataca(par.mi)]);
        const dc = danoA(rc, 0);
        const ds = danoA(rs, 0);
        if (!ds) continue;
        if (rs.estado.jugadores[0].equipo[0].ps <= 0) continue;
        medidos++;
        const ev = objs(rc, 'objeto.posavasos.activa');
        if (ev.length !== 1) falla(`posavasos: ${ev.length} eventos`);
        if (dc !== Math.max(1, Math.floor(ds / 2))) falla(`posavasos: con ${dc}, sin ${ds}`);
        const iObj = rc.eventos.findIndex((x) => x.k === 'objeto');
        const iGolpe = rc.eventos.findIndex((x) => x.k === 'golpe' && x.j === 0);
        if (iObj > iGolpe) falla('posavasos: el cartel va después del golpe');
        const r2 = M.resolverTurno(rc.estado, [{ tipo: 'cana' }, ataca(par.mi)]);
        if (objs(r2).length) falla('posavasos: se usa dos veces');
      }
      if (medidos < 10) falla(`posavasos: solo ${medidos} casos`);
    }
  }

  // --- Tapón de cava: the first TWO damaging attacks go quick (+1); each pops when used (the second one uses it up); Devolvérsela is not made quick.
  {
    const lento = 'tocinon';
    const rapido = 'cierzon';
    const mL = M.ESPECIE[lento].movs.findIndex((m) => M.MOVS[m].pot !== null && !M.MOVS[m].prioridad && M.MOVS[m].objetivo === 'uno');
    const mR = M.ESPECIE[rapido].movs.findIndex((m) => M.MOVS[m].pot !== null && !M.MOVS[m].prioridad && M.MOVS[m].objetivo === 'uno');
    const orden = (r) => r.eventos.filter((x) => x.k === 'usa').map((x) => x.j);
    const sinT = mk([lento, 'turito', 'aceituna'], [rapido, 'turito', 'aceituna'], [], [], 3);
    if (orden(M.resolverTurno(sinT, [ataca(mL), ataca(mR)])).join() !== '1,0') falla('tapón: sin él debería ir primero el rápido');
    const conT = mk([lento, 'turito', 'aceituna'], [rapido, 'turito', 'aceituna'], rellena('tapon'), [], 3);
    const r = M.resolverTurno(conT, [ataca(mL), ataca(mR)]);
    if (orden(r).join() !== '0,1') falla(`tapón: con él debería ir primero el lento (${orden(r)})`);
    const ev = objs(r, 'objeto.tapon.activa');
    if (ev.length !== 1) falla('tapón: falta el cartel');
    else if (r.eventos.indexOf(ev[0]) > r.eventos.findIndex((x) => x.k === 'usa' && x.j === 0)) falla('tapón: el cartel va después de «usó»');
    const t1 = r.estado.jugadores[0].equipo[0].objeto;
    if (t1.gastado || t1.usos !== 1 || !t1.visto) falla('tapón: tras el primer ataque debe quedarle uno (usos 1, sin gastar, visto)');
    // The second attack is quick as well (its own line), and then it is used up.
    const llena = (e) => {
      const c = structuredClone(e);
      c.jugadores.forEach((q) => q.equipo.forEach((u) => (u.ps = u.psMax)));
      return c;
    };
    const r2 = M.resolverTurno(llena(r.estado), [ataca(mL), ataca(mR)]);
    if (orden(r2).join() !== '0,1') falla(`tapón: el segundo ataque debería ir primero también (${orden(r2)})`);
    if (objs(r2, 'objeto.tapon.activa2').length !== 1 || objs(r2, 'objeto.tapon.activa').length) falla('tapón: el segundo corchazo lleva su propio cartel');
    const t2 = r2.estado.jugadores[0].equipo[0].objeto;
    if (!t2.gastado || t2.usos !== 2) falla('tapón: tras el segundo ataque debe estar gastado');
    // The third one is normal again.
    const r3 = M.resolverTurno(llena(r2.estado), [ataca(mL), ataca(mR)]);
    if (orden(r3).join() !== '1,0' || objs(r3).length) falla('tapón: el tercer ataque ya no es rápido');
    // Not with a move that has to go last, nor with one that does no damage (and it is not spent then).
    const evo = mk(['evoscar', 'turito', 'aceituna'], ['camioner', 'turito', 'aceituna'], rellena('tapon'), [], 3);
    const rd = M.resolverTurno(evo, [ataca(movIdx('evoscar', 'devolver')), ataca(movIdx('camioner', 'trompazo'))]);
    if (orden(rd).join() !== '1,0' || objs(rd).length || rd.estado.jugadores[0].equipo[0].objeto.gastado) falla('tapón: Devolvérsela no debe volverse rápida ni gastarlo');
    const estado = mk(['criaturitah', 'turito', 'aceituna'], [rapido, 'turito', 'aceituna'], rellena('tapon'), [], 3);
    const re = M.resolverTurno(estado, [ataca(movIdx('criaturitah', 'esporas')), ataca(mR)]);
    if (orden(re).join() !== '1,0' || objs(re).length) falla('tapón: un movimiento de estado no debe usarlo');
  }

  // --- Palillo en la boca: twice the critical hits (a superset on the same seeds), shown at the first crit, never spent.
  {
    const mi = movIdx('cierzon', 'planeo') >= 0 && M.MOVS.planeo.pot !== null ? movIdx('cierzon', 'planeo') : M.ESPECIE.cierzon.movs.findIndex((m) => M.MOVS[m].pot !== null && M.MOVS[m].prec === 100 && M.MOVS[m].objetivo === 'uno');
    let con = 0;
    let sin = 0;
    for (let sem = 1; sem <= 400; sem++) {
      const a = mk(['cierzon', 'turito', 'aceituna'], ['tocinon', 'turito', 'aceituna'], rellena('palillo'), [], sem);
      const b = mk(['cierzon', 'turito', 'aceituna'], ['tocinon', 'turito', 'aceituna'], [], [], sem);
      const ra = M.resolverTurno(a, [ataca(mi), { tipo: 'cana' }]);
      const rb = M.resolverTurno(b, [ataca(mi), { tipo: 'cana' }]);
      const ca = ra.eventos.filter((x) => x.k === 'golpe' && x.critico).length;
      const cb = rb.eventos.filter((x) => x.k === 'golpe' && x.critico).length;
      con += ca;
      sin += cb;
      if (cb > ca) falla('palillo: un crítico sin palillo deja de serlo con él');
      const ev = objs(ra);
      if (ca > 0 && (ev.length !== 1 || ev[0].clave !== 'objeto.palillo.activa')) falla('palillo: falta el cartel en el primer crítico');
      if (ca === 0 && ev.length) falla('palillo: cartel sin crítico');
      const o = ra.estado.jugadores[0].equipo[0].objeto;
      if (o.gastado) falla('palillo: es permanente');
      if (ca > 0 && !o.visto) falla('palillo: no queda visto');
      if (ca === 0 && o.visto) falla('palillo: visto sin haber hecho nada');
    }
    if (!(con > sin * 1.5)) falla(`palillo: ${con} críticos con él y ${sin} sin él (esperaba el doble)`);
  }

  // --- Gafas de sol: +10 accuracy on damaging moves (a superset of hits on the same seeds); it shows itself only when it changes the odds.
  {
    let par = null;
    for (const a of M.ESPECIES) {
      const mi = a.movs.findIndex((m) => M.MOVS[m].pot !== null && M.MOVS[m].prec !== null && M.MOVS[m].prec <= 90 && M.MOVS[m].objetivo === 'uno' && !M.MOVS[m].prioridad);
      if (mi >= 0 && !par) par = { a: a.id, mi };
    }
    if (!par) falla('gafas: no encuentro un golpe de precisión ≤ 90');
    else {
      let mas = 0;
      let carteles = 0;
      for (let sem = 1; sem <= 300; sem++) {
        const a = mk([par.a, 'turito', 'aceituna'], ['tocinon', 'turito', 'aceituna'], rellena('gafas'), [], sem);
        const b = mk([par.a, 'turito', 'aceituna'], ['tocinon', 'turito', 'aceituna'], [], [], sem);
        const ra = M.resolverTurno(a, [ataca(par.mi), { tipo: 'cana' }]);
        const rb = M.resolverTurno(b, [ataca(par.mi), { tipo: 'cana' }]);
        const ha = ra.eventos.some((x) => x.k === 'golpe' && x.j === 1 && !x.fin);
        const hb = rb.eventos.some((x) => x.k === 'golpe' && x.j === 1 && !x.fin);
        if (hb && !ha) falla('gafas: acierta sin ellas y falla con ellas');
        if (ha && !hb) mas++;
        const ev = objs(ra);
        if (ev.length > 1) falla('gafas: dos carteles');
        if (ev.length) {
          carteles++;
          if (!(ha && !hb)) falla('gafas: cartel sin cambiar el resultado');
        }
        if (ra.estado.jugadores[0].equipo[0].objeto.gastado) falla('gafas: es permanente');
      }
      if (!mas || mas !== carteles) falla(`gafas: aciertan de más ${mas} veces y salen ${carteles} carteles`);
    }
  }

  // --- Zapatillas nuevas: +1 Speed at the start of the battle and every time it comes out; a message each time; permanent.
  {
    const e = mk(['aceituna', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon'], rellena('zapatillas'), [], 5);
    const r = M.resolverTurno(e, [ataca(movIdx('aceituna', 'mecuelo')), { tipo: 'cana' }]);
    const ev = objs(r, 'objeto.zapatillas.activa');
    if (ev.length !== 1 || ev[0].j !== 0) falla('zapatillas: falta el cartel al empezar');
    if (r.estado.jugadores[0].equipo[0].niveles.vel !== 1) falla('zapatillas: no sube la Velocidad');
    if (r.estado.jugadores[0].equipo[0].niveles.ata !== 1) falla('zapatillas: la primera vez que sale también sube el Ataque');
    if (!r.eventos.some((ev) => ev.k === 'nivel' && ev.j === 0 && ev.stat === 'ata' && ev.cambio === 1)) falla('zapatillas: falta el evento de nivel del Ataque');
    if (r.estado.jugadores[0].equipo[0].objeto.gastado) falla('zapatillas: es permanente');
    const r2 = M.resolverTurno(r.estado, [ataca(movIdx('aceituna', 'mecuelo')), { tipo: 'cana' }]);
    if (objs(r2).length) falla('zapatillas: se repite sin cambiar');
    // On the bench: it works when it comes out (not before).
    const b = mk(['turito', 'aceituna', 'cierzon'], ['tocinon', 'turito', 'cierzon'], [null, 'zapatillas', null], [], 5);
    const rb = M.resolverTurno(b, [{ tipo: 'cambiar', a: 1 }, { tipo: 'cana' }]);
    const evb = objs(rb, 'objeto.zapatillas.activa');
    const iSale = rb.eventos.findIndex((x) => x.k === 'sale' && x.j === 0);
    if (evb.length !== 1 || rb.eventos.indexOf(evb[0]) < iSale) falla('zapatillas: al salir del banquillo, el cartel va después de «sale»');
    if (rb.estado.jugadores[0].equipo[1].niveles.vel !== 1) falla('zapatillas: al salir no sube la Velocidad');
    if (rb.estado.jugadores[0].equipo[1].niveles.ata !== 1) falla('zapatillas: al salir por primera vez no sube el Ataque');
    // Out and in again: only the Speed (the Attack was the first time), with its message.
    const rb2 = M.resolverTurno(rb.estado, [{ tipo: 'cambiar', a: 0 }, { tipo: 'cana' }]);
    const rb3 = M.resolverTurno(rb2.estado, [{ tipo: 'cambiar', a: 1 }, { tipo: 'cana' }]);
    const u3 = rb3.estado.jugadores[0].equipo[1];
    if (u3.niveles.vel !== 1 || u3.niveles.ata !== 0 || objs(rb3, 'objeto.zapatillas.activa').length !== 1) falla(`zapatillas: la segunda vez solo Velocidad (vel ${u3.niveles.vel}, ata ${u3.niveles.ata})`);
    // It was not drawn at the start for a bench userito.
    if (objs(M.resolverTurno(b, [ataca(0), { tipo: 'cana' }])).length) falla('zapatillas: se activa desde el banquillo');
  }

  // --- Pañuelo de la peña: ×1.2 on attacks of its own type (same seed → about 1.2 times the damage); nothing on other types.
  {
    const a = M.ESPECIES.find((sp) => sp.movs.some((m) => M.MOVS[m].pot !== null && M.MOVS[m].prec === 100 && sp.tipos.includes(M.MOVS[m].tipo) && M.MOVS[m].objetivo === 'uno' && !M.MOVS[m].prioridad));
    const mi = a.movs.findIndex((m) => M.MOVS[m].pot !== null && M.MOVS[m].prec === 100 && a.tipos.includes(M.MOVS[m].tipo) && M.MOVS[m].objetivo === 'uno' && !M.MOVS[m].prioridad);
    const fuera = a.movs.findIndex((m) => M.MOVS[m].pot !== null && !a.tipos.includes(M.MOVS[m].tipo) && M.MOVS[m].objetivo === 'uno' && M.MOVS[m].prec === 100);
    let medidos = 0;
    for (let sem = 1; sem <= 30; sem++) {
      const con = mk([a.id, 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon'], rellena('panuelo'), [], sem);
      const sin = mk([a.id, 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon'], [], [], sem);
      const rc = M.resolverTurno(con, [ataca(mi), { tipo: 'cana' }]);
      const rs = M.resolverTurno(sin, [ataca(mi), { tipo: 'cana' }]);
      const dc = danoA(rc, 1);
      const ds = danoA(rs, 1);
      if (!ds || rs.estado.jugadores[1].equipo[0].ps <= 0) continue;
      medidos++;
      if (ds >= 25 && (dc / ds < 1.12 || dc / ds > 1.28)) falla(`pañuelo: ${dc} con él y ${ds} sin él`);
      if (dc < ds) falla('pañuelo: pega menos con él');
      const ev = objs(rc);
      if (ev.length !== 1 || ev[0].clave !== 'objeto.panuelo.activa') falla('pañuelo: falta el cartel');
      if (rc.estado.jugadores[0].equipo[0].objeto.gastado) falla('pañuelo: es permanente');
      if (fuera >= 0) {
        const rf = M.resolverTurno(con, [ataca(fuera), { tipo: 'cana' }]);
        const rfs = M.resolverTurno(sin, [ataca(fuera), { tipo: 'cana' }]);
        if (danoA(rf, 1) !== danoA(rfs, 1) || objs(rf).length) falla('pañuelo: afecta a un ataque de otro tipo');
      }
    }
    if (medidos < 10) falla(`pañuelo: solo ${medidos} casos`);
  }

  // --- Llavero de la caravana: when it falls, the one that knocked it out loses 1 Attack and 1 Special; not for a fall without a culprit.
  {
    let casos = 0;
    for (let sem = 1; sem <= 30; sem++) {
      const e = mk(['turito', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [], sem);
      e.jugadores[0].equipo[0].ps = 1;
      const r = M.resolverTurno(e, [{ tipo: 'cana' }, ataca(movIdx('camioner', 'trompazo'))]);
      const cae = r.eventos.findIndex((x) => x.k === 'cae' && x.j === 0);
      if (cae < 0) continue; // the caña healed it first, or the blow missed
      casos++;
      const ev = objs(r, 'objeto.llavero.activa');
      if (ev.length !== 1 || r.eventos.indexOf(ev[0]) < cae) falla('llavero: falta el cartel después de «cae»');
      const n = r.estado.jugadores[1].equipo[0].niveles;
      if (n.ata !== -1 || n.esp !== -1) falla(`llavero: el culpable queda con Ata ${n.ata}, Esp ${n.esp}`);
      if (ev[0].vars.otro !== 'Camioner') falla('llavero: falta {otro}');
    }
    if (!casos) falla('llavero: no cae nunca');
    // Dying of a burn (nobody to blame): nothing happens.
    const e = mk(['turito', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [], 4);
    e.jugadores[0].equipo[0].ps = 1;
    e.jugadores[0].equipo[0].estado = 'quemado';
    const r = M.resolverTurno(e, [ataca(0), { tipo: 'cana' }]);
    if (!r.eventos.some((x) => x.k === 'cae' && x.j === 0)) falla('llavero: el quemado no cae');
    else if (objs(r).length || r.estado.jugadores[1].equipo[0].niveles.ata !== 0) falla('llavero: castiga una caída sin culpable');
  }

  // --- Hiding: nobody but the owner sees an object that has not worked.
  {
    const e = mk(['turito', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [null, 'mechero', null], 9);
    const v0 = M.ocultarObjetos(e, 0);
    const v1 = M.ocultarObjetos(e, 1);
    const v9 = M.ocultarObjetos(e, null);
    if (v0.jugadores[0].equipo[0].objeto?.id !== 'llavero' || v0.jugadores[1].equipo[1].objeto) falla('ocultarObjetos(0): tiene que ver el suyo y no el del rival');
    if (v1.jugadores[1].equipo[1].objeto?.id !== 'mechero' || v1.jugadores[0].equipo[0].objeto) falla('ocultarObjetos(1)');
    if (v9.jugadores.some((q) => q.equipo.some((u) => u.objeto))) falla('ocultarObjetos(null): un espectador no ve ninguno');
    if (JSON.stringify(v0).includes('mechero') || JSON.stringify(v1).includes('llavero')) falla('ocultarObjetos: el objeto sigue en el JSON que viaja');
    if (!e.jugadores[1].equipo[1].objeto || JSON.stringify(e) !== JSON.stringify(mk(['turito', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [null, 'mechero', null], 9))) falla('ocultarObjetos cambia el estado original');
    // Once it has worked, everybody sees it.
    e.jugadores[1].equipo[1].objeto.visto = true;
    if (M.ocultarObjetos(e, 0).jugadores[1].equipo[1].objeto?.id !== 'mechero') falla('ocultarObjetos: un objeto visto debe verse');
    const sin = mk(['turito', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], [], [], 9);
    if (M.ocultarObjetos(sin, 0) !== sin) falla('ocultarObjetos: sin objetos debe devolver el mismo estado');
  }

  // --- Determinism with objects, and every object event is about the object that userito carries.
  {
    for (let sem = 1; sem <= 25; sem++) {
      const a = batallaAlAzar(sem);
      const b = batallaAlAzar(sem);
      if (JSON.stringify(a.e) !== JSON.stringify(b.e)) falla(`batalla con objetos no determinista (semilla ${sem})`);
      if (!a.acabo) falla(`semilla ${sem}: no acaba con objetos`);
    }
  }
}
// ---- the bench keeps living (docs/POKEUSERA.md, «Estados en el banquillo») and the opening userito (`inicial`, «¿Quién sale primero?»).
// Deterministic cases: sleep and drunkenness count down for the useritos that are standing but out of the fight at the end of every
// turn; burn and indigestion do not hurt there; whoever was on the field during the turn (even if it switched out) or is on it now
// (even if it came in) is not «bench» that turn; no random numbers are used.
function revisarBanquillo() {
  const mk = (a, b, semilla = 3) =>
    M.crearCombate(
      [
        { entrenador: 'fran', nombre: 'A', bot: false, especies: a },
        { entrenador: 'pablo', nombre: 'B', bot: false, especies: b },
      ],
      semilla,
    );
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const cana = { tipo: 'cana' };
  const movIdx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const despiertas = (r) => r.eventos.filter((ev) => ev.k === 'texto' && ev.clave === 'combate.despierta_banco');
  const dormir = (u, n) => {
    u.estado = 'dormido';
    u.sueno = n;
  };
  if (!textos.has('combate.despierta_banco')) falla('falta el texto combate.despierta_banco');
  // A rival that does nothing (the caña, then a harmless move) so the team under test is never in danger.
  const quieto = movIdx('turito', 'bostezo');

  // The sleeper on the bench counts down one per turn and wakes up when it reaches 0, with one short line.
  {
    const e = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e.jugadores[0].equipo[1], 2);
    const r1 = M.resolverTurno(e, [cana, cana]);
    const u1 = r1.estado.jugadores[0].equipo[1];
    if (u1.estado !== 'dormido' || u1.sueno !== 1) falla(`banquillo: tras 1 turno debería seguir dormido con sueno 1 (estado ${u1.estado}, sueno ${u1.sueno})`);
    if (despiertas(r1).length) falla('banquillo: se despierta antes de tiempo');
    const r2 = M.resolverTurno(r1.estado, [cana, cana]);
    const u2 = r2.estado.jugadores[0].equipo[1];
    if (u2.estado !== null || u2.sueno !== 0) falla(`banquillo: tras 2 turnos debería estar despierto (estado ${u2.estado}, sueno ${u2.sueno})`);
    const d = despiertas(r2);
    if (d.length !== 1 || d[0].vars?.quien !== 'Aceituna' || !d[0].fin) falla('banquillo: falta la línea «se ha despertado en el banquillo» (una, al final del turno)');
    else if (!decir(d[0]).includes('Aceituna') || !decir(d[0]).includes('banquillo')) falla(`banquillo: texto raro «${decir(d[0])}»`);
    const r3 = M.resolverTurno(r2.estado, [cana, cana]);
    if (despiertas(r3).length) falla('banquillo: se despierta dos veces');
    // A sleeper at 0 (it was counted down while it fought) wakes at the end of the first turn on the bench.
    const e0 = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e0.jugadores[0].equipo[2], 0);
    if (M.resolverTurno(e0, [cana, cana]).estado.jugadores[0].equipo[2].estado !== null) falla('banquillo: dormido con sueno 0 debería despertar');
  }

  // The userito on the field is not counted as bench: its sleep goes down only when it tries to act (one per turn).
  {
    const e = mk(['aceituna', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e.jugadores[0].equipo[0], 2);
    const r = M.resolverTurno(e, [ataca(0), cana]);
    const u = r.estado.jugadores[0].equipo[0];
    if (u.sueno !== 1 || u.estado !== 'dormido') falla(`banquillo: el activo cuenta doble (sueno ${u.sueno}, esperaba 1)`);
    if (despiertas(r).length) falla('banquillo: línea de banquillo para el activo');
  }

  // Switched OUT this turn: it was on the field at the start, so it is not counted yet; the next turn it is.
  {
    const e = mk(['aceituna', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e.jugadores[0].equipo[0], 2);
    const r1 = M.resolverTurno(e, [{ tipo: 'cambiar', a: 1 }, cana]);
    if (r1.estado.jugadores[0].activo !== 1) falla('banquillo: el cambio no se hizo');
    const u1 = r1.estado.jugadores[0].equipo[0];
    if (u1.sueno !== 2 || u1.estado !== 'dormido') falla(`banquillo: el que sale ese turno no debería contar (sueno ${u1.sueno}, esperaba 2)`);
    const r2 = M.resolverTurno(r1.estado, [ataca(quieto), cana]);
    if (r2.estado.jugadores[0].equipo[0].sueno !== 1) falla('banquillo: al turno siguiente ya en el banquillo debería bajar a 1');
  }

  // Switched IN this turn: it is on the field now, so it is not counted; it keeps its sleep until it tries to act.
  {
    const e = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e.jugadores[0].equipo[1], 2);
    const r1 = M.resolverTurno(e, [{ tipo: 'cambiar', a: 1 }, cana]);
    const u1 = r1.estado.jugadores[0].equipo[1];
    if (u1.sueno !== 2 || u1.estado !== 'dormido' || despiertas(r1).length) falla(`banquillo: el que entra ese turno no debería contar (sueno ${u1.sueno}, esperaba 2)`);
    // And the one that was at 1: it does not wake up on the bench in the very turn it comes in.
    const e1 = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    dormir(e1.jugadores[0].equipo[1], 1);
    const q = M.resolverTurno(e1, [{ tipo: 'cambiar', a: 1 }, cana]);
    if (q.estado.jugadores[0].equipo[1].estado !== 'dormido' || despiertas(q).length) falla('banquillo: el que entra con sueno 1 no debería despertarse en el banquillo ese turno');
  }

  // Burn and indigestion do not hurt on the bench, and paralysis stays; only sleep and drunkenness have a timer there.
  {
    const e = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    e.jugadores[0].equipo[1].estado = 'quemado';
    e.jugadores[0].equipo[2].estado = 'empachado';
    const ps = [e.jugadores[0].equipo[1].ps, e.jugadores[0].equipo[2].ps];
    let r = { estado: e, eventos: [] };
    for (let i = 0; i < 3; i++) r = M.resolverTurno(r.estado, [cana, cana]);
    const q = r.estado.jugadores[0];
    if (q.equipo[1].ps !== ps[0] || q.equipo[2].ps !== ps[1]) falla('banquillo: el quemado o el empachado pierden PS en el banquillo');
    if (q.equipo[1].estado !== 'quemado' || q.equipo[2].estado !== 'empachado') falla('banquillo: quemado o empachado desaparecen solos');
    const e2 = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    e2.jugadores[0].equipo[1].estado = 'paralizado';
    if (M.resolverTurno(e2, [cana, cana]).estado.jugadores[0].equipo[1].estado !== 'paralizado') falla('banquillo: el paralizado se cura solo');
  }

  // Drunkenness counts down on the bench too and is gone at 0 (silently). (The engine clears it when a userito switches out, so this
  // is set by hand: it guards the rule if the volatile reset ever changes.)
  {
    const e = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    e.jugadores[0].equipo[1].achispado = 2;
    const r1 = M.resolverTurno(e, [cana, cana]);
    if (r1.estado.jugadores[0].equipo[1].achispado !== 1) falla('banquillo: el achispado no baja');
    const r2 = M.resolverTurno(r1.estado, [cana, cana]);
    if (r2.estado.jugadores[0].equipo[1].achispado !== 0 || r2.eventos.some((ev) => ev.clave === 'combate.sobrio')) falla('banquillo: el achispado se pasa en silencio al llegar a 0');
    // The active one drunk: untouched here (it counts when it attacks).
    const e2 = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    e2.jugadores[0].equipo[0].achispado = 3;
    if (M.resolverTurno(e2, [cana, cana]).estado.jugadores[0].equipo[0].achispado !== 3) falla('banquillo: el achispado del activo baja sin atacar');
  }

  // A fainted userito and an eliminated player are left alone; the fallen one keeps no state.
  {
    const e = mk(['turito', 'aceituna', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
    const caido = e.jugadores[0].equipo[2];
    caido.ps = 0;
    caido.estado = 'dormido';
    caido.sueno = 2;
    const r = M.resolverTurno(e, [cana, cana]);
    if (r.estado.jugadores[0].equipo[2].sueno !== 2 || despiertas(r).length) falla('banquillo: cuenta un userito caído');
  }

  // It uses no random numbers: the same battle with and without a sleeper on the bench rolls the same dice (same events, apart from the wake-up line).
  {
    for (const sem of [3, 8, 21]) {
      const a = mk(['cajonazo', 'aceituna', 'cierzon'], ['camioner', 'tocinon', 'cierzon'], sem);
      const b = mk(['cajonazo', 'aceituna', 'cierzon'], ['camioner', 'tocinon', 'cierzon'], sem);
      dormir(b.jugadores[0].equipo[1], 1);
      let ra = a;
      let rb = b;
      for (let i = 0; i < 4; i++) {
        const x = M.resolverTurno(ra, [ataca(0), ataca(0, 0)]);
        const y = M.resolverTurno(rb, [ataca(0), ataca(0, 0)]);
        ra = x.estado;
        rb = y.estado;
        const sinLinea = (ev) => ev.filter((v) => v.clave !== 'combate.despierta_banco');
        if (JSON.stringify(sinLinea(x.eventos)) !== JSON.stringify(sinLinea(y.eventos))) falla(`banquillo (semilla ${sem}, turno ${i + 1}): gasta números aleatorios`);
        if (ra.jugadores[0].equipo[0].ps <= 0 || ra.jugadores[1].equipo[0].ps <= 0) break;
      }
    }
  }
}

// ---- tanda 7: «Recién despierto», Al tendedero (Pantaloneto) y Remate por bulerías (Cajonazo).
function revisarTanda7() {
  const mk = (a, b, semilla = 3, extra = {}) =>
    M.crearCombate(
      [
        { entrenador: 'fran', nombre: 'A', bot: false, especies: a, ...extra.a },
        { entrenador: 'pablo', nombre: 'B', bot: false, especies: b, ...extra.b },
      ],
      semilla,
    );
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const cana = { tipo: 'cana' };
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const textosVistos = (r, clave) => r.eventos.filter((ev) => ev.clave === clave);
  const activo0 = (e, j = 0) => e.jugadores[j].equipo[e.jugadores[j].activo];
  const dano = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave).reduce((n, ev) => n + ev.dano, 0);
  for (const k of ['combate.recien', 'combate.tendedero_vuelve', 'ficha.recien']) if (!textos.has(k)) falla(`falta el texto ${k}`);

  // --- Data: the two new moves, who carries them and that the old ones stay in MOVS.
  {
    const T = M.MOVS.tendedero;
    const R = M.MOVS.remate;
    if (!T || T.tipo !== 'ventolera' || T.pot !== 80 || T.prec !== 100 || T.pp !== 8 || T.objetivo !== 'uno' || T.prioridad) falla('Al tendedero: Ventolera, 80, 100, 8 PP, a uno, sin prioridad');
    if (!R || R.tipo !== 'juerga' || R.prec !== 100 || R.pp !== 5 || R.objetivo !== 'uno' || R.prioridad) falla('Remate por bulerías: Juerga, precisión 100, 5 PP, a uno, sin prioridad');
    if (M.ESPECIE.pantaloneto.movs.join() !== 'pantalones,tendedero,chapa,mecuelo') falla(`Pantaloneto: ${M.ESPECIE.pantaloneto.movs}`);
    if (M.ESPECIE.cajonazo.movs.join() !== 'remate,taconeo,aguantar,temblor') falla(`Cajonazo: ${M.ESPECIE.cajonazo.movs}`);
    if (!M.MOVS.cierzo || !M.MOVS.rumba || !textos.has('mov.cierzo.desc') || !textos.has('mov.rumba.desc')) falla('Cierzo y Rumba se quedan en MOVS con su texto');
    for (const sp of M.ESPECIES) {
      const suma = sp.base.ps + sp.base.ata + sp.base.def + sp.base.vel + sp.base.esp;
      if (suma !== 420) falla(`${sp.id} suma ${suma} (todos 420)`);
    }
  }

  // --- Recién despierto: 2 turns without being put to sleep again after waking up (in the field, on the bench, or by the Chicle).
  {
    const esporas = idx('criaturitah', 'esporas');
    // The rival never misses: its accuracy is at +6.
    const seguro = (e, j) => (activo0(e, j).niveles.prec = 6);
    const dormido = (e) => activo0(e).estado === 'dormido';
    // (a) Wakes up on the field in turn 1 (sleep 0), then is hit by Esporas in the same turn: «recién» in turns 1, 2, 3; asleep again in turn 4.
    {
      let e = mk(['cierzon', 'turito', 'tocinon'], ['criaturitah', 'turito', 'tocinon']);
      activo0(e).estado = 'dormido';
      activo0(e).sueno = 0;
      seguro(e, 1);
      activo0(e, 1).ps = activo0(e, 1).psMax = 5000; // the rival must live through the four turns
      const trazas = [];
      for (let turno = 1; turno <= 4; turno++) {
        const r = M.resolverTurno(e, [ataca(idx('cierzon', 'planeo')), ataca(esporas, 0)]);
        e = r.estado;
        trazas.push({ recien: textosVistos(r, 'combate.recien').length, dormido: dormido(e) });
        if (turno === 1 && (!r.eventos.some((ev) => ev.k === 'estado' && ev.j === 0 && ev.estado === null && ev.de === 'dormido') || activo0(e).sinSuenoHasta !== 3)) falla(`recién despierto: al despertar debe quedar protegido hasta el turno 3 (${activo0(e).sinSuenoHasta})`);
        if (e.ganador !== null) break;
      }
      const resumen = trazas.map((x) => `${x.recien}${x.dormido ? 'D' : '-'}`).join(' ');
      if (resumen !== '1- 1- 1- 0D') falla(`recién despierto en el campo: esperaba «1- 1- 1- 0D» y salió «${resumen}»`);
      const ev = textosVistos(M.resolverTurno(mk(['cierzon', 'turito', 'tocinon'], ['criaturitah', 'turito', 'tocinon']), [ataca(0), ataca(esporas, 0)]), 'combate.recien');
      if (ev.length) falla('recién despierto: sin haber dormido, Esporas no debe decir nada de eso');
    }
    // (b) Wakes up on the bench at the end of turn 1: it comes out in turn 2 and is protected in turns 2 and 3 (not in 4).
    {
      let e = mk(['turito', 'aceituna', 'cierzon'], ['criaturitah', 'turito', 'tocinon']);
      e.jugadores[0].equipo[1].estado = 'dormido';
      e.jugadores[0].equipo[1].sueno = 1;
      seguro(e, 1);
      const r1 = M.resolverTurno(e, [cana, ataca(idx('criaturitah', 'monada'), 0)]);
      e = r1.estado;
      if (e.jugadores[0].equipo[1].estado !== null || e.jugadores[0].equipo[1].sinSuenoHasta !== 3) falla(`recién despierto en el banquillo: sinSuenoHasta ${e.jugadores[0].equipo[1].sinSuenoHasta}`);
      const trazas = [];
      for (let turno = 2; turno <= 4; turno++) {
        const r = M.resolverTurno(e, [turno === 2 ? { tipo: 'cambiar', a: 1 } : cana, ataca(esporas, 0)]);
        e = r.estado;
        trazas.push(`${textosVistos(r, 'combate.recien').length}${dormido(e) ? 'D' : '-'}`);
      }
      if (trazas.join(' ') !== '1- 1- 0D') falla(`recién despierto del banquillo: esperaba «1- 1- 0D» y salió «${trazas.join(' ')}»`);
    }
    // (c) The Chicle de menta cures the sleep: the one who wakes like that is protected as well, and the gum is not wasted on the shielded one.
    {
      let e = mk(['cierzon', 'turito', 'tocinon'], ['criaturitah', 'turito', 'tocinon'], 3, { a: { objetos: ['chicle', null, null] } });
      seguro(e, 1);
      const r1 = M.resolverTurno(e, [cana, ataca(esporas, 0)]);
      e = r1.estado;
      if (!r1.eventos.some((ev) => ev.k === 'objeto' && ev.objeto === 'chicle') || dormido(e) || activo0(e).sinSuenoHasta !== 3) falla('chicle: el chicle debe despertarlo y dejarlo recién despierto');
      const trazas = [];
      for (let turno = 2; turno <= 4; turno++) {
        const r = M.resolverTurno(e, [cana, ataca(esporas, 0)]);
        e = r.estado;
        trazas.push(`${textosVistos(r, 'combate.recien').length}${dormido(e) ? 'D' : '-'}`);
      }
      if (trazas.join(' ') !== '1- 1- 0D') falla(`recién despierto por el chicle: esperaba «1- 1- 0D» y salió «${trazas.join(' ')}»`);
      // A fresh chicle is not spent when the sleep never starts (the shielded one): sleeper-to-be with sinSuenoHasta and a chicle.
      const e2 = mk(['cierzon', 'turito', 'tocinon'], ['criaturitah', 'turito', 'tocinon'], 3, { a: { objetos: ['chicle', null, null] } });
      activo0(e2).sinSuenoHasta = 9;
      seguro(e2, 1);
      const r2 = M.resolverTurno(e2, [cana, ataca(esporas, 0)]);
      if (r2.eventos.some((ev) => ev.k === 'objeto') || activo0(r2.estado).objeto.gastado) falla('chicle: se gasta con el que está protegido');
    }
    // (d) Bostezo fails too (with its line, and no yawn is left pending); other statuses are unaffected; Siesta (own choice) works.
    {
      const e = mk(['cierzon', 'turito', 'tocinon'], ['turito', 'tocinon', 'cierzon']);
      activo0(e).sinSuenoHasta = 5;
      const r = M.resolverTurno(e, [cana, ataca(idx('turito', 'bostezo'), 0)]);
      if (!textosVistos(r, 'combate.recien').length || activo0(r.estado).vol.bostezo !== -1) falla('recién despierto: el Bostezo debe fallar sin dejar bostezo pendiente');
      const q = mk(['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']);
      activo0(q).sinSuenoHasta = 5;
      activo0(q).ps = Math.floor(activo0(q).psMax / 2);
      const rs = M.resolverTurno(q, [ataca(idx('tocinon', 'siesta')), cana]);
      if (!dormido(rs.estado)) falla('recién despierto: la Siesta (la elige él) sí funciona');
      const f = mk(['cierzon', 'turito', 'tocinon'], ['chupitochu', 'turito', 'tocinon']);
      activo0(f).sinSuenoHasta = 5;
      seguro(f, 1);
      const rd = M.resolverTurno(f, [cana, ataca(idx('chupitochu', 'fogonazo'), 0)]);
      if (rd.eventos.some((ev) => ev.clave === 'combate.recien')) falla('recién despierto: solo vale contra el sueño');
    }
    // (e) The machine does not try: with the rival just awake it does not pick Esporas or Bostezo; without it, it does sometimes.
    {
      const cuenta = (esp, mov, recien) => {
        let n = 0;
        for (let sem = 1; sem <= 60; sem++) {
          const e = mk(['cierzon', 'turito', 'tocinon'], [esp, 'turito', 'tocinon'], sem);
          if (recien) activo0(e).sinSuenoHasta = 5;
          const c = M.eleccionBot(e, 1, M.crearRnd(sem * 13));
          if (c?.tipo === 'atacar' && c.mov === idx(esp, mov)) n++;
        }
        return n;
      };
      for (const [esp, mov] of [['criaturitah', 'esporas'], ['turito', 'bostezo']]) {
        const sin = cuenta(esp, mov, false);
        const con = cuenta(esp, mov, true);
        if (con !== 0) falla(`bot: intenta dormir con ${mov} a un recién despierto (${con}/60)`);
        if (sin < 5) falla(`bot: control, ${mov} nunca sale sin recién despierto (${sin}/60)`);
      }
    }
  }

  // --- Al tendedero: the hit lands, Pantaloneto goes back to the bench at the end of the turn and its player chooses who comes in.
  {
    const tend = idx('pantaloneto', 'tendedero');
    const base = (semilla = 3) => mk(['pantaloneto', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], semilla);
    const r = M.resolverTurno(base(), [ataca(tend), cana]);
    if (!dano(r, 1)) falla('Al tendedero: no pega');
    if (r.estado.reemplazos.join() !== '0') falla(`Al tendedero: reemplazos ${r.estado.reemplazos} (esperaba 0)`);
    if (activo0(r.estado).ps <= 0) falla('Al tendedero: control, no debería haber caído');
    const iTexto = r.eventos.findIndex((ev) => ev.clave === 'combate.tendedero_vuelve' && ev.vars?.quien === 'Pantaloneto');
    if (iTexto < 0 || iTexto < r.eventos.findIndex((ev) => ev.k === 'golpe' && ev.j === 1)) falla('Al tendedero: la línea de «vuelve al tendedero» va justo tras el golpe');
    if (r.estado.ganador !== null || r.eventos.some((ev) => ev.k === 'sale' || ev.k === 'cae' && ev.j === 0)) falla('Al tendedero: no se retira dentro del turno');
    // The player picks: a valid one comes in, the active itself or nonsense counts as the first other one.
    const rr = M.reemplazar(r.estado, { 0: 2 });
    if (activo0(rr.estado).especie !== 'tocinon' || rr.estado.reemplazos.length || !rr.eventos.some((ev) => ev.k === 'sale' && ev.j === 0 && ev.idx === 2)) falla('Al tendedero: el reemplazo elegido no sale');
    if (rr.estado.jugadores[0].equipo[0].ps <= 0) falla('Al tendedero: el retirado debe seguir vivo en el banquillo');
    for (const mala of [0, 7, -1, undefined]) {
      const m = M.reemplazar(r.estado, { 0: mala });
      if (m.estado.jugadores[0].activo !== 1) falla(`Al tendedero: elección ${mala} debería sacar al primero de los otros`);
    }
    // Its stat changes go away like in any switch, and its objects stay with it (Zapatillas on the one coming in work).
    const z = mk(['pantaloneto', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], 3, { a: { objetos: [null, 'zapatillas', null] } });
    const rz = M.resolverTurno(z, [ataca(tend), cana]);
    const rzr = M.reemplazar(rz.estado, { 0: 1 });
    if (activo0(rzr.estado).niveles.vel !== 1 || !rzr.eventos.some((ev) => ev.k === 'objeto' && ev.objeto === 'zapatillas')) falla('Al tendedero: el que entra debería activar sus zapatillas');
    if (rzr.estado.jugadores[0].equipo[0].niveles.ata !== 0) falla('Al tendedero: el retirado conserva sus niveles');
    // The bot never chooses the one who is leaving, and the screen/host default (first alive) is corrected.
    if (M.reemplazoBot(r.estado, 0) === 0) falla('reemplazoBot elige al que se está yendo');
    // The next turn goes on normally (the state is consistent and JSON-safe).
    const sig = M.resolverTurno(JSON.parse(JSON.stringify(rr.estado)), [ataca(0), cana]);
    if (!sig.eventos.some((ev) => ev.k === 'usa' && ev.j === 0)) falla('Al tendedero: el turno siguiente no se juega');
    // If the blow does not land it does not leave: Esconderse (nothing to hit)...
    const esc = mk(['pantaloneto', 'turito', 'tocinon'], ['draguserin', 'turito', 'cierzon']);
    const re = M.resolverTurno(esc, [ataca(tend), ataca(idx('draguserin', 'esconderse'))]);
    if (re.estado.reemplazos.length || textosVistos(re, 'combate.tendedero_vuelve').length) falla('Al tendedero: se retira aunque el rival se esconda');
    // ...or a miss (accuracy lowered: some seeds miss, and exactly those do not leave).
    let fallos_ = 0;
    let aciertos = 0;
    for (let sem = 1; sem <= 60; sem++) {
      const f = base(sem);
      activo0(f).niveles.prec = -3;
      const rf = M.resolverTurno(f, [ataca(tend), cana]);
      const fallo = rf.eventos.some((ev) => ev.clave === 'combate.esquiva');
      if (fallo) fallos_++;
      else aciertos++;
      if (fallo === (rf.estado.reemplazos.length > 0)) falla(`Al tendedero (semilla ${sem}): ${fallo ? 'falla y se retira' : 'acierta y no se retira'}`);
    }
    if (fallos_ < 5 || aciertos < 5) falla(`Al tendedero: los fallos no salen (${fallos_} fallos, ${aciertos} aciertos)`);
    // Nobody to send in: it stays (no replacement, no line); with only one left, that one comes in.
    const solo = base();
    solo.jugadores[0].equipo[1].ps = 0;
    solo.jugadores[0].equipo[2].ps = 0;
    const rs = M.resolverTurno(solo, [ataca(tend), cana]);
    if (rs.estado.reemplazos.length || textosVistos(rs, 'combate.tendedero_vuelve').length || !dano(rs, 1)) falla('Al tendedero: sin nadie en el banquillo no debe retirarse');
    const uno = base();
    uno.jugadores[0].equipo[1].ps = 0;
    const ru = M.reemplazar(M.resolverTurno(uno, [ataca(tend), cana]).estado, {});
    if (ru.estado.jugadores[0].activo !== 2) falla('Al tendedero: con un solo suplente, ese entra');
    // It lands and knocks the rival out: both leave (the rival because it fell, Pantaloneto because of the hangers).
    const ko = base();
    activo0(ko, 1).ps = 1;
    const rk = M.resolverTurno(ko, [ataca(tend), ataca(idx('tocinon', 'barrigazo'), 0)]);
    if ([...rk.estado.reemplazos].sort().join() !== '0,1') falla(`Al tendedero + K.O.: reemplazos ${rk.estado.reemplazos} (esperaba 0,1)`);
    const rkr = M.reemplazar(rk.estado, { 0: 2, 1: 2 });
    if (rkr.estado.jugadores[0].activo !== 2 || rkr.estado.jugadores[1].activo !== 2) falla('Al tendedero + K.O.: no salen los dos elegidos');
    // It is hit afterwards and falls: no duplicates, and the replacement is the usual one (any alive).
    const cae = mk(['pantaloneto', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']);
    activo0(cae).ps = 1;
    const rc = M.resolverTurno(cae, [ataca(tend), ataca(idx('cierzon', 'planeo'), 0)]);
    if (activo0(rc.estado).ps !== 0) falla('Al tendedero: control, debía caer al final');
    if (rc.estado.reemplazos.filter((j) => j === 0).length !== 1) falla('Al tendedero: reemplazo duplicado');
    // Whole battles with Pantaloneto and bots: the invariants hold and every battle ends (a replacement is asked every time it leaves).
    let retiradas = 0;
    for (let sem = 1; sem <= 40; sem++) {
      const rnd = M.crearRnd(sem * 17 + 3);
      let s = M.crearCombate(
        [
          { entrenador: 'fran', nombre: 'F', bot: true, especies: ['pantaloneto', 'cajonazo', 'turito'] },
          { entrenador: 'pablo', nombre: 'P', bot: true, especies: ['tocinon', 'pantaloneto', 'cierzon'] },
          { entrenador: 'chuchi', nombre: 'C', bot: true, especies: ['camioner', 'draguserin', 'cajonazo'] },
          { entrenador: 'guille', nombre: 'G', bot: true, especies: ['kbronero', 'p', 'aceituna'] },
        ],
        sem,
      );
      for (let t = 0; t < 200 && s.ganador === null; t++) {
        const rt = M.resolverTurno(s, s.jugadores.map((_q, j) => M.eleccionBot(s, j, rnd)));
        s = rt.estado;
        revisar(s, `tendedero ${sem}`);
        if (s.ganador === null && s.reemplazos.length) {
          for (const j of s.reemplazos) if (M.activo(s, j).ps > 0) retiradas++;
          s = M.reemplazar(s, Object.fromEntries(s.reemplazos.map((j) => [j, M.reemplazoBot(s, j)]))).estado;
        }
      }
      if (s.ganador === null) falla(`batalla con Pantaloneto ${sem}: no acaba`);
      revisarStatsSimple(s, `tendedero ${sem}`);
    }
    if (!retiradas) falla('batallas de bots: Al tendedero nunca se usa');
    // The bot uses it when it is threatened and has somebody to send in, much less when it is the last one standing.
    const usos = (conBanco) => {
      let n = 0;
      for (let sem = 1; sem <= 60; sem++) {
        const e = mk(['pantaloneto', 'turito', 'tocinon'], ['camioner', 'cierzon', 'tocinon'], sem);
        activo0(e).ps = Math.floor(activo0(e).psMax * 0.3);
        if (!conBanco) {
          e.jugadores[0].equipo[1].ps = 0;
          e.jugadores[0].equipo[2].ps = 0;
        }
        const c = M.eleccionBot(e, 0, M.crearRnd(sem * 7));
        if (c?.tipo === 'atacar' && c.mov === tend) n++;
      }
      return n;
    };
    const conB = usos(true);
    const sinB = usos(false);
    if (conB < 20 || conB <= sinB) falla(`bot: Al tendedero amenazado con banquillo ${conB}/60, sin banquillo ${sinB}/60`);
  }

  // --- Remate por bulerías: power 20 + 180 × (1 − HP / max HP), rounded.
  {
    const pr = M.potenciaRemate;
    const casos = [[300, 300, 20], [150, 300, 110], [1, 300, 199], [0, 300, 200], [30, 300, 182], [231, 300, 61]];
    for (const [ps, max, esperada] of casos) if (pr(ps, max) !== esperada) falla(`potenciaRemate(${ps}, ${max}) = ${pr(ps, max)}, esperaba ${esperada}`);
    const rem = idx('cajonazo', 'remate');
    const prueba = (frac, semilla = 4) => {
      const e = mk(['cajonazo', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], semilla);
      const u = activo0(e);
      u.ps = Math.max(1, Math.round(u.psMax * frac));
      const v = activo0(e, 1);
      v.ps = v.psMax = 5000; // nothing knocks it out, so that the damages can be compared
      const r = M.resolverTurno(e, [ataca(rem), cana]);
      const pot = pr(u.ps, u.psMax);
      const lo = M.calcularDano(u, v, M.MOVS.remate, { pot, azar: 0.85 }).dano;
      const hi = M.calcularDano(u, v, M.MOVS.remate, { pot, azar: 1, critico: true }).dano;
      return { d: dano(r, 1), pot, lo, hi, golpes: r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === 1 && !ev.clave).length };
    };
    let ant = 0;
    for (const f of [1, 0.75, 0.5, 0.25, 0.05]) {
      const x = prueba(f);
      if (x.golpes !== 1) falla(`Remate: ${x.golpes} golpes a vida ${f}`);
      if (x.d < x.lo || x.d > x.hi) falla(`Remate a ${Math.round(f * 100)} % de vida: ${x.d} fuera de [${x.lo}, ${x.hi}] con potencia ${x.pot}`);
      if (x.d < ant) falla(`Remate: con menos vida debe pegar más (${x.d} tras ${ant})`);
      ant = x.d;
    }
    const lleno = prueba(1);
    const bajo = prueba(0.05);
    if (lleno.pot !== 20 || bajo.pot < 180 || bajo.d < lleno.d * 5) falla(`Remate: vida llena ${lleno.d} (pot ${lleno.pot}) y casi muerto ${bajo.d} (pot ${bajo.pot})`);
    // Its own type (Juerga) and Aguantar el tipo go together: holding on at 1 HP, the next Remate is ~200.
    const e = mk(['cajonazo', 'turito', 'tocinon'], ['turito', 'cierzon', 'tocinon']);
    activo0(e).ps = 5;
    const agu = M.resolverTurno(e, [ataca(idx('cajonazo', 'aguantar')), ataca(0, 0)]);
    if (activo0(agu.estado).ps < 1) falla('Remate + Aguantar: debía aguantar con 1 PS');
    if (M.potenciaDe(activo0(agu.estado), M.MOVS.remate) < 190) falla('Remate: con 1 PS pega con ~200');
    // The machine: with little HP it likes it, with a full bar it hardly ever picks it.
    const elige = (frac) => {
      let n = 0;
      for (let sem = 1; sem <= 60; sem++) {
        const q = mk(['cajonazo', 'turito', 'tocinon'], ['tocinon', 'cierzon', 'tocinon'], sem);
        activo0(q).ps = Math.max(1, Math.round(activo0(q).psMax * frac));
        const c = M.eleccionBot(q, 0, M.crearRnd(sem * 5));
        if (c?.tipo === 'atacar' && c.mov === rem) n++;
      }
      return n;
    };
    const alto = elige(1);
    const poco = elige(0.5);
    if (poco < 30 || alto > 10) falla(`bot: Remate con poca vida ${poco}/60 y con la barra llena ${alto}/60 (esperaba mucho / casi nunca)`);
    // The effect screens use the same formula: bounds of the "fuerza" they derive.
    if (pr(300, 300) - 20 !== 0 || (pr(0, 300) - 20) / 180 !== 1) falla('Remate: la fuerza del efecto va de 0 a 1');
  }
}

function revisarSalida() {
  const mk = (a, b, extra = {}, semilla = 5) =>
    M.crearCombate(
      [
        { entrenador: 'fran', nombre: 'A', bot: false, especies: a, ...extra },
        { entrenador: 'pablo', nombre: 'B', bot: false, especies: b },
      ],
      semilla,
    );
  const cana = { tipo: 'cana' };
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  // `inicial` is the opening userito; the team keeps its order, so objects and statistics stay with their useritos.
  const e = mk(['turito', 'aceituna', 'cierzon'], ['tocinon', 'turito', 'cierzon'], { inicial: 2, objetos: [null, 'mechero', 'zapatillas'] });
  const q = e.jugadores[0];
  if (q.activo !== 2) falla(`inicial: activo ${q.activo}, esperaba 2`);
  if (q.equipo.map((u) => u.especie).join() !== 'turito,aceituna,cierzon') falla('inicial: cambia el orden del equipo');
  if (q.equipo[1].objeto?.id !== 'mechero' || q.equipo[2].objeto?.id !== 'zapatillas' || q.equipo[0].objeto) falla('inicial: los objetos no siguen a sus useritos');
  if (e.jugadores[1].activo !== 0) falla('inicial: sin inicial el activo debería ser el primero');
  // The opener is the one in the field on turn 1: its Zapatillas work at the start, the others' do not; it is the one that fights.
  const r = M.resolverTurno(e, [ataca(0), cana]);
  if (r.estado.jugadores[0].equipo[2].niveles.vel !== 1 || r.estado.jugadores[0].equipo[0].niveles.vel !== 0) falla('inicial: las zapatillas del inicial deberían activarse al empezar');
  if (!r.eventos.some((ev) => ev.k === 'usa' && ev.j === 0)) falla('inicial: el inicial no ataca');
  if (r.estado.stats.u[0][2].tf !== 1 || r.estado.stats.u[0][0].tf !== 0) falla('inicial: los turnos en campo van al userito equivocado');
  // Invalid values count as the first one.
  for (const mala of [-1, 3, 1.5, NaN, undefined, null, '1']) {
    if (mk(['turito', 'aceituna', 'cierzon'], ['tocinon', 'turito', 'cierzon'], { inicial: mala }).jugadores[0].activo !== 0) falla(`inicial: ${String(mala)} debería valer 0`);
  }
  // A team of two cannot open with a third that is not there.
  if (mk(['turito', 'aceituna'], ['tocinon', 'turito', 'cierzon'], { inicial: 2 }).jugadores[0].activo !== 0) falla('inicial: equipo de dos con inicial 2');
  // A whole battle starting with each opener finishes and keeps the invariants.
  for (let i = 0; i < 3; i++) {
    let s = mk(['camioner', 'aceituna', 'cierzon'], ['tocinon', 'turito', 'cierzon'], { inicial: i }, 9 + i);
    for (let t = 0; t < 120 && s.ganador === null; t++) {
      const rr = M.resolverTurno(s, s.jugadores.map((_, j) => (M.eliminado(s, j) ? null : M.eleccionBot(s, j, M.crearRnd(t * 7 + j)))));
      s = rr.estado;
      if (s.reemplazos.length) s = M.reemplazar(s, {}).estado;
      revisar(s, `inicial ${i}`);
    }
    if (s.ganador === null) falla(`inicial ${i}: la batalla no acaba`);
  }

  // The machine's pick: always valid, deterministic for a given dice, and sensible (with no noise the best matchup wins).
  const todas = M.ESPECIES.map((sp) => sp.id);
  for (let sem = 1; sem <= 60; sem++) {
    const rnd = M.crearRnd(sem);
    const mezcla = [...todas].sort(() => rnd() - 0.5);
    const equipo = mezcla.slice(0, 3);
    const rivales = [mezcla.slice(3, 6), mezcla.slice(6, 9), mezcla.slice(9, 12)];
    const a = M.salidaBot(equipo, rivales, M.crearRnd(sem + 100));
    const b = M.salidaBot(equipo, rivales, M.crearRnd(sem + 100));
    if (a !== b) falla('salidaBot: no es determinista');
    if (!Number.isInteger(a) || a < 0 || a > 2) falla(`salidaBot: ${a} no es un índice`);
  }
  // Against three teams of Mindundi (turito) the Juerga cajón (×2 to them, ×1 back) is the best opener of these three.
  const sin = () => 0;
  const rivs = [['turito', 'turito', 'turito'], ['turito', 'turito', 'turito'], ['turito', 'turito', 'turito']];
  if (M.salidaBot(['camioner', 'draguserin', 'cajonazo'], rivs, sin) !== 2) falla('salidaBot: contra Mindundi debería abrir el de Juerga');
  // Many different openers come out over many machines (it is not always the first one).
  const salidas = new Set();
  for (let sem = 1; sem <= 80; sem++) {
    const rnd = M.crearRnd(sem * 31);
    const mezcla = [...todas].sort(() => rnd() - 0.5);
    salidas.add(M.salidaBot(mezcla.slice(0, 3), [mezcla.slice(3, 6), mezcla.slice(6, 9)], M.crearRnd(sem)));
  }
  if (salidas.size < 3) falla('salidaBot: siempre elige el mismo');
}
revisarTanda6();
revisarObjetos();
revisarBanquillo();
revisarTanda7();
revisarSalida();

const semillas = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n)).slice(0, 5);
if (!semillas.length) semillas.push(1);
semillas.forEach((s, i) => {
  const a = jugar(s, i === 0);
  if (i === 0 && jugar(s, false) !== a) falla('no es determinista con la misma semilla');
});
console.log(fallos.length ? `${fallos.length} FALLOS` : 'OK: sin fallos');
process.exit(fallos.length ? 1 : 0);
