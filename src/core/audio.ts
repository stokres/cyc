// Sound: tiny synthesized UI cues, and the music (src/sonido/musica.ts), looped
// without a gap with Web Audio. Phones only allow sound after a tap, so start() is
// called from the title screen. The music and the cues each have their own gain (the
// menu's two volumes), both into one master. With the page hidden (another app, the
// phone locked) the whole thing is suspended.
//
// Two kinds of music: the scene's (ambiente), asked for every frame as one layer or
// several, each with its volume and pan — Guille's radio, louder the closer he is; on
// Fran's street, the stroll giving way to the Río's rock as he nears its door — and a
// minigame's (musica), which plays alone while it lasts and then gives way to them again.
import { MUSICA, type Pista } from '../sonido/musica';

/** Music level under the master at full volume (the cues are short and quiet). */
const NIVEL_MUSICA = 0.55;
/** Level of the whole mix. */
const NIVEL_MASTER = 0.8;
/** The menu's volume (0–1) as gain: squared, so the slider's middle sounds like the middle. */
const curva = (v: number) => Math.max(0, Math.min(1, v)) ** 2;

/** The menu's two volumes. */
export type Volumen = 'musica' | 'efectos';
/**
 * Tracks kept decoded at once (docs/ESTILO.md, T5.11): keeping every track that had played
 * added up to 200 MB on a phone.
 */
const MAX_DECODIFICADAS = 3;
/**
 * Samples a second the sound runs at (and the music is decoded to). Web Audio holds a track
 * decoded, as 32-bit samples: at a phone's native 48 kHz in stereo that is 23 MB a minute,
 * whatever the MP3 weighed. At 24 kHz it is half, and on a phone nobody hears the difference
 * (everything up to 12 kHz is kept). The MP3s are made at 24 kHz too (tools/musica).
 */
const MUESTREO = 24000;

/** What a scene wants playing: a track, how loud (0–1) and where (-1 left, 1 right). */
export interface Ambiente {
  pista: Pista;
  volumen: number;
  pan?: number;
}

/** What a minigame needs from the sound: its music, in a loop while it lasts. */
export interface SonidoMinijuego {
  musica(id: Pista): void;
  pararMusica(fundido?: number): void;
}

/** A track playing, or still loading (no source yet). */
interface Capa {
  id: Pista;
  src: AudioBufferSourceNode | null;
  g: GainNode | null;
  pan: StereoPannerNode | null;
  volumen: number;
  panActual: number;
  /** When its volume or pan last changed (ms): each change is an automation event. */
  cambio: number;
}

export class Sound {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private fx: GainNode | null = null;
  /** Music and cues, 0–1, as set in the menu. */
  private volumen: Record<Volumen, number> = { musica: 0.7, efectos: 1 };
  /** Every track playing or on its way: the scene's layers, or the minigame's. */
  private capas = new Map<Pista, Capa>();
  private cargas = new Map<Pista, Promise<AudioBuffer | null>>();
  private usos = new Map<Pista, number>();
  private reloj = 0;
  private bytes = new Map<Pista, number>();
  private primerPlano: Pista | null = null;
  private deseado: Ambiente[] = [];

