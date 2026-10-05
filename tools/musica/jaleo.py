# «Jaleo»: a frantic big band for the minigames, in the LucasArts jazz family of the main theme.
# G minor, 200 bpm, swung. The floor toms pound «boom, ba-da boom» like a thirties swing drummer,
# a clarinet riff screams up and down a minor blues (G minor, C minor, E flat seven, D seven),
# the brass shout back in block chords, trumpets and clarinet trade two-bar calls, the saxes take
# the riff with the clarinet wailing on top, and the toms get a break of their own.
#
#   python3 jaleo.py          listening version: intro, twice round, ending  -> jaleo.mp3
#   python3 jaleo.py bucle    the round three times, cut for a seamless loop -> jaleo-bucle.mp3
import random
import sys
from orquesta import Orquesta, tocar, walking, comping
from sinte import frase, revisa, acorde, acorde_en, tonos, midi, exportar, exportar_bucle

BPM = 200
O = Orquesta(BPM, swing=0.6, semilla=41, sala=1.2)
CLAR = O.instrumento(0, 'clarinete', 71, vol=3, pan=0.0, reverb=0.22, hp=150)
TPTA = O.instrumento(1, 'trompetas', 56, vol=-2, pan=0.25, reverb=0.22, hp=150)
TBN = O.instrumento(2, 'trombones', 57, vol=-7, pan=-0.25, reverb=0.22, hp=80)
SAXA = O.instrumento(3, 'saxo alto', 65, vol=0, pan=-0.35, reverb=0.2, hp=120)
SAXT = O.instrumento(4, 'saxo tenor', 66, vol=0, pan=0.35, reverb=0.2, hp=90)
PIANO = O.instrumento(5, 'piano', 0, vol=2, pan=-0.45, reverb=0.15, hp=110)
BAJO = O.instrumento(6, 'contrabajo', 32, vol=-3, reverb=0.05, lp=3000)
BAT = O.instrumento(9, 'batería', 32, vol=0, reverb=0.14, comp=(-22, 2.5))
L = 4

ACORDES_A = [['Gm'], ['Gm'], ['Cm'], ['Gm'], ['Eb7'], ['D7'], ['Gm'], ['D7']]
RIFF = frase('G4:2 Bb4:2 C5:2 D5:4 C5:2 Bb4:2 G4:2 | Bb4:2 G4:4 -:2 D5:2 F5:2 G5:4 | C5:2 Eb5:2 F5:2 G5:4 F5:2 Eb5:2 C5:2 | D5:2 Bb4:4 -:2 G4:2 A4:2 Bb4:4 |'
             'G5:2 F5:2 Eb5:2 Db5:4 Bb4:2 G4:2 Eb4:2 | F#5:2 A5:2 C6:4 A5:2 F#5:2 D5:4 | G5:4 D5:2 Bb4:2 G4:4 -:4 | A4:2 C5:2 D5:2 F#5:2 A5:4 -:4')
ACORDES_B = [['Cm7'], ['Cm7'], ['Gm'], ['Gm'], ['D7'], ['Eb7'], ['D7'], ['D7']]
GRITO = frase('G5:2 G5:4 Eb5:2 -:4 G5:4 | F5:2 G5:2 Eb5:2 C5:2 -:8 | D5:2 D5:4 Bb4:2 -:4 D5:4 | C5:2 D5:2 Bb4:2 G4:2 -:8 |'
              'F#5:4 A5:4 C6:4 A5:4 | G5:4 Bb5:4 Db6:4 Bb5:4 | A5:2 F#5:2 D5:2 C5:2 A4:4 F#4:4 | D5:2 -:14')
ACORDES_C = [['Cm'], ['Cm'], ['Gm'], ['Gm'], ['Ab7'], ['D7'], ['Gm'], ['D7']]
LLAMADA = frase('C5:2 Eb5:2 G5:4 -:8 | Bb5:2 G5:2 Eb5:4 -:8 | -:16 | -:16 | Eb5:2 Gb5:2 Ab5:4 -:8 | -:16 | D6:4 Bb5:4 G5:4 D5:4 | -:16')
RESPUESTA = frase('-:16 | -:16 | -:4 D6:2 Bb5:2 G5:4 -:4 | F5:2 G5:2 Bb5:2 D6:2 G5:4 -:4 | -:16 | -:8 F#5:2 A5:2 C6:4 | D6:4 Bb5:4 G5:4 D5:4 |'
                  'C#5:2 D5:2 F#5:2 A5:2 D6:4 -:4')
