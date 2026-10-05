# «Camiones y Caravanas», the main theme, in the manner of the LucasArts adventures (Sam & Max,
# Monkey Island 2): a sly minor swing. The hook goes up the D minor chord and curls back round
# its third; the descending bass (D, C, B flat, A) under it, a bluesy A flat on the B flat
# seventh. Clarinet first, then muted trumpet with the clarinet on the guide tones, a wistful
# bridge on flute and strings (B flat major seventh, A7, the D7 that lifts into G minor), and
# the hook again with the trombone behind and the trumpet an octave up. Walking bass, rootless
# piano comping, brushes. 140 bpm, swung.
#
#   python3 tema_principal.py          listening version: intro, twice round, ending  -> tema-principal.mp3
#   python3 tema_principal.py bucle    the round three times, cut for a seamless loop -> tema-principal-bucle.mp3
import random
import sys
from orquesta import Orquesta, tocar, walking, comping, escobillas, voz_jazz
from sinte import frase, revisa, acorde, acorde_en, midi, exportar, exportar_bucle

BPM = 140
O = Orquesta(BPM, swing=0.64, semilla=5, sala=1.3)
CLAR = O.instrumento(0, 'clarinete', 71, vol=0, pan=-0.12, reverb=0.22, hp=120)
TPTA = O.instrumento(1, 'trompeta con sordina', 59, vol=-1, pan=0.15, reverb=0.24, hp=150)
FLAU = O.instrumento(2, 'flauta', 73, vol=-2, pan=0.05, reverb=0.3, hp=200)
PIANO = O.instrumento(3, 'piano', 0, vol=1, pan=-0.35, reverb=0.18, hp=110)
BAJO = O.instrumento(4, 'contrabajo', 32, vol=-5, pan=0.0, reverb=0.06, lp=3000)
VIBR = O.instrumento(5, 'vibráfono', 11, vol=2, pan=0.35, reverb=0.3, hp=150)
CUER = O.instrumento(6, 'cuerdas', 49, vol=-3, pan=0.0, reverb=0.4, hp=160)
TBN = O.instrumento(7, 'trombón', 57, vol=-5, pan=0.25, reverb=0.2)
BAT = O.instrumento(9, 'escobillas', 40, vol=-1, pan=0.05, reverb=0.14)
O.rango_bend(TBN, 12)
L = 4

ACORDES_A = [['Dm'], ['Dm7/C'], ['Bb7'], ['A7'], ['Dm'], ['Gm7', 'C7'], ['Fmaj7', 'Bb7'], ['Em7b5', 'A7']]
TEMA_A = frase('D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2 | D5:6 -:2 A4:2 C5:2 D5:2 E5:2 | F5:4 D5:2 F5:2 Ab5:4 G5:2 F5:2 | E5:6 C#5:2 A4:4 -:4 |'
               'D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2 | D5:4 Bb4:2 D5:2 E5:4 G5:4 | A5:4 F5:2 A5:2 Ab5:4 F5:4 | G5:4 E5:2 D5:2 C#5:4 A4:4')
ACORDES_B = [['Bbmaj7'], ['A7'], ['Dm'], ['D7'], ['Gm7'], ['C7'], ['Fmaj7'], ['Em7b5', 'A7']]
TEMA_B = frase('D5:6 F5:2 A5:8 | G5:6 E5:2 C#5:8 | F5:6 E5:2 D5:4 A4:4 | F#5:6 E5:2 C5:4 A4:4 |'
               'Bb5:6 A5:2 G5:4 D5:4 | E5:6 F5:2 G5:4 Bb5:4 | A5:12 G5:2 F5:2 | G5:4 E5:4 C#5:4 A4:4')


def guias(acordes, lo, hi, empieza):
    """Guide tones: the third or the seventh of each chord, each the nearest to the last. A half
    note per chord (a whole bar when there is one chord)."""
    notas, prev = [], midi(empieza)
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            r, iv = acorde(ch)
            pcs_ = {(r + iv[1]) % 12, (r + iv[3]) % 12} if len(iv) > 3 else {(r + iv[1]) % 12, (r + iv[2]) % 12}
            m = min((x for x in range(midi(lo), midi(hi) + 1) if x % 12 in pcs_), key=lambda x: (abs(x - prev), x))
            notas.append((i * L + j * L / len(cs), L / len(cs), m))
            prev = m
    return notas


def colchon(canal, t0, acordes, vel=64):
    prev = None
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            v = voz_jazz(ch, prev, lo='F3', hi='F5')
            prev = v
            O.acorde(canal, t0 + i * L + j * L / len(cs), L / len(cs), v, vel, rasgueo=0, legato=1.0, humano=0.004)


