# SoundFont pieces mixed like a small studio: every instrument is rendered alone and dry by
# FluidSynth (MuseScore General), then filtered, panned, levelled and sent to one room in numpy,
# and mastered and cut into loops with sinte's tools. MIDI on a General MIDI bank is how the
# classic LucasArts adventures sounded; mixing the stems ourselves is what lifts it above a
# plain FluidSynth render. Also the jazz kit: walking bass, rootless piano voicings, brushes.
import os
import random
import subprocess
import tempfile
import numpy as np
import mido
from scipy.io import wavfile
from partitura import Pieza
from sinte import SR, _sala, _filtro, _eco, _rms_db, db, acorde, acorde_en, midi

SF = os.environ.get('SF', '/usr/share/sounds/sf2/MuseScore_General_Full.sf2')


class Orquesta(Pieza):
    """A Pieza whose channels are mixed here: instrumento() names a channel and its place in the
    mix (vol dB, pan -1..1, reverb send, high/low-pass Hz). `sala` is the room's length in seconds."""

    def __init__(self, bpm, swing=0.5, semilla=1, sala=1.4):
        super().__init__(bpm, swing=swing, semilla=semilla)
        self.sonidos = {}
        self.rt = sala

    def instrumento(self, canal, nombre, programa, vol=0.0, pan=0.0, reverb=0.2, hp=None, lp=None, drive=None, comp=None, eco=None):
        """drive: dB pushed into a soft clipper (an amp's grit; lp after it is the cabinet).
        comp = (threshold dB, ratio): a compressor on this channel. eco = (beats, feedback, mix,
        lowpass Hz): a ping-pong delay, as in sinte."""
        self.programa(canal, programa)
        self.mezcla(canal, 100, 64, 0, 0)
        self.sonidos[canal] = (nombre, vol, pan, reverb, hp, lp, drive, comp, eco)
        return canal

    def cuerda(self, canal, beat, dur, nota, vel, sube=0.0, cuando=0.25, vib=0.0, vib_hz=5.5, legato=0.95):
        """A guitar note with a bend: it starts `sube` semitones below and bends up to the note
        over the first `cuando` of it, then (vib cents) a finger vibrato. Needs rango_bend."""
        rango = getattr(self, 'bend', 2)
        m = midi(nota)
        base = m - sube
        ev = self.eventos.setdefault(canal, [])
        t0, t1 = self.tick(beat), self.tick(beat + dur * legato)
        ev.append((t0, mido.Message('pitchwheel', channel=canal, pitch=0)))
        ev.append((t0, mido.Message('note_on', channel=canal, note=int(base), velocity=int(vel))))
        pasos = 48
        for k in range(1, pasos + 1):
            u = k / pasos
            t = t0 + int((t1 - t0) * u)
            subida = sube * min(1.0, u / cuando) ** 0.7 if sube else 0.0
            vibrato = vib / 100 * np.sin(2 * np.pi * vib_hz * (u * dur * 60 / self.bpm)) * min(1.0, max(0.0, (u - cuando) / 0.2)) if vib else 0.0
            ev.append((t, mido.Message('pitchwheel', channel=canal, pitch=max(-8192, min(8191, int((subida + vibrato) / rango * 8191))))))
        ev.append((t1, mido.Message('note_off', channel=canal, note=int(base), velocity=0)))
        ev.append((t1 + 1, mido.Message('pitchwheel', channel=canal, pitch=0)))

    def segundos(self, beat):
        return self.tick(beat) / self.ppq * 60.0 / self.bpm

    def render(self, hasta=None, informe=True, cola=4.0, chip=None, pegamento=None):
        """The mix as a (2, n) array. `hasta` (beats) cuts it there, for the loops. `chip` is a
        sinte.Cancion at the same tempo mixed in (its own effects and room). `pegamento` =
        (threshold dB, ratio) glues the whole mix with a gentle bus compressor."""
        stems = {}
        with tempfile.TemporaryDirectory() as d:
            self.guardar(f'{d}/todo.mid')
            mid = mido.MidiFile(f'{d}/todo.mid')
            for k, pista in enumerate(mid.tracks[1:]):
                canal = next((m.channel for m in pista if hasattr(m, 'channel')), None)
                if canal is None:
                    continue
                solo = mido.MidiFile(ticks_per_beat=mid.ticks_per_beat)
                solo.tracks.append(mid.tracks[0])
                pista = pista.copy()
                # a silent controller after the end, so the last notes' tails are rendered too
                pista.insert(len(pista) - 1 if pista and pista[-1].is_meta else len(pista),
                             mido.Message('control_change', channel=canal, control=110, value=0, time=int(cola * mid.ticks_per_beat * self.bpm / 60)))
                solo.tracks.append(pista)
                solo.save(f'{d}/{k}.mid')
                subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.6', '-r', str(SR), '-R', '0', '-C', '0', '-F', f'{d}/{k}.wav', SF, f'{d}/{k}.mid'],
                               check=True, capture_output=True)
                _, x = wavfile.read(f'{d}/{k}.wav')
                stems[canal] = x.T.astype(np.float64) / 32768
        total = int(self.segundos(hasta) * SR) if hasta is not None else max(x.shape[1] for x in stems.values())
        maestro = np.zeros((2, total))
        envio = np.zeros((2, total))
        filas = []
        for canal, x in stems.items():
            nombre, vol, pan, rev, hp, lp, drive, comp, eco = self.sonidos.get(canal, (f'canal {canal}', 0, 0, 0.2, None, None, None, None, None))
            buf = np.zeros((2, total))
            m = min(total, x.shape[1])
            buf[:, :m] = x[:, :m]
            if hp:
                buf = _filtro(buf, 'highpass', hp)
            if drive:
                g = db(drive)
                pico = np.max(np.abs(buf)) + 1e-9
                buf = np.tanh(buf / pico * g) / np.tanh(g) * pico
            if comp:
                buf = compresor(buf, *comp)
            if lp:
                buf = _filtro(buf, 'lowpass', lp)
            ang = (pan + 1) * np.pi / 4
            buf[0] *= np.cos(ang) * np.sqrt(2)
            buf[1] *= np.sin(ang) * np.sqrt(2)
            if eco:
                buf = _eco(buf, eco, 60.0 / self.bpm)
            buf *= db(vol)
            maestro += buf
            envio += buf * rev
            filas.append((_rms_db(buf), nombre))
        maestro += _sala(envio, self.rt)
        if chip is not None:
            c = chip.render(hasta=hasta, informe=informe)
            m = min(total, c.shape[1])
            maestro[:, :m] += c[:, :m]
        maestro = _filtro(maestro, 'highpass', 30)
        if pegamento:
            maestro = compresor(maestro, *pegamento, ataque=0.01, suelta=0.15)
        if informe:
            for v, nombre in sorted(filas, reverse=True):
                print(f'  {v:6.1f} dB  {nombre}')
        return maestro


