const artCache=new Map();
function art(mode,id){const key=mode+id;if(!artCache.has(key)){const c=document.createElement('canvas');c.width=c.height=180;const p=c.getContext('2d');p.scale(1.8,1.8);(mode==='city'?drawCityArt:drawVillageArt)(p,id);artCache.set(key,c)}return artCache.get(key)}
const seeded=(x,y)=>{const n=Math.sin(x*57.19+y*79.73)*6184;return n-Math.floor(n)};
function tree(p,x,y,s){p.save();p.translate(x,y);p.scale(s,s);p.fillStyle='#68835a55';p.beginPath();p.ellipse(0,4,7,3,0,0,7);p.fill();p.fillStyle='#795d40';p.fillRect(-1,0,2,5);for(const [a,b,r,col] of [[0,-4,6,'#4d8057'],[-2,-7,5,'#68a367'],[1,-9,3.5,'#8fba73']]){p.fillStyle=col;p.beginPath();p.arc(a,b,r,0,7);p.fill()}p.restore()}
function paintBoard(canvas,mode,m,opts={}){
 const [W,H]=size(mode),px=opts.width||Math.min(1800,Math.max(540,(canvas.clientWidth||600)*Math.min(2,devicePixelRatio||1)));
 canvas.width=Math.round(px);canvas.height=Math.round(px*H/W);const p=canvas.getContext('2d');p.scale(canvas.width/W,canvas.height/H);drawWorld(p,mode,m,opts);
 for(const s of opts.ink||[]){if(!s.pts.length)continue;p.beginPath();p.moveTo(...s.pts[0]);s.pts.slice(1).forEach(pt=>p.lineTo(...pt));p.strokeStyle=s.tool==='mark'?'#f9c72685':'#b7483c';p.lineWidth=s.tool==='mark'?1.3:.25;p.lineCap=p.lineJoin='round';p.stroke()}
}
function drawWorld(p,mode,m,opts={}){
 const [W,H]=size(mode);const r=routeMap(mode,m);p.save();
 p.fillStyle=mode==='city'?'#b9d89a':'#c2dd9c';p.fillRect(0,0,W,H);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
 const a=seeded(x,y);if(a>.75){p.fillStyle=a>.93?'#d4e6a9':'#b0d197';p.beginPath();p.ellipse(x+.3,y+.6,.34,.12,0,0,7);p.fill()}
 if(!r)continue;const i=y*W+x;if(r.grid[i]===1){p.fillStyle=r.base[i]?'#849590':'#dbccac';p.fillRect(x-.006,y-.006,1.012,1.012);
 if(r.base[i]&&basic(mode,x,y)&&!basic(mode,x,y-1)){p.fillStyle='#e1d9bb';p.fillRect(x,y,1,.15);p.fillStyle='#eadfb9';if(x%3===0)p.fillRect(x+.2,y+.95,1.0,.1)}
 if(r.base[i]&&!basic(mode,x,y+1)){p.fillStyle='#e1d9bb';p.fillRect(x,y+.85,1,.15)}
 }}
 if(mode==='city'){for(const x of [16,40,64]){p.fillStyle='#faf3d3';for(let a=0;a<5;a++)p.fillRect(x,26.22+a*.32,1.1,.15)}}
 for(let x=1;x<W-1;x+=mode==='city'?3:2){for(let y of [0,H-1]){if(!r||r.grid[y*W+x]===0)tree(p,x+.3,y+.7,mode==='city'?.13:.07)}}
 const objects=entities(m).slice().sort((a,b)=>(a.y+box(a)[1])-(b.y+box(b)[1]));
 for(const o of objects){const [w,h]=box(o);
 if(o.village){
 p.save();p.fillStyle='#617f5880';p.fillRect(o.x+.18,o.y+.35,w,h);p.translate(o.x,o.y);p.scale(w/24,h/16);drawWorld(p,'village',o.village);p.restore();
 p.strokeStyle='#7ba46a';p.lineWidth=.15;p.strokeRect(o.x,o.y,w,h);
 const t=o.village.name||'우리 마을';p.font='bold 1.05px "Malgun Gothic",sans-serif';const tw=Math.min(w-.5,p.measureText(t).width+1.4);p.fillStyle='#fffae9';p.fillRect(o.x+(w-tw)/2,o.y+.22,tw,1.65);p.fillStyle='#365d42';p.textAlign='center';p.fillText(t,o.x+w/2,o.y+1.41,tw-.45);
 }else{const over=mode==='city'?.65:.32; p.drawImage(art(mode,o.id),o.x-over,o.y-over*2,w+over*2,h+over*2)}
 if(o.key===opts.selected){p.strokeStyle='#236d59';p.lineWidth=mode==='city'?.23:.12;p.setLineDash([.5,.25]);p.strokeRect(o.x,o.y,w,h);p.setLineDash([])}
 }
 if(opts.ghost){const o=opts.ghost,[w,h]=box(o);p.fillStyle=opts.valid?'#3b916577':'#d35b5280';p.fillRect(o.x,o.y,w,h);p.strokeStyle=opts.valid?'#28704f':'#aa3d36';p.lineWidth=.18;p.strokeRect(o.x,o.y,w,h)}
 p.restore()
}
function sampleVillage(i=0){const m=newVillage();m.name=['햇살마을','솔바람마을','꽃담마을','달빛마을'][i];const ids=[[4,22,17,21,12,23],[15,13,3,19,11,20],[18,2,16,4,8,9],[1,21,14,6,22,10]][i];
 [[1,4],[7,3],[14,2],[20,3],[3,10],[17,10]].forEach(([x,y],j)=>{const o=item(ids[j],x,y,'v_s'+j);if(dropValid('village',m,o))m.items.push(o)});return m}
function sampleCity(){const m=newCity();m.name='모아시';for(let i=0;i<4;i++)addVillage(m,i+1,sampleVillage(i));
 [[4,24,19],[0,32,19],[16,42,18],[10,50,20],[22,22,31],[24,36,31],[19,48,32],[17,55,15],[2,28,10],[15,39,7],[25,48,6],[12,24,40],[6,40,42],[7,52,40]].forEach(([id,x,y],j)=>{const o=item(id,x,y,'c_s'+j);if(dropValid('city',m,o))m.items.push(o)});return m}

