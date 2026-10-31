# «Sevillanas con giro»: a battle tune for the Casa Rural Drag Queen scenario of «PokéUsera · Edición Jarra», 124 bpm,
# 90 bars of four beats (the tool's bar), 360 beats. Same four-channel chip sound as pokeusera_largas_b.py.
#
# How the 3/4 is written. The tool's bar is four beats and its drum / bass patterns are sixteen steps, so the sevillanas
# (3/4, one beat = one quarter) are written in bars of THREE beats with twelve-step patterns (`capas3`, `bajo3`, `sacudida3`,
# `frase(..., largo=12)`), and every sevillanas section is a multiple of twelve beats: four bars of 3/4 = three tool bars.
# The tempo is the same in the whole piece (a quarter note is a quarter note in 3/4 and in 4/4), so the techno 4x4 keeps the
# kick on the same pulse that the palmas mark in the sevillanas, and the tune of a sevillana bar (three beats) is re-timed
# into a 4/4 bar (`a44`: three beats of melody and one of air) when the club plays it. The map printed by `salir` counts the
# tool's bars (four beats): every block of four 3/4 bars shows as «3 compases».
#
#   python3 pokeusera_nueva_sevillanas.py        A minor (Andalusian cadence Am G F E) / A major, D minor / D major, 124 bpm
import numpy as np
import pokeusera_largas_b as B
import sinte
import pokeusera as base
from sinte import Cancion, Inst, SR, frase, tocar, tonos, escala, midi, revisa, acorde_en
from pokeusera import tempo, redoble, sacudida, arpegio, L, _por_compas
from pokeusera_largas_b import voces, bajo, bat, sube, mordentes, armonica, Mapa


# --- Two more sounds for the noise channel: castanets and (borrowed from the kit) the claps ---------------
_golpe_antes_sev = sinte.golpe


