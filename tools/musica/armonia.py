# Strong-beat melody notes against the chord: flags a semitone clash with a chord tone
# (allowed: chord tones and the usual tensions 9, 11 on minor, 13).
import importlib, sys, io, contextlib
from partitura import n
with contextlib.redirect_stdout(io.StringIO()):
    jazz = importlib.import_module('jazz')
NOMBRE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
def revisa(nombre, tema, acordes_por_compas, tonos_de):
    malas = []
    for i, compas in enumerate(tema):
        cs = acordes_por_compas[i]
        for (b, d, t) in compas:
            if b % 1 != 0 or d < 1:
                continue  # passing notes are fine
            ch = cs[0] if len(cs) == 1 or b < 2 else cs[1]
            pcs = {n(x) % 12 for x in tonos_de(ch)}
            p = n(t) % 12
            if p in pcs:
                continue
            if any((p - c) % 12 in (1, 11) for c in pcs):
                malas.append(f'compás {i + 1}, tiempo {b + 1}: {t} sobre {ch}')
    print(nombre, 'choques de semitono en tiempos fuertes:', malas or 'ninguno')
revisa('jazz', jazz.TEMA, jazz.COMPASES, lambda ch: jazz.V[ch][0])
