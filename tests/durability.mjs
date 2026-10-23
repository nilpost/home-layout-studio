import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/asset-records.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';

// Real workflow functions; only browser storage, rendering and fabricated SVG input are stubbed.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=v=>JSON.parse(JSON.stringify(v));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
function fixture(patch={}){return {schemaVersion:1,projectId:'project-a',stateToken:'token-a',name:'Fabricated project',revision:'v0',baseSvg:'<svg/>',viewBox:[0,0,100,100],items:[{id:'item-a',kind:'rect',x:0,y:0,w:10,h:10}],comments:[],photos:[],original:null,objectSettings:{},assets:[],consistencyReports:[],changeLog:[],note:'before',nextId:1,layers:{base:true,photos:true},...patch};}
function context(){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,{textContent:'',replaceChildren(){},value:''});return ui.get(id);};
 const storage={fail:false,text:JSON.stringify(fixture()),writes:0,attempts:0};
 const c=vm.createContext({KEY:'fabricated-key',state:fixture(),history:[],future:[fixture({note:'Existing redo'})],clone,crypto:webcrypto,Blob,Date,Set,Map,storageWriteFailed:false,$:get,localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail){const error=new Error('Fabricated storage quota exceeded');error.name='QuotaExceededError';throw error;}storage.text=text;storage.writes++;}},AssetRecords,MeasurementAnchors,MeasurementChains,LayerItems,ReviewHistory,ConsistencyReview,OriginalOverlay:{validate(){}},validatePhotos(){},assertSourceLocks(){},render(){},cancelLandmarkMatch(){},chooseTool(){},reviewOptions(){},photoMode:false,selected:'item-a',selectedRefs:new Set(['item:item-a']),zoom:2,active:null,round:n=>n,confirm:()=>true,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],safeSVG:s=>s,sourceWithIds:s=>s,XMLSerializer:class{serializeToString=s=>s;},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,photoStore:async()=>{},fresh:()=>fixture({projectId:'project-new',stateToken:'token-new',note:'new project'}),report:()=>({segments:0,walls:0,fixtures:0,issues:[],unsupported:[],dimensionAudit:[]})});
 c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 c.storage=storage;
 for(const name of ['notify','saveLocal','restoreSnapshot','remember','validProject','mutate','photoPointerUp','pointerUp','migrateObjectIds','sourceHash','reviewContext','runConsistencyReview','importJSON'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo','new-project']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name+' handler');vm.runInContext('function '+(name==='new-project'?'newProject':name)+'(){'+body+'}',c);}
 return c;
}
function snapshot(c){return JSON.stringify({state:c.state,history:c.history,future:c.future});}
function disk(c){return JSON.parse(c.storage.text);}
const cases=[];function test(name,run){cases.push({name,run});}

test('storage failure stays visible after unrelated notification, successful retry clears it',()=>{
 const c=context();c.storage.fail=true;c.state.layers.base=false;
 assert.equal(c.saveLocal(),false);c.notify('A separate informational message');assert.match(c.$('save-status').textContent,/not saved/i);assert.equal(c.storage.writes,0);
 c.storage.fail=false;assert.equal(c.saveLocal(),true);assert.deepEqual(disk(c).layers,clone(c.state.layers));assert.doesNotMatch(c.$('save-status').textContent,/not saved/i);
});

test('failed mutation preserves state, revision, token, undo and redo; retry commits exactly once',()=>{
 const c=context(),before=snapshot(c);c.storage.fail=true;
 assert.equal(c.mutate(()=>{c.state.note='candidate';}),false);assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);assert.equal(disk(c).note,'before');
 c.storage.fail=false;assert.equal(c.mutate(()=>{c.state.note='candidate';}),true);assert.equal(c.state.note,'candidate');assert.equal(c.state.revision,'v1');assert.notEqual(c.state.stateToken,'token-a');assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,1);assert.equal(c.future.length,0);assert.equal(c.storage.writes,1);
});

test('render failure after a committed mutation never rolls memory behind durable state',()=>{
 const c=context();c.render=()=>{throw Error('Fabricated render failure');};try{c.mutate(()=>{c.state.note='durable candidate';});}catch{}
 assert.equal(c.storage.writes,1);assert.equal(c.state.note,'durable candidate');assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,1);
});

test('failed project import keeps current project and stacks; retry saves the imported project',async()=>{
 const c=context(),before=snapshot(c),selection=c.selected,zoom=c.zoom;const incoming=fixture({projectId:'project-imported',stateToken:'token-imported',name:'Fabricated imported',note:'imported'});c.storage.fail=true;
 try{await c.importJSON(JSON.stringify(incoming));}catch{}
 assert.equal(snapshot(c),before);assert.equal(c.selected,selection);assert.equal(c.zoom,zoom);assert.equal(c.storage.writes,0);
 c.storage.fail=false;await c.importJSON(JSON.stringify(incoming));assert.equal(c.state.projectId,'project-imported');assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,1);assert.equal(c.future.length,0);assert.equal(c.storage.writes,1);
});

