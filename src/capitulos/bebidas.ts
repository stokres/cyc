// The four drink in the Bar del Brío (chapter 2, docs/CAPITULO2.md, «Las bebidas»): each one holds a caña in the front hand
// (a gin tonic, the «fresquito», once Vero has served the fresquitos), takes a sip every few seconds (the arm goes up to
// the mouth, the glass tips and the level goes down) and, when theirs runs out, walks to Vero for another and comes back.
//
// The glasses are bitmaps made once (src/motor/vasos.ts) that the rig carries in the hand (rig-runtime.mjs): all that
// happens per frame is a timer and a number (`bebe`, how high the glass is) for whoever is sipping. Nobody goes on a
// walk of their own while the player is acting, in a dialogue or in a cut of the camera (`libre`): they stand where
// they are and carry on when it is over. The one playing never walks off by himself: he only sips if he is left alone
// for a while, and leaves a last drop. The three dream bars at the end (levels 4 to 6) and the world of the concepts
// have no walks and no sips: whoever is still a person only holds the glass.
import type { Aventura } from '../juego/aventura';
import type { PjId } from '../juego/reparto';
import { PROTAS } from '../juego/reparto';
import { NIVELES, prepararVasos, type TipoVaso } from '../motor/vasos';

/** What a sip looks like: up, tipped and down (fractions of its length), and how long it lasts. */
const SORBO = { dur: 2.4, sube: 0.28, baja: 0.72, baja_nivel: 0.55 };
/** Seconds between sips (the one playing: when he has been left alone for a while). */
const ENTRE_SORBOS: [number, number] = [5, 9];
const ENTRE_SORBOS_ACTIVO: [number, number] = [9, 14];
const QUIETO_ACTIVO = 6;
/** The levels they start the night with: not all the same, none full. */
const NIVEL_INICIAL: Record<PjId, number> = { fran: 4, pablo: 5, chuchi: 3, guille: 4 };
/** The row where the friends stand, and the lane in front of it they walk along so as not to cross through the others. */
const CARRIL = 985;
const DESPACHO = { espera: 0.5, deja: 0.5, coge: 1.0, fin: 0.5 };

type Fase = 'quieto' | 'sorbo' | 'ir' | 'sirve' | 'vuelve';

interface Bebedor {
  tipo: TipoVaso;
  nivel: number;
  fase: Fase;
  /** Seconds to the next sip (counted only while free). */
  prox: number;
  /** Progress of the sip (0 to 1) and whether its level has already gone down. */
  u: number;
  bajado: boolean;
  /** How long the one playing has been left alone. */
  quieto: number;
  /** Where they were standing when they set off, and the route (points to walk through, in order). */
  casa: { X: number; y: number; face: number } | null;
  ruta: Array<{ X: number; y: number }>;
  paso: number;
  andando: boolean;
  /** Time in the counter's service (Vero putting the glass down and picking the new one up). */
  t: number;
}

interface Sistema {
  beb: Partial<Record<PjId, Bebedor>>;
  /** Who is on the walk to the counter now (one at a time). */
  viaje: PjId | null;
  ronda: boolean;
  fresquitos: boolean;
  /** Seconds until the gin tonics replace the cañas, once the fresquitos are served (the flash of the next level covers it). */
  cambioGin: number;
  /** Vero's face before she turned to the one at the counter. */
  veroCara: number | null;
  preparado: boolean;
}

const sistemas = new WeakMap<Aventura, Sistema>();

function sistema(g: Aventura): Sistema {
  let s = sistemas.get(g);
  if (!s) {
    s = { beb: {}, viaje: null, ronda: false, fresquitos: false, cambioGin: -1, veroCara: null, preparado: false };
    sistemas.set(g, s);
    (window as unknown as { __bebidas?: unknown }).__bebidas = sondaPruebas(g, s);
  }
  return s;
}

