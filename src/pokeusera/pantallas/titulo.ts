// PokéUsera · title screen: logo, a slow parade of userito front sprites, «TOCA PARA EMPEZAR».
import { dibujarMini } from '../arte/fuente';
import { CLARO, FONDO, NEGRO, OSCURO, SUELO } from '../arte/paleta';
import { IDS_USERITOS, logo, spriteFrente } from '../arte/sprites';
import { anchoMini } from '../arte/fuente';
import { entrada } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { centrado, parpadea, rect, t } from './ui';

export function fondoCampo(ctx: CanvasRenderingContext2D, alto: number, yTierra: number) {
  rect(ctx, FONDO, 0, 0, ANCHO, alto);
  rect(ctx, SUELO, 0, yTierra, ANCHO, alto - yTierra);
  rect(ctx, '#a3b878', 0, yTierra, ANCHO, 2);
  // A few tufts of grass, always the same.
  for (let i = 0; i < 14; i++) {
    const x = (i * 37 + 11) % 156;
    const y = yTierra + 8 + ((i * 53) % Math.max(8, alto - yTierra - 12));
    rect(ctx, '#a3b878', x, y, 3, 1);
    rect(ctx, '#a3b878', x + 1, y - 1, 1, 1);
  }
}

export function pantallaTitulo(): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    // The parade starts at a random place so it is not always the same face first.
    const desfase = Math.floor(Math.random() * IDS_USERITOS.length);
    let listo = false;
    const seguir = () => {
      if (listo) return;
      listo = true;
      sonido.efecto('aceptar');
      res();
    };
    sonido.musica('titulo');
    const e: Escena = {
      paso: () => true,
      dibujar(ctx, ahora) {
        const H = p.alto;
        const yTierra = Math.round(H * 0.56);
        fondoCampo(ctx, H, yTierra);
        const lg = logo();
        const yLogo = Math.round(H * 0.13);
        ctx.drawImage(lg, 0, yLogo);
        // Parade: sprites walk from right to left on the ground line, hopping.
        const desp = ahora * 0.016;
        const sep = 52;
        const base = Math.floor(desp / sep);
        const fase = desp % sep;
        for (let k = -1; k < 5; k++) {
          const idx = (base + k + desfase) % IDS_USERITOS.length;
          const xx = Math.round(k * sep - fase + 4);
          const salto = Math.abs(Math.sin(ahora / 230 + idx)) * 4;
          const yy = Math.round(yTierra + 22 - 32 - salto);
          rect(ctx, '#a3b878', xx + 6, yTierra + 21, 20, 2);
          ctx.drawImage(spriteFrente(IDS_USERITOS[idx]), xx, yy);
        }
        if (parpadea(ahora, 600)) centrado(ctx, t('titulo.toca'), Math.round(H * 0.77), NEGRO, { sombra: CLARO });
        const cred = t('titulo.credito');
        dibujarMini(ctx, cred, 80 - Math.floor(anchoMini(cred) / 2), H - 12, OSCURO);
        entrada.zona(0, 0, ANCHO, H, seguir);
      },
      accion(a) {
        if (a === 'aceptar') seguir();
        return false;
      },
    };
    p.poner(e);
  });
}
