# «Charanga del jueves»: the main theme. A Spanish fiesta brass band (charanga) playing a
# pasodoble-flavoured tune, with a wink: oom-pah tuba, horns on the off-beats, two trumpets
# in close harmony, a trombone that slides, clarinet runs, bass drum and cymbals («pum-chin»).
# Form: fanfare, A (twice), trio in the subdominant with the trombone, A with everyone, «chin-pún».
from partitura import Pieza, n
from comun import pcs, cercana, tocar, choques

P = Pieza(bpm=122, swing=0.5, semilla=21)
TRP1, TRP2, TBN, TUBA, PAH, CLAR, PICC, BAT = 0, 1, 2, 3, 4, 5, 6, 9
for c, prog, vol, pan, rev in [(TRP1, 56, 110, 52, 38), (TRP2, 56, 96, 60, 38), (TBN, 57, 76, 78, 40), (TUBA, 58, 112, 64, 25),
                               (PAH, 61, 118, 84, 35), (CLAR, 71, 104, 96, 40), (PICC, 72, 84, 36, 45), (BAT, 0, 112, 64, 28)]:
    if c != BAT:
        P.programa(c, prog)
    P.mezcla(c, vol, pan, rev)
P.rango_bend(TBN, 12)
L = 2  # 2/4

A = {'Bb': pcs(['Bb', 'D', 'F']), 'F7': pcs(['F', 'A', 'C', 'Eb']), 'Bb7': pcs(['Bb', 'D', 'F', 'Ab']), 'Eb': pcs(['Eb', 'G', 'Bb']),
     'Ebm6': pcs(['Eb', 'Gb', 'Bb', 'C']), 'G7': pcs(['G', 'B', 'D', 'F']), 'C7': pcs(['C', 'E', 'G', 'Bb']),
     'Eb7': pcs(['Eb', 'G', 'Bb', 'Db']), 'Ab': pcs(['Ab', 'C', 'Eb']), 'Abm': pcs(['Ab', 'Cb', 'Eb']), 'Cm': pcs(['C', 'Eb', 'G'])}
for k in list(A):
    A[k] = {x % 12 for x in A[k]}
RAIZ = {'Bb': 'Bb1', 'F7': 'F1', 'Bb7': 'Bb1', 'Eb': 'Eb2', 'Ebm6': 'Eb2', 'G7': 'G1', 'C7': 'C2', 'Eb7': 'Eb2', 'Ab': 'Ab1', 'Abm': 'Ab1', 'Cm': 'C2'}

# ---------------------------------------------------------------- A (in Bb)
ACORDES_A = [['Bb'], ['Bb'], ['F7'], ['F7'], ['F7'], ['F7'], ['Bb'], ['Bb'],
             ['Bb'], ['Bb7'], ['Eb'], ['Ebm6'], ['Bb'], ['G7'], ['C7', 'F7'], ['Bb']]
TEMA_A = [
    [(0, .5, 'D5'), (.5, .5, 'D5'), (1, .5, 'D5'), (1.5, .5, 'Eb5')],
    [(0, 1.5, 'F5'), (1.5, .5, 'D5')],
    [(0, .5, 'C5'), (.5, .5, 'C5'), (1, .5, 'C5'), (1.5, .5, 'D5')],
    [(0, 1.5, 'Eb5'), (1.5, .5, 'C5')],
    [(0, .5, 'A4'), (.5, .5, 'C5'), (1, .5, 'Eb5'), (1.5, .5, 'C5')],
    [(0, 1, 'A4'), (1, .5, 'F4')],
    [(0, .5, 'Bb4'), (.5, .5, 'D5'), (1, .5, 'F5'), (1.5, .5, 'D5')],
    [(0, 1, 'Bb4')],
    [(0, .5, 'D5'), (.5, .5, 'D5'), (1, .5, 'D5'), (1.5, .5, 'Eb5')],
    [(0, 1, 'F5'), (1, 1, 'Ab5')],
    [(0, 1.5, 'G5'), (1.5, .5, 'F5')],
    [(0, 1.5, 'Gb5'), (1.5, .5, 'F5')],
    [(0, .5, 'F5'), (.5, .5, 'D5'), (1, .5, 'Bb4'), (1.5, .5, 'D5')],
    [(0, 1.5, 'G5'), (1.5, .5, 'F5')],
    [(0, .5, 'E5'), (.5, .5, 'G5'), (1, .5, 'Eb5'), (1.5, .5, 'C5')],
    [(0, 1, 'Bb4')],
]
# Second time round, a climbing finish instead of the last two bars.
FIN_A = [[(0, .5, 'E5'), (.5, .5, 'G5'), (1, .5, 'A5'), (1.5, .5, 'C6')], [(0, 1.5, 'Bb5')]]
TEMA_A2 = TEMA_A[:14] + FIN_A

