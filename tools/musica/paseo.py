# «Paseo por Usera»: calm, cheerful music for walking about and exploring. D major with
# seventh chords, a lilting swing, a soft square lead (low-passed, so it is round rather than
# buzzy), a little chip marimba walking through the chords, a bouncing triangle bass, bells
# answering the tune, a soft kick, a rim tick and a shaker. Lots of air between the notes,
# so it can sit under dialogue. 100 bpm.
#
#   python3 paseo.py          listening version: twice round, ending           -> paseo.mp3
#   python3 paseo.py bucle    the round three times, cut for a seamless loop  -> paseo-bucle.mp3
#   python3 paseo.py acustica the same score on SoundFont instruments          -> paseo-acustica.mp3
import subprocess
import sys
from sinte import (Cancion, Inst, frase, revisa, tocar, ritmo, arpegiar, voz_cerrada, bajo_de, midi,
                   exportar, exportar_bucle, a_midi)

BPM = 100
C = Cancion(BPM, swing=0.6)
LEAD = C.pista('melodía', Inst('pulso', duty=0.5, adsr=(0.012, 0.35, 0.7, 0.12), vib=(12, 5.0, 0.3)),
               vol=-4, lp=2600, eco=(0.75, 0.25, 0.18, 2500), reverb=0.25)
CAMPANA = C.pista('campanitas', Inst('campana', adsr=(0.002, 0.6, 0.0, 0.5), fm=(3.0, 1.4, 0.25)),
                  vol=-3, pan=0.35, eco=(0.75, 0.3, 0.25, 5000), reverb=0.32)
MARIMBA = C.pista('marimba chip', Inst('pulso', duty=0.25, adsr=(0.002, 0.16, 0.0, 0.1), ataque=(12, 0.003)),
                  vol=-2, pan=-0.3, lp=3200, reverb=0.2)
BAJO = C.pista('bajo', Inst('triangulo', pasos=16, adsr=(0.003, 0.18, 0.5, 0.06), sub=0.3), vol=1, lp=2200, reverb=0.04)
PAD = C.pista('colchón', Inst('pulso', duty=0.5, pwm=(0.12, 0.25), adsr=(0.4, 1.0, 0.7, 0.8), doble=8),
              vol=-11, lp=1300, reverb=0.45)
BOMBO = C.pista('bombo', vol=-5, reverb=0.04)
CLIC = C.pista('clic', vol=-4, pan=-0.1, reverb=0.15)
SHAKER = C.pista('shaker', vol=-2, pan=0.25, reverb=0.1)
L = 4

ACORDES_A = [['Dmaj7'], ['Bm7'], ['Em7'], ['A7'], ['Dmaj7'], ['Bm7'], ['Gmaj7'], ['A7sus4', 'A7']]
TEMA_A = frase('A4:2 D5:2 F#5:4 E5:2 D5:2 E5:4 | F#5:6 D5:2 B4:8 | G4:2 B4:2 E5:4 D5:2 B4:2 D5:4 | C#5:4 E5:4 A5:4 G5:4 |'
               'F#5:2 A5:2 D6:4 C#6:2 A5:2 B5:4 | A5:6 F#5:2 D5:8 | B4:2 D5:2 G5:4 F#5:2 E5:2 D5:4 | E5:4 D5:4 C#5:4 -:4')
CAMPANA_A = frase('-:16 | -:8 D6:2 F#6:2 A6:4 | -:16 | -:16 | -:16 | -:8 F#6:2 D6:2 B5:4 | -:16 | -:12 A5:2 C#6:2')
ACORDES_B = [['Gmaj7'], ['F#m7'], ['Em7'], ['Dmaj7'], ['Gmaj7'], ['F#m7'], ['Em7'], ['A7']]
TEMA_B = frase('D6:6 B5:2 G5:8 | C#6:6 A5:2 F#5:8 | B5:4 G5:4 E5:4 D5:4 | F#5:12 -:4 |'
               'D6:4 E6:4 D6:4 B5:4 | C#6:4 E6:4 C#6:4 A5:4 | B5:4 G5:4 E5:4 G5:4 | A5:4 G5:4 E5:4 C#5:4')
CAMPANA_B = frase('-:16 | -:16 | -:16 | -:8 A5:2 D6:2 F#6:2 A6:2 | -:16 | -:16 | -:16 | -:16')
ACORDES_I = [['Gmaj7'], ['F#m7'], ['Em7'], ['A7sus4', 'A7']]
CAMPANA_I = frase('B5:2 D6:2 F#6:4 -:8 | A5:2 C#6:2 E6:4 -:8 | G5:2 B5:2 D6:4 E6:2 D6:2 B5:4 | A5:8 C#6:4 E6:4')


def bajo(t0, acordes, vel=100):
    """Root, the fifth on the swung 'and' of two, root an octave up on three, and a step into the next chord."""
    for i, cs in enumerate(acordes):
        ch = cs[0]
        r = bajo_de(ch, 2)
        r = r - 12 if r > midi('E3') else r
        sig = acordes[(i + 1) % len(acordes)][0]
        rs = bajo_de(sig, 2)
        rs = rs - 12 if rs > midi('E3') else rs
        paso = rs - 1 if rs != r else r + 7
        for b, m, v in ((0, r, vel), (1.5, r + 7, vel - 16), (2, r + 12, vel - 8), (3.5, paso, vel - 14)):
            BAJO.nota(t0 + i * L + b, 0.5, m, v)


