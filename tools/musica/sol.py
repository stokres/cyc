# «Sol de Levante», the sound of Pablo's Golden Sun parody (chapter 2, src/sol/): the village theme at night in
# fiestas and four short effects. All of it is our own: no melody, chord progression or motif of the original
# (nor of any other song). It is written in the manner of a 2001 Game Boy Advance fantasy RPG (progressive rock
# squeezed into a tiny sound chip): bright pulse leads, a breathy flute, synth strings, a picked synth bass,
# pizzicato, harp and music-box ostinatos, crisp «sampled» drums and a small hall.
# Pure synthesis with numpy (no SoundFont, no fluidsynth, no scipy, no mido: sinte.py cannot even be imported in
# this container), on the ring-shaped tools of brio.py (filters, reverb and compressor by FFT, so a round that
# is played over and over joins with no click and no fade).
#
#   «solPueblo»  the village at night, in the fiestas, with a light storm: D dorian / F major, 108 bpm, 32 bars
#                (71.1 s) in a loop after a 4-bar intro that is heard once. Structure (bars):
#                  1-8    A   flute tune over a harp ostinato, strings, picked bass, soft kit (rim, then snare)
#                  9-16   A'  the tune again on a pulse lead, a third below on a pulse oboe, 3+3+2 harp, full kit
#                  17-24  B   Levante: two dolçaines in unison (nasal reeds, a little sharp, with grace notes)
#                             over a tabalet (tight snare), a parade bass drum, plates, pizzicato off-beats; at
#                             the end a rocket whistles up and bangs
#                  25-28  C   the storm: no drums, flute, music box, thunder, raindrops, a big pad
#                  29-32  D   the build back to A: a snare roll, toms, brass joining the flute, A7 on the last bar
#                The intro (4 bars, 8.89 s): the storm alone (thunder, raindrops, a pad swelling, harp), then the
#                last two bars of the build, as the loop will have them, so it leads in with no join.
#   solTexto     the little blip of each letter (35 ms, soft)
#   solPoder     a psynergy cast: a rising shimmering sweep with sparkles (1.2 s)
#   solMenu      the cursor/confirm tick (two quick tones, 70 ms)
#   solPuerta    a door opening (latch, creak) and a step on the boards (0.6 s)
#
#   python3 sol.py [carpeta]            -> the five MP3 in `carpeta` (the game's copy: ../../src/sonido)
#   python3 sol.py pueblo [salida]      only the village theme
#   python3 sol.py efectos [carpeta]    only the four effects
#   python3 sol.py analisis [carpeta]   measures the MP3 (seam, levels, spectrum)
import os
import subprocess
import sys
import tempfile
import zlib
import numpy as np
from brio import (SR, db, hz, midi, eq, sierra, poner, panear, retardo, reverb, compresor, potencia_activa,
                  suave, escribir_wav, lufs, vel_a_amp)

BPM = 108
BEAT = 60.0 / BPM
L = 4                                        # beats in a bar
BARRAS = 32
N = int(round(BARRAS * L * BEAT * SR))       # one round: 3 136 000 samples (71.111 s), exact
INTRO_BARRAS = 4
N_INTRO = int(round(INTRO_BARRAS * L * BEAT * SR))   # 392 000 (8.889 s)
COLA_INTRO = 4.0                             # seconds of silence after the intro's ring, for its tails
MARGEN = 0.5

# --- Notes and chords ----------------------------------------------------------------------------------

INTERVALOS = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'm7': (0, 3, 7, 10), 'maj7': (0, 4, 7, 11),
              'sus4': (0, 5, 7), '6': (0, 4, 7, 9), 'add9': (0, 4, 7, 14), '7sus4': (0, 5, 7, 10)}
LETRAS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def raiz_pc(nombre):
    r = LETRAS[nombre[0]]
    if len(nombre) > 1 and nombre[1] in '#b':
        r += 1 if nombre[1] == '#' else -1
    return r % 12


def acorde_pcs(nombre):
    i = 2 if len(nombre) > 1 and nombre[1] in '#b' else 1
    return [(raiz_pc(nombre) + x) % 12 for x in INTERVALOS[nombre[i:]]]


def tonos(nombre, lo, hi):
    s = set(acorde_pcs(nombre))
    return [x for x in range(midi(lo), midi(hi) + 1) if x % 12 in s]


def raiz_grave(nombre, lo=38):
    """The chord's root in the bass range [lo, lo + 11]."""
    return next(x for x in range(lo, lo + 12) if x % 12 == raiz_pc(nombre))


def melodia(texto):
    """Bars of sixteenths separated by '|': 'A4:3 D5:3 E5:2/g ...' -> [(beat, beats, midi, flags)].
    '-' is a rest; a flag after '/' is passed on ('g': the dolçaine plays a grace note first)."""
    notas, pos = [], 0
    for i, compas in enumerate(texto.split('|')):
        suma = 0
        for tok in compas.split():
            nombre, d = tok.split(':')
            flags = ''
            if '/' in d:
                d, flags = d.split('/')
            d = int(d)
            if nombre != '-':
                notas.append((pos / 4, d / 4, midi(nombre), flags))
            pos += d
            suma += d
        if suma != 16:
            raise ValueError(f'bar {i + 1} adds up to {suma} sixteenths: {compas}')
    return notas


# --- The score ---------------------------------------------------------------------------------------------
# Chords: one list per bar (one chord, or two of two beats each).

ACORDES_A = [['Dm7'], ['G6'], ['Bbmaj7'], ['Asus4', 'A7'], ['Dm7'], ['Gm7'], ['Bbmaj7', 'A7'], ['Dm']]
ACORDES_A2 = [['Dm7'], ['G6'], ['Bbmaj7'], ['Asus4', 'A7'], ['Dm7'], ['Gm7', 'C'], ['Bbmaj7', 'Am7'], ['C7sus4', 'C7']]
ACORDES_B = [['F'], ['Bbmaj7'], ['Gm7', 'C7'], ['F'], ['Dm', 'Bb'], ['Gm7', 'C7'], ['Bb', 'C'], ['F']]
ACORDES_C = [['Bbmaj7'], ['Gm7'], ['Cadd9'], ['Dm7'], ['Dm'], ['Bb'], ['Gm7', 'C7'], ['Asus4', 'A7']]
ACORDES = ACORDES_A + ACORDES_A2 + ACORDES_B + ACORDES_C

# The tune, bar by bar (D dorian in A; F major in B). Every long note on a beat is a tone of its chord.
MEL_A = melodia('A4:3 D5:3 E5:2 F5:6 E5:2 | D5:3 G5:3 E5:2 D5:4 B4:4 | F5:3 Bb5:3 A5:2 F5:6 D5:2 | E5:3 A5:3 G5:2 E5:4 C#5:4 |'
                'D5:3 F5:3 A5:2 C6:6 A5:2 | Bb5:3 A5:3 G5:2 F5:4 D5:4 | F5:4 D5:4 C#5:4 E5:4 | D5:10 -:6')
MEL_A2 = melodia('D5:3 F5:3 A5:2 D6:6 C6:2 | B5:3 D6:3 E6:2 G6:4 D6:4 | F6:3 D6:3 Bb5:2 A5:4 F5:4 | E6:3 A5:3 G5:2 E5:2 A5:2 C#6:4 |'
                 'A5:3 D6:3 C6:2 A5:4 F5:4 | Bb5:3 D6:3 C6:2 E6:4 C6:4 | D6:3 F6:3 E6:2 C6:4 A5:4 | G5:3 Bb5:3 C6:2 E6:2 C6:2 Bb5:4')
