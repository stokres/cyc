// Interactive props drawn live (they change state and are depth-sorted with the crew).
import { css, hex, mul, RGB } from '../core/color';
import { drawBeerGlass } from './rig';

export function drawTerraceTable(ctx: CanvasRenderingContext2D, x: number, y: number, tint: RGB, wet: boolean, beers: number[], t: number) {
  const P = (h: string) => css(mul(hex(h), tint));
  // Contact shadow.
  ctx.fillStyle = 'rgba(12,10,20,0.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 120, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Chairs (aluminium, Madrid terrace classic).
  for (const [cx, flip] of [
    [x - 120, 1],
    [x + 120, -1],
  ]) {
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(flip, 1);
    ctx.strokeStyle = P('#6e737c');
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.lineTo(-22, -70);
    ctx.lineTo(-24, -150);
    ctx.moveTo(26, 0);
    ctx.lineTo(22, -70);
    ctx.stroke();
    ctx.fillStyle = P('#a9aeb6');
    ctx.beginPath();
    ctx.roundRect(-34, -80, 66, 14, 5);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-34, -158, 14, 82, 5);
    ctx.fill();
    ctx.fillStyle = P('#c8ccd3');
    ctx.fillRect(-34, -80, 66, 4);
    ctx.restore();
  }
  // Table: leg, base, top.
  ctx.fillStyle = P('#4a4e57');
  ctx.fillRect(x - 6, y - 118, 12, 118);
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 46, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P('#8d939c');
  ctx.beginPath();
  ctx.ellipse(x, y - 126, 96, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = P('#b6bcc4');
  ctx.beginPath();
  ctx.ellipse(x, y - 130, 92, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  if (wet) {
    // Water beads and a sheen that catches the string lights.
    ctx.fillStyle = 'rgba(200,220,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - 20, y - 131, 50, 7, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(235,245,255,0.8)';
    for (let i = 0; i < 9; i++) {
      const a = i * 2.3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 70 * ((i % 3) / 3 + 0.3), y - 130 + Math.sin(a) * 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // A drip.
    const dy = (t * 60) % 40;
    ctx.fillRect(x + 80, y - 120 + dy, 2, 5);
  }
  beers.forEach((lvl, i) => drawBeerGlass(ctx, x - 48 + i * 32, y - 148, lvl, P));
}
