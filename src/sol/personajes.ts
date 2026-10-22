// The characters of the slice as chibi 16×24 sprites (big head, small body, the proportions of the original's):
// Pablo, his mother, the villager and the three friends who join him, Chuchi, Fran and Guille. Each frame is
// built once from char maps and painted into a cached canvas; the game only drawImage()s them (docs/ESTILO.md, T5).
//
// Eight directions: south, north and east are drawn; the three-quarter views reuse them with the features
// shifted, and the west ones are mirrors. The four friends have their head drawn by hand for each view (south,
// south-east, east, north-east and north), so the same head turns all the way round. Walk cycle: idle, left foot,
// idle, right foot. Poses: normal, power (an arm raised, open hand), and for Pablo's bedroom sitting and asleep.
// Outlines are made automatically, always a dark tone of the colour they surround (never black).
//
// The four are told apart by their silhouette before their face: Pablo has brown tufts and a dark jacket; Chuchi
// is a thin stick with a bald egg of a head, glasses and a maroon sweater; Fran is short and round with a huge
// black beard falling over a teal tee and short trousers with white socks; Guille is long-legged with a black
// mop and a loud mustard shirt full of hibiscus. The build (arms, torso, legs) is in the moulds' optional fields.
import { ctx, lienzo, mezcla, noche, reflejar, una, type Pal } from './pixel';

export type Quien = 'pablo' | 'madre' | 'aldeano' | 'chuchi' | 'fran' | 'guille' | 'narrador' | 'tendera' | 'posadero';
/** The four friends, the party of the fights. */
export type Amigo = 'pablo' | 'chuchi' | 'fran' | 'guille';
export type Dir = 'S' | 'SE' | 'E' | 'NE' | 'N' | 'NW' | 'W' | 'SW';
export type Pose = 'normal' | 'poder' | 'sentado' | 'dormido';

export const ANCHO = 16;
export const ALTO = 24;
/** The feet's centre inside a frame (where the character "is"). */
export const PIES = { x: 8, y: 22 } as const;

/** Directions in the order the mapping of the D-pad uses them. */
export const DIRS: Dir[] = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];

// ---------------------------------------------------------------- the moulds

interface Molde {
  pal: Pal;
  /** Hair, as masks of 12 columns placed at x = 2, rows from `y`. Letters: h hair, H shade, l light, t/T hat, r hat band. */
  pelo?: { S: string[]; E: string[]; N: string[]; y: number; x?: number };
  /**
   * A whole head drawn by hand for each view (hair, face, ears, beard together), 12 columns at x = 2,
   * rows from y = 1. Facing right; the west views are mirrors. When a mould has it, `pelo` and `barba`
   * are not used: the same head turns from front to back through the three-quarter views. The
   * letters are the palette's; `e` are the eyes and `x` the earring (gold).
   */
  cabeza?: Record<'S' | 'SE' | 'E' | 'NE' | 'N', string[]>;
  /** Beard or moustache over the face (10 columns at x = 3 for the front, 11 for the profile). */
  barba?: { S: string[]; E: string[]; y: number };
  /** The torso as maps: front, back and profile (rows from y = 11). */
  torso: { S: string[]; N: string[]; E: string[] };
  /** A skirt hides the legs: rows from y = 17 (front/back, 12 columns at x = 2) and profile. */
  falda?: { S: string[]; E: string[] };
  /** The arm's colour letter and how many rows of sleeve (the rest of the arm is the hand). */
  manga: number;
  /** Rosy cheeks. */
  blush?: string;
  /** A back-of-the-head detail (apron bow...), as pixels [x, y, letter] for the back view. */
  espalda?: Array<[number, number, string]>;
  // The build. Everything below is optional and defaults to Pablo's (a 6-wide torso, arms beside it, 3-wide legs).
  /** The torso's left column in the front/back views and in profile (default 5 and 6). */
  torsoX?: { S: number; E: number };
  /** Columns of the screen-left and screen-right arms in the front/back views (default 4 and 11). */
  brazoX?: [number, number];
  /** Column of the near arm in profile (default 8). */
  brazoE?: number;
  /** Rows of bare forearm between the sleeve and the hand (short sleeves). */
  piel?: number;
  /** Letter of the cuff, painted on the last row of the sleeve. */
  puno?: string;
  /** First row of the legs (default 17; a taller friend starts them higher, a stocky one lower). */
  piernaY?: number;
  /** Rows of trousers; what is left down to the shoe is sock (`calcetin`). Default: all of it. */
  pantalon?: number;
  /** Letter of the sock. */
  calcetin?: string;
  /** Width of a leg (default 3). */
  piernaW?: number;
  /** Left columns of the two legs in the front/back views (default 5 and 8) and of the standing leg in profile (default 7). */
  piernaX?: [number, number];
  piernaE?: number;
}