# ---------------------------------------------------------------- trio (in Eb), the trombone sings
ACORDES_B = [['Eb'], ['Eb'], ['Bb7'], ['Bb7'], ['Bb7'], ['Bb7'], ['Eb'], ['Eb'],
             ['Eb'], ['Eb7'], ['Ab'], ['Abm'], ['Eb'], ['C7'], ['F7', 'Bb7'], ['Eb']]
TEMA_B = [
    [(0, 1.5, 'G3'), (1.5, .5, 'Ab3')], [(0, 2, 'Bb3')],
    [(0, 1.5, 'D4'), (1.5, .5, 'C4')], [(0, 1, 'Bb3'), (1, 1, 'Ab3')],
    [(0, 1, 'F3'), (1, 1, 'Ab3')], [(0, 1, 'D4'), (1, .5, 'C4'), (1.5, .5, 'Bb3')],
    [(0, 2, 'G3')], [],  # bar 8: the trombone slides down instead («wah»)
    [(0, 1.5, 'G3'), (1.5, .5, 'Ab3')], [(0, 1, 'Bb3'), (1, 1, 'Db4')],
    [(0, 2, 'C4')], [(0, 2, 'B3')],
    [(0, 1.5, 'Bb3'), (1.5, .5, 'G3')], [(0, 1, 'G3'), (1, 1, 'Bb3')],
    [(0, 1, 'C4'), (1, 1, 'D4')], [(0, 1, 'Eb4')],
]

def um_pa(c0, acordes, vel_tuba=92, vel_pah=80, pah=True):
    """Tuba on the beats (root, then fifth), horns' short chord on each off-beat."""
    for i, cs in enumerate(acordes):
        for b in range(L):
            ch = cs[min(b, len(cs) - 1)]
            r = n(RAIZ[ch])
            P.nota(TUBA, c0 + i * L + b, 0.5, r if b == 0 else r + 7 - (12 if r + 7 > n('C3') else 0), vel_tuba - (8 if b else 0), legato=0.7)
            if pah:
                voz = sorted(x for x in range(n('D4'), n('C5')) if x % 12 in A[ch])[:3]
                P.acorde(PAH, c0 + i * L + b + 0.5, 0.5, voz, vel_pah, rasgueo=0, legato=0.45)

def pum_chin(c0, compases, fuerte=True):
    for i in range(compases):
        b = c0 + i * L
        P.nota(BAT, b, .5, 36, 96 if fuerte else 70)                 # bass drum
        P.nota(BAT, b + 1, .5, 36, 70 if fuerte else 52)
        P.nota(BAT, b + 1, .5, 49 if fuerte else 51, 48 if fuerte else 40)  # «chin»: cymbal (ride when soft)
        P.nota(BAT, b + 1.5, .25, 38, 34)                              # a whisper of snare
        if i % 8 == 7:                                                 # roll into the next phrase
            for k in range(8):
                P.nota(BAT, b + 1 + k * 0.125, .125, 38, 40 + k * 7, humano=0.002)

def contracanto(c0, acordes, vel=74):
    """Trombone counter-line: one chord tone a bar, smooth, with a slide at the end of each 8."""
    prev = n('F3')
    for i, cs in enumerate(acordes):
        prev = cercana(prev, A[cs[0]], 'Bb2', 'Eb4')
        if i % 8 == 7:
            P.glis(TBN, c0 + i * L + 0.5, 1.2, prev + 7, prev, vel + 6, curva=0.6)
        else:
            P.nota(TBN, c0 + i * L, 2, prev, vel, legato=0.95)

def clarinete_corre(c0, acordes, vel=64):
    """Clarinet running up and down the chord in eighths, cheeky, in the gaps."""
    for i, cs in enumerate(acordes):
        tonos = sorted(x for x in range(n('Bb4'), n('C6')) if x % 12 in A[cs[0]])
        figura = [tonos[0], tonos[1], tonos[2], tonos[1]] if i % 2 == 0 else [tonos[2], tonos[1], tonos[0], tonos[1]]
        for k, t in enumerate(figura):
            P.nota(CLAR, c0 + i * L + k * 0.5, 0.5, t, vel + (6 if k % 2 == 0 else 0), legato=0.55)

# ---------------------------------------------------------------- the piece
t = 0.0
# Fanfare: snare roll, the trumpets climb, a brass hit, the trombone slides up, a dominant stab.
for k in range(16):
    P.nota(BAT, t + k * 0.125, .125, 38, 36 + k * 4, humano=0.002)
for k, x in enumerate(['F4', 'Bb4', 'D5', 'F5']):
    P.nota(TRP1, t + k * 0.5, .5, x, 96 + k * 4, legato=0.8)
    P.nota(TRP2, t + k * 0.5, .5, n(x) - (3 if k % 2 else 4), 88 + k * 4, legato=0.8)
