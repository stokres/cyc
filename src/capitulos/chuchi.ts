// Chapter 1, Chuchi's story: Bolilandia, a children's play park in Usera, 20:20.
// After a classmate's birthday party, his partner has taken the girls home and
// the little one has gone with only one shoe: the party one, with brilli-brilli.
// Chuchi stays behind to find it, crawls into the climbing frame, and when he
// comes out of the tube slide the park has closed with him inside, in the dark.
// The girls never appear: only their mischief does.
//
//   1. His glasses are somewhere in the ball pit: rummage until they turn up.
//      Without them, small things cannot be seen (nor touched).
//   2. The exit's shutter is electric; the fuse box is in the staff room, and
//      the key hangs up high, out of the children's reach. And Chuchi's.
//   3. The ball net + the piñata stick (put together with its duct tape, in the
//      bag): a net long enough to reach the hook.
//   4. Key → staff door → fuse box: the lights come on, the shutter goes up... and
//      Robi, the mascot robot, wakes up and plants himself in front of the exit,
//      holding the shoe up: nobody leaves until the party is over.
//   5. The ball cannon: shoot balls at the power button on his head (src/ui/robot.ts).
//   6. Robi goes back to sleep and drops the shoe. Shoe, and out to the Río.
// Anything that can be picked up can be picked up any time (once he can see it).
// Every line comes from src/textos/capitulo1.md (keys starting with c.).
import type { Aventura, ZonaLogica } from '../juego/aventura';
import { texto } from '../juego/textos';
import { jugarRobot } from '../ui/robot';

const f = (g: Aventura, k: string) => g.flag(k);
const ve = (g: Aventura) => f(g, 'c.gafas');

/** Looking at something: what Chuchi makes of it without his glasses, when there is a line for it. */
function mirar(g: Aventura, id: string, clave = `c.mirar.${id}`) {
  const borroso = `${clave}.borroso`;
  return g.hablar(!ve(g) && g.hayDialogo(borroso) ? borroso : clave);
}

async function rebuscar(g: Aventura) {
  g.sound.step();
  g.avanzarReloj(1);
  if (ve(g)) return g.hablar('c.rebusca.despues');
  const n = (Number(g.estado.flags['c.rebusca']) || 0) + 1;
  g.poner('c.rebusca', n);
  if (n < 3) return g.hablar(`c.rebusca.${n}`);
  g.poner('c.gafas');
  // The milky view is drawn with the static layers: repaint them.
  g.motor.invalidar();
  g.sound.pickup();
  await g.hablar('c.gafas');
  g.ayudaUnaVez('ojo');
}

async function darLaLuz(g: Aventura) {
  g.poner('c.luz');
  g.poner('c.robot');
  g.sound.pickup();
  g.avanzarReloj(3);
  await g.hablar('c.luz');
}

async function batalla(g: Aventura) {
  await g.hablar('c.canon.coger');
  // The minigame covers the whole screen: the scene underneath stops drawing.
  g.pausado = true;
  const r = await jugarRobot(g.root, g.rapido, undefined, g.sound).finally(() => (g.pausado = false));
  if (r === 'cancelado') return g.hablar('c.robot.cancelado');
  if (r === 'hecho') g.minijuegoSuperado('robot');
  g.poner('c.robot', false);
  g.poner('c.vencido');
  g.poner('c.zapatoSuelo');
  g.avanzarReloj(10);
  await g.hablar(r === 'saltado' ? 'c.robot.saltado' : 'c.robot.vencido');
}

