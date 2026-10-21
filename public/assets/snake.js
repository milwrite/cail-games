// A decorative visitor: document-space paths, viewport-sized paint, no game state.
(() => {
  const collection = document.querySelector('.collection');
  if (!collection) return;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return;
  canvas.className = 'arcade-snake';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(forced-colors: active)');
  const initialSegments = 36, maximumSegments = 96, segmentSpacing = 8, maximumTrail = 640;
  const pelletCount = 5, growth = (maximumSegments - initialSegments) / pelletCount;
  let frame = 0, last = 0, dirty = true, departed = false;
  let board, head, trail = [], route = [], goals = [], pellets = [];
  let cycle = 0, eaten = 0, segmentsWanted = initialSegments, footerReached = false, layoutKey = '';
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
  function tour(descending) {
    const rows = [];
    for (const rect of cardRects) {
      let row = rows.find(items => Math.abs(items[0].top - rect.top) < 4);
      if (!row) rows.push(row = []);
      row.push(rect);
    }
    if (!descending) rows.reverse();
    const stops = [];
    const left = Math.min(...cardRects.map(rect => rect.left));
    const right = Math.max(...cardRects.map(rect => rect.right));
    const crossLeft = left + (right - left) * .1;
    const crossRight = right - (right - left) * .1;
    const leftToRight = Math.random() < .5;
    let enterTop = Math.random() < .5, fromLeft = leftToRight;
    const visit = (rect, x, y) => stops.push({...point(x, y), card:cardRects.indexOf(rect)});
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = [...rows[rowIndex]].sort((a, b) => a.left - b.left);
      const top = Math.min(...row.map(rect => rect.top));
      const bottom = Math.max(...row.map(rect => rect.bottom));
      if (row.length === 1) {
        const rect = row[0], x = fromLeft ? rect.left + 8 : rect.right - 8;
        visit(rect, x, descending ? rect.top + 8 : rect.bottom - 8);
        stops.push(point(x, descending ? rect.bottom - 8 : rect.top + 8));
      } else {
        if (!leftToRight) row.reverse();
        for (let i = 0; i < row.length; i++) {
          const rect = row[i];
          visit(rect, (rect.left + rect.right) / 2, enterTop ? top + 8 : bottom - 8);
          if (i === row.length - 1) continue;
          const next = row[i + 1];
          const x = leftToRight ? (rect.right + next.left) / 2 : (next.right + rect.left) / 2;
          const nearTop = top + (bottom - top) * .1;
          const nearBottom = bottom - (bottom - top) * .1;
          // Paired points force a long run down/up the middle of each gutter.
          // A shortest path between card corners alone tends to hug card edges.
          stops.push({...point(x, enterTop ? nearTop : nearBottom), food:true});
          stops.push({...point(x, enterTop ? nearBottom : nearTop), food:true});
          enterTop = !enterTop;
        }
      }
      const nextRow = rows[rowIndex + 1];
      if (nextRow) {
        const y = descending
          ? (bottom + Math.min(...nextRow.map(rect => rect.top))) / 2
          : (top + Math.max(...nextRow.map(rect => rect.bottom))) / 2;
        // On phones these alternate left/right across every between-card gap.
        // On wider layouts they connect the internal gutters of successive rows.
        const crossFromLeft = row.length === 1 ? fromLeft : !leftToRight;
        stops.push({...point(crossFromLeft ? crossLeft : crossRight, y), food:true});
        stops.push({...point(crossFromLeft ? crossRight : crossLeft, y), food:true});
        fromLeft = !fromLeft;
      }
    }
    const side = Math.random() < .5 ? board.left : position(board.cols - 1).x;
    if (descending) {
      stops.push(point(side, footerRect.top + 8), {...point(side, footerRect.bottom - 8), footer:true});
    } else {
      stops.push(point(titleRect.right + 20, titleRect.bottom + 12));
      stops.push(point(titleRect.left - 20, titleRect.top - 12));
      stops.push(point(side, headerRect.top + 8), point(side, headerRect.bottom - 8));
    }
    return stops;
  }
  function signal(type, detail) {
    document.dispatchEvent(new CustomEvent(`arcade:snake-${type}`, {detail}));
  }
  function beginCycle(reason) {
    cycle++;
    eaten = 0;
    segmentsWanted = initialSegments;
    footerReached = false;
    route = [];
    // Snap every destination to this connected component before placing food.
    // The lazy path search will therefore reach the exact displayed pellet.
    goals = [...tour(true), ...tour(false)].map(target => ({...target, ...position(nearest(target))}));
    goals[goals.length - 1].finish = true;
    const candidates = [];
    for (const target of goals.filter(target => target.food)) {
      if (distance(target, head) > segmentSpacing && !candidates.some(other => distance(other, target) < .01)) candidates.push(target);
    }
    pellets = Array.from({length:Math.min(pelletCount, candidates.length)}, (_, index) => {
      const target = candidates[Math.floor((index + .5) * candidates.length / pelletCount)];
      return {...point(target.x, target.y), id:index, eaten:false};
    });
    let length = 0;
    for (let i = 1; i < trail.length; i++) {
      length += distance(trail[i - 1], trail[i]);
      if (length >= initialSegments * segmentSpacing) { trail.length = i + 1; break; }
    }
    signal('cycle', {cycle, phase:'start', reason, segments:segmentsWanted, pellets:pellets.map(({x, y}) => ({x, y}))});
  }
  function eatAtHead() {
    for (const pellet of pellets) {
      if (pellet.eaten || head.x !== pellet.x || head.y !== pellet.y) continue;
      pellet.eaten = true;
      eaten++;
      segmentsWanted = initialSegments + growth * eaten;
      signal('eat', {cycle, count:eaten, segments:segmentsWanted, x:head.x, y:head.y});
    }
  }
  function arrive(target) {
    eatAtHead();
    if (Number.isInteger(target.card)) signal('visit', {index:target.card});
    if (target.footer) footerReached = true;
    if (target.finish && footerReached) {
      const remaining = pellets.filter(pellet => !pellet.eaten);
      if (remaining.length) { goals = [...remaining, target]; return; }
      signal('cycle', {cycle, phase:'complete', eaten, segments:segmentsWanted});
      beginCycle('complete');
    }
  }
  function keepReachable(start) {
    const visited = new Uint8Array(board.blocked.length), queue = new Int32Array(visited.length);
    let read = 0, write = 1;
    queue[0] = start; visited[start] = 1;
    while (read < write) {
      const current = queue[read++], x = current % board.cols;
      for (const next of [x ? current - 1 : -1, x + 1 < board.cols ? current + 1 : -1, current - board.cols, current + board.cols]) {
        if (next < 0 || next >= visited.length || visited[next] || board.blocked[next]) continue;
        visited[next] = 1; queue[write++] = next;
      }
    }
    for (let i = 0; i < visited.length; i++) if (!visited[i]) board.blocked[i] = 1;
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
    if (canvas.width !== Math.round(viewWidth * ratio)) canvas.width = Math.round(viewWidth * ratio);
    if (canvas.height !== Math.round(viewHeight * ratio)) canvas.height = Math.round(viewHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const shell = bounds(document.querySelector('.site-shell'));
    const width = Math.min(viewWidth - 16, shell.right - shell.left + 24);
    const height = document.documentElement.scrollHeight;
    obstacles = [...document.querySelectorAll('.brand, .site-header nav, .title-word, .game h2, .game p, .game-action, .site-footer a, .site-footer span, .arcade-controls')].map(bounds);
    cardRects = [...collection.children].map(bounds);
    titleRect = bounds(document.querySelector('.arcade-title'));
    headerRect = bounds(document.querySelector('.site-header'));
    footerRect = bounds(document.querySelector('.site-footer'));
    const nextLayout = JSON.stringify([viewWidth, height, shell, obstacles, cardRects, titleRect, headerRect, footerRect], (_, value) => typeof value === 'number' ? Math.round(value * 100) / 100 : value);
    if (layoutKey === nextLayout) return;
    layoutKey = nextLayout;
    const step = Math.max(12, Math.ceil(Math.sqrt(width * height / 60000)));
    board = {left:Math.max(8, shell.left - 12), step, cols:Math.floor(width / step) + 1, rows:Math.floor((height - 16) / step) + 1};
    board.blocked = new Uint8Array(board.cols * board.rows);
    for (const rect of obstacles) {
      const minX = Math.max(0, Math.ceil((rect.left - 12 - board.left) / step));
      const maxX = Math.min(board.cols - 1, Math.floor((rect.right + 12 - board.left) / step));
      const minY = Math.max(0, Math.ceil((rect.top - 12 - 8) / step));
      const maxY = Math.min(board.rows - 1, Math.floor((rect.bottom + 12 - 8) / step));
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) board.blocked[y * board.cols + x] = 1;
    }
    const first = cardRects[0], second = cardRects[1];
    if (!first) { head = null; return; }
    const entryX = second && Math.abs(first.top - second.top) < 4 ? (first.right + second.left) / 2 : first.left + 8;
    const start = nearest(point(entryX, headerRect.top + 8));
    head = start < 0 ? null : position(start);
    trail = head ? [head] : [];
    route = [];
    if (!head) return;
    keepReachable(start);
    if (cycle) signal('cycle', {cycle, phase:'cancel', reason:'layout', eaten});
    beginCycle(cycle ? 'layout' : 'initial');
  }
  function move(amount) {
    if (!head) return;
    if (!route.length) {
      if (!goals.length) return;
      // At most one route search per rendered frame, including unreachable goals.
      const target = goals.shift();
      route = pathTo(target);
      if (!route.length) { if (distance(head, target) < .01) arrive(target); return; }
      Object.assign(route[route.length - 1], target);
    }
    while (amount > 0 && route.length) {
      const next = route[0], remaining = distance(head, next);
      if (remaining < .01) {
        head = point(next.x, next.y);
        if (distance(head, trail[0]) > 0) trail.unshift(head);
        if (trail.length > maximumTrail) trail.length = maximumTrail;
        route.shift();
        arrive(next);
        continue;
      }
      const stride = Math.min(amount, remaining, 2);
      heading = point(Math.sign(next.x - head.x), Math.sign(next.y - head.y));
      head = remaining <= stride ? point(next.x, next.y) : point(head.x + heading.x * stride, head.y + heading.y * stride);
      // Keep turns exact and sample straight sections sparsely; movement speed
      // and fractional frame intervals cannot accumulate an unbounded trail.
      if (distance(head, trail[0]) >= 2 || remaining <= stride) trail.unshift(head);
      if (trail.length > maximumTrail) trail.length = maximumTrail;
      eatAtHead();
      amount -= stride;
    }
  }
  function paint() {
    context.clearRect(0, 0, viewWidth, viewHeight);
    if (!head || reduced.matches || contrast.matches) return;
    context.globalAlpha = .9;
    context.fillStyle = '#f4c789';
    for (const pellet of pellets) if (!pellet.eaten && pellet.y - scroll >= -5 && pellet.y - scroll <= viewHeight + 5) {
      context.fillRect(Math.round(pellet.x - 2), Math.round(pellet.y - scroll - 2), 5, 5);
    }
    const segments = [head];
    let length = 0, next = segmentSpacing, previous = head;
    for (let i = 0; i < trail.length && segments.length < segmentsWanted; i++) {
      const span = distance(previous, trail[i]);
      while (span && length + span >= next && segments.length < segmentsWanted) {
        const fraction = (next - length) / span;
        segments.push(point(previous.x + (trail[i].x - previous.x) * fraction, previous.y + (trail[i].y - previous.y) * fraction));
        next += segmentSpacing;
      }
      length += span;
      previous = trail[i];
    }
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i], y = segment.y - scroll;
      if (y < -10 || y > viewHeight + 10) continue;
      const size = i === 0 ? 10 : 6;
      context.globalAlpha = i === 0 ? 1 : .85 - i / Math.max(1, segmentsWanted - 1) * .6;
      context.fillStyle = i === 0 ? '#e2f9bd' : i < 8 ? '#b9dc99' : '#83eedc';
      context.fillRect(Math.round(segment.x - size / 2), Math.round(y - size / 2), size, size);
    }
    context.globalAlpha = 1;
    context.fillStyle = '#202224';
    for (const side of [-1, 1]) context.fillRect(Math.round(head.x + heading.x * 2 - heading.y * side * 2 - 1), Math.round(head.y - scroll + heading.y * 2 + heading.x * side * 2 - 1), 2, 2);
    // A final text mask protects readability even during late font/layout changes.
    for (const rect of obstacles) context.clearRect(rect.left - 6, rect.top - scroll - 6, rect.right - rect.left + 12, rect.bottom - rect.top + 12);
  }
  function allowed() { return !reduced.matches && !contrast.matches && !document.hidden && !departed; }
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
    requestPaint();
  }
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