GEMIDO = frase('D6:16 | Bb5:8 D6:8 | Eb6:16 | D6:16 | Db6:16 | C6:16 | Bb5:8 A5:4 G5:4 | A5:8 F#5:8')


def bloque(t0, notas, acordes, vel=108):
    """Block chords under a top line: four close voices (trumpets on the top two, trombones on the
    other two). A note outside the chord is doubled an octave down instead."""
    for b, d, m, *_ in notas:
        ch = acorde_en(acordes, b)
        r, iv = acorde(ch)
        pcs_ = {(r + i) % 12 for i in iv}
        if m % 12 in pcs_:
            abajo = [x for x in range(m - 1, m - 12, -1) if x % 12 in pcs_][:3]
            voces = [m] + abajo
        else:
            voces = [m, m - 12]
        acento = 8 if b % 1 == 0 else 0
        O.nota(TPTA, t0 + b, d, voces[0], vel + acento, legato=0.85, humano=0.006)
        O.nota(TPTA, t0 + b, d, voces[1], vel - 8 + acento, legato=0.85, humano=0.006)
        for v in voces[2:]:
            O.nota(TBN, t0 + b, d, v, vel - 6 + acento, legato=0.85, humano=0.006)


def toms(t0, compases, vel=96):
    """«Boom, ba-da boom»: floor tom on every beat, swung pickups, kick under one and three."""
    for c in range(compases):
        b0 = t0 + c * L
        for b, nota, v in ((0, 41, vel + 14), (1, 41, vel), (1.5, 43, vel - 14), (2, 41, vel + 10), (3, 41, vel), (3.5, 43, vel - 14)):
            O.nota(9, b0 + b, 0.5, nota, v, humano=0.004)
        O.nota(9, b0, 0.5, 36, vel - 4, humano=0.003)
        O.nota(9, b0 + 2, 0.5, 36, vel - 10, humano=0.003)
        O.nota(9, b0 + 1, 0.5, 44, vel - 20, humano=0.003)
        O.nota(9, b0 + 3, 0.5, 44, vel - 20, humano=0.003)


def swing(t0, compases, vel=92, golpes=None):
    """Ride and hi-hat foot, the snare kicking the brass hits."""
    for c in range(compases):
        b0 = t0 + c * L
        for b in range(L):
            O.nota(9, b0 + b, 0.5, 51, vel - (4 if b % 2 else 12), humano=0.003)
            if b % 2:
                O.nota(9, b0 + b + 0.5, 0.5, 51, vel - 24, humano=0.003)
                O.nota(9, b0 + b, 0.5, 44, vel - 16, humano=0.003)
    for b, d, m, *_ in golpes or []:
        if d >= 0.5:
            O.nota(9, t0 + b, 0.5, 38, vel + 10, humano=0.003)
            if b % 2 == 0:
                O.nota(9, t0 + b, 0.5, 36, vel + 6, humano=0.003)


def fondo_saxos(t0, acordes, vel=70):
    """Saxes holding the chord's third and seventh (or fifth) under the riff."""
    for i, cs in enumerate(acordes):
        ch = cs[0]
        notas = tonos(ch, 'G3', 'F4')
        O.nota(SAXT, t0 + i * L, L, notas[0], vel, legato=0.95, humano=0.004)
        O.nota(SAXA, t0 + i * L, L, notas[-1], vel, legato=0.95, humano=0.004)


def ritmica(t, acordes, semilla):
    walking(O, BAJO, t, acordes, semilla=semilla, vel=96)
    comping(O, PIANO, t, acordes, semilla=semilla, vel=72)


