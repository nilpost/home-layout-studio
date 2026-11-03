import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/review-history.js';
import '../src/layer-items.js';
import '../src/consistency-review.js';
import '../src/asset-records.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/opening-bindings.js';
import '../src/original-overlay.js';

// Execute production function bodies with fabricated state and deferred browser I/O.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function functionCode(name){const line=app.split('\n').find(line=>line.startsWith('function '+name+'(')||line.startsWith('async function '+name+'('));assert.ok(line,'Missing production function '+name);return line;}
function fixture(){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated A',note:'',baseSvg:'<svg/>',items:[],comments:[],photos:[],original:null,objectSettings:{},changeLog:[],layers:{photos:true}};}
function sandbox(extra={}){const notices=[];return vm.createContext({state:fixture(),clone,crypto:webcrypto,Blob,Date,Set,Map,history:[],future:[],LayerItems:globalThis.LayerItems,ReviewHistory:globalThis.ReviewHistory,AssetRecords:globalThis.AssetRecords,MeasurementAnchors:globalThis.MeasurementAnchors,MeasurementChains,OpeningBindings,OverlayFootprint,ItemAdjustments,ConsistencyReview:{validateReports(){}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},saveLocal(){},notify:message=>notices.push(message),notices,...extra});}
function load(context,...names){vm.runInContext(names.map(functionCode).join('\n'),context);}
function deferred(){let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};}

{
 const read=deferred();let output;
 const c=sandbox({photoLoad:()=>read.promise,download:(_name,blob)=>output=blob});
 c.state.photos=[{id:'photo-a',assetKey:'asset-a',name:'Fabricated photo'}];
 load(c,'jsonExport');const exporting=c.jsonExport();
 c.state={...fixture(),projectId:'project-b',name:'Fabricated B',baseSvg:'<svg id="b"/>'};
 read.resolve('data:image/jpeg;base64,AAAA');await exporting;
 const backup=JSON.parse(await output.text());
 assert.equal(backup.projectId,'project-a','Backup must retain its starting project');
 assert.equal(backup.baseSvg,'<svg/>');assert.equal(backup.photos[0].id,'photo-a');
}

{
 const store=deferred();let remembered=false;
 const c=sandbox({cancelLandmarkMatch(){},validProject:p=>p,safeSVG:s=>s,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],XMLSerializer:class{serializeToString(s){return s;}},sourceWithIds:s=>s,photoStore:()=>store.promise,remember:()=>remembered=true});
 load(c,'importJSON');const input={...fixture(),photos:[{id:'photo-import',dataUrl:'data:image/jpeg;base64,AAAA'}]};
 const importing=c.importJSON(JSON.stringify(input));c.state.note='Intervening user edit';store.resolve();
 await assert.rejects(importing,/changed/i);assert.equal(c.state.note,'Intervening user edit');assert.equal(remembered,false,'Rejected import must not alter undo history');
}


{
 let remembered=false;
 const c=sandbox({cancelLandmarkMatch(){},safeSVG:s=>s,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{}],XMLSerializer:class{serializeToString(s){return s;}},sourceWithIds:s=>s,parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,selectedRefs:new Set(),remember:()=>remembered=true});
 c.recordChange=(...args)=>globalThis.ReviewHistory.recordChange(c.state,...args);
 load(c,'validProject','importJSON');const input=fixture();
 input.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));
 const before=JSON.stringify(c.state);
 await assert.rejects(c.importJSON(JSON.stringify(input)),/history|capacity|full/i,'Legacy identity migration must not make a valid 2000-event backup unrestorable');
 assert.equal(JSON.stringify(c.state),before,'Rejected legacy migration preserves the live project');assert.equal(remembered,false,'Rejected legacy migration preserves undo history');
}


{
 let saves=0,remembered=false;
 const c=sandbox({DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{}],XMLSerializer:class{serializeToString(){return '<svg id="migrated"/>';}},sourceWithIds:s=>s,sourceHash:s=>s,remember:()=>remembered=true,saveLocal:()=>saves++});
 c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v0',commentIds:[],changes:[]}));
 c.recordChange=(...args)=>globalThis.ReviewHistory.recordChange(c.state,...args);
 load(c,'migrateObjectIds');const before=JSON.stringify(c.state);
 assert.doesNotThrow(()=>c.migrateObjectIds(),'Capacity-limited startup migration must leave the app usable');
 assert.equal(JSON.stringify(c.state),before,'Startup migration must not create an unrestorable 2001st record');assert.equal(saves,0);assert.equal(remembered,false);
}

