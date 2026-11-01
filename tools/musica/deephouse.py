# Deep house synth: notes in beats go straight to stereo audio, no MIDI and no SoundFont.
# FM electric piano, warm detuned pad, filtered chord stabs, sub and organ bass, a formant "ooh" voice,
# a soft piano, 909/808-style drums, vinyl crackle and rain; a resonant filter that can sweep, ping-pong
# echo, chorus, kick-driven pumping, two convolution reverbs and a glue compressor plus limiter.
# Deterministic: the same script gives the same samples. Needs numpy, scipy and numba.
import subprocess
import zlib
import numpy as np
from numba import njit
from scipy.signal import butter, sosfilt, oaconvolve
from scipy.ndimage import minimum_filter1d, uniform_filter1d

SR = 44100
_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nota(s):
    """'C4' -> 60, 'Eb5', 'F#3'. Numbers pass through."""
    if not isinstance(s, str):
        return s
    p, i = _PC[s[0]], 1
    while i < len(s) and s[i] in '#b':
        p += 1 if s[i] == '#' else -1
        i += 1
    return p + 12 * (int(s[i:]) + 1)


def hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69) / 12)


def db(x):
    return 10 ** (x / 20)


# --- DSP primitives ----------------------------------------------------------------------

@njit(cache=True)
def _svf(x, fc, res, modo):
    """Zavalishin's TPT state-variable filter. fc per sample (or one value), res 0..0.98.
    modo 0 lowpass, 1 normalised bandpass, 2 highpass."""
    n = len(x)
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 2.0 - 2.0 * res
    uno = len(fc) == 1
    for i in range(n):
        f = fc[0] if uno else fc[i]
        if f > SR * 0.45:
            f = SR * 0.45
        if f < 10.0:
            f = 10.0
        g = np.tan(np.pi * f / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if modo == 0:
            y[i] = v2
        elif modo == 1:
            y[i] = k * v1
        else:
            y[i] = x[i] - k * v1 - v2
    return y


def svf(x, fc, res=0.0, modo='lp'):
    fc = np.atleast_1d(np.asarray(fc, dtype=float))
    return _svf(np.ascontiguousarray(x, dtype=float), fc, float(res), {'lp': 0, 'bp': 1, 'hp': 2}[modo])


def filtro(x, tipo, fc, orden=2):
    fc = min(fc, SR * 0.45)
    return sosfilt(butter(orden, fc, btype=tipo, fs=SR, output='sos'), x, axis=-1)


@njit(cache=True)
def _eco(l, r, d, fb, lp, mezcla, ancho):
    """Ping-pong echo with a lowpass in the loop: the repeats bounce left, right, left... getting darker."""
    n = len(l)
    bl = np.zeros(d)
    br = np.zeros(d)
    ol = np.empty(n)
    orr = np.empty(n)
    zl = 0.0
    zr = 0.0
    j = 0
    for i in range(n):
        dl = bl[j]
        dr = br[j]
        zl += lp * (dl - zl)
        zr += lp * (dr - zr)
        bl[j] = 0.5 * (l[i] + r[i]) + fb * zr
        br[j] = zl
        ol[i] = l[i] + mezcla * (dl + (1 - ancho) * dr)
        orr[i] = r[i] + mezcla * (dr + (1 - ancho) * dl)
        j += 1
        if j >= d:
            j = 0
    return ol, orr


def eco(buf, segundos, fb=0.4, mezcla=0.3, lp_hz=3500, ancho=0.8):
    d = max(1, int(round(segundos * SR)))
    lp = 1 - np.exp(-2 * np.pi * lp_hz / SR)
    l, r = _eco(np.ascontiguousarray(buf[0]), np.ascontiguousarray(buf[1]), d, fb, lp, mezcla, ancho)
    return np.array([l, r])


def retardo_mod(x, base_ms, prof_ms, vel_hz, fase=0.0):
    """A delay line swept by a sine: chorus at a few ms, tape wobble at slower rates."""
    i = np.arange(len(x), dtype=float)
    d = (base_ms + prof_ms * np.sin(2 * np.pi * vel_hz * i / SR + fase)) * SR / 1000
    return np.interp(i - d, i, x, left=0.0)


def coro(buf, mezcla=0.5, base_ms=9.0, prof_ms=2.5, vel_hz=0.45):
    l = buf[0] + mezcla * retardo_mod(buf[1], base_ms, prof_ms, vel_hz, 0.0)
    r = buf[1] + mezcla * retardo_mod(buf[0], base_ms * 1.13, prof_ms, vel_hz * 1.07, 1.7)
    return np.array([l, r]) / (1 + 0.5 * mezcla)


@njit(cache=True)
def _compresor(l, r, umbral, ratio, at, re, rodilla):
    n = len(l)
    g = np.empty(n)
    env = 0.0
    for i in range(n):
        x = max(abs(l[i]), abs(r[i]))
        lv = 20.0 * np.log10(x + 1e-9)
        sobre = lv - umbral
        if sobre <= -rodilla / 2:
            red = 0.0
        elif sobre >= rodilla / 2:
            red = sobre * (1 - 1 / ratio)
        else:
            red = (1 - 1 / ratio) * (sobre + rodilla / 2) ** 2 / (2 * rodilla)
        c = at if red > env else re
        env += c * (red - env)
        g[i] = 10 ** (-env / 20)
    return g


def compresor(buf, umbral=-16, ratio=2.0, ataque_ms=12, suelta_ms=160, rodilla=6.0):
    at = 1 - np.exp(-1 / (ataque_ms * SR / 1000))
    re = 1 - np.exp(-1 / (suelta_ms * SR / 1000))
    g = _compresor(np.ascontiguousarray(buf[0]), np.ascontiguousarray(buf[1]), umbral, ratio, at, re, rodilla)
    return buf * g


def limitador(buf, techo_db=-1.0, mira_ms=4.0):
    """Look-ahead brickwall: the gain needed is spread over the look-ahead so it never clips or clicks."""
    techo = db(techo_db)
    pico = np.max(np.abs(buf), axis=0)
    need = np.minimum(1.0, techo / np.maximum(pico, 1e-9))
    L = max(3, int(mira_ms * SR / 1000))
    g = minimum_filter1d(need, size=2 * L + 1)
    g = uniform_filter1d(g, size=L)
    return np.clip(buf * g, -techo, techo)


def satura(x, drive=1.5):
    return np.tanh(drive * x) / np.tanh(drive)


# --- Reverbs -----------------------------------------------------------------------------

_IR = {}


def respuesta(rt, oscuro=6000, pre_ms=20, semilla=11):
    """Stereo impulse response: decorrelated noise whose highs die faster, a few early reflections."""
    clave = (rt, oscuro, pre_ms)
    if clave in _IR:
        return _IR[clave]
    rng = np.random.default_rng(semilla)
    nm = int(1.4 * rt * SR)
    t = np.arange(nm) / SR
    ir = np.zeros((2, nm))
    for c in range(2):
        r = rng.standard_normal(nm)
        bajo = filtro(r, 'lowpass', 500)
        medio = filtro(filtro(r, 'highpass', 500), 'lowpass', oscuro)
        alto = filtro(r, 'highpass', oscuro)
        ir[c] = (bajo * np.exp(-6.9 * t / (rt * 0.9)) + medio * np.exp(-6.9 * t / rt)
                 + 0.6 * alto * np.exp(-6.9 * t / (0.35 * rt)))
        ir[c] *= np.minimum(1, t / 0.035) ** 2  # a soft onset: the tail blooms
        for k in range(6):  # early reflections
            i = int((0.007 + 0.011 * k + 0.004 * rng.random()) * SR)
            ir[c, i] += (0.5 - 0.06 * k) * (1 if rng.random() > 0.5 else -1) * 3
    pre = int(pre_ms * SR / 1000)
    ir = np.concatenate([np.zeros((2, pre)), ir], axis=1)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    _IR[clave] = ir
    return ir


def reverb(buf, rt, oscuro=6000, pre_ms=20):
    ir = respuesta(rt, oscuro, pre_ms)
    return np.array([oaconvolve(buf[c], ir[c])[:buf.shape[1]] for c in range(2)])


# --- Oscillators -------------------------------------------------------------------------

def _fase(f, ph0=0.0):
    dt = np.atleast_1d(f) / SR
    return (np.cumsum(dt) - dt + ph0) % 1.0, dt


def _blep(t, dt):
    y = np.zeros_like(t)
    a = t < dt
    x = t[a] / dt[a]
    y[a] = x + x - x * x - 1
    b = t > 1 - dt
    x = (t[b] - 1) / dt[b]
    y[b] = x * x + x + x + 1
    return y


def sierra(f, ph0=0.0):
    ph, dt = _fase(f, ph0)
    return 2 * ph - 1 - _blep(ph, dt)


def cuadrada(f, duty=0.5, ph0=0.0):
    ph, dt = _fase(f, ph0)
    p2 = (ph + duty) % 1.0
    return 0.5 * ((2 * ph - 1 - _blep(ph, dt)) - (2 * p2 - 1 - _blep(p2, dt)))


def seno(f, ph0=0.0):
    ph, _ = _fase(f, ph0)
    return np.sin(2 * np.pi * ph)


def adsr(nm, gate, a, d, s, r):
    """Attack, decay to a sustain level, release from wherever the gate closes. Seconds."""
    t = np.arange(nm) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4)))
    g = min(int(gate * SR), nm - 1)
    e[g:] = e[g] * np.exp(-(t[g:] - t[g]) / max(r / 4.6, 1e-4))
    k = min(96, nm)
    e[-k:] *= np.linspace(1, 0, k)
    return e


