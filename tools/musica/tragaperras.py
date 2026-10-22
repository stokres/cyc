# The slot machine close-up of chapter 2 (src/ui/tragaperras.ts): the reels spinning, stopping one by
# one, and the bells and coins of the jackpot. Pure synthesis (metales.py, on the voices of the
# trailer's slot machine: rodillos, para, campanas, monedas), no SoundFont.
#
# Two sounds, MP3 at 24 kHz and 96 kbps, each one the whole shot from its first frame (the game plays it
# as a track and follows its clock, so the picture stays on it):
#   tragaperras-sin.mp3      no prize: the reels rattle, stop on 1.0, 1.7 and 2.4 s, and a soft
#                            «nothing this time» (two falling notes) after the last one
#   tragaperras-premio.mp3   the jackpot: the same stops, then bells at 2.4 s and the coins pouring
#                            into the tray until 6.4 s
# PARADAS, PREMIO_EN and LLUVIA are the same as in src/ui/tragaperras.ts: change one, change both.
# The last half second of each file is silence, the bit the game loops while the picture finishes.
#
#   python3 tragaperras.py [carpeta]     -> the two MP3 in `carpeta` (the game's copy: ../../src/sonido)
import os
import sys
from metales import Mezcla, a_mp3

PARADAS = [1.0, 1.7, 2.4]
PREMIO_EN = 2.4
LLUVIA = 4.0  # seconds of coins


def giro(m):
    """The reels' rattle: it thins out as each reel stops (three reels, then two, then one)."""
    for i, (a, b) in enumerate(zip([0.0] + PARADAS[:-1], PARADAS)):
        m.rodillos(a, b, vol=0.6 - 0.1 * i, paso=0.045 + 0.012 * i)
    for p in PARADAS:
        m.para(p, 0.3)


def sin_premio(salida):
    m = Mezcla(4.7)
    giro(m)
    # Lemon, bell, pig: nothing this time.
    m.nota_dulce(PARADAS[2] + 0.18, 'E4', 0.22)
    m.nota_dulce(PARADAS[2] + 0.46, 'C4', 0.22, tau=0.45)
    a_mp3(m.sonido(rt=1.0), salida, pico=0.8)


def premio(salida):
    m = Mezcla(PREMIO_EN + LLUVIA + 1.6)
    giro(m)
    m.campanas(PREMIO_EN, 0.2)
    m.campanas(PREMIO_EN + 0.6, 0.16)
    m.monedas(PREMIO_EN, LLUVIA, 0.16, semilla=5)
    m.monedas(PREMIO_EN + 0.4, LLUVIA - 0.8, 0.1, semilla=6)
    a_mp3(m.sonido(rt=1.4), salida, pico=0.8)


if __name__ == '__main__':
    carpeta = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(carpeta, exist_ok=True)
    sin_premio(os.path.join(carpeta, 'tragaperras-sin.mp3'))
    premio(os.path.join(carpeta, 'tragaperras-premio.mp3'))
