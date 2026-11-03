import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import '../src/overlay-footprint.js';
import '../src/item-adjustments.js';
import '../src/asset-records.js';
import '../src/measurement-anchors.js';
import '../src/measurement-chains.js';
import '../src/opening-bindings.js';
import '../src/layer-items.js';
import '../src/review-history.js';
import '../src/consistency-review.js';
import '../src/original-overlay.js';

// Actual file-input handler and transactions; fabricated SVG parsing/rendering/storage.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function code(name){const line=app.split('\n').find(s=>s.startsWith('function '+name+'('));assert.ok(line,'Missing '+name);return line;}
const start=app.indexOf("$('svg-file').onchange="),end=app.indexOf(";$('handoff')",start);
assert.ok(start>=0&&end>start,'Missing architectural SVG file handler');
const handler=app.slice(start,end);
const incoming='<svg id="replacement" viewBox="5 6 300 200"/>';
function fixture(){return {schemaVersion:1,projectId:'fabricated-project',stateToken:'fabricated-state',name:'Fabricated import',revision:'v2',note:'Retain private project metadata',baseSvg:'<svg id="existing"/>',viewBox:[0,0,100,80],items:[{id:'item-a',kind:'rect',x:1,y:2,w:3,h:4}],comments:[{id:'comment-a',n:1,x:2,y:3,text:'Fabricated annotation',status:'open',history:[]}],photos:[{id:'photo-a',assetKey:'fabricated-photo',name:'Fabricated image',x:null,y:null,angle:0,fov:60,range:100,note:'Retain camera metadata'}],original:{name:'Fabricated source.pdf',kind:'pdf',assetKey:'fabricated-source',rasterKey:'fabricated-raster',x:0,y:0,w:100,h:80,rotation:0,opacity:.5,page:1,pageCount:1},objectSettings:{'item:item-a':{hidden:false}},assets:[],measurementAnchors:[],measurementChains:[],openingBindings:[],consistencyReports:[],changeLog:[],nextId:3,layers:{base:true,photos:true,original:true},calibration:{drawingUnits:10,realMillimetres:25,status:'manual'}};}
function harness(options={}){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,{textContent:'',replaceChildren(){}});return ui.get(id);};
 const storage={fail:false,text:JSON.stringify(fixture()),attempts:0,writes:0};let renders=0;
 const c=vm.createContext({KEY:'fabricated-key',state:fixture(),history:[],future:[fixture()],selected:'item-a',selectedRefs:new Set(['item:item-a','comment:comment-a']),zoom:2.25,storageWriteFailed:false,$:get,clone,crypto:webcrypto,LayerItems,AssetRecords,MeasurementAnchors,MeasurementChains,OpeningBindings,ConsistencyReview,OverlayFootprint,ItemAdjustments,OriginalOverlay,ReviewHistory,assertSourceLocks(){},render(){renders++;},cancelLandmarkMatch(){},fileText:(_input,fn)=>fn(incoming),safeSVG:value=>{if(options.malformed)throw Error('Fabricated malformed SVG');return value;},sourceWithIds:value=>value,XMLSerializer:class{serializeToString(value){if(options.serializeThrow)throw Error('Fabricated serialization failure');return value;}},parseVB:()=>[5,6,300,200],localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail)throw Error('Fabricated quota exceeded');storage.text=text;storage.writes++;}}});
 vm.runInContext(['notify','saveLocal','validProject','validatePhotos','mutate','restoreSnapshot'].map(code).join('\n'),c);
 vm.runInContext(handler,c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name);vm.runInContext('function '+name+'(){'+body+'}',c);}
 return {c,get,storage,load:()=>get('svg-file').onchange(),get renders(){return renders;}};
}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future,selected:h.c.selected,refs:[...h.c.selectedRefs],zoom:h.c.zoom});}
function rejected(h,before,pattern){assert.equal(snapshot(h),before,'Rejected import preserves model, selection, zoom and history');assert.equal(h.storage.writes,0);assert.match(h.get('message').textContent,pattern);assert.doesNotMatch(h.get('message').textContent,/SVG loaded/i);}
function assertSuccess(h,before){assert.equal(h.c.selected,null);assert.equal(h.c.selectedRefs.size,0);assert.equal(h.c.zoom,1);assert.equal(h.c.state.baseSvg,incoming);assert.deepEqual(Array.from(h.c.state.viewBox),[5,6,300,200]);assert.deepEqual(clone(h.c.state.items),[]);assert.deepEqual(clone(h.c.state.comments),[]);assert.deepEqual(clone(h.c.state.objectSettings),{});assert.equal(h.c.state.calibration,null);assert.equal(h.c.state.revision,'v3');assert.notEqual(h.c.state.stateToken,before.stateToken);assert.equal(h.c.history.length,1);assert.equal(h.c.future.length,0);assert.deepEqual(clone(h.c.history[0]),before);assert.deepEqual(JSON.parse(h.storage.text),clone(h.c.state));for(const key of ['projectId','photos','original','assets','note','layers','name','changeLog','nextId'])assert.deepEqual(clone(h.c.state[key]),before[key],key+' retained');assert.match(h.get('message').textContent,/Architectural SVG loaded/);}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('quota rejection preserves selection and successful retry clears selection only after commit',()=>{
 const h=harness(),before=snapshot(h),oldDisk=h.storage.text,project=clone(h.c.state);h.storage.fail=true;h.load();rejected(h,before,/storage is unavailable/i);assert.equal(h.storage.text,oldDisk);assert.equal(h.storage.attempts,1);assert.match(h.get('save-status').textContent,/not saved/i);h.storage.fail=false;h.load();assertSuccess(h,project);assert.equal(h.storage.attempts,2);assert.equal(h.storage.writes,1);h.c.undo();assert.deepEqual(clone(h.c.state),project);h.c.redo();assert.equal(h.c.state.baseSvg,incoming);assert.equal(h.storage.writes,3);
});
test('real locked overlay rejects replacement without losing selection',()=>{const h=harness();h.c.state.objectSettings['item:item-a'].locked=true;const before=snapshot(h);h.load();rejected(h,before,/Locked item/i);assert.equal(h.storage.attempts,0);});
test('validation rejection preserves selection',()=>{const h=harness(),before=snapshot(h);h.c.validProject=()=>{throw Error('Fabricated validation rejection');};h.load();rejected(h,before,/validation rejection/);assert.equal(h.storage.attempts,0);});
test('source-policy rejection preserves selection',()=>{const h=harness(),before=snapshot(h);h.c.assertSourceLocks=()=>{throw Error('Fabricated source policy rejection');};h.load();rejected(h,before,/source policy rejection/);assert.equal(h.storage.attempts,0);});
for(const option of ['malformed','serializeThrow'])test(option+' fails before mutation and keeps selection',()=>{const h=harness({[option]:true}),before=snapshot(h);h.load();rejected(h,before,/Fabricated/);assert.equal(h.storage.attempts,0);});
for(const collection of ['measurementAnchors','measurementChains','openingBindings','roomBoundaries'])test(collection+' preflight retains bound source and selection',()=>{const h=harness();h.c.state[collection]=[{id:'fabricated-existing-binding'}];const before=snapshot(h);h.load();rejected(h,before,/Remove room, measurement and opening bindings/);assert.equal(h.storage.attempts,0);});
test('architectural asset reference preflight retains source and selection',()=>{const h=harness();h.c.state.assets=[{linkedRefs:['base:fabricated-wall']}];const before=snapshot(h);h.load();rejected(h,before,/Unlink architectural asset references/);assert.equal(h.storage.attempts,0);});
test('ordinary successful replacement clears both selections and preserves unrelated metadata',()=>{const h=harness(),project=clone(h.c.state);h.load();assertSuccess(h,project);assert.equal(h.storage.writes,1);});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' architectural SVG import failures');console.log('PASS: '+cases.length+' production architectural SVG import cases; selection/zoom preservation on rejection, guarded preflight and successful clear/UndoRedo. Native XML/browser remains separate acceptance.');
