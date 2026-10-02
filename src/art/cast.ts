// The crew. Each friend is a set of colours and proportions; the drawing code
// in rig.ts turns them into a piece-based character (style rules P1–P6).
// Likeness lives in a few strong traits that read on a phone: silhouette,
// hair or lack of it, beard shape, glasses, clothes colour.

export type Tones = { base: string; shadow: string; light: string };

export interface CastDef {
  id: CrewId;
  name: string;
  /** Overall scale (Chuchi is a bit taller). */
  scale: number;
  build: {
    shoulders: number;
    waist: number;
    hips: number;
    belly: number;
    thigh: number;
    shin: number;
    torso: number;
    limb: number;
    upperArm: number;
    foreArm: number;
  };
  head: { rx: number; ry: number; jaw: number };
  skin: Tones & { blush: string };
  eyes: string;
  brows: { color: string; thick: number; lift: number };
  hair: { style: 'messyDark' | 'messyBrown' | 'bald'; tones: Tones; grey?: string };
  beard: { style: 'full' | 'stubble' | 'trimmed'; tones: Tones };
  glasses?: { frame: string };
  earring?: string;
  top: { style: 'tee' | 'sherpa' | 'sweater'; tones: Tones; collar?: Tones };
  pants: Tones;
  shoes: Tones & { sole: string };
  /** Resting expression. */
  mood: Mood;
}

export type CrewId = 'fran' | 'pablo' | 'chuchi';
export type Mood = 'neutral' | 'happy' | 'smug' | 'surprised';

export const CAST: Record<CrewId, CastDef> = {
  fran: {
    id: 'fran',
    name: 'Fran',
    scale: 1,
    build: { shoulders: 122, waist: 112, hips: 100, belly: 12, thigh: 84, shin: 78, torso: 128, limb: 30, upperArm: 64, foreArm: 60 },
    head: { rx: 72, ry: 78, jaw: 1.05 },
    skin: { base: '#e9b79c', shadow: '#c98e76', light: '#f6ceb6', blush: '#e08d7c' },
    eyes: '#4a2c1c',
    brows: { color: '#1f1814', thick: 8.5, lift: 0 },
    hair: { style: 'messyDark', tones: { base: '#2a211d', shadow: '#1a1412', light: '#463a33' }, grey: '#8a837d' },
    beard: { style: 'full', tones: { base: '#2a1f1a', shadow: '#1a1310', light: '#45362e' } },
    top: { style: 'tee', tones: { base: '#2f8b8d', shadow: '#1f6567', light: '#4cabaa' } },
    pants: { base: '#3d4f74', shadow: '#2c3a58', light: '#52668f' },
    shoes: { base: '#2f3036', shadow: '#1f2024', light: '#4a4b52', sole: '#e9e5dc' },
    mood: 'neutral',
  },
  pablo: {
    id: 'pablo',
    name: 'Pablo',
    scale: 0.99,
    build: { shoulders: 108, waist: 92, hips: 88, belly: 0, thigh: 86, shin: 80, torso: 124, limb: 26, upperArm: 64, foreArm: 60 },
    head: { rx: 66, ry: 76, jaw: 0.95 },
    skin: { base: '#dca27e', shadow: '#bb805f', light: '#ebba96', blush: '#d4826a' },
    eyes: '#3a2318',
    brows: { color: '#3e2a1e', thick: 6.5, lift: 3 },
    hair: { style: 'messyBrown', tones: { base: '#5a3c28', shadow: '#3e2819', light: '#7e573a' } },
    beard: { style: 'stubble', tones: { base: '#4a3324', shadow: '#33231a', light: '#6a4a34' } },
    earring: '#d9dde3',
    top: {
      style: 'sherpa',
      tones: { base: '#3c3c42', shadow: '#2a2a2f', light: '#56565e' },
      collar: { base: '#7a7268', shadow: '#5d564e', light: '#9a9186' },
    },
    pants: { base: '#4d6c9c', shadow: '#3a5480', light: '#6585b6' },
    shoes: { base: '#e8e6df', shadow: '#c3c0b8', light: '#ffffff', sole: '#d0ccc2' },
    mood: 'happy',
  },
  chuchi: {
    id: 'chuchi',
    name: 'Chuchi',
    scale: 1.04,
    build: { shoulders: 104, waist: 90, hips: 86, belly: 0, thigh: 90, shin: 84, torso: 126, limb: 25, upperArm: 66, foreArm: 62 },
    head: { rx: 66, ry: 78, jaw: 0.92 },
    skin: { base: '#f0c3a6', shadow: '#d39d84', light: '#fbd8c2', blush: '#e5998a' },
    eyes: '#4d3222',
    brows: { color: '#8a5634', thick: 5.5, lift: 1 },
    hair: { style: 'bald', tones: { base: '#f0c3a6', shadow: '#d39d84', light: '#fff0e4' } },
    beard: { style: 'trimmed', tones: { base: '#9a6038', shadow: '#764628', light: '#b97c4f' } },
    glasses: { frame: '#1e1a18' },
    top: { style: 'sweater', tones: { base: '#24252b', shadow: '#16171b', light: '#3a3c45' } },
    pants: { base: '#2f323b', shadow: '#22242b', light: '#434754' },
    shoes: { base: '#5c3c29', shadow: '#40291b', light: '#7c553b', sole: '#2a2420' },
    mood: 'smug',
  },
};

export const CREW_ORDER: CrewId[] = ['fran', 'pablo', 'chuchi'];
