# Chiptune synth for the game's music, in the spirit of VVVVVV: band-limited pulse waves,
# NES-style triangle and noise, slides and delayed vibrato, a dotted-eighth echo, a small hall
# and the kick ducking the rest. No MIDI and no SoundFont: notes in beats go straight to audio.
# Everything is deterministic and sample-exact, so a loop cut from the middle of three identical
# rounds joins by itself (exportar_bucle).
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt, oaconvolve, resample_poly
from partitura import n

SR = 44100
NOMBRES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']


def hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69) / 12)


def midi(x):
    return n(x) if isinstance(x, str) else x


def db(x):
    return 10 ** (x / 20)


# --- Oscillators -------------------------------------------------------------------------

def _blep(t, dt):
    """PolyBLEP residual: smooths the jump of a sawtooth at phase 0 so it does not alias."""
    y = np.zeros_like(t)
    a = t < dt
    x = t[a] / dt[a]
    y[a] = x + x - x * x - 1
    b = t > 1 - dt
    x = (t[b] - 1) / dt[b]
    y[b] = x * x + x + x + 1
    return y


def _fase(f, sr=SR):
    dt = f / sr
    return np.concatenate(([0.0], np.cumsum(dt)[:-1])) % 1.0, dt


def _doble(x):
    """Twice the samples, linearly: for running an oscillator at twice the rate."""
    x = np.atleast_1d(x)
    if len(x) == 1:
        return x
    y = np.empty(2 * len(x))
    y[0::2] = x
    y[1::2] = np.concatenate((0.5 * (x[:-1] + x[1:]), x[-1:]))
    return y


def pulso(f, duty=0.5):
    """Band-limited pulse: the difference of two sawtooths a duty apart, PolyBLEP-smoothed and run
    at twice the rate (high notes stay clean). Peak to peak 1, no DC."""
    fase, dt = _fase(_doble(f), 2 * SR)
    t2 = (fase + _doble(duty)) % 1.0
    w = 0.5 * ((2 * fase - 1 - _blep(fase, dt)) - (2 * t2 - 1 - _blep(t2, dt)))
    return resample_poly(w, 1, 2)[:len(f)]


def triangulo(f, pasos=None):
    """Triangle; with `pasos` (16 on the NES) it is quantised, with the NES triangle's soft buzz."""
    if not pasos:
        fase, _ = _fase(f)
        return 0.5 * (1 - 4 * np.abs(fase - 0.5))
    fase, _ = _fase(_doble(f), 2 * SR)
    t = 1 - 4 * np.abs(fase - 0.5)
    t = np.round((t + 1) / 2 * (pasos - 1)) / (pasos - 1) * 2 - 1
    return resample_poly(0.5 * t, 1, 2)[:len(f)]


def seno(f):
    fase, _ = _fase(f)
    return 0.5 * np.sin(2 * np.pi * fase)


def campana(f, razon=3.5, indice=2.2, tau=0.35):
    """Two-operator FM bell: the brightness dies away faster than the note."""
    fase, _ = _fase(f)
    fm, _ = _fase(f * razon)
    t = np.arange(len(f)) / SR
    return 0.5 * np.sin(2 * np.pi * fase + indice * np.exp(-t / tau) * np.sin(2 * np.pi * fm))


def _lfsr(corto):
    """The NES noise channel's 15-bit shift register: long mode hisses, short mode rings metallic."""
    r, out = 1, []
    for _ in range(93 if corto else 32767):
        bit = (r ^ (r >> (6 if corto else 1))) & 1
        r = (r >> 1) | (bit << 14)
        out.append(r & 1)
    return np.array(out, dtype=float) * 2 - 1


_LARGO, _CORTO = _lfsr(False), _lfsr(True)


def ruido(nm, reloj=SR, corto=False, semilla=0):
    seq = _CORTO if corto else _LARGO
    i = (np.arange(nm) * (reloj / SR)).astype(np.int64) + semilla * 977
    return 0.5 * seq[i % len(seq)]


