# «Alacant Sun», the end: the third part of the sound of Pablo's Golden Sun parody (chapter 2, src/sol/): the Theatre
# (the dungeon), the boss, Calderón's summoning, the way out, and seven effects. Like sol.py and sol_combate.py, all of
# it is our own: no melody, chord progression or motif of the original (nor of any other song), written in the manner
# of a 2001 Game Boy Advance fantasy RPG (progressive rock squeezed into a tiny sound chip).
# It does not copy them: it imports sol.py and sol_combate.py and uses their score tools (Partitura, melodia,
# pad_voces, arpa_compas, bajo_compas, bateria, redoble, tambores, ...), their instruments and drums, their mixer and
# output helpers, which in turn stand on the ring-shaped tools of brio.py (filters, reverb and compressor by FFT, so a
# round that is played over and over joins with no click and no fade). `tema()` sets their tempo, chords and mix for a
# track and puts them back, so sol.py and sol_combate.py generate exactly what they did before. What is new here:
# instruments (a theatre organ, a synth choir, a detuned music box, a harpsichord, a baroque trumpet, kettledrums, a
# tam-tam, a riser, a sub bass, a draught, the stage machinery), a mixer that looks after the stems that only an intro
# has, and the score. Pure synthesis with numpy: no SoundFont, no fluidsynth, no scipy, no mido.
#
#   «solTeatro»    the dungeon: an old theatre at night, empty, with its curtains, dust and machinery. C# minor
#                  (C# aeolian, with the D of the Neapolitan), 84 bpm, 24 bars (68.6 s) in a loop after a 2-bar intro
#                  (5.7 s) heard once. Structure (bars):
#                    1-8    A   «el telón»: a detuned music box tune over an organ pedal, strings, a draught, dust,
#                               a heartbeat of kettledrum and the odd creak of wood
#                    9-16   B   «la tramoya»: a harpsichord ticking in 3+3+2 like a mechanism (the puzzles), a tune on a
#                               flute-stop organ with the music box answering, a soft ticking kit
#                    17-24  C   «la platea vacía»: a full organ chorale, a flute going down the steps, music-box
#                               arpeggios; the last two bars run up on the harpsichord into the start
#   «solJefe»      the fight against the narrator: B minor (the chorus lifts to G / D major), 144 bpm, 36 bars (60 s) in a
#                  loop after a 2-bar intro (3.3 s: a great organ chord with a tam-tam, a snare run and the loop's last
#                  bar) heard once. Structure (bars):
#                    1-8    A   pulse-lead hook with an oboe, the organ's toccata in sixteenths, a chugging riff, a
#                               16th-note bass, a rock kit; the choir hums from bar 5, brass chords at the phrase ends
#                    9-16   B   the chorus: the choir sings the tune with brass and lead in unison, full organ chords,
#                               open power chords, a double bass drum, a sine under the bass
#                    17-24  C   the bridge, half time: an organ solo over a bass pedal, a music box in 3+3+2, a choir
#                               whispering, muted chugs; kettledrums rolling into the last chorus
#                    25-32  D   the last chorus: everything, a trumpet on the tune, the choir higher, the toccata under it
#                    33-36  E   the build back: all in unison, a riser, a snare roll, the fill
#   «solCalderon»  Calderón de la Barca coming down from the sky, heard once: D major, 120 bpm, 11 bars, 22.0 s.
#                  A hush of strings, hummed choir and bells (bars 1-2); the choir's tune climbing from A4 to A6 over a
#                  growing organ, kettledrums that quicken and a harp (3-8), baroque trumpets from bar 5, a snare roll and
#                  a riser from bar 7 into three quarters of a beat of silence, and then
#
#                  ===>  THE FINAL STRIKE FALLS AT 16.000 s  (bar 9, beat 1: 32 beats of 0.5 s)  <===
#
#                  kettledrums, bass drum, tam-tam, cymbals, the full organ, brass, a trumpet fanfare, bells and a harp
#                  glissando, with the choir blooming a hair after it; then two bars (to 22 s) of the chord settling,
#                  fading out over the last 2 s. Measured on the decoded MP3 (ffmpeg, which skips the encoder's delay): the
#                  largest jump in loudness is at 16.00 s. A browser that does not skip it may play everything ~25-50 ms late.
#   «solFinal»     the way out and the credits, heard once: D major, 72 bpm, 22 bars + the last chord, 78.0 s. Structure:
#                    1-4    the dream: «La vida es sueño, y los sueños, sueños son» sung by a music box (our own
#                           setting, stepwise like a lullaby) that comes slowly into tune; strings, a pedal, a draught
#                    5-12   the waking tune: a flute over a harp, a choir humming from bar 9, a light pulse
#                    13-16  the village's tune, a wink: bars 1-4 of solPueblo's A tune verbatim (D dorian, its own chords:
#                           Dm7 G6 Bbmaj7 Asus4 A7), slow, on a music box in tune with the flute following, over the
#                           same harp-in-eighths and picked bass as in solPueblo
#                    17-20  the same tune brightened: F -> F sharp and B flat -> B turn D dorian into D major (the dream
#                           becomes day); an oboe a third below, bells, a choir
#                    21-22  the cadence and the last chord: Calderón's line once more, in tune, over a chord (D add9) that
#                           rings and fades away over the last 4 s
#   effects (mono, short; each ends fading out, never cut):
#   solHielo       a puddle freezing into a column of ice (0.9 s)         solViento     the cierzo blowing out candles (1 s)
#   solRoca        a papier-mâché rock lifted or dropped (0.6 s)          solPuzle      the tinkle of a puzzle solved (1.2 s)
#   solChat        the bubble of a message when a mind is read (0.3 s)    solTelon      a curtain opening (1.2 s)
#   solTransforma  the boss changing phase (1.5 s)
#
#   python3 sol_final.py [carpeta]              -> the 11 MP3 in `carpeta` (the game's copy: ../../src/sonido)
#   python3 sol_final.py teatro [salida]        only the dungeon theme (also jefe, calderon, final; `salida` may be a .mp3)
#   python3 sol_final.py efectos [carpeta]      only the seven effects
#   python3 sol_final.py revisar                lists the melody notes on a beat that are not tones of their chord
#   python3 sol_final.py analisis [carpeta]     measures the MP3 (seams, levels, spectrum, lengths, where the strike falls)
import os
import subprocess
import sys
import tempfile
from contextlib import contextmanager
import numpy as np
import sol as S
import sol_combate as C
from sol import Partitura, melodia, pad_voces, arpa_compas, bajo_compas, bateria, redoble, tambores, \
    armonia_debajo, acorde_pcs, raiz_grave, tiempo, adsr, pulso, ruido_ba, inst, sintetizar, a_mp3, lineal, \
    decodificar, mezclar, medir, curva_auto
from sol_combate import guitarra_compas, muestras_barras, _limitar, _cierre, _sumar
from brio import SR, db, hz, midi, eq, sierra, suave, escribir_wav, lufs, vel_a_amp, potencia_activa

L = 4
OBJETIVO = -16.0                     # LUFS: the same as solPueblo

# More chord types for sol.py's chord names (it only adds entries: what sol.py makes does not change)
S.INTERVALOS.update({'dim': (0, 3, 6), 'm7b5': (0, 3, 6, 10), 'madd9': (0, 3, 7, 14), '9': (0, 4, 7, 10, 14),
                     'maj9': (0, 4, 7, 11, 14), 'm9': (0, 3, 7, 10, 14), '5': (0, 7), 'mmaj7': (0, 3, 7, 11),
                     'm6': (0, 3, 7, 9), 'sus2': (0, 2, 7)})

# =================================================================================================================
# New instruments (registered in sol.py's table, so its mixer plays them)
# =================================================================================================================


def _tonos(m):
    return m if isinstance(m, tuple) else (m,)


@inst
def organo(m, g, v, rng, reg='pleno', trem=1):
    """A theatre organ: drawbars of sines (16', 8', 4', 2 2/3', 2' and a thin mixture), a slow tremulant in pitch and
    loudness, a puff of wind at the start. `m` is a note or a tuple of notes. Registers: 'suave' (soft flutes),
    'flauta' (a lone 8' and 4'), 'pleno' (full, a little reedy) and 'tocata' (clear and short, for runs)."""
    ms = _tonos(m)
    nm = int((g + 0.5) * SR) + 1
    t = tiempo(nm)
    barras = {'suave': ((0.5, .30), (1, 1.0), (2, .45), (3, .12), (4, .15)),
              'flauta': ((1, 1.0), (2, .35), (4, .06)),
              'pleno': ((0.5, .55), (1, 1.0), (1.5, .22), (2, .75), (3, .42), (4, .40), (5, .22), (6, .16), (8, .10)),
              'tocata': ((0.5, .35), (1, 1.0), (2, .65), (3, .30), (4, .35), (6, .12))}[reg]
    fase_t = rng.random() * 6.28
    w = np.zeros(nm)
    for tono in ms:
        f = float(hz(tono))
        for r, a in barras:
            fr = f * r
            if fr < 30 or fr > 9000:
                continue
            beta = trem * fr * 0.0012 / 5.1
            w += a * np.sin(2 * np.pi * fr * t - beta * np.cos(2 * np.pi * 5.1 * t + fase_t) + rng.random() * 6.28)
    w = w / (len(ms) * 2.4)
    if reg in ('pleno', 'tocata'):
        w = np.tanh(1.8 * w)
    w = w * (1 + trem * 0.05 * np.sin(2 * np.pi * 5.1 * t + fase_t + 1.0))
    w = eq(w, ('lp', 3300 if reg in ('suave', 'flauta') else 5600, 2), ('hp', 40, 2), circ=False)
    if reg != 'suave':
        w = w + 0.1 * ruido_ba(rng, nm, 1200, 5000) * np.exp(-t / 0.03)
    return w * adsr(nm, g, 0.02, 1e3, 1.0, 0.14) * vel_a_amp(v) * 2.0


FORMANTES = {'a': ((800, 12, .22), (1150, 9, .22), (2900, 6, .3)),
             'o': ((450, 12, .22), (800, 9, .22), (2830, 5, .3)),
             'u': ((325, 12, .22), (700, 8, .22), (2530, 4, .3)),
             'e': ((400, 11, .2), (2000, 9, .25), (2800, 6, .3))}


@inst
def coro(m, g, v, rng, vocal='a', lado=''):
    """A synth choir: for each tone three saws a few cents apart, a slow swell, a late vibrato, a puff of breath, all
    through the formants of a vowel ('a', 'o', 'u', 'e'). `m` is a note or a tuple of notes (voices)."""
    ms = _tonos(m)
    nm = int((g + 1.0) * SR) + 1
    t = tiempo(nm)
    desv = (-12, -1, 10) if lado == 'D' else (-10, 2, 12)
    vib = 0.0055 * np.sin(2 * np.pi * (5.0 + 0.4 * rng.random()) * t + rng.random() * 6.28) * np.clip((t - 0.35) / 0.5, 0, 1)
    w = np.zeros(nm)
    for tono in ms:
        for c in desv:
            f = hz(tono) * 2 ** (c / 1200) * (1 + vib)
            w += sierra(f, rng.random())
    w = w / (len(ms) * 3)
    w = eq(w, ('hp', 110, 2), *[('pico', fh, d, a) for fh, d, a in FORMANTES[vocal]], ('lp', 5200, 2), circ=False)
    w = w + 0.025 * ruido_ba(rng, nm, 1500, 6000) * np.minimum(1, t / 0.3)
    return w * adsr(nm, g, 0.28, 1e3, 1.0, 0.45) * vel_a_amp(v) * 2.4


@inst
def coroI(m, g, v, rng, vocal='a'):
    return coro(m, g, v, rng, vocal=vocal, lado='I')


@inst
def coroD(m, g, v, rng, vocal='a'):
    return coro(m, g, v, rng, vocal=vocal, lado='D')


@inst
def cajita(m, g, v, rng, des=1.0, tau=0.55):
    """A music box that has seen better days: a tine (an FM bell with a glassy partial and the tick of the comb), each
    note a different amount out of tune (`des` 1 = up to 40 cents flat or 18 sharp, 0 = in tune) and sagging a hair."""
    nm = int(min(2.6, tau * 5) * SR)
    t = tiempo(nm)
    cents = des * rng.uniform(-40, 18)
    f = hz(m) * 2 ** (cents / 1200) * (1 - des * 0.002 * (1 - np.exp(-t / 0.8)))
    fase = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(fase + 1.3 * np.exp(-t / (tau * 0.3)) * np.sin(fase * 3.99)) * np.exp(-t / tau)
    w = w + 0.28 * np.sin(fase * 5.4) * np.exp(-t / (tau * 0.22))
    w = w + 0.3 * ruido_ba(rng, nm, 3500, 9000) * np.exp(-t / 0.004)
    w = w * np.minimum(1, t / 0.0012)
    w[-64:] *= np.linspace(1, 0, 64)
    return w * vel_a_amp(v)


