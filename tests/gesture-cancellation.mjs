import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Production ordinary gesture handlers + mutation/storage validators in one realm.
// SVG coordinate conversion, DOM nodes and rendering are simulated; no browser or
// real private project is opened. Existing canvas-scale suites cover its own cancel.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function code(name){const start=app.search(new RegExp('^function '+name+'\\(','m'));assert(start>=0,'Missing '+name);const line=app.slice(start,app.indexOf('\n',start));return line.endsWith('{')?app.slice(start,app.indexOf('\n}',start)+2):line;}
const modules=['overlay-footprint','item-adjustments','layer-items','review-history','original-overlay','asset-records','measurement-anchors','measurement-chains','opening-bindings','consistency-review'];
class Node{
 constructor(){this.children=[];this.dataset={};this.textContent='';this.classList={toggle(){}};}
 replaceChildren(...nodes){this.children=[...nodes];}append(...nodes){this.children.push(...nodes);}setAttribute(name,value){this[name]=String(value);}setPointerCapture(){}
 createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}};}getScreenCTM(){return {inverse(){return {};}};}
}
function setup(){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);},storage={fail:false,attempts:0,writes:0,text:''};
 const c=vm.createContext({crypto:webcrypto,URL,NS:'http://www.w3.org/2000/svg',$:get,document:{createElementNS(){return new Node();},querySelectorAll(){return [];}},localStorage:{setItem(_key,text){storage.attempts++;if(storage.fail)throw Error('Synthetic storage failure');storage.writes++;storage.text=text;}},render(){},renderOriginal(){},renderObjects(){},renderItemHighlights(){},renderPhotos(){},renderBaseHits(){},renderScaleHandle(){}});
 for(const name of modules)vm.runInContext(fs.readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8'),c);
 for(const name of ['notify','saveLocal','validProject','validatePhotos','mutate','assertSourceLocks','refFlags','isLocked','make','paintNode','svgRect','drawingStyle','getPt','round','dragTarget','chooseTool','pointerDown','pointerMove','pointerUp','photoPointerDown','photoPointerMove','photoPointerUp'])vm.runInContext(code(name),c);
 vm.runInContext(`
 const KEY='synthetic-gesture-key';const clone=o=>JSON.parse(JSON.stringify(o));let storageWriteFailed=false,active=null,tool='select',landmarkMatch=null,canvasScaleGesture=null,selected=null,selectedRefs=new Set(),photoSelected='photo-a',photoMode=false;
 let state={schemaVersion:1,projectId:'synthetic-project',stateToken:'synthetic-state',name:'Synthetic gesture',revision:'v7',baseSvg:'<svg xmlns="http://www.w3.org/2000/svg"/>',viewBox:[0,0,100,100],items:[{id:'overlay',kind:'arrow',x:10,y:20,x2:30,y2:40,color:'#123456',metadata:{preserve:[1,2]}}],comments:[],photos:[{id:'photo-a',name:'Synthetic photo',assetKey:'synthetic-media',x:10,y:20,angle:15,fov:60,range:100,note:'Preserve photo metadata',metadata:{preserve:[3,4]}}],original:{name:'Synthetic original',kind:'pdf',assetKey:'original-source',rasterKey:'original-raster',page:1,pageCount:1,x:2,y:3,w:50,h:40,rotation:0,opacity:.5,metadata:{preserve:[5,6]}},objectSettings:{},assets:[],measurementAnchors:[],measurementChains:[],openingBindings:[],measurementTolerancePercent:null,consistencyReports:[],changeLog:[],note:'Unrelated note',nextId:21,drawingStyle:{color:'#123456',width:3},layers:{base:true,furniture:true,markup:false,photos:true}};
 let history=[{...clone(state),note:'Existing Undo'}],future=[{...clone(state),note:'Existing Redo'}];
 function selectRef(ref){selected=ref;selectedRefs=new Set([ref]);}
 function eventAt(kind,x,y,type='pointermove'){return {button:0,pointerId:7,type,clientX:x,clientY:y,target:{closest(selector){if(selector==='[data-id]'&&kind==='overlay')return {dataset:{id:'overlay'}};if(selector==='[data-photo-id]'&&kind.startsWith('photo-'))return {dataset:{photoId:'photo-a'}};if(selector==='[data-photo-action]'&&kind.startsWith('photo-'))return {dataset:{photoAction:kind==='photo-rotate'?'rotate':'move'}};return null;}}};}
 function begin(kind){if(kind==='original'){tool='original';pointerDown(eventAt('blank',10,20,'pointerdown'));pointerMove(eventAt('blank',30,50));}else if(kind==='overlay'){tool='select';pointerDown(eventAt('overlay',10,20,'pointerdown'));pointerMove(eventAt('overlay',30,50));}else if(kind==='photo-move'||kind==='photo-rotate'){tool='select';pointerDown(eventAt(kind,10,20,'pointerdown'));pointerMove(eventAt(kind,30,50));}else if(kind==='photo-place'){state.photos[0].x=null;state.photos[0].y=null;photoMode=true;photoSelected='photo-a';tool='select';pointerDown(eventAt('blank',30,40,'pointerdown'));pointerMove(eventAt('blank',60,60));}else{tool=kind;pointerDown(eventAt('blank',10,20,'pointerdown'));pointerMove(eventAt('blank',30,50));}}
 function finish(type='pointercancel'){pointerUp(eventAt('blank',30,50,type));}
 validProject(state);
 `,c);
 const run=text=>vm.runInContext(text,c);storage.text=run('JSON.stringify(state)');return {c,run,storage,nodes};
}
const snap=h=>h.run('JSON.stringify({state,history,future})'),plain=v=>JSON.parse(JSON.stringify(v));
const cases=[];const test=(name,run)=>cases.push({name,run});
for(const kind of ['overlay','original','photo-move','photo-rotate','photo-place','paint','arrow','rect','furniture'])test('cancel '+kind+' restores state without storage/history/id changes',()=>{
 const h=setup();if(kind==='photo-place'){h.run('state.photos[0].x=null;state.photos[0].y=null;');h.storage.text=h.run('JSON.stringify(state)');}const before=snap(h),saved=h.storage.text;h.run('begin('+JSON.stringify(kind)+')');assert(h.run('active!==null'),'Actual pointerDown created a gesture');if(['overlay','original','photo-move','photo-rotate','photo-place'].includes(kind))assert.notEqual(snap(h),before,'Actual pointerMove/placement changed preview state');
 h.run('finish()');assert.equal(snap(h),before);assert.equal(h.storage.text,saved);assert.equal(h.storage.attempts,0);assert.equal(h.storage.writes,0);assert.equal(h.run('active'),null);assert.equal(h.nodes.get('preview-layer')?.children.length??0,0);assert.equal(h.run('state.nextId'),21);
});
for(const kind of ['overlay','original','photo-move','photo-rotate','photo-place','paint','arrow','rect','furniture'])test('ordinary pointerup '+kind+' still commits once and persists',()=>{
 const h=setup();h.run('begin('+JSON.stringify(kind)+');finish("pointerup")');assert.equal(h.storage.writes,1);assert.equal(h.run('state.revision'),'v8');assert.notEqual(h.run('state.stateToken'),'synthetic-state');assert.equal(h.run('history.length'),2);assert.equal(h.run('future.length'),0);assert.deepEqual(JSON.parse(h.storage.text),plain(h.run('state')));assert.equal(h.run('active'),null);assert.equal(h.run('state.nextId'),['paint','arrow','rect','furniture'].includes(kind)?22:21);
});
for(const kind of ['overlay','original','photo-move','photo-rotate','photo-place','paint','arrow','rect','furniture'])test('storage failure on pointerup '+kind+' restores original state',()=>{
 const h=setup();if(kind==='photo-place'){h.run('state.photos[0].x=null;state.photos[0].y=null;');h.storage.text=h.run('JSON.stringify(state)');}const before=snap(h),saved=h.storage.text;h.storage.fail=true;h.run('begin('+JSON.stringify(kind)+');finish("pointerup")');assert.equal(snap(h),before);assert.equal(h.storage.text,saved);assert.equal(h.storage.writes,0);assert.equal(h.storage.attempts,1);
});
for(const kind of ['overlay','photo-place','paint'])test('cancel '+kind+' never attempts failing storage',()=>{const h=setup();if(kind==='photo-place')h.run('state.photos[0].x=null;state.photos[0].y=null;');const before=snap(h);h.storage.fail=true;h.run('begin('+JSON.stringify(kind)+');finish()');assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);});
test('photo cancellation helper direct calls restore null placement and clear preview',()=>{const h=setup();h.run('state.photos[0].x=null;state.photos[0].y=null;');const before=snap(h);h.run('begin("photo-place");$("preview-layer").append({synthetic:true});photoPointerUp({type:"pointercancel"})');assert.equal(snap(h),before);assert.equal(h.run('active'),null);assert.equal(h.storage.attempts,0);assert.equal(h.nodes.get('preview-layer')?.children.length??0,0);});
test('single-point paint cancellation creates no fallback stroke',()=>{const h=setup(),before=snap(h);h.run('tool="paint";pointerDown(eventAt("blank",10,20,"pointerdown"));finish()');assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);});
test('nonchanged cancellation and ordinary no-type event calls retain compatibility',()=>{const h=setup(),before=snap(h);h.run('tool="select";pointerDown(eventAt("overlay",10,20,"pointerdown"));pointerUp({type:"pointercancel"})');assert.equal(snap(h),before);assert.equal(h.storage.attempts,0);h.run('begin("overlay");pointerUp({})');assert.equal(h.storage.writes,1);});

const failures=[];for(const {name,run}of cases){try{run();}catch(error){failures.push(name);console.error('FAIL '+name+': '+error.message.slice(0,180));}}assert.equal(failures.length,0,failures.length+' gesture regression(s): '+failures.join('; '));
console.log('Ordinary gesture cancellation: exact preview rollback, no new items/IDs/writes/history, unchanged successful release and storage rollback pass; visual browser acceptance remains pending.');
