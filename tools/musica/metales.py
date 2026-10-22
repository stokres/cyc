# Brass, drums and bits for the chapter 2 pieces (canto.py, tragaperras.py): the same pure synthesis as
# trailer.py (sinte's oscillators, filters and hall; no SoundFont), as a small `Mezcla` you place
# sounds on at a time in seconds. The voices are the trailer's: `metal` (the brass stab of the chant),
# `taiko`, `para`, `campanas`, `monedas`... but on a buffer of their own, so a piece can be built
# without running the whole trailer.
import numpy as np
from sinte import SR, _fase, _blep, _filtro, _sala, ruido, seno, campana, golpe, hz, midi, db, _master

# The chant's chords, the trailer's (D minor): «Ca-mio» D minor, «neees» G minor, the rest A major
# until «naaas» comes home to D minor.
RE = ['D3', 'F3', 'A3', 'D4']
SOL = ['D3', 'G3', 'Bb3', 'D4']
LA = ['C#3', 'E3', 'A3', 'E4']


def sierra(f):
    """Band-limited sawtooth (PolyBLEP), peak 1."""
    fase, dt = _fase(np.asarray(f, dtype=float))
    return 2 * fase - 1 - _blep(fase, dt)


def env(nm, a, tau, fin=0.05):
    """Attack `a`, then an exponential decay with time constant `tau`, and a short fade at the very end."""
    t = np.arange(nm) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / tau)
    k = int(fin * SR)
    e[-k:] *= np.linspace(1, 0, k)
    return e


