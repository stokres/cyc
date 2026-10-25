// El fondo pintado del mundo de los conceptos (capítulo 2; docs/CAPITULO2.md): un degradado profundo violeta, azul y magenta con
// manchas de luz cálida, cordilleras de cristal, un suelo de escenario y pinceladas con grano, como las referencias. Se pinta UNA
// vez en un lienzo (docs/ESTILO.md T5.7: nada se vuelve a dibujar por fotograma); por fotograma solo se copia. Aparte se hornean
// las nubes de color que se mueven despacio por encima y las motas de luz.
import { resplandor, teselasPintura } from './conceptos-rig';

/** Azar determinista: el mundo es el mismo en cada partida. */
function azar(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const lienzo = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(w));
  c.height = Math.max(2, Math.ceil(h));
  return c;
};

/** Una cordillera de cristal: dientes irregulares que se llenan hasta abajo, con una cara más clara en cada pico. */
function cordillera(x: CanvasRenderingContext2D, vw: number, y0: number, amp: number, paso: number, color: string, luz: string, semilla: number) {
  const r = azar(semilla);
  const pts: [number, number][] = [[-60, 1080]];
  for (let px = -60; px <= vw + 120; px += paso * (0.7 + r() * 0.7)) pts.push([px, y0 - amp * (0.15 + r() * 0.85)]);
  pts.push([vw + 120, 1080]);
  x.fillStyle = color;
  x.beginPath();
  pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
  x.closePath();
  x.fill();
  // La cara que da a la luz de cada pico.
  x.fillStyle = luz;
  for (let i = 1; i < pts.length - 2; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (by < ay) continue;
    x.beginPath();
    x.moveTo(ax, ay);
    x.lineTo(bx, by);
    x.lineTo(ax + (bx - ax) * 0.2, by + (1080 - by) * 0.18);
    x.closePath();
    x.fill();
  }
}

