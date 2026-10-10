# «Próximamente»: the action-trailer music for the teaser of chapter 2, after the «Continuará…» of
# chapter 1. Pure synthesis (sinte's oscillators, filters and hall), no SoundFont: trailers sound
# like this anyway. D minor, 120 bpm, full blast from the first frame. It follows the trailer's
# shots beat by beat, so the times below are the same as PLANOS and CANTO in src/ui/trailer.ts:
# change one, change both.
#
#   0.0   «Una resaca...»: a braam, taiko and crash; the strings and the low pulse already running
#   2.0   shots and beers on the bar: a glass slammed down on each beat
#   4.0   «Con consecuencias»: braam
#   6.0   the caravan flat out across the desert: an engine roaring past
#   8.0   «Inesperadas»: braam, and a riser into the montage
#   10.0  the montage, one cut per hit and faster and faster: Pang, a beer sliding down the bar,
#         Space Invaders, the slot machine (its reels stop on 15.5, 16 and 16.5: jackpot)...
#   23.0  Vero opens her mouth over the biggest riser, and swallows the camera
#   26.0  cut to black on a last hit
#   27.0  the chant on brass stabs: «Ca-mio-neees y ca-ra-va-naaas» (our own tune, not Paquito's)
#   30.0  the title: the biggest braam and a crash; then a drone that loops (39.4 to 47.4 s) for
#         as long as the title stays up
#
#   python3 trailer.py [salida]     -> trailer.mp3, or `salida` (the game's copy: ../../src/sonido/trailer.mp3)
import subprocess
import sys
import numpy as np
from sinte import SR, _fase, _blep, _filtro, _sala, ruido, seno, campana, golpe, hz, midi, db, _master, _wav

TOTAL = 48.0  # seconds: the loop's end (47.4) and a bit of what follows it
BUCLE = (39.4, 47.4)
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


def pulso_grave(t0, dur, nota='D2', vol=0.22, ataque=0.8):
    """A low saw throbbing on the eighths, filtered: the engine under the montage."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    w = sierra(np.full(nm, hz(midi(nota)))) + 0.5 * sierra(np.full(nm, hz(midi(nota) - 12)))
    w = _filtro(w, 'lowpass', 380, 2)
    late = (np.exp(-((tt / (BEAT / 2)) % 1.0) * 3.0))
    e = np.minimum(1, tt / ataque) * np.minimum(1, (dur - tt) / 0.2)
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


def vaso(t, vol=0.5):
    """A shot glass slammed on the bar: a dull knock of wood and a short ring of glass."""
    nm = int(0.35 * SR)
    tt = np.arange(nm) / SR
    golpe_ = np.sin(2 * np.pi * np.cumsum(70 + 90 * np.exp(-tt / 0.015)) / SR) * np.exp(-tt / 0.06)
    cristal = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, d in ((2150, 0.12), (3420, 0.08), (5230, 0.05)))
    clic = _filtro(ruido(nm, semilla=7), 'highpass', 2500) * np.exp(-tt / 0.004)
    poner(t, np.tanh(1.4 * golpe_) + 0.22 * cristal + 0.4 * clic, vol, reverb=0.3)


def motor(t0, dur, vol=0.32):
    """The pickup and its caravan roaring past the camera: an engine whose pitch drops as it
    goes by, and the wind it drags along."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    u = tt / dur
    paso = 1 / (1 + np.exp((u - 0.45) * 9))  # 1 coming, 0 gone: the Doppler drop
    f = 58 * (0.86 + 0.28 * paso) * (1 + 0.02 * np.sin(2 * np.pi * 7 * tt))
    w = sierra(f) + 0.6 * sierra(f * 2.01) + 0.3 * pulso_b(f * 4)
    w = _filtro(w, 'lowpass', 1100, 2)
    soplo = _filtro(_filtro(ruido(nm, semilla=11), 'highpass', 400, 2), 'lowpass', 3500, 2)
    cerca = np.exp(-((u - 0.45) / 0.22) ** 2)
    e = np.minimum(1, tt / 0.05) * np.minimum(1, (dur - tt) / 0.3)
    poner(t0, (np.tanh(1.5 * w) * (0.35 + 0.65 * cerca) + 0.7 * soplo * cerca) * e, vol, reverb=0.2)


def pulso_b(f):
    """A rough square for the engine's growl."""
    fase, _ = _fase(np.asarray(f, dtype=float))
    return np.sign(np.sin(2 * np.pi * fase))


def deslizar(t0, dur, vol=0.22):
    """A pint glass sliding down the bar at full speed: a hiss that climbs and stops dead."""
    nm = int(dur * SR)
    tt = np.arange(nm) / SR
    u = tt / dur
    trozos = 12
    w = np.zeros(nm)
    for k in range(trozos):
        i0, i1 = int(k * nm / trozos), int((k + 1.6) * nm / trozos)
        i1 = min(nm, i1)
        fc = 500 * (3200 / 500) ** (k / trozos)
        r = _filtro(_filtro(ruido(i1 - i0, semilla=20 + k), 'highpass', fc * 0.6, 2), 'lowpass', fc * 1.6, 2)
        w[i0:i1] += r * np.sin(np.linspace(0, np.pi, i1 - i0))
    e = np.minimum(1, u / 0.15) * np.minimum(1, (1 - u) / 0.08)
    poner(t0, w * e, vol, reverb=0.15)


