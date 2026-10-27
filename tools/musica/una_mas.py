# «Una más», the music of the chapter 2 metroidvania (src/conceptos/): Fran and his mug in the world of the concepts,
# in the manner of Hollow Knight: Silksong (baroque strings that never sit still, harpsichord and harp, a choir, big
# drums) with the game's own DNA: the chant «Ca-mio-neees y ca-ra-va-naaas» (canto.py: D D G, A A A C# D) comes back in
# every piece, reharmonised in the minor (Gm, Ebmaj7, Cm over the same notes; a picardy D major only for the rescue).
# All of it is our own and in code, the same way as the rest of the game: it stands on sol.py, sol_combate.py and
# sol_final.py (score tools, mixer, hall, loop export; their harpsichord, harp, pizzicato, choir, organ, kettledrums,
# tam-tam, trumpet, risers, wind), adds a bowed string section (violins I and II, cello) and a taiko, and exports the
# same way: -16 LUFS, 24 kHz, 80 kbps MP3, a loop that joins sample-exactly after an intro that is heard once.
# Pure synthesis with numpy: no SoundFont, no fluidsynth, no scipy, no mido, no AI.
#
#   «unaMasExplora»  the world of the concepts, mysterious and with a pulse: D minor, 90 bpm, 56 bars (149.3 s) in a loop
#                    after a 2-bar intro. 1-8 mist (harp, cello pedal, a violin tune, the chant whispered by the choir
#                    at the end), 9-16 the tune with a pulse (cello eighths, heartbeat, pizzicato), 17-24 a second tune
#                    over a harpsichord in 3+3+2, 25-32 THE CHANT in full (violins, brass, choir) twice (the second time
#                    with trumpet and organ), 33-40 the bridge (tremolo, a flute, a whispering choir, a build), 41-48 the
#                    tune again with everything, 49-56 the way back to the mist.
#   «unaMasJardin»   the Cierzo garden, the same world seen from the wind: A minor, 105 bpm, 52 bars (the harp and the
#                    flute, gusts, bells like leaves).
#   «unaMasTeatro»   the Theatre of the Concepts, the same world on stage: G minor, 100 bpm, 48 bars (harpsichord,
#                    dramatic pizzicato and string stabs, an organ, kettledrums).
#   «unaMasMiniboss» the fight against the Gran Despertador: E minor, 150 bpm, 56 bars (a galloping cello and violins, taiko,
#                    the chant shouted by the choir).
#   «unaMasJefe»     LA ÚLTIMA, the Ultimosaurio: D minor, 120 bpm, 76 bars, and then the third phase, a quarter faster (150 bpm),
#                    20 bars: 152 s + 32 s = 184 s in the loop. Choir, kettledrums, organ, trumpets, the chant at its biggest.
#   «unaMasRescate»  the fanfare when a friend is rescued and a skill is won: the chant in D major, 6.4 s, heard once.
#
#   python3 una_mas.py [carpeta]            -> the six MP3 in `carpeta` (the game's copy: ../../src/sonido)
#   python3 una_mas.py explora [salida]     only one (also jardin, teatro, miniboss, jefe, rescate; `salida` may be a .mp3)
#   python3 una_mas.py revisar              lists the melody notes on a beat that are not tones of their chord
#   python3 una_mas.py analisis [carpeta]   measures the MP3 (seams, loudness against the game's other tracks, bands)
import os
import sys
from contextlib import contextmanager
import numpy as np
import sol as S
import sol_combate as C
import sol_final as F
from sol import Partitura, melodia, bateria, redoble, tambores, armonia_debajo, raiz_grave, tiempo, adsr, ruido_ba, inst, \
    decodificar, mezclar, medir
from sol_final import voces, pedal, notas_de, canta, arpegio, polvo
from brio import SR, db, hz, midi, eq, sierra, vel_a_amp

L = 4
OBJETIVO = -16.0                     # LUFS: the same as the rest of the game's music
KBPS = 80

# =================================================================================================================
# New instruments (registered in sol.py's table, so its mixer plays them)
# =================================================================================================================


def _arco(m, g, v, rng, desv, art, lp=3300, grave=False):
    """A bowed string section: saws a few cents apart through a body filter, a little rosin at the start of the bow.
    `art`: 'c' short (spiccato), 'm' marcato (an accent that settles), 'l' long (slow bow, a late vibrato)."""
    cola = 0.12 if art == 'c' else 0.45
    nm = int((g + cola) * SR) + 1
    t = tiempo(nm)
    vib = (0.0042 * np.sin(2 * np.pi * (5.2 + 0.5 * rng.random()) * t + rng.random() * 6.28) * np.clip((t - 0.22) / 0.35, 0, 1)
           if art == 'l' else 0.0)
    w = np.zeros(nm)
    for c in desv:
        f = np.full(nm, float(hz(m))) * 2 ** (c / 1200) * (1 + vib)
        w += sierra(f, rng.random())
    w = w / len(desv)
    if grave:
        w = eq(w, ('hp', 55, 2), ('pico', 260, 2.0, 0.7), ('lp', lp, 2), circ=False)
    else:
        w = eq(w, ('hp', 170, 2), ('pico', 2100, 2.2, 0.4), ('lp', lp, 2), circ=False)
    w = w + 0.1 * ruido_ba(rng, nm, 2200, 7000) * np.exp(-t / 0.025)
    if art == 'c':
        e = adsr(nm, g, 0.006, 0.07, 0.15, 0.05)
    elif art == 'm':
        e = adsr(nm, g, 0.01, 0.35, 0.55, 0.10)
    else:
        e = adsr(nm, g, 0.07, 1e3, 1.0, 0.16)
    return w * e * vel_a_amp(v) * 2.0


@inst
def vlnI(m, g, v, rng, art='l'):
    return _arco(m, g, v, rng, (-13, 0, 12), art)


@inst
def vlnII(m, g, v, rng, art='l'):
    return _arco(m, g, v, rng, (-11, 2, -1), art)


@inst
def chelo(m, g, v, rng, art='c'):
    return _arco(m, g, v, rng, (-8, 0, 9), art, lp=1800, grave=True)


@inst
def taiko(m, g, v, rng):
    """A big drum tuned low: a deep body that drops in pitch as it is struck, a skin thump and the click of the stick."""
    nm = int(1.4 * SR)
    t = tiempo(nm)
    fr = float(hz(m)) * (1 + 1.1 * np.exp(-t / 0.03))
    w = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.38) + 0.5 * np.sin(2 * np.pi * np.cumsum(fr * 1.5) / SR) * np.exp(-t / 0.12)
    w = w + 0.8 * ruido_ba(rng, nm, 80, 700) * np.exp(-t / 0.025) + 0.3 * ruido_ba(rng, nm, 1800, 5500) * np.exp(-t / 0.004)
    w = np.tanh(1.5 * w)
    w[-128:] *= np.linspace(1, 0, 128)
    return w * vel_a_amp(v)


# name: (pan, active level dB, reverb send, echo): the stems of this file that the others do not know
NUEVOS = dict(vlnI=(-0.4, -24.0, 0.3, 0.0), vlnII=(0.4, -26.0, 0.3, 0.0), chelo=(0.05, -23.5, 0.12, 0.0),
              taiko=(0.0, -22.0, 0.3, 0.0))


@contextmanager
def tema(bpm, acordes, mezcla=None, bateria_db=None):
    """sol_final's tema() plus this file's stems; `mezcla` changes the level of any stem for this track only."""
    with F.tema(bpm, acordes, {**NUEVOS, **(mezcla or {})}, bateria_db):
        yield


# =================================================================================================================
# The chant and its harmonies, in D minor (every track transposes: T() the chords, M() the tunes)
# =================================================================================================================

NOM = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


def T(acordes, k):
    """Chord names, k semitones up."""
    fuera = []
    for cs in acordes:
        fila = []
        for ch in cs:
            i = 2 if len(ch) > 1 and ch[1] in '#b' else 1
            fila.append(NOM[(S.raiz_pc(ch) + k) % 12] + ch[i:])
        fuera.append(fila)
    return fuera


def M(texto, k=0):
    """A tune from melodia(), k semitones up."""
    return [(b, d, m + k, f) for b, d, m, f in melodia(texto)]


# «Ca-mio-neees» D D G; «y ca-ra-va-naaas» A A A C# D: two bars, the syllables of canto.py.
MOTIVO = 'D5:2 D5:2 G5:12 | A5:2 A5:2 A5:2 C#6:2 D6:8'
# four bars: the chant and its answer
CORO4 = MOTIVO + ' | F6:6 D6:2 Bb5:4 D6:4 | E6:8 C#6:4 A5:4'
# the chant over other chords (two bars each): the G over Gm, over Eb major seventh, over Eb; the A over A7, over F, over A7sus4
H1 = [['Gm'], ['A7', 'Dm']]
H2 = [['Ebmaj7'], ['F', 'Dm']]
H3 = [['Eb'], ['A7sus4', 'Dm']]
RESP = [['Bb', 'Gm'], ['A7sus4', 'A7']]          # the answer's two bars

# the first tune (bars 7-8 are the chant), and a second one that lifts to the major keys
AC_A = [['Dm'], ['Bbmaj7'], ['Gm'], ['A7sus4', 'A7'], ['Dm'], ['Bbmaj7']] + H1
TUNE_A = M('A4:4 D5:4 F5:6 E5:2 | D5:4 F5:4 A5:8 | G5:6 F5:2 D5:4 Bb4:4 | A5:8 G5:4 E5:4 | F5:6 A5:2 D6:8 | D6:4 C6:2 Bb5:2 A5:4 F5:4 | '
           + MOTIVO)
AC_B = [['Bb'], ['F'], ['Gm7'], ['Dm', 'A7'], ['Bb'], ['Eb'], ['A7sus4'], ['A7']]
TUNE_B = M('D5:6 F5:2 Bb5:8 | A5:4 C6:4 F6:6 E6:2 | D6:6 Bb5:2 G5:8 | F5:4 A5:4 C#6:4 E6:4 | D6:6 C6:2 Bb5:8 | G5:4 Bb5:4 Eb6:8 | '
           'E6:6 D6:2 A5:8 | A5:4 C#6:4 E6:8')
# the chant twice: its two harmonisations and the answer
AC_C = H1 + RESP + H2 + RESP
# the bridge, climbing to the dominant
AC_D = [['Gm'], ['Eb'], ['Cm7'], ['F'], ['Gm'], ['Eb'], ['Bb', 'A7sus4'], ['A7']]
# the way back
AC_E = [['Dm'], ['Bbmaj7'], ['Gm'], ['Dm'], ['Bbmaj7'], ['Gm'], ['A7sus4'], ['A7']]
TUNE_E = M('A5:8 F5:4 E5:4 | D5:6 F5:2 A5:8 | G5:6 F5:2 D5:4 Bb4:4 | A4:16 | F5:8 D5:4 F5:4 | Bb4:8 D5:4 G5:4 | A5:8 G5:4 E5:4 | C#5:8 E5:4 A4:4')
TUNE_D = M('D6:8 Bb5:4 G5:4 | Bb5:8 G5:4 Eb5:4 | G5:8 Eb5:4 C5:4 | A5:8 C6:4 F6:4 | D6:8 Bb5:4 G5:4 | Bb5:8 G5:4 Eb6:4 | '
           'D6:4 F6:4 E6:4 D6:4 | C#6:4 E6:4 A5:8')


def cello(P, c, patron, vel, dur=0.2, art='c', lo=36, pista='chelo', k=0):
    """A bar of cello (or any low string) on the chord's root: R root, O octave, F fifth above, f fifth below."""
    for p, s in enumerate(patron):
        if s == '.':
            continue
        b = c * L + p / 4
        m = raiz_grave(S.ch_en(b), lo) + {'R': 0, 'O': 12, 'F': 7, 'f': -5}[s]
        P.nota(pista, b, dur, m, vel + (8 if p % 4 == 0 else 0), art=art)


def osti(P, c, pista, patron, vel, desde, hasta, art='c', gate=0.2):
    """A bar of repeated chord tones: each digit of `patron` is the index (from `desde` upwards) of the tone, '.' a rest."""
    for p, s in enumerate(patron):
        if s == '.':
            continue
        b = c * L + p / 4
        ts = S.tonos(S.ch_en(b), desde, hasta)
        P.nota(pista, b, gate, ts[int(s) % len(ts)], vel + (8 if p % 4 == 0 else 0), art=art)