@inst
def clave(m, g, v, rng, des=1.0):
    """An old harpsichord: two strings (8' and 4') plucked by a quill, a bright start that dies fast over a woody
    body, a little out of tune (`des`)."""
    nm = int(0.9 * SR)
    t = tiempo(nm)
    f = np.full(nm, float(hz(m)) * 2 ** (des * rng.uniform(-14, 14) / 1200))
    s = sierra(f, rng.random()) + 0.6 * sierra(f * 2.0013, rng.random())
    brillo = eq(s, ('lp', 5200, 2), circ=False) * np.exp(-t / 0.06)
    cuerpo = eq(s, ('lp', 1700, 2), ('hp', 120, 2), circ=False) * np.exp(-t / 0.33)
    pua = ruido_ba(rng, nm, 2000, 8000) * np.exp(-t / 0.0025)
    w = (0.7 * brillo + cuerpo + 0.4 * pua) * np.minimum(1, t / 0.0008)
    w[-96:] *= np.linspace(1, 0, 96)
    return w * vel_a_amp(v) * 0.8


@inst
def trompeta(m, g, v, rng):
    """A baroque trumpet: two bright voices a few cents apart, a scoop and a tongued start, no vibrato to speak of."""
    nm = int((g + 0.45) * SR) + 1
    t = tiempo(nm)
    vib = 0.003 * np.sin(2 * np.pi * 6.2 * t) * np.clip((t - 0.3) / 0.3, 0, 1)
    w = np.zeros(nm)
    for c in (-5, 5):
        f = hz(m) * 2 ** (c / 1200) * (1 - 0.012 * np.exp(-t / 0.03)) * (1 + vib)
        w += sierra(f, rng.random())
    w = w / 2
    w = 0.9 * eq(w, ('lp', 2400, 2), ('hp', 160, 2), ('pico', 1250, 5.0, 0.4), circ=False) \
        + 0.7 * eq(w, ('lp', 6500, 2), circ=False) * np.exp(-t / 0.09)
    w = np.tanh(1.5 * w) + 0.1 * ruido_ba(rng, nm, 1500, 6000) * np.exp(-t / 0.012)
    return w * adsr(nm, g, 0.012, 1e3, 1.0, 0.09) * vel_a_amp(v) * 1.2


@inst
def timbal(m, g, v, rng):
    """A kettledrum tuned to a note: the strike's modes at 1, 1.5, 2, 2.44 and 2.9 times the pitch, dropping a little
    in pitch as they start, over a thump of skin and a click of the mallet."""
    nm = int((0.7 if g < 0.2 else 1.7) * SR)
    t = tiempo(nm)
    f = float(hz(m))
    w = np.zeros(nm)
    for r, a, tau in ((1.0, .45, .7), (1.5, 1.0, .55), (1.98, .65, .38), (2.44, .4, .26), (2.9, .28, .18)):
        fr = f * r * (1 + 0.07 * np.exp(-t / 0.035))
        w += a * np.sin(2 * np.pi * np.cumsum(fr) / SR + rng.random() * 0.5) * np.exp(-t / tau)
    w = w + 0.9 * ruido_ba(rng, nm, 60, 500) * np.exp(-t / 0.02) + 0.25 * ruido_ba(rng, nm, 1500, 5000) * np.exp(-t / 0.004)
    w = np.tanh(1.2 * w)
    w[-128:] *= np.linspace(1, 0, 128)
    return w * vel_a_amp(v) * 0.9


@inst
def tamtam(m, g, v, rng):
    """A big tam-tam / orchestral cymbal for the great hits: many inharmonic partials, the high ones dying first, a
    wash of noise, a slow bloom after the strike (4.5 s)."""
    nm = int(4.5 * SR)
    t = tiempo(nm)
    w = np.zeros(nm)
    for _ in range(36):
        fr = 70 * 46 ** rng.random()
        w += rng.uniform(.3, 1.0) * np.sin(2 * np.pi * fr * t + rng.random() * 6.28) * np.exp(-t / (rng.uniform(.8, 3.2) / (1 + fr / 2500)))
    ruido = ruido_ba(rng, nm, 300, 9000) * (0.5 * np.exp(-t / 0.9) + 0.3 * np.exp(-t / 0.15))
    w = (w / 9 + 0.7 * ruido) * (1 + 0.5 * (1 - np.exp(-t / 0.25))) * np.minimum(1, t / 0.003)
    w[-256:] *= np.linspace(1, 0, 256)
    return w * vel_a_amp(v)


@inst
def subida(m, g, v, rng):
    """A rising wash of noise (a reversed cymbal): it opens from dark to bright and cuts at the end of the gate."""
    nm = int(g * SR) + 1
    t = tiempo(nm)
    u = np.clip(t / g, 0, 1)
    r = rng.standard_normal(nm)
    bajo = eq(r, ('hp', 300, 2), ('lp', 1500, 2), circ=False)
    medio = eq(r, ('hp', 1500, 2), ('lp', 5000, 2), circ=False)
    alto = eq(r, ('hp', 5000, 2), circ=False)
    w = (0.5 * bajo * u ** 1.5 + 0.8 * medio * u ** 2.2 + 1.0 * alto * u ** 3) * u
    w[-64:] *= np.linspace(1, 0, 64)
    return w * vel_a_amp(v) * 1.5


@inst
def sub(m, g, v, rng):
    """A pure low note for weight under the bass."""
    nm = int((g + 0.2) * SR) + 1
    t = tiempo(nm)
    f = float(hz(m))
    w = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return w * adsr(nm, g, 0.008, 1e3, 1.0, 0.07) * vel_a_amp(v)


@inst
def viento(m, g, v, rng):
    """A draught through the curtains: three bands of noise that swell and fall on their own slow curves, and a very
    faint whistle in the gap under the door."""
    nm = int(g * SR) + 1
    t = tiempo(nm)
    u = np.clip(t / g, 0, 1)
    env = np.sin(np.pi * u) ** 2
    graves = eq(rng.standard_normal(nm), ('hp', 90, 2), ('lp', 420, 2), circ=False)
    medios = eq(rng.standard_normal(nm), ('hp', 350, 2), ('lp', 1500, 2), circ=False)
    agudos = eq(rng.standard_normal(nm), ('hp', 1800, 2), ('lp', 4800, 2), circ=False)
    f2, f3 = rng.uniform(1.3, 2.4), rng.uniform(2.0, 3.4)
    a2 = env * (0.55 + 0.45 * np.sin(2 * np.pi * f2 * u + rng.random() * 6.28))
    a3 = env * (0.5 + 0.5 * np.sin(2 * np.pi * f3 * u + rng.random() * 6.28)) ** 2
    silbo = np.sin(2 * np.pi * np.cumsum(780 + 160 * np.sin(2 * np.pi * 0.8 * t + rng.random() * 6.28)) / SR)
    w = graves * env + 0.8 * medios * a2 + 0.22 * agudos * a3 + 0.03 * silbo * a2
    w[-64:] *= np.linspace(1, 0, 64)
    return w * vel_a_amp(v) * 1.4


def _crujido(rng, dur, f0, f1, tm=0.5):
    """A wooden creak: a stick-slip saw whose pitch wanders from f0 to f1, through two narrow, moving resonances."""
    nm = int(dur * SR)
    t = tiempo(nm)
    u = t / dur
    f = f0 + (f1 - f0) * u + 55 * np.sin(np.pi * u) + 16 * np.sin(2 * np.pi * 21 * t)
    rasca = sierra(f, 0.0) * (0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(30 + 18 * u) / SR))
    rasca = eq(rasca, ('hp', 140, 2), ('pico', 600, 7.0, 0.3), ('pico', 1500, 5.0, 0.3), ('lp', 3200, 2), circ=False)
    return rasca * np.sin(np.pi * u) ** tm


@inst
def tramoya(m, g, v, rng, tipo='crujido'):
    """The sounds of the stage machinery in an empty theatre: a creak of old wood, a distant knock, a rope running
    through a pulley."""
    if tipo == 'crujido':
        w = _crujido(rng, g, 150, 205)
    elif tipo == 'golpe':
        nm = int(0.5 * SR)
        t = tiempo(nm)
        w = np.sin(2 * np.pi * np.cumsum(60 + 40 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.07) \
            + 0.8 * (np.sin(2 * np.pi * 410 * t) * 0.5 + ruido_ba(rng, nm, 400, 2500)) * np.exp(-t / 0.012)
        w[-64:] *= np.linspace(1, 0, 64)
    else:                                                                  # the rope
        nm = int(g * SR) + 1
        w = np.zeros(nm)
        for k in range(14):
            i0 = int((0.02 + k * g / 15.5 + rng.uniform(-0.01, 0.01)) * SR)
            nn = int(0.012 * SR)
            tt = tiempo(nn)
            tic = (ruido_ba(rng, nn, 700, 4500) + 0.6 * np.sin(2 * np.pi * 1100 * tt)) * np.exp(-tt / 0.003)
            w[i0:i0 + nn] += tic[:max(0, nm - i0)]
        w = w + 0.2 * eq(rng.standard_normal(nm), ('hp', 200, 2), ('lp', 900, 2), circ=False) * np.sin(np.pi * np.clip(tiempo(nm) / g, 0, 1))
        w[-64:] *= np.linspace(1, 0, 64)
    return w * vel_a_amp(v)


# name: (pan, active level dB, reverb send, echo): the stems of this file that sol.py and sol_combate.py do not know
NUEVOS = dict(organo=(-0.1, -24.0, 0.35, 0.0), coro=(0.0, -24.0, 0.45, 0.0),
              coroI=(-0.75, -27.0, 0.5, 0.0), coroD=(0.75, -27.0, 0.5, 0.0),
              cajita=(0.45, -29.0, 0.5, 0.3), clave=(-0.3, -27.0, 0.35, 0.2), trompeta=(0.0, -26.0, 0.3, 0.0),
              timbal=(0.0, -23.0, 0.35, 0.0), tamtam=(0.0, -26.0, 0.5, 0.0), subida=(0.0, -31.0, 0.4, 0.0),
              sub=(0.0, -26.0, 0.0, 0.0), viento=(0.0, -33.0, 0.5, 0.0), tramoya=(0.3, -30.0, 0.5, 0.0))


@contextmanager
def tema(bpm, acordes, mezcla=None, bateria_db=None):
    """sol_combate's tema() (tempo, chords, mix of sol.py put back afterwards) plus this file's stems; `mezcla` changes
    the level of any stem for this track only, and `bateria_db` the level of the kit (sol.py's NIVEL_BATERIA)."""
    with C.tema(bpm, acordes):
        S.MEZCLA.update(NUEVOS)
        if mezcla:
            S.MEZCLA.update(mezcla)
        antes = S.NIVEL_BATERIA
        if bateria_db is not None:
            S.NIVEL_BATERIA = bateria_db
        try:
            yield
        finally:
            S.NIVEL_BATERIA = antes


def voces(P, pista, acordes, vels, lo, hi, n=3, b0=0.0, extra=0.12, previo=None, **opc):
    """Each chord (one per bar, or two of two beats) as `n` tones in close position within [lo, hi], the nearest to the
    last (voice leading), as ONE event with a tuple of notes. `vels`: a number or one per bar."""
    previo = (midi(lo) + midi(hi)) / 2 if previo is None else previo
    for i, cs in enumerate(acordes):
        v = vels[i] if isinstance(vels, (list, tuple)) else vels
        for k, ch in enumerate(cs):
            ts = S.tonos(ch, lo, hi)
            vv = min((ts[j:j + n] for j in range(len(ts) - n + 1)), key=lambda w: (abs(np.mean(w) - previo), w[0]))
            previo = np.mean(vv)
            d = L / len(cs)
            P.nota(pista, b0 + i * L + k * d, d + extra, tuple(vv), v, **opc)


def pedal(P, pista, acordes, vels, lo=30, b0=0.0, extra=0.1, **opc):
    """The root of each chord, low, held for the chord's length."""
    for i, cs in enumerate(acordes):
        v = vels[i] if isinstance(vels, (list, tuple)) else vels
        for k, ch in enumerate(cs):
            d = L / len(cs)
            P.nota(pista, b0 + i * L + k * d, d + extra, raiz_grave(ch, lo), v, **opc)


def notas_de(P, pista, mel, b0, vel, dur=0.92, acento=6, **opc):
    """A tune from melodia() onto a stem; the notes on a beat get `acento` more velocity."""
    for b, d, m, _ in mel:
        P.nota(pista, b0 + b, d * dur, m, vel + (acento if b % 1 == 0 else 0), **opc)


def arpegio(P, compas, estilo, vel, desde, hasta, pista, baja=False, **opc):
    """Broken chords of a bar like sol.arpa_compas, but going down if `baja`, with options for the instrument."""
    pos = {'corcheas': range(0, 16, 2), 'tresytres': (0, 3, 6, 8, 11, 14), 'semis': range(16)}[estilo]
    for k, p in enumerate(pos):
        b = compas * L + p / 4
        ts = S.tonos(S.ch_en(b), desde, hasta)
        i = (len(ts) - 1 - (k % len(ts))) if baja else (0, 1, 2, 3, 4, 3, 2, 1)[k % 8] % len(ts)
        P.nota(pista, b, 0.5, ts[i], vel + (8 if k == 0 else 0), **opc)


def polvo(P, semilla, n, b0, b1, desde='C7', hasta='G7', vel=(40, 62), pista='gota'):
    """Dust motes in the footlights: high, quiet bells, chord tones, never on a pattern."""
    rng = np.random.default_rng(semilla)
    for _ in range(n):
        b = b0 + float(np.round(rng.uniform(0, b1 - b0) * 4) / 4)
        ts = S.tonos(S.ch_en(b), desde, hasta)
        P.nota(pista, b, 0.3, ts[int(rng.integers(len(ts)))], int(rng.integers(vel[0], vel[1])))


# --- Exporting --------------------------------------------------------------------------------------------------------------

def _gananciasintro(I, n):
    """Stems that only the intro has get their gain from the intro itself (sol.mezclar would not find them)."""
    for k, w in S.tocar(I, n).items():
        if k in S.MEZCLA and k not in S.GANANCIAS:
            S.GANANCIAS[k] = 10 ** ((S.MEZCLA[k][1] - potencia_activa(w)) / 20)


def exportar_bucle(P, I, bpm, barras, barras_intro, auto, auto_intro, salida, rt=1.1, objetivo=OBJETIVO, kbps=80,
                   cola_intro=4.0, margen=0.5):
    """sol_combate.exportar_bucle with the hall's length as a parameter and the intro-only stems looked after: the
    loop (`barras` bars on a ring) and the intro (`barras_intro` bars) joined; the intro's last ~90 ms fade into the end
    of the loop's ring, so what plays after it is the loop's start with no break; the loop is the stretch from `inicio`
    to `fin`, and the half second after `fin` is the loop's own start."""
    n = muestras_barras(bpm, barras)
    n_i = muestras_barras(bpm, barras_intro)
    x = mezclar(P, n, auto, rt_sala=rt)
    assert x.shape[1] == n
    _gananciasintro(I, n_i + int(cola_intro * SR))
    xi = mezclar(I, n_i + int(cola_intro * SR), auto_intro, final=auto[0], rt_sala=rt, fijar=False)
    x = x - x.mean(axis=1, keepdims=True)
    xi = xi - xi.mean(axis=1, keepdims=True)
    X = int(0.09 * SR)
    w = 0.5 - 0.5 * np.cos(np.pi * np.arange(X) / X)
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    m = int(round(margen * SR))
    with tempfile.TemporaryDirectory() as d:
        for _ in range(5):
            y, yi = suave(x, g), suave(xi, g)
            intro = yi[:, :n_i].copy()
            intro[:, -X:] = (1 - w) * intro[:, -X:] + w * y[:, -X:]
            trozo = np.concatenate([intro, y, y[:, :m]], axis=1)
            ruta = f'{d}/p.wav'
            escribir_wav(ruta, trozo)
            medido = lufs(ruta)
            if abs(medido - objetivo) < 0.08:
                break
            g *= db(objetivo - medido)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', ruta, '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
    paso = np.abs(np.diff(np.concatenate([y, y[:, :1]], axis=1), axis=1))
    inicio, fin = n_i / SR, (n_i + n) / SR
    print(f'{salida}: {len(trozo[0]) / SR:.2f} s, {medido:.1f} LUFS, peak {np.max(np.abs(trozo)):.3f}, '
          f'loop {inicio:.6f}-{fin:.6f} s, ring join step {np.max(paso[:, -1]):.4f} '
          f'(median {np.median(paso):.4f}, p99.9 {np.percentile(paso, 99.9):.4f}), {os.path.getsize(salida) / 1e3:.0f} kB')
    return inicio, fin


def exportar_una_vez(componer, acordes, bpm, duracion, auto, salida, mezcla=None, bateria_db=None, final_db=-4.0,
                     cola=3.0, rt=1.4, fundido=1.5, objetivo=OBJETIVO, kbps=80):
    """A piece heard once: the score on a ring with `cola` s of silence for the tails, cut to `duracion` s with a
    fade-out of `fundido` s at the end (the last chord dies away, it is never cut)."""
    with tema(bpm, acordes, mezcla, bateria_db):
        P = componer()
        n = int((duracion + cola) * SR)
        x = mezclar(P, n, auto, final=final_db, rt_sala=rt)
    nm = int(round(duracion * SR))
    x = x[:, :nm]
    x = x - x.mean(axis=1, keepdims=True)
    k = int(fundido * SR)
    x[:, -k:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k)))
    g = db(-19.0) / np.sqrt(np.mean(x ** 2))
    y, medido = C._normalizar(x, g, objetivo, salida, kbps)
    print(f'{salida}: {nm / SR:.2f} s, {medido:.1f} LUFS, peak {np.max(np.abs(y)):.3f}, {os.path.getsize(salida) / 1e3:.0f} kB')
    return y


