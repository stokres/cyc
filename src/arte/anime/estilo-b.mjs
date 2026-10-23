// Estilo B · Primer plano «demasiado detallado».
// Entre el anime de los 80 y lo grotesco: pestañas una a una, poros, arrugas, labios con brillo,
// sombreado de tramas (screentone), nariz y barbilla exageradas. Pablo en primer término
// (enorme, cortado por el encuadre) y Vero detrás.
import { ctx, ellipse, smooth, P, S, G, poly, line, mechon, rng, f, hoja, W, H, tramaPuntos, tramaRayas } from './comun.mjs';
import { PUNTOS, COL } from './rasgos.mjs';

// ------------------------------------------------------------------ utilidades

const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};
/** Normal unitaria (hacia la izquierda de la marcha) de una cúbica. */
const bezN = (p0, p1, p2, p3, t) => {
  const a = bez(p0, p1, p2, p3, Math.max(0, t - 0.01));
  const b = bez(p0, p1, p2, p3, Math.min(1, t + 0.01));
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L = Math.hypot(dx, dy) || 1;
  return [dy / L, -dx / L];
};

function dentro([x, y], pts) {
  let r = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}

/** Puntos al azar dentro de un polígono. */
function puntosEn(rnd, pts, n, caja = null) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, y0, x1, y1] = caja ?? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const out = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 30) {
    const p = [x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0)];
    if (dentro(p, pts)) out.push(p);
  }
  return out;
}

const hebra = (x, y, dx, dy, curl = 0) => {
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  return `M${f(x)} ${f(y)}Q${f(x + dx / 2 + nx * curl)} ${f(y + dy / 2 + ny * curl)} ${f(x + dx)} ${f(y + dy)}`;
};

/** Exagera barbilla y mandíbula (hacia abajo) de una lista de puntos de cara. */
function deforma(pts, mento = 1.15, ancho = 1) {
  return pts.map(([x, y, t]) => [x * (y > 60 ? ancho : 1), y > 50 ? 50 + (y - 50) * mento : y, t]);
}

// ------------------------------------------------------------------ ojo hiperdetallado

