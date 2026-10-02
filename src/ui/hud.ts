// DOM overlay: crew switcher, tools, inventory, dialogue, cards.
import { css, hex, mul, RGB } from '../core/color';
import { CAST, CREW_ORDER, CrewId, Mood } from '../art/cast';
import { drawBust, FaceState } from '../art/rig';
import { drawItem, ITEMS } from '../art/items';
import { ItemId } from '../game/state';

type Attrs = Record<string, string | boolean | ((e: Event) => void)>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: Array<Node | string | null>): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  for (const k of kids) if (k !== null) el.append(k);
  return el;
}

const ICONS = {
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
};

function iconButton(name: keyof typeof ICONS, label: string, onclick: () => void) {
  const b = h('button', { class: 'round glass', 'aria-label': label, title: label, onclick: (e) => (e.stopPropagation(), onclick()) });
  b.innerHTML = ICONS[name];
  return b;
}

const PORTRAIT_LIGHT: RGB = [1.02, 0.96, 0.9];

export function paintPortrait(c: HTMLCanvasElement, id: CrewId, face: FaceState, zoom = 1) {
  const ctx = c.getContext('2d')!;
  const d = CAST[id];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height);
  const k = (c.width / 260) * zoom;
  ctx.setTransform(k, 0, 0, k, c.width / 2 - 8 * k, c.height * (zoom > 1 ? 0.5 : 0.42));
  const cache = new Map<string, string>();
  drawBust(ctx, d, face, (x) => {
    let v = cache.get(x);
    if (!v) cache.set(x, (v = css(mul(hex(x), PORTRAIT_LIGHT))));
    return v;
  });
}

export interface HudEvents {
  switchTo(id: CrewId): void;
  reveal(): void;
  hint(): void;
  menu(): void;
  selectItem(id: ItemId | null): void;
  lookItem(id: ItemId): void;
}

export class Hud {
  readonly root: HTMLDivElement;
  private crewBtns = new Map<CrewId, HTMLButtonElement>();
  private objectiveEl: HTMLDivElement;
  private usingEl: HTMLDivElement;
  private tray: HTMLDivElement;
  private bagCount: HTMLSpanElement;
  private bag: HTMLButtonElement;
  private dialogueEl: HTMLDivElement | null = null;
  private pressEl: SVGSVGElement;
  private fpsEl: HTMLDivElement;
  private advance: (() => void) | null = null;
  private typing: { full: string; shown: number; el: HTMLElement; who: CrewId | null; mood: Mood } | null = null;
  private portrait: HTMLCanvasElement | null = null;
  private portraitT = 0;
  private blinkT = 2;
  private items: ItemId[] = [];
  selected: ItemId | null = null;

  constructor(parent: HTMLElement, private ev: HudEvents) {
    this.root = h('div', { class: 'ui' });
    parent.append(this.root);

    const crew = h('div', { class: 'crew', role: 'group', 'aria-label': 'Cambiar de personaje' });
    for (const id of CREW_ORDER) {
      const c = h('canvas', { width: '128', height: '128' });
      paintPortrait(c, id, { mood: CAST[id].mood, blink: 0, viseme: 0, look: 0.3, sway: 0 }, 1.9);
      const b = h('button', { 'aria-label': `Jugar con ${CAST[id].name}`, 'aria-pressed': 'false', onclick: (e) => (e.stopPropagation(), ev.switchTo(id)) }, c);
      this.crewBtns.set(id, b);
      crew.append(b);
    }
    this.root.append(crew);

    this.root.append(
      h('div', { class: 'tools' }, iconButton('eye', 'Mostrar zonas interactivas', ev.reveal), iconButton('bulb', 'Pista', ev.hint), iconButton('menu', 'Menú', ev.menu)),
    );

    this.objectiveEl = h('div', { class: 'objective glass', hidden: true });
    this.root.append(this.objectiveEl);
    this.usingEl = h('div', { class: 'using glass', hidden: true });
    this.root.append(this.usingEl);

    this.tray = h('div', { class: 'tray glass', 'data-open': 'false' });
    this.bagCount = h('span', { class: 'count' }, '0');
    this.bag = h('button', { class: 'round glass', 'aria-label': 'Inventario', onclick: (e) => (e.stopPropagation(), this.toggleTray()) });
    this.bag.innerHTML = ICONS.bag;
    this.bag.append(this.bagCount);
    this.root.append(this.tray, h('div', { class: 'bag' }, this.bag));

    this.pressEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.pressEl.setAttribute('class', 'press');
    this.pressEl.setAttribute('viewBox', '0 0 64 64');
    this.pressEl.innerHTML = '<circle cx="32" cy="32" r="26" pathLength="100" stroke-dasharray="0 100"/>';
    this.pressEl.style.display = 'none';
    this.root.append(this.pressEl);

    this.fpsEl = h('div', { class: 'fps glass', hidden: true });
    this.root.append(this.fpsEl);
  }

