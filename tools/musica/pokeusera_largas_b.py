# Long versions (2:40 - 3:15 a round) of five battle tunes of «PokéUsera · Edición Jarra»: the same four-channel
# chip sound as pokeusera.py (two pulses, the 16-step wave bass, LFSR noise drums; no reverb, no echo, mono),
# the same keys, tempos and tunes, but written as real songs: an intro, a main theme, the theme again varied,
# a contrasting part, a break with layers removed, a new theme (often a tone higher) and a return with an ending
# that joins the beginning. Every tune is original.
#
#   python3 pokeusera_largas_b.py combate-verbena   A minor / A major, 132 bpm swung pasodoble de verbena, 100 bars
#   python3 pokeusera_largas_b.py combate-electro   F sharp minor, 130 bpm, build-ups and drops, 96 bars
#   python3 pokeusera_largas_b.py combate-terraza   D minor / F major, 120 bpm rumba with a palmas bridge, 88 bars
#   python3 pokeusera_largas_b.py combate-rural     G minor, 138 bpm techno with two breakdowns and a key change, 104 bars
#   python3 pokeusera_largas_b.py combate-juan      E minor / G major, 130 bpm bachata with a «mambo», 96 bars
#   python3 pokeusera_largas_b.py combate-feria     A minor / C major, 140 bpm fairground organ and dodgem eurodance, 104 bars
#   python3 pokeusera_largas_b.py todas             all of them
#
# MP3 at 24 kHz, 64 kbps, mono, in src/sonido/pokeusera-<name>.mp3 (the same paths as before). Each run prints the
# round's length (the LOOP value for src/pokeusera/sonido.ts), a map of sections, the loop-seam check and a
# repetition check (the same window of eight bars never plays identically more than twice).
import os
import sys
import tempfile
import numpy as np
import sinte
from sinte import (Cancion, Inst, SR, frase, tocar, tonos, acorde, escala, midi, revisa, exportar_bucle, bajo_de)
import pokeusera as base
from pokeusera import (tempo, redoble, canales, verifica, sacudida, arpegio, segunda_voz, L, SALIDA, _tercera, _por_compas)

KBPS = 64


# --- Toolkit ------------------------------------------------------------------------------------

def sube(notas, st):
    """A phrase st semitones higher."""
    return [(b, d, m + st, *[x + st for x in r]) for b, d, m, *r in notas]


def corta(notas, c0, c1):
    """Bars [c0, c1) of a phrase, moved to start at bar 0."""
    return [(b - c0 * L, d, m, *r) for b, d, m, *r in notas if c0 * L <= b < c1 * L]


def une(*trozos):
    """Joins (phrase, bars) pieces one after the other."""
    out, off = [], 0
    for notas, n in trozos:
        out += [(b + off, d, m, *r) for b, d, m, *r in notas]
        off += n * L
    return out


def aumenta(notas, k=2):
    """The phrase k times slower."""
    return [(b * k, d * k, m, *r) for b, d, m, *r in notas]


def armonica(tonica):
    """Harmonic minor as a set of pitch classes."""
    r = sinte.n(tonica + '4') % 12
    return {(r + p) % 12 for p in (0, 2, 3, 5, 7, 8, 11)}


def mordentes(notas, esc, min_d=1.0, cada=1):
    """Long notes get a quick upper neighbour: a mordent (sixteenth, sixteenth, the rest)."""
    out, k = [], 0
    for b, d, m, *r in notas:
        if d >= min_d and not r:
            k += 1
            if k % cada == 0:
                arriba = next(x for x in range(m + 1, m + 4) if x % 12 in esc)
                out += [(b, 0.25, m), (b + 0.25, 0.25, arriba), (b + 0.5, d - 0.5, m)]
                continue
        out.append((b, d, m, *r))
    return out


def voces(C, duty_lead=0.25, **kw):
    """The six pulses of `canales` plus a third lead and a third second pulse with other duties."""
    c = canales(C, duty_lead=duty_lead, **kw)
    vl, vs = kw.get('vol_lead', -5), kw.get('vol_seg', -10)
    alt = 0.125 if duty_lead != 0.125 else 0.25
    c['lead3'] = C.pista(f'lead {alt * 100:g}%', Inst('pulso', duty=alt, adsr=(0.002, 0.12, 0.65, 0.05), vib=(20, 6.2, 0.16)), vol=vl - 1, reverb=0)
    c['seg3'] = C.pista('pulso 2 25%', Inst('pulso', duty=0.25, adsr=(0.002, 0.08, 0.55, 0.04), arp_hz=60), vol=vs - 1, reverb=0)
    return c


