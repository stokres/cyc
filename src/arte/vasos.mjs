// Las bebidas de los cuatro en el bar (capítulo 2): la caña y el gin tonic («fresquito»), en SVG, con varios
// niveles. Son piezas pequeñas que se pasan a imagen una vez (src/motor/vasos.ts) y se pegan a la mano del
// personaje; aquí solo se dibujan. Coordenadas propias: el origen está en el puño que sujeta el vaso
// (el centro de la palma), el eje y crece hacia abajo y el vaso está derecho.
//
// Estilo (docs/ESTILO.md): sin contornos negros, línea fina en un tono oscuro del propio color, 2–3 tonos por
// material y nada de brillos pintados salvo el reflejo del cristal, que es lo que lo hace leerse como vaso.

const f = (v) => +v.toFixed(2);

/** Niveles que se dibujan: 0 (vacío) a NIVELES (lleno). */
export const NIVELES = 6;

const CRISTAL = { borde: '#9cc3cf', relleno: '#d9eef5', brillo: '#ffffff', fondo: '#b7d7e0' };
const CERVEZA = { base: '#e8a21b', sombra: '#c47a0a', luz: '#f8cd4e', linea: '#9a5a08' };
const ESPUMA = { base: '#fff4d8', sombra: '#ecd9a6', linea: '#cdb27a' };

// ---------------------------------------------------------------- la caña

// Vaso de caña: un poco cónico, de base gruesa. Alto de -27 a 13 (40 unidades), 21 de ancho arriba y 15 abajo.
const C = { top: -27, bot: 13, wTop: 10.8, wBot: 7.6, grosor: 1.6, base: 3.6 };
/** Mitad del ancho exterior a la altura y. */
const wCana = (y) => C.wTop - ((C.wTop - C.wBot) * (y - C.top)) / (C.bot - C.top);
/** Mitad del ancho interior a la altura y. */
const wiCana = (y) => wCana(y) - C.grosor;
const fondoCana = C.bot - C.base;

/** Un tramo del interior del vaso entre dos alturas (y0 más arriba), como camino. */
function tramoCana(y0, y1, abomba = 0) {
  const a = wiCana(y0);
  const b = wiCana(y1);
  // Desde la esquina inferior izquierda, por abajo, subiendo por la derecha y cerrando por arriba.
  const arriba = abomba ? `Q0 ${f(y0 - abomba * 2)} ${f(-a)} ${f(y0)}` : `L${f(-a)} ${f(y0)}`;
  return `M${f(-b)} ${f(y1)}L${f(b)} ${f(y1)}L${f(a)} ${f(y0)}${arriba}Z`;
}

/**
 * La caña con `nivel` (0 a NIVELES) de cerveza: espuma sobre la cerveza, que sube por encima del borde con el vaso
 * lleno; vacía, solo quedan las trazas de espuma en las paredes y un fondo de cerveza.
 */
