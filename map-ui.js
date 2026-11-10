function visualHit(map, mode, x, y) {
  const objects = entities(map).sort((a,b) => (b.y+box(b)[1])-(a.y+box(a)[1]));
  const direct = objects.find(o => !o.village && inside(o,x,y));
  if (direct) return direct;
  const over = mode === 'city' ? .65 : .32;
  return objects.find(o => {
    if (o.village) return inside(o,x,y);
    const [w,h] = box(o);
    return x >= o.x-over && x < o.x+w+over && y >= o.y-2*over && y < o.y+h;
  });
}

function buildingNames(map, mode) {
  const result = [];
  function collect(m, kind, ox, oy, sx, sy, parent) {
    const names = labels(kind);
    for (const o of m.items) {
      const [w,h] = box(o);
      result.push({name:names[o.id],key:parent?.key || o.key, nested:!!parent,
        x:ox+(o.x+w/2)*sx, y:oy+(o.y+h)*sy});
    }
    for (const v of m.villages || []) {
      const [w,h] = box(v);
      collect(v.village,'village',v.x,v.y,w/24,h/16,v);
    }
  }
  collect(map,mode,0,0,1,1,null);
  return result;
}

function layoutNameplates(layer, editor, width, height) {
  const names = buildingNames(editor.map,editor.mode);
  const signature = JSON.stringify([width,height,editor.sel,editor.hideNames,names]);
  if (layer._signature === signature) return;
  layer._signature = signature;
  layer.replaceChildren();
  if (editor.hideNames) return;
  const [cols,rows] = size(editor.mode);
  const ink = document.createElement('canvas').getContext('2d');
  const reserved = [];
  const fragment = document.createDocumentFragment();
  for (const n of names) {
    const fs = 0.7 * Math.max(n.nested?8:10,Math.min(n.nested?13:16,width/cols*(n.nested?.77:1.1)));
    ink.font = '600 '+fs+'px "Malgun Gothic",sans-serif';
    const w = Math.min(width,Math.ceil(ink.measureText(n.name).width)+6);
    const h = Math.ceil(fs+3);
    const cx = n.x/cols*width, cy = n.y/rows*height;
    const left = Math.max(0,Math.min(width-w,cx-w/2));
    const top = Math.max(0,Math.min(height-h,cy));
    let best = null;
    for (const dy of [0,h,-h,2*h,-2*h,3*h,-3*h]) {
      for (const dx of [0,w*.45,-w*.45]) {
        const x = Math.max(0,Math.min(width-w,left+dx)), y = Math.max(0,Math.min(height-h,top+dy));
        const penalty = reserved.reduce((sum,b) => sum+
          Math.max(0,Math.min(x+w+1,b.x+b.w)-Math.max(x,b.x))*
          Math.max(0,Math.min(y+h+1,b.y+b.h)-Math.max(y,b.y)),0);
        const score = penalty*9 + Math.hypot(x-left,y-top);
        if (!best || score < best.score) best={x,y,w,h,score};
        if (score === 0) break;
      }
      if (best.score === 0) break;
    }
    reserved.push(best);
    if (Math.hypot(best.x-left,best.y-top)>h*.8) {
      const line=document.createElement('i');
      const endX=best.x+w/2,endY=best.y+h/2;
      line.className='labelLeader';
      Object.assign(line.style,{left:cx+'px',top:cy+'px',width:Math.hypot(endX-cx,endY-cy)+'px',transform:'rotate('+Math.atan2(endY-cy,endX-cx)+'rad)'});
      fragment.append(line);
    }
    const b=document.createElement('button');
    b.className='nameplate'+(n.nested?' nested':'')+(editor.sel===n.key?' selected':'');
    b.type='button';b.dataset.owner=n.key;b.textContent=n.name;b.setAttribute('aria-label',n.name+' 지도에서 선택');
    Object.assign(b.style,{left:best.x+'px',top:best.y+'px',fontSize:fs+'px',width:w+'px',height:h+'px'});
    fragment.append(b);
  }
  layer.append(fragment);
}

function sizeMapFrame(editor, frame, stage) {
  const [w,h] = size(editor.mode);
  const available = frame.parentElement.clientWidth - 2 * parseFloat(getComputedStyle(frame.parentElement).paddingLeft);
  const viewportH = window.visualViewport?.height || window.innerHeight;
  const room = Math.max(120,viewportH - 150);
  const fitWidth = Math.min(available, Math.floor(room*w/h));
  const width = Math.max(1,Math.floor(fitWidth*editor.zoom));
  const height = Math.max(1,Math.round(width*h/w));
  frame.style.maxHeight = Math.min(room,Math.round(available*h/w))+'px';
  stage.style.width=width+'px'; stage.style.height=height+'px';
  return [width,height];
}
function installMapGestures(stage, editor, cancelEdit) {
  const frame = stage.parentElement;
  const touches = new Map();
  let gesture = null;
  function sample() {
    const [a,b=a] = [...touches.values()];
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  }
  function anchor() {
    const point = sample(), rect = stage.getBoundingClientRect();
    gesture = {point, zoom:editor.zoom, x:(point.x-rect.left)/rect.width, y:(point.y-rect.top)/rect.height};
  }
  function stop(event) { event.preventDefault();event.stopImmediatePropagation(); }
  stage.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(touches.size>=2 || editor.panning || (editor.zoom>1 && !editable())){
      cancelEdit();stage.setPointerCapture(event.pointerId);anchor();stop(event);
    }
  },true);
  stage.addEventListener('pointermove',event=>{
    if(!touches.has(event.pointerId))return;
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(!gesture)return;
    const point=sample();
    if(touches.size>=2){
      editor.zoom=Math.max(1,Math.min(5,gesture.zoom*point.d/gesture.point.d));
      redraw();
      if(editor.zoom===1 && editor.panning){editor.panning=false;stage.classList.remove('panning');const pan=document.getElementById('panMap');pan.textContent='화면 이동';pan.setAttribute('aria-pressed','false')}
    }
    const rect=stage.getBoundingClientRect();
    frame.scrollLeft+=rect.left+gesture.x*rect.width-point.x;
    frame.scrollTop+=rect.top+gesture.y*rect.height-point.y;
    stop(event);
  },true);
  function finish(event){
    if(!touches.delete(event.pointerId)||!gesture)return;
    stop(event);
    if(touches.size)anchor();else gesture=null;
  }
  stage.addEventListener('pointerup',finish,true);
  stage.addEventListener('pointercancel',finish,true);
}
