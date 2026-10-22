# The Pang's three themes (12 October 2026). Jesús asked for music «cañera», with great tunes, in
# the spirit of VVVVVV and of Streets of Rage 2: three themes that take turns stage by stage, and
# one of them on the title. All original, all synthesised with sinte (no SoundFont):
#
#   usera   «A tope por Usera»: chiptune at 150 bpm, A minor, pulse-wave lead with a delayed
#           vibrato, broken chords in sixteenths and an octave-bouncing bass (the VVVVVV side).
#   calle   «La calle de la penúltima»: house at 126 bpm, D dorian, two-operator FM like the
#           Mega Drive's: a slap bass, organ stabs on the off-beat, a brassy lead, claps on two
#           and four, open hats between the kicks (the Streets of Rage 2 side).
#   ronda   «Última ronda»: the bosses' theme, 168 bpm, E minor, i–VI–VII–V: a lead doubled by
#           FM brass, a bass in sixteenths, fast arpeggios and a driving kit.
#
#   python3 pang.py usera                    listening version -> pang-usera.mp3
#   python3 pang.py usera bucle [salida]     three rounds cut for a seamless loop (salida: the
#                                            game's copy, ../../src/sonido/pang-usera.mp3)
import sys
from sinte import (Cancion, Inst, frase, revisa, acorde, acorde_en, tonos, voz_cerrada, midi, exportar,
                   exportar_bucle, tocar, ritmo, arpegiar, bajo_de)

L = 4


def raiz(ch, lo):
    """The chord's root at or above `lo`."""
    r = acorde(ch)[0]
    return next(x for x in range(midi(lo), midi(lo) + 12) if x % 12 == r)


def tercera_abajo(notas, acordes, lo='E4'):
    """A second voice: under each tune note, the nearest chord tone a third to a fifth below."""
    out = []
    for b, d, m, *resto in notas:
        ts = [x for x in tonos(acorde_en(acordes, b), lo, m) if 3 <= m - x <= 7]
        out.append((b, d, ts[-1] if ts else m - 5))
    return out


# =========================================================================== «A tope por Usera»