{
 const store=deferred();let storing;const started=new Promise(resolve=>storing=resolve);let committed=false;
 const c=sandbox({URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL(){}},Image:class{naturalWidth=20;naturalHeight=10;set src(_){queueMicrotask(()=>this.onload());}},document:{createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'data:image/jpeg;base64,AAAA'})},photoStore:()=>{storing();return store.promise;},mutate:fn=>{committed=true;fn();},selectPhoto(){}});
 load(c,'importPhotos');const importing=c.importPhotos([{type:'image/jpeg',size:10,name:'Fabricated.jpg'}]);
 await started;c.state.note='Intervening user edit';store.resolve();await importing;
 assert.equal(committed,false,'A delayed photo import must not commit into changed state');assert.equal(c.state.photos.length,0);assert.match(c.notices.at(-1),/changed/i);
}

{
 let saves=0;const c=sandbox({saveLocal:()=>saves++});load(c,'validProject','mutate','restoreSnapshot');
 assert.equal(c.mutate(()=>{c.state.note='First branch';}),true);const firstToken=c.state.stateToken;
 const undoBody=app.match(/\$\('undo'\)\.onclick=\(\)=>\{(.*?)\};/s)?.[1];assert.ok(undoBody,'Undo handler must be exercised');
 c.cancelLandmarkMatch=()=>{};vm.runInContext('function undo(){'+undoBody+'}',c);c.undo();
 assert.equal(c.state.stateToken,'token-a');assert.equal(c.mutate(()=>{c.state.note='Other branch';}),true);
 assert.equal(c.state.revision,'v1');assert.notEqual(c.state.stateToken,firstToken,'Branches sharing a display revision need different state tokens');
 c.state.changeLog=Array.from({length:2000},()=>({summary:'Fabricated event',revision:'v1',commentIds:[],changes:[]}));
 const before=JSON.stringify(c.state),historyBefore=JSON.stringify(c.history),futureBefore=JSON.stringify(c.future),savesBefore=saves;
 assert.equal(c.mutate(()=>{c.state.changeLog.push({summary:'Overflow event',revision:'v2',commentIds:[],changes:[]});}),false,'Reject the first record beyond supported restore capacity');
 assert.equal(JSON.stringify(c.state),before);assert.equal(JSON.stringify(c.history),historyBefore);assert.equal(JSON.stringify(c.future),futureBefore);assert.equal(saves,savesBefore,'Invalid state must never reach persistence');
}


{
 const R=globalThis.ConsistencyReview;
 const review=(projectId,stateToken,second)=>R.createReport({projectId,stateToken,revision:'v1',sourceHash:'fabricated-source',runAt:new Date(Date.UTC(2026,0,1,0,0,second)).toISOString()});
 const c=sandbox({cancelLandmarkMatch(){}});load(c,'restoreSnapshot');
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name+' handler');vm.runInContext('function '+name+'(){'+body+'}',c);}
 const first=review('project-a','token-a',0),second=review('project-a','token-b',1);
 const before={...fixture(),consistencyReports:[first]};
 c.state={...fixture(),revision:'v1',stateToken:'token-b',consistencyReports:[first,second]};c.history=[clone(before)];
 c.undo();assert.equal(c.state.stateToken,'token-a');
 assert.deepEqual(clone(c.state.consistencyReports),[first,second],'Undo retains both review runs in the same project');
 assert.equal(R.isStale(c.state.consistencyReports[1],{projectId:'project-a',stateToken:'token-a',revision:'v0',sourceHash:'fabricated-source'}),true,'Retained review remains stale for the undone geometry');
 c.redo();assert.equal(c.state.stateToken,'token-b');assert.deepEqual(clone(c.state.consistencyReports),[first,second],'Redo preserves reports without duplication');
 const foreign=review('project-b','token-foreign',2);
 c.state={...fixture(),projectId:'project-b',stateToken:'token-foreign',consistencyReports:[foreign]};c.history=[clone(before)];c.future=[];
 c.undo();assert.deepEqual(clone(c.state.consistencyReports),[first],'Undo across projects never copies foreign reports');
 c.redo();assert.deepEqual(clone(c.state.consistencyReports),[foreign],'Redo across projects never copies the previous project reports');
 const sixty=Array.from({length:60},(_,i)=>review('project-a','token-'+i,i));
 c.state={...fixture(),consistencyReports:sixty.slice(20)};
 const restored=c.restoreSnapshot({...fixture(),consistencyReports:sixty.slice(0,40).reverse()});
 assert.deepEqual(clone(restored.consistencyReports),sixty.slice(10),'Report merge deduplicates, orders by run time and retains the latest 50');
}