MEL_B = melodia('A5:3/g C6:3 A5:2 F5:3/g A5:3 C6:2 | D6:3/g Bb5:3 A5:2 F5:3 G5:3/g A5:2 | G5:3 Bb5:3 D6:2 C6:3/g E6:3 Bb5:2 | A5:6/g G5:2 F5:6/g -:2 |'
                'D6:3/g F6:3 D6:2 Bb5:3 D6:3 F6:2 | G6:3/g F6:3 D6:2 E6:3 C6:3 Bb5:2 | D6:4/g F6:4 G6:4 E6:4 | F6:6/g C6:2 A5:8')
MEL_C = melodia('F5:6 A5:2 D6:8 | D6:3 C6:3 Bb5:2 G5:8 | G5:6 E5:2 D5:4 C5:4 | A4:4 D5:4 F5:8 |'
                'D5:3 F5:3 A5:2 D6:8 | Bb5:3 D6:3 F6:2 D6:4 Bb5:4 | Bb5:3 D6:3 G6:2 E6:3 C6:3 Bb5:2 | A5:3 D6:3 E6:2 C#6:4 E6:4')

ESCALA_F = {5, 7, 9, 10, 0, 2, 4}            # F G A Bb C D E


def ch_en(beat):
    """The chord at a beat of the round."""
    cs = ACORDES[int(beat // L) % BARRAS]
    return cs[min(int((beat % L) // (L / len(cs))), len(cs) - 1)]


class Partitura:
    """Events of a round (or of the intro) per stem: dict(b, d, m, v, ...opciones)."""

    def __init__(self):
        self.ev = {}

    def nota(self, pista, b, d, m, v, **opc):
        self.ev.setdefault(pista, []).append(dict(b=b, d=d, m=m, v=v, **opc))

    def trozo(self, desde, hasta, a):
        """A copy of the events starting in [desde, hasta) beats, moved to start at beat `a`."""
        p = Partitura()
        for pista, evs in self.ev.items():
            for e in evs:
                if desde <= e['b'] < hasta:
                    p.ev.setdefault(pista, []).append(dict(e, b=e['b'] - desde + a))
        return p

    def anadir(self, otra):
        for pista, evs in otra.ev.items():
            self.ev.setdefault(pista, []).extend(evs)


def pad_voces(P, b0, acordes, vels, desde_compas=0):
    """Synth strings: each chord four tones in close position, the nearest to the last (voice leading),
    held for its whole length; two stems (left and right) a little out of tune with each other."""
    previo = 62.0
    for i, cs in enumerate(acordes):
        for k, ch in enumerate(cs):
            ts = tonos(ch, 'D3', 'F5')
            v = min((ts[j:j + 4] for j in range(len(ts) - 3)), key=lambda w: (abs(np.mean(w) - previo), w[0]))
            previo = np.mean(v)
            d = L / len(cs)
            b = b0 + (desde_compas + i) * L + k * d
            for pista in ('cuerdasI', 'cuerdasD'):
                P.nota(pista, b, d + 0.15, tuple(v), vels[desde_compas + i], lado=pista[-1])


def arpa_compas(P, compas, estilo, vel, desde='C4', hasta='C6', pista='arpa'):
    """Broken chords of the bar: 'corcheas' (eighths), 'tresytres' (3+3+2+3+3+2 sixteenths, the odd-meter
    feel) or 'semis' (sixteenths)."""
    pos = {'corcheas': range(0, 16, 2), 'tresytres': (0, 3, 6, 8, 11, 14), 'semis': range(16)}[estilo]
    patron = (0, 1, 2, 3, 4, 3, 2, 1) if estilo != 'tresytres' else (0, 2, 4, 3, 1, 2)
    for k, p in enumerate(pos):
        b = compas * L + p / 4
        ts = tonos(ch_en(b), desde, hasta)
        P.nota(pista, b, 0.5, ts[patron[k % len(patron)] % len(ts)], vel + (10 if k == 0 else 0))


BAJO = {'R': (0, 100, 0.5, 0), 'r': (0, 96, 0.95, 0), 'O': (12, 92, 0.4, 1), 'F': (7, 90, 0.4, 0),
        'g': (0, 52, 0.2, 0), 'S': (10, 88, 0.4, 0)}


def bajo_compas(P, compas, patron, vel=0):
    assert len(patron) == 16, patron
    for p, c in enumerate(patron):
        if c == '.':
            continue
        off, v, d, pop = BAJO[c]
        b = compas * L + p / 4
        P.nota('bajo', b, d, raiz_grave(ch_en(b)) + off, max(30, v + vel), pop=pop)


def bateria(P, compas, patrones, vel=0):
    """patrones: {drum: 16 characters}, X accent, x hit, o soft, . nothing."""
    for nombre, pat in patrones.items():
        assert len(pat) == 16, (nombre, pat)
        for p, c in enumerate(pat):
            if c != '.':
                v = {'X': 112, 'x': 94, 'o': 56}[c] + vel
                P.nota('bat', compas * L + p / 4, 0.25, nombre, max(20, min(127, v)))


def redoble(P, b0, dur, v0, v1, nombre='tabalet', paso=0.125):
    """A roll in thirty-seconds, growing from v0 to v1."""
    n = int(round(dur / paso))
    for k in range(n):
        P.nota('bat', b0 + k * paso, paso, nombre, int(v0 + (v1 - v0) * k / max(1, n - 1)))


def tambores(P, b0, notas=('tom1', 'tom2', 'tom3', 'tom4'), v0=88, v1=108, paso=0.25):
    for k, t in enumerate(notas):
        P.nota('bat', b0 + k * paso, paso, t, int(v0 + (v1 - v0) * k / max(1, len(notas) - 1)))


def armonia_debajo(m, ch):
    """A chord tone three to five semitones under the tune note (a third below)."""
    pcs = set(acorde_pcs(ch))
    for d in (3, 4, 5, 2):
        if (m - d) % 12 in pcs:
            return m - d
    return m - 3


def vecino_arriba(m):
    """The scale tone above (F major), for the dolçaine's grace notes."""
    return next(x for x in range(m + 1, m + 4) if x % 12 in ESCALA_F)


def componer():
    """The 32 bars of the round: -> a Partitura. Beats count from the start of the round (a bar is 4)."""
    P = Partitura()
    # ---- strings: a little at first, wider in A', quieter under the dolçaines, big in the storm, rising in the build
    vp = [48] * 4 + [60] * 4 + [74] * 8 + [58] * 8 + [86] * 4 + [66, 76, 90, 102]
    pad_voces(P, 0, ACORDES, vp)
    P.nota('bat', 0.0, 1, 'crash', 96)
    # ---- A (bars 1-8): flute tune, harp eighths, picked bass, soft kit (rim shots, then the snare)
    for b, d, m, _ in MEL_A:
        P.nota('flauta', b, d * 0.94, m, 92 + (6 if b % 1 == 0 else 0), vib=1 if d >= 1 else 0)
    for c in range(8):
        arpa_compas(P, c, 'corcheas', 56)
        bajo_compas(P, c, 'R..g.O..R..gF.O.' if c % 2 == 0 else 'R..g.O.gR..gF.S.', -6 if c < 4 else 0)
        if c < 4:
            bateria(P, c, {'bombo': 'x.....x...x.....', 'charles': 'o.x.o.x.o.x.o.x.', 'rim': '....x.......x...'}, -14)
        else:
            bateria(P, c, {'bombo': 'x.....x...x...x.', 'caja': '....x.......x...', 'charles': 'o.x.o.x.o.x.o.x.'}, -6)
    tambores(P, 7 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 80, 100)
    # ---- A' (bars 9-16): the tune on a pulse lead with the flute behind it, an oboe a third below, the harp in
    # 3+3+2, the full kit; brass joining in the last four bars
    for b, d, m, _ in MEL_A2:
        P.nota('lead', 32 + b, d * 0.92, m, 100 + (6 if b % 1 == 0 else 0), duty=0.25, vib=1 if d >= 1 else 0)
        P.nota('flauta', 32 + b, d * 0.94, m, 62, vib=1 if d >= 1 else 0)
        P.nota('oboe', 32 + b, d * 0.9, armonia_debajo(m, ch_en(32 + b)), 66)
        if b >= 16:
            P.nota('metal', 32 + b, d * 0.9, m - 12, 66 + int(14 * (b - 16) / 16))
    for c in range(8, 16):
        arpa_compas(P, c, 'tresytres', 62)
        bajo_compas(P, c, 'R.gRg.O.R.gRgF.O' if c % 2 == 0 else 'R.gRg.O.R.gSgF.O', 4)
        bateria(P, c, {'bombo': 'x..x..x...x.x...', 'caja': '....x.......x..o', 'charles': 'x.x.x.x.x.x.x.x.',
                       'pandereta': '..x...x...x...x.'}, 0)
    P.nota('bat', 32.0, 1, 'crash', 100)
    redoble(P, 11 * L + 3.0, 1.0, 50, 100, 'caja')
    tambores(P, 15 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 90, 118, 0.25)
    # ---- B (bars 17-24): Levante. Two dolçaines in unison with grace notes, a tabalet, the parade drum, plates,
    # pizzicato chords on the off-beats, brass stabs, music-box bells
    for b, d, m, fl in MEL_B:
        b0 = 64 + b
        if 'g' in fl:
            for pista, lado in (('dolcaina1', 1), ('dolcaina2', 2)):
                P.nota(pista, b0, 0.13, vecino_arriba(m), 84, lado=lado)
            b0, d = b0 + 0.13, d - 0.13
        P.nota('dolcaina1', b0, d * 0.9, m, 104, lado=1)
        P.nota('dolcaina2', b0, d * 0.9, m, 104, lado=2)
    P.nota('bat', 64.0, 1, 'crash', 100)
    for c in range(16, 24):
        bajo_compas(P, c, 'R.F.R.F.R.F.R.O.' if c % 2 == 0 else 'R.F.R.F.R.F.S.O.', 2)
        arpa_compas(P, c, 'corcheas', 50, desde='C4', hasta='C6', pista='campana')
        for p in (4, 12):
            b = c * L + p / 4
            for m in tonos(ch_en(b), 'C4', 'G5')[:4]:
                P.nota('pizz', b, 0.25, m, 84 + (6 if p == 12 else 0))
        bateria(P, c, {'bombo_banda': 'x.......x.......', 'tabalet': 'X..x..X..x..X.xx', 'pandereta': 'x.x.x.x.x.x.x.x.'}, 0)
        bateria(P, c, {'tabalet': '..o..o..o..o....'}, -34)         # the ruffs: soft grace hits before the accents
        P.nota('bat', c * L, 0.5, 'plato', 76)
    for c in (19, 23):                                                   # a roll into the next phrase
        redoble(P, c * L + 3.0, 1.0, 50, 104)
    for c in (16, 20):
        for m in tonos(ch_en(c * L), 'F3', 'F5')[:4]:
            P.nota('metal', c * L, 0.5, m, 100)
    for m in ('F3', 'A3', 'C4', 'F4'):
        P.nota('metal', 23 * L + 3.0, 0.9, midi(m), 108)
    # the rocket whistles up for 1.4 s and bangs on the first beat of bar 25, where the thunder begins
    P.nota('cohete', 96.0 - 1.4 / BEAT, 3.0 / BEAT, 0, 100)
    P.nota('trueno', 96.0, 4.0 / BEAT, 0, 100, n=1)
    # ---- C (bars 25-28): the storm. Flute, music box, thunder, raindrops, a big pad, no drums
    for b, d, m, _ in MEL_C:
        if b < 16:
            P.nota('flauta', 96 + b, d * 0.95, m, 88, vib=1 if d >= 1.5 else 0)
    for c in range(24, 28):
        arpa_compas(P, c, 'corcheas', 64, desde='C5', hasta='C7', pista='campana')
        bajo_compas(P, c, 'r...............' if c % 2 == 0 else 'r...........g...', -8)
    P.nota('trueno', 102.0, 5.0 / BEAT, 0, 84, n=2)
    rng = np.random.default_rng(11)
    for k in range(10):                                                  # raindrops: chord tones, high and quiet
        b = 96 + float(np.round(rng.uniform(0, 16) * 4) / 4)
        ts = tonos(ch_en(b), 'C7', 'G7')
        P.nota('gota', b, 0.3, ts[int(rng.integers(len(ts)))], 44 + int(rng.integers(0, 22)))
    # ---- D (bars 29-32): the build back to the tune: flute, pulse lead and brass in unison, a rising snare roll,
    # toms, A7 at the end
    for b, d, m, _ in MEL_C:
        if b >= 16:
            P.nota('flauta', 96 + b, d * 0.95, m, 84 + int(10 * (b - 16) / 16), vib=1 if d >= 1.5 else 0)
            P.nota('lead', 96 + b, d * 0.92, m, 70 + int(26 * (b - 16) / 16), duty=0.5, vib=1 if d >= 1.5 else 0)
            P.nota('metal', 96 + b, d * 0.9, m - 12, 56 + int(46 * (b - 16) / 16))
    for c in range(28, 32):
        arpa_compas(P, c, 'semis' if c >= 30 else 'tresytres', 54 + 8 * (c - 28), desde='C4', hasta='C6')
    bajo_compas(P, 28, 'R..gR..gR..gR..g', 0)
    bajo_compas(P, 29, 'R.R.R.R.R.R.R.R.', 4)
    bajo_compas(P, 30, 'RgR.RgR.RgR.RgR.', 8)
    bajo_compas(P, 31, 'RRgRRRgRRRgRRRgR', 10)
    bateria(P, 28, {'bombo': 'x.......x.......', 'charles': 'o...o...o...o...'}, -14)
    bateria(P, 29, {'bombo': 'x...x...x...x...', 'charles': 'o.o.o.o.o.o.o.o.', 'rim': '....x.......x...'}, -4)
    bateria(P, 30, {'bombo': 'x...x...x...x...', 'caja': 'x.x.x.x.x.x.x.x.'}, -22)
    redoble(P, 31 * L, 4.0, 48, 124, 'caja')
    P.nota('bat', 31 * L, 0.25, 'bombo', 110)
    P.nota('bat', 31 * L + 2.0, 0.25, 'bombo', 112)
    tambores(P, 31 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    return P


def componer_intro(P):
    """The intro (4 bars): the storm alone and then the loop's last two bars, as they are in the round."""
    I = Partitura()
    I.nota('trueno', 0.0, 4.0, 0, 100, n=3)
    # the pad swells over the first two bars (the loop's own chords of bars 31-32 come with the copy)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (50, 57, 62, 65), 50, lado=pista[-1])
        I.nota(pista, 4.0, 4.15, (50, 57, 62, 65), 64, lado=pista[-1])
    rng = np.random.default_rng(5)
    for k, (b, m) in enumerate(((0.75, 'A6'), (1.5, 'D6'), (2.25, 'F6'), (3.25, 'A6'), (4.5, 'E6'), (5.75, 'C7'))):
        I.nota('gota', b, 0.3, midi(m), 72 + int(rng.integers(0, 18)))
    # the harp in the second bar: Dm7 and then Bbmaj7, eighth by eighth
    for k in range(8):
        ch = 'Dm7' if k < 4 else 'Bbmaj7'
        ts = tonos(ch, 'F3', 'C6')
        I.nota('arpa', 4.0 + k * 0.5, 0.5, ts[(0, 1, 2, 3, 4, 3, 2, 1)[k] % len(ts)], 58 + (8 if k == 0 else 0) + 2 * k)
    I.nota('trueno', 4.0, 4.0, 0, 70, n=4)
    I.anadir(P.trozo(30 * L, 32 * L, 2 * L))
    return I


# --- Instruments ------------------------------------------------------------------------------------------------

INSTR = {}
CACHE = {}


def inst(f):
    INSTR[f.__name__] = f
    return f


def sintetizar(nombre, m, gate, vel, **opc):
    """One note, memoised (the same note is the same samples every time it comes round, so the intro's copy of the
    last bars is the loop's own); the noise is seeded from the note itself."""
    clave = (nombre, m, round(gate, 3), vel, tuple(sorted(opc.items())))
    if clave not in CACHE:
        rng = np.random.default_rng(zlib.crc32(repr(clave).encode()))
        CACHE[clave] = INSTR[nombre](m, gate, vel, rng, **opc)
    return CACHE[clave]


def tiempo(nm):
    return np.arange(nm) / SR


def adsr(nm, g, a, d, s, r):
    t = tiempo(nm)
    e = np.minimum(1.0, t / max(a, 1e-4)) * (s + (1 - s) * np.exp(-t / max(d, 1e-4)))
    k = min(int(g * SR), nm - 1)
    e[k:] *= np.exp(-(t[k:] - t[k]) / max(r, 1e-4))
    k2 = min(220, nm)
    e[-k2:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k2)))      # a 5 ms taper: a note never ends on a click
    return e


def pulso(f, duty):
    """Band-limited pulse: two sawtooths a duty apart. Peak to peak 1."""
    return 0.5 * (sierra(f, 0.0) - sierra(f, duty))


def ruido_ba(rng, nm, lo, hi):
    return eq(rng.standard_normal(nm), ('hp', lo, 2), ('lp', hi, 2), circ=False)


@inst
def flauta(m, g, v, rng, vib=1):
    """A breathy GBA-style flute: a sine with a little second and third harmonic, a slow attack with the pitch
    coming up from a hair flat, a delayed vibrato and a puff of air."""
    nm = int((g + 0.4) * SR) + 1
    t = tiempo(nm)
    vibr = vib * 0.0085 * np.sin(2 * np.pi * 5.4 * t + rng.random() * 6.28) * np.clip((t - 0.2) / 0.35, 0, 1)
    f = hz(m) * (1 - 0.014 * np.exp(-t / 0.03)) * (1 + vibr)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) + (0.24 if m < 84 else 0.1) * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    soplo = ruido_ba(rng, nm, 1800, 7000) * (0.05 + 0.3 * np.exp(-t / 0.05))
    return (w + soplo) * adsr(nm, g, 0.035, 1e3, 1.0, 0.09) * vel_a_amp(v)


@inst
def lead(m, g, v, rng, duty=0.25, vib=1):
    """The pulse lead: a 25 % pulse and a 50 % one a hair apart, a snappy start, a vibrato that arrives late."""
    nm = int((g + 0.25) * SR) + 1
    t = tiempo(nm)
    vibr = vib * 0.008 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.22) / 0.25, 0, 1)
    f = hz(m) * (1 + vibr)
    w = 0.65 * pulso(f, duty) + 0.45 * pulso(f * 1.0014, 0.5)
    w = eq(w, ('lp', 6500, 2), circ=False)
    e = adsr(nm, g, 0.004, 0.1, 0.72, 0.06)
    return w * e * vel_a_amp(v) * 1.5


@inst
def oboe(m, g, v, rng):
    """A soft reedy second voice: a 50 % pulse and a saw, round at the top."""
    nm = int((g + 0.3) * SR) + 1
    t = tiempo(nm)
    f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.3, 0, 1))
    w = pulso(f, 0.5) + 0.35 * sierra(f, rng.random())
    w = eq(w, ('lp', 2600, 2), ('pico', 1300, 3.0, 0.5), circ=False)
    return w * adsr(nm, g, 0.02, 0.2, 0.85, 0.07) * vel_a_amp(v) * 1.3


