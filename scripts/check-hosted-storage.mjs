import {api} from '../lib/classroom-api.mjs';
import {roomStore} from '../lib/blob-rooms.mjs';
import {del} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

export async function checkHostedStorage(){
 const prefix='checks/'+randomUUID(),rooms=roomStore(prefix);
 let code;
 const call=(action,data,token='')=>api(new Request('https://test.local/api/'+action,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({code,...data})}),{rooms});
 try{
  const questions=['어디에 모였나요?','어떤 공통점이 있나요?'];
  const teacher=await call('create',{title:'배포 검증',password:randomUUID(),settings:{assessment:true,vlimit:10,climit:10,questions,groups:[{nums:[1,2],rep:1}]}});
  code=teacher.code;
  const [a,b]=await Promise.all([1,2].map(num=>call('join',{num})));
  const settings=(await call('state',{},a.token)).settings;
  assert.deepEqual(settings.questions,questions);
  const reply=(answers,token)=>call('answer',{answers,questionVersion:settings.questionVersion,rev:0},token);
  await Promise.all([reply(['시장','교류'],a.token),reply(['역','이동'],b.token)]);
  await call('review',{num:1,rev:1},teacher.token);
  let result=await call('state',{},teacher.token);
  assert.equal(result.answerMeta[1].reviewed,true);assert.deepEqual(result.answers[2],['역','이동']);
  await call('answer',{answers:['도서관','여러 동네'],questionVersion:settings.questionVersion,rev:1},a.token);
  result=await call('state',{},teacher.token);assert.equal(result.answerMeta[1].reviewed,false);
  console.log('PASS deployed storage: new classroom, simultaneous students, answers, review and resubmission');
 }finally{if(code)await del(prefix+'/'+code+'.json');}
}

