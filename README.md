# Camiones y Caravanas

Aventura gráfica con minijuegos sobre las quedadas de los jueves en Usera. Pensada para jugarse en el móvil, en horizontal, desde el navegador.

## Probarlo

```sh
npm install
npm run dev        # abre la URL que muestra (también desde el móvil en la misma wifi)
npm run build      # typecheck + build en dist/
npm run artifact   # build en un solo HTML: artifact/camiones-y-caravanas.html
```

## Comprobaciones

```sh
npm run typecheck
node scripts/playthrough.mjs http://localhost:5173/ revisiones/partida   # partida completa automática en viewport de móvil
node scripts/shots.mjs http://localhost:5173/ revisiones/captura.png 844x390 3
node scripts/ronda-sim.mjs                                                # ajuste de dificultad del minijuego
```

`revisiones/` no se sube al repositorio.

## Estructura

| Ruta | Qué hay |
|---|---|
| `docs/ESTILO.md` | Guía de estilo para móvil, adaptada del kit de estilo |
| `docs/JUGABILIDAD.md` | Controles táctiles, reglas de los minijuegos y la demo |
| `src/core/` | Escenario adaptable al móvil, gestos, sonido y utilidades |
| `src/art/` | Calle de Usera, iluminación, personajes (`cast.ts`, `rig.ts`), objetos y efectos |
| `src/game/` | Aventura point and click, personajes en escena y partida guardada |
| `src/data/capitulo1.ts` | Guion y puzles del capítulo 1 (texto provisional) |
| `src/minigames/ronda.ts` | Minijuego «La ronda» |
| `src/ui/` | Interfaz: retratos, bolsa, diálogos y menús |