/** El fondo entero a `px` píxeles por unidad de escena, de `vw` unidades de ancho y 1080 de alto. */
export function hornearFondo(vw: number, px: number): HTMLCanvasElement {
  const c = lienzo(vw * px, 1080 * px);
  const x = c.getContext('2d')!;
  x.scale(px, px);
  const r = azar(2026);
  // El degradado profundo.
  const g = x.createLinearGradient(0, 0, 0, 1080);
  g.addColorStop(0, '#0d052e');
  g.addColorStop(0.3, '#210e72');
  g.addColorStop(0.58, '#3a1688');
  g.addColorStop(0.8, '#561f92');
  g.addColorStop(1, '#140a54');
  x.fillStyle = g;
  x.fillRect(0, 0, vw, 1080);
  // Magenta a la izquierda y azul eléctrico a la derecha.
  const h = x.createLinearGradient(0, 0, vw, 0);
  h.addColorStop(0, 'rgba(222,48,148,0.42)');
  h.addColorStop(0.4, 'rgba(120,40,200,0)');
  h.addColorStop(0.68, 'rgba(30,70,220,0)');
  h.addColorStop(1, 'rgba(38,112,255,0.46)');
  x.fillStyle = h;
  x.fillRect(0, 0, vw, 1080);
  // Manchas de luz cálida y fría.
  x.globalCompositeOperation = 'screen';
  const luz = (cx: number, cy: number, rad: number, rgb: string, a: number) => {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, `rgba(${rgb},${a})`);
    rg.addColorStop(0.5, `rgba(${rgb},${a * 0.4})`);
    rg.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = rg;
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  };
  luz(vw * 0.16, 720, 520, '255,122,58', 0.34);
  luz(vw * 0.84, 780, 560, '255,70,168', 0.32);
  luz(vw * 0.5, 430, 720, '106,92,255', 0.22);
  luz(vw * 0.64, 120, 520, '47,213,255', 0.16);
  luz(vw * 0.04, 130, 420, '255,154,90', 0.2);
  luz(vw * 0.5, 1000, 600, '255,196,90', 0.2);
  x.globalCompositeOperation = 'source-over';
  // Las cordilleras de cristal del fondo.
  cordillera(x, vw, 640, 190, 150, 'rgba(70,34,170,0.5)', 'rgba(150,110,255,0.14)', 5);
  cordillera(x, vw, 720, 150, 120, 'rgba(36,40,150,0.55)', 'rgba(120,150,255,0.12)', 9);
  cordillera(x, vw, 800, 110, 100, 'rgba(78,30,130,0.55)', 'rgba(255,140,200,0.12)', 13);
  // El suelo del escenario: más claro cerca del horizonte, con franjas de luz oblicuas.
  const sg = x.createLinearGradient(0, 840, 0, 1080);
  sg.addColorStop(0, 'rgba(255,170,110,0.0)');
  sg.addColorStop(0.18, 'rgba(255,150,120,0.2)');
  sg.addColorStop(0.55, 'rgba(120,44,170,0.55)');
  sg.addColorStop(1, 'rgba(24,10,80,0.8)');
  x.fillStyle = sg;
  x.fillRect(0, 840, vw, 240);
  x.fillStyle = 'rgba(255,230,200,0.05)';
  for (let i = 0; i < 9; i++) {
    const bx = -200 + (vw / 8) * i + r() * 80;
    x.beginPath();
    x.moveTo(bx, 880);
    x.lineTo(bx + 120, 880);
    x.lineTo(bx - 160, 1080);
    x.lineTo(bx - 330, 1080);
    x.closePath();
    x.fill();
  }
  // Zonas hondas, de un azul casi negro, en las esquinas y los bordes: de ahí sale el contraste de las referencias.
  const honda = (cx: number, cy: number, rad: number, a: number) => {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, `rgba(8,4,40,${a})`);
    rg.addColorStop(1, 'rgba(8,4,40,0)');
    x.fillStyle = rg;
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  };
  honda(0, 1080, 760, 0.55);
  honda(vw, 0, 700, 0.5);
  honda(vw * 0.5, -120, 760, 0.45);
  honda(vw, 1080, 600, 0.35);
  // El filo de luz del horizonte.
  const hz = x.createLinearGradient(0, 850, 0, 900);
  hz.addColorStop(0, 'rgba(255,190,140,0)');
  hz.addColorStop(0.5, 'rgba(255,190,140,0.22)');
  hz.addColorStop(1, 'rgba(255,190,140,0)');
  x.fillStyle = hz;
  x.fillRect(0, 850, vw, 50);
  // Pinceladas anchas y suaves por todo el cuadro.
  const paleta = ['255,92,168', '90,120,255', '255,190,90', '60,220,210', '170,110,255', '255,120,70'];
  for (let i = 0; i < 120; i++) {
    const cx = r() * vw;
    const cy = r() * 1080;
    const len = 90 + r() * 360;
    const an = (r() - 0.5) * 2.2;
    const col = paleta[Math.floor(r() * paleta.length)];
    x.save();
    x.translate(cx, cy);
    x.rotate(an);
    const grosor = 10 + r() * 38;
    const lg = x.createLinearGradient(-len / 2, 0, len / 2, 0);
    lg.addColorStop(0, `rgba(${col},0)`);
    lg.addColorStop(0.2, `rgba(${col},${0.03 + r() * 0.045})`);
    lg.addColorStop(0.8, `rgba(${col},${0.03 + r() * 0.045})`);
    lg.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = lg;
    x.beginPath();
    x.ellipse(0, 0, len / 2, grosor / 2, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  // La textura de pintura y el grano, por encima de todo (en píxeles del lienzo, no de la escena).
  const { grano, pincel } = teselasPintura();
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.globalCompositeOperation = 'soft-light';
  x.globalAlpha = 0.5;
  x.fillStyle = x.createPattern(pincel, 'repeat')!;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 0.8;
  x.fillStyle = x.createPattern(grano, 'repeat')!;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** Las nubes de color que se pasean por encima del fondo: una mancha grande y blanda de cada color, con la pincelada encima. */
export function hornearNubes(px: number): { c: HTMLCanvasElement; lado: number }[] {
  const colores = ['#ff7a3a', '#ff3fa4', '#34d6ff', '#7a5cff', '#ffcf3a', '#2fe0b0'];
  return colores.map((col) => {
    const lado = 780 * px * 0.75;
    const c = resplandor(col, lado, 0.9);
    return { c, lado: 780 };
  });
}