def bajo(P, t0, acordes, patron, vel=100, oct=3, caida=0.82):
    """Bass line, a pattern (or one per bar) of sixteen steps: 0 root, 3 third, 5 fifth, 8 octave up, a octave down,
    6 sixth, b flat seventh, g flat sixth, d semitone under the root, e semitone over, 2 second, 4 fourth, c fifth
    below, n whole tone under; - holds, . rests."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 16, pat
        r = bajo_de(ch, oct)
        al = {'0': 0, '3': _tercera(ch), '5': 7, '8': 12, 'a': -12, '6': 9, 'b': 10, 'g': 8, 'd': -1, 'e': 1, '2': 2, '4': 5,
              'c': -5, 'n': -2}
        k = 0
        while k < 16:
            if pat[k] in al:
                n_ = 1
                while k + n_ < 16 and pat[k + n_] == '-':
                    n_ += 1
                P.nota(t0 + i * L + k / 4, max(0.1, n_ * 0.25 * (caida if n_ == 1 else 0.96)), r + al[pat[k]], vel + (6 if k % 4 == 0 else 0))
                k += n_
            else:
                k += 1


def _mask(p, k0):
    return (p + '.' * 16)[:k0] + '.' * (16 - k0)


# Fills for the last bar of a section: the bar keeps its first k0 steps and the rest is the fill.
RELLENOS = {
    'redoble4': (12, [('............o.xX', 'gb_caja')]),
    'caja': (8, [('........x.x.xxxX', 'gb_caja')]),
    'toms': (8, [('........ooxxXxXX', 'gb_tom')]),
    'corte': (12, []),
    'bongos': (8, [('........o.x.oxXX', 'gb_bongo_lo'), ('.........o.o....', 'gb_bongo_hi')]),
    'palmas': (8, [('........x.x.xxxx', 'gb_palma')]),
    'tomcaja': (8, [('........x.x.....', 'gb_tom'), ('............xxXX', 'gb_caja')]),
}


def bat(P, t, n, base_, relleno=None, vel=100, crash=0):
    """Drums for n bars. base_: [(pattern or one per bar, sound)], in order of priority (one noise channel: when several land on
    one step only the first plays). relleno: a fill on the last bar ('redoble', 'redoble4' or a name in RELLENOS). crash: velocity
    of a crash on the first beat."""
    for i in range(n):
        ult = relleno and i == n - 1
        lista = [(_por_compas(p, i), s) for p, s in base_]
        if ult:
            k0 = {'redoble': 8, 'redoble4': 12}.get(relleno) or RELLENOS[relleno][0]
            lista = [(_mask(p, k0), s) for p, s in lista]
            if relleno in RELLENOS:
                lista = list(RELLENOS[relleno][1]) + lista
        base.capas(P, t + i * L, lista, vel=vel)
        if ult and relleno == 'redoble':
            redoble(P, t + i * L + 2, 40, 118, 8)
        if ult and relleno == 'redoble4':
            redoble(P, t + i * L + 3, 50, 118, 4)
    if crash:
        P.golpe(t, 'gb_crash', crash)


class Mapa:
    """Sections of the first round: name, first bar, bars, key."""

    def __init__(self, beats):
        self.beats, self.secs = beats, []

    def __call__(self, nombre, t, compases, tono):
        if t < self.beats:
            self.secs.append((nombre, int(round(t / L)), compases, tono))
        return t + compases * L


def huella(C, beats, ventana=8, solo_voces=False):
    """The largest number of times the same window of eight bars (any start bar, not overlapping) is played identically."""
    n = int(beats // L)
    ventanas = {}
    for w in range(0, n - ventana + 1):
        ev = []
        for k, p in enumerate(C.pistas):
            if solo_voces and p.inst is None:
                continue
            for b, d, t, v, ex in p.notas:
                if w * L <= b < (w + ventana) * L:
                    ev.append((k, round(b - w * L, 3), round(d, 3), str(t), v, tuple(sorted((a, str(x)) for a, x in ex.items()))))
        if ev:
            ventanas.setdefault(hash(tuple(sorted(ev))), []).append(w)
    peor, donde = 1, None
    for ws in ventanas.values():
        cuenta, ultimo = 0, -99
        for w in ws:
            if w >= ultimo + ventana:
                cuenta += 1
                ultimo = w
        if cuenta > peor:
            peor, donde = cuenta, ws
    return peor, donde


def tiempo(seg):
    seg = round(seg * 10) / 10
    return f'{int(seg // 60)}:{seg % 60:04.1f}'


def salir(nombre):
    C, ronda, beats, bpm, mapa = CANCIONES[nombre]()
    t = 0
    for _ in range(3):
        t = ronda(t)
    assert t == 3 * beats, (t, beats)
    verifica(nombre, C)
    largo = beats * 60 / bpm
    x = C.render(hasta=3 * beats, informe=False)
    ruta = os.path.join(SALIDA, f'pokeusera-{nombre}.mp3')
    with tempfile.TemporaryDirectory() as tmp:
        exportar_bucle(os.path.join(tmp, nombre), x, largo, rms_db=-17.0, kbps=KBPS, salida=ruta, mono=True, ar=24000)
    # The seam: the step between the last sample of a round and the first of the next against the largest step inside.
    a = int(round(largo * SR))
    paso = np.abs(np.diff(x[0, :3 * a]))
    salto = abs(x[0, a] - x[0, a - 1])
    igual = np.max(np.abs(x[:, a:a + 8820] - x[:, 2 * a:2 * a + 8820]))
    print(f'  {nombre}: {bpm:.4f} bpm, {beats // L} compases, ronda de {largo:.6f} s ({tiempo(largo)}), pico sin normalizar {np.max(np.abs(x)):.2f}')
    print(f'  LOOP = {largo:.6f}   (entra a 0.5 s; el archivo dura {largo + 1:.3f} s)')
    print(f'  costura: salto {salto:.5f} frente al paso máximo {paso.max():.5f} (p99,9 {np.percentile(paso, 99.9):.5f}); rondas 1 y 2 iguales: {igual:.1e}')
    peor, donde = huella(C, beats)
    peor_v, donde_v = huella(C, beats, solo_voces=True)
    print(f'  repetición: ventana de 8 compases idéntica como mucho {peor} veces (con batería), {peor_v} veces (solo las tres voces melódicas)')
    print(f'  mapa de secciones (compás de inicio, compases, tonalidad, minuto):')
    for nom, c0, nc, tono in mapa.secs:
        print(f'    {nom:<22} compás {c0 + 1:>3}  {nc:>2} compases  {tono:<22} {tiempo(c0 * L * 60 / bpm)}')
    tam = os.path.getsize(ruta)
    print(f'  {ruta}: {tam / 1024:.0f} KiB')


# --- Combate 3: «Verbena» (pasodoble) ----------------------------------------------------------

def combate_verbena():
    """A minor / A major, 132 bpm with a swing, 100 bars: a pasodoble de verbena in full. Intro with a bugle call
    and a snare roll; the tune (A) over the Andalusian cadence; the tune again with a second voice and mordents (A');
    the trío in A major (B) and its answer with a new second half (B'); a break with a chromatic bass riff and a
    flamenco solo; the fanfare in D minor (C) and a tone higher in E minor (C'); a four-bar roll on the dominant;
    the tune with the 12.5 % lead (A''); a pasacalle in C major (D, D') and the last tune (A''') with a coda that
    ends on the dominant so the loop falls back on the intro."""
    bpm = tempo(132)
    beats = 100 * L
    C = Cancion(bpm, swing=0.58)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    m = Mapa(beats)
    MENOR, MAYOR, DO = escala('A', 'menor'), escala('A', 'mayor'), escala('C', 'mayor')
    ARM = armonica('A')
    CH_IN = ['Am', 'Am', 'E7', 'E7']
    CH_A = ['Am', 'G', 'F', 'E7', 'Am', 'G', 'F', 'E7']
    CH_B = ['A', 'D', 'A', 'E7', 'A', 'D', 'E7', 'A']
    CH_B2 = ['A', 'D', 'A', 'E7', 'F#m', 'D', 'E7', 'E7']
    CH_PU = ['Am', 'Am', 'Dm', 'E7', 'Am', 'Am', 'F', 'E7']
    CH_C = ['Dm', 'Am', 'Dm', 'E7', 'Dm', 'Am', 'E7', 'E7']
    CH_C2 = ['Em', 'Bm', 'Em', 'F#7', 'Em', 'Bm', 'F#7', 'E7']
    CH_P2 = ['E7'] * 4
    CH_D = ['C', 'G', 'Am', 'Em', 'F', 'C', 'G7', 'G7']
    CH_D2 = ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'F', 'E7']
    CH_CO = ['Dm', 'Am', 'F', 'E7']
    INTRO = frase('A5:3 A5:1 C6:3 C6:1 E6:3 E6:1 A6:3 -:1 | A6:6 G#6:2 A6:4 E6:4 | E5:3 E5:1 G#5:3 G#5:1 B5:3 B5:1 D6:3 -:1 | E6:8 B5:2 G#5:2 B5:2 E5:2')
    A = frase('A5:3 -:1 A5:1 B5:1 C6:2 B5:2 A5:2 E5:4 | G5:3 -:1 G5:1 A5:1 B5:2 A5:2 G5:2 D5:4 | F5:3 -:1 F5:1 G5:1 A5:2 G5:2 F5:2 C5:4 | E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:4 |'
              'C6:3 -:1 C6:1 D6:1 E6:2 D6:2 C6:2 A5:4 | B5:3 -:1 B5:1 C6:1 D6:2 B5:2 D6:2 G5:4 | A5:2 C6:2 F6:4 D6:2 E6:2 C6:4 | B5:1 C6:1 B5:1 G#5:1 E5:4 -:2 E5:2 G#5:2 B5:2')
    B = frase('E6:2 C#6:2 A5:4 C#6:2 E6:2 A6:4 | F#6:2 D6:2 A5:4 D6:2 F#6:2 A6:4 | E6:3 -:1 E6:1 F#6:1 E6:2 C#6:2 A5:2 C#6:4 | B5:2 D6:2 E6:4 G#5:2 B5:2 E6:4 |'
              'A6:3 -:1 A6:1 G#6:1 A6:2 E6:2 C#6:2 E6:4 | D6:3 -:1 D6:1 E6:1 F#6:2 E6:2 D6:2 A5:4 | G#5:2 B5:2 D6:2 E6:2 G#6:2 E6:2 D6:2 B5:2 | A5:2 C#6:2 E6:2 A6:2 A6:8')
    B2b = frase('C#6:2 F#6:2 A6:4 F#6:2 C#6:2 A5:4 | D6:2 F#6:2 A6:4 F#6:2 D6:2 A5:4 | G#6:2 B6:2 E7:4 D7:2 B6:2 G#6:4 | B6:3 -:1 A6:1 G#6:1 F#6:2 E6:2 D6:2 B5:2 G#5:2')
    B2 = une((corta(B, 0, 4), 4), (B2b, 4))
    SOLO = frase('E6:6 F6:2 E6:4 C6:4 | D6:2 C6:2 B5:2 C6:2 A5:8 | C6:4 A5:4 F5:4 A5:4 | G#5:2 B5:2 D6:4 C6:2 B5:2 G#5:4')
    CC = frase('D6:2 F6:2 A6:4 F6:2 D6:2 A5:4 | C6:2 E6:2 A6:4 E6:2 C6:2 A5:4 | D6:1 E6:1 F6:1 E6:1 D6:4 F6:1 G6:1 A6:1 G6:1 F6:4 | E6:1 B5:1 G#5:1 B5:1 E6:4 G#6:4 B6:4 |'
               'A5:3 -:1 D6:2 F6:2 A6:4 F6:4 | E6:3 -:1 A5:2 C6:2 E6:4 A6:4 | G#6:2 E6:2 B5:2 G#5:2 E5:2 G#5:2 B5:2 E6:2 | B5:1 C6:1 B5:1 G#5:1 B5:1 D6:1 B5:1 G#5:1 E5:8')
    CC2 = une((sube(corta(CC, 0, 7), 2), 7), (frase('B6:2 G#6:2 E6:2 G#6:2 B6:4 E7:4'), 1))
    RUN = frase('E5:2 G#5:2 B5:2 D6:2 E6:2 G#6:2 B6:2 D7:2 | E7:12 -:4', largo=16)
    D = frase('E6:3 -:1 E6:1 F6:1 G6:2 E6:2 C6:2 E6:4 | D6:3 -:1 D6:1 E6:1 F6:2 D6:2 B5:2 D6:4 | C6:3 -:1 C6:1 D6:1 E6:2 C6:2 A5:2 C6:4 | B5:3 -:1 B5:1 C6:1 D6:2 B5:2 G5:2 B5:4 |'
              'A5:2 C6:2 F6:4 A6:2 F6:2 C6:4 | G5:2 C6:2 E6:4 D6:2 C6:2 G5:4 | B5:2 D6:2 G6:4 F6:2 D6:2 B5:4 | D6:4 B5:2 G5:2 D6:3 -:1 G5:2 B5:2')
    D2b = frase('C6:2 F6:2 A6:4 G6:2 F6:2 C6:4 | D6:2 F6:2 A6:4 F6:2 D6:2 A5:4 | A6:3 -:1 G6:1 F6:1 E6:2 F6:2 A6:2 C7:4 | B6:2 G#6:2 E6:2 G#6:2 B6:3 -:1 E6:2 -:2')
    D2 = une((corta(D, 0, 4), 4), (D2b, 4))
    CODA = frase('D6:3 -:1 F6:3 -:1 A6:3 -:1 D7:3 -:1 | C7:3 -:1 B6:3 -:1 A6:3 -:1 E6:3 -:1 | F6:2 A6:2 C7:4 A6:2 F6:2 C6:4 | E6:2 G#6:2 B6:2 G#6:2 E6:4 B5:2 G#5:2')
    for nombre, notas, ch in (('intro', INTRO, CH_IN), ('A', A, CH_A), ('B', B, CH_B), ('B2', B2, CH_B2), ('solo', SOLO, CH_PU[4:]), ('C', CC, CH_C),
                              ('C2', CC2, CH_C2), ('D', D, CH_D), ('D2', D2, CH_D2), ('coda', CODA, CH_CO)):
        revisa(f'verbena {nombre}', notas, [[a] for a in ch])

    PAS = '0-..5-..0-..5-..'
    PAS2 = '0.5.3.5.0.5.3.5.'
    PAS3 = '0-..5-..0-5-3-5-'
    PAS4 = '0-..5-..0-..5-5.'
    OFF = '..x...x...x...x.'

    def ronda(t):
        # Intro: a bugle call over a snare that starts soft and rolls into the tune.
        m('intro', t, 4, 'A menor')
        tocar(c['lead2'], t, INTRO, 98)
        bajo(c['bajo'], t, CH_IN, ['0-......5-......', '0-......5-......', '5-......5-......', '5-5-5-5-5-5-5-5-'], vel=92, caida=0.9)
        sacudida(c['seg'], t + 2 * L, CH_IN[2:], 'x-------x-------', desde='A3', vel=70, caida=0.9)
        bat(c['rui'], t, 4, [('X.......X.......', 'gb_tom'), (['o.o.o.o.o.o.o.o.'] * 2 + ['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx'], 'gb_caja')], vel=88, crash=92)
        t += 4 * L
        # A: the tune over the Andalusian cadence, oom-pah bass, stabs on the off-beats.
        m('A (tema)', t, 8, 'A menor')
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, OFF, desde='A3', vel=78, caida=0.6)
        bajo(c['bajo'], t, CH_A, PAS)
        bat(c['rui'], t, 8, [('X.......x.......', 'gb_bombo'), ('....x..o....x..o', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble4', crash=92)
        t += 8 * L
        # A': the 50 % twin with mordents on the long notes, a second voice in thirds, a bass that walks on the second half of each bar.
        m("A' (segunda voz)", t, 8, 'A menor')
        Am_ = mordentes(A, ARM, 1.0, 2)
        tocar(c['lead2'], t, Am_, 102)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, PAS3, vel=100)
        bat(c['rui'], t, 8, [('X.......x.x.....', 'gb_bombo'), ('....x..o....x..o', 'gb_caja'), ('xoxoxoxoxoxoxoxo', 'gb_hat')], 'toms', crash=96)
        t += 8 * L
        # B: the trío in A major, the 50 % twin like a trumpet with its second voice, the bass on the beat.
        m('B (trío)', t, 8, 'La mayor')
        tocar(c['lead2'], t, B, 100)
        segunda_voz(c['seg'], t, B, CH_B, MAYOR, vel=84)
        bajo(c['bajo'], t, CH_B, PAS4, vel=98)
        bat(c['rui'], t, 8, [('X.......x.......', 'gb_bombo'), ('....x.x.....x.x.', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble4', crash=96)
        t += 8 * L
        # B': the trío again on the 25 % lead with mordents and broken-chord sixteenths under it; a new second half.
        m("B' (trío, final nuevo)", t, 8, 'La mayor')
        tocar(c['lead'], t, mordentes(B2, ARM | MAYOR, 1.0, 3), 102)
        arpegio(c['seg'], t, CH_B2, patron=(0, 1, 2, 1), desde='A3', vel=66, dur=0.2)
        bajo(c['bajo'], t, CH_B2, PAS2, vel=98)
        bat(c['rui'], t, 8, [('X.......x.......', 'gb_bombo'), ('....x.......x...', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'caja', crash=96)
        t += 8 * L
        # Break: only bass and drums with a chromatic riff (A G F E), then a flamenco solo on the 12.5 % lead.
        m('Puente (riff y solo)', t, 8, 'La frigio')
        riff = ['0-0-0-0-b-b-b-b-', 'g-g-g-g-5-5-5-5-', '0.0.b.b.g.g.5.5.', 'g-g-5-5-5-d-d-d-']
        bajo(c['bajo'], t, CH_PU[:4], riff, vel=104, caida=0.9)
        sacudida(c['seg'], t, CH_PU[:4], ['....x...........', '....x...........', '....x.......x...', '....x...x.x.x.x.'], desde='A3', vel=66, caida=0.5)
        bat(c['rui'], t, 4, [('X.......x.......', 'gb_tom'), ('....x.......x...', 'gb_caja')], vel=96, crash=88)
        tocar(c['lead3'], t + 4 * L, SOLO, 94)
        bajo(c['bajo'], t + 4 * L, CH_PU[4:], ['0-......5-......', '0-..5-..0-..5-..', 'g-......0-......', '5-......5-5-5-5-'], vel=96, caida=0.9)
        sacudida(c['seg2'], t + 4 * L, CH_PU[4:], ['x-------x-------', 'x-------x-------', 'x-------x-------', 'x---x---x---x---'], desde='A3', vel=68, caida=0.9)
        bat(c['rui'], t + 4 * L, 4, [('X.......x.......', 'gb_bombo'), ('....x.......x...', 'gb_caja'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'redoble', vel=92)
        t += 8 * L
        # C: the fanfare in D minor, quick runs, quaver bass, a march of snares.
        m('C (fanfarria)', t, 8, 'Re menor')
        tocar(c['lead'], t, CC, 104)
        arpegio(c['seg'], t, CH_C, patron=(0, 1, 2, 1), desde='D4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_C, '0.0.5.5.0.0.5.5.', vel=98, caida=0.9)
        bat(c['rui'], t, 8, [('X.......X.......', 'gb_bombo'), ('..x.x.x.x.x.x.x.', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble4', crash=98)
        t += 8 * L
        # C': the fanfare a tone higher in E minor on the 12.5 % lead, four on the floor, a new last bar that lands on the dominant.
        m("C' (un tono arriba)", t, 8, 'Mi menor')
        tocar(c['lead3'], t, CC2, 106)
        arpegio(c['seg3'], t, CH_C2, patron=(0, 1, 2, 3, 2, 1), desde='E4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_C2, ['0.0.5.5.0.0.5.5.'] * 7 + ['0-5-0-5-0-5-0-5-'], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [('X...x...X...x...', 'gb_bombo'), ('..x.x.x.x.x.x.x.', 'gb_caja'), ('xoxoxoxoxoxoxoxo', 'gb_hat')], 'redoble', crash=102)
        t += 8 * L
        # Dominant roll: a pedal on E7, the snare grows, a run up, one held note and a breath.
        m('Redoble (dominante)', t, 4, 'Mi dominante')
        tocar(c['lead2'], t + 2 * L, RUN, 100)
        bajo(c['bajo'], t, CH_P2, ['0-0-0-0-0-0-0-0-'] * 3 + ['0-0-0-0-0-0-....'], vel=94, caida=0.9)
        sacudida(c['seg'], t, CH_P2, ['x---------------'] * 2 + ['x-x-x-x-x-x-x-x-', 'x---x---x---....'], desde='G#3', vel=70, caida=0.9)
        bat(c['rui'], t, 4, [(['X.......x.......', 'X...x...X...x...', 'X...X...X...X...', 'X...X...X...'], 'gb_bombo'),
                             (['o.o.o.o.o.o.o.o.', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx'], 'gb_caja')], vel=90)
        t += 4 * L
        # A'': back to A minor on the 12.5 % lead with mordents, stabs on the 50 % pulse, quaver bass, busy drums.
        m("A'' (vuelta, 12,5 %)", t, 8, 'A menor')
        tocar(c['lead3'], t, mordentes(A, ARM, 1.0, 1), 104)
        sacudida(c['seg2'], t, CH_A, OFF, desde='A3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_A, PAS2, vel=100)
        bat(c['rui'], t, 8, [('X...x...X...x...', 'gb_bombo'), ('....X.......X...', 'gb_caja'), ('xoxoxoxoxoxoxoxo', 'gb_hat')], 'toms', crash=104)
        t += 8 * L
        # D: a pasacalle in C major, the relative: a new tune in dotted marches, the 25 % lead, light stabs.
        m('D (pasacalle)', t, 8, 'Do mayor')
        tocar(c['lead'], t, D, 100)
        sacudida(c['seg3'], t, CH_D, OFF, desde='C4', vel=74, caida=0.6)
        bajo(c['bajo'], t, CH_D, PAS, vel=96)
        bat(c['rui'], t, 8, [('X.......X.......', 'gb_bombo'), ('..x...x...x...x.', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble4', crash=90)
        t += 8 * L
        # D': the pasacalle with a second voice and a new second half that ends on the dominant of A minor.
        m("D' (pasacalle, final nuevo)", t, 8, 'Do mayor')
        tocar(c['lead2'], t, D2, 102)
        segunda_voz(c['seg'], t, D2, CH_D2, DO, vel=82)
        bajo(c['bajo'], t, CH_D2, PAS3, vel=100)
        bat(c['rui'], t, 8, [('X.......x.x.....', 'gb_bombo'), ('....x..o....x..o', 'gb_caja'), ('xoxoxoxoxoxoxoxo', 'gb_hat'), ('..........x.....', 'gb_tom')], 'redoble', crash=94)
        t += 8 * L
        # A''': the last tune on the 50 % twin with a second voice, a bass on every quaver and every drum.
        m("A''' (tema final)", t, 8, 'A menor')
        tocar(c['lead2'], t, A, 106)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=86)
        bajo(c['bajo'], t, CH_A, ['0-5-0-5-0-5-0-5-'] * 3 + ['0-5-3-5-0-5-3-5-'] + ['0-5-0-5-0-5-0-5-'] * 3 + ['0-0-5-5-3-3-5-5-'], vel=102, caida=0.9)
        bat(c['rui'], t, 8, [('X...x...X...x.x.', 'gb_bombo'), ('....X.......X..x', 'gb_caja'), ('xoxoxoxoxoxoxoxo', 'gb_hat')], 'redoble4', vel=104, crash=108)
        t += 8 * L
        # Coda: the cadence in four bars, ending on E7 so that the intro (A minor) answers it.
        m('Coda (enlaza con la intro)', t, 4, 'A menor')
        tocar(c['lead'], t, CODA, 104)
        sacudida(c['seg'], t, CH_CO, OFF, desde='A3', vel=76, caida=0.6)
        bajo(c['bajo'], t, CH_CO, [PAS, PAS, PAS, '0-5-0-5-0-5-0-5-'], vel=100)
        bat(c['rui'], t, 4, [('X.......x.......', 'gb_bombo'), ('....x..o....x..o', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble4', crash=100)
        return t + 4 * L

    return C, ronda, beats, bpm, m


# --- Combate 4: «Cortocircuito» (electro) ------------------------------------------------------

def combate_electro():
    """F sharp minor, 130 bpm, 96 bars: electronic, tense, syncopated. A pulsing intro that teases the riff; the 3+3+2
    riff (A) and again with a harmony and sixteenth hats (A'); the floating middle in A major (B); a four-bar build-up
    with a snare roll that stops dead; the drop (a new stuttering hook) and its answer; a kickless breakdown in D major;
    the crawling climb (C); the riff a tone higher in G sharp minor, the drop a tone higher, a bass-and-drums
    interlude and the last riff, which ends on the tritone chord so the loop falls back on the intro."""
    bpm = tempo(130)
    beats = 96 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.125)
    m = Mapa(beats)
    MENOR = escala('F#', 'menor')
    MENOR2 = escala('G#', 'menor')
    CH_IN = ['F#m'] * 8
    CH_A = ['F#m', 'F#m', 'G', 'F#m', 'F#m', 'F#m', 'G', 'C']
    CH_A2 = ['G#m', 'G#m', 'A', 'G#m', 'G#m', 'G#m', 'A', 'D']
    CH_B = ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'C#7']
    CH_BU = ['D', 'D', 'E', 'C#7']
    CH_D = ['F#m', 'F#m', 'D', 'E', 'F#m', 'F#m', 'D', 'C#7']
    CH_D2 = ['G#m', 'G#m', 'E', 'F#', 'G#m', 'G#m', 'E', 'C#7']
    CH_BR = ['D', 'A', 'Bm', 'F#m', 'D', 'A', 'E', 'E']
    CH_C = ['F#m', 'F#m', 'G', 'G', 'Bm', 'C', 'C#7', 'C#7']
    CH_MI = ['F#m', 'F#m', 'G', 'F#m']
    A = frase('F#5:3 A5:3 C#6:2 F#6:3 E6:3 C#6:2 | F#5:3 A5:3 C#6:2 E6:3 D6:3 C#6:2 | G5:3 B5:3 D6:2 G6:3 F#6:3 D6:2 | A5:3 C#6:3 F#6:2 E6:3 C#6:3 A5:2 |'
              'F#6:3 -:3 F#6:2 A6:3 -:3 F#6:2 | E6:3 -:3 E6:2 C#6:3 -:3 A5:2 | D6:3 G6:3 D6:2 B5:3 D6:3 G5:2 | E6:3 G6:3 C7:2 G6:3 E6:3 C6:2')
    B = frase('E6:3 C#6:3 A5:2 C#6:4 E6:4 | B5:3 E6:3 G#6:2 E6:8 | A5:3 C#6:3 F#6:2 C#6:4 A5:4 | D6:3 F#6:3 A6:2 F#6:8 |'
              'C#6:3 E6:3 A6:2 B6:3 E6:3 C#6:2 | B5:3 E6:3 G#6:2 B6:8 | A6:3 F#6:3 D6:2 A5:3 D6:3 F#6:2 | G#6:2 F6:2 C#6:2 B5:2 G#5:8')
    BU = frase('C#6:2 -:2 C#6:2 -:2 C#6:2 -:2 C#6:2 -:2 | D6:2 -:2 D6:2 -:2 D6:2 -:2 D6:2 -:2 | E6:1 -:1 E6:1 -:1 F#6:1 -:1 F#6:1 -:1 G#6:1 -:1 A6:1 -:1 B6:1 -:1 C#7:1 -:1 |'
               'B6:1 B6:1 B6:1 B6:1 C#7:1 C#7:1 C#7:1 C#7:1 D7:1 D7:1 E7:1 E7:1 E7:4')
    D1 = frase('F#6:3 F#6:3 A6:2 C#7:3 -:1 A6:2 -:2 | E6:3 E6:3 F#6:2 A6:3 -:1 F#6:2 -:2 | D6:3 D6:3 F#6:2 A6:3 -:1 F#6:2 -:2 | E6:3 E6:3 G#6:2 B6:3 -:1 G#6:2 E6:2 |'
               'C#7:3 C#7:3 A6:2 F#6:3 -:1 A6:2 C#7:2 | B6:3 B6:3 A6:2 F#6:3 -:1 E6:2 F#6:2 | F#6:2 A6:2 D7:4 B6:2 A6:2 F#6:4 | G#6:3 F6:3 C#6:2 B5:4 -:4')
    D1b = frase('A6:2 C#7:2 A6:2 F#6:2 A6:2 C#7:2 E7:2 C#7:2 | B6:2 A6:2 F#6:2 E6:2 F#6:2 A6:2 B6:2 C#7:2 | D7:3 -:1 A6:2 F#6:2 D6:4 F#6:2 A6:2 | G#6:2 F6:2 C#6:4 B5:2 G#5:2 C#6:4')
    D1p = une((corta(D1, 0, 4), 4), (D1b, 4))
    D2 = une((sube(corta(D1, 0, 7), 2), 7), (corta(D1, 7, 8), 1))
    BRK = frase('F#6:8 A6:4 F#6:4 | E6:8 C#6:4 E6:4 | D6:8 F#6:4 D6:4 | C#6:8 F#6:8 | F#6:4 A6:4 D7:8 | C#7:4 A6:4 E6:8 | B6:8 G#6:8 | E6:4 G#6:4 B6:4 -:4')
    CC = frase('F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:2 A6:2 | E6:1 E6:1 -:1 E6:1 -:2 E6:1 E6:1 -:1 E6:1 -:2 C#6:2 E6:2 |'
               'G6:1 G6:1 -:1 G6:1 -:2 G6:1 G6:1 -:1 G6:1 -:2 B6:2 D7:2 | F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:1 F#6:1 -:1 F#6:1 -:2 D6:2 B5:2 |'
               'D6:2 F#6:2 B6:4 A6:2 F#6:2 D6:4 | C6:2 E6:2 G6:4 E6:2 C6:2 G5:4 | C#6:2 F6:2 G#6:4 B6:2 G#6:2 F6:4 | C#6:1 D6:1 D#6:1 E6:1 F6:1 F#6:1 G6:1 G#6:1 A6:1 A#6:1 B6:1 C7:1 C#7:4')
    for nombre, notas, ch in (('A', A, CH_A), ('B', B, CH_B), ('D1', D1, CH_D), ('D1b', D1b, CH_D[4:]), ('BRK', BRK, CH_BR), ('C', CC, CH_C)):
        revisa(f'electro {nombre}', notas, [[a] for a in ch])

    K4 = 'X...X...X...X...'
    CL = '....x.......x...'
    H8 = 'x.x.x.x.x.x.x.x.'
    H16 = 'xoxoxoxoxoxoxoxo'
    OH = '..x...x...x...x.'
    SINC = 'x..x..x.x..x..x.'
    BA = '0..0..0.0..0..8.'
    FIN_A = '0.0.0.0.0.0.0.0.'

    def ronda(t):
        # Intro: a quiet pulse and a broken chord, the kick arrives on the fifth bar, the riff is teased in the last two.
        m('Intro (pulso)', t, 8, 'Fa# menor')
        arpegio(c['seg'], t, CH_IN, patron=(0, 1, 2, 3, 2, 1), desde='F#3', vel=60, dur=0.2)
        bajo(c['bajo'], t, CH_IN, ['0...............'] * 2 + ['0.......0.......'] * 2 + ['0..0..0.0..0..0.'] * 4, vel=92, caida=0.8)
        bat(c['rui'], t, 4, [('o.o.o.o.o.o.o.o.', 'gb_hat')], vel=80)
        bat(c['rui'], t + 4 * L, 4, [(K4, 'gb_bombo'), (['....', '....', '....', '....x.......xxxx'], 'gb_caja'), (H8, 'gb_hat')], 'caja', crash=88)
        tocar(c['lead'], t + 6 * L, corta(A, 0, 2), 96)
        t += 8 * L
        # A: the syncopated riff, gated chip stabs on the same 3+3+2, a 3+3+2 bass, a kick to match.
        m('A (riff)', t, 8, 'Fa# menor')
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x..x..x.x..x..x.', desde='F#3', vel=74, caida=0.45)
        bajo(c['bajo'], t, CH_A, [BA] * 7 + [FIN_A], vel=98, caida=0.8)
        bat(c['rui'], t, 8, [('X..x..x.X..x..x.', 'gb_bombo'), ('....x.......x...', 'gb_caja'), (H8, 'gb_hat')], 'redoble4', crash=94)
        t += 8 * L
        # A': the riff on the 25 % lead with a harmony under it, octave bass, sixteenth hats.
        m("A' (riff y armonía)", t, 8, 'Fa# menor')
        tocar(c['lead3'], t, A, 104)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, ['0008000800080008'] * 7 + [FIN_A], vel=100, caida=0.75)
        bat(c['rui'], t, 8, [('X..x..x.X..x..x.', 'gb_bombo'), ('....X.......X..x', 'gb_caja'), (H16, 'gb_hat')], 'toms', crash=100)
        t += 8 * L
        # B: floating long notes on the 50 % twin, sixteenth broken chords, an off-beat bass, open hats.
        m('B (flotante)', t, 8, 'La mayor')
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1), desde='A3', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0-0-0-5-0-0-8-5-'] * 7 + ['0.0.0.0.0.0.5.5.'], vel=96, caida=0.8)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CL, 'gb_caja'), (OH, 'gb_hatab'), (H8, 'gb_hat')], 'redoble4', crash=92)
        t += 8 * L
        # Build-up: the lead climbs on repeated notes, the snare doubles its speed and then stops dead.
        m('Subida (build-up)', t, 4, 'Re mayor')
        tocar(c['lead'], t, BU, 100)
        bajo(c['bajo'], t, CH_BU, ['0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.0.0.'], vel=96, caida=0.6)
        sacudida(c['seg'], t, CH_BU, ['x---------------'] * 2 + ['x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxxxxxx'], desde='D4', vel=66, caida=0.5)
        bat(c['rui'], t, 4, [(['X...X...', 'X...X...X...X...', 'X...X...X...X...', 'X...X...X...X.'], 'gb_bombo'),
                             (['....x.......x...', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxx'], 'gb_caja')], vel=92)
        t += 4 * L
        # Drop: silence for a breath, then the stuttering hook, four on the floor, a wobbling bass.
        m('Drop (gancho nuevo)', t, 8, 'Fa# menor')
        tocar(c['lead'], t, D1, 104)
        sacudida(c['seg'], t, CH_D, SINC, desde='F#3', vel=76, caida=0.45)
        bajo(c['bajo'], t, CH_D, ['0.0.0.8.0.0.0.8.', '0.0.0.8.0.0.8.0.'] * 3 + ['0.0.0.8.0.0.0.8.', '0.0.0.0.0.0.0.0.'], vel=102, caida=0.7)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CL, 'gb_caja'), (OH, 'gb_hatab'), (H16, 'gb_hat')], 'redoble4', vel=102, crash=110)
        t += 8 * L
        # Drop answer: the hook on the 25 % lead with a new second half of running eighths, the bass jumps octaves.
        m("Drop' (respuesta)", t, 8, 'Fa# menor')
        tocar(c['lead3'], t, D1p, 106)
        arpegio(c['seg'], t, CH_D, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='F#4', vel=64, dur=0.2)
        bajo(c['bajo'], t, CH_D, ['0808080808080808', '0808080808088888'] * 3 + ['0808080808080808', '0.0.0.0.0.0.0.0.'], vel=100, caida=0.75)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (['....X.......X...', '....X.......X..x'], 'gb_caja'), (OH, 'gb_hatab'), (H16, 'gb_hat')], 'toms', vel=102, crash=104)
        t += 8 * L
        # Breakdown: no kick, a slow melody on the 50 % twin over soft broken chords, a drone bass, a riser at the end.
        m('Caída (breakdown)', t, 8, 'Re mayor')
        tocar(c['lead2'], t, BRK, 84)
        arpegio(c['seg'], t, CH_BR, patron=(0, 1, 2, 3, 2, 1), desde='A3', vel=56, dur=0.2)
        bajo(c['bajo'], t, CH_BR, ['0-------------a-'] * 3 + ['0---------------'] * 5, vel=88, caida=0.95)
        bat(c['rui'], t, 6, [('o.o.o.o.o.o.o.o.', 'gb_hat'), (['', '', '', '', '....x.......x...'], 'gb_caja')], vel=78, crash=80)
        bat(c['rui'], t + 6 * L, 2, [(['....x.......x...', 'x.x.x.x.x.x.x.x.'], 'gb_caja'), (['o.o.o.o.o.o.o.o.', ''], 'gb_hat')], 'redoble', vel=84)
        t += 8 * L
        # C: crawling repeated notes climbing, one chromatic run and a roll to the riff.
        m('C (arrastre)', t, 8, 'Fa# menor')
        tocar(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='F#3', vel=74, caida=0.5)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='F#3', vel=74, caida=0.5)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 3, [(K4, 'gb_bombo'), (CL, 'gb_caja'), ('o.o.o.o.o.o.o.o.', 'gb_hat')])
        bat(c['rui'], t + 3 * L, 1, [(K4, 'gb_bombo'), ('....x.......xxxx', 'gb_caja'), ('o.o.o.o.o.o.o.o.', 'gb_hat')])
        bat(c['rui'], t + 4 * L, 2, [(K4, 'gb_bombo'), (CL, 'gb_caja'), (H16, 'gb_hat')])
        bat(c['rui'], t + 6 * L, 1, [(K4, 'gb_bombo'), ('....X.......X...', 'gb_caja'), (H16, 'gb_hat')])
        redoble(c['rui'], t + 7 * L, 40, 118)
        t += 8 * L
        # The riff a tone higher in G sharp minor on the 50 % twin: the tension goes up.
        m('A+2 (riff, un tono arriba)', t, 8, 'Sol# menor')
        tocar(c['lead2'], t, sube(A, 2), 104)
        sacudida(c['seg2'], t, CH_A2, 'x..x..x.x..x..x.', desde='G#3', vel=74, caida=0.45)
        bajo(c['bajo'], t, CH_A2, ['0..0..0.0..0..8.', '0.0.0.8.0..0..8.'] * 3 + ['0..0..0.0..0..8.', FIN_A], vel=100, caida=0.8)
        bat(c['rui'], t, 8, [('X..x..x.X..x..x.', 'gb_bombo'), ('....X.......X...', 'gb_caja'), (OH, 'gb_hatab'), (H16, 'gb_hat')], 'redoble4', vel=102, crash=106)
        t += 8 * L
        # Drop a tone higher: the hook in G sharp minor, harmony in thirds, every drum; it lands on the dominant of F sharp minor.
        m('Drop+2 (gancho, un tono arriba)', t, 8, 'Sol# menor')
        tocar(c['lead3'], t, D2, 108)
        segunda_voz(c['seg'], t, D2, CH_D2, MENOR2, vel=80)
        bajo(c['bajo'], t, CH_D2, ['0.0.0.8.0.0.0.8.', '0.0.8.0.0.0.8.0.'] * 3 + ['0.0.0.8.0.0.0.8.', '0.0.0.0.0.0.0.0.'], vel=104, caida=0.7)
        bat(c['rui'], t, 8, [('X...X...X...X.x.', 'gb_bombo'), ('....X.......X..x', 'gb_caja'), (OH, 'gb_hatab'), (H16, 'gb_hat')], 'redoble', vel=104, crash=112)
        t += 8 * L
        # Interlude: back in F sharp minor, bass and drums, the broken chords return on the third bar.
        m('Interludio (bajo y batería)', t, 4, 'Fa# menor')
        bajo(c['bajo'], t, CH_MI, ['0..0..0.0..0..8.', '0..0..0.0..0..8.', '0.0.0.0.8.8.0.0.', '0..0..0.0.0.0.0.'], vel=102, caida=0.8)
        arpegio(c['seg3'], t + 2 * L, CH_MI[2:], patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='F#4', vel=62, dur=0.2)
        bat(c['rui'], t, 4, [(K4, 'gb_bombo'), (['....x.......x...'] * 3 + ['....x.......xxxx'], 'gb_caja'), ([H8, H8, H8, H16], 'gb_hat')], 'corte', vel=98)
        t += 4 * L
        # A''': the last riff on the 50 % twin with a harmony, a snare on every beat, every layer; it ends on the tritone chord.
        m("A''' (riff final)", t, 8, 'Fa# menor')
        tocar(c['lead2'], t, A, 106)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=84)
        bajo(c['bajo'], t, CH_A, ['0008000800080008', '0..0..0.0..0..8.'] * 3 + ['0008000800080008', FIN_A], vel=104, caida=0.75)
        bat(c['rui'], t, 8, [('X..x..x.X..x.xx.', 'gb_bombo'), ('....X.......X..x', 'gb_caja'), (OH, 'gb_hatab'), (H16, 'gb_hat')], 'redoble4', vel=104, crash=112)
        return t + 8 * L

    return C, ronda, beats, bpm, m


# --- Combate 5: «Rumba en la terraza» ---------------------------------------------------------

def combate_terraza():
    """D minor / F major, 120 bpm, 88 bars: a rumba. Strummed guitar in the 3+3+2 'rasgueo', claps, a box drum and bongos,
    a lilting bass. Intro with a call; the tune over the Andalusian cadence in D (A); the tune again with a second voice (A');
    the chorus in F (B) and again with a new second half (B'); a bridge of palmas (claps, bongos and the bass alone) that
    turns into a flamenco falseta; a new tune in G minor (C) and a tone higher in A minor (C'); the 'remate' with fast claps;
    the tune with picked guitar (A''); a bass-and-claps tumbao; the chorus a tone higher in G major (B'') and a coda that
    ends on A7 so the loop falls on the intro."""
    bpm = tempo(120)
    beats = 88 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-12, duty_lead=0.25)
    c['seg'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.09, 0.5, 0.04), arp_hz=60)
    c['lead3'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.13, 0.4, 0.04), vib=(14, 5.6, 0.2), ataque=(0.6, 0.012))
    m = Mapa(beats)
    MENOR, FA, SOLM = escala('D', 'menor'), escala('F', 'mayor'), escala('G', 'menor')
    ARM = armonica('D')
    CH_IN = ['Dm', 'Dm', 'A7', 'A7']
    CH_A = ['Dm', 'C', 'Bb', 'A7', 'Dm', 'Gm', 'A7', 'Dm']
    CH_B = ['F', 'C', 'Bb', 'C7', 'F', 'Dm', 'Gm', 'A7']
    CH_B2 = ['F', 'C', 'Bb', 'C7', 'F', 'Dm', 'Bb', 'A7']
    CH_B3 = ['G', 'D', 'C', 'D7', 'G', 'Em', 'Am', 'A7']
    CH_PU = ['Dm', 'Dm', 'Gm', 'A7', 'Dm', 'C', 'Bb', 'A7']
    CH_C = ['Gm', 'Cm', 'F', 'Bb', 'Eb', 'Cm', 'D7', 'D7']
    CH_C2 = ['Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E7', 'A7']
    CH_R = ['Gm', 'A7', 'Dm', 'A7']
    CH_CO = ['Dm', 'Gm', 'A7', 'A7']
    INTRO = frase('-:16 | -:16 | E6:3 G6:1 A6:4 G6:2 E6:2 C#6:4 | A5:2 C#6:2 E6:4 G6:2 E6:2 A6:4')
    A = frase('A5:3 A5:1 D6:4 C6:2 A5:2 F5:4 | G5:3 G5:1 C6:4 A5:2 G5:2 E5:4 | F5:3 F5:1 Bb5:4 G5:2 F5:2 D5:4 | E5:2 G5:2 A5:4 G5:2 E5:2 C#5:4 |'
              'D6:3 D6:1 F6:4 E6:2 D6:2 A5:4 | Bb5:3 Bb5:1 D6:4 C6:2 Bb5:2 G5:4 | C#6:3 C#6:1 E6:4 C#6:2 B5:2 A5:4 | D6:6 -:2 A5:2 C6:2 D6:4')
    B = frase('C6:2 -:2 C6:2 F6:2 A6:4 F6:4 | C6:2 -:2 C6:2 E6:2 G6:4 E6:4 | D6:2 -:2 D6:2 F6:2 Bb6:4 F6:4 | E6:3 G6:1 Bb6:4 G6:2 E6:2 C6:4 |'
              'A6:2 -:2 A6:2 G6:2 F6:4 C6:4 | F6:2 -:2 F6:2 A6:2 D7:4 A6:4 | G6:3 Bb6:1 D7:4 Bb6:2 G6:2 D6:4 | C#6:2 E6:2 A6:4 G6:2 E6:2 C#6:2 E6:2')
    B2b = frase('F6:3 A6:1 C7:4 A6:2 F6:2 C6:4 | D6:3 F6:1 A6:4 F6:2 D6:2 A5:4 | Bb5:2 D6:2 F6:4 Bb6:4 F6:2 D6:2 | C#6:2 E6:2 G6:4 A6:2 G6:2 E6:2 C#6:2')
    B2 = une((corta(B, 0, 4), 4), (B2b, 4))
    B3 = une((sube(corta(B, 0, 7), 2), 7), (corta(B, 7, 8), 1))
    FAL = frase('D6:1 E6:1 F6:1 E6:1 D6:1 C#6:1 D6:1 A5:1 D6:8 | E6:1 G6:1 E6:1 C6:1 E6:1 G6:1 E6:1 C6:1 G5:2 C6:2 E6:4 | F6:1 D6:1 Bb5:1 D6:1 F6:1 D6:1 Bb5:1 D6:1 Bb5:4 D6:4 |'
                'E6:1 G6:1 A6:1 G6:1 E6:1 C#6:1 E6:1 G6:1 A6:3 -:1 E6:2 C#6:2')
    CC1 = frase('D6:3 D6:3 Bb5:2 G5:3 -:1 Bb5:2 D6:2 | C6:3 C6:3 Eb6:2 G6:3 -:1 Eb6:2 C6:2 | A5:3 A5:3 C6:2 F6:3 -:1 C6:2 A5:2 | Bb5:3 Bb5:3 D6:2 F6:3 -:1 D6:2 Bb5:2 |'
                'Eb6:3 Eb6:3 G6:2 Bb6:3 -:1 G6:2 Eb6:2 | C6:3 Eb6:3 G6:2 C7:3 -:1 G6:2 Eb6:2 | F#6:2 A6:2 D7:4 C7:2 A6:2 F#6:4 | D6:3 -:1 A5:2 C6:2 D6:4 -:4')
    CC2 = une((sube(corta(CC1, 0, 7), 2), 7), (frase('A5:2 C#6:2 E6:4 G6:4 -:4'), 1))
    REM = frase('Bb5:2 D6:2 G6:4 F6:2 D6:2 Bb5:4 | C#6:2 E6:2 A6:4 G6:2 E6:2 C#6:4 | D6:2 F6:2 A6:4 D7:4 C7:2 A6:2 | E6:2 -:2 E6:2 -:2 E6:2 G6:2 A6:2 C#7:2')
    CODA = frase('D6:3 -:1 F6:3 -:1 A6:3 -:1 D7:3 -:1 | Bb6:3 -:1 G6:3 -:1 D6:3 -:1 Bb5:3 -:1 | E6:3 G6:1 A6:4 G6:2 E6:2 C#6:4 | A5:2 C#6:2 E6:4 A6:4 G6:2 E6:2')
    for nombre, notas, ch in (('intro', INTRO, CH_IN), ('A', A, CH_A), ('B', B, CH_B), ('B2', B2, CH_B2), ('falseta', FAL, CH_PU[4:]), ('C', CC1, CH_C),
                              ('C2', CC2, CH_C2), ('remate', REM, CH_R), ('coda', CODA, CH_CO)):
        revisa(f'terraza {nombre}', notas, [[a] for a in ch])

    RAS_A, RAS_B, RAS_C = 'x-..x-x-..x-x-x-', 'x-..x-x-x-..x-x-', 'x-..x-..x-x-..x-'
    BT1, BT2, BT3, BT4, BT5 = '0-.0-.5-0-.0-.5-', '0-..0-5.0-..5-0.', '0-.0-.0-5-.0-.5-', '0..0..5.0..0..5.', '0-..5-0-0-..5-n-'
    BOMBO, PALMAS, MARACAS = 'X.......x.x.....', '....x.x.....x.x.', 'o.o.o.o.o.o.o.o.'
    BASE = [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), (MARACAS, 'gb_hat')]
    BONGO = ('..........x.....', 'gb_bongo_lo')

    def ronda(t):
        # Intro: the guitar alone for two bars with a soft bongo, then a call on the dominant.
        m('Intro (llamada)', t, 4, 'Re menor')
        sacudida(c['seg'], t, CH_IN, RAS_A, desde='A3', vel=74, caida=0.8)
        tocar(c['lead2'], t, INTRO, 98)
        bajo(c['bajo'], t + 2 * L, CH_IN[2:], BT1, vel=92)
        bat(c['rui'], t, 2, [('..........o.o...', 'gb_bongo_lo'), ('...o...o...o...o', 'gb_bongo_hi')], vel=84, crash=80)
        bat(c['rui'], t + 2 * L, 2, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), (MARACAS, 'gb_hat')], 'palmas', vel=94)
        t += 4 * L
        # A: the tune over the strummed guitar, rumba bass, a box drum on 1, 3 and the 'and' of 3, claps on 2 and 4.
        m('A (tema)', t, 8, 'Re menor')
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, RAS_A, desde='A3', vel=78, caida=0.8)
        bajo(c['bajo'], t, CH_A, BT1, vel=96)
        bat(c['rui'], t, 8, BASE, 'palmas', crash=84)
        t += 8 * L
        # A': the 50 % twin with mordents; the guitar steps back and a second voice in thirds takes its place; a bouncing bass.
        m("A' (segunda voz)", t, 8, 'Re menor')
        tocar(c['lead2'], t, mordentes(A, ARM, 1.0, 2), 102)
        segunda_voz(c['seg3'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, BT2, vel=98)
        bat(c['rui'], t, 8, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, ('.o.o.o.o.o.o.o.o', 'gb_hat'), (MARACAS, 'gb_hat')], 'bongos', crash=84)
        t += 8 * L
        # B: the chorus in F on the 50 % twin, a bouncing bass, a slap on the box drum.
        m('B (estribillo)', t, 8, 'Fa mayor')
        tocar(c['lead2'], t, B, 100)
        sacudida(c['seg'], t, CH_B, RAS_B, desde='A3', vel=80, caida=0.8)
        bajo(c['bajo'], t, CH_B, BT2, vel=98)
        bat(c['rui'], t, 8, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, (MARACAS, 'gb_hat')], 'palmas', crash=88)
        t += 8 * L
        # B': the chorus on the 25 % lead with a new second half (F, D minor, B flat, A7), the guitar in a third rhythm.
        m("B' (estribillo, final nuevo)", t, 8, 'Fa mayor')
        tocar(c['lead'], t, mordentes(B2, FA | {1}, 1.5, 1), 104)
        sacudida(c['seg3'], t, CH_B2, RAS_C, desde='A3', vel=80, caida=0.8)
        bajo(c['bajo'], t, CH_B2, BT3, vel=98)
        bat(c['rui'], t, 8, [('X.......x.x...x.', 'gb_bombo'), (PALMAS, 'gb_palma'), ('..........x.....', 'gb_bongo_hi'), (MARACAS, 'gb_hat')], 'bongos', crash=88)
        t += 8 * L
        # Bridge: four bars of palmas, bongos and a bass that talks to them, then a falseta on the plucked 12.5 % lead.
        m('Puente (palmas y falseta)', t, 8, 'Re frigio')
        bajo(c['bajo'], t, CH_PU[:4], [BT5, BT4, BT5, '0-.0-.5-n-n-n-n-'], vel=100)
        sacudida(c['seg'], t, CH_PU[:4], ['x---------------', '................', 'x---------------', 'x-----x-x-x-x-x-'], desde='A3', vel=70, caida=0.9)
        bat(c['rui'], t, 4, [('X.......x.......', 'gb_bombo'), ('....x.x.x.x.x.x.', 'gb_palma'), ('..o...o...o...o.', 'gb_bongo_hi'), ('..........x...x.', 'gb_bongo_lo')], 'palmas', vel=96, crash=86)
        tocar(c['lead3'], t + 4 * L, FAL, 100)
        sacudida(c['seg'], t + 4 * L, CH_PU[4:], RAS_B, desde='A3', vel=66, caida=0.8)
        bajo(c['bajo'], t + 4 * L, CH_PU[4:], BT1, vel=94)
        bat(c['rui'], t + 4 * L, 4, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), (MARACAS, 'gb_hat')], 'bongos', vel=90)
        t += 8 * L
        # C: a new tune in G minor, the subdominant, with a dotted 3+3+2 hook; the guitar picks the rhythm and the bongo answers.
        m('C (tema nuevo)', t, 8, 'Sol menor')
        tocar(c['lead'], t, CC1, 102)
        sacudida(c['seg'], t, CH_C, RAS_B, desde='G3', vel=80, caida=0.8)
        bajo(c['bajo'], t, CH_C, BT2, vel=98)
        bat(c['rui'], t, 8, [('X.......x.x...x.', 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, ('.o.o.o.o.o.o.o.o', 'gb_hat'), (MARACAS, 'gb_hat')], 'palmas', crash=90)
        t += 8 * L
        # C': the same tune a tone higher in A minor on the 50 % twin; it ends on A7, the dominant of D.
        m("C' (un tono arriba)", t, 8, 'La menor')
        tocar(c['lead2'], t, CC2, 106)
        sacudida(c['seg3'], t, CH_C2, RAS_A, desde='A3', vel=82, caida=0.8)
        bajo(c['bajo'], t, CH_C2, BT3, vel=100)
        bat(c['rui'], t, 8, [('X...x...X...x.x.', 'gb_bombo'), (PALMAS, 'gb_palma'), ('.o.o.o.o.o.o.o.o', 'gb_hat'), (MARACAS, 'gb_hat')], 'redoble4', crash=96)
        t += 8 * L
        # Remate: fast claps and a run up.
        m('Remate (palmas rápidas)', t, 4, 'Re menor')
        tocar(c['lead'], t, REM, 104)
        sacudida(c['seg'], t, CH_R, RAS_A, desde='A3', vel=82, caida=0.8)
        bajo(c['bajo'], t, CH_R, BT2, vel=98)
        bat(c['rui'], t, 3, [('X.......X.......', 'gb_bombo'), ('x.x.x.x.x.x.x.x.', 'gb_palma'), ('.o.o.o.o.o.o.o.o', 'gb_hat')])
        bat(c['rui'], t + 3 * L, 1, [('X.......X.......', 'gb_bombo'), ('x.x.x.x.x.x.x.x.', 'gb_palma')])
        redoble(c['rui'], t + 3 * L + 2, 50, 112, 8, 'gb_palma')
        t += 4 * L
        # A'': the tune on the 25 % lead with the guitar picking the chords in eighths, a syncopated bass, softer claps.
        m("A'' (guitarra punteada)", t, 8, 'Re menor')
        tocar(c['lead'], t, mordentes(A, ARM, 1.0, 1), 104)
        arpegio(c['seg3'], t, CH_A, patron=(0, 2, 1, 2), desde='A3', paso=0.5, dur=0.42, vel=68)
        bajo(c['bajo'], t, CH_A, [BT3, BT1], vel=98)
        bat(c['rui'], t, 8, [('X.......x.x.....', 'gb_bombo'), ('....o.o.....o.o.', 'gb_palma'), ('..........x.....', 'gb_bongo_hi'), ('.o.o.o.o.o.o.o.o', 'gb_hat'), (MARACAS, 'gb_hat')], 'bongos', crash=88)
        t += 8 * L
        # Tumbao: the bass and the claps alone, the box drum, a lone bongo rolling toward the last chorus.
        m('Tumbao (bajo y palmas)', t, 4, 'Re menor')
        bajo(c['bajo'], t, ['Dm', 'Dm', 'A7', 'A7'], [BT5, BT4, '0-.0-.5-n-.0-.5-', '0-.0-.0-0-.0-.5-'], vel=102)
        bat(c['rui'], t, 4, [('X.......x.x.....', 'gb_bombo'), (['....x.x.....x.x.'] * 2 + ['x.x.x.x.x.x.x.x.'] * 2, 'gb_palma'), (MARACAS, 'gb_hat')], 'redoble4', vel=92, crash=80)
        t += 4 * L
        # B'': the chorus a tone higher in G major with the guitar louder, every drum; it lands on A7 through A minor.
        m("B'' (estribillo, un tono arriba)", t, 8, 'Sol mayor')
        tocar(c['lead2'], t, B3, 106)
        sacudida(c['seg'], t, CH_B3, RAS_B, desde='B3', vel=84, caida=0.8)
        bajo(c['bajo'], t, CH_B3, [BT2, BT3], vel=100)
        bat(c['rui'], t, 8, [('X...x...x.x...x.', 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, ('.o.o.o.o.o.o.o.o', 'gb_hat'), (MARACAS, 'gb_hat')], 'palmas', vel=104, crash=104)
        t += 8 * L
        # Coda: the cadence in four bars, back in D minor, ending on the dominant for the loop.
        m('Coda (enlaza con la intro)', t, 4, 'Re menor')
        tocar(c['lead'], t, CODA, 104)
        sacudida(c['seg'], t, CH_CO, RAS_A, desde='A3', vel=80, caida=0.8)
        bajo(c['bajo'], t, CH_CO, BT1, vel=98)
        bat(c['rui'], t, 4, BASE, 'bongos', crash=96)
        return t + 4 * L

    return C, ronda, beats, bpm, m


# --- Combate 6: «Fiesta en la Casa Rural» (techno) -------------------------------------------

def combate_rural():
    """G minor, 138 bpm, 104 bars: techno for a drag party in a rural house. A kick-only intro that fills up; the groove
    that teases the hook; the euphoric hook (G minor); a kickless breakdown with the long-note tune and a snare roll;
    an eight-bar build-up; the drop; a second, brighter hook on the next four chords (the chorus); an acid middle
    with a riff on the bass and the lead; a second breakdown in E flat with the chorus slowed to half speed; a short
    build-up that goes up a tone; the drop and the chorus in A minor; the last drop back in G minor and an outro in which
    the layers fall away until only the kick is left, the way the intro starts."""
    bpm = tempo(138)
    beats = 104 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    m = Mapa(beats)
    CH_1 = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'F', 'D7']
    CH_3 = ['Eb', 'Bb', 'F', 'Gm', 'Eb', 'Bb', 'F', 'D7']
    CH_BU = ['Gm', 'Gm', 'Eb', 'Eb', 'Cm', 'Cm', 'D7', 'D7']
    CH_AC = ['Gm', 'Gm', 'Cm', 'Cm', 'Eb', 'Eb', 'F', 'D7']
    CH_BD2 = ['Eb', 'Eb', 'Bb', 'Bb', 'F', 'F', 'Gm', 'Gm']
    CH_BU2 = ['Am', 'Am', 'E7', 'E7']
    CH_1B = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E7']
    CH_3B = ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'D7']
    CH_FIN = ['Gm', 'Eb', 'Bb', 'F', 'Eb', 'Bb', 'F', 'D7']
    CH_OU = ['Gm', 'Eb', 'Bb', 'F']
    H = frase('D6:4 -:2 D6:2 G6:4 F6:4 | Eb6:4 -:2 Eb6:2 Bb6:4 G6:4 | D6:4 -:2 D6:2 F6:4 D6:4 | A5:4 C6:4 F6:8 |'
              'D6:4 -:2 D6:2 G6:4 Bb6:4 | Eb6:2 G6:2 Bb6:4 G6:2 Eb6:2 Bb5:4 | C6:2 F6:2 A6:4 F6:2 C6:2 A5:4 | F#6:4 A6:4 D7:4 C7:2 A6:2')
    BD = frase('G6:16 | F6:12 D6:4 | C6:8 A5:8 | Bb5:8 D6:8 | Bb5:4 Eb6:4 G6:8 | D6:4 F6:4 Bb6:8 | C6:4 A5:4 C6:4 F6:4 | F#6:8 A6:8')
    HK2 = frase('G5:3 Bb5:3 Eb6:2 G6:3 Bb5:3 G5:2 | F5:2 Bb5:2 D6:4 C6:2 Bb5:2 F5:4 | A5:3 C6:3 F6:2 A6:3 C6:3 A5:2 | G5:2 Bb5:2 D6:4 Bb5:2 G5:2 D5:4 |'
                'Eb6:3 G6:3 Bb6:2 G6:3 Eb6:3 Bb5:2 | D6:2 F6:2 Bb6:4 F6:2 D6:2 Bb5:4 | C6:3 F6:3 A6:2 G6:3 F6:3 C6:2 | F#6:2 A6:2 D7:2 C7:2 A6:2 F#6:2 D6:4')
    BU = frase('D5:16 | D5:8 F5:8 | G5:16 | G5:8 Bb5:8 | Eb6:16 | Eb6:8 G6:8 | F#6:4 A6:4 C7:4 D7:4 | D7:6 -:10')
    BU2 = frase('A5:16 | A5:8 C6:8 | E6:8 G#6:4 B6:4 | E7:6 -:10')
    FIN = une((corta(H, 0, 4), 4), (corta(HK2, 4, 8), 4))
    H2 = sube(H, 2)
    HK2B = une((sube(corta(HK2, 0, 7), 2), 7), (corta(HK2, 7, 8), 1))
    for nombre, notas, ch in (('H', H, CH_1), ('BD', BD, CH_3), ('HK2', HK2, CH_3), ('FIN', FIN, CH_FIN)):
        revisa(f'rural {nombre}', notas, [[a] for a in ch])

    K4, CLAP = 'X...X...X...X...', '....x.......x...'
    HAT16, HAT8 = '.o.o.o.o.o.o.o.o', '..x...x...x...x.'
    OFFB = '..0-..0-..0-..0-'

    def riff(P, t0, acordes, motivos, oct=5, vel=96):
        """An acid riff: motifs of (step, length in steps, semitones over the root or 't' for the third)."""
        for i, ch in enumerate(acordes):
            r = bajo_de(ch, oct)
            for k, d, st in _por_compas(motivos, i):
                P.nota(t0 + i * L + k / 4, d / 4 * 0.9, r + (_tercera(ch) if st == 't' else st), vel + (6 if k % 4 == 0 else 0))

    MOT1 = [(0, 1, 0), (1, 1, 0), (3, 1, 0), (4, 1, 't'), (6, 1, 0), (8, 1, 7), (10, 1, 5), (12, 1, 't'), (13, 1, 0)]
    MOT2 = [(0, 2, 0), (3, 1, 7), (4, 2, 12), (7, 1, 10), (8, 2, 7), (11, 1, 't'), (12, 4, 0)]
    MOT3 = [(0, 1, 0), (2, 1, 12), (3, 1, 0), (4, 1, 12), (6, 1, 10), (7, 1, 7), (8, 1, 5), (10, 1, 't'), (12, 1, 0), (13, 1, 0), (14, 1, 7)]

    def ronda(t):
        # Intro: only the kick for four bars, then the off-beat bass, hats and a broken chord creep in.
        m('Intro (solo bombo)', t, 8, 'Sol menor')
        bat(c['rui'], t, 4, [(K4, 'gb_bombo'), (['', '', 'o.o.o.o.o.o.o.o.', 'o.o.o.o.o.o.o.o.'], 'gb_hat')], vel=96, crash=90)
        bajo(c['bajo'], t + 4 * L, CH_1[:4], OFFB, vel=92, caida=0.9)
        arpegio(c['seg'], t + 4 * L, CH_1[:4], patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='G4', vel=54, dur=0.2)
        bat(c['rui'], t + 4 * L, 4, [(K4, 'gb_bombo'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'caja', vel=96)
        t += 8 * L
        # Groove: kick, claps, hats, off-beat bass, sixteenth arpeggios; the hook shows its first four bars.
        m('Groove', t, 8, 'Sol menor')
        tocar(c['lead'], t + 4 * L, corta(H, 0, 4), 100)
        arpegio(c['seg'], t, CH_1, patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='G4', vel=64, dur=0.2)
        bajo(c['bajo'], t, CH_1, OFFB, vel=98, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', crash=90)
        t += 8 * L
        # Hook: the euphoric tune on top.
        m('Gancho (tema)', t, 8, 'Sol menor')
        tocar(c['lead'], t, H, 104)
        arpegio(c['seg'], t, CH_1, patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='G4', vel=64, dur=0.2)
        bajo(c['bajo'], t, CH_1, [OFFB] * 7 + ['..0-..0-..0-0.0.'], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', crash=96)
        t += 8 * L
        # Breakdown: no kick, a chip pad, the tune in long notes, a drone bass, hats, then claps and a snare roll.
        m('Breakdown 1', t, 8, 'Mib mayor')
        tocar(c['lead2'], t, BD, 96)
        sacudida(c['seg'], t, CH_3, 'x---------------', desde='G3', vel=72)
        bajo(c['bajo'], t, CH_3, '0---------------', vel=90)
        bat(c['rui'], t, 4, [('o.o.o.o.o.o.o.o.', 'gb_hat')])
        bat(c['rui'], t + 4 * L, 2, [(CLAP, 'gb_caja'), ('o.o.o.o.o.o.o.o.', 'gb_hat')])
        bat(c['rui'], t + 6 * L, 2, [('x.x.x.x.x.x.x.x.', 'gb_caja')], 'redoble', vel=88, crash=80)
        t += 8 * L
        # Build-up: the kick returns, the pad climbs in long notes and the snare doubles its speed twice before a stop.
        m('Subida (build-up)', t, 8, 'Sol menor')
        tocar(c['lead3'], t, BU, 96)
        sacudida(c['seg'], t, CH_BU, ['x---------------'] * 4 + ['x-x-x-x-x-x-x-x-'] * 2 + ['xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'], desde='G3', vel=66, caida=0.5)
        bajo(c['bajo'], t, CH_BU, [OFFB] * 4 + ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.0.0.....'], vel=96, caida=0.8)
        bat(c['rui'], t, 8, [([K4] * 7 + ['X...X...X...'], 'gb_bombo'),
                             (['', '', CLAP, CLAP, 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx'], 'gb_caja'),
                             (['', '', '', '', '', '', '', ''], 'gb_hat')], vel=92)
        t += 8 * L
        # Drop: everything, the hook on the 50 % twin, a busier arpeggio and bass.
        m('Drop 1 (gancho)', t, 8, 'Sol menor')
        tocar(c['lead2'], t, H, 106)
        arpegio(c['seg'], t, CH_1, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='G4', vel=66, dur=0.2)
        bajo(c['bajo'], t, CH_1, ['..0-..0-..0-..8-', '..0-..0-..8-..0-'] * 3 + ['..0-..0-..0-..8-', '..0-..0-0.0.0.8.'], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), ('....X.......X...', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', crash=108)
        t += 8 * L
        # Chorus: a second, brighter hook on E flat, B flat, F, G minor; the 25 % lead, bass jumping octaves.
        m('Drop 2 (estribillo nuevo)', t, 8, 'Sol menor / Mib')
        tocar(c['lead'], t, HK2, 106)
        arpegio(c['seg'], t, CH_3, patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='G4', vel=64, dur=0.2)
        bajo(c['bajo'], t, CH_3, ['..0-..8-..0-..8-', '..0-..0-..8-0.8.'] * 3 + ['..0-..8-..0-..8-', '..0-..0-0.0.0.8.'], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'toms', crash=104)
        t += 8 * L
        # Acid: the kick and a twisting riff on the 12.5 % lead and the sixteenth bass; no tune, a build in the layers.
        m('Acid (riff)', t, 8, 'Sol menor')
        riff(c['lead3'], t, CH_AC, [MOT1, MOT1, MOT1, MOT2, MOT3, MOT3, MOT1, MOT2], oct=5, vel=94)
        bajo(c['bajo'], t, CH_AC, ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.0.0.8.8.'] + ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.8.8.0.0.'], vel=100, caida=0.6)
        sacudida(c['seg'], t + 4 * L, CH_AC[4:], 'x..x..x.x..x..x.', desde='G3', vel=64, caida=0.45)
        bat(c['rui'], t, 4, [(K4, 'gb_bombo'), (HAT8, 'gb_hatab')], vel=96, crash=90)
        bat(c['rui'], t + 4 * L, 4, [(K4, 'gb_bombo'), (CLAP, 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble', vel=96)
        t += 8 * L
        # Breakdown 2: the chorus at half speed on the 50 % twin over a pad in E flat, no kick, a riser to the end.
        m('Breakdown 2 (estribillo lento)', t, 8, 'Mib mayor')
        tocar(c['lead2'], t, aumenta(corta(HK2, 0, 4)), 94)
        sacudida(c['seg'], t, CH_BD2, 'x---------------', desde='G3', vel=70)
        bajo(c['bajo'], t, CH_BD2, ['0---------------', '0-----------a---'], vel=90)
        bat(c['rui'], t, 6, [('o...o...o...o...', 'gb_hat'), (['', '', '', '', CLAP, CLAP], 'gb_caja')], vel=80, crash=84)
        bat(c['rui'], t + 6 * L, 2, [(['x...x...x...x...', 'x.x.x.x.x.x.x.x.'], 'gb_caja')], 'redoble', vel=86)
        t += 8 * L
        # Second build-up: a tone higher, the pad climbs on A and E.
        m('Subida 2 (un tono arriba)', t, 4, 'La menor')
        tocar(c['lead3'], t, BU2, 98)
        sacudida(c['seg'], t, CH_BU2, ['x---------------', 'x-------x-------', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='A3', vel=68, caida=0.5)
        bajo(c['bajo'], t, CH_BU2, [OFFB, OFFB, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=98, caida=0.8)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo'), (['....x...', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=94)
        t += 4 * L
        # Drop in A minor: the hook a tone higher on the 50 % twin.
        m('Drop 3 (gancho, un tono arriba)', t, 8, 'La menor')
        tocar(c['lead2'], t, H2, 108)
        arpegio(c['seg'], t, CH_1B, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='A4', vel=66, dur=0.2)
        bajo(c['bajo'], t, CH_1B, ['..0-..0-..0-..8-', '..0-..8-..0-..8-'] * 3 + ['..0-..0-..0-..8-', '..0-..0-0.0.0.8.'], vel=102, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', vel=102, crash=112)
        t += 8 * L
        # The chorus in A minor, ending on D7 to get back to G minor.
        m('Drop 4 (estribillo, un tono arriba)', t, 8, 'La menor')
        tocar(c['lead3'], t, HK2B, 108)
        segunda_voz(c['seg'], t, HK2B, CH_3B, escala('A', 'menor'), vel=78)
        bajo(c['bajo'], t, CH_3B, ['..0-..8-..0-..8-', '..0-..0-0.0.8.0.'] * 3 + ['..0-..8-..0-..8-', '..0-..0-0.0.0.8.'], vel=102, caida=0.9)
        bat(c['rui'], t, 8, [('X...X...X...X.x.', 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble', vel=102, crash=106)
        t += 8 * L
        # The last drop, back in G minor: the hook for four bars and the chorus for four, the 50 % twin, a harmony under it.
        m('Drop final (vuelta a Sol menor)', t, 8, 'Sol menor')
        tocar(c['lead2'], t, FIN, 108)
        segunda_voz(c['seg'], t, FIN, CH_FIN, escala('G', 'menor'), vel=78)
        bajo(c['bajo'], t, CH_FIN, ['..0-..0-..0-..8-', '..0-..8-..0-..8-'] * 3 + ['..0-..0-..0-..8-', '..0-..0-0.0.0.8.'], vel=104, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'toms', vel=104, crash=114)
        t += 8 * L
        # Outro: the layers fall away, bar by bar, until only the kick is left.
        m('Salida (queda el bombo)', t, 4, 'Sol menor')
        arpegio(c['seg'], t, CH_OU[:2], patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='G4', vel=60, dur=0.2)
        bajo(c['bajo'], t, CH_OU[:3], OFFB, vel=94, caida=0.9)
        bat(c['rui'], t, 1, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], vel=98, crash=96)
        bat(c['rui'], t + L, 1, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT16, 'gb_hat')], vel=96)
        bat(c['rui'], t + 2 * L, 1, [(K4, 'gb_bombo'), (HAT8, 'gb_hatab')], vel=96)
        bat(c['rui'], t + 3 * L, 1, [(K4, 'gb_bombo')], vel=96)
        return t + 4 * L

    return C, ronda, beats, bpm, m


# --- Combate 7: «Bachata para Juan» --------------------------------------------------------------

def combate_juan():
    """E minor / G major, 130 bpm, 96 bars: a bachata. Intro of requinto arpeggios that quicken; the requinto tune (A) and
    again on the 50 % twin with sixteenth picking (A'); the chorus in G (B) and again with a harmony and a bass that
    answers (B'); a 'mambo' of sixteen bars, the requinto in front with the rhythm chopped under it; a bass-and-bongo
    solo; the bridge of running arpeggios (C); a slow bridge that ends on E7; the chorus a tone higher in A major;
    the tune once more in E minor and a coda that ends on B7 so the loop falls on the intro."""
    bpm = tempo(130)
    beats = 96 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    c['lead'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.15, 0.4, 0.05), vib=(16, 5.6, 0.25), ataque=(0.6, 0.012))
    c['lead2'].inst = Inst('pulso', duty=0.5, adsr=(0.001, 0.14, 0.4, 0.05), vib=(16, 5.6, 0.25), ataque=(0.6, 0.012))
    c['lead3'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.14, 0.4, 0.05), vib=(16, 5.6, 0.25), ataque=(0.6, 0.012))
    c['seg'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.09, 0.4, 0.03))
    c['seg3'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.09, 0.4, 0.03))
    m = Mapa(beats)
    MENOR, SOL, LA = escala('E', 'menor'), escala('G', 'mayor'), escala('A', 'mayor')
    ARM = armonica('E')
    CH_A = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7']
    CH_B = ['G', 'D', 'Em', 'Bm', 'C', 'G', 'Am', 'B7']
    CH_BF = ['A', 'E', 'F#m', 'C#m', 'D', 'A', 'Bm', 'B7']
    CH_M = ['Am', 'D', 'G', 'Em', 'Am', 'D', 'Em', 'B7']
    CH_BK = ['Em', 'Em', 'Am', 'B7']
    CH_C = ['Am', 'Em', 'C', 'D', 'Am', 'Em', 'B7', 'B7']
    CH_SL = ['Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'E7']
    CH_CO = ['Em', 'C', 'Am', 'B7']
    A = frase('E5:2 G5:2 B5:2 E6:2 B5:2 G5:2 B5:2 E6:2 | C6:2 G5:2 E5:2 G5:2 C6:2 E6:2 G6:4 | D6:2 B5:2 G5:2 B5:2 D6:4 G6:4 | A5:2 F#5:2 D5:2 F#5:2 A5:4 B5:2 A5:2 |'
              'B5:4 G5:2 E5:2 G5:2 B5:2 E6:4 | E6:4 D6:2 C6:2 G5:4 E5:4 | C6:2 E6:2 A6:4 G6:2 E6:2 C6:4 | F#5:2 A5:2 B5:4 D#6:4 F#6:4')
    B = frase('B5:3 D6:1 G6:4 E6:2 D6:2 B5:4 | A5:3 D6:1 F#6:4 E6:2 D6:2 A5:4 | G5:3 B5:1 E6:4 D6:2 B5:2 G5:4 | D6:3 F#6:1 B6:4 A6:2 F#6:2 D6:4 |'
              'E6:3 G6:1 C7:4 A6:2 G6:2 E6:4 | D6:3 G6:1 B6:4 A6:2 G6:2 D6:4 | C6:3 E6:1 A6:4 G6:2 E6:2 C6:4 | D#6:2 F#6:2 B6:4 A6:2 F#6:2 D#6:4')
    BF = une((sube(corta(B, 0, 7), 2), 7), (corta(B, 7, 8), 1))
    S1 = frase('A5:1 C6:1 E6:1 A6:1 E6:1 C6:1 A5:1 C6:1 E6:2 C6:2 A5:4 | D6:1 F#6:1 A6:1 D7:1 A6:1 F#6:1 D6:1 F#6:1 A6:4 F#6:4 |'
               'G5:1 B5:1 D6:1 G6:1 D6:1 B5:1 G5:1 B5:1 D6:2 G6:2 B6:4 | E6:2 G6:2 B6:4 G6:1 E6:1 B5:1 G5:1 E5:4 |'
               'C6:1 E6:1 A6:1 C7:1 A6:1 E6:1 C6:1 E6:1 A6:3 -:1 E6:2 C6:2 | F#6:1 A6:1 D7:1 A6:1 F#6:1 A6:1 D7:1 A6:1 F#6:4 D6:4 |'
               'G6:1 B6:1 E7:1 B6:1 G6:1 B6:1 E7:1 B6:1 G6:4 E6:4 | F#6:1 D#6:1 B5:1 D#6:1 F#6:1 A6:1 F#6:1 D#6:1 B5:4 -:4')
    S2b = frase('E6:2 A6:2 C7:4 A6:2 E6:2 C6:4 | D6:2 F#6:2 A6:4 D7:4 A6:2 F#6:2 | G6:2 B6:2 E7:4 D7:2 B6:2 G6:4 | D#6:1 F#6:1 A6:1 B6:1 A6:1 F#6:1 D#6:1 B5:1 F#5:8')
    S2 = une((mordentes(corta(S1, 0, 4), ARM, 1.0, 1), 4), (S2b, 4))
    SL = frase('B5:8 E6:6 D6:2 | C6:8 G5:4 E5:4 | A5:6 C6:2 E6:8 | D#6:8 F#6:4 D#6:4 | E6:6 G6:2 B6:8 | C7:4 G6:4 E6:8 | F#6:6 A6:2 D7:4 A6:4 | G#6:8 B6:4 E7:4')
    CODA = frase('B5:3 E6:1 G6:4 B6:4 G6:2 E6:2 | C6:3 E6:1 G6:4 C7:4 G6:2 E6:2 | A5:3 C6:1 E6:4 A6:4 E6:2 C6:2 | F#5:2 A5:2 D#6:4 F#6:4 D#6:2 B5:2')
    for nombre, notas, ch in (('A', A, CH_A), ('B', B, CH_B), ('S1', S1, CH_M), ('S2', S2, CH_M), ('SL', SL, CH_SL), ('coda', CODA, CH_CO)):
        revisa(f'juan {nombre}', notas, [[a] for a in ch])

    BAJO = '0-..0-5.0-..0-5.'
    BAJO2 = '0-..0-5.0-5.0-3.'
    BM1 = '0-0-..5-0-0-..5-'
    BM2 = '0.0.5.0.0.0.5.3.'
    BONGO_LO, BONGO_HI, GUIRA, GUIRA_SUAVE, BOMBO = '....x.......X...', '...o...o...o...o', '..x...x...x...x.', '.o...o...o...o..', 'X.......x.......'
    BASE = [(BOMBO, 'gb_bombo'), (BONGO_LO, 'gb_bongo_lo'), (BONGO_HI, 'gb_bongo_hi'), (GUIRA, 'gb_guira'), (GUIRA_SUAVE, 'gb_guira')]
    MART_HI, MART_LO = 'o.x.o.x.o.x.o.x.', '..x.......x.....'
    MAMBO = [(BOMBO, 'gb_bombo'), (MART_LO, 'gb_bongo_lo'), (MART_HI, 'gb_bongo_hi'), ('x.x.x.x.x.x.x.x.', 'gb_guira')]

    def ronda(t):
        # Intro: the requinto alone in slow arpeggios, then in sixteenths; on the fifth bar the rhythm guitar, bass and percussion arrive.
        m('Intro (requinto)', t, 8, 'Mi menor')
        arpegio(c['lead'], t, CH_A[:4], patron=(0, 2, 1, 3, 2, 1), desde='E4', paso=0.5, dur=0.42, vel=78)
        arpegio(c['lead'], t + 4 * L, CH_A[4:], patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='E4', paso=0.25, dur=0.2, vel=84)
        arpegio(c['seg'], t + 4 * L, CH_A[4:], patron=(0, 2, 1, 2), desde='E3', paso=0.5, dur=0.42, vel=60)
        bajo(c['bajo'], t + 4 * L, CH_A[4:], BAJO, vel=90, caida=0.85)
        bat(c['rui'], t, 4, [(['', '', GUIRA_SUAVE, GUIRA_SUAVE], 'gb_guira'), (['', '', '', BONGO_LO], 'gb_bongo_lo')], vel=84)
        bat(c['rui'], t + 4 * L, 4, BASE[:4], 'bongos', crash=80)
        t += 8 * L
        # A: the requinto's quick arpeggios and tune, the rhythm guitar picking eighths, the syncopated bass.
        m('A (tema del requinto)', t, 8, 'Mi menor')
        tocar(c['lead'], t, A, 102)
        arpegio(c['seg'], t, CH_A, patron=(0, 2, 1, 2), desde='E3', paso=0.5, dur=0.42, vel=70)
        bajo(c['bajo'], t, CH_A, BAJO, vel=96, caida=0.85)
        bat(c['rui'], t, 8, BASE, 'bongos', crash=84)
        t += 8 * L
        # A': the tune on the 50 % twin with mordents, the guitar picking sixteenths, a bass that adds a walk.
        m("A' (guitarra en semicorcheas)", t, 8, 'Mi menor')
        tocar(c['lead2'], t, mordentes(A, ARM, 1.0, 2), 104)
        arpegio(c['seg'], t, CH_A, patron=(0, 2, 1, 2), desde='E3', paso=0.25, dur=0.2, vel=66)
        bajo(c['bajo'], t, CH_A, [BAJO, BAJO2], vel=98, caida=0.85)
        bat(c['rui'], t, 8, BASE, 'bongos')
        t += 8 * L
        # B: the chorus in G on the 50 % twin; the guitar picks a little deeper, a crash on the first beat.
        m('B (estribillo)', t, 8, 'Sol mayor')
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 2, 1, 2), desde='E3', paso=0.5, dur=0.42, vel=72)
        bajo(c['bajo'], t, CH_B, BAJO, vel=98, caida=0.85)
        bat(c['rui'], t, 8, BASE, 'bongos', crash=84)
        t += 8 * L
        # B': the chorus on the 25 % lead with a harmony in thirds and a bass that answers on the off-beats.
        m("B' (estribillo con armonía)", t, 8, 'Sol mayor')
        tocar(c['lead'], t, mordentes(B, SOL, 1.0, 3), 102)
        segunda_voz(c['seg'], t, B, CH_B, SOL, vel=80)
        bajo(c['bajo'], t, CH_B, [BAJO2, BM1], vel=98, caida=0.85)
        bat(c['rui'], t, 8, [(BOMBO, 'gb_bombo'), (BONGO_LO, 'gb_bongo_lo'), (BONGO_HI, 'gb_bongo_hi'), ('x.x.x.x.x.x.x.x.', 'gb_guira')], 'bongos', crash=88)
        t += 8 * L
        # Mambo, first eight: the requinto solo in front on the 12.5 % lead, the guitar chopping the chords, martillo bongos and a fast guira.
        m('Mambo 1 (solo del requinto)', t, 8, 'La menor / Mi menor')
        tocar(c['lead3'], t, S1, 100)
        sacudida(c['seg3'], t, CH_M, 'x--.x-x.x--.x-x.', desde='E3', vel=76, caida=0.6)
        bajo(c['bajo'], t, CH_M, [BM1, BM2], vel=100, caida=0.85)
        bat(c['rui'], t, 8, MAMBO, 'bongos', vel=100, crash=96)
        t += 8 * L
        # Mambo, second eight: the solo answers itself and goes on with new runs on the 25 % lead; the guitar picks sixteenths.
        m('Mambo 2 (el solo sigue)', t, 8, 'La menor / Mi menor')
        tocar(c['lead'], t, S2, 104)
        arpegio(c['seg'], t, CH_M, patron=(0, 1, 2, 3, 2, 1), desde='E3', paso=0.25, dur=0.2, vel=66)
        bajo(c['bajo'], t, CH_M, [BM2, BM1], vel=102, caida=0.85)
        bat(c['rui'], t, 8, [('X...x...X...x...', 'gb_bombo'), (MART_LO, 'gb_bongo_lo'), (MART_HI, 'gb_bongo_hi'), ('xoxoxoxoxoxoxoxo', 'gb_guira')], 'bongos', vel=102, crash=100)
        t += 8 * L
        # Break: the bass solo and the bongos; the guira comes back on the third bar.
        m('Bajo y bongós (solo)', t, 4, 'Mi menor')
        bajo(c['bajo'], t, CH_BK, ['0-..0-5.8-5.0-..', '5-..5-3.0-d.0-..', '0-0-..5-0-0-..3-', '0-..5-..8-..5-0-'], vel=104, caida=0.9)
        sacudida(c['seg'], t + 3 * L, CH_BK[3:], 'x---x---x---x---', desde='E3', vel=60, caida=0.9)
        bat(c['rui'], t, 4, [(['', '', BOMBO, BOMBO], 'gb_bombo'), (['....x.......X...', '....x.......X...', BONGO_LO, BONGO_LO], 'gb_bongo_lo'), (['o.o.o.o.o.o.o.o.', 'o.o.o.o.o.o.o.o.', BONGO_HI, BONGO_HI], 'gb_bongo_hi'),
                             (['', '', GUIRA, 'x.x.x.x.x.x.x.x.'], 'gb_guira')], 'bongos', vel=92)
        t += 4 * L
        # C: the bridge: the requinto runs in sixteenths over chopped chords, and a bongo roll back to the top.
        m('C (puente de arpegios)', t, 8, 'La menor')
        arpegio(c['lead'], t, CH_C, patron=(0, 1, 2, 3, 2, 1, 3, 2), desde='A4', vel=88, dur=0.2)
        sacudida(c['seg'], t, CH_C, 'x--.x-x.x--.x-x.', desde='E3', vel=76, caida=0.6)
        bajo(c['bajo'], t, CH_C, BAJO, vel=98, caida=0.85)
        bat(c['rui'], t, 8, BASE[:3] + [('x.x.x.x.x.x.x.x.', 'gb_guira')], 'redoble', vel=100, crash=92)
        t += 8 * L
        # Slow bridge: half time, long notes on the 50 % twin, a soft broken chord and a bass that holds; it ends on E7.
        m('Puente lento', t, 8, 'Mi menor, acaba en Mi7')
        tocar(c['lead2'], t, SL, 92)
        arpegio(c['seg'], t, CH_SL, patron=(0, 1, 2, 1), desde='E3', paso=0.5, dur=0.45, vel=52)
        bajo(c['bajo'], t, CH_SL, ['0-------5-------', '0-------0-------'], vel=92, caida=0.95)
        bat(c['rui'], t, 6, [('X...............', 'gb_bombo'), ('........x.......', 'gb_bongo_lo'), (['.o.o.o.o.o.o.o.o'], 'gb_guira')], vel=80, crash=76)
        bat(c['rui'], t + 6 * L, 2, [(['X.......x.......', 'X.......x.......'], 'gb_bombo'), (['....x.......x...', '....x.x.x.x.xxxx'], 'gb_caja')], 'redoble', vel=88)
        t += 8 * L
        # Final chorus: a tone higher, in A major, on the 50 % twin; the guitar picks sixteenths, every drum; it lands on B7.
        m('B+2 (estribillo, un tono arriba)', t, 8, 'La mayor')
        tocar(c['lead2'], t, BF, 106)
        arpegio(c['seg'], t, CH_BF, patron=(0, 2, 1, 2), desde='E3', paso=0.25, dur=0.2, vel=68)
        bajo(c['bajo'], t, CH_BF, [BM1, BAJO2], vel=102, caida=0.85)
        bat(c['rui'], t, 8, [('X...x...X...x...', 'gb_bombo'), (BONGO_LO, 'gb_bongo_lo'), (BONGO_HI, 'gb_bongo_hi'), ('xoxoxoxoxoxoxoxo', 'gb_guira')], 'bongos', vel=102, crash=104)
        t += 8 * L
        # The tune once more in E minor on the 25 % lead with mordents, chops and the full percussion.
        m("A'' (tema final)", t, 8, 'Mi menor')
        tocar(c['lead'], t, mordentes(A, ARM, 1.0, 1), 106)
        sacudida(c['seg3'], t, CH_A, 'x--.x-x.x--.x-x.', desde='E3', vel=76, caida=0.6)
        bajo(c['bajo'], t, CH_A, [BM1, BM2], vel=102, caida=0.85)
        bat(c['rui'], t, 8, MAMBO, 'redoble', vel=102, crash=108)
        t += 8 * L
        # Coda: four bars on Em, C, Am and B7, which pulls back to the intro.
        m('Coda (enlaza con la intro)', t, 4, 'Mi menor')
        tocar(c['lead2'], t, CODA, 104)
        arpegio(c['seg'], t, CH_CO, patron=(0, 2, 1, 2), desde='E3', paso=0.5, dur=0.42, vel=70)
        bajo(c['bajo'], t, CH_CO, BAJO, vel=98, caida=0.85)
        bat(c['rui'], t, 4, BASE, 'bongos', crash=92)
        return t + 4 * L

    return C, ronda, beats, bpm, m


# --- Combate 8: «Coches de choque» (La feria) ----------------------------------------------------
# Two more sounds for the noise channel, made like the drums of pokeusera.py (the register's clock and the volume steps): the crackle of
# a sparking pole and the long hiss of an electric arc. Any other sound goes to the kit that was already installed.
_golpe_antes_feria = sinte.golpe


def golpe_feria(tipo, vel, semilla=0):
    a = (vel / 127) ** 1.3
    if tipo == 'gb_chispa':  # a crackle: four short bursts of bright noise
        nm = int(0.14 * SR)
        w = base._lfsr_gb(nm, 44100, 44100, 1.0, semilla=semilla)
        t = np.arange(nm) / SR
        e = np.zeros(nm)
        for d, g, tau in ((0.0, 1.0, 0.010), (0.022, 0.7, 0.008), (0.047, 0.85, 0.009), (0.083, 0.5, 0.012)):
            i = int(d * SR)
            e[i:] += g * np.exp(-t[:nm - i] / tau)
        w = sinte._filtro(w, 'highpass', 3200, 3) * 1.5 * np.minimum(1, e)
    elif tipo == 'gb_arco':  # an electric arc: a long hiss whose clock falls, flickering like mains current
        nm = int(0.42 * SR)
        w = base._lfsr_gb(nm, 44100, 9000, 0.12, semilla=semilla)
        t = np.arange(nm) / SR
        parpadeo = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 48 * t))
        w = sinte._filtro(w, 'highpass', 1800, 2) * 1.3 * base._env4(nm, 0.16) * parpadeo
    else:
        return _golpe_antes_feria(tipo, vel, semilla)
    k = min(48, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


sinte.golpe = golpe_feria


def combate_feria():
    """A minor / C major, 140 bpm, 104 bars: the fair at night. A fairground barrel organ plays alone (oom-pah, bass drum and
    snare, like the real ones) until somebody plugs the track in: a power-up riser and the eurodance comes in. Groove; the
    dodgem hook (A) over A minor; the hook again on the 50 % twin with a second voice (A'); a verse of chopped stabs on the
    12.5 % lead; the sing-along chorus (B) on F, G, Am, Em; a breakdown where the organ comes back by itself; a build-up;
    the drop with the hook on a wobbling pulse (width modulation); «Coches de choque», a half-time bridge of bouncing
    bumps on the pitch-blip lead, buzzing pole and sparks; a second build-up a tone up; the chorus in B minor / D major; the
    last hook in B minor; and an outro in which the track is unplugged and the organ goes back to C major on Am, F, Dm and
    G7, so the loop falls on its own beginning."""
    bpm = tempo(140)
    beats = 104 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    # The organ: the 50 % lead with a quick vibrato (the pipes' tremolo) and chords on the 50 % second pulse arpeggiated faster than usual.
    c['lead2'].inst = Inst('pulso', duty=0.5, adsr=(0.003, 0.06, 0.8, 0.04), vib=(16, 6.6, 0.0))
    c['seg2'].inst = Inst('pulso', duty=0.5, adsr=(0.002, 0.06, 0.6, 0.03), arp_hz=84)
    # Eurodance colours: a wobbling pulse (width modulation), the bumper's pitch blip, and two zap voices (one per pulse).
    c['pwm'] = C.pista('lead pwm', Inst('pulso', duty=0.3, pwm=(0.17, 3.3), adsr=(0.002, 0.12, 0.7, 0.05), vib=(14, 6.0, 0.2)), vol=-6, reverb=0)
    c['boing'] = C.pista('lead boing', Inst('pulso', duty=0.5, adsr=(0.001, 0.09, 0.25, 0.03), ataque=(14, 0.05)), vol=-5, reverb=0)
    c['zap'] = C.pista('lead zap', Inst('pulso', duty=0.125, adsr=(0.001, 0.2, 0.5, 0.03)), vol=-7, reverb=0)
    c['zap2'] = C.pista('pulso 2 zap', Inst('pulso', duty=0.25, adsr=(0.001, 0.2, 0.55, 0.03)), vol=-5, reverb=0)
    m = Mapa(beats)
    s_beat = 60.0 / bpm
    MENOR, MAYOR = escala('A', 'menor'), escala('C', 'mayor')
    ARM = armonica('A')

    def zap(P, t0, arriba='C8', abajo='C6', dur=0.5, vel=96):
        """A falling electric zap: a short note that drops from `arriba` to `abajo`."""
        P.nota(t0, dur, abajo, vel, desde=arriba, deslizar=dur * s_beat * 0.9)

    def sube_zap(P, t0, dur, desde, hasta, vel=100):
        """A power-up: one long note that climbs from `desde` to `hasta` over `dur` beats."""
        P.nota(t0, dur, hasta, vel, desde=desde, deslizar=dur * s_beat * 0.95)

    CH_IN = ['C', 'G7', 'C', 'F', 'C', 'Am', 'Dm', 'G7']
    CH_SE = ['Am', 'Am', 'E7', 'E7']
    CH_A = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E7']
    CH_V = ['Am', 'Am', 'F', 'F', 'C', 'G', 'Am', 'E7']
    CH_B = ['F', 'G', 'Am', 'Em', 'F', 'G', 'C', 'E7']
    CH_BD = ['Am', 'E7', 'Am', 'Dm', 'F', 'G', 'E7', 'E7']
    CH_BU = ['Am', 'F', 'G', 'E7']
    CH_CH = ['Em', 'Em', 'Am', 'Am', 'F', 'F', 'E7', 'E7']
    CH_BU2 = ['Bm', 'G', 'A', 'F#7']
    CH_B2 = ['G', 'A', 'Bm', 'F#m', 'G', 'A', 'D', 'F#7']
    CH_A2 = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'F#7']
    CH_OU = ['Am', 'F', 'Dm', 'G7']
    INTRO = frase('C6:4 G5:2 E5:2 G5:4 E5:2 C5:2 | D6:4 B5:2 G5:2 B5:4 D6:4 | E6:4 C6:2 E6:2 G6:4 E6:2 C6:2 | A5:2 C6:2 F6:4 A6:2 G6:2 F6:4 |'
                  'C6:2 E6:2 G6:4 E6:2 C6:2 G5:4 | A5:2 C6:2 E6:4 A6:4 G6:2 E6:2 | D6:4 F6:2 A6:2 F6:4 D6:2 F6:2 | G6:2 F6:2 D6:2 B5:2 G5:4 G5:2 B5:2')
    ENCHUFA = frase('E6:6 -:2 C6:6 -:2 | A5:6 -:2 E5:8')
    A = frase('E6:2 -:2 E6:2 A6:2 -:2 G6:2 E6:4 | F6:2 -:2 F6:2 A6:2 -:2 G6:2 F6:4 | E6:2 -:2 E6:2 G6:2 -:2 C7:2 G6:4 | D6:2 -:2 D6:2 G6:2 B6:4 A6:2 G6:2 |'
              'E6:2 -:2 E6:2 A6:2 -:2 C7:2 B6:2 A6:2 | A6:4 F6:2 A6:2 C7:4 A6:4 | B6:2 D7:2 B6:2 G6:2 D6:4 G6:4 | G#6:2 B6:2 E7:4 D7:2 B6:2 G#6:4')
    V = frase('A5:1 -:1 A5:1 -:1 C6:2 -:2 A5:2 E6:2 D6:2 C6:2 | A5:1 -:1 A5:1 -:1 C6:2 -:2 A5:2 E6:2 G6:2 E6:2 | F5:1 -:1 F5:1 -:1 A5:2 -:2 F5:2 C6:2 A5:2 C6:2 |'
              'F5:1 -:1 F5:1 -:1 A5:2 -:2 F5:2 C6:2 D6:2 C6:2 | E5:1 -:1 E5:1 -:1 G5:2 -:2 E5:2 C6:2 G5:2 E6:2 | D5:1 -:1 D5:1 -:1 G5:2 -:2 D5:2 B5:2 D6:2 G6:2 |'
              'A5:1 -:1 A5:1 -:1 C6:2 -:2 E6:2 A6:2 E6:2 C6:2 | B5:4 G#5:2 B5:2 E6:4 D6:2 B5:2')
    B = frase('C7:4 A6:4 F6:4 A6:4 | B6:4 G6:4 D6:4 G6:4 | C7:6 B6:2 A6:4 E6:4 | G6:4 E6:4 B5:4 E6:4 |'
              'F6:2 A6:2 C7:4 A6:2 F6:2 C7:4 | D7:4 B6:4 G6:2 B6:2 D7:4 | E7:6 D7:2 C7:4 G6:4 | G#6:2 B6:2 E7:6 D7:2 B6:2 G#6:2')
    BD = frase('A5:4 C6:4 E6:8 | D6:4 B5:4 G#5:8 | A5:4 C6:4 A6:8 | F6:4 D6:4 A5:4 D6:4 | C6:4 F6:4 A6:4 F6:4 | B5:4 D6:4 G6:4 D6:4 | G#5:4 B5:4 D6:4 B5:4 | E6:8 B5:4 G#5:4')
    BU = frase('A5:16 | C6:8 F6:8 | D6:8 G6:8 | B6:6 E7:4 G#6:2 B6:4')
    CHQ = frase('E5:2 -:2 E5:2 -:2 B5:2 E6:2 -:4 | E5:2 -:2 E5:2 -:2 G5:2 B5:2 E6:4 | A5:2 -:2 A5:2 -:2 E6:2 A6:2 -:4 | A5:2 -:2 A5:2 -:2 C6:2 E6:2 A6:4 |'
                'F5:2 -:2 F5:2 -:2 C6:2 F6:2 -:4 | F5:2 -:2 F5:2 -:2 A5:2 C6:2 F6:4 | E6:2 -:2 E6:2 -:2 G#6:2 B6:2 -:2 E7:2 | D7:2 B6:2 G#6:2 E6:2 B5:2 G#5:2 E5:4')
    BU2 = frase('B5:16 | D6:8 G6:8 | E6:8 A6:8 | C#7:6 F#7:4 A#6:2 C#7:4')
    B2 = sube(B, 2)
    A2 = sube(A, 2)
    OUT = frase('-:8 E6:4 C6:4 | F6:4 A6:4 C7:4 A6:4 | D6:4 F6:4 A6:4 F6:4 | B5:4 D6:4 G6:4 D6:4')
    for nombre, notas, ch in (('intro', INTRO, CH_IN), ('A', A, CH_A), ('V', V, CH_V), ('B', B, CH_B), ('BD', BD, CH_BD), ('CHQ', CHQ, CH_CH),
                              ('OUT', OUT, CH_OU)):
        revisa(f'feria {nombre}', notas, [[a] for a in ch])

    K4, CLAP, HAT8, HAT16 = 'X...X...X...X...', '....x.......x...', '..x...x...x...x.', '.o.o.o.o.o.o.o.o'
    OOMPAH = '0-......5-......'
    OFFB = '..0-..0-..0-..0-'
    SINC = '0..0..0.0..0..0.'
    SALTO = '0.0.8.0.0.0.8.0.'
    RUEDA = '.0.0.0.0.0.0.0.0'
    # Sparks: a crackle that takes the place of a hat on a few steps (listed before the hats, so it wins the step).
    CH1, CH2 = '...........x....', '.....x.......x.x'

    def ronda(t):
        # Intro: the barrel organ alone. The tune on the 50 % lead, chords chopped on the second beats, oom-pah bass, a soft bass
        # drum on one and three and a snare on two and four, like the cardboard-book organs of a fair.
        m('Intro (organillo)', t, 8, 'Do mayor')
        tocar(c['lead2'], t, INTRO, 98)
        sacudida(c['seg2'], t, CH_IN, '....x.......x...', desde='C4', vel=72, caida=0.55)
        bajo(c['bajo'], t, CH_IN, OOMPAH, vel=94, caida=0.8)
        bat(c['rui'], t, 8, [('X.......X.......', 'gb_bombo'), ('....o.......o...', 'gb_caja')], 'redoble4', vel=84, crash=90)
        t += 8 * L
        # Se enchufa: the organ runs down (two slow bars), a zap, and the power-up climbs over a snare roll into the groove.
        m('Se enchufa la pista', t, 4, 'La menor')
        tocar(c['lead2'], t, ENCHUFA, 92)
        bajo(c['bajo'], t, CH_SE[:2], '0---------------', vel=88, caida=0.95)
        zap(c['zap'], t + 2 * L, 'C8', 'A5', 2, 96)
        sube_zap(c['zap2'], t + 2 * L + 2, 6, 'A3', 'A6', 104)
        c['rui'].golpe(t + 2 * L, 'gb_arco', 100)
        redoble(c['rui'], t + 2 * L + 2, 40, 100, 8)
        redoble(c['rui'], t + 3 * L, 70, 124, 16)
        bajo(c['bajo'], t + 2 * L, CH_SE[2:], ['....0-0-0-0-0-0-', '0.0.0.0.0.0.0.0.'], vel=96, caida=0.8)
        t += 4 * L
        # Groove: four to the floor, claps, off-beat hats, chopped stabs, the bumping bass; the hook shows its first four bars.
        m('Groove', t, 8, 'La menor')
        tocar(c['lead'], t + 4 * L, corta(A, 0, 4), 100)
        sacudida(c['seg'], t, CH_A, 'x..x..x.x..x..x.', desde='A3', vel=70, caida=0.5)
        bajo(c['bajo'], t, CH_A, [OFFB] * 3 + [SINC], vel=98, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (['', '', '', CH1] * 2, 'gb_chispa'), (HAT16, 'gb_hat')], 'redoble4', crash=96)
        t += 8 * L
        # A: the dodgem hook over Am, F, C, G; sixteenth arpeggios under it.
        m('A (gancho)', t, 8, 'La menor')
        tocar(c['lead'], t, A, 104)
        arpegio(c['seg'], t, CH_A, patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='A4', vel=62, dur=0.2)
        bajo(c['bajo'], t, CH_A, [OFFB, OFFB, OFFB, SINC, OFFB, OFFB, SALTO, SINC], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_caja'), (HAT8, 'gb_hatab'), (['', CH1, '', CH2], 'gb_chispa'), (HAT16, 'gb_hat')], 'redoble4', crash=100)
        t += 8 * L
        # A': the hook on the 50 % twin with mordents and a second voice in thirds, the bass jumping octaves.
        m("A' (segunda voz)", t, 8, 'La menor')
        tocar(c['lead2'], t, mordentes(A, ARM, 1.0, 2), 104)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=80)
        bajo(c['bajo'], t, CH_A, [SALTO, SALTO, SALTO, SINC, SALTO, SALTO, RUEDA, SINC], vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'toms', crash=100)
        t += 8 * L
        # Verse: the 12.5 % lead chops a short tune under the heavy bass, claps on two and four, a spark now and then.
        m('Estrofa (picada)', t, 8, 'La menor')
        tocar(c['lead3'], t, V, 98)
        sacudida(c['seg'], t, CH_V, '..x...x...x...x.', desde='A3', vel=64, caida=0.5)
        bajo(c['bajo'], t, CH_V, [SINC, SINC, SINC, SINC, SINC, SINC, SALTO, SINC], vel=102, caida=0.85)
        bat(c['rui'], t, 8, [('X.......X.......', 'gb_bombo'), (CLAP, 'gb_caja'), (['', CH2], 'gb_chispa'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'caja', crash=92)
        t += 8 * L
        # B: the sing-along chorus on F, G, Am, Em, long notes high on the 25 % lead, a second voice, everything playing.
        m('B (estribillo)', t, 8, 'Do mayor')
        tocar(c['lead'], t, B, 106)
        segunda_voz(c['seg'], t, B, CH_B, MAYOR, vel=80)
        bajo(c['bajo'], t, CH_B, [SALTO, SALTO, SALTO, SINC, SALTO, SALTO, SALTO, SINC], vel=104, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', crash=110)
        t += 8 * L
        # Breakdown: no kick; the organ comes back by itself with a sad tune in A minor, oom-pah under it, a spark from the pole.
        m('Puente (el organillo solo)', t, 8, 'La menor')
        tocar(c['lead2'], t, BD, 94)
        sacudida(c['seg2'], t, CH_BD, '....x.......x...', desde='A3', vel=68, caida=0.55)
        bajo(c['bajo'], t, CH_BD, OOMPAH, vel=92, caida=0.8)
        bat(c['rui'], t, 4, [('....o.......o...', 'gb_caja'), (['', CH1], 'gb_chispa'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], vel=84, crash=86)
        bat(c['rui'], t + 4 * L, 2, [('X.......X.......', 'gb_bombo'), ('....o.......o...', 'gb_caja')], vel=88)
        bat(c['rui'], t + 6 * L, 2, [('x.x.x.x.x.x.x.x.', 'gb_caja')], 'redoble', vel=88, crash=84)
        t += 8 * L
        # Build-up: the kick returns, the 12.5 % lead climbs in long notes, the stabs speed up and the snare doubles twice before the stop.
        m('Subida (build-up)', t, 4, 'La menor')
        tocar(c['lead3'], t, BU, 98)
        sacudida(c['seg'], t, CH_BU, ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='A3', vel=66, caida=0.5)
        bajo(c['bajo'], t, CH_BU, [OFFB, RUEDA, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=98, caida=0.8)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo'), (['', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=94)
        t += 4 * L
        # Drop: the hook on the wobbling pulse (width modulation), arpeggios, jumping bass and every drum.
        m('Drop (gancho ondulante)', t, 8, 'La menor')
        tocar(c['pwm'], t, A, 106)
        arpegio(c['seg'], t, CH_A, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='A4', vel=64, dur=0.2)
        bajo(c['bajo'], t, CH_A, [SALTO, SALTO, SALTO, SINC, SALTO, SALTO, RUEDA, SALTO], vel=104, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (['', CH1, '', CH2], 'gb_chispa'), (HAT16, 'gb_hat')], 'redoble4', crash=112)
        t += 8 * L
        # Coches de choque: half time. The pitch-blip lead bumps on the off-beats, the pole buzzes in a held chord, the bass thuds
        # and sparks crackle on the off-beat eighths; the last bars climb on E7.
        m('Coches de choque (puente)', t, 8, 'Mi menor / La menor')
        tocar(c['boing'], t, CHQ, 100)
        sacudida(c['seg3'], t, CH_CH, 'x---------------', desde='E4', vel=56, caida=0.97)
        bajo(c['bajo'], t, CH_CH, ['0-----..0-0-....', '0-----..0-0-0-..', '0-----..0-0-....', '0-----..0-0-0-..', '0-----..0-0-....', '0-----..0-0-0-..', '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.8.8.'], vel=104, caida=0.8)
        bat(c['rui'], t, 8, [(['X.....x...X.x...'] * 7 + ['X.....x...X.xxxx'], 'gb_bombo'), (CLAP, 'gb_caja'), ('..x...x...x...x.', 'gb_chispa'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'redoble', vel=100, crash=100)
        t += 8 * L
        # Second build-up, a tone higher (B minor): the pad climbs on B, G, A and F sharp.
        m('Subida 2 (un tono arriba)', t, 4, 'Si menor')
        tocar(c['lead3'], t, BU2, 100)
        sacudida(c['seg'], t, CH_BU2, ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='B3', vel=68, caida=0.5)
        bajo(c['bajo'], t, CH_BU2, [OFFB, OFFB, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=100, caida=0.8)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo'), (['....x...', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=96)
        t += 4 * L
        # B+2: the chorus in B minor / D major on the 50 % twin with its second voice.
        m('B+2 (estribillo, un tono arriba)', t, 8, 'Si menor / Re mayor')
        tocar(c['lead2'], t, B2, 108)
        segunda_voz(c['seg'], t, B2, CH_B2, escala('D', 'mayor'), vel=82)
        bajo(c['bajo'], t, CH_B2, [SALTO, SALTO, SALTO, SINC, SALTO, SALTO, SALTO, SINC], vel=106, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (['', CH1, '', CH2], 'gb_chispa'), (HAT16, 'gb_hat')], 'toms', crash=114)
        t += 8 * L
        # The last hook in B minor on the wobbling pulse, with a harmony, ending on F sharp 7.
        m('A+2 (gancho final)', t, 8, 'Si menor')
        tocar(c['pwm'], t, A2, 108)
        segunda_voz(c['seg'], t, A2, CH_A2, escala('B', 'menor'), vel=78)
        bajo(c['bajo'], t, CH_A2, [SALTO, SALTO, SALTO, SINC, SALTO, SALTO, RUEDA, SALTO], vel=106, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), ('....X.......X..x', 'gb_caja'), (HAT8, 'gb_hatab'), (['', CH1, '', CH2], 'gb_chispa'), (HAT16, 'gb_hat')], 'redoble', crash=116)
        t += 8 * L
        # Outro: somebody pulls the plug (a falling zap and an arc), and the organ plays on in C major over Am, F, Dm and G7,
        # which pulls back to the intro.
        m('Salida (se desenchufa)', t, 4, 'Do mayor')
        zap(c['zap'], t, 'E7', 'E5', 2, 98)
        c['rui'].golpe(t, 'gb_arco', 104)
        tocar(c['lead2'], t, OUT, 96)
        sacudida(c['seg2'], t, CH_OU, '....x.......x...', desde='A3', vel=70, caida=0.55)
        bajo(c['bajo'], t, CH_OU, OOMPAH, vel=94, caida=0.8)
        bat(c['rui'], t + L, 3, [('X.......X.......', 'gb_bombo'), ('....o.......o...', 'gb_caja')], vel=84)
        return t + 4 * L

    return C, ronda, beats, bpm, m


# @@CANCIONES@@

CANCIONES = {'combate-verbena': combate_verbena, 'combate-electro': combate_electro, 'combate-terraza': combate_terraza, 'combate-rural': combate_rural, 'combate-juan': combate_juan, 'combate-feria': combate_feria}

if __name__ == '__main__':
    pedidas = sys.argv[1:2] or ['todas']
    if pedidas == ['todas']:
        pedidas = list(CANCIONES)
    for nombre in pedidas:
        if nombre not in CANCIONES:
            sys.exit(f'No conozco «{nombre}»: {", ".join([*CANCIONES, "todas"])}')
        salir(nombre)
