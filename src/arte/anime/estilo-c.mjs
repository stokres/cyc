// Estilo C · Manga en blanco y negro, plano partido en tres franjas.
// Tinta negra, tramas de punto y de raya (screentone), líneas de concentración y onomatopeya.
// Franja 1: los ojos suplicantes de Pablo. Franja 2: Vero, un ojo y los labios. Franja 3: las manos de Pablo.
import { ctx, ellipse, smooth, P, S, G, poly, line, mechon, mechonEje, ceja, estrella, gota, goTrazos, rng, f, hoja, W, H, tramaPuntos, tramaRayas } from './comun.mjs';

const T = '#0b0a0d';
const PAPEL = '#f6f2e6';

// ------------------------------------------------------------------ piezas de tinta

/** Mechón entintado: relleno de trama, contorno, lado en sombra y brillo blanco. */
function mechonTinta(tono, L, sombra = true) {
  const [x, y, tx, ty, w, cu] = L;
  return [
    P(mechon(x, y, tx, ty, w, cu), PAPEL),
    P(mechon(x, y, tx, ty, w, cu), tono),
    sombra ? P(mechon(x - w * 0.18, y, tx - 2, ty, w * 0.46, cu), T) : '',
    S(mechonEje(x, y, tx, ty, cu, 0.25, 0.7), PAPEL, Math.max(1.6, w * 0.07)),
    S(mechon(x, y, tx, ty, w, cu), T, 2.2),
  ].join('');
}

/** Líneas de concentración desde un centro, con un vacío central. */
function concentracion(cx, cy, { n = 130, interior = 150, color = T, seed = 3, grosor = 0.02, R = 900 } = {}) {
  const rnd = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = interior + rnd() * 120;
    const w = grosor * (0.3 + rnd());
    out.push(P(poly([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R], [cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R]]), color));
  }
  return out.join('');
}

/** Ojo manga: iris negro con media trama, reflejos grandes, pestañas gruesas. */
function ojoC(c, { cx, cy, w, h, s, mirada = 0.1, parpado = 0, lagrima = false, estrellas = true, sombra = false, pestanas = 3 }) {
  const ox = cx - s * w / 2;
  const ix = cx + s * w / 2;
  const top = cy - h * 0.5 + parpado * h * 0.35;
  const tA = [cx - s * w * 0.3, top + h * 0.06];
  const tB = [cx + s * w * 0.08, top - h * 0.01];
  const forma = smooth([[ox, cy + h * 0.1, 'c'], tA, tB, [ix, cy + h * 0.08, 'c'], [cx + s * w * 0.25, cy + h * 0.5], [cx - s * w * 0.18, cy + h * 0.52]]);
  const arriba = smooth([[ox, cy + h * 0.1], tA, tB, [ix, cy + h * 0.08]], false);
  const icx = cx + mirada * w;
  const icy = cy + h * 0.04;
  const rx = w * 0.31;
  const ry = h * 0.5;
  const puntosBlancos = tramaPuntos(c, '#fff', 2.4, 45, 0.85);
  const tonoGris = tramaPuntos(c, T, 3, 45, 0.7);
  const k = c.clip(forma);
  const dentro = [
    P(forma, sombra ? tonoGris : '#fff'),
    sombra ? P(forma, tonoGris) : P(`M${f(ox - 10)} ${f(top - 20)}L${f(ix + 10)} ${f(top - 20)}L${f(ix + 10)} ${f(cy - h * 0.1)}Q${f(cx)} ${f(cy - h * 0.2)} ${f(ox - 10)} ${f(cy - h * 0.02)}Z`, tonoGris),
    P(ellipse(icx, icy, rx, ry), T),
    P(ellipse(icx, icy + ry * 0.45, rx * 0.8, ry * 0.5), puntosBlancos),
    P(ellipse(icx, icy + ry * 0.62, rx * 0.5, ry * 0.2), '#fff', { opacity: 0.85 }),
    P(ellipse(icx - rx * 0.36, icy - ry * 0.34, rx * 0.36, ry * 0.28), '#fff'),
    P(ellipse(icx + rx * 0.42, icy + ry * 0.36, rx * 0.16, ry * 0.13), '#fff'),
    estrellas ? P(estrella(icx + rx * 0.3, icy - ry * 0.12, rx * 0.4, 0.2), '#fff') : '',
    lagrima ? P(`M${f(ox - 10)} ${f(cy + h * 0.3)}Q${f(cx)} ${f(cy + h * 0.24)} ${f(ix + 10)} ${f(cy + h * 0.3)}L${f(ix + 10)} ${f(cy + h)}L${f(ox - 10)} ${f(cy + h)}Z`, '#fff', { opacity: 0.55 }) : '',
    lagrima ? S(smooth([[ox + s * w * 0.08, cy + h * 0.34], [cx, cy + h * 0.31], [ix - s * w * 0.1, cy + h * 0.3]], false), '#fff', 2.4) : '',
  ].join('');
  const pest = [];
  for (let i = 0; i < pestanas; i++) {
    const bx = ox + s * w * (0.02 + 0.09 * i);
    const by = cy + h * (0.1 - 0.1 * i);
    pest.push(S(`M${f(bx)} ${f(by)}Q${f(bx - s * w * 0.1)} ${f(by - h * 0.08)} ${f(bx - s * w * 0.15)} ${f(by - h * 0.2 - 3 * i)}`, T, 3.4));
  }
  return [
    G(dentro, { 'clip-path': k }),
    S(arriba, T, 6),
    S(smooth([[ox + s * w * 0.12, tA[1] + h * 0.04], tA, tB], false), T, 10),
    S(`M${f(ox)} ${f(cy + h * 0.1)}Q${f(ox - s * w * 0.09)} ${f(cy - h * 0.02)} ${f(ox - s * w * 0.2)} ${f(cy - h * 0.1)}`, T, 4.6),
    ...pest,
    S(smooth([[ox + s * w * 0.04, top - h * 0.17], [cx - s * w * 0.1, top - h * 0.24], [ix - s * w * 0.1, top - h * 0.12]], false), T, 2),
    S(smooth([[cx - s * w * 0.28, cy + h * 0.5], [cx + s * w * 0.1, cy + h * 0.53], [cx + s * w * 0.3, cy + h * 0.46]], false), T, 2),
  ].join('');
}