@inst
def dolcaina(m, g, v, rng, lado=1):
    """A dolçaina: a conical double reed, loud and nasal. Two reeds a few cents apart, the whole thing a little
    sharp, a blown-in scoop at the start, saturation for the buzz and two narrow formants (1.2 and 2.7 kHz)."""
    nm = int((g + 0.2) * SR) + 1
    t = tiempo(nm)
    w = np.zeros(nm)
    for cents in (-7.0 + 5 * (lado - 1.5), 7.0 + 5 * (lado - 1.5)):
        f = hz(m) * 2 ** ((15 + cents) / 1200) * (1 - 0.03 * np.exp(-t / 0.03)) * (1 + 0.0025 * np.sin(2 * np.pi * (4.7 + 0.4 * lado) * t))
        w += np.tanh(2.0 * (0.7 * sierra(f, rng.random()) + 0.5 * pulso(f, 0.2)))
    w = eq(w, ('hp', 260, 2), ('pico', 1150, 8.0, 0.35), ('pico', 2650, 6.0, 0.3), ('lp', 5200, 2), circ=False)
    w = w + 0.04 * ruido_ba(rng, nm, 1500, 5000) * np.minimum(1, t / 0.05)
    return w * adsr(nm, g, 0.012, 0.15, 0.82, 0.05) * vel_a_amp(v) * 0.9


