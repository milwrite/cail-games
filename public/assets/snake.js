import { makeGrid, Snake, GRID } from './snake-engine.js';

// One viewport canvas; one animation loop; layout work happens on invalidation.
const shell = document.querySelector('.site-shell');
if (shell) {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
  canvas.className = 'arcade-snake'; canvas.setAttribute('aria-hidden', 'true');
  if (context) {
    document.body.append(canvas);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), contrast = matchMedia('(forced-colors: active)');
    const STEP_TIME = GRID / 72 * 1000, FRAME_TIME = 1000 / 30;
    let snake, obstacles = [], cards = [], frame = 0, last = 0, painted = 0, accumulator = 0;
    let width = 0, height = 0, dirty = true, departed = false, paused = false, layoutKey = '', pointer = null;
    let lastCard = -1;
    try { paused = sessionStorage.getItem('cail-lights-paused') === 'true'; } catch { /* Optional preference. */ }
    const bounds = element => {
      const r = element.getBoundingClientRect();
      return {left:r.left, right:r.right, top:r.top + scrollY, bottom:r.bottom + scrollY};
    };
    const signal = (type, detail) => document.dispatchEvent(new CustomEvent(`arcade:snake-${type}`, {detail}));
    function measure() {
      dirty = false;
      width = document.documentElement.clientWidth; height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const elements = [...document.querySelectorAll('.game, .brand, .site-header nav, .title-word, .project-identity, .project-description, .preview-stage, .preview-heading, .back-link, .site-footer a, .site-footer span, .arcade-controls, [data-lights-toggle]')];
      obstacles = elements.filter(el => el.getClientRects().length).map(bounds);
      cards = [...document.querySelectorAll('.collection .game')].map(bounds);
      const documentHeight = document.documentElement.scrollHeight;
      const key = JSON.stringify([width, documentHeight, obstacles]);
      if (key === layoutKey) return;
      layoutKey = key;
      snake = new Snake(makeGrid(width, documentHeight, obstacles, {x:width / 2, y:scrollY + 132}), {onEvent:signal});
      snake.setPointer(pointer && {x:pointer.x, y:pointer.y + scrollY});
      accumulator = 0; last = 0;
    }
    const allowed = () => !paused && !reduced.matches && !contrast.matches && !document.hidden && !departed;
    function draw(progress) {
      context.clearRect(0, 0, width, height);
      if (!allowed() || !snake) return;
      context.fillStyle = '#f4c789'; context.globalAlpha = .95;
      for (const id of snake.food) {
        const p = snake.grid.point(id), y = p.y - scrollY;
        if (y >= -4 && y <= height + 4) context.fillRect(p.x - 2, y - 2, 4, 4);
      }
      const points = snake.points(progress);
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i], y = p.y - scrollY;
        if (y < -6 || y > height + 6) continue;
        context.globalAlpha = i ? .8 - i / Math.max(1, points.length) * .45 : 1;
        context.fillStyle = i ? i < 6 ? '#b9dc99' : '#83eedc' : '#e2f9bd';
        const size = i ? 6 : 10;
        context.fillRect(p.x - size / 2, y - size / 2, size, size);
      }
      const head = points[0];
      if (head) {
        const neck = points[1] || {x:head.x - 1, y:head.y};
        const dx = Math.sign(head.x - neck.x), dy = Math.sign(head.y - neck.y);
        context.globalAlpha = 1; context.fillStyle = '#202224';
        for (const side of [-1, 1]) context.fillRect(head.x + dx * 2 - dy * side * 2 - 1, head.y - scrollY + dy * 2 + dx * side * 2 - 1, 2, 2);
        const card = cards.findIndex(r => head.x >= r.left - GRID * 2 && head.x <= r.right + GRID * 2 && head.y >= r.top - GRID * 2 && head.y <= r.bottom + GRID * 2);
        if (card >= 0 && card !== lastCard) signal('visit', {index:card});
        lastCard = card;
      }
      for (const r of obstacles) context.clearRect(r.left - 5, r.top - scrollY - 5, r.right - r.left + 10, r.bottom - r.top + 10);
    }
    function tick(now) {
      frame = 0;
      if (dirty) measure();
      if (!allowed() || !snake?.body.length) { draw(1); return; }
      if (last) accumulator += Math.min(now - last, 100);
      last = now;
      while (accumulator >= STEP_TIME) { snake.step(); accumulator -= STEP_TIME; }
      if (!painted || now - painted >= FRAME_TIME) { draw(accumulator / STEP_TIME); painted = now; }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame); frame = 0; last = 0; painted = 0;
      if (allowed()) frame = requestAnimationFrame(tick);
      else context.clearRect(0, 0, width, height);
    }
    function invalidate() { dirty = true; if (!frame && allowed()) frame = requestAnimationFrame(tick); }
    function setPointer(event) {
      if (event.pointerType === 'touch') return;
      pointer = {x:event.clientX, y:event.clientY};
      snake?.setPointer({x:pointer.x, y:pointer.y + scrollY});
    }
    addEventListener('pointermove', setPointer, {passive:true});
    document.documentElement.addEventListener('pointerleave', () => { pointer = null; snake?.setPointer(null); });
    addEventListener('scroll', () => { if (pointer) snake?.setPointer({x:pointer.x, y:pointer.y + scrollY}); }, {passive:true});
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