const aleatorio = ([a, b]: [number, number]) => a + Math.random() * (b - a);
const suave = (x: number) => x * x * (3 - 2 * x);

/** How high the glass is during a sip (0 to 1) at `u` (0 to 1): up, held tipped, and down. */
function altura(u: number) {
  if (u < SORBO.sube) return suave(u / SORBO.sube);
  if (u < SORBO.baja) return 1;
  return suave(Math.max(0, (1 - u) / (1 - SORBO.baja)));
}

const nivelDeLaNoche = (g: Aventura) => Number(g.estado.flags['c2.nivel'] ?? 0);

/** Free to do things of their own: the player is not acting, nothing is being said and the camera is plain. */
function libre(g: Aventura) {
  return !g.ocupadoAhora && !g.hud.enDialogo && !g.plano.activa && g.foco === null && g.flag('empezado.fran') && !g.velo.classList.contains('on');
}

function nuevo(id: PjId, s: Sistema): Bebedor {
  const i = PROTAS.indexOf(id);
  return {
    tipo: s.fresquitos ? 'gin' : 'cana',
    nivel: s.ronda && !s.fresquitos ? NIVELES : NIVEL_INICIAL[id],
    fase: 'quieto',
    prox: 2 + i * 1.9 + Math.random() * 1.5,
    u: 0,
    bajado: false,
    quieto: 0,
    casa: null,
    ruta: [],
    paso: 0,
    andando: false,
    t: 0,
  };
}

/** Where someone stands at the counter, next to Vero: the free place nearest to their own. */
function sitioBarra(g: Aventura, id: PjId, b: Bebedor) {
  const vero = g.npcs.get('vero');
  const vx = vero?.X ?? g.S.spots.vero?.X ?? 1600;
  const casa = b.casa!;
  const lado = Math.sign(casa.X - vx) || 1;
  const y = Math.max(g.S.walk.y0, Math.min(g.S.walk.y1, casa.y + 18));
  for (const d of [lado * 120, -lado * 120, lado * 250, -lado * 250]) {
    const X = Math.max(g.S.walk.x0, Math.min(g.S.walk.x1, vx + d));
    let libreSitio = true;
    for (const [otro, p] of g.pjs) if (otro !== id && p.visible && Math.abs(p.X - X) < 110 && Math.abs(p.y - y) < 70) libreSitio = false;
    if (libreSitio) return { X, y };
  }
  return { X: vx + lado * 120, y };
}

/** A free place to come back to: their own if nobody is in it, else a step aside. */
function sitioCasa(g: Aventura, id: PjId, b: Bebedor) {
  const casa = b.casa!;
  for (const d of [0, 150, -150, 300]) {
    const X = Math.max(g.S.walk.x0, Math.min(g.S.walk.x1, casa.X + d));
    let ocupado = false;
    for (const [otro, p] of g.pjs) if (otro !== id && p.visible && Math.abs(p.X - X) < 110 && Math.abs(p.y - casa.y) < 70) ocupado = true;
    if (!ocupado) return { X, y: casa.y };
  }
  return { X: casa.X, y: casa.y };
}

function salirAlBar(g: Aventura, id: PjId, b: Bebedor, s: Sistema) {
  const p = g.pjs.get(id)!;
  b.casa = { X: p.X, y: p.y, face: p.face };
  const dest = sitioBarra(g, id, b);
  b.ruta = [{ X: dest.X, y: CARRIL }, dest];
  b.paso = 0;
  b.andando = false;
  b.fase = 'ir';
  s.viaje = id;
}

function volverACasa(g: Aventura, id: PjId, b: Bebedor, s: Sistema) {
  if (!b.casa) b.casa = { X: g.pjs.get(id)!.X, y: g.pjs.get(id)!.y, face: g.pjs.get(id)!.face };
  const dest = sitioCasa(g, id, b);
  b.ruta = [{ X: dest.X, y: CARRIL }, dest];
  b.paso = 0;
  b.andando = false;
  b.fase = 'vuelve';
  if (s.viaje === id) s.viaje = null;
}

