# Music of «PokéUsera · Edición Jarra»: eight original Game Boy style tunes (docs/POKEUSERA.md).
# Four channels, as on the console: two pulse waves (LEAD and SEG: duty 12.5 / 25 / 50 %), one
# 16-step wave channel for the bass (the stepped triangle) and one LFSR noise channel for the
# drums. No reverb, no echo, no pan (everything mono and centred), a small late vibrato on the
# lead, and chords faked with fast chip arpeggios (60 steps a second, like the console's frames).
# Every melody is written here for the game; none quotes any other tune.
#
#   python3 pokeusera.py titulo      title / menu theme, G major, 126 bpm, loop     -> src/sonido/pokeusera-titulo.mp3
#   python3 pokeusera.py draft       team picking, C major with a swing, 110 bpm, loop
#   python3 pokeusera.py combate     the battle, D minor, 156 bpm, loop (heard the most; the other three battle tunes
#                                    below take turns with it: sonido.ts picks one at random for every battle)
#   python3 pokeusera.py combate-rock     battle 2: C minor, 144 bpm, rock with a fast arpeggio bass, loop
#   python3 pokeusera.py combate-verbena  battle 3: A minor / A major, 132 bpm, swung «pasodoble de verbena», loop
#   python3 pokeusera.py combate-electro  battle 4: F sharp minor, 130 bpm, tense, syncopated, electronic, loop
#   python3 pokeusera.py final       the last two standing, E minor, 172 bpm, loop
#   python3 pokeusera.py victoria    podium fanfare, C major, 140 bpm, once (not a loop)
#   python3 pokeusera.py todas       all of them (`bucle` after a name is accepted and changes nothing)
#
# Loops: three identical rounds are rendered and the middle one is kept with half a second of
# margin either side (exportar_bucle): the game loops from 0.5 s to 0.5 s + the round's length
# (LOOP in src/pokeusera/sonido.ts, printed below). MP3 at 24 kHz, 96 kbps, mono (docs/ESTILO.md, T5.11).
import os
import subprocess
import sys
import tempfile
import numpy as np
import sinte
from sinte import (Cancion, Inst, SR, frase, tocar, tonos, bajo_de, acorde, escala, tercera_abajo, midi, revisa, acorde_en,
                   arpegiar, exportar_bucle, ganancia_para, _master, _wav, _filtro)

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'src', 'sonido'))
L = 4  # beats in a bar


def tempo(bpm):
    """The bpm nearest to this one whose beat is a whole number of samples (and its sixteenth too): then every round of a loop
    is a whole number of samples long and all its notes land on the same samples, so the loop joins exactly."""
    return 60 * SR / (4 * round(60 * SR / bpm / 4))



# --- The noise channel ---------------------------------------------------------------------
# Drums are LFSR noise only: the register's clock (how fast it is stepped) falls for kicks and
# toms, stays high for hats, and the volume steps down in sixteen levels like the console's envelope.

def _lfsr_gb(nm, reloj_ini, reloj_fin, tau_reloj, corto=False, semilla=0):
    t = np.arange(nm) / SR
    reloj = reloj_fin + (reloj_ini - reloj_fin) * np.exp(-t / tau_reloj)
    seq = sinte._CORTO if corto else sinte._LARGO
    i = (np.cumsum(reloj) / SR).astype(np.int64) + semilla * 977
    return seq[i % len(seq)]


def _env4(nm, tau, ataque=0.0015):
    t = np.arange(nm) / SR
    e = np.floor(15 * np.exp(-t / tau) + 0.5) / 15
    return e * np.minimum(1, t / ataque)


_golpe_original = sinte.golpe


