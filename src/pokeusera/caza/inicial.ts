// PokéUsera · AVENTURA: «ELIGE TU PRIMER USERITO». The three starters in cards (front sprite breathing, name, type chips, description).
// Tap one to mark it (tap it again or ELEGIR to take it); VOLVER gives back null.
//
// Performance (docs/ESTILO.md, T5): each card's text is baked once; per frame there are the three panels, three beer mats, three
// breathing sprites and the buttons. The screen is `estatica`: it redraws only when a sprite changes frame (`Firma`) or on input.
import type { EntrenadorId } from '../tipos';
import { ESPECIE } from '../datos';
import { ORO_UI, TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { anchoTexto2 } from '../arte2/fuente2';
import { spriteFrente2 } from '../arte2/sprites2';
import { hornear, panel, panelCacheado } from '../arte2/ui2';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { dibujarFondoBar, plataformaCacheada } from '../pantallas/fondos';
import { Firma, boton, centrado, chipTipo, envolver, rect, reposo, t, texto2 } from '../pantallas/ui';
import { INICIALES } from './modelo';

const X0 = 8;
const AN = ANCHO - 16;
const TEXTO_X = 78;
const ANCHO_DESC = AN - TEXTO_X - 8;

/** One starter's card without the sprite: panel, name, type chips and the wrapped description. */
function carta(id: string, h: number): HTMLCanvasElement {
  return hornear(`caza|inicial|${id}|${h}`, AN, h + 2, (cx) => {
    const sp = ESPECIE[id];
    panel(cx, 0, 0, AN, h);
    texto2(cx, sp.nombre, TEXTO_X, 9);
    let bx = TEXTO_X;
    for (const tp of sp.tipos) bx += chipTipo(cx, tp, bx, 21) + 3;
    envolver(t(`userito.${id}.desc`), ANCHO_DESC).forEach((l, k) => texto2(cx, l, TEXTO_X, 38 + k * 12, TINTA2, null));
  });
}

/** `yo` is the trainer (reserved: the cards could take his colour). Resolves with the starter's id, or null for VOLVER. */
export function pantallaInicial(_yo: EntrenadorId): Promise<string | null> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = 0;
    let hecho = false;
    const fin = (v: string | null) => {
      if (hecho) return;
      hecho = true;
      sonido.efecto(v ? 'elegido' : 'atras');
      res(v);
    };
    sonido.musica('titulo');
    const LINEAS_MAX = Math.max(...INICIALES.map((id) => envolver(t(`userito.${id}.desc`), ANCHO_DESC).length));
    const firma = new Firma(INICIALES.length);
    const e: Escena = {
      estatica: true,
      paso: (_dt, ahora) => {
        for (let i = 0; i < INICIALES.length; i++) firma.v[i] = reposo(ahora, i * 170);
        return firma.cambio();
      },
      dibujar(ctx, ahora) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('caza.inicial.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 8, tw, 26);
        centrado(ctx, tit, 18);
        // The cards take what the title and the buttons leave (78..100 px each); the rest is spread between them.
        const yBot = H - 40;
        const libre = yBot - 14 - 42;
        const hMin = Math.max(78, 38 + LINEAS_MAX * 12 + 8);
        const ch = Math.min(100, Math.max(hMin, Math.floor((libre - 2 * 6) / 3)));
        const hueco = Math.max(6, Math.min(14, Math.floor((libre - 3 * ch) / 2)));
        const y0 = 42 + Math.max(0, Math.floor((libre - 3 * ch - 2 * hueco) / 2));
        INICIALES.forEach((id, i) => {
          const y = y0 + i * (ch + hueco);
          if (i === sel) {
            rect(ctx, ORO_UI, X0 - 3, y - 3, AN + 6, ch + 6);
            rect(ctx, TINTA2, X0 - 2, y - 2, AN + 4, ch + 4);
          }
          ctx.drawImage(carta(id, ch), X0, y);
          const sy = y + Math.floor((ch - 64) / 2);
          const mat = plataformaCacheada(28, 6);
          ctx.drawImage(mat, X0 + 8 + Math.floor((64 - mat.width) / 2), sy + 62 - 12);
          ctx.drawImage(spriteFrente2(id, reposo(ahora, i * 170)), X0 + 8, sy);
          entrada.zona(X0, y, AN, ch, () => {
            if (sel === i) fin(id);
            else {
              sel = i;
              sonido.efecto('cursor');
              sonido.grito(id);
            }
          });
        });
        const pista = t('caza.inicial.pista');
        texto2(ctx, pista, Math.floor((ANCHO - anchoTexto2(pista)) / 2), yBot - 6, TINTA_SUAVE, null);
        const bw = 106;
        boton(ctx, 8, yBot + 4, bw, 30, t('caza.elegir'), true);
        entrada.zona(8, yBot + 4, bw, 30, () => fin(INICIALES[sel]));
        boton(ctx, ANCHO - 8 - bw, yBot + 4, bw, 30, t('caza.volver'), false);
        entrada.zona(ANCHO - 8 - bw, yBot + 4, bw, 30, () => fin(null));
      },
      accion(a) {
        if (a === 'atras') fin(null);
        else if (a === 'arriba' || a === 'izq') {
          sel = (sel + INICIALES.length - 1) % INICIALES.length;
          sonido.efecto('cursor');
        } else if (a === 'abajo' || a === 'der') {
          sel = (sel + 1) % INICIALES.length;
          sonido.efecto('cursor');
        } else if (a === 'aceptar') fin(INICIALES[sel]);
        return true;
      },
    };
    p.poner(e);
  });
}
