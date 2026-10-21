import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/assets/snake.js', import.meta.url), 'utf8');
const rect = (left, top, right, bottom) => ({left, top, right, bottom});

// Geometry represents the existing three-column desktop and single-column phone
// gallery, including the full-width text/action boxes that constrain its paths.
function geometry(mobile = false) {
  const cards = Array.from({length:6}, (_, i) => mobile
    ? rect(29, 308 + i * 234, 361, 526 + i * 234)
    : rect(153 + i % 3 * 366, 330 + Math.floor(i / 3) * 320, 503 + i % 3 * 366, 634 + Math.floor(i / 3) * 320));
  const footer = mobile ? rect(12, 1744, 378, 1848) : rect(120, 1018, 1320, 1090);
  const control = mobile ? rect(249, 260, 361, 304) : rect(1175, 278, 1287, 322);
  const obstacles = mobile
    ? [rect(29, 20, 211, 64), rect(247, 20, 361, 64), rect(29, 132, 361, 182), rect(29, 190, 269, 240), rect(29, 1756, 126, 1800), rect(29, 1800, 346, 1820), control]
    : [rect(153, 28, 420, 72), rect(1163, 28, 1287, 72), rect(153, 175, 700, 255), rect(726, 175, 1180, 255), rect(153, 1032, 250, 1076), rect(840, 1045, 1287, 1065), control];
  for (const card of cards) obstacles.push(
    rect(card.left + 26, card.top + 29, card.right - 26, card.top + (mobile ? 63 : 108)),
    rect(card.left + 26, card.top + (mobile ? 81 : 126), card.right - 26, card.top + (mobile ? 132 : 178)),
    rect(card.left + 26, card.bottom - 67, card.right - 26, card.bottom - 23),
  );
  return {width:mobile ? 390 : 1440, height:footer.bottom, cards, obstacles, control,
    shell:rect(mobile ? 12 : 120, 0, mobile ? 378 : 1320, footer.bottom),
    header:rect(mobile ? 12 : 120, 0, mobile ? 378 : 1320, mobile ? 84 : 100),
    title:mobile ? rect(29, 132, 361, 240) : rect(153, 175, 1180, 255), footer};
}

