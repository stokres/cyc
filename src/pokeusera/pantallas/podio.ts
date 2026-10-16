// PokéUsera · the podium: the four trainers on their steps with the useritos they used, and
// OTRA (same trainer, new draft) / MENÚ.
import type { EstadoCombate } from '../tipos';
import { ANCHO_ENT2, ALTO_ENT2, entrenador2 } from '../arte2/entrenadores2';
import { anchoTexto2 } from '../arte2/fuente2';
import { TINTA2 } from '../arte2/paleta2';
import { panelCacheado, relleno } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { mvp, pantallaEstadisticas } from './estadisticas';
import { miniatura } from './fondos';
import { Firma, boton, centrado, colorEnt, colorEntClaro, colorEntOsc, fondoPapel, ordinal, parpadea, rect, reposo, t, texto2 } from './ui';

export type SalidaPodio = 'otra' | 'menu';

const ESTRELLA = ['....X....', '....X....', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XXX.XXX.', '.XX...XX.', 'X.......X'];

function estrella(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ESTRELLA.forEach((f, j) => {
    for (let i = 0; i < f.length; i++) {
      if (f[i] !== 'X') continue;
      rect(ctx, '#7a4e0c', x + i - 1 + (i === 0 ? 1 : 0), y + j, 1, 1);
      rect(ctx, '#ffd84a', x + i, y + j, 1, 1);
    }
  });
}

/** `sinBotones`: no OTRA / MENÚ (smoke tests; ESTADÍSTICAS stays). `soloMenu`: only MENÚ and ESTADÍSTICAS (online guests: the host decides on another game). */
export function pantallaPodio(estado: EstadoCombate, miSeat: number | null, sinBotones = false, soloMenu = false): Promise<SalidaPodio> {
  return new Promise((res) => {
    const p = pantalla();
    // Buttons: 0 ESTADÍSTICAS, then OTRA (1) and MENÚ (2); a guest has no OTRA.
    let sel = soloMenu ? 2 : 1;
    let hecho = false;
    const estadisticas = async () => {
      if (hecho) return;
      sonido.efecto('aceptar');
      await pantallaEstadisticas(estado, miSeat);
    };
    const fin = (v: SalidaPodio) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto('aceptar');
      res(v);
    };
    sonido.musica('victoria');
    const porPuesto = estado.jugadores.map((q, j) => ({ q, j })).sort((a, b) => (a.q.puesto || 9) - (b.q.puesto || 9));
    // Left to right on the podium: 2nd, 1st, 3rd, 4th (as many as there are).
    const orden = [porPuesto[1], porPuesto[0], porPuesto[2], porPuesto[3]].filter(Boolean);
    const alturas: Record<number, number> = { 1: 58, 2: 48, 3: 40, 4: 34 };
    const ganador = estado.ganador !== null ? estado.jugadores[estado.ganador] : porPuesto[0].q;
    // What moves: the four trainers breathing, the winner's hop (whole pixels) and the winner's blinking star.
    const firma = new Firma(orden.length + 2);
    const e: Escena = {
      paso: (_dt, ahora) => {
        for (let i = 0; i < orden.length; i++) firma.v[i] = reposo(ahora, i * 170);
        firma.v[orden.length] = Math.round(Math.abs(Math.sin(ahora / 260)) * 4);
        firma.v[orden.length + 1] = parpadea(ahora, 400) ? 1 : 0;
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        const extra = Math.max(0, H - 384);
        fondoPapel(ctx, H);
        const tit = t('podio.gana', { nombre: ganador.nombre });
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 6, tw, 26);
        centrado(ctx, tit, 16);
        const n = orden.length;
        const cw = Math.floor(ANCHO / n);
        // Vertical rhythm: title, trainers on their steps, the teams, the battle in a line, the buttons; equal gaps.
        const hc = 36 + Math.min(10, Math.floor(extra / 12));
        const hEq = 2 * hc + 2;
        const g = Math.max(4, Math.floor((H - 6 - 26 - 144 - hEq - 30 - 62 - 6) / 4));
        const yB = 6 + 26 + g + 144;
        const yEq = yB + g;
        const yl = yEq + hEq + g;
        const ys = yl + 30 + g;
        const yb = ys + 30;
        orden.forEach(({ q, j }, i) => {
          const cx = i * cw + Math.floor(cw / 2);
          const alto = alturas[q.puesto] ?? 24;
          const col = colorEnt(q.entrenador);
          const yTop = yB - alto;
          const x0 = cx - Math.floor(cw / 2) + 1;
          // Trainer on the step (the winner hops a little).
          const salto = q.puesto === 1 ? Math.round(Math.abs(Math.sin(ahora / 260)) * 4) : 0;
          const yCab = yTop - ALTO_ENT2 + 2 - salto;
          ctx.drawImage(entrenador2(q.entrenador, reposo(ahora, i * 170)), cx - Math.floor(ANCHO_ENT2 / 2), yCab);
          // Step.
          relleno(ctx, TINTA2, x0, yTop - 1, cw - 2, alto + 1);
          rect(ctx, colorEntOsc(q.entrenador), x0 + 1, yTop, cw - 4, alto);
          rect(ctx, col, x0 + 1, yTop, cw - 5, alto - 1);
          rect(ctx, colorEntClaro(q.entrenador), x0 + 1, yTop, cw - 5, 2);
          const o = `${q.puesto}.º`;
          texto2(ctx, o, cx - Math.floor(anchoTexto2(o) / 2) - 1, yTop + 6, '#ffffff', colorEntOsc(q.entrenador));
          if (alto >= 34) {
            const nm = q.nombre;
            texto2(ctx, nm, cx - Math.floor(anchoTexto2(nm) / 2) - 1, yTop + 20, '#ffffff', colorEntOsc(q.entrenador));
          }
          if (q.puesto === 1 && parpadea(ahora, 400)) estrella(ctx, cx - 4, yCab - 10);
          if (j === miSeat) {
            // «you»: a little ▼ over the head.
            for (let k = 0; k < 4; k++) rect(ctx, TINTA2, cx - 3 + k, yCab - (q.puesto === 1 ? 24 : 10) + k, 7 - 2 * k, 1);
          }
        });
        porPuesto.forEach(({ q }, i) => {
          const x = 1 + (i % 2) * 119;
          const y = yEq + Math.floor(i / 2) * (hc + 2);
          const col = colorEnt(q.entrenador);
          relleno(ctx, TINTA2, x, y, 119, hc);
          relleno(ctx, '#f4e8c8', x + 1, y + 1, 117, hc - 2);
          rect(ctx, col, x + 2, y + hc - 4, 115, 2);
          ordinal(ctx, q.puesto || 1, x + 3, y + Math.floor((hc - 7) / 2) - 1, TINTA2);
          q.equipo.forEach((u, k) => {
            const caido = u.ps <= 0;
            ctx.save();
            if (caido) ctx.globalAlpha = 0.4;
            ctx.drawImage(miniatura(u.especie), x + 21 + k * 32, y + Math.floor((hc - 4 - 32) / 2) + 1);
            ctx.restore();
          });
        });
        // The battle in a line: how long it lasted and who hit hardest.
        centrado(ctx, t('podio.turnos', { n: Math.max(1, estado.turno - 1) }), yl + 2);
        const m = mvp(estado);
        const linea = m ? t('podio.mvp', { nombre: estado.jugadores[m.j].nombre, n: m.dano }) : t('podio.sin_mvp');
        centrado(ctx, linea, yl + 16, TINTA2);
        // Buttons.
        const bw = 180;
        const bx = Math.floor((ANCHO - bw) / 2);
        boton(ctx, bx, ys, bw, 26, t('podio.stats'), sel === 0);
        entrada.zona(bx, ys, bw, 26, () => void estadisticas());
        if (!sinBotones) {
          if (soloMenu) {
            boton(ctx, Math.floor((ANCHO - 100) / 2), yb, 100, 28, t('podio.menu'), sel === 2);
            entrada.zona(Math.floor((ANCHO - 100) / 2), yb, 100, 28, () => fin('menu'));
          } else {
            const w2 = 100;
            const gap = 10;
            const x1 = Math.floor((ANCHO - 2 * w2 - gap) / 2);
            boton(ctx, x1, yb, w2, 28, t('podio.otra'), sel === 1, true, 'principal');
            boton(ctx, x1 + w2 + gap, yb, w2, 28, t('podio.menu'), sel === 2);
            entrada.zona(x1, yb, w2, 28, () => fin('otra'));
            entrada.zona(x1 + w2 + gap, yb, w2, 28, () => fin('menu'));
          }
        }
      },
      accion(a) {
        if (sinBotones) {
          if (a === 'aceptar') void estadisticas();
          return a === 'aceptar';
        }
        if (a === 'arriba') sel = 0;
        else if (a === 'abajo') sel = soloMenu ? 2 : sel === 0 ? 1 : sel;
        else if (a === 'izq' || a === 'der') {
          if (!soloMenu && sel > 0) sel = sel === 1 ? 2 : 1;
        } else if (a === 'aceptar') {
          if (sel === 0) void estadisticas();
          else fin(sel === 1 ? 'otra' : 'menu');
          return true;
        } else if (a === 'atras') {
          fin('menu');
          return true;
        } else return false;
        sonido.efecto('cursor');
        return true;
      },
    };
    p.poner(e);
  });
}
