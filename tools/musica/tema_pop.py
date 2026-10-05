# «Camiones y Caravanas», the main theme as pop-rock with an indie streak: the same tune as
# tema_principal.py, straight instead of swung, on rock chords (D minor over the falling bass
# D, C, B flat, A). A clean guitar picks arpeggios through a delay, a lead guitar sings the tune
# in the verse; in the chorus two crunchy guitars strum hard left and right, the kick goes four
# on the floor, handclaps and tambourine, and the tune moves to an analogue-style synth (sinte:
# a detuned pulse with a little glide) doubled by a glockenspiel. The bridge drops to half time
# with piano, before the last chorus. 128 bpm.
#
#   python3 tema_pop.py          listening version: intro, twice round, ending  -> tema-pop.mp3
#   python3 tema_pop.py bucle    the round three times, cut for a seamless loop -> tema-pop-bucle.mp3
import random
import sys
from orquesta import Orquesta, tocar, raiz_en
from sinte import Cancion, Inst, frase, revisa, acorde_en, tonos, midi, exportar, exportar_bucle, tocar as tocar_chip

BPM = 128
O = Orquesta(BPM, swing=0.5, semilla=51, sala=1.2)
LIMPIA = O.instrumento(0, 'guitarra limpia', 27, vol=-4, pan=-0.45, reverb=0.18, hp=150, drive=3, eco=(0.75, 0.3, 0.2, 3500))
CRUNCH_I = O.instrumento(1, 'guitarra crunch izquierda', 29, vol=-3, pan=-0.85, reverb=0.1, hp=100, drive=7, lp=6500)
CRUNCH_D = O.instrumento(2, 'guitarra crunch derecha', 29, vol=-3, pan=0.85, reverb=0.1, hp=100, drive=7, lp=6500)
SOLISTA = O.instrumento(3, 'guitarra solista', 29, vol=-1, pan=0.1, reverb=0.2, hp=150, drive=5, lp=7500, eco=(0.75, 0.28, 0.2, 4000))
BAJO = O.instrumento(4, 'bajo', 34, vol=-3, reverb=0.03, drive=4, lp=3500, comp=(-22, 3))
ORG = O.instrumento(5, 'órgano', 16, vol=-2, pan=0.2, reverb=0.25, hp=150)
GLOCK = O.instrumento(6, 'glockenspiel', 9, vol=0, pan=0.3, reverb=0.3)
PIANO = O.instrumento(7, 'piano', 0, vol=1, pan=-0.15, reverb=0.25, hp=100)
BAT = O.instrumento(9, 'batería', 8, vol=-1, reverb=0.12, comp=(-20, 3))
O.rango_bend(SOLISTA, 12)
L = 4

C = Cancion(BPM)
SINTE = C.pista('sinte', Inst('pulso', duty=0.35, pwm=(0.08, 0.4), adsr=(0.006, 0.4, 0.75, 0.15), vib=(10, 5.5, 0.3), glide=0.03, doble=7),
                vol=-11, lp=4200, eco=(0.75, 0.3, 0.2, 3500), reverb=0.15)

# The same tune as tema_principal.py, on rock chords.
ACORDES_A = [['Dm'], ['Dm/C'], ['Bb'], ['A'], ['Dm'], ['Gm', 'C'], ['F', 'Bb'], ['Gm', 'A']]
TEMA_A = frase('D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2 | D5:6 -:2 A4:2 C5:2 D5:2 E5:2 | F5:4 D5:2 F5:2 Ab5:4 G5:2 F5:2 | E5:6 C#5:2 A4:4 -:4 |'
               'D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2 | D5:4 Bb4:2 D5:2 E5:4 G5:4 | A5:4 F5:2 A5:2 Ab5:4 F5:4 | G5:4 E5:2 D5:2 C#5:4 A4:4')
ACORDES_B = [['Bbmaj7'], ['A'], ['Dm'], ['D'], ['Gm'], ['C'], ['F'], ['Gm', 'A']]
TEMA_B = frase('D5:6 F5:2 A5:8 | G5:6 E5:2 C#5:8 | F5:6 E5:2 D5:4 A4:4 | F#5:6 E5:2 C5:4 A4:4 |'
               'Bb5:6 A5:2 G5:4 D5:4 | E5:6 F5:2 G5:4 Bb5:4 | A5:12 G5:2 F5:2 | G5:4 E5:4 C#5:4 A4:4')


