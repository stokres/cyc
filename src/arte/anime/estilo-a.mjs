// Estilo A · Shōnen dramático.
// Ojos enormes con varios reflejos, cel-shading con sombras duras, mechones afilados,
// líneas de velocidad/tensión, gota de sudor, rubor con rayitas.
import { ctx, ellipse, smooth, P, S, G, poly, line, mechon, mechonEje, ceja, estrella, gota, goTrazos, rng, f, hoja, W, H } from './comun.mjs';
import { CARAS, COL } from './rasgos.mjs';

// ------------------------------------------------------------------ ojos

/** Ojo grande de anime. s=+1 ojo cercano (comisura interior a la derecha), s=-1 ojo lejano. */
function ojoA(c, { cx, cy, w, h, s, K, mirada = 0.1, parpado = 0, pestanas = 2, lagrima = false, sombra = false, brillo = 1, iris = null }) {
  const ox = cx - s * w / 2;
  const ix = cx + s * w / 2;
  const top = cy - h * 0.5 + parpado * h * 0.35;
  const tA = [cx - s * w * 0.3, top + h * 0.06];
  const tB = [cx + s * w * 0.08, top - h * 0.01];
  const forma = smooth([[ox, cy + h * 0.1, 'c'], tA, tB, [ix, cy + h * 0.08, 'c'], [cx + s * w * 0.25, cy + h * 0.5], [cx - s * w * 0.18, cy + h * 0.52]]);
  const arriba = smooth([[ox, cy + h * 0.1], tA, tB, [ix, cy + h * 0.08]], false);
  const ic = iris ?? K.iris;
  const icx = cx + mirada * w;
  const icy = cy + h * 0.04;
  const rx = w * 0.31;
  const ry = h * 0.5;
  const gIris = c.grad('linear', [[0, ic[0]], [0.5, ic[1]], [1, ic[2]]], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const k = c.clip(forma);
  const blanco = sombra ? '#3a2432' : '#fffaf2';
  const dentro = [
    P(forma, blanco),
    // Sombra del párpado sobre el ojo (dura).
    P(`M${f(ox - 12)} ${f(top - 20)}L${f(ix + 12)} ${f(top - 20)}L${f(ix + 12)} ${f(cy - h * 0.1)}Q${f(cx)} ${f(cy - h * 0.2)} ${f(ox - 12)} ${f(cy - h * 0.02)}Z`, sombra ? 'rgba(10,0,10,.35)' : 'rgba(130,70,90,.30)'),
    P(ellipse(icx, icy, rx, ry), gIris),
    S(ellipse(icx, icy, rx, ry), ic[0], 1.8),
    P(ellipse(icx, icy - ry * 0.05, rx * 0.42, ry * 0.5), ic[0]),
    // Resplandor inferior del iris.
    P(ellipse(icx, icy + ry * 0.52, rx * 0.72, ry * 0.3), ic[2], { opacity: 0.75 }),
    // Reflejos: grande arriba-izquierda, pequeño abajo-derecha, chispas.
    P(ellipse(icx - rx * 0.36, icy - ry * 0.34, rx * 0.34, ry * 0.26), '#fff'),
    P(ellipse(icx + rx * 0.42, icy + ry * 0.38, rx * 0.15, ry * 0.12), '#fff', { opacity: 0.92 }),
    brillo > 1 ? P(estrella(icx + rx * 0.32, icy - ry * 0.18, rx * 0.34, 0.2), '#fff') : '',
    brillo > 1 ? P(ellipse(icx - rx * 0.62, icy + ry * 0.2, rx * 0.1, rx * 0.1), '#fff', { opacity: 0.9 }) : '',
    lagrima ? P(`M${f(ox - 10)} ${f(cy + h * 0.28)}Q${f(cx)} ${f(cy + h * 0.22)} ${f(ix + 10)} ${f(cy + h * 0.28)}L${f(ix + 10)} ${f(cy + h)}L${f(ox - 10)} ${f(cy + h)}Z`, 'rgba(170,225,255,.55)') : '',
    lagrima ? S(smooth([[ox + s * w * 0.08, cy + h * 0.34], [cx, cy + h * 0.32], [ix - s * w * 0.1, cy + h * 0.3]], false), '#fff', 2.2, { opacity: 0.9 }) : '',
  ].join('');
  const pest = [];
  for (let i = 0; i < pestanas; i++) {
    const bx = ox + s * w * (0.02 + 0.09 * i);
    const by = cy + h * (0.1 - 0.1 * i);
    pest.push(S(`M${f(bx)} ${f(by)}Q${f(bx - s * w * 0.1)} ${f(by - h * 0.08)} ${f(bx - s * w * 0.15)} ${f(by - h * 0.2 - 3 * i)}`, '#12080a', 3.2));
  }
  return [
    G(dentro, { 'clip-path': k }),
    // Línea de pestañas superior, gruesa en el centro, con rabillo.
    S(arriba, '#12080a', 5.5),
    S(smooth([[ox + s * w * 0.12, tA[1] + h * 0.04], tA, tB], false), '#12080a', 9),
    S(`M${f(ox)} ${f(cy + h * 0.1)}Q${f(ox - s * w * 0.09)} ${f(cy - h * 0.02)} ${f(ox - s * w * 0.2)} ${f(cy - h * 0.1)}`, '#12080a', 4.2),
    ...pest,
    // Pliegue del párpado y línea inferior.
    S(smooth([[ox + s * w * 0.04, top - h * 0.17], [cx - s * w * 0.1, top - h * 0.24], [ix - s * w * 0.1, top - h * 0.12]], false), K.linea, 2, { opacity: 0.75 }),
    S(smooth([[cx - s * w * 0.28, cy + h * 0.5], [cx + s * w * 0.1, cy + h * 0.53], [cx + s * w * 0.3, cy + h * 0.46]], false), K.linea, 1.8, { opacity: 0.8 }),
  ].join('');
}

/** Ojo cerrado en arco «^» o «u». */
function ojoArco(cx, cy, w, s, color, feliz = true) {
  const d = feliz
    ? smooth([[cx - w / 2, cy + 6], [cx - w * 0.2, cy - 10], [cx + w * 0.2, cy - 10], [cx + w / 2, cy + 6]], false)
    : smooth([[cx - w / 2, cy - 4], [cx, cy + 8], [cx + w / 2, cy - 4]], false);
  return S(d, color, 7) + S(`M${f(cx - s * w / 2)} ${f(cy + 5)}l${f(-s * 8)} ${f(-6)}`, color, 4);
}

// ------------------------------------------------------------------ cara

function nariz(K, k = 1, punta = [90, 42]) {
  const [tx, ty] = punta;
  const t = `translate(26 -6) scale(${k}) translate(-26 6)`;
  const frente_ = [[36, 22], [54, 34], [tx - 14, ty - 6], [tx, ty], [tx + 1, ty + 10], [tx - 6, ty + 16], [tx - 20, ty + 16], [tx - 32, ty + 12]];
  const forma = smooth([[26, -6, 'c'], ...frente_, [46, 46], [38, 36], [32, 26], [20, 8]]);
  return G([
    P(forma, K.skin),
    P(smooth([[26, -6], [36, 20], [44, 44], [54, 54], [40, 52], [28, 36], [18, 8]]), K.sombra),
    P(smooth([[56, 34], [tx - 14, ty - 5], [tx - 2, ty + 1], [tx - 14, ty + 4], [60, 40]]), K.luz),
    S(smooth(frente_, false), K.linea, 2.4),
    P(ellipse(tx - 16, ty + 13, 5, 3), K.hondo),
    P(ellipse(tx - 6, ty + 2, 2.6, 1.8), '#fff', { opacity: 0.85 }),
  ], { transform: t });
}

/** Rubor de anime con rayitas. */
function rubor(K, x, y, rx = 24, ry = 11, rot = 0) {
  const lineas = [-14, -3, 8].map((dx) => S(line(x + dx, y - ry - 6, x + dx + 9, y + ry * 0.2), K.rubor, 2.6));
  return G([P(ellipse(x, y, rx, ry, rot), K.rubor, { opacity: 0.5 }), P(ellipse(x - 2, y - 2, rx * 0.6, ry * 0.5, rot), K.rubor, { opacity: 0.35 }), ...lineas]);
}

/** Cuello y base de la cara con cel-shading. */
function pielBase(c, K, key, { sombraFrente = null, extra = [] } = {}) {
  const d = CARAS[key];
  const k = c.clip(d);
  const sombras = [
    // Lado cercano a la oreja: sombra dura.
    P(smooth([[-40, -140], [-58, -70], [-62, 0], [-56, 44], [-34, 86], [0, 124], [30, 140], [-120, 150], [-120, -140]]), K.sombra),
    // Bajo el flequillo.
    sombraFrente ?? '',
    // Bajo la barbilla / mandíbula.
    P(smooth([[-70, 100], [-20, 112], [40, 132], [96, 100], [96, 160], [-70, 160]]), K.sombra, { opacity: 0.0 }),
    ...extra,
  ].join('');
  return P(d, K.skin) + G(sombras, { 'clip-path': k });
}


/** Mechón de pelo con sombra, cuerpo y dos brillos. */
function mechA(K, L, col = null) {
  const [x, y, tx, ty, w, cu] = L;
  return [
    P(mechon(x, y, tx, ty, w, cu), K.peloSombra),
    P(mechon(x + w * 0.1, y, tx + 3, ty + 3, w * 0.68, cu), col ?? K.pelo),
    S(mechonEje(x, y, tx, ty, cu, 0.2, 0.78), K.peloLuz, Math.max(3, w * 0.13)),
    S(mechonEje(x, y, tx, ty, cu, 0.3, 0.62), K.peloBrillo, Math.max(1.6, w * 0.05)),
  ].join('');
}

/** Casquete de pelo sobre la cara: contorno exterior + línea del flequillo (puntas con 'c'). */
function gorra(c, K, exterior, linea, brillos = []) {
  const d = smooth([...exterior, ...linea]);
  const k = c.clip(d);
  return (
    P(d, K.pelo) +
    G([P(smooth([[-140, -170], [-30, -170], [-40, -120], [-66, -64], [-140, -20]]), K.peloSombra), ...brillos], { 'clip-path': k }) +
    S(d, K.peloSombra, 2.6)
  );
}


/** Frente con pelo: sombra dura bajo el flequillo, casquete y mechones que caen sobre la frente. */
function frente(c, K, exterior, linea, locks, brillos = [], canas = []) {
  const banda = smooth([[110, -130], ...linea.map(([x, y, t]) => [x, y + 15, t]), [-110, -130]]);
  const sombra = P(banda, K.sombra) + locks.map((L) => P(mechon(L[0] + 4, L[1] + 8, L[2] + 4, L[3] + 14, L[4], L[5]), K.sombra)).join('');
  return {
    sombra,
    cap: gorra(c, K, exterior, linea, brillos),
    locks: locks.map((L) => mechA(K, L)).join('') + canas.map((L) => mechA(K, L, K.cana)).join(''),
  };
}

/** Cuello estrecho con la sombra dura de la mandíbula. */
function cuelloA(c, K) {
  const d = smooth([[-52, 40], [-58, 210], [34, 220], [50, 130], [44, 96]]);
  return P(d, K.sombra) + G(P(smooth([[-80, 70], [-30, 120], [24, 140], [70, 110], [70, 60], [-80, 20]]), K.hondo, { opacity: 0.85 }), { 'clip-path': c.clip(d) });
}

/** Luces planas de la cara (frente, pómulo lejano). */
function luces(K) {
  return [P(smooth([[0, -100], [60, -92], [74, -66], [30, -62], [-10, -78]]), K.luz, { opacity: 0.8 }), P(smooth([[54, 12], [84, 6], [88, 40], [64, 44]]), K.luz, { opacity: 0.55 })].join('');
}

// ------------------------------------------------------------------ Pablo

function pabloA(c, { mood = 'ruega' } = {}) {
  const K = COL.pablo;
  const d = CARAS.pablo;
  const kcara = c.clip(d);
  const rnd = rng(11);

  // Pelo: masa de atrás.
  const pelo = [];
  pelo.push(P(smooth([[-104, 60], [-116, 0], [-110, -70], [-82, -122], [-30, -152], [30, -150], [74, -128], [98, -98], [102, -60], [88, -70], [60, -100], [0, -104], [-50, -92], [-84, -60], [-92, -10]]), K.peloSombra));
  const picos = [
    [-80, -90, -112, -160, 38, 0.25], [-48, -108, -70, -186, 42, 0.2], [-14, -118, -12, -204, 46, -0.12],
    [22, -120, 52, -198, 46, 0.2], [56, -108, 104, -178, 42, 0.22], [82, -88, 132, -132, 34, 0.25],
    [-96, -52, -128, -88, 30, 0.3],
  ];
  const mech = (L) => mechA(K, L);
  const picosSvg = picos.map((L) => mech(L)).join('');

  // Oreja con aro.
  const oreja = [
    P(smooth([[-76, -20], [-90, -26], [-104, -12], [-106, 12], [-98, 34], [-84, 40], [-74, 30], [-72, 0]]), K.skin),
    P(smooth([[-86, -10], [-96, -8], [-98, 14], [-90, 26], [-82, 18], [-82, 0]]), K.sombra),
    S(smooth([[-76, -20], [-90, -26], [-104, -12], [-106, 12], [-98, 34], [-84, 40]], false), K.linea, 2.2),
    S(ellipse(-92, 48, 8, 9), '#e8ecf4', 3.2),
    S(ellipse(-92, 48, 8, 9), '#8a93a8', 1, { opacity: 0.8 }),
    P(ellipse(-96, 44, 1.8, 1.8), '#fff'),
  ].join('');

  // Cuello + chaqueta con borreguillo.
  const cuelloSvg = cuelloA(c, K);
  const chaqueta = [
    P(smooth([[-76, 160], [-210, 200], [-290, 330], [280, 330], [210, 200], [80, 150], [-10, 210]], true, 0.6), K.chaqueta),
    P(smooth([[-10, 214], [40, 170], [84, 152], [120, 210], [60, 330], [10, 330]]), K.sudadera),
    P(smooth([[-10, 214], [24, 186], [40, 330], [10, 330]]), K.sombra, { opacity: 0.0 }),
    P(smooth([[84, 152], [120, 210], [150, 330], [200, 330], [210, 200]]), K.chaquetaLuz, { opacity: 0.55 }),
  ].join('');
  const borrego = [];
  const pts = [[-84, 156], [-64, 176], [-38, 192], [-10, 204], [20, 196], [50, 176], [74, 154], [96, 142]];
  pts.forEach(([x, y], i) => {
    const r = 21 + (i % 2) * 4;
    borrego.push(P(ellipse(x + 3, y + 5, r, r * 0.9), K.borregoSombra));
    borrego.push(P(ellipse(x, y, r, r * 0.9), K.borrego));
    borrego.push(P(ellipse(x - 6, y - 7, r * 0.35, r * 0.25), '#fff', { opacity: 0.8 }));
  });


  const fr = frente(c, K,
    [[-100, -30], [-108, -80], [-84, -128], [-30, -152], [30, -150], [76, -130], [98, -96], [100, -50]],
    [[92, -56, 'c'], [80, -84], [56, -104], [24, -112], [-8, -108], [-40, -100], [-70, -86], [-92, -54, 'c']],
    [[64, -98, 92, -44, 28, 0.25], [30, -110, 54, -62, 28, -0.2], [-4, -112, 6, -70, 24, 0.1], [-40, -102, -34, -60, 24, 0.15]],
    [S(smooth([[-70, -124], [-24, -138], [34, -134], [76, -112]], false), K.peloLuz, 10, { opacity: 0.85 }), S(smooth([[-50, -124], [-10, -134], [30, -130]], false), K.peloBrillo, 3.5, { opacity: 0.9 })]);
  // Cara.
  const base = pielBase(c, K, 'pablo', { sombraFrente: fr.sombra });

  // Barba corta.
  const exterior = [[-88, 18], [-80, 58], [-48, 90], [-18, 110], [12, 126], [42, 134], [64, 118], [80, 92], [90, 62], [92, 38]];
  const interior = [[80, 52], [62, 62], [40, 66], [16, 66], [2, 70], [-14, 78], [-38, 74], [-60, 56], [-78, 26]];
  const barbaD = smooth([...exterior, ...interior]);
  const kb = c.clip(barbaD);
  const barba = [
    P(barbaD, K.barba),
    G([
      P(smooth([[-100, 40], [-30, 70], [20, 110], [60, 150], [-100, 160]]), K.barbaSombra),
      S(smooth([[0, 124], [30, 132], [58, 122], [76, 98]], false), K.barbaLuz, 5, { opacity: 0.8 }),
      S(smooth([[-70, 40], [-40, 66], [-14, 70]], false), K.barbaLuz, 3, { opacity: 0.6 }),
    ], { 'clip-path': kb }),
    S(barbaD, K.barbaSombra, 2.2),
  ].join('');
  // Pelillos sueltos en la mejilla (barba corta: puntitos).
  const motas = [];
  for (let i = 0; i < 46; i++) {
    const x = -64 + rnd() * 140;
    const y = 30 + rnd() * 34;
    motas.push(P(ellipse(x, y, 1.1, 1.1), K.barba, { opacity: 0.45 }));
  }
  const bigote = P(smooth([[10, 74], [22, 62], [46, 57], [72, 58], [92, 66], [84, 78], [70, 72], [50, 72], [32, 78]]), K.barba) +
    S(smooth([[24, 64], [46, 60], [72, 61]], false), K.barbaLuz, 3, { opacity: 0.85 }) +
    S(smooth([[10, 74], [22, 62], [46, 57], [72, 58], [92, 66]], false), K.barbaSombra, 2);

  // Boca abierta (suplicando): dientes arriba, lengua abajo.
  const bocaD = smooth([[18, 82, 'c'], [32, 78], [52, 80], [74, 77], [86, 80, 'c'], [80, 94], [64, 104], [44, 106], [28, 98]]);
  const kboca = c.clip(bocaD);
  const boca = [
    P(bocaD, K.boca),
    G([
      P(poly([[16, 76], [88, 74], [86, 90], [74, 92], [62, 89], [50, 91], [38, 88], [26, 90], [18, 88]]), K.diente),
      S(line(38, 78, 38, 90), '#d8cdb6', 1.2),
      S(line(50, 79, 50, 91), '#d8cdb6', 1.2),
      S(line(62, 78, 62, 90), '#d8cdb6', 1.2),
      P(ellipse(54, 108, 22, 14), K.lengua),
      S(smooth([[40, 100], [54, 96], [68, 100]], false), '#a8403d', 2),
    ], { 'clip-path': kboca }),
    S(bocaD, K.barbaSombra, 2.6),
  ].join('');

  // Ojos y cejas (ruegan: cejas con el extremo interior arriba, ojos llorosos y brillantes).
  const ojos = [
    ojoA(c, { cx: -14, cy: 0, w: 64, h: 58, s: 1, K, mirada: 0.1, pestanas: 3, lagrima: true, brillo: 2 }),
    ojoA(c, { cx: 58, cy: -3, w: 44, h: 56, s: -1, K, mirada: 0.1, pestanas: 2, lagrima: true, brillo: 2 }),
  ].join('');
  const cejas = [
    P(ceja(16, -56, -50, -30, 12, 5, 6), K.ceja),
    P(ceja(36, -58, 86, -36, 11, 4, 5), K.ceja),
  ].join('');

  const mejillas = rubor(K, -10, 50, 26, 11) + rubor(K, 74, 42, 14, 8);
  const sudor = P(gota(86, -64, 1.15), '#bfe9ff') + S(gota(86, -64, 1.15), '#4a90b8', 2.2) + P(ellipse(82, -62, 2.4, 4.5, 0.4), '#fff', { opacity: 0.9 });
  const nariz_ = nariz(K, 0.95, [90, 42]);

  // Mechones de flequillo por delante.
  const flequillo = P(mechon(50, -100, 76, -30, 10, 0.55), K.peloSombra) + S(mechonEje(50, -100, 76, -30, 0.55, 0.2, 0.7), K.peloLuz, 2);

  return [
    pelo.join(''), oreja, cuelloSvg, chaqueta, borrego.join(''),
    base,
    luces(K),
    S(d, K.linea, 2.8),
    fr.cap, picosSvg, fr.locks,
    mejillas, barba, motas.join(''), bigote, nariz_, boca, ojos, cejas, flequillo, sudor,
  ].join('');
}

// ------------------------------------------------------------------ Vero

function veroA(c, { sombraOjos = true } = {}) {
  const K = COL.vero;
  const d = CARAS.vero;

  // Moño alto con goma.
  const mono = [
    P(ellipse(-42, -150, 56, 42, -0.2), K.peloSombra),
    P(ellipse(-38, -156, 48, 34, -0.2), K.pelo),
    S(smooth([[-70, -162], [-48, -180], [-14, -172]], false), K.peloLuz, 4),
    S(smooth([[-62, -150], [-40, -166], [-20, -158]], false), K.peloBrillo, 2),
    P(smooth([[-80, -126], [-40, -140], [-4, -128], [-6, -112], [-42, -124], [-78, -110]]), K.goma),
    P(smooth([[-80, -126], [-40, -140], [-4, -128], [-7, -122], [-42, -134], [-78, -118]]), '#d6607a', { opacity: 0.8 }),
    S(smooth([[-78, -110], [-42, -124], [-6, -112]], false), K.gomaSombra, 3),
  ].join('');
  const masaPelo = P(smooth([[-100, 40], [-112, -20], [-104, -84], [-76, -126], [-30, -144], [26, -138], [66, -118], [90, -96], [94, -66], [70, -92], [40, -98], [-2, -98], [-46, -88], [-76, -60], [-88, -10]]), K.peloSombra);

  const mech = (L) => mechA(K, L);
  const atras = [
    [76, -96, 12, -146, 40, -0.25], [46, -104, -18, -150, 40, -0.2], [10, -108, -56, -146, 40, -0.2], [-26, -104, -88, -126, 38, -0.2],
    [-56, -92, -112, -92, 34, -0.15], [84, -80, 30, -128, 30, -0.3],
  ].map(mech).join('');
  // Mechón suelto delante de la oreja.
  const suelto = [
    P(mechon(-62, -86, -70, 36, 9, -0.2), K.peloSombra),
    P(mechon(-62, -84, -69, 32, 5, -0.2), K.pelo),
    S(mechonEje(-58, -84, -66, 34, -0.18, 0.2, 0.7), K.peloLuz, 1.8),
  ].join('');
  // Otro que cae sobre la sien.
  const sien = P(mechon(70, -92, 82, -26, 12, 0.28), K.peloSombra) + S(mechonEje(70, -92, 82, -26, 0.28, 0.2, 0.7), K.peloLuz, 1.8);

  const oreja = [
    P(smooth([[-74, -14], [-88, -20], [-102, -6], [-104, 18], [-96, 38], [-82, 44], [-72, 34], [-70, 4]]), K.skin),
    P(smooth([[-84, -4], [-94, -2], [-96, 18], [-88, 30], [-80, 22], [-80, 4]]), K.sombra),
    S(smooth([[-74, -14], [-88, -20], [-102, -6], [-104, 18], [-96, 38], [-82, 44]], false), K.linea, 2.2),
    // Aro dorado.
    S(ellipse(-90, 62, 13, 15), K.oroSombra, 5.4),
    S(ellipse(-90, 62, 13, 15), K.oro, 3.6),
    S(smooth([[-98, 50], [-103, 60], [-100, 72]], false), K.oroLuz, 1.6),
  ].join('');

  const cuelloSvg = cuelloA(c, K);
  const camiseta = [
    P(smooth([[-52, 150], [-200, 190], [-290, 330], [270, 330], [200, 200], [64, 150], [26, 214], [-6, 224], [-30, 196]], true, 0.6), K.camiseta),
    P(smooth([[64, 150], [110, 200], [180, 330], [270, 330], [200, 200]]), K.camisetaLuz, { opacity: 0.55 }),
    S(smooth([[-30, 196], [-6, 224], [26, 214], [60, 160]], false), '#08080c', 3),
  ].join('');

  const sombraFrente = P(smooth([[-100, -110], [100, -110], [96, -52], [72, -70], [44, -84], [10, -88], [-30, -80], [-64, -66], [-100, -40]]), K.sombra);
  const base = pielBase(c, K, 'vero', { sombraFrente });
  const cap = gorra(c, K,
    [[-96, -30], [-104, -84], [-76, -126], [-30, -144], [26, -138], [66, -118], [90, -96], [96, -60]],
    [[88, -56, 'c'], [72, -86], [44, -100], [10, -104], [-30, -96], [-64, -82], [-90, -50, 'c']],
    [S(smooth([[-70, -116], [-20, -132], [36, -124], [74, -100]], false), K.peloLuz, 9, { opacity: 0.9 }), S(smooth([[-50, -118], [-10, -128], [30, -122]], false), K.peloBrillo, 3.2, { opacity: 0.9 })]);
  // Pómulo alto con luz.
  const pomulo = P(smooth([[40, 14], [74, 8], [84, 30], [56, 40]]), K.luz, { opacity: 0.7 });

  // Banda de sombra sobre los ojos (dura, con picos).
  const banda = sombraOjos
    ? G(P(poly([[-110, -22], [110, -22], [110, 30], [90, 36], [76, 28], [58, 40], [40, 30], [22, 42], [4, 32], [-14, 44], [-32, 32], [-52, 40], [-70, 30], [-90, 38], [-110, 28]]), 'rgba(48,14,36,.84)'), { 'clip-path': c.clip(d) })
    : '';

  const labiosD = [[18, 82, 'c'], [34, 74], [46, 78], [58, 72], [74, 76], [86, 74, 'c'], [76, 96], [50, 106], [28, 98]];
  const sup = smooth([[18, 82, 'c'], [34, 73], [46, 78], [58, 71], [74, 75], [86, 73, 'c'], [76, 82], [50, 83], [28, 85]]);
  const inf = smooth([[18, 82, 'c'], [28, 85], [50, 83], [76, 82], [86, 73, 'c'], [78, 96], [50, 108], [28, 98]]);
  void labiosD;
  const boca = [
    P(inf, K.labio),
    P(sup, K.labioSup),
    P(smooth([[26, 92], [48, 100], [70, 92], [48, 96]]), '#5a1428', { opacity: 0.55 }),
    // Brillo de los labios.
    P(smooth([[34, 90], [50, 94], [66, 90], [50, 91]]), K.labioLuz, { opacity: 0.9 }),
    P(ellipse(40, 77, 6, 1.8, -0.2), K.labioLuz, { opacity: 0.75 }),
    S(smooth([[18, 82], [34, 84], [50, 83], [76, 82], [90, 70]], false), K.boca, 2.4),
    S(smooth([[18, 82, 'c'], [34, 73], [46, 78], [58, 71], [74, 75], [86, 73, 'c']], false), K.boca, 1.6),
  ].join('');
  // Hoyuelo de la sonrisa torcida.
  const hoyuelo = '';

  const ojos = [
    ojoA(c, { cx: -14, cy: 0, w: 64, h: 54, s: 1, K, mirada: 0.16, parpado: 0.35, pestanas: 4, sombra: sombraOjos, brillo: 1, iris: ['#7a3a10', '#e8892c', '#ffd27a'] }),
    ojoA(c, { cx: 58, cy: -3, w: 44, h: 52, s: -1, K, mirada: 0.16, parpado: 0.35, pestanas: 3, sombra: sombraOjos, brillo: 1, iris: ['#7a3a10', '#e8892c', '#ffd27a'] }),
  ].join('');
  // Ceja levantada (la cercana) y ceja baja: desconfianza.
  const cejas = [
    P(ceja(-52, -34, 12, -58, 5, 11, 12), K.ceja),
    P(ceja(36, -38, 84, -30, 11, 5, 2), K.ceja),
  ].join('');

  // Vena de enfado en la sien.
  const venaSvg = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    .map(([a, b]) => {
      const x = 58;
      const y = -92;
      const d2 = `M${x + a * 5} ${y + b * 5}Q${x + a * 20} ${y + b * 4} ${x + a * 22} ${y + b * 22}Q${x + a * 5} ${y + b * 20} ${x + a * 5} ${y + b * 5}Z`;
      return S(d2, '#4a0a0e', 4.5) + P(d2, '#ff3b3b');
    })
    .join('');

  return [masaPelo, mono, oreja, cuelloSvg, camiseta, base, pomulo, S(d, K.linea, 2.8), cap, atras, banda, rubor(K, -8, 52, 24, 9), hoyuelo, nariz(K, 0.9, [88, 40]), boca, ojos, cejas, suelto, sien, venaSvg].join('');
}

// ------------------------------------------------------------------ Fran y Guille

function franA(c) {
  const K = COL.fran;
  const d = CARAS.fran;
  const rnd = rng(5);
  const mech = (L, col = null) => mechA(K, L, col);
  const masa = P(smooth([[-108, 60], [-120, 0], [-114, -70], [-84, -124], [-30, -152], [34, -150], [78, -128], [104, -96], [108, -56], [92, -70], [60, -100], [0, -104], [-50, -92], [-90, -60], [-98, -10]]), K.peloSombra);
  const picos = [[-84, -90, -122, -150, 40, 0.22], [-50, -108, -80, -176, 44, 0.2], [-14, -118, -26, -190, 46, 0.15], [22, -120, 30, -194, 46, -0.12], [56, -108, 90, -176, 44, 0.18], [86, -88, 130, -138, 38, 0.22], [-100, -50, -136, -80, 30, 0.3]];
  const canas = [[-60, -108, -86, -172, 14, 0.2], [30, -118, 34, -186, 12, -0.12]].map((L) => mech(L, K.cana)).join('');
  const oreja = P(smooth([[-82, -20], [-96, -26], [-110, -12], [-112, 12], [-104, 36], [-90, 42], [-80, 32], [-78, 0]]), K.skin) + S(smooth([[-82, -20], [-96, -26], [-110, -12], [-112, 12], [-104, 36], [-90, 42]], false), K.linea, 2.2);
  // Barba enorme y poblada que cae sobre el pecho.
  const barbaD = smooth([[-96, 10], [-100, 60], [-80, 110], [-54, 150], [-24, 186], [20, 214], [58, 190], [84, 150], [98, 110], [104, 60], [100, 40], [88, 48], [70, 58], [44, 62], [14, 60], [-14, 54], [-44, 44], [-72, 30]]);
  const kb = c.clip(barbaD);
  const mechasBarba = [];
  for (let i = 0; i < 16; i++) {
    const x = -70 + i * 11 + rnd() * 6;
    mechasBarba.push(S(`M${f(x)} ${f(70 + rnd() * 20)}Q${f(x + 6 + rnd() * 8)} ${f(130 + rnd() * 30)} ${f(x - 8 + rnd() * 16)} ${f(176 + rnd() * 26)}`, i % 3 === 0 ? K.barbaLuz : K.barbaSombra, 2.2 + rnd() * 1.6, { opacity: 0.85 }));
  }
  const barba = [
    P(barbaD, K.barba),
    G([P(smooth([[-120, 60], [-30, 90], [20, 150], [60, 230], [-120, 230]]), K.barbaSombra), ...mechasBarba, P(smooth([[30, 70], [60, 86], [70, 150], [48, 190], [36, 140]]), K.barbaCana, { opacity: 0.0 }), S(smooth([[40, 70], [64, 100], [72, 150]], false), K.barbaCana, 4, { opacity: 0.55 })], { 'clip-path': kb }),
    S(barbaD, K.barbaSombra, 2.4),
  ].join('');
  const bigote = P(smooth([[6, 74], [20, 58], [46, 52], [74, 54], [98, 62], [92, 78], [72, 70], [50, 70], [28, 80]]), K.barba) + S(smooth([[22, 62], [46, 56], [76, 58]], false), K.barbaLuz, 3.4, { opacity: 0.8 });
  // Boca de risa: grande.
  const bocaD = smooth([[20, 82, 'c'], [38, 76], [60, 78], [80, 76], [96, 82, 'c'], [88, 104], [68, 118], [44, 116], [28, 102]]);
  const kboca = c.clip(bocaD);
  const boca = [
    P(bocaD, K.boca),
    G([P(poly([[18, 74], [98, 72], [96, 90], [80, 94], [60, 91], [40, 93], [24, 90]]), K.diente), S(line(44, 76, 44, 92), '#d8cdb6', 1.2), S(line(60, 76, 60, 92), '#d8cdb6', 1.2), S(line(76, 76, 76, 92), '#d8cdb6', 1.2), P(ellipse(60, 120, 26, 18), K.lengua)], { 'clip-path': kboca }),
    S(bocaD, K.barbaSombra, 2.6),
  ].join('');
  const fr = frente(c, K,
    [[-104, -30], [-112, -80], [-88, -130], [-30, -154], [34, -152], [80, -130], [104, -96], [106, -50]],
    [[98, -58, 'c'], [88, -84], [64, -100], [30, -104], [-4, -100], [-40, -96], [-76, -88], [-96, -56, 'c']],
    [[78, -92, 92, -50, 26, 0.2], [40, -102, 58, -58, 30, -0.15], [0, -104, -4, -60, 28, 0.1], [-40, -98, -54, -54, 28, -0.15], [-72, -90, -88, -48, 24, 0.2]],
    [S(smooth([[-70, -124], [-24, -140], [34, -136], [80, -112]], false), K.peloLuz, 10, { opacity: 0.85 })],
    [[-18, -102, -10, -64, 11, 0.15]]);
  const base = pielBase(c, K, 'fran', { sombraFrente: fr.sombra });
  // Ojos felices cerrados (risa) y cejas gruesas levantadas.
  const ojos = [ojoArco(-14, 2, 50, 1, '#12080a'), ojoArco(60, -1, 38, -1, '#12080a')].join('');
  const cejas = P(ceja(14, -56, -56, -32, 15, 8, 8), K.ceja) + P(ceja(36, -58, 92, -36, 14, 6, 6), K.ceja);
  const camiseta = [
    P(smooth([[-76, 160], [-220, 200], [-300, 330], [290, 330], [220, 200], [86, 150], [-10, 230]], true, 0.6), K.camiseta),
    P(smooth([[86, 150], [130, 210], [190, 330], [290, 330], [220, 200]]), K.camisetaLuz, { opacity: 0.4 }),
    P(smooth([[-76, 160], [-220, 200], [-300, 330], [-190, 330], [-120, 220]]), K.camisetaSombra, { opacity: 0.6 }),
    S(smooth([[-70, 164], [-30, 192], [10, 200], [50, 186], [84, 154]], false), K.camisetaSombra, 5),
  ].join('');
  const mej = rubor(K, -12, 52, 26, 11) + rubor(K, 78, 44, 14, 8);
  return [masa, oreja, cuelloA(c, K), camiseta, base, luces(K), S(d, K.linea, 2.8), fr.cap, picos.map((L) => mech(L)).join(''), canas, fr.locks, mej, barba, bigote, nariz(K, 1.1, [92, 40]), boca, ojos, cejas].join('');
}

function guilleA(c) {
  const K = COL.guille;
  const d = CARAS.guille;
  const mech = (L) => mechA(K, L);
  // Pelo algo largo: cae sobre la oreja y la nuca.
  const masa = P(smooth([[-96, 120], [-124, 40], [-120, -60], [-90, -126], [-34, -156], [30, -156], [76, -134], [100, -100], [98, -56], [80, -78], [50, -104], [0, -108], [-50, -92], [-84, -60], [-98, 0], [-80, 100]]), K.peloSombra);
  const largos = [[-96, -60, -150, 30, 44, 0.3], [-90, -20, -136, 80, 40, 0.3], [-80, 30, -118, 120, 36, 0.25]].map(mech).join('');
  const picos = [[-84, -92, -142, -128, 40, -0.3], [-50, -110, -116, -168, 44, -0.25], [-14, -120, -64, -192, 46, -0.22], [24, -122, -8, -198, 46, -0.15], [58, -110, 46, -188, 44, 0.05], [84, -90, 98, -150, 36, 0.2]].map(mech).join('');
  const oreja = P(smooth([[-76, -14], [-90, -20], [-104, -6], [-106, 18], [-98, 38], [-84, 44], [-74, 34], [-72, 4]]), K.skin) + S(smooth([[-76, -14], [-90, -20], [-104, -6], [-106, 18], [-98, 38], [-84, 44]], false), K.linea, 2.2);
  const cuelloSvg = cuelloA(c, K);
  // Camisa hawaiana: cuello abierto con hibiscos.
  const flor = (x, y, r) =>
    [0, 1, 2, 3, 4].map((i) => P(ellipse(x + Math.cos((i / 5) * Math.PI * 2) * r * 0.55, y + Math.sin((i / 5) * Math.PI * 2) * r * 0.55, r * 0.55, r * 0.4, (i / 5) * Math.PI * 2), K.hibisco)).join('') + P(ellipse(x, y, r * 0.22, r * 0.22), '#ffe38a');
  const camisa = [
    P(smooth([[-76, 160], [-220, 200], [-300, 330], [290, 330], [220, 200], [86, 150], [30, 270], [-10, 276], [-30, 210]], true, 0.6), K.camisa),
    P(smooth([[86, 150], [130, 210], [190, 330], [290, 330], [220, 200]]), K.camisaLuz, { opacity: 0.5 }),
    P(smooth([[-76, 160], [-220, 200], [-300, 330], [-190, 330], [-120, 220]]), K.camisaSombra, { opacity: 0.55 }),
    // Solapas.
    P(poly([[-76, 160], [-30, 210], [-10, 276], [-60, 250], [-110, 200]]), K.camisaSombra),
    P(poly([[86, 150], [34, 210], [30, 270], [84, 250], [130, 196]]), K.camisaLuz),
    S(poly([[-76, 160], [-30, 210], [-10, 276], [-60, 250], [-110, 200]]), '#7a4e0a', 2),
    S(poly([[86, 150], [34, 210], [30, 270], [84, 250], [130, 196]]), '#7a4e0a', 2),
    flor(-190, 270, 26), flor(180, 290, 28), flor(-120, 310, 22), flor(120, 230, 20), flor(-150, 230, 16),
    P(smooth([[-230, 300], [-210, 280], [-190, 300]]), K.hoja), P(smooth([[210, 300], [230, 270], [250, 300]]), K.hoja),
  ].join('');
  const fr = frente(c, K,
    [[-102, -30], [-112, -80], [-90, -130], [-34, -156], [30, -156], [76, -134], [100, -100], [102, -56]],
    [[94, -60, 'c'], [84, -88], [60, -108], [28, -116], [-6, -112], [-40, -104], [-72, -90], [-98, -54, 'c']],
    [[12, -118, 86, -40, 62, 0.28], [-30, -112, 36, -56, 50, 0.22], [-64, -98, -22, -62, 40, 0.2]],
    [S(smooth([[-70, -128], [-24, -144], [34, -140], [76, -116]], false), K.peloLuz, 10, { opacity: 0.9 }), S(smooth([[-50, -128], [-10, -138], [30, -132]], false), K.peloBrillo, 3.2, { opacity: 0.9 })]);
  const base = pielBase(c, K, 'guille', { sombraFrente: fr.sombra });
  // Sombra de barba en la mandíbula (solo sombra, no barba).
  const kcara = c.clip(d);
  const sombraBarba = [];
  const rnd = rng(9);
  for (let i = 0; i < 110; i++) {
    const x = -50 + rnd() * 130;
    const y = 50 + rnd() * 80;
    sombraBarba.push(P(ellipse(x, y, 1, 1), K.barbilla, { opacity: 0.4 }));
  }
  const barbilla = G([P(smooth([[-80, 40], [-30, 60], [10, 70], [50, 70], [90, 60], [96, 140], [-80, 150]]), K.barbilla, { opacity: 0.17 }), ...sombraBarba], { 'clip-path': kcara });
  const sonrisaD = smooth([[18, 82, 'c'], [38, 80], [60, 82], [82, 78], [94, 74, 'c'], [86, 100], [66, 112], [42, 108], [28, 96]]);
  const ks = c.clip(sonrisaD);
  const boca = [
    P(sonrisaD, K.boca),
    G([P(poly([[16, 70], [96, 66], [92, 90], [78, 94], [60, 92], [42, 94], [26, 90]]), K.diente), S(line(44, 74, 44, 94), '#d8cdb6', 1.2), S(line(60, 74, 60, 94), '#d8cdb6', 1.2), S(line(76, 72, 76, 92), '#d8cdb6', 1.2), P(ellipse(60, 112, 24, 14), K.lengua)], { 'clip-path': ks }),
    S(sonrisaD, '#6a2a22', 2.4),
  ].join('');
  // Ojos entrecerrados y chispeantes (contentillo).
  const ojos = [
    ojoA(c, { cx: -14, cy: 2, w: 64, h: 50, s: 1, K, mirada: 0.1, parpado: 0.42, pestanas: 2, brillo: 2 }),
    ojoA(c, { cx: 58, cy: -1, w: 44, h: 48, s: -1, K, mirada: 0.1, parpado: 0.42, pestanas: 2, brillo: 2 }),
  ].join('');
  const cejas = P(ceja(14, -54, -54, -38, 15, 8, 9), K.ceja) + P(ceja(36, -54, 88, -40, 14, 6, 7), K.ceja);
  // Rubor de la cogorza: rubor ancho sobre nariz y mejillas.
  const mej = rubor(K, -12, 50, 30, 12) + rubor(K, 78, 42, 16, 9) + P(smooth([[20, 24], [60, 22], [96, 34], [60, 44], [26, 40]]), K.rubor, { opacity: 0.25 });
  return [masa, largos, oreja, cuelloSvg, camisa, base, luces(K), barbilla, S(d, K.linea, 2.8), fr.cap, picos, fr.locks, mej, nariz(K, 1.05, [90, 40]), boca, ojos, cejas].join('');
}

// ------------------------------------------------------------------ fondo y escena

function fondoRayas(c, cx, cy, { fondo, rayos = 'rgba(255,255,255,.38)', tension = '#150818', seed = 3, n = 34, interior = 250 } = {}) {
  const rnd = rng(seed);
  const R = 900;
  const partes = [P(`M0 0H${W}V${H}H0Z`, fondo)];
  // Rayos de color alternos.
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.05;
    const w = 0.035 + rnd() * 0.05;
    partes.push(P(poly([[cx, cy], [cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R], [cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R]]), rayos));
  }
  // Líneas de tensión desde fuera hacia el centro.
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = interior + rnd() * 160;
    const r1 = R;
    const w = 0.004 + rnd() * 0.013;
    partes.push(P(poly([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1], [cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1]]), tension));
  }
  void c;
  return partes.join('');
}

