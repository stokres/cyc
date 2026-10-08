# «Bar del Río»: the rock bar's jukebox, as rock as a General MIDI bank allows. E minor, 140 bpm,
# straight eighths. A riff of palm-muted chugs on the low E answered by power chords (G, A, then
# B, A, G, F sharp back down), two rhythm guitars hard left and right, picked bass doubling the
# riff, a rock organ, a big kit. The chorus is two lead guitars in harmony (the twin-guitar sound
# of the seventies) over C, D, E minor and a B major that pulls back home; a solo with bends and
# vibrato over E minor, C, D and B. Amp grit, a compressor on the drums and on the whole mix.
#
#   python3 bar_rockero.py          listening version, and the same heard from outside the door
#                                   -> bar-rockero.mp3, bar-rockero-puerta.mp3
#   python3 bar_rockero.py bucle [salida]    the round three times, cut for a seamless loop -> bar-rockero-bucle.mp3
#   python3 bar_rockero.py puerta [salida]   the same loop heard from the street (the game's src/sonido/bar-puerta.mp3)
import random
import re
import sys
import numpy as np
from orquesta import Orquesta, _filtro, _sala
from sinte import SR, frase, revisa, acorde, acorde_en, tonos, tercera_abajo, escala, midi, exportar, exportar_bucle

BPM = 140
O = Orquesta(BPM, swing=0.5, semilla=21, sala=1.1)
GTR_I = O.instrumento(0, 'guitarra rítmica izquierda', 30, vol=-5, pan=-0.85, reverb=0.1, hp=90, drive=8, lp=6500)
GTR_D = O.instrumento(1, 'guitarra rítmica derecha', 30, vol=-5, pan=0.85, reverb=0.1, hp=90, drive=8, lp=6500)
MUT_I = O.instrumento(2, 'apagado izquierda', 28, vol=-11, pan=-0.7, reverb=0.06, hp=80, drive=20, lp=4200)
MUT_D = O.instrumento(3, 'apagado derecha', 28, vol=-11, pan=0.7, reverb=0.06, hp=80, drive=20, lp=4200)
BAJO = O.instrumento(4, 'bajo', 34, vol=-3, reverb=0.03, drive=6, lp=3500, comp=(-22, 3))
ORG = O.instrumento(5, 'órgano', 18, vol=-5, pan=0.1, reverb=0.2, hp=120)
SOL1 = O.instrumento(6, 'solista', 29, vol=2, pan=-0.2, reverb=0.25, hp=150, drive=6, lp=7000)
SOL2 = O.instrumento(7, 'solista armonía', 29, vol=-1, pan=0.25, reverb=0.25, hp=150, drive=6, lp=7000)
BAT = O.instrumento(9, 'batería', 16, vol=2, reverb=0.12, comp=(-20, 3.5))
O.rango_bend(SOL1, 12)
O.rango_bend(SOL2, 12)
L = 4
RAIZ = {'E': 'E2', 'G': 'G2', 'A': 'A2', 'B': 'B2', 'D': 'D3', 'C': 'C3', 'F#': 'F#2'}

# Riffs in sixteenths: (start, length, root, palm-muted?)
RIFF_E = [[(0, 2, 'E', 1), (2, 2, 'E', 1), (4, 2, 'E', 1), (6, 3, 'G', 0), (9, 3, 'A', 0), (12, 2, 'E', 1), (14, 2, 'E', 1)],
          [(0, 2, 'E', 1), (2, 2, 'E', 1), (4, 2, 'E', 1), (6, 3, 'B', 0), (9, 3, 'A', 0), (12, 2, 'G', 0), (14, 2, 'F#', 0)]]
RIFF_A = [[(0, 2, 'A', 1), (2, 2, 'A', 1), (4, 2, 'A', 1), (6, 3, 'C', 0), (9, 3, 'D', 0), (12, 2, 'A', 1), (14, 2, 'A', 1)],
          [(0, 2, 'A', 1), (2, 2, 'A', 1), (4, 2, 'A', 1), (6, 3, 'E', 0), (9, 3, 'D', 0), (12, 2, 'C', 0), (14, 2, 'B', 0)]]