function ojoB(c, rnd, { cx, cy, w, h, s, K, mirada = 0.12, lashes = 24, largas = 1, sombra = false, iris = null, venas = 9 }) {
  const ox = cx - s * w / 2;
  const ix = cx + s * w / 2;
  const U0 = [ox, cy + h * 0.1];
  const U1 = [cx - s * w * 0.36, cy - h * 0.78];
  const U2 = [cx + s * w * 0.2, cy - h * 0.74];
  const U3 = [ix, cy + h * 0.05];
  const L0 = U3;
  const L1 = [cx + s * w * 0.22, cy + h * 0.52];
  const L2 = [cx - s * w * 0.26, cy + h * 0.58];
  const L3 = U0;
  const forma = `M${f(U0[0])} ${f(U0[1])}C${f(U1[0])} ${f(U1[1])} ${f(U2[0])} ${f(U2[1])} ${f(U3[0])} ${f(U3[1])}C${f(L1[0])} ${f(L1[1])} ${f(L2[0])} ${f(L2[1])} ${f(L3[0])} ${f(L3[1])}Z`;
  const k = c.clip(forma);
  const ic = iris ?? K.iris;
  const R = w * 0.27;
  const icx = cx + mirada * w;
  const icy = cy + h * 0.02;
  const gEsc = c.grad('radial', [[0, '#fbf3e6'], [0.6, '#eadccb'], [1, '#b99a88']], { cx: 0.5, cy: 0.5, r: 0.6 });
  const gIris = c.grad('radial', [[0, ic[0]], [0.34, ic[0]], [0.4, ic[2]], [0.78, ic[1]], [1, ic[0]]], { cx: 0.5, cy: 0.5, r: 0.5 });

  const dentro_ = [P(forma, gEsc)];
  // Venitas rojas del ojo.
  for (let i = 0; i < venas; i++) {
    const desdeFuera = i % 2 === 0;
    const bx = desdeFuera ? ox + s * 2 : ix - s * 2;
    const by = cy + h * (0.1 + (rnd() - 0.5) * 0.3);
    const lx = icx + (bx - icx) * (0.4 + rnd() * 0.2);
    const ly = icy + (rnd() - 0.5) * h * 0.5;
    dentro_.push(S(`M${f(bx)} ${f(by)}C${f(bx + (lx - bx) * 0.3)} ${f(by - 4 + rnd() * 8)} ${f(bx + (lx - bx) * 0.7)} ${f(ly + 3 - rnd() * 6)} ${f(lx)} ${f(ly)}`, '#c0544c', 0.7, { opacity: 0.5 }));
  }
  // Iris con fibras.
  dentro_.push(P(ellipse(icx, icy, R, R), gIris));
  for (let i = 0; i < 70; i++) {
    const a = (i / 70) * Math.PI * 2 + rnd() * 0.05;
    const r0 = R * (0.3 + rnd() * 0.08);
    const r1 = R * (0.72 + rnd() * 0.24);
    dentro_.push(S(line(icx + Math.cos(a) * r0, icy + Math.sin(a) * r0, icx + Math.cos(a) * r1, icy + Math.sin(a) * r1), i % 3 === 0 ? ic[2] : ic[0], 0.8, { opacity: i % 3 === 0 ? 0.7 : 0.5 }));
  }
  dentro_.push(S(ellipse(icx, icy, R * 0.98, R * 0.98), '#120804', 2.4, { opacity: 0.9 }));
  dentro_.push(P(ellipse(icx, icy, R * 0.33, R * 0.33), '#050202'));
  // Reflejo de ventana (cruceta) y chispa.
  const wx = icx - R * 0.42;
  const wy = icy - R * 0.42;
  dentro_.push(P(poly([[wx - 6, wy - 6], [wx + 6, wy - 6], [wx + 6, wy + 6], [wx - 6, wy + 6]]), '#fff', { opacity: 0.95 }));
  dentro_.push(S(line(wx, wy - 6, wx, wy + 6), '#a9a39a', 1));
  dentro_.push(S(line(wx - 6, wy, wx + 6, wy), '#a9a39a', 1));
  dentro_.push(P(ellipse(icx + R * 0.45, icy + R * 0.5, 2.6, 2.6), '#fff', { opacity: 0.85 }));
  dentro_.push(P(ellipse(icx + R * 0.1, icy + R * 0.7, 6, 1.6), ic[2], { opacity: 0.5 }));
  // Sombra del párpado sobre el globo, blanda: dos capas.
  dentro_.push(P(`M${f(ox - 10)} ${f(cy - h)}L${f(ix + 10)} ${f(cy - h)}L${f(ix + 10)} ${f(cy - h * 0.12)}Q${f(cx)} ${f(cy - h * 0.34)} ${f(ox - 10)} ${f(cy - h * 0.04)}Z`, sombra ? 'rgba(10,0,10,.55)' : 'rgba(80,30,30,.38)'));
  dentro_.push(P(`M${f(ox - 10)} ${f(cy - h)}L${f(ix + 10)} ${f(cy - h)}L${f(ix + 10)} ${f(cy - h * 0.34)}Q${f(cx)} ${f(cy - h * 0.5)} ${f(ox - 10)} ${f(cy - h * 0.22)}Z`, 'rgba(30,10,10,.35)'));
  // Humedad del borde inferior.
  dentro_.push(S(`M${f(L1[0])} ${f(L1[1] - 2)}C${f(L1[0])} ${f(L1[1] - 2)} ${f(L2[0])} ${f(L2[1] - 2)} ${f(L3[0])} ${f(L3[1] - 1)}`, '#ffd9d0', 2.4, { opacity: 0.8 }));

  const out = [G(dentro_, { 'clip-path': k })];
  // Párpado superior: borde grueso y pestañas una a una.
  const sup = `M${f(U0[0])} ${f(U0[1])}C${f(U1[0])} ${f(U1[1])} ${f(U2[0])} ${f(U2[1])} ${f(U3[0])} ${f(U3[1])}`;
  out.push(S(sup, '#0d0605', 4.2));
  out.push(S(`M${f(cx - s * w * 0.3)} ${f(U1[1] * 0.35 + cy * 0.65 - 1)}Q${f(cx)} ${f(cy - h * 0.62)} ${f(cx + s * w * 0.28)} ${f(cy - h * 0.58)}`, '#0d0605', 6.5));
  for (let i = 0; i < lashes; i++) {
    const t = 0.04 + (i / (lashes - 1)) * 0.92;
    const p = bez(U0, U1, U2, U3, t);
    const n = bezN(U0, U1, U2, U3, t);
    // Hacia fuera: normal con signo hacia arriba.
    const sg = n[1] < 0 ? 1 : -1;
    const nx = n[0] * sg;
    const ny = n[1] * sg;
    const fuera = (1 - t) * 0.9;
    const len = (7 + rnd() * 6 + fuera * 9) * largas;
    const dx = nx * len - s * len * (0.2 + fuera * 0.5);
    const dy = ny * len;
    out.push(S(`M${f(p[0])} ${f(p[1])}Q${f(p[0] + dx * 0.5 + nx * 2)} ${f(p[1] + dy * 0.5 - 2)} ${f(p[0] + dx)} ${f(p[1] + dy)}`, '#0d0605', 1.15 + rnd() * 0.5));
  }
  // Pestañas inferiores, cortas.
  for (let i = 0; i < 13; i++) {
    const t = 0.1 + (i / 12) * 0.78;
    const p = bez(L0, L1, L2, L3, t);
    const n = bezN(L0, L1, L2, L3, t);
    const sg = n[1] > 0 ? 1 : -1;
    const len = 4 + rnd() * 4;
    out.push(S(`M${f(p[0])} ${f(p[1])}l${f(n[0] * sg * len + s * 1.5)} ${f(n[1] * sg * len)}`, '#1a0d08', 0.9, { opacity: 0.85 }));
  }
  // Pliegues del párpado y bolsa.
  out.push(S(`M${f(ox + s * 4)} ${f(cy - h * 0.46)}C${f(cx - s * w * 0.3)} ${f(cy - h * 1.15)} ${f(cx + s * w * 0.2)} ${f(cy - h * 1.15)} ${f(ix + s * 2)} ${f(cy - h * 0.36)}`, K.hondo, 1.7, { opacity: 0.85 }));
  out.push(S(`M${f(ox + s * 8)} ${f(cy - h * 0.6)}C${f(cx - s * w * 0.3)} ${f(cy - h * 1.4)} ${f(cx + s * w * 0.2)} ${f(cy - h * 1.35)} ${f(ix + s * 6)} ${f(cy - h * 0.62)}`, K.hondo, 1, { opacity: 0.6 }));
  out.push(S(`M${f(ox + s * 2)} ${f(cy + h * 0.72)}C${f(cx - s * w * 0.2)} ${f(cy + h * 1.08)} ${f(cx + s * w * 0.2)} ${f(cy + h * 1.08)} ${f(ix)} ${f(cy + h * 0.78)}`, K.hondo, 1.4, { opacity: 0.8 }));
  out.push(S(`M${f(ox + s * 2)} ${f(cy + h * 0.84)}C${f(cx - s * w * 0.2)} ${f(cy + h * 1.26)} ${f(cx + s * w * 0.2)} ${f(cy + h * 1.24)} ${f(ix)} ${f(cy + h * 0.9)}`, K.hondo, 0.9, { opacity: 0.55 }));
  // Patas de gallo.
  for (let i = 0; i < 5; i++) {
    const a = (-0.5 + i * 0.28) + (s > 0 ? Math.PI : 0);
    const L = 14 + rnd() * 12;
    out.push(S(line(ox - s * 3, cy + h * 0.1 + (i - 2) * 1.2, ox - s * 3 + Math.cos(a) * L * -s * -1, cy + h * 0.1 + Math.sin(a) * L), K.hondo, 0.9, { opacity: 0.7 }));
  }
  return out.join('');
}

