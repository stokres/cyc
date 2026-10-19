// Quick check of the PokéUsera battle engine: bundles src/pokeusera/{datos,motor} with esbuild and
// plays ONE battle of 4 bots (random draft, fixed seed), checking invariants as it goes.
// Usage: node scripts/pokeusera-motor.mjs [seed] [seed...]   (default seed 1; keep it to a few runs)
//        node scripts/pokeusera-motor.mjs --sim=200   (balance: N bot battles with different seeds; turns, hits per fall)
//        node scripts/pokeusera-motor.mjs --especies=400   (balance per userito: N bot battles with RANDOM drafts, objects given out like the machines do and random bars; win rate and average place of each userito)
//        node scripts/pokeusera-motor.mjs --entrenadores=6000   (balance per TRAINER: N bot battles with random drafts and four trainers drawn at random among the seven, no repeats; win rate of each one against the 25 % par; ~6000 take a couple of minutes)
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
    contents: `export * from './src/pokeusera/datos'; export * from './src/pokeusera/motor/combate'; export * from './src/pokeusera/motor/draft'; export * from './src/pokeusera/motor/bot'; export * from './src/pokeusera/motor/objetos'; export { OBJETOS, OBJ_TAPON_USOS, OBJ_BOCATA_CURA } from './src/pokeusera/tipos'; export { crearRnd, azar, entero, sacarAlAzar } from './src/pokeusera/motor/azar'; export { ENTRENADORES } from './src/pokeusera/tipos'; export { envolver2 } from './src/pokeusera/arte2/fuente2'; export { Recolector } from './src/pokeusera/estadisticas/resumen'; export { prepararCatalogo, normalizarResumen, sumarResumen, agregadoVacio } from './src/pokeusera/estadisticas/agregado.mjs';`,
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
// Data: 32 useritos with valid moves; every userito, move and type has its text.
if (M.ESPECIES.length !== 37) console.error('FALLO: no hay 37 useritos');
for (const sp of M.ESPECIES) {
  if (!textos.has(`userito.${sp.id}.desc`)) console.error('FALLO: falta userito.' + sp.id + '.desc');
  for (const mv of sp.movs) if (!M.MOVS[mv]) console.error('FALLO: movimiento desconocido', sp.id, mv);
}
for (const id of Object.keys(M.MOVS)) if (!textos.has(`mov.${id}.desc`)) console.error('FALLO: falta mov.' + id + '.desc');
for (const t of Object.keys(M.TIPO_NOMBRE)) if (!textos.has(`tipo.${t}`)) console.error('FALLO: falta tipo.' + t);
// Every pair that is ×2 or ×0 has its sentence of logic (tipo.logica.<attack>.<defender>), and only those do.
for (const a of M.TIPOS) for (const d of M.TIPOS) {
  const m = M.eficacia(a, [d]);
  const hay = textos.has(`tipo.logica.${a}.${d}`);
  if ((m === 2 || m === 0) !== hay) console.error(`FALLO: tipo.logica.${a}.${d} ${hay ? 'sobra' : 'falta'} (eficacia ×${m})`);
}
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
  // The longest one (Se enchufa la pista, 3 turns) drawn on turn 25 is over when turn 28 begins.
  const maxDura = Math.max(...Object.values(M.SUCESOS).map((x) => x.dura));
  if (e.sucesos.some((x) => x.turnos < 1 || x.turnos > maxDura)) falla(`sucesos con turnos raros: ${JSON.stringify(e.sucesos)}`);
  if (e.turno >= 25 + maxDura && e.sucesos.length) falla(`quedan sucesos en el turno ${e.turno}`);
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
      // The biggest hit counts the gross damage (`bruto` of the 'golpe' event), so it can be more than all the damage really done; but there is none without damage.
      if (s.mx > 0 && s.dh === 0) falla('stats: golpe máximo sin daño hecho');
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
      if (ev.k === 'golpe' && ev.bruto !== undefined && (!Number.isInteger(ev.bruto) || ev.bruto <= ev.dano || ev.dano <= 0)) falla(`golpe con bruto raro: dano ${ev.dano}, bruto ${ev.bruto}`);
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
function batallaAlAzar(s, ents = ['fran', 'pablo', 'chuchi', 'guille']) {
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
    eq.map((especies, i) => ({ entrenador: ents[i], nombre: 'J' + i, bot: true, especies, objetos: objetos[i].lista })),
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

// ---- balance per TRAINER: `--entrenadores=N` plays N bot battles (random drafts, objects like the machines, random bars) with four trainers drawn
// at random among the seven (no repeats, random seats) and prints each one's win rate against the 25 % par. The perks are not part of the machines'
// decisions, so this measures what each perk is worth. The margin the tuning aims for is 0.90-1.10 of the mean (docs/POKEUSERA.md, «Equilibrio»).
const entArg = process.argv.find((a) => a.startsWith('--entrenadores'));
if (entArg) {
  const N = Number(entArg.split('=')[1]) || 6000;
  const t0 = Date.now();
  const res = Object.fromEntries(M.ENTRENADORES.map((id) => [id, { n: 0, gana: 0, puesto: 0 }]));
  let sinAcabar = 0;
  for (let s = 1; s <= N; s++) {
    const ents = M.sacarAlAzar(M.ENTRENADORES, 4, M.crearRnd(s * 7919 + 5));
    const b = batallaAlAzar(s, ents);
    if (!b.acabo) {
      sinAcabar++;
      continue;
    }
    b.e.jugadores.forEach((q, j) => {
      const r = res[ents[j]];
      r.n++;
      r.puesto += q.puesto;
      if (q.puesto === 1) r.gana++;
    });
  }
  const media = Object.values(res).reduce((a, x) => a + x.gana, 0) / Math.max(1, Object.values(res).reduce((a, x) => a + x.n, 0));
  console.log(`Balance por entrenador: ${N} batallas de 4 bots (sin acabar: ${sinAcabar}), ${((Date.now() - t0) / 1000).toFixed(0)} s. Victoria media ${(media * 100).toFixed(1)} % (el margen es x 0,90-1,10 de la media)`);
  console.log('entrenador   apar.  victoria  x media  puesto medio');
  let fuera = 0;
  for (const [id, x] of Object.entries(res).sort((a, b) => b[1].gana / b[1].n - a[1].gana / a[1].n)) {
    const v = x.gana / Math.max(1, x.n);
    const k = v / media;
    if (k < 0.9 || k > 1.1) fuera++;
    console.log(`${id.padEnd(10)}  ${String(x.n).padStart(5)}  ${(v * 100).toFixed(1).padStart(7)} %  ${k.toFixed(2).padStart(7)}  ${(x.puesto / Math.max(1, x.n)).toFixed(2).padStart(10)}${k < 0.9 || k > 1.1 ? '   <- FUERA DEL MARGEN' : ''}`);
  }
  console.log(fuera ? `${fuera} entrenador(es) fuera del margen.` : 'Todos dentro del margen.');
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
  if (ch.danos[0] !== Math.max(1, Math.floor((ref.danos[0] * 85) / 100))) falla(`perk Chuchi: primer golpe ${ch.danos[0]} != 85 % de ${ref.danos[0]}`);
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

// ---- tanda 11, new trainers: Viñas «Verso libre» (×1.1 on Chanza and Juerga), Ari «De su cosecha» (10 % extra critical, one extra random number only when SHE
// attacks) and Fer «Cancelación de ruido» (the sound moves of a rival do not reach his useritos). Deterministic cases plus a few hundred seeds.
function revisarPerksNuevos() {
  const eq = (ents, esp) => ents.map((entrenador, i) => ({ entrenador, nombre: entrenador, bot: false, especies: esp[i] }));
  const cana = { tipo: 'cana' };
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.clave);

  // Verso libre: the helper says ×1.1 only for his Chanza / Juerga; the damage of the engine follows it.
  {
    const e = { jugadores: [{ entrenador: 'vinas' }, { entrenador: 'fran' }] };
    for (const [tipo, k] of [['chanza', 1.1], ['juerga', 1.1], ['alcohol', 1], ['petardo', 1], ['mindundi', 1]]) if (M.multVerso(e, 0, { tipo }) !== k) falla(`Verso libre: ×${M.multVerso(e, 0, { tipo })} en ${tipo}, esperaba ×${k}`);
    if (M.multVerso(e, 1, { tipo: 'chanza' }) !== 1) falla('Verso libre: lo tiene Fran');
    // Ceceseta: Pasodoble (Juerga, 0), Mancha de cerveza (Alcohol, 1), Zasca (Chanza, 3), all against a Tocinón.
    const esp = [['ceceseta', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon']];
    let mas = 0;
    let razonMala = 0;
    for (let semilla = 1; semilla <= 60; semilla++) {
      const dano = (ent, mov) => {
        const r = M.resolverTurno(M.crearCombate(eq([ent, 'pablo'], esp), semilla), [ataca(mov), cana]);
        return golpes(r, 1).reduce((n, ev) => n + ev.dano, 0);
      };
      for (const mov of [0, 3]) {
        const a = dano('vinas', mov);
        const b = dano('fran', mov);
        if (b > 0 && a < b) falla(`Verso libre: pega menos que otro (${a} < ${b}), mov ${mov}, semilla ${semilla}`);
        if (a > b) mas++;
        if (b >= 20 && (a / b < 1.05 || a / b > 1.16)) razonMala++;
      }
      if (dano('vinas', 1) !== dano('fran', 1)) falla(`Verso libre: cambia un ataque de Alcohol (semilla ${semilla})`);
    }
    if (!mas) falla('Verso libre: nunca pega más en Chanza/Juerga');
    if (razonMala) falla(`Verso libre: la razón con otro entrenador sale de 1,05-1,16 en ${razonMala} casos`);
  }

  // De su cosecha: more critical hits than another trainer (about +10 points of the non-critical ones), the line only on those, and the random stream
  // untouched when she does not attack (she only receives: same state afterwards as with another trainer).
  {
    const esp = [['tocinon', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon']];
    const turno = (ent, semilla, ataque = ataca(0)) => M.resolverTurno(M.crearCombate(eq([ent, 'pablo'], esp), semilla), [ataque, cana]);
    let criAri = 0;
    let criRef = 0;
    let mal = 0;
    const N = 800;
    for (let semilla = 1; semilla <= N; semilla++) {
      const a = turno('ari', semilla);
      const f = turno('fran', semilla);
      const ca = golpes(a, 1).filter((ev) => ev.critico).length;
      const cf = golpes(f, 1).filter((ev) => ev.critico).length;
      criAri += ca;
      criRef += cf;
      const avisos = a.eventos.filter((ev) => ev.clave === 'combate.perk.ari').length;
      if (cf > ca) mal++; // a natural critical is never lost
      if (avisos > ca) mal++;
      if (f.eventos.some((ev) => ev.clave === 'combate.perk.ari')) mal++;
    }
    if (mal) falla(`De su cosecha: ${mal} incoherencias (crítico perdido o aviso que no toca)`);
    const extra = (criAri - criRef) / N;
    if (extra < 0.06 || extra > 0.14) falla(`De su cosecha: ${(extra * 100).toFixed(1)} críticos extra por cada 100 golpes, esperaba ~9`);
    let distinto = 0;
    for (let semilla = 1; semilla <= 50; semilla++) {
      // Ari defends (no attack of hers): the random stream ends where it does with any other trainer.
      const a = M.resolverTurno(M.crearCombate(eq(['pablo', 'ari'], esp), semilla), [ataca(0), cana]);
      const f = M.resolverTurno(M.crearCombate(eq(['pablo', 'fran'], esp), semilla), [ataca(0), cana]);
      if (a.estado.semilla !== f.estado.semilla) falla(`De su cosecha: gasta azar sin atacar (semilla ${semilla})`);
      // Ari attacks: it draws one more number each blow that is not critical already.
      if (turno('ari', semilla).estado.semilla !== turno('fran', semilla).estado.semilla) distinto++;
    }
    if (!distinto) falla('De su cosecha: atacando no gasta ningún número de azar extra');
  }

  // Cancelación de ruido: a sound move with damage (¡Ay, ay, ay!) does 25 % less to Fer (floor, min 1) and warns once; one without damage (Serenata, Bocinazo) gets through
  // about 75 % of the seeds (and when it does not, nothing reaches him and the line says why); a normal move and a Petardo hit him as usual.
  // Camioner: Trompazo 0 (normal), Bocinazo 2 (sound); Mariachi: ¡Ay, ay, ay! 0, Serenata 1, Salsa picante 2 (normal).
  {
    const sonidos = ['bocinazo', 'ayayay', 'serenata', 'distorsion', 'solo', 'pasodoble', 'cancion', 'dosvoces', 'eco', 'monologo'];
    if (sonidos.some((id) => !M.esSonido(id)) || M.esSonido('trompazo') || M.esSonido('picante') || M.esSonido('zasca') || M.esSonido('turra')) falla('Cancelación de ruido: la lista de sonido no es la esperada');
    const vs = (esp, ent, mov, objetivo = 1, semilla = 21) => {
      const e = M.crearCombate(eq(['pablo', ent], [esp, ['tocinon', 'turito', 'cierzon']]), semilla);
      return { e, r: M.resolverTurno(e, [ataca(mov, objetivo), cana]) };
    };
    const perdido = (x) => x.r.estado.jugadores[1].equipo[0].psMax - x.r.estado.jugadores[1].equipo[0].ps;
    // Damage: 75 % of what Fran takes (same seed, same dice), one warning, and a normal move is not halved.
    const feroz = vs(['mariachi', 'turito', 'cierzon'], 'fer', 0);
    const refe = vs(['mariachi', 'turito', 'cierzon'], 'fran', 0);
    if (perdido(refe) < 2 || perdido(feroz) !== Math.max(1, Math.floor((perdido(refe) * 75) / 100))) falla(`Fer: ¡Ay, ay, ay! no hace un 25 % menos (${perdido(feroz)} contra ${perdido(refe)})`);
    const avisos = feroz.r.eventos.filter((ev) => ev.clave === 'combate.perk.fer');
    if (avisos.length !== 1 || avisos[0].j !== 1 || !avisos[0].vars?.quien) falla(`Fer: aviso mal (${avisos.length})`);
    if (refe.r.eventos.some((ev) => ev.clave === 'combate.perk.fer' || ev.clave === 'combate.perk.fer_nada')) falla('Fer: lo ha activado otro entrenador');
    const normal = vs(['mariachi', 'turito', 'cierzon'], 'fer', 2);
    const normalRef = vs(['mariachi', 'turito', 'cierzon'], 'fran', 2);
    if (perdido(normal) !== perdido(normalRef) || normal.r.eventos.some((ev) => ev.clave === 'combate.perk.fer')) falla('Fer: Salsa picante (no es de sonido) no le hace el daño normal');
    const tromp = vs(['camioner', 'turito', 'cierzon'], 'fer', 0);
    if (perdido(tromp) !== perdido(vs(['camioner', 'turito', 'cierzon'], 'fran', 0))) falla('Fer: Trompazo (normal) no le hace el daño normal');
    // No damage: Serenata (embobado) and Bocinazo (−1 Attack) reach him about 75 % of the seeds, and exactly when the warning is not given; always reach Fran.
    for (const [esp, mov, llega, nombre] of [
      ['mariachi', 1, (x) => x.r.estado.jugadores[1].equipo[0].vol.embobado > 0, 'Serenata'],
      ['camioner', 2, (x) => x.r.estado.jugadores[1].equipo[0].niveles.ata === -1, 'Bocinazo'],
    ]) {
      let paso = 0;
      const N = 200;
      for (let sem = 1; sem <= N; sem++) {
        const x = vs([esp, 'turito', 'cierzon'], 'fer', mov, 1, sem);
        const aviso = x.r.eventos.some((ev) => ev.clave === 'combate.perk.fer_nada');
        if (llega(x) === aviso) falla(`Fer: ${nombre} y su aviso no coinciden (semilla ${sem})`);
        if (llega(x)) paso++;
        if (!llega(vs([esp, 'turito', 'cierzon'], 'fran', mov, 1, sem))) falla(`Fer (referencia): ${nombre} no llega a Fran (semilla ${sem})`);
      }
      if (paso < N * 0.65 || paso > N * 0.85) falla(`Fer: ${nombre} le llega ${paso} de ${N} veces (se esperaba el 75 %)`);
    }
    // His own sound moves work as ever, and the userito that comes in after a fall is covered too.
    const suyo = M.resolverTurno(M.crearCombate(eq(['fer', 'pablo'], [['mariachi', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon']]), 21), [ataca(0), cana]);
    const suyoRef = M.resolverTurno(M.crearCombate(eq(['fran', 'pablo'], [['mariachi', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon']]), 21), [ataca(0), cana]);
    if (suyo.estado.jugadores[1].equipo[0].ps !== suyoRef.estado.jugadores[1].equipo[0].ps) falla('Fer: sus propios movimientos de sonido no funcionan igual');
    const banco = M.resolverTurno(M.crearCombate(eq(['pablo', 'fer'], [['mariachi', 'turito', 'cierzon'], ['tocinon', 'camioner', 'cierzon']]), 21), [ataca(0), { tipo: 'cambiar', a: 1 }]);
    const bancoRef = M.resolverTurno(M.crearCombate(eq(['pablo', 'fran'], [['mariachi', 'turito', 'cierzon'], ['tocinon', 'camioner', 'cierzon']]), 21), [ataca(0), { tipo: 'cambiar', a: 1 }]);
    const c1 = banco.estado.jugadores[1].equipo[1];
    const c2 = bancoRef.estado.jugadores[1].equipo[1];
    if (c2.psMax - c2.ps >= 2 && c1.psMax - c1.ps !== Math.max(1, Math.floor(((c2.psMax - c2.ps) * 75) / 100))) falla('Fer: el userito que entra no recibe un 25 % menos del ruido');
  }
}
revisarPerksNuevos();

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
      if (!['brio', 'terraza', 'rural', 'juan', 'feria'].includes(a.escenario)) falla(`escenario raro: ${a.escenario}`);
      vistos.add(a.escenario);
      if (JSON.parse(JSON.stringify(a)).escenario !== a.escenario) falla('el escenario no sobrevive a JSON');
    }
    if (vistos.size !== 5) falla(`el sorteo del escenario no sale en los cinco (${[...vistos]})`);
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
      if (esp.filter((n) => n === 2).length !== 1 || esp.some((n) => n < 0 || n > 2 || n === 1)) falla(`rosas: niveles de Especial ${esp} (una rosa sube 2)`);
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
    // La feria. Its two sucesos are only there: no other place can draw them (so no other battle changes, nor spends one more random number).
    for (const esc of ['brio', 'terraza', 'rural', 'juan']) if (M.sucesosDe(esc).some((id) => id === 'choque' || id === 'pista')) falla(`${esc}: sale un suceso de La feria`);
    const generales = M.sucesosDe('brio').filter((id) => M.SUCESOS[id].escenario === null);
    if (M.sucesosDe('feria').slice().sort().join() !== [...generales, 'choque', 'pista'].sort().join()) falla('La feria: sus sucesos no son los generales y sus dos');
    if (M.SUCESOS.choque.dura !== 0 || M.SUCESOS.pista.dura !== 3) falla('La feria: ¡Coches de choque! es al momento y Se enchufa la pista dura 3 turnos');
    const conduce = (u) => M.ESPECIE[u.especie].tipos.some((t) => t === 'chispa' || t === 'petardo');
    const decimo = (u) => Math.max(1, Math.floor(u.psMax / 10));
    const sinSuceso = (e) => {
      // The same state with every suceso of the place already «seen»: nothing is drawn (and nothing random is spent on it).
      const c = structuredClone(e);
      c.sucesosVistos = M.sucesosDe(c.escenario);
      return c;
    };
    // ¡Coches de choque!: everybody on the field loses 1/10 of its max HP, except Chispa and Petardo (they drive); it never knocks anybody out.
    const f = forzar('choque', 'feria', ['cajonazo', 'kbronero', 'draguserin', 'p'], (e) => {
      e.jugadores[3].equipo[0].ps = 4; // a tiny one: the bump leaves it at 1 HP, it does not knock it out
    });
    if (f) {
      const ev = f.r.eventos.find((x) => x.k === 'suceso');
      if (!ev.fin || ev.turnos !== 0 || f.r.estado.sucesos.length) falla('¡Coches de choque!: es instantáneo y de fin de turno');
      if (f.r.estado.sucesosVistos.join() !== 'choque') falla('¡Coches de choque!: no se apunta como visto');
      const ctl = M.resolverTurno(sinSuceso(f.e0), pasivas(f.e0));
      if (ctl.eventos.some((x) => x.k === 'suceso')) falla('control de ¡Coches de choque!: el estado sin suceso saca uno');
      activos(f.r.estado).forEach((u, j) => {
        const c = activos(ctl.estado)[j];
        const pierde = conduce(u) ? 0 : Math.min(c.ps - 1, decimo(u));
        if (u.ps !== c.ps - pierde) falla(`¡Coches de choque!: ${u.especie} ${u.ps} != ${c.ps} - ${pierde}`);
        if (conduce(u) && f.r.eventos.some((x) => x.k === 'golpe' && x.j === j && x.fin)) falla(`¡Coches de choque!: ${u.especie} (Chispa/Petardo) recibe un golpe`);
        if (!conduce(u) && c.ps > 1 && !f.r.eventos.some((x) => x.k === 'golpe' && x.j === j && x.fin && x.dano === pierde)) falla(`¡Coches de choque!: falta el golpe de ${u.especie}`);
      });
      if (activos(f.r.estado)[3].ps !== 1) falla(`¡Coches de choque!: el de 4 PS queda en ${activos(f.r.estado)[3].ps} (debía quedar en 1, sin tumbarlo)`);
      if (f.r.eventos.some((x) => x.k === 'cae' && x.fin)) falla('¡Coches de choque! tumba a alguien');
    }
    // A full 1/10 on a big userito (a Mindundi/Grasa one at full health), and never less than 1.
    {
      const e = M.crearCombate(equipo(['tocinon', 'tocinon', 'turito', 'cajonazo']), 3, 'feria');
      e.turno = 4;
      e.sucesosVistos = M.sucesosDe('feria').filter((id) => id !== 'choque');
      let visto = false;
      for (let semilla = 1; semilla <= 400 && !visto; semilla++) {
        const x = structuredClone(e);
        x.semilla = semilla;
        const r = M.resolverTurno(x, [{ tipo: 'cana' }, { tipo: 'cana' }, { tipo: 'cana' }, { tipo: 'cana' }]);
        if (!r.eventos.some((q) => q.k === 'suceso' && q.id === 'choque')) continue;
        visto = true;
        const ctl = M.resolverTurno(sinSuceso(x), [{ tipo: 'cana' }, { tipo: 'cana' }, { tipo: 'cana' }, { tipo: 'cana' }]);
        activos(r.estado).forEach((u, j) => {
          if (u.ps !== activos(ctl.estado)[j].ps - decimo(u)) falla(`¡Coches de choque!: ${u.especie} pierde ${activos(ctl.estado)[j].ps - u.ps}, esperaba ${decimo(u)}`);
        });
      }
      if (!visto) falla('¡Coches de choque!: ninguna semilla lo saca en el caso grande');
    }
    // Se enchufa la pista: Chispa ×1.5 for three turns; whoever is not Chispa loses 1 Speed each time it takes a blow.
    const g = forzar('pista', 'feria', ['tragaperras', 'cajonazo', 'kbronero', 'draguserin']);
    if (g) {
      if (g.r.estado.sucesos.length !== 1 || g.r.estado.sucesos[0].id !== 'pista' || g.r.estado.sucesos[0].turnos !== 3) falla('Se enchufa la pista: debe durar 3 turnos');
      const comp = (limpio, atacante, mov, objetivo = 1) => {
        const e = structuredClone(g.r.estado);
        if (limpio) e.sucesos = [];
        e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: atacante, pp: [9, 9, 9, 9], niveles: { ata: 0, def: 0, vel: 0, esp: 0, prec: 0 } };
        blindar(e, objetivo);
        const r = M.resolverTurno(e, [ataca(idx(atacante, mov), objetivo), ...pasivas(e).slice(1)]);
        return { r, d: dano(r, objetivo), vel: activos(r.estado)[objetivo].niveles.vel };
      };
      // Chispa moves hit ×1.5; others do not change.
      for (const [esp, mov] of [['tragaperras', 'chispazo'], ['cubatillo', 'chispazo'], ['choquechu', 'chispazo']]) {
        const a = comp(false, esp, mov);
        const b = comp(true, esp, mov);
        if (!b.d || Math.abs(a.d - b.d * 1.5) > 2) falla(`Se enchufa la pista: ${mov} de ${esp} ${a.d} vs ${b.d} sin suceso (×1,5)`);
      }
      const noChispa = comp(false, 'tocinon', 'barrigazo');
      const noChispaCtl = comp(true, 'tocinon', 'barrigazo');
      if (noChispa.d !== noChispaCtl.d) falla(`Se enchufa la pista cambia un ataque que no es de Chispa (${noChispa.d} vs ${noChispaCtl.d})`);
      // The Speed of whoever takes a blow and is not Chispa: −1 (cajonazo, juerga) with the track, 0 without it; a Chispa userito (kbronero) keeps it.
      if (comp(false, 'tocinon', 'barrigazo', 1).vel !== -1) falla(`Se enchufa la pista: Cajonazo recibe un ataque y queda con Velocidad ${comp(false, 'tocinon', 'barrigazo', 1).vel}`);
      if (noChispaCtl.vel !== 0) falla('control de la pista: sin suceso baja la Velocidad');
      if (comp(false, 'tocinon', 'barrigazo', 2).vel !== 0) falla('Se enchufa la pista: baja la Velocidad a un userito de tipo Chispa');
      if (comp(false, 'tragaperras', 'chispazo', 1).vel !== -1) falla('Se enchufa la pista: un ataque de Chispa tampoco baja la Velocidad al que no es de Chispa?');
      // Each attack that lands counts once: two blows on the same target in one turn, −2.
      {
        const e = structuredClone(g.r.estado);
        e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: 'tocinon', pp: [9, 9, 9, 9] };
        e.jugadores[2].equipo[0] = { ...e.jugadores[2].equipo[0], especie: 'tocinon', pp: [9, 9, 9, 9] };
        blindar(e, 1);
        const r = M.resolverTurno(e, [ataca(0, 1), { tipo: 'cana' }, ataca(0, 1), { tipo: 'cana' }]);
        if (activos(r.estado)[1].niveles.vel !== -2) falla(`Se enchufa la pista: dos ataques dejan la Velocidad en ${activos(r.estado)[1].niveles.vel}, esperaba -2`);
      }
      // A status move that does not hit does not count; a miss neither (the blow must land).
      {
        const e = structuredClone(g.r.estado);
        e.jugadores[0].equipo[0] = { ...e.jugadores[0].equipo[0], especie: 'tocinon', pp: [9, 9, 9, 9] };
        blindar(e, 1);
        const r = M.resolverTurno(e, [ataca(idx('tocinon', 'siesta')), ...pasivas(e).slice(1)]);
        if (activos(r.estado)[1].niveles.vel !== 0) falla('Se enchufa la pista: baja la Velocidad sin recibir un ataque');
      }
      // Three turns: 3 → 2 → 1 → gone.
      const t1 = M.resolverTurno(g.r.estado, pasivas(g.r.estado));
      if (t1.estado.sucesos[0]?.turnos !== 2) falla('Se enchufa la pista: no le quedan 2 turnos');
      const t2 = M.resolverTurno(t1.estado, pasivas(t1.estado));
      if (t2.estado.sucesos[0]?.turnos !== 1) falla('Se enchufa la pista: no le queda 1 turno');
      const t3 = M.resolverTurno(t2.estado, pasivas(t2.estado));
      if (t3.estado.sucesos.length) falla('Se enchufa la pista: no se acaba a los 3 turnos');
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
  for (const esc of ['brio', 'terraza', 'rural', 'juan', 'feria']) {
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
      const esp = [0, 1, 2].map(() => M.ESPECIES[Math.floor(rnd() * M.ESPECIES.length)].id);
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
      const e = mk(['draguserin', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [], sem);
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
    const e = mk(['draguserin', 'cierzon', 'tocinon'], ['camioner', 'aceituna', 'cierzon'], rellena('llavero'), [], 4);
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
revisarTanda8();
revisarTanda9();
revisarUseritos33();
revisarTanda12();

// ---------------------------------------------------------------------------------------------------------------------
// Tanda 8: the six new useritos (Nº 25-30), their 13 moves and the 29 abilities. Deterministic cases: every move (data and effect), each
// ability in a minimal case, and that the species add up to 420. (Tanda 9, Mariachi and Pulpiño, is `revisarTanda9`.)
function revisarTanda8() {
  const ENT = ['fran', 'pablo', 'chuchi', 'guille'];
  const mk = (equipos, semilla = 3, extras = []) =>
    M.crearCombate(
      equipos.map((especies, i) => ({ entrenador: ENT[i], nombre: 'J' + i, bot: false, especies, ...extras[i] })),
      semilla,
    );
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const cana = { tipo: 'cana' };
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const act0 = (e, j = 0) => e.jugadores[j].equipo[e.jugadores[j].activo];
  const seguro = (e, j) => (act0(e, j).niveles.prec = 6); // accuracy ×4: it never misses
  const NEUTRO = 'gratinado'; // an ability that does nothing in these cases (for the same state without the ability)
  const conHab = (esp, hab, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.habilidad;
    sp.habilidad = hab;
    try {
      return fn();
    } finally {
      sp.habilidad = antes;
    }
  };
  const conMov = (esp, i, mov, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.movs[i];
    sp.movs[i] = mov;
    try {
      return fn();
    } finally {
      sp.movs[i] = antes;
    }
  };
  const habs = (r, id, j) => r.eventos.filter((ev) => ev.k === 'habilidad' && ev.id === id && (j === undefined || ev.j === j));
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave);
  const dano = (r, j) => golpes(r, j).reduce((n, ev) => n + ev.dano, 0);
  const niveles = (r, j) => act0(r.estado, j).niveles;
  const pos = (r, f) => r.eventos.findIndex(f);
  /** The ability event of `id` comes before the first event that matches `f` (its effect). */
  const antesDe = (r, id, f, ctx) => {
    const a = pos(r, (ev) => ev.k === 'habilidad' && ev.id === id);
    const b = pos(r, f);
    if (a < 0 || b < 0 || a > b) falla(`${ctx}: el evento de la habilidad ${id} debe ir antes de su efecto (${a}, ${b})`);
  };
  /** A turn in which this species does nothing harmful: its first move is Cinturones (a self-boost; `cana` is not a pass: it drinks or picks a random move). */
  const quieto = (esp, fn) => conMov(esp, 0, 'cinturones', fn);
  const razon = (n, d) => (d ? n / d : 0);
  const semillas = (n) => Array.from({ length: n }, (_, i) => i + 1);

  for (const k of ['combate.ficha', 'combate.limon', 'combate.improvisa', 'hab.titulo', 'hab.fotosintesis.cura']) if (!textos.has(k)) falla(`falta el texto ${k}`);
  for (const k of ['draft.habinfo']) {
    // `draft.*` lives in pokeusera.md (interface texts), not in the combat file.
    if (!readFileSync(join(raiz, 'src/textos/pokeusera.md'), 'utf8').includes(`\n${k} =`)) falla(`falta el texto ${k} en pokeusera.md`);
  }

  // --- Data: 30 useritos, the six new ones at the end (Nº 25-30), all of them adding up to 420, the types spread between 4 and 6.
  {
    if (M.ESPECIES.length !== 37) falla(`hay ${M.ESPECIES.length} useritos, esperaba 37`);
    const viejos = 'draguserin,goudazard,aceituna,cierzon,turroncho,tocinon,roscochoco,espumarro,cajonazo,lentejasur,tragaperras,turito,resacon,evoscar,chupitochu,caravaner,camioner,criaturitah,ego-ego,kbronero,cubatillo,p,jesuspelo,pantaloneto';
    if (M.ESPECIES.slice(0, 24).map((s) => s.id).join() !== viejos) falla('los Nº 1-24 han cambiado de sitio');
    const nuevos = [
      ['maletrio', ['bronca', 'fantasma'], [90, 100, 105, 55, 70], 'maletazo,embarque,cinturones,venganza', 'maleta'],
      ['teloneon', ['chanza', 'fantasma'], [70, 75, 65, 110, 100], 'improvisa,monologo,zasca,susto', 'publico'],
      ['choquechu', ['chispa', 'petardo'], [80, 80, 80, 100, 80], 'carambola,ficha,chispazo,fogonazo', 'corriente'],
      ['torrezmon', ['grasa', 'droga'], [85, 65, 70, 100, 100], 'crujiente,limon,fritanga,pringue', 'grasiento'],
      ['papiroflexeon', ['ventolera'], [85, 110, 75, 100, 50], 'cortepapel,papiroflexia,rebufo,chuleria', 'viento'],
      ['ceceseta', ['juerga', 'chanza'], [95, 95, 80, 85, 65], 'pasodoble,mancha,cancion,zasca', 'fan'],
    ];
    nuevos.forEach(([id, tipos, b, movs, hab], i) => {
      const sp = M.ESPECIES[24 + i];
      if (sp.id !== id) falla(`Nº ${25 + i}: es ${sp.id}, esperaba ${id}`);
      if (sp.tipos.join() !== tipos.join()) falla(`${id}: tipos ${sp.tipos}`);
      if ([sp.base.ps, sp.base.ata, sp.base.def, sp.base.vel, sp.base.esp].join() !== b.join()) falla(`${id}: estadísticas ${JSON.stringify(sp.base)}`);
      if (sp.movs.join() !== movs) falla(`${id}: movimientos ${sp.movs}`);
      if (sp.habilidad !== hab) falla(`${id}: habilidad ${sp.habilidad}`);
    });
    for (const sp of M.ESPECIES) {
      const suma = sp.base.ps + sp.base.ata + sp.base.def + sp.base.vel + sp.base.esp;
      if (suma !== 420) falla(`${sp.id} suma ${suma} (todos 420)`);
    }
    const porTipo = {};
    for (const sp of M.ESPECIES) for (const tp of sp.tipos) porTipo[tp] = (porTipo[tp] ?? 0) + 1;
    for (const [tp, n] of Object.entries(porTipo)) if (tp === 'mindundi' ? n !== 8 : n < 4 || n > 8) falla(`tipo ${tp}: ${n} useritos (4-8, Mindundi 8)`);
  }

  // --- Data: the 13 new moves.
  {
    const tabla = {
      maletazo: ['bronca', 90, 100, 8, 'uno', 0],
      embarque: ['bronca', 40, 100, 10, 'uno', 1],
      cinturones: ['bronca', null, null, 5, 'yo', 0],
      improvisa: ['chanza', null, null, 8, 'yo', 0],
      monologo: ['chanza', 55, 100, 5, 'todos', 0],
      carambola: ['chispa', 70, 100, 5, 'todos', 0],
      ficha: ['chispa', null, null, 5, 'yo', 0],
      crujiente: ['grasa', 25, 90, 10, 'uno', 0],
      limon: ['droga', null, null, 5, 'yo', 0],
      cortepapel: ['ventolera', 80, 100, 8, 'uno', 0],
      papiroflexia: ['ventolera', null, null, 5, 'yo', 0],
      pasodoble: ['juerga', 80, 100, 8, 'uno', 0],
      mancha: ['alcohol', 75, 100, 8, 'uno', 0],
    };
    for (const [id, [tipo, pot, prec, pp, obj, prio]] of Object.entries(tabla)) {
      const m = M.MOVS[id];
      if (!m) {
        falla(`falta el movimiento ${id}`);
        continue;
      }
      if (m.tipo !== tipo || m.pot !== pot || m.prec !== prec || m.pp !== pp || m.objetivo !== obj || (m.prioridad ?? 0) !== prio) falla(`${id}: datos ${JSON.stringify(m)}`);
      if (!textos.has(`mov.${id}.desc`)) falla(`falta mov.${id}.desc`);
      const duenos = M.ESPECIES.filter((sp) => sp.movs.includes(id)).length;
      if (duenos !== 1) falla(`${id}: ${duenos} dueños (uno solo)`);
    }
    const ef = M.EFECTOS;
    if (ef.maletazo.nivel[0].stat !== 'def' || ef.maletazo.nivel[0].prob !== 20 || ef.maletazo.nivel[0].cambio !== -1) falla('Maletazo: 20 % de bajar 1 la Defensa');
    if (ef.cinturones.nivel.map((n) => `${n.a}${n.stat}${n.cambio}`).join() !== 'yoata1,yodef1') falla('Cinturones: +1 Ata y +1 Def');
    if (ef.monologo.nivel[0].stat !== 'esp' || ef.monologo.nivel[0].prob !== 20) falla('Monólogo: 20 % de bajar el Especial');
    if (ef.carambola.nivel[0].stat !== 'vel' || ef.carambola.nivel[0].prob !== 20) falla('Carambola: 20 % de bajar la Velocidad');
    if (ef.crujiente.golpes !== 'multi' || ef.cortepapel.critico !== 3) falla('Crujiente multigolpe, Corte de papel ×3');
    if (ef.papiroflexia.nivel.map((n) => `${n.stat}${n.cambio}`).join() !== 'ata1,vel1') falla('Papiroflexia: +1 Ata y +1 Vel');
    if (ef.pasodoble.nivel[0].a !== 'yo' || ef.pasodoble.nivel[0].stat !== 'vel' || ef.pasodoble.nivel[0].prob !== 30) falla('Pasodoble: 30 % de subir su Velocidad');
    if (ef.mancha.nivel[0].stat !== 'prec' || ef.mancha.nivel[0].prob !== 30 || ef.mancha.nivel[0].a !== 'objetivo') falla('Mancha: 30 % de bajar la Precisión');
    // The pool of ¡Improvisa!: no protection (+2), no «Sí, y…», no desperate move, not itself, none with exactly one owner.
    for (const id of M.MOVS_IMPROVISA) {
      const duenos = M.ESPECIES.filter((sp) => sp.movs.includes(id)).length;
      if ((M.MOVS[id].prioridad ?? 0) >= 2 || id === 'siy' || id === M.DESESPERADA || id === 'improvisa' || id === 'tendedero' || id === 'remate' || duenos === 1) falla(`¡Improvisa! puede sacar ${id}`);
    }
    if (M.MOVS_IMPROVISA.length < 20) falla(`¡Improvisa! solo tiene ${M.MOVS_IMPROVISA.length} movimientos`);
  }

  // --- Moves: Maletazo (20 % Def −1), Embarque prioritario (+1), Cinturones, Monólogo, Carambola, Pasodoble, Mancha.
  {
    let bajan = 0;
    let n = 0;
    for (const sem of semillas(120)) {
      const r = M.resolverTurno(mk([['maletrio', 'turito', 'tocinon'], ['turito', 'tocinon', 'cierzon']], sem), [ataca(0), cana]);
      if (!dano(r, 1)) continue;
      n++;
      const d = niveles(r, 1).def;
      if (d !== 0 && d !== -1) falla(`Maletazo: Def ${d}`);
      if (d === -1) bajan++;
    }
    if (n < 100 || bajan < 0.1 * n || bajan > 0.32 * n) falla(`Maletazo: ${bajan} de ${n} bajan la Defensa (20 %)`);
    // Embarque: Maletrio (Vel 55) goes before the faster Cierzón (Vel 105) that uses a normal move; without it, after.
    {
      const e = mk([['maletrio', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']]);
      const r = M.resolverTurno(e, [ataca(idx('maletrio', 'embarque')), ataca(idx('cierzon', 'planeo'), 0)]);
      const usos = r.eventos.filter((ev) => ev.k === 'usa').map((ev) => ev.mov).join();
      if (usos !== 'embarque,planeo') falla(`Embarque prioritario va el primero: ${usos}`);
      const r2 = M.resolverTurno(e, [ataca(idx('maletrio', 'maletazo')), ataca(idx('cierzon', 'planeo'), 0)]);
      if (r2.eventos.filter((ev) => ev.k === 'usa').map((ev) => ev.mov).join() !== 'planeo,maletazo') falla('Maletazo (prioridad 0) va después del más rápido');
    }
    // Cinturones: +1 Ata, +1 Def, nothing else.
    {
      const r = M.resolverTurno(mk([['maletrio', 'turito', 'tocinon'], ['cubatillo', 'tocinon', 'cierzon']]), [ataca(idx('maletrio', 'cinturones')), cana]);
      const nv = niveles(r, 0);
      if (nv.ata !== 1 || nv.def !== 1 || nv.vel !== 0 || nv.esp !== 0 || dano(r, 1)) falla(`Cinturones: ${JSON.stringify(nv)}`);
    }
    // Monólogo (all rivals, 20 % Especial −1) and Carambola (all rivals, 20 % Velocidad −1).
    for (const [esp, mov, stat] of [['teloneon', 'monologo', 'esp'], ['choquechu', 'carambola', 'vel']]) {
      let bajan2 = 0;
      let total = 0;
      for (const sem of semillas(60)) {
        const e = mk([[esp, 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']], sem);
        const r = M.resolverTurno(e, [ataca(idx(esp, mov), 0), cana, cana, cana]);
        for (const j of [1, 2, 3]) {
          if (!dano(r, j)) continue;
          total++;
          const v = niveles(r, j)[stat];
          if (v !== 0 && v !== -1) falla(`${mov}: ${stat} ${v}`);
          if (v === -1) bajan2++;
        }
        if (golpes(r, 1).length + golpes(r, 2).length + golpes(r, 3).length < 3) falla(`${mov}: no pega a los tres rivales`);
      }
      if (total < 150 || bajan2 < 0.1 * total || bajan2 > 0.32 * total) falla(`${mov}: ${bajan2} de ${total} bajan ${stat} (20 %)`);
    }
    // Pasodoble: 30 % to raise the user's Speed; Mancha de cerveza: 30 % to lower the target's accuracy.
    for (const [esp, mov, quien, stat, signo] of [['ceceseta', 'pasodoble', 0, 'vel', 1], ['ceceseta', 'mancha', 1, 'prec', -1]]) {
      let cambian = 0;
      let total = 0;
      for (const sem of semillas(120)) {
        const r = M.resolverTurno(mk([[esp, 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem), [ataca(idx(esp, mov)), cana]);
        if (!dano(r, 1)) continue;
        total++;
        const v = niveles(r, quien)[stat];
        if (v !== 0 && v !== signo) falla(`${mov}: ${stat} ${v}`);
        if (v === signo) cambian++;
      }
      if (total < 100 || cambian < 0.2 * total || cambian > 0.42 * total) falla(`${mov}: ${cambian} de ${total} cambian ${stat} (30 %)`);
    }
  }

  // --- ¡Improvisa!: a random move of the game (never a protection, a one-owner move, «Sí, y…», the desperate one or itself), a random rival if it needs one.
  {
    const vistos = new Set();
    const objetivos = new Set();
    for (const sem of semillas(200)) {
      const e = mk([['teloneon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('teloneon', 'improvisa'), undefined), cana, cana, cana]);
      const texto = r.eventos.find((ev) => ev.clave === 'combate.improvisa');
      const usa = r.eventos.find((ev) => ev.k === 'usa' && ev.mov === 'improvisa');
      if (!texto || !usa) {
        falla('¡Improvisa!: falta «usó» o la frase');
        continue;
      }
      const elegido = r.estado.ultimoMov;
      if (!M.MOVS_IMPROVISA.includes(elegido)) falla(`¡Improvisa! sacó ${elegido}, que no está en su lista`);
      if (texto.vars.mov !== M.MOVS[elegido].nombre) falla('¡Improvisa!: la frase no dice el movimiento elegido');
      vistos.add(elegido);
      if (M.MOVS[elegido].objetivo === 'uno') {
        if (usa.obj.length !== 1 || usa.obj[0] === 0) falla(`¡Improvisa! con ${elegido}: objetivos ${usa.obj}`);
        else objetivos.add(usa.obj[0]);
      }
      if (M.MOVS[elegido].objetivo === 'todos' && usa.obj.length !== 3) falla(`¡Improvisa! con ${elegido} a todos: ${usa.obj}`);
      // Deterministic: the same state and choice give the same events.
      if (sem <= 5 && JSON.stringify(M.resolverTurno(e, [ataca(idx('teloneon', 'improvisa'), undefined), cana, cana, cana])) !== JSON.stringify(r)) falla('¡Improvisa! no es determinista');
    }
    if (vistos.size < 15) falla(`¡Improvisa! solo sacó ${vistos.size} movimientos distintos en 200 intentos`);
    if (objetivos.size < 3) falla(`¡Improvisa!: los objetivos al azar no cubren a los tres rivales (${[...objetivos]})`);
    // «Sí, y…» after it copies the move that came out.
    const e = mk([['teloneon', 'turito', 'tocinon'], ['evoscar', 'turito', 'tocinon']], 7);
    const r = M.resolverTurno(e, [ataca(idx('teloneon', 'improvisa'), undefined), cana]);
    if (r.estado.ultimoMov === 'improvisa') falla('¡Improvisa!: ultimoMov debe ser el movimiento que salió');
  }

  // --- Otra ficha (heals half, takes the statuses off, next turn it does nothing) and Con limón (takes the statuses off, +1 Especial).
  {
    const e = mk([['choquechu', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const u = act0(e);
    u.ps = 20;
    u.estado = 'quemado';
    u.achispado = 3;
    const r = M.resolverTurno(e, [ataca(idx('choquechu', 'ficha')), cana]);
    const v = act0(r.estado);
    if (v.estado || v.achispado || v.vol.bostezo !== -1) falla('Otra ficha: debe quitar los estados');
    // The burn at the end of the turn does not exist any more: 20 + half of the max HP.
    if (v.ps !== 20 + Math.floor(v.psMax / 2)) falla(`Otra ficha: PS ${v.ps}, esperaba ${20 + Math.floor(v.psMax / 2)}`);
    if (!v.vol.recarga) falla('Otra ficha: debe dejarlo recargando');
    // Next turn it recharges: no move is used.
    const r2 = M.resolverTurno(r.estado, [ataca(idx('choquechu', 'chispazo')), cana]);
    if (!r2.eventos.some((ev) => ev.clave === 'combate.recarga') || r2.eventos.some((ev) => ev.k === 'usa' && ev.j === 0)) falla('Otra ficha: el turno siguiente no debe hacer nada');
    const r3 = M.resolverTurno(r2.estado, [ataca(idx('choquechu', 'chispazo')), cana]);
    if (!r3.eventos.some((ev) => ev.k === 'usa' && ev.j === 0)) falla('Otra ficha: dos turnos después ya actúa');
    // With full HP and no status it fails (like Siesta), without recharging.
    const f = mk([['choquechu', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const rf = M.resolverTurno(f, [ataca(idx('choquechu', 'ficha')), cana]);
    if (!rf.eventos.some((ev) => ev.k === 'falla' && ev.j === 0) || act0(rf.estado).vol.recarga) falla('Otra ficha: sana y sin estado debe fallar sin recargar');
    // Con limón.
    const l = mk([['torrezmon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    act0(l).estado = 'quemado';
    act0(l).achispado = 2;
    const rl = M.resolverTurno(l, [ataca(idx('torrezmon', 'limon')), cana]);
    const w = act0(rl.estado);
    if (w.estado || w.achispado || w.niveles.esp !== 1 || w.vol.recarga) falla(`Con limón: ${JSON.stringify({ e: w.estado, a: w.achispado, esp: w.niveles.esp })}`);
    if (!rl.eventos.some((ev) => ev.k === 'estado' && ev.j === 0 && ev.estado === null && ev.de === 'quemado')) falla('Con limón: falta el evento de fin de estado');
  }

  // --- Crujiente (2 to 5 hits) and Corte de papel (three times the critical hits).
  {
    const cuenta = new Map();
    for (const sem of semillas(150)) {
      const r = M.resolverTurno(mk([['torrezmon', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem), [ataca(idx('torrezmon', 'crujiente')), cana]);
      if (!r.eventos.some((ev) => ev.k === 'golpe')) continue;
      const n = golpes(r, 1).length;
      cuenta.set(n, (cuenta.get(n) ?? 0) + 1);
    }
    if ([...cuenta.keys()].some((n) => n < 2 || n > 5) || [2, 3, 4, 5].some((n) => !cuenta.get(n))) falla(`Crujiente: golpes ${JSON.stringify([...cuenta])}`);
    const tasa = (mov, N = 500) => {
      let crit = 0;
      let golpesN = 0;
      for (const sem of semillas(N)) {
        const e = mk([['papiroflexeon', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
        act0(e, 1).ps = act0(e, 1).psMax = 9999;
        const r = M.resolverTurno(e, [ataca(idx('papiroflexeon', mov)), cana]);
        for (const g of golpes(r, 1)) {
          golpesN++;
          if (g.critico) crit++;
        }
      }
      return razon(crit, golpesN);
    };
    // Vel base 100: 100/512 = 20 % of critical hits; Corte de papel: 59 % (three times).
    const normal = tasa('rebufo');
    const papel = tasa('cortepapel');
    if (normal < 0.14 || normal > 0.26) falla(`críticos de Rebufo: ${normal.toFixed(2)} (esperaba ~0,20)`);
    if (papel < 0.49 || papel > 0.69) falla(`críticos de Corte de papel: ${papel.toFixed(2)} (esperaba ~0,59)`);
  }

  // --- Habilidades: data (each userito, each text) and one minimal case per ability.
  {
    const tabla = {
      draguserin: 'fuego_dragon', goudazard: 'gratinado', aceituna: 'buena_chica', cierzon: 'manico', turroncho: 'duro_de_roer', tocinon: 'kilos', roscochoco: 'indigesto', espumarro: 'espuma',
      cajonazo: 'cajon', lentejasur: 'inesperado', tragaperras: 'bote', turito: 'conazo', resacon: 'curado', evoscar: 'dos_cabezas', chupitochu: 'ardiente', caravaner: 'pareja', camioner: 'pareja',
      criaturitah: 'fotosintesis', 'ego-ego': 'flipado', kbronero: 'volumen', cubatillo: 'hielo', p: 'pesadisimo', jesuspelo: 'ola', pantaloneto: 'lavado', maletrio: 'maleta', teloneon: 'publico',
      choquechu: 'corriente', torrezmon: 'grasiento', papiroflexeon: 'viento', ceceseta: 'fan', mariachi: 'cantaynollores', pulpino: 'malaleche',
      cilantrox: 'jabon', fotomaton: 'tira', cloudtrio: 'blandito', cigarr: 'humo', ollalocah: 'feria',
    };
    for (const sp of M.ESPECIES) {
      if (sp.habilidad !== tabla[sp.id]) falla(`${sp.id}: habilidad ${sp.habilidad}, esperaba ${tabla[sp.id]}`);
      for (const c of ['nombre', 'desc']) if (!textos.has(`hab.${sp.habilidad}.${c}`)) falla(`falta hab.${sp.habilidad}.${c}`);
    }
    if (new Set(Object.values(tabla)).size !== 36) falla('deberían ser 36 habilidades distintas (Caravaner y Camioner comparten una)');
  }

  // Fuego de dragón: its Petardo attacks burn twice as often (Petardazo 30 % → 60 %), and the ability is told before the burn.
  {
    const quemadas = (hab) =>
      conHab('draguserin', hab, () => {
        let q = 0;
        let ok = true;
        for (const sem of semillas(300)) {
          const e = mk([['draguserin', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']], sem);
          seguro(e, 0);
          const r = M.resolverTurno(e, [ataca(idx('draguserin', 'petardazo')), cana]);
          if (act0(r.estado, 1).estado === 'quemado' && r.eventos.some((ev) => ev.k === 'estado' && ev.estado === 'quemado')) {
            q++;
            if (hab === 'fuego_dragon') {
              const a = pos(r, (ev) => ev.k === 'habilidad' && ev.id === 'fuego_dragon');
              const b = pos(r, (ev) => ev.k === 'estado' && ev.estado === 'quemado');
              if (a < 0 || a > b) ok = false;
            }
          }
        }
        return { q, ok };
      });
    const con = quemadas('fuego_dragon');
    const sin = quemadas(NEUTRO);
    if (!con.ok) falla('Fuego de dragón: el evento de la habilidad debe ir antes de la quemadura');
    if (sin.q < 60 || con.q / sin.q < 1.6 || con.q / sin.q > 2.4) falla(`Fuego de dragón: ${con.q} quemaduras con él y ${sin.q} sin él (esperaba el doble)`);
  }

  // Gratinado (Goudazard cannot be burnt) and Ya estoy curado (Resacón cannot be tipsy), Dos cabezas (Evoscar cannot sleep): the status never lands.
  {
    let quemado = 0;
    let avisos = 0;
    for (const sem of semillas(150)) {
      const e = mk([['draguserin', 'turito', 'tocinon'], ['goudazard', 'turito', 'tocinon']], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('draguserin', 'petardazo')), cana]);
      if (act0(r.estado, 1).estado === 'quemado') quemado++;
      avisos += habs(r, 'gratinado', 1).length;
    }
    if (quemado || avisos < 20) falla(`Gratinado: ${quemado} quemaduras y ${avisos} avisos`);
    // Resacón vs another Resacón: Dolor de cabeza (100 %) does not make it tipsy; a control target gets tipsy.
    for (const [objetivo, tipsy] of [['resacon', false], ['turito', true]]) {
      const e = mk([['resacon', 'turito', 'tocinon'], [objetivo, 'tocinon', 'cierzon']]);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('resacon', 'dolor')), cana]);
      const achispado = act0(r.estado, 1).achispado > 0;
      if (achispado !== tipsy) falla(`Ya estoy curado: ${objetivo} achispado=${achispado}`);
      if (!tipsy) {
        if (habs(r, 'curado', 1).length !== 1) falla('Ya estoy curado: falta el aviso');
        if (r.eventos.some((ev) => ev.k === 'estado' && ev.estado === 'achispado')) falla('Ya estoy curado: no debe salir «achispado»');
      }
    }
    // Dos cabezas: Esporas (sleep 100 %, accuracy 75) and Bostezo do not work on Evoscar; Turito falls asleep.
    for (const [objetivo, duerme] of [['evoscar', false], ['turito', true]]) {
      const e = mk([['criaturitah', 'turito', 'tocinon'], [objetivo, 'tocinon', 'cierzon']]);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('criaturitah', 'esporas')), cana]);
      if ((act0(r.estado, 1).estado === 'dormido') !== duerme) falla(`Dos cabezas: ${objetivo} dormido=${act0(r.estado, 1).estado}`);
      if (!duerme && habs(r, 'dos_cabezas', 1).length !== 1) falla('Dos cabezas: falta el aviso con Esporas');
    }
    {
      const e = mk([['turito', 'cierzon', 'tocinon'], ['evoscar', 'tocinon', 'cierzon']]);
      const r = M.resolverTurno(e, [ataca(idx('turito', 'bostezo')), cana]);
      if (act0(r.estado, 1).vol.bostezo !== -1 || habs(r, 'dos_cabezas', 1).length !== 1) falla('Dos cabezas: el Bostezo no debe quedarse pendiente');
    }
    // Copying Siesta (a move Evoscar does not carry): it heals without sleeping.
    conMov('evoscar', 3, 'siesta', () => {
      const e = mk([['evoscar', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
      act0(e).ps = Math.floor(act0(e).psMax / 4);
      const r = M.resolverTurno(e, [ataca(3), cana]);
      const w = act0(r.estado);
      if (w.estado || w.ps <= act0(e).ps) falla('Dos cabezas: la Siesta debe curar sin dormir');
    });
  }

  // Buena chica: whoever hits Aceituna with an attack at one has a 30 % to lose 1 Attack; an attack at all never does.
  {
    let bajan = 0;
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'tocinon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), cana]);
      if (!dano(r, 1)) continue;
      n++;
      const hay = habs(r, 'buena_chica', 1).length;
      if ((niveles(r, 0).ata === -1) !== (hay === 1)) falla('Buena chica: el aviso y el Ataque bajado no coinciden');
      if (hay) {
        bajan++;
        antesDe(r, 'buena_chica', (ev) => ev.k === 'nivel' && ev.j === 0 && ev.stat === 'ata' && ev.cambio === -1, 'Buena chica');
      }
    }
    if (n < 150 || bajan < 0.2 * n || bajan > 0.4 * n) falla(`Buena chica: ${bajan} de ${n} (30 %)`);
    for (const sem of semillas(30)) {
      const e = mk([['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'tocinon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('tocinon', 'temblor')), cana]);
      if (habs(r, 'buena_chica').length || niveles(r, 0).ata !== 0) falla('Buena chica: no vale contra un ataque a todos');
    }
  }

  // Mañico (Cierzón): each time a rival lowers a stat of his, his Attack goes up 2. La espuma no baja (Espumarro): the drop never lands.
  {
    const e = mk([['camioner', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']]);
    const r = M.resolverTurno(e, [ataca(idx('camioner', 'bocinazo')), cana]);
    if (niveles(r, 1).ata !== 1) falla(`Mañico: Ataque ${niveles(r, 1).ata}, esperaba -1 + 2 = 1`);
    const niv = r.eventos.filter((ev) => ev.k === 'nivel' && ev.j === 1).map((ev) => ev.cambio).join();
    if (niv !== '-1,2' || habs(r, 'manico', 1).length !== 1) falla(`Mañico: niveles ${niv}`);
    antesDe(r, 'manico', (ev) => ev.k === 'nivel' && ev.j === 1 && ev.cambio === 2, 'Mañico');
    // It does not answer to the suceso's drops (they are not a rival's doing).
    const e2 = mk([['camioner', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']]);
    e2.turno = 4;
    e2.escenario = 'terraza';
    e2.sucesosVistos = [];
    let visto = false;
    for (const sem of semillas(60)) {
      e2.semilla = sem;
      const rr = M.resolverTurno(e2, [cana, cana]);
      if (rr.eventos.some((ev) => ev.k === 'suceso' && ev.id === 'cierzo')) {
        visto = true;
        if (niveles(rr, 1).ata !== 0 || niveles(rr, 1).vel !== -1) falla('Mañico: el suceso Cierzo de golpe no cuenta como rival');
      }
    }
    if (!visto) falla('Mañico: control, no salió Cierzo de golpe');
    // La espuma no baja.
    const g = mk([['camioner', 'turito', 'tocinon'], ['espumarro', 'turito', 'tocinon']]);
    const rg = M.resolverTurno(g, [ataca(idx('camioner', 'bocinazo')), cana]);
    if (niveles(rg, 1).ata !== 0 || habs(rg, 'espuma', 1).length !== 1 || rg.eventos.some((ev) => ev.k === 'nivel')) falla('La espuma no baja: Bocinazo no debe bajar nada');
    const turra = mk([['turito', 'camioner', 'tocinon'], ['espumarro', 'turito', 'tocinon']]);
    const rt = M.resolverTurno(turra, [ataca(idx('turito', 'turra')), cana]);
    if (niveles(rt, 1).ata !== 0 || niveles(rt, 1).esp !== 0) falla('La espuma no baja: Turra tampoco');
    // Espumarro still raises its own (and a rival's boost on a rival is not its business).
    const s = M.resolverTurno(mk([['espumarro', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]), [ataca(idx('espumarro', 'garrafon')), cana]);
    if (niveles(s, 0).ata !== 0) falla('La espuma no baja: nada que comprobar');
    // Mañico and Espumarro together: Coñazo (Turito) hits both on coming out; Espumarro keeps its Ataque, Cierzón ends at +1.
    const c = mk([['turito', 'turito', 'tocinon'], ['espumarro', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']]);
    const rc = M.resolverTurno(c, [cana, cana, cana]);
    if (niveles(rc, 1).ata !== 0 || niveles(rc, 2).ata !== 1) falla(`Coñazo contra Espumarro (${niveles(rc, 1).ata}) y Cierzón (${niveles(rc, 2).ata})`);
  }

  // Duro de roer (Turroncho): critical hits against it do ×1.5 instead of ×2 (each one says so). Bote acumulado (Tragaperras): twice the critical hits.
  {
    const criticos = (objetivo, hab) =>
      conHab(objetivo, hab, () => {
        let c = 0;
        let hay = 0;
        for (const sem of semillas(150)) {
          const e = mk([['papiroflexeon', 'turito', 'tocinon'], [objetivo, 'turito', 'tocinon']], sem);
          act0(e, 1).ps = act0(e, 1).psMax = 9999;
          const r = M.resolverTurno(e, [ataca(idx('papiroflexeon', 'cortepapel')), cana]);
          c += golpes(r, 1).filter((g) => g.critico).length;
          hay += habs(r, 'duro_de_roer', 1).length;
        }
        return { c, hay };
      });
    const con = criticos('turroncho', 'duro_de_roer');
    const sin = criticos('turroncho', NEUTRO);
    if (con.c < 50 || con.hay !== con.c || sin.c < 50 || sin.hay) falla(`Duro de roer: ${con.c} críticos y ${con.hay} avisos con él; ${sin.c} críticos sin él`);
    const tasa = (hab) =>
      conHab('tragaperras', hab, () => {
        let c = 0;
        let n = 0;
        for (const sem of semillas(500)) {
          const e = mk([['tragaperras', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
          act0(e, 1).ps = act0(e, 1).psMax = 9999;
          const r = M.resolverTurno(e, [ataca(idx('tragaperras', 'chispazo')), cana]);
          for (const g of golpes(r, 1)) {
            n++;
            if (g.critico) c++;
          }
        }
        return razon(c, n);
      });
    // Vel base 90: 90/512 = 17.6 %; with Bote acumulado 35.2 %.
    const con2 = tasa('bote');
    const sin2 = tasa(NEUTRO);
    if (sin2 < 0.12 || sin2 > 0.24 || con2 < 0.28 || con2 > 0.43) falla(`Bote acumulado: ${con2.toFixed(2)} con él, ${sin2.toFixed(2)} sin él`);
  }

  // 152 kilos (Tocinón): Remolino and flinching do nothing to it.
  {
    const remolino = (objetivo) =>
      conMov('cierzon', 0, 'remolino', () => {
        const e = mk([['cierzon', 'turito', 'tocinon'], [objetivo, 'aceituna', 'cierzon']]);
        seguro(e, 0);
        return M.resolverTurno(e, [ataca(0), cana]);
      });
    const rk = remolino('tocinon');
    if (act0(rk.estado, 1).especie !== 'tocinon' || habs(rk, 'kilos', 1).length !== 1 || rk.eventos.some((ev) => ev.k === 'sale')) falla('152 kilos: Remolino no debe moverle');
    const rt = remolino('turito');
    if (act0(rt.estado, 1).especie === 'turito' || !rt.eventos.some((ev) => ev.k === 'sale')) falla('Remolino: control, debe mover a un Turito '+JSON.stringify(rt.eventos.map(x=>x.k+(x.id||x.mov||x.dano||''))));
    // Taconeo (20 % flinch) against a slowed Tocinón that has not acted yet.
    const retrocede = (objetivo, hab) =>
      conHab(objetivo, hab, () => {
        let n = 0;
        let avisos = 0;
        for (const sem of semillas(200)) {
          const e = mk([['cajonazo', 'turito', 'tocinon'], [objetivo, 'turito', 'cierzon']], sem);
          seguro(e, 0);
          act0(e, 1).niveles.vel = -6;
          const r = M.resolverTurno(e, [ataca(idx('cajonazo', 'taconeo')), ataca(0, 0)]);
          if (r.eventos.some((ev) => ev.clave === 'combate.retrocede')) n++;
          avisos += habs(r, 'kilos', 1).length;
        }
        return { n, avisos };
      });
    const con = retrocede('tocinon', 'kilos');
    const sin = retrocede('tocinon', NEUTRO);
    if (con.n !== 0 || con.avisos < 15 || sin.n < 15) falla(`152 kilos: ${con.n} retrocesos con él (${con.avisos} avisos), ${sin.n} sin él`);
  }

  // Indigesto (Roscochoco) and Ardiente (Chupitochu): 30 % that whoever hits them with a physical attack gets an empacho / is burnt; a special attack, never.
  // Pesadísimo (P): whoever hits it with a physical attack loses 1 Speed (always).
  {
    for (const [objetivo, estado, id] of [['roscochoco', 'empachado', 'indigesto'], ['chupitochu', 'quemado', 'ardiente']]) {
      let n = 0;
      let pega = 0;
      for (const sem of semillas(200)) {
        const e = mk([['tocinon', 'turito', 'cierzon'], [objetivo, 'turito', 'tocinon']], sem);
        const r = M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), cana]);
        if (!dano(r, 1)) continue;
        n++;
        const hay = habs(r, id, 1).length;
        const tiene = act0(r.estado, 0).estado === estado;
        if (hay && !tiene) falla(`${id}: el aviso sin el estado`);
        if (hay) {
          pega++;
          antesDe(r, id, (ev) => ev.k === 'estado' && ev.j === 0 && ev.estado === estado, id);
        }
      }
      if (n < 150 || pega < 0.2 * n || pega > 0.4 * n) falla(`${id}: ${pega} de ${n} (30 %)`);
      // A special attack (Chispa) from a Mindundi/Chispa user never triggers it.
      for (const sem of semillas(40)) {
        const e = mk([['tragaperras', 'turito', 'cierzon'], [objetivo, 'turito', 'tocinon']], sem);
        const r = M.resolverTurno(e, [ataca(idx('tragaperras', 'chispazo')), cana]);
        if (habs(r, id).length || act0(r.estado, 0).estado === estado) falla(`${id}: no vale contra un ataque especial`);
      }
    }
    for (const sem of semillas(20)) {
      const e = mk([['tocinon', 'turito', 'cierzon'], ['p', 'turito', 'tocinon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), cana]);
      if (!dano(r, 1)) continue;
      if (niveles(r, 0).vel !== -1 || habs(r, 'pesadisimo', 1).length !== 1) falla(`Pesadísimo: Vel ${niveles(r, 0).vel}`);
      const e2 = mk([['tragaperras', 'turito', 'cierzon'], ['p', 'turito', 'tocinon']], sem);
      const r2 = M.resolverTurno(e2, [ataca(idx('tragaperras', 'chispazo')), cana]);
      if (niveles(r2, 0).vel !== 0 || habs(r2, 'pesadisimo').length) falla('Pesadísimo: no vale contra un ataque especial');
    }
  }

  // Duro como un cajón (Cajonazo): from full HP no blow knocks it out (it stays at 1 HP); not when it was already hurt; Guille keeps his Mañico.
  {
    const golpe = (ps, entrenadorGuille) => {
      const e = mk([['tocinon', 'turito', 'cierzon'], ['cajonazo', 'turito', 'tocinon']], 4);
      act0(e).ata = 9999;
      seguro(e, 0);
      if (ps !== null) act0(e, 1).ps = ps;
      if (entrenadorGuille) e.jugadores[1].entrenador = 'guille';
      return quieto('cajonazo', () => M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), ataca(0)]));
    };
    const r = golpe(null, false);
    if (act0(r.estado, 1).ps !== 1 || habs(r, 'cajon', 1).length !== 1) falla(`Duro como un cajón: PS ${act0(r.estado, 1).ps}`);
    antesDe(r, 'cajon', (ev) => ev.k === 'golpe' && ev.j === 1, 'Duro como un cajón');
    const r2 = golpe(act0(mk([['tocinon'], ['cajonazo']]), 1).psMax - 40, false);
    if (act0(r2.estado, 1).ps !== 0 || habs(r2, 'cajon').length) falla('Duro como un cajón: con un PS menos ya no vale '+act0(r2.estado,1).ps+' '+JSON.stringify(r2.eventos.map(x=>x.k+(x.id||x.mov||x.dano||''))));
    const rg = golpe(null, true);
    if (act0(rg.estado, 1).ps !== 1 || act0(rg.estado, 1).perk?.manico) falla('Duro como un cajón: Guille no debe gastar su Mañico');
    // Multi-hit: the first blow leaves it at 1 HP, the second one (not at full HP any more) knocks it out.
    const e = mk([['kbronero', 'turito', 'cierzon'], ['cajonazo', 'turito', 'tocinon']]);
    act0(e).ata = 9999;
    act0(e).esp = 9999;
    seguro(e, 0);
    const rm = M.resolverTurno(e, [ataca(idx('kbronero', 'solo')), cana]);
    if (act0(rm.estado, 1).ps !== 1 && act0(rm.estado, 1).ps !== 0) falla('Duro como un cajón: Solo de teclado');
  }

  // Cuando menos te lo esperas (Lentejasur): its first attack after coming out is quick; a status move does not use it up; it works again on every switch-in.
  {
    const orden = (r) => r.eventos.filter((ev) => ev.k === 'usa').map((ev) => ev.j).join();
    const e = mk([['lentejasur', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    // Cubatillo (Vel 115) is faster than Lentejasur (Vel 105).
    const r1 = M.resolverTurno(e, [ataca(idx('lentejasur', 'lluvia')), ataca(idx('cubatillo', 'chispazo'), 0)]);
    if (orden(r1) !== '0,1' || habs(r1, 'inesperado', 0).length !== 1) falla(`Lentejasur: primer ataque rápido (orden ${orden(r1)})`);
    antesDe(r1, 'inesperado', (ev) => ev.k === 'usa' && ev.j === 0, 'Lentejasur');
    const r2 = M.resolverTurno(r1.estado, [ataca(idx('lentejasur', 'lluvia')), ataca(idx('cubatillo', 'chispazo'), 0)]);
    if (orden(r2) !== '1,0' || habs(r2, 'inesperado').length) falla(`Lentejasur: el segundo ataque ya no es rápido (orden ${orden(r2)})`);
    // A status move first (Esporas, normal order): the ability waits for the first real attack.
    const s1 = M.resolverTurno(e, [ataca(idx('lentejasur', 'esporas')), ataca(idx('cubatillo', 'chispazo'), 0)]);
    if (orden(s1) !== '1,0' || !act0(s1.estado, 0).vol.sorpresa) falla('Lentejasur: un movimiento de estado no gasta la habilidad');
    act0(s1.estado, 1).estado = null; // Esporas has put the rival to sleep
    act0(s1.estado, 1).sueno = 0;
    const s2 = M.resolverTurno(s1.estado, [ataca(idx('lentejasur', 'lluvia')), ataca(idx('cubatillo', 'chispazo'), 0)]);
    if (orden(s2) !== '0,1') falla('Lentejasur: tras estado '+orden(s2)+JSON.stringify(s2.eventos.map(x=>x.k+(x.id||x.mov||x.dano||''))));
    // Switching away and back: quick again.
    const f = mk([['lentejasur', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    let q = M.resolverTurno(f, [ataca(idx('lentejasur', 'lluvia')), ataca(idx('cubatillo', 'chispazo'), 0)]).estado;
    q = M.resolverTurno(q, [{ tipo: 'cambiar', a: 1 }, cana]).estado;
    q = M.resolverTurno(q, [{ tipo: 'cambiar', a: 0 }, cana]).estado;
    if (!act0(q).vol.sorpresa) falla('Lentejasur: al volver a salir debe tener otra vez el primer ataque rápido');
    const r3 = M.resolverTurno(q, [ataca(idx('lentejasur', 'lluvia')), ataca(idx('cubatillo', 'chispazo'), 0)]);
    if (orden(r3) !== '0,1') falla('Lentejasur: tras volver a salir, su primer ataque es rápido');
  }

  // Coñazo (Turito): on coming out, all the active rivals lose 1 Attack: at the start, on a switch and after a fall.
  {
    const e = mk([['turito', 'tocinon', 'cierzon'], ['aceituna', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon'], ['p', 'turito', 'tocinon']]);
    const r = M.resolverTurno(e, [cana, cana, cana, cana]);
    for (const j of [1, 2, 3]) if (niveles(r, j).ata !== -1) falla(`Coñazo al empezar: el rival ${j} tiene Ataque ${niveles(r, j).ata}`);
    if (niveles(r, 0).ata !== 0 || habs(r, 'conazo', 0).length !== 1) falla('Coñazo: el aviso debe salir una vez y no baja el suyo');
    // Switch out and back in: the rivals' Attack goes down once more.
    let q = M.resolverTurno(e, [cana, cana, cana, cana]).estado;
    q = M.resolverTurno(q, [{ tipo: 'cambiar', a: 1 }, cana, cana, cana]).estado;
    const rb = M.resolverTurno(q, [{ tipo: 'cambiar', a: 0 }, cana, cana, cana]);
    const bajan = rb.eventos.filter((ev) => ev.k === 'nivel' && ev.stat === 'ata' && ev.cambio === -1 && [1, 2, 3].includes(ev.j));
    const iConazo = pos(rb, (ev) => ev.k === 'habilidad' && ev.id === 'conazo');
    if (habs(rb, 'conazo', 0).length !== 1 || [1, 2, 3].some((j) => !bajan.some((ev) => ev.j === j && rb.eventos.indexOf(ev) > iConazo))) falla('Coñazo al cambiar: los rivales deben bajar 1 el Ataque');
    // After a fall: the replacement comes in through `reemplazar` and does it too.
    const f = mk([['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'tocinon']]);
    act0(f).ps = 0;
    f.reemplazos = [0];
    const rr = M.reemplazar(f, { 0: 1 });
    if (act0(rr.estado, 1).niveles.ata !== -1 || !habs(rr, 'conazo', 0).length) falla('Coñazo: el que sale tras caer también lo suelta');
  }

  // Ya estoy curado / Dos cabezas / Gratinado are in the block above. Pareja de carretera and Fan de la gira: +20 % while the partner is on the field of another player.
  {
    const danoCon = (atacante, mov, rival, extra, hab) =>
      conHab(atacante, hab, () => {
        const e = mk([[atacante, 'turito', 'tocinon'], [rival, extra, 'cierzon']], 6);
        seguro(e, 0);
        act0(e, 1).ps = act0(e, 1).psMax = 9999;
        return M.resolverTurno(e, [ataca(idx(atacante, mov)), cana]);
      });
    const par = (atacante, mov, hab, rival, extra, id, esperaBonus, ctx) => {
      const con = danoCon(atacante, mov, rival, extra, hab);
      const sin = danoCon(atacante, mov, rival, extra, NEUTRO);
      const d1 = dano(con, 1);
      const d0 = dano(sin, 1);
      const r = razon(d1, d0);
      if (esperaBonus ? r < 1.17 || r > 1.23 : d1 !== d0) falla(`${ctx}: daño ${d1} con la habilidad y ${d0} sin ella (${esperaBonus ? '+20 %' : 'igual'})`);
      if ((habs(con, id, 0).length === 1) !== esperaBonus) falla(`${ctx}: aviso ${habs(con, id, 0).length}`);
    };
    par('caravaner', 'temblor', 'pareja', 'camioner', 'turito', 'pareja', true, 'Pareja: Caravaner con Camioner delante');
    par('camioner', 'trompazo', 'pareja', 'caravaner', 'turito', 'pareja', true, 'Pareja: Camioner con Caravaner delante');
    par('caravaner', 'temblor', 'pareja', 'turito', 'camioner', 'pareja', false, 'Pareja: Camioner en el banquillo no cuenta');
    par('caravaner', 'temblor', 'pareja', 'caravaner', 'turito', 'pareja', false, 'Pareja: otro Caravaner no cuenta');
    par('ceceseta', 'chuleria' in M.MOVS ? 'pasodoble' : 'pasodoble', 'fan', 'camioner', 'turito', 'fan', true, 'Fan: con Camioner');
    par('ceceseta', 'pasodoble', 'fan', 'caravaner', 'turito', 'fan', true, 'Fan: con Caravaner');
    par('ceceseta', 'pasodoble', 'fan', 'turito', 'camioner', 'fan', false, 'Fan: con Camioner en el banquillo');
    // The partner may be anybody's: a third player's Camioner counts too.
    const e = mk([['ceceseta', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon']]);
    seguro(e, 0);
    act0(e, 1).ps = act0(e, 1).psMax = 9999;
    const r = M.resolverTurno(e, [ataca(idx('ceceseta', 'pasodoble')), cana, cana]);
    if (habs(r, 'fan', 0).length !== 1) falla('Fan de la gira: el Camioner de un tercer jugador también cuenta');
    // Ceceseta's attack on a Camioner... and the other way round, the bonus is for the attacker only.
    const q = mk([['camioner', 'turito', 'tocinon'], ['ceceseta', 'turito', 'tocinon']]);
    const rq = M.resolverTurno(q, [ataca(idx('camioner', 'trompazo')), ataca(idx('ceceseta', 'pasodoble'), 0)]);
    if (habs(rq, 'fan', 1).length !== 1 || habs(rq, 'pareja', 0).length) falla('Fan de la gira: Ceceseta con Camioner delante sí, y Camioner (sin Caravaner) no');
  }

  // Fotosíntesis (Criaturitah): 1/16 of its max HP back at the end of every turn (with its line), not at full HP.
  {
    const e = mk([['criaturitah', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const u = act0(e);
    u.ps = Math.floor(u.psMax / 2);
    const r = M.resolverTurno(e, [ataca(idx('criaturitah', 'monada')), cana]);
    const mas = Math.floor(u.psMax / 16);
    if (act0(r.estado).ps !== u.ps + mas) falla(`Fotosíntesis: PS ${act0(r.estado).ps}, esperaba ${u.ps + mas}`);
    const c = r.eventos.find((ev) => ev.k === 'cura' && ev.clave === 'hab.fotosintesis.cura');
    if (!c || !c.fin) falla('Fotosíntesis: falta la cura al final del turno');
    antesDe(r, 'fotosintesis', (ev) => ev.clave === 'hab.fotosintesis.cura', 'Fotosíntesis');
    const lleno = M.resolverTurno(mk([['criaturitah', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]), [ataca(idx('criaturitah', 'monada')), cana]);
    if (habs(lleno, 'fotosintesis').length) falla('Fotosíntesis: con todos los PS no hace nada');
  }

  // Flipado (Ego-Ego): +1 Attack every time it knocks a userito out (not for a plain hit).
  {
    const e = mk([['ego-ego', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    act0(e, 1).ps = 1;
    seguro(e, 0);
    const r = quieto('cubatillo', () => M.resolverTurno(e, [ataca(idx('ego-ego', 'chuleria')), ataca(0)]));
    if (!r.eventos.some((ev) => ev.k === 'cae' && ev.j === 1) || niveles(r, 0).ata !== 1 || habs(r, 'flipado', 0).length !== 1) falla(`Flipado: Ataque ${niveles(r, 0).ata}`);
    antesDe(r, 'flipado', (ev) => ev.k === 'nivel' && ev.j === 0 && ev.cambio === 1, 'Flipado');
    const e2 = mk([['ego-ego', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    seguro(e2, 0);
    const r2 = quieto('cubatillo', () => M.resolverTurno(e2, [ataca(idx('ego-ego', 'chuleria')), ataca(0)]));
    if (niveles(r2, 0).ata !== 0 || habs(r2, 'flipado').length) falla('Flipado: sin derribo no sube');
  }

  // A todo volumen (Kbronero): its area attacks hit at 100 %, not 75 %. Con hielo (Cubatillo): Petardo does half to it.
  {
    const dano4 = (hab) =>
      conHab('kbronero', hab, () => {
        const e = mk([['kbronero', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']], 8);
        seguro(e, 0);
        return M.resolverTurno(e, [ataca(idx('kbronero', 'distorsion')), cana]);
      });
    const con = dano4('volumen');
    const sin = dano4(NEUTRO);
    if (!dano(sin, 1) || razon(dano(con, 1), dano(sin, 1)) < 1.28 || razon(dano(con, 1), dano(sin, 1)) > 1.38 || habs(con, 'volumen', 0).length !== 1) falla(`A todo volumen: ${dano(con, 1)} contra ${dano(sin, 1)} (×1,33)`);
    const hielo = (hab, mov) =>
      conHab('cubatillo', hab, () => {
        const e = mk([['draguserin', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']], 8);
        seguro(e, 0);
        return M.resolverTurno(e, [ataca(idx('draguserin', mov)), cana]);
      });
    // Draguserín's Traca is Petardo at all (here at one rival): ½; Planeo (Ventolera) is not affected.
    const a = hielo('hielo', 'traca');
    const b = hielo(NEUTRO, 'traca');
    if (!dano(b, 1) || razon(dano(a, 1), dano(b, 1)) < 0.44 || razon(dano(a, 1), dano(b, 1)) > 0.56 || habs(a, 'hielo', 1).length !== 1) falla(`Con hielo: ${dano(a, 1)} contra ${dano(b, 1)} (×0,5)`);
    const c = hielo('hielo', 'planeo');
    const d = hielo(NEUTRO, 'planeo');
    if (dano(c, 1) !== dano(d, 1) || habs(c, 'hielo').length) falla('Con hielo: no cambia lo que no es Petardo');
  }

  // Buena ola (JesúsPelo) and Toma de corriente (Choquechu): the blow does nothing (no damage, no side effects) and raises a stat; Al tendedero does not send Pantaloneto away.
  {
    for (const sem of semillas(30)) {
      const e = mk([['cierzon', 'turito', 'tocinon'], ['jesuspelo', 'turito', 'tocinon']], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('cierzon', 'planeo')), cana]);
      if (dano(r, 1) || act0(r.estado, 1).ps !== act0(e, 1).psMax || niveles(r, 1).vel !== 1 || habs(r, 'ola', 1).length !== 1) falla('Buena ola: Planeo no debe hacer nada y sube la Velocidad');
      antesDe(r, 'ola', (ev) => ev.k === 'nivel' && ev.j === 1 && ev.stat === 'vel', 'Buena ola');
    }
    const t = mk([['pantaloneto', 'turito', 'tocinon'], ['jesuspelo', 'turito', 'tocinon']]);
    seguro(t, 0);
    const rt = M.resolverTurno(t, [ataca(idx('pantaloneto', 'tendedero')), cana]);
    if (rt.estado.reemplazos.length || act0(rt.estado, 0).especie !== 'pantaloneto' || rt.eventos.some((ev) => ev.clave === 'combate.tendedero_vuelve')) falla('Buena ola: si Al tendedero no hace daño, Pantaloneto no se retira');
    // A Remolino-like blow of another type is normal: Draguserín's Traca hurts JesúsPelo (Droga: ×2).
    const n = M.resolverTurno(mk([['draguserin', 'turito', 'tocinon'], ['jesuspelo', 'turito', 'tocinon']]), [ataca(idx('draguserin', 'traca')), cana]);
    if (!dano(n, 1)) falla('Buena ola: Petardo sí le hace daño');
    // Choquechu: Chispa (Chispazo at one, Distorsión at all) does nothing and gives +1 Especial; no paralysis, no tipsiness.
    for (const sem of semillas(40)) {
      const e = mk([['tragaperras', 'turito', 'tocinon'], ['choquechu', 'turito', 'tocinon']], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('tragaperras', 'chispazo')), cana]);
      if (dano(r, 1) || act0(r.estado, 1).estado || niveles(r, 1).esp !== 1 || habs(r, 'corriente', 1).length !== 1) falla('Toma de corriente: Chispazo no debe hacer nada y sube el Especial');
      const k = mk([['kbronero', 'turito', 'tocinon'], ['choquechu', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']], sem);
      seguro(k, 0);
      const rk = M.resolverTurno(k, [ataca(idx('kbronero', 'distorsion')), cana, cana]);
      if (dano(rk, 1) || act0(rk.estado, 1).achispado || niveles(rk, 1).esp !== 1 || !dano(rk, 2)) falla('Toma de corriente: Distorsión (a todos) no le hace nada pero sí a los demás');
    }
    // Choquechu's own Chispa keeps hurting others, and a Petardo blow hurts it.
    const m = M.resolverTurno(mk([['draguserin', 'turito', 'tocinon'], ['choquechu', 'turito', 'tocinon']]), [ataca(idx('draguserin', 'traca')), cana]);
    if (!dano(m, 1)) falla('Toma de corriente: Petardo sí le hace daño');
  }

  // Recién lavado (Pantaloneto): going back to the bench (a switch, Al tendedero, Remolino) takes the status off and heals 1/8.
  {
    const estropeado = (e) => {
      const u = act0(e);
      u.estado = 'quemado';
      u.ps = Math.floor(u.psMax / 2);
      return u.ps;
    };
    // (a) A voluntary switch.
    const e = mk([['pantaloneto', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const ps0 = estropeado(e);
    const r = M.resolverTurno(e, [{ tipo: 'cambiar', a: 1 }, cana]);
    const p = r.estado.jugadores[0].equipo[0];
    if (p.estado !== null || p.ps !== ps0 + Math.floor(p.psMax / 8)) falla(`Recién lavado (cambio): estado ${p.estado}, PS ${p.ps} (esperaba ${ps0 + Math.floor(p.psMax / 8)})`);
    if (habs(r, 'lavado', 0).length !== 1) falla('Recién lavado: falta el aviso al cambiar');
    antesDe(r, 'lavado', (ev) => ev.k === 'sale' && ev.j === 0, 'Recién lavado');
    // (b) Al tendedero: it goes back at the end of the turn; when the replacement comes in, it is cleaned and healed.
    const t = mk([['pantaloneto', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    seguro(t, 0);
    const pt = estropeado(t);
    const rt = M.resolverTurno(t, [ataca(idx('pantaloneto', 'tendedero')), cana]);
    if (rt.estado.reemplazos.join() !== '0') falla('Recién lavado (tendedero): debería haber reemplazo');
    const rr = M.reemplazar(rt.estado, { 0: 1 });
    const pp = rr.estado.jugadores[0].equipo[0];
    if (pp.estado !== null || !(pp.ps > Math.min(pt, pp.psMax) - 20) || !habs(rr, 'lavado', 0).length) falla(`Recién lavado (tendedero): estado ${pp.estado}`);
    // Compare with the HP it had right after the turn (the burn of the end of the turn already counted): +1/8 exactly.
    const antes = rt.estado.jugadores[0].equipo[0].ps;
    if (pp.ps !== Math.min(pp.psMax, antes + Math.floor(pp.psMax / 8))) falla(`Recién lavado (tendedero): PS ${pp.ps}, esperaba ${antes + Math.floor(pp.psMax / 8)}`);
    // (c) Remolino from a rival.
    conMov('cierzon', 0, 'remolino', () => {
      const w = mk([['pantaloneto', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']]);
      seguro(w, 1);
      const pw = estropeado(w);
      const rw = M.resolverTurno(w, [cana, ataca(0, 0)]);
      const vieja = rw.estado.jugadores[0].equipo[0];
      if (rw.estado.jugadores[0].activo === 0) falla('Recién lavado (Remolino): control, debía cambiarlo');
      else if (vieja.estado !== null || vieja.ps < pw) falla(`Recién lavado (Remolino): estado ${vieja.estado}, PS ${vieja.ps}`);
    });
    // A fallen Pantaloneto does not heal; a healthy one without status does nothing.
    const sano = M.resolverTurno(mk([['pantaloneto', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]), [{ tipo: 'cambiar', a: 1 }, cana]);
    if (habs(sano, 'lavado').length) falla('Recién lavado: sano y sin estado no hace nada');
  }

  // Se abre la maleta (Maletrio): the first time it drops under half of its HP, +2 Attack; never again.
  {
    const e = mk([['maletrio', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']]);
    const u = act0(e);
    u.ps = Math.floor(u.psMax / 2) + 3;
    seguro(e, 1);
    // Embarque prioritario (quick) just so that Maletrio does not drink a beer or pick a move at random; Tocinón hits afterwards.
    const r = M.resolverTurno(e, [ataca(idx('maletrio', 'embarque')), ataca(idx('tocinon', 'temblor'), 0)]);
    const m = act0(r.estado);
    if (m.ps * 2 >= m.psMax) falla('Maletrio: el golpe debía dejarlo por debajo de la mitad (control)');
    if (m.niveles.ata !== 2 || !m.habUsada || habs(r, 'maleta', 0).length !== 1) falla(`Se abre la maleta: Ataque ${m.niveles.ata} `+m.ps+'/'+m.psMax+' '+m.habUsada+JSON.stringify(r.eventos.map(x=>x.k+(x.id||x.mov||x.dano||x.j||''))));
    // Healed to just over half and hit under it again: nothing more.
    const q = structuredClone(r.estado);
    act0(q).ps = Math.floor(act0(q).psMax / 2) + 3;
    const r2 = M.resolverTurno(q, [ataca(idx('maletrio', 'embarque')), ataca(idx('tocinon', 'temblor'), 0)]);
    if (act0(r2.estado).ps * 2 >= act0(r2.estado).psMax || act0(r2.estado).niveles.ata !== 2 || habs(r2, 'maleta').length) falla('Se abre la maleta: solo la primera vez');
    // It also works for the burn (any way of dropping under half): the rival does nothing.
    const b = mk([['maletrio', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    act0(b).ps = Math.floor(act0(b).psMax / 2);
    act0(b).estado = 'quemado';
    const rb = quieto('cubatillo', () => M.resolverTurno(b, [ataca(idx('maletrio', 'cinturones')), ataca(0)]));
    if (act0(rb.estado).ps * 2 >= act0(rb.estado).psMax || !habs(rb, 'maleta', 0).length) falla('Se abre la maleta: la quemadura también cuenta');
  }

  // Público entregado (Teloneon): each attack of another player that misses (by accuracy, at any target) raises its Especial 1.
  {
    let fallos = 0;
    let sube = 0;
    let ajenos = 0;
    for (const sem of semillas(80)) {
      // 3 players: B attacks C with Chispazo at accuracy −6 (25 %); Teloneon (A) is not even the target.
      const e = mk([['teloneon', 'turito', 'tocinon'], ['tragaperras', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']], sem);
      act0(e, 1).niveles.prec = -6;
      const r = M.resolverTurno(e, [cana, ataca(idx('tragaperras', 'chispazo'), 2), cana]);
      const falla1 = r.eventos.filter((ev) => ev.k === 'falla' && ev.clave === 'combate.esquiva').length;
      fallos += falla1;
      if (niveles(r, 0).esp !== falla1) falla(`Público entregado: ${falla1} fallos y Especial ${niveles(r, 0).esp}`);
      if (falla1) sube += habs(r, 'publico', 0).length;
      // His own miss does not count.
      const o = mk([['teloneon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']], sem);
      act0(o, 0).niveles.prec = -6;
      const ro = M.resolverTurno(o, [ataca(idx('teloneon', 'zasca')), cana]);
      if (niveles(ro, 0).esp !== 0) falla('Público entregado: su propio fallo no cuenta');
      ajenos += ro.eventos.filter((ev) => ev.k === 'falla').length;
    }
    if (fallos < 20 || sube !== fallos || ajenos < 20) falla(`Público entregado: ${fallos} fallos ajenos, ${sube} avisos, ${ajenos} fallos propios de control`);
    // A miss against Teloneon itself counts as well, and an immunity (no accuracy roll) does not.
    const n = mk([['teloneon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const rn = M.resolverTurno(n, [cana, ataca(idx('cubatillo', 'burbujeo'), 0)]);
    if (rn.eventos.some((ev) => ev.clave === 'combate.esquiva') && niveles(rn, 0).esp !== 1) falla('Público entregado: un fallo contra él también cuenta');
    const inm = mk([['teloneon', 'turito', 'tocinon'], ['ego-ego', 'turito', 'tocinon']]);
    const ri = M.resolverTurno(inm, [cana, ataca(idx('ego-ego', 'chuleria'), 0)]);
    if (niveles(ri, 0).esp !== 0) falla('Público entregado: un golpe que acierta no sube nada');
    const inmune = mk([['teloneon', 'turito', 'tocinon'], ['turito', 'turito', 'tocinon']]);
    const rin = M.resolverTurno(inmune, [cana, ataca(idx('turito', 'chapa'), 0)]);
    if (niveles(rin, 0).esp !== 0 || !rin.eventos.some((ev) => ev.clave === 'combate.no_afecta')) falla('Público entregado: «no afecta» (Mindundi contra Fantasma) no es fallar');
  }

  // Grasiento (Torrezmón): its Grasa attacks give an empacho 10 % of the times (once per move, whatever the number of hits); other types never.
  {
    let emp = 0;
    let n = 0;
    for (const sem of semillas(300)) {
      const e = mk([['torrezmon', 'turito', 'tocinon'], ['turito', 'turito', 'tocinon']], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('torrezmon', 'crujiente')), cana]);
      if (!dano(r, 1)) continue;
      n++;
      const hay = habs(r, 'grasiento', 0).length;
      if ((act0(r.estado, 1).estado === 'empachado') !== (hay === 1)) falla('Grasiento: el aviso y el empacho no coinciden');
      if (hay) {
        emp++;
        antesDe(r, 'grasiento', (ev) => ev.k === 'estado' && ev.estado === 'empachado', 'Grasiento');
      }
    }
    if (n < 250 || emp < 0.04 * n || emp > 0.17 * n) falla(`Grasiento: ${emp} empachos de ${n} (10 %)`);
  }

  // A favor del viento (Papiroflexeon): +1 Speed on coming out, at the start and again after every switch.
  {
    const e = mk([['papiroflexeon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    const r = M.resolverTurno(e, [cana, cana]);
    if (niveles(r, 0).vel !== 1 || habs(r, 'viento', 0).length !== 1) falla(`A favor del viento: Velocidad ${niveles(r, 0).vel} al empezar`);
    let q = M.resolverTurno(r.estado, [{ tipo: 'cambiar', a: 1 }, cana]).estado;
    if (act0(q).especie !== 'turito') falla('A favor del viento: control del cambio');
    const rb = M.resolverTurno(q, [{ tipo: 'cambiar', a: 0 }, cana]);
    if (niveles(rb, 0).vel !== 1 || habs(rb, 'viento', 0).length !== 1) falla(`A favor del viento: Velocidad ${niveles(rb, 0).vel} al volver a salir`);
  }

  // The machine knows the immunities (never Chispa at Choquechu, nor Ventolera at JesúsPelo) and uses the new moves sensibly.
  {
    const elecciones = (e, j, n = 60) => {
      const cuenta = new Map();
      for (let s = 1; s <= n; s++) {
        const c = M.eleccionBot(e, j, M.crearRnd(s * 977 + j));
        const id = c?.tipo === 'atacar' ? M.ESPECIE[act0(e, j).especie].movs[c.mov] : c?.tipo;
        cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
      }
      return cuenta;
    };
    const ve = (cuenta, ...ids) => ids.reduce((n, id) => n + (cuenta.get(id) ?? 0), 0);
    // Chispa at a lone Choquechu: Tragaperras never picks Chispazo or Premio gordo; against Turito it does.
    const contraChoque = elecciones(mk([['tragaperras', 'turito', 'tocinon'], ['choquechu', 'turito', 'tocinon']]), 0);
    const contraTurito = elecciones(mk([['tragaperras', 'turito', 'tocinon'], ['turito', 'turito', 'tocinon']]), 0);
    if (ve(contraChoque, 'chispazo', 'premio')) falla(`Máquina: ${ve(contraChoque, 'chispazo', 'premio')} Chispa contra Choquechu`);
    if (ve(contraTurito, 'chispazo', 'premio') < 10) falla('Máquina: control, no usa Chispa contra Turito');
    const contraOla = elecciones(mk([['cierzon', 'turito', 'tocinon'], ['jesuspelo', 'turito', 'tocinon']]), 0);
    if (ve(contraOla, 'cierzo', 'planeo', 'rebufo')) falla(`Máquina: ${ve(contraOla, 'cierzo', 'planeo', 'rebufo')} Ventolera contra JesúsPelo`);
    // With three rivals it still attacks the ones that do not absorb: Chispa at Choquechu never, but at the others yes.
    const tres = mk([['tragaperras', 'turito', 'tocinon'], ['choquechu', 'turito', 'tocinon'], ['turito', 'turito', 'tocinon'], ['aceituna', 'turito', 'tocinon']]);
    let aChoque = 0;
    let chispas = 0;
    for (let s = 1; s <= 80; s++) {
      const c = M.eleccionBot(tres, 0, M.crearRnd(s * 31));
      if (c?.tipo === 'atacar' && ['chispazo', 'premio'].includes(M.ESPECIE.tragaperras.movs[c.mov])) {
        chispas++;
        if (c.objetivo === 1) aChoque++;
      }
    }
    if (aChoque || chispas < 10) falla(`Máquina: ${aChoque} Chispas a Choquechu de ${chispas}`);
    // Otra ficha when it is low (and ill); never at full HP.
    const bajo = mk([['choquechu', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    act0(bajo).ps = Math.floor(act0(bajo).psMax * 0.22);
    act0(bajo).estado = 'quemado';
    const cb = elecciones(bajo, 0);
    const sano = elecciones(mk([['choquechu', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]), 0);
    if (ve(cb, 'ficha') + ve(cb, 'cana') < 25) falla(`Máquina: Otra ficha / caña con poca vida y quemado: ${ve(cb, 'ficha')} / ${ve(cb, 'cana')}`);
    if (ve(sano, 'ficha')) falla('Máquina: Otra ficha a plena salud');
    // Con limón when ill and healthy otherwise; Cinturones now and then when healthy.
    const enfermo = mk([['torrezmon', 'turito', 'tocinon'], ['cubatillo', 'turito', 'tocinon']]);
    act0(enfermo).estado = 'empachado';
    const ce = elecciones(enfermo, 0);
    if (ve(ce, 'limon') < 10) falla(`Máquina: Con limón estando empachado solo ${ve(ce, 'limon')} de 60`);
    const buenos = elecciones(mk([['maletrio', 'turito', 'tocinon'], ['tocinon', 'turito', 'tocinon']]), 0, 120);
    if (ve(buenos, 'cinturones') < 3) falla(`Máquina: nunca usa Cinturones sana (${ve(buenos, 'cinturones')} de 120)`);
    // Papiroflexeon is the fastest userito and its attacks are strong: the machine rightly prefers to hit; it only has to choose something valid.
    const papel = elecciones(mk([['papiroflexeon', 'turito', 'tocinon'], ['tocinon', 'turito', 'tocinon']]), 0, 120);
    if (ve(papel, 'cortepapel', 'papiroflexia', 'rebufo', 'chuleria') !== 120) falla('Máquina: Papiroflexeon debe elegir siempre uno de sus movimientos');
  }

  // Whole bot battles with the new useritos on the team: valid, they end, invariants hold and every ability event has its texts.
  {
    const nuevos = ['maletrio', 'teloneon', 'choquechu', 'torrezmon', 'papiroflexeon', 'ceceseta'];
    const todosLosAvisos = new Set();
    for (let s = 1; s <= 12; s++) {
      const rnd = M.crearRnd(s * 4241);
      const mezcla = [...nuevos, ...M.ESPECIES.map((x) => x.id).filter((id) => !nuevos.includes(id))].map((id, i) => ({ id, k: i < 6 ? rnd() * 0.5 : rnd() })).sort((a, b) => a.k - b.k).map((x) => x.id);
      let e = mk([mezcla.slice(0, 3), mezcla.slice(3, 6), mezcla.slice(6, 9), mezcla.slice(9, 12)], s);
      for (let t = 0; t < 200 && e.ganador === null; t++) {
        const r = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, M.crearRnd(t * 13 + j + s)))));
        e = r.estado;
        for (const ev of r.eventos) {
          if (ev.k === 'habilidad') {
            todosLosAvisos.add(ev.id);
            if (!textos.has(`hab.${ev.id}.nombre`)) falla(`habilidad ${ev.id} sin nombre`);
            if (ev.clave && !textos.has(ev.clave)) falla(`habilidad ${ev.id}: clave sin texto ${ev.clave}`);
          }
          if (ev.clave && !textos.has(ev.clave)) falla(`clave sin texto: ${ev.clave}`);
        }
        revisar(e, `tanda8 ${s}`);
        if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
      }
      if (e.ganador === null) falla(`tanda8: la batalla ${s} no acaba`);
    }
    if (todosLosAvisos.size < 10) falla(`Las batallas de prueba solo activaron ${todosLosAvisos.size} habilidades distintas`);
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Tanda 9: Mariachi and Pulpiño (Nº 31-32), their six moves and their two abilities. Deterministic cases (or a hundred seeds with a margin where
// there are dice): the data, each move, Canta y no llores and Mala leche, and what the machine does with Serenata and Morriña.
function revisarTanda9() {
  const ENT = ['fran', 'pablo', 'chuchi', 'guille'];
  const mk = (equipos, semilla = 3) => M.crearCombate(equipos.map((especies, i) => ({ entrenador: ENT[i], nombre: 'J' + i, bot: false, especies })), semilla);
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const pasa = { tipo: 'pasar' }; // does nothing this turn
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const act0 = (e, j = 0) => e.jugadores[j].equipo[e.jugadores[j].activo];
  const seguro = (e, j) => (act0(e, j).niveles.prec = 6); // accuracy ×4: it never misses
  const NEUTRO = 'gratinado';
  const conHab = (esp, hab, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.habilidad;
    sp.habilidad = hab;
    try {
      return fn();
    } finally {
      sp.habilidad = antes;
    }
  };
  const conMov = (esp, i, mov, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.movs[i];
    sp.movs[i] = mov;
    try {
      return fn();
    } finally {
      sp.movs[i] = antes;
    }
  };
  const habs = (r, id, j) => r.eventos.filter((ev) => ev.k === 'habilidad' && ev.id === id && (j === undefined || ev.j === j));
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave);
  const dano = (r, j) => golpes(r, j).reduce((n, ev) => n + ev.dano, 0);
  const niveles = (r, j) => act0(r.estado, j).niveles;
  const pos = (r, f) => r.eventos.findIndex(f);
  const antesDe = (r, id, f, ctx) => {
    const a = pos(r, (ev) => ev.k === 'habilidad' && ev.id === id);
    const b = pos(r, f);
    if (a < 0 || b < 0 || a > b) falla(`${ctx}: el evento de la habilidad ${id} debe ir antes de su efecto (${a}, ${b})`);
  };
  const semillas = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const usos = (r) => r.eventos.filter((ev) => ev.k === 'usa');
  const dice = (r, clave) => r.eventos.filter((ev) => ev.clave === clave).length;

  for (const k of ['combate.serenata', 'combate.embobado_desvia', 'combate.morrina', 'hab.cantaynollores.nombre', 'hab.cantaynollores.desc', 'hab.malaleche.nombre', 'hab.malaleche.desc', 'hab.malaleche.activa', 'userito.mariachi.desc', 'userito.pulpino.desc']) if (!textos.has(k)) falla(`falta el texto ${k}`);

  // --- Data: 32 useritos, the Nº 1-30 where they were, Mariachi and Pulpiño at the end, both adding up to 420.
  {
    if (M.ESPECIES.length !== 37) falla(`hay ${M.ESPECIES.length} useritos, esperaba 37`);
    const antes = 'draguserin,goudazard,aceituna,cierzon,turroncho,tocinon,roscochoco,espumarro,cajonazo,lentejasur,tragaperras,turito,resacon,evoscar,chupitochu,caravaner,camioner,criaturitah,ego-ego,kbronero,cubatillo,p,jesuspelo,pantaloneto,maletrio,teloneon,choquechu,torrezmon,papiroflexeon,ceceseta';
    if (M.ESPECIES.slice(0, 30).map((x) => x.id).join() !== antes) falla('los Nº 1-30 han cambiado de sitio');
    const nuevos = [
      ['mariachi', ['juerga', 'petardo'], [100, 100, 85, 80, 55], 'ayayay,serenata,picante,taconeo', 'cantaynollores'],
      ['pulpino', ['bronca', 'grasa'], [95, 105, 85, 65, 70], 'ochotortas,tinta,morrina,adoquin', 'malaleche'],
    ];
    nuevos.forEach(([id, tipos, b, movs, hab], i) => {
      const sp = M.ESPECIES[30 + i];
      if (sp.id !== id) falla(`Nº ${31 + i}: es ${sp.id}, esperaba ${id}`);
      if (sp.tipos.join() !== tipos.join()) falla(`${id}: tipos ${sp.tipos}`);
      if ([sp.base.ps, sp.base.ata, sp.base.def, sp.base.vel, sp.base.esp].join() !== b.join()) falla(`${id}: estadísticas ${JSON.stringify(sp.base)}`);
      if (b.reduce((x, y) => x + y, 0) !== 420) falla(`${id} no suma 420`);
      if (sp.movs.join() !== movs) falla(`${id}: movimientos ${sp.movs}`);
      if (sp.habilidad !== hab) falla(`${id}: habilidad ${sp.habilidad}`);
    });
    const tabla = {
      ayayay: ['juerga', 70, 100, 5, 'todos'],
      serenata: ['juerga', null, 100, 5, 'uno'],
      picante: ['petardo', 90, 100, 8, 'uno'],
      ochotortas: ['bronca', 12, 90, 5, 'uno'],
      tinta: ['grasa', 60, 100, 8, 'uno'],
      morrina: ['mindundi', null, 100, 8, 'uno'],
    };
    for (const [id, [tipo, pot, prec, pp, obj]] of Object.entries(tabla)) {
      const m = M.MOVS[id];
      if (!m) {
        falla(`falta el movimiento ${id}`);
        continue;
      }
      if (m.tipo !== tipo || m.pot !== pot || m.prec !== prec || m.pp !== pp || m.objetivo !== obj || (m.prioridad ?? 0) !== 0) falla(`${id}: datos ${JSON.stringify(m)}`);
      if (!textos.has(`mov.${id}.desc`)) falla(`falta mov.${id}.desc`);
      if (M.ESPECIES.filter((sp) => sp.movs.includes(id)).length !== 1) falla(`${id}: debe tener un solo dueño`);
    }
    const ef = M.EFECTOS;
    if (ef.ayayay.retrocede !== 10) falla('¡Ay, ay, ay!: 10 % de retroceso');
    if (ef.serenata.especial !== 'serenata') falla('Serenata: especial');
    if (ef.picante.estado.estado !== 'quemado' || ef.picante.estado.prob !== 20) falla('Salsa picante: 20 % de quemar');
    if (ef.ochotortas.golpes !== 8) falla('Ocho tortas: 8 golpes');
    if (ef.tinta.nivel.length !== 1 || ef.tinta.nivel[0].stat !== 'prec' || ef.tinta.nivel[0].cambio !== -1 || ef.tinta.nivel[0].a !== 'objetivo' || ef.tinta.nivel[0].prob !== undefined) falla('Chorro de tinta: siempre −1 Precisión');
    if (ef.morrina.nivel.map((n) => `${n.a}${n.stat}${n.cambio}`).join() !== 'objetivoata-1,objetivovel-1') falla('Morriña: −1 Ata y −1 Vel al objetivo');
    if (M.MOVS_IMPROVISA.some((id) => ['ayayay', 'serenata', 'picante', 'ochotortas', 'tinta', 'morrina'].includes(id))) falla('¡Improvisa! no debe sacar los movimientos de un solo dueño');
    const porTipo = {};
    for (const sp of M.ESPECIES) for (const tp of sp.tipos) porTipo[tp] = (porTipo[tp] ?? 0) + 1;
    for (const [tp, n] of Object.entries(porTipo)) if (tp === 'mindundi' ? n !== 8 : n < 4 || n > 8) falla(`tipo ${tp}: ${n} useritos`);
  }

  // --- ¡Ay, ay, ay!: pega a los tres rivales y el 10 % de las veces uno retrocede (rivales lentos, que aún no han actuado).
  {
    let retroceden = 0;
    let n = 0;
    for (const sem of semillas(150)) {
      const e = mk([['mariachi', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], ['espumarro', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']], sem);
      for (const j of [1, 2, 3]) act0(e, j).niveles.vel = -6;
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('mariachi', 'ayayay'), 0), ataca(0, 0), ataca(0, 0), ataca(0, 0)]);
      for (const j of [1, 2, 3]) if (!dano(r, j)) falla(`¡Ay, ay, ay!: no pega al rival ${j}`);
      n += 3;
      retroceden += dice(r, 'combate.retrocede');
    }
    if (retroceden < 0.04 * n || retroceden > 0.18 * n) falla(`¡Ay, ay, ay!: ${retroceden} retrocesos de ${n} (10 %)`);
  }

  // --- Serenata: two turns of spellbound rival; a single-target attack at the Mariachi goes to another rival, the area ones still reach him.
  {
    const equipos = () => [['mariachi', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['cubatillo', 'turito', 'tocinon']];
    const sere = idx('mariachi', 'serenata');
    // The same turn: Mariachi (faster) sings and the spellbound Tocinón then attacks him.
    let aOtros = 0;
    let aMariachi = 0;
    for (const sem of semillas(60)) {
      const e = mk(equipos(), sem);
      const r = M.resolverTurno(e, [ataca(sere, 1), ataca(idx('tocinon', 'barrigazo'), 0), pasa, pasa]);
      if (dano(r, 1)) falla('Serenata no hace daño');
      const v = act0(r.estado, 1);
      if (v.vol.embobado !== 2 || v.vol.embobadoPor !== 0) falla(`Serenata: embobado ${v.vol.embobado} por ${v.vol.embobadoPor}`);
      if (dice(r, 'combate.serenata') !== 1) falla('Serenata: falta su frase');
      if (r.eventos.some((ev) => ev.k === 'usa' && ev.mov === 'barrigazo' && ev.obj.includes(0))) aMariachi++;
      else aOtros++;
    }
    if (aMariachi) falla(`Serenata: el rival embobado pegó ${aMariachi} veces a Mariachi`);
    if (!aOtros) falla('Serenata: el golpe no fue a nadie');
    // The next two turns it still works, the fourth it does not (the barrigazo must never go to Mariachi while it lasts).
    const aMar = (r) => r.eventos.some((ev) => ev.k === 'usa' && ev.mov === 'barrigazo' && ev.obj.includes(0));
    const mar = (t) => ataca(idx('mariachi', 'taconeo'), 3);
    for (const t of [2, 3]) {
      for (const sem of semillas(12)) {
        let e = mk(equipos(), sem);
        for (let k = 1; k <= t; k++) {
          const rr = M.resolverTurno(e, k === 1 ? [ataca(sere, 1), pasa, pasa, pasa] : [mar(k), ataca(idx('tocinon', 'barrigazo'), 0), pasa, pasa]);
          e = rr.estado;
          if (k === t && aMar(rr)) falla(`Serenata: en el turno ${t} el rival embobado pegó a Mariachi`);
          if (k === t && !dice(rr, 'combate.embobado_desvia')) falla(`Serenata: el turno ${t} falta la frase de desvío`);
        }
      }
    }
    let pegaAlCuarto = 0;
    for (const sem of semillas(12)) {
      let e = mk(equipos(), sem);
      for (let k = 1; k <= 4; k++) {
        const rr = M.resolverTurno(e, k === 1 ? [ataca(sere, 1), pasa, pasa, pasa] : [mar(k), ataca(idx('tocinon', 'barrigazo'), 0), pasa, pasa]);
        e = rr.estado;
        if (k === 4 && aMar(rr)) pegaAlCuarto++;
      }
    }
    if (!pegaAlCuarto) falla('Serenata: pasados dos turnos el rival debería poder pegar a Mariachi');
    // A direct attack at somebody else is not touched; an area attack reaches the Mariachi.
    {
      const e = mk(equipos(), 7);
      const r1 = M.resolverTurno(e, [ataca(sere, 1), ataca(idx('tocinon', 'barrigazo'), 2), pasa, pasa]);
      if (dice(r1, 'combate.embobado_desvia')) falla('Serenata: no debe desviar un golpe a otro rival');
      if (!r1.eventos.some((ev) => ev.k === 'usa' && ev.mov === 'barrigazo' && ev.obj.includes(2))) falla('Serenata: el golpe a otro rival debe ir a ese rival');
      const e2 = mk(equipos(), 7);
      const r2 = M.resolverTurno(e2, [ataca(sere, 1), ataca(idx('tocinon', 'temblor'), 0), pasa, pasa]);
      if (!dano(r2, 0)) falla('Serenata: un ataque a todos sí debe dar a Mariachi');
    }
    // A second Serenata on a spellbound rival has no effect (and does not restart the count).
    {
      let e = mk(equipos(), 4);
      e = M.resolverTurno(e, [ataca(sere, 1), pasa, pasa, pasa]).estado;
      const r = M.resolverTurno(e, [ataca(sere, 1), pasa, pasa, pasa]);
      if (!dice(r, 'combate.sin_efecto')) falla('Serenata sobre un rival ya embobado: debe decir que no tiene efecto');
      if (act0(r.estado, 1).vol.embobado !== 1) falla(`Serenata repetida: embobado ${act0(r.estado, 1).vol.embobado} (esperaba 1)`);
    }
    // Only Mariachi to hit (two players): there is nobody else, so the blow stays.
    {
      let e = mk([['mariachi', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], 6);
      const r = M.resolverTurno(e, [ataca(sere, 1), ataca(idx('tocinon', 'barrigazo'), 0)]);
      if (!dano(r, 0) || dice(r, 'combate.embobado_desvia')) falla('Serenata con un solo rival: el golpe debe quedarse en Mariachi');
    }
    // If Mariachi leaves, the new one on the field is not the one that sang: nothing is redirected.
    {
      let e = mk(equipos(), 8);
      e = M.resolverTurno(e, [ataca(sere, 1), pasa, pasa, pasa]).estado;
      const r = M.resolverTurno(e, [{ tipo: 'cambiar', a: 1 }, ataca(idx('tocinon', 'barrigazo'), 0), pasa, pasa]);
      if (dice(r, 'combate.embobado_desvia') || !dano(r, 0)) falla('Serenata: si Mariachi se va, el golpe debe dar al que entra');
    }
  }

  // --- Salsa picante: 20 % to burn.
  {
    let quemados = 0;
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([['mariachi', 'turito', 'tocinon'], ['cierzon', 'turito', 'tocinon']], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('mariachi', 'picante')), pasa]);
      if (!dano(r, 1)) continue;
      n++;
      if (act0(r.estado, 1).estado === 'quemado') quemados++;
    }
    if (n < 150 || quemados < 0.1 * n || quemados > 0.32 * n) falla(`Salsa picante: ${quemados} de ${n} queman (20 %)`);
  }

  // --- Ocho tortas: one accuracy roll and then eight hits (a tentacle each); it stops when the target falls.
  {
    let aciertos = 0;
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('pulpino', 'ochotortas')), pasa]);
      const g = golpes(r, 1).length;
      if (g !== 0 && g !== 8) falla(`Ocho tortas: ${g} golpes (0 u 8, una sola tirada)`);
      n++;
      if (g === 8) {
        aciertos++;
        if (!r.eventos.some((ev) => ev.clave === 'combate.veces' && ev.vars?.n === 8)) falla('Ocho tortas: falta «8 veces»');
      }
    }
    if (aciertos < 0.8 * n || aciertos > 0.98 * n) falla(`Ocho tortas: ${aciertos} de ${n} aciertan (90 %)`);
    const e = mk([['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], 9);
    seguro(e, 0);
    act0(e, 1).ps = 3;
    const r = M.resolverTurno(e, [ataca(idx('pulpino', 'ochotortas')), pasa]);
    if (golpes(r, 1).length >= 8 || !r.eventos.some((ev) => ev.k === 'cae' && ev.j === 1)) falla(`Ocho tortas contra un rival al borde: ${golpes(r, 1).length} golpes`);
  }

  // --- Chorro de tinta: always lowers the Precision of the target by 1 (not two, not zero), in every seed.
  {
    for (const sem of semillas(120)) {
      const e = mk([['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
      const r = M.resolverTurno(e, [ataca(idx('pulpino', 'tinta')), pasa]);
      if (!dano(r, 1)) falla('Chorro de tinta no dio');
      else if (niveles(r, 1).prec !== -1) falla(`Chorro de tinta: Precisión ${niveles(r, 1).prec} (siempre −1)`);
    }
  }

  // --- Morriña: −1 Attack and −1 Speed, never fails, stacks, La espuma no baja stops it, the line comes before the drops.
  {
    const e = mk([['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']]);
    const r = M.resolverTurno(e, [ataca(idx('pulpino', 'morrina')), pasa]);
    const nv = niveles(r, 1);
    if (nv.ata !== -1 || nv.vel !== -1 || nv.def !== 0 || nv.esp !== 0 || dano(r, 1)) falla(`Morriña: ${JSON.stringify(nv)}`);
    if (dice(r, 'combate.morrina') !== 1) falla('Morriña: falta su frase');
    const a = pos(r, (ev) => ev.clave === 'combate.morrina');
    const b = pos(r, (ev) => ev.k === 'nivel' && ev.j === 1);
    if (a < 0 || b < 0 || a > b) falla('Morriña: la frase va antes de las bajadas');
    const r2 = M.resolverTurno(r.estado, [ataca(idx('pulpino', 'morrina')), pasa]);
    if (niveles(r2, 1).ata !== -2 || niveles(r2, 1).vel !== -2) falla('Morriña: dos veces debe dejar −2 y −2');
    const ee = mk([['pulpino', 'turito', 'tocinon'], ['espumarro', 'turito', 'cierzon']]);
    const re = M.resolverTurno(ee, [ataca(idx('pulpino', 'morrina')), pasa]);
    if (niveles(re, 1).ata !== 0 || niveles(re, 1).vel !== 0 || habs(re, 'espuma', 1).length !== 1) falla('Morriña contra La espuma no baja: no debe bajar nada y debe avisar');
  }

  // --- Canta y no llores: under a third of its HP the Juerga attacks hit 50 % harder (Petardo and the rest, no); once per move, before the hit.
  {
    const danoCon = (hab, ps, mov, sem = 3) =>
      conHab('mariachi', hab, () => {
        const e = mk([['mariachi', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
        seguro(e, 0);
        act0(e).ps = ps;
        const r = M.resolverTurno(e, [ataca(idx('mariachi', mov)), pasa]);
        return { r, d: dano(r, 1) };
      });
    const psMax = act0(mk([['mariachi', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']])).psMax;
    const bajo = Math.ceil(psMax / 3) - 1; // 3 × ps < psMax
    const limite = Math.ceil(psMax / 3); // 3 × ps >= psMax: no bonus
    if (bajo * 3 >= psMax || limite * 3 < psMax) falla('Canta y no llores: cuentas de la prueba');
    for (const mov of ['taconeo', 'ayayay']) {
      const con = danoCon('cantaynollores', bajo, mov);
      const sin = danoCon(NEUTRO, bajo, mov);
      const ratio = con.d / sin.d;
      if (!sin.d || ratio < 1.4 || ratio > 1.6) falla(`Canta y no llores: ${mov} con poca vida ${con.d} / ${sin.d} = ${ratio.toFixed(2)} (×1,5)`);
      if (habs(con.r, 'cantaynollores', 0).length !== 1) falla(`Canta y no llores: ${mov} avisa ${habs(con.r, 'cantaynollores', 0).length} veces (1)`);
      antesDe(con.r, 'cantaynollores', (ev) => ev.k === 'golpe' && ev.j === 1, `Canta y no llores (${mov})`);
      const justo = danoCon('cantaynollores', limite, mov);
      const justoSin = danoCon(NEUTRO, limite, mov);
      if (justo.d !== justoSin.d || habs(justo.r, 'cantaynollores').length) falla(`Canta y no llores: con 1/3 de la vida justo no debe subir (${mov})`);
    }
    const alto = danoCon('cantaynollores', psMax, 'taconeo');
    if (habs(alto.r, 'cantaynollores').length || alto.d !== danoCon(NEUTRO, psMax, 'taconeo').d) falla('Canta y no llores: con la vida llena no debe notarse');
    const pic = danoCon('cantaynollores', bajo, 'picante');
    if (habs(pic.r, 'cantaynollores').length || pic.d !== danoCon(NEUTRO, bajo, 'picante').d) falla('Canta y no llores: la Salsa picante (Petardo) no sube');
  }

  // --- Mala leche: +1 Attack each time an attack hits Pulpiño, at most once a turn; not by status moves, misses, immunities or if it falls.
  // (Turito's Coñazo is switched off: it lowers the rivals' Attack when they come in, and that would hide the +1.)
  conHab('turito', NEUTRO, () => {
    const equipo = () => [['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']];
    const e = mk(equipo(), 3);
    const r = M.resolverTurno(e, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
    if (niveles(r, 0).ata !== 1 || habs(r, 'malaleche', 0).length !== 1) falla(`Mala leche: un golpe debe dar +1 (Ata ${niveles(r, 0).ata}, ${habs(r, 'malaleche', 0).length} avisos)`);
    // Hit by two rivals in the same turn: once.
    const e2 = mk(equipo(), 3);
    const r2 = M.resolverTurno(e2, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), ataca(idx('turito', 'chapa'), 0)]);
    if (!dano(r2, 0)) falla('Mala leche: los dos rivales debían pegar');
    if (niveles(r2, 0).ata !== 1 || habs(r2, 'malaleche', 0).length !== 1) falla(`Mala leche: dos golpes en el mismo turno deben dar +1 (Ata ${niveles(r2, 0).ata})`);
    // And again the next turn: +2.
    const r3 = M.resolverTurno(r2.estado, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
    if (niveles(r3, 0).ata !== 2) falla(`Mala leche: al turno siguiente debe subir otro (Ata ${niveles(r3, 0).ata})`);
    // A multi-hit move: once.
    const em = mk([['pulpino', 'turito', 'tocinon'], ['torrezmon', 'turito', 'cierzon']], 3);
    const rm = M.resolverTurno(em, [pasa, ataca(idx('torrezmon', 'crujiente'), 0)]);
    if (golpes(rm, 0).length < 2 || niveles(rm, 0).ata !== 1) falla(`Mala leche: un ataque de varios golpes debe dar solo +1 (${golpes(rm, 0).length} golpes, Ata ${niveles(rm, 0).ata})`);
    // Pulpiño's own Ocho tortas against a Pulpiño: eight hits, one boost.
    const ep = mk([['pulpino', 'turito', 'tocinon'], ['pulpino', 'turito', 'cierzon']], 3);
    seguro(ep, 0);
    const rp = M.resolverTurno(ep, [ataca(idx('pulpino', 'ochotortas')), ataca(idx('pulpino', 'ochotortas'), 0)]);
    if (niveles(rp, 1).ata !== 1 || niveles(rp, 0).ata !== 1) falla(`Mala leche: Ocho tortas entre dos Pulpiño debe dar +1 a cada uno (${niveles(rp, 0).ata}, ${niveles(rp, 1).ata})`);
    // A status move does not count (Bostezo).
    const eb2 = mk([['pulpino', 'turito', 'tocinon'], ['turito', 'tocinon', 'cierzon']], 3);
    const rb2 = M.resolverTurno(eb2, [pasa, ataca(idx('turito', 'bostezo'), 0)]);
    if (niveles(rb2, 0).ata !== 0 || habs(rb2, 'malaleche', 0).length) falla('Mala leche: un movimiento de estado no debe activarla');
    // An immunity (Chispa against Bronca) does not hurt it, so it does not get angry.
    const ei = mk([['pulpino', 'turito', 'tocinon'], ['choquechu', 'turito', 'cierzon']], 3);
    const ri = M.resolverTurno(ei, [pasa, ataca(idx('choquechu', 'chispazo'), 0)]);
    if (dano(ri, 0) || niveles(ri, 0).ata !== 0 || habs(ri, 'malaleche').length) falla('Mala leche: un golpe al que es inmune no debe activarla');
    // Knocked out: no boost.
    const ek = mk(equipo(), 3);
    act0(ek).ps = 1;
    const rk = M.resolverTurno(ek, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
    if (!rk.eventos.some((ev) => ev.k === 'cae' && ev.j === 0) || habs(rk, 'malaleche').length) falla('Mala leche: si cae, no debe activarse');
    // At +6 nothing more.
    const et = mk(equipo(), 3);
    act0(et).niveles.ata = 6;
    const rt = M.resolverTurno(et, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
    if (habs(rt, 'malaleche').length || niveles(rt, 0).ata !== 6) falla('Mala leche: con el Ataque al máximo no debe avisar');
    // The notice comes before the stage.
    antesDe(r, 'malaleche', (ev) => ev.k === 'nivel' && ev.j === 0 && ev.stat === 'ata' && ev.cambio === 1, 'Mala leche');
  });

  // --- The machine: it sings Serenata (with another rival to take the blow, and a rival that hit it), never alone with one rival, and uses Morriña on a hard hitter.
  {
    const elecciones = (e, j, n = 60) => {
      const cuenta = new Map();
      for (let s = 1; s <= n; s++) {
        const c = M.eleccionBot(e, j, M.crearRnd(s * 977 + j));
        const id = c?.tipo === 'atacar' ? M.ESPECIE[act0(e, j).especie].movs[c.mov] : c?.tipo;
        cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
      }
      return cuenta;
    };
    const ve = (cuenta, ...ids) => ids.reduce((n, id) => n + (cuenta.get(id) ?? 0), 0);
    // Hit last turn by Camioner: Serenata comes out sometimes, aimed at him.
    const e = mk([['mariachi', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon'], ['turito', 'tocinon', 'cierzon'], ['aceituna', 'turito', 'tocinon']]);
    e.agresores[0] = [1];
    act0(e).ps = Math.floor(act0(e).psMax * 0.4);
    let aCamioner = 0;
    let canta = 0;
    for (let s = 1; s <= 80; s++) {
      const c = M.eleccionBot(e, 0, M.crearRnd(s * 53));
      if (c?.tipo === 'atacar' && M.ESPECIE.mariachi.movs[c.mov] === 'serenata') {
        canta++;
        if (c.objetivo === 1) aCamioner++;
      }
    }
    if (canta < 4) falla(`Máquina: Serenata solo ${canta} de 80 con un rival que le pega`);
    if (aCamioner < canta * 0.4) falla(`Máquina: Serenata a quien le pega solo ${aCamioner} de ${canta}`);
    // With a single rival (two players) Serenata is pointless: never.
    const duelo = elecciones(mk([['mariachi', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon']]), 0, 80);
    if (ve(duelo, 'serenata')) falla(`Máquina: Serenata contra un solo rival ${ve(duelo, 'serenata')} veces`);
    // Morriña: Pulpiño against a hard hitter (Camioner) uses it now and then, and never against a rival that is already at −6 / −6.
    const m1 = elecciones(mk([['pulpino', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon']]), 0, 120);
    if (ve(m1, 'morrina') < 3) falla(`Máquina: Morriña solo ${ve(m1, 'morrina')} de 120 contra un fuerte`);
    const bajado = mk([['pulpino', 'turito', 'tocinon'], ['camioner', 'turito', 'tocinon']]);
    act0(bajado, 1).niveles.ata = -6;
    act0(bajado, 1).niveles.vel = -6;
    const m2 = elecciones(bajado, 0, 120);
    if (ve(m2, 'morrina') > ve(m1, 'morrina') / 2) falla(`Máquina: Morriña contra un rival ya a −6: ${ve(m2, 'morrina')} (con él normal ${ve(m1, 'morrina')})`);
  }

  // Whole bot battles with both on the team: valid, they end, invariants hold, every phrase and ability has its text.
  {
    const nuevos = ['mariachi', 'pulpino'];
    const avisos = new Set();
    let desvios = 0;
    for (let s = 1; s <= 14; s++) {
      const rnd = M.crearRnd(s * 7919);
      const mezcla = [...nuevos, ...M.ESPECIES.map((x) => x.id).filter((id) => !nuevos.includes(id))].map((id, i) => ({ id, k: i < 2 ? rnd() * 0.4 : rnd() })).sort((a, b) => a.k - b.k).map((x) => x.id);
      let e = mk([mezcla.slice(0, 3), mezcla.slice(3, 6), mezcla.slice(6, 9), mezcla.slice(9, 12)], s);
      for (let t = 0; t < 200 && e.ganador === null; t++) {
        const r = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, M.crearRnd(t * 13 + j + s)))));
        e = r.estado;
        for (const ev of r.eventos) {
          if (ev.k === 'habilidad') {
            avisos.add(ev.id);
            if (!textos.has(`hab.${ev.id}.nombre`)) falla(`habilidad ${ev.id} sin nombre`);
          }
          if (ev.clave === 'combate.embobado_desvia') desvios++;
          if (ev.clave && !textos.has(ev.clave)) falla(`clave sin texto: ${ev.clave}`);
        }
        revisar(e, `tanda9 ${s}`);
        if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
      }
      if (e.ganador === null) falla(`tanda9: la batalla ${s} no acaba`);
    }
    void desvios;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Tanda 12 (four touches-up of the combat requested by Jesús): (1) the hit event carries the gross damage (`bruto`) and only the biggest-hit record counts it;
// (2) every suceso explains its effect in its phrase (and fits the text box); (3) effects that no longer change anything are not announced;
// (4) a move on all rivals tells every blow before any effect.
function revisarTanda12() {
  const ENT = ['fran', 'pablo', 'chuchi', 'guille'];
  const mk = (equipos, semilla = 3, escenario) => M.crearCombate(equipos.map((especies, i) => ({ entrenador: ENT[i], nombre: 'J' + i, bot: false, especies })), semilla, escenario);
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const pasa = { tipo: 'pasar' };
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const act0 = (e, j = 0) => e.jugadores[j].equipo[e.jugadores[j].activo];
  const seguro = (e, j) => (act0(e, j).niveles.prec = 6);
  const NEUTRO = 'gratinado';
  const conHab = (esp, hab, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.habilidad;
    sp.habilidad = hab;
    try {
      return fn();
    } finally {
      sp.habilidad = antes;
    }
  };
  const habs = (r, id, j) => r.eventos.filter((ev) => ev.k === 'habilidad' && ev.id === id && (j === undefined || ev.j === j));
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave);
  const niveles = (r, j) => act0(r.estado, j).niveles;
  const nivelesEv = (r, j, stat) => r.eventos.filter((ev) => ev.k === 'nivel' && ev.j === j && (stat === undefined || ev.stat === stat));
  const topes = (r) => r.eventos.filter((ev) => ev.clave === 'combate.tope_sube' || ev.clave === 'combate.tope_baja');
  const stats = (r, j, i = 0) => r.estado.stats.u[j][i];

  for (const k of ['suceso.nada']) if (!textos.has(k)) falla(`falta el texto ${k}`);

  // --- 1. Gross damage. A blow that kills with HP left under its damage: the event carries the gross damage, the bar and dh/dr the real one, mx the gross one.
  {
    const e = mk([['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']], 3);
    act0(e, 1).ps = 5;
    seguro(e, 0);
    const r = M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), pasa]);
    const g = golpes(r, 1);
    if (g.length !== 1) falla(`golpe bruto: ${g.length} golpes`);
    else {
      if (g[0].dano !== 5 || g[0].ps !== 0) falla(`golpe bruto: daño real ${g[0].dano}, ps ${g[0].ps} (esperaba 5 y 0)`);
      if (!(g[0].bruto > 5)) falla(`golpe bruto: el evento debe llevar el bruto (${g[0].bruto})`);
      const s = stats(r, 0);
      if (s.dh !== 5 || stats(r, 1).dr !== 5) falla(`golpe bruto: dh ${s.dh} y dr ${stats(r, 1).dr} deben ser el daño real (5)`);
      if (s.mx !== g[0].bruto || s.mm !== 'barrigazo') falla(`golpe bruto: mx ${s.mx} (${s.mm}) debe ser el bruto ${g[0].bruto}`);
      if (act0(r.estado, 1).ps !== 0) falla('golpe bruto: la barra debe bajar a 0');
    }
    // The same blow on a healthy target: nothing to add (bruto = real).
    const e2 = mk([['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']], 3);
    seguro(e2, 0);
    const r2 = M.resolverTurno(e2, [ataca(idx('tocinon', 'barrigazo')), pasa]);
    const g2 = golpes(r2, 1)[0];
    if (!g2 || g2.bruto !== undefined || g2.dano <= 0) falla(`golpe normal: no debe llevar bruto (${JSON.stringify(g2)})`);
    else if (stats(r2, 0).mx !== g2.dano || stats(r2, 0).dh !== g2.dano) falla(`golpe normal: mx ${stats(r2, 0).mx} y dh ${stats(r2, 0).dh} deben ser ${g2.dano}`);
    // Same damage, same hit: the gross one is exactly what the hit would have done to a target with HP to spare.
    if (g.length && g2 && g[0].bruto !== g2.dano) falla(`golpe bruto: ${g[0].bruto} != ${g2.dano}, el golpe sin tope`);
    // Duro como un cajón: from full HP it holds on at 1 HP, the number is the whole blow.
    const e3 = mk([['tocinon', 'turito', 'cierzon'], ['cajonazo', 'tocinon', 'cierzon']], 3);
    act0(e3, 1).psMax = act0(e3, 1).ps = 20;
    seguro(e3, 0);
    const r3 = M.resolverTurno(e3, [ataca(idx('tocinon', 'barrigazo')), pasa]);
    const g3 = golpes(r3, 1)[0];
    if (!g3 || g3.dano !== 19 || !(g3.bruto > 19) || act0(r3.estado, 1).ps !== 1) falla(`Duro como un cajón: ${JSON.stringify(g3)}`);
    else if (stats(r3, 0).dh !== 19 || stats(r3, 0).mx !== g3.bruto) falla(`Duro como un cajón: dh ${stats(r3, 0).dh}, mx ${stats(r3, 0).mx}`);
    // Aguantar el tipo: the blow leaves 1 HP and shows its whole damage.
    const e4 = mk([['tocinon', 'turito', 'cierzon'], ['cajonazo', 'tocinon', 'cierzon']], 3);
    conHab('cajonazo', NEUTRO, () => {
      act0(e4, 1).ps = 20;
      seguro(e4, 0);
      const r4 = M.resolverTurno(e4, [ataca(idx('tocinon', 'barrigazo')), ataca(idx('cajonazo', 'aguantar'), 1)]);
      const g4 = golpes(r4, 1)[0];
      if (!g4 || g4.dano !== 19 || !(g4.bruto > 19) || act0(r4.estado, 1).ps !== 1) falla(`Aguantar el tipo: ${JSON.stringify(g4)}`);
      else if (stats(r4, 0).dh !== 19 || stats(r4, 0).mx !== g4.bruto) falla(`Aguantar el tipo: dh ${stats(r4, 0).dh}, mx ${stats(r4, 0).mx}`);
    });
    // Guille's Mañico (player 3): full HP, a blow that would knock it out leaves 1 HP; the gross damage is the one before it.
    const e5 = mk([['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['turito', 'tocinon', 'cierzon']], 3);
    act0(e5, 3).psMax = act0(e5, 3).ps = 20;
    seguro(e5, 0);
    const r5 = M.resolverTurno(e5, [ataca(idx('tocinon', 'barrigazo'), 3), pasa, pasa, pasa]);
    const g5 = golpes(r5, 3)[0];
    if (!g5 || g5.dano !== 19 || !(g5.bruto > 19) || stats(r5, 0).mx !== g5.bruto) falla(`Mañico de Guille: ${JSON.stringify(g5)}`);
    // A hit that leaves nothing to take off (1 HP and Aguantar el tipo): no number to show, and it does not count as the biggest blow.
    const e6 = mk([['tocinon', 'turito', 'cierzon'], ['cajonazo', 'tocinon', 'cierzon']], 3);
    conHab('cajonazo', NEUTRO, () => {
      act0(e6, 1).ps = 1;
      seguro(e6, 0);
      const r6 = M.resolverTurno(e6, [ataca(idx('tocinon', 'barrigazo')), ataca(idx('cajonazo', 'aguantar'), 1)]);
      const g6 = golpes(r6, 1)[0];
      if (!g6 || g6.dano !== 0 || g6.bruto !== undefined || stats(r6, 0).mx !== 0) falla(`Aguantar con 1 PS: ${JSON.stringify(g6)}, mx ${stats(r6, 0).mx}`);
    });
    // The summary: the record is the gross damage, the damage and the damage per move the real one; the server accepts a biggest hit above any max HP.
    const rec = new M.Recolector();
    rec.inicio(e);
    rec.eventos(r.eventos);
    const res = rec.resumen(r.estado, [false, false], 'maquina');
    const u0 = res.ju[0].us[0];
    if (g.length && (u0.mx !== g[0].bruto || u0.dh !== 5 || u0.mv.barrigazo?.[1] !== 5)) falla(`resumen: mx ${u0.mx}, dh ${u0.dh}, mv ${JSON.stringify(u0.mv)}`);
  }

  // --- 1b. Whole bot battles: the real damage still adds up (Σ dh = Σ dr = Σ per move), the biggest hit is the biggest `bruto ?? dano`.
  {
    const cat = M.prepararCatalogo({ especies: M.ESPECIES.map((x) => x.id), movs: Object.keys(M.MOVS), objetos: Object.keys(M.OBJETOS), entrenadores: M.ENTRENADORES.map((x) => (typeof x === 'string' ? x : x.id)), escenarios: ['brio', 'terraza', 'rural', 'juan', 'feria'], sucesos: Object.keys(M.SUCESOS) });
    for (let sem = 1; sem <= 6; sem++) {
      const rnd = M.crearRnd(sem * 31 + 7);
      let d = M.crearDraft(4, sem % 4);
      while (M.turnoDraft(d) !== null) d = M.elegir(d, M.pickBot(d, rnd));
      const eq = M.equipos(d, 4);
      let e = M.crearCombate(eq.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies })), sem);
      const rec = new M.Recolector();
      rec.inicio(e);
      const maximos = new Map();
      for (let t = 0; t < 200 && e.ganador === null; t++) {
        const r = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, rnd))));
        e = r.estado;
        rec.eventos(r.eventos);
        let atacante = -1;
        for (const ev of r.eventos) {
          if (ev.k === 'usa') atacante = ev.j;
          if (ev.k === 'golpe' && !ev.fin && !ev.clave && atacante >= 0 && ev.j !== atacante) maximos.set(atacante, Math.max(maximos.get(atacante) ?? 0, ev.bruto ?? ev.dano));
        }
        if (e.ganador === null && e.reemplazos.length) {
          const r2 = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)])));
          e = r2.estado;
          rec.eventos(r2.eventos);
        }
      }
      const res = rec.resumen(e, [false, false, false, false], 'maquina');
      // The server takes the summary as it is; a biggest hit above any userito's max HP (gross damage) is valid, a real damage that big is not.
      const ok = M.normalizarResumen(JSON.parse(JSON.stringify(res)), cat);
      if (!('resumen' in ok)) falla(`resumen ${sem}: el servidor lo rechaza (${ok.error})`);
      else if (sem === 1) {
        const grande = JSON.parse(JSON.stringify(res));
        grande.ju[0].us[0].mx = 20000;
        grande.ju[0].us[0].mm = Object.keys(M.MOVS)[0];
        const v1 = M.normalizarResumen(grande, cat);
        if (!('resumen' in v1)) falla(`resumen: un golpe más fuerte de 20000 (bruto) debe valer (${v1.error})`);
        grande.ju[0].us[0].dh = 20000;
        if ('resumen' in M.normalizarResumen(grande, cat)) falla('resumen: un daño hecho de 20000 no debe valer');
      }
      const dh = res.ju.flatMap((q) => q.us).reduce((n, u) => n + u.dh, 0);
      const porMov = res.ju.flatMap((q) => q.us).reduce((n, u) => n + Object.values(u.mv).reduce((x, [, dd]) => x + dd, 0), 0);
      if (dh !== porMov) falla(`resumen ${sem}: daño por movimiento ${porMov} != daño hecho ${dh}`);
      res.ju.forEach((q, j) => {
        const mejor = Math.max(...q.us.map((u) => u.mx));
        if (mejor !== (maximos.get(j) ?? 0)) falla(`resumen ${sem}: golpe más fuerte de ${j} = ${mejor}, esperaba ${maximos.get(j) ?? 0}`);
      });
    }
  }

  // --- 2. Every phrase of a suceso says its effect, fits 3 lines of the text box (206 px) and the lines that go with it too.
  {
    for (const id of Object.keys(M.SUCESOS)) {
      for (const k of ['frase', 'nombre', 'desc']) if (!textos.has(`suceso.${id}.${k}`)) falla(`falta suceso.${id}.${k}`);
      const frase = (textos.get(`suceso.${id}.frase`) ?? '').replace(/\{quien\}/g, 'Papiroflexeon').replace(/\{jugador\}/g, 'Guillermo');
      const n = M.envolver2(frase, 206).length;
      if (n > 3) falla(`suceso.${id}.frase ocupa ${n} líneas (caben 3)`);
      // The effect is in the phrase: some figure or rule word (1/8, 1 su, 50 %, fallan, pegan, recupera, bajadas...).
      if (!/\d|fallan|pega|enteros|curan|recuper|baj|sube|borr|caña/.test(frase)) falla(`suceso.${id}.frase no explica su efecto: «${frase}»`);
    }
    for (const k of ['suceso.premio.cana', 'suceso.premio.cura', 'suceso.nada']) if (M.envolver2(textos.get(k).replace(/\{jugador\}/g, 'Guillermo'), 206).length > 3) falla(`${k} no cabe en 3 líneas`);
  }

  // --- 2b. A suceso that changes nothing says so (and one that does, does not).
  {
    const brio = (sem, tocar) => {
      const e = mk([['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['aceituna', 'tocinon', 'cierzon'], ['espumarro', 'turito', 'cierzon']], sem, 'brio');
      e.turno = 4;
      tocar?.(e);
      return M.resolverTurno(e, [pasa, pasa, pasa, pasa]);
    };
    const suceso = (r) => r.eventos.find((ev) => ev.k === 'suceso');
    const cuenta = { ronda: 0, rondaHerido: 0, barre: 0, barreConNivel: 0, premio: 0 };
    for (let sem = 1; sem <= 400; sem++) {
      const r = brio(sem);
      const sc = suceso(r);
      if (!sc) continue;
      const nada = r.eventos.filter((ev) => ev.clave === 'suceso.nada');
      if (sc.id === 'ronda') {
        cuenta.ronda++;
        if (nada.length !== 1 || r.eventos.some((ev) => ev.k === 'cura')) falla(`Ronda gratis con todos sanos (semilla ${sem}): debe decir que no cambia nada y no curar`);
        const rh = brio(sem, (e) => (act0(e, 1).ps -= 30));
        cuenta.rondaHerido++;
        if (rh.eventos.some((ev) => ev.clave === 'suceso.nada') || !rh.eventos.some((ev) => ev.k === 'cura' && ev.j === 1)) falla(`Ronda gratis con uno herido (semilla ${sem}): debe curarle y no decir «nada»`);
      } else if (sc.id === 'barre') {
        cuenta.barre++;
        if (nada.length !== 1) falla(`Vero barre sin nada que barrer (semilla ${sem}): debe decirlo`);
        const rn = brio(sem, (e) => (act0(e, 2).niveles.ata = 2));
        cuenta.barreConNivel++;
        if (rn.eventos.some((ev) => ev.clave === 'suceso.nada') || niveles(rn, 2).ata !== 0) falla(`Vero barre con una subida (semilla ${sem}): no debe decir «nada» y debe borrarla`);
      } else if (sc.id === 'premio') {
        cuenta.premio++;
        const sinCura = r.eventos.some((ev) => ev.clave === 'suceso.premio.cura');
        if (sinCura) falla(`La tragaperras con todos sanos y la caña sin gastar (semilla ${sem}): no debe decir que curan`);
        if (nada.length !== 1) falla(`La tragaperras sin efecto (semilla ${sem}): debe decirlo`);
        const rh = brio(sem, (e) => (act0(e, 1).ps -= 30));
        if (!rh.eventos.some((ev) => ev.clave === 'suceso.premio.cura') || !rh.eventos.some((ev) => ev.k === 'cura' && ev.j === 1) || rh.eventos.some((ev) => ev.clave === 'suceso.nada')) falla(`La tragaperras con uno herido (semilla ${sem}): debe curar`);
      }
    }
    for (const [k, n] of Object.entries(cuenta)) if (n < 3) falla(`sucesos «nada»: solo ${n} casos de ${k} (400 semillas)`);
    // ¡Coches de choque! with only Chispa and Petardo useritos on the field: nobody gets hurt, and it says so.
    let choques = 0;
    for (let sem = 1; sem <= 600 && choques < 3; sem++) {
      const e = mk([['choquechu', 'turito', 'cierzon'], ['draguserin', 'tocinon', 'cierzon']], sem, 'feria');
      e.turno = 4;
      const r = M.resolverTurno(e, [pasa, pasa]);
      if (suceso(r)?.id !== 'choque') continue;
      choques++;
      if (r.eventos.some((ev) => ev.k === 'golpe') || r.eventos.filter((ev) => ev.clave === 'suceso.nada').length !== 1) falla(`Coches de choque entre conductores (semilla ${sem}): debe decir que no cambia nada`);
    }
    if (choques < 3) falla(`Coches de choque: solo ${choques} casos`);
  }

  // --- 3. Effects that no longer change anything are not announced.
  {
    const equipo3 = () => [['pulpino', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon']];
    // Mala leche: with +5 it announces and reaches +6; at +6 it says nothing (no tag, no stage, no «no puede subir más»).
    conHab('turito', NEUTRO, () => {
      const e = mk(equipo3(), 3);
      act0(e).niveles.ata = 5;
      const r = M.resolverTurno(e, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
      if (habs(r, 'malaleche', 0).length !== 1 || niveles(r, 0).ata !== 6 || nivelesEv(r, 0, 'ata').length !== 1) falla(`Mala leche +5: ${habs(r, 'malaleche', 0).length} avisos, Ata ${niveles(r, 0).ata}`);
      const r2 = M.resolverTurno(r.estado, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa]);
      if (!golpes(r2, 0).length) falla('Mala leche +6: debía recibir el golpe');
      if (habs(r2, 'malaleche').length || nivelesEv(r2, 0).length || topes(r2).length || niveles(r2, 0).ata !== 6) falla(`Mala leche +6: no debe anunciar nada (${habs(r2, 'malaleche').length} avisos, ${nivelesEv(r2, 0).length} niveles, ${topes(r2).length} topes)`);
    });
    // Flipado (Ego-Ego): +1 Attack on a knock-out; at +6 it says nothing.
    for (const ata of [0, 6]) conHab('turito', NEUTRO, () => {
      const e = mk([['ego-ego', 'turito', 'tocinon'], ['turito', 'tocinon', 'cierzon']], 3);
      act0(e, 1).ps = 1;
      act0(e).niveles.ata = ata;
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('ego-ego', 'chuleria')), pasa]);
      if (!r.eventos.some((ev) => ev.k === 'cae' && ev.j === 1)) falla('Flipado: debía tumbarlo');
      const n = habs(r, 'flipado', 0).length;
      if (ata === 0 && (n !== 1 || niveles(r, 0).ata !== 1)) falla(`Flipado con Ata 0: ${n} avisos, Ata ${niveles(r, 0).ata}`);
      if (ata === 6 && (n || nivelesEv(r, 0).length || topes(r).length || niveles(r, 0).ata !== 6)) falla(`Flipado con Ata +6: no debe anunciar nada (${n} avisos, ${topes(r).length} topes)`);
    });
    // Se abre la maleta: the first time it drops under half, +2 Attack; with +6 it is spent (same state) but silent.
    for (const ata of [0, 6]) {
      const e2 = mk([['tocinon', 'turito', 'cierzon'], ['maletrio', 'tocinon', 'cierzon']], 3);
      const m2 = act0(e2, 1);
      m2.ps = Math.floor(m2.psMax / 2) + 1;
      m2.niveles.ata = ata;
      seguro(e2, 0);
      const r2 = M.resolverTurno(e2, [ataca(idx('tocinon', 'pringue')), pasa]);
      if (act0(r2.estado, 1).ps <= 0 || act0(r2.estado, 1).ps * 2 >= act0(r2.estado, 1).psMax) falla(`Maleta: el golpe debía dejarlo vivo y bajo la mitad (${act0(r2.estado, 1).ps}/${act0(r2.estado, 1).psMax})`);
      const n = habs(r2, 'maleta', 1).length;
      if (!act0(r2.estado, 1).habUsada) falla('Maleta: debe quedar gastada');
      if (ata === 0 && (n !== 1 || niveles(r2, 1).ata !== 2)) falla(`Maleta con Ata 0: ${n} avisos, Ata ${niveles(r2, 1).ata}`);
      if (ata === 6 && (n || nivelesEv(r2, 1, 'ata').length || topes(r2).length)) falla(`Maleta con Ata +6: no debe anunciar nada (${n} avisos)`);
    }
    // Coñazo (Turito, turn 1): it speaks when some rival's Attack can still go down; if all are at −6, nothing (no tag, no «no puede bajar más»).
    {
      const mkc = (a1, a2) => {
        const e = mk([['turito', 'tocinon', 'cierzon'], ['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'cierzon']], 3);
        act0(e, 1).niveles.ata = a1;
        act0(e, 2).niveles.ata = a2;
        return M.resolverTurno(e, [pasa, pasa, pasa]);
      };
      const rTodos = mkc(-6, -6);
      if (habs(rTodos, 'conazo').length || nivelesEv(rTodos, 1).length || nivelesEv(rTodos, 2).length || topes(rTodos).length) falla('Coñazo con todos a −6: no debe anunciar nada');
      const rUno = mkc(-6, 0);
      if (habs(rUno, 'conazo').length !== 1 || nivelesEv(rUno, 2, 'ata').length !== 1 || nivelesEv(rUno, 1).length || topes(rUno).length) falla(`Coñazo con uno a −6: ${habs(rUno, 'conazo').length} avisos, ${topes(rUno).length} topes (esperaba 1 y 0)`);
      const rNormal = mkc(0, 0);
      if (habs(rNormal, 'conazo').length !== 1 || nivelesEv(rNormal, 1, 'ata').length !== 1 || nivelesEv(rNormal, 2, 'ata').length !== 1) falla('Coñazo normal: debe bajar el Ataque a los dos');
    }
    // A favor del viento (Papiroflexeon, turn 1): +1 Speed, announced (nothing is at the limit when it comes out).
    {
      const e = mk([['papiroflexeon', 'turito', 'cierzon'], ['tocinon', 'turito', 'cierzon']], 3);
      const r = M.resolverTurno(e, [pasa, pasa]);
      if (habs(r, 'viento', 0).length !== 1 || niveles(r, 0).vel !== 1) falla('A favor del viento: debe avisar y dar +1');
    }
    // Buena chica: a 30 % roll that is always drawn, but it only speaks when the attacker's Attack can still go down. Same final state either way (the dice are the same).
    {
      let conAviso = 0;
      let sinAviso = 0;
      for (let sem = 1; sem <= 150; sem++) {
        const arma = (ata) => {
          const e = mk([['tocinon', 'turito', 'cierzon'], ['aceituna', 'turito', 'cierzon']], sem);
          act0(e).niveles.ata = ata;
          seguro(e, 0);
          return M.resolverTurno(e, [ataca(idx('tocinon', 'barrigazo')), pasa]);
        };
        conAviso += habs(arma(0), 'buena_chica').length;
        const r6 = arma(-6);
        sinAviso += habs(r6, 'buena_chica').length + topes(r6).length;
      }
      if (conAviso < 15 || sinAviso) falla(`Buena chica: ${conAviso} avisos con Ata 0 (esperaba bastantes) y ${sinAviso} con Ata −6 (esperaba 0)`);
    }
    // La espuma no baja: it blocks a drop and says so; with the stat at −6 there was nothing to block.
    {
      let conAviso = 0;
      let sinAviso = 0;
      for (let sem = 1; sem <= 150; sem++) {
        const arma = (esp) => {
          const e = mk([['aceituna', 'turito', 'cierzon'], ['espumarro', 'turito', 'cierzon']], sem);
          act0(e, 1).niveles.esp = esp;
          seguro(e, 0);
          return M.resolverTurno(e, [ataca(idx('aceituna', 'vacile')), pasa]);
        };
        conAviso += habs(arma(0), 'espuma').length;
        sinAviso += habs(arma(-6), 'espuma').length;
      }
      if (conAviso < 10 || sinAviso) falla(`La espuma no baja: ${conAviso} avisos con Esp 0 y ${sinAviso} con Esp −6 (esperaba muchos y 0)`);
    }
  }

  // --- 4. A move on all rivals: first the blows on everybody, then the effects.
  {
    const equipo = () => [['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['aceituna', 'tocinon', 'cierzon'], ['espumarro', 'turito', 'cierzon']];
    const orden = (r, ctx) => {
      const iUsa = r.eventos.findIndex((ev) => ev.k === 'usa' && (ev.obj?.length ?? 0) >= 2);
      if (iUsa < 0) return { vacio: true };
      const resto = r.eventos.slice(iUsa + 1);
      const iFin = resto.findIndex((ev) => ev.k === 'usa' || ev.fin || ev.clave === 'combate.achispado_golpe');
      const mov = iFin < 0 ? resto : resto.slice(0, iFin);
      const ultimoGolpe = mov.reduce((u, ev, i) => (ev.k === 'golpe' && !ev.clave ? i : u), -1);
      const primerEfecto = mov.findIndex((ev) => ['estado', 'nivel', 'cae', 'habilidad', 'objeto', 'cura', 'sale'].includes(ev.k) || (ev.k === 'texto' && ev.j !== undefined && !/^combate\.(critico|muy_eficaz|poco_eficaz|veces|no_afecta|esconde_protege|venganza|aguanta|perk\.)/.test(ev.clave ?? '')));
      const golpes = mov.filter((ev) => ev.k === 'golpe' && !ev.clave).length;
      if (primerEfecto >= 0 && ultimoGolpe > primerEfecto) falla(`${ctx}: un golpe (posición ${ultimoGolpe}) sale después de un efecto (posición ${primerEfecto}): ${mov.map((ev) => ev.k).join(',')}`);
      return { vacio: false, golpes, conEfecto: primerEfecto >= 0 };
    };
    let conEfecto = 0;
    let probados = 0;
    // Pringue (20 % of lowering the Speed of each target): usually one of the three gets it.
    for (let sem = 1; sem <= 150; sem++) {
      const e = mk(equipo(), sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('tocinon', 'pringue')), pasa, pasa, pasa]);
      const o = orden(r, `Pringue (semilla ${sem})`);
      if (o.vacio) continue;
      probados++;
      if (o.golpes !== 3) falla(`Pringue (semilla ${sem}): ${o.golpes} golpes en vez de 3`);
      if (o.conEfecto) conEfecto++;
    }
    if (probados < 140 || conEfecto < 40) falla(`orden de los ataques a todos: ${probados} probados, ${conEfecto} con efecto (esperaba casi todos y muchos)`);
    // A fall and a stat drop in the same move: the three blows first, the fall and the drop after.
    let caidas = 0;
    for (let sem = 1; sem <= 150; sem++) {
      const e = mk(equipo(), sem);
      act0(e, 1).ps = 1;
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx('tocinon', 'pringue')), pasa, pasa, pasa]);
      const o = orden(r, `Pringue con caída (semilla ${sem})`);
      if (o.vacio) continue;
      if (r.eventos.some((ev) => ev.k === 'cae' && ev.j === 1)) caidas++;
    }
    if (caidas < 100) falla(`orden de los ataques a todos: solo ${caidas} caídas`);
    // Whatever the move, the turn, the trainer or the scene: bot battles keep the order (and the number of events per target is untouched).
    for (let sem = 1; sem <= 25; sem++) {
      const rnd = M.crearRnd(sem * 17 + 5);
      let d = M.crearDraft(4, sem % 4);
      while (M.turnoDraft(d) !== null) d = M.elegir(d, M.pickBot(d, rnd));
      const eq = M.equipos(d, 4);
      let e = M.crearCombate(eq.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies })), sem);
      for (let t = 0; t < 200 && e.ganador === null; t++) {
        const r = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, rnd))));
        e = r.estado;
        // Every move on 2+ rivals in the turn.
        const usos = r.eventos.map((ev, i) => (ev.k === 'usa' && (ev.obj?.length ?? 0) >= 2 ? i : -1)).filter((i) => i >= 0);
        for (const i of usos) {
          const resto = r.eventos.slice(i + 1);
          const iFin = resto.findIndex((ev) => ev.k === 'usa' || ev.fin || ev.clave === 'combate.achispado_golpe');
          const mov = iFin < 0 ? resto : resto.slice(0, iFin);
          let visto = false;
          mov.forEach((ev, k) => {
            const efecto = ['estado', 'nivel', 'cae', 'habilidad', 'objeto', 'sale'].includes(ev.k);
            if (efecto) visto = true;
            // A blow on a target after an effect (the recoil of the user on itself is not one of them: it carries its line).
            if (ev.k === 'golpe' && !ev.clave && visto) falla(`semilla ${sem} turno ${e.turno - 1}: golpe ${k} después de un efecto en ${mov.map((x) => x.k).join(',')}`);
          });
        }
        if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
      }
    }
  }
}

// --- Modo AL AZAR (docs/POKEUSERA.md, «Modo AL AZAR»): the deal, its determinism, a battle with it and the statistics mark.
{
  const ids = new Set(M.ESPECIES.map((x) => x.id));
  const objetosVistos = new Set();
  const portadores = new Set();
  let distintos = 0;
  for (let sem = 1; sem <= 400; sem++) {
    for (const n of [2, 3, 4]) {
      const r = M.repartoAzar(sem * 7919 + n, n);
      if (r.equipos.length !== n || r.objetos.length !== n) falla(`reparto ${sem}/${n}: ${r.equipos.length} equipos y ${r.objetos.length} listas de objetos`);
      const todos = r.equipos.flat();
      if (todos.length !== 3 * n || new Set(todos).size !== 3 * n) falla(`reparto ${sem}/${n}: useritos repetidos (${todos.join()})`);
      if (!todos.every((x) => ids.has(x))) falla(`reparto ${sem}/${n}: un userito que no existe`);
      r.objetos.forEach((lista, j) => {
        const con = lista.filter((o) => o !== null);
        if (lista.length !== 3 || con.length !== 1 || !M.OBJETOS.includes(con[0])) falla(`reparto ${sem}/${n}: el jugador ${j} lleva ${JSON.stringify(lista)} (esperaba un objeto en uno de los tres)`);
        else {
          objetosVistos.add(con[0]);
          portadores.add(lista.findIndex((o) => o !== null));
        }
      });
      // The same seed, the same deal.
      const otra = M.repartoAzar(sem * 7919 + n, n);
      if (JSON.stringify(otra) !== JSON.stringify(r)) falla(`reparto ${sem}/${n}: la misma semilla da otro reparto`);
      if (n === 4 && JSON.stringify(M.repartoAzar(sem * 7919 + n + 1, n)) !== JSON.stringify(r)) distintos++;
    }
  }
  if (objetosVistos.size !== M.OBJETOS.length) falla(`reparto: en 1200 repartos solo salieron ${objetosVistos.size} de ${M.OBJETOS.length} objetos`);
  if (portadores.size !== 3) falla('reparto: el objeto no cae en los tres sitios del equipo');
  if (distintos < 395) falla(`reparto: semillas distintas dan el mismo reparto (${400 - distintos} de 400)`);
  // Two seats may carry the same object (it is allowed); the usual deal does repeat one in some games.
  let repetidos = 0;
  for (let sem = 1; sem <= 400; sem++) {
    const os = M.repartoAzar(sem, 4).objetos.map((l) => l.find((o) => o !== null));
    if (new Set(os).size < 4) repetidos++;
  }
  if (repetidos < 100) falla(`reparto: apenas se repiten objetos entre jugadores (${repetidos} de 400)`);
  // A battle with a deal plays through with the machines (the opener of each is the machine's choice) and ends.
  for (const sem of [3, 11]) {
    const r = M.repartoAzar(sem, 4);
    const rnd = M.crearRnd(sem);
    const inicial = r.equipos.map((eq, j) => M.salidaBot(eq, r.equipos.filter((_x, k) => k !== j), rnd));
    let e = M.crearCombate(r.equipos.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies, objetos: r.objetos[i], inicial: inicial[i] })), sem);
    // One object per player and in the state at the start; no object is visible yet.
    e.jugadores.forEach((q, j) => {
      const con = q.equipo.filter((u) => u.objeto);
      if (con.length !== 1 || con[0].objeto.id !== r.objetos[j].find((o) => o !== null)) falla(`batalla al azar ${sem}: el objeto del jugador ${j} no es el repartido`);
    });
    for (let t = 0; t < 250 && e.ganador === null; t++) {
      const rr = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, rnd))));
      e = rr.estado;
      if (e.ganador === null && e.reemplazos.length) e = M.reemplazar(e, Object.fromEntries(e.reemplazos.map((j) => [j, M.reemplazoBot(e, j)]))).estado;
    }
    if (e.ganador === null) falla(`batalla al azar ${sem}: no acabó`);
    // The statistics mark: the summary carries az:1 only when asked, the server accepts it (and only 1), and the aggregates keep «elegido» apart.
    const cat = M.prepararCatalogo({ especies: M.ESPECIES.map((x) => x.id), movs: Object.keys(M.MOVS), objetos: [...M.OBJETOS], entrenadores: M.ENTRENADORES, escenarios: ['brio', 'terraza', 'rural', 'juan', 'feria'], sucesos: Object.keys(M.SUCESOS) });
    const rec = new M.Recolector();
    rec.inicio(M.crearCombate(r.equipos.map((especies, i) => ({ entrenador: ['fran', 'pablo', 'chuchi', 'guille'][i], nombre: 'J' + i, bot: true, especies })), sem));
    const normal = rec.resumen(e, [false, false, false, false], 'maquina');
    const azar = rec.resumen(e, [false, false, false, false], 'maquina', true);
    if ('az' in normal) falla('resumen NORMAL con marca az');
    if (azar.az !== 1) falla('resumen AL AZAR sin az:1');
    const v = M.normalizarResumen(JSON.parse(JSON.stringify(azar)), cat);
    if (!('resumen' in v) || v.resumen.az !== 1) falla(`el servidor no acepta o pierde az:1 (${JSON.stringify(v).slice(0, 80)})`);
    if (!('resumen' in M.normalizarResumen(JSON.parse(JSON.stringify(normal)), cat)) || 'az' in M.normalizarResumen(JSON.parse(JSON.stringify(normal)), cat).resumen) falla('el servidor añade az a un resumen NORMAL');
    for (const malo of [2, 0, true, 'si']) if ('resumen' in M.normalizarResumen({ ...JSON.parse(JSON.stringify(azar)), az: malo }, cat)) falla(`el servidor acepta az:${JSON.stringify(malo)}`);
    const ag = M.agregadoVacio();
    M.sumarResumen(ag, { ...v.resumen, id: 'abc123456' });
    M.sumarResumen(ag, { ...M.normalizarResumen(JSON.parse(JSON.stringify(normal)), cat).resumen, id: 'def123456' });
    const s = ag.todas;
    const esp0 = azar.ju[0].us[0].e;
    const objs = Object.values(s.obj);
    if (s.n !== 2 || s.az !== 1) falla(`agregado: n ${s.n}, az ${s.az} (esperaba 2 y 1)`);
    // Dealt once and (if the same userito/object came in the second summary) chosen once: «elegido» is n − az and the draft order only counts the NORMAL one.
    const e0 = s.esp[esp0];
    if (!e0 || e0.n !== 2 || e0.az !== 1) falla(`agregado: ${esp0} n ${e0?.n} az ${e0?.az}`);
    if (Object.values(s.esp).some((x) => x.ord.reduce((a, b) => a + b, 0) !== x.n - (x.az || 0))) falla('agregado: el orden del draft cuenta batallas al azar');
    if (objs.some((o) => (o.az || 0) > o.n)) falla('agregado: objetos con más azar que usos');
    if (objs.reduce((a, o) => a + (o.az || 0), 0) !== azar.ju.flatMap((q) => q.us).filter((u) => u.ob).length) falla('agregado: los objetos al azar no coinciden con los del resumen');
  }
  // The texts of the mode exist.
  const interfaz = readFileSync(join(raiz, 'src/textos/pokeusera.md'), 'utf8');
  for (const k of ['azar.titulo', 'azar.pista', 'azar.lleva', 'azar.rivales', 'azar.secreto', 'azar.apelear', 'azar.espera', 'azar.sinobjeto', 'modo.titulo', 'modo.normal', 'modo.azar', 'modo.normal.d', 'modo.azar.d', 'modo.ultimo', 'modo.volver', 'modo.pista', 'sala.modo'])
    if (!new RegExp(`^${k.replace(/\./g, '\\.')}\\s*=`, 'm').test(interfaz)) falla('falta el texto ' + k);
}

// Cilantrox, Fotomatón, Cloudtrio, Cigarr and OllaLocah (Nº 33-37, 19-oct), seven moves and five abilities.
function revisarUseritos33() {
  const ENT = ['fran', 'pablo', 'chuchi', 'guille'];
  const mk = (equipos, semilla = 3) => M.crearCombate(equipos.map((especies, i) => ({ entrenador: ENT[i], nombre: 'J' + i, bot: false, especies })), semilla);
  const ataca = (mov, objetivo = 1) => ({ tipo: 'atacar', mov, objetivo });
  const pasa = { tipo: 'pasar' };
  const idx = (esp, mov) => M.ESPECIE[esp].movs.indexOf(mov);
  const act0 = (e, j = 0) => e.jugadores[j].equipo[e.jugadores[j].activo];
  const seguro = (e, j) => (act0(e, j).niveles.prec = 6);
  const conHab = (esp, hab, fn) => {
    const sp = M.ESPECIE[esp];
    const antes = sp.habilidad;
    sp.habilidad = hab;
    try {
      return fn();
    } finally {
      sp.habilidad = antes;
    }
  };
  const habs = (r, id, j) => r.eventos.filter((ev) => ev.k === 'habilidad' && ev.id === id && (j === undefined || ev.j === j));
  const golpes = (r, j) => r.eventos.filter((ev) => ev.k === 'golpe' && ev.j === j && !ev.fin && !ev.clave);
  const niveles = (r, j) => act0(r.estado, j).niveles;
  const semillas = (n) => Array.from({ length: n }, (_, i) => i + 1);
  const idp = (r) => r;
  for (const k of ['hab.jabon.activa', 'hab.tira.activa', 'hab.humo.activa', 'hab.feria.activa', 'hab.blandito.nombre', 'hab.blandito.desc']) if (!textos.has(k)) falla(`falta el texto ${k}`);

  // --- Data.
  const nuevos = [
    ['cilantrox', ['droga', 'juerga'], [80, 85, 70, 90, 95], 'fiestapagana,esporas,conga,almendrazo', 'jabon'],
    ['fotomaton', ['bronca', 'chispa'], [80, 100, 80, 70, 90], 'todosdentro,flash,adoquin,temblor', 'tira'],
    ['cloudtrio', ['ventolera', 'chanza'], [75, 110, 60, 85, 90], 'nubarron,carisimo,planeo,zasca', 'blandito'],
    ['cigarr', ['petardo', 'fantasma'], [80, 55, 75, 100, 110], 'calada,fogonazo,susto,esconderse', 'humo'],
    ['ollalocah', ['juerga', 'ventolera'], [95, 90, 90, 70, 75], 'vueltas,conga,rebufo,remolino', 'feria'],
  ];
  nuevos.forEach(([id, tipos, b, movs, hab], i) => {
    const sp = M.ESPECIES[32 + i];
    if (sp.id !== id) falla(`Nº ${33 + i}: es ${sp.id}, esperaba ${id}`);
    if (sp.tipos.join() !== tipos.join()) falla(`${id}: tipos ${sp.tipos}`);
    if ([sp.base.ps, sp.base.ata, sp.base.def, sp.base.vel, sp.base.esp].join() !== b.join()) falla(`${id}: estadísticas ${JSON.stringify(sp.base)}`);
    if (b.reduce((x, y) => x + y, 0) !== 420) falla(`${id} no suma 420`);
    if (sp.movs.join() !== movs) falla(`${id}: movimientos ${sp.movs}`);
    if (sp.habilidad !== hab) falla(`${id}: habilidad ${sp.habilidad}`);
  });
  const movs = {
    fiestapagana: ['juerga', 75, 100, 5, 'todos'],
    todosdentro: ['bronca', 70, 100, 5, 'todos'],
    flash: ['chispa', 55, 100, 10, 'uno'],
    nubarron: ['ventolera', 60, 100, 8, 'todos'],
    carisimo: ['chanza', 70, 100, 8, 'uno'],
    calada: ['petardo', 60, 100, 10, 'uno'],
    vueltas: ['ventolera', 60, 100, 10, 'uno'],
  };
  for (const [id, [tipo, pot, prec, pp, obj]] of Object.entries(movs)) {
    const m = M.MOVS[id];
    if (!m) {
      falla(`falta el movimiento ${id}`);
      continue;
    }
    if (m.tipo !== tipo || m.pot !== pot || m.prec !== prec || m.pp !== pp || m.objetivo !== obj) falla(`${id}: datos ${JSON.stringify(m)}`);
    if (!textos.has(`mov.${id}.desc`)) falla(`falta mov.${id}.desc`);
    if (M.ESPECIES.filter((sp) => sp.movs.includes(id)).length !== 1) falla(`${id}: debe tener un solo dueño`);
  }

  // --- Moves with a side effect (a hundred seeds, margins).
  const tasa = (esp, mov, equipoRival, f) => {
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([[esp, 'turito', 'tocinon'], equipoRival], sem);
      seguro(e, 0);
      const r = M.resolverTurno(e, [ataca(idx(esp, mov)), pasa, pasa, pasa]);
      if (f(r)) n++;
    }
    return n / 200;
  };
  const tocinon = ['tocinon', 'turito', 'cierzon'];
  const cerca = (x, v, m, nombre) => {
    if (Math.abs(x - v) > m) falla(`${nombre}: ${x.toFixed(2)}, esperaba ~${v}`);
  };
  cerca(tasa('cilantrox', 'fiestapagana', tocinon, (r) => niveles(r, 1).def === -1), 0.2, 0.09, 'Fiesta pagana baja la Defensa un 20 %');
  cerca(tasa('fotomaton', 'todosdentro', tocinon, (r) => niveles(r, 1).vel === -1), 0.3, 0.1, '¡Todos dentro! baja la Velocidad un 30 %');
  cerca(tasa('fotomaton', 'flash', tocinon, (r) => niveles(r, 1).prec === -1), 0.3, 0.1, 'Flash baja la Precisión un 30 %');
  cerca(tasa('cloudtrio', 'carisimo', tocinon, (r) => niveles(r, 1).esp === -1), 0.3, 0.1, 'Está carísimo baja el Especial un 30 %');
  cerca(tasa('cigarr', 'calada', tocinon, (r) => act0(r.estado, 1).estado === 'quemado'), 0.3, 0.1, 'Calada quema un 30 %');
  if (M.EFECTOS.vueltas.retrocede !== 20) falla('Dar vueltas: 20 % de perder el turno');

  // --- Sabor a jabón: 30 % to lower the Especial of whoever hits it with an attack at one, never with an attack at everybody.
  {
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([['cilantrox', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], sem);
      seguro(e, 1);
      const r = M.resolverTurno(e, [pasa, ataca(idx('tocinon', 'barrigazo'), 0), pasa, pasa]);
      if (niveles(r, 1).esp === -1 && habs(r, 'jabon', 0).length === 1) n++;
    }
    cerca(n / 200, 0.3, 0.1, 'Sabor a jabón');
    const e = mk([['cilantrox', 'turito', 'tocinon'], ['kbronero', 'turito', 'cierzon']], 4);
    seguro(e, 1);
    const r = M.resolverTurno(e, [pasa, ataca(idx('kbronero', 'pogo'), 0), pasa, pasa]);
    if (habs(r, 'jabon').length) falla('Sabor a jabón no debe saltar con un ataque a todos');
  }

  // --- Humo en la cara: physical attacks at one only.
  {
    let n = 0;
    for (const sem of semillas(200)) {
      const e = mk([['cigarr', 'turito', 'tocinon'], ['turroncho', 'turito', 'tocinon']], sem);
      act0(e, 1).niveles.prec = 3; // the attacker's own Precision, so that its drop shows (3 → 2) and the blow does not miss often
      const r = M.resolverTurno(e, [pasa, ataca(idx('turroncho', 'adoquin'), 0), pasa, pasa]);
      if (niveles(r, 1).prec === 2 && habs(r, 'humo', 0).length === 1) n++;
    }
    cerca(n / 200, 0.3, 0.1, 'Humo en la cara');
    const e = mk([['cigarr', 'turito', 'tocinon'], ['turroncho', 'turito', 'cierzon']], 4);
    seguro(e, 1);
    const r = M.resolverTurno(e, [pasa, ataca(idx('turroncho', 'almendrazo'), 0), pasa, pasa]);
    if (habs(r, 'humo').length) falla('Humo en la cara no debe saltar con un ataque no físico');
  }

  // --- Caro y blandito: a physical attack at one hits it 20 % less; a special one does not change.
  {
    const dano = (hab, mov) =>
      conHab('cloudtrio', hab, () => {
        const e = mk([['cloudtrio', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], 5);
        seguro(e, 1);
        const r = M.resolverTurno(e, [pasa, ataca(idx('tocinon', mov), 0), pasa, pasa]);
        return golpes(r, 0).reduce((s, ev) => s + ev.dano, 0);
      });
    const con = dano('blandito', 'barrigazo');
    const sin = dano('gratinado', 'barrigazo');
    if (!(con > 0 && con < sin * 0.9)) falla(`Caro y blandito: ${con} frente a ${sin} sin habilidad`);
  }

  // --- Tira de cuatro: after an attack at everybody that landed, +1 Defensa (at most +2).
  {
    const e = mk([['fotomaton', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], 6);
    seguro(e, 0);
    const r = M.resolverTurno(e, [ataca(idx('fotomaton', 'todosdentro')), pasa, pasa, pasa]);
    if (niveles(r, 0).def !== 1 || habs(r, 'tira', 0).length !== 1) falla(`Tira de cuatro: Defensa ${niveles(r, 0).def}`);
    const r2 = M.resolverTurno(r.estado, [ataca(idx('fotomaton', 'todosdentro')), pasa, pasa, pasa]);
    const r3 = M.resolverTurno(r2.estado, [ataca(idx('fotomaton', 'todosdentro')), pasa, pasa, pasa]);
    if (niveles(r3, 0).def > 2) falla('Tira de cuatro: no debe pasar de +2');
    const e2 = mk([['fotomaton', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon']], 6);
    seguro(e2, 0);
    const r4 = M.resolverTurno(e2, [ataca(idx('fotomaton', 'flash')), pasa, pasa, pasa]);
    if (habs(r4, 'tira').length) falla('Tira de cuatro no salta con un ataque a uno');
  }

  // --- Vueltas de feria: on coming in, every rival drops 1 Velocidad.
  {
    const e = mk([['ollalocah', 'turito', 'tocinon'], ['tocinon', 'turito', 'cierzon'], ['turito', 'tocinon', 'cierzon'], ['cierzon', 'turito', 'tocinon']], 7);
    const r = M.resolverTurno(e, [pasa, pasa, pasa, pasa]);
    const bajan = [1, 2, 3].every((j) => niveles(r, j).vel === -1) || [1, 2, 3].every((j) => act0(e, j).niveles.vel === -1);
    if (!bajan) falla('Vueltas de feria: los rivales deben bajar 1 la Velocidad al salir');
  }

  // --- Whole bot battles with all five on the teams: they end and the invariants hold.
  {
    const ids = nuevos.map((x) => x[0]);
    for (let s = 1; s <= 10; s++) {
      const rnd = M.crearRnd(s * 7919);
      const mezcla = [...ids, ...M.ESPECIES.map((x) => x.id).filter((id) => !ids.includes(id))].map((id, i) => ({ id, k: i < 5 ? rnd() * 0.4 : rnd() })).sort((a, b) => a.k - b.k).map((x) => x.id);
      let e = mk([mezcla.slice(0, 3), mezcla.slice(3, 6), mezcla.slice(6, 9), mezcla.slice(9, 12)], s);
      for (let t = 0; t < 200 && e.ganador === null; t++) {
        const r = M.resolverTurno(e, e.jugadores.map((_, j) => (M.eliminado(e, j) ? null : M.eleccionBot(e, j, M.crearRnd(t * 13 + j + s)))));
        e = r.estado;
        for (const ev of r.eventos) if (ev.k === 'habilidad' && ev.clave && !textos.has(ev.clave)) falla(`falta el texto ${ev.clave}`);
      }
      if (e.ganador === null) falla(`batalla con los 5 nuevos: no acaba (semilla ${s})`);
    }
  }
  void idp;
}

const semillas = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n)).slice(0, 5);
if (!semillas.length) semillas.push(1);
semillas.forEach((s, i) => {
  const a = jugar(s, i === 0);
  if (i === 0 && jugar(s, false) !== a) falla('no es determinista con la misma semilla');
});
console.log(fallos.length ? `${fallos.length} FALLOS` : 'OK: sin fallos');
process.exit(fallos.length ? 1 : 0);
