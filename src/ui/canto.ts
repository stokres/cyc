// Minigame: «El canto a cuatro» (chapter 2). The four friends in a row, big faces. A festive pasodoble
// plays and each one has his turn to sing two syllables of «Ca-mio-neees-y-ca-ra-va-naaas» (Pablo
// «Ca-mio», Fran «neees-y», Chuchi «ca-ra», Guille «va-naaas»): a ring closes in on his face and
// on the beat he lights up. One tap on the face that is lit, on time: his syllables pop out big
// and his brass stab sounds. A tap on somebody else, or off the beat, or none: «¡Desafinado!»
// and the phrase starts again. The phrase is sung twice, the second time quicker and louder (its own
// bed of music); at the end, «¡CAMIONEEES Y CARAVANAAAS!». After two mistakes «Saltar» appears
// (docs/JUGABILIDAD.md).
//
// The tune is our own, the trailer's brass chant (tools/musica/canto.py, never Paquito el
// Chocolatero's). The beat is the music's own clock (Sound.posicion), like the trailer: a bar is a
// quarter of the loop, a phrase starts on a bar line and its turns come one bar apart, starting
// at least a bar ahead; so a slow phone drops frames but the turns stay on the beat. Without
// sound the frames' own clock does the same. SILABA (the seconds between a singer's two
// syllables) is the one in canto.py: change one, change both.
//
// Performance (docs/ESTILO.md, T5): the stage and the faces (three moods each) are bitmaps made once per
// screen size; each frame only draws them and a few rings. The syllables are text over the canvas.
// The loop never passes 60 fps.
import { h } from './hud';
import { esVertical } from './orientacion';
import { texto } from '../juego/textos';
import { REPARTO, type PjId } from '../juego/reparto';
import { FONTS } from '../motor/escena';
import { elipse, lienzo } from './bar-pintura';
import { crearFicha } from './fichas';
import { MUSICA, type Pista } from '../sonido/musica';
import type { SonidoMinijuego } from '../core/audio';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

/** The singers, left to right, each with his stab (the two syllables). */
const CANTORES: Array<{ id: PjId; golpe: Pista }> = [
  { id: 'pablo', golpe: 'cantoPablo' },
  { id: 'fran', golpe: 'cantoFran' },
  { id: 'chuchi', golpe: 'cantoChuchi' },
  { id: 'guille', golpe: 'cantoGuille' },
];
/** Seconds between a singer's two syllables (the stabs in canto.py). */
const SILABA = 0.3;
/** The two times round: the bed of music, how much error a tap may have (seconds each way) and how loud the stabs are. */
const PASADAS: Array<{ pista: Pista; ventana: number; fuerza: number }> = [
  { pista: 'cantoA', ventana: 0.24, fuerza: 0.75 },
  { pista: 'cantoB', ventana: 0.2, fuerza: 1 },
];
/** Bars of a loop (canto.py). */
const COMPASES = 4;
/** Mistakes before «Saltar». */
const PARA_SALTAR = 2;
/** How early a tap counts as a mistake (in bars); earlier than this it is nobody's turn and is ignored. */
const ESTORBO = 0.55;
/** Seconds without the music's clock before it is given up for the frames' own. */
const ESPERA_RELOJ = 2.5;

const MOODS = { idle: { mood: 'neutral' }, canta: { mood: 'happy', mouthKind: 'a' }, triste: { mood: 'sad' } } as const;
type Cara = keyof typeof MOODS;

/** State the automatic tests read (scripts/rendimiento.mjs), positions in CSS px. */
export interface EstadoCanto {
  estado: 'carga' | 'canta' | 'fallo' | 'cambio' | 'gana';
  pasada: number;
  /** The music's time on this pass (seconds), the next turn's time and who it is (0 to 3), -1 for none. */
  tm: number;
  proximo: number;
  cantor: number;
  ventana: number;
  compas: number;
  /** Where each face is (x, y of its centre) and its radius. */
  caras: Array<{ x: number; y: number; r: number }>;
  fallos: number;
  hechos: number;
  fotogramas: number;
}

export interface OpcionesCanto {
  rapido?: boolean;
  sonido?: SonidoMinijuego;
}

