import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// Production media I/O and callers; fabricated event-controlled IndexedDB only.
const app=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function code(name){const line=app.split('\n').find(s=>s.startsWith('function '+name+'(')||s.startsWith('async function '+name+'('));assert.ok(line,'Missing '+name);return line;}
const clone=value=>JSON.parse(JSON.stringify(value));
const image='data:image/png;base64,AAAA';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(options={}){
 const calls=[],cache=new Map(),notices=[],downloads=[];let writes=0;
 const state={schemaVersion:1,projectId:'fabricated-project',stateToken:'fabricated-state',name:'Fabricated media',revision:'v1',note:'Preserve',baseSvg:'<svg/>',items:[],comments:[],photos:[],original:null,layers:{},nextId:1};
 const db={transaction(store,mode){assert.equal(store,'images');if(options.transactionThrow)throw Error('Fabricated transaction failure');const request={},tx={objectStore(name){assert.equal(name,'images');if(options.storeThrow)throw Error('Fabricated store failure');return {put(data,key){if(options.requestThrow)throw Error('Fabricated put failure');calls.push({mode,tx,request,key,data});return request;},get(key){if(options.requestThrow)throw Error('Fabricated get failure');calls.push({mode,tx,request,key});return request;}};}};return tx;}};
 const c=vm.createContext({photoImages:cache,photoDB:async()=>{if(options.openThrow)throw Error('Fabricated open failure');return db;},state,clone,crypto:webcrypto,Blob,Date,history:[],future:[],selected:'before',selectedRefs:new Set(['before']),zoom:2,cancelLandmarkMatch(){},validProject:p=>p,safeSVG:s=>s,DOMParser:class{parseFromString(){return {}; }},editableNodes:()=>[{id:'stable'}],sourceWithIds:s=>s,XMLSerializer:class{serializeToString(s){return s;}},parseVB:()=>[0,0,100,100],normalizedLayers:l=>l,AssetRecords:{validate:()=>[]},MeasurementAnchors:{validate:()=>[]},MeasurementChains:{validate:()=>[]},OpeningBindings:{validate:()=>[]},saveLocal(){writes++;return true;},render(){},notify:s=>notices.push(s),download:(name,blob)=>downloads.push({name,blob})});
 vm.runInContext(['photoStore','photoLoad','jsonExport','importJSON'].map(code).join('\n'),c);
 return {c,calls,cache,notices,downloads,get writes(){return writes;}};
}
function tracked(p){const result={status:'pending'};p.then(value=>{result.status='fulfilled';result.value=value;},error=>{result.status='rejected';result.error=error;});return result;}
function snapshot(h){return JSON.stringify({state:h.c.state,history:h.c.history,future:h.c.future,selected:h.c.selected,selection:[...h.c.selectedRefs],zoom:h.c.zoom});}
const cases=[];function test(name,run){cases.push({name,run});}
for(const operation of ['photoStore','photoLoad']){
 test(operation+' waits for complete and caches only committed data',async()=>{
  const h=harness(),r=tracked(operation==='photoStore'?h.c.photoStore('key',image):h.c.photoLoad('key'));await tick();const call=h.calls[0];assert.equal(call.mode,operation==='photoStore'?'readwrite':'readonly');
  call.request.result=image;call.request.onsuccess?.();await tick();assert.equal(r.status,'pending');assert.equal(h.cache.has('key'),false);call.tx.oncomplete?.();await tick();assert.equal(r.status,'fulfilled');assert.equal(h.cache.get('key'),image);if(operation==='photoLoad')assert.equal(r.value,image);
 });
 for(const event of ['onabort','onerror'])test(operation+' rejects '+event+' after request success without cache writes',async()=>{
  const h=harness(),r=tracked(operation==='photoStore'?h.c.photoStore('key',image):h.c.photoLoad('key'));await tick();const call=h.calls[0];call.request.result=image;call.request.onsuccess?.();call.tx[event]?.();await tick();assert.equal(r.status,'rejected');assert.match(r.error.message,/Photo could not be (saved|read)/);assert.equal(h.cache.has('key'),false);
 });
 test(operation+' request error rejects even before transaction abort',async()=>{
  const h=harness(),r=tracked(operation==='photoStore'?h.c.photoStore('key',image):h.c.photoLoad('key'));await tick();h.calls[0].request.onerror?.();await tick();assert.equal(r.status,'rejected');assert.equal(h.cache.has('key'),false);
 });
 for(const option of ['openThrow','transactionThrow','storeThrow','requestThrow'])test(operation+' rejects '+option+' without cache writes',async()=>{
  const h=harness({[option]:true});await assert.rejects(operation==='photoStore'?h.c.photoStore('key',image):h.c.photoLoad('key'),/Fabricated/);assert.equal(h.cache.size,0);
 });
 test(operation+' failure preserves a prior cache entry',async()=>{
  const h=harness();h.cache.set('existing',image);const r=tracked(operation==='photoStore'?h.c.photoStore('existing','replacement'):h.c.photoLoad('missing'));await tick();h.calls[0].tx.onabort?.();await tick();assert.equal(r.status,'rejected');assert.equal(h.cache.get('existing'),image);assert.equal(h.cache.size,1);
 });
}
test('missing read resolves undefined only on completed transaction and is not cached',async()=>{
 const h=harness(),r=tracked(h.c.photoLoad('missing'));await tick();h.calls[0].request.onsuccess?.();await tick();assert.equal(r.status,'pending');h.calls[0].tx.oncomplete?.();await tick();assert.equal(r.status,'fulfilled');assert.equal(r.value,undefined);assert.equal(h.cache.size,0);
});
test('cached reads do not open a transaction',async()=>{const h=harness({openThrow:true});h.cache.set('key',image);assert.equal(await h.c.photoLoad('key'),image);assert.equal(h.calls.length,0);});
test('read result cannot enter cache after request failure followed by complete',async()=>{
 const h=harness(),r=tracked(h.c.photoLoad('key'));await tick();const q=h.calls[0];q.request.result=image;q.request.onsuccess?.();q.request.onerror?.();q.tx.oncomplete?.();await tick();assert.equal(r.status,'rejected');assert.equal(h.cache.size,0);
});
test('export waits for committed reads and abort shows error without partial download',async()=>{
 const h=harness();h.c.state.photos=[{id:'photo-a',name:'Fabricated',assetKey:'key'}];const before=snapshot(h),r=tracked(h.c.jsonExport());await tick();const q=h.calls[0];q.request.result=image;q.request.onsuccess?.();await tick();assert.equal(r.status,'pending');assert.equal(h.downloads.length,0);q.tx.onabort?.();await tick();assert.equal(r.status,'fulfilled');assert.equal(h.downloads.length,0);assert.match(h.notices.at(-1),/Photo could not be read/);assert.equal(snapshot(h),before);assert.equal(h.cache.size,0);
});
test('export completes exact media after read transaction complete',async()=>{
 const h=harness();h.c.state.photos=[{id:'photo-a',name:'Fabricated',assetKey:'key'}];const r=tracked(h.c.jsonExport());await tick();const q=h.calls[0];q.request.result=image;q.request.onsuccess?.();q.tx.oncomplete?.();await tick();assert.equal(r.status,'fulfilled');assert.equal(h.downloads.length,1);const out=JSON.parse(await h.downloads[0].blob.text());assert.equal(out.photos[0].dataUrl,image);
});
test('import aborted media write preserves current state/history/selection and saves no metadata',async()=>{
 const h=harness(),before=snapshot(h),incoming={...clone(h.c.state),projectId:'incoming',photos:[{id:'photo-a',name:'Fabricated',dataUrl:image}]};const r=tracked(h.c.importJSON(JSON.stringify(incoming)));await tick();h.calls[0].tx.onabort?.();await tick();assert.equal(r.status,'rejected');assert.match(r.error.message,/Photo could not be saved/);assert.equal(snapshot(h),before);assert.equal(h.writes,0);assert.equal(h.cache.size,0);
});
let failures=0;for(const {name,run}of cases){try{await run();}catch(error){failures++;console.error('FAIL '+name+'\n'+error.stack);}}assert.equal(failures,0,failures+' media transaction failure(s)');console.log('PASS: '+cases.length+' production media transaction cases; complete-only cache/resolve, abort/error/throw rejection, preserved callers and missing/cache behavior. Native IndexedDB remains separate acceptance.');
