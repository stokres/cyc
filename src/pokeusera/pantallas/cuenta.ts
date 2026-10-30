// PokéUsera · las pantallas de la cuenta de usuario (docs/POKEUSERA.md, «Cuentas»): «¿Cómo te llamas?» (la primera vez que se abre el juego, tras el
// título), «YA TENGO CUENTA» (meter el código) y AJUSTES → MI CUENTA (nombre, código, cambiar el nombre, usar otra cuenta). Un único formulario con un
// campo de texto real sobre el lienzo (el mismo `Campo` que la contraseña de la sala online). Estáticas: solo se repintan al tocar o al cambiar algo.
import { CODIGO_LARGO, NOMBRE_MAX, limpiarCodigo, limpiarNombre } from '../cuentas/reglas.mjs';
import { cambiarNombre, crearCuenta, cuentaLocal, recuperarCuenta, type Fallo, type Resultado } from '../cuentas/almacen';
import { anchoTexto2 } from '../arte2/fuente2';
import { TINTA2, TINTA_SUAVE } from '../arte2/paleta2';
import { panelCacheado, relleno } from '../arte2/ui2';
import { entrada, type Accion } from '../entrada';
import { ANCHO, pantalla, type Escena } from '../pantalla';
import { sonido } from '../sonido';
import { Campo } from './campo';
import { dibujarFondoBar } from './fondos';
import { boton, centrado, envolver, mover, t, texto2 } from './ui';

const ROJO = '#a83a2c';

// ------------------------------------------------------------------ the form

export type SalidaFormulario = 'ok' | 'alt' | 'volver' | 'luego';

interface Formulario {
  titulo: string;
  pregunta: string;
  ayuda?: string;
  valor?: string;
  max: number;
  mayusculas?: boolean;
  /** Text key of the field's accessible label. */
  campo: string;
  ok: string;
  alt?: string;
  volver?: string;
  /** Called with what was typed; null = it worked (the form closes with 'ok'), otherwise the text key of the error. */
  enviar: (valor: string) => Promise<{ error: string; aplazable?: boolean } | null>;
}

const ANCHO_TEXTO = 196;
const ALTO_BOTON = 28;

/** The form: question, help, the text field, an error line and the buttons. Resolves with the button that was pressed. */
function formulario(f: Formulario): Promise<SalidaFormulario> {
  return new Promise((res) => {
    const p = pantalla();
    sonido.musica('titulo');
    const campo = new Campo(f.valor ?? '', { etiqueta: f.campo, max: f.max, mayusculas: f.mayusculas });
    let ocupado = false;
    let hecho = false;
    let error: string | null = null;
    /** After a failure for lack of network: «MÁS TARDE» appears. */
    let aplazable = false;
    const preg = envolver(f.pregunta, ANCHO_TEXTO);
    const ayuda = f.ayuda ? envolver(f.ayuda, ANCHO_TEXTO) : [];
    const recolocar = () => p.redibujar();
    addEventListener('resize', recolocar);
    const cerrar = (r: SalidaFormulario) => {
      if (hecho) return;
      hecho = true;
      campo.quitar();
      removeEventListener('resize', recolocar);
      res(r);
    };
    const enviar = async () => {
      if (ocupado || hecho) return;
      ocupado = true;
      error = null;
      sonido.efecto('aceptar');
      campo.el.blur();
      p.redibujar();
      const r = await f.enviar(campo.el.value);
      if (hecho) return;
      ocupado = false;
      if (!r) return cerrar('ok');
      sonido.efecto('atras');
      error = r.error;
      aplazable = !!r.aplazable;
      p.redibujar();
    };
    const pulsar = (r: SalidaFormulario) => {
      if (ocupado) return;
      sonido.efecto(r === 'ok' ? 'aceptar' : 'atras');
      cerrar(r);
    };
    // The keys typed in the field are the field's: the game behind must not hear them.
    campo.el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        void enviar();
      } else if (e.key === 'Escape' && f.volver) pulsar('volver');
    });

    interface Boton {
      texto: string;
      fn: () => void;
    }
    const botones = (): Boton[] => [
      { texto: f.ok, fn: () => void enviar() },
      ...(f.alt ? [{ texto: f.alt, fn: () => pulsar('alt') }] : []),
      ...(aplazable ? [{ texto: t('cuenta.mastarde'), fn: () => pulsar('luego') }] : []),
      ...(f.volver ? [{ texto: f.volver, fn: () => pulsar('volver') }] : []),
    ];
    let sel = 0;

    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.35);
        const tw = anchoTexto2(f.titulo) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 22, tw, 26);
        centrado(ctx, f.titulo, 32);
        const y0 = 64 + Math.round((H - 384) * 0.1);
        const lineasError = error ? envolver(t(error), ANCHO_TEXTO) : [];
        const nBot = botones().length;
        const yCampo = y0 + 12 + preg.length * 14 + (ayuda.length ? 4 + ayuda.length * 12 : 0) + 8;
        const yAviso = yCampo + 36;
        const yBot = yAviso + Math.max(2, lineasError.length) * 12 + 12;
        const alto = yBot - y0 + nBot * (ALTO_BOTON + 8) + 6;
        panelCacheado(ctx, 8, y0, ANCHO - 16, alto);
        preg.forEach((l, i) => texto2(ctx, l, 22, y0 + 12 + i * 14, TINTA2));
        ayuda.forEach((l, i) => texto2(ctx, l, 22, y0 + 12 + preg.length * 14 + 4 + i * 12, TINTA_SUAVE, null));
        campo.colocar(20, yCampo, ANCHO - 40, 30);
        if (ocupado) texto2(ctx, t('cuenta.conectando'), 22, yAviso + 2, TINTA_SUAVE);
        else lineasError.forEach((l, i) => texto2(ctx, l, 22, yAviso + 2 + i * 12, ROJO, null));
        botones().forEach((b, i) => {
          const y = yBot + i * (ALTO_BOTON + 8);
          boton(ctx, 20, y, ANCHO - 40, ALTO_BOTON, b.texto, sel === i && !ocupado, !ocupado, i === 0 ? 'principal' : 'secundario');
          entrada.zona(20, y, ANCHO - 40, ALTO_BOTON, b.fn);
        });
      },
      accion(a: Accion) {
        const n = botones().length;
        if (sel >= n) sel = 0;
        if (a === 'arriba' || a === 'abajo') {
          sel = mover(sel, n, a);
          sonido.efecto('cursor');
          p.redibujar();
        } else if (a === 'aceptar') botones()[sel].fn();
        else if (a === 'atras' && f.volver) pulsar('volver');
        return true;
      },
    };
    p.poner(e);
    // On a phone the keyboard would cover half the screen: only focus where there is a real keyboard.
    if (matchMedia('(pointer: fine)').matches) campo.el.focus();
  });
}