// Faces (skin) are shared; skin tones come from the palette.
// Front: 10 columns at x = 3, rows 3–10 (rows 1–2 belong to the hair).
const CARA_S = [
  '..ssssss..', // 3
  '.ssssssss.', // 4
  'ssssssssss', // 5
  'ssessssess', // 6
  'ssessssess', // 7
  'ssssssssss', // 8
  '.sssmmsss.', // 9
  '..ssssss..', // 10
];
// Profile (facing right): 11 columns at x = 3, rows 3–10. The nose sticks out at the right.
const CARA_E = [
  '...ssssss..', // 3
  '..ssssssss.', // 4
  '.sssssssss.', // 5
  '.sssssssess', // 6
  '.ssssssssss', // 7
  '.sssssssss.', // 8
  '.ssssssmss.', // 9
  '..ssssssss.', // 10
];

const PABLO: Molde = {
  pal: {
    s: '#f2b88c', S: '#d9936b', e: '#2a1a22', m: '#b5504a',
    h: '#8a5430', H: '#60381f', l: '#b57a48', b: '#4e2e1c', B: '#3a2014',
    c: '#454c6a', C: '#2f3550', d: '#e9e4d2', D: '#c4bfae',
    p: '#4268ae', P: '#2f4d8a', o: '#f4f4f6', O: '#a9a9bd', x: '#f7c948',
  },
  cabeza: {
    //   x = 2 ......... 13
    S: [
      '..h..hh.h...', // 1
      '.hhhhhhhhhh.', // 2
      'hhhlhhhhhhhh', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhsssshhh', // 5
      'hhsesssseshh', // 6
      'hhsesssseshh', // 7
      '.xsssSSsssb.', // 8
      '..bbbmmbbb..', // 9
      '...BBBBBB...', // 10
    ],
    SE: [
      '..h.hh.h....', // 1
      '.hhhhhhhhhh.', // 2
      'hhlhhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhhhsssss.', // 5
      'hhhhsessses.', // 6
      'hsShsessses.', // 7
      '.sSbsssssSss', // 8
      '.x.bbbbmmbb.', // 9
      '....BBBBBB..', // 10
    ],
    E: [
      '...hh.hh....', // 1
      '.hhhhhhhhh..', // 2
      'hhhlhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhhhhhsss.', // 5
      'hhhhhhhsess.', // 6
      'hhhhhsSsess.', // 7
      '.hhhhsSbssss', // 8
      '..hhhxbbbbm.', // 9
      '...hhBBBBB..', // 10
    ],
    NE: [
      '...h.h.h....', // 1
      '..hhhhhhhh..', // 2
      '.hhlhhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhs', // 6
      'hhhhhhhhsSss', // 7
      '.hhhhhhhsSss', // 8
      '..hhhhhhxbb.', // 9
      '...hhssss...', // 10
    ],
    N: [
      '...h..h.h...', // 1
      '..hhhhhhhh..', // 2
      '.hhhlhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'shhhhhhhhhhs', // 7
      'shhhhhhhhhhs', // 8
      '.hhhhhhhhhhx', // 9
      '...ssssss...', // 10
    ],
  },
  torso: {
    S: ['cccccc', 'cddddc', 'cddddc', 'cddddc', 'cCddCc', 'CCCCCC'],
    N: ['cccccc', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc', 'CCCCCC'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdddc', 'cCddC', 'CCCCC'],
  },
  manga: 3,
};

