# «Alacant Sun», the road and the fights: the second half of the sound of Pablo's Golden Sun parody
# (chapter 2, src/sol/). Like sol.py, all of it is our own: no melody, chord progression or motif of the original
# (nor of any other song), written in the manner of a 2001 Game Boy Advance fantasy RPG (progressive rock squeezed
# into a tiny sound chip: bright pulse leads, flute, synth strings, picked synth bass, harp and music-box
# ostinatos, brass, crisp «sampled» drums, a small hall).
# It does not copy sol.py: it imports it and uses its score tools (Partitura, melodia, pad_voces, arpa_compas,
# bajo_compas, bateria, ...), its instruments and drums, its mixer and its output helpers, which in turn stand on
# the ring-shaped tools of brio.py (filters, reverb and compressor by FFT, so a round that is played over and over
# joins with no click and no fade). sol.py keeps its tempo, chords and mix in module variables; `tema()` sets them
# for a track (tempo, chords, extra stems) and puts them back, so sol.py generates exactly what it did before.
# Pure synthesis with numpy: no SoundFont, no fluidsynth, no scipy, no mido.
#
#   «solCamino»   the road to the Theatre across the fields of Alicante at night (almond and orange trees, the sea
#                 far away): A mixolydian / D major, 100 bpm, 28 bars (67.2 s) in a loop after a 4-bar intro
#                 (2 own bars + the loop's last 2) that is heard once. Structure (bars):
#                   1-8    A   flute tune over a harp ostinato, strings, picked bass, rim and shaker, crickets
#                   9-16   A'  the tune on a pulse lead with the flute and an oboe a third below, pizzicato
#                              off-beats, a full kit, brass coming in
#                   17-24  B   the sea (D major): a broad flute tune, 3+3+2 harp, music-box bells, swells of
#                              surf, strings, brass answering, a half-time kit
#                   25-28  C   the build back to A: flute, pulse lead and brass in unison, a snare roll, toms
#   «solCombate»  the normal fight: E minor (dorian / major lifts), 150 bpm, 32 bars (51.2 s) in a loop after a
#                 2-bar intro (1 own + the loop's last) that is heard once. Structure (bars):
#                   1-8    A   pulse hook over a galloping guitar riff, a 16th-note bass, a rock kit, brass stabs
#                   9-16   B   the chorus lifts to C / D major: lead and brass in unison, open power chords
#                   17-24  C   the bridge in A minor with a 3+3+2 kit and harp, flute tune, a sweep of arpeggios
#                   25-32  A'  the hook again, doubled by brass and oboe, a fill in the last bar
#   solVictoria   the victory fanfare: E major, 150 bpm, 2.5 bars (5.3 s with its tail), heard once
#   solNivel      the level-up jingle: A major, 150 bpm, an arpeggio and a held chord (2.2 s), heard once
#   effects (mono, short):
#   solEncuentro  the swirl that goes into a fight (1 s)      solGolpe       a physical hit (0.25 s)
#   solCura       a rising glitter, healing (0.8 s)           solApuntador   a little prompter let go (0.8 s)
#   solCae        a defeated enemy falling apart (0.6 s)      solHuir        quick steps going away (0.6 s)
#
#   python3 sol_combate.py [carpeta]            -> the 12 MP3 in `carpeta` (the game's copy: ../../src/sonido)
#   python3 sol_combate.py camino [salida]      only the road theme
#   python3 sol_combate.py combate [salida]     only the fight theme
#   python3 sol_combate.py fanfarrias [carpeta] only the victory fanfare and the level-up jingle
#   python3 sol_combate.py efectos [carpeta]    only the six effects
#   python3 sol_combate.py revisar              lists the melody notes on a beat that are not tones of their chord
#   python3 sol_combate.py analisis [carpeta]   measures the MP3 (seam, levels, spectrum, lengths)
import os
import subprocess
import sys
import tempfile
from contextlib import contextmanager
import numpy as np
import sol as S
from sol import Partitura, melodia, pad_voces, arpa_compas, bajo_compas, bateria, redoble, tambores, \
    armonia_debajo, acorde_pcs, raiz_grave, tiempo, adsr, pulso, ruido_ba, inst, sintetizar, a_mp3, lineal, \
    decodificar, mezclar, medir
from brio import SR, db, hz, midi, eq, sierra, suave, escribir_wav, lufs, vel_a_amp

L = 4
OBJETIVO = -16.0                     # LUFS: the same as solPueblo

# --- Extra instruments (registered in sol.py's table, so its mixer plays them) -----------------------------------------


@inst
def guitarra(m, g, v, rng, mute=0):
    """A driven synth guitar for the riffs: two saws a few cents apart through a hard clip and a mid hump; muted
    notes (`mute`) are short and dark, open ones ring."""
    nm = int((g + 0.3) * SR) + 1
    t = tiempo(nm)
    f = np.full(nm, float(hz(m)))
    w = (sierra(f * 2 ** (-9 / 1200), rng.random()) + sierra(f * 2 ** (9 / 1200), rng.random())) / 2
    w = np.tanh(3.2 * w)
    w = eq(w, ('hp', 85, 2), ('pico', 950, 5.0, 0.6), ('lp', 1900 if mute else 3300, 2), circ=False)
    e = adsr(nm, g, 0.003, 0.07, 0.0, 0.03) if mute else adsr(nm, g, 0.004, 0.5, 0.55, 0.09)
    return w * e * vel_a_amp(v) * 0.9


@inst
def oleaje(m, g, v, rng):
    """Surf far away: a dark noise that swells and falls, with a little air at the crest of each wave."""
    nm = int(g * SR) + 1
    t = tiempo(nm)
    r = rng.standard_normal(nm)
    ola = np.sin(np.pi * np.clip(t / g, 0, 1)) ** 2
    oscuro = eq(r, ('hp', 90, 2), ('lp', 700, 2), circ=False)
    aire = eq(r, ('hp', 1200, 2), ('lp', 4200, 2), circ=False)
    w = oscuro * ola + 0.35 * aire * ola ** 3
    return w * vel_a_amp(v) * 1.4


@inst
def grillo(m, g, v, rng):
    """A cricket: three or four chirps of a narrow high tone, a short silence between them."""
    nm = int(0.4 * SR)
    t = tiempo(nm)
    f = float(hz(m))
    w = np.zeros(nm)
    for k in range(4):
        t0 = k * 0.07
        u = np.clip((t - t0) / 0.045, 0, 1)
        w += np.sin(2 * np.pi * f * (1 + 0.004 * k) * t) * np.sin(np.pi * u) ** 2 * ((t >= t0) & (t < t0 + 0.045))
    return w * vel_a_amp(v) * 0.5


# name: (pan, active level dB, reverb send, echo): the stems sol.py does not know
NUEVOS = dict(guitarra=(-0.2, -25.0, 0.1, 0.0), oleaje=(0.0, -33.0, 0.45, 0.0), grillo=(0.7, -38.0, 0.35, 0.0))


