# «Impropios Kart» race music (October 2026): a Mario Kart (SNES) parody that happens in a country house with a
# drag party in it. Happy, 16-bit, 150 bpm, C major, 32 bars that loop (A B A' B'): a pulse-wave lead with a
# vibrato, an octave-bouncing triangle bass, house kick on every beat with claps on two and four and open hats
# between (the drag party), a strummed pluck on the off-beats in the A parts (the country house: a guitar a
# neighbour left on the sofa), organ stabs and sixteenth arpeggios in the B parts, and bells from the disco ball at
# the end of every eight bars.
#
# numpy only (it reuses brio.py's helpers; sinte.py needs scipy), every sound is circular so the round loops:
#
#   python3 kart.py [salida]    -> ../../src/sonido/kart-carrera.mp3  (the game plays it between 0.5 s and the round's end + 0.5 s)
import os
import sys

import numpy as np

from brio import SR, db, escribir_wav, exportar, frase, hz, midi, panear, poner  # noqa: F401

BPM = 150
BEAT = 60.0 / BPM
BARS = 32
N = int(round(BARS * 4 * BEAT * SR))
RNG = np.random.default_rng(7)
SIX = BEAT / 4                       # a sixteenth, in seconds


def en(beats):
    """Sample of a position in beats."""
    return int(round(beats * BEAT * SR))


# ---------------------------------------------------------------------------------------------- voices

def env(n, att, dec, sus, rel, gate):
    """ADSR over n samples; the key goes up at sample `gate`."""
    t = np.arange(n) / SR
    e = np.where(t < att, t / att, sus + (1 - sus) * np.exp(-(t - att) / dec))
    g = gate / SR
    fin = np.exp(-np.maximum(0, t - g) / rel)
    return e * np.where(t < g, 1.0, fin)


def pulso(m, dur, duty=0.25, vib=0.0, att=0.003, dec=0.12, sus=0.7, rel=0.05):
    """A band-limited pulse wave (sum of harmonics) with an optional delayed vibrato (cents)."""
    n = int((dur + rel * 5) * SR)
    t = np.arange(n) / SR
    f = hz(m) * (1 + (vib / 1200 * np.log(2)) * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.12) / 0.15, 0, 1))
    ph = 2 * np.pi * np.cumsum(f) / SR
    nh = int(min(40, 11000 / hz(m)))
    y = np.zeros(n)
    for h in range(1, nh + 1):
        a = np.sin(np.pi * h * duty) / h
        if abs(a) > 1e-4:
            y += a * np.cos(h * ph - np.pi * h * duty)
    return y * env(n, att, dec, sus, rel, int(dur * SR))


def triangulo(m, dur, att=0.002, dec=0.1, sus=0.9, rel=0.03):
    n = int((dur + rel * 5) * SR)
    ph = np.cumsum(np.full(n, hz(m) / SR))
    y = 2 * np.abs(2 * (ph % 1) - 1) - 1
    return y * env(n, att, dec, sus, rel, int(dur * SR))