const MADRE: Molde = {
  pal: {
    s: '#f4c39c', S: '#dba47e', e: '#2a1a22', m: '#c25a58',
    h: '#8e4d2f', H: '#66331f', l: '#b8693d',
    c: '#cc5565', C: '#9b3b4d', d: '#f6edd4', D: '#d9cba8', a: '#e6b84a',
    p: '#cc5565', P: '#9b3b4d', o: '#6a4232', O: '#4a2c20',
  },
  pelo: {
    y: 1,
    S: [
      '....hhhh....', // 1  bun
      '...hhhhhh...', // 2
      '..hhhhhhhh..', // 3
      '.hhhlhhhhhh.', // 4
      'hhhhh..hhhhh', // 5  parted fringe
      'hh........hh', // 6
    ],
    E: [
      '...hhhh.....', // 1
      '..hhhhhh....', // 2
      '.hhhhhhhh...', // 3
      'hhhhhhhhhh..', // 4
      'hhhhhhhhhh..', // 5
      'hhhhhh......', // 6
      'hhhh........', // 7
      'hhh.........', // 8
    ],
    N: [
      '....hhhh....', // 1
      '...hhhhhh...', // 2
      '..hhhhhhhh..', // 3
      '.hhhlhhhhhh.', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'hhhhhhhhhhhh', // 7
      '.hhhhhhhhhh.', // 8
      '..hhhhhhhh..', // 9
    ],
  },
  torso: {
    S: ['cccccc', 'cddddc', 'cddddc', 'cdDDdc', 'cddddc', 'cddddc'],
    N: ['cccccc', 'cccaac', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdDdc', 'cdddc', 'cdddc'],
  },
  falda: {
    S: ['..cccccccc..', '.cddddddddc.', '.cddddddddc.', '.CCCCCCCCCC.'],
    E: ['..cccccccc.', '.cdddddddc.', '.cdddddddc.', '.CCCCCCCCC.'],
  },
  manga: 3,
  blush: '#e98c86',
};

const ALDEANO: Molde = {
  pal: {
    s: '#dc9d6c', S: '#b97b4e', e: '#2a1a22', m: '#a8504a',
    h: '#f2f2f2', H: '#c8c8d2', b: '#f4f4f6', B: '#cfcfd8',
    t: '#ecc96c', T: '#bd9540', r: '#c64b3a',
    c: '#b5472f', C: '#8a3224', d: '#f0e6d2', D: '#cfc2a8',
    p: '#6f6648', P: '#544d36', o: '#46322a', O: '#2e201b',
  },
  pelo: {
    y: 1,
    x: 1,
    S: [
      '.....tttt.....', // 1  straw hat
      '...tttttttt...', // 2
      '..tttttttttt..', // 3
      '..tttrrrrttt..', // 4  hat band
      'ttttttttttttTT', // 5  brim
      'TT..........TT', // 6  brim shade, only at the sides
    ],
    E: [
      '....tttttt....', // 1
      '..tttttttttt..', // 2
      '..tttttttttt..', // 3
      '.ttrrrrrrttt..', // 4
      'ttttttttttttT.', // 5
      'TT.........TTT', // 6
      '...hhh........', // 7 white hair at the nape
      '...hh.........', // 8
    ],
    N: [
      '.....tttt.....', // 1
      '...tttttttt...', // 2
      '..tttttttttt..', // 3
      '..tttrrrrttt..', // 4
      'ttttttttttttTT', // 5
      'TTTTTTTTTTTTTT', // 6
      '..hhhhhhhhhh..', // 7
      '..hhhhhhhhhh..', // 8
      '...hhhhhhhh...', // 9
    ],
  },
  barba: {
    y: 8,
    S: [
      '...bbbbbb.', // 8  big white moustache
      '..bb....bb', // 9
    ],
    E: [
      '....bbbbbbb', // 8
      '.....bbb...', // 9
    ],
  },
  torso: {
    S: ['dcddcd', 'ccddcc', 'ccddcc', 'ccddcc', 'cCddCc', 'CCCCCC'],
    N: ['cccccc', 'cccccc', 'cccccc', 'cccccc', 'cCCCCc', 'CCCCCC'],
    E: ['ccccc', 'cdddc', 'cdddc', 'cdddc', 'cCddC', 'CCCCC'],
  },
  manga: 3,
};

// The three friends. Same system as Pablo (a head drawn by hand for each view, a torso, a sleeve and a palette
// of their own), but the build changes the silhouette: Chuchi is a long thin stick with a bald egg of a head,
// Fran is short and round with a huge black beard that falls over his chest, Guille is long-legged with square
// shoulders and a mop of black hair.

const CHUCHI: Molde = {
  pal: {
    s: '#f1c6a9', S: '#d59f86', l: '#fde2cf', e: '#1e1218', m: '#c27064',
    g: '#6a3c22', b: '#b0683a', B: '#8a4a28',
    c: '#7a1f38', C: '#541428', d: '#9c3050',
    p: '#3e3e4c', P: '#2c2c38', o: '#f4f4f6', O: '#b4b4c4',
  },
  cabeza: {
    S: [
      '...ssllss...', // 1
      '..sslsssss..', // 2
      '.ssssssssss.', // 3
      '.ssssssssss.', // 4
      'SggggssggggS', // 5
      'SgleggggelgS', // 6
      'SggggssggggS', // 7
      '.bbssSSssbb.', // 8
      '.bbbbmmmbbb.', // 9
      '..BBBBBBBB..', // 10
    ],
    SE: [
      '...ssllss...', // 1
      '..ssllsssss.', // 2
      '.sssssssssss', // 3
      '.sssssssssss', // 4
      'ssSggggsggg.', // 5
      'ssSglegggeg.', // 6
      'ssSggggsggg.', // 7
      '.sSbbsssSsss', // 8
      '..bbbbbmmbbs', // 9
      '...BBBBBBB..', // 10
    ],
    E: [
      '...ssllss...', // 1
      '..sslsssss..', // 2
      '.sssssssssss', // 3
      '.sssssssssss', // 4
      'ssssSSssgggs', // 5
      'ssssSSgggegs', // 6
      'ssssSSssgggs', // 7
      '.ssssbbbbbss', // 8
      '..sssbbbbmb.', // 9
      '...sBBBBBB..', // 10
    ],
    NE: [
      '...ssllss...', // 1
      '..sslsssss..', // 2
      '.ssssssssss.', // 3
      '.sssssssssss', // 4
      '.ssssssssSSs', // 5
      '.ssssssssSgg', // 6
      '.sssssssssSs', // 7
      '..sssssssbbs', // 8
      '...ssssssbb.', // 9
      '....ssssss..', // 10
    ],
    N: [
      '...ssllss...', // 1
      '..sslsssss..', // 2
      '.ssssssssss.', // 3
      '.ssssssssss.', // 4
      'SssssssssssS', // 5
      'SgssssssssgS', // 6
      'SssssssssssS', // 7
      '.ssssssssss.', // 8
      '..SSssssSS..', // 9
      '...ssssss...', // 10
    ],
  },
  torso: {
    S: ['ccCCcc', 'cddddc', 'cddddc', 'cddddc', 'CCCCCC'],
    N: ['cccccc', 'cddddc', 'cddddc', 'cddddc', 'CCCCCC'],
    E: ['ccCcc', 'cdddc', 'cdddc', 'cdddc', 'CCCCC'],
  },
  manga: 3,
  puno: 'C',
  brazoX: [5, 10],
  piernaY: 16,
};

const FRAN: Molde = {
  pal: {
    s: '#e8b090', S: '#c98a6c', e: '#2a1a22', m: '#c0504c',
    h: '#4a3a46', H: '#33262f', l: '#6c5864', w: '#b4aebc',
    b: '#2a1f27', B: '#1b1219', n: '#463640',
    c: '#2c9b92', C: '#1d726d', d: '#48b8ad',
    p: '#2e4378', P: '#222f5a', q: '#ecebf2', o: '#3a3a4e', O: '#8a8a9c',
  },
  cabeza: {
    S: [
      '...hh.hhhh..', // 1
      '..hhwhhhhh..', // 2
      '.hhhhhhhhhh.', // 3
      'hhhhssssshhh', // 4
      'hhbbbssbbbhh', // 5
      'hssessssessh', // 6
      'hssessssessh', // 7
      'hbsssSSsssbh', // 8
      'hbbbmmmmbbbh', // 9
      '.bbbbbbbbbb.', // 10
      '..bbbnbbbb..', // 11
      '...bBBBBb...', // 12
    ],
    SE: [
      '..hhhhhhh...', // 1
      '.hhhhwhhhhh.', // 2
      'hhhlhhhhhhh.', // 3
      'hhhhhssshh..', // 4
      'hhhhbbbsbbb.', // 5
      'hhhhsessses.', // 6
      'hhhhsessses.', // 7
      'hhbbbssssSss', // 8
      '.bbbbbbmmmbb', // 9
      '..bbbbbbbbb.', // 10
      '...bbbnbbbb.', // 11
      '....bBBBBb..', // 12
    ],
    E: [
      '..hhhhhhhh..', // 1
      '.hhhhwhhhhh.', // 2
      'hhhlhhhhhhh.', // 3
      'hhhhhhhhhss.', // 4
      'hhhhhhhhbbs.', // 5
      'hhhhhhhsess.', // 6
      'hhhhhhhsess.', // 7
      'hhhhhbbsssss', // 8
      'hhhhbbbbbbmb', // 9
      '.hhbbbbbbbbb', // 10
      '..hbbbnbbbb.', // 11
      '....bbBBBb..', // 12
    ],
    NE: [
      '...hhhhhh...', // 1
      '..hhhhwhhh..', // 2
      '.hhlhhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhs', // 5
      'hhhhhhhhhhss', // 6
      'hhhhhhhhhSss', // 7
      '.hhhhhhhhbbb', // 8
      '..hhhhhhhbb.', // 9
      '..hhhhhhbbb.', // 10
      '...hhhhbbb..', // 11
      '....bbbb....', // 12
    ],
    N: [
      '...hhhhhh...', // 1
      '..hhhhwhhh..', // 2
      '.hhlhhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'shhhhhhhhhhs', // 7
      'shhhhhhhhhhs', // 8
      '.hhhhhhhhhh.', // 9
      '..ssssssss..', // 10
    ],
  },
  torso: {
    S: ['cccccccc', 'cccccccc', 'cccddccc', 'ccddddcc', 'ccddddcc', 'cccddccc', 'CCCCCCCC'],
    N: ['cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', 'cccccccc', 'CCCCCCCC'],
    E: ['ccccc..', 'cccccc.', 'ccccccc', 'cccdddc', 'cccdddc', 'cccccc.', 'CCCCCC.'],
  },
  manga: 2,
  piel: 1,
  torsoX: { S: 4, E: 5 },
  brazoX: [3, 12],
  piernaY: 18,
  pantalon: 2,
  calcetin: 'q',
};

const GUILLE: Molde = {
  pal: {
    s: '#e3a784', S: '#bd7f5e', e: '#2a1a22', m: '#b5504a',
    h: '#383040', H: '#241c2c', l: '#5a4c68', b: '#1c1420',
    c: '#e2a728', C: '#b57d18', f: '#d8352b', w: '#f4ecd8', v: '#2f8a3c',
    p: '#3f6bb0', P: '#2c4f8c', o: '#b97b3f', O: '#7d4c22',
  },
  cabeza: {
    S: [
      '....hhhh....', // 1
      '..hhhhhhhh..', // 2
      '.hhhlhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhbbbssbbbhh', // 5
      'hhsesssseshh', // 6
      'hssessssessh', // 7
      'SssssSSssssS', // 8
      '.ssssmmssss.', // 9
      '..sSSSSSSs..', // 10
    ],
    SE: [
      '..hhhhhhh...', // 1
      '.hhhhhhhhhh.', // 2
      'hhlhhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhbbbsbbbs', // 5
      'hhhhsessses.', // 6
      'hhhhsessses.', // 7
      'hhhssssssSss', // 8
      '.hhsssssmmss', // 9
      '..hSSSSSSS..', // 10
    ],
    E: [
      '..hhhhhhh...', // 1
      '.hhhhhhhhhh.', // 2
      'hhhlhhhhhhh.', // 3
      'hhhhhhhhhhh.', // 4
      'hhhhhhhhbbs.', // 5
      'hhhhhhhsess.', // 6
      'hhhhhhhsess.', // 7
      'hhhhhhhsssss', // 8
      '.hhhhhsssmss', // 9
      '..hhhhSSSSS.', // 10
    ],
    NE: [
      '...hhhhh....', // 1
      '..hhhhhhhh..', // 2
      '.hhlhhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhs', // 5
      'hhhhhhhhhhss', // 6
      'hhhhhhhhhSss', // 7
      '.hhhhhhhhSSs', // 8
      '..hhhhhhhhs.', // 9
      '...hhhssss..', // 10
    ],
    N: [
      '...hhhhhh...', // 1
      '..hhhhhhhh..', // 2
      '.hhhlhhhhhh.', // 3
      'hhhhhhhhhhhh', // 4
      'hhhhhhhhhhhh', // 5
      'hhhhhhhhhhhh', // 6
      'shhhhhhhhhhs', // 7
      'shhhhhhhhhhs', // 8
      '.hhhhhhhhhh.', // 9
      '...ssssss...', // 10
    ],
  },
  torso: {
    S: ['ccCssCcc', '.ffccvc.', '.fwcccc.', '.cccffv.', '.CCCCCC.'],
    N: ['cccccccc', '.cfcccc.', '.ffvccc.', '.cccccc.', '.CCCCCC.'],
    E: ['ccCcc', 'cfcvc', 'cwccc', 'cccfc', 'CCCCC'],
  },
  manga: 2,
  piel: 1,
  torsoX: { S: 4, E: 6 },
  piernaY: 16,
};

// The narrator is Pablo's shadow (chapter 1): the same build and head, in violet-black with yellow eyes.
const NARRADOR: Molde = {
  ...PABLO,
  pal: {
    s: '#3d3168', S: '#2b2250', e: '#ffd84a', m: '#8a6ad8',
    h: '#171128', H: '#0d0919', l: '#2e2552', b: '#120c22', B: '#0b0716',
    c: '#251d44', C: '#190f33', d: '#4d4380', D: '#382f66',
    p: '#1c1738', P: '#120e26', o: '#2b2250', O: '#171128', x: '#ffe27a',
  },
};
// The shopkeeper of the peña (the mother's build, grey hair, a blue dress) and the innkeeper (the villager's, a dark cap, a green waistcoat).
const TENDERA: Molde = {
  ...MADRE,
  pal: { ...MADRE.pal, h: '#a9a7b9', H: '#7c7a92', l: '#d8d6e6', c: '#3f7ac4', C: '#2c5a98', p: '#3f7ac4', P: '#2c5a98', o: '#4a4a5a', O: '#2e2e3a' },
};
const POSADERO: Molde = {
  ...ALDEANO,
  pal: { ...ALDEANO.pal, t: '#4a5a8a', T: '#33406a', r: '#e6c24a', c: '#3f8a5a', C: '#2a6440', p: '#4a4458', P: '#322d40' },
};

const MOLDES: Record<Quien, Molde> = { pablo: PABLO, madre: MADRE, aldeano: ALDEANO, chuchi: CHUCHI, fran: FRAN, guille: GUILLE, narrador: NARRADOR, tendera: TENDERA, posadero: POSADERO };

// ---------------------------------------------------------------- painting into a grid

type Rejilla = Array<string | null>;
const poner = (g: Rejilla, x: number, y: number, col: string | undefined) => {
  if (!col || x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return;
  g[y * ANCHO + x] = col;
};

/** Paints a map (letters through the palette) with its top-left at (x0, y0). */
function mapa(g: Rejilla, filas: readonly string[], x0: number, y0: number, pal: Pal, quitar?: (ch: string) => boolean) {
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      const ch = fila[i];
      if (ch === '.' || (quitar && quitar(ch))) continue;
      poner(g, x0 + i, y0 + j, pal[ch]);
    }
  });
}

