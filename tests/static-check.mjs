import fs from 'node:fs';
import path from 'node:path';
const root=new URL('..', import.meta.url).pathname;
const allowedExt=new Set(['.html','.js','.css','.md','.txt','.gitignore','.mjs','.json','']);
const privateMarkers=(process.env.SENSITIVE_MARKERS||'').split(',').map(x=>x.trim()).filter(Boolean);
let files=0;
function checkDir(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){if(item.name==='.git'||item.name==='node_modules')continue;const p=path.join(dir,item.name);if(item.isDirectory()){if(/^(private|data|user-data|backups|photos)$/i.test(item.name))throw Error('Forbidden private folder in public source: '+p);checkDir(p);}else{files++;if(!allowedExt.has(path.extname(item.name))||(path.extname(item.name)==='.json'&&item.name!=='package.json'))throw Error('Forbidden extension in public source: '+p);const content=fs.readFileSync(p,'utf8');for(const marker of privateMarkers)if(content.includes(marker))throw Error('Potential personal-data marker in public source: '+p);}}}
checkDir(root);console.log(`PASS: ${files} public source files checked. No private source files found.`);
