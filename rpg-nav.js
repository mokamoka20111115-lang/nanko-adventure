/* Shared Chapter 2/4 tap navigation around solid scenery. */
window.NankoRPGNavigation=function(start,goal,solid){
    const cell=(x,y)=>[Math.round((x-20)/20),Math.round((y-100)/20)];
    const [sx,sy]=cell(start.x,start.y),[gx,gy]=cell(goal.x,goal.y),key=(x,y)=>x+','+y;
    const queue=[[sx,sy]],from=new Map([[key(sx,sy),null]]);let end=null;
    for(let i=0;i<queue.length;i++){
      const [a,b]=queue[i];if(a===gx&&b===gy){end=key(a,b);break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=a+dx,ny=b+dy,k=key(nx,ny);if(from.has(k)||solid(20+nx*20,100+ny*20))continue;
        from.set(k,key(a,b));queue.push([nx,ny]);
      }
    }
    if(!end)return [];const path=[];
    while(from.get(end)!==null){const [a,b]=end.split(',').map(Number);path.unshift({x:20+a*20,y:100+b*20});end=from.get(end);}
    path.push({x:goal.x,y:goal.y});return path;
};
