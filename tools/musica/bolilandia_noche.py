# «Bolilandia, cerrado»: Chuchi locked in the ball park at night (his story in chapter 1).
# A fairground waltz on a music box, the kind that plays in a play park all day long, heard
# at night with the lights out: D minor, 3/4, a carousel tune that climbs each chord and
# sighs back down, a sunnier middle in F that the dark pulls back into D minor (A7 with a flat
# ninth, a creak in the floorboards). Pizzicato on tiptoe for the waltz, the woodblock ticking
# like someone feeling their way, a bassoon that grumbles in the gaps (Chuchi, without his
# glasses), choir far off. Funny-spooky rather than scary, in the manner of the LucasArts
# adventures.
#
# «luz»: the same score once the fuse box is switched on and the park wakes up (Robi too): the
# tune on glockenspiel and xylophone, then a calliope, tuba and piano for the oom-pah-pah, a
# light kit with tambourine, flute and clarinet in the middle, and a slide whistle. Same tempo
# and length as the dark one.
#
#   python3 bolilandia_noche.py               listening version (dark): intro, twice round, the box runs down
#   python3 bolilandia_noche.py luz           listening version with the lights on
#   python3 bolilandia_noche.py bucle [salida]       the round three times, cut for a seamless loop
#   python3 bolilandia_noche.py luz bucle [salida]   (the game's src/sonido/bolilandia.mp3 and bolilandia-luz.mp3)
import random
import sys
from orquesta import Orquesta, tocar
from sinte import frase, revisa, acorde, tonos, midi, exportar, exportar_bucle

args = sys.argv[1:]
LUZ = 'luz' in args
args = [a for a in args if a != 'luz']
BUCLE = bool(args) and args[0] == 'bucle'
SALIDA = args[1] if BUCLE and len(args) > 1 else None

BPM = 138
L = 3  # beats in a bar: a waltz
O = Orquesta(BPM, swing=0.5, semilla=33, sala=1.6 if not LUZ else 1.2)
if not LUZ:
    CAJA = O.instrumento(0, 'caja de música', 10, vol=7, pan=-0.1, reverb=0.35, hp=300)
    CELE = O.instrumento(1, 'celesta', 8, vol=-1, pan=0.35, reverb=0.4, hp=250)
    VIB = O.instrumento(2, 'vibráfono', 11, vol=-2, pan=0.15, reverb=0.35, hp=150)
    PIZZ = O.instrumento(3, 'pizzicato', 45, vol=-2, pan=-0.2, reverb=0.2)
    FAG = O.instrumento(4, 'fagot', 70, vol=-9, pan=0.25, reverb=0.22, hp=60)
    CORO = O.instrumento(5, 'coro lejano', 52, vol=-9, pan=-0.3, reverb=0.6, hp=200, lp=5000)
    BAT = O.instrumento(9, 'percusión', 0, vol=-2, pan=0.2, reverb=0.25)
else:
    GLOCK = O.instrumento(0, 'glockenspiel', 9, vol=3, pan=0.25, reverb=0.25)
    XILO = O.instrumento(1, 'xilófono', 13, vol=6, pan=-0.25, reverb=0.2, hp=200)
    CALI = O.instrumento(2, 'calíope', 82, vol=-6, pan=0.05, reverb=0.25, hp=250, lp=6000)
    TUBA = O.instrumento(3, 'tuba', 58, vol=-11, pan=0.0, reverb=0.12, lp=2500)
    PIANO = O.instrumento(4, 'piano', 3, vol=-3, pan=-0.15, reverb=0.18, hp=150)
    FLAU = O.instrumento(5, 'flauta', 73, vol=-9, pan=0.15, reverb=0.28, hp=200)
    CLAR = O.instrumento(6, 'clarinete', 71, vol=-9, pan=-0.2, reverb=0.24, hp=120)
    SILB = O.instrumento(7, 'silbato', 78, vol=-22, pan=0.3, reverb=0.25)
    O.rango_bend(SILB, 12)
    BAT = O.instrumento(9, 'batería', 0, vol=-1, pan=0.1, reverb=0.15)

# The carousel tune: up each chord in quarters, a long note and a sigh back down.
ACORDES_A = [['Dm'], ['Dm'], ['A7'], ['A7'], ['Gm'], ['Dm'], ['Bb'], ['A7'],
             ['Dm'], ['Dm'], ['A7b9'], ['A7'], ['Gm'], ['Dm'], ['A7'], ['Dm']]
TEMA_A = frase('A4:4 D5:4 F5:4 | A5:8 G5:2 F5:2 | E5:4 C#5:4 E5:4 | G5:8 E5:2 C#5:2 |'
               'D5:4 G5:4 Bb5:4 | A5:4 F5:4 D5:4 | F5:4 D5:4 Bb4:4 | A4:8 -:4 |'
               'A4:4 D5:4 F5:4 | A5:8 G5:2 F5:2 | E5:4 G5:4 Bb5:4 | A5:4 G5:2 F5:2 E5:4 |'
               'D5:4 G5:4 Bb5:4 | A5:4 F5:4 D5:4 | E5:4 C#5:4 E5:4 | D5:8 -:4', largo=12)
