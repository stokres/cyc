# Mix check without ears: renders each instrument alone and measures its loudness
# (RMS while it plays, in dB), so the tune can be checked to sit above the backing.
import sys, subprocess, os, tempfile, numpy as np, mido

SF = os.environ.get('SF', '/usr/share/sounds/sf2/MuseScore_General_Full.sf2')
NOMBRES_GM = {56: 'trompeta', 57: 'trombón', 58: 'tuba', 61: 'metales', 71: 'clarinete', 72: 'flautín', 65: 'saxo alto', 40: 'violín', 3: 'piano honky-tonk', 47: 'timbales', 44: 'cuerdas trémolo', 10: 'caja de música', 8: 'celesta', 80: 'onda cuadrada', 21: 'acordeón', 9: 'glockenspiel',
              13: 'xilófono', 48: 'cuerdas', 45: 'pizzicato', 70: 'fagot', 73: 'flauta', 78: 'silbato', 60: 'trompa', 0: 'piano', 32: 'contrabajo', 33: 'bajo', 24: 'guitarra', 105: 'banjo', 25: 'guitarra acústica'}

def rms_db(wav):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    v = np.array([np.sqrt(np.mean(x[i:i + 2205] ** 2)) for i in range(0, len(x) - 2205, 2205)])
    activo = v[v > 1e-3]
    return 20 * np.log10(np.mean(activo) + 1e-9) if len(activo) else -99

def main(ruta, gain):
    mid = mido.MidiFile(ruta)
    filas = []
    with tempfile.TemporaryDirectory() as d:
        for i, pista in enumerate(mid.tracks[1:], 1):
            prog = next((m.program for m in pista if m.type == 'program_change'), None)
            canal = next((m.channel for m in pista if hasattr(m, 'channel')), None)
            solo = mido.MidiFile(ticks_per_beat=mid.ticks_per_beat)
            solo.tracks.append(mid.tracks[0])
            solo.tracks.append(pista)
            f = os.path.join(d, f'{i}.mid')
            w = os.path.join(d, f'{i}.wav')
            solo.save(f)
            subprocess.run(['fluidsynth', '-ni', '-q', '-g', str(gain), '-r', '22050', '-F', w, SF, f], capture_output=True)
            nombre = 'batería' if canal == 9 else NOMBRES_GM.get(prog, f'programa {prog}')
            filas.append((rms_db(w), f'canal {canal:2} {nombre}'))
    for db, nombre in sorted(filas, reverse=True):
        print(f'  {db:6.1f} dB  {nombre}')

if __name__ == '__main__':
    main(sys.argv[1], float(sys.argv[2]) if len(sys.argv) > 2 else 0.5)