# --- Instruments: each returns a (2, n) stereo array for one note --------------------------

def rhodes(m, dur, vel, rng):
    """DX-style electric piano: a 1:1 FM body whose brightness fades, a metallic tine ping, a little bark."""
    v = vel / 127
    f = hz(m)
    rel = 0.35
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    tau = np.clip(2.8 * (262 / f) ** 0.6, 0.7, 5.0)
    amp = adsr(nm, dur, 0.002, tau, 0.0, rel)
    ind = (0.5 + 1.9 * v ** 1.4) * np.exp(-t / 0.45) + 0.25
    det = 1 + rng.uniform(-1, 1) * 0.0006
    cuerpo = np.sin(2 * np.pi * f * det * t + ind * np.sin(2 * np.pi * f * t))
    pin = 0.32 * v * np.sin(2 * np.pi * f * t + 1.6 * np.exp(-t / 0.015) * np.sin(2 * np.pi * 14.02 * f * t)) * np.exp(-t / 0.09)
    y = satura((cuerpo + pin) * amp * (0.9 + 0.6 * v), 1.0 + 1.3 * v) * v ** 1.2
    return np.array([y, y])


def pad(m, dur, vel, rng, voces=6, det=11, ataque=0.7, suelta=1.8):
    """Detuned saws spread left and right, a slow drift; dark, it wants a lowpass on the track."""
    v = vel / 127
    f0 = hz(m)
    nm = int((dur + suelta) * SR)
    t = np.arange(nm) / SR
    out = np.zeros((2, nm))
    for k in range(voces):
        c = det * (2 * k / (voces - 1) - 1) if voces > 1 else 0
        deriva = 3 * np.sin(2 * np.pi * (0.13 + 0.05 * k) * t + rng.uniform(0, 6.28))
        f = f0 * 2 ** ((c + deriva) / 1200)
        w = sierra(f, rng.uniform())
        lado = k % 2
        out[lado] += w * (0.8 if abs(c) > det * 0.6 else 1.0)
        out[1 - lado] += w * 0.35
    out = filtro(out, 'lowpass', 5000)
    return out * adsr(nm, dur, ataque, 1.5, 0.85, suelta) * v / voces * 1.6


