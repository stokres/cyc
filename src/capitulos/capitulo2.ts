// Chapter 2, the opening (docs/CAPITULO2.md): from the door of the Bar del Brío,
// where chapter 1 ended, to Fran closing his eyes and dreaming his Pang.
//
// The four are already inside, at the bar, from the start; the player switches
// between them with the dock. The puzzle, «una moneda para la tragaperras»: Fran
// orders a round so Chuchi does not leave (the beers down the bar, src/ui/canas.ts);
// Chuchi knows the slot machine has to be switched off and on «like the router»;
// Guille pulls it from the wall, and behind it there is a 1987 duro; the machine
// takes no pesetas until Pablo charms Vero into the «fresquitos»; then it swallows
// the duro and pays nothing, Pablo starts a pasodoble and all four sing
// (src/ui/canto.ts): the jackpot. Fran closes his eyes: the Pang.
//
// Each round raises «el nivel de la noche» and the bar turns into a dream: the
// scenes bar0…bar3 are the same bar baked with its dream gone further, and the
// live bits (src/capitulos/bar-vivo.ts) move on top. After the Pang the night gets
// out of hand (`elRestoDeLaNoche`): Fran wakes in bar4 (the same bar in acid
// lights, its lines bent), and tells the dragon; the slot machine spins alone and stops on
// Pablo's face; the bar turns upside down (bar5), Pablo's shadow, the narrator of
// chapter 1, takes over («Esta historia la acabo yo») and the picture is squeezed
// into the console of Alacant Sun; Pablo opens his eyes. Then the last stretch before the PokéUsera: Chuchi
// wants to leave and the floor of the bar spins into the track of Impropios Kart; Vero swallows Fran (bar6 and
// src/ui/boca.ts); the three jump in after him and come undone; they are in the world of the concepts
// (`conceptos`, level 7: no bar any more, the friends are abstract figures and Vero a golden mouth) where Fran has
// become «Una más» and has to be found, and «La última» is needed to leave; saying it sets off the total chaos
// (level 8: cuts between all the styles of the game, the camera spinning, the dinosaur, Guille the flower with
// his mug). The camera goes wild from the texts (src/juego/camara.ts). Every line comes from src/textos/capitulo2.md.
import { escena as bar } from '../arte/escenas/bar.mjs';
import { escena as calle } from '../arte/escenas/calle.mjs';
import { escena as conceptos, CX as CX_CONCEPTOS } from '../arte/escenas/conceptos.mjs';
import type { Aventura, Capitulo, ZonaLogica } from '../juego/aventura';
import type { Estado } from '../juego/estado';
import type { PjId } from '../juego/reparto';
import type { Escena } from '../motor/escena';
import { texto } from '../juego/textos';
import { entrarEnConsola } from '../juego/pixelado';
import { entrarEnPista } from '../juego/pista';
import { cargarModulo, precargarModulos } from '../juego/modulos';
import { prepararCortes, type Cortes } from '../juego/estilos';
import { h } from '../ui/hud';
import { jugarCanas } from '../ui/canas';
import { jugarCanto } from '../ui/canto';
import { jugarSafari } from '../ui/safari';
import { mostrarTragaperras } from '../ui/tragaperras';
import { abrirBoca, type Boca } from '../ui/boca';
import { jugarPangCapitulo } from '../pang/capitulo';
import { dibujarBarVivo } from './bar-vivo';
import { tickBebidas } from './bebidas';
import { dibujarConceptos, empezarCaos, gastarArgumento, golpear, liberarConceptos, prepararConceptos, revelarUltima, darPasoGuille, subirDino, ultimaRevelada } from './conceptos-vivo';

const HORA = (h: number, m: number) => h * 60 + m;
/** The Brío's door on the street (calle.mjs), where chapter 1 left them. */
const PUERTA_BRIO = 6740;
const ZONAS = ['puerta', 'tabaco', 'barra', 'grifos', 'expositor', 'estanteria', 'tele', 'porra', 'tragaperras', 'bano'] as const;
/** The bar's music, louder than in the street but under the voices. */
const VOLUMEN_BAR = 0.75;

let spots0: Escena['spots'] | null = null;
/** Where everyone is in the bar (the same in its four dream levels). */
function spots() {
  return (spots0 ??= (bar(0) as unknown as Escena).spots);
}

/**
 * What each of the four is carrying when chapter 1 ends (Jesús: «los protagonistas deben llevar los mismos objetos con los
 * que acabaron el capítulo 1»). Everything else in their bags is used up on the way (the ham, the clothes, the batteries,
 * the colonia, the net and the stick, the key, the script and its pages), so it is the same in every game. Guille ends empty-handed.
 */
export const OBJETOS_FIN_CAPITULO1: Record<PjId, string[]> = {
  fran: ['movil', 'llaves'],
  pablo: ['tijeras'],
  chuchi: ['zapato'],
  guille: [],
};