def marimba(t0, acordes, vel=88):
    arpegiar(MARIMBA, t0, acordes, patron=(0, 2, 1, 3, 2, 1, 3, 2), paso=0.5, desde='A3', vel=vel, dur=0.5)


def colchon(t0, acordes, vel=78):
    for i, cs in enumerate(acordes):
        for m in voz_cerrada(cs[0], 'E4', 4):
            PAD.nota(t0 + i * L, L, m, vel)


def bateria(t0, compases, bombo=True, vel=96):
    for c in range(compases):
        if bombo:
            ritmo(BOMBO, t0 + c * L, 'x.......x.o.....', 'bombo suave', vel)
            ritmo(CLIC, t0 + c * L, '....x.......x...', 'clic', vel - 6)
        ritmo(SHAKER, t0 + c * L, 'o.x.o.x.o.x.o.x.', 'shaker', vel)


def ronda(t):
    # A: the tune, the marimba and the bass, just a shaker.
    tocar(LEAD, t, TEMA_A, 96)
    marimba(t, ACORDES_A)
    bajo(t, ACORDES_A)
    bateria(t, 8, bombo=False)
    t += 8 * L
    # A': the beat comes in, the bells answer the tune.
    tocar(LEAD, t, TEMA_A, 98)
    tocar(CAMPANA, t, CAMPANA_A, 96)
    marimba(t, ACORDES_A)
    bajo(t, ACORDES_A)
    bateria(t, 8)
    t += 8 * L
    # B: the subdominant side, a soft pad underneath.
    tocar(LEAD, t, TEMA_B, 96)
    tocar(CAMPANA, t, CAMPANA_B, 96)
    marimba(t, ACORDES_B, vel=84)
    bajo(t, ACORDES_B)
    colchon(t, ACORDES_B)
    bateria(t, 8)
    t += 8 * L
    # A breather: no tune, the bells wander over the marimba.
    tocar(CAMPANA, t, CAMPANA_I, 100)
    marimba(t, ACORDES_I, vel=84)
    bajo(t, ACORDES_I, vel=92)
    colchon(t, ACORDES_I, vel=70)
    bateria(t, 4, bombo=False)
    t += 4 * L
    # A'': the tune with the bells an octave up, all together.
    tocar(LEAD, t, TEMA_A, 100)
    tocar(CAMPANA, t, TEMA_A, 80, oct=1)
    marimba(t, ACORDES_A, vel=90)
    bajo(t, ACORDES_A)
    colchon(t, ACORDES_A, vel=70)
    bateria(t, 8)
    return t + 8 * L


RONDA = 36 * L
BUCLE = len(sys.argv) > 1 and sys.argv[1] == 'bucle'

if BUCLE:
    t = 0
    for _ in range(3):
        t = ronda(t)
    exportar_bucle('paseo-bucle', C.render(hasta=t), RONDA * 60 / BPM, rms_db=-19)
    sys.exit()

if __name__ == '__main__':
    revisa('A', TEMA_A, ACORDES_A)
    revisa('B', TEMA_B, ACORDES_B)
    revisa('campanas A', CAMPANA_A, ACORDES_A)
    revisa('campanas B', CAMPANA_B, ACORDES_B)
    revisa('campanas del respiro', CAMPANA_I, ACORDES_I)

t = ronda(0)
t = ronda(t)
# Ending: the tune's first bar onto a held D major seventh, a last bell.
tocar(LEAD, t, frase('A4:2 D5:2 F#5:4 E5:2 D5:2 E5:4'), 96)
LEAD.nota(t + L, 2 * L, 'D5', 92)
CAMPANA.nota(t + L, 2, 'F#6', 90)
CAMPANA.nota(t + L + 0.5, 2, 'A6', 84)
CAMPANA.nota(t + L + 1, 3, 'C#7', 80)
marimba(t, [['Dmaj7']])
colchon(t, [['Dmaj7'], ['Dmaj7']], vel=80)
BAJO.nota(t, 0.5, 'D2', 100)
BAJO.nota(t + L, 2 * L, 'D2', 96)
BOMBO.golpe(t + L, 'bombo suave', 100)

if len(sys.argv) > 1 and sys.argv[1] == 'acustica':
    # The same score on real instruments from the SoundFont (render.sh): flute, glockenspiel,
    # a nylon guitar picking the marimba's part and letting it ring, upright bass, slow
    # strings, and the brush kit.
    a_midi(C, 'paseo-acustica.mid', {
        'melodía': (73, 96, 60, 50, 0.9), 'campanitas': (9, 124, 84, 60, 1.0), 'marimba chip': (24, 114, 44, 40, 2.2),
        'bajo': (32, 112, 64, 20, 0.8), 'colchón': (49, 82, 64, 70, 1.0),
        'bombo': 0.9, 'clic': 0.85, 'shaker': 0.8}, kit=40, kit_mezcla=(96, 70, 30))
    subprocess.run(['sh', 'render.sh', 'paseo-acustica', '0.5'], check=True)
else:
    exportar('paseo', C.render(), rms_db=-19, fundido=3.0)