def usera():
    BPM = 150
    C = Cancion(BPM)
    LEAD = C.pista('melodía', Inst('pulso', duty=0.25, adsr=(0.002, 0.12, 0.72, 0.06), vib=(22, 6.2, 0.16), glide=0.035),
                   vol=-7, pan=0.08, eco=(0.75, 0.28, 0.2, 4200), reverb=0.12)
    VOZ2 = C.pista('segunda voz', Inst('pulso', duty=0.125, adsr=(0.002, 0.1, 0.6, 0.05), vib=(15, 6.2, 0.2)),
                   vol=-13, pan=-0.3, reverb=0.1)
    ARP = C.pista('arpegios', Inst('pulso', duty=0.5, adsr=(0.001, 0.07, 0.35, 0.03)), vol=-15, pan=-0.15,
                  eco=(0.75, 0.25, 0.18, 3500), reverb=0.08, duck=0.35)
    TRI = C.pista('bajo triángulo', Inst('triangulo', pasos=16, adsr=(0.002, 0.08, 0.9, 0.03)), vol=-3, reverb=0.0, duck=0.25)
    BAJO = C.pista('bajo pulso', Inst('pulso', duty=0.25, adsr=(0.002, 0.09, 0.55, 0.03)), vol=-17, reverb=0.0, duck=0.3, lp=2400)
    BAT = C.pista('batería', vol=-9, reverb=0.06)

    ACORDES_A = [['Am'], ['F'], ['C'], ['G'], ['Am'], ['F'], ['C'], ['E']]
    TEMA_A = frase('A4:2 C5:2 E5:2 A5:4 G5:2 E5:2 D5:2 | C5:2 F5:4 E5:2 F5:2 A5:4 G5:2 | G5:4 E5:2 C5:2 E5:2 G5:2 C6:4 | B5:6 A5:2 G5:2 D5:2 B4:4 |'
                   'A4:2 C5:2 E5:2 A5:4 G5:2 A5:2 B5:2 | C6:4 A5:2 C6:2 F5:4 A5:2 C6:2 | E6:4 D6:2 C6:2 G5:4 E5:2 G5:2 | G#5:6 B5:2 E6:4 D6:2 B5:2')
    ACORDES_B = [['Dm'], ['G'], ['C'], ['Am'], ['Dm'], ['G'], ['E'], ['E7']]
    TEMA_B = frase('F5:6 E5:2 D5:4 A5:4 | G5:6 F5:2 D5:4 B4:4 | E5:6 D5:2 C5:4 G5:4 | A5:12 C6:2 B5:2 |'
                   'A5:6 F5:2 D6:4 C6:4 | B5:6 G5:2 D6:4 B5:4 | G#5:4 B5:4 E6:4 G#6:4 | B6:8 G#6:2 E6:2 D6:2 B5:2')
    ACORDES_P = [['Am'], ['F'], ['G'], ['E']]

    def bateria(t0, compases, modo='lleno'):
        for c in range(compases):
            b = t0 + c * L
            if modo == 'lleno':
                ritmo(BAT, b, 'x.....x.x.......', 'bombo', 104)
                ritmo(BAT, b, '....x.......x..o', 'caja', 96)
                ritmo(BAT, b, 'o.x.o.x.o.x.o.x.', 'charles', 70)
            elif modo == 'medio':
                ritmo(BAT, b, 'x.......x.......', 'bombo', 96)
                ritmo(BAT, b, '........x.......', 'caja', 84)
                ritmo(BAT, b, '..x...x...x...x.', 'charles', 62)
            else:  # the build: snare in eighths, then sixteenths
                ritmo(BAT, b, 'x...x...x...x...', 'bombo', 98)
                ritmo(BAT, b, 'x.x.x.x.x.x.x.x.' if c < compases - 1 else 'xxxxxxxxxxxxxxxx', 'caja', 70 + c * 8)
        BAT.golpe(t0, 'crash', 96)

    def bajo(t0, acordes, modo='octavas'):
        for i, cs in enumerate(acordes):
            r = raiz(cs[0], 'A1')
            for k in range(8):
                m = r + (12 if modo == 'octavas' and k % 2 else 0)
                TRI.nota(t0 + i * L + k / 2, 0.45, m, 100 if k % 2 == 0 else 86)
                BAJO.nota(t0 + i * L + k / 2, 0.3, m + 12, 92)

    def arpegios(t0, acordes, desde='A4'):
        arpegiar(ARP, t0, acordes, patron=(0, 1, 2, 3, 2, 1, 2, 3), paso=0.25, desde=desde, vel=84)

    def ronda(t):
        # Intro: the broken chords and the bass alone, the kit coming in on the third bar.
        arpegios(t, ACORDES_P)
        bajo(t, ACORDES_P)
        bateria(t + 2 * L, 2, 'medio')
        t += 4 * L
        # A: the tune.
        tocar(LEAD, t, TEMA_A, 104)
        arpegios(t, ACORDES_A)
        bajo(t, ACORDES_A)
        bateria(t, 8)
        t += 8 * L
        # A again, with a second voice a third below.
        tocar(LEAD, t, TEMA_A, 108)
        tocar(VOZ2, t, tercera_abajo(TEMA_A, ACORDES_A), 96)
        arpegios(t, ACORDES_A, desde='C5')
        bajo(t, ACORDES_A)
        bateria(t, 8)
        t += 8 * L
        # B: the long notes, half-time kit, bass on the beat.
        tocar(LEAD, t, TEMA_B, 106)
        tocar(VOZ2, t, tercera_abajo(TEMA_B, ACORDES_B), 90)
        arpegios(t, ACORDES_B)
        bajo(t, ACORDES_B, modo='raiz')
        bateria(t, 6, 'medio')
        bateria(t + 6 * L, 2, 'subida')
        t += 8 * L
        # A, all in, the tune up an octave on the second voice.
        tocar(LEAD, t, TEMA_A, 110)
        tocar(VOZ2, t, TEMA_A, 88, oct=-1)
        arpegios(t, ACORDES_A, desde='E5')
        bajo(t, ACORDES_A)
        bateria(t, 8)
        return t + 8 * L

    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    return C, BPM, ronda, 36


# =========================================================================== «La calle de la penúltima»