P.nota(TRP1, t + 2, 1, 'Bb5', 112, legato=0.6)
P.nota(TRP2, t + 2, 1, 'F5', 100, legato=0.6)
P.acorde(PAH, t + 2, 1, ['D4', 'F4', 'Bb4'], 96, rasgueo=0, legato=0.6)
P.nota(TUBA, t + 2, 1, 'Bb1', 100, legato=0.6)
P.nota(BAT, t + 2, 1, 49, 100)
P.nota(BAT, t + 2, 1, 36, 100)
P.glis(TBN, t + 4, 1.4, 'F3', 'C4', 92, curva=0.7)
P.acorde(PAH, t + 6, .5, ['Eb4', 'F4', 'A4'], 92, rasgueo=0, legato=0.5)
P.nota(TUBA, t + 6, .5, 'F1', 100, legato=0.5)
P.nota(BAT, t + 6, .5, 36, 96)
P.nota(BAT, t + 6, .5, 55, 80)
t += 4 * L

# A, twice: trumpets in close harmony; the second time the trombone joins with a counter-line.
for vuelta, tema in enumerate([TEMA_A, TEMA_A2]):
    um_pa(t, ACORDES_A)
    pum_chin(t, 16)
    tocar(P, TRP1, t, tema, L, 94 + vuelta * 6, legato=0.8, armonia=True, acordes=[[A[c] for c in cs] for cs in ACORDES_A], canal2=TRP2, vel2=84 + vuelta * 6)
    if vuelta:
        contracanto(t, ACORDES_A)
    else:
        # The trombone's comic answer in the gap of bar 8 and bar 16.
        P.glis(TBN, t + 7 * L + 1, 0.9, 'F3', 'Bb3', 88, curva=0.5)
        P.glis(TBN, t + 15 * L + 1, 0.9, 'F3', 'Bb3', 92, curva=0.5)
    t += 16 * L

# Trio: softer, the trombone sings (and steps forward), the clarinet runs, a slide at bar 8.
P.control(TBN, t - 0.1, 7, 112)
P.control(TBN, t + 16 * L - 0.2, 7, 76)
um_pa(t, ACORDES_B, vel_tuba=84, vel_pah=60)
pum_chin(t, 16, fuerte=False)
tocar(P, TBN, t, TEMA_B, L, 90, legato=0.95)
P.glis(TBN, t + 7 * L, 1.6, 'G3', 'Eb3', 92, curva=1.8)
clarinete_corre(t, ACORDES_B)
# Back to A: brass stab on F7 and a snare roll.
P.acorde(PAH, t + 15 * L + 1, .5, ['Eb4', 'F4', 'A4'], 90, rasgueo=0, legato=0.5)
for k in range(8):
    P.nota(BAT, t + 15 * L + 1 + k * 0.125, .125, 38, 50 + k * 8, humano=0.002)
t += 16 * L

# A with everyone: piccolo an octave up, clarinet doubling the second voice, the trombone counter-line.
um_pa(t, ACORDES_A, vel_tuba=100, vel_pah=66)
pum_chin(t, 16)
P.nota(BAT, t, 1, 49, 104)
tocar(P, TRP1, t, TEMA_A2, L, 104, legato=0.8, armonia=True, acordes=[[A[c] for c in cs] for cs in ACORDES_A], canal2=TRP2, vel2=94)
tocar(P, PICC, t, TEMA_A2, L, 74, oct=1, legato=0.7)
tocar(P, CLAR, t, TEMA_A2, L, 70, legato=0.7)
contracanto(t, ACORDES_A, vel=82)
t += 16 * L

# «Chin-pún»: a short dominant stab and the tonic hit with a crash, then silence.
for c, notas, v in [(PAH, ['Eb4', 'F4', 'A4'], 100), (TRP1, ['C5'], 110), (TRP2, ['A4'], 100), (TBN, ['F3'], 100), (TUBA, ['F1'], 104), (CLAR, ['Eb5'], 90), (PICC, ['C6'], 84)]:
    P.acorde(c, t, .4, notas, v, rasgueo=0, legato=0.6)
for c, notas, v in [(PAH, ['D4', 'F4', 'Bb4'], 112), (TRP1, ['Bb5'], 120), (TRP2, ['F5'], 110), (TBN, ['Bb3'], 110), (TUBA, ['Bb1'], 112), (CLAR, ['D5'], 96), (PICC, ['Bb6'], 90)]:
    P.acorde(c, t + 1, .5, notas, v, rasgueo=0, legato=0.7)
P.nota(BAT, t, .5, 36, 100)
P.nota(BAT, t + 1, .5, 36, 120)
P.nota(BAT, t + 1, 2, 49, 115)
P.guardar('charanga-del-jueves.mid')

if __name__ == '__main__':
    choques('A', TEMA_A, L, [[A[c] for c in cs] for cs in ACORDES_A])
    choques('A (final)', TEMA_A2, L, [[A[c] for c in cs] for cs in ACORDES_A])
    choques('trío', TEMA_B, L, [[A[c] for c in cs] for cs in ACORDES_B])
    print('duración', round((t + 3) * 60 / 122, 1), 's')
