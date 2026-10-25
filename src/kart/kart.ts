// «Impropios Kart»: Chuchi's parody of the first *Mario Kart* for the Super Nintendo (docs: the proposal in
// /capitulo2/impropios-kart.md). Six karts, three laps round a country house (the door, the garden and its pool, the
// lounge, the kitchen, the drag gala's catwalk), with the floor in «mode 7», items from «?» boxes and a podium.
//
// A minigame of the story, like src/pang/capitulo.ts and src/sol/sol.ts: same cover (`.cubierta.minijuego`), same
// «Saltar» (after two lost races) and close button as the others, and it ends with 'hecho' (Chuchi finished first),
// 'saltado' or 'cancelado'. Lost a race: «Has quedado N.º, otra vez» and it starts again, with no limit.
//
// Performance (docs/ESTILO.md, T5/T6): the circuit's floor, the karts' sixteen views, the items and the scenery are
// painted once into cached canvases / typed arrays (circuit.ts, arte.ts); per frame there is one floor pass over ~90 rows
// of a Uint32Array, a handful of scaled drawImage calls and the HUD, on a 256×144 canvas that the screen blows up
// without smoothing. The loop never runs faster than 60 fps. `window.__kart()` counts frames and gives the tests a hand.
import type { SonidoMinijuego } from '../core/audio';
import { cargarTextos, texto } from '../juego/textos';
import textosKart from '../textos/kart.md?raw';
import { h } from '../ui/hud';
import { esVertical } from '../ui/orientacion';
import { anchoTexto } from '../sol/fuente';
import { ctx as ctx2d, lienzo as lienzoPx } from '../sol/pixel';
import { ANCLA_KART, ANGULOS, conBoa, icono, lavado, NIEBLA, panorama, spriteBrillo, spriteCaja, spriteCharco, spriteDecorado, spritesKart, UNIDAD_PX, type ItemId } from './arte';
import { Carrera, CUENTA, VUELTAS, VMAX, type Evento, type Kart, type Proyectil } from './carrera';
import { crearEntrada } from './entrada';
import { banda, dibujarHud, dibujarMinimapa, dibujarPodio, dibujarSemaforo, reiniciarConfeti, rotulo, ruletaItem } from './hud';
import { ATRAS_CAM, H, HOR, Modo7, W, type Ambiente } from './modo7';
import { CLAVE_ZONA, construirPista, TAM, type Pista } from './pista';
import { PILOTOS } from './pilotos';
import { SonidoKart } from './sonido';

export type Resultado = 'hecho' | 'saltado' | 'cancelado';

export interface OpcionesKart {
  sonido?: SonidoMinijuego;
  /** Skips the waiting (tests and the minigames menu's quick mode). */
  rapido?: boolean;
}

/** What the test hook (`window.__kart()`) tells and lets a script do. */
export interface GanchoKart {
  fotogramas: number;
  /** 'cargando' | 'carrera' | 'podio' */
  fase: string;
  derrotas: number;
  carrera: Carrera | null;
  pista: Pista | null;
  /** Closes the game as if the × button had been pressed. */
  cerrar(): void;
  /** The computer drives Chuchi's kart too (a bot, for tests and the performance check). */
  auto(si: boolean): void;
  /** Gives Chuchi an item now. */
  darItem(id: ItemId): void;
  /** Uses the item Chuchi holds. */
  usar(): void;
  /** Chuchi at the start of the last lap, well ahead of the rest. */
  ultimaVuelta(): void;
  /** Chuchi on the way to a sure win (last lap, a lap ahead, bot driving). */
  ganar(): void;
  /** The five rivals finish and Chuchi is about to come last. */
  perder(): void;
  /** Puts Chuchi at a distance from the line (units, along the circuit) and a side (negative: left). */
  colocar(sRel: number, lado?: number): void;
  /** Runs the race this many seconds at once, with no drawing. */
  simular(seg: number): void;
  /** Skips the countdown. */
  saltarCuenta(): void;
  /** Pretends the keys: -1 left, 0, 1 right. */
  mando(giro: number): void;
}

const SILENCIO: SonidoMinijuego = { musica() {}, pararMusica() {} };
/** Lost races after which «Saltar» appears (docs/JUGABILIDAD.md). */
const PARA_SALTAR = 2;
const DURA_PODIO = 5.2;
const DURA_META = 2.4;

const envolver = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const mod = (a: number, n: number) => ((a % n) + n) % n;

interface Elemento {
  dz: number;
  sx: number;
  sy: number;
  k: number;
  /** 0 scenery, 1 box, 2 puddle, 3 projectile, 4 kart */
  tipo: number;
  ref: unknown;
}

interface Chispa {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  col: string;
}

