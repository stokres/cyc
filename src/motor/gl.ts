// WebGL2 renderer with relief light (docs/ESTILO.md, T4 and L1–L3).
// Each baked piece arrives as albedo + a low-res light map + emissive. On upload
// a normal map is derived from the drawing itself (its shapes and tones read as
// a gentle bas-relief); every frame the scene lights then shade that relief:
// surfaces turned towards a lamp brighten, those turned away darken, and slopes
// catch a soft highlight. Flat areas keep exactly the baked light, so the scene
// looks the same as in Canvas 2D, plus volume.
import type { LuzCapa, PiezaHorneada, TexturasGL } from './escena';

const VS = `#version 300 es
in vec2 aC;
uniform vec2 uP[4];
uniform vec4 uUV;
uniform vec4 uL;
uniform vec2 uRes;
out vec2 vUv;
out vec2 vPos;
void main() {
  int i = int(aC.x + aC.y * 2.0);
  vec2 p = uP[i];
  vUv = mix(uUV.xy, uUV.zw, aC);
  vPos = mix(uL.xy, uL.zw, aC);
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const FS_LUZ = `#version 300 es
precision highp float;
uniform sampler2D tA;
uniform sampler2D tN;
uniform sampler2D tL;
uniform sampler2D tE;
uniform int uHasL;
uniform int uHasE;
uniform int uNL;
uniform vec4 uLP[16];
uniform vec4 uLC[16];
uniform vec3 uKey;
uniform float uRel;
in vec2 vUv;
in vec2 vPos;
out vec4 o;
void main() {
  vec4 a = texture(tA, vUv);
  vec4 e = uHasE == 1 ? texture(tE, vUv) : vec4(0.0);
  if (a.a + e.a < 0.002) discard;
  vec3 n = normalize(texture(tN, vUv).xyz * 2.0 - 1.0);
  vec3 lm = uHasL == 1 ? texture(tL, vUv).rgb : vec3(1.0);
  // Where does the light come from here? The sky's key light plus every lamp
  // in reach, weighted by how much each one lights this point.
  vec3 D = uKey * 0.35;
  vec3 spec = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uNL) break;
    vec2 d = uLP[i].xy - vPos;
    vec2 dd = vec2(d.x, d.y / uLC[i].w);
    float q = dot(dd, dd) / (uLP[i].z * uLP[i].z);
    if (q >= 1.0) continue;
    float w = (1.0 - q) * (1.0 - q) * uLP[i].w;
    vec3 L = normalize(vec3(d, uLP[i].z * 0.3));
    D += L * w * dot(uLC[i].rgb, vec3(0.3, 0.59, 0.11));
    vec3 Hv = normalize(L + vec3(0.0, 0.0, 1.0));
    spec += uLC[i].rgb * w * pow(max(dot(n, Hv), 0.0), 24.0);
  }
  float len = length(D);
  vec3 Dn = len > 1e-4 ? D / len : vec3(0.0, 0.0, 1.0);
  // Flat surfaces keep the baked light; relief brightens or darkens around it.
  float rel = 1.0 + uRel * (dot(n, Dn) - Dn.z) * 1.6;
  float slope = clamp((1.0 - n.z) * 6.0, 0.0, 1.0);
  vec3 col = a.rgb * lm * clamp(rel, 0.35, 1.9) + spec * a.a * slope * 0.22 * uRel;
  o = vec4(col * (1.0 - e.a) + e.rgb, a.a + e.a * (1.0 - a.a));
}`;

const FS_NRM = `#version 300 es
precision highp float;
uniform sampler2D tA;
uniform vec2 uTx;
uniform float uK;
in vec2 vUv;
out vec4 o;
float h(vec2 off) {
  vec4 c = texture(tA, vUv + off * uTx);
  float l = c.a > 0.0 ? dot(c.rgb / c.a, vec3(0.3, 0.59, 0.11)) : 0.0;
  return c.a * (0.3 + 0.7 * l);
}
void main() {
  float s = 1.0;
  float S = 3.0;
  float gx = (h(vec2(s, 0.0)) - h(vec2(-s, 0.0))) + 0.6 * (h(vec2(S, 0.0)) - h(vec2(-S, 0.0)));
  float gy = (h(vec2(0.0, s)) - h(vec2(0.0, -s))) + 0.6 * (h(vec2(0.0, S)) - h(vec2(0.0, -S)));
  vec3 n = normalize(vec3(-gx * uK, -gy * uK, 1.0));
  o = vec4(n * 0.5 + 0.5, 1.0);
}`;

function compilar(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program');
  const u: Record<string, WebGLUniformLocation | null> = {};
  return { p, u: (name: string) => (name in u ? u[name] : (u[name] = gl.getUniformLocation(p, name))) };
}

export interface DibujoGL {
  /** Four corners in device pixels: top-left, top-right, bottom-left, bottom-right. */
  esquinas: number[];
  /** Texture rectangle [u0, v0, u1, v1] in 0..1. */
  uv?: [number, number, number, number];
  /** The same rectangle in the layer's own units (for the lights). */
  capa: [number, number, number, number];
}

export class RenderGL {
  readonly gl: WebGL2RenderingContext;
  private luz: ReturnType<typeof compilar>;
  private nrm: ReturnType<typeof compilar>;
  private vao: WebGLVertexArrayObject;
  private lp = new Float32Array(64);
  private lc = new Float32Array(64);
  /** Relief strength (0 = flat, as Canvas 2D). */
  relieve = 0.7;
  /** Key light direction (towards the light), e.g. the moon. */
  clave: [number, number, number] = [0.45, -0.75, 0.5];

  static crear(canvas: HTMLCanvasElement, opaco: boolean): RenderGL | null {
    try {
      const gl = canvas.getContext('webgl2', { alpha: !opaco, premultipliedAlpha: true, antialias: false });
      return gl ? new RenderGL(gl) : null;
    } catch {
      return null;
    }
  }

  private constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.luz = compilar(gl, VS, FS_LUZ);
    this.nrm = compilar(gl, VS, FS_NRM);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    for (const pr of [this.luz.p, this.nrm.p]) {
      const loc = gl.getAttribLocation(pr, 'aC');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }
  }

  private textura(src: HTMLCanvasElement | null, w = 0, h = 0) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Upload a baked piece and derive its normal map. Frees the canvases. */
  subir(p: Pick<PiezaHorneada, 'alb' | 'luz' | 'emi' | 'tex' | 'c'>) {
    if (p.tex || !p.alb) return;
    const gl = this.gl;
    const alb = this.textura(p.alb);
    // Normal map at half resolution: relief is soft and this halves the memory.
    const nw = Math.max(1, Math.ceil(p.alb.width / 2));
    const nh = Math.max(1, Math.ceil(p.alb.height / 2));
    const nrm = this.textura(null, nw, nh);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nrm, 0);
    gl.viewport(0, 0, nw, nh);
    gl.disable(gl.BLEND);
    gl.useProgram(this.nrm.p);
    gl.bindVertexArray(this.vao);
    // Corners flipped in y: framebuffer row 0 is the texture's first row (v = 0).
    gl.uniform2fv(this.nrm.u('uP'), [0, nh, nw, nh, 0, 0, nw, 0]);
    gl.uniform4f(this.nrm.u('uUV'), 0, 0, 1, 1);
    gl.uniform4f(this.nrm.u('uL'), 0, 0, 1, 1);
    gl.uniform2f(this.nrm.u('uRes'), nw, nh);
    gl.uniform2f(this.nrm.u('uTx'), 1 / p.alb.width, 1 / p.alb.height);
    gl.uniform1f(this.nrm.u('uK'), 3.2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, alb);
    gl.uniform1i(this.nrm.u('tA'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    const tex: TexturasGL = { alb, nrm, luz: p.luz ? this.textura(p.luz) : null, emi: p.emi ? this.textura(p.emi) : null, w: p.alb.width, h: p.alb.height };
    p.tex = tex;
    // The GPU has them now; let the canvases go.
    p.alb = undefined;
    p.luz = undefined;
    p.emi = undefined;
    p.c = document.createElement('canvas');
  }

  empezar(w: number, h: number, fondo: [number, number, number, number]) {
    const gl = this.gl;
    if (gl.canvas.width !== w || gl.canvas.height !== h) {
      gl.canvas.width = w;
      gl.canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(...fondo);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.luz.p);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.luz.u('uRes'), w, h);
    gl.uniform3fv(this.luz.u('uKey'), this.clave);
    gl.uniform1i(this.luz.u('tA'), 0);
    gl.uniform1i(this.luz.u('tN'), 1);
    gl.uniform1i(this.luz.u('tL'), 2);
    gl.uniform1i(this.luz.u('tE'), 3);
  }

  dibujar(t: TexturasGL, d: DibujoGL, luces: LuzCapa[] = [], relieve = this.relieve) {
    const gl = this.gl;
    const U = this.luz.u;
    gl.uniform2fv(U('uP'), d.esquinas);
    gl.uniform4fv(U('uUV'), d.uv ?? [0, 0, 1, 1]);
    gl.uniform4fv(U('uL'), d.capa);
    gl.uniform1f(U('uRel'), relieve);
    const n = Math.min(16, luces.length);
    for (let i = 0; i < n; i++) {
      const l = luces[i];
      this.lp.set([l.x, l.y, l.r, l.power], i * 4);
      this.lc.set([l.c[0], l.c[1], l.c[2], Math.max(0.05, l.flat)], i * 4);
    }
    gl.uniform1i(U('uNL'), n);
    if (n) {
      gl.uniform4fv(U('uLP'), this.lp, 0, n * 4);
      gl.uniform4fv(U('uLC'), this.lc, 0, n * 4);
    }
    gl.uniform1i(U('uHasL'), t.luz ? 1 : 0);
    gl.uniform1i(U('uHasE'), t.emi ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t.alb);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, t.nrm);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, t.luz ?? t.alb);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, t.emi ?? t.alb);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  liberar(t: TexturasGL) {
    const gl = this.gl;
    for (const x of [t.alb, t.nrm, t.luz, t.emi]) if (x) gl.deleteTexture(x);
  }
}

/** Corners of a rectangle mapped by an affine transform [a, b, c, d, e, f]. */
export function esquinas(m: [number, number, number, number, number, number], x0: number, y0: number, x1: number, y1: number) {
  const [a, b, c, d, e, f] = m;
  const P = (x: number, y: number) => [a * x + c * y + e, b * x + d * y + f];
  return [...P(x0, y0), ...P(x1, y0), ...P(x0, y1), ...P(x1, y1)];
}
