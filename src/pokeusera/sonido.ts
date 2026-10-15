// Sound of PokéUsera: the tunes (src/sonido/pokeusera-*.mp3, made by tools/musica/pokeusera.py; the long versions of ~3 minutes, by pokeusera_largas_a.py and pokeusera_largas_b.py)
// and the effects and cries, which are synthesised live in the style of the first Game Boy games:
// pulse waves with pitch sweeps and arpeggios, and noise from the console's 15-bit shift register.
// Self-contained (it does not use src/core/audio.ts) and silent, never throwing, if there is no audio.
//
// Phones only allow sound after a tap: call `sonido.desbloquear()` from the first tap (it is harmless
// to call it on every tap). Music asked for before that starts then.
//
//   sonido.musica('combate')     cross-fades into the track (0.3 s); null fades out. Loops, except 'victoria'.
//                                'combate' is four tunes: each new battle takes another one than the last, at random,
//                                and asking again during the same battle (also after 'final') keeps the same one.
//   sonido.elegirCombate('rural')  the next battle's tune is the one of that scenario ('terraza' rumba, 'rural' techno,
//                                'juan' bachata); 'brio' or nothing = the rotation of the four. Call it before the
//                                `musica('combate')` (and the `precargar('combate')`) of the battle; it counts once.
//   sonido.efecto('golpeFuerte') one of EFECTOS, 0.6 s at most.
//   sonido.grito('aceituna')     the cry of a userito, always the same for the same id.
//   sonido.setVolumen('musica', 0.5), sonido.getVolumen('efectos')   0–1, as the settings menu has them.
import type { EscenarioId } from './tipos';
import urlTitulo from '../sonido/pokeusera-titulo.mp3?url';
import urlDraft from '../sonido/pokeusera-draft.mp3?url';
import urlCombate from '../sonido/pokeusera-combate.mp3?url';
import urlCombateRock from '../sonido/pokeusera-combate-rock.mp3?url';
import urlCombateVerbena from '../sonido/pokeusera-combate-verbena.mp3?url';
import urlCombateElectro from '../sonido/pokeusera-combate-electro.mp3?url';
import urlCombateTerraza from '../sonido/pokeusera-combate-terraza.mp3?url';
import urlCombateRural from '../sonido/pokeusera-combate-rural.mp3?url';
import urlCombateJuan from '../sonido/pokeusera-combate-juan.mp3?url';
import urlFinal from '../sonido/pokeusera-final.mp3?url';
import urlVictoria from '../sonido/pokeusera-victoria.mp3?url';

export type Musica = 'titulo' | 'draft' | 'combate' | 'final' | 'victoria';
/** The files behind `Musica`: 'combate' is one of these (see `elegirCombate`). */
type Pista = Musica | 'combateRock' | 'combateVerbena' | 'combateElectro' | 'combateTerraza' | 'combateRural' | 'combateJuan';
/** The rotation of the Bar del Brío. */
const COMBATES: readonly Pista[] = ['combate', 'combateRock', 'combateVerbena', 'combateElectro'];
/** The tune of each scenario that has one of its own. */
const COMBATE_DE: Record<Exclude<EscenarioId, 'brio'>, Pista> = { terraza: 'combateTerraza', rural: 'combateRural', juan: 'combateJuan' };
const ES_COMBATE: ReadonlySet<Pista> = new Set<Pista>([...COMBATES, ...Object.values(COMBATE_DE)]);
export const EFECTOS = [
  'cursor', 'aceptar', 'atras', 'golpe', 'golpeFuerte', 'golpeFlojo', 'critico', 'falla', 'cae', 'sube', 'baja', 'cura',
  'estado', 'cambio', 'tic', 'turno', 'elegido', 'eliminado',
] as const;
export type Efecto = (typeof EFECTOS)[number];
export type Canal = 'musica' | 'efectos';
/** The 30 useritos that have a cry of their own (any other id gets one from its hash too). */
export const ESPECIES = [
  'draguserin', 'goudazard', 'aceituna', 'cierzon', 'turroncho', 'tocinon', 'roscochoco', 'espumarro', 'cajonazo', 'lentejasur',
  'tragaperras', 'turito', 'resacon', 'evoscar', 'chupitochu', 'caravaner', 'camioner', 'criaturitah', 'ego-ego', 'kbronero',
  'cubatillo', 'p', 'jesuspelo', 'pantaloneto', 'maletrio', 'teloneon', 'choquechu', 'torrezmon', 'papiroflexeon', 'ceceseta',
] as const;

