# «Hora de cerrar», the Pang's fourth theme: melancholic deep house in C minor, 123 bpm, 64 bars (about 2 minutes),
# the 2010s kind (Jesús picked it from two sketches on 17 October 2026): a bouncing M1-style organ bass up front,
# short organ chord stabs on the off-beats over Cm9 - Abmaj7 - Bbadd9 - Gm7, a sad little hook of pitched "oh"
# vocal chops, 909 kick, off-beat open hats and claps. Original: the hook and every line are written for this piece.
#
#   python3 pang_deep.py                 the piece once, with a tail (pang-deep.mp3, to listen to)
#   python3 pang_deep.py bucle [salida]  three rounds cut for a seamless loop (salida: the game's copy,
#                                        ../../src/sonido/pang-deep.mp3)
#
# Groove (bars 1-8): drums and bass. Stabs come in through a filter that opens (9-16). Drop (17-32): the hook.
# Breakdown (33-40): no kick, a pad and the hook stretched out over Abmaj7 - Bbadd9 - Gm7 - Cm9, a riser.
# Second drop (41-56): the hook with an answer an octave up, then a second voice; ride and congas. Coda (57-64): the
# hook goes, the stabs close, a clap roll leads back to the groove.
import sys
import numpy as np
import deephouse as D
from deephouse import Cancion, frase, ritmo

BPM, COMPASES, L = 123, 64, 4
ACORDES = {'Cm9': (['Eb4', 'G4', 'Bb4', 'D5'], 'C2'), 'Abmaj7': (['Eb4', 'G4', 'Ab4', 'C5'], 'Ab1'),
           'Bbadd9': (['D4', 'F4', 'Bb4', 'C5'], 'Bb1'), 'Gm7': (['D4', 'F4', 'G4', 'Bb4'], 'G1')}
VUELTA = ['Cm9', 'Abmaj7', 'Bbadd9', 'Gm7']
PUENTE = ['Abmaj7', 'Bbadd9', 'Gm7', 'Cm9']
GANCHO = ['-:3 G5:1 -:2 G5:2 -:2 Bb5:1 -:1 G5:2 -:2', '-:3 G5:1 -:2 Eb5:2 -:2 G5:1 -:1 C6:2 -:2',
          '-:3 F5:1 -:2 D5:2 -:2 F5:1 -:1 Bb5:2 -:2', '-:3 F5:1 -:2 D5:2 -:2 Bb4:1 -:1 D5:2 -:2']
# the answer in the second drop: the last chop of bars 2 and 4 jumps up
RESPUESTA = [GANCHO[0], '-:3 G5:1 -:2 Eb5:2 -:2 G5:1 -:1 C6:1 Eb6:3', GANCHO[2], '-:3 F5:1 -:2 D5:2 -:2 Bb4:1 -:1 D5:1 F5:3']
LARGO = frase('G5:16 | Bb5:8 C6:8 | G5:16 | Eb5:8 D5:8')  # the hook stretched out in the breakdown
BAJO = '{r}:2 -:1 {o}:1 -:2 {r}:1 -:1 {o}:2 -:1 {r}:1 -:2 {o}:2'


def progresion(c):
    return PUENTE[c % 4] if 32 <= c < 40 else VUELTA[c % 4]


