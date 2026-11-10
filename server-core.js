const fail=(code,message)=>{throw Object.assign(new Error(message),{status:code})};
const random=(n=18)=>[...crypto.getRandomValues(new Uint8Array(n))].map(x=>x.toString(16).padStart(2,'0')).join('');
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const utf=new TextEncoder();
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',utf.encode(value)));
async function passHash(pass,salt){const k=await crypto.subtle.importKey('raw',utf.encode(pass),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:utf.encode(salt),iterations:100000,hash:'SHA-256'},k,256))}
const clean=(s,n=40)=>typeof s==='string'?s.trim().slice(0,n):'';
const good=(ok,msg)=>{if(!ok)fail(400,msg)};
function validateSettings(s){
 good(s&&[s.vlimit,s.climit].every(v=>Number.isInteger(v)&&v>=0&&v<=60),'수량은 0~60 사이로 정해 주세요.');
 good(Array.isArray(s.groups)&&s.groups.length>=1&&s.groups.length<=16,'모둠 수를 확인해 주세요.');
 const seen=new Set();for(const g of s.groups){good(Array.isArray(g.nums)&&g.nums.length>=1&&g.nums.length<=4&&g.nums.includes(g.rep),'모둠별 1~4명과 대표 한 명을 정해 주세요.');
 for(const n of g.nums){good(Number.isInteger(n)&&n>0&&n<=99&&!seen.has(n),'출석번호가 중복되었거나 범위를 벗어났습니다.');seen.add(n)}}
 return {vlimit:s.vlimit,climit:s.climit,assessment:!!s.assessment,groups:s.groups.map(g=>({nums:g.nums,rep:g.rep}))};
}
function checkMap(mode,m,limit,previous){
 good(m&&Array.isArray(m.items)&&m.items.length<=Math.max(limit+3,previous?.items?.length||0),'지도 수량을 확인해 주세요.');
 const keys=new Set();for(const o of m.items){good(o&&typeof o.key==='string'&&o.key.length<=65&&!keys.has(o.key)&&Number.isInteger(o.id)&&o.id>=0&&o.id<labels(mode).length,'지도 아이템을 확인해 주세요.');keys.add(o.key);
 good(mode==='city'?/^c_[a-z0-9-]+$/.test(o.key):/^v_[a-z0-9-]+$/.test(o.key)||(/^home[123]$/.test(o.key)&&o.id===0),'아이템 종류가 올바르지 않습니다.')}
 if(mode==='village'){good(!m.villages&&['home1','home2','home3'].every(k=>keys.has(k)),'기본 단독주택 3채가 필요합니다.')}
 good(used(m)<=Math.max(limit,previous?used(previous):0),'사용 한도를 초과했습니다.');
 good(routeMap(mode,m),'건물이나 길이 겹치거나 연결길을 만들 수 없습니다.');
 m.name=clean(m.name);good(m.name,'지도 이름을 붙여 주세요.');return m;
}
function visible(room,role,num){
 const s=room.settings,group=s.groups.findIndex(g=>g.nums.includes(num)),student=role==='student';
 const common={title:room.title,settings:student?{vlimit:s.vlimit,climit:s.climit,assessment:s.assessment,groups:s.groups.map((g,i)=>i===group?g:{})}:s,group,num,role};
 if(student)return {...common,village:room.villages[num]||null,city:room.cities[group]||null,sent:room.sent[num]||null,answer:room.answers[num]||null};
 return {...common,villages:room.villages,cities:room.cities,copies:room.copies,answers:room.answers,claimed:Object.keys(room.students)};
}
async function api(req,env){
 const url=new URL(req.url),action=url.pathname.slice(5),db=env.DB;
 good(req.method==='POST','지원하지 않는 요청입니다.');const raw=await req.text();good(raw.length<700000,'요청이 너무 큽니다.');
 const b=JSON.parse(raw||'{}'),code=clean(b.code,64),token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(action==='create'){
  const settings=validateSettings(b.settings);good(typeof b.password==='string'&&b.password.length>=6&&b.password.length<=128,'비밀번호는 6~128자로 정해 주세요.');
  const code=random(7),teacherKey=random(18),salt=random(),t=random(24);
  const r={title:clean(b.title)||'우리 마을에서 도시로',settings,teacherKey:await digest(teacherKey),salt,pw:await passHash(b.password,salt),teacherTokens:[await digest(t)],students:{},villages:{},cities:{},copies:{},answers:{},sent:{}};
  await db.prepare('INSERT INTO rooms (code,version,body) VALUES (?,0,?)').bind(code,JSON.stringify(r)).run();return {code,teacherKey,token:t};
 }
 const th=token?await digest(token):'';
 for(let attempt=0;attempt<45;attempt++){
  const row=await db.prepare('SELECT version,body FROM rooms WHERE code=?').bind(code).first();if(!row)fail(404,'수업을 찾을 수 없습니다. QR 주소를 확인해 주세요.');
  const r=JSON.parse(row.body);let result={},role='',n=0;
  if(action==='roster')return {title:r.title,groups:r.settings.groups.map(g=>g.nums),claimed:Object.keys(r.students)};
  if(action==='login'){
   if(await digest(clean(b.teacherKey,90))!==r.teacherKey)fail(403,'교사용 전용 링크를 확인해 주세요.');
   if((r.blockedUntil||0)>Date.now())fail(429,'잠시 후 다시 시도해 주세요.');
   if(typeof b.password!=='string'||b.password.length>128||await passHash(b.password,r.salt)!==r.pw){r.attempts=(r.attempts||0)+1;if(r.attempts>=7){r.blockedUntil=Date.now()+60000;r.attempts=0}result={loginFailed:true}}
   else{r.attempts=0;const t=random(24);r.teacherTokens=[...r.teacherTokens.slice(-9),await digest(t)];result={token:t}}
  }else if(action==='join'){
   n=b.num;good(r.settings.groups.some(g=>g.nums.includes(n)),'배정된 출석번호를 골라 주세요.');
   if(r.students[n])fail(409,'이미 사용 중인 번호입니다. 기기를 바꿀 때는 선생님께 번호 연결 해제를 요청하세요.');
   const t=random(24);r.students[n]=await digest(t);result={token:t};
  }else{
   if(th&&r.teacherTokens.includes(th))role='teacher';
   else if(th){n=Number(Object.keys(r.students).find(k=>r.students[k]===th));if(n)role='student'}
   if(!role)fail(401,'다시 입장해 주세요.');
   const group=r.settings.groups.findIndex(g=>g.nums.includes(n)), allow=ok=>{if(!ok)fail(403,'이 작업을 할 권한이 없습니다.')};
   if(action==='state')return visible(r,role,n);
   if(action==='settings'){allow(role==='teacher');const s=validateSettings(b.settings);good(JSON.stringify(s.groups.map(g=>g.nums))===JSON.stringify(r.settings.groups.map(g=>g.nums)),'개설 후에는 대표 학생만 변경할 수 있습니다.');r.settings=s}
   else if(action==='release'){allow(role==='teacher');delete r.students[b.num]}
   else if(action==='village'||action==='send'){
    allow(role==='student');const old=r.villages[n];if((old?.rev||0)!==b.rev)fail(409,'새로 저장된 지도가 있습니다. 보관함에서 다시 열어 주세요.');
    const m=checkMap('village',b.map,r.settings.vlimit,old?.map);r.villages[n]={map:m,rev:(old?.rev||0)+1};result={rev:r.villages[n].rev};
    if(action==='send'){const prev=r.cities[group],city=prev?.map||{...newCity(),name:(group+1)+'모둠 도시'};good(addVillage(city,n,m),'도시 외곽에 마을을 놓을 공간을 확보해 주세요.');r.cities[group]={map:city,rev:(prev?.rev||0)+1};r.sent[n]=r.villages[n].rev}
   }else if(action==='city'){
    allow(role==='student'&&r.settings.groups[group]?.rep===n);const old=r.cities[group];
    if((old?.rev||0)!==b.rev)fail(409,'도시가 갱신되었습니다. 최신 마을을 불러온 뒤 다시 저장해 주세요.');
    const m=b.map;good(Array.isArray(m?.villages),'마을 목록을 확인해 주세요.');const base=old?.map?.villages||[];
    good(m.villages.length===base.length&&new Set(m.villages.map(v=>v.key)).size===base.length,'전송된 마을 구성을 확인해 주세요.');
    m.villages=m.villages.map(v=>{const a=base.find(z=>z.key===v.key);good(a,'알 수 없는 마을입니다.');return {...a,x:v.x,y:v.y}});
    checkMap('city',m,r.settings.climit,old?.map);r.cities[group]={map:m,rev:(old?.rev||0)+1};result={rev:r.cities[group].rev};
   }else if(action==='copy'){
    allow(role==='teacher');const g=b.group;good(Number.isInteger(g)&&r.cities[g],'도시를 먼저 저장해 주세요.');const old=r.copies[g], rev=old?.rev||0;
    if((b.rev??0)!==rev)fail(409,'발표본이 다른 화면에서 수정되었습니다. 보관함에서 최신 발표본을 다시 열어 주세요.');
    const m=checkMap('city',b.map,r.settings.climit,old?.map||r.cities[g].map);
    good(Array.isArray(b.ink)&&b.ink.length<=500&&b.ink.every(s=>['pen','mark'].includes(s.tool)&&Array.isArray(s.pts)&&s.pts.length<=4000&&s.pts.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))),'필기 내용을 확인해 주세요.');
    r.copies[g]={map:m,ink:b.ink,when:Date.now(),rev:rev+1};result={rev:rev+1};
   }else if(action==='answer'){allow(role==='student'&&r.settings.assessment);good(Array.isArray(b.answers)&&b.answers.length===4,'응답을 확인해 주세요.');r.answers[n]=b.answers.map(x=>clean(x,450));}
   else fail(404,'지원하지 않는 기능입니다.');
  }
  const update=await db.prepare('UPDATE rooms SET version=version+1,body=? WHERE code=? AND version=?').bind(JSON.stringify(r),code,row.version).run();
  if(update.meta.changes){if(result.loginFailed)fail(403,'비밀번호를 확인해 주세요.');return result}
  await new Promise(resolve=>setTimeout(resolve,10+Math.random()*50));
 }fail(409,'다른 기기가 저장 중입니다. 다시 눌러 주세요.');
}

