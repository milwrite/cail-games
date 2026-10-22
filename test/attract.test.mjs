import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/assets/arcade.js', import.meta.url), 'utf8');
const accents = ['#83eedc', '#bcacff', '#f5a3cb', '#f4c789', '#b9dc99', '#91bfff'];
function harness({reduced = false, contrast = false, savedPause = false, storageFails = false} = {}) {
  let now = 0, id = 0;
  const pending = new Map(), events = [], waves = [], observers = new Map();
  const stored = new Map(savedPause ? [['cail-lights-paused', 'true']] : []);
  const eventTarget = () => {
    const callbacks = new Map();
    return {addEventListener:(name, callback) => callbacks.set(name, callback), emit:(name, event) => callbacks.get(name)?.(event)};
  };
  const element = (kind, index) => ({
    accent:accents[index % accents.length], interacting:false,
    matches() { return this.interacting; },
    classList: {
      add:() => events.push({kind, index, time:now, lit:true}),
      remove:() => events.push({kind, index, time:now, lit:false}),
    },
    animate(frames, options) {
      const wave = {frames, options, playState:'running', currentTime:0,
        pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; }};
      waves.push(wave); return wave;
    },
  });
  const cards = Array.from({length:6}, (_, i) => element('card', i));
  const letters = Array.from({length:15}, (_, i) => element('letter', i));
  const motion = {...eventTarget(), matches:reduced}, colors = {...eventTarget(), matches:contrast};
  const control = {...eventTarget(), hidden:true, attributes:{}, setAttribute(name, value) { this.attributes[name] = value; }};
  const collection = {}, title = {};
  const document = {...eventTarget(), hidden:false,
    dispatchEvent(event) { this.emit(event.type, event); },
    querySelectorAll:selector => selector.includes('collection') ? cards : letters,
    querySelector:selector => ({'.collection':collection, '.arcade-title':title, '[data-lights-toggle]':control})[selector],
  };
  const window = eventTarget();
  runInNewContext(source, {
    document, Math, CustomEvent:class { constructor(type, {detail}) { this.type = type; this.detail = detail; } }, addEventListener:window.addEventListener,
    matchMedia:query => query.includes('reduced') ? motion : colors,
    getComputedStyle:letter => ({getPropertyValue:() => letter.accent}),
    sessionStorage:{getItem(key) { if (storageFails) throw new Error('Unavailable'); return stored.get(key); }, setItem(key, value) { if (storageFails) throw new Error('Unavailable'); stored.set(key, value); }},
    setTimeout:(fn, delay) => {pending.set(++id, {fn, due:now + delay}); return id;},
    clearTimeout:timer => pending.delete(timer),
    IntersectionObserver:class {constructor(callback) { this.callback = callback; } observe(target) { observers.set(target, this.callback); }},
  });
  return {events, waves, cards, letters, document, motion, colors, control, pending, stored, window,
    visit:index => document.emit('arcade:snake-visit', {detail:{index}}),
    visible(grid = true, heading = true) {
      observers.get(collection)([{isIntersecting:grid}]);
      observers.get(title)([{isIntersecting:heading}]);
    },
    gridVisible:value => observers.get(collection)([{isIntersecting:value}]),
    titleVisible:value => observers.get(title)([{isIntersecting:value}]),
    advance(to) {
      for (;;) {
        const next = [...pending].sort((a, b) => a[1].due - b[1].due)[0];
        if (!next || next[1].due > to) break;
        pending.delete(next[0]); now = next[1].due; next[1].fn();
      }
      now = to;
    },
  };
}
const allWaves = (h, state) => assert.ok(h.waves.every(wave => wave.playState === state));

