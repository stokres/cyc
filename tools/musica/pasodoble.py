# «Pasodoble del camionero»: an original festive pasodoble, the kind a town band plays at the
# fiestas, with a lorry in it. 2/4, F major, 116 bpm. A diesel starts up and honks, a fanfare,
# a jaunty first strain over tuba and «chunda-chunda» horns, a second strain in D minor with a
# Spanish turn (the A seventh with its flat sixth) that ends with the lorry reversing, and the
# trio in B flat: first sung low by tenor sax, horns and trombones, then «fuerte» with the
# trumpets an octave up and fanfare figures on top. The air horn (sinte, tuned to the band)
# answers in the rests; brakes, the reversing beeper and the engine are sinte too.
#
#   python3 pasodoble.py                  listening version: lorry, fanfare, once round, ending -> pasodoble.mp3
#   python3 pasodoble.py bucle [salida]   intro once, then the round in a loop (the end card's music)
#   Every round ends with the fanfare's last bar, so the loop starts right after the fanfare.
import random
import sys
from orquesta import Orquesta, tocar, raiz_en
from sinte import Cancion, Inst, frase, revisa, acorde_en, tonos, voz_cerrada, midi, exportar, exportar_bucle

BPM = 116
L = 2  # beats in a bar: 2/4
O = Orquesta(BPM, swing=0.5, semilla=61, sala=1.5)
TPTA = O.instrumento(0, 'trompetas', 56, vol=0, pan=0.15, reverb=0.22, hp=150)
CLAR = O.instrumento(1, 'clarinetes', 71, vol=-3, pan=-0.25, reverb=0.22, hp=150)
ALTO = O.instrumento(2, 'saxos altos', 65, vol=-4, pan=-0.4, reverb=0.2, hp=130)
TENOR = O.instrumento(3, 'saxo tenor', 66, vol=-3, pan=0.3, reverb=0.2, hp=90)
TBN = O.instrumento(4, 'trombones', 57, vol=-4, pan=0.35, reverb=0.22, hp=70)
TROMPA = O.instrumento(5, 'trompas', 60, vol=-5, pan=-0.15, reverb=0.25, hp=90)
TUBA = O.instrumento(6, 'tuba', 58, vol=1, reverb=0.1)
FLAUTIN = O.instrumento(7, 'flautín', 72, vol=-6, pan=0.1, reverb=0.25, hp=300)
BAT = O.instrumento(9, 'percusión', 48, vol=0, reverb=0.15)

C = Cancion(BPM)
BOCINA = C.pista('bocina', Inst('bocina', adsr=(0.03, 0.15, 0.9, 0.12), ataque=(-1.0, 0.06), vib=(8, 6.0, 0.1)), vol=-11, hp=180, lp=3800, reverb=0.12)
CAMION = C.pista('camión', vol=-10, reverb=0.1)

ACORDES_F = [['F'], ['F'], ['C7'], ['F'], ['Bb'], ['F/C'], ['C7'], ['C7']]
FANFARRIA = frase('C5:3 C5:1 F5:2 A5:2 | C6:6 A5:2 | Bb5:3 G5:1 E5:2 C5:2 | F5:4 -:4 | D5:3 F5:1 Bb5:2 D6:2 | C6:4 A5:4 | G5:3 Bb5:1 E5:2 G5:2 | C5:2 C5:2 C5:2 -:2', largo=8)
ACORDES_A = [['F'], ['F'], ['C7'], ['C7'], ['C7'], ['C7'], ['F'], ['F'], ['F'], ['F7'], ['Bb'], ['Gm'], ['F/C'], ['C7'], ['F'], ['F']]
TEMA_A = frase('A4:2 C5:2 F5:3 E5:1 | F5:2 A5:2 C6:4 | Bb5:3 A5:1 G5:2 E5:2 | C5:6 -:2 | G4:2 Bb4:2 E5:3 D5:1 | E5:2 G5:2 Bb5:4 | A5:3 G5:1 F5:2 C5:2 | F5:6 -:2 |'
               'A4:2 C5:2 F5:3 E5:1 | Eb5:2 F5:2 A5:4 | D6:3 C6:1 Bb5:2 F5:2 | G5:3 F5:1 D5:2 Bb4:2 | A4:2 C5:2 F5:2 A5:2 | Bb5:3 G5:1 E5:2 C5:2 | F5:4 A5:2 C6:2 | F5:4 -:4', largo=8)
