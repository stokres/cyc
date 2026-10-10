// The music: each track and where its loop starts and ends (seconds). The files are made by
// tools/musica (each piece's «bucle»; the farm's, banjo.py then bucle.py): the loop sits between
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
import pasodoble from './pasodoble.mp3?url';
import bolilandia from './bolilandia.mp3?url';
import bolilandiaLuz from './bolilandia-luz.mp3?url';
import trailer from './trailer.mp3?url';

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
  /** «Bolilandia, cerrado»: the play park's music-box waltz at night, lights out, Chuchi's (bolilandia_noche.py). */
  bolilandia: { url: bolilandia, inicio: 0.5, fin: 63.108707 },
  /** The same waltz with the lights on and the park awake: glockenspiel, calliope, tuba (bolilandia_noche.py luz). */
  bolilandiaLuz: { url: bolilandiaLuz, inicio: 0.5, fin: 63.108707 },
  /** «Pasodoble del camionero», the end card: the lorry and the fanfare once, then the pasodoble (pasodoble.py). */
  pasodoble: { url: pasodoble, entrada: 0, inicio: 12.413787, fin: 79.65517 },
  /** «Próximamente», the chapter 2 trailer's action music, once through; then a low drone loops while the title stays up (trailer.py). */
  trailer: { url: trailer, entrada: 0, inicio: 39.4, fin: 47.4 },
} as const;

export type Pista = keyof typeof MUSICA;
