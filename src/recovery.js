/* Standalone read-only backup: never load editor startup or alter stored data. */
(() => {
'use strict';
const KEY='home-layout-studio.public-editor.v1',DB='home-layout-studio.private-photos',STORE='images';
const MAX_JSON=80_000_000,MAX_PHOTO=8_000_000,MAX_SOURCE=28_000_000,MAX_RASTER=18_000_000;
const $=id=>document.getElementById(id),inspectButton=$('recovery-inspect'),exportButton=$('recovery-export');
let inspected=null,busy=false,generation=0;
const notice=message=>{$('recovery-status').textContent=message;};
function invalidate(message){generation++;inspected=null;exportButton.disabled=true;if(message)notice(message);}
function object(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function key(value){return typeof value==='string'&&value.length>0;}
// JSON.parse can silently discard duplicate keys or round unknown numeric fields.
// Accept equivalent decimal spellings, but never export a changed numeric value.
function decimalIdentity(token){
 const match=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token),fraction=match[3]||'';let digits=(match[2]+fraction).replace(/^0+/,'');if(!digits)return '0';const trailing=/0+$/.exec(digits)?.[0].length||0;digits=trailing?digits.slice(0,-trailing):digits;return match[1]+digits+'e'+(Number(match[4]||0)-fraction.length+trailing);
}
function assertLosslessJSON(raw){
 const tokens=/"(?:[^"\\]|\\.)*"|[{}\[\],:]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g,stack=[];let match,count=0;
 while((match=tokens.exec(raw))){if(++count>5_000_000)throw Error('Saved metadata exceeds the supported structure limit. Nothing was changed.');const token=match[0],frame=stack.at(-1);
  if(token==='{'){if(stack.length>=64)throw Error('Saved metadata exceeds the supported structure limit. Nothing was changed.');stack.push({keys:new Set(),keyExpected:true});}
  else if(token==='['){if(stack.length>=64)throw Error('Saved metadata exceeds the supported structure limit. Nothing was changed.');stack.push(null);}
  else if(token==='}'||token===']')stack.pop();
  else if(token===','){if(frame)frame.keyExpected=true;}
  else if(token[0]==='"'&&frame?.keyExpected){const name=JSON.parse(token);if(frame.keys.has(name))throw Error('Saved metadata contains ambiguous duplicate fields. Nothing was changed.');frame.keys.add(name);frame.keyExpected=false;}
  else if(/^-?\d/.test(token)){const value=Number(token);if(!Number.isFinite(value)||Object.is(value,-0)||decimalIdentity(token)!==decimalIdentity(JSON.stringify(value)))throw Error('Saved metadata contains a number that cannot be copied unchanged. Nothing was changed.');}
 }
}
function parseMetadata(raw){
 if(typeof raw!=='string'||!raw.length)throw Error('No saved project was found at this browser address. Nothing was changed.');
 if(raw.length>MAX_JSON)throw Error('Saved metadata exceeds the supported backup limit. Nothing was changed.');
 let data;try{data=JSON.parse(raw);}catch{throw Error('Saved metadata is not readable JSON. Nothing was changed; preserve this browser storage.');}
 if(!object(data)||data.schemaVersion!==1)throw Error('This saved project format is unsupported. Nothing was changed.');
 assertLosslessJSON(raw);
 if(!Array.isArray(data.photos)||data.photos.length>200)throw Error('Saved photo references are unreadable. Nothing was changed.');
 const ids=new Set();for(const photo of data.photos){if(!object(photo)||!key(photo.id)||ids.has(photo.id)||!key(photo.assetKey))throw Error('A saved photo reference is missing or ambiguous. Nothing was changed.');ids.add(photo.id);}
 if(data.original!==undefined&&data.original!==null&&(!object(data.original)||!key(data.original.assetKey)||!key(data.original.rasterKey)||!['pdf','image','svg'].includes(data.original.kind)))throw Error('The saved original-plan reference is unreadable. Nothing was changed.');
 return data;
}
function currentRaw(){try{return localStorage.getItem(KEY);}catch{throw Error('Saved browser data could not be read. Check browser access and try Inspect again. Nothing was changed.');}}
function assertCurrent(snapshot,token){if(token!==generation||currentRaw()!==snapshot.raw)throw Error('Saved project changed during backup. Inspect again before exporting. Nothing was changed.');}
function checkMedia(value,role,kind){
 const limit=role==='photo'?MAX_PHOTO:role==='raster'?MAX_RASTER:MAX_SOURCE;
 if(typeof value!=='string'||value.length>limit)throw Error('Referenced media is missing, unreadable or exceeds the backup limit. No backup was exported.');
 const match=/^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
 const raster=['image/png','image/jpeg','image/webp'];
 const accepted=role==='source'?(kind==='pdf'?['application/pdf']:kind==='svg'?['image/svg+xml']:raster):raster;
 if(!match||!accepted.includes(match[1])||!match[2].length||match[2].length%4!==0)throw Error('Referenced media has an unsupported saved format. No backup was exported.');
 return value;
}
async function readMedia(keys){
 if(!keys.length)return new Map();
 if(typeof indexedDB==='undefined'||typeof indexedDB.databases!=='function')throw Error('This browser cannot confirm existing media storage without creating it. No backup was exported.');
 let databases;try{databases=await indexedDB.databases();}catch{throw Error('Existing media storage could not be inspected. No backup was exported.');}
 const existing=databases.filter(entry=>entry&&entry.name===DB);
 if(existing.length!==1||!Number.isInteger(existing[0].version)||existing[0].version<1)throw Error('Referenced media storage is missing or unavailable. No backup was exported.');
 return new Promise((resolve,reject)=>{
  let db=null,request,finished=false;
  const timer=setTimeout(()=>finish(Error('Media storage is busy or unavailable. Close other editor tabs and Inspect again. No backup was exported.')),10000);
  function finish(error,result){if(finished)return;finished=true;clearTimeout(timer);if(db)db.close();if(error)reject(error);else resolve(result);}
  try{request=indexedDB.open(DB,existing[0].version);}catch{finish(Error('Existing media storage could not be opened. No backup was exported.'));return;}
  request.onupgradeneeded=()=>{try{request.transaction.abort();}catch{}finish(Error('Media storage changed or is missing. Its creation or upgrade was cancelled. No backup was exported.'));};
  request.onerror=()=>finish(Error('Existing media storage could not be opened. No backup was exported.'));
  request.onblocked=()=>finish(Error('Media storage is busy. Close other editor tabs and Inspect again. No backup was exported.'));
  request.onsuccess=()=>{
   db=request.result;if(finished){db.close();return;}
   db.onversionchange=()=>finish(Error('Media storage changed during backup. Inspect again. No backup was exported.'));
   if(db.version!==existing[0].version||!db.objectStoreNames.contains(STORE)){finish(Error('Referenced media storage is missing or changed. No backup was exported.'));return;}
   let transaction;const result=new Map();
   try{transaction=db.transaction(STORE,'readonly');transaction.onabort=()=>finish(Error('Media reading was interrupted. No backup was exported.'));transaction.onerror=()=>finish(Error('Referenced media could not be read. No backup was exported.'));transaction.oncomplete=()=>finish(null,result);const store=transaction.objectStore(STORE);for(const assetKey of keys){const read=store.get(assetKey);read.onsuccess=()=>{result.set(assetKey,read.result);};read.onerror=()=>finish(Error('Referenced media could not be read. No backup was exported.'));}}
   catch{finish(Error('Referenced media could not be read. No backup was exported.'));}
  };
 });
}
function inspect(){
 if(busy)return false;invalidate();
 try{const raw=currentRaw(),data=parseMetadata(raw);inspected={raw,data};$('recovery-summary').textContent='Saved metadata found: '+data.photos.length+' photo reference'+(data.photos.length===1?'':'s')+(data.original?' and an original plan.':'; no original plan reference.');exportButton.disabled=false;notice('Metadata inspected. Export will read every referenced media file before preparing a download. No saved data was changed.');return true;}
 catch(error){$('recovery-summary').textContent='A complete backup is not ready.';notice(error.message);return false;}
}
async function exportBackup(){
 if(busy)return false;if(!inspected){notice('Inspect the saved project before exporting.');return false;}
 const snapshot=inspected,token=generation;busy=true;inspectButton.disabled=true;exportButton.disabled=true;notice('Reading existing saved files. Keep this page open. No stored data is being changed.');
 try{
  assertCurrent(snapshot,token);const keys=[...new Set([...snapshot.data.photos.map(photo=>photo.assetKey),...(snapshot.data.original?[snapshot.data.original.assetKey,snapshot.data.original.rasterKey]:[])])],media=await readMedia(keys);assertCurrent(snapshot,token);
  const photos=snapshot.data.photos.map(photo=>{const dataUrl=checkMedia(media.get(photo.assetKey),'photo');if(Object.hasOwn(photo,'dataUrl')&&photo.dataUrl!==dataUrl)throw Error('Saved photo bytes conflict with their reference. No backup was exported.');return {...photo,dataUrl};});
  let original=snapshot.data.original;if(original){const dataUrl=checkMedia(media.get(original.assetKey),'source',original.kind),rasterDataUrl=checkMedia(media.get(original.rasterKey),'raster');if(Object.hasOwn(original,'dataUrl')&&original.dataUrl!==dataUrl||Object.hasOwn(original,'rasterDataUrl')&&original.rasterDataUrl!==rasterDataUrl)throw Error('Saved original-plan bytes conflict with their references. No backup was exported.');original={...original,dataUrl,rasterDataUrl};}
  const data={...snapshot.data,photos,...(Object.hasOwn(snapshot.data,'original')?{original}:{}),exportedAt:new Date().toISOString(),securityNotice:'Contains private floorplan and annotations; never commit to a public repository.'};
  const json=JSON.stringify(data,null,2);if(json.length>MAX_JSON)throw Error('The complete backup exceeds the supported project import limit. No backup was exported.');assertCurrent(snapshot,token);
  const blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  try{link.href=url;link.download='layout-recovery-private-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);assertCurrent(snapshot,token);link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  notice('Private backup download requested. Verify the downloaded file before opening or changing the editor. No saved data was changed.');return true;
 }catch(error){invalidate();notice(error.message);return false;}
 finally{busy=false;inspectButton.disabled=false;exportButton.disabled=!inspected;}
}
inspectButton.onclick=inspect;exportButton.onclick=exportBackup;
window.addEventListener('storage',event=>{if(event.key===KEY||event.key===null)invalidate('Saved data changed in another tab. Inspect again before exporting.');});
})();
