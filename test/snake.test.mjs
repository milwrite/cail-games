import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../public/assets/snake.js', import.meta.url), 'utf8');
const rect = (left, top, right, bottom) => ({left, top, right, bottom});

// Representative three-, two-, and one-column layouts use the gallery's new
// 48/40/40px gaps and the remaining lights control as an obstacle.
function geometry(mode = false) {
  const mobile = mode === true || mode === 'phone', tablet = mode === 'tablet';
  const width = mobile ? 390 : tablet ? 768 : 1440;
  const shellLeft = mobile ? 12 : tablet ? 24 : 120, shellRight = width - shellLeft;
  const left = mobile ? 29 : tablet ? 49 : 153, right = width - left;
  const columns = mobile ? 1 : tablet ? 2 : 3, gap = mobile || tablet ? 40 : 48;
  const cardWidth = (right - left - gap * (columns - 1)) / columns;
  const top = mobile ? 308 : tablet ? 320 : 330, cardHeight = mobile ? 218 : tablet ? 288 : 304;
  const cards = Array.from({length:6}, (_, i) => {
    const x = left + i % columns * (cardWidth + gap), y = top + Math.floor(i / columns) * (cardHeight + gap);
    return rect(x, y, x + cardWidth, y + cardHeight);
  });
  const footerTop = cards.at(-1).bottom + (mobile ? 32 : 64);
  const footer = rect(shellLeft, footerTop, shellRight, footerTop + (mobile ? 104 : 72));
  const lightsControl = rect(right - 112, top - 52, right, top - 8);
  const title = mobile ? rect(left, 132, right, 240) : tablet ? rect(left, 170, right, 240) : rect(left, 175, 1180, 255);
  const obstacles = mobile
    ? [rect(29, 20, 211, 64), rect(247, 20, 361, 64), rect(left, 132, right, 182), rect(left, 190, 269, 240)]
    : tablet
      ? [rect(left, 28, 316, 72), rect(605, 28, right, 72), rect(left, 170, 420, 240), rect(438, 170, 705, 240)]
      : [rect(left, 28, 420, 72), rect(1163, 28, right, 72), rect(left, 175, 700, 255), rect(726, 175, 1180, 255)];
  obstacles.push(lightsControl, rect(left, footerTop + 14, left + 97, footerTop + 58),
    mobile ? rect(left, footerTop + 58, right - 15, footerTop + 78) : rect(right - 447, footerTop + 27, right, footerTop + 47));
  for (const card of cards) obstacles.push(
    rect(card.left + 26, card.top + 29, card.right - 26, card.top + (mobile ? 63 : 108)),
    rect(card.left + 26, card.top + (mobile ? 81 : 126), card.right - 26, card.top + (mobile ? 132 : 178)),
    rect(card.left + 26, card.bottom - 67, card.right - 26, card.bottom - 23),
  );
  return {width, height:footer.bottom, cards, obstacles, lightsControl,
    shell:rect(shellLeft, 0, shellRight, footer.bottom),
    header:rect(shellLeft, 0, shellRight, mobile ? 84 : 100), title, footer};
}

