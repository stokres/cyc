# «Melodrama de la sombra»: Pablo and his narrator. A silent-film villain waltz: honky-tonk
# piano «um-pa-pa», bassoon on the tune (the piano takes it the second time, an octave up),
# tremolo strings, timpani, and a «dun-dun-duuun» to finish. D minor, 3/4, 168 bpm.
from partitura import Pieza, n
from comun import pcs, tocar

P = Pieza(bpm=168, swing=0.5, semilla=83)
PIANO, FAGOT, TREMOLO, TIMP, TUBA, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(PIANO, 3, 100, 54, 38), (FAGOT, 70, 118, 72, 40), (TREMOLO, 44, 84, 84, 50), (TIMP, 47, 104, 64, 45),
                               (TUBA, 58, 80, 64, 30), (BAT, 0, 100, 64, 35)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
L = 3

A = {k: pcs(v) for k, v in {
    'Dm': ['D', 'F', 'A'], 'A7': ['A', 'C#', 'E', 'G'], 'A7b9': ['A', 'C#', 'E', 'G', 'Bb'], 'Gm': ['G', 'Bb', 'D'],
    'E7': ['E', 'G#', 'B', 'D'], 'Bb': ['Bb', 'D', 'F'], 'C#o': ['C#', 'E', 'G', 'Bb']}.items()}
RAIZ = {'Dm': 'D2', 'A7': 'A1', 'A7b9': 'A1', 'Gm': 'G1', 'E7': 'E2', 'Bb': 'Bb1', 'C#o': 'C#2'}

ACORDES = [['Dm'], ['Dm'], ['A7'], ['A7'], ['A7'], ['A7b9'], ['Dm'], ['Dm'],
           ['Gm'], ['Dm'], ['E7'], ['A7'], ['Dm'], ['Bb'], ['A7'], ['Dm']]
# The villain twirls his moustache: up the chord, a sigh down, a b9 wiggle.
TEMA = [
    [(0, 1, 'A4'), (1, 1, 'D5'), (2, 1, 'F5')], [(0, 2, 'A5'), (2, .5, 'G5'), (2.5, .5, 'F5')],
    [(0, 1, 'G4'), (1, 1, 'C#5'), (2, 1, 'E5')], [(0, 2, 'G5'), (2, .5, 'F5'), (2.5, .5, 'E5')],
    [(0, 1, 'E5'), (1, .5, 'F5'), (1.5, .5, 'E5'), (2, 1, 'C#5')], [(0, 1, 'A4'), (1, 1, 'Bb4'), (2, 1, 'A4')],
    [(0, 1, 'D5'), (1, 1, 'F5'), (2, 1, 'A5')], [(0, 2, 'D6')],
    [(0, 1, 'Bb5'), (1, 1, 'A5'), (2, 1, 'G5')], [(0, 2, 'F5'), (2, 1, 'A5')],
    [(0, 1, 'G#5'), (1, 1, 'B5'), (2, 1, 'D6')], [(0, 2, 'C#6'), (2, 1, 'A5')],
    [(0, 1, 'F5'), (1, 1, 'D5'), (2, 1, 'A4')], [(0, 1, 'F5'), (1, 1, 'D5'), (2, 1, 'Bb4')],
    [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'C#5')], [(0, 2, 'D5')],
]

def revisa():
    malas = [f'compás {i + 1}, tiempo {b + 1}: {t}' for i, c in enumerate(TEMA) for (b, d, t) in c
             if b % 1 == 0 and n(t) % 12 not in A[ACORDES[i][0]]]
    print('notas en el tiempo fuera del acorde:', malas or 'ninguna')

def vals(c0, acordes, vel=78, tremolo=False):
    """Um-pa-pa: low note on 1 (piano and tuba), chord on 2 and 3; tremolo strings holding the chord."""
    for i, cs in enumerate(acordes):
        ch = cs[0]
        r = n(RAIZ[ch])
        bajo = r if i % 2 == 0 else r + 7 - (12 if r + 7 > n('C3') else 0)
        P.nota(PIANO, c0 + i * L, 1, bajo + 12, vel + 6, legato=0.7)
        P.nota(TUBA, c0 + i * L, 1, bajo, vel, legato=0.6)
        voz = sorted(x for x in range(n('F3'), n('F4')) if x % 12 in A[ch])[:3]
        for b in (1, 2):
            P.acorde(PIANO, c0 + i * L + b, 1, voz, vel - 12, rasgueo=0.004, legato=0.45)
        if tremolo:
            P.acorde(TREMOLO, c0 + i * L, 3, [x + 12 for x in voz], 58, rasgueo=0, legato=1)
        P.nota(BAT, c0 + i * L + 1, .25, 42, 34)  # a closed hi-hat tick on 2 and 3, the pit drummer
        P.nota(BAT, c0 + i * L + 2, .25, 42, 30)

t = 0.0
# Intro: the villain enters — timpani roll and a tremolo diminished chord, then two bars of waltz.
for k in range(18):
    P.nota(TIMP, t + k * 0.333, .333, 'D2', 50 + k * 3, legato=1)
P.acorde(TREMOLO, t, 6, ['C#4', 'E4', 'G4', 'Bb4'], 50, rasgueo=0, legato=1)
P.expresion(TREMOLO, t, 6, 50, 127)
P.acorde(PIANO, t + 6, 1, ['C#3', 'E3', 'G3', 'Bb3', 'C#4'], 104, rasgueo=0.01, legato=0.6)
P.nota(TIMP, t + 6, 1, 'A1', 110, legato=1)
P.expresion(TREMOLO, t + 6, 0.1, 127, 100, pasos=1)
t += 3 * L
vals(t, [['Dm'], ['A7']])
t += 2 * L
# The tune on the bassoon.
vals(t, ACORDES)
tocar(P, FAGOT, t, TEMA, L, 92, acento=8, legato=0.85)
t += 16 * L
# Again: the piano takes the tune an octave up, the bassoon grumbles the low line, the strings tremble.
vals(t, ACORDES, vel=84, tremolo=True)
tocar(P, PIANO, t, TEMA, L, 92, oct=1, acento=8, legato=0.85)
tocar(P, FAGOT, t, [[(0, 3, n(RAIZ[cs[0]]) + 12)] for cs in ACORDES], L, 74, legato=0.95)
t += 16 * L
# Dun... dun... DUUUN.
for b, x, v in [(0, 'D2', 100), (1.5, 'D2', 104)]:
    P.acorde(PIANO, t + b, .6, [n(x), n(x) + 12], v, rasgueo=0, legato=0.8)
    P.nota(TUBA, t + b, .6, n(x) - 12 + 12, v, legato=0.8)
    P.nota(TIMP, t + b, .6, x, v, legato=1)
    P.nota(FAGOT, t + b, .6, n(x) + 12, v, legato=0.8)
P.acorde(PIANO, t + 3, 3, ['C#3', 'E3', 'G3', 'Bb3', 'C#4', 'E4'], 118, rasgueo=0.006, legato=1)
P.acorde(TREMOLO, t + 3, 4, ['C#4', 'E4', 'G4', 'Bb4'], 100, rasgueo=0, legato=1)
P.nota(FAGOT, t + 3, 3, 'C#3', 108, legato=1)
for k in range(12):
    P.nota(TIMP, t + 3 + k * 0.25, .25, 'A1', 70 + k * 3, legato=1)
P.nota(BAT, t + 3, 3, 49, 90)
P.guardar('melodrama-de-la-sombra.mid')

if __name__ == '__main__':
    revisa()
    print('duración', round((t + 7) * 60 / 168, 1), 's')
