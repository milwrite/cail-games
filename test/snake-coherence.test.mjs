import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGrid, Snake, GRID} from '../public/assets/snake-engine.js';
import {paintSnake} from '../public/assets/snake-render.js';
import {geometry} from './snake-fixtures.mjs';

const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
test('pointer avoidance never transfers the head to the tail',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 for(let i=0;i<30;i++)s.step();
 const head=s.grid.point(s.body[0]),neck=s.grid.point(s.body[1]);
 s.setPointer({x:head.x+2*(head.x-neck.x),y:head.y+2*(head.y-neck.y)});
 s.step();
 assert.ok(distance(head,s.grid.point(s.body[0]))<=GRID,'the head must travel at most one grid edge');
});
test('the snake starts short, never loses tail mid-game, and starts over only once fully grown',()=>{
 const events=[];
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6,onEvent:(type,detail)=>events.push({type,detail})});
 assert.equal(s.wanted,8,'a new snake is eight cells long');
 let longest=0;
 for(let i=0;i<3000;i++){
  const length=s.body.length,resets=s.resets||0;s.step();
  if((s.resets||0)>resets){
   assert.equal(length,40,'only a full-grown snake starts over');
   assert.deepEqual(s.body,[s.grid.start],'it starts over as a single cell at the starting point');
   assert.equal(s.wanted,8); assert.equal(s.food.size,5,'with fresh pellets');
  } else assert.ok(s.body.length>=length,`body shrank from ${length} to ${s.body.length}`);
  longest=Math.max(longest,s.body.length);
 }
 assert.equal(longest,40,'forty cells is full grown');
 assert.ok(s.resets>=1,'a finished game starts another');
 assert.deepEqual(events.filter(e=>e.type==='reset').map(e=>e.detail.reason).filter(r=>r!=='grown'),[]);
});
test('a boxed-in snake can be started over: short, at the start, and moving again',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 for(let i=0;i<300;i++)s.step();
 s.lure({x:10,y:10});s.waiting=true;
 s.reset('trapped');
 assert.deepEqual(s.body,[s.grid.start]); assert.equal(s.waiting,false); assert.equal(s.lures.size,0);
 assert.equal(s.next,null); assert.equal(s.progress,0);
 for(let i=0;i<7;i++)assert.ok(s.step());
 assert.ok(s.body.length>=7&&s.body.length<=8+4*s.eaten,'it regrows from one cell toward its short starting length');
 const none=new Snake(makeGrid(320,600,[{left:0,top:0,right:320,bottom:600}]));
 assert.doesNotThrow(()=>none.reset()); assert.deepEqual(none.body,[]);
});
test('every rendered bend retains its actual right-angle corner',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 for(let i=0;i<100;i++){
  s.step();const p=s.points(.5);
  for(let j=1;j<p.length;j++) assert.ok(p[j].x===p[j-1].x||p[j].y===p[j-1].y,'the rendered body must not shortcut a corner');
 }
});
test('pellets remain visible until the moving head physically reaches them',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 const next=s.grid.neighbors(s.body[0]).find(id=>s.grid.free[id]);
 s.food=new Set([next]);
 s.advance(GRID/72*1000*.5);
 assert.ok(s.food.has(next),'halfway to the pellet is not consumption');
 assert.ok(distance(s.points()[0],s.grid.point(next))>0);
 s.advance(GRID/72*1000*.5);
 assert.equal(distance(s.points()[0],s.grid.point(next)),0);
 assert.ok(!s.food.has(next));
});

for(const [mode,seed] of [['desktop',2],['tablet',9],['phone',3],['phone',8],['phone',19],['phone',20]])test(`${mode} seed ${seed}: long pointer bursts recover without head swaps or tail cuts`,()=>{
 const l=geometry(mode);let r=seed;
 const s=new Snake(makeGrid(l.width,l.height,[...l.cards,...l.obstacles]),{random:()=>((r=(1664525*r+1013904223)>>>0)/0x100000000)});
 let waiting=0;
 for(let i=0;i<4000;i++){
  const old=s.grid.point(s.body[0]),length=s.body.length,resets=s.resets||0;
  if(i%100===0)s.setPointer({x:old.x+18,y:old.y+24});
  if(i%100===15)s.setPointer(null);
  if(!s.step()&&!s.pointer)waiting++;else waiting=0;
  assert.ok(waiting<50,'movement must recover after the pointer leaves');
  // Starting over (full grown) is the one moment the head and length may jump.
  if((s.resets||0)>resets){assert.equal(length,40);continue;}
  assert.ok(distance(old,s.grid.point(s.body[0]))<=GRID,'no head teleport');
  assert.ok(s.body.length>=length,'no tail truncation');
  assert.equal(new Set(s.body).size,s.body.length,'no self collision');
 }
 assert.ok(s.round>2,'pellet hunting continues');
});

