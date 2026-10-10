// The logo, as the title screen and the trailer show it (src/main.ts, src/ui/trailer.ts).
import logoUrl from '../../assets/logo.png';

/** The logo is black ink on white: turn it into cream ink on transparent. */
export async function logoClaro(): Promise<string> {
  const img = new Image();
  img.src = logoUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const lum = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255;
    const a = (1 - lum) * (d.data[i + 3] / 255);
    d.data[i] = 243;
    d.data[i + 1] = 234;
    d.data[i + 2] = 214;
    d.data[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
