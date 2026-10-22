// DOM-free grid simulation. Rendering never decides whether a move is legal.
export const GRID = 12;
export const CLEARANCE = 8;
export const POINTER_RADIUS = 72;
const START_LENGTH = 24, MAX_LENGTH = 64, FOOD_COUNT = 5;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const near = (a, b, radius) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 < radius ** 2;

export function makeGrid(width, height, obstacles, startAt = {x:width / 2, y:120}) {
  // The same document-space intersections as the visible fine grid.
  const left = ((width / 2) % GRID + GRID) % GRID;
  const cols = Math.floor((width - left) / GRID) + 1;
  const rows = Math.ceil(height / GRID) + 1, size = cols * rows;
  const free = new Uint8Array(size), edges = new Uint8Array(size);
  const point = id => ({x:left + id % cols * GRID, y:Math.floor(id / cols) * GRID});
  const blocked = (a, b = a) => obstacles.some(rect =>
    Math.max(a.x, b.x) > rect.left - CLEARANCE && Math.min(a.x, b.x) < rect.right + CLEARANCE &&
    Math.max(a.y, b.y) > rect.top - CLEARANCE && Math.min(a.y, b.y) < rect.bottom + CLEARANCE);
  let start = -1, closest = Infinity;
  for (let id = 0; id < size; id++) {
    const p = point(id);
    if (p.x < 6 || p.x > width - 6 || p.y < 6 || p.y > height - 6 || blocked(p)) continue;
    free[id] = 1;
    const d = distance(p, startAt);
    if (d < closest) { start = id; closest = d; }
  }
  const neighbors = id => {
    const x = id % cols;
    return [x > 0 ? id - 1 : -1, x < cols - 1 ? id + 1 : -1, id - cols, id + cols];
  };
  for (let id = 0; id < size; id++) if (free[id]) {
    neighbors(id).forEach((next, direction) => {
      if (next >= 0 && next < size && free[next] && !blocked(point(id), point(next))) edges[id] |= 1 << direction;
    });
  }
  // Food and targets must belong to the actual starting component.
  const connected = new Uint8Array(size), queue = new Int32Array(size);
  let read = 0, write = 0;
  if (start >= 0) { queue[write++] = start; connected[start] = 1; }
  while (read < write) {
    const id = queue[read++];
    neighbors(id).forEach((next, direction) => {
      if ((edges[id] & 1 << direction) && !connected[next]) { connected[next] = 1; queue[write++] = next; }
    });
  }
  for (let id = 0; id < size; id++) free[id] &= connected[id];
  return {width, height, cols, size, free, edges, point, start, neighbors, nodes:Array.from(queue.subarray(0, write))};
}