def arpegio(t0, acordes, vel=78):
    """The clean guitar: the bass note, then the chord picked up and down in eighths."""
    for i, cs in enumerate(acordes):
        mitad = L // len(cs)
        for j, ch in enumerate(cs):
            b = raiz_en(ch, 'E2', 'D#3')
            t = tonos(ch, 'F3', 'F5')[:4]
            patron = (b, t[0], t[1], t[2], t[3], t[2], t[1], t[0])[:mitad * 2]
            for k, m in enumerate(patron):
                O.nota(LIMPIA, t0 + i * L + j * mitad + k * 0.5, 1, m, vel + (8 if k == 0 else 0), legato=1.6, humano=0.006)


def rasgueo(t0, acordes, vel=96):
    """Two crunchy guitars, one each side, strumming power chords in eighths with a push on the 'and' of two."""
    for i, cs in enumerate(acordes):
        for k in range(8):
            b = k * 0.5
            ch = acorde_en(acordes, i * L + b)
            r = raiz_en(ch, 'E2', 'D#3')
            acento = 10 if k in (0, 3, 4) else 0
            for canal in (CRUNCH_I, CRUNCH_D):
                O.acorde(canal, t0 + i * L + b, 0.5, [r, r + 7, r + 12], vel - 12 + acento, rasgueo=0.01, legato=0.75 if acento else 0.5, humano=0.006)


def bajo(t0, acordes, vel=100, modo='corcheas'):
    for i, cs in enumerate(acordes):
        if modo == 'largo':
            for j, ch in enumerate(cs):
                O.nota(BAJO, t0 + i * L + j * L / len(cs), L / len(cs), raiz_en(ch, 'E1', 'D#2'), vel - 6, legato=0.95, humano=0.004)
            continue
        for k in range(8):
            ch = acorde_en(acordes, i * L + k * 0.5)
            r = raiz_en(ch, 'E1', 'D#2')
            salto = 12 if modo == 'estribillo' and k % 2 == 1 and k in (3, 7) else 0
            O.nota(BAJO, t0 + i * L + k * 0.5, 0.5, r + salto, vel - (8 if k % 2 else 0), legato=0.8, humano=0.004)


def organo(t0, acordes, vel=64):
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            O.acorde(ORG, t0 + i * L + j * L / len(cs), L / len(cs), tonos(ch, 'A3', 'A4')[:3], vel, rasgueo=0, legato=1.0, humano=0.003)


def piano(t0, acordes, vel=72):
    for i, cs in enumerate(acordes):
        for j, ch in enumerate(cs):
            b = t0 + i * L + j * L / len(cs)
            O.nota(PIANO, b, L / len(cs), raiz_en(ch, 'E2', 'D#3'), vel, legato=1.0, humano=0.004)
            for k, beat in enumerate((0, 1.5, 3)[:3 if len(cs) == 1 else 2]):
                O.acorde(PIANO, b + beat, 1.5, tonos(ch, 'F4', 'F5')[:3], vel - 6 - k * 4, rasgueo=0.015, legato=0.9, humano=0.006)


def bateria(t0, compases, modo='estrofa', vel=100, relleno=True, crash=True):
    """Verse: kick on one, the 'and' of two, three; snare on two and four; eighth hats.
    Chorus: four on the floor, open hats off the beat, claps with the snare, tambourine in sixteenths.
    Half time (the bridge): kick on one, snare on three, ride."""
    for c in range(compases):
        b0 = t0 + c * L
        ultimo = relleno and c == compases - 1
        if modo == 'estribillo':
            bombo, caja = (0, 1, 2, 3), (1, 3)
            for k in range(4):
                O.nota(9, b0 + k + 0.5, 0.5, 46, vel - 18, humano=0.003)
                O.nota(9, b0 + k, 0.5, 42, vel - 26, humano=0.003)
            for k in range(16):
                O.nota(9, b0 + k / 4, 0.25, 54, vel - (24 if k % 2 else 36), humano=0.003)
            for k in (1, 3):
                O.nota(9, b0 + k, 0.5, 39, vel - 6, humano=0.006)
        elif modo == 'medio':
            bombo, caja = (0, 2.5), (2,)
            for k in range(8):
                O.nota(9, b0 + k / 2, 0.5, 51, vel - (18 if k % 2 else 10), humano=0.003)
        else:
            bombo, caja = (0, 1.5, 2), (1, 3)
            for k in range(8):
                O.nota(9, b0 + k / 2, 0.5, 42, vel - (26 if k % 2 else 14), humano=0.003)
        for b in bombo:
            O.nota(9, b0 + b, 0.5, 36, vel + 6, humano=0.003)
        for b in caja:
            if not (ultimo and b >= 3):
                O.nota(9, b0 + b, 0.5, 38, vel + 8, humano=0.003)
        if ultimo:
            for k, tom in enumerate((38, 38, 50, 48, 47, 45, 41, 41)):
                if k >= 4 or modo != 'medio':
                    O.nota(9, b0 + 2 + k / 4, 0.25, tom, vel - 6 + k * 3, humano=0.003)
    if crash:
        O.nota(9, t0, 1, 49, vel + 16, humano=0.002)


