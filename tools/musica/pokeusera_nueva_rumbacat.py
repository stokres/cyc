# «Rumba catalana» for the Bar del Brío (PokéUsera · Edición Jarra): the same four-channel chip sound as
# pokeusera_largas_b.py (two pulses, the 16-step wave bass, LFSR noise drums; no reverb, mono), written as a
# full song. B minor / D major / E minor / F sharp minor / E major, 136 bpm, 100 bars (about 2:56 a round).
#
#   python3 pokeusera_nueva_rumbacat.py        renders the round, checks it and writes src/sonido/pokeusera-combate-rumbacat.mp3
#
# What makes it a rumba catalana: the guitar «ventilador» (a fast fan of strokes, down and up, with a dry muted
# chuck on beats 2 and 4), the claps on 2 and 4, a walking bass that leans on the next chord, the call and answer
# between the tune and a «¡oé, oé!» / «ay, ay, ay» chorus (a third pulse voice, never together with the lead),
# the Andalusian cadence (Bm A G F#7) against major (D), a fast falseta and a neighbourhood-fair ending.
import sys
import numpy as np
import sinte
from sinte import Cancion, Inst, frase, tocar, tonos, acorde, escala, midi, revisa, bajo_de
from pokeusera import tempo, redoble, sacudida, arpegio, L, _por_compas
import pokeusera_largas_b as B
from pokeusera_largas_b import voces, bajo, bat, Mapa, sube, corta, une, mordentes, armonica


def rasgueo(P, t0, acordes, patron, desde='A3', vel=80):
    """The rumba strum on one chip-arpeggio note per stroke. Per step: X accent down-stroke, x down-stroke, u up-stroke
    (the chord runs the other way, softer), m muted chuck (a dry stab), - holds the stroke, . rests."""
    for i, ch in enumerate(acordes):
        pat = _por_compas(patron, i)
        assert len(pat) == 16, pat
        ts = tonos(ch, desde, midi(desde) + 11)
        sub = [x - ts[0] for x in ts] + [12]
        for k, c in enumerate(pat):
            if c in '.-':
                continue
            n_ = 1
            while k + n_ < 16 and pat[k + n_] == '-':
                n_ += 1
            offs = tuple(sub[::-1]) if c == 'u' else tuple(sub)
            dur = {'m': 0.11, 'u': 0.2}.get(c, 0.22) if n_ == 1 else n_ * 0.25 * 0.97
            v = {'X': vel + 8, 'x': vel, 'u': vel - 12, 'm': vel + 2}[c]
            P.nota(t0 + i * L + k / 4, dur, ts[0], v, arp=offs)


def camina(acordes, patrones, sig=None):
    """Walking-bass patterns for a run of chords: the last step of each bar leans on the next chord (a tone or a
    semitone under or over its root); `sig` is the chord that follows the run."""
    out = []
    for i, ch in enumerate(acordes):
        p = _por_compas(patrones, i)
        nxt = acordes[i + 1] if i + 1 < len(acordes) else sig
        ap = None
        if nxt:
            ap = {10: 'n', 11: 'd', 1: 'e', 2: '2'}.get((acorde(nxt)[0] - acorde(ch)[0]) % 12)
        out.append(p[:-2] + ap + '-' if ap else p)
    return out


def barra(*compases):
    """Bars written as strings of sixteenths."""
    return frase(' | '.join(compases))