/** Ceja de pelos sueltos, uno a uno. */
function cejaB(rnd, K, [x0, y0], [x1, y1], grosor, n, arch = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = rnd();
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2 - arch;
    const u = 1 - t;
    const px = u * u * x0 + 2 * u * t * mx + t * t * x1;
    const py = u * u * y0 + 2 * u * t * my + t * t * y1;
    const gr = grosor * (1 - t * 0.65);
    const oy = (rnd() - 0.5) * gr;
    const ang = -0.9 + t * 0.9 + (rnd() - 0.5) * 0.4;
    const dir = x1 > x0 ? 1 : -1;
    const L = 6 + rnd() * 6;
    out.push(S(hebra(px, py + oy, Math.cos(ang) * L * dir, Math.sin(ang) * L, 1.4), i % 5 === 0 ? K.barbaLuz ?? K.peloLuz : K.ceja, 1.1 + rnd() * 0.5, { opacity: 0.92 }));
  }
  return out.join('');
}

// ------------------------------------------------------------------ nariz

function narizB(c, rnd, K, k = 1.45, tip = [90, 42], pelos = true) {
  const [tx, ty] = tip;
  const t = `translate(26 -6) scale(${k}) translate(-26 6)`;
  const frente_ = [[36, 22], [54, 34], [tx - 14, ty - 6], [tx, ty], [tx + 2, ty + 10], [tx - 6, ty + 17], [tx - 20, ty + 17], [tx - 32, ty + 12]];
  const forma = smooth([[26, -6, 'c'], ...frente_, [46, 46], [38, 36], [32, 26], [20, 8]]);
  const kn = c.clip(forma);
  const hatch = tramaRayas(c, K.hondo, 2.2, 55, 0.55);
  const pts = [[26, -6], ...frente_, [46, 46], [38, 36], [32, 26], [20, 8]];
  const poros = puntosEn(rnd, pts, 70).map(([x, y]) => P(ellipse(x, y, 0.5 + rnd() * 0.5, 0.5 + rnd() * 0.4), K.hondo, { opacity: 0.55 }));
  return G([
    P(forma, K.skin),
    G([
      P(smooth([[26, -6], [36, 20], [44, 44], [54, 54], [40, 52], [28, 36], [18, 8]]), K.sombra),
      P(smooth([[26, -6], [36, 20], [44, 44], [54, 54], [40, 52], [28, 36], [18, 8]]), hatch),
      P(smooth([[tx - 30, ty + 8], [tx - 16, ty + 22], [tx, ty + 14], [tx - 10, ty + 24], [tx - 30, ty + 20]]), K.hondo, { opacity: 0.75 }),
      P(ellipse(tx - 2, ty + 8, 10, 10), K.rubor, { opacity: 0.32 }),
      ...poros,
      P(smooth([[54, 32], [tx - 14, ty - 5], [tx - 4, ty], [tx - 14, ty + 3], [60, 38]]), K.luz),
      P(ellipse(tx - 8, ty + 1, 4.5, 2.6, -0.3), '#fff', { opacity: 0.85 }),
    ], { 'clip-path': kn }),
    S(smooth(frente_, false), K.linea, 1.8),
    // Aleta, fosa y pelitos.
    S(smooth([[tx - 34, ty + 4], [tx - 30, ty + 15], [tx - 18, ty + 19], [tx - 8, ty + 16]], false), K.hondo, 1.5, { opacity: 0.85 }),
    P(ellipse(tx - 15, ty + 12, 6.5, 3.8, 0.1), '#2a0f0a'),
    ...(pelos ? [0, 1, 2, 3, 4].map((i) => S(line(tx - 20 + i * 2.6, ty + 11, tx - 21 + i * 2.8, ty + 7 - (i % 2)), '#1a0a06', 0.7)) : []),
    S(smooth([[tx - 22, ty + 15], [tx - 14, ty + 17], [tx - 8, ty + 14]], false), '#ffd6c8', 0.9, { opacity: 0.7 }),
    // Venita en el ala de la nariz.
    S(smooth([[tx - 24, ty - 2], [tx - 28, ty + 4], [tx - 31, ty + 8]], false), '#b8564c', 0.8, { opacity: 0.6 }),
  ], { transform: t });
}

// ------------------------------------------------------------------ Pablo