/** Shades the bottom edge of a hair mask a tone darker (done on the colour grid after painting). */
function sombrearPelo(g: Rejilla, filas: readonly string[], x0: number, y0: number, pal: Pal) {
  if (!pal.H) return;
  filas.forEach((fila, j) => {
    for (let i = 0; i < fila.length; i++) {
      if (fila[i] !== 'h') continue;
      const abajo = filas[j + 1]?.[i];
      if (!abajo || abajo === '.') poner(g, x0 + i, y0 + j, pal.H);
    }
  });
}

// ---------------------------------------------------------------- one frame

type Vista = 'S' | 'E' | 'N';

/** What a direction needs: the view drawn, whether it is mirrored and the 3/4 shift. */
function vistaDe(d: Dir): { v: Vista; espejo: boolean; tres: boolean } {
  switch (d) {
    case 'S': return { v: 'S', espejo: false, tres: false };
    case 'SE': return { v: 'S', espejo: false, tres: true };
    case 'E': return { v: 'E', espejo: false, tres: false };
    case 'NE': return { v: 'N', espejo: false, tres: true };
    case 'N': return { v: 'N', espejo: false, tres: false };
    case 'NW': return { v: 'N', espejo: true, tres: true };
    case 'W': return { v: 'E', espejo: true, tres: false };
    case 'SW': return { v: 'S', espejo: true, tres: true };
  }
}

