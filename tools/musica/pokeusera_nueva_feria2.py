# «Bocinazo en la feria» (battle tune for La Feria, second one): hard 90s eurodance in F sharp minor, 148 bpm, 108 bars.
# The same four-channel chip sound as pokeusera_largas_b.py (two pulses, a 16-step wave bass, LFSR noise drums; no reverb,
# no echo, mono) but with a very heavy bass, a kick on every beat, rave piano stabs, a catchy lead hook and HORNS as part of
# the rhythm and of the hook: a car horn (two tones), a truck air horn and a clown's bulb horn, all made of pulse voices
# with slides, vibrato and the chip arpeggio, plus a noise «pssht» of air.
#
#   python3 pokeusera_nueva_feria2.py     (from tools/musica)  ->  src/sonido/pokeusera-combate-feria2.mp3
#
# Sections: intro with an air-horn blast; the hook (A) with the car horn answering; the hook on the 50 % twin with a second
# voice and an air-horn bass line (A'); a chopped verse; a build-up; the sing-along chorus (B); a breakdown with a sad
# tune; a second build-up; the drop (the hook on a wobbling pulse with air-horn stabs); the chorus again; «El atasco», a
# half-time bridge in B minor where the horns talk to each other; a bass tumbao; a build-up a tone higher; the chorus and
# the last hook in G sharp minor; an outro that falls back into F sharp minor so the loop lands on its own beginning.
import sys
import numpy as np
import sinte
from sinte import Cancion, Inst, SR, frase, tocar, tonos, escala, midi, revisa, bajo_de
import pokeusera as base
from pokeusera import tempo, redoble, verifica, sacudida, arpegio, segunda_voz, L
import pokeusera_largas_b as B
from pokeusera_largas_b import sube, corta, une, armonica, mordentes, bajo, bat, Mapa


# --- Sounds ---------------------------------------------------------------------------------------
# A wave-RAM bass with a lot of mid harmonics so that a phone's small speaker plays it: a sawtooth-like table of 32 samples
# at 16 levels (the console's wave channel is 4 bit), built from the first nine harmonics.
_x = np.arange(32) / 32
_t = sum(np.sin(2 * np.pi * k * _x + ph) / k ** 0.85 for k, ph in ((1, 0.0), (2, 0.4), (3, 0.9), (4, 1.3), (5, 1.7), (6, 2.1), (7, 2.5), (8, 2.8), (9, 3.1)))
_t = _t / np.max(np.abs(_t))
TABLA = np.round((_t + 1) / 2 * 15) / 15 - 0.5
_sonar_antes = sinte.sonar


def sonar_eu(inst, dur, m, vel, desde=None, deslizar=None, arp=None):
    if inst.forma != 'onda16':
        return _sonar_antes(inst, dur, m, vel, desde, deslizar, arp)
    nm = int((dur + inst.cola) * SR) + 1
    t = np.arange(nm) / SR
    tono = np.full(nm, float(m + 12 * inst.oct))
    if desde is not None:
        u = np.clip(t / max(deslizar or inst.glide or 0.04, 1e-3), 0, 1)
        tono = desde + 12 * inst.oct + (tono - desde - 12 * inst.oct) * (1 - (1 - u) ** 2)
    fase, _ = sinte._fase(sinte.hz(tono))
    w = np.interp(fase, np.append(_x, 1.0), np.append(TABLA, TABLA[0]))
    e = sinte.envolvente(nm, dur, *inst.adsr) * (vel / 127) ** inst.curva_vel
    return w * e, w * e


sinte.sonar = sonar_eu

# Noise-channel sounds on top of the kit that is already installed (pokeusera.py's, then the fair's sparks): a heavier kick
# (the register's clock falls to a low rumble) and the hiss of an air horn's valve letting go.
_golpe_antes = sinte.golpe