# =================================================================================================================
# solTeatro
# =================================================================================================================

BPM_TEATRO = 84
BARRAS_TEATRO = 24

AC_TE_A = [['C#m'], ['C#m', 'D'], ['C#m'], ['Bmaj7', 'G#7sus4'], ['C#m'], ['C#m', 'D'], ['Amaj7', 'Bmaj7'], ['G#7sus4', 'G#7']]
AC_TE_B = [['F#m7'], ['Dmaj7'], ['E', 'G#m7'], ['A', 'G#7'], ['F#m7'], ['Dmaj7', 'Bmaj7'], ['C#m7', 'F#m7'], ['G#7sus4', 'G#7']]
AC_TE_C = [['C#m'], ['Amaj7'], ['F#m7'], ['Dmaj7'], ['Bmaj7', 'G#m7'], ['E', 'A'], ['F#m7', 'D'], ['G#7sus4', 'G#7']]
ACORDES_TEATRO = AC_TE_A + AC_TE_B + AC_TE_C

# The tunes (C# minor, with the D of the Neapolitan in A). Every long note on a beat is a tone of its chord.
MEL_TE_A = melodia('G#5:6 E5:2 C#5:8 | E5:4 G#5:4 F#5:4 A5:4 | C#6:8 G#5:4 E5:4 | D#6:6 B5:2 G#5:4 F#5:4 |'
                   '-:2 E5:2 G#5:4 C#6:8 | E6:4 C#6:4 D6:4 A5:4 | E6:6 C#6:2 F#6:4 D#6:4 | C#6:4 D#6:4 C6:6 D#6:2')
MEL_TE_B = melodia('A5:6 C#6:2 E6:8 | F#6:6 E6:2 D6:8 | B5:4 G#5:4 B5:4 D#6:4 | C#6:4 E6:4 C6:4 D#6:4 |'
                   'A5:6 C#6:2 F#6:8 | A5:4 F#5:4 D#6:4 B5:4 | E6:6 B5:2 C#6:4 A5:4 | D#6:8 C6:4 D#6:4')
MEL_TE_C = melodia('G#5:8 E5:8 | E5:8 C#5:8 | C#5:8 A4:8 | A4:8 F#4:8 | B4:8 D#5:8 | E5:8 C#5:8 | A4:8 D5:8 | D#5:8 C5:8')

BAJO_TE_A = 'r...............'
BAJO_TE_B = 'R.....R.R.....F.'
BAJO_TE_C = 'r.......r.......'

MEZCLA_TEATRO = dict(flauta=(-0.2, -23.5, 0.5, 0.2), gota=(-0.55, -35.0, 0.55, 0.2), cuerdasI=(-0.8, -28.0, 0.45, 0.0),
                     cuerdasD=(0.8, -28.0, 0.45, 0.0), bajo=(0.0, -25.0, 0.1, 0.0), pizz=(0.5, -30.0, 0.3, 0.0))
AUTO_TEATRO = [-3.0] * 8 + [-0.5] * 8 + [-1.5] + [-2.0] * 6 + [-3.0]
AUTO_INTRO_TEATRO = [-5.0, AUTO_TEATRO[23]]


def componer_teatro():
    """The 24 bars of the round -> a Partitura (beats count from the start of the round; a bar is 4)."""
    P = Partitura()
    pad_voces(P, 0, ACORDES_TEATRO, [38] * 8 + [46] * 8 + [52] * 8)
    P.nota('bat', 0.0, 1, 'plato', 60)
    # ---- A (bars 1-8) «el telón»: a detuned music box over an organ pedal, strings and a draught
    voces(P, 'organo', AC_TE_A, 36, 'C3', 'F4', n=3, reg='suave')
    pedal(P, 'organo', AC_TE_A, 44, reg='suave')
    notas_de(P, 'cajita', MEL_TE_A, 0, 70, des=1.0)
    for c in range(8):
        bajo_compas(P, c, BAJO_TE_A, -6 if c < 4 else -2)
        bateria(P, c, {'tom4': 'x.......o.......', 'rim': '....o.......o...'}, -30)
    # ---- B (bars 9-16) «la tramoya»: a harpsichord ticking in 3+3+2 like a mechanism, a flute-stop organ tune
    notas_de(P, 'organo', MEL_TE_B, 32, 74, dur=0.96, reg='flauta')
    notas_de(P, 'cajita', MEL_TE_B, 32, 46, dur=0.9, des=0.8)
    pedal(P, 'organo', AC_TE_B, 40, b0=32.0, reg='suave')
    for c in range(8, 16):
        arpegio(P, c, 'tresytres', 58, 'C4', 'C6', 'clave')
        bajo_compas(P, c, BAJO_TE_B, 0)
        bateria(P, c, {'tom4': 'x.......x.......', 'rim': 'x.x.x.x.x.x.x.x.', 'charles': '....o.......o...'}, -34)
        if c % 4 == 0:
            P.nota('bat', c * L, 0.5, 'plato', 62)
    # ---- C (bars 17-24) «la platea vacía»: a full organ chorale, a flute going down the steps, music-box arpeggios
    voces(P, 'organo', AC_TE_C, 48, 'C3', 'E5', n=4, b0=64.0, reg='pleno')
    pedal(P, 'organo', AC_TE_C, 50, b0=64.0, reg='pleno')
    notas_de(P, 'flauta', MEL_TE_C, 64, 78, dur=0.97, acento=4, vib=1)
    for c in range(16, 22):
        arpegio(P, c, 'corcheas', 44, 'C5', 'C7', 'cajita', baja=True, des=0.55)
        bajo_compas(P, c, BAJO_TE_C, 0)
        bateria(P, c, {'tom4': 'x.......x.......', 'rim': '....o.......o...'}, -32)
    for c, v in ((22, 50), (23, 60)):                                    # the last two bars: the harpsichord runs up into the start
        arpegio(P, c, 'semis', v, 'C4', 'C6', 'clave')
        bajo_compas(P, c, BAJO_TE_C, 2)
    P.nota('bat', 22 * L, 1, 'plato', 66)
    tambores(P, 23 * L + 2.0, ('tom4', 'tom3', 'tom2', 'tom1'), 56, 84, 0.5)
    # ---- the theatre itself: dust, draughts and wood, never on a pattern
    polvo(P, 7, 14, 0, 96)
    for b, d, v in ((4.0, 9.0, 70), (38.0, 8.0, 66), (70.0, 7.0, 72), (88.0, 9.5, 64)):
        P.nota('viento', b, d, 0, v)
    for b, d, v in ((21.5, 0.5, 70), (57.0, 0.6, 62), (83.0, 0.5, 66)):
        P.nota('tramoya', b, d, 0, v, tipo='crujido')
    for b, v in ((29.0, 64), (71.0, 58), (93.5, 52)):
        P.nota('tramoya', b, 0.5, 0, v, tipo='golpe')
    P.nota('tramoya', 49.0, 1.6, 0, 56, tipo='cuerda')
    return P


def intro_teatro(P):
    """The intro (2 bars): the curtain's draught and creak, a pedal and one detuned note, and then the loop's last bar."""
    I = Partitura()
    I.nota('viento', 0.0, 6.5, 0, 72)
    I.nota('tramoya', 1.0, 0.7, 0, 72, tipo='crujido')
    I.nota('tramoya', 3.0, 1.2, 0, 56, tipo='cuerda')
    I.nota('organo', 0.0, 4.2, midi('C#2'), 44, reg='suave')
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (49, 56, 61, 64), 34, lado=pista[-1])
    I.nota('cajita', 2.5, 0.5, midi('G#5'), 62, des=1.0)
    I.nota('cajita', 3.25, 0.5, midi('E5'), 56, des=1.0)
    I.anadir(P.trozo(23 * L, 24 * L, 1 * L))
    return I


def exportar_teatro(salida):
    with tema(BPM_TEATRO, ACORDES_TEATRO, MEZCLA_TEATRO, bateria_db=-31.0):
        P = componer_teatro()
        I = intro_teatro(P)
        inicio, fin = exportar_bucle(P, I, BPM_TEATRO, BARRAS_TEATRO, 2, AUTO_TEATRO, AUTO_INTRO_TEATRO, salida, rt=1.9)
    print(f"  musica.ts: {{ url: solTeatro, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")
    return inicio, fin


