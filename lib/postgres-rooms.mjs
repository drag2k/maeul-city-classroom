import { createHash } from 'node:crypto';

const studentFields = ['students', 'villages', 'answers', 'answerMeta', 'sent'];
const groupFields = ['cities', 'copies'];
const fields = [...studentFields, ...groupFields];

export const schemaSql = `
  CREATE TABLE IF NOT EXISTS classroom_meta (
    code text PRIMARY KEY, data jsonb NOT NULL
  );
  CREATE TABLE IF NOT EXISTS classroom_records (
    code text NOT NULL REFERENCES classroom_meta(code),
    kind text NOT NULL CHECK (kind IN ('student','group')),
    slot integer NOT NULL, data jsonb NOT NULL,
    PRIMARY KEY (code, kind, slot)
  );`;

function metadata(room) {
  return Object.fromEntries(Object.entries(room).filter(([key]) => !fields.includes(key)));
}

function record(room, kind, slot) {
  const data = {};
  for (const field of kind === 'student' ? studentFields : groupFields) {
    if (room[field]?.[slot] !== undefined) data[field] = room[field][slot];
  }
  return data;
}

export async function classroomTransaction(pool, request, api) {
  const action = new URL(request.url).pathname.slice(5);
  const body = await request.clone().json();
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /,'');
  const hash = createHash('sha256').update(token).digest('hex');
  const client = await pool.connect();
  let records = [];
  let saved = false;
  try {
    await client.query('BEGIN');
    const rooms = {
      codeBytes: 8,
      async insert(id, serialized) {
        const room = JSON.parse(serialized);
        await client.query('INSERT INTO classroom_meta VALUES ($1,$2)', [id, metadata(room)]);
        const groups = room.settings.groups;
        const slots = groups.flatMap((group,i) => [
          {kind:'group',slot:i}, ...group.nums.map(slot => ({kind:'student',slot}))
        ]);
        await client.query(`INSERT INTO classroom_records
          SELECT $1, kind, slot, '{}'::jsonb FROM jsonb_to_recordset($2::jsonb)
          AS slots(kind text, slot integer)`, [id,JSON.stringify(slots)]);
      },
      async read(id) {
        const metaLock = ['settings','login'].includes(action) ? 'FOR UPDATE' : 'FOR SHARE';
        const {rows:[meta]} = await client.query('SELECT data FROM classroom_meta WHERE code=$1 '+metaLock,[id]);
        if (!meta) return null;
        const room = meta.data;
        for (const field of fields) room[field] = {};
        const teacher = room.teacherTokens.includes(hash);
        let student;
        if (['join','review','release'].includes(action)) {
          if (Number.isInteger(body.num) && body.num >= 1 && body.num <= 99) student = body.num;
        } else if (!teacher && token) {
          const result = await client.query("SELECT slot FROM classroom_records WHERE code=$1 AND kind='student' AND data->>'students'=$2",[id,hash]);
          student = result.rows[0]?.slot;
        }
        const group = action==='copy' ? body.group : room.settings.groups.findIndex(g => g.nums.includes(student));
        const all = action==='state' && teacher;
        const roster = action==='roster';
        const needGroup = ['state','send','city','copy'].includes(action);
        const lock = ['state','roster','login','settings'].includes(action) ? '' : ' FOR UPDATE';
        const result = await client.query(`SELECT kind,slot,data FROM classroom_records WHERE code=$1
          AND ($2 OR (kind='student' AND ($3 OR slot=$4)) OR (kind='group' AND slot=$5))
          ORDER BY kind,slot`+lock,[id,all,roster,student??null,needGroup && Number.isInteger(group) && group>=0 && group<16 ? group : null]);
        records = result.rows;
        for (const row of records) {
          for (const [field,value] of Object.entries(row.data)) room[field][row.slot] = value;
        }
        return {body:JSON.stringify(room)};
      },
      async update(id, old, serialized) {
        const room = JSON.parse(serialized);
        if (['login','settings'].includes(action)) {
          await client.query('UPDATE classroom_meta SET data=$2 WHERE code=$1',[id,metadata(room)]);
        }
        for (const row of records) {
          const next = record(room,row.kind,row.slot);
          if (Object.keys(next).length===Object.keys(row.data).length &&
              Object.keys(next).every(k=>JSON.stringify(next[k])===JSON.stringify(row.data[k]))) continue;
          await client.query('UPDATE classroom_records SET data=$4 WHERE code=$1 AND kind=$2 AND slot=$3',
            [id,row.kind,row.slot,next]);
        }
        saved = true;
        return true;
      }
    };
    const result = await api(request,{rooms});
    await client.query('COMMIT');
    return result;
  } catch (error) {
    // A rejected password still records the failed login and lockout counter.
    await client.query(saved && action==='login' && error.status===403 ? 'COMMIT' : 'ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