// ------------------------------------------------------------------ franja 1: Pablo (ojos)

function pabloOjos(c) {
  const rayas = tramaRayas(c, T, 2.6, 60, 0.75);
  const rayasF = tramaRayas(c, T, 2.0, 35, 0.6);
  const t60 = tramaPuntos(c, T, 3.4, 45, 1.25);
  const t30 = tramaPuntos(c, T, 3.4, 45, 0.8);
  const cuerpo = [
    P('M-200 -112H200V200H-200Z', PAPEL),
    // Sombra del lado de la oreja (rayado cruzado) y bajo las cejas.
    P(smooth([[-52, -110], [-58, -60], [-66, 10], [-56, 60], [-140, 80], [-140, -110]]), rayas),
    P(smooth([[-52, -110], [-58, -60], [-66, 10], [-56, 60], [-140, 80], [-140, -110]]), rayasF, { opacity: 0.6 }),
    P(smooth([[-46, -34], [-20, -48], [26, -46], [30, -22], [-30, -28]]), rayas),
    P(smooth([[34, -42], [60, -50], [90, -38], [90, -22], [40, -24]]), rayas),
    // Puente de la nariz: sombra con trama.
    P(smooth([[26, -8], [36, 18], [44, 44], [54, 56], [40, 54], [26, 36], [18, 8]]), t60),
    S(smooth([[26, -8], [38, 22], [54, 40]], false), T, 2.2),
    // Frente: pelo con flequillo.
    P(smooth([[-100, -160], [120, -160], [120, -60], [96, -56], [80, -84], [56, -104], [24, -112], [-8, -108], [-40, -100], [-70, -86], [-100, -54]]), t60),
    P(smooth([[-100, -160], [120, -160], [120, -110], [60, -118], [0, -122], [-60, -116], [-100, -110]]), T),
    S(smooth([[-70, -122], [-24, -134], [34, -130], [76, -112]], false), PAPEL, 3.4),
  ];
  const locks = [[64, -98, 92, -44, 28, 0.25], [30, -110, 54, -62, 28, -0.2], [-4, -112, 6, -70, 24, 0.1], [-40, -102, -34, -60, 24, 0.15], [-70, -92, -66, -52, 20, 0.2]];
  cuerpo.push(...locks.map((L) => mechonTinta(t60, L)));
  cuerpo.push(S('M50 -100Q92 -90 78 -30', T, 7), S('M50 -100Q92 -90 78 -30', PAPEL, 3.6));
  // Ojos suplicantes.
  cuerpo.push(ojoC(c, { cx: -14, cy: 0, w: 66, h: 60, s: 1, mirada: 0.1, lagrima: true, pestanas: 3 }));
  cuerpo.push(ojoC(c, { cx: 58, cy: -3, w: 46, h: 58, s: -1, mirada: 0.1, lagrima: true, pestanas: 2 }));
  // Cejas: el extremo interior arriba (ruego).
  cuerpo.push(P(ceja(16, -58, -52, -30, 12, 5, 6), T), P(ceja(36, -60, 88, -36, 11, 4, 5), T));
  cuerpo.push(S(smooth([[-40, -66], [-10, -72], [14, -72]], false), T, 1.2, { opacity: 0.7 }), S(smooth([[-34, -74], [-6, -80]], false), T, 1, { opacity: 0.6 }));
  // Rubor con rayitas y barba de punticos.
  for (const dx of [-36, -24, -12]) cuerpo.push(S(line(dx, 36, dx + 9, 52), T, 2));
  for (const dx of [60, 70, 80]) cuerpo.push(S(line(dx, 30, dx + 8, 44), T, 1.8));
  const rnd = rng(31);
  for (let i = 0; i < 60; i++) cuerpo.push(P(ellipse(-60 + rnd() * 80, 52 + rnd() * 30, 0.9, 0.9), T));
  // Gota de sudor con brillo y gotitas.
  cuerpo.push(P(gota(86, -66, 1.3), PAPEL), S(gota(86, -66, 1.3), T, 2.4), P(ellipse(82, -64, 2.6, 5, 0.4), T, { opacity: 0.0 }), P(smooth([[80, -62], [82, -52], [88, -50]]), T, { opacity: 0.0 }));
  cuerpo.push(P(gota(104, -40, 0.7), PAPEL), S(gota(104, -40, 0.7), T, 2));
  return cuerpo.join('');
}

