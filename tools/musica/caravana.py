# «Caravana de noche»: the melancholic side of VVVVVV. B minor, i–VI–III–VII, a thin pulse lead
# that slides between notes and sings over a dotted-eighth echo, an NES triangle bass in 3-3-2,
# a half-time start that fills out, a falling-sequence middle with chip chords (a whole chord
# in one voice, arpeggiated at 50 Hz), and a breakdown that climbs back into the tune with a
# second voice and a bell an octave up. 126 bpm.
#
#   python3 caravana.py          listening version: intro, twice round, ending    -> caravana.mp3
#   python3 caravana.py bucle    the round three times, cut for a seamless loop  -> caravana-bucle.mp3
import sys
from sinte import (Cancion, Inst, frase, revisa, tocar, ritmo, arpegiar, voz_cerrada, acorde, acorde_en, tonos,
                   bajo_de, escala, tercera_abajo, midi, exportar, exportar_bucle)

BPM = 126
C = Cancion(BPM)
LEAD = C.pista('melodía', Inst('pulso', duty=0.125, adsr=(0.004, 0.4, 0.8, 0.09), vib=(22, 5.3, 0.28), glide=0.035),
               vol=-1, eco=(0.75, 0.4, 0.3, 3400), reverb=0.24)
ARMO = C.pista('segunda voz', Inst('pulso', duty=0.25, adsr=(0.004, 0.4, 0.75, 0.09), vib=(18, 5.1, 0.3), glide=0.035),
               vol=-8, pan=-0.3, eco=(0.75, 0.35, 0.22, 3200), reverb=0.24)
BRILLO = C.pista('campanita', Inst('campana', adsr=(0.002, 0.5, 0.0, 0.4), fm=(4.0, 1.6, 0.18)),
                 vol=-8, pan=0.3, eco=(0.75, 0.4, 0.3, 5000), reverb=0.3)
CONTRA = C.pista('contracanto', Inst('triangulo', adsr=(0.02, 0.5, 0.8, 0.2), vib=(14, 4.8, 0.4), glide=0.06),
                 vol=-3, pan=0.15, reverb=0.25)
ARP = C.pista('arpegio', Inst('pulso', duty=0.25, adsr=(0.001, 0.12, 0.2, 0.05)),
              vol=-7, pan=0.3, eco=(0.75, 0.32, 0.26, 2800), lp=5000, reverb=0.15, duck=0.4)
ACORD = C.pista('acordes chip', Inst('pulso', duty=0.5, adsr=(0.002, 0.15, 0.5, 0.05), arp_hz=50),
                vol=-8, pan=-0.25, lp=4500, reverb=0.15, duck=0.5)
BAJO = C.pista('bajo', Inst('triangulo', pasos=16, adsr=(0.002, 0.2, 0.85, 0.03), sub=0.35), vol=0, lp=2500, reverb=0.02, duck=0.45)
PAD = C.pista('colchón', Inst('pulso', duty=0.3, pwm=(0.15, 0.3), adsr=(0.3, 0.8, 0.75, 0.6), doble=10),
              vol=-12, lp=1900, reverb=0.4, duck=0.55)
BOMBO = C.pista('bombo', vol=-7, reverb=0.02)
CAJA = C.pista('caja', vol=-4, reverb=0.28)
CHAR = C.pista('charles', vol=-7, pan=0.2, reverb=0.06)
PLATO = C.pista('platos', vol=-12, pan=-0.15, reverb=0.12)
L = 4

ACORDES_A = [['Bm'], ['G'], ['D'], ['A'], ['Bm'], ['G'], ['Em'], ['F#']]
TEMA_A = frase('B4:2 D5:2 F#5:8 E5:2 D5:2 | E5:6 D5:2 B4:8 | A4:2 D5:2 F#5:8 E5:2 D5:2 | E5:6 C#5:2 A4:8 |'
               'B4:2 D5:2 F#5:4 A5:4 G5:2 F#5:2 | G5:6 F#5:2 D5:4 B5:4 | B5:6 A5:2 G5:4 E5:4 | C#6:4 A#5:4 F#5:8')