def calle():
    BPM = 126
    C = Cancion(BPM, swing=0.54)
    BAJO = C.pista('bajo slap FM', Inst('campana', fm=(1.0, 5.0, 0.05), adsr=(0.001, 0.22, 0.45, 0.04), sub=0.5),
                   vol=-3, reverb=0.0, duck=0.3)
    ORGANO = C.pista('acordes', Inst('campana', fm=(2.0, 1.6, 0.1), adsr=(0.001, 0.16, 0.0, 0.07)),
                     vol=-9, pan=-0.2, eco=(0.75, 0.3, 0.22, 3000), reverb=0.15, duck=0.5)
    LEAD = C.pista('metal FM', Inst('campana', fm=(1.0, 2.8, 1.2), adsr=(0.015, 0.4, 0.78, 0.12), vib=(20, 5.5, 0.25), doble=7, glide=0.04),
                   vol=-3, pan=0.1, eco=(0.75, 0.25, 0.2, 4500), reverb=0.18)
    CAMPANA = C.pista('campanas', Inst('campana', fm=(3.5, 2.2, 0.3), adsr=(0.001, 0.3, 0.0, 0.2)),
                      vol=-11, pan=0.35, eco=(0.75, 0.35, 0.25, 5000), reverb=0.2)
    PAD = C.pista('colchón', Inst('pulso', duty=0.5, pwm=(0.2, 0.5), adsr=(0.25, 0.6, 0.7, 0.5), doble=12),
                  vol=-17, reverb=0.3, duck=0.6, lp=3200)
    BAT = C.pista('batería', vol=-9, reverb=0.05)

    ACORDES_G = [['Dm7'], ['G9']] * 2
    ACORDES_A = [['Dm7'], ['G9'], ['Bbmaj7'], ['A7'], ['Dm7'], ['G9'], ['Bbmaj7'], ['A7']]
    TEMA_A = frase('D5:3 F5:3 A5:2 C6:4 A5:2 G5:2 | A5:3 B5:3 A5:2 G5:4 F5:2 D5:2 | F5:3 A5:3 D6:2 C6:4 A5:2 F5:2 | E5:6 G5:2 C#6:4 E6:4 |'
                   'D6:3 C6:3 A5:2 C6:4 D6:2 F6:2 | E6:3 D6:3 B5:2 A5:4 G5:2 A5:2 | F5:4 D6:4 C6:2 Bb5:2 A5:2 F5:2 | E5:2 F5:2 G5:2 A5:2 C#6:4 E6:4')
    ACORDES_B = [['Gm7'], ['C9'], ['Fmaj7'], ['Bbmaj7'], ['Em7b5'], ['A7'], ['Dm7'], ['A7']]
    TEMA_B = frase('D6:8 Bb5:4 A5:4 | G5:8 E5:4 D5:4 | C6:8 A5:4 F5:4 | D6:6 C6:2 A5:4 F5:4 |'
                   'G5:8 Bb5:4 D6:4 | C#6:8 E6:4 G6:4 | F6:6 E6:2 D6:4 A5:4 | E6:4 C#6:4 A5:4 G5:4')

    def bateria(t0, compases, modo='casa'):
        for c in range(compases):
            b = t0 + c * L
            if modo == 'casa':
                ritmo(BAT, b, 'x...x...x...x...', 'bombo', 108)
                ritmo(BAT, b, '....x.......x...', 'palmas', 96)
                ritmo(BAT, b, '..x...x...x...x.', 'abierto', 66)
                ritmo(BAT, b, 'oxo.oxo.oxo.oxox', 'charles', 64)
            else:  # the break: no kick, claps and shaker
                ritmo(BAT, b, '....x.......x...', 'palmas', 84)
                ritmo(BAT, b, 'oxoxoxoxoxoxoxox', 'shaker', 70)
        BAT.golpe(t0, 'crash', 90)

    def bajo(t0, acordes, vel=104):
        # The slap: root, a ghost an octave up, the syncopated push before the next bar.
        patron = ((0, 0.5, 0), (0.75, 0.25, 12), (1.5, 0.5, 0), (2.5, 0.25, 12), (2.75, 0.5, 10), (3.5, 0.5, 7))
        for i, cs in enumerate(acordes):
            r = raiz(cs[0], 'C2')
            for b, d, iv in patron:
                BAJO.nota(t0 + i * L + b, d, r + iv, vel - (16 if iv == 12 else 0))

    def acordes(t0, acs, vel=90):
        # Organ stabs on the «and» of each beat, the chord close around A4.
        for i, cs in enumerate(acs):
            v = voz_cerrada(cs[0], 'A4', 4)
            for b in (0.5, 1.5, 2.5, 3.25):
                for m in v:
                    ORGANO.nota(t0 + i * L + b, 0.25, m, vel - (10 if b == 3.25 else 0))

    def colchon(t0, acs):
        for i, cs in enumerate(acs):
            for m in voz_cerrada(cs[0], 'F4', 4):
                PAD.nota(t0 + i * L, L, m, 80)

    def ronda(t):
        # The groove: bass, stabs and kit, bells answering.
        bajo(t, ACORDES_G)
        acordes(t, ACORDES_G)
        bateria(t, 4)
        for k, m in enumerate(['A5', 'C6', 'D6', 'F6', 'E6', 'D6', 'C6', 'A5']):
            CAMPANA.nota(t + 2 + k * 1.5, 1, m, 88)
        t += 4 * L
        # A: the brass tune.
        tocar(LEAD, t, TEMA_A, 104)
        bajo(t, ACORDES_A)
        acordes(t, ACORDES_A)
        bateria(t, 8)
        t += 8 * L
        # A again, the bells doubling the tune an octave up.
        tocar(LEAD, t, TEMA_A, 108)
        tocar(CAMPANA, t, TEMA_A, 80, oct=1)
        bajo(t, ACORDES_A)
        acordes(t, ACORDES_A)
        colchon(t, ACORDES_A)
        bateria(t, 8)
        t += 8 * L
        # B: the break. No kick, a pad, the tune slower and higher, bells arpeggiating.
        tocar(LEAD, t, TEMA_B, 100)
        colchon(t, ACORDES_B)
        arpegiar(CAMPANA, t, ACORDES_B, patron=(0, 2, 1, 3, 2, 4, 3, 1), paso=0.5, desde='D5', vel=76)
        bajo(t + 4 * L, ACORDES_B[4:], vel=96)
        bateria(t, 4, 'corte')
        bateria(t + 4 * L, 4)
        return t + 8 * L

    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    return C, BPM, ronda, 28


