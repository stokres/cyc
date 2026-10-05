# «Dándole vueltas»: curious, tiptoeing music for puzzles, in the manner of Day of the Tentacle.
# E minor, straight eighths. Pizzicato strings walk on tiptoe (root, fifth, octave, fifth), a
# woodblock ticks like a clock that is thinking, the bassoon picks its way up each chord with a
# chromatic step before the top (A sharp to B, D sharp to E), the clarinet takes it over with the
# bassoon down in the bass, a sunnier middle in G on flute and xylophone, celesta sparkles.
# Light and cheeky rather than spooky. 112 bpm.
#
#   python3 vueltas.py          listening version: intro, twice round, ending  -> vueltas.mp3
#   python3 vueltas.py bucle    the round three times, cut for a seamless loop -> vueltas-bucle.mp3
import random
import sys
from orquesta import Orquesta, tocar, raiz_en
from sinte import frase, revisa, acorde, acorde_en, tonos, midi, exportar, exportar_bucle

BPM = 112
O = Orquesta(BPM, swing=0.5, semilla=12, sala=1.3)
FAG = O.instrumento(0, 'fagot', 70, vol=0, pan=0.2, reverb=0.2, hp=60)
CLAR = O.instrumento(1, 'clarinete', 71, vol=0, pan=-0.15, reverb=0.22, hp=120)
FLAU = O.instrumento(2, 'flauta', 73, vol=-5, pan=0.1, reverb=0.28, hp=200)
XILO = O.instrumento(3, 'xilófono', 13, vol=2, pan=-0.3, reverb=0.25, hp=200)
PIZZ = O.instrumento(4, 'pizzicato', 45, vol=2, pan=-0.1, reverb=0.18)
CELE = O.instrumento(5, 'celesta', 8, vol=-1, pan=0.35, reverb=0.35, hp=200)
CUER = O.instrumento(6, 'cuerdas', 49, vol=-4, reverb=0.4, hp=150)
BAT = O.instrumento(9, 'percusión', 40, vol=0, pan=0.25, reverb=0.15)
L = 4

ACORDES_A = [['Em'], ['Em'], ['Am6'], ['Am6'], ['C7'], ['B7'], ['Em'], ['B7']]
TEMA_A = frase('E3:2 -:2 G3:2 -:2 B3:2 -:2 A#3:2 B3:2 | C4:2 B3:2 -:2 G3:2 E3:4 -:4 | A3:2 -:2 C4:2 -:2 E4:2 -:2 D#4:2 E4:2 | F#4:2 E4:2 -:2 C4:2 A3:4 -:4 |'
               'G4:2 E4:2 C4:2 E4:2 Bb4:4 G4:4 | A4:2 F#4:2 D#4:2 F#4:2 A4:4 -:4 | G4:2 F#4:2 E4:2 D#4:2 E4:2 B3:2 G3:2 E3:2 | F#3:4 A3:4 D#4:4 -:4')
ACORDES_B = [['G'], ['E7'], ['Am'], ['D7'], ['G'], ['C'], ['F#m7b5', 'B7'], ['Em']]
TEMA_B = frase('D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | E5:2 G#5:2 B5:4 D6:4 B5:4 | C6:4 A5:2 E5:2 A5:8 | F#5:2 A5:2 C6:4 B5:2 A5:2 F#5:4 |'
               'G5:2 B5:2 D6:4 C6:2 B5:2 G5:4 | E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 | A5:4 C6:4 B5:4 D#5:4 | E5:8 -:8')


def puntillas(t0, acordes, vel=86, staccato=0.35):
    """Pizzicato on tiptoe: root, fifth, octave, fifth, in quarters."""
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            mitad = L // len(cs)
            r = raiz_en(ch, 'E2', 'D#3')
            r5 = next(x for x in range(r + 1, r + 12) if x % 12 in {(acorde(ch)[0] + iv) % 12 for iv in acorde(ch)[1][2:3]})
            for k, m in enumerate((r, r5, r + 12, r5)[:mitad]):
                O.nota(PIZZ, t0 + i * L + j * mitad + k, 1, m, vel + (8 if k == 0 else 0), legato=staccato, humano=0.008)