def rip(beat, hasta='A3'):
    """A trombone rip up into the next bar."""
    O.glis(TBN, beat, 0.9, midi(hasta) - 7, hasta, 84, curva=0.7, cola=0.3)


def seccion_ritmica(t, acordes, semilla, vel_bat=80, ride=True, prev=None, final=None):
    walking(O, BAJO, t, acordes, semilla=semilla, final=final)
    escobillas(O, t, len(acordes), vel=vel_bat, ride=ride)
    return comping(O, PIANO, t, acordes, semilla=semilla)


def ronda(t, final='Dm'):
    random.seed(5)
    # A: the clarinet.
    seccion_ritmica(t, ACORDES_A, 1)
    tocar(O, CLAR, t, TEMA_A, 94)
    rip(t + 3 * L + 3, 'A3')
    t += 8 * L
    # A': muted trumpet on the tune, the clarinet below on the guide tones.
    seccion_ritmica(t, ACORDES_A, 2)
    tocar(O, TPTA, t, TEMA_A, 98)
    tocar(O, CLAR, t, guias(ACORDES_A, 'F4', 'C5', 'A4'), 70, legato=0.98, acento=0)
    rip(t + 7 * L + 3, 'D4')
    t += 8 * L
    # B: the bridge, wistful: flute over strings and vibraphone, the ride left alone.
    seccion_ritmica(t, ACORDES_B, 3, vel_bat=72, ride=False)
    tocar(O, FLAU, t, TEMA_B, 92, legato=0.95)
    colchon(CUER, t, ACORDES_B, 62)
    for i, cs in enumerate(ACORDES_B):
        for j, ch in enumerate(cs):
            O.acorde(VIBR, t + i * L + j * L / len(cs), L / len(cs), voz_jazz(ch, lo='A3', hi='A5'), 66, rasgueo=0.03, legato=1.0)
    t += 8 * L
    # A'': everyone. The trumpet an octave up with the clarinet, the trombone on long guide tones.
    seccion_ritmica(t, ACORDES_A, 4, vel_bat=86, final=final)
    tocar(O, CLAR, t, TEMA_A, 96)
    tocar(O, TPTA, t, TEMA_A, 90, oct=1)
    tocar(O, TBN, t, guias(ACORDES_A, 'D3', 'A3', 'F3'), 76, legato=0.95, acento=0)
    for k in range(4):
        O.nota(VIBR, t + 4 * L + k * 2 + 1.5, 0.5, voz_jazz(ACORDES_A[4 + k // 2][0])[-1] + 12, 70)
    return t + 8 * L


RONDA = 32 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('tema-principal-bucle', O.render(hasta=t), RONDA * 60 / BPM, rms_db=-18, fundir=True)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)

# Intro: the rhythm section vamps on the descending bass, the trombone rips into the tune.
INTRO = [['Dm'], ['Dm7/C'], ['Bb7'], ['A7']]
seccion_ritmica(0, INTRO, 9, vel_bat=74)
rip(3 * L + 3, 'A3')
t = ronda(4 * L)
t = ronda(t, final='Dm6')
# Ending: the last two bars again, slowing, onto a held D minor sixth; the clarinet climbs to the top D.
for k, bpm in enumerate((132, 122, 112, 100)):
    O.tempo(t + k * 2, bpm)
walking(O, BAJO, t, [['Em7b5', 'A7']], final='Dm6')
escobillas(O, t, 1, vel=76, ride=True)
tocar(O, CLAR, t, frase('G5:4 E5:2 D5:2 C#5:4 A4:2 C#5:2'), 92)
tocar(O, TPTA, t, frase('G5:4 E5:2 D5:2 C#5:4 A4:2 C#5:2'), 84, oct=1)
comping(O, PIANO, t, [['Em7b5', 'A7']], semilla=11)
t += L
O.nota(BAJO, t, 3, 'D2', 96, legato=1)
O.acorde(PIANO, t, 3, voz_jazz('Dm6'), 80, rasgueo=0.04, legato=1)
O.acorde(VIBR, t, 4, [midi(x) for x in ('A4', 'B4', 'D5', 'F5')], 80, rasgueo=0.05, legato=1)
O.acorde(CUER, t, 4, [midi(x) for x in ('D4', 'F4', 'A4', 'B4')], 70, rasgueo=0, legato=1)
O.nota(TBN, t, 3, 'D3', 80, legato=1)
tocar(O, CLAR, t, frase('D5:1 E5:1 F5:1 A5:1 D6:12'), 94, legato=1)
O.nota(9, t, 2, 49, 74)
O.nota(9, t, 1, 36, 70)
exportar('tema-principal', O.render(), rms_db=-18, fundido=1.5)