export function cana(nivel) {
  const n = Math.max(0, Math.min(NIVELES, Math.round(nivel)));
  const k = n / NIVELES;
  const lleno = n === NIVELES;
  // Altura del líquido (cerveza sola); la espuma va encima.
  const yCerveza = fondoCana - 31 * k;
  const espesorEspuma = n === 0 ? 0 : lleno ? 6 : 5;
  const yEspuma = yCerveza - espesorEspuma;
  const p = [];
  // Cuerpo del vaso: cristal casi transparente.
  const exterior = `M${f(-C.wTop)} ${C.top}L${f(C.wTop)} ${C.top}L${f(C.wBot + 0.3)} ${C.bot - 2}Q${f(C.wBot)} ${C.bot} ${f(C.wBot - 2)} ${C.bot}L${f(-C.wBot + 2)} ${C.bot}Q${f(-C.wBot)} ${C.bot} ${f(-C.wBot - 0.3)} ${C.bot - 2}Z`;
  p.push(`<path d="${exterior}" fill="${CRISTAL.relleno}" fill-opacity="0.34"/>`);
  // Fondo grueso del vaso.
  p.push(`<path d="M${f(-wCana(fondoCana))} ${f(fondoCana)}L${f(wCana(fondoCana))} ${f(fondoCana)}L${f(C.wBot + 0.3)} ${C.bot - 2}Q${f(C.wBot)} ${C.bot} ${f(C.wBot - 2)} ${C.bot}L${f(-C.wBot + 2)} ${C.bot}Q${f(-C.wBot)} ${C.bot} ${f(-C.wBot - 0.3)} ${C.bot - 2}Z" fill="${CRISTAL.fondo}" fill-opacity="0.7"/>`);
  if (n > 0) {
    // La cerveza (de la base del vaso hasta su nivel).
    p.push(`<path d="${tramoCana(yCerveza, fondoCana)}" fill="${CERVEZA.base}"/>`);
    // Sombra a la derecha y una franja de luz a la izquierda.
    p.push(`<path d="M${f(wiCana(fondoCana) - 3.2)} ${f(fondoCana)}L${f(wiCana(fondoCana))} ${f(fondoCana)}L${f(wiCana(yCerveza))} ${f(yCerveza)}L${f(wiCana(yCerveza) - 3.6)} ${f(yCerveza)}Z" fill="${CERVEZA.sombra}" opacity="0.8"/>`);
    p.push(`<path d="M${f(-wiCana(yCerveza) + 1.4)} ${f(yCerveza + 2)}L${f(-wiCana(yCerveza) + 3.4)} ${f(yCerveza + 2)}L${f(-wiCana(fondoCana) + 3.4)} ${f(fondoCana - 2)}L${f(-wiCana(fondoCana) + 1.4)} ${f(fondoCana - 2)}Z" fill="${CERVEZA.luz}" opacity="0.85"/>`);
    // Burbujas que suben.
    for (const [bx, bf] of [[-2.5, 0.78], [2.2, 0.5], [-0.5, 0.28]]) {
      const by = yCerveza + (fondoCana - yCerveza) * bf;
      if (fondoCana - yCerveza > 5) p.push(`<circle cx="${bx}" cy="${f(by)}" r="0.9" fill="${CERVEZA.luz}" opacity="0.9"/>`);
    }
    // Espuma: casquete blanco sobre la cerveza, con su curva y unas burbujas.
    const a = wiCana(yEspuma);
    const domo = lleno ? 4.2 : 1.2;
    p.push(`<path d="${tramoCana(yEspuma, yCerveza + 0.4, domo)}" fill="${ESPUMA.base}"/>`);
    p.push(`<path d="M${f(a * 0.25)} ${f(yEspuma + 1.5)}L${f(wiCana(yCerveza))} ${f(yCerveza + 0.4)}L${f(a)} ${f(yEspuma)}Z" fill="${ESPUMA.sombra}" opacity="0.8"/>`);
    p.push(`<path d="M${f(-wiCana(yCerveza) + 0.2)} ${f(yCerveza - 0.4)}Q0 ${f(yCerveza + 1.6)} ${f(wiCana(yCerveza) - 0.2)} ${f(yCerveza - 0.4)}" fill="none" stroke="${ESPUMA.linea}" stroke-width="0.9" stroke-linecap="round"/>`);
    for (const [bx, by] of [[-4, 0.4], [1.2, -0.4], [4.4, 0.8]]) p.push(`<circle cx="${bx}" cy="${f(yEspuma + 2.2 + by)}" r="1.1" fill="#ffffff" opacity="0.9"/>`);
  } else {
    // Vaso vacío: un dedo de cerveza al fondo y trazas de espuma en las paredes.
    const yFondo = fondoCana - 1.6;
    p.push(`<path d="${tramoCana(yFondo, fondoCana)}" fill="${CERVEZA.base}" opacity="0.9"/>`);
    p.push(`<path d="M${f(-wiCana(-12))} -12Q${f(-wiCana(-12) + 2.6)} -8 ${f(-wiCana(-8) + 1)} -5" fill="none" stroke="${ESPUMA.base}" stroke-width="1.6" stroke-linecap="round" opacity="0.95"/>`);
    p.push(`<path d="M${f(wiCana(-16))} -16Q${f(wiCana(-16) - 1.6)} -10 ${f(wiCana(-10) - 0.4)} -8" fill="none" stroke="${ESPUMA.base}" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>`);
    p.push(`<circle cx="-1.5" cy="${f(fondoCana - 3.2)}" r="1.5" fill="${ESPUMA.base}"/>`);
  }
  // Reflejo del cristal y línea fina del borde (no es un contorno negro: un tono del propio cristal).
  p.push(`<path d="M${f(-C.wTop + 2.2)} ${C.top + 3}L${f(-C.wBot + 1.8)} ${C.bot - 5}" fill="none" stroke="${CRISTAL.brillo}" stroke-width="1.7" stroke-linecap="round" opacity="0.7"/>`);
  p.push(`<path d="${exterior}" fill="none" stroke="${CRISTAL.borde}" stroke-width="1.1" stroke-linejoin="round" opacity="0.9"/>`);
  // El borde de arriba, algo más claro.
  p.push(`<path d="M${f(-C.wTop)} ${C.top}L${f(C.wTop)} ${C.top}" stroke="${CRISTAL.brillo}" stroke-width="1.3" stroke-linecap="round" opacity="0.85"/>`);
  return p.join('');
}

