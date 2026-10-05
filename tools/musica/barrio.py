# «Por el barrio»: calm, cheerful music for walking about and exploring, in the manner of the
# LucasArts adventures. F major, a lazy two-beat stroll: pizzicato-ish upright bass on one and
# three, a nylon guitar on two and four, brushes barely there. The clarinet climbs each chord
# up to its seventh and sighs back (Fmaj7, Gm7, Am7: a sequence the ear can hum), with rests
# for a bassoon to answer like a grumpy neighbour. A bittersweet bridge on accordion over the
# minor fourth (B flat minor sixth), and the tune again with flute, clarinet and glockenspiel.
# Space between phrases, so it can sit under dialogue. 105 bpm, lightly swung.
#
#   python3 barrio.py          listening version: intro, twice round, ending  -> barrio.mp3
#   python3 barrio.py bucle    the round three times, cut for a seamless loop -> barrio-bucle.mp3
import random
import sys
from orquesta import Orquesta, tocar, voz_jazz, raiz_en
from sinte import frase, revisa, acorde, acorde_en, midi, exportar, exportar_bucle

BPM = 105
O = Orquesta(BPM, swing=0.58, semilla=8, sala=1.5)
CLAR = O.instrumento(0, 'clarinete', 71, vol=0, pan=-0.1, reverb=0.24, hp=120)
FLAU = O.instrumento(1, 'flauta', 73, vol=-3, pan=0.12, reverb=0.3, hp=200)
FAG = O.instrumento(2, 'fagot', 70, vol=-1, pan=0.3, reverb=0.22, hp=60)
ACOR = O.instrumento(3, 'acordeón', 21, vol=4, pan=-0.05, reverb=0.28, hp=150)
GUIT = O.instrumento(4, 'guitarra', 24, vol=0, pan=-0.35, reverb=0.2, hp=110)
BAJO = O.instrumento(5, 'contrabajo', 32, vol=-4, reverb=0.06, lp=2500)
CUER = O.instrumento(6, 'cuerdas', 49, vol=-4, reverb=0.4, hp=160)
GLOCK = O.instrumento(7, 'glockenspiel', 9, vol=1, pan=0.3, reverb=0.3)
BAT = O.instrumento(9, 'escobillas', 40, vol=8, pan=0.05, reverb=0.15)
L = 4

ACORDES_A = [['Fmaj7'], ['Dm7'], ['Gm7'], ['C7'], ['Am7'], ['D7'], ['Gm7', 'C7'], ['F6']]
TEMA_A = frase('-:2 F4:2 A4:2 C5:2 E5:6 -:2 | D5:2 C5:2 A4:4 -:8 | -:2 G4:2 Bb4:2 D5:2 F5:6 -:2 | E5:2 D5:2 Bb4:4 -:8 |'
               '-:2 A4:2 C5:2 E5:2 G5:6 -:2 | F#5:2 E5:2 D5:2 C5:2 A4:4 -:4 | Bb4:2 A4:2 G4:2 Bb4:2 E5:4 D5:2 C5:2 | A4:8 -:8')
# The bassoon's answers in the tune's rests: it creeps up, grumbles down, and has the last word.
FAGOT_A = frase('-:16 | -:8 F3:2 G3:2 A3:2 C4:2 | -:16 | -:8 G3:2 E3:2 C3:4 | -:16 | -:12 D3:2 F#3:2 | -:16 | -:8 C3:2 F3:6')
ACORDES_B = [['Bbmaj7'], ['Bbm6'], ['Am7'], ['D7'], ['Gm7'], ['C7'], ['F6'], ['Gm7', 'C7']]
TEMA_B = frase('D5:6 C5:2 A4:8 | Db5:6 C5:2 G4:8 | C5:6 B4:2 C5:4 E5:4 | F#5:6 E5:2 D5:4 C5:4 |'
               'Bb4:6 A4:2 Bb4:4 D5:4 | G5:6 F5:2 E5:4 C5:4 | F5:4 D5:4 C5:8 | D5:4 Bb4:4 G4:4 E4:4')