@contextmanager
def tema(bpm, acordes):
    """Sets sol.py's tempo, chords and mix for a track and puts them back afterwards."""
    claves = ('BPM', 'BEAT', 'BARRAS', 'ACORDES', 'MEZCLA')
    guardado = {k: getattr(S, k) for k in claves}
    S.BPM, S.BEAT, S.BARRAS, S.ACORDES = bpm, 60.0 / bpm, len(acordes), acordes
    S.MEZCLA = {**guardado['MEZCLA'], **NUEVOS}
    S.GANANCIAS.clear()
    try:
        yield
    finally:
        for k, v in guardado.items():
            setattr(S, k, v)
        S.GANANCIAS.clear()


def muestras_barras(bpm, barras):
    """Samples in `barras` bars; the tempos used here make a beat a whole number of samples."""
    por_tiempo = 60.0 * SR / bpm
    assert por_tiempo == int(por_tiempo), bpm
    return int(por_tiempo) * L * barras


# =================================================================================================================
# solCamino
# =================================================================================================================

BPM_CAMINO = 100
BARRAS_CAMINO = 28

AC_CA = [['A'], ['G', 'D'], ['Bm7'], ['Esus4', 'E'], ['A'], ['F#m7', 'Dmaj7'], ['G', 'E7sus4'], ['A']]
AC_CA2 = [['A'], ['G', 'D'], ['Bm7'], ['Esus4', 'E'], ['A'], ['F#m7', 'Dmaj7'], ['G', 'Bm7'], ['E7sus4', 'E']]
AC_CB = [['Dmaj7'], ['C#m7', 'F#7'], ['Bm7'], ['E7sus4', 'E7'], ['Dmaj7'], ['F#m7', 'Bm7'], ['G', 'A'], ['Esus4', 'E7']]
AC_CC = [['Bm7'], ['G'], ['Dmaj7', 'E7sus4'], ['E7sus4', 'E7']]
ACORDES_CAMINO = AC_CA + AC_CA2 + AC_CB + AC_CC

# The tunes (A mixolydian; D major in B). On every beat a long note is a tone of its chord.
MEL_CA = melodia('E5:4 A5:2 G5:2 E5:4 C#5:4 | B5:2 A5:2 G5:4 F#5:4 A5:4 | D6:6 B5:2 A5:4 F#5:4 | E5:4 A5:2 B5:2 G#5:8 |'
                 'C#6:4 E6:2 D6:2 C#6:4 A5:4 | A5:4 C#6:4 D6:2 C#6:2 A5:4 | B5:4 D6:4 E6:4 D6:2 B5:2 | A5:8 B5:2 A5:2 E5:4')
MEL_CA2 = melodia('A5:2 C#6:2 E6:4 D6:2 C#6:2 A5:4 | B5:4 D6:2 G6:2 F#6:4 D6:4 | D6:3 F#6:3 B6:2 A6:4 F#6:4 | E6:4 B5:2 A5:2 G#5:4 B5:4 |'
                  'C#6:2 E6:2 A6:4 G6:2 E6:2 C#6:4 | F#6:4 E6:2 C#6:2 D6:4 A5:4 | G6:4 B5:2 D6:2 F#6:6 D6:2 | E6:6 D6:2 B5:4 G#5:4')
MEL_CB = melodia('A5:6 F#5:2 D6:8 | E6:4 G#5:4 A#5:2 C#6:2 F#6:4 | D6:6 F#6:2 A6:4 F#6:2 D6:2 | E6:4 D6:4 B5:2 D6:2 G#5:4 |'
                 'F#6:6 E6:2 D6:4 A5:4 | C#6:4 A5:4 B5:2 D6:2 F#6:4 | B5:4 D6:4 C#6:4 E6:4 | E6:4 B5:2 A5:2 G#5:8')
MEL_CC = melodia('F#5:3 B5:3 D6:2 F#6:8 | G5:3 B5:3 D6:2 G6:4 B6:4 | A5:3 D6:3 F#6:2 E6:4 A6:4 | B6:4 A6:2 G#6:2 E6:8')

BAJO_CA = ['R..R..O.R..R..F.', 'R..R..O.R..RgSF.']
BAJO_CA2 = ['R.gRR.O.R.gRF.OS', 'R.gRR.O.R.gRF.S.']
BAJO_CB = 'r.......r.....F.'


