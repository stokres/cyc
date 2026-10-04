# «A todo gas»: chiptune in the spirit of VVVVVV. A catchy hook in A minor with a melancholic
# pull (the major seventh over F, the E major at the end of each round), sixteenth arpeggios,
# octave bass and a kick that makes everything pump. A lyrical half-time middle, a breakdown
# with the tune on a soft triangle, and the hook again with everything. 140 bpm.
#
#   python3 todo_gas.py          listening version: intro, twice round, ending    -> todo-gas.mp3
#   python3 todo_gas.py bucle    the round three times, cut for a seamless loop  -> todo-gas-bucle.mp3
import sys
from sinte import (Cancion, Inst, frase, revisa, tocar, ritmo, arpegiar, voz_cerrada, acorde_en, tonos,
                   bajo_de, escala, tercera_abajo, midi, exportar, exportar_bucle)

BPM = 140
C = Cancion(BPM)
LEAD = C.pista('melodía', Inst('pulso', duty=0.25, adsr=(0.003, 0.3, 0.75, 0.07), vib=(14, 5.8, 0.22)),
               vol=0, eco=(0.75, 0.3, 0.26, 3800), reverb=0.16)
SUAVE = C.pista('melodía suave', Inst('triangulo', adsr=(0.01, 0.4, 0.8, 0.2), vib=(18, 5.2, 0.3), glide=0.05),
                vol=1, eco=(0.75, 0.42, 0.34, 3200), reverb=0.3)
ARMO = C.pista('segunda voz', Inst('pulso', duty=0.125, adsr=(0.003, 0.3, 0.7, 0.07), vib=(12, 5.6, 0.25)),
               vol=-6, pan=-0.35, eco=(0.75, 0.3, 0.2, 3500), reverb=0.18)
OCTA = C.pista('melodía grave', Inst('pulso', duty=0.5, adsr=(0.004, 0.3, 0.6, 0.06)), vol=-10, pan=0.25, lp=3000, reverb=0.12)
ARP = C.pista('arpegio', Inst('pulso', duty=0.5, adsr=(0.001, 0.1, 0.25, 0.05)),
              vol=-6, pan=0.35, eco=(0.75, 0.28, 0.22, 3000), lp=5500, reverb=0.12, duck=0.45)
BAJO = C.pista('bajo', Inst('pulso', duty=0.5, adsr=(0.002, 0.12, 0.55, 0.03), sub=0.6), vol=-4, lp=1600, reverb=0.03, duck=0.55)
PAD = C.pista('colchón', Inst('pulso', duty=0.3, pwm=(0.15, 0.35), adsr=(0.2, 0.6, 0.75, 0.5), doble=9),
              vol=-13, lp=2200, reverb=0.35, duck=0.6)
BOMBO = C.pista('bombo', vol=-7, reverb=0.02)
CAJA = C.pista('caja', vol=-4, reverb=0.2)
CHAR = C.pista('charles', vol=-6, pan=0.2, reverb=0.05)
PLATO = C.pista('platos', vol=-12, pan=-0.15, reverb=0.1)
L = 4

ACORDES_A = [['Am'], ['Fmaj7'], ['C'], ['G'], ['Am'], ['Fmaj7'], ['G'], ['E']]
TEMA_A = frase('E5:3 A5:3 B5:2 C6:4 B5:2 A5:2 | C6:3 A5:3 G5:2 E5:6 C5:2 | E5:3 G5:3 C6:2 D6:4 E6:2 D6:2 | B5:6 G5:2 D6:4 B5:4 |'
               'E5:3 A5:3 B5:2 C6:4 B5:2 A5:2 | C6:3 A5:3 G5:2 A5:2 C6:2 F6:4 | E6:3 D6:3 B5:2 D6:2 B5:2 G5:4 | G#5:3 B5:3 E6~:10')