ACORDES_B = [['Dm'], ['Dm'], ['C'], ['C'], ['Bb'], ['Bb'], ['A7'], ['A7'], ['Dm'], ['Dm'], ['C'], ['C'], ['Bb'], ['A7'], ['Dm'], ['F7']]
TEMA_B = frase('D5:2 E5:2 F5:3 E5:1 | D5:2 A4:2 D5:4 | E5:2 F5:2 G5:3 F5:1 | E5:2 C5:2 E5:4 | D5:2 F5:2 Bb5:3 A5:1 | F5:2 D5:2 Bb4:4 | C#5:2 E5:2 G5:3 F5:1 | E5:2 C#5:2 A4:4 |'
               'D5:2 E5:2 F5:3 E5:1 | D5:2 F5:2 A5:4 | G5:2 A5:2 Bb5:3 A5:1 | G5:2 E5:2 C5:4 | D5:2 F5:2 Bb5:2 A5:2 | G5:2 F5:2 E5:2 C#5:2 | D5:6 -:2 | F5:2 Eb5:2 C5:2 A4:2', largo=8)
ACORDES_T = [['Bb'], ['Bb'], ['F7'], ['F7'], ['F7'], ['F7'], ['Bb'], ['Bb'], ['Bb'], ['Bb7'], ['Eb'], ['Ebm'], ['Bb/F'], ['F7'], ['Bb'], ['Bb']]
TRIO = frase('F4:4 Bb4:4 | D5:6 C5:2 | C5:4 A4:4 | Eb5:6 D5:2 | C5:4 F4:4 | A4:6 C5:2 | Bb4:8 | -:4 F4:2 G4:2 |'
             'F4:4 Bb4:4 | D5:4 F5:2 Ab5:2 | G5:6 F5:2 | Gb5:6 F5:2 | F5:4 D5:4 | C5:4 Eb5:4 | D5:8 | Bb4:4 -:4', largo=8)


def chunda(t0, acordes, vel=88, ligero=False):
    """The pasodoble's «chunda»: tuba on the beat (root, then fifth), horns and trombones short
    on the off-beats."""
    for i, (ch, *_) in enumerate(acordes):
        r = raiz_en(ch, 'F1', 'E2')
        quinta = r + 7 if r + 7 <= midi('C3') else r - 5
        O.nota(TUBA, t0 + i * L, 0.5, r, vel + 8, legato=0.7, humano=0.006)
        if ligero:
            continue
        O.nota(TUBA, t0 + i * L + 1, 0.5, quinta, vel, legato=0.7, humano=0.006)
        v = voz_cerrada(ch, 'C4', 3)
        for b in (0.5, 1.5):
            O.acorde(TROMPA, t0 + i * L + b, 0.5, v, vel - 10, rasgueo=0.004, legato=0.5, humano=0.006)
            O.acorde(TBN, t0 + i * L + b, 0.5, [m - 12 for m in v[:2]], vel - 14, rasgueo=0.004, legato=0.5, humano=0.006)


def bateria(t0, compases, vel=88, caja=True, plato=True):
    """Concert bass drum on the beats, the cymbals on two, snare in the pasodoble's quick figure."""
    for c in range(compases):
        b0 = t0 + c * L
        O.nota(9, b0, 0.5, 36, vel + 8, humano=0.004)
        O.nota(9, b0 + 1, 0.5, 36, vel - 10, humano=0.004)
        if plato:
            O.nota(9, b0 + 1, 0.5, 57, vel - 16, humano=0.004)
        if caja:
            for k, ch in enumerate('x.xxx.xx'):
                if ch == 'x':
                    O.nota(9, b0 + k / 4, 0.25, 38, vel - (0 if k in (0, 4) else 18), humano=0.003)


def redoble(t0, beats, vel0=50, vel1=110):
    n = int(beats * 4)
    for k in range(n):
        O.nota(9, t0 + k / 4, 0.25, 38, int(vel0 + (vel1 - vel0) * k / n), humano=0.002)


def bocina(beat, dur, ch, vel=112):
    """The lorry's air horn, tuned to the band: two or three trumpets on the chord, low."""
    for m in tonos(ch, 'E3', 'E4')[:3]:
        BOCINA.nota(beat, dur, m, vel)


