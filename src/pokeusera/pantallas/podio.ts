// PokéUsera · the podium: the four trainers on their steps with the useritos they used, and
// OTRA (same trainer, new draft) / MENÚ.
import type { EstadoCombate } from '../tipos';
import { anchoMini, dibujarMini, dibujarTexto } from '../arte/fuente';
import { boton } from './ui';
import { CLARO, FONDO, NEGRO, OSCURO, PAPEL } from '../arte/paleta';
import { entrenador, icono, spriteFrente } from '../arte/sprites';
import { entrada } from '../entrada';
import { pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { centrado, colorEnt, dibujaEscalado, ordinal, parpadea, rect, t } from './ui';

export type SalidaPodio = 'otra' | 'menu';

/** `sinBotones`: no buttons at all (smoke tests). `soloMenu`: only MENÚ (online guests: the host decides on another game). */
export function pantallaPodio(estado: EstadoCombate, miSeat: number | null, sinBotones = false, soloMenu = false): Promise<SalidaPodio> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = 0;
    let hecho = false;
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
        rect(ctx, FONDO, 0, 0, 160, H);
        centrado(ctx, t('podio.gana', { nombre: ganador.nombre }), 8, NEGRO, { sombra: CLARO });
        const n = orden.length;
        const cw = Math.floor(160 / n);
        const yB = 24 + 40 + 58 + Math.floor(Math.max(0, H - 256) * 0.25);
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
        // The teams, best first.
        const paso = 20 + Math.floor(Math.max(0, H - 256) / 14);
        let y = yB + 8 + Math.floor((paso - 20) / 2);
        for (const { q } of porPuesto) {
          const col = colorEnt(q.entrenador);
          rect(ctx, col, 4, y, 2, 18);
          ordinal(ctx, q.puesto || 1, 12, y + 5, NEGRO);
          ctx.drawImage(icono(q.entrenador), 34, y + 5);
          q.equipo.forEach((u, k) => {
            const caido = u.ps <= 0;
            ctx.save();
            if (caido) ctx.globalAlpha = 0.45;
            dibujaEscalado(ctx, spriteFrente(u.especie), 52 + k * 22, y + 1, 16, 16);
            ctx.restore();
          });
          dibujarMini(ctx, q.nombre.toUpperCase(), 118, y + 7, OSCURO);
          y += paso;
        }
        if (!sinBotones) {
          const yb = H - 30;
          if (soloMenu) {
            boton(ctx, 47, yb, 66, 22, t('podio.menu'), true);
            entrada.zona(47, yb, 66, 22, () => fin('menu'));
          } else {
            boton(ctx, 10, yb, 66, 22, t('podio.otra'), sel === 0);
            boton(ctx, 84, yb, 66, 22, t('podio.menu'), sel === 1);
            entrada.zona(10, yb, 66, 22, () => fin('otra'));
            entrada.zona(84, yb, 66, 22, () => fin('menu'));
          }
        }
      },
      accion(a) {
        if (sinBotones) return false;
        if (soloMenu) {
          if (a === 'aceptar' || a === 'atras') fin('menu');
        } else if (a === 'izq' || a === 'der' || a === 'arriba' || a === 'abajo') {
          sel = 1 - sel;
          sonido.efecto('cursor');
        } else if (a === 'aceptar') fin(sel === 0 ? 'otra' : 'menu');
        else if (a === 'atras') fin('menu');
        return true;
      },
    };
    p.poner(e);
  });
}