# =========================================================================== «Última ronda»

def ronda_jefes():
    BPM = 168
    C = Cancion(BPM)
    LEAD = C.pista('melodía', Inst('pulso', duty=0.5, adsr=(0.002, 0.1, 0.8, 0.05), vib=(25, 6.5, 0.14), glide=0.03),
                  vol=-11, pan=0.05, eco=(0.75, 0.22, 0.16, 4000), reverb=0.1)
    METAL = C.pista('metal FM', Inst('campana', fm=(1.0, 3.2, 0.8), adsr=(0.01, 0.3, 0.75, 0.08), doble=9),
                   vol=-8, pan=-0.15, reverb=0.15)
    ARP = C.pista('arpegios', Inst('pulso', duty=0.125, adsr=(0.001, 0.05, 0.3, 0.02)), vol=-13, pan=0.3,
                  eco=(0.5, 0.25, 0.15, 3500), reverb=0.06, duck=0.3)
    BAJO = C.pista('bajo', Inst('pulso', duty=0.25, adsr=(0.001, 0.07, 0.6, 0.02), sub=0.6), vol=-8, reverb=0.0, duck=0.3, lp=3000)
    TRI = C.pista('bajo triángulo', Inst('triangulo', pasos=16, adsr=(0.002, 0.06, 0.9, 0.02)), vol=-6, duck=0.2)
    BAT = C.pista('batería', vol=-10, reverb=0.05)

    ACORDES_A = [['Em'], ['C'], ['D'], ['B7'], ['Em'], ['C'], ['Am'], ['B']]
    TEMA_A = frase('E5:2 E5:2 B5:4 G5:2 A5:2 B5:4 | C6:4 B5:2 A5:2 G5:4 E5:4 | F#5:2 F#5:2 D6:4 C6:2 B5:2 A5:4 | D#6:6 B5:2 A5:4 F#5:4 |'
                   'E6:4 D6:2 B5:2 G5:4 B5:4 | C6:4 E6:4 G6:4 E6:4 | A5:2 B5:2 C6:4 D6:2 E6:2 F#6:4 | D#6:4 F#6:4 B6:8')
    ACORDES_B = [['Am'], ['Em'], ['C'], ['D'], ['Am'], ['Em'], ['C'], ['B']]
    TEMA_B = frase('C6:8 B5:4 A5:4 | B5:8 G5:4 E5:4 | E6:8 D6:4 C6:4 | D6:8 A5:4 F#5:4 |'
                   'A5:4 C6:4 E6:4 A6:4 | G6:8 F#6:4 E6:4 | E6:4 G6:4 C7:6 B6:2 | B6:4 A6:4 F#6:4 D#6:4')

    def bateria(t0, compases, modo='carga'):
        for c in range(compases):
            b = t0 + c * L
            if modo == 'carga':
                ritmo(BAT, b, 'x.x...x.x.x...x.', 'bombo', 106)
                ritmo(BAT, b, '....x.......x...', 'caja', 100)
                ritmo(BAT, b, 'x.x.x.x.x.x.x.x.', 'charles', 72)
            else:
                ritmo(BAT, b, 'x.......x.x.....', 'bombo', 100)
                ritmo(BAT, b, '....x.......x...', 'caja', 94)
                ritmo(BAT, b, 'x...x...x...x...', 'abierto', 60)
        BAT.golpe(t0, 'crash', 100)

    def bajo(t0, acs):
        for i, cs in enumerate(acs):
            r = raiz(cs[0], 'E1')
            for k in range(16):
                BAJO.nota(t0 + i * L + k / 4, 0.2, r + 12 + (12 if k % 4 == 2 else 0), 96 if k % 4 == 0 else 82)
            for k in range(4):
                TRI.nota(t0 + i * L + k, 0.9, r, 100)

    def arpegios(t0, acs, desde='E5'):
        arpegiar(ARP, t0, acs, patron=(0, 1, 2, 3, 4, 3, 2, 1), paso=0.25, desde=desde, vel=86)

    def ronda(t):
        # Intro: the bass and the kit, a two-bar alarm on the arpeggios.
        bajo(t, [['Em'], ['B7']])
        arpegios(t, [['Em'], ['B7']])
        bateria(t, 2)
        t += 2 * L
        tocar(LEAD, t, TEMA_A, 104)
        tocar(METAL, t, TEMA_A, 92, oct=-1)
        bajo(t, ACORDES_A)
        arpegios(t, ACORDES_A)
        bateria(t, 8)
        t += 8 * L
        tocar(LEAD, t, TEMA_A, 108)
        tocar(METAL, t, tercera_abajo(TEMA_A, ACORDES_A), 90)
        bajo(t, ACORDES_A)
        arpegios(t, ACORDES_A, desde='B5')
        bateria(t, 8)
        t += 8 * L
        tocar(LEAD, t, TEMA_B, 104)
        tocar(METAL, t, TEMA_B, 88, oct=-1)
        bajo(t, ACORDES_B)
        arpegios(t, ACORDES_B)
        bateria(t, 8, 'medio')
        t += 8 * L
        tocar(LEAD, t, TEMA_A, 110)
        tocar(METAL, t, TEMA_A, 94, oct=-1)
        bajo(t, ACORDES_A)
        arpegios(t, ACORDES_A, desde='B5')
        bateria(t, 8)
        return t + 8 * L

    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    return C, BPM, ronda, 34


CANCIONES = {'usera': usera, 'calle': calle, 'ronda': ronda_jefes}

if __name__ == '__main__':
    cual = sys.argv[1]
    C, BPM, ronda, compases = CANCIONES[cual]()
    largo_s = compases * L * 60 / BPM
    if len(sys.argv) > 2 and sys.argv[2] == 'bucle':
        t = 0
        for _ in range(3):
            t = ronda(t)
        assert abs(t - 3 * compases * L) < 1e-6, t
        exportar_bucle(f'pang-{cual}-bucle', C.render(hasta=t), largo_s, rms_db=-16, salida=sys.argv[3] if len(sys.argv) > 3 else None)
    else:
        t = ronda(0)
        t = ronda(t)
        exportar(f'pang-{cual}', C.render(), rms_db=-16, fundido=3)
