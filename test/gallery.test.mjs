import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/assets/gallery.js', import.meta.url), 'utf8');

function galleryHarness(reduced = false) {
  let observe, timerId = 0;
  const timers = new Map(), events = {}, loads = [];
  const images = Array.from({length:3}, (_, index) => ({
    loading:'lazy',
    decode() {
      return new Promise((resolve, reject) => loads.push({index, resolve, reject}));
    },
  }));
  const slides = images.map((image, index) => ({hidden:index !== 0, querySelector:() => image}));
  const controls = {hidden:true};
  const rotation = {textContent:'Pause', setAttribute() {}, addEventListener:(_, fn) => {events.click = fn;}};
  const gallery = {
    querySelectorAll:() => slides,
    querySelector:selector => selector === '[data-controls]' ? controls : rotation,
    addEventListener:(name, fn) => {events[name] = fn;},
    contains:element => element === rotation,
  };
  const document = {hidden:false, querySelectorAll:() => [gallery], addEventListener:(_, fn) => {events.visibility = fn;}};
  const motion = {matches:reduced, addEventListener:(_, fn) => {events.motion = fn;}};
  runInNewContext(source, {
    document, matchMedia:() => motion,
    setTimeout:(fn, delay) => {timers.set(++timerId, {fn, delay}); return timerId;},
    clearTimeout:id => timers.delete(id),
    IntersectionObserver:class {constructor(fn) {observe = fn;} observe() {}},
  });
  return {
    slides, controls, rotation, document, motion, events, loads, timers,
    visible:value => observe([{isIntersecting:value}]),
    tick() {
      assert.equal(timers.size, 1);
      const [id, {fn, delay}] = [...timers][0];
      assert.equal(delay, 6000);
      timers.delete(id);
      return fn();
    },
  };
}

test('a visible gallery prepares just the next image and keeps the current view until it is ready', async () => {
  const h = galleryHarness();
  assert.equal(h.loads.length, 0);
  h.visible(true);
  assert.deepEqual(h.loads.map(load => load.index), [1]);
  const transition = h.tick();
  assert.equal(h.slides[0].hidden, false);
  h.loads[0].resolve();
  await transition;
  assert.deepEqual(h.slides.map(slide => slide.hidden), [true, false, true]);
  assert.deepEqual(h.loads.map(load => load.index), [1, 2]);
});

test('pausing during a slow image load cannot cause a late slide change', async () => {
  const h = galleryHarness();
  h.visible(true);
  const transition = h.tick();
  h.events.click();
  h.loads[0].resolve();
  await transition;
  assert.equal(h.rotation.textContent, 'Continue');
  assert.equal(h.slides[0].hidden, false);
  assert.equal(h.timers.size, 0);
  h.events.click();
  await h.tick();
  assert.equal(h.rotation.textContent, 'Pause');
  assert.equal(h.slides[1].hidden, false);
});

test('a failed screenshot keeps the working view and offers Continue', async () => {
  const h = galleryHarness();
  h.visible(true);
  const transition = h.tick();
  h.loads[0].reject(new Error('image unavailable'));
  await transition;
  assert.equal(h.slides[0].hidden, false);
  assert.equal(h.rotation.textContent, 'Continue');
  assert.equal(h.timers.size, 0);
});

test('hidden and offscreen galleries cancel pending transitions; reduced motion starts paused', async () => {
  const reduced = galleryHarness(true);
  reduced.visible(true);
  assert.equal(reduced.loads.length, 0);
  assert.equal(reduced.rotation.textContent, 'Continue');
  for (const stop of [h => h.visible(false), h => {h.document.hidden = true; h.events.visibility();}, h => {h.motion.matches = true; h.events.motion();}]) {
    const h = galleryHarness();
    h.visible(true);
    const transition = h.tick();
    stop(h);
    h.loads[0].resolve();
    await transition;
    assert.equal(h.slides[0].hidden, false);
    assert.equal(h.timers.size, 0);
  }
});

test('explicit Continue resumes while the control has keyboard focus', async () => {
  const h = galleryHarness(true);
  h.visible(true);
  h.events.focusin();
  h.events.click();
  h.loads[0].resolve();
  await h.tick();
  assert.equal(h.slides[1].hidden, false);
  assert.equal(h.rotation.textContent, 'Pause');
});
