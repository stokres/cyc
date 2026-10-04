# «Polka de la granja»: Guille's farm. A hoedown polka: fiddle on the tune, banjo rolls,
# tuba «um-pa», brushed snare, a cowbell, and a trombone that grunts in the gaps like a pig.
# D major, 2/4, 132 bpm; a trio in G.
from partitura import Pieza, n
from comun import pcs, tocar, cercana

P = Pieza(bpm=132, swing=0.5, semilla=71)
VIOLIN, BANJO, TUBA, TBN, ACORD, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(VIOLIN, 40, 118, 56, 40), (BANJO, 105, 86, 34, 30), (TUBA, 58, 84, 64, 22), (TBN, 57, 72, 82, 35),
                               (ACORD, 21, 120, 92, 38), (BAT, 0, 110, 64, 25)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
P.rango_bend(TBN, 12)
L = 2

A = {k: pcs(v) for k, v in {
    'D': ['D', 'F#', 'A'], 'A7': ['A', 'C#', 'E', 'G'], 'D7': ['D', 'F#', 'A', 'C'], 'G': ['G', 'B', 'D'], 'Gm': ['G', 'Bb', 'D'],
    'B7': ['B', 'D#', 'F#', 'A'], 'E7': ['E', 'G#', 'B', 'D'], 'C': ['C', 'E', 'G'], 'Em': ['E', 'G', 'B']}.items()}
RAIZ = {'D': 'D2', 'A7': 'A1', 'D7': 'D2', 'G': 'G1', 'Gm': 'G1', 'B7': 'B1', 'E7': 'E2', 'C': 'C2', 'Em': 'E2'}

def ocho(*notas):
    return [(k * 0.5, 0.5, x) for k, x in enumerate(notas) if x]

ACORDES_A = [['D'], ['D'], ['A7'], ['A7'], ['A7'], ['A7'], ['D'], ['D'],
             ['D'], ['D7'], ['G'], ['Gm'], ['D'], ['B7'], ['E7', 'A7'], ['D']]
TEMA_A = [
    ocho('F#5', 'A5', 'F#5', 'D5'), [(0, 1, 'A5'), (1, .5, 'D6'), (1.5, .5, 'A5')],
    ocho('G5', 'E5', 'C#5', 'E5'), [(0, 1, 'G5'), (1, .5, 'A5'), (1.5, .5, 'G5')],
    ocho('E5', 'G5', 'E5', 'C#5'), ocho('A4', 'C#5', 'E5', 'G5'),
    ocho('F#5', 'E5', 'D5', 'A4'), [(0, 1, 'D5')],
    ocho('F#5', 'A5', 'F#5', 'D5'), [(0, 1, 'C6'), (1, .5, 'A5'), (1.5, .5, 'F#5')],
    ocho('G5', 'B5', 'D6', 'B5'), [(0, 1, 'Bb5'), (1, .5, 'G5'), (1.5, .5, 'D5')],
    ocho('A5', 'F#5', 'D5', 'F#5'), ocho('D#5', 'F#5', 'B5', 'A5'),
    ocho('G#5', 'E5', 'G5', 'C#5'), [(0, 1, 'D5')],
]
ACORDES_T = [['G'], ['G'], ['D7'], ['D7'], ['D7'], ['D7'], ['G'], ['G'],
             ['G'], ['G'], ['C'], ['C'], ['G'], ['E7'], ['A7', 'D7'], ['G']]
TEMA_T = [
    [(0, 1.5, 'B4'), (1.5, .5, 'C5')], [(0, 1, 'D5'), (1, 1, 'G5')],
    [(0, 1.5, 'F#5'), (1.5, .5, 'E5')], [(0, 2, 'D5')],
    [(0, 1, 'C5'), (1, 1, 'A4')], [(0, 1, 'F#4'), (1, 1, 'A4')],
    [(0, 1.5, 'B4'), (1.5, .5, 'A4')], [(0, 2, 'G4')],
    [(0, 1.5, 'B4'), (1.5, .5, 'C5')], [(0, 1, 'D5'), (1, 1, 'B5')],
    [(0, 1.5, 'C6'), (1.5, .5, 'B5')], [(0, 1, 'G5'), (1, 1, 'E5')],
    [(0, 1, 'D5'), (1, 1, 'G5')], [(0, 1, 'G#5'), (1, 1, 'B5')],
    [(0, 1, 'A5'), (1, 1, 'F#5')], [(0, 1, 'G5')],
]

def revisa(nombre, tema, acordes):
    malas = []
    for i, c in enumerate(tema):
        for (b, d, t) in c:
            ch = acordes[i][0] if b < 1 or len(acordes[i]) == 1 else acordes[i][1]
            if b % 1 == 0 and n(t) % 12 not in A[ch]:
                malas.append(f'compás {i + 1}, tiempo {b + 1}: {t}')
    print(f'{nombre}: notas en el tiempo fuera del acorde:', malas or 'ninguna')

