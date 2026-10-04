// Sound: tiny synthesized UI cues, and the music (src/sonido/musica.ts), looped
// without a gap with Web Audio. Phones only allow sound after a tap, so start() is
// called from the title screen. Everything goes through one master gain (the
// menu's sound switch); the music has its own, a little lower. With the page
// hidden (another app, the phone locked) the whole thing is suspended.
//
// Two kinds of music: the scene's (ambiente), asked for every frame with its
// volume and pan — Guille's radio, louder the closer he is — and a minigame's
// (musica), which plays over it while it lasts and then gives way to it again.
import { MUSICA, type Pista } from '../sonido/musica';

/** Music level under the master (the cues are short and quiet). */
const NIVEL_MUSICA = 0.55;

/** What a scene wants playing: a track, how loud (0–1) and where (-1 left, 1 right). */
export interface Ambiente {
  pista: Pista;
  volumen: number;
  pan?: number;
}

interface Sonando {
  id: Pista;
  src: AudioBufferSourceNode;
  g: GainNode;
  pan: StereoPannerNode | null;
  volumen: number;
  panActual: number;
}

export class Sound {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private sonando: Sonando | null = null;
  private cargas = new Map<Pista, Promise<AudioBuffer | null>>();
  /** Bumped by every change, so a track that finishes loading late does not start over another. */
  private turno = 0;
  private primerPlano: Pista | null = null;
  private deseado: Ambiente | null = null;
  /** A track on its way (loading): asking for it again must not restart the load. */
  private pidiendo: Pista | null = null;
  muted = false;

  start() {
    if (this.ac) {
      void this.ac.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    this.ac = ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ac.destination);
    this.bus = ac.createGain();
    this.bus.gain.value = NIVEL_MUSICA;
    this.bus.connect(this.master);
    document.addEventListener('visibilitychange', () => void (document.visibilityState === 'hidden' ? ac.suspend() : ac.resume()));
    // Music asked for before the first tap starts now.
    if (this.primerPlano) this.reproducir(this.primerPlano, 1, 0);
    else if (this.deseado) this.reproducir(this.deseado.pista, this.deseado.volumen, this.deseado.pan ?? 0);
  }

  /** A minigame's music: plays in a loop over the scene's until pararMusica(). */
  musica(id: Pista) {
    this.primerPlano = id;
    if ((this.sonando?.id ?? this.pidiendo) === id) return;
    this.reproducir(id, 1, 0);
  }

  /** The minigame's music fades out, and the scene's (if any) comes back. */
  pararMusica(fundido = 0.8) {
    this.primerPlano = null;
    const d = this.deseado;
    if (d) this.reproducir(d.pista, d.volumen, d.pan ?? 0, fundido);
    else this.callar(fundido);
  }

  /**
   * The scene's music, every frame: the same track only changes its volume and pan
   * (smoothly); another track crossfades; null stops it — quickly, like a radio switched off.
   */
  ambiente(m: Ambiente | null) {
    this.deseado = m;
    if (this.primerPlano || !this.ac) return;
    const s = this.sonando;
    if (!m) {
      if (s || this.pidiendo) this.callar(0.2);
      return;
    }
    if ((s?.id ?? this.pidiendo) !== m.pista) {
      this.reproducir(m.pista, m.volumen, m.pan ?? 0);
      return;
    }
    if (!s) return; // still loading: it starts at the latest volume
    const t = this.ac.currentTime;
    if (Math.abs(m.volumen - s.volumen) > 0.01) {
      s.volumen = m.volumen;
      s.g.gain.setTargetAtTime(Math.max(0.0001, m.volumen), t, 0.15);
    }
    const p = m.pan ?? 0;
    if (s.pan && Math.abs(p - s.panActual) > 0.02) {
      s.panActual = p;
      s.pan.pan.setTargetAtTime(p, t, 0.15);
    }
  }

  private callar(fundido: number) {
    this.turno++;
    this.pidiendo = null;
    const s = this.sonando;
    if (!s || !this.ac) return;
    this.sonando = null;
    const t = this.ac.currentTime;
    s.g.gain.cancelScheduledValues(t);
    s.g.gain.setValueAtTime(Math.max(0.0001, s.g.gain.value), t);
    s.g.gain.exponentialRampToValueAtTime(0.0001, t + fundido);
    s.src.stop(t + fundido + 0.05);
  }

  /** Fades out whatever plays and fades this track in, in a loop, once it has loaded. */
  private reproducir(id: Pista, volumen: number, pan: number, fundido = 0.4) {
    const ac = this.ac;
    if (!ac || !this.bus) return;
    this.callar(fundido);
    const turno = this.turno;
    this.pidiendo = id;
    const pista = MUSICA[id];
    let carga = this.cargas.get(id);
    if (!carga) {
      carga = fetch(pista.url)
        .then((r) => r.arrayBuffer())
        .then((b) => ac.decodeAudioData(b))
        .catch(() => null);
      this.cargas.set(id, carga);
    }
    void carga.then((buf) => {
      if (!buf || turno !== this.turno || !this.bus) return;
      this.pidiendo = null;
      // The scene may have moved on while it loaded: its latest volume and pan.
      if (this.primerPlano !== id && this.deseado?.pista === id) {
        volumen = this.deseado.volumen;
        pan = this.deseado.pan ?? 0;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = pista.inicio;
      src.loopEnd = Math.min(pista.fin, buf.duration);
      const g = ac.createGain();
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volumen), t + 0.5);
      const p = typeof ac.createStereoPanner === 'function' ? ac.createStereoPanner() : null;
      if (p) {
        p.pan.value = pan;
        src.connect(g).connect(p).connect(this.bus);
      } else src.connect(g).connect(this.bus);
      src.start(t, pista.inicio);
      this.sonando = { id, src, g, pan: p, volumen, panActual: pan };
    });
  }

  /** What is playing (scripts/playthrough.mjs), and how loud. */
  get musicaActual() {
    return this.sonando?.id ?? null;
  }
  get volumenMusica() {
    return this.sonando?.volumen ?? 0;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ac) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ac.currentTime, 0.05);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slide = 0) {
    const ac = this.ac;
    if (!ac || !this.master) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
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