def componer_camino():
    """The 28 bars of the round -> a Partitura (beats count from the start of the round; a bar is 4)."""
    P = Partitura()
    vp = [50] * 4 + [60] * 4 + [72] * 8 + [88] * 8 + [70, 80, 92, 102]
    pad_voces(P, 0, ACORDES_CAMINO, vp)
    P.nota('bat', 0.0, 1, 'crash', 90)
    rng = np.random.default_rng(17)
    # ---- A (bars 1-8): the flute, a harp in eighths, a picked bass, rim shots and shaker, crickets
    for b, d, m, _ in MEL_CA:
        P.nota('flauta', b, d * 0.94, m, 92 + (6 if b % 1 == 0 else 0), vib=1 if d >= 1 else 0)
    for c in range(8):
        arpa_compas(P, c, 'corcheas', 52)
        bajo_compas(P, c, BAJO_CA[c % 2], -8 if c < 4 else -3)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'rim': '....x.......x...', 'pandereta': 'o.o.o.o.o.o.o.o.'}, -22 if c < 4 else -14)
        for _ in range(2):                                              # crickets, here and there, never on a pattern
            P.nota('grillo', c * L + float(rng.integers(0, 15)) / 4, 0.4, 108 + int(rng.integers(0, 3)), 46 + int(rng.integers(0, 22)))
    tambores(P, 7 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 76, 96)
    # ---- A' (bars 9-16): pulse lead + flute, oboe a third below, pizzicato off-beats, the kit, brass from bar 13
    for b, d, m, _ in MEL_CA2:
        P.nota('lead', 32 + b, d * 0.92, m, 100 + (6 if b % 1 == 0 else 0), duty=0.25, vib=1 if d >= 1 else 0)
        P.nota('flauta', 32 + b, d * 0.94, m, 60, vib=1 if d >= 1 else 0)
        P.nota('oboe', 32 + b, d * 0.9, armonia_debajo(m, S.ch_en(32 + b)), 64)
        if b >= 16:
            P.nota('metal', 32 + b, d * 0.9, m - 12, 64 + int(14 * (b - 16) / 16))
    for c in range(8, 16):
        arpa_compas(P, c, 'corcheas', 58)
        bajo_compas(P, c, BAJO_CA2[c % 2], 3)
        bateria(P, c, {'bombo': 'x.....x..x.x....', 'caja': '....x.......x..o', 'charles': 'x.o.x.o.x.o.x.o.',
                       'pandereta': '..x...x...x...x.'}, 0)
        for p in (4, 12):
            b = c * L + p / 4
            for m in S.tonos(S.ch_en(b), 'C4', 'G5')[:3]:
                P.nota('pizz', b, 0.25, m, 76 + (6 if p == 12 else 0))
    P.nota('bat', 32.0, 1, 'crash', 100)
    redoble(P, 11 * L + 3.0, 1.0, 50, 100, 'caja')
    tambores(P, 15 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 88, 116, 0.25)
    # ---- B (bars 17-24): the sea. Broad flute tune, strings, bells, a 3+3+2 harp, surf, brass answering, half-time
    for b, d, m, _ in MEL_CB:
        P.nota('flauta', 64 + b, d * 0.95, m, 94, vib=1 if d >= 1 else 0)
        P.nota('oboe', 64 + b, d * 0.9, armonia_debajo(m, S.ch_en(64 + b)), 54)
        if b >= 16:
            P.nota('metal', 64 + b, d * 0.9, m - 12, 62 + int(16 * (b - 16) / 16))
    for k in range(4):
        P.nota('oleaje', 64.0 + 8 * k, 7.6, 0, 66 + 6 * k)
    P.nota('bat', 64.0, 1, 'crash', 96)
    for c in range(16, 24):
        arpa_compas(P, c, 'tresytres', 52)
        arpa_compas(P, c, 'corcheas', 46, desde='C5', hasta='C7', pista='campana')
        bajo_compas(P, c, BAJO_CB, 2)
        bateria(P, c, {'bombo': 'x.......x.....x.', 'caja': '........x.......', 'charles': 'o.o.o.o.o.o.o.o.'}, -8)
        if c % 2 == 0:
            P.nota('bat', c * L, 0.5, 'plato', 72)
    tambores(P, 23 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 86, 108)
    # ---- C (bars 25-28): the build back to A: flute, pulse lead and brass in unison, a rising roll
    for b, d, m, _ in MEL_CC:
        f = 70 + int(26 * b / 16)
        P.nota('flauta', 96 + b, d * 0.95, m, 84 + int(10 * b / 16), vib=1 if d >= 1.5 else 0)
        P.nota('lead', 96 + b, d * 0.92, m, f, duty=0.5, vib=1 if d >= 1.5 else 0)
        P.nota('metal', 96 + b, d * 0.9, m - 12, 54 + int(46 * b / 16))
    for c, est in zip(range(24, 28), ('corcheas', 'tresytres', 'semis', 'semis')):
        arpa_compas(P, c, est, 54 + 8 * (c - 24), desde='C4', hasta='C6')
    bajo_compas(P, 24, 'R..gR..gR..gR..g', 0)
    bajo_compas(P, 25, 'R.R.R.R.R.R.R.R.', 4)
    bajo_compas(P, 26, 'RgR.RgR.RgR.RgR.', 8)
    bajo_compas(P, 27, 'RRgRRRgRRRgRRRgR', 10)
    bateria(P, 24, {'bombo': 'x.......x.......', 'charles': 'o...o...o...o...'}, -14)
    bateria(P, 25, {'bombo': 'x...x...x...x...', 'charles': 'o.o.o.o.o.o.o.o.', 'rim': '....x.......x...'}, -4)
    bateria(P, 26, {'bombo': 'x...x...x...x...', 'caja': 'x.x.x.x.x.x.x.x.'}, -22)
    redoble(P, 27 * L, 4.0, 48, 124, 'caja')
    P.nota('bat', 27 * L, 0.25, 'bombo', 110)
    P.nota('bat', 27 * L + 2.0, 0.25, 'bombo', 112)
    tambores(P, 27 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    return P


def intro_camino(P):
    """The intro (4 bars): the field at night alone (crickets, surf, strings swelling, the harp climbing) and then
    the loop's last two bars, as they are in the round."""
    I = Partitura()
    I.nota('oleaje', 0.0, 7.6, 0, 60)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (45, 52, 57, 61), 44, lado=pista[-1])
        I.nota(pista, 4.0, 4.15, (45, 52, 57, 61), 58, lado=pista[-1])
    rng = np.random.default_rng(23)
    for k in range(7):
        I.nota('grillo', float(rng.integers(0, 31)) / 4, 0.4, 108 + int(rng.integers(0, 3)), 52 + int(rng.integers(0, 20)))
    for k, m in enumerate(('A3', 'C#4', 'E4', 'A4', 'C#5', 'E5', 'A5', 'C#6')):
        I.nota('arpa', 4.0 + k * 0.5, 0.5, midi(m), 50 + 5 * k + (8 if k == 0 else 0))
    I.nota('campana', 7.5, 0.5, midi('E6'), 70)
    I.anadir(P.trozo(26 * L, 28 * L, 2 * L))
    return I


AUTO_CAMINO = [-3.0] * 4 + [-1.5] * 4 + [0.0] * 8 + [0.5] * 8 + [-3.0, -2.0, -0.5, 1.0]
AUTO_INTRO_CAMINO = [-3.5, -3.0, AUTO_CAMINO[26], AUTO_CAMINO[27]]

# =================================================================================================================
# solCombate
# =================================================================================================================

BPM_COMBATE = 150
BARRAS_COMBATE = 32

AC_CO_A = [['Em'], ['Em', 'D'], ['C'], ['C', 'B7'], ['Em'], ['Em', 'G'], ['Am7', 'D'], ['B7sus4', 'B7']]
AC_CO_B = [['C'], ['D'], ['Em', 'G'], ['A', 'B7'], ['C'], ['D'], ['Bm7', 'Em'], ['B7sus4', 'B7']]
AC_CO_C = [['Am7'], ['G'], ['Fmaj7'], ['Fmaj7', 'E'], ['Am7'], ['Cmaj7', 'Bm7'], ['Cmaj7', 'D'], ['B7sus4', 'B7']]
ACORDES_COMBATE = AC_CO_A + AC_CO_B + AC_CO_C + AC_CO_A

MEL_CO_A = melodia('B5:3 E6:3 D6:2 B5:2 G5:2 E5:4 | G5:2 B5:2 E6:4 F#6:2 D6:2 A5:4 | E6:3 G6:3 E6:2 C6:4 G5:4 | E6:2 C6:2 G5:4 D#6:2 F#6:2 B5:4 |'
                   'B5:3 E6:3 G6:2 F#6:2 E6:2 B5:4 | E6:4 D6:2 B5:2 G5:2 B5:2 D6:4 | C6:2 E6:2 A6:4 F#6:3 A6:3 D6:2 | E6:4 B5:2 A5:2 D#6:2 F#6:2 B6:4')
MEL_CO_B = melodia('G5:4 C6:4 E6:4 G6:4 | F#6:6 A6:2 F#6:4 D6:4 | G6:4 E6:4 D6:4 B5:4 | C#6:2 E6:2 A6:4 F#6:4 D#6:4 |'
                   'G6:6 E6:2 C6:4 E6:4 | A6:4 F#6:4 D6:4 F#6:4 | D6:4 F#6:4 G6:4 B6:4 | E6:4 F#6:2 E6:2 D#6:4 F#6:4')
MEL_CO_C = melodia('E6:6 C6:2 A5:4 C6:4 | D6:6 B5:2 G5:4 B5:4 | A5:6 C6:2 F6:4 E6:4 | C6:4 A5:4 G#5:4 B5:4 |'
                   'A5:3 C6:3 E6:2 G6:4 E6:4 | E6:4 G6:4 F#6:4 D6:4 | G6:4 E6:4 F#6:4 A6:4 | B5:2 E6:2 F#6:2 A6:2 B6:2 A6:2 F#6:2 D#6:2')