  start() {
    if (this.ac) {
      void this.ac.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    this.fx.gain.value = curva(this.volumen.efectos);
    this.fx.connect(this.master);
    document.addEventListener('visibilitychange', () => void (document.visibilityState === 'hidden' ? ac.suspend() : ac.resume()));
    // Music asked for before the first tap starts now.
    if (this.primerPlano) this.reproducir(this.primerPlano, 1, 0);
    else for (const d of this.deseado) this.reproducir(d.pista, d.volumen, d.pan ?? 0);
  }

  /** A minigame's music: plays alone, in a loop, until pararMusica(). */
  musica(id: Pista) {
    this.primerPlano = id;
    for (const c of [...this.capas.values()]) if (c.id !== id) this.callar(c.id, 0.4);
    const c = this.capas.get(id);
    if (c) this.ajustar(c, 1, 0, true);
    else this.reproducir(id, 1, 0);
  }

  /** The minigame's music fades out, and the scene's comes back. */
  pararMusica(fundido = 0.8) {
    const id = this.primerPlano;
    this.primerPlano = null;
    if (id && !this.deseado.some((d) => d.pista === id)) this.callar(id, fundido);
    this.ambiente(this.deseado);
  }

  /**
   * The scene's music, every frame: one layer, several or none. A layer already playing
   * only changes its volume and pan (smoothly); a new one fades in; one no longer asked
   * for stops quickly, like a radio switched off.
   */
  ambiente(m: Ambiente | Ambiente[] | null) {
    const lista = !m ? [] : Array.isArray(m) ? m : [m];
    this.deseado = lista;
    if (this.primerPlano || !this.ac) return;
    for (const c of [...this.capas.values()]) if (!lista.some((d) => d.pista === c.id)) this.callar(c.id, 0.2);
    for (const d of lista) {
      const c = this.capas.get(d.pista);
      if (c) this.ajustar(c, d.volumen, d.pan ?? 0);
      else this.reproducir(d.pista, d.volumen, d.pan ?? 0);
    }
  }

  private ajustar(c: Capa, volumen: number, pan: number, ya = false) {
    if (!c.g || !this.ac) {
      // still loading: it starts at the latest volume and pan
      c.volumen = volumen;
      c.panActual = pan;
      return;
    }
    // At most ten changes a second (the scene asks every frame); they glide anyway.
    const ahora = performance.now();
    if (!ya && ahora - c.cambio < 100) return;
    const t = this.ac.currentTime;
    if (Math.abs(volumen - c.volumen) > 0.01 || Math.abs(pan - c.panActual) > 0.02) c.cambio = ahora;
    if (Math.abs(volumen - c.volumen) > 0.01) {
      c.volumen = volumen;
      c.g.gain.setTargetAtTime(Math.max(0.0001, volumen), t, 0.15);
    }
    if (c.pan && Math.abs(pan - c.panActual) > 0.02) {
      c.panActual = pan;
      c.pan.pan.setTargetAtTime(pan, t, 0.15);
    }
  }

  private callar(id: Pista, fundido: number) {
    const c = this.capas.get(id);
    if (!c) return;
    this.capas.delete(id);
    if (!c.src || !c.g || !this.ac) return; // still loading: once loaded it sees it is not wanted
    const t = this.ac.currentTime;
    c.g.gain.cancelScheduledValues(t);
    c.g.gain.setValueAtTime(Math.max(0.0001, c.g.gain.value), t);
    c.g.gain.exponentialRampToValueAtTime(0.0001, t + fundido);
    c.src.stop(t + fundido + 0.05);
  }

  /** Resolves once this track has loaded (at once without sound): for what must start on its beat (the trailer). */
  async lista(id: Pista) {
    if (this.ac) await this.cargar(id, this.ac);
  }

  /** Fetches and decodes a track ahead of time, so it starts at once when asked for. */
  precargar(id: Pista) {
    if (this.ac) this.cargar(id, this.ac);
  }

  private cargar(id: Pista, ac: AudioContext) {
    let carga = this.cargas.get(id);
    if (!carga) {
      carga = fetch(MUSICA[id].url)
        .then((r) => r.arrayBuffer())
        .then((b) => ac.decodeAudioData(b))
        .then((buf) => (this.bytes.set(id, buf.length * buf.numberOfChannels * 4), buf))
        .catch(() => null);
      this.cargas.set(id, carga);
    }
    this.usos.set(id, ++this.reloj);
    this.recortar();
    return carga;
  }

  /** Forgets the least recently used decoded tracks that are not playing, past MAX_DECODIFICADAS. */
  private recortar() {
    while (this.cargas.size > MAX_DECODIFICADAS) {
      let viejo: Pista | null = null;
      for (const id of this.cargas.keys()) if (!this.capas.has(id) && (viejo === null || (this.usos.get(id) ?? 0) < (this.usos.get(viejo) ?? 0))) viejo = id;
      if (viejo === null) return;
      this.cargas.delete(viejo);
      this.usos.delete(viejo);
      this.bytes.delete(viejo);
    }
  }

  /** Decoded music kept, in megabytes (scripts/rendimiento.mjs). */
  get memoriaMusica() {
    let b = 0;
    for (const v of this.bytes.values()) b += v;
    return Math.round(b / 1e6);
  }

  /** Fades this track in, in a loop, once it has loaded — unless it was dropped meanwhile. */
  private reproducir(id: Pista, volumen: number, pan: number) {
    const ac = this.ac;
    if (!ac || !this.bus) return;
    const capa: Capa = { id, src: null, g: null, pan: null, volumen, panActual: pan, cambio: 0 };
    this.capas.set(id, capa);
    const pista = MUSICA[id];
    void this.cargar(id, ac).then((buf) => {
      if (!buf || this.capas.get(id) !== capa || !this.bus) return;
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = pista.inicio;
      src.loopEnd = Math.min(pista.fin, buf.duration);
      const g = ac.createGain();
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, capa.volumen), t + 0.5);
      const p = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
      if (p) {
        p.pan.value = capa.panActual;
        src.connect(g).connect(p).connect(this.bus);
      } else src.connect(g).connect(this.bus);
      src.start(t, 'entrada' in pista ? pista.entrada : pista.inicio);
      Object.assign(capa, { src, g, pan: p });
    });
  }

  /** Every track playing and how loud (scripts/playthrough.mjs). */
  get musicas(): Partial<Record<Pista, number>> {
    return Object.fromEntries([...this.capas.values()].filter((c) => c.src).map((c) => [c.id, c.volumen]));
  }
  /** The loudest track playing (the minigame's while there is one), and its volume. */
  get musicaActual(): Pista | null {
    let mejor: Capa | null = null;
    for (const c of this.capas.values()) if (c.src && (!mejor || c.volumen > mejor.volumen)) mejor = c;
    return mejor?.id ?? null;
  }
  get volumenMusica() {
    const id = this.musicaActual;
    return id ? this.capas.get(id)!.volumen : 0;
  }

  /** The menu's music or effects volume, 0–1 (it can be changed before the sound starts). */
  setVolumen(que: Volumen, v: number) {
    this.volumen[que] = v;
    const g = que === 'musica' ? this.bus : this.fx;
    if (g && this.ac) g.gain.setTargetAtTime(que === 'musica' ? NIVEL_MUSICA * curva(v) : curva(v), this.ac.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slide = 0) {
    const ac = this.ac;
    if (!ac || !this.fx) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.fx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  tap() {
    this.tone(880, 0.06, 'triangle', 0.05);
  }
  step() {
    this.tone(120, 0.05, 'sine', 0.03, 0, 0.6);
  }
  pickup() {
    [660, 880, 1320].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.08, i * 0.07));
  }
  nope() {
    this.tone(220, 0.16, 'square', 0.03, 0, 0.7);
  }
  splash() {
    this.tone(500, 0.25, 'sine', 0.07, 0, 0.3);
    this.tone(900, 0.12, 'triangle', 0.03, 0.03, 0.5);
  }
  slosh(k: number) {
    this.tone(160 + k * 80, 0.12, 'sine', 0.02 + k * 0.03, 0, 0.7);
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.08, i * 0.11));
  }
  lose() {
    [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.07, i * 0.14));
  }
  clink() {
    this.tone(2600, 0.35, 'sine', 0.06);
    this.tone(3400, 0.25, 'sine', 0.04, 0.02);
  }
}