# =================================================================================================================
# solJefe
# =================================================================================================================

BPM_JEFE = 144
BARRAS_JEFE = 36

AC_JE_A = [['Bm'], ['Bm', 'C'], ['Bm'], ['G', 'F#7sus4'], ['Bm'], ['Bm', 'C'], ['G', 'A'], ['F#7sus4', 'F#7']]
AC_JE_B = [['G'], ['D', 'A'], ['Bm', 'Gmaj7'], ['F#7sus4', 'F#7'], ['G'], ['D', 'Em7'], ['Bm', 'A'], ['F#7sus4', 'F#7']]
AC_JE_C = [['Em'], ['Cmaj7'], ['Bm', 'G'], ['F#7'], ['Em'], ['Cmaj7', 'C#dim'], ['Bm', 'D'], ['F#7sus4', 'F#7']]
AC_JE_D = [['G'], ['D', 'A'], ['Bm', 'Gmaj7'], ['Gm', 'F#7'], ['G'], ['D', 'Em7'], ['Bm', 'A'], ['Gmaj7', 'F#7']]
AC_JE_E = [['Bm'], ['Bm', 'C'], ['G', 'A'], ['F#7sus4', 'F#7']]
ACORDES_JEFE = AC_JE_A + AC_JE_B + AC_JE_C + AC_JE_D + AC_JE_E

# The tunes (B minor; the chorus lifts to G / D major). On every beat a long note is a tone of its chord.
MEL_JE_A = melodia('F#5:6 D5:2 B4:8 | D5:4 F#5:4 E5:4 G5:4 | B5:6 F#5:2 D5:8 | G5:4 B5:4 C#6:4 B5:4 |'
                   'F#5:6 D5:2 B4:4 D5:4 | D6:4 B5:4 C6:4 G5:4 | B5:4 D6:4 C#6:4 E6:4 | B5:4 C#6:4 A#5:6 F#5:2')
MEL_JE_B = melodia('D6:8 B5:4 G5:4 | F#5:4 A5:4 C#6:4 E6:4 | F#6:6 D6:2 B5:4 G5:4 | B5:4 C#6:4 A#5:8 |'
                   'B5:4 D6:4 G6:8 | F#6:6 A6:2 G6:4 E6:4 | D6:4 F#6:4 E6:4 C#6:4 | B5:4 C#6:4 A#5:4 F#5:4')
MEL_JE_C = melodia('B5:4 G5:4 E5:4 G5:4 | E6:6 D6:2 C6:4 B5:4 | D6:4 F#6:4 G6:4 D6:4 | C#6:4 E6:4 F#6:4 A#5:4 |'
                   'G6:6 F#6:2 E6:8 | C6:4 E6:4 C#6:4 G6:4 | F#6:4 B6:4 A6:4 F#6:4 | E6:4 C#6:4 A#5:8')
MEL_JE_D = melodia('D6:8 B5:4 G5:4 | F#5:4 A5:4 C#6:4 E6:4 | F#6:6 D6:2 B5:4 G5:4 | A#5:4 D6:4 C#6:4 A#5:4 |'
                   'B5:4 D6:4 G6:8 | F#6:6 A6:2 G6:4 E6:4 | D6:4 F#6:4 E6:4 C#6:4 | B5:4 D6:4 C#6:4 A#5:4')
MEL_JE_E = melodia('B5:4 D6:4 F#6:8 | D6:4 F#6:4 E6:4 G6:4 | B5:4 D6:4 C#6:4 E6:4 | B5:4 C#6:4 A#5:8')

BAJO_JE_A = ['R.RgR.RgR.RgR.OR', 'R.RgR.RgR.RgRFSF']
BAJO_JE_B = ['R.R.O.R.R.R.O.F.', 'R.R.O.R.R.R.O.S.']
BAJO_JE_C = 'R.......R.....g.'
BAJO_JE_FILL = 'RRgRRRgRRRgRRRgR'
RIFF_JE_A = 'X.xxX.x.X.xxX.xx'
KICK_JE_A = ['x.x...x.x.x.....', 'x.x...x.x.x.x.x.']

MEZCLA_JEFE = dict(lead=(0.12, -24.0, 0.2, 0.14), bajo=(0.0, -21.5, 0.03, 0.0), sub=(0.0, -24.0, 0.0, 0.0), organo=(-0.1, -24.5, 0.3, 0.0),
                   coro=(0.0, -24.0, 0.4, 0.0), timbal=(0.0, -24.0, 0.3, 0.0), guitarra=(-0.2, -25.0, 0.1, 0.0))
AUTO_JEFE = [-1.0] * 8 + [0.5] * 8 + [-2.5] * 8 + [1.0] * 8 + [-0.5, -0.5, 0.0, 1.0]
AUTO_INTRO_JEFE = [0.5, AUTO_JEFE[35]]


def organo_16(P, compas, vel, desde, hasta, pista='organo', reg='tocata', gate=0.17):
    """Running sixteenths over the bar's chord (the organ's toccata): up and down its tones."""
    for k in range(16):
        b = compas * L + k / 4
        ts = S.tonos(S.ch_en(b), desde, hasta)
        P.nota(pista, b, gate, ts[(0, 1, 2, 3, 4, 5, 4, 3)[k % 8] % len(ts)], vel + (10 if k % 4 == 0 else 0), reg=reg)


def canta(P, mel, b0, vel, vocal='a', baja=12, **opc):
    """The choir sings a tune (each note with its octave below), the notes on a beat a little firmer."""
    for b, d, m, _ in mel:
        P.nota('coro', b0 + b, d * 0.96, (m - baja, m), vel + (4 if b % 1 == 0 else 0), vocal=vocal, **opc)