/**
 * Put into a chapter 2 game the objects chapter 1 ended with: those of the chapter 1 game just finished in this phone
 * (`previo`, which has `final`), or else the usual ones. Only adds what is missing, so it is safe on a game already
 * started (an older save, made before the bags were carried over).
 */
export function llevarObjetosDelCapitulo1(e: Estado, previo?: Estado | null) {
  const acabado = previo?.final ? previo.inv : null;
  for (const id of e.jugables) {
    for (const o of acabado?.[id] ?? OBJETOS_FIN_CAPITULO1[id]) if (!e.inv[id].includes(o)) e.inv[id].push(o);
  }
  return e;
}

function estadoInicial(): Estado {
  const s = spots();
  const en = (id: PjId) => ({ escena: 'bar0', X: s[id].X, y: s[id].y, face: s[id].face ?? 1 });
  return {
    v: 3,
    activo: 'fran',
    jugables: ['fran', 'pablo', 'chuchi', 'guille'],
    llegados: [],
    donde: { fran: en('fran'), pablo: en('pablo'), chuchi: en('chuchi'), guille: en('guille') },
    ropa: {},
    inv: { fran: [...OBJETOS_FIN_CAPITULO1.fran], pablo: [...OBJETOS_FIN_CAPITULO1.pablo], chuchi: [...OBJETOS_FIN_CAPITULO1.chuchi], guille: [...OBJETOS_FIN_CAPITULO1.guille] },
    flags: {},
    minutos: { fran: HORA(23, 47), pablo: HORA(23, 47), chuchi: HORA(23, 47), guille: HORA(23, 47) },
    usos: {},
  };
}

/** How far the night has gone (0–8): which of the bars is on (0–6), the world of the concepts (7) or the total chaos (8). */
const nivel = (g: Aventura) => Number(g.estado.flags['c2.nivel'] ?? 0);

/**
 * The next round: the bar is baked again a step further into the dream, behind a
 * flash, and everyone stays where they were.
 */
async function subirNivel(g: Aventura, n: number) {
  if (nivel(g) >= n) return;
  g.poner('c2.nivel', n);
  const escena = `bar${n}`;
  // From the Pang on (after the Pang, and when the bar turns over) everyone goes back to their place at the
  // counter, and the camera with them.
  const sitios = n >= 4 ? (bar(n) as unknown as Escena).spots : null;
  for (const id of g.estado.jugables) {
    const p = g.pjs.get(id);
    const d = g.estado.donde[id];
    if (!d) continue;
    if (sitios) Object.assign(d, { escena, X: sitios[id].X, y: sitios[id].y, face: sitios[id].face ?? 1 });
    else Object.assign(d, { escena, ...(p ? { X: p.X, y: p.y, face: p.face } : {}) });
  }
  g.hud.cerrarDialogo();
  const flash = h('div', { style: 'position:absolute;inset:0;z-index:30;pointer-events:none;background:#fff6e0;opacity:0;transition:opacity 350ms ease-in' });
  g.root.append(flash);
  requestAnimationFrame(() => (flash.style.opacity = '1'));
  await g.esperar(380);
  const cam = sitios ? sitios.fran.X : g.motor.cam;
  await g.irA(escena, false);
  g.motor.seguir(cam, true);
  flash.style.transition = 'opacity 900ms ease-out';
  flash.style.opacity = '0';
  await g.esperar(900);
  flash.remove();
}

/**
 * Whoever is standing where the active one has just gone (the machine, the counter by Vero) goes back
 * to their place at the counter: two in the same spot hide each other.
 */
function hacerSitio(g: Aventura) {
  const yo = g.activo;
  for (const id of g.estado.jugables) {
    const p = g.pjs.get(id);
    if (id === g.estado.activo || !p || Math.abs(p.X - yo.X) > 130) continue;
    // Back to their place, or, if that is right here too, a step aside.
    const casa = g.S.spots[id];
    const lejos = Math.abs(casa.X - yo.X) > 130;
    const X = lejos ? casa.X : yo.X + (Math.sign(casa.X - yo.X) || 1) * 170;
    void g.andar(X, lejos ? casa.y : p.y, id).then(() => p.lookAt(yo.X));
  }
}

/** Someone who is not the one for this step: a line of their own pointing at who is. */
async function noEres(g: Aventura, paso: string) {
  await g.hablar(`c2.${paso}.noeres`);
}

// ------------------------------------------------------------------ the steps

