// Inventory icons, drawn in the same style as the characters (2–3 tones, own-colour line).
import { ItemId } from '../game/state';

export const ITEMS: Record<ItemId, { name: string; look: string }> = {
  movil: { name: 'Móvil', look: 'Catorce mensajes nuevos en el grupo. Todos son memes.' },
  monedas: { name: 'Monedas sueltas', look: 'Tres euros con veinte. Una fortuna en efectivo.' },
  llaves: { name: 'Llaves', look: 'Llaves de casa y un abridor. Siempre preparado.' },
  rollo: { name: 'Rollo de cocina', look: 'Absorbente. Muy absorbente.' },
};

export function drawItem(ctx: CanvasRenderingContext2D, id: ItemId, size: number) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'movil': {
      ctx.translate(50, 50);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#1d2230';
      ctx.beginPath();
      ctx.roundRect(-20, -36, 40, 72, 9);
      ctx.fill();
      ctx.fillStyle = '#3b6fb6';
      ctx.beginPath();
      ctx.roundRect(-16, -30, 32, 58, 5);
      ctx.fill();
      ctx.fillStyle = '#7fd36b';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.roundRect(-12 + (i % 2) * 6, -24 + i * 15, 20, 10, 4);
        ctx.fill();
      }
      ctx.fillStyle = '#e44b3c';
      ctx.beginPath();
      ctx.arc(16, -32, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('14', 16, -32);
      break;
    }
    case 'monedas': {
      const coins: Array<[number, number, string, string]> = [
        [38, 60, '#c9a13c', '#8a6a1c'],
        [60, 54, '#d9b54a', '#94741f'],
        [48, 40, '#bfc3c9', '#7d8188'],
      ];
      for (const [x, y, c, l] of coins) {
        ctx.fillStyle = l;
        ctx.beginPath();
        ctx.ellipse(x, y + 3, 20, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x, y, 18, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = l;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, 11, 6.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'llaves': {
      ctx.strokeStyle = '#8a8f98';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(40, 36, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#d6b04c';
      ctx.strokeStyle = '#8a6a1c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(46, 42, 12, 42, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(56, 66, 10, 5);
      ctx.fillRect(56, 76, 7, 5);
      ctx.fillStyle = '#b9bec6';
      ctx.strokeStyle = '#6d727a';
      ctx.beginPath();
      ctx.roundRect(22, 46, 14, 36, 5);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'rollo': {
      ctx.fillStyle = '#d9d4c8';
      ctx.beginPath();
      ctx.ellipse(50, 22, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(24, 22, 52, 56);
      ctx.fillStyle = '#dfd9cc';
      ctx.fillRect(24, 22, 12, 56);
      ctx.beginPath();
      ctx.ellipse(50, 78, 26, 10, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f4f1ea';
      ctx.beginPath();
      ctx.ellipse(50, 22, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8b0a0';
      ctx.beginPath();
      ctx.ellipse(50, 22, 8, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7fb0c8';
      ctx.lineWidth = 2;
      for (let y = 34; y < 74; y += 14) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.quadraticCurveTo(50, y + 4, 60, y);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}