def rodillos(t0, t1, vol=0.18):
    """The slot machine's reels spinning: a fast rattle of ticks."""
    t = t0
    k = 0
    while t < t1:
        poner(t, golpe('clic', 70, semilla=k % 5), vol, reverb=0.1)
        t += 0.045
        k += 1


def para(t, vol=0.4):
    """A reel stopping: a heavy mechanical clunk."""
    nm = int(0.2 * SR)
    tt = np.arange(nm) / SR
    w = np.sin(2 * np.pi * np.cumsum(110 + 160 * np.exp(-tt / 0.01)) / SR) * np.exp(-tt / 0.04)
    w += 0.5 * _filtro(_filtro(ruido(nm, semilla=31), 'highpass', 1200), 'lowpass', 2600) * np.exp(-tt / 0.012)
    poner(t, np.tanh(2 * w), vol, reverb=0.2)


def campanas(t, vol=0.2):
    """The jackpot: bells running up and down a D major arpeggio, twice."""
    notas = ['D5', 'F#5', 'A5', 'D6', 'A5', 'F#5', 'D6', 'F#6']
    for k, n in enumerate(notas):
        nm = int(0.9 * SR)
        poner(t + k * 0.065, campana(np.full(nm, hz(midi(n))), razon=3.5, indice=1.6, tau=0.25) * env(nm, 0.002, 0.35), vol, reverb=0.35)


def monedas(t0, dur, vol=0.16, semilla=1):
    """Coins pouring into the tray: a shower of tiny metal clinks."""
    r = np.random.default_rng(semilla)
    nm = int(0.12 * SR)
    tt = np.arange(nm) / SR
    for t in np.sort(r.uniform(t0, t0 + dur, int(dur * 38))):
        f = r.uniform(3200, 6200)
        w = (np.sin(2 * np.pi * f * tt) + 0.6 * np.sin(2 * np.pi * f * 1.48 * tt)) * np.exp(-tt / r.uniform(0.02, 0.05))
        poner(t, w, vol * r.uniform(0.4, 1.0), reverb=0.25)


def dron(t0, t1, vol=0.14):
    """A low D that holds still (sines and a dark saw): the loop at the end lives in here."""
    nm = int((t1 - t0) * SR)
    tt = np.arange(nm) / SR
    w = seno(np.full(nm, hz(midi('D2')))) + 0.6 * seno(np.full(nm, hz(midi('A2')))) + 0.5 * seno(np.full(nm, hz(midi('D1'))))
    w += 0.25 * _filtro(sierra(np.full(nm, hz(midi('D2') + 0.06))), 'lowpass', 300)
    e = np.minimum(1, tt / 1.5)
    poner(t0, w * e, vol, reverb=0.3)


# ---------------------------------------------------------------- the trailer

# Under everything up to the cut to black: the low pulse and the strings, already at full tilt.
pulso_grave(0.0, 26.0, 'D2', 0.18, ataque=0.01)
cuerdas(0.0, 4.0, ['D3', 'D4', 'A3', 'D4'], 0.10)
cuerdas(4.0, 4.0, ['F3', 'F4', 'C4', 'F4'], 0.11)
cuerdas(8.0, 2.0, ['Bb2', 'Bb3', 'F3', 'Bb3'], 0.11, sube=True)
cuerdas(10.0, 4.0, ['D3', 'D4', 'A3', 'D4'], 0.11)
cuerdas(14.0, 3.0, ['F3', 'F4', 'C4', 'F4'], 0.11)
cuerdas(17.0, 4.0, ['Bb2', 'Bb3', 'F3', 'Bb3'], 0.12, sube=True)
cuerdas(21.0, 2.0, ['A2', 'A3', 'E3', 'C#4'], 0.13, sube=True)
cuerdas(23.0, 3.0, ['D3', 'D4', 'A3', 'F4'], 0.14, sube=True)

# The three cards, each on a braam; the first one also on a brass hit, the very first sound.
for t, raiz, dur in ((0.0, 'D1', 4.0), (4.0, 'F1', 4.0), (8.0, 'Bb0', 2.5)):
    braam(t, dur, raiz, 1.1 if t == 0 else 0.95)
    taiko(t, 1.2, semilla=int(t) + 1)
    crash(t, 0.25)
metal(0.0, 0.6, ['D2', 'A2', 'D3', 'F3', 'A3'], 0.3)
# Quarters on the taiko between the cards and the scenes.
for k in range(20):
    if k % 4:
        taiko(k * BEAT, 0.5, semilla=k)
# The bar: four glasses slammed down, one a beat (2.0 to 3.5).
for k in range(4):
    vaso(2.0 + k * BEAT, 0.55)
    taiko(2.0 + k * BEAT, 0.95 if k == 0 else 0.7, semilla=k + 40)
