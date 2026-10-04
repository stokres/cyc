# «Galop del lío»: for the minigames. A circus/cartoon chase galop: xylophone racing along,
# strings and tuba going «um-pa», brass stabs, snare in eighths, a slide whistle that goes up
# and comes down, and a «ta-dá!». C major (the middle part in A minor), 152 bpm, 2/4.
#
#   python3 galop.py          the piece, with its fanfare and «ta-dá!»   -> galop-del-lio.mid
#   python3 galop.py bucle    the body three times, identical, for a seamless loop (bucle.py)
#                             -> galop-bucle.mid, and the loop's length in seconds on stdout
import random
import sys
from partitura import Pieza, n
from comun import pcs, tocar, cercana

P = Pieza(bpm=152, swing=0.5, semilla=47)
XILO, PICC, CUER, METAL, TUBA, SILB, BAT = 0, 1, 2, 3, 4, 5, 9
for c, prog, vol, pan, rev in [(XILO, 13, 124, 58, 36), (PICC, 72, 76, 42, 40), (CUER, 48, 122, 80, 40), (METAL, 61, 86, 70, 34),
                               (TUBA, 58, 92, 64, 22), (SILB, 78, 84, 50, 45), (BAT, 0, 94, 64, 26)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
P.rango_bend(SILB, 12)
L = 2

A = {k: pcs(v) for k, v in {
    'C': ['C', 'E', 'G'], 'G7': ['G', 'B', 'D', 'F'], 'C7': ['C', 'E', 'G', 'Bb'], 'F': ['F', 'A', 'C'],
    'F#o': ['F#', 'A', 'C', 'Eb'], 'A7': ['A', 'C#', 'E', 'G'], 'D7': ['D', 'F#', 'A', 'C'],
    'Am': ['A', 'C', 'E'], 'E7': ['E', 'G#', 'B', 'D']}.items()}
RAIZ = {'C': 'C2', 'G7': 'G1', 'C7': 'C2', 'F': 'F1', 'F#o': 'F#1', 'A7': 'A1', 'D7': 'D2', 'Am': 'A1', 'E7': 'E2'}

ACORDES_A = [['C'], ['C'], ['G7'], ['G7'], ['G7'], ['G7'], ['C'], ['C'],
             ['C'], ['C7'], ['F'], ['F#o'], ['C'], ['A7'], ['D7', 'G7'], ['C']]
def ocho(*notas):
    return [(k * 0.5, 0.5, x) for k, x in enumerate(notas) if x]
TEMA_A = [
    ocho('G5', 'E5', 'G5', 'E5'), ocho('G5', 'C6', 'E6', 'C6'), ocho('F5', 'D5', 'F5', 'D5'), ocho('F5', 'G5', 'B5', 'D6'),
    ocho('D5', 'B4', 'D5', 'G5'), ocho('F5', 'D5', 'B4', 'G4'), ocho('C5', 'E5', 'G5', 'C6'), ocho('E6', None, 'C6', None),
    ocho('G5', 'E5', 'G5', 'E5'), ocho('Bb5', 'G5', 'Bb5', 'G5'), ocho('A5', 'F5', 'A5', 'C6'), ocho('Eb6', 'C6', 'A5', 'F#5'),
    ocho('G5', 'E5', 'C5', 'E5'), ocho('A5', 'G5', 'E5', 'C#5'), ocho('D5', 'F#5', 'F5', 'B4'), [(0, 1, 'C5')],
]
ACORDES_B = [['Am'], ['Am'], ['E7'], ['E7'], ['Am'], ['Am'], ['E7'], ['Am', 'G7']]
TEMA_B = [
    ocho('A5', 'B5', 'C6', 'A5'), ocho('E5', 'C5', 'E5', 'A5'), ocho('G#5', 'E5', 'B5', 'G#5'), ocho('D6', 'B5', 'G#5', 'E5'),
    ocho('A5', 'C6', 'E6', 'C6'), ocho('A5', 'E5', 'C5', 'A4'), ocho('B4', 'D5', 'E5', 'G#5'), ocho('A5', None, 'G5', None),
]

def acorde_en(acordes, i, b):
    cs = acordes[i]
    return cs[min(int(b // (L / len(cs))), len(cs) - 1)]

def revisa(nombre, tema, acordes):
    """Strict: every note on a beat must be a chord tone (fast tunes have no time to clash off it)."""
    malas = [f'compás {i + 1}, tiempo {b + 1}: {t}' for i, c in enumerate(tema) for (b, d, t) in c
             if b % 1 == 0 and n(t) % 12 not in A[acorde_en(acordes, i, b)]]
    print(f'{nombre}: notas en el tiempo fuera del acorde:', malas or 'ninguna')

def um_pa(c0, acordes, vel=86):
    for i in range(len(acordes)):
        for b in range(L):
            ch = acorde_en(acordes, i, b)
            r = n(RAIZ[ch])
            P.nota(TUBA, c0 + i * L + b, .5, r if b == 0 else r + 7 - (12 if r + 7 > n('C3') else 0), vel, legato=0.6)
            voz = sorted(x for x in range(n('E4'), n('E5')) if x % 12 in A[ch])[:3]
            P.acorde(CUER, c0 + i * L + b + 0.5, .5, voz, vel - 18, rasgueo=0, legato=0.35)

def caja(c0, compases, crash=True):
    for i in range(compases):
        for k in range(4):
            P.nota(BAT, c0 + i * L + k * 0.5, .25, 38, 64 if k % 2 == 0 else 40, humano=0.003)
        P.nota(BAT, c0 + i * L, .5, 36, 84)
        P.nota(BAT, c0 + i * L + 1, .5, 36, 66)
    if crash:
        P.nota(BAT, c0, 1, 49, 96)

def contracanto(c0, acordes, vel=70):
    prev = n('E4')
    for i in range(len(acordes)):
        prev = cercana(prev, A[acordes[i][0]], 'G3', 'G4')
        P.nota(METAL, c0 + i * L, 2, prev, vel, legato=0.95)

def silbato(beat, sube=True):
    if sube:
        P.glis(SILB, beat, 0.9, 'C5', 'C6', 96, curva=0.8)
    else:
        P.glis(SILB, beat, 1.1, 'C6', 'C5', 92, curva=1.4)

BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

def cuerpo(t, fin_al_principio=False):
    """A, A with counter-line, B twice, A with everything. Returns where it ends."""
    # A: the xylophone.
    um_pa(t, ACORDES_A)
    caja(t, 16)
    tocar(P, XILO, t, TEMA_A, L, 112, acento=10, legato=0.7)
    P.acorde(METAL, t + 7 * L + 0.5, .25, ['E4', 'G4', 'C5'], 92, rasgueo=0, legato=0.5)   # the stabs in bar 8's gaps
    P.acorde(METAL, t + 7 * L + 1.5, .25, ['E4', 'G4', 'C5'], 96, rasgueo=0, legato=0.5)
    silbato(t + 15 * L + 1)
    t += 16 * L
    # A again: the brass sing a counter-line under it, the piccolo doubles the tune.
    um_pa(t, ACORDES_A)
    caja(t, 16)
    tocar(P, XILO, t, TEMA_A, L, 116, acento=10, legato=0.7)
    tocar(P, PICC, t, TEMA_A, L, 62, legato=0.6)
    contracanto(t, ACORDES_A)
    P.acorde(METAL, t + 15 * L + 1, .5, ['B3', 'D4', 'F4', 'G4'], 100, rasgueo=0, legato=0.5)
    t += 16 * L
    # B: A minor, the chase; second time the strings take the tune an octave down.
    for vuelta in range(2):
        um_pa(t, ACORDES_B, vel=80)
        caja(t, 8, crash=vuelta == 0)
        tocar(P, XILO, t, TEMA_B, L, 110, acento=10, legato=0.7)
        if vuelta:
            tocar(P, CUER, t, TEMA_B, L, 74, oct=-1, legato=0.8)
        t += 8 * L
    silbato(t - L + 0.5, sube=False)  # and down it comes
    # A with everything.
    um_pa(t, ACORDES_A, vel=92)
    caja(t, 16)
    tocar(P, XILO, t, TEMA_A, L, 118, acento=10, legato=0.7)
    tocar(P, PICC, t, TEMA_A, L, 70, legato=0.6)
    contracanto(t, ACORDES_A, vel=78)
    if fin_al_principio:
        silbato(t + 15 * L + 1)  # up again, and round to the start
    return t + 16 * L

if BUCLE:
    # Three identical rounds (same humanising each time): bucle.py keeps the middle one.
    t = 0.0
    for _ in range(3):
        random.seed(47)
        t = cuerpo(t, fin_al_principio=True)
    P.guardar('galop-bucle.mid')
    print(round(t / 3 * 60 / 152, 6))
    sys.exit()

t = 0.0
# Intro: a snare roll, a brass hit, the whistle goes up.
for k in range(16):
    P.nota(BAT, t + k * 0.125, .125, 38, 40 + k * 4, humano=0.002)
P.acorde(METAL, t + 2, .5, ['E4', 'G4', 'C5'], 104, rasgueo=0, legato=0.5)
P.nota(TUBA, t + 2, .5, 'C2', 100, legato=0.5)
P.nota(BAT, t + 2, 1, 49, 100)
silbato(t + 2.5)
t += 2 * L
t = cuerpo(t)
# «¡Ta-dá!»: C, G7, C with a crash.
for b, notas, v in [(0, ['E4', 'G4', 'C5'], 100), (0.5, ['D4', 'F4', 'B4'], 96), (1, ['E4', 'G4', 'C5', 'E5'], 118)]:
    P.acorde(METAL, t + b, .4 if b < 1 else 1.5, notas, v, rasgueo=0, legato=0.8)
    P.nota(XILO, t + b, .5, n(notas[-1]) + 12, v, legato=0.8)
    P.nota(TUBA, t + b, .4 if b < 1 else 1.2, 'C2' if b != 0.5 else 'G1', v, legato=0.8)
P.nota(BAT, t + 1, 2, 49, 112)
P.nota(BAT, t + 1, .5, 36, 110)
P.nota(BAT, t, .25, 38, 90)
P.nota(BAT, t + .5, .25, 38, 96)
P.guardar('galop-del-lio.mid')

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    print('duración', round((t + 2) * 60 / 152, 1), 's')
