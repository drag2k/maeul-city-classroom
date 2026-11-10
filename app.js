'use strict';
const $=s=>document.querySelector(s),app=$('#app'),dialog=$('#dialog'),dbody=$('#dialogBody');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=k=>{try{return JSON.parse(localStorage.getItem('mm:'+k))}catch{return null}},put=(k,v)=>{try{localStorage.setItem('mm:'+k,JSON.stringify(v))}catch{}};
const bind=(id,fn)=>{const e=document.getElementById(id);if(e)e.onclick=async ev=>{try{await fn(ev)}catch(err){toast(err.message)}}};
let ctx=null,state=null,ed=null,screen='home',timer=0,to=0,tab='cities',dirty=false,homeArtObserver=null;
const idkey=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const studentURL=code=>location.origin+location.pathname+'?class='+encodeURIComponent(code);
const teacherURL=(code,key)=>studentURL(code)+'#teacher='+key;
function toast(msg){const t=$('#toast');t.textContent=msg;t.className='show';clearTimeout(to);to=setTimeout(()=>t.className='',4200)}
function modal(body){dbody.innerHTML=body;if(!dialog.open)dialog.showModal();bind('cancel',()=>dialog.close())}
const cancel='<button id="cancel" type="button">닫기</button>';
function cleanup(page){screen=page;clearInterval(timer);ed=null;dirty=false;homeArtObserver?.disconnect();homeArtObserver=null;$('#goHome').classList.toggle('active',page==='home');$('#goDemo').classList.toggle('active',page==='demo')}
function confirmLeave(fn){if(!dirty)return fn();modal('<h2>작성 중인 지도를 닫을까요?</h2><p>저장 전 변경 사항은 이 기기에 임시 보관됩니다.</p><div class="formActions">'+cancel+'<button id="leave" class="primary">나가기</button></div>');bind('leave',()=>{dialog.close();fn()})}
async function request(action,payload={},session=ctx){const r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json',...(session?.token?{Authorization:'Bearer '+session.token}:{})},body:JSON.stringify({code:session?.code,...payload})});const b=await r.json();if(!r.ok)throw Object.assign(new Error(b.error||'연결 상태를 확인해 주세요.'),{status:r.status});return b}
async function refresh(){state=await request('state');return state}
function thumb(c,mode,id){c.width=c.height=140;c.getContext('2d').drawImage(art(mode,id),0,0,140,140)}
function allArt(root=app){root.querySelectorAll('canvas[data-icon]').forEach(c=>thumb(c,c.dataset.kind||'village',Number(c.dataset.icon)))}
const icon=(i,k='village')=>'<canvas aria-hidden="true" data-icon="'+i+'" data-kind="'+k+'"></canvas>';
function landscape(c){
 const w=810,h=460,dpr=Math.min(2,devicePixelRatio||1);c.width=w*dpr;c.height=h*dpr;const p=c.getContext('2d');p.scale(dpr,dpr);
 p.fillStyle='#e6eed8';p.fillRect(0,0,w,h);
 const path=(pts,col,lw=0)=>{p.beginPath();pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));if(lw){p.strokeStyle=col;p.lineWidth=lw;p.lineJoin='round';p.stroke()}else{p.closePath();p.fillStyle=col;p.fill()}};
 path([[-28,285],[360,50],[820,133],[871,373],[438,502],[47,400]],'#c0d59d');
 path([[-20,355],[349,115],[827,187],[831,402],[398,488]],'#b4cd94');
 const river=[[-24,429],[131,346],[266,325],[391,336],[483,307],[607,252],[814,240]];path(river,'#e0e4ba',51);path(river,'#96c9bc',40);path(river,'#b0d7c8',22);
 const road=pts=>{path(pts,'#d1c9a9',25);path(pts,'#8f9e91',19);p.setLineDash([9,11]);path(pts,'#e5dfbd',1.7);p.setLineDash([])};
 road([[69,323],[286,217],[432,151],[614,95]]);road([[160,140],[332,212],[483,270],[682,352],[840,420]]);road([[255,427],[486,320],[640,243],[810,172]]);
 for(let i=0;i<80;i++){const x=40+seeded(i,3)*751,y=120+seeded(i,9)*265;if((i%4===0||x>700)&&y<420)tree(p,x,y,.7+seeded(i,8)*.45)}
 const homes=[['village',1,235,142,52],['village',0,283,131,52],['village',4,334,149,52],['village',2,388,128,67],['city',19,488,118,83],['city',7,575,115,105],['city',10,664,148,83],['village',8,162,196,52],['village',11,217,186,51],['village',0,270,176,54],['city',15,444,197,109],['city',16,562,199,95],['city',5,665,209,86],['village',3,95,253,59],['village',16,160,242,60],['city',4,291,263,95],['city',22,412,267,95],['city',0,555,271,69],['city',13,707,279,74],['village',21,182,301,57],['city',24,340,319,86],['village',0,482,374,62],['village',4,554,365,67],['city',17,670,363,112],['village',12,402,404,60],['village',1,612,418,80]];
 for(const [k,i,x,y,s] of homes)p.drawImage(art(k,i),x-s/2,y-s*.85,s,s);
 const gradient=p.createLinearGradient(0,0,145,0);gradient.addColorStop(0,'#e6eed8');gradient.addColorStop(1,'#e6eed800');p.fillStyle=gradient;p.fillRect(0,0,148,h)
}
function home(){cleanup('home');const last=get('teacher'),student=get('student');app.innerHTML='<div class="wrap"><section class="hero"><div class="heroCopy"><div class="eyebrow"><i class="dot"></i> 초등 사회 4-2 · 도시의 모습</div><h1>우리 마을에서<br>도시로</h1><p>내가 걸어 본 동네를 그리고,<br>친구들의 마을을 모아 우리 도시를 만나요.</p><button class="primary" id="try">지도 체험하기　↗</button></div><canvas id="scene" class="heroCanvas" aria-label="작은 집과 시장, 운동장이 길을 따라 모인 도시 일러스트"></canvas></section><div class="sectionTitle"><h2><button id="startLesson" class="startLesson">수업 시작하기 <span aria-hidden="true">→</span></button></h2><a class="helpLink setupHelp" href="/guide.html#setup" target="_blank" rel="noopener">도움말</a></div><div class="entrygrid"><button class="entry" id="teacher"><span class="pict">'+icon(10,'city')+'</span><span><strong>교사 작업실</strong><small>수업 개설 · 모둠 편성 · 지도 보관함</small></span><span class="arrow">↗</span></button><button class="entry" id="student"><span class="pict">'+icon(17)+'</span><span><strong>학생 입장</strong><small>학급 QR 또는 수업 코드로 입장해요</small></span><span class="arrow">↗</span></button></div><div class="sectionTitle"><h2>지도 위의 장소들</h2><small>마을 25종 · 도시 26종</small></div><div class="shelf">'+[[0,'village'],[4,'village'],[17,'village'],[4,'city'],[2,'city'],[15,'city'],[22,'city'],[24,'city']].map(([i,k])=>'<div class="specimen">'+icon(i,k)+labels(k)[i]+'</div>').join('')+'</div></div>';
 allArt();landscape($('#scene'));bind('startLesson',()=>settingsForm(true));bind('try',demo);bind('teacher',()=>teacherMenu(last));bind('student',()=>studentMenu(student))}