export function jugarKart(root: HTMLElement, o: OpcionesKart = {}): Promise<Resultado> {
  cargarTextos(textosKart);
  const sonido = new SonidoKart(o.sonido ?? SILENCIO);
  const rapido = !!o.rapido;
  const corte = new AbortController();
  let motivo: Resultado = 'cancelado';
  let fotogramas = 0;
  let derrotas = 0;

  // ---------------------------------------------------------------- the screen
  const lienzo = h('canvas', { class: 'kart-lienzo' });
  lienzo.width = W;
  lienzo.height = H;
  const ayuda = h('p', { class: 'instrucciones' }, texto('kart.objetivo'));
  const saltar = h('button', { class: 'btn fantasma saltar', hidden: true }, texto('minijuego.saltar'));
  const cerrar = h('button', { class: 'cerrar', 'aria-label': texto('boton.cerrar') }, '×');
  const capa = h('div', { class: 'cubierta minijuego kart' }, lienzo, ayuda, saltar, cerrar);
  root.append(capa);
  const g = lienzo.getContext('2d', { alpha: false })!;
  g.imageSmoothingEnabled = false;
  const entrada = crearEntrada(capa);
  let mandoTeclado: number | null = null;

  saltar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'saltado';
    corte.abort();
  });
  cerrar.addEventListener('click', (e) => {
    e.stopPropagation();
    motivo = 'cancelado';
    corte.abort();
  });

  /** The canvas as big as fits, in whole multiples of device pixels (crisp, no blur), centred. */
  const ajustar = () => {
    const r = capa.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let k = Math.floor(Math.min((r.width * dpr) / W, (r.height * dpr) / H));
    if (k < 1) k = Math.min((r.width * dpr) / W, (r.height * dpr) / H);
    lienzo.style.width = `${(W * k) / dpr}px`;
    lienzo.style.height = `${(H * k) / dpr}px`;
  };
  ajustar();
  window.addEventListener('resize', ajustar);

  // ---------------------------------------------------------------- state
  let pista: Pista | null = null;
  let progresoCarga = 0;
  let m7: Modo7 | null = null;
  let carrera: Carrera | null = null;
  let fase: 'cargando' | 'carrera' | 'podio' = 'cargando';
  let tFase = 0;
  let reloj = 0;
  const cam = { ang: 0 };
  /** How far behind the kart the camera is now (it comes closer when a wall would be in the way). */
  let atras = ATRAS_CAM;
  /** The haze of the room the camera is in, eased from one room to the next. */
  const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const AMBIENTES: Ambiente[] = [
    { r: hex(NIEBLA)[0], g: hex(NIEBLA)[1], b: hex(NIEBLA)[2], desde: 380, hasta: 1000 },
    { r: 0x3c, g: 0x2a, b: 0x22, desde: 150, hasta: 560 },
    { r: 0x8e, g: 0x7a, b: 0x66, desde: 190, hasta: 660 },
    { r: 0x1c, g: 0x0c, b: 0x2a, desde: 130, hasta: 540 },
  ];
  const ambiente: Ambiente = { ...AMBIENTES[0] };
  let metaT = -1;
  let zonaAnt = -1;
  let tBanner = 0;
  let txtBanner = '';
  let tVueltaFinal = 0;
  let tMeta = 0;
  let nombreItem: ItemId | null = null;
  let tNombre = 99;
  let podio: { top: Kart[]; ganado: boolean; puesto: number } | null = null;
  let tAyuda = 0;
  const chispas: Chispa[] = [];
  const pool: Elemento[] = [];
  const orden: Elemento[] = [];
  let usados = 0;

  const elemento = (dz: number, sx: number, sy: number, k: number, tipo: number, ref: unknown) => {
    let e = pool[usados];
    if (!e) {
      e = { dz: 0, sx: 0, sy: 0, k: 0, tipo: 0, ref: null };
      pool[usados] = e;
    }
    usados++;
    e.dz = dz;
    e.sx = sx;
    e.sy = sy;
    e.k = k;
    e.tipo = tipo;
    e.ref = ref;
  };

  const gancho: GanchoKart = {
    get fotogramas() {
      return fotogramas;
    },
    get fase() {
      return fase;
    },
    get derrotas() {
      return derrotas;
    },
    get carrera() {
      return carrera;
    },
    get pista() {
      return pista;
    },
    cerrar: () => {
      motivo = 'cancelado';
      corte.abort();
    },
    auto: (si) => {
      if (carrera) carrera.auto = si;
    },
    darItem: (id) => carrera && carrera.darItem(carrera.humano, id),
    usar: () => carrera && carrera.usarItem(carrera.humano),
    ultimaVuelta: () => {
      if (!carrera) return;
      carrera.colocar(carrera.humano, carrera.pista.longitud - 260, 0, VUELTAS);
    },
    ganar: () => {
      if (!carrera) return;
      for (const k of carrera.karts) if (!k.humano) carrera.colocar(k, carrera.pista.longitud - 700 - k.i * 25, (k.i % 2 ? 1 : -1) * 15, VUELTAS - 1);
      carrera.colocar(carrera.humano, carrera.pista.longitud - 300, 0, VUELTAS);
      carrera.auto = true;
      carrera.t = Math.max(carrera.t, 0);
      carrera.fase = 'carrera';
    },
    perder: () => {
      if (!carrera) return;
      for (const k of carrera.karts) if (!k.humano) carrera.forzarLlegada(k);
      carrera.colocar(carrera.humano, carrera.pista.longitud - 300, 0, VUELTAS);
      carrera.t = Math.max(carrera.t, 0);
      carrera.fase = 'carrera';
    },
    colocar: (s, lado = 0) => carrera && carrera.colocar(carrera.humano, s, lado, carrera.humano.cruces),
    simular: (seg) => {
      if (!carrera) return;
      for (let t = 0; t < seg; t += 1 / 30) {
        carrera.actualizar(1 / 30, { giro: mandoTeclado ?? 0, item: false });
        carrera.eventos.length = 0;
      }
    },
    saltarCuenta: () => {
      if (carrera && carrera.fase === 'cuenta') carrera.t = 0;
    },
    mando: (v) => {
      mandoTeclado = v === 0 ? null : v;
    },
  };
  (window as unknown as { __kart?: () => GanchoKart }).__kart = () => gancho;

  // ---------------------------------------------------------------- starting a race
  const empezarCarrera = () => {
    if (!pista) return;
    carrera = new Carrera(pista, {});
    if (rapido) carrera.t = -1.1;
    cam.ang = carrera.humano.ang;
    atras = ATRAS_CAM;
    fase = 'carrera';
    tFase = 0;
    metaT = -1;
    zonaAnt = -1;
    tBanner = 0;
    tVueltaFinal = 0;
    tMeta = 0;
    nombreItem = null;
    tNombre = 99;
    podio = null;
    chispas.length = 0;
    tAyuda = 0;
    ayuda.textContent = texto('kart.objetivo');
    ayuda.classList.remove('apartada');
    entrada.mostrar(true);
    entrada.mandos.itemPulsado = false;
    sonido.musica();
  };

  const irAlPodio = () => {
    const c = carrera!;
    const top = c.clasificacion();
    podio = { top, ganado: c.humano.puesto === 1, puesto: c.humano.puesto };
    fase = 'podio';
    tFase = 0;
    reiniciarConfeti();
    entrada.mostrar(false);
    ayuda.classList.add('apartada');
    sonido.parar(0.5);
    if (podio.ganado) sonido.fanfarria();
    else sonido.derrota();
  };

  // ---------------------------------------------------------------- one step
  const atender = (e: Evento, c: Carrera) => {
    const k = c.karts[e.k];
    switch (e.t) {
      case 'semaforo':
        sonido.semaforo(e.n ?? 1);
        break;
      case 'ya':
        sonido.semaforo(3);
        break;
      case 'caja':
        if (k.humano) sonido.caja();
        break;
      case 'turbo':
        if (k.humano) sonido.turbo();
        break;
      case 'golpe':
        if (k.humano || cerca(k)) sonido.golpe();
        if (k.humano) chispas.length = 0;
        break;
      case 'choque':
        sonido.choque();
        break;
      case 'agua':
        if (k.humano || cerca(k)) sonido.agua();
        if (k.humano) {
          txtBanner = texto('kart.agua');
          tBanner = 1.6;
        }
        break;
      case 'flotador':
        if (k.humano) {
          sonido.flotador();
          txtBanner = texto('kart.flotador');
          tBanner = 1.8;
        }
        break;
      case 'lanzar':
        if (k.humano || cerca(k)) sonido.lanzar();
        break;
      case 'boa':
        if (k.humano) sonido.boa();
        break;
      case 'luz':
        sonido.luz();
        break;
      case 'vuelta':
        sonido.vuelta();
        break;
      case 'vueltaFinal':
        sonido.vueltaFinal();
        tVueltaFinal = 2.6;
        break;
      case 'meta':
        if (k.humano) {
          tMeta = 2.4;
          metaT = 0;
          if ((e.n ?? 9) === 1) sonido.fanfarria();
        }
        break;
      case 'derrape':
      case 'atasco':
        break;
    }
  };
  const cerca = (k: Kart) => !!carrera && Math.hypot(k.x - carrera.humano.x, k.y - carrera.humano.y) < 140;

  const actualizar = (dt: number) => {
    reloj += dt;
    tFase += dt;
    if (fase === 'cargando') return;
    if (fase === 'podio') {
      if (tFase > (rapido ? 1.4 : DURA_PODIO)) {
        if (podio?.ganado) {
          motivo = 'hecho';
          corte.abort();
        } else {
          derrotas++;
          if (derrotas >= PARA_SALTAR) saltar.hidden = false;
          empezarCarrera();
        }
      }
      return;
    }
    const c = carrera!;
    const m = entrada.mandos;
    const giro = mandoTeclado ?? (m.der ? 1 : 0) - (m.izq ? 1 : 0);
    const item = m.itemPulsado;
    m.itemPulsado = false;
    c.actualizar(dt, { giro, item });
    for (const e of c.eventos) atender(e, c);
    c.eventos.length = 0;
    const hk = c.humano;
    // the camera turns behind the kart, a little late (more so when drifting: you see it sideways)
    if (hk.estado !== 'agua') cam.ang += envolver(hk.ang - cam.ang) * Math.min(1, (hk.derrape ? 3 : 7) * dt);
    if (m7) {
      // the camera never sinks into a wall: it comes closer to the kart (fast) and drifts back out (slowly)
      const dx = Math.cos(cam.ang);
      const dy = Math.sin(cam.ang);
      let tope = ATRAS_CAM;
      for (let d = 5; d <= ATRAS_CAM + 4; d += 3) {
        const k = m7.paredEn(hk.x - dx * d, hk.y - dy * d);
        if (k && m7.altoDe(k) >= 26) {
          tope = Math.max(12, d - 7);
          break;
        }
      }
      atras = tope < atras ? tope : Math.min(tope, atras + 70 * dt);
      const meta = AMBIENTES[m7.techoEn(hk.x - dx * atras, hk.y - dy * atras)];
      const f = 1 - Math.exp(-5 * dt);
      ambiente.r += (meta.r - ambiente.r) * f;
      ambiente.g += (meta.g - ambiente.g) * f;
      ambiente.b += (meta.b - ambiente.b) * f;
      ambiente.desde += (meta.desde - ambiente.desde) * f;
      ambiente.hasta += (meta.hasta - ambiente.hasta) * f;
    }
    if (c.fase !== 'cuenta') {
      sonido.motor(dt, hk.estado === 'agua' || hk.estado === 'rescate' ? 0.05 : Math.abs(hk.vel) / VMAX, hk.turbo > 0 || hk.boa > 0);
      if (hk.derrape) sonido.derrape(dt, hk.nivel);
    }
    // the instructions: the goal first, then the controls, then they fade
    tAyuda += dt;
    if (c.fase !== 'cuenta' && ayuda.textContent !== texto('kart.controles') && tAyuda > 0) {
      ayuda.textContent = texto('kart.controles');
      tAyuda = 0;
    }
    if (c.fase !== 'cuenta' && tAyuda > 4.5) ayuda.classList.add('apartada');
    // the zone's name when the kart enters it
    if (pista && c.fase !== 'cuenta') {
      const z = pista.zonaEn(hk.sRel + pista.meta.s);
      if (z !== zonaAnt) {
        txtBanner = texto(CLAVE_ZONA[z]);
        tBanner = 2.4;
        zonaAnt = z;
      }
    }
    if (tBanner > 0) tBanner -= dt;
    if (tVueltaFinal > 0) tVueltaFinal -= dt;
    if (tMeta > 0) tMeta -= dt;
    if (tNombre < 99) tNombre += dt;
    if (hk.item && nombreItem !== hk.item) {
      nombreItem = hk.item;
      tNombre = 0;
    }
    // sparks off the rear wheels while drifting
    if (hk.derrape && hk.estado === 'normal') {
      const col = hk.nivel === 2 ? ['#ff4fd8', '#6fe0ff', '#ffffff'] : hk.nivel === 1 ? ['#ff8a1f', '#ffd23a'] : ['#ffe9a0', '#ffffff'];
      for (let i = 0; i < 2; i++) chispas.push({ x: 0, y: 0, vx: (Math.random() * 50 + 20) * (Math.random() < 0.5 ? -1 : 1) + (hk.derrape ? -hk.derrape * 25 : 0), vy: -Math.random() * 90 - 20, t: 0.35, col: col[Math.floor(Math.random() * col.length)] });
    }
    if (metaT >= 0) {
      metaT += dt;
      if (metaT > (rapido ? 0.6 : DURA_META)) irAlPodio();
    }
  };

  // ---------------------------------------------------------------- drawing
  const lavados = new Map<HTMLCanvasElement, HTMLCanvasElement>();
  const flotador = (() => {
    const c = lienzoPx(40, 20);
    const x = ctx2d(c);
    for (let j = -9; j <= 9; j++) {
      for (let i = -19; i <= 19; i++) {
        const dx = i / 19.5;
        const r = Math.hypot(dx, j / 9.5);
        if (r > 1 || r < 0.55) continue;
        x.fillStyle = Math.floor((Math.atan2(j / 9.5, dx) + Math.PI) / (Math.PI / 4)) % 2 ? '#fafafa' : '#e0383c';
        x.fillRect(i + 19, j + 9, 1, 1);
      }
    }
    return c;
  })();

  const sprites = PILOTOS.map((p) => spritesKart(p));
  const panoramaImg = panorama();

  /** A sprite at forward distance `dz`, with the parts hidden by walls nearer than it left out. */
  const recorte = new Int16Array(W);
  const dibujarOcl = (img: HTMLCanvasElement, dx: number, dy: number, dw: number, dh: number, dz: number) => {
    if (dw <= 0 || dh <= 0) return;
    const x0 = Math.max(0, dx);
    const x1 = Math.min(W, dx + dw);
    if (x1 <= x0 || dy + dh <= 0 || dy >= H) return;
    const m = m7!;
    const pie = dy + dh;
    let oculto = false;
    for (let x = x0; x < x1; x++) {
      const r = m.recorte(x, dz);
      recorte[x] = r;
      if (r < pie) oculto = true;
    }
    if (!oculto) {
      g.drawImage(img, dx, dy, dw, dh);
      return;
    }
    const kx = img.width / dw;
    const ky = img.height / dh;
    let x = x0;
    while (x < x1) {
      if (recorte[x] >= pie) {
        // a run of columns that nothing hides
        let e = x + 1;
        while (e < x1 && recorte[e] >= pie) e++;
        g.drawImage(img, (x - dx) * kx, 0, (e - x) * kx, img.height, x, dy, e - x, dh);
        x = e;
      } else {
        // behind a wall: only what shows over its top
        const vis = recorte[x] - dy;
        if (vis > 0) g.drawImage(img, (x - dx) * kx, 0, kx, vis * ky, x, dy, 1, vis);
        x++;
      }
    }
  };

  /** True when nearer karts cover a good part of this one (or of its name): then the name is left out. */
  const tapado = (k: Kart, p: Elemento, x0: number, y0: number, w: number, hh: number) => {
    const nw = anchoTexto(texto(k.piloto.nombre)) + 2;
    const lx0 = p.sx - nw / 2;
    for (const o of orden) {
      if (o.tipo !== 4 || o.dz >= p.dz || o.ref === k) continue;
      const e = UNIDAD_PX * o.k;
      const sp = sprites[(o.ref as Kart).i][0];
      const ox0 = o.sx - ANCLA_KART.x * e;
      const oy0 = o.sy - ANCLA_KART.y * e;
      const ow = sp.width * e;
      const oh = sp.height * e;
      const ix = Math.min(x0 + w, ox0 + ow) - Math.max(x0, ox0);
      const iy = Math.min(y0 + hh, oy0 + oh) - Math.max(y0, oy0);
      if (ix > 0 && iy > 0 && ix * iy > 0.35 * w * hh) return true;
      // its name against the name of a nearer rival
      const nx = Math.min(lx0 + nw, o.sx + nw / 2) - Math.max(lx0, o.sx - nw / 2);
      if (!(o.ref as Kart).humano && nx > nw * 0.4 && Math.abs(oy0 - y0) < 9) return true;
    }
    return false;
  };

  const dibujarKart = (k: Kart, p: Elemento) => {
    const m = m7!;
    const los = Math.atan2(k.y - m.cy, k.x - m.cx);
    let rel = k.ang - los + k.girar;
    if (k.humano) rel += k.giro * 0.28 + k.derrape * 0.4;
    const idx = mod(Math.round((rel / (Math.PI * 2)) * ANGULOS), ANGULOS);
    let spr = sprites[k.i][idx];
    const e = UNIDAD_PX * p.k;
    let ox = ANCLA_KART.x;
    let oy = ANCLA_KART.y;
    let alpha = 1;
    let esc = e;
    if (k.estado === 'agua') {
      if (k.tEstado >= 1.0) return;
      // sinking
      esc = e * (1 - k.tEstado * 0.9);
      alpha = 1 - k.tEstado;
    }
    if (k.invuln > 0 && k.estado === 'normal' && Math.floor(reloj * 14) % 2 === 0) alpha = 0.35;
    if (k.boa > 0) {
      const flash = Math.floor(reloj * 10) % 3 === 0;
      if (flash) {
        let l = lavados.get(spr);
        if (!l) {
          l = lavado(spr, '#ffffff', 0.55);
          lavados.set(spr, l);
        }
        spr = l;
      }
      spr = conBoa(spr);
      ox += 4;
      oy += 4;
    }
    const w = spr.width * esc;
    const hh = spr.height * esc;
    const subida = k.alto * p.k;
    const x0 = Math.round(p.sx - ox * esc);
    let y0 = Math.round(p.sy - oy * esc - subida);
    if (k.estado === 'agua') y0 += Math.round((k.tEstado * 10 * esc) / 1.2);
    if (alpha < 1) g.globalAlpha = alpha;
    dibujarOcl(spr, x0, y0, Math.round(w), Math.round(hh), p.dz);
    g.globalAlpha = 1;
    // the rival's name over its kart (a cached bitmap; hidden when it is too far to matter or sinking)
    if (!k.humano && k.estado !== 'agua' && w >= 9 && p.dz > 24 && !tapado(k, p, x0, y0, w, hh)) {
      const nom = rotulo(texto(k.piloto.nombre));
      g.drawImage(nom, Math.round(p.sx - nom.width / 2), y0 - nom.height + 2);
    }
    // the lifebelt carrying it
    if (k.estado === 'rescate') {
      const fw = 40 * UNIDAD_PX * p.k * 1.15;
      g.drawImage(flotador, Math.round(p.sx - fw / 2), Math.round(p.sy - subida - 8 * esc), Math.round(fw), Math.round(fw / 2));
    }
    // a splash when it falls in
    if (k.estado === 'agua' && k.tEstado < 0.9) {
      const t = k.tEstado;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const r = (10 + t * 38) * esc;
        const arriba = Math.sin(t * Math.PI * 1.1) * 26 * esc * (0.6 + (i % 3) * 0.25);
        g.fillStyle = i % 2 ? '#9be8ff' : '#e8fbff';
        g.fillRect(Math.round(p.sx + Math.cos(a) * r), Math.round(p.sy - 3 * esc + Math.sin(a) * r * 0.35 - arriba), 2, 2);
      }
    }
    // stars above a kart that has been hit
    if (k.estado === 'giro') {
      for (let i = 0; i < 3; i++) {
        const a = reloj * 7 + i * 2.1;
        g.fillStyle = '#ffe36e';
        g.fillRect(Math.round(p.sx + Math.cos(a) * 11 * esc), Math.round(p.sy - 32 * esc + Math.sin(a) * 3 * esc), 3, 3);
      }
    }
    // the boa glitters
    if (k.boa > 0) {
      const b = spriteBrillo();
      for (let i = 0; i < 3; i++) {
        const a = reloj * 6 + i * 2.2;
        if (Math.sin(a * 2) > 0) g.drawImage(b, Math.round(p.sx + Math.cos(a) * 15 * esc - 3), Math.round(p.sy - 22 * esc + Math.sin(a * 1.3) * 12 * esc));
      }
    }
    // flames from the pipes when it is going fast with a turbo, seen from behind
    if (k.turbo > 0 && (idx <= 2 || idx >= ANGULOS - 2) && k.estado === 'normal') {
      const f = Math.floor(reloj * 24) % 2;
      g.fillStyle = f ? '#ffd23a' : '#ff8a1f';
      for (const sx of [-3.6, 3.6]) g.fillRect(Math.round(p.sx + sx * esc - 1), Math.round(p.sy - 6 * esc - subida + 1), Math.max(2, Math.round(2.2 * esc)), Math.round((5 + f * 3) * esc));
      g.fillStyle = '#ffffff';
      for (const sx of [-3.6, 3.6]) g.fillRect(Math.round(p.sx + sx * esc), Math.round(p.sy - 6 * esc - subida + 1), 1, Math.round(3 * esc));
    }
    if (k.humano) humanoEnPantalla(p, esc);
  };

  /** Where the human's kart is on screen (the sparks start there). */
  let humX = W / 2;
  let humY = 120;
  let humE = 1;
  const humanoEnPantalla = (p: Elemento, esc: number) => {
    humX = p.sx;
    humY = p.sy;
    humE = esc;
  };

  const dibujarCarrera = () => {
    const c = carrera!;
    const m = m7!;
    const hk = c.humano;
    // sky, floor, ceiling and walls in one go
    const cx = hk.x - Math.cos(cam.ang) * atras;
    const cy = hk.y - Math.sin(cam.ang) * atras;
    m.escena(cx, cy, cam.ang, reloj, ambiente);
    // things standing up, far to near
    usados = 0;
    for (const d of pista!.decorado) {
      const p = m.proyectar(d.x, d.y);
      if (!p || p.dz > (d.tipo === 'arco' ? 330 : 560) || (d.tipo === 'arco' && p.dz < 45) || p.k * UNIDAD_PX * d.escala < 0.1) continue;
      if (d.tipo !== 'arco' && (p.sx < -90 || p.sx > W + 90)) continue;
      elemento(p.dz, p.sx, p.sy - (d.alto ?? 0) * p.k, p.k, 0, d);
    }
    for (let i = 0; i < c.cajas.length; i++) {
      const cj = c.cajas[i];
      if (cj.vuelve > 0) continue;
      const p = m.proyectar(cj.x, cj.y);
      if (p && p.dz < 420 && p.sx > -20 && p.sx < W + 20) elemento(p.dz, p.sx, p.sy, p.k, 1, i);
    }
    for (const tr of c.trampas) {
      const p = m.proyectar(tr.x, tr.y);
      if (p && p.dz < 420) elemento(p.dz, p.sx, p.sy, p.k, 2, tr);
    }
    for (const pr of c.proyectiles) {
      const p = m.proyectar(pr.x, pr.y);
      if (p && p.dz < 420) elemento(p.dz, p.sx, p.sy, p.k, 3, pr);
    }
    for (const k of c.karts) {
      if (k.estado === 'agua' && k.tEstado >= 1.0 && !k.humano) continue;
      const p = m.proyectar(k.x, k.y);
      if (p) elemento(p.dz, p.sx, p.sy, p.k, 4, k);
    }
    const lista = orden;
    lista.length = usados;
    for (let i = 0; i < usados; i++) lista[i] = pool[i];
    lista.sort((a, b) => b.dz - a.dz);
    for (const e of lista) {
      switch (e.tipo) {
        case 0: {
          const d = e.ref as import('./pista').Decorado;
          const s = spriteDecorado(d.tipo, d.v);
          const esc = UNIDAD_PX * d.escala * e.k;
          dibujarOcl(s.img, Math.round(e.sx - s.ax * esc), Math.round(e.sy - s.ay * esc), Math.round(s.img.width * esc), Math.round(s.img.height * esc), e.dz);
          break;
        }
        case 1: {
          const s = spriteCaja();
          const esc = 0.62 * e.k;
          const giro = Math.max(0.3, Math.abs(Math.cos(reloj * 2.4 + (e.ref as number) * 0.7)));
          const w = s.width * esc * giro;
          const flota = (5 + Math.sin(reloj * 3 + (e.ref as number)) * 1.5) * e.k;
          g.fillStyle = 'rgba(30,14,40,0.35)';
          g.fillRect(Math.round(e.sx - 4 * e.k), Math.round(e.sy - e.k * 0.5), Math.round(8 * e.k), Math.max(1, Math.round(e.k * 1.6)));
          dibujarOcl(s, Math.round(e.sx - w / 2), Math.round(e.sy - (s.height - 1) * esc - flota), Math.round(w), Math.round(s.height * esc), e.dz);
          break;
        }
        case 2: {
          const s = spriteCharco();
          const esc = 0.42 * e.k;
          g.drawImage(s, Math.round(e.sx - 20 * esc), Math.round(e.sy - 11 * esc * 0.6), Math.round(40 * esc), Math.max(1, Math.round(22 * esc * 0.6)));
          break;
        }
        case 3: {
          const pr = e.ref as Proyectil;
          const s = icono(pr.tipo);
          const esc = 0.7 * e.k;
          g.fillStyle = 'rgba(30,14,40,0.35)';
          g.fillRect(Math.round(e.sx - 4 * e.k), Math.round(e.sy), Math.round(8 * e.k), Math.max(1, Math.round(e.k * 1.6)));
          const bote = Math.abs(Math.sin(reloj * 9)) * 2 * e.k;
          dibujarOcl(s, Math.round(e.sx - 8 * esc), Math.round(e.sy - 15 * esc - 2 * e.k - bote), Math.round(16 * esc), Math.round(16 * esc), e.dz);
          break;
        }
        default:
          dibujarKart(e.ref as Kart, e);
      }
    }
    // sparks, in screen space round the human's kart
    for (let i = chispas.length - 1; i >= 0; i--) {
      const s = chispas[i];
      if (s.x === 0 && s.y === 0) {
        const lado = s.vx < 0 ? -1 : 1;
        s.x = humX + lado * 9 * humE;
        s.y = humY - 3 * humE;
      }
      s.t -= 1 / 60;
      if (s.t <= 0) {
        chispas.splice(i, 1);
        continue;
      }
      s.vy += 4;
      s.x += s.vx / 60;
      s.y += s.vy / 60;
      g.fillStyle = s.col;
      g.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
    }
    // speed lines when it goes with a turbo or a boa
    if (hk.turbo > 0 || hk.boa > 0) {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      const f = Math.floor(reloj * 30);
      for (let i = 0; i < 16; i++) {
        const hx = ((i * 97 + f * 41) % 100) / 100;
        const lado = i % 2 ? 1 : -1;
        const x = W / 2 + lado * (50 + hx * 80);
        const y = HOR + 8 + ((i * 53 + f * 29) % 76);
        g.fillRect(Math.round(x), Math.round(y), 1, 4 + (i % 4) * 2);
      }
    }
    // «¡Se va la luz!»
    if (c.apagon > 0) {
      g.fillStyle = `rgba(6,4,28,${Math.min(0.62, c.apagon * 1.2) * (0.8 + Math.sin(reloj * 40) * 0.2)})`;
      g.fillRect(0, 0, W, H);
    }
    // HUD
    const ruleta = hk.ruleta > 0 ? ruletaItem(reloj) : null;
    dibujarHud(g, { puesto: hk.puesto, vuelta: c.vueltaDe(hk), vueltas: VUELTAS, item: hk.item, ruleta, nombreItem: hk.item ? nombreItem : null, tNombre, t: reloj });
    dibujarMinimapa(g, pista!.mapa, c.karts, TAM, reloj);
    if (c.fase === 'cuenta' || c.t < 0.7) dibujarSemaforo(g, Math.floor(c.t + CUENTA), c.t >= 0);
    if (tBanner > 0 && tVueltaFinal <= 0 && tMeta <= 0 && c.fase !== 'cuenta') banda(g, txtBanner, 22, '#f2c14e', 1, Math.min(1, tBanner * 2));
    if (tVueltaFinal > 0 && tMeta <= 0) banda(g, texto('kart.vueltaFinal'), 24, '#ffffff', 2, Math.min(1, tVueltaFinal * 2));
    if (tMeta > 0) banda(g, texto('kart.meta'), 26, '#f2c14e', 3, 1);
  };

  const dibujarCarga = () => {
    g.fillStyle = '#1a0f2c';
    g.fillRect(0, 0, W, H);
    const s = spriteCaja();
    const giro = Math.max(0.3, Math.abs(Math.cos(reloj * 3)));
    g.drawImage(s, Math.round(W / 2 - 9 * giro * 2), 50, Math.round(36 * giro), 40);
    g.fillStyle = '#3a2858';
    g.fillRect(W / 2 - 40, 100, 80, 6);
    g.fillStyle = '#f2c14e';
    g.fillRect(W / 2 - 39, 101, Math.round(78 * progresoCarga), 4);
  };

  const dibujar = () => {
    if (fase === 'cargando') dibujarCarga();
    else if (fase === 'carrera') dibujarCarrera();
    else if (podio) {
      dibujarPodio(g, podio.top.slice(0, 3), tFase, 1 / 60, podio.ganado);
      banda(g, podio.ganado ? texto('kart.ganado') : texto('kart.perdido', { n: podio.puesto }), 8, '#f2c14e', 2);
      const sub = rotulo(podio.ganado ? texto('kart.ganado.sub') : texto('kart.perdido.sub'), '#ffffff', 1);
      g.drawImage(sub, Math.round(W / 2 - sub.width / 2), 36);
    }
  };

  // ---------------------------------------------------------------- the loop
  const bucle = () =>
    new Promise<void>((fin) => {
      let ultimo = performance.now();
      const paso = (ahora: number) => {
        if (corte.signal.aborted) return fin();
        if (esVertical()) {
          ultimo = ahora;
          requestAnimationFrame(paso);
          return;
        }
        if (ahora - ultimo < 1000 / 60 - 4) {
          requestAnimationFrame(paso);
          return;
        }
        const dt = Math.min(0.05, (ahora - ultimo) / 1000);
        ultimo = ahora;
        actualizar(dt);
        dibujar();
        fotogramas++;
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });

  // ---------------------------------------------------------------- the whole thing
  const fin = (r: Resultado) => {
    window.removeEventListener('resize', ajustar);
    if ((window as unknown as { __kart?: () => GanchoKart }).__kart?.() === gancho) delete (window as unknown as { __kart?: unknown }).__kart;
    sonido.parar(0.3);
    entrada.destruir();
    capa.remove();
    return r;
  };

  return (async () => {
    const dibujando = bucle();
    pista = await construirPista((f) => (progresoCarga = f));
    if (corte.signal.aborted) {
      await dibujando;
      return fin(motivo);
    }
    m7 = new Modo7(g, pista, panoramaImg);
    empezarCarrera();
    await dibujando;
    return fin(motivo);
  })();
}