/**
 * Where each loop plays between, in seconds into its file: the files hold half a second either side of
 * the loop (what comes just before and after it), so it joins without a click on any phone. 'victoria'
 * plays once, from the start.
 */
const PISTAS: Record<Pista, { url: string; inicio: number; fin: number | null }> = {
  titulo: { url: urlTitulo, inicio: 0.5, fin: 168.119048 },
  draft: { url: urlDraft, inicio: 0.5, fin: 183.78381 },
  combate: { url: urlCombate, inicio: 0.5, fin: 172.792063 },
  combateRock: { url: urlCombateRock, inicio: 0.5, fin: 173.842766 },
  combateVerbena: { url: urlCombateVerbena, inicio: 0.5, fin: 182.304989 },
  combateElectro: { url: urlCombateElectro, inicio: 0.5, fin: 177.714694 },
  combateTerraza: { url: urlCombateTerraza, inicio: 0.5, fin: 176.484036 },
  combateRural: { url: urlCombateRural, inicio: 0.5, fin: 181.351519 },
  combateJuan: { url: urlCombateJuan, inicio: 0.5, fin: 177.714694 },
  final: { url: urlFinal, inicio: 0.5, fin: 167.944898 },
  victoria: { url: urlVictoria, inicio: 0, fin: null },
};

/** Samples a second the sound runs at: the music is decoded at this rate (docs/ESTILO.md, T5.11) and the effects are lo-fi anyway. */
const MUESTREO = 24000;
/** Decoded tracks kept at once (docs/ESTILO.md, T5.11). */
const MAX_DECODIFICADAS = 3;
const FUNDIDO = 0.3;
const NIVEL_MASTER = 0.8;
const NIVEL_MUSICA = 0.55;
const NIVEL_EFECTOS = 0.5;
/** The volume sliders as gain: squared, so the middle of the slider sounds like the middle. */
const curva = (v: number) => Math.max(0, Math.min(1, v)) ** 2;
/** Cries step their pitch like the console did, once a frame. */
const FOTOGRAMA = 1 / 60;

interface Voz {
  /** Start, seconds from now. */
  t: number;
  dur: number;
  vol: number;
  /** Pulse duty (0.125, 0.25, 0.5), or 0 for the wave channel's triangle. */
  duty?: number;
  /** A pitch slide from f0 to f1 (exponential)... */
  f0?: number;
  f1?: number;
  /** ...or a chip arpeggio: these notes, `paso` seconds each. */
  notas?: number[];
  paso?: number;
  /** Fraction of the duration the volume holds before it dies away. */
  sost?: number;
}

interface Soplo {
  t: number;
  dur: number;
  vol: number;
  /** Shift-register clock, as a multiple of the sample rate, from r0 to r1. */
  r0: number;
  r1: number;
  filtro?: { tipo: BiquadFilterType; f: number; f1?: number; q?: number };
}

interface Sonando {
  nombre: Pista;
  src: AudioBufferSourceNode;
  g: GainNode;
  acabo: boolean;
}

export class Sonido {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private fx: GainNode | null = null;
  private ruidoBuf: AudioBuffer | null = null;
  private ondas = new Map<number, PeriodicWave>();
  private volumen: Record<Canal, number> = { musica: 0.7, efectos: 1 };
  private escuchado = false;

