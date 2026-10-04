# «Chotis de Usera»: for walking round the neighbourhood. A Madrid barrel-organ chotis with a
# wink: accordion tune with glockenspiel sparkle, tuba on 1 and 3, the accordion's «chá» on 2
# and 4, bass drum and cymbal; a minor middle part that gets up to something, and the tune
# again with a piccolo on top. G major, 100 bpm, a swaggering slow-down at the end.
from partitura import Pieza, n
from comun import pcs, tocar, choques

P = Pieza(bpm=100, swing=0.5, semilla=33)
ACORD, CHA, GLOCK, PICC, TUBA, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(ACORD, 21, 124, 60, 42), (CHA, 21, 92, 76, 38), (GLOCK, 9, 124, 44, 50), (PICC, 72, 84, 40, 48),
                               (TUBA, 58, 76, 64, 25), (BAT, 0, 118, 64, 30)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
L = 4

A = {k: pcs(v) for k, v in {
    'G': ['G', 'B', 'D'], 'D7': ['D', 'F#', 'A', 'C'], 'G7': ['G', 'B', 'D', 'F'], 'C': ['C', 'E', 'G'],
    'C#o': ['C#', 'E', 'G', 'Bb'], 'E7': ['E', 'G#', 'B', 'D'], 'A7': ['A', 'C#', 'E', 'G'],
    'Em': ['E', 'G', 'B'], 'B7': ['B', 'D#', 'F#', 'A'], 'Am': ['A', 'C', 'E']}.items()}
RAIZ = {'G': 'G1', 'D7': 'D2', 'G7': 'G1', 'C': 'C2', 'C#o': 'C#2', 'E7': 'E2', 'A7': 'A1', 'Em': 'E2', 'B7': 'B1', 'Am': 'A1'}

ACORDES_A = [['G'], ['G'], ['D7'], ['D7'], ['D7'], ['D7'], ['G'], ['G7'],
             ['C'], ['C#o'], ['G'], ['E7'], ['A7'], ['D7'], ['G'], ['D7']]
# The swagger: «pa-ra PAM, pa-ra PAM», dotted, then a turn.
TEMA_A = [
    [(0, .75, 'B4'), (.75, .25, 'C5'), (1, 1, 'D5'), (2, .75, 'B4'), (2.75, .25, 'C5'), (3, 1, 'D5')],
    [(0, .75, 'E5'), (.75, .25, 'D5'), (1, 1, 'B4'), (2, 1.5, 'G4'), (3.5, .5, 'A4')],
    [(0, .75, 'C5'), (.75, .25, 'B4'), (1, 1, 'A4'), (2, .75, 'C5'), (2.75, .25, 'B4'), (3, 1, 'A4')],
    [(0, .75, 'F#5'), (.75, .25, 'E5'), (1, 1, 'D5'), (2, 2, 'A4')],
    [(0, .5, 'A4'), (.5, .5, 'B4'), (1, .5, 'C5'), (1.5, .5, 'D5'), (2, .5, 'E5'), (2.5, .5, 'F#5'), (3, 1, 'A5')],
    [(0, 1, 'F#5'), (2, .5, 'E5'), (2.5, .5, 'D5'), (3, .5, 'C5'), (3.5, .5, 'A4')],
    [(0, 1.5, 'B4'), (1.5, .5, 'D5'), (2, 2, 'G5')],
    [(0, .75, 'F5'), (.75, .25, 'E5'), (1, 1, 'D5'), (2, 1, 'B4'), (3, 1, 'G4')],
    [(0, .75, 'E5'), (.75, .25, 'F5'), (1, 1, 'G5'), (2, .75, 'E5'), (2.75, .25, 'F5'), (3, 1, 'G5')],
    [(0, .75, 'Bb5'), (.75, .25, 'A5'), (1, 1, 'G5'), (2, 2, 'E5')],
    [(0, 1, 'D5'), (1, .5, 'B4'), (1.5, .5, 'G4'), (2, 1, 'D5'), (3, 1, 'B4')],
    [(0, .75, 'G#4'), (.75, .25, 'A4'), (1, 1, 'B4'), (2, 1, 'D5'), (3, 1, 'E5')],
    [(0, 1, 'C#5'), (1, .5, 'E5'), (1.5, .5, 'G5'), (2, 1, 'G5'), (3, 1, 'E5')],
    [(0, .75, 'F#5'), (.75, .25, 'E5'), (1, 1, 'D5'), (2, 1, 'C5'), (3, 1, 'A4')],
    [(0, 1, 'G4'), (1, .5, 'B4'), (1.5, .5, 'D5'), (2, 1, 'G5')],
    [(2, 1, 'F#4'), (3, .5, 'A4'), (3.5, .5, 'C5')],
]
# The middle: E minor, up to something.
ACORDES_B = [['Em'], ['B7'], ['Em'], ['E7'], ['Am'], ['D7'], ['G'], ['D7']]
TEMA_B = [
    [(0, .75, 'B4'), (.75, .25, 'C5'), (1, 1, 'B4'), (2, 1, 'G4'), (3, 1, 'E4')],
    [(0, .75, 'D#5'), (.75, .25, 'E5'), (1, 1, 'F#5'), (2, 2, 'B4')],
    [(0, .75, 'E5'), (.75, .25, 'F#5'), (1, 1, 'G5'), (2, 1, 'E5'), (3, 1, 'B4')],
    [(0, 1, 'D5'), (1, 1, 'G#4'), (2, 1, 'B4'), (3, 1, 'D5')],
    [(0, .75, 'C5'), (.75, .25, 'B4'), (1, 1, 'A4'), (2, .75, 'E5'), (2.75, .25, 'D5'), (3, 1, 'C5')],
    [(0, .75, 'F#5'), (.75, .25, 'E5'), (1, 1, 'D5'), (2, 1, 'C5'), (3, 1, 'A4')],
    [(0, 1, 'B4'), (1, 1, 'D5'), (2, 1, 'G5'), (3, 1, 'D5')],
    [(0, 1, 'E5'), (1, 1, 'C5'), (2, 1, 'A4'), (3, .5, 'F#4'), (3.5, .5, 'A4')],
]