def compresor(x, umbral_db, ratio, ataque=0.003, suelta=0.08):
    """A feed-forward compressor, linked across the two sides: an RMS level (10 ms), a gain that
    pulls whatever passes the threshold down by `ratio`, smoothed with attack and release."""
    from scipy.signal import lfilter
    a = 1 - np.exp(-1 / (0.01 * SR))
    nivel = np.sqrt(lfilter([a], [1, a - 1], np.mean(x ** 2, axis=0)) + 1e-12)
    sobre = np.maximum(0, 20 * np.log10(nivel) - umbral_db)
    reduce = sobre * (1 - 1 / ratio)
    # attack then release, as two one-pole smoothings of the reduction (dB)
    for tau in (ataque, suelta):
        b = 1 - np.exp(-1 / (tau * SR))
        reduce = np.maximum(reduce, lfilter([b], [1, b - 1], reduce)) if tau == suelta else lfilter([b], [1, b - 1], reduce)
    return x * db(-reduce)


# --- Playing ----------------------------------------------------------------------------------

def tocar(O, canal, t0, notas, vel=96, oct=0, legato=0.9, acento=6, humano=0.012):
    """A phrase from sinte.frase, from beat t0 (a slide marker just plays the note)."""
    for b, d, m, *_ in notas:
        O.nota(canal, t0 + b, d, m + 12 * oct, vel + (acento if b % 1 == 0 else 0), legato=legato, humano=humano)


def raiz_en(ch, lo='E1', hi='D#2'):
    """The chord's bass note (the slash note if any) between lo and hi."""
    nota = ch.split('/')[1] if '/' in ch else None
    pc = (midi(nota + '4') % 12) if nota else acorde(ch)[0]
    return next(x for x in range(midi(lo), midi(hi) + 1) if x % 12 == pc)


def walking(O, canal, t0, acordes, vel=92, largo=4, semilla=0, final=None):
    """A walking bass in quarters: the root when the chord changes, chord tones while it lasts,
    and on the last beat before a change a step (chromatic or not) into the next root.
    `final` is the chord after the last one (the first, by default: loops)."""
    rnd = random.Random(semilla)
    golpes = [acorde_en(acordes, b, largo) for b in range(len(acordes) * largo)]
    golpes.append(final or acordes[0][0])
    lo, hi = midi('E1'), midi('D3')
    prev = None
    for b, ch in enumerate(golpes[:-1]):
        r, iv = acorde(ch)
        tonos_ = {(r + i) % 12 for i in iv}
        if b == 0 or golpes[b - 1] != ch:
            m = raiz_en(ch)
            if prev is not None:
                m = min((x for x in (m, m + 12) if x <= hi), key=lambda x: abs(x - prev))
        elif golpes[b + 1] != ch:
            obj = raiz_en(golpes[b + 1])
            obj = min((x for x in (obj, obj + 12) if x <= hi), key=lambda x: abs(x - prev))
            m = rnd.choice([obj + d for d in (1, -1, -1, 2, -2, 7) if obj + d != prev])
        else:
            cands = [x for x in range(prev - 5, prev + 6) if x % 12 in tonos_ and x != prev and lo <= x <= hi]
            m = rnd.choice(cands) if cands else prev
        m = max(lo, min(hi, m))
        O.nota(canal, t0 + b, 1, m, vel + (6 if b % 2 == 0 else 0), legato=0.88, humano=0.008)
        prev = m


