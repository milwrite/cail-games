import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {makeGrid, Snake, GRID, POINTER_RADIUS} from '../public/assets/snake-engine.js';

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


function assertBody(snake, obstacles) {
  assert.equal(new Set(snake.body).size, snake.body.length, 'body never crosses itself');
  assert.ok(snake.body.length <= 64);
  for (const point of snake.points(.5)) {
    for (const box of obstacles) assert.ok(point.x + 5 <= box.left || point.x - 5 >= box.right || point.y + 5 <= box.top || point.y - 5 >= box.bottom,
      `body overlaps object at ${point.x},${point.y}`);
  }
  for (let i = 1; i < snake.body.length; i++) {
    const a = snake.grid.point(snake.body[i-1]), b = snake.grid.point(snake.body[i]);
    assert.equal(Math.abs(a.x-b.x)+Math.abs(a.y-b.y), GRID, 'body follows adjacent grid nodes');
  }
}
for (const mode of ['desktop', 'tablet', 'phone']) test(`${mode}: complete repeated pellet rounds without content or self collisions`, () => {
  const layout = geometry(mode);
  const obstacles = [...layout.cards, ...layout.obstacles];
  const events = [];
  const grid = makeGrid(layout.width, layout.height, obstacles);
  const snake = new Snake(grid, {random:()=>.37, onEvent:(type, detail)=>events.push({type, ...detail})});
  assert.equal(snake.food.size, 5);
  assert.ok(grid.nodes.length < 60000);
  for (let tick = 0; tick < 6000 && snake.round < 3; tick++) {
    snake.step(); assertBody(snake, obstacles);
    for (const food of snake.food) {
      assert.ok(grid.free[food]);
      const p = grid.point(food);
      assert.equal(Math.abs((p.x - layout.width/2) % GRID), 0);
      assert.equal(p.y % GRID, 0);
    }
  }
  assert.ok(snake.round >= 3, `completed rounds: ${snake.round-1}`);
  assert.equal(events.filter(e=>e.type==='eat').length, 10);
  assert.ok(events.some(e=>e.type==='cycle' && e.phase==='complete'));
  assert.ok(snake.searches < snake.steps / 3, 'routes are reused between steps');
});

test('a pointer ahead turns the entire snake back without crossing its body', () => {
  const grid = makeGrid(720, 720, []), events = [];
  const snake = new Snake(grid, {random:()=>.6,onEvent:(type,detail)=>events.push({type,...detail})});
  for (let i=0;i<25;i++) snake.step();
  const head = grid.point(snake.body[0]), neck=grid.point(snake.body[1]);
  const pointer = {x:head.x+(head.x-neck.x)*2, y:head.y+(head.y-neck.y)*2};
  snake.setPointer(pointer); snake.step();
  assert.ok(events.some(e=>e.type==='turn' && e.reason==='pointer'));
  let oldDistance = Math.hypot(grid.point(snake.body[0]).x-pointer.x,grid.point(snake.body[0]).y-pointer.y);
  for(let i=0;i<100;i++) {
    snake.step(); assertBody(snake, []);
    const p=grid.point(snake.body[0]), nextDistance=Math.hypot(p.x-pointer.x,p.y-pointer.y);
    assert.ok(nextDistance >= POINTER_RADIUS || nextDistance >= oldDistance);
    oldDistance=nextDistance;
  }
  snake.setPointer(null);
  for(let i=0;i<500;i++) snake.step();
  assert.ok(snake.eaten || snake.round>1, 'pellet hunting resumes when the pointer leaves');
});