// ------------------------------------------------------------------ franja 2: Vero (ojo y labios)

function veroOjoLabios(c) {
  const t25 = tramaPuntos(c, T, 3.0, 45, 0.8);
  const t55 = tramaPuntos(c, T, 3.0, 45, 1.3);
  const rayas = tramaRayas(c, T, 2.4, 55, 0.7);
  const rest = [];
  rest.push(P('M-100 -200H200V260H-100Z', PAPEL));
  // Piel morena: trama media; la zona del lado de sombra más densa.
  rest.push(P('M-100 -200H200V260H-100Z', t25));
  rest.push(P(smooth([[10, -80], [-6, -20], [-8, 40], [4, 100], [20, 150], [-100, 150], [-100, -80]]), t55));
  // Pómulo con luz (papel) y sombra bajo el pómulo.
  rest.push(P(smooth([[46, 46], [84, 34], [100, 60], [70, 74]]), rayas));
  // Párpado en sombra pesada y ojo.
  rest.push(P(smooth([[26, -36], [60, -54], [100, -40], [100, 10], [30, 8]]), T, { opacity: 0.0 }));
  rest.push(ojoC(c, { cx: 58, cy: -3, w: 52, h: 46, s: -1, mirada: 0.16, parpado: 0.5, estrellas: false, sombra: false, pestanas: 2 }));
  rest.push(P(ceja(36, -40, 88, -34, 12, 5, 2), T));
  rest.push(P(ceja(98, -44, 70, -60, 5, 9, 4), T, { opacity: 0.0 }));
  // Nariz.
  rest.push(S(smooth([[66, 38], [82, 40], [90, 48], [88, 58], [78, 62]], false), T, 2.6));
  rest.push(P(ellipse(76, 56, 5.5, 3.4), T), S(smooth([[40, 20], [46, 40], [60, 54]], false), T, 1.8, { opacity: 0.7 }));
  rest.push(P(ellipse(80, 42, 3, 2), PAPEL));
  // Labios: tinta casi sólida con brillos blancos.
  const sup = smooth([[18, 82, 'c'], [34, 73], [46, 78], [58, 71], [74, 75], [86, 73, 'c'], [76, 82], [50, 83], [28, 85]]);
  const inf = smooth([[18, 82, 'c'], [28, 85], [50, 83], [76, 82], [86, 73, 'c'], [78, 98], [50, 110], [28, 100]]);
  rest.push(P(inf, T), P(sup, T));
  rest.push(P(smooth([[30, 92], [50, 100], [70, 92], [50, 95]]), '#fff'), P(ellipse(52, 96, 14, 2.4), '#fff'), P(ellipse(40, 77, 7, 1.8, -0.2), '#fff'), P(ellipse(66, 76, 5, 1.5, 0.2), '#fff'));
  rest.push(S(smooth([[18, 82], [34, 84], [50, 83], [76, 82], [90, 70]], false), PAPEL, 1.2), S(smooth([[18, 84], [34, 86], [50, 85], [76, 84]], false), T, 0.01));
  // Líneas de la comisura y barbilla.
  rest.push(S(smooth([[94, 62], [100, 76], [94, 90]], false), T, 2.2));
  rest.push(S(smooth([[30, 118], [50, 124], [72, 118]], false), T, 1.6, { opacity: 0.8 }));
  // Hebra suelta sobre la mejilla y gota fría.
  return rest.join('');
}

