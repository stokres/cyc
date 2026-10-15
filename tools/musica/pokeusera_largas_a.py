# Long versions (2:40 to 3:15 a round) of five tunes of «PokéUsera · Edición Jarra»: titulo, draft, combate, combate-rock and final.
# Same chip rules as pokeusera.py (two pulses, a 16-step wave bass, LFSR noise drums, no reverb, no echo, mono) and the same
# themes, but written as real songs: intro, A, A' (the tune varied, with a second voice), B (contrast), a breakdown
# (layers off, a new riff), C (a new tune, a tone higher) and a return of A with a variation and an ending that leads into the start.
#
#   python3 pokeusera_largas_a.py titulo | draft | combate | combate-rock | final | todas
#
# Writes src/sonido/pokeusera-<name>.mp3 (the same paths as before) at 64 kbps, 24 kHz, mono, and prints: the section map
# (bar, length, key), the LOOP value for sonido.ts (length of a round in seconds), the repetition check (no 8-bar phrase
# identical more than twice), the one-note-at-a-time check and the loop-join check on the decoded MP3.
# Loops as in pokeusera.py: three identical rounds are rendered and the middle one is kept (exportar_bucle).
import os
import subprocess
import sys
import tempfile
import numpy as np
import pokeusera  # also installs the noise-channel drum kit in sinte
from pokeusera import (canales, bateria, tempo, bajo, sacudida, arpegio, segunda_voz, verifica, redoble, L, SALIDA, _tercera)
from sinte import Cancion, Inst, SR, frase, tocar, bajo_de, escala, midi, revisa, exportar_bucle

KBPS = 64


# --- Tools ---------------------------------------------------------------------------------

def voces(C, **kw):
    """The usual four channels plus a 12.5 % twin of the lead and a 25 % twin of the second pulse (never at the same time as their
    channel mates: verifica)."""
    c = canales(C, **kw)
    v = dict(vib=(20, 6.2, 0.16))
    c['lead3'] = C.pista('lead 12.5%', Inst('pulso', duty=0.125, adsr=(0.002, 0.12, 0.65, 0.05), **v), vol=kw.get('vol_lead', -5) - 1, reverb=0)
    c['seg3'] = C.pista('pulso 2 25%', Inst('pulso', duty=0.25, adsr=(0.002, 0.08, 0.6, 0.04), arp_hz=60), vol=kw.get('vol_seg', -10) - 1, reverb=0)
    return c


def sube(notas, n):
    return [(b, d, m + n, *r) for b, d, m, *r in notas]


def cortar(notas, c0, c1):
    """The bars c0..c1 (0-based, c1 excluded) of a phrase, moved to the start."""
    return [(b - c0 * L, d, m, *r) for b, d, m, *r in notas if c0 * L <= b < c1 * L]


def unir(*partes):
    """Phrases (notes, bars) one after the other."""
    out, off = [], 0
    for notas, comp in partes:
        out += [(b + off, d, m, *r) for b, d, m, *r in notas]
        off += comp * L
    return out


def vecino(m, esc, s):
    x = m + s
    while x % 12 not in esc:
        x += s
    return x


def adorna(notas, esc, modo=0):
    """Ornaments a tune: 0 a scale step toward the next note on the last sixteenth of long notes; 1 a quick turn on the last beat of
    notes of half a bar or more; 2 long notes repeated in two halves."""
    out = []
    for i, (b, d, m, *_r) in enumerate(notas):
        sig = notas[i + 1][2] if i + 1 < len(notas) else m
        s = 1 if sig > m else -1
        if modo == 0 and d >= 1.0:
            out += [(b, d - 0.25, m), (b + d - 0.25, 0.25, vecino(m, esc, s))]
        elif modo == 1 and d >= 2.0:
            out += [(b, d - 1, m), (b + d - 1, 0.25, m), (b + d - 0.75, 0.25, vecino(m, esc, 1)), (b + d - 0.5, 0.25, m),
                    (b + d - 0.25, 0.25, vecino(m, esc, -1))]
        elif modo == 2 and d >= 1.0:
            out += [(b, d / 2, m), (b + d / 2, d / 2, m)]
        else:
            out.append((b, d, m))
    return out


def poner(P, t, notas, vel=100, oct=0):
    tocar(P, t, notas, vel, oct)


# the map of sections of a round
MAPA = []


def inicio(t):
    MAPA.clear()
    MAPA.append(t)


def reg(nombre, t, comp, clave):
    MAPA.append((nombre, int(round((t - MAPA[0]) / L)) + 1, comp, clave))


# --- Drums: patterns per bar (a list is cycled), fills at the end of a section ----------------------

def relleno(P, t, i, vel=100):
    k = i % 7
    if k == 0:
        bateria(P, t, bombo='X.......x.x.....', caja='....x...x.x.xxxx', hat='x.x.x.x.', vel=vel)
    elif k == 1:
        bateria(P, t, bombo='X.......', tom='........xxxx....', caja='............xxxx', vel=vel)
    elif k == 2:
        bateria(P, t, bombo='X.......', hat='x.x.x.x.', vel=vel)
        redoble(P, t + 2, 40, 118, 8)
    elif k == 3:
        bateria(P, t, caja='...x..x.x..x..x.', bombo='X.......', hat='o.o.o.o.', vel=vel)
    elif k == 4:
        bateria(P, t, caja='..x.x.x.x.x.x.xx', bombo='X.......', vel=vel)
    elif k == 5:
        bateria(P, t, bombo='X.......X.......', caja='..........x.x.x.', vel=vel)
    else:
        redoble(P, t, 36, 118, 16)


def bat(P, t, comp, kit, fill=None, crash=0, vel=100):
    """`comp` bars of the kit (each value a pattern or a list of patterns cycled by bar); the last bar is the fill number `fill`."""
    n = comp - (1 if fill is not None else 0)
    for i in range(n):
        p = {k: (v[i % len(v)] if isinstance(v, (list, tuple)) else v) for k, v in kit.items()}
        bateria(P, t + i * L, vel=vel, **p)
    if fill is not None:
        relleno(P, t + (comp - 1) * L, fill, vel)
    if crash:
        P.golpe(t, 'gb_crash', crash)


# --- Checks ------------------------------------------------------------------------------------

def repeticiones(C, comp, ventana=8, paso=4):
    """Counts identical windows of `ventana` bars (every `paso` bars) in one round: the whole mix, and without the drums."""
    res = []
    for sin_bateria in (False, True):
        cuenta = {}
        for w in range(0, comp - ventana + 1, paso):
            a, b = w * L, (w + ventana) * L
            ev = []
            for p in C.pistas:
                if sin_bateria and p.inst is None:
                    continue
                for (bt, d, t, v, e) in p.notas:
                    if a <= bt < b:
                        ev.append((p.nombre, round(bt - a, 4), round(d, 4), str(t), v, str(sorted(e.items()))))
            k = hash(tuple(sorted(ev)))
            cuenta[k] = cuenta.get(k, 0) + 1
        res.append(max(cuenta.values()))
    return res


def comprueba_bucle(ruta, largo):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '1', '-ar', '24000', '-'], capture_output=True, check=True)
    y = np.frombuffer(p.stdout, np.float32).astype(np.float64)
    ini, fin = int(round(0.5 * 24000)), int(round((0.5 + largo) * 24000))
    n = 2400
    salto = abs(y[ini] - y[fin - 1])
    pasos = np.abs(np.diff(y[ini - n:ini + n]))
    dif = np.sqrt(np.mean((y[fin - n:fin] - y[ini - n:ini]) ** 2))
    rms = np.sqrt(np.mean(y[ini:fin] ** 2))
    print(f'  bucle decodificado: salto en la junta {salto:.4f} (paso máximo alrededor {pasos.max():.4f}); '
          f'diferencia RMS entre el final y lo que precede al inicio {dif:.5f} (RMS de la pieza {rms:.3f}); duración del archivo {len(y) / 24000:.2f} s')


def salir(nombre, pieza):
    C, ronda, beats, bpm = pieza()
    t = 0
    for _ in range(3):
        t = ronda(t)
    assert t == 3 * beats, (t, beats)
    verifica(nombre, C)
    comp = beats // L
    largo = beats * 60 / bpm
    x = C.render(hasta=3 * beats)
    ruta = os.path.join(SALIDA, f'pokeusera-{nombre}.mp3')
    with tempfile.TemporaryDirectory() as tmp:
        exportar_bucle(os.path.join(tmp, nombre), x, largo, rms_db=-17.0, kbps=KBPS, salida=ruta, mono=True, ar=24000)
    # repetition check on a single round
    C2, ronda2, _b, _bpm = pieza()
    ronda2(0)
    r_todo, r_mel = repeticiones(C2, comp)
    print(f'  {nombre}: {bpm:.4f} bpm, {comp} compases, LOOP (ronda) = {largo:.6f} s = {int(largo // 60)}:{largo % 60:05.2f}, '
          f'pico sin normalizar {np.max(np.abs(x)):.2f}')
    print(f'  repetición: ventana de 8 compases idéntica como mucho {r_todo} vez/veces en la mezcla entera, {r_mel} sin batería')
    print('  mapa (sección, compás de inicio, compases, tonalidad, inicio en s, duración en s):')
    mapa = [m for m in MAPA[1:]]
    bs = 60 / bpm * L
    for nom, ini, n, clave in mapa:
        print(f'    {nom:<16} compás {ini:>3}  {n:>3} comp.  {clave:<10} {(ini - 1) * bs:7.1f} s  {n * bs:6.1f} s')
    print(f'  tamaño: {os.path.getsize(ruta) / 1024:.0f} KB')
    comprueba_bucle(ruta, largo)


# ==================================================================================================
# TITULO: «Jarra en alto»  G major, 126 bpm, 88 bars
# ==================================================================================================