ACORDES_E = [['C'], ['D'], ['Em'], ['Em'], ['C'], ['D'], ['B'], ['B']]
LEAD_E = frase('E5:6 D5:2 C5:4 G4:4 | F#5:6 E5:2 D5:4 A4:4 | G5:6 F#5:2 E5:4 B4:4 | E5:12 -:4 |'
               'E5:6 D5:2 C5:4 E5:4 | F#5:6 E5:2 D5:4 F#5:4 | D#5:6 F#5:2 B5:8 | A5:4 F#5:4 D#5:4 B4:4')
ACORDES_S = [['Em'], ['Em'], ['C'], ['D'], ['Em'], ['Em'], ['C'], ['B']]
# The solo: NOTE^n bends up n semitones into the note, a trailing 'v' adds vibrato.
SOLO = ('B4^2:6 A4:2 G4:2 E4:2 G4:2 A4:2 | B4:4 D5^2:4 E5:8v | G5:2 E5:2 D5:2 E5:2 G5:4 E5:4 | F#5^1:6 E5:2 D5:4 A4:4 |'
        'E5:2 G5:2 A5:2 B5:2 D6:4 B5:2 A5:2 | B5^2:12v G5:2 E5:2 | E5:2 G5:2 C6:4 B5:2 G5:2 E5:4 | D#5:4 F#5:4 B5:8v')
MENOR = escala('E', 'menor')


def solo(t0, texto, vel=104):
    pos = 0
    for compas in texto.split('|'):
        for tok in compas.split():
            nota, d = tok.split(':')
            vib = d.endswith('v')
            d = int(d.rstrip('v'))
            m = re.match(r'([A-G][#b]?\d)(?:\^(\d))?', nota)
            sube = int(m.group(2) or 0)
            O.cuerda(SOL1, t0 + pos / 4, d / 4, m.group(1), vel + (8 if pos % 4 == 0 else 0), sube=sube,
                     cuando=0.3 if sube else 0.25, vib=28 if vib else 0)
            pos += d


def power(canal, beat, dur, raiz, vel, legato=0.95):
    r = midi(RAIZ[raiz])
    O.acorde(canal, beat, dur, [r, r + 7, r + 12], vel, rasgueo=0.008, legato=legato, humano=0.006)


def riff(t0, compases, vel=104):
    """Both guitars (and the muted chugs) play the riff, each with its own small wobble; the bass doubles it."""
    for c, compas in enumerate(compases):
        for (p, d, raiz, apagado) in compas:
            b = t0 + c * L + p / 4
            if apagado:
                for canal in (MUT_I, MUT_D):
                    O.acorde(canal, b, d / 4, [midi(RAIZ[raiz]), midi(RAIZ[raiz]) + 7], vel - 6, rasgueo=0.004, legato=0.5, humano=0.006)
            else:
                for canal in (GTR_I, GTR_D):
                    power(canal, b, d / 4, raiz, vel + 4)
            O.nota(BAJO, b, d / 4, midi(RAIZ[raiz]) - 12, vel, legato=0.6 if apagado else 0.9, humano=0.005)


def acordes_largos(t0, acordes, vel=108):
    """The chorus: power chords ringing, pushed on the 'and' of two; bass in eighths."""
    for i, (ch, *_) in enumerate(acordes):
        raiz = ch.rstrip('m')
        for canal in (GTR_I, GTR_D):
            power(canal, t0 + i * L, 1.5, raiz, vel)
            power(canal, t0 + i * L + 1.5, 2.5, raiz, vel - 6)
        for k in range(8):
            O.nota(BAJO, t0 + i * L + k * 0.5, 0.5, midi(RAIZ[raiz]) - 12, vel - (8 if k % 2 else 0), legato=0.8, humano=0.005)


def organo(t0, acordes, vel=74, largo=True):
    for i, (ch, *_) in enumerate(acordes):
        notas = tonos(ch, 'G3', 'G4')[:3] + [tonos(ch, 'G3', 'G4')[0] + 12]
        if largo:
            O.acorde(ORG, t0 + i * L, L, notas, vel, rasgueo=0, legato=1.0, humano=0.004)
        else:
            for b in (0, 1.5):
                O.acorde(ORG, t0 + i * L + b, 0.5, notas, vel, rasgueo=0, legato=0.7, humano=0.004)