ACORDES_B = [['F'], ['G'], ['Em'], ['Am'], ['Dm'], ['G'], ['C'], ['E']]
TEMA_B = frase('A5:6 G5:2 A5:4 C6:4 | B5:6 A5:2 B5:4 D6:4 | E6:6 D6:2 B5:4 G5:4 | A5:10 C6:2 B5:2 A5:2 |'
               'F5:6 E5:2 F5:4 A5:4 | G5:6 F5:2 G5:4 B5:4 | C6:6 B5:2 C6:4 E6:4 | E6:4 D6:4 B5:4 G#5:4')
ACORDES_R = [['F'], ['G'], ['Am'], ['Am'], ['F'], ['G'], ['E'], ['E']]
TEMA_R = frase('A5:4 C6:4 F6:8 | E6:4 D6:4 B5:8 | C6:4 B5:4 A5:4 E5:4 | A5:16 |'
               'A5:4 C6:4 F6:8 | G6:4 F6:4 D6:8 | E6:4 D6:4 B5:4 G#5:4 | B5:16')
MENOR = escala('A', 'menor')
ARMONICA = MENOR - {7} | {8}


def segunda_voz(t0, notas, acordes, vel=92):
    """Under the tune: a chord tone a third to a sixth below on held notes, a scale third on quick ones."""
    for b, d, m, *_ in notas:
        ch = acorde_en(acordes, b)
        if d >= 0.5:
            h = max(x for x in tonos(ch, m - 9, m - 3))
        else:
            h = tercera_abajo(m, ARMONICA if ch == 'E' else MENOR)
        ARMO.nota(t0 + b, d, h, vel + (6 if b % 1 == 0 else 0))


def bajo(t0, acordes, modo='octavas', vel=100):
    for i, (ch, *_) in enumerate(acordes):
        r = bajo_de(ch, 2)
        r = r - 12 if r > midi('D#3') else r
        if modo == 'octavas':  # eighths bouncing between octaves
            for k in range(8):
                BAJO.nota(t0 + i * L + k * 0.5, 0.5, r + (12 if k % 2 else 0), vel - (10 if k % 2 else 0))
        elif modo == 'negras':  # the half-time middle: long notes that breathe
            for b, d in ((0, 1.5), (1.5, 1), (2.5, 1.5)):
                BAJO.nota(t0 + i * L + b, d, r, vel)
        elif modo == 'redonda':
            BAJO.nota(t0 + i * L, 4, r, vel - 10)


def colchon(t0, acordes, vel=80):
    for i, (ch, *_) in enumerate(acordes):
        for m in voz_cerrada(ch, 'E4', 4 if len(tonos(ch, 'C4', 'B4')) > 3 else 3):
            PAD.nota(t0 + i * L, L, m, vel)


def bateria(t0, compases, bombo, caja, charles, abierto=None, crash=True, redoble=True, vel=100):
    for c in range(compases):
        ritmo(BOMBO, t0 + c * L, bombo, 'bombo', vel)
        ritmo(CAJA, t0 + c * L, caja if not (redoble and c == compases - 1) else caja[:12] + 'xxxx', 'caja', vel - 6)
        ritmo(CHAR, t0 + c * L, charles, 'charles', vel - 10)
        if abierto:
            ritmo(CHAR, t0 + c * L, abierto, 'abierto', vel - 14)
    if crash:
        PLATO.golpe(t0, 'crash', vel + 10)


def redoble(t0, compases=1):
    """A snare roll in sixteenths that grows, into the next section."""
    pasos = compases * 16
    for k in range(pasos):
        CAJA.golpe(t0 + k * 0.25, 'caja', 40 + int(70 * k / pasos))