export function zonasParque(g: Aventura): Record<string, ZonaLogica> {
  return {
    piscina: { usar: () => rebuscar(g), mirar: () => mirar(g, 'piscina') },
    tobogan: { mirar: () => mirar(g, 'tobogan'), usar: () => g.hablar('c.usar.tobogan') },
    persiana: {
      activa: () => !f(g, 'c.robot'),
      mirar: () => mirar(g, 'persiana', f(g, 'c.luz') ? 'c.mirar.persiana.abierta' : 'c.mirar.persiana'),
      async usar() {
        if (!f(g, 'c.luz')) return g.hablar('c.persiana.bajada');
        if (!g.tiene('zapato')) return g.hablar('c.persiana.sinzapato');
        g.avanzarReloj(3);
        await g.hablar('c.salida');
        await g.enCamino('chuchi');
      },
    },
    robot: {
      activa: () => !f(g, 'c.robot'),
      mirar: () => mirar(g, 'robot', f(g, 'c.vencido') ? 'c.mirar.robot.vencido' : 'c.mirar.robot'),
      usar: () => g.hablar(f(g, 'c.vencido') ? 'c.usar.robot.vencido' : 'c.usar.robot'),
    },
    robotSalida: {
      nombre: () => texto('zona.robot'),
      activa: () => f(g, 'c.robot'),
      mirar: () => g.hablar('c.mirar.robot.encendido'),
      usar: () => g.hablar('c.usar.robot.encendido'),
      async usarObjeto() {
        await g.hablar('c.robot.objeto');
        return true;
      },
    },
    zapato: {
      activa: () => f(g, 'c.zapatoSuelo'),
      async usar() {
        g.poner('c.zapatoSuelo', false);
        g.poner('c.zapato');
        g.sound.pickup();
        await g.hablar('c.zapato');
        g.dar('zapato');
      },
    },
    zapatero: { mirar: () => mirar(g, 'zapatero'), usar: () => mirar(g, 'zapatero') },
    recepcion: { mirar: () => mirar(g, 'recepcion'), usar: () => g.hablar(f(g, 'c.luz') ? 'c.usar.recepcion.luz' : 'c.usar.recepcion') },
    gancho: {
      activa: () => ve(g) && !f(g, 'c.llave'),
      mirar: () => g.hablar('c.mirar.gancho'),
      async usar() {
        g.poner('c.ganchoVisto');
        await g.hablar('c.gancho.nollego');
      },
      async usarObjeto(item) {
        if (item === 'red') await g.hablar('c.gancho.red');
        else if (item === 'palo') await g.hablar('c.gancho.palo');
        else if (item === 'redLarga') {
          g.poner('c.llave');
          g.quitar('redLarga');
          g.sound.pickup();
          g.avanzarReloj(2);
          await g.hablar('c.gancho.llave');
          g.dar('llave');
        } else return false;
        return true;
      },
    },
    puertaPersonal: {
      nombre: () => texto(f(g, 'c.cuarto') ? 'zona.cuadroLuz' : 'zona.puertaPersonal'),
      mirar: () => (f(g, 'c.cuarto') ? g.hablar(f(g, 'c.luz') ? 'c.mirar.cuadro.luz' : 'c.mirar.cuadro') : mirar(g, 'puertaPersonal')),
      async usar() {
        if (!f(g, 'c.cuarto')) {
          g.poner('c.puertaProbada');
          g.sound.nope();
          return g.hablar('c.puerta.cerrada');
        }
        if (f(g, 'c.luz')) return g.hablar('c.cuadro.hecho');
        await darLaLuz(g);
      },
      async usarObjeto(item) {
        if (item !== 'llave') return false;
        g.quitar('llave');
        g.poner('c.cuarto');
        g.sound.pickup();
        g.avanzarReloj(1);
        await g.hablar('c.puerta.abre');
        return true;
      },
    },
    fiesta: { mirar: () => mirar(g, 'fiesta'), usar: () => g.hablar('c.usar.fiesta') },
    pinata: { mirar: () => mirar(g, 'pinata'), usar: () => g.hablar('c.usar.pinata') },
    palo: {
      activa: () => ve(g) && !f(g, 'c.palo'),
      async usar() {
        g.poner('c.palo');
        await g.hablar('c.palo');
        g.dar('palo');
        if (g.tiene('red')) g.ayudaUnaVez('combinar');
      },
    },
    red: {
      activa: () => ve(g) && !f(g, 'c.red'),
      async usar() {
        g.poner('c.red');
        await g.hablar('c.red');
        g.dar('red');
        if (g.tiene('palo')) g.ayudaUnaVez('combinar');
      },
    },
    canon: {
      activa: () => ve(g),
      mirar: () => g.hablar('c.mirar.canon'),
      async usar() {
        if (f(g, 'c.vencido')) return g.hablar('c.canon.despues');
        if (!f(g, 'c.luz')) return g.hablar('c.canon.sinluz');
        await batalla(g);
      },
    },
  };
}

export async function combinar(g: Aventura, a: string, b: string) {
  if ([a, b].sort().join('+') !== 'palo+red') return false;
  g.quitar('palo');
  g.cambiarObjeto('red', 'redLarga');
  g.sound.pickup();
  await g.hablar('c.combinar');
  return true;
}