def stab(m, dur, vel, rng, brillo=2600, cierre=0.13, res=0.35, decay=0.32):
    """A deep house chord stab: three saws and a square, a resonant filter that snaps shut."""
    v = vel / 127
    f = hz(m)
    rel = 0.12
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    f = np.full(nm, f)
    w = (sierra(f * 2 ** (-7 / 1200), rng.uniform()) + sierra(f * 2 ** (7 / 1200), rng.uniform())
         + 0.7 * sierra(f, rng.uniform()) + 0.5 * cuadrada(f / 2, 0.5, rng.uniform()))
    fc = 380 + (brillo * (0.5 + 0.7 * v)) * np.exp(-t / cierre)
    w = svf(w, fc, res)
    y = w * adsr(nm, dur, 0.002, decay, 0.25, rel) * v * 0.45
    return np.array([y, y])


def pluck(m, dur, vel, rng, brillo=3800, cierre=0.08, res=0.25):
    v = vel / 127
    f = hz(m)
    rel = 0.2
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    f = np.full(nm, f)
    w = sierra(f, rng.uniform()) + 0.6 * cuadrada(f * 2 ** (5 / 1200), 0.3, rng.uniform())
    fc = 250 + brillo * v * np.exp(-t / cierre)
    y = svf(w, fc, res) * adsr(nm, dur, 0.001, 0.22, 0.0, rel) * v * 0.6
    return np.array([y, y])


def sub(m, dur, vel, rng, filo=0.22, corte=500):
    """Deep bass: a sine with a touch of second harmonic and a filtered saw for definition."""
    v = vel / 127
    f = hz(m)
    rel = 0.07
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    f = np.full(nm, f)
    w = seno(f) + 0.18 * seno(2 * f) + filo * svf(sierra(f), 260 + corte * np.exp(-t / 0.05), 0.2)
    y = satura(w * adsr(nm, dur, 0.004, 0.4, 0.8, rel), 1.4) * v
    return np.array([y, y])


def organo(m, dur, vel, rng):
    """The M1-style organ bass of 90s deep house: stacked sine harmonics with a percussive bloom."""
    v = vel / 127
    f = hz(m)
    rel = 0.06
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    f = np.full(nm, f)
    arm = [(1, 1.0), (2, 0.75), (3, 0.42), (4, 0.3), (5, 0.12), (6, 0.1), (8, 0.06)]
    w = sum(a * seno(f * h) * (1 + (0.8 if h in (2, 4) else 0.2) * np.exp(-t / 0.03)) for h, a in arm)
    w = filtro(w, 'lowpass', 1600)
    y = satura(w * adsr(nm, dur, 0.002, 0.16, 0.5, rel) * 0.45, 1.3) * v
    return np.array([y, y])


def piano(m, dur, vel, rng):
    """A soft piano: slightly stretched partials, the high ones dying first, a felt hammer thump."""
    v = vel / 127
    f = hz(m)
    rel = 0.5
    nm = int((dur + rel) * SR)
    t = np.arange(nm) / SR
    B = 0.0004
    tau0 = np.clip(4.0 * (262 / f) ** 0.7, 0.8, 8.0)
    y = np.zeros(nm)
    for k in range(1, 13):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > SR * 0.42:
            break
        a = (1 / k ** (1.6 - 0.6 * v)) * (1 if k > 1 else 1.0)
        y += a * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28)) * np.exp(-t * (1 + 0.45 * k) / tau0)
    golpe = filtro(rng.standard_normal(nm), 'lowpass', 1200) * np.exp(-t / 0.012) * 0.08
    y = (y + golpe) * adsr(nm, dur, 0.003, 50, 1.0, rel) * v ** 1.3 * 0.5
    return np.array([y, y])


INSTRUMENTOS = {'rhodes': rhodes, 'pad': pad, 'stab': stab, 'pluck': pluck, 'sub': sub, 'organo': organo, 'piano': piano}


# --- The voice: rendered a phrase at a time so it glides between notes ------------------------

