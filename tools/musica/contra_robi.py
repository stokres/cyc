# «Contra Robi»: the boss fight in Bolilandia. Robi only wants to give you a birthday hug, so
# his theme is «Happy Birthday» (public domain) turned to C minor and played by robot bleeps
# (a pulse wave flickering between octaves, from sinte) with a music-box glockenspiel, while the
# orchestra and a rock band fight him: strings in sixteenths, a heroic tune for trumpets and
# horns (C minor, A flat, B flat, G), distorted guitar, picked bass, timpani, a big kit.
# Then a build on toms and rising strings, and the fight tune again with the robot's
# arpeggios on top. 176 bpm.
#
#   python3 contra_robi.py          listening version: intro, twice round, ending  -> contra-robi.mp3
#   python3 contra_robi.py bucle [salida]   the round three times, cut for a seamless loop -> contra-robi-bucle.mp3
#                                (or `salida`, e.g. the game's copy in src/sonido), 128 kbps to stay under 1 MB
import random
import sys
from orquesta import Orquesta, tocar
from sinte import (Cancion, Inst, frase, revisa, acorde, acorde_en, tonos, voz_cerrada, midi, exportar, exportar_bucle,
                   tocar as tocar_chip)

BPM = 176
O = Orquesta(BPM, swing=0.5, semilla=31, sala=1.4)
CUER = O.instrumento(0, 'cuerdas', 48, vol=8, pan=-0.2, reverb=0.25, hp=100)
METAL = O.instrumento(1, 'sección de metales', 61, vol=-5, pan=0.2, reverb=0.25, hp=120)
TPTA = O.instrumento(2, 'trompetas', 56, vol=-2, pan=0.1, reverb=0.25, hp=150)
TROMPA = O.instrumento(3, 'trompas', 60, vol=-3, pan=-0.15, reverb=0.3, hp=90)
TBN = O.instrumento(4, 'trombones', 57, vol=-6, pan=0.3, reverb=0.25)
GUIT = O.instrumento(5, 'guitarra', 30, vol=-8, pan=-0.6, reverb=0.1, hp=90, drive=8, lp=6000)
BAJO = O.instrumento(6, 'bajo', 34, vol=-4, reverb=0.03, drive=4, lp=3500, comp=(-22, 3))
TIMP = O.instrumento(7, 'timbales', 47, vol=-2, reverb=0.35)
GLOCK = O.instrumento(8, 'glockenspiel', 9, vol=2, pan=0.35, reverb=0.3)
BAT = O.instrumento(9, 'batería', 16, vol=0, reverb=0.12, comp=(-20, 3))
L = 4

C = Cancion(BPM)
ROBI = C.pista('Robi', Inst('pulso', duty=0.25, adsr=(0.002, 0.1, 0.75, 0.05), arp=[0, 12], arp_hz=24, ataque=(5, 0.008)),
               vol=-12, pan=0.15, eco=(0.75, 0.25, 0.18, 3500), reverb=0.12)
CHIPARP = C.pista('arpegios robot', Inst('pulso', duty=0.125, adsr=(0.001, 0.08, 0.3, 0.04)),
                  vol=-12, pan=-0.3, eco=(0.75, 0.3, 0.2, 4000), reverb=0.1)

ACORDES_A = [['Cm'], ['Ab'], ['Bb'], ['G'], ['Cm'], ['Ab'], ['Fm'], ['G']]
TEMA_A = frase('C5:6 G4:2 C5:4 Eb5:4 | Eb5:6 C5:2 Ab4:4 C5:4 | D5:6 Bb4:2 F5:4 D5:4 | B4:8 D5:4 G5:4 |'
               'C6:6 G5:2 Eb5:4 C5:4 | Eb5:6 F5:2 Ab5:4 C6:4 | Ab5:6 G5:2 F5:4 C5:4 | B4:4 D5:4 G5:4 F5:4')
# Robi's theme: «Happy Birthday» in C minor, the 3/4 squeezed into 4/4.
ACORDES_R = [['Cm'], ['Ab', 'Cm', 'Gsus4', 'G'], ['G'], ['Ab', 'Cm', 'G', 'Cm'], ['Cm'], ['Cm', 'Cm', 'Gsus4', 'G'], ['Ab', 'Fm'], ['Ab', 'Ab', 'G', 'G']]
TEMA_R = frase('-:12 G4:3 G4:1 | Ab4:4 G4:4 C5:4 B4:4 | _:4 -:8 G4:3 G4:1 | Ab4:4 G4:4 D5:4 C5:4 |'
               '_:4 -:8 G4:3 G4:1 | G5:4 Eb5:4 C5:4 B4:4 | Ab4:8 -:4 F5:3 F5:1 | Eb5:4 C5:4 D5:8')
ACORDES_C = [['Cm'], ['Ab'], ['Bb'], ['G']]


