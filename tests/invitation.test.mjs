import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(resolve(root, path), 'utf8');
const script = await read('script.js');
const css = await read('style.css');

for (const [path, first, firstParent, phones, slug] of [
  ['index.html', 'S. Shanmuga Priya', 'K. Selvam', ['919841772326', '916380317543'], 'shanmuga-priya'],
  ['shanmuga-priya/index.html', 'S. Shanmuga Priya', 'K. Selvam', ['919841772326', '916380317543'], 'shanmuga-priya'],
  ['avinash/index.html', 'R. Avinash', 'C. Ramesh', ['919790557142'], 'avinash']
]) {
  test(`${path}: family-specific, static and resource-complete`, async () => {
    const html = await read(path);
    assert(!html.includes('{{'), 'Unresolved template token');
    assert(!html.includes('Hariharan'), 'Old groom name must not appear');
    assert(html.includes(`id="coupleTitle" tabindex="-1">${first}</h1>`));
    const parents = html.match(/<div class="parents">([\s\S]*?)<\/div>/)[1];
    assert(parents.indexOf(firstParent) < parents.indexOf(firstParent === 'K. Selvam' ? 'C. Ramesh' : 'K. Selvam'));
    const actualPhones = [...html.matchAll(/href="tel:\+(\d+)"/g)].map((m) => m[1]);
    assert.deepEqual(actualPhones, phones);
    assert(html.includes(`https://wa.me/${phones[0]}?`));
    assert(html.includes(`rel="canonical" href="https://wedding-invitation-snowy-kappa.vercel.app/${slug}/"`));
    assert(html.includes(`<meta property="og:url" content="https://wedding-invitation-snowy-kappa.vercel.app/${slug}/"`));
    assert(html.includes('29—30') && html.includes('6:00 AM – 7:30 AM'));
    assert.equal((html.match(/class="chapter /g) || []).length, 4);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, new Set(ids).size, 'Duplicate IDs');
    for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]));
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(https?:|tel:)/.test(match[1])) continue;
      await access(resolve(root, dirname(path), match[1].split('?')[0]));
    }
    assert(html.includes('id="gate" aria-label="Open wedding invitation" hidden'));
    assert(html.includes('<main id="site">'), 'No-JS invitation must be readable');
    assert(!html.includes('finale-photo parallax-media'), 'Portrait must not scale or pan');
    assert(html.includes('class="finale-photo"') && html.includes('width="1288" height="947"'));
  });
}

test('Uncropped responsive portrait and non-blocking canvas CSS', () => {
  const rule = css.match(/\.finale-photo\{([^}]+)\}/)[1];
  for (const declaration of ['width:100%', 'height:auto', 'object-fit:contain', 'object-position:center', 'transform:none']) assert(rule.includes(declaration));
  assert(!/\.finale-photo[^{}]*\{[^}]*object-fit:cover/.test(css));
  assert(css.match(/#openingSparkles\{([^}]+)\}/)[1].includes('pointer-events:none'));
  assert(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert(css.includes('grid-template-columns:1fr;gap:32px'));
  assert(css.includes('env(safe-area-inset-bottom)'));
  // With full width and intrinsic height the source aspect ratio is preserved at every width.
  for (const viewport of [320, 360, 375, 390, 414, 430, 540, 768, 820, 1024, 1440]) {
    const width = viewport <= 820 ? Math.min(viewport - 36, 610) - 14 : (viewport * 0.9 - viewport * 0.05) / 2 - 22;
    const height = width * 947 / 1288;
    assert(width > 0 && width < viewport && height > 0);
    assert(Math.abs(width / height - 1288 / 947) < 0.001);
  }
});

function harness({ reduced = false, canvasAvailable = true, hash = '' } = {}) {
  class Element {
    constructor(id = '') {
      this.id = id;
      this.events = new Map();
      this.attrs = {};
      this.textContent = '';
      this.dataset = {};
      this.classes = new Set();
      this.classList = {
        add: (...values) => values.forEach((value) => this.classes.add(value)),
        remove: (...values) => values.forEach((value) => this.classes.delete(value)),
        toggle: (value, force) => { const add = force ?? !this.classes.has(value); add ? this.classes.add(value) : this.classes.delete(value); return add; }
      };
      this.style = { setProperty: (key, value) => { this.style[key] = value; }, removeProperty: (key) => { delete this.style[key]; } };
    }
    addEventListener(name, fn) { const list = this.events.get(name) || []; this.events.set(name, [...list, fn]); }
    removeEventListener(name, fn) { this.events.set(name, (this.events.get(name) || []).filter((listener) => listener !== fn)); }
    emit(type, props = {}) { for (const fn of [...(this.events.get(type) || [])]) fn({ type, ...props }); }
    setAttribute(key, value) { this.attrs[key] = value; }
    removeAttribute(key) { delete this.attrs[key]; }
    focus() { this.focused = true; }
    remove() { this.removed = true; }
    scrollIntoView() { this.scrolled = true; }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 390, height: 844, bottom: 844 }; }
    querySelectorAll() { return nav; }
  }
  const ids = new Map();
  const el = (id) => { if (!ids.has(id)) ids.set(id, new Element(id)); return ids.get(id); };
  const nav = [0, 1, 2, 3].map((id) => new Element(`nav${id}`));
  const chapters = ['welcome', 'moments', 'celebrate', 'join-us'].map(el);
  const reveal = el('reveal');
  const media = el('media'); media.parentElement = chapters[0];
  const document = new Element('document');
  document.documentElement = el('html');
  document.body = el('body');
  document.hidden = false;
  document.getElementById = el;
  document.querySelector = (selector) => selector === '.skip-link' ? el('skip') : reveal;
  document.querySelectorAll = (selector) => selector === '.chapter' ? chapters : selector === '.parallax-media' ? [media] : [reveal];
  const preference = new Element(); preference.matches = reduced;
  const window = new Element('window');
  window.matchMedia = () => preference;
  window.location = { hash };
  window.devicePixelRatio = 3;
  window.innerHeight = 844;
  window.scrollTo = () => {};
  let fills = 0;
  const ctx = Object.fromEntries(['setTransform', 'save', 'translate', 'rotate', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'restore', 'clearRect'].map((key) => [key, () => {}]));
  ctx.fill = () => { fills++; };
  el('openingSparkles').getContext = () => canvasAvailable ? ctx : null;
  let clock = 0;
  let id = 0;
  const frames = new Map();
  const intervals = new Map();
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    unobserve() {}
  }
  window.IntersectionObserver = Observer;
  vm.runInNewContext(script, { document, window, IntersectionObserver: Observer, console,
    performance: { now: () => clock },
    requestAnimationFrame: (fn) => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: (key) => frames.delete(key),
    setTimeout: (fn) => fn(),
    setInterval: (fn) => { intervals.set(++id, fn); return id; },
    clearInterval: (key) => intervals.delete(key)
  });
  return { el, document, window, frames, intervals, preference, observers,
    tick(ms = 40) { clock += ms; const current = [...frames.values()]; frames.clear(); current.forEach((fn) => fn(clock)); },
    time(ms) { clock += ms; }, fills: () => fills };
}

