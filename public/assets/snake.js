// A decorative visitor: document-space paths, viewport-sized paint, no game state.
(() => {
  const collection = document.querySelector('.collection');
  const control = document.querySelector('[data-snake-toggle]');
  if (!collection || !control) return;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  canvas.className = 'arcade-snake';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(forced-colors: active)');
  const storageKey = 'cail-snake-paused';
  let paused = false;
  try { paused = sessionStorage.getItem(storageKey) === 'true'; } catch { /* Storage is optional. */ }
  let frame = 0, last = 0, dirty = true, departed = false;
  let board, head, trail = [], route = [], goals = [], descending = true;
  let obstacles = [], cardRects = [], titleRect, headerRect, footerRect;
  let viewWidth = 0, viewHeight = 0, scroll = 0, heading = {x:1, y:0};
  const point = (x, y) => ({x, y});
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const bounds = element => {
    const rect = element.getBoundingClientRect();
    return {left:rect.left, right:rect.right, top:rect.top + scrollY, bottom:rect.bottom + scrollY};
  };
  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function position(index) {
    return point(board.left + (index % board.cols) * board.step, 8 + Math.floor(index / board.cols) * board.step);
  }
  function nearest(target) {
    let best = -1, closest = Infinity;
    for (let i = 0; i < board.blocked.length; i++) {
      if (board.blocked[i]) continue;
      const delta = distance(position(i), target);
      if (delta < closest) { best = i; closest = delta; }
    }
    return best;
  }
  function tour() {
    // Visit every card in row order, choosing a fresh order and entry side per row.
    const rows = [];
    for (const rect of cardRects) {
      let row = rows.find(items => Math.abs(items[0].top - rect.top) < 4);
      if (!row) rows.push(row = []);
      row.push(rect);
    }
    if (!descending) rows.reverse();
    const stops = [];
    for (const row of rows) for (const rect of shuffled(row)) {
      const leftFirst = Math.random() < .5;
      const entry = leftFirst ? rect.left + 8 : rect.right - 8;
      const exit = leftFirst ? rect.right - 8 : rect.left + 8;
      stops.push(point(entry, descending ? rect.top + 8 : rect.bottom - 8));
      stops.push(point(exit, descending ? rect.bottom - 8 : rect.top + 8));
    }
    const side = Math.random() < .5 ? board.left : position(board.cols - 1).x;
    if (descending) {
      stops.push(point(side, footerRect.top + 8), point(side, footerRect.bottom - 8));
    } else {
      stops.push(point(titleRect.right + 20, titleRect.bottom + 12));
      stops.push(point(titleRect.left - 20, titleRect.top - 12));
      stops.push(point(side, headerRect.top + 8), point(side, headerRect.bottom - 8));
    }
    descending = !descending;
    return stops;
  }
  function pathTo(target) {
    const start = nearest(head);
    if (start < 0) return [];
    const parents = new Int32Array(board.blocked.length).fill(-1);
    const queue = new Int32Array(parents.length);
    parents[start] = start;
    queue[0] = start;
    let read = 0, write = 1, best = start, closest = distance(position(start), target);
    const directions = shuffled([[-1, 0], [1, 0], [0, -1], [0, 1]]);
    // Bounded breadth-first search also finds the closest reachable point if a
    // narrow layout closes a corridor. No retries or searches occur per segment.
    while (read < write) {
      const current = queue[read++];
      const delta = distance(position(current), target);
      if (delta < closest) { best = current; closest = delta; }
      if (delta <= board.step / 2) break;
      const x = current % board.cols, y = Math.floor(current / board.cols);
      for (const [dx, dy] of directions) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= board.cols || ny < 0 || ny >= board.rows) continue;
        const next = ny * board.cols + nx;
        if (parents[next] !== -1 || board.blocked[next]) continue;
        parents[next] = current;
        queue[write++] = next;
      }
    }
    const path = [];
    for (let index = best; index !== start; index = parents[index]) path.push(position(index));
    return path.reverse();
  }
  function measure() {
    dirty = false;
    viewWidth = document.documentElement.clientWidth;
    viewHeight = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(viewWidth * ratio);
    canvas.height = Math.round(viewHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const shell = bounds(document.querySelector('.site-shell'));
    const width = Math.min(viewWidth - 16, shell.right - shell.left + 24);
    const height = document.documentElement.scrollHeight;
    const step = Math.max(12, Math.ceil(Math.sqrt(width * height / 60000)));
    board = {left:Math.max(8, shell.left - 12), step, cols:Math.floor(width / step) + 1, rows:Math.floor((height - 16) / step) + 1};
    board.blocked = new Uint8Array(board.cols * board.rows);
    obstacles = [...document.querySelectorAll('.brand, .site-header nav, .title-word, .game h2, .game p, .game-action, .site-footer a, .site-footer span, [data-snake-toggle]')].map(bounds);
    for (const rect of obstacles) {
      const minX = Math.max(0, Math.ceil((rect.left - 12 - board.left) / step));
      const maxX = Math.min(board.cols - 1, Math.floor((rect.right + 12 - board.left) / step));
      const minY = Math.max(0, Math.ceil((rect.top - 12 - 8) / step));
      const maxY = Math.min(board.rows - 1, Math.floor((rect.bottom + 12 - 8) / step));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) board.blocked[y * board.cols + x] = 1;
    }
    cardRects = [...collection.children].map(bounds);
    titleRect = bounds(document.querySelector('.arcade-title'));
    headerRect = bounds(document.querySelector('.site-header'));
    footerRect = bounds(document.querySelector('.site-footer'));
    const start = nearest(head || point(board.left + 36, headerRect.bottom + 16));
    head = start < 0 ? null : position(start);
    trail = head ? [head] : [];
    route = [];
    goals = [point(titleRect.right + 20, titleRect.top - 16), ...tour()];
  }
  function move(amount) {
    if (!head) return;
    if (!route.length) {
      if (!goals.length) goals = tour();
      // At most one route search per rendered frame, including unreachable goals.
      route = pathTo(goals.shift());
      if (!route.length) return;
    }
    while (amount > 0 && route.length) {
      const next = route[0], remaining = distance(head, next);
      if (remaining < .01) { route.shift(); continue; }
      const stride = Math.min(amount, remaining, 2);
      heading = point(Math.sign(next.x - head.x), Math.sign(next.y - head.y));
      head = point(head.x + heading.x * stride, head.y + heading.y * stride);
      trail.unshift(head);
      if (trail.length > 180) trail.length = 180;
      amount -= stride;
    }
  }
  function paint() {
    context.clearRect(0, 0, viewWidth, viewHeight);
    if (!head || reduced.matches || contrast.matches) return;
    const segments = [head];
    let length = 0, next = 8;
    for (let i = 1; i < trail.length && segments.length < 24; i++) {
      const span = distance(trail[i - 1], trail[i]);
      while (span && length + span >= next && segments.length < 24) {
        const fraction = (next - length) / span;
        segments.push(point(trail[i - 1].x + (trail[i].x - trail[i - 1].x) * fraction, trail[i - 1].y + (trail[i].y - trail[i - 1].y) * fraction));
        next += 8;
      }
      length += span;
    }
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i], y = segment.y - scroll;
      if (y < -10 || y > viewHeight + 10) continue;
      const size = i === 0 ? 10 : 6;
      context.globalAlpha = i === 0 ? 1 : .85 - i * .022;
      context.fillStyle = i === 0 ? '#e2f9bd' : i < 8 ? '#b9dc99' : '#83eedc';
      context.fillRect(Math.round(segment.x - size / 2), Math.round(y - size / 2), size, size);
    }
    context.globalAlpha = 1;
    context.fillStyle = '#202224';
    for (const side of [-1, 1]) context.fillRect(Math.round(head.x + heading.x * 2 - heading.y * side * 2 - 1), Math.round(head.y - scroll + heading.y * 2 + heading.x * side * 2 - 1), 2, 2);
    // A final text mask protects readability even during late font/layout changes.
    for (const rect of obstacles) context.clearRect(rect.left - 6, rect.top - scroll - 6, rect.right - rect.left + 12, rect.bottom - rect.top + 12);
  }
  function allowed() { return !paused && !reduced.matches && !contrast.matches && !document.hidden && !departed; }
  function tick(now) {
    frame = 0;
    if (dirty) measure();
    scroll = scrollY;
    if (allowed() && (!last || now - last >= 1000 / 30)) {
      if (last) move(Math.min((now - last) / 1000, .08) * 72);
      last = now;
      paint();
    } else if (!allowed()) paint();
    if (allowed()) frame = requestAnimationFrame(tick);
  }
  function requestPaint() { if (!frame && !document.hidden && !departed) frame = requestAnimationFrame(tick); }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    const preference = reduced.matches || contrast.matches;
    control.disabled = preference;
    control.textContent = preference ? 'Snake off' : paused ? 'Resume snake' : 'Pause snake';
    control.setAttribute('aria-label', preference ? 'Snake off: motion or contrast preference enabled' : control.textContent);
    requestPaint();
  }
  control.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem(storageKey, String(paused)); } catch { /* Keep working without storage. */ }
    sync();
  });
  control.hidden = false;
  const invalidate = () => { dirty = true; requestPaint(); };
  new ResizeObserver(invalidate).observe(document.querySelector('.site-shell'));
  addEventListener('resize', invalidate);
  addEventListener('scroll', () => { scroll = scrollY; if (!allowed()) requestPaint(); }, {passive:true});
  addEventListener('pagehide', () => { departed = true; cancelAnimationFrame(frame); frame = 0; });
  addEventListener('pageshow', () => { departed = false; dirty = true; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  contrast.addEventListener('change', sync);
  document.fonts.ready.then(invalidate);
  sync();
})();