// ---------------------------------------------------------------- el gin tonic

// Copa balón: cuenco redondo, tallo corto y pie. El origen está en el tallo, que es donde se agarra.
const B = { cy: -17, rx: 14, ry: 13.5, rim: 0.8 };

/** Contorno del cuenco (la mitad más ancha por arriba, más cerrado hacia el tallo) como lista de puntos. */
function cuenco(encoge = 0) {
  const pts = [];
  // Del borde izquierdo, bajando por la panza, hasta el tallo, y subiendo por la derecha.
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI; // 0 (arriba, izquierda) a PI (arriba, derecha) pasando por abajo
    const x = -Math.cos(t) * (B.rx - encoge);
    const y = B.cy - B.ry * 0.72 + Math.sin(t) * (B.ry * 1.72 - encoge * 0.4);
    // Más cerrado cerca del borde de arriba.
    const cierre = 1 - 0.16 * Math.pow(1 - Math.sin(t), 1.4);
    pts.push([x * cierre, y]);
  }
  return pts;
}

const lineaCuenco = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');

/**
 * El gin tonic con `nivel` (0 a NIVELES): tonic claro con burbujas, hielos que flotan, una rodaja de limón en el
 * borde y una pajita; vacío, solo quedan un hielo medio derretido y la rodaja.
 */