def componer_jefe():
    """The 36 bars of the round -> a Partitura."""
    P = Partitura()
    A, B, Cc, D, E = 0, 32.0, 64.0, 96.0, 128.0
    pad_voces(P, 0, ACORDES_JEFE, [54] * 8 + [76] * 8 + [58] * 8 + [80] * 8 + [70, 80, 92, 104])
    P.nota('bat', 0.0, 1, 'crash', 108)
    # ---- A (bars 1-8) the narrator: the pulse lead and an oboe on the tune, the organ's toccata, a chugging riff, a
    # 16th-note bass, a rock kit; the choir comes in humming from bar 5, a brass chord at the end of each phrase
    notas_de(P, 'lead', MEL_JE_A, A, 100, duty=0.25, vib=1)
    for b, d, m, _ in MEL_JE_A:
        P.nota('oboe', A + b, d * 0.9, armonia_debajo(m, S.ch_en(A + b)), 58)
    for c in range(8):
        organo_16(P, c, 58 if c < 4 else 66, 'B2', 'F#4')
        guitarra_compas(P, c, RIFF_JE_A, 80)
        bajo_compas(P, c, BAJO_JE_FILL if c == 7 else BAJO_JE_A[c % 2], 0)
        bateria(P, c, {'bombo': KICK_JE_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, -4)
    voces(P, 'coroI', AC_JE_A[4:], 52, 'B3', 'F#5', n=3, b0=4 * L, vocal='o')
    voces(P, 'coroD', AC_JE_A[4:], 52, 'B3', 'F#5', n=3, b0=4 * L, vocal='o')
    for c, notas in ((3, ('G3', 'B3', 'D4', 'G4')), (7, ('F#3', 'B3', 'C#4', 'F#4'))):
        for m in notas:
            P.nota('metal', c * L + 3.0, 0.9, midi(m), 98)
    tambores(P, 3 * L + 3.0, ('tom1', 'tom2'), 84, 96, 0.5)
    tambores(P, 7 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 88, 112)
    # ---- B (bars 9-16) the chorus: the choir sings the tune, brass and pulse lead in unison, full organ chords, open power
    # chords, double bass drum, a low sine under the bass
    P.nota('bat', B, 1, 'crash', 112)
    P.nota('tamtam', B, 4, 0, 96)
    canta(P, MEL_JE_B, B, 96)
    for b, d, m, _ in MEL_JE_B:
        P.nota('metal', B + b, d * 0.92, m - 12, 90)
        P.nota('lead', B + b, d * 0.92, m, 70, duty=0.5, vib=1 if d >= 2 else 0)
    voces(P, 'organo', AC_JE_B, 66, 'D3', 'D5', n=4, b0=B, reg='pleno')
    pedal(P, 'organo', AC_JE_B, 60, b0=B, reg='pleno')
    pedal(P, 'sub', AC_JE_B, 80, lo=28, b0=B)
    voces(P, 'coroI', AC_JE_B, 56, 'B3', 'F#5', n=3, b0=B, vocal='a')
    voces(P, 'coroD', AC_JE_B, 56, 'B3', 'F#5', n=3, b0=B, vocal='a')
    for c in range(8, 16):
        guitarra_compas(P, c, 'X.......X.xxX.xx' if c % 2 == 0 else 'X.......X.......', 82)
        bajo_compas(P, c, BAJO_JE_FILL if c == 15 else BAJO_JE_B[c % 2], 6)
        bateria(P, c, {'bombo': 'x.xxx..xx.xxx..x', 'caja': '....X.......X...', 'charles': 'x.x.x.x.x.x.x.x.',
                       'abierto': '..o...o...o...o.'}, 0)
        if c in (8, 12):
            P.nota('bat', c * L, 1, 'crash', 106)
    redoble(P, 15 * L + 1.0, 3.0, 54, 118, 'caja')
    tambores(P, 15 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    # ---- C (bars 17-24) the bridge: half-time. The organ's solo over a bass pedal, a music box ticking in 3+3+2, a choir
    # whispering, muted chugs; kettledrums rolling into the last chorus
    P.nota('bat', Cc, 1, 'crash', 92)
    notas_de(P, 'organo', MEL_JE_C, Cc, 88, dur=0.95, acento=4, reg='pleno')
    for c in range(16, 24):
        arpegio(P, c, 'tresytres', 52, 'C5', 'C7', 'cajita', des=0.6)
        bajo_compas(P, c, BAJO_JE_FILL if c == 23 else BAJO_JE_C, 2)
        bateria(P, c, {'bombo': 'x.......x.x.....', 'caja': '........X.......', 'charles': 'o...o...o...o...'}, -6)
        guitarra_compas(P, c, 'X.x.....X.x.....', 70)
        if c % 2 == 0:
            P.nota('bat', c * L, 0.5, 'plato', 70)
    voces(P, 'coroI', AC_JE_C, 44, 'B3', 'F#5', n=3, b0=Cc, vocal='u')
    voces(P, 'coroD', AC_JE_C, 44, 'B3', 'F#5', n=3, b0=Cc, vocal='u')
    pedal(P, 'sub', AC_JE_C, 70, lo=28, b0=Cc)
    redoble(P, 23 * L + 1.0, 3.0, 52, 112, 'caja')
    for k in range(24):
        P.nota('timbal', 23 * L + 1.0 + k * 0.125, 0.125, midi('F#2'), 56 + int(56 * k / 23 / 4) * 4)
    # ---- D (bars 25-32) the last chorus: everything, with a trumpet on the tune, the choir higher, the toccata underneath
    P.nota('bat', D, 1, 'crash', 114)
    P.nota('tamtam', D, 4, 0, 100)
    canta(P, MEL_JE_D, D, 100)
    for b, d, m, _ in MEL_JE_D:
        P.nota('metal', D + b, d * 0.92, m - 12, 92)
        P.nota('trompeta', D + b, d * 0.92, m, 78)
        P.nota('lead', D + b, d * 0.92, m, 72, duty=0.5, vib=1 if d >= 2 else 0)
        P.nota('oboe', D + b, d * 0.9, armonia_debajo(m, S.ch_en(D + b)), 60)
    voces(P, 'organo', AC_JE_D, 68, 'D3', 'D5', n=4, b0=D, reg='pleno')
    pedal(P, 'organo', AC_JE_D, 62, b0=D, reg='pleno')
    pedal(P, 'sub', AC_JE_D, 84, lo=28, b0=D)
    voces(P, 'coroI', AC_JE_D, 60, 'D4', 'A5', n=3, b0=D, vocal='a')
    voces(P, 'coroD', AC_JE_D, 60, 'D4', 'A5', n=3, b0=D, vocal='a')
    for c in range(24, 32):
        organo_16(P, c, 46, 'B2', 'F#4', gate=0.12)
        guitarra_compas(P, c, 'X.......X.xxX.xx' if c % 2 == 0 else 'X.x.....X.......', 84)
        bajo_compas(P, c, BAJO_JE_FILL if c == 31 else BAJO_JE_B[c % 2], 8)
        bateria(P, c, {'bombo': 'x.xxx..xx.xxx..x', 'caja': '....X.......X..x', 'charles': 'x.x.x.x.x.x.x.x.',
                       'abierto': '..o...o...o...o.'}, 2)
        if c in (24, 28):
            P.nota('bat', c * L, 1, 'crash', 108)
    for m in ('G3', 'D4', 'G4', 'B4'):
        P.nota('metal', 27 * L + 3.0, 0.9, midi(m), 100)
    tambores(P, 27 * L + 3.0, ('tom1', 'tom2'), 90, 100, 0.5)
    redoble(P, 31 * L + 1.0, 3.0, 54, 120, 'caja')
    tambores(P, 31 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    # ---- E (bars 33-36) the build back: everything in unison, a riser and a snare roll, the last bar's fill
    for b, d, m, _ in MEL_JE_E:
        f = 70 + int(30 * b / 16)
        P.nota('coro', E + b, d * 0.96, (m - 12, m), f, vocal='a')
        P.nota('lead', E + b, d * 0.92, m, f, duty=0.5, vib=1 if d >= 2 else 0)
        P.nota('metal', E + b, d * 0.92, m - 12, f + 8)
        P.nota('trompeta', E + b, d * 0.92, m, f - 4)
    for c in range(32, 36):
        organo_16(P, c, 54 + 6 * (c - 32), 'B2', 'F#4', gate=0.14)
        guitarra_compas(P, c, 'X.xxX.xxX.xxX.xx', 84)
        bajo_compas(P, c, BAJO_JE_FILL if c >= 34 else BAJO_JE_A[c % 2], 6)
        if c < 34:
            bateria(P, c, {'bombo': KICK_JE_A[c % 2], 'caja': '....X.......X...', 'charles': 'xoxoxoxoxoxoxoxo'}, 2)
    P.nota('subida', 34 * L, 8.0, 0, 90)
    redoble(P, 34 * L + 2.0, 6.0, 50, 124, 'caja')
    P.nota('bat', 35 * L, 0.25, 'bombo', 110)
    P.nota('bat', 35 * L + 2.0, 0.25, 'bombo', 112)
    tambores(P, 35 * L + 3.0, ('tom1', 'tom2', 'tom3', 'tom4'), 100, 124, 0.25)
    return P


def intro_jefe(P):
    """The intro (2 bars): a great organ chord with a tam-tam and a bass drum, the choir swelling, a snare run, then the
    loop's last bar (the fill)."""
    I = Partitura()
    I.nota('bat', 0.0, 1, 'crash', 112)
    I.nota('bat', 0.0, 0.25, 'bombo', 112)
    I.nota('tamtam', 0.0, 4, 0, 100)
    I.nota('organo', 0.0, 3.5, tuple(midi(x) for x in ('B2', 'F#3', 'B3', 'D4', 'F#4', 'B4')), 100, reg='pleno')
    I.nota('organo', 0.0, 3.5, midi('B1'), 90, reg='pleno')
    for m in ('B3', 'D4', 'F#4', 'B4'):
        I.nota('metal', 0.0, 1.5, midi(m), 102)
    for pista in ('cuerdasI', 'cuerdasD'):
        I.nota(pista, 0.0, 4.15, (47, 54, 59, 62), 76, lado=pista[-1])
    I.nota('coro', 0.0, 3.5, (midi('B3'), midi('F#4'), midi('B4')), 70, vocal='o')
    I.nota('bat', 2.0, 0.25, 'bombo', 100)
    redoble(I, 2.0, 2.0, 50, 100, 'caja')
    I.anadir(P.trozo(35 * L, 36 * L, 1 * L))
    return I


def exportar_jefe(salida):
    with tema(BPM_JEFE, ACORDES_JEFE, MEZCLA_JEFE):
        P = componer_jefe()
        I = intro_jefe(P)
        inicio, fin = exportar_bucle(P, I, BPM_JEFE, BARRAS_JEFE, 2, AUTO_JEFE, AUTO_INTRO_JEFE, salida, rt=1.2)
    print(f"  musica.ts: {{ url: solJefe, entrada: 0, inicio: {inicio:.6f}, fin: {fin:.6f} }}")
    return inicio, fin


# =================================================================================================================
# solCalderon
# =================================================================================================================

BPM_CALDERON = 120
DUR_CALDERON = 22.0
GOLPE_BEAT = 32.0                    # the final strike falls on beat 32 of 120 bpm: bar 9, exactly 16.000 s into the file

AC_CALDERON = [['D'], ['Bm', 'Em7'], ['A7', 'D'], ['G', 'Em7'], ['A7', 'Bm'], ['G', 'D'], ['Em7', 'A7'], ['A', 'A7'],
               ['D'], ['G', 'D'], ['D']]

# The choir's tune climbs from A4 to A6 in seven bars; the trumpets answer from bar 5 in dotted rhythms; after the strike
# they say it again, and the choir holds a last line over the chord. Every long note on a beat is a tone of its chord.
MEL_CAL_CORO = melodia('A4:16 | D5:8 E5:8 | E5:8 F#5:8 | G5:8 B5:8 | A5:8 B5:8 | D6:8 F#6:8 | G6:8 A6:8 | E6:8 A6:5 -:3')
MEL_CAL_FIN = melodia('A5:16 | B5:8 A5:8 | D6:16')
MEL_CAL_TROMPETAS = melodia('A4:3 C#5:1 E5:4 D5:3 F#5:1 B4:4 | B4:3 D5:1 G5:4 F#5:3 A5:1 D6:4 | '
                            'G5:3 B5:1 E6:4 A5:3 C#6:1 E6:4 | A5:3 C#6:1 E6:4 A6:5 -:3')
MEL_CAL_TROMPETAS_FIN = melodia('D5:3 F#5:1 A5:4 D6:8 | B5:3 D6:1 G5:4 F#5:3 A5:1 D6:4 | D6:12 -:4')

MEZCLA_CALDERON = dict(tamtam=(0.0, -23.0, 0.5, 0.0), timbal=(0.0, -23.0, 0.35, 0.0), organo=(-0.1, -25.0, 0.4, 0.0),
                       trompeta=(0.0, -26.0, 0.35, 0.0), coro=(0.0, -24.0, 0.5, 0.0), sub=(0.0, -25.0, 0.0, 0.0),
                       subida=(0.0, -30.0, 0.4, 0.0), viento=(0.0, -34.0, 0.6, 0.0), campana=(0.5, -30.0, 0.5, 0.2),
                       arpa=(-0.45, -27.0, 0.4, 0.25))
AUTO_CALDERON = [-7.0, -6.0, -5.5, -4.5, -3.5, -2.5, -2.0, -1.5, 3.5, 1.0, -1.0]


def componer_calderon():
    """The 11 bars (22 s) -> a Partitura: a hush of strings, a hummed choir and bells; the tune climbing over kettledrums, a
    harp and a growing organ; the trumpets; a snare roll and a riser into half a beat of silence; the strike on beat 32."""
    P = Partitura()
    G = GOLPE_BEAT
    pad_voces(P, 0, AC_CALDERON, [36, 44, 54, 60, 70, 78, 88, 100, 112, 92, 72])
    for pista in ('cuerdasI', 'cuerdasD'):                      # the strings stop short of the strike: a half beat of hush
        for e in P.ev[pista]:
            if 28.0 <= e['b'] < G:
                e['d'] = min(e['d'], 31.0 - e['b'])
    # ---- bars 1-2: the hush. Hummed choir, a draught of wind, bells, a kettledrum heartbeat, the harp in the second bar
    voces(P, 'coroI', AC_CALDERON[:2], [30, 38], 'D4', 'A5', n=3, vocal='u')
    voces(P, 'coroD', AC_CALDERON[:2], [30, 38], 'D4', 'A5', n=3, vocal='u')
    P.nota('viento', 0.0, 6.0, 0, 50)
    polvo(P, 3, 11, 0, 12, desde='C6', hasta='G7', vel=(40, 62), pista='campana')
    P.nota('timbal', 6.0, 0.5, midi('D2'), 44)
    P.nota('timbal', 7.0, 0.5, midi('D2'), 40)
    arpa_compas(P, 1, 'corcheas', 50, desde='D4', hasta='D6')
    # ---- bars 3-8: the choir's tune over a growing organ, a sine under it, kettledrums that quicken
    for b, d, m, _ in MEL_CAL_CORO:
        v = int(54 + 52 * min(1.0, b / 31.0))
        tono = (m - 12, m, m + 12) if m <= 72 else (m - 12, m)
        P.nota('coro', b + 0.0, d * 0.97, tono, v, vocal='a')
    voces(P, 'organo', AC_CALDERON[2:4], 40, 'D3', 'A4', n=3, b0=8.0, reg='suave')
    voces(P, 'organo', AC_CALDERON[4:7], [60, 72, 84], 'D3', 'D5', n=4, b0=16.0, reg='pleno')
    P.nota('organo', 28.0, 1.7, tuple(midi(x) for x in ('A2', 'E3', 'A3', 'C#4', 'E4')), 96, reg='pleno')
    P.nota('organo', 30.0, 1.1, tuple(midi(x) for x in ('A2', 'E3', 'A3', 'C#4', 'G4')), 100, reg='pleno')
    pedal(P, 'sub', AC_CALDERON[2:7], [50, 56, 62, 70, 80], lo=28, b0=8.0)
    pedal(P, 'sub', [['A']], [86], lo=28, b0=28.0, extra=-0.7)
    for c in range(2, 8):
        arpa_compas(P, c, 'semis' if c >= 6 else 'corcheas' if c < 4 else 'tresytres', 54 + 5 * c, desde='C4', hasta='C6')
    for b, d, m, _ in MEL_CAL_TROMPETAS:
        P.nota('trompeta', 16.0 + b, d * 0.9, m, 82 + int(24 * b / 16), )
    for k, (b, n) in enumerate(((8.0, 'D2'), (10.0, 'A2'), (12.0, 'D2'), (14.0, 'A2'))):
        P.nota('timbal', b, 1.0, midi(n), 56 + 4 * k)
    for k in range(8):
        P.nota('timbal', 16.0 + k, 0.5, midi('D2' if k % 2 == 0 else 'A2'), 68 + 3 * k)
    for k in range(8):
        P.nota('timbal', 24.0 + k * 0.5, 0.25, midi('D2' if k % 2 == 0 else 'A2'), 84 + 2 * k)
    for k in range(26):                                          # the roll on A2, 32nds, ending almost a beat before the strike
        P.nota('timbal', 28.0 + k * 0.125, 0.1, midi('A2'), 60 + int(56 * k / 25 / 4) * 4)
    redoble(P, 26.0, 5.2, 40, 118, 'caja')
    P.nota('subida', 24.0, 7.2, 0, 100)
    P.nota('bat', 16.0, 0.5, 'plato', 74)
    P.nota('bat', 24.0, 0.5, 'plato', 84)
    polvo(P, 5, 14, 8, 28, desde='C6', hasta='G7', vel=(48, 76), pista='campana')
    # ---- the strike, on beat 32 (16.000 s): kettledrums, bass drum, tam-tam, cymbals, the full organ, brass, a trumpet
    # fanfare, the choir blooming a hair after it, bells and a glissando on the harp
    P.nota('tamtam', G, 4, 0, 122)
    P.nota('bat', G, 2, 'crash', 124)
    P.nota('bat', G, 1, 'plato', 112)
    P.nota('bat', G, 1, 'bombo_banda', 126)
    P.nota('bat', G, 0.25, 'bombo', 122)
    P.nota('bat', G, 0.5, 'tom4', 120)
    for n, v in (('D2', 126), ('A2', 118), ('D3', 104)):
        P.nota('timbal', G, 1.5, midi(n), v)
    P.nota('organo', G, 10.0, tuple(midi(x) for x in ('D2', 'D3', 'A3', 'D4', 'F#4', 'A4', 'D5')), 112, reg='pleno')
    P.nota('sub', G, 6.0, midi('D2'), 100)
    for m in ('D3', 'A3', 'D4', 'F#4', 'A4'):
        P.nota('metal', G, 3.0, midi(m), 112)
    for b, d, m, _ in MEL_CAL_TROMPETAS_FIN:
        P.nota('trompeta', G + b, d * 0.9, m, 112)
    for b, d, m, _ in MEL_CAL_FIN:
        tono = (m - 12, m, m + 12) if m <= 72 else (m - 12, m)
        P.nota('coro', G + b, d * 0.98, tono, 100, vocal='a')
    for pista in ('coroI', 'coroD'):
        P.nota(pista, G - 0.25, 11.5, tuple(midi(x) for x in ('D4', 'A4', 'D5', 'F#5')), 96, vocal='a')
    for m, dt, v in (('D6', 0.0, 100), ('A6', 0.05, 92), ('F#7', 0.1, 84), ('D7', 0.15, 90)):
        P.nota('campana', G + dt, 0.5, midi(m), v)
    for k, m in enumerate([x for x in range(midi('D3'), midi('D7') + 1) if x % 12 in (2, 6, 9)]):
        P.nota('arpa', G + 0.1 + k * 0.07, 0.5, m, 66 + k)
    P.nota('bat', G + 8.0, 0.25, 'tom4', 40)
    polvo(P, 9, 12, G + 3, G + 11, desde='C6', hasta='G7', vel=(44, 70), pista='campana')
    return P


def exportar_calderon(salida):
    y = exportar_una_vez(componer_calderon, AC_CALDERON, BPM_CALDERON, DUR_CALDERON, AUTO_CALDERON, salida,
                         mezcla=MEZCLA_CALDERON, bateria_db=-22.0, final_db=-3.0, rt=1.8, fundido=2.0)
    print(f"  musica.ts: {{ url: solCalderon, inicio: 0, fin: {DUR_CALDERON:.1f} }}   (the final strike falls at {GOLPE_BEAT * 60 / BPM_CALDERON:.3f} s)")
    return y


# =================================================================================================================
# solFinal
# =================================================================================================================

BPM_FINAL = 72
DUR_FINAL = 78.0

# 22 bars. 1-4 the dream (Calderón's line on a music box that is out of tune), 5-12 the waking tune, 13-16 the village's own
# tune (sol.py's solPueblo, bars 1-4 of the A tune verbatim, with its chords), 17-20 the same tune with D dorian turned into
# D major (the dream becomes day), 21-22 the cadence and the last chord.
AC_FINAL = ([['Dadd9'], ['Bm7'], ['Gmaj7'], ['A', 'A7']]
            + [['D'], ['F#m7'], ['Gmaj7'], ['A'], ['D'], ['Bm7'], ['Em7'], ['A7sus4', 'A7']]
            + [list(c) for c in S.ACORDES_A[:4]]
            + [['D'], ['G6'], ['Bm7'], ['Asus4', 'A7']]
            + [['Gmaj7', 'A7sus4'], ['Dadd9']])

# «La vida es sueño, y los sueños, sueños son»: our own setting of the words, stepwise like a lullaby, the second line
# stopping on a question that the waking tune answers.
MEL_FI_CITA = melodia('F#5:4 A5:2 F#5:2 E5:4 D5:4 | D5:12 B4:4 | D5:4 B4:2 D5:2 F#5:4 D5:4 | E5:8 C#5:8')
MEL_FI_DESPIERTA = melodia('A4:6 D5:2 F#5:8 | E5:6 C#5:2 A4:8 | B4:4 D5:4 G5:8 | E5:6 C#5:2 A4:4 C#5:4 |'
                           'D5:4 F#5:4 A5:8 | B5:6 A5:2 F#5:4 D5:4 | G5:6 E5:2 B4:4 E5:4 | E5:4 D5:4 C#5:4 E5:4')
MEL_FI_PUEBLO = [x for x in S.MEL_A if x[0] < 16]
MEL_FI_DIA = melodia('A4:3 D5:3 E5:2 F#5:6 E5:2 | D5:3 G5:3 E5:2 D5:4 B4:4 | F#5:3 B5:3 A5:2 F#5:6 D5:2 | E5:3 A5:3 G5:2 E5:4 C#5:4')
MEL_FI_CODA = melodia('D5:6 B4:2 E5:4 G5:4')

MEZCLA_FINAL = dict(flauta=(-0.15, -23.5, 0.45, 0.15), cajita=(0.45, -28.0, 0.5, 0.3), bajo=(0.0, -26.0, 0.08, 0.0),
                    cuerdasI=(-0.8, -27.0, 0.45, 0.0), cuerdasD=(0.8, -27.0, 0.45, 0.0), arpa=(-0.45, -26.0, 0.4, 0.25),
                    coroI=(-0.75, -29.0, 0.55, 0.0), coroD=(0.75, -29.0, 0.55, 0.0), organo=(-0.1, -28.0, 0.45, 0.0),
                    campana=(0.5, -30.0, 0.5, 0.3), viento=(0.0, -35.0, 0.6, 0.0))
AUTO_FINAL = [-7.0, -6.5, -6.0, -5.5] + [-4.0, -3.5, -3.0, -2.5, -2.5, -2.0, -2.0, -1.5] + [-3.0, -3.0, -3.0, -2.5] \
    + [-2.0, -1.5, -1.0, -0.5] + [-2.0, -2.5]


def componer_final():
    """The 22 bars (73.3 s) and the last chord (to 78 s) -> a Partitura."""
    P = Partitura()
    pad_voces(P, 0, AC_FINAL[:21], [30, 34, 38, 42] + [50, 52, 54, 56, 58, 60, 62, 64] + [52, 52, 54, 56]
              + [62, 66, 70, 74, 78])
    # ---- 1-4 the dream: Calderón's line on a music box that comes slowly into tune, a soft pedal, a draught, dust
    for (b, d, m, _), des in zip(MEL_FI_CITA, [1.0] * 5 + [0.85] * 2 + [0.7] * 5 + [0.5] * 2):
        P.nota('cajita', b, d * 0.95, m, 66 + (6 if b % 1 == 0 else 0), des=des, tau=0.7)
    P.nota('organo', 0.0, 15.5, midi('D2'), 24, reg='suave')
    P.nota('viento', 0.0, 10.0, 0, 44)
    polvo(P, 2, 7, 0, 16, desde='C6', hasta='G7', vel=(36, 54), pista='campana')
    arpa_compas(P, 3, 'corcheas', 44, desde='D4', hasta='D6')
    # ---- 5-12 the waking tune: a flute over a harp, a pedal and soft chords, a choir humming from bar 9, a light pulse
    notas_de(P, 'flauta', MEL_FI_DESPIERTA, 16.0, 84, dur=0.95, acento=4, vib=1)
    voces(P, 'organo', AC_FINAL[4:12], 38, 'D3', 'A4', n=3, b0=16.0, reg='suave')
    for c in range(4, 12):
        arpa_compas(P, c, 'corcheas', 50, desde='D3' if c < 8 else 'C4', hasta='D6')
        if c >= 8:
            bajo_compas(P, c, 'r.......r.......', -8)
            bateria(P, c, {'rim': '....o.......o...', 'charles': 'o...o...o...o...'}, -34)
    voces(P, 'coroI', AC_FINAL[8:12], 42, 'D4', 'A5', n=3, b0=32.0, vocal='u')
    voces(P, 'coroD', AC_FINAL[8:12], 42, 'D4', 'A5', n=3, b0=32.0, vocal='u')
    notas_de(P, 'cajita', MEL_FI_DESPIERTA, 16.0, 40, dur=0.9, des=0.0, tau=0.7)
    # ---- 13-16 the village's tune, as solPueblo plays it (a flute over a harp in eighths, a picked bass), but slow,
    # on a music box in tune that the flute follows
    notas_de(P, 'cajita', MEL_FI_PUEBLO, 48.0, 72, dur=0.9, des=0.0, tau=0.8)
    notas_de(P, 'flauta', MEL_FI_PUEBLO, 48.0, 60, dur=0.94, acento=6, vib=1)
    for c in range(12, 16):
        arpa_compas(P, c, 'corcheas', 52)
        bajo_compas(P, c, 'R..g.O..R..gF.O.' if c % 2 == 0 else 'R..g.O.gR..gF.S.', -9)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'charles': 'o.x.o.x.o.x.o.x.', 'rim': '....x.......x...'}, -36)
    # ---- 17-20 the same tune, brightened: D dorian becomes D major (F, B flat -> F sharp, B), a third voice, bells, a choir
    notas_de(P, 'flauta', MEL_FI_DIA, 64.0, 84, dur=0.95, acento=4, vib=1)
    for b, d, m, _ in MEL_FI_DIA:
        P.nota('oboe', 64.0 + b, d * 0.9, armonia_debajo(m, S.ch_en(64.0 + b)), 52)
        P.nota('cajita', 64.0 + b, d * 0.9, m + 12, 48, des=0.0, tau=0.8)
    for c in range(16, 20):
        arpa_compas(P, c, 'corcheas', 56)
        arpa_compas(P, c, 'corcheas', 40, desde='C6', hasta='C7', pista='campana')
        bajo_compas(P, c, 'R..g.O..R..gF.O.' if c % 2 == 0 else 'R..g.O.gR..gF.S.', -6)
        bateria(P, c, {'bombo': 'x.....x...x.....', 'charles': 'o.x.o.x.o.x.o.x.', 'rim': '....x.......x...'}, -32)
    voces(P, 'coroI', AC_FINAL[16:20], [44, 50, 56, 62], 'D4', 'A5', n=3, b0=64.0, vocal='a')
    voces(P, 'coroD', AC_FINAL[16:20], [44, 50, 56, 62], 'D4', 'A5', n=3, b0=64.0, vocal='a')
    voces(P, 'organo', AC_FINAL[16:20], 42, 'D3', 'A4', n=3, b0=64.0, reg='suave')
    P.nota('bat', 64.0, 1.0, 'plato', 56)
    # ---- 21-22 the cadence, and the last chord: Calderón's line once more, in tune, over a chord that fades away
    notas_de(P, 'flauta', MEL_FI_CODA, 80.0, 80, dur=0.95, acento=4, vib=1)
    for b, d, m, _ in MEL_FI_CITA[:5]:
        P.nota('cajita', 84.0 + b, d * 0.95, m, 70, des=0.0, tau=0.9)
    voces(P, 'organo', AC_FINAL[20:21], 44, 'D3', 'A4', n=3, b0=80.0, reg='suave')
    acorde = tuple(midi(x) for x in ('D3', 'A3', 'D4', 'E4', 'F#4'))
    for pista in ('cuerdasI', 'cuerdasD'):
        P.nota(pista, 84.0, 9.0, acorde, 78, lado=pista[-1])
    P.nota('organo', 84.0, 9.0, tuple(midi(x) for x in ('D2', 'A2', 'D3', 'F#3', 'A3')), 46, reg='suave')
    for pista in ('coroI', 'coroD'):
        P.nota(pista, 84.0, 9.0, tuple(midi(x) for x in ('A3', 'D4', 'F#4', 'E5')), 54, vocal='u')
    for k, m in enumerate([x for x in range(midi('D3'), midi('D6') + 1) if x % 12 in (2, 4, 6, 9)]):
        P.nota('arpa', 84.0 + 0.1 + k * 0.12, 0.5, m, 50 + k)
    P.nota('campana', 88.0, 0.5, midi('D6'), 56)
    P.nota('campana', 88.12, 0.5, midi('A6'), 44)
    return P


def exportar_final(salida):
    y = exportar_una_vez(componer_final, AC_FINAL, BPM_FINAL, DUR_FINAL, AUTO_FINAL, salida, mezcla=MEZCLA_FINAL,
                         bateria_db=-34.0, final_db=-3.0, rt=2.0, fundido=4.0)
    print(f"  musica.ts: {{ url: solFinal, inicio: 0, fin: {DUR_FINAL:.1f} }}")
    return y


# =================================================================================================================
# The effects (mono, short): built like sol_combate's, from noise, sines and the bell of sol.py
# =================================================================================================================

def _campana(nota, tau, vel=100, razon=3.5, indice=1.3):
    return sintetizar('campana', nota, 0.1, vel, razon=razon, indice=indice, tau=tau)


def _bandas(rng, nm, centros, ancho=1.45, orden=2):
    """One noise split into narrow bands (a list of arrays), to sweep a whoosh by fading them in turn."""
    r = rng.standard_normal(nm)
    return [eq(r, ('hp', fc / ancho, orden), ('lp', fc * ancho, orden), circ=False) for fc in centros]


def efecto_hielo(salida):
    """A puddle freezing into a column of ice (0.9 s): water that shivers in a few slowing bubbles, a hiss of cold air, glassy
    bells climbing faster and faster as the crystals grow, a crackle that thickens and thins, and the clink and thud of
    the finished column."""
    nm = int(0.9 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(61)
    out = np.zeros(nm)
    # the water: bubbles rising in pitch, slower and fainter as it sets
    t0 = 0.0
    k = 0
    while t0 < 0.4:
        n1 = int(0.03 * SR)
        tt = tiempo(n1)
        f = 450 * (2.6 + 0.4 * rng.random()) ** (tt / 0.03)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.03) ** 2
        _sumar(out, int(t0 * SR), w, 0.34 * (1 - t0 / 0.5))
        t0 += 0.03 + 0.012 * k
        k += 1
    agua = ruido_ba(rng, nm, 300, 2600) * np.exp(-t / 0.1) * np.minimum(1, t / 0.01)
    out += 0.16 * agua
    # the cold: a hiss that opens
    u = np.clip((t - 0.08) / 0.55, 0, 1)
    out += 0.16 * ruido_ba(rng, nm, 6000, 12000) * np.sin(np.pi * np.clip((t - 0.08) / 0.62, 0, 1)) ** 1.6
    # the crystals: bells climbing a whole-tone-and-fifths ladder, quickening
    escala = (81, 83, 86, 88, 90, 93, 95, 98, 100, 102)
    t1, i = 0.12, 0
    while t1 < 0.66:
        _sumar(out, int(t1 * SR), _campana(escala[min(i, len(escala) - 1)], 0.1 + 0.03 * i, 70 + 3 * i, 3.9, 1.0), 0.34)
        t1 += 0.075 - 0.045 * (t1 / 0.66)
        i += 1
    # the ice cracking: clicks whose rate climbs to 260 a second at 0.4 s and thins away to 0.8 s
    tasa = 40 + 220 * np.exp(-0.5 * ((t - 0.4) / 0.14) ** 2)
    clics = (rng.random(nm) < tasa / SR) * rng.uniform(0.25, 1.0, nm) * (t > 0.15)
    kk = np.arange(110)
    crepita = np.convolve(clics, np.exp(-kk / 28) * np.sin(2 * np.pi * 4200 * kk / SR))[:nm]
    out += 0.7 * crepita
    # the finished column: a crack, a clink and a low thud
    tc = 0.62
    n3 = int(0.3 * SR)
    tt = tiempo(n3)
    golpe = np.sin(2 * np.pi * np.cumsum(150 * np.exp(-tt / 0.03) + 70) / SR) * np.exp(-tt / 0.07)
    grieta = ruido_ba(rng, n3, 1800, 9000) * np.exp(-tt / 0.012)
    _sumar(out, int(tc * SR), 0.9 * golpe + 0.7 * grieta)
    for nota, dt, a in (('D7', 0.0, 0.5), ('A7', 0.015, 0.4), ('F#7', 0.035, 0.34)):
        _sumar(out, int((tc + dt) * SR), _campana(midi(nota), 0.16, 100, 3.9, 0.8), a)
    out = lineal(out, rt=0.4, mezcla=0.16)[:nm]
    out[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR)) ** 1.5
    a_mp3(_cierre(_limitar(out, 1.2)), salida, 0.8)