def titulo():
    """Intro (8) - A (8) - A' (8) - B in E minor (8) + B2 (8) - breakdown (8) - C in A major, a tone up (16) - A'' (8) - A''' (8) - coda (8)."""
    bpm = tempo(126)
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-2, vol_bajo=-1, vol_rui=-10)
    MAY = escala('G', 'mayor')
    CH_I = ['G', 'G', 'Em', 'C', 'G', 'D', 'C', 'D']
    CH_A = ['G', 'Bm', 'C', 'D', 'G', 'Em', 'C', 'D']
    CH_B = ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C', 'D7']
    CH_B2 = ['C', 'D', 'Em', 'Em', 'Am', 'D', 'B7', 'B7']
    CH_P = ['Em', 'Em', 'Am', 'Am', 'C', 'D', 'C', 'E7']
    CH_C1 = ['A', 'F#m', 'D', 'E', 'A', 'F#m', 'Bm', 'E']
    CH_C2 = ['A', 'F#m', 'D', 'E', 'D', 'E', 'A', 'D7']
    CH_Z = ['G', 'G', 'Bm', 'D', 'C', 'D', 'D', 'D']
    A = frase('D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4 | E5:2 G5:2 C6:6 B5:2 A5:2 G5:2 | A5:2 D6:2 F#6:4 E6:2 D6:2 A5:4 |'
              'B5:4 G5:2 B5:2 D6:8 | B5:4 G5:2 B5:2 E6:8 | C6:4 E6:2 D6:2 C6:4 A5:2 G5:2 | A5:2 B5:2 C6:2 D6:2 E6:4 F#6:4')
    A2 = frase('D5:2 G5:2 B5:4 A5:2 G5:2 D5:4 | F#5:2 B5:2 D6:4 C#6:2 B5:2 F#5:4 | E5:2 G5:2 C6:6 B5:2 A5:2 G5:2 | A5:2 D6:2 F#6:4 E6:2 D6:2 A5:4 |'
               'B5:2 D6:2 G6:6 E6:2 D6:4 | G5:2 B5:2 E6:4 D6:2 C6:2 B5:4 | E6:4 D6:2 C6:2 G5:4 C6:4 | A5:4 D6:4 F#6:4 A6:4')
    B = frase('E5:4 G5:4 B5:6 A5:2 | G5:4 E5:4 C6:8 | D6:6 B5:2 G5:4 B5:4 | A5:8 F#5:4 A5:4 |'
              'E5:4 G5:4 B5:4 E6:4 | C6:6 B5:2 A5:4 E5:4 | E6:4 D6:4 C6:4 G5:4 | A5:4 C6:4 D6:4 F#6:4')
    B2 = frase('G5:2 C6:2 E6:4 D6:2 C6:2 G5:4 | A5:2 D6:2 F#6:4 E6:2 D6:2 A5:4 | G5:2 B5:2 E6:4 D6:2 B5:2 G5:4 | B5:6 A5:2 G5:4 E5:4 |'
               'C6:2 E6:2 A6:4 G6:2 E6:2 C6:4 | D6:2 F#6:2 A6:4 F#6:2 D6:2 A5:4 | B5:2 D#6:2 F#6:4 A6:2 F#6:2 D#6:4 | B5:4 -:4 F#5:2 A5:2 B5:2 D#6:2')
    INTRO = frase('-:16 | -:16 | -:16 | -:16 | D5:2 G5:2 B5:4 -:8 | A5:2 D6:2 F#6:4 -:8 | E5:2 G5:2 C6:4 -:8 | F#5:2 A5:2 D6:4 C#6:2 B5:2 A5:2 F#5:2')
    PUENTE = frase('-:16 | -:16 | -:16 | -:16 | E5:4 G5:4 E5:4 C5:4 | F#5:4 A5:4 F#5:4 D5:4 | G5:4 C6:4 E6:4 G6:4 | G#5:2 B5:2 E6:4 D6:2 B5:2 G#5:4')
    C1 = frase('E6:3 E6:1 C#6:2 A5:2 C#6:3 -:1 E6:2 A6:2 | F#6:3 F#6:1 C#6:2 A5:2 F#5:4 A5:2 C#6:2 | D6:3 D6:1 A5:2 F#5:2 A5:3 -:1 D6:2 F#6:2 | E6:3 G#6:1 B6:4 G#6:2 E6:2 B5:4 |'
               'C#6:3 E6:1 A6:4 G#6:2 F#6:2 E6:4 | F#6:3 E6:1 C#6:4 A5:2 C#6:2 F#6:4 | D6:2 F#6:2 B6:4 A6:2 F#6:2 D6:4 | G#6:2 B6:2 E6:4 D6:2 B5:2 G#5:4')
    C2 = frase('E6:6 C#6:2 A5:4 C#6:4 | F#6:6 A6:2 F#6:4 C#6:4 | D6:6 F#6:2 A6:4 F#6:4 | G#6:4 B6:4 G#6:4 E6:4 |'
               'F#6:2 A6:2 D6:4 F#6:2 A6:2 F#6:4 | G#6:2 B6:2 E6:4 G#6:2 B6:2 G#6:4 | A6:4 E6:4 C#6:4 E6:4 | D6:4 F#6:4 A6:4 C6:2 D6:2')
    A3b = frase('G6:4 D6:2 B5:2 D6:4 G6:4 | E6:4 B5:2 G5:2 B5:4 E6:4 | C6:2 E6:2 G6:4 E6:2 C6:2 E6:4 | D6:2 F#6:2 A6:2 F#6:2 D6:2 A5:2 F#5:2 D5:2')
    CODA = frase('D5:4 G5:4 B5:8 | A5:4 G5:4 D5:8 | F#5:4 B5:4 D6:8 | C#6:4 B5:4 F#5:8 |'
                 'E5:4 G5:4 C6:8 | D5:4 F#5:4 A5:8 | F#5:2 A5:2 D6:4 C#6:2 B5:2 A5:2 F#5:2 | A5:8 -:8')
    CONTRA = frase('D5:8 B4:8 | F#5:8 D5:8 | G5:8 E5:8 | A5:8 F#5:8 | G5:8 B5:8 | G5:8 E5:8 | E5:8 G5:8 | F#5:8 A5:8')
    for nombre, notas, ch in (('B2', B2, CH_B2), ('puente', PUENTE, CH_P), ('C1', C1, CH_C1), ('C2', C2, CH_C2), ('A3b', A3b, CH_A[4:]), ('coda', CODA, CH_Z)):
        revisa(f'titulo {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        inicio(t)
        # Intro: arpeggios, then the bass walks in and the hook is teased.
        reg('Intro', t, 8, 'Sol M')
        arpegio(c['seg3'], t, CH_I, patron=(0, 1, 2, 1), desde='G3', vel=66, dur=0.2)
        poner(c['lead2'], t, INTRO, 88)
        bajo(c['bajo'], t, CH_I[:4], '0---------------', vel=94, caida=0.95)
        bajo(c['bajo'], t + 4 * L, CH_I[4:], ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'], vel=96)
        bat(c['rui'], t, 2, dict(hat='o...o...o...o...'))
        bat(c['rui'], t + 2 * L, 2, dict(bombo='X.......', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......x.......', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'), fill=2)
        t += 8 * L
        # A: the hook alone, off-beat chord stabs, a march in the bass.
        reg('A (tema)', t, 8, 'Sol M')
        poner(c['lead'], t, A, 100)
        sacudida(c['seg'], t, CH_A, '..x...x...x...x.', desde='G3', vel=78, caida=0.7)
        bajo(c['bajo'], t, CH_A, '0.8.0.8.0.8.0.8.', vel=96)
        bat(c['rui'], t, 8, dict(bombo=['X.......x.......'] * 3 + ['X.......x.x.....'], caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'), fill=0, crash=96)
        t += 8 * L
        # A': the second voice under the hook, brighter, sixteenth hats.
        reg("A' (voz 2)", t, 8, 'Sol M')
        poner(c['lead'], t, A2, 102)
        segunda_voz(c['seg'], t, A2, CH_A, MAY, vel=84)
        bajo(c['bajo'], t, CH_A, ['0.8.0.8.0.8.0.8.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.......x.x.....', caja='....x.......x...', hat='xoxoxoxoxoxoxoxo'), fill=1, crash=96)
        t += 8 * L
        # B: a singing middle in E minor, the twin lead at 50 %, broken chords, a lighter beat.
        reg('B (Mi menor)', t, 8, 'Mi m')
        poner(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 1), desde='G3', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0---------5-0-5-'] * 7 + ['0.0.0.0.0.0.5.5.'], vel=96, caida=0.95)
        bat(c['rui'], t, 8, dict(bombo='X.......x.......', caja='............x...', hat='o.o.o.o.o.o.o.o.'), fill=3)
        t += 8 * L
        # B2: the answer, higher, 12.5 % lead over 25 % stabs, a walking bass and a fuller beat.
        reg('B2 (respuesta)', t, 8, 'Mi m')
        poner(c['lead3'], t, B2, 100)
        sacudida(c['seg3'], t, CH_B2, ['x-x-x-x-x-x-x-x-', 'x-x-x-x-x-x-x--x'], desde='G3', vel=70, caida=0.7)
        bajo(c['bajo'], t, CH_B2, ['0.5.8.5.0.5.8.5.'] * 3 + ['0.5.8.5.0.0.5.8.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=4, crash=100)
        t += 8 * L
        # Breakdown: only bass and drums with a new riff, then a quiet lead and a snare build into the key change.
        reg('Puente / breakdown', t, 8, 'Mi m')
        bajo(c['bajo'], t, CH_P[:4], ['0..0..a.0.5.b.5.', '0..0..a.0.5.b.5.', 'a..a..0.a.5.8.5.', '5..5..3.5.0.5.3.'], vel=102, caida=0.9)
        bajo(c['bajo'], t + 4 * L, CH_P[4:], ['0.......5.......', '0.......5.......', '0.......0.......', '0...0...0.5.5.5.'], vel=98, caida=0.95)
        bat(c['rui'], t, 4, dict(bombo='X..x....X...x...', caja='........x.......', hat='x.x.x.x.x.x.x.x.'))
        poner(c['lead3'], t, PUENTE, 86)
        arpegio(c['seg3'], t + 4 * L, CH_P[4:], patron=(0, 2, 1, 2), desde='C4', vel=60, dur=0.2)
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......x.......', caja='........x.......', hat='o.o.o.o.o.o.o.o.'), fill=6)
        t += 8 * L
        # C: a new tune a tone higher, in A major. C1 over a bright octave bass, C2 over fast arpeggios.
        reg('C1 (tema nuevo)', t, 8, 'La M (+1 tono)')
        poner(c['lead'], t, C1, 104)
        sacudida(c['seg'], t, CH_C1, ['..x...x...x...x.', '..x...x...x..x.x'], desde='A3', vel=78, caida=0.65)
        bajo(c['bajo'], t, CH_C1, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.0.5.8.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X.......x.x.....', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=0, crash=104)
        t += 8 * L
        reg('C2 (tema nuevo)', t, 8, 'La M')
        poner(c['lead2'], t, C2, 104)
        arpegio(c['seg'], t, CH_C2, patron=(0, 1, 2, 3, 2, 1), desde='E4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_C2, ['0080008000800080'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....x.......x...', hat='xoxoxoxoxoxoxoxo'), fill=5, crash=104)
        t += 8 * L
        # A'': the hook is back in G (the key falls through D7), ornamented, twin lead, then a new climbing answer.
        reg("A'' (vuelve)", t, 8, 'Sol M')
        poner(c['lead2'], t, unir((adorna(cortar(A, 0, 4), MAY, 0), 4), (A3b, 4)), 104)
        sacudida(c['seg3'], t, CH_A, 'x-x-x-x-x-x-x-x-', desde='G3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_A, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'] + ['0.0.8.0.0.0.8.0.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X.......x.x.....', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=3, crash=100)
        t += 8 * L
        # A''': the hook with a long counter-line underneath and the ornament at the ends of notes.
        reg("A''' (contracanto)", t, 8, 'Sol M')
        poner(c['lead'], t, adorna(A2, MAY, 1), 104)
        poner(c['seg2'], t, CONTRA, 82)
        bajo(c['bajo'], t, CH_A, ['0.0.8.0.0.0.8.0.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.......x.x.....', caja='....x.......x...', hat='xxxxxxxxxxxxxxxx'), fill=2, crash=100)
        t += 8 * L
        # Coda: the hook slows into half-length notes and lets go on the dominant, ready for the intro.
        reg('Coda', t, 8, 'Sol M')
        poner(c['lead2'], t, CODA, 92)
        arpegio(c['seg3'], t, CH_Z, patron=(0, 1, 2, 1), desde='G3', vel=66, dur=0.2)
        bajo(c['bajo'], t, CH_Z[:4], '0.......0.5.....', vel=94, caida=0.9)
        bajo(c['bajo'], t + 4 * L, CH_Z[4:], ['0.8.0.8.0.8.0.8.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=96)
        bat(c['rui'], t, 4, dict(bombo='X.......', caja='........x.......', hat='o...o...o...o...'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......x.......', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'), fill=6)
        t += 8 * L
        return t

    return C, ronda, 88 * L, bpm


# ==================================================================================================
# DRAFT: «Elijo yo primero»  C major with a swing, 110 bpm, 84 bars
# ==================================================================================================

def caminar(P, t0, acordes, vel=96, estilo=0):
    """Walking bass: root, third, fifth and a chromatic step into the next root. estilo 1: two in a bar (root and fifth)."""
    for i, ch in enumerate(acordes):
        r = bajo_de(ch, 3)
        sig = bajo_de(acordes[(i + 1) % len(acordes)], 3)
        if abs(sig - r) > 6:
            sig += -12 if sig > r else 12
        ap = sig - 1 if sig > r else sig + 1
        if estilo == 1:
            P.nota(t0 + i * L, 1.9, r, vel + 6)
            P.nota(t0 + i * L + 2, 1.4, r + 7, vel)
            P.nota(t0 + i * L + 3.5, 0.5, ap, vel - 6)
            continue
        for k, m in enumerate((r, r + _tercera(ch), r + 7, ap)):
            P.nota(t0 + i * L + k, 0.9, m, vel + (6 if k == 0 else 0))


def draft():
    """Intro (4) - A (8) - A' (8) - A'' with a counter-line (8) - B in F, the subdominant (16) - stop-time breakdown (8) -
    C in D major, a tone up (16) - A back an octave up (8) - coda (8)."""
    bpm = tempo(110)
    C = Cancion(bpm, swing=0.6)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-3, vol_rui=-11, duty_lead=0.5)
    for k in ('lead', 'lead2', 'lead3'):
        c[k].inst.adsr = (0.002, 0.08, 0.6, 0.03)
    c['lead2'].inst.duty = 0.25
    MAY = escala('C', 'mayor')
    CH_I = ['C', 'A7', 'Dm7', 'G7']
    CH1 = ['C', 'A7', 'Dm7', 'G7', 'C', 'E7', 'F', 'G7']
    CH2 = ['C', 'A7', 'Dm7', 'G7', 'F', 'Fm', 'C', 'G7']
    CH_B1 = ['F', 'Dm7', 'Gm7', 'C7', 'F', 'Bb', 'Gm7', 'C7']
    CH_B2 = ['F', 'Dm7', 'Bb', 'Bbm', 'F', 'D7', 'Gm7', 'C7']
    CH_BR = ['C', 'C', 'Am7', 'Am7', 'Dm7', 'G7', 'Em7', 'A7']
    CH_C1 = ['D', 'B7', 'Em7', 'A7', 'D', 'F#7', 'Bm', 'A7']
    CH_C2 = ['G', 'Gm', 'D', 'B7', 'Em7', 'A7', 'Dm7', 'G7']
    CH_Z = ['C', 'A7', 'Dm7', 'G7', 'C', 'F', 'Dm7', 'G7']
    T1 = frase('E5:3 E5:1 G5:2 E5:2 C5:3 -:1 D5:2 E5:2 | A4:3 C#5:1 E5:2 C#5:2 A4:3 -:1 B4:2 C#5:2 | F5:3 F5:1 A5:2 F5:2 D5:3 -:1 E5:2 F5:2 | D5:3 F5:1 G5:2 B5:2 G5:4 -:2 D5:2 |'
               'E5:3 E5:1 G5:2 E5:2 C6:4 -:2 G5:2 | G#5:3 G#5:1 B5:2 G#5:2 E5:3 -:1 F#5:2 G#5:2 | A5:3 A5:1 C6:2 A5:2 F5:4 -:2 A5:2 | B5:2 A5:2 G5:2 F5:2 E5:2 D5:2 B4:2 G4:2')
    T2 = frase('G5:2 -:2 G5:2 -:2 E5:2 -:2 C5:2 -:2 | A5:2 -:2 A5:2 -:2 E5:2 -:2 C#5:2 -:2 | F5:2 -:2 A5:2 -:2 D6:4 C6:2 A5:2 | B5:2 D6:2 B5:2 G5:2 F5:4 -:4 |'
               'C6:3 C6:1 A5:2 F5:2 C6:3 -:1 A5:2 F5:2 | Ab5:3 Ab5:1 C6:2 Ab5:2 F5:4 -:4 | E5:2 G5:2 C6:6 A5:2 G5:2 E5:2 | B5:2 G5:2 D5:2 F5:2 G5:4 -:4')
    INTRO = frase('-:16 | -:16 | F5:2 -:2 A5:2 -:2 D6:4 C6:2 A5:2 | B5:2 D6:2 G5:2 B5:2 D6:4 -:2 G5:2')
    CONTRA = frase('G4:8 C5:8 | E4:8 G4:8 | F4:8 A4:8 | G4:8 B4:8 | G4:8 E4:8 | G#4:8 B4:8 | A4:8 C5:8 | B4:8 D5:8')
    B1 = frase('A5:4 C6:4 F6:4 C6:4 | D6:4 A5:4 F5:4 A5:4 | Bb5:4 D6:4 G6:4 D6:4 | E6:4 G6:4 Bb6:4 G6:4 |'
               'A5:2 C6:2 F6:4 E6:2 D6:2 C6:4 | D6:4 F6:4 Bb6:4 F6:4 | G6:6 F6:2 D6:4 Bb5:4 | C6:2 E6:2 G6:2 Bb6:2 A6:4 G6:4')
    B2 = frase('C6:3 C6:1 A5:2 C6:2 F6:6 -:2 | D6:3 D6:1 F6:2 A6:2 F6:6 -:2 | D6:3 D6:1 F6:2 D6:2 Bb5:6 -:2 | Db6:3 Db6:1 F6:2 Db6:2 Bb5:6 -:2 |'
               'A5:2 C6:2 F6:4 A6:2 F6:2 C6:4 | D6:2 F#6:2 A6:4 F#6:2 D6:2 C6:4 | Bb5:2 D6:2 G6:4 F6:2 D6:2 Bb5:4 | E6:2 G6:2 Bb6:2 G6:2 E6:2 C6:2 Bb5:2 G5:2')
    BR = frase('E6:2 -:6 E6:2 -:6 | G6:2 -:6 E6:2 -:2 C6:2 -:2 | A5:2 -:6 C6:2 -:6 | E6:2 -:2 C6:2 -:2 A5:2 -:2 C6:2 -:2 |'
               'D6:2 F6:2 A6:2 F6:2 D6:2 F6:2 A6:2 C7:2 | B6:2 G6:2 D6:2 G6:2 B6:2 G6:2 D6:2 B5:2 | G5:2 B5:2 E6:2 G6:2 B6:4 G6:4 | A5:2 C#6:2 E6:2 A6:2 G6:2 E6:2 C#6:2 A5:2')
    C1 = frase('F#5:3 F#5:1 A5:2 F#5:2 D6:4 -:2 A5:2 | B5:3 B5:1 D#6:2 B5:2 F#6:4 -:2 D#6:2 | G5:3 G5:1 B5:2 G5:2 E6:4 -:2 D6:2 | C#6:3 C#6:1 E6:2 C#6:2 A5:4 -:2 G5:2 |'
               'A5:3 A5:1 D6:2 F#6:2 A6:6 -:2 | A#5:3 A#5:1 C#6:2 E6:2 C#6:4 -:2 A#5:2 | B5:2 D6:2 F#6:4 B6:4 F#6:4 | E6:2 C#6:2 A5:2 G5:2 A5:2 C#6:2 E6:2 G6:2')
    C2 = frase('B5:3 B5:1 D6:2 G6:2 B6:6 -:2 | Bb5:3 Bb5:1 D6:2 G6:2 Bb6:6 -:2 | A5:3 A5:1 D6:2 F#6:2 A6:4 F#6:4 | D#6:3 D#6:1 F#6:2 B6:2 A6:4 F#6:4 |'
               'G6:4 E6:4 B5:4 G5:4 | A5:2 C#6:2 E6:2 G6:2 E6:2 C#6:2 A5:2 E5:2 | F5:2 A5:2 D6:4 C6:2 A5:2 F5:4 | G5:2 B5:2 D6:2 F6:2 D6:2 B5:2 G5:4')
    CODA2 = frase('E6:3 E6:1 G6:2 E6:2 C6:6 -:2 | A5:3 A5:1 C6:2 A5:2 F5:6 -:2 | D6:2 F6:2 A6:4 G6:2 F6:2 D6:4 | G5:2 B5:2 D6:2 F6:2 B5:2 D6:2 G6:4')
    for nombre, notas, ch in (('B1', B1, CH_B1), ('B2', B2, CH_B2), ('BR', BR, CH_BR), ('C1', C1, CH_C1), ('C2', C2, CH_C2), ('CODA2', CODA2, CH_Z[4:]),
                              ('INTRO', INTRO, CH_I), ('CONTRA', CONTRA, CH1)):
        revisa(f'draft {nombre}', notas, [[a] for a in ch])
    K = dict(caja='....x.......x...', hat='x.x.x.x.x.x.x.x.')

    def ronda(t):
        inicio(t)
        reg('Intro', t, 4, 'Do M')
        poner(c['lead'], t, INTRO, 96)
        sacudida(c['seg'], t, CH_I, '....x.......x.x.', desde='G3', vel=70, caida=0.6)
        caminar(c['bajo'], t, CH_I)
        bat(c['rui'], t, 4, dict(bombo='X.....x.x.......', **K), fill=4)
        t += 4 * L
        reg('A (tema)', t, 8, 'Do M')
        poner(c['lead'], t, T1, 100)
        sacudida(c['seg'], t, CH1, '....x.......x.x.', desde='G3', vel=76, caida=0.6)
        caminar(c['bajo'], t, CH1)
        bat(c['rui'], t, 8, dict(bombo=['X.....x.x.......'] * 3 + ['X.....x.x...x...'], **K), fill=0, crash=90)
        t += 8 * L
        reg("A' (tema 2)", t, 8, 'Do M')
        poner(c['lead'], t, T2, 100)
        sacudida(c['seg'], t, CH2, ['....x.......x.x.', '....x.......x.x.', '....x.......x.x.', '....x..x....x.x.'], desde='G3', vel=76, caida=0.6)
        caminar(c['bajo'], t, CH2)
        bat(c['rui'], t, 8, dict(bombo='X.....x.x.......', caja=['....x.......x...'] * 3 + ['....x.......x..x'], hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=1, crash=90)
        t += 8 * L
        reg("A'' (contracanto)", t, 8, 'Do M')
        poner(c['lead2'], t, adorna(T1, MAY, 2), 100)
        poner(c['seg2'], t, CONTRA, 80)
        caminar(c['bajo'], t, CH1, vel=98)
        bat(c['rui'], t, 8, dict(bombo='X..x..x.X.......', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', tom='..............x.'), fill=4, crash=92)
        t += 8 * L
        reg('B (Fa M, subdominante)', t, 8, 'Fa M')
        poner(c['lead2'], t, B1, 96)
        arpegio(c['seg3'], t, CH_B1, patron=(0, 1, 2, 1), desde='C4', vel=60, dur=0.2)
        caminar(c['bajo'], t, CH_B1, vel=94, estilo=1)
        bat(c['rui'], t, 8, dict(bombo='X.......x.......', caja='........x.......', hat='x.x.x.x.x.x.x.x.'), fill=3, crash=88)
        t += 8 * L
        reg('B2 (Fa M)', t, 8, 'Fa M')
        poner(c['lead'], t, B2, 100)
        sacudida(c['seg'], t, CH_B2, '..x...x...x...x.', desde='G3', vel=74, caida=0.6)
        caminar(c['bajo'], t, CH_B2)
        bat(c['rui'], t, 8, dict(bombo=['X.....x.x.......'] * 3 + ['X.....x.x.x.....'], caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=0, crash=90)
        t += 8 * L
        reg('Puente (stop-time)', t, 8, 'Do M')
        poner(c['lead3'], t, BR, 94)
        sacudida(c['seg'], t + 4 * L, CH_BR[4:], '....x.......x.x.', desde='G3', vel=72, caida=0.6)
        caminar(c['bajo'], t, CH_BR, vel=100)
        bat(c['rui'], t, 4, dict(hat='x...x...x...x...'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......x.......', caja=['........x.......', '....x...x.......', '....x...x...x...', '..x.x.x.x.x.x.x.'], hat='x.x.x.x.x.x.x.x.'), fill=6)
        t += 8 * L
        reg('C1 (Re M, +1 tono)', t, 8, 'Re M')
        poner(c['lead2'], t, C1, 100)
        sacudida(c['seg'], t, CH_C1, '....x.......x.x.', desde='A3', vel=76, caida=0.6)
        caminar(c['bajo'], t, CH_C1, vel=98)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.......', caja='....x.......x..x', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=2, crash=96)
        t += 8 * L
        reg('C2 (Re M)', t, 8, 'Re M')
        poner(c['lead'], t, C2, 100)
        sacudida(c['seg3'], t, CH_C2, ['x..x..x..x..x.x.', 'x..x..x..x..x.x.', 'x..x..x..x..x.x.', 'x..x..x.x.x.x.x.'], desde='A3', vel=74, caida=0.55)
        caminar(c['bajo'], t, CH_C2, vel=98)
        bat(c['rui'], t, 8, dict(bombo='X..x..x.X.....x.', caja='....x.......x...', hat='xoxoxoxoxoxoxoxo'), fill=5, crash=96)
        t += 8 * L
        reg('A (octava arriba)', t, 8, 'Do M')
        poner(c['lead3'], t, adorna(T1, MAY, 1), 100, oct=1)
        sacudida(c['seg2'], t, CH1, '..x...x...x...x.', desde='G3', vel=70, caida=0.6)
        caminar(c['bajo'], t, CH1, vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.....x.x.......', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=3, crash=96)
        t += 8 * L
        reg('Coda', t, 8, 'Do M')
        poner(c['lead'], t, unir((adorna(cortar(T2, 0, 4), MAY, 0), 4), (CODA2, 4)), 100)
        sacudida(c['seg'], t, CH_Z, '....x.......x.x.', desde='G3', vel=76, caida=0.6)
        caminar(c['bajo'], t, CH_Z)
        bat(c['rui'], t, 4, dict(bombo='X.....x.x.......', **K), fill=1)
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.....x.x.......', **K), fill=6)
        t += 8 * L
        return t

    return C, ronda, 84 * L, bpm


# ==================================================================================================
# COMBATE: «A por todos»  D minor, 156 bpm, 112 bars
# ==================================================================================================

def combate():
    """Intro (8) - A riff (8) - A2 climbing (8) - B in F (8) - B2 in B flat (8) - breakdown (8) - C in E minor/G, a tone up (16) -
    the hammering build (8) - A3 (8) - A4 (8) - B3 (8) - climax (8) - outro (8)."""
    bpm = tempo(156)
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13)
    MEN = escala('D', 'menor')
    FA = escala('F', 'mayor')
    CH_I = ['Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'A']
    CH_A = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A']
    CH_A2 = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'C', 'A']
    CH_B = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'A']
    CH_B2 = ['Bb', 'F', 'Gm', 'Dm', 'Eb', 'Bb', 'Gm', 'A']
    CH_C1 = ['Em', 'Em', 'C', 'D', 'Em', 'Am', 'C', 'B7']
    CH_C2 = ['G', 'D', 'Em', 'C', 'G', 'D', 'Am', 'D']
    CH_C = ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A']
    CH_O = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'A', 'A']
    A = frase('D5:3 F5:1 A5:2 G5:2 F5:2 E5:2 D5:4 | A5:3 C6:1 D6:2 C6:2 A5:2 F5:2 A5:4 | Bb5:3 A5:1 G5:2 F5:2 D5:2 F5:2 Bb5:4 | C6:3 B5:1 G5:2 E5:2 G5:2 C6:2 E6:4 |'
              'D6:3 C6:1 A5:2 F5:2 A5:2 D6:2 F6:4 | E6:2 F6:2 E6:2 D6:2 C6:2 D6:2 A5:4 | D6:3 C6:1 Bb5:2 C6:2 D6:2 F6:2 D6:4 | E6:2 D6:2 C#6:2 A5:2 C#6:2 E6:2 A6:4')
    A2 = frase('A5:4 A5:2 D6:2 F6:4 E6:2 D6:2 | E6:4 E6:2 A5:2 D6:8 | D6:4 D6:2 F6:2 Bb6:4 G6:2 F6:2 | G6:4 E6:4 C6:8 |'
               'A5:4 A5:2 D6:2 F6:4 A6:4 | G6:4 F6:4 D6:4 Bb5:4 | C6:4 E6:4 G6:4 E6:4 | A5:2 C#6:2 E6:2 A6:2 G6:2 E6:2 C#6:2 A5:2')
    B = frase('A5:6 C6:2 F6:8 | G6:6 E6:2 C6:8 | D6:6 F6:2 A6:8 | G6:4 F6:4 D6:4 F6:4 |'
              'A5:6 C6:2 F6:4 G6:2 F6:2 | G6:4 E6:4 G6:4 C6:4 | D6:4 F6:4 Bb6:4 G6:4 | A6:4 G6:2 E6:2 C#6:4 A5:4')
    CC = frase('G5:2 -:2 G5:2 -:2 Bb5:2 -:2 D6:2 -:2 | G5:2 -:2 G5:2 -:2 Bb5:2 -:2 A5:2 G5:2 | F5:2 -:2 F5:2 -:2 A5:2 -:2 D6:2 -:2 | F5:2 -:2 F5:2 -:2 A5:2 -:2 G5:2 F5:2 |'
               'D6:2 -:2 D6:2 -:2 F6:2 -:2 Bb6:2 -:2 | E6:2 -:2 E6:2 -:2 G6:2 -:2 E6:2 -:2 | A5:2 C#6:2 E6:2 A6:2 A6:8 | A5:1 Bb5:1 B5:1 C6:1 C#6:1 D6:1 D#6:1 E6:1 F6:1 F#6:1 G6:1 G#6:1 A6:4')
    INT = frase('-:16 | -:16 | -:16 | -:16 | D5:2 F5:2 A5:4 -:8 | A5:2 C6:2 D6:4 -:8 | Bb5:4 G5:4 F5:4 D5:4 | E5:2 A5:2 C#6:4 E6:2 A6:2 C#6:2 A5:2')
    B2 = frase('D6:3 D6:1 F6:2 D6:2 Bb5:4 D6:4 | C6:3 C6:1 F6:2 A6:2 F6:4 C6:4 | D6:3 D6:1 G6:2 Bb6:2 G6:4 D6:4 | A5:3 A5:1 D6:2 F6:2 A6:4 F6:4 |'
               'G6:3 G6:1 Bb6:2 G6:2 Eb6:4 Bb5:4 | F6:3 F6:1 D6:2 F6:2 Bb6:8 | D6:2 G6:2 Bb6:4 A6:2 G6:2 F6:4 | A5:2 C#6:2 E6:2 A6:2 G6:2 E6:2 C#6:2 A5:2')
    BRK = frase('-:16 | -:16 | -:16 | -:16 | D5:4 -:2 F5:2 A5:4 -:2 D6:2 | C6:4 -:2 A5:2 F5:4 -:2 A5:2 | Bb5:4 -:2 D6:2 F6:4 -:2 D6:2 | E6:2 C#6:2 A5:2 E5:2 A5:2 C#6:2 E6:2 A6:2')
    C1 = frase('E6:3 B5:1 E6:2 G6:2 B6:4 G6:4 | A6:3 G6:1 E6:2 B5:2 G5:4 B5:4 | E6:3 C6:1 G5:2 C6:2 E6:4 G6:4 | F#6:3 D6:1 A5:2 D6:2 F#6:4 A6:4 |'
               'B6:3 G6:1 E6:2 G6:2 B6:4 E6:4 | A6:3 E6:1 C6:2 E6:2 A6:4 C6:4 | G6:2 E6:2 C6:2 E6:2 G6:4 E6:4 | D#6:2 F#6:2 B6:4 A6:2 F#6:2 D#6:4')
    C2 = frase('B5:4 D6:4 G6:8 | A5:4 D6:4 F#6:8 | G6:4 E6:4 B5:4 E6:4 | E6:4 C6:4 G5:4 C6:4 |'
               'D6:2 G6:2 B6:4 A6:2 G6:2 D6:4 | A6:2 F#6:2 D6:4 F#6:2 A6:2 F#6:4 | C6:2 E6:2 A6:4 G6:2 E6:2 C6:4 | D6:2 F#6:2 A6:2 F#6:2 D6:2 A5:2 F#5:2 D5:2')
    OUT = frase('D5:4 F5:4 A5:8 | A5:4 C6:4 D6:8 | Bb5:4 G5:4 F5:8 | C6:4 G5:4 E5:8 | D6:2 A5:2 F5:2 A5:2 D6:8 | D6:2 Bb5:2 F5:2 Bb5:2 D6:8 | C#6:2 E6:2 A6:4 E6:2 C#6:2 A5:4 | A5:2 C#6:2 E6:2 A6:2 -:8')
    for nombre, notas, ch in (('B2', B2, CH_B2), ('BRK', BRK, CH_I), ('C1', C1, CH_C1), ('C2', C2, CH_C2), ('OUT', OUT, CH_O), ('INT', INT, CH_I)):
        revisa(f'combate {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        inicio(t)
        # Intro: toms and a D pedal, broken chords; the riff is teased in the last four bars.
        reg('Intro', t, 8, 'Re m')
        poner(c['lead3'], t, INT, 92)
        arpegio(c['seg3'], t, CH_I, patron=(0, 2, 1, 2), desde='D4', vel=62, dur=0.2)
        bajo(c['bajo'], t, CH_I, ['0.0.0.0.0.0.0.0.'] * 3 + ['0.0.0.0.0.0.8.8.'] + ['0.0.8.0.0.0.8.0.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=96)
        bat(c['rui'], t, 4, dict(tom='x...x...x...x...', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.....x.X.x.....', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.'), fill=2)
        t += 8 * L
        # A: the riff over held chip chords and a galloping bass.
        reg('A (riff)', t, 8, 'Re m')
        poner(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x---------------', desde='A3', vel=74)
        bajo(c['bajo'], t, CH_A, ['0.0.8.0.0.0.8.0.'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo=['X.....x.X.x.....'] * 3 + ['X.....x.X.x...x.'], caja='....x.......x...', hat='x.x.x.x.x.x.x.x.'), fill=0, crash=100)
        t += 8 * L
        # A2: the tune climbs, running sixteenth arpeggios, a busier bass.
        reg('A2 (sube)', t, 8, 'Re m')
        poner(c['lead'], t, A2, 104)
        arpegio(c['seg'], t, CH_A2, patron=(0, 1, 2, 3, 2, 1), desde='D4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_A2, ['0080008000800080'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=1, crash=100)
        t += 8 * L
        # B: bright middle in F, long heroic notes on the 50 % twin, fast arpeggios and bouncing bass.
        reg('B (Fa M)', t, 8, 'Fa M')
        poner(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='C4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0.8.0.8.0.8.0.8.'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=3, crash=100)
        t += 8 * L
        # B2: a second tune in B flat, 12.5 % lead over syncopated 25 % stabs and a syncopated bass.
        reg('B2 (Si bemol M)', t, 8, 'Sib M')
        poner(c['lead3'], t, B2, 102)
        sacudida(c['seg3'], t, CH_B2, ['x..x..x..x..x...', 'x..x..x..x..x..x'], desde='A3', vel=74, caida=0.6)
        bajo(c['bajo'], t, CH_B2, ['0..0..8.0..0..8.'] * 3 + ['0..0..8.0.5.8.5.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X..x..x.X...x...', caja=['....x.......x...'] * 3 + ['....x.......x.x.'], hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=4, crash=100)
        t += 8 * L
        # Breakdown: bass riff and half-time drums alone, then a dark lead and a snare build.
        reg('Breakdown', t, 8, 'Re m')
        poner(c['lead3'], t, BRK, 90)
        bajo(c['bajo'], t, CH_I[:4], ['0.0.a.0.5.0.b.5.', '0.0.a.0.5.0.b.5.', '0.0.a.0.8.0.b.8.', '0.0.a.0.5.8.b.5.'], vel=102, caida=0.9)
        bajo(c['bajo'], t + 4 * L, CH_I[4:], ['0.......0.......', '0.......0.5.8.5.', '0.......0.......', '0.......0.0.0.0.'], vel=98, caida=0.95)
        arpegio(c['seg3'], t + 4 * L, CH_I[4:], patron=(0, 2, 1, 2), desde='D4', vel=56, dur=0.2)
        bat(c['rui'], t, 4, dict(bombo='X..x....X.......', caja='........X.......', hat='x.x.x.x.x.x.x.x.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......X.......', caja='........X.......', hat='o.o.o.o.o.o.o.o.'), fill=6)
        t += 8 * L
        # C: a new tune a tone higher, in E minor then G major.
        reg('C1 (tema nuevo)', t, 8, 'Mi m (+1 tono)')
        poner(c['lead'], t, C1, 104)
        sacudida(c['seg'], t, CH_C1, ['x-x-x-x-x-x-x-x-', 'x-x-x-x-x-x-x--x'], desde='A3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_C1, ['0.8.0.0.0.8.0.0.'] * 3 + ['0.8.0.0.0.8.8.0.'] + ['0.8.0.0.0.8.0.0.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=0, crash=104)
        t += 8 * L
        reg('C2 (Sol M)', t, 8, 'Sol M')
        poner(c['lead2'], t, C2, 104)
        arpegio(c['seg'], t, CH_C2, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='B3', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_C2, ['0.5.8.5.0.5.8.5.'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=5, crash=104)
        t += 8 * L
        # The hammering build, back to the minor.
        reg('Build martillo', t, 8, 'Sol m / Re m')
        poner(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='A3', vel=76, caida=0.55)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='A3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 3, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 3 * L, 'X.X.X.X.X.X.X.X.', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bat(c['rui'], t + 4 * L, 2, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 6 * L, 'X.X.X.X.X.X.X.X.', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        t += 8 * L
        # A3: the riff is back, ornamented, on the 50 % twin with a harmony.
        reg('A3 (vuelve)', t, 8, 'Re m')
        poner(c['lead2'], t, adorna(A, MEN, 0), 104)
        segunda_voz(c['seg'], t, A, CH_A, MEN, vel=82)
        bajo(c['bajo'], t, CH_A, ['0.0.8.0.0.0.8.0.'] * 3 + ['0.0.8.0.0.8.0.8.'] + ['0.0.8.0.0.0.8.0.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.x...x.', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=4, crash=104)
        t += 8 * L
        # A4: A2 with running arpeggios and doubled notes.
        reg('A4 (sube de nuevo)', t, 8, 'Re m')
        poner(c['lead'], t, adorna(A2, MEN, 2), 104)
        arpegio(c['seg3'], t, CH_A2, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='D4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_A2, ['0808008008080080'] * 3 + ['0080008000800080'] * 4 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='xxxxxxxxxxxxxxxx'), fill=3, crash=104)
        t += 8 * L
        # B3: the bright middle again, 12.5 % lead with turns, a second voice, a four-on-the-floor.
        reg('B3 (Fa M)', t, 8, 'Fa M')
        poner(c['lead3'], t, adorna(B, FA, 1), 102)
        segunda_voz(c['seg2'], t, B, CH_B, FA, vel=80)
        bajo(c['bajo'], t, CH_B, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'] + ['0080008000800080'] * 3 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=1, crash=104)
        t += 8 * L
        # Climax: the riff once more with the 50 % pulse an octave under it, gallop and full drums.
        reg('Climax', t, 8, 'Re m')
        poner(c['lead'], t, A, 106)
        poner(c['seg2'], t, A, 84, oct=-1)
        bajo(c['bajo'], t, CH_A, ['0808008008080080'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=102, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X..xX.x.X..xX.x.', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=6, crash=108)
        t += 8 * L
        # Outro: the riff slows down into long notes and ends on the dominant, ready for the toms of the intro.
        reg('Outro', t, 8, 'Re m')
        poner(c['lead2'], t, OUT, 98)
        sacudida(c['seg3'], t, CH_O, ['x---------------'] * 4 + ['x-x-x-x-x-x-x-x-'] * 3 + ['x---------------'], desde='A3', vel=70)
        bajo(c['bajo'], t, CH_O, ['0.......0.......'] * 4 + ['0.0.8.0.0.0.8.0.'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.95)
        bat(c['rui'], t, 4, dict(bombo='X.......x.......', caja='........x.......', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.....x.X.......', caja='....x.......x...', hat='x.x.x.x.x.x.x.x.'), fill=2)
        t += 8 * L
        return t

    return C, ronda, 112 * L, bpm


# ==================================================================================================
# COMBATE-ROCK: «Furgo a toda leche»  C minor, 144 bpm, 104 bars
# ==================================================================================================

def combate_rock():
    """Intro (8) - A riff (8) - A2 octave jumps (8) - B chorus in E flat (8) - B2 in A flat (8) - breakdown (8) - C in D minor/F, a tone up (16) -
    guitar solo (8) - hammering bridge (8) - A3 (8) - B3 (8) - outro (8)."""
    bpm = tempo(144)
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13, duty_lead=0.25)
    MEN = escala('C', 'menor')
    MIB = escala('Eb', 'mayor')
    CH_I = ['Cm', 'Cm', 'Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'G']
    CH_A = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Cm', 'Fm', 'G']
    CH_A2 = ['Cm', 'Cm', 'Ab', 'Eb', 'Bb', 'Bb', 'Fm', 'G']
    CH_B = ['Eb', 'Bb', 'Cm', 'Ab', 'Eb', 'Bb', 'Ab', 'G']
    CH_B2 = ['Ab', 'Eb', 'Fm', 'Cm', 'Db', 'Ab', 'Bb', 'G']
    CH_BK = ['Cm', 'Cm', 'Cm', 'Cm', 'Ab', 'Eb', 'Bb', 'G']
    CH_C1 = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Gm', 'Bb', 'A']
    CH_C2 = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'G']
    CH_C = ['Fm', 'Fm', 'Cm', 'Cm', 'Ab', 'G', 'Fm', 'G']
    CH_O = ['Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'Fm', 'G', 'G']
    A = frase('G5:3 G5:1 C6:3 Bb5:1 G5:2 Eb5:2 G5:4 | Eb5:3 Eb5:1 G5:3 F5:1 Eb5:2 C5:2 Eb5:4 | Eb6:3 C6:1 Ab5:3 C6:1 Eb6:4 -:4 | D6:3 Bb5:1 F5:3 Bb5:1 D6:2 F6:2 D6:4 |'
              'G5:3 G5:1 C6:3 Bb5:1 G5:2 Eb6:2 G6:4 | Eb6:3 D6:1 C6:3 Bb5:1 G5:2 Bb5:2 C6:4 | Ab5:3 C6:1 F6:3 Eb6:1 C6:2 Ab5:2 C6:4 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:4')
    A2 = frase('C6:2 -:2 C6:2 Eb6:2 G6:4 Eb6:2 C6:2 | Bb5:2 -:2 Bb5:2 C6:2 Eb6:4 C6:4 | Ab5:2 -:2 Ab5:2 C6:2 Eb6:4 Ab6:4 | G6:4 Eb6:4 Bb5:4 G5:4 |'
               'F6:2 -:2 F6:2 D6:2 Bb5:4 D6:4 | F6:4 D6:4 F6:4 Bb6:4 | Ab6:3 F6:1 C6:3 Ab5:1 C6:4 F6:4 | G5:1 B5:1 D6:1 G6:1 B6:4 G6:2 D6:2 B5:2 G5:2')
    B = frase('G5:4 Bb5:4 Eb6:8 | F6:4 D6:4 Bb5:8 | C6:4 Eb6:4 G6:8 | Eb6:4 C6:4 Ab5:6 C6:2 |'
              'Bb5:4 Eb6:4 G6:6 Eb6:2 | F6:4 D6:4 Bb5:4 D6:4 | Ab5:2 C6:2 Eb6:2 Ab6:2 Eb6:4 C6:4 | D6:4 B5:4 G5:4 B5:2 D6:2')
    CC = frase('C6:2 -:2 C6:2 -:2 F6:2 -:2 Ab6:2 -:2 | Ab6:2 -:2 Ab6:2 -:2 G6:2 -:2 F6:2 -:2 | G5:2 -:2 G5:2 -:2 C6:2 -:2 Eb6:2 -:2 | Eb6:2 -:2 Eb6:2 -:2 D6:2 -:2 C6:2 -:2 |'
               'Eb6:2 -:2 Eb6:2 -:2 C6:2 -:2 Ab5:2 -:2 | D6:2 -:2 D6:2 -:2 B5:2 -:2 G5:2 -:2 | C6:2 -:2 F6:2 -:2 Ab6:2 -:2 C7:2 -:2 | G5:1 Ab5:1 A5:1 Bb5:1 B5:1 C6:1 C#6:1 D6:1 Eb6:1 E6:1 F6:1 F#6:1 G6:4')
    INT = frase('-:16 | -:16 | -:16 | -:16 | Ab5:4 C6:4 Eb6:4 C6:4 | Bb5:4 D6:4 F6:4 D6:4 | G5:4 C6:4 Eb6:4 G6:4 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:4')
    B2 = frase('C6:3 C6:1 Eb6:2 Ab6:2 Eb6:4 C6:4 | Bb5:3 Bb5:1 Eb6:2 G6:2 Eb6:4 Bb5:4 | C6:3 C6:1 F6:2 Ab6:2 F6:4 C6:4 | G5:3 G5:1 C6:2 Eb6:2 G6:4 Eb6:4 |'
               'F6:3 F6:1 Ab6:2 F6:2 Db6:4 Ab5:4 | Eb6:3 Eb6:1 C6:2 Eb6:2 Ab6:8 | D6:2 F6:2 Bb6:4 Ab6:2 F6:2 D6:4 | D6:2 G6:2 B6:4 G6:2 D6:2 B5:4')
    BRK = frase('-:16 | -:16 | -:16 | -:16 | Ab5:4 -:2 C6:2 Eb6:4 -:2 C6:2 | Bb5:4 -:2 G5:2 Eb5:4 -:2 G5:2 | D6:4 -:2 F6:2 Bb6:4 -:2 F6:2 | D6:2 B5:2 G5:2 B5:2 D6:2 F6:2 G6:4')
    C1 = frase('A5:3 A5:1 D6:2 F6:2 A6:4 F6:4 | G6:3 F6:1 D6:2 A5:2 F5:4 A5:4 | D6:3 D6:1 F6:2 Bb6:2 F6:4 D6:4 | E6:3 E6:1 G6:2 E6:2 C6:4 G5:4 |'
               'F6:3 A6:1 F6:2 D6:2 A5:4 D6:4 | G6:3 Bb6:1 G6:2 D6:2 Bb5:4 D6:4 | F6:2 D6:2 Bb5:2 D6:2 F6:4 Bb6:4 | E6:2 C#6:2 A5:2 C#6:2 E6:4 A6:4')
    C2 = frase('A5:4 C6:4 F6:8 | G5:4 C6:4 E6:8 | F6:4 D6:4 A5:4 D6:4 | D6:4 Bb5:4 F5:4 Bb5:4 |'
               'C6:2 F6:2 A6:4 G6:2 F6:2 C6:4 | G6:2 E6:2 C6:4 E6:2 G6:2 E6:4 | D6:2 F6:2 Bb6:4 F6:2 D6:2 Bb5:4 | B5:2 D6:2 G6:4 D6:2 B5:2 G5:4')
    SOLO = frase('C6:1 Eb6:1 G6:1 Eb6:1 C6:1 Eb6:1 G6:1 Bb6:1 G6:1 Eb6:1 C6:1 Eb6:1 G6:4 | Bb6:1 G6:1 Eb6:1 G6:1 Bb6:1 G6:1 Eb6:1 C6:1 Bb5:1 C6:1 Eb6:1 G6:1 C7:4 |'
                 'Ab5:1 C6:1 Eb6:1 C6:1 Ab5:1 C6:1 Eb6:1 Ab6:1 Eb6:1 C6:1 Ab5:1 C6:1 Eb6:4 | Bb5:1 D6:1 F6:1 D6:1 Bb5:1 D6:1 F6:1 Bb6:1 F6:1 D6:1 Bb5:1 D6:1 F6:4 |'
                 'G6:2 Eb6:2 C6:2 Eb6:2 G6:2 Bb6:2 G6:4 | C7:2 Bb6:2 G6:2 Eb6:2 G6:2 Bb6:2 C7:4 | Ab6:2 F6:2 C6:2 F6:2 Ab6:2 C7:2 Ab6:4 | B6:2 G6:2 D6:2 G6:2 B6:2 D7:2 G6:1 A6:1 B6:1 C7:1')
    OUT = frase('G5:4 C6:4 Eb6:8 | Eb6:4 G5:4 C6:8 | Ab5:4 C6:4 Eb6:8 | D6:4 F6:4 Bb5:8 | Eb6:2 G6:2 C7:4 G6:2 Eb6:2 C6:4 | C6:4 Ab5:4 F5:8 | B5:2 D6:2 G6:4 D6:2 B5:2 G5:4 | G5:2 B5:2 D6:2 G6:2 -:8')
    for nombre, notas, ch in (('B2', B2, CH_B2), ('BRK', BRK, CH_BK), ('C1', C1, CH_C1), ('C2', C2, CH_C2), ('SOLO', SOLO, CH_A), ('OUT', OUT, CH_O), ('INT', INT, CH_I)):
        revisa(f'rock {nombre}', notas, [[a] for a in ch])

    def ronda(t):
        inicio(t)
        # Intro: power chords over a pedal, the riff teased at the end.
        reg('Intro', t, 8, 'Do m')
        poner(c['lead3'], t, INT, 92)
        sacudida(c['seg'], t, CH_I, ['x---------------', 'x---------------', 'x-----------x---', 'x-----------x-x-'] + ['x--x--x---x--x--'] * 4, desde='G3', vel=74)
        bajo(c['bajo'], t, CH_I, ['0.0.0.0.0.0.0.0.'] * 4 + ['0585058505850585'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=96, caida=0.85)
        bat(c['rui'], t, 4, dict(bombo='X.......', tom='....x...x...x...', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.....x...x.....', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.'), fill=2)
        t += 8 * L
        # A: the riff, syncopated power chords (3+3+4+3+3), the arpeggio bass running in sixteenths.
        reg('A (riff)', t, 8, 'Do m')
        poner(c['lead'], t, A, 102)
        sacudida(c['seg'], t, CH_A, 'x--x--x---x--x--', desde='G3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_A, ['0585058505850585'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=96, caida=0.85)
        bat(c['rui'], t, 8, dict(bombo=['X.....x...x.....'] * 3 + ['X.....x...x...x.'], caja='....X.......X...', hat='x.x.x.x.x.x.x.x.'), fill=0, crash=100)
        t += 8 * L
        # A2: the tune jumps octaves, chip chords on the off-beats, the bass turns to root-fifth-third-octave.
        reg('A2 (octavas)', t, 8, 'Do m')
        poner(c['lead'], t, A2, 104)
        sacudida(c['seg'], t, CH_A2, 'x-x-x-x-x-x-x--x', desde='G3', vel=74, caida=0.6)
        bajo(c['bajo'], t, CH_A2, ['0538053805380538'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.85)
        bat(c['rui'], t, 8, dict(bombo='X.....x...x...x.', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=1, crash=100)
        t += 8 * L
        # B: the chorus in E flat, long notes on the 50 % twin, fast broken chords, a bouncing bass.
        reg('B (Mi bemol M)', t, 8, 'Mib M')
        poner(c['lead2'], t, B, 100)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 1, 0, 1, 2, 3), desde='Eb4', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0080008000800080'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=3, crash=100)
        t += 8 * L
        # B2: a second chorus in A flat: 12.5 % lead, pumping eighth-note stabs, a walking-fifth bass.
        reg('B2 (La bemol M)', t, 8, 'Lab M')
        poner(c['lead3'], t, B2, 102)
        sacudida(c['seg3'], t, CH_B2, ['x.x.x.x.x.x.x.x.'] * 3 + ['x.x.x.x.x.x.x--x'], desde='G3', vel=72, caida=0.55)
        bajo(c['bajo'], t, CH_B2, ['0.5.0.5.0.5.0.5.'] * 3 + ['0.5.0.5.0.5.8.5.'], vel=98)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=4, crash=100)
        t += 8 * L
        # Breakdown: a bass riff and half-time drums alone, then the lead enters and a snare roll builds.
        reg('Breakdown', t, 8, 'Do m')
        poner(c['lead3'], t, BRK, 90)
        bajo(c['bajo'], t, CH_BK[:4], ['0.0.0.a.0.0.5.b.', '0.0.0.a.0.0.5.b.', '0.0.0.a.0.5.8.5.', 'b.b.b.5.5.0.0.a.'], vel=102, caida=0.9)
        bajo(c['bajo'], t + 4 * L, CH_BK[4:], ['0.......0.......', '0.......0.5.8.5.', '0.......0.......', '0.......0.0.0.0.'], vel=98, caida=0.95)
        arpegio(c['seg3'], t + 4 * L, CH_BK[4:], patron=(0, 2, 1, 2), desde='G3', vel=56, dur=0.2)
        bat(c['rui'], t, 4, dict(bombo='X..x....X.......', caja='........X.......', hat='x.x.x.x.x.x.x.x.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......X.......', caja='........X.......', hat='o.o.o.o.o.o.o.o.'), fill=6)
        t += 8 * L
        # C: a new tune a tone higher, D minor then F major.
        reg('C1 (tema nuevo)', t, 8, 'Re m (+1 tono)')
        poner(c['lead'], t, C1, 104)
        sacudida(c['seg'], t, CH_C1, ['x--x--x---x--x--'] * 3 + ['x--x--x---x-x-x-'], desde='A3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_C1, ['0585058505850585'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.85)
        bat(c['rui'], t, 8, dict(bombo='X.....x...x.....', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=0, crash=104)
        t += 8 * L
        reg('C2 (Fa M)', t, 8, 'Fa M')
        poner(c['lead2'], t, C2, 104)
        arpegio(c['seg'], t, CH_C2, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='C4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_C2, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'] + ['0.8.0.8.0.8.0.8.'] * 3 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=5, crash=104)
        t += 8 * L
        # Solo: fast runs over the riff's changes, the arpeggio bass keeps going.
        reg('Solo', t, 8, 'Do m')
        poner(c['lead3'], t, SOLO, 104)
        sacudida(c['seg3'], t, CH_A, 'x--x--x---x--x--', desde='G3', vel=70, caida=0.7)
        bajo(c['bajo'], t, CH_A, ['0585058505850585'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.85)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='xxxxxxxxxxxxxxxx'), fill=6, crash=104)
        t += 8 * L
        # The hammering bridge.
        reg('Puente martillo', t, 8, 'Fa m / Do m')
        poner(c['lead'], t, CC, 104)
        sacudida(c['seg'], t, CH_C[:6], 'x.x.x.x.x.x.x.x.', desde='G3', vel=76, caida=0.55)
        sacudida(c['seg'], t + 6 * L, CH_C[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='G3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_C, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 3, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 3 * L, 'X.X.X.X.X.X.X.X.', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bat(c['rui'], t + 4 * L, 2, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 6 * L, 'X.X.X.X.X.X.X.X.', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        t += 8 * L
        # A3: the riff is back, ornamented, with a harmony and a harder beat.
        reg('A3 (vuelve)', t, 8, 'Do m')
        poner(c['lead2'], t, adorna(A, MEN, 0), 104)
        segunda_voz(c['seg'], t, A, CH_A, MEN, vel=82)
        bajo(c['bajo'], t, CH_A, ['0538053805380538'] * 3 + ['0585058505850585'] * 4 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.85)
        bat(c['rui'], t, 8, dict(bombo='X.....x...x...x.', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo', abierto='..............x.'), fill=4, crash=104)
        t += 8 * L
        # B3: the chorus with turns, a second voice and the four on the floor.
        reg('B3 (Mib M)', t, 8, 'Mib M')
        poner(c['lead3'], t, adorna(B, MIB, 1), 102)
        segunda_voz(c['seg2'], t, B, CH_B, MIB, vel=80)
        bajo(c['bajo'], t, CH_B, ['0080008000800080'] * 3 + ['0.5.8.5.0.5.8.5.'] + ['0080008000800080'] * 3 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo', abierto='..x...x...x...x.'), fill=1, crash=106)
        t += 8 * L
        # Outro: long notes, power chords, and the dominant to lead back into the intro.
        reg('Outro', t, 8, 'Do m')
        poner(c['lead2'], t, OUT, 98)
        sacudida(c['seg'], t, CH_O, ['x--x--x---x--x--'] * 4 + ['x-x-x-x-x-x-x-x-'] * 3 + ['x---------------'], desde='G3', vel=72, caida=0.7)
        bajo(c['bajo'], t, CH_O, ['0.0.0.0.0.0.0.0.'] * 4 + ['0585058505850585'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=96, caida=0.85)
        bat(c['rui'], t, 4, dict(bombo='X.....x...x.....', caja='....X.......X...', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.....x...x.....', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.'), fill=2)
        t += 8 * L
        return t

    return C, ronda, 104 * L, bpm


# ==================================================================================================
# FINAL: «Dos en pie»  E minor, 172 bpm, 120 bars
# ==================================================================================================

def final():
    """Intro (8) - A menacing riff (8) - A' with a harmony (8) - B soaring (8) - B2 (8) - breakdown (8) - C in F sharp minor, a tone up (16) -
    climbing build (8) - A'' (8) - A''' with a counter-line (8) - B3 (8) - C back in E minor (8) - climax (8) - outro (8)."""
    bpm = tempo(172)
    C = Cancion(bpm)
    c = voces(C, vol_lead=-5, vol_seg=-1, vol_bajo=-1, vol_rui=-13)
    MEN = escala('E', 'menor')
    SOL = escala('G', 'mayor')
    FSM = escala('F#', 'menor')
    CH_I = ['Em', 'F', 'Em', 'F', 'Em', 'F', 'B7', 'B7']
    CH_A = ['Em', 'F', 'Em', 'F', 'Em', 'C', 'D', 'B7']
    CH_B = ['C', 'D', 'Em', 'Em', 'C', 'D', 'B7', 'B7']
    CH_B2 = ['C', 'D', 'G', 'Em', 'Am', 'D', 'B7', 'B7']
    CH_BK = ['Em', 'Em', 'Em', 'Em', 'C', 'D', 'Em', 'C#']
    CH_C1 = ['F#m', 'D', 'A', 'E', 'F#m', 'D', 'A', 'C#']
    CH_C2 = ['A', 'E', 'F#m', 'D', 'Bm', 'E', 'C#', 'C#']
    CH_BU = ['F#m', 'F#m', 'G', 'G', 'Am', 'Am', 'B7', 'B7']
    CH_PK = ['Em', 'C', 'G', 'D', 'Em', 'C', 'G', 'B']
    CH_O = ['Em', 'F', 'Em', 'F', 'Em', 'C', 'D', 'B7']
    A = frase('E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:2 B5:2 | F5:2 A5:2 C6:2 F6:2 D6:2 C6:2 A5:2 C6:2 | E5:2 G5:2 B5:2 E6:2 G6:4 F#6:2 E6:2 | F6:4 D6:4 C6:4 A5:4 |'
              'B5:4 E6:4 G6:4 B6:4 | G6:4 E6:4 C6:4 E6:4 | A6:4 F#6:4 D6:4 F#6:4 | B5:2 D#6:2 F#6:2 A6:2 G#6:2 F#6:2 D#6:2 B5:2')
    B = frase('G5:4 C6:4 E6:8 | F#5:4 A5:4 D6:8 | G5:4 B5:4 E6:8 | D6:4 B5:4 G5:8 |'
              'E6:6 D6:2 C6:4 G5:4 | F#6:6 E6:2 D6:4 A5:4 | D#6:4 F#6:4 B6:4 A6:4 | G#6:2 A6:2 G#6:2 F#6:2 D#6:8')
    INT = frase('-:16 | -:16 | -:16 | -:16 | E5:2 G5:2 B5:4 -:8 | F5:2 A5:2 C6:4 -:8 | B5:2 D#6:2 F#6:4 A6:2 F#6:2 D#6:4 | B5:4 -:4 D#6:2 F#6:2 B6:2 A6:2')
    B2 = frase('G5:2 C6:2 E6:4 G6:4 E6:4 | A5:2 D6:2 F#6:4 A6:4 F#6:4 | B5:2 D6:2 G6:4 B6:4 G6:4 | E6:4 B5:4 G5:4 B5:4 |'
               'C6:2 E6:2 A6:4 E6:4 C6:4 | D6:2 F#6:2 A6:4 F#6:4 D6:4 | B5:2 D#6:2 F#6:2 A6:2 B6:8 | A6:2 F#6:2 D#6:2 B5:2 A5:2 F#5:2 D#5:2 B4:2')
    BRK = frase('-:16 | -:16 | -:16 | -:16 | E6:4 -:4 G6:4 -:4 | F#6:4 -:4 A6:4 -:4 | G6:4 -:2 E6:2 B5:4 -:4 | G#5:2 C#6:2 F6:4 E6:2 C#6:2 G#5:4')
    C1 = frase('F#6:3 C#6:1 F#6:2 A6:2 F#6:4 C#6:4 | D6:3 A5:1 D6:2 F#6:2 A6:4 F#6:4 | A5:3 C#6:1 E6:2 A6:2 E6:4 C#6:4 | G#5:3 B5:1 E6:2 G#6:2 E6:4 B5:4 |'
               'A6:3 F#6:1 C#6:2 F#6:2 A6:4 F#6:4 | F#6:3 D6:1 A5:2 D6:2 F#6:4 A6:4 | E6:3 C#6:1 A5:2 C#6:2 E6:4 A6:4 | G#6:2 F6:2 C#6:2 G#5:2 F5:2 G#5:2 C#6:4')
    C2 = frase('C#6:4 E6:4 A6:8 | B5:4 E6:4 G#6:8 | A6:4 F#6:4 C#6:4 F#6:4 | F#6:4 D6:4 A5:4 D6:4 |'
               'B5:2 D6:2 F#6:4 B6:4 F#6:4 | G#6:2 E6:2 B5:4 E6:2 G#6:2 B6:4 | C#6:2 F6:2 G#6:4 F6:2 C#6:2 G#5:4 | F6:2 G#6:2 C#7:4 G#6:4 F6:4')
    BU = frase('F#5:2 -:2 F#5:2 -:2 A5:2 -:2 C#6:2 -:2 | F#5:2 -:2 F#5:2 -:2 A5:2 -:2 F#5:2 A5:2 | G5:2 -:2 G5:2 -:2 B5:2 -:2 D6:2 -:2 | G5:2 -:2 G5:2 -:2 B5:2 -:2 A5:2 G5:2 |'
               'A5:2 -:2 A5:2 -:2 C6:2 -:2 E6:2 -:2 | A5:2 -:2 A5:2 -:2 C6:2 -:2 B5:2 A5:2 | B5:2 D#6:2 F#6:2 B6:2 A6:2 F#6:2 D#6:2 B5:2 | B5:1 C6:1 C#6:1 D6:1 D#6:1 E6:1 F6:1 F#6:1 G6:1 G#6:1 A6:1 A#6:1 B6:4')
    OUT = frase('B5:4 E6:4 G6:8 | A5:4 C6:4 F6:8 | B5:4 G6:4 E6:8 | F6:4 D6:4 C6:8 | E6:4 G6:4 B6:8 | C6:4 E6:4 G6:8 | D6:4 F#6:4 A6:8 | B5:2 D#6:2 F#6:4 -:8')
    CONTRA = frase('B4:8 G4:8 | C5:8 A4:8 | B4:8 G4:8 | C5:8 A4:8 | G4:8 B4:8 | E5:8 G5:8 | F#5:8 A5:8 | D#5:8 F#5:8')
    PK = adorna(sube(C1, -2), MEN, 0)
    for nombre, notas, ch in (('INT', INT, CH_I), ('B2', B2, CH_B2), ('BRK', BRK, CH_BK), ('C1', C1, CH_C1), ('C2', C2, CH_C2), ('BU', BU, CH_BU), ('OUT', OUT, CH_O),
                              ('CONTRA', CONTRA, CH_A)):
        revisa(f'final {nombre}', notas, [[a] for a in ch])
    GAL = 'X..xX.x.X..xX.x.'

    def ronda(t):
        inicio(t)
        # Intro: a menacing pedal, hats that speed up, the riff teased and a B7 to lean on.
        reg('Intro', t, 8, 'Mi m')
        poner(c['lead3'], t, INT, 92)
        arpegio(c['seg3'], t, CH_I, patron=(0, 2, 1, 2), desde='E3', vel=60, dur=0.2)
        bajo(c['bajo'], t, CH_I, ['0.......0.......'] * 2 + ['0.0.0.0.0.0.0.0.'] * 2 + ['0800080008000800'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=96, caida=0.9)
        bat(c['rui'], t, 2, dict(hat='o...o...o...o...'))
        bat(c['rui'], t + 2 * L, 2, dict(bombo='X.......', hat='o.o.o.o.o.o.o.o.', tom='............x.x.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo=GAL, caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=2)
        t += 8 * L
        # A: the menacing riff, held chip chords, a bouncing sixteenth pedal.
        reg('A (riff)', t, 8, 'Mi m')
        poner(c['lead'], t, A, 104)
        sacudida(c['seg'], t, CH_A, 'x---------------', desde='G3', vel=74)
        bajo(c['bajo'], t, CH_A, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo=[GAL] * 3 + ['X..xX.x.X..xX.xx'], caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=0, crash=104)
        t += 8 * L
        # A': a harmony under the riff, the busiest drums.
        reg("A' (voz 2)", t, 8, 'Mi m')
        poner(c['lead'], t, A, 106)
        segunda_voz(c['seg'], t, A, CH_A, MEN, vel=82)
        bajo(c['bajo'], t, CH_A, ['0800080008000800'] * 3 + ['0850085008500850'] * 4 + ['0.0.0.0.0.0.0.0.'], vel=102, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo=GAL, caja='....X.......X...', hat='xxxxxxxxxxxxxxxx'), fill=1, crash=104)
        t += 8 * L
        # B: soaring long notes on the 50 % twin over fast arpeggios and a pounding four on the floor.
        reg('B (vuelo)', t, 8, 'Do M / Mi m')
        poner(c['lead2'], t, B, 102)
        arpegio(c['seg'], t, CH_B, patron=(0, 1, 2, 3, 2, 1, 2, 3), desde='C4', vel=72, dur=0.2)
        bajo(c['bajo'], t, CH_B, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..x...x...x...x.'), fill=3, crash=104)
        t += 8 * L
        # B2: a second flight, 25 % lead, stabs in eighths, a driving octave bass.
        reg('B2 (vuelo 2)', t, 8, 'Sol M / Mi m')
        poner(c['lead'], t, B2, 102)
        sacudida(c['seg3'], t, CH_B2, ['x.x.x.x.x.x.x.x.'] * 3 + ['x.x.x.x.x.x.x--x'], desde='G3', vel=72, caida=0.55)
        bajo(c['bajo'], t, CH_B2, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X..xX..xX..xX..x', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=4, crash=104)
        t += 8 * L
        # Breakdown: half-time, a chromatic bass riff alone, then a bare lead and a roll to the key change.
        reg('Breakdown', t, 8, 'Mi m')
        poner(c['lead3'], t, BRK, 90)
        bajo(c['bajo'], t, CH_BK[:4], ['0..0..0.a..a..b.', '0..0..0.a..a..b.', '0..0..5.b..b..a.', '0.0.0.a.b.b.5.5.'], vel=102, caida=0.9)
        bajo(c['bajo'], t + 4 * L, CH_BK[4:], ['0.......0.......', '0.......0.......', '0.......0.5.8.5.', '0.......0.0.0.0.'], vel=98, caida=0.95)
        arpegio(c['seg3'], t + 4 * L, CH_BK[4:], patron=(0, 2, 1, 2), desde='E3', vel=56, dur=0.2)
        bat(c['rui'], t, 4, dict(bombo='X..x....X.......', caja='........X.......', hat='x.x.x.x.x.x.x.x.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo='X.......X.......', caja='........X.......', hat='o.o.o.o.o.o.o.o.'), fill=6)
        t += 8 * L
        # C: a new tune a tone higher, in F sharp minor then A major.
        reg('C1 (tema nuevo)', t, 8, 'Fa# m (+1 tono)')
        poner(c['lead'], t, C1, 104)
        sacudida(c['seg'], t, CH_C1, ['x--x--x---x--x--'] * 3 + ['x--x--x---x-x-x-'], desde='A3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_C1, ['0800080008000800'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=5, crash=106)
        t += 8 * L
        reg('C2 (La M)', t, 8, 'La M / Fa# m')
        poner(c['lead2'], t, C2, 104)
        arpegio(c['seg'], t, CH_C2, patron=(0, 1, 2, 3, 4, 3, 2, 1), desde='A3', vel=70, dur=0.2)
        bajo(c['bajo'], t, CH_C2, ['0.5.8.5.0.5.8.5.'] * 7 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo', abierto='..x...x...x...x.'), fill=4, crash=106)
        t += 8 * L
        # Build: stabs climbing by semitones and tones up to B7, then a chromatic run.
        reg('Build ascendente', t, 8, 'Fa# m a Si 7')
        poner(c['lead'], t, BU, 104)
        sacudida(c['seg'], t, CH_BU[:6], 'x.x.x.x.x.x.x.x.', desde='A3', vel=76, caida=0.55)
        sacudida(c['seg'], t + 6 * L, CH_BU[6:], ['x.x.x.x.x.x.x.x.', 'x---------------'], desde='A3', vel=76, caida=0.55)
        bajo(c['bajo'], t, CH_BU, ['0.0.0.0.0.0.0.0.'] * 6 + ['0.0.8.0.0.0.8.0.', '0.0.0.0.0.0.0.0.'], vel=100)
        bat(c['rui'], t, 3, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 3 * L, 'X.X.X.X.X.X.X.X.', '....x.......xxxx', 'o.o.o.o.o.o.o.o.')
        bat(c['rui'], t + 4 * L, 2, dict(bombo='X.X.X.X.X.X.X.X.', caja='....x.......x...', hat='o.o.o.o.o.o.o.o.'))
        bateria(c['rui'], t + 6 * L, 'X.X.X.X.X.X.X.X.', '....X.......X...', 'xoxoxoxoxoxoxoxo')
        redoble(c['rui'], t + 7 * L, 40, 118)
        t += 8 * L
        # A'': the riff returns on the 50 % pulse, ornamented, over fast arpeggios.
        reg("A'' (vuelve)", t, 8, 'Mi m')
        poner(c['lead2'], t, adorna(A, MEN, 0), 104)
        arpegio(c['seg3'], t, CH_A, patron=(0, 1, 2, 3, 2, 1), desde='E4', vel=68, dur=0.2)
        bajo(c['bajo'], t, CH_A, ['0808008008080080'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=100, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo=GAL, caja='....X.......X...', hat='xoxoxoxoxoxoxoxo', abierto='..............x.'), fill=3, crash=106)
        t += 8 * L
        # A''': 12.5 % lead with doubled notes over a long counter-line.
        reg("A''' (contracanto)", t, 8, 'Mi m')
        poner(c['lead3'], t, adorna(A, MEN, 2), 104)
        poner(c['seg2'], t, CONTRA, 82)
        bajo(c['bajo'], t, CH_A, ['0850085008500850'] * 7 + ['0.0.0.0.0.0.0.0.'], vel=102, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X..xX.x.X..xX.xx', caja='....X.......X...', hat='xxxxxxxxxxxxxxxx'), fill=1, crash=106)
        t += 8 * L
        # B3: the flight again with turns and a second voice.
        reg('B3 (vuelo 3)', t, 8, 'Do M / Mi m')
        poner(c['lead2'], t, adorna(B, MEN, 1), 104)
        segunda_voz(c['seg'], t, B, CH_B, SOL, vel=80)
        bajo(c['bajo'], t, CH_B, ['0800080008000800'] * 3 + ['0850085008500850'] * 4 + ['0.0.0.0.0.0.8.8.'], vel=102, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo='X...X...X...X...', caja='....X.......X...', hat='xoxoxoxoxoxoxoxo', abierto='..x...x...x...x.'), fill=0, crash=106)
        t += 8 * L
        # C comes back down in E minor.
        reg('C (vuelve en Mi m)', t, 8, 'Mi m')
        poner(c['lead'], t, PK, 104)
        sacudida(c['seg3'], t, CH_PK, ['x--x--x---x--x--'] * 3 + ['x--x--x---x-x-x-'] + ['x--x--x---x--x--'] * 3 + ['x---------------'], desde='G3', vel=74, caida=0.7)
        bajo(c['bajo'], t, CH_PK, ['0.8.0.8.0.8.0.8.'] * 3 + ['0.8.0.8.0.5.8.5.'] + ['0.8.0.8.0.8.0.8.'] * 3 + ['0.0.0.0.0.0.8.8.'], vel=100)
        bat(c['rui'], t, 8, dict(bombo='X.....x.X.....x.', caja='....X.......X...', hat='x.x.x.x.x.x.x.x.', abierto='..............x.'), fill=6, crash=106)
        t += 8 * L
        # Climax: the riff at full tilt with turns, double-time drums.
        reg('Climax', t, 8, 'Mi m')
        poner(c['lead'], t, adorna(A, MEN, 1), 108)
        sacudida(c['seg2'], t, CH_A, ['x-x-x-x-x-x-x-x-'] * 7 + ['x---------------'], desde='G3', vel=76, caida=0.7)
        bajo(c['bajo'], t, CH_A, ['0808008008080080'] * 3 + ['0850085008500850'] * 4 + ['0.0.0.0.0.0.0.0.'], vel=102, caida=0.78)
        bat(c['rui'], t, 8, dict(bombo=GAL, caja='..x.X.x...x.X.x.', hat='xxxxxxxxxxxxxxxx'), fill=6, crash=108)
        t += 8 * L
        # Outro: long notes over the pedal, ending on B7, ready for the intro.
        reg('Outro', t, 8, 'Mi m')
        poner(c['lead2'], t, OUT, 98)
        sacudida(c['seg3'], t, CH_O, ['x---------------'] * 4 + ['x-x-x-x-x-x-x-x-'] * 3 + ['x---------------'], desde='G3', vel=70)
        bajo(c['bajo'], t, CH_O, ['0.......0.......'] * 4 + ['0800080008000800'] * 3 + ['0.0.0.0.0.0.0.0.'], vel=98, caida=0.9)
        bat(c['rui'], t, 4, dict(bombo='X.......x.......', caja='........X.......', hat='o.o.o.o.o.o.o.o.'))
        bat(c['rui'], t + 4 * L, 4, dict(bombo=GAL, caja='....X.......X...', hat='xoxoxoxoxoxoxoxo'), fill=2)
        t += 8 * L
        return t

    return C, ronda, 120 * L, bpm


PIEZAS = {'titulo': titulo, 'draft': draft, 'combate': combate, 'combate-rock': combate_rock, 'final': final}


if __name__ == '__main__':
    pedidas = sys.argv[1:2] or ['todas']
    if pedidas == ['todas']:
        pedidas = list(PIEZAS)
    for nombre in pedidas:
        if nombre not in PIEZAS:
            sys.exit(f'No conozco «{nombre}»: {", ".join([*PIEZAS, "todas"])}')
        salir(nombre, PIEZAS[nombre])