def um_pa(c0, acordes, vel=88, cencerro=False):
    for i, cs in enumerate(acordes):
        for b in range(L):
            ch = cs[0] if b == 0 or len(cs) == 1 else cs[1]
            r = n(RAIZ[ch])
            P.nota(TUBA, c0 + i * L + b, .5, r if b == 0 else r + 7 - (12 if r + 7 > n('C3') else 0), vel, legato=0.65)
            # Banjo roll: up the chord in sixteenths, a beat at a time.
            tonos = sorted(x for x in range(n('G3'), n('G5')) if x % 12 in A[ch])
            for k, x in enumerate([tonos[0], tonos[2], tonos[1], tonos[3] if len(tonos) > 3 else tonos[2] + 12]):
                P.nota(BANJO, c0 + i * L + b + k * 0.25, .25, x, 66 + (10 if k == 0 else 0), legato=0.9)
        P.nota(BAT, c0 + i * L, .5, 36, 80)
        P.nota(BAT, c0 + i * L + 1, .5, 36, 60)
        for b in (0.5, 1.5):
            P.nota(BAT, c0 + i * L + b, .25, 38, 46)  # brushed «chick» on the off-beats
        if cencerro and i % 2 == 1:
            P.nota(BAT, c0 + i * L + 1.5, .25, 56, 70)  # cowbell, every other bar

def gruñido(beat, nota='D3'):
    """The trombone «oink»: a short growl that bends up and drops."""
    P.glis(TBN, beat, 0.22, n(nota) - 2, n(nota) + 3, 82, curva=0.6)
    P.glis(TBN, beat + 0.3, 0.3, n(nota) + 1, n(nota) - 5, 74, curva=1.5)

t = 0.0
# Intro: the banjo and tuba alone for two bars, a cowbell count.
um_pa(t, [['D'], ['A7']], cencerro=True)
t += 2 * L
for vuelta in range(2):
    um_pa(t, ACORDES_A, cencerro=vuelta == 1)
    tocar(P, VIOLIN, t, TEMA_A, L, 96 + vuelta * 6, acento=10, legato=0.85)
    gruñido(t + 7 * L + 1)
    gruñido(t + 15 * L + 1, 'A2')
    if vuelta:
        tocar(P, ACORD, t, TEMA_A, L, 66, oct=-1, legato=0.8)
    t += 16 * L
# Trio in G: the trombone sings it (with a slide in), the fiddle answers with a counter-line.
P.control(TBN, t - 0.1, 7, 96)
um_pa(t, ACORDES_T, vel=82)
tocar(P, TBN, t, [[(b, d, n(x) - 12) for (b, d, x) in c] for c in TEMA_T], L, 92, legato=0.95)
prev = n('D5')
for i, cs in enumerate(ACORDES_T):
    prev = cercana(prev, A[cs[0]], 'B4', 'B5')
    P.nota(VIOLIN, t + i * L, 2, prev, 70, legato=0.95)
P.control(TBN, t + 16 * L - 0.2, 7, 72)
t += 16 * L
# A to finish, with everyone and the cowbell.
um_pa(t, ACORDES_A, vel=92, cencerro=True)
tocar(P, VIOLIN, t, TEMA_A, L, 104, acento=10, legato=0.85)
tocar(P, ACORD, t, TEMA_A, L, 70, oct=-1, legato=0.8)
gruñido(t + 7 * L + 1)
t += 16 * L
# Ending: «shave and a haircut... two bits» — the old comic tag, then a last oink.
for b, x, v in [(0, 'D5', 96), (0.75, 'A4', 80), (1, 'A4', 84), (1.5, 'B4', 90), (2, 'A4', 96)]:
    P.nota(VIOLIN, t + b, .4, x, v, legato=0.7)
    P.nota(ACORD, t + b, .4, n(x) - 12, v - 20, legato=0.7)
for b, x in [(3, 'C#5'), (3.5, 'D5')]:
    for c in (VIOLIN, ACORD):
        P.nota(c, t + b, .45, x if c == VIOLIN else n(x) - 12, 108, legato=0.7)
    P.nota(TUBA, t + b, .45, 'A1' if b == 3 else 'D2', 100, legato=0.7)
    P.nota(BAT, t + b, .25, 38, 100)
P.nota(BAT, t + 3.5, 1, 49, 90)
gruñido(t + 4.4, 'A2')
P.guardar('polka-de-la-granja.mid')

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('trío', TEMA_T, ACORDES_T)
    print('duración', round((t + 6) * 60 / 132, 1), 's')