{
 const root={localName:'svg',attributes:[{name:'viewBox',value:'0 0 100 100'}]};
 const style={serialized:'<style>.wall{stroke:black}</style>'};
 const doc={documentElement:root,querySelectorAll:()=>[style]};
 const entry={node:{serialized:'<path id="wall" d="M0 0H10"/>',ownerDocument:doc}};
 const c=sandbox({parentsOf:()=>[],XMLSerializer:class{serializeToString(node){return node.serialized;}}});load(c,'sourceSignature');
 const first=c.sourceSignature(entry);style.serialized='<style>.wall{transform:translate(10px,0)}</style>';
 assert.notEqual(c.sourceSignature(entry),first,'A shared stylesheet changes the locked item dependency signature');
 const second=c.sourceSignature(entry);root.attributes[0].value='0 0 200 200';
 assert.notEqual(c.sourceSignature(entry),second,'SVG root attributes affect locked source items');
}

{
 // The DOM query is the boundary here: only semantic-label selection returns this fabricated node.
 const c=sandbox({DOMParser:class{parseFromString(){return {querySelectorAll:selector=>selector.split(',').some(s=>s.trim()==='[data-dimension-value] text')?[{textContent:' 1200 '}]:[]};}}});load(c,'dimensionTexts');
 assert.deepEqual(Array.from(c.dimensionTexts('<svg><g data-dimension-value="1200"><text>1200</text></g></svg>')),['1200'],'Semantic dimension labels require the same preservation check as legacy labels');
}

