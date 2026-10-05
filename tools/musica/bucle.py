# A seamless loop for the game, from a MIDI with three identical rounds (galop.py bucle):
# keeps the middle round plus MARGEN seconds of the rounds either side, so the game can loop
# between MARGEN and MARGEN + length whatever silence a phone's decoder adds at the start.
# A fixed gain (not a moving normaliser, which would break the join), MP3 (every browser decodes it).
#   python3 bucle.py galop-bucle 50.526316 ../../src/sonido/galop.mp3 [kbps]
import subprocess, sys, numpy as np
from scipy.io import wavfile

nombre, largo, salida = sys.argv[1], float(sys.argv[2]), sys.argv[3]
kbps = sys.argv[4] if len(sys.argv) > 4 else '192'
MARGEN = 0.5
SR = 44100
subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.5', '-r', str(SR), '-R', '1', '-C', '1', '-F', f'{nombre}.wav',
                '/usr/share/sounds/sf2/MuseScore_General_Full.sf2', f'{nombre}.mid'], check=True, capture_output=True)
sr, x = wavfile.read(f'{nombre}.wav')
x = x.astype(np.float64) / 32768
i0 = int(round((largo - MARGEN) * SR))
i1 = int(round((2 * largo + MARGEN) * SR))
trozo = x[i0:i1]
# Loudness: the middle round at about -17 dB RMS, never past 0.9.
medio = trozo[int(MARGEN * SR):int((MARGEN + largo) * SR)]
rms = np.sqrt(np.mean(medio ** 2))
g = min(10 ** (-17 / 20) / rms, 0.9 / np.max(np.abs(trozo)))
trozo *= g
# The join. The rounds are the same music but not the same samples (the synth's blocks and
# chorus fall differently each time), so jumping from the end back to the start could click.
# Towards the end of the loop, crossfade into what really comes before its start (the end of
# the previous round, kept in the margin): from LISTO before the end on, the audio *is* that,
# so the jump back is between two consecutive samples of one recording. LISTO also covers the
# silence a decoder may add at the start (MP3 or AAC: up to ~50 ms), which shifts everything.
FUNDIDO, LISTO = 0.14, 0.06
fin = int(round((MARGEN + largo) * SR))
desplaza = fin - int(MARGEN * SR)  # one loop, in samples
f0 = fin - int((FUNDIDO + LISTO) * SR)
f1 = fin - int(LISTO * SR)
original = trozo.copy()
for k in range(f0, len(trozo)):
    w = min(1.0, (k - f0) / (f1 - f0))
    w = 0.5 - 0.5 * np.cos(np.pi * w)  # smooth
    trozo[k] = (1 - w) * original[k] + w * original[k - desplaza]
# Check: the jump back, with no decoder offset and with the usual AAC ones, against the
# ordinary sample-to-sample step of the music.
paso = np.median(np.abs(np.diff(trozo[:, 0])))
for d in (0, 1024, 2112):
    salto = np.max(np.abs(trozo[fin - 1 - d] - trozo[int(MARGEN * SR) - d]))
    print(f'  junta con {d:4} muestras de desfase: salto {salto:.4f} (paso normal {paso:.4f})')
print(f'ganancia {20 * np.log10(g):+.1f} dB, pico {np.max(np.abs(trozo)):.2f}')
wavfile.write(f'{nombre}-corte.wav', SR, (trozo * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{nombre}-corte.wav', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', salida], check=True)
print(f'{salida}: {len(trozo) / SR:.2f} s, bucle de {MARGEN} a {MARGEN + largo:.6f} s')
