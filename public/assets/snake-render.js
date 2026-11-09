// Paint the exact simulation path, retaining corners and joining every segment.
const BODY = '#83eedc', HEAD = '#e2f9bd', PELLET = '#f4c789', LURE = '#f5a3cb', INK = '#202224';
const TAPER = 12;

export function paintSnake(context, snake, {width, height, scroll = 0}) {
  context.clearRect(0, 0, width, height);
  const points = snake.points();
  let visible = false;
  // Pellets are small plus signs, so they read as food and not as loose body cells.
  function pellet(id, color) {
    const p = snake.grid.point(id), y = p.y - scroll;
    if (y < -6 || y > height + 6) return;
    visible = true; context.fillStyle = color;
    context.fillRect(Math.round(p.x - 3), Math.round(y - 1), 6, 2);
    context.fillRect(Math.round(p.x - 1), Math.round(y - 3), 2, 6);
  }
  context.globalAlpha = 1;
  for (const id of snake.food) pellet(id, PELLET);
  if (snake.lures) for (const id of snake.lures.keys()) pellet(id, LURE);

  context.globalAlpha = .9; context.fillStyle = BODY;
  function run(a, b, half = 3) {
    const top = Math.min(a.y, b.y) - scroll - half, bottom = Math.max(a.y, b.y) - scroll + half;
    if (bottom < 0 || top > height) return;
    visible = true;
    context.fillRect(Math.round(Math.min(a.x, b.x) - half), Math.round(top), Math.round(Math.abs(a.x - b.x)) + half * 2, Math.round(Math.abs(a.y - b.y)) + half * 2);
  }
  // One rectangle per straight run instead of one disconnected square per cell.
  if (points.length) {
    const runs = [];
    let start = points[0], end = start;
    for (let i = 1; i < points.length; i++) {
      const next = points[i];
      if ((start.x === end.x && end.x === next.x) || (start.y === end.y && end.y === next.y)) end = next;
      else { runs.push([start, end]); start = end; end = next; }
    }
    runs.push([start, end]);
    const [from, tip] = runs.pop();
    for (const [a, b] of runs) run(a, b);
    // The last stretch narrows in two steps, so the tail reads as a tail.
    const length = Math.abs(from.x - tip.x) + Math.abs(from.y - tip.y);
    const taper = points.length > 2 ? Math.min(length, TAPER) : 0;
    if (!taper) run(from, tip);
    else {
      const dx = Math.sign(from.x - tip.x), dy = Math.sign(from.y - tip.y);
      const neck = {x:tip.x + dx * taper, y:tip.y + dy * taper}, mid = {x:tip.x + dx * taper / 2, y:tip.y + dy * taper / 2};
      run(from, neck); run(neck, mid, 2); run(mid, tip, 1);
    }
  }
  const head = points[0];
  if (head && head.y - scroll >= -8 && head.y - scroll <= height + 8) {
    visible = true;
    const neck = points.find(p => p.x !== head.x || p.y !== head.y) || {x:head.x - 1, y:head.y};
    const dx = Math.sign(head.x - neck.x), dy = Math.sign(head.y - neck.y);
    const x = Math.round(head.x), y = Math.round(head.y - scroll);
    context.globalAlpha = 1;
    // A brief tongue every few cells, pointing the way it is going.
    if (snake.steps % 9 < 2) {
      context.fillStyle = LURE;
      context.fillRect(x + dx * 8 - (dx ? 2 : 1), y + dy * 8 - (dy ? 2 : 1), dx ? 4 : 2, dy ? 4 : 2);
    }
    // Two overlapping rectangles round the corners of a 12px head.
    context.fillStyle = HEAD;
    context.fillRect(x - 6, y - 5, 12, 10);
    context.fillRect(x - 5, y - 6, 10, 12);
    context.fillStyle = INK;
    for (const side of [-1, 1]) context.fillRect(x + dx * 2 - dy * side * 3 - 1, y + dy * 2 + dx * side * 3 - 1, 2, 2);
  }
  context.globalAlpha = 1;
  return {head, visible};
}