CONTRA_A = frase('F#4:8 D4:8 | D4:8 B3:8 | A3:8 F#4:4 E4:4 | E4:8 C#4:8 | D4:8 F#4:8 | G4:8 D4:8 | E4:8 G4:8 | F#4:8 A#4:8')
ACORDES_B = [['G'], ['A'], ['F#m'], ['Bm'], ['Em'], ['A'], ['D'], ['F#']]
TEMA_B = frase('D6:6 B5:2 G5:4 A5:4 | C#6:6 A5:2 E5:8 | A5:6 F#5:2 C#5:4 E5:4 | F#5:12 D5:2 E5:2 |'
               'G5:6 F#5:2 E5:4 B5:4 | A5:6 G5:2 E5:4 C#6:4 | D6:6 C#6:2 A5:4 F#5:4 | E6:4 C#6:4 A#5:4 F#5:4')
ACORDES_R = [['G'], ['A'], ['Bm'], ['F#']]
TEMA_R = frase('D6:12 C#6:2 B5:2 | C#6:12 A5:4 | B5:8 D6:4 F#6:4 | F#6:4 E6:4 C#6:4 A#5:4')
MENOR = escala('B', 'menor')
ARMONICA = MENOR - {9} | {10}  # A# on the dominant


def segunda_voz(t0, notas, acordes, vel=92):
    for b, d, m, *_ in notas:
        ch = acorde_en(acordes, b)
        h = max(x for x in tonos(ch, m - 9, m - 3)) if d >= 0.5 else tercera_abajo(m, ARMONICA if ch == 'F#' else MENOR)
        ARMO.nota(t0 + b, d, h, vel + (6 if b % 1 == 0 else 0))


def raiz(ch):
    r = bajo_de(ch, 2)
    return r - 12 if r > midi('E3') else r


def bajo(t0, acordes, modo='tresillo', vel=100):
    for i, (ch, *_) in enumerate(acordes):
        r = raiz(ch)
        if modo == 'tresillo':  # 3-3-2, twice a bar, the last of each group up an octave
            for b, d, o in ((0, 0.75, 0), (0.75, 0.75, 0), (1.5, 0.5, 12), (2, 0.75, 0), (2.75, 0.75, 0), (3.5, 0.5, 12)):
                BAJO.nota(t0 + i * L + b, d, r + o, vel - (8 if b % 1 else 0))
        elif modo == 'corcheas':
            for k in range(8):
                BAJO.nota(t0 + i * L + k * 0.5, 0.5, r + (12 if k in (3, 7) else 0), vel - (10 if k % 2 else 0))
        elif modo == 'redonda':
            BAJO.nota(t0 + i * L, L, r, vel - 10)


def colchon(t0, acordes, vel=80):
    for i, (ch, *_) in enumerate(acordes):
        for m in voz_cerrada(ch, 'D4', 3):
            PAD.nota(t0 + i * L, L, m, vel)


def acordes_chip(t0, acordes, vel=90):
    """A whole chord in one pulse voice, arpeggiated at 50 Hz, stabbed in 3-3-2."""
    for i, (ch, *_) in enumerate(acordes):
        r, iv = acorde(ch)
        base = 60 + (r - 60) % 12
        for b in (0, 0.75, 1.5, 2, 2.75, 3.5):
            ACORD.nota(t0 + i * L + b, 0.5, base, vel - (10 if b % 1 else 0), arp=list(iv[:3]) + [12])


def bateria(t0, compases, bombo, caja, charles, abierto=None, crash=True, redoble=True, vel=100):
    for c in range(compases):
        ritmo(BOMBO, t0 + c * L, bombo, 'bombo', vel)
        ritmo(CAJA, t0 + c * L, caja if not (redoble and c == compases - 1) else caja[:12] + 'oxxX', 'caja', vel - 6)
        ritmo(CHAR, t0 + c * L, charles, 'charles', vel - 10)
        if abierto:
            ritmo(CHAR, t0 + c * L, abierto, 'abierto', vel - 16)
    if crash:
        PLATO.golpe(t0, 'crash', vel + 10)


def redoble(t0, compases=1):
    pasos = compases * 16
    for k in range(pasos):
        CAJA.golpe(t0 + k * 0.25, 'caja', 40 + int(70 * k / pasos))


