import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const version = JSON.parse(read('package.json')).appVersion;
const names = ['index.html','guide.html','manifest.webmanifest','questions.js','assessment-ui.js','style.css','qr.js','village-art.js','city-art.js','board.js','paint.js','map-ui.js','lesson.js','sync.js','app.js'];
const assets = Object.fromEntries(names.map(name => ['/'+name, read(name).replaceAll('{{VERSION}}',version)]));
const pdf = fs.readFileSync(new URL('guide.pdf',import.meta.url));
const binaryAssets = {'/guide.pdf':pdf.toString('base64')};
for (const {src} of JSON.parse(assets['/manifest.webmanifest']).icons) {
  binaryAssets[src] = fs.readFileSync(new URL('.'+src,import.meta.url)).toString('base64');
}
const code = [read('questions.js'),read('board.js'),read('server-core.js'),'const assets='+JSON.stringify(assets)+';', 'const binaryAssets='+JSON.stringify(binaryAssets)+';', read('worker-body.js')].join('\n');
fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js',code);
if (process.argv.includes('--vercel')) {
  fs.mkdirSync('lib',{recursive:true});
  fs.writeFileSync('lib/classroom-api.mjs',[read('questions.js'),read('board.js'),read('server-core.js'),'export {api};'].join('\n'));
  fs.mkdirSync('public-build',{recursive:true});
  for (const [path,body] of Object.entries(assets)) fs.writeFileSync('public-build'+path,body);
  fs.mkdirSync('public-build/icons',{recursive:true});
  for (const [path,encoded] of Object.entries(binaryAssets)) fs.writeFileSync('public-build'+path,Buffer.from(encoded,'base64'));
}

if(process.argv.includes('--vercel') && process.env.VERCEL==='1') {
  const {database}=await import('./lib/database.mjs');
  const {schemaSql}=await import('./lib/postgres-rooms.mjs');
  const db=database();
  try { await db.query(schemaSql); } finally { await db.end(); }
  if(process.env.VERCEL_ENV==='production'){
    const {migrateRooms}=await import('./scripts/migrate-rooms.mjs');
    await migrateRooms();
  }
}
