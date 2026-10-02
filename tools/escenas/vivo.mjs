// Animated light per scene, drawn every frame over the baked layers.
// Each function runs with the engine as `this`, once per layer (`where` = layer id).

export const VIVO = {
  calle(ctx, where, { glow, px, t }) {
    const S = this.scene;
    const off = (k) => this.vw / 2 - S.CX + k * (S.CX - this.cam);
    if (where === 'fachadas') {
      ctx.save();
      ctx.setTransform(px, 0, 0, px, off(1) * px, 0);
      ctx.globalCompositeOperation = 'lighter';
      // Pharmacy cross: the green LEDs sweep and pulse like the real ones.
      const P = S.spots.cruz;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3);
      glow(ctx, P.x, P.y, 150, '#46ff8a', 0.3 * pulse);
      ctx.fillStyle = `rgba(150,255,190,${(0.35 + 0.5 * pulse).toFixed(2)})`;
      const a = 16;
      ctx.fillRect(P.x - a / 2, P.y - a * 1.5, a, a * 3);
      ctx.fillRect(P.x - a * 1.5, P.y - a / 2, a * 3, a);
      // Bar TV flicker behind the window.
      const tv = S.spots.tele;
      const fl = 0.5 + 0.5 * Math.sin(t * 11) * Math.sin(t * 3.7);
      glow(ctx, tv.x, tv.y, 90, fl > 0.5 ? '#9ec0ff' : '#cfe6ff', 0.18 + 0.12 * fl);
      ctx.restore();
    }
    if (where === 'transversal') {
      // Now and then a car crosses the far end of the side street.
      const T = S.spots.cruce;
      const cyc = (t % 14) / 14;
      if (cyc < 0.25) {
        const u = cyc / 0.25;
        const k = T.k;
        ctx.save();
        ctx.setTransform(px, 0, 0, px, off(k) * px, 0);
        ctx.globalCompositeOperation = 'lighter';
        const x = T.x0 + (T.x1 - T.x0) * u;
        const y = T.y;
        glow(ctx, x, y, 120, '#fff4d8', 0.5);
        ctx.fillStyle = 'rgba(255,250,235,0.95)';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.arc(x - 16, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  },
};