function pabloB(c, rnd) {
  const K = COL.pablo;
  const pts = deforma(PUNTOS.pablo, 1.22, 1.03);
  const d = smooth(pts);
  const kc = c.clip(d);
  const trama = tramaPuntos(c, K.hondo, 3.2, 30, 0.95);
  const rayas = tramaRayas(c, K.hondo, 2.4, 50, 0.6);

  // --- Pelo de atrás y nuca.
  const hair = [P(smooth([[-106, 60], [-118, 0], [-112, -70], [-84, -122], [-30, -152], [30, -150], [74, -128], [98, -98], [102, -60], [88, -70], [60, -100], [0, -104], [-50, -92], [-84, -60], [-92, -10]]), K.peloSombra)];
  const capD = smooth([[-100, -30], [-108, -80], [-84, -128], [-30, -152], [30, -150], [76, -130], [98, -96], [100, -50], [92, -56, 'c'], [80, -84], [56, -104], [24, -112], [-8, -108], [-40, -100], [-70, -86], [-92, -54, 'c']]);
  const capPts = [[-100, -30], [-108, -80], [-84, -128], [-30, -152], [30, -150], [76, -130], [98, -96], [100, -50], [92, -56], [80, -84], [56, -104], [24, -112], [-8, -108], [-40, -100], [-70, -86], [-92, -54]];
  const strands = [];
  for (const [x, y] of puntosEn(rnd, capPts, 240)) {
    const a = -Math.PI / 2 + (x / 160) * 0.9 + (rnd() - 0.5) * 0.5;
    const L = 28 + rnd() * 46;
    const col = [K.pelo, K.peloSombra, K.peloLuz, K.pelo, K.peloBrillo][Math.floor(rnd() * 5)];
    strands.push(S(hebra(x, y, Math.cos(a) * L, Math.sin(a) * L, (rnd() - 0.5) * 22), col, 1 + rnd() * 1.3, { opacity: col === K.peloBrillo ? 0.7 : 0.95 }));
  }
  const spikes = [[-80, -90, -112, -160, 36, 0.25], [-48, -108, -70, -186, 40, 0.2], [-14, -118, -12, -204, 44, -0.12], [22, -120, 52, -198, 44, 0.2], [56, -108, 104, -178, 40, 0.22], [82, -88, 132, -132, 32, 0.25]];
  const spikeSvg = spikes.map(([x, y, tx, ty, w, cu]) => P(mechon(x, y, tx, ty, w, cu), K.pelo) + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const u = (i + 1) / 9;
    const sx = x + (tx - x) * u * 0.1 + (i - 3.5) * (w / 9);
    return S(hebra(sx, y, (tx - x) * (0.9 - Math.abs(i - 3.5) * 0.05), (ty - y) * 0.92, cu * 40 + (rnd() - 0.5) * 8), i % 3 === 0 ? K.peloLuz : K.peloSombra, 1.1, { opacity: 0.85 });
  }).join('')).join('');
  // Mechón suelto en la frente.
  const suelto = S(`M50 -100Q92 -90 78 -40`, K.peloSombra, 6) + S(`M50 -100Q92 -90 78 -40`, K.pelo, 4) + S(`M52 -102Q90 -92 77 -48`, K.peloBrillo, 1.2, { opacity: 0.8 });

  // --- Oreja con pliegues y aro.
  const ear = [
    P(smooth([[-76, -20], [-90, -26], [-104, -12], [-106, 12], [-98, 34], [-84, 40], [-74, 30], [-72, 0]]), K.skin),
    P(smooth([[-86, -10], [-96, -8], [-98, 14], [-90, 26], [-82, 18], [-82, 0]]), K.sombra),
    S(smooth([[-82, -14], [-94, -12], [-98, 6], [-92, 22], [-84, 26]], false), K.hondo, 1.4),
    S(smooth([[-90, -2], [-93, 8], [-88, 16]], false), K.hondo, 1),
    S(smooth([[-76, -20], [-90, -26], [-104, -12], [-106, 12], [-98, 34], [-84, 40]], false), K.linea, 1.8),
    S(ellipse(-92, 48, 8, 9), '#e8ecf4', 3.4),
    S(ellipse(-92, 48, 8, 9), '#6a7388', 1, { opacity: 0.8 }),
    P(ellipse(-96, 44, 1.8, 1.8), '#fff'),
  ].join('');

  // --- Cuello y borreguillo con ricitos.
  const neck = P(smooth([[-52, 40], [-58, 220], [34, 230], [50, 130], [44, 96]]), K.sombra) + G([P(smooth([[-80, 70], [-30, 120], [24, 140], [70, 110], [70, 60], [-80, 20]]), K.hondo, { opacity: 0.85 }), P(smooth([[-80, 70], [-30, 120], [24, 140], [70, 110], [70, 60], [-80, 20]]), rayas)], { 'clip-path': c.clip(smooth([[-52, 40], [-58, 220], [34, 230], [50, 130], [44, 96]])) });
  const jacket = [
    P(smooth([[-76, 160], [-210, 200], [-290, 330], [280, 330], [210, 200], [80, 150], [-10, 210]], true, 0.6), K.chaqueta),
    P(smooth([[-10, 214], [40, 170], [84, 152], [120, 210], [60, 330], [10, 330]]), K.sudadera),
  ];
  const lana = [];
  const collarPts = [[-84, 156], [-64, 176], [-38, 192], [-10, 204], [20, 196], [50, 176], [74, 154], [96, 142]];
  collarPts.forEach(([x, y]) => {
    lana.push(P(ellipse(x, y, 24, 20), K.borregoSombra));
    for (let i = 0; i < 34; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 22;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * 0.85;
      lana.push(S(`M${f(px)} ${f(py)}a${f(2 + rnd() * 2)} ${f(2 + rnd() * 2)} 0 1 1 ${f(2 + rnd())} ${f(1.5)}`, i % 4 === 0 ? '#fff' : K.borrego, 1.5, { opacity: 0.95 }));
    }
  });

  // --- Cara: volumen + sombras con trama + poros + arrugas.
  const gBase = c.grad('radial', [[0, K.luz], [0.5, K.skin], [1, K.sombra]], { cx: 0.62, cy: 0.38, r: 0.8 });
  const luzBar = c.grad('linear', [[0, '#1c2a52', 0.4], [0.45, '#1c2a52', 0], [0.75, '#ffb464', 0], [1, '#ffb464', 0.28]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const sombras = [
    P(smooth([[-40, -140], [-58, -70], [-62, 0], [-56, 44], [-34, 90], [0, 130], [30, 150], [-120, 160], [-120, -140]]), K.sombra),
    P(smooth([[-40, -140], [-58, -70], [-62, 0], [-56, 44], [-34, 90], [0, 130], [30, 150], [-120, 160], [-120, -140]]), trama),
    // Cuenca del ojo (hundida) y bajo la ceja.
    P(ellipse(-12, -10, 50, 30), K.sombra, { opacity: 0.55 }),
    P(ellipse(60, -12, 30, 28), K.sombra, { opacity: 0.45 }),
    P(smooth([[-70, -34], [-20, -46], [26, -44], [30, -20], [-30, -26]]), rayas, { opacity: 0.8 }),
    // Bajo la barbilla y debajo del labio.
    P(smooth([[-70, 100], [-20, 112], [40, 132], [96, 100], [96, 170], [-70, 170]]), K.hondo, { opacity: 0.6 }),
    P(smooth([[-70, 100], [-20, 112], [40, 132], [96, 100], [96, 170], [-70, 170]]), trama),
    // Sombra bajo el flequillo.
    P(smooth([[-100, -110], [100, -110], [96, -62], [60, -76], [24, -88], [-8, -92], [-44, -86], [-76, -76], [-100, -48]]), K.sombra),
    P(smooth([[-100, -110], [100, -110], [96, -62], [60, -76], [24, -88], [-8, -92], [-44, -86], [-76, -76], [-100, -48]]), rayas),
    // Brillos de sudor y de piel grasa.
    P(smooth([[0, -100], [60, -92], [74, -66], [30, -62], [-10, -78]]), K.luz, { opacity: 0.8 }),
    P(ellipse(30, -78, 22, 6, -0.1), '#fff', { opacity: 0.35 }),
    P(ellipse(70, 10, 10, 20, 0.2), K.luz, { opacity: 0.6 }),
    P(ellipse(66, 14, 5, 10, 0.2), '#fff', { opacity: 0.3 }),
    P(ellipse(-40, 40, 18, 12), K.rubor, { opacity: 0.35 }),
    P(ellipse(72, 36, 14, 10), K.rubor, { opacity: 0.35 }),
  ].join('');
  const poros = puntosEn(rnd, pts, 520).map(([x, y]) => P(ellipse(x, y, 0.45 + rnd() * 0.55, 0.4 + rnd() * 0.45), K.hondo, { opacity: 0.25 + rnd() * 0.3 }));
  const arrugas = [];
  // Frente: líneas horizontales con ondas.
  [[-84, 8], [-74, 6], [-64, 5], [-55, 4]].forEach(([y, a], i) => {
    const x0 = -52 + i * 3;
    const x1 = 62 - i * 4;
    arrugas.push(S(`M${x0} ${y}Q${(x0 + x1) / 2} ${y - a} ${x1} ${y + 2}`, K.hondo, 1.2, { opacity: 0.55 }));
    arrugas.push(S(`M${x0 + 2} ${y + 1.8}Q${(x0 + x1) / 2} ${y - a + 1.8} ${x1 - 2} ${y + 3.6}`, K.luz, 0.9, { opacity: 0.6 }));
  });
  // Entrecejo y surco nasogeniano.
  arrugas.push(S('M20 -34Q24 -44 22 -54', K.hondo, 1.3, { opacity: 0.7 }), S('M10 -34Q12 -44 8 -52', K.hondo, 1.1, { opacity: 0.6 }));
  arrugas.push(S('M52 58Q60 74 40 92', K.hondo, 2, { opacity: 0.45 }), S('M-4 60Q-14 76 -8 92', K.hondo, 1.4, { opacity: 0.4 }));
  const skin = G([P(d, gBase), sombras, ...poros, ...arrugas, P(d, luzBar)], { 'clip-path': kc });

  // --- Barba: pelos uno a uno siguiendo la mandíbula.
  const exterior = [[-88, 18], [-80, 58], [-48, 90], [-18, 110], [12, 126], [42, 134], [64, 118], [80, 92], [90, 62], [92, 38]];
  const interior = [[80, 46], [62, 52], [40, 62], [16, 64], [2, 66], [-14, 66], [-38, 58], [-60, 40], [-78, 20]];
  const barbaPts = [...exterior, ...interior];
  const barbaD = smooth(barbaPts);
  const hairs = [];
  for (const [x, y] of puntosEn(rnd, barbaPts, 1500)) {
    const a = Math.PI / 2 + (x - 10) / 220 - 0.2 + (rnd() - 0.5) * 0.9;
    const L = 7 + rnd() * 9;
    const col = [K.barba, K.barbaSombra, K.barbaSombra, K.barbaLuz, K.barba][Math.floor(rnd() * 5)];
    hairs.push(S(hebra(x, y, Math.cos(a) * L, Math.sin(a) * L, (rnd() - 0.5) * 8), col, 0.9 + rnd() * 0.8, { opacity: 0.95 }));
  }
  const mostacho = [];
  for (const [x, y] of puntosEn(rnd, [[10, 74], [22, 62], [46, 57], [72, 58], [92, 66], [84, 78], [70, 72], [50, 72], [32, 78]], 160)) {
    const a = 0.5 + (x - 50) / 90 + (rnd() - 0.5) * 0.7;
    const L = 6 + rnd() * 8;
    mostacho.push(S(hebra(x, y, Math.cos(a) * L, Math.sin(a) * L, (rnd() - 0.5) * 6), [K.barba, K.barbaSombra, K.barbaLuz][Math.floor(rnd() * 3)], 0.9 + rnd() * 0.7));
  }
  const barba = [
    P(barbaD, K.barbaSombra),
    G([P(barbaD, K.barba), ...hairs], { 'clip-path': c.clip(barbaD) }),
    // Pelillos que se escapan de la barba, hacia el borde.
    ...puntosEn(rnd, [[-78, 20], [-60, 50], [-30, 66], [10, 64], [40, 62], [78, 50], [86, 28], [60, 30], [20, 36], [-30, 34]], 90).map(([x, y]) => S(hebra(x, y, 3 + rnd() * 4, 4 + rnd() * 5, 2), K.barba, 0.8, { opacity: 0.5 })),
  ].join('');

  // --- Boca: dientes uno a uno, lengua con papilas, saliva brillante.
  const bocaD = smooth([[18, 82, 'c'], [32, 78], [52, 80], [74, 77], [86, 80, 'c'], [80, 98], [64, 108], [44, 110], [28, 100]]);
  const kb = c.clip(bocaD);
  const dientes = [];
  const dx0 = [22, 31, 41, 51, 61, 71, 80];
  dx0.forEach((x, i) => {
    const w = i === 3 || i === 2 ? 10 : 9;
    dientes.push(P(smooth([[x, 78], [x + w, 77], [x + w - 0.5, 91 + (i % 2)], [x + w / 2, 94 + (i % 2)], [x + 0.6, 91]]), '#fbf6ea'));
    dientes.push(S(line(x + w, 78, x + w - 0.5, 91), '#c9bca2', 0.9));
    dientes.push(P(smooth([[x + 1.5, 80], [x + w - 2, 80], [x + w - 2.5, 86], [x + 2, 86]]), '#fff', { opacity: 0.55 }));
  });
  const lengua = [P(ellipse(54, 112, 26, 15), K.lengua), S(line(54, 100, 54, 110), '#9a3a38', 1.3)];
  for (const [x, y] of puntosEn(rnd, [[30, 104], [78, 104], [74, 118], [34, 118]], 40)) lengua.push(P(ellipse(x, y, 0.9, 0.7), '#f2a39c', { opacity: 0.9 }));
  const boca = [
    P(bocaD, '#3a0e12'),
    G([...lengua, ...dientes, P(ellipse(54, 100, 24, 5), '#fff', { opacity: 0.12 })], { 'clip-path': kb }),
    // Labio inferior carnoso con brillo, encima del hueco.
    P(smooth([[18, 98], [34, 108], [54, 112], [76, 106], [86, 94], [90, 104], [76, 120], [54, 126], [32, 120], [14, 108]]), K.labio),
    P(smooth([[28, 112], [54, 118], [76, 112], [54, 114]]), '#ff9a9a', { opacity: 0.9 }),
    P(ellipse(50, 114, 16, 2.4), '#fff', { opacity: 0.85 }),
    S(smooth([[16, 100], [34, 110], [54, 114], [76, 108], [88, 96]], false), '#4a1218', 1.6),
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => S(line(26 + i * 8, 112, 27 + i * 8, 120 - (i % 3)), '#8a3a34', 0.6, { opacity: 0.7 })),
    // Hilo de saliva entre los labios.
    S('M50 94Q52 104 51 112', '#fff', 1.3, { opacity: 0.8 }),
    S(bocaD, '#2a0a0e', 1.8),
  ].join('');

  // --- Ojos: casi realistas, pero enormes.
  const ojos = ojoB(c, rnd, { cx: -14, cy: 0, w: 70, h: 44, s: 1, K, mirada: 0.1, lashes: 22 }) + ojoB(c, rnd, { cx: 58, cy: -3, w: 48, h: 42, s: -1, K, mirada: 0.1, lashes: 15 });
  const cejas = cejaB(rnd, K, [16, -52], [-54, -32], 14, 150, 5) + cejaB(rnd, K, [36, -54], [88, -34], 13, 110, 4);
  // Gotas de sudor en la frente.
  const sudor = [[-20, -66, 3.2], [8, -74, 2.4], [36, -60, 3.6], [60, -80, 2.6], [-44, -56, 2.4], [24, -90, 2], [74, -52, 2.8]]
    .map(([x, y, r]) => P(ellipse(x, y, r, r * 1.15), '#d8f0ff', { opacity: 0.55 }) + S(`M${f(x - r * 0.6)} ${f(y + r * 0.7)}Q${f(x)} ${f(y + r * 1.2)} ${f(x + r * 0.6)} ${f(y + r * 0.5)}`, '#fff', 0.8) + P(ellipse(x - r * 0.3, y - r * 0.4, r * 0.35, r * 0.25), '#fff'))
    .join('');

  return [hair.join(''), ear, neck, jacket.join(''), lana.join(''), skin, S(d, K.linea, 2.2), P(capD, K.pelo), S(capD, K.peloSombra, 2), strands.join(''), barba, mostacho.join(''), narizB(c, rnd, K, 1.5, [90, 42]), boca, ojos, cejas, spikeSvg, suelto, sudor].join('');
}