def ostinato(t0, acordes, vel=78, notas_por_tiempo=4):
    """Strings in sixteenths: root, octave, fifth, octave, low and short."""
    paso = 1 / notas_por_tiempo
    for i, cs in enumerate(acordes):
        for k in range(int(L / paso)):
            b = i * L + k * paso
            ch = acorde_en(acordes, b)
            r = next(x for x in range(midi('G2'), midi('G3')) if x % 12 == acorde(ch)[0])
            m = (r, r + 12, r + 7, r + 12)[k % 4]
            O.nota(CUER, t0 + b, paso, m, vel + (10 if k % 4 == 0 else 0), legato=0.45, humano=0.004)


def bajo(t0, acordes, vel=100, modo='corcheas'):
    for i, cs in enumerate(acordes):
        for k in range(8 if modo == 'corcheas' else 4):
            b = i * L + k * (0.5 if modo == 'corcheas' else 1)
            ch = acorde_en(acordes, b)
            r = next(x for x in range(midi('E1'), midi('E2')) if x % 12 == acorde(ch)[0])
            O.nota(BAJO, t0 + b, 0.5, r + (12 if modo == 'corcheas' and k == 7 else 0), vel - (8 if k % 2 else 0), legato=0.7, humano=0.004)


def golpes(t0, acordes, vel=104):
    """Guitar power chords and brass hits: on one and on the 'and' of two."""
    for i, cs in enumerate(acordes):
        r = next(x for x in range(midi('E2'), midi('E3')) if x % 12 == acorde(cs[0])[0])
        for b, d in ((0, 1.5), (1.5, 2.5)):
            O.acorde(GUIT, t0 + i * L + b, d, [r, r + 7, r + 12], vel, rasgueo=0.006, legato=0.9, humano=0.005)


def metales(t0, acordes, vel=88, ritmo=((0, 1.5), (1.5, 2.5))):
    """Brass section chords, plain triads in close position, on the given rhythm."""
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            v = voz_cerrada(ch, 'D5', 4)
            for b, d in ritmo:
                if j * L / len(cs) <= b < (j + 1) * L / len(cs):
                    O.acorde(METAL, t0 + i * L + b, d, v, vel, rasgueo=0.004, legato=0.85, humano=0.005)


def bateria(t0, compases, modo='accion', vel=104):
    for c in range(compases):
        b0 = t0 + c * L
        if modo == 'accion':
            bombo, caja = 'x.....x.x.....x.', '....x.......x...'
            for k in range(16):
                O.nota(9, b0 + k / 4, 0.25, 42, vel - (12 if k % 2 == 0 else 34), humano=0.002)
        else:  # half time, ride
            bombo, caja = 'x.......x.x.....', '........x.......'
            for k in range(8):
                O.nota(9, b0 + k / 2, 0.5, 51, vel - (10 if k % 2 == 0 else 24), humano=0.002)
        for k, ch in enumerate(bombo):
            if ch == 'x':
                O.nota(9, b0 + k / 4, 0.25, 36, vel + 6, humano=0.002)
        for k, ch in enumerate(caja):
            if ch == 'x':
                O.nota(9, b0 + k / 4, 0.25, 38, vel + 10, humano=0.002)
    O.nota(9, t0, 1, 49, vel + 16)


