# Shared bits for the comic pieces: chords, close harmony, voice leading, checks.
from partitura import n

NOMBRES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

def pcs(notas):
    """Pitch classes of a chord given as note names (with or without octave)."""
    return {n(x if x[-1].isdigit() else x + '4') % 12 if isinstance(x, str) else x % 12 for x in notas}

def debajo(nota, acorde, minimo=3):
    """The chord tone closest below a melody note (at least a minor third), for the second voice."""
    m = n(nota) if isinstance(nota, str) else nota
    for d in range(minimo, 10):
        if (m - d) % 12 in acorde:
            return m - d
    return m - 3

def cercana(prev, acorde, lo, hi):
    """Voice leading: the chord tone in [lo, hi] nearest the previous note."""
    opciones = [x for x in range(n(lo), n(hi) + 1) if x % 12 in acorde]
    return min(opciones, key=lambda x: (abs(x - prev), x))

def tocar(P, canal, c0, compases, largo, vel, oct=0, acento=8, legato=0.85, armonia=None, acordes=None, vel2=None, canal2=None):
    """Plays a tune given per bar as (beat, length, note). With `armonia`, a second voice below on canal2."""
    for i, compas in enumerate(compases):
        for (b, d, t) in compas:
            if t is None:
                continue
            m = (n(t) if isinstance(t, str) else t) + 12 * oct
            fuerte = (b % 1) == 0
            P.nota(canal, c0 + i * largo + b, d, m, vel + (acento if fuerte else 0), legato=legato)
            if armonia and acordes:
                ch = acordes[i][min(int(b // (largo / len(acordes[i]))), len(acordes[i]) - 1)]
                P.nota(canal2, c0 + i * largo + b, d, debajo(m, ch), (vel2 or vel - 10) + (acento if fuerte else 0), legato=legato)

def choques(nombre, compases, largo, acordes):
    """Notes on the beat, a beat long or more, a semitone away from a chord tone: likely wrong notes."""
    malas = []
    for i, compas in enumerate(compases):
        for (b, d, t) in compas:
            if t is None or b % 1 != 0 or d < 1:
                continue
            ch = acordes[i][min(int(b // (largo / len(acordes[i]))), len(acordes[i]) - 1)]
            p = n(t) % 12
            if p not in ch and any((p - c) % 12 in (1, 11) for c in ch):
                malas.append(f'compás {i + 1}, tiempo {b + 1}: {t}')
    print(f'{nombre}: choques en tiempos fuertes:', malas or 'ninguno')
