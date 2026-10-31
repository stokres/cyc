# A summer-hit battle tune for «PokéUsera · Edición Jarra» (La Terraza): the same four-channel chip sound as
# pokeusera_largas_b.py (two pulses, the 16-step wave bass, LFSR noise drums; no reverb, mono), but electronic
# and four on the floor instead of the rumba of `combate-terraza`.
#
#   python3 pokeusera_nueva_verano.py        (the same as: python3 pokeusera_nueva_verano.py combate-verano)
#
# D major / B minor, 126 bpm, 92 bars. Original: the hook, the chorus and the bridge are written for this piece.
import sys
import pokeusera_largas_b as B
from pokeusera_largas_b import sube, corta, une, bat, bajo, voces, Mapa, mordentes
from sinte import Cancion, Inst, frase, tocar, tonos, midi, escala, revisa
from pokeusera import tempo, redoble, sacudida, arpegio, segunda_voz, L


def ohoh(P, t0, acordes, compases, vel=90):
    """The «oh-oh» of the crowd: two falling chord tones, a quaver each, on the last beat of the given bars."""
    for i in compases:
        ts = tonos(acordes[i], 'A5', 'F#6')
        P.nota(t0 + i * L + 3.0, 0.5, ts[-1], vel + 6)
        P.nota(t0 + i * L + 3.5, 0.5, ts[-2], vel)


def palmas_sobre(P, t0, n, relleno=None, vel=92):
    """A clap on beats 2 and 4 laid over the kick (a choice of the mix: the kick keeps its four beats). In the last bar
    of a fill only the claps before the fill's first step are kept."""
    for i in range(n):
        k0 = 16
        if relleno and i == n - 1:
            k0 = {'redoble': 8, 'redoble4': 12}.get(relleno) or B.RELLENOS[relleno][0]
        for k in (4, 12):
            if k < k0:
                P.golpe(t0 + i * L + k / 4, 'gb_palma', vel)


def bat4(P, t0, n, base_, relleno=None, vel=100, crash=0, palmas=True, vpal=78):
    """`bat` plus the claps laid over the kick."""
    bat(P, t0, n, base_, relleno, vel=vel, crash=crash)
    if palmas:
        palmas_sobre(P, t0, n, relleno, vpal)


