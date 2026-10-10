# «Próximamente»: the action-trailer music for the teaser of chapter 2, after the «Continuará…» of
# chapter 1. Pure synthesis (sinte's oscillators, filters and hall), no SoundFont: trailers sound
# like this anyway. D minor, 120 bpm in the montage. It follows the trailer's shots second by
# second, so the times below are the same as PLANOS in src/ui/trailer.ts: change one, change both.
#
#   0.0   black: a deep «braaam» and a clock ticking
#   4.0   the Nevada desert at dawn: a second braam, wind
#   9.5   inside the caravan: a low pulse, snoring in the dark
#   12.5  the montage: taiko on every cut, faster and faster, strings of saws climbing, a riser
#   24.5  cut to black on a last hit; the narrator over a low drone and the clock
#   29.6  the chant on brass stabs: «Ca-mio-neees y ca-ra-va-naaas» (our own tune, not Paquito's)
#   32.6  the title: the biggest braam and a crash; then a drone that loops (42 to 50 s) for as
#         long as the title stays up
#
#   python3 trailer.py [salida]     -> trailer.mp3, or `salida` (the game's copy: ../../src/sonido/trailer.mp3)
import subprocess
import sys
import numpy as np
from sinte import SR, _fase, _blep, _filtro, _sala, ruido, seno, golpe, hz, midi, db, _master, _wav

TOTAL = 50.6  # seconds: the loop's end (50) and half a second of what follows it
BUCLE = (42.0, 50.0)
BEAT = 0.5  # 120 bpm
x = np.zeros(int(TOTAL * SR))
envio = np.zeros_like(x)  # what goes to the hall


def poner(t, w, vol=1.0, reverb=0.25):
    i0 = int(round(t * SR))
    i1 = min(len(x), i0 + len(w))
    if i0 >= len(x):
        return
    x[i0:i1] += w[:i1 - i0] * vol
    envio[i0:i1] += w[:i1 - i0] * vol * reverb


def sierra(f):
    """Band-limited sawtooth (PolyBLEP), peak 1."""
    fase, dt = _fase(np.asarray(f, dtype=float))
    return 2 * fase - 1 - _blep(fase, dt)


def env(nm, a, tau, fin=0.05):
    t = np.arange(nm) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / tau)
    k = int(fin * SR)
    e[-k:] *= np.linspace(1, 0, k)
    return e


def braam(t, dur, raiz='D1', fuerza=1.0):
    """The trailer horn: detuned saws on root, octave and fifth, pushed into a soft clipper, a
    bright layer that dies fast over a dark one that lasts, and a sine underneath."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    m = midi(raiz)
    capa = np.zeros(nm)
    for k, (st, v) in enumerate([(0, 1.0), (12, 0.8), (19, 0.45), (24, 0.3)]):
        for det in (-11, 0, 9):
            f = hz(m + st + det / 100) * (1 + 0.0015 * np.sin(2 * np.pi * (0.3 + 0.07 * k) * tt))
            capa += v * sierra(np.full(nm, 1.0) * f)
    capa = np.tanh(0.5 * capa)
    brillo = _filtro(capa, 'lowpass', 1400, 2) * env(nm, 0.04, 0.5)
    oscuro = _filtro(capa, 'lowpass', 320, 2) * env(nm, 0.08, dur * 0.45)
    sub = seno(np.full(nm, hz(m))) * 2 * env(nm, 0.02, dur * 0.5)
    w = (0.8 * brillo + 1.1 * oscuro + 0.9 * sub) * fuerza
    poner(t, w, 0.55, reverb=0.35)


def taiko(t, vel=1.0, semilla=0):
    nm = int(0.9 * SR)
    tt = np.arange(nm) / SR
    f = 52 + 95 * np.exp(-tt / 0.04)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.32)
    piel = _filtro(_filtro(ruido(nm, semilla=semilla), 'lowpass', 1800), 'highpass', 150) * np.exp(-tt / 0.03) * 0.7
    w = np.tanh(1.8 * (cuerpo + piel)) * vel
    poner(t, w, 0.5, reverb=0.4)


def tic(t, vel=0.5):
    poner(t, golpe('clic', 100) * vel, 0.35, reverb=0.15)


def viento(t0, dur, vol=0.12):
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    r = _filtro(_filtro(ruido(nm, semilla=5), 'lowpass', 900, 2), 'highpass', 120)
    ola = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * tt) * np.sin(2 * np.pi * 0.11 * tt + 1)
    e = np.minimum(1, tt / 1.0) * np.minimum(1, (dur - tt) / 0.6)
    poner(t0, r * ola * e, vol, reverb=0.2)


def pulso_grave(t0, dur, nota='D2', vol=0.22):
    """A low saw throbbing on the eighths, filtered: the tension under the caravan."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    w = sierra(np.full(nm, hz(midi(nota)))) + 0.5 * sierra(np.full(nm, hz(midi(nota) - 12)))
    w = _filtro(w, 'lowpass', 380, 2)
    late = (np.exp(-((tt / (BEAT / 2)) % 1.0) * 3.0))
    e = np.minimum(1, tt / 0.8) * np.minimum(1, (dur - tt) / 0.2)
    poner(t0, w * late * e, vol, reverb=0.2)


