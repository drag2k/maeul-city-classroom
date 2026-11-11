import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import pg from 'pg';
import {checkClassroom} from '../scripts/classroom-scenario.mjs';
import {api} from '../lib/classroom-api.mjs';
import {classroomTransaction,schemaSql} from '../lib/postgres-rooms.mjs';

// The schema is private to this test run, including its fault-injection trigger.
const schema = 'test_' + randomUUID().replaceAll('-','');
if (!process.env.TEST_DATABASE_URL) throw Error('Set TEST_DATABASE_URL for an isolated PostgreSQL test.');
const config = {connectionString:process.env.TEST_DATABASE_URL};
const admin = new pg.Client(config);
await admin.connect();
await admin.query('CREATE SCHEMA '+schema);
const pool = new pg.Pool({...config,max:24,options:'-c search_path='+schema});
const board = vm.runInNewContext(readFileSync(new URL('../board.js',import.meta.url),'utf8')+';({newVillage})',{structuredClone});
async function call(action,body,token='',expected=200) {
  const req = new Request('http://test.local/api/'+action,{method:'POST',
    headers:{Authorization:'Bearer '+token},body:JSON.stringify(body)});
  try {
    const result = await classroomTransaction(pool,req,api);
    assert.equal(expected,200,action);
    return result;
  } catch(error) {
    if (!error.status || expected===200) throw error;
    assert.equal(error.status,expected,action);
  }
}
try {
  await pool.query(schemaSql);
  await checkClassroom(call);
  const groups = Array.from({length:6},(_,g)=>({nums:Array.from({length:4},(_,i)=>4*g+i+1),rep:4*g+1}));
  const settings = {groups,vlimit:12,climit:15,assessment:true,questions:['공통점은?','도시는 어떤 곳인가요?']};
  const {code,token:teacher} = await call('create',{settings,password:randomUUID()});
  const students = await Promise.all(groups.flatMap(g=>g.nums).map(num=>call('join',{code,num})));
  const maps = students.map((_,i)=>({...board.newVillage(),name:'마을 '+(i+1)}));
  await Promise.all(students.map(({token},i)=>call('village',{code,map:maps[i],rev:0},token)));
  const state = () => call('state',{code},teacher);
  await pool.query(`CREATE FUNCTION reject_student_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'simulated storage failure'; END; $$;
    CREATE TRIGGER test_failure BEFORE UPDATE ON classroom_records FOR EACH ROW
    WHEN (OLD.kind='student') EXECUTE FUNCTION reject_student_update();`);
  await assert.rejects(call('send',{code,map:maps[0],rev:1},students[0].token),/simulated storage failure/);
  const before = await state();
  assert.equal(before.villages[1].rev,1);
  assert.equal(Object.keys(before.cities).length,0);
  await pool.query('DROP TRIGGER test_failure ON classroom_records');
  await Promise.all(students.map(({token},i)=>call('send',{code,map:maps[i],rev:1},token)));
  await Promise.all(students.map(({token},i)=>call('answer',{code,rev:0,questionVersion:before.settings.questionVersion,answers:[String(i+1),'여러 사람이 모여 산다']},token)));
  const saved=await state();
  for(const [i,g] of groups.entries()) assert.deepEqual(saved.cities[i].map.villages.map(v=>v.num).sort((a,b)=>a-b),g.nums);
  for(let n=1;n<=24;n++){ assert.equal(saved.answers[n][0],String(n)); assert.equal(saved.villages[n].rev,2); }
  console.log('PASS PostgreSQL: 24 simultaneous students, six cities, isolated answers and atomic transfer rollback');
} finally {
  await pool.end();
  await admin.query('DROP SCHEMA '+schema+' CASCADE');
  await admin.end();
}