def pizzs(P, c, posiciones, vel, desde='C4', hasta='G5', n=3):
    """Pizzicato chords (the n lowest tones in range) on the given sixteenths of the bar."""
    for p in posiciones:
        b = c * L + p / 4
        for m in S.tonos(S.ch_en(b), desde, hasta)[:n]:
            P.nota('pizz', b, 0.25, m, vel)


def taikos(P, c, beats, vel, k=0):
    for x in beats:
        P.nota('taiko', c * L + x, 1.0, midi('D2') + k, vel)


def segunda(P, pista, mel, b0, vel, art=None, dur=0.9):
    """A second voice a third below the tune (`art` for the bowed strings: long unless said otherwise)."""
    opc = {'art': art} if art else ({'art': 'l'} if pista.startswith('vln') else {})
    for b, d, m, _ in mel:
        P.nota(pista, b0 + b, d * dur, armonia_debajo(m, S.ch_en(b0 + b)), vel, **opc)


def acelerar(P, desde, k):
    """Everything from beat `desde` on happens k times as fast in beats (k < 1): the same bars, a quicker tempo."""
    for evs in P.ev.values():
        for e in evs:
            if e['b'] >= desde:
                e['b'] = desde + (e['b'] - desde) * k
                e['d'] = e['d'] * k


def motivo4(P, b0, quien, k=0):
    """The chant and its answer (4 bars) on a list of (stem, semitones, velocity, options); the choir sings it with its
    octave below."""
    mel = M(CORO4, k)
    for pista, sube, vel, opc in quien:
        mel2 = [(b, d, m + sube, f) for b, d, m, f in mel]
        if pista == 'coro':
            canta(P, mel2, b0, vel, **opc)
        else:
            notas_de(P, pista, mel2, b0, vel, dur=0.95, acento=4, **opc)


def golpe(P, b, vel, lo='G3', hi='D5', dur=0.55):
    """A string stab: the chord's tones in range, spread over the two violins and the cello, all marcato."""
    for i, m in enumerate(S.tonos(S.ch_en(b), lo, hi)):
        P.nota(('chelo', 'vlnII', 'vlnI', 'vlnII', 'vlnI', 'vlnII', 'vlnI')[i % 7], b, dur, m, vel, art='m')


def pasos(P, c, pista, patron, vel, desde, hasta, dur=0.22, **opc):
    """Eighths or sixteenths of a melodic run over the bar's chord tones (index into the tones in range, '.' a rest)."""
    for p, s in enumerate(patron):
        if s == '.':
            continue
        b = c * L + p / 4
        ts = S.tonos(S.ch_en(b), desde, hasta)
        P.nota(pista, b, dur, ts[int(s) % len(ts)], vel + (8 if p % 4 == 0 else 0), **opc)


def suavizar(auto, f=0.5):
    """The dynamics of the arrangement carry most of the contrast already; the per-bar gains only lean on it, so the loud
    parts are not hotter nor the quiet ones softer than the rest of the game's music (their 10-90 % range is ~4 dB)."""
    media = sum(auto) / len(auto)
    return [round(media + f * (a - media), 2) for a in auto]


def muestras(bpm, barras):
    return C.muestras_barras(bpm, barras)


def exportar(componer, hacer_intro, acordes, bpm, barras, barras_intro, auto, auto_intro, salida, mezcla=None, bateria_db=None, rt=1.6,
             nombre='', kbps=KBPS):
    with tema(bpm, acordes, mezcla, bateria_db):
        P = componer()
        I = hacer_intro(P)
        inicio, fin = F.exportar_bucle(P, I, bpm, barras, barras_intro, auto, auto_intro, salida, rt=rt, objetivo=OBJETIVO, kbps=kbps)
    print(f"  musica.ts: {{ url: {nombre}, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")
    return inicio, fin


# =================================================================================================================
# unaMasExplora
# =================================================================================================================

BPM_EXPLORA = 90
BARRAS_EXPLORA = 56
ACORDES_EXPLORA = AC_A + AC_A + AC_B + AC_C + AC_D + AC_A + AC_E

MEZCLA_EXPLORA = dict(vlnI=(-0.4, -23.5, 0.3, 0.0), coro=(0.0, -24.5, 0.45, 0.0), trompeta=(0.0, -27.0, 0.3, 0.0),
                      arpa=(-0.45, -26.0, 0.28, 0.2), clave=(-0.3, -28.0, 0.35, 0.2), viento=(0.0, -32.0, 0.5, 0.0))
AUTO_EXPLORA = ([-4.5] * 8 + [-2.5] * 8 + [-2.0] * 8 + [1.0] * 8 + [-3.0, -3.0, -2.5, -2.5, -2.0, -1.5, -1.0, 0.0] + [1.0] * 8
                + [-1.0, -2.0, -3.0, -3.5, -4.0, -4.5, -4.5, -4.5])
AUTO_EXPLORA = suavizar(AUTO_EXPLORA)
AUTO_INTRO_EXPLORA = [AUTO_EXPLORA[0] - 1.0, AUTO_EXPLORA[55]]


def componer_explora():
    """The 56 bars of the round -> a Partitura (beats count from the start of the round; a bar is 4)."""
    P = Partitura()
    A, A2, B, Cc, D, A3, E = 0.0, 32.0, 64.0, 96.0, 128.0, 160.0, 192.0
    voces(P, 'cuerdasI', ACORDES_EXPLORA, [36] * 8 + [44] * 8 + [52] * 8 + [58] * 8 + [40, 44, 48, 52, 56, 60, 64, 70] + [60] * 8 + [40] * 8,
          'D3', 'F5', n=4, lado='I')
    voces(P, 'cuerdasD', ACORDES_EXPLORA, [36] * 8 + [44] * 8 + [52] * 8 + [58] * 8 + [40, 44, 48, 52, 56, 60, 64, 70] + [60] * 8 + [40] * 8,
          'D3', 'F5', n=4, lado='D')
    P.nota('bat', 0.0, 1, 'plato', 60)
    # ---- 1-8 mist: a harp on eighths, a cello pedal and a sub, a violin tune, wind and the odd bell; the chant is only whispered
    pedal(P, 'chelo', ACORDES_EXPLORA[:8], 46, lo=36, art='l')
    pedal(P, 'sub', ACORDES_EXPLORA[:8], 60, lo=26)
    notas_de(P, 'vlnI', TUNE_A[:-8], A, 58, dur=0.97, acento=3, art='l')
    for c in range(8):
        S.arpa_compas(P, c, 'corcheas', 50, desde='D3', hasta='D5')
    for b, d, m, _ in TUNE_A[-8:]:
        P.nota('coro', A + b, d * 0.96, (m - 12, m), 40, vocal='u')
    P.nota('viento', 0.0, 16.0, 0, 60)
    P.nota('viento', 16.0, 16.0, 0, 56)
    polvo(P, 3, 8, 0, 32, 'D6', 'A6')
    taikos(P, 3, (3.0,), 50)
    taikos(P, 7, (3.0,), 60)
    # ---- 9-16 the tune with a pulse: violins and flute, a staccato cello on eighths, a heartbeat, pizzicato off-beats
    notas_de(P, 'vlnI', TUNE_A, A2, 80, dur=0.97, acento=4, art='l')
    notas_de(P, 'flauta', TUNE_A, A2, 56, dur=0.95, vib=1)
    segunda(P, 'vlnII', TUNE_A, A2, 56)
    for c in range(8, 16):
        cello(P, c, 'R.R.R.R.R.R.R.R.' if c % 2 == 0 else 'R.R.R.R.R.R.ROFO', 66)
        S.arpa_compas(P, c, 'corcheas', 46, desde='D4', hasta='D6')
        pizzs(P, c, (6, 14), 62)
        taikos(P, c, (0.0, 2.0), 66)
        bateria(P, c, {'rim': '....x.......x...'}, -14)
    tambores(P, 15 * L + 2.0, ('tom4', 'tom3', 'tom2', 'tom1'), 70, 96, 0.5)
    P.nota('bat', A2, 1, 'plato', 70)
    # ---- 17-24 the second tune: oboe and violin over a harpsichord in 3+3+2, long chords, the choir comes in humming
    notas_de(P, 'vlnI', TUNE_B, B, 84, dur=0.97, acento=4, art='l')
    notas_de(P, 'oboe', TUNE_B, B, 70, dur=0.95)
    segunda(P, 'vlnII', TUNE_B, B, 58)
    voces(P, 'organo', AC_B, 40, 'D3', 'D5', n=3, b0=B, reg='suave')
    for c in range(16, 24):
        arpegio(P, c, 'tresytres', 54, 'D4', 'D6', 'clave')
        cello(P, c, 'R..R..R...R.....' if c % 2 == 0 else 'R..R..R...R.R.F.', 70)
        taikos(P, c, (0.0,), 70)
        pizzs(P, c, (10,), 56)
        bateria(P, c, {'rim': '....x.......x...', 'charles': 'o...o...o...o...'}, -12)
    voces(P, 'coroI', AC_B[4:], 50, 'D4', 'D6', n=3, b0=B + 16, vocal='o')
    voces(P, 'coroD', AC_B[4:], 50, 'D4', 'D6', n=3, b0=B + 16, vocal='o')
    redoble(P, 23 * L + 1.0, 3.0, 50, 112, 'caja')
    for k in range(16):
        P.nota('timbal', 23 * L + 2.0 + k * 0.125, 0.125, midi('D2'), 56 + 3 * k)
    P.nota('bat', B, 1, 'plato', 74)
    # ---- 25-32 THE CHANT, twice: violins in unison with the brass an octave below and the trumpet, the choir singing it,
    # kettledrums on every beat, a galloping cello; the second time with the organ and the answers an octave higher
    P.nota('bat', Cc, 1, 'crash', 108)
    P.nota('tamtam', Cc, 4, 0, 92)
    ronda1, ronda2 = M(CORO4), M(CORO4, 0)
    for r, (mel, b0, veces) in enumerate(((ronda1, Cc, 1), (ronda2, Cc + 16, 2))):
        notas_de(P, 'vlnI', mel, b0, 96, dur=0.95, acento=4, art='m')
        notas_de(P, 'vlnII', [(b, d, m - 12, f) for b, d, m, f in mel], b0, 84, dur=0.95, acento=4, art='m')
        notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in mel], b0, 76, dur=0.92, acento=4)
        canta(P, mel, b0, 92 + 4 * r)
        if r == 1:
            notas_de(P, 'trompeta', mel, b0, 72, dur=0.92, acento=4)
            voces(P, 'organo', AC_C[4:], 62, 'D3', 'D5', n=4, b0=b0, reg='pleno')
            pedal(P, 'organo', AC_C[4:], 56, b0=b0, reg='pleno')
    pedal(P, 'sub', AC_C, 84, lo=26, b0=Cc)
    for c in range(24, 32):
        cello(P, c, 'RRORRORRRORRORRO'[:16], 78)
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 76 if c < 28 else 84)
        bateria(P, c, {'bombo_banda': 'x.......x.......', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}, -2)
        if c % 4 == 0:
            P.nota('bat', c * L, 1, 'crash', 104)
    tambores(P, 27 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 90, 116, 0.25)
    redoble(P, 31 * L + 1.0, 3.0, 54, 120, 'caja')
    tambores(P, 31 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 96, 122, 0.25)
    # ---- 33-40 the bridge: tremolo violins, a harp falling, a whispering choir, a heartbeat, and a build
    for c in range(32, 40):
        v = 46 + 5 * (c - 32)
        osti(P, c, 'vlnI', '3232323232323232', v, 'G4', 'G6', art='c', gate=0.2)
        osti(P, c, 'vlnII', '1010101010101010', v - 6, 'G3', 'G5', art='c', gate=0.2)
        S.arpa_compas(P, c, 'tresytres', 46 + 3 * (c - 32), desde='D4', hasta='D6')
        cello(P, c, 'R...............', 56 + 3 * (c - 32), dur=3.8, art='l')
        taikos(P, c, (0.0,), 52 + 3 * (c - 32))
    voces(P, 'coroI', AC_D, 40, 'D4', 'D6', n=3, b0=D, vocal='u', extra=0.3)
    voces(P, 'coroD', AC_D, 40, 'D4', 'D6', n=3, b0=D, vocal='u', extra=0.3)
    pedal(P, 'sub', AC_D, 70, lo=26, b0=D)
    notas_de(P, 'flauta', TUNE_D, D, 64, dur=0.97, acento=3, vib=1)
    notas_de(P, 'oboe', TUNE_D, D, 50, dur=0.95)
    P.nota('subida', 38 * L, 8.0, 0, 88)
    redoble(P, 38 * L, 8.0, 40, 124, 'caja')
    for k in range(32):
        P.nota('timbal', 38 * L + k * 0.25, 0.25, midi('A1'), 54 + int(2 * k))
    P.nota('bat', D + 28, 1, 'plato', 72)
    # ---- 41-48 the tune again with everything: violins in unison and a third below, the trumpet, the choir, the cello gallops,
    # a full kit and the harp in 3+3+2
    P.nota('bat', A3, 1, 'crash', 112)
    P.nota('tamtam', A3, 4, 0, 94)
    notas_de(P, 'vlnI', TUNE_A, A3, 94, dur=0.97, acento=4, art='l')
    segunda(P, 'vlnII', TUNE_A, A3, 76)
    notas_de(P, 'trompeta', TUNE_A, A3, 74, dur=0.95)
    notas_de(P, 'flauta', [(b, d, m + 12, f) for b, d, m, f in TUNE_A], A3, 56, dur=0.95, vib=1)
    canta(P, TUNE_A, A3, 76)
    for c in range(40, 48):
        cello(P, c, 'R.RR.RR.R.RR.RR.' if c % 2 == 0 else 'R.RR.RR.R.RRORO.', 78)
        S.arpa_compas(P, c, 'tresytres', 54, desde='D4', hasta='D6')
        pizzs(P, c, (6, 14), 60)
        taikos(P, c, (0.0, 2.0, 3.0), 76)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}, -4)
        if c in (40, 44):
            P.nota('bat', c * L, 1, 'crash', 100)
    redoble(P, 47 * L + 2.0, 2.0, 56, 112, 'caja')
    # ---- 49-56 the way back to the mist: a flute and a violin, the harp, the strings thinning out, the wind returning
    notas_de(P, 'flauta', TUNE_E, E, 74, dur=0.97, acento=3, vib=1)
    notas_de(P, 'vlnI', TUNE_E, E, 56, dur=0.97, acento=3, art='l')
    pedal(P, 'chelo', AC_E, 48, b0=E, lo=36, art='l')
    pedal(P, 'sub', AC_E, 56, lo=26, b0=E)
    for c in range(48, 56):
        S.arpa_compas(P, c, 'corcheas', 48 - 2 * (c - 48), desde='D3', hasta='D5')
    P.nota('viento', E + 8, 24.0, 0, 62)
    polvo(P, 9, 6, E, E + 32, 'D6', 'A6')
    taikos(P, 55, (3.0,), 56)
    return P