def ronda(t):
    random.seed(51)
    # Verse: the lead guitar sings the tune over the clean arpeggios.
    tocar(O, SOLISTA, t, TEMA_A, 98, legato=0.95)
    arpegio(t, ACORDES_A)
    bajo(t, ACORDES_A)
    organo(t, ACORDES_A, vel=56)
    bateria(t, 8)
    t += 8 * L
    # Chorus: the synth and the glockenspiel take the tune, the guitars strum, four on the floor.
    tocar_chip(SINTE, t, TEMA_A, 104)
    tocar(O, GLOCK, t, TEMA_A, 74, oct=1, legato=1)
    rasgueo(t, ACORDES_A)
    arpegio(t, ACORDES_A, vel=66)
    bajo(t, ACORDES_A, modo='estribillo')
    organo(t, ACORDES_A)
    bateria(t, 8, 'estribillo')
    t += 8 * L
    # Bridge: half time, piano, the lead guitar on the wistful tune with the clean guitar picking.
    tocar(O, SOLISTA, t, TEMA_B, 96, legato=0.97)
    piano(t, ACORDES_B)
    arpegio(t, ACORDES_B, vel=62)
    bajo(t, ACORDES_B, modo='largo')
    organo(t, ACORDES_B, vel=60)
    bateria(t, 8, 'medio', vel=92)
    t += 8 * L
    # Last chorus: synth, glockenspiel and the lead guitar an octave down, everyone in.
    tocar_chip(SINTE, t, TEMA_A, 108)
    tocar(O, GLOCK, t, TEMA_A, 78, oct=1, legato=1)
    tocar(O, SOLISTA, t, TEMA_A, 88, oct=-1, legato=0.95)
    rasgueo(t, ACORDES_A, vel=100)
    bajo(t, ACORDES_A, vel=104, modo='estribillo')
    organo(t, ACORDES_A, vel=70)
    bateria(t, 8, 'estribillo', vel=104)
    return t + 8 * L


RONDA = 32 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('tema-pop-bucle', O.render(hasta=t, chip=C, pegamento=(-16, 2)), RONDA * 60 / BPM, rms_db=-17, fundir=True,
                   salida=sys.argv[2] if len(sys.argv) > 2 else None)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)

# Intro: the clean guitar alone on the falling bass, then the bass and the kick, a fill.
INTRO = [['Dm'], ['Dm/C'], ['Bb'], ['A']]
arpegio(0, INTRO, vel=84)
bajo(2 * L, INTRO[2:])
for c in (2,):
    for k in range(4):
        O.nota(9, c * L + k, 0.5, 36, 96)
    O.nota(9, c * L, 0.5, 42, 70)
bateria(3 * L, 1, crash=False)
t = ronda(4 * L)
t = ronda(t)
# Ending: the hook's first bar, then D minor ringing out with the crash.
tocar(O, SOLISTA, t, frase('D5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2'), 100)
arpegio(t, [['Dm']])
bajo(t, [['Dm']])
bateria(t, 1, 'estribillo', relleno=False, crash=False)
t += L
for canal in (CRUNCH_I, CRUNCH_D):
    O.acorde(canal, t, 2 * L, [midi(x) for x in ('D3', 'A3', 'D4', 'F4')], 108, rasgueo=0.02, legato=1)
O.cuerda(SOLISTA, t, 2 * L, 'D5', 100, sube=2, cuando=0.1, vib=30)
SINTE.nota(t, 2 * L, 'A5', 96, desde='F5')
O.nota(GLOCK, t, 2, 'D6', 84)
O.nota(BAJO, t, 2 * L, 'D2', 104, legato=1)
O.acorde(ORG, t, 2 * L, [midi(x) for x in ('A3', 'D4', 'F4')], 74, rasgueo=0, legato=1)
O.nota(9, t, 2, 49, 120)
O.nota(9, t, 1, 36, 116)
exportar('tema-pop', O.render(chip=C, pegamento=(-16, 2)), rms_db=-17, fundido=1.5)
