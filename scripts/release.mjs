import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const version = JSON.parse(readFileSync('package.json')).appVersion;
const tag = 'v' + version;
if (process.argv[2] !== tag) throw Error('사용자가 확인한 버전을 지정하세요. 현재 후보 '+tag);
const git = (...args) => execFileSync('git', args, {encoding:'utf8'}).trim();
const remote = git('remote').split(/\s+/).includes('github') ? 'github' : 'origin';
if (!/^(https:\/\/github\.com\/|git@github\.com:)/.test(git('remote','get-url',remote))) throw Error('GitHub 저장소를 github 원격으로 연결하세요.');
if (git('status','--porcelain')) throw Error('배포할 변경 사항을 검토하고 커밋하세요.');
execFileSync(process.execPath,['build.mjs','--vercel'],{stdio:'inherit'});
execFileSync(process.execPath,['tests/classroom.mjs'],{stdio:'inherit'});
if (git('tag','--list',tag)) {
  if(git('rev-list','-n','1',tag)!==git('rev-parse','HEAD')) throw Error('이 버전이 이미 다른 커밋에 사용됐습니다.');
} else git('tag','-a',tag,'-m',tag);
git('push','--atomic',remote,'HEAD:refs/heads/main','refs/tags/'+tag);
console.log('GitHub main 및 '+tag+' 업로드 완료. 연결된 Vercel 프로젝트에서 배포 상태를 확인하세요.');
