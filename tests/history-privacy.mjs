import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const root=new URL('..',import.meta.url).pathname;
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:30*1024*1024});
const allowed=new Set(['.html','.js','.css','.md','.txt','.gitignore','.mjs','.yml','']);
const markers=(process.env.SENSITIVE_MARKERS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
// Review human-readable files only. Personal project assets never belong in history.
function check(name,bytes){if(name!=='package.json'&&!allowed.has(path.extname(name)))throw Error('Unreviewed public file type: '+name);if(/(^|\/)(private|photos|data|exports|backups|user-data)(\/|$)|\.private\.|\.env/i.test(name))throw Error('Private filename: '+name);if(bytes.includes(0))throw Error('Binary public file: '+name);const text=bytes.toString('utf8').toLowerCase();for(const marker of markers)if(text.includes(marker))throw Error('Sensitive marker in '+name);if(/-----begin (?:rsa |ec |openssh )?private key-----|\bgh[pousr]_[a-z0-9]{25,}|\bsk-(?:proj-)?[a-z0-9_-]{30,}/i.test(text))throw Error('Credential-like content: '+name);}
const commits=git('rev-list','--all').toString().trim().split('\n').filter(Boolean);let blobs=0;const seen=new Set();
for(const commit of commits){for(const row of git('ls-tree','-r',commit).toString().trim().split('\n')){if(!row)continue;const m=row.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/);if(!m||!(m[1]==='100644'||(m[1]==='100755'&&m[3]==='.githooks/pre-push')))throw Error('Unexpected Git entry');const [, ,sha,name]=m;if(seen.has(sha+name))continue;seen.add(sha+name);check(name,git('cat-file','blob',sha));blobs++;}}
for(const name of git('ls-files','-z').toString().split('\0').filter(Boolean))check(name,fs.readFileSync(path.join(root,name)));
console.log(`PASS: ${commits.length} commits and ${blobs} historical file versions; tracked worktree also checked.`);
