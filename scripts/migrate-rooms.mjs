import assert from 'node:assert/strict';
import {get,put} from '@vercel/blob';
import {roomStore} from '../lib/blob-rooms.mjs';

export async function migrateRooms() {
 const marker='operations/classrooms-v0930-complete.json';
 if(await get(marker,{access:'private',useCache:false})) return;
 const key=process.env.CLASSROOM_MOVE_KEY;
 if(!key)throw Error('Initial classroom migration credential is missing');
 const store=roomStore('rooms');
 async function source(operation,code) {
  const response=await fetch('https://maeul-city-classroom.myhome.chatgpt.site/api/move',{
   method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({operation,code})});
  if(!response.ok)throw Error('Classroom snapshot HTTP '+response.status);
  return response.json();
 }
 async function fetchRoom(code){
  const row=await source('room',code);
  assert.equal(row.code,code);assert.ok(Number.isSafeInteger(row.version));
  const room=JSON.parse(row.body);assert.ok(room.settings && room.students && room.answers && room.villages);
  return row;
 }
 const before=await source('list');
 for(const {code} of before)await fetchRoom(code);
 const frozen=await source('seal');
 for(const {code,version} of frozen){
  const row=await fetchRoom(code);assert.equal(row.version,version);
  if(!await store.read(code))await store.insert(code,row.body,version);
  const stored=await store.read(code);
  if(stored.version!==version||stored.body!==row.body)throw Error('Copied classroom failed integrity verification');
 }
 assert.deepEqual(await source('list'),frozen);
 await put(marker,JSON.stringify({rooms:frozen.length,completed:new Date().toISOString()}),{access:'private',addRandomSuffix:false});
 console.log('Verified exact private copies of '+frozen.length+' classroom records including answers, maps and login credentials');
}