def golpe_sev(tipo, vel, semilla=0):
    a = (vel / 127) ** 1.3
    if tipo == 'gb_casta':  # castanets: two quick dry clicks of bright noise
        nm = int(0.075 * SR)
        w = base._lfsr_gb(nm, 44100, 40000, 0.05, semilla=semilla)
        t = np.arange(nm) / SR
        e = np.exp(-t / 0.007)
        d = int(0.017 * SR)
        e[d:] += 0.8 * np.exp(-t[:nm - d] / 0.009)
        w = sinte._filtro(sinte._filtro(w, 'highpass', 1800, 3), 'lowpass', 8500) * 2.2 * np.minimum(1.2, e)
    else:
        return _golpe_antes_sev(tipo, vel, semilla)
    k = min(48, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


sinte.golpe = golpe_sev


# --- Toolkit for bars of three beats -------------------------------------------------------------------------

def F3(texto):
    """A phrase in bars of 3/4 (twelve sixteenths a bar)."""
    return frase(texto, largo=12)


def a44(notas):
    """The tune of 3/4 bars moved to 4/4 bars: each bar keeps its three beats and gets a fourth, empty one."""
    return [(b + int(b // 3 + 1e-9), d, m, *r) for b, d, m, *r in notas]


def capas3(P, t0, lista, vel=100):
    """One bar of 3/4 of drums: `lista` is [(pattern of twelve steps, sound)] in order of priority (one noise channel)."""
    for k in range(12):
        for pat, tipo in lista:
            ch = pat[k] if k < len(pat) else '.'
            if ch != '.':
                P.golpe(t0 + k / 4, tipo, {'X': vel + 14, 'x': vel, 'o': vel - 34}[ch])
                break


def bat3(P, t, n, base_, relleno=None, vel=100):
    """Drums for n bars of 3/4 (a pattern, or one per bar, of twelve steps). relleno 'rodado': a roll of castanets on the last
    bar's second half."""
    for i in range(n):
        lista = [(_por_compas(p, i), s) for p, s in base_]
        ult = relleno and i == n - 1
        if ult:
            lista = [((p + '.' * 12)[:6] + '.' * 6, s) for p, s in lista]
        capas3(P, t + i * 3, lista, vel)
        if ult:
            for k in range(6):
                P.golpe(t + i * 3 + 1.5 + k * 0.25, 'gb_casta', vel - 44 + k * 9)


def bajo3(P, t0, acordes, patron, vel=100, oct=3, caida=0.82):
    """The bass for bars of 3/4: twelve steps a bar, the same letters as the bass of pokeusera_largas_b."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 12, pat
        r = sinte.bajo_de(ch, oct)
        al = {'0': 0, '3': base._tercera(ch), '5': 7, '8': 12, 'a': -12, '6': 9, 'b': 10, 'd': -1, 'e': 1, '2': 2, '4': 5, 'c': -5}
        k = 0
        while k < 12:
            if pat[k] in al:
                n_ = 1
                while k + n_ < 12 and pat[k + n_] == '-':
                    n_ += 1
                P.nota(t0 + i * 3 + k / 4, max(0.1, n_ * 0.25 * (caida if n_ == 1 else 0.96)), r + al[pat[k]], vel + (6 if k % 4 == 0 else 0))
                k += n_
            else:
                k += 1


def sacudida3(P, t0, acordes, patron, desde='A3', vel=80, caida=0.9):
    """The strummed guitar (the chip arpeggio) in bars of 3/4: x starts a strum, - holds it, . rests."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 12, pat
        ts = tonos(ch, desde, midi(desde) + 11)
        offs = tuple([x - ts[0] for x in ts] + [12])
        k = 0
        while k < 12:
            if pat[k] == 'x':
                n_ = 1
                while k + n_ < 12 and pat[k + n_] == '-':
                    n_ += 1
                P.nota(t0 + i * 3 + k / 4, n_ * 0.25 * (caida if n_ == 1 else 0.97), ts[0], vel + (6 if k % 4 == 0 else 0), arp=offs)
                k += n_
            else:
                k += 1


def segunda_voz3(P, t0, notas, acordes, esc, vel=88):
    """The harmony under the tune (like segunda_voz) for bars of 3/4."""
    for b, d, m, *_ in notas:
        ch = acorde_en([[a] for a in acordes], b, 3)
        if d >= 0.75:
            h = max(tonos(ch, m - 9, m - 3) or [m - 4])
        else:
            h = sinte.tercera_abajo(m, esc)
        P.nota(t0 + b, d, h, vel + (6 if b % 1 == 0 else 0))


def combate_sevillanas():
    """A minor / D minor, 124 bpm, 90 bars of four beats (120 bars of 3/4 in the sevillanas, 27 of 4/4 in the club): the sevillanas
    of Casa Rural Drag Queen. Intro: a guitar falseta and the «salida» with the palmas coming in. Copla 1 (frases 1-4 over the Andalusian
    cadence Am G F E and the estribillo in A major) ends in the dry stop of «¡y... ahí!»; copla 2 dresses the same tune (mordents, a
    second voice, castanets) and ends in a stop and a «¡olé!». Then, with no warning, a house / techno at 4x4: the kick on the quarters,
    an acid bass, the sevillanas tune re-timed to 4/4 on a sharp pulse and arpeggios, a build-up and a drop. A hard cut and the guitar
    is back for coplas 3 and 4 in D (Dm C Bb A7 and the estribillo in D major). The coda mixes the two worlds for a moment (kick, acid
    bass and the guitar together) and falls on E7 with a last «¡ahí!» so the loop lands on the intro's Am."""
    bpm = tempo(124)
    beats = 90 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    c['seg3'].inst = Inst('pulso', duty=0.25, adsr=(0.002, 0.08, 0.55, 0.04), arp_hz=60)
    # Club colours: a wobbling pulse for the drop and a bass with a pitch blip at the start of every note (the acid snap).
    c['pwm'] = C.pista('lead pwm', Inst('pulso', duty=0.3, pwm=(0.17, 3.3), adsr=(0.002, 0.12, 0.7, 0.05), vib=(14, 6.0, 0.2)), vol=-6, reverb=0)
    c['acid'] = C.pista('onda acid', Inst('triangulo', pasos=16, adsr=(0.002, 0.08, 0.8, 0.02), ataque=(7, 0.035)), vol=-1, reverb=0)
    for p in C.pistas:  # every voice a little lower: the sum of the club's kick, acid bass and two pulses must stay under 1.0 before normalising
        p.vol -= 6.5
    m = Mapa(beats)
    MENOR, MAYOR, REM = escala('A', 'menor'), escala('A', 'mayor'), escala('D', 'menor')
    ARM = armonica('A') | armonica('D')
    ARMA = armonica('A') | {1, 6}

    # --- Chords (one a bar) -------------------------------------------------------------------------------
    CH_I1 = ['Am', 'Am', 'G', 'F']
    CH_I2 = ['E7'] * 4
    CH_X = ['Am', 'G', 'F', 'E7']
    CH_E1 = ['A', 'D', 'E7', 'A']
    CH_E2 = ['D', 'A', 'E7', 'A']
    CH_S = ['Dm', 'C', 'Bb', 'A7']
    CH_XD = ['Dm', 'C', 'Bb', 'A7']
    CH_E1D = ['D', 'G', 'A7', 'D']
    CH_E2D = ['G', 'D', 'A7', 'D']
    CH_E2E = ['G', 'D', 'A7', 'A7']
    CH_K1 = ['Dm', 'C', 'Bb', 'A']
    CH_K2 = ['Am', 'G', 'F', 'E7']

    # --- The tunes (bars of 3/4, twelve sixteenths each) -----------------------------------------------------
    I1 = F3('-:4 E5:2 A5:2 C6:2 B5:2 | A5:4 B5:2 C6:2 E6:4 | D6:2 C6:2 B5:2 A5:2 G5:4 | A5:2 C6:2 F6:2 E6:2 C6:4')
    I2 = F3('E6:2 F6:2 E6:2 D6:2 B5:4 | G#5:2 B5:2 E6:4 D6:2 B5:2 | E6:4 D6:2 B5:2 G#5:4 | E5:8 B5:2 E6:2')
    X1 = F3('A5:2 A5:2 C6:4 B5:2 A5:2 | G5:2 G5:2 B5:4 A5:2 G5:2 | F5:2 F5:2 A5:4 G5:2 F5:2 | E5:4 G#5:2 B5:2 E6:4')
    X2 = F3('C6:4 E6:2 C6:2 A5:4 | D6:4 B5:2 D6:2 G5:4 | A5:2 C6:2 F6:4 D6:2 C6:2 | B5:4 G#5:4 E5:4')
    E1 = F3('E6:4 A6:2 E6:2 C#6:4 | F#6:4 D6:2 F#6:2 A6:4 | G#6:4 E6:2 G#6:2 B6:4 | A6:6 C#6:2 E6:2 A5:2')
    E2 = F3('D6:4 F#6:2 A6:2 D7:4 | C#7:4 A6:2 E6:2 C#6:4 | B6:2 G#6:2 E6:4 D6:2 B5:2 | A6:4 -:8')
    SAL = F3('D6:2 F6:2 A6:4 F6:2 D6:2 | E6:2 G6:2 C7:4 G6:2 E6:2 | D6:2 F6:2 Bb6:4 F6:2 D6:2 | C#6:2 E6:2 G6:4 E6:2 C#6:2')
    X1D = sube(X1, 5)
    X2D = F3('F6:2 F6:2 A6:4 F6:2 D6:2 | E6:2 E6:2 G6:4 E6:2 C6:2 | D6:2 D6:2 F6:4 D6:2 Bb5:2 | C#6:4 E6:2 A6:2 G6:4')
    E1D = sube(E1, -7)
    E2D = sube(E2, -7)
    E2E = F3('G5:4 B5:2 D6:2 G6:4 | F#6:4 D6:2 A5:2 F#5:4 | E6:2 C#6:2 A5:4 G5:2 E5:2 | C#6:4 E6:4 A6:4')
    K1 = F3('D6:2 D6:2 F6:4 E6:2 D6:2 | C6:2 C6:2 E6:4 D6:2 C6:2 | Bb5:2 Bb5:2 D6:4 C6:2 Bb5:2 | A5:4 C#6:2 E6:2 A6:4')
    K2 = F3('E6:2 E6:2 A6:4 C7:2 A6:2 | D6:2 D6:2 G6:4 B6:2 G6:2 | C6:4 A5:4 F5:4 | B5:4 -:8')
    # The club: the same tunes in 4/4 bars (three beats of tune and one of air), a slow climb for the build-up.
    SUB = frase('A5:16 | C6:16 | D6:8 G6:8 | B5:8 E6:8 | G#6:4 B6:4 E7:4 B6:4 | E7:8 -:8', largo=16)
    for nombre, notas, ch in (('I1', I1, CH_I1), ('I2', I2, CH_I2), ('X1', X1, CH_X), ('X2', X2, CH_X), ('E1', E1, CH_E1), ('E2', E2, CH_E2),
                              ('SAL', SAL, CH_S), ('X1D', X1D, CH_XD), ('X2D', X2D, CH_XD), ('E1D', E1D, CH_E1D), ('E2D', E2D, CH_E2D),
                              ('E2E', E2E, CH_E2E), ('K1', K1, CH_K1), ('K2', K2, CH_K2)):
        revisa(f'sevillanas {nombre}', notas, [[a] for a in ch], largo=3)
    revisa('sevillanas SUB', SUB, [[a] for a in ['Am', 'F', 'G', 'E7', 'E7', 'E7']], largo=4)

    # --- Patterns ----------------------------------------------------------------------------------------------
    # Guitar (12 steps a bar of 3/4; steps 0, 4, 8 are the beats): the «rasgueo» and its variants.
    RA, RB, RC, RD = 'x---x-x-x-x-', 'x---x-x-xxxx', 'x-x-x---x-x-', 'x-----x-x-x-'
    RSO = 'x-----------'
    SECO = 'x...........'
    # Bass: root on 1, the fifth answers; more notes as the piece warms up.
    B1, B2, B3, B4 = '0---....5-5-', '0-..5-..5-..', '0---5-5-8-5-', '0-.0-.5-5-3-'
    BSE = '0...........'
    # Palmas and castanets.
    PA1, PA2, PA3 = '....x...x...', 'X...x.o.x.o.', 'X...x...xxx.'
    CA1, CA2, CA3 = '..o...o...o.', 'o.x.o.x.o.x.', '.o.o.o.o.o.o'
    PIE = 'X...........'
    # The club (16 steps): kick on the quarters, claps on 2 and 4, open hats on the off-beats, sixteenth hats.
    K4, CLAP, HAT8, HAT16 = 'X...X...X...X...', '....x.......x...', '..x...x...x...x.', '.o.o.o.o.o.o.o.o'
    OFFB, ACID1, ACID2, ACID3 = '..0-..0-..0-..0-', '0.0.8.0.0.0.8.0.', '0.0a0.0.0.0b0.8.', '.0.0.8.0.0.0.0.8'

    def ahi(t0):
        """The dry stop of the end of a copla: one hard hit on beat 1 of the bar, silence, and a lone «ahí» clap on beat 3."""
        c['rui'].golpe(t0, 'gb_palma', 124)
        c['rui'].golpe(t0 + 2, 'gb_palma', 112)

    def stop3(t0, ch, melodia, vel_guitarra=88):
        """The bar of the stop: guitar hit, bass note and drum hit all together on beat 1 and then nothing."""
        sacudida3(c['seg'], t0, [ch], [SECO], desde='A3', vel=vel_guitarra, caida=0.8)
        bajo3(c['bajo'], t0, [ch], [BSE], vel=104, caida=0.8)

    def ole(P, t0, vel=104):
        """A «¡olé!» on the pulse channel: a rising «o» and a longer «lé»."""
        P.nota(t0, 0.55, 'E5', vel, desde='A4', deslizar=0.2)
        P.nota(t0 + 0.75, 1.3, 'A5', vel + 6, desde='E5', deslizar=0.18)

    def ronda(t):
        # --- Intro: a falseta of the guitar, then the «salida» on the dominant with the palmas coming in -----------------
        m('Intro (falseta de guitarra)', t, 3, 'La menor')
        tocar(c['lead2'], t, I1, 96)
        sacudida3(c['seg'], t, CH_I1, [RSO, RSO, RA, RA], desde='A3', vel=70, caida=0.8)
        bajo3(c['bajo'], t + 6, CH_I1[2:], B1, vel=92)
        bat3(c['rui'], t + 6, 2, [(PIE, 'gb_tom'), (CA1, 'gb_casta')], vel=80)
        t += 12
        m('Intro (la salida)', t, 3, 'Mi (dominante)')
        tocar(c['lead2'], t, I2, 98)
        sacudida3(c['seg'], t, CH_I2, [RB, RB, RB, RA], desde='A3', vel=74, caida=0.8)
        bajo3(c['bajo'], t, CH_I2, [B1, B1, B2, B1], vel=94)
        bat3(c['rui'], t, 4, [(PA2, 'gb_palma'), (CA2, 'gb_casta')], 'rodado', vel=90)
        t += 12

        # --- Copla 1: the tune as it is sung; the stop at the end -------------------------------------------------------
        m('Copla 1 · frases 1 y 2 (salida)', t, 3, 'La menor (cadencia andaluza)')
        tocar(c['lead'], t, X1, 102)
        sacudida3(c['seg'], t, CH_X, [RA, RA, RB, RB], desde='A3', vel=78, caida=0.8)
        bajo3(c['bajo'], t, CH_X, B1, vel=96)
        bat3(c['rui'], t, 4, [(PA1, 'gb_palma'), (CA1, 'gb_casta')], vel=92)
        t += 12
        m('Copla 1 · frases 3 y 4 (paso y remate)', t, 3, 'La menor (cadencia andaluza)')
        tocar(c['lead'], t, X2, 102)
        sacudida3(c['seg'], t, CH_X, [RB, RA, RB, RB], desde='A3', vel=80, caida=0.8)
        bajo3(c['bajo'], t, CH_X, [B1, B2, B1, B2], vel=98)
        bat3(c['rui'], t, 4, [(PA2, 'gb_palma'), (CA2, 'gb_casta')], 'rodado', vel=94)
        t += 12
        m('Copla 1 · estribillo (La mayor)', t, 3, 'La mayor')
        tocar(c['lead'], t, E1, 104)
        sacudida3(c['seg'], t, CH_E1, [RB, RA, RB, RA], desde='A3', vel=82, caida=0.8)
        bajo3(c['bajo'], t, CH_E1, B3, vel=98)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA2, 'gb_casta')], vel=96)
        t += 12
        m('Copla 1 · estribillo y «¡y... ahí!»', t, 3, 'La mayor')
        tocar(c['lead'], t, E2, 106)
        sacudida3(c['seg'], t, CH_E2[:3], [RB, RA, RB], desde='A3', vel=84, caida=0.8)
        bajo3(c['bajo'], t, CH_E2[:3], [B3, B3, B2], vel=100)
        bat3(c['rui'], t, 3, [(PA3, 'gb_palma'), (CA2, 'gb_casta')], vel=98)
        stop3(t + 9, 'A', None)
        ahi(t + 9)
        t += 12

        # --- Copla 2: the same tune dressed up: mordents, a second voice, castanets; it ends in a stop and a «¡olé!» -----
        m('Copla 2 · frases 1 y 2 (segunda voz)', t, 3, 'La menor (cadencia andaluza)')
        tocar(c['lead2'], t, mordentes(X1, ARM, 1.0, 2), 102)
        segunda_voz3(c['seg3'], t, X1, CH_X, MENOR, vel=82)
        bajo3(c['bajo'], t, CH_X, [B2, B2, B4, B2], vel=98)
        bat3(c['rui'], t, 4, [(PA2, 'gb_palma'), (CA3, 'gb_casta')], vel=94)
        t += 12
        m('Copla 2 · frases 3 y 4 (paso y remate)', t, 3, 'La menor (cadencia andaluza)')
        tocar(c['lead'], t, mordentes(X2, ARM, 1.0, 1), 104)
        sacudida3(c['seg'], t, CH_X, [RB, RD, RB, RB], desde='A3', vel=82, caida=0.8)
        bajo3(c['bajo'], t, CH_X, [B4, B2, B4, B1], vel=100)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], 'rodado', vel=96)
        t += 12
        m('Copla 2 · estribillo (La mayor)', t, 3, 'La mayor')
        tocar(c['lead2'], t, mordentes(E1, ARMA, 1.5, 1), 106)
        segunda_voz3(c['seg3'], t, E1, CH_E1, MAYOR, vel=84)
        bajo3(c['bajo'], t, CH_E1, [B3, B4, B3, B4], vel=100)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=98)
        t += 12
        m('Copla 2 · estribillo y parada en seco', t, 3, 'La mayor')
        tocar(c['lead'], t, E2, 108)
        sacudida3(c['seg'], t, CH_E2[:3], [RB, RB, RB], desde='A3', vel=86, caida=0.8)
        bajo3(c['bajo'], t, CH_E2[:3], [B3, B3, B4], vel=102)
        bat3(c['rui'], t, 3, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=100)
        stop3(t + 9, 'A', None)
        c['rui'].golpe(t + 9, 'gb_palma', 124)
        t += 12

        # --- The turn: «¡olé!», a bar of silence, and the club comes in with no warning ----------------------------------
        m('¡Olé! y corte', t, 1, 'silencio')
        ole(c['lead2'], t + 1.0)
        c['rui'].golpe(t + 1.0, 'gb_casta', 100)
        t += 4
        m('Club · bombo a negras', t, 4, 'La menor')
        bajo(c['acid'], t + 4, ['Am', 'Am', 'G', 'F'][1:], [ACID1, ACID1, ACID1], vel=96, caida=0.9)
        arpegio(c['seg3'], t + 8, ['G', 'F'], patron=(0, 1, 2, 1), desde='G4', vel=60, dur=0.2)
        bat(c['rui'], t, 1, [(K4, 'gb_bombo')], vel=104)
        bat(c['rui'], t + 4, 1, [(K4, 'gb_bombo'), (HAT8, 'gb_hatab')], vel=100)
        bat(c['rui'], t + 8, 1, [(K4, 'gb_bombo'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], vel=100)
        bat(c['rui'], t + 12, 1, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', vel=100)
        t += 16
        m('Club · la melodía en los sintes', t, 8, 'La menor')
        tocar(c['lead3'], t, a44(X1), 100)
        tocar(c['lead3'], t + 16, a44(X2), 102)
        arpegio(c['seg3'], t, CH_X * 2, patron=(0, 1, 2, 3, 2, 1, 2, 1), desde='A4', vel=62, dur=0.2)
        bajo(c['acid'], t, CH_X * 2, [ACID1, ACID1, ACID2, ACID3] * 2, vel=100, caida=0.9)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'redoble4', vel=100, crash=100)
        t += 32
        m('Club · subida (la guitarra, a lo lejos)', t, 6, 'La menor')
        tocar(c['lead2'], t, SUB, 98)
        bajo(c['acid'], t + 8, ['G', 'E7', 'E7', 'E7'], [OFFB, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=98, caida=0.8)
        sacudida(c['seg'], t, ['Am', 'F', 'G', 'E7', 'E7', 'E7'],
                 ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxx......'],
                 desde='A3', vel=70, caida=0.6)
        bat(c['rui'], t, 2, [('....X.......X...', 'gb_palma'), ('x.x.x.x.x.x.x.x.', 'gb_casta')], vel=84)
        bat(c['rui'], t + 8, 2, [(K4, 'gb_bombo'), ('....x.......x...', 'gb_palma'), (HAT16, 'gb_hat')], vel=90)
        bat(c['rui'], t + 16, 1, [(K4, 'gb_bombo'), ('x.x.x.x.x.x.x.x.', 'gb_caja')], vel=96)
        bat(c['rui'], t + 20, 1, [(K4, 'gb_bombo'), ('xxxxxxxxxxxx....', 'gb_caja')], vel=100)
        t += 24
        m('Club · drop (el gancho ondulante)', t, 8, 'La menor / La mayor')
        tocar(c['pwm'], t, a44(X1), 106)
        tocar(c['pwm'], t + 16, a44(E1), 108)
        arpegio(c['seg3'], t, (CH_X + CH_E1)[:7], patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='A4', vel=64, dur=0.2)
        bajo(c['acid'], t, (CH_X + CH_E1)[:7], [ACID1, ACID1, ACID2, ACID3, ACID1, ACID2, ACID3], vel=104, caida=0.9)
        bat(c['rui'], t, 7, [(K4, 'gb_bombo'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab'), (HAT16, 'gb_hat')], 'toms', vel=104, crash=112)
        t += 28
        # The last bar of the drop: a kick, a stab and then nothing (a cut) so the guitar can come back on its first beat.
        c['rui'].golpe(t, 'gb_bombo', 118)
        c['rui'].golpe(t + 2, 'gb_crash', 100)
        t += 4

        # --- The return: the guitar, in D, falls on the first beat as if nothing had happened ----------------------------
        m('Vuelta de golpe · falseta en Re', t, 3, 'Re menor')
        tocar(c['lead2'], t, SAL, 100)
        sacudida3(c['seg'], t, CH_S, [RB, RB, RB, RB], desde='A3', vel=82, caida=0.8)
        bajo3(c['bajo'], t, CH_S, [B1, B2, B1, B2], vel=100)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA2, 'gb_casta')], 'rodado', vel=98)
        c['rui'].golpe(t, 'gb_crash', 100)
        t += 12

        # --- Copla 3: D minor / D major ---------------------------------------------------------------------------------
        m('Copla 3 · frases 1 y 2', t, 3, 'Re menor (cadencia andaluza)')
        tocar(c['lead'], t, X1D, 104)
        sacudida3(c['seg'], t, CH_XD, [RA, RC, RB, RB], desde='A3', vel=80, caida=0.8)
        bajo3(c['bajo'], t, CH_XD, [B1, B2, B1, B2], vel=98)
        bat3(c['rui'], t, 4, [(PA2, 'gb_palma'), (CA1, 'gb_casta')], vel=94)
        t += 12
        m('Copla 3 · frases 3 y 4 (segunda voz)', t, 3, 'Re menor (cadencia andaluza)')
        tocar(c['lead2'], t, X2D, 106)
        segunda_voz3(c['seg3'], t, X2D, CH_XD, REM, vel=82)
        bajo3(c['bajo'], t, CH_XD, [B4, B2, B4, B3], vel=100)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], 'rodado', vel=96)
        t += 12
        m('Copla 3 · estribillo (Re mayor)', t, 3, 'Re mayor')
        tocar(c['lead'], t, E1D, 106)
        sacudida3(c['seg'], t, CH_E1D, [RB, RC, RB, RA], desde='A3', vel=84, caida=0.8)
        bajo3(c['bajo'], t, CH_E1D, [B3, B4, B3, B2], vel=100)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA2, 'gb_casta')], vel=98)
        t += 12
        m('Copla 3 · estribillo y «¡y... ahí!»', t, 3, 'Re mayor')
        tocar(c['lead'], t, E2D, 108)
        sacudida3(c['seg'], t, CH_E2D[:3], [RB, RB, RA], desde='A3', vel=86, caida=0.8)
        bajo3(c['bajo'], t, CH_E2D[:3], [B3, B3, B2], vel=102)
        bat3(c['rui'], t, 3, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=100)
        stop3(t + 9, 'D', None)
        ahi(t + 9)
        t += 12

        # --- Copla 4: picked guitar, then the full estribillo that runs into the coda -----------------------------------
        m('Copla 4 · frases 1 y 2 (guitarra punteada)', t, 3, 'Re menor (cadencia andaluza)')
        tocar(c['lead2'], t, mordentes(X1D, ARM, 1.0, 1), 106)
        for i, ch in enumerate(CH_XD):
            ts = tonos(ch, 'A3', midi('A3') + 14)
            for k, ix in enumerate((0, 2, 1, 2, 1, 2)):
                c['seg3'].nota(t + i * 3 + k * 0.5, 0.42, ts[ix % len(ts)], 72 + (8 if k % 2 == 0 and k else 0))
        bajo3(c['bajo'], t, CH_XD, [B1, B1, B2, B1], vel=98)
        bat3(c['rui'], t, 4, [(PA1, 'gb_palma'), (CA3, 'gb_casta')], vel=94)
        t += 12
        m('Copla 4 · frases 3 y 4 (paso y remate)', t, 3, 'Re menor (cadencia andaluza)')
        tocar(c['lead'], t, mordentes(X2D, ARM, 1.0, 1), 108)
        sacudida3(c['seg'], t, CH_XD, [RB, RD, RB, RB], desde='A3', vel=84, caida=0.8)
        bajo3(c['bajo'], t, CH_XD, [B4, B2, B4, B3], vel=102)
        bat3(c['rui'], t, 4, [('X...x.o.xxx.', 'gb_palma'), (CA3, 'gb_casta')], 'rodado', vel=98)
        t += 12
        m('Copla 4 · estribillo (Re mayor)', t, 3, 'Re mayor')
        tocar(c['lead2'], t, mordentes(E1D, escala('D', 'mayor') | {6}, 1.5, 1), 108)
        segunda_voz3(c['seg3'], t, E1D, CH_E1D, escala('D', 'mayor'), vel=86)
        bajo3(c['bajo'], t, CH_E1D, [B3, B4, B3, B4], vel=102)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=100)
        t += 12
        m('Copla 4 · estribillo hacia la coda', t, 3, 'Re mayor')
        tocar(c['lead'], t, E2E, 110)
        sacudida3(c['seg'], t, CH_E2E, [RB, RB, RB, RB], desde='A3', vel=88, caida=0.8)
        bajo3(c['bajo'], t, CH_E2E, [B3, B3, B4, B3], vel=104)
        bat3(c['rui'], t, 4, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], 'rodado', vel=102)
        t += 12

        # --- Coda: both worlds for a moment, then the stop on E7 that falls back on the intro's A minor ---------------------
        m('Coda · se cuela el club', t, 3, 'Re menor → La')
        tocar(c['lead'], t, K1, 108)
        sacudida3(c['seg'], t, CH_K1, [RB, RB, RB, RB], desde='A3', vel=84, caida=0.8)
        bajo3(c['bajo'], t, CH_K1, [B3, B2, B4, B3], vel=102)
        bat3(c['rui'], t, 2, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=100)
        bat3(c['rui'], t + 6, 2, [('X...X...X...', 'gb_bombo'), ('....x...x...', 'gb_palma'), ('..x...x...x.', 'gb_hatab')], vel=100)
        t += 12
        m('Coda · las dos cosas a la vez', t, 3, 'La menor / Mi')
        tocar(c['lead3'], t, K2, 108)
        sacudida3(c['seg'], t, CH_K2[:3], [RB, RB, RA], desde='A3', vel=82, caida=0.8)
        for i, ch in enumerate(CH_K2[:2]):
            r = sinte.bajo_de(ch, 3)
            for k, st in enumerate((0, 0, 12, 0, 0, 12)):
                c['acid'].nota(t + i * 3 + k * 0.5, 0.42, r + st, 100 + (6 if k % 2 == 0 else 0))
        bat3(c['rui'], t, 2, [('X...X...X...', 'gb_bombo'), ('....x...x...', 'gb_palma'), ('..x...x...x.', 'gb_hatab')], vel=102)
        bajo3(c['bajo'], t + 6, ['F'], [B1], vel=100)
        bat3(c['rui'], t + 6, 1, [(PA3, 'gb_palma'), (CA3, 'gb_casta')], vel=100)
        stop3(t + 9, 'E7', None, vel_guitarra=92)
        c['rui'].golpe(t + 9, 'gb_palma', 124)
        c['rui'].golpe(t + 11, 'gb_palma', 104)
        return t + 12

    return C, ronda, beats, bpm, m


B.CANCIONES['combate-sevillanas'] = combate_sevillanas

if __name__ == '__main__':
    B.salir('combate-sevillanas')