function harness({mobile = false, reduced = false, contrast = false, savedPause = false, storageFails = false, fullPage = false, seed = 7} = {}) {
  let layout = geometry(mobile), now = 0, nextFrame = 0, resizeCallback, fontsReady;
  let randomState = seed;
  const frames = new Map(), listeners = new Map(), heads = [], paints = [];
  const stored = new Map(savedPause ? [['cail-snake-paused', 'true']] : []);
  const eventTarget = () => {
    const callbacks = new Map();
    return {addEventListener(name, callback) { callbacks.set(name, callback); }, emit(name) { callbacks.get(name)?.(); }};
  };
  const control = {...eventTarget(), hidden:true, disabled:false, attributes:{}, setAttribute(name, value) { this.attributes[name] = value; }};
  const media = {reduced:{...eventTarget(), matches:reduced}, contrast:{...eventTarget(), matches:contrast}};
  let currentPaint;
  const context = {
    setTransform() {},
    clearRect(x, y, width, height) {
      if (x === 0 && y === 0 && width === sandbox.document.documentElement.clientWidth && height === sandbox.innerHeight) {
        currentPaint = {time:now, fills:0}; paints.push(currentPaint);
      }
    },
    fillRect(x, y, width, height) {
      currentPaint.fills++;
      if (width === 10 && height === 10) heads.push({x:x + 5, y:y + 5 + sandbox.scrollY, time:now});
    },
  };
  const canvas = {attributes:{}, setAttribute(name, value) { this.attributes[name] = value; }, getContext:() => context};
  const element = getRect => ({getBoundingClientRect() {
    const box = getRect();
    return {...box, top:box.top - sandbox.scrollY, bottom:box.bottom - sandbox.scrollY};
  }});
  const collection = {get children() { return layout.cards.map(box => element(() => box)); }};
  control.getBoundingClientRect = element(() => layout.control).getBoundingClientRect;
  const elements = {'.collection':collection, '[data-snake-toggle]':control,
    '.site-shell':element(() => layout.shell), '.arcade-title':element(() => layout.title),
    '.site-header':element(() => layout.header), '.site-footer':element(() => layout.footer)};
  const document = {...eventTarget(), hidden:false, documentElement:{clientWidth:layout.width, scrollHeight:layout.height},
    body:{append(value) { assert.equal(value, canvas); }},
    createElement(name) { assert.equal(name, 'canvas'); return canvas; },
    querySelector:selector => elements[selector],
    querySelectorAll:() => layout.obstacles.map(box => element(() => box)),
    fonts:{ready:{then(callback) { fontsReady = callback; }}},
  };
  const math = Object.create(Math);
  math.random = () => { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 0x100000000; };
  const sandbox = {document, Math:math, scrollY:0, innerHeight:fullPage ? layout.height : 844, devicePixelRatio:3,
    matchMedia:query => query.includes('reduced') ? media.reduced : media.contrast,
    sessionStorage:{getItem(key) { if (storageFails) throw new Error('Unavailable'); return stored.get(key); }, setItem(key, value) { if (storageFails) throw new Error('Unavailable'); stored.set(key, value); }},
    addEventListener:(name, callback) => listeners.set(name, callback),
    requestAnimationFrame:callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id),
    ResizeObserver:class {constructor(callback) { resizeCallback = callback; } observe() {}},
  };
  runInNewContext(source, sandbox);
  return {frames, heads, paints, canvas, control, media, document, stored,
    get layout() { return layout; },
    get head() { return heads.at(-1); },
    tick(milliseconds = 50) {
      now += milliseconds;
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback(now);
      assert.ok(frames.size <= 1, 'at most one animation callback may remain scheduled');
    },
    advance(count, milliseconds = 50) { for (let i = 0; i < count; i++) this.tick(milliseconds); },
    emit:name => listeners.get(name)?.(),
    fontsReady:() => fontsReady(),
    resize(phone, height = 844) {
      layout = geometry(phone); document.documentElement.clientWidth = layout.width;
      document.documentElement.scrollHeight = layout.height; sandbox.innerHeight = height;
      resizeCallback(); listeners.get('resize')();
    },
    scroll(y) { sandbox.scrollY = y; listeners.get('scroll')(); },
  };
}
const location = head => ({x:head.x, y:head.y});

test('Pause stops motion and scheduling, Resume restarts, and the choice survives storage', () => {
  const h = harness(); h.advance(30);
  assert.equal(h.canvas.attributes['aria-hidden'], 'true');
  assert.equal(h.control.hidden, false);
  h.control.emit('click'); h.tick();
  const pausedHead = location(h.head);
  assert.equal(h.control.attributes['aria-label'], 'Resume snake');
  assert.equal(h.stored.get('cail-snake-paused'), 'true');
  assert.equal(h.frames.size, 0);
  h.advance(100); assert.deepEqual(location(h.head), pausedHead);
  h.control.emit('click'); h.advance(30);
  assert.equal(h.control.attributes['aria-label'], 'Pause snake');
  assert.notDeepEqual(location(h.head), pausedHead);
  assert.equal(h.stored.get('cail-snake-paused'), 'false');
  const restored = harness({savedPause:true}); restored.tick();
  assert.equal(restored.control.textContent, 'Resume snake');
  assert.equal(restored.frames.size, 0);
  const privateWindow = harness({storageFails:true}); privateWindow.advance(5);
  assert.doesNotThrow(() => privateWindow.control.emit('click'));
  privateWindow.tick(); assert.equal(privateWindow.frames.size, 0);
});