@inst
def dolcaina1(m, g, v, rng, lado=1):
    return dolcaina(m, g, v, rng, lado=1)


@inst
def dolcaina2(m, g, v, rng, lado=2):
    return dolcaina(m, g, v, rng, lado=2)


@inst
def cuerdas(m, g, v, rng, lado='I'):
    """Synth strings: for each tone of the chord three saws a few cents apart, a slow attack and release, a soft
    top, a faint ensemble wobble."""
    nm = int((g + 1.4) * SR) + 1
    t = tiempo(nm)
    desv = (-11, 1, 12) if lado == 'I' else (-12, -1, 11)
    w = np.zeros(nm)
    for tono in m:
        for c in desv:
            f = hz(tono) * 2 ** (c / 1200) * (1 + 0.0016 * np.sin(2 * np.pi * (0.7 + 0.3 * rng.random()) * t + rng.random() * 6.28))
            w += sierra(f, rng.random())
    w = eq(w / (len(m) * 3), ('lp', 2300, 2), ('hp', 120, 2), ('pico', 900, 2.0, 0.8), circ=False)
    return w * adsr(nm, g, 0.3, 1e3, 1.0, 0.3) * vel_a_amp(v) * 2.2


@inst
def pizz(m, g, v, rng):
    """Pizzicato: a bright pluck that dies in a moment over a body that rings a little."""
    nm = int(0.5 * SR)
    t = tiempo(nm)
    s = sierra(np.full(nm, float(hz(m))), rng.random())
    brillo = eq(s, ('lp', 3600, 2), circ=False) * np.exp(-t / 0.05)
    cuerpo = eq(s, ('lp', 1300, 2), circ=False) * np.exp(-t / 0.14)
    w = 0.6 * brillo + cuerpo + 0.15 * ruido_ba(rng, nm, 1500, 5000) * np.exp(-t / 0.004)
    w[-48:] *= np.linspace(1, 0, 48)
    return w * vel_a_amp(v)


@inst
def arpa(m, g, v, rng):
    """A harp: a few partials, the higher ones dying faster, a little click of the nail."""
    nm = int(1.6 * SR)
    t = tiempo(nm)
    f = float(hz(m))
    esc = 1.0 / (1 + max(0, m - 60) / 30)
    w = np.zeros(nm)
    for k, (a, tau) in enumerate(((1.0, 0.42), (0.5, 0.3), (0.3, 0.2), (0.18, 0.14), (0.1, 0.1), (0.06, 0.07)), 1):
        if f * k < 9000:
            w += a * np.sin(2 * np.pi * f * k * (1 + 0.0003 * k * k) * t + rng.random() * 0.3) * np.exp(-t / (tau * esc))
    w = w * np.minimum(1, t / 0.001) + 0.18 * ruido_ba(rng, nm, 2500, 7000) * np.exp(-t / 0.003)
    w[-960:] *= np.linspace(1, 0, 960)
    return w * vel_a_amp(v)