# The bassoon's grumbles in the tune's long notes and rests.
FAGOT_A = frase('-:12 | -:4 D3:2 E3:2 F3:4 | -:12 | -:4 A3:2 G3:2 E3:4 | -:12 | -:12 | -:4 Bb2:4 D3:4 | C#3:4 E3:4 A3:4 |'
                '-:12 | -:4 F3:2 E3:2 D3:4 | -:12 | -:4 C#3:2 D3:2 E3:4 | -:12 | -:12 | -:4 A2:4 C#3:4 | D3:4 A2:4 D2:4', largo=12)
# The middle: the park as it is by day, in F, until A7 takes it back to D minor.
ACORDES_B = [['F'], ['C7'], ['C7'], ['F'], ['Bb'], ['F'], ['G7'], ['C7'],
             ['F'], ['A7'], ['Dm'], ['Dm'], ['Gm'], ['Dm'], ['E7'], ['A7']]
TEMA_B = frase('C5:4 F5:4 A5:4 | G5:8 E5:4 | Bb5:4 G5:4 E5:4 | F5:8 -:4 |'
               'D5:4 F5:4 Bb5:4 | A5:4 F5:4 C5:4 | B4:4 D5:4 F5:4 | E5:8 -:4 |'
               'C5:4 F5:4 A5:4 | C#6:8 A5:4 | D6:4 A5:4 F5:4 | D5:8 -:4 |'
               'Bb5:4 G5:4 D5:4 | F5:4 A5:4 D6:4 | B5:4 G#5:4 E5:4 | C#5:4 E5:4 A5:4', largo=12)


def raiz(ch, lo='D2', hi='C#3'):
    pc = acorde(ch)[0]
    return next(x for x in range(midi(lo), midi(hi) + 1) if x % 12 == pc)


def pah(ch):
    """The waltz's two after-beats: third, fifth and seventh (or root) in close position."""
    r, iv = acorde(ch)
    quiero = [(r + iv[1]) % 12, (r + iv[2]) % 12, (r + (iv[3] if len(iv) > 3 else 0)) % 12]
    return sorted(next(x for x in range(midi('F3'), midi('F4') + 1) if x % 12 == pc) for pc in quiero)


def vals(t0, acordes, bajo, arriba, vel=84, staccato=0.35):
    """Oom-pah-pah: the bass on one (root, then the fifth while the chord lasts), the chord on two and three."""
    for i, (ch, *_) in enumerate(acordes):
        b = t0 + i * L
        r = raiz(ch)
        mismo = i > 0 and acordes[i - 1][0] == ch
        quinta = r + 7 if r + 7 <= midi('C#3') else r - 5
        O.nota(bajo, b, 1, quinta if mismo else r, vel + 8, legato=staccato + 0.15, humano=0.008)
        for k in (1, 2):
            O.acorde(arriba, b + k, 1, pah(ch), vel - 14 - (4 if k == 2 else 0), rasgueo=0.006, legato=staccato, humano=0.008)


def tictac(t0, compases, vel=60):
    """In the dark: the woodblock on one, softer on two and three, feeling its way."""
    for c in range(compases):
        for k in range(L):
            O.nota(9, t0 + c * L + k, 0.5, 76 if k == 0 else 77, vel - (16 if k else 0), humano=0.004)


def bateria(t0, compases, vel=72, pandereta=False):
    """Lights on: kick on one, hi-hat on two and three, the tambourine with them, a snare fill to finish."""
    for c in range(compases):
        b = t0 + c * L
        O.nota(9, b, 0.5, 36, vel, humano=0.004)
        for k in (1, 2):
            O.nota(9, b + k, 0.5, 42, vel - 18, humano=0.004)
            if pandereta:
                O.nota(9, b + k, 0.5, 54, vel - 22, humano=0.004)
    O.nota(9, t0 + compases * L - 1, 0.5, 38, vel - 10, humano=0.004)
    O.nota(9, t0 + compases * L - 0.5, 0.5, 38, vel - 4, humano=0.004)


def triangulo(t0, compases=(7, 15), vel=64):
    """A triangle at the end of each half of the tune, where it rests."""
    for c in compases:
        O.nota(9, t0 + c * L + 2, 1, 81, vel, humano=0.004)


def colchon(t0, acordes, vel=50):
    """The far-off choir: the chord held all bar."""
    for i, (ch, *_) in enumerate(acordes):
        O.acorde(CORO, t0 + i * L, L, pah(ch), vel, rasgueo=0, legato=1.0, humano=0.004)


def chispas(t0, acordes, canal, compases=(1, 3, 9, 11), vel=66):
    """Little arpeggios up where the tune holds a long note."""
    for c in compases:
        ch = acordes[c][0]
        for k, m in enumerate(tonos(ch, 'A5', 'A6')[:3]):
            O.nota(canal, t0 + c * L + 1 + k * 0.5, 1, m, vel + k * 4, humano=0.006)


def silbato(t0, vel=80):
    """A slide whistle up, the party kind (in the tune's rest)."""
    O.glis(SILB, t0, 1, 'C5', 'C6', vel, curva=0.8)


