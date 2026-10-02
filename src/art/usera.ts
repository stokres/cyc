// "Calle de Usera, jueves por la noche": the demo scene.
// Painted procedurally in layers and baked once per resolution:
//   sky + far city (unlit, already in night tones) -> near albedo * light map
//   -> emissive (windows, signs) -> wet reflections -> restrained glows.
// The front layer (lamp posts, curb, road) is baked separately and drawn over
// the characters.
import { css, hex } from '../core/color';
import { rng } from '../core/util';
import { LightRig, glow, paintPool } from './lighting';
import { Ctx, bricks, fillRect, makeCanvas, poly, rr, signText, vgrad } from './paint';

export const SCENE_W = 2400;
export const SCENE_H = 1080;
export const GROUND_Y = 760; // base of the facades
export const CURB_Y = 985; // front edge of the sidewalk
export const LAMP_POSTS = [722, 1372];

export const FONT_DISPLAY = "'Graduate', 'Rockwell', 'Georgia', serif";
export const FONT_BODY = "'Alegreya Sans', 'Trebuchet MS', 'Segoe UI', sans-serif";

const SODIUM = hex('#ffad58');
const WARM = hex('#ffc27a');
const NEON_RED = hex('#ff4a3d');
const FLUO = hex('#d6f1ff');

export function buildUseraLights(): LightRig {
  const rig = new LightRig('#3d4772');
  rig.key = { x: 0.55, y: -0.83 }; // moon, upper right
  // Street lamps: head light (walls, characters) + elliptical pool on the floor.
  for (const x of LAMP_POSTS) {
    rig.add({ x, y: 520, r: 470, color: SODIUM, power: 0.5 });
    rig.add({ x, y: 905, r: 430, color: SODIUM, power: 0.75, flat: 0.34 });
  }
  // Bar interior spilling out through the window and the door.
  rig.add({ x: 260, y: 700, r: 420, color: WARM, power: 0.6, flat: 0.75 });
  rig.add({ x: 505, y: 760, r: 300, color: WARM, power: 0.55, flat: 0.6 });
  // Chinese restaurant: neon (animated) and lanterns.
  rig.add({ x: 1040, y: 470, r: 470, color: NEON_RED, power: 0.42, group: 'neon' });
  rig.add({ x: 1030, y: 760, r: 300, color: hex('#ffb070'), power: 0.4, flat: 0.6 });
  // Bazaar fluorescent tubes: the one cold practical light.
  rig.add({ x: 1560, y: 720, r: 380, color: FLUO, power: 0.5, flat: 0.7 });
  // Terrace string lights on the plaza.
  rig.add({ x: 2080, y: 820, r: 380, color: hex('#ffcf8a'), power: 0.5, flat: 0.55 });
  // Side-street lamp that picks out the camper van and the truck (the logo nod).
  rig.add({ x: 2120, y: 560, r: 360, color: SODIUM, power: 0.42 });
  // Distant lamps up the side street (small, fogged).
  rig.add({ x: 1990, y: 712, r: 110, color: SODIUM, power: 0.5, flat: 0.3 });
  rig.add({ x: 2240, y: 706, r: 90, color: SODIUM, power: 0.45, flat: 0.3 });
  return rig;
}

interface Emissive {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  glow?: number;
}

export interface Baked {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
}

/** Bake both layers at `px` device pixels per world unit. */
export function bakeUsera(px: number, rig: LightRig): Baked {
  const W = SCENE_W * px;
  const H = SCENE_H * px;
  const back = makeCanvas(W, H);
  const front = makeCanvas(W, H);
  const emissive: Emissive[] = [];

  // 1. Sky and far planes, painted directly in night tones.
  back.ctx.setTransform(px, 0, 0, px, 0, 0);
  paintSky(back.ctx);
  const farLights: Emissive[] = [];
  paintFarCity(back.ctx, farLights);
  paintEmissive(back.ctx, farLights);

  // 2. Near albedo, lit by the light map.
  const near = makeCanvas(W, H);
  near.ctx.setTransform(px, 0, 0, px, 0, 0);
  paintNear(near.ctx, emissive);
  applyLight(near.c, rig, px);
  back.ctx.setTransform(1, 0, 0, 1, 0, 0);
  back.ctx.drawImage(near.c, 0, 0);
  back.ctx.setTransform(px, 0, 0, px, 0, 0);

  // 3. Emissive surfaces and wet reflections.
  paintEmissive(back.ctx, emissive);
  paintReflections(back.ctx, back.c, px, rig);
  paintAtmosphere(back.ctx);

  // 4. Front layer.
  front.ctx.setTransform(px, 0, 0, px, 0, 0);
  paintFront(front.ctx);
  applyLight(front.c, rig, px);
  front.ctx.setTransform(px, 0, 0, px, 0, 0);
  paintFrontEmissive(front.ctx, rig);
  return { back: back.c, front: front.c };
}