// ------------------------------------------------------------------ franja 3: manos suplicantes

function manos(c) {
  const t40 = tramaPuntos(c, T, 3.0, 45, 1.1);
  const t20 = tramaPuntos(c, T, 3.2, 45, 0.7);
  const o = [];
  // Mangas de la chaqueta oscura con puño de borreguillo.
  o.push(P(smooth([[-190, 270], [-110, 150], [-58, 128], [-50, 270]]), T));
  o.push(P(smooth([[190, 270], [110, 150], [58, 128], [50, 270]]), T));
  o.push(P(poly([[-60, 140], [60, 140], [70, 270], [-70, 270]]), T));
  const puno = (x, y, r) => [0, 1, 2, 3, 4, 5, 6].map((i) => P(ellipse(x + (i - 3) * r * 0.95, y + (i % 2) * 2, r, r * 0.8), PAPEL) + S(ellipse(x + (i - 3) * r * 0.95, y + (i % 2) * 2, r, r * 0.8), T, 2)).join('');
  o.push(puno(0, 136, 17));

  const dedo = (x, top, w = 24) => `M${x - w / 2} 6V${top + w / 2}Q${x - w / 2} ${top} ${x} ${top}Q${x + w / 2} ${top} ${x + w / 2} ${top + w / 2}V6Z`;
  const mano = (dx, dy, lejana) => {
    const g = [];
    const dedos = [[-37, -106], [-13, -126], [13, -114], [37, -80]];
    const palma = smooth([[-50, 0, 'c'], [50, 0, 'c'], [48, 60], [40, 110], [32, 140], [-32, 140], [-44, 110], [-50, 60]]);
    g.push(P(palma, PAPEL));
    dedos.forEach(([x, top]) => g.push(P(dedo(x, top), PAPEL)));
    // Lado en sombra y nudillos.
    g.push(P(palma, lejana ? t40 : t20, { opacity: lejana ? 1 : 0.6 }));
    dedos.forEach(([x, top]) => {
      g.push(P(`M${x + 3} ${top + 10}H${x + 12}V6H${x + 3}Z`, t40, { opacity: lejana ? 0 : 1 }));
      g.push(S(smooth([[x - 8, -42], [x, -38], [x + 8, -42]], false), T, 1.6));
      g.push(S(smooth([[x - 8, -78 + (top + 106) * 0.2], [x, -74 + (top + 106) * 0.2], [x + 8, -78 + (top + 106) * 0.2]], false), T, 1.4));
      g.push(P(`M${x - 6} ${top + 22}Q${x - 6} ${top + 8} ${x} ${top + 8}Q${x + 6} ${top + 8} ${x + 6} ${top + 22}Q${x} ${top + 26} ${x - 6} ${top + 22}Z`, '#fff'), S(`M${x - 6} ${top + 22}Q${x - 6} ${top + 8} ${x} ${top + 8}Q${x + 6} ${top + 8} ${x + 6} ${top + 22}Q${x} ${top + 26} ${x - 6} ${top + 22}Z`, T, 1.6));
    });
    // Líneas entre dedos y contorno.
    [-25, 0, 25].forEach((x, i) => g.push(S(line(x, 6, x, [-102, -110, -96][i]), T, 2.2)));
    dedos.forEach(([x, top]) => g.push(S(dedo(x, top), T, 2.8)));
    g.push(S(smooth([[-50, 0], [-48, 60], [-44, 110], [-32, 140]], false), T, 2.8), S(smooth([[50, 0], [48, 60], [40, 110], [32, 140]], false), T, 2.8));
    g.push(S(line(-50, 0, 50, 0), T, 0.01));
    return G(g, { transform: `translate(${dx} ${dy})` });
  };
  o.push(mano(16, -16, true));
  o.push(mano(0, 0, false));
  // Pulgar de la mano cercana, a la izquierda.
  const pulgar = smooth([[-46, 96], [-64, 62], [-80, 18], [-84, -22], [-72, -34], [-58, -20], [-48, 14], [-34, 52]]);
  o.push(P(pulgar, PAPEL), P(smooth([[-58, -20], [-48, 14], [-34, 52], [-46, 96], [-56, 70], [-62, 30]]), t20), S(pulgar, T, 2.8));
  o.push(P(smooth([[-82, -20], [-80, -32], [-70, -34], [-62, -22], [-72, -14]]), '#fff'), S(smooth([[-82, -20], [-80, -32], [-70, -34], [-62, -22], [-72, -14]]), T, 1.6));
  o.push(S(smooth([[-76, 20], [-64, 14], [-54, 22]], false), T, 1.5));
  // Brillo de nervio en el dorso.
  o.push(S(smooth([[-20, 60], [-14, 90], [-18, 120]], false), T, 1.2, { opacity: 0.6 }), S(smooth([[10, 54], [14, 86], [8, 116]], false), T, 1.2, { opacity: 0.6 }));
  return o.join('');
}