def campana(m, dur=0.5):
    """A bell for the disco ball: two sines with a fast inharmonic partial."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 14) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 25)
    return y * np.exp(-t * 7) * np.minimum(1, t / 0.002)


def pulsado(m, dur=0.5, brillo=0.45):
    """A plucked string (Karplus-Strong by blocks)."""
    p = int(round(SR / hz(m)))
    n = int(dur * SR)
    y = np.zeros(n + p + 2)
    y[:p] = RNG.uniform(-1, 1, p)
    y[:p] -= y[:p].mean()
    for i in range(p, n + 1, p):
        a = y[i - p:i]
        b = np.concatenate([[y[i - p - 1] if i - p - 1 >= 0 else 0.0], a[:-1]])
        y[i:i + p] = ((1 - brillo) * a + brillo * b)[:len(y[i:i + p])] * 0.994
    y = y[:n]
    return y * np.minimum(1, np.arange(n) / 60)


def ruido(n):
    return RNG.uniform(-1, 1, n)


def bombo():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 + 130 * np.exp(-t * 34)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    y += 0.4 * ruido(n) * np.exp(-t * 400)
    return y


def caja():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    r = ruido(n)
    r = np.diff(r, prepend=0)
    return 0.6 * r * np.exp(-t * 22) + 0.5 * np.sin(2 * np.pi * 195 * t) * np.exp(-t * 28)


def palmada():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    r = np.diff(ruido(n), prepend=0)
    y = np.zeros(n)
    for d in (0.0, 0.011, 0.023):
        k = int(d * SR)
        y[k:] += r[:n - k] * np.exp(-t[:n - k] * 90) * 0.5
    y += r * np.exp(-t * 20) * 0.35
    return y


def charles(abierto=False):
    n = int((0.22 if abierto else 0.05) * SR)
    t = np.arange(n) / SR
    r = np.diff(ruido(n), n=2, prepend=[0, 0])
    return r * np.exp(-t * (16 if abierto else 85)) * 0.5


# ---------------------------------------------------------------------------------------------- score

INTERV = {'': (0, 4, 7), 'm': (0, 3, 7)}
RAIZ = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9}


def acorde(nombre, base):
    """Notes of a chord: `base` is the midi of the C of the octave to put the root in."""
    r = RAIZ[nombre[0]] + base
    return [r + i for i in INTERV[nombre[1:]]]


PROG = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G',
        'F', 'C', 'Dm', 'G', 'F', 'Em', 'Dm', 'G']
PROG = PROG + PROG

TEMA_A = frase(
    'E5:2 G5:2 C6:4 B5:2 G5:2 A5:4 | G5:2 B5:2 D6:4 C6:2 B5:2 G5:4 | A5:2 C6:2 E6:4 D6:2 C6:2 A5:4 | F5:2 A5:2 C6:4 B5:2 A5:2 G5:2 F5:2 |'
    'E5:2 G5:2 C6:4 E6:4 D6:2 C6:2 | D6:2 B5:2 G5:4 B5:2 D6:2 G6:4 | A5:4 C6:4 F6:4 E6:2 D6:2 | D6:6 B5:2 G5:4 -:4')
TEMA_B = frase(
    'A5:4 C6:2 A5:2 F5:4 A5:4 | G5:4 E5:2 G5:2 C6:8 | D6:4 A5:2 D6:2 F6:4 E6:2 D6:2 | B5:4 G5:2 B5:2 D6:8 |'
    'C6:4 A5:2 C6:2 F6:4 C6:4 | B5:4 G5:2 B5:2 E6:8 | F6:2 E6:2 D6:4 A5:4 D6:4 | G5:2 A5:2 B5:2 C6:2 D6:2 E6:2 F6:2 G6:2')


def bateria(buf, t0, compases, modo):
    K, S, P, H, O = bombo(), caja(), palmada(), charles(), charles(True)
    for c in range(compases):
        b = t0 + c * 4
        for beat in range(4):
            if modo != 'solo-caja':
                poner(buf, en(b + beat), K, (0.95, 0.95))
            if modo == 'lleno' and beat in (1, 3):
                poner(buf, en(b + beat), P, (0.55, 0.6))
                poner(buf, en(b + beat), S, (0.4, 0.4))
            poner(buf, en(b + beat + 0.5), O if modo == 'lleno' else H, (0.5, 0.55))
            if modo == 'lleno':
                poner(buf, en(b + beat + 0.25), H, (0.22, 0.28))
                poner(buf, en(b + beat + 0.75), H, (0.28, 0.22))
            elif beat in (1, 3):
                poner(buf, en(b + beat), S, (0.45, 0.45))


def relleno(buf, b0):
    """The last beat of a phrase: snare in sixteenths with a crescendo."""
    S = caja()
    for i in range(4):
        poner(buf, en(b0 + i * 0.25), S, (0.25 + 0.12 * i,) * 2)


def bajo(buf, t0, compases, saltarin=True):
    for c in range(compases):
        ch = PROG[(t0 // 4 + c) % len(PROG)]
        r = RAIZ[ch[0]] + 36                                   # C2
        for i in range(8):
            m = r + (12 if (i % 2 and saltarin) else 0)
            w = triangulo(m + (12 if m < 38 else 0), BEAT * 0.46)
            poner(buf, en(t0 + c * 4 + i * 0.5), w * 0.55, (0.8, 0.8))


def rasgueo(buf, t0, compases):
    """The off-beat strum of the country guitar (down-up-down-up on the 'and's)."""
    for c in range(compases):
        ch = PROG[(t0 // 4 + c) % len(PROG)]
        notas = acorde(ch, 60) + [acorde(ch, 60)[0] + 12]
        for k, pos in enumerate((0.5, 1.5, 2.5, 3.5)):
            orden = notas if k % 2 == 0 else notas[::-1]
            for j, m in enumerate(orden):
                poner(buf, en(t0 + c * 4 + pos) + int(j * 0.006 * SR), pulsado(m, 0.45) * 0.3, (0.9, 0.5))


def estocadas(buf, t0, compases):
    """House organ stabs on the off-beat."""
    for c in range(compases):
        ch = PROG[(t0 // 4 + c) % len(PROG)]
        for pos in (0.5, 1.5, 2.5, 3.5):
            for m in acorde(ch, 60):
                poner(buf, en(t0 + c * 4 + pos), pulso(m, BEAT * 0.2, 0.5, 0, 0.002, 0.05, 0.4, 0.04) * 0.11, (0.5, 0.9))


def arpegios(buf, t0, compases):
    for c in range(compases):
        ch = PROG[(t0 // 4 + c) % len(PROG)]
        ns = acorde(ch, 72)
        orden = [ns[0], ns[1], ns[2], ns[1]] * 4
        for i in range(16):
            poner(buf, en(t0 + c * 4 + i * 0.25), pulso(orden[i], SIX * 0.8, 0.125, 0, 0.001, 0.05, 0.3, 0.02) * 0.1, (0.35, 0.8))


def lead(buf, t0, notas, vol=0.25, duty=0.25, octava=0, tercera=False):
    for b, d, m in notas:
        w = pulso(m + octava, d * BEAT * 0.94, duty, 14)
        poner(buf, en(t0 + b), w * vol, (0.72, 0.72))
        if tercera:
            poner(buf, en(t0 + b), pulso(m - 4, d * BEAT * 0.94, 0.125, 10) * vol * 0.4, (0.9, 0.35))


def campanas(buf, t0):
    """The disco ball at the end of a phrase: a quick rising run up high."""
    for i, m in enumerate(('C7', 'E7', 'G7', 'C8', 'G7', 'E7', 'G7', 'C8')):
        poner(buf, en(t0 + i * 0.125), campana(midi(m), 0.5) * 0.09, (0.5 + 0.06 * i, 1.0 - 0.06 * i))


def eco_anillo(x, d_beats, veces=3, fb=0.34, nivel=0.3):
    """A delay that wraps round the ring so the loop stays seamless."""
    y = x.copy()
    for k in range(1, veces + 1):
        y += np.roll(x, en(d_beats * k), axis=-1) * (nivel * fb ** (k - 1))
    return y


def sala(x):
    """A short, bright room: a few early reflections round the ring."""
    y = x.copy()
    for d, g, p in ((0.0113, 0.22, 1), (0.0197, 0.17, -1), (0.0291, 0.12, 1), (0.0413, 0.09, -1)):
        r = np.roll(x, int(d * SR), axis=-1) * g
        if p < 0:
            r = r[::-1]
        y += r
    return y


def componer():
    voz = np.zeros((2, N))
    mel = np.zeros((2, N))
    ritmo = np.zeros((2, N))
    # 1-8 A: country guitar and a light kit; 9-16 B: stabs, arpeggios; 17-24 A': both, lead doubled; 25-32 B': all
    bateria(ritmo, 0, 4, 'medio')
    bateria(ritmo, 16, 4, 'lleno')
    bateria(ritmo, 32, 8, 'lleno')
    bateria(ritmo, 64, 8, 'lleno')
    bateria(ritmo, 96, 8, 'lleno')
    for b0 in (28, 60, 92, 124):
        relleno(ritmo, b0)
    bajo(voz, 0, 32)
    rasgueo(voz, 0, 16)
    rasgueo(voz, 64, 16)
    estocadas(voz, 32, 16)
    estocadas(voz, 96, 16)
    arpegios(voz, 32, 16)
    arpegios(voz, 64, 8)
    arpegios(voz, 96, 16)
    lead(mel, 0, TEMA_A)
    lead(mel, 32, TEMA_B)
    lead(mel, 64, TEMA_A, 0.22, 0.25, 0, True)
    lead(mel, 64, TEMA_A, 0.12, 0.5, -12)
    lead(mel, 96, TEMA_B, 0.22, 0.25, 0, True)
    lead(mel, 96, TEMA_B, 0.12, 0.5, -12)
    for t0 in (30, 62, 94, 126):
        campanas(voz, t0 + 1.0 if t0 == 30 else t0 + 1.0)
    mel = eco_anillo(mel, 0.75, 3, 0.4, 0.28)
    voz = sala(voz)
    x = voz * 0.9 + mel * 1.4 + ritmo * 0.75
    return x


if __name__ == '__main__':
    salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'sonido', 'kart-carrera.mp3')
    x = componer()
    assert x.shape[1] == N
    exportar(x, -16.0, salida)
    print(f'loop: inicio 0.5, fin {N / SR + 0.5:.6f}')
