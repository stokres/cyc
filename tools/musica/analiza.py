# Numbers I can check without ears: length, peak, loudness over time, clipping, silences.
import sys, subprocess, numpy as np
for f in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    sr = 22050
    seg = len(x) / sr
    pico = float(np.max(np.abs(x)))
    clip = int(np.sum(np.abs(x) > 0.995))
    v = [float(np.sqrt(np.mean(x[i:i + sr] ** 2)) + 1e-9) for i in range(0, len(x) - sr, sr)]
    db = [round(20 * np.log10(a)) for a in v]
    silencios = sum(1 for d in db if d < -45)
    print(f'{f}: {seg:.1f} s, pico {pico:.2f}, muestras saturadas {clip}, segundos en silencio {silencios}')
    print('  dB por segundo:', ' '.join(str(d) for d in db))