BAJO_CO_A = ['R.gRR.gRR.gRR.OR', 'R.gRR.gRR.gRF.SO']
BAJO_CO_B = 'R...O.R.R...O.F.'
BAJO_CO_C = 'R..R..R.R..R..O.'
BAJO_CO_FILL = 'R.R.R.R.RRRRRRRR'
RIFF_A = 'X.xxX.xxX.xxX.xx'
KICK_A = ['x.....x.x.x.....', 'x..x..x...x.x...']


def guitarra_compas(P, compas, patron, vel, quinta=True):
    """A power-chord riff: root and fifth of the bar's chord at each hit ('X' rings, 'x' is muted)."""
    assert len(patron) == 16, patron
    for p, c in enumerate(patron):
        if c == '.':
            continue
        b = compas * L + p / 4
        r = raiz_grave(S.ch_en(b), 40)
        d, mute = (0.45, 0) if c == 'X' else (0.2, 1)
        for m in ((r, r + 7, r + 12) if quinta else (r,)):
            P.nota('guitarra', b, d, m, vel + (8 if c == 'X' else 0), mute=mute)


def componer_combate():
    """The 32 bars of the round -> a Partitura."""
    P = Partitura()
    vp = [56] * 8 + [78] * 8 + [62] * 8 + [76] * 8
    pad_voces(P, 0, ACORDES_COMBATE, vp)
    P.nota('bat', 0.0, 1, 'crash', 104)
    # ---- A (bars 1-8): the hook on a pulse lead and an oboe a third below, a galloping riff, brass stabs
    for b, d, m, _ in MEL_CO_A:
        P.nota('lead', b, d * 0.92, m, 102 + (6 if b % 1 == 0 else 0), duty=0.25, vib=1 if d >= 1.5 else 0)
        P.nota('oboe', b, d * 0.9, armonia_debajo(m, S.ch_en(b)), 56)
    for c in range(8):
        guitarra_compas(P, c, RIFF_A, 78)
        bajo_compas(P, c, BAJO_CO_FILL if c == 7 else BAJO_CO_A[c % 2], 0)
        bateria(P, c, {'bombo': KICK_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, -4)
    for c in (3, 7):
        for m in ('E4', 'G4', 'B4', 'E5') if c == 3 else ('B3', 'E4', 'F#4', 'B4'):
            P.nota('metal', c * L + 3.0, 0.9, midi(m), 98)
    tambores(P, 3 * L + 3.0, ('tom1', 'tom2'), 84, 96, 0.5)
    tambores(P, 7 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 88, 112)
    # ---- B (bars 9-16): the chorus. Lead and brass in unison, open power chords, bells
    P.nota('bat', 32.0, 1, 'crash', 110)
    for b, d, m, _ in MEL_CO_B:
        P.nota('lead', 32 + b, d * 0.92, m, 98, duty=0.5, vib=1 if d >= 1.5 else 0)
        P.nota('metal', 32 + b, d * 0.92, m - 12, 92)
        P.nota('flauta', 32 + b, d * 0.94, m + 12 if m < 84 else m, 52, vib=1 if d >= 1.5 else 0)
    for c in range(8, 16):
        guitarra_compas(P, c, 'X.......X.xxX.xx' if c % 2 == 0 else 'X.......X.......', 80)
        arpa_compas(P, c, 'corcheas', 56, desde='C5', hasta='C7', pista='campana')
        bajo_compas(P, c, BAJO_CO_FILL if c == 15 else BAJO_CO_B, 4)
        bateria(P, c, {'bombo': 'x..x..x.x.x.x...', 'caja': '....X.......X..x', 'charles': 'x.x.x.x.x.x.x.x.',
                       'abierto': '..o...o...o...o.'}, 0)
        if c in (8, 12):
            P.nota('bat', c * L, 1, 'crash', 100)
    redoble(P, 11 * L + 3.0, 1.0, 54, 108, 'caja')
    tambores(P, 15 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 90, 118, 0.25)
    # ---- C (bars 17-24): the bridge in A minor. Flute tune, a harp in 3+3+2, a thinner kit, then a sweep of arpeggios
    P.nota('bat', 64.0, 1, 'crash', 96)
    for b, d, m, _ in MEL_CO_C:
        if b < 28:                                                      # bars 17-23: the flute; bar 24 is the lead's run
            P.nota('flauta', 64 + b, d * 0.95, m, 94, vib=1 if d >= 1.5 else 0)
            P.nota('oboe', 64 + b, d * 0.9, armonia_debajo(m, S.ch_en(64 + b)), 54)
        else:
            P.nota('lead', 64 + b, d * 0.92, m, 92, duty=0.25)
            P.nota('flauta', 64 + b, d * 0.92, m, 70)
    for c in range(16, 24):
        arpa_compas(P, c, 'tresytres', 60)
        bajo_compas(P, c, BAJO_CO_FILL if c == 23 else BAJO_CO_C, 0)
        bateria(P, c, {'bombo': 'x..x..x.x..x..x.', 'rim': '....x.......x...', 'charles': 'o.o.o.o.o.o.o.o.'}, -6)
        if c % 2 == 0:
            P.nota('bat', c * L, 0.5, 'plato', 66)
        if c >= 20:
            guitarra_compas(P, c, 'X.......X.......', 64, quinta=True)
    redoble(P, 23 * L + 2.0, 2.0, 50, 112, 'caja')
    # ---- A' (bars 25-32): the hook again, doubled by brass, with a fill at the end
    P.nota('bat', 96.0, 1, 'crash', 110)
    for b, d, m, _ in MEL_CO_A:
        P.nota('lead', 96 + b, d * 0.92, m, 104 + (6 if b % 1 == 0 else 0), duty=0.25, vib=1 if d >= 1.5 else 0)
        P.nota('metal', 96 + b, d * 0.9, m - 12, 80)
        P.nota('oboe', 96 + b, d * 0.9, armonia_debajo(m, S.ch_en(96 + b)), 60)
    for c in range(24, 32):
        guitarra_compas(P, c, RIFF_A, 82)
        bajo_compas(P, c, BAJO_CO_FILL if c == 31 else BAJO_CO_A[c % 2], 2)
        bateria(P, c, {'bombo': KICK_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, 0)
        if c in (24, 28):
            P.nota('bat', c * L, 1, 'crash', 102)
    for m in ('E4', 'G4', 'B4', 'E5'):
        P.nota('metal', 27 * L + 3.0, 0.9, midi(m), 100)
    tambores(P, 27 * L + 3.0, ('tom1', 'tom2'), 86, 98, 0.5)
    redoble(P, 31 * L + 1.0, 3.0, 52, 124, 'caja')
    tambores(P, 31 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    P.nota('bat', 31 * L, 0.25, 'bombo', 110)
    P.nota('bat', 31 * L + 2.0, 0.25, 'bombo', 112)
    return P


def intro_combate(P):
    """The intro (2 bars): a chord hit with a crash and a snare run, then the loop's last bar (the fill)."""
    I = Partitura()
    I.nota('bat', 0.0, 1, 'crash', 112)
    I.nota('bat', 0.0, 0.25, 'bombo', 110)
    for m in ('E3', 'B3', 'E4', 'G4', 'B4', 'E5'):
        I.nota('metal', 0.0, 1.5, midi(m), 104)
    for m in (40, 47, 52):
        I.nota('guitarra', 0.0, 2.0, m, 94, mute=0)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (52, 59, 64, 67), 70, lado=pista[-1])
    I.nota('bat', 2.0, 0.25, 'bombo', 100)
    redoble(I, 2.0, 2.0, 50, 100, 'caja')
    I.anadir(P.trozo(31 * L, 32 * L, 1 * L))
    return I


AUTO_COMBATE = [-0.5] * 8 + [1.0] * 8 + [-2.5] * 6 + [-1.5, 0.0] + [0.5] * 7 + [1.0]
AUTO_INTRO_COMBATE = [0.0, AUTO_COMBATE[31]]

# =================================================================================================================
# solVictoria and solNivel
# =================================================================================================================

BPM_FANFARRIA = 150


def componer_victoria():
    """The fanfare: 2 bars and 3 beats at 150 bpm (4.4 s). E major."""
    P = Partitura()
    mel = melodia('B4:2 E5:2 G#5:2 B5:2 E6:8 | A5:3 C#6:3 E6:2 D#6:4 F#6:4 | B6:2 G#6:2 E7:12')
    for b, d, m, _ in mel:
        long = d >= 1
        P.nota('lead', b, d * 0.95, m, 104, duty=0.25, vib=1 if d >= 2 else 0)
        P.nota('metal', b, d * 0.95, m - 12, 108)
        P.nota('flauta', b, d * 0.95, m, 70, vib=1 if long else 0)
        P.nota('oboe', b, d * 0.9, armonia_debajo(m, S.ch_en(b)), 74)
    pad_voces(P, 0, ACORDES_VICTORIA, [86, 96, 108])
    bajo_compas(P, 0, 'R.R.O.R.R.R.O.R.', 6)
    bajo_compas(P, 1, 'R..RR..RF..FF..F', 6)
    bajo_compas(P, 2, 'r...............', 12)
    P.nota('bat', 0.0, 1, 'crash', 108)
    P.nota('bat', 0.0, 0.25, 'bombo', 112)
    redoble(P, 1.0, 2.0, 62, 110, 'tom4')
    for b, v in ((4.0, 100), (6.0, 100), (7.0, 104), (7.5, 108)):
        P.nota('bat', b, 0.25, 'bombo', v)
    for b, nombre in ((5.0, 'caja'), (7.0, 'caja'), (7.5, 'caja'), (7.75, 'caja')):
        P.nota('bat', b, 0.25, nombre, 100)
    P.nota('bat', 8.0, 2.0, 'crash', 118)
    P.nota('bat', 8.0, 0.25, 'bombo', 118)
    P.nota('bat', 8.0, 0.5, 'tom4', 120)
    # a harp glissando up the chord into the last chord, and bells on top
    notas = [m for m in range(midi('E3'), midi('E6') + 1) if m % 12 in (4, 8, 11)]
    for k, m in enumerate(notas):
        P.nota('arpa', 7.0 + k * 0.1, 0.4, m, 70 + k)
    for m, dt in (('E6', 0.0), ('B6', 0.06), ('G#6', 0.12), ('E7', 0.18)):
        P.nota('campana', 8.0 + dt, 0.5, midi(m), 90)
    return P


ACORDES_VICTORIA = [['E'], ['A', 'B'], ['E']]


def componer_nivel():
    """The level-up jingle: a quick A major arpeggio and a held chord. 150 bpm."""
    P = Partitura()
    paso = 0.2
    for k, m in enumerate(('E5', 'A5', 'C#6', 'E6', 'A6')):
        P.nota('lead', k * paso, paso * 0.9, midi(m), 92 + 4 * k, duty=0.25)
        P.nota('campana', k * paso, 0.4, midi(m) + 12, 66 + 5 * k)
    b = 5 * paso
    P.nota('lead', b, 2.0, midi('C#7'), 106, duty=0.5, vib=1)
    P.nota('metal', b, 1.8, midi('A5'), 100)
    P.nota('metal', b, 1.8, midi('E6'), 96)
    P.nota('flauta', b, 2.0, midi('A6'), 78, vib=1)
    for pista in ('cuerdasI', 'cuerdasD'):
        P.nota(pista, b, 2.0, (45, 52, 57, 61, 68), 96, lado=pista[-1])
    P.nota('bajo', b, 1.2, midi('A2'), 100)
    P.nota('bat', b, 1.0, 'crash', 100)
    P.nota('bat', b, 0.25, 'bombo', 104)
    P.nota('bat', 0.0, 0.25, 'tom3', 90)
    for m, dt, v in (('A7', 0.0, 96), ('E7', 0.07, 84), ('C#8', 0.14, 70)):
        P.nota('campana', b + dt, 0.5, midi(m), v)
    for k, m in enumerate(('A5', 'C#6', 'E6', 'A6', 'C#7')):
        P.nota('arpa', b + 0.08 + k * 0.1, 0.4, midi(m), 62 + 3 * k)
    return P


# =================================================================================================================
# Rendering and output
# =================================================================================================================

def _normalizar(x, g, objetivo, salida, kbps, ar=24000):
    """Gain `g` and the soft knee, loudness iterated to `objetivo` LUFS (measured on the 16-bit file); writes the MP3.
    -> (samples after the knee, measured LUFS)."""
    with tempfile.TemporaryDirectory() as d:
        ruta = f'{d}/p.wav'
        for _ in range(6):
            y = suave(x, g)
            escribir_wav(ruta, y)
            medido = lufs(ruta)
            if abs(medido - objetivo) < 0.08:
                break
            g *= db(objetivo - medido)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ruta, '-ar', str(ar), '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
    return y, medido


def exportar_bucle(P, I, bpm, barras, barras_intro, auto, auto_intro, salida, objetivo=OBJETIVO, kbps=80, cola_intro=4.0, margen=0.5):
    """The loop (`barras` bars on a ring) and the intro (`barras_intro` bars, a ring with room for its tails), joined:
    the intro's last ~90 ms fade into the end of the loop's ring, so what plays after it is the loop's start with no
    break; the loop is the stretch from `inicio` to `fin`, and the half second after `fin` is the loop's own start."""
    n = muestras_barras(bpm, barras)
    n_i = muestras_barras(bpm, barras_intro)
    x = mezclar(P, n, auto)
    assert x.shape[1] == n
    xi = mezclar(I, n_i + int(cola_intro * SR), auto_intro, final=auto[0], fijar=False)
    x = x - x.mean(axis=1, keepdims=True)
    xi = xi - xi.mean(axis=1, keepdims=True)
    X = int(0.09 * SR)
    w = 0.5 - 0.5 * np.cos(np.pi * np.arange(X) / X)
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    m = int(round(margen * SR))
    with tempfile.TemporaryDirectory() as d:
        for _ in range(5):
            y, yi = suave(x, g), suave(xi, g)
            intro = yi[:, :n_i].copy()
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
    inicio, fin = n_i / SR, (n_i + n) / SR
    print(f'{salida}: {len(trozo[0]) / SR:.2f} s, {medido:.1f} LUFS, peak {np.max(np.abs(trozo)):.3f}, '
          f'loop {inicio:.6f}-{fin:.6f} s, ring join step {np.max(paso[:, -1]):.4f} '
          f'(median {np.median(paso):.4f}, p99.9 {np.percentile(paso, 99.9):.4f}), {os.path.getsize(salida) / 1e3:.0f} kB')
    return inicio, fin


def exportar_camino(salida):
    with tema(BPM_CAMINO, ACORDES_CAMINO):
        P = componer_camino()
        I = intro_camino(P)
        inicio, fin = exportar_bucle(P, I, BPM_CAMINO, BARRAS_CAMINO, 4, AUTO_CAMINO, AUTO_INTRO_CAMINO, salida)
    print(f"  musica.ts: {{ url: solCamino, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")


def exportar_combate(salida):
    with tema(BPM_COMBATE, ACORDES_COMBATE):
        P = componer_combate()
        I = intro_combate(P)
        inicio, fin = exportar_bucle(P, I, BPM_COMBATE, BARRAS_COMBATE, 2, AUTO_COMBATE, AUTO_INTRO_COMBATE, salida)
    print(f"  musica.ts: {{ url: solCombate, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")


def exportar_una_vez(componer, acordes, bpm, duracion, salida, objetivo=OBJETIVO, kbps=80, cola=3.0, rt=0.9, fundido=0.35):
    """A piece heard once: the score on a ring with `cola` s of silence for the tails, cut to `duracion` s with a
    fade-out at the end."""
    with tema(bpm, acordes):
        P = componer()
        n = int((duracion + cola) * SR)
        x = mezclar(P, n, [0.0] * len(acordes), final=0.0, rt_sala=rt, informe=False)
    nm = int(round(duracion * SR))
    x = x[:, :nm]
    x = x - x.mean(axis=1, keepdims=True)
    k = int(fundido * SR)
    x[:, -k:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k)))
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    y, medido = _normalizar(x, g, objetivo, salida, kbps)
    print(f'{salida}: {nm / SR:.2f} s, {medido:.1f} LUFS, peak {np.max(np.abs(y)):.3f}, {os.path.getsize(salida) / 1e3:.0f} kB')
    print(f"  musica.ts: {{ url: {os.path.basename(salida)}, inicio: 0, fin: {nm / SR:.2f} }}")


