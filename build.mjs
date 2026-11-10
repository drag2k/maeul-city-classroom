import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const version = JSON.parse(read('package.json')).version;
const names = ['index.html','guide.html','style.css','qr.js','village-art.js','city-art.js','board.js','paint.js','map-ui.js','lesson.js','sync.js','app.js'];
const assets = Object.fromEntries(names.map(name => ['/'+name, read(name).replaceAll('{{VERSION}}',version)]));
const pdf = fs.readFileSync(new URL('guide.pdf',import.meta.url));
const code = [read('board.js'),read('server-core.js'),'const assets='+JSON.stringify(assets)+';', 'const guidePDF='+JSON.stringify(pdf.toString('base64'))+';', read('worker-body.js')].join('\n');
fs.mkdirSync('dist/server',{recursive:true});
fs.writeFileSync('dist/server/index.js',code);
if (process.argv.includes('--vercel')) {
  fs.mkdirSync('public-build',{recursive:true});
  for (const [path,body] of Object.entries(assets)) fs.writeFileSync('public-build'+path,body);
  fs.writeFileSync('public-build/guide.pdf',pdf);
}