// ------------------------------------------------------------------ from a result to the form's answer

/** The text key for each reason a call failed. */
const ERROR: Record<Fallo, string> = {
  nombre: 'cuenta.error.nombre',
  repetido: 'cuenta.error.repetido',
  codigo: 'cuenta.error.codigo',
  noexiste: 'cuenta.error.noexiste',
  red: 'cuenta.error.red',
  limite: 'cuenta.error.limite',
  servidor: 'cuenta.error.servidor',
};
const respuesta = (r: Resultado, aplazable = false): { error: string; aplazable?: boolean } | null =>
  r.ok ? null : { error: r.motivo === 'red' && aplazable ? 'cuenta.sinred' : ERROR[r.motivo], aplazable: aplazable && r.motivo === 'red' };

const formularioNombre = (o: Pick<Formulario, 'titulo' | 'pregunta' | 'ayuda' | 'valor' | 'ok' | 'alt' | 'volver'>, aplazable: boolean, nuevo: boolean): Promise<SalidaFormulario> =>
  formulario({
    ...o,
    max: NOMBRE_MAX,
    campo: 'cuenta.campo.nombre',
    enviar: async (v) => {
      const nombre = limpiarNombre(v);
      if (!nombre) return { error: ERROR.nombre };
      return respuesta(await (nuevo ? crearCuenta(nombre) : cambiarNombre(nombre)), aplazable);
    },
  });

const formularioCodigo = (o: Pick<Formulario, 'titulo' | 'pregunta' | 'ayuda' | 'ok' | 'volver'>): Promise<SalidaFormulario> =>
  formulario({
    ...o,
    max: CODIGO_LARGO + 2,
    mayusculas: true,
    campo: 'cuenta.campo.codigo',
    enviar: async (v) => {
      const codigo = limpiarCodigo(v);
      if (!codigo) return { error: ERROR.codigo };
      return respuesta(await recuperarCuenta(codigo));
    },
  });

/**
 * «¿Cómo te llamas?»: the first screen of the game (after the title) while this phone has no account. Resolves 'ok' when the account exists (new, or
 * entered with the code of an existing one) and 'luego' when the player chose «MÁS TARDE» because there was no network.
 */
export async function pantallaNombre(): Promise<'ok' | 'luego'> {
  for (;;) {
    const r = await formularioNombre(
      { titulo: t('cuenta.nombre.titulo'), pregunta: t('cuenta.nombre.pregunta'), ayuda: t('cuenta.nombre.ayuda'), ok: t('cuenta.entrar'), alt: t('cuenta.yatengo') },
      true,
      true,
    );
    if (r === 'ok' || r === 'luego') return r;
    // «YA TENGO CUENTA»: the code; going back returns to the name.
    const c = await formularioCodigo({ titulo: t('cuenta.codigo.titulo'), pregunta: t('cuenta.codigo.pregunta'), ayuda: t('cuenta.codigo.ayuda'), ok: t('cuenta.entrar'), volver: t('cuenta.volver') });
    if (c === 'ok') return 'ok';
  }
}