def redoble_toms(t0, compases, vel=90):
    for c in range(compases):
        for k in range(16):
            tom = (41, 43, 45, 47)[c] if c < 3 else (48, 47, 45, 43)[k // 4]
            if c < 2 and k % 2:
                continue
            O.nota(9, t0 + c * L + k / 4, 0.25, tom, vel + c * 6 + (10 if k % 4 == 0 else 0), humano=0.002)
        O.nota(9, t0 + c * L, 0.5, 36, vel + 10)
    for k in range(16):
        O.nota(9, t0 + (compases - 1) * L + k / 4, 0.25, 38, 70 + k * 3, humano=0.002)


def ronda(t):
    random.seed(31)
    # A: the fight. Trumpets and horns on the tune, strings driving, guitar and bass punching.
    ostinato(t, ACORDES_A)
    bajo(t, ACORDES_A)
    golpes(t, ACORDES_A)
    tocar(O, TPTA, t, TEMA_A, 100, legato=0.9)
    tocar(O, TROMPA, t, TEMA_A, 92, oct=-1, legato=0.95)
    for k in (0, 4):
        O.nota(TIMP, t + k * L, 1, 'C2', 110)
    bateria(t, 8)
    t += 8 * L
    # B: Robi sings himself happy birthday; the band goes half time, stabs on two and four.
    tocar_chip(ROBI, t, TEMA_R, 108)
    tocar(O, GLOCK, t, TEMA_R, 84, oct=1, legato=1)
    ostinato(t, ACORDES_R, vel=66, notas_por_tiempo=2)
    bajo(t, ACORDES_R, modo='negras')
    metales(t, ACORDES_R, vel=82, ritmo=((1, 0.5), (3, 0.5)))
    bateria(t, 8, 'medio')
    t += 8 * L
    # C: the build. Toms, the strings climbing, the brass swelling, the robot's alarm.
    for i, (ch, *_) in enumerate(ACORDES_C):
        for k in range(16):
            ts = tonos(ch, 'C4', 'C7')
            O.nota(CUER, t + i * L + k / 4, 0.25, ts[(k + i * 3) % len(ts)], 70 + i * 8 + k, legato=0.5, humano=0.003)
    bajo(t, ACORDES_C)
    metales(t, ACORDES_C, vel=76, ritmo=((0, 4),))
    O.expresion(METAL, t, 4 * L, 50, 127)
    O.expresion(METAL, t + 4 * L, 0.01, 127, 127)
    ROBI.nota(t, 2, 'C5', 104)
    for k in range(12):
        CHIPARP.nota(t + L * 1 + k * 0.5 * 2, 0.5, ('G5', 'C6')[k % 2], 90 + k)
    O.nota(TIMP, t + 3 * L, 4, 'G1', 100)
    for k in range(16):
        O.nota(TIMP, t + 3 * L + k / 4, 0.25, 'G1', 70 + k * 3)
    redoble_toms(t, 4)
    t += 4 * L
    # A': everyone; the brass section harmonises the tune, the robot's arpeggios on top.
    ostinato(t, ACORDES_A, vel=84)
    bajo(t, ACORDES_A, vel=104)
    golpes(t, ACORDES_A, vel=108)
    tocar(O, TPTA, t, TEMA_A, 104, legato=0.9)
    tocar(O, TROMPA, t, TEMA_A, 96, oct=-1, legato=0.95)
    metales(t, ACORDES_A, vel=86)
    tocar(O, TBN, t, [(i * L, L, next(x for x in range(midi('C2'), midi('C3')) if x % 12 == acorde(cs[0])[0])) for i, cs in enumerate(ACORDES_A)], 90, legato=0.9, acento=0)
    for i, cs in enumerate(ACORDES_A):
        ts = tonos(cs[0], 'C5', 'C7')
        for k in range(16):
            CHIPARP.nota(t + i * L + k / 4, 0.25, ts[(0, 1, 2, 3, 2, 1, 2, 3)[k % 8] % len(ts)], 84 + (8 if k % 4 == 0 else 0))
    for k in (0, 4):
        O.nota(TIMP, t + k * L, 1, 'C2', 116)
    bateria(t, 8)
    return t + 8 * L


RONDA = 28 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('contra-robi-bucle', O.render(hasta=t, chip=C, pegamento=(-16, 2)), RONDA * 60 / BPM, rms_db=-17, fundir=True, kbps=128, salida=sys.argv[2] if len(sys.argv) > 2 else None)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('Robi', TEMA_R, ACORDES_R)

# Intro: the robot's bleeps alone, then the strings and a timpani roll.
for k in range(8):
    ROBI.nota(k * 0.5, 0.25, ('C5', 'G5')[k % 2], 96)
ostinato(L, [['Cm']], vel=70)
for k in range(16):
    O.nota(TIMP, L + k / 4, 0.25, 'C2', 60 + k * 3)
O.nota(9, L + 3, 1, 49, 90)
t = ronda(2 * L)
t = ronda(t)
# Ending: the fight tune's last bar, then three hits and Robi's last, sad little bleep.
ostinato(t, [['G']])
tocar(O, TPTA, t, frase('B4:4 D5:4 G5:4 F5:4'), 104)
bajo(t, [['G']])
bateria(t, 1)
t += L
for b in (0, 0.75, 1.5):
    O.acorde(METAL, t + b, 0.5 if b < 1.5 else 2, [midi(x) for x in ('C4', 'Eb4', 'G4', 'C5')], 112, rasgueo=0, legato=0.9)
    O.acorde(GUIT, t + b, 0.5 if b < 1.5 else 2, [midi(x) for x in ('C3', 'G3', 'C4')], 112, rasgueo=0.005, legato=0.9)
    O.nota(BAJO, t + b, 0.5 if b < 1.5 else 2, 'C2', 112, legato=0.9)
    O.nota(TIMP, t + b, 0.5, 'C2', 116)
    O.nota(9, t + b, 0.5, 36, 120)
    O.nota(9, t + b, 1, 49, 116)
O.nota(TPTA, t + 1.5, 2, 'C6', 110)
ROBI.nota(t + 4.5, 0.6, 'G4', 90, desde='C5', deslizar=0.5)
exportar('contra-robi', O.render(chip=C, pegamento=(-16, 2)), rms_db=-17, fundido=1.0)
