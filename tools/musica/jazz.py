# «Jueves en Usera»: bar jazz, swing, F major, 16 bars played twice and a short ending.
import random
from partitura import Pieza, n

P = Pieza(bpm=118, swing=0.64, semilla=4)
PIANO, BAJO, MELODIA, SAXO, BATERIA = 0, 1, 2, 3, 9
P.programa(PIANO, 0)      # acoustic grand
P.programa(BAJO, 32)      # acoustic (upright) bass
P.programa(MELODIA, 59)   # muted trumpet
P.programa(SAXO, 66)      # tenor sax

V = {  # voicings (piano, mid register) and bass roots
    'F': (['F3', 'A3', 'C4', 'E4'], 'F2'), 'F6': (['F3', 'A3', 'C4', 'D4'], 'F2'),
    'D7': (['F#3', 'A3', 'C4', 'D4'], 'D2'), 'Gm': (['G3', 'Bb3', 'D4', 'F4'], 'G2'),
    'C7': (['E3', 'G3', 'Bb3', 'C4'], 'C2'), 'Cm': (['Eb3', 'G3', 'Bb3', 'C4'], 'C2'),
    'F7': (['F3', 'A3', 'C4', 'Eb4'], 'F2'), 'Bb': (['F3', 'A3', 'Bb3', 'D4'], 'Bb1'),
    'Bbm': (['F3', 'Ab3', 'Bb3', 'Db4'], 'Bb1'), 'Eb7': (['Eb3', 'G3', 'Bb3', 'Db4'], 'Eb2'),
    'Am': (['G3', 'A3', 'C4', 'E4'], 'A1'),
}
# One chord per bar, or two (two beats each).
COMPASES = [['F'], ['D7'], ['Gm'], ['C7'], ['F'], ['D7'], ['Gm', 'C7'], ['F'],
            ['Cm', 'F7'], ['Bb'], ['Bbm', 'Eb7'], ['Am', 'D7'], ['Gm'], ['C7'], ['F6', 'D7'], ['Gm', 'C7']]

# The tune, per bar: (beat, length, note).
TEMA = [
    [(0.5, .5, 'A4'), (1, .5, 'C5'), (1.5, 1.5, 'E5'), (3, 1, 'D5')],
    [(0, 1.5, 'C5'), (1.5, .5, 'A4'), (2, 1, 'F#4'), (3, 1, 'A4')],
    [(0, 1, 'Bb4'), (1, .5, 'D5'), (1.5, .5, 'F5'), (2, 1.5, 'D5'), (3.5, .5, 'C5')],
    [(0, 1, 'Bb4'), (1, .5, 'G4'), (1.5, 2.5, 'E4')],
    [(0.5, .5, 'A4'), (1, .5, 'C5'), (1.5, 1.5, 'E5'), (3, 1, 'D5')],
    [(0, 1.5, 'C5'), (1.5, .5, 'A4'), (2, 1, 'F#4'), (3, 1, 'A4')],
    [(0, .5, 'Bb4'), (.5, .5, 'A4'), (1, .5, 'G4'), (1.5, .5, 'Bb4'), (2, 1, 'E5'), (3, .5, 'D5'), (3.5, .5, 'Bb4')],
    [(0, 3, 'A4')],
    [(0, 1, 'G5'), (1, .5, 'Eb5'), (1.5, .5, 'C5'), (2, 1, 'A4'), (3, 1, 'C5')],
    [(0, 1.5, 'D5'), (1.5, .5, 'F5'), (2, 2, 'A5')],
    [(0, 1, 'Db5'), (1, 1, 'F5'), (2, .5, 'G5'), (2.5, .5, 'F5'), (3, 1, 'Db5')],
    [(0, 1, 'C5'), (1, 1, 'E5'), (2, 1, 'F#5'), (3, 1, 'E5')],
    [(0, 1.5, 'D5'), (1.5, .5, 'Bb4'), (2, 1, 'G4'), (3, .5, 'A4'), (3.5, .5, 'Bb4')],
    [(0, 1, 'C5'), (1, .5, 'E5'), (1.5, .5, 'G5'), (2, 2, 'Bb5')],
    [(0, 2, 'A5'), (2, 1, 'F#5'), (3, 1, 'D5')],
    [(0, 1, 'F5'), (1, 1, 'D5'), (2, 2, 'C5')],
]

