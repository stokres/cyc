# «De puntillas»: comic mystery for exploring in the dark. D minor, 104 bpm, straight eighths.
# Pizzicato strings tiptoeing, bassoon tune (clarinet the second time), glockenspiel and woodblocks.
import random
from partitura import Pieza, n

P = Pieza(bpm=104, swing=0.5, semilla=9)
PIZZ, FAGOT, CLARINETE, GLOCK, CUERDAS, PERC = 0, 1, 2, 3, 4, 9
P.programa(PIZZ, 45)
P.programa(FAGOT, 70)
P.programa(CLARINETE, 71)
P.programa(GLOCK, 9)
P.programa(CUERDAS, 49)  # slow strings pad, very soft, the second time

ACORDES = ['Dm', 'Dm', 'Gm', 'A7', 'Dm', 'Bb7', 'A7', 'Dm']
BAJO = {  # tiptoe line per bar, eighths ('.' rest)
    'Dm': ['D3', '.', 'A2', '.', 'D3', '.', 'C#3', '.'],
    'Gm': ['G2', '.', 'D3', '.', 'G2', '.', 'A2', '.'],
    'A7': ['A2', '.', 'E3', '.', 'C#3', '.', 'E3', '.'],
    'Bb7': ['Bb2', '.', 'F3', '.', 'D3', '.', 'Ab2', '.'],
}
COLCHON = {'Dm': ['D3', 'F3', 'A3'], 'Gm': ['D3', 'G3', 'Bb3'], 'A7': ['C#3', 'E3', 'G3'], 'Bb7': ['D3', 'F3', 'Ab3']}
TEMA = """
D4 . F4 . A4 . G#4 A4 | F4 . D4 . . . . . | G4 . Bb4 . D5 . C#5 D5 | E4 . G4 . Bb4 . A4 . |
D4 . F4 . A4 . D5 . | D5 . C5 . Bb4 . Ab4 . | G4 . F4 . E4 . C#4 . | D4 . . . A3 . D3 . |
"""
compases = [c.split() for c in TEMA.replace('\n', ' ').split('|') if c.strip()]

def pizz(c0):
    for i, ch in enumerate(ACORDES):
        for k, t in enumerate(BAJO[ch]):
            if t != '.':
                P.nota(PIZZ, c0 + i * 4 + k * 0.5, 0.5, t, 78 if k == 0 else 64, legato=0.5)
        # A soft off-beat chord tick from the violins.
        P.acorde(PIZZ, c0 + i * 4 + 1.5, 0.25, [n(x) + 12 for x in COLCHON[ch]], 42, rasgueo=0.0)
        P.acorde(PIZZ, c0 + i * 4 + 3.5, 0.25, [n(x) + 12 for x in COLCHON[ch]], 38, rasgueo=0.0)

def tema(c0, canal, vel, octava=0):
    for i, c in enumerate(compases):
        for k, t in enumerate(c):
            if t == '.':
                continue
            P.nota(canal, c0 + i * 4 + k * 0.5, 0.5, n(t) + 12 * octava, vel + (6 if k % 2 == 0 else 0), legato=0.45)

def percusion(c0, compases_n):
    for i in range(compases_n):
        for k in range(4):
            P.nota(PERC, c0 + i * 4 + k, 0.25, 76 if k % 2 == 0 else 77, 50 if k % 2 == 0 else 40, humano=0.004)  # wood blocks tick-tock
        if i % 4 == 3:
            P.nota(PERC, c0 + i * 4 + 3.5, 0.25, 81, 45)  # triangle at phrase ends

def glock(c0):
    # Sparkles: a little run at the end of each phrase.
    for b, notas in [(c0 + 1 * 4 + 2, ['A5', 'D6', 'F6']), (c0 + 7 * 4 + 2, ['D6', 'A5', 'F5', 'D5'])]:
        for k, t in enumerate(notas):
            P.nota(GLOCK, b + k * 0.25, 0.25, t, 58, legato=1)

# Intro: one bar of pizzicato and wood blocks alone.
for k, t in enumerate(['D3', '.', 'A2', '.', 'D3', '.', 'A2', '.']):
    if t != '.':
        P.nota(PIZZ, k * 0.5, 0.5, t, 72, legato=0.5)
percusion(0, 1)
C1 = 4
# First time: bassoon. Second time: clarinet an octave up, bassoon answering an octave down, and a soft pad.
pizz(C1)
percusion(C1, 8)
tema(C1, FAGOT, 88)
glock(C1)
C2 = C1 + 32
pizz(C2)
percusion(C2, 8)
tema(C2, CLARINETE, 84, octava=1)
tema(C2 + 0.5, FAGOT, 60)  # the bassoon echoes, half a beat behind: sneaky
glock(C2)
for i, ch in enumerate(ACORDES):
    P.acorde(CUERDAS, C2 + i * 4, 4, COLCHON[ch], 34, rasgueo=0, legato=1)
# Ending: a tiptoe stop and a «plink».
fin = C2 + 32
P.nota(PIZZ, fin, 0.5, 'D2', 80, legato=0.5)
P.nota(PIZZ, fin + 1, 0.5, 'D4', 70, legato=0.5)
P.nota(GLOCK, fin + 1, 1, 'D6', 60, legato=1)
P.guardar('de-puntillas.mid')
print('ok', fin + 2, 'beats')