  private deseada: Pista | null = null;
  /** A battle is on: 'combate' (and 'final') have been asked for since the last other tune. */
  private enBatalla = false;
  /** The battle tune of this battle (or, between battles, of the last one) and the one chosen ahead for the next (by `elegirCombate`, or by `precargar`). */
  private combateElegido: Pista | null = null;
  private combateProximo: Pista | null = null;
  private pedido = 0;
  private actual: Sonando | null = null;
  private cargas = new Map<Pista, Promise<AudioBuffer | null>>();
  private usos = new Map<Pista, number>();
  private reloj = 0;
  private ultimo = new Map<string, number>();

  /** Call from a tap. Creates the audio context the first time and resumes it every time. */
  desbloquear() {
    try {
      if (!this.ac) this.crear();
      const ac = this.ac;
      if (!ac) return;
      if (ac.state !== 'running') void ac.resume().catch(() => undefined);
    } catch {
      /* no audio */
    }
  }

  private crear() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    let ac: AudioContext;
    try {
      ac = new AC({ sampleRate: MUESTREO });
    } catch {
      ac = new AC(); // a browser that will not run at another rate: its own
    }
    this.ac = ac;
    this.master = ac.createGain();
    this.master.gain.value = NIVEL_MASTER;
    this.master.connect(ac.destination);
    this.bus = ac.createGain();
    this.bus.gain.value = NIVEL_MUSICA * curva(this.volumen.musica);
    this.bus.connect(this.master);
    this.fx = ac.createGain();
    this.fx.gain.value = NIVEL_EFECTOS * curva(this.volumen.efectos);
    this.fx.connect(this.master);
    // The shift register of the console's noise channel, long mode: 32767 steps of ±1, played in a loop.
    const buf = ac.createBuffer(1, 32767, ac.sampleRate);
    const d = buf.getChannelData(0);
    let r = 1;
    for (let i = 0; i < d.length; i++) {
      const bit = (r ^ (r >> 1)) & 1;
      r = (r >> 1) | (bit << 14);
      d[i] = (r & 1) * 2 - 1;
    }
    this.ruidoBuf = buf;
    // iOS wants a sound started inside the tap.
    const mudo = ac.createBufferSource();
    mudo.buffer = ac.createBuffer(1, 1, ac.sampleRate);
    mudo.connect(ac.destination);
    mudo.start(0);
    if (!this.escuchado) {
      this.escuchado = true;
      document.addEventListener('visibilitychange', () => {
        const a = this.ac;
        if (!a) return;
        if (document.visibilityState === 'visible') void a.resume().catch(() => undefined);
        else void a.suspend().catch(() => undefined);
      });
    }
    if (this.deseada) this.aplicarMusica();
  }

  setVolumen(canal: Canal, v: number) {
    this.volumen[canal] = Math.max(0, Math.min(1, v));
    const g = canal === 'musica' ? this.bus : this.fx;
    if (g && this.ac) {
      const nivel = canal === 'musica' ? NIVEL_MUSICA : NIVEL_EFECTOS;
      g.gain.setTargetAtTime(nivel * curva(this.volumen[canal]), this.ac.currentTime, 0.05);
    }
  }

  getVolumen(canal: Canal) {
    return this.volumen[canal];
  }

  get volumenMusica() {
    return this.volumen.musica;
  }

  get volumenEfectos() {
    return this.volumen.efectos;
  }

  /** The track that is playing (or loading, or waiting for the first tap), null for silence. */
  get musicaActual(): Musica | null {
    const d = this.deseada;
    return d !== null && ES_COMBATE.has(d) ? 'combate' : (d as Musica | null);
  }

  // --- Music ----------------------------------------------------------------------------------

  /**
   * Cross-fades into this track (null: fades out). Asking again for the one that plays does nothing.
   * 'combate' plays one of four battle tunes: a new battle (the first 'combate' after any other tune)
   * takes the one `elegirCombate` chose for it or, if none, one at random that is not the last battle's;
   * asking for 'combate' again during the battle, or after 'final', stays on the tune of that battle.
   */
  musica(nombre: Musica | null) {
    let pista: Pista | null = nombre;
    if (nombre === 'combate') {
      if (!this.enBatalla || this.combateElegido === null) {
        this.combateElegido = this.combateProximo ?? this.rotacion();
        this.combateProximo = null;
      }
      this.enBatalla = true;
      pista = this.combateElegido;
    } else if (nombre !== 'final' && nombre !== null) {
      this.enBatalla = false; // the battle is over (null, a silence, is no such thing: a pause must not change the tune)
    }
    this.deseada = pista;
    if (this.ac) this.aplicarMusica();
  }

  /**
   * Chooses the tune of the next battle by its scenario: 'terraza' (rumba), 'rural' (techno) and 'juan' (bachata) have one
   * of their own; 'brio' or no argument is the rotation of the four (a new draw, never the last battle's). It counts for
   * one battle (the next `musica('combate')` that starts one), so a scenario without a call falls back to the rotation.
   * Call it before `precargar('combate')`, which then loads just that tune. A battle in course keeps its own. It can be called
   * more than once for the same battle: the tune chosen (or preloaded) is kept unless the scenario asks for another.
   */
  elegirCombate(escenario?: EscenarioId) {
    // Asking again for the same battle (the draft screen does, to preload the tune, and the battle screen does when it starts) keeps the choice made.
    if (escenario && escenario !== 'brio') this.combateProximo = COMBATE_DE[escenario] ?? this.rotacion();
    else if (this.combateProximo === null || !COMBATES.includes(this.combateProximo)) this.combateProximo = this.rotacion();
  }

  /** A battle tune of the rotation at random, never the one of the last battle (when there is another). */
  private rotacion(): Pista {
    const otras = COMBATES.filter((p) => p !== this.combateElegido);
    return otras[Math.floor(Math.random() * otras.length)];
  }

  /** Fetches and decodes a track ahead of time, so that it starts at once when asked for. ('combate': the tune the next battle will have.) */
  precargar(nombre: Musica) {
    if (!this.ac) return;
    let pista: Pista = nombre;
    if (nombre === 'combate') {
      if (this.enBatalla && this.combateElegido) return; // the battle in course already has its tune
      this.combateProximo ??= this.rotacion();
      pista = this.combateProximo;
    }
    void this.cargar(pista);
  }

  private aplicarMusica() {
    try {
      const nombre = this.deseada;
      const yo = ++this.pedido; // a load in flight for something else is no longer wanted
      if (nombre === null) {
        this.callar();
        return;
      }
      const a = this.actual;
      if (a && a.nombre === nombre && !a.acabo) return;
      void this.cargar(nombre).then((buf) => {
        if (!buf || yo !== this.pedido) return;
        try {
          this.empezar(nombre, buf);
        } catch {
          /* no audio */
        }
      });
    } catch {
      /* no audio */
    }
  }

  private cargar(nombre: Pista) {
    const ac = this.ac;
    if (!ac) return Promise.resolve(null);
    let carga = this.cargas.get(nombre);
    if (!carga) {
      this.recortar();
      carga = fetch(PISTAS[nombre].url)
        .then((r) => r.arrayBuffer())
        .then((b) => ac.decodeAudioData(b))
        .catch(() => {
          this.cargas.delete(nombre); // it can be tried again
          return null;
        });
      this.cargas.set(nombre, carga);
    }
    this.usos.set(nombre, ++this.reloj);
    return carga;
  }

  /** Makes room for one more: forgets the least recently used decoded tracks that are not the one playing, down to MAX_DECODIFICADAS - 1. */
  private recortar() {
    while (this.cargas.size >= MAX_DECODIFICADAS) {
      let viejo: Pista | null = null;
      for (const id of this.cargas.keys()) {
        if (id === this.actual?.nombre || id === this.deseada) continue;
        if (viejo === null || (this.usos.get(id) ?? 0) < (this.usos.get(viejo) ?? 0)) viejo = id;
      }
      if (viejo === null) return;
      this.cargas.delete(viejo);
      this.usos.delete(viejo);
    }
  }

  private empezar(nombre: Pista, buf: AudioBuffer) {
    const ac = this.ac;
    const bus = this.bus;
    if (!ac || !bus) return;
    const t = ac.currentTime;
    const habia = this.actual !== null;
    this.callar();
    const pista = PISTAS[nombre];
    const src = ac.createBufferSource();
    src.buffer = buf;
    if (pista.fin !== null) {
      src.loop = true;
      src.loopStart = pista.inicio;
      src.loopEnd = Math.min(pista.fin, buf.duration);
    }
    const g = ac.createGain();
    // Over another track, a cross-fade; out of silence (or the fanfare) the first beat should not be blunted.
    const entra = habia && pista.fin !== null ? FUNDIDO : 0.03;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + entra);
    src.connect(g).connect(bus);
    const sonando: Sonando = { nombre, src, g, acabo: false };
    src.onended = () => {
      sonando.acabo = true;
    };
    src.start(t, pista.inicio);
    this.actual = sonando;
  }

  /** Fades out what plays. */
  private callar() {
    const ac = this.ac;
    const a = this.actual;
    this.actual = null;
    if (!ac || !a) return;
    const t = ac.currentTime;
    try {
      a.g.gain.cancelScheduledValues(t);
      a.g.gain.setValueAtTime(a.g.gain.value, t);
      a.g.gain.linearRampToValueAtTime(0, t + FUNDIDO);
      a.src.onended = () => {
        a.src.disconnect();
        a.g.disconnect();
      };
      a.src.stop(t + FUNDIDO + 0.03);
    } catch {
      /* already over */
    }
  }

  // --- Building blocks --------------------------------------------------------------------------

  private onda(duty: number) {
    const ac = this.ac!;
    let w = this.ondas.get(duty);
    if (!w) {
      const n = 48;
      const real = new Float32Array(n + 1);
      const imag = new Float32Array(n + 1);
      for (let k = 1; k <= n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      w = ac.createPeriodicWave(real, imag);
      this.ondas.set(duty, w);
    }
    return w;
  }

  /** One pulse (or triangle) note with its envelope. Returns the oscillator so that a caller can modulate it. */
  private voz(v: Voz): OscillatorNode | null {
    const ac = this.ac;
    const fx = this.fx;
    if (!ac || !fx) return null;
    const t = ac.currentTime + 0.004 + v.t;
    const osc = ac.createOscillator();
    if (v.duty === 0) osc.type = 'triangle';
    else osc.setPeriodicWave(this.onda(v.duty ?? 0.5));
    if (v.notas) {
      const paso = v.paso ?? 0.05;
      v.notas.forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * paso));
    } else {
      const f0 = v.f0 ?? 440;
      osc.frequency.setValueAtTime(f0, t);
      if (v.f1 !== undefined && v.f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, v.f1), t + v.dur);
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v.vol, t + 0.003);
    g.gain.setValueAtTime(v.vol, t + v.dur * (v.sost ?? 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + v.dur);
    osc.connect(g).connect(fx);
    osc.start(t);
    osc.stop(t + v.dur + 0.02);
    return osc;
  }

  /** A burst of the console's noise. */
  private soplo(s: Soplo) {
    const ac = this.ac;
    const fx = this.fx;
    if (!ac || !fx || !this.ruidoBuf) return;
    const t = ac.currentTime + 0.004 + s.t;
    const src = ac.createBufferSource();
    src.buffer = this.ruidoBuf;
    src.loop = true;
    src.playbackRate.setValueAtTime(s.r0, t);
    if (s.r1 !== s.r0) src.playbackRate.exponentialRampToValueAtTime(s.r1, t + s.dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(s.vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
    let fin: AudioNode = src;
    if (s.filtro) {
      const f = ac.createBiquadFilter();
      f.type = s.filtro.tipo;
      f.Q.value = s.filtro.q ?? 0.7;
      f.frequency.setValueAtTime(s.filtro.f, t);
      if (s.filtro.f1) f.frequency.exponentialRampToValueAtTime(s.filtro.f1, t + s.dur);
      src.connect(f);
      fin = f;
    }
    fin.connect(g).connect(fx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + s.dur + 0.02);
  }

  // --- Effects --------------------------------------------------------------------------------

  efecto(nombre: Efecto) {
    const ac = this.ac;
    if (!ac || !this.fx) return;
    // The same effect twice within a few milliseconds (a held key, a double tap) is one.
    const ahora = ac.currentTime;
    if (ahora - (this.ultimo.get(nombre) ?? -1) < 0.035) return;
    this.ultimo.set(nombre, ahora);
    try {
      this.tocarEfecto(nombre);
    } catch {
      /* no audio */
    }
  }

  private tocarEfecto(nombre: Efecto) {
    // Notes as frequencies: C5 523, E5 659, G5 784, C6 1047, E6 1319, G6 1568, C7 2093.
    switch (nombre) {
      case 'cursor':
        this.voz({ t: 0, dur: 0.045, vol: 0.2, duty: 0.25, f0: 1175, sost: 0.8 });
        break;
      case 'aceptar':
        this.voz({ t: 0, dur: 0.17, vol: 0.24, duty: 0.5, notas: [659, 988, 1319], paso: 0.05, sost: 0.75 });
        break;
      case 'atras':
        this.voz({ t: 0, dur: 0.13, vol: 0.22, duty: 0.5, notas: [740, 494], paso: 0.06, sost: 0.7 });
        break;
      case 'golpe':
        this.soplo({ t: 0, dur: 0.12, vol: 0.5, r0: 0.9, r1: 0.25, filtro: { tipo: 'lowpass', f: 5000 } });
        this.voz({ t: 0, dur: 0.1, vol: 0.28, duty: 0.5, f0: 260, f1: 70 });
        break;
      case 'golpeFuerte':
        this.soplo({ t: 0, dur: 0.22, vol: 0.62, r0: 1.4, r1: 0.2 });
        this.voz({ t: 0, dur: 0.2, vol: 0.34, duty: 0.5, f0: 320, f1: 50 });
        this.voz({ t: 0, dur: 0.07, vol: 0.2, duty: 0.125, f0: 1760, f1: 880 });
        this.soplo({ t: 0.13, dur: 0.14, vol: 0.4, r0: 0.7, r1: 0.18, filtro: { tipo: 'lowpass', f: 3500 } });
        break;
      case 'golpeFlojo':
        this.soplo({ t: 0, dur: 0.08, vol: 0.3, r0: 0.5, r1: 0.2, filtro: { tipo: 'lowpass', f: 2200 } });
        this.voz({ t: 0, dur: 0.09, vol: 0.16, duty: 0.5, f0: 170, f1: 110 });
        break;
      case 'critico':
        this.soplo({ t: 0, dur: 0.16, vol: 0.58, r0: 1.3, r1: 0.25 });
        this.voz({ t: 0, dur: 0.14, vol: 0.32, duty: 0.5, f0: 300, f1: 60 });
        this.voz({ t: 0.1, dur: 0.24, vol: 0.2, duty: 0.25, notas: [1568, 2093, 1568, 2093, 1568], paso: 0.045, sost: 0.8 });
        break;
      case 'falla':
        this.soplo({ t: 0, dur: 0.24, vol: 0.28, r0: 1, r1: 1, filtro: { tipo: 'bandpass', f: 3200, f1: 500, q: 1.2 } });
        this.voz({ t: 0.02, dur: 0.2, vol: 0.1, duty: 0.25, f0: 620, f1: 300 });
        break;
      case 'cae':
        this.voz({ t: 0, dur: 0.5, vol: 0.28, duty: 0.5, f0: 880, f1: 60, sost: 0.7 });
        this.voz({ t: 0, dur: 0.5, vol: 0.12, duty: 0.125, f0: 1320, f1: 90, sost: 0.6 });
        this.soplo({ t: 0.38, dur: 0.18, vol: 0.3, r0: 0.5, r1: 0.12, filtro: { tipo: 'lowpass', f: 2500 } });
        break;
      case 'sube':
        this.voz({ t: 0, dur: 0.34, vol: 0.24, duty: 0.25, notas: [523, 659, 784, 1047, 1319, 1568], paso: 0.055, sost: 0.85 });
        break;
      case 'baja':
        this.voz({ t: 0, dur: 0.36, vol: 0.24, duty: 0.5, notas: [988, 784, 659, 494, 392, 330], paso: 0.06, sost: 0.8 });
        break;
      case 'cura':
        this.voz({ t: 0, dur: 0.5, vol: 0.18, duty: 0.125, notas: [1047, 1319, 1568, 2093, 1568, 2093, 2637], paso: 0.048, sost: 0.75 });
        this.voz({ t: 0.07, dur: 0.4, vol: 0.1, duty: 0.5, notas: [784, 988, 1175, 1568, 1175, 1568], paso: 0.048, sost: 0.75 });
        break;
      case 'estado':
        this.voz({ t: 0, dur: 0.4, vol: 0.2, duty: 0.25, notas: [440, 415, 440, 415, 370, 330, 311, 294], paso: 0.045, sost: 0.8 });
        this.soplo({ t: 0, dur: 0.05, vol: 0.25, r0: 1, r1: 0.5, filtro: { tipo: 'highpass', f: 2000 } });
        break;
      case 'cambio':
        this.soplo({ t: 0, dur: 0.05, vol: 0.45, r0: 0.6, r1: 0.3, filtro: { tipo: 'lowpass', f: 3000 } });
        this.voz({ t: 0.04, dur: 0.13, vol: 0.24, duty: 0.5, f0: 280, f1: 1175 });
        this.voz({ t: 0.18, dur: 0.18, vol: 0.2, duty: 0.25, notas: [1568, 2093], paso: 0.07, sost: 0.7 });
        break;
      case 'tic':
        this.voz({ t: 0, dur: 0.03, vol: 0.16, duty: 0.125, f0: 1760, sost: 0.9 });
        break;
      case 'turno':
        this.voz({ t: 0, dur: 0.4, vol: 0.22, duty: 0.5, notas: [659, 784, 988, 1319], paso: 0.075, sost: 0.9 });
        this.voz({ t: 0, dur: 0.4, vol: 0.1, duty: 0.125, notas: [330, 392, 494, 659], paso: 0.075, sost: 0.9 });
        break;
      case 'elegido':
        this.soplo({ t: 0, dur: 0.06, vol: 0.3, r0: 1.1, r1: 0.7, filtro: { tipo: 'highpass', f: 1500 } });
        this.voz({ t: 0, dur: 0.34, vol: 0.24, duty: 0.25, notas: [523, 523, 523, 784], paso: 0.065, sost: 0.9 });
        this.voz({ t: 0.2, dur: 0.14, vol: 0.2, duty: 0.25, f0: 1047, sost: 0.8 });
        break;
      case 'eliminado':
        this.voz({ t: 0, dur: 0.56, vol: 0.26, duty: 0.5, notas: [392, 349, 311, 262], paso: 0.1, sost: 0.9 });
        this.voz({ t: 0.4, dur: 0.18, vol: 0.26, duty: 0.5, f0: 262, f1: 90, sost: 0.4 });
        this.soplo({ t: 0.42, dur: 0.15, vol: 0.28, r0: 0.4, r1: 0.12, filtro: { tipo: 'lowpass', f: 2000 } });
        break;
    }
  }

  // --- Cries ----------------------------------------------------------------------------------

  /**
   * The cry of a userito, 0.4–0.8 s: one to three syllables of a pulse (or two) and a little noise, the
   * pitch stepping once a frame along a contour (falling, rising, arched, dipping or wobbling), with
   * vibrato. Everything comes from a hash of the id, so it is always the same cry and they differ.
   */
  grito(especieId: string) {
    const ac = this.ac;
    const fx = this.fx;
    if (!ac || !fx || !this.ruidoBuf) return;
    try {
      this.cantar(ac, fx, especieId);
    } catch {
      /* no audio */
    }
  }

  private cantar(ac: AudioContext, fx: GainNode, id: string) {
    const r = azar(hash(id));
    const idx = (ESPECIES as readonly string[]).indexOf(id);
    // The 30 known ids take 30 different slots in pitch (7 is coprime with 30, so they shuffle); the rest, a random one.
    const ranura = idx >= 0 ? (idx * 7) % 30 : Math.floor(r() * 30);
    const f0 = 140 * 2 ** (((ranura + r() * 0.8) / 30) * 2.5);
    const total = 0.42 + r() * 0.36;
    const silabas = 1 + Math.floor(r() * 3);
    const forma = Math.floor(r() * 5);
    const prof = 5 + r() * 14;
    const duty = [0.125, 0.25, 0.5][Math.floor(r() * 3)];
    const duty2 = [0.125, 0.25, 0.5][Math.floor(r() * 3)];
    const segundaVoz = r() < 0.6;
    const intervalo = [0, 7, 12, -12, 5, 4, 3][Math.floor(r() * 7)];
    const ruido = r() < 0.65 ? 0.12 + r() * 0.4 : 0;
    const vibHz = 6 + r() * 14;
    const vibCents = r() * 55;
    const saltos = Array.from({ length: silabas }, () => (r() - 0.5) * 7);
    const contorno = (u: number) =>
      [-prof * u, prof * u, prof * Math.sin(Math.PI * u), -prof * Math.sin(Math.PI * u), prof * 0.18 * Math.sin(4 * Math.PI * u)][forma];

    const t0 = ac.currentTime + 0.005;
    const hueco = silabas > 1 ? 0.03 : 0;
    const dsil = (total - hueco * (silabas - 1)) / silabas;
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.connect(fx);
    const lfo = ac.createOscillator();
    lfo.frequency.value = vibHz;
    const prof_ = ac.createGain();
    prof_.gain.value = vibCents;
    lfo.connect(prof_);
    const fin = t0 + total + 0.03;
    const voces: { osc: OscillatorNode; razon: number }[] = [];
    const nuevaVoz = (d: number, razon: number, vol: number) => {
      const osc = ac.createOscillator();
      osc.setPeriodicWave(this.onda(d));
      const g = ac.createGain();
      g.gain.value = vol;
      osc.connect(g).connect(env);
      prof_.connect(osc.detune);
      voces.push({ osc, razon });
    };
    nuevaVoz(duty, 1, 0.55);
    if (segundaVoz) nuevaVoz(duty2, 2 ** (intervalo / 12), 0.3);
    for (let j = 0; j < silabas; j++) {
      const ts = t0 + j * (dsil + hueco);
      const n = Math.max(2, Math.round(dsil / FOTOGRAMA));
      for (let i = 0; i < n; i++) {
        const f = Math.min(3000, Math.max(70, f0 * 2 ** ((saltos[j] + contorno(i / (n - 1))) / 12)));
        for (const v of voces) v.osc.frequency.setValueAtTime(f * v.razon, ts + i * FOTOGRAMA);
      }
      env.gain.setValueAtTime(0.0001, ts);
      env.gain.linearRampToValueAtTime(0.75, ts + 0.006);
      env.gain.setValueAtTime(0.75, ts + dsil * 0.35);
      env.gain.exponentialRampToValueAtTime(0.0001, ts + dsil);
    }
    if (ruido > 0 && this.ruidoBuf) {
      const src = ac.createBufferSource();
      src.buffer = this.ruidoBuf;
      src.loop = true;
      src.playbackRate.value = 0.2 + r() * 0.8;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = Math.min(6000, Math.max(900, f0 * 4));
      f.Q.value = 1.5;
      const g = ac.createGain();
      g.gain.value = ruido;
      src.connect(f).connect(g).connect(env);
      src.start(t0, r() * 0.5);
      src.stop(fin);
    }
    for (const v of voces) {
      v.osc.start(t0);
      v.osc.stop(fin);
    }
    lfo.start(t0);
    lfo.stop(fin);
    const ultima = voces[0].osc;
    ultima.onended = () => {
      env.disconnect();
    };
  }
}

/** FNV-1a: a 32-bit hash of a string. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small deterministic generator, 0–1. */
function azar(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The game's sound: one for the whole page. */
export const sonido = new Sonido();