function raster(width,height){
 const pixels=new Uint8Array(width*height);let calls=0;
 const context={globalAlpha:1,fillStyle:'',clearRect(){pixels.fill(0);},fillRect(x,y,w,h){
  calls++;
  if(!['#83eedc','#e2f9bd'].includes(this.fillStyle))return;
  for(let row=Math.max(0,Math.floor(y));row<Math.min(height,Math.ceil(y+h));row++)
   for(let col=Math.max(0,Math.floor(x));col<Math.min(width,Math.ceil(x+w));col++)pixels[row*width+col]=1;
 }};
 return{context,pixels,get calls(){return calls;}};
}
test('the actual painter produces one connected body at turns, with fewer paint operations',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 for(let i=0;i<80;i++)s.step();
 let maximumCalls=0;
 for(let frame=0;frame<60;frame++){
  s.advance(1000/60);const r=raster(720,720);
  paintSnake(r.context,s,{width:720,height:720});
  maximumCalls=Math.max(maximumCalls,r.calls);
  const start=r.pixels.indexOf(1);assert.ok(start>=0);
  const queue=[start];r.pixels[start]=0;
  for(let index=0;index<queue.length;index++){
   const id=queue[index],x=id%720;
   for(const other of [x?id-1:-1,x<719?id+1:-1,id-720,id+720])
    if(other>=0&&other<r.pixels.length&&r.pixels[other]){r.pixels[other]=0;queue.push(other);}
  }
  assert.equal(r.pixels.indexOf(1),-1,'a body fragment was left disconnected from the head');
 }
 assert.ok(maximumCalls<32,`paint operations must stay bounded by bends, got ${maximumCalls}`);
});

test('a series of small mouse movements invalidates the route cumulatively',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});s.step();
 s.setPointer({x:300,y:300});s.prepare();assert.ok(s.route.length);
 for(let x=301;x<=312;x++)s.setPointer({x,y:300});
 assert.equal(s.route.length,0,'a moving pointer must not be treated as stationary jitter');
});

test('cached continuations still enforce one adjacent, unobstructed grid edge',()=>{
 const s=new Snake(makeGrid(720,720,[]));s.occupied.fill(0);
 assert.equal(s.legal(s.body[0]+3),false,'a cached target cannot bypass movement distance');
});

test('a stationary blocking pointer does no repeated pathfinding work',()=>{
 const s=new Snake(makeGrid(48,48,[]));s.setPointer({x:24,y:24});
 for(let i=0;i<100;i++)s.advance(16.67);
 assert.equal(s.waiting,true);
 const searches=s.searches;
 for(let i=0;i<1000;i++)s.advance(16.67);
 assert.equal(s.searches,searches);
 s.setPointer(null);s.advance(200);
 assert.equal(s.waiting,false,'pointer departure wakes movement');
});

test('a visitor pellet is the next target, is eaten once, and leaves the round intact',()=>{
 const events=[];
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6,onEvent:(type,detail)=>events.push({type,detail})});
 for(let i=0;i<30;i++)s.step();
 const round=s.round,food=s.food.size,eaten=s.eaten;
 const id=s.lure({x:600,y:600},{card:4});
 assert.ok(id>=0); assert.equal(s.lures.size,1);
 let steps=0;
 while(s.lures.size&&steps++<400){
  const old=s.grid.point(s.body[0]);
  assert.ok(s.step());
  assert.ok(distance(old,s.grid.point(s.body[0]))<=GRID,'no head teleport');
  assert.equal(new Set(s.body).size,s.body.length,'no self collision');
 }
 assert.equal(s.lures.size,0,'the snake reaches the pellet');
 assert.deepEqual(events.filter(e=>e.type==='lure').map(e=>e.detail.tag),[{card:4}]);
 assert.equal(s.round,round); assert.ok(s.food.size>=food-(s.eaten-eaten));
 for(let i=0;i<5;i++)s.lure({x:100+i*40,y:100});
 assert.equal(s.lures.size,3,'at most three visitor pellets wait at once');
 assert.equal(new Snake(makeGrid(320,600,[{left:0,top:0,right:320,bottom:600}])).lure({x:10,y:10}),-1);
});