def paseo(t0, acordes, vel=84, semilla=0):
    """The stroll: bass on one and three (root, then fifth), a step into each new chord; guitar
    chords on two and four, voice-led."""
    rnd = random.Random(semilla)
    prev = None
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            mitad = L // len(cs)
            r = raiz_en(ch, 'E1', 'D#2') + 12
            r = r - 12 if r > midi('D3') else r
            b0 = t0 + i * L + j * mitad
            O.nota(BAJO, b0, 1, r, vel + 8, legato=0.97, humano=0.008)
            if mitad == 4:
                quinta = r + 7 if r + 7 <= midi('D3') else r - 5
                O.nota(BAJO, b0 + 2, 1, quinta, vel, legato=0.97, humano=0.008)
                sig = acordes[(i + 1) % len(acordes)][0]
                if sig != ch and rnd.random() < 0.6:  # a pickup into the next chord
                    rs = raiz_en(sig, 'E1', 'D#2') + 12
                    rs = rs - 12 if rs > midi('D3') else rs
                    O.nota(BAJO, b0 + 3.5, 0.5, rs + rnd.choice((-1, 1, 2)), vel - 10, legato=0.7, humano=0.008)
            v = voz_jazz(ch, prev, lo='E3', hi='D5')
            prev = v
            for b in ((1, 3) if mitad == 4 else (1,)):
                O.acorde(GUIT, b0 + b, 0.5, v, vel - 16 + rnd.randint(-4, 4), rasgueo=0.018, legato=1.9, humano=0.01)


def escobillas(t0, compases, vel=62):
    for c in range(compases):
        for b in range(L):
            O.nota(9, t0 + c * L + b, 1, 40, vel - 18 + (6 if b % 2 == 0 else 0), humano=0.006)
            if b % 2:
                O.nota(9, t0 + c * L + b, 0.5, 38, vel - 8, humano=0.006)


def colchon(t0, acordes, vel=58):
    prev = None
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            v = voz_jazz(ch, prev, lo='F3', hi='F5')
            prev = v
            O.acorde(CUER, t0 + i * L + j * L / len(cs), L / len(cs), v, vel, rasgueo=0, legato=1.0, humano=0.004)


def ronda(t):
    random.seed(8)
    # A: the clarinet strolls, the bassoon keeps quiet.
    paseo(t, ACORDES_A, semilla=1)
    escobillas(t, 8)
    tocar(O, CLAR, t, TEMA_A, 90, legato=0.85)
    t += 8 * L
    # A': the flute an octave up, the bassoon answers in the gaps.
    paseo(t, ACORDES_A, semilla=2)
    escobillas(t, 8)
    tocar(O, FLAU, t, TEMA_A, 88, oct=1, legato=0.85)
    tocar(O, FAG, t, FAGOT_A, 92, legato=0.8)
    t += 8 * L
    # B: bittersweet, the accordion over the strings.
    paseo(t, ACORDES_B, vel=78, semilla=3)
    escobillas(t, 8, vel=56)
    tocar(O, ACOR, t, TEMA_B, 84, legato=0.95)
    colchon(t, ACORDES_B)
    t += 8 * L
    # A'': clarinet and flute in octaves, the bassoon again, a glockenspiel sparkle at the end.
    paseo(t, ACORDES_A, semilla=4)
    escobillas(t, 8)
    tocar(O, CLAR, t, TEMA_A, 90, legato=0.85)
    tocar(O, FLAU, t, TEMA_A, 80, oct=1, legato=0.85)
    tocar(O, FAG, t, FAGOT_A, 92, legato=0.8)
    for k, x in enumerate(('F5', 'A5', 'C6', 'E6', 'F6')):
        O.nota(GLOCK, t + 7 * L + 2 + k * 0.5, 1, x, 74 + k * 4)
    return t + 8 * L


RONDA = 32 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('barrio-bucle', O.render(hasta=t), RONDA * 60 / BPM, rms_db=-19, fundir=True)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('fagot', FAGOT_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)

# Intro: two bars of the stroll on F and the turnaround.
paseo(0, [['Fmaj7'], ['Gm7', 'C7']], semilla=9)
escobillas(0, 2)
t = ronda(2 * L)
t = ronda(t)
# Ending: the first phrase once more, the bassoon has the last word, slowing onto F6.
for k, bpm in enumerate((100, 94, 86)):
    O.tempo(t + L + k, bpm)
paseo(t, [['Fmaj7'], ['Dm7']], semilla=5)
tocar(O, CLAR, t, frase('-:2 F4:2 A4:2 C5:2 E5:6 -:2 | D5:2 C5:2 A4:4 -:8'), 88)
tocar(O, FAG, t, frase('-:16 | -:8 C3:2 F3:6'), 92)
t += 2 * L
O.nota(BAJO, t, 3, 'F1', 92, legato=1)
O.acorde(GUIT, t, 3, [midi(x) for x in ('F3', 'A3', 'D4', 'G4', 'C5')], 72, rasgueo=0.06, legato=1)
O.acorde(CUER, t, 4, [midi(x) for x in ('A3', 'C4', 'D4', 'F4')], 60, rasgueo=0, legato=1)
O.nota(GLOCK, t, 2, 'A6', 70)
O.nota(9, t, 1, 40, 56)
exportar('barrio', O.render(), rms_db=-19, fundido=1.5)