def bajo_caminante(c0, compases):
    """Walking bass: root on the chord's first beat, chord tones, and a chromatic step into the next root."""
    tiempos = []
    for i, cs in enumerate(compases):
        for j, ch in enumerate(cs):
            tiempos += [(ch, i * 4 + j * (4 // len(cs)), 4 // len(cs))]
    for k, (ch, b0, nb) in enumerate(tiempos):
        raiz = n(V[ch][1])
        sig = n(V[tiempos[(k + 1) % len(tiempos)][0]][1])
        tonos = V[ch][0]
        terc = n(tonos[1]) - 12
        quinta = raiz + 7
        linea = [raiz, terc if nb > 2 else quinta, quinta, sig + (1 if random.random() < 0.5 else -1)][:nb]
        if nb == 2:
            linea = [raiz, sig + (1 if random.random() < 0.5 else -1)]
        for b, t in enumerate(linea):
            while t > n('C3'):
                t -= 12
            while t < n('E1'):
                t += 12
            P.nota(BAJO, c0 + b0 + b, 1, t, 92, legato=0.85)

def piano(c0, compases):
    for i, cs in enumerate(compases):
        for j, ch in enumerate(cs):
            b = c0 + i * 4 + j * 2
            if len(cs) == 1:
                # Charleston: on one, and the off-beat of two.
                P.acorde(PIANO, b, 1.25, V[ch][0], 62, legato=0.7)
                P.acorde(PIANO, b + 1.5, 0.5, V[ch][0], 54, legato=0.6)
            else:
                P.acorde(PIANO, b, 1, V[ch][0], 60, legato=0.7)
                if random.random() < 0.5:
                    P.acorde(PIANO, b + 1.5, 0.5, V[ch][0], 50, legato=0.6)

def bateria(c0, compases, escobillas=True):
    for i in range(compases):
        b = c0 + i * 4
        for t, v in [(0, 62), (1, 70), (1.5, 52), (2, 62), (3, 70), (3.5, 52)]:
            P.nota(BATERIA, b + t, .5, 51, v, humano=0.006)          # ride
        for t in (1, 3):
            P.nota(BATERIA, b + t, .5, 44, 58, humano=0.004)          # hi-hat pedal on 2 and 4
        P.nota(BATERIA, b, .5, 36, 40)                                 # feathered kick
        if escobillas and random.random() < 0.45:
            P.nota(BATERIA, b + random.choice([1.5, 2.5, 3.5]), .25, 38, 30)  # ghost snare

def tema(c0, canal, vel, adorno=False):
    for i, compas in enumerate(TEMA):
        for (b, d, t) in compas:
            bb = c0 + i * 4 + b
            if adorno and d >= 1 and random.random() < 0.3:
                # A grace note from below.
                P.nota(canal, bb - 0.12, 0.12, n(t) - 1, vel - 15, legato=1)
            P.nota(canal, bb, d, t, vel, legato=0.9)

# Two-bar pickup: drums and bass alone.
bateria(0, 2)
for b, t in enumerate(['F2', 'A2', 'C3', 'E3', 'D3', 'C3', 'A2', 'C2']):
    P.nota(BAJO, b, 1, t, 90, legato=0.85)
C1 = 8
for c0, canal, vel, adorno in [(C1, MELODIA, 92, False), (C1 + 64, SAXO, 88, True)]:
    bajo_caminante(c0, COMPASES)
    piano(c0, COMPASES)
    bateria(c0, 16)
    tema(c0, canal, vel, adorno)
# Ending: F major 9, held, with a cymbal.
fin = C1 + 128
P.acorde(PIANO, fin, 4, ['F3', 'A3', 'C4', 'E4', 'G4'], 64, rasgueo=0.05, legato=1)
P.nota(BAJO, fin, 4, 'F1', 92, legato=1)
P.nota(SAXO, fin, 4, 'A4', 80, legato=1)
P.nota(BATERIA, fin, 2, 49, 70)
P.guardar('jueves-en-usera.mid')
print('ok', fin + 4, 'beats')