function pintarFrame(q: Quien, d: Dir, paso: number, pose: Pose): HTMLCanvasElement {
  const M = MOLDES[q];
  const { v, espejo, tres } = vistaDe(d);
  const g: Rejilla = new Array(ANCHO * ALTO).fill(null);
  const pal = M.pal;
  // Contact frames drop the body a pixel; idle and the other poses stand tall.
  const dy = paso > 0 && pose === 'normal' ? 1 : 0;

  if (pose === 'dormido') {
    // Just the head, facing us with its eyes shut (the bed's pillow).
    cabeza(g, M, 'S', false, 0, pose);
  } else {
    if (pose !== 'sentado') piernas(g, M, v, paso, pose);
    torsoYBrazos(g, M, v, paso, dy, pose);
    if (M.falda && pose !== 'sentado') mapa(g, M.falda[v === 'E' ? 'E' : 'S'], 2, 17, pal);
    cabeza(g, M, v, tres, dy, pose);
  }

  // The outline: a dark tone of the colour it surrounds.
  const out = new Array<string | null>(ANCHO * ALTO).fill(null);
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (g[y * ANCHO + x]) continue;
      for (const [ox, oy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || nx >= ANCHO || ny < 0 || ny >= ALTO) continue;
        const c = g[ny * ANCHO + nx];
        if (c) {
          out[y * ANCHO + x] = mezcla(c, '#1c1226', 0.62);
          break;
        }
      }
    }
  }
  const c = lienzo(ANCHO, ALTO);
  const x = ctx(c);
  for (let y = 0; y < ALTO; y++) {
    for (let i = 0; i < ANCHO; i++) {
      const col = g[y * ANCHO + i] ?? out[y * ANCHO + i];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i, y, 1, 1);
    }
  }
  noche(c, [0.84, 0.88, 1]);
  return espejo ? reflejar(c) : c;
}

