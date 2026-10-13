// PokéUsera · the podium: the four trainers on their steps with the useritos they used, and
// OTRA (same trainer, new draft) / MENÚ.
import type { EstadoCombate } from '../tipos';
import { anchoMini, dibujarMini, dibujarTexto } from '../arte/fuente';
import { boton } from './ui';
import { CLARO, FONDO, NEGRO, OSCURO, PAPEL } from '../arte/paleta';
import { entrenador, icono, spriteFrente } from '../arte/sprites';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { mvp, pantallaEstadisticas } from './estadisticas';
import { centrado, colorEnt, dibujaEscalado, ordinal, parpadea, rect, t } from './ui';

export type SalidaPodio = 'otra' | 'menu';

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
    const alturas: Record<number, number> = { 1: 56, 2: 44, 3: 32, 4: 22 };
    const ganador = estado.ganador !== null ? estado.jugadores[estado.ganador] : porPuesto[0].q;
    const e: Escena = {
      paso: () => true,
      dibujar(ctx, ahora) {
        const H = p.alto;
        rect(ctx, FONDO, 0, 0, ANCHO, H);
        centrado(ctx, t('podio.gana', { nombre: ganador.nombre }), 8, NEGRO, { sombra: CLARO });
        const n = orden.length;
        const cw = Math.floor(ANCHO / n);
        const extra = Math.max(0, H - 256);
        const yB = 24 + 40 + 58 + Math.floor(extra * 0.2);
        orden.forEach(({ q, j }, i) => {
          const cx = i * cw + Math.floor(cw / 2);
          const alto = alturas[q.puesto] ?? 20;
          const col = colorEnt(q.entrenador);
          const yTop = yB - alto;
          // Step.
          rect(ctx, NEGRO, cx - Math.floor(cw / 2) + 1, yTop - 1, cw - 2, alto + 1);
          rect(ctx, col, cx - Math.floor(cw / 2) + 2, yTop, cw - 4, alto);
          rect(ctx, 'rgba(255,255,255,0.3)', cx - Math.floor(cw / 2) + 2, yTop, cw - 4, 1);
          ordinal(ctx, q.puesto, cx - 7, yTop + 4, PAPEL);
          const nm = q.nombre.toUpperCase();
          dibujarMini(ctx, nm, cx - Math.floor(anchoMini(nm) / 2), yTop + 15, PAPEL);
          // Trainer on the step.
          dibujaEscalado(ctx, entrenador(q.entrenador), cx - 16, yTop - 41, 32, 40);
          if (q.puesto === 1 && parpadea(ahora, 400)) dibujarTexto(ctx, '★', cx + 8, yTop - 49, '#e6a800');
          if (j === miSeat) rect(ctx, NEGRO, cx - 3, yTop - 44, 6, 2);
        });
        // Bottom up: the buttons, the battle in a line, and the teams in the room that is left.
        const yb = H - 26;
        const ys = yb - 23;
        const yl = ys - 15;
        // The teams, best first.
        const sitio = yl - (yB + 6);
        const paso = Math.max(15, Math.min(26, Math.floor(sitio / porPuesto.length)));
        let y = yB + 6 + Math.floor((sitio - paso * porPuesto.length) / 2);
        for (const { q } of porPuesto) {
          const col = colorEnt(q.entrenador);
          const lado = Math.min(16, paso - 1);
          rect(ctx, col, 4, y, 2, paso - 1);
          ordinal(ctx, q.puesto || 1, 12, y + Math.floor((paso - 9) / 2), NEGRO);
          ctx.drawImage(icono(q.entrenador), 34, y + Math.floor((paso - 9) / 2));
          q.equipo.forEach((u, k) => {
            const caido = u.ps <= 0;
            ctx.save();
            if (caido) ctx.globalAlpha = 0.45;
            dibujaEscalado(ctx, spriteFrente(u.especie), 52 + k * 22, y + Math.floor((paso - 1 - lado) / 2), lado, lado);
            ctx.restore();
          });
          dibujarMini(ctx, q.nombre.toUpperCase(), ANCHO - 42, y + Math.floor((paso - 6) / 2), OSCURO);
          y += paso;
        }
        // The battle in a line: how long it lasted and who hit hardest.
        centrado(ctx, t('podio.turnos', { n: Math.max(1, estado.turno - 1) }), yl - 1, NEGRO);
        const m = mvp(estado);
        const linea = m ? t('podio.mvp', { nombre: estado.jugadores[m.j].nombre, n: m.dano }) : t('podio.sin_mvp');
        dibujarMini(ctx, linea.toUpperCase(), Math.floor((ANCHO - anchoMini(linea)) / 2), yl + 9, OSCURO);
        // Buttons.
        const bw = 118;
        const bx = Math.floor((ANCHO - bw) / 2);
        boton(ctx, bx, ys, bw, 20, t('podio.stats'), sel === 0);
        entrada.zona(bx, ys, bw, 20, () => void estadisticas());
        if (!sinBotones) {
          if (soloMenu) {
            boton(ctx, Math.floor((ANCHO - 66) / 2), yb, 66, 22, t('podio.menu'), sel === 2);
            entrada.zona(Math.floor((ANCHO - 66) / 2), yb, 66, 22, () => fin('menu'));
          } else {
            const w2 = 66;
            const gap = 8;
            const x1 = Math.floor((ANCHO - 2 * w2 - gap) / 2);
            boton(ctx, x1, yb, w2, 22, t('podio.otra'), sel === 1);
            boton(ctx, x1 + w2 + gap, yb, w2, 22, t('podio.menu'), sel === 2);
            entrada.zona(x1, yb, w2, 22, () => fin('otra'));
            entrada.zona(x1 + w2 + gap, yb, w2, 22, () => fin('menu'));
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
