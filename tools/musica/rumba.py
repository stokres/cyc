# «Rumba del Río»: for the bar (and the end of the chapter). A Spanish rumba: nylon guitar
# strumming (with the muted «chuck» on 2 and 4), bass on the tresillo, palmas, cajón, and a
# slightly cheesy alto sax on the tune. Andalusian cadence in A minor, a sunny part in F,
# and a flamenco close on E. 4/4, 118 bpm.
from partitura import Pieza, n
from comun import pcs, tocar, choques

P = Pieza(bpm=118, swing=0.5, semilla=58)
GUIT, BAJO, SAXO, SAXO2, TROMP, BAT = 0, 1, 2, 3, 4, 9
for c, prog, vol, pan, rev in [(GUIT, 24, 90, 44, 40), (BAJO, 32, 82, 64, 20), (SAXO, 65, 112, 70, 42), (SAXO2, 65, 84, 78, 42),
                               (TROMP, 56, 90, 54, 42), (BAT, 0, 122, 64, 30)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
L = 4

GUITARRA = {  # six-string shapes, low to high
    'Am': ['A2', 'E3', 'A3', 'C4', 'E4'], 'G': ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'], 'F': ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'],
    'E': ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], 'E7': ['E2', 'B2', 'D3', 'G#3', 'B3', 'E4'], 'C': ['C3', 'E3', 'G3', 'C4', 'E4'],
    'Dm': ['D3', 'A3', 'D4', 'F4'],
}
A = {k: pcs(v) for k, v in GUITARRA.items()}
RAIZ = {'Am': 'A1', 'G': 'G1', 'F': 'F1', 'E': 'E1', 'E7': 'E1', 'C': 'C2', 'Dm': 'D2'}

ACORDES_A = [['Am'], ['G'], ['F'], ['E'], ['Am'], ['G'], ['F', 'E7'], ['Am']]
TEMA_A = [
    [(0, .5, 'E5'), (.5, .5, 'E5'), (1, .5, 'D5'), (1.5, .5, 'C5'), (2, 1, 'A4'), (3, .5, 'C5'), (3.5, .5, 'D5')],
    [(0, 1.5, 'B4'), (1.5, .5, 'A4'), (2, 2, 'G4')],
    [(0, .5, 'A4'), (.5, .5, 'A4'), (1, .5, 'G4'), (1.5, .5, 'F4'), (2, 1, 'A4'), (3, .5, 'G4'), (3.5, .5, 'F4')],
    [(0, 1.5, 'G#4'), (1.5, .5, 'A4'), (2, 1, 'B4'), (3, 1, 'E4')],
    [(0, .5, 'A4'), (.5, .5, 'B4'), (1, .5, 'C5'), (1.5, .5, 'E5'), (2, 1, 'A5'), (3, .5, 'G5'), (3.5, .5, 'E5')],
    [(0, 1.5, 'D5'), (1.5, .5, 'B4'), (2, 1, 'G5'), (3, 1, 'D5')],
    [(0, .5, 'C5'), (.5, .5, 'A4'), (1, 1, 'F4'), (2, .5, 'G#4'), (2.5, .5, 'B4'), (3, 1, 'D5')],
    [(0, 2, 'A4')],
]
ACORDES_B = [['F'], ['C'], ['G'], ['C'], ['F'], ['C'], ['Dm'], ['E7']]
TEMA_B = [
    [(0, .5, 'C5'), (.5, .5, 'F5'), (1, 1, 'A5'), (2, .5, 'G5'), (2.5, .5, 'F5'), (3, 1, 'C5')],
    [(0, 1.5, 'E5'), (1.5, .5, 'D5'), (2, 2, 'C5')],
    [(0, .5, 'B4'), (.5, .5, 'D5'), (1, 1, 'G5'), (2, .5, 'F5'), (2.5, .5, 'E5'), (3, 1, 'D5')],
    [(0, 2, 'E5'), (2, .5, 'C5'), (2.5, .5, 'D5'), (3, 1, 'E5')],
    [(0, .5, 'F5'), (.5, .5, 'F5'), (1, .5, 'F5'), (1.5, .5, 'G5'), (2, 2, 'A5')],
    [(0, .5, 'G5'), (.5, .5, 'E5'), (1, .5, 'C5'), (1.5, .5, 'E5'), (2, 2, 'G5')],
    [(0, 1, 'F5'), (1, 1, 'D5'), (2, 1, 'A4'), (3, 1, 'D5')],
    [(0, 1, 'E5'), (1, 1, 'D5'), (2, 1, 'B4'), (3, .5, 'G#4'), (3.5, .5, 'B4')],
]

