# The slot machine after the chant (chapter 2): once the four have sung «Camiones y caravanas» in the bar, the
# machine plays the tune. Same two shots as tragaperras.py (and the same clocks: tragaperras.ts follows the
# music's, so the stops, the jackpot and the length of each file are the same), but every reel that stops
# plays the next note of «Ca-mio-neees» in the machine's own voice (a square-wave chiptune with a little
# bell on top), and the jackpot plays the rest: «y ca-ra-va-naaas», over the bells and the coins.
# The tune is the chant's (canto.py): D minor «Ca-mio» (D D), «neees» on G, «y ca-ra-va» on A (the last
# note of it, C#, leaning on the tonic) and «naaas» home on D. Pure synthesis (metales.py), no SoundFont.
#
#   tragaperras-sin-camiones.mp3      the reels rattle and stop on «Ca» (1.0 s), «mio» (1.7 s) and «neees» (2.4 s),
#                                      held up in the air, and the soft «nothing this time» after it
#   tragaperras-premio-camiones.mp3   «Ca» and «mio» the same, «neees» at 2.4 s, and then «y ca-ra-va-naaas» with
#                                      the bells and the coins until 6.4 s
# PARADAS, PREMIO_EN and LLUVIA are the same as in tragaperras.py and src/ui/tragaperras.ts: change all three.
# The files are as long as the originals (the last half second is silence: the bit the game loops).
#
#   python3 tragaperras_cantada.py [carpeta]     -> the two MP3 in `carpeta` (the game's copy: ../../src/sonido)
import os
import sys
import numpy as np
from metales import Mezcla, a_mp3, env
from sinte import SR, hz, midi, campana
from tragaperras import PARADAS, PREMIO_EN, LLUVIA

# «Ca-mio-neees-y-ca-ra-va-naaas»: the note of each syllable.
CA, MIO, NEES, Y, CA2, RA, VA, NAAAS = 'D5', 'D5', 'G5', 'A5', 'A5', 'A5', 'C#6', 'D6'


def chip(m, t, nota, dur, vol=0.22, vibrato=0.0):
    """The machine's voice: an odd-harmonic square wave (a chiptune pulse, band-limited) with a quick bell on top."""
    nm = int((dur + 0.35) * SR)
    tt = np.arange(nm) / SR
    f0 = hz(midi(nota))
    f = f0 * (1 + vibrato * np.sin(2 * np.pi * 6.0 * np.maximum(0, tt - 0.12)) * np.minimum(1, tt / 0.3))
    fase = 2 * np.pi * np.cumsum(f) / SR
    cuadrada = sum(np.sin(k * fase) / k for k in range(1, 12, 2) if k * f0 < 9000) * 0.8
    cuerpo = cuadrada * env(nm, 0.004, max(0.09, dur * 0.7), fin=0.12)
    campanita = campana(np.full(nm, f0 * 2), razon=3.5, indice=1.2, tau=0.22) * env(nm, 0.002, 0.28)
    m.poner(t, cuerpo + 0.45 * campanita, vol, reverb=0.3)


def frase_inicio(m, neees):
    """«Ca» and «mio» on the first two stops; `neees` is how long the third is held."""
    chip(m, PARADAS[0], CA, 0.28)
    chip(m, PARADAS[1], MIO, 0.28)
    chip(m, PARADAS[2], NEES, neees, vibrato=0.006)


def sin_premio(salida):
    m = Mezcla(4.7)
    # The rattle as ever, the clunks softer so that the notes lead.
    for i, (a, b) in enumerate(zip([0.0] + PARADAS[:-1], PARADAS)):
        m.rodillos(a, b, vol=0.5 - 0.09 * i, paso=0.045 + 0.012 * i)
    for p in PARADAS:
        m.para(p, 0.18)
    frase_inicio(m, 0.9)
    # «Neees»... and nothing: two soft falling notes after it, as in the plain spin.
    m.nota_dulce(PARADAS[2] + 1.0, 'E5', 0.12, tau=0.3)
    m.nota_dulce(PARADAS[2] + 1.3, 'C5', 0.12, tau=0.45)
    a_mp3(m.sonido(rt=1.0), salida, pico=0.8)


def premio(salida):
    m = Mezcla(PREMIO_EN + LLUVIA + 1.6)
    for i, (a, b) in enumerate(zip([0.0] + PARADAS[:-1], PARADAS)):
        m.rodillos(a, b, vol=0.5 - 0.09 * i, paso=0.045 + 0.012 * i)
    for p in PARADAS:
        m.para(p, 0.18)
    frase_inicio(m, 0.55)
    # «y ca-ra-va-naaas»: quick, like the chant, and the last one long, with a D major chord and the bells.
    t = PREMIO_EN + 0.6
    for nota in (Y, CA2, RA, VA):
        chip(m, t, nota, 0.17)
        t += 0.2
    chip(m, t, NAAAS, 1.6, vol=0.26, vibrato=0.006)
    for nota in ('D5', 'F#5', 'A5'):
        chip(m, t, nota, 1.4, vol=0.08)
    m.campanas(t, 0.18)
    m.campanas(t + 0.8, 0.12)
    m.monedas(PREMIO_EN, LLUVIA, 0.16, semilla=5)
    m.monedas(PREMIO_EN + 0.4, LLUVIA - 0.8, 0.1, semilla=6)
    a_mp3(m.sonido(rt=1.4), salida, pico=0.8)


if __name__ == '__main__':
    carpeta = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(carpeta, exist_ok=True)
    sin_premio(os.path.join(carpeta, 'tragaperras-sin-camiones.mp3'))
    premio(os.path.join(carpeta, 'tragaperras-premio-camiones.mp3'))
