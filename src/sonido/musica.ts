// The music: each track and where its loop starts and ends (seconds). The files are made by
// tools/musica (each piece's «bucle»; the farm's, banjo.py then bucle.py; the Brío's, brio.py): the loop sits between
// half-second margins that hold what comes just before and after it, so it joins without a
// click on any phone. Each is fetched the first time it plays. A track with `entrada` starts
// there (an intro heard once) and then loops between inicio and fin.
import granjaRadio from './granja-radio.mp3?url';
import granjaCerdos from './granja-cerdos.mp3?url';
import barrio from './barrio.mp3?url';
import vueltas from './vueltas.mp3?url';
import contraRobi from './contra-robi.mp3?url';
import jaleo from './jaleo.mp3?url';
import barPuerta from './bar-puerta.mp3?url';
import brio from './brio.mp3?url';
import brioSueno from './brio-sueno.mp3?url';
import pasodoble from './pasodoble.mp3?url';
import bolilandia from './bolilandia.mp3?url';
import bolilandiaLuz from './bolilandia-luz.mp3?url';
import trailer from './trailer.mp3?url';
import cantoA from './canto-a.mp3?url';
import cantoB from './canto-b.mp3?url';
import cantoPablo from './canto-pablo.mp3?url';
import cantoFran from './canto-fran.mp3?url';
import cantoChuchi from './canto-chuchi.mp3?url';
import cantoGuille from './canto-guille.mp3?url';
import cantoFallo from './canto-fallo.mp3?url';
import cantoFinal from './canto-final.mp3?url';
import tragaperrasSin from './tragaperras-sin.mp3?url';
import tragaperrasPremio from './tragaperras-premio.mp3?url';
import pangUsera from './pang-usera.mp3?url';
import pangCalle from './pang-calle.mp3?url';
import pangRonda from './pang-ronda.mp3?url';
import solPueblo from './sol-pueblo.mp3?url';
import solTexto from './sol-texto.mp3?url';
import solPoder from './sol-poder.mp3?url';
import solMenu from './sol-menu.mp3?url';
import solPuerta from './sol-puerta.mp3?url';