def intro_explora(P):
    """The intro (2 bars): the mist rising, wind and a harp over a held note; then the loop's last bar."""
    I = Partitura()
    I.nota('viento', 0.0, 6.0, 0, 68)
    I.nota('sub', 0.0, 4.2, midi('D1'), 70)
    I.nota('chelo', 0.0, 4.2, midi('D2'), 44, art='l')
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (50, 57, 62, 65), 34, lado=pista[-1])
    for k, m in enumerate(('D3', 'A3', 'D4', 'F4', 'A4', 'D5', 'F5', 'A5')):
        I.nota('arpa', 0.5 + k * 0.5, 0.5, midi(m), 44 + 3 * k)
    I.nota('taiko', 3.0, 1.0, midi('D2'), 50)
    I.anadir(P.trozo(55 * L, 56 * L, 1 * L))
    return I


def exportar_explora(salida):
    return exportar(componer_explora, intro_explora, ACORDES_EXPLORA, BPM_EXPLORA, BARRAS_EXPLORA, 2, AUTO_EXPLORA,
                    AUTO_INTRO_EXPLORA, salida, MEZCLA_EXPLORA, nombre='unaMasExplora', rt=1.8)


def tr(mel, k):
    """A tune from M(), k semitones up."""
    return [(b, d, m + k, f) for b, d, m, f in mel]


AC_C2 = H1 + RESP + H3 + RESP
AC_C3 = H2 + RESP + H1 + RESP
TUNE_E2 = [(b - 16, d, m, f) for b, d, m, f in TUNE_E if b >= 16]          # the last four bars of the way back
AC_A_DOM = AC_A[:7] + [['A7']]                                                # the tune's end over the dominant, to start again


# =================================================================================================================
# unaMasJardin
# =================================================================================================================

BPM_JARDIN = 105
BARRAS_JARDIN = 52
K_J = -5                                                                      # A minor
ACORDES_JARDIN = T(AC_A + AC_A + AC_B + AC_C2 + AC_D + AC_A_DOM + AC_E[4:], K_J)

MEZCLA_JARDIN = dict(flauta=(-0.12, -22.0, 0.3, 0.1), arpa=(-0.45, -25.0, 0.3, 0.22), vlnI=(-0.4, -25.0, 0.3, 0.0),
                     viento=(0.0, -30.0, 0.5, 0.0), cajita=(0.45, -30.0, 0.5, 0.3), taiko=(0.0, -24.0, 0.3, 0.0),
                     chelo=(0.05, -25.0, 0.12, 0.0), pizz=(0.5, -28.0, 0.16, 0.0))
AUTO_JARDIN = ([-4.0] * 8 + [-2.5] * 8 + [-2.0] * 8 + [0.0] * 8 + [-3.0, -3.0, -2.5, -2.5, -2.0, -1.5, -0.5, 0.5] + [0.5] * 8
               + [-1.5, -2.5, -3.5, -4.0])
AUTO_JARDIN = suavizar(AUTO_JARDIN)
AUTO_INTRO_JARDIN = [AUTO_JARDIN[0] - 1.0, AUTO_JARDIN[51]]


def componer_jardin():
    """The 52 bars of the round -> a Partitura: the garden of the Cierzo, wind and harp."""
    P = Partitura()
    k = K_J
    A, A2, B, Cc, D, A3, E = 0.0, 32.0, 64.0, 96.0, 128.0, 160.0, 192.0
    ta, tb, te = tr(TUNE_A, k), tr(TUNE_B, k), tr(TUNE_E2, k)
    pad = [34] * 8 + [42] * 8 + [46] * 8 + [56] * 8 + [38, 42, 46, 50, 54, 58, 62, 66] + [52] * 8 + [36] * 4
    voces(P, 'cuerdasI', ACORDES_JARDIN, pad, 'A2', 'C5', n=4, lado='I')
    voces(P, 'cuerdasD', ACORDES_JARDIN, pad, 'A2', 'C5', n=4, lado='D')
    P.nota('bat', 0.0, 1, 'plato', 56)
    # ---- 1-8 breeze: the flute on the tune over a harp in 3+3+2, a cello pedal, gusts and bells like leaves; the chant is only hummed
    notas_de(P, 'flauta', ta[:-8], A, 84, dur=0.97, acento=3, vib=1)
    for b, d, m, _ in ta[-8:]:
        P.nota('flauta', A + b, d * 0.95, m, 84, vib=1 if d >= 1.5 else 0)
        P.nota('coro', A + b, d * 0.96, (m - 12, m), 38, vocal='u')
    pedal(P, 'chelo', ACORDES_JARDIN[:8], 44, lo=33, art='l')
    pedal(P, 'sub', ACORDES_JARDIN[:8], 56, lo=24)
    for c in range(8):
        S.arpa_compas(P, c, 'tresytres', 52, desde='A3', hasta='A5')
    for b, d, v in ((0.0, 14.0, 66), (14.0, 12.0, 58), (26.0, 6.0, 52)):
        P.nota('viento', A + b, d, 0, v)
    polvo(P, 21, 10, 0, 32, 'A5', 'E6')
    # ---- 9-16 the leaves: violins on the tune with the flute an octave up, pizzicato in 3+3+2, a walking cello, tambourine
    notas_de(P, 'vlnI', ta, A2, 76, dur=0.97, acento=4, art='l')
    notas_de(P, 'flauta', [(b, d, m + 12, f) for b, d, m, f in ta], A2, 60, dur=0.95, vib=1)
    segunda(P, 'vlnII', ta, A2, 54)
    for c in range(8, 16):
        S.arpa_compas(P, c, 'corcheas', 48, desde='A4', hasta='A6')
        cello(P, c, 'R..R..R.R..R..R.' if c % 2 == 0 else 'R..R..R.R..R..F.', 62, dur=0.3, lo=33)
        pizzs(P, c, (0, 3, 6, 8, 11, 14), 56, desde='A4', hasta='E5')
        bateria(P, c, {'pandereta': 'x.x.x.x.x.x.x.x.', 'rim': '....x.......x...', 'bombo': 'x.......x.......'}, -14)
    P.nota('bat', A2, 1, 'crash', 90)
    P.nota('viento', A2 + 6, 14.0, 0, 56)
    tambores(P, 15 * L + 2.0, ('tom4', 'tom3', 'tom2', 'tom1'), 66, 92, 0.5)
    # ---- 17-24 flowers and triangles: an oboe and a violin on the second tune, a music box an octave up, the harp running in sixteenths
    notas_de(P, 'vlnI', tb, B, 80, dur=0.97, acento=4, art='l')
    notas_de(P, 'oboe', tb, B, 66, dur=0.95)
    notas_de(P, 'cajita', [(b, d, m + 12, f) for b, d, m, f in tb], B, 56, dur=0.9, des=0.3)
    segunda(P, 'vlnII', tb, B, 56)
    for c in range(16, 24):
        arpegio(P, c, 'semis', 42, 'A3', 'A5', 'arpa')
        cello(P, c, 'R.....F.R.....F.', 64, dur=0.45, lo=33)
        bateria(P, c, {'pandereta': 'x.x.x.x.x.x.x.x.', 'rim': '....x.......x...', 'bombo': 'x.......x.x.....', 'charles': 'o.o.o.o.o.o.o.o.'}, -10)
    voces(P, 'coroI', ACORDES_JARDIN[20:24], 48, 'A3', 'A5', n=3, b0=B + 16, vocal='o')
    voces(P, 'coroD', ACORDES_JARDIN[20:24], 48, 'A3', 'A5', n=3, b0=B + 16, vocal='o')
    P.nota('bat', B, 1, 'plato', 72)
    P.nota('viento', B + 10, 16.0, 0, 52)
    redoble(P, 23 * L + 1.0, 3.0, 50, 108, 'caja')
    # ---- 25-32 THE CHANT, twice, the garden's way: flute and violins, a gentle choir, the harp running; the second time with brass and organ
    P.nota('bat', Cc, 1, 'crash', 104)
    P.nota('tamtam', Cc, 4, 0, 84)
    motivo4(P, Cc, [('vlnI', k, 90, dict(art='m')), ('vlnII', k - 12, 78, dict(art='m')), ('coro', k, 84, {}),
                    ('flauta', k + 12, 60, dict(vib=1))], k)
    motivo4(P, Cc + 16, [('vlnI', k, 94, dict(art='m')), ('vlnII', k - 12, 82, dict(art='m')), ('coro', k, 90, {}),
                         ('flauta', k + 12, 62, dict(vib=1)), ('metal', k - 12, 70, {}), ('trompeta', k, 66, {})], k)
    voces(P, 'organo', ACORDES_JARDIN[28:32], 60, 'A2', 'A4', n=4, b0=Cc + 16, reg='pleno')
    pedal(P, 'sub', ACORDES_JARDIN[24:32], 80, lo=24, b0=Cc)
    for c in range(24, 32):
        arpegio(P, c, 'semis', 46, 'A3', 'A5', 'arpa')
        cello(P, c, 'R.RR.RR.R.RR.RR.', 74, lo=33)
        taikos(P, c, (0.0, 2.0), 70, k)
        bateria(P, c, {'bombo_banda': 'x.......x.......', 'caja': '....X.......X...', 'pandereta': 'x.x.x.x.x.x.x.x.'}, -6)
    tambores(P, 31 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4'), 84, 112, 0.5)
    # ---- 33-40 the cierzo: the wind takes over; a flute running on the chords, the harp falling, a choir whispering, a build
    for c in range(32, 40):
        pasos(P, c, 'flauta', '0123432101234321', 54 + 3 * (c - 32), 'A4', 'A6', vib=0)
        arpegio(P, c, 'corcheas', 42 + 3 * (c - 32), 'A3', 'A5', 'arpa', baja=True)
        cello(P, c, 'R...............', 50 + 3 * (c - 32), dur=3.8, art='l', lo=33)
    for b, d, v in ((0.0, 16.0, 84), (16.0, 16.0, 90)):
        P.nota('viento', D + b, d, 0, v)
    voces(P, 'coroI', ACORDES_JARDIN[32:40], 42, 'A3', 'A5', n=3, b0=D, vocal='u', extra=0.3)
    voces(P, 'coroD', ACORDES_JARDIN[32:40], 42, 'A3', 'A5', n=3, b0=D, vocal='u', extra=0.3)
    pedal(P, 'sub', ACORDES_JARDIN[32:40], 64, lo=24, b0=D)
    P.nota('subida', 38 * L, 8.0, 0, 82)
    redoble(P, 38 * L + 1.0, 7.0, 42, 120, 'caja')
    for i in range(16):
        P.nota('timbal', 38 * L + 2.0 + i * 0.125, 0.125, midi('E2'), 54 + 3 * i)
    # ---- 41-48 the garden in bloom: the tune with the flute, violins and oboe, the harp in 3+3+2, pizzicato, a full light kit, the choir
    P.nota('bat', A3, 1, 'crash', 108)
    notas_de(P, 'vlnI', ta, A3, 90, dur=0.97, acento=4, art='l')
    notas_de(P, 'flauta', ta, A3, 74, dur=0.95, vib=1)
    notas_de(P, 'oboe', [(b, d, m + 12, f) for b, d, m, f in ta], A3, 60, dur=0.95)
    segunda(P, 'vlnII', ta, A3, 70)
    canta(P, ta, A3, 70)
    for c in range(40, 48):
        S.arpa_compas(P, c, 'tresytres', 56, desde='A3', hasta='A5')
        cello(P, c, 'R.RR.RR.R.RR.RR.' if c % 2 == 0 else 'R.RR.RR.R.RRORO.', 72, lo=33)
        pizzs(P, c, (0, 3, 6, 8, 11, 14), 54, desde='A4', hasta='E5')
        taikos(P, c, (0.0, 2.0), 66, k)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.', 'pandereta': 'x.x.x.x.x.x.x.x.'}, -8)
    redoble(P, 47 * L + 2.0, 2.0, 54, 108, 'caja')
    # ---- 49-52 the way out: flute and violin on the last bars, the harp, the wind coming back
    notas_de(P, 'flauta', te, E, 76, dur=0.97, acento=3, vib=1)
    notas_de(P, 'vlnI', te, E, 54, dur=0.97, acento=3, art='l')
    pedal(P, 'chelo', ACORDES_JARDIN[48:52], 46, b0=E, lo=33, art='l')
    pedal(P, 'sub', ACORDES_JARDIN[48:52], 54, lo=24, b0=E)
    for c in range(48, 52):
        S.arpa_compas(P, c, 'corcheas', 46 - 2 * (c - 48), desde='A3', hasta='A5')
    P.nota('viento', E + 4, 12.0, 0, 62)
    polvo(P, 22, 4, E, E + 16, 'A5', 'E6')
    return P


def intro_jardin(P):
    """The intro (2 bars): a gust and a harp climbing, then the loop's last bar."""
    I = Partitura()
    I.nota('viento', 0.0, 6.0, 0, 70)
    I.nota('sub', 0.0, 4.2, midi('A0'), 66)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (45, 52, 57, 60), 34, lado=pista[-1])
    for i, m in enumerate(('A3', 'E4', 'A4', 'C5', 'E5', 'A5')):
        I.nota('arpa', 0.5 + i * 0.5, 0.5, midi(m), 44 + 3 * i)
    I.anadir(P.trozo(51 * L, 52 * L, 1 * L))
    return I