function cabeza(svg, x, y, s, flip = false, rot = 0) {
  return G(svg, { transform: `translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})` });
}


/** Una caña de cerveza con espuma y destellos (el "échate otra caña" de Fran). */
function cana(c, x, y) {
  const vaso = smooth([[-26, -60, 'c'], [26, -60, 'c'], [20, 60, 'c'], [-20, 60, 'c']], true, 0);
  const cerveza = c.grad('linear', [[0, '#ffe27a'], [0.6, '#f5a623'], [1, '#c76f0e']], { x1: 0, y1: 0, x2: 0, y2: 1 });
  const k = c.clip(poly([[-26, -60], [26, -60], [20, 60], [-20, 60]]));
  const burbujas = [[-10, 30], [6, 12], [-4, -8], [12, 38], [0, 50], [10, -26], [-12, 4]].map(([bx, by], i) => P(ellipse(bx, by, 1.6 + (i % 3), 1.6 + (i % 3)), '#fff6c8', { opacity: 0.8 }));
  void vaso;
  return G([
    P(ellipse(0, 70, 30, 7), '#000', { opacity: 0.25 }),
    P(poly([[-26, -60], [26, -60], [20, 60], [-20, 60]]), '#ffffff', { opacity: 0.35 }),
    G([P(poly([[-30, -40], [30, -40], [24, 64], [-24, 64]]), cerveza), ...burbujas, P(poly([[-18, -40], [-10, -40], [-8, 56], [-14, 56]]), '#fff', { opacity: 0.5 })], { 'clip-path': k }),
    // Espuma.
    ...[[-18, -58, 15], [-4, -66, 17], [12, -60, 15], [24, -56, 11], [-26, -52, 10]].map(([ex, ey, r]) => P(ellipse(ex, ey, r, r * 0.8), '#fffdf2') + S(ellipse(ex, ey, r, r * 0.8), '#e3d9b8', 1.4)),
    S(poly([[-26, -60], [26, -60], [20, 60], [-20, 60]]), '#2a1a0a', 3),
    P(estrella(34, -30, 18, 0.18), '#fff'), P(estrella(-36, 20, 11, 0.18), '#fff'),
  ], { transform: `translate(${x} ${y}) rotate(-8) scale(1.1)` });
}

