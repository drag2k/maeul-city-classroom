import pkg from '../package.json' with {type:'json'};
import { api } from '../lib/classroom-api.mjs';
import { roomStore } from '../lib/blob-rooms.mjs';

export default async function handle(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const action=req.query.action;
    if(typeof action!=='string'||!/^[a-z]+$/.test(action))return res.status(404).json({error:'지원하지 않는 기능입니다.'});
    if(action==='features' && req.method==='GET')return res.status(200).json({version:pkg.version,customQuestions:true,storage:'vercel-private'});
    if(req.method!=='POST')return res.status(405).json({error:'POST 요청을 사용하세요.'});
    const request=new Request('https://classroom.local/api/'+action,{method:'POST',headers:{Authorization:req.headers.authorization||''},body:typeof req.body==='string'?req.body:JSON.stringify(req.body??{})});
    const result=await api(request,{rooms:roomStore()});
    return res.status(200).json(result);
  } catch(err) {
    if(!err.status)console.error('Classroom storage error',err.name);
    return res.status(err.status||500).json({error:err.status?err.message:'수업 저장소에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.'});
  }
}

