const VILLAGE = [
 ['주거','단독주택','빌라','동네 아파트'],['먹거리','분식집','빵집','치킨집','피자가게','햄버거가게','카페','포장마차'],
 ['가게·생활','편의점','동네 슈퍼','문구점','세탁소','미용실','약국','꽃집'],['배움·놀이','초등학교','유치원','태권도장','피아노학원','놀이터','동네 책방'],['이동','버스정류장','자전거보관소']
];
const CITY = [
 ['교통','전철역','기차역','버스터미널','항구 여객터미널'],['상업·일터','전통시장','백화점','대형마트','업무용 고층빌딩','공장','물류센터'],
 ['공공·안전','시청','법원','경찰서','소방서','우체국'],['의료·교육','종합병원','대학교','시립도서관'],
 ['문화·체육','공연장','영화관','박물관','미술관','종합운동장','실내체육관'],['공원·여가','도시공원','놀이공원']
];
const labels = mode => (mode==='city'?CITY:VILLAGE).flatMap(a=>a.slice(1));
const size = mode=> mode==='city'?[80,54]:[24,16];
const item = (id,x,y,key)=>({id,x,y,key});
const newVillage=()=>({name:'',items:[item(0,4,5,'home1'),item(0,11,9,'home2'),item(0,17,5,'home3')]});
const newCity=()=>({name:'',items:[],villages:[]});
const box = o=>o.village?[18,12]:o.key?.startsWith('c_')?[4,4]:[2,2];
const basic=(mode,x,y)=>mode==='city'?(y===26||y===27):(y===7||y===8);
const sameCell=(a,b)=>a.x===b.x&&a.y===b.y;
const entities=m=>[...(m.villages||[]),...m.items];
const intersects=(a,b)=>{let [w,h]=box(a),[v,k]=box(b);return a.x<b.x+v&&a.x+w>b.x&&a.y<b.y+k&&a.y+h>b.y};
const inside=(o,x,y)=>{const [w,h]=box(o);return x>=o.x&&x<o.x+w&&y>=o.y&&y<o.y+h};
function routeMap(mode,m){
 const [W,H]=size(mode), grid=new Uint8Array(W*H),base=new Uint8Array(W*H),objects=entities(m);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(basic(mode,x,y))grid[y*W+x]=base[y*W+x]=1;
 for(const o of objects){const [w,h]=box(o);if(!Number.isInteger(o.x)||!Number.isInteger(o.y)||o.x<0||o.y<0||o.x+w>W||o.y+h>H)return null;
 for(let y=o.y;y<o.y+h;y++)for(let x=o.x;x<o.x+w;x++){const i=y*W+x;if(grid[i])return null;grid[i]=2}}
 for(const o of objects){
 const [w,h]=box(o), side=o.village?[[o.x-1,o.y+Math.floor(h/2)],[o.x+w,o.y+Math.floor(h/2)]]:[[o.x+Math.floor(w/2),o.y+h],[o.x+Math.floor(w/2),o.y-1],[o.x-1,o.y+Math.floor(h/2)],[o.x+w,o.y+Math.floor(h/2)]];
 const seen=new Int32Array(W*H).fill(-2),q=[];
 for(const [x,y] of side){if(x<0||y<0||x>=W||y>=H)continue;let z=y*W+x;if(grid[z]!==2){q.push(z);seen[z]=-1}}
 let end=-1;
 for(let i=0;i<q.length;i++){const p=q[i];if(grid[p]===1){end=p;break}const x=p%W,y=Math.floor(p/W);
 for(const [a,b] of [[x,y+1],[x-1,y],[x+1,y],[x,y-1]]){if(a<0||b<0||a>=W||b>=H)continue;const z=b*W+a;if(seen[z]===-2&&grid[z]!==2){q.push(z);seen[z]=p}}}
 if(end===-1)return null;for(let z=end;z!==-1;z=seen[z])grid[z]=1;
 }return {grid,base,W,H};
}
function dropValid(mode,map,obj){
 const rest=structuredClone(map);rest.items=rest.items.filter(o=>o.key!==obj.key);if(rest.villages)rest.villages=rest.villages.filter(o=>o.key!==obj.key);
 const r=routeMap(mode,rest);if(!r)return false;const [w,h]=box(obj);
 for(let y=obj.y;y<obj.y+h;y++)for(let x=obj.x;x<obj.x+w;x++)if(x<0||y<0||x>=r.W||y>=r.H||r.grid[y*r.W+x])return false;
 (obj.village?rest.villages:rest.items).push(obj);return !!routeMap(mode,rest);
}
const slots=[[1,1],[61,1],[1,39],[61,39]];
function addVillage(city,num,village){
 const old=city.villages.find(v=>v.num===num);if(old){old.village=structuredClone(village);return true}
 const obj={key:'village_'+num,num,village:structuredClone(village),x:0,y:0};
 for(const [x,y] of slots){Object.assign(obj,{x,y});if(dropValid('city',city,obj)){city.villages.push(obj);return true}}
 for(let y=0;y<41;y++)for(let x=0;x<=62;x++){Object.assign(obj,{x,y});if(dropValid('city',city,obj)){city.villages.push(obj);return true}}return false;
}
const used=m=>m.items.filter(o=>!/^home[123]$/.test(o.key)).length;

