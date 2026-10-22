# «El canto a cuatro»: the music of the chapter 2 minigame (src/ui/canto.ts), in which the four friends
# sing «Ca-mio-neees-y-ca-ra-va-naaas» one turn each. Pure synthesis, no SoundFont (metales.py, on
# trailer.py's voices). It is our own tune, the chant's brass stabs of the trailer (D minor: «Ca-mio» on D
# minor, «neees» on G minor, then A major and «naaas» home on D minor), not Paquito el Chocolatero's.
#
# Eight sounds, all MP3 at 24 kHz and 96 kbps:
#   canto-a.mp3    the bed for the first time round: a festive pasodoble (tuba, horns on the off-beat, snare
#                  figure, bass drum, castanets), 92 bpm in 2/4, four bars in a loop
#   canto-b.mp3    the same for the second time round, quicker (112 bpm), louder and fuller
#   canto-pablo.mp3, canto-fran.mp3, canto-chuchi.mp3, canto-guille.mp3
#                  each singer's two brass stabs, SILABA seconds apart (played when the tap is right)
#   canto-fallo.mp3 a sour brass «wah-wah» (played when it goes wrong)
#   canto-final.mp3 the last big chord, «¡CAMIONEEES Y CARAVANAAAS!»
#
# The beds only keep the beat: the game starts a phrase on any bar line (a bar is a quarter of the loop,
# the loop's length is `fin` less `inicio` in src/sonido/musica.ts) and follows the music's own clock.
# SILABA is the same as SIL2 in src/ui/canto.ts: change one, change both.
#
#   python3 canto.py [carpeta]     -> the eight MP3 in `carpeta` (the game's copy: ../../src/sonido)
import os
import sys
import tempfile
import numpy as np
from metales import Mezcla, a_mp3, RE, SOL, LA
from sinte import SR, exportar_bucle, hz, midi, _filtro
from metales import sierra, env

BPM = {'a': 92, 'b': 112}
COMPASES = 4
SILABA = 0.30  # seconds between a singer's two syllables
MARGEN = 0.5


def beat(bpm):
    """The beat in seconds, stretched a hair so the loop is a whole number of samples (it must join sample-exactly)."""
    largo = round(COMPASES * 2 * 60 / bpm * SR)
    return largo / SR / (COMPASES * 2), largo / SR


def ronda(m, t0, B, fuerte):
    """One round of the bed (four bars of two beats) starting at t0."""
    v = 1.0 if not fuerte else 1.25
    for b in range(COMPASES):
        c = t0 + b * 2 * B
        m.bombo(c, 105, 0.42 * v)
        m.bombo(c + B, 85, 0.34 * v)
        m.tuba(c, 0.8 * B, 'D2', 0.30 * v)
        m.tuba(c + B, 0.8 * B, 'A2', 0.27 * v)
        for off in (0.5, 1.5):
            m.cuerno(c + off * B, 0.3 * B, ['D4', 'A4', 'D5'], 0.16 * v)
            if fuerte:
                m.cuerno(c + off * B, 0.3 * B, ['A3', 'D4'], 0.1)
                m.charles(c + off * B, 0.12)
        # The snare's quick pasodoble figure; the last bar rolls into the next round.
        if b == COMPASES - 1:
            for k in range(8):
                m.caja(c + k * B / 4, (0.35 + 0.65 * k / 7) * v, 0.28, semilla=k)
        else:
            for k, ch in enumerate('x.xxx.xx'):
                if ch == 'x':
                    m.caja(c + k * B / 4, (1.0 if k in (0, 4) else 0.5) * v, 0.26 if not fuerte else 0.3, semilla=k + b)
        # Castanets and a little air, on the sixteenths of the second beat.
        for k in (2, 3):
            m.castanuela(c + B + k * B / 4, 0.1 + (0.03 if fuerte else 0), semilla=k + b)
    m.crash(t0, 0.13 if not fuerte else 0.2)
    if fuerte:
        m.crash(t0 + 4 * B, 0.1)


def lecho(que, salida, rms_db):
    B, largo = beat(BPM[que])
    m = Mezcla(3 * largo + 3.0)
    for r in range(3):
        ronda(m, r * largo, B, que == 'b')
    y = m.sonido(rt=1.2)
    nombre = os.path.join(tempfile.gettempdir(), f'canto-{que}')
    exportar_bucle(nombre, y, largo, rms_db=rms_db, margen=MARGEN, kbps=96, salida=salida, ar=24000)
    os.remove(f'{nombre}.wav')
    print(f"  musica.ts: {{ url: canto{que.upper()}, inicio: {MARGEN}, fin: {MARGEN + largo:.6f} }}   (compás {largo / COMPASES:.6f} s)")


# ---------------------------------------------------------------- the singers' stabs

def golpes(salida, notas, vol=0.5):
    """`notas`: (seconds, length, chord) for each stab of a singer."""
    m = Mezcla(1.8)
    for t, d, ch in notas:
        m.metal(t, d, ch, vol)
    a_mp3(m.sonido(rt=1.4), salida, pico=0.8)


def fallo(salida):
    """A sour brass «wah-wah»: two notes that sag."""
    m = Mezcla(1.8)
    for t, nota, cae in ((0.0, 'A3', 1.5), (0.4, 'G3', 5.0)):
        nm = int(0.8 * SR)
        tt = np.arange(nm) / SR
        f = hz(midi(nota)) * 2 ** (-(tt / 0.8) * cae / 12) * (1 + 0.012 * np.sin(2 * np.pi * 6.5 * tt))
        w = sierra(f) + sierra(f * 1.011) + sierra(f * 0.5)
        w = _filtro(w, 'lowpass', 1500, 2) * env(nm, 0.03, 0.4)
        m.poner(t, np.tanh(1.2 * w) / 2, 0.55, reverb=0.25)
    a_mp3(m.sonido(rt=1.2), salida, pico=0.8)


def final(salida):
    """The last chord: a short «CA» and a long, full D minor with the cymbal and the drums."""
    m = Mezcla(4.0)
    m.metal(0.0, 0.2, RE, 0.45)
    m.taiko(0.0, 1.0, semilla=3)
    for t in (0.3, 0.6):
        m.bombo(t, 110, 0.4)
    m.metal(0.3, 1.6, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4', 'F4', 'A4'], 0.5)
    m.taiko(0.3, 1.3, semilla=4)
    m.crash(0.3, 0.35)
    m.crash(0.9, 0.2)
    a_mp3(m.sonido(rt=2.0), salida, pico=0.85)


if __name__ == '__main__':
    carpeta = sys.argv[1] if len(sys.argv) > 1 else '.'
    os.makedirs(carpeta, exist_ok=True)
    ruta = lambda n: os.path.join(carpeta, n)
    lecho('a', ruta('canto-a.mp3'), -20.0)
    lecho('b', ruta('canto-b.mp3'), -17.5)
    # «Ca-mio» / «neees-y» / «ca-ra» / «va-naaas»: the trailer's chords.
    golpes(ruta('canto-pablo.mp3'), [(0.0, 0.2, RE), (SILABA, 0.35, RE)])
    golpes(ruta('canto-fran.mp3'), [(0.0, 0.25, SOL), (SILABA, 0.35, LA)])
    golpes(ruta('canto-chuchi.mp3'), [(0.0, 0.2, LA), (SILABA, 0.35, LA)])
    golpes(ruta('canto-guille.mp3'), [(0.0, 0.2, LA), (SILABA, 0.8, RE)])
    fallo(ruta('canto-fallo.mp3'))
    final(ruta('canto-final.mp3'))