test('native title highlights retain each hue and move left to right then back over twelve seconds', () => {
  const h = harness();
  assert.equal(h.waves.length, 15);
  allWaves(h, 'paused');
  assert.equal(h.pending.size, 0, 'title animation needs no JavaScript frame timers');
  for (const [index, wave] of h.waves.entries()) {
    assert.equal(wave.options.duration, 12000);
    assert.equal(wave.options.iterations, Infinity);
    for (const frame of wave.frames) {
      assert.ok(frame.color.includes(h.letters[index].accent), 'every frame keeps the letter accent');
      const percent = Number(frame.color.match(/ ([\d.]+)%/)[1]);
      assert.ok(percent >= 76 && percent <= 100, 'the highlight never washes out the hue');
      assert.equal(frame.transform, undefined, 'the highlight must not move or scale text');
    }
  }
  const peakAt = offset => {
    const strength = h.waves.map(wave => {
      const frame = wave.frames.find(candidate => Math.abs(candidate.offset - offset) < .0001);
      return Number(frame.textShadow.match(/^0 0 ([\d.]+)px/)[1]);
    });
    return strength.indexOf(Math.max(...strength));
  };
  assert.deepEqual([0, .25, .5, .75, 1].map(peakAt), [0, 7, 14, 7, 0]);
  h.visible(false, true); allWaves(h, 'running');
  assert.equal(h.pending.size, 0);
});

test('only snake visits start six-second card glows, with no idle or random timers', () => {
  const h = harness(); h.visible(); h.advance(25000);
  assert.equal(h.pending.size, 0);
  assert.equal(h.events.length, 0);
  h.visit(2); h.advance(27000); h.visit(4);
  assert.deepEqual(h.events, [
    {kind:'card', index:2, time:25000, lit:true},
    {kind:'card', index:4, time:27000, lit:true},
  ]);
  h.advance(30999); assert.equal(h.events.length, 2);
  h.advance(31000);
  assert.deepEqual(h.events.at(-1), {kind:'card', index:2, time:31000, lit:false});
  h.advance(33000);
  assert.deepEqual(h.events.at(-1), {kind:'card', index:4, time:33000, lit:false});
  assert.equal(h.pending.size, 0);
});

test('title and collection visibility control their own effects independently', () => {
  const h = harness(); h.visible(false, true); h.visit(0); h.advance(60000);
  allWaves(h, 'running'); assert.equal(h.events.filter(event => event.lit).length, 0);
  h.visible(true, false); h.visit(0); h.advance(63100);
  allWaves(h, 'paused'); assert.equal(h.events.filter(event => event.lit).length, 1);
  h.titleVisible(true); h.titleVisible(false);
  assert.equal(h.pending.size, 1, 'title visibility does not truncate a card glow');
  assert.equal(h.events.filter(event => !event.lit).length, 0);
  h.gridVisible(false); assert.equal(h.pending.size, 0);
  assert.equal(h.events.at(-1).lit, false);
  h.visit(1); assert.equal(h.pending.size, 0);
  h.titleVisible(true); allWaves(h, 'running'); assert.equal(h.pending.size, 0);
});

test('Pause lights persists, retains the wave position, and works without session storage', () => {
  const h = harness(); h.visible(); h.visit(0); h.advance(3100);
  h.waves.forEach(wave => { wave.currentTime = 4250; });
  h.control.emit('click');
  assert.equal(h.control.hidden, false);
  assert.equal(h.control.attributes['aria-label'], 'Resume lights');
  assert.equal(h.stored.get('cail-lights-paused'), 'true');
  assert.equal(h.pending.size, 0); allWaves(h, 'paused');
  assert.equal(h.events.at(-1).lit, false);
  const count = h.events.filter(event => event.lit).length;
  h.visit(1); h.advance(60000); assert.equal(h.events.filter(event => event.lit).length, count);
  h.control.emit('click');
  assert.equal(h.control.attributes['aria-label'], 'Pause lights');
  assert.equal(h.stored.get('cail-lights-paused'), 'false');
  allWaves(h, 'running'); assert.ok(h.waves.every(wave => wave.currentTime === 4250));
  assert.equal(h.pending.size, 0, 'resume waits for the next actual visit');
  h.visit(1); assert.equal(h.pending.size, 1);
  const restored = harness({savedPause:true}); restored.visible(); restored.visit(0); restored.advance(60000);
  allWaves(restored, 'paused'); assert.equal(restored.pending.size, 0);
  assert.equal(restored.control.textContent, 'Resume lights');
  const privateWindow = harness({storageFails:true}); privateWindow.visible();
  assert.doesNotThrow(() => privateWindow.control.emit('click'));
  allWaves(privateWindow, 'paused'); assert.equal(privateWindow.pending.size, 0);
});

