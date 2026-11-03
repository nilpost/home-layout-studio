import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Real export/import functions; fabricated media and browser adapters only.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const code=name=>{const line=app.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));assert.ok(line,'Missing '+name);return line;};
const clone=value=>JSON.parse(JSON.stringify(value));
const LIMIT=80_000_000, prefix='data:image/png;base64,';
// Captures the exact production serialization without allocating another large byte buffer.
class TextBlob{constructor(parts){this.textValue=parts.join('');}async text(){return this.textValue;}}
function harness(){
 const media=new Map(),downloads=[],notices=[];let writes=0,stores=0;
 const state={schemaVersion:1,projectId:'fabricated-project',stateToken:'fabricated-token',name:'Fabricated backup',revision:'v1',note:'Preserve 日本語 and "escaped" text\n',baseSvg:'<svg/>',items:[],comments:[],photos:[],original:null,layers:{base:true},nextId:1};
 const c=vm.createContext({state,clone,crypto:webcrypto,Blob:TextBlob,Date,history:[],future:[],selected:'before',selectedRefs:new Set(['before']),zoom:2,cancelLandmarkMatch(){},validProject:p=>p,safeSVG:s=>s,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,AssetRecords:{validate:()=>[]},MeasurementAnchors:{validate:()=>[]},MeasurementChains:{validate:()=>[]},OpeningBindings:{validate:()=>[]},photoLoad:async key=>media.get(key),photoStore:async(key,data)=>{stores++;media.set(key,data);},saveLocal(){writes++;return true;},render(){},notify:text=>notices.push(text),download:(name,blob)=>downloads.push({name,blob})});
 vm.runInContext(['jsonExport','importJSON'].map(code).join('\n'),c);
 return {c,media,downloads,notices,get writes(){return writes;},get stores(){return stores;}};
}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future,selection:[...h.c.selectedRefs],selected:h.c.selected,zoom:h.c.zoom});}
function addPhoto(h,id,payload){h.c.state.photos.push({id,assetKey:id,name:'Fabricated '+id,x:null,y:null,angle:0,fov:60,range:100,note:''});h.media.set(id,payload);}
function serializedSize(h){const data={...clone(h.c.state),photos:h.c.state.photos.map(p=>({...p,dataUrl:h.media.get(p.assetKey)})),original:h.c.state.original?{...h.c.state.original,dataUrl:h.media.get(h.c.state.original.assetKey),rasterDataUrl:h.media.get(h.c.state.original.rasterKey)}:null,exportedAt:'2026-01-01T00:00:00.000Z',securityNotice:'Contains private floorplan and annotations; never commit to a public repository.'};return JSON.stringify(data,null,2).length;}
function sized(h,target){for(let i=0;i<11;i++)addPhoto(h,'photo-'+i,prefix+'A'.repeat(7_000_000));addPhoto(h,'photo-last',prefix);const missing=target-serializedSize(h);assert.ok(missing>0&&missing<8_000_000-prefix.length);h.media.set('photo-last',prefix+'A'.repeat(missing));assert.equal(serializedSize(h),target);assert.ok([...h.media.values()].every(v=>v.length<8_000_000));}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('aggregate over-limit media rejects export visibly without writes or a partial download',async()=>{
 const h=harness();sized(h,LIMIT+1);const before=snapshot(h);await h.c.jsonExport();if(h.downloads.length){const text=await h.downloads[0].blob.text();assert.equal(text.length,LIMIT+1);await assert.rejects(h.c.importJSON(text),/80 MB limit/);}assert.equal(h.downloads.length,0);assert.match(h.notices.at(-1),/80.*import limit|import limit.*80/i);assert.equal(snapshot(h),before);assert.equal(h.writes,0);assert.equal(h.stores,0);
});
test('exact character boundary exports despite larger UTF8 byte size; next import passes size gate',async()=>{
 const h=harness();sized(h,LIMIT);const before=snapshot(h);await h.c.jsonExport();assert.equal(h.downloads.length,1);const text=await h.downloads[0].blob.text();assert.equal(text.length,LIMIT);assert.ok(Buffer.byteLength(text)>LIMIT,'Import limit counts JS characters, not UTF8 bytes');assert.ok(text.includes('日本語'));assert.ok(text.includes('\\"escaped\\"'));assert.equal(snapshot(h),before);assert.equal(h.writes,0);assert.equal(h.stores,0);
 h.c.validProject=()=>{throw Error('Fabricated validation reached after size gate');};await assert.rejects(h.c.importJSON(text),/validation reached/);
});
test('ordinary complete export/import preserves all supplied metadata and exact media',async()=>{
 const h=harness();addPhoto(h,'photo-a',prefix+'AAAA');h.c.state.original={name:'Fabricated.pdf',kind:'pdf',assetKey:'source',rasterKey:'raster',page:1,pageCount:1,x:0,y:0,w:100,h:100,rotation:0,opacity:.5};h.media.set('source','data:application/pdf;base64,BBBB');h.media.set('raster',prefix+'CCCC');const before=clone(h.c.state);await h.c.jsonExport();assert.equal(h.downloads.length,1);const text=await h.downloads[0].blob.text(),out=JSON.parse(text);assert.equal(out.photos[0].dataUrl,prefix+'AAAA');assert.equal(out.original.dataUrl,'data:application/pdf;base64,BBBB');assert.equal(out.original.rasterDataUrl,prefix+'CCCC');await h.c.importJSON(text);assert.equal(h.writes,1);assert.equal(h.stores,3);for(const [k,v]of Object.entries(before))if(!['photos','original'].includes(k))assert.deepEqual(clone(h.c.state[k]),v,'Metadata retained: '+k);const {assetKey:oldKey,...photo}=before.photos[0],{assetKey:newKey,...restored}=h.c.state.photos[0];assert.notEqual(newKey,oldKey);assert.deepEqual(clone(restored),photo);assert.equal(h.media.get(newKey),prefix+'AAAA');assert.equal(h.media.get(h.c.state.original.assetKey),'data:application/pdf;base64,BBBB');assert.equal(h.media.get(h.c.state.original.rasterKey),prefix+'CCCC');const {assetKey:oldSource,rasterKey:oldRaster,...original}=before.original,{assetKey:newSource,rasterKey:newRaster,...restoredOriginal}=h.c.state.original;assert.notEqual(newSource,oldSource);assert.notEqual(newRaster,oldRaster);assert.deepEqual(clone(restoredOriginal),original);
});
test('export keeps starting snapshot while media awaits, without overwriting intervening edits',async()=>{
 const h=harness();addPhoto(h,'photo-a',prefix+'AAAA');let release;h.c.photoLoad=()=>new Promise(resolve=>release=resolve);const exporting=h.c.jsonExport();h.c.state.note='Intervening fabricated edit';release(prefix+'AAAA');await exporting;assert.equal(h.downloads.length,1);const out=JSON.parse(await h.downloads[0].blob.text());assert.match(out.note,/Preserve 日本語/);assert.equal(h.c.state.note,'Intervening fabricated edit');assert.equal(h.writes,0);assert.equal(h.stores,0);
});
for(const [name,prepare,pattern]of [
 ['missing photo',h=>addPhoto(h,'photo-a',undefined),/Photo missing/],
 ['missing original preview',h=>{h.c.state.original={assetKey:'source',rasterKey:'raster'};h.media.set('source','data:application/pdf;base64,AAAA');},/Original reference is missing/],
 ['media read failure',h=>{addPhoto(h,'photo-a',prefix+'AAAA');h.c.photoLoad=async()=>{throw Error('Fabricated storage failure');};},/Fabricated storage failure/]
])test(name+' still rejects without download or project writes',async()=>{const h=harness();prepare(h);const before=snapshot(h);await h.c.jsonExport();assert.equal(h.downloads.length,0);assert.match(h.notices.at(-1),pattern);assert.equal(snapshot(h),before);assert.equal(h.writes,0);assert.equal(h.stores,0);});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' backup size failure(s)');console.log('PASS: '+cases.length+' production backup size cases; exact 80M serialized character limit, aggregate media, UTF8/escaping, complete roundtrip, snapshot and media failures. Native browser remains separate acceptance.');
