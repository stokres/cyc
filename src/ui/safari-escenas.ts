// The shots of the safari comic, by name (src/ui/safari.ts, the `escena` of each panel).
import type { Constructor } from './safari-base';
import { escenaM30 } from './safari-m30';
import { escenaMapa, escenaMonegros } from './safari-campo';
import { escenaDiploma, escenaSabana } from './safari-africa';
import { escenaKilometro, escenaOceano } from './safari-mar';
import { escenaCanon, escenaVegas } from './safari-oeste';

export const ESCENAS: Record<string, Constructor> = {
  m30: escenaM30,
  monegros: escenaMonegros,
  mapa: escenaMapa,
  sabana: escenaSabana,
  diploma: escenaDiploma,
  oceano: escenaOceano,
  kilometro: escenaKilometro,
  canon: escenaCanon,
  vegas: escenaVegas,
};