function teacherMenu(last){modal('<h2>교사 작업실</h2><div class="form">'+(last?'<button id="last" class="primary">최근 수업 열기</button>':'')+'<button id="new" class="'+(last?'':'primary')+'">새 수업 만들기</button><p class="hint">다른 기기에서는 수업 개설 시 받은 교사 전용 링크로 입장하세요.</p><div class="formActions">'+cancel+'</div></div>');bind('new',()=>settingsForm(true));bind('last',()=>{dialog.close();location.assign(teacherURL(last.code,last.key));if(location.hash.includes(last.key))start()})}
function studentMenu(last){modal('<h2>학생 입장</h2><form class="form" id="codeForm"><label>수업 코드<input id="code" required autocomplete="off" placeholder="선생님이 알려 준 코드"></label><div class="formActions">'+cancel+'<button class="primary">출석번호 고르기</button></div></form>'+(last?'<button class="link" id="recentStudent">최근 수업 이어하기</button>':''));$('#codeForm').onsubmit=e=>{e.preventDefault();location.href=studentURL($('#code').value.trim())};bind('recentStudent',()=>location.assign(studentURL(last.code)))}
const defaults=()=>({vlimit:10,climit:10,assessment:true,groups:Array.from({length:6},(_,i)=>({nums:[1,2,3,4].map(n=>i*4+n),rep:i*4+1}))});
function settingsForm(fresh=false){
 const s=fresh?defaults():structuredClone(state.settings);
 modal('<h2>'+ (fresh?'새 수업 만들기':'수업 환경설정')+'</h2><form id="setup" class="form">'+(fresh?'<label>수업 이름<input id="title" value="우리 마을에서 도시로" maxlength="40" required></label><label>교사 비밀번호<input id="pw" type="password" required minlength="6" maxlength="128" autocomplete="new-password" placeholder="6자 이상"></label>':'')+'<div class="formgrid"><label>개인 마을 추가 한도<input type="number" min="0" max="60" id="vl" value="'+s.vlimit+'" required></label><label>모둠 도시 추가 한도<input type="number" min="0" max="60" id="cl" value="'+s.climit+'" required></label></div><label class="check"><input type="checkbox" id="assessment" '+(s.assessment?'checked':'')+'> 개인 활동 ‘도시의 의미’ 사용</label><div class="divider"></div><h3>모둠 편성</h3><p class="hint">모둠별 출석번호를 쉼표로 구분하고 대표 번호를 지정하세요. 한 모둠에 1~4명까지 참여합니다.</p><div class="gRow hint"><span>모둠</span><span>출석번호</span><span>대표 번호</span></div><div id="groups" class="form"></div>'+(fresh?'<div class="row"><button type="button" id="addGroup">모둠 추가</button><button type="button" id="popGroup">마지막 모둠 삭제</button></div>':'')+'<p id="formErr" class="error"></p><div class="formActions">'+cancel+'<button class="primary">'+(fresh?'수업 개설':'설정 저장')+'</button></div></form>');
 const row=g=>{const d=document.createElement('div');d.className='gRow';d.innerHTML='<b>'+($('#groups').children.length+1)+'모둠</b><input aria-label="출석번호" class="nums" '+(fresh?'':'readonly')+' value="'+g.nums.join(', ')+'"><input aria-label="대표 번호" class="rep" type="number" min="1" max="99" value="'+g.rep+'">';$('#groups').append(d)};
 s.groups.forEach(row);bind('addGroup',()=>{if($('#groups').children.length<16)row({nums:[],rep:''})});bind('popGroup',()=>{if($('#groups').children.length>1)$('#groups').lastElementChild.remove()});
 $('#setup').onsubmit=async e=>{e.preventDefault();const b=e.submitter||$('#setup button.primary');b.disabled=true;try{
 const settings=readSetup();
 if(fresh){const res=await request('create',{title:$('#title').value,password:$('#pw').value,settings},null);put('t:'+res.code,res.token);put('teacher',{code:res.code,key:res.teacherKey});dialog.close();history.pushState(null,'',teacherURL(res.code,res.teacherKey));await start();shareClass()}
 else{await request('settings',{settings});await refresh();dialog.close();dashboard()}
 }catch(err){$('#formErr').textContent=err.message}finally{b.disabled=false}}
 if(fresh)setupWizard();
}
function shareClass(){const lp=get('teacher'),key=new URLSearchParams(location.hash.slice(1)).get('teacher')||lp?.key;modal('<h2>수업 입장 안내</h2><div class="tabs"><button id="showQR" class="active">학생용 QR</button><button id="showKey">교사용 링크</button></div><div id="shared" class="form" style="margin-top:16px"></div><div class="formActions">'+cancel+'</div>');function show(teacher){$('#showQR').classList.toggle('active',!teacher);$('#showKey').classList.toggle('active',teacher);$('#shared').innerHTML=teacher?'<label>다른 컴퓨터에서 열 교사 전용 링크<input readonly class="linkbox" id="shareUrl"></label><p class="hint">이 링크와 개설할 때 정한 비밀번호가 필요합니다.</p>':'<canvas class="qrimg" id="qr"></canvas><p style="text-align:center">수업 코드　<strong>'+esc(ctx.code)+'</strong></p><label>학생 입장 링크<input readonly class="linkbox" id="shareUrl"></label>';const link=teacher?teacherURL(ctx.code,key):studentURL(ctx.code);$('#shareUrl').value=link;if(!teacher)drawQR($('#qr'),link);const b=document.createElement('button');b.textContent='링크 복사';b.onclick=async()=>{try{await navigator.clipboard.writeText(link);toast('링크를 복사했습니다.')}catch{$('#shareUrl').select();toast('선택된 링크를 복사해 주세요.')}};$('#shared').append(b)}show(false);bind('showQR',()=>show(false));bind('showKey',()=>show(true))}
async function start(){
 const code=new URLSearchParams(location.search).get('class'),key=new URLSearchParams(location.hash.slice(1)).get('teacher');
 if(!code){ctx=null;state=null;home();return}if(dialog.open)dialog.close();const role=key?'teacher':'student';ctx={code,token:get((key?'t:':'s:')+code),role,key};
 if(ctx.token){try{await refresh();return key?dashboard():studentDesk()}catch(e){if(e.status!==401){home();toast(e.message);return}}}
 cleanup('entry');app.innerHTML='<div class="wrap"><section class="panel" style="max-width:640px;margin:5vh auto"><h2>'+(key?'교사 작업실 열기':'우리 반 수업 입장')+'</h2><div id="entryBody" class="form"></div></section></div>';
 if(key){$('#entryBody').innerHTML='<label>교사 비밀번호<input type="password" id="loginpw" autocomplete="current-password"></label><button class="primary" id="login">보관함 열기</button>';bind('login',async()=>{const r=await request('login',{teacherKey:key,password:$('#loginpw').value});ctx.token=r.token;put('t:'+code,r.token);put('teacher',{code,key});await refresh();dashboard()});$('#loginpw').onkeydown=e=>{if(e.key==='Enter')$('#login').click()}}
 else{try{const ro=await request('roster');$('#entryBody').innerHTML='<p>'+esc(ro.title)+' · 본인 출석번호를 선택하세요.</p>'+ro.groups.map((ns,i)=>'<div><h3 style="margin:12px 0 6px">'+(i+1)+'모둠</h3><div class="numbergrid">'+ns.map(n=>'<button data-num="'+n+'" '+(ro.claimed.includes(String(n))?'disabled':'')+'>'+n+'번</button>').join('')+'</div></div>').join('');$('#entryBody').querySelectorAll('[data-num]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const r=await request('join',{num:Number(b.dataset.num)});ctx.token=r.token;put('s:'+code,r.token);put('student',{code});await refresh();studentDesk()}catch(e){toast(e.message);b.disabled=false}})}catch(e){$('#entryBody').textContent=e.message}}
}


function startPoll(view){const page=screen;timer=setInterval(async()=>{if(document.hidden||dialog.open||screen!==page)return;try{const s=await request('state');if(screen===page&&!dialog.open&&JSON.stringify(s)!==JSON.stringify(state)){state=s;view()}}catch{}},4500)}
const card=(key,title,sub)=>'<button class="mapcard" data-card="'+key+'"><canvas></canvas><span>'+esc(title)+'<small>'+esc(sub)+'</small></span></button>';
function dashboard(){cleanup('teacher');const tabs=[['cities','모둠 도시'],['villages','개인 마을'],['copies','발표본'],...(state.settings.assessment?[['answers','개인 응답']]:[])];if(!tabs.some(t=>t[0]===tab))tab='cities';
 app.innerHTML='<div class="wrap"><div class="dashHead"><div><small class="eyebrow">교사 작업실</small><h1>'+esc(state.title)+'</h1><p>'+state.settings.groups.length+'개 모둠 · '+state.settings.groups.flatMap(g=>g.nums).length+'명</p></div><div class="btns"><button id="settings">환경설정</button><button id="release">기기 연결 관리</button><button id="share" class="primary">수업 입장 QR</button></div></div><div class="sectionTitle"><h2>지도 보관함</h2><small class="clientStatus">자동 새로고침</small></div><div class="tabs">'+tabs.map(([id,t])=>'<button data-tab="'+id+'" class="'+(id===tab?'active':'')+'">'+t+'</button>').join('')+'</div><div id="cards" style="margin-top:15px"></div></div>';
 bind('share',shareClass);bind('settings',()=>settingsForm(false));bind('release',()=>{modal('<h2>기기 연결 관리</h2><p class="hint">기기를 바꿀 학생의 번호를 선택하세요. 저장한 지도는 보관되며 새 기기에서 다시 입장할 수 있습니다.</p><div class="numbergrid" style="margin:15px 0">'+state.claimed.map(n=>'<button data-release="'+esc(n)+'">'+esc(n)+'번 연결 해제</button>').join('')+'</div>'+cancel);dbody.querySelectorAll('[data-release]').forEach(b=>b.onclick=async()=>{try{await request('release',{num:Number(b.dataset.release)});await refresh();dialog.close();dashboard();toast('새 기기에서 입장할 수 있습니다.')}catch(e){toast(e.message)}})});
 app.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;dashboard()});const entries=Object.entries(state[tab]||{});
 if(!entries.length)$('#cards').innerHTML='<div class="empty">'+({cities:'학생이 자기 마을을 보내면 모둠 도시가 여기에 나타납니다.',villages:'학생이 이름을 붙여 저장한 마을이 여기에 나타납니다.',copies:'발표 화면에서 ‘발표본 저장’을 누르면 여기에 보관됩니다.',answers:'학생이 제출한 개인 응답이 여기에 나타납니다.'}[tab])+'</div>';
 else if(tab==='answers')$('#cards').innerHTML='<section class="answers">'+entries.map(([n,ans])=>'<article><b>'+esc(n)+'번</b>'+ans.map((a,i)=>'<p>'+['첫 번째 장면','두 번째 장면','공통점','도시의 뜻'][i]+' · '+esc(a)+'</p>').join('')+'</article>').join('')+'</section>';
 else{const village=tab==='villages';$('#cards').className='gallery';$('#cards').innerHTML=entries.map(([k,v])=>card(k,v.map.name,village?(1+state.settings.groups.findIndex(g=>g.nums.includes(Number(k))))+'모둠 · '+k+'번':(Number(k)+1)+'모둠 · '+(tab==='copies'?'발표본':'도시 원본'))).join('');
 for(const b of $('#cards').children){const k=b.dataset.card,v=state[tab][k];paintBoard(b.querySelector('canvas'),village?'village':'city',v.map,{width:430,ink:v.ink});b.onclick=()=>openEditor({mode:village?'village':'city',map:v.map,group:Number(k),ink:v.ink,kind:village?'preview':'presentation',rev:village?v.rev||0:state.copies[k]?.rev||0})}}
 lessonProgress();startPoll(dashboard)
}
function studentDesk(){cleanup('student');const s=state,rep=s.settings.groups[s.group]?.rep===s.num;
 app.innerHTML='<div class="wrap"><div class="dashHead"><div><small class="eyebrow">'+(s.group+1)+'모둠 · '+s.num+'번'+(rep?' · 모둠 대표':'')+'</small><h1>'+esc(s.title)+'</h1></div></div><div class="gallery" id="studentCards">'+card('v',s.village?.map.name||'내 마을 만들기',s.village?'개인 지도 이어서 편집':'걸어서 가 본 장소를 놓아 보세요')+card('c',s.city?.map.name||'우리 모둠 도시',rep?'대표 기기 · 모둠 도시 편집':'모둠 도시 구경')+'</div>'+(s.settings.assessment?'<div class="sectionTitle"><h2>도시의 의미</h2></div><button id="answer" class="primary">'+(s.answer?'내 응답 다시 열기':'개인 응답 작성')+'</button>':'')+'</div>';
 const [v,c]=$('#studentCards').children;paintBoard(v.querySelector('canvas'),'village',s.village?.map||newVillage(),{width:430});paintBoard(c.querySelector('canvas'),'city',s.city?.map||newCity(),{width:430});
 v.onclick=()=>openEditor({mode:'village',map:s.village?.map||newVillage(),kind:'personal',rev:s.village?.rev||0});c.onclick=()=>openEditor({mode:'city',map:s.city?.map||{...newCity(),name:(s.group+1)+'모둠 도시'},kind:rep?'group':'preview',rev:s.city?.rev||0,group:s.group});bind('answer',answerForm);const note=document.createElement('p');note.className='stepCaption';note.textContent=!s.sent?'내 마을을 꾸미고 이름을 붙인 뒤, 저장하고 우리 도시로 보내세요.':rep?'모둠원의 마을이 도착하면 우리 모둠 도시를 열고 함께 꾸며 저장하세요.':'마을을 보냈어요. 우리 모둠 도시를 열어 친구들의 마을을 찾아보세요.';app.querySelector('.wrap').append(note);startPoll(studentDesk)
}
function answerForm(){const qs=['첫 번째 모둠에서 본 장면','두 번째 모둠에서 본 장면','두 장면의 공통점','도시는 어떤 곳인가요?'];modal('<h2>도시의 의미</h2><form class="form" id="ans">'+qs.map((q,i)=>'<label>'+q+'<textarea maxlength="450" required id="a'+i+'">'+esc(state.answer?.[i]||'')+'</textarea></label>').join('')+'<div class="formActions">'+cancel+'<button class="primary">응답 제출</button></div></form>');$('#ans').onsubmit=async e=>{e.preventDefault();try{await request('answer',{answers:qs.map((_,i)=>$('#a'+i).value)});await refresh();dialog.close();studentDesk();toast('응답을 제출했습니다.')}catch(e){toast(e.message)}}}
function demo(){const record=get('demoVillage');openEditor({mode:'village',map:record||sampleVillage(0),kind:'demo',rev:0})}
function draftKey(e){return 'draft:'+ctx?.code+':'+state?.num+':'+e.kind+':'+e.group}
function openEditor(info){
 cleanup(info.kind==='demo'?'demo':'edit');ed={...info,baseline:structuredClone(info.map),map:structuredClone(info.map),ink:structuredClone(info.ink||[]),cat:0,choice:null,sel:null,tool:'move',zoom:1,toolsOpen:info.kind!=='presentation',history:[],ghost:null,rev:info.rev||0};const temp=['group','personal','presentation'].includes(ed.kind)&&get(draftKey(ed));
 if(temp&&temp.rev===ed.rev){const original=ed;modal('<h2>저장 전 작업을 이어갈까요?</h2><p class="hint">이 기기에 남은 임시 작업이 있습니다.</p><div class="formActions"><button id="original">저장본 열기</button><button class="primary" id="restore">임시 작업 열기</button></div>');bind('restore',()=>{if(ed===original){ed.map=temp.map;ed.ink=temp.ink||[];dirty=true;editorView()}dialog.close()});bind('original',()=>{put(draftKey(ed),null);dialog.close()})}
 editorView()
}
function back(){confirmLeave(async()=>{if(!ctx||ed?.kind==='demo'){home();return}await refresh();ctx.role==='teacher'?dashboard():studentDesk()})}
function snapshot(){ed.history.push({map:structuredClone(ed.map),ink:structuredClone(ed.ink)});if(ed.history.length>30)ed.history.shift()}
function changed(){dirty=true;if(['group','personal','presentation'].includes(ed.kind))put(draftKey(ed),{rev:ed.rev,map:ed.map,ink:ed.ink});const s=$('#saveState');if(s)s.textContent='저장 전';const n=$('#count');if(n)n.textContent=used(ed.map)+' / '+limit()+'개'}
function limit(){return ed.kind==='demo'?30:state.settings[ed.mode==='city'?'climit':'vlimit']}
function editable(){return ed.kind!=='preview'&&(ed.kind!=='presentation'||ed.toolsOpen)}
function redraw(){
 const cv=$('#world');if(!ed||!cv)return;
 const [width,height]=sizeMapFrame(ed,$('.boardscroll'),$('#mapStage'));
 paintBoard(cv,ed.mode,ed.map,{ink:ed.ink,selected:ed.sel,ghost:ed.ghost,valid:ed.ghost&&ed.valid});
 layoutNameplates($('#nameplates'),ed,width,height);
 const del=$('#del');
 if(del){const obj=entities(ed.map).find(o=>o.key===ed.sel);
  del.disabled=!obj||((obj.village||/^home[123]$/.test(obj.key))&&ed.kind!=='demo');
  del.textContent=obj?(obj.village?obj.village.name:labels(ed.mode)[obj.id])+' 삭제':'선택 삭제'}
}
window.addEventListener('resize',redraw);
function say(msg){if($('#mapMsg'))$('#mapMsg').textContent=msg}
function editorView(){const e=ed,kind=e.kind,m=e.map,pres=kind==='presentation',demo=kind==='demo';
 app.innerHTML='<div class="wrap '+(pres?'present '+(e.toolsOpen?'toolsOpen':''):'')+'"><div class="editHead"><div><small class="eyebrow">'+(demo?'지도 체험':pres?'전자칠판 · 발표':e.mode==='city'?'모둠 활동':'개인 활동')+'</small><h1>'+esc(m.name||(e.mode==='city'?'우리 모둠 도시':'내 마을 만들기'))+'</h1></div><div class="btns"><button id="back">'+(pres?'목록으로':'돌아가기')+'</button>'+(demo?'<div class="demoTabs" role="group" aria-label="체험 지도 선택"><button id="vTab" aria-pressed="'+(e.mode==='village')+'">마을 체험</button><button id="cTab" aria-pressed="'+(e.mode==='city')+'">도시 체험</button></div>':'')+(pres?'<button id="toggleTools">'+(e.toolsOpen?'도구 접기':'발표 도구 열기')+'</button><button id="fs">전체 화면</button><button id="save" class="primary">발표본 저장</button>':editable()?'<button id="save" class="'+(kind==='personal'?'':'primary')+'">지도 저장</button>'+(kind==='personal'?'<button id="send" class="primary">우리 도시로 '+(state.sent?'다시 보내기':'보내기')+'</button>':''):'')+'</div></div><div class="editor" '+(kind==='preview'?'style="grid-template-columns:1fr"':'')+'><section class="sheet"><div class="workspaceHead">'+(editable()?'<input id="mapName" maxlength="40" aria-label="지도 이름" placeholder="지도 이름을 지어 주세요" value="'+esc(m.name)+'">':'<b>'+esc(m.name||'우리 지도')+'</b>')+'<span class="counter" id="count">'+used(m)+' / '+limit()+'개</span></div><div class="boardscroll"><div id="mapStage"><canvas class="world" id="world" role="img" aria-label="건물과 길이 표시된 '+(e.mode==='city'?'도시':'마을')+' 지도"></canvas><div id="nameplates"></div></div></div><div class="maptools"><button id="out" aria-label="축소">−</button><button id="in" aria-label="확대">＋</button><button id="fit">전체 보기</button><button id="names" aria-pressed="'+String(!e.hideNames)+'">건물 이름</button>'+(editable()?'<button id="undo">되돌리기</button><button id="del">선택 삭제</button>':'')+'<span class="grow"></span><small id="saveState" class="muted">'+(dirty?'저장 전':demo?'체험 지도':'저장본')+'</small></div><div id="mapMsg" class="msg" role="status">'+(editable()?'장소를 골라 빈 땅을 누르세요. 지도 위의 건물이나 마을은 끌어 옮길 수 있어요.':'지도를 확대해 살펴볼 수 있어요.')+'</div></section>'+(kind==='preview'?'':'<aside class="inventory"><h3>장소 목록</h3><div id="cats" class="catlist"></div><div id="palette" class="items"></div>'+(pres?'<div class="divider"></div><h3>발표 필기</h3><div class="tools" id="pens"></div>':'')+'</aside>')+'</div></div>';
 bind('back',back);bind('save',()=>saveMap(false));bind('send',()=>saveMap(true));bind('toggleTools',()=>{ed.toolsOpen=!ed.toolsOpen;ed.tool='move';ed.choice=null;editorView()});bind('fs',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()});
 function switchDemo(mode){if(ed.mode===mode)return;put(ed.mode==='city'?'demoCity':'demoVillage',ed.map);openEditor({kind:'demo',mode,map:get(mode==='city'?'demoCity':'demoVillage')||(mode==='city'?sampleCity():sampleVillage(0))})}bind('vTab',()=>switchDemo('village'));bind('cTab',()=>switchDemo('city'));
 const nm=$('#mapName');if(nm)nm.oninput=()=>{ed.map.name=nm.value;changed()};
 if(demo){
  const remove=document.createElement('button');remove.textContent='체험 지도 삭제';$('#save').after(remove);
  remove.onclick=()=>{
   const isCity=e.mode==='city',type=isCity?'도시':'마을';
   modal('<h2>이 '+type+' 체험 지도를 삭제할까요?</h2><p>이 기기에 저장한 '+type+' 체험 지도를 지우고 새 지도판을 엽니다.</p><div class="formActions">'+cancel+'<button class="primary" id="eraseDemo">체험 지도 삭제</button></div>');
   bind('eraseDemo',()=>{
    const fresh=isCity?newCity():newVillage();fresh.name=isCity?'새 체험 도시':'새 체험 마을';
    put(isCity?'demoCity':'demoVillage',fresh);dialog.close();openEditor({kind:'demo',mode:e.mode,map:fresh});
    toast(type+' 체험 지도를 삭제했습니다.')
   })
  }
 }
 for(const [btn,value] of [['in',.5],['out',-.5],['fit',0]])bind(btn,()=>{
  ed.zoom=value?Math.min(5,Math.max(1,ed.zoom+value)):1;redraw();
  if(!value){const frame=$('.boardscroll');frame.scrollTo(0,0);frame.scrollIntoView({block:'nearest'});say('지도 전체가 한 화면에 보입니다.')}
 });
 bind('names',()=>{ed.hideNames=!ed.hideNames;$('#names').setAttribute('aria-pressed',String(!ed.hideNames));redraw()});
 bind('undo',()=>{const h=ed.history.pop();if(!h)return say('되돌릴 작업이 없습니다.');ed.map=h.map;ed.ink=h.ink;ed.sel=null;changed();editorView()});
 bind('del',()=>{const o=entities(ed.map).find(o=>o.key===ed.sel);if(!o)return;
  if((o.village||/^home[123]$/.test(o.key))&&ed.kind!=='demo')return;
  snapshot();if(o.village)ed.map.villages=ed.map.villages.filter(z=>z.key!==o.key);else ed.map.items=ed.map.items.filter(z=>z.key!==o.key);
  ed.sel=null;changed();redraw();say('삭제했습니다. 되돌리기로 복구할 수 있습니다.')
 });
 if($('#palette'))palette();redraw();wireBoard();
 clearInterval(timer);
 if(e.kind==='group'||(e.kind==='preview'&&ctx?.role==='student'&&e.mode==='city')){
  timer=setInterval(async()=>{
   if(document.hidden||dialog.open||ed!==e||e.syncing||e.dragging||e.saving)return;
   e.syncing=true;
   try{
    const latest=await request('state');
    if(ed!==e||e.dragging||e.saving)return;
    state=latest;
    if(e.kind==='group'&&state.settings.groups[state.group].rep!==state.num){studentDesk();toast('모둠 대표가 변경되었습니다.');return}
    const remote=latest.city;
    if(!remote||remote.rev<=e.rev)return;
    if(dirty){
     const merged=mergeIncomingVillages(e.baseline,e.map,remote.map);
     if(!merged){say('다른 화면에서 도시가 수정되었습니다. 저장본을 다시 열어 확인하세요.');return}
     e.map=merged;e.rev=remote.rev;e.history=[];changed()
    }else{e.map=structuredClone(remote.map);e.rev=remote.rev;e.history=[]}
    e.baseline=structuredClone(remote.map);
    redraw();say('새로 저장된 모둠 지도를 반영했습니다.')
   }catch{}finally{e.syncing=false}
  },3500)
 }
}
function palette(){const e=ed,groups=e.mode==='city'?CITY:VILLAGE;$('#cats').innerHTML=groups.map((g,i)=>'<button class="cat '+(i===e.cat?'active':'')+'" data-cat="'+i+'">'+g[0]+'</button>').join('');$('#cats').querySelectorAll('button').forEach(b=>b.onclick=()=>{e.cat=Number(b.dataset.cat);palette()});
 const offset=groups.slice(0,e.cat).reduce((n,g)=>n+g.length-1,0);$('#palette').innerHTML=groups[e.cat].slice(1).map((name,i)=>'<button class="item '+(e.choice===offset+i?'active':'')+'" data-item="'+(offset+i)+'">'+icon(offset+i,e.mode)+esc(name)+'</button>').join('');allArt($('#palette'));$('#palette').querySelectorAll('button').forEach(b=>b.onclick=()=>{e.choice=e.choice===Number(b.dataset.item)?null:Number(b.dataset.item);e.tool='move';e.sel=null;palette();redraw();say(e.choice===null?'장소 선택을 해제했습니다.':labels(e.mode)[e.choice]+'을 놓을 빈 땅을 눌러 주세요.')});
 if($('#pens')){$('#pens').innerHTML=[['move','선택·이동'],['pen','펜'],['mark','형광펜'],['erase','지우개']].map(([v,t])=>'<button data-tool="'+v+'" class="'+(e.tool===v?'active':'')+'">'+t+'</button>').join('');$('#pens').querySelectorAll('button').forEach(b=>b.onclick=()=>{e.tool=b.dataset.tool;e.choice=null;palette()})}
}
function wireBoard(){
 const cv=$('#world'),stage=$('#mapStage'),e=ed;let drag=null;
 e.panning=false;
 const pan=document.createElement('button');pan.textContent='화면 이동';pan.setAttribute('aria-pressed','false');$('#fit').after(pan);
 pan.onclick=()=>{e.panning=!e.panning;stage.classList.toggle('panning',e.panning);pan.setAttribute('aria-pressed',String(e.panning));pan.textContent=e.panning?'화면 이동 중 · 편집으로':'화면 이동';say(e.panning?'확대한 지도를 손가락으로 밀어서 살펴보세요.':'지도 편집으로 돌아왔습니다.')};
 
 
 
 const point=ev=>{const r=cv.getBoundingClientRect(),[W,H]=size(e.mode);return [(ev.clientX-r.left)/r.width*W,(ev.clientY-r.top)/r.height*H]};
 function select(o){if(e.choice!==null){e.choice=null;palette()}e.sel=o.key;say((o.village?o.village.name:labels(e.mode)[o.id])+' 선택됨');}
 stage.addEventListener('click',ev=>{if(ev.detail===0&&ev.target.dataset.owner&&editable()){const o=entities(e.map).find(z=>z.key===ev.target.dataset.owner);if(o){select(o);redraw()}}});
 const xy=(o,x,y,dx,dy)=>({...o,x:Math.round(x-dx),y:Math.round(y-dy)});
 stage.onpointerdown=ev=>{if(!editable()||e.panning||!ev.isPrimary||ev.button!==0)return;const [x,y]=point(ev);stage.setPointerCapture(ev.pointerId);e.dragging=true;
 if(e.tool==='pen'||e.tool==='mark'){if(e.ink.length>=500)return say('필기 한도에 도달했습니다.');snapshot();e.ink.push({tool:e.tool,pts:[[x,y],[x+.01,y+.01]]});drag={ink:true};redraw();return}
 if(e.tool==='erase'){const ix=e.ink.findLastIndex(s=>s.pts.some(p=>Math.hypot(p[0]-x,p[1]-y)<1.6));if(ix>=0){snapshot();e.ink.splice(ix,1);changed();redraw()}return}
 const target=entities(e.map).find(o=>o.key===ev.target.dataset.owner)||visualHit(e.map,e.mode,x,y);
 if(target){select(target);drag={o:target,dx:x-target.x,dy:y-target.y,startX:ev.clientX,startY:ev.clientY};redraw();return}
 if(e.choice!==null){if(used(e.map)>=limit())return say('사용 한도에 도달했어요. 다른 장소를 삭제한 뒤 추가하세요.');
 const o=item(e.choice,0,0,(e.mode==='city'?'c_':'v_')+idkey()),[w,h]=box(o);drag={o,dx:w/2,dy:h/2,new:true};}
 else{e.sel=null;redraw();return}
 e.ghost=xy(drag.o,x,y,drag.dx,drag.dy);e.valid=dropValid(e.mode,e.map,e.ghost);redraw()};
 stage.onpointermove=ev=>{if(!drag||!ev.isPrimary)return;const [x,y]=point(ev);if(drag.ink){const s=e.ink.at(-1);if(s.pts.length<4000)s.pts.push([x,y]);redraw();return}
 if(!drag.new&&!drag.moved){if(Math.hypot(ev.clientX-drag.startX,ev.clientY-drag.startY)<6)return;drag.moved=true}
 e.ghost=xy(drag.o,x,y,drag.dx,drag.dy);e.valid=dropValid(e.mode,e.map,e.ghost);redraw()};
 stage.onpointerup=ev=>{if(!ev.isPrimary)return;e.dragging=false;if(!drag)return;const d=drag;drag=null;if(d.ink){changed();return}if(!d.new&&!d.moved)return;const [x,y]=point(ev),o=xy(d.o,x,y,d.dx,d.dy);e.ghost=null;
 if(!d.new&&sameCell(o,d.o)){redraw();return}
 if(!dropValid(e.mode,e.map,o)){say('길이나 건물이 겹치거나 입구를 연결할 공간이 없어요. 가까운 빈 땅을 골라 주세요.');redraw();return}
 snapshot();if(d.new)e.map.items.push(o);else Object.assign(d.o,{x:o.x,y:o.y});e.sel=o.key;changed();redraw();say((o.village?o.village.name:labels(e.mode)[o.id])+' · 연결길을 갱신했습니다.')};
 stage.onpointercancel=()=>{e.dragging=false;if(drag?.ink)changed();drag=null;e.ghost=null;redraw()}
}
async function saveMap(send){
 const e=ed;if(e.saving)return;if(!e.map.name.trim()){say('먼저 지도 이름을 입력하세요.');$('#mapName')?.focus();return}
 if(e.kind==='demo'){put(e.mode==='city'?'demoCity':'demoVillage',e.map);dirty=false;editorView();return toast('이 기기에 체험 지도를 저장했습니다.')}
 const buttons=[$('#save'),$('#send')].filter(Boolean);buttons.forEach(b=>b.disabled=true);e.saving=true;const workspace=$('.editor');workspace.inert=true;
 try{let action=e.kind==='presentation'?'copy':e.kind==='personal'?(send?'send':'village'):'city';const res=await request(action,{map:e.map,rev:e.rev,group:e.group,ink:e.ink});e.rev=res.rev??e.rev;e.baseline=structuredClone(e.map);dirty=false;put(draftKey(e),null);await refresh();editorView();toast(send?'모둠 도시에 마을을 보냈습니다.':e.kind==='presentation'?'원본과 별도로 발표본을 저장했습니다.':'지도를 저장했습니다.')}
 catch(err){
  if(err.status===409&&e.kind==='group'){
   await refresh();const remote=state.city, merged=remote&&mergeIncomingVillages(e.baseline,e.map,remote.map);
   if(merged){e.map=merged;e.baseline=structuredClone(remote.map);e.rev=remote.rev;e.history=[];changed();editorView();toast('새로 전송된 마을을 반영했습니다. 확인 후 다시 저장하세요.');return}
   say('다른 화면에서 도시를 수정했습니다. 돌아가서 최신 지도를 다시 열어 주세요.')
  }
  toast(err.message)
 }
 finally{e.saving=false;workspace.inert=false;buttons.forEach(b=>b.disabled=false)}
}
function goHome(){confirmLeave(()=>{history.pushState(null,'',location.pathname);ctx=null;state=null;home()})}
bind('brand',goHome);bind('goHome',goHome);bind('goDemo',()=>confirmLeave(demo));window.onpopstate=()=>start();start().catch(err=>{home();toast(err.message)});

