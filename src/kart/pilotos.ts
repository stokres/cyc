// The six drivers of Impropios Kart, in one place. Chuchi is the player; the five rivals are his friends Fran, Pablo,
// Guille, Fer and Viñas (looks taken from their PokéUsera trainer cards). To change one, change its row here and its name
// in src/textos/kart.md (`piloto.<id>`). Nothing else in the game knows who is who.

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
  /** Chuchi's looks: square black glasses, a short red beard and a shiny bald head. */
  gafas?: boolean;
  /** Beard colour (a short one along the jaw and a moustache). */
  barba?: string;
  brillo?: boolean;
  // The other looks. All optional and generic: arte.ts only adds geometry for the ones that are set.
  /** Hair falls behind the head down to the shoulders and covers the ears. */
  peloLargo?: boolean;
  /** Curly hair: a big springy mass around the head (use with peloLargo) with curl texture. */
  rizos?: boolean;
  /** Messy hair standing up in tufts. */
  peloArriba?: boolean;
  /** Thick dark eyebrows. */
  cejas?: boolean;
  /** A big bushy beard that hangs down onto the chest. */
  barbaGrande?: boolean;
  /** A hoop earring of this colour. */
  aro?: string;
  /** Headphones of this colour, always on: a band over the head and a cup on each ear. */
  auriculares?: string;
  /** Jacket colour (torso and sleeves); `camiseta` shows through the open front. */
  chaqueta?: string;
  /** Wool lining of the jacket collar. */
  forro?: string;
  /** Stripes on the sleeves. */
  rayas?: string;
  /** Print of the shirt: the two colours of its flowers and leaves. */
  estampado?: [string, string];
  /** A wide body. */
  corpulento?: boolean;
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
  barba: '#bc4f26',
  brillo: true,
};

/** The five rivals. `velocidad` is the top speed against the player's, with a gentle rubber band on top. */
export const RIVALES: Piloto[] = [
  {
    id: 'fran', nombre: 'piloto.fran', color: '#f08a24', piel: '#eaa985', pelo: '#2a1d27', camiseta: '#2c9a9a', velocidad: 0.88, punteria: 0.65,
    barba: '#2a1d27', barbaGrande: true, corpulento: true,
  },
  {
    id: 'pablo', nombre: 'piloto.pablo', color: '#3b6fd0', piel: '#ecb18f', pelo: '#6d4329', camiseta: '#f1e6cc', velocidad: 0.97, punteria: 0.75,
    barba: '#3c2519', peloArriba: true, aro: '#f0c040', chaqueta: '#3a3142', forro: '#f1e6cc',
  },
  {
    id: 'guille', nombre: 'piloto.guille', color: '#4aa83a', piel: '#e1a27a', pelo: '#4a3228', camiseta: '#e0a424', velocidad: 0.95, punteria: 0.85,
    barba: '#7a4a3a', peloLargo: true, cejas: true, estampado: ['#d83a3c', '#2f9444'],
  },
  {
    id: 'fer', nombre: 'piloto.fer', color: '#8a52c9', piel: '#eab08e', pelo: null, camiseta: '#2a2230', velocidad: 0.93, punteria: 0.8,
    barba: '#3a2c32', auriculares: '#8a82ac', cejas: true,
  },
  {
    id: 'vinas', nombre: 'piloto.vinas', color: '#e6c627', piel: '#d99668', pelo: '#2a2030', camiseta: '#f4f0f8', velocidad: 0.9, punteria: 0.7,
    barba: '#1c1522', barbaGrande: true, peloLargo: true, rizos: true, chaqueta: '#3d5694', rayas: '#fbf8ff',
  },
];

export const PILOTOS: Piloto[] = [CHUCHI, ...RIVALES];
