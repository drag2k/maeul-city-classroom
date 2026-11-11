import assert from 'node:assert/strict';
import {checkClassroom} from './classroom-scenario.mjs';
await checkClassroom(async(action,body,token='',expected=200)=>{
 const response=await fetch('https://maeul-city-classroom.vercel.app/api/'+action,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,expected,action+' returned '+response.status);
 return response.json();
});