FORMANTES = {  # soprano: (Hz, dB, bandwidth)
    'a': [(800, 0, 80), (1150, -6, 90), (2900, -32, 120), (3900, -20, 130)],
    'o': [(450, 0, 70), (800, -11, 80), (2830, -22, 100), (3800, -22, 130)],
    'u': [(325, 0, 50), (700, -16, 60), (2700, -35, 170), (3800, -40, 180)],
    'e': [(400, 0, 60), (1700, -16, 80), (2700, -18, 120), (3600, -36, 150)],
}


def _curvas(notas, glide, ataque, suelta, semilla, vib, cents):
    """Pitch (with glides between touching notes, delayed vibrato and a slow wander) and loudness for a phrase."""
    rng = np.random.default_rng(semilla)
    fin = max(s + d for s, d, *_ in notas) + suelta + 0.1
    nm = int(fin * SR)
    t = np.arange(nm) / SR
    tono = np.full(nm, float(notas[0][2]))
    amp = np.zeros(nm)
    vibr = np.zeros(nm)
    previa = None
    for s, d, m, vel in notas:
        i0 = int(s * SR)
        ligada = previa is not None and s - previa[0] < 0.06
        if ligada:
            u = np.clip((t[i0:] - s) / glide, 0, 1)
            tono[i0:] = previa[1] + (m - previa[1]) * (1 - (1 - u) ** 2)
        else:
            tono[i0:] = m
        e = adsr(nm - i0, d, 0.015 if ligada else ataque, 0.8, 0.8, suelta) * (vel / 127)
        amp[i0:] = np.maximum(amp[i0:], e)
        vibr[i0:] = np.clip((t[i0:] - s - 0.28) / 0.45, 0, 1)
        previa = (s + d, m)
    deriva = np.cumsum(rng.standard_normal(nm)) / np.sqrt(SR) * 6
    deriva = filtro(deriva - np.linspace(deriva[0], deriva[-1], nm), 'lowpass', 3)
    c = cents + vib * vibr * np.sin(2 * np.pi * 5.2 * t + 0.3 * np.sin(2 * np.pi * 0.7 * t)) + deriva
    return hz(tono + c / 100), amp, rng


def voz(notas, vocal='u', semilla=0, vib=24, glide=0.07, aire=0.05, ataque=0.07, suelta=0.3, cents=0.0):
    """notas: [(start s, length s, midi, vel)] from the phrase start. A breathy glottal buzz through four formants. Mono."""
    f, amp, rng = _curvas(notas, glide, ataque, suelta, semilla, vib, cents)
    nm = len(f)
    fuente = svf(sierra(f, rng.uniform()), 1400, 0.0)  # glottal tilt
    soplo = filtro(rng.standard_normal(nm), 'highpass', 1500) * aire
    fuente = (fuente + soplo) * amp
    y = np.zeros(nm)
    for k, (fr, g, bw) in enumerate(FORMANTES[vocal]):
        fr = fr * 1.04
        res = float(np.clip(1 - (bw / fr) / 2, 0, 0.98))
        if k < 2:  # a soprano opens the vowel on high notes: the first formants follow the pitch up
            fr = np.maximum(fr, f * (1.08 if k == 0 else 2.05))
        y += db(g) * svf(fuente, fr, res, 'bp')
    y += 0.04 * svf(fuente, 6000, 0.0, 'hp')  # air
    return filtro(y, 'highpass', 150) * 3.0


def solista(notas, semilla=0, vib=18, glide=0.06, ataque=0.03, suelta=0.25, cents=0.0, brillo=1600):
    """A soft gliding lead: two detuned saws and a square an octave down through a gentle lowpass. Mono."""
    f, amp, rng = _curvas(notas, glide, ataque, suelta, semilla, vib, cents)
    nm = len(f)
    w = sierra(f * 2 ** (6 / 1200), rng.uniform()) + sierra(f * 2 ** (-6 / 1200), rng.uniform()) + 0.5 * cuadrada(f / 2, 0.5, rng.uniform())
    w = svf(w, brillo * (0.6 + 0.6 * amp), 0.2)
    soplo = svf(rng.standard_normal(nm), f * 2, 0.5, 'bp') * 0.08
    return (w * 0.4 + soplo) * amp


def cantar(C, pista, t0, notas, vel=100, oct=0, semilla=0, ancho=8.0, fuente=None, **kw):
    """A phrase (from frase) on the voice or the lead from beat t0: one voice in the centre, two quieter
    doubles a few cents sharp and flat on each side."""
    fuente = fuente or voz
    s0 = C.seg(t0)
    ns = [(C.seg(t0 + b) - s0, C.seg(t0 + b + d) - C.seg(t0 + b), m + 12 * oct, vel) for b, d, m in notas]
    c = fuente(ns, semilla=semilla, **kw)
    l = fuente(ns, semilla=semilla + 101, cents=-ancho, **kw)
    r = fuente(ns, semilla=semilla + 202, cents=ancho, **kw)
    n = min(len(c), len(l), len(r))
    pista.pegar(t0, np.array([c[:n] + 0.45 * l[:n], c[:n] + 0.45 * r[:n]]) / 1.3)


def tercera(notas, t0, pcs):
    """A second voice: the nearest chord tone a third or more below each note. pcs(beat) gives the chord."""
    out = []
    for b, d, m in notas:
        ch = pcs(t0 + b)
        k = next(k for k in range(3, 10) if (m - k) % 12 in ch)
        out.append((b, d, m - k))
    return out


# --- Drums ---------------------------------------------------------------------------------

