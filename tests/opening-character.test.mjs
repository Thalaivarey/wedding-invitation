import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const code = await readFile(new URL('../opening-character.js', import.meta.url), 'utf8');
const module = { exports: {} };
vm.runInNewContext(code, { module });
const { mapPointerToPose, poseFromPosition, createController } = module.exports;

function harness({ reduced = false, paused = false } = {}) {
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, handler, options) {
      const items = this.listeners.get(type) || [];
      this.listeners.set(type, [...items, { handler, options }]);
    }
    removeEventListener(type, handler) {
      this.listeners.set(type, (this.listeners.get(type) || []).filter(item => item.handler !== handler));
    }
    emit(type, details = {}) {
      for (const { handler } of [...(this.listeners.get(type) || [])]) handler({ type, ...details });
    }
    listenerCount() { return [...this.listeners.values()].reduce((sum, items) => sum + items.length, 0); }
  }
  class Element extends Target {
    constructor() {
      super(); this.isConnected = true; this.hidden = false; this.dataset = {}; this.properties = {};
      this.classes = new Set(); this.classList = { contains: name => this.classes.has(name) };
      this.style = { setProperty: (name, value) => { this.properties[name] = value; } };
    }
  }
  const gate = new Element();
  gate.parentNode = new Element();
  const root = new Element();
  const eye = new Element();
  eye.dataset = { rangeX: '5', rangeY: '3' };
  let measurements = 0;
  const face = { getBoundingClientRect() { measurements++; return { left: 100, top: 200, width: 100, height: 100 }; } };
  root.querySelector = () => face;
  root.querySelectorAll = () => [eye];
  const document = new Target();
  document.documentElement = new Element();
  if (paused) document.documentElement.classes.add('motion-paused');
  document.hidden = false;
  document.getElementById = id => id === 'gate' ? gate : id === 'openingCharacter' ? root : null;
  const preference = new Target();
  preference.matches = reduced;
  const window = new Target();
  window.matchMedia = () => preference;
  const frames = new Map();
  let nextFrame = 0;
  let time = 0;
  window.requestAnimationFrame = handler => { frames.set(++nextFrame, handler); return nextFrame; };
  window.cancelAnimationFrame = id => frames.delete(id);
  let mutation;
  window.MutationObserver = class {
    constructor(handler) { this.handler = handler; this.disconnected = false; mutation = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const controller = createController(document, window);
  const tick = () => {
    time += 16.67;
    const current = [...frames.values()]; frames.clear(); current.forEach(handler => handler(time));
  };
  const settle = () => { let count = 0; while (frames.size && count++ < 100) tick(); assert(count < 100); return count; };
  return { document, window, gate, root, eye, preference, frames, controller, tick, settle,
    measurements: () => measurements, mutation: () => mutation,
    point: (type = 'pointermove', details = {}) => gate.emit(type, { clientX: 1000, clientY: -1000, isPrimary: true, ...details }) };
}

test('Pointer direction uses the face center and every pose stays bounded', () => {
  const face = { left: 100, top: 200, width: 100, height: 100 };
  const center = mapPointerToPose(150, 250, face);
  assert.equal(center.x, 0); assert.equal(center.y, 0);
  const far = mapPointerToPose(10000, -10000, face);
  assert.equal(far.x, 1); assert.equal(far.y, -1);
  assert.equal(far.bodyX, 1.7); assert.equal(far.bodyY, -1); assert.equal(far.bodyRotate, 1.2);
  assert.equal(mapPointerToPose(NaN, undefined, face).x, 0);
  assert.equal(poseFromPosition(Infinity, -Infinity).x, 0);
});

test('Tracking smooths toward the pointer, stops scheduling when settled, and resets on leave', () => {
  const a = harness();
  assert.equal(a.frames.size, 0, 'No idle animation loop');
  for (let i = 0; i < 100; i++) a.point();
  assert.equal(a.frames.size, 1, 'Pointer bursts schedule only one pending frame');
  assert.equal(a.measurements(), 1, 'Face layout is cached while tracking');
  a.tick();
  const first = parseFloat(a.eye.properties['--pupil-x']);
  assert(first > 0 && first < 5, 'Pupil begins with a smooth intermediate position');
  a.settle();
  assert.equal(a.frames.size, 0);
  assert.equal(a.eye.properties['--pupil-x'], '5px');
  assert.equal(a.eye.properties['--pupil-y'], '-3px');
  a.gate.emit('pointerleave'); a.settle();
  assert.equal(a.eye.properties['--pupil-x'], '0px');
  assert.equal(a.root.properties['--character-body-rotate'], '0deg');
  a.window.emit('resize'); a.point(); assert.equal(a.measurements(), 2);
});

test('Touch pointer gestures remain passive and secondary pointers are ignored', () => {
  const a = harness();
  for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    assert(a.gate.listeners.get(event).every(item => item.options.passive));
  }
  a.point('pointerdown', { isPrimary: false }); assert.equal(a.frames.size, 0);
  a.point('pointerdown', { pointerType: 'touch' }); a.settle();
  assert.equal(a.eye.properties['--pupil-x'], '5px');
  a.gate.emit('pointerup', { pointerType: 'touch' }); a.settle();
  assert.equal(a.eye.properties['--pupil-x'], '0px');
});

test('Manual pause, reduced motion and hidden tabs cancel work immediately', () => {
  for (const options of [{ reduced: true }, { paused: true }]) {
    const a = harness(options); a.point(); assert.equal(a.frames.size, 0);
  }
  const a = harness(); a.point(); a.tick();
  a.document.documentElement.classes.add('motion-paused'); a.document.emit('invitation:motion');
  assert.equal(a.frames.size, 0); assert.equal(a.eye.properties['--pupil-x'], '0px');
  a.document.documentElement.classes.delete('motion-paused'); a.document.emit('invitation:motion');
  assert.equal(a.frames.size, 0, 'Resuming remains idle until a new pointer event');
  a.point(); a.tick(); a.preference.matches = true; a.preference.emit('change');
  assert.equal(a.frames.size, 0); assert.equal(a.root.properties['--character-body-x'], '0px');
  a.preference.matches = false; a.preference.emit('change'); a.point(); a.tick();
  a.document.hidden = true; a.document.emit('visibilitychange');
  assert.equal(a.frames.size, 0); assert.equal(a.eye.properties['--pupil-y'], '0px');
  a.point(); assert.equal(a.frames.size, 0);
});

test('Opening and gate removal both clean up frames, listeners and observer', () => {
  for (const removal of [false, true]) {
    const a = harness(); a.point(); a.tick();
    if (removal) { a.gate.isConnected = false; a.mutation().handler(); }
    else a.document.emit('invitation:opened');
    assert.equal(a.frames.size, 0);
    assert.equal(a.gate.listenerCount(), 0); assert.equal(a.document.listenerCount(), 0);
    assert.equal(a.window.listenerCount(), 0); assert.equal(a.preference.listenerCount(), 0);
    assert(a.mutation().disconnected);
    assert.equal(a.eye.properties['--pupil-x'], '0px');
    a.point(); assert.equal(a.frames.size, 0);
    a.controller.destroy(); assert.equal(a.frames.size, 0, 'Cleanup is idempotent');
  }
});