function applyLight(target: HTMLCanvasElement, rig: LightRig, px: number) {
  const lm = makeCanvas(target.width, target.height);
  lm.ctx.setTransform(px, 0, 0, px, 0, 0);
  rig.paintLightMap(lm.ctx, SCENE_W, SCENE_H);
  const alpha = makeCanvas(target.width, target.height);
  alpha.ctx.drawImage(target, 0, 0);
  const ctx = target.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lm.c, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alpha.c, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- sky

function paintSky(ctx: Ctx) {
  ctx.fillStyle = vgrad(ctx, 0, 720, [
    [0, '#0c1226'],
    [0.35, '#18213f'],
    [0.7, '#2f3456'],
    [0.9, '#5a4a62'],
    [1, '#7a5b63'],
  ]);
  ctx.fillRect(0, 0, SCENE_W, 760);
  // Moon (the key light), with a soft halo that never hides its disc.
  const mx = 2140;
  const my = 150;
  const halo = ctx.createRadialGradient(mx, my, 20, mx, my, 170);
  halo.addColorStop(0, 'rgba(220,226,255,0.35)');
  halo.addColorStop(1, 'rgba(220,226,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 170, my - 170, 340, 340);
  ctx.fillStyle = '#f3f0e6';
  ctx.beginPath();
  ctx.arc(mx, my, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,190,205,0.45)';
  ctx.beginPath();
  ctx.ellipse(mx - 9, my - 6, 11, 8, 0.4, 0, Math.PI * 2);
  ctx.ellipse(mx + 10, my + 9, 8, 6, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Clouds: soft bands lit from below by the orange city glow.
  const r = rng(7);
  for (let i = 0; i < 9; i++) {
    const cx = 700 + r() * 1750;
    const cy = 60 + r() * 360;
    const w = 260 + r() * 380;
    const h = 40 + r() * 50;
    const g = ctx.createLinearGradient(0, cy - h, 0, cy + h);
    g.addColorStop(0, 'rgba(30,38,66,0)');
    g.addColorStop(0.45, 'rgba(36,42,72,0.75)');
    g.addColorStop(1, 'rgba(110,84,96,0.55)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const ox = (k / 4 - 0.5) * w;
      const rr2 = h * (0.6 + r() * 0.6);
      ctx.moveTo(cx + ox + rr2, cy);
      ctx.ellipse(cx + ox, cy - r() * h * 0.3, rr2 * 1.6, rr2, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}

function paintFarCity(ctx: Ctx, em: Emissive[]) {
  const r = rng(21);
  // Two depth rows of apartment blocks behind the side street.
  const rows = [
    { base: 705, minH: 300, maxH: 470, col: '#26304c', win: 0.16, s: 0.55 },
    { base: 712, minH: 160, maxH: 300, col: '#2d3753', win: 0.22, s: 0.7 },
  ];
  for (const row of rows) {
    let x = 1780;
    while (x < SCENE_W + 40) {
      const w = 120 + r() * 160;
      const h = row.minH + r() * (row.maxH - row.minH);
      const top = row.base - h;
      ctx.fillStyle = row.col;
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(x, top, w * 0.18, h);
      // Windows grid, a few lit.
      const ww = 9 * row.s * 1.6;
      const wh = 13 * row.s * 1.6;
      for (let wy = top + 18; wy < row.base - 30; wy += wh * 2.2) {
        for (let wx = x + 12; wx < x + w - 12; wx += ww * 2.4) {
          if (r() < row.win) em.push({ x: wx, y: wy, w: ww, h: wh, color: r() < 0.8 ? '#f4b35e' : '#bcd6ff' });
          else {
            ctx.fillStyle = 'rgba(10,14,28,0.5)';
            ctx.fillRect(wx, wy, ww, wh);
          }
        }
      }
      x += w + 6 + r() * 20;
    }
    // Atmospheric haze between planes (rule F4).
    ctx.fillStyle = vgrad(ctx, row.base - row.maxH, row.base, [
      [0, 'rgba(92,86,118,0.05)'],
      [1, 'rgba(110,92,112,0.42)'],
    ]);
    ctx.fillRect(1780, row.base - row.maxH, SCENE_W - 1780, row.maxH);
  }
}

// ---------------------------------------------------------------- near albedo

const BRICK: [string, string, string] = ['#a35d45', '#8c4c39', '#b8735a'];
const MORTAR = '#c4ad96';

function paintNear(ctx: Ctx, em: Emissive[]) {
  // Side street: road going into the distance.
  ctx.fillStyle = vgrad(ctx, 700, GROUND_Y, [
    [0, '#5b5d6b'],
    [1, '#4a4c58'],
  ]);
  ctx.fillRect(1830, 700, SCENE_W - 1830, GROUND_Y - 700);
  // Far kerb line.
  fillRect(ctx, 1830, 700, SCENE_W - 1830, 5, '#8b8a90');

  paintVehicles(ctx);
  paintDistantLampPosts(ctx);

  // Buildings, left to right.
  paintBuilding(ctx, -20, 720, -40, 1, em);
  paintBuilding(ctx, 700, 1370, 150, 2, em);
  paintBuilding(ctx, 1370, 1830, 40, 3, em);
  // Corner side wall in shadow.
  poly(ctx, [1830, 40, 1880, 70, 1880, GROUND_Y - 10, 1830, GROUND_Y]);
  ctx.fillStyle = '#6e3f31';
  ctx.fill();

  paintBarFront(ctx, em);
  paintRestaurantFront(ctx, em);
  paintBazaarFront(ctx, em);

  // Sidewalk.
  ctx.fillStyle = vgrad(ctx, GROUND_Y, CURB_Y, [
    [0, '#8b8682'],
    [1, '#a39d97'],
  ]);
  ctx.fillRect(0, GROUND_Y, SCENE_W, CURB_Y - GROUND_Y);
  // Tiles in perspective: rows widen towards the camera (detail grows with nearness).
  ctx.strokeStyle = 'rgba(70,64,60,0.35)';
  ctx.lineWidth = 2;
  let y = GROUND_Y + 14;
  let step = 16;
  while (y < CURB_Y) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCENE_W, y);
    ctx.stroke();
    step *= 1.18;
    y += step;
  }
  const vpX = 1200;
  const vpY = 260;
  for (let x = -1400; x < SCENE_W + 1400; x += 80) {
    const t0 = (GROUND_Y - vpY) / (CURB_Y - vpY);
    ctx.beginPath();
    ctx.moveTo(vpX + (x - vpX) * t0, GROUND_Y);
    ctx.lineTo(x, CURB_Y);
    ctx.stroke();
  }
  // Facade base shadow (contact).
  ctx.fillStyle = vgrad(ctx, GROUND_Y, GROUND_Y + 26, [
    [0, 'rgba(20,18,24,0.45)'],
    [1, 'rgba(20,18,24,0)'],
  ]);
  ctx.fillRect(0, GROUND_Y, 1830, 26);

  // Fruit crates outside the bazaar.
  paintCrates(ctx);
  // Metro totem.
  paintMetroTotem(ctx, 1770, 792);
  // Terrace string-light posts on the plaza.
  for (const x of [1905, 2265]) {
    fillRect(ctx, x - 4, 640, 8, 140, '#3a3a40');
  }
}

function paintBuilding(ctx: Ctx, x0: number, x1: number, top: number, seed: number, em: Emissive[]) {
  const w = x1 - x0;
  bricks(ctx, x0, top, w, 420 - top, seed * 13, BRICK, MORTAR);
  // Cornice and floor bands.
  if (top > 0) {
    fillRect(ctx, x0 - 8, top - 14, w + 16, 18, '#d9cdb8');
    fillRect(ctx, x0 - 8, top + 4, w + 16, 6, '#a89880');
  }
  // Upper floors: Madrid balconies with blinds (persianas).
  const r = rng(seed * 101);
  const floorH = 185;
  for (let fy = 420 - floorH; fy > top - 40; fy -= floorH) {
    fillRect(ctx, x0, fy + floorH - 12, w, 12, '#cbbda6');
    const bays = Math.max(1, Math.round(w / 175));
    const bw = w / bays;
    for (let b = 0; b < bays; b++) {
      const cx = x0 + bw * (b + 0.5);
      const ww = 64;
      const wh = 112;
      const wx = cx - ww / 2;
      const wy = fy + 34;
      if (wy + wh < top + 10) continue;
      // Frame and dark glass.
      fillRect(ctx, wx - 6, wy - 6, ww + 12, wh + 12, '#e4dccb');
      fillRect(ctx, wx, wy, ww, wh, '#2a2f40');
      // Blind lowered a random amount.
      const blind = 0.2 + r() * 0.7;
      const lit = r() < 0.32;
      if (lit) em.push({ x: wx, y: wy + wh * blind, w: ww, h: wh * (1 - blind), color: r() < 0.75 ? '#ffc275' : '#cfe0ff', glow: 0.5 });
      ctx.fillStyle = '#c9b48f';
      ctx.fillRect(wx, wy, ww, wh * blind);
      ctx.strokeStyle = 'rgba(90,70,50,0.35)';
      ctx.lineWidth = 1.5;
      for (let k = wy + 6; k < wy + wh * blind; k += 6) {
        ctx.beginPath();
        ctx.moveTo(wx, k);
        ctx.lineTo(wx + ww, k);
        ctx.stroke();
      }
      // Balcony slab and railing.
      fillRect(ctx, wx - 18, wy + wh - 4, ww + 36, 9, '#cfc3ad');
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(wx - 16, wy + wh - 48);
      ctx.lineTo(wx + ww + 16, wy + wh - 48);
      for (let k = wx - 14; k <= wx + ww + 16; k += 9) {
        ctx.moveTo(k, wy + wh - 48);
        ctx.lineTo(k, wy + wh - 4);
      }
      ctx.stroke();
      // Air-conditioning unit or a plant, now and then.
      const extra = r();
      if (extra < 0.3) {
        rr(ctx, wx + ww + 22, wy + wh - 44, 46, 34, 4);
        ctx.fillStyle = '#d7d9d6';
        ctx.fill();
        ctx.fillStyle = '#9da3a6';
        ctx.beginPath();
        ctx.arc(wx + ww + 45, wy + wh - 27, 11, 0, Math.PI * 2);
        ctx.fill();
      } else if (extra < 0.5) {
        ctx.fillStyle = '#3f6b45';
        ctx.beginPath();
        ctx.ellipse(wx + 6, wy + wh - 52, 18, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function paintBarFront(ctx: Ctx, em: Emissive[]) {
  // Ground floor in painted render (cream) over the brick.
  fillRect(ctx, -20, 420, 740, GROUND_Y - 420, '#d8ccb4');
  fillRect(ctx, -20, 420, 740, 14, '#b9ab92');
  // Sign board.
  rr(ctx, 40, 440, 560, 64, 8);
  ctx.fillStyle = '#2d5a43';
  ctx.fill();
  ctx.strokeStyle = '#d7b46a';
  ctx.lineWidth = 4;
  ctx.stroke();
  signText(ctx, 'BAR LA PARADA', 320, 474, 520, `44px ${FONT_DISPLAY}`, '#efe3c6');
  // Big window with the warm interior.
  fillRect(ctx, 50, 540, 360, 190, '#5b3b28');
  em.push({ x: 62, y: 552, w: 336, h: 166, color: 'bar', glow: 0.8 });
  // Door.
  fillRect(ctx, 440, 520, 130, GROUND_Y - 520, '#5b3b28');
  em.push({ x: 452, y: 532, w: 106, h: GROUND_Y - 538, color: 'bardoor', glow: 0.7 });
  // Awning over the window.
  poly(ctx, [36, 516, 424, 516, 446, 586, 14, 586]);
  ctx.fillStyle = '#2f6b4c';
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let x = 14; x < 450; x += 44) {
    poly(ctx, [x, 516, x + 22, 516, x + 30, 586, x + 6, 586]);
    ctx.fillStyle = '#e8dfc6';
    ctx.fill();
  }
  ctx.restore();
  // Scalloped valance.
  ctx.fillStyle = '#2f6b4c';
  for (let x = 14; x < 446; x += 27) {
    ctx.beginPath();
    ctx.arc(x + 13.5, 586, 13.5, 0, Math.PI);
    ctx.fill();
  }
  fillRect(ctx, 14, 580, 432, 6, '#24543b');
  // Building entrance (portal) with intercom.
  fillRect(ctx, 600, 470, 96, GROUND_Y - 470, '#6b4630');
  fillRect(ctx, 608, 478, 80, GROUND_Y - 486, '#7d5338');
  fillRect(ctx, 646, 478, 4, GROUND_Y - 486, '#5d3d2a');
  fillRect(ctx, 704, 600, 12, 30, '#b8b4aa');
  // Menu board on the sidewalk.
  poly(ctx, [370, 800, 404, 700, 438, 800]);
  ctx.fillStyle = '#5d4030';
  ctx.fill();
  poly(ctx, [378, 790, 404, 716, 430, 790]);
  ctx.fillStyle = '#25302b';
  ctx.fill();
  ctx.fillStyle = '#e6e2d6';
  ctx.font = `bold 12px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.fillText('CAÑA', 404, 748);
  ctx.fillText('1,80 €', 404, 764);
}

function paintRestaurantFront(ctx: Ctx, em: Emissive[]) {
  fillRect(ctx, 700, 420, 670, GROUND_Y - 420, '#9c2f28');
  fillRect(ctx, 700, 420, 670, 12, '#7d241f');
  // Gold trim.
  ctx.strokeStyle = '#d6a64a';
  ctx.lineWidth = 5;
  ctx.strokeRect(724, 520, 622, GROUND_Y - 520);
  // Neon backing board (the neon itself is drawn live, it flickers).
  rr(ctx, 860, 432, 360, 76, 10);
  ctx.fillStyle = '#3a1416';
  ctx.fill();
  // Windows and door.
  fillRect(ctx, 740, 540, 260, 190, '#4a1b17');
  em.push({ x: 750, y: 550, w: 240, h: 170, color: 'rest', glow: 0.5 });
  fillRect(ctx, 1030, 540, 120, GROUND_Y - 540, '#4a1b17');
  em.push({ x: 1040, y: 550, w: 100, h: GROUND_Y - 556, color: 'restdoor', glow: 0.4 });
  fillRect(ctx, 1170, 540, 160, 190, '#4a1b17');
  em.push({ x: 1180, y: 550, w: 140, h: 170, color: 'rest', glow: 0.5 });
  // Lantern cords.
  ctx.strokeStyle = '#2a1a14';
  ctx.lineWidth = 2;
  for (const x of [780, 1300]) {
    ctx.beginPath();
    ctx.moveTo(x, 520);
    ctx.lineTo(x, 545);
    ctx.stroke();
  }
}

function paintBazaarFront(ctx: Ctx, em: Emissive[]) {
  fillRect(ctx, 1370, 420, 460, GROUND_Y - 420, '#cdbf9f');
  // Light-box sign.
  rr(ctx, 1395, 436, 410, 70, 6);
  ctx.fillStyle = '#2c3e66';
  ctx.fill();
  em.push({ x: 1402, y: 443, w: 396, h: 56, color: 'bazaarsign', glow: 0.35 });
  // Shutter half up, bright interior below.
  fillRect(ctx, 1400, 530, 400, GROUND_Y - 530, '#4b4f58');
  const shutterBottom = 600;
  em.push({ x: 1406, y: shutterBottom, w: 388, h: GROUND_Y - shutterBottom - 4, color: 'bazaar', glow: 0.55 });
  ctx.fillStyle = '#a8adb4';
  ctx.fillRect(1400, 530, 400, shutterBottom - 530);
  ctx.strokeStyle = 'rgba(60,64,72,0.55)';
  ctx.lineWidth = 2;
  for (let y = 536; y < shutterBottom; y += 9) {
    ctx.beginPath();
    ctx.moveTo(1400, y);
    ctx.lineTo(1800, y);
    ctx.stroke();
  }
  fillRect(ctx, 1400, shutterBottom - 6, 400, 8, '#6e737c');
}

function paintCrates(ctx: Ctx) {
  const r = rng(5);
  const fruit = [
    ['#e8892a', '#c46a1a'],
    ['#c63a2e', '#9a2a22'],
    ['#9cc23e', '#76972c'],
  ];
  for (let i = 0; i < 3; i++) {
    const x = 1420 + i * 92;
    const y = 772;
    fillRect(ctx, x, y - 6, 80, 40, '#a27a4c');
    fillRect(ctx, x, y + 6, 80, 5, '#86623a');
    const [base, sh] = fruit[i];
    for (let k = 0; k < 9; k++) {
      const fx = x + 10 + (k % 5) * 15 + r() * 3;
      const fy = y - 8 - Math.floor(k / 5) * 9 + r() * 2;
      ctx.fillStyle = sh;
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(fx - 1.5, fy - 1.5, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintMetroTotem(ctx: Ctx, x: number, base: number) {
  fillRect(ctx, x - 7, base - 250, 14, 250, '#3b3f48');
  rr(ctx, x - 40, base - 300, 80, 62, 8);
  ctx.fillStyle = '#e9e6dd';
  ctx.fill();
  // Diamond + "M", Madrid-metro style but not the official mark.
  ctx.save();
  ctx.translate(x, base - 270);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#c8302c';
  ctx.fillRect(-18, -18, 36, 36);
  ctx.restore();
  ctx.fillStyle = '#2b4d8f';
  ctx.fillRect(x - 30, base - 276, 60, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 12px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('METRO', x, base - 268);
  fillRect(ctx, x - 40, base - 232, 80, 22, '#2b4d8f');
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 14px ${FONT_BODY}`;
  ctx.fillText('Usera', x, base - 220);
}

function paintVehicles(ctx: Ctx) {
  // Camper van (the "caravana"), a nod to the crew's logo.
  const s = 0.82;
  ctx.save();
  ctx.translate(1890, 752);
  ctx.scale(s, s);
  // Body.
  rr(ctx, 0, -230, 300, 190, 18);
  ctx.fillStyle = '#e9e3d6';
  ctx.fill();
  // Over-cab bunk.
  rr(ctx, 180, -282, 170, 70, 26);
  ctx.fillStyle = '#e4ddcd';
  ctx.fill();
  // Cab.
  poly(ctx, [300, -200, 372, -200, 400, -120, 410, -60, 300, -60]);
  ctx.fillStyle = '#e9e3d6';
  ctx.fill();
  poly(ctx, [312, -192, 362, -192, 384, -128, 312, -128]);
  ctx.fillStyle = '#39465a';
  ctx.fill();
  // Retro stripes.
  fillRect(ctx, 0, -120, 410, 12, '#c8692d');
  fillRect(ctx, 0, -104, 410, 7, '#8c4a24');
  // Windows and door.
  rr(ctx, 30, -200, 80, 50, 8);
  ctx.fillStyle = '#39465a';
  ctx.fill();
  rr(ctx, 200, -265, 60, 30, 10);
  ctx.fill();
  rr(ctx, 140, -205, 46, 140, 6);
  ctx.strokeStyle = '#b9b2a2';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Shadow side underneath and wheels.
  fillRect(ctx, 0, -60, 410, 20, '#b8b0a0');
  for (const wx of [70, 330]) {
    ctx.fillStyle = '#1c1d22';
    ctx.beginPath();
    ctx.arc(wx, -38, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9a9ca4';
    ctx.beginPath();
    ctx.arc(wx, -38, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Truck cab peeking in from the right, American style like the logo.
  ctx.save();
  ctx.translate(2250, 748);
  ctx.scale(0.8, 0.8);
  rr(ctx, 0, -330, 190, 270, 14);
  ctx.fillStyle = '#9c3328';
  ctx.fill();
  rr(ctx, 20, -310, 120, 90, 10);
  ctx.fillStyle = '#39465a';
  ctx.fill();
  fillRect(ctx, 190, -250, 120, 190, '#9c3328');
  // Chrome grille and exhaust stack.
  fillRect(ctx, 290, -240, 34, 170, '#c9ccd2');
  for (let y = -230; y < -80; y += 14) fillRect(ctx, 292, y, 30, 5, '#8d9097');
  fillRect(ctx, 168, -470, 14, 160, '#c9ccd2');
  fillRect(ctx, 0, -70, 330, 18, '#2d2d33');
  for (const wx of [80, 270]) {
    ctx.fillStyle = '#1c1d22';
    ctx.beginPath();
    ctx.arc(wx, -40, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a3a6ad';
    ctx.beginPath();
    ctx.arc(wx, -40, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintDistantLampPosts(ctx: Ctx) {
  for (const [x, base, h] of [
    [1990, 712, 120],
    [2240, 706, 100],
  ]) {
    fillRect(ctx, x - 2.5, base - h, 5, h, '#2a2c34');
    fillRect(ctx, x - 7, base - h - 14, 14, 16, '#3a3c44');
  }
}

// ---------------------------------------------------------------- emissive

function paintEmissive(ctx: Ctx, em: Emissive[]) {
  for (const e of em) {
    switch (e.color) {
      case 'bar':
        paintBarInterior(ctx, e);
        break;
      case 'bardoor':
        ctx.fillStyle = vgrad(ctx, e.y, e.y + e.h, [
          [0, '#ffd593'],
          [1, '#f0a85a'],
        ]);
        ctx.fillRect(e.x, e.y, e.w, e.h);
        fillRect(ctx, e.x + e.w / 2 - 2, e.y, 4, e.h, 'rgba(90,60,40,0.6)');
        fillRect(ctx, e.x + e.w - 18, e.y + e.h * 0.5, 8, 26, '#c9a25a');
        break;
      case 'rest':
      case 'restdoor':
        ctx.fillStyle = vgrad(ctx, e.y, e.y + e.h, [
          [0, '#ffcf8f'],
          [1, '#f39a5e'],
        ]);
        ctx.fillRect(e.x, e.y, e.w, e.h);
        if (e.color === 'rest') {
          // Lattice pattern and a fortune cat silhouette.
          ctx.strokeStyle = 'rgba(140,40,30,0.55)';
          ctx.lineWidth = 3;
          for (let x = e.x + 20; x < e.x + e.w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, e.y);
            ctx.lineTo(x, e.y + 34);
            ctx.stroke();
          }
          fillRect(ctx, e.x, e.y + 34, e.w, 4, 'rgba(140,40,30,0.55)');
          ctx.fillStyle = '#f2e6c8';
          ctx.beginPath();
          ctx.ellipse(e.x + 40, e.y + e.h - 26, 15, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(e.x + 40, e.y + e.h - 52, 13, 0, Math.PI * 2);
          ctx.fill();
          fillRect(ctx, e.x + 50, e.y + e.h - 78, 7, 22, '#f2e6c8');
        }
        break;
      case 'bazaarsign':
        ctx.fillStyle = vgrad(ctx, e.y, e.y + e.h, [
          [0, '#f6f8ff'],
          [1, '#d8e4ff'],
        ]);
        ctx.fillRect(e.x, e.y, e.w, e.h);
        signText(ctx, 'ALIMENTACIÓN · 24H', e.x + e.w / 2, e.y + e.h / 2 + 1, e.w - 30, `800 34px ${FONT_BODY}`, '#24396b');
        break;
      case 'bazaar':
        paintBazaarInterior(ctx, e);
        break;
      default:
        fillRect(ctx, e.x, e.y, e.w, e.h, e.color);
    }
  }
  // Glows on the sources only.
  for (const e of em) {
    if (!e.glow) continue;
    const c = e.color.startsWith('#') ? css(hex(e.color)) : e.color.startsWith('bazaar') ? 'rgb(214,236,255)' : 'rgb(255,190,120)';
    glow(ctx, e.x + e.w / 2, e.y + e.h / 2, Math.max(e.w, e.h) * 0.9, c, e.glow * 0.35);
  }
}

function paintBarInterior(ctx: Ctx, e: Emissive) {
  ctx.fillStyle = vgrad(ctx, e.y, e.y + e.h, [
    [0, '#ffd99c'],
    [0.6, '#f6b36a'],
    [1, '#d98a4a'],
  ]);
  ctx.fillRect(e.x, e.y, e.w, e.h);
  // Bottle shelf and bar counter.
  fillRect(ctx, e.x, e.y + 40, e.w, 5, 'rgba(110,60,30,0.65)');
  const r = rng(3);
  for (let x = e.x + 12; x < e.x + e.w - 10; x += 16) {
    const h = 18 + r() * 12;
    ctx.fillStyle = r() < 0.5 ? 'rgba(60,110,70,0.75)' : 'rgba(130,60,40,0.75)';
    rr(ctx, x, e.y + 40 - h, 9, h, 3);
    ctx.fill();
  }
  fillRect(ctx, e.x, e.y + e.h - 52, e.w, 52, 'rgba(110,62,34,0.85)');
  fillRect(ctx, e.x, e.y + e.h - 56, e.w, 6, 'rgba(70,40,24,0.9)');
  // Regulars at the bar, as soft silhouettes (no detail behind glass).
  ctx.fillStyle = 'rgba(80,44,30,0.55)';
  for (const [x, s] of [
    [e.x + 70, 1],
    [e.x + 160, 0.92],
    [e.x + 270, 1.05],
  ]) {
    ctx.beginPath();
    ctx.arc(x, e.y + e.h - 98 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
    rr(ctx, x - 30 * s, e.y + e.h - 80 * s, 60 * s, 80 * s, 22 * s);
    ctx.fill();
  }
  // Beer taps.
  for (const x of [e.x + 215, e.x + 232]) fillRect(ctx, x, e.y + e.h - 76, 6, 22, 'rgba(210,200,190,0.9)');
  // Window frame.
  fillRect(ctx, e.x + e.w / 2 - 3, e.y, 6, e.h, '#5b3b28');
}

function paintBazaarInterior(ctx: Ctx, e: Emissive) {
  ctx.fillStyle = vgrad(ctx, e.y, e.y + e.h, [
    [0, '#f3fbff'],
    [1, '#cfe2ea'],
  ]);
  ctx.fillRect(e.x, e.y, e.w, e.h);
  const r = rng(11);
  const cols = ['#e04a3a', '#f0c23a', '#3a7be0', '#3ab070', '#e07a2a', '#9a4ad0'];
  for (let sy = e.y + 30; sy < e.y + e.h - 20; sy += 44) {
    fillRect(ctx, e.x + 8, sy, e.w - 16, 5, '#9fb0b8');
    for (let x = e.x + 12; x < e.x + e.w - 20; x += 13) {
      const h = 14 + r() * 18;
      ctx.fillStyle = cols[Math.floor(r() * cols.length)];
      ctx.globalAlpha = 0.75;
      ctx.fillRect(x, sy - h, 10, h);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------- reflections

function paintReflections(ctx: Ctx, src: HTMLCanvasElement, px: number, rig: LightRig) {
  // Storefronts mirrored on the wet sidewalk, fading out quickly.
  const H = 150;
  const tmp = makeCanvas(SCENE_W * px, H * px);
  tmp.ctx.setTransform(1, 0, 0, -1, 0, H * px);
  tmp.ctx.drawImage(src, 0, (GROUND_Y - H) * px, SCENE_W * px, H * px, 0, 0, SCENE_W * px, H * px);
  tmp.ctx.setTransform(1, 0, 0, 1, 0, 0);
  tmp.ctx.globalCompositeOperation = 'destination-in';
  const g = tmp.ctx.createLinearGradient(0, 0, 0, H * px);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  tmp.ctx.fillStyle = g;
  tmp.ctx.fillRect(0, 0, SCENE_W * px, H * px);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(tmp.c, 0, GROUND_Y + 2, SCENE_W, H * 0.8);
  ctx.restore();
  // Light pools on wet paving get a vertical sheen.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, GROUND_Y, SCENE_W, CURB_Y - GROUND_Y);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of rig.lights) {
    if (!l.flat || l.group) continue;
    paintPool(ctx, { ...l, r: l.r * 0.5, flat: 0.25, power: l.power * 0.12 }, 1);
  }
  ctx.restore();
  // Puddles: darker, mirror the sky and catch a highlight.
  const puddles: Array<[number, number, number, number]> = [
    [560, 880, 90, 16],
    [1180, 930, 130, 18],
    [1700, 845, 70, 11],
    [2160, 950, 110, 16],
  ];
  for (const [x, y, w, h] of puddles) {
    // Dark water with soft edges that mirrors the sky, plus a light glint.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / w);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
    g.addColorStop(0, 'rgba(34,40,66,0.62)');
    g.addColorStop(0.75, 'rgba(34,40,66,0.45)');
    g.addColorStop(1, 'rgba(34,40,66,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
    const lc = rig.at(x, y - 300);
    ctx.fillStyle = css(lc, 0.28);
    ctx.beginPath();
    ctx.ellipse(x + w * 0.2, y - h * 0.15, w * 0.35, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintAtmosphere(ctx: Ctx) {
  // A thin layer of mist sitting at street level, cooler in the distance.
  ctx.fillStyle = vgrad(ctx, 560, GROUND_Y + 40, [
    [0, 'rgba(120,110,140,0)'],
    [1, 'rgba(120,110,140,0.14)'],
  ]);
  ctx.fillRect(0, 560, SCENE_W, GROUND_Y + 40 - 560);
  ctx.fillStyle = vgrad(ctx, 380, 760, [
    [0, 'rgba(110,100,130,0)'],
    [1, 'rgba(130,110,130,0.14)'],
  ]);
  ctx.fillRect(1840, 380, SCENE_W - 1840, 380);
}

// ---------------------------------------------------------------- front layer



function paintFront(ctx: Ctx) {
  // Curb and road.
  fillRect(ctx, 0, CURB_Y, SCENE_W, 14, '#b9b4ae');
  fillRect(ctx, 0, CURB_Y + 14, SCENE_W, 5, '#6f6b68');
  ctx.fillStyle = vgrad(ctx, CURB_Y + 19, SCENE_H, [
    [0, '#4b4c56'],
    [1, '#3e3f48'],
  ]);
  ctx.fillRect(0, CURB_Y + 19, SCENE_W, SCENE_H - CURB_Y - 19);
  // Road markings.
  for (let x = 40; x < SCENE_W; x += 260) fillRect(ctx, x, 1052, 150, 8, '#bdb8a8');
  // Bollards.
  for (const x of [230, 470, 990, 1250, 1430, 1940, 2330]) {
    rr(ctx, x - 9, CURB_Y - 64, 18, 70, 7);
    ctx.fillStyle = '#2e2f36';
    ctx.fill();
    fillRect(ctx, x - 11, CURB_Y - 58, 22, 6, '#3f4049');
  }
  // Fernandina-style lamp posts.
  for (const x of LAMP_POSTS) {
    rr(ctx, x - 22, CURB_Y - 46, 44, 52, 6);
    ctx.fillStyle = '#25262d';
    ctx.fill();
    poly(ctx, [x - 9, CURB_Y - 44, x + 9, CURB_Y - 44, x + 6, 560, x - 6, 560]);
    ctx.fill();
    fillRect(ctx, x - 12, 690, 24, 10, '#30313a');
    fillRect(ctx, x - 14, 548, 28, 14, '#30313a');
    // Lantern cage (glass is emissive, drawn afterwards).
    poly(ctx, [x - 30, 470, x + 30, 470, x + 20, 548, x - 20, 548]);
    ctx.fillStyle = '#2a2b32';
    ctx.fill();
    poly(ctx, [x - 36, 470, x, 440, x + 36, 470]);
    ctx.fill();
    fillRect(ctx, x - 3, 424, 6, 18, '#2a2b32');
  }
}

function paintFrontEmissive(ctx: Ctx, rig: LightRig) {
  for (const x of LAMP_POSTS) {
    poly(ctx, [x - 24, 476, x + 24, 476, x + 16, 542, x - 16, 542]);
    ctx.fillStyle = vgrad(ctx, 476, 542, [
      [0, '#fff1c8'],
      [1, '#ffbf6a'],
    ]);
    ctx.fill();
    fillRect(ctx, x - 1.5, 476, 3, 66, 'rgba(42,43,50,0.8)');
    glow(ctx, x, 505, 150, 'rgb(255,190,110)', 0.55);
  }
  // Light streaks on the wet road below the lamps and storefronts.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, CURB_Y + 19, SCENE_W, SCENE_H);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const streaks: Array<[number, string, number]> = [
    [LAMP_POSTS[0], 'rgba(255,175,90,', 0.3],
    [LAMP_POSTS[1], 'rgba(255,175,90,', 0.3],
    [260, 'rgba(255,190,120,', 0.16],
    [1040, 'rgba(255,80,60,', 0.16],
    [1600, 'rgba(210,235,255,', 0.13],
  ];
  for (const [x, c, a] of streaks) {
    const g = ctx.createLinearGradient(0, CURB_Y + 19, 0, SCENE_H);
    g.addColorStop(0, c + a + ')');
    g.addColorStop(1, c + '0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, SCENE_H - 20, 34, 120, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  void rig;
}

// ---------------------------------------------------------------- live layer

export interface LiveState {
  neon: number; // 0..1 neon brightness (flicker)
  car: number; // -1 when no car, else 0..1 progress of headlights sweeping
}

/** Animated bits drawn every frame behind the characters. */
export function drawUseraLive(ctx: Ctx, t: number, s: LiveState) {
  // Neon sign: "金龙" + "DRAGÓN DORADO".
  const n = s.neon;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 46px 'Noto Sans SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif`;
  const red = n > 0.5 ? '#ff6a55' : '#7a2a24';
  if (n > 0.5) {
    ctx.shadowColor = 'rgba(255,70,50,0.9)';
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = red;
  ctx.fillText('金龙', 950, 470);
  ctx.shadowBlur = n > 0.5 ? 12 : 0;
  ctx.shadowColor = 'rgba(255,200,80,0.9)';
  ctx.font = `bold 30px ${FONT_DISPLAY}`;
  ctx.fillStyle = n > 0.5 ? '#ffd56a' : '#6e5a2a';
  ctx.fillText('DRAGÓN', 1120, 456);
  ctx.fillText('DORADO', 1120, 488);
  ctx.restore();
  if (n > 0.5) glow(ctx, 1040, 470, 220, 'rgb(255,80,60)', 0.22 * n);

  // Red lanterns swaying gently.
  for (const [x, ph] of [
    [780, 0],
    [1300, 1.7],
  ]) {
    const a = Math.sin(t * 1.3 + ph) * 0.06;
    ctx.save();
    ctx.translate(x, 545);
    ctx.rotate(a);
    ctx.fillStyle = '#d23a2a';
    ctx.beginPath();
    ctx.ellipse(0, 30, 24, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7a4a';
    ctx.beginPath();
    ctx.ellipse(-4, 26, 12, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    fillRect(ctx, -12, -2, 24, 6, '#d6a64a');
    fillRect(ctx, -12, 58, 24, 6, '#d6a64a');
    fillRect(ctx, -2, 64, 4, 16, '#d6a64a');
    ctx.restore();
    glow(ctx, x, 575, 70, 'rgb(255,110,70)', 0.35);
  }

  // Terrace string lights over the plaza.
  ctx.strokeStyle = 'rgba(30,30,36,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1905, 645);
  ctx.quadraticCurveTo(2085, 700, 2265, 645);
  ctx.stroke();
  for (let i = 1; i < 12; i++) {
    const u = i / 12;
    const x = 1905 + (2265 - 1905) * u;
    const y = 645 + 2 * u * (1 - u) * 55;
    const tw = 0.85 + 0.15 * Math.sin(t * 2 + i * 1.7);
    ctx.fillStyle = `rgba(255,214,150,${tw})`;
    ctx.beginPath();
    ctx.arc(x, y + 6, 4.5, 0, Math.PI * 2);
    ctx.fill();
    glow(ctx, x, y + 6, 26, 'rgb(255,200,130)', 0.4 * tw);
  }

  // A car passing up the side street: its headlights sweep the scene (light event, rule L6).
  if (s.car >= 0) {
    const u = s.car;
    const x = 2450 - u * 700;
    const k = Math.sin(u * Math.PI);
    glow(ctx, x, 735, 260, 'rgb(230,235,255)', 0.35 * k);
    ctx.fillStyle = `rgba(255,252,235,${0.9 * k})`;
    ctx.beginPath();
    ctx.arc(x, 735, 6, 0, Math.PI * 2);
    ctx.arc(x + 30, 735, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Live light gains that also tint the characters. */
export function updateUseraLights(rig: LightRig, s: LiveState) {
  rig.gain.neon = s.neon > 0.5 ? 1 : 0.15;
}