def fanfarrias(carpeta):
    os.makedirs(carpeta, exist_ok=True)
    exportar_una_vez(componer_victoria, ACORDES_VICTORIA, BPM_FANFARRIA, 5.3, os.path.join(carpeta, 'sol-victoria.mp3'), fundido=0.5)
    exportar_una_vez(componer_nivel, [['A']], BPM_FANFARRIA, 2.2, os.path.join(carpeta, 'sol-nivel.mp3'), rt=0.7, fundido=0.4)


# --- The effects -------------------------------------------------------------------------------------------------------------

def _limitar(x, k):
    """A soft limiter for an effect with a loud transient: peak 1 in, peak 1 out, the rest lifted by tanh(k x)."""
    x = x / np.max(np.abs(x))
    return np.tanh(k * x) / np.tanh(k)


def _cierre(x, n=96):
    x[-n:] *= np.linspace(1, 0, n)
    return x


def _sumar(out, i0, w, a=1.0):
    k = max(0, min(len(w), len(out) - i0))
    out[i0:i0 + k] += a * w[:k]


def efecto_encuentro(salida):
    """The swirl into a fight: a tone spiralling up with a quickening wobble over four bands of noise that circle
    in turn, and a heavy hit where it stops (1 s)."""
    nm = int(1.0 * SR)
    t = tiempo(nm)
    corte = 0.80
    ue = np.clip(t / corte, 0, 1)
    puerta = np.where(t < corte, 1.0, np.exp(-(t - corte) / 0.015))
    rng = np.random.default_rng(31)
    f = 190 * 7.5 ** (ue ** 1.2) * (1 + 0.2 * np.sin(2 * np.pi * np.cumsum(5 + 22 * ue ** 1.5) / SR))
    tono = sierra(f, 0.0) + 0.8 * pulso(f * 1.004, 0.3)
    tono = eq(tono, ('hp', 150, 2), ('lp', 5200, 2), circ=False) * (0.2 + 0.8 * ue ** 0.8) * puerta * 0.5
    ruido = rng.standard_normal(nm)
    remolino = np.zeros(nm)
    for k, fc in enumerate((350, 800, 1700, 3400)):
        banda = eq(ruido, ('hp', fc / 1.5, 2), ('lp', fc * 1.5, 2), circ=False)
        remolino += banda * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(2.0 + 11 * ue) / SR + k * np.pi / 2))
    remolino *= ue ** 1.4 * puerta * 0.7
    out = tono + remolino
    n3 = int(0.16 * SR)
    tt = tiempo(n3)
    golpe = np.sin(2 * np.pi * np.cumsum(50 + 110 * np.exp(-tt / 0.03)) / SR) * np.exp(-tt / 0.07)
    crash = ruido_ba(rng, n3, 1500, 9000) * np.exp(-tt / 0.045)
    _sumar(out, int(corte * SR), 1.3 * golpe + 0.6 * crash)
    out = lineal(out, rt=0.35, mezcla=0.15)[:nm]
    out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
    a_mp3(_cierre(_limitar(out, 1.3)), salida, 0.8)