def contracanto(t0, acordes, vel=92):
    """Fanfare figures on the chord for the trio's «fuerte»: ta-ta TAA, ta ta."""
    for i, (ch, *_) in enumerate(acordes):
        ts = tonos(ch, 'A4', 'A5')
        for b, d, k in ((0, 0.25, 2), (0.25, 0.25, 2), (0.5, 0.5, 3), (1, 0.5, 1), (1.5, 0.5, 2)):
            m = ts[min(k, len(ts) - 1)]
            for canal in (CLAR, ALTO):
                O.nota(canal, t0 + i * L + b, d, m, vel - (0 if b in (0, 1) else 8), legato=0.7, humano=0.005)


def entrada(t):
    """The lorry starts, honks and lets the brakes off; the band's fanfare."""
    CAMION.golpe(t, 'motor', 110)
    bocina(t + 5.5, 0.35, 'F')
    bocina(t + 6.25, 1.1, 'F')
    CAMION.golpe(t + 7.5, 'freno', 100)
    t += 8
    siete = [n for n in FANFARRIA if n[0] < 7 * L]
    tocar(O, TPTA, t, siete, 108, legato=0.85)
    tocar(O, CLAR, t, siete, 96, legato=0.85)
    for i, (ch, *_) in enumerate(ACORDES_F[:7]):
        v = voz_cerrada(ch, 'A3', 3)
        O.acorde(TBN, t + i * L, L, v, 92, rasgueo=0, legato=0.9, humano=0.004)
        O.acorde(TROMPA, t + i * L, L, [m + 12 for m in v], 80, rasgueo=0, legato=0.9, humano=0.004)
        O.nota(TUBA, t + i * L, 1, raiz_en(ch, 'F1', 'E2'), 100, legato=0.8)
        O.nota(9, t + i * L, 0.5, 36, 96)
    O.nota(9, t, 2, 57, 110)
    bocina(t + 3 * L + 1, 0.3, 'F')   # «tu-tu» in the fanfare's rest
    bocina(t + 3 * L + 1.5, 0.4, 'F')
    enlace(t + 7 * L)
    return t + 8 * L


def enlace(t):
    """The fanfare's last bar, which also closes every round: C seventh, «ta-ta-ta» and a roll into
    the first strain. Being the same bar, the loop can start right after the fanfare."""
    tocar(O, TPTA, t, frase('C5:2 C5:2 C5:2 -:2', largo=8), 108, legato=0.85)
    tocar(O, CLAR, t, frase('C5:2 C5:2 C5:2 -:2', largo=8), 96, legato=0.85)
    v = voz_cerrada('C7', 'A3', 3)
    O.acorde(TBN, t, L, v, 92, rasgueo=0, legato=0.9, humano=0.004)
    O.acorde(TROMPA, t, L, [m + 12 for m in v], 80, rasgueo=0, legato=0.9, humano=0.004)
    O.nota(TUBA, t, 1, raiz_en('C7', 'F1', 'E2'), 100, legato=0.8)
    O.nota(9, t, 0.5, 36, 96)
    redoble(t, 2)


