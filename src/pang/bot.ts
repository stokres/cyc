// The demo's player (title screen): looks a little ahead at where each bubble will be,
// steps out of the way, walks under the best target and fires when aligned. It writes into
// the same `Mandos` the buttons do.
import type { Mandos } from './entrada';
import { circuloRect, velocidadBote } from './fisica';
import { BARRA_LLENA, GRAVEDAD, type Mundo } from './mundo';
import { AREA } from './tipos';

const MAX = 48;
/** Samples ahead, every MUESTRA seconds. */
const N = 8;
const MUESTRA = 0.1;
const SUB = 0.05;

export class Bot {
  private espera = 0;
  private disparoEn = 0;
  private bx = new Float32Array(MAX * N);
  private by = new Float32Array(MAX * N);
  private br = new Float32Array(MAX);
  private n = 0;

  /** Called every simulation step; decides ten or twenty times a second. */
  pensar(m: Mundo, mandos: Mandos, dt: number) {
    this.disparoEn -= dt;
    this.espera -= dt;
    if (this.espera > 0) return;
    this.espera = 0.05;
    this.predecir(m);
    const j = m.jugador;
    const paso = m.estilo.paso;
    if (m.barra >= BARRA_LLENA && this.n > 0) mandos.especial = true;

    // The target: big, near in x, and above.
    let mejor = -1;
    let punt = -1e9;
    for (let i = 0; i < this.n; i++) {
      const p = this.br[i] * 1.2 - Math.abs(this.bx[i * N] - j.x) * 0.04 + (this.by[i * N] < j.y - 8 ? 2 : -4) + (i === this.n - 1 && m.jefe ? 6 : 0);
      if (p > punt) {
        punt = p;
        mejor = i;
      }
    }
    let objetivo = j.x;
    let radio = 4;
    if (mejor >= 0) {
      const vuelo = Math.max(0, Math.min(N * MUESTRA, (j.y - this.by[mejor * N]) / 200));
      const k = Math.max(0, Math.min(N - 1, Math.round(vuelo / MUESTRA) - 1));
      objetivo = vuelo < MUESTRA ? this.bx[mejor * N] : this.bx[mejor * N + k];
      radio = this.br[mejor];
    }

    let elegido = 0;
    let coste = 1e9;
    for (const d of [0, -1, 1]) {
      const fin = Math.max(AREA.izq + 8, Math.min(AREA.der - 8, j.x + d * paso * N * MUESTRA));
      const c = this.peligro(j.x, j.y, d, paso) * 10 + Math.abs(objetivo - fin) * 0.05 + (d !== 0 ? 0.2 : 0) + (Math.abs(objetivo - j.x) < 3 && d !== 0 ? 1 : 0);
      if (c < coste) {
        coste = c;
        elegido = d;
      }
    }
    mandos.izq = elegido < 0;
    mandos.der = elegido > 0;
    const alineado = mejor >= 0 && Math.abs(objetivo - j.x) <= Math.max(3, radio * 0.6);
    const auto = m.estilo.arma === 'rafaga' || m.kinki > 0;
    mandos.fuego = alineado && auto;
    if (alineado && this.disparoEn <= 0) {
      mandos.disparo = true;
      this.disparoEn = auto ? 0.2 : 0.3;
    }
  }

  /** How bad it is to walk in direction `d` for the next second or so: bubbles that would reach the player count more the sooner. */
  private peligro(x: number, y: number, d: number, paso: number): number {
    let p = 0;
    for (let s = 0; s < N; s++) {
      const px = Math.max(AREA.izq + 8, Math.min(AREA.der - 8, x + d * paso * MUESTRA * (s + 1)));
      for (let i = 0; i < this.n; i++) {
        if (circuloRect(this.bx[i * N + s], this.by[i * N + s], this.br[i] + 4, px - 7, y - 24, 14, 24)) p += N - s;
      }
    }
    return p;
  }

  /** Where each bubble (and the boss, last) will be in the next samples, ignoring blocks. */
  private predecir(m: Mundo) {
    this.n = 0;
    const congelado = m.congelado > 0.3;
    for (const b of m.burbujas) {
      if (this.n >= MAX - 1) break;
      this.simular(b.x, b.y, congelado ? 0 : b.vx, congelado ? 0 : b.vy, b.r, congelado ? 0 : b.bote);
    }
    const j = m.jefe;
    if (j) this.simular(j.x, j.y, congelado ? 0 : j.vx, congelado ? 0 : j.vy, j.r, congelado ? 0 : j.bote);
  }

  private simular(x: number, y: number, vx: number, vy: number, r: number, bote: number) {
    const i = this.n++;
    this.br[i] = r;
    for (let k = 1; k <= N * 2; k++) {
      if (bote > 0) vy += GRAVEDAD * SUB;
      x += vx * SUB;
      y += vy * SUB;
      if (x - r < AREA.izq) {
        x = AREA.izq + r;
        vx = Math.abs(vx);
      } else if (x + r > AREA.der) {
        x = AREA.der - r;
        vx = -Math.abs(vx);
      }
      if (y - r < AREA.techo) {
        y = AREA.techo + r;
        vy = Math.abs(vy);
      }
      if (y + r > AREA.suelo) {
        y = AREA.suelo - r;
        vy = bote > 0 ? velocidadBote(bote) : -Math.abs(vy);
      }
      if (k % 2 === 0) {
        this.bx[i * N + k / 2 - 1] = x;
        this.by[i * N + k / 2 - 1] = y;
      }
    }
  }
}