// ------------------------------------------------------------------ Vero

function veroB(c, rnd) {
  const K = COL.vero;
  const pts = deforma(PUNTOS.vero, 1.08, 1);
  const d = smooth(pts);
  const kc = c.clip(d);
  const trama = tramaPuntos(c, K.hondo, 3.2, 30, 0.95);
  const rayas = tramaRayas(c, K.hondo, 2.4, 50, 0.6);

  // --- Pelo recogido: hebras largas hacia atrás, moño con rizos y goma.
  const masa = P(smooth([[-100, 40], [-112, -20], [-104, -84], [-76, -126], [-30, -144], [26, -138], [66, -118], [90, -96], [94, -66], [70, -92], [40, -98], [-2, -98], [-46, -88], [-76, -60], [-88, -10]]), K.peloSombra);
  const capPts = [[-96, -30], [-104, -84], [-76, -126], [-30, -144], [26, -138], [66, -118], [90, -96], [96, -60], [88, -56], [72, -86], [44, -100], [10, -104], [-30, -96], [-64, -82], [-90, -50]];
  const capD = smooth([[-96, -30], [-104, -84], [-76, -126], [-30, -144], [26, -138], [66, -118], [90, -96], [96, -60], [88, -56, 'c'], [72, -86], [44, -100], [10, -104], [-30, -96], [-64, -82], [-90, -50, 'c']]);
  const hebras = [];
  for (const [x, y] of puntosEn(rnd, capPts, 330)) {
    // Hebras que van de la frente hacia el moño (arriba-izquierda).
    const a = Math.PI + 0.3 + (rnd() - 0.5) * 0.5 - (x > 40 ? 0.35 : 0);
    const L = 30 + rnd() * 40;
    const col = [K.pelo, K.peloSombra, K.pelo, K.peloLuz, K.peloBrillo][Math.floor(rnd() * 5)];
    hebras.push(S(hebra(x, y, Math.cos(a) * L, Math.sin(a) * L - 12, (rnd() - 0.5) * 12), col, 0.9 + rnd() * 1, { opacity: col === K.peloBrillo ? 0.65 : 0.95 }));
  }
  const mono = [P(ellipse(-42, -150, 56, 42, -0.2), K.peloSombra), P(ellipse(-38, -156, 48, 34, -0.2), K.pelo)];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 8 + rnd() * 42;
    mono.push(S(`M${f(-40 + Math.cos(a) * r)} ${f(-154 + Math.sin(a) * r * 0.75)}a${f(8 + rnd() * 10)} ${f(5 + rnd() * 8)} 0 0 1 ${f(10 + rnd() * 14)} ${f(-4 + rnd() * 8)}`, [K.peloLuz, K.peloSombra, K.peloBrillo][i % 3], 1, { opacity: 0.85 }));
  }
  const goma = [P(smooth([[-80, -126], [-40, -140], [-4, -128], [-6, -112], [-42, -124], [-78, -110]]), K.goma), S(smooth([[-76, -122], [-40, -135], [-8, -124]], false), '#e0788e', 2.4, { opacity: 0.9 }), S(smooth([[-78, -110], [-42, -124], [-6, -112]], false), K.gomaSombra, 2.4)];
  const suelto = [S('M-62 -86Q-74 -30 -68 36', K.peloSombra, 5), S('M-62 -86Q-74 -30 -68 36', K.pelo, 3), S('M-63 -80Q-73 -30 -68 28', K.peloBrillo, 0.9, { opacity: 0.7 })];

  // --- Oreja con aro dorado.
  const ear = [
    P(smooth([[-74, -14], [-88, -20], [-102, -6], [-104, 18], [-96, 38], [-82, 44], [-72, 34], [-70, 4]]), K.skin),
    P(smooth([[-84, -4], [-94, -2], [-96, 18], [-88, 30], [-80, 22], [-80, 4]]), K.sombra),
    S(smooth([[-80, -8], [-92, -6], [-96, 10], [-90, 26], [-82, 28]], false), K.hondo, 1.4),
    S(smooth([[-74, -14], [-88, -20], [-102, -6], [-104, 18], [-96, 38], [-82, 44]], false), K.linea, 1.8),
    S(ellipse(-90, 62, 13, 15), K.oroSombra, 5.6),
    S(ellipse(-90, 62, 13, 15), K.oro, 3.8),
    S(smooth([[-98, 50], [-103, 60], [-100, 72]], false), K.oroLuz, 1.6),
  ].join('');
  const neck = P(smooth([[-62, 40], [-70, 220], [30, 230], [52, 130], [46, 90]]), K.sombra);
  const shirt = P(smooth([[-52, 150], [-200, 190], [-290, 330], [270, 330], [200, 200], [64, 150], [26, 214], [-6, 224], [-30, 196]], true, 0.6), K.camiseta) + S(smooth([[-30, 196], [-6, 224], [26, 214], [60, 160]], false), '#08080c', 3);

  // --- Cara.
  const gBase = c.grad('radial', [[0, K.luz], [0.5, K.skin], [1, K.sombra]], { cx: 0.6, cy: 0.38, r: 0.8 });
  const luzBar = c.grad('linear', [[0, '#1c2a52', 0.45], [0.45, '#1c2a52', 0], [0.75, '#ffb464', 0], [1, '#ffb464', 0.3]], { x1: 0, y1: 0, x2: 1, y2: 0 });
  const sombras = [
    P(smooth([[-40, -140], [-58, -70], [-62, 0], [-56, 44], [-34, 90], [0, 130], [30, 150], [-120, 160], [-120, -140]]), K.sombra),
    P(smooth([[-40, -140], [-58, -70], [-62, 0], [-56, 44], [-34, 90], [0, 130], [30, 150], [-120, 160], [-120, -140]]), trama),
    P(ellipse(-12, -8, 50, 28), K.sombra, { opacity: 0.5 }),
    P(ellipse(60, -10, 30, 26), K.sombra, { opacity: 0.4 }),
    P(smooth([[-70, -34], [-20, -42], [26, -40], [30, -20], [-30, -24]]), rayas, { opacity: 0.7 }),
    P(smooth([[-70, 104], [-20, 116], [40, 136], [96, 104], [96, 170], [-70, 170]]), K.hondo, { opacity: 0.55 }),
    P(smooth([[-70, 104], [-20, 116], [40, 136], [96, 104], [96, 170], [-70, 170]]), trama),
    P(smooth([[-100, -110], [100, -110], [96, -52], [72, -70], [44, -84], [10, -88], [-30, -80], [-64, -66], [-100, -40]]), K.sombra),
    // Pómulos y frente con brillo de sudor.
    P(smooth([[40, 14], [74, 8], [84, 30], [56, 40]]), K.luz, { opacity: 0.8 }),
    P(ellipse(60, 20, 10, 5, -0.4), '#fff', { opacity: 0.4 }),
    P(ellipse(30, -76, 24, 6, -0.1), '#fff', { opacity: 0.32 }),
    P(ellipse(-6, 52, 22, 10), K.rubor, { opacity: 0.4 }),
    P(ellipse(74, 40, 12, 9), K.rubor, { opacity: 0.35 }),
  ].join('');
  const poros = puntosEn(rnd, pts, 420).map(([x, y]) => P(ellipse(x, y, 0.4 + rnd() * 0.5, 0.4 + rnd() * 0.4), K.hondo, { opacity: 0.2 + rnd() * 0.25 }));
  const arrugas = [
    S('M-50 -68Q4 -78 58 -64', K.hondo, 0.9, { opacity: 0.4 }),
    S('M-44 -58Q4 -68 54 -54', K.hondo, 0.8, { opacity: 0.35 }),
    S('M52 58Q58 72 42 88', K.hondo, 1.6, { opacity: 0.35 }),
    S('M96 46Q94 60 90 68', K.hondo, 1, { opacity: 0.4 }),
  ];
  // Lunar de la mejilla.
  const lunar = P(ellipse(52, 52, 1.8, 1.8), '#3a1d12');
  const skin = G([P(d, gBase), sombras, ...poros, ...arrugas, lunar, P(d, luzBar)], { 'clip-path': kc });

  // --- Labios grandes y brillantes, con líneas verticales.
  const sup = smooth([[18, 82, 'c'], [34, 73], [46, 78], [58, 71], [74, 75], [86, 73, 'c'], [76, 82], [50, 83], [28, 85]]);
  const inf = smooth([[18, 82, 'c'], [28, 85], [50, 83], [76, 82], [86, 73, 'c'], [78, 98], [50, 110], [28, 100]]);
  const lineasLabio = [];
  for (let i = 0; i < 22; i++) {
    const x = 24 + i * 2.8;
    lineasLabio.push(S(line(x, 86 + (i % 3), x + 0.4, 104 - Math.abs(i - 11) * 0.6 - (i % 4)), K.labioSup, 0.6, { opacity: 0.55 }));
  }
  for (let i = 0; i < 16; i++) {
    const x = 28 + i * 3.4;
    lineasLabio.push(S(line(x, 74 + Math.abs(i - 7) * 0.2, x + 0.3, 82), K.boca, 0.55, { opacity: 0.5 }));
  }
  const boca = [
    P(inf, K.labio),
    G([...lineasLabio, P(smooth([[18, 98], [50, 112], [86, 98], [86, 120], [18, 120]]), K.labioSup, { opacity: 0.4 })], { 'clip-path': c.clip(smooth([[18, 82, 'c'], [28, 85], [50, 83], [76, 82], [86, 73, 'c'], [78, 98], [50, 110], [28, 100]])) }),
    P(sup, K.labioSup),
    G(lineasLabio.slice(22), { 'clip-path': c.clip(sup) }),
    P(smooth([[30, 91], [50, 98], [70, 91], [50, 94]]), '#ffb6c8', { opacity: 0.95 }),
    P(ellipse(52, 94, 14, 2.6), '#fff', { opacity: 0.85 }),
    P(ellipse(40, 77, 7, 2, -0.2), '#ffd0dc', { opacity: 0.85 }),
    P(ellipse(66, 76, 5, 1.6, 0.2), '#ffd0dc', { opacity: 0.7 }),
    S(smooth([[18, 82], [34, 84], [50, 83], [76, 82], [90, 70]], false), K.boca, 2),
    S(smooth([[18, 82, 'c'], [34, 73], [46, 78], [58, 71], [74, 75], [86, 73, 'c']], false), K.boca, 1.2),
    // Brillo duro en la comisura.
    P(ellipse(82, 82, 2.4, 2.4), '#fff', { opacity: 0.8 }),
  ].join('');

  const iris = ['#4a2008', '#b8661e', '#ffc86a'];
  const ojos = ojoB(c, rnd, { cx: -14, cy: 0, w: 68, h: 44, s: 1, K, mirada: 0.14, lashes: 28, largas: 1.25, iris }) + ojoB(c, rnd, { cx: 58, cy: -3, w: 46, h: 42, s: -1, K, mirada: 0.14, lashes: 21, largas: 1.2, iris });
  // Cejas finas y elegantes, una levantada.
  const cejas = cejaB(rnd, K, [12, -58], [-52, -34], 7, 90, 12) + cejaB(rnd, K, [36, -40], [84, -30], 7, 70, 2);
  const sudor = [[-20, -70, 2.2], [20, -86, 2], [54, -66, 2.6]].map(([x, y, r]) => P(ellipse(x, y, r, r * 1.15), '#d8f0ff', { opacity: 0.5 }) + P(ellipse(x - r * 0.3, y - r * 0.4, r * 0.35, r * 0.25), '#fff')).join('');

  return [masa, mono.join(''), goma.join(''), ear, neck, shirt, skin, S(d, K.linea, 2.2), P(capD, K.pelo), S(capD, K.peloSombra, 2), hebras.join(''), ...suelto, narizB(c, rnd, K, 1.05, [88, 40], false), boca, ojos, cejas, sudor].join('');
}