test('Opening responds to mouse/touch, stays bounded, then cleans up', () => {
  const app = harness();
  assert.equal(app.el('site').inert, true);
  assert.equal(app.el('openingSparkles').width, 780, 'Retina drawing is capped at 2x');
  app.tick();
  const before = app.fills();
  for (let i = 0; i < 500; i++) {
    app.time(25);
    app.el('gate').emit('pointermove', { isPrimary: true, clientX: i % 390, clientY: 250, pointerType: i % 2 ? 'touch' : 'mouse' });
  }
  app.tick();
  const starCount = app.fills() - before;
  assert(starCount > 36 && starCount <= 22 + 14 + 72);
  assert.equal(app.el('gate').style['--glow-y'], '250px');
  app.el('openInvitation').emit('click');
  assert.equal(app.el('site').inert, false);
  assert(app.el('gate').removed);
  assert(app.el('coupleTitle').focused);
  assert(!app.el('body').classes.has('locked'));
  assert.equal(app.frames.size, 0);
  assert.equal(app.el('gate').events.get('pointermove').length, 0);
});

test('Reduced motion, manual pause and tab visibility stop animation work', () => {
  const reduced = harness({ reduced: true });
  assert.equal(reduced.frames.size, 0);
  assert(reduced.el('motionToggle').disabled);
  reduced.el('openInvitation').emit('click');
  assert(reduced.el('gate').removed);
  const app = harness();
  app.el('motionToggle').emit('click');
  assert.equal(app.frames.size, 0);
  assert.equal(app.el('motionToggle').attrs['aria-pressed'], 'true');
  app.el('motionToggle').emit('click');
  assert.equal(app.frames.size, 1);
  app.document.hidden = true; app.document.emit('visibilitychange');
  assert.equal(app.frames.size, 0); assert.equal(app.intervals.size, 0);
  app.document.hidden = false; app.document.emit('visibilitychange');
  assert.equal(app.frames.size, 1); assert.equal(app.intervals.size, 1);
  app.preference.matches = true; app.preference.emit('change');
  assert.equal(app.frames.size, 0);
});

test('Canvas failure and direct chapter links never block the invitation', () => {
  const app = harness({ canvasAvailable: false });
  app.el('openInvitation').emit('click');
  assert.equal(app.el('site').inert, false);
  assert(/^\d{2,}$/.test(app.el('days').textContent));
  const deep = harness({ hash: '#join-us' });
  assert.equal(deep.el('site').inert, false);
  assert(deep.el('join-us').scrolled);
  assert.equal(deep.frames.size, 0);
});
