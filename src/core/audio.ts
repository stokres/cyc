// Sound: tiny synthesized UI cues, and the music (src/sonido/musica.ts), looped
// without a gap with Web Audio. Phones only allow sound after a tap, so start() is
// called from the title screen. Everything goes through one master gain (the
// menu's sound switch); the music has its own, a little lower. With the page
// hidden (another app, the phone locked) the whole thing is suspended.
import { MUSICA, type Pista } from '../sonido/musica';

/** Music level under the master (the cues are short and quiet). */
const NIVEL_MUSICA = 0.55;

export class Sound {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private sonando: { id: Pista; src: AudioBufferSourceNode; g: GainNode } | null = null;
  private cargas = new Map<Pista, Promise<AudioBuffer | null>>();
  /** Bumped by every request, so a track that finishes loading late does not start over another. */
  private turno = 0;
  private pendiente: Pista | null = null;
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
    if (this.pendiente) this.musica(this.pendiente);
  }

  /** Plays a track in a loop, fading in (and out whatever was playing). Same track: nothing. */
  musica(id: Pista) {
    const ac = this.ac;
    if (!ac || !this.bus) {
      this.pendiente = id;
      return;
    }
    if (this.sonando?.id === id) return;
    this.pararMusica(0.4);
    const turno = ++this.turno;
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
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = pista.inicio;
      src.loopEnd = Math.min(pista.fin, buf.duration);
      const g = ac.createGain();
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.5);
      src.connect(g).connect(this.bus);
      src.start(t, pista.inicio);
      this.sonando = { id, src, g };
    });
  }

  /** Fades the music out. */
  pararMusica(fundido = 0.8) {
    this.turno++;
    this.pendiente = null;
    const s = this.sonando;
    if (!s || !this.ac) return;
    this.sonando = null;
    const t = this.ac.currentTime;
    s.g.gain.cancelScheduledValues(t);
    s.g.gain.setValueAtTime(Math.max(0.0001, s.g.gain.value), t);
    s.g.gain.exponentialRampToValueAtTime(0.0001, t + fundido);
    s.src.stop(t + fundido + 0.05);
  }

  /** What is playing (scripts/playthrough.mjs). */
  get musicaActual() {
    return this.sonando?.id ?? null;
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
