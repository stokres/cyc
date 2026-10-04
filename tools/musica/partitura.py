# Tiny score-to-MIDI helper: notes in beats, swing, humanised velocity and timing.
import random
import mido

NOTAS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def n(nombre):
    """'F#4' -> MIDI number (C4 = 60)."""
    letra, resto = nombre[0], nombre[1:]
    alt = 0
    while resto and resto[0] in '#b':
        alt += 1 if resto[0] == '#' else -1
        resto = resto[1:]
    return 12 * (int(resto) + 1) + NOTAS[letra] + alt

class Pieza:
    def __init__(self, bpm, swing=0.5, ppq=480, semilla=1):
        self.bpm, self.swing, self.ppq = bpm, swing, ppq
        self.eventos = {}  # canal -> list of (tick, msg)
        self.programas = {}
        self.tempos = []  # (beat, bpm) changes after the start
        random.seed(semilla)

    def tempo(self, beat, bpm):
        """A tempo change from this beat on (a ritardando is several of these)."""
        self.tempos.append((beat, bpm))

    def programa(self, canal, prog):
        self.programas[canal] = prog

    def tick(self, beat):
        # Swing: the off-beat eighth moves to `swing` of the beat (0.5 straight, 0.66 jazz).
        entero = int(beat)
        frac = beat - entero
        if abs(frac - 0.5) < 1e-6:
            frac = self.swing
        return int(round((entero + frac) * self.ppq))

    def nota(self, canal, beat, dur, tono, vel, humano=0.012, legato=0.92):
        t0 = self.tick(beat) + int(random.gauss(0, humano * self.ppq))
        t1 = self.tick(beat + dur)
        t1 = t0 + max(20, int((t1 - t0) * legato))
        v = max(1, min(127, int(vel + random.gauss(0, 5))))
        tono = n(tono) if isinstance(tono, str) else tono
        ev = self.eventos.setdefault(canal, [])
        ev.append((max(0, t0), mido.Message('note_on', channel=canal, note=tono, velocity=v)))
        ev.append((t1, mido.Message('note_off', channel=canal, note=tono, velocity=0)))

    def acorde(self, canal, beat, dur, tonos, vel, rasgueo=0.01, **kw):
        for i, t in enumerate(tonos):
            self.nota(canal, beat + i * rasgueo, dur, t, vel - i * 2, **kw)

    def mezcla(self, canal, vol=100, pan=64, reverb=40, coro=0):
        """Channel level, stereo position (0 left, 64 centre, 127 right) and reverb/chorus sends."""
        for cc, v in ((7, vol), (10, pan), (91, reverb), (93, coro)):
            self.eventos.setdefault(canal, []).append((0, mido.Message('control_change', channel=canal, control=cc, value=v)))

    def rango_bend(self, canal, semitonos=12):
        """Pitch-bend range (RPN 0), so glissandos can cover an octave."""
        for cc, v in ((101, 0), (100, 0), (6, semitonos), (38, 0), (101, 127), (100, 127)):
            self.eventos.setdefault(canal, []).append((0, mido.Message('control_change', channel=canal, control=cc, value=v)))
        self.bend = semitonos

    def glis(self, canal, beat, dur, desde, hasta, vel, curva=1.0, pasos=40, cola=0.0):
        """A slide from one note to another (trombone, slide whistle): one note, bent."""
        d, h = (n(desde) if isinstance(desde, str) else desde), (n(hasta) if isinstance(hasta, str) else hasta)
        rango = getattr(self, 'bend', 2)
        base = d
        ev = self.eventos.setdefault(canal, [])
        t0 = self.tick(beat)
        t1 = self.tick(beat + dur)
        ev.append((t0, mido.Message('pitchwheel', channel=canal, pitch=0)))
        ev.append((t0, mido.Message('note_on', channel=canal, note=base, velocity=vel)))
        for k in range(1, pasos + 1):
            u = (k / pasos) ** curva
            semis = (h - d) * u
            ev.append((t0 + int((t1 - t0) * k / pasos), mido.Message('pitchwheel', channel=canal, pitch=max(-8192, min(8191, int(semis / rango * 8191))))))
        fin = t1 + int(cola * self.ppq)
        ev.append((fin, mido.Message('note_off', channel=canal, note=base, velocity=0)))
        ev.append((fin + 1, mido.Message('pitchwheel', channel=canal, pitch=0)))

    def expresion(self, canal, beat, dur, desde, hasta, pasos=16):
        """Crescendo or diminuendo (CC 11) over `dur` beats."""
        for k in range(pasos + 1):
            self.control(canal, beat + dur * k / pasos, 11, int(desde + (hasta - desde) * k / pasos))

    def control(self, canal, beat, cc, valor):
        self.eventos.setdefault(canal, []).append((self.tick(beat), mido.Message('control_change', channel=canal, control=cc, value=valor)))

    def guardar(self, ruta):
        mid = mido.MidiFile(ticks_per_beat=self.ppq)
        meta = mido.MidiTrack()
        meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm), time=0))
        ultimo = 0
        for beat, bpm in sorted(self.tempos):
            t = self.tick(beat)
            meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=t - ultimo))
            ultimo = t
        mid.tracks.append(meta)
        for canal, ev in sorted(self.eventos.items()):
            pista = mido.MidiTrack()
            if canal in self.programas:
                pista.append(mido.Message('program_change', channel=canal, program=self.programas[canal], time=0))
            # note_off before note_on at the same tick
            orden = {'note_off': 0, 'control_change': 1, 'pitchwheel': 1, 'note_on': 2}
            ev.sort(key=lambda e: (e[0], orden.get(e[1].type, 1)))
            ultimo = 0
            for t, m in ev:
                pista.append(m.copy(time=t - ultimo))
                ultimo = t
            mid.tracks.append(pista)
        mid.save(ruta)
