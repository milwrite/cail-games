// Paint the exact simulation path, retaining corners and joining every segment.
export function paintSnake(context, snake, {width, height, scroll = 0}) {
  context.clearRect(0, 0, width, height);
  const points=snake.points();
  context.globalAlpha=.95;context.fillStyle='#f4c789';
  for(const id of snake.food) {
    const p=snake.grid.point(id),y=p.y-scroll;
    if(y>=-4&&y<=height+4)context.fillRect(Math.round(p.x-2),Math.round(y-2),4,4);
  }
  context.globalAlpha=.7;context.fillStyle='#83eedc';
  function run(a,b) {
    const top=Math.min(a.y,b.y)-scroll-3,bottom=Math.max(a.y,b.y)-scroll+3;
    if(bottom<0||top>height)return;
    context.fillRect(Math.round(Math.min(a.x,b.x)-3),Math.round(top),Math.round(Math.abs(a.x-b.x))+6,Math.round(Math.abs(a.y-b.y))+6);
  }
  // One rectangle per straight run instead of one disconnected square per cell.
  if(points.length) {
    let start=points[0],end=start;
    for(let i=1;i<points.length;i++) {
      const next=points[i];
      if((start.x===end.x&&end.x===next.x)||(start.y===end.y&&end.y===next.y))end=next;
      else {run(start,end);start=end;end=next;}
    }
    run(start,end);
  }
  const head=points[0];
  if(head&&head.y-scroll>=-6&&head.y-scroll<=height+6) {
    const neck=points.find(p=>p.x!==head.x||p.y!==head.y)||{x:head.x-1,y:head.y};
    const dx=Math.sign(head.x-neck.x),dy=Math.sign(head.y-neck.y);
    context.globalAlpha=1;context.fillStyle='#e2f9bd';
    context.fillRect(Math.round(head.x-5),Math.round(head.y-scroll-5),10,10);
    context.fillStyle='#202224';
    for(const side of [-1,1])context.fillRect(Math.round(head.x+dx*2-dy*side*2-1),Math.round(head.y-scroll+dy*2+dx*side*2-1),2,2);
  }
  context.globalAlpha=1;
  return head;
}