def tictac(t0, compases, vel=70):
    """The woodblock: tick on the beats, a lower tock on two and four, now and then an extra tick."""
    for c in range(compases):
        for b in range(L):
            O.nota(9, t0 + c * L + b, 0.5, 77 if b % 2 else 76, vel - (14 if b % 2 == 0 else 0), humano=0.004)
        if c % 4 == 3:
            O.nota(9, t0 + c * L + 3.5, 0.5, 76, vel - 18, humano=0.004)


def chispas(t0, acordes, compases=(3, 7), vel=72):
    """Celesta: a little arpeggio up in the bars where the tune rests."""
    for c in compases:
        ch = acordes[c][0]
        for k, m in enumerate(tonos(ch, 'E5', 'E6')[:4]):
            O.nota(CELE, t0 + c * L + 2 + k * 0.5, 1.5, m, vel + k * 3)


def colchon(t0, acordes, vel=54):
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            notas = tonos(ch, 'G3', 'F#4')[:3]
            O.acorde(CUER, t0 + i * L + j * L / len(cs), L / len(cs), notas, vel, rasgueo=0, legato=1.0, humano=0.004)


def ronda(t):
    random.seed(12)
    # A: the bassoon on tiptoe over the pizzicato and the clock.
    puntillas(t, ACORDES_A)
    tictac(t, 8)
    tocar(O, FAG, t, TEMA_A, 92, legato=0.45)
    chispas(t, ACORDES_A)
    t += 8 * L
    # A': the clarinet an octave up, the bassoon down with the pizzicato.
    puntillas(t, ACORDES_A)
    tictac(t, 8)
    tocar(O, CLAR, t, TEMA_A, 90, oct=1, legato=0.5)
    for i, (ch, *_) in enumerate(ACORDES_A):
        O.nota(FAG, t + i * L, 1, raiz_en(ch, 'E2', 'D#3'), 80, legato=0.4)
        O.nota(FAG, t + i * L + 2, 1, raiz_en(ch, 'E2', 'D#3') + 7, 74, legato=0.4)
    chispas(t, ACORDES_A, compases=(1, 3, 7))
    t += 8 * L
    # B: sunnier, in G: flute and xylophone together, strings underneath, the clock goes on.
    puntillas(t, ACORDES_B, vel=80, staccato=0.5)
    tictac(t, 8, vel=62)
    tocar(O, FLAU, t, TEMA_B, 88, legato=0.8)
    tocar(O, XILO, t, TEMA_B, 84, legato=0.8)
    colchon(t, ACORDES_B)
    t += 8 * L
    # A'': bassoon and clarinet two octaves apart, the strings holding, celesta at the ends.
    puntillas(t, ACORDES_A)
    tictac(t, 8)
    tocar(O, FAG, t, TEMA_A, 94, legato=0.45)
    tocar(O, CLAR, t, TEMA_A, 84, oct=2, legato=0.5)
    colchon(t, ACORDES_A, vel=48)
    chispas(t, ACORDES_A)
    return t + 8 * L


RONDA = 32 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('vueltas-bucle', O.render(hasta=t), RONDA * 60 / BPM, rms_db=-19, fundir=True)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)

# Intro: the clock alone, then the pizzicato.
tictac(0, 2)
puntillas(L, [['Em']])
t = ronda(2 * L)
t = ronda(t)
# Ending: the bassoon's first bar, a pause, and a plink.
tictac(t, 1)
puntillas(t, [['Em']])
tocar(O, FAG, t, frase('E3:2 -:2 G3:2 -:2 B3:2 -:2 A#3:2 B3:2'), 92, legato=0.45)
t += L + 1
O.nota(FAG, t, 1, 'E2', 96, legato=0.3)
O.nota(PIZZ, t, 1, 'E2', 100, legato=0.3)
O.nota(CELE, t, 2, 'E6', 80)
O.nota(9, t, 0.5, 76, 80)
exportar('vueltas', O.render(), rms_db=-19, fundido=1.0)
