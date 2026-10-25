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
test('pellet rounds replenish food without cutting off the tail',()=>{
 const s=new Snake(makeGrid(720,720,[]),{random:()=>.6});
 for(let i=0;i<1200;i++){
  const length=s.body.length;s.step();
  assert.ok(s.body.length>=length,`body shrank from ${length} to ${s.body.length}`);
 }
 assert.ok(s.round>2);
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
  const old=s.grid.point(s.body[0]),length=s.body.length;
  if(i%100===0)s.setPointer({x:old.x+18,y:old.y+24});
  if(i%100===15)s.setPointer(null);
  if(!s.step()&&!s.pointer)waiting++;else waiting=0;
  assert.ok(waiting<50,'movement must recover after the pointer leaves');
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
 assert.ok(maximumCalls<20,`paint operations must stay bounded by bends, got ${maximumCalls}`);
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