@inst
def campana(m, g, v, rng, razon=3.5, indice=1.8, tau=0.45):
    """A music box / celesta: a two-operator FM bell, the brightness dying before the note."""
    nm = int(min(1.8, tau * 5) * SR)
    t = tiempo(nm)
    f = float(hz(m))
    w = np.sin(2 * np.pi * f * t + indice * np.exp(-t / (tau * 0.5)) * np.sin(2 * np.pi * f * razon * t)) * np.exp(-t / tau)
    w = w + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / (tau * 0.4))
    w = w * np.minimum(1, t / 0.0015)
    w[-64:] *= np.linspace(1, 0, 64)
    return w * vel_a_amp(v)


@inst
def gota(m, g, v, rng):
    return campana(m, g, v, rng, razon=2.0, indice=1.0, tau=0.22)


@inst
def bajo(m, g, v, rng, pop=0):
    """A picked synth bass: a bright saw that dies in a moment over a darker body and a sine sub; on the
    octave notes, a slapped pop."""
    nm = int((g + 0.25) * SR) + 1
    t = tiempo(nm)
    f = np.full(nm, float(hz(m)))
    s = sierra(f, rng.random())
    brillo = eq(s, ('lp', 2800, 2), ('hp', 70, 2), circ=False) * np.exp(-t / 0.07)
    cuerpo = eq(s, ('lp', 480, 2), circ=False)
    cuadro = eq(pulso(f, 0.35), ('lp', 1100, 2), circ=False)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR)
    w = (1.1 * brillo + 0.8 * cuerpo + 0.45 * cuadro + 0.5 * sub) * adsr(nm, g, 0.003, 0.5, 0.0, 0.05)
    w = w + 0.28 * ruido_ba(rng, nm, 1200, 3500) * np.exp(-t / (0.01 if pop else 0.004))
    if pop:
        w = w + 0.4 * np.sin(2 * np.pi * f[0] * 2 * t) * np.exp(-t / 0.035)
    return w * vel_a_amp(v)


@inst
def metal(m, g, v, rng):
    """GBA brass: three saws a few cents apart, a start that opens (a bright burst that fades) and a scoop."""
    nm = int((g + 0.4) * SR) + 1
    t = tiempo(nm)
    f0 = hz(m) * (1 - 0.018 * np.exp(-t / 0.04)) * (1 + 0.005 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.25) / 0.3, 0, 1))
    w = sum(sierra(f0 * 2 ** (c / 1200), rng.random()) for c in (-8, 0, 8)) / 3
    w = 0.9 * eq(w, ('lp', 1700, 2), ('hp', 110, 2), circ=False) + 0.6 * eq(w, ('lp', 5200, 2), circ=False) * np.exp(-t / 0.1)
    w = np.tanh(1.3 * w)
    return w * adsr(nm, g, 0.03, 1e3, 1.0, 0.1) * vel_a_amp(v) * 1.2


def trueno_forma(rng, dur, n):
    nm = int(dur * SR)
    t = tiempo(nm)
    r = rng.standard_normal(nm)
    cuerpo = eq(r, ('lp', 190, 3), ('hp', 22, 2), circ=False)
    medio = eq(r, ('hp', 150, 2), ('lp', 650, 3), circ=False)
    e = np.zeros(nm)
    for k in range(7):
        t0 = rng.uniform(0, dur * 0.45)
        tau = rng.uniform(0.5, 1.3)
        dt = np.maximum(0, t - t0)
        e += rng.uniform(0.4, 1.0) * (1 - np.exp(-dt / 0.12)) * np.exp(-dt / tau) * (t >= t0)
    e *= np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.5)
    return (cuerpo * 3.0 + medio * 1.6) * e / (np.max(e) + 1e-9)


@inst
def fx(m, g, v, rng, inst='trueno', n=0):
    if inst == 'trueno':
        return trueno_forma(rng, g, n) * vel_a_amp(v)
    if inst == 'cohete':
        # a rocket: a thin whistle that climbs for 1.4 s, then a dull bang
        nm = int(g * SR)
        t = tiempo(nm)
        k = int(1.4 * SR)
        u = np.clip(t[:k] / 1.4, 0, 1)
        f = 700 * (3.4 / 0.7) ** (u ** 1.3) * (1 + 0.012 * np.sin(2 * np.pi * 9 * t[:k]))
        w = np.zeros(nm)
        w[:k] = np.sin(2 * np.pi * np.cumsum(f) / SR) * (u ** 1.5) * 0.5
        w[:k] += 0.12 * ruido_ba(rng, k, 2500, 7000) * u ** 2
        tb = t[k:] - t[k]
        bang = (ruido_ba(rng, nm - k, 90, 2800) * np.exp(-tb / 0.12) * 2.2
                + np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-tb / 0.05)) / SR) * np.exp(-tb / 0.2) * 1.4)
        w[k:] += 0.9 * np.tanh(bang)
        w[-96:] *= np.linspace(1, 0, 96)
        return w * vel_a_amp(v)
    raise ValueError(inst)


# --- Drums: short, crisp, a little dry, like the samples of a 2001 cartridge ----------------------------------------