// ------------------------------------------------------------------ AJUSTES → MI CUENTA

/** The code written with a gap between letters (it is read aloud and copied by hand), e.g. «K 7 M Z 4 Q». */
const codigoLegible = (c: string): string => Array.from(c).join(' ');

/** AJUSTES → MI CUENTA: name, recovery code, change the name, use another account. Resolves when the player goes back. */
export function pantallaCuenta(): Promise<void> {
  return new Promise((res) => {
    const p = pantalla();
    let sel = 0;
    const volver = () => {
      sonido.efecto('atras');
      res();
    };
    const cambiar = async () => {
      sonido.efecto('aceptar');
      await formularioNombre(
        { titulo: t('cuenta.mi.titulo'), pregunta: t('cuenta.cambiar.pregunta'), ayuda: t('cuenta.cambiar.ayuda'), valor: cuentaLocal()?.nombre, ok: t('cuenta.guardar'), volver: t('cuenta.volver') },
        false,
        false,
      );
      p.poner(e);
    };
    const otra = async () => {
      sonido.efecto('aceptar');
      await formularioCodigo({
        titulo: t('cuenta.mi.titulo'),
        pregunta: t('cuenta.otra.pregunta'),
        ayuda: t('cuenta.otra.ayuda', { codigo: cuentaLocal()?.codigo ?? '' }),
        ok: t('cuenta.entrar'),
        volver: t('cuenta.volver'),
      });
      p.poner(e);
    };
    const crear = async () => {
      sonido.efecto('aceptar');
      await pantallaNombre();
      p.poner(e);
    };
    const e: Escena = {
      estatica: true,
      dibujar(ctx) {
        const H = p.alto;
        dibujarFondoBar(ctx, H, 0.3);
        const tit = t('cuenta.mi.titulo');
        const tw = anchoTexto2(tit) + 40;
        panelCacheado(ctx, Math.floor((ANCHO - tw) / 2), 22, tw, 26);
        centrado(ctx, tit, 32);
        const y0 = 70 + Math.round((H - 384) * 0.1);
        const c = cuentaLocal();
        const x = 8;
        const w = ANCHO - 16;
        let yBot: number;
        const botones: { texto: string; fn: () => void }[] = [];
        if (c) {
          const ayuda = envolver(t('cuenta.mi.ayuda'), ANCHO_TEXTO);
          panelCacheado(ctx, x, y0, w, 114 + ayuda.length * 12);
          texto2(ctx, t('cuenta.mi.nombre'), 22, y0 + 12, TINTA_SUAVE, null);
          texto2(ctx, c.nombre, 22, y0 + 24, TINTA2);
          texto2(ctx, t('cuenta.mi.codigo'), 22, y0 + 46, TINTA_SUAVE, null);
          const cod = codigoLegible(c.codigo);
          const cw = anchoTexto2(cod) + 20;
          const cxx = Math.floor((ANCHO - cw) / 2);
          relleno(ctx, TINTA2, cxx, y0 + 58, cw, 22);
          relleno(ctx, '#fbe19a', cxx + 1, y0 + 59, cw - 2, 20);
          texto2(ctx, cod, cxx + 10, y0 + 65, TINTA2, null);
          ayuda.forEach((l, i) => texto2(ctx, l, 22, y0 + 92 + i * 12, TINTA_SUAVE, null));
          yBot = y0 + 114 + ayuda.length * 12 + 10;
          botones.push({ texto: t('cuenta.mi.cambiar'), fn: () => void cambiar() }, { texto: t('cuenta.mi.otra'), fn: () => void otra() });
        } else {
          const l = envolver(t('cuenta.mi.sin'), ANCHO_TEXTO);
          panelCacheado(ctx, x, y0, w, 28 + l.length * 12);
          l.forEach((s, i) => texto2(ctx, s, 22, y0 + 14 + i * 12, TINTA2, null));
          yBot = y0 + 28 + l.length * 12 + 10;
          botones.push({ texto: t('cuenta.mi.crear'), fn: () => void crear() });
        }
        botones.push({ texto: t('cuenta.volver'), fn: volver });
        botones.forEach((b, i) => {
          const y = yBot + i * (ALTO_BOTON + 8);
          boton(ctx, 20, y, ANCHO - 40, ALTO_BOTON, b.texto, sel === i);
          entrada.zona(20, y, ANCHO - 40, ALTO_BOTON, b.fn);
        });
        n = botones.length;
        acciones = botones.map((b) => b.fn);
      },
      accion(a: Accion) {
        if (a === 'atras') volver();
        else if (a === 'arriba' || a === 'abajo') {
          sel = mover(Math.min(sel, n - 1), n, a);
          sonido.efecto('cursor');
        } else if (a === 'aceptar') acciones[Math.min(sel, n - 1)]?.();
        return true;
      },
    };
    let n = 3;
    let acciones: (() => void)[] = [];
    p.poner(e);
  });
}