test('edges cannot cut through a thin object between otherwise free nodes', () => {
  const obstacle = rect(101, 100, 102, 300), grid=makeGrid(400,400,[obstacle]);
  for(const id of grid.nodes) grid.neighbors(id).forEach((next,direction)=>{
    if(!(grid.edges[id] & 1<<direction)) return;
    const a=grid.point(id),b=grid.point(next),p={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    assert.ok(p.x+5<=obstacle.left||p.x-5>=obstacle.right||p.y+5<=obstacle.top||p.y-5>=obstacle.bottom);
  });
});

test('a fully blocked page safely has no snake or food', () => {
  const snake=new Snake(makeGrid(320,600,[rect(0,0,320,600)]));
  assert.deepEqual(snake.body,[]); assert.equal(snake.food.size,0); assert.equal(snake.step(),false);
});

const adapter = (await readFile(new URL('../public/assets/snake.js', import.meta.url), 'utf8')).replace(/^import .*;\n/, '');
function runtime({reduced=false,contrast=false,paused=false}={}) {
  const listeners=new Map(), pending=new Map(); let now=0,sequence=0,draws=0,measures=0,resize;
  const target=()=>({addEventListener(type,fn){listeners.set(type,fn);}});
  const context={setTransform(){},clearRect(){},fillRect(){draws++;}};
  const canvas={setAttribute(){},getContext:()=>context};
  const media={reduced:{...target(),matches:reduced},contrast:{...target(),matches:contrast}};
  // Each media query has an independent listener.
  const mediaChange={};
  for(const [name,m] of Object.entries(media)) m.addEventListener=(_,fn)=>{mediaChange[name]=fn;};
  const shell={};
  const document={...target(),hidden:false,documentElement:{...target(),clientWidth:390,scrollHeight:900},
    body:{append(){}},createElement:()=>canvas,querySelector:()=>shell,querySelectorAll:()=>{measures++;return [];},
    dispatchEvent(){},fonts:{ready:{then(){}}}};
  runInNewContext(adapter,{document,makeGrid,Snake,GRID,innerHeight:844,scrollY:0,devicePixelRatio:3,
    sessionStorage:{getItem:()=>String(paused)}, CustomEvent:class{},
    matchMedia:q=>media[q.includes('reduced')?'reduced':'contrast'],addEventListener:(type,fn)=>listeners.set(type,fn),
    requestAnimationFrame:fn=>{pending.set(++sequence,fn);return sequence;},cancelAnimationFrame:id=>pending.delete(id),
    ResizeObserver:class{constructor(fn){resize=fn;}observe(){}},MutationObserver:class{observe(){}},
  });
  return {document,canvas,media,pending,get draws(){return draws;},get measures(){return measures;},
    emit(type,event){listeners.get(type)?.(event);},mediaChange(name,value){media[name].matches=value;mediaChange[name]();},resize(){resize();},
    tick(delta=16.67){now+=delta;const callbacks=[...pending.values()];pending.clear();for(const fn of callbacks)fn(now);assert.ok(pending.size<=1);},
  };
}
test('animation pauses, honors accessibility preferences and never accumulates loops',()=>{
  const h=runtime(); for(let i=0;i<120;i++)h.tick();
  assert.equal(h.canvas.width,585);assert.equal(h.canvas.height,1266);
  assert.equal(h.measures,2,'DOM geometry is not read during animation frames');
  assert.ok(h.draws>0);
  h.emit('arcade:motion-change',{detail:{paused:true}});assert.equal(h.pending.size,0);
  const before=h.draws;h.tick(60000);assert.equal(h.draws,before);
  h.emit('arcade:motion-change',{detail:{paused:false}});h.tick();assert.equal(h.pending.size,1);
  h.mediaChange('reduced',true);assert.equal(h.pending.size,0);
  h.mediaChange('reduced',false);h.mediaChange('contrast',true);assert.equal(h.pending.size,0);
  h.mediaChange('contrast',false);h.tick();assert.equal(h.pending.size,1);
  h.document.hidden=true;h.emit('visibilitychange');assert.equal(h.pending.size,0);
  h.document.hidden=false;h.emit('visibilitychange');h.tick(60000);assert.equal(h.pending.size,1);
  h.emit('pagehide');h.resize();assert.equal(h.pending.size,0);
  for(let i=0;i<5;i++)h.emit('pageshow');h.tick();assert.equal(h.pending.size,1);
});
test('saved pause and reduced-motion preference avoid starting a frame loop',()=>{
  for(const options of [{paused:true},{reduced:true},{contrast:true}]) assert.equal(runtime(options).pending.size,0);
});

test('the shared snake and pause control are present on every built arcade page',async()=>{
  for(const route of ['', 'cadavre/', 'jeopardy/', 'cloze/', 'haggle/', 'langames/', 'cli-adventures/']) {
    const html=await readFile(new URL(`../dist/${route}index.html`,import.meta.url),'utf8');
    assert.match(html,/<script type="module" src="\/assets\/snake.js"><\/script>/);
    assert.match(html,/data-lights-toggle/);
  }
});
