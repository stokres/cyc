# The farm polka for banjo, bluegrass style: Guille's radio and the pig minigame.
# The banjo carries the tune inside rolls of sixteenths (tune note, chord tones, the high
# drone string), a guitar «boom-chick» with a bluegrass run into each new round, upright
# bass on the beats, a fiddle backing it up. Same tune and trio as polka.py.
#
#   python3 banjo.py radio    132 bpm: the radio in the barn          -> banjo-radio.mid
#   python3 banjo.py cerdos   168 bpm, brushes, cowbell, twin fiddle and pig grunts -> banjo-cerdos.mid
# Both are three identical rounds for bucle.py; the round's length in seconds is printed.
import random
import sys
from partitura import Pieza, n
from comun import pcs, cercana, debajo
import polka

MODO = sys.argv[1] if len(sys.argv) > 1 else 'radio'
CERDOS = MODO == 'cerdos'
BPM = 168 if CERDOS else 132
P = Pieza(bpm=BPM, swing=0.5, semilla=101)
BANJO, GUIT, BAJO, VIOLIN, TBN, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(BANJO, 105, 124, 58, 30), (GUIT, 25, 84, 40, 28), (BAJO, 32, 70, 64, 18), (VIOLIN, 40, 96, 82, 36),
                               (TBN, 57, 70, 74, 30), (BAT, 0, 100, 64, 22)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
P.rango_bend(TBN, 12)
L = 2
A = polka.A
RAIZ = polka.RAIZ

def acorde_en(acordes, i, b):
    cs = acordes[i]
    return cs[0] if b < 1 or len(cs) == 1 else cs[1]

def dron(ch):
    """The banjo's short fifth string: D5 where it fits, else the chord tone nearest it."""
    return min((x for x in range(n('A4'), n('G5')) if x % 12 in A[ch]), key=lambda x: (abs(x - n('D5')), x))

def rodar(c0, tema, acordes, vel=96):
    """Banjo rolls: per beat, four sixteenths built round the tune."""
    for i, compas in enumerate(tema):
        for b in range(L):
            ch = acorde_en(acordes, i, b)
            en_tiempo = [(bb, d, (n(x) if isinstance(x, str) else x)) for (bb, d, x) in compas if b <= bb < b + 1]
            sonando = [(bb, d, (n(x) if isinstance(x, str) else x)) for (bb, d, x) in compas if bb < b and bb + d > b]
            d = dron(ch)
            if len(en_tiempo) >= 2:
                m1, m2 = en_tiempo[0][2], en_tiempo[1][2]
                notas = [(m1, vel), (d, 54), (m2, vel - 6), (debajo(m2, A[ch]), 60)]
            elif en_tiempo or sonando:
                m = (en_tiempo or sonando)[0][2]
                fuerte = bool(en_tiempo)
                c1 = debajo(m, A[ch])
                notas = [(m, vel if fuerte else vel - 22), (c1, 62), (d, 54), (debajo(c1, A[ch]), 58)]
            else:
                tonos = sorted(x for x in range(n('D4'), n('D5')) if x % 12 in A[ch])
                notas = [(tonos[0], 64), (tonos[1], 58), (d, 54), (tonos[-1], 58)]
            for k, (x, v) in enumerate(notas):
                P.nota(BANJO, c0 + i * L + b + k * 0.25, 0.5, x, v, legato=1)

def boom_chick(c0, acordes, vel=74, carrera=True):
    for i, cs in enumerate(acordes):
        for b in range(L):
            ch = acorde_en(acordes, i, b)
            r = n(RAIZ[ch]) + 12
            P.nota(GUIT, c0 + i * L + b, .5, r if b == 0 else r + 7 - (12 if r + 7 > n('A2') + 12 else 0), vel + 4, legato=0.8)
            voz = sorted(x for x in range(n('D3'), n('D4')) if x % 12 in A[ch])[:3]
            P.acorde(GUIT, c0 + i * L + b + 0.5, .5, voz, vel - 10, rasgueo=0.01, legato=0.35)
            P.nota(BAJO, c0 + i * L + b, 1, n(RAIZ[ch]) if b == 0 else n(RAIZ[ch]) + 7 - (12 if n(RAIZ[ch]) + 7 > n('C3') else 0), 92, legato=0.75)
    if carrera:
        # The bluegrass run into the next round (the «G run», in D), in the last two bars.
        fin = c0 + (len(acordes) - 2) * L
        for k, x in enumerate(['A2', 'B2', 'C3', 'C#3', 'D3', 'A2', 'F#2', 'D2']):
            P.nota(GUIT, fin + k * 0.5, .5, x, 88, legato=0.85)