def armonia(t0, notas, acordes, vel):
    """The second lead a third below: a chord tone on held notes, a scale third on quick ones."""
    for b, d, m, *_ in notas:
        ch = acorde_en(acordes, b)
        if d >= 0.75:
            h = max(x for x in tonos(ch, m - 9, m - 3))
        else:
            h = tercera_abajo(m, MENOR - {2} | {3} if ch == 'B' else MENOR)
        O.cuerda(SOL2, t0 + b, d, h, vel, vib=22 if d >= 2 else 0)


def lead(t0, notas, vel):
    for b, d, m, *_ in notas:
        O.cuerda(SOL1, t0 + b, d, m, vel + (6 if b % 1 == 0 else 0), vib=26 if d >= 2 else 0)


def bateria(t0, compases, modo='riff', vel=104, relleno=True, crash=True):
    """Kick, snare, hats or ride; a tom fill in the last beat; a crash on the first."""
    for c in range(compases):
        b0 = t0 + c * L
        bombo = 'x.....x..x......' if modo == 'riff' else 'x.......x.x.....'
        for k, ch in enumerate(bombo):
            if ch == 'x':
                O.nota(9, b0 + k / 4, 0.25, 36, vel + 6, humano=0.003)
        ultimo = relleno and c == compases - 1
        for b in ((1, 3) if not ultimo else (1,)):
            O.nota(9, b0 + b, 0.5, 38, vel + 10, humano=0.003)
        for k in range(8 if not ultimo else 6):
            if modo == 'estribillo':
                O.nota(9, b0 + k / 2, 0.5, 46 if k % 2 else 51, vel - (20 if k % 2 else 6), humano=0.003)
            else:
                O.nota(9, b0 + k / 2, 0.5, 42, vel - (24 if k % 2 else 10), humano=0.003)
        if ultimo:
            for k, tom in enumerate((50, 48, 45, 43, 41, 41, 38, 38)):
                O.nota(9, b0 + 2 + k / 4, 0.25, tom, vel + k * 2, humano=0.003)
    if crash:
        O.nota(9, t0, 1, 49, vel + 14, humano=0.002)
        O.nota(9, t0, 1, 36, vel + 10, humano=0.002)


def ronda(t):
    random.seed(21)
    # The riff, twice.
    riff(t, RIFF_E * 2)
    bateria(t, 4, relleno=True)
    t += 4 * L
    # Verse: the riff on E, then on A, then E again; the organ underneath.
    riff(t, RIFF_E + RIFF_E + RIFF_A + RIFF_E)
    organo(t, [['Em'], ['Em'], ['Em'], ['Em'], ['Am'], ['Am'], ['Em'], ['Em']], vel=66)
    bateria(t, 8)
    t += 8 * L
    # Chorus: twin leads in harmony over ringing chords and the organ.
    acordes_largos(t, ACORDES_E)
    lead(t, LEAD_E, 100)
    armonia(t, LEAD_E, ACORDES_E, 92)
    organo(t, ACORDES_E, vel=80)
    bateria(t, 8, 'estribillo')
    t += 8 * L
    # The riff again.
    riff(t, RIFF_E * 2)
    bateria(t, 4)
    t += 4 * L
    # Solo: the riff where the chord is E minor, ringing chords elsewhere.
    for i, (ch, *_) in enumerate(ACORDES_S):
        if ch == 'Em':
            riff(t + i * L, [RIFF_E[i % 2]], vel=96)
        else:
            acordes_largos(t + i * L, [[ch]], vel=100)
    solo(t, SOLO)
    organo(t, ACORDES_S, vel=70)
    bateria(t, 8, 'estribillo')
    t += 8 * L
    # Chorus to finish the round.
    acordes_largos(t, ACORDES_E)
    lead(t, LEAD_E, 104)
    armonia(t, LEAD_E, ACORDES_E, 96)
    organo(t, ACORDES_E, vel=84)
    bateria(t, 8, 'estribillo')
    return t + 8 * L