def ronda(t):
    # A: half time, the tune alone over the arpeggio and the bass.
    tocar(LEAD, t, TEMA_A, 100)
    arpegiar(ARP, t, ACORDES_A, patron=(0, 1, 2, 3), desde='F#3', vel=78)
    bajo(t, ACORDES_A)
    bateria(t, 8, 'X.........x.....', '........x.......', 'x.o.x.o.x.o.x.o.')
    t += 8 * L
    # A': full time, the pad, a triangle counter-line under the tune.
    tocar(LEAD, t, TEMA_A, 102)
    tocar(CONTRA, t, CONTRA_A, 86)
    arpegiar(ARP, t, ACORDES_A, patron=(0, 1, 2, 3), desde='F#3', vel=80)
    bajo(t, ACORDES_A)
    colchon(t, ACORDES_A)
    bateria(t, 8, 'X.....x...x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.')
    t += 8 * L
    # B: the falling sequences, chip chords, driving eighths in the bass.
    tocar(LEAD, t, TEMA_B, 102)
    acordes_chip(t, ACORDES_B)
    arpegiar(ARP, t, ACORDES_B, patron=(0, 1, 2, 3), desde='F#3', vel=74)
    bajo(t, ACORDES_B, 'corcheas')
    colchon(t, ACORDES_B, vel=86)
    bateria(t, 8, 'X..x..x.X..x..x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.')
    t += 8 * L
    # Breakdown: no drums, the tune climbs over arpeggios and the pad, a roll into the last A.
    tocar(LEAD, t, TEMA_R, 98)
    arpegiar(ARP, t, ACORDES_R, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='F#3', vel=72)
    colchon(t, ACORDES_R, vel=92)
    bajo(t, ACORDES_R, 'redonda')
    redoble(t + 3 * L)
    t += 4 * L
    # A'': four on the floor, a second voice under the tune, a bell an octave up.
    tocar(LEAD, t, TEMA_A, 106)
    segunda_voz(t, TEMA_A, ACORDES_A)
    tocar(BRILLO, t, TEMA_A, 96, oct=1)
    arpegiar(ARP, t, ACORDES_A, patron=(0, 1, 2, 3), desde='F#3', vel=82)
    bajo(t, ACORDES_A, vel=104)
    colchon(t, ACORDES_A, vel=84)
    bateria(t, 8, 'X...x...x...x...', '....x.......x...', 'x.o.x.o.x.o.x.o.', abierto='..x...x...x...x.')
    return t + 8 * L


RONDA = 36 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('caravana-bucle', C.render(hasta=t), RONDA * 60 / BPM)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('contracanto', CONTRA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    revisa('ruptura', TEMA_R, ACORDES_R)

# Intro: the arpeggio and the pad over long bass notes, then the bass gets going.
INTRO = [['Bm'], ['G'], ['D'], ['A']]
arpegiar(ARP, 0, INTRO, patron=(0, 1, 2, 3), desde='F#3', vel=88)
colchon(0, INTRO, vel=84)
bajo(0, INTRO[:2], 'redonda', vel=96)
bajo(2 * L, INTRO[2:], vel=92)
for c in range(2, 4):
    ritmo(CHAR, c * L, 'x.o.x.o.x.o.x.o.', 'charles', 80)
t = ronda(4 * L)
t = ronda(t)
# Ending: the tune's first bar onto a held B minor, the bell echoing it.
tocar(LEAD, t, frase('B4:2 D5:2 F#5:8 E5:2 D5:2'), 100)
LEAD.nota(t + L, 2 * L, 'B4', 100)
tocar(BRILLO, t, frase('B4:2 D5:2 F#5:8 E5:2 D5:2 | B4:16'), 90, oct=1)
colchon(t, [['Bm'], ['Bm'], ['Bm']], vel=90)
arpegiar(ARP, t, [['Bm'], ['Bm']], patron=(0, 1, 2, 3), desde='F#3', vel=72)
BAJO.nota(t, 3 * L, raiz('Bm'), 96)
BOMBO.golpe(t, 'bombo', 110)
PLATO.golpe(t, 'crash', 112)
exportar('caravana', C.render(), fundido=3.0)