def combate_verano():
    """D major / B minor, 126 bpm, 92 bars: the summer hit of the beach bar. A hook of five notes that climbs in thirds
    over Bm-G-D-A on a plucked lead; four on the floor, claps on 2 and 4, off-beat hats, a bass that leaps an octave on
    the off-beat. Intro that builds layer by layer; the hook (A) and again with the crowd's «oh-oh» (A'); a build-up with
    a snare roll; the drop with the sung chorus over D-A-Bm-G (B) and again on the plucked lead with a harmony (B');
    a bridge of marimba bounces with bongos (C); a breakdown with only the hook; a second build-up; the big drop (B''); a
    bass-and-claps stop; the last chorus a tone higher in E major (B''') and a coda in which the layers fall away and
    which ends on the dominant so the loop falls back on the intro."""
    bpm = tempo(126)
    beats = 92 * L
    C = Cancion(bpm)
    c = voces(C, vol_lead=-11.5, vol_seg=-10.5, vol_bajo=-7, vol_rui=-20.5, duty_lead=0.25)
    # The marimba: a short plucked pulse; the sung lead; a bright pluck; chord stabs; the crowd.
    c['lead'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.11, 0.16, 0.05), ataque=(1.0, 0.010))
    c['lead2'].inst = Inst('pulso', duty=0.5, adsr=(0.002, 0.14, 0.58, 0.06), vib=(24, 5.8, 0.12))
    c['lead3'].inst = Inst('pulso', duty=0.125, adsr=(0.001, 0.09, 0.14, 0.04), ataque=(1.0, 0.010))
    c['seg'].inst = Inst('pulso', duty=0.25, adsr=(0.001, 0.06, 0.5, 0.03), arp_hz=60)
    c['seg3'].inst = Inst('pulso', duty=0.5, adsr=(0.004, 0.08, 0.7, 0.07), vib=(26, 5.4, 0.1))
    m = Mapa(beats)
    MAYOR, ME = escala('D', 'mayor'), escala('E', 'mayor')
    CH_V = ['Bm', 'G', 'D', 'A'] * 2
    CH_B = ['D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'A']
    CH_C = ['Em', 'A', 'D', 'Bm', 'G', 'A', 'Bm', 'A']
    CH_SU = ['G', 'A', 'G', 'A']
    CH_E = ['E', 'B', 'C#m', 'A', 'E', 'B', 'C#m', 'B']

    # The hook: three notes that climb in thirds, a sigh back down; it follows the chords as they change.
    H = frase('F#5:3 B5:3 D6:2 B5:2 A5:2 F#5:4 | D5:3 G5:3 B5:2 G5:2 F#5:2 D5:4 | F#5:3 A5:3 D6:2 A5:2 F#5:2 A5:4 | E5:3 A5:3 C#6:2 B5:2 A5:2 E5:4')
    HB = frase('F#5:3 B5:3 D6:2 F#6:2 D6:2 B5:4 | D5:3 G5:3 B5:2 D6:2 B5:2 G5:4 | F#5:3 A5:3 D6:2 F#6:2 D6:2 A5:4 | E5:3 A5:3 C#6:2 E6:8')
    HC = frase('F#5:3 B5:3 D6:2 B5:2 A5:2 F#5:4 | D5:3 G5:3 B5:2 G5:2 F#5:2 D5:4 | F#5:3 A5:3 D6:2 A5:2 F#5:2 A5:4 | E5:3 A5:3 C#6:2 E6:2 A6:2 E6:4')
    HV = une((H, 4), (HB, 4))
    HV2 = une((HB, 4), (HC, 4))
    # The chorus (sung): repeated notes and a falling answer; the second half ends on the dominant.
    CH1 = frase('F#6:3 F#6:3 E6:2 D6:3 -:1 A5:2 -:2 | E6:3 E6:3 D6:2 C#6:3 -:1 A5:2 -:2 | D6:3 D6:3 F#6:2 B6:3 -:1 F#6:2 -:2 | B6:3 A6:3 G6:2 D6:4 -:4')
    CH2 = frase('F#6:3 F#6:3 E6:2 D6:3 -:1 A5:2 -:2 | E6:3 E6:3 D6:2 C#6:3 -:1 E6:2 -:2 | D6:3 F#6:3 B6:2 A6:3 -:1 F#6:2 -:2 | E6:2 A5:2 C#6:2 E6:2 A6:4 -:4')
    CH2b = frase('A6:3 F#6:3 D6:2 F#6:3 -:1 A6:2 -:2 | E6:3 C#6:3 A5:2 C#6:3 -:1 E6:2 -:2 | F#6:3 D6:3 B5:2 D6:3 -:1 F#6:2 -:2 | E6:2 A5:2 C#6:2 E6:2 A6:2 E6:2 C#6:2 A5:2')
    CHO = une((CH1, 4), (CH2, 4))
    CHOb = une((CH1, 4), (CH2b, 4))
    # The bridge: bounces of the marimba on the arpeggios, a sequence that climbs.
    CC = frase('B5:2 E6:2 G6:2 E6:2 B5:2 E6:2 G6:4 | A5:2 C#6:2 E6:2 C#6:2 A5:2 C#6:2 E6:4 | A5:2 D6:2 F#6:2 D6:2 A5:2 D6:2 F#6:4 | B5:2 D6:2 F#6:2 D6:2 B5:2 D6:2 F#6:4 |'
               'G5:2 B5:2 D6:2 B5:2 G5:2 B5:2 D6:4 | A5:2 C#6:2 E6:2 A6:2 E6:2 C#6:2 A5:4 | B5:2 D6:2 F#6:2 B6:2 F#6:2 D6:2 B5:4 | E6:2 C#6:2 A5:2 C#6:2 E6:8')
    # The breakdown: only the hook, thin and high, then with a slow answer in the last four bars.
    HBR = une((H, 4), (sube(HB, 12), 4))
    # The build-up: repeated notes, then sixteenths climbing the scale, and a held E7.
    BU = frase('D6:4 D6:4 D6:4 D6:4 | E6:2 E6:2 E6:2 E6:2 E6:2 E6:2 E6:2 E6:2 | B5:1 B5:1 D6:1 D6:1 G6:1 G6:1 B6:1 B6:1 D7:1 D7:1 B6:1 B6:1 G6:1 G6:1 D6:1 D6:1 |'
               'A5:1 B5:1 C#6:1 D6:1 E6:1 F#6:1 G6:1 A6:1 B6:1 C#7:1 D7:1 E7:1 E7:3 -:1')
    BU2 = frase('G6:4 G6:4 G6:4 G6:4 | A6:2 A6:2 A6:2 A6:2 A6:2 A6:2 A6:2 A6:2 | B5:1 D6:1 G6:1 B6:1 D7:1 B6:1 G6:1 D6:1 B5:1 D6:1 G6:1 B6:1 D7:1 G7:1 B6:1 D7:1 |'
                'A5:1 B5:1 C#6:1 D6:1 E6:1 F#6:1 G6:1 A6:1 B6:1 C#7:1 D7:1 E7:1 F#7:3 -:1')
    CODA = frase('F#5:3 B5:3 D6:2 B5:2 A5:2 F#5:4 | D5:3 G5:3 B5:2 G5:2 F#5:2 D5:4 | F#5:3 A5:3 D6:2 A5:2 F#5:2 A5:4 | E5:3 A5:3 C#6:2 B5:2 A5:2 E5:4 |'
                 'F#5:3 B5:3 D6:2 B5:2 A5:2 F#5:4 | D5:3 G5:3 B5:2 G5:2 F#5:2 D5:4 | F#5:3 A5:3 D6:2 A5:2 F#5:2 A5:4 | E5:3 A5:3 C#6:2 E5:3 A5:3 C#6:2')
    for nombre, notas, ch in (('H', H, CH_V[:4]), ('HB', HB, CH_V[:4]), ('HC', HC, CH_V[:4]), ('estribillo', CHO, CH_B), ('estribillo b', CHOb, CH_B),
                              ('puente', CC, CH_C), ('subida', BU, CH_SU), ('subida 2', BU2, CH_SU), ('coda', CODA, CH_V)):
        revisa(f'verano {nombre}', notas, [[a] for a in ch])

    K4 = 'X...x...x...x...'
    K4P = 'X...x...x...x..x'
    K4S = 'X...x...x...x.x.'
    OH = '..x...x...x...x.'
    HS = '.o.o.o.o.o.o.o.o'
    H8 = 'o.o.o.o.o.o.o.o.'
    CL = '....x.......x...'
    ST = '..x...x...x...x.'
    ST_NO = '..x...x...x.....'
    BO = '0.8.0.8.0.8.0.8.'
    BO5 = '0.8.0.8.0.8.5.8.'
    BO_S = '0.8.0.8.0.8.0.5.'
    BSY = '0.80.80.0.80.8.0'
    BRK = '0---------------'

    def ronda(t):
        # Intro: the hook alone over soft off-beat hats; the bass and the claps arrive on bar 5, the kick on bar 7.
        m('Intro (el gancho)', t, 8, 'Re mayor')
        tocar(c['lead'], t, HV, 100)
        arpegio(c['seg2'], t, CH_V[:6], patron=(0, 1, 2, 1), desde='D4', vel=50, dur=0.3, paso=0.5)
        bat(c['rui'], t, 4, [('..o...o...o...o.', 'gb_hat')], vel=84, crash=52)
        bat(c['rui'], t + 4 * L, 2, [(CL, 'gb_palma'), ('..o...o...o...o.', 'gb_hat')], vel=84)
        bat4(c['rui'], t + 6 * L, 2, [(K4, 'gb_bombo'), ('..o...o...o...o.', 'gb_hatab')], 'caja', vel=90, vpal=70)
        bajo(c['bajo'], t + 4 * L, CH_V[4:], [BRK, BRK, BO, BO_S], vel=92, caida=0.9)
        sacudida(c['seg'], t + 6 * L, CH_V[6:], ST, desde='D4', vel=62, caida=0.45)
        t += 8 * L
        # A: the hook on the plucked lead, off-beat stabs, the octave-leaping bass, four on the floor.
        m('A (gancho)', t, 8, 'Re mayor')
        tocar(c['lead'], t, HV, 100)
        sacudida(c['seg'], t, CH_V, ST, desde='D4', vel=68, caida=0.45)
        bajo(c['bajo'], t, CH_V, [BO] * 3 + [BO5, BO, BO, BO_S, BO5], vel=98, caida=0.8)
        bat4(c['rui'], t, 8, [(K4, 'gb_bombo'), (OH, 'gb_hatab'), (HS, 'gb_hat')], 'caja', crash=74, vpal=76)
        t += 8 * L
        # A': the hook on the bright pluck, the crowd answers «oh-oh» in the last beat of every second bar.
        m("A' (oh-oh)", t, 8, 'Re mayor')
        tocar(c['lead3'], t, HV2, 102)
        sacudida(c['seg'], t, CH_V, [ST, ST_NO] * 4, desde='D4', vel=68, caida=0.45)
        ohoh(c['seg3'], t, CH_V, [1, 3, 5, 7], vel=86)
        bajo(c['bajo'], t, CH_V, [BO5, BO, BO, BO_S] * 2, vel=100, caida=0.78)
        bat4(c['rui'], t, 8, [(K4P, 'gb_bombo'), (OH, 'gb_hatab'), (HS, 'gb_hat')], 'toms', vel=100, crash=78, vpal=78)
        t += 8 * L
        # Build-up: the lead repeats and climbs, the snare roll doubles its speed, the bass pumps eighths, and everything stops.
        m('Subida (redoble)', t, 4, 'Re mayor')
        tocar(c['lead'], t, BU, 98)
        sacudida(c['seg'], t, CH_SU, ['x---------------', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'], desde='G3', vel=64, caida=0.5)
        bajo(c['bajo'], t, CH_SU, ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.0.0.....'], vel=96, caida=0.6)
        bat(c['rui'], t, 4, [(['X...x...x...x...', 'X...x...x...x...', 'X.x.x.x.x.x.x.x.', ''], 'gb_bombo'),
                             (['', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxx'], 'gb_caja')], vel=88)
        t += 4 * L
        # Drop B: the sung chorus on the 50 % lead, hat and open hat, the bass leaps on the off-beat; «oh-oh» on the rests.
        m('B (estribillo)', t, 8, 'Re mayor')
        tocar(c['lead2'], t, CHO, 102)
        sacudida(c['seg'], t, CH_B, [ST] * 3 + [ST_NO] + [ST] * 3 + [ST_NO], desde='D4', vel=70, caida=0.45)
        ohoh(c['seg3'], t, CH_B, [3, 7], vel=90)
        bajo(c['bajo'], t, CH_B, [BO] * 3 + [BO5, BO, BO, BO, BO_S], vel=102, caida=0.78)
        bat4(c['rui'], t, 8, [(K4, 'gb_bombo'), (OH, 'gb_hatab'), (HS, 'gb_hat')], 'redoble4', vel=104, crash=82, vpal=84)
        t += 8 * L
        # B': the chorus on the plucked lead with a new second half and the harmony in thirds under it.
        m("B' (estribillo, otra vuelta)", t, 8, 'Re mayor')
        tocar(c['lead'], t, mordentes(CHOb, MAYOR, 0.75, 2), 104)
        segunda_voz(c['seg3'], t, CHOb, CH_B, MAYOR, vel=76)
        bajo(c['bajo'], t, CH_B, [BO5, BO, BO, BO_S, BO5, BO, BO, BSY], vel=102, caida=0.78)
        bat4(c['rui'], t, 8, [(K4S, 'gb_bombo'), (OH, 'gb_hatab'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'toms', vel=104, crash=78, vpal=74)
        t += 8 * L
        # Bridge: marimba bounces with bongos and a bouncing bass; the kick keeps its four beats, the claps are softer.
        m('Puente (marimba y bongos)', t, 8, 'Mi menor / La')
        tocar(c['lead3'], t, CC, 100)
        sacudida(c['seg'], t, CH_C[:4], ['x.x.x.x.x.x.x.x.', '..x...x...x...x.'] * 2, desde='E4', vel=60, caida=0.5)
        sacudida(c['seg'], t + 4 * L, CH_C[4:], ['x.x.x.x.x.x.x.x.'] * 4, desde='D4', vel=60, caida=0.5)
        bajo(c['bajo'], t, CH_C, ['0..0..0.0..0..8.', '0..0..0.0..0.5.8'] * 3 + ['0..0..0.0..0..8.', BO_S], vel=98, caida=0.8)
        bat(c['rui'], t, 8, [('X...x...x...x...', 'gb_bombo'), ('..........x.....', 'gb_bongo_lo'), ('.o..o..o.o..o...', 'gb_bongo_hi'), (OH, 'gb_hat')], 'bongos', vel=96, crash=70)
        t += 8 * L
        # Breakdown: no kick, no bass: the hook alone (then an octave up) over soft broken chords and a fading hat.
        m('Caída (solo el gancho)', t, 8, 'Re mayor')
        tocar(c['lead'], t, H, 92)
        tocar(c['lead3'], t + 4 * L, sube(HB, 12), 86)
        arpegio(c['seg2'], t + 4 * L, CH_V[4:], patron=(0, 1, 2, 1), desde='D4', vel=44, dur=0.3, paso=0.5)
        bajo(c['bajo'], t, CH_V[:4], [BRK] * 4, vel=84, caida=0.96)
        bat(c['rui'], t, 4, [('..o...o...o...o.', 'gb_hat')], vel=72)
        bat(c['rui'], t + 4 * L, 3, [(CL, 'gb_palma'), ('..o...o...o...o.', 'gb_hat')], vel=76)
        redoble(c['rui'], t + 7 * L + 1, 40, 108, 12, 'gb_hat')
        t += 8 * L
        # Second build-up: higher, the same roll, the lead on the bright pluck.
        m('Subida 2 (redoble)', t, 4, 'Re mayor')
        tocar(c['lead3'], t, BU2, 98)
        sacudida(c['seg'], t, CH_SU, ['x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxx', 'xxxxxxxxxxxx....'], desde='G3', vel=66, caida=0.5)
        bajo(c['bajo'], t, CH_SU, ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.0.0.....'], vel=98, caida=0.6)
        bat(c['rui'], t, 4, [(['X...x...x...x...', 'X...x...x...x...', 'X.x.x.x.x.x.x.x.', ''], 'gb_bombo'),
                             (['....x.......x...', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxx'], 'gb_caja')], vel=92, crash=78)
        t += 4 * L
        # Drop B2: the big chorus, the 50 % lead with the harmony in thirds, the oh-oh on the rests, every drum.
        m("B'' (estribillo grande)", t, 8, 'Re mayor')
        tocar(c['lead2'], t, CHO, 106)
        segunda_voz(c['seg3'], t, CHO, CH_B, MAYOR, vel=76)
        ohoh(c['seg2'], t, CH_B, [3, 7], vel=92)
        bajo(c['bajo'], t, CH_B, [BO5, BO, BO, BSY, BO5, BO, BO5, BO_S], vel=104, caida=0.78)
        bat4(c['rui'], t, 8, [('X...x...x...x..x', 'gb_bombo'), (OH, 'gb_hatab'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'caja', vel=106, crash=82, vpal=86)
        t += 8 * L
        # Stop: the bass and the claps alone, the hook comes back on the bright pluck in the last two bars.
        m('Parada (bajo y palmas)', t, 4, 'Re mayor')
        bajo(c['bajo'], t, CH_V[:4], [BO, BO5, BO, BSY], vel=102, caida=0.78)
        tocar(c['lead3'], t + 2 * L, corta(HC, 2, 4), 98)
        bat(c['rui'], t, 4, [(['....x.......x...'] * 2 + ['x...x...x...x...'] * 2, 'gb_palma'), ('..........x.....', 'gb_bongo_lo'),
                             ('..o...o...o...o.', 'gb_hat')], 'redoble4', vel=96, crash=82)
        t += 4 * L
        # Drop B3: the last chorus a tone higher in E major, every layer; it lands on B, the dominant.
        m("B''' (estribillo, un tono arriba)", t, 8, 'Mi mayor')
        tocar(c['lead2'], t, sube(CHO, 2), 108)
        segunda_voz(c['seg3'], t, sube(CHO, 2), CH_E, ME, vel=78)
        ohoh(c['seg2'], t, CH_E, [3, 7], vel=94)
        bajo(c['bajo'], t, CH_E, [BO5, BO, BO, BSY] * 2, vel=104, caida=0.78)
        bat4(c['rui'], t, 8, [('X...x...x...x.x.', 'gb_bombo'), (OH, 'gb_hatab'), ('x.x.x.x.x.x.x.x.', 'gb_hat')], 'redoble', vel=108, crash=82, vpal=88)
        t += 8 * L
        # Coda: back in D, the hook for the last time; the claps go, then the kick, until only hats are left, as in the intro.
        m('Coda (enlaza con la intro)', t, 8, 'Re mayor')
        tocar(c['lead'], t, CODA, 100)
        sacudida(c['seg'], t, CH_V[:6], ST, desde='D4', vel=66, caida=0.45)
        bajo(c['bajo'], t, CH_V[:6], [BO, BO5, BO, BO_S, BO, BO5], vel=98, caida=0.8)
        bajo(c['bajo'], t + 6 * L, CH_V[6:], [BO, '0.8.0.8.0.8.....'], vel=92, caida=0.8)
        bat4(c['rui'], t, 4, [(K4, 'gb_bombo'), (OH, 'gb_hatab'), (HS, 'gb_hat')], crash=78, vpal=74)
        bat(c['rui'], t + 4 * L, 2, [(K4, 'gb_bombo'), (OH, 'gb_hat')], 'caja', vel=88)
        bat(c['rui'], t + 6 * L, 2, [('..o...o...o...o.', 'gb_hat')], vel=84)
        return t + 8 * L

    return C, ronda, beats, bpm, m


B.CANCIONES['combate-verano'] = combate_verano

if __name__ == '__main__':
    B.salir('combate-verano')