export class Snake {
  constructor(grid, {random = Math.random, onEvent = () => {}} = {}) {
    this.grid = grid; this.random = random; this.onEvent = onEvent;
    this.body = grid.start < 0 ? [] : [grid.start];
    this.previous = [...this.body]; this.route = []; this.pointer = null;
    this.wanted = START_LENGTH; this.eaten = 0; this.round = 0;
    this.steps = 0; this.lastReverse = -10; this.searches = 0;
    this.parents = new Int32Array(grid.size); this.queue = new Int32Array(grid.size);
    this.occupied = new Uint8Array(grid.size);
    this.food = new Set(); this.refill();
  }
  refill() {
    if (!this.body.length) return;
    this.round++; this.eaten = 0; this.wanted = START_LENGTH;
    this.body.length = Math.min(this.body.length, this.wanted);
    const occupied = new Set(this.body), head = this.grid.point(this.body[0]);
    const choices = this.grid.nodes.filter(id => !occupied.has(id) && distance(this.grid.point(id), head) > GRID * 3);
    choices.sort((a, b) => this.grid.point(a).y - this.grid.point(b).y);
    this.food.clear();
    for (let i = 0; i < FOOD_COUNT && choices.length; i++) {
      const low = Math.floor(i * choices.length / FOOD_COUNT), high = Math.floor((i + 1) * choices.length / FOOD_COUNT);
      this.food.add(choices[Math.min(choices.length - 1, low + Math.floor(this.random() * Math.max(1, high - low)))]);
    }
    this.onEvent('cycle', {round:this.round, phase:'start', pellets:[...this.food].map(this.grid.point)});
  }
  setPointer(point) {
    const old = this.pointer;
    this.pointer = point;
    // Small mouse jitter does not cause repeated path searches.
    if (!old || !point || distance(old, point) >= GRID) this.route = [];
  }
  reverse(reason) {
    if (this.body.length < 2 || this.steps - this.lastReverse < 6) return false;
    this.body.reverse(); this.previous = [...this.body]; this.route = [];
    this.lastReverse = this.steps;
    this.onEvent('turn', {reason, head:this.grid.point(this.body[0])});
    return true;
  }
  legal(next, from = this.body[0]) {
    if (!this.grid.free[next] || this.occupied[next]) return false;
    if (!this.pointer) return true;
    const target = this.grid.point(next), current = this.grid.point(from);
    // If the pointer arrives on the snake, every allowed escape increases clearance.
    return !near(target, this.pointer, POINTER_RADIUS) ||
      (near(current, this.pointer, POINTER_RADIUS) && distance(target, this.pointer) > distance(current, this.pointer));
  }
  plan() {
    this.searches++;
    const {grid, parents, queue} = this, start = this.body[0];
    parents.fill(-1); parents[start] = start; queue[0] = start;
    let read = 0, write = 1, target = start, farthest = -1;
    // Reuse bounded search buffers and keep the route until it is obstructed.
    while (read < write) {
      const id = queue[read++];
      if (id !== start && this.food.has(id)) { target = id; break; }
      const score = distance(grid.point(id), grid.point(start)) + (this.pointer ? distance(grid.point(id), this.pointer) : 0);
      if (score > farthest) { farthest = score; target = id; }
      grid.neighbors(id).forEach((next, direction) => {
        if (!(grid.edges[id] & 1 << direction) || parents[next] !== -1 || !this.legal(next, id)) return;
        parents[next] = id; queue[write++] = next;
      });
    }
    const route = [];
    for (let id = target; id !== start; id = parents[id]) route.push(id);
    this.route = route.reverse();
  }
  step() {
    if (!this.body.length) return false;
    this.steps++;
    this.previous = [...this.body];
    const head = this.grid.point(this.body[0]), tail = this.grid.point(this.body.at(-1));
    const ahead = this.route.length ? this.grid.point(this.route[Math.min(2, this.route.length - 1)]) : head;
    if (this.pointer && near(ahead, this.pointer, POINTER_RADIUS + GRID) &&
      distance(tail, this.pointer) > distance(head, this.pointer) + GRID) this.reverse('pointer');
    this.occupied.fill(0);
    for (const id of this.body.slice(1, this.body.length >= this.wanted ? -1 : undefined)) this.occupied[id] = 1;
    if (!this.route.length || !this.legal(this.route[0])) this.plan();
    if (!this.route.length) { this.reverse('blocked'); return false; }
    const next = this.route.shift();
    this.body.unshift(next);
    if (this.body.length > this.wanted) this.body.pop();
    if (this.food.delete(next)) {
      this.eaten++; this.wanted = Math.min(MAX_LENGTH, START_LENGTH + this.eaten * 8);
      this.onEvent('eat', {round:this.round, count:this.eaten, head:this.grid.point(next)});
      if (!this.food.size) {
        this.onEvent('cycle', {round:this.round, phase:'complete', eaten:this.eaten});
        this.refill(); this.route = [];
      }
    }
    return true;
  }
  points(progress = 1) {
    return this.body.map((id, index) => {
      const current = this.grid.point(id), old = this.grid.point(this.previous[index] ?? id);
      return {x:old.x + (current.x - old.x) * progress, y:old.y + (current.y - old.y) * progress};
    });
  }
}