function harness({mobile = false, tablet = false, reduced = false, contrast = false, hasCollection = true, fullPage = false, seed = 7} = {}) {
  let layout = geometry(tablet ? 'tablet' : mobile), now = 0, nextFrame = 0, resizeCallback, fontsReady;
  let randomState = seed;
  const frames = new Map(), listeners = new Map(), heads = [], paints = [], events = [];
  let storageReads = 0, mounted = 0, maximumTrail = 0, minimumBodyAlpha = 1;
  const trailSteps = [];
  const eventTarget = () => {
    const callbacks = new Map();
    return {addEventListener(name, callback) { callbacks.set(name, callback); }, emit(name, event) { callbacks.get(name)?.(event); }};
  };
  const lightsControl = {...eventTarget(), textContent:'Pause lights'};
  const media = {reduced:{...eventTarget(), matches:reduced}, contrast:{...eventTarget(), matches:contrast}};
  let currentPaint;
  const context = {
    setTransform() {},
    clearRect(x, y, width, height) {
      if (x === 0 && y === 0 && width === sandbox.document.documentElement.clientWidth && height === sandbox.innerHeight) {
        currentPaint = {time:now, fills:0, bodies:0, pellets:[]}; paints.push(currentPaint);
      }
    },
    fillRect(x, y, width, height) {
      currentPaint.fills++;
      if (width === 10 && height === 10) heads.push({x:x + 5, y:y + 5 + sandbox.scrollY, time:now});
      if (width === 6 && height === 6) { currentPaint.bodies++; minimumBodyAlpha = Math.min(minimumBodyAlpha, this.globalAlpha); }
      if (width === 5 && height === 5 && this.fillStyle === '#f4c789') currentPaint.pellets.push({x:x + 2, y:y + 2 + sandbox.scrollY});
    },
  };
  const canvas = {attributes:{}, setAttribute(name, value) { this.attributes[name] = value; }, getContext:() => context};
  const element = getRect => ({getBoundingClientRect() {
    const box = getRect();
    return {...box, top:box.top - sandbox.scrollY, bottom:box.bottom - sandbox.scrollY};
  }});
  const collection = {get children() { return layout.cards.map(box => element(() => box)); }};
  lightsControl.getBoundingClientRect = element(() => layout.lightsControl).getBoundingClientRect;
  const elements = {'.collection':hasCollection ? collection : null, '[data-lights-toggle]':lightsControl,
    '.site-shell':element(() => layout.shell), '.arcade-title':element(() => layout.title),
    '.site-header':element(() => layout.header), '.site-footer':element(() => layout.footer)};
  const document = {...eventTarget(), hidden:false, documentElement:{clientWidth:layout.width, scrollHeight:layout.height},
    body:{append(value) { assert.equal(value, canvas); mounted++; }},
    createElement(name) { assert.equal(name, 'canvas'); return canvas; },
    querySelector:selector => elements[selector],
    querySelectorAll:() => layout.obstacles.map(box => element(() => box)),
    fonts:{ready:{then(callback) { fontsReady = callback; }}},
    dispatchEvent(event) { events.push({type:event.type, detail:event.detail, time:now, headIndex:heads.length, paintIndex:paints.length}); this.emit(event.type, event); },
  };
  const math = Object.create(Math);
  math.random = () => { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 0x100000000; };
  const sandbox = {document, Math:math, scrollY:0, innerHeight:fullPage ? layout.height : 844, devicePixelRatio:3,
    CustomEvent:class {constructor(type, {detail}) { this.type = type; this.detail = detail; }},
    recordTrailLength:length => { maximumTrail = Math.max(maximumTrail, length); },
    recordTrailStep:(previous, current) => { if (previous) trailSteps.push({dx:current.x - previous.x, dy:current.y - previous.y, time:now}); },
    matchMedia:query => query.includes('reduced') ? media.reduced : media.contrast,
    // A previous release's stored pause must no longer suppress the snake.
    sessionStorage:{getItem() { storageReads++; return 'true'; }, setItem() { assert.fail('the decorative snake must not write manual-pause storage'); }},
    addEventListener:(name, callback) => listeners.set(name, callback),
    requestAnimationFrame:callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id),
    ResizeObserver:class {constructor(callback) { resizeCallback = callback; } observe() {}},
  };
  // Observe allocated trail samples without adding a production debug API.
  runInNewContext(`const originalUnshift = Array.prototype.unshift;
    Array.prototype.unshift = function(...items) { recordTrailStep(this[0], items[0]); const size = originalUnshift.apply(this, items); recordTrailLength(size); return size; };\n${source}`, sandbox);
  return {frames, heads, paints, events, trailSteps, canvas, lightsControl, media, document,
    get maximumTrail() { return maximumTrail; },
    get minimumBodyAlpha() { return minimumBodyAlpha; },
    get storageReads() { return storageReads; },
    get mounted() { return mounted; },
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

test('the snake mounts without a snake control and moves independently of Pause lights', () => {
  const h = harness(); h.advance(30);
  assert.equal(h.mounted, 1);
  assert.equal(h.canvas.attributes['aria-hidden'], 'true');
  assert.equal(h.storageReads, 0);
  assert.ok(h.heads.length > 0);
  const before = location(h.head);
  h.lightsControl.emit('click'); h.advance(30);
  assert.notDeepEqual(location(h.head), before);
  assert.equal(h.frames.size, 1);
  assert.equal(h.lightsControl.textContent, 'Pause lights');
});

test('pages without a collection mount no snake and schedule no work', () => {
  const h = harness({hasCollection:false}); h.advance(30);
  assert.equal(h.mounted, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.paints.length, 0);
  assert.equal(h.storageReads, 0);
});

test('motion and contrast preferences suppress drawing until both preferences allow it', () => {
  for (const preference of ['reduced', 'contrast']) {
    const h = harness({[preference]:true}); h.advance(20);
    assert.equal(h.heads.length, 0);
    assert.equal(h.frames.size, 0);
    h.media[preference].matches = false; h.media[preference].emit('change'); h.advance(5);
    assert.ok(h.heads.length > 0);
    const count = h.heads.length;
    h.media[preference].matches = true; h.media[preference].emit('change'); h.advance(20);
    assert.equal(h.heads.length, count);
    assert.equal(h.frames.size, 0);
    h.media[preference].matches = false; h.media[preference].emit('change'); h.advance(5);
    assert.ok(h.heads.length > count);
    assert.equal(h.frames.size, 1);
  }
  const combined = harness({reduced:true, contrast:true}); combined.tick();
  combined.media.reduced.matches = false; combined.media.reduced.emit('change'); combined.tick();
  assert.equal(combined.heads.length, 0); assert.equal(combined.frames.size, 0);
  combined.media.contrast.matches = false; combined.media.contrast.emit('change'); combined.advance(5);
  assert.ok(combined.heads.length > 0); assert.equal(combined.frames.size, 1);
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
  h.scroll(0); h.tick();
  assert.ok(h.head.x >= 0 && h.head.x <= 390);
  h.emit('pagehide'); assert.equal(h.frames.size, 0);
});

test('repeated resize and scrolling retain one loop with a bounded viewport canvas', () => {
  const h = harness(); h.advance(10);
  for (const mobile of [true, 'tablet', false, true, 'tablet', false, true]) {
    h.resize(mobile, 700); h.tick();
    assert.equal(h.canvas.width, Math.round(h.layout.width * 1.5));
    assert.equal(h.canvas.height, 1050);
    assert.equal(h.frames.size, 1);
    assert.ok(h.head.x >= 0 && h.head.x <= h.layout.width);
    const previous = h.paints.length;
    h.scroll(200); h.tick(); assert.equal(h.paints.length, previous + 1);
    assert.equal(h.frames.size, 1);
    h.scroll(0); h.tick();
  }
  h.media.reduced.matches = true; h.media.reduced.emit('change'); h.tick();
  assert.equal(h.frames.size, 0);
  const previous = h.paints.length;
  h.resize(true, 600); h.scroll(200); h.tick();
  assert.equal(h.canvas.height, 900);
  assert.equal(h.paints.length, previous + 1);
  assert.equal(h.frames.size, 0);
});

test('painting stays below 31 frames per second with bounded draw work', () => {
  const h = harness(); h.advance(60, 1000 / 60);
  assert.ok(h.paints.length <= 31, `painted ${h.paints.length} times in one second`);
  assert.ok(h.paints.every(paint => paint.fills <= 103));
});

function gaps(layout) {
  const rows = [], corridors = [];
  for (const card of layout.cards) {
    let row = rows.find(items => items[0].top === card.top);
    if (!row) rows.push(row = []);
    row.push(card);
  }
  for (const [rowIndex, row] of rows.entries()) {
    for (let column = 0; column < row.length - 1; column++) {
      const center = (row[column].right + row[column + 1].left) / 2;
      corridors.push({name:`vertical ${rowIndex}:${column}`, axis:'y',
        box:rect(center - 7, row[0].top, center + 7, row[0].bottom), length:row[0].bottom - row[0].top});
    }
    const next = rows[rowIndex + 1];
    if (!next) continue;
    const center = (Math.max(...row.map(card => card.bottom)) + next[0].top) / 2;
    corridors.push({name:`horizontal ${rowIndex}`, axis:'x',
      box:rect(row[0].left, center - 7, row.at(-1).right, center + 7), length:row.at(-1).right - row[0].left});
  }
  return corridors;
}
function assertClear(point, radius, obstacles) {
  for (const box of obstacles) assert.ok(point.x + radius <= box.left || point.x - radius >= box.right || point.y + radius <= box.top || point.y - radius >= box.bottom,
    `point at ${point.x},${point.y} overlaps text/control ${JSON.stringify(box)}`);
}
function completeCycle(h, cycle = 1) {
  for (let frame = 0; frame < 20000; frame++) {
    h.tick();
    assert.ok(h.head.x >= 5 && h.head.x <= h.layout.width - 5 && h.head.y >= 5 && h.head.y <= h.layout.height - 5);
    assertClear(h.head, 5, h.layout.obstacles);
    if (h.events.some(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'complete' && event.detail.cycle === cycle)) return;
  }
  assert.fail(`round ${cycle} did not complete within the bounded simulation`);
}

for (const mode of ['desktop', 'tablet', 'phone']) test(`the ${mode} route traverses every central gutter, eats five pellets, and returns through the header`, () => {
  for (const seed of [7, 29]) {
    const h = harness({mobile:mode === 'phone', tablet:mode === 'tablet', fullPage:true, seed});
    completeCycle(h);
    const start = h.events.find(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'start');
    const complete = h.events.find(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'complete');
    const eats = h.events.filter(event => event.type === 'arcade:snake-eat' && event.detail.cycle === 1);
    assert.equal(start.detail.pellets.length, 5);
    assert.equal(new Set(start.detail.pellets.map(pellet => `${pellet.x},${pellet.y}`)).size, 5);
    for (const pellet of start.detail.pellets) assertClear(pellet, 3, h.layout.obstacles);
    assert.deepEqual(eats.map(event => event.detail.count), [1, 2, 3, 4, 5]);
    assert.deepEqual(eats.map(event => event.detail.segments), [48, 60, 72, 84, 96]);
    for (const event of eats) {
      const pellet = start.detail.pellets.find(point => point.x === event.detail.x && point.y === event.detail.y);
      assert.ok(pellet, 'consumption refers to a pellet displayed on this round');
      const renderedHead = h.heads[event.headIndex];
      assert.ok(Math.abs(renderedHead.x - pellet.x) + Math.abs(renderedHead.y - pellet.y) <= 5, 'consumption requires physical arrival');
      assert.equal(h.paints[event.paintIndex].pellets.length, 5 - event.detail.count);
    }
    assert.equal(complete.detail.eaten, 5); assert.equal(complete.detail.segments, 96);
    const footprint = h.heads.slice(0, complete.headIndex + 1);
    const footerVisit = footprint.findIndex(head => head.y >= h.layout.footer.top);
    assert.ok(footerVisit >= 0);
    assert.ok(footprint.slice(footerVisit).some(head => head.y <= 16), 'the completed round returns to the top after the footer');
    for (const corridor of gaps(h.layout)) {
      let minimum = Infinity, maximum = -Infinity, longest = 0;
      for (const head of footprint) {
        const box = corridor.box;
        if (head.x >= box.left && head.x <= box.right && head.y >= box.top && head.y <= box.bottom) {
          minimum = Math.min(minimum, head[corridor.axis]); maximum = Math.max(maximum, head[corridor.axis]);
          longest = Math.max(longest, maximum - minimum);
        } else { minimum = Infinity; maximum = -Infinity; }
      }
      assert.ok(longest >= corridor.length * .6, `${corridor.name} needs a sustained center traversal, got ${longest / corridor.length}`);
    }
    const visits = h.events.filter(event => event.type === 'arcade:snake-visit');
    assert.equal(new Set(visits.map(event => event.detail.index)).size, 6);
    for (const visit of visits) {
      const head = h.heads[visit.headIndex], card = h.layout.cards[visit.detail.index];
      assert.ok(head.x >= card.left - 5 && head.x <= card.right + 5 && head.y >= card.top - 5 && head.y <= card.bottom + 5, 'card glow is triggered by an actual arrival');
    }
    const next = h.events.find(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'start' && event.detail.cycle === 2);
    assert.equal(next.detail.reason, 'complete'); assert.equal(next.detail.segments, 36); assert.equal(next.detail.pellets.length, 5);
    assert.equal(h.paints[next.paintIndex].bodies, 35, 'the long tail resets at the next round');
    assert.ok(h.paints.some(paint => paint.bodies === 95), 'growth is visible in the rendered tail');
    assert.ok(h.paints.every(paint => paint.fills <= 103 && paint.bodies <= 95));
    assert.ok(h.maximumTrail <= 641, 'one pending insertion is immediately trimmed to the 640-sample cap');
    assert.ok(h.minimumBodyAlpha >= .249, 'the entire extended tail remains visible');
  }
});

test('fractional and varying frame intervals retain exact turns and steady travel speed', () => {
  const h = harness({fullPage:true}), intervals = [1000 / 60, 1000 / 120, 31, 13, 47, 22, 1000 / 60];
  for (let frame = 0; frame < 20000; frame++) {
    h.tick(intervals[frame % intervals.length]);
    if (h.events.some(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'complete')) break;
  }
  const completed = h.events.find(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'complete');
  assert.ok(completed, 'the round must finish with varying fractional frame times');
  assert.ok(h.trailSteps.length > 1000);
  assert.ok(h.trailSteps.every(step => step.dx === 0 || step.dy === 0), 'every retained path sample must remain orthogonal at turns');
  const first = h.trailSteps[0], last = h.trailSteps.at(-1);
  const travelled = h.trailSteps.reduce((sum, step) => sum + Math.abs(step.dx) + Math.abs(step.dy), 0);
  const speed = travelled / ((last.time - first.time) / 1000);
  assert.ok(speed > 65 && speed <= 73, `observed speed ${speed}px/s must remain near the intended 72px/s`);
  const start = h.events.find(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'start');
  const eats = h.events.filter(event => event.type === 'arcade:snake-eat');
  assert.equal(eats.length, 5);
  for (const event of eats) assert.ok(start.detail.pellets.some(pellet => pellet.x === event.detail.x && pellet.y === event.detail.y), 'fractional movement still consumes pellets at their exact coordinates');
  assert.equal(h.paints.at(-1).bodies, 35, 'the reset retains the complete starting tail after fractional movement');
  assert.ok(h.maximumTrail <= 641);
});

test('five-pellet growth repeats after a completed round and viewport-only resize preserves progress', () => {
  const h = harness({fullPage:true});
  completeCycle(h, 1); completeCycle(h, 2);
  assert.deepEqual(h.events.filter(event => event.type === 'arcade:snake-eat').map(event => event.detail.count), [1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
  const starts = () => h.events.filter(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'start');
  const count = starts().length;
  h.resize(false, h.layout.height + 100); h.tick();
  assert.equal(starts().length, count, 'a viewport height change must not replenish food or restart the round');
  h.resize(true, 2200); h.tick();
  assert.equal(starts().length, count + 1);
  assert.equal(starts().at(-1).detail.reason, 'layout');
  assert.equal(starts().at(-1).detail.pellets.length, 5);
  assert.equal(h.paints.at(-1).bodies, 0, 'reflow discards old geometry rather than drawing a trail across text');
  assert.equal(h.events.filter(event => event.type === 'arcade:snake-cycle' && event.detail.phase === 'complete').length, 2);
});