const cuadro = (g: Rejilla, x: number, y: number, w: number, h: number, col: string) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) poner(g, x + i, y + j, col);
};

function piernas(g: Rejilla, M: Molde, v: Vista, paso: number, pose: Pose) {
  const { pal } = M;
  const quieto = paso === 0 || pose !== 'normal';
  const y0 = M.piernaY ?? 17;
  const w = M.piernaW ?? 3;
  const pant = M.pantalon ?? 21 - y0;
  // A leg: trousers, the sock if the trousers are short, and the shoe (two rows; the toe sticks out in profile).
  const pierna = (x: number, alza: number, col: string) => {
    const largo = 21 - y0 - alza;
    cuadro(g, x, y0, w, Math.min(pant, largo), col);
    if (largo > pant) cuadro(g, x, y0 + pant, w, largo - pant, pal[M.calcetin ?? 'q'] ?? col);
    const zapato = w + (v === 'E' ? 1 : 0);
    cuadro(g, x, 21 - alza, zapato, 2, pal.o);
    cuadro(g, x, 22 - alza, zapato, 1, pal.O);
  };
  if (v === 'E') {
    // Profile: standing = the legs together; contact = a stride (the front foot lifts a pixel).
    const x = M.piernaE ?? 7;
    if (quieto) pierna(x, 0, pal.p);
    else {
      const s = paso === 1 ? 1 : -1;
      pierna(x - s * 2, 0, pal.P);
      pierna(x + s * 2, 1, pal.p);
    }
    return;
  }
  // Front and back: two legs; in a step the one that moves is lifted a pixel.
  const [xi, xd] = M.piernaX ?? [5, 8];
  pierna(xi, quieto ? 0 : paso === 1 ? 1 : 0, pal.p);
  pierna(xd, quieto ? 0 : paso === 2 ? 1 : 0, pal.P);
}

