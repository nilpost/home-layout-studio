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

// Real landmark workflow, fitting math, validation and transactions; fabricated UI/storage.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function code(name){const start=app.search(new RegExp('^(?:async )?function '+name+'\\(','m'));assert.ok(start>=0,'Missing '+name);const end=app.indexOf('\n',start),line=app.slice(start,end);return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
function fixture(){return {schemaVersion:1,projectId:'fabricated-project',stateToken:'fabricated-token',name:'Fabricated landmarks',revision:'v0',note:'Retain unrelated metadata',baseSvg:'<svg/>',viewBox:[0,0,500,500],items:[],comments:[],photos:[],assets:[],measurementAnchors:[],measurementChains:[],openingBindings:[],consistencyReports:[],objectSettings:{},changeLog:[],nextId:1,layers:{base:true,original:false},original:{name:'Fabricated original.pdf',kind:'pdf',assetKey:'fabricated-source',rasterKey:'fabricated-raster',page:1,pageCount:1,x:0,y:0,w:100,h:50,rotation:0,opacity:.5}};}
function harness(){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,{textContent:'',hidden:false,children:[],attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];},replaceChildren(...nodes){this.children=nodes;},append(node){this.children.push(node);}});return ui.get(id);};
 const storage={fail:false,text:JSON.stringify(fixture()),attempts:0,writes:0};
 const c=vm.createContext({state:fixture(),KEY:'fabricated-key',clone,crypto:webcrypto,Date,Map,Set,history:[],future:[fixture()],landmarkMatch:null,tool:'select',storageWriteFailed:false,$:get,localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail)throw Error('Fabricated quota failure');storage.text=text;storage.writes++;}},AssetRecords,MeasurementAnchors,MeasurementChains,OpeningBindings,ItemAdjustments,OverlayFootprint,LayerItems,ReviewHistory,ConsistencyReview,OriginalOverlay,assertSourceLocks(){},chooseTool(value){c.tool=value;},render(){},renderBase(){},renderOriginal(){},make:(tag,attrs)=>({tag,attrs}),photoStore(){throw Error('Landmark workflow must not write media');}});
 for(const name of ['notify','saveLocal','restoreSnapshot','validProject','validatePhotos','mutate','sourceHash','landmarkSourceView','showLandmarkStep','startLandmarkMatch','cancelLandmarkMatch','captureLandmark'])vm.runInContext(code(name),c);
 for(const name of ['undo','redo']){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name);vm.runInContext('function '+name+'(){'+body+'}',c);}
 return {c,storage,get};
}
const source=[[0,0],[100,0],[0,50]],target=[[20,30],[220,30],[20,130]];
function click(c,p){c.captureLandmark({x:p[0],y:p[1]});}
function prepare(h,s=source,t=target){h.c.startLandmarkMatch();for(let i=0;i<2;i++){click(h.c,s[i]);click(h.c,t[i]);}click(h.c,s[2]);}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future});}
function assertCancelled(h){assert.equal(h.c.landmarkMatch,null);assert.equal(h.c.tool,'select');assert.equal(h.get('original-match-cancel').hidden,true);for(const id of ['furniture-layer','markup-layer','comment-layer','photo-layer'])assert.equal(h.get(id).attributes.display,undefined);}
function assertRejected(h,before,pattern){assert.equal(snapshot(h),before);assert.match(h.get('message').textContent,pattern);assert.equal(h.get('original-match-status').textContent,h.get('message').textContent);assert.doesNotMatch(h.get('message').textContent,/Original aligned|Matched 3/);assert.doesNotMatch(h.get('original-match-status').textContent,/Matched 3/);assertCancelled(h);}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('quota rejection retains pose/history and exposes rejection in both status surfaces',()=>{
 const h=harness();prepare(h);const before=snapshot(h),disk=h.storage.text;h.storage.fail=true;click(h.c,target[2]);assertRejected(h,before,/storage is unavailable/i);assert.equal(h.storage.text,disk);assert.equal(h.storage.writes,0);assert.equal(h.storage.attempts,1);assert.match(h.get('save-status').textContent,/not saved/i);
});
test('locked original rejects matching without writes or successful alignment feedback',()=>{
 const h=harness();h.c.state.objectSettings={'original:reference':{locked:true}};prepare(h);const before=snapshot(h);click(h.c,target[2]);assertRejected(h,before,/Locked item/i);assert.equal(h.storage.attempts,0);
});
test('validation rejection retains prior project and reports rejection',()=>{
 const h=harness();prepare(h);const before=snapshot(h);h.c.validProject=()=>{throw Error('Fabricated project validation rejected');};click(h.c,target[2]);assertRejected(h,before,/validation rejected/i);assert.equal(h.storage.attempts,0);
});
test('source-policy rejection retains prior project and reports rejection',()=>{
 const h=harness();prepare(h);const before=snapshot(h);h.c.assertSourceLocks=()=>{throw Error('Fabricated source policy rejected');};click(h.c,target[2]);assertRejected(h,before,/source policy rejected/i);assert.equal(h.storage.attempts,0);
});
test('new session after failed save retries once and successful registration is UndoRedo reversible',()=>{
 const h=harness(),before=clone(h.c.state),fit=OriginalOverlay.match(before.original,source,target);prepare(h);h.storage.fail=true;click(h.c,target[2]);h.storage.fail=false;prepare(h);click(h.c,target[2]);assert.equal(h.storage.writes,1);assert.equal(h.storage.attempts,2);assert.equal(h.c.history.length,1);assert.equal(h.c.future.length,0);assert.equal(h.c.state.revision,'v1');assert.notEqual(h.c.state.stateToken,before.stateToken);assert.deepEqual(JSON.parse(h.storage.text),clone(h.c.state));assertCancelled(h);assert.match(h.get('message').textContent,/Original aligned/);assert.match(h.get('original-match-status').textContent,/Matched 3 landmarks/);for(const k of ['x','y','w','h','rotation'])assert.equal(h.c.state.original[k],fit.reference[k]);assert.deepEqual(clone(h.c.state.original.registration),{method:'similarity-landmarks',source,target,rms:fit.rms,maxResidual:fit.maxResidual,baseSourceHash:h.c.sourceHash(before.baseSvg)});assert.equal(h.c.state.layers.original,true);for(const k of ['baseSvg','items','comments','photos','assets','note','objectSettings'])assert.deepEqual(clone(h.c.state[k]),before[k],k+' unchanged');h.c.undo();assert.deepEqual(clone(h.c.state.original),before.original);assert.equal(h.c.state.layers.original,false);h.c.redo();assert.equal(h.c.state.original.x,fit.reference.x);assert.equal(h.storage.writes,3);
});
for(const field of ['revision','baseSvg'])test('stale '+field+' cancels before fitting or saving',()=>{
 const h=harness();prepare(h);h.c.state[field]+='-changed';const before=snapshot(h);click(h.c,target[2]);assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assertCancelled(h);assert.match(h.get('message').textContent,/Project changed/);assert.doesNotMatch(h.get('original-match-status').textContent,/Matched 3/);
});
test('degenerate landmarks show fitting failure without writes or success claims',()=>{
 const h=harness();prepare(h,[[0,0],[0,0],[0,0]]);const before=snapshot(h);click(h.c,target[2]);assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assertCancelled(h);assert.match(h.get('message').textContent,/too close/i);assert.doesNotMatch(h.get('original-match-status').textContent,/Matched 3/);
});
test('intermediate landmark progress and explicit cancellation do not modify project',()=>{
 const h=harness(),before=snapshot(h);h.c.startLandmarkMatch();click(h.c,source[0]);assert.match(h.get('original-match-status').textContent,/Landmark 1.*EDITABLE BASE/);assert.equal(h.storage.attempts,0);assert.equal(snapshot(h),before);h.c.cancelLandmarkMatch();assertCancelled(h);assert.equal(snapshot(h),before);
});
test('capture without active session is inert',()=>{const h=harness(),before=snapshot(h);click(h.c,[1,2]);assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assert.equal(h.get('message').textContent,'');});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' landmark workflow failure(s)');console.log('PASS: '+cases.length+' production landmark workflow cases; rejection feedback, exact rollback, guarded fit, new-session retry, UndoRedo and progress/cancellation. Native browser and physical alignment remain separate acceptance.');