def exportar_jardin(salida):
    return exportar(componer_jardin, intro_jardin, ACORDES_JARDIN, BPM_JARDIN, BARRAS_JARDIN, 2, AUTO_JARDIN,
                    AUTO_INTRO_JARDIN, salida, MEZCLA_JARDIN, nombre='unaMasJardin', rt=1.7)


# =================================================================================================================
# unaMasTeatro
# =================================================================================================================

BPM_TEATRO = 100
BARRAS_TEATRO = 48
K_T = -7                                                                      # G minor
ACORDES_TEATRO = T(AC_A + AC_A + AC_B + AC_C3 + AC_D + AC_A_DOM, K_T)

MEZCLA_TEATRO = dict(clave=(-0.3, -24.0, 0.35, 0.2), organo=(-0.1, -25.0, 0.35, 0.0), pizz=(0.5, -26.0, 0.18, 0.0),
                     vlnI=(-0.4, -24.0, 0.32, 0.0), chelo=(0.05, -23.5, 0.14, 0.0), timbal=(0.0, -23.0, 0.35, 0.0),
                     coro=(0.0, -24.5, 0.45, 0.0), trompeta=(0.0, -27.0, 0.3, 0.0), tramoya=(0.3, -31.0, 0.5, 0.0),
                     viento=(0.0, -34.0, 0.5, 0.0))
AUTO_TEATRO = ([-4.0] * 8 + [-2.0] * 8 + [-2.5] * 8 + [0.5] * 8 + [-3.0, -3.0, -2.5, -2.5, -2.0, -1.5, 0.0, 1.0] + [1.0] * 7 + [-0.5])
AUTO_TEATRO = suavizar(AUTO_TEATRO)
AUTO_INTRO_TEATRO = [AUTO_TEATRO[0] - 1.0, AUTO_TEATRO[47]]


def componer_teatro():
    """The 48 bars of the round -> a Partitura: the theatre, harpsichord and drama."""
    P = Partitura()
    k = K_T
    A, A2, B, Cc, D, A3 = 0.0, 32.0, 64.0, 96.0, 128.0, 160.0
    ta, tb = tr(TUNE_A, k), tr(TUNE_B, k)
    pad = [34] * 8 + [42] * 8 + [48] * 8 + [58] * 8 + [38, 40, 44, 48, 52, 56, 62, 68] + [58] * 8
    voces(P, 'cuerdasI', ACORDES_TEATRO, pad, 'G2', 'Bb4', n=4, lado='I')
    voces(P, 'cuerdasD', ACORDES_TEATRO, pad, 'G2', 'Bb4', n=4, lado='D')
    P.nota('bat', 0.0, 1, 'plato', 60)
    # ---- 1-8 the curtain: the tune on a flute-stop organ and a soft violin, a harpsichord on eighths, a cello pedal; two stabs
    notas_de(P, 'organo', ta, A, 72, dur=0.97, acento=3, reg='flauta')
    notas_de(P, 'vlnI', ta, A, 50, dur=0.97, acento=3, art='l')
    pedal(P, 'chelo', ACORDES_TEATRO[:8], 46, lo=31, art='l')
    pedal(P, 'sub', ACORDES_TEATRO[:8], 56, lo=22)
    for c in range(8):
        arpegio(P, c, 'corcheas', 52, 'G3', 'G5', 'clave')
        bateria(P, c, {'tom4': 'x.......o.......', 'rim': '....o.......o...'}, -26)
    golpe(P, 3 * L + 2.5, 92)
    golpe(P, 7 * L + 2.5, 100)
    P.nota('tramoya', 5.0, 1.0, 0, 62, tipo='crujido')
    P.nota('tramoya', 17.0, 1.2, 0, 56, tipo='cuerda')
    P.nota('viento', 8.0, 14.0, 0, 50)
    polvo(P, 31, 8, 0, 32, 'G5', 'D6')
    # ---- 9-16 front row: violins marcato on the tune with the oboe, a harpsichord in sixteenths, dramatic pizzicato, a walking cello
    notas_de(P, 'vlnI', ta, A2, 88, dur=0.9, acento=5, art='m')
    segunda(P, 'vlnII', ta, A2, 68, art='m', dur=0.9)
    notas_de(P, 'oboe', ta, A2, 56, dur=0.95)
    for c in range(8, 16):
        arpegio(P, c, 'semis', 46, 'G3', 'G5', 'clave')
        cello(P, c, 'R...R.F.R...R.F.', 66, dur=0.45, lo=31)
        pizzs(P, c, (0, 3, 6, 10, 12), 64, desde='G3', hasta='D5')
        taikos(P, c, (0.0, 2.0), 62, k)
        bateria(P, c, {'rim': '....x.......x...', 'bombo': 'x.......x.......'}, -14)
    golpe(P, 11 * L + 3.0, 96)
    golpe(P, 15 * L + 3.0, 104)
    P.nota('bat', A2, 1, 'plato', 74)
    # ---- 17-24 the interval: the second tune on legato violins and a flute, an organ chorale under it, the harpsichord in 3+3+2, a choir
    notas_de(P, 'vlnI', tb, B, 84, dur=0.97, acento=4, art='l')
    notas_de(P, 'flauta', tb, B, 62, dur=0.95, vib=1)
    segunda(P, 'vlnII', tb, B, 60)
    voces(P, 'organo', ACORDES_TEATRO[16:24], 46, 'G2', 'G4', n=4, b0=B, reg='suave')
    for c in range(16, 24):
        arpegio(P, c, 'tresytres', 54, 'G3', 'G5', 'clave')
        cello(P, c, 'R..R..R...R.....' if c % 2 == 0 else 'R..R..R...R.R.F.', 68, lo=31)
        pizzs(P, c, (10,), 54, desde='G3', hasta='D5')
        taikos(P, c, (0.0,), 66, k)
        bateria(P, c, {'rim': '....x.......x...', 'charles': 'o...o...o...o...'}, -12)
    voces(P, 'coroI', ACORDES_TEATRO[20:24], 50, 'G3', 'G5', n=3, b0=B + 16, vocal='o')
    voces(P, 'coroD', ACORDES_TEATRO[20:24], 50, 'G3', 'G5', n=3, b0=B + 16, vocal='o')
    redoble(P, 23 * L + 1.0, 3.0, 50, 112, 'caja')
    for i in range(16):
        P.nota('timbal', 23 * L + 2.0 + i * 0.125, 0.125, midi('G1'), 56 + 3 * i)
    # ---- 25-32 THE CHANT on stage: the organ at full, violins and brass, the choir, kettledrums on every beat; the second time with trumpets
    P.nota('bat', Cc, 1, 'crash', 108)
    P.nota('tamtam', Cc, 4, 0, 94)
    motivo4(P, Cc, [('vlnI', k, 94, dict(art='m')), ('vlnII', k - 12, 82, dict(art='m')), ('coro', k, 90, {}),
                    ('metal', k - 12, 72, {})], k)
    motivo4(P, Cc + 16, [('vlnI', k, 98, dict(art='m')), ('vlnII', k - 12, 86, dict(art='m')), ('coro', k, 96, {}),
                         ('metal', k - 12, 76, {}), ('trompeta', k, 76, {})], k)
    voces(P, 'organo', ACORDES_TEATRO[24:32], 62, 'G2', 'G4', n=4, b0=Cc, reg='pleno')
    pedal(P, 'organo', ACORDES_TEATRO[24:32], 56, b0=Cc, reg='pleno', lo=26)
    pedal(P, 'sub', ACORDES_TEATRO[24:32], 84, lo=22, b0=Cc)
    for c in range(24, 32):
        arpegio(P, c, 'semis', 46, 'G3', 'G5', 'clave')
        cello(P, c, 'RRORRORRRORRORRO', 76, lo=31)
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 74 if c < 28 else 82, k)
        bateria(P, c, {'bombo_banda': 'x.......x.......', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}, -3)
        if c in (24, 28):
            P.nota('bat', c * L, 1, 'crash', 102)
    golpe(P, 27 * L + 3.0, 104)
    redoble(P, 31 * L + 1.0, 3.0, 54, 120, 'caja')
    tambores(P, 31 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 96, 122, 0.25)
    # ---- 33-40 the spotlight: pizzicato scattered like footsteps, the harpsichord running down, tremolo violins, a choir, stabs, a build
    for c in range(32, 40):
        arpegio(P, c, 'semis', 40 + 3 * (c - 32), 'G3', 'G5', 'clave', baja=True)
        pizzs(P, c, (0, 3, 6, 8, 11, 14) if c % 2 == 0 else (2, 5, 9, 12, 14), 60 + 2 * (c - 32), desde='G3', hasta='D5')
        pasos(P, c, 'vlnI', '3.3.3.3.3.3.3.3.', 44 + 4 * (c - 32), 'D4', 'D6', art='c')
        cello(P, c, 'R...............', 54 + 3 * (c - 32), dur=3.8, art='l', lo=31)
        taikos(P, c, (0.0,), 52 + 3 * (c - 32), k)
    for b in (D + 3.5, D + 11.5, D + 19.5, D + 25.5):
        golpe(P, b, 100)
    voces(P, 'coroI', ACORDES_TEATRO[32:40], 42, 'G3', 'G5', n=3, b0=D, vocal='u', extra=0.3)
    voces(P, 'coroD', ACORDES_TEATRO[32:40], 42, 'G3', 'G5', n=3, b0=D, vocal='u', extra=0.3)
    pedal(P, 'sub', ACORDES_TEATRO[32:40], 70, lo=22, b0=D)
    P.nota('subida', 38 * L, 8.0, 0, 86)
    redoble(P, 38 * L, 8.0, 40, 124, 'caja')
    for i in range(32):
        P.nota('timbal', 38 * L + i * 0.25, 0.25, midi('D2'), 54 + 2 * i)
    # ---- 41-48 ovation: the tune with violins, a trumpet and the organ, the choir, a galloping cello, a kit, the harpsichord in 3+3+2
    P.nota('bat', A3, 1, 'crash', 112)
    P.nota('tamtam', A3, 4, 0, 92)
    notas_de(P, 'vlnI', ta, A3, 96, dur=0.97, acento=4, art='l')
    segunda(P, 'vlnII', ta, A3, 78)
    notas_de(P, 'trompeta', ta, A3, 74, dur=0.95)
    notas_de(P, 'flauta', [(b, d, m + 12, f) for b, d, m, f in ta], A3, 54, dur=0.95, vib=1)
    canta(P, ta, A3, 78)
    voces(P, 'organo', ACORDES_TEATRO[40:48], 56, 'G2', 'G4', n=4, b0=A3, reg='pleno')
    for c in range(40, 48):
        arpegio(P, c, 'tresytres', 52, 'G3', 'G5', 'clave')
        cello(P, c, 'R.RR.RR.R.RR.RR.' if c % 2 == 0 else 'R.RR.RR.R.RRORO.', 78, lo=31)
        pizzs(P, c, (6, 14), 62, desde='G3', hasta='D5')
        taikos(P, c, (0.0, 2.0, 3.0), 76, k)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}, -4)
        if c in (40, 44):
            P.nota('bat', c * L, 1, 'crash', 100)
    golpe(P, 43 * L + 3.0, 100)
    redoble(P, 47 * L + 1.0, 3.0, 54, 112, 'caja')
    return P