def ronda(t):
    random.seed(33)
    if not LUZ:
        # A: the music box alone over the tiptoeing pizzicato, the woodblock feeling its way.
        vals(t, ACORDES_A, PIZZ, PIZZ)
        tictac(t, 16)
        tocar(O, CAJA, t, TEMA_A, 92, legato=0.9)
        chispas(t, ACORDES_A, CELE)
        triangulo(t)
        t += 16 * L
        # B: the park by day, on the vibraphone with the celesta an octave up; the bassoon takes the bass.
        vals(t, ACORDES_B, FAG, PIZZ, vel=78)
        tictac(t, 16, vel=50)
        tocar(O, VIB, t, TEMA_B, 86, legato=0.95)
        tocar(O, CELE, t, TEMA_B, 70, oct=1, legato=0.9)
        t += 16 * L
        # A': music box and bassoon grumbling in its gaps, the choir far off.
        vals(t, ACORDES_A, PIZZ, PIZZ)
        tictac(t, 16)
        tocar(O, CAJA, t, TEMA_A, 92, legato=0.9)
        tocar(O, FAG, t, FAGOT_A, 90, legato=0.7)
        colchon(t, ACORDES_A)
        triangulo(t)
        return t + 16 * L
    # A: glockenspiel and xylophone together, tuba and piano for the waltz, the kit.
    vals(t, ACORDES_A, TUBA, PIANO, vel=88, staccato=0.45)
    bateria(t, 16)
    tocar(O, GLOCK, t, TEMA_A, 86, legato=0.9)
    tocar(O, XILO, t, TEMA_A, 90, legato=0.7)
    silbato(t + 7 * L + 2)
    t += 16 * L
    # B: flute, the clarinet an octave down, the glockenspiel sparkling.
    vals(t, ACORDES_B, TUBA, PIANO, vel=80, staccato=0.45)
    bateria(t, 16, vel=64)
    tocar(O, FLAU, t, TEMA_B, 88, legato=0.9)
    tocar(O, CLAR, t, TEMA_B, 76, oct=-1, legato=0.9)
    chispas(t, ACORDES_B, GLOCK, compases=(1, 3, 7, 11))
    t += 16 * L
    # A': the calliope on top, everyone in, the tambourine, the whistle again at the end.
    vals(t, ACORDES_A, TUBA, PIANO, vel=90, staccato=0.45)
    bateria(t, 16, vel=78, pandereta=True)
    tocar(O, CALI, t, TEMA_A, 90, legato=0.85)
    tocar(O, GLOCK, t, TEMA_A, 80, oct=1, legato=0.9)
    tocar(O, XILO, t, TEMA_A, 84, legato=0.7)
    silbato(t + 15 * L + 2, vel=86)
    return t + 16 * L


RONDA = 48 * L
NOMBRE = 'bolilandia-luz' if LUZ else 'bolilandia'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle(f'{NOMBRE}-bucle', O.render(hasta=t), RONDA * 60 / BPM, rms_db=-19, fundir=True, salida=SALIDA)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A, largo=L)
    revisa('fagot', FAGOT_A, ACORDES_A, largo=L)
    revisa('B', TEMA_B, ACORDES_B, largo=L)

# Intro: two bars of the waltz.
if LUZ:
    vals(0, [['Dm'], ['A7']], TUBA, PIANO, vel=88, staccato=0.45)
    bateria(0, 2)
else:
    vals(0, [['Dm'], ['A7']], PIZZ, PIZZ)
    tictac(0, 2)
t = ronda(2 * L)
t = ronda(t)
if LUZ:
    # Ending: the last phrase's cadence, a slide whistle and the last chord all together.
    O.acorde(PIANO, t, 3, [midi(x) for x in ('D3', 'F3', 'A3', 'D4')], 96, rasgueo=0.01, legato=1)
    O.nota(TUBA, t, 3, 'D2', 100, legato=1)
    O.nota(GLOCK, t, 3, 'D6', 96)
    O.nota(XILO, t, 1, 'D5', 100)
    O.nota(9, t, 1, 49, 100)
    O.nota(9, t, 1, 36, 110)
    silbato(t + 1, vel=96)
    exportar(NOMBRE, O.render(), rms_db=-19, fundido=1.0)
else:
    # Ending: the music box runs out of spring. The first phrase once more, slowing to a stop.
    for k, bpm in enumerate((126, 112, 96, 80, 64)):
        O.tempo(t + 3 * L + k * 1.5, bpm)
    tocar(O, CAJA, t, frase('A4:4 D5:4 F5:4 | A5:8 G5:2 F5:2 | E5:4 C#5:4 E5:4 | F5:4 E5:4 D5:4', largo=12), 90, legato=0.95)
    vals(t, [['Dm'], ['Dm'], ['A7'], ['Dm']], PIZZ, PIZZ, vel=72)
    t += 4 * L
    O.nota(CAJA, t, 3, 'D5', 70)
    O.nota(FAG, t, 3, 'D2', 74, legato=0.5)
    exportar(NOMBRE, O.render(), rms_db=-19, fundido=1.5)
