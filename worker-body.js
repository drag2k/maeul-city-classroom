export default {async fetch(req,env){
 const path=new URL(req.url).pathname;
 const head={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'};
 if(path.startsWith('/api/')){try{return Response.json(await api(req,env),{headers:head})}catch(e){return Response.json({error:e.status?e.message:'저장소에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'},{status:e.status||500,headers:head})}}
 if(path==='/guide.pdf')return new Response(Uint8Array.from(atob(guidePDF),c=>c.charCodeAt(0)),{headers:{...head,'Content-Type':'application/pdf'}});
 const key=path==='/'?'/index.html':path;if(!Object.hasOwn(assets,key))return new Response('Not found',{status:404});
 return new Response(assets[key],{headers:{...head,'Content-Type':(key.endsWith('.js')?'text/javascript':key.endsWith('.css')?'text/css':'text/html')+'; charset=utf-8'}})
}};