def violin_apoyo(c0, acordes, vel=58):
    """Fiddle backup: one long chord tone a bar, moving as little as it can."""
    prev = n('F#4')
    for i, cs in enumerate(acordes):
        prev = cercana(prev, A[cs[0]], 'D4', 'D5')
        P.nota(VIOLIN, c0 + i * L, 2, prev, vel, legato=0.98)

def violin_tema(c0, tema, vel=70, oct=0):
    for i, compas in enumerate(tema):
        for (b, d, x) in compas:
            P.nota(VIOLIN, c0 + i * L + b, d, (n(x) if isinstance(x, str) else x) + 12 * oct, vel + (6 if b % 1 == 0 else 0), legato=0.9)

def tren(c0, compases):
    """Pig version: brushes like a train (accents off the beat), cowbell every other bar."""
    for i in range(compases):
        for k in range(8):
            P.nota(BAT, c0 + i * L + k * 0.25, .25, 38, 56 if k % 2 else 34, humano=0.003)
        P.nota(BAT, c0 + i * L, .5, 36, 72)
        P.nota(BAT, c0 + i * L + 1, .5, 36, 58)
        if i % 2 == 1:
            P.nota(BAT, c0 + i * L + 1.5, .25, 56, 66)

def gruñido(beat, nota='D3'):
    P.glis(TBN, beat, 0.22, n(nota) - 2, n(nota) + 3, 80, curva=0.6)
    P.glis(TBN, beat + 0.3, 0.3, n(nota) + 1, n(nota) - 5, 72, curva=1.5)

TEMA_T = [[(b, d, n(x)) for (b, d, x) in c] for c in polka.TEMA_T]

def vuelta(t):
    # A: banjo alone with guitar and bass (pig version: the brushes from the start).
    rodar(t, polka.TEMA_A, polka.ACORDES_A)
    boom_chick(t, polka.ACORDES_A, carrera=False)
    if CERDOS:
        tren(t, 16)
        gruñido(t + 7 * L + 1)
    t += 16 * L
    # A again: the fiddle backs it up (pig version: the fiddle plays the tune with the banjo).
    rodar(t, polka.TEMA_A, polka.ACORDES_A, vel=100)
    boom_chick(t, polka.ACORDES_A, carrera=False)
    if CERDOS:
        tren(t, 16)
        violin_tema(t, polka.TEMA_A, vel=66, oct=-1)
        gruñido(t + 15 * L + 1, 'A2')
    else:
        violin_apoyo(t, polka.ACORDES_A)
    t += 16 * L
    # Trio in G: the banjo on the trio's tune, the fiddle's counter-line.
    rodar(t, TEMA_T, polka.ACORDES_T)
    boom_chick(t, polka.ACORDES_T, carrera=False)
    violin_apoyo(t, polka.ACORDES_T, vel=62)
    if CERDOS:
        tren(t, 16)
    t += 16 * L
    # A to round off, the fiddle in unison an octave down, and the run back to the start.
    rodar(t, polka.TEMA_A, polka.ACORDES_A, vel=102)
    boom_chick(t, polka.ACORDES_A, carrera=True)
    violin_tema(t, polka.TEMA_A, vel=62 if not CERDOS else 70, oct=-1)
    if CERDOS:
        tren(t, 16)
        gruñido(t + 7 * L + 1)
    return t + 16 * L

t = 0.0
for _ in range(3):
    random.seed(101)
    t = vuelta(t)
P.guardar(f'banjo-{MODO}.mid')
print(round(t / 3 * 60 / BPM, 6))