crash(2.0, 0.15)
# The caravan roaring past.
taiko(6.0, 1.1, semilla=6)
crash(6.0, 0.15)
motor(6.0, 2.0)
# Into the montage.
riser(8.5, 1.5, 0.2)

# The montage: a taiko and a crash on every cut, quarters filling in, then eighths, then sixteenths.
CORTES = [10.0, 12.0, 13.0, 15.0, 17.0, 18.0, 19.0, 20.0, 21.0, 21.5, 22.0, 22.5, 23.0]
for t in CORTES:
    taiko(t, 1.0, semilla=int(t * 2))
    crash(t, 0.1)
for k in range(14):  # quarters, 10 to 17
    t = 10.0 + k * BEAT
    if t not in CORTES:
        taiko(t, 0.55, semilla=k)
for k in range(16):  # eighths, 17 to 21
    t = 17.0 + k * BEAT / 2
    if t not in CORTES:
        taiko(t, 0.5 + 0.01 * k, semilla=k + 3)
for k in range(8):  # sixteenths, 21 to 23
    t = 21.0 + k * BEAT / 4 + BEAT / 4
    taiko(t, 0.45, semilla=k + 9)
for t, raiz in ((10.0, 'D1'), (15.0, 'F1'), (17.0, 'Bb0'), (21.0, 'A0')):
    braam(t, 2.5, raiz, 0.55)
# The beer sliding down the bar, each time it crosses.
for t, d in ((12.0, 1.0), (18.0, 1.0), (21.5, 0.5)):
    deslizar(t, d)
# The slot machine: spinning, three reels stopping on the beat, the jackpot and its coins.
rodillos(15.0, 16.5)
for t in (15.5, 16.0, 16.5):
    para(t)
campanas(16.5)
monedas(16.5, 0.5, 0.16, semilla=1)
monedas(20.0, 1.0, 0.16, semilla=2)
monedas(22.5, 0.5, 0.16, semilla=3)

# Vero: the biggest riser, a roll that speeds up, and the hit when she swallows the camera.
braam(23.0, 3.0, 'D1', 0.6)
riser(23.0, 3.0, 0.27)
for k in range(3):  # quarters, then the roll
    taiko(23.5 + k * BEAT, 0.6 + 0.05 * k, semilla=k + 12)
for k in range(8):
    taiko(25.0 + k * BEAT / 4, 0.5 + 0.06 * k, semilla=k + 1)
braam(26.0, 1.8, 'D1', 1.2)
taiko(26.0, 1.3, semilla=2)
crash(26.0, 0.25)

# The chant on brass stabs, our own tune: «Ca-mio-neees y ca-ra-va-naaas».
RE = ['D3', 'F3', 'A3', 'D4']
SOL = ['D3', 'G3', 'Bb3', 'D4']
LA = ['C#3', 'E3', 'A3', 'E4']
C0 = 27.0
CANTO = [(C0, 0.2, RE), (C0 + 0.25, 0.2, RE), (C0 + 0.5, 0.6, SOL), (C0 + 1.25, 0.15, LA), (C0 + 1.45, 0.2, LA), (C0 + 1.7, 0.2, LA), (C0 + 1.95, 0.2, LA), (C0 + 2.2, 0.7, RE)]
for t, d, ch in CANTO:
    metal(t, d, ch, 0.42)
    taiko(t, 0.7 if d < 0.5 else 1.0, semilla=int(t * 10))
# The title: the biggest braam, a crash, and the drone the loop is cut from.
braam(30.0, 6.0, 'D1', 1.3)
metal(30.0, 1.2, ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], 0.35)
taiko(30.0, 1.3, semilla=4)
crash(30.0, 0.3)
dron(30.4, TOTAL, 0.12)

# ---------------------------------------------------------------- mix and export

mezcla = x + _sala(envio[None, :].repeat(2, axis=0), rt=2.4)[0]
mezcla = _filtro(_filtro(mezcla, 'highpass', 28), 'lowpass', 11000, 4)
# The loop (39.4 to 47.4 s) only holds the drone: the title's braam and its hall are gone by then;
# its last 0.25 s fade into what comes just before 39.4, so the jump back joins without a click.
a, b = (int(s * SR) for s in BUCLE)
k = int(0.25 * SR)
w = 0.5 - 0.5 * np.cos(np.pi * np.linspace(0, 1, k))
mezcla[b - k:b] = (1 - w) * mezcla[b - k:b] + w * mezcla[a - k:a]
mezcla[b:] = mezcla[a:a + len(mezcla) - b]
activo = mezcla[:int(30.5 * SR)]
ganancia = db(-15) / np.sqrt(np.mean(activo[np.abs(activo) > 1e-3] ** 2))
y = _master(mezcla[None, :].repeat(2, axis=0), ganancia)
nombre = 'trailer'
_wav(f'{nombre}.wav', y)
salida = sys.argv[1] if len(sys.argv) > 1 else f'{nombre}.mp3'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{nombre}.wav', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '96k', salida], check=True)
print(f'{salida}: {TOTAL:.1f} s, pico {np.max(np.abs(y)):.2f}, bucle de {BUCLE[0]} a {BUCLE[1]} s')
