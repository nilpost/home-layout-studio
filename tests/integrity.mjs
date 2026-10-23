import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/review-history.js';
import '../src/layer-items.js';
import '../src/consistency-review.js';
import '../src/asset-records.js';
import '../src/measurement-anchors.js';

// Execute production function bodies with fabricated state and deferred browser I/O.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function functionCode(name){const line=app.split('\n').find(line=>line.startsWith('function '+name+'(')||line.startsWith('async function '+name+'('));assert.ok(line,'Missing production function '+name);return line;}
function fixture(){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',revision:'v0',name:'Fabricated A',note:'',baseSvg:'<svg/>',items:[],comments:[],photos:[],original:null,objectSettings:{},changeLog:[],layers:{photos:true}};}
function sandbox(extra={}){const notices=[];return vm.createContext({state:fixture(),clone,crypto:webcrypto,Blob,Date,Set,Map,history:[],future:[],LayerItems:globalThis.LayerItems,ReviewHistory:globalThis.ReviewHistory,AssetRecords:globalThis.AssetRecords,MeasurementAnchors:globalThis.MeasurementAnchors,ConsistencyReview:{validateReports(){}},OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},saveLocal(){},notify:message=>notices.push(message),notices,...extra});}
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
console.log('PASS: export snapshot, stale imports, branch identities, project-isolated review retention, atomic history limits, lock dependencies and semantic dimension preservation.');