def pom_cha(c0, acordes, vel=86):
    """Chotis accompaniment: tuba on 1 and 3 (root, fifth), accordion chord on 2 and 4, short."""
    for i, cs in enumerate(acordes):
        ch = cs[0]
        r = n(RAIZ[ch])
        P.nota(TUBA, c0 + i * L, 1, r, vel + 6, legato=0.6)
        P.nota(TUBA, c0 + i * L + 2, 1, r + 7 - (12 if r + 7 > n('C3') else 0), vel - 4, legato=0.6)
        voz = sorted(x for x in range(n('D4'), n('D5')) if x % 12 in A[ch])[:3]
        for b in (1, 3):
            P.acorde(CHA, c0 + i * L + b, 1, voz, vel - 14, rasgueo=0, legato=0.35)
        # The bass drum on 1 and 3, the cymbal on 2 and 4 (soft), the organ-grinder's kit.
        P.nota(BAT, c0 + i * L, .5, 36, 74)
        P.nota(BAT, c0 + i * L + 2, .5, 36, 60)
        for b in (1, 3):
            P.nota(BAT, c0 + i * L + b, .5, 51, 46)
        if i % 4 == 3:
            P.nota(BAT, c0 + i * L + 3.5, .5, 81, 52)  # triangle at the end of each phrase

def chispas(c0, compases, vel=84):
    """Glockenspiel: the strong notes of the tune, an octave up (the barrel organ's bells)."""
    for i, compas in enumerate(compases):
        for (b, d, t) in compas:
            if b % 2 == 0 and d >= 1:
                P.nota(GLOCK, c0 + i * L + b, 1, n(t) + 12, vel, legato=1)

t = 0.0
# Intro: the organ-grinder winds up — two bars of «pom-chá» and a glockenspiel run.
pom_cha(t, [['G'], ['D7']])
for k, x in enumerate(['G5', 'B5', 'D6', 'G6', 'F#6', 'D6', 'A5', 'C6']):
    P.nota(GLOCK, t + 4 + k * 0.5, .5, x, 58, legato=1)
t += 2 * L
# A: the accordion's tune with bells.
pom_cha(t, ACORDES_A)
tocar(P, ACORD, t, TEMA_A, L, 88, legato=0.85)
chispas(t, TEMA_A)
t += 16 * L
# B: E minor, a bit sly; the accordion alone, quieter bells.
pom_cha(t, ACORDES_B, vel=80)
tocar(P, ACORD, t, TEMA_B, L, 84, legato=0.8)
chispas(t, TEMA_B, vel=70)
t += 8 * L
# A again, the second half, with the piccolo an octave up.
pom_cha(t, ACORDES_A[8:15])
tocar(P, ACORD, t, TEMA_A[8:15], L, 92, legato=0.85)
tocar(P, PICC, t, TEMA_A[8:15], L, 70, oct=1, legato=0.75)
chispas(t, TEMA_A[8:15])
t += 7 * L
# The ending: a swaggering slow-down — «pom... chá... ¡chan!»
for k, bpm in enumerate([94, 86, 76, 66]):
    P.tempo(t + k, bpm)
P.nota(TUBA, t, 1, 'D2', 90, legato=0.6)
P.acorde(CHA, t + 1, 1, ['C4', 'D4', 'F#4'], 80, rasgueo=0, legato=0.4)
P.nota(ACORD, t + 2, 0.5, 'A4', 84, legato=0.6)
P.nota(ACORD, t + 2.5, 0.5, 'C5', 84, legato=0.6)
P.nota(ACORD, t + 3, 1, 'F#5', 90, legato=0.9)
fin = t + 4
P.acorde(ACORD, fin, 2, ['G4', 'B4', 'D5', 'G5'], 100, rasgueo=0.03, legato=0.9)
P.nota(PICC, fin, 1, 'G6', 80, legato=0.7)
P.nota(GLOCK, fin, 2, 'G6', 70, legato=1)
P.nota(TUBA, fin, 1.5, 'G1', 100, legato=0.8)
P.nota(BAT, fin, 1, 36, 96)
P.nota(BAT, fin, 2, 49, 76)
P.guardar('chotis-de-usera.mid')

if __name__ == '__main__':
    choques('A', TEMA_A, L, [[A[c] for c in cs] for cs in ACORDES_A])
    choques('B', TEMA_B, L, [[A[c] for c in cs] for cs in ACORDES_B])