def _filtro(x, tipo, fc, orden=2):
    fc = min(fc, SR * 0.45)
    return sosfilt(butter(orden, fc, btype=tipo, fs=SR, output='sos'), x)


# --- Instruments ---------------------------------------------------------------------------

class Inst:
    """A melodic voice. adsr in seconds (sustain as a level). vib = (cents, Hz, delay s).
    glide: seconds of portamento into a note that starts as the previous one ends.
    doble: cents of detune for two voices, one per side (chorus). sub: a sine an octave down.
    pwm = (depth, Hz) of pulse-width wobble. arp = semitone offsets cycled at `arp_hz`.
    ataque = (semitones, seconds): a pitch blip at the start (a chip pluck).
    pasos: steps of a quantised triangle. fm = (ratio, index, seconds) for the bell."""

    def __init__(self, forma='pulso', duty=0.5, adsr=(0.003, 0.2, 0.7, 0.08), vib=None, glide=0.0,
                 doble=0, sub=0.0, pwm=None, arp=None, arp_hz=50.0, pasos=None, oct=0, ataque=None,
                 fm=(3.5, 2.2, 0.35), curva_vel=1.5):
        self.__dict__.update(locals())
        del self.__dict__['self']

    @property
    def cola(self):
        return self.adsr[3]


def envolvente(nm, gate, a, d, s, r):
    t = np.arange(nm) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4)))
    g = min(int(gate * SR), nm - 1)
    e[g:] = e[g] * np.exp(-(t[g:] - t[g]) / max(r / 5, 1e-4))
    k = min(64, nm)
    e[-k:] *= np.linspace(1, 0, k)  # never stop on a click
    return e


def sonar(inst, dur, m, vel, desde=None, deslizar=None, arp=None):
    """One note: (left, right) arrays. dur in seconds, m a MIDI number (float allowed).
    `arp` overrides the instrument's chip arpeggio (a chord in one note)."""
    nm = int((dur + inst.cola) * SR) + 1
    t = np.arange(nm) / SR
    tono = np.full(nm, float(m + 12 * inst.oct))
    if desde is not None:
        u = np.clip(t / max(deslizar or inst.glide or 0.04, 1e-3), 0, 1)
        tono = desde + 12 * inst.oct + (tono - desde - 12 * inst.oct) * (1 - (1 - u) ** 2)
    if inst.ataque:
        st, s = inst.ataque
        tono = tono + st * np.exp(-t / s)
    arp = arp or inst.arp
    if arp:
        offs = np.array(arp, dtype=float)
        tono = tono + offs[(t * inst.arp_hz).astype(int) % len(offs)]
    if inst.vib:
        c, f, retraso = inst.vib
        rampa = np.clip((t - retraso) / 0.25, 0, 1)
        tono = tono + c / 100 * np.sin(2 * np.pi * f * t) * rampa
    voces = [0.0] if not inst.doble else [inst.doble / 100, -inst.doble / 100]
    out = []
    for dv in voces:
        f = hz(tono + dv)
        if inst.forma == 'pulso':
            duty = inst.duty
            if inst.pwm:
                duty = np.clip(inst.duty + inst.pwm[0] * np.sin(2 * np.pi * inst.pwm[1] * t + dv * 40), 0.05, 0.95)
            w = pulso(f, duty)
        elif inst.forma == 'triangulo':
            w = triangulo(f, inst.pasos)
        elif inst.forma == 'seno':
            w = seno(f)
        elif inst.forma == 'campana':
            w = campana(f, *inst.fm)
        else:
            raise ValueError(inst.forma)
        if inst.sub:
            w = w + inst.sub * seno(f / 2)
        out.append(w)
    e = envolvente(nm, dur, *inst.adsr) * (vel / 127) ** inst.curva_vel
    if len(out) == 1:
        return out[0] * e, out[0] * e
    return out[0] * e, out[1] * e


# --- Drums ---------------------------------------------------------------------------------