def _gol(nombre, vel):
    key = ('bat', nombre, vel)
    if key in CACHE:
        return CACHE[key]
    rng = np.random.default_rng(zlib.crc32(repr(key).encode()))
    a = vel_a_amp(vel)
    pan, rev = 0.0, 0.1

    def tono(f0, f1, tau):
        return np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / tau)) / SR)

    if nombre == 'bombo':
        nm = int(0.4 * SR); t = tiempo(nm)
        w = tono(190, 50, 0.022) * np.exp(-t / 0.1) + 0.4 * ruido_ba(rng, nm, 2000, 6000) * np.exp(-t / 0.003)
        w = np.tanh(1.6 * w)
        pan, rev = 0.0, 0.05
    elif nombre == 'bombo_banda':     # the parade bass drum: deep, round, a long boom with a skin thump
        nm = int(0.8 * SR); t = tiempo(nm)
        w = tono(110, 62, 0.06) * np.exp(-t / 0.2) + 0.5 * ruido_ba(rng, nm, 60, 700) * np.exp(-t / 0.02)
        w = np.tanh(1.4 * w) * 1.1
        pan, rev = 0.0, 0.12
    elif nombre == 'caja':
        nm = int(0.24 * SR); t = tiempo(nm)
        w = (0.8 * tono(250, 195, 0.02) * np.exp(-t / 0.05) + 0.4 * tono(400, 320, 0.02) * np.exp(-t / 0.03)
             + 0.95 * ruido_ba(rng, nm, 1400, 9500) * np.minimum(1, t / 0.0012) * np.exp(-t / 0.075))
        w = np.tanh(1.3 * w)
        pan, rev = 0.05, 0.28
    elif nombre == 'tabalet':         # a tight, dry, high-tuned snare: all crack and wire
        nm = int(0.16 * SR); t = tiempo(nm)
        w = (0.7 * tono(330, 260, 0.015) * np.exp(-t / 0.028) + 0.55 * np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.004)
             + 1.0 * ruido_ba(rng, nm, 2200, 9000) * np.minimum(1, t / 0.001) * np.exp(-t / 0.045))
        w = np.tanh(1.4 * w)
        pan, rev = 0.15, 0.2
    elif nombre == 'rim':
        nm = int(0.06 * SR); t = tiempo(nm)
        w = (np.sin(2 * np.pi * 1750 * t) * 0.7 + ruido_ba(rng, nm, 3000, 9000) * 0.5) * np.exp(-t / 0.011)
        pan, rev = 0.1, 0.15
    elif nombre in ('charles', 'abierto'):
        nm = int((0.5 if nombre == 'abierto' else 0.09) * SR); t = tiempo(nm)
        w = ruido_ba(rng, nm, 6500, 15000) * np.minimum(1, t / 0.0008) * np.exp(-t / (0.12 if nombre == 'abierto' else 0.02))
        w = w * 0.9
        pan, rev = -0.3, 0.12
    elif nombre == 'pandereta':       # tambourine: two quick bursts of bright noise with a metallic ring
        nm = int(0.17 * SR); t = tiempo(nm)
        r = ruido_ba(rng, nm, 5200, 12500)
        sonaj = sum(np.sign(np.sin(2 * np.pi * f * t + rng.random() * 6.28)) for f in (6100, 7300, 8800, 9900)) / 4
        env = np.exp(-t / 0.028) + 0.65 * np.exp(-np.maximum(0, t - 0.017) / 0.04) * (t >= 0.017)
        w = (r + 0.25 * eq(sonaj, ('hp', 5000, 2), circ=False)) * env * 0.85
        pan, rev = 0.4, 0.15
    elif nombre in ('crash', 'plato'):
        nm = int((1.8 if nombre == 'crash' else 0.9) * SR); t = tiempo(nm)
        r = ruido_ba(rng, nm, 2500, 14000)
        sonaj = sum(np.sign(np.sin(2 * np.pi * f * t + rng.random() * 6.28)) for f in (3700, 4650, 5880, 7400)) / 4
        w = (r + 0.3 * sonaj) * np.minimum(1, t / 0.001) * (0.6 * np.exp(-t / 0.12) + 0.4 * np.exp(-t / (0.6 if nombre == 'crash' else 0.3)))
        w[-128:] *= np.linspace(1, 0, 128)
        w = w * (0.45 if nombre == 'crash' else 0.4)
        pan, rev = -0.35, 0.25
    elif nombre in ('tom1', 'tom2', 'tom3', 'tom4'):
        f0, pan = {'tom1': (210, 0.35), 'tom2': (170, 0.15), 'tom3': (135, -0.15), 'tom4': (105, -0.35)}[nombre]
        nm = int(0.55 * SR); t = tiempo(nm)
        w = tono(f0 * 1.5, f0, 0.04) * np.exp(-t / 0.15) + 0.35 * ruido_ba(rng, nm, 700, 4000) * np.exp(-t / 0.012)
        w = np.tanh(1.4 * w)
        rev = 0.2
    else:
        raise ValueError(nombre)
    w = np.array(w)
    w[-64:] *= np.linspace(1, 0, 64)
    CACHE[key] = (w * a, pan, rev)
    return CACHE[key]


# --- Rendering a round ------------------------------------------------------------------------------------------------

def tocar(P, n):
    """Plays the score into mono stems and a stereo kit: {name: array}."""
    stems = {}
    bat = np.zeros((2, n))
    envio_bat = np.zeros((2, n))
    for pista, evs in P.ev.items():
        if pista == 'bat':
            for e in sorted(evs, key=lambda e: e['b']):
                w, pan, rev = _gol(e['m'], e['v'])
                ang = (pan + 1) * np.pi / 4
                g = (np.cos(ang) * np.sqrt(2), np.sin(ang) * np.sqrt(2))
                i0 = int(round(e['b'] * BEAT * SR))
                poner(bat, i0, w, g)
                poner(envio_bat, i0, w * rev, g)
            continue
        buf = stems.setdefault(pista, np.zeros(n))
        for e in sorted(evs, key=lambda e: e['b']):
            opc = {k: v for k, v in e.items() if k not in ('b', 'd', 'm', 'v')}
            if pista in ('cuerdasI', 'cuerdasD'):
                w = sintetizar('cuerdas', e['m'], e['d'] * BEAT, e['v'], **opc)
            elif pista in ('trueno', 'cohete'):
                w = sintetizar('fx', e['m'], e['d'] * BEAT, e['v'], inst=pista, **opc)
            else:
                w = sintetizar(pista, e['m'], e['d'] * BEAT, e['v'], **opc)
            poner(buf, int(round(e['b'] * BEAT * SR)), w)
    stems['bat'] = bat
    stems['envio_bat'] = envio_bat
    return stems


# name: (pan, active level dB, reverb send, echo)
MEZCLA = dict(
    flauta=(-0.12, -22.0, 0.28, 0.10), lead=(0.12, -26.0, 0.2, 0.14), oboe=(-0.35, -33.0, 0.2, 0.0),
    dolcaina1=(-0.3, -23.5, 0.16, 0.0), dolcaina2=(0.3, -23.5, 0.16, 0.0), metal=(0.0, -28.0, 0.22, 0.0),
    cuerdasI=(-0.8, -28.0, 0.32, 0.0), cuerdasD=(0.8, -28.0, 0.32, 0.0),
    arpa=(-0.45, -27.0, 0.28, 0.25), pizz=(0.5, -29.5, 0.16, 0.0), bajo=(0.0, -23.5, 0.03, 0.0),
    campana=(0.5, -31.0, 0.45, 0.35), gota=(-0.55, -38.0, 0.5, 0.15),
    trueno=(0.0, -33.0, 0.4, 0.0), cohete=(0.4, -31.0, 0.35, 0.0))
NIVEL_BATERIA = -24.0
# Loudness of each bar in dB (the dynamics of the arrangement, on top of the velocities); the intro has its own two
# first bars, its last two are the loop's.
AUTO = [-2.0] * 4 + [-1.0] * 4 + [0.0] * 8 + [0.5] * 8 + [-4.5, -4.5, -4.0, -4.0] + [-2.5, -1.5, 0.0, 1.5]
AUTO_INTRO = [-3.5, -3.0, AUTO[30], AUTO[31]]
GANANCIAS = {}
DIAG = {}      # the levelled stems of the last mix, for the checks


def eco(x, d_beats, fb=0.5, lp=3200, n=4):
    """A ping-pong echo of a mono stem on the ring: the repeats only, (2, n)."""
    d = d_beats * BEAT * SR
    out = np.zeros((2, len(x)))
    rep = x
    for k in range(1, n + 1):
        rep = eq(retardo(rep, d), ('lp', lp, 2), ('hp', 200, 1)) * fb
        out[k % 2] += rep
        out[(k + 1) % 2] += rep * 0.3
    return out