test('motion and contrast preferences stop both effects without losing manual pause', () => {
  for (const preference of ['reduced', 'contrast']) {
    const h = harness({[preference]:true}); h.visible(); h.visit(0); h.advance(60000);
    const media = preference === 'reduced' ? h.motion : h.colors;
    allWaves(h, 'paused'); assert.equal(h.pending.size, 0);
    assert.equal(h.events.filter(event => event.lit).length, 0);
    assert.equal(h.control.disabled, true); assert.equal(h.control.textContent, 'Lights still');
    media.matches = false; media.emit('change');
    allWaves(h, 'running'); assert.equal(h.control.disabled, false);
    h.visit(0); assert.equal(h.pending.size, 1);
    media.matches = true; media.emit('change');
    assert.equal(h.pending.size, 0); assert.equal(h.events.at(-1).lit, false);
    media.matches = false; media.emit('change');
    h.control.emit('click');
    media.matches = true; media.emit('change');
    media.matches = false; media.emit('change');
    allWaves(h, 'paused'); assert.equal(h.pending.size, 0);
    assert.equal(h.control.textContent, 'Resume lights');
  }
});

test('hidden and departed pages cancel glows and restoration waits for a new visit', () => {
  const h = harness(); h.visible(); h.visit(0); h.advance(3100);
  h.document.hidden = true; h.document.emit('visibilitychange');
  allWaves(h, 'paused'); assert.equal(h.pending.size, 0);
  assert.equal(h.events.at(-1).lit, false);
  const count = h.events.filter(event => event.lit).length;
  h.visit(1); h.advance(60000); assert.equal(h.events.filter(event => event.lit).length, count);
  h.document.hidden = false; h.document.emit('visibilitychange');
  allWaves(h, 'running'); assert.equal(h.pending.size, 0);
  h.visit(1); assert.equal(h.pending.size, 1);
  h.window.emit('pagehide'); h.visible(); h.visit(2);
  allWaves(h, 'paused'); assert.equal(h.pending.size, 0);
  for (let i = 0; i < 5; i++) h.window.emit('pageshow');
  allWaves(h, 'running'); assert.equal(h.pending.size, 0);
  h.visit(2); assert.equal(h.pending.size, 1);
  h.window.emit('pagehide'); assert.equal(h.pending.size, 0);
});

test('card glow does not override hovered or keyboard-focused cards', () => {
  const h = harness(); h.cards[1].interacting = true; h.cards[4].interacting = true;
  h.visible(); h.cards.forEach((_, index) => h.visit(index));
  const lit = h.events.filter(event => event.lit).map(event => event.index);
  assert.deepEqual([...lit].sort(), [0, 2, 3, 5]);
});

test('repeated visits preserve the fade and invalid visits cannot create timers', () => {
  const h = harness(); h.visible();
  for (const index of [-1, 6, 0.5, '0', null, undefined, NaN]) h.visit(index);
  h.document.emit('arcade:snake-visit', {});
  assert.equal(h.pending.size, 0); assert.equal(h.events.length, 0);
  h.cards.forEach((_, index) => h.visit(index));
  assert.equal(h.pending.size, 6);
  h.advance(5500);
  for (let repeat = 0; repeat < 10; repeat++) h.cards.forEach((_, index) => h.visit(index));
  h.titleVisible(false); h.titleVisible(true); h.gridVisible(true);
  assert.equal(h.pending.size, 6, 'at most one timer per card');
  assert.equal(h.events.length, 6, 'repeat visits do not restart the animation');
  h.advance(6000);
  assert.equal(h.pending.size, 0);
  assert.equal(h.events.filter(event => !event.lit && event.time === 6000).length, 6);
  h.visit(0); assert.equal(h.pending.size, 1, 'a later visit can begin another complete glow');
});
