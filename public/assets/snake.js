import { makeGrid, Snake, GRID } from './snake-engine.js';
import { paintSnake } from './snake-render.js';

// One viewport canvas; one animation loop; layout work happens on invalidation.
const shell = document.querySelector('.site-shell');
if (shell) {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
  canvas.className = 'arcade-snake'; canvas.setAttribute('aria-hidden', 'true');
  if (context) {
    document.body.append(canvas);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), contrast = matchMedia('(forced-colors: active)');
    const FRAME_TIME = 1000 / 30, POSE_STEPS = 12, TRAPPED_MS = 1500;
    let snake, obstacles = [], cards = [], frame = 0, last = 0, painted = 0;
    let width = 0, height = 0, dirty = true, departed = false, paused = false, layoutKey = '', pointer = null;
    let lastCard = -1, wasVisible = true, trapped = 0;
    // The choice outlives the tab; the earlier per-tab key is still honoured.
    const stored = (store, key) => { try { return store().getItem(key); } catch { return null; } };
    paused = (stored(() => localStorage, 'cail-animations-paused') ?? stored(() => sessionStorage, 'cail-lights-paused')) === 'true';
    const bounds = element => {
      const r = element.getBoundingClientRect();
      return {left:r.left, right:r.right, top:r.top + scrollY, bottom:r.bottom + scrollY};
    };
    const signal = (type, detail) => document.dispatchEvent(new CustomEvent(`arcade:snake-${type}`, {detail}));
    // The same layout always rests in the same pose.
    function seeded(text) {
      let state = 2166136261;
      for (let i = 0; i < text.length; i++) state = Math.imul(state ^ text.charCodeAt(i), 16777619);
      return () => { state = Math.imul(state ^ state >>> 15, 2246822507) + 0x9e3779b9 | 0; return (state >>> 0) / 4294967296; };
    }
    function measure() {
      dirty = false;
      width = document.documentElement.clientWidth; height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const elements = [...document.querySelectorAll('.game, .brand, .site-header nav, .title-word, .project-identity, .project-description, .preview-stage, .preview-heading, .back-link, .site-footer a, .site-footer span, .arcade-controls, [data-animation-toggle]')];
      obstacles = elements.filter(el => el.getClientRects().length).map(bounds);
      cards = [...document.querySelectorAll('.collection .game')].map(bounds);
      const documentHeight = document.documentElement.scrollHeight;
      const key = JSON.stringify([width, documentHeight, obstacles]);
      if (key === layoutKey) return;
      layoutKey = key;
      const resting = still();
      snake = new Snake(makeGrid(width, documentHeight, obstacles, {x:width / 2, y:scrollY + 132}), {onEvent:signal, ...(resting ? {random:seeded(key)} : {})});
      // A still snake is drawn full length; it never appears as a lone head.
      if (resting) for (let i = 0; i < POSE_STEPS && snake.step(); i++);
      snake.setPointer(pointer && {x:pointer.x, y:pointer.y + scrollY});
      last = 0;
    }
    // Hidden entirely only where the canvas could not be read; otherwise still or moving.
    const shown = () => !contrast.matches && !document.hidden && !departed;
    const still = () => paused || reduced.matches;
    const allowed = () => shown() && !still();
    function draw() {
      if (!shown() || !snake) { context.clearRect(0, 0, width, height); return; }
      const {head, visible} = paintSnake(context, snake, {width, height, scroll:scrollY});
      wasVisible = visible;
      if (head && allowed()) {
        const card = cards.findIndex(r => head.x >= r.left - GRID * 2 && head.x <= r.right + GRID * 2 && head.y >= r.top - GRID * 2 && head.y <= r.bottom + GRID * 2);
        if (card >= 0 && card !== lastCard) signal('visit', {index:card});
        lastCard = card;
      }
    }
    // Off screen, the snake keeps travelling but nothing is repainted.
    function inView() {
      const top = scrollY - 12, bottom = scrollY + height + 12;
      for (const id of snake.body) { const y = snake.grid.point(id).y; if (y >= top && y <= bottom) return true; }
      for (const id of snake.food) { const y = snake.grid.point(id).y; if (y >= top && y <= bottom) return true; }
      return snake.lures.size > 0;
    }
    function tick(now) {
      frame = 0;
      if (dirty) measure();
      if (!allowed() || !snake?.body.length) { draw(); return; }
      if (last) snake.advance(Math.min(now - last, 100));
      last = now;
      if (snake.waiting || !painted || now - painted >= FRAME_TIME) {
        if (wasVisible || inView()) draw();
        painted = now;
      }
      if (!snake.waiting) frame = requestAnimationFrame(tick);
      // Boxed in with nowhere to go: after a moment it starts over, short, from the top.
      else if (!trapped) trapped = setTimeout(() => {
        trapped = 0;
        if (!snake?.waiting || !allowed()) return;
        snake.reset('trapped'); snake.setPointer(pointer && {x:pointer.x, y:pointer.y + scrollY});
        wake();
      }, TRAPPED_MS);
    }
    // One still frame, painted at once: paused and reduced-motion pages run no loop.
    function rest() {
      if (dirty || !snake) measure();
      draw();
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; last = 0; painted = 0;
      clearTimeout(trapped); trapped = 0;
      if (allowed()) frame = requestAnimationFrame(tick);
      else if (shown()) rest();
      else context.clearRect(0, 0, width, height);
    }
    function invalidate() {
      dirty = true;
      if (frame) return;
      if (allowed()) frame = requestAnimationFrame(tick);
      else if (shown()) rest();
    }
    function wake() {
      if (frame) return;
      if (allowed()) { last = 0; painted = 0; frame = requestAnimationFrame(tick); }
      else if (shown() && snake) draw();
    }
    function setPointer(event) {
      if (event.pointerType === 'touch') return;
      pointer = {x:event.clientX, y:event.clientY};
      snake?.setPointer({x:pointer.x, y:pointer.y + scrollY});
      wake();
    }
    // A click or tap on open grid drops a pellet there; controls and text never do.
    function feed(event) {
      if (!allowed() || !snake || event.defaultPrevented || event.button) return;
      if (event.target.closest?.('a, button, input, select, textarea, summary, label, .game, .project-description, .preview-stage')) return;
      if (getSelection?.().toString()) return;
      if (snake.lure({x:event.clientX, y:event.clientY + scrollY}) >= 0) wake();
    }
    addEventListener('pointermove', setPointer, {passive:true});
    document.documentElement.addEventListener('pointerleave', () => { pointer = null; snake?.setPointer(null); wake(); });
    addEventListener('scroll', () => { if (pointer) snake?.setPointer({x:pointer.x, y:pointer.y + scrollY}); wake(); }, {passive:true});
    document.addEventListener('click', feed);
    // "Random game" sends the snake to the card it chose.
    document.addEventListener('arcade:lure', event => {
      const card = cards[event.detail?.index];
      if (!card || !allowed() || !snake) return;
      if (snake.lure({x:(card.left + card.right) / 2, y:card.top - GRID * 2}, {card:event.detail.index}) >= 0) wake();
    });
    new ResizeObserver(invalidate).observe(shell);
    new MutationObserver(invalidate).observe(shell, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden', 'open']});
    addEventListener('resize', invalidate);
    addEventListener('pagehide', () => { departed = true; sync(); });
    addEventListener('pageshow', () => { departed = false; invalidate(); sync(); });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('arcade:motion-change', event => { paused = event.detail.paused; sync(); });
    reduced.addEventListener('change', sync); contrast.addEventListener('change', sync);
    document.fonts.ready.then(invalidate);
    sync();
  }
}