def curva_auto(db_compas, n, final=None):
    """The per-bar gains in dB as a smooth curve of n samples (a ring: the smoothing wraps round); `final` is the
    value after the last bar when n is longer than the bars."""
    bar = int(round(L * BEAT * SR))
    g = np.full(n, db_compas[-1] if final is None else final, dtype=float)
    for i, v in enumerate(db_compas):
        g[i * bar:(i + 1) * bar] = v
    k = int(0.5 * SR)
    ker = np.zeros(n)
    ker[:k] = np.hanning(k)
    ker = np.roll(ker / ker.sum(), -k // 2)
    return 10 ** (np.fft.irfft(np.fft.rfft(g) * np.fft.rfft(ker), n) / 20)


def mezclar(P, n, auto, final=None, rt_sala=1.1, fijar=True, informe=True):
    """The whole band: stems levelled, panned, sent to one hall, glued. With `fijar` the gains are measured and
    stored (the round); without, the stored ones are used (the intro). -> (2, n)."""
    s = tocar(P, n)
    maestro = np.zeros((2, n))
    envio = np.zeros((2, n))
    filas = []
    for k, (pan, nivel, rev, ec) in MEZCLA.items():
        if k not in s:
            continue
        x = s.pop(k)
        if k == 'bajo':
            x = x / np.sqrt(10 ** (potencia_activa(x) / 10))
            x = np.tanh(2.2 * x)
            x = eq(x, ('hp', 40, 2), ('pico', 750, 4.0, 0.7), ('lp', 3300, 2))
            x = compresor(x, -14, 3.0, 0.01, 0.1)
        elif k in ('flauta', 'lead'):
            x = compresor(x, -24, 2.0, 0.01, 0.1)
        if fijar:
            GANANCIAS[k] = 10 ** ((nivel - potencia_activa(x)) / 20)
        x = x * GANANCIAS[k]
        DIAG[k] = x
        est = panear(x, pan)
        maestro += est
        envio += est * rev
        if ec:
            e = eco(x, 0.75) * ec
            maestro += e
            envio += e * 0.4
        filas.append((nivel, k))
    bat = s.pop('bat')
    eb = s.pop('envio_bat')
    if fijar:
        GANANCIAS['bat'] = 10 ** ((NIVEL_BATERIA - potencia_activa(bat)) / 20)
    kb = GANANCIAS['bat']
    bat = eq(compresor(bat * kb, -26, 3.0, 0.004, 0.09), ('alto', 5000, -2.0))
    DIAG['bat'] = bat.mean(axis=0)
    maestro += bat
    envio += eb * kb
    maestro += reverb(envio, rt_sala)
    maestro = eq(maestro, ('hp', 34, 2), ('bajo', 110, -2.5), ('lp', 10500, 3))
    maestro = compresor(maestro, -24, 1.8, 0.012, 0.18)
    maestro = maestro * curva_auto(auto, n, final)
    if informe and fijar:
        print('  stems (active dB):', ', '.join(f'{k} {v:.0f}' for v, k in filas), f', bat {NIVEL_BATERIA:.0f}')
    return maestro


# --- Output ---------------------------------------------------------------------------------------------------------------

def medir(ruta):
    return lufs(ruta)


def exportar_pueblo(salida, objetivo=-16.0, kbps=80):
    """The loop (32 bars on a ring) and the intro (4 bars, a ring with room for its tails), joined: the intro's last
    ~90 ms fade into the end of the loop's ring, so what plays after it is the loop's start with no break; the
    loop is the stretch from `inicio` to `fin`, and the half second after `fin` is the loop's own start."""
    P = componer()
    x = mezclar(P, N, AUTO)
    assert x.shape[1] == N
    I = componer_intro(P)
    n_i = N_INTRO + int(COLA_INTRO * SR)
    xi = mezclar(I, n_i, AUTO_INTRO, final=AUTO[0], fijar=False)
    x = x - x.mean(axis=1, keepdims=True)
    xi = xi - xi.mean(axis=1, keepdims=True)
    X = int(0.09 * SR)
    w = 0.5 - 0.5 * np.cos(np.pi * np.arange(X) / X)
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    m = int(round(MARGEN * SR))
    with tempfile.TemporaryDirectory() as d:
        for _ in range(5):
            y, yi = suave(x, g), suave(xi, g)
            intro = yi[:, :N_INTRO].copy()
            intro[:, -X:] = (1 - w) * intro[:, -X:] + w * y[:, -X:]
            trozo = np.concatenate([intro, y, y[:, :m]], axis=1)
            ruta = f'{d}/p.wav'
            escribir_wav(ruta, trozo)
            medido = lufs(ruta)
            if abs(medido - objetivo) < 0.08:
                break
            g *= db(objetivo - medido)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ruta, '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
    paso = np.abs(np.diff(np.concatenate([y, y[:, :1]], axis=1), axis=1))
    inicio, fin = N_INTRO / SR, (N_INTRO + N) / SR
    print(f'{salida}: {len(trozo[0]) / SR:.2f} s, {medido:.1f} LUFS, peak {np.max(np.abs(trozo)):.3f}, '
          f'loop {inicio:.6f}-{fin:.6f} s, ring join step {np.max(paso[:, -1]):.4f} '
          f'(median {np.median(paso):.4f}, p99.9 {np.percentile(paso, 99.9):.4f}), {os.path.getsize(salida) / 1e3:.0f} kB')
    print(f"  musica.ts: {{ url: solPueblo, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")


# --- The effects -------------------------------------------------------------------------------------------------------------

def a_mp3(x, salida, pico, kbps=64):
    """A mono effect: peak to `pico`, 24 kHz, MP3."""
    x = x - np.mean(x)
    x = x * (pico / np.max(np.abs(x)))
    with tempfile.TemporaryDirectory() as d:
        escribir_wav(f'{d}/e.wav', x[None, :])
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{d}/e.wav', '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
    r = np.sqrt(np.mean(x ** 2))
    print(f'{salida}: {len(x) / SR * 1000:.0f} ms, peak {np.max(np.abs(x)):.2f}, rms {20 * np.log10(r):.1f} dBFS, {os.path.getsize(salida)} bytes')


def lineal(x, rt=0.5, mezcla=0.12, semilla=3):
    """A small room for an effect (not a ring): the dry sound and a convolved tail."""
    r = np.random.default_rng(semilla)
    nm = int(rt * 1.2 * SR)
    t = tiempo(nm)
    ir = eq(r.standard_normal(nm), ('hp', 300, 2), ('lp', 6000, 2), circ=False) * np.exp(-6.9 * t / rt) * np.minimum(1, t / 0.01)
    ir /= np.sqrt(np.sum(ir ** 2))
    out = np.concatenate([x, np.zeros(nm)])
    cola = np.fft.irfft(np.fft.rfft(out) * np.fft.rfft(ir, len(out)), len(out))
    return out + mezcla * cola


def efecto_texto(salida):
    """The blip of a letter: a tiny pulse tick that chirps up a semitone in its first 5 ms, 35 ms, soft."""
    nm = int(0.036 * SR)
    t = tiempo(nm)
    f = 1318.5 * 2 ** (2 / 12 * np.minimum(1, t / 0.005))
    w = pulso(f, 0.25) + 0.3 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    w = eq(w, ('lp', 5000, 2), circ=False) * np.minimum(1, t / 0.0015) * np.exp(-t / 0.014)
    w[-48:] *= np.linspace(1, 0, 48)
    a_mp3(w, salida, 0.32)


def efecto_menu(salida):
    """The cursor/confirm tick: two quick pulse tones, A5 then E6 (a fifth up), 22 and 40 ms."""
    out = np.zeros(int(0.062 * SR))
    for t0, nota, dur, a in ((0.0, 'A5', 0.022, 0.8), (0.022, 'E6', 0.04, 1.0)):
        nm = int(dur * SR)
        t = tiempo(nm)
        f = np.full(nm, float(hz(midi(nota))))
        w = (pulso(f, 0.5) + 0.3 * pulso(f, 0.125)) * np.minimum(1, t / 0.0015) * np.exp(-t / (dur * 0.55))
        w[-32:] *= np.linspace(1, 0, 32)
        i0 = int(t0 * SR)
        out[i0:i0 + nm] += a * w
    a_mp3(eq(out, ('lp', 7000, 2), circ=False), salida, 0.5)


def efecto_poder(salida):
    """A psynergy cast: a rising, shimmering sweep with sparkles on top and a soft chime to close, 1.4 s."""
    dur, tope = 1.1, 0.85
    nm = int(dur * SR)
    t = tiempo(nm)
    u = np.clip(t / tope, 0, 1)
    cierre = np.where(t < tope, 1.0, np.exp(-(t - tope) / 0.07))
    # the sweep: two detuned saws climbing an exponential curve with a tremolo that quickens
    f = 260 * (9.0) ** (u ** 1.4)
    trem = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(7 + 16 * u) / SR)
    barrido = (sierra(f, 0.0) + sierra(f * 1.006, 0.3) + 0.6 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * trem
    barrido = eq(barrido, ('lp', 6500, 2), ('hp', 180, 2), circ=False)
    sweep = barrido * np.minimum(1, t / 0.06) * (u ** 0.8) * cierre * 0.5
    # a breath of air that opens up with it
    aire = ruido_ba(np.random.default_rng(2), nm, 1500, 9000) * (u ** 2) * cierre * 0.18
    out = sweep + aire
    # sparkles: bells climbing a D major pentatonic, quickening
    escala = [0, 2, 4, 7, 9]
    t0, k = 0.1, 0
    rng = np.random.default_rng(9)
    while t0 < tope:
        nota = 62 + 12 * (k // 5) + escala[k % 5]
        w = sintetizar('campana', nota, 0.1, 78 + int(rng.integers(0, 24)), razon=3.5, indice=1.5, tau=0.14 + 0.1 * (t0 / tope))
        i0 = int(t0 * SR)
        out[i0:i0 + len(w)] += 0.38 * w[:max(0, nm - i0)]
        t0 += 0.07 - 0.035 * (t0 / tope)
        k += 1
    # the chime at the top
    for nota, dt, a in (('D7', tope, 0.5), ('A6', tope + 0.02, 0.35), ('F#7', tope + 0.05, 0.28)):
        w = sintetizar('campana', midi(nota), 0.1, 100, razon=3.5, indice=1.2, tau=0.28)
        i0 = int(dt * SR)
        out[i0:i0 + len(w)] += a * w[:max(0, nm - i0)]
    out = lineal(out, rt=0.45, mezcla=0.2)[:int(1.4 * SR)]
    out[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR))
    a_mp3(out, salida, 0.8)


def efecto_puerta(salida):
    """A door and a step: the latch's click, a wooden creak that swings open, then a boot on the boards and a
    lighter second step."""
    dur = 0.64
    nm = int(dur * SR)
    out = np.zeros(nm)
    rng = np.random.default_rng(4)
    # latch: a dry double click
    for t0, f, a in ((0.0, 1500, 0.8), (0.035, 900, 0.5)):
        n1 = int(0.025 * SR)
        t = tiempo(n1)
        c = (ruido_ba(rng, n1, 800, 6000) * 0.8 + np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.004)
        i0 = int(t0 * SR)
        out[i0:i0 + n1] += a * c
    # creak: a stick-slip saw whose pitch wanders, through two narrow, moving resonances
    n2 = int(0.3 * SR)
    t = tiempo(n2)
    u = t / 0.3
    f = 150 + 60 * np.sin(np.pi * u) + 18 * np.sin(2 * np.pi * 23 * t) + 40 * u
    rasca = sierra(f, 0.0) * (0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(32 + 20 * u) / SR))
    rasca = eq(rasca, ('hp', 150, 2), ('pico', 600, 7.0, 0.3), ('pico', 1500, 5.0, 0.3), ('lp', 3200, 2), circ=False)
    rasca = rasca * np.sin(np.pi * u) ** 0.8
    i0 = int(0.05 * SR)
    out[i0:i0 + n2] += 0.55 * rasca
    # steps: a thud (a short low sine drop) with a wood knock on top
    for t0, a in ((0.33, 1.0), (0.47, 0.6)):
        n3 = min(int(0.16 * SR), nm - int(t0 * SR))
        t = tiempo(n3)
        golpe = np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.05)
        madera = (np.sin(2 * np.pi * 420 * t) * 0.5 + ruido_ba(rng, n3, 500, 3500)) * np.exp(-t / 0.012)
        i0 = int(t0 * SR)
        out[i0:i0 + n3] += a * (1.1 * golpe + 0.5 * madera)
    out = lineal(out, rt=0.3, mezcla=0.12)[:nm]
    out[-96:] *= np.linspace(1, 0, 96)
    a_mp3(out, salida, 0.8)


