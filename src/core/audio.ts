// Tiny synthesized sound: UI cues. No audio files to load. (The constant
// ambience of filtered noise is gone: it was a hiss. Music and effects are next.)
// Phones only allow sound after a tap, so start() is called from the title screen.

export class Sound {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
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