def ronda(t):
    random.seed(61)
    # First strain: trumpets and clarinets, the chunda underneath; the piccolo joins the second half.
    O.nota(9, t, 2, 57, 108)
    tocar(O, TPTA, t, TEMA_A, 104, legato=0.85)
    tocar(O, CLAR, t, TEMA_A, 92, legato=0.85)
    tocar(O, FLAUTIN, t + 8 * L, [(b - 8 * L, d, m) for b, d, m, *_ in TEMA_A if b >= 8 * L], 84, oct=1, legato=0.8)
    chunda(t, ACORDES_A)
    bateria(t, 16)
    bocina(t + 7 * L + 1.5, 0.35, 'F')
    bocina(t + 15 * L + 1, 0.3, 'F')
    bocina(t + 15 * L + 1.5, 0.45, 'F')
    t += 16 * L
    # Second strain, D minor: clarinets and altos; the lorry reverses in the last two bars.
    tocar(O, CLAR, t, TEMA_B, 100, legato=0.9)
    tocar(O, ALTO, t, TEMA_B, 94, legato=0.9)
    chunda(t, ACORDES_B, vel=84)
    bateria(t, 16, vel=82)
    for k in range(4):
        CAMION.golpe(t + 14 * L + k, 'pitido', 96)
    CAMION.golpe(t + 16 * L - 0.25, 'freno', 92)
    t += 16 * L
    # Trio, B flat: sung low by tenor sax, horns and trombones; clarinets soft on the off-beats.
    tocar(O, TENOR, t, TRIO, 98, legato=0.97)
    tocar(O, TROMPA, t, TRIO, 90, legato=0.97)
    tocar(O, TBN, t, TRIO, 86, oct=-1, legato=0.97)
    for i, (ch, *_) in enumerate(ACORDES_T):
        v = voz_cerrada(ch, 'F4', 3)
        for b in (0.5, 1.5):
            O.acorde(CLAR, t + i * L + b, 0.5, v, 70, rasgueo=0.004, legato=0.5, humano=0.006)
    chunda(t, ACORDES_T, vel=80, ligero=True)
    bateria(t, 16, vel=74, caja=False, plato=False)
    bocina(t + 7 * L + 0.25, 0.3, 'Bb')   # «tu-tu-tuuu» while the tune holds its B flat
    bocina(t + 7 * L + 0.75, 0.3, 'Bb')
    redoble(t + 15 * L, 2, 60, 112)
    t += 16 * L
    # Trio «fuerte»: trumpets an octave up, everyone in, fanfare figures on top, the horn at the end.
    O.nota(9, t, 2, 57, 116)
    tocar(O, TPTA, t, TRIO, 108, oct=1, legato=0.95)
    tocar(O, TENOR, t, TRIO, 98, legato=0.97)
    tocar(O, TBN, t, TRIO, 96, legato=0.97)
    tocar(O, TROMPA, t, TRIO, 92, legato=0.97)
    tocar(O, FLAUTIN, t, TRIO, 80, oct=1, legato=0.9)
    contracanto(t, ACORDES_T)
    chunda(t, ACORDES_T, vel=92)
    bateria(t, 16, vel=94)
    bocina(t + 15 * L + 1, 0.3, 'Bb')
    bocina(t + 15 * L + 1.5, 0.45, 'Bb')
    t += 16 * L
    # And back to the start through the fanfare's last bar.
    enlace(t)
    return t + L


ENTRADA = 8 + 8 * L   # beats: the lorry, then the fanfare
RONDA = 65 * L
MODO = sys.argv[1] if len(sys.argv) > 1 else ''

if MODO == 'bucle':
    t = entrada(0)
    for _ in range(2):
        t = ronda(t)
    # The first round loops: what comes before it (the fanfare's last bar) is how every round ends.
    exportar_bucle('pasodoble-bucle', O.render(hasta=t, chip=C, pegamento=(-16, 2)), RONDA * 60 / BPM, rms_db=-17, fundir=True,
                   entrada=ENTRADA * 60 / BPM, vuelta=1, salida=sys.argv[2] if len(sys.argv) > 2 else None)
    sys.exit()

if __name__ == '__main__':
    revisa('fanfarria', FANFARRIA, ACORDES_F, largo=L)
    revisa('A', TEMA_A, ACORDES_A, largo=L)
    revisa('B', TEMA_B, ACORDES_B, largo=L)
    revisa('trío', TRIO, ACORDES_T, largo=L)

t = entrada(0)
t = ronda(t)
# Ending: «chin-pún» on B flat, the horn, and the brakes.
for b, v in ((0, 104), (0.75, 120)):
    for canal, notas in ((TPTA, ('D5', 'F5', 'Bb5')), (TBN, ('Bb2', 'F3', 'D4')), (TROMPA, ('F4', 'Bb4')), (CLAR, ('Bb5', 'D6')), (ALTO, ('F5',)), (TENOR, ('D4',))):
        O.acorde(canal, t + b, 0.4 if b == 0 else 1.5, [midi(x) for x in notas], v, rasgueo=0, legato=0.85)
    O.nota(TUBA, t + b, 0.4 if b == 0 else 1.5, 'Bb1', v, legato=0.85)
    O.nota(9, t + b, 0.5, 36, v)
    O.nota(9, t + b, 1, 57, v)
bocina(t + 2.5, 1.2, 'Bb', 118)
CAMION.golpe(t + 4.25, 'freno', 104)
exportar('pasodoble', O.render(chip=C, pegamento=(-16, 2)), rms_db=-17, fundido=0.5)
