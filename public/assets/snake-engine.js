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
  const nodes=Array.from(queue.subarray(0,write)),degree=new Uint8Array(size);
  read=0;write=0;
  for(const id of nodes) {
    for(let d=0;d<4;d++) if(edges[id]&1<<d)degree[id]++;
    if(degree[id]<2)queue[write++]=id;
  }
  // A reachable cul-de-sac is not a safe place to eat: the body blocks retreat.
  const culdesac=new Uint8Array(size);
  while(read<write) {
    const id=queue[read++];culdesac[id]=1;
    neighbors(id).forEach((other,d)=>{
      if((edges[id]&1<<d)&&!culdesac[other]&&degree[other]>=2&&--degree[other]===1)queue[write++]=other;
    });
  }
  return {width, height, cols, size, free, edges, point, start, neighbors, nodes, foodNodes:nodes.filter(id=>!culdesac[id])};
}

export class Snake {
  constructor(grid, {random = Math.random, onEvent = () => {}} = {}) {
    this.grid = grid; this.random = random; this.onEvent = onEvent;
    this.body = grid.start < 0 ? [] : [grid.start];
    this.route = []; this.escapeRoute = []; this.pointer = null; this.plannedPointer = null;
    this.wanted = START_LENGTH; this.eaten = 0; this.round = 0;
    this.steps = 0; this.searches = 0; this.next = null; this.progress = 0;
    this.growing = false;
    this.parents = new Int32Array(grid.size); this.queue = new Int32Array(grid.size);
    this.occupied = new Uint8Array(grid.size);
    this.escapeBlocked = new Uint32Array(grid.size);
    this.escapeSeen = new Uint32Array(grid.size); this.escapeStamp = 0;
    this.release = new Uint16Array(grid.size); this.witnessPath = new Uint8Array(grid.size);
    this.food = new Set(); this.refill();
  }
  refill() {
    if (!this.body.length) return;
    this.round++; this.eaten = 0;
    const occupied = new Set(this.body), head = this.grid.point(this.body[0]);
    const choices = this.grid.foodNodes.filter(id => !occupied.has(id) && distance(this.grid.point(id), head) > GRID * 3);
    choices.sort((a, b) => this.grid.point(a).y - this.grid.point(b).y);
    this.food.clear();
    for (let i = 0; i < FOOD_COUNT && choices.length; i++) {
      const low = Math.floor(i * choices.length / FOOD_COUNT), high = Math.floor((i + 1) * choices.length / FOOD_COUNT);
      this.food.add(choices[Math.min(choices.length - 1, low + Math.floor(this.random() * Math.max(1, high - low)))]);
    }
    this.onEvent('cycle', {round:this.round, phase:'start', pellets:[...this.food].map(this.grid.point)});
  }
  setPointer(point) {
    this.pointer = point;
    // Compare against the last planned position, so many small moves accumulate.
    if (!this.plannedPointer || !point || distance(this.plannedPointer, point) >= GRID) {
      this.route = []; this.plannedPointer = point;
    }
    // Finish the current grid edge before choosing a different direction.
    if (!this.progress) this.next = null;
  }
  legal(next, from = this.body[0]) {
    if (!this.grid.free[next] || this.occupied[next] || next===this.body[1]) return false;
    const offset=next-from,x=from%this.grid.cols;
    const direction=offset===-1&&x>0?0:offset===1&&x<this.grid.cols-1?1:offset===-this.grid.cols?2:offset===this.grid.cols?3:-1;
    if(direction<0||!(this.grid.edges[from]&1<<direction))return false;
    if (!this.pointer) return true;
    const target = this.grid.point(next), current = this.grid.point(from);
    const dx = target.x - current.x, dy = target.y - current.y;
    const t = Math.max(0, Math.min(1, ((this.pointer.x-current.x)*dx + (this.pointer.y-current.y)*dy)/(GRID*GRID)));
    const closest = {x:current.x+t*dx, y:current.y+t*dy};
    // Test the entire edge. If the mouse arrives on the head, permit escape only.
    return !near(closest, this.pointer, POINTER_RADIUS) ||
      (near(current, this.pointer, POINTER_RADIUS) && distance(target, this.pointer) > distance(current, this.pointer));
  }
  plan() {
    this.searches++;
    const {grid, parents, queue} = this, start = this.body[0];
    parents.fill(-1); parents[start] = start; queue[0] = start;
    let read = 0, write = 1, target = start, farthest = -1;
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
  hasEscape(next, growing) {
    // Simulate the move and retain a path to the moving tail. This prevents
    // eating in a pocket that would require reversing through the body to leave.
    const end = this.body.length - (growing ? 0 : 1);
    if (!end) return true;
    const tail = this.body[end - 1], stamp = ++this.escapeStamp;
    for (let i=0;i<end-1;i++) this.escapeBlocked[this.body[i]] = stamp;
    let read=0,write=1;
    this.queue[0]=next; this.escapeSeen[next]=stamp;this.parents[next]=next;
    while (read<write) {
      const id=this.queue[read++];
      if (id===tail) {
        const path=[];
        for(let at=tail;at!==next;at=this.parents[at])path.push(at);
        this.escapeRoute=[...path.reverse(),...this.body.slice(0,end-1).reverse(),next];
        return true;
      }
      const neighbors=this.grid.neighbors(id);
      for(let direction=0;direction<4;direction++) {
        const other=neighbors[direction];
        if (!(this.grid.edges[id]&1<<direction) || this.escapeSeen[other]===stamp || this.escapeBlocked[other]===stamp) continue;
        this.escapeSeen[other]=stamp;this.parents[other]=id;this.queue[write++]=other;
      }
    }
    // A bridge can isolate the tail until it moves. Prove an actual sequence
    // of legal moves, using each body's release time, instead of guessing from
    // the amount of empty space. The rare fallback has a fixed search budget.
    this.release.fill(0);this.witnessPath.fill(0);
    for(let i=0;i<end;i++)this.release[this.body[i]]=end-i;
    this.witnessPath[next]=1;
    let budget=4096;const walk=[next];
    const target=this.grid.point(tail);
    const visit=(id,time)=>{
      // Rejoining any released part of the old body closes a safe loop: that
      // body's remaining path will vacate one cell ahead of each future move.
      if(time>0&&this.release[id]>0&&this.release[id]<=time) {
        this.escapeRoute=[...walk.slice(1),...this.body.slice(0,this.body.indexOf(id)).reverse(),next];
        return true;
      }
      if(--budget<=0||time>=this.body.length*4)return false;
      const candidates=this.grid.neighbors(id).filter((other,d)=>(this.grid.edges[id]&1<<d)&&!this.witnessPath[other]&&this.release[other]<=time+1);
      candidates.sort((a,b)=>distance(this.grid.point(a),target)-distance(this.grid.point(b),target));
      for(const other of candidates){
        this.witnessPath[other]=1;walk.push(other);
        if(visit(other,time+1))return true;
        this.witnessPath[other]=0;walk.pop();
      }
      return false;
    };
    return visit(next,0);
  }
  prepare() {
    if (!this.body.length) return false;
    if (this.next !== null) return true;
    const escapeRoute=this.escapeRoute;
    // Defer one segment of growth when releasing the tail is needed to escape.
    // The growth remains pending; no existing segment is removed or reordered.
    let selected=false;
    for (const growing of this.body.length<this.wanted ? [true,false] : [false]) {
      this.growing=growing;this.occupied.fill(0);
      for (let i=1;i<this.body.length-(growing?0:1);i++) this.occupied[this.body[i]]=1;
      for(let attempt=0;attempt<4;attempt++) {
        if (!this.route.length || !this.legal(this.route[0])) this.plan();
        if (!this.route.length) break;
        if(this.hasEscape(this.route[0],growing)){selected=true;break;}
        this.occupied[this.route[0]]=1;this.route=[];
      }
      if(selected)break;
    }
    if (!selected) {
      // Keep the previously proved continuation when a bounded search cannot
      // rediscover it. Defer growth while following that exact witness.
      this.growing=false;this.occupied.fill(0);
      for(let i=1;i<this.body.length-1;i++)this.occupied[this.body[i]]=1;
      if(!escapeRoute.length||!this.legal(escapeRoute[0]))return false;
      this.next=escapeRoute[0];this.escapeRoute=escapeRoute.slice(1);this.route=[];
      return true;
    }
    this.next = this.route.shift();
    const head=this.grid.point(this.body[0]),target=this.grid.point(this.next);
    const neck=this.body.length>1?this.grid.point(this.body[1]):null;
    if (this.pointer && neck && (target.x-head.x !== head.x-neck.x || target.y-head.y !== head.y-neck.y)) {
      this.onEvent('turn', {reason:'pointer', head});
    }
    return true;
  }
  commit() {
    this.body.unshift(this.next);
    if (!this.growing) this.body.pop();
    this.next = null; this.progress = 0; this.steps++;
    const head=this.body[0];
    if (this.food.delete(head)) {
      this.eaten++; this.wanted = Math.min(MAX_LENGTH, this.wanted + 8);
      this.onEvent('eat', {round:this.round, count:this.eaten, head:this.grid.point(head)});
      if (!this.food.size) {
        this.onEvent('cycle', {round:this.round, phase:'complete', eaten:this.eaten});
        this.refill(); this.route = [];
      }
    }
  }
  step() {
    if (!this.prepare()) return false;
    this.commit(); return true;
  }
  advance(milliseconds) {
    let remaining=Math.max(0,milliseconds)*72/1000/GRID;
    while(remaining>1e-9 && this.prepare()) {
      const stride=Math.min(remaining,1-this.progress);
      this.progress+=stride;remaining-=stride;
      if(this.progress>=1-1e-9) this.commit();
    }
  }
  points() {
    const points=this.body.map(this.grid.point);
    if (!points.length || !this.progress || this.next === null) return points;
    const from=points[0],to=this.grid.point(this.next);
    points.unshift({x:from.x+(to.x-from.x)*this.progress,y:from.y+(to.y-from.y)*this.progress});
    // Retain all actual corners and move only the two ends of the polyline.
    if (!this.growing && points.length>1) {
      const tail=points.pop(),before=points.at(-1);
      points.push({x:tail.x+(before.x-tail.x)*this.progress,y:tail.y+(before.y-tail.y)*this.progress});
    }
    return points;
  }
}