/** Fran orders the round: Vero sends the beers down the bar. */
async function ronda(g: Aventura) {
  g.cinematica(); // a cutscene from here: the dock is off until it ends (Aventura.cambioLibre)
  await g.hablar('c2.vero.ronda');
  g.pausado = true;
  const r = await jugarCanas(g.root, { rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  if (r === 'cancelado') return g.hablar('c2.canas.cancelada');
  if (r === 'hecho') g.minijuegoSuperado('canas');
  g.poner('c2.ronda');
  g.avanzarReloj(10);
  await g.hablar('c2.ronda.servida');
  await subirNivel(g, 1);
  await g.hablar('c2.tragaperras.idea');
  g.hud.ayuda(texto('objetivo.c2.moneda'), 6);
}

/** Vero, tapped (or the counter): what she says depends on who and when. */
async function vero(g: Aventura, item: string | null) {
  const quien = g.estado.activo;
  hacerSitio(g);
  if (item === 'duro') return g.hablar('c2.vero.duro');
  if (item) return g.hablar('c2.vero.objeto');
  if (!g.flag('c2.ronda')) return quien === 'fran' ? ronda(g) : noEres(g, 'ronda');
  if (!g.flag('c2.cambio') && quien === 'guille') {
    g.poner('c2.cambio');
    return g.hablar('c2.vero.cambio');
  }
  if (g.flag('c2.duroProbado') && !g.flag('c2.fresquitos')) return quien === 'pablo' ? fresquitos(g) : noEres(g, 'fresquitos');
  if (g.flag('c2.premio')) return g.hablar('c2.vero.sueno');
  if (g.flag('c2.fresquitos')) return g.hablar('c2.vero.despues');
  return g.hablar('c2.vero.charla');
}

/** Pablo and Vero: three lines to make her laugh; only the improv one works. */
async function fresquitos(g: Aventura) {
  g.cinematica(); // a cutscene from here: the dock is off until it ends (Aventura.cambioLibre)
  await g.hablar('c2.pablo.vero');
  for (;;) {
    const i = await g.hud.opciones([1, 2, 3].map((n) => texto(`c2.opcion.${n}`)));
    await g.hablar(`c2.pablo.opcion.${i + 1}`);
    if (i === 2) break;
  }
  g.poner('c2.fresquitos');
  g.avanzarReloj(15);
  await subirNivel(g, 2);
  await g.hablar('c2.fresquitos.despues');
}

/** The slot machine: out of order, then pulled from the wall by Guille (at once, whoever has looked at it before), then the duro. */
async function tragaperras(g: Aventura) {
  const quien = g.estado.activo;
  hacerSitio(g);
  if (!g.flag('c2.separada')) {
    if (quien === 'guille') return separar(g);
    if (!g.flag('c2.diagnostico')) {
      if (quien !== 'chuchi') return g.hablar('c2.tragaperras.rota');
      g.poner('c2.diagnostico');
      return g.hablar('c2.chuchi.tragaperras');
    }
    return noEres(g, 'separar');
  }
  if (g.flag('c2.duroVisible')) {
    g.poner('c2.duroVisible', false);
    g.dar('duro');
    g.sound.pickup();
    await g.hablar('c2.coger.duro');
    g.ayudaUnaVez('bolsa');
    return;
  }
  if (g.flag('c2.tirada')) return g.hablar('c2.tragaperras.despues');
  return g.hablar(g.tiene('duro') ? 'c2.tragaperras.conduro' : 'c2.tragaperras.encendida');
}

/**
 * Guille pulls the machine from the wall the moment he uses it: the duro shows, and Chuchi (who knows about routers)
 * walks over to the socket and switches it on, instead of doing it from where he stands.
 */
async function separar(g: Aventura) {
  const visto = g.flag('c2.diagnostico');
  await g.hablar(visto ? 'c2.guille.tragaperras.antes' : 'c2.guille.tragaperras.directo');
  g.poner('c2.separada');
  g.poner('c2.duroVisible');
  g.sound.pickup();
  await g.hablar('c2.guille.tragaperras');
  if (!visto) {
    g.poner('c2.diagnostico');
    await g.hablar('c2.chuchi.router');
  }
  g.hud.cerrarDialogo();
  // To the socket, passing in front of the others, and a look at the plug.
  const C = g.pjs.get('chuchi');
  if (C) {
    if (C.X < 2200) await g.andar(Math.min(C.X + 600, 2250), 995, 'chuchi');
    await g.andar(SOCKET_C.X, SOCKET_C.y, 'chuchi');
    C.lookAt(SOCKET_C.mira);
    await g.esperar(350);
  }
  await g.hablar('c2.chuchi.enchufa');
  g.poner('c2.encendida');
  g.sound.pickup();
  await g.hablar('c2.tragaperras.enciende');
  // And back to his place at the counter.
  const casa = g.S.spots.chuchi;
  if (casa) void g.andar(casa.X, casa.y, 'chuchi');
}

/** Where Chuchi stands to plug the machine in: beside it, in front of the wall socket (ENCHUFE, bar.mjs), looking at it. */
const SOCKET_C = { X: 2575, y: 905, mira: 2548 };

/** The duro into the machine: no pesetas, until the fresquitos; then a spin, and the song. */
async function meterDuro(g: Aventura) {
  hacerSitio(g);
  if (!g.flag('c2.fresquitos')) {
    g.poner('c2.duroProbado');
    g.sound.nope();
    await g.hablar('c2.duro.probar');
    return;
  }
  g.cinematica();
  g.quitar('duro');
  g.poner('c2.tirada');
  await g.hablar('c2.duro.entra');
  g.hud.cerrarDialogo();
  g.pausado = true;
  await mostrarTragaperras(g.root, { premio: false, cantada: g.flag('c2.premio'), rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  await g.hablar('c2.duro.sinpremio');
  await canto(g);
}

/** The first time the song is ever sung: the jackpot, the dream, and Fran's eyes. */
async function canto(g: Aventura) {
  g.cinematica(); // a cutscene from here: the dock is off until it ends (Aventura.cambioLibre)
  await g.hablar('c2.canto.antes');
  g.pausado = true;
  const r = await jugarCanto(g.root, { rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  if (r === 'hecho') g.minijuegoSuperado('canto');
  g.poner('c2.premio');
  await g.hablar('c2.premio.antes');
  g.hud.cerrarDialogo();
  g.pausado = true;
  await mostrarTragaperras(g.root, { premio: true, cara: 'fran', cantada: g.flag('c2.premio'), rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  await subirNivel(g, 3);
  await g.hablar('c2.premio');
  await ojosDeFran(g);
}

/** The camera closes in on Fran, he shuts his eyes, and the foam of his beer becomes the Pang. */
async function ojosDeFran(g: Aventura) {
  const F = g.pjs.get('fran');
  g.foco = F ? F.X : null;
  await g.esperar(700);
  await g.hablar('c2.fran.ojos');
  g.hud.cerrarDialogo();
  g.hud.setVisible(false);
  // A slow push onto his face with the camera tools (src/juego/camara.ts): free, and the scene stays as it is.
  void g.plano.zoom('fran', 2.4, 1800);
  await g.esperar(900);
  if (F) F.eyesClosed = true;
  await g.esperar(1000);
  g.pausado = true;
  const r = await jugarPangCapitulo(g.root.parentElement!, { rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  if (r === 'hecho') g.minijuegoSuperado('pang');
  await g.plano.reset(0);
  if (F) F.eyesClosed = false;
  g.poner('c2.pang');
  g.hud.setVisible(true);
  g.foco = null;
  await elRestoDeLaNoche(g);
}

/**
 * What happens after the Pang (first part of «el resto de la noche»): the night gets out of hand, and the
 * picture and the bar with it. The camera tools come from the texts (`@` lines, src/juego/camara.ts).
 */
async function elRestoDeLaNoche(g: Aventura) {
  // Fran wakes in the bar gone acid, with the dragon still in his head; the others do not believe him.
  await subirNivel(g, 4);
  await g.hablar('c2.noche.despierta');
  // The slot machine, in its own corner, spins alone: it stops on Pablo's face and dies.
  await g.hablar('c2.noche.maquina');
  g.hud.cerrarDialogo();
  g.pausado = true;
  await mostrarTragaperras(g.root, { premio: false, cara: 'pablo', cantada: g.flag('c2.premio'), rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  await g.hablar('c2.noche.pablo');
  // The bar turns upside down.
  await g.plano.reset(0);
  await subirNivel(g, 5);
  await g.hablar('c2.noche.reves');
  // The narrator of chapter 1, Pablo's shadow, peels off his feet and takes the story over.
  g.sacarSombra(true, 400);
  await g.esperar(900);
  await g.hablar('c2.noche.narrador');
  await g.hablar('c2.noche.consola');
  await alacantSun(g);
  // Pablo opens his eyes at the bar.
  const P = g.pjs.get('pablo');
  if (P) P.eyesClosed = true;
  g.hud.setVisible(true);
  await g.hablar('c2.noche.sueno');
  await g.plano.zoom('pablo', 3, 1400);
  await g.esperar(500);
  if (P) P.eyesClosed = false;
  await g.hablar('c2.noche.pablo.ojos');
  await g.plano.reset(500);
  await chuchiYElKart(g);
  await veroTragaAFran(g);
  // From here the player is free in the world of the concepts: `conceptos` hands over to `elCaos` (La última).
}

/** The picture of the bar just before Vero swallows Fran, kept for the cuts of the chaos (src/juego/estilos.ts). */
let fotoBar: HTMLCanvasElement | null = null;
let cortes: Cortes | null = null;

/**
 * Chuchi's game, Impropios Kart: the boss's e-mail at all hours, «me voy ya, de verdad», Fran's «¡Una más!» as a
 * manga clash, the slot machine stops on Chuchi's face and the floor of the bar spins into the track
 * (src/juego/pista.ts). Then he comes back with his glass and Vero fills it again.
 */
async function chuchiYElKart(g: Aventura) {
  await g.hablar('c2.chuchi.jefe');
  await g.hablar('c2.chuchi.maquina');
  g.hud.cerrarDialogo();
  g.pausado = true;
  await mostrarTragaperras(g.root, { premio: false, cara: 'chuchi', cantada: g.flag('c2.premio'), rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  await g.hablar('c2.chuchi.cara');
  await g.hablar('c2.chuchi.pista');
  g.hud.cerrarDialogo();
  g.hud.setVisible(false);
  await g.plano.reset(0);
  g.pausado = true;
  const { jugarKart } = await cargarModulo('kart');
  const r = await entrarEnPista(g, () => jugarKart(g.root, { sonido: g.sound, rapido: g.rapido })).finally(() => (g.pausado = false));
  // 'saltado' and 'cancelado' go on anyway: the story does not wait for the game.
  if (r === 'hecho') g.minijuegoSuperado('kart');
  g.hud.setVisible(true);
  await g.hablar('c2.chuchi.vuelve');
}

/** Vero grows, opens her mouth (the trailer's shot) and swallows Fran; the other three jump in after him and come undone. */
async function veroTragaAFran(g: Aventura) {
  g.cinematica(); // a cutscene from here: the dock is off until it ends (Aventura.cambioLibre)
  // The world of the concepts is baked while the mouth plays.
  void prepararConceptos(g).catch((e) => console.warn('[conceptos]', e));
  await subirNivel(g, 6);
  // She really does grow: a quick swell behind the counter while she speaks.
  void crecer(g, 'vero', 2.1, 2200);
  await g.hablar('c2.vero.crece');
  g.hud.cerrarDialogo();
  await g.plano.reset(0);
  fotoBar = await g.motor.instantanea(900);
  g.hud.setVisible(false);
  const boca = abrirBoca(g.root, { sonido: g.sound, rapido: g.rapido });
  try {
    await boca.abre();
    await g.hablar('c2.vero.traga');
    await boca.tragaFran();
    await g.hablar('c2.vero.salta');
    await boca.saltan();
    await g.hablar('c2.vero.dentro');
    await boca.bucea();
    await entrarEnConceptos(g, boca);
  } finally {
    boca.cerrar();
  }
}

/** An NPC swells to `hasta` times its size in `ms` (Actor.crece), with a small overshoot, off a timer: no loop of its own. */
async function crecer(g: Aventura, quien: 'vero', hasta: number, ms: number) {
  const a = g.npcs.get(quien);
  if (!a) return;
  if (g.rapido) return void (a.crece = hasta);
  const t0 = performance.now();
  for (;;) {
    const u = Math.min(1, (performance.now() - t0) / ms);
    const e = u * u * (3 - 2 * u);
    a.crece = 1 + (hasta - 1) * e * (1 + 0.04 * Math.sin(u * 20) * (1 - u));
    if (u >= 1) return;
    await new Promise((r) => setTimeout(r, 33));
  }
}

/** The bar is gone: everybody is in the world of the concepts (level 7), as figures. */
async function entrarEnConceptos(g: Aventura, boca: Boca) {
  g.poner('c2.nivel', 7);
  await prepararConceptos(g);
  for (const id of g.estado.jugables) g.estado.donde[id] = { escena: 'conceptos', X: CX_CONCEPTOS, y: 900, face: 1 };
  g.hud.cerrarDialogo();
  await g.plano.reset(0);
  await g.irA('conceptos', false);
  g.motor.seguir(CX_CONCEPTOS, true);
  await boca.fundir();
  g.hud.setVisible(true);
  await g.hablar('c2.conceptos.entrada');
  g.hud.ayuda(texto('objetivo.c2.conceptos.fran'), 8);
}

// ------------------------------------------------------------------ the world of the concepts

const CONCEPTOS = ['manana', 'casa', 'penultima', 'trabajo', 'reloj', 'no'] as const;
const FIGURAS = ['pablo', 'chuchi', 'guille', 'vero'] as const;

/** A tap on something in the world of the concepts. Each concept is an argument thrown at Fran, who turns it into «una más». */
async function tocarConcepto(g: Aventura, id: string) {
  golpear(g, id);
  if ((CONCEPTOS as readonly string[]).includes(id)) {
    // An argument already spent: Fran only reminds them.
    if (g.flag(`c2.con.${id}`)) return g.hablar('c2.conceptos.gastado');
    g.poner(`c2.con.${id}`);
    await g.hablar(`c2.conceptos.${id}`);
    gastarArgumento(g, id);
    g.sound.pickup();
    await g.hablar(`c2.conceptos.${id}.fran`);
    // All six spent: no excuse works with Fran, only THE LAST one (it shows up, just its outline).
    if (CONCEPTOS.every((c) => g.flag(`c2.con.${c}`)) && !g.flag('c2.fran.sinArgumentos')) {
      g.poner('c2.fran.sinArgumentos');
      revelarUltima(g);
      await g.hablar('c2.conceptos.revela');
      g.refrescar();
      g.hud.ayuda(texto('objetivo.c2.conceptos.ultima'), 8);
    }
    return;
  }
  if (id === 'ultima') {
    g.cinematica();
    g.poner('c2.con.ultima');
    await g.hablar('c2.conceptos.ultima');
    await elCaos(g);
    return;
  }
  if (id === 'fran' || (FIGURAS as readonly string[]).includes(id)) return g.hablar(`c2.figura.${id}`);
}

function zonasConceptos(g: Aventura): Record<string, ZonaLogica> {
  const z: Record<string, ZonaLogica> = {};
  for (const id of [...CONCEPTOS, ...FIGURAS, 'fran', 'ultima']) {
    z[id] = { nombre: () => texto(`zona.c2.concepto.${id}`), acercarse: false, usar: () => tocarConcepto(g, id) };
  }
  z.ultima.activa = () => ultimaRevelada();
  return z;
}

// ------------------------------------------------------------------ the total chaos

/**
 * The userito's rumble and roar as it rises (about 3.6 s, like its rise in conceptos-vivo.ts): the game has no recorded
 * roar, so it is made with the synth: a muffled noise and low thuds under the floor, then a growl that climbs and breaks.
 */
function rugido(g: Aventura) {
  const s = g.sound;
  s.ruido(3.4, 0.45, 150);
  for (let i = 0; i < 7; i++) s.tono(64 - i * 3, 0.34, 'sawtooth', 0.12, i * 0.48, 0.55);
  s.tono(78, 1.7, 'sawtooth', 0.09, 1.4, 2.4);
  s.tono(118, 1.5, 'square', 0.035, 1.5, 1.8);
  window.setTimeout(() => s.ruido(1.6, 0.2, 800), 1400);
}

/**
 * Saying «la última» sets off the total chaos (level 8): cuts between all the styles of the game, the camera
 * spinning, a dinosaur's shadow with «???» at the back, and Guille the flower stepping forward with a mug. The
 * texts drive it with marks (`@caos on`, `@girar 2 6000`...). After it, «Continuará».
 */
async function elCaos(g: Aventura) {
  g.poner('c2.nivel', 8);
  empezarCaos(g);
  // PokéUsera's art, effects and backdrop are baked in the background while the chaos plays (the chunk loads on its own).
  void cargarModulo('pokeusera').then((m) => m.precalentarPokeusera()).catch((e) => console.warn('[pokeusera]', e));
  cortes = await prepararCortes(g, fotoBar, ['fran:cara:enfado', 'vero:boca:picara', 'chuchi:ojos:seriedad', '!gogogo']);
  g.plano.alMarca = async (p) => {
    if (p[0] !== 'caos') return;
    if (p[1] === 'on') cortes?.iniciar();
    else if (p[1] === 'off') cortes?.parar();
    else if (p[1] === 'dino') {
      subirDino(g);
      rugido(g);
    }
    else if (p[1] === 'guille') darPasoGuille(g);
  };
  await g.hablar('c2.caos.empieza');
  await g.hablar('c2.caos.dino');
  await g.hablar('c2.caos.guille');
  await pokeusera(g);
  cortes?.parar();
  g.plano.alMarca = null;
  await safari(g);
  await fin(g);
  cortes?.liberar();
  cortes = null;
  fotoBar = null;
  liberarConceptos();
}

/**
 * PokéUsera (src/pokeusera/), the last game of the night: Guille steps forward with his jar («Este es mío») and the screen turns, suddenly, into
 * the game, played standing up (docs/CAPITULO2.md, «PokéUsera»). On a phone it asks for the turn («Gira el móvil»); on a computer the screen
 * turns by itself into a vertical column. The game's own text box and screens carry the rest. 'saltado' and 'cancelado' go on anyway.
 */
async function pokeusera(g: Aventura) {
  g.hud.cerrarDialogo();
  g.hud.setVisible(false);
  g.pausado = true;
  const { jugarPokeusera } = await cargarModulo('pokeusera');
  const r = await jugarPokeusera(g.root, { rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  if (r === 'hecho') g.minijuegoSuperado('pokeusera');
  g.hud.setVisible(true);
  await g.hablar('c2.pokeusera.vuelve');
}

/**
 * The minigames that load on demand are fetched in the background soon after the chapter starts (once), in the order the
 * night needs them, so a new publication in the middle of a game cannot take their files away (src/juego/modulos.ts).
 */
let precargaProgramada = false;
function programarPrecarga() {
  if (precargaProgramada) return;
  precargaProgramada = true;
  void precargarModulos(['sol', 'kart', 'pokeusera', 'pang'], 2500);
}

/**
 * Alacant Sun (src/sol/), the second game of the night, played by Pablo on the console that the picture of the
 * bar has been squeezed into: the reverse of the way the Sol ends, when the console shrinks and the bar comes back.
 * 'saltado' and 'cancelado' go on anyway: the story does not wait for the game.
 */
async function alacantSun(g: Aventura) {
  g.hud.cerrarDialogo();
  g.hud.setVisible(false);
  await g.plano.reset(0);
  g.pausado = true;
  const { jugarSol } = await cargarModulo('sol');
  const r = await entrarEnConsola(g, () => jugarSol(g.root, { sonido: g.sound })).finally(() => (g.pausado = false));
  // The shadow went into the story with the console; the bar is as it was.
  g.quitarSombra();
  if (r === 'hecho') g.minijuegoSuperado('sol');
}

/**
 * The safari: Guille, certified guide, proposes it in his caravan (the dialogue) and the trip is told as a moving comic
 * (src/ui/safari.ts, docs/CAPITULO2.md, «El safari»): from Madrid's ring road to the desert of Las Vegas. 'saltado' and
 * 'cancelado' go on anyway to the end card: the story does not wait for the comic.
 */
async function safari(g: Aventura) {
  g.sound.precargar('granjaRadio');
  g.sound.precargar('pasodoble');
  await g.hablar('c2.safari.propone');
  g.hud.cerrarDialogo();
  g.hud.setVisible(false);
  g.pausado = true;
  await jugarSafari(g.root, { rapido: g.rapido, sonido: g.sound }).finally(() => (g.pausado = false));
  g.hud.setVisible(true);
}

/** «¿Continuará?»: the end of what there is of chapter 2 so far, with the pasodoble that the comic already started. */
async function fin(g: Aventura) {
  g.hud.cerrarDialogo();
  await g.velar(true);
  g.sound.musica('pasodoble');
  await g.hud.rotulo(texto('c2.fin.continuara'), texto('c2.fin.sub'), undefined, 'continuara');
  g.capituloSuperado(2);
  await g.velar(false);
  g.onFin?.();
}

// ------------------------------------------------------------------ the bar

function zonasBar(g: Aventura): Record<string, ZonaLogica> {
  // Each place has a line for every level of the night it has one for, else the plain one.
  const mirarPorNivel = (id: string) => async () => {
    for (let n = nivel(g); n > 0; n--) if (g.hayDialogo(`c2.mirar.${id}.${n}`)) return g.hablar(`c2.mirar.${id}.${n}`);
    await g.hablar(`c2.mirar.${id}`);
  };
  const z: Record<string, ZonaLogica> = {};
  for (const id of ZONAS) z[id] = { nombre: () => texto(`zona.c2.${id}`), mirar: mirarPorNivel(id) };
  z.puerta.usar = () => g.hablar(g.flag('c2.premio') ? 'c2.puerta.sueno' : 'c2.puerta');
  z.barra.usar = () => vero(g, null);
  z.barra.usarObjeto = async (item) => {
    await vero(g, item);
    return true;
  };
  z.tragaperras.usar = () => tragaperras(g);
  z.tragaperras.usarObjeto = async (item) => {
    if (item !== 'duro') return false;
    await meterDuro(g);
    return true;
  };
  return z;
}

export const capitulo2: Capitulo = {
  escenas: {
    calle: () => calle() as unknown as Escena,
    bar0: () => bar(0) as unknown as Escena,
    bar1: () => bar(1) as unknown as Escena,
    bar2: () => bar(2) as unknown as Escena,
    bar3: () => bar(3) as unknown as Escena,
    bar4: () => bar(4) as unknown as Escena,
    bar5: () => bar(5) as unknown as Escena,
    bar6: () => bar(6) as unknown as Escena,
    conceptos: () => conceptos() as unknown as Escena,
  },

  estadoInicial,

  /** The four are together from the start: no one is chosen, the chapter opens on the street. */
  async inicio(g) {
    g.sound.precargar('brio');
    // The door of the Brío, as chapter 1 left it, while the narrator sets the night.
    await g.irA('calle', true, false);
    g.foco = PUERTA_BRIO;
    g.motor.seguir(PUERTA_BRIO, true);
    await g.velar(false);
    await g.hablar('c2.intro');
    g.hud.cerrarDialogo();
    // In through the door: from the entrance along the bar to the four of them.
    await g.velar(true);
    await g.irA('bar0', false, false);
    g.foco = spots().entrada.X;
    g.motor.seguir(spots().entrada.X, true);
    await g.velar(false);
    await g.esperar(500);
    g.foco = spots().fran.X;
    while (g.motor.camaraMoviendose) await g.esperar(100);
    g.foco = null;
    // Started for good: a save from here on carries on in the bar (main.ts, «empezada»).
    for (const id of g.estado.jugables) g.poner(`empezado.${id}`);
    await g.hablar('c2.mesa');
    g.hud.ayuda(texto('objetivo.c2.ronda'), 6);
    g.ayudaUnaVez('cambiar');
  },

  zonas(g, escena) {
    if (escena === 'conceptos') return zonasConceptos(g);
    return escena.startsWith('bar') ? zonasBar(g) : {};
  },

  /** The world of the concepts has no dock (the friends there are figures, not faces) and nobody walks: it is touched. */
  async alEntrar(g, escena) {
    programarPrecarga();
    g.root.classList.toggle('sin-reparto', escena === 'conceptos');
    g.fpsReposo = escena === 'conceptos' ? 60 : 30;
    if (escena !== 'conceptos') return;
    // The four are figures drawn live (src/capitulos/conceptos-vivo.ts): the people of the engine stay hidden.
    for (const p of g.pjs.values()) p.visible = false;
    g.foco = CX_CONCEPTOS;
  },

  npcs(g, escena) {
    if (!escena.startsWith('bar')) return [];
    const v = g.S.spots.vero;
    return [{ id: 'vero', X: v.X, y: v.y, face: v.face ?? 1 }];
  },

  situacion: () => '',
  async empezar() {},
  async final() {},

  async personaje(g, quien, item) {
    if (quien === 'vero') return vero(g, item);
    if (quien === 'aceituna' || quien === 'sombra') return;
    if (quien !== g.estado.activo) {
      if (item === 'duro') return g.hablar('c2.duro.dar');
      return g.hablar(`c2.charla.${quien}`);
    }
    if (item === 'duro') return g.hablar('c2.duro.mirar');
    if (item) return g.hablar('nadacontigo');
    return g.hablar(`c2.mirar.${quien}`);
  },

  async mirarObjeto(g, item) {
    await g.decir(g.estado.activo, texto(`objeto.${item}.texto`));
  },

  objetivo(g) {
    if (g.escena === 'conceptos') return texto(g.flag('c2.fran.sinArgumentos') ? 'objetivo.c2.conceptos.ultima' : 'objetivo.c2.conceptos.fran');
    if (!g.flag('c2.ronda')) return texto('objetivo.c2.ronda');
    if (g.flag('c2.tirada')) return null;
    if (g.flag('c2.fresquitos')) return texto('objetivo.c2.duro');
    if (g.flag('c2.duroProbado')) return texto('objetivo.c2.fresquitos');
    return texto('objetivo.c2.moneda');
  },

  pista(g) {
    const f = (k: string) => g.flag(k);
    if (g.escena === 'conceptos') return texto(f('c2.fran.sinArgumentos') ? 'pista.c2.conceptos.ultima' : 'pista.c2.conceptos.fran');
    if (!f('c2.ronda')) return texto('pista.c2.ronda');
    if (!f('c2.separada')) return texto(f('c2.diagnostico') ? 'pista.c2.enchufe' : f('c2.cambio') ? 'pista.c2.maquina' : 'pista.c2.cambio');
    if (f('c2.duroVisible')) return texto('pista.c2.cogerduro');
    if (!f('c2.duroProbado')) return texto('pista.c2.meterduro');
    if (!f('c2.fresquitos')) return texto('pista.c2.fresquitos');
    return texto('pista.c2.duro2');
  },

  vecinas: (escena) => {
    const m = escena.match(/^bar(\d)$/);
    if (escena === 'bar6') return ['conceptos'];
    return m && Number(m[1]) < 6 ? [`bar${Number(m[1]) + 1}`] : [];
  },

  musica(g) {
    if (g.escena === 'calle') return { pista: 'barPuerta', volumen: 1 };
    if (g.escena === 'conceptos') return { pista: 'brioSueno', volumen: 0.7 };
    if (!g.escena.startsWith('bar')) return null;
    return { pista: nivel(g) >= 2 ? 'brioSueno' : 'brio', volumen: VOLUMEN_BAR };
  },

  /** The four's drinks at the bar (src/capitulos/bebidas.ts). */
  tick(g, dt) {
    tickBebidas(g, dt);
  },

  dibujar(g, ctx, capa) {
    if (g.escena === 'conceptos') dibujarConceptos(g, ctx, capa, nivel(g));
    else if (g.escena.startsWith('bar')) dibujarBarVivo(g, ctx, capa, nivel(g));
  },
};

/**
 * Test hook for scripts/capitulo2.mjs and the screenshots: lets a script start each piece of the last stretch of the
 * night directly, without playing the six minutes before it. The game itself does not use it.
 */
export const pruebasC2 = { subirNivel, chuchiYElKart, veroTragaAFran, elRestoDeLaNoche, alacantSun };
