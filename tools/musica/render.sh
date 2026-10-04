#!/bin/sh
# render.sh name [gain]: MIDI -> WAV (FluidR3 GM, reverb and chorus on) -> loudness-normalised MP3.
set -e
g=${2:-0.5}
fluidsynth -ni -q -g "$g" -r 44100 -R 1 -C 1 -F "$1.wav" /usr/share/sounds/sf2/FluidR3_GM.sf2 "$1.mid" 2>/dev/null
ffmpeg -hide_banner -loglevel error -y -i "$1.wav" -af "silenceremove=stop_periods=-1:stop_duration=1.5:stop_threshold=-60dB,lowpass=f=15000,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100,alimiter=limit=0.75:level=false,volume=0.92" -ar 44100 -b:a 192k "$1.mp3"