def efecto_golpe(salida):
    """A physical hit: a thud that drops in pitch, a whip of noise and a click on top (0.25 s)."""
    nm = int(0.25 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(37)
    cuerpo = np.sin(2 * np.pi * np.cumsum(60 + 130 * np.exp(-t / 0.022)) / SR) * np.exp(-t / 0.07)
    latigo = ruido_ba(rng, nm, 400, 6500) * np.exp(-t / 0.028) * np.minimum(1, t / 0.0008)
    clic = 0.5 * np.sin(2 * np.pi * 2400 * t) * np.exp(-t / 0.004)
    w = np.tanh(1.6 * (1.1 * cuerpo + 0.9 * latigo + clic))
    w = eq(w, ('lp', 7500, 2), circ=False)
    w = lineal(w, rt=0.15, mezcla=0.1)[:nm]
    a_mp3(_cierre(w, 64), salida, 0.55)


def efecto_cura(salida):
    """Healing: bells climbing a D major pentatonic over a soft rising glow, then a chime chord (0.8 s)."""
    nm = int(0.8 * SR)
    t = tiempo(nm)
    out = np.zeros(nm)
    u = np.clip(t / 0.5, 0, 1)
    f = 500 * 4.0 ** u
    brillo = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.65 + 0.35 * np.sin(2 * np.pi * 9 * t)) * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 1.5
    out += 0.16 * brillo
    for k in range(9):
        nota = 74 + 12 * (k // 5) + (0, 2, 4, 7, 9)[k % 5]
        _sumar(out, int(k * 0.052 * SR), sintetizar('campana', nota, 0.1, 72 + 3 * k, razon=3.0, indice=0.9, tau=0.2), 0.5)
    for nota, dt, a in (('D6', 0.0, 0.55), ('A6', 0.02, 0.4), ('F#7', 0.04, 0.3)):
        _sumar(out, int((0.46 + dt) * SR), sintetizar('campana', midi(nota), 0.1, 100, razon=3.0, indice=0.8, tau=0.3), a)
    out = lineal(out, rt=0.45, mezcla=0.2)[:nm]
    out[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR)) ** 1.5
    a_mp3(_cierre(out), salida, 0.7)