test('motion and contrast preferences suppress drawing and preserve an explicit pause', () => {
  for (const preference of ['reduced', 'contrast']) {
    const h = harness({[preference]:true}); h.advance(20);
    assert.equal(h.heads.length, 0);
    assert.equal(h.frames.size, 0);
    assert.equal(h.control.disabled, true);
    h.media[preference].matches = false; h.media[preference].emit('change'); h.advance(5);
    assert.ok(h.heads.length > 0);
    const count = h.heads.length;
    h.media[preference].matches = true; h.media[preference].emit('change'); h.advance(20);
    assert.equal(h.heads.length, count);
    assert.equal(h.frames.size, 0);
    h.media[preference].matches = false; h.media[preference].emit('change'); h.tick();
    h.control.emit('click'); h.tick();
    h.media[preference].matches = true; h.media[preference].emit('change'); h.tick();
    h.media[preference].matches = false; h.media[preference].emit('change'); h.tick();
    assert.equal(h.control.textContent, 'Resume snake');
    assert.equal(h.frames.size, 0);
  }
});

test('hidden tabs and pagehide cancel callbacks; returning never catches up elapsed time', () => {
  const h = harness(); h.advance(20);
  const before = location(h.head), paints = h.paints.length;
  h.document.hidden = true; h.document.emit('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.tick(60000); assert.equal(h.paints.length, paints);
  h.document.hidden = false; h.document.emit('visibilitychange'); h.tick();
  assert.deepEqual(location(h.head), before);
  h.advance(5); assert.notDeepEqual(location(h.head), before);
  h.emit('pagehide'); h.resize(true); h.scroll(100); h.fontsReady();
  assert.equal(h.frames.size, 0);
  h.tick(60000);
  for (let i = 0; i < 5; i++) h.emit('pageshow');
  h.tick(); assert.equal(h.frames.size, 1);
  assert.ok(h.head.x >= 0 && h.head.x <= 390);
  h.emit('pagehide'); assert.equal(h.frames.size, 0);
});

test('repeated resize and paused scrolling repaint once with a bounded viewport canvas', () => {
  const h = harness(); h.advance(10); h.control.emit('click'); h.tick();
  for (const mobile of [true, false, true, false, true]) {
    h.resize(mobile, 700); h.tick();
    assert.equal(h.canvas.width, Math.round(h.layout.width * 1.5));
    assert.equal(h.canvas.height, 1050);
    assert.equal(h.frames.size, 0);
    const previous = h.paints.length;
    h.scroll(200); h.tick(); assert.equal(h.paints.length, previous + 1);
    assert.equal(h.frames.size, 0);
    h.scroll(0); h.tick();
  }
});

test('painting stays below 31 frames per second with bounded draw work', () => {
  const h = harness(); h.advance(60, 1000 / 60);
  assert.ok(h.paints.length <= 31, `painted ${h.paints.length} times in one second`);
  assert.ok(h.paints.every(paint => paint.fills <= 26));
});

for (const mobile of [false, true]) test(`the ${mobile ? 'phone' : 'desktop'} tour visits all cards, the footer, and the top without crossing text`, () => {
  const h = harness({mobile, fullPage:true});
  const visited = new Set();
  let reachedFooter = false, returnedToTop = false;
  for (let frame = 0; frame < 20000 && !returnedToTop; frame++) {
    h.tick();
    const head = h.head;
    if (!head) continue;
    assert.ok(head.x >= 5 && head.x <= h.layout.width - 5 && head.y >= 5 && head.y <= h.layout.height - 5);
    for (const box of h.layout.obstacles) {
      assert.ok(head.x + 5 <= box.left || head.x - 5 >= box.right || head.y + 5 <= box.top || head.y - 5 >= box.bottom,
        `head at ${head.x},${head.y} overlaps text ${JSON.stringify(box)}`);
    }
    h.layout.cards.forEach((box, index) => {
      if (head.x >= box.left && head.x <= box.right && head.y >= box.top && head.y <= box.bottom) visited.add(index);
    });
    if (head.y >= h.layout.footer.top) reachedFooter = true;
    if (reachedFooter && head.y <= 16) returnedToTop = true;
  }
  assert.equal(visited.size, 6, 'each card receives a visit');
  assert.equal(reachedFooter, true, 'the route reaches the footer');
  assert.equal(returnedToTop, true, 'the route returns to the top after the footer');
  assert.ok(h.paints.every(paint => paint.fills <= 26));
});
