# «Bolilandia»: Chuchi in the play park. A music-box nursery tune (music box and celesta,
# pizzicato bass, glockenspiel), that Robi gate-crashes the second time with square-wave
# bleeps that power down; at the end the box runs out of spring. C major, 4/4, 112 bpm.
from partitura import Pieza, n
from comun import pcs, tocar

P = Pieza(bpm=112, swing=0.5, semilla=97)
CAJA, CELESTA, PIZZ, GLOCK, ROBI, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(CAJA, 10, 127, 56, 50), (CELESTA, 8, 62, 76, 45), (PIZZ, 45, 96, 60, 35), (GLOCK, 9, 112, 40, 55),
                               (ROBI, 80, 54, 86, 30), (BAT, 0, 100, 64, 30)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
P.rango_bend(ROBI, 12)
P.rango_bend(CAJA, 2)
L = 4

A = {k: pcs(v) for k, v in {
    'C': ['C', 'E', 'G'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'], 'G': ['G', 'B', 'D'], 'Dm': ['D', 'F', 'A'],
    'Fm': ['F', 'Ab', 'C'], 'A7': ['A', 'C#', 'E', 'G'], 'G7': ['G', 'B', 'D', 'F']}.items()}
RAIZ = {'C': 'C3', 'Am': 'A2', 'F': 'F2', 'G': 'G2', 'Dm': 'D3', 'Fm': 'F2', 'A7': 'A2', 'G7': 'G2'}

ACORDES_A = [['C'], ['Am'], ['F'], ['G'], ['C'], ['Am'], ['Dm', 'G'], ['C']]
TEMA_A = [
    [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'E5'), (3, 1, 'C5')], [(0, 1, 'A5'), (1, 1, 'G5'), (2, 2, 'E5')],
    [(0, 1, 'F5'), (1, 1, 'A5'), (2, 1, 'F5'), (3, 1, 'C5')], [(0, 1, 'D5'), (1, 1, 'B4'), (2, 2, 'G4')],
    [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'C6'), (3, 1, 'G5')], [(0, 1, 'A5'), (1, .5, 'B5'), (1.5, .5, 'A5'), (2, 2, 'E5')],
    [(0, 1, 'F5'), (1, 1, 'D5'), (2, 1, 'B4'), (3, 1, 'D5')], [(0, 3, 'C5')],
]
ACORDES_B = [['F'], ['Fm'], ['C'], ['A7'], ['Dm'], ['G'], ['C'], ['G7']]
TEMA_B = [
    [(0, 1, 'A5'), (1, 1, 'C6'), (2, 2, 'A5')], [(0, 1, 'Ab5'), (1, 1, 'C6'), (2, 2, 'Ab5')],
    [(0, 1, 'G5'), (1, 1, 'E5'), (2, 1, 'C5'), (3, 1, 'E5')], [(0, 1, 'C#5'), (1, 1, 'E5'), (2, 2, 'G5')],
    [(0, 1, 'F5'), (1, 1, 'A5'), (2, 1, 'D6'), (3, 1, 'A5')], [(0, 1, 'B5'), (1, 1, 'G5'), (2, 2, 'D5')],
    [(0, 1, 'E5'), (1, 1, 'G5'), (2, 1, 'C6'), (3, 1, 'E5')], [(0, 1, 'F5'), (1, 1, 'D5'), (2, 1, 'B4'), (3, 1, 'G4')],
]

def revisa(nombre, tema, acordes):
    malas = []
    for i, c in enumerate(tema):
        for (b, d, t) in c:
            ch = acordes[i][0] if b < 2 or len(acordes[i]) == 1 else acordes[i][1]
            if b % 1 == 0 and n(t) % 12 not in A[ch]:
                malas.append(f'compás {i + 1}, tiempo {b + 1}: {t}')
    print(f'{nombre}: notas en el tiempo fuera del acorde:', malas or 'ninguna')

def fondo(c0, acordes, vel=70):
    """Pizzicato on 1 and 3; the celesta's broken chord in eighths (low-high-mid-high)."""
    for i, cs in enumerate(acordes):
        for mitad in range(2):
            ch = cs[0] if mitad == 0 or len(cs) == 1 else cs[1]
            r = n(RAIZ[ch])
            P.nota(PIZZ, c0 + i * L + mitad * 2, 1, r - 12, vel + 10, legato=0.6)
            tonos = sorted(x for x in range(n('C4'), n('C5')) if x % 12 in A[ch])
            for k, x in enumerate([tonos[0], tonos[-1], tonos[1], tonos[-1]]):
                P.nota(CELESTA, c0 + i * L + mitad * 2 + k * 0.5, .5, x, vel - (6 if k % 2 else 0), legato=0.9)
        P.nota(BAT, c0 + i * L, .25, 81, 40)  # a triangle «ting» each bar

def campanitas(c0, tema, vel=66):
    for i, compas in enumerate(tema):
        for (b, d, t) in compas:
            if b == 0:
                P.nota(GLOCK, c0 + i * L, 1, n(t) + 12, vel, legato=1)

def robi(beat, alto=True):
    """Robi's bleep: a quick square-wave arpeggio, then a «power-down» slide."""
    notas = ['C6', 'G5', 'E5', 'C6'] if alto else ['G5', 'D5', 'B4', 'G5']
    for k, x in enumerate(notas):
        P.nota(ROBI, beat + k * 0.25, .2, x, 76, legato=0.8)
    P.glis(ROBI, beat + 1, 0.9, notas[-1], n(notas[-1]) - 12, 72, curva=1.6)

t = 0.0
# Intro: the box is wound — a few glockenspiel notes, the celesta starts.
for k, x in enumerate(['G5', 'C6', 'E6', 'G6']):
    P.nota(GLOCK, t + k * 0.5, .5, x, 62, legato=1)
fondo(t + 2 - 2, [['C']], vel=60)
t += L
# A and B on the music box.
fondo(t, ACORDES_A)
tocar(P, CAJA, t, TEMA_A, L, 108, acento=6, legato=1)
campanitas(t, TEMA_A)
t += 8 * L
fondo(t, ACORDES_B)
tocar(P, CAJA, t, TEMA_B, L, 108, acento=6, legato=1)
campanitas(t, TEMA_B)
t += 8 * L
# A again: Robi gate-crashes at the end of each phrase.
fondo(t, ACORDES_A)
tocar(P, CAJA, t, TEMA_A, L, 110, acento=6, legato=1)
campanitas(t, TEMA_A)
for c in (1, 3, 5):
    robi(t + c * L + 2, alto=c != 3)
t += 8 * L
# The spring runs out: slower and slower, the last note sags.
for k, bpm in enumerate([100, 88, 74, 60, 48]):
    P.tempo(t + k, bpm)
for k, x in enumerate(['E5', 'D5', 'C5']):
    P.nota(CAJA, t + k, 1, x, 84 - k * 6, legato=1)
P.nota(PIZZ, t, 1, 'C2', 70, legato=0.6)
P.nota(CAJA, t + 3, 2, 'C5', 72, legato=1)
P.eventos[CAJA].append((P.tick(t + 3.6), __import__('mido').Message('pitchwheel', channel=CAJA, pitch=-6000)))
P.guardar('bolilandia.mid')

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