  setActive(id: CrewId) {
    for (const [k, b] of this.crewBtns) b.setAttribute('aria-pressed', String(k === id));
  }

  setHudVisible(v: boolean) {
    for (const el of this.root.querySelectorAll<HTMLElement>('.crew, .tools, .bag, .tray, .objective')) el.style.visibility = v ? '' : 'hidden';
  }

  objective(text: string | null) {
    this.objectiveEl.hidden = !text;
    this.objectiveEl.replaceChildren(h('b', {}, 'OBJETIVO'), h('span', {}, text ?? ''));
  }

  // ------------------------------------------------ inventory

  setInventory(items: ItemId[]) {
    this.items = items;
    this.bagCount.textContent = String(items.length);
    this.bagCount.hidden = items.length === 0;
    if (this.selected && !items.includes(this.selected)) this.select(null);
    this.renderTray();
  }

  private renderTray() {
    const kids: HTMLElement[] = this.items.map((id) => {
      const c = h('canvas', { width: '120', height: '120' });
      drawItem(c.getContext('2d')!, id, 120);
      let pressT = 0;
      const b = h(
        'button',
        {
          'aria-label': ITEMS[id].name,
          'aria-pressed': String(this.selected === id),
          onpointerdown: (e) => {
            e.stopPropagation();
            pressT = performance.now();
          },
          onclick: (e) => {
            e.stopPropagation();
            if (performance.now() - pressT > 450) this.ev.lookItem(id);
            else this.select(this.selected === id ? null : id);
          },
          oncontextmenu: (e) => {
            e.preventDefault();
            this.ev.lookItem(id);
          },
        },
        c,
      );
      return b;
    });
    if (!kids.length) kids.push(h('div', { class: 'empty' }, 'Bolsillos vacíos'));
    this.tray.replaceChildren(...kids);
  }

  toggleTray(open?: boolean) {
    const now = this.tray.dataset.open === 'true';
    const next = open ?? !now;
    this.tray.dataset.open = String(next);
    if (!next && this.selected) this.select(null);
  }