// ------------------------------------------------------------------ escena

function bokeh(rnd) {
  const out = [];
  const cols = ['#ffb347', '#ff6a3d', '#ffd98a', '#7a5cff', '#3dd6c8'];
  for (let i = 0; i < 26; i++) {
    const r = 10 + rnd() * 34;
    out.push(P(ellipse(rnd() * W, rnd() * H, r, r), cols[Math.floor(rnd() * cols.length)], { opacity: 0.1 + rnd() * 0.16 }));
  }
  return out.join('');
}

export function hojaPabloVeroB() {
  const c = ctx();
  const rnd = rng(77);
  const fondo = c.grad('radial', [[0, '#6b3a52'], [0.55, '#3a2046'], [1, '#120a1e']], { cx: 0.72, cy: 0.45, r: 0.8 });
  const puntos = tramaPuntos(c, '#ffb06a', 7, 20, 1.5);
  const viñeta = c.grad('radial', [[0.55, '#000', 0], [1, '#000', 0.65]], { cx: 0.5, cy: 0.5, r: 0.75 });
  const grano = c.id('gr');
  c.def(`<filter id="${grano}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 0.9  0 0 0 0 0.8  0 0 0 0.35 -0.08"/></filter>`);
  const veroSvg = veroB(c, rnd);
  const pabloSvg = pabloB(c, rnd);
  const cuerpo = [
    P(`M0 0H${W}V${H}H0Z`, fondo),
    P(`M0 0H${W}V${H}H0Z`, puntos, { opacity: 0.12 }),
    P(`M0 0H${W}V${H}H0Z`, c.grad('radial', [[0, '#ffb060', 0.55], [1, '#ffb060', 0]], { cx: 0.74, cy: 0.42, r: 0.42 })),
    bokeh(rng(5)),
    // Vero, detrás y más pequeña.
    G(veroSvg, { transform: 'translate(618 200) rotate(4) scale(-1.4 1.4)' }),
    // Sombra de Pablo sobre ella.
    P(`M0 0H${W}V${H}H0Z`, '#000', { opacity: 0.0 }),
    // Pablo, en primer término y cortado por el encuadre.
    G(pabloSvg, { transform: 'translate(232 214) rotate(-5) scale(1.72 1.72)' }),
    P(`M0 0H${W}V${H}H0Z`, viñeta),
    `<rect width="${W}" height="${H}" filter="url(#${grano})" opacity="0.55"/>`,
  ].join('');
  return hoja(c, cuerpo, '#120a1e');
}