/** Back to standing still: the route is over (or given up). */
function aDescansar(g: Aventura, id: PjId, b: Bebedor, s: Sistema) {
  b.fase = 'quieto';
  b.prox = aleatorio(ENTRE_SORBOS);
  b.andando = false;
  b.ruta = [];
  if (s.viaje === id) s.viaje = null;
  soltarVero(g, s);
}

function soltarVero(g: Aventura, s: Sistema) {
  const vero = g.npcs.get('vero');
  if (vero && s.veroCara !== null) vero.face = s.veroCara;
  s.veroCara = null;
}

/** Walk the route, a step at a time; true when it is all done. A stop (the player is acting) does not lose the step. */
function recorrer(g: Aventura, id: PjId, b: Bebedor, libreAhora: boolean) {
  const p = g.pjs.get(id)!;
  if (!libreAhora) {
    if (p.moving) {
      p.stop();
      b.andando = false;
    }
    return false;
  }
  if (!p.moving) {
    if (b.andando) {
      b.andando = false;
      b.paso++;
    }
    if (b.paso >= b.ruta.length) return true;
    const r = b.ruta[b.paso];
    void g.andar(r.X, r.y, id);
    b.andando = true;
  }
  return false;
}

/** Called every frame from the chapter's `tick`: holds the glasses, sips, and the walks to the counter. */
export function tickBebidas(g: Aventura, dt: number) {
  if (!g.escena.startsWith('bar') || !g.S) return;
  const s = sistema(g);
  const niv = nivelDeLaNoche(g);
  if (niv >= 7) return;
  if (!s.preparado) {
    s.preparado = true;
    s.ronda = g.flag('c2.ronda');
    s.fresquitos = g.flag('c2.fresquitos');
    prepararVasos();
  }
  // The story: the round brings a full caña for everyone; the fresquitos replace it with a gin tonic.
  if (g.flag('c2.ronda') && !s.ronda) {
    s.ronda = true;
    for (const b of Object.values(s.beb)) if (b.tipo === 'cana') b.nivel = NIVELES;
  }
  if (g.flag('c2.fresquitos') && !s.fresquitos) {
    s.fresquitos = true;
    s.cambioGin = 0.55;
  }
  if (s.cambioGin >= 0) {
    s.cambioGin -= dt;
    if (s.cambioGin < 0) for (const b of Object.values(s.beb)) Object.assign(b, { tipo: 'gin', nivel: NIVELES });
  }

  const sueltos = libre(g);
  const caminos = niv < 4;
  for (const id of g.estado.jugables) {
    const p = g.pjs.get(id);
    if (!p || !p.visible || g.estado.donde[id]?.escena !== g.escena) continue;
    const b = (s.beb[id] ??= nuevo(id, s));
    p.sostener(b.tipo, b.nivel);
    // The bars of the end of the night (the long one, the upside-down one) are not for walking: just holding.
    if (!caminos) {
      if (b.fase !== 'quieto') aDescansar(g, id, b, s);
      continue;
    }
    const activo = g.estado.activo === id;
    if (activo && b.fase !== 'quieto' && b.fase !== 'sorbo') {
      // The player took over in the middle of the walk: it is his now.
      p.stop();
      aDescansar(g, id, b, s);
    }

    switch (b.fase) {
      case 'quieto': {
        const quieta = !p.moving && sueltos;
        b.quieto = activo && quieta ? b.quieto + dt : 0;
        if (!quieta || (activo && b.quieto < QUIETO_ACTIVO)) break;
        b.prox -= dt;
        if (b.prox > 0) break;
        // Before the round the ones who are not playing do not go for more: the round is the puzzle's first step.
        const puedeIr = !activo && s.ronda && b.nivel <= 0 && !s.viaje;
        if (puedeIr) {
          salirAlBar(g, id, b, s);
          break;
        }
        const minimo = activo || !s.ronda ? 1 : 0;
        if (b.nivel > minimo) {
          Object.assign(b, { fase: 'sorbo', u: 0, bajado: false });
        } else b.prox = aleatorio(ENTRE_SORBOS);
        break;
      }
      case 'sorbo': {
        b.u += dt / SORBO.dur;
        // Whoever starts to speak puts the glass down mid-sip.
        if (g.hud.hablando === id && b.u < SORBO.baja_nivel && b.u < 0.5) b.u = 1 - b.u;
        if (b.u >= SORBO.baja_nivel && !b.bajado) {
          b.bajado = true;
          b.nivel = Math.max(0, b.nivel - (b.nivel > 2 && Math.random() < 0.2 ? 2 : 1));
        }
        if (b.u >= 1) {
          p.bebe = 0;
          b.fase = 'quieto';
          b.prox = aleatorio(activo ? ENTRE_SORBOS_ACTIVO : ENTRE_SORBOS);
          // An empty glass: a pause and off to the counter.
          if (b.nivel <= 0 && !activo) b.prox = 1.2;
        } else p.bebe = altura(b.u);
        break;
      }
      case 'ir': {
        // Whatever the player does (a dialogue, a script), the walk is dropped: back to their place.
        if (!sueltos) {
          p.stop();
          volverACasa(g, id, b, s);
          break;
        }
        if (recorrer(g, id, b, sueltos)) {
          b.fase = 'sirve';
          b.t = 0;
          const vero = g.npcs.get('vero');
          p.lookAt(vero?.X ?? p.X);
          if (vero && s.veroCara === null) {
            s.veroCara = vero.face;
            vero.lookAt(p.X);
          }
        }
        break;
      }
      case 'sirve': {
        b.t += dt;
        const { espera, deja, coge, fin } = DESPACHO;
        // The empty glass is left on the counter, Vero hands over a full one and they take it.
        p.vasoOculto = b.t > espera && b.t < espera + deja + coge;
        if (b.t >= espera + deja && b.nivel < NIVELES) {
          b.nivel = NIVELES;
          p.sostener(b.tipo, b.nivel);
        }
        if (b.t >= espera + deja + coge + fin) {
          p.vasoOculto = false;
          soltarVero(g, s);
          volverACasa(g, id, b, s);
        }
        break;
      }
      case 'vuelve': {
        if (recorrer(g, id, b, sueltos)) {
          if (b.casa) p.face = b.casa.face;
          aDescansar(g, id, b, s);
        }
        break;
      }
    }
  }
}