def intro_teatro(P):
    """The intro (2 bars): the curtain's draught and a creak, a kettledrum and a first note on the harpsichord, then the loop's last bar."""
    I = Partitura()
    I.nota('viento', 0.0, 6.0, 0, 68)
    I.nota('tramoya', 1.0, 0.8, 0, 66, tipo='crujido')
    I.nota('sub', 0.0, 4.2, midi('G0'), 64)
    I.nota('timbal', 0.0, 1.0, midi('G1'), 70)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (43, 50, 55, 58), 34, lado=pista[-1])
    for i, m in enumerate(('G3', 'D4', 'G4', 'Bb4', 'D5')):
        I.nota('clave', 1.5 + i * 0.5, 0.5, midi(m), 50 + 3 * i)
    I.anadir(P.trozo(47 * L, 48 * L, 1 * L))
    return I


def exportar_teatro(salida):
    return exportar(componer_teatro, intro_teatro, ACORDES_TEATRO, BPM_TEATRO, BARRAS_TEATRO, 2, AUTO_TEATRO,
                    AUTO_INTRO_TEATRO, salida, MEZCLA_TEATRO, nombre='unaMasTeatro', rt=1.9)


# =================================================================================================================
# unaMasMiniboss
# =================================================================================================================

BPM_MINIBOSS = 150
BARRAS_MINIBOSS = 56
K_M = 2                                                                       # E minor
AC_MA = [['Dm'], ['Dm', 'Bb'], ['Gm'], ['A7'], ['Dm'], ['Bb', 'C'], ['Gm', 'A7'], ['A7']]
TUNE_MA = M('D5:2 D5:2 F5:4 A5:4 D6:4 | D6:4 A5:4 F6:4 D6:4 | G5:2 G5:2 Bb5:4 D6:4 G6:4 | E6:4 C#6:4 A5:8 | '
            'D5:2 D5:2 F5:4 A5:4 D6:4 | F6:4 D6:4 E6:4 C6:4 | Bb5:4 D6:4 C#6:4 E6:4 | A5:12 -:4')
AC_MD = [['Gm'], ['Gm'], ['Eb'], ['Eb'], ['Cm7'], ['F'], ['Bb', 'A7sus4'], ['A7']]
TUNE_MD = M('D5:2 D5:2 G5:4 D5:2 D5:2 G5:4 | D5:2 D5:2 G5:4 Bb5:4 D6:4 | G5:2 G5:2 Bb5:4 G5:2 G5:2 Eb6:4 | G5:2 G5:2 Bb5:4 D6:4 Eb6:4 | '
            'G5:2 G5:2 C6:4 G5:2 G5:2 Eb6:4 | A5:2 A5:2 C6:4 A5:2 A5:2 F6:4 | D6:4 F6:4 E6:4 D6:4 | C#6:4 E6:4 A5:8')
AC_ME = [['Dm'], ['Dm'], ['Bb'], ['Bb'], ['Gm'], ['Gm'], ['A7sus4'], ['A7']]
TUNE_ME = M('D5:4 F5:4 A5:4 D6:4 | F6:4 E6:4 D6:4 A5:4 | Bb5:4 D6:4 F6:4 D6:4 | Bb5:8 D6:4 F6:4 | '
            'G5:4 Bb5:4 D6:4 G6:4 | F6:4 Eb6:4 D6:4 Bb5:4 | A5:4 D6:4 E6:4 G6:4 | C#6:4 E6:4 G6:4 E6:4')
ACORDES_MINIBOSS = T(AC_MA + AC_C2 + AC_D + AC_MA + AC_C3 + AC_MD + AC_ME, K_M)

MEZCLA_MINIBOSS = dict(vlnI=(-0.4, -23.0, 0.25, 0.0), vlnII=(0.4, -26.5, 0.25, 0.0), chelo=(0.05, -22.5, 0.1, 0.0),
                       taiko=(0.0, -21.5, 0.25, 0.0), coro=(0.0, -24.0, 0.4, 0.0), trompeta=(0.0, -26.0, 0.3, 0.0),
                       organo=(-0.1, -25.5, 0.3, 0.0), timbal=(0.0, -23.0, 0.3, 0.0), clave=(-0.3, -27.0, 0.3, 0.2))
AUTO_MINIBOSS = ([-1.0] * 8 + [1.0] * 8 + [-3.0] * 6 + [-2.0, -1.0] + [0.0] * 8 + [1.5] * 8 + [1.0] * 8 + [0.0, 0.0, 0.5, 0.5, 1.0, 1.0, 1.5, 2.0])
AUTO_MINIBOSS = suavizar(AUTO_MINIBOSS)
AUTO_INTRO_MINIBOSS = [AUTO_MINIBOSS[0] + 1.0, AUTO_MINIBOSS[55]]


