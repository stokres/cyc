// The six drivers of Impropios Kart, in one place. Chuchi is fixed; the five rivals are PROVISIONAL
// (Jesús has not said yet who they are): to change one, change its row here and its name in
// src/textos/kart.md (`piloto.<id>`). Nothing else in the game knows who is who.

export interface Piloto {
  id: string;
  /** Key of the name in src/textos/kart.md. */
  nombre: string;
  /** Kart body colour. */
  color: string;
  /** Skin tone. */
  piel: string;
  /** Hair colour, or null for a bald head. */
  pelo: string | null;
  /** Shirt colour. */
  camiseta: string;
  /** Top speed against the player's (1 = the same). Chuchi's is 1; the others drive a little slower. */
  velocidad: number;
  /** How well the driver follows the line (0 sloppy, 1 clean). */
  punteria: number;
  /** Chuchi's looks: square black glasses, a short grey beard and a shiny bald head. */
  gafas?: boolean;
  barba?: string;
  brillo?: boolean;
}

export const CHUCHI: Piloto = {
  id: 'chuchi',
  nombre: 'piloto.chuchi',
  color: '#d63a52',
  piel: '#f1c6a9',
  pelo: null,
  camiseta: '#7a1f38',
  velocidad: 1,
  punteria: 1,
  gafas: true,
  barba: '#b9ab9d',
  brillo: true,
};

/** The five rivals (provisional). `velocidad` is the top speed against the player's, with a gentle rubber band on top. */
export const RIVALES: Piloto[] = [
  { id: 'ari', nombre: 'piloto.ari', color: '#2f9d8f', piel: '#e8b896', pelo: '#3a2418', camiseta: '#1f6d63', velocidad: 0.95, punteria: 0.85 },
  { id: 'vinas', nombre: 'piloto.vinas', color: '#3b6fd0', piel: '#f0c2a2', pelo: '#9a6a34', camiseta: '#26468f', velocidad: 0.93, punteria: 0.8 },
  { id: 'fer', nombre: 'piloto.fer', color: '#f08a24', piel: '#d9a37e', pelo: '#201612', camiseta: '#a85a12', velocidad: 0.97, punteria: 0.75 },
  { id: 'compi4', nombre: 'piloto.compi4', color: '#8a52c9', piel: '#f5cfb2', pelo: '#d8b25a', camiseta: '#5c3590', velocidad: 0.9, punteria: 0.7 },
  { id: 'compi5', nombre: 'piloto.compi5', color: '#e6c627', piel: '#c98f66', pelo: '#5a1f12', camiseta: '#a38812', velocidad: 0.88, punteria: 0.65 },
];

export const PILOTOS: Piloto[] = [CHUCHI, ...RIVALES];
