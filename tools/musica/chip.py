# Minigame chiptune: an 8-bit console's voices synthesised sample by sample.
# Pulse lead (25 %), pulse arpeggios (12.5 %), triangle bass, noise drums. A minor, 150 bpm.
import numpy as np
from scipy.io import wavfile
from partitura import n

SR = 44100
BPM = 150
CORCHEA = 60 / BPM / 2
COMPASES = 16
REP = 2
total = int(SR * CORCHEA * 8 * (COMPASES * REP + 1)) + SR
L = np.zeros(total)
R = np.zeros(total)

def hz(m):
    return 440 * 2 ** ((m - 69) / 12)

def pulso(f, seg, duty, vib=0.0):
    t = np.arange(int(seg * SR)) / SR
    fase = np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 3 - 0.3, 0, 1)) / SR)
    return np.where((fase % 1) < duty, 1.0, -1.0)

def triangulo(f, seg):
    t = np.arange(int(seg * SR)) / SR
    return 2 * np.abs(2 * ((t * f) % 1) - 1) - 1

def env(x, a=0.004, d=0.06, s=0.6, r=0.03):
    k = len(x)
    e = np.full(k, s)
    ia, idd, ir = int(a * SR), int(d * SR), int(r * SR)
    e[:ia] = np.linspace(0, 1, ia)
    e[ia:ia + idd] = np.linspace(1, s, len(e[ia:ia + idd]))
    if ir < k:
        e[-ir:] *= np.linspace(1, 0, ir)
    return x * e

def poner(x, t, vol, pan=0.0):
    i = int(t * SR)
    x = x[: max(0, total - i)]
    L[i:i + len(x)] += x * vol * (1 - pan) / 2
    R[i:i + len(x)] += x * vol * (1 + pan) / 2

ruido = np.random.default_rng(3).uniform(-1, 1, SR)

def bombo(t):
    k = int(0.16 * SR)
    tt = np.arange(k) / SR
    f = 130 * np.exp(-tt * 28) + 45
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18)
    poner(x, t, 0.7)

def caja(t):
    k = int(0.12 * SR)
    x = ruido[:k] * np.exp(-np.arange(k) / SR * 30)
    poner(x, t, 0.32, 0.1)

def charles(t, abierto=False):
    k = int((0.09 if abierto else 0.03) * SR)
    x = np.diff(ruido[:k + 1]) * np.exp(-np.arange(k) / SR * (20 if abierto else 90))
    poner(x, t, 0.13, -0.3)

ACORDES = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'E']
TRIADAS = {'Am': ['A3', 'C4', 'E4'], 'F': ['F3', 'A3', 'C4'], 'C': ['C4', 'E4', 'G4'], 'G': ['G3', 'B3', 'D4'],
           'Em': ['E3', 'G3', 'B3'], 'E': ['E3', 'G#3', 'B3']}
RAIZ = {'Am': 'A2', 'F': 'F2', 'C': 'C3', 'G': 'G2', 'Em': 'E2', 'E': 'E2'}
# The tune in eighths: a note, '-' holds, '.' rests.
TEMA = """
A4 - C5 - E5 - D5 C5 | A4 - - - F4 - G4 A4 | G4 - E4 - G4 - C5 - | B4 - - - D5 - B4 G4 |
A4 - C5 - E5 - A5 - | G5 - F5 - E5 - C5 - | D5 - E5 - G5 - E5 C5 | D5 - - - - - . . |
C5 - A4 - C5 - F5 - | D5 - B4 - D5 - G5 - | E5 - G5 - B5 - G5 E5 | A5 - - - E5 - C5 - |
F5 - E5 - D5 - C5 - | D5 - C5 - B4 - G4 - | C5 - E5 - G5 - C6 - | B5 - - - G#5 - E5 - |
"""
compases = [c.split() for c in TEMA.replace('\n', ' ').split('|') if c.strip()]

def melodia(t0, oct=0, vol=0.22, duty=0.25):
    for ci, c in enumerate(compases):
        i = 0
        while i < 8:
            s = c[i]
            if s in '-.':
                i += 1
                continue
            largo = 1
            while i + largo < 8 and c[i + largo] == '-':
                largo += 1
            seg = largo * CORCHEA
            x = env(pulso(hz(n(s) + 12 * oct), seg, duty, vib=0.006 if largo > 1 else 0), s=0.7, r=0.02)
            poner(x, t0 + (ci * 8 + i) * CORCHEA, vol, 0.15)
            i += largo

def arpegios(t0, vol=0.07):
    paso = CORCHEA / 2  # sixteenths, up and down the chord
    for ci, ch in enumerate(ACORDES):
        tri = [n(x) + 12 for x in TRIADAS[ch]]
        orden = tri + [tri[1]]
        for k in range(16):
            x = env(pulso(hz(orden[k % 4]), paso * 0.9, 0.125), d=0.03, s=0.5, r=0.01)
            poner(x, t0 + ci * 8 * CORCHEA + k * paso, vol, -0.35)

def bajo(t0, vol=0.38):
    for ci, ch in enumerate(ACORDES):
        r = n(RAIZ[ch])
        for k, d in enumerate([0, 12, 0, 12, 0, 12, 7, 12]):
            x = env(triangulo(hz(r + d), CORCHEA * 0.85), a=0.002, d=0.02, s=0.9, r=0.01)
            poner(x, t0 + (ci * 8 + k) * CORCHEA, vol)

def ritmo(t0, relleno=True):
    for ci in range(COMPASES):
        b = t0 + ci * 8 * CORCHEA
        for k in range(8):
            charles(b + k * CORCHEA, abierto=(k == 7))
        bombo(b)
        bombo(b + 3 * CORCHEA)
        bombo(b + 4 * CORCHEA)
        caja(b + 2 * CORCHEA)
        caja(b + 6 * CORCHEA)
        if relleno and ci % 4 == 3:
            caja(b + 7 * CORCHEA)
            caja(b + 7.5 * CORCHEA)

t0 = 8 * CORCHEA  # one bar of drums to count in
for k in range(4):
    caja(k * 2 * CORCHEA)
for rep in range(REP):
    t = t0 + rep * COMPASES * 8 * CORCHEA
    bajo(t)
    ritmo(t)
    arpegios(t, 0.06 if rep == 0 else 0.08)
    melodia(t, oct=0 if rep == 0 else 0, vol=0.2)
    if rep == 1:
        melodia(t + CORCHEA * 0.75, vol=0.07, duty=0.5)  # echo voice, the classic trick
# Final note: A, with a cymbal-ish noise.
fin = t0 + REP * COMPASES * 8 * CORCHEA
poner(env(pulso(hz(n('A4')), 1.2, 0.25, vib=0.01), s=0.8, r=0.5), fin, 0.2)
poner(env(triangulo(hz(n('A2')), 1.2), s=0.9, r=0.5), fin, 0.38)
bombo(fin)
k = int(0.8 * SR)
poner(np.diff(ruido[:k + 1]) * np.exp(-np.arange(k) / SR * 5), fin, 0.12)
est = np.stack([L, R], axis=1)
est /= np.max(np.abs(est)) * 1.05
wavfile.write('chiptune-minijuego.wav', SR, (est * 32767).astype(np.int16))
print('ok', round(fin + 1.3, 1), 's')