def componer_miniboss():
    """The 56 bars of the round -> a Partitura: the fight against the Gran Despertador."""
    P = Partitura()
    k = K_M
    A, B, Cc, A2, B2, Dd, E = 0.0, 32.0, 64.0, 96.0, 128.0, 160.0, 192.0
    tma, tmd, tme = tr(TUNE_MA, k), tr(TUNE_MD, k), tr(TUNE_ME, k)
    pad = [56] * 8 + [74] * 8 + [48] * 8 + [62] * 8 + [78] * 8 + [80] * 8 + [60, 62, 66, 70, 76, 82, 90, 100]
    voces(P, 'cuerdasI', ACORDES_MINIBOSS, pad, 'E2', 'G4', n=4, lado='I')
    voces(P, 'cuerdasD', ACORDES_MINIBOSS, pad, 'E2', 'G4', n=4, lado='D')
    P.nota('bat', 0.0, 1, 'crash', 106)

    def galope(desde, hasta, vel, fill_final=None):
        for c in range(desde, hasta):
            cello(P, c, 'R.RR.RR.R.RR.RR.' if c % 2 == 0 else 'R.RR.RR.R.RRORO.', vel, lo=28)
            pasos(P, c, 'vlnII', '0101010101010101', vel - 22, 'E4', 'E6', dur=0.2, art='c')

    # ---- 1-8 the alarm: the tune on violins, a galloping cello, violins II sawing, taiko, a rock kit, brass stabs at the phrase ends
    notas_de(P, 'vlnI', tma, A, 100, dur=0.93, acento=6, art='m')
    segunda(P, 'oboe', tma, A, 56)
    galope(0, 8, 80)
    for c in range(8):
        taikos(P, c, (0.0, 2.0), 80, k)
        bateria(P, c, {'bombo': 'x.x...x.x.x.....' if c % 2 == 0 else 'x.x...x.x.x.x.x.', 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, -4)
    for c in (3, 7):
        for m in S.tonos(S.ch_en(c * L + 3.0), 'E3', 'G4'):
            P.nota('metal', c * L + 3.0, 0.9, m, 98)
    tambores(P, 7 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 90, 114)
    # ---- 9-16 the chant, shouted: violins, brass, a trumpet and the choir; the organ and the kettledrums; a double bass drum
    P.nota('bat', B, 1, 'crash', 112)
    P.nota('tamtam', B, 4, 0, 96)
    motivo4(P, B, [('vlnI', k, 100, dict(art='m')), ('vlnII', k - 12, 88, dict(art='m')), ('coro', k, 94, {}),
                   ('metal', k - 12, 80, {}), ('trompeta', k, 70, {})], k)
    motivo4(P, B + 16, [('vlnI', k, 102, dict(art='m')), ('vlnII', k - 12, 90, dict(art='m')), ('coro', k, 98, {}),
                        ('metal', k - 12, 82, {}), ('trompeta', k, 74, {})], k)
    voces(P, 'organo', ACORDES_MINIBOSS[8:16], 62, 'E2', 'E4', n=4, b0=B, reg='pleno')
    pedal(P, 'sub', ACORDES_MINIBOSS[8:16], 84, lo=24, b0=B)
    galope(8, 16, 82)
    for c in range(8, 16):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 84, k)
        bateria(P, c, {'bombo': 'x.xxx..xx.xxx..x', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.', 'abierto': '..o...o...o...o.'}, 0)
        if c in (8, 12):
            P.nota('bat', c * L, 1, 'crash', 104)
    redoble(P, 15 * L + 1.0, 3.0, 54, 120, 'caja')
    tambores(P, 15 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    # ---- 17-24 the bridge, half time: a harpsichord in 3+3+2, tremolo violins growing, a choir whispering, a long cello; the build
    for c in range(16, 24):
        arpegio(P, c, 'tresytres', 56, 'E3', 'E5', 'clave')
        pasos(P, c, 'vlnI', '3232323232323232', 46 + 5 * (c - 16), 'E4', 'E6', dur=0.2, art='c')
        cello(P, c, 'R...............', 64, dur=3.8, art='l', lo=28)
        taikos(P, c, (0.0, 2.5), 72 + 2 * (c - 16), k)
        bateria(P, c, {'bombo': 'x.......x.x.....', 'caja': '........X.......', 'rim': '....x.......x...'}, -6)
    voces(P, 'coroI', ACORDES_MINIBOSS[16:24], 44, 'E3', 'E5', n=3, b0=Cc, vocal='u', extra=0.3)
    voces(P, 'coroD', ACORDES_MINIBOSS[16:24], 44, 'E3', 'E5', n=3, b0=Cc, vocal='u', extra=0.3)
    pedal(P, 'sub', ACORDES_MINIBOSS[16:24], 74, lo=24, b0=Cc)
    P.nota('bat', Cc, 1, 'plato', 80)
    P.nota('subida', 22 * L, 8.0, 0, 86)
    redoble(P, 22 * L, 8.0, 40, 124, 'caja')
    for i in range(32):
        P.nota('timbal', 22 * L + i * 0.25, 0.25, midi('A1') + k, 56 + 2 * i)
    # ---- 25-32 the alarm again, with brass under the violins and a trumpet; the choir hums
    P.nota('bat', A2, 1, 'crash', 112)
    notas_de(P, 'vlnI', tma, A2, 102, dur=0.93, acento=6, art='m')
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in tma], A2, 80, dur=0.9)
    notas_de(P, 'trompeta', tma, A2, 66, dur=0.93)
    segunda(P, 'oboe', tma, A2, 58)
    canta(P, tma, A2, 66, vocal='o')
    galope(24, 32, 84)
    for c in range(24, 32):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 80, k)
        bateria(P, c, {'bombo': 'x.x...x.x.x.....' if c % 2 == 0 else 'x.x...x.x.x.x.x.', 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, 0)
        if c in (24, 28):
            P.nota('bat', c * L, 1, 'crash', 102)
    for c in (27, 31):
        for m in S.tonos(S.ch_en(c * L + 3.0), 'E3', 'G4'):
            P.nota('metal', c * L + 3.0, 0.9, m, 100)
    tambores(P, 31 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 90, 120, 0.25)
    # ---- 33-40 the chant, bigger: everything, the answer an octave higher on the trumpet, the kettledrums rolling, a tam-tam on every four bars
    P.nota('bat', B2, 1, 'crash', 114)
    P.nota('tamtam', B2, 4, 0, 98)
    P.nota('tamtam', B2 + 16, 4, 0, 98)
    motivo4(P, B2, [('vlnI', k, 104, dict(art='m')), ('vlnII', k - 12, 92, dict(art='m')), ('coro', k, 100, {}),
                    ('metal', k - 12, 84, {}), ('trompeta', k, 78, {}), ('flauta', k + 12, 60, dict(vib=1))], k)
    motivo4(P, B2 + 16, [('vlnI', k, 106, dict(art='m')), ('vlnII', k - 12, 94, dict(art='m')), ('coro', k, 104, {}),
                         ('metal', k - 12, 86, {}), ('trompeta', k, 82, {}), ('flauta', k + 12, 62, dict(vib=1))], k)
    voces(P, 'organo', ACORDES_MINIBOSS[32:40], 66, 'E2', 'E4', n=4, b0=B2, reg='pleno')
    pedal(P, 'organo', ACORDES_MINIBOSS[32:40], 60, b0=B2, reg='pleno', lo=28)
    pedal(P, 'sub', ACORDES_MINIBOSS[32:40], 88, lo=24, b0=B2)
    galope(32, 40, 86)
    for c in range(32, 40):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 88, k)
        bateria(P, c, {'bombo': 'x.xxx..xx.xxx..x', 'caja': '....X.......X..x', 'charles': 'x.x.x.x.x.x.x.x.', 'abierto': '..o...o...o...o.'}, 2)
        if c in (32, 36):
            P.nota('bat', c * L, 1, 'crash', 106)
    for i in range(16):
        P.nota('timbal', 39 * L + i * 0.25, 0.25, midi('E2'), 60 + 3 * i)
    redoble(P, 39 * L + 1.0, 3.0, 56, 124, 'caja')
    # ---- 41-48 the last stand: the three notes «Ca-mio-neees» over and over, in unison on everything, the drums in sixteenths
    P.nota('bat', Dd, 1, 'crash', 116)
    notas_de(P, 'vlnI', tmd, Dd, 104, dur=0.9, acento=4, art='m')
    notas_de(P, 'vlnII', [(b, d, m - 12, f) for b, d, m, f in tmd], Dd, 92, dur=0.9, acento=4, art='m')
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in tmd], Dd, 84, dur=0.9)
    notas_de(P, 'trompeta', tmd, Dd, 80, dur=0.9)
    canta(P, tmd, Dd, 98)
    voces(P, 'organo', ACORDES_MINIBOSS[40:48], 64, 'E2', 'E4', n=4, b0=Dd, reg='pleno')
    pedal(P, 'sub', ACORDES_MINIBOSS[40:48], 88, lo=24, b0=Dd)
    galope(40, 48, 88)
    for c in range(40, 48):
        taikos(P, c, (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5), 80, k)
        bateria(P, c, {'bombo': 'x.xxx.xxx.xxx.xx', 'caja': '....X.......X.xx', 'charles': 'x.x.x.x.x.x.x.x.', 'abierto': '..o...o...o...o.'}, 4)
        if c in (40, 44):
            P.nota('bat', c * L, 1, 'crash', 108)
    tambores(P, 47 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 94, 124, 0.25)
    # ---- 49-56 the build: a rising line in unison, a riser and a roll, back to the alarm
    for b, d, m, _ in tme:
        f = 74 + int(30 * b / 32)
        P.nota('vlnI', E + b, d * 0.92, m, f, art='m')
        P.nota('vlnII', E + b, d * 0.92, m - 12, f - 8, art='m')
        P.nota('metal', E + b, d * 0.92, m - 12, f - 6)
        P.nota('coro', E + b, d * 0.96, (m - 12, m), f - 10, vocal='a')
        P.nota('trompeta', E + b, d * 0.92, m, f - 14)
    galope(48, 56, 84)
    for c in range(48, 56):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 84, k)
        if c < 54:
            bateria(P, c, {'bombo': 'x.x...x.x.x.....' if c % 2 == 0 else 'x.x...x.x.x.x.x.', 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, 0)
    P.nota('subida', 54 * L, 8.0, 0, 90)
    redoble(P, 54 * L + 2.0, 6.0, 50, 124, 'caja')
    P.nota('bat', 55 * L, 0.25, 'bombo', 110)
    P.nota('bat', 55 * L + 2.0, 0.25, 'bombo', 112)
    tambores(P, 55 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    return P


def intro_miniboss(P):
    """The intro (2 bars): a string stab with a crash and a taiko, a snare run, then the loop's last bar (the fill)."""
    I = Partitura()
    I.nota('bat', 0.0, 1, 'crash', 112)
    I.nota('tamtam', 0.0, 4, 0, 90)
    I.nota('taiko', 0.0, 1.0, midi('D2') + K_M, 100)
    I.nota('taiko', 2.0, 1.0, midi('D2') + K_M, 90)
    for m in S.tonos(T(AC_MA, K_M)[0][0], 'E3', 'G4'):
        I.nota('metal', 0.0, 1.5, m, 104)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (48, 55, 59, 62), 80, lado=pista[-1])
    redoble(I, 2.0, 2.0, 50, 100, 'caja')
    I.anadir(P.trozo(55 * L, 56 * L, 1 * L))
    return I


def exportar_miniboss(salida):
    return exportar(componer_miniboss, intro_miniboss, ACORDES_MINIBOSS, BPM_MINIBOSS, BARRAS_MINIBOSS, 2, AUTO_MINIBOSS,
                    AUTO_INTRO_MINIBOSS, salida, MEZCLA_MINIBOSS, nombre='unaMasMiniboss', rt=1.3)


# =================================================================================================================
# unaMasJefe
# =================================================================================================================

BPM_JEFE = 120
BARRAS_JEFE = 92                     # in the ring: 76 bars at 120 bpm and then the third phase, 16 of those bars' length...
K_FASE3 = 0.8                        # ...played at 150 bpm: 20 written bars (1.6 s each) fit in 16 bars of 2 s
FASE3 = 304.0                        # the beat where the third phase begins (bar 77)
AC_I = [['Dm'], ['Gm'], ['A7'], ['Dm'], ['Dm'], ['Eb'], ['A7sus4', 'A7'], ['Dm']]
TUNE_I = M('D5:8 D5:8 | G5:16 | A5:4 A5:4 A5:4 C#6:4 | D6:16 | D5:8 D5:8 | G5:16 | A5:4 A5:4 A5:4 C#6:4 | D6:16')
AC_II = [['Dm'], ['Dm', 'Eb'], ['Dm'], ['A7sus4', 'A7'], ['Gm'], ['Dm', 'Bb'], ['Eb', 'A7sus4'], ['A7']]
TUNE_II = M('D5:6 F5:2 A5:4 D6:4 | D6:4 A5:4 G5:4 Bb5:4 | F5:4 A5:4 D6:8 | E6:6 D6:2 C#6:4 A5:4 | '
            'Bb5:6 G5:2 D6:8 | A5:4 F5:4 D6:4 F6:4 | G5:4 Bb5:4 E6:4 D6:4 | C#6:4 E6:4 A5:8')
AC_VI = [['Gm'], ['Eb'], ['Bb', 'A7sus4'], ['A7']]
ACORDES_JEFE = (AC_I + AC_II + AC_II + H1 + RESP + H2 + RESP + H3 + RESP + H1 + RESP + AC_D + AC_D
                + AC_B + H2 + RESP + H3 + RESP + AC_VI + H1 + RESP + H2 + RESP + H1 + RESP + AC_MD)

MEZCLA_JEFE = dict(vlnI=(-0.4, -23.5, 0.3, 0.0), coro=(0.0, -23.5, 0.45, 0.0), organo=(-0.1, -24.5, 0.3, 0.0),
                   timbal=(0.0, -23.0, 0.3, 0.0), tamtam=(0.0, -25.0, 0.5, 0.0), trompeta=(0.0, -26.0, 0.3, 0.0),
                   taiko=(0.0, -21.5, 0.3, 0.0), chelo=(0.05, -23.0, 0.12, 0.0), sub=(0.0, -24.0, 0.0, 0.0),
                   clave=(-0.3, -27.0, 0.3, 0.2), arpa=(-0.45, -27.0, 0.3, 0.22))
AUTO_JEFE = ([-4.0, -3.5, -3.0, -2.5, -2.0, -1.5, -1.0, -0.5] + [-1.0] * 8 + [0.0] * 8 + [1.0] * 8 + [1.5] * 8
             + [-2.0] * 8 + [0.0] * 8 + [1.5] * 8 + [2.5] * 8 + [-1.0, -2.0, -3.0, -1.0] + [1.5] * 16)
AUTO_JEFE = suavizar(AUTO_JEFE)
AUTO_INTRO_JEFE = [AUTO_JEFE[0] + 2.0, AUTO_JEFE[91]]


def componer_jefe():
    """The 96 written bars (92 in the ring) -> a Partitura: LA ÚLTIMA. 1-8 the roar (the chant slow, the choir and the organ),
    9-24 the first tune, 25-40 the chant four times, 41-56 «Barra libre» (the bridge), 57-72 the anthem and the chant, 73-76 the hush,
    77-96 the third phase, a quarter faster."""
    P = Partitura()
    I, II, III, IV, V, VI, VII = 0.0, 32.0, 96.0, 160.0, 224.0, 288.0, FASE3
    pad = [40] * 8 + [60] * 16 + [70] * 16 + [44] * 8 + [62] * 8 + [78] * 16 + [50, 56, 62, 70] + [90] * 20
    voces(P, 'cuerdasI', ACORDES_JEFE, pad, 'D2', 'F4', n=4, lado='I')
    voces(P, 'cuerdasD', ACORDES_JEFE, pad, 'D2', 'F4', n=4, lado='D')

    def galope(desde, hasta, vel, lo=26):
        for c in range(desde, hasta):
            cello(P, c, 'R.RR.RR.R.RR.RR.' if c % 2 == 0 else 'R.RR.RR.R.RRORO.', vel, lo=lo)
            pasos(P, c, 'vlnII', '0101010101010101', vel - 22, 'D4', 'D6', dur=0.2, art='c')

    def grande(c0, c1, vel_bombo=0, abierto=True):
        for c in range(c0, c1):
            patron = {'bombo': 'x.xxx..xx.xxx..x', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}
            if abierto:
                patron['abierto'] = '..o...o...o...o.'
            bateria(P, c, patron, vel_bombo)

    # ---- 1-8 the roar: a great organ chord and a tam-tam, the chant slow (a bar a syllable) on the choir over a pedal, a heartbeat
    P.nota('bat', I, 1, 'crash', 108)
    P.nota('tamtam', I, 4, 0, 100)
    for b, d, m, _ in TUNE_I:
        P.nota('coro', I + b, d * 0.97, (m - 12, m), 80 + (6 if b % 1 == 0 else 0), vocal='o' if m < midi('G5') else 'a')
        P.nota('vlnI', I + b, d * 0.97, m, 50, art='l')
    voces(P, 'organo', AC_I, 58, 'D2', 'D4', n=4, b0=I, reg='pleno')
    pedal(P, 'organo', AC_I, 54, b0=I, reg='pleno', lo=26)
    pedal(P, 'chelo', AC_I, 56, b0=I, lo=26, art='l')
    pedal(P, 'sub', AC_I, 90, lo=22, b0=I)
    for c in range(8):
        taikos(P, c, (0.0, 2.0) if c < 4 else (0.0, 1.0, 2.0, 3.0), 72 + 3 * c)
    P.nota('viento', I, 16.0, 0, 70)
    P.nota('viento', I + 16, 16.0, 0, 66)
    redoble(P, 7 * L + 1.0, 3.0, 46, 116, 'caja')
    for i in range(12):
        P.nota('timbal', 7 * L + 2.0 + i * 0.125, 0.125, midi('A1'), 52 + 4 * i)
    # ---- 9-24 the first tune: violins marcato with an oboe, a galloping cello, taiko, a rock kit; the second time with trumpets,
    # the choir on the tune, the organ's toccata and the whole kit
    P.nota('bat', II, 1, 'crash', 108)
    notas_de(P, 'vlnI', TUNE_II, II, 100, dur=0.93, acento=6, art='m')
    segunda(P, 'oboe', TUNE_II, II, 58)
    voces(P, 'coroI', AC_II, 48, 'D3', 'D5', n=3, b0=II, vocal='o')
    voces(P, 'coroD', AC_II, 48, 'D3', 'D5', n=3, b0=II, vocal='o')
    galope(8, 16, 78)
    for c in range(8, 16):
        taikos(P, c, (0.0, 2.0), 80)
        bateria(P, c, {'bombo': F.KICK_JE_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, -4)
    for c in (11, 15):
        for m in S.tonos(S.ch_en(c * L + 3.0), 'D3', 'F4'):
            P.nota('metal', c * L + 3.0, 0.9, m, 98)
    tambores(P, 15 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 90, 114)
    P.nota('bat', II + 32, 1, 'crash', 112)
    notas_de(P, 'vlnI', TUNE_II, II + 32, 102, dur=0.93, acento=6, art='m')
    notas_de(P, 'trompeta', TUNE_II, II + 32, 74, dur=0.93)
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in TUNE_II], II + 32, 82, dur=0.9)
    segunda(P, 'oboe', TUNE_II, II + 32, 60)
    canta(P, TUNE_II, II + 32, 78, vocal='a')
    galope(16, 24, 84)
    for c in range(16, 24):
        F.organo_16(P, c, 44, 'D2', 'A3', gate=0.13)
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 82)
        bateria(P, c, {'bombo': F.KICK_JE_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, 0)
        if c in (16, 20):
            P.nota('bat', c * L, 1, 'crash', 104)
    for c in (19, 23):
        for m in S.tonos(S.ch_en(c * L + 3.0), 'D3', 'F4'):
            P.nota('metal', c * L + 3.0, 0.9, m, 100)
    tambores(P, 23 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 90, 120, 0.25)
    # ---- 25-40 the chant four times, each bigger: violins, a choir, brass, the organ, a flute high, a tam-tam; rolls at the end of each
    for i in range(4):
        b0 = III + 16 * i
        quien = [('vlnI', 0, 98 + 2 * i, dict(art='m')), ('vlnII', -12, 86 + 2 * i, dict(art='m')), ('coro', 0, 92 + 3 * i, {})]
        if i >= 1:
            quien += [('metal', -12, 78 + 2 * i, {}), ('trompeta', 0, 70 + 3 * i, {})]
        if i >= 2:
            quien += [('flauta', 12, 60, dict(vib=1))]
        motivo4(P, b0, quien, 0)
        if i >= 1:
            voces(P, 'organo', ACORDES_JEFE[24 + 4 * i:28 + 4 * i], 60 + 2 * i, 'D2', 'D4', n=4, b0=b0, reg='pleno')
        P.nota('bat', b0, 1, 'crash', 106 + 2 * i)
        P.nota('tamtam', b0, 4, 0, 90 + 3 * i)
        redoble(P, b0 + 13.0, 3.0, 50, 112, 'caja')
    pedal(P, 'sub', ACORDES_JEFE[24:40], 86, lo=22, b0=III)
    galope(24, 40, 80)
    for c in range(24, 40):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 78 + (c - 24) // 4 * 3)
        bateria(P, c, {'bombo_banda': 'x.......x.......', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.'}, -2)
    for i in range(16):
        P.nota('timbal', 39 * L + i * 0.25, 0.25, midi('D2'), 60 + 3 * i)
    # ---- 41-56 «Barra libre»: the bridge. A harpsichord in 3+3+2, a cello in 3+3+2, tremolo violins, a choir whispering, an organ;
    # the tune of the bridge on an oboe and a flute-stop organ, and then (the second time) on violins and a trumpet with the choir
    for c in range(40, 56):
        v = 40 + 2 * (c - 40)
        arpegio(P, c, 'tresytres', 52 + (c - 40), 'D3', 'D5', 'clave')
        cello(P, c, 'R..R..R.R..R..R.', 60 + (c - 40), dur=0.3, lo=26)
        pasos(P, c, 'vlnII', '3232323232323232', v, 'D4', 'D6', dur=0.2, art='c')
        taikos(P, c, (0.0, 2.5), 60 + (c - 40))
        pizzs(P, c, (6, 11, 14) if c % 2 == 0 else (3, 9, 14), 58 + (c - 40), desde='D4', hasta='A5')
        bateria(P, c, {'rim': '....x.......x...', 'tom4': 'x.......x.x.....'}, -12 + (c - 40) // 2)
    notas_de(P, 'oboe', TUNE_D, IV, 70, dur=0.95)
    notas_de(P, 'organo', TUNE_D, IV, 66, dur=0.97, reg='flauta')
    notas_de(P, 'vlnI', TUNE_D, IV + 32, 92, dur=0.97, acento=4, art='l')
    notas_de(P, 'trompeta', TUNE_D, IV + 32, 64, dur=0.95)
    canta(P, TUNE_D, IV + 32, 72, vocal='o')
    segunda(P, 'vlnII', TUNE_D, IV + 32, 70)
    voces(P, 'coroI', ACORDES_JEFE[40:56], 46, 'D3', 'D5', n=3, b0=IV, vocal='u', extra=0.3)
    voces(P, 'coroD', ACORDES_JEFE[40:56], 46, 'D3', 'D5', n=3, b0=IV, vocal='u', extra=0.3)
    voces(P, 'organo', ACORDES_JEFE[40:56], 46, 'D2', 'D4', n=3, b0=IV, reg='suave')
    pedal(P, 'sub', ACORDES_JEFE[40:56], 76, lo=22, b0=IV)
    P.nota('bat', IV + 32, 1, 'crash', 100)
    P.nota('tamtam', IV + 32, 4, 0, 84)
    P.nota('subida', 54 * L, 8.0, 0, 88)
    redoble(P, 54 * L, 8.0, 40, 124, 'caja')
    for i in range(32):
        P.nota('timbal', 54 * L + i * 0.25, 0.25, midi('A1'), 54 + 2 * i)
    # ---- 57-72 the anthem (the second tune on the choir, violins and brass, the organ and a full kit) and the chant twice at its biggest
    P.nota('bat', V, 1, 'crash', 112)
    P.nota('tamtam', V, 4, 0, 98)
    notas_de(P, 'vlnI', TUNE_B, V, 98, dur=0.97, acento=4, art='l')
    canta(P, TUNE_B, V, 96)
    notas_de(P, 'trompeta', TUNE_B, V, 76, dur=0.95)
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in TUNE_B], V, 82, dur=0.92)
    segunda(P, 'vlnII', TUNE_B, V, 78)
    voces(P, 'organo', AC_B, 66, 'D2', 'D4', n=4, b0=V, reg='pleno')
    for i in range(2):
        b0 = V + 32 + 16 * i
        motivo4(P, b0, [('vlnI', 0, 104, dict(art='m')), ('vlnII', -12, 92, dict(art='m')), ('coro', 0, 104, {}), ('metal', -12, 86, {}),
                        ('trompeta', 0, 84, {}), ('flauta', 12, 62, dict(vib=1))], 0)
        voces(P, 'organo', ACORDES_JEFE[64 + 4 * i:68 + 4 * i], 68, 'D2', 'D4', n=4, b0=b0, reg='pleno')
        P.nota('bat', b0, 1, 'crash', 114)
        P.nota('tamtam', b0, 4, 0, 100)
        redoble(P, b0 + 13.0, 3.0, 52, 118, 'caja')
    pedal(P, 'sub', ACORDES_JEFE[56:72], 90, lo=22, b0=V)
    galope(56, 72, 84)
    for c in range(56, 72):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0), 86)
    grande(56, 72, 0)
    for i in range(16):
        P.nota('timbal', 71 * L + i * 0.25, 0.25, midi('D2'), 60 + 3 * i)
    # ---- 73-76 the hush before the third phase: a whispering choir, the harp climbing, kettledrums trembling, a riser into silence
    voces(P, 'coroI', AC_VI, 52, 'D3', 'D5', n=3, b0=VI, vocal='u', extra=0.3)
    voces(P, 'coroD', AC_VI, 52, 'D3', 'D5', n=3, b0=VI, vocal='u', extra=0.3)
    for c in range(72, 76):
        S.arpa_compas(P, c, 'corcheas', 48 + 4 * (c - 72), desde='D3', hasta='D6')
        cello(P, c, 'R...............', 56, dur=3.8, art='l', lo=26)
    for i in range(46):
        P.nota('timbal', VI + 4 + i * 0.25, 0.25, midi('D2'), 40 + int(i * 1.2))
    P.nota('subida', VI + 8, 7.5, 0, 90)
    redoble(P, VI + 10, 5.5, 40, 124, 'caja')
    # ---- 77-96 the third phase, a quarter faster: the chant three times in a row and then the last stand («Ca-mio-neees» in unison,
    # the drums in sixteenths); the last fill ends on the dominant and a tam-tam rings into the start
    P.nota('bat', VII, 1, 'crash', 118)
    P.nota('tamtam', VII, 4, 0, 104)
    for i, h in enumerate((0, 16, 32)):
        b0 = VII + h
        motivo4(P, b0, [('vlnI', 0, 106, dict(art='m')), ('vlnII', -12, 94, dict(art='m')), ('coro', 0, 104, {}), ('metal', -12, 88, {}),
                        ('trompeta', 0, 84, {}), ('flauta', 12, 64, dict(vib=1))], 0)
        voces(P, 'organo', ACORDES_JEFE[76 + 4 * i:80 + 4 * i], 68, 'D2', 'D4', n=4, b0=b0, reg='pleno')
        if i:
            P.nota('bat', b0, 1, 'crash', 110)
    notas_de(P, 'vlnI', TUNE_MD, VII + 48, 106, dur=0.9, acento=4, art='m')
    notas_de(P, 'vlnII', [(b, d, m - 12, f) for b, d, m, f in TUNE_MD], VII + 48, 94, dur=0.9, acento=4, art='m')
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in TUNE_MD], VII + 48, 88, dur=0.9)
    notas_de(P, 'trompeta', TUNE_MD, VII + 48, 84, dur=0.9)
    canta(P, TUNE_MD, VII + 48, 104)
    voces(P, 'organo', ACORDES_JEFE[88:96], 68, 'D2', 'D4', n=4, b0=VII + 48, reg='pleno')
    pedal(P, 'sub', ACORDES_JEFE[76:96], 92, lo=22, b0=VII)
    galope(76, 96, 90)
    for c in range(76, 96):
        taikos(P, c, (0.0, 1.0, 2.0, 3.0) if c < 88 else (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5), 90)
    grande(76, 95, 4)
    for c in (79, 83, 87):
        redoble(P, c * L + 1.0, 3.0, 54, 122, 'caja')
    tambores(P, 94 * L + 2.0, ('tom1', 'tom2', 'tom3', 'tom4', 'tom1', 'tom2', 'tom3', 'tom4'), 94, 124, 0.25)
    redoble(P, 95 * L, 2.0, 60, 120, 'caja')
    for m in ('E4', 'A4', 'C#5', 'E5'):
        P.nota('metal', 95 * L + 2.0, 1.5, midi(m), 104)
    P.nota('tamtam', 95 * L + 2.0, 4, 0, 96)
    P.nota('bat', 95 * L + 2.0, 1, 'crash', 108)
    P.nota('taiko', 95 * L + 2.0, 1.0, midi('D2'), 110)
    acelerar(P, FASE3, K_FASE3)
    return P