def pcs(beat):
    v, r = ACORDES[progresion(int(beat // L) % COMPASES)]
    return {D.nota(x) % 12 for x in v + [r]}


def bateria(p, rng, t, c, kick=True, clap=True, abiertos=True, cerrados=True, shk=True, extra=True, ride=False, congas=False):
    if kick:
        ritmo(p['bombo'], t, 'x...x...x...x...', 'bombo909', 114)
    if clap:
        ritmo(p['palmas'], t, '....x.......x...' if c % 4 != 3 else '....x.......x.o.', 'palmas', 104, humano=3, rng=rng)
    if abiertos:
        ritmo(p['abierto'], t, '..x...x...x...x.', 'abierto909', 100, humano=4, rng=rng)
    if cerrados:
        ritmo(p['charles'], t, 'xoxoxoxoxoxoxoxo', 'charles', 92, humano=7, rng=rng)
    if shk:
        ritmo(p['shaker'], t, '.x.x.x.x.x.x.x.x', 'shaker', 90, humano=6, rng=rng)
    if extra:
        ritmo(p['rim'], t, '...x..x....x..x.' if c % 2 else '......x..x....x.', 'rim', 92, humano=5, rng=rng)
    if ride:
        ritmo(p['ride'], t, 'x.o.x.o.x.o.x.o.', 'ride', 84, humano=6, rng=rng)
    if congas:
        ritmo(p['congas'], t, '..........x..x.x' if c % 2 else '......x...x.....', 'conga', 90, humano=6, rng=rng)


def hora_de_cerrar():
    C = Cancion(BPM, COMPASES * 3, swing=0.53, semilla=6)
    rng = np.random.default_rng(7)
    p = {
        'bombo': C.pista('bombo', vol=-5),
        'palmas': C.pista('palmas', vol=-9, reverb=0.08, sala=0.25),
        'abierto': C.pista('abierto', vol=-6, pan=0.1, sala=0.06),
        'charles': C.pista('charles', vol=-10, pan=-0.25),
        'shaker': C.pista('shaker', vol=-18, pan=0.3, sala=0.1),
        'rim': C.pista('rim', vol=-13, pan=-0.3, reverb=0.15),
        'ride': C.pista('ride', vol=-21, pan=0.35, reverb=0.12),
        'congas': C.pista('congas', vol=-17, pan=-0.4, reverb=0.1, sala=0.15),
        'platos': C.pista('platos', vol=-19, reverb=0.2),
    }
    bajo = C.pista('bajo', 'organo', vol=-4, duck=0.3)
    stabs = C.pista('stabs', 'organo', vol=-12, reverb=0.2, eco=(0.75, 0.25, 0.2, 3000), duck=0.5, hp=250)
    pad = C.pista('pad', 'pad', vol=-16, reverb=0.35, duck=0.6, coro=(0.5, 11, 3, 0.3), ancho=1.3)
    voz = C.pista('voz', vol=-9, reverb=0.25, eco=(0.75, 0.3, 0.25, 3500), duck=0.25)
    voz2 = C.pista('voz 2', vol=-14, reverb=0.3, eco=(0.75, 0.3, 0.2, 3500), duck=0.25, pan=0.2)
    largas = C.pista('voz larga', vol=-14, reverb=0.5, eco=(1.5, 0.35, 0.25, 3000), ancho=1.2)
    fx = C.pista('efectos', vol=-16, reverb=0.3, ancho=1.3)

    puntos_stabs, puntos_pad, puntos_bombo = [], [], []
    for k in range(3):
        r0 = k * COMPASES * L
        puntos_stabs += [(r0, 700), (r0 + 8 * L, 700), (r0 + 16 * L, 5000), (r0 + 32 * L, 5000), (r0 + 33 * L, 1800),
                         (r0 + 40 * L, 5000), (r0 + 56 * L, 5000), (r0 + 63 * L, 1300), (r0 + 64 * L - 0.01, 700)]
        puntos_pad += [(r0, 600), (r0 + 32 * L, 900), (r0 + 39 * L, 2600), (r0 + 56 * L, 1600), (r0 + 64 * L - 0.01, 600)]
        puntos_bombo += [(r0, 20000), (r0 + 37.99 * L, 20000), (r0 + 38 * L, 250), (r0 + 39.75 * L, 2500), (r0 + 40 * L, 20000)]
    stabs.filtro = (puntos_stabs, 0.25)
    pad.filtro = (puntos_pad, 0.15)
    p['bombo'].filtro = (puntos_bombo, 0.1)

    def ronda(r0):
        for c in range(COMPASES):
            t = r0 + c * L
            v, r = ACORDES[progresion(c)]
            o = f'{r[:-1]}{int(r[-1]) + 1}'
            # bass: the bounce everywhere but the breakdown, which holds the roots until the riser
            if c < 32 or c >= 40:
                for b, du, m in frase(BAJO.format(r=r, o=o)):
                    bajo.nota(t + b, du * 0.8, m, 104 if b % 1 == 0 else 98)
            elif c >= 36:
                bajo.nota(t, 3.5, r, 84)
            # stabs on the off-beats from bar 9; long chords in the breakdown
            if 8 <= c < 32 or c >= 40:
                for pos in (2, 6, 10, 14):
                    stabs.acorde(t + pos / 4, 0.3, v, 100 if pos in (2, 10) else 90)
            elif c >= 32:
                stabs.acorde(t, 3.6, v, 76, rasgueo=0.02)
            if 32 <= c < 56:
                pad.acorde(t, L, [r if D.nota(r) > 40 else o] + v, 80)
            # the hook
            if 16 <= c < 32:
                D.cantar(C, voz, t, frase(GANCHO[c % 4]), 100, semilla=c, vocal='o', vib=0, ataque=0.006, suelta=0.1, ancho=6)
            elif 40 <= c < 56:
                notas = frase(RESPUESTA[c % 4])
                D.cantar(C, voz, t, notas, 102, semilla=c, vocal='o', vib=0, ataque=0.006, suelta=0.1, ancho=6)
                if c >= 48:
                    D.cantar(C, voz2, t, D.tercera(notas, t, pcs), 94, semilla=c + 500, vocal='o', vib=0, ataque=0.006,
                             suelta=0.1, ancho=6)
            if c in (32, 36):
                D.cantar(C, largas, t, LARGO, 92, semilla=c, vocal='u', suelta=1.0)
            # drums
            if c < 32:
                bateria(p, rng, t, c, clap=c >= 4 and c != 15, abiertos=c >= 2, shk=c >= 4, extra=c >= 8, congas=c >= 24)
                if c == 15:
                    ritmo(p['palmas'], t, '....x...x.x.xxxx', 'palmas', 88)
            elif c < 38:
                bateria(p, rng, t, c, kick=False, clap=False, abiertos=False, cerrados=c >= 34, extra=False)
            elif c < 40:
                bateria(p, rng, t, c, clap=False, abiertos=False, extra=False)
                if c == 39:
                    ritmo(p['palmas'], t, 'x.x.x.x.xxxxxxxx', 'palmas', 90)
            elif c < 63:
                bateria(p, rng, t, c, ride=c < 56, congas=True)
            else:
                bateria(p, rng, t, c, clap=False, extra=False)
                ritmo(p['palmas'], t, '....x...x.x.xxxx', 'palmas', 86)
        for c, tipo, vel in ((16, 'crash', 96), (40, 'crash', 100), (40, 'impacto', 100), (32, 'impacto', 84)):
            p['platos'].golpe(r0 + c * L, tipo, vel)
        fx.pegar(r0 + 14 * L, D.subida(2 * L * C.beat_s, 300, 8000))
        fx.pegar(r0 + 38 * L, D.subida(2 * L * C.beat_s, 200, 9000))
        fx.pegar(r0 + 32 * L, D.bajada(4 * L * C.beat_s))

    D.revisa('gancho', [n for c in range(4) for n in [(b + c * L, d, m) for b, d, m in frase(GANCHO[c])]], pcs)
    D.revisa('respuesta', [n for c in range(4) for n in [(b + c * L, d, m) for b, d, m in frase(RESPUESTA[c])]], pcs)
    D.revisa('larga', LARGO, lambda b: pcs(32 * L + b))
    return C, ronda


if __name__ == '__main__':
    C, ronda = hora_de_cerrar()
    largo_s = COMPASES * L * C.beat_s
    if len(sys.argv) > 1 and sys.argv[1] == 'bucle':
        for k in range(3):
            ronda(k * COMPASES * L)
        D.exportar_bucle(C.render(cola=4.0), 'pang-deep-bucle', largo_s, largo_s,
                         salida=sys.argv[2] if len(sys.argv) > 2 else None)
    else:
        C.compases = COMPASES
        ronda(0)
        D.exportar(C.render(cola=5.0), 'pang-deep')