function torsoYBrazos(g: Rejilla, M: Molde, v: Vista, paso: number, dy: number, pose: Pose) {
  const { pal } = M;
  const x0 = v === 'E' ? (M.torsoX?.E ?? 6) : (M.torsoX?.S ?? 5);
  const y0 = 11 + dy;
  mapa(g, M.torso[v], x0, y0, pal);
  const manga = pal.c;
  const mano = pal.s;
  const largo = M.manga;
  const piel = M.piel ?? 0;
  const poder = pose === 'poder';
  const sent = pose === 'sentado';
  // An arm hanging from (x, y): the sleeve (with its cuff), the bare forearm and the hand.
  const brazo = (x: number, y: number) => {
    for (let j = 0; j < largo; j++) poner(g, x, y + j, j === largo - 1 && M.puno ? pal[M.puno] : manga);
    for (let j = 0; j < piel; j++) poner(g, x, y + largo + j, mano);
    poner(g, x, y + largo + piel, mano);
  };

  if (v === 'E') {
    const bx = M.brazoE ?? 8;
    if (poder) {
      // The near arm forward and up, the hand open.
      poner(g, bx + 1, y0 + 1, manga);
      poner(g, bx + 2, y0, manga);
      poner(g, bx + 3, y0 - 1, manga);
      poner(g, bx + 4, y0 - 2, mano);
      poner(g, bx + 4, y0 - 3, mano);
      poner(g, bx + 5, y0 - 3, mano);
      poner(g, bx + 5, y0 - 4, mano);
      return;
    }
    // The near arm swings with the stride.
    const sw = paso === 1 ? 1 : paso === 2 ? -1 : 0;
    brazo(bx + sw, y0 + 1);
    return;
  }

  const [bi, bd] = M.brazoX ?? [4, 11];
  const sw = sent || poder ? 0 : paso === 1 ? 1 : paso === 2 ? -1 : 0;
  brazo(bi, y0 + 1 + (sent ? -1 : sw));
  if (poder) {
    // The arm on the screen's right raised beside the head, the hand open.
    poner(g, bd, y0 + 1, manga);
    poner(g, bd + 1, y0, manga);
    poner(g, bd + 2, y0 - 1, manga);
    poner(g, bd + 2, y0 - 2, mano);
    poner(g, bd + 2, y0 - 3, mano);
    poner(g, bd + 3, y0 - 3, mano);
    poner(g, bd + 3, y0 - 4, mano);
    return;
  }
  brazo(bd, y0 + 1 + (sent ? -1 : -sw));
}

/** A hand-drawn head (`Molde.cabeza`); asleep, the eyes are shut: the upper pixel of each goes skin. */
function cabezaEntera(g: Rejilla, M: Molde, v: Vista, tres: boolean, dy: number, pose: Pose) {
  const { pal } = M;
  const vista = v === 'E' ? 'E' : tres ? (v === 'S' ? 'SE' : 'NE') : v;
  const filas = M.cabeza![vista];
  const dormido = pose === 'dormido';
  mapa(g, filas, 2, 1 + dy, pal, (ch) => dormido && ch === 'e');
  if (dormido) {
    filas.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) {
        if (fila[i] !== 'e') continue;
        const arriba = filas[j - 1]?.[i] === 'e';
        poner(g, 2 + i, 1 + j + dy, arriba ? pal.s : pal.e);
        // A shut eye is a dash: the pixel next to it, towards the nose, is dark too.
        if (!arriba) poner(g, 2 + i + (i < 6 ? 1 : -1), 1 + j + dy, pal.e);
      }
    });
  }
}