def efectos(carpeta):
    os.makedirs(carpeta, exist_ok=True)
    ruta = lambda n: os.path.join(carpeta, n)
    efecto_texto(ruta('sol-texto.mp3'))
    efecto_poder(ruta('sol-poder.mp3'))
    efecto_menu(ruta('sol-menu.mp3'))
    efecto_puerta(ruta('sol-puerta.mp3'))


# --- Checks ---------------------------------------------------------------------------------------------------------------------

def decodificar(ruta, ar=24000):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '2', '-ar', str(ar), '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def analisis(carpeta):
    """The decoded MP3: the loop's seam (the step across the jump from `fin` to `inicio`, and how much the half
    second after `fin` differs from the half second after `inicio`), levels per second, bands, the effects."""
    ar = 24000
    x = decodificar(os.path.join(carpeta, 'sol-pueblo.mp3'), ar)
    inicio, fin = N_INTRO / SR, (N_INTRO + N) / SR
    i0, i1 = int(round(inicio * ar)), int(round(fin * ar))
    print(f'sol-pueblo.mp3: {x.shape[1] / ar:.2f} s decoded, peak {np.max(np.abs(x)):.3f}, loop {inicio:.4f}-{fin:.4f}')
    paso = np.median(np.abs(np.diff(x[:, i0:i0 + ar * 20], axis=1)))
    salto = np.max(np.abs(x[:, i1 - 1] - x[:, i0]))
    print(f'  jump back from fin to inicio: {salto:.4f} (median step {paso:.4f}; 99.9th percentile '
          f'{np.percentile(np.abs(np.diff(x[:, i0:i1], axis=1)), 99.9):.4f})')
    k = int(MARGEN * ar)
    a, b = x[:, i1:i1 + k], x[:, i0:i0 + k]
    n = min(a.shape[1], b.shape[1])
    dif = 20 * np.log10(np.sqrt(np.mean((a[:, :n] - b[:, :n]) ** 2)) / np.sqrt(np.mean(b[:, :n] ** 2)))
    print(f'  the {MARGEN} s after fin against the {MARGEN} s after inicio: {dif:.1f} dB below the signal (mp3 noise only)')
    mono = x.mean(axis=0)
    v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + ar] ** 2)) + 1e-9) for i in range(0, len(mono) - ar, ar)]
    print('  dB per second:', ' '.join(f'{d:.0f}' for d in v))
    print(f'  loop: rms {20 * np.log10(np.sqrt(np.mean(x[:, i0:i1] ** 2))):.1f} dBFS; loudest second {max(v):.0f}, quietest in the loop {min(v[int(inicio):int(fin)]):.0f}')
    sp = np.abs(np.fft.rfft(mono[i0:i1])) ** 2
    fr = np.fft.rfftfreq(i1 - i0, 1 / ar)
    bandas = [(30, 150), (150, 500), (500, 2000), (2000, 5000), (5000, 12000)]
    tot = sp.sum()
    print('  energy by band (Hz): ' + ', '.join(f'{lo}-{hi}: {10 * np.log10(sp[(fr >= lo) & (fr < hi)].sum() / tot):.1f} dB' for lo, hi in bandas))
    for nombre in ('sol-texto', 'sol-poder', 'sol-menu', 'sol-puerta'):
        e = decodificar(os.path.join(carpeta, nombre + '.mp3'), ar).mean(axis=0)
        print(f'{nombre}.mp3: {len(e) / ar * 1000:.0f} ms, peak {np.max(np.abs(e)):.2f}, rms {20 * np.log10(np.sqrt(np.mean(e ** 2))):.1f} dBFS')


if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in ('pueblo', 'efectos', 'analisis') else 'todo'
    resto = sys.argv[2:] if modo != 'todo' else sys.argv[1:]
    carpeta = resto[0] if resto else '../../src/sonido'
    if modo == 'pueblo':
        exportar_pueblo(carpeta if carpeta.endswith('.mp3') else os.path.join(carpeta, 'sol-pueblo.mp3'))
    else:
        os.makedirs(carpeta, exist_ok=True)
        if modo == 'todo':
            exportar_pueblo(os.path.join(carpeta, 'sol-pueblo.mp3'))
        if modo in ('todo', 'efectos'):
            efectos(carpeta)
        if modo == 'analisis':
            analisis(carpeta)