def golpe(tipo, vel, rng):
    a = (vel / 127) ** 1.4
    if tipo == 'bombo':
        nm = int(0.55 * SR)
        t = np.arange(nm) / SR
        f = 47 + 105 * np.exp(-t / 0.032) + 260 * np.exp(-t / 0.004)
        cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.exp(-t / 0.22) * 0.85 + 0.15 * np.exp(-t / 0.05))
        clic = filtro(rng.standard_normal(nm), 'highpass', 3000) * np.exp(-t / 0.0025) * 0.25
        w = satura(cuerpo + clic, 1.5)
    elif tipo == 'bombo909':  # punchy house kick: a fast pitch drop, a short body, a click on top
        nm = int(0.42 * SR)
        t = np.arange(nm) / SR
        f = 50 + 190 * np.exp(-t / 0.016) + 500 * np.exp(-t / 0.002)
        cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.where(t < 0.04, 1.0, np.exp(-(t - 0.04) / 0.13))
        clic = filtro(rng.standard_normal(nm), 'highpass', 4000) * np.exp(-t / 0.0015) * 0.45
        w = satura(cuerpo + clic, 2.2)
    elif tipo == 'abierto909':
        nm = int(0.3 * SR)
        t = np.arange(nm) / SR
        metal = sum(cuadrada(np.full(nm, fr * 1.3), 0.5, rng.uniform()) for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
        r = filtro(filtro(0.6 * metal / 3 + 0.5 * rng.standard_normal(nm), 'highpass', 8000, 4), 'lowpass', 16000)
        w = r * 1.4 * np.exp(-t / 0.075) * np.minimum(1, t / 0.001)
    elif tipo == 'palmas':
        nm = int(0.45 * SR)
        t = np.arange(nm) / SR
        r = svf(rng.standard_normal(nm), 1250, 0.45, 'bp') + 0.3 * svf(rng.standard_normal(nm), 2600, 0.3, 'bp')
        env = sum(np.exp(-np.maximum(0, t - k * 0.0105) / 0.0035) * (t >= k * 0.0105) for k in range(3))
        w = r * 1.6 * (env + 0.7 * np.exp(-np.maximum(0, t - 0.032) / 0.11) * (t >= 0.032))
    elif tipo == 'rim':
        nm = int(0.08 * SR)
        t = np.arange(nm) / SR
        w = (0.7 * np.sin(2 * np.pi * 1720 * t) + 0.5 * np.sin(2 * np.pi * 510 * t)
             + 0.4 * filtro(rng.standard_normal(nm), 'highpass', 2500)) * np.exp(-t / 0.012)
    elif tipo in ('charles', 'abierto', 'ride'):
        nm = int({'charles': 0.12, 'abierto': 0.5, 'ride': 1.4}[tipo] * SR)
        t = np.arange(nm) / SR
        metal = sum(cuadrada(np.full(nm, fr * (1.6 if tipo == 'ride' else 1.0)), 0.5, rng.uniform())
                    for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
        r = 0.55 * metal / 3 + 0.45 * rng.standard_normal(nm)
        r = filtro(filtro(r, 'highpass', 7200 if tipo != 'ride' else 5000, 4), 'lowpass', 15000)
        tau = {'charles': 0.028, 'abierto': 0.16, 'ride': 0.45}[tipo]
        w = r * np.exp(-t / tau) * (1.3 if tipo == 'charles' else 1.0) * np.minimum(1, t / 0.0015)
    elif tipo == 'shaker':
        nm = int(0.1 * SR)
        t = np.arange(nm) / SR
        r = svf(rng.standard_normal(nm), 7500, 0.3, 'bp')
        w = r * 2.2 * np.minimum(1, t / 0.009) * np.exp(-t / 0.028)
    elif tipo in ('conga', 'conga alta'):
        nm = int(0.3 * SR)
        t = np.arange(nm) / SR
        f0 = 205 if tipo == 'conga' else 310
        f = f0 * (1 + 0.08 * np.exp(-t / 0.02))
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13) + 0.3 * svf(rng.standard_normal(nm), f0 * 4, 0.3, 'bp') * np.exp(-t / 0.008)
    elif tipo == 'crash':
        nm = int(3.0 * SR)
        t = np.arange(nm) / SR
        metal = sum(cuadrada(np.full(nm, fr * 1.9), 0.5, rng.uniform()) for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
        r = filtro(0.4 * metal / 3 + rng.standard_normal(nm), 'highpass', 3500, 2)
        w = r * 0.8 * np.exp(-t / 0.9) * np.minimum(1, t / 0.002)
    elif tipo == 'impacto':
        nm = int(2.5 * SR)
        t = np.arange(nm) / SR
        f = 38 + 50 * np.exp(-t / 0.08)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.7) + 0.2 * filtro(rng.standard_normal(nm), 'lowpass', 600) * np.exp(-t / 0.3)
    else:
        raise ValueError(tipo)
    k = min(64, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


def subida(segundos, lo=250, hi=7000, rng=None):
    """A riser: noise through a bandpass that climbs, swelling."""
    rng = rng or np.random.default_rng(5)
    nm = int(segundos * SR)
    u = np.linspace(0, 1, nm)
    fc = lo * (hi / lo) ** (u ** 1.6)
    w = svf(rng.standard_normal(nm), fc, 0.6, 'bp') * u ** 2.2
    return np.array([w, retardo_mod(w, 12, 0, 0)])


def bajada(segundos, rng=None):
    """The riser backwards in spirit: a filtered whoosh that falls away after a drop."""
    rng = rng or np.random.default_rng(6)
    nm = int(segundos * SR)
    u = np.linspace(0, 1, nm)
    fc = 6000 * (200 / 6000) ** (u ** 0.7)
    w = svf(rng.standard_normal(nm), fc, 0.4, 'bp') * (1 - u) ** 2.5
    return np.array([w, retardo_mod(w, 9, 0, 0)])


def vinilo(segundos, densidad=7.0, semilla=3):
    """Crackle: sparse clicks of random size, a few pops and a faint hiss."""
    rng = np.random.default_rng(semilla)
    nm = int(segundos * SR)
    imp = np.zeros((2, nm))
    for c in range(2):
        k = rng.poisson(densidad * segundos)
        pos = rng.integers(0, nm, k)
        imp[c, pos] = rng.standard_normal(k) * np.minimum(rng.pareto(2.5, k), 3.0) * 0.3
    clics = np.array([svf(imp[c], 3200, 0.2, 'bp') for c in range(2)]) * 3
    siseo = filtro(filtro(rng.standard_normal((2, nm)), 'lowpass', 4000), 'highpass', 300) * 0.012
    return clics + siseo


def lluvia(segundos, semilla=4):
    """Soft rain on a roof: brown-ish noise plus many tiny drops."""
    rng = np.random.default_rng(semilla)
    nm = int(segundos * SR)
    base = filtro(filtro(rng.standard_normal((2, nm)), 'lowpass', 2500), 'highpass', 200) * 0.25
    gotas = np.zeros((2, nm))
    for c in range(2):
        k = rng.poisson(60 * segundos)
        gotas[c, rng.integers(0, nm, k)] = rng.uniform(0.1, 1, k) * 0.5
    gotas = np.array([svf(gotas[c], 4500, 0.5, 'bp') for c in range(2)])
    lento = 0.8 + 0.2 * np.sin(2 * np.pi * np.arange(nm) / SR / 9.0)
    return (base + gotas) * lento


# --- Song, tracks, automation -----------------------------------------------------------------

class Pista:
    def __init__(self, cancion, nombre, inst=None, vol=0.0, pan=0.0, ancho=1.0, reverb=0.0, sala=0.0,
                 eco=None, duck=0.0, hp=None, lp=None, coro=None, tremolo=None, satura=None, kw=None):
        self.__dict__.update({k: v for k, v in locals().items() if k != 'self'})
        self.kw = kw or {}
        self.eventos = []  # (beat, beats, tono, vel, extra)
        self.audio = []  # (beat, stereo array)
        self.filtro = None  # (points, res) for a sweeping lowpass
        self.nivel = None  # points (beat, dB) for volume automation

    def nota(self, beat, dur, tono, vel=100, **extra):
        self.eventos.append((beat, dur, nota(tono), vel, extra))

    def acorde(self, beat, dur, tonos, vel=100, rasgueo=0.0, **extra):
        for k, x in enumerate(tonos):
            self.nota(beat + k * rasgueo, dur - k * rasgueo, x, vel - 3 * k, **extra)

    def golpe(self, beat, tipo, vel=100):
        self.eventos.append((beat, 0, tipo, vel, {}))

    def pegar(self, beat, buf):
        if buf.ndim == 1:
            buf = np.array([buf, buf])
        self.audio.append((beat, buf))


class Cancion:
    def __init__(self, bpm, compases, swing=0.5, semilla=1):
        self.bpm, self.compases, self.swing = bpm, compases, swing
        self.pistas = []
        self.rng = np.random.default_rng(semilla)
        self.beat_s = 60.0 / bpm
        self.pistas_guardadas = None

    def pista(self, nombre, inst=None, **kw):
        p = Pista(self, nombre, inst, **kw)
        self.pistas.append(p)
        return p

    def seg(self, beat):
        """Seconds; swing pushes every second sixteenth of an eighth to `swing` of the eighth."""
        e = np.floor(beat * 2 + 1e-9) / 2
        f = beat - e
        if abs(f - 0.25) < 1e-6:
            f = self.swing * 0.5
        return e * self.beat_s + f * self.beat_s

    def curva(self, puntos, total, log=False):
        """Automation: (beat, value) points joined by straight lines (in log space for frequencies)."""
        xs = np.array([self.seg(b) * SR for b, _ in puntos])
        ys = np.array([v for _, v in puntos], dtype=float)
        if log:
            ys = np.log(ys)
        y = np.interp(np.arange(total), xs, ys)
        return np.exp(y) if log else y

    def _bombos(self):
        return sorted(self.seg(b) for p in self.pistas for (b, d, t, v, e) in p.eventos if t in ('bombo', 'bombo909'))

    def _bombeo(self, total):
        """Sidechain shape: dips at each kick and climbs back over most of a beat."""
        env = np.zeros(total)
        largo = int(self.beat_s * 0.95 * SR)
        t = np.arange(largo) / SR
        rec = self.beat_s * 0.62
        forma = np.minimum(1, t / 0.004) * np.clip(1 - t / rec, 0, 1) ** 1.8
        for s in self._bombos():
            i0 = int(round(s * SR))
            i1 = min(total, i0 + largo)
            if i0 < total:
                env[i0:i1] = np.maximum(env[i0:i1], forma[:i1 - i0])
        return env

    def render(self, cola=7.0, informe=True, salas=((3.4, 5500, 30), (0.9, 7000, 8)), brillo=0.5):
        total = int((self.compases * 4 * self.beat_s + cola) * SR)
        maestro = np.zeros((2, total))
        envios = [np.zeros((2, total)) for _ in salas]
        bombeo = self._bombeo(total)
        filas = []
        for p in self.pistas:
            buf = np.zeros((2, total))
            rng = np.random.default_rng(zlib.crc32(p.nombre.encode()))
            for (b, d, t, v, extra) in p.eventos:
                i0 = int(round(self.seg(b) * SR)) + int(extra.get('desfase', 0) * SR)
                if i0 >= total or i0 < 0:
                    continue
                if p.inst is None:
                    w = golpe(t, v, rng)
                    w = np.array([w, w])
                else:
                    dur = self.seg(b + d) - self.seg(b)
                    w = INSTRUMENTOS[p.inst](t, dur, v, rng, **dict(p.kw, **{k: x for k, x in extra.items() if k != 'desfase'}))
                i1 = min(total, i0 + w.shape[1])
                buf[:, i0:i1] += w[:, :i1 - i0]
            for (b, a) in p.audio:
                i0 = int(round(self.seg(b) * SR))
                i1 = min(total, i0 + a.shape[1])
                buf[:, i0:i1] += a[:, :i1 - i0]
            if p.hp:
                buf = filtro(buf, 'highpass', p.hp)
            if p.lp:
                buf = filtro(buf, 'lowpass', p.lp)
            if p.filtro:
                puntos, res = p.filtro
                fc = self.curva(puntos, total, log=True)
                buf = np.array([svf(buf[c], fc, res) for c in range(2)])
            if p.satura:
                buf = satura(buf, p.satura)
            if p.coro:
                buf = coro(buf, *p.coro)
            if p.tremolo:  # (Hz, depth): the suitcase piano's auto-pan
                hzt, prof = p.tremolo
                lfo = np.sin(2 * np.pi * hzt * np.arange(total) / SR)
                buf[0] *= 1 - prof * (0.5 + 0.5 * lfo)
                buf[1] *= 1 - prof * (0.5 - 0.5 * lfo)
            if p.ancho != 1.0:
                mid = 0.5 * (buf[0] + buf[1])
                lado = 0.5 * (buf[0] - buf[1]) * p.ancho
                buf = np.array([mid + lado, mid - lado])
            ang = (p.pan + 1) * np.pi / 4
            buf[0] *= np.cos(ang) * np.sqrt(2)
            buf[1] *= np.sin(ang) * np.sqrt(2)
            if p.eco:  # (beats, feedback, mix, lowpass Hz)
                beats, fb, mezcla, lp = p.eco
                buf = eco(buf, beats * self.beat_s, fb, mezcla, lp)
            buf *= db(p.vol)
            if p.nivel:
                buf *= db(self.curva(p.nivel, total))
            if p.duck:
                buf *= 1 - p.duck * bombeo
            maestro += buf
            for k, cant in enumerate((p.reverb, p.sala)):
                if cant and k < len(envios):
                    envios[k] += buf * cant
            filas.append((_rms_db(buf), p.nombre))
            if self.pistas_guardadas is not None:
                self.pistas_guardadas[p.nombre] = buf.astype(np.float32)
        for (rt, osc, pre), env in zip(salas, envios):
            r = reverb(filtro(env, 'highpass', 220), rt, osc, pre)
            maestro += r * (1 - 0.35 * bombeo)
        maestro = filtro(maestro, 'highpass', 24)
        # low end in mono: below 130 Hz the sides are dropped
        mid = 0.5 * (maestro[0] + maestro[1])
        lado = 0.5 * (maestro[0] - maestro[1])
        lado = filtro(lado, 'highpass', 130)
        maestro = np.array([mid + lado, mid - lado])
        if brillo:  # a broad lift around 3-8 kHz: presence without harshness
            maestro = maestro + brillo * sosfilt(butter(1, [2800, 8500], btype='bandpass', fs=SR, output='sos'), maestro, axis=-1)
        fin = int(2.5 * SR)
        maestro[:, -fin:] *= np.linspace(1, 0, fin) ** 2
        if informe:
            for v, nombre in sorted(filas, reverse=True):
                print(f'  {v:6.1f} dB  {nombre}')
        return maestro


def _rms_db(buf):
    x = buf.mean(axis=0)
    w = SR // 10
    v = np.sqrt(np.mean(x[:len(x) // w * w].reshape(-1, w) ** 2, axis=1))
    activo = v[v > 1e-4]
    return 20 * np.log10(np.mean(activo) + 1e-12) if len(activo) else -99


# --- Writing music -------------------------------------------------------------------------

def frase(texto, oct=0):
    """Bars of sixteenths separated by '|': 'G5:6 F5:2 Eb5:8 | _:4 ...'. '-' rests, '_' ties onto the note
    before. Returns [(beat, beats, midi)]."""
    notas, pos = [], 0
    for i, compas in enumerate(texto.split('|')):
        suma = 0
        for tok in compas.split():
            nombre, d = tok.split(':')
            d = int(d)
            if nombre == '_':
                b, dd, m = notas[-1]
                notas[-1] = (b, dd + d / 4, m)
            elif nombre != '-':
                notas.append((pos / 4, d / 4, nota(nombre) + 12 * oct))
            pos += d
            suma += d
        if compas.strip() and suma != 16:
            raise ValueError(f'compás {i + 1} suma {suma} semicorcheas: {compas}')
    return notas


def ritmo(pista, t0, patron, tipo, vel=100, compases=1, humano=0.0, rng=None):
    """16 characters a bar: X accent, x hit, o soft, . nothing."""
    for c in range(compases):
        for k, ch in enumerate(patron.replace(' ', '')):
            if ch == '.':
                continue
            v = {'X': vel + 14, 'x': vel, 'o': vel - 28}[ch]
            if humano and rng is not None:
                v = int(np.clip(v + rng.normal(0, humano), 1, 127))
            pista.golpe(t0 + c * 4 + k / 4, tipo, v)


def revisa(nombre, notas, acordes):
    """Tune notes a beat or longer that start on a beat outside their chord (chords as pitch-class sets, one a bar
    or (beat, set) pairs). Prints them to check by eye; a semitone off a chord tone is flagged."""
    malas = []
    for b, d, m in notas:
        if d < 1 or b % 1:
            continue
        ch = acordes(b)
        if m % 12 in ch:
            continue
        tipo = 'CHOQUE' if any((m - c) % 12 in (1, 11) for c in ch) else 'tensión'
        malas.append(f'{tipo} compás {int(b // 4) + 1} t{b % 4 + 1:g}')
    print(f'{nombre}:', malas or 'todo dentro de los acordes')


# --- Output --------------------------------------------------------------------------------

def lufs(ruta):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', ruta, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    resumen = out[out.rfind('Summary:'):]
    i = float(resumen.split('I:')[1].split('LUFS')[0])
    lra = float(resumen.split('LRA:')[1].split('LU')[0])
    pico = float(resumen.split('Peak:')[1].split('dBFS')[0])
    return i, lra, pico


def guardar_wav(ruta, buf):
    import wave
    x = np.clip(buf.T, -1, 1)
    datos = (x * 32767).astype('<i2').tobytes()
    with wave.open(ruta, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(datos)


def exportar(buf, base, objetivo=-14.0, kbps=192):
    """Glue compression, limiter, loudness to `objetivo` LUFS, then WAV and MP3."""
    buf = compresor(buf, umbral=-18, ratio=1.8, ataque_ms=15, suelta_ms=180)
    buf = buf / np.max(np.abs(buf)) * db(-3)
    guardar_wav(base + '.wav', limitador(buf, -1.0))
    i, _, _ = lufs(base + '.wav')
    for _ in range(3):
        buf = buf * db(objetivo - i)
        lim = limitador(buf, -1.2)
        guardar_wav(base + '.wav', lim)
        i, lra, pico = lufs(base + '.wav')
        if abs(i - objetivo) < 0.3:
            break
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', base + '.wav', '-codec:a', 'libmp3lame',
                    '-b:a', f'{kbps}k', base + '.mp3'], check=True)
    print(f'{base}: {i:.1f} LUFS, LRA {lra:.1f}, pico {pico:.1f} dBFS')
    return lim


def exportar_bucle(buf, base, largo_s, desde_s, objetivo=-14.0, margen=0.5, kbps=96, ar=24000, salida=None):
    """`buf` holds three rounds of `largo_s` seconds, the second starting at `desde_s`: keeps that one with
    `margen` seconds either side. The rounds are not sample-identical (humanised hits, noise), so the end of
    the loop fades into what really comes just before its start, and the jump back joins neighbours. Mastered
    as `exportar`, then an MP3 at `ar` samples a second (the game decodes music at 24 kHz: docs/ESTILO.md)."""
    buf = compresor(buf, umbral=-18, ratio=1.8, ataque_ms=15, suelta_ms=180)
    a, fin = int(round(desde_s * SR)), int(round((desde_s + largo_s) * SR))
    m = int(round(margen * SR))
    trozo = buf[:, a - m:fin + m].copy()
    f0, f1 = trozo.shape[1] - m - int(0.2 * SR), trozo.shape[1] - m - int(0.06 * SR)
    w = np.clip((np.arange(f0, trozo.shape[1]) - f0) / (f1 - f0), 0, 1)
    w = 0.5 - 0.5 * np.cos(np.pi * w)
    desplaza = fin - a
    trozo[:, f0:] = (1 - w) * trozo[:, f0:] + w * buf[:, a - m + f0 - desplaza:a - m + trozo.shape[1] - desplaza]
    trozo = trozo / np.max(np.abs(trozo)) * db(-3)
    guardar_wav(base + '.wav', limitador(trozo, -1.0))
    i, _, _ = lufs(base + '.wav')
    for _ in range(3):
        trozo = trozo * db(objetivo - i)
        guardar_wav(base + '.wav', limitador(trozo, -1.2))
        i, lra, pico = lufs(base + '.wav')
        if abs(i - objetivo) < 0.3:
            break
    salida = salida or base + '.mp3'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', base + '.wav', '-ar', str(ar), '-codec:a', 'libmp3lame',
                    '-b:a', f'{kbps}k', salida], check=True)
    print(f'{salida}: {i:.1f} LUFS, LRA {lra:.1f}, pico {pico:.1f} dBFS; bucle de {margen:.6f} a {margen + largo_s:.6f} s')