def intro_jefe(P):
    """The intro (2 bars): a great organ chord, a tam-tam and the taiko, the choir swelling, a snare run, then the loop's last bar."""
    I = Partitura()
    I.nota('bat', 0.0, 1, 'crash', 112)
    I.nota('taiko', 0.0, 1.0, midi('D2'), 112)
    I.nota('taiko', 2.0, 1.0, midi('D2'), 96)
    I.nota('tamtam', 0.0, 4, 0, 100)
    I.nota('organo', 0.0, 3.5, tuple(midi(x) for x in ('D2', 'A2', 'D3', 'F3', 'A3', 'D4')), 100, reg='pleno')
    I.nota('organo', 0.0, 3.5, midi('D1'), 90, reg='pleno')
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (50, 57, 62, 65), 76, lado=pista[-1])
    I.nota('coro', 0.0, 3.5, (midi('D3'), midi('A3'), midi('D4')), 70, vocal='o')
    I.nota('sub', 0.0, 4.0, midi('D1'), 90)
    redoble(I, 2.0, 2.0, 50, 100, 'caja')
    I.anadir(P.trozo(BARRAS_JEFE * L - 4.0, BARRAS_JEFE * L, 1 * L))
    return I


def exportar_jefe(salida):
    return exportar(componer_jefe, intro_jefe, ACORDES_JEFE, BPM_JEFE, BARRAS_JEFE, 2, AUTO_JEFE, AUTO_INTRO_JEFE, salida,
                    MEZCLA_JEFE, bateria_db=-23.0, nombre='unaMasJefe', rt=1.9)


