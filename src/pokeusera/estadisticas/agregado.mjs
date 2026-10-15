// PokéUsera · estadísticas acumuladas: la lógica pura (sin DOM, sin Node) que comparten el servidor (scripts/api-estadisticas.mjs) y el móvil
// (estadisticas/almacen.ts), para que cuenten igual. Es JavaScript con tipos en agregado.d.mts porque el servidor no compila TypeScript.
// Formato del resumen y de los agregados: tipos.ts y docs/POKEUSERA.md, «Estadísticas acumuladas».

export const FORMATO = 1;

/** Los récords que se llevan (el orden es el de la pantalla). */
export const RECORDS = ['golpe', 'movdano', 'ko', 'dano', 'aguante', 'cura', 'crit', 'hab', 'campo', 'danoj', 'larga', 'corta', 'sucesos'];

const seccionVacia = () => ({ n: 0, tu: 0, esp: {}, mov: {}, obj: {}, esc: {}, ent: {}, suc: {}, rec: {} });

export const agregadoVacio = () => ({ v: FORMATO, desde: 0, hasta: 0, todas: seccionVacia(), personas: seccionVacia() });

export const seccionDe = (ag, soloPersonas) => (soloPersonas ? ag.personas : ag.todas);

/** Si `x` (algo leído de localStorage o de la red) tiene la forma de un agregado de este formato, lo devuelve; si no, null. */
export function agregadoValido(x) {
  if (!x || typeof x !== 'object' || x.v !== FORMATO) return null;
  for (const k of ['todas', 'personas']) {
    const s = x[k];
    if (!s || typeof s !== 'object' || !Number.isFinite(s.n) || !Number.isFinite(s.tu)) return null;
    for (const c of ['esp', 'mov', 'obj', 'esc', 'ent', 'suc', 'rec']) if (!s[c] || typeof s[c] !== 'object') return null;
  }
  if (!Number.isFinite(x.desde) || !Number.isFinite(x.hasta)) return null;
  return x;
}

/** Guarda `v` como récord `id` si supera al que había (o, con `menor`, si es menor): en un empate se queda el más antiguo. */
function marca(s, id, v, ctx, menor = false) {
  if (!(v > 0)) return;
  const a = s.rec[id];
  if (a && (menor ? v >= a.v : v <= a.v)) return;
  s.rec[id] = { v, ...ctx };
}

const suma = (o, k, v) => {
  o[k] = (o[k] || 0) + v;
};

function sumarSeccion(s, r, soloPersonas) {
  s.n++;
  s.tu += r.tu;
  const esc = (s.esc[r.es] ??= { n: 0, tu: 0 });
  esc.n++;
  esc.tu += r.tu;
  for (const id of r.su) suma(s.suc, id, 1);
  const base = { f: r.f, es: r.es };
  marca(s, 'larga', r.tu, base);
  marca(s, 'corta', r.tu, base, true);
  marca(s, 'sucesos', r.su.length, base);
  for (const j of r.ju) {
    if (soloPersonas && !j.pe) continue;
    const gana = j.pu === 1 ? 1 : 0;
    const en = (s.ent[j.en] ??= { n: 0, g: 0, pu: 0, dh: 0, dr: 0, ko: 0 });
    en.n++;
    en.g += gana;
    en.pu += j.pu;
    let danoJugador = 0;
    for (const u of j.us) {
      const e = (s.esp[u.e] ??= { n: 0, g: 0, pu: 0, dh: 0, dr: 0, dp: 0, cu: 0, ko: 0, ca: 0, tf: 0, cr: 0, ha: 0, ini: 0, ob: 0, oa: 0, ord: [0, 0, 0] });
      e.n++;
      e.g += gana;
      e.pu += j.pu;
      e.dh += u.dh;
      e.dr += u.dr;
      e.dp += u.dp;
      e.cu += u.cu;
      e.ko += u.ko;
      e.ca += u.ca;
      e.tf += u.tf;
      e.cr += u.cr;
      e.ha += u.ha;
      e.ini += u.ini;
      if (u.ob) e.ob++;
      e.oa += u.oa;
      if (u.o >= 0 && u.o < 3) e.ord[u.o]++;
      en.dh += u.dh;
      en.dr += u.dr;
      en.ko += u.ko;
      danoJugador += u.dh;
      if (u.ob) {
        const o = (s.obj[u.ob] ??= { n: 0, a: 0, g: 0, pu: 0, dh: 0, ko: 0 });
        o.n++;
        o.a += u.oa;
        o.g += gana;
        o.pu += j.pu;
        o.dh += u.dh;
        o.ko += u.ko;
      }
      let mejorMov = 0;
      let mejorId = '';
      for (const [id, [usos, dano]] of Object.entries(u.mv)) {
        const m = (s.mov[id] ??= { u: 0, d: 0 });
        m.u += usos;
        m.d += dano;
        if (dano > mejorMov) {
          mejorMov = dano;
          mejorId = id;
        }
      }
      const ctx = { f: r.f, e: u.e, en: j.en, cu: j.cu || undefined };
      marca(s, 'golpe', u.mx, { ...ctx, m: u.mm });
      marca(s, 'movdano', mejorMov, { ...ctx, m: mejorId });
      marca(s, 'ko', u.ko, ctx);
      marca(s, 'dano', u.dh, ctx);
      marca(s, 'aguante', u.dr, ctx);
      marca(s, 'cura', u.cu, ctx);
      marca(s, 'crit', u.cr, ctx);
      marca(s, 'hab', u.ha, ctx);
      if (!u.ca) marca(s, 'campo', u.tf, ctx);
    }
    marca(s, 'danoj', danoJugador, { f: r.f, en: j.en, cu: j.cu || undefined });
  }
}