def combate_rumbacat():
    """B minor / D major, 136 bpm, 100 bars: a rumba catalana. Intro with the strum and a call; the tune over the
    Andalusian cadence (A) and again on the 50 % pulse (A'); the chorus in D (B) and again with a new second half (B');
    a bridge of palmas and bass that turns into a fast falseta; a new tune over the Andalusian cadence in E minor (C) and
    a tone higher in F sharp minor (C'); the fast-clap remate; the tune with picked guitar (A''); a bass tumbao that
    builds up with the chorus; the chorus a tone higher in E major (B'') and a coda a la verbena that stops on F#7."""
    bpm = tempo(136)
    beats = 100 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-14, vol_seg=-10, vol_bajo=-12, vol_rui=-21, duty_lead=0.25)
    c['seg'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.09, 0.5, 0.04), arp_hz=60)
    c['lead3'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.13, 0.4, 0.04), vib=(14, 5.6, 0.2), ataque=(0.6, 0.012))
    m = Mapa(beats)
    SI = escala('B', 'menor')
    ARM = armonica('B')
    RE = escala('D', 'mayor')

    # --- Chords -----------------------------------------------------------------------------
    CH_IN = ['Bm', 'Bm', 'F#7', 'F#7']
    CH_A = ['Bm', 'A', 'G', 'F#7', 'Bm', 'D', 'Em', 'F#7']
    CH_B = ['D', 'A', 'G', 'A7', 'D', 'A', 'Em', 'A7']
    CH_B2 = ['D', 'A', 'G', 'A7', 'D', 'Bm', 'Em', 'F#7']
    CH_PU = ['Bm', 'Bm', 'Em', 'F#7']
    CH_FA = ['Bm', 'A', 'G', 'F#7']
    CH_C = ['Em', 'D', 'C', 'B7', 'Em', 'D', 'C', 'B7']
    CH_C2 = ['F#m', 'E', 'D', 'C#7', 'F#m', 'E', 'C#7', 'F#7']
    CH_R = ['Bm', 'A', 'G', 'F#7']
    CH_TU = ['Bm', 'Bm', 'F#7', 'F#7', 'Bm', 'G', 'F#7', 'B7']
    CH_B3 = ['E', 'B', 'A', 'B7', 'E', 'B', 'F#m', 'F#7']
    CH_CO = ['Bm', 'A', 'G', 'F#7']

    # --- Tunes (every bar is sixteen sixteenths) -------------------------------------------------
    INTRO = barra('-:16', '-:16', 'E6:1 -:1 E6:1 -:1 E6:1 -:1 C#6:2 A#5:2 C#6:2 E6:2 C#6:2', 'F#6:4 E6:2 C#6:2 A#5:4 -:4')
    A = barra('F#6:3 F#6:1 D6:2 F#6:2 D6:3 C#6:1 B5:4',
              'E6:3 E6:1 C#6:2 E6:2 C#6:3 B5:1 A5:4',
              'D6:3 D6:1 B5:2 D6:2 B5:3 A5:1 G5:4',
              'C#6:3 A#5:1 C#6:2 E6:2 -:8',
              'F#6:3 F#6:1 B6:2 A6:2 F#6:3 D6:1 B5:4',
              'A6:3 A6:1 F#6:2 A6:2 F#6:3 E6:1 D6:4',
              'G6:3 G6:1 E6:2 G6:2 B6:3 A6:1 G6:4',
              'C#6:2 E6:2 A#5:2 C#6:2 -:8')
    # Answer of the chorus (third pulse voice) in the second half of bars 4 and 8: «¡oé, oé!» and «ay, ay, ay».
    COR_A = barra('-:16', '-:16', '-:16', '-:8 C#6:1 C#6:1 E6:2 C#6:1 A#5:1 C#6:2',
                  '-:16', '-:16', '-:16', '-:8 E6:1 -:1 E6:1 -:1 E6:1 -:1 C#6:2')
    B_ = barra('A6:3 A6:3 F#6:2 D6:3 -:1 F#6:2 A6:2',
               'E6:3 E6:3 C#6:2 A5:3 -:1 C#6:2 E6:2',
               'D6:3 D6:3 B5:2 G5:3 -:1 B5:2 D6:2',
               'E6:3 G6:1 E6:2 C#6:2 -:8',
               'A6:4 F#6:2 A6:2 F#6:3 -:1 D6:2 F#6:2',
               'E6:3 E6:1 C#6:2 E6:2 A6:4 E6:4',
               'G6:3 G6:1 E6:2 G6:2 B6:4 G6:4',
               'E6:2 G6:2 E6:2 C#6:2 -:8')
    COR_B = barra('-:16', '-:16', '-:16', '-:8 C#6:1 C#6:1 E6:2 C#6:1 A5:1 C#6:2',
                  '-:16', '-:16', '-:16', '-:8 A5:1 C#6:1 E6:2 G6:2 E6:2')
    B2b = barra('F#6:3 A6:1 D7:2 A6:2 F#6:3 -:1 D6:2 F#6:2',
                'D6:3 F#6:1 B6:2 F#6:2 D6:3 -:1 B5:2 D6:2',
                'G6:3 B6:1 G6:2 B6:2 E6:3 G6:1 B5:4',
                'C#6:2 E6:2 A#5:2 C#6:2 -:8')
    COR_B2 = une((corta(COR_B, 0, 7), 7), (barra('-:8 C#6:1 C#6:1 E6:2 C#6:1 A#5:1 C#6:2'), 1))
    B2 = une((corta(B_, 0, 4), 4), (B2b, 4))
    PUENTE = barra('-:16', '-:16', '-:16', '-:8 E6:1 -:1 E6:1 -:1 E6:1 -:1 C#6:2')
    FAL = barra('B5:1 C#6:1 D6:1 E6:1 F#6:1 E6:1 D6:1 C#6:1 B5:1 D6:1 F#6:1 D6:1 B5:2 F#5:2',
                'A5:1 C#6:1 E6:1 C#6:1 A5:1 C#6:1 E6:1 A6:1 E6:1 C#6:1 A5:1 C#6:1 E6:4',
                'G5:1 B5:1 D6:1 G6:1 D6:1 B5:1 G5:1 B5:1 D6:1 B5:1 A5:1 B5:1 G5:4',
                'F#5:1 A#5:1 C#6:1 E6:1 C#6:1 A#5:1 F#5:1 A#5:1 C#6:1 E6:1 F#6:1 E6:1 C#6:4')
    FAL2 = barra('F#6:1 E6:1 D6:1 C#6:1 B5:1 C#6:1 D6:1 F#6:1 B6:1 F#6:1 D6:1 B5:1 D6:2 F#6:2',
                 'E6:1 D6:1 C#6:1 B5:1 A5:1 B5:1 C#6:1 E6:1 A6:1 E6:1 C#6:1 A5:1 C#6:2 E6:2',
                 'D6:1 B5:1 A5:1 B5:1 G5:1 A5:1 B5:1 D6:1 G6:1 D6:1 B5:1 G5:1 B5:2 D6:2',
                 'E6:1 C#6:1 A#5:1 C#6:1 E6:1 C#6:1 A#5:1 F#5:1 A#5:1 C#6:1 E6:1 F#6:1 E6:2 C#6:2')
    CC = barra('B6:3 -:3 G6:2 B6:3 -:1 G6:2 E6:2',
               'A6:3 -:3 F#6:2 A6:3 -:1 F#6:2 D6:2',
               'G6:3 -:3 E6:2 G6:3 -:1 E6:2 C6:2',
               'F#6:3 D#6:1 F#6:2 A6:2 -:8',
               'G6:3 B6:1 E7:2 B6:2 G6:3 -:1 E6:2 G6:2',
               'F#6:3 A6:1 D7:2 A6:2 F#6:3 -:1 D6:2 F#6:2',
               'E6:3 G6:1 C7:2 G6:2 E6:3 -:1 C6:2 E6:2',
               'D#6:2 F#6:2 A6:4 -:8')
    CC2b = barra('C#6:2 F6:2 G#6:2 B6:2 G#6:4 F6:2 C#6:2',
                 'A#5:2 C#6:2 E6:2 F#6:2 A#5:2 C#6:2 F#6:2 -:2')
    CC2 = une((sube(corta(CC, 0, 6), 2), 6), (CC2b, 2))
    COR_C = barra('-:16', '-:16', '-:16', '-:8 D#6:1 D#6:1 F#6:2 D#6:1 B5:1 D#6:2',
                  '-:16', '-:16', '-:16', '-:8 D#6:1 -:1 D#6:1 -:1 D#6:1 -:1 B5:2')
    REM = barra('B5:2 D6:2 F#6:4 B6:4 F#6:2 D6:2',
                'A5:2 C#6:2 E6:4 A6:4 E6:2 C#6:2',
                'G5:2 B5:2 D6:4 G6:4 D6:2 B5:2',
                'F#6:1 F#6:1 F#6:1 -:1 E6:1 E6:1 E6:1 -:1 C#6:2 E6:2 A#5:4')
    TU = barra('-:16', '-:16', '-:16', '-:16',
               '-:16', '-:16', '-:16', '-:16')
    COR_TU = barra('-:16', '-:16', '-:16', '-:16',
                   'F#6:1 -:1 F#6:1 -:1 F#6:1 -:1 D6:2 F#6:1 -:1 F#6:1 -:1 F#6:1 -:1 D6:2',
                   'G6:1 -:1 G6:1 -:1 G6:1 -:1 D6:2 G6:1 -:1 G6:1 -:1 G6:1 -:1 B6:2',
                   'A6:1 -:1 A6:1 -:1 A6:1 -:1 E6:2 A6:1 -:1 A6:1 -:1 A6:1 -:1 C#7:2',
                   'F#6:2 D#6:2 B5:2 D#6:2 F#6:8')
    B3b = barra('C#6:2 E6:2 A#5:2 C#6:2 F#6:4 E6:2 C#6:2')
    B3 = une((sube(corta(B_, 0, 7), 2), 7), (B3b, 1))
    COR_B3 = barra('-:16', '-:16', '-:16', '-:8 D#6:1 D#6:1 F#6:2 D#6:1 B5:1 D#6:2',
                   '-:16', '-:16', '-:16', '-:16')
    CODA = barra('B5:2 D6:2 F#6:2 B6:2 F#6:2 D6:2 B5:4',
                 'A5:2 C#6:2 E6:2 A6:2 E6:2 C#6:2 A5:4',
                 'G5:2 B5:2 D6:2 G6:2 B6:2 G6:2 D6:4',
                 'C#6:2 E6:2 A#5:2 C#6:2 E6:2 F#6:2 -:4')
    COR_CO = barra('-:16', '-:16', '-:16', '-:12 C#6:1 C#6:1 E6:2')
    for nombre, notas, ch in (('intro', INTRO, CH_IN), ('A', A, CH_A), ('coro A', COR_A, CH_A), ('B', B_, CH_B), ('coro B', COR_B, CH_B),
                              ('B2', B2, CH_B2), ('coro B2', COR_B2, CH_B2), ('puente', PUENTE, CH_PU), ('falseta', FAL, CH_FA), ('falseta 2', FAL2, CH_FA), ('C', CC, CH_C), ('coro C', COR_C, CH_C),
                              ('C2', CC2, CH_C2), ('remate', REM, CH_R), ('coro tumbao', COR_TU, CH_TU), ('B3', B3, CH_B3),
                              ('coro B3', COR_B3, CH_B3), ('coda', CODA, CH_CO), ('coro coda', COR_CO, CH_CO)):
        revisa(f'rumbacat {nombre}', notas, [[a] for a in ch])

    # --- Strums (X accent down, x down, u up, m muted chuck, - hold) ----------------------------
    RAS_A = 'X-uxm-uxX-uxm-ux'
    RAS_B = 'X-uxm-uxX-uxmxux'
    RAS_C = 'X-uxmxuxX-uxmxux'
    RAS_D = 'X---m-.uX-uxm-.u'
    RAS_E = 'X-.xm-uxX-.xm-ux'
    # --- Bass walks ----------------------------------------------------------------------------
    BW1, BW2, BW3 = '0-5-0-3-5-3-0-a-', '0-3-5-3-0-5-8-5-', '0-0-5-3-0-3-5-3-'
    BT1, BT2, BT3 = '0-.0-.5-0-.0-.5-', '0-...5-.0-...5-.', '0-.0-0-5-.0-5-3-'
    # --- Drums ---------------------------------------------------------------------------------
    BOMBO, BOMBO2 = 'X.....x.x.....x.', 'X.....x.x..x..x.'
    PALMAS, PAL2 = '....X..o....X..o', '....X.x.o...X.x.'
    GUIRA, HAT = 'o.x.o.x.o.x.o.x.', 'o.o.o.o.o.o.o.o.'
    BONGO = ('..o..o......o...', 'gb_bongo_hi')
    BASE = [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), (GUIRA, 'gb_guira')]

    def ronda(t):
        # Intro: the strum alone for two bars (a bongo whispering under it), then the call on the dominant.
        m('Intro (llamada)', t, 4, 'Si menor')
        rasgueo(c['seg'], t, CH_IN[:2], [RAS_A, RAS_B], vel=74)
        rasgueo(c['seg'], t + 2 * L, CH_IN[2:], [RAS_A, RAS_C], vel=80)
        tocar(c['lead2'], t, INTRO, 98)
        bajo(c['bajo'], t + 2 * L, CH_IN[2:], camina(CH_IN[2:], [BW1, BT1], 'Bm'), vel=92)
        bat(c['rui'], t, 2, [('..........o.o...', 'gb_bongo_lo'), ('...o...o...o...o', 'gb_bongo_hi')], vel=84, crash=80)
        bat(c['rui'], t + 2 * L, 2, BASE, 'palmas', vel=94)
        t += 4 * L
        # A: the tune on the 25 % pulse over the Andalusian cadence, the strum, a walking bass, the chorus answers in bars 4 and 8.
        m('A (tema)', t, 8, 'Si menor')
        tocar(c['lead'], t, A, 102)
        tocar(c['lead3'], t, COR_A, 98)
        rasgueo(c['seg'], t, CH_A, [RAS_A, RAS_A, RAS_A, RAS_B], vel=78)
        bajo(c['bajo'], t, CH_A, camina(CH_A, [BW1, BW2, BW1, BW2], 'Bm'), vel=96)
        bat(c['rui'], t, 8, BASE, 'palmas', crash=84)
        t += 8 * L
        # A': the 50 % pulse with mordents; the strum in a fuller pattern, a tumbao bass, a bongo and more güiro.
        m("A' (50 %, tumbao)", t, 8, 'Si menor')
        tocar(c['lead2'], t, mordentes(A, ARM, 1.0, 2), 102)
        tocar(c['lead3'], t, COR_A, 98)
        rasgueo(c['seg'], t, CH_A, [RAS_C, RAS_B, RAS_C, RAS_C], vel=80)
        bajo(c['bajo'], t, CH_A, camina(CH_A, [BT1, BT2, BT1, BT3], 'D'), vel=98)
        bat(c['rui'], t, 8, [(BOMBO2, 'gb_bombo'), (PAL2, 'gb_palma'), BONGO, (GUIRA, 'gb_guira')], 'bongos', crash=84)
        t += 8 * L
        # B: the chorus in D major, the strum with a fan every bar, a walking bass, the answer.
        m('B (estribillo, Re mayor)', t, 8, 'Re mayor')
        tocar(c['lead2'], t, B_, 100)
        tocar(c['lead3'], t, COR_B, 98)
        rasgueo(c['seg'], t, CH_B, [RAS_B, RAS_C], vel=80)
        bajo(c['bajo'], t, CH_B, camina(CH_B, [BW2, BW3], 'D'), vel=98)
        bat(c['rui'], t, 8, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, (GUIRA, 'gb_guira')], 'palmas', crash=88)
        t += 8 * L
        # B': the chorus on the 25 % pulse with a new second half (D, B minor, E minor, F#7) that leans back to B minor.
        m("B' (estribillo, final nuevo)", t, 8, 'Re mayor')
        tocar(c['lead'], t, mordentes(B2, RE | {6}, 1.5, 1), 104)
        tocar(c['lead3'], t, COR_B2, 98)
        rasgueo(c['seg3'], t, CH_B2, [RAS_E, RAS_C], vel=80)
        bajo(c['bajo'], t, CH_B2, camina(CH_B2, [BW3, BW2], 'Bm'), vel=98)
        bat(c['rui'], t, 8, [(BOMBO2, 'gb_bombo'), (PAL2, 'gb_palma'), ('..........x.....', 'gb_bongo_hi'), (GUIRA, 'gb_guira')], 'bongos', crash=88)
        t += 8 * L
        # Puente: four bars of palmas, bongos and a bass that talks to them, then a falseta on the 12.5 % pulse.
        m('Puente (palmas y falseta)', t, 8, 'Si frigio')
        bajo(c['bajo'], t, CH_PU, [BT2, '0..0..5.0..0..5.', '0-.0-.5-.n-n-n-n', '0-.0-.5-0-d-d-d-'], vel=100)
        rasgueo(c['seg'], t, CH_PU, ['X---------------', '................', 'X---------------', 'X-----m-m-m-m-m-'], vel=70)
        tocar(c['lead3'], t, PUENTE, 96)
        bat(c['rui'], t, 4, [('X.......x.......', 'gb_bombo'), ('....x.x.x.x.x.x.', 'gb_palma'), ('..o...o...o...o.', 'gb_bongo_hi'), ('..........x...x.', 'gb_bongo_lo')], 'palmas', vel=96, crash=86)
        tocar(c['lead3'], t + 4 * L, FAL, 100)
        rasgueo(c['seg'], t + 4 * L, CH_FA, [RAS_A, RAS_B], vel=68)
        bajo(c['bajo'], t + 4 * L, CH_FA, camina(CH_FA, [BW1, BW2], 'Bm'), vel=94)
        bat(c['rui'], t + 4 * L, 4, [(BOMBO, 'gb_bombo'), (PALMAS, 'gb_palma'), (GUIRA, 'gb_guira')], 'bongos', vel=90)
        t += 8 * L
        # C: a new tune over the Andalusian cadence in E minor; long syncopated notes with the chuck underneath.
        m('C (tema nuevo, Mi menor)', t, 8, 'Mi menor')
        tocar(c['lead'], t, CC, 102)
        tocar(c['lead3'], t, COR_C, 98)
        rasgueo(c['seg'], t, CH_C, [RAS_B, RAS_A], desde='G3', vel=80)
        bajo(c['bajo'], t, CH_C, camina(CH_C, [BW2, BW1, BT1, BW3], 'F#m'), vel=98)
        bat(c['rui'], t, 8, [(BOMBO2, 'gb_bombo'), (PALMAS, 'gb_palma'), BONGO, (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'palmas', crash=90)
        t += 8 * L
        # C': the same tune a tone higher in F sharp minor on the 50 % pulse; it ends on F#7, the dominant of B minor.
        m("C' (un tono arriba, Fa# menor)", t, 8, 'Fa# menor')
        tocar(c['lead2'], t, CC2, 106)
        rasgueo(c['seg3'], t, CH_C2, [RAS_C, RAS_B], desde='A3', vel=82)
        bajo(c['bajo'], t, CH_C2, camina(CH_C2, [BW2, BW3], 'Bm'), vel=100)
        bat(c['rui'], t, 8, [('X...x...X...x.x.', 'gb_bombo'), (PAL2, 'gb_palma'), (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'redoble4', crash=96)
        t += 8 * L
        # Falseta II: the guitar runs down and then up, claps in sixteenths, the bass walking at full speed.
        m('Falseta II (a dúo con las palmas)', t, 8, 'Si menor')
        tocar(c['lead3'], t, une((FAL2, 4), (FAL, 4)), 102)
        rasgueo(c['seg'], t, CH_FA * 2, [RAS_E, RAS_B], vel=70)
        bajo(c['bajo'], t, CH_FA * 2, camina(CH_FA * 2, [BW2, BW3, BW1, BW2], 'Bm'), vel=98)
        bat(c['rui'], t, 8, [('X.....x.x.....x.', 'gb_bombo'), ('....x.x.x.x.x.x.', 'gb_palma'), (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'toms', vel=98, crash=90)
        t += 8 * L
        # Remate: fast claps, a run up on the tune.
        m('Remate (palmas rápidas)', t, 4, 'Si menor')
        tocar(c['lead'], t, REM, 104)
        rasgueo(c['seg'], t, CH_R, [RAS_C], vel=84)
        bajo(c['bajo'], t, CH_R, camina(CH_R, [BW2], 'Bm'), vel=98)
        bat(c['rui'], t, 3, [('X.......X.......', 'gb_bombo'), ('x.x.x.x.x.x.x.x.', 'gb_palma'), ('.o.o.o.o.o.o.o.o', 'gb_hat')])
        bat(c['rui'], t + 3 * L, 1, [('X.......X.......', 'gb_bombo'), ('x.x.x.x.x.x.x.x.', 'gb_palma')])
        redoble(c['rui'], t + 3 * L + 2, 50, 112, 8, 'gb_palma')
        t += 4 * L
        # A'': the tune on the 25 % pulse with the guitar picking the chords in eighths, a syncopated bass, softer claps.
        m("A'' (guitarra punteada)", t, 8, 'Si menor')
        tocar(c['lead'], t, mordentes(A, ARM, 1.0, 1), 104)
        tocar(c['lead3'], t, COR_A, 98)
        arpegio(c['seg3'], t, CH_A, patron=(0, 2, 1, 2), desde='B3', paso=0.5, dur=0.42, vel=70)
        bajo(c['bajo'], t, CH_A, camina(CH_A, [BT3, BT1, BT3, BT2], 'Bm'), vel=98)
        bat(c['rui'], t, 8, [('X.....x.x.....x.', 'gb_bombo'), ('....o.o.....o.o.', 'gb_palma'), ('..........x.....', 'gb_bongo_hi'), (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'bongos', crash=88)
        t += 8 * L
        # Tumbao: four bars of bass and claps, then the chorus chants over a strum that grows back; it ends on B7, the dominant of E.
        m('Tumbao (bajo, palmas y coro)', t, 8, 'Si menor')
        bajo(c['bajo'], t, CH_TU[:4], [BT2, '0..0..5.0..0..5.', '0-.0-.5-n-.0-.5-', '0-.0-.0-0-.0-.5-'], vel=102)
        bat(c['rui'], t, 4, [('X.......x.x.....', 'gb_bombo'), (['....x.x.....x.x.'] * 2 + ['x.x.x.x.x.x.x.x.'] * 2, 'gb_palma'), (GUIRA, 'gb_guira')], 'redoble4', vel=92, crash=80)
        tocar(c['lead3'], t, COR_TU, 100)
        rasgueo(c['seg'], t + 4 * L, CH_TU[4:], [RAS_D, RAS_E, RAS_C, RAS_C], vel=76)
        bajo(c['bajo'], t + 4 * L, CH_TU[4:], camina(CH_TU[4:], [BW1, BW2, BW3, BW2], 'E'), vel=100)
        bat(c['rui'], t + 4 * L, 4, [('X...x...X...x.x.', 'gb_bombo'), ('....x.x.....x.x.', 'gb_palma'), (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'redoble4', vel=96)
        t += 8 * L
        # B'': the chorus a tone higher in E major, the strum louder, every drum; it leans on F#7 to fall back to B minor.
        m("B'' (estribillo, Mi mayor)", t, 8, 'Mi mayor')
        tocar(c['lead2'], t, B3, 106)
        tocar(c['lead3'], t, COR_B3, 98)
        rasgueo(c['seg'], t, CH_B3, [RAS_C, RAS_B], desde='B3', vel=84)
        bajo(c['bajo'], t, CH_B3, camina(CH_B3, [BW2, BW3], 'Bm'), vel=100)
        bat(c['rui'], t, 8, [('X...x...x.x...x.', 'gb_bombo'), (PAL2, 'gb_palma'), BONGO, (HAT, 'gb_hat'), (GUIRA, 'gb_guira')], 'palmas', vel=104, crash=104)
        t += 8 * L
        # Coda: a verbena ending, an oom-pah bass, the fanfare on the cadence; it stops on F#7 so the loop falls on the intro.
        m('Coda (verbena, enlaza con la intro)', t, 4, 'Si menor')
        tocar(c['lead'], t, CODA, 104)
        tocar(c['lead3'], t, COR_CO, 100)
        rasgueo(c['seg'], t, CH_CO, [RAS_A, RAS_A, RAS_A, RAS_C], vel=80)
        bajo(c['bajo'], t, CH_CO, ['0-5-0-5-0-5-0-5-'], vel=100)
        bat(c['rui'], t, 4, [('X.......X.......', 'gb_bombo'), ('....x.x.....x.x.', 'gb_caja'), (GUIRA, 'gb_guira')], 'bongos', crash=96)
        return t + 4 * L

    return C, ronda, beats, bpm, m


B.CANCIONES['combate-rumbacat'] = combate_rumbacat

if __name__ == '__main__':
    B.salir('combate-rumbacat')