/** Chuchi looking at himself, or using something on himself. */
export async function aSiMismo(g: Aventura, item: string | null, mirar: boolean) {
  if (mirar || !item) return g.hablar(ve(g) ? 'mirar.chuchi' : 'c.mirar.chuchi.borroso');
  if (item === 'zapato') return g.hablar('c.zapato.probar');
  return g.hablar('nadacontigo');
}

export function objetivo(g: Aventura) {
  if (!ve(g)) return texto('objetivo.chuchi.gafas');
  if (f(g, 'c.vencido')) return texto(g.tiene('zapato') ? 'objetivo.chuchi.salir' : 'objetivo.chuchi.zapato');
  if (f(g, 'c.robot')) return texto('objetivo.chuchi.robot');
  return texto('objetivo.chuchi.luz');
}

export function pista(g: Aventura) {
  if (!ve(g)) return texto('pista.chuchi.gafas');
  if (f(g, 'c.vencido')) return texto(g.tiene('zapato') ? 'pista.chuchi.salir' : 'pista.chuchi.zapato');
  if (f(g, 'c.robot')) return texto('pista.chuchi.canon');
  if (f(g, 'c.cuarto')) return texto('pista.chuchi.cuadro');
  if (g.tiene('llave')) return texto('pista.chuchi.puerta');
  if (g.tiene('redLarga')) return texto('pista.chuchi.gancho');
  if (!f(g, 'c.ganchoVisto')) return texto(f(g, 'c.puertaProbada') ? 'pista.chuchi.llave' : 'pista.chuchi.persiana');
  if (!f(g, 'c.red') || !f(g, 'c.palo')) return texto('pista.chuchi.alargar');
  return texto('pista.chuchi.combinar');
}

// ---------------------------------------------------------------- live drawing

export function dibujar(g: Aventura, ctx: CanvasRenderingContext2D, capa: string) {
  const m = g.motor;
  const px = m.px;
  if (capa === 'suelo' && f(g, 'c.zapatoSuelo')) {
    // The shoe's light, blinking: brilli-brilli.
    const z = g.S.spots.zapato;
    const k = m.f(z.y);
    const x = m.screenX(z.x, k);
    const on = Math.sin(m.t * 9) > 0;
    ctx.save();
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = on ? 'rgba(255,240,140,0.55)' : 'rgba(255,140,200,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, z.y - 4, 30 * k, 10 * k, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = m.t * 3 + i * 1.6;
      const r = (1 + Math.sin(m.t * 7 + i)) * 2.5;
      ctx.fillStyle = 'rgba(255,250,255,0.9)';
      ctx.fillRect(x + Math.cos(a) * 26 * k - r, z.y - 14 * k + Math.sin(a) * 10 * k - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}

/**
 * The lights out: the whole park in the dark but for the emergency lights, and,
 * without his glasses, everything milky round the edges. Drawn over the front
 * static layer, so it is painted again only when the camera moves or a flag
 * changes (docs/ESTILO.md, T5): nothing per frame while standing still.
 */
export function dibujarFijo(g: Aventura, ctx: CanvasRenderingContext2D) {
  const m = g.motor;
  const px = m.px;
  const off = m.off(1);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!f(g, 'c.luz')) {
    // The dark goes on a canvas of its own, so the emergency lights can be cut out of it.
    const c = velo(W, H);
    const x = c.getContext('2d')!;
    x.globalCompositeOperation = 'copy';
    x.fillStyle = 'rgba(8,12,34,0.7)';
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'destination-out';
    for (const id of ['salida', 'tobogan']) {
      const s = g.S.spots[id];
      const cx = (s.x + off) * px;
      const cy = s.y * px;
      const r = s.r * px;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(0,0,0,0.75)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gr;
      x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.drawImage(c, 0, 0);
  }
  if (!ve(g)) {
    // Short-sighted: milky towards the edges.
    const gr = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, W * 0.7);
    gr.addColorStop(0, 'rgba(200,210,235,0)');
    gr.addColorStop(1, 'rgba(200,210,235,0.55)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }
}

let lienzoVelo: HTMLCanvasElement | null = null;
function velo(w: number, h: number) {
  if (!lienzoVelo) lienzoVelo = document.createElement('canvas');
  if (lienzoVelo.width !== w || lienzoVelo.height !== h) Object.assign(lienzoVelo, { width: w, height: h });
  return lienzoVelo;
}
