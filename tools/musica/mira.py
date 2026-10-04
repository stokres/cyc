# A picture to check a render without ears: spectrogram (log frequency) and loudness over time.
#   python3 mira.py pieza.mp3 [desde_s] [hasta_s]   -> pieza.png
import sys, subprocess, numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ruta = sys.argv[1]
desde = float(sys.argv[2]) if len(sys.argv) > 2 else 0
hasta = float(sys.argv[3]) if len(sys.argv) > 3 else None
sr = 22050
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-f', 'f32le', '-ac', '1', '-ar', str(sr), '-'], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
x = x[int(desde * sr):int(hasta * sr) if hasta else None]
fig, (a, b) = plt.subplots(2, 1, figsize=(14, 7), gridspec_kw={'height_ratios': [3, 1]}, sharex=True)
a.specgram(x, NFFT=2048, Fs=sr, noverlap=1536, cmap='magma', vmin=-110, vmax=-20, xextent=(desde, desde + len(x) / sr))
a.set_yscale('symlog', linthresh=200)
a.set_ylim(30, sr / 2)
a.set_ylabel('Hz')
w = sr // 20
v = np.sqrt(np.mean(x[:len(x) // w * w].reshape(-1, w) ** 2, axis=1))
b.plot(desde + np.arange(len(v)) * w / sr, 20 * np.log10(v + 1e-9))
b.set_ylim(-50, 0)
b.set_ylabel('dB')
b.set_xlabel('s')
b.grid(alpha=0.3)
plt.tight_layout()
plt.savefig(ruta.rsplit('.', 1)[0] + '.png', dpi=70)