def golpe(tipo, vel, semilla=0):
    a = (vel / 127) ** 1.3
    if tipo == 'bombo':  # sine sweep and a click, a little saturated
        nm = int(0.42 * SR)
        t = np.arange(nm) / SR
        f = 46 + 150 * np.exp(-t / 0.026)
        cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
        click = _filtro(ruido(nm, semilla=semilla), 'highpass', 2500) * np.exp(-t / 0.004) * 0.5
        w = np.tanh(1.6 * (cuerpo + click)) / np.tanh(1.6)
    elif tipo == 'bombo suave':  # a round, padded kick for the quiet pieces
        nm = int(0.35 * SR)
        t = np.arange(nm) / SR
        f = 50 + 70 * np.exp(-t / 0.03)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
        w *= np.minimum(1, t / 0.003)
    elif tipo == 'caja':  # NES-style hiss over a falling tone
        nm = int(0.32 * SR)
        t = np.arange(nm) / SR
        r = _filtro(_filtro(ruido(nm, semilla=semilla), 'highpass', 1200), 'lowpass', 9000)
        tono = triangulo(190 + 70 * np.exp(-t / 0.02)) * 2
        w = r * 1.4 * np.exp(-t / 0.1) + tono * 0.55 * np.exp(-t / 0.04)
    elif tipo in ('charles', 'abierto'):
        nm = int((0.08 if tipo == 'charles' else 0.38) * SR)
        t = np.arange(nm) / SR
        r = ruido(nm, semilla=semilla) + 0.35 * ruido(nm, reloj=SR * 0.93, corto=True)
        w = _filtro(r, 'highpass', 6500, 4) * 1.8 * np.exp(-t / (0.03 if tipo == 'charles' else 0.12))
    elif tipo == 'crash':
        nm = int(2.2 * SR)
        t = np.arange(nm) / SR
        r = ruido(nm, semilla=semilla) + 0.25 * ruido(nm, reloj=SR * 0.71, corto=True)
        w = _filtro(r, 'highpass', 4500, 2) * 1.3 * np.exp(-t / 0.55)
    elif tipo == 'shaker':
        nm = int(0.09 * SR)
        t = np.arange(nm) / SR
        r = _filtro(_filtro(ruido(nm, semilla=semilla), 'highpass', 5000, 2), 'lowpass', 11000)
        w = r * 1.4 * np.minimum(1, t / 0.012) * np.exp(-t / 0.03)
    elif tipo == 'clic':  # a rimshot-ish tick
        nm = int(0.06 * SR)
        t = np.arange(nm) / SR
        w = (np.sin(2 * np.pi * 1750 * t) * 0.7 + _filtro(ruido(nm, semilla=semilla), 'highpass', 3000) * 0.5) * np.exp(-t / 0.011)
    else:
        raise ValueError(tipo)
    k = min(64, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


# --- Score ---------------------------------------------------------------------------------

class Pista:
    """One voice of the mix with its own effects. vol in dB, pan -1..1, eco = (beats, feedback,
    mix, lowpass Hz) as a ping-pong delay, reverb = send to the hall, duck = how much the kick
    pushes it down (0..1), lp/hp = filters in Hz."""

    def __init__(self, cancion, nombre, inst=None, vol=0.0, pan=0.0, eco=None, reverb=0.15, duck=0.0, lp=None, hp=None):
        self.__dict__.update(locals())
        del self.__dict__['self']
        self.notas = []

    def nota(self, beat, dur, tono, vel=100, **extra):
        self.notas.append((beat, dur, tono, vel, extra))

    def golpe(self, beat, tipo, vel=100):
        self.notas.append((beat, 0, tipo, vel, {}))


class Cancion:
    def __init__(self, bpm, swing=0.5):
        self.bpm, self.swing = bpm, swing
        self.pistas = []
        self.marcas = {}

    def pista(self, nombre, inst=None, **kw):
        p = Pista(self, nombre, inst, **kw)
        self.pistas.append(p)
        return p

    def seg(self, beat):
        """Seconds from the start; swing moves the off-beat eighth to `swing` of the beat."""
        e = np.floor(beat + 1e-9)
        f = beat - e
        if abs(f - 0.5) < 1e-6:
            f = self.swing
        elif 0 < f < 1 and self.swing != 0.5 and abs(f * 2 - round(f * 2)) > 1e-6:
            # sixteenths stretch with the swung eighth
            f = f / 0.5 * self.swing if f < 0.5 else self.swing + (f - 0.5) / 0.5 * (1 - self.swing)
        return (e + f) * 60.0 / self.bpm

    def render(self, hasta=None, informe=True, cola=4.0):
        fin_notas = max(self.seg(b + d) for p in self.pistas for (b, d, *_r) in p.notas)
        total = int((self.seg(hasta) if hasta is not None else fin_notas + cola) * SR)
        maestro = np.zeros((2, total))
        envio = np.zeros((2, total))
        bombos = sorted(self.seg(b) for p in self.pistas for (b, d, t, v, e) in p.notas if t == 'bombo')
        duck = _duck(bombos, total, 60.0 / self.bpm)
        filas = []
        for p in self.pistas:
            buf = np.zeros((2, total))
            previa = None
            for k, (b, d, t, v, extra) in enumerate(sorted(p.notas, key=lambda x: x[0])):
                i0 = int(round(self.seg(b) * SR))
                if i0 >= total:
                    continue
                if p.inst is None:  # the noise depends on the place in the bar, so every round is the same
                    w = golpe(t, v, semilla=int(round(b % 4 * 4)) % 7)
                    l = r = w
                else:
                    m = midi(t)
                    dur = self.seg(b + d) - self.seg(b)
                    desde = extra.get('desde')
                    if desde is None and p.inst.glide and previa and abs(previa[0] - self.seg(b)) < 0.02:
                        desde = previa[1]
                    l, r = sonar(p.inst, dur, m, v, midi(desde) if desde is not None else None, extra.get('deslizar'), extra.get('arp'))
                    previa = (self.seg(b + d), m)
                i1 = min(total, i0 + len(l))
                buf[0, i0:i1] += l[:i1 - i0]
                buf[1, i0:i1] += r[:i1 - i0]
            if p.hp:
                buf = _filtro(buf, 'highpass', p.hp)
            if p.lp:
                buf = _filtro(buf, 'lowpass', p.lp)
            ang = (p.pan + 1) * np.pi / 4
            buf[0] *= np.cos(ang) * np.sqrt(2)
            buf[1] *= np.sin(ang) * np.sqrt(2)
            if p.eco:
                buf = _eco(buf, p.eco, 60.0 / self.bpm)
            buf *= db(p.vol)
            if p.duck:
                buf *= 1 - p.duck * duck
            maestro += buf
            envio += buf * p.reverb
            filas.append((_rms_db(buf), p.nombre))
        maestro += _sala(envio)
        maestro = _filtro(_filtro(maestro, 'highpass', 28), 'lowpass', 15000, 4)  # no highs for the MP3 to mangle
        if informe:
            for v, nombre in sorted(filas, reverse=True):
                print(f'  {v:6.1f} dB  {nombre}')
        return maestro


GM_GOLPES = {'bombo': 36, 'bombo suave': 36, 'caja': 38, 'clic': 37, 'charles': 42, 'abierto': 46, 'crash': 49, 'shaker': 82}


def a_midi(cancion, ruta, sonidos, kit=0, kit_mezcla=(100, 64, 30)):
    """The same score for a SoundFont (a MIDI file for render.sh): `sonidos` maps a pista's name to
    (GM program, volume, pan, reverb, legato), or for drums to a velocity scale (they all go to
    channel 10 with drum kit `kit`). Pistas left out are not played; slides, chip arpeggios and
    the synth's own effects stay behind. Timing and velocity get a little human wobble."""
    from partitura import Pieza
    P = Pieza(bpm=cancion.bpm, swing=cancion.swing, semilla=3)
    libres = iter([c for c in range(16) if c != 9])
    P.programa(9, kit)
    P.mezcla(9, *kit_mezcla)
    for p in cancion.pistas:
        if p.nombre not in sonidos:
            continue
        if p.inst is None:
            for b, d, t, v, _ in p.notas:
                P.nota(9, b, 0.25, GM_GOLPES[t], int(v * sonidos[p.nombre]), humano=0.006)
            continue
        prog, vol, pan, rev, legato = sonidos[p.nombre]
        c = next(libres)
        P.programa(c, prog)
        P.mezcla(c, vol, pan, rev)
        for b, d, t, v, _ in p.notas:
            P.nota(c, b, d, midi(t) + 12 * p.inst.oct, v, legato=legato, humano=0.008)
    P.guardar(ruta)


def _rms_db(buf):
    x = buf.mean(axis=0)
    w = SR // 10
    v = np.sqrt(np.mean(x[:len(x) // w * w].reshape(-1, w) ** 2, axis=1))
    activo = v[v > 1e-4]
    return 20 * np.log10(np.mean(activo) + 1e-12) if len(activo) else -99


def _duck(tiempos, total, beat_s):
    """Sidechain: a quick dip at every kick that recovers within an eighth or so."""
    env = np.zeros(total)
    largo = int(min(0.32, beat_s * 0.9) * SR)
    t = np.arange(largo) / SR
    forma = np.minimum(1, t / 0.006) * np.exp(-t / (beat_s * 0.22))
    for s in tiempos:
        i0 = int(round(s * SR))
        i1 = min(total, i0 + largo)
        if i0 < total:
            env[i0:i1] = np.maximum(env[i0:i1], forma[:i1 - i0])
    return env


def _eco(buf, eco, beat_s):
    tiempo, fb, mezcla, lp = eco
    d = int(round(tiempo * beat_s * SR))
    total = buf.shape[1]
    mono = buf.mean(axis=0)
    out = buf.copy()
    rep = mono
    for k in range(1, 9):
        rep = _filtro(rep, 'lowpass', lp) * (fb if k > 1 else 1.0)
        if np.max(np.abs(rep)) < 1e-4 or k * d >= total:
            break
        lado = (k - 1) % 2  # ping-pong: left, right, left...
        out[lado, k * d:] += mezcla * rep[:total - k * d]
        out[1 - lado, k * d:] += mezcla * 0.35 * rep[:total - k * d]
    return out


_IR = None


def _sala(envio):
    """A small, bright hall: decaying noise, the highs dying first, a little pre-delay."""
    global _IR
    if _IR is None:
        rng = np.random.default_rng(7)
        nm = int(2.4 * SR)
        t = np.arange(nm) / SR
        ir = np.zeros((2, nm))
        for c in range(2):
            ruido_ = rng.standard_normal(nm)
            bajo = _filtro(ruido_, 'lowpass', 700)
            medio = _filtro(_filtro(ruido_, 'highpass', 700), 'lowpass', 4000)
            alto = _filtro(ruido_, 'highpass', 4000)
            ir[c] = bajo * np.exp(-6.9 * t / 1.9) + medio * np.exp(-6.9 * t / 1.5) + alto * 0.7 * np.exp(-6.9 * t / 0.7)
            ir[c] *= np.minimum(1, t / 0.02)
        pre = int(0.018 * SR)
        ir = np.concatenate([np.zeros((2, pre)), ir], axis=1)
        _IR = ir / np.sqrt(np.sum(ir ** 2) / 2) * 0.5
    out = np.zeros_like(envio)
    for c in range(2):
        out[c] = oaconvolve(envio[c], _IR[c])[:envio.shape[1]]
    return out


# --- Writing music -------------------------------------------------------------------------

def frase(texto, oct=0, largo=16):
    """Bars of sixteenths, separated by '|': 'E5:3 A5:3 B5:2 C6:8 | ...'. '-' is a rest and
    '_' ties onto the note before (across the bar too); a name ending in '~' slides into the note
    from the one before. Returns [(beat, beats, midi)], or (beat, beats, midi, from) for a slide."""
    notas, pos = [], 0
    for i, compas in enumerate(texto.split('|')):
        suma = 0
        for tok in compas.split():
            nombre, d = tok.split(':')
            d = int(d)
            if nombre == '_':
                b, dd, *resto = notas[-1]
                notas[-1] = (b, dd + d / 4, *resto)
            elif nombre.endswith('~'):
                notas.append((pos / 4, d / 4, n(nombre[:-1]) + 12 * oct, notas[-1][2]))
            elif nombre != '-':
                notas.append((pos / 4, d / 4, n(nombre) + 12 * oct))
            pos += d
            suma += d
        if compas.strip() and suma != largo:
            raise ValueError(f'compás {i + 1} suma {suma} semicorcheas: {compas}')
    return notas


INTERVALOS = {'': (0, 4, 7), 'm': (0, 3, 7), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10),
              'sus4': (0, 5, 7), '7sus4': (0, 5, 7, 10), 'sus2': (0, 2, 7), 'add9': (0, 4, 7, 14), 'm9': (0, 3, 7, 10, 14),
              'dim': (0, 3, 6), '6': (0, 4, 7, 9), 'm6': (0, 3, 7, 9), 'maj9': (0, 4, 7, 11, 14), '9': (0, 4, 7, 10, 14)}


def acorde(nombre):
    """'F#m7' -> (root pitch class, intervals). A slash bass ('D/F#') is ignored here."""
    nombre = nombre.split('/')[0]
    raiz = nombre[0]
    resto = nombre[1:]
    if resto[:1] in ('#', 'b'):
        raiz += resto[0]
        resto = resto[1:]
    return n(raiz + '4') % 12, INTERVALOS[resto]


def pcs(nombre):
    r, iv = acorde(nombre)
    return {(r + i) % 12 for i in iv}


def bajo_de(nombre, oct=2):
    """The bass note of a chord (the slash note if there is one) in the given octave."""
    nota = nombre.split('/')[1] if '/' in nombre else acorde(nombre)[0]
    if isinstance(nota, str):
        nota = n(nota + '4') % 12
    return 12 * (oct + 1) + nota


def tonos(nombre, lo, hi):
    """The chord's tones between two notes, low to high."""
    s = pcs(nombre)
    return [x for x in range(midi(lo), midi(hi) + 1) if x % 12 in s]


def acorde_en(acordes, beat, largo=4):
    """The chord at a beat, with one or more chords per bar."""
    cs = acordes[int(beat // largo)]
    return cs[min(int((beat % largo) // (largo / len(cs))), len(cs) - 1)]


def revisa(nombre, notas, acordes, largo=4):
    """Prints tune notes that start on a beat outside the chord: tensions to check by eye.
    A semitone against a chord tone is flagged as a clash."""
    raras, choques = [], []
    for b, d, m, *_ in notas:
        if b % 1 or d < 0.5:
            continue
        ch = acorde_en(acordes, b, largo)
        r, iv = acorde(ch)
        p = (m - r) % 12
        if (m % 12) in pcs(ch):
            continue
        txt = f'compás {int(b // largo) + 1}, tiempo {b % largo + 1:g}: {NOMBRES[m % 12]} sobre {ch}'
        if any((p - i) % 12 in (1, 11) for i in iv if i % 12 != p) and p not in (2, 9):
            choques.append(txt)
        else:
            raras.append(txt)
    print(f'{nombre}: tensiones {raras or "ninguna"}; choques {choques or "ninguno"}')


def tercera_abajo(m, escala):
    """The scale tone two steps below (a diatonic third under the tune)."""
    abajo = [x for x in range(m - 6, m) if x % 12 in escala]
    return abajo[-2] if len(abajo) >= 2 else m - 3


def escala(tonica, modo='menor'):
    pasos = {'mayor': (0, 2, 4, 5, 7, 9, 11), 'menor': (0, 2, 3, 5, 7, 8, 10), 'dorico': (0, 2, 3, 5, 7, 9, 10)}[modo]
    r = n(tonica + '4') % 12
    return {(r + p) % 12 for p in pasos}


def tocar(pista, t0, notas, vel=100, oct=0, acento=6, **extra):
    """Plays a phrase (from frase) from beat t0; notes on the beat a little louder."""
    for b, d, m, *desde in notas:
        ex = dict(extra, desde=desde[0] + 12 * oct) if desde else extra
        pista.nota(t0 + b, d, m + 12 * oct, vel + (acento if b % 1 == 0 else 0), **ex)


def ritmo(pista, t0, patrones, tipo=None, vel=100, compases=1):
    """Drum or rhythm patterns as 16 characters per bar: X accent, x hit, o soft, . nothing."""
    for c in range(compases):
        for k, ch in enumerate(patrones):
            if ch == '.':
                continue
            v = {'X': vel + 14, 'x': vel, 'o': vel - 30}[ch]
            pista.golpe(t0 + c * len(patrones) / 4 + k / 4, tipo, v)


def voz_cerrada(ch, centro, k=3):
    """k chord tones in close position, as near a centre note as they can be (a pad's voicing)."""
    c = midi(centro)
    ts = tonos(ch, c - 12, c + 12)
    return min((ts[i:i + k] for i in range(len(ts) - k + 1)), key=lambda v: (abs(sum(v) / k - c), v[0]))


def arpegiar(pista, t0, acordes, patron=(0, 1, 2, 3, 4, 3, 2, 1), paso=0.25, desde='G3', vel=80, largo=4, dur=None):
    """Broken chords: the chord's tones from `desde` up, walked through in `patron`."""
    for k in range(int(len(acordes) * largo / paso)):
        b = k * paso
        ts = tonos(acorde_en(acordes, b, largo), desde, midi(desde) + 30)
        pista.nota(t0 + b, dur or paso, ts[patron[k % len(patron)] % len(ts)], vel + (8 if b % 1 == 0 else 0))


# --- Output --------------------------------------------------------------------------------

def _master(x, ganancia):
    """Static gain and a soft knee above 0.75 (never past 0.95): the same samples in, the same out."""
    y = x * ganancia
    a = np.abs(y)
    sobre = a > 0.75
    y[sobre] = np.sign(y[sobre]) * (0.75 + 0.2 * np.tanh((a[sobre] - 0.75) / 0.2))
    return y


def _wav(ruta, x):
    from scipy.io import wavfile
    wavfile.write(ruta, SR, (np.clip(x, -1, 1).T * 32767).astype(np.int16))


def ganancia_para(x, rms_db=-17.0):
    rms = np.sqrt(np.mean(x ** 2))
    return db(rms_db) / rms


def exportar(nombre, x, rms_db=-17.0, fundido=None, kbps=192):
    """The listening version: loudness to `rms_db`, an optional fade over the last seconds, MP3."""
    y = _master(x, ganancia_para(x, rms_db))
    if fundido:
        k = int(fundido * SR)
        y[:, -k:] *= np.linspace(1, 0, k) ** 2
    _wav(f'{nombre}.wav', y)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{nombre}.wav', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', f'{nombre}.mp3'], check=True)
    print(f'{nombre}.mp3: {y.shape[1] / SR:.1f} s, pico {np.max(np.abs(y)):.2f}')


def exportar_bucle(nombre, x, largo_s, rms_db=-17.0, margen=0.5, kbps=128):
    """x holds three identical rounds of `largo_s` seconds: keeps the middle one with `margen`
    seconds either side. The rounds are sample-identical (tails included), so playing from
    margen to margen + largo_s in a loop joins with no fade, whatever silence a decoder adds."""
    i0 = int(round((largo_s - margen) * SR))
    i1 = int(round((2 * largo_s + margen) * SR))
    medio = x[:, int(round(largo_s * SR)):int(round(2 * largo_s * SR))]
    y = _master(x[:, i0:i1], ganancia_para(medio, rms_db))
    a = y[:, int(margen * SR):int(margen * SR) + 4410]
    b = y[:, int((margen + largo_s) * SR):int((margen + largo_s) * SR) + 4410]
    print(f'  junta: diferencia máxima entre vueltas {np.max(np.abs(a - b)):.5f}')
    _wav(f'{nombre}.wav', y)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{nombre}.wav', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', f'{nombre}.mp3'], check=True)
    print(f'{nombre}.mp3: {y.shape[1] / SR:.2f} s, bucle de {margen} a {margen + largo_s:.6f} s')
