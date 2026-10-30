# «Rumba del Bar Donde Juan»: a long battle tune (about 3:08 a round) for the Bar Donde Juan stage of «PokéUsera».
# Same four-channel chip sound as pokeusera_largas_b.py (two pulses, the 16-step wave bass, LFSR noise drums;
# no reverb, no echo, mono). A relaxed flamenco rumba «de barra de bar»: the box drum (cajón) up front, strummed guitar,
# claps, bongos, a tumbao bass, a singalong «oé, oé» chorus, a guitar falseta and a bridge of cajón and claps with «¡ole!».
#
#   python3 pokeusera_nueva_rumbajuan.py        B minor / D major, 112 bpm, 88 bars  ->  src/sonido/pokeusera-combate-rumbajuan.mp3
import sys
import pokeusera_largas_b as B
from sinte import Cancion, Inst, frase, tocar, escala, revisa
from pokeusera import tempo, redoble, sacudida, arpegio, segunda_voz, L


def combate_rumbajuan():
    """B minor / D major, 112 bpm, 88 bars. Intro (guitar alone, then a call «oé, oé» on the dominant); the tune in B minor (A);
    the tune again with a second voice (A'); the chorus in D with a descending bass (B) and again with a new second half, the
    voices in thirds (B'); a guitar falseta in B phrygian; a new tune in E minor (C) and a tone higher in F sharp minor (C');
    a bridge of cajón and claps with «¡ole!»; a build-up; the tune with picked guitar (A''); the chorus a tone higher in
    E major (B''); a coda that ends on F sharp 7 so the loop falls on the intro."""
    bpm = tempo(112)
    beats = 88 * L
    C = Cancion(bpm)
    # Every level 9 dB down so the raw mix peaks under 1.0 (the export normalises the loudness again); the cajón is the loudest voice.
    c = B.voces(C, vol_lead=-14, vol_seg=-11, vol_bajo=-10, vol_rui=-18, duty_lead=0.25)
    c['seg'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.10, 0.5, 0.05), arp_hz=60)
    c['lead3'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.12, 0.35, 0.04), vib=(14, 5.4, 0.2), ataque=(0.6, 0.012))
    m = B.Mapa(beats)
    MENOR, MAYOR = escala('B', 'menor'), escala('D', 'mayor')
    ARM = B.armonica('B')

    CH_IN = ['Bm', 'Bm', 'F#7', 'F#7']
    CH_A = ['Bm', 'G', 'Em', 'F#7', 'Bm', 'G', 'A', 'F#7']
    CH_A2 = CH_A[:7] + ['Bm']
    CH_B = ['D', 'A/C#', 'Bm', 'A', 'G', 'D/F#', 'Em', 'A7']
    CH_B2 = ['D', 'A/C#', 'Bm', 'A', 'G', 'A', 'Bm', 'F#7']
    CH_B3 = ['E', 'B/D#', 'C#m', 'B', 'A', 'E/G#', 'F#m', 'F#7']
    CH_FA = ['Bm', 'C', 'Bm', 'C', 'Bm', 'G', 'A', 'B7']
    CH_C = ['Em', 'Am', 'D', 'G', 'C', 'Am', 'B7', 'Em']
    CH_C2 = ['F#m', 'Bm', 'E', 'A', 'D', 'Bm', 'C#7', 'F#7']
    CH_PU = ['Bm', 'Bm', 'Em', 'F#7']
    CH_SU = ['G', 'A', 'F#7', 'F#7']
    CH_CO = ['Bm', 'G', 'Em', 'F#7']

    INTRO = frase('-:16 | -:12 B5:1 F#6~:3 | C#6:1 F#6:3 C#6:1 F#6:3 C#6:1 F#6:3 A#5:2 C#6:2 | F#6:2 -:2 E6:2 C#6:2 A#5:4 F#5:4')
    A = frase('F#5:2 B5:2 D6:4 -:2 D6:2 C#6:2 B5:2 | B5:3 -:1 G5:2 B5:2 D6:6 -:2 | B5:2 E6:2 G6:4 -:2 F#6:2 E6:2 D6:2 | C#6:3 -:1 A#5:2 C#6:2 F#6:4 -:2 E6:2 |'
              'D6:2 F#6:2 B6:4 -:2 A6:2 F#6:2 D6:2 | B5:2 D6:2 G6:4 -:2 F#6:2 E6:2 D6:2 | C#6:2 E6:2 A6:4 -:2 G6:2 E6:2 C#6:2 | A#5:3 -:1 C#6:2 E6:2 F#6:6 -:2')
    A2 = B.une((B.corta(A, 0, 7), 7), (frase('D6:3 -:1 F#6:2 D6:2 B5:6 -:2'), 1))
    BB = frase('F#6:3 D6:3 A5:2 D6:2 F#6:2 A6:4 | E6:3 C#6:3 A5:2 C#6:2 E6:2 A6:4 | D6:3 B5:3 F#5:2 B5:2 D6:2 F#6:4 | E6:2 -:2 E6:2 -:2 C#6:2 E6:2 A5:4 |'
               'D6:3 B5:3 G5:2 B5:2 D6:2 G6:4 | A5:3 F#5:3 D5:2 F#5:2 A5:2 D6:4 | G5:2 B5:2 E6:4 D6:2 B5:2 G5:4 | A5:1 -:1 A5:1 -:1 C#6:2 E6:2 G6:4 -:4')
    BB2b = frase('B5:3 D6:3 G6:2 E6:2 D6:2 B5:4 | C#6:3 E6:3 A6:2 G6:2 E6:2 C#6:4 | D6:2 F#6:2 B6:4 A6:2 F#6:2 D6:4 | C#6:3 -:1 A#5:2 C#6:2 E6:4 -:4')
    BB2 = B.une((B.corta(BB, 0, 4), 4), (BB2b, 4))
    BB3 = B.une((B.sube(B.corta(BB, 0, 7), 2), 7), (frase('A#5:2 C#6:2 F#6:4 E6:2 C#6:2 F#6:4'), 1))
    FAL = frase('B5:1 C6:1 B5:1 A5:1 B5:1 D6:1 F#6:1 D6:1 B5:4 F#5:2 B5:2 | C6:1 E6:1 G6:1 E6:1 C6:1 E6:1 G6:1 E6:1 G6:2 E6:2 C6:4 |'
                'D6:1 F#6:1 B6:1 F#6:1 D6:1 F#6:1 B6:1 F#6:1 A6:4 F#6:4 | E6:2 G6:2 C7:4 B6:1 C7:1 B6:1 G6:1 E6:4 |'
                'B5:1 D6:1 F#6:1 D6:1 B5:1 D6:1 F#6:1 A6:1 B6:4 -:4 | G6:1 F#6:1 G6:1 D6:1 B5:1 D6:1 G6:1 D6:1 B5:2 D6:2 G6:4 |'
                'A6:1 G6:1 E6:1 C#6:1 E6:1 G6:1 A6:1 C#7:1 A6:4 E6:2 C#6:2 | D#6:2 F#6:2 B6:4 A6:1 F#6:1 D#6:1 F#6:1 B5:4')
    CC1 = frase('G5:2 B5:2 E6:6 -:2 D6:2 B5:2 | C6:2 E6:2 A6:6 -:2 G6:2 E6:2 | D6:2 F#6:2 A6:6 -:2 F#6:2 D6:2 | B5:3 D6:3 G6:2 B6:4 -:2 A6:2 |'
                'C6:3 E6:3 G6:2 E6:2 C6:2 G5:4 | A5:3 C6:3 E6:2 A6:4 G6:2 E6:2 | D#6:3 -:1 F#6:2 A6:4 F#6:2 D#6:2 B5:2 | E6:3 -:1 B5:2 D6:2 E6:4 -:4')
    CC2 = B.une((B.sube(B.corta(CC1, 0, 7), 2), 7), (frase('A#5:2 C#6:2 F#6:4 E6:2 C#6:2 A#5:4'), 1))
    # «¡Ole!» shouts: a short note and a long one gliding up
    PU = B.une((frase('-:16 | -:12 D6:1 A6~:3'), 2), (frase('-:8 B5:1 F#6~:3 B5:1 F#6~:3 | -:8 D6:1 A6~:3 F#6:4'), 2))
    SU = frase('D6:4 B5:4 D6:4 G6:4 | E6:4 C#6:4 E6:4 A6:4 |'
               'C#6:1 F#6:1 C#6:1 F#6:1 C#6:1 F#6:1 C#6:1 F#6:1 A#6:2 F#6:2 C#7:4 | F#6:1 F#6:1 F#6:1 F#6:1 F#6:1 F#6:1 F#6:1 F#6:1 F#6:4 -:4')
    CODA = frase('B6:3 -:1 A6:2 F#6:2 D6:4 F#6:4 | G6:3 -:1 E6:2 D6:2 B5:4 D6:4 | E6:2 G6:2 B6:4 G6:2 E6:2 B5:4 | C#6:2 -:2 A#5:2 C#6:2 F#6:2 -:2 F#6:4')
    for nombre, notas, ch in (('intro', INTRO, CH_IN), ('A', A, CH_A), ('A2', A2, CH_A2), ('B', BB, CH_B), ('B2', BB2, CH_B2), ('B3', BB3, CH_B3),
                              ('falseta', FAL, CH_FA), ('C', CC1, CH_C), ('C2', CC2, CH_C2), ('subida', SU, CH_SU), ('coda', CODA, CH_CO)):
        revisa(f'rumbajuan {nombre}', notas, [[a] for a in ch])

    # Guitar «rasgueo» (x starts a chord) and the bass «tumbao» (3+3+2); the cajón: bass tone on 1, 2-and and 3-and, slap on 2 and 4.
    RAS_A, RAS_B, RAS_C, RAS_D = 'x--x--x-x--x--x-', 'x--x-xx-x--x-xx-', 'x-----x-x-----x-', 'x-x--x-x-x--x-x-'
    BT1, BT2, BT3, BT4, BT5 = '0--0--5-0--5--8-', '0--.0-5.8--.5-3-', '0--0-5--8--5-0--', '0.......0.5.....', '0--0--5-8--5--0-'
    BOMBO, BOMBO2 = 'X.....x...x.....', 'X.....x...x...x.'
    SLAP, SLAP2 = '....x.......X...', '....x.....o.X.o.'
    PAL3, PAL4 = '...x....x..x..x.', '..ox.o.x.o.x.o.x'
    BON = '..o...o..o...o..'
    BASE = [(BOMBO, 'gb_bombo'), (SLAP, 'gb_caja'), (PAL3, 'gb_palma')]

    def ronda(t):
        # Intro: the guitar alone for two bars with soft claps, then the cajón and a call «oé, oé» on the dominant.
        m('Intro (llamada)', t, 4, 'Si menor')
        sacudida(c['seg'], t, CH_IN, RAS_A, desde='A3', vel=74, caida=0.8)
        tocar(c['lead2'], t, INTRO, 98)
        B.bajo(c['bajo'], t + 2 * L, CH_IN[2:], BT1, vel=92)
        B.bat(c['rui'], t, 2, [('....x.......x...', 'gb_palma'), ('..o...o..o...o..', 'gb_bongo_hi')], vel=84, crash=78)
        B.bat(c['rui'], t + 2 * L, 2, BASE, 'caja', vel=94)
        t += 4 * L
        # A: the tune over the strummed guitar and a tumbao bass; the cajón takes the front.
        m('A (tema)', t, 8, 'Si menor')
        tocar(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, RAS_A, desde='A3', vel=78, caida=0.8)
        B.bajo(c['bajo'], t, CH_A, BT1, vel=96)
        B.bat(c['rui'], t, 8, BASE, 'caja', vel=100, crash=84)
        t += 8 * L
        # A': the 50 % twin with mordents; a second voice in thirds replaces the guitar; a bouncing bass and bongos.
        m("A' (segunda voz)", t, 8, 'Si menor')
        tocar(c['lead2'], t, B.mordentes(A2, ARM, 1.0, 2), 102)
        segunda_voz(c['seg3'], t, A2, CH_A2, MENOR, vel=82)
        B.bajo(c['bajo'], t, CH_A2, BT2, vel=98)
        B.bat(c['rui'], t, 8, [(BOMBO2, 'gb_bombo'), (SLAP2, 'gb_caja'), (PAL3, 'gb_palma'), (BON, 'gb_bongo_hi')], 'bongos', vel=100, crash=84)
        t += 8 * L
        # B: the singalong chorus in D over a descending bass (D, C#, B, A, G, F#, E, A), the guitar loud.
        m('B (estribillo, oé oé)', t, 8, 'Re mayor')
        tocar(c['lead2'], t, BB, 102)
        sacudida(c['seg'], t, CH_B, RAS_B, desde='A3', vel=82, caida=0.8)
        B.bajo(c['bajo'], t, CH_B, BT3, vel=100)
        B.bat(c['rui'], t, 8, [(BOMBO, 'gb_bombo'), (SLAP, 'gb_caja'), (PAL3, 'gb_palma'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'toms', vel=104, crash=92)
        t += 8 * L
        # B': the chorus on the 25 % lead with a new second half (G, A, B minor, F sharp 7) and the voices in thirds.
        m("B' (estribillo, final nuevo)", t, 8, 'Re mayor')
        tocar(c['lead'], t, B.mordentes(BB2, MAYOR | {10}, 1.5, 1), 104)
        segunda_voz(c['seg3'], t, BB2, CH_B2, MAYOR | {10}, vel=84)
        B.bajo(c['bajo'], t, CH_B2, [BT3, BT2], vel=100)
        B.bat(c['rui'], t, 8, [('X.....x...x...x.', 'gb_bombo'), ('....x.....o.X.o.', 'gb_caja'), (PAL3, 'gb_palma'), ('..........x.....', 'gb_bongo_hi')], 'tomcaja', vel=104, crash=92)
        t += 8 * L
        # Falseta: a plucked guitar line in B phrygian (C natural, D sharp on the B7); the strum steps back, the cajón stays soft.
        m('Falseta de guitarra', t, 8, 'Si frigio')
        tocar(c['lead3'], t, FAL, 100)
        sacudida(c['seg'], t, CH_FA, RAS_C, desde='A3', vel=66, caida=0.85)
        B.bajo(c['bajo'], t, CH_FA, BT1, vel=94)
        B.bat(c['rui'], t, 8, [('X.......x.......', 'gb_bombo'), ('....o.......x...', 'gb_caja'), ('..x.....x.....x.', 'gb_palma')], 'palmas', vel=90, crash=80)
        t += 8 * L
        # C: a new tune in E minor, long notes that sing, the guitar picks the rhythm and the bongo answers.
        m('C (tema nuevo)', t, 8, 'Mi menor')
        tocar(c['lead'], t, CC1, 102)
        sacudida(c['seg'], t, CH_C, RAS_D, desde='A3', vel=80, caida=0.8)
        B.bajo(c['bajo'], t, CH_C, BT5, vel=98)
        B.bat(c['rui'], t, 8, [(BOMBO2, 'gb_bombo'), (SLAP2, 'gb_caja'), (PAL3, 'gb_palma'), (BON, 'gb_bongo_lo')], 'bongos', vel=100, crash=90)
        t += 8 * L
        # C': the same tune a tone higher in F sharp minor on the 50 % twin; it ends on F sharp 7, the dominant of B.
        m("C' (un tono arriba)", t, 8, 'Fa# menor')
        tocar(c['lead2'], t, CC2, 106)
        sacudida(c['seg3'], t, CH_C2, RAS_A, desde='A3', vel=82, caida=0.8)
        B.bajo(c['bajo'], t, CH_C2, [BT3, BT5], vel=100)
        B.bat(c['rui'], t, 8, [('X...x...X..xx.x.', 'gb_bombo'), (SLAP2, 'gb_caja'), (PAL3, 'gb_palma'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'redoble4', vel=104, crash=96)
        t += 8 * L
        # Bridge: cajón and claps alone, then the bass; the voices shout «¡ole!».
        m('Puente (cajón, palmas y ole)', t, 4, 'Si menor')
        tocar(c['lead2'], t, PU, 100)
        B.bajo(c['bajo'], t + 2 * L, CH_PU[2:], [BT4, '0.......5.5.8...'], vel=100)
        B.bat(c['rui'], t, 1, [('X.....x...x.....', 'gb_bombo'), ('....X.......X...', 'gb_caja'), ('..x.....x.....x.', 'gb_palma')], vel=104, crash=86)
        B.bat(c['rui'], t + L, 1, [('X.....x...x...x.', 'gb_bombo'), ('....X..o..o.X.o.', 'gb_caja'), (PAL4, 'gb_palma')], vel=104)
        B.bat(c['rui'], t + 2 * L, 2, [('X.....x...x...x.', 'gb_bombo'), ('....X..o..o.X.xx', 'gb_caja'), (PAL4, 'gb_palma'), (BON, 'gb_bongo_lo')], 'redoble4', vel=104)
        t += 4 * L
        # Build-up: the strum comes back, claps and a roll climb to the return.
        m('Subida', t, 4, 'Si menor (dominante)')
        tocar(c['lead'], t, SU, 100)
        sacudida(c['seg'], t, CH_SU, RAS_B, desde='A3', vel=74, caida=0.8)
        B.bajo(c['bajo'], t, CH_SU, [BT1, BT3, '0-0-0-0-0-0-0-0-', '0-0-0-0-0-0-0-0-'], vel=98)
        B.bat(c['rui'], t, 2, [('X.....x...x.....', 'gb_bombo'), ('....x.......x...', 'gb_caja'), ('x.x.x.x.x.x.x.x.', 'gb_palma')], vel=100)
        B.bat(c['rui'], t + 2 * L, 1, [('X...X...X...X...', 'gb_bombo'), ('..x...x...x...x.', 'gb_caja')], vel=104)
        redoble(c['rui'], t + 3 * L, 40, 118, 16)
        t += 4 * L
        # A'': the tune on the 25 % lead with mordents, the guitar picks the chords in eighths, a syncopated bass, softer claps.
        m("A'' (guitarra punteada)", t, 8, 'Si menor')
        tocar(c['lead'], t, B.mordentes(A, ARM, 1.0, 1), 104)
        arpegio(c['seg3'], t, CH_A, patron=(0, 2, 1, 2), desde='A3', paso=0.5, dur=0.42, vel=68)
        B.bajo(c['bajo'], t, CH_A, [BT3, BT1], vel=98)
        B.bat(c['rui'], t, 8, [('X.....x...x.....', 'gb_bombo'), ('....x.......X.o.', 'gb_caja'), ('...o....o..o..o.', 'gb_palma'), ('..o...o..o...o..', 'gb_bongo_hi'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'bongos', vel=100, crash=88)
        t += 8 * L
        # B'': the chorus a tone higher in E major with every drum; it lands on F sharp 7 for the coda.
        m("B'' (estribillo, un tono arriba)", t, 8, 'Mi mayor')
        tocar(c['lead2'], t, BB3, 106)
        sacudida(c['seg'], t, CH_B3, RAS_B, desde='B3', vel=84, caida=0.8)
        B.bajo(c['bajo'], t, CH_B3, [BT3, BT5], vel=102)
        B.bat(c['rui'], t, 8, [('X...x...X.x.x.x.', 'gb_bombo'), (SLAP2, 'gb_caja'), (PAL3, 'gb_palma'), (BON, 'gb_bongo_hi'), ('o.o.o.o.o.o.o.o.', 'gb_hat')], 'toms', vel=106, crash=104)
        t += 8 * L
        # Coda: the cadence in four bars, back in B minor, ending on the dominant for the loop.
        m('Coda (enlaza con la intro)', t, 4, 'Si menor')
        tocar(c['lead'], t, CODA, 104)
        sacudida(c['seg'], t, CH_CO, RAS_A, desde='A3', vel=80, caida=0.8)
        B.bajo(c['bajo'], t, CH_CO, BT1, vel=98)
        B.bat(c['rui'], t, 4, BASE, 'redoble4', vel=100, crash=96)
        return t + 4 * L

    return C, ronda, beats, bpm, m


B.CANCIONES['combate-rumbajuan'] = combate_rumbajuan

if __name__ == '__main__':
    B.salir('combate-rumbajuan')
