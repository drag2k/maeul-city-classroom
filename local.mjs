import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import './build.mjs';
const { default:worker }=await import('./dist/server/index.js');
const sqlite=new DatabaseSync(process.env.CLASSROOM_DB||'classrooms.sqlite');sqlite.exec(readFileSync('drizzle/0000_classrooms.sql','utf8').replace('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
const env={DB:{prepare(sql){return {bind(...params){return {first(){return sqlite.prepare(sql).get(...params)},run(){const result=sqlite.prepare(sql).run(...params);return {meta:{changes:result.changes}}}}}}}}};
const port=Number(process.env.PORT||4173);
createServer(async(req,res)=>{try{const data=[];for await(const chunk of req)data.push(chunk);const u=new URL(req.url,'http://localhost');const r=await worker.fetch(new Request(u,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(data)}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))}catch{res.writeHead(500);res.end()}}).listen(port,'0.0.0.0',()=>{console.log('http://localhost:'+port);for(const n of Object.values(networkInterfaces()).flat())if(n.family==='IPv4'&&!n.internal)console.log('Classroom LAN: http://'+n.address+':'+port)});