/** For the tests (scripts and screenshots): peek at the drinks and set them going. The game does not use it. */
function sondaPruebas(g: Aventura, s: Sistema) {
  return {
    estado: () => Object.fromEntries(Object.entries(s.beb).map(([id, b]) => [id, { tipo: b.tipo, nivel: b.nivel, fase: b.fase, u: +b.u.toFixed(2) }])),
    /** Make `id` sip now. */
    sorbo(id: PjId) {
      const b = s.beb[id];
      if (b) Object.assign(b, { fase: 'sorbo', u: 0, bajado: false });
    },
    /** Empty their glass and send them to the counter now. */
    vaciar(id: PjId) {
      const b = s.beb[id];
      if (!b) return;
      b.nivel = 0;
      b.prox = 0;
      if (g.estado.activo !== id) salirAlBar(g, id, b, s);
    },
    /** Hold a sip at its top (0 to 1 along the sip) for a photo; -1 lets it go on. */
    fijar(id: PjId, u: number) {
      const p = g.pjs.get(id);
      const b = s.beb[id];
      if (!p || !b) return;
      if (u < 0) return void ((b.fase = 'quieto'), (p.bebe = 0));
      b.fase = 'quieto';
      b.prox = 1e9;
      p.bebe = altura(u);
    },
    sistema: s,
  };
}