/** Suma un resumen (ya válido) a un agregado. */
export function sumarResumen(ag, r) {
  ag.desde = ag.desde ? Math.min(ag.desde, r.f) : r.f;
  ag.hasta = Math.max(ag.hasta, r.f);
  sumarSeccion(ag.todas, r, false);
  if (r.ju.some((j) => j.pe)) sumarSeccion(ag.personas, r, true);
}

// ------------------------------------------------------------------ validar lo que llega al servidor

/** Prepara el catálogo del juego (listas de ids) para validar: conjuntos para buscar rápido. */
export function prepararCatalogo(c) {
  return {
    especies: new Set(c.especies),
    movs: new Set([...c.movs, 'desesperada']),
    objetos: new Set(c.objetos),
    entrenadores: new Set(c.entrenadores),
    escenarios: new Set(c.escenarios),
    sucesos: new Set(c.sucesos),
  };
}

/** 1 January 2026: nothing was played before. */
const FECHA_MIN = 1767225600000;
const MAX_TURNOS = 300;
const MAX_DANO = 6000;
const MAX_CUENTA = 24;
const MODOS = new Set(['maquina', 'online', 'aventura']);
const VENTAJAS = new Set(['cana', 'labia', 'tarde', 'manico']);
const ID_RE = /^[A-Za-z0-9_-]{6,40}$/;
const VER_RE = /^[A-Za-z0-9._+-]{1,24}$/;
const CUENTA_RE = /^[A-Za-z0-9._@-]{1,40}$/;

const esObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const entero = (x, max) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max ? x : null);
const bit = (x) => (x === 0 || x === 1 ? x : null);

class Mal extends Error {}
const exigir = (v, campo) => {
  if (v === null || v === undefined || v === false) throw new Mal(campo);
  return v;
};