// Imports preflight their shared item/comment allocator before reading or writing media.
function allocatorContext(){
 const writes={media:0,metadata:0},ui={replaceChildren(){}};
 const c=sandbox({cancelLandmarkMatch(){},safeSVG:s=>s,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],XMLSerializer:class{serializeToString(s){return s;}},sourceWithIds:s=>s,parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,selectedRefs:new Set(['item:before']),selected:'before',zoom:2,photoStore:async()=>{writes.media++;},saveLocal(){writes.metadata++;},photoPointerUp:()=>false,$:()=>ui,round:n=>n,tool:'rect'});
 load(c,'validProject','importJSON','mutate','pointerUp');c.writes=writes;
 return c;
}
function rectangle(id){return {id,kind:'rect',x:0,y:0,w:10,h:10};}
function liveSnapshot(c){return JSON.stringify({state:c.state,history:c.history,future:c.future,selected:c.selected,selectedRefs:[...c.selectedRefs],zoom:c.zoom});}
for(const counter of [9007199254740992,0,-1,1.5,9007199254740991,1e100,null,true,{},'1.5','1e3','Infinity','-1','']){
 const c=allocatorContext(),before=liveSnapshot(c),input={...fixture(),nextId:counter,photos:[{id:'photo-a',name:'Fabricated',dataUrl:'data:image/png;base64,AAAA'}]};
 await assert.rejects(c.importJSON(JSON.stringify(input)),/counter.*invalid|counter.*exhausted/i,'Invalid counter must reject: '+JSON.stringify(counter));
 assert.equal(liveSnapshot(c),before,'Invalid counter must preserve live state and UI/history');
 assert.deepEqual(c.writes,{media:0,metadata:0},'Invalid counter must reject before any media or metadata write');
}
for(const id of ['item-9007199254740990','item-9007199254740991','item-9007199254740992','item-'+('9'.repeat(400))]){
 const c=allocatorContext(),before=liveSnapshot(c),input={...fixture(),nextId:1,items:[rectangle(id)],photos:[{id:'photo-a',name:'Fabricated',dataUrl:'data:image/png;base64,AAAA'}]};
 await assert.rejects(c.importJSON(JSON.stringify(input)),/suffix.*invalid|suffix.*exhausted/i);
 assert.equal(liveSnapshot(c),before,'Unusable suffix must preserve state, UI and history');assert.deepEqual(c.writes,{media:0,metadata:0});
}
for(const counter of [undefined,1,'0002',40]){
 const c=allocatorContext(),input={...fixture(),...(counter===undefined?{}:{nextId:counter}),items:[rectangle('item-12')],comments:[{id:'comment-20',n:1,x:1,y:1,text:'Fabricated note'}],photos:[{id:'photo-999999999999999999999999',name:'Fabricated UUID namespace',dataUrl:'data:image/png;base64,AAAA'}]};
 await c.importJSON(JSON.stringify(input));const first=Math.max(Number(counter)||1,21);assert.equal(c.state.nextId,first);
 for(let i=0;i<2;i++){c.active={type:'draw',start:{x:20,y:20},p:{x:40,y:40},color:'#123456'};c.pointerUp({type:'pointerup'});}
 assert.deepEqual(Array.from(c.state.items.slice(-2),o=>o.id),['item-'+first,'item-'+(first+1)],'Actual native pointer commits must allocate distinct IDs');
 assert.equal(c.state.nextId,first+2);assert.equal(c.writes.metadata,3,'Import and two actual creations persist exactly once each');assert.equal(c.writes.media,1,'Photos use UUID namespace and do not change object allocator');
}
{
 const c=allocatorContext();await c.importJSON(JSON.stringify({...fixture(),nextId:Number.MAX_SAFE_INTEGER-2}));
 c.active={type:'draw',start:{x:20,y:20},p:{x:40,y:40},color:'#123456'};c.pointerUp({type:'pointerup'});
 assert.equal(c.state.nextId,Number.MAX_SAFE_INTEGER-1);const before=liveSnapshot(c),writes=c.writes.metadata;
 c.active={type:'draw',start:{x:20,y:20},p:{x:40,y:40},color:'#123456'};c.pointerUp({type:'pointerup'});
 assert.equal(liveSnapshot(c),before,'An allocation reaching an exhausted counter must roll back rather than persist an unsafe counter or duplicate ID');assert.equal(c.writes.metadata,writes);assert.match(c.notices.at(-1),/counter.*exhausted/i);
}
for(const counter of [9007199254740991,9007199254740992,1.25,0]){
 const c=allocatorContext(),before=liveSnapshot(c);assert.equal(c.mutate(()=>{c.state.nextId=counter;}),false);assert.equal(liveSnapshot(c),before);assert.equal(c.writes.metadata,0,'Mutation cannot persist an invalid or exhausted allocator');
}
// Complete every embedded-media preflight before storing the first imported asset.
function mediaFixture(){return {...fixture(),nextId:1,photos:[{id:'photo-a',assetKey:'old-photo-a',name:'Fabricated photo A',x:null,y:null,angle:0,fov:60,range:100,note:'Camera A',dataUrl:'data:image/png;base64,AAAA'},{id:'photo-b',assetKey:'old-photo-b',name:'Fabricated photo B',x:10,y:20,angle:90,fov:45,range:200,note:'Camera B',dataUrl:'data:image/jpeg;base64,BBBB'}],original:{name:'Fabricated original.pdf',kind:'pdf',assetKey:'old-source',rasterKey:'old-raster',page:1,pageCount:2,x:0,y:0,w:100,h:80,rotation:0,opacity:.5,dataUrl:'data:application/pdf;base64,CCCC',rasterDataUrl:'data:image/png;base64,DDDD'}};}
function mediaContext(){
 const c=allocatorContext(),media=new Map(),metadata=[];
 c.OriginalOverlay=globalThis.OriginalOverlay;load(c,'validatePhotos');
 c.photoStore=async(key,data)=>{c.writes.media++;media.set(key,data);};
 c.saveLocal=()=>{c.writes.metadata++;metadata.push(clone(c.state));return true;};
 c.media=media;c.metadata=metadata;return c;
}
for(const [name,change,error] of [
 ['missing later photo',p=>delete p.photos[1].dataUrl,/photo.*missing/i],
 ['oversize later photo',p=>p.photos[1].dataUrl='data:image/png;base64,'+'A'.repeat(8_000_000),/photo.*large/i],
 ['missing original file',p=>delete p.original.dataUrl,/original.*missing/i],
 ['missing original raster',p=>delete p.original.rasterDataUrl,/original.*missing/i],
 ['invalid later photo MIME',p=>p.photos[1].dataUrl='data:text/html;base64,AAAA',/raster photos/i],
 ['invalid original MIME',p=>p.original.dataUrl='data:text/html;base64,AAAA',/original file data/i],
 ['oversize original file',p=>p.original.dataUrl='data:application/pdf;base64,'+'A'.repeat(28_000_000),/original file data/i],
 ['oversize original raster',p=>p.original.rasterDataUrl='data:image/png;base64,'+'A'.repeat(18_000_000),/original preview data/i]
]){
 const c=mediaContext(),before=liveSnapshot(c),p=mediaFixture();change(p);
 await assert.rejects(c.importJSON(JSON.stringify(p)),error,name+' must reject');
 assert.equal(liveSnapshot(c),before,name+' preserves state, history and selection');
 assert.deepEqual(c.writes,{media:0,metadata:0},name+' must reject before the first media or metadata write');
 assert.equal(c.media.size,0,name+' cannot leave imported media records');
}
{
 const c=mediaContext(),p=mediaFixture(),before=clone(c.state);await c.importJSON(JSON.stringify(p));
 assert.deepEqual(c.writes,{media:4,metadata:1});assert.deepEqual(clone(c.history),[before]);assert.equal(c.future.length,0);
 const keys=[...c.state.photos.map(p=>p.assetKey),c.state.original.assetKey,c.state.original.rasterKey];
 assert.equal(new Set(keys).size,4);assert.ok(keys.every(k=>!k.startsWith('old-')),'Import generates distinct asset identities');
 assert.deepEqual(keys.map(k=>c.media.get(k)),[p.photos[0].dataUrl,p.photos[1].dataUrl,p.original.dataUrl,p.original.rasterDataUrl]);
 let exported;c.photoLoad=async key=>c.media.get(key);c.download=(_name,blob)=>exported=blob;load(c,'jsonExport');await c.jsonExport();
 const output=JSON.parse(await exported.text());for(const [key,value] of Object.entries(p))if(!['photos','original'].includes(key))assert.deepEqual(output[key],value,'Complete import/export retains project field '+key);for(let i=0;i<2;i++){const {assetKey,...photo}=output.photos[i],{assetKey:oldKey,...expected}=p.photos[i];assert.deepEqual(photo,expected);}
 const {assetKey,rasterKey,...original}=output.original,{assetKey:oldSource,rasterKey:oldRaster,...expectedOriginal}=p.original;
 assert.deepEqual(original,expectedOriginal,'Full import/export retains original alignment, metadata and both media strings');
 assert.deepEqual(c.metadata,[clone(c.state)],'Only the complete imported project is saved');
}
{
 const c=mediaContext(),p=mediaFixture(),gate=deferred();let first=true;
 const store=c.photoStore;c.photoStore=async(...args)=>{if(first){first=false;await gate.promise;}return store(...args);};
 const importing=c.importJSON(JSON.stringify(p));c.state.note='Fabricated concurrent edit';const before=liveSnapshot(c);gate.resolve();
 await assert.rejects(importing,/changed during import/i);assert.equal(liveSnapshot(c),before);assert.equal(c.writes.metadata,0,'Completeness preflight must retain the existing stale-state guard');
}
{
 const c=mediaContext(),p=mediaFixture(),before=liveSnapshot(c);c.saveLocal=()=>false;
 await assert.rejects(c.importJSON(JSON.stringify(p)),/storage unavailable/i);assert.equal(liveSnapshot(c),before,'Metadata failure still rolls imported state back');assert.equal(c.writes.metadata,0);
}
console.log('PASS: export snapshot, stale imports, branch identities, project-isolated review retention, atomic history limits, lock dependencies, semantic dimension preservation and preflighted safe object ID allocation and complete embedded-media preflight.');