class Mezcla:
    """A buffer of `total` seconds: what is placed on it, and what of that goes to the hall."""

    def __init__(self, total):
        self.x = np.zeros(int(total * SR))
        self.envio = np.zeros_like(self.x)

    def poner(self, t, w, vol=1.0, reverb=0.25):
        i0 = int(round(t * SR))
        if i0 >= len(self.x) or i0 + len(w) <= 0:
            return
        a = max(0, -i0)  # a sound that starts before the buffer is cut
        i1 = min(len(self.x), i0 + len(w))
        self.x[i0 + a:i1] += w[a:i1 - i0] * vol
        self.envio[i0 + a:i1] += w[a:i1 - i0] * vol * reverb

    # ------------------------------------------------------------ brass

    def metal(self, t, dur, notas, vol=0.4, brillo=3200):
        """A brass stab (trailer.py): a chord of detuned saws with a filter that snaps open and shut."""
        nm = int((dur + 0.4) * SR)
        w = np.zeros(nm)
        for m in notas:
            for det in (-8, 0, 7):
                w += sierra(np.full(nm, hz(midi(m) + det / 100)))
        w /= len(notas) * 3
        abre = _filtro(w, 'lowpass', brillo, 2) * env(nm, 0.008, 0.09)
        cuerpo = _filtro(w, 'lowpass', 1100, 2) * env(nm, 0.02, max(0.12, dur * 0.6))
        self.poner(t, np.tanh(1.5 * (abre + cuerpo)), vol, reverb=0.35)

    def tuba(self, t, dur, nota, vol=0.3):
        """The pasodoble's bass: a dark saw with a round attack."""
        nm = int((dur + 0.1) * SR)
        f = np.full(nm, hz(midi(nota)))
        w = _filtro(sierra(f) + 0.6 * seno(f) * 2, 'lowpass', 520, 2) * env(nm, 0.012, dur * 0.55)
        self.poner(t, np.tanh(1.3 * w), vol, reverb=0.12)

    def cuerno(self, t, dur, notas, vol=0.16):
        """The «pah» of the pasodoble: short horns on the off-beat."""
        nm = int((dur + 0.15) * SR)
        w = np.zeros(nm)
        for m in notas:
            for det in (-6, 6):
                w += sierra(np.full(nm, hz(midi(m) + det / 100)))
        w = _filtro(w / (len(notas) * 2), 'lowpass', 2200, 2) * env(nm, 0.008, 0.08)
        self.poner(t, w, vol, reverb=0.2)

    def silbato(self, t, dur, nota, vol=0.2):
        """A bright lead for a short call: one brass voice, no chord."""
        self.metal(t, dur, [nota, midi(nota) - 12], vol, brillo=4200)

    # ------------------------------------------------------------ drums

    def taiko(self, t, vel=1.0, semilla=0):
        nm = int(0.9 * SR)
        tt = np.arange(nm) / SR
        f = 52 + 95 * np.exp(-tt / 0.04)
        cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.32)
        piel = _filtro(_filtro(ruido(nm, semilla=semilla), 'lowpass', 1800), 'highpass', 150) * np.exp(-tt / 0.03) * 0.7
        self.poner(t, np.tanh(1.8 * (cuerpo + piel)) * vel, 0.5, reverb=0.4)

    def bombo(self, t, vel=100, vol=0.5):
        self.poner(t, golpe('bombo', vel), vol, reverb=0.2)

    def caja(self, t, vel=1.0, vol=0.3, semilla=0):
        """A marching snare: a rattle of noise over a short drum tone."""
        nm = int(0.2 * SR)
        tt = np.arange(nm) / SR
        r = _filtro(_filtro(ruido(nm, semilla=semilla), 'highpass', 1500), 'lowpass', 8000) * np.exp(-tt / 0.05)
        tono = np.sin(2 * np.pi * np.cumsum(205 + 70 * np.exp(-tt / 0.02)) / SR) * np.exp(-tt / 0.035) * 0.6
        self.poner(t, np.tanh(1.4 * (1.2 * r + tono)) * vel, vol, reverb=0.2)

    def crash(self, t, vol=0.2, vel=120):
        self.poner(t, golpe('crash', vel), vol, reverb=0.4)

    def charles(self, t, vol=0.12, abierto=False):
        self.poner(t, golpe('abierto' if abierto else 'charles', 100), vol, reverb=0.1)

    def castanuela(self, t, vol=0.14, semilla=0):
        self.poner(t, golpe('clic', 90, semilla=semilla % 5), vol, reverb=0.1)

    # ------------------------------------------------------------ the slot machine (trailer.py's)

    def rodillos(self, t0, t1, vol=0.18, paso=0.045):
        """The reels spinning: a fast rattle of ticks."""
        t = t0
        k = 0
        while t < t1:
            self.poner(t, golpe('clic', 70, semilla=k % 5), vol, reverb=0.1)
            t += paso
            k += 1

    def para(self, t, vol=0.4):
        """A reel stopping: a heavy mechanical clunk."""
        nm = int(0.2 * SR)
        tt = np.arange(nm) / SR
        w = np.sin(2 * np.pi * np.cumsum(110 + 160 * np.exp(-tt / 0.01)) / SR) * np.exp(-tt / 0.04)
        w += 0.5 * _filtro(_filtro(ruido(nm, semilla=31), 'highpass', 1200), 'lowpass', 2600) * np.exp(-tt / 0.012)
        self.poner(t, np.tanh(2 * w), vol, reverb=0.2)

    def campanas(self, t, vol=0.2):
        """The jackpot: bells running up and down a D major arpeggio, twice."""
        notas = ['D5', 'F#5', 'A5', 'D6', 'A5', 'F#5', 'D6', 'F#6']
        for k, nota in enumerate(notas):
            nm = int(0.9 * SR)
            self.poner(t + k * 0.065, campana(np.full(nm, hz(midi(nota))), razon=3.5, indice=1.6, tau=0.25) * env(nm, 0.002, 0.35), vol, reverb=0.35)

    def monedas(self, t0, dur, vol=0.16, semilla=1, densidad=38):
        """Coins pouring into the tray: a shower of tiny metal clinks."""
        r = np.random.default_rng(semilla)
        nm = int(0.12 * SR)
        tt = np.arange(nm) / SR
        for t in np.sort(r.uniform(t0, t0 + dur, int(dur * densidad))):
            f = r.uniform(3200, 6200)
            w = (np.sin(2 * np.pi * f * tt) + 0.6 * np.sin(2 * np.pi * f * 1.48 * tt)) * np.exp(-tt / r.uniform(0.02, 0.05))
            self.poner(t, w, vol * r.uniform(0.4, 1.0), reverb=0.25)

    def nota_dulce(self, t, nota, vol=0.2, tau=0.3):
        """A soft bell-like note (a marimba's plonk): for the little «nothing this time» of the plain spin."""
        nm = int(0.8 * SR)
        f = np.full(nm, hz(midi(nota)))
        w = (seno(f) * 2 + 0.35 * seno(f * 3.97) * np.exp(-np.arange(nm) / SR / 0.06)) * env(nm, 0.003, tau)
        self.poner(t, w, vol, reverb=0.25)

    # ------------------------------------------------------------ out

    def sonido(self, rt=1.6):
        """The dry sound plus the hall, in stereo (2, n)."""
        seco = self.x[None, :].repeat(2, axis=0)
        sala = _sala(self.envio[None, :].repeat(2, axis=0), rt=rt)
        y = seco + sala
        return np.stack([_filtro(_filtro(canal, 'highpass', 28), 'lowpass', 11000, 4) for canal in y])


def a_mp3(y, salida, pico=0.8, mono=False):
    """A one-shot sound as MP3 at 24 kHz and 96 kbps (the game decodes at 24 kHz: docs/ESTILO.md, T5.11), peak `pico`."""
    import os
    import subprocess
    import tempfile
    from sinte import _wav
    y = y * (pico / max(1e-9, np.max(np.abs(y))))
    y = _master(y, 1.0)
    with tempfile.TemporaryDirectory() as d:
        ruta = os.path.join(d, 'sonido.wav')
        _wav(ruta, y)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ruta, *(['-ac', '1'] if mono else []), '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '96k', salida], check=True)
    print(f'{salida}: {y.shape[1] / SR:.2f} s, pico {np.max(np.abs(y)):.2f}')
