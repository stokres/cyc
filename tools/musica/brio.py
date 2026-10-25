# «Bar del Brío», from the inside: the song of the rock bar, rebuilt by pure synthesis (numpy only:
# no SoundFont, no fluidsynth, no scipy) in three versions that share one arrangement: the bar
# heard inside, the same heard from the street through the door, and its dream.
# The notes, chords and tempo are those of the first version of the song (bar_rockero.py's 40-bar
# round): E minor, 140 bpm, straight eighths, a riff of palm-muted chugs answered by power chords,
# two rhythm guitars hard left and right, bass doubling the riff, a rock organ, a big kit; twin
# lead guitars in harmony for the chorus and a bending solo. On top of them the song is now a full
# three-minute arrangement (100 bars, 171.43 s), with a structure of its own:
#
#    bars  section
#    1-8   intro: left guitar, bass and hats; then the right guitar and the kit; then the organ
#    9-16  verse 1: the riff on E, on A, on E; the organ under it
#    17-20 pre-chorus 1: A minor, B; the snare doubles its speed every bar; the lead hangs on D sharp
#    21-28 chorus 1: the twin leads over C, D, E minor, B (the old chorus)
#    29-32 the bare riff, the right guitar an octave up
#    33-40 verse 2: a new take on the riff (it climbs), organ stabs, a long singing lead line, ride
#    41-44 pre-chorus 2: a second voice under the lead
#    45-52 chorus 2
#    53-60 solo 1 (the old solo)
#    61-68 bridge in G major (the relative major): clean guitars with an echo, half-time drums, the
#          organ sings a new tune; then distorted chords grow under it, a snare roll, and a drum break
#    69-76 solo 2: its own tune and changes (E minor, C, D, E minor, A minor, C, B, B)
#    77-84 chorus 3: the old chorus, louder
#    85-92 chorus 4 a whole tone up (F sharp minor), the organ doubling the tune an octave down
#    93-100 coda: the riff with everybody, then the left guitar alone, then a few chugs and a snare
#          roll growing out of nothing, which is where the intro starts
#
# Guitars are sawtooth strings into a two-stage tube-style clipper (at twice the sample rate) and
# a cabinet curve; the bass is a plucked saw with a sub; the organ is drawbars through a Leslie; the
# kit is synthesised hit by hit (sine-sweep kick, tone-and-wires snare, metallic hats, ride, crash,
# toms). The bridge adds clean, plucked guitars (no amp) and a lead organ.
#
# Everything is computed on a ring: a note that rings past the end of the round wraps round to
# its start, every filter, compressor and reverb is circular (FFT), every LFO makes a whole
# number of turns per round. So one round, played over and over, joins with no click and no
# fade, and the file is that round with half a second of its own neighbours on either side.
#
#   python3 brio.py brio [salida]    the bar's rock heard inside: clean, present, a background
#                                    -> brio.mp3 (the game's src/sonido/brio.mp3), 171.43 s loop
#   python3 brio.py puerta [salida]  the same song heard from the street, through the door: no highs,
#                                    nearly mono, a small hall outside (it used to be bar_rockero.py's
#                                    SoundFont render, which has no longer the structure of the song)
#                                    -> bar-puerta.mp3 (src/sonido/bar-puerta.mp3), same 171.43 s loop
#   python3 brio.py sueno [salida]   the same song when the bar turns into a dream (nights 2 and 3):
#                                    slower, out of tune and wobbling like a worn tape, a long echo,
#                                    a phaser, a dreamy hall with a shimmer
#                                    -> brio-sueno.mp3 (src/sonido/brio-sueno.mp3), same 171.43 s loop
#
# The dream plays the song at 0.8 speed (tape: tempo and pitch together, about a major third
# lower, drifting by almost a semitone either way). To keep the same loop length it plays 80 bars
# of the 100 (it drops the intro, the bare riff and the second verse): 80 bars / 0.8 = 100 bars.
# The three files last the same, 171.43 s, so a crossfade between any two of them is the same length.
import os
import random
import re
import subprocess
import sys
import tempfile
import wave
import numpy as np

SR = 44100
BPM = 140
BEAT = 60.0 / BPM
L = 4                                     # beats in a bar
BARS = 100
BARS_SUENO = 80                             # the bars of the song the dream plays (at 0.8 speed they last BARS)
N = int(round(BARS * L * BEAT * SR))      # one round, in samples: 7 560 000 (exactly)
VELOCIDAD_SUENO = 0.8                     # the dream's tape speed
RNG = np.random.default_rng(21)
ALEA = random.Random(21)

# --- Notes ----------------------------------------------------------------------------------

LETRAS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(x):
    """'F#4' -> 66 (C4 = 60). Numbers pass through."""
    if not isinstance(x, str):
        return x
    alt, resto = 0, x[1:]
    while resto and resto[0] in '#b':
        alt += 1 if resto[0] == '#' else -1
        resto = resto[1:]
    return 12 * (int(resto) + 1) + LETRAS[x[0]] + alt


def hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69) / 12)


def db(x):
    return 10 ** (x / 20)


def frase(texto, largo=16):
    """Bars of sixteenths separated by '|': 'E5:6 D5:2 ...'. '-' is a rest. -> [(beat, beats, midi)]."""
    notas, pos = [], 0
    for i, compas in enumerate(texto.split('|')):
        suma = 0
        for tok in compas.split():
            nombre, d = tok.split(':')
            d = int(d)
            if nombre != '-':
                notas.append((pos / 4, d / 4, midi(nombre)))
            pos += d
            suma += d
        if compas.strip() and suma != largo:
            raise ValueError(f'bar {i + 1} adds up to {suma} sixteenths: {compas}')
    return notas


INTERVALOS = {'': (0, 4, 7), 'm': (0, 3, 7)}


def pcs(nombre):
    raiz = midi(nombre[0] + '4') % 12
    return {(raiz + i) % 12 for i in INTERVALOS[nombre[1:]]}


def tonos(nombre, lo, hi):
    s = pcs(nombre)
    return [x for x in range(midi(lo), midi(hi) + 1) if x % 12 in s]