def tras_la_puerta(x):
    """The same mix heard from the street: the wall keeps the lows (kick, bass, the guitars' body)
    and some of the mids, none of the highs; nearly mono; a small hall outside. The cut is at
    1.5 kHz, not lower (8 October 2026): a phone's speaker plays almost nothing under 300 Hz, so
    with only the lows the bar was barely heard on one, 10 dB under the stroll."""
    bajo = _filtro(x, 'lowpass', 1500, 4)
    medio = _filtro(_filtro(x, 'highpass', 1500), 'lowpass', 3200) * 0.3
    y = bajo + medio
    mono = y.mean(axis=0)
    y = 0.75 * np.stack([mono, mono]) + 0.25 * y
    return y + 0.25 * _sala(y, 0.6)


RONDA = 40 * L
MODO = sys.argv[1] if len(sys.argv) > 1 else ''

if MODO in ('bucle', 'puerta'):
    t = 0
    for _ in range(3):
        t = ronda(t)
    x = O.render(hasta=t, pegamento=(-16, 2.5))
    salida = sys.argv[2] if len(sys.argv) > 2 else None
    if MODO == 'bucle':
        exportar_bucle('bar-rockero-bucle', x, RONDA * 60 / BPM, rms_db=-17, fundir=True, salida=salida)
    else:
        exportar_bucle('bar-rockero-puerta-bucle', tras_la_puerta(x), RONDA * 60 / BPM, rms_db=-16, fundir=True, salida=salida)
    sys.exit()

if __name__ == '__main__':
    revisa('estribillo', LEAD_E, ACORDES_E)

# Intro: the riff on the left guitar alone, then the right one and the hats, then everyone.
for c, compas in enumerate(RIFF_E * 2):
    for (p, d, raiz, apagado) in compas:
        b = c * L + p / 4
        if apagado:
            O.acorde(MUT_I, b, d / 4, [midi(RAIZ[raiz]), midi(RAIZ[raiz]) + 7], 98, rasgueo=0.004, legato=0.5)
        else:
            power(GTR_I, b, d / 4, raiz, 108)
for k in range(8):
    O.nota(9, 1 * L + k / 2, 0.5, 42, 80)
O.nota(9, 1 * L + 2, 2, 38, 60)
for k in range(8):
    O.nota(9, 1 * L + 2 + k / 4, 0.25, 38, 70 + k * 6)
t = ronda(2 * L)
t = ronda(t)
# Ending: the riff once more, a held E with the drums rolling round the kit, and the last hit.
riff(t, RIFF_E)
bateria(t, 1, relleno=False)
t += L
for canal in (GTR_I, GTR_D):
    power(canal, t, 2 * L, 'E', 112, legato=1)
O.nota(BAJO, t, 2 * L, 'E1', 110, legato=1)
O.acorde(ORG, t, 2 * L, [midi(x) for x in ('E3', 'B3', 'E4', 'G4')], 90, rasgueo=0, legato=1)
O.cuerda(SOL1, t, 2 * L, 'E6', 104, sube=2, cuando=0.15, vib=35)
O.nota(9, t, 2, 49, 120)
for k in range(24):
    O.nota(9, t + 1 + k / 4, 0.25, (50, 48, 47, 45, 43, 41)[k % 6], 80 + k, humano=0.003)
for k in range(8):
    O.nota(9, t + 1 + k / 2, 0.5, 57 if k % 2 else 49, 70 + k * 5, humano=0.003)
t += 2 * L
for canal in (GTR_I, GTR_D):
    power(canal, t, 2, 'E', 120, legato=1)
O.nota(BAJO, t, 2, 'E1', 120, legato=1)
O.nota(9, t, 2, 49, 127)
O.nota(9, t, 2, 57, 120)
O.nota(9, t, 1, 36, 127)
x = O.render(pegamento=(-16, 2.5))
exportar('bar-rockero', x, rms_db=-17, fundido=1.0)
exportar('bar-rockero-puerta', tras_la_puerta(x), rms_db=-20, fundido=1.0)
