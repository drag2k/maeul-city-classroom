import assert from 'node:assert/strict';
export async function checkQuestions({api, db, settings, worker, env}) {
  async function room(options) {
    const r=await api('create',{title:'질문 검증',password:'test-for-class',settings:options});
    const call=(action,body,token,status)=>api(action,{code:r.code,...body},token,status);
    const student=(await call('join',{num:1})).token;
    return {call,student,teacher:r.token,code:r.code};
  }
  for(const count of [1,7]) {
    const questions=Array.from({length:count},(_,i)=>'직접 만든 질문 '+(i+1));
    const answers=questions.map((_,i)=>'대답 '+(i+1));
    const {call,student,teacher}=await room({...settings,questions});
    const studentState=await call('state',{},student);
    assert.deepEqual(studentState.settings.questions,questions);
    const version=studentState.settings.questionVersion;
    const submit={questionVersion:version,answers,rev:0};
    await call('answer',{...submit,answers:answers.slice(1)},student,400);
    await call('answer',{...submit,answers:answers.map(()=>'  ')},student,400);
    await call('answer',{...submit,questionVersion:version-1},student,409);
    await call('answer',submit,student);
    const second=(await call('join',{num:2})).token;
    assert.equal((await call('state',{},second)).answer,null);
    const after=await call('state',{},teacher);
    assert.deepEqual(after.answers[1],answers);
    await call('review',{num:1,rev:1},student,403);
    await call('review',{num:1,rev:1},teacher);
    assert.equal((await call('state',{},teacher)).answerMeta[1].reviewed,true);
    await call('answer',submit,student,409);
    await call('answer',{...submit,rev:1,answers:answers.map(a=>a+' 수정')},student);
    await call('review',{num:1,rev:1},teacher,409);
    assert.equal((await call('state',{},teacher)).answerMeta[1].reviewed,false);
    await call('settings',{settings:{...settings,questions:['다른 질문']}},teacher,409);
    await call('settings',{settings:{...settings,assessment:false}},teacher);
    await call('answer',{...submit,rev:2},student,403);
    await call('settings',{settings},teacher);
    assert.deepEqual((await call('state',{},student)).settings.questions,questions);
  }
  const r=await room(settings);
  const seed=JSON.parse(db.prepare('SELECT body FROM rooms WHERE code=?').get(r.code).body);
  delete seed.settings.questions;delete seed.settings.questionVersion;delete seed.answerMeta;
  seed.answers[1]=['장면 1','장면 2','공통점','도시의 의미'];
  db.prepare('UPDATE rooms SET body=? WHERE code=?').run(JSON.stringify(seed),r.code);
  assert.equal((await r.call('state',{},r.student)).settings.questions.length,4);
  assert.deepEqual((await r.call('state',{},r.teacher)).answers[1],seed.answers[1]);
  await r.call('review',{num:1,rev:1},r.teacher);
  const edit=await room({...settings,questions:['이전 질문']});
  await edit.call('settings',{settings:{...settings,questions:['바뀐 질문']},questionVersion:1},edit.teacher);
  await edit.call('answer',{questionVersion:1,answers:['오래된 질문의 답'],rev:0},edit.student,409);
  await edit.call('settings',{settings:{...settings,questions:['뒤늦은 수정']},questionVersion:1},edit.teacher,409);
  for (const questions of [[],['  ']]) await api('create',{password:'test-for-class',settings:{...settings,questions}},'',400);
  const manifest=await worker.fetch(new Request('https://class.test/manifest.webmanifest'),env);
  assert.match(manifest.headers.get('content-type'),/manifest\+json/);
  for(const icon of (await manifest.json()).icons) {
    const response=await worker.fetch(new Request('https://class.test'+icon.src),env);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.equal(bytes.readUInt32BE(16)+'x'+bytes.readUInt32BE(20),icon.sizes);
  }
  console.log('PASS | 1 and 7 custom questions, isolated answers, revisions, teacher review, re-submission, stale forms, disabled assessment, legacy room and nine icon assets');
}