def efecto_viento(salida):
    """The cierzo blowing out candles (1 s): a cold gust that sweeps up through the bands of the noise and falls back, a thin
    whistle riding it, and three little puffs of breath on the way down, each with the quick tick of a wick going out."""
    nm = int(1.0 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(67)
    centros = (260, 450, 780, 1300, 2100, 3300)
    bandas = _bandas(rng, nm, centros)
    out = np.zeros(nm)
    for j, b in enumerate(bandas):
        pico = 0.12 + 0.3 * j / (len(centros) - 1)                       # the gust peaks later in the higher bands
        ancho = 0.1 + 0.03 * j
        env = np.exp(-0.5 * ((t - pico) / ancho) ** 2) * (1.0 + 0.3 * np.sin(2 * np.pi * (3.0 + j) * t + j))
        out += b * env * (3.0, 2.2, 1.6, 1.2, 0.9, 0.8)[j]
    out += 0.12 * np.exp(-t / 0.3) * eq(rng.standard_normal(nm), ('hp', 120, 2), ('lp', 700, 2), circ=False)     # the draught under the puffs
    silbo = np.sin(2 * np.pi * np.cumsum(520 + 360 * np.exp(-0.5 * ((t - 0.3) / 0.15) ** 2) + 18 * np.sin(2 * np.pi * 7 * t)) / SR)
    out += 0.04 * silbo * np.exp(-0.5 * ((t - 0.3) / 0.16) ** 2)
    for tp, a in ((0.5, 1.0), (0.64, 0.85), (0.77, 0.7)):                 # the candles
        n1 = int(0.1 * SR)
        tt = tiempo(n1)
        soplo = ruido_ba(rng, n1, 1400, 6500) * np.sin(np.pi * np.clip(tt / 0.09, 0, 1)) ** 1.3
        tic = ruido_ba(rng, n1, 2500, 9000) * np.exp(-tt / 0.004) * (tt > 0.03)
        pum = np.sin(2 * np.pi * 95 * tt) * np.exp(-tt / 0.02)
        _sumar(out, int(tp * SR), a * (1.1 * soplo + 0.8 * tic + 0.35 * pum))
    out *= np.minimum(1, t / 0.04) * np.minimum(1, (1.0 - t) / 0.2)
    out = lineal(out, rt=0.3, mezcla=0.1)[:nm]
    a_mp3(_cierre(out), salida, 0.75)


def efecto_roca(salida):
    """A rock of papier-mâché lifted or let fall (0.6 s): the rustle and creak of cardboard straining, then a hollow
    «boink» that bounces twice, each landing followed by the crinkle of paper settling."""
    nm = int(0.6 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(71)
    out = np.zeros(nm)
    # the strain: paper rustling (clicks in bursts) and a short wooden creak underneath
    clics = (rng.random(nm) < (260 * np.minimum(1, t / 0.1) * (t < 0.24)) / SR) * rng.uniform(0.3, 1.0, nm)
    kk = np.arange(220)
    arruga = np.convolve(clics, ruido_ba(rng, 220, 1500, 7000) * np.exp(-kk / 55))[:nm]
    out += 0.9 * arruga
    n1 = int(0.22 * SR)
    out[:n1] += 0.28 * _crujido(rng, 0.22, 190, 260, tm=0.7)
    # the landings: a hollow thump (a pitch that drops, a box resonance, a pat of air), each lighter than the last
    for tl, a in ((0.25, 1.0), (0.375, 0.5), (0.455, 0.22)):
        n2 = int(0.15 * SR)
        tt = tiempo(n2)
        golpe = np.sin(2 * np.pi * np.cumsum(70 + 110 * np.exp(-tt / 0.03)) / SR) * np.exp(-tt / 0.06)
        caja = np.sin(2 * np.pi * 262 * tt) * np.exp(-tt / 0.045) + 0.5 * np.sin(2 * np.pi * 410 * tt) * np.exp(-tt / 0.03)
        pat = ruido_ba(rng, n2, 300, 2200) * np.exp(-tt / 0.012)
        _sumar(out, int(tl * SR), a * (1.0 * golpe + 0.45 * caja + 0.8 * pat))
        k2 = (rng.random(nm) < (150 * np.exp(-np.maximum(0, t - tl) / 0.05) * (t >= tl)) / SR) * rng.uniform(0.3, 1.0, nm)
        out += 0.5 * a * np.convolve(k2, ruido_ba(rng, 220, 1500, 7000) * np.exp(-kk / 45))[:nm]
    out = lineal(out, rt=0.22, mezcla=0.1)[:nm]
    out[-int(0.12 * SR):] *= np.linspace(1, 0, int(0.12 * SR))
    a_mp3(_cierre(_limitar(out, 1.3)), salida, 0.8)


def efecto_puzle(salida):
    """The tinkle of a puzzle solved (1.2 s): a wooden click as the piece locks, three quick pairs of bells climbing in
    thirds, and then a bright chord (D major with its ninth) with a swirl of sparkles and a soft pulse tone, ringing out."""
    nm = int(1.2 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(73)
    out = np.zeros(nm)
    n0 = int(0.05 * SR)
    t0 = tiempo(n0)
    clic = (np.sin(2 * np.pi * 760 * t0) * 0.6 + ruido_ba(rng, n0, 900, 5000)) * np.exp(-t0 / 0.006)
    out[:n0] += 0.6 * clic
    pares = (('A5', 'D6'), ('B5', 'F#6'), ('D6', 'A6'))
    for i, (a, b) in enumerate(pares):
        ti = 0.07 + i * 0.12
        _sumar(out, int(ti * SR), _campana(midi(a), 0.2, 84 + 6 * i, 3.5, 1.4), 0.5)
        _sumar(out, int((ti + 0.055) * SR), _campana(midi(b), 0.22, 96 + 6 * i, 3.5, 1.4), 0.5)
    tc = 0.46
    for nota, dt, a, tau in (('D6', 0.0, 0.55, 0.5), ('F#6', 0.02, 0.45, 0.5), ('A6', 0.04, 0.45, 0.5), ('E7', 0.06, 0.4, 0.45),
                             ('D7', 0.09, 0.4, 0.4), ('A5', 0.0, 0.4, 0.5), ('D5', 0.0, 0.35, 0.55)):
        _sumar(out, int((tc + dt) * SR), _campana(midi(nota), tau, 100, 3.5, 1.2), a)
    # a soft tone under the chord, and a swirl of sparkles falling away from it
    n1 = int(0.5 * SR)
    t1 = tiempo(n1)
    for nota, a in (('D5', 0.22), ('A5', 0.16)):
        f = np.full(n1, float(hz(midi(nota))))
        w = (pulso(f, 0.5) + 0.3 * pulso(f, 0.125)) * np.minimum(1, t1 / 0.006) * np.exp(-t1 / 0.22)
        _sumar(out, int(tc * SR), eq(w, ('lp', 4200, 2), circ=False), a)
    for i in range(16):
        ti = tc + 0.05 + i * 0.03 + rng.uniform(0, 0.02)
        nota = int(rng.choice((88, 90, 93, 95, 97, 100, 102, 105)))
        _sumar(out, int(ti * SR), _campana(nota, 0.1 + 0.01 * i, 56 + int(rng.integers(0, 26)), 2.0, 1.0), 0.28 * (1 - i / 22))
    out = lineal(out, rt=0.5, mezcla=0.2)[:nm]
    out[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR)) ** 1.5
    a_mp3(_cierre(out), salida, 0.78)


def efecto_chat(salida):
    """The bubble of a message that appears as Pablo reads a mind (0.3 s): a drop of water that swells up into a bubble and
    pops, a smaller one after it a little higher, and a tiny bell sparkle that says it was somebody's thought."""
    nm = int(0.3 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(79)
    out = np.zeros(nm)
    for tb, f0, f1, dur, a in ((0.0, 520, 1250, 0.07, 1.0), (0.085, 760, 1800, 0.055, 0.6)):
        n1 = int(dur * SR)
        tt = tiempo(n1)
        u = tt / dur
        f = f0 * (f1 / f0) ** (u ** 0.8)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.clip(u, 0, 1) ** 0.6) ** 1.2
        w = w + 0.3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * np.exp(-tt / (dur * 0.4))
        pop = ruido_ba(rng, n1, 1500, 7000) * np.exp(-tt / 0.003) * (u > 0.85)
        _sumar(out, int(tb * SR), a * (w + 0.5 * pop))
    _sumar(out, int(0.13 * SR), _campana(midi('E7'), 0.07, 90, 3.0, 0.8), 0.32)
    _sumar(out, int(0.16 * SR), _campana(midi('B7'), 0.05, 80, 3.0, 0.8), 0.2)
    out = lineal(out, rt=0.2, mezcla=0.12)[:nm]
    out[-int(0.1 * SR):] *= np.linspace(1, 0, int(0.1 * SR)) ** 1.3
    a_mp3(_cierre(out), salida, 0.55)


def efecto_telon(salida):
    """A velvet curtain drawn open (1.2 s): a rope creaking through its pulley, the rings running along the rod (ticks that
    quicken and then slow), the heavy cloth swishing, and the soft thud and sigh of the folds bunching at the wings."""
    nm = int(1.2 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(83)
    out = np.zeros(nm)
    n0 = int(0.2 * SR)
    out[:n0] += 0.45 * _crujido(rng, 0.2, 280, 360, tm=0.6)
    # the cloth: a swell of dark noise, with a breath of high rustle at its crest
    u = np.clip((t - 0.05) / 1.0, 0, 1)
    env = np.sin(np.pi * u) ** 1.4
    tela = ruido_ba(rng, nm, 150, 1700) * env
    seda = ruido_ba(rng, nm, 2200, 6500) * env ** 2.5 * 0.35
    rumor = eq(rng.standard_normal(nm), ('hp', 50, 2), ('lp', 190, 2), circ=False) * env * 1.2
    out += 0.9 * tela + seda + 0.6 * rumor
    # the rings: ticks of metal on metal, their rate rising from 10 to 50 a second and falling back
    tasa = 10 + 40 * np.exp(-0.5 * ((t - 0.45) / 0.22) ** 2)
    anillos = (rng.random(nm) < tasa / SR) * rng.uniform(0.35, 1.0, nm) * (t > 0.08) * (t < 1.0)
    kk = np.arange(180)
    tic = np.exp(-kk / 22) * (np.sin(2 * np.pi * 3100 * kk / SR) + 0.5 * np.sin(2 * np.pi * 4700 * kk / SR))
    out += 0.55 * np.convolve(anillos, tic)[:nm]
    # the folds arrive: a soft thud and a sigh
    n3 = int(0.25 * SR)
    tt = tiempo(n3)
    golpe = np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-tt / 0.04)) / SR) * np.exp(-tt / 0.07)
    suspiro = ruido_ba(rng, n3, 200, 1600) * np.sin(np.pi * np.clip(tt / 0.25, 0, 1)) ** 2
    _sumar(out, int(0.95 * SR), 0.7 * golpe + 0.35 * suspiro)
    out = lineal(out, rt=0.4, mezcla=0.12)[:nm]
    out *= np.minimum(1, t / 0.01)
    out[-int(0.2 * SR):] *= np.linspace(1, 0, int(0.2 * SR)) ** 1.4
    a_mp3(_cierre(_limitar(out, 1.1)), salida, 0.72)