def acorde_en(acordes, beat, largo=4):
    cs = acordes[int(beat // largo)]
    return cs[min(int((beat % largo) // (largo / len(cs))), len(cs) - 1)]


MENOR = {(4 + p) % 12 for p in (0, 2, 3, 5, 7, 8, 10)}


def tercera_abajo(m, escala):
    abajo = [x for x in range(m - 6, m) if x % 12 in escala]
    return abajo[-2] if len(abajo) >= 2 else m - 3


# --- The score: the song of bar_rockero.py, grown into a full three-minute arrangement ----------
# The notes of the old 40-bar round (the riff, the chorus with its twin leads, the solo, the
# organ) are all here, note for note; around them there is now an intro that builds up, a second
# verse with a new take on the riff, two pre-choruses, a bridge in the relative major, a second
# solo, a drum break, a last chorus a whole tone higher and a coda that thins out into the intro.

RAIZ = {'E': 'E2', 'G': 'G2', 'A': 'A2', 'B': 'B2', 'D': 'D3', 'C': 'C3', 'F#': 'F#2'}
# Riffs in sixteenths: (start, length, root, palm-muted?)
RIFF_E = [[(0, 2, 'E', 1), (2, 2, 'E', 1), (4, 2, 'E', 1), (6, 3, 'G', 0), (9, 3, 'A', 0), (12, 2, 'E', 1), (14, 2, 'E', 1)],
          [(0, 2, 'E', 1), (2, 2, 'E', 1), (4, 2, 'E', 1), (6, 3, 'B', 0), (9, 3, 'A', 0), (12, 2, 'G', 0), (14, 2, 'F#', 0)]]
RIFF_A = [[(0, 2, 'A', 1), (2, 2, 'A', 1), (4, 2, 'A', 1), (6, 3, 'C', 0), (9, 3, 'D', 0), (12, 2, 'A', 1), (14, 2, 'A', 1)],
          [(0, 2, 'A', 1), (2, 2, 'A', 1), (4, 2, 'A', 1), (6, 3, 'E', 0), (9, 3, 'D', 0), (12, 2, 'C', 0), (14, 2, 'B', 0)]]
# The second verse's bar: the same riff, but it climbs (G, A, B, A) where the old one stayed low.
RIFF_V = [(0, 2, 'E', 1), (2, 2, 'E', 1), (4, 2, 'E', 1), (6, 3, 'G', 0), (9, 3, 'A', 0), (12, 2, 'B', 0), (14, 2, 'A', 0)]
ACORDES_E = [['C'], ['D'], ['Em'], ['Em'], ['C'], ['D'], ['B'], ['B']]
LEAD_E = frase('E5:6 D5:2 C5:4 G4:4 | F#5:6 E5:2 D5:4 A4:4 | G5:6 F#5:2 E5:4 B4:4 | E5:12 -:4 |'
               'E5:6 D5:2 C5:4 E5:4 | F#5:6 E5:2 D5:4 F#5:4 | D#5:6 F#5:2 B5:8 | A5:4 F#5:4 D#5:4 B4:4')
ACORDES_S = [['Em'], ['Em'], ['C'], ['D'], ['Em'], ['Em'], ['C'], ['B']]
# The solo: NOTE^n bends up n semitones into the note, a trailing 'v' adds vibrato.
SOLO = ('B4^2:6 A4:2 G4:2 E4:2 G4:2 A4:2 | B4:4 D5^2:4 E5:8v | G5:2 E5:2 D5:2 E5:2 G5:4 E5:4 | F#5^1:6 E5:2 D5:4 A4:4 |'
        'E5:2 G5:2 A5:2 B5:2 D6:4 B5:2 A5:2 | B5^2:12v G5:2 E5:2 | E5:2 G5:2 C6:4 B5:2 G5:2 E5:4 | D#5:4 F#5:4 B5:8v')
# The second solo: higher and faster, over E minor, C, D, E minor, A minor, C and B twice; its last bar
# runs down the scale from B to E over the dominant, into the final chorus.
ACORDES_S2 = [['Em'], ['C'], ['D'], ['Em'], ['Am'], ['C'], ['B'], ['B']]
SOLO2 = ('E5:3 G5:3 B5:2 A5:2 G5:2 E5:4v | G5^2:6 E5:2 C5:4 E5:4 | F#5:4 A5:4 D6:4 A5:4 | B5^1:6 A5:2 G5:4 E5:4v |'
         'A5:4 C6:4 E6:4 C6:4 | G5:2 C6:2 E6:4 D6:2 C6:2 G5:4 | F#5^2:6 D#5:2 B4:4 D#5:4 | B5:2 A5:2 G5:2 F#5:2 E5:2 D#5:2 E5:4')
# The second verse: a long, singing line on the lead guitar over the new riff.
LINEA_V2 = frase('B4:16 | B4:8 G4:4 A4:4 | B4:12 E5:4 | E5:16 | C5:8 A4:4 C5:4 | E5:16 | D5:8 B4:4 G4:4 | B4:6 A4:2 E5:8')
# The pre-chorus: the lead hangs on the leading note of the dominant, then slips to the chorus' first note.
PRE_LEAD = frase('D#5:16 | D#5:8 F#5:4 E5:4')
PRE_LEAD2 = frase('B4:16 | B4:12 B4:4')
# The bridge, in G major (the relative major): the organ sings it over clean, echoing guitars.
ACORDES_P = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'B']
MELODIA_P = frase('B4:6 D5:2 G5:8 | F#5:6 E5:2 D5:8 | E5:4 G5:4 B5:4 G5:4 | E5:6 D5:2 C5:8 |'
                  'D5:4 G5:4 B5:8 | A5:6 F#5:2 D5:4 F#5:4 | E5:6 G5:2 C6:8')
NIVEL_ANILLO = -3.0            # dB of the whole band where the round ends and begins (the coda's last bar, the intro's first)
SALTO_ESTRIBILLO = 28           # beat of the chorus' last bar: the final chorus comes back home there


class Partitura:
    """The notes of one round as events (track, beat, beats, midi, velocity, options), with the
    small human wobble of timing the MIDI version had (gaussian, in beats); the sections of the
    song with their first and last bar; and the level of the whole band along the round (dB)."""

    def __init__(self):
        self.ev = {}
        self.secciones = []
        self.dina = []

    def nota(self, pista, beat, dur, tono, vel, humano=0.005, legato=0.95, **opc):
        b = beat + ALEA.gauss(0, humano)
        self.ev.setdefault(pista, []).append(dict(b=b, d=dur * legato, m=midi(tono), v=vel, **opc))

    def acorde(self, pista, beat, dur, tonos_, vel, rasgueo=0.0, legato=0.95, humano=0.005, **opc):
        for i, m in enumerate(tonos_):
            self.nota(pista, beat + i * rasgueo, dur, m, vel, humano=humano, legato=legato, **opc)

    def nivel(self, t0, t1, a, b=None):
        """The whole band at `a` dB at beat t0, sliding to `b` at t1 (levels are relative)."""
        self.dina += [(t0, a), (t1 - 1e-3, a if b is None else b)]

    def seccion(self, nombre, t0, t1):
        self.secciones.append((nombre, t0 / L, t1 / L))


def power(P, pista, beat, dur, raiz, vel, legato=0.95, trans=0, oct=0):
    """A power chord (root, fifth, octave) struck as one gesture: the strings are summed later."""
    r = midi(RAIZ[raiz]) + trans + oct
    P.nota(pista, beat, dur, r, vel, humano=0.006, legato=legato, acorde=(r, r + 7, r + 12))


def mute(P, pista, beat, dur, raiz, vel, trans=0):
    r = midi(RAIZ[raiz]) + trans
    P.nota(pista, beat, dur, r, vel, humano=0.006, legato=0.5, acorde=(r, r + 7), apagado=True)


def riff(P, t0, compases, vel=104, lados='ID', bajo=True, oct_D=0, bajo_octavas=False):
    """The riff on the guitars of the given sides (I, D); the bass doubles it. oct_D: the right
    guitar's open chords an octave up; bajo_octavas: the bass jumps an octave on two of the chugs."""
    for c, compas in enumerate(compases):
        for (p, d, raiz, apagado) in compas:
            b = t0 + c * L + p / 4
            for lado in lados:
                if apagado:
                    mute(P, 'm' + lado, b, d / 4, raiz, vel - 6)
                else:
                    power(P, 'g' + lado, b, d / 4, raiz, vel + 4, oct=oct_D if lado == 'D' else 0)
            if bajo:
                r = midi(RAIZ[raiz]) - 12 + (12 if bajo_octavas and apagado and p in (2, 14) else 0)
                P.nota('bajo', b, d / 4, r, vel, humano=0.005, legato=0.6 if apagado else 0.9)


def acordes_largos(P, t0, acordes, vel=108, trans=0):
    """The chorus: power chords ringing, pushed on the 'and' of two; bass in eighths."""
    for i, (ch, *_) in enumerate(acordes):
        raiz = ch.rstrip('m')
        for pista in ('gI', 'gD'):
            power(P, pista, t0 + i * L, 1.5, raiz, vel, trans=trans)
            power(P, pista, t0 + i * L + 1.5, 2.5, raiz, vel - 6, trans=trans)
        for k in range(8):
            P.nota('bajo', t0 + i * L + k * 0.5, 0.5, midi(RAIZ[raiz]) - 12 + trans, vel - (8 if k % 2 else 0), humano=0.005, legato=0.8)


def organo(P, t0, acordes, vel=74, trans=0, sincopado=False):
    """Chords on the organ: held for the bar, or (sincopado) struck on beat one and on the 'and' of two."""
    for i, (ch, *_) in enumerate(acordes):
        notas = tonos(ch, 'G3', 'G4')[:3]
        notas = [x + trans for x in notas + [notas[0] + 12]]
        if sincopado:
            for b in (0, 1.5):
                P.acorde('org', t0 + i * L + b, 0.5, notas, vel, humano=0.004, legato=0.7)
        else:
            P.acorde('org', t0 + i * L, L, notas, vel, humano=0.004, legato=1.0)


def armonia(P, t0, notas, acordes, vel, trans=0):
    """The second lead a third below: a chord tone on held notes, a scale third on quick ones
    (worked out in E minor, then moved up `trans`)."""
    for b, d, m in notas:
        ch = acorde_en(acordes, b)
        m0 = m - trans
        if d >= 0.75:
            h = max(tonos(ch, m0 - 9, m0 - 3))
        else:
            h = tercera_abajo(m0, (MENOR - {2}) | {3} if ch == 'B' else MENOR)
        P.nota('sol2', t0 + b, d, h + trans, vel, humano=0.0, legato=0.95, vib=22 if d >= 2 else 0)


def lead(P, t0, notas, vel, trans=0):
    for b, d, m in notas:
        P.nota('sol1', t0 + b, d, m + trans, vel + (6 if b % 1 == 0 else 0), humano=0.0, legato=0.95, vib=26 if d >= 2 else 0)


def melodia_organo(P, t0, notas, vel, trans=0, octava=0):
    """A tune on the lead organ."""
    for b, d, m in notas:
        P.nota('orgM', t0 + b, d, m + trans + octava, vel + (6 if b % 1 == 0 else 0), humano=0.003, legato=0.97)


def solo(P, t0, texto, vel=104):
    pos = 0
    for compas in texto.split('|'):
        for tok in compas.split():
            nota, d = tok.split(':')
            vib = d.endswith('v')
            d = int(d.rstrip('v'))
            m = re.match(r'([A-G][#b]?\d)(?:\^(\d))?', nota)
            sube = int(m.group(2) or 0)
            P.nota('sol1', t0 + pos / 4, d / 4, m.group(1), vel + (8 if pos % 4 == 0 else 0), humano=0.0,
                   legato=0.95, sube=sube, cuando=0.3 if sube else 0.25, vib=28 if vib else 0)
            pos += d


# --- The drums ---------------------------------------------------------------------------------

def platillo(P, b0, k, modo, vel):
    """Hat or ride on eighth number k of the bar."""
    b = b0 + k / 2
    if modo == 'estribillo':       # ride on the beat, open hat between
        P.nota('bat', b, 0.5, 46 if k % 2 else 51, vel - (20 if k % 2 else 6), humano=0.003, legato=1)
    elif modo == 'ride':           # ride on every eighth, the offbeats softer
        P.nota('bat', b, 0.5, 51, vel - (24 if k % 2 else 10), humano=0.003, legato=1)
    elif modo == 'abierto':        # closed hat on the beat, open hat on the offbeat
        P.nota('bat', b, 0.5, 46 if k % 2 else 42, vel - (22 if k % 2 else 12), humano=0.003, legato=1)
    else:                          # closed hat
        P.nota('bat', b, 0.5, 42, vel - (24 if k % 2 else 10), humano=0.003, legato=1)


def rodillo(P, b, n, v0, v1, paso=0.25, nota=38):
    """A snare roll of n hits growing from velocity v0 to v1."""
    for k in range(n):
        P.nota('bat', b + k * paso, paso, nota, int(v0 + (v1 - v0) * k / max(n - 1, 1)), humano=0.003, legato=1)


def toms(P, b, vel, n=8):
    """The tom cascade of the old fills, a sixteenth apart, climbing in force."""
    for k, tom in enumerate((50, 48, 45, 43, 41, 41, 38, 38)[:n]):
        P.nota('bat', b + k / 4, 0.25, tom, vel + k * 2, humano=0.003, legato=1)


def bateria(P, t0, compases, modo='riff', vel=104, relleno=True, crash=True, bombo=None, charles=None):
    """Kick, snare, hats or ride; a fill in the last beats (relleno: True, toms; 'caja', a snare roll;
    False, none); a crash on the first. bombo: the kick as sixteenths ('x.....x..x......')."""
    h = 0.003
    for c in range(compases):
        b0 = t0 + c * L
        patron = bombo or ('x.....x..x......' if modo == 'riff' else 'x.......x.x.....')
        for k, ch in enumerate(patron):
            if ch == 'x':
                P.nota('bat', b0 + k / 4, 0.25, 36, vel + 6, humano=h, legato=1)
        ultimo = bool(relleno) and c == compases - 1
        for b in ((1, 3) if not ultimo else (1,)):
            P.nota('bat', b0 + b, 0.5, 38, vel + 10, humano=h, legato=1)
        for k in range(8 if not ultimo else 6):
            platillo(P, b0, k, charles or ('estribillo' if modo == 'estribillo' else 'cerrado'), vel)
        if ultimo:
            if relleno == 'caja':
                rodillo(P, b0 + 2, 8, vel - 14, vel + 14)
            else:
                toms(P, b0 + 2, vel)
    if crash:
        P.nota('bat', t0, 1, 49, vel + 14, humano=0.002, legato=1)
        P.nota('bat', t0, 1, 36, vel + 10, humano=0.002, legato=1)


# --- The sections ------------------------------------------------------------------------------------

def seccion_intro(P, t):
    """Eight bars that build: the left guitar, the bass and the hats; then the right guitar and the
    kick and snare; then the organ; a tom fill into the verse."""
    P.nivel(t, t + 4 * L, NIVEL_ANILLO, -2)
    P.nivel(t + 4 * L, t + 8 * L, -2, 0)
    riff(P, t, RIFF_E, 96, lados='I')
    riff(P, t + 2 * L, RIFF_E, 100)
    riff(P, t + 4 * L, RIFF_E * 2, 104)
    organo(P, t + 4 * L, [['Em']] * 4, vel=60)
    bateria(P, t, 2, vel=82, relleno=False, bombo='x.......x.......')
    bateria(P, t + 2 * L, 2, vel=92, relleno=False, crash=False)
    bateria(P, t + 4 * L, 4)
    P.seccion('intro', t, t + 8 * L)
    return t + 8 * L


def seccion_verso(P, t, n=1):
    """The verse. The first is the old one (the riff on E, on A, on E, with the organ under it);
    the second climbs where the riff stayed low, the right guitar plays it an octave up, the bass
    bounces, the organ stabs on the offbeat, a lead guitar sings a long line and the kick follows
    the riff on a ride cymbal."""
    P.nivel(t, t + 8 * L, 0 if n == 1 else -0.5)
    if n == 1:
        riff(P, t, RIFF_E + RIFF_E + RIFF_A + RIFF_E)
        organo(P, t, [['Em'], ['Em'], ['Em'], ['Em'], ['Am'], ['Am'], ['Em'], ['Em']], vel=66)
        bateria(P, t, 8, relleno='caja')
    else:
        compases = [RIFF_V, RIFF_E[1], RIFF_V, RIFF_E[1]] + RIFF_A + [RIFF_V, RIFF_E[1]]
        riff(P, t, compases, oct_D=12, bajo_octavas=True)
        organo(P, t, [['Em'], ['Em'], ['Em'], ['Em'], ['Am'], ['Am'], ['Em'], ['Em']], vel=62, sincopado=True)
        lead(P, t, LINEA_V2, 84)
        bateria(P, t, 8, bombo='x.x...x..x..x...', charles='ride')
    P.seccion(f'verso {n}', t, t + 8 * L)
    return t + 8 * L


def seccion_pre(P, t, n=1):
    """The pre-chorus, four bars on A minor and B: chugs and bass in eighths, then stabs that speed
    up, the organ holding, the lead hanging on the leading note, a snare that rolls faster and
    louder until the chorus lands (as the second time the lead gets a companion under it)."""
    v = 98 if n == 1 else 104
    P.nivel(t, t + 4 * L, 0.2, 1.2)
    for i in range(4):
        b0 = t + i * L
        raiz = 'A' if i < 2 else 'B'
        r = midi(RAIZ[raiz]) - 12
        if i < 2:
            for pista in ('gI', 'gD'):
                power(P, pista, b0, 0.9, raiz, v)
            for k in range(2, 8):
                for pista in ('mI', 'mD'):
                    mute(P, pista, b0 + k / 2, 0.5, raiz, v - 10 + (4 if k % 2 == 0 else 0))
        elif i == 2:
            for b, d in ((0, 1.4), (1.5, 0.4), (2, 1.4), (3.5, 0.4)):
                for pista in ('gI', 'gD'):
                    power(P, pista, b0 + b, d, raiz, v + 6, legato=0.9)
        else:
            for b in range(4):
                for pista in ('gI', 'gD'):
                    power(P, pista, b0 + b, 0.9, raiz, v + 6 + b * 3, legato=0.9)
        for k in range(8):
            P.nota('bajo', b0 + k * 0.5, 0.5, r, v - (8 if k % 2 else 0) + i * 2, humano=0.005, legato=0.8)
    organo(P, t, [['Am'], ['Am'], ['B'], ['B']], vel=70)
    lead(P, t + 2 * L, PRE_LEAD, 92)
    if n == 2:
        for b, d, m in PRE_LEAD2:
            P.nota('sol2', t + 2 * L + b, d, m, 84, humano=0.0, legato=0.95, vib=22)
    # drums: the beat, then the snare doubling its speed every bar
    bateria(P, t, 2, vel=v, relleno=False, crash=False)
    b0 = t + 2 * L
    for b in (0, 2):
        P.nota('bat', b0 + b, 0.25, 36, v + 6, humano=0.003, legato=1)
    rodillo(P, b0, 8, v - 34, v - 8, paso=0.5)
    for k in range(8):
        platillo(P, b0, k, 'cerrado', v)
    b0 = t + 3 * L
    P.nota('bat', b0, 0.25, 36, v + 8, humano=0.003, legato=1)
    P.nota('bat', b0 + 2, 0.25, 36, v + 8, humano=0.003, legato=1)
    rodillo(P, b0, 16, v - 28, v + 14)
    P.seccion(f'preestribillo {n}', t, t + 4 * L)
    return t + 4 * L


def seccion_estribillo(P, t, v_acorde=108, v_lead=100, v_arm=92, v_org=80, trans=0, doble=False, nivel=1.0, nombre='estribillo'):
    """The chorus. With trans, the first seven bars go up that many semitones and the last one
    comes back home (on B, the dominant of E minor, ready for what follows). doble: the organ
    sings the tune an octave under the twin leads."""
    P.nivel(t, t + 8 * L, nivel)
    if trans:
        casa = SALTO_ESTRIBILLO
        arriba = [x for x in LEAD_E if x[0] < casa]
        abajo = [x for x in LEAD_E if x[0] >= casa]
        acordes_largos(P, t, ACORDES_E[:7], v_acorde, trans)
        acordes_largos(P, t + 7 * L, ACORDES_E[7:], v_acorde)
        organo(P, t, ACORDES_E[:7], v_org, trans)
        organo(P, t + 7 * L, ACORDES_E[7:], v_org)
        lead(P, t, arriba, v_lead, trans)
        armonia(P, t, arriba, ACORDES_E, v_arm, trans)
        lead(P, t, abajo, v_lead)
        armonia(P, t, abajo, ACORDES_E, v_arm)
        if doble:
            melodia_organo(P, t, arriba, v_org + 10, trans, -12)
            melodia_organo(P, t, abajo, v_org + 10, 0, -12)
    else:
        acordes_largos(P, t, ACORDES_E, v_acorde)
        lead(P, t, LEAD_E, v_lead)
        armonia(P, t, LEAD_E, ACORDES_E, v_arm)
        organo(P, t, ACORDES_E, vel=v_org)
        if doble:
            melodia_organo(P, t, LEAD_E, v_org + 10, 0, -12)
    bateria(P, t, 8, 'estribillo')
    P.seccion(nombre, t, t + 8 * L)
    return t + 8 * L


def seccion_riff(P, t, vel=104):
    """Four bars of the bare riff, the right guitar an octave up: a breath between chorus and verse."""
    P.nivel(t, t + 4 * L, 0)
    riff(P, t, RIFF_E * 2, vel, oct_D=12)
    bateria(P, t, 4)
    P.seccion('riff', t, t + 4 * L)
    return t + 4 * L


def seccion_solo(P, t, n=1):
    """The solo: the riff where the chord is E minor, ringing chords elsewhere. The second has its
    own tune, its own changes and the kit on the ride."""
    P.nivel(t, t + 8 * L, 0.5)
    acordes, texto, v = (ACORDES_S, SOLO, 104) if n == 1 else (ACORDES_S2, SOLO2, 110)
    for i, (ch, *_) in enumerate(acordes):
        if ch == 'Em':
            riff(P, t + i * L, [RIFF_E[i % 2]], vel=96)
        else:
            acordes_largos(P, t + i * L, [[ch]], vel=100)
    solo(P, t, texto, v)
    organo(P, t, acordes, vel=70)
    bateria(P, t, 8, 'estribillo', bombo=None if n == 1 else 'x.......x.x.x...')
    P.seccion(f'solo {n}', t, t + 8 * L)
    return t + 8 * L


def seccion_puente(P, t):
    """The bridge, eight bars on G, D, E minor, C, G, D, C, B. Four bars of near silence: clean
    guitars arpeggiating, the second a dotted eighth behind the first like an echo, the bass on
    half notes, the kit in half time, the organ singing a new tune. Then distorted chords come in
    under it and grow, a snare roll rises, and the last bar is a drum break: one stab of the whole
    band on B, then the kit alone."""
    P.nivel(t, t + 4 * L, -2.5)
    P.nivel(t + 4 * L, t + 7 * L, -2.5, 0.5)
    P.nivel(t + 7 * L, t + 8 * L, 0.5)
    for i, ch in enumerate(ACORDES_P[:7]):
        b0 = t + i * L
        raiz = ch.rstrip('m')
        fund = midi(RAIZ[raiz]) - 12
        arp = tonos(ch, 'G3', 'G5')
        for k, ix in enumerate((0, 2, 3, 2, 4, 2, 3, 2)):
            m = arp[ix]
            acento = 8 if k % 4 == 0 else 0
            P.nota('gCI', b0 + k / 2, 0.5, m, 70 + acento, humano=0.004, legato=1.8)
            P.nota('gCD', b0 + k / 2 + 0.75, 0.5, m, 56 + acento, humano=0.004, legato=1.8)
        if i < 4:
            P.nota('bajo', b0, 2, fund, 84, humano=0.005, legato=0.97)
            P.nota('bajo', b0 + 2, 2, fund, 76, humano=0.005, legato=0.97)
        else:
            for k in range(8):
                P.nota('bajo', b0 + k * 0.5, 0.5, fund, 82 + (i - 4) * 6 - (8 if k % 2 else 0), humano=0.005, legato=0.8)
            for pista in ('gI', 'gD'):
                power(P, pista, b0, L, raiz, (78, 88, 100)[i - 4], legato=1.0)
            P.acorde('org', b0, L, [x for x in tonos(ch, 'G3', 'G4')[:3]], 58 + (i - 4) * 4, humano=0.004, legato=1.0)
    melodia_organo(P, t, MELODIA_P, 82)
    # drums: half time on the ride, then the open hats, then the roll
    for i in range(4):
        b0 = t + i * L
        P.nota('bat', b0, 0.25, 36, 84, humano=0.003, legato=1)
        P.nota('bat', b0 + 2, 0.5, 38, 78, humano=0.003, legato=1)
        P.nota('bat', b0 + 2.5, 0.25, 36, 62, humano=0.003, legato=1)
        for b in range(4):
            P.nota('bat', b0 + b, 0.5, 51, 66 if b % 2 == 0 else 54, humano=0.003, legato=1)
    P.nota('bat', t + 4 * L, 1, 49, 86, humano=0.002, legato=1)
    for i in (4, 5):
        b0 = t + i * L
        for b, v in ((0, 96), (1.5, 78), (2.5, 80)):
            P.nota('bat', b0 + b, 0.25, 36, v, humano=0.003, legato=1)
        P.nota('bat', b0 + 2, 0.5, 38, 98, humano=0.003, legato=1)
        for k in range(8):
            platillo(P, b0, k, 'abierto', 92)
    b0 = t + 6 * L
    P.nota('bat', b0, 0.25, 36, 100, humano=0.003, legato=1)
    P.nota('bat', b0 + 2, 0.25, 36, 100, humano=0.003, legato=1)
    rodillo(P, b0, 16, 60, 112)
    # the break: the stab on B and the kit alone
    b0 = t + 7 * L
    for pista in ('gI', 'gD'):
        power(P, pista, b0, 0.75, 'B', 118, legato=0.9)
    P.nota('bajo', b0, 0.75, midi(RAIZ['B']) - 12, 116, humano=0.003, legato=0.9)
    P.nota('bat', b0, 1, 49, 96, humano=0.002, legato=1)
    P.nota('bat', b0, 0.25, 36, 112, humano=0.002, legato=1)
    P.nota('bat', b0, 0.5, 38, 110, humano=0.002, legato=1)
    rodillo(P, b0 + 1, 4, 86, 104)
    P.nota('bat', b0 + 2, 0.25, 36, 112, humano=0.003, legato=1)
    toms(P, b0 + 2, 100)
    P.seccion('puente', t, t + 8 * L)
    return t + 8 * L


def seccion_coda(P, t):
    """Eight bars that lead back to the beginning: the riff with everybody, then the left guitar
    alone with the bass, then a few chugs on the low E and a snare roll growing out of nothing,
    which is where the intro starts."""
    P.nivel(t, t + 4 * L, 0.5, -0.5)
    P.nivel(t + 4 * L, t + 6 * L, -1.5, -2.5)
    P.nivel(t + 6 * L, t + 8 * L, -2.5, NIVEL_ANILLO)
    riff(P, t, RIFF_E * 2, 106)
    bateria(P, t, 4, vel=106)
    riff(P, t + 4 * L, RIFF_E, 86, lados='I')
    organo(P, t + 4 * L, [['Em']] * 2, vel=54)
    bateria(P, t + 4 * L, 2, vel=74, relleno=False, crash=False)
    for c in (6, 7):
        for k in range(8):
            mute(P, 'mI', t + c * L + k / 2, 0.5, 'E', 62 + (c - 6) * 8 + k)
    P.nota('bajo', t + 6 * L, 2 * L, midi(RAIZ['E']) - 12, 72, legato=0.98)
    b0 = t + 6 * L
    for k in range(8):
        platillo(P, b0, k, 'cerrado', 60)
    P.nota('bat', b0, 0.25, 36, 72, humano=0.003, legato=1)
    b0 = t + 7 * L
    for k in range(4):
        platillo(P, b0, k, 'cerrado', 64)
    rodillo(P, b0 + 1, 12, 34, 100)
    P.seccion('coda', t, t + 8 * L)
    return t + 8 * L


def construir(sueno=False):
    """The whole song. The dream plays all of it but the intro, the bare riff and the second verse
    (20 of the 100 bars: 80 bars at 0.8 speed last as long as the 100)."""
    P = Partitura()
    t = 0
    if not sueno:
        t = seccion_intro(P, t)
    t = seccion_verso(P, t, 1)
    t = seccion_pre(P, t, 1)
    t = seccion_estribillo(P, t, nivel=0.3, nombre='estribillo 1')
    if not sueno:
        t = seccion_riff(P, t)
        t = seccion_verso(P, t, 2)
    t = seccion_pre(P, t, 2)
    t = seccion_estribillo(P, t, 108, 102, 94, 82, nivel=0.8, nombre='estribillo 2')
    t = seccion_solo(P, t, 1)
    t = seccion_puente(P, t)
    t = seccion_solo(P, t, 2)
    t = seccion_estribillo(P, t, 108, 104, 96, 84, nivel=0.8, nombre='estribillo 3')
    t = seccion_estribillo(P, t, 110, 106, 98, 84, trans=2, doble=True, nivel=1.0, nombre='estribillo 4 (un tono arriba)')
    t = seccion_coda(P, t)
    assert t == (BARS_SUENO if sueno else BARS) * L
    P.dina.sort()
    if abs(P.dina[0][1] - P.dina[-1][1]) > 1e-9:       # the dream has no intro: the first bar slides from the coda's level
        P.dina[0:1] = [(0, P.dina[-1][1]), (L, P.dina[0][1])]
    return P, (BARS_SUENO if sueno else BARS)


def ronda_completa():
    """The 100 bars: intro, verse, pre-chorus, chorus, riff, verse, pre-chorus, chorus, solo,
    bridge (with the drum break), second solo, chorus, chorus a tone up, coda."""
    return construir(False)


def ronda_sueno():
    """The dream's 80 bars: all but the intro, the bare riff and the second verse."""
    return construir(True)


# --- Signal tools (numpy only; everything circular so a round loops) ---------------------------

def poner(buf, i0, w, g=None):
    """Adds w into buf (n,) or (2, n) at sample i0, wrapping round the end. g = (left, right) gains."""
    n = buf.shape[-1]
    i0 %= n
    k = min(len(w), n - i0)
    for parte, (a, b) in enumerate(((i0, i0 + k), (0, len(w) - k))):
        seg = w[:k] if parte == 0 else w[k:]
        if len(seg) == 0:
            continue
        if buf.ndim == 1:
            buf[a:b] += seg
        else:
            buf[0, a:b] += seg * g[0]
            buf[1, a:b] += seg * g[1]


def respuesta(f, e):
    tipo = e[0]
    if tipo == 'lp':
        return 1 / np.sqrt(1 + (f / e[1]) ** (2 * e[2]))
    if tipo == 'hp':
        return 1 / np.sqrt(1 + (e[1] / np.maximum(f, 1e-3)) ** (2 * e[2]))
    if tipo == 'pico':        # ('pico', Hz, dB, width in octaves): a bell in log frequency
        return 10 ** (e[2] * np.exp(-0.5 * (np.log2(np.maximum(f, 1.0) / e[1]) / e[3]) ** 2) / 20)
    if tipo == 'alto':        # ('alto', Hz, dB): a high shelf
        return 10 ** (e[2] / (1 + (e[1] / np.maximum(f, 1.0)) ** 2) / 20)
    if tipo == 'bajo':        # ('bajo', Hz, dB): a low shelf
        return 10 ** (e[2] / (1 + (np.maximum(f, 1.0) / e[1]) ** 2) / 20)
    raise ValueError(tipo)


def eq(x, *esp, sr=SR, circ=True):
    """Zero-phase EQ by FFT. circ: the signal is a ring (exact length); otherwise it is padded."""
    n = x.shape[-1]
    m = n if circ else 1 << int(np.ceil(np.log2(max(n, 2))))
    f = np.fft.rfftfreq(m, 1 / sr)
    H = np.ones(len(f))
    for e in esp:
        H = H * respuesta(f, e)
    return np.fft.irfft(np.fft.rfft(x, m, axis=-1) * H, m, axis=-1)[..., :n]


def sobremuestrear(x):
    n = len(x)
    X = np.fft.rfft(x)
    Y = np.zeros(n + 1, dtype=complex)
    Y[:n // 2 + 1] = X
    return np.fft.irfft(Y, 2 * n) * 2


def submuestrear(y):
    n = len(y) // 2
    return np.fft.irfft(np.fft.rfft(y)[:n // 2 + 1], n) / 2


def potencia_activa(x, ventana=SR // 10, umbral=1e-3):
    """Mean power (dB) over the 100 ms windows that are not silent."""
    x = x if x.ndim == 1 else (x ** 2).mean(axis=0) ** 0.5
    m = len(x) // ventana * ventana
    p = (x[:m] ** 2).reshape(-1, ventana).mean(axis=1)
    p = p[p > umbral ** 2]
    return 10 * np.log10(p.mean() + 1e-12) if len(p) else -99.0


def suav(x, tau):
    """One-pole smoothing on a ring (a causal exponential kernel, by FFT)."""
    n = x.shape[-1]
    k = int(min(n, 8 * tau * SR))
    ker = np.exp(-np.arange(k) / (tau * SR))
    ker /= ker.sum()
    return np.fft.irfft(np.fft.rfft(x, axis=-1) * np.fft.rfft(ker, n), n, axis=-1)


def compresor(x, umbral_db, ratio, ataque=0.003, suelta=0.08):
    """Feed-forward compressor, linked across the sides (as orquesta.py's): a 10 ms RMS level,
    a reduction smoothed with attack and release."""
    pot = (x ** 2).mean(axis=0) if x.ndim == 2 else x ** 2
    nivel = np.sqrt(np.maximum(suav(pot, 0.01), 0) + 1e-12)
    sobre = np.maximum(0, 20 * np.log10(nivel) - umbral_db)
    red = sobre * (1 - 1 / ratio)
    red = suav(red, ataque)
    red = np.maximum(red, suav(red, suelta))
    return x * db(-red)


def limitador(x, cresta_db=13.5, ventana=0.004):
    """A look-ahead peak limiter on the ring: no peak goes more than `cresta_db` over the RMS of the
    whole mix (a downbeat where the crash, the kick, the snare and the chord all land in the same
    few milliseconds can reach 16 dB over it, the rest of the song never 14). The gain falls before
    the peak and returns after it, over `ventana` seconds, linked across the sides."""
    techo = np.sqrt(np.mean(x ** 2)) * db(cresta_db)
    g = np.minimum(1.0, techo / np.maximum(np.abs(x).max(axis=0), 1e-12))
    w = max(2, int(ventana * SR) | 1)
    m, cubierto = g.copy(), 1
    while cubierto < w:                                  # sliding minimum over w samples, by doubling
        paso = min(cubierto, w - cubierto)
        m = np.minimum(m, np.roll(m, -paso))
        cubierto += paso
    m = np.roll(m, w // 2)                               # centred on each sample
    n = len(m)
    hann = np.hanning(w + 2)[1:-1]
    hann /= hann.sum()
    k = np.zeros(n)
    k[:w] = hann
    suave_ = np.fft.irfft(np.fft.rfft(m) * np.fft.rfft(np.roll(k, -(w // 2))), n)    # smoothed, never above the minimum
    return x * np.minimum(1.0, suave_)


def retardo(x, d):
    """Fractional delay on a ring: d in samples (array or number). Linear interpolation."""
    n = len(x)
    idx = np.arange(n) - d
    i0 = np.floor(idx).astype(np.int64)
    fr = idx - i0
    return x[i0 % n] * (1 - fr) + x[(i0 + 1) % n] * fr


def lfo_hz(f, n=N):
    """The nearest frequency that makes a whole number of turns over n samples (a round)."""
    return max(1, round(f * n / SR)) * SR / n


def panear(x, pan):
    ang = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(ang) * np.sqrt(2), x * np.sin(ang) * np.sqrt(2)])


_IR = {}


def sala(rt, n=N, semilla=5):
    """A stereo impulse response: three bands, the lows ringing longer than the highs."""
    clave = (rt, semilla)
    if clave not in _IR:
        r = np.random.default_rng(semilla)
        largo = int(rt * 1.25 * SR)
        t = np.arange(largo) / SR
        ir = np.zeros((2, largo))
        for c in range(2):
            ruido = r.standard_normal(largo)
            bajo = eq(ruido, ('lp', 500, 2), circ=False)
            medio = eq(ruido, ('hp', 500, 2), ('lp', 3500, 2), circ=False)
            alto = eq(ruido, ('hp', 3500, 2), circ=False)
            ir[c] = (bajo * np.exp(-6.9 * t / rt) + 0.8 * medio * np.exp(-6.9 * t / (0.8 * rt))
                     + 0.5 * alto * np.exp(-6.9 * t / (0.35 * rt)))
            ir[c] *= np.minimum(1, t / 0.02)
        ir = np.concatenate([np.zeros((2, int(0.018 * SR))), ir], axis=1)
        _IR[clave] = ir / np.sqrt(np.sum(ir ** 2) / 2) * 0.5
    return _IR[clave]


def reverb(envio, rt, semilla=5):
    """Circular convolution of a send (2, n) with the room: the tail wraps round to the start."""
    ir = sala(rt, semilla=semilla)
    n = envio.shape[1]
    out = np.zeros_like(envio)
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(envio[c]) * np.fft.rfft(ir[c], n), n)
    return out


# --- Oscillators and envelopes -------------------------------------------------------------------

def sierra(f, fase0=0.0):
    """Band-limited sawtooth (PolyBLEP) for a frequency array, peak 1."""
    dt = f / SR
    fase = (fase0 + np.concatenate(([0.0], np.cumsum(dt)[:-1]))) % 1.0
    y = 2 * fase - 1
    a = fase < dt
    x = fase[a] / dt[a]
    y[a] -= x + x - x * x - 1
    b = fase > 1 - dt
    x = (fase[b] - 1) / dt[b]
    y[b] -= x * x + x + x + 1
    return y


def env_exp(nm, att, tau, gate, rel):
    """Fast attack, exponential decay, and a release when the gate (seconds) closes."""
    t = np.arange(nm) / SR
    e = np.minimum(1.0, t / max(att, 1e-4)) * np.exp(-t / tau)
    g = min(int(gate * SR), nm - 1)
    e[g:] *= np.exp(-(t[g:] - t[g]) / rel)
    k = min(48, nm)
    e[-k:] *= np.linspace(1, 0, k)
    return e


def vel_a_amp(v):
    return (v / 127.0) ** 1.3


def clic(nm, dur, fl, fh, amp):
    """A pick click: a burst of filtered noise."""
    k = min(nm, int(dur * 6 * SR) + 16)
    t = np.arange(k) / SR
    r = eq(RNG.standard_normal(k), ('hp', fl, 2), ('lp', fh, 2), circ=False)
    w = np.zeros(nm)
    w[:k] = r * np.exp(-t / dur) * amp
    return w


# --- Instruments ---------------------------------------------------------------------------------

def nota_guitarra(m, gate, vel, acorde, apagado=False, **_):
    """One strum of the rhythm guitar (before the amp): saw strings a few cents apart, struck a
    few milliseconds apart, a bright pluck over a body that rings (or, muted, only a dull thump)."""
    cola = 0.14
    nm = int((gate + cola) * SR) + 1
    s = np.zeros(nm)
    for i, mm in enumerate(acorde):
        off = int(i * 0.0035 * SR)
        if off < nm:
            s[off:] += sierra(np.full(nm - off, float(hz(mm + RNG.normal(0, 0.035)))), RNG.random())
    t = np.arange(nm) / SR
    if apagado:
        w = eq(s, ('lp', 850, 2), ('hp', 70, 2), circ=False) * env_exp(nm, 0.002, 0.075, gate, 0.02)
        w = w + clic(nm, 0.004, 1200, 4500, 0.18)
    else:
        brillo = eq(s, ('lp', 3600, 2), circ=False) * np.exp(-t / 0.09) * env_exp(nm, 0.002, 5.0, gate, 0.03)
        cuerpo = eq(s, ('lp', 1500, 2), circ=False) * env_exp(nm, 0.003, 1.4, gate, 0.06)
        w = 0.55 * brillo + cuerpo + clic(nm, 0.005, 1500, 5500, 0.2)
    return w * vel_a_amp(vel)


def nota_solo(m, gate, vel, sube=0, cuando=0.25, vib=0, **_):
    """A lead note (before the amp): a saw with a thin octave-up edge, a bend from `sube`
    semitones below into the note over the first `cuando` of it, then a finger vibrato."""
    cola = 0.35
    nm = int((gate + cola) * SR) + 1
    t = np.arange(nm) / SR
    u = np.minimum(1.0, t / max(gate, 1e-3))
    subida = sube * np.minimum(1.0, u / cuando) ** 0.7 if sube else 0.0
    vibrato = vib / 100 * np.sin(2 * np.pi * 5.5 * t) * np.clip((u - cuando) / 0.2, 0, 1) if vib else 0.0
    tono = m - sube + subida + vibrato + np.zeros(nm)
    f = hz(tono)
    w = sierra(f, RNG.random()) + 0.6 * sierra(f * 1.0035, RNG.random()) + 0.12 * sierra(2 * f, RNG.random())
    w = eq(w, ('lp', 4200, 2), circ=False)
    w = w * env_exp(nm, 0.008, 2.2, gate, 0.12)
    return w * (0.4 + 0.6 * vel_a_amp(vel))


def nota_bajo(m, gate, vel, **_):
    """A picked bass: a bright saw that dies in a moment over a darker body and a sine sub."""
    cola = 0.1
    nm = int((gate + cola) * SR) + 1
    t = np.arange(nm) / SR
    f = np.full(nm, float(hz(m)))
    s = sierra(f, RNG.random())
    brillo = eq(s, ('lp', 2600, 2), ('hp', 60, 2), circ=False) * np.exp(-t / 0.09)
    cuerpo = eq(s, ('lp', 520, 2), circ=False)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR)
    w = (1.2 * brillo + 0.9 * cuerpo + 0.5 * sub) * env_exp(nm, 0.003, 0.9, gate, 0.05)
    return (w + clic(nm, 0.003, 900, 3000, 0.1)) * vel_a_amp(vel)


def nota_organo(m, gate, vel, **_):
    """Hammond-ish drawbars (1, 2, 3, 4, 6, 8 times the pitch) with a quick key click."""
    cola = 0.08
    nm = int((gate + cola) * SR) + 1
    t = np.arange(nm) / SR
    f = float(hz(m))
    w = np.zeros(nm)
    for k, a in ((1, 1.0), (2, 0.75), (3, 0.55), (4, 0.4), (6, 0.22), (8, 0.15)):
        if f * k < 9000:
            w += a * np.sin(2 * np.pi * f * k * t + RNG.random() * 6.28)
    w += 0.35 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / 0.12)     # percussion on the third
    e = np.minimum(1.0, t / 0.006)
    g = min(int(gate * SR), nm - 1)
    e[g:] *= np.exp(-(t[g:] - t[g]) / 0.025)
    e[-32:] *= np.linspace(1, 0, 32)
    return (w * e + clic(nm, 0.003, 2000, 7000, 0.12)) * vel_a_amp(vel)


def nota_limpia(m, gate, vel, **_):
    """A clean, plucked guitar (no amp): two saws a few cents apart, a bright pluck that dies in
    a moment over a mellow body that rings on."""
    cola = 0.5
    nm = int((gate + cola) * SR) + 1
    f = np.full(nm, float(hz(m)))
    s = sierra(f, RNG.random()) + 0.6 * sierra(f * 1.0025, RNG.random())
    brillo = eq(s, ('lp', 3200, 2), circ=False) * env_exp(nm, 0.002, 0.13, gate, 0.08)
    cuerpo = eq(s, ('lp', 1100, 2), circ=False) * env_exp(nm, 0.004, 0.75, gate, 0.15)
    return (0.5 * brillo + cuerpo + clic(nm, 0.004, 1500, 6000, 0.12)) * vel_a_amp(vel)


def nota_organo_solista(m, gate, vel, **_):
    """The lead organ: drawbars like nota_organo's but brighter, a vibrato that comes in after a
    moment, and a key click."""
    cola = 0.12
    nm = int((gate + cola) * SR) + 1
    t = np.arange(nm) / SR
    f = float(hz(m))
    u = np.minimum(1.0, t / max(gate, 1e-3))
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.8 * t) * np.clip((t - 0.15) / 0.25, 0, 1)
    fase = 2 * np.pi * np.cumsum(f * vib) / SR
    w = np.zeros(nm)
    for k, a in ((1, 1.0), (2, 0.9), (3, 0.7), (4, 0.55), (5, 0.3), (6, 0.3), (8, 0.18)):
        if f * k < 9000:
            w += a * np.sin(k * fase + RNG.random() * 6.28)
    w += 0.45 * np.sin(3 * fase) * np.exp(-t / 0.15)             # percussion on the third
    e = np.minimum(1.0, t / 0.008)
    g = min(int(gate * SR), nm - 1)
    e[g:] *= np.exp(-(t[g:] - t[g]) / 0.04)
    e[-32:] *= np.linspace(1, 0, 32)
    return (w * e + clic(nm, 0.003, 2000, 7000, 0.14)) * vel_a_amp(vel)


def metal(nm, escala=1.0):
    """The 808 hat recipe: six square waves a little out of tune with each other."""
    t = np.arange(nm) / SR
    w = np.zeros(nm)
    for f in 205.3 * np.array([2, 3, 4.16, 5.43, 6.79, 8.21]) * escala:
        w += np.sign(np.sin(2 * np.pi * f * t + RNG.random() * 6.28))
    return w / 6


def golpe(nota, vel):
    """One drum hit: -> (mono waveform, pan, reverb send)."""
    a = vel_a_amp(vel)
    if nota == 36:      # kick
        nm = int(0.45 * SR)
        t = np.arange(nm) / SR
        f = 46 + 130 * np.exp(-t / 0.03)
        cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.15)
        golpe_ = eq(RNG.standard_normal(nm), ('hp', 1500, 2), ('lp', 5000, 2), circ=False) * np.exp(-t / 0.004) * 0.35
        pegada = np.sin(2 * np.pi * np.cumsum(90 + 80 * np.exp(-t / 0.012)) / SR) * np.exp(-t / 0.05) * 0.5
        w = np.tanh(1.7 * (cuerpo + pegada)) + golpe_
        return w * a, 0.0, 0.05
    if nota == 38:      # snare
        nm = int(0.5 * SR)
        t = np.arange(nm) / SR
        tono = (np.sin(2 * np.pi * np.cumsum(185 + 40 * np.exp(-t / 0.02)) / SR) * 0.9
                + np.sin(2 * np.pi * np.cumsum(330 + 60 * np.exp(-t / 0.02)) / SR) * 0.45) * np.exp(-t / 0.075)
        hilos = eq(RNG.standard_normal(nm), ('hp', 1300, 2), ('lp', 9000, 2), circ=False) * np.minimum(1, t / 0.0015) * np.exp(-t / 0.12)
        w = np.tanh(1.3 * (0.75 * tono + 0.95 * hilos))
        return w * a, 0.04, 0.3
    if nota in (42, 46):     # hats: closed, open
        abierto = nota == 46
        nm = int((0.5 if abierto else 0.12) * SR)
        t = np.arange(nm) / SR
        w = eq(metal(nm) * 0.9 + 0.5 * RNG.standard_normal(nm), ('hp', 6500, 2), ('lp', 15000, 1), circ=False)
        w = w * np.minimum(1, t / 0.0008) * np.exp(-t / (0.14 if abierto else 0.022))
        w[-32:] *= np.linspace(1, 0, 32)
        return w * a * 0.4, -0.3, 0.12
    if nota == 51:      # ride
        nm = int(0.9 * SR)
        t = np.arange(nm) / SR
        w = eq(metal(nm, 0.8) + 0.3 * RNG.standard_normal(nm), ('hp', 3500, 2), ('lp', 13000, 1), circ=False) * np.exp(-t / 0.3)
        w += 0.35 * (np.sin(2 * np.pi * 2380 * t) + 0.6 * np.sin(2 * np.pi * 4210 * t)) * np.exp(-t / 0.18) * 0.5
        w = w * np.minimum(1, t / 0.0008)
        w[-64:] *= np.linspace(1, 0, 64)
        return w * a * 0.34, 0.35, 0.2
    if nota == 49:      # crash
        nm = int(2.6 * SR)
        t = np.arange(nm) / SR
        w = eq(metal(nm, 1.1) * 0.7 + RNG.standard_normal(nm), ('hp', 2500, 2), ('lp', 14000, 1), circ=False)
        w = w * np.minimum(1, t / 0.001) * (0.6 * np.exp(-t / 0.18) + 0.4 * np.exp(-t / 0.9))
        w[-256:] *= np.linspace(1, 0, 256)
        return w * a * 0.42, -0.4, 0.22
    tom = {50: (196, 0.35), 48: (165, 0.15), 47: (146, 0.0), 45: (130, -0.1), 43: (108, -0.3), 41: (88, -0.4)}
    if nota in tom:
        f0, pan = tom[nota]
        nm = int(0.55 * SR)
        t = np.arange(nm) / SR
        f = f0 * (1 + 0.5 * np.exp(-t / 0.04))
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
        w += eq(RNG.standard_normal(nm), ('hp', 800, 2), ('lp', 4000, 2), circ=False) * np.exp(-t / 0.012) * 0.4
        return np.tanh(1.4 * w) * a, pan, 0.18
    raise ValueError(nota)


def organo_leslie(x):
    """The rotating speaker: a pitch wobble and a swell that run opposite ways on the two sides.
    A little drive in front, as a rock organ through a tube amp."""
    n = len(x)
    x = np.tanh(1.8 * x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.7)
    x = eq(x, ('hp', 150, 2), ('lp', 7500, 2))
    f = lfo_hz(6.3, n)
    t = np.arange(n) / SR
    out = []
    for lado in (1, -1):
        fase = 2 * np.pi * f * t
        d = (0.0007 + lado * 0.0004 * np.sin(fase)) * SR
        y = retardo(x, d) * (1 + lado * 0.28 * np.sin(fase + 0.6))
        out.append(y)
    return np.stack(out)


# --- Amps -----------------------------------------------------------------------------------------

def amplificar(x, g1, g2, pre, entre, cab):
    """Two-stage clipper at twice the sample rate: the first stage a little asymmetrical (even
    harmonics, like a tube), a filter between the stages, then the cabinet."""
    x = x / np.sqrt(10 ** (potencia_activa(x) / 10))
    u = sobremuestrear(x)
    u = eq(u, *pre, sr=2 * SR)
    u = np.tanh(g1 * (u + 0.12)) - np.tanh(g1 * 0.12)
    u = eq(u, *entre, sr=2 * SR)
    u = np.tanh(g2 * u)
    u = eq(u, *cab, sr=2 * SR)
    return submuestrear(u)


# --- Rendering a round -----------------------------------------------------------------------------

def tocar(P, n_samples):
    """Plays the score into mono stems (and a stereo kit): {name: array}."""
    sintes = dict(gI=nota_guitarra, gD=nota_guitarra, mI=nota_guitarra, mD=nota_guitarra,
                  sol1=nota_solo, sol2=nota_solo, bajo=nota_bajo, org=nota_organo, orgM=nota_organo_solista,
                  gCI=nota_limpia, gCD=nota_limpia)
    stems = {k: np.zeros(n_samples) for k in sintes}
    stems['bat'] = np.zeros((2, n_samples))
    envio_bat = np.zeros((2, n_samples))
    for pista, evs in P.ev.items():
        for e in sorted(evs, key=lambda e: e['b']):
            i0 = int(round(e['b'] * BEAT * SR))
            if pista == 'bat':
                w, pan, rev = golpe(e['m'], e['v'])
                ang = (pan + 1) * np.pi / 4
                g = (np.cos(ang) * np.sqrt(2), np.sin(ang) * np.sqrt(2))
                poner(stems['bat'], i0, w, g)
                poner(envio_bat, i0, w * rev, g)
                continue
            opc = {k: v for k, v in e.items() if k not in ('b', 'd', 'm', 'v')}
            w = sintes[pista](e['m'], e['d'] * BEAT, e['v'], **opc)
            poner(stems[pista], i0, w)
    stems['envio_bat'] = envio_bat
    return stems


# name: (pan, active level dB, reverb send)
MEZCLA = dict(gI=(-0.85, -22.0, 0.10), gD=(0.85, -22.0, 0.10), mI=(-0.7, -26.0, 0.05), mD=(0.7, -26.0, 0.05),
              bajo=(0.0, -22.5, 0.03), org=(0.1, -28.0, 0.2), sol1=(-0.2, -20.0, 0.22), sol2=(0.25, -24.0, 0.22),
              gCI=(-0.55, -25.0, 0.3), gCD=(0.55, -25.0, 0.3), orgM=(-0.05, -26.0, 0.2))
NIVEL_BATERIA = -21.0


def limpia(x):
    """A clean guitar's amp: no clipping to speak of, only a cabinet curve."""
    x = x / np.sqrt(10 ** (potencia_activa(x) / 10))
    return eq(np.tanh(0.8 * x), ('hp', 100, 2), ('pico', 2800, 2.0, 0.8), ('lp', 5800, 3))


def mezclar(P, barras, rt_sala=0.9, informe=True):
    """The whole band: stems through their amps, levelled, panned, sent to one room, glued.
    -> (2, n) at an arbitrary level (the exporter sets it). n = barras * 4 beats."""
    n = int(round(barras * L * BEAT * SR))
    s = tocar(P, n)
    g = dict(pre=(('hp', 110, 2), ('lp', 5200, 2)), entre=(('hp', 160, 1), ('lp', 6000, 2)),
             cab=(('hp', 85, 2), ('pico', 2300, 4.0, 0.7), ('pico', 420, -2.5, 0.8), ('lp', 4700, 3)))
    m = dict(pre=(('hp', 90, 2), ('lp', 3200, 2)), entre=(('hp', 140, 1), ('lp', 4500, 2)),
             cab=(('hp', 85, 2), ('pico', 1500, 3.0, 0.8), ('lp', 3600, 3)))
    l = dict(pre=(('hp', 220, 2), ('lp', 4800, 2)), entre=(('hp', 180, 1), ('lp', 6500, 2)),
             cab=(('hp', 120, 2), ('pico', 1900, 3.5, 0.8), ('pico', 3500, 1.5, 0.5), ('lp', 5600, 3)))
    s['gI'] = amplificar(s['gI'], 3.4, 2.6, **g)
    s['gD'] = amplificar(s['gD'], 3.4, 2.6, **g)
    s['mI'] = amplificar(s['mI'], 5.0, 2.4, **m)
    s['mD'] = amplificar(s['mD'], 5.0, 2.4, **m)
    s['sol1'] = amplificar(s['sol1'], 3.0, 2.2, **l)
    s['sol2'] = amplificar(s['sol2'], 3.0, 2.2, **l)
    # Bass: a little saturation so the upper harmonics carry the pitch on a small speaker.
    b = s['bajo'] / np.sqrt(10 ** (potencia_activa(s['bajo']) / 10))
    b = np.tanh(2.4 * b)
    b = eq(b, ('hp', 38, 2), ('pico', 750, 4.0, 0.7), ('lp', 3300, 2))
    s['bajo'] = compresor(b, -14, 3.0, 0.01, 0.1)
    s['gCI'] = limpia(s['gCI'])
    s['gCD'] = limpia(s['gCD'])
    s['org'] = organo_leslie(s['org'])
    s['orgM'] = organo_leslie(s['orgM'])
    maestro = np.zeros((2, n))
    envio = np.zeros((2, n))
    filas = []
    for k, (pan, nivel, rev) in MEZCLA.items():
        x = s[k]
        x = x * 10 ** ((nivel - potencia_activa(x)) / 20)
        est = x if x.ndim == 2 else panear(x, pan)
        maestro += est
        envio += est * rev
        filas.append((nivel, k))
    bat = s['bat']
    k_b = 10 ** ((NIVEL_BATERIA - potencia_activa(bat)) / 20)
    bat = eq(compresor(bat * k_b, -24, 3.0, 0.004, 0.09), ('alto', 5000, -3.0))
    maestro += bat
    envio += (s['envio_bat'] * k_b) * 1.0
    maestro += reverb(envio, rt_sala)
    # the lows are tamed (a phone plays nothing there and a big speaker would boom) and the upper
    # mids a little scooped, so a background rock leaves room for what is being said over it
    maestro = eq(maestro, ('hp', 32, 2), ('bajo', 100, -3.0), ('pico', 1800, -2.5, 0.9))
    maestro = compresor(maestro, -24, 2.2, 0.01, 0.15)
    # the dynamics of the arrangement (P.nivel): the band swells and sinks along the song
    if P.dina:
        puntos = sorted(P.dina)
        maestro = maestro * db(np.interp(np.arange(n) / (BEAT * SR), [p[0] for p in puntos], [p[1] for p in puntos]))
    maestro = limitador(maestro)
    if informe:
        print('  stems (active level, dB):', ', '.join(f'{k} {v:.0f}' for v, k in filas), f', bat {NIVEL_BATERIA:.0f}')
    return maestro


# --- The street ----------------------------------------------------------------------------------------

def tras_la_puerta(x):
    """The same mix heard from the street: the wall keeps the lows (kick, bass, the guitars' body)
    and some of the mids, none of the highs; nearly mono; a small hall outside. The cut is at
    1.5 kHz, not lower (8 October 2026): a phone's speaker plays almost nothing under 300 Hz, so
    with only the lows the bar was barely heard on one, 10 dB under the stroll."""
    bajo = eq(x, ('lp', 1500, 4))
    medio = eq(x, ('hp', 1500, 2), ('lp', 3200, 2)) * 0.3
    # the synth's mix is brighter in the mids and lighter in the lows than the SoundFont render the street
    # used to hear: this brings the octave bands (<3.2 kHz) within 1 dB of that render's, which is what
    # the volumes of the street were tuned on (docs/JUGABILIDAD.md)
    y = eq(bajo + medio, ('bajo', 170, 3.0), ('pico', 300, 1.5, 0.7), ('pico', 700, -6.5, 1.0), ('alto', 3000, 4.0))
    mono = y.mean(axis=0)
    y = 0.75 * np.stack([mono, mono]) + 0.25 * y
    return y + 0.25 * reverb(y, 0.6, semilla=7)


# --- The dream ---------------------------------------------------------------------------------------

def cubica(x, p):
    """Catmull-Rom interpolation of the ring x at fractional positions p (samples)."""
    n = len(x)
    i = np.floor(p).astype(np.int64)
    f = p - i
    x0, x1, x2, x3 = x[(i - 1) % n], x[i % n], x[(i + 1) % n], x[(i + 2) % n]
    return x1 + 0.5 * f * (x2 - x0 + f * (2 * x0 - 5 * x1 + 4 * x2 - x3 + f * (3 * (x1 - x2) + x3 - x0)))


def cinta(x):
    """Plays the ring x (2, 0.8 N) as a worn tape machine would at 0.8 speed: a slow drift of
    the speed (almost a semitone either way), a wow, a flutter, a different phase on each side."""
    i = np.arange(N, dtype=np.float64)
    out = np.zeros((2, N))
    for c, (fw, ff) in enumerate(((0.4, 1.1), (2.3, 4.0))):
        # position (samples of the input): the integral of the speed (0.8 on average; the drift
        # is 12 turns a round, 0.07 Hz, the wow 93, 0.52 Hz, the flutter 1080, 6.3 Hz)
        T = N / SR
        A_d = VELOCIDAD_SUENO * 0.035 / (2 * np.pi * 12 / T)
        A_w = VELOCIDAD_SUENO * 0.011 / (2 * np.pi * 93 / T)
        A_f = VELOCIDAD_SUENO * 0.004 / (2 * np.pi * 1080 / T)
        p = (VELOCIDAD_SUENO * i + SR * (A_d * np.sin(2 * np.pi * 12 * i / N + 0.3)
                                         + A_w * np.sin(2 * np.pi * 93 * i / N + fw)
                                         + A_f * np.sin(2 * np.pi * 1080 * i / N + ff)))
        out[c] = cubica(x[c], p)
    return out


def coro(x, mezcla=0.45):
    """An ensemble: copies of the signal behind slowly wandering delays, one set per side."""
    t = np.arange(N) / SR
    y = np.zeros_like(x)
    for c in range(2):
        for k, (d0, prof, f, ph) in enumerate(((0.017, 0.004, 0.23, 0.0), (0.024, 0.005, 0.31, 2.1), (0.031, 0.004, 0.17, 4.2))):
            f = lfo_hz(f)
            y[c] += retardo(x[c], (d0 + prof * np.sin(2 * np.pi * f * t + ph + c * 1.7)) * SR) / 3
    return x * (1 - mezcla * 0.5) + y * mezcla


def fasear(x, ciclos=6, mezcla=0.55, etapas=6, lo=250.0, hi=3500.0, frame=2000):
    """A phaser: an all-pass chain whose corner sweeps slowly up and down, added to the dry signal
    (notches wander through the spectrum). Done frame by frame on the ring (STFT, Hann)."""
    hop = frame // 4
    nf = N // hop
    assert nf * hop == N
    w = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(frame) / frame)
    f = np.fft.rfftfreq(frame, 1 / SR)
    out = np.zeros_like(x)
    cent = (np.arange(nf) * hop + frame // 2) / N
    fc = lo * (hi / lo) ** (0.5 - 0.5 * np.cos(2 * np.pi * ciclos * cent))        # 0..1 sweep, exponential
    base = np.arange(frame)
    for c in range(x.shape[0]):
        fcc = fc if c == 0 else np.roll(fc, nf // (2 * ciclos))                   # the sides sweep out of step
        for j in range(nf):
            idx = (j * hop + base) % N
            X = np.fft.rfft(x[c][idx] * w)
            ap = np.exp(-2j * etapas * np.arctan(f / fcc[j]))
            y = np.fft.irfft(X * ((1 - mezcla) + mezcla * ap), frame)
            out[c][idx] += y * w
    return out / 1.5


def eco(x, d_s, fb=0.58, lp=2600, n=7, ondula=0.004):
    """A long tape echo, ping-pong: each repeat is delayed by d_s (wobbling a few ms, like a tape),
    darker than the one before, and goes to the other side. -> the repeats only (2, N)."""
    t = np.arange(N) / SR
    f = lfo_hz(0.5)
    mono = x.mean(axis=0)
    out = np.zeros_like(x)
    rep = mono
    for k in range(1, n + 1):
        rep = retardo(rep, (d_s + ondula * np.sin(2 * np.pi * f * t + k)) * SR)
        rep = eq(rep, ('lp', lp, 2), ('hp', 180, 1)) * fb
        out[k % 2] += rep
        out[(k + 1) % 2] += rep * 0.25
    return out


def octava(x, factor=2.0, grano=4000):
    """Granular pitch shift up (time kept): overlapping Hann grains read `factor` times faster.
    On a ring, so a shimmer made from the tail of the round is also seamless."""
    hop = grano // 4
    assert N % hop == 0
    w = 0.5 - 0.5 * np.cos(2 * np.pi * np.arange(grano) / grano)
    paso = (np.arange(grano) * factor).astype(np.int64)
    y = np.zeros(N)
    base = np.arange(grano)
    for j in range(N // hop):
        y[(j * hop + base) % N] += x[(j * hop + paso) % N] * w
    return y / 2


def sueno(x):
    """The dream's effects on the tape-warped mix x (2, N) -> (2, N)."""
    x = cinta(x)
    x = eq(x, ('lp', 9000, 1))
    pico = np.max(np.abs(x))
    x = pico * np.tanh(1.3 * x / pico)                                                      # tape saturation
    x = coro(x)
    x = fasear(x, ciclos=15, mezcla=0.6)
    beat_sueno = BEAT / VELOCIDAD_SUENO
    ec = eco(x, 1.5 * beat_sueno, fb=0.6)
    seco = x + 1.3 * ec
    # sparkle: the highs ring-modulated by a wandering tone, so they turn glassy and inharmonic
    t = np.arange(N) / SR
    f0 = round(1850 * N / SR) / (N / SR)
    fm = lfo_hz(0.11)
    portadora = np.sin(2 * np.pi * f0 * t + 3 * np.sin(2 * np.pi * fm * t))
    brillo = eq(x, ('hp', 1200, 2), ('lp', 8000, 2)) * portadora
    brillo *= db(-9.0) * np.sqrt(np.mean(x ** 2) / np.mean(brillo ** 2))      # 9 dB under the music
    # the room: long, bright, with an octave up and a fifth up fed in (a shimmer)
    envio = 0.5 * (x + 0.6 * ec)
    sh = np.stack([octava(envio[c]) + 0.6 * octava(envio[c], 1.5) for c in range(2)])
    sala_larga = reverb(envio + 0.28 * sh + 0.6 * brillo, 6.5, semilla=9)
    y = seco + 0.65 * sala_larga + 0.5 * brillo
    pot = lambda a: 10 * np.log10(np.mean(a ** 2) + 1e-12)
    print(f'  dream (dB): dry {pot(x):.1f}, echo {pot(1.3 * ec):.1f}, hall {pot(0.65 * sala_larga):.1f}, glass {pot(0.5 * brillo):.1f}')
    y = eq(y, ('hp', 35, 2), ('alto', 4500, 2.0))
    return compresor(y, -26, 2.5, 0.02, 0.25)


# --- Output ---------------------------------------------------------------------------------------------

def suave(x, g):
    """Gain and a soft knee above 0.7 (never past 0.89): the same samples in, the same out."""
    y = x * g
    a = np.abs(y)
    s = a > 0.7
    y[s] = np.sign(y[s]) * (0.7 + 0.19 * np.tanh((a[s] - 0.7) / 0.19))
    return y


def escribir_wav(ruta, x):
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(x.shape[0])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1).T * 32767).astype('<i2').tobytes())


def lufs(ruta):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', ruta, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    r = r[r.rfind('Summary'):]
    return float(re.search(r'I:\s+(-?[\d.]+) LUFS', r).group(1))


def exportar(x, objetivo, salida, margen=0.5, kbps=96, ar=24000, mono=False):
    """x is one round on a ring (2, N). Loudness to `objetivo` LUFS (measured by ffmpeg on the
    16-bit file), soft knee at -1 dBFS; the MP3 is the round with `margen` seconds of the round
    itself either side, so the game loops between margen and margen + length. With `mono` the
    file has one channel (half the memory once decoded: docs/ESTILO.md, T5.11); the game plays
    it through a panner that gives each side 0.707 of it, so the same LUFS number, measured on
    the mono file, sounds as loud as a stereo file of the same two equal channels."""
    if mono:
        x = x.mean(axis=0, keepdims=True)
    x = x - x.mean(axis=1, keepdims=True)
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    with tempfile.TemporaryDirectory() as d:
        m = int(round(margen * SR))
        for _ in range(4):
            y = suave(x, g)
            trozo = np.concatenate([y[:, -m:], y, y[:, :m]], axis=1)
            ruta = f'{d}/p.wav'
            escribir_wav(ruta, trozo)
            medido = lufs(ruta)
            if abs(medido - objetivo) < 0.08:
                break
            g *= db(objetivo - medido)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ruta, '-ar', str(ar), '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
    paso = np.abs(np.diff(np.concatenate([y, y[:, :1]], axis=1), axis=1))     # every step of the ring, the join included
    print(f'{salida}: {len(trozo[0]) / SR:.2f} s ({y.shape[1] / SR:.6f} s loop), {y.shape[0]} ch, {medido:.1f} LUFS, '
          f'peak {np.max(np.abs(y)):.3f}, join step {np.max(paso[:, -1]):.4f} '
          f'(the ring steps: median {np.median(paso):.4f}, 99.9th percentile {np.percentile(paso, 99.9):.4f}), {os.path.getsize(salida) / 1e3:.0f} kB')
    return y


# LUFS of each version, as the exporter measures it on the 16-bit file (the old files, measured on their MP3s: brio -15.4,
# puerta -14.7, sueno -15.8)
OBJETIVO = dict(brio=-15.0, puerta=-14.3, sueno=-15.5)


def informe_secciones(P, y, velocidad=1.0):
    """Level of each section of the song in the finished ring y (RMS and peak, dBFS)."""
    print('  section                          bars        RMS dB   peak')
    for nombre, b0, b1 in P.secciones:
        a, b = (int(round(v * L * BEAT * SR / velocidad)) for v in (b0, b1))
        trozo = y[:, a:b]
        print(f'  {nombre:<32} {int(b0 + 1):>3}-{int(b1):<3}  {20 * np.log10(np.sqrt(np.mean(trozo ** 2)) + 1e-9):7.1f}  {20 * np.log10(np.max(np.abs(trozo)) + 1e-9):6.1f}')


if __name__ == '__main__':
    modo = sys.argv[1] if len(sys.argv) > 1 else 'brio'
    salida = sys.argv[2] if len(sys.argv) > 2 else None
    if modo == 'brio':
        P, barras = ronda_completa()
        x = mezclar(P, barras)
        assert x.shape[1] == N
        informe_secciones(P, exportar(x, OBJETIVO['brio'], salida or 'brio.mp3'))
    elif modo == 'puerta':
        P, barras = ronda_completa()
        x = mezclar(P, barras)
        assert x.shape[1] == N
        # one channel, and at the same LUFS the street was tuned on: 3 dB more in the file than each side of a
        # stereo file (the game's panner gives a mono source 0.707 per side), so the peaks are held down a little
        calle = limitador(tras_la_puerta(x).mean(axis=0, keepdims=True), 11.0)
        informe_secciones(P, exportar(calle, OBJETIVO['puerta'], salida or 'bar-puerta.mp3', mono=True))
    elif modo == 'sueno':
        P, barras = ronda_sueno()
        x = mezclar(P, barras, rt_sala=0.9)
        assert x.shape[1] == int(round(VELOCIDAD_SUENO * N))
        informe_secciones(P, exportar(sueno(x), OBJETIVO['sueno'], salida or 'brio-sueno.mp3'), VELOCIDAD_SUENO)
    else:
        sys.exit('python3 brio.py brio|puerta|sueno [salida]')