def rasgueo(beat, ch, vel, sube=False, corto=False):
    notas = GUITARRA[ch][::-1] if sube else GUITARRA[ch]
    if corto:  # the muted «chuck»: the top strings, very short
        notas = GUITARRA[ch][-3:]
        P.acorde(GUIT, beat, 0.12, notas, vel, rasgueo=0.008, legato=0.3)
    else:
        P.acorde(GUIT, beat, 0.5, notas, vel, rasgueo=0.014, legato=0.9)

# The rumba strum, eighths: Down, up, chuck, up, down, up, chuck, up.
PATRON = [(0, 'D', 92), (0.5, 'U', 56), (1, 'C', 62), (1.5, 'U', 66), (2, 'D', 84), (2.5, 'U', 56), (3, 'C', 62), (3.5, 'U', 70)]

def acompanamiento(c0, acordes, palmas_contratiempo=False, vel=0):
    for i, cs in enumerate(acordes):
        for b, tipo, v in PATRON:
            ch = cs[0] if b < 2 or len(cs) == 1 else cs[1]
            rasgueo(c0 + i * L + b, ch, v + vel, sube=tipo == 'U', corto=tipo == 'C')
        # Bass on the tresillo (3+3+2): root, fifth, root.
        for b, d in [(0, 1.5), (1.5, 1.5), (3, 1)]:
            ch = cs[0] if b < 2 or len(cs) == 1 else cs[1]
            r = n(RAIZ[ch])
            P.nota(BAJO, c0 + i * L + b, d, r + (7 if b == 1.5 else 0), 96 if b == 0 else 84, legato=0.8)
        # Palmas on 2 and 4 (and the off-beats when it gets going); the cajón: bass and slap.
        for b in (1, 3):
            P.nota(BAT, c0 + i * L + b, .25, 39, 84)
        if palmas_contratiempo:
            for b in (0.5, 1.5, 2.5, 3.5):
                P.nota(BAT, c0 + i * L + b, .25, 39, 44)
        for b, nota, v in [(0, 64, 88), (1.5, 64, 70), (1, 63, 72), (3, 63, 80), (3.75, 62, 40)]:
            P.nota(BAT, c0 + i * L + b, .25, nota, v)

t = 0.0
# Intro: the guitar alone with palmas, two bars on the cadence's end (F, E).
acompanamiento(t, [['F'], ['E']])
t += 2 * L
# A: the sax.
acompanamiento(t, ACORDES_A)
tocar(P, SAXO, t, TEMA_A, L, 92, legato=0.92)
t += 8 * L
# A again: a second sax a third below; off-beat palmas.
acompanamiento(t, ACORDES_A, palmas_contratiempo=True)
tocar(P, SAXO, t, TEMA_A, L, 96, legato=0.92, armonia=True, acordes=[[A[c] for c in cs] for cs in ACORDES_A], canal2=SAXO2, vel2=78)
t += 8 * L
# B: the sunny part, sax and trumpet together (the trumpet an octave... no: in unison, brighter).
acompanamiento(t, ACORDES_B, palmas_contratiempo=True, vel=6)
tocar(P, SAXO, t, TEMA_B, L, 98, legato=0.9)
tocar(P, TROMP, t, TEMA_B, L, 74, legato=0.85)
t += 8 * L
# A to finish, everyone.
acompanamiento(t, ACORDES_A, palmas_contratiempo=True, vel=6)
tocar(P, SAXO, t, TEMA_A[:7], L, 100, legato=0.92, armonia=True, acordes=[[A[c] for c in cs] for cs in ACORDES_A], canal2=SAXO2, vel2=80)
tocar(P, TROMP, t, TEMA_A[:7], L, 70, oct=0, legato=0.85)
t += 7 * L
# The flamenco close: a fast rasgueo on Am, then three on E and a final E held.
for k in range(4):
    rasgueo(t + k * 0.25, 'Am', 70 + k * 6, sube=k % 2 == 1)
for b in (1, 1.5, 2):
    rasgueo(t + b, 'E', 100)
    P.nota(BAJO, t + b, .5, 'E1', 100, legato=0.6)
    P.nota(BAT, t + b, .25, 39, 100)
    P.nota(BAT, t + b, .25, 64, 96)
P.nota(SAXO, t + 2, 2, 'G#4', 100, legato=1)
P.nota(SAXO2, t + 2, 2, 'E4', 84, legato=1)
P.nota(TROMP, t + 2, 2, 'B4', 84, legato=1)
P.nota(BAJO, t + 2, 2, 'E1', 104, legato=1)
P.guardar('rumba-del-rio.mid')

if __name__ == '__main__':
    choques('A', TEMA_A, L, [[A[c] for c in cs] for cs in ACORDES_A])
    choques('B', TEMA_B, L, [[A[c] for c in cs] for cs in ACORDES_B])
    print('duración', round((t + 4) * 60 / 118, 1), 's')