def efecto_transforma(salida):
    """The boss changing phase (1.5 s): a dark cluster of saws that climbs and shakes with a tritone growing in it, a
    swirl of noise, a rip at 1.05 s and a deep boom with a metal ring, and a growl that sinks away under the room."""
    nm = int(1.5 * SR)
    t = tiempo(nm)
    rng = np.random.default_rng(89)
    tc = 1.05
    ue = np.clip(t / tc, 0, 1)
    pre = np.where(t < tc, 1.0, np.exp(-(t - tc) / 0.02))
    f = 70 * 7.0 ** (ue ** 1.6) * (1 + 0.02 * ue * np.sin(2 * np.pi * np.cumsum(4 + 20 * ue ** 2) / SR))
    voz = sierra(f, 0.0) + sierra(f * 1.007, 0.3) + (0.35 + 0.9 * ue) * sierra(f * 1.4142, 0.6) + 0.6 * sierra(f * 0.5, 0.1)
    voz = eq(voz, ('hp', 50, 2), ('lp', 900, 2), circ=False) * (1 - ue ** 2) + eq(voz, ('hp', 150, 2), ('lp', 6000, 2), circ=False) * ue ** 2
    voz = voz * (0.15 + 0.85 * ue ** 0.9) * pre * 0.5
    remolino = np.zeros(nm)
    ruido = rng.standard_normal(nm)
    for k, fc in enumerate((300, 700, 1500, 3200)):
        banda = eq(ruido, ('hp', fc / 1.5, 2), ('lp', fc * 1.5, 2), circ=False)
        remolino += banda * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(2.5 + 14 * ue) / SR + k * np.pi / 2))
    remolino *= ue ** 1.5 * pre * 0.5
    out = voz + remolino
    # the rip and the boom
    n3 = int(0.45 * SR)
    tt = tiempo(n3)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 100 * np.exp(-tt / 0.06)) / SR) * np.exp(-tt / 0.22)
    rasga = ruido_ba(rng, n3, 800, 9000) * np.exp(-tt / 0.07)
    anillo = sum(a * np.sin(2 * np.pi * fr * tt + rng.random() * 6.28) * np.exp(-tt / tau)
                 for fr, a, tau in ((230, .5, .3), (340, .4, .25), (590, .35, .2), (910, .3, .15), (1420, .25, .12), (2230, .2, .1)))
    _sumar(out, int(tc * SR), 1.5 * boom + 0.9 * rasga + 0.45 * anillo)
    # a growl sinking away after it
    n4 = nm - int((tc + 0.02) * SR)
    t4 = tiempo(n4)
    gruno = sierra(np.maximum(30, 110 * np.exp(-t4 / 0.25)), 0.0) * np.exp(-t4 / 0.18)
    _sumar(out, int((tc + 0.02) * SR), 0.5 * eq(gruno, ('lp', 500, 2), circ=False))
    out = lineal(out, rt=0.5, mezcla=0.18)[:nm]
    out[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR)) ** 1.5
    a_mp3(_cierre(_limitar(out, 1.4)), salida, 0.85)