def cuerdas(t0, dur, notas, vol=0.12, sube=False):
    """String-like saw chords in sixteenths (ostinato), getting brighter if `sube`."""
    paso = BEAT / 4
    k = 0
    t = t0
    while t < t0 + dur - 1e-6:
        m = notas[k % len(notas)]
        nm = int(paso * 1.3 * SR)
        w = sierra(np.full(nm, hz(midi(m)))) + sierra(np.full(nm, hz(midi(m) + 0.08)))
        u = (t - t0) / dur
        w = _filtro(w, 'lowpass', 900 + (2600 * u if sube else 0), 2) * env(nm, 0.005, 0.08)
        poner(t, w, vol * (0.7 + 0.5 * u if sube else 1), reverb=0.25)
        t += paso
        k += 1


def riser(t0, dur, vol=0.25):
    """Noise that climbs: band by band, louder, ending on the cut."""
    trozos = 24
    largo = dur / trozos
    for k in range(trozos):
        nm = int(largo * 1.5 * SR)
        fc = 300 * (12000 / 300) ** (k / trozos)
        r = _filtro(_filtro(ruido(nm, semilla=k), 'highpass', fc * 0.5, 2), 'lowpass', fc * 1.5, 2)
        e = np.sin(np.linspace(0, np.pi, nm)) * ((k + 1) / trozos) ** 2
        poner(t0 + k * largo, r * e, vol, reverb=0.3)
    # and a saw sliding up an octave and a half underneath
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    f = hz(midi('D3')) * 2 ** (1.5 * (tt / dur) ** 2)
    poner(t0, _filtro(sierra(f), 'lowpass', 2500) * (tt / dur) ** 2, vol * 0.4, reverb=0.3)


def metal(t, dur, notas, vol=0.4):
    """A brass stab: a chord of detuned saws with a filter that snaps open and shut."""
    nm = int((dur + 0.4) * SR)
    w = np.zeros(nm)
    for m in notas:
        for det in (-8, 0, 7):
            w += sierra(np.full(nm, hz(midi(m) + det / 100)))
    w /= len(notas) * 3
    abre = _filtro(w, 'lowpass', 3200, 2) * env(nm, 0.008, 0.09)
    cuerpo = _filtro(w, 'lowpass', 1100, 2) * env(nm, 0.02, max(0.12, dur * 0.6))
    poner(t, np.tanh(1.5 * (abre + cuerpo)), vol, reverb=0.35)


def crash(t, vol=0.25):
    poner(t, golpe('crash', 120), vol, reverb=0.4)