def ronda(t):
    """A, A with a second voice, the half-time middle, the breakdown, the hook with everything."""
    # A: the hook alone over arpeggios, bass in octaves, a plain beat.
    tocar(LEAD, t, TEMA_A, 100)
    arpegiar(ARP, t, ACORDES_A, vel=78)
    bajo(t, ACORDES_A)
    bateria(t, 8, 'X.......x.x.....', '....x.......x...', 'o.x.o.x.o.x.o.x.')
    t += 8 * L
    # A': a second voice under the tune, the pad, sixteenth hats.
    tocar(LEAD, t, TEMA_A, 102)
    segunda_voz(t, TEMA_A, ACORDES_A)
    arpegiar(ARP, t, ACORDES_A, vel=80)
    bajo(t, ACORDES_A)
    colchon(t, ACORDES_A)
    bateria(t, 8, 'X.......x.x...x.', '....x.......x...', 'xoxoxoxoxoxoxoxo', crash=True)
    t += 8 * L
    # B: half time, the tune sings longer notes, the bass breathes.
    tocar(LEAD, t, TEMA_B, 100)
    tocar(OCTA, t, TEMA_B, 80, oct=-1)
    arpegiar(ARP, t, ACORDES_B, vel=76)
    bajo(t, ACORDES_B, 'negras')
    colchon(t, ACORDES_B, vel=86)
    bateria(t, 8, 'X.........x.....', '........x.......', 'o.x.o.x.o.x.o.x.')
    t += 8 * L
    # Breakdown: no drums, the tune on a soft triangle with a long echo; the beat creeps back.
    tocar(SUAVE, t, TEMA_R, 96)
    arpegiar(ARP, t, ACORDES_R, vel=70)
    colchon(t, ACORDES_R, vel=90)
    bajo(t, ACORDES_R[:4], 'redonda')
    bajo(t + 4 * L, ACORDES_R[4:6], 'octavas', vel=84)
    for c in range(4, 7):
        ritmo(CHAR, t + c * L, 'o.x.o.x.o.x.o.x.', 'charles', 84)
        ritmo(BOMBO, t + c * L, 'x.......x.......', 'bombo', 84)
    bajo(t + 6 * L, ACORDES_R[6:], 'octavas', vel=92)
    redoble(t + 7 * L)
    t += 8 * L
    # A'': four on the floor, open hats off the beat, the tune doubled an octave down.
    tocar(LEAD, t, TEMA_A, 106)
    segunda_voz(t, TEMA_A, ACORDES_A, vel=96)
    tocar(OCTA, t, TEMA_A, 84, oct=-1)
    arpegiar(ARP, t, ACORDES_A, vel=84)
    bajo(t, ACORDES_A, vel=104)
    colchon(t, ACORDES_A, vel=84)
    bateria(t, 8, 'X...x...x...x...', '....x.......x...', 'x.o.x.o.x.o.x.o.', abierto='..x...x...x...x.')
    return t + 8 * L


RONDA = 40 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('todo-gas-bucle', C.render(hasta=t), RONDA * 60 / BPM)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    revisa('ruptura', TEMA_R, ACORDES_R)

# Intro: the arpeggio and the pad over long bass notes, the bass gets going, a roll into the hook.
INTRO = [['Am'], ['Fmaj7'], ['C'], ['G']]
arpegiar(ARP, 0, INTRO, vel=88)
colchon(0, INTRO, vel=84)
bajo(0, INTRO[:2], 'redonda', vel=96)
bajo(2 * L, INTRO[2:], 'octavas', vel=90)
redoble(3 * L)
t = ronda(4 * L)
t = ronda(t)
# Ending: the hook's first bar and a held A minor chord with a crash.
tocar(LEAD, t, frase('E5:3 A5:3 B5:2 C6:4 B5:2 A5:2'), 104)
LEAD.nota(t + L, 2 * L, 'A5', 104, desde='B5')
for m in ('A2', 'A3'):
    BAJO.nota(t, 0.5, m, 100)
BAJO.nota(t + L, 2 * L, 'A2', 100)
colchon(t, [['Am'], ['Am'], ['Am']], vel=90)
arpegiar(ARP, t, [['Am']], vel=80)
for k, x in enumerate(tonos('Am', 'A3', 'A6')):
    ARP.nota(t + L + k * 0.125, 2 * L - k * 0.125, x, 70)
BOMBO.golpe(t, 'bombo', 112)
BOMBO.golpe(t + L, 'bombo', 112)
PLATO.golpe(t + L, 'crash', 116)
exportar('todo-gas', C.render(), fundido=2.5)
