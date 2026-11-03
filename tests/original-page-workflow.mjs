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

// Actual page-change, domain validation, mutation/storage and Undo/Redo functions.
// Only PDF rendering, media transport and DOM presentation use fabricated adapters.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
function fixture(patch={}){return {schemaVersion:1,projectId:'fabricated-project',stateToken:'fabricated-token',name:'Fabricated PDF workflow',revision:'v1',note:'Preserve source and annotations',baseSvg:'<svg/>',viewBox:[0,0,100,80],items:[],comments:[],photos:[],assets:[],measurementAnchors:[],measurementChains:[],openingBindings:[],consistencyReports:[],objectSettings:{},changeLog:[],nextId:1,layers:{base:true,original:true},original:{name:'Fabricated source.pdf',kind:'pdf',assetKey:'fabricated-source',rasterKey:'fabricated-raster-1',page:1,pageCount:3,x:10,y:20,w:100,h:80,rotation:0,opacity:.5},...patch};}
const preview={dataUrl:'data:image/png;base64,BBBB',width:100,height:80,page:2,pageCount:3};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,{textContent:'',value:id==='original-page'?'2':''});return ui.get(id);};
 const storage={text:JSON.stringify(fixture()),attempts:0,writes:0,fail:false},media=new Map([['fabricated-source','data:application/pdf;base64,AAAA'],['fabricated-raster-1','data:image/png;base64,AAAA']]),calls={loads:0,renders:0,stores:0,presentation:0};
 const c=vm.createContext({state:fixture(),KEY:'fabricated-key',clone,crypto:webcrypto,Date,Map,Set,history:[],future:[],originalBusy:false,storageWriteFailed:false,$:get,localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail)throw Error('Fabricated quota failure');storage.text=text;storage.writes++;}},AssetRecords,MeasurementAnchors,MeasurementChains,OpeningBindings,ItemAdjustments,OverlayFootprint,LayerItems,ReviewHistory,ConsistencyReview,OriginalOverlay,assertSourceLocks(){},render(){},renderOriginal(){calls.presentation++;},cancelLandmarkMatch(){},photoLoad:async key=>{calls.loads++;return media.get(key);},renderReference:async(data,kind,page)=>{calls.renders++;assert.equal(data,media.get('fabricated-source'));assert.equal(kind,'pdf');assert.equal(page,Number(get('original-page').value));return clone(preview);},photoStore:async(key,data)=>{calls.stores++;media.set(key,data);}});
 for(const name of ['notify','saveLocal','restoreSnapshot','validProject','validatePhotos','mutate','changeOriginalPage'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name);vm.runInContext('function '+name+'(){'+body+'}',c);}
 return {c,get,storage,media,calls};
}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future});}
function assertRejected(h,before,pattern){assert.equal(snapshot(h),before);assert.match(h.get('message').textContent,pattern);assert.doesNotMatch(h.get('message').textContent,/PDF page updated/);assert.equal(h.c.originalBusy,false);assert.equal(h.calls.presentation,1);}
async function pendingRender(h){const gate=deferred(),original=h.c.renderReference;h.c.renderReference=async(...args)=>{await gate.promise;return original(...args);};const changing=h.c.changeOriginalPage();await tick();assert.equal(h.c.originalBusy,true);return {gate,changing};}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('normal page update changes only page/raster and creates one reversible revision',async()=>{
 const h=harness(),before=clone(h.c.state);await h.c.changeOriginalPage();assert.equal(h.c.state.original.page,2);assert.notEqual(h.c.state.original.rasterKey,before.original.rasterKey);assert.equal(h.media.get(h.c.state.original.rasterKey),preview.dataUrl);assert.equal(h.storage.writes,1);assert.equal(h.storage.attempts,1);assert.equal(h.c.history.length,1);assert.equal(h.c.state.revision,'v2');assert.notEqual(h.c.state.stateToken,before.stateToken);assert.equal(h.c.originalBusy,false);assert.equal(h.calls.presentation,1);assert.match(h.get('message').textContent,/PDF page updated/);
 const {page,rasterKey,...reference}=clone(h.c.state.original),{page:oldPage,rasterKey:oldRaster,...oldReference}=before.original;assert.deepEqual(reference,oldReference);for(const key of ['baseSvg','items','comments','photos','assets','note','objectSettings','layers'])assert.deepEqual(clone(h.c.state[key]),before[key],key+' retained');assert.deepEqual(JSON.parse(h.storage.text),clone(h.c.state));h.c.undo();assert.deepEqual(clone(h.c.state.original),before.original);h.c.redo();assert.equal(h.c.state.original.page,2);assert.equal(h.storage.writes,3);
});
test('equal-JSON original replacement during rendering rejects instead of updating detached object',async()=>{
 const h=harness(),old=h.c.state.original,{gate,changing}=await pendingRender(h);h.c.state=clone(h.c.state);assert.notEqual(h.c.state.original,old);const before=snapshot(h);gate.resolve();await changing;assertRejected(h,before,/Reference changed/);assert.equal(h.storage.writes,0);assert.equal(h.storage.attempts,0);assert.equal(h.c.state.original.page,1);assert.equal(h.calls.stores,1,'Already staged new media is not automatically deleted');
});
test('actual Undo then Redo during render restores equal JSON but must invalidate old object authority',async()=>{
 const h=harness();h.c.history=[fixture({revision:'v0',stateToken:'earlier-token',note:'Earlier fabricated state'})];const initial=JSON.stringify(h.c.state),old=h.c.state.original,{gate,changing}=await pendingRender(h);h.c.undo();h.c.redo();assert.equal(JSON.stringify(h.c.state),initial);assert.notEqual(h.c.state.original,old);assert.equal(h.storage.writes,2);const before=snapshot(h);gate.resolve();await changing;assertRejected(h,before,/Reference changed/);assert.equal(h.storage.writes,2,'Pending page update must not save a false extra revision');assert.equal(h.c.state.original.page,1);
});
test('intervening JSON change on the same original retains the existing snapshot guard',async()=>{
 const h=harness(),{gate,changing}=await pendingRender(h);h.c.state.note='Intervening edit';const before=snapshot(h);gate.resolve();await changing;assertRejected(h,before,/Reference changed/);assert.equal(h.storage.writes,0);
});
test('equal object replacement while raster storage awaits also rejects before metadata commit',async()=>{
 const h=harness(),gate=deferred(),store=h.c.photoStore;h.c.photoStore=async(...args)=>{await gate.promise;return store(...args);};const changing=h.c.changeOriginalPage();await tick();h.c.state=clone(h.c.state);const before=snapshot(h);gate.resolve();await changing;assertRejected(h,before,/Reference changed/);assert.equal(h.storage.writes,0);
});
test('real locked reference rejects page mutation without saved revision',async()=>{
 const h=harness();h.c.state.objectSettings={'original:reference':{locked:true}};const before=snapshot(h);await h.c.changeOriginalPage();assertRejected(h,before,/Locked item/);assert.equal(h.storage.attempts,0);assert.equal(h.c.state.original.page,1);
});
test('storage failure rolls back; a new operation after recovery updates the current reference',async()=>{
 const h=harness(),before=snapshot(h);h.storage.fail=true;await h.c.changeOriginalPage();assertRejected(h,before,/storage is unavailable/);assert.equal(h.storage.writes,0);assert.equal(h.storage.attempts,1);assert.match(h.get('save-status').textContent,/not saved/i);h.storage.fail=false;await h.c.changeOriginalPage();assert.equal(h.c.state.original.page,2);assert.equal(h.storage.writes,1);assert.equal(h.storage.attempts,2);assert.equal(h.c.history.length,1);assert.equal(h.c.originalBusy,false);assert.match(h.get('message').textContent,/PDF page updated/);
});
test('invalid page is rejected by actual reference validation without saving',async()=>{
 const h=harness();h.get('original-page').value='9';const before=snapshot(h);await h.c.changeOriginalPage();assertRejected(h,before,/Invalid original PDF page/);assert.equal(h.storage.attempts,0);
});
for(const [name,prepare,pattern]of [
 ['missing source',h=>h.media.delete('fabricated-source'),/Original PDF missing/],
 ['media read failure',h=>{h.c.photoLoad=async()=>{throw Error('Fabricated read failed');};},/read failed/],
 ['render failure',h=>{h.c.renderReference=async()=>{throw Error('Fabricated render failed');};},/render failed/],
 ['raster storage failure',h=>{h.c.photoStore=async()=>{throw Error('Fabricated media save failed');};},/media save failed/]
])test(name+' preserves project and always releases busy state',async()=>{const h=harness();prepare(h);const before=snapshot(h);await h.c.changeOriginalPage();assertRejected(h,before,pattern);assert.equal(h.storage.attempts,0);});
for(const [name,prepare]of [
 ['no original',h=>{h.c.state.original=null;}],
 ['non-PDF reference',h=>{h.c.state.original.kind='image';}],
 ['already busy',h=>{h.c.originalBusy=true;}]
])test(name+' is inert and does not release another operation busy state',async()=>{const h=harness();prepare(h);const before=snapshot(h),busy=h.c.originalBusy;await h.c.changeOriginalPage();assert.equal(snapshot(h),before);assert.equal(h.c.originalBusy,busy);assert.equal(h.calls.presentation,0);assert.equal(h.calls.loads,0);assert.equal(h.storage.attempts,0);assert.equal(h.get('message').textContent,'');});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' original-page workflow failures');console.log('PASS: '+cases.length+' production PDF page cases; object/snapshot staleness, real UndoRedo ABA rejection, exact successful metadata, rollback/retry and busy cleanup. Native PDF/browser acceptance remains separate.');
