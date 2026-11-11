'use strict';
function readSetup() {
  const questions = [...document.querySelectorAll('#questionEditor input')].map(input=>input.value.trim());
  if ($('#assessment').checked && questions.some(q=>!q)) throw Error('빈 질문을 입력하거나 삭제해 주세요.');
  return {
    vlimit: Number($('#vl').value), climit: Number($('#cl').value), assessment: $('#assessment').checked,
    questions: $('#assessment').checked ? questions : undefined,
    groups: [...$('#groups').children].map(row => ({
      nums: row.querySelector('.nums').value.trim().split(/[,，\s]+/).filter(Boolean).map(Number),
      rep: Number(row.querySelector('.rep').value)
    }))
  };
}
function setupWizard() {
  const form = $('#setup'), actions = form.querySelector('.formActions'), error = $('#formErr');
  const basic = document.createElement('section'), groups = document.createElement('section'), review = document.createElement('section');
  const separator = form.querySelector('.divider');
  while (form.firstElementChild !== separator) basic.append(form.firstElementChild);
  separator.remove();
  while (form.firstElementChild !== error) groups.append(form.firstElementChild);
  form.prepend(basic, groups, review);
  const panels = [basic, groups, review];
  panels.forEach(p => p.className = 'wizardPanel');
  const heading = dbody.querySelector('h2');
  const names = ['수업 기본', '모둠 편성', '확인·개설'];
  const tips = ['학생이 사용할 수 있는 아이템 한도를 설정합니다. (마을 시작 시 기본 주택 3채는 한도에 포함되지 않음)', '모둠마다 출석번호 1~4개를 입력하고, 도시를 편집할 대표를 그중에서 고르세요.', '학급 편성을 확인한 뒤 수업을 개설하면 학생용 QR이 열립니다.'];
  const caption = document.createElement('p'); caption.className = 'stepCaption'; caption.setAttribute('aria-live', 'polite');actions.before(caption);
  const back = document.createElement('button'), next = form.querySelector('button.primary');
  back.type = 'button';back.textContent = '이전';next.before(back);
  let step = 0;
  function render() {
    panels.forEach((p,i) => p.hidden = i !== step);
    heading.textContent = (step+1) + ' / 3　' + names[step];
    caption.textContent = tips[step]; error.textContent = '';back.hidden = step === 0;
    next.textContent = step === 2 ? '수업 개설' : '다음';
    if (step === 2) {
      const s = readSetup();
      review.innerHTML = '<h3>'+esc($('#title').value)+'</h3><p>마을 '+s.vlimit+'개 · 도시 '+s.climit+'개 · 개인 활동 '+(s.assessment?s.questions.length+'문항':'끔')+'</p>'+(s.assessment?'<ol>'+s.questions.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ol>':'')+'<ul class="rosterReview">'+s.groups.map((g,i)=>'<li><b>'+(i+1)+'모둠</b><span>'+g.nums.join(', ')+'번</span><small>대표 '+g.rep+'번</small></li>').join('')+'</ul>';
    }
    dialog.scrollTop = 0;heading.tabIndex = -1;heading.focus();
  }
  form.noValidate = true;
  back.onclick = () => { if (step) { step--;render(); } };
  const create = form.onsubmit;
  form.onsubmit = async ev => {
    ev.preventDefault();
    if (step === 2) return create(ev);
    for (const input of panels[step].querySelectorAll('input')) {
      if (!input.reportValidity()) return;
    }
    if (step === 0 && !$('#title').value.trim()) { error.textContent = '수업 이름을 입력하세요.';$('#title').focus();return; }
    if (step === 0 && $('#assessment').checked && [...document.querySelectorAll('#questionEditor input')].some(input=>!input.value.trim())) { error.textContent='빈 질문을 입력하거나 삭제해 주세요.';return; }
    if (step === 1) {
      const seen = new Set();
      for (const [i,g] of readSetup().groups.entries()) {
        let message = '';
        if (g.nums.length < 1 || g.nums.length > 4) message = '1~4명을 배정하세요.';
        else if (!g.nums.includes(g.rep)) message = '모둠원 중 한 명을 대표로 지정하세요.';
        else for (const n of g.nums) {
          if (!Number.isInteger(n) || n < 1 || n > 99 || seen.has(n)) {message = '출석번호는 1~99 사이에서 중복 없이 입력하세요.';break;}
          seen.add(n);
        }
        if (message) {error.textContent = (i+1)+'모둠 · '+message;return;}
      }
    }
    step++;render();
  };
  render();
}
function lessonProgress() {
  const key = 'lesson-step:'+ctx.code;
  const step = Math.min(3,Math.max(0,Number(get(key))||0));
  const total = state.settings.groups.flatMap(g=>g.nums).length;
  const sent = Object.values(state.cities).reduce((n,c)=>n+c.map.villages.length,0);
  const stages = [
    ['학생 입장', '전자칠판에 공통 QR을 띄우세요. 학생이 자기 번호를 누르면 지정한 모둠에 들어갑니다.',state.claimed.length+' / '+total+'명 입장','학생용 QR 열기'],
    ['개인 마을', '각자 마을에 이름을 붙여 저장하고 ‘우리 도시로 보내기’를 누르게 하세요.',Object.keys(state.villages).length+'명 저장 · '+sent+'명 전송','개인 마을 보기'],
    ['모둠 도시', '대표 기기에서 모둠 도시를 열어 마을을 옮기고 큰 시설을 놓은 뒤 도시 이름을 정해 저장하세요.',Object.keys(state.cities).length+'개 도시 모임','모둠 도시 보기'],
    ['발표와 정리', '도시 썸네일을 눌러 전자칠판에 띄우세요. 발표 중 수정하거나 필기한 내용은 발표본으로 저장하세요.',Object.keys(state.copies).length+'개 발표본 저장','발표할 도시 고르기']
  ];
  const [name,tip,count,action] = stages[step];
  const box = document.createElement('section');box.className='lessonProgress';box.setAttribute('aria-label','수업 진행 안내');
  box.innerHTML='<div><small>수업 진행　'+(step+1)+' / 4</small><h3>'+name+'</h3><p>'+tip+'</p><strong>'+count+'</strong></div><div class="btns"><button id="stageAction">'+action+'</button><button id="prevStage" '+(step?'':'disabled')+'>이전</button><button id="nextStage" '+(step===3?'disabled':'')+'>다음</button></div>';
  app.querySelector('.wrap').append(box);
  bind('stageAction',()=>{if(!step)return shareClass();tab=step===1?'villages':'cities';dashboard();$('#cards').scrollIntoView({block:'nearest'})});
  bind('prevStage',()=>{put(key,step-1);dashboard()});bind('nextStage',()=>{put(key,step+1);dashboard()});
}