def efecto_apuntador(salida):
    """A prompter let go: a puff of breath, then twinkles tumbling down an E major pentatonic with a few random
    sparks and a last bell pair (0.8 s)."""
    nm = int(0.8 * SR)
    out = np.zeros(nm)
    rng = np.random.default_rng(41)
    n1 = int(0.2 * SR)
    t1 = tiempo(n1)
    sopla = np.sin(np.pi * t1 / 0.2) ** 2
    _sumar(out, 0, (ruido_ba(rng, n1, 900, 5200) * 0.4 + 0.14 * np.sin(2 * np.pi * np.cumsum(620 - 300 * t1 / 0.2) / SR)) * sopla)
    for dt, nota, a in ((0.13, 'E7', 0.45), (0.19, 'C#7', 0.4), (0.26, 'B6', 0.4), (0.33, 'G#6', 0.38), (0.4, 'F#6', 0.36)):
        _sumar(out, int(dt * SR), sintetizar('campana', midi(nota), 0.1, 96, razon=3.5, indice=1.4, tau=0.16), a)
    for k in range(7):                                                  # sparks: high, quick, random
        nota = int(rng.choice((92, 94, 96, 99, 101, 104)))
        _sumar(out, int(rng.uniform(0.15, 0.55) * SR), sintetizar('campana', nota, 0.1, 60 + int(rng.integers(0, 30)), razon=2.0, indice=1.0, tau=0.1), 0.3)
    for nota, dt, a in (('E6', 0.0, 0.5), ('B6', 0.045, 0.4)):
        _sumar(out, int((0.46 + dt) * SR), sintetizar('campana', midi(nota), 0.1, 100, razon=3.5, indice=1.2, tau=0.3), a)
    out = lineal(out, rt=0.5, mezcla=0.25)[:nm]
    out[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR)) ** 1.5
    a_mp3(_cierre(out), salida, 0.65)


def efecto_cae(salida):
    """A defeated enemy falling apart: a pop, a buzz sliding down while its pulse width wobbles, and a crackle of
    little clicks that thins out (0.6 s)."""
    nm = int(0.6 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(43)
    pop = ruido_ba(rng, nm, 300, 4000) * np.exp(-t / 0.02) * 0.9
    caida = np.sin(2 * np.pi * np.cumsum(500 * np.exp(-t / 0.06) + 90) / SR) * np.exp(-t / 0.12)
    f = 1100 * np.exp(-t / 0.25) + 120
    zumbido = eq(pulso(f, 0.5 + 0.35 * np.sin(2 * np.pi * 17 * t)), ('lp', 3500, 2), circ=False) * np.exp(-t / 0.2) * np.minimum(1, t / 0.005)
    tasa = 520 * np.exp(-t / 0.2)
    clics = (rng.random(nm) < tasa / SR) * rng.uniform(0.3, 1.0, nm)
    k = np.arange(130)
    crepita = np.convolve(clics, np.exp(-k / 35) * np.sin(2 * np.pi * 3500 * k / SR))[:nm]
    soplo = ruido_ba(rng, nm, 150, 2400) * np.exp(-t / 0.15) * 0.3
    out = 0.9 * pop + 0.9 * caida + 0.4 * zumbido + 1.1 * crepita + soplo
    out = lineal(out, rt=0.25, mezcla=0.12)[:nm]
    out[-int(0.15 * SR):] *= np.linspace(1, 0, int(0.15 * SR))
    a_mp3(_cierre(_limitar(out, 1.3)), salida, 0.7)


def efecto_huir(salida):
    """Running away: seven quick steps on gravel, each softer and duller than the one before, over a thin whoosh
    of dust (0.6 s)."""
    nm = int(0.6 * SR)
    out = np.zeros(nm)
    rng = np.random.default_rng(47)
    for k, t0 in enumerate((0.0, 0.075, 0.155, 0.24, 0.33, 0.43, 0.53)):
        n = int(0.07 * SR)
        t = tiempo(n)
        f0 = 130 if k % 2 == 0 else 105
        pisada = np.sin(2 * np.pi * np.cumsum(f0 + 90 * np.exp(-t / 0.015)) / SR) * np.exp(-t / 0.03)
        grava = ruido_ba(rng, n, 500, 4500) * np.exp(-t / 0.014)
        w = eq(pisada + 0.9 * grava, ('lp', 4200 * 0.78 ** k, 2), circ=False) * 0.76 ** k
        _sumar(out, int(t0 * SR), w)
    t = tiempo(nm)
    polvo = ruido_ba(rng, nm, 150, 2500) * np.sin(np.pi * np.clip(t / 0.5, 0, 1)) * 0.1 * np.exp(-t / 0.3)
    out = lineal(out + polvo, rt=0.25, mezcla=0.1)[:nm]
    out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR))
    a_mp3(_cierre(_limitar(out, 1.3)), salida, 0.65)


EFECTOS = (('sol-encuentro', efecto_encuentro), ('sol-golpe', efecto_golpe), ('sol-cura', efecto_cura),
           ('sol-apuntador', efecto_apuntador), ('sol-cae', efecto_cae), ('sol-huir', efecto_huir))


def efectos(carpeta):
    os.makedirs(carpeta, exist_ok=True)
    for nombre, f in EFECTOS:
        f(os.path.join(carpeta, nombre + '.mp3'))


# --- Checks ---------------------------------------------------------------------------------------------------------------------

def revisar():
    """Every melody note that starts on a beat, lasts a beat or more and is not a tone of its chord (a few are
    meant: passing tones, a dominant's third)."""
    jobs = ((ACORDES_CAMINO, BPM_CAMINO, (('A', MEL_CA, 0), ("A'", MEL_CA2, 8), ('B', MEL_CB, 16), ('C', MEL_CC, 24))),
            (ACORDES_COMBATE, BPM_COMBATE, (('A', MEL_CO_A, 0), ('B', MEL_CO_B, 8), ('C', MEL_CO_C, 16), ("A'", MEL_CO_A, 24))),
            (ACORDES_VICTORIA, BPM_FANFARRIA, (('victoria', melodia('B4:2 E5:2 G#5:2 B5:2 E6:8 | A5:3 C#6:3 E6:2 D#6:4 F#6:4 | B6:2 G#6:2 E7:12'), 0),)))
    for acordes, bpm, partes in jobs:
        with tema(bpm, acordes):
            for nombre, mel, c0 in partes:
                for b, d, m, _ in mel:
                    ch = S.ch_en(c0 * L + b)
                    if b % 1 == 0 and d >= 1 and m % 12 not in acorde_pcs(ch):
                        print(f'  bpm {bpm} {nombre}: bar {c0 + int(b // L) + 1} beat {b % L + 1:.0f}: {m} over {ch}')
    print('listed')


