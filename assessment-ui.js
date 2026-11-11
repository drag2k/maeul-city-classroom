function setupQuestions(settings, locked) {
  const panel = document.querySelector('#questionEditor');
  const list = panel.querySelector('ol');
  const toggle = document.querySelector('#assessment');
  const add = panel.querySelector('button');
  function update() {
    panel.hidden = !toggle.checked;
    const rows = [...list.children];
    rows.forEach((row, index) => {
      row.querySelector('input').setAttribute('aria-label', (index + 1) + '번 질문');
      row.querySelector('input').disabled = !toggle.checked;
      row.querySelector('button').disabled = locked || rows.length === 1;
    });
  }
  function append(text) {
    const row = document.createElement('li');
    row.innerHTML = '<div class="questionRow"><input required placeholder="학생에게 할 질문"><button type="button">삭제</button></div>';
    const input = row.querySelector('input');
    input.value = text;
    input.readOnly = locked;
    row.querySelector('button').onclick = () => { row.remove();update(); };
    list.append(row);
    return input;
  }
  questionsFor(settings).forEach(append);
  add.hidden = locked;
  panel.querySelector('.hint').textContent = locked ? '수업 개설 시 확정한 질문입니다.' : '질문을 고치거나 추가·삭제하세요. 수업을 개설하면 질문이 확정됩니다.';
  add.onclick = () => { const input = append('');update();input.focus(); };
  toggle.onchange = update;
  update();
}
function answerForm() {
  const settings = state.settings;
  const questions = questionsFor(settings);
  const rev = state.answerMeta?.rev ?? (state.answer ? 1 : 0);
  modal('<h2>도시의 의미</h2><form class="form" id="ans">' + questions.map((q,i) =>
    '<label>' + (i+1) + '. ' + esc(q) + '<textarea required maxlength="450">' + esc(state.answer?.[i] || '') + '</textarea></label>'
  ).join('') + '<p class="error" role="alert"></p><div class="formActions">'+cancel+'<button class="primary">응답 제출</button></div></form>');
  const form = $('#ans');
  form.onsubmit = async ev => {
    ev.preventDefault();
    const inputs = [...form.querySelectorAll('textarea')];
    const empty = inputs.find(input => !input.value.trim());
    if (empty) { empty.focus();form.querySelector('.error').textContent = '모든 질문에 답을 입력해 주세요.';return; }
    const submit = form.querySelector('.primary');
    submit.disabled = true;
    try {
      await request('answer', {questionVersion:questionVersion(settings), rev, answers:inputs.map(input => input.value.trim())});
      dialog.close();await refresh();studentDesk();toast('응답을 제출했습니다.');
    } catch (err) { form.querySelector('.error').textContent = err.message; }
    finally { submit.disabled = false; }
  };
}
function renderAnswers(openNumbers = []) {
  const cards = $('#cards');
  const roster = state.settings.groups.flatMap((g,i) => g.nums.map(n => ({n,group:i+1}))).sort((a,b)=>a.n-b.n);
  const questions = questionsFor(state.settings);
  const rows = roster.map(({n,group}) => {
    const answers = state.answers[n];
    const meta = state.answerMeta?.[n];
    const status = !answers ? '미제출' : meta?.reviewed ? '확인 완료' : '제출됨';
    const title = '<b>' + n + '번 · ' + group + '모둠</b>　' + status;
    if (!answers) return '<article>' + title + '</article>';
    return '<article><details data-num="'+n+'" '+(openNumbers.includes(String(n))?'open':'')+'><summary>' + title + '</summary><dl>' + questions.map((q,i) =>
      '<dt>'+(i+1)+'. '+esc(q)+'</dt><dd>'+esc(answers[i] || '')+'</dd>').join('') +
      '</dl>' + (meta?.reviewed ? '' : '<button data-review="'+n+'" data-rev="'+(meta?.rev ?? 1)+'">확인 완료로 표시</button>') + '</details></article>';
  });
  cards.innerHTML = '<p>제출 '+Object.keys(state.answers).length+' / '+roster.length+'명</p><section class="answers">'+rows.join('')+'</section>';
  for (const btn of cards.querySelectorAll('[data-review]')) btn.onclick = async () => {
    btn.disabled = true;
    try { await request('review',{num:Number(btn.dataset.review),rev:Number(btn.dataset.rev)});await refresh();dashboard(); }
    catch (err) { toast(err.message);btn.disabled=false; }
  };
}