EFECTOS = (('sol-hielo', efecto_hielo), ('sol-viento', efecto_viento), ('sol-roca', efecto_roca),
           ('sol-puzle', efecto_puzle), ('sol-chat', efecto_chat), ('sol-telon', efecto_telon),
           ('sol-transforma', efecto_transforma))


def efectos(carpeta):
    os.makedirs(carpeta, exist_ok=True)
    for nombre, f in EFECTOS:
        f(os.path.join(carpeta, nombre + '.mp3'))


# --- Checks ---------------------------------------------------------------------------------------------------------------------

def revisar():
    """Every melody note that starts on a beat, lasts a beat or more and is not a tone of its chord (a few are meant:
    passing tones, a dominant's third)."""
    trabajos = (
        (ACORDES_TEATRO, BPM_TEATRO, (('teatro A', MEL_TE_A, 0), ('teatro B', MEL_TE_B, 8), ('teatro C', MEL_TE_C, 16))),
        (ACORDES_JEFE, BPM_JEFE, (('jefe A', MEL_JE_A, 0), ('jefe B', MEL_JE_B, 8), ('jefe C', MEL_JE_C, 16),
                                  ('jefe D', MEL_JE_D, 24), ('jefe E', MEL_JE_E, 32))),
        (AC_CALDERON, BPM_CALDERON, (('calderon coro', MEL_CAL_CORO, 0), ('calderon trompetas', MEL_CAL_TROMPETAS, 4),
                                     ('calderon coro fin', MEL_CAL_FIN, 8), ('calderon trompetas fin', MEL_CAL_TROMPETAS_FIN, 8))),
        (AC_FINAL, BPM_FINAL, (('final cita', MEL_FI_CITA, 0), ('final despierta', MEL_FI_DESPIERTA, 4),
                               ('final pueblo', MEL_FI_PUEBLO, 12), ('final dia', MEL_FI_DIA, 16), ('final coda', MEL_FI_CODA, 20))))
    for acordes, bpm, partes in trabajos:
        with tema(bpm, acordes):
            for nombre, mel, c0 in partes:
                for b, d, m, _ in mel:
                    ch = S.ch_en(c0 * L + b)
                    if b % 1 == 0 and d >= 1 and m % 12 not in acorde_pcs(ch):
                        print(f'  {nombre}: bar {c0 + int(b // L) + 1} beat {b % L + 1:.0f}: {m} over {ch}')
    print('listed')


LOOPS = (('sol-teatro', BPM_TEATRO, BARRAS_TEATRO, 2), ('sol-jefe', BPM_JEFE, BARRAS_JEFE, 2))
UNA_VEZ = (('sol-calderon', DUR_CALDERON), ('sol-final', DUR_FINAL))


def analisis(carpeta):
    """The decoded MP3: the loops' seams, levels per second (against solPueblo), bands; the pieces heard once (length, level,
    ending, where the strike falls); the effects (length, level, whether the end is cut)."""
    ar = 24000
    pueblo = os.path.join(carpeta, 'sol-pueblo.mp3')
    ref = None
    if os.path.exists(pueblo):
        xp = decodificar(pueblo, ar)
        i0, i1 = int(round(S.N_INTRO / SR * ar)), int(round((S.N_INTRO + S.N) / SR * ar))
        ref = 20 * np.log10(np.sqrt(np.mean(xp[:, i0:i1] ** 2)))
        print(f'sol-pueblo.mp3 (reference): loop rms {ref:.1f} dBFS, {medir(pueblo):.1f} LUFS')
    bandas = [(30, 150), (150, 500), (500, 2000), (2000, 5000), (5000, 12000)]
    for nombre, bpm, barras, intro in LOOPS:
        ruta = os.path.join(carpeta, nombre + '.mp3')
        x = decodificar(ruta, ar)
        inicio, fin = muestras_barras(bpm, intro) / SR, muestras_barras(bpm, intro + barras) / SR
        i0, i1 = int(round(inicio * ar)), int(round(fin * ar))
        print(f'{nombre}.mp3: {x.shape[1] / ar:.2f} s decoded, peak {np.max(np.abs(x)):.3f}, loop {inicio:.4f}-{fin:.4f} ({fin - inicio:.2f} s), {medir(ruta):.1f} LUFS')
        paso = np.median(np.abs(np.diff(x[:, i0:i0 + ar * 20], axis=1)))
        salto = np.max(np.abs(x[:, i1 - 1] - x[:, i0]))
        print(f'  jump back from fin to inicio: {salto:.4f} (median step {paso:.4f}; 99.9th percentile '
              f'{np.percentile(np.abs(np.diff(x[:, i0:i1], axis=1)), 99.9):.4f}; the steps of the whole loop never exceed {np.max(np.abs(np.diff(x[:, i0:i1], axis=1))):.4f})')
        k = int(S.MARGEN * ar)
        a, b = x[:, i1:i1 + k], x[:, i0:i0 + k]
        n = min(a.shape[1], b.shape[1])
        dif = 20 * np.log10(np.sqrt(np.mean((a[:, :n] - b[:, :n]) ** 2)) / np.sqrt(np.mean(b[:, :n] ** 2)))
        print(f'  the {S.MARGEN} s after fin against the {S.MARGEN} s after inicio: {dif:.1f} dB below the signal (mp3 noise only)')
        ti = int(round(inicio * ar))
        print(f'  the join intro -> loop: step {np.max(np.abs(x[:, ti] - x[:, ti - 1])):.4f}, rms of the last 0.5 s of the intro '
              f'{20 * np.log10(np.sqrt(np.mean(x[:, :i0][:, -ar // 2:] ** 2))):.1f} dBFS')
        mono = x.mean(axis=0)
        v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + ar] ** 2)) + 1e-9) for i in range(0, len(mono) - ar, ar)]
        print('  dB per second:', ' '.join(f'{d:.0f}' for d in v))
        rms = 20 * np.log10(np.sqrt(np.mean(x[:, i0:i1] ** 2)))
        print(f'  loop: rms {rms:.1f} dBFS' + (f' ({rms - ref:+.1f} dB against solPueblo)' if ref is not None else '')
              + f'; loudest second {max(v):.0f}, quietest in the loop {min(v[int(inicio):int(fin)]):.0f}')
        sp = np.abs(np.fft.rfft(mono[i0:i1])) ** 2
        fr = np.fft.rfftfreq(i1 - i0, 1 / ar)
        tot = sp.sum()
        print('  energy by band (Hz): ' + ', '.join(f'{lo}-{hi}: {10 * np.log10(sp[(fr >= lo) & (fr < hi)].sum() / tot):.1f} dB' for lo, hi in bandas))
    for nombre, esperado in UNA_VEZ:
        ruta = os.path.join(carpeta, nombre + '.mp3')
        x = decodificar(ruta, ar)
        mono = x.mean(axis=0)
        n = ar // 2
        v = [20 * np.log10(np.sqrt(np.mean(mono[i:i + n] ** 2)) + 1e-9) for i in range(0, len(mono) - n, n)]
        rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)))
        print(f'{nombre}.mp3: {x.shape[1] / ar:.2f} s (made for {esperado}), peak {np.max(np.abs(x)):.3f}, {medir(ruta):.1f} LUFS, '
              f'rms {rms:.1f} dBFS' + (f' ({rms - ref:+.1f} against solPueblo)' if ref is not None else '')
              + f', last 50 ms {20 * np.log10(np.sqrt(np.mean(mono[-ar // 20:] ** 2)) + 1e-9):.0f} dBFS')
        print('  dB per half second:', ' '.join(f'{d:.0f}' for d in v))
        if nombre == 'sol-calderon':
            n2 = int(0.02 * ar)
            w = np.array([np.sqrt(np.mean(mono[i:i + n2] ** 2)) for i in range(0, len(mono) - n2, n2)])
            d = np.diff(20 * np.log10(w + 1e-9))
            k = int(np.argmax(d))
            print(f'  the strike: the largest rise in 20 ms of rms is {d[k]:.1f} dB at {(k + 1) * n2 / ar:.3f} s '
                  f'(made for {GOLPE_BEAT * 60 / BPM_CALDERON:.3f} s); the highest peak is at {np.argmax(np.abs(mono)) / ar:.3f} s')
    for nombre, f in EFECTOS:
        e = decodificar(os.path.join(carpeta, nombre + '.mp3'), ar).mean(axis=0)
        n10 = max(1, ar // 100)
        v = [20 * np.log10(np.sqrt(np.mean(e[i:i + n10] ** 2)) + 1e-9) for i in range(0, len(e) - n10, n10 * 5)]
        print(f'{nombre}.mp3: {len(e) / ar * 1000:.0f} ms, peak {np.max(np.abs(e)):.2f}, rms {20 * np.log10(np.sqrt(np.mean(e ** 2))):.1f} dBFS, '
              f'last 20 ms {20 * np.log10(np.sqrt(np.mean(e[-ar // 50:] ** 2)) + 1e-9):.0f} dBFS')
        print('    dB per 10 ms every 50 ms:', ' '.join(f'{d:.0f}' for d in v))


PISTAS = {'teatro': (exportar_teatro, 'sol-teatro.mp3'), 'jefe': (exportar_jefe, 'sol-jefe.mp3'),
          'calderon': (exportar_calderon, 'sol-calderon.mp3'), 'final': (exportar_final, 'sol-final.mp3')}

if __name__ == '__main__':
    modos = ('teatro', 'jefe', 'calderon', 'final', 'efectos', 'analisis', 'revisar')
    modo = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in modos else 'todo'
    resto = sys.argv[2:] if modo != 'todo' else sys.argv[1:]
    carpeta = resto[0] if resto else '../../src/sonido'
    if modo == 'revisar':
        revisar()
    elif modo in PISTAS and carpeta.endswith('.mp3'):
        PISTAS[modo][0](carpeta)
    else:
        os.makedirs(carpeta, exist_ok=True)
        for clave, (exportar, archivo) in PISTAS.items():
            if modo in ('todo', clave):
                exportar(os.path.join(carpeta, archivo))
        if modo in ('todo', 'efectos'):
            efectos(carpeta)
        if modo == 'analisis':
            analisis(carpeta)