def ronda(t):
    random.seed(41)
    # A: the clarinet's riff over the toms, the saxes underneath.
    ritmica(t, ACORDES_A, 1)
    toms(t, 8)
    tocar(O, CLAR, t, RIFF, 104, legato=0.8)
    fondo_saxos(t, ACORDES_A)
    t += 8 * L
    # B: the brass shout, the drums kick the hits.
    ritmica(t, ACORDES_B, 2)
    swing(t, 8, golpes=GRITO)
    O.nota(9, t, 1, 49, 116)
    bloque(t, GRITO, ACORDES_B)
    t += 8 * L
    # C: trumpets call, the clarinet answers, all together in bar seven.
    ritmica(t, ACORDES_C, 3)
    swing(t, 8)
    O.nota(9, t, 1, 49, 110)
    bloque(t, LLAMADA, ACORDES_C, vel=104)
    tocar(O, CLAR, t, RESPUESTA, 104, legato=0.8)
    t += 8 * L
    # A': the saxes take the riff in octaves, the clarinet wails long notes on top, trumpets stab.
    ritmica(t, ACORDES_A, 4)
    toms(t, 8, vel=102)
    tocar(O, SAXA, t, RIFF, 100, legato=0.8)
    tocar(O, SAXT, t, RIFF, 96, oct=-1, legato=0.8)
    tocar(O, CLAR, t, GEMIDO, 98, oct=0, legato=0.95, acento=0)
    for i, cs in enumerate(ACORDES_A):
        v = tonos(cs[0], 'Bb4', 'Bb5')[:3]
        for b in (1.5, 3.5):
            O.acorde(TPTA, t + i * L + b, 0.5, v, 96, rasgueo=0, legato=0.6, humano=0.005)
    t += 8 * L
    # Break: the toms alone, louder, rolling round the kit into the top.
    for c in range(2):
        for k in range(8):
            O.nota(9, t + c * L + k * 0.5, 0.5, (41, 43, 45, 47, 48, 47, 45, 43)[k] if c else 41, 100 + k * 2 + c * 8, humano=0.003)
        O.nota(9, t + c * L, 0.5, 36, 110)
    walking(O, BAJO, t, [['D7'], ['D7']], semilla=5, vel=90)
    return t + 2 * L


RONDA = 34 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('jaleo-bucle', O.render(hasta=t, pegamento=(-16, 2)), RONDA * 60 / BPM, rms_db=-17, fundir=True)
    sys.exit()

if __name__ == '__main__':
    revisa('riff', RIFF, ACORDES_A)
    revisa('grito', GRITO, ACORDES_B)
    revisa('llamada', LLAMADA, ACORDES_C)
    revisa('respuesta', RESPUESTA, ACORDES_C)
    revisa('gemido', GEMIDO, ACORDES_A)

# Intro: the toms alone for two bars.
toms(0, 2, vel=100)
t = ronda(2 * L)
t = ronda(t)
# Ending: the riff's first bar, then the big band's last chord, a G minor sixth, and a cymbal.
ritmica(t, [['Gm']], 6)
toms(t, 1)
tocar(O, CLAR, t, frase('G4:2 Bb4:2 C5:2 D5:4 C5:2 Bb4:2 G4:2'), 104)
t += L
for canal, notas in ((TPTA, ('D5', 'G5')), (TBN, ('Bb3', 'E4')), (SAXA, ('Bb4',)), (SAXT, ('G3',))):
    O.acorde(canal, t, 3, [midi(x) for x in notas], 112, rasgueo=0, legato=1)
O.nota(CLAR, t, 3, 'G6', 104, legato=1)
O.nota(BAJO, t, 2, 'G1', 104, legato=1)
O.acorde(PIANO, t, 2, [midi(x) for x in ('G2', 'D3', 'Bb3', 'E4', 'G4')], 96, rasgueo=0.03, legato=1)
O.nota(9, t, 2, 49, 120)
O.nota(9, t, 1, 41, 120)
O.nota(9, t, 1, 36, 120)
exportar('jaleo', O.render(pegamento=(-16, 2)), rms_db=-17, fundido=1.0)
