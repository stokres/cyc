// PokéUsera · Edición Jarra: entry point (pokeusera.html). Before anything reads a save, the account's saves are brought down from the profile (src/cuenta/sincronizar.ts:
// with no account or no network it costs nothing, and with a slow one it gives up after 2.5 s); then the game starts (arranque.ts, where the test shortcuts are listed).
import { bajarPartidas } from '../cuenta/cuenta';

void bajarPartidas()
  .catch(() => undefined)
  .then(() => import('./arranque'));