// ------------------------------------------------------------------ hoja

export function hojaPabloVeroC() {
  const c = ctx();
  const m = 8;
  // Contornos de las tres franjas, con las separaciones inclinadas.
  const p1 = [[m, m], [398, m], [374, H - m], [m, H - m]];
  const p2 = [[410, m], [628, m], [606, H - m], [386, H - m]];
  const p3 = [[640, m], [W - m, m], [W - m, H - m], [618, H - m]];
  const clipDe = (pts) => c.clip(poly(pts));
  const t20 = tramaPuntos(c, T, 5, 45, 1.1);
  const t40 = tramaPuntos(c, T, 4, 45, 1.5);

  const f1 = [
    P(poly(p1), PAPEL),
    P(poly(p1), t20, { opacity: 0.5 }),
    concentracion(214, 190, { interior: 190, seed: 2 }),
    // Estrellitas de súplica.
    ...[[56, 70, 20], [340, 300, 18], [64, 320, 14], [330, 60, 12]].map(([x, y, r]) => P(estrella(x, y, r, 0.2), PAPEL) + S(estrella(x, y, r, 0.2), T, 2)),
    G(pabloOjos(c), { transform: 'translate(214 256) rotate(-3) scale(2.0)' }),
  ].join('');

  const f2 = [
    P(poly(p2), T),
    concentracion(520, 220, { interior: 90, color: '#fff', seed: 9, grosor: 0.012, n: 90 }),
    P(poly(p2), t40, { opacity: 0.25 }),
    G(veroOjoLabios(c), { transform: 'translate(508 168) rotate(2) scale(-1.95 1.95) translate(-52 -30)' }),
  ].join('');

  const f3 = [
    P(poly(p3), PAPEL),
    P(poly(p3), t20, { opacity: 0.7 }),
    // Líneas verticales de temblor.
    ...Array.from({ length: 22 }, (_, i) => S(line(660 + i * 8.5 + (i % 3) * 2, m, 660 + i * 8.5 + (i % 3) * 2 - 14, 120 + (i % 5) * 18), T, 1 + (i % 3) * 0.4, { opacity: 0.7 })),
    G(manos(c), { transform: 'translate(742 214) rotate(5) scale(1.08)' }),
    // Gotas.
    P(gota(660, 90, 1), PAPEL), S(gota(660, 90, 1), T, 2.2), P(gota(820, 120, 0.8), PAPEL), S(gota(820, 120, 0.8), T, 2),
  ].join('');

  const onoma = [
    // «ゴゴゴ»: blanco con borde negro, encima del corte entre franjas.
    G([goTrazos(668, 40, 0.62, '#fff', T, 3.5), goTrazos(664, 96, 0.62, '#fff', T, 3.5), goTrazos(660, 152, 0.62, '#fff', T, 3.5)], { transform: 'rotate(-2 680 100)' }),
    G([goTrazos(582, 250, 0.62, '#fff', T, 3.5), goTrazos(576, 306, 0.62, '#fff', T, 3.5)], { transform: 'rotate(2 600 300)' }),
  ].join('');

  const cuerpo = [
    P(`M0 0H${W}V${H}H0Z`, PAPEL),
    G(f1, { 'clip-path': clipDe(p1) }),
    G(f2, { 'clip-path': clipDe(p2) }),
    G(f3, { 'clip-path': clipDe(p3) }),
    S(poly(p1), T, 3.2), S(poly(p2), T, 3.2), S(poly(p3), T, 3.2),
    onoma,
  ].join('');
  return hoja(c, cuerpo, PAPEL);
}