  select(id: ItemId | null) {
    this.selected = id;
    this.usingEl.hidden = !id;
    if (id) this.usingEl.textContent = `Usar ${ITEMS[id].name.toLowerCase()} con…`;
    this.ev.selectItem(id);
    for (const b of this.tray.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.getAttribute('aria-label') === (id ? ITEMS[id].name : '')));
  }

  // ------------------------------------------------ dialogue

  get inDialogue() {
    return this.dialogueEl !== null;
  }

  /** Show one line; resolves when the player taps to continue. */
  say(who: CrewId | null, text: string, mood?: Mood): Promise<void> {
    this.closeDialogue();
    const textEl = h('div', { class: 'text' });
    const kids: HTMLElement[] = [];
    if (who) {
      this.portrait = h('canvas', { width: '260', height: '260' });
      kids.push(this.portrait);
    } else this.portrait = null;
    kids.push(h('div', {}, who ? h('div', { class: 'who' }, CAST[who].name.toUpperCase()) : null, textEl));
    kids.push(h('i', { class: 'next' }));
    const el = h('div', { class: `dialogue glass${who ? '' : ' system'}`, role: 'status', 'aria-live': 'polite' }, ...kids);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => (e.stopPropagation(), this.tapDialogue()));
    this.root.append(el);
    this.dialogueEl = el;
    this.typing = { full: text, shown: 0, el: textEl, who, mood: mood ?? (who ? CAST[who].mood : 'neutral') };
    this.portraitT = 0;
    return new Promise((res) => {
      this.advance = res;
    });
  }

  /** Taps anywhere on the screen also advance dialogue. */
  tapDialogue() {
    if (!this.typing) return;
    if (this.typing.shown < this.typing.full.length) {
      this.typing.shown = this.typing.full.length;
      this.typing.el.textContent = this.typing.full;
      return;
    }
    const a = this.advance;
    this.closeDialogue();
    a?.();
  }

  closeDialogue() {
    this.dialogueEl?.remove();
    this.dialogueEl = null;
    this.typing = null;
    this.advance = null;
  }

  /** Is the line still being typed (for lip sync)? */
  get speaking(): CrewId | null {
    return this.typing && this.typing.shown < this.typing.full.length ? this.typing.who : null;
  }

  update(dt: number) {
    if (this.typing) {
      const t = this.typing;
      if (t.shown < t.full.length) {
        t.shown = Math.min(t.full.length, t.shown + dt * 46);
        t.el.textContent = t.full.slice(0, Math.floor(t.shown));
      }
      if (this.portrait && t.who) {
        this.portraitT += dt;
        this.blinkT -= dt;
        let blink = 0;
        if (this.blinkT < 0) {
          blink = 1;
          if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
        }
        const talking = t.shown < t.full.length;
        const ch = t.full.charAt(Math.floor(t.shown)).toLowerCase();
        const viseme = talking ? ('aá'.includes(ch) ? 1 : 'oóuú'.includes(ch) ? 2 : 'eéií'.includes(ch) ? 3 : ch === ' ' ? 0 : 1) : 0;
        paintPortrait(this.portrait, t.who, { mood: t.mood, blink, viseme, look: 0.2, sway: Math.sin(this.portraitT * 2) * 0.2 });
      }
    }
  }

  // ------------------------------------------------ feedback

  toast(text: string, item?: ItemId) {
    const kids: Array<HTMLElement | string> = [];
    if (item) {
      const c = h('canvas', { width: '88', height: '88' });
      drawItem(c.getContext('2d')!, item, 88);
      kids.push(c);
    }
    kids.push(h('span', {}, text));
    const el = h('div', { class: 'toast glass' }, ...kids);
    this.root.append(el);
    setTimeout(() => el.remove(), 2700);
  }

  label(text: string, x: number, y: number) {
    const el = h('div', { class: 'label glass' }, text);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.root.append(el);
    setTimeout(() => el.remove(), 1500);
  }

  pressRing(x: number | null, y: number, t: number) {
    if (x === null) {
      this.pressEl.style.display = 'none';
      return;
    }
    this.pressEl.style.display = 'block';
    this.pressEl.style.left = x + 'px';
    this.pressEl.style.top = y + 'px';
    this.pressEl.querySelector('circle')!.setAttribute('stroke-dasharray', `${(t * 100).toFixed(1)} 100`);
  }

  fps(text: string | null) {
    this.fpsEl.hidden = text === null;
    if (text) this.fpsEl.textContent = text;
  }

  /** Full-screen card. Returns the element so callers can wire buttons. */
  cover(className: string, ...kids: Array<Node | string | null>): HTMLDivElement {
    const el = h('div', { class: `cover ${className}` }, ...kids);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.root.append(el);
    return el;
  }
}
