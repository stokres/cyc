// The music: each track and where its loop starts and ends (seconds). The files are made by
// tools/musica (each piece's «bucle»; the farm's, banjo.py then bucle.py; the Brío's, three versions of one song, brio.py): the loop sits between
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
import tragaperrasSinCamiones from './tragaperras-sin-camiones.mp3?url';
import tragaperrasPremioCamiones from './tragaperras-premio-camiones.mp3?url';
import pangUsera from './pang-usera.mp3?url';
import pangCalle from './pang-calle.mp3?url';
import pangRonda from './pang-ronda.mp3?url';
import pangDeep from './pang-deep.mp3?url';
import kartCarrera from './kart-carrera.mp3?url';
import solPueblo from './sol-pueblo.mp3?url';
import solTexto from './sol-texto.mp3?url';
import solPoder from './sol-poder.mp3?url';
import solMenu from './sol-menu.mp3?url';
import solPuerta from './sol-puerta.mp3?url';
import solCamino from './sol-camino.mp3?url';
import solCombate from './sol-combate.mp3?url';
import solVictoria from './sol-victoria.mp3?url';
import solNivel from './sol-nivel.mp3?url';
import solEncuentro from './sol-encuentro.mp3?url';
import solGolpe from './sol-golpe.mp3?url';
import solCura from './sol-cura.mp3?url';
import solApuntador from './sol-apuntador.mp3?url';
import solCae from './sol-cae.mp3?url';
import solHuir from './sol-huir.mp3?url';
import solTeatro from './sol-teatro.mp3?url';
import solJefe from './sol-jefe.mp3?url';
import solCalderon from './sol-calderon.mp3?url';
import solFinal from './sol-final.mp3?url';
import solHielo from './sol-hielo.mp3?url';
import solViento from './sol-viento.mp3?url';
import solRoca from './sol-roca.mp3?url';
import solPuzle from './sol-puzle.mp3?url';
import solChat from './sol-chat.mp3?url';
import solTelon from './sol-telon.mp3?url';
import solTransforma from './sol-transforma.mp3?url';
import unaMasExplora from './una-mas-explora.mp3?url';
import unaMasJardin from './una-mas-jardin.mp3?url';
import unaMasTeatro from './una-mas-teatro.mp3?url';
import unaMasMiniboss from './una-mas-miniboss.mp3?url';
import unaMasJefe from './una-mas-jefe.mp3?url';
import unaMasRescate from './una-mas-rescate.mp3?url';

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
  /** The Bar del Río's rock as heard from the street, through the door (brio.py puerta): the song below, 100 bars (171.43 s), without the highs. */
  barPuerta: { url: barPuerta, inicio: 0.5, fin: 171.928571 },
  /** The same rock heard inside the Bar del Brío (chapter 2): clean, present and low in the mix, the very song of barPuerta and the same loop length. A full three-minute arrangement (intro, two verses, pre-choruses, four choruses, two solos, a bridge with a drum break, a coda that leads back to the intro) (brio.py brio). */
  brio: { url: brio, inicio: 0.5, fin: 171.928571 },
  /** The same song when the bar turns into a dream (nights 2 and 3): 0.8 speed, out of tune, wobbling, with echo, phaser and a long hall; it plays 80 of the 100 bars (no intro, bare riff or second verse) so it lasts the same as brio (brio.py sueno). */
  brioSueno: { url: brioSueno, inicio: 0.5, fin: 171.928571 },
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
  /** The same two once the chant has been sung: each reel that stops plays a note of «Ca-mio-neees» and the jackpot, «y ca-ra-va-naaas» (tragaperras_cantada.py). */
  tragaperrasSinCamiones: { url: tragaperrasSinCamiones, entrada: 0, inicio: 4.2, fin: 4.7 },
  tragaperrasPremioCamiones: { url: tragaperrasPremioCamiones, entrada: 0, inicio: 7.5, fin: 8 },
  /** The Pang's three themes (tools/musica/pang.py), taking turns stage by stage. «A tope por Usera», chiptune; also the title's. */
  pangUsera: { url: pangUsera, inicio: 0.5, fin: 58.1 },
  /** «La calle de la penúltima», FM house in the manner of Streets of Rage 2. */
  pangCalle: { url: pangCalle, inicio: 0.5, fin: 53.833333 },
  /** «Última ronda», the bosses' theme. */
  pangRonda: { url: pangRonda, inicio: 0.5, fin: 49.071429 },
  /** «Hora de cerrar», melancholic deep house: 123 bpm, C minor, 64 bars with a breakdown (tools/musica/pang_deep.py). */
  pangDeep: { url: pangDeep, inicio: 0.5, fin: 125.378049 },
  /** Impropios Kart's race: 150 bpm, C major, a country guitar and a drag-party kit, 32 bars (tools/musica/kart.py). */
  kartCarrera: { url: kartCarrera, inicio: 0.5, fin: 51.7 },
  /**
   * «Alacant Sun», Pablo's Golden Sun parody (chapter 2, tools/musica/sol.py). «Pueblo»: the village at night in the
   * fiestas, 108 bpm, 32 bars; the 4-bar intro (the storm and the build's last two bars) plays once and then the 71.1 s
   * round loops from `inicio` to `fin`, which is exactly the ring the generator rendered.
   */
  solPueblo: { url: solPueblo, entrada: 0, inicio: 8.888889, fin: 80 },
  /** Short sounds of the same game, played once with Sound.efecto (`inicio` and `fin` are not used): the blip of each letter of text (35 ms, soft), a psynergy cast (1.4 s), the menu's cursor/confirm tick (60 ms) and a door with a step (0.64 s). */
  solTexto: { url: solTexto, inicio: 0, fin: 0.036 },
  solPoder: { url: solPoder, inicio: 0, fin: 1.4 },
  solMenu: { url: solMenu, inicio: 0, fin: 0.062 },
  solPuerta: { url: solPuerta, inicio: 0, fin: 0.64 },
  /**
   * «Alacant Sun», the road and the fights (tools/musica/sol_combate.py). «Camino»: the road to the Theatre across the
   * fields at night, A mixolydian / D major, 100 bpm, 28 bars; the 4-bar intro plays once and then the 67.2 s round
   * loops from `inicio` to `fin`.
   */
  solCamino: { url: solCamino, entrada: 0, inicio: 9.6, fin: 76.8 },
  /** «Combate»: the normal fight, E minor, 150 bpm, 32 bars; a 2-bar intro (3.2 s) heard once, then the 51.2 s round loops. */
  solCombate: { url: solCombate, entrada: 0, inicio: 3.2, fin: 54.4 },
  /** Played once with Sound.efecto (`inicio` and `fin` are not used): the victory fanfare (5.3 s, its tail fades out) and the level-up jingle (2.2 s). */
  solVictoria: { url: solVictoria, inicio: 0, fin: 5.3 },
  solNivel: { url: solNivel, inicio: 0, fin: 2.2 },
  /** Fight effects, also played once: entering a fight (1 s), a physical hit (0.25 s), healing (0.8 s), letting a prompter go (0.8 s), an enemy falling apart (0.6 s) and running away (0.6 s). */
  solEncuentro: { url: solEncuentro, inicio: 0, fin: 1 },
  solGolpe: { url: solGolpe, inicio: 0, fin: 0.25 },
  solCura: { url: solCura, inicio: 0, fin: 0.8 },
  solApuntador: { url: solApuntador, inicio: 0, fin: 0.8 },
  solCae: { url: solCae, inicio: 0, fin: 0.6 },
  solHuir: { url: solHuir, inicio: 0, fin: 0.6 },
  /**
   * «Alacant Sun», the end (tools/musica/sol_final.py). «Teatro»: the dungeon, an old theatre at night, C# minor, 84 bpm,
   * 24 bars; the 2-bar intro (5.7 s) plays once and then the 68.6 s round loops from `inicio` to `fin`.
   */
  solTeatro: { url: solTeatro, entrada: 0, inicio: 5.714286, fin: 74.285714 },
  /** «Jefe»: the fight against the narrator, B minor, 144 bpm, 36 bars; a 2-bar intro (3.3 s) heard once, then the 60 s round loops. */
  solJefe: { url: solJefe, entrada: 0, inicio: 3.333333, fin: 63.333333 },
  /**
   * Heard once through (start it with Sound.efecto so it begins at sample 0, or with musica and a stop): Calderón de la
   * Barca coming down from the sky, D major, 120 bpm, 22 s. THE FINAL STRIKE FALLS AT 16.000 s (bar 9, beat 1), after
   * three quarters of a beat of near silence; what follows is the chord settling and fading out.
   */
  solCalderon: { url: solCalderon, inicio: 0, fin: 22 },
  /** Heard once through: the way out and the credits, D major, 72 bpm, 78 s; it begins soft, as a dream ending, and the last chord fades away (it also loops cleanly through silence if played as music). */
  solFinal: { url: solFinal, inicio: 0, fin: 78 },
  /** The Theatre's puzzle and boss effects, played once with Sound.efecto (`inicio` and `fin` are not used): freezing a puddle (0.9 s), the cierzo blowing out candles (1 s), lifting or dropping a papier-mâché rock (0.6 s), a puzzle solved (1.2 s), the bubble of a message when a mind is read (0.3 s), a curtain opening (1.2 s) and the boss changing phase (1.5 s). */
  solHielo: { url: solHielo, inicio: 0, fin: 0.9 },
  solViento: { url: solViento, inicio: 0, fin: 1 },
  solRoca: { url: solRoca, inicio: 0, fin: 0.6 },
  solPuzle: { url: solPuzle, inicio: 0, fin: 1.2 },
  solChat: { url: solChat, inicio: 0, fin: 0.3 },
  solTelon: { url: solTelon, inicio: 0, fin: 1.2 },
  solTransforma: { url: solTransforma, inicio: 0, fin: 1.5 },
  /**
   * «Una más», the chapter 2 metroidvania (src/conceptos/), all from tools/musica/una_mas.py: strings, harpsichord, harp, choir and
   * drums around «Ca-mio-neees y ca-ra-va-naaas» reharmonised in the minor. Each loop has an intro heard once (`entrada`).
   * «Explora»: the world of the concepts, D minor, 90 bpm, 72 bars (192 s loop).
   */
  unaMasExplora: { url: unaMasExplora, entrada: 0, inicio: 5.333333, fin: 197.333333 },
  /** The Cierzo garden, A minor, 105 bpm, 76 bars (173.7 s loop): harp, flute and wind. */
  unaMasJardin: { url: unaMasJardin, entrada: 0, inicio: 4.571429, fin: 178.285714 },
  /** The Theatre of the Concepts, G minor, 100 bpm, 72 bars (172.8 s loop): harpsichord, pizzicato, organ. */
  unaMasTeatro: { url: unaMasTeatro, entrada: 0, inicio: 4.8, fin: 177.6 },
  /** The Gran Despertador's fight, E minor, 150 bpm, 96 bars (153.6 s loop). */
  unaMasMiniboss: { url: unaMasMiniboss, entrada: 0, inicio: 3.2, fin: 156.8 },
  /** LA ÚLTIMA, the Ultimosaurio: D minor, 184 s loop; the last 32 s (from 152.0 s of the loop, 156.0 s of the file) are the third phase, a quarter faster (150 bpm instead of 120). */
  unaMasJefe: { url: unaMasJefe, entrada: 0, inicio: 4, fin: 188 },
  /** Played once with Sound.efecto (`inicio` and `fin` are not used): the fanfare for rescuing a friend and winning a skill, the chant in D major (7.2 s, its tail fades out). */
  unaMasRescate: { url: unaMasRescate, inicio: 0, fin: 7.2 },
} as const;

export type Pista = keyof typeof MUSICA;