export function gin(nivel) {
  const n = Math.max(0, Math.min(NIVELES, Math.round(nivel)));
  const k = n / NIVELES;
  const p = [];
  const fuera = cuenco(0);
  const dentro = cuenco(1.5);
  const yBorde = fuera[0][1];
  const yFondo = fuera[Math.floor(fuera.length / 2)][1];
  const yLiquido = yFondo - 2 - (yFondo - yBorde - 5) * k;
  const idClip = `gin-clip-${n}`;
  // Pie y tallo: cristal.
  p.push(`<path d="M-1.9 ${f(yFondo - 1)}L-1.3 12.4L1.3 12.4L1.9 ${f(yFondo - 1)}Z" fill="${CRISTAL.relleno}" fill-opacity="0.55" stroke="${CRISTAL.borde}" stroke-width="0.9" stroke-linejoin="round"/>`);
  p.push(`<ellipse cx="0" cy="13.4" rx="9" ry="2.3" fill="${CRISTAL.relleno}" fill-opacity="0.5" stroke="${CRISTAL.borde}" stroke-width="1"/>`);
  // Cuenco: cristal.
  p.push(`<path d="${lineaCuenco(fuera)}Z" fill="${CRISTAL.relleno}" fill-opacity="0.3"/>`);
  p.push(`<clipPath id="${idClip}"><path d="${lineaCuenco(dentro)}Z"/></clipPath>`);
  if (n > 0) {
    const L = [];
    // Tonic: un verde azulado muy claro, con la sombra a la derecha y la luz arriba a la izquierda.
    L.push(`<rect x="-20" y="${f(yLiquido)}" width="40" height="${f(yFondo - yLiquido + 3)}" fill="#bfe9de"/>`);
    L.push(`<ellipse cx="9" cy="${f(yFondo - 4)}" rx="7" ry="${f(Math.max(4, yFondo - yLiquido))}" fill="#86c9bb" opacity="0.7"/>`);
    L.push(`<rect x="-20" y="${f(yLiquido)}" width="40" height="1.8" fill="#eafaf5"/>`);
    // Hielos: cubos claros que asoman, con un reflejo.
    const hielos = n >= 3 ? [[-6.5, 0.6, -14], [2.6, -0.5, 9], [7.2, 1.7, -4]] : n >= 2 ? [[-4, 0.8, -12], [4.2, 0.2, 8]] : n === 1 ? [[0.5, 0.9, 6]] : [];
    for (const [hx, dy, giro] of hielos) {
      const y = yLiquido + 1 + dy;
      L.push(`<g transform="translate(${hx} ${f(y)}) rotate(${giro})"><rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx="1.5" fill="#f1fbff" fill-opacity="0.88" stroke="#a5d3e0" stroke-width="0.8"/><path d="M-3 -2.4L-0.8 -2.4M-3 -2.4L-3 -0.2" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round"/></g>`);
    }
    // Burbujitas.
    for (const [bx, bf] of [[-8, 0.7], [-1, 0.5], [8.5, 0.62], [3, 0.82], [-5, 0.3]]) {
      const by = yLiquido + (yFondo - yLiquido) * bf;
      if (by < yFondo - 2) L.push(`<circle cx="${bx}" cy="${f(by)}" r="0.9" fill="#ffffff" opacity="0.8"/>`);
    }
    // Una pajita doblada (solo con bastante líquido).
    if (n >= 2) L.push(`<path d="M6 ${f(yFondo - 3)}L9.5 ${f(yBorde - 9)}" stroke="#e8505a" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`);
    p.push(`<g clip-path="url(#${idClip})">${L.join('')}</g>`);
  } else {
    // Vacío: un hielo medio derretido y una gota.
    p.push(`<g clip-path="url(#${idClip})"><g transform="translate(-2 ${f(yFondo - 3.2)}) rotate(-8)"><rect x="-3.6" y="-2.6" width="7.2" height="5.2" rx="1.6" fill="#f1fbff" fill-opacity="0.85" stroke="#a5d3e0" stroke-width="0.8"/></g><ellipse cx="4" cy="${f(yFondo - 1.4)}" rx="4.2" ry="1.1" fill="#bfe9de" opacity="0.9"/></g>`);
  }
  // Rodaja de limón en el borde: rueda con gajos y un corte para que se sujete.
  const lx = 8.5;
  const ly = yBorde - 1.5;
  const gajos = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2;
    return `<path d="M0 0L${f(Math.cos(a) * 5.6)} ${f(Math.sin(a) * 5.6)}" stroke="#f4eaa0" stroke-width="0.9" opacity="0.9"/>`;
  });
  p.push(`<g transform="translate(${lx} ${f(ly)}) rotate(-22) scale(1 0.74)"><circle r="7" fill="#e8c52a" stroke="#b9961a" stroke-width="0.9"/><circle r="5.6" fill="#f8e46e"/>${gajos.join('')}<circle r="1" fill="#f4eaa0"/></g>`);
  // Reflejo y borde del cuenco.
  p.push(`<path d="M${f(-B.rx + 3.4)} ${f(B.cy - 6)}Q${f(-B.rx + 3.6)} ${f(B.cy + 5)} ${f(-6.2)} ${f(B.cy + 11)}" fill="none" stroke="${CRISTAL.brillo}" stroke-width="1.7" stroke-linecap="round" opacity="0.75"/>`);
  p.push(`<path d="${lineaCuenco(fuera)}Z" fill="none" stroke="${CRISTAL.borde}" stroke-width="1.1" stroke-linejoin="round" opacity="0.95"/>`);
  return p.join('');
}

// ---------------------------------------------------------------- los dedos

/**
 * Los dedos que rodean el vaso, por delante: cuatro tiras de piel apiladas (el índice arriba), del color de la
 * mano de quien lo sujeta. `tipo`: 'cana' o 'gin' (en la copa solo agarran el tallo, más estrecho).
 */
export function dedos(tipo, piel, sombra, linea) {
  const ancho = tipo === 'gin' ? 6.8 : 15;
  const ys = tipo === 'gin' ? [-1.6, 2.4, 6.4] : [0.6, 5.2, 9.8];
  const hecho = ys.map((y, i) => {
    const w = ancho - (tipo === 'gin' ? 0 : i === 2 ? 2.4 : 0);
    const x = tipo === 'gin' ? -w / 2 : -w / 2 - 0.6;
    return `<rect x="${f(x)}" y="${f(y - 2)}" width="${f(w)}" height="4.2" rx="2.1" fill="${piel}" stroke="${linea}" stroke-width="0.9"/><path d="M${f(x + 1.4)} ${f(y + 1.1)}L${f(x + w - 1.4)} ${f(y + 1.1)}" stroke="${sombra}" stroke-width="0.9" stroke-linecap="round" opacity="0.8"/>`;
  });
  // El pulgar asoma por el lado de atrás del vaso.
  const pulgar = tipo === 'gin' ? '' : `<rect x="${f(-ancho / 2 - 3.6)}" y="-3" width="6" height="3.8" rx="1.9" fill="${sombra}" stroke="${linea}" stroke-width="0.8" transform="rotate(-18 ${f(-ancho / 2)} -1)"/>`;
  return pulgar + hecho.join('');
}