VOCES = {'maj7': (4, 7, 11, 14), '6': (4, 7, 9, 14), '': (4, 7, 9, 14), '69': (4, 7, 9, 14), 'maj9': (4, 7, 11, 14),
         'm7': (3, 7, 10, 14), 'm9': (3, 7, 10, 14), 'm6': (3, 7, 9, 14), 'm': (3, 7, 9, 14), 'mmaj7': (3, 7, 11, 14),
         '7': (4, 9, 10, 14), '9': (4, 9, 10, 14), '7b9': (4, 7, 10, 13), 'm7b5': (3, 6, 10, 12), 'dim7': (3, 6, 9, 12),
         'dim': (3, 6, 9, 12), '7sus4': (5, 7, 10, 14), 'sus4': (5, 7, 10, 14), 'sus2': (2, 7, 9, 14), 'add9': (4, 7, 11, 14)}


def voz_jazz(ch, prev=None, lo='D3', hi='E5'):
    """A rootless four-note voicing (3rd and 7th at the core, 9th and 5th or 13th around them),
    in the inversion nearest the previous one."""
    r, _ = acorde(ch)
    calidad = ch.split('/')[0][1:].lstrip('#b')
    pcs_ = [(r + i) % 12 for i in VOCES[calidad]]
    opciones = []
    for rot in range(4):
        orden = pcs_[rot:] + pcs_[:rot]
        for base in range(midi(lo), midi(lo) + 12):
            if base % 12 != orden[0]:
                continue
            v = [base]
            for pc in orden[1:]:
                v.append(next(x for x in range(v[-1] + 1, v[-1] + 13) if x % 12 == pc))
            if v[-1] <= midi(hi):
                opciones.append(v)
    if prev is None:
        return min(opciones, key=lambda v: abs(sum(v) / 4 - midi('G4')))
    return min(opciones, key=lambda v: sum(abs(a - b) for a, b in zip(v, prev)))


RITMOS_COMP = [((0, 0.5),), ((1.5, 0.5),), ((0, 0.5), (1.5, 0.5)), ((0.5, 0.5), (2, 1)), ((0, 1.5),), ((1, 0.5), (1.5, 0.5))]


def comping(O, canal, t0, acordes, vel=70, largo=4, semilla=0, ritmos=None, prev=None):
    """Piano (or guitar) comping: short rootless chords on Charleston-like rhythms, each chord
    voice-led from the last. Returns the last voicing, to carry on from it."""
    rnd = random.Random(semilla)
    for i, cs in enumerate(acordes):
        mitad = largo / len(cs)
        for j, ch in enumerate(cs):
            v = voz_jazz(ch, prev)
            prev = v
            patron = rnd.choice(ritmos or RITMOS_COMP) if len(cs) == 1 else ((0, 0.5),) if rnd.random() < 0.6 else ((0.5, 0.5),)
            for b, d in patron:
                if b >= mitad and len(cs) > 1:
                    continue
                O.acorde(canal, t0 + i * largo + j * mitad + b, d, v, vel + rnd.randint(-6, 6), rasgueo=0.012, legato=0.8, humano=0.01)
    return prev


def escobillas(O, t0, compases, vel=80, largo=4, ride=True, relleno=None):
    """Brushes in swing: the ride's 'ding, ding-a ding, ding-a', a swirl on every beat, a tap and
    the hi-hat foot on two and four, the kick feathered on one and three."""
    for c in range(compases):
        b0 = t0 + c * largo
        for b in range(largo):
            O.nota(9, b0 + b, 1, 40, vel - 22, humano=0.006)          # swirl
            if b % 2:
                O.nota(9, b0 + b, 0.5, 38, vel + 2, humano=0.006)     # tap
                O.nota(9, b0 + b, 0.5, 44, vel - 8, humano=0.004)     # hi-hat foot
            else:
                O.nota(9, b0 + b, 0.5, 36, vel - 30, humano=0.004)    # feathered kick
            if ride:
                O.nota(9, b0 + b, 0.5, 51, vel - 14 + (8 if b % 2 else 0), humano=0.004)
                if b % 2:
                    O.nota(9, b0 + b + 0.5, 0.5, 51, vel - 24, humano=0.004)
    if relleno:
        O.nota(9, t0 + compases * largo - 0.5, 0.5, 38, vel + 10, humano=0.004)