function cabeza(g: Rejilla, M: Molde, v: Vista, tres: boolean, dy: number, pose: Pose) {
  if (M.cabeza) return cabezaEntera(g, M, v, tres, dy, pose);
  const { pal } = M;
  const y = dy;
  const pelo = M.pelo!;
  const px = pelo.x ?? 2;
  if (v === 'S') {
    // The base face; in the three-quarter view the features slide towards the facing side.
    mapa(g, CARA_S, 3, 3 + y, pal, (ch) => tres && (ch === 'e' || ch === 'm'));
    if (tres) {
      for (const ex of [4, 8]) {
        poner(g, 3 + ex, 6 + y, pal.e);
        poner(g, 3 + ex, 7 + y, pal.e);
      }
      poner(g, 9, 9 + y, pal.m);
      poner(g, 10, 9 + y, pal.m);
    }
    if (pose === 'dormido') {
      // Closed eyes: a short dash each, and a hint of a smile.
      for (const ex of [5, 6, 9, 10]) {
        poner(g, ex, 6 + y, pal.s);
        poner(g, ex, 7 + y, pal.e);
      }
      poner(g, 5, 7 + y, pal.e);
      poner(g, 10, 7 + y, pal.e);
    }
    for (let i = 2; i < 8; i++) poner(g, 3 + i, 10 + y, pal.S);
    if (M.blush) for (const bx of tres ? [4, 11] : [4, 11]) poner(g, bx, 8 + y, M.blush);
    if (M.barba) mapa(g, M.barba.S.map((r) => (tres ? `.${r.slice(0, -1)}` : r)), 3, M.barba.y + y, pal);
    mapa(g, pelo.S, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.S, px, pelo.y + y, pal);
  } else if (v === 'E') {
    mapa(g, CARA_E, 3, 3 + y, pal);
    for (let i = 2; i < 9; i++) poner(g, 3 + i, 10 + y, pal.S);
    if (M.blush) poner(g, 10, 8 + y, M.blush);
    if (M.barba) mapa(g, M.barba.E, 3, M.barba.y + y, pal);
    mapa(g, pelo.E, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.E, px, pelo.y + y, pal);
  } else {
    // From behind: the neck, then all hair.
    mapa(g, ['..ssssss..'], 3, 10 + y, pal);
    mapa(g, pelo.N, px, pelo.y + y, pal);
    sombrearPelo(g, pelo.N, px, pelo.y + y, pal);
    if (tres) {
      for (let j = 6; j <= 9; j++) poner(g, 12, j + y, pal.s);
    }
    if (M.espalda) for (const [ex, ey, ch] of M.espalda) poner(g, ex, ey + y, pal[ch]);
  }
}

// ---------------------------------------------------------------- public

/** One cached frame. `paso`: 0 idle, 1 left foot, 2 right foot. */
export function marco(q: Quien, d: Dir, paso: number, pose: Pose = 'normal'): HTMLCanvasElement {
  return una(`pj.${q}.${d}.${paso}.${pose}`, () => pintarFrame(q, d, paso, pose));
}

/** The palette of a friend (letters as in the maps), so the fighters wear the same colours as the walking sprites. */
export const paletaDe = (q: Amigo): Pal => MOLDES[q].pal;

/** Cycle of the walk: idle, left, idle, right. */
export const CICLO = [0, 1, 0, 2] as const;

/** A soft contact shadow under the feet, 12×5 (night). */
export const sombraPies = () =>
  una('pj.sombra', () => {
    const c = lienzo(14, 6);
    const x = ctx(c);
    x.fillStyle = 'rgba(8,10,30,0.34)';
    x.fillRect(2, 0, 10, 6);
    x.fillStyle = 'rgba(8,10,30,0.34)';
    x.fillRect(0, 1, 14, 4);
    x.clearRect(0, 0, 2, 1);
    x.clearRect(12, 0, 2, 1);
    x.clearRect(0, 5, 2, 1);
    x.clearRect(12, 5, 2, 1);
    return c;
  });

/** The direction closest to a movement vector (screen: y grows down). */
export function dirDe(dx: number, dy: number, antes: Dir = 'S'): Dir {
  if (!dx && !dy) return antes;
  const a = Math.atan2(dy, dx); // 0 = east, +90° = south
  const i = Math.round(a / (Math.PI / 4));
  return (['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const)[((i % 8) + 8) % 8];
}

/** The unit vector of a direction. */
export function vectorDe(d: Dir): [number, number] {
  const v: Record<Dir, [number, number]> = {
    E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1], N: [0, -1], NE: [1, -1],
  };
  return v[d];
}