def golpe_feria2(tipo, vel, semilla=0):
    a = (vel / 127) ** 1.3
    if tipo == 'gb_bombo_eu':
        nm = int(0.21 * SR)
        w = base._lfsr_gb(nm, 9000, 130, 0.045, semilla=semilla)
        w = sinte._filtro(w, 'lowpass', 1150) * 3.0 * base._env4(nm, 0.085)
    elif tipo == 'gb_aire':
        nm = int(0.55 * SR)
        w = base._lfsr_gb(nm, 40000, 26000, 0.2, semilla=semilla)
        w = sinte._filtro(w, 'highpass', 1500, 2) * 1.5 * base._env4(nm, 0.2, 0.01)
    elif tipo in ('gb_hat+', 'gb_hatab+'):  # the hats a little louder than the kit's, to keep the highs bright on a phone
        return _golpe_antes(tipo[:-1], vel, semilla) * 1.8
    else:
        return _golpe_antes(tipo, vel, semilla)
    k = min(48, len(w))
    w[-k:] *= np.linspace(1, 0, k)
    return w * a


sinte.golpe = golpe_feria2


# --- The tune -------------------------------------------------------------------------------------
TRIM = -6.0  # dB taken off every track so that the mix never passes 1.0 before the loudness is normalised


def combate_feria2():
    bpm = tempo(148)
    beats = 108 * L
    C = Cancion(bpm)
    s_beat = 60.0 / bpm
    m = Mapa(beats)
    c = {}

    def pista(clave, nombre, inst, vol):
        c[clave] = C.pista(nombre, inst, vol=vol + TRIM, reverb=0)

    v = dict(vib=(20, 6.2, 0.16))
    # Pulse 1 («lead ...») and its twins.
    pista('lead', 'lead 25%', Inst('pulso', duty=0.25, adsr=(0.002, 0.14, 0.7, 0.05), **v), -4)
    pista('lead2', 'lead 50%', Inst('pulso', duty=0.5, adsr=(0.002, 0.10, 0.65, 0.05), **v), -6)
    pista('lead3', 'lead 12.5%', Inst('pulso', duty=0.125, adsr=(0.001, 0.09, 0.5, 0.04), vib=(14, 6.4, 0.2)), -5)
    pista('pwm', 'lead pwm', Inst('pulso', duty=0.3, pwm=(0.17, 3.3), adsr=(0.002, 0.12, 0.7, 0.05), vib=(14, 6.0, 0.2)), -4)
    pista('coro', 'lead coro', Inst('pulso', duty=0.5, pwm=(0.1, 2.3), adsr=(0.012, 0.2, 0.78, 0.1), vib=(26, 5.4, 0.18)), -5)
    # The horns: a car horn (two tones by the chip arpeggio), a truck's air horn (the wave of sinte.py with a chord by the
    # arpeggio) and a clown's bulb horn (a nasal 12.5 % pulse that bends up into each note). One set for each pulse.
    for p, pref in (('', 'lead'), ('2', 'pulso 2')):
        pista('claxon' + p, f'{pref} claxon', Inst('pulso', duty=0.35, adsr=(0.004, 0.05, 0.9, 0.04), ataque=(-1.2, 0.035), arp_hz=110), -5)
        pista('aire' + p, f'{pref} aire', Inst('bocina', adsr=(0.008, 0.1, 0.85, 0.1), ataque=(-1.6, 0.06), vib=(16, 5.6, 0.15), arp_hz=100), -6)
        pista('payaso' + p, f'{pref} payaso', Inst('pulso', duty=0.15, adsr=(0.003, 0.07, 0.6, 0.05), ataque=(-3.5, 0.05), vib=(30, 7.5, 0.05)), -5)
    # Pulse 2 («pulso 2 ...»).
    pista('piano', 'pulso 2 piano', Inst('pulso', duty=0.25, adsr=(0.001, 0.12, 0.2, 0.05), arp_hz=72), -7)
    pista('seg', 'pulso 2 12.5%', Inst('pulso', duty=0.125, adsr=(0.001, 0.07, 0.6, 0.03), arp_hz=60), -10)
    pista('seg3', 'pulso 2 coro', Inst('pulso', duty=0.5, pwm=(0.1, 2.3), adsr=(0.012, 0.2, 0.75, 0.1), vib=(26, 5.4, 0.18)), -8)
    pista('bajo', 'onda (bajo)', Inst('onda16', adsr=(0.002, 0.07, 0.9, 0.02)), 4)
    pista('rui', 'ruido', None, -13)

    # --- Horn helpers ------------------------------------------------------------------------------
    def acorde_arp(ch, desde):
        ts = tonos(ch, desde, midi(desde) + 11)
        return ts[0], tuple([x - ts[0] for x in ts] + [12])

    def claxon(P, t0, dur, ch, vel=106):
        """Two tones a third to a fourth apart, as a car horn."""
        ts = tonos(ch, 'G4', 'G5')
        lo = ts[0]
        hi = next((x for x in ts[1:] if 3 <= x - lo <= 6), ts[1])
        P.nota(t0, dur, lo, vel, arp=(0, hi - lo))

    def aire(P, t0, dur, ch, vel=112, desde='D4'):
        """A truck's air horn: the whole chord blown at once."""
        r, offs = acorde_arp(ch, desde)
        P.nota(t0, dur, r, vel, arp=offs)

    def payaso(P, t0, dur, ch, vel=104, alto=0):
        ts = tonos(ch, 'C5', 'B5')
        P.nota(t0, dur, ts[min(alto, len(ts) - 1)], vel)

    def cae(P, t0, dur, ch, vel=108):
        """The air horn dives: one note sliding down ten semitones."""
        r = bajo_de(ch, 4)
        P.nota(t0, dur, r, vel, desde=r + 10, deslizar=dur * s_beat * 0.9)

    def sube_zap(P, t0, dur, desde, hasta, vel=100):
        P.nota(t0, dur, hasta, vel, desde=desde, deslizar=dur * s_beat * 0.95)

    def resp(t, compas, tipo, ch, vel=108):
        """The horns' answer in the last beat of a bar where the tune rests (pulse 1)."""
        b0 = t + compas * L + 3.0
        if tipo == 'claxon':
            claxon(c['claxon'], b0, 0.4, ch, vel)
            claxon(c['claxon'], b0 + 0.5, 0.5, ch, vel + 4)
        elif tipo == 'claxon3':
            claxon(c['claxon'], b0, 0.2, ch, vel)
            claxon(c['claxon'], b0 + 0.25, 0.2, ch, vel)
            claxon(c['claxon'], b0 + 0.5, 0.5, ch, vel + 6)
        elif tipo == 'aire':
            aire(c['aire'], b0, 1.0, ch, vel + 4)
        elif tipo == 'payaso':
            payaso(c['payaso'], b0, 0.4, ch, vel, alto=1)
            payaso(c['payaso'], b0 + 0.5, 0.5, ch, vel, alto=2)

    def horn_stabs(clave, t0, acordes, patron, desde='D4', vel=104):
        """Chord stabs of a horn (pulse 2) in the pattern's rhythm: x starts a stab, - holds it."""
        sacudida(c[clave], t0, acordes, patron, desde=desde, vel=vel, caida=0.8)

    # --- Tunes -------------------------------------------------------------------------------------
    MENOR, ARM = escala('F#', 'menor'), armonica('F#')
    CH_A = ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'E', 'C#7']
    CH_V = ['F#m', 'F#m', 'D', 'E', 'F#m', 'F#m', 'Bm', 'C#7']
    CH_B = ['D', 'A', 'E', 'F#m', 'D', 'A', 'Bm', 'C#7']
    CH_BD = ['Bm', 'F#m', 'D', 'E', 'Bm', 'F#m', 'Bm', 'E']
    CH_BU = ['Bm', 'D', 'E', 'C#7']
    CH_AT = ['Bm', 'Bm', 'G', 'A', 'Bm', 'Bm', 'D', 'C#7']
    CH_TU = ['F#m', 'F#m', 'D', 'C#7']
    CH_BU2 = ['G#m', 'E', 'F#', 'D#7']
    CH_A2 = ['G#m', 'E', 'B', 'F#', 'G#m', 'E', 'F#', 'D#7']
    CH_B2 = ['E', 'B', 'F#', 'G#m', 'E', 'B', 'C#m', 'D#7']
    CH_OU = ['E', 'D', 'E', 'C#7']
    A = frase('A5:2 C#6:2 -:2 C#6:2 F#6:4 E6:2 C#6:2 | D6:2 F#6:2 -:2 F#6:2 A6:4 -:4 | E6:2 A6:2 -:2 A6:2 C#7:4 B6:2 A6:2 | G#6:2 B6:2 -:2 B6:2 E7:4 -:4 |'
              'C#7:2 B6:2 A6:2 F#6:2 A6:4 C#7:4 | A6:2 F#6:2 D6:2 F#6:2 A6:4 -:4 | B6:2 G#6:2 E6:2 G#6:2 B6:4 E7:4 | G#6:2 B6:2 C#7:4 B6:2 G#6:2 F6:2 G#6:2', oct=-1)
    V = frase('F#5:1 -:1 F#5:1 -:1 A5:2 -:2 F#5:2 C#6:2 A5:2 F#5:2 | F#5:1 -:1 F#5:1 -:1 A5:2 -:2 C#6:2 E6:2 C#6:4 |'
              'D5:1 -:1 D5:1 -:1 F#5:2 -:2 D5:2 A5:2 F#5:2 D5:2 | E5:1 -:1 E5:1 -:1 G#5:2 -:2 B5:2 G#5:2 E6:4 |'
              'F#5:1 -:1 F#5:1 -:1 A5:2 -:2 F#5:2 A5:2 C#6:2 E6:2 | F#5:1 -:1 F#5:1 -:1 C#6:2 -:2 A5:2 F#5:2 A5:2 C#6:2 |'
              'B4:1 -:1 B4:1 -:1 D5:2 -:2 F#5:2 B5:2 D6:2 B5:2 | C#6:2 -:2 G#5:2 B5:2 C#6:4 F6:2 G#5:2')
    BU = frase('D5:16 | F#5:8 A5:8 | B5:8 E6:8 | C#6:4 F6:4 G#6:4 B6:4')
    B_ = frase('A6:6 F#6:2 A6:4 D7:4 | C#7:6 A6:2 C#7:4 E7:4 | B6:6 G#6:2 B6:4 E7:4 | F#7:6 E7:2 C#7:4 A6:4 |'
               'D7:6 A6:2 F#6:4 A6:4 | E7:6 C#7:2 A6:4 C#7:4 | D7:4 B6:4 F#6:4 B6:4 | C#7:2 F7:2 G#7:2 F7:2 C#7:4 -:4', oct=-1)
    BD = frase('D6:4 B5:4 F#5:8 | C#6:4 A5:4 F#5:4 -:4 | A5:4 F#5:4 D6:8 | G#5:4 B5:4 E6:4 -:4 |'
               'D6:4 B5:4 F#5:4 B5:4 | C#6:4 A5:4 F#5:4 A5:4 | B5:4 D6:4 F#6:4 D6:4 | G#6:8 E6:4 -:4')
    AT = frase('B4:3 B4:3 D5:2 -:2 F#5:2 D5:2 B4:2 | B4:3 B4:3 D5:2 -:2 F#5:6 | G4:3 G4:3 B4:2 -:2 D5:2 B4:2 G4:2 | A4:3 A4:3 C#5:2 -:2 E5:6 |'
               'B4:3 B4:3 D5:2 -:2 F#5:2 B5:2 D6:2 | B5:3 A5:3 F#5:2 -:2 D5:6 | D5:3 D5:3 F#5:2 -:2 A5:2 F#5:2 D5:2 | C#5:2 F5:2 G#5:2 B5:2 C#6:4 -:4')
    BU2 = frase('G#5:16 | B5:8 E6:8 | C#6:8 F#6:8 | D#6:4 G6:4 A#6:4 C#7:4')
    A2 = sube(A, 2)
    B2 = sube(B_, 2)
    OUT = frase('B5:4 G#5:4 E5:8 | A5:4 F#5:4 D5:8 | G#5:4 B5:4 E6:4 -:4 | C#6:2 F6:2 G#6:4 -:8', oct=0)
    for nombre, notas, ch in (('A', A, CH_A), ('V', V, CH_V), ('BU', BU, CH_BU), ('B', B_, CH_B), ('BD', BD, CH_BD), ('AT', AT, CH_AT),
                              ('BU2', BU2, CH_BU2), ('A+2', A2, CH_A2), ('B+2', B2, CH_B2), ('OUT', OUT, CH_OU)):
        revisa(f'feria2 {nombre}', notas, [[a] for a in ch])

    # --- Rhythms ------------------------------------------------------------------------------------
    K4, CLAP, SN, HAT8, HAT16 = 'X...X...X...X...', '....x.......x...', '....X.......X..x', '..x...x...x...x.', '.o.o.o.o.o.o.o.o'
    BO1, BO2, BO3 = '..0-..0-..0-..0-', '..0-..8-..0-..8-', '..0-.0..8-..0-8-'
    BR1, BR2 = '.0.0.0.0.0.0.0.0', '.0.0.8.0.0.0.8.0'
    BS = '0---------------'
    PI1, PI2, PI3 = 'x..x..x.x..x..x.', '..x...x...x...x.', 'x..x..x...x...x.'
    BASE_ = [(K4, 'gb_bombo_eu'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab+'), (HAT16, 'gb_hat+')]
    FULL = [(K4, 'gb_bombo_eu'), (SN, 'gb_caja'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab+'), (HAT16, 'gb_hat+')]

    def ronda(t):
        # Intro: an air-horn blast that falls (and a hiss of air), the kick comes in, then the bass and the rave piano; the hook
        # shows its first four bars on the 50 % lead with the car horn answering.
        m('Intro (bocina de aire)', t, 8, 'Fa# menor')
        aire(c['aire'], t, 6.0, 'F#m', 116)
        cae(c['aire'], t + 6.0, 1.9, 'F#m', 112)
        c['rui'].golpe(t, 'gb_crash', 100)
        c['rui'].golpe(t + 7.4, 'gb_aire', 84)
        bat(c['rui'], t + 2 * L, 2, [(K4, 'gb_bombo_eu'), (HAT8, 'gb_hatab+')], vel=96)
        bat(c['rui'], t + 4 * L, 4, [(K4, 'gb_bombo_eu'), (CLAP, 'gb_palma'), (HAT8, 'gb_hatab+'), (HAT16, 'gb_hat+')], 'redoble4', vel=98)
        bajo(c['bajo'], t + 2 * L, ['F#m'] * 6, [BO1, BO1, BO1, BO1, BO2, BO2], vel=96, oct=2)
        sacudida(c['piano'], t + 2 * L, ['F#m', 'F#m', 'F#m', 'D', 'A', 'E'], [PI2, PI2, PI1, PI1, PI3, PI3], desde='A3', vel=82, caida=0.8)
        tocar(c['lead2'], t + 4 * L, corta(A, 0, 4), 98)
        resp(t + 4 * L, 1, 'claxon', 'D')
        resp(t + 4 * L, 3, 'aire', 'E')
        t += 8 * L
        # A: the hook on the 25 % lead with rave piano stabs; the car horn, the air horn and the clown answer where it rests.
        m('A (gancho)', t, 8, 'Fa# menor')
        tocar(c['lead'], t, A, 104)
        sacudida(c['piano'], t, CH_A, [PI1, PI1, PI1, PI3], desde='A3', vel=84, caida=0.8)
        bajo(c['bajo'], t, CH_A, [BO2, BO2, BO2, BO3], vel=100, oct=2)
        bat(c['rui'], t, 8, BASE_, 'redoble4', vel=100, crash=100)
        resp(t, 1, 'claxon', 'D')
        resp(t, 3, 'aire', 'E')
        resp(t, 5, 'payaso', 'D')
        t += 8 * L
        # A': the hook on the 50 % twin with mordents and a choir in thirds.
        m("A' (coro en terceras)", t, 8, 'Fa# menor')
        tocar(c['lead2'], t, mordentes(A, ARM, 1.0, 2), 104)
        segunda_voz(c['seg3'], t, A, CH_A, MENOR, vel=82)
        bajo(c['bajo'], t, CH_A, [BO2, BO2, BO2, BO3, BO2, BO2, BO2, BR2], vel=102, oct=2)
        bat(c['rui'], t, 8, FULL, 'toms', vel=100, crash=100)
        resp(t, 1, 'claxon3', 'D')
        resp(t, 3, 'payaso', 'E')
        resp(t, 5, 'claxon', 'D')
        t += 8 * L
        # Verse: a chopped little tune on the 12.5 % lead, the clown horn honking on the piano's rests, the bass rolling.
        m('Estrofa (picada)', t, 8, 'Fa# menor')
        tocar(c['lead3'], t, V, 98)
        sacudida(c['piano'], t, CH_V, ['x...............', '................'], desde='A3', vel=78, caida=0.9)
        bajo(c['bajo'], t, CH_V, [BR1, BR1, BR1, BR1, BR1, BR1, BR2, BR2], vel=102, oct=2)
        bat(c['rui'], t, 8, [(K4, 'gb_bombo_eu'), (CLAP, 'gb_caja'), (HAT8, 'gb_hatab+'), (HAT16, 'gb_hat+')], 'caja', vel=100, crash=92)
        for k in (1, 3, 5):
            payaso(c['payaso2'], t + k * L + 3.0, 0.4, CH_V[k], 100, alto=1)
            payaso(c['payaso2'], t + k * L + 3.5, 0.5, CH_V[k], 100, alto=2)
        t += 8 * L
        # Build-up: the lead climbs, the air horn stabs speed up and the snare doubles, then a beat of silence.
        m('Subida (bocinas aceleran)', t, 4, 'Si menor')
        tocar(c['lead3'], t, BU, 98)
        horn_stabs('aire2', t, CH_BU, ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='D4', vel=100)
        bajo(c['bajo'], t, CH_BU, [BO1, BO1, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=100, oct=2)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo_eu'), (['', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=98)
        t += 4 * L
        # B: the sing-along chorus on the choir voice, D, A, E, F sharp minor; the second voice in the first half and air-horn stabs
        # in the second.
        m('B (estribillo)', t, 8, 'Fa# menor')
        tocar(c['coro'], t, B_, 106)
        segunda_voz(c['seg3'], t, corta(B_, 0, 4), CH_B[:4], MENOR, vel=84)
        horn_stabs('aire2', t + 4 * L, CH_B[4:], [PI1, PI1, PI1, 'x..x..x.x.x.x.x.'], desde='D4', vel=96)
        bajo(c['bajo'], t, CH_B, [BO2, BO2, BO2, BO3, BR2, BR2, BR2, BR2], vel=104, oct=2)
        bat(c['rui'], t, 8, FULL, 'redoble4', vel=102, crash=110)
        resp(t, 7, 'aire', 'C#7', 110)
        t += 8 * L
        # Breakdown: no kick, the sad tune on the 50 % lead, piano arpeggios, a sub bass; far-off honks on the rests.
        m('Puente (la cola de coches)', t, 8, 'Si menor')
        tocar(c['lead2'], t, BD, 94)
        arpegio(c['seg'], t, CH_BD, patron=(0, 1, 2, 3, 2, 1), desde='A3', vel=62, dur=0.2)
        bajo(c['bajo'], t, CH_BD, [BS, BS, BS, BS, BS, BS, BS, BS], vel=90, oct=2, caida=0.95)
        bat(c['rui'], t, 6, [('o.o.o.o.o.o.o.o.', 'gb_hat+')], vel=84, crash=84)
        bat(c['rui'], t + 6 * L, 2, [('....x.......x...', 'gb_caja'), ('o.o.o.o.o.o.o.o.', 'gb_hat+')], 'redoble', vel=90)
        resp(t, 1, 'claxon', 'F#m', 92)
        resp(t, 3, 'payaso', 'E', 92)
        resp(t, 7, 'aire', 'E', 96)
        t += 8 * L
        # Second build-up (F sharp minor again) into the drop.
        m('Subida 2 (redoble)', t, 4, 'Fa# menor')
        sube_zap(c['payaso'], t, 15.0, 'F#4', 'F#6', 100)
        horn_stabs('aire2', t, ['F#m', 'D', 'E', 'C#7'], ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='D4', vel=100)
        bajo(c['bajo'], t, ['F#m', 'D', 'E', 'C#7'], [BO1, BO2, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=102, oct=2)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo_eu'), (['', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=100)
        t += 4 * L
        # Drop: the hook on the wobbling pulse, air-horn stabs in the 3+3+2 rhythm, the bass rolling, the answers louder.
        m('Drop (gancho ondulante)', t, 8, 'Fa# menor')
        c['rui'].golpe(t, 'gb_crash', 118)
        tocar(c['pwm'], t, A, 108)
        horn_stabs('aire2', t, CH_A, [PI1, PI1, PI1, PI3], desde='D4', vel=104)
        bajo(c['bajo'], t, CH_A, [BR2, BR1, BR2, BR1, BR2, BR1, BR2, BO2], vel=106, oct=2)
        bat(c['rui'], t, 8, FULL, 'redoble4', vel=104)
        resp(t, 1, 'aire', 'D', 112)
        resp(t, 3, 'claxon3', 'E', 110)
        resp(t, 5, 'payaso', 'D', 110)
        t += 8 * L
        # B': the chorus again on the 50 % voice with mordents; the car horn beeps the chords on the off-beats as a rhythm guitar.
        m("B' (estribillo, claxon a contratiempo)", t, 8, 'Fa# menor')
        tocar(c['lead2'], t, mordentes(B_, ARM, 1.5, 1), 108)
        horn_stabs('claxon2', t, CH_B, ['..x...x...x...x.', '..x...x...x...x.', '..x...x...x...x.', '..x...x...x..xxx'], desde='A3', vel=100)
        bajo(c['bajo'], t, CH_B, [BR2, BR1, BR2, BR1, BR2, BR1, BR2, BR2], vel=106, oct=2)
        bat(c['rui'], t, 8, FULL, 'toms', vel=104, crash=112)
        t += 8 * L
        # El atasco: half time in B minor. The car horn plays a little honk tune, the air horn hits the chords on one and three,
        # and the clown fills each rest of the tune; the bass thuds under them all.
        m('El atasco (bocinas a medio tiempo)', t, 8, 'Si menor')
        c['rui'].golpe(t, 'gb_aire', 90)
        for b, d, mm, *_ in AT:
            ch = CH_AT[int(b // L)]
            hi = next((x for x in tonos(ch, mm, mm + 9) if x - mm >= 3), mm + 4)
            c['claxon'].nota(t + b, d, mm, 106 + (6 if b % 1 == 0 else 0), arp=(0, hi - mm))
        notas = [(b, d) for b, d, *_ in AT]
        for (b0, d0), (b1, d1) in zip(notas, notas[1:]):
            if b1 - (b0 + d0) >= 0.5:
                payaso(c['payaso2'], t + b0 + d0, b1 - (b0 + d0) - 0.05, CH_AT[int(b0 // L)], 104, alto=1)
        horn_stabs('aire2', t, CH_AT, ['x---......x---..'], desde='D4', vel=100)
        bajo(c['bajo'], t, CH_AT, ['0-----..0---0-8-', '0-----..0---0-0-', '0-----..0---0-8-', '0-----..0---0-0-'], vel=106, oct=2)
        bat(c['rui'], t, 8, [('X.....x.X.......', 'gb_bombo_eu'), ('........x.......', 'gb_palma'), (HAT8, 'gb_hatab+'), (HAT16, 'gb_hat+')], 'toms', vel=102, crash=96)
        t += 8 * L
        # Tumbao: bass, kick and percussion; the clown and the car horn tap a rhythm and the piano comps.
        m('Tumbao (bajo y bocinas)', t, 4, 'Fa# menor')
        bajo(c['bajo'], t, CH_TU, ['0-..0-..0-0-..8-', '0-..0-..0-0-0-..', '0-..0-..8-0-..0-', '0-0-0-0-0-0-....'], vel=106, oct=2)
        bat(c['rui'], t, 4, [('X..xX..xX..xX.xx', 'gb_bombo_eu'), ('....x.......x...', 'gb_palma'), ('.o.o.o.o.o.o.o.o', 'gb_hat+')], 'redoble4', vel=100, crash=90)
        sacudida(c['piano'], t, CH_TU, ['..x...x...x...x.', '..x...x...x...x.', '..x...x..x..x...', '................'], desde='A3', vel=84, caida=0.8)
        for k, (ch, pat) in enumerate(zip(CH_TU[:3], ['...x....x.x.....', '...x....x...x.x.', '...x..x.x.......'])):
            for st, q in enumerate(pat):
                if q == 'x':
                    payaso(c['payaso'], t + k * L + st / 4, 0.2, ch, 100, alto=1 + st % 2)
        t += 4 * L
        # Third build-up, a tone higher (G sharp minor).
        m('Subida 3 (un tono arriba)', t, 4, 'Sol# menor')
        tocar(c['lead3'], t, BU2, 100)
        horn_stabs('aire2', t, CH_BU2, ['x-------x-------', 'x---x---x---x---', 'x-x-x-x-x-x-x-x-', 'xxxxxxxxxxxx....'], desde='E4', vel=102)
        bajo(c['bajo'], t, CH_BU2, [BO1, BO1, '0.0.0.0.0.0.0.0.', '0.0.0.0.0.0.....'], vel=104, oct=2)
        bat(c['rui'], t, 4, [([K4, K4, K4, 'X...X...X...'], 'gb_bombo_eu'), (['', 'x...x...x...x...', 'x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxx'], 'gb_caja')], vel=102)
        t += 4 * L
        # The chorus a tone up: the choir high, the second voice and the stabs as before, everything playing.
        m('B+2 (estribillo, un tono arriba)', t, 8, 'Sol# menor')
        tocar(c['coro'], t, B2, 110)
        segunda_voz(c['seg3'], t, corta(B2, 0, 4), CH_B2[:4], escala('G#', 'menor'), vel=86)
        horn_stabs('aire2', t + 4 * L, CH_B2[4:], [PI1, PI1, PI1, 'x..x..x.x.x.x.x.'], desde='E4', vel=100)
        bajo(c['bajo'], t, CH_B2, [BO2, BO2, BO2, BO3, BR2, BR2, BR2, BR2], vel=108, oct=2)
        bat(c['rui'], t, 8, FULL, 'redoble4', vel=106, crash=118)
        resp(t, 7, 'aire', 'D#7', 114)
        t += 8 * L
        # The last hook in G sharp minor on the wobbling pulse with the choir (and air-horn stabs in the second half); the car horn, the air horn and the clown answer.
        m('A+2 (gancho final)', t, 8, 'Sol# menor')
        tocar(c['pwm'], t, A2, 110)
        segunda_voz(c['seg3'], t, corta(A2, 0, 4), CH_A2[:4], escala('G#', 'menor'), vel=84)
        horn_stabs('aire2', t + 4 * L, CH_A2[4:], [PI1, PI1, PI1, PI3], desde='E4', vel=102)
        bajo(c['bajo'], t, CH_A2, [BR2, BR1, BR2, BR1, BR2, BR1, BR2, BO2], vel=108, oct=2)
        bat(c['rui'], t, 8, FULL, 'redoble', vel=106, crash=120)
        resp(t, 1, 'claxon3', 'E', 114)
        resp(t, 3, 'aire', 'F#', 114)
        resp(t, 5, 'payaso', 'E', 112)
        t += 8 * L
        # Outro: the track falls back to F sharp minor (E is the pivot) over E, D, E and C sharp 7; the horn dives into the intro's blast.
        m('Salida (vuelve al principio)', t, 4, 'Fa# menor')
        tocar(c['lead2'], t, OUT, 100)
        sacudida(c['piano'], t, CH_OU, [PI2, PI2, PI2, '................'], desde='A3', vel=80, caida=0.8)
        bajo(c['bajo'], t, CH_OU, [BO1, BO1, BO2, '0---------------'], vel=100, oct=2, caida=0.9)
        bat(c['rui'], t, 3, BASE_, 'caja', vel=96)
        cae(c['aire'], t + 3 * L + 2, 2.0, 'E', 104)
        c['rui'].golpe(t + 3 * L + 2.2, 'gb_aire', 80)
        return t + 4 * L

    return C, ronda, beats, bpm, m


B.CANCIONES['combate-feria2'] = combate_feria2

if __name__ == '__main__':
    B.salir('combate-feria2')