function normalizarUserito(u, cat) {
  exigir(esObj(u), 'userito');
  exigir(typeof u.e === 'string' && cat.especies.has(u.e), 'userito.e');
  const ob = u.ob === null || u.ob === undefined ? null : exigir(typeof u.ob === 'string' && cat.objetos.has(u.ob) && u.ob, 'userito.ob');
  const mv = {};
  exigir(esObj(u.mv), 'userito.mv');
  const ids = Object.keys(u.mv);
  exigir(ids.length <= 12, 'userito.mv.tamaño');
  for (const id of ids) {
    exigir(cat.movs.has(id), `userito.mv.${id}`);
    const par = u.mv[id];
    exigir(Array.isArray(par) && par.length === 2, 'userito.mv.par');
    mv[id] = [exigir(entero(par[0], MAX_TURNOS), 'userito.mv.usos'), exigir(entero(par[1], MAX_DANO), 'userito.mv.daño')];
  }
  const mx = exigir(entero(u.mx, MAX_DANO), 'userito.mx');
  const mm = mx > 0 ? exigir(typeof u.mm === 'string' && cat.movs.has(u.mm) && u.mm, 'userito.mm') : '';
  return {
    e: u.e,
    o: exigir(entero(u.o, 2), 'userito.o'),
    ob,
    oa: ob ? exigir(bit(u.oa), 'userito.oa') : 0,
    ini: exigir(bit(u.ini), 'userito.ini'),
    dh: exigir(entero(u.dh, MAX_DANO), 'userito.dh'),
    dr: exigir(entero(u.dr, MAX_DANO), 'userito.dr'),
    dp: exigir(entero(u.dp, MAX_DANO), 'userito.dp'),
    cu: exigir(entero(u.cu, MAX_DANO), 'userito.cu'),
    ko: exigir(entero(u.ko, 12), 'userito.ko'),
    ca: exigir(bit(u.ca), 'userito.ca'),
    tf: exigir(entero(u.tf, MAX_TURNOS), 'userito.tf'),
    cr: exigir(entero(u.cr, MAX_TURNOS), 'userito.cr'),
    ha: exigir(entero(u.ha, MAX_TURNOS * 4), 'userito.ha'),
    mx,
    mm,
    mv,
  };
}

/**
 * Valida y limpia un resumen que llega de fuera: tipos, rangos, y que las especies, movimientos, objetos, entrenadores, escenarios y sucesos existan.
 * Devuelve `{ resumen }` (con solo los campos conocidos) o `{ error }` con el campo que falla. `ahora`: para no aceptar fechas del futuro.
 */
export function normalizarResumen(r, cat, ahora = Date.now()) {
  try {
    exigir(esObj(r), 'resumen');
    exigir(r.v === FORMATO, 'v');
    exigir(typeof r.id === 'string' && ID_RE.test(r.id), 'id');
    exigir(typeof r.ver === 'string' && VER_RE.test(r.ver), 'ver');
    // A date from the phone's clock: out of range (before the game existed, or in the future) it is replaced by the server's.
    const f = typeof r.f === 'number' && Number.isFinite(r.f) && r.f > FECHA_MIN && r.f <= ahora + 86_400_000 ? Math.round(r.f) : ahora;
    exigir(typeof r.mo === 'string' && MODOS.has(r.mo), 'mo');
    exigir(typeof r.es === 'string' && cat.escenarios.has(r.es), 'es');
    const tu = exigir(entero(r.tu, MAX_TURNOS), 'tu');
    exigir(tu >= 1, 'tu');
    exigir(Array.isArray(r.su) && r.su.length <= 5, 'su');
    const su = [];
    for (const id of r.su) {
      exigir(typeof id === 'string' && cat.sucesos.has(id) && !su.includes(id), 'su.id');
      su.push(id);
    }
    exigir(Array.isArray(r.ju) && r.ju.length >= 2 && r.ju.length <= 4, 'ju');
    const ju = r.ju.map((j) => {
      exigir(esObj(j), 'jugador');
      exigir(typeof j.en === 'string' && cat.entrenadores.has(j.en), 'jugador.en');
      exigir(typeof j.ve === 'string' && VENTAJAS.has(j.ve), 'jugador.ve');
      const cu = j.cu === null || j.cu === undefined ? null : exigir(typeof j.cu === 'string' && j.cu.length <= MAX_CUENTA * 2 && CUENTA_RE.test(j.cu) && j.cu, 'jugador.cu');
      exigir(Array.isArray(j.us) && j.us.length >= 1 && j.us.length <= 3, 'jugador.us');
      return {
        en: j.en,
        pe: exigir(bit(j.pe), 'jugador.pe'),
        pu: exigir(entero(j.pu, 4), 'jugador.pu'),
        ve: j.ve,
        cu,
        us: j.us.map((u) => normalizarUserito(u, cat)),
      };
    });
    exigir(new Set(ju.map((j) => j.en)).size === ju.length, 'jugadores.repetidos');
    exigir(ju.every((j) => j.pu >= 1 && j.pu <= ju.length), 'jugador.pu.rango');
    exigir(ju.filter((j) => j.pu === 1).length === 1, 'ganador');
    return { resumen: { v: FORMATO, id: r.id, ver: r.ver, f, mo: r.mo, es: r.es, tu, su, ju } };
  } catch (e) {
    if (e instanceof Mal) return { error: e.message };
    throw e;
  }
}