export const MUSICA = {
  /** The farm polka on banjo, from Guille's radio (banjo.py radio). */
  granjaRadio: { url: granjaRadio, inicio: 0.5, fin: 58.681818 },
  /** The same polka, faster, for the pig tower (banjo.py cerdos). */
  granjaCerdos: { url: granjaCerdos, inicio: 0.5, fin: 46.214286 },
  /** «Por el barrio», the calm stroll: Fran's flat and street, Pablo's backstage (barrio.py). */
  barrio: { url: barrio, inicio: 0.5, fin: 73.642857 },
  /** «Dándole vueltas», on tiptoe: the frog minigame, Fran's (vueltas.py). */
  vueltas: { url: vueltas, inicio: 0.5, fin: 69.071429 },
  /** «Contra Robi», the fight with Robi in Bolilandia, Chuchi's (contra_robi.py). */
  contraRobi: { url: contraRobi, inicio: 0.5, fin: 38.681818 },
  /** «Jaleo», the frantic big band: the battle of words, Pablo's (jaleo.py). */
  jaleo: { url: jaleo, inicio: 0.5, fin: 41.3 },
  /** The Bar del Río's rock as heard from the street, through the door (bar_rockero.py puerta). */
  barPuerta: { url: barPuerta, inicio: 0.5, fin: 69.071429 },
  /** The same rock heard inside the Bar del Brío (chapter 2): clean, present and low in the mix, the very song of barPuerta and the same loop length (brio.py brio). */
  brio: { url: brio, inicio: 0.5, fin: 69.071429 },
  /** The same song when the bar turns into a dream (nights 2 and 3): 0.8 speed, out of tune, wobbling, with echo, phaser and a long hall; the same loop length as brio, so a crossfade between the two lines up (brio.py sueno). */
  brioSueno: { url: brioSueno, inicio: 0.5, fin: 69.071429 },
  /** «Bolilandia, cerrado»: the play park's music-box waltz at night, lights out, Chuchi's (bolilandia_noche.py). */
  bolilandia: { url: bolilandia, inicio: 0.5, fin: 63.108707 },
  /** The same waltz with the lights on and the park awake: glockenspiel, calliope, tuba (bolilandia_noche.py luz). */
  bolilandiaLuz: { url: bolilandiaLuz, inicio: 0.5, fin: 63.108707 },
  /** «Pasodoble del camionero», the end card: the lorry and the fanfare once, then the pasodoble (pasodoble.py). */
  pasodoble: { url: pasodoble, entrada: 0, inicio: 12.413787, fin: 79.65517 },
  /** «Próximamente», the chapter 2 trailer's action music, once through; then a low drone loops while the title stays up (trailer.py). */
  trailer: { url: trailer, entrada: 0, inicio: 39.4, fin: 47.4 },
  /** «El canto a cuatro», the first time round: a festive pasodoble bed, four bars of 2/4 at 92 bpm in a loop (canto.py). */
  cantoA: { url: cantoA, inicio: 0.5, fin: 5.717392 },
  /** The same, the second time round: quicker (112 bpm), louder and fuller (canto.py). */
  cantoB: { url: cantoB, inicio: 0.5, fin: 4.785714 },
  /**
   * Short sounds, played once with Sound.efecto (not as music; `inicio` and `fin` are not used): each singer's two
   * brass stabs, the sour «wah-wah» of a mistake and the last big chord (canto.py).
   */
  cantoPablo: { url: cantoPablo, inicio: 0, fin: 1.8 },
  cantoFran: { url: cantoFran, inicio: 0, fin: 1.8 },
  cantoChuchi: { url: cantoChuchi, inicio: 0, fin: 1.8 },
  cantoGuille: { url: cantoGuille, inicio: 0, fin: 1.8 },
  cantoFallo: { url: cantoFallo, inicio: 0, fin: 1.8 },
  cantoFinal: { url: cantoFinal, inicio: 0, fin: 4 },
  /** The slot machine close-up with no prize, once through from its first frame (a silent half second loops at the end; tragaperras.py). */
  tragaperrasSin: { url: tragaperrasSin, entrada: 0, inicio: 4.2, fin: 4.7 },
  /** The same with the jackpot: reels, bells and a shower of coins (tragaperras.py). */
  tragaperrasPremio: { url: tragaperrasPremio, entrada: 0, inicio: 7.5, fin: 8 },
  /** The Pang's three themes (tools/musica/pang.py), taking turns stage by stage. «A tope por Usera», chiptune; also the title's. */
  pangUsera: { url: pangUsera, inicio: 0.5, fin: 58.1 },
  /** «La calle de la penúltima», FM house in the manner of Streets of Rage 2. */
  pangCalle: { url: pangCalle, inicio: 0.5, fin: 53.833333 },
  /** «Última ronda», the bosses' theme. */
  pangRonda: { url: pangRonda, inicio: 0.5, fin: 49.071429 },
  /**
   * «Sol de Levante», Pablo's Golden Sun parody (chapter 2, tools/musica/sol.py). «Pueblo»: the village at night in the
   * fiestas, 108 bpm, 32 bars; the 4-bar intro (the storm and the build's last two bars) plays once and then the 71.1 s
   * round loops from `inicio` to `fin`, which is exactly the ring the generator rendered.
   */
  solPueblo: { url: solPueblo, entrada: 0, inicio: 8.888889, fin: 80 },
  /** Short sounds of the same game, played once with Sound.efecto (`inicio` and `fin` are not used): the blip of each letter of text (35 ms, soft), a psynergy cast (1.4 s), the menu's cursor/confirm tick (60 ms) and a door with a step (0.64 s). */
  solTexto: { url: solTexto, inicio: 0, fin: 0.036 },
  solPoder: { url: solPoder, inicio: 0, fin: 1.4 },
  solMenu: { url: solMenu, inicio: 0, fin: 0.062 },
  solPuerta: { url: solPuerta, inicio: 0, fin: 0.64 },
} as const;

export type Pista = keyof typeof MUSICA;
