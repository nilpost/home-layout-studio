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
import '../src/room-boundaries.js';

// Actual fresh/reset, inventory/layer rendering and batch action; fabricated DOM/parsing/storage.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
function line(prefix){const value=app.split('\n').find(s=>s.startsWith(prefix));assert.ok(value,'Missing '+prefix);return value;}
const code=name=>line('function '+name+'(');
function handler(name){const body=app.match(new RegExp("\\$\\('"+name+"'\\)\\.onclick=\\(\\)=>\\{(.*?)\\};",'s'))?.[1];assert.ok(body,'Missing '+name);return 'function '+(name==='new-project'?'resetProject':name)+'(){'+body+'}';}
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.value='';this.textContent='';this.scrollTop=0;this.disabled=false;this.isConnected=true;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(key,value){this.attrs[key]=String(value);}
}
function harness(){
 const ui=new Map(),get=id=>{if(!ui.has(id))ui.set(id,new Element());return ui.get(id);},buttons=[new Element('button'),new Element('button')];
 const storage={fail:false,attempts:0,writes:0,text:''},selectionAtSave=[];let accept=true,renders=0;
 const c=vm.createContext({NS:'http://www.w3.org/2000/svg',KEY:'fabricated-key',crypto:webcrypto,clone,Date,Set,Map,LayerItems,ReviewHistory,AssetRecords,MeasurementAnchors,MeasurementChains,OpeningBindings,RoomBoundaries,ConsistencyReview,OverlayFootprint,ItemAdjustments,OriginalOverlay,$:get,document:{createElement:tag=>new Element(tag),querySelectorAll:()=>buttons},XMLSerializer:class{serializeToString=value=>value;},sourceWithIds:value=>value,baseEntries:()=>({entries:[...c.state.baseSvg.matchAll(/id="([^"]+)"/g)].map(m=>({ref:'base:'+m[1],id:m[1],kind:'base',category:'Walls',name:m[1]}))}),entryVisible:()=>true,assertSourceLocks(){},validatePhotos(){},cancelLandmarkMatch(){},confirm:()=>accept,history:[],future:[],selected:null,selectedRefs:new Set(),selectionAnchor:null,layerEntries:[],layerOpenGroups:new Set(),layerSelectionFromMap:false,zoom:1,storageWriteFailed:false,localStorage:{setItem(_key,text){storage.attempts++;selectionAtSave.push({refs:[...c.selectedRefs],anchor:c.selectionAnchor,selected:c.selected,zoom:c.zoom});if(storage.fail)throw Error('Fabricated quota exceeded');storage.text=text;storage.writes++;}},render(){renders++;c.renderLayerList();}});
 vm.runInContext(fs.readFileSync(new URL('../src/room-boundaries.js',import.meta.url),'utf8'),c);
 vm.runInContext(line('const demoSVG=')+'\n'+line('const fresh=')+'\nglobalThis.fresh=fresh;',c);
 vm.runInContext(['notify','saveLocal','validProject','mutate','restoreSnapshot','refFlags','isLocked','setFlag','inventory','renderLayerList','batchItemAction'].map(code).join('\n'),c);
 c.recordChange=(...args)=>ReviewHistory.recordChange(c.state,...args);
 for(const name of ['new-project','undo','redo'])vm.runInContext(handler(name),c);
 c.state=c.fresh();c.state.projectId='fabricated-old-project';c.state.note='Retain old project';c.state.items=[{id:'item-a',kind:'rect',x:1,y:2,w:3,h:4}];c.selected='item-a';c.selectedRefs=new Set(['base:demo-perimeter','item:item-a']);c.selectionAnchor='base:demo-perimeter';c.zoom=2.5;c.future=[clone(c.state)];storage.text=JSON.stringify(c.state);c.renderLayerList();
 return {c,get,buttons,storage,selectionAtSave,set accept(value){accept=value;},get renders(){return renders;}};
}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future,selected:h.c.selected,refs:[...h.c.selectedRefs],anchor:h.c.selectionAnchor,zoom:h.c.zoom});}
function assertReset(h,before){assert.notEqual(h.c.state.projectId,before.projectId);assert.equal(h.c.state.name,'Untitled home');assert.equal(h.c.state.revision,'v0');assert.equal(h.c.selectedRefs.size,0,'Reset must not inherit selection for reused source IDs');assert.equal(h.c.selectionAnchor,null,'Reset must not inherit the previous project range anchor');assert.equal(h.c.selected,null);assert.equal(h.c.zoom,1);assert.equal(h.get('layer-selection-count').textContent,'0 selected');assert.ok(h.buttons.every(b=>b.disabled));assert.deepEqual(JSON.parse(h.storage.text),clone(h.c.state));assert.equal(h.c.history.length,1);assert.deepEqual(clone(h.c.history[0]),before);assert.equal(h.c.future.length,0);}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('reset clears reused source selection and batch hide cannot affect new demo without reselection',()=>{
 const h=harness(),before=clone(h.c.state);assert.equal(h.get('layer-selection-count').textContent,'2 selected');h.c.resetProject();assertReset(h,before);assert.equal(h.storage.writes,1);const saved=snapshot(h);h.c.batchItemAction('hide');assert.equal(snapshot(h),saved,'No fresh object can inherit a hide target from the previous project');assert.equal(h.storage.writes,1);assert.equal(h.c.state.objectSettings['base:demo-perimeter'],undefined);
});
test('cancelled reset leaves project, selection, anchor, history and zoom unchanged',()=>{
 const h=harness(),before=snapshot(h);h.accept=false;h.c.resetProject();assert.equal(snapshot(h),before);assert.equal(h.storage.attempts,0);assert.equal(h.get('layer-selection-count').textContent,'2 selected');
});
test('failed reset retains selection until storage commit and a successful retry resets exactly once',()=>{
 const h=harness(),before=snapshot(h),project=clone(h.c.state),disk=h.storage.text;h.storage.fail=true;h.c.resetProject();assert.equal(snapshot(h),before);assert.equal(h.storage.text,disk);assert.equal(h.storage.writes,0);assert.equal(h.storage.attempts,1);assert.match(h.get('message').textContent,/Reset cancelled.*storage unavailable/);assert.match(h.get('save-status').textContent,/Not saved/);h.storage.fail=false;h.c.resetProject();assertReset(h,project);assert.equal(h.storage.writes,1);assert.equal(h.storage.attempts,2);for(const selected of h.selectionAtSave){assert.deepEqual(selected.refs,['base:demo-perimeter','item:item-a']);assert.equal(selected.anchor,'base:demo-perimeter');assert.equal(selected.selected,'item-a');assert.equal(selected.zoom,2.5);}
});
test('successful reset retains one reversible model snapshot through Undo and Redo',()=>{
 const h=harness(),old=clone(h.c.state);h.c.resetProject();const reset=clone(h.c.state);assertReset(h,old);h.c.undo();assert.deepEqual(clone(h.c.state),old);assert.deepEqual(JSON.parse(h.storage.text),old);h.c.redo();assert.deepEqual(clone(h.c.state),reset);assert.deepEqual(JSON.parse(h.storage.text),reset);assert.equal(h.storage.writes,3);assert.equal(h.c.selectedRefs.size,0);assert.equal(h.c.selectionAnchor,null);
});
test('fresh demo changes only after explicit new selection',()=>{
 const h=harness();h.c.resetProject();h.c.selectedRefs=new Set(['base:demo-perimeter']);h.c.selectionAnchor='base:demo-perimeter';h.c.batchItemAction('hide');assert.equal(h.c.state.objectSettings['base:demo-perimeter']?.hidden,true,h.get('message').textContent);assert.equal(h.storage.writes,2);assert.equal(h.c.state.changeLog.at(-1).summary,'hide 1 layer items.');assert.equal(h.c.history.length,2);
});
test('reset without an existing selection still clears a stale range anchor',()=>{
 const h=harness(),old=clone(h.c.state);h.c.selectedRefs.clear();h.c.selected=null;h.c.selectionAnchor='base:old-absent';h.c.resetProject();assertReset(h,old);assert.equal(h.storage.writes,1);
});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' reset workflow failure(s)');console.log('PASS: '+cases.length+' production reset workflow cases; reused-ID selection isolation, anchor cleanup after commit, cancel/quota/retry and UndoRedo. Native SVG/browser acceptance remains separate.');