def analisis(carpeta):
    """The decoded MP3: the loops' seam, levels per second, bands, and the lengths and levels of everything else."""
    ar = 24000
    pueblo = os.path.join(carpeta, 'sol-pueblo.mp3')
    ref = None
    if os.path.exists(pueblo):
        xp = decodificar(pueblo, ar)
        i0, i1 = int(round(S.N_INTRO / SR * ar)), int(round((S.N_INTRO + S.N) / SR * ar))
        ref = 20 * np.log10(np.sqrt(np.mean(xp[:, i0:i1] ** 2)))
        print(f'sol-pueblo.mp3 (reference): loop rms {ref:.1f} dBFS, {medir(pueblo):.1f} LUFS')
    for nombre, bpm, barras, intro in (('sol-camino', BPM_CAMINO, BARRAS_CAMINO, 4), ('sol-combate', BPM_COMBATE, BARRAS_COMBATE, 2)):
        ruta = os.path.join(carpeta, nombre + '.mp3')
        x = decodificar(ruta, ar)
        inicio, fin = muestras_barras(bpm, intro) / SR, muestras_barras(bpm, intro + barras) / SR
        i0, i1 = int(round(inicio * ar)), int(round(fin * ar))
        print(f'{nombre}.mp3: {x.shape[1] / ar:.2f} s decoded, peak {np.max(np.abs(x)):.3f}, loop {inicio:.4f}-{fin:.4f} ({fin - inicio:.2f} s), {medir(ruta):.1f} LUFS')
        paso = np.median(np.abs(np.diff(x[:, i0:i0 + ar * 20], axis=1)))
        salto = np.max(np.abs(x[:, i1 - 1] - x[:, i0]))
        print(f'  jump back from fin to inicio: {salto:.4f} (median step {paso:.4f}; 99.9th percentile '
              f'{np.percentile(np.abs(np.diff(x[:, i0:i1], axis=1)), 99.9):.4f}; the steps of the whole loop never exceed {np.max(np.abs(np.diff(x[:, i0:i1], axis=1))):.4f})')
        k = int(S.MARGEN * ar)
        a, b = x[:, i1:i1 + k], x[:, i0:i0 + k]
        n = min(a.shape[1], b.shape[1])
        dif = 20 * np.log10(np.sqrt(np.mean((a[:, :n] - b[:, :n]) ** 2)) / np.sqrt(np.mean(b[:, :n] ** 2)))
        print(f'  the {S.MARGEN} s after fin against the {S.MARGEN} s after inicio: {dif:.1f} dB below the signal (mp3 noise only)')
        ii = x[:, :i0]
        ti = int(round(inicio * ar))
        print(f'  the join intro -> loop: step {np.max(np.abs(x[:, ti] - x[:, ti - 1])):.4f}, rms of the last 0.5 s of the intro {20 * np.log10(np.sqrt(np.mean(ii[:, -ar // 2:] ** 2))):.1f} dBFS')
        mono = x.mean(axis=0)
        v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + ar] ** 2)) + 1e-9) for i in range(0, len(mono) - ar, ar)]
        print('  dB per second:', ' '.join(f'{d:.0f}' for d in v))
        rms = 20 * np.log10(np.sqrt(np.mean(x[:, i0:i1] ** 2)))
        print(f'  loop: rms {rms:.1f} dBFS' + (f' ({rms - ref:+.1f} dB against solPueblo)' if ref is not None else '')
              + f'; loudest second {max(v):.0f}, quietest in the loop {min(v[int(inicio):int(fin)]):.0f}')
        sp = np.abs(np.fft.rfft(mono[i0:i1])) ** 2
        fr = np.fft.rfftfreq(i1 - i0, 1 / ar)
        tot = sp.sum()
        bandas = [(30, 150), (150, 500), (500, 2000), (2000, 5000), (5000, 12000)]
        print('  energy by band (Hz): ' + ', '.join(f'{lo}-{hi}: {10 * np.log10(sp[(fr >= lo) & (fr < hi)].sum() / tot):.1f} dB' for lo, hi in bandas))
    for nombre, esperado in (('sol-victoria', 5.3), ('sol-nivel', 2.2)):
        ruta = os.path.join(carpeta, nombre + '.mp3')
        x = decodificar(ruta, ar)
        mono = x.mean(axis=0)
        v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + ar // 4] ** 2)) + 1e-9) for i in range(0, len(mono) - ar // 4, ar // 4)]
        print(f'{nombre}.mp3: {x.shape[1] / ar:.2f} s (made for {esperado}), peak {np.max(np.abs(x)):.3f}, {medir(ruta):.1f} LUFS, '
              f'last 50 ms {20 * np.log10(np.sqrt(np.mean(mono[-ar // 20:] ** 2)) + 1e-9):.0f} dBFS')
        print('  dB per quarter second:', ' '.join(f'{d:.0f}' for d in v))
    for nombre, f in EFECTOS:
        e = decodificar(os.path.join(carpeta, nombre + '.mp3'), ar).mean(axis=0)
        n10 = max(1, ar // 100)
        v = [20 * np.log10(np.sqrt(np.mean(e[i:i + n10] ** 2)) + 1e-9) for i in range(0, len(e) - n10, n10 * 5)]
        print(f'{nombre}.mp3: {len(e) / ar * 1000:.0f} ms, peak {np.max(np.abs(e)):.2f}, rms {20 * np.log10(np.sqrt(np.mean(e ** 2))):.1f} dBFS, '
              f'last 20 ms {20 * np.log10(np.sqrt(np.mean(e[-ar // 50:] ** 2)) + 1e-9):.0f} dBFS')
        print('    dB per 10 ms every 50 ms:', ' '.join(f'{d:.0f}' for d in v))


if __name__ == '__main__':
    modos = ('camino', 'combate', 'fanfarrias', 'efectos', 'analisis', 'revisar')
    modo = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in modos else 'todo'
    resto = sys.argv[2:] if modo != 'todo' else sys.argv[1:]
    carpeta = resto[0] if resto else '../../src/sonido'
    if modo == 'revisar':
        revisar()
    elif modo in ('camino', 'combate') and carpeta.endswith('.mp3'):
        (exportar_camino if modo == 'camino' else exportar_combate)(carpeta)
    else:
        os.makedirs(carpeta, exist_ok=True)
        if modo in ('todo', 'camino'):
            exportar_camino(os.path.join(carpeta, 'sol-camino.mp3'))
        if modo in ('todo', 'combate'):
            exportar_combate(os.path.join(carpeta, 'sol-combate.mp3'))
        if modo in ('todo', 'fanfarrias'):
            fanfarrias(carpeta)
        if modo in ('todo', 'efectos'):
            efectos(carpeta)
        if modo == 'analisis':
            analisis(carpeta)