export function jugarCanto(parent: HTMLElement, o: OpcionesCanto = {}): Promise<Resultado> {
  const rapido = o.rapido ?? false;
  const { sonido } = o;
  const canvas = h('canvas', { class: 'lienzo-canto' });
  const aviso = h('div', { class: 'aviso-mini', hidden: true });
  const gana = h('div', { class: 'canto-gana', hidden: true }, texto('canto.gana'));
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const instrucciones = h('p', { class: 'instrucciones' }, texto('canto.instrucciones'));
  // The syllables, split between the four singers («Ca-mio-neees-y-...» two each).
  const todas = texto('canto.silabas').split('-');
  const porCantor = Math.max(1, Math.ceil(todas.length / CANTORES.length));
  const silabas = CANTORES.map((_, i) => todas.slice(i * porCantor, (i + 1) * porCantor));
  const globos = silabas.map((lista) => h('div', { class: 'silabas-canto' }, ...lista.map((sil) => h('span', {}, sil))));
  const capa = h('div', { class: 'cubierta minijuego canto' }, canvas, instrucciones, ...globos, aviso, gana, saltar, cerrar);
  parent.append(capa);
  const ctx = canvas.getContext('2d')!;

  // ---------------------------------------------------------------- what is painted, once per screen size
  let W = 844;
  let H = 390;
  let dpr = 1;
  let fondo: HTMLCanvasElement | null = null;
  let brillo: HTMLCanvasElement | null = null;
  const caras: Array<Partial<Record<Cara, HTMLCanvasElement>>> = CANTORES.map(() => ({}));
  const geo = { xs: [0, 0, 0, 0], y: 0, R: 0 };

  const pintarFondo = () => {
    const dp = Math.min(dpr, 1.5);
    const [c, x] = lienzo(W, H, dp);
    // A night of fiestas: a violet sky, a string of pennants, the stage's boards and a few spotlights.
    const cielo = x.createLinearGradient(0, 0, 0, H);
    cielo.addColorStop(0, '#1a0f33');
    cielo.addColorStop(0.62, '#4a1d3e');
    cielo.addColorStop(0.63, '#3a1c18');
    cielo.addColorStop(1, '#1c0d0c');
    x.fillStyle = cielo;
    x.fillRect(0, 0, W, H);
    const colores = ['#e8452e', '#f2b632', '#2f9ad8', '#6fae3a', '#d8589a'];
    for (let fila = 0; fila < 2; fila++) {
      const y0 = H * (0.035 + fila * 0.05);
      x.strokeStyle = '#2a1a22';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(0, y0);
      x.quadraticCurveTo(W / 2, y0 + H * 0.06, W, y0);
      x.stroke();
      for (let k = 1; k < 20; k++) {
        const u = k / 20;
        const bx = u * W;
        const by = y0 + 4 * u * (1 - u) * H * 0.03;
        x.fillStyle = colores[(k + fila * 2) % colores.length];
        x.beginPath();
        x.moveTo(bx - W * 0.014, by);
        x.lineTo(bx + W * 0.014, by);
        x.lineTo(bx, by + H * 0.05);
        x.closePath();
        x.fill();
      }
    }
    // The stage's boards.
    x.fillStyle = 'rgba(0,0,0,0.25)';
    for (let k = 0; k < 9; k++) x.fillRect(0, H * 0.63 + ((H * 0.37) * (k + 0.2)) / 9, W, 1.5);
    // The names under the faces.
    const tam = Math.max(14, Math.round(H * 0.048));
    x.font = `400 ${tam}px ${FONTS.display}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    CANTORES.forEach(({ id }, i) => {
      elipse(x, geo.xs[i], geo.y + geo.R * 1.08, geo.R * 0.9, geo.R * 0.14, 'rgba(0,0,0,0.35)');
      x.lineWidth = 3;
      x.strokeStyle = 'rgba(20,8,6,0.85)';
      x.strokeText(REPARTO[id].nombre, geo.xs[i], geo.y + geo.R + tam * 0.95);
      x.fillStyle = '#f3ead6';
      x.fillText(REPARTO[id].nombre, geo.xs[i], geo.y + geo.R + tam * 0.95);
    });
    fondo = c;
  };

  const medir = () => {
    const r = capa.getBoundingClientRect();
    W = Math.max(2, r.width);
    H = Math.max(2, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    geo.R = Math.min(W * 0.09, H * 0.225);
    geo.y = H * 0.48;
    geo.xs = CANTORES.map((_, i) => W * (0.5 + (i - 1.5) * 0.225));
    const dp = Math.min(dpr, 1.5);
    pintarFondo();
    const rad = geo.R * 1.9;
    const [b, bx] = lienzo(rad * 2, rad * 2, dp);
    const halo = bx.createRadialGradient(rad, rad, geo.R * 0.7, rad, rad, rad);
    halo.addColorStop(0, 'rgba(255,214,110,0.6)');
    halo.addColorStop(1, 'rgba(255,214,110,0)');
    bx.fillStyle = halo;
    bx.fillRect(0, 0, rad * 2, rad * 2);
    brillo = b;
    CANTORES.forEach(({ id }, i) => {
      for (const cara of Object.keys(MOODS) as Cara[]) {
        void crearFicha(id, MOODS[cara], geo.R, dp)
          .then((f) => (caras[i][cara] = f))
          .catch(() => {});
      }
    });
    // The syllables float above each face.
    globos.forEach((g, i) => {
      g.style.left = `${Math.round(geo.xs[i])}px`;
      g.style.top = `${Math.round(geo.y - geo.R - 6)}px`;
    });
  };
  medir();
  const ro = new ResizeObserver(medir);
  ro.observe(capa);
  // The names are in the titles' font: painted again once it has loaded.
  void document.fonts?.load('400 20px Graduate').then(() => pintarFondo());

  // ---------------------------------------------------------------- state
  let estado: EstadoCanto['estado'] = 'carga';
  let pasada = 0;
  let pista: Pista = PASADAS[0].pista;
  /** The frames' own clock for this pass, used until (or instead of) the music's. */
  let tv = 0;
  let sinOido = !sonido?.posicion;
  let t = 0;
  let fotogramas = 0;
  let fallos = 0;
  /** The turns of the phrase being sung: when each is (the music's time), and which have been sung. */
  let turnos: number[] = [];
  let siguiente = 0;
  /** Seconds left of a pause (a message, the change of pass). */
  let pausa = 0;
  /** Which face is shown singing / sad, and until when (the pass's clock). */
  const hasta: number[] = CANTORES.map(() => 0);
  const cara: Cara[] = CANTORES.map(() => 'idle');
  /** What is waiting to appear: the second syllable of each singer, at this time. */
  const segundas: number[] = CANTORES.map(() => 0);
  /** A burst ring where a tap was right: [face, time]. */
  const estallidos: Array<[number, number]> = [];
  let acabar: ((r: Resultado) => void) | null = null;

  const pas = () => PASADAS[pasada];
  const compas = () => {
    const m = MUSICA[pas().pista];
    return (m.fin - m.inicio) / COMPASES;
  };

  /** The music's time on this pass: its own clock while it plays, otherwise the frames'. */
  const reloj = () => {
    if (sinOido) return tv;
    const p = sonido!.posicion!(pista);
    return p === null ? tv : p - MUSICA[pista].inicio;
  };
  const hayOido = () => !sinOido && sonido!.posicion!(pista) !== null;

  const mostrar = (clave: string, s = 1.4) => {
    aviso.textContent = texto(clave);
    aviso.hidden = false;
    aviso.classList.remove('salta');
    void aviso.offsetWidth;
    aviso.classList.add('salta');
    pausa = rapido ? 0.15 : s;
  };

  const limpiar = () => {
    cara.fill('idle');
    hasta.fill(0);
    segundas.fill(0);
    for (const g of globos) for (const s of Array.from(g.children)) s.classList.remove('on');
  };

  /** A new try at the phrase: its four turns, a bar apart, the first one at least a bar from now, on a bar line. */
  const planear = () => {
    limpiar();
    aviso.hidden = true;
    const b = compas();
    const primero = Math.ceil((reloj() + b) / b) * b;
    turnos = [0, 1, 2, 3].map((k) => primero + k * b);
    siguiente = 0;
    estado = 'canta';
  };

  /** Starts this pass's music; the clock is waited for before the first try. */
  const empezarPasada = () => {
    pista = pas().pista;
    tv = 0;
    sinOido = !sonido?.posicion;
    estallidos.length = 0;
    sonido?.musica(pista, 0.2);
    estado = 'carga';
  };

  const fallar = (quien: number) => {
    fallos++;
    estado = 'fallo';
    sonido?.efecto?.('cantoFallo', 0.9);
    for (const i of [quien, siguiente]) {
      if (i >= CANTORES.length) continue;
      cara[i] = 'triste';
      hasta[i] = Infinity;
    }
    mostrar('canto.fallo', 1.5);
    if (fallos >= PARA_SALTAR) saltar.hidden = false;
  };

  const cantar = (k: number, tm: number) => {
    cara[k] = 'canta';
    hasta[k] = tm + 0.7;
    const sp = Array.from(globos[k].children);
    for (const s of sp) s.classList.remove('on');
    void globos[k].offsetWidth;
    sp[0]?.classList.add('on');
    segundas[k] = tm + SILABA;
    estallidos.push([k, tm]);
    sonido?.efecto?.(CANTORES[k].golpe, pas().fuerza);
  };

  const tocar = (x: number) => {
    if (estado !== 'canta') return;
    const tm = reloj();
    const b = compas();
    // Whose face: the nearest column.
    let quien = 0;
    for (let i = 1; i < geo.xs.length; i++) if (Math.abs(x - geo.xs[i]) < Math.abs(x - geo.xs[quien])) quien = i;
    const k = siguiente;
    const dt = tm - turnos[k];
    if (dt < -ESTORBO * b) return; // nobody's turn yet: a stray tap
    if (quien === k && Math.abs(dt) <= pas().ventana) {
      cantar(k, tm);
      siguiente++;
      if (siguiente >= turnos.length) {
        // The last syllable rings; then the next pass, or the end.
        estado = 'cambio';
        pausa = rapido ? 0.2 : b * 1.1;
      }
    } else fallar(quien);
  };

  const estadoPrueba = (): EstadoCanto => ({
    estado,
    pasada,
    tm: reloj(),
    proximo: turnos[siguiente] ?? -1,
    cantor: siguiente < turnos.length ? siguiente : -1,
    ventana: pas().ventana,
    compas: compas(),
    caras: geo.xs.map((x) => ({ x, y: geo.y, r: geo.R })),
    fallos,
    hechos: siguiente,
    fotogramas,
  });
  (window as unknown as { __canto?: () => EstadoCanto }).__canto = estadoPrueba;

  // ---------------------------------------------------------------- the update
  const actualizar = (dt: number) => {
    tv += dt;
    const tm = reloj();
    for (let i = 0; i < CANTORES.length; i++) {
      if (hasta[i] && tm > hasta[i]) {
        hasta[i] = 0;
        cara[i] = 'idle';
      }
      if (segundas[i] && tm >= segundas[i]) {
        segundas[i] = 0;
        globos[i].children[1]?.classList.add('on');
      }
    }
    while (estallidos.length && tm - estallidos[0][1] > 0.5) estallidos.shift();
    if (estado === 'carga') {
      // Before the first try: the music's clock, or the frames' own if it never comes.
      if (hayOido() || tv > ESPERA_RELOJ) {
        if (!hayOido()) sinOido = true;
        planear();
      }
    } else if (estado === 'canta') {
      // A turn that went by without a tap.
      if (siguiente < turnos.length && tm > turnos[siguiente] + pas().ventana) fallar(siguiente);
    } else if (pausa > 0) {
      pausa -= dt;
      if (pausa <= 0) {
        aviso.hidden = true;
        if (estado === 'fallo') planear();
        else if (estado === 'cambio') {
          if (pasada === 0) {
            pasada = 1;
            mostrar('canto.segunda', 1.2);
            empezarPasada();
            pausa = 0;
          } else {
            estado = 'gana';
            sonido?.efecto?.('cantoFinal', 1);
            gana.hidden = false;
            for (const g of globos) g.hidden = true;
            instrucciones.hidden = true;
            for (let i = 0; i < CANTORES.length; i++) {
              cara[i] = 'canta';
              hasta[i] = Infinity;
            }
            pausa = rapido ? 0.3 : 3.2;
          }
        } else if (estado === 'gana') acabar?.('hecho');
      }
    }
  };

  // ---------------------------------------------------------------- the drawing
  const pintar = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (fondo) ctx.drawImage(fondo, 0, 0, W, H);
    const tm = reloj();
    const b = compas();
    const R = geo.R;
    // The next turn: its ring closes in on the face and, in the window, the face glows.
    const k = estado === 'canta' ? siguiente : -1;
    const alfa = estado === 'gana' ? 1 : 0;
    // A beat in the faces: a small bounce.
    const pulso = (tm / (b / 2)) % 1;
    const bote = estado === 'carga' ? 0 : 0.03 * Math.max(0, 1 - pulso / 0.2);
    CANTORES.forEach((_, i) => {
      const enVentana = k === i && Math.abs(tm - turnos[i]) <= pas().ventana;
      const crece = 1 + bote + (enVentana ? 0.07 : 0) + (cara[i] === 'canta' ? 0.06 : 0) + alfa * 0.05 * Math.sin(t * 12 + i);
      const f = caras[i][cara[i]] ?? caras[i].idle;
      if (enVentana && brillo) ctx.drawImage(brillo, geo.xs[i] - R * 1.9, geo.y - R * 1.9, R * 3.8, R * 3.8);
      if (f) {
        ctx.save();
        ctx.translate(geo.xs[i], geo.y);
        ctx.scale(crece, crece);
        ctx.drawImage(f, -R, -R, 2 * R, 2 * R);
        ctx.restore();
      }
    });
    if (k >= 0) {
      // Who is next, before its ring comes: a faint gold circle.
      ctx.strokeStyle = 'rgba(255,224,138,0.3)';
      ctx.lineWidth = Math.max(2, R * 0.04);
      ctx.beginPath();
      ctx.arc(geo.xs[k], geo.y, R * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      const u = (turnos[k] - tm) / (b * 0.85);
      if (u < 1.05 && u > -0.4) {
        const r = R * (1.1 + 0.7 * Math.max(0, Math.min(1, u)));
        ctx.strokeStyle = `rgba(255,224,138,${Math.max(0, Math.min(1, 1.2 - u))})`;
        ctx.lineWidth = Math.max(3, R * 0.07);
        ctx.beginPath();
        ctx.arc(geo.xs[k], geo.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // The burst where a tap was right.
    for (const [i, t0] of estallidos) {
      const u = Math.min(1, (tm - t0) / 0.5);
      ctx.strokeStyle = `rgba(255,236,170,${1 - u})`;
      ctx.lineWidth = Math.max(2, R * 0.1 * (1 - u));
      ctx.beginPath();
      ctx.arc(geo.xs[i], geo.y, R * (1.05 + 0.7 * u), 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // ---------------------------------------------------------------- loop
  return new Promise((resolve) => {
    let ultimo = performance.now();
    let vivo = true;
    const fin = (r: Resultado) => {
      if (!vivo) return;
      vivo = false;
      ro.disconnect();
      sonido?.pararMusica();
      delete (window as unknown as { __canto?: unknown }).__canto;
      capa.remove();
      canvas.width = canvas.height = 0;
      resolve(r);
    };
    acabar = fin;
    const paso = (ahora: number) => {
      if (!vivo) return;
      // Phone held upright: the notice covers the game and the sound is suspended. Time does not pass.
      if (esVertical()) {
        ultimo = ahora;
        requestAnimationFrame(paso);
        return;
      }
      // 60 fps at most, also on 120 Hz screens.
      if (ahora - ultimo < 1000 / 60 - 4) {
        requestAnimationFrame(paso);
        return;
      }
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      t += dt;
      actualizar(dt);
      if (!vivo) return;
      pintar();
      fotogramas++;
      requestAnimationFrame(paso);
    };
    // The music and the stabs are asked for first, so the first turn is on the beat; if they are slow, it starts without.
    const listo = Promise.all([sonido?.lista?.(PASADAS[0].pista), sonido?.lista?.(PASADAS[1].pista), sonido?.prepararEfectos?.(...CANTORES.map((c) => c.golpe), 'cantoFallo', 'cantoFinal')]);
    void Promise.race([listo, new Promise((r) => setTimeout(r, 2500))]).then(() => {
      if (!vivo) return;
      empezarPasada();
      requestAnimationFrame(paso);
    });
    canvas.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      tocar(e.clientX - canvas.getBoundingClientRect().left);
    });
    saltar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('saltado');
    });
    cerrar.addEventListener('click', (e) => {
      e.stopPropagation();
      fin('cancelado');
    });
  });
}