def golpe_gb(tipo, vel, semilla=0):
    a = (vel / 127) ** 1.3
    if tipo == 'gb_bombo':
        nm = int(0.16 * SR)
        w = _lfsr_gb(nm, 7500, 300, 0.028, semilla=semilla)
        w = _filtro(w, 'lowpass', 1400) * 3.2 * _env4(nm, 0.06)
    elif tipo == 'gb_caja':
        nm = int(0.14 * SR)
        w = _lfsr_gb(nm, 24000, 15000, 0.05, semilla=semilla)
        w = _filtro(w, 'highpass', 700) * 1.3 * _env4(nm, 0.05)
    elif tipo == 'gb_tom':
        nm = int(0.14 * SR)
        w = _lfsr_gb(nm, 3200, 1100, 0.05, semilla=semilla)
        w = _filtro(w, 'lowpass', 2200) * 2.4 * _env4(nm, 0.07)
    elif tipo in ('gb_hat', 'gb_hatab'):
        ab = tipo == 'gb_hatab'
        nm = int((0.17 if ab else 0.05) * SR)
        w = _lfsr_gb(nm, 44100, 44100, 1.0, semilla=semilla)
        w = _filtro(w, 'highpass', 5200, 4) * 1.5 * _env4(nm, 0.06 if ab else 0.012)
    elif tipo == 'gb_crash':
        nm = int(0.9 * SR)
        w = _lfsr_gb(nm, 44100, 30000, 0.3, semilla=semilla)
        w = _filtro(w, 'highpass', 2600, 2) * 1.3 * _env4(nm, 0.28)
    else:
        return _golpe_original(tipo, vel, semilla)
    k = min(48, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


sinte.golpe = golpe_gb


def bateria(P, t0, bombo='', caja='', hat='', abierto='', tom='', vel=100, compases=1):
    """Patterns of sixteen characters a bar (X accent, x hit, o soft, . nothing). One noise channel:
    when several land on one step only the first of snare, kick, tom, open hat, hat is played."""
    for c in range(compases):
        for k in range(16):
            for pat, tipo in ((caja, 'gb_caja'), (bombo, 'gb_bombo'), (tom, 'gb_tom'), (abierto, 'gb_hatab'), (hat, 'gb_hat')):
                ch = pat[k] if k < len(pat) else '.'
                if ch != '.':
                    P.golpe(t0 + c * L + k / 4, tipo, {'X': vel + 14, 'x': vel, 'o': vel - 34}[ch])
                    break


def redoble(P, t0, desde=36, hasta=112, pasos=16, tipo='gb_caja'):
    """A roll in sixteenths that grows."""
    for k in range(pasos):
        P.golpe(t0 + k * 0.25, tipo, desde + int((hasta - desde) * k / max(1, pasos - 1)))


# --- Voices -----------------------------------------------------------------------------------

def canales(C, vol_lead=-5, vol_seg=-10, vol_bajo=-4, vol_rui=-9, duty_lead=0.25, arp_hz=60):
    """The four channels. The lead and the second pulse each have a twin with another duty for
    sections that change the timbre (never playing together: checked by verifica)."""
    v = dict(vib=(20, 6.2, 0.16))
    c = {}
    c['lead'] = C.pista('lead 25%', Inst('pulso', duty=duty_lead, adsr=(0.002, 0.14, 0.7, 0.05), **v), vol=vol_lead, reverb=0)
    c['lead2'] = C.pista('lead 50%', Inst('pulso', duty=0.5, adsr=(0.002, 0.10, 0.65, 0.05), **v), vol=vol_lead - 2, reverb=0)
    c['seg'] = C.pista('pulso 2 12.5%', Inst('pulso', duty=0.125, adsr=(0.001, 0.07, 0.6, 0.03), arp_hz=arp_hz), vol=vol_seg, reverb=0)
    c['seg2'] = C.pista('pulso 2 50%', Inst('pulso', duty=0.5, adsr=(0.002, 0.10, 0.55, 0.04), vib=(14, 5.8, 0.2), arp_hz=arp_hz), vol=vol_seg - 2, reverb=0)
    c['bajo'] = C.pista('onda (bajo)', Inst('triangulo', pasos=16, adsr=(0.002, 0.07, 0.9, 0.02)), vol=vol_bajo, reverb=0)
    c['rui'] = C.pista('ruido', vol=vol_rui, reverb=0)
    return c


def verifica(nombre, C):
    """One note at a time on each melodic channel (the lead and its twin are the same channel)."""
    grupos = {'pulso 1': [p for p in C.pistas if p.nombre.startswith('lead')],
              'pulso 2': [p for p in C.pistas if p.nombre.startswith('pulso 2')],
              'onda': [p for p in C.pistas if p.nombre.startswith('onda')]}
    for g, ps in grupos.items():
        ev = sorted((b, b + d) for p in ps for (b, d, *_r) in p.notas)
        for (a0, a1), (b0, b1) in zip(ev, ev[1:]):
            if b0 < a1 - 1e-6:
                raise ValueError(f'{nombre}: dos notas a la vez en {g}, tiempo {b0:g}')


def _tercera(ch):
    return 3 if acorde(ch)[1][1] == 3 else 4


def _por_compas(patron, i):
    return patron[i % len(patron)] if isinstance(patron, (list, tuple)) else patron


def bajo(P, t0, acordes, patron, vel=100, oct=3, caida=0.82):
    """Bass line: one pattern (or one per bar) of sixteen steps, each a sixteenth.
    0 root, 3 third, 5 fifth, 8 octave up, a root an octave down, - holds, . rests."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 16, pat
        r = bajo_de(ch, oct)
        al = {'0': 0, '3': _tercera(ch), '5': 7, '8': 12, 'a': -12, '6': 9, 'b': 10}
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


def sacudida(P, t0, acordes, patron, desde='A3', vel=80, caida=0.9):
    """A chord faked by the chip arpeggio: one note whose pitch cycles through the chord's tones.
    patron: sixteen steps per bar, x starts a chord, - holds it, . rests."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 16, pat
        ts = tonos(ch, desde, midi(desde) + 11)
        offs = tuple([x - ts[0] for x in ts] + [12])
        k = 0
        while k < 16:
            if pat[k] == 'x':
                n_ = 1
                while k + n_ < 16 and pat[k + n_] == '-':
                    n_ += 1
                P.nota(t0 + i * L + k / 4, n_ * 0.25 * (caida if n_ == 1 else 0.97), ts[0], vel + (6 if k % 4 == 0 else 0), arp=offs)
                k += n_
            else:
                k += 1


def arpegio(P, t0, acordes, patron=(0, 1, 2, 1), desde='D4', vel=80, paso=0.25, dur=0.2):
    arpegiar(P, t0, [[a] for a in acordes], patron=patron, paso=paso, desde=desde, vel=vel, dur=dur)


def segunda_voz(P, t0, notas, acordes, esc, vel=88):
    """A harmony under the tune: a chord tone a third to a sixth down on held notes, a scale third on quick ones."""
    for b, d, m, *_ in notas:
        ch = acorde_en([[a] for a in acordes], b)
        if d >= 0.75:
            h = max(tonos(ch, m - 9, m - 3) or [m - 4])
        else:
            h = tercera_abajo(m, esc)
        P.nota(t0 + b, d, h, vel + (6 if b % 1 == 0 else 0))


# --- Titulo: «Jarra en alto» ------------------------------------------------------------------

def titulo():
    """Title / menu theme. G major, 126 bpm, 24 bars: the hook (A), the hook again with a second
    voice and a climb (A'), and a singing middle in E minor (B)."""
    bpm = tempo(126)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-2, vol_bajo=-1, vol_rui=-10)
    MAYOR = escala('G', 'mayor')
    CH_A = ['G', 'Bm', 'C', 'D', 'G', 'Em', 'C', 'D']
    CH_B = ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C', 'D7']
    A = frase('D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4 | E5:2 G5:2 C6:6 B5:2 A5:2 G5:2 | A5:2 D6:2 F#6:4 E6:2 D6:2 A5:4 |'
              'B5:4 G5:2 B5:2 D6:8 | B5:4 G5:2 B5:2 E6:8 | C6:4 E6:2 D6:2 C6:4 A5:2 G5:2 | A5:2 B5:2 C6:2 D6:2 E6:4 F#6:4')
    A2 = frase('D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4 | E5:2 G5:2 C6:6 B5:2 A5:2 G5:2 | A5:2 D6:2 F#6:4 E6:2 D6:2 A5:4 |'
               'B5:2 D6:2 G6:6 E6:2 D6:4 | G5:2 B5:2 E6:4 D6:2 C6:2 B5:4 | E6:4 D6:2 C6:2 G5:4 C6:4 | A5:4 D6:4 F#6:4 A6:4')
    B = frase('E5:4 G5:4 B5:6 A5:2 | G5:4 E5:4 C6:8 | D6:6 B5:2 G5:4 B5:4 | A5:8 F#5:4 A5:4 |'
              'E5:4 G5:4 B5:4 E6:4 | C6:6 B5:2 A5:4 E5:4 | E6:4 D6:4 C6:4 G5:4 | A5:4 C6:4 D6:4 F#6:4')
    for nombre, notas, ch in (('A', A, CH_A), ('A2', A2, CH_A), ('B', B, CH_B)):
        revisa(f'titulo {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        # A: the hook alone, off-beat chord stabs, a march in the bass.
        tocar(c['lead'], t, A, 100)
        sacudida(c['seg'], t, CH_A, '..x...x...x...x.', desde='G3', vel=78, caida=0.7)
        bajo(c['bajo'], t, CH_A, '0.8.0.8.0.8.0.8.', vel=96)
        bateria(c['rui'], t, 'X.......x.......', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.......', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        t += 8 * L
        # A': the second voice under the hook, the lead a little brighter, sixteenth hats.
        tocar(c['lead'], t, A2, 102)
        segunda_voz(c['seg'], t, A2, CH_A, MAYOR, vel=84)
        bajo(c['bajo'], t, CH_A, ['0.8.0.8.0.8.0.8.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100)
        bateria(c['rui'], t, 'X.......x.x.....', '....x.......x...', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.x.....', '....x...x.x.x.x.', 'xoxoxoxoxoxoxoxo')
        c['rui'].golpe(t, 'gb_crash', 96)
        t += 8 * L
        # B: a singing middle, the twin lead at 50 %, broken chords under it, a lighter beat.
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 1), desde='G3', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0---------5-0-5-'] * 7 + ['0.0.0.0.0.0.5.5.'], vel=96, caida=0.95)
        bateria(c['rui'], t, 'X.......x.......', '............x...', 'o.o.o.o.o.o.o.o.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.......', '............xxxx', 'o.o.o.o.o.o.o.o.')
        return t + 8 * L

    return C, ronda, 24 * L, bpm


# --- Draft: «Elijo yo primero» -----------------------------------------------------------------

def draft():
    """Team picking. C major with a swing, 110 bpm, 16 bars: cheeky staccato tune, a walking bass,
    chord stabs on the off-beat. The turnaround at the end of the second half dares you to pick."""
    bpm = tempo(110)
    C = Cancion(bpm, swing=0.6)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-3, vol_rui=-11, duty_lead=0.5)
    c['lead'].inst.adsr = (0.002, 0.08, 0.6, 0.03)
    CH = ['C', 'A7', 'Dm7', 'G7', 'C', 'E7', 'F', 'G7', 'C', 'A7', 'Dm7', 'G7', 'F', 'Fm', 'C', 'G7']
    T1 = frase('E5:3 E5:1 G5:2 E5:2 C5:3 -:1 D5:2 E5:2 | A4:3 C#5:1 E5:2 C#5:2 A4:3 -:1 B4:2 C#5:2 | F5:3 F5:1 A5:2 F5:2 D5:3 -:1 E5:2 F5:2 | D5:3 F5:1 G5:2 B5:2 G5:4 -:2 D5:2 |'
               'E5:3 E5:1 G5:2 E5:2 C6:4 -:2 G5:2 | G#5:3 G#5:1 B5:2 G#5:2 E5:3 -:1 F#5:2 G#5:2 | A5:3 A5:1 C6:2 A5:2 F5:4 -:2 A5:2 | B5:2 A5:2 G5:2 F5:2 E5:2 D5:2 B4:2 G4:2')
    T2 = frase('G5:2 -:2 G5:2 -:2 E5:2 -:2 C5:2 -:2 | A5:2 -:2 A5:2 -:2 E5:2 -:2 C#5:2 -:2 | F5:2 -:2 A5:2 -:2 D6:4 C6:2 A5:2 | B5:2 D6:2 B5:2 G5:2 F5:4 -:4 |'
               'C6:3 C6:1 A5:2 F5:2 C6:3 -:1 A5:2 F5:2 | Ab5:3 Ab5:1 C6:2 Ab5:2 F5:4 -:4 | E5:2 G5:2 C6:6 A5:2 G5:2 E5:2 | B5:2 G5:2 D5:2 F5:2 G5:4 -:4')
    revisa('draft 1', T1, [[a] for a in CH[:8]])
    revisa('draft 2', T2, [[a] for a in CH[8:]])

    def caminar(P, t0, acordes, vel=96):
        """Walking bass: root, third, fifth, and a chromatic step into the next root."""
        for i, ch in enumerate(acordes):
            r = bajo_de(ch, 3)
            sig = bajo_de(acordes[(i + 1) % len(acordes)], 3)
            if abs(sig - r) > 6:
                sig += -12 if sig > r else 12
            ap = sig - 1 if sig > r else sig + 1
            for k, m in enumerate((r, r + _tercera(ch), r + 7, ap)):
                P.nota(t0 + i * L + k, 0.9, m, vel + (6 if k == 0 else 0))

    def ronda(t):
        tocar(c['lead'], t, T1, 100)
        tocar(c['lead'], t + 8 * L, T2, 100)
        sacudida(c['seg'], t, CH, '....x.......x.x.', desde='G3', vel=76, caida=0.6)
        caminar(c['bajo'], t, CH)
        bateria(c['rui'], t, 'X.....x.x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', compases=15)
        bateria(c['rui'], t + 15 * L, 'X.....x.x.......', '....x...x.x.xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t + 8 * L, 'gb_crash', 90)
        return t + 16 * L

    return C, ronda, 16 * L, bpm


# --- Combate: «A por todos» -------------------------------------------------------------------

def combate():
    """The battle. D minor, 156 bpm, 32 bars: the riff (A), the riff higher with running
    arpeggios (A2), the bright middle in F (B) and a hammering build that climbs back (C)."""
    bpm = tempo(156)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13)
    CH_A = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A']
    CH_A2 = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'C', 'A']
    CH_B = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'A']
    CH_C = ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A']
    A = frase('D5:3 F5:1 A5:2 G5:2 F5:2 E5:2 D5:4 | A5:3 C6:1 D6:2 C6:2 A5:2 F5:2 A5:4 | Bb5:3 A5:1 G5:2 F5:2 D5:2 F5:2 Bb5:4 | C6:3 B5:1 G5:2 E5:2 G5:2 C6:2 E6:4 |'
              'D6:3 C6:1 A5:2 F5:2 A5:2 D6:2 F6:4 | E6:2 F6:2 E6:2 D6:2 C6:2 D6:2 A5:4 | D6:3 C6:1 Bb5:2 C6:2 D6:2 F6:2 D6:4 | E6:2 D6:2 C#6:2 A5:2 C#6:2 E6:2 A6:4')
    A2 = frase('A5:4 A5:2 D6:2 F6:4 E6:2 D6:2 | E6:4 E6:2 A5:2 D6:8 | D6:4 D6:2 F6:2 Bb6:4 G6:2 F6:2 | G6:4 E6:4 C6:8 |'
               'A5:4 A5:2 D6:2 F6:4 A6:4 | G6:4 F6:4 D6:4 Bb5:4 | C6:4 E6:4 G6:4 E6:4 | A5:2 C#6:2 E6:2 A6:2 G6:2 E6:2 C#6:2 A5:2')
    B = frase('A5:6 C6:2 F6:8 | G6:6 E6:2 C6:8 | D6:6 F6:2 A6:8 | G6:4 F6:4 D6:4 F6:4 |'
              'A5:6 C6:2 F6:4 G6:2 F6:2 | G6:4 E6:4 G6:4 C6:4 | D6:4 F6:4 Bb6:4 G6:4 | A6:4 G6:2 E6:2 C#6:4 A5:4')
    CC = frase('G5:2 -:2 G5:2 -:2 Bb5:2 -:2 D6:2 -:2 | G5:2 -:2 G5:2 -:2 Bb5:2 -:2 A5:2 G5:2 | F5:2 -:2 F5:2 -:2 A5:2 -:2 D6:2 -:2 | F5:2 -:2 F5:2 -:2 A5:2 -:2 G5:2 F5:2 |'
               'D6:2 -:2 D6:2 -:2 F6:2 -:2 Bb6:2 -:2 | E6:2 -:2 E6:2 -:2 G6:2 -:2 E6:2 -:2 | A5:2 C#6:2 E6:2 A6:2 A6:8 | A5:1 Bb5:1 B5:1 C6:1 C#6:1 D6:1 D#6:1 E6:1 F6:1 F#6:1 G6:1 G#6:1 A6:4')
    for nombre, notas, ch in (('A', A, CH_A), ('A2', A2, CH_A2), ('B', B, CH_B)):
        revisa(f'combate {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        # A: the riff over held chip chords and a galloping bass.
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x---------------', desde='A3', vel=74)
        bajo(c['bajo'], t, CH_A, ['0.0.8.0.0.0.8.0.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98)
        bateria(c['rui'], t, 'X.....x.X.x.....', '....x.......x...', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.....x.X.x.....', '....x.......x.xx', 'x.x.x.x.x.x.x.x.')
        t += 8 * L
        # A2: the tune climbs, running sixteenth arpeggios (the fast ones), a busier bass.
        tocar(c['lead'], t, A2, 104)
        arpegio(c['seg'], t, CH_A2, patron=(0, 1, 2, 3, 2, 1), desde='D4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_A2, ['0080008000800080'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bateria(c['rui'], t, 'X.....x.X.....x.', '....X.......X...', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.....x.X.....x.', '....X...X.x.xxxx', 'xoxoxoxoxoxoxoxo')
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 8 * L
        # B: bright middle in F, long heroic notes on the 50 % twin, fast arpeggios and bouncing bass.
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='C4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0.8.0.8.0.8.0.8.'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=98)
        bateria(c['rui'], t, 'X...X...X...X...', '....x.......x...', 'x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X...X...X...X...', '....x...x...xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 8 * L
        # C: hammering stabs climbing; the last bar is a chromatic run and a snare roll back to the riff.
        tocar(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='A3', vel=76, caida=0.55)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='A3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bateria(c['rui'], t, 'X.X.X.X.X.X.X.X.', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=3)
        bateria(c['rui'], t + 3 * L, 'X.X.X.X.X.X.X.X.', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bateria(c['rui'], t + 4 * L, 'X.X.X.X.X.X.X.X.', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=2)
        bateria(c['rui'], t + 6 * L, 'X.X.X.X.X.X.X.X.', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        return t + 8 * L

    return C, ronda, 32 * L, bpm


# --- Final: «Dos en pie» ------------------------------------------------------------------------

def final():
    """The last duel. E minor, 172 bpm, 24 bars: a menacing riff with a flat second (A), a wide,
    soaring middle with running arpeggios (B) and the riff again with a harmony (A')."""
    bpm = tempo(172)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13)
    MENOR = escala('E', 'menor')
    CH_A = ['Em', 'F', 'Em', 'F', 'Em', 'C', 'D', 'B7']
    CH_B = ['C', 'D', 'Em', 'Em', 'C', 'D', 'B7', 'B7']
    A = frase('E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 B5:2 | F5:2 A5:2 C6:2 F6:2 D6:2 C6:2 A5:2 C6:2 | E5:2 G5:2 B5:2 E6:2 G6:4 F#6:2 E6:2 | F6:4 D6:4 C6:4 A5:4 |'
              'B5:4 E6:4 G6:4 B6:4 | G6:4 E6:4 C6:4 E6:4 | A6:4 F#6:4 D6:4 F#6:4 | B5:2 D#6:2 F#6:2 A6:2 G#6:2 F#6:2 D#6:2 B5:2')
    B = frase('G5:4 C6:4 E6:8 | F#5:4 A5:4 D6:8 | G5:4 B5:4 E6:8 | D6:4 B5:4 G5:8 |'
              'E6:6 D6:2 C6:4 G5:4 | F#6:6 E6:2 D6:4 A5:4 | D#6:4 F#6:4 B6:4 A6:4 | G#6:2 A6:2 G#6:2 F#6:2 D#6:8')
    for nombre, notas, ch in (('A', A, CH_A), ('B', B, CH_B)):
        revisa(f'final {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        # A: the menacing riff, held chip chords, a bouncing sixteenth pedal.
        tocar(c['lead'], t, A, 104)
        sacudida(c['seg'], t, CH_A, 'x---------------', desde='G3', vel=74)
        bajo(c['bajo'], t, CH_A, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bateria(c['rui'], t, 'X..xX.x.X..xX.x.', '....X.......X...', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X..xX.x.X..xX.x.', '....X...X.x.xxxx', 'xoxoxoxoxoxoxoxo')
        c['rui'].golpe(t, 'gb_crash', 104)
        t += 8 * L
        # B: soaring long notes on the 50 % twin over fast arpeggios and a pounding four on the floor.
        tocar(c['lead2'], t, B, 102)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='C4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=100, caida=0.78)
        bateria(c['rui'], t, 'X...X...X...X...', '....X.......X...', 'x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X...X...X...X...', '....X...X...xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 104)
        t += 8 * L
        # A': the riff again with a harmony under it, the busiest drums, a roll back to the top.
        tocar(c['lead'], t, A, 106)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=102, caida=0.78)
        bateria(c['rui'], t, 'X..xX.x.X..xX.x.', '....X.......X...', 'xxxxxxxxxxxxxxxx', compases=7)
        bateria(c['rui'], t + 7 * L, 'X..xX.x.X.......', '....X...........', 'xxxxxxxxxxxx....')
        redoble(c['rui'], t + 7 * L + 3, 60, 118, 4)
        c['rui'].golpe(t, 'gb_crash', 104)
        return t + 8 * L

    return C, ronda, 24 * L, bpm


# --- Combate 2: «Furgo a toda leche» ------------------------------------------------------------

def combate_rock():
    """Battle tune 2. C minor, 144 bpm, 32 bars: a driving rock. The riff over a sixteenth-note
    arpeggio bass (A), the riff higher with octave jumps (A2), a chorus in the relative E flat
    major (B) and a hammering bridge that ends in a chromatic run (C)."""
    bpm = tempo(144)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    CH_A = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G']
    CH_A2 = ['Cm', 'Cm', 'Ab', 'Eb', 'Bb', 'Bb', 'Fm', 'G']
    CH_B = ['Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Bb', 'Ab', 'G']
    CH_C = ['Fm', 'Fm', 'Cm', 'Cm', 'Ab', 'G', 'Fm', 'G']
    A = frase('G5:3 G5:1 C6:3 Bb5:1 G5:2 Eb5:2 G5:4 | Eb5:3 Eb5:1 G5:3 F5:1 Eb5:2 C5:2 Eb5:4 | Eb6:3 C6:1 Ab5:3 C6:1 Eb6:4 -:4 | D6:3 Bb5:1 F5:3 Bb5:1 D6:2 F6:2 D6:4 |'
              'G5:3 G5:1 C6:3 Bb5:1 G5:2 Eb6:2 G6:4 | Eb6:3 D6:1 C6:3 Bb5:1 G5:2 Bb5:2 C6:4 | Ab5:3 C6:1 F6:3 Eb6:1 C6:2 Ab5:2 C6:4 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:4')
    A2 = frase('C6:2 -:2 C6:2 Eb6:2 G6:4 Eb6:2 C6:2 | Bb5:2 -:2 Bb5:2 C6:2 Eb6:4 C6:4 | Ab5:2 -:2 Ab5:2 C6:2 Eb6:4 Ab6:4 | G6:4 Eb6:4 Bb5:4 G5:4 |'
               'F6:2 -:2 F6:2 D6:2 Bb5:4 D6:4 | F6:4 D6:4 F6:4 Bb6:4 | Ab6:3 F6:1 C6:3 Ab5:1 C6:4 F6:4 | G5:1 B5:1 D6:1 G6:1 B6:4 G6:2 D6:2 B5:2 G5:2')
    B = frase('G5:4 Bb5:4 Eb6:8 | F6:4 D6:4 Bb5:8 | C6:4 Eb6:4 G6:8 | Eb6:4 C6:4 Ab5:6 C6:2 |'
              'Bb5:4 Eb6:4 G6:6 Eb6:2 | F6:4 D6:4 Bb5:4 D6:4 | Ab5:2 C6:2 Eb6:2 Ab6:2 Eb6:4 C6:4 | D6:4 B5:4 G5:4 B5:2 D6:2')
    CC = frase('C6:2 -:2 C6:2 -:2 F6:2 -:2 Ab6:2 -:2 | Ab6:2 -:2 Ab6:2 -:2 G6:2 -:2 F6:2 -:2 | G5:2 -:2 G5:2 -:2 C6:2 -:2 Eb6:2 -:2 | Eb6:2 -:2 Eb6:2 -:2 D6:2 -:2 C6:2 -:2 |'
               'Eb6:2 -:2 Eb6:2 -:2 C6:2 -:2 Ab5:2 -:2 | D6:2 -:2 D6:2 -:2 B5:2 -:2 G5:2 -:2 | C6:2 -:2 F6:2 -:2 Ab6:2 -:2 C7:2 -:2 | G5:1 Ab5:1 A5:1 Bb5:1 B5:1 C6:1 C#6:1 D6:1 Eb6:1 E6:1 F6:1 F#6:1 G6:4')
    for nombre, notas, ch in (('A', A, CH_A), ('A2', A2, CH_A2), ('B', B, CH_B), ('C', CC, CH_C)):
        revisa(f'rock {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        # A: the riff, syncopated power chords (3+3+4+3+3), the arpeggio bass running in sixteenths.
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x--x--x---x--x--', desde='G3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_A, ['0585058505850585'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=96, caida=0.85)
        bateria(c['rui'], t, 'X.....x...x.....', '....X.......X...', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.....x...x.....', '....X.......X.xx', 'x.x.x.x.x.x.x.x.')
        t += 8 * L
        # A2: the tune jumps octaves, chip chords on the off-beats, the bass turns to root-fifth-third-octave.
        tocar(c['lead'], t, A2, 104)
        sacudida(c['seg'], t, CH_A2, 'x-x-x-x-x-x-x--x', desde='G3', vel=74, caida=0.6)
        bajo(c['bajo'], t, CH_A2, ['0538053805380538'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.85)
        bateria(c['rui'], t, 'X.....x...x...x.', '....X.......X...', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.....x...x...x.', '....X...X.x.xxxx', 'xoxoxoxoxoxoxoxo')
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 8 * L
        # B: the chorus in E flat, long notes on the 50 % twin, fast broken chords, a bouncing bass.
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 1, 0, 1, 2, 3), desde='Eb4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0080008000800080'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=98)
        bateria(c['rui'], t, 'X.....x.X.....x.', '....X.......X...', 'x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.....x.X.....x.', '....X...X...xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 8 * L
        # C: hammering quavers climbing, a snare roll after the chromatic run.
        tocar(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='G3', vel=76, caida=0.55)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='G3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bateria(c['rui'], t, 'X.X.X.X.X.X.X.X.', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=3)
        bateria(c['rui'], t + 3 * L, 'X.X.X.X.X.X.X.X.', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bateria(c['rui'], t + 4 * L, 'X.X.X.X.X.X.X.X.', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=2)
        bateria(c['rui'], t + 6 * L, 'X.X.X.X.X.X.X.X.', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        return t + 8 * L

    return C, ronda, 32 * L, bpm


# --- Combate 3: «Riña en el Bar del Brío» -------------------------------------------------------

def combate_verbena():
    """Battle tune 3. A minor and A major, 132 bpm with a swing, 32 bars: a pasodoble de verbena for a
    bar brawl. Oom-pah bass and off-beat chord stabs. The tune walks down the Andalusian cadence
    (A), turns to A major with a brass-like twin in thirds (B), a fanfare of quick runs (C) and A again
    with a second voice (A'). Snare rolls at the end of every eight bars, like a band marching in."""
    bpm = tempo(132)
    C = Cancion(bpm, swing=0.58)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    MENOR = escala('A', 'menor')
    MAYOR = escala('A', 'mayor')
    CH_A = ['Am', 'G', 'F', 'E7', 'Am', 'G', 'F', 'E7']
    CH_B = ['A', 'D', 'A', 'E7', 'A', 'D', 'E7', 'A']
    CH_C = ['Dm', 'Am', 'Dm', 'E7', 'Dm', 'Am', 'E7', 'E7']
    A = frase('A5:3 -:1 A5:1 B5:1 C6:2 B5:2 A5:2 E5:4 | G5:3 -:1 G5:1 A5:1 B5:2 A5:2 G5:2 D5:4 | F5:3 -:1 F5:1 G5:1 A5:2 G5:2 F5:2 C5:4 | E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:4 |'
              'C6:3 -:1 C6:1 D6:1 E6:2 D6:2 C6:2 A5:4 | B5:3 -:1 B5:1 C6:1 D6:2 B5:2 D6:2 G5:4 | A5:2 C6:2 F6:4 D6:2 E6:2 C6:4 | B5:1 C6:1 B5:1 G#5:1 E5:4 -:2 E5:2 G#5:2 B5:2')
    B = frase('E6:2 C#6:2 A5:4 C#6:2 E6:2 A6:4 | F#6:2 D6:2 A5:4 D6:2 F#6:2 A6:4 | E6:3 -:1 E6:1 F#6:1 E6:2 C#6:2 A5:2 C#6:4 | B5:2 D6:2 E6:4 G#5:2 B5:2 E6:4 |'
              'A6:3 -:1 A6:1 G#6:1 A6:2 E6:2 C#6:2 E6:4 | D6:3 -:1 D6:1 E6:1 F#6:2 E6:2 D6:2 A5:4 | G#5:2 B5:2 D6:2 E6:2 G#6:2 E6:2 D6:2 B5:2 | A5:2 C#6:2 E6:2 A6:2 A6:8')
    CC = frase('D6:2 F6:2 A6:4 F6:2 D6:2 A5:4 | C6:2 E6:2 A6:4 E6:2 C6:2 A5:4 | D6:1 E6:1 F6:1 E6:1 D6:4 F6:1 G6:1 A6:1 G6:1 F6:4 | E6:1 B5:1 G#5:1 B5:1 E6:4 G#6:4 B6:4 |'
               'A5:3 -:1 D6:2 F6:2 A6:4 F6:4 | E6:3 -:1 A5:2 C6:2 E6:4 A6:4 | G#6:2 E6:2 B5:2 G#5:2 E5:2 G#5:2 B5:2 E6:2 | B5:1 C6:1 B5:1 G#5:1 B5:1 D6:1 B5:1 G#5:1 E5:8')
    for nombre, notas, ch in (('A', A, CH_A), ('B', B, CH_B), ('C', CC, CH_C)):
        revisa(f'verbena {nombre}', notas, [[a] for a in ch])

    def pasodoble(P, t0, acordes, vel=96):
        """Oom-pah bass: root on the beats 1 and 3, fifth on 2 and 4, each a short quaver."""
        bajo(P, t0, acordes, '0-..5-..0-..5-..', vel=vel, caida=0.9)

    def ronda(t):
        # A: the tune over the Andalusian cadence, oom-pah bass, stabs on the off-beat quavers.
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, '..x...x...x...x.', desde='A3', vel=78, caida=0.6)
        pasodoble(c['bajo'], t, CH_A)
        bateria(c['rui'], t, 'X.......x.......', '....x..o....x..o', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.......', '....x..o....xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 92)
        t += 8 * L
        # B: A major, the 50 % twin like a trumpet with a second voice in thirds, a walking bass.
        tocar(c['lead2'], t, B, 100)
        segunda_voz(c['seg'], t, B, CH_B, MAYOR, vel=84)
        pasodoble(c['bajo'], t, CH_B, vel=98)
        bateria(c['rui'], t, 'X.......x.......', '....x.x.....x.x.', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.......', '....x.x.....xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 96)
        t += 8 * L
        # C: the fanfare, quick runs on the 25 % lead, bass quavers, a march of snares.
        tocar(c['lead'], t, CC, 104)
        arpegio(c['seg'], t, CH_C, patron=(0, 1, 2, 1), desde='D4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_C, '0.0.5.5.0.0.5.5.', vel=98, caida=0.9)
        bateria(c['rui'], t, 'X.......X.......', '..x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......X.......', '..x.x.x.x.x.xxxx', 'x.x.x.x.x.x.x.x.')
        t += 8 * L
        # A': the tune again with a second voice, hats on every sixteenth, a roll back to the top.
        tocar(c['lead'], t, A, 104)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=82)
        pasodoble(c['bajo'], t, CH_A, vel=100)
        bateria(c['rui'], t, 'X.......x.x.....', '....x..o....x..o', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......x.......', '....x..x....x...', 'xoxoxoxoxoxo....')
        redoble(c['rui'], t + 7 * L + 3, 60, 118, 4)
        c['rui'].golpe(t, 'gb_crash', 96)
        return t + 8 * L

    return C, ronda, 32 * L, bpm


# --- Combate 4: «Cortocircuito» -------------------------------------------------------------------

def combate_electro():
    """Battle tune 4. F sharp minor, 130 bpm, 32 bars: tense and electronic. A thin 12.5 % lead
    on a 3+3+2 syncopated riff with a flat second and a tritone (A), a floating middle in A major
    that ends on a dominant (B), the riff again with a harmony and sixteenth hats (A'), and a
    crawling bridge of repeated notes that climbs chromatically back to the top (C)."""
    bpm = tempo(130)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.125)
    MENOR = escala('F#', 'menor')
    CH_A = ['F#m', 'F#m', 'G', 'F#m', 'F#m', 'F#m', 'G', 'C']
    CH_B = ['A', 'E', 'F#m', 'D', 'A', 'E', 'D', 'C#7']
    CH_C = ['F#m', 'F#m', 'G', 'G', 'Bm', 'C', 'C#7', 'C#7']
    A = frase('F#5:3 A5:3 C#6:2 F#6:3 E6:3 C#6:2 | F#5:3 A5:3 C#6:2 E6:3 D6:3 C#6:2 | G5:3 B5:3 D6:2 G6:3 F#6:3 D6:2 | A5:3 C#6:3 F#6:2 E6:3 C#6:3 A5:2 |'
              'F#6:3 -:3 F#6:2 A6:3 -:3 F#6:2 | E6:3 -:3 E6:2 C#6:3 -:3 A5:2 | D6:3 G6:3 D6:2 B5:3 D6:3 G5:2 | E6:3 G6:3 C7:2 G6:3 E6:3 C6:2')
    B = frase('E6:3 C#6:3 A5:2 C#6:4 E6:4 | B5:3 E6:3 G#6:2 E6:8 | A5:3 C#6:3 F#6:2 C#6:4 A5:4 | D6:3 F#6:3 A6:2 F#6:8 |'
              'C#6:3 E6:3 A6:2 B6:3 E6:3 C#6:2 | B5:3 E6:3 G#6:2 B6:8 | A6:3 F#6:3 D6:2 A5:3 D6:3 F#6:2 | G#6:2 F6:2 C#6:2 B5:2 G#5:8')
    CC = frase('F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:2 A6:2 | E6:1 E6:1 -:1 E6:1 -:2 E6:1 E6:1 -:1 E6:1 -:2 C#6:2 E6:2 |'
               'G6:1 G6:1 -:1 G6:1 -:2 G6:1 G6:1 -:1 G6:1 -:2 B6:2 D7:2 | F#6:1 F#6:1 -:1 F#6:1 -:2 F#6:1 F#6:1 -:1 F#6:1 -:2 D6:2 B5:2 |'
               'D6:2 F#6:2 B6:4 A6:2 F#6:2 D6:4 | C6:2 E6:2 G6:4 E6:2 C6:2 G5:4 | C#6:2 F6:2 G#6:4 B6:2 G#6:2 F6:4 | C#6:1 D6:1 D#6:1 E6:1 F6:1 F#6:1 G6:1 G#6:1 A6:1 A#6:1 B6:1 C7:1 C#7:4')
    for nombre, notas, ch in (('A', A, CH_A), ('B', B, CH_B), ('C', CC, CH_C)):
        revisa(f'electro {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        # A: the syncopated riff, gated chip stabs on the same 3+3+2, a 3+3+2 bass, a kick to match.
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x..x..x.x..x..x.', desde='F#3', vel=74, caida=0.45)
        bajo(c['bajo'], t, CH_A, ['0..0..0.0..0..8.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.8)
        bateria(c['rui'], t, 'X..x..x.X..x..x.', '....x.......x...', 'x.x.x.x.x.x.x.x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X..x..x.X..x..x.', '....x.......xxxx', 'x.x.x.x.x.x.x.x.')
        t += 8 * L
        # B: floating long notes on the 50 % twin, sixteenth broken chords, an off-beat bass, open hats.
        tocar(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1), desde='A3', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0-0-0-5-0-0-8-5-'] * 7 + ['0.0.0.0.0.0.5.5.'], vel=96, caida=0.8)
        bateria(c['rui'], t, 'X.......X.......', '....x.......x...', 'x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.', compases=7)
        bateria(c['rui'], t + 7 * L, 'X.......X.......', '....x...x...xxxx', 'x.x.x.x.x.x.x.x.')
        c['rui'].golpe(t, 'gb_crash', 92)
        t += 8 * L
        # A': the riff again with a harmony under it and busier drums.
        tocar(c['lead'], t, A, 104)
        segunda_voz(c['seg'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, ['0008000800080008'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.75)
        bateria(c['rui'], t, 'X..x..x.X..x..x.', '....X.......X..x', 'xoxoxoxoxoxoxoxo', compases=7)
        bateria(c['rui'], t + 7 * L, 'X..x..x.X..x..x.', '....X...X...xxxx', 'xoxoxoxoxoxoxoxo')
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 8 * L
        # C: crawling repeated notes climbing, one chromatic run and a roll to the riff.
        tocar(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='F#3', vel=74, caida=0.5)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='F#3', vel=74, caida=0.5)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bateria(c['rui'], t, 'X...X...X...X...', '....x.......x...', 'o.o.o.o.o.o.o.o.', compases=3)
        bateria(c['rui'], t + 3 * L, 'X...X...X...X...', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bateria(c['rui'], t + 4 * L, 'X...X...X...X...', '....x.......x...', 'xoxoxoxoxoxoxoxo', compases=2)
        bateria(c['rui'], t + 6 * L, 'X...X...X...X...', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        return t + 8 * L

    return C, ronda, 32 * L, bpm


# --- Victoria: «Subid al podio» --------------------------------------------------------------

def victoria():
    """Podium fanfare. C major, 140 bpm, once: three rising arpeggios (C, A flat, B flat), a run up
    over the dominant, then a held C major chord (chip arpeggio under the lead) with a crash."""
    bpm = tempo(140)
    C = Cancion(bpm)
    c = canales(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-11, duty_lead=0.25)
    CH = ['C', 'Ab', 'Bb', 'G']
    F = frase('E5:2 G5:2 C6:2 E6:6 -:2 C6:2 | Eb5:2 Ab5:2 C6:2 Eb6:6 -:2 C6:2 | F5:2 Bb5:2 D6:2 F6:6 -:2 D6:2 | B5:2 D6:2 G6:4 F6:2 D6:2 B5:2 G5:2 |'
              'C6:14 -:2')
    tocar(c['lead'], 0, F, 106)
    sacudida(c['seg'], 0, CH, ['......x-----....'] * 3 + ['x-------x-------'], desde='G3', vel=78, caida=0.8)
    sacudida(c['seg'], 4 * L, ['C'], 'x-------------..', desde='C4', vel=82)
    bajo(c['bajo'], 0, CH, '0.0.8.0.0.0.8.0.', vel=100)
    bajo(c['bajo'], 4 * L, ['C'], '0-------------..', vel=104, oct=3)
    for i in range(3):
        bateria(c['rui'], i * L, 'X.......x.......', '....x.......x...', 'x.x.x.x.x.x.x.x.')
    c['rui'].golpe(3 * L, 'gb_bombo', 110)
    redoble(c['rui'], 3 * L + 0.5, 40, 118, 14)
    c['rui'].golpe(4 * L, 'gb_crash', 112)
    return C, 4 * L + 3.5, bpm


# --- Output -------------------------------------------------------------------------------

PISTAS = {'titulo': titulo, 'draft': draft, 'combate': combate, 'combate-rock': combate_rock, 'combate-verbena': combate_verbena,
          'combate-electro': combate_electro, 'final': final}


def salir_bucle(nombre):
    C, ronda, beats, bpm = PISTAS[nombre]()
    t = 0
    for _ in range(3):
        t = ronda(t)
    assert t == 3 * beats, (t, beats)
    verifica(nombre, C)
    largo = beats * 60 / bpm
    x = C.render(hasta=3 * beats)
    ruta = os.path.join(SALIDA, f'pokeusera-{nombre}.mp3')
    with tempfile.TemporaryDirectory() as tmp:
        exportar_bucle(os.path.join(tmp, nombre), x, largo, rms_db=-17.0, kbps=96, salida=ruta, mono=True, ar=24000)
    print(f'  {nombre}: {bpm} bpm, {beats // L} compases, ronda de {largo:.6f} s, pico sin normalizar {np.max(np.abs(x)):.2f}')


def salir_victoria():
    C, beats, bpm = victoria()
    verifica('victoria', C)
    x = C.render(hasta=beats + 0.3)
    y = _master(x, ganancia_para(x, -16.0))
    k = int(0.3 * SR)
    y[:, -k:] *= np.linspace(1, 0, k) ** 1.5
    ruta = os.path.join(SALIDA, 'pokeusera-victoria.mp3')
    with tempfile.TemporaryDirectory() as tmp:
        _wav(os.path.join(tmp, 'victoria.wav'), y)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(tmp, 'victoria.wav'), '-ac', '1', '-ar', '24000',
                        '-c:a', 'libmp3lame', '-b:a', '96k', ruta], check=True)
    print(f'{ruta}: {y.shape[1] / SR:.2f} s, pico {np.max(np.abs(y)):.2f}')


if __name__ == '__main__':
    pedidas = sys.argv[1:2] or ['todas']
    if pedidas == ['todas']:
        pedidas = [*PISTAS, 'victoria']
    for nombre in pedidas:
        if nombre == 'victoria':
            salir_victoria()
        elif nombre in PISTAS:
            salir_bucle(nombre)
        else:
            sys.exit(f'No conozco «{nombre}»: {", ".join([*PISTAS, "victoria", "todas"])}')