export function hojaPabloVero() {
  const c = ctx();
  const fondo = c.grad('radial', [[0, '#fffbe0'], [0.25, '#ffd24a'], [0.55, '#ff5a7e'], [1, '#34115c']], { cx: 0.5, cy: 0.48, r: 0.75 });
  const cuerpo = [
    fondoRayas(c, 422, 190, { fondo }),
    // Destello entre las dos miradas.
    P(estrella(428, 184, 60, 0.12), '#fff'), P(estrella(428, 184, 38, 0.2), '#fff6b0'),
    S(line(300, 184, 556, 184), '#fff', 3, { opacity: 0.6 }),
    // ゴゴゴ en el hueco.
    G([goTrazos(398, 44, 0.95, '#ff2d3a', '#17061d', 6), goTrazos(402, 112, 0.95, '#ff2d3a', '#17061d', 6), goTrazos(406, 180, 0.95, '#ff2d3a', '#17061d', 6)], { transform: 'rotate(-4 422 90)' }),
    cabeza(pabloA(c), 206, 172, 1.36, false, -3),
    cabeza(veroA(c), 648, 206, 1.17, true, 3),
  ].join('');
  return hoja(c, cuerpo, '#12041c');
}

export function hojaFranGuille() {
  const c = ctx();
  const fondo = c.grad('radial', [[0, '#ffffff'], [0.3, '#b8f0e8'], [0.62, '#3aa8b8'], [1, '#14284e']], { cx: 0.5, cy: 0.48, r: 0.75 });
  const cuerpo = [
    fondoRayas(c, 422, 190, { fondo, rayos: 'rgba(255,255,255,.35)', tension: '#08142c', seed: 8 }),
    P(estrella(428, 130, 56, 0.12), '#fff'),
    cana(c, 424, 232),
    cabeza(franA(c), 226, 160, 1.2, false, -3),
    cabeza(guilleA(c), 622, 160, 1.2, true, 3),
  ].join('');
  return hoja(c, cuerpo, '#08142c');
}