for(const name of ['undo','redo'])test('failed '+name+' preserves state and both stacks, including report merge targets',()=>{
 const c=context(),R=ConsistencyReview;const first=R.createReport({projectId:'project-a',stateToken:'token-a',revision:'v0',sourceHash:'source',runAt:'2026-01-01T00:00:00.000Z'}),later=R.createReport({projectId:'project-a',stateToken:'token-b',revision:'v1',sourceHash:'source',runAt:'2026-01-01T00:00:01.000Z'});
 c.state.consistencyReports=[first,later];const target=fixture({note:name+' target',consistencyReports:[first]});c.history=name==='undo'?[target]:[];c.future=name==='redo'?[target]:[];const before=snapshot(c);c.storage.fail=true;
 c[name]();assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);
 c.storage.fail=false;c[name]();assert.equal(c.state.note,name+' target');assert.equal(c.state.consistencyReports.length,2);assert.deepEqual(disk(c),clone(c.state));assert.equal(c.storage.writes,1);assert.equal(name==='undo'?c.history.length:c.future.length,0);assert.equal(name==='undo'?c.future.length:c.history.length,1);
});

test('failed overlay drag restores the original item without stack or token drift',()=>{
 const c=context(),before=snapshot(c),original=clone(c.state.items[0]);c.storage.fail=true;c.state.items[0].x=25;c.active={type:'move',id:'item-a',original,changed:true};c.pointerUp({});
 assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);
 c.storage.fail=false;c.state.items[0].x=25;c.active={type:'move',id:'item-a',original,changed:true};c.pointerUp({});assert.equal(c.state.items[0].x,25);assert.equal(c.history[0].items[0].x,0);assert.deepEqual(disk(c),clone(c.state));assert.equal(c.storage.writes,1);
});

test('failed photo drag restores original pose; successful retry is undoable',()=>{
 const c=context();c.state.photos=[{id:'photo-a',assetKey:'asset-a',name:'Fabricated photo',x:0,y:0,angle:0,fov:60,range:100,note:''}];const before=snapshot(c),original=clone(c.state.photos[0]);c.storage.fail=true;c.state.photos[0].x=25;c.active={type:'photoMove',id:'photo-a',original,changed:true};c.photoPointerUp({});
 assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);
 c.storage.fail=false;c.state.photos[0].x=25;c.active={type:'photoMove',id:'photo-a',original,changed:true};c.photoPointerUp({});assert.equal(c.state.photos[0].x,25);assert.equal(c.history[0].photos[0].x,0);assert.deepEqual(disk(c),clone(c.state));assert.equal(c.storage.writes,1);
});

test('failed legacy identity migration preserves source and audit history',()=>{
 const c=context();c.editableNodes=()=>[{}];c.sourceWithIds=()=>'<svg id="migrated"/>';const before=snapshot(c);c.storage.fail=true;
 c.migrateObjectIds();assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);
 c.storage.fail=false;c.migrateObjectIds();assert.equal(c.state.baseSvg,'<svg id="migrated"/>');assert.equal(c.state.changeLog.length,1);assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,1);assert.equal(c.future.length,0);
});

test('failed project reset retains the current project and stacks',()=>{
 const c=context(),before=snapshot(c),selection=c.selected;c.storage.fail=true;c.newProject();assert.equal(snapshot(c),before);assert.equal(c.selected,selection);assert.equal(c.storage.writes,0);
 c.storage.fail=false;c.newProject();assert.equal(c.state.projectId,'project-new');assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,1);assert.equal(c.future.length,0);
});

test('failed review recording keeps earlier runs and returns false; retry saves without geometry revision',()=>{
 const c=context(),before=snapshot(c);c.storage.fail=true;assert.equal(c.runConsistencyReview(),false);assert.equal(snapshot(c),before);assert.equal(c.storage.writes,0);
 c.storage.fail=false;assert.equal(c.runConsistencyReview(),true);assert.equal(c.state.consistencyReports.length,1);assert.equal(c.state.revision,'v0');assert.equal(c.state.stateToken,'token-a');assert.deepEqual(disk(c),clone(c.state));assert.equal(c.history.length,0);assert.equal(c.future.length,1);
});

const failures=[];for(const {name,run}of cases){try{await run();}catch(error){failures.push(name);console.error('FAIL: '+name+'\n'+error.stack);}}
assert.equal(failures.length,0,failures.length+' durability regression(s) failed: '+failures.join('; '));
console.log('PASS: storage failure rollback/retry for edits, imports, history, drags, migration/reset and reviews; sticky unsaved status and post-commit rendering integrity.');
