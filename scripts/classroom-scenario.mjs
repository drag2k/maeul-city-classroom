import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const root=new URL('../',import.meta.url);
const code=readFileSync(new URL('board.js',root),'utf8');
const board=vm.runInNewContext(code+';({newVillage,newCity,addVillage,dropValid,routeMap,used,labels,item})',{structuredClone});
const settings={vlimit:2,climit:15,assessment:true,groups:[{nums:[1,2,3,4],rep:1},{nums:[5],rep:5}]};

export async function checkClassroom(callApi){
const api=callApi;
const password=randomUUID();
const created=await api('create',{title:'검증 수업',password:password,settings});
const field={code:created.code};const call=(act,b={},token='',expected=200)=>api(act,{...field,...b},token,expected);
await call('login',{teacherKey:created.teacherKey,password:'wrong'},'',403);
const teacher=(await call('login',{teacherKey:created.teacherKey,password:password})).token;
const students=await Promise.all([1,2,3,4].map(num=>call('join',{num}).then(b=>b.token)));
await call('join',{num:1},'',409);await call('state',{},'',401);await call('settings',{settings},students[0],403);
const vs=students.map((_,i)=>({...board.newVillage(),name:'마을 '+(i+1)}));
assert.equal(board.used(vs[0]),0);assert.equal(board.labels('village').length,26);assert.equal(board.labels('city').length,26);
vs[0].items.push(board.item(4,1,1,'v_one'),board.item(4,8,1,'v_two'));
await call('village',{map:vs[0],rev:0},students[0]);
const over=structuredClone(vs[0]);over.items.push(board.item(4,20,10,'v_three'));await call('village',{map:over,rev:1},students[0],400);
let first=await call('state',{},teacher);assert.equal(Object.keys(first.cities).length,0);
await Promise.all(students.map((t,i)=>call('send',{map:vs[i],rev:i===0?1:0},t)));
let city=(await call('state',{},students[0])).city;assert.equal(city.map.villages.length,4);assert.equal(board.used(city.map),0);
await call('city',{map:city.map,rev:city.rev},students[1],403);
const firstVillage=city.map.villages.find(v=>v.num===1);let target={...firstVillage,x:22,y:1};assert.ok(board.dropValid('city',city.map,target));Object.assign(firstVillage,{x:22,y:1});
for(let y=2;y<52&&city.map.items.length<15;y+=5)for(let x=20;x<61&&city.map.items.length<15;x+=5){const o=board.item(4,x,y,'c_'+city.map.items.length);if(board.dropValid('city',city.map,o))city.map.items.push(o)}
assert.equal(city.map.items.length,15);assert.ok(!board.dropValid('city',city.map,board.item(0,42,26,'c_road')));
await call('city',{map:city.map,rev:city.rev},students[0]);
vs[0].name='새 햇살마을';await call('village',{map:vs[0],rev:2},students[0]);
assert.equal((await call('state',{},students[0])).city.map.villages.find(v=>v.num===1).village.name,'마을 1');
await call('send',{map:vs[0],rev:3},students[0]);
city=(await call('state',{},students[0])).city;
let v=city.map.villages.find(v=>v.num===1);assert.equal(v.x,22);assert.equal(v.village.name,'새 햇살마을');assert.equal(city.map.villages.length,4);
const secondToken=(await call('join',{num:5})).token;
assert.equal((await call('state',{},secondToken)).city,null);
await call('send',{map:{...board.newVillage(),name:'두번째 모둠 마을'},rev:0},secondToken);
const separate=(await call('state',{},secondToken)).city;
assert.deepEqual(separate.map.villages.map(v=>v.num),[5]);
assert.equal((await call('state',{},teacher)).cities[0].map.villages.length,4);
const merge=vm.runInNewContext(readFileSync(new URL('sync.js',root),'utf8')+';mergeIncomingVillages',{structuredClone,addVillage:board.addVillage,routeMap:board.routeMap});
const remoteEdit=structuredClone(city.map);remoteEdit.items.pop();assert.equal(merge(city.map,city.map,remoteEdit),null);
const incoming=structuredClone(city.map);incoming.villages[0].village.name='다시 보낸 마을';
assert.equal(merge(city.map,city.map,incoming).villages[0].village.name,'다시 보낸 마을');
const copy=structuredClone(city.map);copy.name='발표본';copy.items.pop();
await call('copy',{group:0,map:copy,ink:[{tool:'pen',pts:[[3,4],[5,6]]}]},teacher);
await call('copy',{group:0,map:copy,ink:[],rev:0},teacher,409);
await call('answer',{answers:['시장','터미널','여러 사람이 모인다','여러 사람이 모여 살고 일하는 곳']},students[2]);
const result=await call('state',{},teacher);assert.equal(result.cities[0].map.items.length,15);assert.equal(result.copies[0].map.items.length,14);assert.equal(result.copies[0].ink.length,1);assert.equal(result.answers[3].length,4);
await call('review',{num:3,rev:1},teacher);
assert.equal((await call('state',{},teacher)).answerMeta[3].reviewed,true);
await call('settings',{settings:{...settings,assessment:false,groups:[{nums:[1,2,3,4],rep:3},{nums:[5],rep:5}]}},teacher);
await call('answer',{answers:['a','b','c','d']},students[2],403);await call('city',{map:city.map,rev:city.rev},students[0],403);
await call('release',{num:1},teacher);await call('state',{},students[0],401);
const newDevice=(await call('join',{num:1})).token;assert.equal((await call('state',{},newDevice)).village.map.name,vs[0].name);
console.log('PASS | 52 artworks, limits, duplicates, 4 simultaneous students, 15 city buildings, road restrictions, server login, transfer, moved village resubmission, original and annotated copy, assessment switch, representative and device changes');

const expanded=structuredClone(copy);
for(let y=0;y<=50 && expanded.items.length<51;y+=4)for(let x=0;x<=76 && expanded.items.length<51;x+=4){
 const o=board.item(4,x,y,'c_extra'+expanded.items.length);
 if(board.dropValid('city',expanded,o))expanded.items.push(o);
}
assert.equal(expanded.items.length,51);
await call('copy',{group:0,map:expanded,unlocked:true,ink:[],rev:1},teacher,400);
expanded.items.pop();
await call('copy',{group:0,map:expanded,ink:[],rev:1},teacher,400);
await call('copy',{group:0,map:expanded,unlocked:true,ink:[],rev:1},students[2],403);
await call('copy',{group:0,map:expanded,unlocked:true,ink:[],rev:1},teacher);
const saved=(await call('state',{},teacher));
assert.equal(saved.copies[0].map.items.length,50);assert.equal(saved.copies[0].unlocked,true);assert.equal(saved.cities[0].map.items.length,15);
for(const x of [1,61]){
 const map=board.newCity();board.addVillage(map,1,vs[0]);map.villages[0].x=x;
 const road=board.routeMap('city',map);
 assert.equal(road.grid[7*road.W+(x===1?19:60)],1);
 assert.equal(road.grid[7*road.W+(x===1?0:79)],0);
}
console.log('PASS | inward entrances, teacher-only 50-item copy, 51 refused, original preserved');

}