# =================================================================================================================
# unaMasRescate
# =================================================================================================================

BPM_RESCATE = 150
DUR_RESCATE = 7.2
AC_RESCATE = [['G'], ['A', 'D'], ['D'], ['D']]
MEZCLA_RESCATE = dict(vlnI=(-0.4, -23.0, 0.3, 0.0), coro=(0.0, -23.0, 0.45, 0.0), organo=(-0.1, -25.0, 0.4, 0.0),
                      trompeta=(0.0, -25.5, 0.35, 0.0), tamtam=(0.0, -23.0, 0.5, 0.0), timbal=(0.0, -23.0, 0.35, 0.0),
                      arpa=(-0.45, -25.0, 0.4, 0.25), campana=(0.5, -29.0, 0.5, 0.2), metal=(0.0, -27.0, 0.25, 0.0))


def componer_rescate():
    """The fanfare when a friend is rescued and a skill is won: the chant in D major («Ca-mio-neees, y ca-ra-va-naaas»), brass, violins
    and choir over rolling kettledrums, a harp swept up into the last chord, a tam-tam and bells. 4 bars at 150 bpm (6.4 s)."""
    P = Partitura()
    mel = M(MOTIVO)
    P.nota('bat', 0.0, 1, 'crash', 100)
    P.nota('taiko', 0.0, 1.0, midi('D2'), 100)
    notas_de(P, 'vlnI', mel, 0.0, 100, dur=0.95, acento=5, art='m')
    notas_de(P, 'vlnII', [(b, d, m - 12, f) for b, d, m, f in mel], 0.0, 88, dur=0.95, acento=5, art='m')
    notas_de(P, 'trompeta', mel, 0.0, 86, dur=0.95)
    notas_de(P, 'metal', [(b, d, m - 12, f) for b, d, m, f in mel], 0.0, 80, dur=0.92)
    notas_de(P, 'flauta', [(b, d, m + 12, f) for b, d, m, f in mel], 0.0, 60, dur=0.95, vib=1)
    canta(P, mel, 0.0, 92)
    voces(P, 'cuerdasI', AC_RESCATE, 84, 'D3', 'F#5', n=4, lado='I')
    voces(P, 'cuerdasD', AC_RESCATE, 84, 'D3', 'F#5', n=4, lado='D')
    for i in range(24):
        P.nota('timbal', 0.0 + i * 0.25, 0.25, midi('D2'), 56 + int(1.8 * i))
    for b, nota in ((4.0, 'bombo_banda'), (6.0, 'bombo_banda'), (7.0, 'caja'), (7.5, 'caja'), (7.75, 'caja')):
        P.nota('bat', b, 0.25, nota, 104)
    tambores(P, 7.0, ('tom1', 'tom2', 'tom3', 'tom4'), 90, 112, 0.25)
    # the harp sweeps up the chord into the last bar, and the last chord blooms: organ, choir, tam-tam, cymbals, bells
    gliss = [m for m in range(midi('D3'), midi('D6') + 1) if m % 12 in (2, 6, 9)]
    for i, m in enumerate(gliss):
        P.nota('arpa', 7.0 + i * (1.0 / len(gliss)), 0.4, m, 66 + i)
    P.nota('bat', 8.0, 2.0, 'crash', 118)
    P.nota('tamtam', 8.0, 4, 0, 104)
    P.nota('taiko', 8.0, 1.0, midi('D2'), 114)
    P.nota('organo', 8.0, 7.0, tuple(midi(x) for x in ('D3', 'A3', 'D4', 'F#4', 'A4', 'D5')), 98, reg='pleno')
    P.nota('organo', 8.0, 7.0, midi('D2'), 90, reg='pleno')
    P.nota('coro', 8.0, 7.0, (midi('D4'), midi('A4'), midi('D5'), midi('F#5')), 92, vocal='a')
    P.nota('vlnI', 8.0, 7.0, midi('D6'), 98, art='l')
    P.nota('trompeta', 8.0, 7.0, midi('D5'), 84)
    P.nota('timbal', 8.0, 1.0, midi('D2'), 100)
    for i, m in enumerate(('D6', 'F#6', 'A6', 'D7', 'A6', 'F#6')):
        P.nota('campana', 8.0 + i * 0.25, 0.6, midi(m), 80 - 2 * i)
    return P


def exportar_rescate(salida):
    F.exportar_una_vez(componer_rescate, AC_RESCATE, BPM_RESCATE, DUR_RESCATE, [0.0, 0.0, 1.5, 0.0], salida,
                       mezcla={**NUEVOS, **MEZCLA_RESCATE}, bateria_db=-22.0, final_db=-4.0, rt=1.5, fundido=1.0, kbps=KBPS)
    print(f"  musica.ts: {{ url: unaMasRescate, inicio: 0, fin: {DUR_RESCATE} }}")


# =================================================================================================================
# Checks
# =================================================================================================================

REFERENCIAS = ('sol-jefe.mp3', 'sol-combate.mp3', 'sol-teatro.mp3', 'kart-carrera.mp3')


def _bandas(x, ar):
    sp = np.abs(np.fft.rfft(x)) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / ar)
    tot = sp.sum()
    cortes = [(30, 150), (150, 500), (500, 2000), (2000, 5000), (5000, 12000)]
    return [10 * np.log10(sp[(fr >= lo) & (fr < hi)].sum() / tot + 1e-12) for lo, hi in cortes]


def analisis(carpeta, referencias='../../src/sonido'):
    """The decoded MP3: loudness and bands against the game's other tracks (so that nothing screams on a phone or is
    thinner than the rest), clipping, and the level second by second."""
    ar = 24000
    print('bands 30-150, 150-500, 500-2k, 2k-5k, 5k-12k (dB of the total energy):')
    for nombre in REFERENCIAS:
        ruta = os.path.join(referencias, nombre)
        if os.path.exists(ruta):
            x = decodificar(ruta, ar)
            mono = x.mean(axis=0)
            print(f'  reference {nombre}: {medir(ruta):.1f} LUFS, peak {np.max(np.abs(x)):.3f}, rms {20 * np.log10(np.sqrt(np.mean(x ** 2))):.1f} dBFS, bands '
                  + ' '.join(f'{b:.1f}' for b in _bandas(mono, ar)))
    for archivo in sorted(os.listdir(carpeta)):
        if not archivo.startswith('una-mas-') or not archivo.endswith('.mp3'):
            continue
        ruta = os.path.join(carpeta, archivo)
        x = decodificar(ruta, ar)
        mono = x.mean(axis=0)
        clip = int(np.sum(np.abs(x) > 0.995))
        print(f'{archivo}: {x.shape[1] / ar:.2f} s, {os.path.getsize(ruta) / 1e3:.0f} kB, {medir(ruta):.1f} LUFS, peak {np.max(np.abs(x)):.3f}, '
              f'clipped samples {clip}, bands ' + ' '.join(f'{b:.1f}' for b in _bandas(mono, ar)))
        v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + ar] ** 2)) + 1e-9) for i in range(0, len(mono) - ar, ar)]
        print('  dB per second:', ' '.join(f'{d:.0f}' for d in v))
        print(f'  quietest second {min(v):.0f}, loudest {max(v):.0f} (range {max(v) - min(v):.0f} dB)')


def revisar():
    """Every melody note that starts on a beat, lasts a beat or more and is not a tone of its chord (a few are meant: passing
    tones, the C sharp of the chant, a suspension)."""
    coro = M(CORO4)
    trabajos = (
        (ACORDES_EXPLORA, BPM_EXPLORA, (('explora A', TUNE_A, 0), ('explora A\'\'', TUNE_A, 160), ('explora B', TUNE_B, 64), ('explora C1', coro, 96),
                                        ('explora C2', coro, 112), ('explora E', TUNE_E, 192))),
        (ACORDES_JARDIN, BPM_JARDIN, (('jardin A', tr(TUNE_A, K_J), 0), ('jardin B', tr(TUNE_B, K_J), 64), ('jardin C1', tr(coro, K_J), 96),
                                      ('jardin C2', tr(coro, K_J), 112), ('jardin A3', tr(TUNE_A, K_J), 160), ('jardin E', tr(TUNE_E2, K_J), 192))),
        (ACORDES_TEATRO, BPM_TEATRO, (('teatro A', tr(TUNE_A, K_T), 0), ('teatro B', tr(TUNE_B, K_T), 64), ('teatro C1', tr(coro, K_T), 96),
                                      ('teatro C2', tr(coro, K_T), 112), ('teatro A3', tr(TUNE_A, K_T), 160))),
        (ACORDES_MINIBOSS, BPM_MINIBOSS, (('miniboss A', tr(TUNE_MA, K_M), 0), ('miniboss B1', tr(coro, K_M), 32), ('miniboss B2', tr(coro, K_M), 48),
                                          ('miniboss B3', tr(coro, K_M), 128), ('miniboss B4', tr(coro, K_M), 144), ('miniboss D', tr(TUNE_MD, K_M), 160),
                                          ('miniboss E', tr(TUNE_ME, K_M), 192))),
        (ACORDES_JEFE, BPM_JEFE, (('jefe I', TUNE_I, 0), ('jefe II', TUNE_II, 32), ('jefe II\'', TUNE_II, 64), ('jefe III1', coro, 96),
                                  ('jefe III2', coro, 112), ('jefe III3', coro, 128), ('jefe III4', coro, 144), ('jefe D', TUNE_D, 160),
                                  ('jefe D\'', TUNE_D, 192), ('jefe B', TUNE_B, 224), ('jefe V1', coro, 256), ('jefe V2', coro, 272),
                                  ('jefe VII1', coro, 304), ('jefe VII2', coro, 320), ('jefe VII3', coro, 336), ('jefe MD', TUNE_MD, 352))),
        (AC_RESCATE, BPM_RESCATE, (('rescate', M(MOTIVO), 0),)),
    )
    for acordes, bpm, partes in trabajos:
        with tema(bpm, acordes):
            for nombre, mel, b0 in partes:
                for b, d, m, _ in mel:
                    ch = S.ch_en(b0 + b)
                    if b % 1 == 0 and d >= 1 and m % 12 not in S.acorde_pcs(ch):
                        print(f'  {nombre}: bar {int((b0 + b) // L) + 1} beat {b % L + 1:.0f}: {NOM[m % 12]}{m // 12 - 1} over {ch}')
    print('listed')


PISTAS = {'explora': (exportar_explora, 'una-mas-explora.mp3'), 'jardin': (exportar_jardin, 'una-mas-jardin.mp3'),
          'teatro': (exportar_teatro, 'una-mas-teatro.mp3'), 'miniboss': (exportar_miniboss, 'una-mas-miniboss.mp3'),
          'jefe': (exportar_jefe, 'una-mas-jefe.mp3'), 'rescate': (exportar_rescate, 'una-mas-rescate.mp3')}

if __name__ == '__main__':
    modos = tuple(PISTAS) + ('revisar', 'analisis')
    modo = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in modos else 'todo'
    resto = sys.argv[2:] if modo != 'todo' else sys.argv[1:]
    carpeta = resto[0] if resto else '../../src/sonido'
    if modo == 'revisar':
        revisar()
    elif modo == 'analisis':
        analisis(carpeta)
    elif modo in PISTAS and carpeta.endswith('.mp3'):
        PISTAS[modo][0](carpeta)
    else:
        os.makedirs(carpeta, exist_ok=True)
        for clave, (exportar_pista, archivo) in PISTAS.items():
            if modo in ('todo', clave):
                exportar_pista(os.path.join(carpeta, archivo))
