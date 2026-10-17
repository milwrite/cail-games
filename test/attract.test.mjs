import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/assets/arcade.js', import.meta.url), 'utf8');
function harness(reduced = false) {
  let now = 0, id = 0, observe;
  const pending = new Map(), events = [], listeners = {};
  const element = (kind, index) => ({
    matches: () => false,
    classList: {
      add: () => events.push({kind, index, time:now, lit:true}),
      remove: () => events.push({kind, index, time:now, lit:false}),
    },
  });
  const cards = Array.from({length:6}, (_, i) => element('card', i));
  const letters = Array.from({length:15}, (_, i) => element('letter', i));
  const motion = {matches:reduced, addEventListener:(_, fn) => {listeners.motion = fn;}};
  const document = {
    hidden:false,
    querySelectorAll: selector => selector.includes('collection') ? cards : letters,
    querySelector: () => ({}),
    addEventListener:(_, fn) => {listeners.visibility = fn;},
  };
  runInNewContext(source, {
    document, matchMedia:() => motion, Math,
    setTimeout:(fn, delay) => {pending.set(++id, {fn, due:now+delay}); return id;},
    clearTimeout:timer => pending.delete(timer),
    IntersectionObserver:class {constructor(fn) {observe = fn;} observe() {}},
  });
  observe([{isIntersecting:true}]);
  return {events, document, motion, listeners, observe, advance(to) {
    for (;;) {
      const next = [...pending].sort((a,b) => a[1].due-b[1].due)[0];
      if (!next || next[1].due > to) break;
      pending.delete(next[0]); now = next[1].due; next[1].fn();
    }
    now = to;
  }};
}

test('cards flash once each, three seconds apart, with a five-second rest', () => {
  const h = harness(); h.advance(23250);
  const starts = h.events.filter(e => e.kind === 'card' && e.lit);
  assert.deepEqual(starts.slice(0,6).map(e => e.time), [3000,6000,9000,12000,15000,18000]);
  assert.equal(new Set(starts.slice(0,6).map(e => e.index)).size, 6);
  for (const start of starts.slice(0,6)) {
    assert.ok(h.events.some(e => e.kind === 'card' && !e.lit && e.index === start.index && e.time === start.time+250));
  }
  assert.equal(starts[6].time - (starts[5].time+250), 5000);
});

test('the title waves every fifteen seconds without changing card cadence', () => {
  const h = harness(); h.advance(31500);
  const starts = h.events.filter(e => e.kind === 'letter' && e.lit);
  assert.deepEqual(starts.slice(0,15).map(e => e.time), Array.from({length:15}, (_, i) => 15000+i*90));
  assert.equal(starts[15].time, 30000);
});

test('reduced motion, hidden tabs, and offscreen game grids cancel the lights', () => {
  const reduced = harness(true); reduced.advance(60000);
  assert.equal(reduced.events.filter(e => e.lit).length, 0);
  for (const stop of [h => {h.document.hidden = true; h.listeners.visibility();}, h => h.observe([{isIntersecting:false}]), h => {h.motion.matches = true; h.listeners.motion();}]) {
    const h = harness(); h.advance(3100); stop(h);
    const before = h.events.filter(e => e.lit).length;
    h.advance(60000);
    assert.equal(h.events.filter(e => e.lit).length, before);
  }
});