def ronquido(t, dur=1.4, vol=0.10):
    """Snoring in the dark: filtered noise breathing in, a low buzz out."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    dentro = _filtro(ruido(nm, semilla=3), 'lowpass', 700) * np.sin(np.pi * np.clip(tt / (dur * 0.5), 0, 1))
    zumbido = sierra(np.full(nm, 62 + 6 * np.sin(2 * np.pi * 9 * tt))) * np.sin(np.pi * np.clip((tt - dur * 0.5) / (dur * 0.5), 0, 1))
    poner(t, _filtro(dentro * 0.6 + _filtro(zumbido, 'lowpass', 400) * 0.5, 'highpass', 60), vol, reverb=0.1)


def dron(t0, t1, vol=0.14):
    """A low D that holds still (sines and a dark saw): the loop at the end lives in here."""
    nm = int((t1 - t0) * SR)
    tt = np.arange(nm) / SR
    w = seno(np.full(nm, hz(midi('D2')))) + 0.6 * seno(np.full(nm, hz(midi('A2')))) + 0.5 * seno(np.full(nm, hz(midi('D1'))))
    w += 0.25 * _filtro(sierra(np.full(nm, hz(midi('D2') + 0.06))), 'lowpass', 300)
    e = np.minimum(1, tt / 1.5)
    poner(t0, w * e, vol, reverb=0.3)


# ---------------------------------------------------------------- the trailer

# Black: the first braam and the clock.
braam(0.6, 5.0, 'D1', 1.0)
for k in range(7):
    tic(0.6 + k * 0.5 + 0.25, 0.45)
# The desert at dawn.
braam(4.0, 6.5, 'Bb0', 0.9)
viento(4.0, 6.0)
# Inside the caravan.
pulso_grave(9.5, 3.0)
ronquido(9.7)
ronquido(11.1, 1.3, 0.08)
# The montage: a taiko on each cut (every 2 s), quarters filling in, then eighths, then a roll.
CORTES = [12.5, 14.5, 16.5, 18.5, 20.5, 22.0]
for t in CORTES:
    taiko(t, 1.0, semilla=int(t))
    crash(t, 0.12)
for k in range(16):  # quarters, 12.5 to 20.5
    if k % 4:
        taiko(12.5 + k * BEAT, 0.55, semilla=k)
for k in range(6):  # eighths, 20.5 to 22
    taiko(20.5 + k * BEAT / 2, 0.6 + 0.05 * k, semilla=k + 3)
for k in range(10):  # sixteenths to the cut
    taiko(22.0 + k * BEAT / 4, 0.45 + 0.05 * k, semilla=k + 9)
for k in range(5):  # the roll before the cut
    taiko(23.25 + k * 0.25, 0.5 + 0.1 * k, semilla=k + 1)
cuerdas(12.5, 4.0, ['D3', 'D4', 'A3', 'D4'], 0.10)
cuerdas(16.5, 4.0, ['F3', 'F4', 'C4', 'F4'], 0.11)
cuerdas(20.5, 1.5, ['Bb2', 'Bb3', 'F3', 'Bb3'], 0.12, sube=True)
cuerdas(22.0, 2.5, ['A2', 'A3', 'E3', 'C#4'], 0.13, sube=True)
pulso_grave(12.5, 12.0, 'D2', 0.18)
for t, raiz in ((12.5, 'D1'), (16.5, 'F1'), (20.5, 'Bb0')):
    braam(t, 3.8, raiz, 0.55)
riser(21.0, 3.5, 0.22)
# Cut to black: one last hit, then almost nothing.
braam(24.5, 4.5, 'D1', 1.1)
taiko(24.5, 1.2, semilla=2)
crash(24.5, 0.2)
dron(25.2, 29.2, 0.08)
for k in range(8):
    tic(25.3 + k * 0.5, 0.35)
# The chant on brass stabs, our own tune: «Ca-mio-neees y ca-ra-va-naaas».
RE = ['D3', 'F3', 'A3', 'D4']
SOL = ['D3', 'G3', 'Bb3', 'D4']
LA = ['C#3', 'E3', 'A3', 'E4']
CANTO = [(29.6, 0.2, RE), (29.85, 0.2, RE), (30.1, 0.6, SOL), (30.85, 0.15, LA), (31.05, 0.2, LA), (31.3, 0.2, LA), (31.55, 0.2, LA), (31.8, 0.7, RE)]
for t, d, ch in CANTO:
    metal(t, d, ch, 0.42)
    taiko(t, 0.7 if d < 0.5 else 1.0, semilla=int(t * 10))
# The title: the biggest braam, a crash, and the drone the loop is cut from.
braam(32.6, 6.0, 'D1', 1.3)
metal(32.6, 1.2, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], 0.35)
taiko(32.6, 1.3, semilla=4)
crash(32.6, 0.3)
dron(33.0, TOTAL, 0.12)

# ---------------------------------------------------------------- mix and export

mezcla = x + _sala(envio[None, :].repeat(2, axis=0), rt=2.4)[0]
mezcla = _filtro(_filtro(mezcla, 'highpass', 28), 'lowpass', 11000, 4)
# The loop (42 to 50 s) only holds the drone: the title's braam and its hall are gone by then;
# its last 0.25 s fade into what comes just before 42, so the jump back joins without a click.
a, b = (int(s * SR) for s in BUCLE)
k = int(0.25 * SR)
w = 0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, k))
mezcla[b - k:b] = (1 - w) * mezcla[b - k:b] + w * mezcla[a - k:a]
mezcla[b:] = mezcla[a:a + len(mezcla) - b]
activo = mezcla[:int(33 * SR)]
ganancia = db(-15) / np.sqrt(np.mean(activo[np.abs(activo) > 1e-3] ** 2))
y = _master(mezcla[None, :].repeat(2, axis=0), ganancia)
nombre = 'trailer'
_wav(f'{nombre}.wav', y)
salida = sys.argv[1] if len(sys.argv) > 1 else f'{nombre}.mp3'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{nombre}.wav', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '96k', salida], check=True)
print(f'{salida}: {TOTAL:.1f} s, pico {np.max(np.abs(y)):.2f}, bucle de {BUCLE[0]} a {BUCLE[1]} s')
