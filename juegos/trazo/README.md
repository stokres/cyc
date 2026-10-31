# Trazo

![Trazo: an ink drop rolls along a hand-drawn line while an ink blot chases it](og.jpg)

An endless ink-on-paper browser game. You draw the ground for a little ink drop, and it rolls along whatever you draw while a hungry ink blot chases it.

**Play:** https://mariomka.github.io/trazo/

## How to play

- **Draw** with your mouse or finger inside the dotted circle around the drop. The drop slides along your lines: downhill it picks up speed, uphill it slows down.
- **Ink is limited.** Collect floating drops to refill it.
- **Every stroke feeds the blot.** The more you draw, the faster it catches up.
- **You lose** if the blot catches you or if you fall off the bottom of the page.
- Your 10 best runs are saved in your browser.

| Key | Action |
|---|---|
| `P` / `Esc` | Pause / resume |
| `R` | Restart |
| `M` | Mute |
| `F` | Fullscreen |

On iPhone, which has no fullscreen mode for web pages, use Share → Add to Home Screen to play without the browser bars.

The game is available in English, 中文, Español, العربية, Português, Bahasa Indonesia, Français, 日本語, Русский and Deutsch. It picks your browser's language automatically, and you can force one by adding it to the URL, e.g. `#ja`.

## Development

The whole game is a single `index.html` file: a canvas, plain JavaScript, synthesized WebAudio sound, and no dependencies or build step. Open it in a browser to play locally.

Every push to `main` deploys it to GitHub Pages through `.github/workflows/pages.yml`.
